import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Loader2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import DataTable       from '../../components/ui/DataTable.jsx';
import Badge           from '../../components/ui/Badge.jsx';
import Modal           from '../../components/ui/Modal.jsx';
import IncidentForm    from '../../components/forms/IncidentForm.jsx';
import { SEVERITY, INCIDENT_STATUS }    from '../../utils/constants.js';
import { fmtDateTime } from '../../utils/formatters.js';
import { getIncidents, updateIncidentStatus } from '../../api/incidents.api.js';

export default function IncidentManagement() {
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [search, setSearch]       = useState('');
    const [showModal, setShowModal] = useState(false);
    const [viewIncident, setViewIncident] = useState(null);
    const [editIncident, setEditIncident] = useState(null);
    const [editStatus, setEditStatus] = useState('');
    const [editError, setEditError] = useState('');
    const [saving, setSaving] = useState(false);

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

    const filtered = incidents.filter(d =>
        d.location.toLowerCase().includes(search.toLowerCase()) ||
        d.disasterType.toLowerCase().includes(search.toLowerCase())
    );

    const columns = [
        { key: 'reportID',  label: 'ID',       render: v => <span className="font-mono text-xs text-slate-400">#{String(v).padStart(4,'0')}</span> },
        { key: 'location', label: 'Location', render: v => <span className="font-medium">{v}</span> },
        { key: 'disasterType', label: 'Type' },
        { key: 'severityLevel', label: 'Severity', render: v => <Badge label={v} {...SEVERITY[v]} /> },
        { key: 'status',   label: 'Status',   render: v => <Badge label={v} {...(INCIDENT_STATUS[v]||{})} /> },
        { key: 'timeOfReport', label: 'Reported', render: v => <span className="text-xs text-slate-400">{fmtDateTime(v)}</span> },
        { key: 'operatorName', label: 'Operator' },
        { key: 'reportID',  label: 'Actions',  render: (_, row) => (
                <div className="flex gap-1">
                    <button className="btn btn-secondary btn-sm" onClick={() => setViewIncident(row)}>View</button>
                    <button className="btn btn-primary btn-sm" onClick={() => { setEditIncident(row); setEditStatus(row.status); }}>Update</button>
                </div>
            )},
    ];

    const saveStatus = async () => {
        if (!editIncident) return;
        setSaving(true);
        setEditError('');
        try {
            await updateIncidentStatus(editIncident.reportID, { status: editStatus });
            setEditIncident(null);
            await fetchIncidents();
        } catch (err) {
            setEditError(err.response?.data?.error || 'Failed to update status');
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div><h1 className="page-title">Incident Management</h1><p className="page-subtitle">All emergency reports — filter, assign, and track</p></div>
                    <button className="btn-primary" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> New Incident</button>
                </div>
                <div className="card">
                    <div className="flex gap-3 mb-4 flex-wrap">
                        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input value={search} onChange={e=>setSearch(e.target.value)} className="input pl-9 w-64" placeholder="Search location or type…" /></div>
                        {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-600 self-center" />}
                        <select className="select w-40"><option>All Severity</option>{Object.keys(SEVERITY).map(s=><option key={s}>{s}</option>)}</select>
                        <select className="select w-40"><option>All Status</option>{Object.keys(INCIDENT_STATUS).map(s=><option key={s}>{s}</option>)}</select>
                    </div>
                    <DataTable columns={columns} data={filtered} />
                </div>
            </div>
            <Modal isOpen={showModal} onClose={()=>setShowModal(false)} title="Report New Incident">
                <IncidentForm onSuccess={()=>setShowModal(false)} onCancel={()=>setShowModal(false)} />
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

            <Modal isOpen={!!editIncident} onClose={() => setEditIncident(null)} title="Update Incident Status" size="sm">
                <div className="space-y-3 text-sm">
                    {editError && <div className="text-xs text-red-600">{editError}</div>}
                    <div><span className="text-slate-500">Incident:</span> #{String(editIncident?.reportID || '').padStart(4,'0')} · {editIncident?.location}</div>
                    <div>
                        <label className="label">Status</label>
                        <select className="select" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                            {Object.keys(INCIDENT_STATUS).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-3">
                        <button className="btn-secondary flex-1" onClick={() => setEditIncident(null)}>Cancel</button>
                        <button className="btn-primary flex-1" disabled={saving} onClick={saveStatus}>
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
}