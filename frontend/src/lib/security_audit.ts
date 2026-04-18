/**
 * security_audit.ts — NebulaGate 3-Layer Security Engine
 *
 * Katman 1: Advanced Browser Fingerprinting
 *   Canvas, WebGL, AudioContext, Hardware, Navigator
 *
 * Katman 2: Heuristic Risk Engine
 *   Tutarsızlık tespiti, headless bot izleri, risk puanlama
 *
 * Katman 3: Tamper Protection
 *   SHA-256 ile veri bütünlüğü imzası
 */

// ─── Risk Reason Codes ─────────────────────────────────────────────────────

export const RISK_CODES = {
  // Headless / Bot
  WEBDRIVER_DETECTED:       'R001', // navigator.webdriver = true
  HEADLESS_CHROME:          'R002', // HeadlessChrome UA
  PHANTOM_JS:               'R003', // PhantomJS izi
  NO_PLUGINS:               'R004', // Sıfır plugin (headless belirtisi)
  NO_WEBGL:                 'R005', // WebGL yok (headless/VM)
  CHROME_RUNTIME_MISSING:   'R006', // window.chrome yok ama Chrome UA
  NOTIFICATION_DENIED:      'R007', // Bildirim izni otomatik reddedildi

  // Platform Tutarsızlıkları
  OS_BROWSER_MISMATCH:      'R010', // Linux + Safari gibi imkânsız kombinasyon
  TIMEZONE_LANG_MISMATCH:   'R011', // Timezone ile dil uyuşmuyor
  SCREEN_ZERO:              'R012', // Ekran çözünürlüğü 0x0
  TOUCH_DESKTOP_MISMATCH:   'R013', // Masaüstü UA + dokunmatik ekran iddiası
  LOW_CORE_COUNT:           'R014', // 1 çekirdek (VM/container belirtisi)
  MEMORY_TOO_LOW:           'R015', // <1GB RAM (bot container)

  // Canvas / WebGL Anomalileri
  CANVAS_BLANK:             'R020', // Canvas tamamen boş/siyah
  WEBGL_VENDOR_GENERIC:     'R021', // "Brian Paul" / "Mesa" vendor (yazılım renderer)
  WEBGL_RENDERER_SWIFTSHADER: 'R022', // SwiftShader (headless GPU emülasyonu)

  // Audio Anomalileri
  AUDIO_CONTEXT_BLOCKED:    'R030', // AudioContext oluşturulamadı
  AUDIO_FINGERPRINT_ZERO:   'R031', // Ses işleme sonucu sıfır (VM)

  // Temiz
  CLEAN:                    'R000', // Risk yok
} as const

export type RiskCode = typeof RISK_CODES[keyof typeof RISK_CODES]

// ─── Veri Tipleri ──────────────────────────────────────────────────────────

export interface FingerprintRaw {
  // Canvas
  canvasDataUrl: string
  canvasHash: string

  // WebGL
  webglVendor: string | null
  webglRenderer: string | null
  webglVersion: string | null

  // Audio
  audioFingerprint: number
  audioContextAvailable: boolean

  // Hardware
  hardwareConcurrency: number
  deviceMemoryGB: number | null
  maxTouchPoints: number

  // Navigator
  userAgent: string
  platform: string
  language: string
  languages: string[]
  plugins: string[]
  cookiesEnabled: boolean
  doNotTrack: string | null
  isWebdriver: boolean

  // Screen
  screenWidth: number
  screenHeight: number
  colorDepth: number
  pixelRatio: number

  // Timing
  timezone: string
  timezoneOffset: number

  // Collected at
  collectedAt: number
}

export interface SecurityAuditResult {
  score: number                // 0–100 (yüksek = güvenilir)
  riskCodes: RiskCode[]        // Tespit edilen risk kodları
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  instantBlock: boolean        // true → skora bakma, direkt reddet
  fingerprint: FingerprintRaw
  integrityHash: string        // SHA-256 imzası
  summary: string              // Jüriye gösterilecek özet
}

// ─── Katman 1: Fingerprint Toplama ─────────────────────────────────────────

