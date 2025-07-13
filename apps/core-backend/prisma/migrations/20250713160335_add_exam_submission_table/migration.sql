-- CreateTable
CREATE TABLE "ExamSubmission" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "finalAnswers" JSONB NOT NULL,
    "suspiciousLevel" INTEGER NOT NULL DEFAULT 0,
    "detectedAnomalies" JSONB NOT NULL,
    "submissionsCount" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamSubmission_sessionId_key" ON "ExamSubmission"("sessionId");

-- AddForeignKey
ALTER TABLE "ExamSubmission" ADD CONSTRAINT "ExamSubmission_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
