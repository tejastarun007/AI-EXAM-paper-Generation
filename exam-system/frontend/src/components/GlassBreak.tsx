import { TriangleAlert, KeySquare, ShieldAlert } from 'lucide-react'
import { useState } from 'react'

export default function GlassBreak() {
  const [token, setToken] = useState('')
  const [paperId, setPaperId] = useState('')
  const [examDatetime, setExamDatetime] = useState('')
  const [isBroken, setIsBroken] = useState(false)

  const handleBreakGlass = () => {
    // Mocking the backend call
    if (token && paperId && examDatetime) {
      setIsBroken(true)
    }
  }

  return (
    <div className="w-full max-w-[800px] animate-fade-in-up flex flex-col items-center justify-center mt-10">
      
      {!isBroken ? (
        <>
          <div className="w-32 h-32 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-8 relative">
            <div className="absolute inset-0 rounded-full border border-red-500/50 animate-ping opacity-20"></div>
            <TriangleAlert size={50} className="text-red-500 relative z-10 animate-pulse" />
          </div>

          <div className="text-center mb-10">
            <h2 className="text-4xl font-black text-red-500 uppercase tracking-widest mb-2 shadow-red-500/20 drop-shadow-md">
              Emergency Protocol
            </h2>
            <p className="text-red-200/60 max-w-md mx-auto text-sm text-center">
              WARNING: Deploying the Glass Break protocol circumvents dual-custodian authentication. This action is permanently anchored to the blockchain and will trigger a Level 4 Audit.
            </p>
          </div>

          <div className="bg-[#110505] border-2 border-red-900/50 rounded-2xl p-8 w-full max-w-md shadow-[0_0_50px_rgba(220,38,38,0.1)]">
            <div className="space-y-5">
              <div>
                <label className="text-xs uppercase tracking-widest text-red-400 font-bold mb-1.5 block">Paper Classification ID</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <KeySquare size={16} className="text-red-700" />
                  </div>
                  <input 
                    type="text" 
                    value={paperId}
                    onChange={(e) => setPaperId(e.target.value)}
                    className="bg-[#1a0a0a] border border-red-900/50 text-red-100 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block w-full pl-10 p-3 placeholder-red-900" 
                    placeholder="e.g. PHY-2026-FINAL"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-red-400 font-bold mb-1.5 block">Scheduled Datetime</label>
                <input 
                  type="text" 
                  value={examDatetime}
                  onChange={(e) => setExamDatetime(e.target.value)}
                  className="bg-[#1a0a0a] border border-red-900/50 text-red-100 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block w-full p-3 placeholder-red-900" 
                  placeholder="YYYY-MM-DD HH:MM Z"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-red-400 font-bold mb-1.5 block">Physical Envelope Token</label>
                <input 
                  type="password" 
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="bg-[#1a0a0a] border border-red-900/50 justify-center text-center font-mono tracking-[0.2em] text-red-100 text-lg rounded-lg focus:ring-red-500 focus:border-red-500 block w-full p-4 placeholder-red-900/50" 
                  placeholder="••••••••••••••••"
                />
              </div>

              <button 
                onClick={handleBreakGlass}
                className="w-full mt-4 bg-red-600 hover:bg-red-500 text-white font-black tracking-widest uppercase rounded-lg p-4 shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center space-x-2"
              >
                <span>Break Glass</span>
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-[#110505] border border-red-500 rounded-xl p-10 text-center shadow-[0_0_100px_rgba(220,38,38,0.3)] animate-pulse-slow">
          <ShieldAlert size={60} className="text-red-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-red-500 uppercase tracking-widest mb-4">Protocol Engaged</h2>
          <p className="text-red-200/80 mb-6">Secondary validation bypassed. Payload decryption offline.</p>
          <div className="bg-black/50 p-4 border border-red-900/50 rounded font-mono text-xs text-red-400 text-left max-w-sm mx-auto overflow-hidden mb-6">
            [+] Token signature verified <br/>
            [+] Bypassing dual-action controls <br/>
            [+] Forcing AES-GCM decryption key release <br/>
            [!] Audit trail locked and broadcast to Cardano mainnet.
          </div>
          <button 
            onClick={() => window.open(`/paper/${paperId || 'demo-paper-001'}/emergency-download`, '_blank')}
            className="w-full max-w-sm mx-auto bg-red-600 hover:bg-red-500 text-white font-black tracking-widest uppercase rounded-lg p-3 shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center space-x-2 mb-4"
          >
            <span>EXTRACT PAYLOAD (PDF)</span>
          </button>
          <button onClick={() => {setIsBroken(false); setPaperId(''); setToken(''); setExamDatetime('');}} className="text-xs text-slate-500 hover:text-white underline block mx-auto">
            Reset Interface
          </button>
        </div>
      )}

    </div>
  )
}
