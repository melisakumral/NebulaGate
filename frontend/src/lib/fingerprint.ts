import type { BrowserFingerprint } from '../types'

// ─── Fingerprint Toplama ───────────────────────────────────────────────────

export async function collectFingerprint(): Promise<BrowserFingerprint> {
  // WebGL bilgileri
  const canvas = document.createElement('canvas')
  canvas.width = 200
  canvas.height = 50
  const gl = canvas.getContext('webgl') as WebGLRenderingContext | null
  const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info') ?? null

  let webglRenderer: string | null = null
  let webglVendor: string | null = null
  if (gl && debugInfo) {
    webglRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string
    webglVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string
  }

  // Canvas parmak izi
  const ctx2d = canvas.getContext('2d')
  let canvasHash: string | null = null
  if (ctx2d) {
    ctx2d.fillStyle = '#0d1117'
    ctx2d.fillRect(0, 0, 200, 50)
    ctx2d.fillStyle = '#2563eb'
    ctx2d.font = '14px Arial'
    ctx2d.fillText('NebulaGate \u2022 fingerprint', 10, 30)
    canvasHash = canvas.toDataURL()
  }

  // IP adresi
  let ipAddress: string | null = null
  try {
    const res = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(3000),
    })
    const data = (await res.json()) as { ip: string }
    ipAddress = data.ip
  } catch {
    ipAddress = null
  }

  // Plugin listesi
  const pluginArray = Array.from(navigator.plugins ?? [])
  const plugins = pluginArray.map((p) => p.name)

  return {
    userAgent: navigator.userAgent,
    webglRenderer,
    webglVendor,
    ipAddress,
    canvasHash,
    screenResolution: `${screen.width}x${screen.height}`,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio ?? 1,
    pluginCount: plugins.length,
    plugins,
    isWebdriver: !!(navigator as Navigator & { webdriver?: boolean }).webdriver,
    hasWebGL: gl !== null,
  }
}

// ─── Skor Hesaplama ────────────────────────────────────────────────────────

export function calculateScore(fp: BrowserFingerprint): number {
  let score = 0

  // Pozitif sinyaller
  if (fp.userAgent && fp.userAgent.length > 0) score += 20
  if (fp.hasWebGL && fp.webglRenderer) score += 20
  if (fp.canvasHash && fp.canvasHash.length > 100) score += 15
  if (fp.ipAddress) score += 15
  if (fp.pluginCount > 0) score += 15
  if (fp.screenResolution !== '0x0') score += 10
  if (fp.colorDepth >= 24) score += 5

  // Negatif sinyaller (headless belirtileri)
  if (fp.isWebdriver) score -= 50
  if (!fp.hasWebGL) score -= 30
  if (fp.pluginCount === 0) score -= 20

  return Math.max(0, Math.min(100, score))
}

// ─── Headless Tespiti ──────────────────────────────────────────────────────

export function detectHeadless(fp: BrowserFingerprint): boolean {
  return fp.isWebdriver === true || fp.hasWebGL === false || fp.pluginCount === 0
}
