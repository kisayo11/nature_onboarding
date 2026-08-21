import { GOOGLE_APPS_SCRIPT_URL } from '../config/api'

async function request(payload) {
  if (!GOOGLE_APPS_SCRIPT_URL) {
    throw new Error('GAS Web App URL이 설정되지 않았습니다.')
  }

  // text/plain은 GAS Web App 호출 시 불필요한 CORS preflight를 피합니다.
  const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    }
  })

  const data = await response.json().catch(() => ({
    result: 'error',
    message: '서버 응답을 읽을 수 없습니다.'
  }))

  if (!response.ok || data.result === 'error') {
    throw new Error(data.message || `서버 요청 실패 (${response.status})`)
  }

  return data
}

export function submitDocument(data) {
  return request(data)
}

export function saveSignature(data) {
  return request(data)
}

export function sendSmsLink(data) {
  return request(data)
}

export function submitRegistration(data) {
  return request({ action: 'registerEmployee', ...data })
}
