import { useState, useEffect } from 'react'
import {
  ShieldCheck, Wallet, LogOut, Zap, Lock,
  Activity, Crown, Scan, CheckCircle2,
  Eye, EyeOff, AlertTriangle, Info,
} from 'lucide-react'
import { AuditCard } from './components/AuditCard'
import { AccessGrantedScreen } from './components/AccessGrantedScreen'
import { AccessDeniedScreen } from './components/AccessDeniedScreen'
import { AuditHistoryTable } from './components/AuditHistoryTable'
import {
  connectWallet, subscribePremium, checkSubscription,
  registerUser, getUserProfile, verifyPin, DEMO_MODE,
} from './lib/stellar-utils'
import type { AppState, AuditHistoryEntry, AccessResult } from './types'

function shortenAddr(addr: string) {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

const AUDIT_PHASES: AppState['phase'][] = [
  'idle', 'scanning', 'scored', 'connecting_wallet',
  'submitting', 'payment_required', 'paying', 'error',
]

// ─── Premium Rozeti ────────────────────────────────────────────────────────

function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-gate/20
                     to-amber-gate/10 border border-amber-gate/30 text-amber-gate
                     text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase">
      <Crown className="w-2.5 h-2.5" />
      Premium
    </span>
  )
}

// ─── OnBoarding Popup ──────────────────────────────────────────────────────

function OnBoardingModal({
  onSave,
  loading,
}: {
  onSave: (name: string, pin: string) => void
  loading: boolean
}) {
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit() {
    if (!name.trim()) { setError('Please enter a display name.'); return }
    if (!/^\d{4}$/.test(pin)) { setError('PIN must be exactly 4 digits.'); return }
    if (pin !== pinConfirm) { setError('PINs do not match.'); return }
    setError('')
    onSave(name.trim(), pin)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-midnight/85 backdrop-blur-md" />
      <div className="relative glass-card-glow rounded-2xl w-full max-w-sm p-7 animate-slide-up">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-sapphire/15 border border-sapphire/25">
            <ShieldCheck className="w-6 h-6 text-sapphire" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">Create Secure Profile</h2>
            <p className="text-white/40 text-xs">Your identity on NebulaGate</p>
          </div>
        </div>

        {/* Display Name */}
        <div className="mb-4">
          <label className="text-white/60 text-xs font-medium mb-1.5 block">Display Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Melisa"
            maxLength={32}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                       text-white placeholder-white/25 text-sm outline-none
                       focus:border-sapphire/50 focus:bg-sapphire/5 transition-all"
          />
        </div>

        {/* Master PIN */}
        <div className="mb-4">
          <label className="text-white/60 text-xs font-medium mb-1.5 block">
            Master PIN
            <span className="text-white/30 ml-1">(4 digits — used to authorize transactions)</span>
          </label>
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              maxLength={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                         text-white placeholder-white/25 text-sm outline-none
                         focus:border-sapphire/50 focus:bg-sapphire/5 transition-all
                         tracking-[0.5em] font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPin(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm PIN */}
        <div className="mb-5">
          <label className="text-white/60 text-xs font-medium mb-1.5 block">Confirm PIN</label>
          <input
            type="password"
            value={pinConfirm}
            onChange={e => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="••••"
            maxLength={4}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                       text-white placeholder-white/25 text-sm outline-none
                       focus:border-sapphire/50 focus:bg-sapphire/5 transition-all
                       tracking-[0.5em] font-mono"
          />
        </div>

        {/* Security note */}
        <div className="flex items-start gap-2 bg-sapphire/5 border border-sapphire/15
                        rounded-xl p-3 mb-5">
          <Info className="w-3.5 h-3.5 text-sapphire shrink-0 mt-0.5" />
          <p className="text-white/40 text-xs leading-relaxed">
            Your PIN is <span className="text-white/60 font-medium">SHA-256 hashed</span> before
            being stored on Soroban. The raw PIN never leaves your device.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs mb-4">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 20" />
            </svg>
          ) : (
            <ShieldCheck className="w-4 h-4" />
          )}
          {loading ? 'Saving to Soroban...' : 'Save Profile'}
        </button>
      </div>
    </div>
  )
}

// ─── PIN Doğrulama Modal ───────────────────────────────────────────────────

