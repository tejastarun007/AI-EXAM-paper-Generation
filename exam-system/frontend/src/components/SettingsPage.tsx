import { Settings, Shield, User, Lock, Database } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="w-full max-w-[1000px] flex-1 flex flex-col justify-start pt-8">
      <div className="flex items-center space-x-3 mb-8">
        <Settings size={28} className="text-[#60b8ff]" />
        <h1 className="text-2xl font-bold tracking-tight text-white">System Settings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0a0d14]/80 border border-[#2e374a] rounded-xl p-6 shadow-lg">
          <div className="flex items-center space-x-3 mb-4">
            <User className="text-[#4edea3]" size={20} />
            <h2 className="text-lg font-semibold text-white">Profile</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[#8c909f] uppercase font-bold">Display Name</label>
              <input type="text" defaultValue="Lecturer Session" className="mt-1 w-full bg-[#151a27] border border-[#2e374a] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#60b8ff]" />
            </div>
            <div>
              <label className="text-xs text-[#8c909f] uppercase font-bold">Email Address</label>
              <input type="email" defaultValue="lecturer@examvault.sys" className="mt-1 w-full bg-[#151a27] border border-[#2e374a] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#60b8ff]" />
            </div>
            <button className="bg-[#60b8ff]/10 hover:bg-[#60b8ff]/20 text-[#60b8ff] border border-[#60b8ff]/20 px-4 py-2 rounded text-sm font-semibold transition-colors">
              Update Profile
            </button>
          </div>
        </div>

        <div className="bg-[#0a0d14]/80 border border-[#2e374a] rounded-xl p-6 shadow-lg">
          <div className="flex items-center space-x-3 mb-4">
            <Lock className="text-[#adc6ff]" size={20} />
            <h2 className="text-lg font-semibold text-white">Security</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#dfe2f1]">Two-Factor Authentication</span>
              <span className="px-2 py-1 bg-[#4edea3]/20 text-[#4edea3] text-[10px] rounded uppercase font-bold">Enabled</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#dfe2f1]">Session Timeout</span>
              <select className="bg-[#151a27] border border-[#2e374a] rounded px-2 py-1 text-sm text-white focus:outline-none">
                <option>15 Minutes</option>
                <option>30 Minutes</option>
                <option>1 Hour</option>
              </select>
            </div>
            <button className="w-full bg-[#151a27] hover:bg-[#1f2638] border border-[#2e374a] text-white px-4 py-2 rounded text-sm font-semibold transition-colors mt-2">
              Change Password
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
