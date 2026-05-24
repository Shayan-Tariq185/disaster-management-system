import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import DataTable       from '../../components/ui/DataTable.jsx';
import Badge           from '../../components/ui/Badge.jsx';
import { fmtDateTime } from '../../utils/formatters.js';
import { getAuditLogs } from '../../api/reports.api.js';

const ACTION_BADGE = {
    INSERT:  {bg:'bg-green-100',  text:'text-green-700'  },
    UPDATE:  {bg:'bg-blue-100',   text:'text-blue-700'   },
    DELETE:  {bg:'bg-red-100',    text:'text-red-700'    },
    APPROVE: {bg:'bg-purple-100', text:'text-purple-700' },
    REJECT:  {bg:'bg-orange-100', text:'text-orange-700' },
    LOGIN:   {bg:'bg-slate-100',  text:'text-slate-600'  },
};

export default function AuditLogs() {
    const [logs, setLogs]           = useState([]);
    const [loading, setLoading]     = useState(true);
    const [search, setSearch]       = useState('');
    const [filterAction, setFilter] = useState('ALL');

    const fetchLogs = async () => {
        try {
            const data = await getAuditLogs();
            setLogs(data);
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filtered = logs.filter(l =>
        (filterAction === 'ALL' || l.actionType === filterAction) &&
        ((l.userName || '').toLowerCase().includes(search.toLowerCase()) ||
            (l.tableAffected || '').toLowerCase().includes(search.toLowerCase()))
    );

    const columns = [
        { key:'logID',     label:'Log ID',   render: v => <span className="font-mono text-xs text-slate-400">LOG-{String(v).padStart(5,'0')}</span> },
        { key:'timestamp', label:'Timestamp',render: v => <span className="text-xs">{fmtDateTime(v)}</span> },
        { key:'userName',  label:'User',     render: v => <span className="font-medium">{v || 'System'}</span> },
        { key:'roleName',  label:'Role',     render: v => <span className="text-xs text-slate-400">{v || 'N/A'}</span> },
        { key:'actionType',label:'Action',   render: v => <Badge label={v} {...(ACTION_BADGE[v]||{})} /> },
        { key:'tableAffected', label:'Table', render: v => <span className="font-mono text-xs">{v}</span> },
        { key:'recordID',  label:'Record',   render: v => <span className="text-xs text-slate-400 text-center block">#{v}</span> },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-5">
                <div><h1 className="page-title">Audit Logs</h1><p className="page-subtitle">Full traceability of all system actions with timestamps</p></div>
                <div className="card">
                    <div className="flex flex-wrap gap-3 mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input value={search} onChange={e=>setSearch(e.target.value)} className="input pl-9 w-60" placeholder="Search user or entity…" />
                        </div>
                        {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-600 self-center" />}
                        <div className="flex gap-2 flex-wrap">
                            {['ALL','INSERT','UPDATE','DELETE','APPROVE','REJECT'].map(a => (
                                <button key={a} onClick={()=>setFilter(a)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors
                    ${filterAction===a?'bg-blue-600 text-white border-blue-600':'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                                    {a}
                                </button>
                            ))}
                        </div>
                    </div>
                    <DataTable columns={columns} data={filtered} />
                </div>
            </div>
        </DashboardLayout>
    );
}