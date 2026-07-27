import { useState } from 'react'

interface LoginProps {
  onLoginSuccess: () => void
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [instId, setInstId] = useState('')
  const [token, setToken] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (instId && token) {
      onLoginSuccess()
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#0f131d] text-[#dfe2f1] font-sans relative overflow-hidden flex flex-col">

      {/* Animated Rising Particles */}
      <style>{`
        @keyframes rise {
          0%   { transform: translateY(100vh) translateX(0); opacity: 0; }
          10%  { opacity: 0.7; }
          90%  { opacity: 0.7; }
          100% { transform: translateY(-10vh) translateX(40px); opacity: 0; }
        }
      `}</style>
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[2]">
        {[
          { left: '10%', delay: '0s',  w: 6,  h: 6 },
          { left: '25%', delay: '4s',  w: 8,  h: 8 },
          { left: '40%', delay: '2s',  w: 5,  h: 5 },
          { left: '55%', delay: '7s',  w: 7,  h: 7 },
          { left: '70%', delay: '1s',  w: 5,  h: 5 },
          { left: '82%', delay: '11s', w: 9,  h: 9 },
          { left: '92%', delay: '14s', w: 6,  h: 6 },
        ].map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: p.left,
              bottom: '-20px',
              width: `${p.w}px`,
              height: `${p.h}px`,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #adc6ff, #3b82f6)',
              boxShadow: '0 0 8px 2px rgba(173,198,255,0.6)',
              animation: `rise 18s linear ${p.delay} infinite`,
            }}
          />
        ))}
      </div>

      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <img
          className="w-full h-full object-cover opacity-30 mix-blend-luminosity"
          alt="Futuristic high-security digital library"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCzRVOUoz9L6lOf-zK9x8_i0Zo2jy9G9z6cBuatEHgD-9hxHHycAZNU_ShfaiXop42lhJJ28bkyfaH7KG13hVgcxUEDOiEtVFq5FTquC3z9QrSQIzxnBmXbDvpqHRv2PCuWFiaZ7UZpVgXq0ZyQUcaPUa1BIQW4iyhNFnP5eH4CMSBuVNDAGJPGD_OCJ4cFFoPmJGJ5l4hqIHxODuoN-yvYWGdv8Vqh3gNfH5Xk-e1ULXZYCQC-t-h00C2snfVBZOgY3VSTd-y7fxM"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0f131d] via-[#0f131d]/90 to-transparent" />
      </div>

      {/* Scanlines Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-[5]"
        style={{
          background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.05) 51%, transparent 51%)',
          backgroundSize: '100% 4px',
        }}
      />

      {/* Floating SVG Accent — Top Right (Graduation Cap) */}
      <div
        className="fixed top-1/4 right-12 z-[3] pointer-events-none"
        style={{ animation: 'float 6s ease-in-out infinite' }}
      >
        <style>{`@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }`}</style>
        <svg width="110" height="110" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
          style={{ opacity: 0.35, filter: 'drop-shadow(0 0 18px rgba(173,198,255,0.7))' }}>
          <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" fill="#adc6ff"/>
          <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" fill="#adc6ff" opacity="0.7"/>
        </svg>
      </div>

      {/* Floating SVG Accent — Bottom Left (Lock / Shield) */}
      <div
        className="fixed bottom-1/4 left-12 z-[3] pointer-events-none"
        style={{ animation: 'float 6s ease-in-out -3s infinite' }}
      >
        <svg width="90" height="90" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
          style={{ opacity: 0.35, filter: 'drop-shadow(0 0 18px rgba(78,222,163,0.7))' }}>
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="#4edea3"/>
          <path d="M10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" fill="#0f131d"/>
        </svg>
      </div>

      {/* Top Navigation */}
      <header className="fixed top-0 w-full z-50 bg-[#0b0f19]/60 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
        <div className="flex items-center justify-between px-6 py-4 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#60b8ff] to-[#adc6ff] flex items-center justify-center shadow-[0_0_16px_rgba(96,184,255,0.45)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="white"/>
                <path d="M10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" fill="#adc6ff"/>
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tighter text-[#dfe2f1]">ExamVault</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            {['Guidelines', 'Support', 'System Check'].map(link => (
              <button key={link} onClick={() => alert(`Opening ${link}...`)} className="text-[#dfe2f1]/60 tracking-tight hover:text-[#adc6ff] transition-colors duration-300 text-sm">{link}</button>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <button onClick={() => document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' })} className="bg-gradient-to-r from-[#60b8ff] to-[#adc6ff] text-[#001a42] px-6 py-2 rounded-md font-semibold active:scale-95 transition-all duration-200 shadow-lg shadow-[#60b8ff]/30 text-sm">
              Login
            </button>
          </div>
        </div>
        <div className="bg-gradient-to-r from-transparent via-[#adc6ff]/30 to-transparent h-px w-full" />
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-grow flex items-center justify-center px-4 pt-28 pb-12">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          {/* Left Editorial Section */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-[#4edea3] tracking-[0.3em] text-[11px] uppercase font-bold">
                <span className="text-[#4edea3] drop-shadow-[0_0_8px_rgba(78,222,163,0.8)] animate-pulse">✔</span>
                SECURE ACADEMIC GATEWAY
              </div>
              <h1 className="text-6xl md:text-7xl font-black leading-tight tracking-tighter">
                Academic <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#60b8ff] to-[#adc6ff]">
                  Exam Vault
                </span>
              </h1>
              <p className="text-[#c2c6d6] text-lg max-w-md leading-relaxed opacity-80">
                The secure digital repository for institutional knowledge, encrypted question banks, and historical session archives.
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1c1f2a]/70 backdrop-blur-xl border border-white/5 p-5 rounded-2xl hover:scale-105 transition-transform duration-300 shadow-xl">
                <div className="text-[#60b8ff] text-2xl mb-2">📚</div>
                <p className="text-[10px] uppercase tracking-widest text-[#8c909f] mb-1">Total Assets</p>
                <p className="text-2xl font-bold text-[#dfe2f1] tabular-nums">14,208</p>
              </div>
              <div className="bg-[#1c1f2a]/70 backdrop-blur-xl border border-white/5 p-5 rounded-2xl hover:scale-105 transition-transform duration-300 shadow-xl">
                <div className="text-[#4edea3] text-2xl mb-2">🔐</div>
                <p className="text-[10px] uppercase tracking-widest text-[#8c909f] mb-1">Active Deans</p>
                <p className="text-2xl font-bold text-[#dfe2f1] tabular-nums">03</p>
              </div>
            </div>
          </div>

          {/* Right Login Terminal */}
          <div className="lg:col-span-7">
            <div
              className="w-full p-8 md:p-12 rounded-[2rem] relative overflow-hidden group"
              style={{
                background: 'rgba(23, 27, 38, 0.7)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.2)',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 20h80M10 40h80M10 60h80M10 80h80' stroke='rgba(140,144,159,0.05)' stroke-width='1'/%3E%3C/svg%3E")`,
              }}
            >
              {/* Glow */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#adc6ff]/20 blur-[80px] rounded-full group-hover:bg-[#adc6ff]/30 transition-colors duration-700" />

              <div className="relative z-10 space-y-8">
                {/* Header + Toggle */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#424754]/30 pb-6">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-[#dfe2f1]">Academic Identity Verification</h2>
                    <p className="text-sm text-[#8c909f]">Stage 01: Multi-Factor Authentication</p>
                  </div>
                  {/* Role */}
                  <div className="bg-[#0a0e18] p-1 rounded-full flex items-center border border-[#424754]/20 self-start">
                    <div className="px-4 py-1.5 text-xs font-bold rounded-full bg-[#adc6ff] text-[#001a42] shadow-sm">
                      FACULTY
                    </div>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-4">
                    {/* Institutional ID */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-[#adc6ff]">Institutional ID</label>
                        <span className="text-[9px] text-[#8c909f] font-mono">REQ_ID_ALPHA</span>
                      </div>
                      <div className="relative group/input">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#8c909f] group-focus-within/input:text-[#adc6ff] transition-colors">
                          <span>🔏</span>
                        </div>
                        <input
                          type="text"
                          value={instId}
                          onChange={e => setInstId(e.target.value)}
                          placeholder="ARCHIVE-DEAN-XXXX"
                          required
                          className="w-full bg-[#0a0e18]/50 backdrop-blur-md border border-white/5 focus:ring-2 focus:ring-[#adc6ff]/50 focus:border-[#adc6ff]/50 pl-12 py-4 rounded-xl text-[#dfe2f1] placeholder:text-[#8c909f]/40 transition-all outline-none text-sm"
                        />
                      </div>
                    </div>

                    {/* Access Token */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-[#adc6ff]">Access Token</label>
                        <span className="text-[9px] text-[#8c909f] font-mono">SHA-256_CRYPT</span>
                      </div>
                      <div className="relative group/input">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#8c909f] group-focus-within/input:text-[#adc6ff] transition-colors">
                          <span>🔑</span>
                        </div>
                        <input
                          type="password"
                          value={token}
                          onChange={e => setToken(e.target.value)}
                          placeholder="••••••••••••"
                          required
                          className="w-full bg-[#0a0e18]/50 backdrop-blur-md border border-white/5 focus:ring-2 focus:ring-[#adc6ff]/50 focus:border-[#adc6ff]/50 pl-12 py-4 rounded-xl text-[#dfe2f1] placeholder:text-[#8c909f]/40 transition-all outline-none text-sm tracking-widest"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Remember + Reset */}
                  <div className="flex items-center justify-between text-xs text-[#8c909f]">
                    <label className="flex items-center gap-2 cursor-pointer group/check">
                      <input type="checkbox" className="rounded-sm bg-[#1c1f2a] border-[#424754] text-[#4edea3] w-4 h-4" />
                      <span className="group-hover/check:text-[#dfe2f1] transition-colors">Keep Session Active</span>
                    </label>
                    <button type="button" onClick={() => alert('Initiating Emergency Reset Protocol... Please contact IT Security.')} className="hover:text-[#adc6ff] transition-colors underline underline-offset-4">Emergency Reset?</button>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#60b8ff] to-[#adc6ff] text-[#001a42] py-5 rounded-2xl font-bold text-lg shadow-xl shadow-[#60b8ff]/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    style={{ animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
                  >
                    🔓 Initialize Archive Decryption
                  </button>
                </form>

                {/* Footer Metadata */}
                <div className="flex flex-wrap items-center justify-between pt-6 border-t border-[#424754]/20 gap-4">
                  <div className="flex items-center gap-4 text-[10px] text-[#8c909f] font-mono">
                    <div className="flex flex-col">
                      <span>AUTH_LATENCY</span>
                      <span className="text-[#4edea3] font-mono">12.4ms</span>
                    </div>
                    <div className="flex flex-col border-l border-[#424754]/30 pl-4">
                      <span>PORTAL_STATUS</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" />
                        <span className="text-[#4edea3] font-bold">ENCRYPTED</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex flex-col text-[10px] items-end">
                      <span className="text-[#8c909f]">SECURITY_LEVEL</span>
                      <span className="text-[#adc6ff] font-bold">MAXIMUM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-8 flex flex-col items-center gap-4">
        <div className="flex gap-8 text-[#dfe2f1]/40 text-[11px] uppercase tracking-[0.2em]">
          {['Privacy Policy', 'Terms of Service', 'Integrity Standards'].map(l => (
            <button key={l} onClick={() => alert(`Viewing ${l}`)} className="hover:text-[#adc6ff] transition-colors hover:underline underline-offset-8">{l}</button>
          ))}
        </div>
        <p className="text-[#dfe2f1]/30 text-[10px] uppercase tracking-widest text-center">
          © 2026 High-Security Digital Vault. All rights reserved. Powered by Aegis Obsidian Architecture.
        </p>
      </footer>

      {/* Background Glow Orbs */}
      <div className="fixed top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none z-[1]"
        style={{ background: 'radial-gradient(circle, rgba(96,184,255,0.18) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="fixed bottom-0 right-0 w-[700px] h-[700px] rounded-full pointer-events-none z-[1]"
        style={{ background: 'radial-gradient(circle, rgba(96,184,255,0.10) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      <div className="fixed top-0 right-1/3 w-[400px] h-[400px] rounded-full pointer-events-none z-[1]"
        style={{ background: 'radial-gradient(circle, rgba(173,198,255,0.12) 0%, transparent 70%)', filter: 'blur(50px)' }} />
    </div>
  )
}
