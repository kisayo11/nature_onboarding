/**
 * 네이처요양병원 온보딩/오프보딩 백엔드 서비스 (Express Node.js)
 * GAS(Google Apps Script) 의존성을 완전 탈피하고 Google APIs를 직접 연동하는 API 서버
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { google } from 'googleapis';
import { GoogleDriveService } from './services/googleDriveService.js';
import { GoogleDocsService } from './services/googleDocsService.js';
import { GoogleSheetsService } from './services/googleSheetsService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// GCP Service Account 인증 초기화
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || "1Ed3IXDyNIICR2bLHJX_RbIrVPjSQBhuS5mHoFvR5obY";

const DOCS_FOLDER_ID = process.env.DOCS_FOLDER_ID || "1fOCZbxN4xAy9bcgTweHk0sd2wvlT4G9J";
const SIGNATURE_FOLDER_ID = process.env.SIGNATURE_FOLDER_ID || "1fOCZbxN4xAy9bcgTweHk0sd2wvlT4G9J";


// 템플릿 문서 ID
const TEMPLATE_SAFETY_ID = "1uQvHrouIG94qp-txtvDrwu1n1F_cu_52QaYg7b9emVU";
const TEMPLATE_PRIVACY_ID = "13b98fzAIaf1UtNVmlqqBFyLWQPMDmlnheIKp4jDBoUk";
const TEMPLATE_RESIGNATION_ID = "1RZL9NZKAOHarK2mlo0BI9dqljcN7jasJVZ-gtNUzSDk";
const TEMPLATE_SECURITY_OFF_ID = "1HHaNxruT-k21ftyt1IAJzf6sq0q0n6yaODCX19stLjs";

let driveService, docsService, sheetsService;

function initGoogleServices() {
  try {
    let auth;
    const desktopSecretPath = './client_secret_desktop.json';
    const webSecretPath = './client_secret_576658499518-s81nlbs28n7vs1ab373n7dpqveu6c8ba.apps.googleusercontent.com.json';
    const secretPath = fs.existsSync(desktopSecretPath) ? desktopSecretPath : webSecretPath;

    if (fs.existsSync('./tokens.json') && fs.existsSync(secretPath)) {
      const secretContent = JSON.parse(fs.readFileSync(secretPath));
      const credentials = secretContent.installed || secretContent.web;
      const { client_id, client_secret } = credentials;
      const tokens = JSON.parse(fs.readFileSync('./tokens.json'));

      const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost');
      oAuth2Client.setCredentials(tokens);
      auth = oAuth2Client;
      console.log("✅ Google User OAuth2 Credentials loaded successfully.");
    } else {
      // GCP Service Account 키 인증 (자동 파일 탐색 및 환경변수 지원)
      const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
        (fs.existsSync('./nature-onoffboardingprocess-67274c8213f6.json') 
          ? './nature-onoffboardingprocess-67274c8213f6.json' 
          : './service-account.json');

      auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/documents',
          'https://www.googleapis.com/auth/spreadsheets'
        ],
      });
      console.log("✅ Google Service Account Credentials loaded successfully.");
    }

    driveService = new GoogleDriveService(auth);
    docsService = new GoogleDocsService(auth, driveService);
    sheetsService = new GoogleSheetsService(auth, SPREADSHEET_ID);
  } catch (err) {
    console.warn("⚠️ Google Cloud Auth Pending (Service account key missing or environment setup required):", err.message);
  }
}



initGoogleServices();

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Nature Hospital Onboarding Server Active' });
});

// 서류 제출 및 실시간 문서 제작 API
app.post('/api/submit', async (req, res) => {
  try {
    const data = req.body;
    const isOffboarding = data.docType?.includes("사직원") || data.docType?.includes("보안서약");

    if (!driveService || !docsService || !sheetsService) {
      // GCP 인증 키 미설정 시 개발용 폴백 응답
      return res.json({
        result: "success",
        message: "서버 수신 완료 (GCP Credentials 세팅 대기 중)",
        docUrl1: "https://drive.google.com/",
        docUrl2: "https://drive.google.com/"
      });
    }

    // 1. 연도별 서명 보관 폴더 가져오기 & 서명 저장
    const sigFolderId = await driveService.getSignatureFolder(SIGNATURE_FOLDER_ID);
    const sigFileName = `[서명] ${data.name}_${data.birth || 'birth'}.png`;
    const sigUploadResult = await driveService.uploadSignatureBlob(data.signature, sigFileName, sigFolderId);

    // 2. 연도별/유형별 최종 문서 보관 폴더 세팅 (02_서류보관 및 03_원본서류)
    const destFolderId = await driveService.getDocumentDestinationFolder(DOCS_FOLDER_ID, isOffboarding);
    const docsDestFolderId = await driveService.getDocsDestinationFolder(DOCS_FOLDER_ID);


    // 3. 실시간 문서 자동 제작 & PDF 변환 (Docs 원본 보관 포함)
    let docUrl1 = "", docUrl2 = "";

    if (!isOffboarding) {
      docUrl1 = await docsService.generateDocAndConvertToPdf({
        templateId: TEMPLATE_SAFETY_ID,
        docLabel: "안전보건교육",
        name: data.name, dept: data.dept, job: data.job, birth: data.birth, phone: data.phone,
        signatureUrl: sigUploadResult.url, timestamp: new Date(), destFolderId, docsDestFolderId
      });

      docUrl2 = await docsService.generateDocAndConvertToPdf({
        templateId: TEMPLATE_PRIVACY_ID,
        docLabel: "개인정보서약_입사",
        name: data.name, dept: data.dept, job: data.job, birth: data.birth, phone: data.phone,
        signatureUrl: sigUploadResult.url, timestamp: new Date(), destFolderId, docsDestFolderId
      });
    } else {
      docUrl1 = await docsService.generateDocAndConvertToPdf({
        templateId: TEMPLATE_RESIGNATION_ID,
        docLabel: "사직원",
        name: data.name, dept: data.dept, job: data.job, birth: data.birth,
        resignDate: data.resignDate, resignReason: data.resignReason,
        signatureUrl: sigUploadResult.url, timestamp: new Date(), destFolderId, docsDestFolderId
      });

      docUrl2 = await docsService.generateDocAndConvertToPdf({
        templateId: TEMPLATE_SECURITY_OFF_ID,
        docLabel: "보안서약_퇴사",
        name: data.name, dept: data.dept, job: data.job, birth: data.birth,
        resignDate: data.resignDate, resignReason: data.resignReason,
        signatureUrl: sigUploadResult.url, timestamp: new Date(), destFolderId, docsDestFolderId
      });
    }


    // 4. 구글 시트 DB 기록 (서류내역 텍스트 마스터 시트 표준 '신규안전+개인정보' / '사직원+보안서약' 통일)
    const formattedDocType = isOffboarding ? "사직원+보안서약" : "신규안전+개인정보";

    await sheetsService.saveRecord({
      isOffboarding,
      data: {
        ...data,
        docType: formattedDocType
      },
      docUrl1,
      docUrl2,
      signatureUrl: sigUploadResult.url
    });


    return res.json({
      result: "success",
      docUrl1,
      docUrl2
    });

  } catch (err) {
    console.error("Submit API Processing Error:", err);
    res.status(500).json({ result: "error", message: err.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Nature Onboarding Backend Server running on port ${PORT}`);
});
