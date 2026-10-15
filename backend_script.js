/* 네이처요양병원 온보딩/오프보딩 허브 - Google Apps Script Backend */

const SPREADSHEET_ID = "1Ed3IXDyNIICR2bLHJX_RbIrVPjSQBhuS5mHoFvR5obY";
const OJT_SPREADSHEET_ID = "1VeROZKInmmQR1wcpDPjSEPSqvZq5qlNvno1X7267OKg";
const REGISTRATION_SPREADSHEET_ID = "1YsuqFN43YXJCYjIlIkGsPAJPAcRTUGEtMWe2E-DUy_U";
const REGISTRATION_SHEET = "설문지 응답 시트1";
const DRIVE_ROOT_FOLDER_ID = "1fOCZbxN4xAy9bcgTweHk0sd2wvlT4G9J";
const ACCESS_SPREADSHEET_ID = "1jA0_xY3LQJjpaIJcfp7o7IxcSEbmLdGHlkSviNvECD4";
const ACCESS_TEMPLATE_ID = "1jc5Ez2votn4uItriaLUJrbq7vnJZK1mdxKNHwU6De2E";
const EDUCATION_ROOT_FOLDER_ID = "1QboVZaNAR7altzSLrmCLCIgVaPzlsyyA";
const EDUCATION_SPREADSHEET_ID = "1KCKWEIyMc9iOQkRVmHv2i5HchHjYMm5cNCZTyZga17E";
const EDUCATION_SIGNATURE_SHEET = "서명_기록";
const ACCESS_EFFECTIVE_DATE_COLUMN = 13; // M열
const ACCESS_REQUEST_DATE_COLUMN = 14; // N열
const ACCESS_REQUESTER_COLUMN = 15; // O열
const ACCESS_STATUS_COLUMN = 16; // P열
const ACCESS_STATUS_HEADER = "서명 상태";
const ACCESS_REQUESTER_NAME = "김상용";
const ACCESS_PREVIOUS_REQUESTER_NAME = "최창영";
const ACCESS_REQUESTER_CHANGE_DATE_KEY = "20250131";
const ACCESS_REQUESTER_SIGNATURE_FILE_ID = "1-mk4oQakq57yLTxNqT6cnSKFUmEJG6Fw";
const ACCESS_PREVIOUS_REQUESTER_SIGNATURE_FILE_ID = "1gNhF-ck2ONHP3Dt-2zvAxtWvynfZ_vJw";

const TEMPLATE_SAFETY_ID = "1uQvHrouIG94qp-txtvDrwu1n1F_cu_52QaYg7b9emVU";
const TEMPLATE_PRIVACY_ID = "13b98fzAIaf1UtNVmlqqBFyLWQPMDmlnheIKp4jDBoUk";
const TEMPLATE_REGISTRATION_CONSENT_ID = "1t9FK54inmCx6RLAMxnvvwOVEG8O9MB6DZkSS-KVRNOI";
const TEMPLATE_RESIGNATION_ID = "1RZL9NZKAOHarK2mlo0BI9dqljcN7jasJVZ-gtNUzSDk";
const TEMPLATE_SECURITY_OFF_ID = "1HHaNxruT-k21ftyt1IAJzf6sq0q0n6yaODCX19stLjs";

const ONBOARDING_SHEET = "입사자(Onboarding)";
const OFFBOARDING_SHEET = "퇴사자(Offboarding)";
const ACCESS_SIGNATURE_SHEET = "접근권한 서명";
const ACCESS_RULE_SHEET = "접근권한 기준";
const PRIVACY_CONSENT_MISSING_SHEET = "개인정보동의서 누락명단";
const CONFIG_SHEET = "솔라피&슬랙 설정";
const LOG_SHEET = "처리로그";
const REISSUE_LOG_SHEET = "문서재생성로그";
const TIME_ZONE = "Asia/Seoul";
const PRIVACY_REISSUE_VERSION = "privacy-date-style-v3";
const REISSUE_BATCH_SIZE = 20;
const ACCESS_LEGACY_SCAN_CACHE_MS = 6 * 60 * 60 * 1000;
const PRIVACY_SIGNATURE_URL = "https://kisayo11.github.io/nature_onboarding/?view=access-signature";
const ACCESS_RULE_START_COLUMN = 17; // Q열
const ACCESS_RULE_HEADERS = ["권한기준", "대상", "작성", "수정", "열람", "출력", "출력조건"];
const ACCESS_RULE_SHEET_HEADERS = [
  "표준부서", "기준직종/세부업무", "목적", "대상", "작성", "수정", "열람", "출력", "출력조건",
  "부서별칭(|구분)", "직종별칭(|구분)", "기본규칙", "사용여부"
];

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const reissueMenu = ui.createMenu("입사서류 재생성")
    .addItem("선택 행 개인정보서약서 재생성", "regenerateSelectedOnboardingPrivacy")
    .addItem("선택 행 개인정보동의서 재생성", "regenerateSelectedOnboardingConsent")
    .addItem("날짜 누락 개인정보서약서 일괄 재생성", "regenerateMissingDateOnboardingPrivacy")
    .addItem("선택 행 전체 입사서류 재생성", "regenerateSelectedOnboardingDocuments")
    .addSeparator()
    .addItem("기존 개인정보동의서 링크 동기화", "syncOnboardingConsentLinks");
  const privacyArchiveMenu = ui.createMenu("개인정보동의서 연도별 통합")
    .addItem("서명 누락명단 갱신", "refreshPrivacyConsentStatuses")
    .addSeparator()
    .addItem("2025년 통합문서 생성/재생성", "generatePrivacyConsents2025")
    .addItem("2026년 통합문서 생성/재생성", "generatePrivacyConsents2026");

  ui
    .createMenu("🌟 네이처 자동화")
    .addItem("시트 및 설정 초기화", "initializeAllSheets")
    .addSeparator()
    .addSubMenu(reissueMenu)
    .addSubMenu(privacyArchiveMenu)
    .addSeparator()
    .addItem("접근권한 기준표 생성/동기화", "syncAccessRuleAutomation")
    .addItem("접근권한 서명 상태 갱신", "refreshAccessSignatureStatuses")
    .addItem("2025년 접근권한 통합문서 생성", "generateAccessRequests2025")
    .addItem("2026년 접근권한 통합문서 생성", "generateAccessRequests2026")
    .addToUi();
}

function initializeAllSheets() {
  const ss = getSpreadsheet();
  const onboardingSheet = ensureSheet(ss, ONBOARDING_SHEET, [
    "타임스탬프", "이름", "부서", "직종", "생년월일", "연락처", "서류내역", "서명이미지",
    "결과_안전교육", "결과_개인정보", "결과_개인정보동의서"
  ]);
  ensureOnboardingResultHeaders(onboardingSheet);
  ensureSheet(ss, OFFBOARDING_SHEET, [
    "타임스탬프", "이름", "부서", "직종", "사직일", "사직사유", "출입카드 반납여부", "검사및유니폼여부", "개인 IRP 계좌 사본 제출여부", "서류내역", "서명이미지", "결과_사직서", "결과_보안서약"
  ]);
  ensureSheet(ss, ACCESS_SIGNATURE_SHEET, [
    "타임스탬프", "이름", "표준부서", "생년월일6자리", "서명이미지"
  ]);
  ensurePrivacyConsentMissingSheet(ss);
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
  ensureAccessRuleSheet(accessSpreadsheet);
  accessSpreadsheet.getSheets().forEach(function (sheet) {
    if (/^\d{4}$/.test(sheet.getName())) {
      ensureAccessYearSheetLayout(sheet);
      normalizeAccessRequesterRows(sheet);
    }
  });

  refreshAccessSignatureStatuses();
}

function syncAccessRuleAutomation() {
  const spreadsheet = SpreadsheetApp.openById(ACCESS_SPREADSHEET_ID);
  const sheet = ensureAccessRuleSheet(spreadsheet);
  refreshAccessSignatureStatuses();
  spreadsheet.toast("접근권한 기준표와 연도별 권한 값이 동기화되었습니다.", "접근권한 기준", 8);
  return { sheetName: sheet.getName(), sheetUrl: accessRuleSheetUrl(sheet) };
}

function generateAccessRequests2025() {
  return generateAccessRequestArchive("2025");
}

function generateAccessRequests2026() {
  return generateAccessRequestArchive("2026");
}

function generateSelectedAccessRequestDocument() {
  const ui = SpreadsheetApp.getUi();
  let year = "";
  let rowNumber = 0;
  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheet = activeSpreadsheet && activeSpreadsheet.getActiveSheet();
  const activeRange = activeSheet && activeSheet.getActiveRange();

  if (activeSpreadsheet && activeSpreadsheet.getId() === ACCESS_SPREADSHEET_ID &&
      activeSheet && /^\d{4}$/.test(activeSheet.getName()) && activeRange && activeRange.getRow() >= 2) {
    year = activeSheet.getName();
    rowNumber = activeRange.getRow();
  } else {
    const response = ui.prompt(
      "접근권한 개별 GDoc 생성",
      "연도와 행번호를 쉼표로 입력하세요. 예: 2026,15",
      ui.ButtonSet.OK_CANCEL
    );
    if (response.getSelectedButton() !== ui.Button.OK) return null;
    const match = response.getResponseText().trim().match(/^(20\d{2})\s*[,，\s]\s*(\d+)$/);
    if (!match || Number(match[2]) < 2) {
      ui.alert("입력 오류", "예: 2026,15 형식으로 입력해 주세요.", ui.ButtonSet.OK);
      return null;
    }
    year = match[1];
    rowNumber = Number(match[2]);
  }

  const result = generateAccessRequestDocument(year, rowNumber);
  ui.alert("개별 GDoc 생성 완료", `${result.name}\n${result.docUrl}`, ui.ButtonSet.OK);
  return result;
}

function generatePrivacyConsents2025() {
  return generatePrivacyConsentArchive("2025");
}

function generatePrivacyConsents2026() {
  return generatePrivacyConsentArchive("2026");
}

function regenerateSelectedOnboardingPrivacy() {
  runSelectedOnboardingReissue(["privacy"], "관리자 선택 재생성");
}

function regenerateSelectedOnboardingConsent() {
  runSelectedOnboardingReissue(["consent"], "관리자 선택 재생성");
}

function regenerateSelectedOnboardingDocuments() {
  runSelectedOnboardingReissue(["safety", "privacy", "consent"], "관리자 선택 전체 재생성");
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
    const labels = documentTypes.map(onboardingDocumentLabel).join(", ");
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

function syncOnboardingConsentLinks() {
  const ui = SpreadsheetApp.getUi();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    ui.alert("동기화 실패", "다른 문서 작업이 진행 중입니다. 잠시 후 다시 시도해 주세요.", ui.ButtonSet.OK);
    return;
  }
  try {
    const onboardingSheet = getSpreadsheet().getSheetByName(ONBOARDING_SHEET);
    if (!onboardingSheet || onboardingSheet.getLastRow() < 2) throw new Error("입사자 마스터 기록이 없습니다.");
    ensureOnboardingResultHeaders(onboardingSheet);

    const registrationSheet = SpreadsheetApp.openById(REGISTRATION_SPREADSHEET_ID).getSheetByName(REGISTRATION_SHEET);
    if (!registrationSheet || registrationSheet.getLastRow() < 2) throw new Error("인사등록 응답 기록이 없습니다.");
    const consentIndex = buildRegistrationConsentIndex(registrationSheet);
    const rows = onboardingSheet.getRange(2, 1, onboardingSheet.getLastRow() - 1, 11).getValues();
    let updated = 0;
    let alreadyLinked = 0;
    let unmatched = 0;
    const consentValues = rows.map(function (row) {
      const currentUrl = String(row[10] || "").trim();
      if (currentUrl) {
        alreadyLinked++;
        return [currentUrl];
      }
      const key = onboardingIdentityKey(row[1], row[4]);
      const match = consentIndex[key];
      if (!match) {
        unmatched++;
        return [""];
      }
      updated++;
      return [match.url];
    });
    onboardingSheet.getRange(2, 11, consentValues.length, 1).setValues(consentValues);
    SpreadsheetApp.flush();
    ui.alert(
      "개인정보동의서 링크 동기화 완료",
      `신규 연결 ${updated}건 / 기존 연결 ${alreadyLinked}건 / 일치 자료 없음 ${unmatched}건`,
      ui.ButtonSet.OK
    );
  } catch (error) {
    ui.alert("동기화 실패", error.message || String(error), ui.ButtonSet.OK);
  } finally {
    lock.releaseLock();
  }
}

