import React, { useState, useEffect } from 'react'
import SignaturePad from './SignaturePad'

const OffboardingForm = ({ googleAppsScriptUrl, selfService = false }) => {
  const params = new URLSearchParams(window.location.search)
  const [formData, setFormData] = useState({
    empJob: params.get('job') || '',
    empDept: params.get('dept') || '',
    empName: params.get('name') || '',
    empBirth: params.get('birth') || '', // 서명 로드용 생년월일 (yyyy-mm-dd)
    resignDate: params.get('resignDate') || '', // 사직일 (yyyy-mm-dd)
    resignReason: params.get('resignReason') || '', // 퇴사 사유 타이핑
    checkCard: false,
    checkUniform: false,
    checkIrp: false
  })
  const [signature, setSignature] = useState('')
  const [sigMethod, setSigMethod] = useState('pc') // 'pc', 'mobile', 'sms'
  const [isPolling, setIsPolling] = useState(false)
  const [smsSending, setSmsSending] = useState(false)

  const [viewedDocs, setViewedDocs] = useState({ resignation: false, securityOff: false })
  const [activeDoc, setActiveDoc] = useState('')
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resultUrls, setResultUrls] = useState(null)

  const docTemplates = {
    resignation: '1RZL9NZKAOHarK2mlo0BI9dqljcN7jasJVZ-gtNUzSDk', // 사직서 (Docs ID)
    securityOff: '1HHaNxruT-k21ftyt1IAJzf6sq0q0n6yaODCX19stLjs'  // 보안서약 (Docs ID)
  }

  useEffect(() => {
    let interval;
    if (sigMethod === 'mobile' && isConfirmed && formData.empName && formData.empBirth) {
      setIsPolling(true)
      interval = setInterval(async () => {
        try {
          const response = await fetch(`${googleAppsScriptUrl}?action=getSignature&name=${encodeURIComponent(formData.empName)}&birth=${encodeURIComponent(formData.empBirth)}`)
          const data = await response.json()
          if (data.result === 'success' && data.exists && data.signatureData) {
            setSignature(data.signatureData)
            clearInterval(interval)
            setIsPolling(false)
          }
        } catch (e) {
          console.error('서명 Polling 중 에러:', e)
        }
      }, 2500)
    } else {
      setIsPolling(false)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [sigMethod, isConfirmed, formData.empName, formData.empBirth, googleAppsScriptUrl])

  const handleSendSmsLink = async () => {
    const { empJob, empDept, empName, empBirth, resignDate, resignReason } = formData
    if (!empName || !empBirth) {
      alert('이름과 생년월일을 작성해 주세요!')
      return
    }
    setSmsSending(true)
    
    let phoneNum = prompt('퇴사자의 연락처를 입력해 주세요. (예: 010-0000-0000)')
    if (!phoneNum) {
      setSmsSending(false)
      return
    }
    phoneNum = phoneNum.replace(/[^0-9]/g, '')
    if (phoneNum.length < 10) {
      alert('올바른 연락처 형식이 아닙니다.')
      setSmsSending(false)
      return
    }

    const selfServiceUrl = `${window.location.origin}${window.location.pathname}?view=self-service&type=offboarding&name=${encodeURIComponent(empName)}&dept=${encodeURIComponent(empDept)}&job=${encodeURIComponent(empJob)}&birth=${encodeURIComponent(empBirth)}&resignDate=${encodeURIComponent(resignDate)}&resignReason=${encodeURIComponent(resignReason)}`
    
    try {
      const response = await fetch(googleAppsScriptUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'sendSmsLink',
          name: empName,
          phone: phoneNum,
          type: 'offboarding',
          link: selfServiceUrl
        }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      })
      const result = await response.json()
      if (result.result === 'success') {
        alert('📋 퇴사 서류 작성을 위한 비대면 링크가 문자(SMS)로 발송되었습니다.')
      } else {
        alert('❌ 문자 발송 실패: ' + result.message)
      }
    } catch (e) {
      console.error(e)
      alert('❌ 문자 발송 중 네트워크 오류가 발생했습니다.')
    } finally {
      setSmsSending(false)
    }
  }

  const handleInputChange = (e) => {
    const { id, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value
    }))
  }

  const selectDocTab = (type) => {
    setActiveDoc(type)
    setViewedDocs(prev => ({ ...prev, [type]: true }))
  }

  const handleConfirm = () => {
    const { empJob, empDept, empName, empBirth, resignDate, resignReason, checkCard, checkUniform, checkIrp } = formData
    if (!empJob || !empDept || !empName || !empBirth || !resignDate || !resignReason) {
      alert('정보를 모두 입력해 주세요!')
      return
    }
    if (!checkCard || !checkUniform || !checkIrp) {
      alert('퇴사 전 확인 및 동의 사항에 체크해 주세요.')
      return
    }
    setIsConfirmed(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!signature) {
      alert('서명을 입력해 주세요.')
      return
    }

    setIsSubmitting(true)
    const payload = {
      name: formData.empName,
      dept: formData.empDept,
      job: formData.empJob,
      birth: formData.empBirth,
      resignDate: formData.resignDate,
      resignReason: formData.resignReason,
      checkCard: formData.checkCard ? '완료' : '미완료',
      checkUniform: formData.checkUniform ? '동의' : '미동의',
      checkIrp: formData.checkIrp ? '완료' : '미완료',
      docType: '사직원+보안서약',
      signature: signature
    }

    try {
      console.log('📤 [서류 제출] 발송 페이로드:', payload)
      const response = await fetch(googleAppsScriptUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      })
      
      const responseText = await response.text()
      console.log('📥 [서류 제출] 응답 수신 (텍스트):', responseText)
      
      let result;
      try {
        result = JSON.parse(responseText)
      } catch (e) {
        console.error('❌ 응답 JSON 파싱 실패! 서버가 HTML 에러 페이지를 반환했을 수 있습니다:', e)
        console.error('서버 응답 원문:', responseText)
        alert('❌ 서버에서 에러가 발생했습니다. 브라우저 개발자 도구(F12) 콘솔 창에서 에러 로그를 확인해 주세요.')
        return
      }

      if (result.result === 'success') {
        setResultUrls({
          docUrl1: result.docUrl1,
          docUrl2: result.docUrl2
        })
      } else {
        alert('❌ 오류: ' + result.message)
        console.error('❌ 서버 오류 응답:', result.message)
      }
    } catch (error) {
      console.error('❌ 네트워크/통신 오류 발생:', error)
      alert('❌ 서버 통신 오류가 발생했습니다. 개발자 도구(F12) 콘솔 창을 확인하세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleShare = async () => {
    if (!resultUrls) return
    const shareText = `네이처요양병원 퇴사 서류 작성이 완료되었습니다.\n아래 링크에서 확인해 주세요.\n\n사직원: ${resultUrls.docUrl1}\n정보보안서약서: ${resultUrls.docUrl2}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: '네이처요양병원 퇴사서류 완료',
          text: shareText,
          url: resultUrls.docUrl1
        })
      } catch (err) {
        console.log('공유 취소 또는 오류:', err)
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText)
        alert('📋 작성 문서 링크가 클립보드에 복사되었습니다! 카카오톡이나 문자에 붙여넣어 공유하세요.')
      } catch (err) {
        alert('공유 기능을 지원하지 않는 브라우저입니다. 링크를 직접 복사하세요.')
      }
    }
  }

  const allDocsViewed = viewedDocs.resignation && viewedDocs.securityOff

  if (resultUrls) {
    return (
      <article className="step-card visible" style={{ animation: 'fadeInSlideUp 0.6s ease' }}>
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <i className="ph-fill ph-check-circle" style={{ fontSize: '4rem', color: '#10B981', marginBottom: '1rem', display: 'block' }}></i>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>퇴사 처리 접수 완료! 🍀</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            사직서 및 보안서약서 작성이 정상적으로 처리되었습니다.<br />
            그동안 네이처요양병원을 위해 힘써주셔서 진심으로 감사드립니다.<br />
            아래 버튼을 눌러 제출한 문서를 모바일로 확인 및 공유할 수 있습니다.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '360px', margin: '0 auto' }}>
            <a href={resultUrls.docUrl1} target="_blank" rel="noreferrer" className="btn-primary btn-outline" style={{ border: '1px solid #10B981', color: '#047857' }}>
              <i className="ph-bold ph-file-pdf"></i> 사직원 확인 (PDF)
            </a>
            <a href={resultUrls.docUrl2} target="_blank" rel="noreferrer" className="btn-primary btn-outline" style={{ border: '1px solid #10B981', color: '#047857' }}>
              <i className="ph-bold ph-file-pdf"></i> 보안서약서 확인 (PDF)
            </a>
            <button onClick={handleShare} className="btn-primary" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none', marginTop: '1rem' }}>
              <i className="ph-bold ph-share-network"></i> 작성 문서 공유하기 📤
            </button>
            <button onClick={() => window.location.reload()} className="btn-clear" style={{ marginTop: '1rem', alignSelf: 'center' }}>
              처음으로 돌아가기
            </button>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="step-card visible">
      <div className="step-header">
        <div className="step-badge"><i className="ph-bold ph-file-text"></i></div>
        <div className="step-title-wrapper">
          <h2>퇴사자 서류 작성</h2>
          <p className="step-desc">사직원 및 정보보안서약서 전자 서명 제출</p>
        </div>
      </div>

      <div className="step-body">
        <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', position: 'relative' }}>
          <span style={{ position: 'absolute', top: '-1px', right: '-1px', backgroundColor: '#EF4444', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '0 12px 0 8px', fontSize: '0.75rem', fontWeight: 'bold' }}>
            실시간
          </span>
          <h4 style={{ marginBottom: '0.75rem', color: '#B91C1C', fontSize: '1.05rem' }}>
            <i className="ph-fill ph-user-minus"></i> 사직원 및 보안서약서 일괄 제출
          </h4>
          <p style={{ fontSize: '0.85rem', color: '#991B1B', marginBottom: '1rem' }}>
            퇴사 절차를 위해 아래 서류 목록 탭을 눌러 본문 확인 후 인적 사항과 사직 사유를 입력하여 서명을 진행해 주세요.
          </p>

          <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
            <div className="form-group">
              <label style={{ color: '#B91C1C', marginBottom: '0.5rem', display: 'block', fontWeight: '700' }}>
                [퇴직 서류 선택 - 아래 두 탭을 모두 클릭해 확인해야 서명란이 열립니다 ⚠️]
              </label>
              <div className="doc-selector">
                <div className={`doc-tab ${activeDoc === 'resignation' ? 'active' : (viewedDocs.resignation ? 'viewed' : 'not-viewed')}`} onClick={() => selectDocTab('resignation')}>
                  <i className="ph-bold ph-file-text"></i>
                  <span>사직원 {!viewedDocs.resignation && ' (미확인 ⚠️)'}</span>
                </div>
                <div className={`doc-tab ${activeDoc === 'securityOff' ? 'active' : (viewedDocs.securityOff ? 'viewed' : 'not-viewed')}`} onClick={() => selectDocTab('securityOff')}>
                  <i className="ph-bold ph-shield-warning"></i>
                  <span>보안서약서 {!viewedDocs.securityOff && ' (미확인 ⚠️)'}</span>
                </div>
              </div>
            </div>

            {activeDoc && (
              <div style={{ marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <label style={{ color: '#B91C1C', fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>
                  [서류 미리보기]
                </label>
                <div style={{ overflow: 'hidden', borderRadius: '8px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <img
                    src={`https://drive.google.com/thumbnail?id=${docTemplates[activeDoc]}&sz=w1200`}
                    alt="Document Preview"
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="empJob" style={{ color: '#B91C1C' }}>[직종 / Job Title]</label>
              <input type="text" id="empJob" value={formData.empJob} onChange={handleInputChange} required placeholder="예) 간호사, 원무과 등" />
            </div>
            <div className="form-group">
              <label htmlFor="empDept" style={{ color: '#B91C1C' }}>[소속 부서 / Department]</label>
              <input type="text" id="empDept" value={formData.empDept} onChange={handleInputChange} required placeholder="예) 간호부, 원무과 등" />
            </div>
            <div className="form-group">
              <label htmlFor="empName" style={{ color: '#B91C1C' }}>[성명 / Name]</label>
              <input type="text" id="empName" value={formData.empName} onChange={handleInputChange} required placeholder="예) 홍길동" />
            </div>
            <div className="form-group">
              <label htmlFor="empBirth" style={{ color: '#B91C1C' }}>[생년월일 / Date of Birth (기존 서명 조회용)]</label>
              <input type="date" id="empBirth" value={formData.empBirth} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="resignDate" style={{ color: '#B91C1C' }}>[사직일 / Resignation Date]</label>
              <input type="date" id="resignDate" value={formData.resignDate} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="resignReason" style={{ color: '#B91C1C' }}>[사직 사유 / Reason for Resignation]</label>
              <textarea
                id="resignReason"
                rows="3"
                value={formData.resignReason}
                onChange={handleInputChange}
                required
                placeholder="상세한 사직 사유를 입력해 주세요."
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="offboarding-notice">
              <h5 style={{ color: '#9a3412' }}><i className="ph-bold ph-warning-circle"></i> 퇴사 전 확인 사항</h5>
              <label className="notice-item" style={{ color: '#7c2d12', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  id="checkCard"
                  checked={formData.checkCard}
                  onChange={handleInputChange}
                  required
                />
                <span>출입카드(ID카드) 반납 완료</span>
              </label>
              <label className="notice-item" style={{ color: '#7c2d12', cursor: 'pointer', marginTop: '0.5rem', display: 'flex' }}>
                <input
                  type="checkbox"
                  id="checkUniform"
                  checked={formData.checkUniform}
                  onChange={handleInputChange}
                  required
                />
                <span>6개월 이내 퇴사 시 잠복결핵 검사 및 유니폼 비용 차감에 동의함</span>
              </label>
              <label className="notice-item" style={{ color: '#7c2d12', cursor: 'pointer', marginTop: '0.5rem', display: 'flex' }}>
                <input
                  type="checkbox"
                  id="checkIrp"
                  checked={formData.checkIrp}
                  onChange={handleInputChange}
                  required
                />
                <span>퇴직연금 수령을 위한 개인 IRP 계좌 사본 제출(총무팀) 완료</span>
              </label>
            </div>

            {allDocsViewed && !isConfirmed && (
              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <button type="button" className="btn-primary" onClick={handleConfirm} style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
                  <i className="ph-bold ph-check-circle"></i> 모든 서류 내용을 확인했습니다
                </button>
              </div>
            )}

            {isConfirmed && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed rgba(239, 68, 68, 0.3)' }}>
                {!selfService && (
                  <div className="mode-selector" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <button
                      type="button"
                      onClick={() => { setSigMethod('pc'); setSignature(''); }}
                      className={`mode-tab ${sigMethod === 'pc' ? 'active' : ''}`}
                      style={{ flex: 1, padding: '0.5rem 0', fontSize: '0.85rem', textAlign: 'center', justifyContent: 'center' }}
                    >
                      <i className="ph ph-desktop" style={{ marginRight: '0.25rem' }}></i> PC 마우스 서명
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSigMethod('mobile'); setSignature(''); }}
                      className={`mode-tab ${sigMethod === 'mobile' ? 'active' : ''}`}
                      style={{ flex: 1, padding: '0.5rem 0', fontSize: '0.85rem', textAlign: 'center', justifyContent: 'center' }}
                    >
                      <i className="ph ph-qr-code" style={{ marginRight: '0.25rem' }}></i> 대면 모바일 QR
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSigMethod('sms'); setSignature(''); }}
                      className={`mode-tab ${sigMethod === 'sms' ? 'active' : ''}`}
                      style={{ flex: 1, padding: '0.5rem 0', fontSize: '0.85rem', textAlign: 'center', justifyContent: 'center' }}
                    >
                      <i className="ph ph-paper-plane-tilt" style={{ marginRight: '0.25rem' }}></i> 비대면 문자 전송
                    </button>
                  </div>
                )}

                {(selfService || sigMethod === 'pc') && (
                  <SignaturePad
                    name={formData.empName}
                    birth={formData.empBirth}
                    googleAppsScriptUrl={googleAppsScriptUrl}
                    onSignatureChange={setSignature}
                  />
                )}

                {!selfService && sigMethod === 'mobile' && (
                  <div style={{ textAlign: 'center', padding: '1.5rem', border: '1px solid #cbd5e1', borderRadius: '12px', backgroundColor: '#f8fafc', marginBottom: '1rem' }}>
                    <h4 style={{ marginBottom: '1rem', color: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <i className="ph-fill ph-cell-tower"></i> 대면 모바일 서명 진행
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      퇴사자분은 아래 QR 코드를 본인 휴대폰으로 스캔하여 서명을 진행해 주세요.
                    </p>
                    <div style={{ display: 'inline-block', padding: '10px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                          `${window.location.origin}${window.location.pathname}?view=mobile-sign&type=offboarding&name=${encodeURIComponent(formData.empName)}&birth=${encodeURIComponent(formData.empBirth)}`
                        )}`}
                        alt="Signature QR Code"
                        style={{ display: 'block', width: '180px', height: '180px' }}
                      />
                    </div>
                    {isPolling ? (
                      <p style={{ fontSize: '0.85rem', color: '#c2410c', fontWeight: 'bold' }}>
                        <i className="ph-bold ph-spinner" style={{ animation: 'spin 1s linear infinite', marginRight: '0.25rem', display: 'inline-block' }}></i>
                        모바일 서명 대기 중... (실시간 감지 작동 중)
                      </p>
                    ) : signature ? (
                      <div>
                        <p style={{ fontSize: '0.85rem', color: '#10B981', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                          <i className="ph-fill ph-check-circle"></i> 모바일 서명이 감지되었습니다!
                        </p>
                        <div style={{ width: '120px', height: '70px', margin: '0 auto', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: 'white', overflow: 'hidden' }}>
                          <img src={signature} alt="Captured Signature" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.85rem', color: '#e11d48' }}>
                        퇴사 정보(이름, 생년월일) 확인 후 감지가 시작됩니다.
                      </p>
                    )}
                  </div>
                )}

                {!selfService && sigMethod === 'sms' && (
                  <div style={{ textAlign: 'center', padding: '1.5rem', border: '1px solid #cbd5e1', borderRadius: '12px', backgroundColor: '#f8fafc', marginBottom: '1rem' }}>
                    <h4 style={{ marginBottom: '1rem', color: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <i className="ph-fill ph-paper-plane-tilt"></i> 비대면 모바일 서명 전송
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                      퇴사자의 연락처로 서약 서류 작성 링크를 발송합니다.<br />
                      발송 후 퇴사자가 직접 모바일로 작성을 제출하면 즉시 자동 아카이빙 처리됩니다.
                    </p>
                    <button
                      type="button"
                      onClick={handleSendSmsLink}
                      disabled={smsSending}
                      className="btn-primary"
                      style={{ background: 'linear-gradient(135deg, #c2410c, #9a3412)', width: 'auto', padding: '0.5rem 1.5rem', margin: '0 auto' }}
                    >
                      {smsSending ? '발송 중...' : '서명 요청 문자 발송 📤'}
                    </button>
                  </div>
                )}
                
                {(selfService || sigMethod !== 'sms') && (
                  <button
                    type="submit"
                    disabled={isSubmitting || !signature}
                    className="btn-primary"
                    style={{
                      marginTop: '1.5rem',
                      background: 'linear-gradient(135deg, #c2410c, #9a3412)',
                      opacity: (isSubmitting || !signature) ? 0.7 : 1
                    }}
                  >
                    <i className="ph-bold ph-paper-plane-tilt"></i> {isSubmitting ? '서류 및 PDF 생성 중...' : '서명 제출 완료'}
                  </button>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </article>
  )
}

export default OffboardingForm
