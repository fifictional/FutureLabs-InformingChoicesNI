import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { findEventByName } from '../main/db/services/eventService';

// APIs for renderer
const api = {
  events: {
    list: () => ipcRenderer.invoke('events:list'),
    findByName: (name) => ipcRenderer.invoke('events:findByName', name),
    listWithSurveyCountsAndTags: () => ipcRenderer.invoke('events:listWithSurveyCountsAndTags'),
    create: (data) => ipcRenderer.invoke('events:create', data),
    update: (id, data) => ipcRenderer.invoke('events:update', id, data),
    delete: (id) => ipcRenderer.invoke('events:delete', id)
  },
  eventTags: {
    list: () => ipcRenderer.invoke('eventTags:list'),
    findBySlug: (slug) => ipcRenderer.invoke('eventTags:findBySlug', slug),
    create: (data) => ipcRenderer.invoke('eventTags:create', data),
    delete: (id) => ipcRenderer.invoke('eventTags:delete', id),
    listForEvent: (eventId) => ipcRenderer.invoke('eventTags:listForEvent', eventId),
    addToEvent: (eventId, tagId) => ipcRenderer.invoke('eventTags:addToEvent', eventId, tagId),
    removeFromEvent: (eventId, tagId) =>
      ipcRenderer.invoke('eventTags:removeFromEvent', eventId, tagId)
  },
  forms: {
    list: () => ipcRenderer.invoke('forms:list'),
    findById: (id) => ipcRenderer.invoke('forms:findById', id),
    listWithEventNameAndResponseCount: () =>
      ipcRenderer.invoke('forms:listWithEventNameAndResponseCount'),
    listByEvent: (eventId) => ipcRenderer.invoke('forms:listByEvent', eventId),
    create: (data) => ipcRenderer.invoke('forms:create', data),
    delete: (id) => ipcRenderer.invoke('forms:delete', id),
    update: (id, data) => ipcRenderer.invoke('forms:update', id, data)
  },
  questions: {
    listByForm: (formId) => ipcRenderer.invoke('questions:listByForm', formId),
    create: (formId) => ipcRenderer.invoke('questions:create', formId),
    delete: (id) => ipcRenderer.invoke('questions:delete', id)
  },
  submissions: {
    listByForm: (formId) => ipcRenderer.invoke('submissions:listByForm', formId),
    create: (data) => ipcRenderer.invoke('submissions:create', data),
    delete: (id) => ipcRenderer.invoke('submissions:delete', id)
  },
  responses: {
    listBySubmission: (submissionId) =>
      ipcRenderer.invoke('responses:listBySubmission', submissionId),
    upsert: (data) => ipcRenderer.invoke('responses:upsert', data),
    delete: (id) => ipcRenderer.invoke('responses:delete', id)
  },
  googleForms: {
    list: (pageToken) => ipcRenderer.invoke('googleForms:list', pageToken),
    create: (title, document_title) =>
      ipcRenderer.invoke('googleForms:create', title, document_title),
    openInBrowser: (formId) => ipcRenderer.invoke('googleForms:openInBrowser', formId)
  },
  surveys: {
    parseExcelImport: (buffer) => ipcRenderer.invoke('surveys:parseExcelImport', buffer),
    commitExcelImport: (payload) => ipcRenderer.invoke('surveys:commitExcelImport', payload)
  },
  googleAuth: {
    isUserAuthenticated: () => ipcRenderer.invoke('googleAuth:isUserAuthenticated'),
    ensureAuthenticated: () => ipcRenderer.invoke('googleAuth:ensureAuthenticated'),
    getUserProfile: () => ipcRenderer.invoke('googleAuth:getUserProfile')
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
