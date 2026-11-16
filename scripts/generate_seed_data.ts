/**
 * Fixture generator (maintainer tool — not part of the app runtime).
 *
 * Generates a fresh, RANDOM dataset (companies, jobs, candidates, and the ATS
 * side). This is how scripts/db_dump.sql was originally produced: run this, then
 * `./scripts/dump_db` to snapshot the result into db_dump.sql.
 *
 * Day to day, use `pnpm pg:seed` to restore the deterministic snapshot instead —
 * running this replaces the fixture with different random data.
 *
 *   npx tsx scripts/generate_seed_data.ts
 */
import { faker } from '@faker-js/faker'
import { PrismaClient, RemoteApplicationStatus, RemoteJob } from '@prisma/client'
import { addMonths } from 'date-fns'

const prisma = new PrismaClient()

// Fictional numbers in the reserved 555-0100 to 555-0199 range, in E.164.
const AREA_CODES = ['212', '214', '303', '312', '317', '404', '415', '602']
const fakePhoneNumber = () =>
  `+1${faker.helpers.arrayElement(AREA_CODES)}55501${faker.string.numeric(2)}`

async function seedAtsData() {
  const createdAt1 = faker.date.past({ years: 3 })
  const createdAt2 = faker.date.past({ years: 3 })
  const createdAt3 = faker.date.past({ years: 3 })
  const atsJobs = await Promise.all([
    prisma.remoteJob.create({
      data: {
        title: 'Software Engineer',
        description: 'Taking down production',
        createdAt: createdAt1,
        updatedAt: addMonths(createdAt1, 8),
      },
    }),
    prisma.remoteJob.create({
      data: {
        title: 'Product Manager',
        description: 'Taking all the credit',
        createdAt: createdAt2,
        updatedAt: addMonths(createdAt2, 8),
      },
    }),
    prisma.remoteJob.create({
      data: {
        title: 'Software Engineer Manager',
        description: 'Micromanagaging design decisions',
        createdAt: createdAt3,
        updatedAt: addMonths(createdAt3, 8),
      },
    }),
  ])
  const atsCandidates = await Promise.all(
    Array.from({ length: 100 }).map(async () => {
      const createdAt = faker.date.past({ years: 3 })
      return prisma.remoteCandidate.create({
        data: {
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: faker.internet.email(),
          phoneNumber: fakePhoneNumber(),
          createdAt,
          updatedAt: createdAt,
        },
      })
    }),
  )
  const atsApplications = (
    await Promise.all(
      atsCandidates.map(async (candidate) => {
        // pick two random jobs from the jobs array and create applications for them
        const jobsToApplyTo = faker.helpers.arrayElements(atsJobs, 2)
        const createdAt = faker.date.past({ years: 3 })
        return Promise.all(
          jobsToApplyTo.map((job) =>
            prisma.remoteApplication.create({
              data: {
                remoteCandidateId: candidate.id,
                remoteJobId: job.id,
                status: faker.helpers.enumValue(RemoteApplicationStatus),
                createdAt,
                updatedAt: createdAt,
              },
            }),
          ),
        )
      }),
    )
  ).flat()

  return { atsJobs, atsCandidates, atsApplications }
}

async function seedCompanyData({ atsJobs }: { atsJobs: RemoteJob[] }) {
  const createdAt = faker.date.past({ years: 1 })

  const company = await prisma.company.create({
    data: { name: 'AchillesHR', createdAt, updatedAt: createdAt },
  })

  const locations = await Promise.all(
    [
      {
        name: 'AchillesHR - New York',
        address: '100 Broadway, New York, NY 10005',
        timezone: 'America/New_York',
        phoneNumber: '+16465550100',
      },
      {
        name: 'AchillesHR - Chicago',
        address: '200 W Madison St, Chicago, IL 60606',
        timezone: 'America/Chicago',
        phoneNumber: '+17735550100',
      },
      {
        name: 'AchillesHR - Phoenix',
        address: '300 N Central Ave, Phoenix, AZ 85004',
        timezone: 'America/Phoenix',
        phoneNumber: '+14805550100',
      },
    ].map((location) =>
      prisma.location.create({
        data: {
          ...location,
          companyId: company.id,
          createdAt,
          updatedAt: createdAt,
        },
      }),
    ),
  )

  const jobs = await Promise.all(
    atsJobs.map((job, i) =>
      prisma.job.create({
        data: {
          description: job.description,
          title: job.title,
          createdAt: addMonths(createdAt, 3),
          updatedAt: addMonths(createdAt, 3),
          companyId: company.id,
          locationId: locations[i % locations.length].id,
          remoteId: job.id,
        },
      }),
    ),
  )

  return { jobs, company }
}

async function seed() {
  // delete all existing data
  await prisma.company.deleteMany()
  await prisma.job.deleteMany()
  await prisma.candidate.deleteMany()
  await prisma.application.deleteMany()
  await prisma.remoteJob.deleteMany()
  await prisma.remoteCandidate.deleteMany()
  await prisma.remoteApplication.deleteMany()

  const atsData = await seedAtsData()
  await seedCompanyData(atsData)
}

seed()
  .then(() => console.log('Seed data generated.'))
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
