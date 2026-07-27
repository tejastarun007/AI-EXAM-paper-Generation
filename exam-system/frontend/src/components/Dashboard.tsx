import { Shield, Users, FileLock, Activity, Globe, CheckCircle2, AlertTriangle, Fingerprint, Lock } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function Dashboard() {
  const [stats, setStats] = useState({ active_sessions: 0, encrypted_papers: 0, security_alerts: 0, network_latency: '14ms' });
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch('/metrics/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);
    fetch('/metrics/audit-logs')
      .then(res => res.json())
      .then(data => setActivityLogs(data.slice(0, 8)))
      .catch(console.error);
  }, []);

  return (
    <div className="w-full max-w-[1200px] animate-fade-in-up pb-10">

      {/* Header */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="absolute inset-0 bg-[#4edea3]/40 rounded-full animate-ping" />
              <div className="relative w-2.5 h-2.5 bg-[#4edea3] rounded-full" />
            </div>
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-[#4edea3] uppercase">
              System Active \\ Live
            </span>
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-[#dfe2f1]">
            Security Overview
          </h2>
          <p className="text-[#8c909f] mt-2 text-sm font-medium">
            Real-time metrics and threat intelligence for the Secure Exam System.
          </p>
        </div>
        <div className="hidden md:flex flex-col items-end">
          <div className="text-[10px] text-[#8c909f] font-mono mb-1 tracking-widest">GLOBAL_CONSENSUS_HASH</div>
          <div className="px-3 py-1.5 rounded-lg text-xs font-mono text-[#adc6ff] border border-[#adc6ff]/20 bg-[#adc6ff]/5">
            0x9F4B...28EA
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard title="Active Sessions"   value={stats.active_sessions}   icon={<Users size={20} className="text-[#adc6ff]" />} trend="Live connections"      accent="#adc6ff" />
        <StatCard title="Encrypted Papers"  value={stats.encrypted_papers}  icon={<FileLock size={20} className="text-[#4edea3]" />} trend="All systems nominal" accent="#4edea3" />
        <StatCard title="Security Alerts"   value={stats.security_alerts}   icon={<Shield size={20} className={stats.security_alerts > 0 ? "text-[#ff5451]" : "text-[#adc6ff]"} />} trend={stats.security_alerts > 0 ? "Attention required" : "No breaches"} accent={stats.security_alerts > 0 ? "#ff5451" : "#adc6ff"} />
        <StatCard title="Network Latency"   value={stats.network_latency}   icon={<Activity size={20} className="text-[#4edea3]" />} trend="Optimal global routing" accent="#4edea3" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Node Network */}
        <div
          className="lg:col-span-2 rounded-2xl p-8 relative overflow-hidden flex flex-col"
          style={{
            background: 'rgba(23, 27, 38, 0.65)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(96, 184, 255, 0.15)',
            boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
          }}
        >
          {/* Glow orb */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#60b8ff]/10 blur-3xl pointer-events-none" />

          <div className="flex justify-between items-start mb-6 z-10">
            <h3 className="text-xl font-bold text-[#dfe2f1] tracking-wide">Node Consensus Network</h3>
            <div className="px-3 py-1 bg-[#4edea3]/10 border border-[#4edea3]/20 text-[#4edea3] text-[10px] font-bold rounded-full flex items-center gap-1.5 shadow-[0_0_10px_rgba(78,222,163,0.15)]">
              <CheckCircle2 size={11} />
              100% INTEGRITY
            </div>
          </div>

          <div className="flex-1 min-h-[300px] w-full relative flex items-center justify-center bg-[#0a0d14] rounded-xl border border-white/5 overflow-hidden shadow-inner">
            {/* Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(173,198,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(173,198,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
            {/* Radar rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[400px] h-[400px] rounded-full border border-[#60b8ff]/20 relative">
                <div className="absolute inset-0 rounded-full border border-[#60b8ff]/10 scale-75" />
                <div className="absolute inset-0 rounded-full border border-[#60b8ff]/05 scale-50" />
                <div className="w-1/2 h-full absolute top-0 left-1/2 origin-left bg-gradient-to-r from-[#60b8ff]/20 to-transparent animate-spin-slow blur-sm" />
              </div>
            </div>
            {/* Central node */}
            <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-br from-[#60b8ff]/30 to-[#adc6ff]/20 border-2 border-[#60b8ff] flex items-center justify-center shadow-[0_0_30px_rgba(96,184,255,0.5)]">
              <Globe className="text-[#adc6ff] animate-pulse w-8 h-8" />
            </div>
            <OrbitalNode top="20%" left="25%" delay="0s" />
            <OrbitalNode top="30%" left="75%" delay="1s" />
            <OrbitalNode top="80%" left="30%" delay="2s" />
            <OrbitalNode top="70%" left="80%" delay="1.5s" />
            <OrbitalNode top="50%" left="15%" delay="0.5s" />
          </div>
        </div>

        {/* Live Activity Feed */}
        <div
          className="rounded-2xl p-6 flex flex-col"
          style={{
            background: 'rgba(23, 27, 38, 0.65)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(96, 184, 255, 0.15)',
            boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
          }}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-[#dfe2f1] tracking-wide">Live Activity</h3>
            <span className="text-[10px] uppercase font-bold text-[#8c909f] tracking-widest">Real-Time</span>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {activityLogs.length > 0 ? activityLogs.map((log: any, i: number) => (
              <ActivityRow
                key={i}
                user={log.admin}
                action={log.details}
                time={log.time}
                status={log.type}
                icon={log.type === 'AUTH' ? <Fingerprint size={15} /> : log.type === 'DENY' ? <AlertTriangle size={15} /> : log.type === 'SYS' ? <Activity size={15} /> : log.type === 'ANCHOR' ? <Globe size={15} /> : <Lock size={15} />}
              />
            )) : (
              <div className="text-[#8c909f] text-sm italic py-4">No recent activity detected.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, trend, accent }: any) {
  return (
    <div
      className="group rounded-2xl p-6 relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: 'rgba(23, 27, 38, 0.65)',
        backdropFilter: 'blur(24px)',
        border: `1px solid rgba(96, 184, 255, 0.15)`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = `${accent}33`)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(96,184,255,0.15)')}
    >
      {/* Glow blob */}
      <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-opacity duration-300"
        style={{ background: `${accent}18` }} />

      <div className="flex justify-between items-start mb-5 relative z-10">
        <div className="p-2.5 rounded-xl border bg-[#0a0e18]" style={{ borderColor: `${accent}25` }}>
          {icon}
        </div>
        <div className="text-[10px] font-bold px-2 py-1 rounded-md" style={{ color: accent, background: `${accent}15` }}>
          {trend}
        </div>
      </div>
      <div className="relative z-10">
        <h4 className="text-4xl font-black text-[#dfe2f1] mb-1 tracking-tight">{value}</h4>
        <div className="text-xs text-[#8c909f] font-semibold tracking-widest uppercase">{title}</div>
      </div>
    </div>
  )
}

function OrbitalNode({ top, left, delay }: { top: string, left: string, delay: string }) {
  return (
    <div className="absolute w-3 h-3 bg-[#4edea3] rounded-full shadow-[0_0_15px_rgba(78,222,163,0.8)]" style={{ top, left }}>
      <div className="absolute inset-0 bg-[#4edea3] rounded-full animate-ping" style={{ animationDelay: delay }} />
    </div>
  )
}

function ActivityRow({ user, action, time, status, icon }: any) {
  const colorMap: Record<string, string> = {
    Warn:    'text-orange-400 bg-orange-400/10 border-orange-400/20',
    Sys:     'text-[#adc6ff] bg-[#adc6ff]/10 border-[#adc6ff]/20',
    Net:     'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
    default: 'text-[#4edea3] bg-[#4edea3]/10 border-[#4edea3]/20',
  }
  const cls = colorMap[status] ?? colorMap.default

  // Format raw Unix timestamp (seconds, possibly decimal) → readable string
  const formatTime = (raw: any): string => {
    const ts = parseFloat(raw)
    if (!raw || isNaN(ts)) return String(raw ?? '')
    // Timestamps > 1e11 are already in ms, otherwise they're in seconds
    const ms = ts > 1e11 ? ts : ts * 1000
    const d = new Date(ms)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const mon = d.toLocaleString('en', { month: 'short' })
    return `${hh}:${mm}:${ss} · ${day} ${mon}`
  }

  return (
    <div className="flex items-start gap-3 group cursor-pointer hover:bg-white/5 p-2.5 -mx-2.5 rounded-xl transition-colors">
      <div className={`mt-0.5 p-2 rounded-lg border ${cls} shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <div className="text-sm font-bold text-[#dfe2f1] truncate">{user}</div>
          <div className="text-[10px] text-[#adc6ff] font-mono ml-2 shrink-0 tabular-nums">{formatTime(time)}</div>
        </div>
        <div className="text-xs text-[#8c909f] truncate">{action}</div>
      </div>
    </div>
  )
}
