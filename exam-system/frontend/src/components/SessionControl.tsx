import { ShieldAlert, RefreshCw, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function SessionControl() {
  const [sessions, setSessions] = useState<any[]>([])

  const fetchSessions = () => {
    fetch('/metrics/sessions')
      .then(res => res.json())
      .then(data => setSessions(data))
      .catch(console.error)
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const executeLockdown = async () => {
    if (window.confirm("WARNING: Are you sure you want to initiate a GLOBAL LOCKDOWN?")) {
      await fetch('/metrics/lockdown', { method: 'POST' })
      alert("DEFCON 1 INITIATED. Audit log updated.")
      fetchSessions()
    }
  }

  const revokeSession = async (sessionId: string) => {
    if (window.confirm(`Revoke session ${sessionId}?`)) {
      await fetch('/metrics/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      })
      alert(`Session ${sessionId} revoked and logged.`)
      fetchSessions()
    }
  }
  return (
    <div className="w-full max-w-[1000px] animate-fade-in-up">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-wide">Session Control</h2>
        <p className="text-slate-400 mt-1">Manage active connections and force kill compromised sessions.</p>
      </div>

      <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-6 mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <div className="p-3 bg-red-500/10 rounded-full mr-4">
            <ShieldAlert className="text-red-400" size={24} />
          </div>
          <div>
            <h3 className="text-red-400 font-bold tracking-wide">DEFCON 1 OVERRIDE</h3>
            <p className="text-sm text-red-200/70 mt-1">Instantly terminate all active sessions and lock down the vault.</p>
          </div>
        </div>
        <button onClick={executeLockdown} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all uppercase tracking-widest text-sm">
          Execute Lockdown
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sessions.length > 0 ? sessions.map((session, i) => (
          <div key={i} className="bg-[#111520] border border-[#1e2434] rounded-xl p-5 hover:border-[#2e374a] transition-colors relative overflow-hidden">
            {session.status === 'Warning' && <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>}
            {session.status === 'Active' && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>}
            
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-mono text-slate-500 mb-1">{session.id}</div>
                <h4 className="text-lg font-bold text-white">{session.user}</h4>
                <div className="text-sm text-slate-400 mt-1">IP: {session.ip}</div>
              </div>
              <div className="flex flex-col items-end">
                <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase ${session.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                  {session.status}
                </span>
                <span className="text-xs text-slate-500 mt-2 font-mono">{session.ping} ping</span>
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button onClick={() => fetchSessions()} className="flex-1 flex items-center justify-center space-x-2 py-2 bg-white/5 hover:bg-white/10 rounded border border-white/5 text-xs font-semibold text-slate-300 transition-colors">
                <RefreshCw size={14} /> <span>Sync State</span>
              </button>
              <button onClick={() => revokeSession(session.id)} className="flex-1 flex items-center justify-center space-x-2 py-2 bg-red-500/10 hover:bg-red-500/20 rounded border border-red-500/20 text-xs font-semibold text-red-400 transition-colors">
                <LogOut size={14} /> <span>Revoke</span>
              </button>
            </div>
          </div>
        )) : <div className="text-slate-500 italic p-4 col-span-2 text-sm bg-[#111520] border border-[#1e2434] rounded-xl text-center">No active sessions detected on the ledger.</div>}
      </div>
    </div>
  )
}
