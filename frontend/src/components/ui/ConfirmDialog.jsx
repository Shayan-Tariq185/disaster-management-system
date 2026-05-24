import Modal from './Modal.jsx';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="space-y-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${danger ? 'text-red-500' : 'text-amber-500'}`} />
                    <p className="text-sm text-slate-600">{message}</p>
                </div>
                <div className="flex gap-3 justify-end pt-2">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button
                        className={danger ? 'btn-danger' : 'btn-primary'}
                        onClick={() => { onConfirm(); onClose(); }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
}