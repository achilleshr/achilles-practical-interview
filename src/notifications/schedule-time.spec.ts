import { NotificationType } from '@prisma/client'

import { computeScheduleTime } from './schedule-time'

const { HOURS_24, HOURS_2 } = NotificationType

// All times are written in Chicago local time (CST, UTC-6) for readability.
const TZ = 'America/Chicago'
const chicago = (local: string) => new Date(`${local}-06:00`)

const noJitter = () => 0
const maxJitter = () => 1

describe('computeScheduleTime', () => {
  it('leaves reminders outside quiet hours unchanged', () => {
    const startsAt = chicago('2026-12-02T14:00')

    expect(computeScheduleTime(HOURS_24, startsAt, TZ, noJitter)).toEqual(
      chicago('2026-12-01T14:00'),
    )
    expect(computeScheduleTime(HOURS_2, startsAt, TZ, noJitter)).toEqual(
      chicago('2026-12-02T12:00'),
    )
  })

  it('moves a 24h reminder in quiet hours later, to 8:00am', () => {
    const startsAt = chicago('2026-12-02T07:00')

    expect(computeScheduleTime(HOURS_24, startsAt, TZ, noJitter)).toEqual(
      chicago('2026-12-01T08:00'),
    )
  })

  it('moves a 2h reminder in quiet hours earlier, to 8:30pm the night before', () => {
    const startsAt = chicago('2026-12-02T07:00')

    expect(computeScheduleTime(HOURS_2, startsAt, TZ, noJitter)).toEqual(
      chicago('2026-12-01T20:30'),
    )
  })

  it('jitters shifted reminders by up to an hour, away from quiet hours', () => {
    const startsAt = chicago('2026-12-02T07:00')

    expect(computeScheduleTime(HOURS_24, startsAt, TZ, maxJitter)).toEqual(
      chicago('2026-12-01T09:00'),
    )
    expect(computeScheduleTime(HOURS_2, startsAt, TZ, maxJitter)).toEqual(
      chicago('2026-12-01T19:30'),
    )
  })
})
