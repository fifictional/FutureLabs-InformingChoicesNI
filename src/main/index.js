import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from '../db/client.js'
import * as eventService from '../db/services/eventService.js'
import * as eventTagService from '../db/services/eventTagService.js'
import * as formService from '../db/services/formService'
import * as questionService from '../db/services/questionService'
import * as submissionService from '../db/services/submissionService'
import * as responseService from '../db/services/responseService'

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    },
    contextIsolation: true,
    nodeIntegration: false
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  const migrationsFolder = app.isPackaged
    ? join(process.resourcesPath, 'drizzle')
    : join(__dirname, '../../drizzle')

  // Skip migration in fresh projects until the first migration set is generated.
  if (existsSync(migrationsFolder)) {
    migrate(db, { migrationsFolder })
  }

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Register IPC handlers, which are wired to the service layer

ipcMain.handle('events:list', () => eventService.listEvents())
ipcMain.handle('events:create', (_event, data) => eventService.createEvent(data))
ipcMain.handle('events:update', (_event, id, data) => eventService.updateEvent(id, data))
ipcMain.handle('events:delete', (_event, id) => eventService.deleteEvent(id))

ipcMain.handle('eventTags:list', () => eventTagService.listEventTags())
ipcMain.handle('eventTags:create', (_event, data) => eventTagService.createEventTag(data))
ipcMain.handle('eventTags:delete', (_event, id) => eventTagService.deleteEventTag(id))
ipcMain.handle('eventTags:listForEvent', (_event, eventId) =>
  eventTagService.listEventTagsForEvent(eventId)
)
ipcMain.handle('eventTags:addToEvent', (_event, eventId, tagId) =>
  eventTagService.addTagToEvent(eventId, tagId)
)
ipcMain.handle('eventTags:removeFromEvent', (_event, eventId, tagId) =>
  eventTagService.removeTagFromEvent(eventId, tagId)
)

ipcMain.handle('forms:list', () => formService.listForms())
ipcMain.handle('forms:listByEvent', (_event, eventId) => formService.listFormsByEvent(eventId))
ipcMain.handle('forms:create', (_event, data) => formService.createForm(data))
ipcMain.handle('forms:delete', (_event, id) => formService.deleteForm(id))

ipcMain.handle('questions:listByForm', (_event, formId) =>
  questionService.listQuestionsByForm(formId)
)
ipcMain.handle('questions:create', (_event, formId) => questionService.createQuestion(formId))
ipcMain.handle('questions:delete', (_event, id) => questionService.deleteQuestion(id))

ipcMain.handle('submissions:listByForm', (_event, formId) =>
  submissionService.listSubmissionsByForm(formId)
)
ipcMain.handle('submissions:create', (_event, data) => submissionService.createSubmission(data))
ipcMain.handle('submissions:delete', (_event, id) => submissionService.deleteSubmission(id))

ipcMain.handle('responses:listBySubmission', (_event, submissionId) =>
  responseService.listResponsesBySubmission(submissionId)
)
ipcMain.handle('responses:upsert', (_event, data) => responseService.upsertResponse(data))
ipcMain.handle('responses:delete', (_event, id) => responseService.deleteResponse(id))
