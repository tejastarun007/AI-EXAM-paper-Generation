import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Vault from './components/Vault'
import Dashboard from './components/Dashboard'
import AuditTrail from './components/AuditTrail'
import SessionControl from './components/SessionControl'
import LiveLogs from './components/LiveLogs'
import GlassBreak from './components/GlassBreak'
import Login from './components/Login'
import Generator from './components/Generator'
import SettingsPage from './components/SettingsPage'
import SupportPage from './components/SupportPage'
import { Lock, Bell, User } from 'lucide-react'

function App() {
  const [activePage, setActivePage] = useState('login')
  const [vaultPaperId, setVaultPaperId] = useState<string | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  if (activePage === 'login') {
    return <Login onLoginSuccess={() => setActivePage('dashboard')} />
  }

  // Navigate to Vault with a specific paper ID (called from Generator)
  const goToVault = (paperId: string) => {
    setVaultPaperId(paperId)
    setActivePage('vault')
  }

  return (
    <div className="flex h-screen bg-[#0f131d] text-[#dfe2f1] font-sans overflow-hidden">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main className="flex-1 flex flex-col items-center px-8 py-6 relative overflow-y-auto">
        
        {/* Top Nav */}
        <header className="w-full flex justify-between items-center mb-10 max-w-[1200px]">
          <div className="flex space-x-1 text-sm font-semibold tracking-wide">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'audit',     label: 'Logs' },
              { id: 'vault',     label: 'Vault' },
              { id: 'sessions',  label: 'Users' },
              { id: 'generator', label: 'AI Gen' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActivePage(id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activePage === id
                    ? 'bg-gradient-to-r from-[#3b82f6]/20 to-[#10b981]/20 text-[#adc6ff] border border-[#3b82f6]/30'
                    : 'text-[#8c909f] hover:text-[#dfe2f1] hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center space-x-3">
            <div className="glass flex items-center gap-1.5 px-3 py-1.5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-[#4edea3] tracking-widest uppercase">Encrypted</span>
            </div>
            <div className="relative">
              <div onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false) }} className="hover:text-[#adc6ff] cursor-pointer transition-colors text-[#8c909f]">
                <Bell size={18} />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-[#0f131d]"></span>
              </div>
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-64 bg-[#0a0d14] border border-[#2e374a] rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#2e374a] font-semibold text-sm text-white bg-[#151a27]">Notifications</div>
                  <div className="p-4 text-xs text-[#8c909f]">
                    <div className="mb-3 pb-3 border-b border-[#2e374a]/50">
                      <span className="text-[#4edea3] font-semibold block mb-1">System Alert</span>
                      Vault cryptographic sync completed successfully.
                    </div>
                    <div>
                      <span className="text-red-400 font-semibold block mb-1">Security Event</span>
                      Unauthorized access attempt blocked from IP 192.168.1.42.
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="relative">
              <div onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false) }} className="hover:text-[#adc6ff] cursor-pointer transition-colors text-[#8c909f]">
                <User size={18} />
              </div>
              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-40 bg-[#0a0d14] border border-[#2e374a] rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                  <button onClick={() => { setShowUserMenu(false); setActivePage('login') }} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition-colors font-medium">
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Rendering */}
        <div className="w-full flex-1 flex flex-col items-center">
          {activePage === 'dashboard' && <Dashboard />}
          {activePage === 'vault' && (
            <div className="w-full max-w-[1000px] flex-1 flex flex-col justify-center">
              <Vault initialPaperId={vaultPaperId} unlockSlot={100} currentSlot={100} />
            </div>
          )}
          {activePage === 'sessions' && <SessionControl />}
          {activePage === 'audit' && <AuditTrail />}
          {activePage === 'health' && (
            <div className="w-full max-w-[1000px] flex justify-center items-center h-full">
              <LiveLogs />
            </div>
          )}
          {activePage === 'generator' && <Generator onGoToVault={goToVault} />}
          {activePage === 'glassbreak' && <GlassBreak />}
          {activePage === 'settings' && <SettingsPage />}
          {activePage === 'support' && <SupportPage />}
        </div>
      </main>
    </div>
  )
}

export default App
