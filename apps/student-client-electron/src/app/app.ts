import {
  BrowserWindow,
  shell,
  screen,
  Menu,
  app as electronApp,
} from 'electron';
import { rendererAppName, rendererAppPort } from './constants';
import { environment } from '../environments/environment';
import { join } from 'path';
import { format } from 'url';
import { promises as fs } from 'fs';
import { OFFLINE_EXAM_CONFIG } from './config/offline.config';

export default class App {
  // Keep a global reference of the window object, if you don't, the window will
  // be closed automatically when the JavaScript object is garbage collected.
  static mainWindow: Electron.BrowserWindow;
  static application: Electron.App;
  static BrowserWindow;

  public static isDevelopmentMode() {
    const isEnvironmentSet: boolean = 'ELECTRON_IS_DEV' in process.env;
    const getFromEnvironment: boolean =
      parseInt(process.env.ELECTRON_IS_DEV, 10) === 1;

    return isEnvironmentSet ? getFromEnvironment : !environment.production;
  }

  private static onWindowAllClosed() {
    if (process.platform !== 'darwin') {
      App.application.quit();
    }
  }

  private static onClose() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    App.mainWindow = null;
  }

  private static onRedirect(event: Electron.Event, url: string) {
    if (url !== App.mainWindow.webContents.getURL()) {
      // this is a normal external redirect, open it in a new browser window
      event.preventDefault();
      shell.openExternal(url);
    }
  }

  private static onReady() {
    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    if (rendererAppName) {
      App.initMainWindow();
      App.loadMainWindow();
    }
  }

  private static onActivate() {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (App.mainWindow === null) {
      App.onReady();
    }
  }

  private static initMainWindow() {
    const workAreaSize = screen.getPrimaryDisplay().workAreaSize;
    const width = Math.min(1280, workAreaSize.width || 1280);
    const height = Math.min(720, workAreaSize.height || 720);

    // Create the browser window.
    App.mainWindow = new BrowserWindow({
      width: width,
      height: height,
      show: false,
      webPreferences: {
        contextIsolation: true,
        backgroundThrottling: false,
        preload: join(__dirname, 'main.preload.js'),
      },
    });
    App.mainWindow.setMenu(null);

    // In development mode, create a simple menu with DevTools option
    if (App.isDevelopmentMode()) {
      const template = [
        {
          label: 'Development',
          submenu: [
            {
              label: 'Toggle DevTools',
              accelerator: 'F12',
              click: () => {
                App.mainWindow.webContents.toggleDevTools();
              },
            },
            {
              label: 'Reload',
              accelerator: 'Ctrl+R',
              click: () => {
                App.mainWindow.webContents.reload();
              },
            },
            { type: 'separator' as const },
            {
              label: 'Clear All Preloaded Exams',
              click: async () => {
                const { dialog } = await import('electron');
                const result = await dialog.showMessageBox(App.mainWindow, {
                  type: 'warning',
                  buttons: ['Cancel', 'Clear All'],
                  defaultId: 0,
                  message: 'Clear all preloaded exam data?',
                  detail:
                    'This will delete all locally stored exam data. This action cannot be undone.',
                });

                if (result.response === 1) {
                  try {
                    // Clear exam data directly using the same logic as IPC handler
                    const userDataPath = electronApp.getPath('userData');
                    const examsDir = join(
                      userDataPath,
                      OFFLINE_EXAM_CONFIG.EXAMS_DIRECTORY
                    );

                    let clearedCount = 0;

                    try {
                      const files = await fs.readdir(examsDir);

                      // Delete all .json files in the directory
                      const deletePromises = files
                        .filter((file) =>
                          file.endsWith(OFFLINE_EXAM_CONFIG.EXAM_FILE_EXTENSION)
                        )
                        .map((file) => fs.unlink(join(examsDir, file)));

                      await Promise.all(deletePromises);
                      clearedCount = deletePromises.length;
                    } catch (error) {
                      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                        throw error;
                      }
                      // Directory doesn't exist, nothing to clear
                    }

                    await dialog.showMessageBox(App.mainWindow, {
                      type: 'info',
                      message: 'Success',
                      detail: `Cleared ${clearedCount} preloaded exam files.`,
                    });
                  } catch (error) {
                    console.error('Failed to clear exam data:', error);
                    await dialog.showMessageBox(App.mainWindow, {
                      type: 'error',
                      message: 'Error',
                      detail: `Failed to clear exam data: ${
                        error instanceof Error ? error.message : 'Unknown error'
                      }`,
                    });
                  }
                }
              },
            },
          ],
        },
      ];
      const menu = Menu.buildFromTemplate(template);
      App.mainWindow.setMenu(menu);
    }

    App.mainWindow.center();

    // if main window is ready to show, close the splash window and show the main window
    App.mainWindow.once('ready-to-show', () => {
      App.mainWindow.show();

      // Auto-open DevTools in development mode
      if (App.isDevelopmentMode()) {
        App.mainWindow.webContents.openDevTools();
      }
    });

    // Open DevTools with F12 or Ctrl+Shift+I (Cmd+Option+I on Mac)
    App.mainWindow.webContents.on('before-input-event', (event, input) => {
      if (
        input.key === 'F12' ||
        (input.control && input.shift && input.key === 'I') ||
        (input.meta && input.alt && input.key === 'I')
      ) {
        App.mainWindow.webContents.toggleDevTools();
      }
    });

    // handle all external redirects in a new browser window
    // App.mainWindow.webContents.on('will-navigate', App.onRedirect);
    // App.mainWindow.webContents.on('new-window', (event, url, frameName, disposition, options) => {
    //     App.onRedirect(event, url);
    // });

    // Emitted when the window is closed.
    App.mainWindow.on('closed', () => {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      App.mainWindow = null;
    });
  }

  private static loadMainWindow() {
    // load the index.html of the app.
    if (!App.application.isPackaged) {
      App.mainWindow.loadURL(`http://localhost:${rendererAppPort}`);
    } else {
      App.mainWindow.loadURL(
        format({
          pathname: join(__dirname, '..', rendererAppName, 'index.html'),
          protocol: 'file:',
          slashes: true,
        })
      );
    }
  }

  static main(app: Electron.App, browserWindow: typeof BrowserWindow) {
    // we pass the Electron.App object and the
    // Electron.BrowserWindow into this function
    // so this class has no dependencies. This
    // makes the code easier to write tests for

    App.BrowserWindow = browserWindow;
    App.application = app;

    App.application.on('window-all-closed', App.onWindowAllClosed); // Quit when all windows are closed.
    App.application.on('ready', App.onReady); // App is ready to load data
    App.application.on('activate', App.onActivate); // App is activated
  }
}