function buildRegistrationConsentIndex(sheet) {
  const values = sheet.getDataRange().getValues();
  const displayValues = sheet.getDataRange().getDisplayValues();
  const result = {};
  for (let i = 1; i < values.length; i++) {
    const url = String(displayValues[i][15] || "").trim();
    if (!url) continue;
    const key = onboardingIdentityKey(displayValues[i][2], displayValues[i][5]);
    if (!key) continue;
    const timestamp = values[i][0] instanceof Date ? values[i][0].getTime() : new Date(values[i][0]).getTime();
    if (!result[key] || timestamp > result[key].timestamp) result[key] = { url: url, timestamp: timestamp || 0 };
  }
  return result;
}

function onboardingIdentityKey(name, birthValue) {
  const normalizedName = normalizePersonName(name);
  const digits = String(birthValue instanceof Date ? Utilities.formatDate(birthValue, TIME_ZONE, "yyyyMMdd") : birthValue || "").replace(/[^0-9]/g, "");
  let birthKey = digits.slice(0, 6);
  if (digits.length >= 8 && /^(19|20)/.test(digits)) birthKey = digits.slice(2, 8);
  return normalizedName && birthKey.length === 6 ? normalizedName + "|" + birthKey : "";
}

function ensureOnboardingResultHeaders(sheet) {
  if (!sheet) return;
  sheet.getRange(1, 9, 1, 3).setValues([["결과_안전교육", "결과_개인정보", "결과_개인정보동의서"]]);
}

function readOnboardingRecord(sheet, rowNumber) {
  const values = sheet.getRange(rowNumber, 1, 1, 11).getValues()[0];
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
    previousPrivacyUrl: String(values[9] || "").trim(),
    previousConsentUrl: String(values[10] || "").trim()
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
    docType: record.docType,
    privacyConsent: "동의함"
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
    if (documentTypes.indexOf("consent") !== -1) {
      generated.consent = generateDocument(TEMPLATE_REGISTRATION_CONSENT_ID, "개인정보수집이용동의서", data, signatureId, record.submittedAt, folders, createdFileIds);
      validateRegeneratedDocument(generated.consent.docId, record.submittedAt, "개인정보 수집·이용 동의서");
    }

    const newLinks = [[
      generated.safety ? generated.safety.url : record.previousSafetyUrl,
      generated.privacy ? generated.privacy.url : record.previousPrivacyUrl,
      generated.consent ? generated.consent.url : record.previousConsentUrl
    ]];
    ensureOnboardingResultHeaders(record.sheet);
    record.sheet.getRange(record.rowNumber, 9, 1, 3).setValues(newLinks);
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
    if (generated.consent) {
      const previousId = archiveSupersededDocument(record.previousConsentUrl, generated.consent.docId, folders);
      safeAppendReissueLog(jobId, record, "개인정보 수집·이용 동의서", version, reason, previousId, generated.consent, "완료", "");
    }
    return generated;
  } catch (error) {
    if (!linksUpdated) trashFiles(createdFileIds);
    documentTypes.forEach(function (type) {
      safeAppendReissueLog(jobId, record, onboardingDocumentLabel(type), version, reason, "", generated[type] || {}, "실패", error.message || String(error));
    });
    throw error;
  }
}

