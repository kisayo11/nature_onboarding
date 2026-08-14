import { google } from 'googleapis';
import fs from 'fs';

async function grantTemplatePermissions() {
  const secretContent = JSON.parse(fs.readFileSync('./client_secret_desktop.json'));
  const credentials = secretContent.installed || secretContent.web;
  const { client_id, client_secret } = credentials;
  const tokens = JSON.parse(fs.readFileSync('./tokens.json'));

  const auth = new google.auth.OAuth2(client_id, client_secret, 'http://localhost');
  auth.setCredentials(tokens);

  const drive = google.drive({ version: 'v3', auth });

  const templates = [
    "1gM51m_3k4wN8Kj8ZylCgtY6Ccl-d3d6J2KvdhR2yEfs",
    "1bJ-3zXFmGStcZlS66T0JzX812-788K3dO-Ovw6xKz0E",
    "1A8Vf9bXw-xQ00639e_d1K5p6oB6lKjX21fH99Z3N-78",
    "15i27qV05mD7T3q1b8Z2Wp9z33s69XyH1v1Y8M8f-4K0"
  ];

  for (const fileId of templates) {
    try {
      await drive.permissions.create({
        fileId,
        supportsAllDrives: true,
        requestBody: {
          role: 'writer',
          type: 'user',
          emailAddress: 'server@nature-onoffboardingprocess.iam.gserviceaccount.com'
        }
      });
      console.log(`✅ [권한 부여 성공] ${fileId}`);
    } catch (err) {
      console.warn(`⚠️ 권한 부여 경고 (${fileId}):`, err.message);
    }
  }
}

grantTemplatePermissions();
