import { useState } from 'react'
import { ShieldCheck, Fingerprint, AlertCircle } from 'lucide-react'
import { runSecurityAudit } from '../lib/security_audit'
import {
  connectWallet,
  callAccessGateWithRetry,
  sendPayment,
  TREASURY_ADDRESS,
} from '../lib/stellar-utils'
import { StatusLoader } from './StatusLoader'
import { ScoreGauge } from './ScoreGauge'
import { SecurityVerificationModal } from './SecurityVerificationModal'
import type { AuditCardProps, AccessResult } from '../types'

type Phase =
  | 'idle'
  | 'scanning'
  | 'scored'
  | 'connecting'
  | 'submitting'
  | 'payment_required'
  | 'paying'
  | 'error'

export function AuditCard({ onScanComplete }: AuditCardProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [score, setScore] = useState(0)
  const [riskCodes, setRiskCodes] = useState<string[]>([])
  const [integrityHash, setIntegrityHash] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleScan() {
    try {
      setPhase('scanning')
      setErrorMsg('')

      // Katman 1+2+3: Güvenlik denetimi
      const audit = await runSecurityAudit()
      setScore(audit.score)
      setRiskCodes(audit.riskCodes)
      setIntegrityHash(audit.integrityHash)
      setPhase('scored')

      // Instant block — bot kesin tespiti
      if (audit.instantBlock) {
        await new Promise((r) => setTimeout(r, 800))
        onScanComplete('AccessDenied', audit.score, '')
        return
      }

      await new Promise((r) => setTimeout(r, 1200))

      setPhase('connecting')
      const address = await connectWallet()
      setWalletAddress(address)

      setPhase('submitting')
      const result: AccessResult = await callAccessGateWithRetry(address, audit.score)

      if (result === 'AccessGranted') {
        onScanComplete('AccessGranted', audit.score, address)
      } else if (result === 'PaymentRequired') {
        setPhase('payment_required')
      } else {
        onScanComplete('AccessDenied', audit.score, address)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setErrorMsg(msg === 'FREIGHTER_NOT_INSTALLED' ? 'FREIGHTER_NOT_INSTALLED' : msg)
      setPhase('error')
    }
  }

  async function handlePaymentConfirm() {
    try {
      setPhase('paying')
      const ok = await sendPayment(walletAddress, TREASURY_ADDRESS, '0.1')
      if (ok) {
        onScanComplete('AccessGranted', score, walletAddress)
      } else {
        setErrorMsg('Payment failed. Please try again.')
        setPhase('payment_required')
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Payment error')
      setPhase('payment_required')
    }
  }

  function handleReset() {
    setPhase('idle')
    setScore(0)
    setFingerprint(null)
    setWalletAddress('')
    setErrorMsg('')
  }

  const isLoading = ['scanning', 'connecting', 'submitting', 'paying'].includes(phase)

  return (
    <>
      <div className="glass-card-glow rounded-2xl p-8 w-full max-w-md mx-auto animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-sapphire/10 border border-sapphire/20">
            <ShieldCheck className="w-6 h-6 text-sapphire" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg leading-tight">Identity Audit</h2>
            <p className="text-white/50 text-xs">Web3 · x402 Protocol · Soroban</p>
          </div>
        </div>

        {phase === 'idle' && (
          <div className="animate-fade-in">
            <p className="text-white/60 text-sm mb-5 leading-relaxed">
              Our AI engine analyzes your browser fingerprint and assigns a
              security score. Connect your Freighter wallet to proceed.
            </p>
            <div className="flex items-center gap-2 text-white/30 text-xs mb-6 bg-white/3 rounded-xl px-3 py-2">
              <Fingerprint className="w-3.5 h-3.5 shrink-0" />
              <span>Client-side only — no data leaves your browser</span>
            </div>
            <button onClick={handleScan} className="btn-primary w-full">
              Scan My Identity
            </button>
          </div>
        )}

        {isLoading && <StatusLoader />}

        {phase === 'scored' && (
          <div className="animate-fade-in flex flex-col items-center gap-4">
            <ScoreGauge score={score} animated />
            {riskCodes.length > 0 && riskCodes[0] !== 'R000' && (
              <div className="w-full bg-amber-gate/5 border border-amber-gate/15 rounded-xl px-3 py-2">
                <p className="text-amber-gate/70 text-xs font-mono">
                  Risk codes: {riskCodes.join(' · ')}
                </p>
              </div>
            )}
            {integrityHash && (
              <p className="text-white/20 text-xs font-mono truncate w-full text-center">
                SHA-256: {integrityHash.slice(0, 24)}…
              </p>
            )}
            <p className="text-white/50 text-sm">Connecting to wallet...</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="animate-fade-in">
            {errorMsg === 'FREIGHTER_NOT_INSTALLED' ? (
              <div className="text-center">
                <AlertCircle className="w-10 h-10 text-amber-gate mx-auto mb-3" />
                <p className="text-white font-semibold mb-1">Freighter Not Found</p>
                <p className="text-white/50 text-sm mb-5">
                  Install the Freighter browser extension to sign transactions.
                </p>
                <a
                  href="https://www.freighter.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-amber inline-block text-sm mb-3"
                >
                  Install Freighter
                </a>
                <button onClick={handleReset} className="btn-ghost w-full text-sm">
                  Try Again
                </button>
              </div>
            ) : (
              <div className="text-center">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <p className="text-white font-semibold mb-1">Something went wrong</p>
                <p className="text-white/40 text-xs mb-5 font-mono break-all">{errorMsg}</p>
                <button onClick={handleReset} className="btn-primary w-full">
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <SecurityVerificationModal
        isOpen={phase === 'payment_required'}
        score={score}
        xlmAmount={0.1}
        onConfirm={handlePaymentConfirm}
        onCancel={() => onScanComplete('AccessDenied', score, walletAddress)}
      />
    </>
  )
}
