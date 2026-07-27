import { useEffect, useState } from 'react'

const LOG_LINES = [
  "[OK] Quantum entropy source synchronized.",
  "[OK] Heartbeat detected from 1,248 proctors.",
  "[INF] Waiting for master clock pulse...",
  "[OK] TLS 1.3 handshake established.",
  "[WRN] Ignored isolated ping from untrusted node.",
  "[INF] Recomputing node consensus...",
  "[OK] Node 0x82...F92 validated."
]

export default function LiveLogs() {
  const [logs, setLogs] = useState<string[]>([])
  const [sourceLogs, setSourceLogs] = useState<string[]>([])

  useEffect(() => {
    fetch('/metrics/audit-logs')
      .then(res => res.json())
      .then(data => {
        const logLines = data.map((l: any) => {
          if (l.type === 'DENY' || l.type === 'SYS') return `[WRN] ${l.details}`
          return `[OK] ${l.details}`
        })
        setSourceLogs(logLines.length > 0 ? logLines : ["[OK] All systems nominal."])
        setLogs(logLines.slice(0, 3))
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (sourceLogs.length === 0) return;
    const interval = setInterval(() => {
      setLogs(prev => {
        const nextLine = sourceLogs[Math.floor(Math.random() * sourceLogs.length)]
        return [...prev.slice(-4), nextLine]
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [sourceLogs])

  return (
    <div className="bg-[#171c28] border border-[rgba(255,255,255,0.05)] rounded-xl p-4 w-96 text-xs font-mono text-slate-400">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Live Security Feed</span>
        <span className="text-[10px] text-slate-600">12:14:28 PM</span>
      </div>
      <div className="space-y-1.5 h-24 overflow-hidden flex flex-col justify-end">
        {logs.map((log, i) => (
          <LogLine key={i} text={log} />
        ))}
      </div>
    </div>
  )
}

function LogLine({ text }: { text: string }) {
  const isErr = text.includes("[WRN]")
  const isOk = text.includes("[OK]")
  return (
    <div className="flex space-x-2 items-start animate-fade-in-up">
      <span className={`${isErr ? 'text-yellow-400' : isOk ? 'text-green-400' : 'text-blue-400'}`}>
        {text.split(' ')[0]}
      </span>
      <span className="text-slate-300 flex-1 break-words">{text.substring(text.indexOf(' ') + 1)}</span>
    </div>
  )
}
