const SubmissionProgress = () => (
  <div className="submission-progress-overlay" role="status" aria-live="polite" aria-busy="true">
    <div className="submission-progress-card">
      <span className="submission-spinner" aria-hidden="true" />
      <strong>제출 처리 중입니다</strong>
      <p>서류를 안전하게 저장하고 있습니다.<br />완료될 때까지 창을 닫지 마세요.</p>
    </div>
  </div>
)

export default SubmissionProgress
