import { useEffect, useState } from 'react';
import DashboardLayout  from '../../components/layout/DashboardLayout.jsx';
import BarChart         from '../../components/charts/BarChart.jsx';
import LineChart        from '../../components/charts/LineChart.jsx';
import DoughnutChart    from '../../components/charts/DoughnutChart.jsx';
import AreaChart        from '../../components/charts/AreaChart.jsx';
import { getIncidents } from '../../api/incidents.api.js';
import {
    getIncidentsByProvince,
    getIncidentStats,
    getResponseTimes,
    getResourceReport,
} from '../../api/reports.api.js';
import { getApprovals } from '../../api/approvals.api.js';

export default function MISReports() {
    const [incidentByProvince, setIncidentByProvince] = useState({ labels: [], datasets: [] });
    const [responseTime, setResponseTime] = useState({ labels: [], datasets: [] });
    const [resourceUtil, setResourceUtil] = useState({ labels: [], datasets: [] });
    const [sevDist, setSevDist] = useState({ labels: [], datasets: [] });
    const [approvalData, setApprovalData] = useState({ labels: [], datasets: [] });
    const [kpi, setKpi] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            setError('');
            try {
                const [incidents, byProvince, stats, resp, resource, approvals] = await Promise.all([
                    getIncidents(),
                    getIncidentsByProvince(),
                    getIncidentStats(),
                    getResponseTimes(),
                    getResourceReport(),
                    getApprovals(),
                ]);

                const provLabels = (byProvince || []).map(r => r.location);
                const provCounts = (byProvince || []).map(r => r.total);
                const palette = ['#3b82f6','#8b5cf6','#f59e0b','#ef4444','#22c55e','#06b6d4','#ec4899','#14b8a6','#f97316','#a855f7'];
                setIncidentByProvince({
                    labels: provLabels,
                    datasets: [{
                        label: 'Incidents',
                        data: provCounts,
                        backgroundColor: provLabels.map((_, i) => palette[i % palette.length]),
                    }],
                });

                const sevCounts = (stats || []).reduce((acc, row) => {
                    acc[row.severityLevel] = (acc[row.severityLevel] || 0) + row.incidentCount;
                    return acc;
                }, {});
                const sevLabels = ['Critical','High','Medium','Low'];
                setSevDist({
                    labels: sevLabels,
                    datasets: [{
                        data: sevLabels.map(l => sevCounts[l] || 0),
                        backgroundColor: ['#ef4444','#f97316','#eab308','#22c55e'],
                        borderWidth: 0,
                    }],
                });

                setResponseTime({
                    labels: (resp || []).map(r => r.week),
                    datasets: [{
                        label: 'Avg Response (min)',
                        data: (resp || []).map(r => Number(r.avgMinutes || 0)),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59,130,246,0.1)',
                        fill: true,
                        tension: 0.4,
                    }],
                });

                const resLabels = (resource || []).map(r => r.resourceType);
                const utilized = (resource || []).map(r => {
                    const total = Number(r.total || 0);
                    const available = Number(r.available || 0);
                    return total > 0 ? Math.round(((total - available) / total) * 100) : 0;
                });
                const remaining = utilized.map(u => 100 - u);
                setResourceUtil({
                    labels: resLabels,
                    datasets: [
                        { label: 'Utilized %', data: utilized, backgroundColor: '#3b82f6' },
                        { label: 'Remaining %', data: remaining, backgroundColor: '#e2e8f0' },
                    ],
                });

                const typeMap = (approvals || []).reduce((acc, row) => {
                    const type = row.requestType || 'Other';
                    if (!acc[type]) acc[type] = { Approved: 0, Rejected: 0, Pending: 0 };
                    acc[type][row.status] = (acc[type][row.status] || 0) + 1;
                    return acc;
                }, {});
                const typeLabels = Object.keys(typeMap);
                setApprovalData({
                    labels: typeLabels,
                    datasets: [
                        { label: 'Approved', data: typeLabels.map(t => typeMap[t].Approved || 0), backgroundColor: '#22c55e' },
                        { label: 'Rejected', data: typeLabels.map(t => typeMap[t].Rejected || 0), backgroundColor: '#ef4444' },
                        { label: 'Pending',  data: typeLabels.map(t => typeMap[t].Pending  || 0), backgroundColor: '#f59e0b' },
                    ],
                });

                const avgResponse = (resp || []).length
                    ? Math.round((resp || []).reduce((s, r) => s + Number(r.avgMinutes || 0), 0) / resp.length)
                    : 0;
                const avgUtil = utilized.length
                    ? Math.round(utilized.reduce((s, v) => s + v, 0) / utilized.length)
                    : 0;
                const approved = (approvals || []).filter(a => a.status === 'Approved').length;
                const rejected = (approvals || []).filter(a => a.status === 'Rejected').length;
                const approvalRate = approved + rejected > 0
                    ? Math.round((approved / (approved + rejected)) * 100)
                    : 0;

                setKpi([
                    { label:'Total Incidents',     value: String((incidents || []).length), sub: 'This period' },
                    { label:'Avg Response Time',   value: `${avgResponse} min`, sub: 'Average across weeks' },
                    { label:'Resource Efficiency', value: `${avgUtil}%`, sub: 'Utilization rate' },
                    { label:'Approval Rate',       value: `${approvalRate}%`, sub: 'Requests approved' },
                ]);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load MIS reports');
            }
        };

        load();
    }, []);
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div><h1 className="page-title">MIS Reports & Analytics</h1><p className="page-subtitle">Comprehensive disaster response performance dashboard</p></div>
                    <div className="flex gap-2">
                        <select className="select text-sm w-36">
                            <option>Last 7 days</option><option>Last 30 days</option><option>Last 3 months</option>
                        </select>
                        <button className="btn-secondary text-sm">Export PDF</button>
                    </div>
                </div>

                {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {kpi.map(k => (
                        <div key={k.label} className="card text-center">
                            <p className="text-3xl font-bold text-blue-600">{k.value}</p>
                            <p className="text-sm font-medium text-slate-700 mt-1">{k.label}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="card lg:col-span-2">
                        <h2 className="text-sm font-semibold text-slate-700 mb-4">Incidents by Province</h2>
                        <BarChart data={incidentByProvince} height={200} />
                    </div>
                    <div className="card">
                        <h2 className="text-sm font-semibold text-slate-700 mb-4">Severity Distribution</h2>
                        <DoughnutChart data={sevDist} height={200} />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="card">
                        <h2 className="text-sm font-semibold text-slate-700 mb-4">Response Time Trend (min)</h2>
                        <AreaChart data={responseTime} height={180} />
                    </div>
                    <div className="card">
                        <h2 className="text-sm font-semibold text-slate-700 mb-4">Approval Workflow Summary</h2>
                        <BarChart data={approvalData} height={180}
                                  options={{ scales:{ x:{ stacked:true, grid:{display:false} }, y:{ stacked:true } } }} />
                    </div>
                </div>

                <div className="card">
                    <h2 className="text-sm font-semibold text-slate-700 mb-4">Resource Utilization by Category (%)</h2>
                    <BarChart data={resourceUtil} height={160}
                              options={{ indexAxis:'y', scales:{ x:{ stacked:true, max:100, grid:{color:'#f1f5f9'} }, y:{ stacked:true, grid:{display:false} } } }} />
                </div>
            </div>
        </DashboardLayout>
    );
}