async function collectCanvas(): Promise<{ dataUrl: string; hash: string }> {
  const canvas = document.createElement('canvas')
  canvas.width = 280
  canvas.height = 60
  const ctx = canvas.getContext('2d')
  if (!ctx) return { dataUrl: '', hash: '' }

  ctx.fillStyle = '#0d1117'
  ctx.fillRect(0, 0, 280, 60)
  ctx.fillStyle = '#2563eb'
  ctx.font = 'bold 14px Arial'
  ctx.fillText('NebulaGate \u00b7 Security Audit \u00b7 \u26a1', 10, 25)
  ctx.fillStyle = '#f59e0b'
  ctx.font = '11px monospace'
  ctx.fillText(navigator.userAgent.slice(0, 40), 10, 45)

  // Emoji render testi (botlar genellikle emoji render edemez)
  ctx.font = '16px Arial'
  ctx.fillText('\ud83d\udd12\ud83e\udde0\ud83d\udc41\ufe0f', 230, 30)

  const dataUrl = canvas.toDataURL()
  const hash = await sha256(dataUrl)
  return { dataUrl, hash }
}

function collectWebGL(): {
  vendor: string | null
  renderer: string | null
  version: string | null
} {
  const canvas = document.createElement('canvas')
  const gl =
    (canvas.getContext('webgl') as WebGLRenderingContext | null) ??
    (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)

  if (!gl) return { vendor: null, renderer: null, version: null }

  const ext = gl.getExtension('WEBGL_debug_renderer_info')
  return {
    vendor: ext ? (gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) as string) : gl.getParameter(gl.VENDOR) as string,
    renderer: ext ? (gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string) : gl.getParameter(gl.RENDERER) as string,
    version: gl.getParameter(gl.VERSION) as string,
  }
}

async function collectAudio(): Promise<{ fingerprint: number; available: boolean }> {
  try {
    const AudioCtx = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return { fingerprint: 0, available: false }

    const ctx = new AudioCtx()
    const oscillator = ctx.createOscillator()
    const analyser = ctx.createAnalyser()
    const gain = ctx.createGain()
    const scriptProcessor = ctx.createScriptProcessor(4096, 1, 1)

    gain.gain.value = 0 // Ses çıkmasın
    oscillator.type = 'triangle'
    oscillator.frequency.value = 10000

    oscillator.connect(analyser)
    analyser.connect(scriptProcessor)
    scriptProcessor.connect(gain)
    gain.connect(ctx.destination)

    return await new Promise((resolve) => {
      let fingerprint = 0
      scriptProcessor.onaudioprocess = (e) => {
        const data = e.inputBuffer.getChannelData(0)
        for (let i = 0; i < data.length; i++) fingerprint += Math.abs(data[i])
        oscillator.disconnect()
        analyser.disconnect()
        scriptProcessor.disconnect()
        ctx.close()
        resolve({ fingerprint: Math.round(fingerprint * 1000) / 1000, available: true })
      }
      oscillator.start(0)
      setTimeout(() => resolve({ fingerprint: 0, available: false }), 1000)
    })
  } catch {
    return { fingerprint: 0, available: false }
  }
}

async function collectFingerprint(): Promise<FingerprintRaw> {
  const [canvas, webgl, audio] = await Promise.all([
    collectCanvas(),
    Promise.resolve(collectWebGL()),
    collectAudio(),
  ])

  const pluginList = Array.from(navigator.plugins ?? []).map((p) => p.name)

  return {
    canvasDataUrl: canvas.dataUrl,
    canvasHash: canvas.hash,
    webglVendor: webgl.vendor,
    webglRenderer: webgl.renderer,
    webglVersion: webgl.version,
    audioFingerprint: audio.fingerprint,
    audioContextAvailable: audio.available,
    hardwareConcurrency: navigator.hardwareConcurrency ?? 1,
    deviceMemoryGB: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    languages: Array.from(navigator.languages ?? [navigator.language]),
    plugins: pluginList,
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    isWebdriver: !!(navigator as Navigator & { webdriver?: boolean }).webdriver,
    screenWidth: screen.width,
    screenHeight: screen.height,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio ?? 1,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    collectedAt: Date.now(),
  }
}

// ─── Katman 2: Heuristic Risk Engine ───────────────────────────────────────

interface RiskEvaluation {
  deductions: number
  codes: RiskCode[]
  instantBlock: boolean
}

