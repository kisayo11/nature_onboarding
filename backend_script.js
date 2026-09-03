/* 네이처요양병원 온보딩/오프보딩 허브 - Google Apps Script Backend */

const SPREADSHEET_ID = "1Ed3IXDyNIICR2bLHJX_RbIrVPjSQBhuS5mHoFvR5obY";
const OJT_SPREADSHEET_ID = "1VeROZKInmmQR1wcpDPjSEPSqvZq5qlNvno1X7267OKg";
const REGISTRATION_SPREADSHEET_ID = "1YsuqFN43YXJCYjIlIkGsPAJPAcRTUGEtMWe2E-DUy_U";
const REGISTRATION_SHEET = "설문지 응답 시트1";
const DRIVE_ROOT_FOLDER_ID = "1fOCZbxN4xAy9bcgTweHk0sd2wvlT4G9J";

const TEMPLATE_SAFETY_ID = "1uQvHrouIG94qp-txtvDrwu1n1F_cu_52QaYg7b9emVU";
const TEMPLATE_PRIVACY_ID = "13b98fzAIaf1UtNVmlqqBFyLWQPMDmlnheIKp4jDBoUk";
const TEMPLATE_REGISTRATION_CONSENT_ID = "1t9FK54inmCx6RLAMxnvvwOVEG8O9MB6DZkSS-KVRNOI";
const TEMPLATE_RESIGNATION_ID = "1RZL9NZKAOHarK2mlo0BI9dqljcN7jasJVZ-gtNUzSDk";
const TEMPLATE_SECURITY_OFF_ID = "1HHaNxruT-k21ftyt1IAJzf6sq0q0n6yaODCX19stLjs";

const ONBOARDING_SHEET = "입사자(Onboarding)";
const OFFBOARDING_SHEET = "퇴사자(Offboarding)";
const CONFIG_SHEET = "솔라피&슬랙 설정";
const LOG_SHEET = "처리로그";
const TIME_ZONE = "Asia/Seoul";

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🌟 네이처 자동화")
    .addItem("시트 및 설정 초기화", "initializeAllSheets")
    .addToUi();
}

function initializeAllSheets() {
  const ss = getSpreadsheet();
  ensureSheet(ss, ONBOARDING_SHEET, [
    "타임스탬프", "이름", "부서", "직종", "생년월일", "연락처", "서류내역", "서명이미지", "결과_안전교육", "결과_개인정보"
  ]);
  ensureSheet(ss, OFFBOARDING_SHEET, [
    "타임스탬프", "이름", "부서", "직종", "사직일", "사직사유", "출입카드 반납여부", "검사및유니폼여부", "개인 IRP 계좌 사본 제출여부", "서류내역", "서명이미지", "결과_사직서", "결과_보안서약"
  ]);
  ensureLogSheet(ss);

  let configSheet = ss.getSheetByName(CONFIG_SHEET);
  if (!configSheet) configSheet = ss.insertSheet(CONFIG_SHEET);
  if (configSheet.getLastRow() === 0) {
    const rows = [
      ["설정 항목", "설정 값", "설명"],
      ["SOLAPI_API_KEY", "", "솔라피 API Key"],
      ["SOLAPI_API_SECRET", "", "솔라피 API Secret"],
      ["SENDER_NUMBER", "", "솔라피 등록 발신번호"],
      ["SLACK_WEBHOOK_URL", "", "Slack Incoming Webhook URL"],
      ["ENABLE_COMPLETION_SMS", "FALSE", "제출 완료 SMS 사용 여부(TRUE/FALSE)"],
      ["ON_SMS_TEMPLATE", "[네이처요양병원] {이름}님, 입사 서류 작성이 완료되었습니다. {링크}", "입사 완료 문자"],
      ["OFF_SMS_TEMPLATE", "[네이처요양병원] {이름}님, 퇴사 서류 작성이 완료되었습니다. {링크}", "퇴사 완료 문자"]
    ];
    configSheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  }
  configSheet.setFrozenRows(1);
}

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    if (params.action === "getOjtData") {
      return jsonResponse({ result: "success", data: loadOjtDataFromSheet() });
    }
    if (params.action === "getRegistrationConsent") {
      return jsonResponse({ result: "success", blocks: loadRegistrationConsentDocument() });
    }
    if (params.action === "getSignature") {
      requireFields(params, ["name", "birth"]);
      const folder = getStorageFolders(false).signature;
      const fileName = signatureFileName(params.name, params.birth);
      const files = folder.getFilesByName(fileName);
      if (!files.hasNext()) return jsonResponse({ result: "success", exists: false });

      const file = files.next();
      return jsonResponse({
        result: "success",
        exists: true,
        signatureData: "data:image/png;base64," + Utilities.base64Encode(file.getBlob().getBytes()),
        driveUrl: driveContentUrl(file.getId())
      });
    }
    return jsonResponse({ result: "error", message: "잘못된 요청입니다." });
  } catch (error) {
    return errorResponse(error);
  }
}

