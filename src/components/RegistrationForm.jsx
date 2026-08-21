import React, { useEffect, useState } from 'react'
import { sendSmsLink, submitRegistration } from '../services/apiClient'
import PrivacyConsentDocument from './PrivacyConsentDocument'
import SignaturePad from './SignaturePad'
import SubmissionProgress from './SubmissionProgress'

const initialForm = {
  privacyConsent: '',
  name: '',
  department: '',
  customDepartment: '',
  englishName: '',
  residentNumber: '',
  address: '',
  phone: '',
  email: '',
  emergencyContact: '',
  education: '',
  career: '',
  license: '',
  opinion: ''
}

const departments = ['진료부', '간호부', '재활치료센터', '원무 행정', '시설 미화팀', '영양팀', '기타']

const RegistrationForm = ({ googleAppsScriptUrl }) => {
  const [formData, setFormData] = useState(initialForm)
  const [signature, setSignature] = useState('')
  const [sigMethod, setSigMethod] = useState('pc')
  const [isPolling, setIsPolling] = useState(false)
  const [smsSending, setSmsSending] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const updateField = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const birthKey = formData.residentNumber.replace(/[^0-9]/g, '').slice(0, 6)
  const mobileSignUrl = `${window.location.origin}${window.location.pathname}?view=mobile-sign&type=register&name=${encodeURIComponent(formData.name)}&birth=${encodeURIComponent(birthKey)}`

  useEffect(() => {
    if (!['mobile', 'sms'].includes(sigMethod) || formData.privacyConsent !== '동의함' || !formData.name || birthKey.length !== 6 || !googleAppsScriptUrl) {
      setIsPolling(false)
      return undefined
    }

    setIsPolling(true)
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${googleAppsScriptUrl}?action=getSignature&name=${encodeURIComponent(formData.name)}&birth=${encodeURIComponent(birthKey)}`)
        const data = await response.json()
        if (data.result === 'success' && data.exists && data.signatureData) {
          setSignature(data.signatureData)
          setIsPolling(false)
          clearInterval(interval)
        }
      } catch (error) {
        console.error('모바일 서명 확인 중 오류:', error)
      }
    }, 2500)

    return () => clearInterval(interval)
  }, [sigMethod, formData.privacyConsent, formData.name, birthKey, googleAppsScriptUrl])

  const handleSendSmsLink = async () => {
    if (!formData.name || !formData.phone || birthKey.length !== 6) {
      alert('성명, 주민번호, 전화번호를 먼저 정확히 입력해 주세요.')
      return
    }
    setSmsSending(true)
    try {
      await sendSmsLink({ action: 'sendSmsLink', name: formData.name, phone: formData.phone, type: 'onboarding', link: mobileSignUrl })
      alert('전자서명 요청 문자가 발송되었습니다.')
    } catch (error) {
      console.error(error)
      alert(`문자를 발송하지 못했습니다. ${error.message}`)
    } finally {
      setSmsSending(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!signature) {
      alert('전자서명을 입력해 주세요.')
      return
    }
    setIsSubmitting(true)
    try {
      await submitRegistration({
        ...formData,
        department: formData.department === '기타' ? formData.customDepartment.trim() : formData.department,
        signature
      })
      setIsSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      console.error(error)
      alert(`제출하지 못했습니다. ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <main className="register-page">
        <section className="register-success">
          <i className="ph-fill ph-check-circle"></i>
          <h2>인사기록카드가 제출되었습니다.</h2>
          <p>작성해 주셔서 감사합니다. 입사 준비 안내에 따라 나머지 절차도 진행해 주세요.</p>
          <button type="button" className="btn-primary" onClick={() => window.location.assign(window.location.pathname)}>
            입사 안내로 돌아가기
          </button>
        </section>
      </main>
    )
  }

  return (
    <>
      {isSubmitting ? <SubmissionProgress /> : null}
      <header className="header register-header">
        <div className="hospital-logo-wrap"><i className="ph-fill ph-identification-card"></i></div>
        <h1>인사기록카드 작성</h1>
        <p>입사에 필요한 기본 정보를 정확하게 입력해 주세요.</p>
      </header>

      <main className="register-page">
        <form className="register-form" onSubmit={handleSubmit}>
          <section className="register-section welcome-section">
            <h2>안녕하세요. 네이처요양병원 총무팀입니다.</h2>
            <p>네이처요양병원 입사를 축하드립니다. 아래 입사 서류를 준비하여 제출해 주세요.</p>
            <ul className="document-list">
              <li>이력서</li>
              <li>주민등록등본</li>
              <li>자격(면허증) 사본 또는 면허자격증명서</li>
              <li>통장 사본(급여 통장)</li>
              <li>채용검진 진단서 또는 최근 건강보험공단 일반건강검진 결과지</li>
              <li>잠복결핵 검사 결과지</li>
              <li>특수검진(야간 근무자에 한함)</li>
            </ul>
            <p className="document-submit-guide">준비한 서류는 <strong>naturehello3@gmail.com</strong>으로 제출해 주세요.</p>
          </section>

          <div className="register-details">
              <section className="register-section">
                <h2>기본 정보</h2>
                <div className="register-grid">
                  <div className="form-group"><label htmlFor="name">성명 <span>*</span></label><input id="name" name="name" value={formData.name} onChange={updateField} required /></div>
                  <div className="form-group"><label htmlFor="department">부서</label><select id="department" name="department" value={formData.department} onChange={updateField}><option value="">선택해 주세요</option>{departments.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                  {formData.department === '기타' && <div className="form-group register-wide"><label htmlFor="customDepartment">기타 부서명 <span>*</span></label><input id="customDepartment" name="customDepartment" value={formData.customDepartment} onChange={updateField} required placeholder="부서명을 직접 입력해 주세요" /></div>}
                  <div className="form-group"><label htmlFor="englishName">영문성명</label><input id="englishName" name="englishName" value={formData.englishName} onChange={updateField} placeholder="예) GILDONG HONG" /></div>
                  <div className="form-group"><label htmlFor="residentNumber">주민번호 <span>*</span></label><input id="residentNumber" name="residentNumber" value={formData.residentNumber} onChange={updateField} required inputMode="numeric" placeholder="123456-1234567" pattern="[0-9]{6}-[0-9]{7}" autoComplete="off" /></div>
                  <div className="form-group register-wide"><label htmlFor="address">주소</label><input id="address" name="address" value={formData.address} onChange={updateField} placeholder="예) 서울시 강남구 ○○로 00, 000동 000호" /></div>
                  <div className="form-group"><label htmlFor="phone">전화번호 <span>*</span></label><input id="phone" name="phone" type="tel" value={formData.phone} onChange={updateField} required placeholder="010-1234-5678" /></div>
                  <div className="form-group"><label htmlFor="email">이메일 <span>*</span></label><input id="email" name="email" type="email" value={formData.email} onChange={updateField} required /></div>
                  <div className="form-group register-wide"><label htmlFor="emergencyContact">비상연락망 <span>*</span></label><input id="emergencyContact" name="emergencyContact" value={formData.emergencyContact} onChange={updateField} required placeholder="전화번호 / 관계 / 성명" /></div>
                </div>
              </section>

              <section className="register-section">
                <h2>학력·경력 및 자격</h2>
                <div className="form-group"><label htmlFor="education">최종학력</label><textarea id="education" name="education" value={formData.education} onChange={updateField} rows="3" placeholder="재학기간 / 학교명 / 전공 / 졸업여부" /></div>
                <div className="form-group"><label htmlFor="career">주요경력</label><textarea id="career" name="career" value={formData.career} onChange={updateField} rows="4" placeholder="기간 / 기관명 / 직급 / 주요업무" /></div>
                <div className="form-group"><label htmlFor="license">자격 및 면허</label><textarea id="license" name="license" value={formData.license} onChange={updateField} rows="4" placeholder="자격 및 면허명 / 인정 연월일 / 번호 / 인정기관" /></div>
                <div className="form-group"><label htmlFor="opinion">의견</label><textarea id="opinion" name="opinion" value={formData.opinion} onChange={updateField} rows="3" /></div>
              </section>

              <section className="register-section">
                <h2>개인정보 수집·이용 동의 및 전자서명</h2>
                <p className="consent-guide">아래 동의서 전문을 확인한 후 일괄 동의하고 서명해 주세요.</p>
                <PrivacyConsentDocument name={formData.name} googleAppsScriptUrl={googleAppsScriptUrl} />
                <label className="consent-check">
                  <input
                    type="checkbox"
                    checked={formData.privacyConsent === '동의함'}
                    onChange={(event) => setFormData((current) => ({ ...current, privacyConsent: event.target.checked ? '동의함' : '' }))}
                    required
                  />
                  <span>일반 개인정보, 민감정보 및 고유식별정보의 수집·이용에 모두 동의합니다.</span>
                </label>
                {formData.privacyConsent === '동의함' && (
                  <div className="register-signature">
                    <div className="mode-selector signature-methods">
                      <button type="button" onClick={() => { setSigMethod('pc'); setSignature('') }} className={`mode-tab ${sigMethod === 'pc' ? 'active' : ''}`}><i className="ph ph-desktop"></i> 직접 서명</button>
                      <button type="button" onClick={() => { setSigMethod('mobile'); setSignature('') }} className={`mode-tab ${sigMethod === 'mobile' ? 'active' : ''}`}><i className="ph ph-qr-code"></i> 휴대폰 QR</button>
                      <button type="button" onClick={() => { setSigMethod('sms'); setSignature('') }} className={`mode-tab ${sigMethod === 'sms' ? 'active' : ''}`}><i className="ph ph-paper-plane-tilt"></i> 문자로 전송</button>
                    </div>

                    {sigMethod === 'pc' && <SignaturePad name={formData.name} birth={birthKey} googleAppsScriptUrl={googleAppsScriptUrl} onSignatureChange={setSignature} />}

                    {sigMethod === 'mobile' && (
                      <div className="remote-sign-panel">
                        <h4><i className="ph-fill ph-cell-tower"></i> 휴대폰에서 서명하기</h4>
                        <p>아래 QR 코드를 휴대폰으로 스캔해 서명해 주세요.</p>
                        <img className="signature-qr" src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mobileSignUrl)}`} alt="모바일 서명 QR 코드" />
                        <p className={signature ? 'signature-ready' : 'signature-waiting'}>{signature ? '모바일 서명이 확인되었습니다.' : isPolling ? '모바일 서명을 기다리고 있습니다...' : '성명과 주민번호를 먼저 입력해 주세요.'}</p>
                      </div>
                    )}

                    {sigMethod === 'sms' && (
                      <div className="remote-sign-panel">
                        <h4><i className="ph-fill ph-paper-plane-tilt"></i> 문자로 서명 링크 보내기</h4>
                        <p>{formData.phone || '입력한 전화번호'}로 전자서명 링크를 전송합니다.</p>
                        <button type="button" className="btn-primary sms-sign-button" onClick={handleSendSmsLink} disabled={smsSending}>{smsSending ? '발송 중...' : '서명 요청 문자 발송'}</button>
                        <p className={signature ? 'signature-ready' : 'signature-waiting'}>{signature ? '모바일 서명이 확인되었습니다.' : isPolling ? '서명 완료를 기다리고 있습니다...' : ''}</p>
                      </div>
                    )}
                  </div>
                )}
              </section>

              <p className="required-guide"><span>*</span> 표시는 필수 항목입니다.</p>
              <button type="submit" className="btn-primary register-submit" disabled={isSubmitting || formData.privacyConsent !== '동의함' || !signature}>
                {isSubmitting ? '제출 중...' : '인사기록카드 제출'}
              </button>
          </div>
        </form>
      </main>
    </>
  )
}

export default RegistrationForm
