/* 네이처요양병원 온보딩/오프보딩 허브 - Google Apps Script Backend */

const SPREADSHEET_ID = "1Ed3IXDyNIICR2bLHJX_RbIrVPjSQBhuS5mHoFvR5obY";
const OJT_SPREADSHEET_ID = "1VeROZKInmmQR1wcpDPjSEPSqvZq5qlNvno1X7267OKg";
const REGISTRATION_SPREADSHEET_ID = "1YsuqFN43YXJCYjIlIkGsPAJPAcRTUGEtMWe2E-DUy_U";
const REGISTRATION_SHEET = "설문지 응답 시트1";
const DRIVE_ROOT_FOLDER_ID = "1fOCZbxN4xAy9bcgTweHk0sd2wvlT4G9J";
const ACCESS_SPREADSHEET_ID = "1jA0_xY3LQJjpaIJcfp7o7IxcSEbmLdGHlkSviNvECD4";
const ACCESS_TEMPLATE_ID = "1jc5Ez2votn4uItriaLUJrbq7vnJZK1mdxKNHwU6De2E";
const EDUCATION_ROOT_FOLDER_ID = "1QboVZaNAR7altzSLrmCLCIgVaPzlsyyA";
const ACCESS_STATUS_COLUMN = 14; // N열
const ACCESS_STATUS_HEADER = "서명 상태";

const TEMPLATE_SAFETY_ID = "1uQvHrouIG94qp-txtvDrwu1n1F_cu_52QaYg7b9emVU";
const TEMPLATE_PRIVACY_ID = "13b98fzAIaf1UtNVmlqqBFyLWQPMDmlnheIKp4jDBoUk";
const TEMPLATE_REGISTRATION_CONSENT_ID = "1t9FK54inmCx6RLAMxnvvwOVEG8O9MB6DZkSS-KVRNOI";
const TEMPLATE_RESIGNATION_ID = "1RZL9NZKAOHarK2mlo0BI9dqljcN7jasJVZ-gtNUzSDk";
const TEMPLATE_SECURITY_OFF_ID = "1HHaNxruT-k21ftyt1IAJzf6sq0q0n6yaODCX19stLjs";

const ONBOARDING_SHEET = "입사자(Onboarding)";
const OFFBOARDING_SHEET = "퇴사자(Offboarding)";
const ACCESS_SIGNATURE_SHEET = "접근권한 서명";
const CONFIG_SHEET = "솔라피&슬랙 설정";
const LOG_SHEET = "처리로그";
const REISSUE_LOG_SHEET = "문서재생성로그";
const TIME_ZONE = "Asia/Seoul";
const PRIVACY_REISSUE_VERSION = "privacy-date-v2";
const REISSUE_BATCH_SIZE = 20;

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const reissueMenu = ui.createMenu("입사서류 재생성")
    .addItem("선택 행 개인정보서약서 재생성", "regenerateSelectedOnboardingPrivacy")
    .addItem("날짜 누락 개인정보서약서 일괄 재생성", "regenerateMissingDateOnboardingPrivacy")
    .addItem("선택 행 전체 입사서류 재생성", "regenerateSelectedOnboardingDocuments");

  ui
    .createMenu("🌟 네이처 자동화")
    .addItem("시트 및 설정 초기화", "initializeAllSheets")
    .addSeparator()
    .addSubMenu(reissueMenu)
    .addSeparator()
    .addItem("접근권한 서명 상태 갱신", "refreshAccessSignatureStatuses")
    .addItem("2025년 접근권한 통합문서 생성", "generateAccessRequests2025")
    .addItem("2026년 접근권한 통합문서 생성", "generateAccessRequests2026")
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
  ensureSheet(ss, ACCESS_SIGNATURE_SHEET, [
    "타임스탬프", "이름", "표준부서", "생년월일6자리", "서명이미지"
  ]);
  ensureLogSheet(ss);
  ensureReissueLogSheet(ss);

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

function initializeAccessAutomation() {
  const accessSpreadsheet = SpreadsheetApp.openById(ACCESS_SPREADSHEET_ID);
  accessSpreadsheet.getSheets().forEach(function (sheet) {
    if (/^\d{4}$/.test(sheet.getName())) {
      sheet.getRange(1, ACCESS_STATUS_COLUMN).setValue(ACCESS_STATUS_HEADER);
    }
  });

  refreshAccessSignatureStatuses();
}

function generateAccessRequests2025() {
  return generateAccessRequestArchive("2025");
}

function generateAccessRequests2026() {
  return generateAccessRequestArchive("2026");
}

