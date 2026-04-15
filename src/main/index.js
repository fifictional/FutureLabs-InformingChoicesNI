import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import {
  ensureDatabaseReady,
  getDatabaseHealth,
  isDbConnected,
  reinitDb,
  runMigrations,
  testMysqlConnection,
  closeDb
} from './db/client.js';
import * as eventService from './db/services/eventService.js';
import * as eventTagService from './db/services/eventTagService.js';
import * as formService from './db/services/formService';
import * as questionService from './db/services/questionService';
import * as submissionService from './db/services/submissionService';
import * as responseService from './db/services/responseService';
import * as statisticOverviewService from './db/services/statisticOverviewService';
import * as clientService from './db/services/clientService.js';
import * as chartService from './db/services/chartService.js';
import icon from '../../resources/icon.png?asset';
import { listGoogleForms } from './common/google-forms/google-drive.js';
import {
  createGoogleForm,
  getGoogleFormById,
  openGoogleFormInBrowserByBaseLink,
  openGoogleFormInBrowserById
} from './common/google-forms/google-forms.js';
import {
  ensureAuthenticated,
  getUserProfile,
  isUserAuthenticated,
  signOut
} from './common/google-forms/google-auth-client.js';
import {
  getCredentialStatus,
  processCredentialsFile
} from './common/google-forms/credential-store.js';
import { getSetting, setSetting, SETTINGS_KEYS } from './common/settings/settings.js';
import { commitExcelImport, parseExcelImport } from './surveys/excelImport.js';
import { importGoogleForms } from './surveys/googleFormsImport.js';
import { logger } from './common/logger.js';

let mainWindow;
let activeOperationCount = 0;

async function runTrackedOperation(operationName, fn) {
  activeOperationCount += 1;
  logger.info(`Operation started: ${operationName}. Active operations: ${activeOperationCount}`);
  try {
    return await fn();
  } finally {
    activeOperationCount = Math.max(0, activeOperationCount - 1);
    logger.info(`Operation finished: ${operationName}. Active operations: ${activeOperationCount}`);
  }
}

function getMigrationsFolder() {
  return app.isPackaged ? join(process.resourcesPath, 'drizzle') : join(__dirname, '../../drizzle');
}

