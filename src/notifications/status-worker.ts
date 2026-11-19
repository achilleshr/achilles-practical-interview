import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import { NotificationStatus, Prisma } from '@prisma/client'

import { PrismaService } from 'src/prisma/prisma.service'
import { SmsProvider, SmsStatus } from 'src/sms/sms-provider'

const POLL_INTERVAL_MS = 5000
// Max rows one instance checks per tick.
const MAX_ROWS_PER_TICK = 100
const LEASE_SECONDS = 10

type ClaimedRow = { id: string; providerMessageId: string }

const NEXT_STATUS: Record<SmsStatus, NotificationStatus> = {
  [SmsStatus.QUEUED]: NotificationStatus.SENT,
  [SmsStatus.DELIVERED]: NotificationStatus.DELIVERED,
  [SmsStatus.FAILED]: NotificationStatus.FAILED,
}

/**
 * Polls the provider for the delivery status of SENT reminders. FAILED rows are
 * picked up and resent by the send worker.
 */
@Injectable()
export class StatusWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StatusWorker.name)
  private timer?: NodeJS.Timeout

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsProvider,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      this.tick().catch((err) =>
        this.logger.error(`Status worker tick failed: ${err}`),
      )
    }, POLL_INTERVAL_MS)
  }

  onModuleDestroy() {
    clearInterval(this.timer)
  }

  async tick() {
    // Rows already checked this tick. A row that is still QUEUED is not
    // re-checked until the next tick.
    const checked: string[] = []
    for (let i = 0; i < MAX_ROWS_PER_TICK; i++) {
      const row = await this.claim(checked)
      if (!row) return
      checked.push(row.id)
      await this.process(row)
    }
  }

  /** Claims one SENT row by setting a lease on it (same pattern as SendWorker). */
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
        WHERE status = 'SENT'
          AND ("lockedUntil" IS NULL OR "lockedUntil" < now())
          ${excludeClause}
        ORDER BY "scheduleTime"
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, "providerMessageId"
    `
    return rows[0]
  }

  private async process({ id, providerMessageId }: ClaimedRow) {
    const [smsStatus] = await this.sms.getStatus([providerMessageId])
    await this.prisma.notification.update({
      where: { id },
      data: { status: NEXT_STATUS[smsStatus], lockedUntil: null },
    })
  }
}