function onboardingDocumentLabel(type) {
  if (type === "privacy") return "개인정보서약서";
  if (type === "consent") return "개인정보 수집·이용 동의서";
  return "안전보건교육";
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
    if (params.action === "getAccessRule") {
      return getAccessRuleResponse(params);
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
  requireFields(data, ["privacyConsent", "name", "residentNumber", "phone", "email", "emergencyContact", "hireDate", "signature"]);
  if (data.privacyConsent !== "동의함") throw new Error("개인정보 수집·이용 동의가 필요합니다.");
  if (data.accessConsent !== true) throw new Error("접근권한 부여요청 확인 및 동의가 필요합니다.");

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
    upsertSubmission(data, false, signature.url, docSafety.url, docPrivacy.url, timestamp, docConsent.url);
    const accessSync = safeSyncAccessRequest(data, false, signature.url, timestamp);

    // 알림 발송 (Slack / Solapi SMS)
    sendCompletionNotifications(data, false, [docSafety, docPrivacy, docConsent], timestamp);

    return jsonResponse({
      result: "success",
      consentUrl: docConsent.url,
      safetyUrl: docSafety.url,
      privacyUrl: docPrivacy.url,
      accessStatus: accessSync.status,
      accessMessage: accessSync.message || "",
      accessRuleStatus: accessSync.accessRuleStatus || ""
    });
  } catch (error) {
    trashFiles(createdFileIds);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function lookupAccessEmployeeResponse(data) {
  requireFields(data, ["name", "dept", "birth"]);
  const birthKey = privacyBirthKey(data.birth);
  if (!birthKey) throw new Error("생년월일 6자리를 정확히 입력해 주세요.");
  const lookup = findSignatureRegistrationEmployee(data.name, data.dept, birthKey);
  if (!lookup.matches.length) {
    let message = "이름과 부서가 일치하는 직원을 찾을 수 없습니다.";
    if (lookup.departmentMatches.length) {
      message = "생년월일이 직원 정보와 일치하지 않습니다. 담당자에게 문의해 주세요.";
    } else if (lookup.nameMatches.length) {
      message = "이름은 확인되지만 부서 정보가 일치하지 않습니다. 담당자에게 문의해 주세요.";
    }
    return jsonResponse({
      result: "success",
      found: false,
      status: lookup.nameMatches.length ? "직원정보불일치" : "없음",
      message: message
    });
  }

  const employee = lookup.matches[0];
  const alreadySigned = lookup.accessRecords.some(function (match) { return match.status === "있음"; }) ||
    hasRecordedAccessSignature(employee.name, employee.dept, birthKey);
  return jsonResponse({
    result: "success",
    found: true,
    alreadySigned: alreadySigned,
    name: employee.name,
    dept: employee.dept,
    message: alreadySigned ? "이미 등록된 서명이 있습니다." : "직원 정보가 확인되었습니다."
  });
}

function saveAccessSignature(data) {
  requireFields(data, ["name", "dept", "birth", "signature"]);
  const birthKey = privacyBirthKey(data.birth);
  if (!birthKey) throw new Error("생년월일 6자리를 정확히 입력해 주세요.");
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("다른 요청을 처리 중입니다. 잠시 후 다시 시도해 주세요.");
  try {
    const lookup = findSignatureRegistrationEmployee(data.name, data.dept, birthKey);
    if (!lookup.matches.length) {
      updateNamedAccessRows(lookup.accessNameMatches, "직원정보불일치");
      if (lookup.departmentMatches.length) throw new Error("생년월일이 직원 정보와 일치하지 않습니다.");
      throw new Error("이름과 부서가 일치하는 직원을 찾을 수 없습니다.");
    }
    const employee = lookup.matches[0];
    if (lookup.accessRecords.some(function (match) { return match.status === "있음"; }) ||
        hasRecordedAccessSignature(employee.name, employee.dept, birthKey)) {
      throw new Error("이미 등록된 서명이 있습니다. 재서명은 필요하지 않습니다.");
    }

    const saved = saveSignature(employee.name, birthKey, data.signature);
    recordAccessSignature(employee.name, employee.dept, birthKey, saved.url);
    updateNamedAccessRows(lookup.accessRecords, "있음");
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

function findSignatureRegistrationEmployee(name, dept, birthKey) {
  const accessLookup = findAccessEmployee(name, dept);
  const privacyLookup = findPrivacyConsentEmployee(name, dept);
  const departmentMatches = accessLookup.matches.length ? accessLookup.matches : privacyLookup.matches;
  const matches = departmentMatches.filter(function (record) {
    return !record.birthKey || record.birthKey === birthKey;
  });
  const accessRecords = matches.filter(function (record) { return record.sourceType === "access"; });
  return {
    matches: matches,
    departmentMatches: departmentMatches,
    accessRecords: accessRecords,
    accessNameMatches: accessLookup.nameMatches,
    nameMatches: accessLookup.nameMatches.concat(privacyLookup.nameMatches)
  };
}

function findPrivacyConsentEmployee(name, dept) {
  const targetName = normalizePersonName(name);
  const targetDept = normalizeDepartment(dept);
  const birthIndex = buildPrivacyEmployeeBirthIndex();
  const records = [];
  ["2025", "2026"].forEach(function (year) {
    buildPrivacyConsentRoster(year).forEach(function (record) {
      const employeeBirth = birthIndex.byEmployee[employeeKey(record.name, record.dept)] || "";
      const nameBirths = birthIndex.byName[normalizePersonName(record.name)] || [];
      record.birthKey = record.birthKey || employeeBirth || (nameBirths.length === 1 ? nameBirths[0] : "");
      record.sourceType = "privacy";
      records.push(record);
    });
  });
  const nameMatches = deduplicatePrivacyConsentRoster(records).filter(function (record) {
    return normalizePersonName(record.name) === targetName;
  });
  const matches = nameMatches.filter(function (record) {
    return normalizeDepartment(record.dept) === targetDept;
  });
  return { matches: matches, nameMatches: nameMatches };
}

function hasRecordedAccessSignature(name, dept, birthKey) {
  const sheet = getSpreadsheet().getSheetByName(ACCESS_SIGNATURE_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return false;
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getDisplayValues();
  return rows.some(function (row) {
    return normalizePersonName(row[1]) === normalizePersonName(name) &&
      normalizeDepartment(row[2]) === normalizeDepartment(dept) &&
      privacyBirthKey(row[3]) === birthKey &&
      !!extractDriveFileId(row[4]);
  });
}

function accessRowRecord(sheet, rowNumber, row) {
  return {
    sourceType: "access",
    sheet: sheet,
    rowNumber: rowNumber,
    values: row,
    name: String(row[1] || "").trim(),
    requestType: String(row[2] || "").trim(),
    reason: String(row[3] || "").trim(),
    job: String(row[6] || "").trim(),
    dept: String(row[7] || "").trim(),
    birthKey: privacyBirthKey(row[10]) || privacyBirthKey(row[9]),
    date: String(row[12] || "").trim(),
    requestDate: String(row[13] || "").trim(),
    requester: String(row[14] || accessRequesterNameForDate(row[13] || row[12])).trim() || accessRequesterNameForDate(row[13] || row[12]),
    status: String(row[15] || "").trim()
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
  const targetBirthKey = String(birthKey || "").replace(/[^0-9]/g, "").slice(0, 6);
  let rowNumber = 0;
  for (let i = 1; i < values.length; i++) {
    if (normalizePersonName(values[i][1]) === normalizePersonName(name) &&
        normalizeDepartment(values[i][2]) === normalizeDepartment(dept) &&
        (!targetBirthKey || String(values[i][3] || "").replace(/[^0-9]/g, "").slice(0, 6) === targetBirthKey)) {
      rowNumber = i + 1;
      break;
    }
  }
  const row = [new Date(), name, normalizeDepartment(dept), targetBirthKey, signatureUrl];
  if (rowNumber) sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);
}

function defaultAccessRules() {
  return [
    ["진료부", "의사", "진료", "해당 환자", "O", "O", "O", "X", "", "진료과|의료진", "의사|전문의", "TRUE", "TRUE"],
    ["진료부", "당직의", "진료", "재원 환자", "O", "O", "O", "X", "", "진료과|의료진", "당직의", "FALSE", "TRUE"],
    ["간호부", "간호사", "환자간호", "재원 환자", "O", "O", "O", "X", "퇴원간호계획지·향정신성의약품 관련 지정 서식만 출력 가능", "간호과|병동|외래", "간호사|RN", "TRUE", "TRUE"],
    ["간호부", "간호조무사", "환자간호", "재원 환자", "O", "O", "O", "X", "", "간호과|병동", "간호조무사|AN", "FALSE", "TRUE"],
    ["간호부", "외래간호", "외래환자", "해당 환자", "X", "X", "O", "X", "", "외래", "외래간호|외래간호사", "FALSE", "TRUE"],
    ["환자안전전담", "QPS실", "환자안전 관리담당", "재원 환자", "X", "X", "O", "O", "권한을 부여받은 지정 서식만 작성·수정 가능", "환자안전|QPS", "QPS실|환자안전전담", "TRUE", "TRUE"],
    ["감염관리실", "감염관리", "감염 관리", "재원 환자", "X", "X", "O", "X", "권한을 부여받은 지정 서식만 작성·수정 가능", "감염관리", "감염관리|감염관리전담", "TRUE", "TRUE"],
    ["약제과", "약사", "약물관리", "해당 환자", "X", "X", "O", "X", "처방전만 출력 가능", "약제실|약국", "약사", "TRUE", "TRUE"],
    ["임상병리실", "임상병리사", "검사시행·결과확인", "해당 환자", "O", "O", "O", "X", "", "검사실", "임상병리사", "TRUE", "TRUE"],
    ["영상검사실", "방사선사", "검사시행·결과확인", "해당 환자", "X", "X", "O", "X", "지정 검사만 가능", "영상의학과|방사선실", "방사선사", "TRUE", "TRUE"],
    ["재활치료센터", "물리치료사", "물리치료", "해당 환자", "O", "O", "O", "X", "권한을 부여받은 지정 서식만 작성·수정 가능", "물리치료센터|재활센터", "물리치료사|PT", "TRUE", "TRUE"],
    ["재활치료센터", "작업치료사", "작업치료", "해당 환자", "O", "O", "O", "X", "권한을 부여받은 지정 서식만 작성·수정 가능", "작업치료센터|재활센터", "작업치료사|OT", "FALSE", "TRUE"],
    ["재활치료센터", "언어재활사", "언어치료", "해당 환자", "O", "O", "O", "X", "권한을 부여받은 지정 서식만 작성·수정 가능", "언어치료실|재활센터", "언어재활사|언어치료사|ST", "FALSE", "TRUE"],
    ["사회사업실", "사회복지사", "사회사업·상담", "해당 환자", "O", "O", "O", "X", "권한을 부여받은 지정 서식만 작성·수정 가능", "사회사업", "사회복지사", "TRUE", "TRUE"],
    ["영양팀", "영양사", "영양관리", "재원 환자", "O", "O", "O", "X", "영양 상담 관련 업무 서식 출력 가능", "영양실", "영양사", "TRUE", "TRUE"],
    ["영양팀", "조리원", "급식업무", "해당 없음", "X", "X", "X", "X", "의무기록 접근권한 해당 없음", "영양실|조리실", "조리원|조리사", "FALSE", "TRUE"],
    ["원무과", "원무행정", "원무행정", "재원 환자", "X", "X", "O", "O", "", "원무|원무행정", "원무행정|원무과", "TRUE", "TRUE"],
    ["심사팀", "심사/청구", "심사·청구", "재원 환자", "X", "X", "O", "O", "", "심사과|보험심사", "심사|청구|보건정보관리사", "TRUE", "TRUE"],
    ["보건의료정보관리", "의무기록관리", "의무기록관리", "재원 환자", "X", "X", "O", "O", "", "의무기록실", "보건의료정보관리사|의무기록사", "TRUE", "TRUE"],
    ["전산", "전산관리", "전산관리", "프로그램 관리", "X", "X", "O", "X", "", "전산실", "전산|전산관리", "TRUE", "TRUE"],
    ["시설 미화팀", "시설관리", "시설관리", "해당 없음", "X", "X", "X", "X", "의무기록 접근권한 해당 없음", "시설팀|시설관리", "시설관리", "TRUE", "TRUE"],
    ["시설 미화팀", "미화", "환경관리", "해당 없음", "X", "X", "X", "X", "의무기록 접근권한 해당 없음", "미화팀|환경미화", "미화|환경미화", "FALSE", "TRUE"]
  ];
}

function ensureAccessRuleSheet(spreadsheet) {
  spreadsheet = spreadsheet || SpreadsheetApp.openById(ACCESS_SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(ACCESS_RULE_SHEET);
  const isNew = !sheet;
  if (!sheet) sheet = spreadsheet.insertSheet(ACCESS_RULE_SHEET);
  sheet.getRange(1, 1, 1, ACCESS_RULE_SHEET_HEADERS.length).setValues([ACCESS_RULE_SHEET_HEADERS]);
  if (sheet.getLastRow() < 2) {
    const rules = defaultAccessRules();
    sheet.getRange(2, 1, rules.length, ACCESS_RULE_SHEET_HEADERS.length).setValues(rules);
  }
  sheet.setFrozenRows(1);
  sheet.setTabColor("#0F766E");
  sheet.getRange(1, 1, 1, ACCESS_RULE_SHEET_HEADERS.length)
    .setBackground("#E2E8F0")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
  sheet.getRange(2, 5, Math.max(sheet.getLastRow() - 1, 1), 4).setHorizontalAlignment("center");
  sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 2), ACCESS_RULE_SHEET_HEADERS.length).setWrap(true);
  sheet.setColumnWidths(1, 4, 120);
  sheet.setColumnWidths(5, 4, 65);
  sheet.setColumnWidth(9, 260);
  sheet.setColumnWidths(10, 2, 190);
  sheet.setColumnWidths(12, 2, 85);

  if (isNew || !sheet.getFilter()) {
    if (sheet.getFilter()) sheet.getFilter().remove();
    sheet.getRange(1, 1, sheet.getLastRow(), ACCESS_RULE_SHEET_HEADERS.length).createFilter();
  }
  const oxValidation = SpreadsheetApp.newDataValidation().requireValueInList(["O", "X"], true).setAllowInvalid(false).build();
  const boolValidation = SpreadsheetApp.newDataValidation().requireValueInList(["TRUE", "FALSE"], true).setAllowInvalid(false).build();
  if (sheet.getMaxRows() >= 2) {
    sheet.getRange(2, 5, sheet.getMaxRows() - 1, 4).setDataValidation(oxValidation);
    sheet.getRange(2, 12, sheet.getMaxRows() - 1, 2).setDataValidation(boolValidation);
  }
  return sheet;
}

function accessRuleSheetUrl(sheet) {
  return "https://docs.google.com/spreadsheets/d/" + ACCESS_SPREADSHEET_ID + "/edit#gid=" + sheet.getSheetId();
}

function getAccessRuleResponse(data) {
  const ruleSheet = ensureAccessRuleSheet();
  const rule = resolveAccessRule(data.dept || "", data.job || "", ruleSheet);
  return jsonResponse({
    result: "success",
    templateId: ACCESS_TEMPLATE_ID,
    ruleSheetUrl: accessRuleSheetUrl(ruleSheet),
    rule: rule
  });
}

function resolveAccessRule(dept, job, ruleSheet) {
  ruleSheet = ruleSheet || ensureAccessRuleSheet();
  const targetDept = normalizeRuleText(normalizeDepartment(dept));
  const targetJob = normalizeRuleText(job);
  if (!targetDept && !targetJob) return { matched: false, status: "입력대기" };
  const rows = ruleSheet.getRange(2, 1, ruleSheet.getLastRow() - 1, ACCESS_RULE_SHEET_HEADERS.length).getDisplayValues();
  const candidates = [];

  rows.forEach(function (row) {
    if (String(row[12] || "TRUE").toUpperCase() === "FALSE") return;
    const deptTokens = ruleTokens([row[0], row[9]].join("|"));
    const jobTokens = ruleTokens([row[1], row[10]].join("|"));
    const deptScore = ruleMatchScore(targetDept, deptTokens);
    if (!deptScore) return;
    const jobScore = ruleMatchScore(targetJob, jobTokens);
    candidates.push({ row: row, score: (deptScore * 10) + (jobScore * 100), jobScore: jobScore });
  });

  let selected = candidates.filter(function (candidate) { return candidate.jobScore > 0; })
    .sort(function (a, b) { return b.score - a.score; })[0];
  let status = "자동결정";
  if (!selected) {
    selected = candidates.filter(function (candidate) {
      return String(candidate.row[11] || "").toUpperCase() === "TRUE";
    })[0];
    status = selected ? "부서기본규칙" : "기준확인필요";
  }
  if (!selected) return { matched: false, status: "기준확인필요", dept: dept, job: job };

  const row = selected.row;
  return {
    matched: true,
    status: status,
    department: row[0],
    role: row[1],
    purpose: row[2],
    target: row[3],
    create: row[4],
    edit: row[5],
    read: row[6],
    print: row[7],
    printCondition: row[8]
  };
}

function normalizeRuleText(value) {
  return String(value || "").toLowerCase().replace(/[\s()/_-]+/g, "").trim();
}

function ruleTokens(value) {
  return String(value || "").split("|").map(function (token) {
    return normalizeRuleText(normalizeDepartment(token));
  }).filter(Boolean);
}

function ruleMatchScore(target, tokens) {
  if (!target) return 0;
  let score = 0;
  tokens.forEach(function (token) {
    if (target === token) score = Math.max(score, 3);
    else if (target.indexOf(token) !== -1 || token.indexOf(target) !== -1) score = Math.max(score, 2);
  });
  return score;
}

function safeSyncAccessRequest(data, isOffboarding, signatureUrl, timestamp) {
  try {
    const result = syncAccessRequest(data, isOffboarding, signatureUrl, timestamp);
    return {
      status: "success",
      message: "",
      year: result.year,
      rowNumber: result.rowNumber,
      accessRuleStatus: result.accessRuleStatus
    };
  } catch (error) {
    Logger.log("접근권한 대장 자동 연결 실패: " + error);
    return { status: "failed", message: error.message || String(error) };
  }
}

function syncAccessRequest(data, isOffboarding, signatureUrl, timestamp) {
  const eventDate = isOffboarding ? data.resignDate : data.hireDate;
  const dateParts = accessDateParts(eventDate);
  if (!dateParts) throw new Error(isOffboarding ? "퇴사일을 확인할 수 없습니다." : "입사일을 확인할 수 없습니다.");

  const spreadsheet = SpreadsheetApp.openById(ACCESS_SPREADSHEET_ID);
  const sheet = getOrCreateAccessYearSheet(spreadsheet, dateParts.year);
  ensureAccessYearSheetLayout(sheet);
  const lastRow = sheet.getLastRow();
  const values = lastRow >= 2
    ? sheet.getRange(2, 1, lastRow - 1, ACCESS_STATUS_COLUMN).getDisplayValues()
    : [];
  const targetName = normalizePersonName(data.name);
  const targetDept = normalizeDepartment(data.dept || data.department);
  const requestType = isOffboarding ? "접근권한 말소" : "접근권한 부여";
  const reason = isOffboarding ? "퇴사" : "입사";
  const dateKey = dateParts.key;
  let rowNumber = 0;

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (normalizePersonName(row[1]) !== targetName || normalizeDepartment(row[7]) !== targetDept) continue;
    if (String(row[2] || "").indexOf(isOffboarding ? "말소" : "부여") === -1) continue;
    if (String(row[3] || "").indexOf(reason) === -1) continue;
    const existingDate = accessDateParts(row[12] || (isOffboarding ? row[5] : row[4]));
    if (existingDate && existingDate.key === dateKey) {
      rowNumber = i + 2;
      break;
    }
  }

  const displayDate = `${dateParts.year}. ${dateParts.month}. ${dateParts.day}.`;
  const requestDateParts = accessDateParts(timestamp) || dateParts;
  const requestDisplayDate = `${requestDateParts.year}. ${requestDateParts.month}. ${requestDateParts.day}.`;
  const requesterName = accessRequesterNameForDate(requestDisplayDate);
  const department = canonicalAccessDepartment(data.dept || data.department);
  const accessRule = resolveAccessRule(department, data.job || "");
  const ruleValues = accessRuleColumnValues(accessRule);
  const nextSequence = values.reduce(function (max, row) {
    const value = Number(String(row[0] || "").replace(/[^0-9]/g, ""));
    return isNaN(value) ? max : Math.max(max, value);
  }, 0) + 1;
  const newRow = [
    nextSequence,
    data.name,
    requestType,
    reason,
    isOffboarding ? "" : displayDate,
    isOffboarding ? displayDate : "",
    data.job || "",
    department,
    data.position || "",
    data.phone || findPhoneByNameAndBirth(data.name, data.birth),
    data.residentNumber || String(data.birth || "").replace(/[^0-9]/g, "").slice(0, 6),
    "",
    displayDate,
    requestDisplayDate,
    requesterName,
    "있음"
  ].concat(ruleValues);

  if (!rowNumber) {
    rowNumber = Math.max(lastRow + 1, 2);
    const formatSourceRow = lastRow >= 2 ? lastRow : 2;
    if (sheet.getMaxRows() < rowNumber) sheet.insertRowAfter(sheet.getMaxRows());
    if (sheet.getMaxRows() >= formatSourceRow) {
      sheet.getRange(formatSourceRow, 1, 1, ACCESS_RULE_START_COLUMN + ACCESS_RULE_HEADERS.length - 1)
        .copyTo(sheet.getRange(rowNumber, 1, 1, ACCESS_RULE_START_COLUMN + ACCESS_RULE_HEADERS.length - 1), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    }
    sheet.getRange(rowNumber, 1, 1, newRow.length).setValues([newRow]);
  } else {
    const current = sheet.getRange(rowNumber, 1, 1, newRow.length).getDisplayValues()[0];
    newRow.forEach(function (value, index) {
      if (!String(current[index] || "").trim() || [2, 3, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].indexOf(index) !== -1) {
        sheet.getRange(rowNumber, index + 1).setValue(value);
      }
    });
  }

  recordAccessSignature(data.name, department, String(data.birth || data.residentNumber || "").replace(/[^0-9]/g, "").slice(0, 6), signatureUrl);
  sheet.getRange(rowNumber, ACCESS_STATUS_COLUMN).setValue("있음");
  SpreadsheetApp.flush();
  return { year: dateParts.year, rowNumber: rowNumber, accessRuleStatus: accessRule.status };
}

function getOrCreateAccessYearSheet(spreadsheet, year) {
  let sheet = spreadsheet.getSheetByName(String(year));
  if (!sheet) {
    const source = spreadsheet.getSheets().filter(function (candidate) {
      return /^\d{4}$/.test(candidate.getName());
    }).sort(function (a, b) {
      return Number(b.getName()) - Number(a.getName());
    })[0];

    if (source) {
      sheet = source.copyTo(spreadsheet).setName(String(year));
      if (sheet.getMaxRows() > 1) {
        sheet.getRange(2, 1, sheet.getMaxRows() - 1, sheet.getMaxColumns()).clearContent();
      }
    } else {
      sheet = spreadsheet.insertSheet(String(year));
      sheet.getRange(1, 1, 1, ACCESS_RULE_START_COLUMN + ACCESS_RULE_HEADERS.length - 1).setValues([[
        "순번", "직원명", "접근권한 요청항목", "요청사유", "입사일", "퇴사일", "직종",
        "부서", "직위", "휴대폰", "주민등록번호", "면허번호", "날짜", "요청날짜", "요청자", ACCESS_STATUS_HEADER
      ].concat(ACCESS_RULE_HEADERS)]);
    }
  }
  ensureAccessYearSheetLayout(sheet);
  return sheet;
}

function ensureAccessYearSheetLayout(sheet) {
  const requiredColumns = ACCESS_RULE_START_COLUMN + ACCESS_RULE_HEADERS.length - 1;
  if (sheet.getMaxColumns() < requiredColumns) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), requiredColumns - sheet.getMaxColumns());
  }
  sheet.getRange(1, ACCESS_REQUEST_DATE_COLUMN).setValue("요청날짜");
  sheet.getRange(1, ACCESS_REQUESTER_COLUMN).setValue("요청자");
  sheet.getRange(1, ACCESS_STATUS_COLUMN).setValue(ACCESS_STATUS_HEADER);
  sheet.getRange(1, ACCESS_RULE_START_COLUMN, 1, ACCESS_RULE_HEADERS.length).setValues([ACCESS_RULE_HEADERS]);
  sheet.setFrozenRows(1);
}

function normalizeAccessRequesterRows(sheet) {
  if (sheet.getLastRow() < 2) return;
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, ACCESS_REQUEST_DATE_COLUMN).getDisplayValues();
  const requesters = rows.map(function (row) {
    return [String(row[1] || "").trim() ? accessRequesterNameForDate(row[13] || row[12]) : ""];
  });
  sheet.getRange(2, ACCESS_REQUESTER_COLUMN, requesters.length, 1).setValues(requesters);
}

