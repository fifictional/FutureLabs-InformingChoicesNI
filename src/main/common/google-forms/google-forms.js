import { forms } from '@googleapis/forms';
import { getGoogleAuthClient } from './google-auth-client';
import { shell } from 'electron';

async function getGoogleFormsService() {
  const authClient = await getGoogleAuthClient();
  if (!authClient) {
    throw new Error('Failed to obtain Google authentication client');
  }

  /// I am not sure if this is necessary
  /// might remove later after testing if the forms API calls work without it
  await authClient.getAccessToken();

  return new forms({ version: 'v1', auth: authClient });
}

export async function getGoogleFormById(formId) {
  const formsService = await getGoogleFormsService();
  return await formsService.forms.get({ formId });
}

export async function createGoogleForm(title, document_title) {
  const formsService = await getGoogleFormsService();
  if (!document_title) {
    document_title = title;
  }

  const requestBody = {
    info: {
      title,
      document_title
    }
  };

  const response = await formsService.forms.create({ requestBody });
  return response.data;
}

export async function batchUpdateGoogleFormById(formId, requests) {
  const formsService = await getGoogleFormsService();
  const requestBody = {
    includeFormInResponse: true,
    requests
  };

  const response = await formsService.forms.batchUpdate({ formId, requestBody });
  return response.data;
}

export async function setPublishSettingsOfGoogleFormById(
  formId,
  isPublished,
  isAcceptingResponses
) {
  const formsService = await getGoogleFormsService();
  const requestBody = {
    publishSettings: {
      isPublished,
      isAcceptingResponses: !isPublished ? false : isAcceptingResponses
    }
  };

  const response = await formsService.forms.setPublishSettings({ formId, requestBody });
  return response.data;
}

export async function getGoogleFormResponsesById(formId) {
  const formsService = await getGoogleFormsService();
  const response = await formsService.forms.responses.list({ formId });
  return response.data;
}

export async function getGoogleFormResponseById(formId, responseId) {
  const formsService = await getGoogleFormsService();
  const response = await formsService.forms.responses.get({ formId, responseId });
  return response.data;
}

export async function openGoogleFormInBrowserById(formId) {
  if (formId) {
    const newLink = `https://docs.google.com/forms/d/${formId}/edit`;
    shell.openExternal(newLink);
  } else {
    throw new Error('Form not found or does not have a responder URI');
  }
}

export async function openGoogleFormInBrowserByBaseLink(baseLink) {
  if (baseLink) {
    shell.openExternal(baseLink);
  } else {
    throw new Error('Form not found or does not have a responder URI');
  }
}
