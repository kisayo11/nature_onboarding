import { google } from 'googleapis';
import fs from 'fs';

async function checkFile() {
  const secretContent = JSON.parse(fs.readFileSync('./client_secret_desktop.json'));
  const credentials = secretContent.installed || secretContent.web;
  const { client_id, client_secret } = credentials;
  const tokens = JSON.parse(fs.readFileSync('./tokens.json'));

  const auth = new google.auth.OAuth2(client_id, client_secret, 'http://localhost');
  auth.setCredentials(tokens);

  const drive = google.drive({ version: 'v3', auth });
  const fileId = "1PkWexuSfpWC6FHnu67cAEhft4lI5bu8X";

  try {
    const fileRes = await drive.files.get({
      fileId,
      supportsAllDrives: true,
      fields: 'id, name, mimeType, size, permissions'
    });
    console.log("📄 [파일 상태 조사]:", JSON.stringify(fileRes.data, null, 2));
  } catch (err) {
    console.error("❌ 파일 상태 에러:", err.message);
  }
}

checkFile();
