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
ipcMain.handle('save-exam-data', async (_, examCode: string, data: object) => {
  try {
    const userDataPath = app.getPath('userData');
    const examsDir = join(userDataPath, OFFLINE_EXAM_CONFIG.EXAMS_DIRECTORY);

    // Ensure directory exists
    await fs.mkdir(examsDir, { recursive: true });

    const filePath = join(
      examsDir,
      `${examCode}${OFFLINE_EXAM_CONFIG.EXAM_FILE_EXTENSION}`
    );
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    console.log(`Exam data saved for exam ${examCode}`);
    return true;
  } catch (error) {
    console.error('Failed to save exam data:', error);
    throw error;
  }
});

// Load exam data from local storage
ipcMain.handle('load-exam-data', async (_, examCode: string) => {
  try {
    const userDataPath = app.getPath('userData');
    const examsDir = join(userDataPath, OFFLINE_EXAM_CONFIG.EXAMS_DIRECTORY);
    const filePath = join(
      examsDir,
      `${examCode}${OFFLINE_EXAM_CONFIG.EXAM_FILE_EXTENSION}`
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

// Handle App termination
ipcMain.on('quit', (event, code) => {
  app.exit(code);
});
