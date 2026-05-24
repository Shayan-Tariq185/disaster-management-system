import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, CheckCircle2, Activity, Plus, Loader2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import StatCard        from '../../components/ui/StatCard.jsx';
import Badge           from '../../components/ui/Badge.jsx';
import Modal           from '../../components/ui/Modal.jsx';
import IncidentForm    from '../../components/forms/IncidentForm.jsx';
import { SEVERITY, INCIDENT_STATUS }    from '../../utils/constants.js';
import { fmtDateTime } from '../../utils/formatters.js';
import { getIncidents } from '../../api/incidents.api.js';

const ROW_BG = { Critical: 'bg-red-50/60', High: 'bg-orange-50/40', Medium: '', Low: '' };

export default function OperatorDashboard() {
    const navigate = useNavigate();
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [filter,   setFilter]     = useState('All');
    const [showForm, setShowForm]   = useState(false);
    const [viewIncident, setViewIncident] = useState(null);

    const fetchIncidents = async () => {
        try {
            const data = await getIncidents();
            setIncidents(data);
        } catch (err) {
            console.error('Failed to fetch incidents:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIncidents();
    }, []);

    const filtered = filter === 'All' ? incidents : incidents.filter(i => i.severityLevel === filter);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="page-title">Emergency Operations</h1>
                        <p className="page-subtitle">Live incident monitoring and response coordination</p>
                    </div>
                    <button className="btn-primary" onClick={() => setShowForm(true)}>
                        <Plus className="w-4 h-4" /> Report Incident
                    </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Active Incidents"  value={incidents.length} iconBg="bg-red-50"     iconColor="text-red-600"     icon={AlertTriangle} />
                    <StatCard title="Critical Cases"    value={incidents.filter(i=>i.severityLevel==='Critical').length} iconBg="bg-orange-50"  iconColor="text-orange-600"  icon={AlertTriangle} />
                    <StatCard title="Avg Response Time" value="18m" iconBg="bg-blue-50"   iconColor="text-blue-600"    icon={Clock} />
                    <StatCard title="Resolved Today"    value={incidents.filter(i=>i.status==='Resolved').length} iconBg="bg-emerald-50" iconColor="text-emerald-600" icon={CheckCircle2} />
                </div>

                <div className="card">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold text-slate-700">Live Priority Queue</h2>
                            {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {['All','Critical','High','Medium','Low'].map(f => (
                                <button key={f} onClick={() => setFilter(f)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors
                    ${filter === f ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                            <tr>
                                {['ID','Location','Type','Severity','Status','Reported','Actions'].map(h => (
                                    <th key={h} className="th">{h}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map(inc => (
                                <tr key={inc.reportID} className={`tr ${ROW_BG[inc.severityLevel]}`}>
                                    <td className="td font-mono text-xs text-slate-400">#{String(inc.reportID).padStart(4,'0')}</td>
                                    <td className="td font-medium">{inc.location}</td>
                                    <td className="td">{inc.disasterType}</td>
                                    <td className="td"><Badge label={inc.severityLevel} {...SEVERITY[inc.severityLevel]} /></td>
                                    <td className="td"><Badge label={inc.status} {...(INCIDENT_STATUS[inc.status] || {})} /></td>
                                    <td className="td text-xs text-slate-400">{fmtDateTime(inc.timeOfReport)}</td>
                                    <td className="td">
                                        <div className="flex gap-1">
                                            <button className="btn btn-secondary btn-sm" onClick={() => setViewIncident(inc)}>View</button>
                                            <button className="btn btn-primary btn-sm" onClick={() => navigate('/field/teams')}>Assign</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Report New Emergency Incident">
                <IncidentForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
            </Modal>

            <Modal isOpen={!!viewIncident} onClose={() => setViewIncident(null)} title="Incident Details" size="sm">
                <div className="space-y-3 text-sm">
                    <div><span className="text-slate-500">ID:</span> #{String(viewIncident?.reportID || '').padStart(4,'0')}</div>
                    <div><span className="text-slate-500">Location:</span> {viewIncident?.location}</div>
                    <div><span className="text-slate-500">Type:</span> {viewIncident?.disasterType}</div>
                    <div><span className="text-slate-500">Severity:</span> {viewIncident?.severityLevel}</div>
                    <div><span className="text-slate-500">Status:</span> {viewIncident?.status}</div>
                    <div><span className="text-slate-500">Reported:</span> {viewIncident?.timeOfReport ? fmtDateTime(viewIncident.timeOfReport) : '—'}</div>
                    <div className="flex justify-end">
                        <button className="btn-primary" onClick={() => setViewIncident(null)}>Close</button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
}