function accessRequesterNameForDate(value) {
  const parts = accessDateParts(value);
  if (!parts) return ACCESS_REQUESTER_NAME;
  return parts.key < ACCESS_REQUESTER_CHANGE_DATE_KEY ? ACCESS_PREVIOUS_REQUESTER_NAME : ACCESS_REQUESTER_NAME;
}

function accessRuleColumnValues(accessRule) {
  return accessRule && accessRule.matched
    ? [`${accessRule.department} / ${accessRule.role} / ${accessRule.purpose}`, accessRule.target, accessRule.create, accessRule.edit, accessRule.read, accessRule.print, accessRule.printCondition || ""]
    : ["기준확인필요", "", "", "", "", "", ""];
}

function accessDateParts(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return {
      year: Utilities.formatDate(value, TIME_ZONE, "yyyy"),
      month: Number(Utilities.formatDate(value, TIME_ZONE, "M")),
      day: Number(Utilities.formatDate(value, TIME_ZONE, "d")),
      key: Utilities.formatDate(value, TIME_ZONE, "yyyyMMdd")
    };
  }
  const match = String(value || "").match(/(20\d{2})\D*(\d{1,2})\D*(\d{1,2})/);
  if (!match) return null;
  return {
    year: match[1],
    month: Number(match[2]),
    day: Number(match[3]),
    key: match[1] + ("0" + match[2]).slice(-2) + ("0" + match[3]).slice(-2)
  };
}

function canonicalAccessDepartment(value) {
  const normalized = normalizeDepartment(value);
  const known = [
    "진료부", "영양팀", "간호부", "재활치료센터", "감염관리실", "헤모필리아센터",
    "상담실", "환자안전전담", "원무과", "심사팀"
  ];
  for (let i = 0; i < known.length; i++) {
    if (normalized === normalizeDepartment(known[i])) return known[i];
  }
  return String(value || "").trim();
}