function regenerateSelectedOnboardingPrivacy() {
  runSelectedOnboardingReissue(["privacy"], "관리자 선택 재생성");
}

function regenerateSelectedOnboardingDocuments() {
  runSelectedOnboardingReissue(["safety", "privacy"], "관리자 선택 전체 재생성");
}

function runSelectedOnboardingReissue(documentTypes, reason) {
  const ui = SpreadsheetApp.getUi();
  try {
    assertPrivacyTemplateReady(documentTypes);
    const sheet = SpreadsheetApp.getActiveSheet();
    if (!sheet || sheet.getName() !== ONBOARDING_SHEET) {
      throw new Error(`'${ONBOARDING_SHEET}' 시트에서 대상 직원 행을 선택해 주세요.`);
    }
    const range = sheet.getActiveRange();
    if (!range || range.getRow() < 2 || range.getNumRows() !== 1) {
      throw new Error("재생성할 직원의 데이터 행 하나를 선택해 주세요.");
    }
    const record = readOnboardingRecord(sheet, range.getRow());
    const labels = documentTypes.map(function (type) { return type === "privacy" ? "개인정보서약서" : "안전보건교육"; }).join(", ");
    const answer = ui.alert(
      "입사서류 재생성",
      `${record.name}님의 ${labels}를 최초 제출일 기준으로 재생성할까요?\n기존 서명은 재사용하고 알림은 발송하지 않습니다.`,
      ui.ButtonSet.YES_NO
    );
    if (answer !== ui.Button.YES) return;

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) throw new Error("다른 문서 작업이 진행 중입니다. 잠시 후 다시 시도해 주세요.");
    try {
      regenerateOnboardingRow(record, documentTypes, reason, "manual");
    } finally {
      lock.releaseLock();
    }
    ui.alert("재생성 완료", `${record.name}님의 ${labels} 링크가 새 문서로 교체되었습니다.`, ui.ButtonSet.OK);
  } catch (error) {
    ui.alert("재생성 실패", error.message || String(error), ui.ButtonSet.OK);
  }
}

function regenerateMissingDateOnboardingPrivacy() {
  const ui = SpreadsheetApp.getUi();
  try {
    assertPrivacyTemplateReady(["privacy"]);
    const answer = ui.alert(
      "개인정보서약서 날짜 보정",
      `기존 개인정보서약서를 최초 제출일과 기존 서명으로 재생성합니다.\n한 번에 최대 ${REISSUE_BATCH_SIZE}건을 처리하며, 완료된 건은 다음 실행에서 자동으로 제외합니다. 계속할까요?`,
      ui.ButtonSet.YES_NO
    );
    if (answer !== ui.Button.YES) return;

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) throw new Error("다른 문서 작업이 진행 중입니다. 잠시 후 다시 시도해 주세요.");
    let completed = 0;
    let failed = 0;
    let remaining = 0;
    try {
      const sheet = getSpreadsheet().getSheetByName(ONBOARDING_SHEET);
      if (!sheet || sheet.getLastRow() < 2) throw new Error("재생성할 입사자 기록이 없습니다.");
      const completedKeys = loadCompletedReissueKeys("privacy", PRIVACY_REISSUE_VERSION);
      for (let rowNumber = 2; rowNumber <= sheet.getLastRow(); rowNumber++) {
        let record;
        try {
          record = readOnboardingRecord(sheet, rowNumber);
        } catch (error) {
          failed++;
          continue;
        }
        if (!record.previousPrivacyUrl || completedKeys[record.recordKey]) continue;
        if (completed >= REISSUE_BATCH_SIZE) {
          remaining++;
          continue;
        }
        try {
          regenerateOnboardingRow(record, ["privacy"], "날짜 누락 일괄 보정", PRIVACY_REISSUE_VERSION);
          completedKeys[record.recordKey] = true;
          completed++;
        } catch (error) {
          failed++;
        }
      }
    } finally {
      lock.releaseLock();
    }
    ui.alert(
      "날짜 보정 처리 결과",
      `완료 ${completed}건 / 실패 또는 데이터 누락 ${failed}건 / 남은 대상 ${remaining}건` +
        (remaining ? "\n남은 건은 같은 메뉴를 다시 실행하면 이어서 처리됩니다." : ""),
      ui.ButtonSet.OK
    );
  } catch (error) {
    ui.alert("일괄 재생성 실패", error.message || String(error), ui.ButtonSet.OK);
  }
}

