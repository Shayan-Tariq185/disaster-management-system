import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CheckCircle, Loader2 } from 'lucide-react';
import { getInventory, allocateResource } from '../../api/resources.api.js';
import { getIncidents } from '../../api/incidents.api.js';

export default function ResourceRequestForm({ onSuccess, onCancel }) {
    const { register, handleSubmit, watch, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [done,    setDone]    = useState(false);
    const [inventory, setInventory] = useState([]);
    const [incidents, setIncidents] = useState([]);
    const [error, setError] = useState('');
    const selectedId = parseInt(watch('inventoryID'));
    const selected   = inventory.find(r => r.inventoryID === selectedId);

    useEffect(() => {
        Promise.all([getInventory(), getIncidents()])
            .then(([inv, inc]) => {
                setInventory(inv || []);
                setIncidents(inc || []);
            })
            .catch(() => setError('Failed to load inventory or incidents'));
    }, []);

    const onSubmit = async (data) => {
        setError('');
        if (selected && parseFloat(data.quantity) > selected.quantityAvailable) {
            setError('Quantity exceeds available stock');
            return;
        }
        setLoading(true);
        try {
            await allocateResource({
                inventoryID: parseInt(data.inventoryID),
                reportID: parseInt(data.reportID),
                quantity: parseFloat(data.quantity),
                notes: data.notes || null,
            });
            setDone(true);
            setTimeout(() => { setDone(false); onSuccess?.(); }, 1500);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit request');
        } finally {
            setLoading(false);
        }
    };

    if (done)
        return (
            <div className="flex flex-col items-center py-8 gap-3">
                <CheckCircle className="w-12 h-12 text-emerald-500" />
                <p className="font-semibold text-slate-700">Request submitted for approval</p>
            </div>
        );

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && <div className="text-xs text-red-600">{error}</div>}
            <div>
                <label className="label">Resource *</label>
                <select {...register('inventoryID', { required: 'Select a resource' })} className="select">
                    <option value="">— Select Resource —</option>
                    {inventory.map(r => (
                        <option key={r.inventoryID} value={r.inventoryID}>
                            {r.resourceName} — {r.warehouseName} ({r.quantityAvailable} {r.unitOfMeasure || 'units'} available)
                        </option>
                    ))}
                </select>
                {errors.inventoryID && <p className="text-red-500 text-xs mt-1">{errors.inventoryID.message}</p>}
            </div>

            {selected && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-700">
                    Stock available: <strong>{selected.quantityAvailable} {selected.unitOfMeasure || 'units'}</strong> at {selected.warehouseName}
                </div>
            )}

            <div>
                <label className="label">Incident *</label>
                <select {...register('reportID', { required: 'Select an incident' })} className="select">
                    <option value="">— Select Incident —</option>
                    {incidents.map(i => (
                        <option key={i.reportID} value={i.reportID}>
                            #{String(i.reportID).padStart(4,'0')} — {i.disasterType}, {i.location} ({i.severityLevel})
                        </option>
                    ))}
                </select>
                {errors.reportID && <p className="text-red-500 text-xs mt-1">{errors.reportID.message}</p>}
            </div>

            <div>
                <label className="label">Quantity *</label>
                <input type="number" min="1" {...register('quantity', { required: 'Enter quantity', min: 1 })}
                       className="input" placeholder="0" />
                {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message}</p>}
            </div>

            <div>
                <label className="label">Justification</label>
                <textarea {...register('notes')} rows={2} className="input resize-none" placeholder="Reason for request..." />
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                ⚠ This allocation requires Admin approval before dispatch.
            </div>

            <div className="flex gap-3 pt-2">
                {onCancel && <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Cancel</button>}
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Request Resources'}
                </button>
            </div>
        </form>
    );
}