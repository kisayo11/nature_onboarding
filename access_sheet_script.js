/* 접근권한 관리대장 전용 컨테이너 바운드 Apps Script */

const ACCESS_TEMPLATE_ID = "1jc5Ez2votn4uItriaLUJrbq7vnJZK1mdxKNHwU6De2E";
const ACCESS_DRIVE_ROOT_FOLDER_ID = "1fOCZbxN4xAy9bcgTweHk0sd2wvlT4G9J";
const ACCESS_REQUESTER_CHANGE_DATE_KEY = "20250131";
const ACCESS_REQUESTER_SIGNATURE_IDS = {
  "최창영": "1EXEXAtyZIEEpYNTTAdyrDqcdkjZ-XGzv",
  "김상용": "1-TAYyN575lE1YyrMjcqWOBhhrptcBtJE"
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🌟 접근권한 자동화")
    .addItem("선택 행 개별 GDoc 생성", "generateSelectedAccessRequestDocument")
    .addToUi();
}

function generateSelectedAccessRequestDocument() {
  const ui = SpreadsheetApp.getUi();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getActiveSheet();
  const range = sheet.getActiveRange();
  if (!/^\d{4}$/.test(sheet.getName())) {
    ui.alert("2025 또는 2026 연도 시트에서 실행해 주세요.");
    return null;
  }
  if (!range || range.getRow() < 2 || range.getNumRows() !== 1) {
    ui.alert("생성할 데이터 행의 셀 하나를 선택한 뒤 다시 실행해 주세요.");
    return null;
  }

  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(30000)) throw new Error("다른 요청서 생성 작업이 진행 중입니다.");
  try {
    const rowNumber = range.getRow();
    const values = sheet.getRange(rowNumber, 1, 1, 23).getDisplayValues()[0];
    const record = accessSheetRowRecord(values);
    if (!record.name) throw new Error(`${rowNumber}행에 직원명이 없습니다.`);

    record.requester = accessRequesterForDate(record.requestDate || record.date);
    sheet.getRange(rowNumber, 15).setValue(record.requester);

    const folder = getAccessIndividualFolder(sheet.getName());
    const createdAt = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyyMMdd_HHmmss");
    const sequence = String(values[0] || rowNumber).trim();
    const fileName = `${sheet.getName()}년 접근권한 요청서_${sequence}_${sanitizeAccessFileName(record.name)}_${createdAt}`;
    const docFile = DriveApp.getFileById(ACCESS_TEMPLATE_ID).makeCopy(fileName, folder);
    const document = DocumentApp.openById(docFile.getId());
    const pageTable = getFirstAccessBodyTable(document.getBody());
    if (!pageTable) throw new Error("접근권한 요청서 템플릿의 본문 표를 찾을 수 없습니다.");

    populateAccessRequestPage(pageTable, record);
    document.saveAndClose();
    spreadsheet.toast(`${record.name} 개별 GDoc 생성 완료`, "접근권한 요청서", 8);
    ui.alert("개별 GDoc 생성 완료", `${fileName}\n${docFile.getUrl()}`, ui.ButtonSet.OK);
    return { name: fileName, docUrl: docFile.getUrl(), rowNumber: rowNumber };
  } finally {
    lock.releaseLock();
  }
}

function accessSheetRowRecord(row) {
  const ruleParts = String(row[16] || "").split("/").map(function (value) { return value.trim(); });
  return {
    name: String(row[1] || "").trim(),
    requestType: String(row[2] || "").trim(),
    reason: String(row[3] || "").trim(),
    job: String(row[6] || "").trim(),
    dept: String(row[7] || "").trim(),
    date: String(row[12] || "").trim(),
    requestDate: String(row[13] || "").trim(),
    requester: String(row[14] || "").trim(),
    accessRule: {
      purpose: ruleParts.length >= 3 ? ruleParts.slice(2).join(" / ") : "",
      target: String(row[17] || "").trim(),
      create: String(row[18] || "").trim(),
      edit: String(row[19] || "").trim(),
      read: String(row[20] || "").trim(),
      print: String(row[21] || "").trim(),
      printCondition: String(row[22] || "").trim()
    }
  };
}

function accessRequesterForDate(value) {
  const match = String(value || "").match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!match) return "김상용";
  const key = match[1] + String(Number(match[2])).padStart(2, "0") + String(Number(match[3])).padStart(2, "0");
  return key < ACCESS_REQUESTER_CHANGE_DATE_KEY ? "최창영" : "김상용";
}