function readOnboardingRecord(sheet, rowNumber) {
  const values = sheet.getRange(rowNumber, 1, 1, 10).getValues()[0];
  const submittedAt = values[0] instanceof Date ? values[0] : new Date(values[0]);
  if (!values[1] || isNaN(submittedAt.getTime())) throw new Error(`${rowNumber}행의 이름 또는 최초 제출일이 올바르지 않습니다.`);
  const record = {
    sheet: sheet,
    rowNumber: rowNumber,
    submittedAt: submittedAt,
    name: String(values[1] || "").trim(),
    dept: String(values[2] || "").trim(),
    job: String(values[3] || "").trim(),
    birth: normalizeDate(values[4]),
    phone: String(values[5] || "").trim(),
    docType: String(values[6] || "신규안전+개인정보").trim(),
    signatureUrl: String(values[7] || "").trim(),
    previousSafetyUrl: String(values[8] || "").trim(),
    previousPrivacyUrl: String(values[9] || "").trim()
  };
  record.recordKey = [record.rowNumber, record.name, Utilities.formatDate(record.submittedAt, TIME_ZONE, "yyyyMMddHHmmss")].join("|");
  if (!record.dept || !record.job || !record.birth || !record.signatureUrl) {
    throw new Error(`${rowNumber}행의 부서, 직종, 생년월일 또는 서명 정보가 없습니다.`);
  }
  return record;
}

function regenerateOnboardingRow(record, documentTypes, reason, version) {
  const signatureId = extractDriveFileId(record.signatureUrl);
  if (!signatureId) throw new Error(`${record.name}님의 기존 서명 파일을 확인할 수 없습니다.`);
  DriveApp.getFileById(signatureId).getBlob();

  const folders = getStorageFolders(false, record.submittedAt);
  const createdFileIds = [];
  const generated = {};
  const jobId = Utilities.getUuid();
  let linksUpdated = false;
  const data = {
    name: record.name,
    dept: record.dept,
    job: record.job,
    birth: record.birth,
    phone: record.phone,
    docType: record.docType
  };

  try {
    if (documentTypes.indexOf("safety") !== -1) {
      generated.safety = generateDocument(TEMPLATE_SAFETY_ID, "안전보건교육", data, signatureId, record.submittedAt, folders, createdFileIds);
      validateRegeneratedDocument(generated.safety.docId, record.submittedAt, "안전보건교육");
    }
    if (documentTypes.indexOf("privacy") !== -1) {
      generated.privacy = generateDocument(TEMPLATE_PRIVACY_ID, "개인정보서약_입사", data, signatureId, record.submittedAt, folders, createdFileIds);
      validateRegeneratedDocument(generated.privacy.docId, record.submittedAt, "개인정보서약서");
    }

    const newLinks = [[
      generated.safety ? generated.safety.url : record.previousSafetyUrl,
      generated.privacy ? generated.privacy.url : record.previousPrivacyUrl
    ]];
    record.sheet.getRange(record.rowNumber, 9, 1, 2).setValues(newLinks);
    SpreadsheetApp.flush();
    linksUpdated = true;

    if (generated.safety) {
      const previousId = archiveSupersededDocument(record.previousSafetyUrl, generated.safety.docId, folders);
      safeAppendReissueLog(jobId, record, "안전보건교육", version, reason, previousId, generated.safety, "완료", "");
    }
    if (generated.privacy) {
      const previousId = archiveSupersededDocument(record.previousPrivacyUrl, generated.privacy.docId, folders);
      safeAppendReissueLog(jobId, record, "개인정보서약서", version, reason, previousId, generated.privacy, "완료", "");
    }
    return generated;
  } catch (error) {
    if (!linksUpdated) trashFiles(createdFileIds);
    documentTypes.forEach(function (type) {
      safeAppendReissueLog(jobId, record, type === "privacy" ? "개인정보서약서" : "안전보건교육", version, reason, "", generated[type] || {}, "실패", error.message || String(error));
    });
    throw error;
  }
}

function assertPrivacyTemplateReady(documentTypes) {
  if (documentTypes.indexOf("privacy") === -1) return;
  const text = DocumentApp.openById(TEMPLATE_PRIVACY_ID).getBody().getText();
  if (text.indexOf("{{날짜}}") === -1) throw new Error("개인정보서약서 템플릿에서 {{날짜}} 태그를 찾을 수 없습니다.");
}

function validateRegeneratedDocument(documentId, submittedAt, label) {
  const text = DocumentApp.openById(documentId).getBody().getText();
  const expectedDate = Utilities.formatDate(submittedAt, TIME_ZONE, "yyyy. MM. dd.");
  if (text.indexOf(expectedDate) === -1) throw new Error(`${label}에 최초 제출일이 정상적으로 입력되지 않았습니다.`);
  if (/\{\{[^}]+\}\}/.test(text)) throw new Error(`${label}에 치환되지 않은 템플릿 태그가 남아 있습니다.`);
}

