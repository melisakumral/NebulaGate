import { useEffect, useState } from 'react'
import { getScoreColor, getScoreLabel } from '../styles/colors'
import type { ScoreGaugeProps } from '../types'

const RADIUS = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
// Gauge yalnızca 270° (3/4 daire) gösterir
const GAUGE_ARC = CIRCUMFERENCE * 0.75

export function ScoreGauge({ score, animated = false }: ScoreGaugeProps) {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score)

  useEffect(() => {
    if (!animated) {
      setDisplayScore(score)
      return
    }
    // Sayaç animasyonu
    let current = 0
    const step = score / 40
    const timer = setInterval(() => {
      current = Math.min(current + step, score)
      setDisplayScore(Math.round(current))
      if (current >= score) clearInterval(timer)
    }, 25)
    return () => clearInterval(timer)
  }, [score, animated])

  const color = getScoreColor(displayScore)
  const label = getScoreLabel(displayScore)

  // Stroke offset hesapla (270° arc üzerinde)
  const progress = displayScore / 100
  const strokeDashoffset = GAUGE_ARC - progress * GAUGE_ARC

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-36 h-36">
        <svg
          viewBox="0 0 120 120"
          className="w-36 h-36 -rotate-[135deg]"
          fill="none"
        >
          {/* Arka plan yayı */}
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${GAUGE_ARC} ${CIRCUMFERENCE}`}
          />
          {/* Skor yayı */}
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${GAUGE_ARC} ${CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: animated ? 'stroke-dashoffset 0.05s linear, stroke 0.3s ease' : 'none',
              filter: `drop-shadow(0 0 8px ${color}60)`,
            }}
          />
        </svg>

        {/* Merkez skor */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-3xl font-bold tabular-nums"
            style={{ color }}
          >
            {displayScore}
          </span>
          <span className="text-white/40 text-xs mt-0.5">/ 100</span>
        </div>
      </div>

      {/* Etiket */}
      <div
        className="px-3 py-1 rounded-full text-xs font-semibold border"
        style={{
          color,
          borderColor: `${color}40`,
          backgroundColor: `${color}10`,
        }}
      >
        {label}
      </div>
    </div>
  )
}
