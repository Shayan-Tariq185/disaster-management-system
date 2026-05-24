import { useEffect, useState } from 'react';
import { CheckSquare, XCircle, Clock, CheckCircle2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import StatCard        from '../../components/ui/StatCard.jsx';
import Badge           from '../../components/ui/Badge.jsx';
import Modal           from '../../components/ui/Modal.jsx';
import { APPROVAL_STATUS } from '../../utils/constants.js';
import { fmtDateTime }     from '../../utils/formatters.js';
import { useAuth }         from '../../context/AuthContext.jsx';
import { ROLES }           from '../../utils/constants.js';
import { getApprovals, processApproval } from '../../api/approvals.api.js';

export default function ApprovalWorkflow() {
    const { user } = useAuth();
    const isAdmin = user?.role === ROLES.ADMIN;
    const [tab, setTab]         = useState('pending');
    const [selected, setSelected] = useState(null);
    const [action,   setAction]   = useState('');
    const [reason,   setReason]   = useState('');
    const [loading,  setLoading]  = useState(false);
    const [rows,     setRows]     = useState([]);
    const [error,    setError]    = useState('');

    const fetchApprovals = async () => {
        setError('');
        try {
            const data = await getApprovals();
            setRows(data || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load approvals');
        }
    };

    useEffect(() => {
        fetchApprovals();
    }, []);

    const pending  = rows.filter(d => d.status === 'Pending');
    const history  = rows.filter(d => d.status !== 'Pending');
    const displayed = tab === 'pending' ? pending : history;

    const handleProcess = async () => {
        if (!selected) return;
        setLoading(true);
        setError('');
        try {
            await processApproval(selected.requestID, {
                action: action === 'approve' ? 'Approved' : 'Rejected',
                comments: reason || null,
            });
            await fetchApprovals();
            setSelected(null);
            setReason('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to process approval');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-5">
                <div><h1 className="page-title">Approval Workflow</h1><p className="page-subtitle">Review and process pending approval requests</p></div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Pending"  value={pending.length}                                   iconBg="bg-amber-50"   iconColor="text-amber-600"   icon={Clock}        />
                    <StatCard title="Approved" value={history.filter(d=>d.status==='Approved').length}  iconBg="bg-emerald-50" iconColor="text-emerald-600" icon={CheckCircle2} />
                    <StatCard title="Rejected" value={history.filter(d=>d.status==='Rejected').length}  iconBg="bg-red-50"     iconColor="text-red-600"     icon={XCircle}      />
                    <StatCard title="Total"    value={rows.length}                                       iconBg="bg-blue-50"    iconColor="text-blue-600"    icon={CheckSquare}  />
                </div>

                <div className="flex gap-4 border-b border-slate-200">
                    {[{id:'pending',label:`Pending (${pending.length})`},{id:'history',label:'History'}].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${tab===t.id?'border-blue-600 text-blue-600':'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {error}
                    </div>
                )}

                <div className="card">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr>{['#','Type','Reference','Requested By','Date','Status', isAdmin&&tab==='pending'?'Actions':null].filter(Boolean).map(h=><th key={h} className="th">{h}</th>)}</tr></thead>
                            <tbody>
                            {displayed.map(a => (
                                <tr key={a.requestID} className="tr">
                                    <td className="td font-mono text-xs text-slate-400">#{a.requestID}</td>
                                    <td className="td text-xs font-medium">{a.requestType || 'Request'}</td>
                                    <td className="td text-xs text-slate-600">
                                        {a.referenceType} #{a.referenceID}
                                    </td>
                                    <td className="td text-xs"><p>{a.requestedByName}</p><p className="text-slate-400">{a.requestedByRole}</p></td>
                                    <td className="td text-xs text-slate-400">{fmtDateTime(a.requestDate)}</td>
                                    <td className="td"><Badge label={a.status} {...(APPROVAL_STATUS[a.status]||{})} /></td>
                                    {isAdmin && tab === 'pending' && (
                                        <td className="td">
                                            <div className="flex gap-1">
                                                <button className="btn btn-success btn-sm" onClick={()=>{setSelected(a);setAction('approve');}}>Approve</button>
                                                <button className="btn btn-danger btn-sm"  onClick={()=>{setSelected(a);setAction('reject');}}>Reject</button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Modal isOpen={!!selected} onClose={()=>setSelected(null)} title={action==='approve'?'Confirm Approval':'Confirm Rejection'} size="sm">
                <div className="space-y-4">
                    <div className="p-3 bg-slate-50 rounded-lg text-sm">
                        <p className="font-medium text-slate-700">{selected?.requestType}</p>
                        <p className="text-slate-500 text-xs mt-0.5">
                            {selected?.referenceType} #{selected?.referenceID}
                        </p>
                    </div>
                    <div><label className="label">Reason / Notes</label>
                        <textarea rows={3} value={reason} onChange={e=>setReason(e.target.value)} className="input resize-none" placeholder="Optional comment…" />
                    </div>
                    <div className="flex gap-3">
                        <button className="btn-secondary flex-1" onClick={()=>setSelected(null)}>Cancel</button>
                        <button disabled={loading} onClick={handleProcess}
                                className={`flex-1 btn ${action==='approve'?'btn-success':'btn-danger'}`}>
                            {loading?'Processing…':action==='approve'?'Confirm Approval':'Confirm Rejection'}
                        </button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
}