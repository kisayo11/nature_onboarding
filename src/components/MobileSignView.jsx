import React, { useState } from 'react'
import SignaturePad from './SignaturePad'

const MobileSignView = ({ googleAppsScriptUrl }) => {
  const params = new URLSearchParams(window.location.search)
  const name = params.get('name') || ''
  const birth = params.get('birth') || ''
  const type = params.get('type') || 'onboarding' // 'onboarding' or 'offboarding'

  const [signature, setSignature] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  const docTemplates = type === 'onboarding' 
    ? {
        training: '1uQvHrouIG94qp-txtvDrwu1n1F_cu_52QaYg7b9emVU', // 안전보건교육
        privacy: '13b98fzAIaf1UtNVmlqqBFyLWQPMDmlnheIKp4jDBoUk'   // 개인정보서약
      }
    : {
        resignation: '1RZL9NZKAOHarK2mlo0BI9dqljcN7jasJVZ-gtNUzSDk', // 사직원
        securityOff: '1HHaNxruT-k21ftyt1IAJzf6sq0q0n6yaODCX19stLjs'  // 보안서약
      }

  const handleSubSignature = async () => {
    if (!signature) {
      alert('서명을 해주세요!')
      return
    }
    setIsSubmitting(true)
    try {
      const response = await fetch(googleAppsScriptUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'saveSignatureOnly',
          name,
          birth,
          signature
        }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      })
      const result = await response.json()
      if (result.result === 'success') {
        setIsDone(true)
      } else {
        alert('❌ 서명 저장 오류: ' + result.message)
      }
    } catch (e) {
      console.error(e)
      alert('❌ 서버 통신 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isDone) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1.5rem', animation: 'fadeIn 0.5s ease' }}>
        <i className="ph-fill ph-check-circle" style={{ fontSize: '5rem', color: '#10B981', marginBottom: '1.5rem', display: 'block' }}></i>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '1rem' }}>서명 전송 완료!</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
          서명이 성공적으로 전달되었습니다.<br />
          이제 PC 화면을 확인해 면담을 계속 진행해 주세요.
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#0F766E', fontSize: '1.5rem' }}>네이처요양병원 모바일 서약</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          대상자: <strong>{name}</strong> ({birth})
        </p>
      </div>

      <div style={{ marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <label style={{ color: '#047857', fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>
          [서약서 미리보기]
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {Object.keys(docTemplates).map(key => (
            <div key={key} style={{ flex: 1, overflow: 'hidden', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <img
                src={`https://drive.google.com/thumbnail?id=${docTemplates[key]}&sz=w300`}
                alt="Document Preview"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          ※ 서약서 본문은 담당자 PC의 서약 서류와 동일합니다.
        </p>
      </div>

      <SignaturePad
        name={name}
        birth={birth}
        googleAppsScriptUrl={googleAppsScriptUrl}
        onSignatureChange={setSignature}
      />

      <button
        onClick={handleSubSignature}
        disabled={isSubmitting || !signature}
        className="btn-primary"
        style={{
          marginTop: '1.5rem',
          width: '100%',
          background: 'linear-gradient(135deg, #0F766E, #14B8A6)',
          opacity: (isSubmitting || !signature) ? 0.7 : 1
        }}
      >
        <i className="ph-bold ph-paper-plane-tilt"></i> {isSubmitting ? '서명 전송 중...' : '서명 전송하기'}
      </button>
    </div>
  )
}

export default MobileSignView
