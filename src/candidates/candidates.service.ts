import { Injectable, NotFoundException } from '@nestjs/common'

import { PrismaService } from 'src/prisma/prisma.service'

import {
  CandidateEventDto,
  CandidateEventType,
} from './dto/candidate-event.dto'
import { CreateInterviewDto } from './dto/create-interview.dto'

@Injectable()
export class CandidatesService {
  constructor(private readonly prisma: PrismaService) {}

  async createInterview({ applicationId, startsAt }: CreateInterviewDto) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
    })
    if (!application) {
      throw new NotFoundException(`No application with id ${applicationId}`)
    }

    return this.prisma.interview.create({
      data: {
        applicationId,
        candidateId: application.candidateId,
        startsAt: new Date(startsAt),
      },
    })
  }

  async handleEvent(event: CandidateEventDto) {
    switch (event.type) {
      case CandidateEventType.OPTED_OUT:
        return this.handleOptedOut(event.candidateId)
      case CandidateEventType.OPTED_IN:
        return this.handleOptedIn(event.candidateId)
    }
  }

  private async handleOptedOut(_candidateId: string) {}

  private async handleOptedIn(_candidateId: string) {}
}
