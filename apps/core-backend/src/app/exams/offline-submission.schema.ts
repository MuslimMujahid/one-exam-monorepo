import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Schema for a single submission within the package
export const singleSubmissionSchema = z.object({
  submissionId: z.string(),
  encryptedSealedAnswers: z.string(),
  encryptedSubmissionKey: z.string(),
  sessionId: z.string().optional(),
  savedAt: z.string().datetime(),
});

// Schema for the complete submission package upload (multipart/form-data)
export const submitOfflineSubmissionsSchema = z.object({
  examId: z.string().uuid(),
  examCode: z.string(),
  examStartTime: z.string().datetime(),
  examEndTime: z.string().datetime(),
  clientInfo: z
    .object({
      userAgent: z.string().optional(),
      platform: z.string().optional(),
      deviceId: z.string().optional(),
    })
    .optional(),
  // Note: The zip file will be handled as a multipart upload, not in this schema
  // The zip file should contain:
  // - Individual JSON files for each submission (named by submissionId)
  // - Optional manifest.json with submission metadata
});

// Response schema for submission analysis
export const submissionAnalysisSchema = z.object({
  submissionId: z.string(),
  sessionId: z.string(),
  userId: z.string(),
  examId: z.string(),
  finalAnswers: z.record(z.any()),
  suspiciousLevel: z.number().min(0).max(100),
  detectedAnomalies: z.array(z.string()),
  score: z.number().optional(),
  submittedAt: z.string().datetime(),
});

// Schema for manifest file inside the zip
export const submissionManifestSchema = z.object({
  examId: z.string().uuid(),
  sessionId: z.string().optional(),
  studentId: z.string(),
  totalSubmissions: z.number(),
  submissions: z.array(
    z.object({
      submissionId: z.string(),
      filename: z.string(),
      savedAt: z.string().datetime(),
      sessionId: z.string().optional(),
    })
  ),
  createdAt: z.string().datetime(),
});

// Schema for individual submission file content
export const submissionFileContentSchema = z.object({
  submissionId: z.string(),
  encryptedSealedAnswers: z.string(),
  encryptedSubmissionKey: z.string(),
  sessionId: z.string().optional(),
  savedAt: z.string().datetime(),
  metadata: z
    .object({
      examId: z.string(),
      studentId: z.string(),
      clientVersion: z.string().optional(),
    })
    .optional(),
});

export class SubmitOfflineSubmissionsDto extends createZodDto(
  submitOfflineSubmissionsSchema
) {}
export class SingleSubmissionDto extends createZodDto(singleSubmissionSchema) {}
export class SubmissionAnalysisDto extends createZodDto(
  submissionAnalysisSchema
) {}
export class SubmissionManifestDto extends createZodDto(
  submissionManifestSchema
) {}
export class SubmissionFileContentDto extends createZodDto(
  submissionFileContentSchema
) {}
