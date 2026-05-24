import { useEffect, useState } from 'react';
import { Building2, Users, AlertTriangle, Activity } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import StatCard        from '../../components/ui/StatCard.jsx';
import Modal           from '../../components/ui/Modal.jsx';
import { getHospitals, getPatients, admitPatient, dischargePatient } from '../../api/hospitals.api.js';
import { getIncidents } from '../../api/incidents.api.js';

function loadStyle(occupancyPct, loadStatus) {
    const occ = occupancyPct / 100;
    if (loadStatus === 'Overloaded' || occ > 0.85)
        return { label:'Overloaded', bar:'bg-red-500',    border:'border-red-300',    bg:'bg-red-50'    };
    if (loadStatus === 'High Load' || occ > 0.60)
        return { label:'High Load',  bar:'bg-orange-500', border:'border-orange-300', bg:'bg-orange-50' };
    return { label:'Normal', bar:'bg-emerald-500', border:'border-emerald-300', bg:'bg-emerald-50' };
}

function AdmitModal({ hospital, incidents, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ patientName: '', reportID: '', caseSeverity: '' });

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.patientName || !form.caseSeverity) {
            setError('Patient name and condition are required');
            return;
        }
        setLoading(true);
        try {
            await admitPatient({
                hospitalID: hospital?.hospitalID,
                reportID: form.reportID ? parseInt(form.reportID) : null,
                patientName: form.patientName,
                caseSeverity: form.caseSeverity,
            });
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to admit patient');
        } finally {
            setLoading(false);
        }
    };
    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm">
                <p className="font-medium text-blue-700">{hospital?.hospitalName}</p>
                <p className="text-xs text-blue-500 mt-0.5">Available beds: {hospital?.availableBeds}</p>
            </div>
            {error && <div className="text-xs text-red-600">{error}</div>}
            <div><label className="label">Patient Name *</label>
                <input value={form.patientName} onChange={e=>setForm({...form, patientName:e.target.value})}
                       required className="input" placeholder="Full name" />
            </div>
            <div><label className="label">Incident Reference</label>
                <select className="select" value={form.reportID} onChange={e=>setForm({...form, reportID:e.target.value})}>
                    <option value="">— Select Incident —</option>
                    {incidents.map(i => (
                        <option key={i.reportID} value={i.reportID}>
                            #{String(i.reportID).padStart(4,'0')} — {i.disasterType}, {i.location}
                        </option>
                    ))}
                </select>
            </div>
            <div><label className="label">Condition *</label>
                <select required className="select" value={form.caseSeverity} onChange={e=>setForm({...form, caseSeverity:e.target.value})}>
                    <option value="">— Select —</option>
                    <option>Stable</option><option>Serious</option><option>Critical</option>
                </select>
            </div>
            <div className="flex gap-3">
                <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
                <button type="submit" disabled={loading || !hospital?.availableBeds} className="btn-primary flex-1 disabled:opacity-50">
                    {loading ? 'Admitting…' : 'Confirm Admission'}
                </button>
            </div>
        </form>
    );
}

