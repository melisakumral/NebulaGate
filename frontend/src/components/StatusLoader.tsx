import { useEffect, useState } from 'react'
import { Cpu, Fingerprint, Shield } from 'lucide-react'

const STEPS = [
  { text: 'Analyzing Fingerprint...', icon: Fingerprint },
  { text: 'Checking Wallet History...', icon: Cpu },
  { text: 'Auditing x402 Eligibility...', icon: Shield },
]

export function StatusLoader() {
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => (i + 1) % STEPS.length)
    }, 1200)
    return () => clearInterval(interval)
  }, [])

  const CurrentIcon = STEPS[stepIndex].icon

  return (
    <div className="flex flex-col items-center gap-6 py-8 animate-fade-in">
      {/* Dairesel loader */}
      <div className="relative w-20 h-20">
        <svg
          className="w-20 h-20 animate-spin-fast"
          viewBox="0 0 80 80"
          fill="none"
        >
          <circle
            cx="40"
            cy="40"
            r="34"
            stroke="rgba(37,99,235,0.15)"
            strokeWidth="6"
          />
          <circle
            cx="40"
            cy="40"
            r="34"
            stroke="#2563eb"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="60 154"
            strokeDashoffset="0"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <CurrentIcon className="w-7 h-7 text-sapphire" />
        </div>
      </div>

      {/* Durum metni */}
      <div className="text-center">
        <p
          key={stepIndex}
          className="text-white font-medium text-base animate-fade-in"
        >
          {STEPS[stepIndex].text}
        </p>
        <div className="flex gap-1.5 justify-center mt-3">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === stepIndex
                  ? 'w-6 bg-sapphire'
                  : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
