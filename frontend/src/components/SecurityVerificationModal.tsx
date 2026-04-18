import { Lock, AlertTriangle, X, Cpu } from 'lucide-react'
import type { SecurityVerificationModalProps } from '../types'

export function SecurityVerificationModal({
  isOpen,
  score,
  xlmAmount = 0.1,
  onConfirm,
  onCancel,
}: SecurityVerificationModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-midnight/80 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative glass-card rounded-2xl w-full max-w-sm p-6 animate-slide-up">
        {/* Kapat butonu */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* İkon + Başlık */}
        <div className="flex items-start gap-4 mb-5">
          <div className="p-3 rounded-xl bg-amber-gate/10 border border-amber-gate/20 shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-gate" />
          </div>
          <div>
            <p className="text-amber-gate text-xs font-mono font-semibold tracking-wider mb-1">
              HTTP 402 · PAYMENT REQUIRED
            </p>
            <h3 className="text-white font-semibold text-base leading-snug">
              Security Verification Required
            </h3>
          </div>
        </div>

        {/* Skor göstergesi */}
        <div className="flex items-center gap-3 bg-amber-gate/5 border border-amber-gate/15 rounded-xl p-3 mb-5">
          <Cpu className="w-4 h-4 text-amber-gate shrink-0" />
          <div className="flex-1">
            <p className="text-white/50 text-xs">AI Security Score</p>
            <p className="text-amber-gate font-bold text-lg leading-none">{score}</p>
          </div>
          <div className="text-right">
            <p className="text-white/50 text-xs">Risk Level</p>
            <p className="text-amber-gate font-semibold text-sm">High Risk</p>
          </div>
        </div>

        {/* Açıklama */}
        <p className="text-white/60 text-sm leading-relaxed mb-5">
          High-risk connection detected. Please pay a{' '}
          <span className="text-white font-semibold">{xlmAmount} XLM</span> micro-fee
          to verify your identity and gain access.
        </p>

        {/* Ödeme detayı */}
        <div className="bg-charcoal/60 rounded-xl p-3 mb-5 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Protocol</span>
            <span className="text-white/70 font-mono">x402 · HTTP 402</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Amount</span>
            <span className="text-white font-semibold">{xlmAmount} XLM</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Network</span>
            <span className="text-white/70">Stellar Testnet</span>
          </div>
        </div>

        {/* Butonlar */}
        <div className="flex flex-col gap-2">
          <button onClick={onConfirm} className="btn-amber w-full flex items-center justify-center gap-2">
            <Lock className="w-4 h-4" />
            Confirm with Freighter
          </button>
          <button onClick={onCancel} className="btn-ghost w-full text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
