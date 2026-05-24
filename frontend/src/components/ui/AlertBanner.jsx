import { useState } from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react';

const CONFIG = {
    info:    { icon: Info,          bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800'   },
    success: { icon: CheckCircle,   bg: 'bg-emerald-50',border: 'border-emerald-200',text: 'text-emerald-800'},
    warning: { icon: AlertTriangle, bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-800'  },
    danger:  { icon: XCircle,       bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800'    },
};

export default function AlertBanner({ type = 'info', message, dismissible = false }) {
    const [gone, setGone] = useState(false);
    if (gone) return null;
    const { icon: Icon, bg, border, text } = CONFIG[type] || CONFIG.info;
    return (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${bg} ${border} ${text}`}>
            <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="flex-1">{message}</p>
            {dismissible && (
                <button onClick={() => setGone(true)} className="ml-auto flex-shrink-0 opacity-60 hover:opacity-100">
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}