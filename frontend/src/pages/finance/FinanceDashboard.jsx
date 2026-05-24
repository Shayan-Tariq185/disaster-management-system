import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Loader2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import StatCard        from '../../components/ui/StatCard.jsx';
import BarChart        from '../../components/charts/BarChart.jsx';
import DoughnutChart   from '../../components/charts/DoughnutChart.jsx';
import { fmtCurrency } from '../../utils/formatters.js';
import { getFinanceSummary, getTransactions } from '../../api/finance.api.js';

export default function FinanceDashboard() {
    const [summary, setSummary] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [monthlyData, setMonthlyData] = useState({ labels: [], datasets: [] });
    const [typeDonut, setTypeDonut] = useState({ labels: [], datasets: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            setError('');
            setLoading(true);
            try {
                const [sumData, txData] = await Promise.all([
                    getFinanceSummary(),
                    getTransactions(),
                ]);
                setSummary(sumData || []);
                setTransactions(txData || []);

                const monthMap = {};
                (txData || []).forEach(t => {
                    const d = new Date(t.transactionDate);
                    const label = d.toLocaleString('en-US', { month: 'short' });
                    if (!monthMap[label]) monthMap[label] = { Donation: 0, Expense: 0, Procurement: 0 };
                    monthMap[label][t.transactionType] += Number(t.amount || 0);
                });
                const labels = Object.keys(monthMap);
                setMonthlyData({
                    labels,
                    datasets: [
                        { label:'Donations',   data: labels.map(l => monthMap[l].Donation),    backgroundColor:'#22c55e' },
                        { label:'Expenses',    data: labels.map(l => monthMap[l].Expense),     backgroundColor:'#ef4444' },
                        { label:'Procurement', data: labels.map(l => monthMap[l].Procurement), backgroundColor:'#f59e0b' },
                    ],
                });

                const totals = (txData || []).reduce((acc, t) => {
                    acc[t.transactionType] = (acc[t.transactionType] || 0) + Number(t.amount || 0);
                    return acc;
                }, {});
                setTypeDonut({
                    labels: ['Donations','Expenses','Procurement'],
                    datasets: [{
                        data: [totals.Donation || 0, totals.Expense || 0, totals.Procurement || 0],
                        backgroundColor: ['#22c55e','#ef4444','#f59e0b'],
                        borderWidth: 0,
                    }],
                });
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load finance data');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const totals = summary.reduce((acc, s) => {
        acc.donations += Number(s.totalDonations || 0);
        acc.expenses += Number(s.totalExpenses || 0);
        acc.procurement += Number(s.totalProcurement || 0);
        acc.net += Number(s.netBalance || 0);
        return acc;
    }, { donations: 0, expenses: 0, procurement: 0, net: 0 });

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div><h1 className="page-title">Finance Dashboard</h1><p className="page-subtitle">Donations, expenses and procurement tracking</p></div>
                {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {error}
                    </div>
                )}
                {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Total Donations"  value={fmtCurrency(totals.donations)} iconBg="bg-emerald-50" iconColor="text-emerald-600" icon={TrendingUp}   />
                    <StatCard title="Total Expenses"   value={fmtCurrency(totals.expenses)}  iconBg="bg-red-50"     iconColor="text-red-600"     icon={TrendingDown} />
                    <StatCard title="Procurement"      value={fmtCurrency(totals.procurement)} iconBg="bg-amber-50" iconColor="text-amber-600" icon={CreditCard} />
                    <StatCard title="Net Balance"      value={fmtCurrency(totals.net)} iconBg="bg-blue-50" iconColor="text-blue-600" icon={DollarSign} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="card lg:col-span-2">
                        <h2 className="text-sm font-semibold text-slate-700 mb-4">Monthly Financial Overview</h2>
                        <BarChart data={monthlyData} height={230} />
                    </div>
                    <div className="card">
                        <h2 className="text-sm font-semibold text-slate-700 mb-4">Transaction Breakdown</h2>
                        <DoughnutChart data={typeDonut} height={230} />
                    </div>
                </div>
                <div className="card">
                    <h2 className="text-sm font-semibold text-slate-700 mb-4">Event Financial Summary</h2>
                    <div className="space-y-3">
                        {summary.map(s => {
                            const total = Number(s.totalDonations || 0);
                            const spent = Number(s.totalExpenses || 0) + Number(s.totalProcurement || 0);
                            const pct = total > 0 ? Math.round((spent / total) * 100) : 0;
                            return (
                                <div key={s.eventID}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-medium text-slate-700">{s.eventName}</span>
                                        <span className="text-slate-400">{fmtCurrency(spent)} / {fmtCurrency(total)} ({pct}%)</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{width:`${pct}%`}} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}