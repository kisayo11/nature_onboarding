# 배포 설정

## GitHub Pages

저장소의 `Settings > Secrets and variables > Actions > Variables`에 아래 값을 등록합니다.

- `VITE_GAS_URL`: 운영 GAS 웹 앱의 `/exec` URL

`main` 브랜치에 반영되면 Pages가 자동 배포됩니다.

## Google Apps Script

저장소의 `Settings > Secrets and variables > Actions > Secrets`에 아래 값을 등록합니다.

- `CLASPRC_JSON`: `clasp login` 후 생성된 OAuth 인증 JSON 전체
- `GAS_DEPLOYMENT_ID`: 현재 운영 웹 앱 배포 ID

GAS 운영 배포는 `Actions > Validate and deploy GAS > Run workflow`에서 수동 실행합니다. 커밋과 Pull Request에서는 문법·프런트 빌드만 검사하므로 Apps Script 버전 한도를 불필요하게 사용하지 않습니다.

처음 한 번은 Apps Script 편집기에서 `initializeAllSheets`를 실행해 `처리로그`와 필요한 시트 헤더를 준비합니다. 기존 설정 값이 있는 시트는 덮어쓰지 않습니다.

서비스 계정 개인키는 이 구성에서 사용하지 않으며 GitHub 또는 GitHub Pages에 올리지 않습니다.
