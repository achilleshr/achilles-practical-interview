# Design: Interview reminders

## Data model

New `Notification` table (`notifications`), one row per reminder. Unique on
`(interviewId, type)`; indexed on `(status, scheduleTime)` for the claim query.

- `type`: `HOURS_24` | `HOURS_2`.
- `status`: `PENDING` → `SENT` (awaiting delivery status) → `DELIVERED`.
  `OPTED_OUT` when skipped because the candidate opted out. A failed delivery goes
  back to `PENDING` for retry; `FAILED` once retries are exhausted.
- `Candidate.smsOptedIn` (boolean, default `true`).

- Linked to the **interview** (not the application), since an application can have
  several interviews and the rules are per interview.
- Reminder type: 24-hour or 2-hour.
- `status`: starts as `Pending`.
- `scheduleTime`: when the reminder should go out, with quiet hours already applied
  (see below).
- Retry count: number of failed send attempts.
- `lockedUntil`: timestamp used by workers to claim the row.
- Provider message ID: stored after send, so the status worker can poll it.

## Opt-out

- New opt-in field on `Candidate`, updated by the `candidate.opted_out` /
  `candidate.opted_in` webhook events.
- The send worker checks the candidate's opt-in status **at send time**. If opted
  out, the row is marked done with an "opted out" status instead of sending.

## Scheduling

- When an interview is created, the reminder rows are inserted **in the same DB
  transaction** as the interview.
- Late-created interviews: if the interview starts within 24h, the 24h reminder is
  not created; if within 2h, the 2h reminder is not created.
- `scheduleTime` is computed at insert time and already accounts for quiet hours
  (9:00pm–8:00am local time). Local time = the candidate's timezone, falling back
  to the location's timezone (always set) when the candidate's is null:
  - **24-hour reminder:** if it falls in quiet hours, shift **later**, to 8:00am.
  - **2-hour reminder:** if it falls in quiet hours, shift **earlier**, to before
    9:00pm the previous evening, with a buffer (proposed 30 min, i.e. 8:30pm) so
    retries still happen outside quiet hours.
  - Jitter of up to 1 hour is applied to **shifted** times only, away from quiet
    hours: 24h reminders land 8:00–9:00am, 2h reminders land 7:30–8:30pm.
- A reminder is also skipped if its shifted `scheduleTime` is already in the past
  at creation time.
- Implemented in `src/notifications/schedule-time.ts`; rows are created via a
  nested write in `createInterview`.

## Workers

- **Claiming rows:** a single statement selects a batch of due, unlocked rows with
  `FOR UPDATE SKIP LOCKED` and sets `lockedUntil` in the same `UPDATE ... RETURNING`
  (via `$queryRaw`). The transaction commits immediately; no lock or transaction is
  held during the SMS call. Lease (`lockedUntil`) is **10 seconds**.
- **Send worker:** claims due `Pending` rows as above, sends from the interview
  location's number, and stores the provider message ID.
- **Status worker:** polls the provider with `getStatus` for sent messages. Uses
  the same `lockedUntil` claim so a failure isn't counted (and retry count
  incremented) twice. On `FAILED`, the row is retried.

## Open questions / gaps

- **Out of scope — crash after send, before saving the message ID:** the lock
  expires and another worker can resend, producing a duplicate. Known risk, not
  handled.
- **Batch size** for the claim: not chosen.
- **10s lease vs. send duration:** if a send + DB write exceeds 10s, the lease
  expires mid-send and another worker can resend.
- **Max retries** before a row is marked `FAILED`: not chosen.
- **Out of scope — rate limiting:** worker should respect provider rate limits if
  a real provider imposes them; not handled for the mock.
- **Retry policy:** max attempts, backoff, and what happens if a retry would land in
  quiet hours or after the interview.
- **Out of scope — reschedule / cancel.**
- **7–9am burst:** many 24h reminders shift to 8:00am local; throughput at that
  peak not yet considered.
