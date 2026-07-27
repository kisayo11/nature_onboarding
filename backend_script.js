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
  const offHeaders = ["타임스탬프", "이름", "부서", "직종", "사직일", "사직사유", "출입카드 반납여부", "검사및유니폼여부", "개인 IRP 계좌 사본 제출여부", "서류내역", "서명이미지", "결과_사직서", "결과_보안서약"];
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

  // 4. OJT 시트 설정 (내선, 층별, 협업도구, 복리후생)
  let contactsSheet = ss.getSheetByName("OJT_내선");
  if (!contactsSheet) {
    contactsSheet = ss.insertSheet("OJT_내선");
    const contactsHeaders = ["부서", "이름", "내선번호", "담당업무"];
    contactsSheet.getRange(1, 1, 1, contactsHeaders.length).setValues([contactsHeaders]);
    const defaultContacts = [
      ["원무과", "김상용 과장", "901", "원무과 관리"],
      ["총무팀", "김미혜 팀장", "905", "인사 / 총무"],
      ["원무과", "강혜민 대리", "902", "원무행정 / 접수"],
      ["원무과", "최수빈 / 조정화", "900 / 990", "데스크 / 행정"],
      ["행정부", "김본호 부장", "916", "행정부 총괄"],
      ["심사팀", "김미진 팀장", "917", "건보심사"],
      ["시설팀", "정평오 팀장", "923", "시설물 관리 / 수리"],
      ["영양팀", "최윤정 팀장", "925", "영양팀 / 구내식당"],
      ["상담실", "허지현 실장", "210", "입원 상담"],
      ["영상의학실", "김동휘 실장", "906", "방사선 / X-Ray"],
      ["원무행정", "권준혁 복지사", "910 / 990", "사회복지 / 프로그램"],
      ["야간당직", "김진람 / 권욱주 / 정진영", "999", "야간 행정 당직"]
    ];
    contactsSheet.getRange(2, 1, defaultContacts.length, 4).setValues(defaultContacts);
    contactsSheet.setFrozenRows(1);
  }

  let floorsSheet = ss.getSheetByName("OJT_층별");
  if (!floorsSheet) {
    floorsSheet = ss.insertSheet("OJT_층별");
    const floorsHeaders = ["층", "주요시설", "세부설명"];
    floorsSheet.getRange(1, 1, 1, floorsHeaders.length).setValues([floorsHeaders]);
    const defaultFloors = [
      ["옥상 (R)", "하늘정원", "휴게 공간, 태양열 판넬, 실외기"],
      ["7F ~ 8F", "VIP & VVIP 병동", "1인실, 2인실, VIP 810호 병실"],
      ["4F ~ 6F", "일반 병동 (4,5,6병동)", "4인실, 6인실"],
      ["3F", "3병동 (ICU 중환자실)", "ICU, 1인실, 4인실, 6인실, 헤모병실"],
      ["2F", "재활치료센터", "물리치료실, 작업치료실"],
      ["1F", "원무 & 대기공간", "원무과, 데스크, 상담실, 카페 드래더(Cafe), 프로그램실, 정문/후문"],
      ["B1F", "진료 & 행정센터", "병원장실, 진료실(1~5과), 행정부장실, 심사팀, 영상의학실, 소회의실, 서버실"],
      ["B2F", "구내식당 & 복지시설", "구내식당(중식 제공), 탈의실(여), 영양팀, 세탁실, 소독실, 린넨실, 헤모필리아센터"],
      ["B3F ~ B4F", "시설 & 주차장", "B3: 시설팀, 방재실, 산소실 | B4: 주차장, 설비시설 (※ 1.5F: 남자탈의실)"]
    ];
    floorsSheet.getRange(2, 1, defaultFloors.length, 3).setValues(defaultFloors);
    floorsSheet.setFrozenRows(1);
  }

  let toolsSheet = ss.getSheetByName("OJT_협업도구");
  if (!toolsSheet) {
    toolsSheet = ss.insertSheet("OJT_협업도구");
    const toolsHeaders = ["도구명", "카테고리", "URL", "배지", "아이콘"];
    toolsSheet.getRange(1, 1, 1, toolsHeaders.length).setValues([toolsHeaders]);
    const defaultTools = [
      ["kt bizmeka ez (그룹웨어)", "전자결재 / 사내메신저 / 일정", "https://ezsso.bizmeka.com/sso/ssoLogin.do", "필수 접속", "ph-article"],
      ["Google Drive", "업무 문서 공유 & 서식 데이터", "https://drive.google.com", "업무공유", "ph-google-drive-logo"],
      ["DOCTORS (EMR / PACS)", "전자의무기록 및 의료영상 차트", "", "원내 프로그램", "ph-first-aid"],
      ["Slack / Gmail", "팀 커뮤니케이션 & 사내 메일", "", "소통 채널", "ph-slack-logo"]
    ];
    toolsSheet.getRange(2, 1, defaultTools.length, 5).setValues(defaultTools);
    toolsSheet.setFrozenRows(1);
  }

  let welfareSheet = ss.getSheetByName("OJT_복리후생");
  if (!welfareSheet) {
    welfareSheet = ss.insertSheet("OJT_복리후생");
    const welfareHeaders = ["제목", "설명", "아이콘", "색상"];
    welfareSheet.getRange(1, 1, 1, welfareHeaders.length).setValues([welfareHeaders]);
    const defaultWelfare = [
      ["카페 드래더 (Cafe de Ladder)", "1층에 위치한 병원 전용 카페로, 임직원 대상 전 음료 20% 할인 적용 혜택이 제공됩니다.", "ph-coffee", "blue"],
      ["구내식당 중식 무료 제공", "지하 2층 구내식당에서 매일 맛있고 영양가 높은 영양식 중식이 무료로 제공됩니다.", "ph-fork-knife", "green"],
      ["생일 축하금 & 포상", "생일을 맞이한 임직원 축하금 지급 및 매월 이달의 친절사원 선정 및 포상 제도가 운영됩니다.", "ph-cake", "amber"],
      ["월말 송년회 및 이벤트", "모든 부서원이 함께 어우러지는 월말 및 연말 송년회 행사 및 다양한 소통 프로그램을 지원합니다.", "ph-users-three", "purple"]
    ];
    welfareSheet.getRange(2, 1, defaultWelfare.length, 4).setValues(defaultWelfare);
    welfareSheet.setFrozenRows(1);
  }

  if (SpreadsheetApp.getUi()) {
    SpreadsheetApp.getUi().alert("모든 시트 및 OJT 설정 탭이 올바르게 생성/초기화 되었습니다!");
  }
}

