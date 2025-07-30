/**
 * This module is responsible on handling all the inter process communications
 * between the frontend to the electron backend.
 */

import { app, ipcMain } from 'electron';
import { environment } from '../../environments/environment';
import { promises as fs } from 'fs';
import { join } from 'path';
import { OFFLINE_EXAM_CONFIG } from '../config/offline.config';
import type { ExamSession } from '../lib/crypto';

export default class ElectronEvents {
  static bootstrapElectronEvents(): Electron.IpcMain {
    return ipcMain;
  }
}

// Retrieve app version
ipcMain.handle('get-app-version', () => {
  console.log(`Fetching application version... [v${environment.version}]`);

  return environment.version;
});

// Save exam data to local storage
ipcMain.handle('save-exam-data', async (_, examId: string, data: object) => {
  try {
    const userDataPath = app.getPath('userData');
    const examsDir = join(userDataPath, OFFLINE_EXAM_CONFIG.EXAMS_DIRECTORY);

    // Ensure directory exists
    await fs.mkdir(examsDir, { recursive: true });

    const filePath = join(
      examsDir,
      `${examId}${OFFLINE_EXAM_CONFIG.EXAM_FILE_EXTENSION}`
    );
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    console.log(`Exam data saved for exam ${examId}`);
    return true;
  } catch (error) {
    console.error('Failed to save exam data:', error);
    throw error;
  }
});

// Load exam data from local storage
ipcMain.handle('load-exam-data', async (_, examId: string) => {
  try {
    const userDataPath = app.getPath('userData');
    const examsDir = join(userDataPath, OFFLINE_EXAM_CONFIG.EXAMS_DIRECTORY);
    const filePath = join(
      examsDir,
      `${examId}${OFFLINE_EXAM_CONFIG.EXAM_FILE_EXTENSION}`
    );

    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null; // File not found
    }
    console.error('Failed to load exam data:', error);
    throw error;
  }
});

// Clear specific exam data
ipcMain.handle('clear-exam-data', async (_, examCode: string) => {
  try {
    const userDataPath = app.getPath('userData');
    const examsDir = join(userDataPath, OFFLINE_EXAM_CONFIG.EXAMS_DIRECTORY);
    const filePath = join(
      examsDir,
      `${examCode}${OFFLINE_EXAM_CONFIG.EXAM_FILE_EXTENSION}`
    );

    await fs.unlink(filePath);
    console.log(`Exam data cleared for exam ${examCode}`);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(`Exam data not found for exam ${examCode}`);
      return true; // File doesn't exist, consider it cleared
    }
    console.error('Failed to clear exam data:', error);
    throw error;
  }
});

// Clear all exam data
ipcMain.handle('clear-all-exam-data', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const examsDir = join(userDataPath, OFFLINE_EXAM_CONFIG.EXAMS_DIRECTORY);

    // Check if directory exists
    try {
      const files = await fs.readdir(examsDir);

      // Delete all .json files in the directory
      const deletePromises = files
        .filter((file) =>
          file.endsWith(OFFLINE_EXAM_CONFIG.EXAM_FILE_EXTENSION)
        )
        .map((file) => fs.unlink(join(examsDir, file)));

      await Promise.all(deletePromises);
      console.log(`Cleared ${deletePromises.length} preloaded exam files`);
      return deletePromises.length;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('No preloaded exams directory found');
        return 0; // Directory doesn't exist, nothing to clear
      }
      throw error;
    }
  } catch (error) {
    console.error('Failed to clear all exam data:', error);
    throw error;
  }
});

