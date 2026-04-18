import { ShieldCheck, Clock } from 'lucide-react'
import { getScoreColor } from '../styles/colors'
import type { AuditHistoryTableProps } from '../types'

function shortenAddress(addr: string): string {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function AuditHistoryTable({ entries }: AuditHistoryTableProps) {
  if (entries.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6 w-full max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-white/40" />
          <h3 className="text-white/60 text-sm font-medium">Recent Attestations</h3>
        </div>
        <p className="text-white/30 text-sm text-center py-6">
          No attestations yet. Complete a scan to see your history.
        </p>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-2xl p-6 w-full max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <ShieldCheck className="w-4 h-4 text-sapphire" />
        <h3 className="text-white font-medium text-sm">Recent Attestations</h3>
        <span className="ml-auto text-white/30 text-xs">{entries.length} record{entries.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-white/40 font-medium pb-3 pr-4">User</th>
              <th className="text-left text-white/40 font-medium pb-3 pr-4">Score</th>
              <th className="text-left text-white/40 font-medium pb-3 pr-4">Timestamp</th>
              <th className="text-left text-white/40 font-medium pb-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => {
              const color = getScoreColor(entry.score)
              return (
                <tr
                  key={i}
                  className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors"
                >
                  {/* User */}
                  <td className="py-3 pr-4">
                    <span className="font-mono text-white/70 text-xs">
                      {shortenAddress(entry.user)}
                    </span>
                  </td>

                  {/* Score */}
                  <td className="py-3 pr-4">
                    <span
                      className="font-bold tabular-nums"
                      style={{ color }}
                    >
                      {entry.score}
                    </span>
                    <span className="text-white/30 text-xs ml-1">/100</span>
                  </td>

                  {/* Timestamp */}
                  <td className="py-3 pr-4">
                    <span className="text-white/50 text-xs">{entry.timestamp}</span>
                  </td>

                  {/* Status */}
                  <td className="py-3">
                    {entry.verified ? (
                      <div className="flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full bg-sapphire/10 border border-sapphire/20">
                        <ShieldCheck className="w-3 h-3 text-sapphire" />
                        <span className="text-sapphire text-xs font-semibold">Verified</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                        <span className="text-red-400 text-xs font-semibold">Denied</span>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
