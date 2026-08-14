/**
 * 관리자 구글 계정 OAuth2 1회 토큰 발급 Helper 스크립트
 */

import { google } from 'googleapis';
import fs from 'fs';
import readline from 'readline';

const secretContent = JSON.parse(fs.readFileSync('./client_secret_576658499518-s81nlbs28n7vs1ab373n7dpqveu6c8ba.apps.googleusercontent.com.json'));
const credentials = secretContent.web || secretContent.installed;

const { client_id, client_secret, redirect_uris } = credentials;
const redirectUri = (redirect_uris && redirect_uris[0]) || 'http://localhost:5000/oauth2callback';

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  'https://developers.google.com/oauthplayground' // 간편 인증 리다이렉트 주소 또는 직접 코드 입력
);

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets'
];

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent'
});

console.log('----------------------------------------------------');
console.log('🔑 아래 URL을 브라우저에 복사하여 이동한 뒤 [허용]을 누르고,');
console.log('발급받은 Authorization Code를 여기에 입력해 주세요:');
console.log('----------------------------------------------------');
console.log(authUrl);
console.log('----------------------------------------------------');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Authorization Code 입력: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oAuth2Client.getToken(code.trim());
    fs.writeFileSync('./tokens.json', JSON.stringify(tokens, null, 2));
    console.log('🎉 [성공] tokens.json 파일이 정상 발급되었습니다! 이제 GAS 없이 100% 독립 백엔드가 활성화됩니다.');
  } catch (err) {
    console.error('❌ 토큰 발급 중 에러 발생:', err.message);
  }
});