function loadRegistrationConsentDocument() {
  const body = DocumentApp.openById(TEMPLATE_REGISTRATION_CONSENT_ID).getBody();
  const blocks = [];
  for (let i = 0; i < body.getNumChildren(); i++) {
    const child = body.getChild(i);
    const type = child.getType();
    if (type === DocumentApp.ElementType.PARAGRAPH) {
      const text = child.asParagraph().getText().trim();
      if (text) blocks.push({ type: "paragraph", text: text });
    } else if (type === DocumentApp.ElementType.TABLE) {
      const table = child.asTable();
      const rows = [];
      for (let rowIndex = 0; rowIndex < table.getNumRows(); rowIndex++) {
        const row = table.getRow(rowIndex);
        const cells = [];
        for (let cellIndex = 0; cellIndex < row.getNumCells(); cellIndex++) {
          cells.push(row.getCell(cellIndex).getText().trim());
        }
        rows.push(cells);
      }
      blocks.push({ type: "table", rows: rows });
    }
  }
  return blocks;
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (error) {
    return jsonResponse({ result: "error", message: "요청 본문이 올바른 JSON이 아닙니다." });
  }

  try {
    if (data.action === "saveSignatureOnly") return saveSignatureOnly(data);
    if (data.action === "sendSmsLink") return sendSmsLink(data);
    if (data.action === "registerEmployee") return registerEmployee(data);
    return processSubmission(data);
  } catch (error) {
    return errorResponse(error);
  }
}