// --- OJT 데이터 동적 로더 (단일 OJT 시트 탭 우선 + 개별 탭 Fallback) ---
function loadOjtDataFromSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
  
  const contacts = [];
  const floors = [];
  const tools = [];
  const welfare = [];

  // 1. 단일 [OJT] 시트 탭이 존재하는 경우 우선 처리
  const ojtSheet = ss.getSheetByName("OJT");
  if (ojtSheet) {
    const data = ojtSheet.getDataRange().getValues();
    // 1행은 헤더이므로 2행(index 1)부터 파싱
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // A~C: 층별
      if (row[0] || row[1]) {
        floors.push({
          floor: String(row[0] || '').trim(),
          title: String(row[1] || '').trim(),
          desc: String(row[2] || '').trim()
        });
      }

      // D~H: 협업도구
      if (row[3]) {
        tools.push({
          name: String(row[3] || '').trim(),
          category: String(row[4] || '').trim(),
          url: String(row[5] || '').trim(),
          badge: String(row[6] || '').trim(),
          icon: String(row[7] || 'ph-desktop').trim()
        });
      }

      // I~L: 복리후생
      if (row[8]) {
        welfare.push({
          title: String(row[8] || '').trim(),
          desc: String(row[9] || '').trim(),
          icon: String(row[10] || 'ph-gift').trim(),
          color: String(row[11] || 'blue').trim()
        });
      }

      // M~O: 내선
      if (row[12] || row[14]) {
        contacts.push({
          dept: String(row[12] || '').trim(),
          name: String(row[13] || '').trim(),
          ext: String(row[14] || '').trim(),
          role: String(row[12] || '').trim() // 부서/역할
        });
      }
    }

    return { contacts, floors, tools, welfare };
  }

  // 2. 분리된 OJT 시트 탭이 존재하는 경우 (Fallback)
  const contactsSheet = ss.getSheetByName("OJT_내선");
  if (contactsSheet) {
    const data = contactsSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] || data[i][1]) {
        contacts.push({
          dept: String(data[i][0] || ''),
          name: String(data[i][1] || ''),
          ext: String(data[i][2] || ''),
          role: String(data[i][3] || '')
        });
      }
    }
  }

  const floorsSheet = ss.getSheetByName("OJT_층별");
  if (floorsSheet) {
    const data = floorsSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] || data[i][1]) {
        floors.push({
          floor: String(data[i][0] || ''),
          title: String(data[i][1] || ''),
          desc: String(data[i][2] || '')
        });
      }
    }
  }

  const toolsSheet = ss.getSheetByName("OJT_협업도구");
  if (toolsSheet) {
    const data = toolsSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        tools.push({
          name: String(data[i][0] || ''),
          category: String(data[i][1] || ''),
          url: String(data[i][2] || ''),
          badge: String(data[i][3] || ''),
          icon: String(data[i][4] || 'ph-desktop')
        });
      }
    }
  }

  const welfareSheet = ss.getSheetByName("OJT_복리후생");
  if (welfareSheet) {
    const data = welfareSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        welfare.push({
          title: String(data[i][0] || ''),
          desc: String(data[i][1] || ''),
          icon: String(data[i][2] || 'ph-gift'),
          color: String(data[i][3] || 'blue')
        });
      }
    }
  }

  return { contacts, floors, tools, welfare };
}

