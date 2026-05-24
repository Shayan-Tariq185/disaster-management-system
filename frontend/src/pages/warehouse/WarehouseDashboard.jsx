import { useEffect, useState } from 'react';
import { Package, AlertTriangle, Truck, Clock, Loader2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import StatCard        from '../../components/ui/StatCard.jsx';
import AlertBanner     from '../../components/ui/AlertBanner.jsx';
import BarChart        from '../../components/charts/BarChart.jsx';
import { getInventory, getLowStock, getWarehouses, getAllocations } from '../../api/resources.api.js';
import { getResourceReport } from '../../api/reports.api.js';

export default function WarehouseDashboard() {
    const [inventory, setInventory] = useState([]);
    const [lowStock, setLowStock] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [allocations, setAllocations] = useState([]);
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            setError('');
            setLoading(true);
            try {
                const [inv, low, wh, alloc, resReport] = await Promise.all([
                    getInventory(),
                    getLowStock(),
                    getWarehouses(),
                    getAllocations(),
                    getResourceReport(),
                ]);
                setInventory(inv || []);
                setLowStock(low || []);
                setWarehouses(wh || []);
                setAllocations(alloc || []);

                const labels = (resReport || []).map(r => r.resourceType);
                const available = (resReport || []).map(r => Number(r.available || 0));
                const deployed = (resReport || []).map(r => Math.max(0, Number(r.total || 0) - Number(r.available || 0)));
                setChartData({
                    labels,
                    datasets: [
                        { label: 'Available', data: available, backgroundColor: '#22c55e' },
                        { label: 'Deployed',  data: deployed,  backgroundColor: '#3b82f6' },
                    ],
                });
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load warehouse data');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const lowStockLabels = lowStock.map(r => `${r.resourceName} (${r.warehouseName})`);
    const pendingRequests = allocations.filter(a => a.allocationStatus === 'Pending').length;

    const byWarehouse = inventory.reduce((acc, item) => {
        const key = item.warehouseID;
        if (!acc[key]) acc[key] = { warehouseName: item.warehouseName, warehouseLocation: item.warehouseLocation, items: 0, totalQty: 0 };
        acc[key].items += 1;
        acc[key].totalQty += Number(item.quantityAvailable || 0);
        return acc;
    }, {});

    const warehouseCards = warehouses.map(w => {
        const stats = byWarehouse[w.warehouseID] || { items: 0, totalQty: 0 };
        const utilPct = stats.totalQty > 0 ? Math.min(100, Math.round((stats.items / (stats.items + 5)) * 100)) : 0;
        return {
            name: w.name,
            location: w.location,
            items: stats.items,
            totalQty: stats.totalQty,
            utilPct,
        };
    });

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div><h1 className="page-title">Warehouse Dashboard</h1><p className="page-subtitle">Inventory overview across all warehouses</p></div>

                {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {error}
                    </div>
                )}

                {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}

                {lowStockLabels.length > 0 && (
                    <AlertBanner type="danger" message={`LOW STOCK: ${lowStockLabels.join(', ')} — Immediate restocking required.`} dismissible />
                )}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Total SKUs"        value={inventory.length}    iconBg="bg-blue-50"    iconColor="text-blue-600"    icon={Package} />
                    <StatCard title="Low Stock Alerts"  value={lowStock.length}     iconBg="bg-red-50"     iconColor="text-red-600"     icon={AlertTriangle} />
                    <StatCard title="Active Warehouses" value={warehouses.length}   iconBg="bg-emerald-50" iconColor="text-emerald-600" icon={Truck} />
                    <StatCard title="Pending Requests"  value={pendingRequests}     iconBg="bg-amber-50"   iconColor="text-amber-600"   icon={Clock} />
                </div>

                <div className="card">
                    <h2 className="text-sm font-semibold text-slate-700 mb-4">Resource Levels by Category</h2>
                    <BarChart data={chartData} height={200} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {warehouseCards.map(w => (
                        <div key={w.name} className={`card border-l-4 ${w.utilPct > 85 ? 'border-l-red-400' : w.utilPct > 70 ? 'border-l-amber-400' : 'border-l-emerald-400'}`}>
                            <p className="font-semibold text-slate-800 text-sm">{w.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{w.location}</p>
                            <div className="mt-3 space-y-1">
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Utilization</span><span>{w.utilPct}%</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${w.utilPct>85?'bg-red-500':w.utilPct>70?'bg-amber-500':'bg-emerald-500'}`} style={{width:`${w.utilPct}%`}} />
                                </div>
                            </div>
                            <div className="mt-3 flex gap-4 text-xs text-slate-500">
                                <span><strong className="text-slate-700">{w.items}</strong> SKUs</span>
                                <span><strong className="text-slate-700">{w.totalQty.toLocaleString()}</strong> units</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}