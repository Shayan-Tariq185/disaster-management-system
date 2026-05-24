import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner.jsx';
import EmptyState     from './EmptyState.jsx';

const PER_PAGE = 10;

export default function DataTable({ columns, data = [], loading = false, emptyMessage = 'No data available.' }) {
    const [page, setPage] = useState(1);
    const pages  = Math.max(1, Math.ceil(data.length / PER_PAGE));
    const sliced = data.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    if (loading) return <LoadingSpinner />;
    if (!data.length) return <EmptyState title={emptyMessage} />;

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                    <tr>
                        {columns.map((c) => (
                            <th key={c.key} className="th" style={c.width ? { width: c.width } : {}}>
                                {c.label}
                            </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {sliced.map((row, i) => (
                        <tr key={row.id ?? i} className="tr">
                            {columns.map((c) => (
                                <td key={c.key} className="td">
                                    {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}
                                </td>
                            ))}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
            {pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                    <p className="text-xs text-slate-500">
                        {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, data.length)} of {data.length}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {Array.from({ length: pages }, (_, i) => i + 1)
                            .filter((p) => Math.abs(p - page) < 3)
                            .map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-7 h-7 text-xs rounded font-medium ${p === page ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        <button
                            onClick={() => setPage((p) => Math.min(pages, p + 1))}
                            disabled={page === pages}
                            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}