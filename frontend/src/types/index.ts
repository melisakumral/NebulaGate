// ─── Kontrat Tipleri ───────────────────────────────────────────────────────

export type AccessResult = 'AccessGranted' | 'PaymentRequired' | 'AccessDenied'

export interface AccessEntry {
  score: number
  timestamp: number
}

// ─── Fingerprint ───────────────────────────────────────────────────────────

export interface BrowserFingerprint {
  userAgent: string
  webglRenderer: string | null
  webglVendor: string | null
  ipAddress: string | null
  canvasHash: string | null
  screenResolution: string
  colorDepth: number
  pixelRatio: number
  pluginCount: number
  plugins: string[]
  isWebdriver: boolean
  hasWebGL: boolean
}

// ─── Uygulama Durumu ───────────────────────────────────────────────────────

export type AppState =
  | { phase: 'idle' }
  | { phase: 'scanning' }
  | { phase: 'scored'; score: number; fingerprint: BrowserFingerprint }
  | { phase: 'connecting_wallet' }
  | { phase: 'submitting'; score: number }
  | { phase: 'payment_required'; score: number }
  | { phase: 'paying' }
  | { phase: 'granted'; score: number; address: string }
  | { phase: 'denied'; score: number }
  | { phase: 'error'; message: string }

// ─── Bileşen Props ─────────────────────────────────────────────────────────

export interface AuditCardProps {
  onScanComplete: (result: AccessResult, score: number, address: string) => void
}

export interface ScoreGaugeProps {
  score: number
  animated?: boolean
}

export interface SecurityVerificationModalProps {
  isOpen: boolean
  score: number
  xlmAmount?: number
  onConfirm: () => void
  onCancel: () => void
}

export interface AuditHistoryEntry {
  user: string
  score: number
  timestamp: string
  verified: boolean
}

export interface AuditHistoryTableProps {
  entries: AuditHistoryEntry[]
}

export interface AccessGrantedScreenProps {
  score: number
  address: string
  onReset: () => void
}

export interface AccessDeniedScreenProps {
  score: number
  onRetry: () => void
}
