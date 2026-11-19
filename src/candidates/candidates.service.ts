import { Injectable, NotFoundException } from '@nestjs/common'
import { NotificationType } from '@prisma/client'

import {
  computeScheduleTime,
  rawReminderTime,
} from 'src/notifications/schedule-time'
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
      include: { candidate: true, job: { include: { location: true } } },
    })
    if (!application) {
      throw new NotFoundException(`No application with id ${applicationId}`)
    }

    const start = new Date(startsAt)
    const timezone =
      application.candidate.timezone ?? application.job.location.timezone
    const now = new Date()

    // Skip a reminder if its nominal time or its quiet-hours-shifted time has
    // already passed.
    const notifications = Object.values(NotificationType)
      .filter((type) => rawReminderTime(type, start) > now)
      .map((type) => ({
        type,
        scheduleTime: computeScheduleTime(type, start, timezone),
      }))
      .filter(({ scheduleTime }) => scheduleTime > now)

    // Nested create: the interview and its notifications are written in one
    // transaction.
    return this.prisma.interview.create({
      data: {
        applicationId,
        candidateId: application.candidateId,
        startsAt: start,
        notifications: { create: notifications },
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

  private async handleOptedOut(candidateId: string) {
    await this.prisma.candidate.update({
      where: { id: candidateId },
      data: { smsOptedIn: false },
    })
  }

  private async handleOptedIn(candidateId: string) {
    await this.prisma.candidate.update({
      where: { id: candidateId },
      data: { smsOptedIn: true },
    })
  }
}