function registerEmployee(data) {
  requireFields(data, ["privacyConsent", "name", "residentNumber", "phone", "email", "emergencyContact", "signature"]);
  if (data.privacyConsent !== "동의함") throw new Error("개인정보 수집·이용 동의가 필요합니다.");

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("다른 요청을 처리 중입니다. 잠시 후 다시 시도해 주세요.");
  const createdFileIds = [];
  try {
    const timestamp = new Date();
    const folders = getStorageFolders(false);
    const birthKey = String(data.residentNumber || data.birth || "").replace(/[^0-9]/g, "").slice(0, 6);
    data.birth = data.birth || birthKey;
    data.dept = data.dept || data.department || "";
    data.job = data.job || "";
    data.docType = data.docType || "신규안전+개인정보";

    const signatureData = Object.assign({}, data, { birth: birthKey });
    const signature = resolveSignature(signatureData, folders.signature);

    // 1회 서명으로 3대 입사 서류 생성
    const docConsent = generateDocument(TEMPLATE_REGISTRATION_CONSENT_ID, "개인정보수집이용동의서", data, signature.id, timestamp, folders, createdFileIds);
    const docSafety = generateDocument(TEMPLATE_SAFETY_ID, "안전보건교육", data, signature.id, timestamp, folders, createdFileIds);
    const docPrivacy = generateDocument(TEMPLATE_PRIVACY_ID, "개인정보서약_입사", data, signature.id, timestamp, folders, createdFileIds);

    // 시트 1: 인사기록 응답 시트 (설문지 응답 시트1)
    const regSheet = SpreadsheetApp.openById(REGISTRATION_SPREADSHEET_ID).getSheetByName(REGISTRATION_SHEET);
    if (!regSheet) throw new Error("인사기록 응답 시트를 찾을 수 없습니다.");
    if (!regSheet.getRange(1, 15).getValue()) {
      regSheet.getRange(1, 15, 1, 3).setValues([["개인정보동의서_원본", "개인정보동의서_PDF", "서명이미지"]]);
    }
    regSheet.appendRow([
      timestamp, data.privacyConsent, data.name, data.department || "", data.englishName || "",
      data.residentNumber, data.address || "", data.phone, data.email, data.emergencyContact,
      data.education || "", data.career || "", data.license || "", data.opinion || "",
      docConsent.docUrl, docConsent.url, signature.url
    ]);

    // 시트 2: 입사자 온보딩 관리 시트 (입사자(Onboarding))
    upsertSubmission(data, false, signature.url, docSafety.url, docPrivacy.url, timestamp);

    // 알림 발송 (Slack / Solapi SMS)
    sendCompletionNotifications(data, false, [docSafety, docPrivacy, docConsent], timestamp);

    return jsonResponse({
      result: "success",
      consentUrl: docConsent.url,
      safetyUrl: docSafety.url,
      privacyUrl: docPrivacy.url
    });
  } catch (error) {
    trashFiles(createdFileIds);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function saveSignatureOnly(data) {
  requireFields(data, ["name", "birth", "signature"]);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("다른 요청을 처리 중입니다. 잠시 후 다시 시도해 주세요.");
  try {
    const saved = saveSignature(data.name, data.birth, data.signature);
    return jsonResponse({ result: "success", driveUrl: saved.url });
  } finally {
    lock.releaseLock();
  }
}

function sendSmsLink(data) {
  requireFields(data, ["name", "phone", "link", "type"]);
  const config = loadConfig();
  requireConfig(config, ["SOLAPI_API_KEY", "SOLAPI_API_SECRET", "SENDER_NUMBER"]);
  const label = data.type === "onboarding" ? "입사" : "퇴사";
  const message = `[네이처요양병원] ${data.name}님, 아래 링크에서 ${label} 서류 작성을 완료해 주세요:\n${data.link}`;
  withRetry(function () {
    sendSolapiSms(config.SOLAPI_API_KEY, config.SOLAPI_API_SECRET, config.SENDER_NUMBER, data.phone, message);
  }, 3);
  return jsonResponse({ result: "success" });
}

function processSubmission(data) {
  requireFields(data, ["name", "dept", "job", "birth", "docType", "signature"]);
  const isOffboarding = data.docType.indexOf("사직원") !== -1 || data.docType.indexOf("보안서약") !== -1;
  if (isOffboarding) requireFields(data, ["resignDate", "resignReason"]);
  else requireFields(data, ["phone"]);

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("다른 제출을 처리 중입니다. 잠시 후 다시 시도해 주세요.");

  const jobId = Utilities.getUuid();
  const startedAt = new Date();
  const createdFileIds = [];
  let logRow = 0;

  try {
    logRow = startProcessingLog(jobId, startedAt, data.name, isOffboarding ? "퇴사" : "입사");
    const folders = getStorageFolders(isOffboarding);
    const signature = resolveSignature(data, folders.signature);
    updateProcessingLog(logRow, "문서 생성", { signatureId: signature.id });

    const documents = isOffboarding
      ? [
          generateDocument(TEMPLATE_RESIGNATION_ID, "사직원", data, signature.id, startedAt, folders, createdFileIds),
          generateDocument(TEMPLATE_SECURITY_OFF_ID, "보안서약_퇴사", data, signature.id, startedAt, folders, createdFileIds)
        ]
      : [
          generateDocument(TEMPLATE_SAFETY_ID, "안전보건교육", data, signature.id, startedAt, folders, createdFileIds),
          generateDocument(TEMPLATE_PRIVACY_ID, "개인정보서약_입사", data, signature.id, startedAt, folders, createdFileIds)
        ];

    updateProcessingLog(logRow, "시트 기록", {
      doc1Id: documents[0].docId,
      pdf1Id: documents[0].pdfId,
      doc2Id: documents[1].docId,
      pdf2Id: documents[1].pdfId
    });
    upsertSubmission(data, isOffboarding, signature.url, documents[0].url, documents[1].url, startedAt);

    const notificationErrors = sendCompletionNotifications(data, isOffboarding, documents, startedAt);
    finishProcessingLog(logRow, notificationErrors.length ? "완료(알림오류)" : "완료", notificationErrors.join(" | "));

    return jsonResponse({
      result: "success",
      jobId: jobId,
      notificationStatus: notificationErrors.length ? "failed" : "success",
      notificationErrors: notificationErrors
    });
  } catch (error) {
    trashFiles(createdFileIds);
    if (logRow) finishProcessingLog(logRow, "실패", error.message || String(error));
    return jsonResponse({ result: "error", jobId: jobId, message: error.message || String(error) });
  } finally {
    lock.releaseLock();
  }
}

function resolveSignature(data, signatureFolder) {
  if (String(data.signature).indexOf("data:image/") === 0) {
    return saveSignature(data.name, data.birth, data.signature, signatureFolder);
  }
  const id = extractDriveFileId(data.signature);
  if (!id) throw new Error("서명 이미지 주소가 올바르지 않습니다.");
  DriveApp.getFileById(id).getBlob();
  return { id: id, url: driveContentUrl(id) };
}

function saveSignature(name, birth, dataUrl, folder) {
  const parts = String(dataUrl).split(",");
  if (parts.length !== 2) throw new Error("서명 이미지 데이터가 올바르지 않습니다.");
  folder = folder || getStorageFolders(false).signature;
  const fileName = signatureFileName(name, birth);
  const blob = Utilities.newBlob(Utilities.base64Decode(parts[1]), "image/png", fileName);

  // 새 파일 생성이 성공한 뒤 기존 파일을 정리해야 서명 유실을 막을 수 있다.
  const oldFiles = folder.getFilesByName(fileName);
  const file = folder.createFile(blob);
  while (oldFiles.hasNext()) {
    const oldFile = oldFiles.next();
    if (oldFile.getId() !== file.getId()) oldFile.setTrashed(true);
  }
  return { id: file.getId(), url: driveContentUrl(file.getId()) };
}

function generateDocument(templateId, label, data, signatureId, timestamp, folders, createdFileIds) {
  const dateText = Utilities.formatDate(timestamp, TIME_ZONE, "yyyy. MM. dd.");
  const department = data.dept || data.department || "";
  const fileName = `${sanitizeFileName(data.name)}_${sanitizeFileName(department)}_${label}_${dateText}`;
  const docFile = DriveApp.getFileById(templateId).makeCopy(fileName, folders.original);
  createdFileIds.push(docFile.getId());

  const doc = DocumentApp.openById(docFile.getId());
  const body = doc.getBody();
  const replacements = {
    "{{이름}}": data.name,
    "{{ 이름 }}": data.name,
    "{{성명}}": data.name,
    "{{소속}}": department,
    "{{부서}}": department,
    "{{직종}}": data.job,
    "{{직위}}": data.job,
    "{{생년월일}}": formatInputDate(data.birth),
    "{{연락처}}": data.phone || "",
    "{{010-1234-5678}}": data.phone || "",
    "{{사직일}}": formatInputDate(data.resignDate),
    "{{사유}}": data.resignReason || "",
    "{{사직사유}}": data.resignReason || "",
    "{{날짜}}": dateText,
    "{{입사일}}": getJoinDate(data.name, data.phone, data.birth)
  };
  Object.keys(replacements).forEach(function (tag) {
    body.replaceText(escapeRegExp(tag), String(replacements[tag]));
  });
  if (data.privacyConsent === "동의함") {
    body.replaceText(escapeRegExp("□동의함 □동의하지 않음"), "■동의함 □동의하지 않음");
  }

  const signatureLocation = body.findText(escapeRegExp("{{서명}}"));
  if (!signatureLocation) {
    doc.saveAndClose();
    throw new Error(`${label} 템플릿에서 {{서명}} 태그를 찾을 수 없습니다.`);
  }
  const textElement = signatureLocation.getElement().asText();
  textElement.deleteText(signatureLocation.getStartOffset(), signatureLocation.getEndOffsetInclusive());
  const image = textElement.getParent().asParagraph().appendInlineImage(DriveApp.getFileById(signatureId).getBlob());
  image.setWidth(100).setHeight(60);
  doc.saveAndClose();

  const pdfFile = folders.pdf.createFile(docFile.getAs(MimeType.PDF)).setName(fileName + ".pdf");
  createdFileIds.push(pdfFile.getId());
  return { docId: docFile.getId(), pdfId: pdfFile.getId(), docUrl: docFile.getUrl(), url: pdfFile.getUrl() };
}

function upsertSubmission(data, isOffboarding, signatureUrl, docUrl1, docUrl2, timestamp) {
  const sheet = getSpreadsheet().getSheetByName(isOffboarding ? OFFBOARDING_SHEET : ONBOARDING_SHEET);
  if (!sheet) throw new Error("대상 기록 시트가 없습니다. 먼저 시트 초기화를 실행해 주세요.");

  const values = sheet.getDataRange().getValues();
  const keyDate = isOffboarding ? data.resignDate : data.birth;
  let rowNumber = 0;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][1]).trim() === String(data.name).trim() && normalizeDate(values[i][4]) === keyDate) {
      rowNumber = i + 1;
      break;
    }
  }

  const row = isOffboarding
    ? [timestamp, data.name, data.dept, data.job, data.resignDate, data.resignReason, data.checkCard, data.checkUniform, data.checkIrp, data.docType, signatureUrl, docUrl1, docUrl2]
    : [timestamp, data.name, data.dept, data.job, data.birth, data.phone, data.docType, signatureUrl, docUrl1, docUrl2];
  if (!rowNumber) rowNumber = Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
}