export default function HospitalCoordination() {
    const [selected, setSelected] = useState(null);
    const [hospitals, setHospitals] = useState([]);
    const [patients, setPatients] = useState([]);
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = async () => {
        setError('');
        setLoading(true);
        try {
            const [hData, pData, iData] = await Promise.all([
                getHospitals(),
                getPatients(),
                getIncidents(),
            ]);
            setHospitals(hData || []);
            setPatients(pData || []);
            setIncidents(iData || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load hospital data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDischarge = async (patientID) => {
        if (!window.confirm('Are you sure you want to discharge this patient?')) return;
        try {
            await dischargePatient(patientID);
            fetchData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to discharge patient');
        }
    };

    const totalAvail  = hospitals.reduce((s,h)=>s + (h.availableBeds || 0), 0);
    const overloaded  = hospitals.filter(h => (h.occupancyPct || 0) > 85 || h.loadStatus === 'Overloaded').length;
    const totalCrit   = patients.filter(p => p.caseSeverity === 'Critical' && !['Discharged','Transferred','Deceased'].includes(p.status)).length;

    return (
        <DashboardLayout>
            <div className="space-y-5">
                <div><h1 className="page-title">Hospital Coordination</h1><p className="page-subtitle">Real-time bed availability and patient assignment</p></div>
                {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {error}
                    </div>
                )}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Total Hospitals"  value={hospitals.length} iconBg="bg-blue-50"    iconColor="text-blue-600"    icon={Building2}   />
                    <StatCard title="Available Beds"   value={totalAvail}       iconBg="bg-emerald-50" iconColor="text-emerald-600" icon={Users}        />
                    <StatCard title="Overloaded"       value={overloaded}       iconBg="bg-red-50"     iconColor="text-red-600"     icon={AlertTriangle}/>
                    <StatCard title="Critical Patients"value={totalCrit}        iconBg="bg-orange-50"  iconColor="text-orange-600"  icon={Activity}     />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {hospitals.map(h => {
                        const { label, bar, border, bg } = loadStyle(h.occupancyPct || 0, h.loadStatus);
                        const occPct = Math.round(h.occupancyPct || 0);
                        return (
                            <div key={h.hospitalID} className={`rounded-xl border p-5 space-y-3 ${border} ${bg}`}>
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-slate-800 text-sm leading-snug">{h.hospitalName}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{h.location}</p>
                                    </div>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-white/70 ${
                                        label==='Overloaded'?'text-red-600':label==='High Load'?'text-orange-600':'text-emerald-600'
                                    }`}>{label}</span>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                                        <span>Occupancy</span><span>{occPct}%</span>
                                    </div>
                                    <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                                        <div className={`h-full ${bar} rounded-full transition-all`} style={{width:`${occPct}%`}} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    {[['Total',h.totalBeds],['Available',h.availableBeds],['Occupancy',`${occPct}%`]].map(([k,v])=>(
                                        <div key={k} className="bg-white/60 rounded-lg py-2">
                                            <p className="text-lg font-bold text-slate-800">{v}</p>
                                            <p className="text-xs text-slate-500">{k}</p>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={()=>setSelected(h)} disabled={!h.availableBeds}
                                        className="btn-primary w-full text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                                    {h.availableBeds>0?'Admit Patient':'No Beds Available'}
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">Admitted Patients</h2>
                    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b text-slate-500 font-medium">
                                <tr>
                                    <th className="px-4 py-3">Patient Name</th>
                                    <th className="px-4 py-3">Condition</th>
                                    <th className="px-4 py-3">Hospital</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 border-t-0">
                                {patients.map(p => (
                                    <tr key={p.patientID} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-800">{p.patientName}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                p.caseSeverity === 'Critical' ? 'bg-red-100 text-red-700' :
                                                p.caseSeverity === 'Serious' ? 'bg-orange-100 text-orange-700' :
                                                'bg-emerald-100 text-emerald-700'
                                            }`}>
                                                {p.caseSeverity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{p.hospitalName}</td>
                                        <td className="px-4 py-3 text-slate-600">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                p.status === 'Discharged' ? 'bg-slate-100 text-slate-600' :
                                                'bg-blue-50 text-blue-700'
                                            }`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {!['Discharged', 'Transferred', 'Deceased'].includes(p.status) && (
                                                <button
                                                    onClick={() => handleDischarge(p.patientID)}
                                                    className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors"
                                                >
                                                    Discharge
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {patients.length === 0 && (
                                    <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">No patients found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Modal isOpen={!!selected} onClose={()=>setSelected(null)} title="Admit Patient" size="sm">
                <AdmitModal
                    hospital={selected}
                    incidents={incidents}
                    onClose={()=>setSelected(null)}
                    onSuccess={fetchData}
                />
            </Modal>
        </DashboardLayout>
    );
}