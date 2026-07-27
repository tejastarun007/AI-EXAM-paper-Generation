import { HelpCircle, Mail, MessageSquare, Book } from 'lucide-react'

export default function SupportPage() {
  return (
    <div className="w-full max-w-[1000px] flex-1 flex flex-col justify-start pt-8">
      <div className="flex items-center space-x-3 mb-8">
        <HelpCircle size={28} className="text-[#60b8ff]" />
        <h1 className="text-2xl font-bold tracking-tight text-white">Help & Support</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#0a0d14]/80 border border-[#2e374a] rounded-xl p-6 text-center hover:bg-[#151a27] transition-colors cursor-pointer group">
          <Book className="mx-auto mb-4 text-[#8c909f] group-hover:text-[#60b8ff]" size={32} />
          <h3 className="text-lg font-semibold text-white mb-2">Documentation</h3>
          <p className="text-xs text-[#8c909f]">Read the system manuals and integration guides.</p>
        </div>

        <div className="bg-[#0a0d14]/80 border border-[#2e374a] rounded-xl p-6 text-center hover:bg-[#151a27] transition-colors cursor-pointer group">
          <MessageSquare className="mx-auto mb-4 text-[#8c909f] group-hover:text-[#60b8ff]" size={32} />
          <h3 className="text-lg font-semibold text-white mb-2">Live Chat</h3>
          <p className="text-xs text-[#8c909f]">Speak with a support representative immediately.</p>
        </div>

        <div className="bg-[#0a0d14]/80 border border-[#2e374a] rounded-xl p-6 text-center hover:bg-[#151a27] transition-colors cursor-pointer group">
          <Mail className="mx-auto mb-4 text-[#8c909f] group-hover:text-[#60b8ff]" size={32} />
          <h3 className="text-lg font-semibold text-white mb-2">Email Support</h3>
          <p className="text-xs text-[#8c909f]">Send us an email for non-urgent technical issues.</p>
        </div>
      </div>

      <div className="bg-[#0a0d14]/80 border border-[#2e374a] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Submit a Ticket</h2>
        <form className="space-y-4">
          <div>
            <label className="text-xs text-[#8c909f] uppercase font-bold block mb-1">Issue Subject</label>
            <input type="text" placeholder="Brief description of the issue" className="w-full bg-[#151a27] border border-[#2e374a] rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-[#60b8ff]" />
          </div>
          <div>
            <label className="text-xs text-[#8c909f] uppercase font-bold block mb-1">Details</label>
            <textarea rows={4} placeholder="Provide all relevant details..." className="w-full bg-[#151a27] border border-[#2e374a] rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-[#60b8ff]"></textarea>
          </div>
          <button type="button" onClick={() => alert('Support ticket submitted successfully.')} className="bg-[#60b8ff]/10 hover:bg-[#60b8ff]/20 text-[#60b8ff] border border-[#60b8ff]/20 px-6 py-2 rounded text-sm font-semibold transition-colors">
            Submit Ticket
          </button>
        </form>
      </div>
    </div>
  )
}
