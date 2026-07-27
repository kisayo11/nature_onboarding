import React, { useState, useEffect } from 'react'

const DEFAULT_CONTACTS = [
  { role: '원무데스크 1', name: '', ext: '900', dept: '원무데스크 1' },
  { role: '원무데스크 2', name: '', ext: '990', dept: '원무데스크 2' },
  { role: '사회복지사', name: '', ext: '910', dept: '사회복지사' },
  { role: '원무과장', name: '김상용', ext: '901', dept: '원무과장' },
  { role: '원무대리', name: '강혜민', ext: '902', dept: '원무대리' },
  { role: '총무팀장', name: '김미혜', ext: '905', dept: '총무팀장' },
  { role: '방사선실장', name: '김동휘', ext: '906', dept: '방사선실장' },
  { role: 'OPS', name: '장수진', ext: '908', dept: 'OPS' },
  { role: '상담실장', name: '허지현', ext: '210', dept: '상담실장' },
  { role: '상담간호사', name: '김은실', ext: '211', dept: '상담간호사' },
  { role: '진료실1', name: '김선정', ext: '911', dept: '진료실1' },
  { role: '진료실2', name: '주용식', ext: '912', dept: '진료실2' },
  { role: '진료실3', name: '이상미', ext: '913', dept: '진료실3' },
  { role: '진료실4', name: '고은주', ext: '914', dept: '진료실4' },
  { role: '진료실5', name: '김홍금', ext: '915', dept: '진료실5' },
  { role: '주차관리실', name: '', ext: '999', dept: '주차관리실' },
  { role: '심사팀장', name: '김미진', ext: '917', dept: '심사팀장' },
  { role: '간호부장', name: '정을주', ext: '918', dept: '간호부장' },
  { role: '병원장', name: '이진희', ext: '919', dept: '병원장' },
  { role: '약제과', name: '미남희', ext: '921', dept: '약제과' },
  { role: '시설미화팀장', name: '정평오', ext: '923', dept: '시설미화팀장' },
  { role: '영양팀장', name: '최윤정', ext: '925', dept: '영양팀장' },
  { role: '재활치료센터장', name: '정진광', ext: '209', dept: '재활치료센터장' },
  { role: '재활치료실', name: '', ext: '200', dept: '재활치료실' },
  { role: '3층 간호사실', name: '', ext: '300', dept: '3층 간호사실' },
  { role: '4층 간호사실', name: '', ext: '400', dept: '4층 간호사실' },
  { role: '5층 간호사실', name: '', ext: '500', dept: '500', dept: '5층 간호사실' },
  { role: '6층 간호사실', name: '', ext: '600', dept: '6층 간호사실' },
  { role: '7층 간호사실', name: '', ext: '700', dept: '7층 간호사실' },
  { role: '헤모필리아센터 (치치실)', name: '한문희', ext: '930', dept: '헤모필리아센터' },
  { role: '헤모필리아센터 (치료실)', name: '정진광', ext: '932', dept: '헤모필리아센터' }
]

const DEFAULT_FLOORS = [
  { floor: '옥상 (R)', title: '하늘정원', desc: '휴게 공간, 태양열 판넬, 실외기' },
  { floor: '7F ~ 8F', title: 'VIP & VVIP 병동', desc: '1인실, 2인실, VIP 810호 병실' },
  { floor: '4F ~ 6F', title: '일반 병동 (4,5,6병동)', desc: '4인실, 6인실' },
  { floor: '3F', title: '3병동 (ICU 중환자실)', desc: 'ICU, 1인실, 4인실, 6인실, 헤모병실' },
  { floor: '2F', title: '재활치료센터', desc: '물리치료실, 작업치료실' },
  { floor: '1F', title: '원무 & 대기공간', desc: '원무과, 데스크, 상담실, 카페 드래더(Cafe), 프로그램실, 정문/후문' },
  { floor: 'B1F', title: '진료 & 행정센터', desc: '병원장실, 진료실(1~5과), 행정부장실, 심사팀, 영상의학실, 소회의실, 서버실' },
  { floor: 'B2F', title: '구내식당 & 복지시설', desc: '구내식당(중식 제공), 탈의실(여), 영양팀, 세탁실, 소독실, 린넨실, 헤모필리아센터' },
  { floor: 'B3F ~ B4F', title: '시설 & 주차장', desc: 'B3: 시설팀, 방재실, 산소실 | B4: 주차장, 설비시설 (※ 1.5F: 남자탈의실)' }
]

