/**
 * 순수 브라우저 전용 Google REST API 연동 서비스 (Serverless 100% / GAS 0% / 백엔드 0%)
 * - jsrsasign 기반 Service Account JWT 서명으로 Access Token 실시간 생성
 * - 구글 드라이브 연도별 폴더 탐색/생성 (01_서명보관, 02_서류보관, 03_원본서류)
 * - 구글 독스 템플릿 복사 & 태그 치환 & PDF 변환
 * - 마스터 구글 시트 데이터 Upsert
 */

import { KJUR } from 'jsrsasign';

const SA_CLIENT_EMAIL = "server@nature-onoffboardingprocess.iam.gserviceaccount.com";
const SA_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDoLxLNagsrChuV\nZILm7UHkFCLNmK72UTXpEZLCRSbnZAAqRGqXUHIBKBO9175ALo3tKJD0hALkVB/A\n23g3sLj2Xyvd5N8f8C6TEGDzzJktPceusgPN5UD9POQfPZ8k/BBtGCYD/sL4mH96\ngiY2xB2ALz64xBwkLNe9aP+q15btRQdlhK4f4KnOrH7oVe7Ut9MG13sKjliOoue8\n5mLV/jejG4x91HjNcb0CwPtnicqQ7AEfE7A3upbxtImQZmafvTlcHUNtVlXYtcPD\nECgB9zYSZQZCviE4noTKxKDG5GhsfniTKoA3uCqlbOEfUTw7NmqtN3Ecw73gZtQ4\nOkhbJ0/DAgMBAAECggEAA7Cfj6yQfyO+DOGNUJ8kQe9YQS9HaAT/2gBRsgjS6Nsq\n3LRNPzrF/qccVXlweXXZR3GqEOJX7443gJJE3ysJfgOJDngvBofIDBs23RoY+JEo\n2dig8FDPzSEpNI0Y46WmI9jou+Prmsi82iySZ00UDvHtAQ6U0HHUqgm/v39jXA5W\n1meegz0oreW6W5mss0aQdUrWJXYSZuXyF7JVWY59cI145e4uVffcKzsnjsrgEyiS\nZNVp4FkTxrWtx62zD/yRwpD3oZAHkzFJbRHpjiohzqflf61dbY0GRUus12KNKp73\nDRTpWAkMp+SqB4hgWHSGznVOuTKwGPPieCS5voESkQKBgQD2vl3O0pRa7sKyQ/fN\nAg478ZK5qgvcUeeIvYVkUhEo83KDn3sch1v97kmUPqrslKDY2kps+20eMyRrlIIe\nvE8jeVHfQY1dYhfUERcsRF78yGpq8xtm4ebSVvfyJvQD0/a/G1Jk8Of2BXwXzqiB\nzE4E4wq6SMHjtfLSf4PxYnCzSwKBgQDw5OF29Rcr9Vxj4xG/iPEhunMvH5mS/Q1R\n+gOlx2Tn/PVyaScSVfbO/B5+p2mK4iFA3OWAahBi9D8l07W53YXwvPGvrdOapcLM\n6wtL+xYoag3F8BKaSrXGTJWj7R6MUo/d9wJs8QzT/mB+N+X10zje9/qC/Ufx4gfv\nXLjTROeSaQKBgERK3jXvTMZ6TQMAEub4Ca6Hpz+iFBRPyxCqu+/PUxaNgwVxL6bu\nxARdXpocWjyOypIaoPzW/hWcvBjWisks/45m9sUfJJxTGRtF+67x4YR/iAy/6rao\nEbXoAkpQg7tHgITWcBCmKN2MGRORzEvYm0N4/7AdkSSQaHvgdUlrIJxPAoGBAJIZ\n/zTqyTb8BSD/4w/LupO+RYXbIIWpvJ5viC7PlD+viB3v8KaKRLqc5tHiL3zwUULJ\nttf/fBjIElSa5qjn1giAUAVA5AnzZwZpt9xJWNMCH4BhbqbtkPnIESnu8owgtujk\nmy//sswQh+2FcY96oA97TxCLFUt6z105W0+nhtuhAoGBAOd0m7WVLGW+wdERXiue\n/RsPMXrxM3J9DvAMYPjnwcjwr/k+JUStibdtBFJDUOzfF+gySubtPjALKya/TbMp\n1xJIQ1KY6nAsa4CAlDYz+wAdg2tFmkKDwiYZ8MUWPfG+bTl/6dtx4pup/Cvvyw+a\n4orbxX7/wIPCKk1WW1TMOl9g\n-----END PRIVATE KEY-----\n`;

const SPREADSHEET_ID = "1Ed3IXDyNIICR2bLHJX_RbIrVPjSQBhuS5mHoFvR5obY";
const SHARED_DRIVE_ROOT_ID = "1fOCZbxN4xAy9bcgTweHk0sd2wvlT4G9J";