function sendCompletionNotifications(data, isOffboarding, documents, timestamp) {
  const config = loadConfig();
  const errors = [];
  const phone = data.phone || findPhoneByNameAndBirth(data.name, data.birth);
  const template = config[isOffboarding ? "OFF_SMS_TEMPLATE" : "ON_SMS_TEMPLATE"] || "";

  if (config.ENABLE_COMPLETION_SMS === "TRUE" && template && phone && config.SOLAPI_API_KEY && config.SOLAPI_API_SECRET && config.SENDER_NUMBER) {
    const message = template.replace(/\{이름\}/g, data.name).replace(/\{링크\}/g, documents[0].url);
    try {
      withRetry(function () {
        sendSolapiSms(config.SOLAPI_API_KEY, config.SOLAPI_API_SECRET, config.SENDER_NUMBER, phone, message);
      }, 3);
    } catch (error) {
      errors.push("SMS: " + error.message);
    }
  }

  if (config.SLACK_WEBHOOK_URL) {
    const typeLabel = isOffboarding ? "퇴사자 서류 제출" : "신규 입사자 서류 제출";
    const slackMessage = `📢 *[${typeLabel}] ${data.name} (${data.dept} / ${data.job})*\n• 날짜: ${Utilities.formatDate(timestamp, TIME_ZONE, "yyyy-MM-dd HH:mm")}\n• 서류: ${documents[0].url}\n• 서류: ${documents[1].url}`;
    try {
      withRetry(function () { sendSlackNotification(config.SLACK_WEBHOOK_URL, slackMessage); }, 3);
    } catch (error) {
      errors.push("Slack: " + error.message);
    }
  }
  return errors;
}

