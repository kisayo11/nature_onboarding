// 백엔드 API 엔드포인트 설정
// 환경 변수 VITE_API_URL이 정의되어 있으면 해당 서버를 사용하고, 없을 경우 백엔드 서버(http://localhost:5000/api)를 기본값으로 사용합니다.

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const GOOGLE_APPS_SCRIPT_URL = API_BASE_URL;