function populateAccessRequestPage(pageTable, record) {
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

  const effectiveDateParagraph = findAccessParagraphContaining(pageTable, "상기직원은");
  if (effectiveDateParagraph) {
    effectiveDateParagraph.replaceText("20\\s*년\\s*월\\s*일", formatAccessDate(record.date));
  }
  const requestDateParagraph = findAccessParagraphMatching(pageTable, /^\s*20\s*년\s*월\s*일\s*$/);
  if (requestDateParagraph) {
    requestDateParagraph.replaceText("20\\s*년\\s*월\\s*일", formatAccessDate(record.requestDate || record.date));
  }

  const replacements = {
    "{{대상}}": record.accessRule.target,
    "{{목적}}": record.accessRule.purpose,
    "{{작성권한}}": record.accessRule.create,
    "{{수정권한}}": record.accessRule.edit,
    "{{열람권한}}": record.accessRule.read,
    "{{출력권한}}": record.accessRule.print,
    "{{출력조건}}": record.accessRule.printCondition
  };
  Object.keys(replacements).forEach(function (tag) {
    pageTable.replaceText(escapeAccessRegExp(tag), replacements[tag]);
  });

  const requesterParagraph = findAccessParagraphContaining(pageTable, "요청자");
  if (!requesterParagraph) throw new Error("템플릿에서 요청자 위치를 찾을 수 없습니다.");
  requesterParagraph.clear();
  requesterParagraph.appendText(`요청자 : ${record.requester}  `);
  const signatureId = ACCESS_REQUESTER_SIGNATURE_IDS[record.requester];
  if (!signatureId) throw new Error(`${record.requester} 요청자 서명 설정이 없습니다.`);
  requesterParagraph.appendInlineImage(DriveApp.getFileById(signatureId).getBlob()).setWidth(100).setHeight(60);
  requesterParagraph.appendText("  (인)");
}

function findAccessDetailsTable(element) {
  if (element.getType && element.getType() === DocumentApp.ElementType.TABLE) {
    const table = element.asTable();
    if (table.getNumRows() >= 2 && table.getRow(0).getNumCells() === 5 && table.getRow(0).getText().indexOf("직원 명") !== -1) {
      return table;
    }
  }
  if (!element.getNumChildren) return null;
  for (let index = 0; index < element.getNumChildren(); index++) {
    const found = findAccessDetailsTable(element.getChild(index));
    if (found) return found;
  }
  return null;
}

function findAccessParagraphContaining(element, text) {
  if (element.getType && element.getType() === DocumentApp.ElementType.PARAGRAPH) {
    const paragraph = element.asParagraph();
    if (paragraph.getText().indexOf(text) !== -1) return paragraph;
  }
  if (!element.getNumChildren) return null;
  for (let index = 0; index < element.getNumChildren(); index++) {
    const found = findAccessParagraphContaining(element.getChild(index), text);
    if (found) return found;
  }
  return null;
}

function findAccessParagraphMatching(element, pattern) {
  if (element.getType && element.getType() === DocumentApp.ElementType.PARAGRAPH) {
    const paragraph = element.asParagraph();
    if (pattern.test(paragraph.getText())) return paragraph;
  }
  if (!element.getNumChildren) return null;
  for (let index = 0; index < element.getNumChildren(); index++) {
    const found = findAccessParagraphMatching(element.getChild(index), pattern);
    if (found) return found;
  }
  return null;
}

function getFirstAccessBodyTable(body) {
  for (let index = 0; index < body.getNumChildren(); index++) {
    const child = body.getChild(index);
    if (child.getType() === DocumentApp.ElementType.TABLE) return child.asTable();
  }
  return null;
}

function getAccessIndividualFolder(year) {
  const root = DriveApp.getFolderById(ACCESS_DRIVE_ROOT_FOLDER_ID);
  const documents = getOrCreateAccessFolder(root, "02_서류보관");
  const access = getOrCreateAccessFolder(documents, "접근권한 요청서");
  const yearFolder = getOrCreateAccessFolder(access, year + "년");
  return getOrCreateAccessFolder(yearFolder, "개별 GDoc");
}

function getOrCreateAccessFolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

function formatAccessDate(value) {
  const match = String(value || "").match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  return match ? `${match[1]}년 ${Number(match[2])}월 ${Number(match[3])}일` : String(value || "").trim();
}

function escapeAccessRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeAccessFileName(value) {
  return String(value || "").replace(/[\\/:*?"<>|]/g, "_").trim();
}
