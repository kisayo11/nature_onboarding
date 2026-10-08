import React, { useState } from 'react'
import SignaturePad from './SignaturePad'
import { lookupAccessEmployee, submitAccessSignature } from '../services/apiClient'

const AccessSignatureView = ({ googleAppsScriptUrl }) => {
  const [name, setName] = useState('')
  const [dept, setDept] = useState('')
  const [birth, setBirth] = useState('')
  const [employee, setEmployee] = useState(null)
  const [signature, setSignature] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDone, setIsDone] = useState(false)

  const handleLookup = async (event) => {
    event.preventDefault()
    if (!name.trim() || !dept.trim() || !/^\d{6}$/.test(birth)) {
      setMessage('이름, 부서, 생년월일 6자리를 모두 입력해 주세요.')
      return
    }
    setIsLoading(true)
    setMessage('')
    setEmployee(null)
    setSignature('')
    try {
      const result = await lookupAccessEmployee({
        action: 'lookupAccessEmployee',
        name: name.trim(),
        dept: dept.trim(),
        birth
      })
      if (!result.found) {
        setMessage(result.message || '직원 정보를 찾을 수 없습니다.')
        return
      }
      if (result.alreadySigned) {
        setMessage('이미 등록된 서명이 있습니다. 추가 서명은 필요하지 않습니다.')
        return
      }
      setEmployee({ name: result.name, dept: result.dept, birth })
    } catch (error) {
      setMessage(error.message || '직원 조회 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!employee || !signature) {
      setMessage('직원 조회 후 서명을 작성해 주세요.')
      return
    }
    setIsLoading(true)
    setMessage('')
    try {
      await submitAccessSignature({
        action: 'saveAccessSignature',
        name: employee.name,
        dept: employee.dept,
        birth: employee.birth,
        signature
      })
      setIsDone(true)
    } catch (error) {
      setMessage(error.message || '서명 저장 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isDone) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1.5rem', maxWidth: '520px', margin: '0 auto' }}>
        <i className="ph-fill ph-check-circle" style={{ fontSize: '5rem', color: '#10B981', display: 'block', marginBottom: '1.5rem' }} />
        <h2 style={{ marginBottom: '1rem' }}>접근권한 요청서 서명 등록 완료</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          서명이 안전하게 저장되었습니다. 담당자가 개인정보동의서 누락명단을 갱신하면 반영됩니다.
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '560px', margin: '0 auto' }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div className="hospital-logo-wrap" style={{ margin: '0 auto 1rem' }}>
          <i className="ph-fill ph-signature" />
        </div>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '0.6rem' }}>접근권한 요청서 서명 등록</h1>
        <p style={{ color: 'var(--text-muted)' }}>담당자 확인 아래 이름, 소속 부서, 생년월일 6자리를 입력해 주세요.</p>
      </header>

      <form onSubmit={handleLookup} className="step-card visible" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div className="form-group">
          <label htmlFor="access-name">이름</label>
          <input id="access-name" value={name} onChange={(event) => setName(event.target.value)} disabled={Boolean(employee)} autoComplete="off" />
        </div>
        <div className="form-group">
          <label htmlFor="access-dept">부서</label>
          <input id="access-dept" value={dept} onChange={(event) => setDept(event.target.value)} disabled={Boolean(employee)} autoComplete="off" placeholder="예: 간호부, 원무과, 재활치료센터" />
        </div>
        <div className="form-group">
          <label htmlFor="access-birth">생년월일 6자리</label>
          <input
            id="access-birth"
            value={birth}
            onChange={(event) => setBirth(event.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            disabled={Boolean(employee)}
            autoComplete="off"
            inputMode="numeric"
            maxLength={6}
            placeholder="예: 900101"
          />
        </div>
        {!employee && (
          <button type="submit" className="btn-primary" disabled={isLoading} style={{ width: '100%' }}>
            <i className="ph-bold ph-magnifying-glass" /> {isLoading ? '조회 중...' : '직원 조회'}
          </button>
        )}
      </form>

      {message && (
        <div style={{ padding: '1rem', borderRadius: '10px', background: '#fff7ed', color: '#9a3412', marginBottom: '1rem' }}>
          {message}
        </div>
      )}

      {employee && (
        <section className="step-card visible" style={{ padding: '1.25rem' }}>
          <p style={{ marginBottom: '1rem', color: '#047857', fontWeight: 700 }}>
            확인된 직원: {employee.name} / {employee.dept}
          </p>
          <SignaturePad
            name={employee.name}
            birth={employee.birth}
            googleAppsScriptUrl={googleAppsScriptUrl}
            onSignatureChange={setSignature}
          />
          <button type="button" className="btn-primary" onClick={handleSubmit} disabled={isLoading || !signature} style={{ width: '100%', marginTop: '1.25rem' }}>
            <i className="ph-bold ph-paper-plane-tilt" /> {isLoading ? '저장 중...' : '서명 등록'}
          </button>
        </section>
      )}
    </div>
  )
}

export default AccessSignatureView
