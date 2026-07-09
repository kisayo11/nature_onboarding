import React, { useState, useEffect } from 'react'
import OnboardingForm from './components/OnboardingForm'
import OffboardingForm from './components/OffboardingForm'
import MobileSignView from './components/MobileSignView'

const App = () => {
  const [mode, setMode] = useState('onboarding') // 'onboarding' or 'offboarding'
  const [view, setView] = useState('admin') // 'admin', 'mobile-sign', 'self-service'
  const googleAppsScriptUrl = 'https://script.google.com/macros/s/AKfycbxExxPP4e3gQEtlZCCA7b8LNzvx7944YEXt9PvTVD3XrFdoLk21TUACciXGG4qXa_yz/exec'

  useEffect(() => {
    // 해시 및 쿼리 기반 모드 탐지
    const hash = window.location.hash
    const params = new URLSearchParams(window.location.search)
    const modeParam = params.get('mode') || params.get('type')
    const viewParam = params.get('view')

    if (viewParam === 'mobile-sign') {
      setView('mobile-sign')
    } else if (viewParam === 'self-service') {
      setView('self-service')
    } else {
      setView('admin')
    }

    if (modeParam === 'offboarding' || hash === '#off' || hash === '#offboarding' || hash === '#퇴사자') {
      setMode('offboarding')
    } else {
      setMode('onboarding')
    }
  }, [])

  const switchMode = (newMode) => {
    setMode(newMode)
    window.location.hash = newMode === 'offboarding' ? 'off' : 'on'
  }

  if (view === 'mobile-sign') {
    return <MobileSignView googleAppsScriptUrl={googleAppsScriptUrl} />
  }

  if (view === 'self-service') {
    return (
      <div>
        <header className="header" style={{ padding: '2rem 1rem' }}>
          <div className="hospital-logo-wrap">
            <i className="ph-fill ph-hospital"></i>
          </div>
          <h1>{mode === 'onboarding' ? '네이처요양병원 입사서약' : '네이처요양병원 퇴사서약'}</h1>
          <p>모바일 서명 및 제출을 위한 비대면 작성 페이지입니다.</p>
        </header>
        <main style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
          {mode === 'onboarding' ? (
            <OnboardingForm googleAppsScriptUrl={googleAppsScriptUrl} selfService={true} />
          ) : (
            <OffboardingForm googleAppsScriptUrl={googleAppsScriptUrl} selfService={true} />
          )}
        </main>
      </div>
    )
  }

  return (
    <div>
      <header className="header">
        <div className="hospital-logo-wrap">
          <i className="ph-fill ph-hospital"></i>
        </div>
        <h1>{mode === 'onboarding' ? '입사를 환영합니다! 🎉' : '수고하셨습니다 🍀'}</h1>
        <p>
          {mode === 'onboarding'
            ? '네이처요양병원 신규 가족을 위한 온보딩 허브입니다.'
            : '네이처요양병원 퇴사 절차를 진행해 주세요. 그동안의 노고에 진심으로 감사드립니다.'}
        </p>

        {/* Mode Selector */}
        <div className="mode-selector" style={{ maxWidth: '320px', margin: '2rem auto 0', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <div className={`mode-tab ${mode === 'onboarding' ? 'active' : ''}`} onClick={() => switchMode('onboarding')}>
            <i className="ph ph-user-plus" style={{ marginRight: '0.4rem' }}></i> 입사자
          </div>
          <div className={`mode-tab ${mode === 'offboarding' ? 'active' : ''}`} onClick={() => switchMode('offboarding')}>
            <i className="ph ph-user-minus" style={{ marginRight: '0.4rem' }}></i> 퇴사자
          </div>
        </div>
      </header>

      <main className="timeline">
        {mode === 'onboarding' ? (
          <>
            {/* Step 1: 인사기록 */}
            <article className="step-card visible">
              <div className="step-header">
                <div className="step-badge">1</div>
                <div className="step-title-wrapper">
                  <h2>인사기록카드 폼 작성</h2>
                  <p className="step-desc">급여 지급 및 4대 보험 신고를 위한 기초 정보</p>
                </div>
              </div>
              <div className="step-body">
                <ul className="check-list">
                  <li><i className="ph-fill ph-clock"></i> <strong>소요 시간:</strong> 약 5~10분 내외</li>
                  <li><i className="ph-fill ph-file-text"></i> 정확한 정보로 기입 후 마지막 페이지에서 '제출'을 꼭 눌러주세요.</li>
                </ul>
                <div className="action-group">
                  <a href="https://docs.google.com/forms/d/1CQP7AZbP8TzB4kX02NGY3OPBalbGXKY-792qvoCoe7U/preview" target="_blank" rel="noreferrer" className="btn-primary">
                    <i className="ph-bold ph-pencil-simple"></i> 구글 인사기록 폼 열기
                  </a>
                  <span className="url-hint">https://docs.google.com/forms/d/...</span>
                </div>
              </div>
            </article>

            {/* Step 2: 범죄경력조회 */}
            <article className="step-card visible">
              <div className="step-header">
                <div className="step-badge">2</div>
                <div className="step-title-wrapper">
                  <h2>범죄경력조회 사전 동의</h2>
                  <p className="step-desc">의료법 및 관련 복지법 기반 필수 전력 시스템 조회</p>
                </div>
              </div>
              <div className="step-body">
                <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '1rem' }}>
                  경찰청 범죄경력회보서 발급시스템에서 <strong>'취업예정자 발급동의'</strong>를 통해 진행합니다.<br />
                  지원하시는 직종에 따라 <strong>조회해야 할 법령 항목이 다르니</strong> 아래 표를 확인해 주의해서 체크해 주세요.
                </p>

                <div className="role-breakdown">
                  <div className="role-group" style={{ borderLeftColor: '#3B82F6' }}>
                    <h4><i className="ph-fill ph-stethoscope"></i> 의사 / 간호사(RN)</h4>
                    <p style={{ marginBottom: '0.5rem', color: '#E11D48' }}><strong>총 3회 신청 (아래 3가지 항목 모두 발급)</strong></p>
                    <div>
                      <span className="tag">성범죄경력 및 아동학대</span>
                      <span className="tag">노인학대</span>
                      <span className="tag">장애인 학대</span>
                    </div>
                  </div>

                  <div className="role-group" style={{ borderLeftColor: '#10B981' }}>
                    <h4><i className="ph-fill ph-bandaids"></i> 물리/작업치료사, 간호조무사(AN)</h4>
                    <p style={{ marginBottom: '0.5rem', color: '#E11D48' }}><strong>총 3회 신청 (아래 3가지 항목 모두 발급)</strong></p>
                    <div>
                      <span className="tag">노인학대</span>
                      <span className="tag">장애인 학대</span>
                      <span className="tag">성범죄 경력</span>
                    </div>
                  </div>

                  <div className="role-group admin" style={{ borderLeftColor: '#64748B' }}>
                    <h4><i className="ph-fill ph-desktop"></i> 기타 (원무/행정/시설/영양 등)</h4>
                    <p style={{ marginBottom: '0.5rem', color: '#E11D48' }}><strong>총 1회 신청</strong></p>
                    <div>
                      <span className="tag">노인학대</span>
                    </div>
                  </div>
                </div>

                <ul className="check-list" style={{ marginTop: 0 }}>
                  <li><i className="ph-bold ph-check-circle"></i> <strong>준비물:</strong> 공동/금융인증서 또는 간편인증(PASS, 카카오톡 등)</li>
                </ul>

                <div className="action-group" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.4)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <a href="https://crims.police.go.kr/" target="_blank" rel="noreferrer" className="btn-primary btn-outline" style={{ marginBottom: '0.5rem' }}>
                      <i className="ph-bold ph-shield-check"></i> 경찰청 발급시스템 사이트 이동
                    </a>
                    <a href="https://drive.google.com/file/d/1iQe7nIehb5H2MHYGlAbEHXIhIJpV8N6d/view?usp=sharing" target="_blank" rel="noreferrer" className="btn-primary" style={{ background: 'linear-gradient(135deg, #475569, #334155)', marginBottom: '0.5rem', boxShadow: '0 8px 25px rgba(71, 85, 105, 0.4)' }}>
                      <i className="ph-bold ph-file-pdf"></i> 안내 매뉴얼 열기 (필독)
                    </a>
                    <span className="url-hint">https://crims.police.go.kr/</span>
                  </div>
                </div>
              </div>
            </article>

            {/* Step 3: 전자서명 (Onboarding Form) */}
            <OnboardingForm googleAppsScriptUrl={googleAppsScriptUrl} />

            {/* Step 4: 당일 준비 */}
            <article className="step-card optional visible">
              <div className="step-header">
                <div className="step-badge">4</div>
                <div className="step-title-wrapper">
                  <h2>[출근 준비] 실물 서류 및 인프라</h2>
                  <p className="step-desc">첫 출근 시 총무팀/원무과 제출 사항</p>
                </div>
              </div>
              <div className="step-body">
                <ul className="check-list">
                  <li><i className="ph-bold ph-files"></i> <strong>필수 서류:</strong> 등본 1통, 통장 사본, 면허/자격증 사본</li>
                  <li><i className="ph-bold ph-thermometer"></i> <strong>건강진단서:</strong> 채용신체검사서
                    <span className="text-warning">※ 잠복결핵 및 B형 간염 검사는 본원(네이처요양병원)에서 진행 가능</span>
                  </li>
                  <li><i className="ph-bold ph-car"></i> <strong>차량 등록:</strong> 출퇴근 차량 번호 원무과 등록
                    <span className="text-warning">※ SUV 전 차종 및 대형 승용차량은 병원 주차타워 구조상 등록 불가</span>
                  </li>
                </ul>
              </div>
            </article>

            {/* Step 5: 가이드 */}
            <article className="step-card optional visible">
              <div className="step-header">
                <div className="step-badge">5</div>
                <div className="step-title-wrapper">
                  <h2>병원 생활 가이드</h2>
                  <p className="step-desc">원내 와이파이 및 층별 주요 시설 안내</p>
                </div>
              </div>
              <div className="step-body">
                <div className="info-grid">
                  <div className="info-box highlight">
                    <i className="ph-bold ph-wifi-high"></i>
                    <h3>Open Wi-Fi 네트워크</h3>
                    <p><strong>SSID:</strong> NatureHospital</p>
                  </div>
                  <div className="info-box">
                    <i className="ph-bold ph-map-trifold"></i>
                    <h3>층별 주요 시설</h3>
                    <p>
                      구내식당: <strong>지하 2층</strong><br />
                      여자탈의실: <strong>지하 2층 안쪽</strong><br />
                      남자탈의실: <strong>1.5층</strong>
                    </p>
                  </div>
                </div>
              </div>
            </article>
          </>
        ) : (
          /* Offboarding (Only Form is shown for clean Offboarding flow) */
          <OffboardingForm googleAppsScriptUrl={googleAppsScriptUrl} />
        )}
      </main>

      <footer className="footer">
        <p>온보딩/오프보딩 준비 중 막히는 부분이 있으시다면 언제든 총무팀/원무과로 문의해 주세요.</p>
        <div className="contact-pill-wrap">
          <div className="contact-pill">
            <i className="ph-fill ph-phone"></i> 내선 905
          </div>
          <div className="contact-pill">
            <i className="ph-fill ph-envelope-simple"></i> naturehello3@gmail.com
          </div>
        </div>
        <p style={{ marginTop: '2rem', fontSize: '0.8rem', opacity: 0.6 }}>&copy; 2026 네이처요양병원. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
