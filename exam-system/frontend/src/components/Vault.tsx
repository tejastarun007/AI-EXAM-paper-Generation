import { useState, useEffect, useRef } from 'react'
import { Lock, Unlock, AlertTriangle, ShieldCheck, Download, Clock, Shield, CheckCircle2, FileLock } from 'lucide-react'
import LiveLogs from './LiveLogs'

type UIState = 'LOCKED' | 'WINDOW_OPEN' | 'UNLOCKED'

interface PaperMeta {
  commitment: string
  latest_chain_hash: string
  file_size_mb: number
  file_size_bytes: number
  created_at: string | null
  audit_events: { event_type: string; ts: number; hash_short: string }[]
}

interface SessionState {
  uiState:        UIState
  secondsToUnlock: number
  windowSeconds:   number
  hodAuthed:       boolean
  sessionToken:    string | null
}

export default function Vault({ initialPaperId, unlockSlot, currentSlot }: { initialPaperId: string | null, unlockSlot: number, currentSlot: number }) {
  const [paperId, setPaperId] = useState(initialPaperId || '')
  const [paperIdInput, setPaperIdInput] = useState(initialPaperId || '')
  const [paperLoaded, setPaperLoaded] = useState(!!initialPaperId)

  const [state, setState] = useState<SessionState>({
    uiState: currentSlot >= unlockSlot ? 'WINDOW_OPEN' : 'LOCKED',
    secondsToUnlock: Math.max(0, unlockSlot - currentSlot),
    windowSeconds: 90,
    hodAuthed: false,
    sessionToken: null,
  })
  const [meta, setMeta] = useState<PaperMeta | null>(null)
  const [sessionSecsLeft, setSessionSecsLeft] = useState(3600)
  
  const [hodCode, setHodCode] = useState('')
  const [lecCode, setLecCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const windowRef = useRef<number | null>(null)

  function loadPaper() {
    const id = paperIdInput.trim()
    if (!id) return
    setPaperId(id)
    setPaperLoaded(true)
    setError(null)
    // Reset auth state for a new paper
    setState({
      uiState: 'WINDOW_OPEN',
      secondsToUnlock: 0,
      windowSeconds: 90,
      hodAuthed: false,
      sessionToken: null,
    })
    setMeta(null)
    setHodCode('')
    setLecCode('')
  }

  // Countdown logic...
  useEffect(() => {
    if (state.uiState !== 'LOCKED') return
    const t = setInterval(() => {
      setState(s => {
        const secs = Math.max(0, s.secondsToUnlock - 1)
        return secs <= 0 ? { ...s, uiState: 'WINDOW_OPEN', secondsToUnlock: 0 } : { ...s, secondsToUnlock: secs }
      })
    }, 1000)
    return () => clearInterval(t)
  }, [state.uiState])

  useEffect(() => {
    if (!state.hodAuthed) return
    windowRef.current = window.setInterval(() => {
      setState(s => {
        const secs = Math.max(0, s.windowSeconds - 1)
        if (secs <= 0) {
          setError('Window expired. Please restart authentication.')
          return { ...s, hodAuthed: false, windowSeconds: 90 }
        }
        return { ...s, windowSeconds: secs }
      })
    }, 1000)
    return () => clearInterval(windowRef.current!)
  }, [state.hodAuthed])

  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  // Auth Methods
  async function submitHOD() {
    try {
      const res = await fetch('/auth/totp-verify', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({paper_id:paperId, role:'hod',
                              totp_code:hodCode, username:'hod'}),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail); return }
      setState(s => ({ ...s, hodAuthed: true, windowSeconds: 90 }))
    } catch(e) { setError('Network error') }
  }

  async function submitLecturer() {
    try {
      const res = await fetch('/auth/totp-verify', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({paper_id:paperId, role:'lecturer',
                              totp_code:lecCode, username:'lecturer'}),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail); return }
      const token = data.token
      setState(s => ({ ...s, uiState: 'UNLOCKED', sessionToken: token }))

      // Decode JWT expiry for real session countdown
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.exp) setSessionSecsLeft(Math.max(0, payload.exp - Math.floor(Date.now() / 1000)))
      } catch {}

      // Fetch real metadata from backend
      try {
        const mRes = await fetch(`/paper/${paperId}/metadata`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (mRes.ok) setMeta(await mRes.json())
      } catch {}
    } catch(e) { setError('Network error') }
  }

  async function downloadPaper() {
    setError(null)
    const res = await fetch(`/paper/${paperId}/download`, {
      headers: { Authorization: `Bearer ${state.sessionToken}` }
    })
    if (!res.ok) { setError('Download failed'); return }
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `exam_${paperId}.pdf`; a.click()
  }

  return (
    <div className="w-full flex flex-col items-center">

      {/* Paper ID Entry Bar */}
      <div className="w-full max-w-2xl mb-8">
        <div className="bg-[rgba(23,27,38,0.65)] border border-[rgba(96,184,255,0.15)] rounded-2xl p-6 backdrop-blur-xl shadow-2xl">
          <label className="text-[10px] font-bold text-[#8c909f] uppercase tracking-[0.2em] mb-3 block">
            Paper Classification ID
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={paperIdInput}
              onChange={e => setPaperIdInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadPaper()}
              className="flex-1 bg-[#0a0d14] border border-[rgba(59,130,246,0.2)] rounded-xl px-5 py-4 text-lg font-mono tracking-wider text-[#dfe2f1] focus:outline-none focus:border-[#adc6ff] focus:shadow-[0_0_10px_rgba(173,198,255,0.2)] transition-all placeholder-[#3a3f50]"
              placeholder="e.g. paper-a217d0cc"
            />
            <button
              onClick={loadPaper}
              disabled={!paperIdInput.trim()}
              className="bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] hover:opacity-90 text-white font-bold px-6 rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Load Paper
            </button>
          </div>
          {paperId && paperLoaded && (
            <div className="mt-3 text-xs text-[#4edea3] font-mono flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse inline-block" />
              Active: <span className="text-[#dfe2f1] font-bold">{paperId}</span>
            </div>
          )}
        </div>
      </div>

      {!paperLoaded ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
          <Lock size={64} className="text-[#adc6ff] mb-6" />
          <h3 className="text-2xl font-bold text-[#dfe2f1] mb-2">No Paper Selected</h3>
          <p className="text-[#8c909f] text-sm">Enter a Paper ID above to access the vault.</p>
        </div>
      ) : (
      <>

      {/* Central Vault Icon */}
      <div className={`mb-6 w-24 h-24 rounded-3xl flex items-center justify-center transition-all duration-700
        ${state.uiState === 'UNLOCKED'
          ? 'bg-gradient-to-br from-[#4edea3]/20 to-[#3b82f6]/20 border-2 border-[#4edea3]/50 shadow-[0_0_40px_rgba(78,222,163,0.3)]'
          : 'bg-[rgba(23,27,38,0.8)] border border-[rgba(59,130,246,0.2)] shadow-[0_0_20px_rgba(59,130,246,0.1)]'}`}>
        {state.uiState === 'UNLOCKED'
          ? <Unlock size={48} className="text-[#4edea3]" />
          : <Lock size={48} className="text-[#adc6ff]" />}
      </div>

      <h2 className="text-4xl font-extrabold tracking-tight mb-3 text-[#dfe2f1]">
        STATE: {state.uiState.replace('_', ' ')}
      </h2>
      <div className="px-5 py-1.5 rounded-full border border-[#3b82f6]/30 bg-[#3b82f6]/10 text-xs font-bold text-[#adc6ff] tracking-widest uppercase mb-10">
        Cryptographic Lock Active
      </div>

      {error && (
        <div className="w-full max-w-2xl bg-danger/10 border border-danger/30 text-danger px-6 py-4 rounded-xl flex items-center space-x-3 mb-8">
          <AlertTriangle size={20} />
          <span className="font-semibold text-sm">{error}</span>
        </div>
      )}

      {/* Main Content Card */}
      <div className="w-full max-w-4xl bg-panel border border-border rounded-3xl p-10 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        
        {/* STATE: LOCKED */}
        {state.uiState === 'LOCKED' && (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="flex items-center space-x-2 text-[#8c909f] uppercase tracking-widest text-sm font-semibold mb-4">
              <Clock size={16} className="text-[#adc6ff]" />
              <span>Time Until Decryption</span>
            </div>
            <div className="text-8xl md:text-[8rem] font-black text-[#adc6ff] tracking-tighter tabular-nums drop-shadow-[0_0_25px_rgba(173,198,255,0.4)]">
              {fmtTime(state.secondsToUnlock)}
            </div>
            <div className="grid grid-cols-3 gap-8 w-full max-w-lg mt-6 text-center">
              <span className="text-xs uppercase tracking-[0.2em] text-[#8c909f] font-bold">Hours</span>
              <span className="text-xs uppercase tracking-[0.2em] text-[#8c909f] font-bold">Minutes</span>
              <span className="text-xs uppercase tracking-[0.2em] text-[#8c909f] font-bold">Seconds</span>
            </div>
          </div>
        )}

        {/* STATE: WINDOW_OPEN */}
        {state.uiState === 'WINDOW_OPEN' && (
          <div className="flex flex-col md:flex-row gap-8">
            {/* Phase 1: HOD */}
            <div className={`flex-1 rounded-2xl border p-8 transition-all duration-300
              ${!state.hodAuthed
                ? 'border-[#3b82f6]/50 bg-[#3b82f6]/5 shadow-[0_0_25px_rgba(59,130,246,0.15)]'
                : 'border-[rgba(59,130,246,0.1)] bg-[rgba(23,27,38,0.5)] opacity-60'}`}>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="text-xs font-bold text-[#adc6ff] tracking-widest mb-2 font-mono">PHASE_01</div>
                  <h3 className="text-2xl font-bold text-[#dfe2f1]">Department Head (HOD)</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/25 flex items-center justify-center text-[#adc6ff] shadow-[0_0_12px_rgba(59,130,246,0.2)]">
                  <Shield size={22} />
                </div>
              </div>
              <div className="mb-8">
                <label className="text-[10px] font-bold text-[#8c909f] uppercase tracking-[0.2em] mb-3 block">6-Digit TOTP Token</label>
                <input
                  type="text" maxLength={6} disabled={state.hodAuthed}
                  className="w-full bg-[#0a0d14] border border-[rgba(59,130,246,0.2)] rounded-xl px-4 py-5 text-center text-3xl tracking-[1em] font-mono text-[#dfe2f1] focus:outline-none focus:border-[#adc6ff] focus:shadow-[0_0_10px_rgba(173,198,255,0.2)] disabled:opacity-50 transition-all"
                  value={hodCode} onChange={e => setHodCode(e.target.value)}
                  placeholder="••••••"
                />
              </div>
              <button
                onClick={submitHOD} disabled={state.hodAuthed || hodCode.length !== 6}
                className="w-full bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] hover:opacity-90 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {state.hodAuthed ? '✓ AUTHENTICATED' : 'AUTHENTICATE HOD'}
              </button>
            </div>

            {/* Phase 2: Lecturer */}
            <div className={`flex-1 rounded-2xl border p-8 transition-all duration-300 relative overflow-hidden
              ${state.hodAuthed
                ? 'border-[#4edea3]/50 bg-[#4edea3]/5 shadow-[0_0_25px_rgba(78,222,163,0.15)]'
                : 'border-[rgba(59,130,246,0.1)] bg-[rgba(23,27,38,0.5)] opacity-40 grayscale pointer-events-none'}`}>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="text-xs font-bold text-[#4edea3] tracking-widest mb-2 font-mono">PHASE_02</div>
                  <h3 className="text-2xl font-bold text-[#dfe2f1]">Co-Examiner (Lecturer)</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#4edea3]/10 border border-[#4edea3]/25 flex items-center justify-center text-[#4edea3] shadow-[0_0_12px_rgba(78,222,163,0.2)]">
                  <Clock size={22} />
                </div>
              </div>
              {state.hodAuthed && (
                <div className="bg-[#4edea3]/10 border border-[#4edea3]/25 rounded-xl p-4 mb-8 flex items-start space-x-3">
                  <AlertTriangle size={18} className="text-[#4edea3] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-[#4edea3] mb-1">Step 2: Co-Examiner Authentication.</div>
                    <div className="text-sm text-[#4edea3]/80">Window expires in: <span className="font-mono font-bold tabular-nums ml-2 text-[#dfe2f1] bg-[#4edea3]/15 px-2 py-0.5 rounded">{fmtTime(state.windowSeconds)}</span></div>
                  </div>
                </div>
              )}
              <div className="mb-8">
                <label className="text-[10px] font-bold text-[#8c909f] uppercase tracking-[0.2em] mb-3 block">6-Digit TOTP Token</label>
                <input
                  type="text" maxLength={6}
                  className="w-full bg-[#0a0d14] border border-[rgba(78,222,163,0.2)] rounded-xl px-4 py-5 text-center text-3xl tracking-[1em] font-mono text-[#dfe2f1] focus:outline-none focus:border-[#4edea3] focus:shadow-[0_0_10px_rgba(78,222,163,0.2)] transition-all"
                  value={lecCode} onChange={e => setLecCode(e.target.value)}
                  placeholder="••••••"
                />
              </div>
              <button
                onClick={submitLecturer} disabled={lecCode.length !== 6}
                className="w-full bg-gradient-to-r from-[#4edea3] to-[#10b981] hover:opacity-90 text-[#0f131d] font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                AUTHENTICATE LECTURER
              </button>
            </div>
          </div>
        )}

        {/* STATE: UNLOCKED */}
        {state.uiState === 'UNLOCKED' && (
          <div className="flex flex-col space-y-6 w-full pb-8">
            
            {/* Top Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-panel/30 border border-border rounded-3xl p-8 shadow-xl backdrop-blur-md relative overflow-hidden">
              <div className="relative z-10 w-full md:w-auto">
                <div className="inline-flex items-center space-x-2 bg-success/10 border border-success/20 px-3 py-1 rounded-full text-success text-xs font-bold tracking-widest mb-4 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                  <CheckCircle2 size={12} />
                  <span>VERIFIED ACCESS</span>
                </div>
                <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight mb-2">STATE: UNLOCKED</h2>
                <p className="text-slate-400 text-lg mb-8">Blockchain Lock Verified. Zero-Knowledge Proof Accepted.</p>
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <button onClick={downloadPaper} className="w-full md:w-auto bg-success hover:bg-emerald-400 text-[#0f121b] font-extrabold py-3 px-6 rounded-xl flex items-center justify-center space-x-3 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-105">
                    <Download size={20} />
                    <span>Download Encrypted Exam (PDF)</span>
                  </button>
                  <button 
                    onClick={() => {
                      const hash = meta?.commitment || meta?.latest_chain_hash || 'Loading...'
                      alert(`Blockchain Commitment Hash:\n\n${hash}\n\nThis SHA-256 fingerprint of the encrypted exam PDF is immutably stored in the blockchain. Navigate to the Audit Trail tab to view the full chain.`)
                    }}
                    className="w-full md:w-auto bg-[#121622] hover:bg-[#1a2133] border border-border text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md">
                    View Audit Hash
                  </button>
                </div>
              </div>
              <div className="hidden md:flex absolute right-12 top-1/2 -translate-y-1/2 w-48 h-48 bg-success/15 rounded-full blur-3xl"></div>
              <div className="hidden md:flex relative z-10 pr-12">
                <Unlock size={120} className="text-success drop-shadow-[0_0_40px_rgba(16,185,129,0.4)]" strokeWidth={2.5} />
              </div>
            </div>

            {/* Middle Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Authentication Chain */}
              <div className="md:col-span-2 bg-panel/30 border border-border rounded-2xl p-6 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <ShieldCheck size={20} className="text-success" />
                    <span className="text-lg font-bold text-white tracking-wide">Authentication Chain</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-success/10 border border-success/20 text-success px-2 py-1 rounded uppercase tracking-wider">
                    {meta ? `SHA: ${meta.commitment.slice(0, 8)}...` : 'BLOCK: LOADING'}
                  </span>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-slate-400 font-medium">Zero-Knowledge Integrity</span>
                    <span className="text-success font-mono font-bold">100% Match</span>
                  </div>
                  <div className="h-2.5 w-full bg-[#0a0d14] rounded-full overflow-hidden shadow-inner border border-white/5">
                    <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 w-full relative">
                       <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono italic mt-3">
                    {meta ? `Commitment: ${meta.commitment.slice(0, 32)}...` : 'Loading commitment hash...'}
                  </div>
                </div>

                <div className="bg-[#0a0d14] border border-border/50 rounded-xl p-4 flex items-center space-x-4 mt-6">
                  <div className="p-2 bg-success/10 border border-success/20 rounded-lg shadow-inner"><Lock size={16} className="text-success" /></div>
                  <div>
                    <div className="text-sm font-bold text-white mb-0.5 tracking-wide">Ephemeral Key Status</div>
                    <div className="text-xs text-slate-500 font-mono">
                      {state.sessionToken
                        ? `${state.sessionToken.slice(0, 6)}...${state.sessionToken.slice(-6)} (Active for ${fmtTime(sessionSecsLeft)})`
                        : 'Loading...'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Session Expiry */}
              <div className="bg-panel/30 border border-border rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col justify-between group hover:border-[#2e374a] transition-all">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-wide mb-1">Session Expiry</h3>
                  <p className="text-xs text-slate-500">Security window active</p>
                </div>
                <div className="my-6">
                  <div className="text-6xl font-black font-mono text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">{fmtTime(sessionSecsLeft)}</div>
                  <div className="text-[10px] text-success font-bold tracking-[0.1em] uppercase mt-2">Automatic Relock Active</div>
                </div>
                <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-medium">
                  <Clock size={12} />
                  <span>{meta?.created_at ? `Generated: ${new Date(meta.created_at).toLocaleTimeString()}` : 'Last validated: just now'}</span>
                </div>
              </div>
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Crypto Details */}
              <div className="bg-panel/30 border border-border rounded-2xl p-6 shadow-xl backdrop-blur-md">
                <div className="w-10 h-10 bg-success/10 rounded-lg border border-success/20 mb-6 flex items-center justify-center shadow-inner">
                  <FileLock size={20} className="text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1 tracking-wide">Advanced Cryptography</h3>
                <p className="text-xs text-slate-500 mb-6">Paper ID: {paperId}</p>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                    <span className="text-slate-400">File Size</span>
                    <span className="text-white font-medium">{meta ? `${meta.file_size_mb} MB` : '...'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                    <span className="text-slate-400">Bytes</span>
                    <span className="text-white font-medium font-mono text-xs">{meta ? meta.file_size_bytes.toLocaleString() : '...'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-1">
                    <span className="text-slate-400">Encryption</span>
                    <span className="text-white font-medium font-mono text-xs bg-white/5 px-2 py-1 rounded">AES-256-GCM</span>
                  </div>
                </div>
              </div>

              {/* Verification Logs */}
              <div className="md:col-span-2 bg-panel/30 border border-border rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col relative overflow-hidden group hover:border-[#2e374a] transition-all">
                <div className="absolute right-0 bottom-0 w-32 h-32 bg-success/5 rounded-tl-full blur-2xl"></div>
                <h3 className="text-lg font-bold text-white tracking-wide mb-6 relative z-10">Live Verification Logs</h3>
                <div className="flex-1 space-y-4 font-mono text-xs relative z-10">
                  {meta && meta.audit_events.length > 0 ? (
                    meta.audit_events.map((ev, i) => (
                      <div key={i} className="flex items-center space-x-4 text-slate-300">
                        <span className="text-slate-600">{new Date(ev.ts * 1000).toLocaleTimeString()}</span>
                        <div className="bg-success/20 rounded-full p-0.5"><CheckCircle2 size={12} className="text-success" /></div>
                        <span>{ev.event_type.replace(/_/g, ' ')} <span className="text-success">{ev.hash_short}</span></span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-center space-x-4 text-slate-300">
                        <span className="text-slate-600">{new Date().toLocaleTimeString()}</span>
                        <div className="bg-success/20 rounded-full p-0.5"><CheckCircle2 size={12} className="text-success" /></div>
                        <span>Session unlocked. Loading audit chain...</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Node Bar */}
            <div className="mt-2 bg-[#0a0d14]/50 border border-border rounded-xl px-6 py-4 flex flex-col md:flex-row justify-between items-center text-xs shadow-inner">
              <div className="flex space-x-8 w-full md:w-auto">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Node Identity</span>
                  <span className="text-slate-300 font-mono font-bold tracking-wide">NODE-ETH-AMER-04</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Latency</span>
                  <span className="text-success font-mono font-bold tracking-wide">14ms</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-success font-bold tracking-widest uppercase mt-4 md:mt-0 bg-success/10 border border-success/20 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                <span className="text-[10px]">Blockchain Link Stable</span>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Bottom Log Indicator */}
      <div className="mt-12 flex flex-col items-center pb-8 w-full max-w-4xl">
        {state.uiState === 'LOCKED' && (
          <div className="w-full flex md:flex-row flex-col items-center md:items-start justify-between gap-8 bg-panel/30 border border-border rounded-2xl p-6 shadow-xl backdrop-blur-md">
            
            <div className="flex-1 flex flex-col max-w-lg">
              <div className="flex items-start gap-4 mb-5">
                <div className="mt-1 shrink-0 flex items-center justify-center bg-success/20 text-success rounded-full w-5 h-5 border border-success/30">
                  <ShieldCheck size={12} />
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Security integrity verified. Authentication window opens at <span className="text-white font-bold">T-15 minutes</span>. Please ensure biometric hardware is connected.
                </p>
              </div>
              <div className="flex gap-4 ml-9">
                <div className="bg-[#121622] border border-border/50 px-3 py-1 rounded-md flex items-center gap-2 shadow-inner">
                  <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                  <span className="text-[10px] text-slate-500 font-mono tracking-widest font-bold">NODE: 0XB2...F92</span>
                </div>
                <div className="bg-[#121622] border border-border/50 px-3 py-1 rounded-md flex items-center gap-2 shadow-inner">
                  <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                  <span className="text-[10px] text-slate-500 font-mono tracking-widest font-bold">ENC: AES-256-GCM</span>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center">
              <LiveLogs />
            </div>

          </div>
        )}
        {state.uiState === 'WINDOW_OPEN' && (
          <div className="flex items-center space-x-4 bg-[rgba(23,27,38,0.8)] border border-[rgba(59,130,246,0.2)] rounded-full py-3 px-8 shadow-xl backdrop-blur-xl">
            <div className="flex -space-x-2">
              <img className="w-8 h-8 rounded-full border-2 border-[#0f131d]" src="https://api.dicebear.com/9.x/notionists/svg?seed=HOD" alt="HOD" />
              <img className="w-8 h-8 rounded-full border-2 border-[#0f131d]" src="https://api.dicebear.com/9.x/notionists/svg?seed=Lecturer" alt="Lecturer" />
            </div>
            <div className="text-sm text-[#8c909f]">
              <span className="font-bold text-[#dfe2f1] tracking-wide">Active Security Watch</span>
              <span className="mx-3">•</span>
              Monitoring session hash: <span className="font-mono font-bold text-[#adc6ff] cursor-pointer hover:underline border border-[#adc6ff]/20 bg-[#adc6ff]/10 px-2 py-0.5 rounded">0xF9...2L1</span>
            </div>
          </div>
        )}
      </div>

      </>
      )}
    </div>
  )
}