function archiveSupersededDocument(previousPdfUrl, newDocId, folders) {
  const previousPdfId = extractDriveFileId(previousPdfUrl);
  if (!previousPdfId) return "";
  try {
    const previousPdf = DriveApp.getFileById(previousPdfId);
    const baseName = previousPdf.getName().replace(/\.pdf$/i, "");
    previousPdf.moveTo(getOrCreateFolder(folders.pdf, "이전버전"));
    const originals = folders.original.getFilesByName(baseName);
    const originalArchive = getOrCreateFolder(folders.original, "이전버전");
    while (originals.hasNext()) {
      const file = originals.next();
      if (file.getId() !== newDocId) file.moveTo(originalArchive);
    }
  } catch (error) {
    Logger.log("이전 문서 보관 실패: " + error);
  }
  return previousPdfId;
}

function loadCompletedReissueKeys(documentType, version) {
  const sheet = ensureReissueLogSheet(getSpreadsheet());
  const result = {};
  if (sheet.getLastRow() < 2) return result;
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getDisplayValues();
  rows.forEach(function (row) {
    if (row[5] === "개인정보서약서" && documentType === "privacy" && row[6] === version && row[11] === "완료") result[row[3]] = true;
  });
  return result;
}

function appendReissueLog(jobId, record, documentType, version, reason, previousPdfId, generated, status, error) {
  ensureReissueLogSheet(getSpreadsheet()).appendRow([
    jobId, new Date(), record.rowNumber, record.recordKey, record.name, documentType, version, reason,
    previousPdfId || "", generated.docId || "", generated.pdfId || "", status, error || ""
  ]);
}

function safeAppendReissueLog(jobId, record, documentType, version, reason, previousPdfId, generated, status, error) {
  try {
    appendReissueLog(jobId, record, documentType, version, reason, previousPdfId, generated, status, error);
  } catch (logError) {
    Logger.log("문서 재생성 로그 기록 실패: " + logError);
  }
}

function ensureReissueLogSheet(ss) {
  return ensureSheet(ss, REISSUE_LOG_SHEET, [
    "작업ID", "처리시각", "시트행", "원본키", "이름", "문서종류", "템플릿버전", "재생성사유",
    "기존PDFID", "신규원본ID", "신규PDFID", "상태", "오류"
  ]);
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
    if (data.action === "lookupAccessEmployee") return lookupAccessEmployeeResponse(data);
    if (data.action === "saveAccessSignature") return saveAccessSignature(data);
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

function lookupAccessEmployeeResponse(data) {
  requireFields(data, ["name", "dept"]);
  const lookup = findAccessEmployee(data.name, data.dept);
  if (!lookup.matches.length) {
    return jsonResponse({
      result: "success",
      found: false,
      status: lookup.nameMatches.length ? "직원정보불일치" : "없음",
      message: lookup.nameMatches.length
        ? "이름은 확인되지만 부서 정보가 일치하지 않습니다. 담당자에게 문의해 주세요."
        : "이름과 부서가 일치하는 직원을 찾을 수 없습니다."
    });
  }

  const birthKeys = uniqueValues(lookup.matches.map(function (match) { return match.birthKey; }).filter(Boolean));
  if (birthKeys.length !== 1) {
    return jsonResponse({
      result: "success",
      found: false,
      status: "직원정보불일치",
      message: "동일한 이름과 부서의 직원 정보가 둘 이상입니다. 담당자 확인이 필요합니다."
    });
  }

  const alreadySigned = lookup.matches.some(function (match) { return match.status === "있음"; });
  return jsonResponse({
    result: "success",
    found: true,
    alreadySigned: alreadySigned,
    name: lookup.matches[0].name,
    dept: lookup.matches[0].dept,
    message: alreadySigned ? "이미 등록된 서명이 있습니다." : "직원 정보가 확인되었습니다."
  });
}

function saveAccessSignature(data) {
  requireFields(data, ["name", "dept", "signature"]);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("다른 요청을 처리 중입니다. 잠시 후 다시 시도해 주세요.");
  try {
    const lookup = findAccessEmployee(data.name, data.dept);
    if (!lookup.matches.length) {
      updateNamedAccessRows(lookup.nameMatches, "직원정보불일치");
      throw new Error("이름과 부서가 일치하는 직원을 찾을 수 없습니다.");
    }
    if (lookup.matches.some(function (match) { return match.status === "있음"; })) {
      throw new Error("이미 등록된 서명이 있습니다. 재서명은 필요하지 않습니다.");
    }

    const birthKeys = uniqueValues(lookup.matches.map(function (match) { return match.birthKey; }).filter(Boolean));
    if (birthKeys.length !== 1) throw new Error("직원 생년월일 정보를 하나로 확인할 수 없습니다.");

    const saved = saveSignature(lookup.matches[0].name, birthKeys[0], data.signature);
    recordAccessSignature(lookup.matches[0].name, lookup.matches[0].dept, birthKeys[0], saved.url);
    updateNamedAccessRows(lookup.matches, "있음");
    SpreadsheetApp.flush();
    return jsonResponse({ result: "success", driveUrl: saved.url, status: "있음" });
  } finally {
    lock.releaseLock();
  }
}

function findAccessEmployee(name, dept) {
  const targetName = normalizePersonName(name);
  const targetDept = normalizeDepartment(dept);
  const matches = [];
  const nameMatches = [];
  const spreadsheet = SpreadsheetApp.openById(ACCESS_SPREADSHEET_ID);

  spreadsheet.getSheets().forEach(function (sheet) {
    if (!/^\d{4}$/.test(sheet.getName()) || sheet.getLastRow() < 2) return;
    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, ACCESS_STATUS_COLUMN).getDisplayValues();
    values.forEach(function (row, offset) {
      if (normalizePersonName(row[1]) !== targetName) return;
      const record = accessRowRecord(sheet, offset + 2, row);
      nameMatches.push(record);
      if (normalizeDepartment(row[7]) === targetDept) matches.push(record);
    });
  });
  const birthIndex = buildEmployeeBirthIndex();
  nameMatches.forEach(function (record) {
    if (!record.birthKey) record.birthKey = birthIndex[employeeKey(record.name, record.dept)] || "";
  });
  return { matches: matches, nameMatches: nameMatches };
}

