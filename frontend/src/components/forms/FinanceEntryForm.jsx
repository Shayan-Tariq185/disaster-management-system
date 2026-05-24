import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CheckCircle, Loader2 } from 'lucide-react';
import { getDisasterEvents } from '../../api/incidents.api.js';
import { recordDonation, recordExpense } from '../../api/finance.api.js';

export default function FinanceEntryForm({ onSuccess, onCancel }) {
    const { register, handleSubmit, watch, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [done,    setDone]    = useState(false);
    const [events, setEvents] = useState([]);
    const [error, setError] = useState('');
    const type = watch('transactionType');

    useEffect(() => {
        getDisasterEvents()
            .then(setEvents)
            .catch(() => setError('Failed to load events'));
    }, []);

    const onSubmit = async (data) => {
        setLoading(true);
        setError('');
        try {
            if (data.transactionType === 'Donation') {
                await recordDonation({
                    eventID: parseInt(data.eventID),
                    donorName: data.source,
                    donorType: data.donorType || null,
                    amount: parseFloat(data.amount),
                    paymentMethod: data.paymentMethod || null,
                });
            } else {
                await recordExpense({
                    eventID: parseInt(data.eventID),
                    description: data.source,
                    category: data.transactionType === 'Procurement' ? 'Procurement' : (data.category || null),
                    amount: parseFloat(data.amount),
                });
            }
            setDone(true);
            setTimeout(() => { setDone(false); onSuccess?.(); }, 1500);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to record transaction');
        } finally {
            setLoading(false);
        }
    };

    if (done)
        return (
            <div className="flex flex-col items-center py-8 gap-3">
                <CheckCircle className="w-12 h-12 text-emerald-500" />
                <p className="font-semibold text-slate-700">Transaction recorded successfully</p>
                <p className="text-sm text-slate-400">Added to financial audit trail</p>
            </div>
        );

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && <div className="text-xs text-red-600">{error}</div>}
            <div>
                <label className="label">Transaction Type *</label>
                <select {...register('transactionType', { required: 'Select type' })} className="select">
                    <option value="">— Select Type —</option>
                    <option value="Donation">Donation</option>
                    <option value="Expense">Expense</option>
                    <option value="Procurement">Procurement</option>
                </select>
                {errors.transactionType && <p className="text-red-500 text-xs mt-1">{errors.transactionType.message}</p>}
            </div>

            <div>
                <label className="label">Amount (PKR) *</label>
                <input type="number" min="1" step="0.01"
                       {...register('amount', { required: 'Enter amount', min: { value: 1, message: 'Must be > 0' } })}
                       className="input" placeholder="0.00" />
                {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
            </div>

            <div>
                <label className="label">{type === 'Donation' ? 'Donor Name' : 'Source / Payee'} *</label>
                <input {...register('source', { required: 'This field is required' })}
                       className="input" placeholder={type === 'Donation' ? 'Organization or individual name' : 'Department or vendor'} />
                {errors.source && <p className="text-red-500 text-xs mt-1">{errors.source.message}</p>}
            </div>

            {type === 'Donation' && (
                <div>
                    <label className="label">Donor Type</label>
                    <input {...register('donorType')} className="input" placeholder="NGO, Company, Individual" />
                </div>
            )}

            {type !== 'Donation' && (
                <div>
                    <label className="label">Category</label>
                    <input {...register('category')} className="input" placeholder="Medical, Transport, Procurement" />
                </div>
            )}

            {type === 'Donation' && (
                <div>
                    <label className="label">Payment Method</label>
                    <select {...register('paymentMethod')} className="select">
                        <option value="">— Select —</option>
                        <option>Bank Transfer</option>
                        <option>Cheque</option>
                        <option>Cash</option>
                    </select>
                </div>
            )}

            <div>
                <label className="label">Disaster Event *</label>
                <select {...register('eventID', { required: 'Select event' })} className="select">
                    <option value="">— Select Event —</option>
                    {events.map(e => <option key={e.eventID} value={e.eventID}>{e.eventName}</option>)}
                </select>
                {errors.eventID && <p className="text-red-500 text-xs mt-1">{errors.eventID.message}</p>}
            </div>

            <div>
                <label className="label">Notes</label>
                <textarea {...register('notes')} rows={2} className="input resize-none" />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                Amounts over ₨100,000 will automatically generate an approval request.
            </div>

            <div className="flex gap-3 pt-2">
                {onCancel && <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Cancel</button>}
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Recording...</> : 'Record Transaction'}
                </button>
            </div>
        </form>
    );
}