// --- 설정값 로더 ---
function loadConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("솔라피&슬랙 설정");
  const config = {};
  if (!sheet) return config;
  
  const data = sheet.getDataRange().getValues();
  // 1행이 헤더인지 바로 데이터인지 판별 (헤더가 없으면 0행부터 읽기)
  const firstCell = String(data[0][0]).trim();
  const startRow = (firstCell === "설정 항목" || firstCell === "설정항목" || firstCell === "키" || firstCell === "Key") ? 1 : 0;
  
  for (let i = startRow; i < data.length; i++) {
    const key = String(data[i][0]).trim();
    const val = String(data[i][1]).trim();
    if (key) {
      config[key] = val;
    }
  }
  Logger.log("Loaded Config Keys: " + Object.keys(config).join(", "));
  Logger.log("SLACK_WEBHOOK_URL: [" + config['SLACK_WEBHOOK_URL'] + "]");
  return config;
}

// --- 서명 이미지 조회 API (doGet) ---
function doGet(e) {
  try {
    const action = e.parameter.action;
    const name = e.parameter.name;
    const birth = e.parameter.birth; // yyyy-mm-dd
    
    if (action === "getOjtData") {
      const ojtData = loadOjtDataFromSheet();
      return ContentService.createTextOutput(JSON.stringify({
        result: "success",
        data: ojtData
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
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
        // [퇴사자] A: 타임스탬프, B: 이름, C: 부서, D: 직종, E: 사직일, F: 사직사유, G: 출입카드, H: 검사및유니폼, I: 개인 IRP 계좌 사본 제출여부, J: 서류내역, K: 서명이미지, L: 결과_사직서, M: 결과_보안서약
        sheet.getRange(matchedRowIndex, 1).setValue(timestamp);
        sheet.getRange(matchedRowIndex, 3).setValue(data.dept);
        sheet.getRange(matchedRowIndex, 4).setValue(data.job);
        sheet.getRange(matchedRowIndex, 6).setValue(data.resignReason);
        sheet.getRange(matchedRowIndex, 7).setValue(data.checkCard);
        sheet.getRange(matchedRowIndex, 8).setValue(data.checkUniform);
        sheet.getRange(matchedRowIndex, 9).setValue(data.checkIrp);
        sheet.getRange(matchedRowIndex, 10).setValue(data.docType);
        sheet.getRange(matchedRowIndex, 11).setValue(sigUrl);
        sheet.getRange(matchedRowIndex, 12).setValue(docUrl1);
        sheet.getRange(matchedRowIndex, 13).setValue(docUrl2);
      }
    } else {
      // 매칭 실패 시 데이터 추가 (Upsert - Insert)
      if (!isOffboarding) {
        sheet.appendRow([timestamp, data.name, data.dept, data.job, data.birth, data.phone, data.docType, sigUrl, docUrl1, docUrl2]);
      } else {
        sheet.appendRow([timestamp, data.name, data.dept, data.job, data.resignDate, data.resignReason, data.checkCard, data.checkUniform, data.checkIrp, data.docType, sigUrl, docUrl1, docUrl2]);
      }
    }

    // 5. 알림 연동 (솔라피 문자 & 슬랙 알림)
    const rawTemplate = isOffboarding ? config['OFF_SMS_TEMPLATE'] : config['ON_SMS_TEMPLATE'];
    const smsTemplate = rawTemplate || "";
    const message = smsTemplate
      ? smsTemplate.replace("{이름}", data.name).replace("{링크}", docUrl1)
      : "";
      
    // 솔라피 문자 전송
    if (config['SOLAPI_API_KEY'] && config['SOLAPI_API_SECRET'] && config['SENDER_NUMBER'] && data.phone) {
      Logger.log("솔라피 문자 전송 시도: " + data.phone);
      sendSolapiSms(config['SOLAPI_API_KEY'], config['SOLAPI_API_SECRET'], config['SENDER_NUMBER'], data.phone, message);
    } else {
      Logger.log("솔라피 전송 스킵 (설정 누락 또는 수신번호 없음)");
    }
    
    // 슬랙 웹훅 전송
    let slackStatus = "skipped";
    let slackErrorMsg = "";
    if (config['SLACK_WEBHOOK_URL']) {
      Logger.log("슬랙 알림 전송 시도");
      const typeLabel = isOffboarding ? "퇴사자 서류 제출" : "신규 입사자 서류 제출";
      const slackMessage = `📢 *[${typeLabel}] ${data.name} (${data.dept} / ${data.job})*\n• 날짜: ${Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm")}\n• 서류내역: ${data.docType}\n• 첫번째 서류: ${docUrl1}\n• 두번째 서류: ${docUrl2}`;
      
      try {
        sendSlackNotification(config['SLACK_WEBHOOK_URL'], slackMessage);
        slackStatus = "success";
      } catch (slackError) {
        slackStatus = "fail";
        slackErrorMsg = slackError.toString();
      }
    } else {
      Logger.log("슬랙 전송 스킵 (SLACK_WEBHOOK_URL 설정 누락)");
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      result: "success", 
      docUrl1: docUrl1,
      docUrl2: docUrl2,
      slackStatus: slackStatus,
      slackError: slackErrorMsg
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("doPost 실행 중 에러 발생: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({ result: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// --- 구글 독스 기반 실시간 문서 빌드 및 PDF 변환 ---
function generateDocAndConvertToPdf(templateId, docLabel, name, dept, job, birth, phone, resignDate, resignReason, signatureUrl, timestamp, destFolder) {
  const docDate = (timestamp instanceof Date) ? timestamp : (timestamp ? new Date(timestamp) : new Date());
  const dateStr = Utilities.formatDate(docDate, Session.getScriptTimeZone(), "yyyy. MM. dd.");

  // 입사일 자동 조회
  const joinDateStr = getJoinDate(name, phone, birth);

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
  body.replaceText("{{입사일}}", joinDateStr);

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
    const res = UrlFetchApp.fetch(webhookUrl, options);
    const code = res.getResponseCode();
    if (code !== 200) {
      throw new Error("Slack Error Code " + code + ": " + res.getContentText());
    }
  } catch (err) {
    Logger.log("Slack Notification Send Error: " + err.toString());
    throw err;
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

// --- 재직자현황 시트에서 입사일 조회 엔진 ---
function getJoinDate(name, phone, birth) {
  let targetPhone = phone;
  
  // 만약 phone이 없고 birth가 있다면 입사자(Onboarding) 시트에서 연락처 검색 시도 (퇴사자용)
  if (!targetPhone && birth) {
    targetPhone = findPhoneByNameAndBirth(name, birth);
  }
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName("재직자현황");
    if (!sheet) {
      Logger.log("'재직자현황' 시트를 찾을 수 없습니다.");
      return "";
    }
    
    const data = sheet.getDataRange().getValues();
    const cleanPhone = function(p) {
      return String(p).replace(/[^0-9]/g, "");
    };
    
    const targetNameClean = String(name).trim();
    const targetPhoneClean = cleanPhone(targetPhone);
    
    // 1차 검색: 이름과 휴대폰 둘 다 매칭하는 경우
    if (targetPhoneClean) {
      for (let i = 2; i < data.length; i++) {
        const rowName = String(data[i][5]).trim();
        const rowPhone = cleanPhone(data[i][8]);
        
        if (rowName === targetNameClean && rowPhone === targetPhoneClean) {
          return formatJoinDateValue(data[i][6]);
        }
      }
    }
    
    // 2차 검색 (Fallback): 이름만 매칭하는 경우 (휴대폰이 없거나 매칭 실패 시, 이름이 고유할 때만 반환)
    let matchedRows = [];
    for (let i = 2; i < data.length; i++) {
      const rowName = String(data[i][5]).trim();
      if (rowName === targetNameClean) {
        matchedRows.push(data[i]);
      }
    }
    
    if (matchedRows.length === 1) {
      return formatJoinDateValue(matchedRows[0][6]);
    } else if (matchedRows.length > 1) {
      Logger.log("이름이 중복되는 재직자가 존재하여 입사일을 특정할 수 없습니다: " + targetNameClean);
    }
    
  } catch (err) {
    Logger.log("입사일 조회 에러: " + err.toString());
  }
  return "";
}

// 입사자(Onboarding) 시트에서 이름+생년월일 매칭으로 연락처 찾기 헬퍼
function findPhoneByNameAndBirth(name, birth) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName("입사자(Onboarding)");
    if (!sheet) return "";
    
    const data = sheet.getDataRange().getValues();
    const targetName = String(name).trim();
    const targetBirth = String(birth).trim(); // yyyy-mm-dd
    
    for (let i = 1; i < data.length; i++) {
      const rowName = String(data[i][1]).trim();
      const rowBirthVal = data[i][4];
      
      let rowBirth = "";
      if (rowBirthVal instanceof Date) {
        rowBirth = Utilities.formatDate(rowBirthVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
      } else {
        rowBirth = String(rowBirthVal).trim();
      }
      
      if (rowName === targetName && rowBirth === targetBirth) {
        return String(data[i][5]).trim(); // 연락처 (F열)
      }
    }
  } catch (e) {
    Logger.log("입사자 시트에서 연락처 검색 실패: " + e.toString());
  }
  return "";
}

// 입사일 날짜 형태 포맷 변환용 헬퍼 함수
function formatJoinDateValue(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy. MM. dd.");
  }
  if (val) {
    const dateObj = new Date(val);
    if (!isNaN(dateObj.getTime())) {
      return Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "yyyy. MM. dd.");
    }
    return String(val);
  }
  return "";
}