function accessRowRecord(sheet, rowNumber, row) {
  return {
    sheet: sheet,
    rowNumber: rowNumber,
    values: row,
    name: String(row[1] || "").trim(),
    requestType: String(row[2] || "").trim(),
    reason: String(row[3] || "").trim(),
    job: String(row[6] || "").trim(),
    dept: String(row[7] || "").trim(),
    birthKey: String(row[10] || "").replace(/[^0-9]/g, "").slice(0, 6),
    date: String(row[12] || "").trim(),
    status: String(row[13] || "").trim()
  };
}

function updateNamedAccessRows(records, status) {
  records.forEach(function (record) {
    record.sheet.getRange(record.rowNumber, ACCESS_STATUS_COLUMN).setValue(status);
  });
}

function recordAccessSignature(name, dept, birthKey, signatureUrl) {
  const sheet = ensureSheet(getSpreadsheet(), ACCESS_SIGNATURE_SHEET, [
    "타임스탬프", "이름", "표준부서", "생년월일6자리", "서명이미지"
  ]);
  const values = sheet.getDataRange().getDisplayValues();
  let rowNumber = 0;
  for (let i = 1; i < values.length; i++) {
    if (normalizePersonName(values[i][1]) === normalizePersonName(name) &&
        normalizeDepartment(values[i][2]) === normalizeDepartment(dept)) {
      rowNumber = i + 1;
      break;
    }
  }
  const row = [new Date(), name, normalizeDepartment(dept), birthKey, signatureUrl];
  if (rowNumber) sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);
}