function normalizePersonName(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

function normalizeDepartment(value) {
  const text = String(value || "").replace(/\s+/g, "").toLowerCase();
  if (!text) return "";
  if (/감염관리/.test(text)) return "감염관리실";
  if (/헤모필리아/.test(text)) return "헤모필리아센터";
  if (/상담실/.test(text)) return "상담실";
  if (/환자안전전담/.test(text)) return "환자안전전담";
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
    const birthKey = privacyBirthKey(birthValue);
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
    const accessSync = safeSyncAccessRequest(data, isOffboarding, signature.url, startedAt);

    const notificationErrors = sendCompletionNotifications(data, isOffboarding, documents, startedAt);
    const completionErrors = notificationErrors.slice();
    if (accessSync.status === "failed") completionErrors.push("접근권한: " + accessSync.message);
    finishProcessingLog(logRow, completionErrors.length ? "완료(일부오류)" : "완료", completionErrors.join(" | "));

    return jsonResponse({
      result: "success",
      jobId: jobId,
      notificationStatus: notificationErrors.length ? "failed" : "success",
      notificationErrors: notificationErrors,
      accessStatus: accessSync.status,
      accessMessage: accessSync.message || "",
      accessRuleStatus: accessSync.accessRuleStatus || ""
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
    "{{입사일}}": data.hireDate ? formatInputDate(data.hireDate) : getJoinDate(data.name, data.phone, data.birth)
  };
  replaceTextWithNearbyStyle(body, "{{날짜}}", dateText);
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

function replaceTextWithNearbyStyle(body, tag, replacement) {
  const pattern = escapeRegExp(tag);
  let location = body.findText(pattern);
  while (location) {
    const textElement = location.getElement().asText();
    const start = location.getStartOffset();
    const end = location.getEndOffsetInclusive();
    const attributes = getNearbyTextAttributes(textElement, start, end);
    textElement.deleteText(start, end);
    textElement.insertText(start, String(replacement));
    if (String(replacement).length && attributes) {
      textElement.setAttributes(start, start + String(replacement).length - 1, attributes);
    }
    location = body.findText(pattern);
  }
}

function getNearbyTextAttributes(textElement, start, end) {
  const text = textElement.getText();
  for (let i = start - 1; i >= 0; i--) {
    if (!/\s/.test(text.charAt(i))) return textElement.getAttributes(i);
  }
  for (let i = end + 1; i < text.length; i++) {
    if (!/\s/.test(text.charAt(i))) return textElement.getAttributes(i);
  }

  const parent = textElement.getParent();
  if (parent && parent.getChildIndex && parent.getNumChildren) {
    const childIndex = parent.getChildIndex(textElement);
    for (let i = childIndex - 1; i >= 0; i--) {
      const sibling = parent.getChild(i);
      if (sibling.getType() !== DocumentApp.ElementType.TEXT) continue;
      const siblingText = sibling.asText();
      const value = siblingText.getText();
      for (let offset = value.length - 1; offset >= 0; offset--) {
        if (!/\s/.test(value.charAt(offset))) return siblingText.getAttributes(offset);
      }
    }
    for (let i = childIndex + 1; i < parent.getNumChildren(); i++) {
      const sibling = parent.getChild(i);
      if (sibling.getType() !== DocumentApp.ElementType.TEXT) continue;
      const siblingText = sibling.asText();
      const value = siblingText.getText();
      for (let offset = 0; offset < value.length; offset++) {
        if (!/\s/.test(value.charAt(offset))) return siblingText.getAttributes(offset);
      }
    }
  }
  return textElement.getAttributes(start);
}

function upsertSubmission(data, isOffboarding, signatureUrl, docUrl1, docUrl2, timestamp, docUrl3) {
  const sheet = getSpreadsheet().getSheetByName(isOffboarding ? OFFBOARDING_SHEET : ONBOARDING_SHEET);
  if (!sheet) throw new Error("대상 기록 시트가 없습니다. 먼저 시트 초기화를 실행해 주세요.");
  if (!isOffboarding) ensureOnboardingResultHeaders(sheet);

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
    : [timestamp, data.name, data.dept, data.job, data.birth, data.phone, data.docType, signatureUrl, docUrl1, docUrl2, docUrl3 || ""];
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
  const ruleSheet = ensureAccessRuleSheet(spreadsheet);
  const birthIndex = buildEmployeeBirthIndex();
  const counts = { "있음": 0, "없음": 0, "직원정보불일치": 0 };
  const groups = [];
  const allRecords = [];

  spreadsheet.getSheets().forEach(function (sheet) {
    if (!/^\d{4}$/.test(sheet.getName())) return;
    ensureAccessYearSheetLayout(sheet);
    normalizeAccessRequesterRows(sheet);
    if (sheet.getLastRow() < 2) return;

    const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, ACCESS_STATUS_COLUMN);
    const values = range.getDisplayValues();
    const records = values.map(function (row, offset) {
      if (!String(row[0] || row[1] || "").trim()) return null;
      const record = accessRowRecord(sheet, offset + 2, row);
      if (!record.birthKey) record.birthKey = birthIndex[employeeKey(record.name, record.dept)] || "";
      allRecords.push(record);
      return record;
    });
    groups.push({ sheet: sheet, records: records });
  });

  const signatureIndex = buildAccessSignatureIndex(allRecords, { forceLegacyScan: true, cacheKey: "all" });
  groups.forEach(function (group) {
    const statuses = group.records.map(function (record) {
      if (!record) return [""];
      const match = selectAccessSignature(record, signatureIndex);
      counts[match.status] = (counts[match.status] || 0) + 1;
      return [match.status];
    });
    group.sheet.getRange(2, ACCESS_STATUS_COLUMN, statuses.length, 1).setValues(statuses);
    const ruleValues = group.records.map(function (record) {
      if (!record) return ["", "", "", "", "", "", ""];
      return accessRuleColumnValues(resolveAccessRule(record.dept, record.job, ruleSheet));
    });
    group.sheet.getRange(2, ACCESS_RULE_START_COLUMN, ruleValues.length, ACCESS_RULE_HEADERS.length).setValues(ruleValues);
  });
  SpreadsheetApp.flush();
  spreadsheet.toast(
    `있음 ${counts["있음"]}건 / 없음 ${counts["없음"]}건 / 정보불일치 ${counts["직원정보불일치"]}건`,
    "서명 상태 갱신 완료",
    8
  );
  return counts;
}

function buildAccessSignatureIndex(records, options) {
  options = options || {};
  const metadataById = loadSignatureMetadataById();
  const candidates = [];
  const candidateIds = {};
  const targetNames = {};
  (records || []).forEach(function (record) {
    const key = normalizePersonName(record.name);
    if (key) targetNames[key] = true;
  });
  const hasTargetNames = Object.keys(targetNames).length > 0;

  Object.keys(metadataById).forEach(function (id) {
    const metadata = metadataById[id];
    if (hasTargetNames && !targetNames[normalizePersonName(metadata.name)]) return;
    try {
      const file = DriveApp.getFileById(id);
      if (file.getMimeType().indexOf("image/") !== 0) return;
      candidates.push(signatureCandidate(file, metadata, {}));
      candidateIds[id] = true;
    } catch (error) {
      Logger.log("기록된 서명 파일 조회 실패(" + id + "): " + error);
    }
  });

  const unresolved = (records || []).filter(function (record) {
    return selectAccessSignature(record, candidates).status !== "있음";
  });
  if (!unresolved.length) return candidates;

  const properties = PropertiesService.getScriptProperties();
  const globalScanAt = Number(properties.getProperty("ACCESS_LEGACY_SCAN_AT_all") || 0);
  const scopedProperty = "ACCESS_LEGACY_SCAN_AT_" + String(options.cacheKey || "default");
  const scopedScanAt = Number(properties.getProperty(scopedProperty) || 0);
  const lastScanAt = Math.max(globalScanAt, scopedScanAt);
  if (!options.forceLegacyScan && lastScanAt && Date.now() - lastScanAt < ACCESS_LEGACY_SCAN_CACHE_MS) {
    return candidates;
  }

  const employeeMetadataByName = buildAccessEmployeeMetadataByName();
  const unresolvedNames = {};
  unresolved.forEach(function (record) {
    const key = normalizePersonName(record.name);
    if (key) unresolvedNames[key] = true;
  });
  const root = DriveApp.getFolderById(DRIVE_ROOT_FOLDER_ID);
  const signatureRoots = [];
  const signatureFolders = root.getFoldersByName("01_서명보관");
  if (signatureFolders.hasNext()) signatureRoots.push(signatureFolders.next());
  signatureRoots.push(DriveApp.getFolderById(EDUCATION_ROOT_FOLDER_ID));

  signatureRoots.forEach(function (folder) {
    collectSignatureImages(folder, candidates, candidateIds, metadataById, employeeMetadataByName, unresolvedNames, 0);
  });
  cacheResolvedAccessSignatures(unresolved, candidates, metadataById);
  properties.setProperty(scopedProperty, String(Date.now()));
  return candidates;
}

function collectSignatureImages(folder, candidates, candidateIds, metadataById, employeeMetadataByName, targetNames, depth) {
  if (depth > 8) return;
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (candidateIds[file.getId()] || file.getMimeType().indexOf("image/") !== 0) continue;
    const metadata = metadataById[file.getId()] || {};
    const employeeMetadata = inferEmployeeMetadataFromSignatureName(file.getName(), employeeMetadataByName);
    const candidate = signatureCandidate(file, metadata, employeeMetadata);
    const candidateName = normalizePersonName(candidate.name);
    const titleMatches = Object.keys(targetNames).some(function (name) {
      return candidate.normalizedTitle.indexOf(name) !== -1;
    });
    if (targetNames[candidateName] || titleMatches) {
      candidates.push(candidate);
      candidateIds[candidate.id] = true;
    }
  }
  const folders = folder.getFolders();
  while (folders.hasNext()) {
    collectSignatureImages(folders.next(), candidates, candidateIds, metadataById, employeeMetadataByName, targetNames, depth + 1);
  }
}

function signatureCandidate(file, metadata, employeeMetadata) {
  const title = file.getName();
  return {
    id: file.getId(),
    file: file,
    title: title,
    normalizedTitle: normalizePersonName(title),
    name: metadata.name || employeeMetadata.name || "",
    dept: metadata.dept || inferDepartmentFromSignatureName(title) || employeeMetadata.dept || "",
    birthKey: metadata.birthKey || employeeMetadata.birthKey || extractBirthKeyFromSignatureName(title),
    modified: file.getLastUpdated().getTime()
  };
}

function cacheResolvedAccessSignatures(records, candidates, metadataById) {
  const sheet = ensureSheet(getSpreadsheet(), ACCESS_SIGNATURE_SHEET, [
    "타임스탬프", "이름", "표준부서", "생년월일6자리", "서명이미지"
  ]);
  const existingRows = sheet.getDataRange().getDisplayValues();
  const existingKeys = {};
  existingRows.slice(1).forEach(function (row) {
    existingKeys[employeeKey(row[1], row[2]) + "|" + privacyBirthKey(row[3])] = true;
  });
  const additions = [];

  records.forEach(function (record) {
    const match = selectAccessSignature(record, candidates);
    if (!match.candidate) return;
    const birthKey = record.birthKey || match.candidate.birthKey || "";
    const indexed = metadataById[match.candidate.id] || {};
    const correctlyIndexed = normalizePersonName(indexed.name) === normalizePersonName(record.name) &&
      normalizeDepartment(indexed.dept) === normalizeDepartment(record.dept) &&
      (!birthKey || !indexed.birthKey || indexed.birthKey === birthKey);
    if (correctlyIndexed) return;
    const key = employeeKey(record.name, record.dept) + "|" + birthKey;
    if (existingKeys[key]) return;
    existingKeys[key] = true;
    additions.push([new Date(), record.name, normalizeDepartment(record.dept), birthKey, driveContentUrl(match.candidate.id)]);
  });

  if (additions.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, additions.length, additions[0].length).setValues(additions);
  }
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
      metadata[id] = mergeSignatureMetadata(metadata[id], {
        name: String(rows[i][layout.nameIndex] || "").trim(),
        dept: normalizeDepartment(rows[i][layout.deptIndex]),
        birthKey: layout.birthIndex >= 0
          ? privacyBirthKey(rows[i][layout.birthIndex])
          : ""
      });
    }
  });

  const educationSpreadsheet = SpreadsheetApp.openById(EDUCATION_SPREADSHEET_ID);
  const educationSheet = educationSpreadsheet.getSheetByName(EDUCATION_SIGNATURE_SHEET);
  if (educationSheet && educationSheet.getLastRow() >= 2) {
    const rows = educationSheet.getDataRange().getDisplayValues();
    const headers = rows[0].map(privacyRosterHeaderKey);
    const deptIndex = privacyRosterColumnIndex(headers, ["부서", "소속"]);
    const nameIndex = privacyRosterColumnIndex(headers, ["성명", "이름"]);
    const signatureIndex = privacyRosterColumnIndex(headers, ["서명이미지링크", "서명이미지", "서명링크"]);
    if (deptIndex === -1 || nameIndex === -1 || signatureIndex === -1) {
      Logger.log("교육 서명_기록 시트에서 부서/성명/서명이미지링크 헤더를 찾을 수 없습니다.");
      return metadata;
    }
    for (let i = 1; i < rows.length; i++) {
      const id = extractDriveFileId(rows[i][signatureIndex]);
      if (!id) continue;
      metadata[id] = mergeSignatureMetadata(metadata[id], {
        name: String(rows[i][nameIndex] || "").trim(),
        dept: normalizeDepartment(rows[i][deptIndex]),
        birthKey: ""
      });
    }
  }
  return metadata;
}

function mergeSignatureMetadata(existing, incoming) {
  existing = existing || {};
  return {
    name: existing.name || incoming.name || "",
    dept: existing.dept || incoming.dept || "",
    birthKey: existing.birthKey || incoming.birthKey || ""
  };
}

function buildAccessEmployeeMetadataByName() {
  const aggregated = {};
  const spreadsheet = SpreadsheetApp.openById(ACCESS_SPREADSHEET_ID);
  spreadsheet.getSheets().forEach(function (sheet) {
    if (!/^\d{4}$/.test(sheet.getName()) || sheet.getLastRow() < 2) return;
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 11).getDisplayValues();
    rows.forEach(function (row) {
      const name = String(row[1] || "").trim();
      const key = normalizePersonName(name);
      if (!key) return;
      if (!aggregated[key]) aggregated[key] = { names: [], depts: [], birthKeys: [] };
      aggregated[key].names.push(name);
      const dept = normalizeDepartment(row[7]);
      const birthKey = privacyBirthKey(row[10]) || privacyBirthKey(row[9]);
      if (dept) aggregated[key].depts.push(dept);
      if (birthKey.length === 6) aggregated[key].birthKeys.push(birthKey);
    });
  });

  const result = {};
  Object.keys(aggregated).forEach(function (key) {
    const entry = aggregated[key];
    const depts = uniqueValues(entry.depts);
    const birthKeys = uniqueValues(entry.birthKeys);
    result[key] = {
      name: entry.names[0] || "",
      dept: depts.length === 1 ? depts[0] : "",
      birthKey: birthKeys.length === 1 ? birthKeys[0] : ""
    };
  });
  return result;
}