const TEMPLATE_SAFETY_ID = "1uQvHrouIG94qp-txtvDrwu1n1F_cu_52QaYg7b9emVU";
const TEMPLATE_PRIVACY_ID = "13b98fzAIaf1UtNVmlqqBFyLWQPMDmlnheIKp4jDBoUk";
const TEMPLATE_RESIGNATION_ID = "1RZL9NZKAOHarK2mlo0BI9dqljcN7jasJVZ-gtNUzSDk";
const TEMPLATE_SECURITY_OFF_ID = "1HHaNxruT-k21ftyt1IAJzf6sq0q0n6yaODCX19stLjs";


let cachedAccessToken = null;
let tokenExpiryTime = 0;

// 1. Service Account JWT 생성 및 Access Token 획득
async function getAccessToken() {
  if (cachedAccessToken && Date.now() < tokenExpiryTime) {
    return cachedAccessToken;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: SA_CLIENT_EMAIL,
    sub: SA_CLIENT_EMAIL,
    scope: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/spreadsheets'
    ].join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const jwt = KJUR.jws.JWS.sign(null, JSON.stringify(header), JSON.stringify(payload), SA_PRIVATE_KEY);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Token fetch failed: ${JSON.stringify(data)}`);

  cachedAccessToken = data.access_token;
  tokenExpiryTime = Date.now() + (data.expires_in - 100) * 1000;
  return cachedAccessToken;
}

// 2. 구글 드라이브 폴더 생성 및 탐색 헬퍼
async function getOrCreateFolder(token, folderName, parentFolderId) {
  const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentFolderId}' in parents and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&supportsAllDrives=true&includeItemsFromAllDrives=true`;

  const searchRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const searchData = await searchRes.json();

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    })
  });

  const createData = await createRes.json();
  return createData.id;
}

// 3. 서명 이미지 업로드
async function uploadSignature(token, base64Data, filename, parentFolderId) {
  const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const byteCharacters = atob(base64Content);
  const byteArray = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }

  const metadata = {
    name: filename,
    parents: [parentFolderId],
    mimeType: 'image/png'
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([byteArray], { type: 'image/png' }));

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });

  const fileData = await res.json();
  return {
    id: fileData.id,
    url: `https://drive.google.com/uc?id=${fileData.id}`
  };
}

// 4. Docs 복사 & 치환 후 온전한 PDF 파일 생성 및 반환
async function generateDocAndConvertToPdf(token, { templateId, docLabel, name, dept, job, birth, phone, resignDate, resignReason, destFolderId, docsDestFolderId }) {
  const dateStr = new Date().toLocaleDateString('ko-KR');
  const fileName = `${name}_${dept}_${docLabel}_${dateStr.replace(/\. /g, '.').replace(/\.$/, '')}`;
  const targetDocsFolder = docsDestFolderId || destFolderId;

  // [1단계] 템플릿 Google Docs 복사본 생성 (03_원본서류 폴더에 저장)
  const copyRes = await fetch(`https://www.googleapis.com/drive/v3/files/${templateId}/copy?supportsAllDrives=true&includeItemsFromAllDrives=true`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: fileName,
      parents: [targetDocsFolder]
    })
  });

  const copyData = await copyRes.json();
  if (!copyRes.ok) {
    throw new Error(`Google Docs 복사 실패: ${JSON.stringify(copyData)}`);
  }
  const tempDocId = copyData.id;

  // [2단계] 생성된 Google Docs 문서 태그 치환
  const requests = [
    { replaceAllText: { containsText: { text: '{{이름}}', matchCase: true }, replaceText: name || '' } },
    { replaceAllText: { containsText: { text: '{{성명}}', matchCase: true }, replaceText: name || '' } },
    { replaceAllText: { containsText: { text: '{{소속}}', matchCase: true }, replaceText: dept || '' } },
    { replaceAllText: { containsText: { text: '{{부서}}', matchCase: true }, replaceText: dept || '' } },
    { replaceAllText: { containsText: { text: '{{직종}}', matchCase: true }, replaceText: job || '' } },
    { replaceAllText: { containsText: { text: '{{직위}}', matchCase: true }, replaceText: job || '' } },
    { replaceAllText: { containsText: { text: '{{생년월일}}', matchCase: true }, replaceText: birth || '' } },
    { replaceAllText: { containsText: { text: '{{연락처}}', matchCase: true }, replaceText: phone || '' } },
    { replaceAllText: { containsText: { text: '{{사직일}}', matchCase: true }, replaceText: resignDate || '' } },
    { replaceAllText: { containsText: { text: '{{사직사유}}', matchCase: true }, replaceText: resignReason || '' } },
    { replaceAllText: { containsText: { text: '{{날짜}}', matchCase: true }, replaceText: dateStr } }
  ];

  await fetch(`https://docs.googleapis.com/v1/documents/${tempDocId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests })
  });

  // [3단계] 치환 완료된 Google Docs를 PDF 바이너리로 Export
  const pdfExportRes = await fetch(`https://www.googleapis.com/drive/v3/files/${tempDocId}/export?mimeType=application/pdf`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const pdfArrayBuffer = await pdfExportRes.arrayBuffer();

  // [4단계] 온전한 PDF 파일 생성 (02_서류보관 폴더에 바이너리 업로드)
  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const metadata = {
    name: `${fileName}.pdf`,
    parents: [destFolderId],
    mimeType: 'application/pdf'
  };

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  const fileHeaderPart = `${delimiter}Content-Type: application/pdf\r\n\r\n`;

  const pdfMultipartBlob = new Blob([
    metadataPart,
    fileHeaderPart,
    new Uint8Array(pdfArrayBuffer),
    close_delim
  ], { type: `multipart/related; boundary="${boundary}"` });

  const pdfUploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: pdfMultipartBlob
  });

  const pdfData = await pdfUploadRes.json();
  const pdfId = pdfData.id;

  // 3. 누구나 읽기 권한 즉시 부여
  if (pdfId) {
    await makeFilePublic(token, pdfId);
  }

  return `https://drive.google.com/file/d/${pdfId}/view`;
}





