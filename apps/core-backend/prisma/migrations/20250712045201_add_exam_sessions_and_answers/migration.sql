/*
  Warnings:

  - You are about to drop the column `invitationCode` on the `Exam` table. All the data in the column will be lost.
  - The `status` column on the `ExamSession` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `auth0_sub` on the `User` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[examCode]` on the table `Exam` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[examId,userId]` on the table `ExamSession` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `examCode` to the `Exam` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passKey` to the `Exam` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `ExamSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'TEACHER');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "Exam" DROP CONSTRAINT "Exam_userId_fkey";

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_examId_fkey";

-- DropIndex
DROP INDEX "Exam_invitationCode_key";

-- DropIndex
DROP INDEX "User_auth0_sub_key";

-- AlterTable
ALTER TABLE "Exam" DROP COLUMN "invitationCode",
ADD COLUMN     "examCode" TEXT NOT NULL,
ADD COLUMN     "passKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ExamSession" ADD COLUMN     "userId" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "auth0_sub",
ADD COLUMN     "password" TEXT NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'STUDENT';

-- CreateTable
CREATE TABLE "ExamAnswer" (
    "id" TEXT NOT NULL,
    "answer" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "ExamAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamAnswer_sessionId_questionId_key" ON "ExamAnswer"("sessionId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "Exam_examCode_key" ON "Exam"("examCode");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSession_examId_userId_key" ON "ExamSession"("examId", "userId");

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAnswer" ADD CONSTRAINT "ExamAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAnswer" ADD CONSTRAINT "ExamAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