// Decrypt exam data using embedded license and keys
ipcMain.handle(
  'decrypt-exam-data',
  async (_, examId: string, userId?: string) => {
    console.log(
      `Decrypting exam data for exam id: ${examId}, userId: ${userId}`
    );
    try {
      const { ElectronCrypto } = await import('../lib/crypto');

      // First load the encrypted exam data
      const userDataPath = app.getPath('userData');
      const examsDir = join(userDataPath, OFFLINE_EXAM_CONFIG.EXAMS_DIRECTORY);
      const filePath = join(
        examsDir,
        `${examId}${OFFLINE_EXAM_CONFIG.EXAM_FILE_EXTENSION}`
      );

      const rawData = await fs.readFile(filePath, 'utf-8');
      const downloadedData = JSON.parse(rawData);

      // Process and decrypt the exam data
      const decryptedExamData = ElectronCrypto.processOfflineExam(
        downloadedData,
        userId
      );

      if (!decryptedExamData) {
        throw new Error('Failed to decrypt exam data');
      }

      console.log(`Successfully decrypted exam data for: ${examId}`);
      return decryptedExamData;
    } catch (error) {
      console.error('Failed to decrypt exam data:', error);

      // Return more specific error messages
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Exam data not found for exam id: ${examId}`);
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Unknown error occurred during decryption');
    }
  }
);

// Get client configuration (for debugging or future use)
ipcMain.handle('get-client-config', async () => {
  try {
    const { ElectronCrypto } = await import('../lib/crypto');
    return ElectronCrypto.getClientConfig();
  } catch (error) {
    console.error('Failed to get client config:', error);
    throw error;
  }
});

// Handle App termination
ipcMain.on('quit', (event, code) => {
  app.exit(code);
});

// Encrypt and save submission locally
ipcMain.handle(
  'save-submission-locally',
  async (
    _,
    examId: string,
    studentId: string,
    answers: Record<
      number,
      {
        questionId: number;
        answer: string | number | number[];
        timeSpent: number;
      }
    >,
    sessionId: string // Optional session ID for organizing submissions
  ) => {
    try {
      const { ElectronCrypto } = await import('../lib/crypto');

      console.log(
        `Creating and saving encrypted submission for exam: ${examId}, student: ${studentId}, session: ${sessionId}`
      );

      // Create encrypted submission package
      const encryptedSubmission = ElectronCrypto.createEncryptedSubmission(
        examId,
        studentId,
        answers
      );

      // Store within session directory
      const userDataPath = app.getPath('userData');
      const sessionsDir = join(userDataPath, 'exam-sessions');
      const submissionsDir = join(sessionsDir, sessionId, 'submissions');

      // Ensure directory exists
      await fs.mkdir(submissionsDir, { recursive: true });

      const filePath = join(
        submissionsDir,
        `${encryptedSubmission.submissionId}.json`
      );

      const submissionData = {
        ...encryptedSubmission,
        sessionId: sessionId || null, // Track which session this submission belongs to
        savedAt: new Date().toISOString(),
      };

      await fs.writeFile(filePath, JSON.stringify(submissionData, null, 2));

      console.log(
        `Submission encrypted and saved locally with ID: ${
          encryptedSubmission.submissionId
        }${sessionId ? ` in session: ${sessionId}` : ''}`
      );

      // Return the submission ID for confirmation
      return {
        submissionId: encryptedSubmission.submissionId,
        savedAt: submissionData.savedAt,
        sessionId: sessionId || null,
      };
    } catch (error) {
      console.error('Failed to encrypt and save submission locally:', error);
      throw error;
    }
  }
);

// Get all stored submissions
ipcMain.handle('get-stored-submissions', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const submissions = [];

    // Check global submissions directory (legacy)
    const globalSubmissionsDir = join(userDataPath, 'submissions');
    try {
      const globalFiles = await fs.readdir(globalSubmissionsDir);
      for (const file of globalFiles) {
        if (file.endsWith('.json')) {
          const filePath = join(globalSubmissionsDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const submissionData = JSON.parse(data);
          submissionData.location = 'global'; // Mark as global submission
          submissions.push(submissionData);
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn('Failed to read global submissions directory:', error);
      }
    }

    // Check session-based submissions directories
    const sessionsDir = join(userDataPath, 'exam-sessions');
    try {
      const sessionFolders = await fs.readdir(sessionsDir);
      for (const sessionFolder of sessionFolders) {
        const sessionPath = join(sessionsDir, sessionFolder);
        const stat = await fs.stat(sessionPath);

        if (stat.isDirectory()) {
          const sessionSubmissionsDir = join(sessionPath, 'submissions');
          try {
            const sessionFiles = await fs.readdir(sessionSubmissionsDir);
            for (const file of sessionFiles) {
              if (file.endsWith('.json')) {
                const filePath = join(sessionSubmissionsDir, file);
                const data = await fs.readFile(filePath, 'utf-8');
                const submissionData = JSON.parse(data);
                submissionData.location = sessionFolder; // Mark with session ID
                submissions.push(submissionData);
              }
            }
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
              console.warn(
                `Failed to read submissions for session ${sessionFolder}:`,
                error
              );
            }
          }
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn('Failed to read sessions directory:', error);
      }
    }

    console.log(`Found ${submissions.length} stored submissions`);
    return submissions;
  } catch (error) {
    console.error('Failed to get stored submissions:', error);
    throw error;
  }
});

// Clear specific stored submission
ipcMain.handle(
  'clear-stored-submission',
  async (_, submissionId: string, sessionId?: string) => {
    try {
      const userDataPath = app.getPath('userData');
      let filePath: string;

      if (sessionId) {
        // Look in session-specific directory
        const sessionsDir = join(userDataPath, 'exam-sessions');
        const sessionSubmissionsDir = join(
          sessionsDir,
          sessionId,
          'submissions'
        );
        filePath = join(sessionSubmissionsDir, `${submissionId}.json`);
      } else {
        // Look in global submissions directory (legacy)
        const submissionsDir = join(userDataPath, 'submissions');
        filePath = join(submissionsDir, `${submissionId}.json`);
      }

      await fs.unlink(filePath);
      console.log(
        `Cleared stored submission: ${submissionId}${
          sessionId ? ` from session: ${sessionId}` : ''
        }`
      );
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log(
          `Submission not found: ${submissionId}${
            sessionId ? ` in session: ${sessionId}` : ''
          }`
        );
        return true; // Consider it cleared if it doesn't exist
      }
      console.error('Failed to clear stored submission:', error);
      throw error;
    }
  }
);

// Create new exam session
ipcMain.handle(
  'create-exam-session',
  async (_, examId: string, studentId: string) => {
    try {
      const { ElectronCrypto } = await import('../lib/crypto');

      console.log(
        `Creating exam session for exam: ${examId}, student: ${studentId}`
      );

      const session = ElectronCrypto.createExamSession(examId, studentId);

      console.log(`Created exam session with ID: ${session.sessionId}`);

      // Immediately save the session to local storage
      try {
        const userDataPath = app.getPath('userData');
        const sessionsDir = join(userDataPath, 'exam-sessions');
        const sessionDir = join(sessionsDir, session.sessionId);

        // Ensure session directory exists
        await fs.mkdir(sessionDir, { recursive: true });

        // Prepare session for save
        const sessionToSave = ElectronCrypto.prepareSessionForSave(session);

        const filePath = join(sessionDir, `${sessionToSave.sessionId}.json`);

        await fs.writeFile(filePath, JSON.stringify(sessionToSave, null, 2));

        console.log(
          `Exam session automatically saved with ID: ${sessionToSave.sessionId}`
        );
      } catch (saveError) {
        console.error('Failed to automatically save exam session:', saveError);
        // Don't throw here - we still want to return the session even if save fails
        // The client can try to save it again later
      }

      return session;
    } catch (error) {
      console.error('Failed to create exam session:', error);
      throw error;
    }
  }
);

// Save exam session to local storage
ipcMain.handle('save-exam-session', async (_, sessionData: object) => {
  try {
    const { ElectronCrypto } = await import('../lib/crypto');
    const userDataPath = app.getPath('userData');
    const sessionsDir = join(userDataPath, 'exam-sessions');

    // Prepare session for save
    const sessionToSave = ElectronCrypto.prepareSessionForSave(
      sessionData as ExamSession
    );

    const sessionDir = join(sessionsDir, sessionToSave.sessionId);

    // Ensure session directory exists
    await fs.mkdir(sessionDir, { recursive: true });

    const filePath = join(sessionDir, `${sessionToSave.sessionId}.json`);

    await fs.writeFile(filePath, JSON.stringify(sessionToSave, null, 2));

    console.log(`Exam session saved with ID: ${sessionToSave.sessionId}`);
    return true;
  } catch (error) {
    console.error('Failed to save exam session:', error);
    throw error;
  }
});

// Load exam session from local storage
ipcMain.handle('load-exam-session', async (_, sessionId: string) => {
  try {
    const { ElectronCrypto } = await import('../lib/crypto');
    const userDataPath = app.getPath('userData');
    const sessionsDir = join(userDataPath, 'exam-sessions');
    const sessionDir = join(sessionsDir, sessionId);
    const filePath = join(sessionDir, `${sessionId}.json`);

    const data = await fs.readFile(filePath, 'utf-8');
    const sessionData = JSON.parse(data);

    // Validate session data
    if (!ElectronCrypto.validateSession(sessionData)) {
      throw new Error('Invalid session data');
    }

    // Check if session is expired
    if (ElectronCrypto.isSessionExpired(sessionData)) {
      console.log(`Session ${sessionId} has expired`);
      // Optionally delete expired session
      await fs.unlink(filePath).catch((err) => {
        console.warn('Failed to delete expired session:', err);
      }); // Ignore errors
      return null;
    }

    console.log(`Loaded exam session: ${sessionId}`);
    return sessionData;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null; // Session not found
    }
    console.error('Failed to load exam session:', error);
    throw error;
  }
});

// Get active exam sessions for a student
ipcMain.handle('get-student-sessions', async (_, studentId: string) => {
  try {
    const { ElectronCrypto } = await import('../lib/crypto');
    const userDataPath = app.getPath('userData');
    const sessionsDir = join(userDataPath, 'exam-sessions');

    try {
      const sessionDirs = await fs.readdir(sessionsDir);
      const sessions = [];

      for (const sessionDir of sessionDirs) {
        const sessionDirPath = join(sessionsDir, sessionDir);
        const stat = await fs.stat(sessionDirPath);

        if (stat.isDirectory()) {
          const sessionFilePath = join(sessionDirPath, `${sessionDir}.json`);
          try {
            const data = await fs.readFile(sessionFilePath, 'utf-8');
            const sessionData = JSON.parse(data);

            // Filter by student ID and validate
            if (
              sessionData.studentId === studentId &&
              ElectronCrypto.validateSession(sessionData) &&
              !ElectronCrypto.isSessionExpired(sessionData)
            ) {
              sessions.push(sessionData);
            } else if (ElectronCrypto.isSessionExpired(sessionData)) {
              // Clean up expired sessions
              await fs.unlink(sessionFilePath).catch((err) => {
                console.warn('Failed to delete expired session:', err);
              });
            }
          } catch (error) {
            console.warn(`Failed to parse session file ${sessionDir}:`, error);
            // Optionally delete corrupted session files
            await fs.unlink(sessionFilePath).catch((err) => {
              console.warn('Failed to delete corrupted session:', err);
            });
          }
        }
      }

      console.log(
        `Found ${sessions.length} active sessions for student: ${studentId}`
      );
      return sessions;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('No sessions directory found');
        return [];
      }
      throw error;
    }
  } catch (error) {
    console.error('Failed to get student sessions:', error);
    throw error;
  }
});

// Update exam session
ipcMain.handle(
  'update-exam-session',
  async (_, sessionId: string, updates: Partial<ExamSession>) => {
    try {
      const { ElectronCrypto } = await import('../lib/crypto');
      const userDataPath = app.getPath('userData');
      const sessionsDir = join(userDataPath, 'exam-sessions');
      const sessionDir = join(sessionsDir, sessionId);
      const filePath = join(sessionDir, `${sessionId}.json`);

      // Load existing session
      const data = await fs.readFile(filePath, 'utf-8');
      const sessionData = JSON.parse(data);

      // Update session with new data
      const updatedSession = {
        ...sessionData,
        ...updates,
        lastActivity: new Date().toISOString(),
      };

      // Prepare session for save (adds savedAt and version)
      const sessionToSave =
        ElectronCrypto.prepareSessionForSave(updatedSession);

      // Validate the prepared session
      if (!ElectronCrypto.validateSession(sessionToSave)) {
        throw new Error('Invalid updated session data');
      }

      // Save updated session
      await fs.writeFile(filePath, JSON.stringify(sessionToSave, null, 2));

      console.log(`Updated exam session: ${sessionId}`);
      return updatedSession; // Return the ExamSession type, not the SessionSaveData
    } catch (error) {
      console.error('Failed to update exam session:', error);
      throw error;
    }
  }
);

// Mark exam session as submitted and archive it (instead of clearing)
ipcMain.handle('mark-exam-session-submitted', async (_, sessionId: string) => {
  try {
    const { ElectronCrypto } = await import('../lib/crypto');
    const userDataPath = app.getPath('userData');
    const sessionsDir = join(userDataPath, 'exam-sessions');
    const sessionDir = join(sessionsDir, sessionId);
    const filePath = join(sessionDir, `${sessionId}.json`);

    // Load existing session
    const data = await fs.readFile(filePath, 'utf-8');
    const sessionData = JSON.parse(data);

    // Mark session as submitted
    const submittedSession = {
      ...sessionData,
      examSubmitted: true,
      submittedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    // Prepare session for save (adds savedAt and version)
    const sessionToSave =
      ElectronCrypto.prepareSessionForSave(submittedSession);

    // Save the submitted session
    await fs.writeFile(filePath, JSON.stringify(sessionToSave, null, 2));

    console.log(`Marked exam session as submitted: ${sessionId}`);
    return submittedSession;
  } catch (error) {
    console.error('Failed to mark exam session as submitted:', error);
    throw error;
  }
});

// Clear exam session (delete from storage)
ipcMain.handle('clear-exam-session', async (_, sessionId: string) => {
  try {
    const userDataPath = app.getPath('userData');
    const sessionsDir = join(userDataPath, 'exam-sessions');
    const sessionDir = join(sessionsDir, sessionId);
    const sessionFilePath = join(sessionDir, `${sessionId}.json`);

    // Check if session is submitted before clearing
    try {
      const data = await fs.readFile(sessionFilePath, 'utf-8');
      const sessionData = JSON.parse(data);

      if (sessionData.examSubmitted) {
        console.log(
          `Refusing to clear submitted session: ${sessionId}. Use archive-submitted-session instead.`
        );
        return false; // Don't clear submitted sessions
      }
    } catch (error) {
      // If we can't read the session, proceed with clearing
      console.warn(
        `Could not read session ${sessionId} for submission check:`,
        error
      );
    }

    // Clear session file
    await fs.unlink(sessionFilePath);

    // Also clear associated submissions directory
    try {
      const sessionSubmissionsDir = join(sessionDir, 'submissions');
      const submissionFiles = await fs.readdir(sessionSubmissionsDir);

      // Delete all submission files
      for (const file of submissionFiles) {
        if (file.endsWith('.json')) {
          await fs.unlink(join(sessionSubmissionsDir, file));
        }
      }

      // Remove submissions directory if empty
      await fs.rmdir(sessionSubmissionsDir);

      console.log(
        `Cleared exam session and associated submissions: ${sessionId}`
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(
          `Failed to clear submissions for session ${sessionId}:`,
          error
        );
      }
      console.log(`Cleared exam session: ${sessionId}`);
    }

    // Try to remove session directory if empty
    try {
      await fs.rmdir(sessionDir);
    } catch {
      // Ignore error if directory is not empty or doesn't exist
    }

    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(`Session ${sessionId} not found, already cleared`);
      return true;
    }
    console.error('Failed to clear exam session:', error);
    throw error;
  }
});

// Clean up expired sessions
ipcMain.handle('cleanup-expired-sessions', async () => {
  try {
    const { ElectronCrypto } = await import('../lib/crypto');
    const userDataPath = app.getPath('userData');
    const sessionsDir = join(userDataPath, 'exam-sessions');

    try {
      const sessionDirs = await fs.readdir(sessionsDir);
      let cleanedCount = 0;

      for (const sessionDir of sessionDirs) {
        const sessionDirPath = join(sessionsDir, sessionDir);
        const stat = await fs.stat(sessionDirPath);

        if (stat.isDirectory()) {
          const sessionFilePath = join(sessionDirPath, `${sessionDir}.json`);
          try {
            const data = await fs.readFile(sessionFilePath, 'utf-8');
            const sessionData = JSON.parse(data);

            if (ElectronCrypto.isSessionExpired(sessionData)) {
              await fs.unlink(sessionFilePath);
              // Try to clean up entire session directory if possible
              try {
                const submissionsDir = join(sessionDirPath, 'submissions');
                try {
                  const submissionFiles = await fs.readdir(submissionsDir);
                  for (const file of submissionFiles) {
                    await fs.unlink(join(submissionsDir, file));
                  }
                  await fs.rmdir(submissionsDir);
                } catch {
                  // Ignore if submissions dir doesn't exist or can't be cleaned
                }
                await fs.rmdir(sessionDirPath);
              } catch {
                // Ignore if directory can't be removed
              }
              cleanedCount++;
              console.log(`Cleaned expired session: ${sessionDir}`);
            }
          } catch (error) {
            console.warn(
              `Failed to process session file ${sessionDir}:`,
              error
            );
            // Clean up corrupted files too
            try {
              await fs.unlink(sessionFilePath);
              await fs.rmdir(sessionDirPath);
            } catch {
              // Ignore cleanup errors
            }
            cleanedCount++;
          }
        }
      }

      console.log(`Cleaned up ${cleanedCount} expired/corrupted sessions`);
      return cleanedCount;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('No sessions directory found');
        return 0;
      }
      throw error;
    }
  } catch (error) {
    console.error('Failed to cleanup expired sessions:', error);
    throw error;
  }
});

// Create zip file from stored submissions
ipcMain.handle('create-submissions-zip', async () => {
  try {
    const yazl = (await import('yazl')).default;
    const userDataPath = app.getPath('userData');

    const zip = new yazl.ZipFile();
    const zipFiles: string[] = [];
    let totalSubmissions = 0;

    // Create manifest data
    const manifest = {
      totalSubmissions: 0, // Will be updated after counting files
      createdAt: new Date().toISOString(),
      version: '1.0',
      submissions: [] as Array<{
        submissionId: string;
        savedAt: string;
        sessionId: string | null;
        filename: string;
      }>,
    };

    // Check session-based submissions directories
    const sessionsDir = join(userDataPath, 'exam-sessions');
    try {
      const sessionFolders = await fs.readdir(sessionsDir);
      for (const sessionFolder of sessionFolders) {
        const sessionPath = join(sessionsDir, sessionFolder);
        const stat = await fs.stat(sessionPath);

        if (stat.isDirectory()) {
          const sessionSubmissionsDir = join(sessionPath, 'submissions');
          try {
            const sessionFiles = await fs.readdir(sessionSubmissionsDir);
            for (const file of sessionFiles) {
              if (file.endsWith('.json')) {
                const filePath = join(sessionSubmissionsDir, file);
                const data = await fs.readFile(filePath, 'utf-8');
                const submissionData = JSON.parse(data);

                // Add file to zip in root directory (not in submissions folder)
                zip.addFile(filePath, file);
                zipFiles.push(file);
                totalSubmissions++;

                // Add to manifest
                manifest.submissions.push({
                  submissionId:
                    submissionData.submissionId || file.replace('.json', ''),
                  savedAt: submissionData.savedAt || new Date().toISOString(),
                  sessionId: sessionFolder,
                  filename: file,
                });
              }
            }
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
              console.warn(
                `Failed to read submissions for session ${sessionFolder}:`,
                error
              );
            }
          }
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn('Failed to read sessions directory:', error);
      }
    }

    // Update manifest with final count
    manifest.totalSubmissions = totalSubmissions;

    if (totalSubmissions === 0) {
      throw new Error('No submissions found to create zip file');
    }

    // Add manifest to zip
    zip.addBuffer(
      Buffer.from(JSON.stringify(manifest, null, 2)),
      'manifest.json'
    );

    // Generate zip file buffer
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];

      zip.outputStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      zip.outputStream.on('end', () => {
        const zipBuffer = Buffer.concat(chunks);
        console.log(
          `Created zip file with ${totalSubmissions} submissions, size: ${zipBuffer.length} bytes`
        );
        resolve(zipBuffer);
      });

      zip.outputStream.on('error', (error: Error) => {
        console.error('Failed to create zip file:', error);
        reject(error);
      });

      // Finalize the zip file
      zip.end();
    });
  } catch (error) {
    console.error('Failed to create submissions zip:', error);
    throw error;
  }
});

// Get all downloaded exams
ipcMain.handle('get-all-downloaded-exams', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const examsDir = join(userDataPath, OFFLINE_EXAM_CONFIG.EXAMS_DIRECTORY);

    // Check if directory exists
    try {
      const files = await fs.readdir(examsDir);

      // Filter for exam files and read their data
      const examFiles = files.filter((file) =>
        file.endsWith(OFFLINE_EXAM_CONFIG.EXAM_FILE_EXTENSION)
      );

      const examsData = await Promise.all(
        examFiles.map(async (file) => {
          try {
            const filePath = join(examsDir, file);
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data);
          } catch (error) {
            console.error(`Failed to read exam file ${file}:`, error);
            return null;
          }
        })
      );

      // Filter out any null entries from failed reads
      const validExams = examsData.filter((exam) => exam !== null);

      console.log(`Found ${validExams.length} downloaded exams`);
      return validExams;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('No downloaded exams directory found');
        return []; // Directory doesn't exist, no exams downloaded
      }
      throw error;
    }
  } catch (error) {
    console.error('Failed to get all downloaded exams:', error);
    throw error;
  }
});
