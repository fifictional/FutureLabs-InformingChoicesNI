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

async function fetchThumbnailForFile(client, thumbnailLink) {
  try {
    const response = await client.request({
      url: thumbnailLink,
      responseType: 'arraybuffer'
    });

    return {
      mimeType: response.headers['content-type'] || 'image/png',
      bytes: Buffer.from(response.data)
    };
  } catch (error) {
    console.error('Error fetching thumbnail:', error?.response?.data || error.message);
    return null;
  }
}

export async function listGoogleForms(pageToken) {
  const driveService = await getGoogleDriveService();
  const response = await driveService.files.list({
    corpora: 'allDrives',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    q: "mimeType='application/vnd.google-apps.form' and trashed=false",
    fields:
      'files(id,name,createdTime,modifiedTime,webViewLink,thumbnailLink,hasThumbnail,iconLink),nextPageToken',
    orderBy: 'modifiedTime desc',
    pageSize: 100,
    pageToken
  });

  if (response.data.files) {
    for (const file of response.data.files) {
      if (file.thumbnailLink) {
        const thumbnail = await fetchThumbnailForFile(file.thumbnailLink);
        const base64 = thumbnail.bytes.toString('base64');
        file.thumbnailBase64 = `data:${thumbnail.mimeType};base64,${base64}`;
      }
    }
  }

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
