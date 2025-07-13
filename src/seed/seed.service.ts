import { faker } from '@faker-js/faker'
import { Injectable } from '@nestjs/common'
import { RemoteJob } from '@prisma/client'
import { addMonths } from 'date-fns'

import { PrismaService } from 'src/prisma/prisma.service'

@Injectable()
export class SeedService {
  constructor(private readonly prisma: PrismaService) {}

  async seed() {
    // delete all existing data
    await this.prisma.company.deleteMany()
    await this.prisma.job.deleteMany()
    await this.prisma.candidate.deleteMany()
    await this.prisma.application.deleteMany()
    await this.prisma.remoteJob.deleteMany()
    await this.prisma.remoteCandidate.deleteMany()
    await this.prisma.remoteApplication.deleteMany()

    const atsData = await this.seedAtsData()
    const companyData = await this.seedCompanyData(atsData)

    const { atsJobs, atsCandidates, atsApplications } = atsData
    const { jobs, company } = companyData

    return {
      atsJobs,
      atsCandidates,
      atsApplications,
      jobs,
      company,
    }
  }

  private async seedCompanyData({ atsJobs }: { atsJobs: RemoteJob[] }) {
    const createdAt = faker.date.past({ years: 1 })

    // create new data
    const company = await this.prisma.company.create({
      data: {
        name: 'AchillesHR',
        createdAt,
        updatedAt: createdAt,
      },
    })

    const jobs = await Promise.all(
      atsJobs.map((job) => {
        return this.prisma.job.create({
          data: {
            description: job.description,
            title: job.title,
            createdAt: addMonths(createdAt, 3),
            updatedAt: addMonths(createdAt, 3),
            companyId: company.id,
            remoteId: job.id,
          },
        })
      }),
    )

    return { jobs, company }
  }

  private async seedAtsData() {
    // delete all existing data
    await Promise.all([
      this.prisma.remoteJob.deleteMany(),
      this.prisma.remoteCandidate.deleteMany(),
      this.prisma.remoteApplication.deleteMany(),
    ])

    // create new data
    await Promise.all([
      this.prisma.remoteJob.deleteMany(),
      this.prisma.remoteCandidate.deleteMany(),
    ])
    const createdAt1 = faker.date.past({ years: 3 })
    const createdAt2 = faker.date.past({ years: 3 })
    const createdAt3 = faker.date.past({ years: 3 })
    const atsJobs = await Promise.all([
      this.prisma.remoteJob.create({
        data: {
          title: 'Software Engineer',
          description: 'Taking down production',
          createdAt: createdAt1,
          updatedAt: addMonths(createdAt1, 8),
        },
      }),
      this.prisma.remoteJob.create({
        data: {
          title: 'Product Manager',
          description: 'Taking all the credit',
          createdAt: createdAt2,
          updatedAt: addMonths(createdAt2, 8),
        },
      }),
      this.prisma.remoteJob.create({
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
        const candidate = await this.prisma.remoteCandidate.create({
          data: {
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            email: faker.internet.email(),
            createdAt,
            updatedAt: createdAt,
          },
        })
        return candidate
      }),
    )
    const atsApplications = (
      await Promise.all(
        atsCandidates.map(async (candidate) => {
          // pick two random jobs from the jobs array and create applications for them
          const jobsToApplyTo = faker.helpers.arrayElements(atsJobs, 2)
          const createdAt = faker.date.past({ years: 3 })
          return await Promise.all(
            jobsToApplyTo.map((job) => {
              return this.prisma.remoteApplication.create({
                data: {
                  remoteCandidateId: candidate.id,
                  remoteJobId: job.id,
                  createdAt,
                  updatedAt: createdAt,
                },
              })
            }),
          )
        }),
      )
    ).flat()

    return { atsJobs, atsCandidates, atsApplications }
  }
}
