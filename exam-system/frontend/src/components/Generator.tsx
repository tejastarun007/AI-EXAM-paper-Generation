import { useState, useEffect } from 'react'
import { FileText, CheckCircle2, Play, Loader2, Server, ChevronDown } from 'lucide-react'

interface SubjectOption {
  name: string
  code: string
}

export default function Generator({ onGoToVault }: { onGoToVault?: (paperId: string) => void }) {
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [generateStatus, setGenerateStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle')
  const [paperId, setPaperId] = useState<string | null>(null)
  const [resultSubject, setResultSubject] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string>('')

  // Fetch subjects on mount
  useEffect(() => {
    fetch('/generate/subjects')
      .then(res => res.json())
      .then(data => {
        setSubjects(data.subjects || [])
        if (data.subjects?.length > 0) {
          setSelectedSubject(data.subjects[0].name)
        }
      })
      .catch(() => {
        // Fallback hardcoded subjects if backend is unreachable
        const fallback: SubjectOption[] = [
          { name: 'Blockchain', code: 'BCS613A' },
          { name: 'Python Programming', code: 'BPLC205B' },
          { name: 'Analysis and Design of Algorithms', code: 'BCS401' },
        ]
        setSubjects(fallback)
        setSelectedSubject(fallback[0].name)
      })
  }, [])

  const handleGenerate = async () => {
    if (!selectedSubject) return
    setGenerateStatus('generating')
    setErrorMsg('')
    try {
      const res = await fetch(`/generate/exam?subject=${encodeURIComponent(selectedSubject)}`, {
        method: 'POST'
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Generation failed')
      }
      const data = await res.json()
      setPaperId(data.paper_id)
      setResultSubject(data.subject)
      setGenerateStatus('success')
    } catch (e: any) {
      console.error(e)
      setErrorMsg(e.message || 'Generation failed')
      setGenerateStatus('error')
    }
  }

  const handleReset = () => {
    setGenerateStatus('idle')
    setPaperId(null)
    setResultSubject('')
    setErrorMsg('')
  }

  const selectedCode = subjects.find(s => s.name === selectedSubject)?.code || ''

  return (
    <div className="w-full max-w-[1000px] animate-fade-in-up pb-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/40 rounded-full animate-ping"></div>
            <div className="relative w-3 h-3 bg-emerald-500 rounded-full border border-emerald-500/50"></div>
          </div>
          <span className="text-xs font-mono font-bold tracking-[0.2em] text-emerald-500 uppercase">AI Processor Online</span>
        </div>
        <h2 className="text-4xl font-extrabold text-white tracking-tight">Exam Generator</h2>
        <p className="text-slate-400 mt-2">Select a subject and generate a 2-variation encrypted exam paper instantly.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Col: Subject Selection */}
        <div className="bg-[#111520]/80 border border-[#1e2434] rounded-2xl p-8 backdrop-blur-xl shadow-2xl flex flex-col">
          <h3 className="text-xl font-bold text-white mb-6">1. Select Subject</h3>

          {/* Custom Dropdown */}
          <div className="relative mb-6">
            <button
              id="subject-dropdown-toggle"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full bg-[#0a0d14] border border-[#2e374a] rounded-xl p-4 flex items-center justify-between text-left hover:border-blue-500/50 transition-all group"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText size={24} className="text-blue-400" />
                </div>
                <div>
                  <div className="text-white font-bold text-lg">{selectedSubject || 'Choose...'}</div>
                  {selectedCode && <div className="text-slate-500 text-xs font-mono mt-0.5">{selectedCode}</div>}
                </div>
              </div>
              <ChevronDown size={20} className={`text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute z-50 mt-2 w-full bg-[#111520] border border-[#2e374a] rounded-xl shadow-2xl overflow-hidden animate-fade-in-up">
                {subjects.map((subj) => (
                  <button
                    key={subj.name}
                    id={`subject-option-${subj.code}`}
                    onClick={() => {
                      setSelectedSubject(subj.name)
                      setDropdownOpen(false)
                      if (generateStatus !== 'idle') handleReset()
                    }}
                    className={`w-full px-5 py-4 flex items-center justify-between text-left hover:bg-blue-500/10 transition-all border-b border-[#1e2434] last:border-b-0
                      ${selectedSubject === subj.name ? 'bg-blue-500/5 border-l-2 border-l-blue-500' : ''}`}
                  >
                    <div>
                      <div className="text-white font-semibold">{subj.name}</div>
                      <div className="text-slate-500 text-xs font-mono mt-0.5">{subj.code}</div>
                    </div>
                    {selectedSubject === subj.name && (
                      <CheckCircle2 size={18} className="text-blue-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Subject Info Card */}
          {selectedSubject && (
            <div className="bg-[#0a0d14] border border-[#1e2434] rounded-xl p-5 space-y-3 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs uppercase tracking-wider">Subject</span>
                <span className="text-white font-semibold text-sm">{selectedSubject}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs uppercase tracking-wider">Code</span>
                <span className="text-blue-400 font-mono text-sm">{selectedCode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs uppercase tracking-wider">Format</span>
                <span className="text-emerald-400 font-mono text-sm">25 Marks CIE</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs uppercase tracking-wider">Output</span>
                <span className="text-purple-400 font-mono text-sm">2 Sets (SET A + SET B)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs uppercase tracking-wider">CO Levels</span>
                <div className="flex items-center space-x-1">
                  <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-xs font-bold">CO1</span>
                  <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs font-bold">CO2</span>
                  <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-xs font-bold">CO3</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Generate */}
        <div className="bg-[#111520]/80 border border-[#1e2434] rounded-2xl p-8 backdrop-blur-xl shadow-2xl flex flex-col transition-all">
          <h3 className="text-xl font-bold text-white mb-6">2. Generate Paper</h3>

          <div className="flex-1 flex flex-col justify-center items-center py-6">
            <div className="relative mb-8">
              <div className={`absolute inset-0 bg-purple-500/20 rounded-full blur-xl transition-opacity animate-pulse
                ${generateStatus === 'generating' ? 'opacity-100' : 'opacity-0'}`}></div>
              <div className="w-24 h-24 bg-[#0a0d14] border border-[#2e374a] rounded-2xl flex items-center justify-center relative z-10 shadow-inner">
                {generateStatus === 'generating' ? (
                  <Server size={40} className="text-purple-400 animate-bounce" />
                ) : generateStatus === 'success' ? (
                  <CheckCircle2 size={40} className="text-emerald-400" />
                ) : generateStatus === 'error' ? (
                  <Server size={40} className="text-red-400" />
                ) : (
                  <Server size={40} className="text-slate-500" />
                )}
              </div>
            </div>

            <p className="text-center text-slate-400 text-sm mb-8 px-4">
              {generateStatus === 'idle' && "Generates a single PDF with 2 pages — SET A and SET B. Uses hardcoded question banks for instant generation."}
              {generateStatus === 'generating' && "Selecting questions... Building SET A & SET B... Applying AES-256 encryption..."}
              {generateStatus === 'success' && "Synthesis complete. Both sets are encrypted in a single PDF in the Vault."}
              {generateStatus === 'error' && (errorMsg || "Generation failed. Please try again.")}
            </p>

            {generateStatus === 'success' && paperId ? (
              <div className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center animate-fade-in-up shadow-lg">
                <div className="text-emerald-400 font-extrabold text-xl mb-2">✅ Exam Successfully Generated!</div>
                <div className="text-slate-300 text-sm mb-4">
                  Single PDF with <span className="text-white font-bold">SET A</span> and <span className="text-white font-bold">SET B</span> for <span className="text-blue-400 font-semibold">{resultSubject}</span>.
                </div>
                <div className="bg-[#0a0d14] py-3 px-4 rounded-lg inline-block border border-[#2e374a] mb-4">
                  <span className="text-slate-500 text-xs uppercase tracking-wider mr-3">Paper ID</span>
                  <span className="text-white font-mono text-lg tracking-widest">{paperId}</span>
                </div>
                <button
                  onClick={() => onGoToVault?.(paperId!)}
                  className="text-emerald-300 font-medium text-sm tracking-wide mb-4 hover:text-white transition-colors cursor-pointer bg-transparent border-none"
                >
                  👉 Go to <span className="text-white font-bold border-b-2 border-emerald-500 pb-0.5">Paper Management</span> to retrieve it.
                </button>
                <button
                  id="generate-another-btn"
                  onClick={handleReset}
                  className="mt-2 text-sm text-slate-400 hover:text-white border border-[#2e374a] px-4 py-2 rounded-lg transition-all hover:bg-white/5"
                >
                  Generate Another Paper
                </button>
              </div>
            ) : (
              <button
                id="generate-exam-btn"
                onClick={handleGenerate}
                disabled={generateStatus === 'generating' || !selectedSubject}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-extrabold shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all flex items-center justify-center space-x-3 text-lg"
              >
                {generateStatus === 'generating' ? (
                  <><Loader2 size={24} className="animate-spin" /><span>Generating...</span></>
                ) : generateStatus === 'error' ? (
                  <><Play fill="currentColor" size={20} /><span>Retry Generation</span></>
                ) : (
                  <><Play fill="currentColor" size={20} /><span>Generate Secure Exam</span></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Status Indicators */}
      <div className="mt-8 grid grid-cols-3 gap-6 opacity-60">
        <div className="border border-white/5 bg-white/5 rounded-lg p-4 flex items-center space-x-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-mono text-slate-400">Question Bank Loaded</span>
        </div>
        <div className="border border-white/5 bg-white/5 rounded-lg p-4 flex items-center space-x-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse delay-75"></div>
          <span className="text-xs font-mono text-slate-400">Hardcoded Mode — Instant</span>
        </div>
        <div className="border border-white/5 bg-white/5 rounded-lg p-4 flex items-center space-x-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse delay-150"></div>
          <span className="text-xs font-mono text-slate-400">AES-256 Vault Ready</span>
        </div>
      </div>
    </div>
  )
}
