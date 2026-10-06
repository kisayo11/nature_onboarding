import React, { useRef, useState, useEffect } from 'react'

const SignaturePad = ({ name, birth, googleAppsScriptUrl, onSignatureChange }) => {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef(null)
  const lastWidthRef = useRef(4.5)
  const loadedImageRef = useRef(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resizeCanvas = () => {
      const rect = canvas.parentElement.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      canvas.width = rect.width * ratio
      canvas.height = 200 * ratio
      canvas.style.width = '100%'
      canvas.style.height = '200px'
      const ctx = canvas.getContext('2d')
      ctx.scale(ratio, ratio)
      ctx.strokeStyle = '#111111'
      ctx.lineWidth = 4.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (loadedImageRef.current) {
        ctx.drawImage(loadedImageRef.current, 0, 0, rect.width, 200)
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [isLoaded])

  // 이름과 생년월일이 바뀔 때 저장된 서명을 조회함
  useEffect(() => {
    if (googleAppsScriptUrl && name.trim() && birth.trim() && (birth.length === 10 || birth.length === 6)) {
      fetchExistingSignature()
    } else {
      setIsLoaded(false)
      clearCanvas()
    }
  }, [name, birth, googleAppsScriptUrl])

  const fetchExistingSignature = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${googleAppsScriptUrl}?action=getSignature&name=${encodeURIComponent(name)}&birth=${encodeURIComponent(birth)}`)
      const data = await response.json()
      if (data.result === 'success' && data.exists && data.signatureData) {
        loadSignatureImage(data.signatureData)
        onSignatureChange(data.driveUrl) // 기존 서명 드라이브 url 전달
        setIsLoaded(true)
      } else {
        setIsLoaded(false)
        clearCanvas()
        onSignatureChange('')
      }
    } catch (e) {
      console.error('기존 서명 조회 실패:', e)
      setIsLoaded(false)
      clearCanvas()
      onSignatureChange('')
    } finally {
      setIsLoading(false)
    }
  }

  const loadSignatureImage = (base64Data) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.src = base64Data
    img.onload = () => {
      loadedImageRef.current = img
      clearCanvasPixels()
      const w = canvas.width / (window.devicePixelRatio || 1)
      const h = canvas.height / (window.devicePixelRatio || 1)
      ctx.drawImage(img, 0, 0, w, h)
      setIsLoaded(true)
    }
  }

  const getPos = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const startDrawing = (e) => {
    e.preventDefault()
    if (isLoaded) {
      loadedImageRef.current = null
      setIsLoaded(false)
      clearCanvasPixels()
      onSignatureChange('')
    }
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture?.(e.pointerId)
    drawingRef.current = true
    const ctx = canvas.getContext('2d')
    const pos = getPos(e)
    lastPointRef.current = pos
    lastWidthRef.current = e.pointerType === 'pen' && e.pressure > 0 ? 2.5 + (e.pressure * 4.5) : 4.5
    ctx.beginPath()
    ctx.lineWidth = lastWidthRef.current
    ctx.moveTo(pos.x, pos.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  const draw = (e) => {
    if (!drawingRef.current || !lastPointRef.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const pos = getPos(e)
    const distance = Math.hypot(pos.x - lastPointRef.current.x, pos.y - lastPointRef.current.y)
    const targetWidth = e.pointerType === 'pen' && e.pressure > 0
      ? 2.5 + (e.pressure * 4.5)
      : Math.max(2.4, 6.2 - (distance * 0.28))
    const width = (lastWidthRef.current * 0.65) + (targetWidth * 0.35)
    ctx.beginPath()
    ctx.lineWidth = width
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPointRef.current = pos
    lastWidthRef.current = width
  }

  const stopDrawing = (e) => {
    if (!drawingRef.current) return
    drawingRef.current = false
    lastPointRef.current = null
    const canvas = canvasRef.current
    if (canvas) {
      if (e?.pointerId !== undefined && canvas.hasPointerCapture?.(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId)
      }
      const dataUrl = canvas.toDataURL('image/png')
      onSignatureChange(dataUrl)
    }
  }

  const clearCanvasPixels = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width / (window.devicePixelRatio || 1)
    const h = canvas.height / (window.devicePixelRatio || 1)
    ctx.clearRect(0, 0, w, h)
  }

  const clearCanvas = () => {
    loadedImageRef.current = null
    drawingRef.current = false
    lastPointRef.current = null
    clearCanvasPixels()
    setIsLoaded(false)
    onSignatureChange('')
  }

  return (
    <div className="form-group" style={{ position: 'relative' }}>
      <label style={{ color: '#047857', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontWeight: '700' }}>
          {isLoaded ? (
            <span style={{ color: '#10B981', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <i className="ph-fill ph-check-circle" style={{ fontSize: '1.2rem' }}></i> 
              [보안 서명] 드라이브에서 서명을 성공적으로 불러왔습니다.
            </span>
          ) : (
            '[전자서명] 아래 영역에 손가락/터치로 서명을 직접 그려주세요.'
          )}
        </span>
        <button type="button" className="btn-clear" onClick={clearCanvas} style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
          지우기 <i className="ph-bold ph-eraser"></i>
        </button>
      </label>
      
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '35px',
          left: 0,
          right: 0,
          height: '200px',
          background: 'rgba(255, 255, 255, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: '12px',
          zIndex: 10,
          color: 'var(--primary)',
          fontWeight: '700',
          border: '1px solid rgba(15, 118, 110, 0.2)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <i className="ph-bold ph-spinner" style={{ fontSize: '2rem', animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }}></i>
          <span>보안 서명 데이터 확인 중...</span>
        </div>
      )}

      {isLoaded && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          backgroundColor: 'rgba(16, 185, 129, 0.9)',
          color: 'white',
          padding: '0.25rem 0.75rem',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
        }}>
          서명 불러오기 완료
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="signature-pad"
        style={{
          border: isLoaded ? '2px solid #10B981' : '2px dashed rgba(16, 185, 129, 0.4)',
          backgroundColor: isLoaded ? '#f0fdf4' : '#ffffff',
          transition: 'all 0.3s ease',
          touchAction: 'none'
        }}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
      />
      
      {isLoaded && (
        <p style={{ fontSize: '0.8rem', color: '#059669', marginTop: '0.4rem', fontWeight: '500' }}>
          ※ 서명을 다시 그리고 싶다면 캔버스를 터치하거나 우측의 [지우기]를 누르시면 됩니다.
        </p>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default SignaturePad