// 4-1. 링크 공유 권한 설정 (누구나 PDF 미리보기 즉시 열람)
async function makeFilePublic(token, fileId) {
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch (e) {
    console.warn('Failed to set public permission for file:', fileId, e);
  }
}







// 5. 마스터 구글 시트 데이터 Upsert
async function saveToSheets(token, { isOffboarding, data, docUrl1, docUrl2, signatureUrl }) {
  const sheetName = isOffboarding ? "퇴사자(Offboarding)" : "입사자(Onboarding)";
  const now = new Date();
  const timestampStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()} ${now.getHours() >= 12 ? '오후' : '오전'} ${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent("'" + sheetName + "'!A1:Z5000")}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const getData = await getRes.json();
  const sheetData = getData.values || [];
  let matchedRowIndex = -1;

  if (!isOffboarding) {
    for (let i = 1; i < sheetData.length; i++) {
      if ((sheetData[i][1] || '').trim() === (data.name || '').trim() && (sheetData[i][4] || '').trim() === (data.birth || '').trim()) {
        matchedRowIndex = i + 1;
        break;
      }
    }
  } else {
    for (let i = 1; i < sheetData.length; i++) {
      if ((sheetData[i][1] || '').trim() === (data.name || '').trim() && (sheetData[i][4] || '').trim() === (data.resignDate || '').trim()) {
        matchedRowIndex = i + 1;
        break;
      }
    }
  }

  const docType = isOffboarding ? "사직원+보안서약" : "신규안전+개인정보";

  if (matchedRowIndex !== -1) {
    if (!isOffboarding) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent("'" + sheetName + "'!A" + matchedRowIndex)}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [[timestampStr]] })
      });
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent("'" + sheetName + "'!C" + matchedRowIndex + ":J" + matchedRowIndex)}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          values: [[data.dept, data.job, sheetData[matchedRowIndex - 1][4] || data.birth, data.phone, docType, signatureUrl, docUrl1, docUrl2]]
        })
      });
    } else {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent("'" + sheetName + "'!A" + matchedRowIndex)}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [[timestampStr]] })
      });
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent("'" + sheetName + "'!C" + matchedRowIndex + ":M" + matchedRowIndex)}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          values: [[
            data.dept, data.job, sheetData[matchedRowIndex - 1][4] || data.resignDate, data.resignReason,
            data.checkCard, data.checkUniform, data.checkIrp, docType, signatureUrl, docUrl1, docUrl2
          ]]
        })
      });
    }
  } else {
    let rowValues;
    if (!isOffboarding) {
      rowValues = [timestampStr, data.name, data.dept, data.job, data.birth, data.phone, docType, signatureUrl, docUrl1, docUrl2];
    } else {
      rowValues = [
        timestampStr, data.name, data.dept, data.job, data.resignDate, data.resignReason,
        data.checkCard, data.checkUniform, data.checkIrp, docType, signatureUrl, docUrl1, docUrl2
      ];
    }

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent("'" + sheetName + "'!A1")}:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [rowValues] })
    });
  }
}

