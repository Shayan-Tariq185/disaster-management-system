import { useState, useEffect } from 'react';
import { Users, UserCheck, Activity, CheckCircle2, Loader2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import StatCard        from '../../components/ui/StatCard.jsx';
import Badge           from '../../components/ui/Badge.jsx';
import Modal           from '../../components/ui/Modal.jsx';
import { TEAM_STATUS } from '../../utils/constants.js';
import { getTeams, assignTeam, getAssignments, updateAssignment } from '../../api/rescue.api.js';
import { getIncidents } from '../../api/incidents.api.js';

function AssignModal({ team, incidents, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ reportID: '', notes: '' });
    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await assignTeam({
                teamID: team?.teamID,
                reportID: parseInt(form.reportID),
                notes: form.notes || null,
            });
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to assign team');
        } finally {
            setLoading(false);
        }
    };
    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm">
                <p className="font-medium text-blue-700">Assigning: {team?.teamName}</p>
                <p className="text-xs text-blue-500 mt-0.5">Current: {team?.currentLocation}</p>
            </div>
            {error && <div className="text-xs text-red-600">{error}</div>}
            <div><label className="label">Select Incident *</label>
                <select required className="select" value={form.reportID} onChange={e=>setForm({...form, reportID:e.target.value})}>
                    <option value="">— Select Incident —</option>
                    {incidents.map(i => (
                        <option key={i.reportID} value={i.reportID}>
                            #{String(i.reportID).padStart(4,'0')} — {i.disasterType}, {i.location} ({i.severityLevel})
                        </option>
                    ))}
                </select>
            </div>
            <div><label className="label">Notes</label>
                <textarea rows={2} className="input resize-none" value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} placeholder="Special instructions…" />
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                ⚠ Requires Admin approval. Team status updates after approval.
            </div>
            <div className="flex gap-3">
                <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                    {loading ? 'Submitting…' : 'Submit Assignment'}
                </button>
            </div>
        </form>
    );
}

export default function RescueTeamManagement() {
    const [teams, setTeams]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter]   = useState('All');
    const [selected, setSelected] = useState(null);
    const [incidents, setIncidents] = useState([]);
    const [historyTeam, setHistoryTeam] = useState(null);
    const [historyRows, setHistoryRows] = useState([]);
    const [historyError, setHistoryError] = useState('');
    const [historyLoading, setHistoryLoading] = useState(false);

    const fetchTeams = async () => {
        try {
            const data = await getTeams();
            setTeams(data);
        } catch (err) {
            console.error('Failed to fetch teams:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeams();
        getIncidents().then(setIncidents).catch(() => {});
    }, []);

    const counts = teams.reduce((a,t)=>({...a,[t.availabilityStatus]:(a[t.availabilityStatus]||0)+1}),{});

    const displayed = filter === 'All' ? teams : teams.filter(t => t.availabilityStatus === filter);

    const openHistory = async (team) => {
        setHistoryTeam(team);
        setHistoryError('');
        setHistoryLoading(true);
        try {
            const rows = await getAssignments();
            setHistoryRows((rows || []).filter(r => r.teamName === team.teamName));
        } catch (err) {
            setHistoryError(err.response?.data?.error || 'Failed to load team history');
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleCompleteAssignment = async (assignmentID) => {
        try {
            await updateAssignment(assignmentID, { status: 'Completed' });
            // Refresh history for the current team
            const rows = await getAssignments();
            setHistoryRows((rows || []).filter(r => r.teamName === historyTeam?.teamName));
            // Refresh overall team statuses
            fetchTeams();
        } catch (err) {
            setHistoryError(err.response?.data?.error || 'Failed to complete assignment');
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-5">
                <h1 className="page-title">Rescue Team Management</h1>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Available" value={counts.Available||0} iconBg="bg-emerald-50" iconColor="text-emerald-600" icon={Users} />
                    <StatCard title="Assigned"  value={counts.Assigned||0}  iconBg="bg-blue-50"    iconColor="text-blue-600"    icon={UserCheck} />
                    <StatCard title="Busy"      value={counts.Busy||0}      iconBg="bg-orange-50"  iconColor="text-orange-600"  icon={Activity} />
                    <StatCard title="Completed" value={counts.Completed||0} iconBg="bg-slate-50"   iconColor="text-slate-600"   icon={CheckCircle2} />
                </div>

                <div className="card">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold text-slate-700">All Rescue Teams</h2>
                            {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {['All','Available','Assigned','Busy','Completed'].map(f => (
                                <button key={f} onClick={() => setFilter(f)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors
                    ${filter===f?'bg-blue-600 text-white border-blue-600':'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr>{['Team','Type','Lead','Location','Members','Status','Actions'].map(h=><th key={h} className="th">{h}</th>)}</tr></thead>
                            <tbody>
                            {displayed.map(t => (
                                <tr key={t.teamID} className="tr">
                                    <td className="td font-semibold">{t.teamName}</td>
                                    <td className="td text-sm">{t.teamType}</td>
                                    <td className="td text-sm text-slate-500">Lead Officer</td>
                                    <td className="td text-sm text-slate-400">{t.currentLocation}</td>
                                    <td className="td text-center">{t.capacity}</td>
                                    <td className="td"><Badge label={t.availabilityStatus} {...(TEAM_STATUS[t.availabilityStatus]||{})} /></td>
                                    <td className="td">
                                        <div className="flex gap-1">
                                            <button className="btn btn-secondary btn-sm" onClick={() => openHistory(t)}>History</button>
                                            {t.availabilityStatus==='Available' && (
                                                <button className="btn btn-primary btn-sm" onClick={()=>setSelected(t)}>Assign</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Modal isOpen={!!selected} onClose={()=>setSelected(null)} title="Assign Rescue Team">
                <AssignModal team={selected} incidents={incidents} onClose={()=>setSelected(null)} onSuccess={fetchTeams} />
            </Modal>

            <Modal isOpen={!!historyTeam} onClose={() => setHistoryTeam(null)} title="Team Assignment History" size="sm">
                <div className="space-y-3 text-sm">
                    {historyError && <div className="text-xs text-red-600">{historyError}</div>}
                    {historyLoading ? (
                        <div className="text-xs text-slate-500">Loading...</div>
                    ) : historyRows.length ? (
                        <div className="space-y-2">
                            {historyRows.map((r) => (
                                <div key={r.assignmentID} className="p-2 border border-slate-200 rounded">
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <div><span className="text-slate-500">Incident:</span> {r.incidentLocation} ({r.severityLevel})</div>
                                            <div><span className="text-slate-500">Status:</span> {r.status}</div>
                                            <div><span className="text-slate-500">Assigned:</span> {r.assignedAt ? new Date(r.assignedAt).toLocaleString() : '—'}</div>
                                        </div>
                                        {!['Completed', 'Cancelled'].includes(r.status) && (
                                            <button 
                                                className="btn btn-secondary btn-sm shrink-0"
                                                onClick={() => handleCompleteAssignment(r.assignmentID)}
                                            >
                                                Complete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-xs text-slate-500">No assignments found for this team.</div>
                    )}
                    <div className="flex justify-end">
                        <button className="btn-primary" onClick={() => setHistoryTeam(null)}>Close</button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
}