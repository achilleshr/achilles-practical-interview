/**
 * Creates sample interviews, relative to now, through
 * POST /v1/candidates/create-interview.
 * The app must be running (pnpm start). `pnpm pg:seed` clears them.
 *
 *   pnpm interviews:sample
 */
import { TZDate } from '@date-fns/tz'

const HOUR = 60 * 60 * 1000

// `daysFromToday` days from today at `hour`:00, local time in `timezone`.
function localTime(timezone: string, daysFromToday: number, hour: number) {
  const date = new TZDate(Date.now(), timezone)
  date.setDate(date.getDate() + daysFromToday)
  date.setHours(hour, 0, 0, 0)
  return date
}

async function createInterview(applicationId: string, startsAt: Date) {
  const response = await fetch(
    'http://localhost:8080/v1/candidates/create-interview',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ applicationId, startsAt }),
    },
  )
  console.log(response.status, await response.text())
}

async function main() {
  // Jordan Bartoletti (Chicago) at Chicago, 2h05m from now
  await createInterview(
    '03754a24-ee6a-4d1f-aa77-7ebd38b7fac4',
    new Date(Date.now() + 2 * HOUR + 5 * 60 * 1000),
  )

  // Lacy Little (Chicago) at Chicago, tomorrow 7am Chicago time
  await createInterview(
    '3fdf23cd-290d-414b-bcbb-ed5b02c21496',
    localTime('America/Chicago', 1, 7),
  )

  // Cole Franecki (New York) at New York, 10 hours from now
  await createInterview(
    '45df89d4-8c47-4c8e-9655-87df9a2ed7fe',
    new Date(Date.now() + 10 * HOUR),
  )

  // Claudine Auer (no time zone) at Phoenix, tomorrow 10am Phoenix time
  await createInterview(
    '035e302b-5845-4f5d-9b7e-4180f81e7509',
    localTime('America/Phoenix', 1, 10),
  )

  // Liana Donnelly (New York) at Phoenix, tomorrow 9am Phoenix time
  await createInterview(
    'c26c6487-3ece-45bd-a82e-a961ab4e8db7',
    localTime('America/Phoenix', 1, 9),
  )

  // Virginie Feeney (Denver) at New York, in 2 days at 10am New York time
  await createInterview(
    '160974f2-470c-405d-a1e5-1d4c7782ebea',
    localTime('America/New_York', 2, 10),
  )

  // Virginie Feeney (Denver) at Phoenix, in 2 days at 2pm Phoenix time
  await createInterview(
    '338a3d73-b241-4686-a345-14d75f4bc863',
    localTime('America/Phoenix', 2, 14),
  )
}

void main()