const DEFAULT_TOOLS = [
  {
    name: 'kt bizmeka ez (그룹웨어)',
    category: '전자결재 / 사내메신저 / 일정',
    url: 'https://ezsso.bizmeka.com/sso/ssoLogin.do',
    icon: 'ph-article',
    badge: '필수 접속'
  },
  {
    name: 'Google Drive',
    category: '업무 문서 공유 & 서식 데이터',
    url: 'https://drive.google.com',
    icon: 'ph-google-drive-logo',
    badge: '업무공유'
  },
  {
    name: 'DOCTORS (EMR / PACS)',
    category: '전자의무기록 및 의료영상 차트',
    url: '',
    icon: 'ph-first-aid',
    badge: '원내 프로그램'
  },
  {
    name: 'Slack / Gmail',
    category: '팀 커뮤니케이션 & 사내 메일',
    url: '',
    icon: 'ph-slack-logo',
    badge: '소통 채널'
  }
]

const DEFAULT_WELFARE = [
  {
    title: '카페 드래더 (Cafe de Ladder)',
    desc: '1층에 위치한 병원 전용 카페로, 임직원 대상 전 음료 20% 할인 적용 혜택이 제공됩니다.',
    icon: 'ph-coffee',
    color: 'blue'
  },
  {
    title: '구내식당 중식 무료 제공',
    desc: '지하 2층 구내식당에서 매일 맛있고 영양가 높은 영양식 중식이 무료로 제공됩니다.',
    icon: 'ph-fork-knife',
    color: 'green'
  },
  {
    title: '생일 축하금 & 포상',
    desc: '생일을 맞이한 임직원 축하금 지급 및 매월 이달의 친절사원 선정 및 포상 제도가 운영됩니다.',
    icon: 'ph-cake',
    color: 'amber'
  },
  {
    title: '월말 송년회 및 이벤트',
    desc: '모든 부서원이 함께 어우러지는 월말 및 연말 송년회 행사 및 다양한 소통 프로그램을 지원합니다.',
    icon: 'ph-users-three',
    color: 'purple'
  }
]

// OJT 메인 콘텐츠 컴포넌트
export const OjtGuideContent = ({ googleAppsScriptUrl }) => {
  const [activeTab, setActiveTab] = useState('contacts')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [isLiveSheet, setIsLiveSheet] = useState(false)

  const [contacts, setContacts] = useState(DEFAULT_CONTACTS)
  const [floors, setFloors] = useState(DEFAULT_FLOORS)
  const [tools, setTools] = useState(DEFAULT_TOOLS)
  const [welfare, setWelfare] = useState(DEFAULT_WELFARE)

  // 구글 시트 동적 데이터 fetching
  useEffect(() => {
    if (!googleAppsScriptUrl) return

    setLoading(true)
    fetch(`${googleAppsScriptUrl}?action=getOjtData`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.result === 'success' && data.data) {
          const sheetData = data.data
          if (sheetData.contacts && sheetData.contacts.length > 0) setContacts(sheetData.contacts)
          if (sheetData.floors && sheetData.floors.length > 0) setFloors(sheetData.floors)
          if (sheetData.tools && sheetData.tools.length > 0) setTools(sheetData.tools)
          if (sheetData.welfare && sheetData.welfare.length > 0) setWelfare(sheetData.welfare)
          setIsLiveSheet(true)
        }
      })
      .catch((err) => {
        console.warn('OJT 구글 시트 데이터 로딩 실패. 기본 데이터 적용:', err)
      })
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