function sendSolapiSms(apiKey, apiSecret, sender, receiver, text) {
  const date = new Date().toISOString();
  const salt = Utilities.getUuid().replace(/-/g, "");
  const signature = byteToHex(Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, date + salt, apiSecret));
  const response = UrlFetchApp.fetch("https://api.solapi.com/messages/v4/send", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}` },
    payload: JSON.stringify({ message: { to: String(receiver).replace(/[^0-9]/g, ""), from: sender, text: text } }),
    muteHttpExceptions: true
  });
  assertHttpSuccess(response, "Solapi");
}

function sendSlackNotification(webhookUrl, message) {
  const response = UrlFetchApp.fetch(webhookUrl, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ text: message }),
    muteHttpExceptions: true
  });
  assertHttpSuccess(response, "Slack");
}

function assertHttpSuccess(response, serviceName) {
  const code = response.getResponseCode();
  if (code < 200 || code >= 300) throw new Error(`${serviceName} HTTP ${code}: ${response.getContentText()}`);
}

function withRetry(operation, attempts) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) Utilities.sleep(500 * attempt);
    }
  }
  throw lastError;
}

function getStorageFolders(isOffboarding) {
  const root = DriveApp.getFolderById(DRIVE_ROOT_FOLDER_ID);
  const year = Utilities.formatDate(new Date(), TIME_ZONE, "yyyy") + "년";
  return {
    signature: getOrCreateFolder(getOrCreateFolder(root, "01_서명보관"), year),
    pdf: getOrCreateFolder(getOrCreateFolder(getOrCreateFolder(root, "02_서류보관"), year), isOffboarding ? "02_퇴사자서류" : "01_입사자서류"),
    original: getOrCreateFolder(getOrCreateFolder(root, "03_원본서류"), year)
  };
}

function getOrCreateFolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

function startProcessingLog(jobId, startedAt, name, type) {
  const sheet = ensureLogSheet(getSpreadsheet());
  sheet.appendRow([jobId, startedAt, "", name, type, "처리중", "서명 저장", "", "", "", "", "", ""]);
  return sheet.getLastRow();
}

function updateProcessingLog(row, stage, ids) {
  const sheet = ensureLogSheet(getSpreadsheet());
  sheet.getRange(row, 7).setValue(stage);
  if (ids.signatureId) sheet.getRange(row, 8).setValue(ids.signatureId);
  if (ids.doc1Id) sheet.getRange(row, 9, 1, 4).setValues([[ids.doc1Id, ids.pdf1Id, ids.doc2Id, ids.pdf2Id]]);
}

function finishProcessingLog(row, status, message) {
  const sheet = ensureLogSheet(getSpreadsheet());
  sheet.getRange(row, 3).setValue(new Date());
  sheet.getRange(row, 6, 1, 2).setValues([[status, "완료"]]);
  sheet.getRange(row, 13).setValue(message || "");
}

function ensureLogSheet(ss) {
  return ensureSheet(ss, LOG_SHEET, [
    "작업ID", "시작시각", "완료시각", "이름", "구분", "상태", "단계", "서명ID", "원본문서1ID", "PDF1ID", "원본문서2ID", "PDF2ID", "오류"
  ]);
}

function ensureSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  return sheet;
}

function trashFiles(fileIds) {
  fileIds.forEach(function (id) {
    try { DriveApp.getFileById(id).setTrashed(true); } catch (ignored) { Logger.log(ignored); }
  });
}

function loadConfig() {
  const sheet = getSpreadsheet().getSheetByName(CONFIG_SHEET);
  const config = {};
  if (!sheet || sheet.getLastRow() === 0) return config;
  const rows = sheet.getDataRange().getValues();
  const start = String(rows[0][0]).trim() === "설정 항목" ? 1 : 0;
  for (let i = start; i < rows.length; i++) {
    const key = String(rows[i][0] || "").trim();
    if (key) config[key] = String(rows[i][1] || "").trim();
  }
  return config;
}

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function requireFields(data, fields) {
  const missing = fields.filter(function (field) { return !String(data[field] || "").trim(); });
  if (missing.length) throw new Error("필수 항목이 없습니다: " + missing.join(", "));
}

function requireConfig(config, fields) {
  const missing = fields.filter(function (field) { return !config[field]; });
  if (missing.length) throw new Error("설정 시트에 필요한 값이 없습니다: " + missing.join(", "));
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(error) {
  Logger.log(error.stack || error);
  return jsonResponse({ result: "error", message: error.message || String(error) });
}

function signatureFileName(name, birth) {
  return `[서명] ${sanitizeFileName(name)}_${sanitizeFileName(birth)}.png`;
}

function sanitizeFileName(value) {
  return String(value || "").replace(/[\\/:*?"<>|]/g, "_").trim();
}

function driveContentUrl(id) {
  return "https://drive.google.com/uc?id=" + id;
}

function extractDriveFileId(value) {
  const match = String(value || "").match(/(?:id=|\/d\/)([-\w]{20,})/);
  return match ? match[1] : "";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeDate(value) {
  if (value instanceof Date) return Utilities.formatDate(value, TIME_ZONE, "yyyy-MM-dd");
  return String(value || "").trim();
}

function formatInputDate(value) {
  if (!value) return "";
  const parts = String(value).split("-");
  return parts.length === 3 ? `${parts[0]}. ${parts[1]}. ${parts[2]}.` : String(value);
}

function byteToHex(bytes) {
  return bytes.map(function (value) {
    const byte = value < 0 ? value + 256 : value;
    return ("0" + byte.toString(16)).slice(-2);
  }).join("");
}

function getJoinDate(name, phone, birth) {
  let targetPhone = phone || findPhoneByNameAndBirth(name, birth);
  try {
    const sheet = getSpreadsheet().getSheetByName("재직자현황");
    if (!sheet) return "";
    const rows = sheet.getDataRange().getValues();
    const cleanPhone = function (value) { return String(value || "").replace(/[^0-9]/g, ""); };
    const matches = [];
    for (let i = 2; i < rows.length; i++) {
      if (String(rows[i][5]).trim() !== String(name).trim()) continue;
      matches.push(rows[i]);
      if (cleanPhone(targetPhone) && cleanPhone(rows[i][8]) === cleanPhone(targetPhone)) return formatJoinDateValue(rows[i][6]);
    }
    return matches.length === 1 ? formatJoinDateValue(matches[0][6]) : "";
  } catch (error) {
    Logger.log("입사일 조회 실패: " + error);
    return "";
  }
}

function findPhoneByNameAndBirth(name, birth) {
  const sheet = getSpreadsheet().getSheetByName(ONBOARDING_SHEET);
  if (!sheet) return "";
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).trim() === String(name).trim() && normalizeDate(rows[i][4]) === String(birth).trim()) {
      return String(rows[i][5] || "").trim();
    }
  }
  return "";
}

function formatJoinDateValue(value) {
  if (value instanceof Date) return Utilities.formatDate(value, TIME_ZONE, "yyyy. MM. dd.");
  return formatInputDate(value);
}

function loadOjtDataFromSheet() {
  let ss;
  try { ss = SpreadsheetApp.openById(OJT_SPREADSHEET_ID); }
  catch (ignored) { ss = getSpreadsheet(); }

  const result = { contacts: [], floors: [], tools: [], welfare: [] };
  const combined = ss.getSheetByName("OJT");
  if (combined) {
    const rows = combined.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] || row[1]) result.floors.push({ floor: String(row[0] || "").trim(), title: String(row[1] || "").trim(), desc: String(row[2] || "").trim() });
      if (row[3]) result.tools.push({ name: String(row[3]).trim(), category: String(row[4] || "").trim(), url: String(row[5] || "").trim(), badge: String(row[6] || "").trim(), icon: String(row[7] || "ph-desktop").trim() });
      if (row[8]) result.welfare.push({ title: String(row[8]).trim(), desc: String(row[9] || "").trim(), icon: String(row[10] || "ph-gift").trim(), color: String(row[11] || "blue").trim() });
      if (row[12] || row[14]) result.contacts.push({ dept: String(row[12] || "").trim(), name: String(row[13] || "").trim(), ext: String(row[14] || "").trim(), role: String(row[12] || "").trim() });
    }
    return result;
  }

  loadOjtTab(ss, "OJT_내선", result.contacts, function (row) { return { dept: String(row[0] || ""), name: String(row[1] || ""), ext: String(row[2] || ""), role: String(row[3] || "") }; });
  loadOjtTab(ss, "OJT_층별", result.floors, function (row) { return { floor: String(row[0] || ""), title: String(row[1] || ""), desc: String(row[2] || "") }; });
  loadOjtTab(ss, "OJT_협업도구", result.tools, function (row) { return { name: String(row[0] || ""), category: String(row[1] || ""), url: String(row[2] || ""), badge: String(row[3] || ""), icon: String(row[4] || "ph-desktop") }; });
  loadOjtTab(ss, "OJT_복리후생", result.welfare, function (row) { return { title: String(row[0] || ""), desc: String(row[1] || ""), icon: String(row[2] || "ph-gift"), color: String(row[3] || "blue") }; });
  return result;
}

function loadOjtTab(ss, sheetName, target, mapper) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] || rows[i][1]) target.push(mapper(rows[i]));
  }
}
