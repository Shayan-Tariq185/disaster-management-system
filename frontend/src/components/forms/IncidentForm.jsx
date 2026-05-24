import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CheckCircle, Loader2 } from 'lucide-react';
import { createIncident } from '../../api/incidents.api';
import { getDisasterEvents } from '../../api/incidents.api.js';

export default function IncidentForm({ onSuccess, onCancel }) {
    const { register, handleSubmit, formState: { errors }, watch } = useForm();
    const [loading, setLoading] = useState(false);
    const [done,    setDone]    = useState(false);
    const [events, setEvents] = useState([]);
    const [error, setError] = useState('');

    const selectedEventID = watch('eventID');
    const selectedEvent = events.find(e => e.eventID === parseInt(selectedEventID));

const SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

const SEV_STYLE = {
    Low:      'border-green-400  bg-green-50  text-green-700  peer-checked:border-green-500  peer-checked:bg-green-100',
    Medium:   'border-yellow-400 bg-yellow-50 text-yellow-700 peer-checked:border-yellow-500 peer-checked:bg-yellow-100',
    High:     'border-orange-400 bg-orange-50 text-orange-700 peer-checked:border-orange-500 peer-checked:bg-orange-100',
    Critical: 'border-red-400    bg-red-50    text-red-700    peer-checked:border-red-500    peer-checked:bg-red-100',
};

    useEffect(() => {
        getDisasterEvents()
            .then(setEvents)
            .catch(() => setError('Failed to load events'));
    }, []);

    const onSubmit = async (data) => {
        setLoading(true);
        setError('');
        try {
            await createIncident({
                eventID: parseInt(data.eventID),
                location: data.location,
                disasterType: selectedEvent?.disasterType || '',
                severityLevel: data.severity,
                citizenContact: data.contact,
                description: data.description
            });
            setDone(true);
            setTimeout(() => { setDone(false); onSuccess?.(); }, 1500);
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to submit report');
        } finally {
            setLoading(false);
        }
    };

    if (done)
        return (
            <div className="flex flex-col items-center py-8 gap-3">
                <CheckCircle className="w-12 h-12 text-emerald-500" />
                <p className="font-semibold text-slate-700">Incident reported successfully</p>
                <p className="text-sm text-slate-400">Assigned to priority queue</p>
            </div>
        );

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && <div className="text-xs text-red-600">{error}</div>}
            <div>
                <label className="label">Disaster Event *</label>
                <select {...register('eventID', { required: 'Select event' })} className="select">
                    <option value="">— Select Event —</option>
                    {events.map(e => <option key={e.eventID} value={e.eventID}>{e.eventName}</option>)}
                </select>
                {errors.eventID && <p className="text-red-500 text-xs mt-1">{errors.eventID.message}</p>}
            </div>
            <div>
                <label className="label">Location *</label>
                <input {...register('location', { required: 'Location is required' })}
                       className="input" placeholder="City, District, Province" />
                {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
            </div>

            <div>
                <label className="label">Disaster Type *</label>
                <div className="input bg-slate-100 text-slate-600">
                    {selectedEvent?.disasterType || '(Select event to populate)'}
                </div>
            </div>

            <div>
                <label className="label">Severity *</label>
                <div className="grid grid-cols-4 gap-2">
                    {SEVERITY_OPTIONS.map(s => (
                        <label key={s} className="cursor-pointer">
                            <input type="radio" value={s} {...register('severity', { required: 'Select severity' })} className="sr-only peer" />
                            <div className={`text-center text-xs font-semibold py-2 rounded-lg border-2 transition-all ${SEV_STYLE[s]}`}>
                                {s}
                            </div>
                        </label>
                    ))}
                </div>
                {errors.severity && <p className="text-red-500 text-xs mt-1">{errors.severity.message}</p>}
            </div>

            <div>
                <label className="label">Reporter Contact</label>
                <input {...register('contact')} className="input" placeholder="Phone or email (optional)" />
            </div>

            <div>
                <label className="label">Description</label>
                <textarea {...register('description')} rows={3} className="input resize-none"
                          placeholder="Additional details..." />
            </div>

            <div className="flex gap-3 pt-2">
                {onCancel && <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Cancel</button>}
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Report'}
                </button>
            </div>
        </form>
    );
}