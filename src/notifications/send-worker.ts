import { TZDate } from '@date-fns/tz'
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import { NotificationStatus, Prisma } from '@prisma/client'
import { format } from 'date-fns'

import { PrismaService } from 'src/prisma/prisma.service'
import { SmsProvider } from 'src/sms/sms-provider'

const POLL_INTERVAL_MS = 5000
// Max rows one instance processes per tick.
const MAX_ROWS_PER_TICK = 100
const LEASE_SECONDS = 10
const MAX_RETRIES = 3

type ClaimedRow = { id: string; status: NotificationStatus }

@Injectable()
export class SendWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SendWorker.name)
  private timer?: NodeJS.Timeout

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsProvider,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      this.tick().catch((err) =>
        this.logger.error(`Send worker tick failed: ${err}`),
      )
    }, POLL_INTERVAL_MS)
  }

  onModuleDestroy() {
    clearInterval(this.timer)
  }

  async tick() {
    // Rows already attempted this tick. A row that fails is not re-claimed
    // until the next tick, so the worker moves on to other rows.
    const attempted: string[] = []
    for (let i = 0; i < MAX_ROWS_PER_TICK; i++) {
      const row = await this.claim(attempted)
      if (!row) return
      attempted.push(row.id)
      await this.process(row)
    }
  }

  /**
   * Claims one due row just before sending it, by setting a lease on it.
   * SKIP LOCKED lets other instances claim different rows concurrently; the
   * statement commits immediately, so no lock is held while sending.
   */
  private async claim(exclude: string[]): Promise<ClaimedRow | undefined> {
    const excludeClause =
      exclude.length > 0
        ? Prisma.sql`AND id NOT IN (${Prisma.join(exclude)})`
        : Prisma.empty
    const rows = await this.prisma.$queryRaw<ClaimedRow[]>`
      UPDATE notifications
      SET "lockedUntil" = now() + make_interval(secs => ${LEASE_SECONDS})
      WHERE id IN (
        SELECT id FROM notifications
        WHERE "scheduleTime" <= now()
          AND (
            status = 'PENDING'
            OR (status = 'FAILED' AND "retryCount" < ${MAX_RETRIES})
          )
          AND ("lockedUntil" IS NULL OR "lockedUntil" < now())
          ${excludeClause}
        ORDER BY "scheduleTime"
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, status
    `
    return rows[0]
  }

  private async process({ id, status }: ClaimedRow) {
    const notification = await this.prisma.notification.findUniqueOrThrow({
      where: { id },
      include: {
        interview: {
          include: {
            candidate: true,
            application: { include: { job: { include: { location: true } } } },
          },
        },
      },
    })
    const { interview } = notification
    const { candidate } = interview
    const { job } = interview.application
    const { location } = job

    if (!candidate.smsOptedIn) {
      await this.prisma.notification.update({
        where: { id },
        data: { status: NotificationStatus.OPTED_OUT, lockedUntil: null },
      })
      return
    }

    // Only resends of a FAILED row count as retries.
    const retryIncrement = status === NotificationStatus.FAILED ? 1 : 0

    const startsAt = format(
      new TZDate(interview.startsAt, location.timezone),
      "EEE, MMM d 'at' h:mm a",
    )
    const body =
      `Reminder: your interview for ${job.title} at ${location.name} is ` +
      `${startsAt}. Address: ${location.address}`

    const providerMessageId = await this.sms.send(
      location.phoneNumber,
      candidate.phoneNumber,
      body,
    )
    await this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.SENT,
        providerMessageId,
        lockedUntil: null,
        retryCount: { increment: retryIncrement },
      },
    })
  }
}
