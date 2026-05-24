import { useEffect, useState } from 'react';
import { Users, UserCheck, Activity, CheckCircle2, Loader2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import StatCard        from '../../components/ui/StatCard.jsx';
import Badge           from '../../components/ui/Badge.jsx';
import { TEAM_STATUS } from '../../utils/constants.js';
import { getTeams, getAssignments } from '../../api/rescue.api.js';
import { fmtDateTime } from '../../utils/formatters.js';

export default function FieldDashboard() {
    const [teams, setTeams] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            setError('');
            setLoading(true);
            try {
                const [teamData, assignData] = await Promise.all([
                    getTeams(),
                    getAssignments(),
                ]);
                setTeams(teamData || []);
                setAssignments(assignData || []);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load field data');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const counts = teams.reduce((a,t)=>({...a,[t.availabilityStatus]:(a[t.availabilityStatus]||0)+1}),{});
    const recent = [...assignments]
        .sort((a,b) => new Date(b.assignedAt || 0) - new Date(a.assignedAt || 0))
        .slice(0, 5);
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div><h1 className="page-title">Field Operations</h1><p className="page-subtitle">Rescue team coordination and deployment status</p></div>
                {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {error}
                    </div>
                )}
                {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Available" value={counts.Available||0} iconBg="bg-emerald-50" iconColor="text-emerald-600" icon={Users} />
                    <StatCard title="Assigned"  value={counts.Assigned||0}  iconBg="bg-blue-50"    iconColor="text-blue-600"    icon={UserCheck} />
                    <StatCard title="On Mission" value={counts.Busy||0}     iconBg="bg-orange-50"  iconColor="text-orange-600"  icon={Activity} />
                    <StatCard title="Completed" value={counts.Completed||0} iconBg="bg-slate-50"   iconColor="text-slate-600"   icon={CheckCircle2} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="card">
                        <h2 className="text-sm font-semibold text-slate-700 mb-4">Team Status Overview</h2>
                        <div className="space-y-2">
                            {teams.map(t => (
                                <div key={t.teamID} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600">{t.teamName[0]}</div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">{t.teamName}</p>
                                            <p className="text-xs text-slate-400">{t.teamType} · {t.currentLocation}</p>
                                        </div>
                                    </div>
                                    <Badge label={t.availabilityStatus} {...(TEAM_STATUS[t.availabilityStatus]||{})} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card">
                        <h2 className="text-sm font-semibold text-slate-700 mb-4">Recent Deployments</h2>
                        <div className="space-y-3">
                            {recent.map((r, i) => (
                                <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-sm font-medium text-slate-800">{r.teamName}</p>
                                        <Badge label={r.status} bg={r.status==='Completed'?'bg-emerald-100':'bg-blue-100'} text={r.status==='Completed'?'text-emerald-700':'text-blue-700'} />
                                    </div>
                                    <p className="text-xs text-slate-500">{r.incidentLocation} · {r.severityLevel}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Assigned {fmtDateTime(r.assignedAt)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}