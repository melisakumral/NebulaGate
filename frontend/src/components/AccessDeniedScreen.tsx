import { ShieldX, RefreshCw } from 'lucide-react'
import { ScoreGauge } from './ScoreGauge'
import type { AccessDeniedScreenProps } from '../types'

export function AccessDeniedScreen({ score, onRetry }: AccessDeniedScreenProps) {
  return (
    <div className="glass-card rounded-2xl p-8 w-full max-w-md mx-auto animate-slide-up text-center">
      {/* İkon */}
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
          <ShieldX className="w-10 h-10 text-red-400" />
        </div>
      </div>

      <h2 className="text-white font-bold text-xl mb-1">Access Denied</h2>
      <p className="text-white/50 text-sm mb-6">
        Your security score is too low to proceed
      </p>

      {/* Skor */}
      <div className="flex justify-center mb-6">
        <ScoreGauge score={score} />
      </div>

      {/* Açıklama */}
      <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4 mb-6 text-left">
        <p className="text-white/60 text-sm leading-relaxed">
          Our AI engine detected bot-like behavior in your browser fingerprint.
          Score below <span className="text-white font-semibold">30</span> indicates
          high-risk activity. Try using a standard browser without automation tools.
        </p>
      </div>

      <button
        onClick={onRetry}
        className="btn-ghost w-full flex items-center justify-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  )
}