function PinModal({
  title,
  onVerify,
  onCancel,
}: {
  title: string
  onVerify: (pin: string) => void
  onCancel: () => void
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  function handleSubmit() {
    if (!/^\d{4}$/.test(pin)) { setError('Enter your 4-digit Master PIN.'); return }
    setError('')
    onVerify(pin)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-midnight/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative glass-card rounded-2xl w-full max-w-xs p-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg bg-amber-gate/10 border border-amber-gate/20">
            <Lock className="w-5 h-5 text-amber-gate" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{title}</h3>
            <p className="text-white/40 text-xs">Enter your Master PIN to continue</p>
          </div>
        </div>

        <input
          type="password"
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="••••"
          maxLength={4}
          autoFocus
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                     text-white placeholder-white/25 text-center text-2xl outline-none
                     focus:border-amber-gate/40 transition-all tracking-[0.8em] font-mono mb-4"
        />

        {error && (
          <p className="text-red-400 text-xs mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" />{error}
          </p>
        )}

        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary flex-1 py-2.5 text-sm">Confirm</button>
        </div>
      </div>
    </div>
  )
}

// ─── Security Tips Panel ───────────────────────────────────────────────────

function SecurityTipsPanel() {
  const tips = [
    { icon: '🔑', text: 'Never share your Secret Key with anyone — not even NebulaGate.' },
    { icon: '🧩', text: 'Disable suspicious browser extensions before connecting your wallet.' },
    { icon: '🔍', text: 'Run regular x402 audit scans to monitor your digital footprint.' },
    { icon: '🛡️', text: 'Use a hardware wallet for maximum on-chain security.' },
  ]
  return (
    <div className="glass-card rounded-2xl p-5 w-full max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-4 h-4 text-sapphire" />
        <h3 className="text-white font-semibold text-sm">Security Tips</h3>
      </div>
      <ul className="space-y-2.5">
        {tips.map((t, i) => (
          <li key={i} className="flex items-start gap-3 text-white/55 text-xs leading-relaxed">
            <span className="text-base leading-none mt-0.5">{t.icon}</span>
            {t.text}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Yatay Plan Kartları ───────────────────────────────────────────────────

function PlansSection({
  isPremium,
  onSubscribe,
  loading,
}: {
  isPremium: boolean
  onSubscribe: () => void
  loading: boolean
}) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <Crown className="w-4 h-4 text-amber-gate" />
        <h3 className="text-white font-semibold text-sm">Access Plans</h3>
      </div>

      {/* Yatay (row) düzen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Free Plan */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-7 flex flex-col gap-4">
          <div>
            <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-2">Free</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-white font-extrabold text-4xl">0.1</span>
              <span className="text-white/50 text-lg font-medium">XLM</span>
            </div>
            <p className="text-white/35 text-sm mt-1">per scan</p>
          </div>
          <ul className="space-y-2.5 flex-1">
            {[
              'AI browser fingerprint scan',
              'x402 micro-payment gate',
              'On-chain audit log',
              'Risk reason codes',
            ].map(f => (
              <li key={f} className="flex items-center gap-2.5 text-white/50 text-sm">
                <CheckCircle2 className="w-4 h-4 text-white/25 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <div className="py-3 rounded-xl border border-white/8 text-center text-white/30 text-sm font-medium">
            Current Plan
          </div>
        </div>

        {/* Premium Plan */}
        <div
          className="rounded-2xl p-7 flex flex-col gap-4 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(37,99,235,0.08) 100%)',
            border: '1px solid rgba(245,158,11,0.3)',
            boxShadow: '0 0 40px rgba(245,158,11,0.1), 0 0 80px rgba(37,99,235,0.08)',
          }}
        >
          {/* Best Value badge */}
          <div className="absolute top-4 right-4">
            <span className="bg-amber-gate text-midnight text-[10px] font-bold
                             px-2.5 py-1 rounded-full tracking-wider">BEST VALUE</span>
          </div>

          {/* Arka plan glow */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full
                          bg-amber-gate/10 blur-3xl pointer-events-none" />

          <div>
            <p className="text-amber-gate text-xs font-semibold uppercase tracking-widest mb-2">Premium</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-white font-extrabold text-4xl">5</span>
              <span className="text-amber-gate/70 text-lg font-medium">XLM</span>
            </div>
            <p className="text-white/35 text-sm mt-1">30 days unlimited</p>
          </div>

          <ul className="space-y-2.5 flex-1">
            {[
              'Everything in Free',
              'Unlimited scans — no x402 fees',
              'Skip micro-payment gate',
              'Priority access & faster audits',
              'Premium badge on profile',
            ].map(f => (
              <li key={f} className="flex items-center gap-2.5 text-white/75 text-sm">
                <CheckCircle2 className="w-4 h-4 text-amber-gate shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          {isPremium ? (
            <div className="flex items-center justify-center gap-2 py-3.5 rounded-xl
                            bg-amber-gate/15 border border-amber-gate/25">
              <Crown className="w-4 h-4 text-amber-gate" />
              <span className="text-amber-gate font-semibold text-sm">Premium Active</span>
            </div>
          ) : (
            <button
              onClick={onSubscribe}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
                         font-semibold text-sm transition-all duration-200
                         hover:opacity-90 active:scale-95 disabled:opacity-50
                         disabled:cursor-not-allowed text-midnight"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                boxShadow: '0 4px 20px rgba(245,158,11,0.35)',
              }}
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 20" />
                </svg>
              ) : (
                <Crown className="w-4 h-4" />
              )}
              {loading ? 'Processing...' : 'Upgrade to Premium'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── App ───────────────────────────────────────────────────────────────────

export default function App() {
  const [appState, setAppState] = useState<AppState>({ phase: 'idle' })
  const [history, setHistory] = useState<AuditHistoryEntry[]>([])
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [walletLoading, setWalletLoading] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [subscribeLoading, setSubscribeLoading] = useState(false)
  const [showAuditScreen, setShowAuditScreen] = useState(false)

  // Profil state
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [showOnBoarding, setShowOnBoarding] = useState(false)
  const [onBoardingLoading, setOnBoardingLoading] = useState(false)

  // PIN modal state
  const [pinModalConfig, setPinModalConfig] = useState<{
    title: string
    onVerify: (pin: string) => void
  } | null>(null)

  // Cüzdan bağlandığında profil + premium kontrol
  useEffect(() => {
    if (!walletAddress) { setIsPremium(false); setDisplayName(null); return }
    checkSubscription(walletAddress).then(s => setIsPremium(s.isPremium))
    getUserProfile(walletAddress).then(p => {
      if (p) {
        setDisplayName(p.displayName)
      } else {
        // İlk kez bağlanıyor — OnBoarding göster
        setShowOnBoarding(true)
      }
    })
  }, [walletAddress])

  // ── Cüzdan bağla / disconnect ────────────────────────────────────────
  async function handleConnect() {
    if (walletAddress) {
      setWalletAddress(null)
      setShowAuditScreen(false)
      setAppState({ phase: 'idle' })
      return
    }
    try {
      setWalletLoading(true)
      const addr = await connectWallet()
      setWalletAddress(addr)
    } catch (error) {
      const err = error as Error
      let message = 'Failed to connect wallet'
      
      if (err.message.includes('FREIGHTER_NOT_INSTALLED')) {
        message = 'Freighter wallet extension is not installed. Please install it from freighter.app'
      } else if (err.message.includes('FREIGHTER_NOT_CONNECTED')) {
        message = 'Please connect your Freighter wallet first'
      } else if (err.message.includes('WALLET_NOT_CONNECTED')) {
        message = 'Failed to get wallet address. Please try again'
      }
      
      alert(message)
      console.error('Wallet connection error:', err)
    } finally {
      setWalletLoading(false)
    }
  }

  // ── OnBoarding kaydet ────────────────────────────────────────────────
  async function handleSaveProfile(name: string, pin: string) {
    if (!walletAddress) return
    try {
      setOnBoardingLoading(true)
      await registerUser(walletAddress, name, pin)
      setDisplayName(name)
      setShowOnBoarding(false)
    } catch { /* */ } finally { setOnBoardingLoading(false) }
  }

  // ── Audit başlat (PIN gerektirir) ────────────────────────────────────
  function handleStartAudit() {
    if (!walletAddress) return
    setPinModalConfig({
      title: 'Authorize Security Audit',
      onVerify: async (pin) => {
        const ok = await verifyPin(walletAddress, pin)
        setPinModalConfig(null)
        if (ok) {
          setShowAuditScreen(true)
          setAppState({ phase: 'idle' })
        } else {
          alert('Incorrect PIN. Please try again.')
        }
      },
    })
  }

  // ── Premium abonelik (PIN gerektirir) ────────────────────────────────
  function handleSubscribe() {
    if (!walletAddress) return
    setPinModalConfig({
      title: 'Authorize Premium Upgrade',
      onVerify: async (pin) => {
        const ok = await verifyPin(walletAddress, pin)
        setPinModalConfig(null)
        if (!ok) { alert('Incorrect PIN.'); return }
        try {
          setSubscribeLoading(true)
          const success = await subscribePremium(walletAddress)
          if (success) setIsPremium(true)
        } catch { /* */ } finally { setSubscribeLoading(false) }
      },
    })
  }

  // ── Scan tamamlandı ──────────────────────────────────────────────────
  function handleScanComplete(result: AccessResult, score: number, address: string) {
    const effectiveAddr = address || walletAddress || 'Unknown'
    if (!walletAddress && address) setWalletAddress(address)
    setHistory(prev => [{
      user: displayName || shortenAddr(effectiveAddr),
      score,
      timestamp: new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      }),
      verified: result === 'AccessGranted',
    }, ...prev].slice(0, 10))
    if (result === 'AccessGranted') {
      setAppState({ phase: 'granted', score, address: effectiveAddr })
    } else {
      setAppState({ phase: 'denied', score })
    }
    setShowAuditScreen(false)
  }

  function handleReset() {
    setAppState({ phase: 'idle' })
    setShowAuditScreen(false)
  }

  const showAuditCard = showAuditScreen && (AUDIT_PHASES as string[]).includes(appState.phase)
  const showHero = !showAuditScreen && appState.phase !== 'granted' && appState.phase !== 'denied'

  return (
    <div className="min-h-screen bg-midnight flex flex-col">

      {/* Modals */}
      {showOnBoarding && (
        <OnBoardingModal onSave={handleSaveProfile} loading={onBoardingLoading} />
      )}
      {pinModalConfig && (
        <PinModal
          title={pinModalConfig.title}
          onVerify={pinModalConfig.onVerify}
          onCancel={() => setPinModalConfig(null)}
        />
      )}

      {/* Arka plan */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-grid-animated" />
        <div className="absolute -top-60 -left-40 w-[800px] h-[800px] rounded-full bg-sapphire/8 blur-[120px] animate-glow-pulse" />
        <div className="absolute -bottom-60 -right-40 w-[700px] h-[700px] rounded-full bg-amber-gate/5 blur-[100px] animate-glow-pulse" style={{ animationDelay: '1.5s' }} />
        {walletAddress && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-sapphire/5 blur-[80px] animate-glow-pulse" />
        )}
      </div>

      {/* Header */}
      <header className="relative z-20 border-b border-white/5 px-6 py-3.5 bg-midnight/60 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">

          {/* Logo — Shield + NebulaGate kurumsal */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2.5 rounded-xl bg-sapphire/15 border border-sapphire/30">
                <ShieldCheck className="w-7 h-7 text-sapphire" strokeWidth={2.5} />
              </div>
              <div className="absolute inset-0 rounded-xl bg-sapphire/20 blur-lg -z-10" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-black text-2xl leading-none"
                    style={{ letterSpacing: '-0.04em' }}>
                NebulaGate
              </span>
              <span className="text-white/20 text-[10px] border border-white/10 rounded px-1.5 py-0.5 font-mono">TESTNET</span>
              {DEMO_MODE && <span className="text-amber-gate/60 text-[10px] border border-amber-gate/20 rounded px-1.5 py-0.5 font-mono">DEMO</span>}
              {isPremium && <PremiumBadge />}
            </div>
          </div>

          {/* Sağ: "Hi, Name | Logout" veya Connect Wallet */}
          <div className="flex items-center gap-2">
            {walletAddress ? (
              // Bağlıyken: Hi, Name + ayrı Logout butonu
              <>
                <div className="flex items-center gap-2 bg-sapphire/8 border border-sapphire/20
                                rounded-xl px-4 py-2">
                  <div className="w-2 h-2 rounded-full bg-sapphire animate-pulse-slow" />
                  <span className="text-white/50 text-sm">Hi,</span>
                  <span className="text-white font-semibold text-sm">
                    {displayName || shortenAddr(walletAddress)}
                  </span>
                </div>
                <button
                  onClick={handleConnect}
                  title="Disconnect wallet"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                             border border-white/10 text-white/50 hover:text-red-400
                             hover:border-red-500/30 hover:bg-red-500/8 transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              // Bağlı değilken: tek Connect butonu
              <button
                onClick={handleConnect}
                disabled={walletLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                           bg-sapphire hover:bg-sapphire-dark border-transparent text-white
                           transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}
              >
                {walletLoading ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 20" />
                  </svg>
                ) : <Wallet className="w-4 h-4" />}
                {walletLoading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Ana içerik */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-10 gap-8">

        {/* Hero */}
        {showHero && (
          <div className="flex flex-col items-center w-full animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-sapphire/10 border border-sapphire/20
                            rounded-full px-5 py-2 text-sapphire text-sm font-semibold mb-10 tracking-wide uppercase">
              <span className="w-2 h-2 rounded-full bg-sapphire animate-pulse-slow" />
              Stellar Soroban · x402 Protocol
            </div>

            <h1 className="text-white text-6xl sm:text-7xl font-extrabold text-center leading-[1.05] mb-6 tracking-tight max-w-3xl">
              Next-Gen <span className="text-sapphire">Web3 Security</span><br />Gateway
            </h1>

            <p className="text-white/55 text-xl text-center leading-relaxed max-w-2xl mb-12">
              AI-driven browser fingerprinting and the{' '}
              <span className="text-white/80 font-semibold">x402 Payment Required</span>{' '}
              protocol to block bots and verify human identity on Stellar Soroban.
            </p>

            {/* Feature kartları */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 w-full max-w-2xl">
              {[
                { icon: Activity, title: 'AI Fingerprinting', desc: 'Canvas, WebGL, Audio & hardware analysis' },
                { icon: Zap, title: 'x402 Bot Defense', desc: 'Micro-payment gate for suspicious sessions' },
                { icon: Lock, title: 'On-Chain Audit', desc: 'Every decision recorded on Soroban' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="glass-card rounded-2xl p-4 flex flex-col gap-2">
                  <div className="p-2 rounded-lg bg-sapphire/10 border border-sapphire/15 w-fit">
                    <Icon className="w-4 h-4 text-sapphire" />
                  </div>
                  <p className="text-white font-semibold text-sm">{title}</p>
                  <p className="text-white/40 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-col items-center gap-3 mb-12">
              {!walletAddress ? (
                <>
                  <button
                    onClick={handleConnect}
                    disabled={walletLoading}
                    className="btn-primary flex items-center gap-3 px-8 py-4 text-base rounded-2xl disabled:opacity-60"
                  >
                    {walletLoading ? (
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 20" />
                      </svg>
                    ) : <Wallet className="w-5 h-5" />}
                    {walletLoading ? 'Connecting...' : 'Connect Wallet to Audit'}
                  </button>
                  <p className="text-white/25 text-xs">Requires Freighter wallet extension</p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 bg-sapphire/8 border border-sapphire/15 rounded-full px-4 py-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-sapphire animate-pulse-slow" />
                    <span className="text-white/60 text-xs font-mono">{shortenAddr(walletAddress)}</span>
                    {isPremium && <PremiumBadge />}
                  </div>
                  <button
                    onClick={handleStartAudit}
                    className="flex items-center gap-3 px-8 py-4 text-base rounded-2xl text-white font-semibold transition-all duration-200 active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      boxShadow: '0 4px 24px rgba(37,99,235,0.4), 0 0 60px rgba(37,99,235,0.15)',
                    }}
                  >
                    <Scan className="w-5 h-5" />
                    Initiate Security Audit
                  </button>
                  {!isPremium && (
                    <button
                      onClick={handleSubscribe}
                      disabled={subscribeLoading}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm text-amber-gate/80 hover:text-amber-gate border border-amber-gate/20 hover:border-amber-gate/40 transition-all duration-200 disabled:opacity-50"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      Upgrade to Premium — 5 XLM / 30 days
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Yatay Plan Kartları */}
            <PlansSection isPremium={isPremium} onSubscribe={handleSubscribe} loading={subscribeLoading} />

            {/* Security Tips */}
            <div className="w-full max-w-3xl mt-8">
              <SecurityTipsPanel />
            </div>
          </div>
        )}

        {/* Audit ekranı */}
        {showAuditCard && (
          <div className="w-full flex flex-col items-center gap-6 animate-slide-up">
            <div className="relative w-full max-w-md">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-sapphire/20 to-transparent blur-sm pointer-events-none" />
              <AuditCard onScanComplete={handleScanComplete} />
            </div>
            <SecurityTipsPanel />
          </div>
        )}

        {appState.phase === 'granted' && (
          <AccessGrantedScreen score={appState.score} address={appState.address} onReset={handleReset} />
        )}
        {appState.phase === 'denied' && (
          <AccessDeniedScreen score={appState.score} onRetry={handleReset} />
        )}
        {history.length > 0 && <AuditHistoryTable entries={history.filter(e =>
          e.user === (displayName || shortenAddr(walletAddress || ''))
        )} />}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-3.5 bg-midnight/40 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-white/20 text-xs">
          <span className="font-medium tracking-wide">NebulaGate · Stellar Soroban · x402 Protocol</span>
          <span className="font-mono">
            {walletAddress ? `● ${displayName || shortenAddr(walletAddress)}` : '○ Not connected'}
          </span>
        </div>
      </footer>
    </div>
  )
}