function evaluateRisks(fp: FingerprintRaw): RiskEvaluation {
  const codes: RiskCode[] = []
  let deductions = 0
  let instantBlock = false

  const ua = fp.userAgent.toLowerCase()
  const platform = fp.platform.toLowerCase()

  // ── Headless / Bot tespiti (Instant Block) ──────────────────────────

  if (fp.isWebdriver) {
    codes.push(RISK_CODES.WEBDRIVER_DETECTED)
    instantBlock = true
    deductions += 100
  }

  if (ua.includes('headlesschrome') || ua.includes('headless')) {
    codes.push(RISK_CODES.HEADLESS_CHROME)
    instantBlock = true
    deductions += 100
  }

  if (ua.includes('phantomjs') || ua.includes('slimerbrowser')) {
    codes.push(RISK_CODES.PHANTOM_JS)
    instantBlock = true
    deductions += 100
  }

  // Chrome UA ama window.chrome yok
  if (ua.includes('chrome') && !ua.includes('edge') && !ua.includes('opr')) {
    const hasChrome = !!(window as Window & { chrome?: unknown }).chrome
    if (!hasChrome) {
      codes.push(RISK_CODES.CHROME_RUNTIME_MISSING)
      deductions += 35
    }
  }

  // ── Plugin kontrolü ─────────────────────────────────────────────────

  if (fp.plugins.length === 0) {
    codes.push(RISK_CODES.NO_PLUGINS)
    deductions += 20
  }

  // ── WebGL kontrolü ──────────────────────────────────────────────────

  if (!fp.webglRenderer) {
    codes.push(RISK_CODES.NO_WEBGL)
    deductions += 25
  } else {
    const renderer = fp.webglRenderer.toLowerCase()
    const vendor = (fp.webglVendor ?? '').toLowerCase()

    if (renderer.includes('swiftshader') || renderer.includes('llvmpipe')) {
      codes.push(RISK_CODES.WEBGL_RENDERER_SWIFTSHADER)
      deductions += 30
    }

    if (vendor.includes('brian paul') || vendor.includes('mesa') || vendor.includes('vmware')) {
      codes.push(RISK_CODES.WEBGL_VENDOR_GENERIC)
      deductions += 20
    }
  }

  // ── Canvas kontrolü ─────────────────────────────────────────────────

  if (!fp.canvasHash || fp.canvasHash.length < 10) {
    codes.push(RISK_CODES.CANVAS_BLANK)
    deductions += 20
  }

  // ── Audio kontrolü ──────────────────────────────────────────────────

  if (!fp.audioContextAvailable) {
    codes.push(RISK_CODES.AUDIO_CONTEXT_BLOCKED)
    deductions += 15
  } else if (fp.audioFingerprint === 0) {
    codes.push(RISK_CODES.AUDIO_FINGERPRINT_ZERO)
    deductions += 20
  }

  // ── Hardware kontrolü ───────────────────────────────────────────────

  if (fp.hardwareConcurrency <= 1) {
    codes.push(RISK_CODES.LOW_CORE_COUNT)
    deductions += 15
  }

  if (fp.deviceMemoryGB !== null && fp.deviceMemoryGB < 1) {
    codes.push(RISK_CODES.MEMORY_TOO_LOW)
    deductions += 15
  }

  // ── Ekran kontrolü ──────────────────────────────────────────────────

  if (fp.screenWidth === 0 || fp.screenHeight === 0) {
    codes.push(RISK_CODES.SCREEN_ZERO)
    deductions += 25
  }

  // ── Platform / OS tutarsızlıkları ───────────────────────────────────

  // Linux + Safari imkânsız kombinasyon
  if (platform.includes('linux') && ua.includes('safari') && !ua.includes('chrome')) {
    codes.push(RISK_CODES.OS_BROWSER_MISMATCH)
    deductions += 30
  }

  // Windows + Mac UA tutarsızlığı
  if (platform.includes('win') && ua.includes('macintosh')) {
    codes.push(RISK_CODES.OS_BROWSER_MISMATCH)
    deductions += 30
  }

  // Masaüstü UA ama maxTouchPoints > 5 (emülasyon belirtisi)
  const isDesktopUA = !ua.includes('mobile') && !ua.includes('android') && !ua.includes('iphone')
  if (isDesktopUA && fp.maxTouchPoints > 5) {
    codes.push(RISK_CODES.TOUCH_DESKTOP_MISMATCH)
    deductions += 10
  }

  // ── Timezone / Dil tutarsızlığı ─────────────────────────────────────

  const tzLangMap: Record<string, string[]> = {
    'Europe/Istanbul': ['tr', 'tr-TR'],
    'America/New_York': ['en', 'en-US'],
    'Europe/London': ['en', 'en-GB'],
    'Asia/Tokyo': ['ja', 'ja-JP'],
    'Europe/Berlin': ['de', 'de-DE'],
  }

  const expectedLangs = tzLangMap[fp.timezone]
  if (expectedLangs) {
    const userLang = fp.language.toLowerCase()
    const match = expectedLangs.some((l) => userLang.startsWith(l.toLowerCase()))
    if (!match) {
      codes.push(RISK_CODES.TIMEZONE_LANG_MISMATCH)
      deductions += 10
    }
  }

  return { deductions, codes, instantBlock }
}

