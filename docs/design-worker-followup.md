# Follow-up: background worker corrections

Follow-up to [design.md](design.md). Changes to how the background workers
(`SendWorker`, `StatusWorker`) pick up and process rows.

## Changes

1. **Fetch the full list first, then claim.** Each iteration first queries the
   complete list of eligible rows, instead of finding the next row inside the
   claim query. Every eligible row is processed in that iteration, rather than
   stopping after a fixed number (currently 100 per tick).

2. **Run to completion, then start the next iteration.** Replace the
   fire-and-forget `setInterval` (every 5s) with a loop that finishes processing
   the whole list before starting the next iteration. Slow provider calls can no
   longer cause overlapping iterations, and there's no interval to tune against
   API latency.

3. **Process in parallel, 5 at a time.** Rows from the list are processed with a
   concurrency limit of 5.

4. **Strongly typed claim with Prisma.** Replace the raw SQL claim
   (`$queryRaw` with `FOR UPDATE SKIP LOCKED`) with Prisma client calls, so the
   query is type-checked and schema changes surface as compile errors.

   The listed rows are a snapshot, so each row is claimed individually, just
   before processing, with a **conditional update** (compare-and-set):
   `updateManyAndReturn` with the claimable condition in its `where` (`id`,
   eligible status, `lockedUntil` null or expired), setting `lockedUntil` to the
   lease end. One returned row means this instance owns it; zero means another
   instance claimed it first, so skip it. It's a single statement (no
   transaction): under concurrent claims, Postgres re-checks the `where` after
   the first update commits, so only one instance wins.

   Rejected: an interactive transaction that reads, checks, then writes. At the
   default Read Committed isolation, two instances can both read "unlocked" and
   both write. At Serializable it is correct but needs `P2034` retry handling
   and more round trips.

## Open questions / gaps

- **Clock source for leases:** `now` / lease end come from the app server clock
  rather than Postgres `now()`; clock drift between instances shifts lease
  expiry slightly. Accepted unless decided otherwise.
- **Multiple instances, same list:** every instance fetches the same full list,
  so instances contend for the same rows (most claims lose). Correct, but extra
  queries. Whether to shuffle, partition, or accept this: not decided.
- **List size at peak:** the full list is unbounded; at the 8am peak it could be
  thousands of rows per instance, per iteration. Whether to fetch IDs only, or
  cap it: not decided.
- **Idle delay:** when the list is empty, how long to wait before the next
  iteration (to avoid a hot loop). Not decided.
- **Shutdown:** how the loop stops on `onModuleDestroy` (e.g. a stop flag
  checked between iterations). Not decided.
- **Concurrency mechanism:** no concurrency-limit library is installed
  (`p-limit` etc.). Batches of 5 via `Promise.all` vs. a pool that keeps 5 in
  flight. Not decided.
- **Scope:** whether all four changes apply to both `SendWorker` and
  `StatusWorker`. Not decided.
- **Lease vs. parallelism:** with a single per-row claim just before processing,
  the 10s lease covers one row; unchanged by parallelism. To confirm.
