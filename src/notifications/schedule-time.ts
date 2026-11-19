import { TZDate } from '@date-fns/tz'
import { NotificationType } from '@prisma/client'
import { addDays, addMilliseconds, subHours, subMilliseconds } from 'date-fns'

// Quiet hours: 9:00pm to 8:00am local time.
const QUIET_START_HOUR = 21
const QUIET_END_HOUR = 8

// Latest time a 2h reminder can be moved to before quiet hours, leaving a
// buffer so retries also land before quiet hours.
const EVENING_CUTOFF = { hour: 20, minute: 30 }

const JITTER_MS = 60 * 60 * 1000

export const REMINDER_OFFSET_HOURS: Record<NotificationType, number> = {
  [NotificationType.HOURS_24]: 24,
  [NotificationType.HOURS_2]: 2,
}

function isQuietHour(hour: number) {
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR
}

/** When the reminder is nominally due: startsAt minus the reminder's offset. */
export function rawReminderTime(type: NotificationType, startsAt: Date): Date {
  return subHours(startsAt, REMINDER_OFFSET_HOURS[type])
}

/**
 * When to send a reminder, in UTC, with quiet hours applied in `timezone`.
 *
 * - 24h reminder in quiet hours: moved later, to 8:00–9:00am.
 * - 2h reminder in quiet hours: moved earlier, to 7:30–8:30pm the evening before.
 */
export function computeScheduleTime(
  type: NotificationType,
  startsAt: Date,
  timezone: string,
  random: () => number = Math.random,
): Date {
  const local = new TZDate(rawReminderTime(type, startsAt), timezone)
  const hour = local.getHours()
  if (!isQuietHour(hour)) {
    return new Date(local.getTime())
  }

  const jitter = random() * JITTER_MS

  if (type === NotificationType.HOURS_24) {
    const day = hour >= QUIET_START_HOUR ? addDays(local, 1) : local
    const morning = new TZDate(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      QUIET_END_HOUR,
      0,
      timezone,
    )
    return new Date(addMilliseconds(morning, jitter).getTime())
  }

  const day = hour < QUIET_END_HOUR ? addDays(local, -1) : local
  const evening = new TZDate(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    EVENING_CUTOFF.hour,
    EVENING_CUTOFF.minute,
    timezone,
  )
  return new Date(subMilliseconds(evening, jitter).getTime())
}
