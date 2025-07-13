/*
  Warnings:

  - A unique constraint covering the columns `[remoteId]` on the table `applications` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[candidateId,jobId]` on the table `applications` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[remoteId]` on the table `candidates` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[remoteId]` on the table `jobs` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "applications_remoteId_key" ON "applications"("remoteId");

-- CreateIndex
CREATE UNIQUE INDEX "applications_candidateId_jobId_key" ON "applications"("candidateId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_remoteId_key" ON "candidates"("remoteId");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_remoteId_key" ON "jobs"("remoteId");
