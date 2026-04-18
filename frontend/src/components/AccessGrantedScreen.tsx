import { ShieldCheck, ArrowRight } from 'lucide-react'
import { ScoreGauge } from './ScoreGauge'
import type { AccessGrantedScreenProps } from '../types'

function shortenAddress(addr: string): string {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function AccessGrantedScreen({ score, address, onReset }: AccessGrantedScreenProps) {
  return (
    <div className="glass-card rounded-2xl p-8 w-full max-w-md mx-auto animate-slide-up text-center">
      {/* İkon */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-sapphire/10 border-2 border-sapphire/30 flex items-center justify-center">
            <ShieldCheck className="w-10 h-10 text-sapphire" />
          </div>
          {/* Pulse ring */}
          <div className="absolute inset-0 rounded-full border-2 border-sapphire/20 animate-ping" />
        </div>
      </div>

      <h2 className="text-white font-bold text-xl mb-1">Access Granted</h2>
      <p className="text-white/50 text-sm mb-6">
        Identity verified on Stellar Soroban
      </p>

      {/* Skor */}
      <div className="flex justify-center mb-6">
        <ScoreGauge score={score} />
      </div>

      {/* Adres */}
      <div className="bg-charcoal/60 rounded-xl p-3 mb-6">
        <p className="text-white/40 text-xs mb-1">Verified Address</p>
        <p className="text-white font-mono text-sm">{shortenAddress(address)}</p>
      </div>

      {/* Detaylar */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-sapphire/5 border border-sapphire/15 rounded-xl p-3">
          <p className="text-white/40 text-xs mb-1">Protocol</p>
          <p className="text-sapphire font-semibold text-sm">Soroban</p>
        </div>
        <div className="bg-sapphire/5 border border-sapphire/15 rounded-xl p-3">
          <p className="text-white/40 text-xs mb-1">Network</p>
          <p className="text-sapphire font-semibold text-sm">Testnet</p>
        </div>
      </div>

      <button
        onClick={onReset}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        Scan Again
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}
