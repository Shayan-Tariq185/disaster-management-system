import { useEffect, useState } from 'react';
import { AlertTriangle, Users, Package, CheckSquare, DollarSign, ScrollText, Loader2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import StatCard        from '../../components/ui/StatCard.jsx';
import BarChart        from '../../components/charts/BarChart.jsx';
import DoughnutChart   from '../../components/charts/DoughnutChart.jsx';
import LineChart       from '../../components/charts/LineChart.jsx';
import { fmtCurrency, fmtDateTime } from '../../utils/formatters.js';
import {
    getDashboardStats,
    getIncidentStats,
    getResourceReport,
    getResponseTimes,
    getAuditLogs,
} from '../../api/reports.api.js';

export default function AdminDashboard() {
    const [stats, setStats] = useState([]);
    const [trendData, setTrendData] = useState({ labels: [], datasets: [] });
    const [typeData, setTypeData] = useState({ labels: [], datasets: [] });
    const [resourceData, setResourceData] = useState({ labels: [], datasets: [] });
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            setError('');
            setLoading(true);
            try {
                const [dash, incidentStats, resourceStats, responseTimes, audit] = await Promise.all([
                    getDashboardStats(),
                    getIncidentStats(),
                    getResourceReport(),
                    getResponseTimes(),
                    getAuditLogs(),
                ]);

                setStats([
                    { title: 'Active Incidents',    value: dash.activeIncidents,  subtitle: `${dash.criticalIncidents} critical`, icon: AlertTriangle, iconBg: 'bg-red-50',     iconColor: 'text-red-600' },
                    { title: 'Rescue Teams Active', value: dash.activeTeams,       subtitle: 'Assigned/Busy',              icon: Users,         iconBg: 'bg-blue-50',    iconColor: 'text-blue-600' },
                    { title: 'Low Stock Alerts',    value: dash.lowStockAlerts,   subtitle: 'Need attention',              icon: Package,       iconBg: 'bg-orange-50',  iconColor: 'text-orange-600' },
                    { title: 'Pending Approvals',   value: dash.pendingApprovals, subtitle: 'Awaiting review',            icon: CheckSquare,   iconBg: 'bg-purple-50',  iconColor: 'text-purple-600' },
                    { title: 'Total Donations',     value: fmtCurrency(dash.donationsThisMonth), subtitle: 'This month',    icon: DollarSign,    iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
                    { title: 'Audit Events Today',  value: dash.auditEventsToday, subtitle: 'Last 24 hours',              icon: ScrollText,    iconBg: 'bg-amber-50',   iconColor: 'text-amber-600' },
                ]);

                const typeCounts = (incidentStats || []).reduce((acc, row) => {
                    acc[row.disasterType] = (acc[row.disasterType] || 0) + row.incidentCount;
                    return acc;
                }, {});
                const typeLabels = Object.keys(typeCounts);
                const typeValues = typeLabels.map(k => typeCounts[k]);
                setTypeData({
                    labels: typeLabels,
                    datasets: [{
                        data: typeValues,
                        backgroundColor: ['#3b82f6','#f59e0b','#ef4444','#10b981','#64748b'],
                        borderWidth: 0,
                    }],
                });

                const responseLabels = (responseTimes || []).map(r => r.week);
                const responseValues = (responseTimes || []).map(r => Number(r.avgMinutes || 0));
                setTrendData({
                    labels: responseLabels,
                    datasets: [{
                        label: 'Avg Response (mins)',
                        data: responseValues,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59,130,246,0.1)',
                        fill: true,
                        tension: 0.4,
                    }],
                });

                const resourceLabels = (resourceStats || []).map(r => r.resourceType);
                const available = (resourceStats || []).map(r => Number(r.available || 0));
                const deployed = (resourceStats || []).map(r => Math.max(0, Number(r.total || 0) - Number(r.available || 0)));
                setResourceData({
                    labels: resourceLabels,
                    datasets: [
                        { label: 'Available', data: available, backgroundColor: '#22c55e' },
                        { label: 'Deployed',  data: deployed,  backgroundColor: '#3b82f6' },
                    ],
                });

                setActivity((audit || []).slice(0, 5).map(a => ({
                    time: fmtDateTime(a.timestamp),
                    text: `${a.actionType} ${a.tableAffected} #${a.recordID || ''}`.trim(),
                    type: a.actionType === 'INSERT' ? 'bg-emerald-500'
                        : a.actionType === 'UPDATE' ? 'bg-blue-500'
                            : a.actionType === 'DELETE' ? 'bg-red-500'
                                : a.actionType === 'APPROVE' ? 'bg-emerald-500'
                                    : a.actionType === 'REJECT' ? 'bg-orange-500'
                                        : 'bg-slate-400',
                })));
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="page-header">
                    <h1 className="page-title">System Overview</h1>
                    <p className="page-subtitle">Real-time disaster response monitoring — Admin View</p>
                </div>

                {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {error}
                    </div>
                )}

                {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stats.map(s => <StatCard key={s.title} {...s} />)}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="card lg:col-span-2">
                        <h2 className="text-sm font-semibold text-slate-700 mb-4">Average Response Time</h2>
                        <LineChart data={trendData} />
                    </div>
                    <div className="card">
                        <h2 className="text-sm font-semibold text-slate-700 mb-4">Disaster Types</h2>
                        <DoughnutChart data={typeData} />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="card lg:col-span-2">
                        <h2 className="text-sm font-semibold text-slate-700 mb-4">Resource Status by Category</h2>
                        <BarChart data={resourceData} />
                    </div>
                    <div className="card">
                        <h2 className="text-sm font-semibold text-slate-700 mb-4">Recent Activity</h2>
                        <div className="space-y-3">
                            {activity.map((a, i) => (
                                <div key={i} className="flex items-start gap-2.5 pb-3 border-b border-slate-100 last:border-0">
                                    <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${a.type}`} />
                                    <div>
                                        <p className="text-xs text-slate-600 leading-snug">{a.text}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{a.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}