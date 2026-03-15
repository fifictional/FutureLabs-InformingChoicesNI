import { drive } from '@googleapis/drive';
import { getGoogleAuthClient } from './google-auth-client';

export async function getGoogleDriveService() {
  const authClient = await getGoogleAuthClient();
  if (!authClient) {
    throw new Error('Failed to obtain Google authentication client');
  }

  /// I am not sure if this is necessary
  /// might remove later after testing if the forms API calls work without it
  await authClient.getAccessToken();

  return new drive({ version: 'v3', auth: authClient });
}

export async function listGoogleForms(pageToken) {
  const driveService = await getGoogleDriveService();

  const response = await driveService.files.list({
    corpora: 'allDrives',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    q: "mimeType='application/vnd.google-apps.form' and trashed=false",
    fields: 'files(id,name,createdTime,modifiedTime,webViewLink),nextPageToken',
    orderBy: 'modifiedTime desc',
    pageSize: 100,
    pageToken
  });

  return (
    {
      files: response.data.files,
      nextPageToken: response.data.nextPageToken
    } ?? {
      files: [],
      nextPageToken: null
    }
  );
}
