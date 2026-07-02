/* 
======================================================
네이처요양병원 온보딩/오프보딩 허브 - 구글 앱스 스크립트 (Backend)
설치 안내:
1. 구글 드라이브 가기 -> 새로 만들기 -> 더보기 -> Google Apps Script 생성
2. 아래 모든 코드를 복사해서 붙여넣습니다. (기존 backend_script.js 덮어쓰기)
3. "배포" -> "새 배포" -> 웹앱 선택 -> "나(이메일)" 실행, 액세스 대상 "모든 사용자" 로 한뒤 "배포"
4. 발급된 URL을 index.html 파일의 googleAppsScriptUrl 에 붙여넣으면 끝납니다!
======================================================
*/

// [설정값 - 병원 환경에 맞게 수정]
const SPREADSHEET_ID = "1Ed3IXDyNIICR2bLHJX_RbIrVPQSQBhuS5mHoFvR5obY";
const TEMPLATE_SAFETY_ID = "1uQvHrouIG94qp-txtvDrwu1n1F_cu_52QaYg7b9emVU";  // 신규안전교육 (입사)
const TEMPLATE_PRIVACY_ID = "13b98fzAIaf1UtNVmlqqBFyLWQPMDmlnheIKp4jDBoUk"; // 개인정보서약 (입사)
const TEMPLATE_RESIGNATION_ID = "1RZL9NZKAOHarK2mlo0BI9dqljcN7jasJVZ-gtNUzSDk"; // 사직서 (퇴사) - 업데이트됨
const TEMPLATE_SECURITY_OFF_ID = "1HHaNxruT-k21ftyt1IAJzf6sq0q0n6yaODCX19stLjs"; // 보안서약서 (퇴사) - 업데이트됨

const FOLDER_ID = "1fTxLdtcFyaoKLXfCTIkSsHUfehNjfEDh"; // 서명 이미지 저장 폴더
const DOCS_FOLDER_ID = "1zJOorUiQhFkdQ409h0Ka8FCpC09ldu09"; // 생성된 문서 저장 폴더

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🌟 네이처 자동화')
      .addItem('시트 헤더 초기화 (분할형)', 'initializeSheets')
      .addItem('선택한 행 확인서 만들기', 'generateSelectedRows')
      .addToUi();
}

// --- 0. 시트 분할 및 헤더 초기화 ---
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 입사자 시트 설정
  let onSheet = ss.getSheetByName("입사자(Onboarding)");
  if (!onSheet) onSheet = ss.insertSheet("입사자(Onboarding)");
  const onHeaders = ["타임스탬프", "이름", "부서", "직종", "생년월일", "연락처", "서류내역", "서명이미지", "결과_안전교육", "결과_개인정보"];
  onSheet.getRange(1, 1, 1, onHeaders.length).setValues([onHeaders]);
  onSheet.setFrozenRows(1);

  // 2. 퇴사자 시트 설정
  let offSheet = ss.getSheetByName("퇴사자(Offboarding)");
  if (!offSheet) offSheet = ss.insertSheet("퇴사자(Offboarding)");
  const offHeaders = ["타임스탬프", "이름", "부서", "직종", "사직일", "출입카드반납", "검사및유니폼동의", "서류내역", "서명이미지", "결과_사직서", "결과_보결과_보안서약"];
  // Wait, I noticed a typo in the original offHeaders (H열: 사직서, I열: 보안서약... wait)
  // Let's make it consistent.
  const offHeadersCorrected = ["타임스탬프", "이름", "부서", "직종", "사직일", "출입카드반납", "검사및유니폼동의", "서류내역", "서명이미지", "결과_사직서", "결과_보안서약"];
  offSheet.getRange(1, 1, 1, offHeadersCorrected.length).setValues([offHeadersCorrected]);
  offSheet.setFrozenRows(1);

  SpreadsheetApp.getUi().alert("입사자/퇴사자 시트가 분할 생성 및 초기화되었습니다!");
}

// --- 2. 선택한 행들을 돌면서 문서 생성하기 ---
function generateSelectedRows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const sheetName = sheet.getName();
  const selection = sheet.getActiveRange();
  const startRow = selection.getRow();
  const numRows = selection.getNumRows();

  if (startRow < 2) {
    SpreadsheetApp.getUi().alert("데이터 행을 선택해 주세요.");
    return;
  }

  const isOnboarding = sheetName.includes("입사자");
  const isOffboarding = sheetName.includes("퇴사자");

  if (!isOnboarding && !isOffboarding) {
    SpreadsheetApp.getUi().alert("입사자 또는 퇴사자 시트에서 실행해 주세요.");
    return;
  }

  const data = sheet.getRange(startRow, 1, numRows, sheet.getLastColumn()).getValues();
  let count = 0;

  data.forEach((row, index) => {
    const currentRow = startRow + index;
    const name = row[1]; // B: 이름
    const dept = row[2]; // C: 부서
    const job = row[3];  // D: 직종
    
    // 입사자/퇴사자 컬럼 인덱스가 다름에 주의
    let birth = "", phone = "", resignDate = "", docList = "";
    
    if (isOnboarding) {
      birth = row[4];
      phone = row[5];
      docList = row[6];
      const sigUrl = row[7];
      if (!name || !sigUrl) return;

      try {
        if (!row[8]) { // I열: 안전교육
          const url = createEducationDoc(TEMPLATE_SAFETY_ID, "안전보건교육", name, dept, job, birth, phone, "", sigUrl);
          sheet.getRange(currentRow, 9).setValue(url);
        }
        if (!row[9]) { // J열: 개인정보(입)
          const url = createEducationDoc(TEMPLATE_PRIVACY_ID, "개인정보서약_입사", name, dept, job, birth, phone, "", sigUrl);
          sheet.getRange(currentRow, 10).setValue(url);
        }
        count++;
      } catch (e) { console.error(name + " 생성 실패: " + e.toString()); }
      
    } else if (isOffboarding) {
      resignDate = row[4];
      docList = row[7]; // G열 -> H열 (index 7) 로 이동
      const sigUrl = row[8]; // H열 -> I열 (index 8) 로 이동
      if (!name || !sigUrl) return;

      try {
        if (!row[9]) { // J열: 사직서
          const url = createEducationDoc(TEMPLATE_RESIGNATION_ID, "사직원", name, dept, job, "", "", resignDate, sigUrl);
          sheet.getRange(currentRow, 10).setValue(url);
        }
        if (!row[10]) { // K열: 보안서약(퇴)
          const url = createEducationDoc(TEMPLATE_SECURITY_OFF_ID, "보안서약_퇴사", name, dept, job, "", "", resignDate, sigUrl);
          sheet.getRange(currentRow, 11).setValue(url);
        }
        count++;
      } catch (e) { console.error(name + " 생성 실패: " + e.toString()); }
    }
  });

  SpreadsheetApp.getUi().alert(count + "명의 서류 처리가 완료되었습니다!");
}

