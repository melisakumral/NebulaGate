export const colors = {
  background: {
    primary: '#0d1117',
    secondary: '#1c2128',
    card: 'rgba(28, 33, 40, 0.8)',
  },
  accent: {
    sapphire: '#2563eb',
    sapphireLight: '#3b82f6',
    amber: '#f59e0b',
    amberLight: '#fbbf24',
  },
  text: {
    primary: '#ffffff',
    secondary: '#e5e7eb',
    muted: '#9ca3af',
  },
  status: {
    success: '#2563eb',
    warning: '#f59e0b',
    error: '#dc2626',
  },
} as const

export function getScoreColor(score: number): string {
  if (score >= 70) return colors.accent.sapphire
  if (score >= 30) return colors.accent.amber
  return colors.status.error
}

export function getScoreLabel(score: number): string {
  if (score >= 70) return 'Trusted'
  if (score >= 30) return 'Suspicious'
  return 'High Risk'
}
