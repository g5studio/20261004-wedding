/**
 * 場景進度條（由離散場景索引驅動，避免卡在轉場中間的進度）。
 */
export function ScrollProgress({ progress }: { progress: number }) {
  const clamped = Math.min(1, Math.max(0, progress))

  return (
    <div
      className="fixed inset-x-0 top-0 z-50"
      style={{
        height: 'var(--progress-height)',
        background: 'var(--progress-track)',
      }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      aria-label="場景進度"
    >
      <div
        className="h-full origin-left"
        style={{
          width: `${clamped * 100}%`,
          background: 'var(--progress-fill)',
          transition: `width var(--primitive-duration-normal) ease`,
        }}
      />
    </div>
  )
}