// ─── Katman 3: SHA-256 Tamper Protection ───────────────────────────────────

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function buildIntegrityHash(fp: FingerprintRaw, score: number): Promise<string> {
  // Kritik alanları birleştir ve imzala
  const payload = [
    fp.canvasHash,
    fp.webglRenderer ?? 'null',
    fp.webglVendor ?? 'null',
    String(fp.audioFingerprint),
    String(fp.hardwareConcurrency),
    fp.userAgent,
    fp.platform,
    fp.timezone,
    String(fp.screenWidth),
    String(fp.screenHeight),
    String(score),
    String(fp.collectedAt),
  ].join('|')

  return sha256(payload)
}

// ─── Risk Level & Summary ──────────────────────────────────────────────────

function getRiskLevel(score: number, instantBlock: boolean): SecurityAuditResult['riskLevel'] {
  if (instantBlock) return 'CRITICAL'
  if (score < 30) return 'HIGH'
  if (score < 60) return 'MEDIUM'
  return 'LOW'
}

function buildSummary(
  score: number,
  codes: RiskCode[],
  instantBlock: boolean,
): string {
  if (instantBlock) {
    return `CRITICAL: Automated browser detected. Access blocked. [${codes.join(', ')}]`
  }
  if (codes.length === 0) {
    return `CLEAN: No risk factors detected. Score: ${score}/100.`
  }
  const level = score < 30 ? 'HIGH RISK' : score < 60 ? 'MEDIUM RISK' : 'LOW RISK'
  return `${level}: ${codes.length} risk factor(s) detected. Score: ${score}/100. Codes: [${codes.join(', ')}]`
}

// ─── Ana Export: runSecurityAudit ──────────────────────────────────────────

export async function runSecurityAudit(): Promise<SecurityAuditResult> {
  // 1. Fingerprint topla
  const fingerprint = await collectFingerprint()

  // 2. Risk değerlendirmesi
  const { deductions, codes, instantBlock } = evaluateRisks(fingerprint)

  // 3. Skor hesapla (100'den başla, risk kesintilerini çıkar)
  const baseScore = 100
  const score = Math.max(0, Math.min(100, baseScore - deductions))

  // 4. Integrity hash (tamper protection)
  const integrityHash = await buildIntegrityHash(fingerprint, score)

  // 5. Risk seviyesi ve özet
  const riskLevel = getRiskLevel(score, instantBlock)
  const summary = buildSummary(score, codes, instantBlock)

  return {
    score,
    riskCodes: codes.length > 0 ? codes : [RISK_CODES.CLEAN],
    riskLevel,
    instantBlock,
    fingerprint,
    integrityHash,
    summary,
  }
}

// ─── Yardımcı: Risk kodu açıklamaları (jüri sunumu için) ──────────────────

export const RISK_CODE_DESCRIPTIONS: Record<RiskCode, string> = {
  R000: 'No risk factors detected — clean session',
  R001: 'navigator.webdriver = true — automation framework detected',
  R002: 'HeadlessChrome in User-Agent — headless browser confirmed',
  R003: 'PhantomJS/SlimerJS signature detected',
  R004: 'Zero browser plugins — typical of headless environments',
  R005: 'WebGL unavailable — headless or virtual machine',
  R006: 'Chrome UA present but window.chrome missing — spoofed UA',
  R007: 'Notification permission auto-denied — bot behavior',
  R010: 'OS/Browser combination is impossible (e.g. Linux + Safari)',
  R011: 'Timezone does not match browser language',
  R012: 'Screen resolution is 0×0 — no display attached',
  R013: 'Desktop UA with high touch point count — emulation suspected',
  R014: 'Single CPU core — container or VM environment',
  R015: 'Device memory < 1 GB — bot container suspected',
  R020: 'Canvas fingerprint is blank — rendering blocked',
  R021: 'WebGL vendor is software renderer (Mesa/Brian Paul)',
  R022: 'SwiftShader/LLVMpipe renderer — headless GPU emulation',
  R030: 'AudioContext could not be created',
  R031: 'Audio processing returned zero — virtual audio device',
}