function normalizePersonName(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

function normalizeDepartment(value) {
  const text = String(value || "").replace(/\s+/g, "").toLowerCase();
  if (!text) return "";
  if (/간호부|간호과|병동|외래|수간호|\b[356]w\b/i.test(text)) return "간호부";
  if (/물리치료센터|작업치료센터|재활.*센터|재활치료/.test(text)) return "재활치료센터";
  if (/영양/.test(text)) return "영양팀";
  return text;
}

function uniqueValues(values) {
  const seen = {};
  return values.filter(function (value) {
    const key = String(value);
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function employeeKey(name, dept) {
  return normalizePersonName(name) + "|" + normalizeDepartment(dept);
}

function buildEmployeeBirthIndex() {
  const result = {};
  const add = function (name, dept, birthValue) {
    const birthKey = String(birthValue || "").replace(/[^0-9]/g, "").slice(0, 6);
    if (!normalizePersonName(name) || !normalizeDepartment(dept) || birthKey.length !== 6) return;
    const key = employeeKey(name, dept);
    if (!result[key]) result[key] = birthKey;
  };

  const accessSpreadsheet = SpreadsheetApp.openById(ACCESS_SPREADSHEET_ID);
  accessSpreadsheet.getSheets().forEach(function (sheet) {
    if (!/^\d{4}$/.test(sheet.getName()) || sheet.getLastRow() < 2) return;
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 11).getDisplayValues();
    rows.forEach(function (row) { add(row[1], row[7], row[10]); });
  });

  const onboarding = getSpreadsheet().getSheetByName(ONBOARDING_SHEET);
  if (onboarding && onboarding.getLastRow() >= 2) {
    onboarding.getDataRange().getDisplayValues().slice(1).forEach(function (row) {
      add(row[1], row[2], row[4]);
    });
  }

  try {
    const registration = SpreadsheetApp.openById(REGISTRATION_SPREADSHEET_ID).getSheetByName(REGISTRATION_SHEET);
    if (registration && registration.getLastRow() >= 2) {
      registration.getDataRange().getDisplayValues().slice(1).forEach(function (row) {
        add(row[2], row[3], row[5]);
      });
    }
  } catch (error) {
    Logger.log("접근권한 직원 생년월일 보완 조회 실패: " + error);
  }
  return result;
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

function refreshAccessSignatureStatuses() {
  const spreadsheet = SpreadsheetApp.openById(ACCESS_SPREADSHEET_ID);
  const signatureIndex = buildAccessSignatureIndex();
  const birthIndex = buildEmployeeBirthIndex();
  const counts = { "있음": 0, "없음": 0, "직원정보불일치": 0 };

  spreadsheet.getSheets().forEach(function (sheet) {
    if (!/^\d{4}$/.test(sheet.getName())) return;
    sheet.getRange(1, ACCESS_STATUS_COLUMN).setValue(ACCESS_STATUS_HEADER);
    if (sheet.getLastRow() < 2) return;

    const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, ACCESS_STATUS_COLUMN);
    const values = range.getDisplayValues();
    const statuses = values.map(function (row, offset) {
      if (!String(row[0] || row[1] || "").trim()) return [""];
      const record = accessRowRecord(sheet, offset + 2, row);
      if (!record.birthKey) record.birthKey = birthIndex[employeeKey(record.name, record.dept)] || "";
      const match = selectAccessSignature(record, signatureIndex);
      counts[match.status] = (counts[match.status] || 0) + 1;
      return [match.status];
    });
    sheet.getRange(2, ACCESS_STATUS_COLUMN, statuses.length, 1).setValues(statuses);
  });
  SpreadsheetApp.flush();
  spreadsheet.toast(
    `있음 ${counts["있음"]}건 / 없음 ${counts["없음"]}건 / 정보불일치 ${counts["직원정보불일치"]}건`,
    "서명 상태 갱신 완료",
    8
  );
  return counts;
}

function buildAccessSignatureIndex() {
  const metadataById = loadSignatureMetadataById();
  const candidates = [];
  const root = DriveApp.getFolderById(DRIVE_ROOT_FOLDER_ID);
  const signatureRoots = [];
  const signatureFolders = root.getFoldersByName("01_서명보관");
  if (signatureFolders.hasNext()) signatureRoots.push(signatureFolders.next());
  signatureRoots.push(DriveApp.getFolderById(EDUCATION_ROOT_FOLDER_ID));

  signatureRoots.forEach(function (folder) {
    collectSignatureImages(folder, candidates, metadataById, 0);
  });
  return candidates;
}

function collectSignatureImages(folder, candidates, metadataById, depth) {
  if (depth > 8) return;
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.getMimeType().indexOf("image/") !== 0 || file.getName().indexOf("서명") === -1) continue;
    const metadata = metadataById[file.getId()] || {};
    candidates.push({
      id: file.getId(),
      file: file,
      title: file.getName(),
      normalizedTitle: normalizePersonName(file.getName()),
      name: metadata.name || "",
      dept: metadata.dept || inferDepartmentFromSignatureName(file.getName()),
      birthKey: metadata.birthKey || extractBirthKeyFromSignatureName(file.getName()),
      modified: file.getLastUpdated().getTime()
    });
  }
  const folders = folder.getFolders();
  while (folders.hasNext()) collectSignatureImages(folders.next(), candidates, metadataById, depth + 1);
}

function loadSignatureMetadataById() {
  const metadata = {};
  const spreadsheet = getSpreadsheet();
  const layouts = [
    { name: ACCESS_SIGNATURE_SHEET, nameIndex: 1, deptIndex: 2, birthIndex: 3, signatureIndex: 4 },
    { name: ONBOARDING_SHEET, nameIndex: 1, deptIndex: 2, birthIndex: 4, signatureIndex: 7 },
    { name: OFFBOARDING_SHEET, nameIndex: 1, deptIndex: 2, birthIndex: -1, signatureIndex: 10 }
  ];
  layouts.forEach(function (layout) {
    const sheet = spreadsheet.getSheetByName(layout.name);
    if (!sheet || sheet.getLastRow() < 2) return;
    const rows = sheet.getDataRange().getDisplayValues();
    for (let i = 1; i < rows.length; i++) {
      const id = extractDriveFileId(rows[i][layout.signatureIndex]);
      if (!id) continue;
      metadata[id] = {
        name: String(rows[i][layout.nameIndex] || "").trim(),
        dept: normalizeDepartment(rows[i][layout.deptIndex]),
        birthKey: layout.birthIndex >= 0
          ? String(rows[i][layout.birthIndex] || "").replace(/[^0-9]/g, "").slice(0, 6)
          : ""
      };
    }
  });
  return metadata;
}

function inferDepartmentFromSignatureName(fileName) {
  const normalized = normalizeDepartment(fileName);
  const knownDepartments = ["간호부", "재활치료센터", "영양팀", "진료부", "원무과", "심사팀", "헤모필리아센터"];
  for (let i = 0; i < knownDepartments.length; i++) {
    if (normalized.indexOf(knownDepartments[i]) !== -1) return knownDepartments[i];
  }
  return "";
}

function extractBirthKeyFromSignatureName(fileName) {
  const fullDate = String(fileName).match(/(?:19|20)(\d{2})[-_. ]?(\d{2})[-_. ]?(\d{2})/);
  if (fullDate) return fullDate[1] + fullDate[2] + fullDate[3];
  const shortDate = String(fileName).match(/(?:^|[_\s])(\d{6})(?:[_\s.]|$)/);
  return shortDate ? shortDate[1] : "";
}

function selectAccessSignature(record, candidates) {
  const name = normalizePersonName(record.name);
  const dept = normalizeDepartment(record.dept);
  const nameMatches = candidates.filter(function (candidate) {
    return normalizePersonName(candidate.name) === name || candidate.normalizedTitle.indexOf(name) !== -1;
  });
  if (!nameMatches.length) return { status: "없음", candidate: null };

  const isDepartmentChange = record.requestType.indexOf("변경") !== -1 || record.reason.indexOf("부서변경") !== -1;
  const valid = nameMatches.filter(function (candidate) {
    if (candidate.dept && normalizeDepartment(candidate.dept) === dept) return true;
    return isDepartmentChange && record.birthKey && candidate.birthKey === record.birthKey;
  });
  if (!valid.length) return { status: "직원정보불일치", candidate: null };
  valid.sort(function (a, b) { return b.modified - a.modified; });
  return { status: "있음", candidate: valid[0] };
}

function generateAccessRequestArchive(year) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("다른 요청서 생성 작업이 진행 중입니다.");
  try {
    const spreadsheet = SpreadsheetApp.openById(ACCESS_SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(String(year));
    if (!sheet || sheet.getLastRow() < 2) throw new Error(`${year}년 데이터가 없습니다.`);

    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, ACCESS_STATUS_COLUMN).getDisplayValues();
    const records = rows.map(function (row, offset) {
      return accessRowRecord(sheet, offset + 2, row);
    }).filter(function (record) {
      return String(record.values[0] || record.name || "").trim();
    });
    const signatureIndex = buildAccessSignatureIndex();
    const birthIndex = buildEmployeeBirthIndex();
    records.forEach(function (record) {
      if (!record.birthKey) record.birthKey = birthIndex[employeeKey(record.name, record.dept)] || "";
    });

    const outputFolder = getAccessArchiveFolder(String(year));
    const createdAt = Utilities.formatDate(new Date(), TIME_ZONE, "yyyyMMdd_HHmmss");
    const baseName = `${year}년 접근권한 요청서_통합_${createdAt}`;
    const docFile = DriveApp.getFileById(ACCESS_TEMPLATE_ID).makeCopy(baseName, outputFolder);
    const templateDoc = DocumentApp.openById(ACCESS_TEMPLATE_ID);
    const templateTable = getFirstBodyTable(templateDoc.getBody());
    if (!templateTable) throw new Error("접근권한 요청서 템플릿의 본문 표를 찾을 수 없습니다.");

    const outputDoc = DocumentApp.openById(docFile.getId());
    const outputBody = outputDoc.getBody();
    outputBody.clear();

    records.forEach(function (record, index) {
      const signatureMatch = selectAccessSignature(record, signatureIndex);
      record.sheet.getRange(record.rowNumber, ACCESS_STATUS_COLUMN).setValue(signatureMatch.status);
      if (index > 0) outputBody.appendPageBreak();
      const pageTable = outputBody.appendTable(templateTable.copy());
      populateAccessRequestPage(pageTable, record, signatureMatch.candidate);
    });
    outputDoc.saveAndClose();
    SpreadsheetApp.flush();

    const pdfFile = outputFolder.createFile(docFile.getAs(MimeType.PDF)).setName(baseName + ".pdf");
    const logSheet = ensureLogSheet(getSpreadsheet());
    logSheet.appendRow([
      Utilities.getUuid(), new Date(), new Date(), `접근권한 ${year}`, "연도별 통합", "완료", "PDF 생성",
      "", docFile.getId(), pdfFile.getId(), "", "", ""
    ]);
    spreadsheet.toast(`${year}년 Google Doc 및 PDF 생성이 완료되었습니다.`, "접근권한 요청서", 8);
    return { docUrl: docFile.getUrl(), pdfUrl: pdfFile.getUrl() };
  } finally {
    lock.releaseLock();
  }
}

