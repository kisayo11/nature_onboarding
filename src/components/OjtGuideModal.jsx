import React, { useState, useEffect } from 'react'

// OJT 메인 콘텐츠 컴포넌트 (구글 시트 100% 동적 연동)
export const OjtGuideContent = ({ googleAppsScriptUrl }) => {
  const [activeTab, setActiveTab] = useState('contacts')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [isLiveSheet, setIsLiveSheet] = useState(false)

  const [contacts, setContacts] = useState([])
  const [floors, setFloors] = useState([])
  const [tools, setTools] = useState([])
  const [welfare, setWelfare] = useState([])

  // 구글 시트 동적 데이터 fetching
  useEffect(() => {
    if (!googleAppsScriptUrl) return

    setLoading(true)
    fetch(`${googleAppsScriptUrl}?action=getOjtData`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.result === 'success' && data.data) {
          const sheetData = data.data
          setContacts(sheetData.contacts || [])
          setFloors(sheetData.floors || [])
          setTools(sheetData.tools || [])
          setWelfare(sheetData.welfare || [])
          setIsLiveSheet(true)
        }
      })
      .catch((err) => {
        console.error('OJT 구글 시트 연동 오류:', err)
      })
      .finally(() => setLoading(false))
  }, [googleAppsScriptUrl])
      .finally(() => setLoading(false))
  }, [googleAppsScriptUrl])

  const filteredContacts = contacts.filter(
    (c) =>
      c.role.includes(searchTerm) ||
      c.name.includes(searchTerm) ||
      c.ext.includes(searchTerm) ||
      c.dept.includes(searchTerm)
  )

  return (
    <div className="ojt-inner-wrapper">
      {/* Dynamic Status Indicator */}
      <div className="ojt-sync-bar">
        <span className={`sync-status ${isLiveSheet ? 'live' : 'default'}`}>
          <i className={`ph-fill ${isLiveSheet ? 'ph-check-circle' : 'ph-cloud'}`}></i>
          {isLiveSheet ? '구글 시트 연동 완료 (실시간 동기화)' : '스프레드시트 연동 준비됨'}
        </span>
        {loading && <span className="sync-loading">데이터 불러오는 중...</span>}
      </div>

      {/* Tabs */}
      <div className="ojt-nav-tabs">
        <button
          className={`ojt-tab ${activeTab === 'contacts' ? 'active' : ''}`}
          onClick={() => setActiveTab('contacts')}
        >
          <i className="ph-fill ph-phone-call"></i> 내선번호 & 담당자 ({contacts.length})
        </button>
        <button
          className={`ojt-tab ${activeTab === 'floors' ? 'active' : ''}`}
          onClick={() => setActiveTab('floors')}
        >
          <i className="ph-fill ph-buildings"></i> 층별 주요 시설 ({floors.length})
        </button>
        <button
          className={`ojt-tab ${activeTab === 'tools' ? 'active' : ''}`}
          onClick={() => setActiveTab('tools')}
        >
          <i className="ph-fill ph-desktop-tower"></i> 업무 협업 도구
        </button>
        <button
          className={`ojt-tab ${activeTab === 'welfare' ? 'active' : ''}`}
          onClick={() => setActiveTab('welfare')}
        >
          <i className="ph-fill ph-gift"></i> 복리후생 & 꿀팁
        </button>
      </div>

      {/* Content Area */}
      <div className="ojt-content-body">
        {/* Tab 1: 내선번호 */}
        {activeTab === 'contacts' && (
          <div className="ojt-tab-pane">
            <div className="ojt-search-box">
              <i className="ph-bold ph-magnifying-glass"></i>
              <input
                type="text"
                placeholder="부서, 담당자 이름, 내선번호 빠른 검색 (예: 원무, 김상용, 905)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="search-clear-btn" onClick={() => setSearchTerm('')}>
                  초기화
                </button>
              )}
            </div>

            <div className="contact-grid">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact, idx) => (
                  <div className="contact-card" key={idx}>
                    <div className="contact-role-row">
                      <span className="contact-dept-tag">{contact.dept}</span>
                      <span className="contact-ext">
                        <i className="ph-fill ph-phone"></i> <strong>내선 {contact.ext}</strong>
                      </span>
                    </div>
                    <h4 className="contact-name">{contact.name}</h4>
                    <p className="contact-role">{contact.role}</p>
                  </div>
                ))
              ) : (
                <div className="no-result">
                  <i className="ph-bold ph-warning-circle"></i>
                  <p>검색 결과가 없습니다. 다른 검색어를 입력해 보세요.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: 층별 안내 */}
        {activeTab === 'floors' && (
          <div className="ojt-tab-pane">
            <div className="floor-list">
              {floors.map((item, idx) => (
                <div className="floor-card" key={idx}>
                  <div className="floor-badge">{item.floor}</div>
                  <div className="floor-detail">
                    <h4>{item.title}</h4>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: 업무 협업 도구 */}
        {activeTab === 'tools' && (
          <div className="ojt-tab-pane">
            <div className="tools-grid">
              {tools.map((tool, idx) => (
                <div className="tool-card" key={idx}>
                  <div className="tool-icon-wrap">
                    <i className={`ph-fill ${tool.icon || 'ph-desktop'}`}></i>
                  </div>
                  <div className="tool-info">
                    <div className="tool-header">
                      <h4>{tool.name}</h4>
                      {tool.badge && <span className="tool-badge">{tool.badge}</span>}
                    </div>
                    <p>{tool.category}</p>
                    {tool.url ? (
                      <a
                        href={tool.url}
                        target="_blank"
                        rel="noreferrer"
                        className="tool-link-btn"
                      >
                        접속 페이지 열기 <i className="ph-bold ph-arrow-square-out"></i>
                      </a>
                    ) : (
                      <span className="tool-note">※ 사내 PC 내부 프로그램 실행</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: 복리후생 & 꿀팁 */}
        {activeTab === 'welfare' && (
          <div className="ojt-tab-pane">
            <div className="welfare-grid">
              {welfare.map((item, idx) => (
                <div className="welfare-card" key={idx}>
                  <div className="welfare-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                    <i className={`ph-fill ${item.icon || 'ph-gift'}`}></i>
                  </div>
                  <div className="welfare-content">
                    <h4>{item.title}</h4>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 상단 고정 아코디언 섹션 컴포넌트
export const OjtGuideSection = ({ googleAppsScriptUrl, defaultOpen = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultOpen)

  return (
    <article className={`step-card ojt-top-card visible ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div
        className="step-header ojt-accordion-header"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div className="step-badge ojt-badge-top">OJT</div>
          <div className="step-title-wrapper">
            <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#0F766E', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              🎉 네이처 요양병원 신규직원 퀵 가이드
            </h2>
          </div>
        </div>
        <div className="accordion-toggle-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0F766E', fontWeight: 700, fontSize: '0.88rem' }}>
          <span>{isExpanded ? '가이드 접기' : '가이드 펼쳐보기'}</span>
          <i className={`ph-bold ${isExpanded ? 'ph-caret-up' : 'ph-caret-down'}`} style={{ fontSize: '1.2rem' }}></i>
        </div>
      </div>
      
      {isExpanded && (
        <div className="step-body ojt-accordion-body" style={{ borderTop: '1px solid #CCFBF1', marginTop: '0.8rem', paddingTop: '1rem', animation: 'fadeIn 0.25s ease-out' }}>
          <OjtGuideContent googleAppsScriptUrl={googleAppsScriptUrl} />
        </div>
      )}
    </article>
  )
}

// 팝업 모달 컴포넌트
const OjtGuideModal = ({ isOpen, onClose, googleAppsScriptUrl }) => {
  if (!isOpen) return null

  return (
    <div className="ojt-modal-backdrop" onClick={onClose}>
      <div className="ojt-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="ojt-modal-header">
          <div className="ojt-title-area">
            <span className="ojt-badge">DYNAMIC OJT GUIDE</span>
            <h2>네이처요양병원 신규직원 퀵 가이드 📖</h2>
          </div>
          <button className="ojt-close-btn" onClick={onClose} aria-label="닫기">
            <i className="ph-bold ph-x"></i>
          </button>
        </div>

        <div className="ojt-modal-body">
          <OjtGuideContent googleAppsScriptUrl={googleAppsScriptUrl} />
        </div>

        <div className="ojt-modal-footer">
          <a
            href="https://canva.link/g8bugzxr009205c"
            target="_blank"
            rel="noreferrer"
            className="canva-original-btn"
          >
            <i className="ph-bold ph-presentation-chart"></i> Canva 원본 OJT 슬라이드
          </a>
        </div>
      </div>
    </div>
  )
}

export default OjtGuideModal
