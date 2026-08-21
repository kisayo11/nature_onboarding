import { useEffect, useState } from 'react'

const ConsentTable = ({ title, items, purpose }) => (
  <div className="consent-table-wrap">
    <table className="consent-table">
      <thead><tr><th>{title}</th><th>수집·이용 목적</th><th>보유기간</th></tr></thead>
      <tbody><tr><td>{items.map((item) => <div key={item}>{item}</div>)}</td><td>{purpose}</td><td>재직기간 동안 보유하고, 기타 개별법령에서 보유기간을 정하고 있는 경우 그에 따름</td></tr></tbody>
    </table>
  </div>
)

const PrivacyConsentDocument = ({ name, googleAppsScriptUrl }) => {
  const [blocks, setBlocks] = useState([])

  useEffect(() => {
    if (!googleAppsScriptUrl) return
    fetch(`${googleAppsScriptUrl}?action=getRegistrationConsent`)
      .then((response) => response.json())
      .then((data) => {
        if (data.result === 'success' && Array.isArray(data.blocks)) setBlocks(data.blocks)
      })
      .catch((error) => console.error('동의서 원문을 불러오지 못했습니다.', error))
  }, [googleAppsScriptUrl])

  const replaceTags = (text) => String(text || '')
    .replace(/\{\{\s*이름\s*\}\}/g, name || '동의자')
    .replace(/\{\{\s*날짜\s*\}\}/g, new Date().toLocaleDateString('ko-KR'))
    .replace(/\{\{\s*서명\s*\}\}/g, '(전자서명)')

  if (blocks.length) {
    return (
      <article className="consent-document">
        {blocks.map((block, blockIndex) => block.type === 'table' ? (
          <div className="consent-table-wrap" key={`table-${blockIndex}`}>
            <table className="consent-table">
              <tbody>{block.rows.map((row, rowIndex) => <tr key={`row-${rowIndex}`}>{row.map((cell, cellIndex) => {
                const Cell = rowIndex === 0 ? 'th' : 'td'
                return <Cell key={`cell-${cellIndex}`}>{replaceTags(cell)}</Cell>
              })}</tr>)}</tbody>
            </table>
          </div>
        ) : blockIndex === 0 ? (
          <h3 key={`paragraph-${blockIndex}`}>{replaceTags(block.text)}</h3>
        ) : (
          <p key={`paragraph-${blockIndex}`}>{replaceTags(block.text)}</p>
        ))}
      </article>
    )
  }

  return (
    <article className="consent-document">
    <h3>개인정보의 수집·이용에 관한 동의서</h3>
    <p><strong>{name || '동의자'}</strong>은(는) 네이처요양병원의 재직근로자로서 인사 및 노무관리상 개인정보의 수집·이용이 필요하다는 것을 이해하고, 「개인정보 보호법」 등 관련 법령에 따라 다음과 같이 본인의 개인정보, 민감정보 및 고유식별정보를 수집·이용하는 것에 동의합니다.</p>

    <ConsentTable
      title="개인정보 항목"
      items={['성명, 생년월일', '주소, 이메일, 연락처', '학력, 근무경력, 자격증', '급여계좌정보']}
      purpose="근로계약의 체결 및 유지, 급여 지급, 인사(채용, 승진, 평가 등) 및 노무관리, 복리후생 제공"
    />
    <ConsentTable
      title="민감정보 항목"
      items={['건강상태 및 병력(건강검진결과 등)', '신체장애 여부']}
      purpose="근로자 건강보호 및 배치, 관계 법령에 따른 장애인 고용 의무 이행, 정부지원금 신청"
    />
    <ConsentTable
      title="고유식별정보"
      items={['주민등록번호', '운전면허번호', '여권번호', '외국인등록번호']}
      purpose="4대 사회보험 가입·신고, 근로소득 원천징수 및 연말정산 등 세법 및 노동관계법령에 따른 의무 이행"
    />

    <ol className="consent-terms" start="2">
      <li>본 병원은 취득한 개인정보를 수집 목적 범위 내에서 적합하게 처리하며, 법령에 따라 국세청, 국민건강보험공단 등 관계 기관에 제공하는 경우를 제외하고 정보 주체의 사전 동의 없이 외부로 반출하거나 목적 외의 용도로 사용하지 않습니다.</li>
      <li>본인은 개인정보 수집·이용에 대하여 동의를 거부할 권리가 있습니다. 다만 해당 정보는 근로계약 체결 및 유지, 급여 지급, 법정 의무 이행을 위한 필수 정보이므로, 동의를 거부할 경우 채용 취소, 급여 지급 지연 등의 불이익이 발생할 수 있음을 충분히 설명 듣고 숙지하였습니다.</li>
    </ol>
    </article>
  )
}

export default PrivacyConsentDocument
