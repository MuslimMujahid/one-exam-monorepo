import { contextBridge, ipcRenderer } from 'electron';

interface PreloadExamResponse {
  examCode: string;
  encryptedExamData: string;
  signedLicense: string;
  prefetchedAt: string;
}

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  platform: process.platform,
  saveExamData: (examCode: string, data: PreloadExamResponse) =>
    ipcRenderer.invoke('save-exam-data', examCode, data),
  loadExamData: (examCode: string) =>
    ipcRenderer.invoke('load-exam-data', examCode),
  clearExamData: (examCode: string) =>
    ipcRenderer.invoke('clear-exam-data', examCode),
  clearAllExamData: () => ipcRenderer.invoke('clear-all-exam-data'),
});
