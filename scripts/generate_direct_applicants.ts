/**
 * Hourly jobs and candidates who applied directly (not through the ATS).
 * Maintainer tool, not part of the app runtime.
 *
 * Adds two jobs at each location, and candidates with applications to them.
 * Some candidates also apply at a second location. Output is deterministic
 * (fixed faker seed and fixed dates).
 *
 * scripts/generate_seed_data.ts calls this as part of a full regenerate. To add
 * these rows to the current database instead (it must already have the
 * AchillesHR company and its locations, and not have these rows yet):
 *
 *   npx ts-node scripts/generate_direct_applicants.ts
 *
 * then `./scripts/dump_db` to snapshot the result into db_dump.sql.
 */
import { en, en_US, Faker } from '@faker-js/faker'
import { ApplicationStatus, Location, PrismaClient } from '@prisma/client'
import { addDays, addHours } from 'date-fns'

import { AREA_CODE_TIMEZONES, fakeContact } from './fake_contact'

const JOBS = [
  {
    title: 'Warehouse Associate',
    description: 'Receive, stage, and load freight. Day and night shifts.',
  },
  {
    title: 'Forklift Operator',
    description:
      'Operate sit-down and reach forklifts. Certification provided.',
  },
  {
    title: 'Production Line Worker',
    description: 'Run and monitor packaging lines.',
  },
  {
    title: 'Machine Operator',
    description: 'Set up and operate mixing and filling equipment.',
  },
  {
    title: 'Picker/Packer',
    description: 'Pick, pack, and label outbound orders.',
  },
  {
    title: 'Shipping Clerk',
    description: 'Prepare shipping paperwork and schedule pickups.',
  },
]

const CANDIDATE_COUNT = 32
// The first this-many candidates also apply to a job at a second location.
const SECOND_APPLICATION_COUNT = 6

const areaCodes = (inTimezone: boolean, timezone: string) =>
  Object.keys(AREA_CODE_TIMEZONES).filter(
    (code) => (AREA_CODE_TIMEZONES[code] === timezone) === inTimezone,
  )

export async function generateDirectApplicants(
  prisma: PrismaClient,
  { companyId, locations }: { companyId: string; locations: Location[] },
) {
  const faker = new Faker({ locale: [en_US, en] })
  faker.seed(20261117)
  const base = new Date('2026-10-01T15:00:00.000Z')

  // Stable order, however the caller loaded the locations.
  const sortedLocations = [...locations].sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  const jobs = []
  for (const [i, job] of JOBS.entries()) {
    const location = sortedLocations[i % sortedLocations.length]
    const createdAt = addDays(base, -30 + i)
    jobs.push(
      await prisma.job.create({
        data: {
          id: faker.string.uuid(),
          ...job,
          companyId,
          locationId: location.id,
          createdAt,
          updatedAt: createdAt,
        },
      }),
    )
  }

  // Avoid reusing a number another candidate or location already has.
  const usedNumbers = new Set(
    [
      ...(await prisma.candidate.findMany({ select: { phoneNumber: true } })),
      ...(await prisma.remoteCandidate.findMany({
        select: { phoneNumber: true },
      })),
      ...(await prisma.location.findMany({ select: { phoneNumber: true } })),
    ].map(({ phoneNumber }) => phoneNumber),
  )

  for (let i = 0; i < CANDIDATE_COUNT; i++) {
    const firstJob = jobs[i % jobs.length]
    const { timezone: jobTimezone } = sortedLocations.find(
      (location) => location.id === firstJob.locationId,
    )!
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    // Exactly a quarter have no known time zone. About two thirds live in the
    // time zone of the first job they applied to; the rest live elsewhere.
    const hasTimezone = i % 4 !== 3
    const livesLocally = i % 3 !== 2
    let contact
    do {
      contact = fakeContact(faker, {
        hasTimezone,
        areaCode: faker.helpers.arrayElement(
          areaCodes(livesLocally, jobTimezone),
        ),
      })
    } while (usedNumbers.has(contact.phoneNumber))
    usedNumbers.add(contact.phoneNumber)

    const createdAt = addHours(base, faker.number.int({ min: 0, max: 24 * 30 }))
    const candidate = await prisma.candidate.create({
      data: {
        id: faker.string.uuid(),
        firstName,
        lastName,
        email: faker.internet
          .email({ firstName, lastName, provider: 'example.com' })
          .toLowerCase(),
        ...contact,
        createdAt,
        updatedAt: createdAt,
      },
    })

    const appliedTo = [firstJob]
    if (i < SECOND_APPLICATION_COUNT) {
      appliedTo.push(
        faker.helpers.arrayElement(
          jobs.filter((job) => job.locationId !== appliedTo[0].locationId),
        ),
      )
    }

    for (const [k, job] of appliedTo.entries()) {
      const appliedAt = addHours(createdAt, k * 24)
      await prisma.application.create({
        data: {
          id: faker.string.uuid(),
          candidateId: candidate.id,
          jobId: job.id,
          status: faker.helpers.arrayElement([
            ApplicationStatus.APPLIED,
            ApplicationStatus.INTERVIEWING,
          ]),
          createdAt: appliedAt,
          updatedAt: appliedAt,
        },
      })
    }
  }
}

if (require.main === module) {
  const prisma = new PrismaClient()
  prisma.company
    .findFirstOrThrow({
      where: { name: 'AchillesHR' },
      include: { locations: true },
    })
    .then((company) =>
      generateDirectApplicants(prisma, {
        companyId: company.id,
        locations: company.locations,
      }),
    )
    .then(() => console.log('Direct applicants added.'))
    .catch((err) => {
      console.error(err)
      process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
}
