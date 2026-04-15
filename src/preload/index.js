import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

// APIs for renderer
const api = {
  events: {
    list: (offset, limit) => ipcRenderer.invoke('events:list', offset, limit),
    findByName: (name) => ipcRenderer.invoke('events:findByName', name),
    listWithSurveyCountsAndTags: () => ipcRenderer.invoke('events:listWithSurveyCountsAndTags'),
    create: (data) => ipcRenderer.invoke('events:create', data),
    update: (id, data) => ipcRenderer.invoke('events:update', id, data),
    delete: (id) => ipcRenderer.invoke('events:delete', id)
  },
  eventTags: {
    list: (offset, limit) => ipcRenderer.invoke('eventTags:list', offset, limit),
    findBySlug: (slug) => ipcRenderer.invoke('eventTags:findBySlug', slug),
    create: (data) => ipcRenderer.invoke('eventTags:create', data),
    delete: (id) => ipcRenderer.invoke('eventTags:delete', id),
    listForEvent: (eventId, offset, limit) =>
      ipcRenderer.invoke('eventTags:listForEvent', eventId, offset, limit),
    addToEvent: (eventId, tagId) => ipcRenderer.invoke('eventTags:addToEvent', eventId, tagId),
    removeFromEvent: (eventId, tagId) =>
      ipcRenderer.invoke('eventTags:removeFromEvent', eventId, tagId)
  },
  forms: {
    list: (offset, limit) => ipcRenderer.invoke('forms:list', offset, limit),
    findById: (id) => ipcRenderer.invoke('forms:findById', id),
    listWithEventNameAndResponseCount: (offset, limit) =>
      ipcRenderer.invoke('forms:listWithEventNameAndResponseCount', offset, limit),
    listByEvent: (eventId, offset, limit) =>
      ipcRenderer.invoke('forms:listByEvent', eventId, offset, limit),
    create: (data) => ipcRenderer.invoke('forms:create', data),
    delete: (id) => ipcRenderer.invoke('forms:delete', id),
    update: (id, data) => ipcRenderer.invoke('forms:update', id, data),
    refreshSchemaAndResponses: (id) => ipcRenderer.invoke('forms:refreshSchemaAndResponses', id)
  },
  questions: {
    listByForm: (formId, offset, limit) =>
      ipcRenderer.invoke('questions:listByForm', formId, offset, limit),
    listChoicesByQuestion: (questionId, offset, limit) =>
      ipcRenderer.invoke('questions:listChoicesByQuestion', questionId, offset, limit),
    create: (formId) => ipcRenderer.invoke('questions:create', formId),
    delete: (id) => ipcRenderer.invoke('questions:delete', id)
  },
  submissions: {
    countAll: () => ipcRenderer.invoke('submissions:countAll'),
    listByForm: (formId, offset, limit) =>
      ipcRenderer.invoke('submissions:listByForm', formId, offset, limit),
    create: (data) => ipcRenderer.invoke('submissions:create', data),
    delete: (id) => ipcRenderer.invoke('submissions:delete', id)
  },
  responses: {
    listBySubmission: (submissionId, offset, limit) =>
      ipcRenderer.invoke('responses:listBySubmission', submissionId, offset, limit),
    upsert: (data) => ipcRenderer.invoke('responses:upsert', data),
    delete: (id) => ipcRenderer.invoke('responses:delete', id)
  },
  statistics: {
    listConfigurableMetrics: () => ipcRenderer.invoke('statistics:listConfigurableMetrics'),
    listSelectableSurveyQuestions: (metricName) =>
      ipcRenderer.invoke('statistics:listSelectableSurveyQuestions', metricName),
    setMetricQuestion: (metricName, questionId) =>
      ipcRenderer.invoke('statistics:setMetricQuestion', metricName, questionId),
    getDashboardOverviewData: (filters) =>
      ipcRenderer.invoke('statistics:getDashboardOverviewData', filters)
  },
  clients: {
    list: (offset, limit) => ipcRenderer.invoke('clients:list', offset, limit),
    create: (data) => ipcRenderer.invoke('clients:create', data),
    update: (id, data) => ipcRenderer.invoke('clients:update', id, data),
    delete: (id) => ipcRenderer.invoke('clients:delete', id),
    getTotalAppointments: () => ipcRenderer.invoke('clients:getTotalAppointments'),
    setTotalAppointments: (value) => ipcRenderer.invoke('clients:setTotalAppointments', value),
    adjustTotalAppointments: (delta) => ipcRenderer.invoke('clients:adjustTotalAppointments', delta)
  },
  charts: {
    list: (offset, limit) => ipcRenderer.invoke('charts:list', offset, limit),
    findById: (id) => ipcRenderer.invoke('charts:findById', id),
    create: (data) => ipcRenderer.invoke('charts:create', data),
    update: (id, data) => ipcRenderer.invoke('charts:update', id, data),
    delete: (id) => ipcRenderer.invoke('charts:delete', id),
    reorder: (chartIds) => ipcRenderer.invoke('charts:reorder', chartIds),
    parseConfiguration: (chart) => ipcRenderer.invoke('charts:parseConfiguration', chart)
  },
  googleForms: {
    list: (pageToken) => ipcRenderer.invoke('googleForms:list', pageToken),
    create: (title, document_title) =>
      ipcRenderer.invoke('googleForms:create', title, document_title),
    openInBrowserById: (formId) => ipcRenderer.invoke('googleForms:openInBrowserById', formId),
    openInBrowserByBaseLink: (baseLink) =>
      ipcRenderer.invoke('googleForms:openInBrowserByBaseLink', baseLink),
    listReferenceQuestions: (formId) =>
      ipcRenderer.invoke('googleForms:listReferenceQuestions', formId),
    importSelected: (payload) => ipcRenderer.invoke('googleForms:importSelected', payload)
  },
  surveys: {
    parseExcelImport: (buffer) => ipcRenderer.invoke('surveys:parseExcelImport', buffer),
    commitExcelImport: (payload) => ipcRenderer.invoke('surveys:commitExcelImport', payload)
  },
  googleAuth: {
    isUserAuthenticated: () => ipcRenderer.invoke('googleAuth:isUserAuthenticated'),
    ensureAuthenticated: () => ipcRenderer.invoke('googleAuth:ensureAuthenticated'),
    getUserProfile: () => ipcRenderer.invoke('googleAuth:getUserProfile'),
    signOut: () => ipcRenderer.invoke('googleAuth:signOut'),
    cancelOAuthFlow: () => ipcRenderer.invoke('googleAuth:cancelOAuthFlow'),
    getSettings: () => ipcRenderer.invoke('googleAuth:getSettings'),
    selectCredentialFile: () => ipcRenderer.invoke('googleAuth:selectCredentialFile'),
    processCredentialFile: (sourceFilePath) =>
      ipcRenderer.invoke('googleAuth:processCredentialFile', sourceFilePath)
  },
  startup: {
    getReadiness: () => ipcRenderer.invoke('startup:getReadiness')
  },
  dbSettings: {
    get: () => ipcRenderer.invoke('dbSettings:get'),
    isConnected: () => ipcRenderer.invoke('dbSettings:isConnected'),
    testConnection: (config) => ipcRenderer.invoke('dbSettings:testConnection', config),
    saveAndConnect: (config) => ipcRenderer.invoke('dbSettings:saveAndConnect', config),
    setupDatabase: (config) => ipcRenderer.invoke('dbSettings:setupDatabase', config),
    migrateSchema: () => ipcRenderer.invoke('dbSettings:migrateSchema'),
    getHealth: () => ipcRenderer.invoke('dbSettings:getHealth')
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximizeToggle: () => ipcRenderer.send('window:maximize-toggle'),
    close: () => ipcRenderer.send('window:close')
  }
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}
