/* 
======================================================
네이처요양병원 온보딩/오프보딩 허브 - 구글 앱스 스크립트 (Backend v2)
======================================================
*/

// [설정값 - 스프레드시트 ID]
const SPREADSHEET_ID = "1Ed3IXDyNIICR2bLHJX_RbIrVPQSQBhuS5mHoFvR5obY";

// 템플릿 문서 ID
const TEMPLATE_SAFETY_ID = "1uQvHrouIG94qp-txtvDrwu1n1F_cu_52QaYg7b9emVU";   // 신규안전교육 (입사)
const TEMPLATE_PRIVACY_ID = "13b98fzAIaf1UtNVmlqqBFyLWQPMDmlnheIKp4jDBoUk";  // 개인정보서약 (입사)
const TEMPLATE_RESIGNATION_ID = "1RZL9NZKAOHarK2mlo0BI9dqljcN7jasJVZ-gtNUzSDk"; // 사직서 (퇴사)
const TEMPLATE_SECURITY_OFF_ID = "1HHaNxruT-k21ftyt1IAJzf6sq0q0n6yaODCX19stLjs"; // 보안서약서 (퇴사)

// 폴더 ID
const FOLDER_ID = "1fTxLdtcFyaoKLXfCTIkSsHUfehNjfEDh"; // 서명 이미지 저장 폴더
const DOCS_FOLDER_ID = "1zJOorUiQhFkdQ409h0Ka8FCpC09ldu09"; // 생성된 문서 저장 폴더

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🌟 네이처 자동화')
      .addItem('시트 및 설정 초기화', 'initializeAllSheets')
      .addToUi();
}

// --- 시트 및 설정 초기화 ---
function initializeAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // 1. 입사자 시트 설정
  let onSheet = ss.getSheetByName("입사자(Onboarding)");
  if (!onSheet) onSheet = ss.insertSheet("입사자(Onboarding)");
  const onHeaders = ["타임스탬프", "이름", "부서", "직종", "생년월일", "연락처", "서류내역", "서명이미지", "결과_안전교육", "결과_개인정보"];
  onSheet.getRange(1, 1, 1, onHeaders.length).setValues([onHeaders]);
  onSheet.setFrozenRows(1);

  // 2. 퇴사자 시트 설정
  let offSheet = ss.getSheetByName("퇴사자(Offboarding)");
  if (!offSheet) offSheet = ss.insertSheet("퇴사자(Offboarding)");
  const offHeaders = ["타임스탬프", "이름", "부서", "직종", "사직일", "사직사유", "출입카드 반납여부", "검사및유니폼여부", "서류내역", "서명이미지", "결과_사직서", "결과_보안서약"];
  offSheet.getRange(1, 1, 1, offHeaders.length).setValues([offHeaders]);
  offSheet.setFrozenRows(1);

  // 3. 설정 시트 설정
  let configSheet = ss.getSheetByName("솔라피&슬랙 설정");
  if (!configSheet) configSheet = ss.insertSheet("솔라피&슬랙 설정");
  const configHeaders = ["설정 항목", "설정 값", "설명"];
  configSheet.getRange(1, 1, 1, configHeaders.length).setValues([configHeaders]);
  
  const defaultConfigs = [
    ["SOLAPI_API_KEY", "", "솔라피에서 발급받은 API Key"],
    ["SOLAPI_API_SECRET", "", "솔라피에서 발급받은 API Secret"],
    ["SENDER_NUMBER", "", "솔라피에 등록된 병원 발신번호"],
    ["SLACK_WEBHOOK_URL", "", "슬랙 채널 Incoming Webhook URL"],
    ["ON_SMS_TEMPLATE", "[네이처요양병원] {이름}님, 입사 서류 작성이 완료되었습니다. {링크}", "입사자 완료 문자 템플릿"],
    ["OFF_SMS_TEMPLATE", "[네이처요양병원] {이름}님, 퇴사 서류 작성이 완료되었습니다. {링크}", "퇴사자 완료 문자 템플릿"]
  ];
  
  configSheet.getRange(2, 1, defaultConfigs.length, 3).setValues(defaultConfigs);
  configSheet.setFrozenRows(1);

  SpreadsheetApp.getUi().alert("모든 시트 및 설정 탭이 올바르게 생성/초기화 되었습니다!");
}

