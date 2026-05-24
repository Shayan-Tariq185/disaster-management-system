import { useEffect, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import DashboardLayout  from '../../components/layout/DashboardLayout.jsx';
import DataTable        from '../../components/ui/DataTable.jsx';
import Badge            from '../../components/ui/Badge.jsx';
import Modal            from '../../components/ui/Modal.jsx';
import FinanceEntryForm from '../../components/forms/FinanceEntryForm.jsx';
import { TX_TYPE }      from '../../utils/constants.js';
import { fmtCurrency, fmtDateTime } from '../../utils/formatters.js';
import { getTransactions } from '../../api/finance.api.js';

export default function FinanceManagement() {
    const [filterType, setFilterType] = useState('ALL');
    const [showModal,  setShowModal]  = useState(false);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchTransactions = async () => {
        setError('');
        setLoading(true);
        try {
            const data = await getTransactions();
            setRows(data || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load transactions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    const displayed = filterType === 'ALL'
        ? rows
        : rows.filter(d => d.transactionType === filterType);

    const columns = [
        { key:'transactionID', label:'#', render: v => <span className="font-mono text-xs text-slate-400">TX-{String(v).padStart(3,'0')}</span> },
        { key:'transactionType', label:'Type', render: v => <Badge label={v} {...(TX_TYPE[v]||{})} /> },
        { key:'amount', label:'Amount', render: (v, r) => (
            <span className={`font-semibold ${r.transactionType==='Donation'?'text-emerald-600':'text-red-600'}`}>
                {r.transactionType==='Donation'?'+':'-'}{fmtCurrency(v)}
            </span>
            )},
        { key:'referenceID', label:'Source / Payee', render: v => <span className="text-xs text-slate-500">Ref #{v}</span> },
        { key:'eventName',  label:'Event',  render: v => <span className="text-xs text-slate-500">{v}</span> },
        { key:'transactionDate', label:'Date', render: v => <span className="text-xs text-slate-400">{fmtDateTime(v)}</span> },
        { key:'recordedByName', label:'Recorded By' },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div><h1 className="page-title">Financial Ledger</h1><p className="page-subtitle">All transactions — donations, expenses, procurement</p></div>
                    <button className="btn-primary" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> New Entry</button>
                </div>
                <div className="card">
                    <div className="flex gap-2 mb-4 flex-wrap">
                        {['ALL','Donation','Expense','Procurement'].map(f => (
                            <button key={f} onClick={() => setFilterType(f)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors
                  ${filterType===f?'bg-blue-600 text-white border-blue-600':'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                                {f}
                            </button>
                        ))}
                        {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-600 self-center" />}
                    </div>
                    {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
                    <DataTable columns={columns} data={displayed} />
                </div>
            </div>
            <Modal isOpen={showModal} onClose={()=>setShowModal(false)} title="Record Financial Transaction">
                <FinanceEntryForm onSuccess={()=>{setShowModal(false); fetchTransactions();}} onCancel={()=>setShowModal(false)} />
            </Modal>
        </DashboardLayout>
    );
}