function inferEmployeeMetadataFromSignatureName(fileName, employeeMetadataByName) {
  const normalizedTitle = normalizePersonName(fileName);
  const matches = Object.keys(employeeMetadataByName).filter(function (name) {
    return name && normalizedTitle.indexOf(name) !== -1;
  });
  if (matches.length !== 1) return {};
  return employeeMetadataByName[matches[0]];
}

function inferDepartmentFromSignatureName(fileName) {
  const normalized = normalizeDepartment(fileName);
  const knownDepartments = [
    "간호부", "재활치료센터", "영양팀", "진료부", "원무과", "심사팀",
    "감염관리실", "헤모필리아센터", "상담실", "환자안전전담"
  ];
  for (let i = 0; i < knownDepartments.length; i++) {
    if (normalized.indexOf(knownDepartments[i]) !== -1) return knownDepartments[i];
  }
  return "";
}

function extractBirthKeyFromSignatureName(fileName) {
  // YYYY-MM-DD 형식은 서명일일 가능성이 높으므로 생년월일로 사용하지 않는다.
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
    if (candidate.dept && normalizeDepartment(candidate.dept) === dept) {
      if (record.birthKey && candidate.birthKey) return candidate.birthKey === record.birthKey;
      return true;
    }
    return isDepartmentChange && record.birthKey && candidate.birthKey === record.birthKey;
  });
  if (!valid.length) return { status: "직원정보불일치", candidate: null };
  valid.sort(function (a, b) {
    const aExactBirth = record.birthKey && a.birthKey === record.birthKey ? 1 : 0;
    const bExactBirth = record.birthKey && b.birthKey === record.birthKey ? 1 : 0;
    if (aExactBirth !== bExactBirth) return bExactBirth - aExactBirth;
    return b.modified - a.modified;
  });
  return { status: "있음", candidate: valid[0] };
}

