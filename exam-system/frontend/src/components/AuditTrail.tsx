import { Search, Filter, Download } from 'lucide-react'

import { useEffect, useState } from 'react'

export default function AuditTrail() {
  const [logs, setLogs] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAnchor, setFilterAnchor] = useState(false)

  useEffect(() => {
    fetch('/metrics/audit-logs')
      .then(res => res.json())
      .then(data => setLogs(data))
      .catch(err => console.error("Error fetching logs:", err))
  }, [])

  const handleExportCSV = () => {
    const headers = ['Event ID', 'Type', 'Actor', 'Details', 'Tx Hash', 'Timestamp']
    const csvContent = [
      headers.join(','),
      ...logs.map(log => 
        `"${log.id}","${log.type}","${log.admin}","${log.details.replace(/"/g, '""')}","${log.hash}","${new Date(log.time).toISOString()}"`
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'audit_trail.csv'
    link.click()
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      log.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterAnchor ? log.type === 'ANCHOR' : true
    
    return matchesSearch && matchesFilter
  })

  return (
    <div className="w-full max-w-[1000px] animate-fade-in-up">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Audit Trail</h2>
          <p className="text-slate-400 mt-1">Immutable cryptographic log of all system events.</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setFilterAnchor(!filterAnchor)}
            className={`flex items-center space-x-2 px-4 py-2 border rounded-md text-sm transition-colors ${filterAnchor ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-[#111520] border-[#1e2434] text-slate-300 hover:text-white'}`}>
            <Filter size={16} /> <span>{filterAnchor ? 'Anchors Only' : 'Filter'}</span>
          </button>
          <button 
            onClick={handleExportCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-md text-sm text-primary hover:bg-primary/20 transition-colors">
            <Download size={16} /> <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-[#111520] border border-[#1e2434] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#1e2434] bg-[#0d1017] flex items-center">
          <Search size={18} className="text-slate-500 mr-3" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID, Address, or Event Hash..." 
            className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-slate-600"
          />
        </div>
        
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1e2434] bg-[#0a0d14] text-xs uppercase tracking-widest text-slate-500">
              <th className="p-4 font-semibold">Event ID</th>
              <th className="p-4 font-semibold">Type</th>
              <th className="p-4 font-semibold">Actor / Admin</th>
              <th className="p-4 font-semibold">Details</th>
              <th className="p-4 font-semibold">Tx Hash</th>
              <th className="p-4 font-semibold">Timestamp</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-300">
            {filteredLogs.map((log: any, i: number) => (
              <tr key={i} className="border-b border-[#1e2434] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="p-4 font-mono text-xs text-slate-400">{log.id}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase ${
                    log.type === 'DENY' ? 'bg-red-500/10 text-red-400' :
                    log.type === 'AUTH' ? 'bg-blue-500/10 text-blue-400' :
                    log.type === 'ANCHOR' ? 'bg-indigo-500/10 text-indigo-400' :
                    'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {log.type}
                  </span>
                </td>
                <td className="p-4 font-mono text-xs text-slate-400">{log.admin}</td>
                <td className="p-4">{log.details}</td>
                <td className="p-4 font-mono text-xs">
                  {log.type === 'ANCHOR' ? (
                    <a 
                      href={`https://preprod.cardanoscan.io/transaction/${log.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 hover:underline underline-offset-2 transition-colors font-bold"
                    >
                      {log.display_hash || 'Pending'}
                    </a>
                  ) : (
                    <a 
                      href={`https://preprod.cardanoscan.io/transaction/${log.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 hover:text-slate-400 hover:underline underline-offset-2 transition-colors cursor-help"
                      title="This is an internal un-anchored database hash"
                    >
                      {log.display_hash || 'Pending'}
                    </a>
                  )}
                </td>
                <td className="p-4 text-slate-500">{new Date(log.time).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
