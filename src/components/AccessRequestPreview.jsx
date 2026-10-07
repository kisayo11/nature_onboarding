import { useEffect, useState } from 'react'

const PermissionValue = ({ label, value }) => (
  <div className="access-permission-item">
    <span>{label}</span>
    <strong className={value === 'O' ? 'allowed' : 'denied'}>{value || '-'}</strong>
  </div>
)

const AccessRequestPreview = ({ googleAppsScriptUrl, name, dept, job, requestType, effectiveDate }) => {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!googleAppsScriptUrl) return undefined
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          action: 'getAccessRule',
          dept: dept || '',
          job: job || ''
        })
        const response = await fetch(`${googleAppsScriptUrl}?${params.toString()}`, { signal: controller.signal })
        const result = await response.json()
        if (result.result !== 'success') throw new Error(result.message || '접근권한 기준을 불러오지 못했습니다.')
        setData(result)
        setError('')
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') setError(fetchError.message)
      }
    }, 350)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [googleAppsScriptUrl, dept, job])

  const rule = data?.rule
  const formattedDate = effectiveDate || '입력된 적용일'

  return (
    <div className="access-request-preview">
      <div className="access-request-summary">
        <h4><i className="ph-fill ph-identification-card" /> 접근권한 {requestType}요청 내용</h4>
        <div className="access-request-meta">
          <span><strong>요청자</strong>{name || '성명 입력 필요'}</span>
          <span><strong>부서</strong>{dept || '부서 입력 필요'}</span>
          <span><strong>직종</strong>{job || '직종 입력 필요'}</span>
          <span><strong>적용일</strong>{formattedDate}</span>
        </div>

        {rule?.matched ? (
          <>
            <p className="access-rule-label">
              적용 기준: {rule.department} / {rule.role} / {rule.purpose} · 대상: {rule.target}
            </p>
            <div className="access-permission-grid">
              <PermissionValue label="작성" value={rule.create} />
              <PermissionValue label="수정" value={rule.edit} />
              <PermissionValue label="열람" value={rule.read} />
              <PermissionValue label="출력" value={rule.print} />
            </div>
            {rule.printCondition && <p className="access-rule-note">※ {rule.printCondition}</p>}
          </>
        ) : (
          <p className="access-rule-warning">
            {dept && job ? '일치하는 권한 기준이 없어 심사팀 확인 대상으로 기록됩니다.' : '부서와 직종을 입력하면 적용 권한이 자동으로 표시됩니다.'}
          </p>
        )}
        {error && <p className="access-rule-warning">{error}</p>}
      </div>

      {data?.templateId && (
        <>
          <p className="access-template-guide">아래 원본 양식을 기준으로 최종 요청서가 자동 작성됩니다.</p>
          <div className="access-template-frame">
            <iframe
              src={`https://docs.google.com/document/d/${data.templateId}/preview`}
              title={`접근권한 ${requestType}요청서 미리보기`}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default AccessRequestPreview
