import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'No records found', subtitle = '', action }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-500">{title}</p>
            {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}