// --- 설정값 로더 ---
function loadConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("솔라피&슬랙 설정");
  const config = {};
  if (!sheet) return config;
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const key = data[i][0];
    const val = data[i][1];
    if (key) {
      config[key] = val;
    }
  }
  return config;
}

// --- 서명 이미지 조회 API (doGet) ---
function doGet(e) {
  try {
    const action = e.parameter.action;
    const name = e.parameter.name;
    const birth = e.parameter.birth; // yyyy-mm-dd
    
    if (action === "getSignature" && name && birth) {
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const searchName = `[서명] ${name}_${birth}.png`;
      const files = folder.getFilesByName(searchName);
      
      if (files.hasNext()) {
        const file = files.next();
        const bytes = file.getBlob().getBytes();
        const base64Data = "data:image/png;base64," + Utilities.base64Encode(bytes);
        const driveUrl = "https://drive.google.com/uc?id=" + file.getId();
        
        return ContentService.createTextOutput(JSON.stringify({ 
          result: "success", 
          exists: true, 
          signatureData: base64Data,
          driveUrl: driveUrl
        })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ 
          result: "success", 
          exists: false 
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ result: "error", message: "잘못된 요청 파라미터입니다." })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// --- 서명 제출 및 실시간 문서 제작 API (doPost) ---
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // 1. 단독 서명 저장 API
    if (data.action === "saveSignatureOnly") {
      const base64Data = data.signature.split(",")[1];
      const fileName = `[서명] ${data.name}_${data.birth}.png`;
      const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), "image/png", fileName);
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const existingFiles = folder.getFilesByName(fileName);
      while (existingFiles.hasNext()) {
        existingFiles.next().setTrashed(true);
      }
      const file = folder.createFile(blob);
      const sigUrl = "https://drive.google.com/uc?id=" + file.getId();
      return ContentService.createTextOutput(JSON.stringify({ 
        result: "success", 
        driveUrl: sigUrl
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. 비대면 작성 링크 발송 API
    if (data.action === "sendSmsLink") {
      const config = loadConfig();
      const typeLabel = data.type === 'onboarding' ? '입사' : '퇴사';
      const message = `[네이처요양병원] ${data.name}님, 아래 링크를 눌러 ${typeLabel} 서류 작성을 완료해 주세요:\n${data.link}`;
      
      if (config['SOLAPI_API_KEY'] && config['SOLAPI_API_SECRET'] && config['SENDER_NUMBER'] && data.phone) {
        sendSolapiSms(config['SOLAPI_API_KEY'], config['SOLAPI_API_SECRET'], config['SENDER_NUMBER'], data.phone, message);
        return ContentService.createTextOutput(JSON.stringify({ result: "success" })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ result: "error", message: "솔라피 설정(API Key/Secret, 발신번호) 또는 수신 번호가 비어 있습니다." })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
    const config = loadConfig();
    
    // 입/퇴사자 판별
    const isOffboarding = data.docType.includes("사직원") || data.docType.includes("보안서약");
    const sheetName = isOffboarding ? "퇴사자(Offboarding)" : "입사자(Onboarding)";
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(`'${sheetName}' 시트를 찾을 수 없습니다.`);
    }

    const timestamp = new Date();
    
    // 1. 서명 이미지 드라이브 저장 또는 기존 파일 재사용
    let sigUrl = "";
    if (data.signature.startsWith("data:image/png;base64,")) {
      const base64Data = data.signature.split(",")[1];
      const fileName = `[서명] ${data.name}_${data.birth}.png`;
      const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), "image/png", fileName);
      
      // 기존에 동일한 서명이 있다면 구글 드라이브 파일 찾아서 삭제 후 새로 갱신
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const existingFiles = folder.getFilesByName(fileName);
      while (existingFiles.hasNext()) {
        existingFiles.next().setTrashed(true);
      }
      
      const file = folder.createFile(blob);
      sigUrl = "https://drive.google.com/uc?id=" + file.getId();
    } else if (data.signature.startsWith("http")) {
      sigUrl = data.signature; // 이미 드라이브 URL이 넘어온 경우 그대로 재사용
    }

    if (!sigUrl) {
      throw new Error("서명 이미지가 존재하지 않거나 잘못되었습니다.");
    }

    // 2. 월별 문서 보관 폴더 가져오기
    const destFolder = getOrCreateMonthlyFolder(DOCS_FOLDER_ID);

    // 3. 실시간 문서 자동화 및 PDF 변환
    let docUrl1 = "";
    let docUrl2 = "";

    if (!isOffboarding) {
      // 입사자 문서 2건 자동 제작
      docUrl1 = generateDocAndConvertToPdf(TEMPLATE_SAFETY_ID, "안전보건교육", data.name, data.dept, data.job, data.birth, data.phone, "", "", sigUrl, timestamp, destFolder);
      docUrl2 = generateDocAndConvertToPdf(TEMPLATE_PRIVACY_ID, "개인정보서약_입사", data.name, data.dept, data.job, data.birth, data.phone, "", "", sigUrl, timestamp, destFolder);
    } else {
      // 퇴사자 문서 2건 자동 제작
      docUrl1 = generateDocAndConvertToPdf(TEMPLATE_RESIGNATION_ID, "사직원", data.name, data.dept, data.job, data.birth, "", data.resignDate, data.resignReason, sigUrl, timestamp, destFolder);
      docUrl2 = generateDocAndConvertToPdf(TEMPLATE_SECURITY_OFF_ID, "보안서약_퇴사", data.name, data.dept, data.job, data.birth, "", data.resignDate, data.resignReason, sigUrl, timestamp, destFolder);
    }

    // 4. 데이터베이스 연동 (Upsert 병합 기법)
    let matchedRowIndex = -1;
    const sheetData = sheet.getDataRange().getValues();

    if (!isOffboarding) {
      // 입사자: 이름(B열) + 생년월일(E열, yyyy-mm-dd) 기준
      for (let i = 1; i < sheetData.length; i++) {
        const rowName = sheetData[i][1];
        const rowBirthVal = sheetData[i][4];
        
        let rowBirth = "";
        if (rowBirthVal instanceof Date) {
          rowBirth = Utilities.formatDate(rowBirthVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
        } else {
          rowBirth = String(rowBirthVal).trim();
        }
        
        if (rowName === data.name && rowBirth === data.birth) {
          matchedRowIndex = i + 1; // 1-indexed
          break;
        }
      }
    } else {
      // 퇴사자: 이름(B열) + 사직일(E열, yyyy-mm-dd) 기준
      for (let i = 1; i < sheetData.length; i++) {
        const rowName = sheetData[i][1];
        const rowResignVal = sheetData[i][4];
        
        let rowResign = "";
        if (rowResignVal instanceof Date) {
          rowResign = Utilities.formatDate(rowResignVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
        } else {
          rowResign = String(rowResignVal).trim();
        }
        
        if (rowName === data.name && rowResign === data.resignDate) {
          matchedRowIndex = i + 1; // 1-indexed
          break;
        }
      }
    }

    if (matchedRowIndex !== -1) {
      // 매칭 성공 시 데이터 업데이트 (Upsert - Update)
      if (!isOffboarding) {
        // [입사자] A: 타임스탬프, B: 이름, C: 부서, D: 직종, E: 생년월일, F: 연락처, G: 서류내역, H: 서명이미지, I: 결과_안전교육, J: 결과_개인정보
        sheet.getRange(matchedRowIndex, 1).setValue(timestamp);
        sheet.getRange(matchedRowIndex, 3).setValue(data.dept);
        sheet.getRange(matchedRowIndex, 4).setValue(data.job);
        sheet.getRange(matchedRowIndex, 6).setValue(data.phone);
        sheet.getRange(matchedRowIndex, 7).setValue(data.docType);
        sheet.getRange(matchedRowIndex, 8).setValue(sigUrl);
        sheet.getRange(matchedRowIndex, 9).setValue(docUrl1);
        sheet.getRange(matchedRowIndex, 10).setValue(docUrl2);
      } else {
        // [퇴사자] A: 타임스탬프, B: 이름, C: 부서, D: 직종, E: 사직일, F: 사직사유, G: 출입카드, H: 검사및유니폼, I: 서류내역, J: 서명이미지, K: 결과_사직서, L: 결과_보안서약
        sheet.getRange(matchedRowIndex, 1).setValue(timestamp);
        sheet.getRange(matchedRowIndex, 3).setValue(data.dept);
        sheet.getRange(matchedRowIndex, 4).setValue(data.job);
        sheet.getRange(matchedRowIndex, 6).setValue(data.resignReason);
        sheet.getRange(matchedRowIndex, 7).setValue(data.checkCard);
        sheet.getRange(matchedRowIndex, 8).setValue(data.checkUniform);
        sheet.getRange(matchedRowIndex, 9).setValue(data.docType);
        sheet.getRange(matchedRowIndex, 10).setValue(sigUrl);
        sheet.getRange(matchedRowIndex, 11).setValue(docUrl1);
        sheet.getRange(matchedRowIndex, 12).setValue(docUrl2);
      }
    } else {
      // 매칭 실패 시 데이터 추가 (Upsert - Insert)
      if (!isOffboarding) {
        sheet.appendRow([timestamp, data.name, data.dept, data.job, data.birth, data.phone, data.docType, sigUrl, docUrl1, docUrl2]);
      } else {
        sheet.appendRow([timestamp, data.name, data.dept, data.job, data.resignDate, data.resignReason, data.checkCard, data.checkUniform, data.docType, sigUrl, docUrl1, docUrl2]);
      }
    }

    // 5. 알림 연동 (솔라피 문자 & 슬랙 알림)
    const smsTemplate = isOffboarding ? config['OFF_SMS_TEMPLATE'] : config['ON_SMS_TEMPLATE'];
    const message = smsTemplate
      .replace("{이름}", data.name)
      .replace("{링크}", docUrl1); // 첫 번째 대표 문서 링크 치환
      
    // 솔라피 문자 전송
    if (config['SOLAPI_API_KEY'] && config['SOLAPI_API_SECRET'] && config['SENDER_NUMBER'] && data.phone) {
      sendSolapiSms(config['SOLAPI_API_KEY'], config['SOLAPI_API_SECRET'], config['SENDER_NUMBER'], data.phone, message);
    }
    
    // 슬랙 웹훅 전송
    if (config['SLACK_WEBHOOK_URL']) {
      const typeLabel = isOffboarding ? "퇴사자 서류 제출" : "신규 입사자 서류 제출";
      const slackMessage = `📢 *[${typeLabel}] ${data.name} (${data.dept} / ${data.job})*\n• 날짜: ${Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm")}\n• 서류내역: ${data.docType}\n• 첫번째 서류: ${docUrl1}\n• 두번째 서류: ${docUrl2}`;
      sendSlackNotification(config['SLACK_WEBHOOK_URL'], slackMessage);
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      result: "success", 
      docUrl1: docUrl1,
      docUrl2: docUrl2
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// --- 구글 독스 기반 실시간 문서 빌드 및 PDF 변환 ---
function generateDocAndConvertToPdf(templateId, docLabel, name, dept, job, birth, phone, resignDate, resignReason, signatureUrl, timestamp, destFolder) {
  const docDate = (timestamp instanceof Date) ? timestamp : (timestamp ? new Date(timestamp) : new Date());
  const dateStr = Utilities.formatDate(docDate, Session.getScriptTimeZone(), "yyyy. MM. dd.");

  if (!signatureUrl) {
    throw new Error("서명 이미지 주소가 없습니다.");
  }

  // 1. 드라이브 내 서명 파일 획득
  let signatureBlob;
  try {
    const signatureId = signatureUrl.split("id=")[1];
    signatureBlob = DriveApp.getFileById(signatureId).getBlob();
  } catch (e) {
    // 혹시 id 파싱이 안 되는 일반 URL 형태일 경우 URLFetch로 시도
    signatureBlob = UrlFetchApp.fetch(signatureUrl).getBlob();
  }

  // 2. 템플릿 복사
  const fileName = `${name}_${dept}_${docLabel}_${dateStr}`;
  const docCopy = DriveApp.getFileById(templateId).makeCopy(fileName, destFolder);
  const doc = DocumentApp.openById(docCopy.getId());
  const body = doc.getBody();

  // 3. 템플릿 태그 치환
  body.replaceText("{{이름}}", name);
  body.replaceText("{{성명}}", name);
  body.replaceText("{{소속}}", dept);
  body.replaceText("{{부서}}", dept);
  body.replaceText("{{직종}}", job);
  body.replaceText("{{직위}}", job);

  // 생년월일 포맷 치환 (yyyy-mm-dd -> yyyy. mm. dd. 혹은 그냥 기입)
  let birthStr = "";
  if (birth) {
    const dateObj = new Date(birth);
    if (!isNaN(dateObj.getTime())) {
      birthStr = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "yyyy. MM. dd.");
    } else {
      birthStr = birth;
    }
  }
  body.replaceText("{{생년월일}}", birthStr);
  body.replaceText("{{연락처}}", phone || "");
  body.replaceText("{{010-1234-5678}}", phone || "");

  // 사직일 및 사직 사유 치환
  let resignStr = "";
  if (resignDate) {
    const dateObj = new Date(resignDate);
    if (!isNaN(dateObj.getTime())) {
      resignStr = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "yyyy. MM. dd.");
    } else {
      resignStr = resignDate;
    }
  }
  body.replaceText("{{사직일}}", resignStr);
  body.replaceText("{{사유}}", resignReason || "");
  body.replaceText("{{사직사유}}", resignReason || "");

  body.replaceText("{{날짜}}", dateStr);

  // 4. 서명 이미지 삽입
  const signatureLocation = body.findText("{{서명}}");
  if (signatureLocation) {
    const element = signatureLocation.getElement();
    element.asText().setText("");
    const para = element.getParent().asParagraph();
    const image = para.appendInlineImage(signatureBlob);
    image.setWidth(100).setHeight(60);
  }

  doc.saveAndClose();

  // 5. 생성된 문서를 PDF로 내보내어 동일 폴더에 보관
  const pdfBlob = docCopy.getAs(MimeType.PDF);
  const pdfFile = destFolder.createFile(pdfBlob);
  pdfFile.setName(`${fileName}.pdf`);
  
  // 원본 임시 Docs 문서 삭제 (드라이브가 PDF로만 깔끔하게 보관되길 원함)
  docCopy.setTrashed(true);

  return pdfFile.getUrl();
}

// --- 월별 폴더 자동 아카이빙 엔진 ---
function getOrCreateMonthlyFolder(parentFolderId) {
  const parent = DriveApp.getFolderById(parentFolderId);
  const now = new Date();
  const yearStr = now.getFullYear() + "년";
  const monthStr = (now.getMonth() + 1) + "월";
  
  let yearFolder;
  const yearFolders = parent.getFoldersByName(yearStr);
  if (yearFolders.hasNext()) {
    yearFolder = yearFolders.next();
  } else {
    yearFolder = parent.createFolder(yearStr);
  }
  
  let monthFolder;
  const monthFolders = yearFolder.getFoldersByName(monthStr);
  if (monthFolders.hasNext()) {
    monthFolder = monthFolders.next();
  } else {
    monthFolder = yearFolder.createFolder(monthStr);
  }
  
  return monthFolder;
}

// --- 솔라피 문자 발송 v4 모듈 ---
function sendSolapiSms(apiKey, apiSecret, sender, receiver, text) {
  try {
    const date = new Date().toISOString();
    const salt = Utilities.getUuid().replace(/-/g, "");
    const dataToSign = date + salt;
    const signature = byteToHex(Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, dataToSign, apiSecret));
    const authHeader = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
    
    // 연락처 문자 포맷에서 '-' 문자 제거
    const cleanReceiver = receiver.replace(/[^0-9]/g, "");

    const payload = {
      message: {
        to: cleanReceiver,
        from: sender,
        text: text
      }
    };
    
    const options = {
      method: "POST",
      contentType: "application/json",
      headers: {
        "Authorization": authHeader
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch("https://api.solapi.com/messages/v4/send", options);
    const resContent = response.getContentText();
    console.log("Solapi Send Result: " + resContent);
  } catch (err) {
    console.error("Solapi SMS Send Error: " + err.toString());
  }
}

// --- 슬랙 웹훅 전송 모듈 ---
function sendSlackNotification(webhookUrl, message) {
  try {
    const payload = {
      text: message
    };
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    UrlFetchApp.fetch(webhookUrl, options);
  } catch (err) {
    console.error("Slack Notification Send Error: " + err.toString());
  }
}

// byte 배열을 16진수 hex 스트링으로 변환
function byteToHex(sig) {
  let hex = "";
  for (let i = 0; i < sig.length; i++) {
    let byteVal = sig[i];
    if (byteVal < 0) byteVal += 256;
    let byteHex = byteVal.toString(16);
    if (byteHex.length == 1) byteHex = "0" + byteHex;
    hex += byteHex;
  }
  return hex;
}