async function getStartupReadiness() {
  let dbHealth;
  try {
    dbHealth = await getDatabaseHealth(getMigrationsFolder());
  } catch (error) {
    dbHealth = {
      ok: false,
      connected: false,
      schemaValid: false,
      migrationsValid: false,
      requiredTablesMissing: [],
      expectedMigrations: 0,
      appliedMigrations: 0,
      pendingMigrations: 0,
      message: error?.message || 'Failed to inspect database health.'
    };
  }

  const credentialStatus = getCredentialStatus();
  let googleAuthenticated = false;
  let googleAuthMessage = '';

  if (credentialStatus.valid) {
    try {
      googleAuthenticated = await isUserAuthenticated();
    } catch (error) {
      googleAuthenticated = false;
      googleAuthMessage = error?.message || 'Failed to validate Google sign-in state.';
    }
  }

  const googleReady = credentialStatus.valid && googleAuthenticated;

  return {
    ready: Boolean(dbHealth?.ok) && googleReady,
    db: {
      ready: Boolean(dbHealth?.ok),
      ...dbHealth
    },
    google: {
      ready: googleReady,
      credentialStatus,
      authenticated: googleAuthenticated,
      message: googleReady
        ? 'Google authentication is ready.'
        : googleAuthMessage ||
          (credentialStatus.valid ? 'Sign in with Google to continue.' : credentialStatus.message)
    }
  };
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1440,
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

  const migrationsFolder = getMigrationsFolder();

  await ensureDatabaseReady(migrationsFolder);

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

// Clean up database connection on app exit
app.on('before-quit', async (event) => {
  if (activeOperationCount > 0) {
    event.preventDefault();
    dialog.showErrorBox(
      'Operation In Progress',
      'Please wait for the current operation to complete before closing the application.'
    );
    return;
  }

  await closeDb();
});

// Register IPC handlers, which are wired to the service layer

ipcMain.handle('events:list', async (_event, offset, limit) => {
  try {
    if (typeof offset === 'number' || typeof limit === 'number') {
      return await eventService.listEventsPaginated(offset, limit);
    }
    return await eventService.listEvents();
  } catch (err) {
    logger.error('events:list failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('events:findByName', async (_event, name) => {
  try {
    return await eventService.findEventByName(name);
  } catch (err) {
    logger.error('events:findByName failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('events:listWithSurveyCountsAndTags', async () => {
  try {
    return await eventService.listEventsWithSurveyCountsAndTags();
  } catch (err) {
    logger.error('events:listWithSurveyCountsAndTags failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('events:create', async (_event, data) => {
  try {
    return await eventService.createEvent(data);
  } catch (err) {
    logger.error('events:create failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('events:update', async (_event, id, data) => {
  try {
    return await eventService.updateEvent(id, data);
  } catch (err) {
    logger.error('events:update failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('events:delete', async (_event, id) => {
  try {
    return await eventService.deleteEvent(id);
  } catch (err) {
    logger.error('events:delete failed', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('eventTags:list', async (_event, offset, limit) => {
  try {
    if (typeof offset === 'number' || typeof limit === 'number') {
      return await eventTagService.listEventTagsPaginated(offset, limit);
    }
    return await eventTagService.listEventTags();
  } catch (err) {
    logger.error('eventTags:list failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('eventTags:findBySlug', async (_event, slug) => {
  try {
    return await eventTagService.findEventTagBySlug(slug);
  } catch (err) {
    logger.error('eventTags:findBySlug failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('eventTags:create', async (_event, data) => {
  try {
    return await eventTagService.createEventTag(data);
  } catch (err) {
    logger.error('eventTags:create failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('eventTags:delete', async (_event, id) => {
  try {
    return await eventTagService.deleteEventTag(id);
  } catch (err) {
    logger.error('eventTags:delete failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('eventTags:listForEvent', async (_event, eventId, offset, limit) => {
  try {
    if (typeof offset === 'number' || typeof limit === 'number') {
      return await eventTagService.listEventTagsForEventPaginated(eventId, offset, limit);
    }
    return await eventTagService.listEventTagsForEvent(eventId);
  } catch (err) {
    logger.error('eventTags:listForEvent failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('eventTags:addToEvent', async (_event, eventId, tagId) => {
  try {
    return await eventTagService.addTagToEvent(eventId, tagId);
  } catch (err) {
    logger.error('eventTags:addToEvent failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('eventTags:removeFromEvent', async (_event, eventId, tagId) => {
  try {
    return await eventTagService.removeTagFromEvent(eventId, tagId);
  } catch (err) {
    logger.error('eventTags:removeFromEvent failed', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('forms:list', async (_event, offset, limit) => {
  try {
    return await formService.listForms(offset, limit);
  } catch (err) {
    logger.error('forms:list failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('forms:findById', async (_event, id) => {
  try {
    return await formService.findFormById(id);
  } catch (err) {
    logger.error('forms:findById failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('forms:listWithEventNameAndResponseCount', async (_event, offset, limit) => {
  try {
    if (typeof offset === 'number' || typeof limit === 'number') {
      return await formService.listFormWithEventNameAndResponseCountPaginated(offset, limit);
    }
    return await formService.listFormWithEventNameAndResponseCount();
  } catch (err) {
    logger.error('forms:listWithEventNameAndResponseCount failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('forms:listByEvent', async (_event, eventId, offset, limit) => {
  try {
    return await formService.listFormsByEvent(eventId, offset, limit);
  } catch (err) {
    logger.error('forms:listByEvent failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('forms:create', async (_event, data) => {
  try {
    return await formService.createForm(data);
  } catch (err) {
    logger.error('forms:create failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('forms:delete', async (_event, id) => {
  try {
    return await formService.deleteForm(id);
  } catch (err) {
    logger.error('forms:delete failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('forms:update', async (_event, id, data) => {
  try {
    return await formService.updateForm(id, data);
  } catch (err) {
    logger.error('forms:update failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('forms:refreshSchemaAndResponses', async (_event, id) => {
  try {
    return await runTrackedOperation('forms:refreshSchemaAndResponses', async () => {
      return await formService.refreshSchemaAndResponses(id, { force: true });
    });
  } catch (err) {
    logger.error('forms:refreshSchemaAndResponses failed', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('questions:listByForm', async (_event, formId, offset, limit) => {
  try {
    if (typeof offset === 'number' || typeof limit === 'number') {
      return await questionService.listQuestionsByFormPaginated(formId, offset, limit);
    }
    return await questionService.listQuestionsByForm(formId);
  } catch (err) {
    logger.error('questions:listByForm failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('questions:listChoicesByQuestion', async (_event, questionId, offset, limit) => {
  try {
    if (typeof offset === 'number' || typeof limit === 'number') {
      return await questionService.listQuestionChoicesByQuestionPaginated(
        questionId,
        offset,
        limit
      );
    }
    return await questionService.listQuestionChoicesByQuestion(questionId);
  } catch (err) {
    logger.error('questions:listChoicesByQuestion failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('questions:create', async (_event, formId) => {
  try {
    return await questionService.createQuestion(formId);
  } catch (err) {
    logger.error('questions:create failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('questions:delete', async (_event, id) => {
  try {
    return await questionService.deleteQuestion(id);
  } catch (err) {
    logger.error('questions:delete failed', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('submissions:countAll', async () => {
  try {
    return await submissionService.countAllSubmissions();
  } catch (err) {
    logger.error('submissions:countAll failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('submissions:listByForm', async (_event, formId, offset, limit) => {
  try {
    return await submissionService.listSubmissionsByForm(formId, offset, limit);
  } catch (err) {
    logger.error('submissions:listByForm failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('submissions:create', async (_event, data) => {
  try {
    return await submissionService.createSubmission(data);
  } catch (err) {
    logger.error('submissions:create failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('submissions:delete', async (_event, id) => {
  try {
    return await submissionService.deleteSubmission(id);
  } catch (err) {
    logger.error('submissions:delete failed', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('responses:listBySubmission', async (_event, submissionId, offset, limit) => {
  try {
    if (typeof offset === 'number' || typeof limit === 'number') {
      return await responseService.listResponsesBySubmissionPaginated(submissionId, offset, limit);
    }
    return await responseService.listResponsesBySubmission(submissionId);
  } catch (err) {
    logger.error('responses:listBySubmission failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('responses:upsert', async (_event, data) => {
  try {
    return await responseService.upsertResponse(data);
  } catch (err) {
    logger.error('responses:upsert failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('responses:delete', async (_event, id) => {
  try {
    return await responseService.deleteResponse(id);
  } catch (err) {
    logger.error('responses:delete failed', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('statistics:listConfigurableMetrics', async () => {
  try {
    return await statisticOverviewService.listConfigurableOverviewMetrics();
  } catch (err) {
    logger.error('statistics:listConfigurableMetrics failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('statistics:listSelectableSurveyQuestions', async (_event, metricName) => {
  try {
    return await statisticOverviewService.listSelectableSurveyQuestions(metricName);
  } catch (err) {
    logger.error('statistics:listSelectableSurveyQuestions failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('statistics:setMetricQuestion', async (_event, metricName, questionId) => {
  try {
    return await statisticOverviewService.setOverviewMetricQuestion(metricName, questionId);
  } catch (err) {
    logger.error('statistics:setMetricQuestion failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('statistics:getDashboardOverviewData', async (_event, filters) => {
  try {
    return await statisticOverviewService.getDashboardOverviewData(filters);
  } catch (err) {
    logger.error('statistics:getDashboardOverviewData failed', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('clients:list', async (_event, offset, limit) => {
  try {
    if (typeof offset === 'number' || typeof limit === 'number') {
      return await clientService.listClientsPaginated(offset, limit);
    }
    return await clientService.listClients();
  } catch (err) {
    logger.error('clients:list failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('clients:create', async (_event, data) => {
  try {
    return await clientService.createClient(data);
  } catch (err) {
    logger.error('clients:create failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('clients:update', async (_event, id, data) => {
  try {
    return await clientService.updateClient(id, data);
  } catch (err) {
    logger.error('clients:update failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('clients:delete', async (_event, id) => {
  try {
    return await clientService.deleteClient(id);
  } catch (err) {
    logger.error('clients:delete failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('clients:getTotalAppointments', async () => {
  try {
    return await clientService.getTotalAppointments();
  } catch (err) {
    logger.error('clients:getTotalAppointments failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('clients:setTotalAppointments', async (_event, value) => {
  try {
    return await clientService.setTotalAppointments(value);
  } catch (err) {
    logger.error('clients:setTotalAppointments failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('clients:adjustTotalAppointments', async (_event, delta) => {
  try {
    return await clientService.adjustTotalAppointments(delta);
  } catch (err) {
    logger.error('clients:adjustTotalAppointments failed', err);
    return { ok: false, error: err.message };
  }
});

// charts
ipcMain.handle('charts:list', async (_event, offset, limit) => {
  try {
    if (typeof offset === 'number' || typeof limit === 'number') {
      return await chartService.listChartsPaginated(offset, limit);
    }
    return await chartService.listCharts();
  } catch (err) {
    logger.error('charts:list failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('charts:findById', async (_event, id) => {
  try {
    return await chartService.findChartById(id);
  } catch (err) {
    logger.error('charts:findById failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('charts:create', async (_event, data) => {
  try {
    return await chartService.createChart(data);
  } catch (err) {
    logger.error('charts:create failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('charts:update', async (_event, id, data) => {
  try {
    return await chartService.updateChart(id, data);
  } catch (err) {
    logger.error('charts:update failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('charts:delete', async (_event, id) => {
  try {
    return await chartService.deleteChart(id);
  } catch (err) {
    logger.error('charts:delete failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('charts:reorder', async (_event, chartIds) => {
  try {
    return await chartService.reorderCharts(chartIds);
  } catch (err) {
    logger.error('charts:reorder failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('charts:parseConfiguration', async (_event, chart) => {
  try {
    return await chartService.parseChartConfiguration(chart);
  } catch (err) {
    logger.error('charts:parseConfiguration failed', err);
    return { ok: false, error: err.message };
  }
});

// google auth
ipcMain.handle('googleAuth:isUserAuthenticated', async () => {
  try {
    return await isUserAuthenticated();
  } catch (err) {
    logger.error('googleAuth:isUserAuthenticated failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('googleAuth:ensureAuthenticated', async () => {
  try {
    return await ensureAuthenticated();
  } catch (err) {
    logger.error('googleAuth:ensureAuthenticated failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('googleAuth:getUserProfile', async () => {
  try {
    return await getUserProfile();
  } catch (err) {
    logger.error('googleAuth:getUserProfile failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('googleAuth:signOut', async () => {
  try {
    return await signOut();
  } catch (err) {
    logger.error('googleAuth:signOut failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('googleAuth:cancelOAuthFlow', async () => {
  try {
    return await cancelOAuthFlow();
  } catch (err) {
    logger.error('googleAuth:cancelOAuthFlow failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('googleAuth:getSettings', async () => {
  try {
    return {
      credentialSourcePath: getSetting(SETTINGS_KEYS.GOOGLE_CREDENTIAL_SOURCE_PATH) || '',
      credentialPath: getSetting(SETTINGS_KEYS.GOOGLE_RAW_CREDENTIALS_RELATIVE_PATH) || '',
      encryptedCredentialPath:
        getSetting(SETTINGS_KEYS.GOOGLE_ENCRYPTED_CREDENTIALS_RELATIVE_PATH) || '',
      tokenPath: getSetting(SETTINGS_KEYS.GOOGLE_ENCRYPTED_TOKEN_RELATIVE_PATH) || '',
      credentialStatus: getCredentialStatus()
    };
  } catch (err) {
    logger.error('googleAuth:getSettings failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('googleAuth:selectCredentialFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Google credentials.json',
    properties: ['openFile'],
    filters: [
      { name: 'JSON', extensions: ['json'] },
      { name: 'All files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePaths?.length) {
    return { ok: false, cancelled: true };
  }

  return { ok: true, filePath: result.filePaths[0] };
});
ipcMain.handle('googleAuth:processCredentialFile', async (_event, sourceFilePath) => {
  try {
    setSetting(SETTINGS_KEYS.GOOGLE_CREDENTIAL_SOURCE_PATH, sourceFilePath || '');
    if (!getSetting(SETTINGS_KEYS.GOOGLE_RAW_CREDENTIALS_RELATIVE_PATH)) {
      setSetting(
        SETTINGS_KEYS.GOOGLE_RAW_CREDENTIALS_RELATIVE_PATH,
        'credentials/credentials.json'
      );
    }
    if (!getSetting(SETTINGS_KEYS.GOOGLE_ENCRYPTED_CREDENTIALS_RELATIVE_PATH)) {
      setSetting(
        SETTINGS_KEYS.GOOGLE_ENCRYPTED_CREDENTIALS_RELATIVE_PATH,
        'credentials/encrypted-credentials.bin'
      );
    }
    if (!getSetting(SETTINGS_KEYS.GOOGLE_ENCRYPTED_TOKEN_RELATIVE_PATH)) {
      setSetting(
        SETTINGS_KEYS.GOOGLE_ENCRYPTED_TOKEN_RELATIVE_PATH,
        'credentials/encrypted-token.bin'
      );
    }

    const processed = processCredentialsFile(sourceFilePath);
    await signOut();

    return {
      ...processed,
      credentialStatus: getCredentialStatus()
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || 'Failed to process credentials file.',
      credentialStatus: getCredentialStatus()
    };
  }
});

ipcMain.handle('startup:getReadiness', async () => {
  try {
    return await getStartupReadiness();
  } catch (err) {
    logger.error('startup:getReadiness failed', err);
    return { ok: false, error: err.message };
  }
});

// google forms
ipcMain.handle('googleForms:list', async (_event, pageToken) => {
  try {
    return await listGoogleForms(pageToken);
  } catch (err) {
    logger.error('googleForms:list failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('googleForms:create', async (_event, title, document_title) => {
  try {
    return await createGoogleForm(title, document_title);
  } catch (err) {
    logger.error('googleForms:create failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('googleForms:openInBrowserById', async (_event, formId) => {
  try {
    return await openGoogleFormInBrowserById(formId);
  } catch (err) {
    logger.error('googleForms:openInBrowserById failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('googleForms:openInBrowserByBaseLink', async (_event, baseLink) => {
  try {
    return await openGoogleFormInBrowserByBaseLink(baseLink);
  } catch (err) {
    logger.error('googleForms:openInBrowserByBaseLink failed', err);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('googleForms:listReferenceQuestions', async (_event, formId) => {
  const formRes = await getGoogleFormById(formId);
  const form = formRes?.data || formRes;
  const items = Array.isArray(form?.items) ? form.items : [];

  return items
    .map((item) => {
      const q = item?.questionItem?.question;
      if (!q?.textQuestion || !q?.questionId) return null;
      const title = String(item?.title || q.questionId).trim();
      if (!title) return null;

      return {
        id: String(q.questionId),
        title,
        type: q.textQuestion?.paragraph ? 'paragraph' : 'text'
      };
    })
    .filter(Boolean);
});
ipcMain.handle('googleForms:importSelected', async (_event, payload) => {
  try {
    const { formIds, eventName, eventDescription, formNameOverride, userReferenceQuestionId } =
      payload || {};
    const result = await runTrackedOperation('googleForms:importSelected', async () => {
      return await importGoogleForms(formIds, {
        eventName,
        eventDescription,
        formNameOverride,
        userReferenceQuestionId
      });
    });

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
    const { buffer, formName, eventName, eventDescription, userReferenceQuestionIndex } =
      payload || {};
    const result = await runTrackedOperation('surveys:commitExcelImport', async () => {
      return await commitExcelImport(buffer, {
        formName,
        eventName,
        eventDescription,
        userReferenceQuestionIndex
      });
    });

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

// DB connection settings
ipcMain.handle('dbSettings:get', async () => {
  try {
    return {
      host: getSetting(SETTINGS_KEYS.MYSQL_HOST) || '',
      port: String(getSetting(SETTINGS_KEYS.MYSQL_PORT) || ''),
      database: getSetting(SETTINGS_KEYS.MYSQL_DATABASE) || '',
      user: getSetting(SETTINGS_KEYS.MYSQL_USER) || '',
      passwordEnvVar: 'DB_PASSWORD',
      passwordSet: Boolean(process.env.DB_PASSWORD)
    };
  } catch (err) {
    logger.error('dbSettings:get failed', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('dbSettings:isConnected', async () => {
  try {
    return await isDbConnected();
  } catch (err) {
    logger.error('dbSettings:isConnected failed', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('dbSettings:testConnection', async (_event, config) => {
  try {
    const testConfig = {
      host: config.host || '',
      port: Number(config.port) || 0,
      database: config.database || '',
      user: config.user || '',
      password: process.env.DB_PASSWORD || ''
    };
    return await testMysqlConnection(testConfig);
  } catch (err) {
    logger.error('dbSettings:testConnection failed', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('dbSettings:saveAndConnect', async (_event, config) => {
  try {
    setSetting(SETTINGS_KEYS.MYSQL_HOST, config.host || '');
    setSetting(SETTINGS_KEYS.MYSQL_PORT, Number(config.port) || '');
    setSetting(SETTINGS_KEYS.MYSQL_DATABASE, config.database || '');
    setSetting(SETTINGS_KEYS.MYSQL_USER, config.user || '');

    await reinitDb();

    return { ok: isDbConnected() };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('dbSettings:setupDatabase', async (_event, config) => {
  try {
    return await runTrackedOperation('dbSettings:setupDatabase', async () => {
      setSetting(SETTINGS_KEYS.MYSQL_HOST, config.host || '');
      setSetting(SETTINGS_KEYS.MYSQL_PORT, Number(config.port) || '');
      setSetting(SETTINGS_KEYS.MYSQL_DATABASE, config.database || '');
      setSetting(SETTINGS_KEYS.MYSQL_USER, config.user || '');

      await reinitDb();

      return { ok: isDbConnected() };
    });
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('dbSettings:migrateSchema', async () => {
  try {
    return await runTrackedOperation('dbSettings:migrateSchema', async () => {
      const migrationsFolder = app.isPackaged
        ? join(process.resourcesPath, 'drizzle')
        : join(__dirname, '../../drizzle');

      await runMigrations(migrationsFolder);

      return { ok: true };
    });
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('dbSettings:getHealth', async () => {
  try {
    const migrationsFolder = getMigrationsFolder();

    return await getDatabaseHealth(migrationsFolder);
  } catch (err) {
    return {
      ok: false,
      connected: false,
      schemaValid: false,
      migrationsValid: false,
      requiredTablesMissing: [],
      expectedMigrations: 0,
      appliedMigrations: 0,
      pendingMigrations: 0,
      message: err?.message || 'Failed to inspect database health.'
    };
  }
});
