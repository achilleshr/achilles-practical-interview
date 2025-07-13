import { Injectable } from '@nestjs/common'
import { Candidate, Job, RemoteCandidate } from '@prisma/client'

import { PrismaService } from 'src/prisma/prisma.service'
import { RemoteAtsService } from 'src/remote-ats/remote-ats.service'

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly remoteAtsService: RemoteAtsService,
  ) {}

  private async getCandidatesWeHaveByRemoteId(): Promise<
    Record<string, Candidate>
  > {
    const candidatesWeHaveQuery = await this.prisma.candidate.findMany()
    const candidatesWeHaveByRemoteId: Record<string, Candidate> = {}
    for (const candidate of candidatesWeHaveQuery) {
      if (!candidate.remoteId) {
        continue
      }
      candidatesWeHaveByRemoteId[candidate.remoteId] = candidate
    }
    return candidatesWeHaveByRemoteId
  }

  private async getJobsWeHaveByRemoteId(): Promise<Record<string, Job>> {
    const jobsWeHaveQuery = await this.prisma.job.findMany()
    const jobsWeHaveByRemoteId: Record<string, Job> = {}
    for (const job of jobsWeHaveQuery) {
      if (!job.remoteId) {
        continue
      }
      jobsWeHaveByRemoteId[job.remoteId] = job
    }
    return jobsWeHaveByRemoteId
  }

  private async syncCandidates() {
    const remoteCandidates = await this.remoteAtsService.getCandidates()
    const candidatesWeHaveByRemoteId =
      await this.getCandidatesWeHaveByRemoteId()
    const candidatesToCreate: RemoteCandidate[] = []
    const candidatesToUpdate: { remote: RemoteCandidate; local: Candidate }[] =
      []
    for (const remoteCandidate of remoteCandidates) {
      if (candidatesWeHaveByRemoteId[remoteCandidate.id]) {
        candidatesToUpdate.push({
          remote: remoteCandidate,
          local: candidatesWeHaveByRemoteId[remoteCandidate.id],
        })
      } else {
        candidatesToCreate.push(remoteCandidate)
      }
    }
    await this.prisma.candidate.createMany({
      data: candidatesToCreate.map((candidate) => ({
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
      })),
    })
    await Promise.all(
      candidatesToUpdate.map(({ remote, local }) => {
        return this.prisma.candidate.update({
          where: { id: local.id },
          data: {
            firstName: remote.firstName,
            lastName: remote.lastName,
            email: remote.email,
          },
        })
      }),
    )
  }

  private async syncApplications() {
    const jobsByRemoteId = await this.getJobsWeHaveByRemoteId()
    const candidatesByRemoteId = await this.getCandidatesWeHaveByRemoteId()
    const remoteApplications = await this.remoteAtsService.getApplications()
    await Promise.allSettled(
      remoteApplications.map((remoteApplication) => {
        const job = jobsByRemoteId[remoteApplication.remoteJobId]
        if (!job) {
          return
        }
        const candidate =
          candidatesByRemoteId[remoteApplication.remoteCandidateId]
        if (!candidate) {
          return
        }
        return this.prisma.application.create({
          data: {
            jobId: job.id,
            candidateId: candidate.id,
            remoteId: remoteApplication.id,
          },
        })
      }),
    )
  }

  async sync() {
    await this.syncCandidates()
    await this.syncApplications()
  }
}
