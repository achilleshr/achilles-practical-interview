# Achilles Practical Interview

The challenge:

Build ATS syncing

At AchillesHR, we pull in candidates and applications from our clients ATS's to interract with those candidates.

Requirements:

- Jobs will be configured to sync applications from the ats when they have a remoteId populated
- When a job has a remote ID, we should pull applications from the remote ats service and put them into our database
- The sync should pull candidates and applications from the `remoteAtsService` and put the in our database
- If a candidate is already in our database, we should update the candidate with whatever information is in the ats, otherwise we should create the candidate
- We should only pull in candidates and applications that are relevant to jobs we have configured
- sync should be idempotent (we can run the sync many times and it will always be correct after each run)
- We should only pull in applications from after a job was created. For example, if a job was created on 1/1/25, we should only look at applications after that date.

## Issues we've noticed

- We're seeing a lot of duplicate candidates. For some reason we're seeing the same candidate show up many times in the database
- Apart from the duplicates, we're seeing a lot more candidates than we would expect. For example, the candidate Darrin Becker does not have any applications to jobs we have configured but they're still in our database.

## Product improvements we'd like to make

- Right now, we pull in all candidates and applications on every sync. We'd like to do incremental syncs so we only look at changes that have happened since our last sync.

# Prerequisites

- Install [Docker](https://docs.docker.com/desktop/setup/install/mac-install/)

# Project setup

```bash
brew install pnpm
brew install docker-compose

docker-compose up -d
pnpm install
```

# Compile and run the project

```bash
pnpm start
```
