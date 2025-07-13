/**
 * This module is responsible on handling all the inter process communications
 * between the frontend to the electron backend.
 */

import { app, ipcMain } from 'electron';
import { environment } from '../../environments/environment';
import { promises as fs } from 'fs';
import { join } from 'path';
import { OFFLINE_EXAM_CONFIG } from '../config/offline.config';

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
