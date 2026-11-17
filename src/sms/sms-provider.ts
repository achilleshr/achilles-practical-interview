import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { SmsProviderMessageStatus } from '@prisma/client'
import { addMilliseconds } from 'date-fns'

import { PrismaService } from 'src/prisma/prisma.service'

export enum SmsStatus {
  QUEUED = 'QUEUED',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

const DEFAULT_FAILURE_RATE = 0.01

// A message reports QUEUED for this long after sending, then its final status.
const SETTLE_MS = 1500

@Injectable()
export class SmsProvider {
  private readonly logger = new Logger(SmsProvider.name)
  private _failureRate = DEFAULT_FAILURE_RATE
  private failNextSend = false

  constructor(private readonly prisma: PrismaService) {}

  get failureRate() {
    return this._failureRate
  }

  set failureRate(rate: number) {
    if (rate < 0 || rate > 1) {
      throw new RangeError('failureRate must be between 0 and 1')
    }
    this._failureRate = rate
  }

  failNext() {
    this.failNextSend = true
  }

  async send(from: string, to: string, body: string): Promise<string> {
    const failed = this.failNextSend || Math.random() < this._failureRate
    this.failNextSend = false

    const message = await this.prisma.smsProviderMessage.create({
      data: {
        from,
        to,
        body,
        status: failed
          ? SmsProviderMessageStatus.FAILED
          : SmsProviderMessageStatus.DELIVERED,
        createdAt: new Date(),
      },
    })
    this.logger.log(`${message.id} ${from} -> ${to}: ${body}`)
    return message.id
  }

  /** Statuses in the same order as `ids`. */
  async getStatus(ids: string[]): Promise<SmsStatus[]> {
    const messages = await this.prisma.smsProviderMessage.findMany({
      where: { id: { in: ids } },
    })
    const messagesById = new Map(messages.map((m) => [m.id, m]))

    const missing = ids.filter((id) => !messagesById.has(id))
    if (missing.length > 0) {
      throw new NotFoundException(`No SMS messages with ids ${missing}`)
    }

    const now = new Date()
    return ids.map((id) => {
      const message = messagesById.get(id)!
      if (now < addMilliseconds(message.createdAt, SETTLE_MS)) {
        return SmsStatus.QUEUED
      }
      return message.status === SmsProviderMessageStatus.FAILED
        ? SmsStatus.FAILED
        : SmsStatus.DELIVERED
    })
  }
}