function generateAccessRequestArchive(year) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("다른 요청서 생성 작업이 진행 중입니다.");
  try {
    const spreadsheet = SpreadsheetApp.openById(ACCESS_SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(String(year));
    if (!sheet || sheet.getLastRow() < 2) throw new Error(`${year}년 데이터가 없습니다.`);
    ensureAccessYearSheetLayout(sheet);
    normalizeAccessRequesterRows(sheet);

    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, ACCESS_STATUS_COLUMN).getDisplayValues();
    const records = rows.map(function (row, offset) {
      return accessRowRecord(sheet, offset + 2, row);
    }).filter(function (record) {
      return String(record.values[0] || record.name || "").trim();
    });
    const birthIndex = buildEmployeeBirthIndex();
    const ruleSheet = ensureAccessRuleSheet(spreadsheet);
    records.forEach(function (record) {
      if (!record.birthKey) record.birthKey = birthIndex[employeeKey(record.name, record.dept)] || "";
      record.accessRule = resolveAccessRule(record.dept, record.job, ruleSheet);
    });
    const signatureIndex = buildAccessSignatureIndex(records, { cacheKey: "archive_" + String(year) });
    const signatureMatches = records.map(function (record) {
      return selectAccessSignature(record, signatureIndex);
    });
    const statusByRow = {};
    const recordByRow = {};
    records.forEach(function (record, index) {
      statusByRow[record.rowNumber] = signatureMatches[index].status;
      recordByRow[record.rowNumber] = record;
    });
    const statuses = rows.map(function (row, offset) {
      return [statusByRow[offset + 2] || ""];
    });
    sheet.getRange(2, ACCESS_STATUS_COLUMN, statuses.length, 1).setValues(statuses);
    const accessRuleValues = rows.map(function (row, offset) {
      const record = recordByRow[offset + 2];
      return record ? accessRuleColumnValues(record.accessRule) : ["", "", "", "", "", "", ""];
    });
    sheet.getRange(2, ACCESS_RULE_START_COLUMN, accessRuleValues.length, ACCESS_RULE_HEADERS.length).setValues(accessRuleValues);

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
    const signatureBlobCache = {};
    const requesterSignatures = {};

    records.forEach(function (record, index) {
      if (index > 0) outputBody.appendPageBreak();
      const pageTable = outputBody.appendTable(templateTable.copy());
      const requesterName = record.requester || accessRequesterNameForDate(record.requestDate || record.date);
      const requesterSignature = requesterSignatures[requesterName] || getAccessRequesterSignatureCandidate(requesterName);
      requesterSignatures[requesterName] = requesterSignature;
      populateAccessRequestPage(pageTable, record, requesterSignature, signatureBlobCache);
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

function generateAccessRequestDocument(year, rowNumber) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("다른 요청서 생성 작업이 진행 중입니다.");
  try {
    const spreadsheet = SpreadsheetApp.openById(ACCESS_SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(String(year));
    if (!sheet) throw new Error(`${year}년 시트를 찾을 수 없습니다.`);
    ensureAccessYearSheetLayout(sheet);
    if (rowNumber < 2 || rowNumber > sheet.getLastRow()) throw new Error(`${year}년 ${rowNumber}행을 찾을 수 없습니다.`);

    const row = sheet.getRange(rowNumber, 1, 1, ACCESS_STATUS_COLUMN).getDisplayValues()[0];
    const record = accessRowRecord(sheet, rowNumber, row);
    if (!record.name) throw new Error(`${year}년 ${rowNumber}행에 직원명이 없습니다.`);
    record.requester = accessRequesterNameForDate(record.requestDate || record.date);
    record.accessRule = resolveAccessRule(record.dept, record.job, ensureAccessRuleSheet(spreadsheet));
    sheet.getRange(rowNumber, ACCESS_REQUESTER_COLUMN).setValue(record.requester);
    sheet.getRange(rowNumber, ACCESS_RULE_START_COLUMN, 1, ACCESS_RULE_HEADERS.length)
      .setValues([accessRuleColumnValues(record.accessRule)]);

    const outputFolder = getAccessIndividualFolder(String(year));
    const createdAt = Utilities.formatDate(new Date(), TIME_ZONE, "yyyyMMdd_HHmmss");
    const sequence = String(row[0] || rowNumber).trim();
    const baseName = `${year}년 접근권한 요청서_${sequence}_${sanitizeFileName(record.name)}_${createdAt}`;
    const docFile = DriveApp.getFileById(ACCESS_TEMPLATE_ID).makeCopy(baseName, outputFolder);
    const outputDoc = DocumentApp.openById(docFile.getId());
    const pageTable = getFirstBodyTable(outputDoc.getBody());
    if (!pageTable) throw new Error("접근권한 요청서 템플릿의 본문 표를 찾을 수 없습니다.");
    populateAccessRequestPage(pageTable, record, getAccessRequesterSignatureCandidate(record.requester), {});
    outputDoc.saveAndClose();

    ensureLogSheet(getSpreadsheet()).appendRow([
      Utilities.getUuid(), new Date(), new Date(), `${record.name} 접근권한`, "행별 개별", "완료", "Google Doc 생성",
      "", docFile.getId(), "", "", "", ""
    ]);
    SpreadsheetApp.flush();
    return { name: baseName, docUrl: docFile.getUrl(), rowNumber: rowNumber, year: String(year) };
  } finally {
    lock.releaseLock();
  }
}

function getAccessRequesterSignatureCandidate(requesterName) {
  const name = requesterName === ACCESS_PREVIOUS_REQUESTER_NAME ? ACCESS_PREVIOUS_REQUESTER_NAME : ACCESS_REQUESTER_NAME;
  const fileId = name === ACCESS_PREVIOUS_REQUESTER_NAME
    ? ACCESS_PREVIOUS_REQUESTER_SIGNATURE_FILE_ID
    : ACCESS_REQUESTER_SIGNATURE_FILE_ID;
  const file = DriveApp.getFileById(fileId);
  if (file.getMimeType().indexOf("image/") !== 0) throw new Error(`${name} 요청자 서명 파일이 이미지가 아닙니다.`);
  return signatureCandidate(file, { name: name }, {});
}

function refreshPrivacyConsentStatuses() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("다른 개인정보동의서 작업이 진행 중입니다.");
  try {
    const resolved = resolvePrivacyConsentRecords(["2025", "2026"], { forceLegacyScan: true });
    writePrivacyConsentMissingSheet(resolved);
    const summary = privacyConsentResolutionSummary(resolved);
    getSpreadsheet().toast(
      `서명 확인 ${summary.signed}명 / 누락 ${summary.missing}명`,
      "개인정보동의서 서명 상태",
      8
    );
    return summary;
  } finally {
    lock.releaseLock();
  }
}

function generatePrivacyConsentArchive(year) {
  const targetYear = String(year);
  if (["2025", "2026"].indexOf(targetYear) === -1) throw new Error("지원하는 연도는 2025년과 2026년입니다.");

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("다른 개인정보동의서 작업이 진행 중입니다.");
  const createdFileIds = [];
  try {
    const resolved = resolvePrivacyConsentRecords(["2025", "2026"], { cacheKey: "privacy_archive" });
    writePrivacyConsentMissingSheet(resolved);
    const yearRecords = resolved.byYear[targetYear] || [];
    const signedRecords = yearRecords.filter(function (record) { return !!record.signatureMatch.candidate; });
    const missingCount = yearRecords.length - signedRecords.length;
    if (!yearRecords.length) throw new Error(`${targetYear}년 입사자가 재직자/퇴사자현황 시트에서 확인되지 않습니다.`);
    if (!signedRecords.length) {
      throw new Error(`${targetYear}년 서명이 확인된 입사자가 없습니다. 개인정보동의서 누락명단을 확인해 주세요.`);
    }

    const templateDoc = DocumentApp.openById(TEMPLATE_REGISTRATION_CONSENT_ID);
    const templateBody = templateDoc.getBody();
    assertPrivacyConsentArchiveTemplate(templateBody);

    const outputFolder = getPrivacyConsentArchiveFolder(targetYear);
    const createdAt = Utilities.formatDate(new Date(), TIME_ZONE, "yyyyMMdd_HHmmss");
    const baseName = `${targetYear}년 개인정보 수집·이용 동의서_통합_${createdAt}`;
    const docFile = DriveApp.getFileById(TEMPLATE_REGISTRATION_CONSENT_ID).makeCopy(baseName, outputFolder);
    createdFileIds.push(docFile.getId());
    const outputDoc = DocumentApp.openById(docFile.getId());
    const outputBody = outputDoc.getBody();
    outputBody.clear();
    outputBody.setMarginBottom(28);
    const signatureBlobCache = {};

    signedRecords.forEach(function (record, index) {
      appendPrivacyConsentTemplateBody(outputBody, templateBody);
      const signatureParagraph = populatePrivacyConsentPage(
        outputBody,
        record,
        record.signatureMatch.candidate,
        signatureBlobCache
      );
      // 별도 페이지 나누기 문단은 문서 끝에서 다음 장으로 밀리며 백지를 만든다.
      // 서명 문단 안에서 바로 나누면 다음 직원은 항상 새 페이지에서 시작한다.
      if (index < signedRecords.length - 1) signatureParagraph.appendPageBreak();
    });
    outputDoc.saveAndClose();

    validatePrivacyConsentArchive(docFile.getId(), signedRecords.length);
    const pdfFile = outputFolder.createFile(docFile.getAs(MimeType.PDF)).setName(baseName + ".pdf");
    createdFileIds.push(pdfFile.getId());
    ensureLogSheet(getSpreadsheet()).appendRow([
      Utilities.getUuid(), new Date(), new Date(), `개인정보동의서 ${targetYear}`, "연도별 통합", "완료", "PDF 생성",
      "", docFile.getId(), pdfFile.getId(), "", `서명 ${signedRecords.length}명 / 누락 ${missingCount}명`, ""
    ]);
    getSpreadsheet().toast(
      `${targetYear}년 서명 ${signedRecords.length}명 통합 완료 / 누락 ${missingCount}명`,
      "개인정보동의서",
      8
    );
    return {
      docUrl: docFile.getUrl(),
      pdfUrl: pdfFile.getUrl(),
      signedCount: signedRecords.length,
      missingCount: missingCount
    };
  } catch (error) {
    trashFiles(createdFileIds);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function resolvePrivacyConsentRecords(years, options) {
  options = options || {};
  const birthIndex = buildPrivacyEmployeeBirthIndex();

  const records = [];
  years.forEach(function (year) {
    buildPrivacyConsentRoster(String(year)).forEach(function (record) {
      const employeeBirth = birthIndex.byEmployee[employeeKey(record.name, record.dept)] || "";
      const nameBirths = birthIndex.byName[normalizePersonName(record.name)] || [];
      record.birthKey = record.birthKey || employeeBirth || (nameBirths.length === 1 ? nameBirths[0] : "");
      record.requestType = "접근권한 부여";
      record.reason = "입사";
      records.push(record);
    });
  });

  const deduped = deduplicatePrivacyConsentRoster(records);
  const nameCounts = {};
  deduped.forEach(function (record) {
    const nameKey = normalizePersonName(record.name);
    nameCounts[nameKey] = (nameCounts[nameKey] || 0) + 1;
  });
  const signatureIndex = buildAccessSignatureIndex(deduped, {
    forceLegacyScan: options.forceLegacyScan === true,
    cacheKey: options.cacheKey || "privacy_status"
  });
  const byYear = {};
  years.forEach(function (year) { byYear[String(year)] = []; });
  deduped.forEach(function (record) {
    record.signatureMatch = selectPrivacyConsentSignature(
      record,
      signatureIndex,
      (nameCounts[normalizePersonName(record.name)] || 0) > 1
    );
    byYear[record.year].push(record);
  });
  Object.keys(byYear).forEach(function (year) {
    byYear[year].sort(function (a, b) {
      if (a.dateParts.key !== b.dateParts.key) return a.dateParts.key.localeCompare(b.dateParts.key);
      return a.name.localeCompare(b.name, "ko");
    });
  });
  return { byYear: byYear, records: deduped };
}

function buildPrivacyEmployeeBirthIndex() {
  const entries = {};
  const add = function (name, dept, birthValue, priority) {
    const nameKey = normalizePersonName(name);
    const deptKey = normalizeDepartment(dept);
    const birthKey = privacyBirthKey(birthValue);
    if (!nameKey || !birthKey) return;
    const key = nameKey + "|" + deptKey;
    if (!entries[key] || priority > entries[key].priority) {
      entries[key] = { birthKey: birthKey, priority: priority };
    } else if (priority === entries[key].priority && entries[key].birthKey !== birthKey) {
      entries[key].ambiguous = true;
    }
  };

  const master = getSpreadsheet();
  const signatureSheet = master.getSheetByName(ACCESS_SIGNATURE_SHEET);
  if (signatureSheet && signatureSheet.getLastRow() >= 2) {
    signatureSheet.getDataRange().getValues().slice(1).forEach(function (row) {
      add(row[1], row[2], row[3], 4);
    });
  }
  const onboarding = master.getSheetByName(ONBOARDING_SHEET);
  if (onboarding && onboarding.getLastRow() >= 2) {
    onboarding.getDataRange().getValues().slice(1).forEach(function (row) {
      add(row[1], row[2], row[4], 3);
    });
  }
  try {
    const registration = SpreadsheetApp.openById(REGISTRATION_SPREADSHEET_ID).getSheetByName(REGISTRATION_SHEET);
    if (registration && registration.getLastRow() >= 2) {
      registration.getDataRange().getValues().slice(1).forEach(function (row) {
        add(row[2], row[3], row[5], 3);
      });
    }
  } catch (error) {
    Logger.log("개인정보동의서 생년월일 인사응답 조회 실패: " + error);
  }
  const accessSpreadsheet = SpreadsheetApp.openById(ACCESS_SPREADSHEET_ID);
  accessSpreadsheet.getSheets().forEach(function (sheet) {
    if (!/^\d{4}$/.test(sheet.getName()) || sheet.getLastRow() < 2) return;
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 11).getValues().forEach(function (row) {
      const birthValue = privacyBirthKey(row[10]) ? row[10] : row[9];
      add(row[1], row[7], birthValue, 1);
    });
  });

  const byEmployee = {};
  const byName = {};
  Object.keys(entries).forEach(function (key) {
    const entry = entries[key];
    if (entry.ambiguous) return;
    byEmployee[key] = entry.birthKey;
    const nameKey = key.split("|")[0];
    if (!byName[nameKey]) byName[nameKey] = [];
    if (byName[nameKey].indexOf(entry.birthKey) === -1) byName[nameKey].push(entry.birthKey);
  });
  return { byEmployee: byEmployee, byName: byName };
}

function privacyBirthKey(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, TIME_ZONE, "yyMMdd");
  }
  const text = String(value || "").trim();
  const fullDate = text.match(/(?:19|20)(\d{2})\D*(\d{1,2})\D*(\d{1,2})/);
  if (fullDate) {
    const candidate = fullDate[1] + ("0" + fullDate[2]).slice(-2) + ("0" + fullDate[3]).slice(-2);
    return isPlausibleBirthKey(candidate) ? candidate : "";
  }
  const digits = text.replace(/[^0-9]/g, "");
  const candidate = digits.slice(0, 6);
  return isPlausibleBirthKey(candidate) ? candidate : "";
}

function isPlausibleBirthKey(value) {
  if (!/^\d{6}$/.test(String(value || ""))) return false;
  const month = Number(String(value).slice(2, 4));
  const day = Number(String(value).slice(4, 6));
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

function buildPrivacyConsentRoster(year) {
  const spreadsheet = getSpreadsheet();
  const result = [];
  [
    { sheetName: "재직자현황", employmentStatus: "재직자" },
    { sheetName: "퇴사자현황", employmentStatus: "퇴사자" }
  ].forEach(function (source) {
    const sheet = spreadsheet.getSheetByName(source.sheetName);
    if (!sheet || sheet.getLastRow() < 2) return;
    readPrivacyRosterSheet(sheet, source.employmentStatus).forEach(function (record) {
      if (record.year === year) result.push(record);
    });
  });
  return result;
}

function readPrivacyRosterSheet(sheet, employmentStatus) {
  const values = sheet.getDataRange().getValues();
  const maxHeaderRows = Math.min(values.length, 10);
  let headerRowIndex = -1;
  let headers = [];
  for (let rowIndex = 0; rowIndex < maxHeaderRows; rowIndex++) {
    const candidate = values[rowIndex].map(privacyRosterHeaderKey);
    if (candidate.indexOf("이름") !== -1 && candidate.indexOf("입사일") !== -1) {
      headerRowIndex = rowIndex;
      headers = candidate;
      break;
    }
  }
  if (headerRowIndex === -1) throw new Error(`${sheet.getName()} 시트에서 이름/입사일 헤더를 찾을 수 없습니다.`);

  const nameIndex = privacyRosterColumnIndex(headers, ["이름", "성명"]);
  const hireDateIndex = privacyRosterColumnIndex(headers, ["입사일", "입사일자"]);
  const deptIndex = privacyRosterColumnIndex(headers, ["부서", "소속"]);
  const dept2Index = privacyRosterColumnIndex(headers, ["부서2", "소속2"]);
  const jobIndex = privacyRosterColumnIndex(headers, ["직종", "직위"]);
  const birthIndex = privacyRosterColumnIndex(headers, ["생년월일", "주민등록번호", "주민번호"]);
  const result = [];

  for (let rowIndex = headerRowIndex + 1; rowIndex < values.length; rowIndex++) {
    const row = values[rowIndex];
    const name = nameIndex >= 0 ? String(row[nameIndex] || "").trim() : "";
    if (!name) continue;
    const dateParts = accessDateParts(row[hireDateIndex]);
    if (!dateParts) continue;
    const department = deptIndex >= 0 && String(row[deptIndex] || "").trim()
      ? String(row[deptIndex]).trim()
      : (dept2Index >= 0 ? String(row[dept2Index] || "").trim() : "");
    result.push({
      year: dateParts.year,
      name: name,
      dept: department,
      job: jobIndex >= 0 ? String(row[jobIndex] || "").trim() : "",
      birthKey: birthIndex >= 0 ? privacyBirthKey(row[birthIndex]) : "",
      dateParts: dateParts,
      hireDate: privacyDateFromParts(dateParts),
      employmentStatus: employmentStatus,
      sourceSheet: sheet.getName(),
      sourceRow: rowIndex + 1
    });
  }
  return result;
}

function privacyRosterHeaderKey(value) {
  return String(value || "").replace(/[\s()]/g, "").trim();
}

function privacyRosterColumnIndex(headers, aliases) {
  for (let index = 0; index < headers.length; index++) {
    if (aliases.indexOf(headers[index]) !== -1) return index;
  }
  return -1;
}

function privacyDateFromParts(parts) {
  return new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
}

function deduplicatePrivacyConsentRoster(records) {
  const result = [];
  const indexByKey = {};
  records.forEach(function (record) {
    const identity = normalizePersonName(record.name) + "|" + (record.birthKey || normalizeDepartment(record.dept));
    const key = identity + "|" + record.dateParts.key;
    if (indexByKey[key] === undefined) {
      indexByKey[key] = result.length;
      result.push(record);
      return;
    }
    const existing = result[indexByKey[key]];
    if (existing.employmentStatus.indexOf(record.employmentStatus) === -1) {
      existing.employmentStatus += "/" + record.employmentStatus;
    }
    if (!existing.dept && record.dept) existing.dept = record.dept;
    if (!existing.job && record.job) existing.job = record.job;
    if (!existing.birthKey && record.birthKey) existing.birthKey = record.birthKey;
  });
  return result;
}

function selectPrivacyConsentSignature(record, candidates, sameNameNeedsBirth) {
  const name = normalizePersonName(record.name);
  const dept = normalizeDepartment(record.dept);
  const nameMatches = candidates.filter(function (candidate) {
    return normalizePersonName(candidate.name) === name || candidate.normalizedTitle.indexOf(name) !== -1;
  });
  if (!nameMatches.length) return { status: "없음", reason: "서명 파일 없음", candidate: null };

  if (sameNameNeedsBirth && !record.birthKey) {
    return { status: "직원정보불일치", reason: "동명이인 확인용 생년월일 없음", candidate: null };
  }
  if (sameNameNeedsBirth) {
    const exactBirth = nameMatches.filter(function (candidate) { return candidate.birthKey === record.birthKey; });
    if (!exactBirth.length) {
      return { status: "직원정보불일치", reason: "동명이인 생년월일과 일치하는 서명 없음", candidate: null };
    }
    exactBirth.sort(function (a, b) { return b.modified - a.modified; });
    return { status: "있음", reason: "", candidate: exactBirth[0] };
  }

  let valid = nameMatches;
  if (record.birthKey) {
    valid = nameMatches.filter(function (candidate) {
      return !candidate.birthKey || candidate.birthKey === record.birthKey;
    });
    if (!valid.length) {
      return { status: "직원정보불일치", reason: "생년월일과 일치하는 서명 없음", candidate: null };
    }
  }
  valid.sort(function (a, b) {
    const aBirth = record.birthKey && a.birthKey === record.birthKey ? 1 : 0;
    const bBirth = record.birthKey && b.birthKey === record.birthKey ? 1 : 0;
    if (aBirth !== bBirth) return bBirth - aBirth;
    const aDept = a.dept && normalizeDepartment(a.dept) === dept ? 1 : 0;
    const bDept = b.dept && normalizeDepartment(b.dept) === dept ? 1 : 0;
    if (aDept !== bDept) return bDept - aDept;
    return b.modified - a.modified;
  });
  return { status: "있음", reason: "", candidate: valid[0] };
}

function privacyConsentResolutionSummary(resolved) {
  return resolved.records.reduce(function (summary, record) {
    if (record.signatureMatch && record.signatureMatch.candidate) summary.signed += 1;
    else summary.missing += 1;
    return summary;
  }, { signed: 0, missing: 0 });
}

function ensurePrivacyConsentMissingSheet(spreadsheet) {
  const headers = ["연도", "이름", "부서", "입사일", "누락 사유", "후속조치", "서명 등록 링크", "최근 확인"];
  const sheet = ensureSheet(spreadsheet, PRIVACY_CONSENT_MISSING_SHEET, headers);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setBackground("#991B1B").setFontColor("#FFFFFF").setFontWeight("bold");
  sheet.setFrozenRows(1);
  sheet.setTabColor("#DC2626");
  [70, 100, 130, 100, 240, 330, 360, 150].forEach(function (width, index) {
    sheet.setColumnWidth(index + 1, width);
  });
  return sheet;
}

function writePrivacyConsentMissingSheet(resolved) {
  const sheet = ensurePrivacyConsentMissingSheet(getSpreadsheet());
  if (sheet.getMaxRows() > 1) {
    sheet.getRange(2, 1, sheet.getMaxRows() - 1, 8).clearContent().clearFormat();
  }
  const checkedAt = new Date();
  const rows = resolved.records.filter(function (record) {
    return !record.signatureMatch || !record.signatureMatch.candidate;
  }).sort(function (a, b) {
    if (a.year !== b.year) return a.year.localeCompare(b.year);
    if (a.dateParts.key !== b.dateParts.key) return a.dateParts.key.localeCompare(b.dateParts.key);
    return a.name.localeCompare(b.name, "ko");
  }).map(function (record) {
    return [
      record.year,
      record.name,
      record.dept,
      record.hireDate,
      record.signatureMatch ? record.signatureMatch.reason : "서명 확인 실패",
      "서명 등록 후 '서명 누락명단 갱신'을 실행하고 해당 연도 통합문서를 다시 생성",
      PRIVACY_SIGNATURE_URL,
      checkedAt
    ];
  });
  if (rows.length) {
    if (sheet.getMaxRows() < rows.length + 1) sheet.insertRowsAfter(sheet.getMaxRows(), rows.length + 1 - sheet.getMaxRows());
    const range = sheet.getRange(2, 1, rows.length, 8);
    range.setValues(rows).setBackground("#FEF2F2").setVerticalAlignment("middle").setWrap(true);
    sheet.getRange(2, 4, rows.length, 1).setNumberFormat("yyyy. m. d.");
    sheet.getRange(2, 8, rows.length, 1).setNumberFormat("yyyy. m. d. hh:mm");
  }
  ensurePrivacyConsentMissingSheet(getSpreadsheet());
}

function assertPrivacyConsentArchiveTemplate(body) {
  const text = body.getText();
  ["{{이름}}", "{{날짜}}", "{{서명}}"].forEach(function (tag) {
    if (text.indexOf(tag) === -1 && !(tag === "{{이름}}" && text.indexOf("{{ 이름 }}") !== -1)) {
      throw new Error(`개인정보동의서 템플릿에서 ${tag} 태그를 찾을 수 없습니다.`);
    }
  });
  const consentCount = (text.match(/□동의함 □동의하지 않음/g) || []).length;
  if (consentCount !== 3) throw new Error(`개인정보동의서 템플릿의 동의 항목이 3개가 아닙니다. 현재 ${consentCount}개입니다.`);
}

function appendPrivacyConsentTemplateBody(outputBody, templateBody) {
  for (let index = 0; index < templateBody.getNumChildren(); index++) {
    const child = templateBody.getChild(index);
    const type = child.getType();
    if (type === DocumentApp.ElementType.PARAGRAPH) {
      outputBody.appendParagraph(child.copy().asParagraph());
    } else if (type === DocumentApp.ElementType.TABLE) {
      outputBody.appendTable(child.copy().asTable());
    } else if (type === DocumentApp.ElementType.LIST_ITEM) {
      outputBody.appendListItem(child.copy().asListItem());
    } else {
      throw new Error(`개인정보동의서 템플릿의 지원하지 않는 본문 요소입니다: ${type}`);
    }
  }
}

function populatePrivacyConsentPage(body, record, signatureCandidate, signatureBlobCache) {
  replaceTextWithNearbyStyle(body, "{{날짜}}", `${record.dateParts.year}. ${("0" + record.dateParts.month).slice(-2)}. ${("0" + record.dateParts.day).slice(-2)}.`);
  replaceTextWithNearbyStyle(body, "{{이름}}", record.name);
  replaceTextWithNearbyStyle(body, "{{ 이름 }}", record.name);
  body.replaceText(escapeRegExp("□동의함 □동의하지 않음"), "■동의함 □동의하지 않음");

  const signatureLocation = body.findText(escapeRegExp("{{서명}}"));
  if (!signatureLocation) throw new Error(`${record.name}님의 서명 위치를 템플릿에서 찾을 수 없습니다.`);
  const textElement = signatureLocation.getElement().asText();
  textElement.deleteText(signatureLocation.getStartOffset(), signatureLocation.getEndOffsetInclusive());
  const signatureBlob = signatureBlobCache[signatureCandidate.id] || signatureCandidate.file.getBlob();
  signatureBlobCache[signatureCandidate.id] = signatureBlob;
  const signatureParagraph = textElement.getParent().asParagraph();
  signatureParagraph.setSpacingBefore(0).setSpacingAfter(0).setLineSpacing(1);
  signatureParagraph.appendInlineImage(signatureBlob).setWidth(80).setHeight(40);
  return signatureParagraph;
}

function validatePrivacyConsentArchive(documentId, employeeCount) {
  const body = DocumentApp.openById(documentId).getBody();
  const text = body.getText();
  if (/\{\{\s*(이름|날짜|서명)\s*\}\}/.test(text)) throw new Error("통합 개인정보동의서에 미치환 태그가 남아 있습니다.");
  const checkedCount = (text.match(/■동의함 □동의하지 않음/g) || []).length;
  if (checkedCount !== employeeCount * 3) {
    throw new Error(`통합 개인정보동의서 동의 체크 수가 올바르지 않습니다. 예상 ${employeeCount * 3}개 / 실제 ${checkedCount}개`);
  }
  const pageBreakCount = countDocumentElements(body, DocumentApp.ElementType.PAGE_BREAK);
  if (pageBreakCount !== Math.max(0, employeeCount - 1)) {
    throw new Error(`통합 개인정보동의서 페이지 구분 수가 올바르지 않습니다. 예상 ${Math.max(0, employeeCount - 1)}개 / 실제 ${pageBreakCount}개`);
  }
}

function countDocumentElements(element, elementType) {
  let count = element.getType && element.getType() === elementType ? 1 : 0;
  if (!element.getNumChildren) return count;
  for (let index = 0; index < element.getNumChildren(); index++) {
    count += countDocumentElements(element.getChild(index), elementType);
  }
  return count;
}

function getPrivacyConsentArchiveFolder(year) {
  const root = DriveApp.getFolderById(DRIVE_ROOT_FOLDER_ID);
  const documents = getOrCreateFolder(root, "02_서류보관");
  const consent = getOrCreateFolder(documents, "개인정보 수집·이용 동의서");
  return getOrCreateFolder(consent, String(year) + "년");
}

function getAccessArchiveFolder(year) {
  const root = DriveApp.getFolderById(DRIVE_ROOT_FOLDER_ID);
  const documents = getOrCreateFolder(root, "02_서류보관");
  const access = getOrCreateFolder(documents, "접근권한 요청서");
  return getOrCreateFolder(access, year + "년");
}

function getAccessIndividualFolder(year) {
  return getOrCreateFolder(getAccessArchiveFolder(year), "개별 GDoc");
}

function getFirstBodyTable(body) {
  for (let i = 0; i < body.getNumChildren(); i++) {
    const child = body.getChild(i);
    if (child.getType() === DocumentApp.ElementType.TABLE) return child.asTable();
  }
  return null;
}

function populateAccessRequestPage(pageTable, record, signatureCandidate, signatureBlobCache) {
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

  const effectiveDateText = formatAccessDate(record.date);
  const effectiveDateParagraph = findParagraphContaining(pageTable, "상기직원은");
  if (effectiveDateParagraph) {
    effectiveDateParagraph.replaceText("20\\s*년\\s*월\\s*일", effectiveDateText);
  }
  const requestDateText = formatAccessDate(record.requestDate || record.date);
  const requestDateParagraph = findParagraphMatching(pageTable, /^\s*20\s*년\s*월\s*일\s*$/);
  if (requestDateParagraph) {
    requestDateParagraph.replaceText("20\\s*년\\s*월\\s*일", requestDateText);
  }
  const accessRule = record.accessRule || { matched: false };
  const accessReplacements = {
    "{{대상}}": accessRule.target || "",
    "{{목적}}": accessRule.purpose || "",
    "{{작성권한}}": accessRule.create || "",
    "{{수정권한}}": accessRule.edit || "",
    "{{열람권한}}": accessRule.read || "",
    "{{출력권한}}": accessRule.print || "",
    "{{출력조건}}": accessRule.printCondition || ""
  };
  Object.keys(accessReplacements).forEach(function (tag) {
    pageTable.replaceText(escapeRegExp(tag), accessReplacements[tag]);
  });
  const requester = findParagraphContaining(pageTable, "요청자");
  if (requester) {
    requester.clear();
    requester.appendText(`요청자 : ${record.requester || ACCESS_REQUESTER_NAME}  `);
    if (signatureCandidate) {
      const signatureBlob = signatureBlobCache[signatureCandidate.id] || signatureCandidate.file.getBlob();
      signatureBlobCache[signatureCandidate.id] = signatureBlob;
      requester.appendInlineImage(signatureBlob).setWidth(100).setHeight(60);
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

function findParagraphMatching(element, pattern) {
  if (element.getType && element.getType() === DocumentApp.ElementType.PARAGRAPH) {
    const paragraph = element.asParagraph();
    if (pattern.test(paragraph.getText())) return paragraph;
  }
  if (!element.getNumChildren) return null;
  for (let i = 0; i < element.getNumChildren(); i++) {
    const found = findParagraphMatching(element.getChild(i), pattern);
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