function getAccessArchiveFolder(year) {
  const root = DriveApp.getFolderById(DRIVE_ROOT_FOLDER_ID);
  const documents = getOrCreateFolder(root, "02_서류보관");
  const access = getOrCreateFolder(documents, "접근권한 요청서");
  return getOrCreateFolder(access, year + "년");
}

function getFirstBodyTable(body) {
  for (let i = 0; i < body.getNumChildren(); i++) {
    const child = body.getChild(i);
    if (child.getType() === DocumentApp.ElementType.TABLE) return child.asTable();
  }
  return null;
}

function populateAccessRequestPage(pageTable, record, signatureCandidate) {
  const detailsTable = findAccessDetailsTable(pageTable);
  if (!detailsTable) throw new Error(`${record.name} 요청서의 상세 표를 찾을 수 없습니다.`);

  const valueRow = detailsTable.getRow(1);
  valueRow.getCell(0).setText(record.name);
  valueRow.getCell(3).setText(record.job);
  valueRow.getCell(4).setText(record.dept);

  const accessCell = valueRow.getCell(1);
  ["부여", "변경", "말소"].forEach(function (label) {
    accessCell.replaceText(`□ 접근권한 ${label}`, record.requestType.indexOf(label) !== -1 ? `■ 접근권한 ${label}` : `□ 접근권한 ${label}`);
  });
  const reasonCell = valueRow.getCell(2);
  ["입사", "부서변경", "퇴사"].forEach(function (label) {
    reasonCell.replaceText(`□ ${label}`, record.reason.indexOf(label) !== -1 ? `■ ${label}` : `□ ${label}`);
  });

  const dateText = formatAccessDate(record.date);
  pageTable.replaceText("20\\s*년\\s*월\\s*일", dateText);
  const requester = findParagraphContaining(pageTable, "요청자");
  if (requester) {
    requester.clear();
    requester.appendText(`요청자 : ${record.name}  `);
    if (signatureCandidate) {
      requester.appendInlineImage(signatureCandidate.file.getBlob()).setWidth(100).setHeight(60);
    }
    requester.appendText("  (인)");
  }
}

