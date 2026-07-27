import { Shield, FileText, Clock, History, Activity, Settings, HelpCircle, ShieldAlert } from 'lucide-react'

export default function Sidebar({ activePage, setActivePage }: any) {
  return (
    <aside className="w-64 flex flex-col justify-between hidden md:flex"
      style={{
        background: 'rgba(15, 19, 29, 0.9)',
        backdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(96, 184, 255, 0.15)',
      }}>
      <div>
        {/* Logo */}
        <div className="px-6 py-6 border-b border-[rgba(96,184,255,0.1)]">
          <div className="flex items-center gap-3">
            {/* Shield SVG logo matching login page */}
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#60b8ff] to-[#adc6ff] flex items-center justify-center shadow-[0_0_20px_rgba(96,184,255,0.5)] shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L4 6v6c0 5.52 3.48 10.68 8 12 4.52-1.32 8-6.48 8-12V6L12 2z" fill="white" fillOpacity="0.95" />
                <path d="M9.5 16.5L6 13l1.5-1.5 2 2 5-5L16 10l-6.5 6.5z" fill="#0f131d" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tighter text-[#dfe2f1]">ExamVault</span>
          </div>
          {/* Blue-to-green gradient line under logo */}
          <div className="mt-4 h-px bg-gradient-to-r from-[#60b8ff]/40 via-[#adc6ff]/30 to-transparent rounded-full" />
        </div>

        {/* Avatar */}
        <div className="px-6 py-5 flex items-center space-x-3">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-700 flex items-center justify-center shadow-[0_0_18px_rgba(99,102,241,0.5)] border border-indigo-400/30 overflow-hidden">
              <img src="https://api.dicebear.com/9.x/notionists/svg?seed=Kingston" alt="avatar" className="w-full h-full object-cover" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#4edea3] border-2 border-[#0f131d] rounded-full shadow-[0_0_6px_rgba(78,222,163,0.8)]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[#dfe2f1]">Lecturer Session</div>
            <div className="text-[10px] text-indigo-400 font-mono font-bold tracking-widest uppercase">Level 4 Clearance</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="space-y-0.5 px-3">
          <NavItem id="dashboard" icon={<Shield size={17} />}   label="Security Overview" active={activePage === 'dashboard'} onClick={() => setActivePage('dashboard')} />
          <NavItem id="vault"     icon={<FileText size={17} />} label="Paper Management"  active={activePage === 'vault'}     onClick={() => setActivePage('vault')} />
          <NavItem id="generator" icon={<FileText size={17} />} label="AI Exam Generator" active={activePage === 'generator'} onClick={() => setActivePage('generator')} />
          <NavItem id="sessions"  icon={<Clock size={17} />}    label="Session Control"   active={activePage === 'sessions'}  onClick={() => setActivePage('sessions')} />
          <NavItem id="audit"     icon={<History size={17} />}  label="Audit Trail"       active={activePage === 'audit'}     onClick={() => setActivePage('audit')} />
          <NavItem id="health"    icon={<Activity size={17} />} label="System Health"     active={activePage === 'health'}    onClick={() => setActivePage('health')} />
        </nav>
      </div>

      {/* Bottom */}
      <div className="p-4 space-y-0.5 border-t border-[rgba(96,184,255,0.1)]">
        <NavItem id="settings" icon={<Settings size={17} />} label="Settings" active={activePage === 'settings'} onClick={() => setActivePage('settings')} />
        <NavItem id="support" icon={<HelpCircle size={17} />} label="Support" active={activePage === 'support'} onClick={() => setActivePage('support')} />
        <button
          onClick={() => setActivePage('glassbreak')}
          className="w-full mt-3 bg-red-950/20 text-[#ff5451] border border-red-900/30 rounded-xl py-2.5 text-xs font-bold tracking-widest hover:bg-red-900/30 transition-colors uppercase flex items-center justify-center space-x-2 shadow-[0_0_12px_rgba(255,84,81,0.1)]"
        >
          <ShieldAlert size={15} /> <span>Emergency Override</span>
        </button>
      </div>
    </aside>
  )
}

function NavItem({ icon, label, active = false, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${active
          ? 'bg-gradient-to-r from-[#60b8ff]/15 to-[#adc6ff]/10 text-[#adc6ff] border border-[#60b8ff]/25 shadow-[0_0_12px_rgba(96,184,255,0.1)]'
          : 'text-[#8c909f] hover:text-[#dfe2f1] hover:bg-white/5'
        }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
      {active && <div className="ml-auto w-1 h-1 rounded-full bg-[#4edea3]" />}
    </div>
  )
}
