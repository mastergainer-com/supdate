export function StepIndicator({ current, total = 3 }: { current: number; total?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', justifyContent: 'center' }}>
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1
        const isActive = step === current
        const isDone = step < current
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: '700',
              background: isDone ? '#00c864' : isActive ? '#00d4ff' : '#1a1a2e',
              color: isDone || isActive ? '#000' : '#8888aa',
              border: isActive ? '2px solid #00d4ff' : isDone ? '2px solid #00c864' : '2px solid rgba(255,255,255,0.08)',
              transition: 'all 0.3s',
            }}>
              {isDone ? '✓' : step}
            </div>
            {i < total - 1 && (
              <div style={{
                width: '2rem',
                height: '2px',
                background: isDone ? '#00c864' : 'rgba(255,255,255,0.08)',
                transition: 'all 0.3s',
              }} />
            )}
          </div>
        )
      })}
      <span style={{ color: '#8888aa', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
        Schritt {current} von {total}
      </span>
    </div>
  )
}
