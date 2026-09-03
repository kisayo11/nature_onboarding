import React, { useEffect, useState } from 'react'
import { sendSmsLink, submitRegistration } from '../services/apiClient'
import PrivacyConsentDocument from './PrivacyConsentDocument'
import SignaturePad from './SignaturePad'
import SubmissionProgress from './SubmissionProgress'

const initialForm = {
  privacyConsent: '',
  trainingConsent: false,
  securityConsent: false,
  name: '',
  job: '',
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
const jobs = ['의사', '간호사(RN)', '간호조무사(AN)', '물리치료사(PT)', '작업치료사(OT)', '방사선사', '임상병리사', '영양사', '조리원', '원무행정', '시설관리', '미화', '기타']

const docTemplates = {
  training: '1uQvHrouIG94qp-txtvDrwu1n1F_cu_52QaYg7b9emVU', // 안전보건교육
  privacy: '13b98fzAIaf1UtNVmlqqBFyLWQPMDmlnheIKp4jDBoUk'   // 개인정보서약서
}

const steps = [
  { step: 1, title: '기본 인적사항', icon: 'ph-user' },
  { step: 2, title: '학력·경력 및 자격', icon: 'ph-graduation-cap' },
  { step: 3, title: '서약 확인 및 서명', icon: 'ph-pen-nib' }
]

const RegistrationForm = ({ googleAppsScriptUrl }) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState(initialForm)
  const [signature, setSignature] = useState('')
  const [sigMethod, setSigMethod] = useState('pc')
  const [isPolling, setIsPolling] = useState(false)
  const [smsSending, setSmsSending] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [activeDocTab, setActiveDocTab] = useState('consent') // 'consent', 'training', 'privacy'
  const [viewedDocs, setViewedDocs] = useState({ consent: true, training: false, privacy: false })

  const updateField = (event) => {
    const { name, value, type, checked } = event.target
    setFormData((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  const selectDocTab = (tab) => {
    setActiveDocTab(tab)
    setViewedDocs((prev) => ({ ...prev, [tab]: true }))
  }

  const birthKey = formData.residentNumber.replace(/[^0-9]/g, '').slice(0, 6)
  const mobileSignUrl = `${window.location.origin}${window.location.pathname}?view=mobile-sign&type=register&name=${encodeURIComponent(formData.name)}&birth=${encodeURIComponent(birthKey)}`

  const allConsented =
    formData.privacyConsent === '동의함' &&
    formData.trainingConsent &&
    formData.securityConsent

  // Step 1 유효성 검사
  const validateStep1 = () => {
    if (!formData.name.trim()) {
      alert('성명을 입력해 주세요.')
      document.getElementById('name')?.focus()
      return false
    }
    if (!formData.department) {
      alert('부서를 선택해 주세요.')
      document.getElementById('department')?.focus()
      return false
    }
    if (formData.department === '기타' && !formData.customDepartment.trim()) {
      alert('기타 부서명을 직접 입력해 주세요.')
      document.getElementById('customDepartment')?.focus()
      return false
    }
    if (!formData.job.trim()) {
      alert('직종을 입력해 주세요.')
      document.getElementById('job')?.focus()
      return false
    }
    if (!formData.residentNumber.trim() || birthKey.length !== 6) {
      alert('주민번호를 올바르게 입력해 주세요 (앞 6자리 필수).')
      document.getElementById('residentNumber')?.focus()
      return false
    }
    if (!formData.phone.trim()) {
      alert('전화번호를 입력해 주세요.')
      document.getElementById('phone')?.focus()
      return false
    }
    if (!formData.email.trim()) {
      alert('이메일 주소를 입력해 주세요.')
      document.getElementById('email')?.focus()
      return false
    }
    if (!formData.emergencyContact.trim()) {
      alert('비상연락망(전화번호/관계/성명)을 입력해 주세요.')
      document.getElementById('emergencyContact')?.focus()
      return false
    }
    return true
  }

  const goToNextStep = () => {
    if (currentStep === 1) {
      if (!validateStep1()) return
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToPrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    if (currentStep !== 3 || !['mobile', 'sms'].includes(sigMethod) || !allConsented || !formData.name || birthKey.length !== 6 || !googleAppsScriptUrl) {
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
  }, [currentStep, sigMethod, allConsented, formData.name, birthKey, googleAppsScriptUrl])

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
    if (!validateStep1()) {
      setCurrentStep(1)
      return
    }
    if (!allConsented) {
      alert('모든 필수 서약 및 동의 사항에 체크해 주세요.')
      return
    }
    if (!signature) {
      alert('전자서명을 입력해 주세요.')
      return
    }
    setIsSubmitting(true)
    try {
      await submitRegistration({
        ...formData,
        department: formData.department === '기타' ? formData.customDepartment.trim() : formData.department,
        job: formData.job.trim(),
        birth: birthKey,
        docType: '신규안전+개인정보',
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
          <h2>인사기록카드 및 입사서약이 제출되었습니다.</h2>
          <p>작성해 주셔서 감사합니다. 모든 입사 전자서류 생성이 안전하게 완료되었습니다.<br />입사 안내에 따라 나머지 출근 준비 절차도 진행해 주세요.</p>
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
        <h1>인사기록카드 및 입사서약서 작성</h1>
        <p>단계별로 기본 정보 입력과 필수 입사 서약 및 전자서명을 진행해 주세요.</p>
      </header>

      <main className="register-page">
        {/* 상단 3단계 스텝 프로그레스 인디케이터 */}
        <div className="wizard-progress-bar">
          {steps.map((item) => {
            const isCompleted = currentStep > item.step
            const isActive = currentStep === item.step
            return (
              <div
                key={item.step}
                className={`wizard-step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => {
                  if (item.step < currentStep) setCurrentStep(item.step)
                  else if (item.step === 2 && currentStep === 1) goToNextStep()
                }}
              >
                <div className="wizard-step-circle">
                  {isCompleted ? <i className="ph-bold ph-check"></i> : <span>{item.step}</span>}
                </div>
                <span className="wizard-step-label">{item.title}</span>
              </div>
            )
          })}
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          {/* STEP 1: 기본 인적사항 */}
          {currentStep === 1 && (
            <div className="wizard-step-content" style={{ animation: 'fadeInSlideUp 0.4s ease' }}>
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

              <section className="register-section">
                <h2>1단계: 기본 인적사항 등록</h2>
                <p className="section-subguide">급여 지급 및 4대보험 신고를 위한 필수 기초 정보입니다.</p>
                <div className="register-grid">
                  <div className="form-group">
                    <label htmlFor="name">성명 <span>*</span></label>
                    <input id="name" name="name" value={formData.name} onChange={updateField} required placeholder="예) 홍길동" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="department">부서 <span>*</span></label>
                    <select id="department" name="department" value={formData.department} onChange={updateField} required>
                      <option value="">선택해 주세요</option>
                      {departments.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  {formData.department === '기타' && (
                    <div className="form-group register-wide">
                      <label htmlFor="customDepartment">기타 부서명 <span>*</span></label>
                      <input id="customDepartment" name="customDepartment" value={formData.customDepartment} onChange={updateField} required placeholder="부서명을 직접 입력해 주세요" />
                    </div>
                  )}
                  <div className="form-group">
                    <label htmlFor="job">직종 <span>*</span></label>
                    <input
                      id="job"
                      name="job"
                      list="jobList"
                      value={formData.job}
                      onChange={updateField}
                      required
                      placeholder="예) 간호사, 물리치료사, 원무과 등"
                    />
                    <datalist id="jobList">
                      {jobs.map((j) => <option key={j} value={j} />)}
                    </datalist>
                  </div>
                  <div className="form-group">
                    <label htmlFor="englishName">영문성명</label>
                    <input id="englishName" name="englishName" value={formData.englishName} onChange={updateField} placeholder="예) HONG GILDONG" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="residentNumber">주민번호 <span>*</span></label>
                    <input id="residentNumber" name="residentNumber" value={formData.residentNumber} onChange={updateField} required inputMode="numeric" placeholder="123456-1234567" pattern="[0-9]{6}-[0-9]{7}" autoComplete="off" />
                  </div>
                  <div className="form-group register-wide">
                    <label htmlFor="address">주소</label>
                    <input id="address" name="address" value={formData.address} onChange={updateField} placeholder="예) 서울시 강남구 ○○로 00, 000동 000호" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">전화번호 <span>*</span></label>
                    <input id="phone" name="phone" type="tel" value={formData.phone} onChange={updateField} required placeholder="010-1234-5678" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">이메일 <span>*</span></label>
                    <input id="email" name="email" type="email" value={formData.email} onChange={updateField} required placeholder="example@nature.com" />
                  </div>
                  <div className="form-group register-wide">
                    <label htmlFor="emergencyContact">비상연락망 <span>*</span></label>
                    <input id="emergencyContact" name="emergencyContact" value={formData.emergencyContact} onChange={updateField} required placeholder="전화번호 / 관계 / 성명 (예: 010-0000-0000 / 부 / 홍판서)" />
                  </div>
                </div>
              </section>

              <div className="wizard-nav-group">
                <span className="required-guide"><span>*</span> 표시는 필수 항목입니다.</span>
                <button type="button" className="btn-primary wizard-next-btn" onClick={goToNextStep}>
                  다음: 학력·경력 및 자격 <i className="ph-bold ph-arrow-right"></i>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: 학력·경력 및 자격 */}
          {currentStep === 2 && (
            <div className="wizard-step-content" style={{ animation: 'fadeInSlideUp 0.4s ease' }}>
              <section className="register-section">
                <h2>2단계: 학력·경력 및 자격사항</h2>
                <p className="section-subguide">해당하는 사항을 자유롭게 기재해 주세요. (선택 입력)</p>
                <div className="form-group">
                  <label htmlFor="education">최종학력</label>
                  <textarea id="education" name="education" value={formData.education} onChange={updateField} rows="3" placeholder="재학기간 / 학교명 / 전공 / 졸업여부" />
                </div>
                <div className="form-group">
                  <label htmlFor="career">주요경력</label>
                  <textarea id="career" name="career" value={formData.career} onChange={updateField} rows="4" placeholder="기간 / 기관명 / 직급 / 주요업무" />
                </div>
                <div className="form-group">
                  <label htmlFor="license">자격 및 면허</label>
                  <textarea id="license" name="license" value={formData.license} onChange={updateField} rows="4" placeholder="자격 및 면허명 / 인정 연월일 / 번호 / 인정기관" />
                </div>
                <div className="form-group">
                  <label htmlFor="opinion">의견</label>
                  <textarea id="opinion" name="opinion" value={formData.opinion} onChange={updateField} rows="3" placeholder="기타 전달사항 또는 병원에 바라는 점" />
                </div>
              </section>

              <div className="wizard-nav-group split">
                <button type="button" className="btn-secondary" onClick={goToPrevStep}>
                  <i className="ph-bold ph-arrow-left"></i> 이전: 기본정보
                </button>
                <button type="button" className="btn-primary wizard-next-btn" onClick={goToNextStep}>
                  다음: 서약 확인 및 전자서명 <i className="ph-bold ph-arrow-right"></i>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: 입사 서약 및 전자서명 */}
          {currentStep === 3 && (
            <div className="wizard-step-content" style={{ animation: 'fadeInSlideUp 0.4s ease' }}>
              <section className="register-section">
                <h2>3단계: 입사 필수 서류 확인 및 전자서명</h2>
                <p className="consent-guide">
                  원내 규정에 따른 3가지 필수 서류를 탭하여 확인하신 후, 동의 체크 및 하단 1회 전자서명을 진행해 주세요.
                </p>

                {/* 3대 서류 탭 셀렉터 */}
                <div className="doc-selector" style={{ marginBottom: '1.25rem' }}>
                  <div
                    className={`doc-tab ${activeDocTab === 'consent' ? 'active' : (viewedDocs.consent ? 'viewed' : 'not-viewed')}`}
                    onClick={() => selectDocTab('consent')}
                  >
                    <i className="ph-bold ph-file-text"></i>
                    <span>개인정보 수집·이용 동의서</span>
                  </div>
                  <div
                    className={`doc-tab ${activeDocTab === 'training' ? 'active' : (viewedDocs.training ? 'viewed' : 'not-viewed')}`}
                    onClick={() => selectDocTab('training')}
                  >
                    <i className="ph-bold ph-shield-check"></i>
                    <span>안전보건교육 {!viewedDocs.training && ' (미확인 ⚠️)'}</span>
                  </div>
                  <div
                    className={`doc-tab ${activeDocTab === 'privacy' ? 'active' : (viewedDocs.privacy ? 'viewed' : 'not-viewed')}`}
                    onClick={() => selectDocTab('privacy')}
                  >
                    <i className="ph-bold ph-lock-key"></i>
                    <span>개인정보서약서 {!viewedDocs.privacy && ' (미확인 ⚠️)'}</span>
                  </div>
                </div>

                {/* 탭 내용 */}
                <div style={{ marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  {activeDocTab === 'consent' && (
                    <div>
                      <h4 style={{ color: '#047857', marginBottom: '0.75rem' }}>
                        <i className="ph-fill ph-file-text"></i> 개인정보 수집·이용 동의서 (전문)
                      </h4>
                      <PrivacyConsentDocument name={formData.name} googleAppsScriptUrl={googleAppsScriptUrl} />
                    </div>
                  )}

                  {activeDocTab === 'training' && (
                    <div>
                      <h4 style={{ color: '#047857', marginBottom: '0.75rem' }}>
                        <i className="ph-fill ph-shield-check"></i> 안전보건교육 (문서 미리보기)
                      </h4>
                      <div style={{ overflow: 'hidden', borderRadius: '8px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <iframe
                          src={`https://docs.google.com/document/d/${docTemplates.training}/preview`}
                          title="안전보건교육 미리보기"
                          style={{ width: '100%', height: '420px', border: 'none', borderRadius: '8px' }}
                        />
                      </div>
                    </div>
                  )}

                  {activeDocTab === 'privacy' && (
                    <div>
                      <h4 style={{ color: '#047857', marginBottom: '0.75rem' }}>
                        <i className="ph-fill ph-lock-key"></i> 개인정보서약서 (문서 미리보기)
                      </h4>
                      <div style={{ overflow: 'hidden', borderRadius: '8px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <iframe
                          src={`https://docs.google.com/document/d/${docTemplates.privacy}/preview`}
                          title="개인정보서약서 미리보기"
                          style={{ width: '100%', height: '420px', border: 'none', borderRadius: '8px' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3대 서류 동의 체크박스 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <label className="consent-check">
                    <input
                      type="checkbox"
                      checked={formData.privacyConsent === '동의함'}
                      onChange={(event) => setFormData((current) => ({ ...current, privacyConsent: event.target.checked ? '동의함' : '' }))}
                      required
                    />
                    <span>[필수] 개인정보 수집·이용 동의서의 모든 조항에 동의합니다.</span>
                  </label>

                  <label className="consent-check">
                    <input
                      type="checkbox"
                      name="trainingConsent"
                      checked={formData.trainingConsent}
                      onChange={updateField}
                      required
                    />
                    <span>[필수] 안전보건교육 내용을 숙지하였으며 성실히 이수할 것을 서약합니다.</span>
                  </label>

                  <label className="consent-check">
                    <input
                      type="checkbox"
                      name="securityConsent"
                      checked={formData.securityConsent}
                      onChange={updateField}
                      required
                    />
                    <span>[필수] 개인정보서약서 내용을 확인하였으며 환자 및 병원 정보보호 규정을 준수할 것을 서약합니다.</span>
                  </label>
                </div>

                {/* 동의 완료 후 서명란 노출 */}
                {allConsented ? (
                  <div className="register-signature" style={{ animation: 'fadeInSlideUp 0.3s ease' }}>
                    <h4 style={{ marginBottom: '0.75rem', color: '#0F766E' }}>
                      <i className="ph-fill ph-pen-nib"></i> 통합 전자서명 (1회 서명으로 3종 서류에 일괄 날인됩니다)
                    </h4>
                    <div className="mode-selector signature-methods">
                      <button type="button" onClick={() => { setSigMethod('pc'); setSignature('') }} className={`mode-tab ${sigMethod === 'pc' ? 'active' : ''}`}>
                        <i className="ph ph-desktop"></i> 직접 서명
                      </button>
                      <button type="button" onClick={() => { setSigMethod('mobile'); setSignature('') }} className={`mode-tab ${sigMethod === 'mobile' ? 'active' : ''}`}>
                        <i className="ph ph-qr-code"></i> 휴대폰 QR
                      </button>
                      <button type="button" onClick={() => { setSigMethod('sms'); setSignature('') }} className={`mode-tab ${sigMethod === 'sms' ? 'active' : ''}`}>
                        <i className="ph ph-paper-plane-tilt"></i> 문자로 전송
                      </button>
                    </div>

                    {sigMethod === 'pc' && (
                      <SignaturePad name={formData.name} birth={birthKey} googleAppsScriptUrl={googleAppsScriptUrl} onSignatureChange={setSignature} />
                    )}

                    {sigMethod === 'mobile' && (
                      <div className="remote-sign-panel">
                        <h4><i className="ph-fill ph-cell-tower"></i> 휴대폰에서 서명하기</h4>
                        <p>아래 QR 코드를 휴대폰으로 스캔해 서명해 주세요.</p>
                        <img className="signature-qr" src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mobileSignUrl)}`} alt="모바일 서명 QR 코드" />
                        <p className={signature ? 'signature-ready' : 'signature-waiting'}>
                          {signature ? '모바일 서명이 확인되었습니다.' : isPolling ? '모바일 서명을 기다리고 있습니다...' : '성명과 주민번호를 먼저 입력해 주세요.'}
                        </p>
                      </div>
                    )}

                    {sigMethod === 'sms' && (
                      <div className="remote-sign-panel">
                        <h4><i className="ph-fill ph-paper-plane-tilt"></i> 문자로 서명 링크 보내기</h4>
                        <p>{formData.phone || '입력한 전화번호'}로 전자서명 링크를 전송합니다.</p>
                        <button type="button" className="btn-primary sms-sign-button" onClick={handleSendSmsLink} disabled={smsSending}>
                          {smsSending ? '발송 중...' : '서명 요청 문자 발송'}
                        </button>
                        <p className={signature ? 'signature-ready' : 'signature-waiting'}>
                          {signature ? '모바일 서명이 확인되었습니다.' : isPolling ? '서명 완료를 기다리고 있습니다...' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center', color: '#64748B' }}>
                    <i className="ph-bold ph-info" style={{ marginRight: '0.4rem', color: '#0F766E' }}></i>
                    위 3가지 필수 서류 항목에 모두 동의하시면 전자서명란이 열립니다.
                  </div>
                )}
              </section>

              <div className="wizard-nav-group split">
                <button type="button" className="btn-secondary" onClick={goToPrevStep}>
                  <i className="ph-bold ph-arrow-left"></i> 이전: 학력·경력
                </button>
                <button
                  type="submit"
                  className="btn-primary register-submit"
                  disabled={isSubmitting || !allConsented || !signature}
                >
                  {isSubmitting ? '제출 및 문서 생성 중...' : '인사기록카드 및 입사서약 최종 제출 📤'}
                </button>
              </div>
            </div>
          )}
        </form>
      </main>
    </>
  )
}

export default RegistrationForm
