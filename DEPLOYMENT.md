# 배포 설정

## GitHub Pages

저장소의 `Settings > Secrets and variables > Actions > Variables`에 아래 값을 등록합니다.

- `VITE_GAS_URL`: 운영 GAS 웹 앱의 `/exec` URL

`main` 브랜치에 반영되면 Pages가 자동 배포됩니다.

## Google Apps Script

저장소의 `Settings > Secrets and variables > Actions > Secrets`에 아래 값을 등록합니다.

- `CLASPRC_JSON`: `clasp login` 후 생성된 OAuth 인증 JSON 전체
- `GAS_DEPLOYMENT_ID`: 현재 운영 웹 앱 배포 ID

GAS 관련 파일이 `main` 브랜치에 반영되면 검증 후 운영 웹 앱에 자동 배포됩니다. 필요하면 `Actions > Validate and deploy GAS > Run workflow`에서 같은 배포를 수동으로 다시 실행할 수 있습니다.

처음 한 번은 Apps Script 편집기에서 `initializeAllSheets`를 실행해 `처리로그`와 필요한 시트 헤더를 준비합니다. 기존 설정 값이 있는 시트는 덮어쓰지 않습니다.

접근권한 요청서 자동화를 처음 배포한 뒤에는 Apps Script 편집기에서 `initializeAccessAutomation`도 한 번 실행합니다. 이 함수는 접근권한 관리대장의 연도별 시트 N열에 `서명 상태` 헤더를 만들고 기존 서명 상태를 최초로 갱신합니다. 연도별 통합 문서 생성과 상태 재점검은 기존 On/Off Boarding 관리 스프레드시트의 `🌟 네이처 자동화` 메뉴에서 실행합니다.

접근권한 서명 등록 화면은 GitHub Pages URL에 `?view=access-signature`를 붙여 사용합니다. 직원 목록이나 생년월일은 화면에 노출되지 않으며, 이름과 부서가 정확히 일치할 때만 기존 서명 패드가 열립니다.

## 입사서류 재생성

관리 스프레드시트의 `🌟 네이처 자동화 > 입사서류 재생성` 메뉴에서 다음 작업을 실행할 수 있습니다.

- 선택 행 개인정보서약서 재생성
- 선택 행 개인정보동의서 재생성
- 날짜 누락 개인정보서약서 일괄 재생성
- 선택 행 전체 입사서류 재생성
- 기존 개인정보동의서 링크 동기화

입사자 마스터 시트에는 `결과_안전교육`, `결과_개인정보`, `결과_개인정보동의서` 세 링크를 기록합니다. 기존 개인정보동의서 링크 동기화는 이미 생성된 문서를 인사등록 응답 시트에서 찾아 연결하므로 문서를 중복 생성하지 않습니다.

재생성은 기존 서명과 최초 제출일을 사용하고 SMS·Slack 알림을 다시 발송하지 않습니다. 새 Google Doc과 PDF의 날짜 및 미치환 태그 검증이 끝난 뒤에만 시트 링크를 변경합니다. 이전 문서는 각 보관 폴더의 `이전버전` 하위 폴더로 이동하며, 처리 결과는 `문서재생성로그` 시트에 기록됩니다. 일괄 처리는 실행 시간 초과를 방지하기 위해 한 번에 최대 20건씩 진행하며, 남은 건은 같은 메뉴를 다시 실행하면 이어서 처리됩니다.

서비스 계정 개인키는 이 구성에서 사용하지 않으며 GitHub 또는 GitHub Pages에 올리지 않습니다.
