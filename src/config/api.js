// GitHub Pages에서는 비밀 값을 보관할 수 없으므로 공개 가능한 GAS Web App URL만 주입합니다.
export const GOOGLE_APPS_SCRIPT_URL = import.meta.env.VITE_GAS_URL || ''
