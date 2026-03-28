import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { existsSync } from 'fs';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { initDb } from './db/client.js';
import * as eventService from './db/services/eventService.js';
import * as eventTagService from './db/services/eventTagService.js';
import * as formService from './db/services/formService';
import * as questionService from './db/services/questionService';
import * as submissionService from './db/services/submissionService';
import * as responseService from './db/services/responseService';
import icon from '../../resources/icon.png?asset';
import { listGoogleForms } from './common/google-forms/google-drive.js';
import { createGoogleForm, openGoogleFormInBrowser } from './common/google-forms/google-forms.js';
import {
  ensureAuthenticated,
  getUserProfile,
  isUserAuthenticated
} from './common/google-forms/google-auth-client.js';
import { commitExcelImport, parseExcelImport } from './surveys/excelImport.js';
import { importGoogleForms } from './surveys/googleFormsImport.js';

let mainWindow;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  ipcMain.on('ping', () => console.log('pong'));

  const migrationsFolder = app.isPackaged
    ? join(process.resourcesPath, 'drizzle')
    : join(__dirname, '../../drizzle');

  const db = initDb();

  // Skip migration in fresh projects until the first migration set is generated.
  if (existsSync(migrationsFolder)) {
    try {
      migrate(db, { migrationsFolder });
    } catch (error) {
      console.error(
        'Failed to run database migrations from folder:',
        migrationsFolder,
        '\nError:',
        error
      );
    }
  }

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Register IPC handlers, which are wired to the service layer

ipcMain.handle('events:list', () => eventService.listEvents());
ipcMain.handle('events:findByName', (_event, name) => eventService.findEventByName(name));
ipcMain.handle('events:listWithSurveyCountsAndTags', () =>
  eventService.listEventsWithSurveyCountsAndTags()
);
ipcMain.handle('events:create', (_event, data) => eventService.createEvent(data));
ipcMain.handle('events:update', (_event, id, data) => eventService.updateEvent(id, data));
ipcMain.handle('events:delete', (_event, id) => eventService.deleteEvent(id));

ipcMain.handle('eventTags:list', () => eventTagService.listEventTags());
ipcMain.handle('eventTags:findBySlug', (_event, slug) => eventTagService.findEventTagBySlug(slug));
ipcMain.handle('eventTags:create', (_event, data) => eventTagService.createEventTag(data));
ipcMain.handle('eventTags:delete', (_event, id) => eventTagService.deleteEventTag(id));
ipcMain.handle('eventTags:listForEvent', (_event, eventId) =>
  eventTagService.listEventTagsForEvent(eventId)
);
ipcMain.handle('eventTags:addToEvent', (_event, eventId, tagId) =>
  eventTagService.addTagToEvent(eventId, tagId)
);
ipcMain.handle('eventTags:removeFromEvent', (_event, eventId, tagId) =>
  eventTagService.removeTagFromEvent(eventId, tagId)
);

ipcMain.handle('forms:list', () => formService.listForms());
ipcMain.handle('forms:listWithEventNameAndResponseCount', () =>
  formService.listFormWithEventNameAndResponseCount()
);
ipcMain.handle('forms:listByEvent', (_event, eventId) => formService.listFormsByEvent(eventId));
ipcMain.handle('forms:create', (_event, data) => formService.createForm(data));
ipcMain.handle('forms:delete', (_event, id) => formService.deleteForm(id));
ipcMain.handle('forms:update', (_event, id, data) => formService.updateForm(id, data));

ipcMain.handle('questions:listByForm', (_event, formId) =>
  questionService.listQuestionsByForm(formId)
);
ipcMain.handle('questions:create', (_event, formId) => questionService.createQuestion(formId));
ipcMain.handle('questions:delete', (_event, id) => questionService.deleteQuestion(id));

ipcMain.handle('submissions:listByForm', (_event, formId) =>
  submissionService.listSubmissionsByForm(formId)
);
ipcMain.handle('submissions:create', (_event, data) => submissionService.createSubmission(data));
ipcMain.handle('submissions:delete', (_event, id) => submissionService.deleteSubmission(id));

ipcMain.handle('responses:listBySubmission', (_event, submissionId) =>
  responseService.listResponsesBySubmission(submissionId)
);
ipcMain.handle('responses:upsert', (_event, data) => responseService.upsertResponse(data));
ipcMain.handle('responses:delete', (_event, id) => responseService.deleteResponse(id));

// google auth
ipcMain.handle('googleAuth:isUserAuthenticated', () => isUserAuthenticated());
ipcMain.handle('googleAuth:ensureAuthenticated', () => ensureAuthenticated());
ipcMain.handle('googleAuth:getUserProfile', () => getUserProfile());

// google forms
ipcMain.handle('googleForms:list', (_event, pageToken) => listGoogleForms(pageToken));
ipcMain.handle('googleForms:create', (_event, title, document_title) =>
  createGoogleForm(title, document_title)
);
ipcMain.handle('googleForms:openInBrowser', (_event, formId) => openGoogleFormInBrowser(formId));
ipcMain.handle('googleForms:importSelected', async (_event, payload) => {
  try {
    const { formIds, eventName, eventDescription, formNameOverride } = payload || {};
    const result = await importGoogleForms(formIds, { eventName, eventDescription, formNameOverride });
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

// excel survey import
ipcMain.handle('surveys:parseExcelImport', (_event, buffer) => {
  try {
    return { ok: true, ...parseExcelImport(buffer) };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});
ipcMain.handle('surveys:commitExcelImport', async (_event, payload) => {
  try {
    const { buffer, formName, eventName, eventDescription } = payload || {};
    const result = await commitExcelImport(buffer, { formName, eventName, eventDescription });
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

// Window management
ipcMain.on('window:minimize', () => {
  mainWindow.minimize();
});

ipcMain.on('window:maximize-toggle', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window:close', () => {
  mainWindow.close();
});
