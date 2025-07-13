import { Injectable } from '@nestjs/common'

import { PrismaService } from 'src/prisma/prisma.service'

@Injectable()
export class RemoteAtsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCandidates(opts?: {
    id?: string
    firstName?: string
    lastName?: string
    email?: string
    createdAfter?: Date
    updatedAfter?: Date
    includeApplications?: boolean
  }) {
    const {
      id,
      firstName,
      lastName,
      email,
      createdAfter,
      updatedAfter,
      includeApplications,
    } = opts || {}
    const candidates = await this.prisma.remoteCandidate.findMany({
      where: {
        id,
        firstName,
        lastName,
        email,
        createdAt: {
          gte: createdAfter,
        },
        updatedAt: {
          gte: updatedAfter,
        },
      },
      include: {
        remoteApplications: includeApplications,
      },
    })
    return candidates
  }

  async getJobs({
    id,
    title,
    description,
    createdAfter,
    updatedAfter,
  }: {
    id?: string
    title?: string
    description?: string
    createdAfter?: Date
    updatedAfter?: Date
  }) {
    const jobs = await this.prisma.remoteJob.findMany({
      where: {
        id,
        title,
        description,
        createdAt: {
          gte: createdAfter,
        },
        updatedAt: {
          gte: updatedAfter,
        },
      },
    })
    return jobs
  }

  async getApplications(opts?: {
    id?: string
    remoteJobId?: string
    remoteCandidateId?: string
    createdAfter?: Date
    updatedAfter?: Date
    includeJob?: boolean
    includeCandidate?: boolean
  }) {
    const {
      id,
      remoteJobId,
      remoteCandidateId,
      createdAfter,
      updatedAfter,
      includeJob,
      includeCandidate,
    } = opts || {}
    const applications = await this.prisma.remoteApplication.findMany({
      where: {
        id,
        remoteJobId,
        remoteCandidateId,
        createdAt: {
          gte: createdAfter,
        },
        updatedAt: {
          gte: updatedAfter,
        },
      },
      include: {
        RemoteJob: includeJob,
        RemoteCandidate: includeCandidate,
      },
    })
    return applications
  }
}
