import { useState } from 'react';
import { Zap, Timer } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import BarChart        from '../../components/charts/BarChart.jsx';

const BENCHMARKS = [
    { query:"SELECT * FROM Emergency_Report WHERE location LIKE '%Sindh%'",    noIdx:2840, withIdx:12,  scenario:'Location filter — 1M rows', index:'IX_EmergencyReport_Location'   },
    { query:"SELECT * FROM Financial_Transaction WHERE transactionDate BETWEEN ? AND ?", noIdx:3210, withIdx:18, scenario:'Date range on Transactions', index:'IX_FinancialTransaction_Date' },
    { query:"SELECT * FROM Resource_Allocation WHERE status = 'Pending'",       noIdx:1950, withIdx:9,   scenario:'Status filter on Allocations',  index:'IX_ResourceAllocation_Status'  },
    { query:"View: v_ActiveIncidents vs direct 4-table JOIN",                   noIdx:4100, withIdx:310, scenario:'View vs raw JOIN query',        index:'v_ActiveIncidents (pre-compiled)'},
];

const VIEWS = [
    { view:'v_ActiveIncidents',        direct:820,  via:310, security:'Hides raw coordinates'    },
    { view:'v_FinancialSummary',       direct:1100, via:280, security:'Restricts donor PII'      },
    { view:'v_ResourceInventory',      direct:650,  via:190, security:'Hides cost_per_unit'      },
    { view:'v_AuditTrail',             direct:2300, via:410, security:'Read-only — no DML'       },
];

const chartData = {
    labels: BENCHMARKS.map((_, i) => `Query ${i+1}`),
    datasets: [
        { label:'Without Index (ms)', data: BENCHMARKS.map(b => b.noIdx),   backgroundColor:'#ef4444' },
        { label:'With Index (ms)',    data: BENCHMARKS.map(b => b.withIdx), backgroundColor:'#22c55e' },
    ],
};

export default function PerformanceBenchmark() {
    const [results,  setResults]  = useState({});
    const [running,  setRunning]  = useState(null);

    const simulate = async (i) => {
        setRunning(i);
        await new Promise(r => setTimeout(r, 1200));
        setResults(prev => ({ ...prev, [i]: true }));
        setRunning(null);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="page-title">Performance Benchmark Center</h1>
                    <p className="page-subtitle">Index comparison · Views vs direct table queries · Query execution analysis</p>
                </div>

                <div className="card">
                    <h2 className="text-sm font-semibold text-slate-700 mb-1">Index Performance Comparison (ms)</h2>
                    <p className="text-xs text-slate-400 mb-4">Y-axis: log scale — green bars are with-index times</p>
                    <BarChart data={chartData} height={220}
                              options={{ scales:{ x:{grid:{display:false}}, y:{ type:'logarithmic', grid:{color:'#f1f5f9'} } } }} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {BENCHMARKS.map((b, i) => {
                        const speedup = Math.round(b.noIdx / b.withIdx);
                        return (
                            <div key={i} className="card space-y-3">
                                <p className="text-xs font-mono bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-600 leading-relaxed">{b.query}</p>
                                <p className="text-xs text-slate-400">{b.scenario}</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                                        <p className="text-2xl font-bold text-red-600">{b.noIdx}ms</p>
                                        <p className="text-xs text-red-500 mt-0.5">Without Index</p>
                                    </div>
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                                        <p className="text-2xl font-bold text-emerald-600">{b.withIdx}ms</p>
                                        <p className="text-xs text-emerald-500 mt-0.5">With Index</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                                        <span className="font-semibold text-amber-600">{speedup}×</span> faster
                                        <span className="text-slate-300 mx-1">·</span>
                                        <span className="text-slate-400 truncate max-w-[140px]">{b.index}</span>
                                    </div>
                                    <button onClick={() => simulate(i)} disabled={running !== null}
                                            className="btn btn-primary btn-sm flex items-center gap-1">
                                        {running === i ? <><Timer className="w-3 h-3 animate-spin" />Running…</> : results[i] ? '✓ Done' : 'Run Test'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="card">
                    <h2 className="text-sm font-semibold text-slate-700 mb-4">Views vs Direct Table Queries</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr>{['View Name','Direct (ms)','Via View (ms)','Speedup','Security Benefit'].map(h=><th key={h} className="th">{h}</th>)}</tr></thead>
                            <tbody>
                            {VIEWS.map(v => (
                                <tr key={v.view} className="tr">
                                    <td className="td font-mono text-xs text-blue-600">{v.view}</td>
                                    <td className="td font-semibold text-red-600">{v.direct}ms</td>
                                    <td className="td font-semibold text-emerald-600">{v.via}ms</td>
                                    <td className="td">
                      <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                        {Math.round(v.direct/v.via)}× faster
                      </span>
                                    </td>
                                    <td className="td text-xs text-slate-500">{v.security}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}