# Challenge: Interview reminders

See [setup](setup.md) for getting the app running.

## Background

We run a recruiting platform for hourly and industrial jobs. Candidates apply to jobs and get scheduled for in-person interviews at job site locations. Interview no-shows are expensive, so we want to text candidates reminders before their interviews.

You'll build the reminder service inside an existing small codebase (NestJS, Prisma, Postgres). Use any AI tools you like.

## What exists in the repo

The data model is in `prisma/schema.prisma`.

- **`Candidate`** has a name, phone number, and timezone (may be null).
- **`Location`** is a physical site with a name, address, timezone, and its own SMS phone number.
- **`Job`** belongs to a location.
- **`Application`** joins a candidate to a job, with status and other metadata.
- **`Interview`** belongs to a candidate and an application, with a scheduled start time (stored in UTC). Its location is found through application → job → location.
- **`SmsProvider`** (`src/sms/sms-provider.ts`) has two methods. `send(from, to, body)` always returns a message ID. `getStatus(ids)` returns `QUEUED`, `DELIVERED`, or `FAILED` for each ID, in the same order. It's a fake that behaves like the real provider described below, except that a message's status settles after about 1.5 seconds instead of minutes, so you can iterate quickly. For tests, `failNext()` makes the next send fail, and `failureRate` can be changed.
- **Opt-out events.** An existing handler (`CandidatesService.handleEvent` in `src/candidates/`, behind `POST /v1/events`) receives `candidate.opted_out` and `candidate.opted_in` events, each with a candidate ID. It currently does nothing with them.
- Interviews are created through an existing API endpoint, `POST /v1/interviews` (also in `src/candidates/`). You don't need to build it. `pnpm interviews:sample` creates a few through it.
- You can change any existing code, including the interview-creation endpoint.
- `pnpm test` runs the tests. `src/sms/sms-provider.spec.ts` is an example.
- `src/sync/` and `src/remote-ats/` are for a different exercise. You can ignore them.

## What to build

Each candidate gets two text reminders for each interview: one **24 hours** before it starts and one **2 hours** before. Each message includes the interview's start time (in the location's local time), the job title, the location name, and the address.

You own everything from an interview being created to its texts going out, including tests for the rules below.

## Rules

1. **Never send the same reminder twice.** A candidate should get exactly one 24-hour reminder and one 2-hour reminder per interview.
2. **Never text a candidate who has opted out.** Candidates can opt out of notifications, and opt back in, at any time. Nothing in the current data model tracks this, so add what you need.
3. **Quiet hours.** Don't send texts between 9:00pm and 8:00am in the candidate's local time. A reminder that falls in quiet hours should be moved to an allowed time.
4. **Send from the location's number.** Texts about an interview come from that interview's location phone number, so each location's conversation stays in one thread. A candidate with interviews at two locations gets each location's reminders from that location's number.

## Constraints

- **Provider reliability.** About 1% of sent messages fail to deliver. Their status changes to `FAILED` within a few minutes of sending, and they should be retried.
- **Volume.** About 20,000 interviews per day across about 400 locations in all US time zones. About 40% of interviews start between 7:00am and 9:00am local time.
- **Deployment.** The service runs as multiple instances behind a load balancer and is deployed several times a day. Any instance can restart at any time.
- **Infrastructure.** Postgres is the only datastore and the only infrastructure available. Don't add Redis, a message broker, or a hosted queue. Libraries that run on top of Postgres are fine.

## How the session works

1. **Design (20 min).** Before writing code, write up to half a page covering your data model, how reminders get scheduled and sent, how you handle provider failures, what you think breaks first, and any questions you'd ask the product owner. Ask us those questions directly. We'll answer them.
2. **Build (about 70 min).** Implement it. Please think out loud. We care more about your decisions than how much you finish. If you run short on time, get the rules above right before anything else.
3. **Review (25 min).** We'll give you a pull request touching the same code to review.
4. **Debrief (15–20 min).** We'll walk through what you built.