// --- 3. 개별 문서 생성 로직 ---
function createEducationDoc(templateId, docLabel, name, dept, job, birth, phone, resignDate, signatureUrl) {
  const today = new Date();
  const dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy. MM. dd.");

  if (!signatureUrl || !signatureUrl.includes("id=")) {
    throw new Error("올바른 서명 URL이 없습니다.");
  }

  const signatureId = signatureUrl.split("id=")[1];
  const signatureBlob = DriveApp.getFileById(signatureId).getBlob();

  // 템플릿 복사 [성명_부서_서류명_날짜]
  const fileName = `${name}_${dept}_${docLabel}_${dateStr}`;
  const docCopy = DriveApp.getFileById(templateId).makeCopy(fileName, DriveApp.getFolderById(DOCS_FOLDER_ID));
  const doc = DocumentApp.openById(docCopy.getId());
  const body = doc.getBody();

  // 텍스트 치환 (템플릿 내 {{태그}}들)
  body.replaceText("{{이름}}", name);
  body.replaceText("{{성명}}", name);
  body.replaceText("{{소속}}", dept);
  body.replaceText("{{부서}}", dept);
  body.replaceText("{{직종}}", job);
  body.replaceText("{{직위}}", job);

  const birthStr = (birth instanceof Date) ? Utilities.formatDate(birth, Session.getScriptTimeZone(), "yyyy. MM. dd.") : (birth || "");
  body.replaceText("{{생년월일}}", birthStr);
  body.replaceText("{{연락처}}", phone || "");
  body.replaceText("{{010-1234-5678}}", phone || "");

  const resignStr = (resignDate instanceof Date) ? Utilities.formatDate(resignDate, Session.getScriptTimeZone(), "yyyy. MM. dd.") : (resignDate || "");
  body.replaceText("{{사직일}}", resignStr);

  body.replaceText("{{날짜}}", dateStr);

  // 서명 이미지 삽입
  const signatureLocation = body.findText("{{서명}}");
  if (signatureLocation) {
    const element = signatureLocation.getElement();
    element.asText().setText("");
    const para = element.getParent().asParagraph();
    const image = para.appendInlineImage(signatureBlob);
    image.setWidth(100).setHeight(60);
  }

  doc.saveAndClose();
  return docCopy.getUrl();
}

// --- 4. 프론트엔드 제출 처리 ---
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // [배포팁] 만약 시트 ID 오류가 나면 SpreadsheetApp.openById(SPREADSHEET_ID) 대신 
    // SpreadsheetApp.getActiveSpreadsheet() 를 사용하거나 실제 시트 ID를 SPREADSHEET_ID에 넣으세요.
    let ss;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (err) {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    }
    
    // 모드 판별 (신규입사 vs 퇴사)
    const isOffboarding = data.docType.includes("사직원") || data.docType.includes("보안서약");
    const sheetName = isOffboarding ? "퇴사자(Offboarding)" : "입사자(Onboarding)";
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
        // 만약 시트가 없으면 생성 (안전장치)
        sheet = ss.insertSheet(sheetName);
        const headers = isOffboarding ? 
            ["타임스탬프", "이름", "부서", "직종", "사직일", "출입카드반납", "검사및유니폼동의", "서류내역", "서명이미지", "결과_사직서", "결과_보안서약"] :
            ["타임스탬프", "이름", "부서", "직종", "생년월일", "연락처", "서류내역", "서명이미지", "결과_안전교육", "결과_개인정보"];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.setFrozenRows(1);
    }

    // 서명 이미지 저장
    const base64Data = data.signature.split(",")[1];
    const fileName = `[서명] ${data.name}_${data.dept}_${data.docType}.png`;
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), "image/png", fileName);
    const file = DriveApp.getFolderById(FOLDER_ID).createFile(blob);
    const sigUrl = "https://drive.google.com/uc?id=" + file.getId();

    const timestamp = new Date();

    // 데이터 기록
    if (isOffboarding) {
        sheet.appendRow([timestamp, data.name, data.dept, data.job, data.resignDate, data.checkCard, data.checkUniform, data.docType, sigUrl]);
    } else {
        sheet.appendRow([timestamp, data.name, data.dept, data.job, data.birth, data.phone, data.docType, sigUrl]);
    }

    return ContentService.createTextOutput(JSON.stringify({ result: "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 브라우저 보안 우회용
function doOptions(e) {
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}