// 메인 프론트엔드 직접 연동 제출 처리기 (Serverless 100%)
export async function submitDocumentDirectly(data) {
  const token = await getAccessToken();
  const isOffboarding = data.docType?.includes("사직원") || data.docType?.includes("보안서약");

  // 폴더 구조 세팅
  const sigRootId = await getOrCreateFolder(token, '01_서명보관', SHARED_DRIVE_ROOT_ID);
  const currentYear = `${new Date().getFullYear()}년`;
  const sigFolderId = await getOrCreateFolder(token, currentYear, sigRootId);

  const docsRootId = await getOrCreateFolder(token, '02_서류보관', SHARED_DRIVE_ROOT_ID);
  const docsYearFolderId = await getOrCreateFolder(token, currentYear, docsRootId);
  const subFolderName = isOffboarding ? '02_퇴사자서류' : '01_입사자서류';
  const destFolderId = await getOrCreateFolder(token, subFolderName, docsYearFolderId);

  const origDocsRootId = await getOrCreateFolder(token, '03_원본서류', SHARED_DRIVE_ROOT_ID);
  const docsDestFolderId = await getOrCreateFolder(token, currentYear, origDocsRootId);

  // 1. 서명 업로드
  const sigFileName = `[서명] ${data.name}_${data.birth || 'birth'}.png`;
  const sigResult = await uploadSignature(token, data.signature, sigFileName, sigFolderId);

  // 2. Docs 제작 & PDF 변환
  let docUrl1 = "", docUrl2 = "";

  if (!isOffboarding) {
    docUrl1 = await generateDocAndConvertToPdf(token, {
      templateId: TEMPLATE_SAFETY_ID, docLabel: "안전보건교육",
      name: data.name, dept: data.dept, job: data.job, birth: data.birth, phone: data.phone,
      destFolderId, docsDestFolderId
    });
    docUrl2 = await generateDocAndConvertToPdf(token, {
      templateId: TEMPLATE_PRIVACY_ID, docLabel: "개인정보서약_입사",
      name: data.name, dept: data.dept, job: data.job, birth: data.birth, phone: data.phone,
      destFolderId, docsDestFolderId
    });
  } else {
    docUrl1 = await generateDocAndConvertToPdf(token, {
      templateId: TEMPLATE_RESIGNATION_ID, docLabel: "사직원",
      name: data.name, dept: data.dept, job: data.job, birth: data.birth,
      resignDate: data.resignDate, resignReason: data.resignReason,
      destFolderId, docsDestFolderId
    });
    docUrl2 = await generateDocAndConvertToPdf(token, {
      templateId: TEMPLATE_SECURITY_OFF_ID, docLabel: "보안서약_퇴사",
      name: data.name, dept: data.dept, job: data.job, birth: data.birth,
      resignDate: data.resignDate, resignReason: data.resignReason,
      destFolderId, docsDestFolderId
    });
  }

  // 3. 시트 기록
  await saveToSheets(token, { isOffboarding, data, docUrl1, docUrl2, signatureUrl: sigResult.url });

  // 4. 노션 & 슬랙 알림 메시지 자동 전송
  await sendNotifications(token, { isOffboarding, data, docUrl1, docUrl2 });

  return {
    result: "success",
    docUrl1,
    docUrl2
  };
}

// 6. 노션 및 슬랙 알림 메시지 전송 헬퍼
async function sendNotifications(token, { isOffboarding, data, docUrl1, docUrl2 }) {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent("'솔라피&슬랙 설정'!A2:C20")}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const configData = await res.json();
    const rows = configData.values || [];
    const config = {};
    rows.forEach(r => { if (r[0]) config[r[0].trim()] = (r[1] || '').trim(); });

    const titleStr = isOffboarding ? `[퇴사 서류 제출 완료 알림] 🍀` : `[신규 입사 서류 제출 완료 알림] 🎉`;
    const docNameStr = isOffboarding ? "사직원 + 보안서약서" : "안전보건교육 + 개인정보서약서";
    const messageContent = `${titleStr}\n\n👤 성명: ${data.name}\n🏢 부서/직종: ${data.dept} / ${data.job}\n📄 서류내역: ${docNameStr}\n🔗 서류 1 (PDF): ${docUrl1}\n🔗 서류 2 (PDF): ${docUrl2}`;

    // A. Slack Webhook 알림
    if (config['SLACK_WEBHOOK_URL']) {
      await fetch(config['SLACK_WEBHOOK_URL'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: messageContent })
      }).catch(e => console.warn('Slack send warning:', e));
    }

    // B. Notion Webhook 알림
    if (config['NOTION_WEBHOOK_URL']) {
      await fetch(config['NOTION_WEBHOOK_URL'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleStr,
          name: data.name,
          dept: data.dept,
          job: data.job,
          type: isOffboarding ? '퇴사' : '입사',
          docUrl1,
          docUrl2,
          content: messageContent
        })
      }).catch(e => console.warn('Notion send warning:', e));
    }
  } catch (err) {
    console.warn("Notification send warning:", err.message);
  }
}