function findAccessDetailsTable(element) {
  if (element.getType && element.getType() === DocumentApp.ElementType.TABLE) {
    const table = element.asTable();
    if (table.getNumRows() >= 2 && table.getRow(0).getNumCells() === 5 && table.getRow(0).getText().indexOf("직원 명") !== -1) {
      return table;
    }
  }
  if (!element.getNumChildren) return null;
  for (let i = 0; i < element.getNumChildren(); i++) {
    const found = findAccessDetailsTable(element.getChild(i));
    if (found) return found;
  }
  return null;
}

function findParagraphContaining(element, text) {
  if (element.getType && element.getType() === DocumentApp.ElementType.PARAGRAPH) {
    const paragraph = element.asParagraph();
    if (paragraph.getText().indexOf(text) !== -1) return paragraph;
  }
  if (!element.getNumChildren) return null;
  for (let i = 0; i < element.getNumChildren(); i++) {
    const found = findParagraphContaining(element.getChild(i), text);
    if (found) return found;
  }
  return null;
}

function formatAccessDate(value) {
  const match = String(value || "").match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  return match ? `${match[1]}년 ${Number(match[2])}월 ${Number(match[3])}일` : String(value || "").trim();
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

function getStorageFolders(isOffboarding, referenceDate) {
  const root = DriveApp.getFolderById(DRIVE_ROOT_FOLDER_ID);
  const folderDate = referenceDate instanceof Date && !isNaN(referenceDate.getTime()) ? referenceDate : new Date();
  const year = Utilities.formatDate(folderDate, TIME_ZONE, "yyyy") + "년";
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
