import { getInventory, getWarehouses, getAllocations } from '../../api/resources.api.js';
import { useState, useEffect } from 'react';
import { Package, AlertTriangle, Truck, Plus, Loader2 } from 'lucide-react';
import DashboardLayout        from '../../components/layout/DashboardLayout.jsx';
import StatCard               from '../../components/ui/StatCard.jsx';
import AlertBanner            from '../../components/ui/AlertBanner.jsx';
import Badge                  from '../../components/ui/Badge.jsx';
import Modal                  from '../../components/ui/Modal.jsx';
import ResourceRequestForm    from '../../components/forms/ResourceRequestForm.jsx';

const TYPE_BADGE = {
    Water:    {bg:'bg-blue-100',    text:'text-blue-700'   },
    Medicine: {bg:'bg-purple-100',  text:'text-purple-700' },
    Shelter:  {bg:'bg-amber-100',   text:'text-amber-700'  },
    Food:     {bg:'bg-green-100',   text:'text-green-700'  },
};

export default function ResourceManagement() {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [filter,    setFilter]    = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [warehouses, setWarehouses] = useState([]);
    const [allocations, setAllocations] = useState([]);

    const fetchInventory = async () => {
        try {
            const data = await getInventory();
            setInventory(data);
        } catch (err) {
            console.error('Failed to fetch inventory:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
        getWarehouses().then(setWarehouses).catch(() => {});
        getAllocations({ status: 'Pending' }).then(setAllocations).catch(() => {});
    }, []);

    const low = inventory.filter(r => r.quantityAvailable < r.thresholdLevel);
    const displayed = filter === 'All' ? inventory : inventory.filter(r => r.resourceType === filter);

    return (
        <DashboardLayout>
            <div className="space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div><h1 className="page-title">Resource Management</h1><p className="page-subtitle">Warehouse-wise inventory tracking and allocation</p></div>
                    <button className="btn-primary" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Request Allocation</button>
                </div>

                {low.length > 0 && (
                    <AlertBanner type="danger" message={`Low Stock: ${low.map(r=>r.resourceName).join(', ')}`} dismissible />
                )}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Total SKUs"       value={inventory.length} iconBg="bg-blue-50"    iconColor="text-blue-600"    icon={Package} />
                    <StatCard title="Low Stock Items"  value={low.length}       iconBg="bg-red-50"     iconColor="text-red-600"     icon={AlertTriangle} />
                    <StatCard title="Warehouses"       value={warehouses.length} iconBg="bg-emerald-50" iconColor="text-emerald-600" icon={Truck} />
                    <StatCard title="Pending Dispatch" value={allocations.length} iconBg="bg-amber-50"   iconColor="text-amber-600"   icon={Package} />
                </div>

                <div className="card">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold text-slate-700">Inventory Overview</h2>
                            {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {['All','Water','Medicine','Shelter','Food'].map(f => (
                                <button key={f} onClick={() => setFilter(f)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors
                    ${filter===f?'bg-blue-600 text-white border-blue-600':'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr>{['Resource','Category','Warehouse','Available','Threshold','Stock Level','Actions'].map(h=><th key={h} className="th">{h}</th>)}</tr></thead>
                            <tbody>
                            {displayed.map(r => {
                                const bar = r.stockStatus === 'Normal' ? 'bg-emerald-500' : r.stockStatus === 'Low Stock' ? 'bg-orange-500' : 'bg-red-500';
                                const row = r.stockStatus === 'Normal' ? '' : r.stockStatus === 'Low Stock' ? 'bg-orange-50/40' : 'bg-red-50/50';
                                // Simple percentage for the bar (Available vs 2x Threshold as a dummy max)
                                const pct = Math.min(100, Math.round((r.quantityAvailable / (r.thresholdLevel * 2)) * 100)) || 0;
                                return (
                                    <tr key={r.inventoryID} className={`tr ${row}`}>
                                        <td className="td font-medium">{r.resourceName}</td>
                                        <td className="td"><Badge label={r.resourceType} {...(TYPE_BADGE[r.resourceType]||{})} /></td>
                                        <td className="td text-sm text-slate-400">{r.warehouseName}</td>
                                        <td className="td font-semibold">{r.quantityAvailable} <span className="text-xs font-normal text-slate-400">{r.unitOfMeasure}</span></td>
                                        <td className="td text-slate-400">{r.thresholdLevel}</td>
                                        <td className="td" style={{minWidth:150}}>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                    <div className={`h-full ${bar} rounded-full`} style={{width:`${pct}%`}} />
                                                </div>
                                                <span className={`text-xs font-medium w-20 ${r.stockStatus==='Normal'?'text-emerald-600':r.stockStatus==='Low Stock'?'text-orange-600':'text-red-600'}`}>{r.stockStatus}</span>
                                            </div>
                                        </td>
                                        <td className="td">
                                            <button className="btn btn-primary btn-sm" onClick={()=>setShowModal(true)}>Allocate</button>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Modal isOpen={showModal} onClose={()=>setShowModal(false)} title="Request Resource Allocation">
                <ResourceRequestForm onSuccess={()=>setShowModal(false)} onCancel={()=>setShowModal(false)} />
            </Modal>
        </DashboardLayout>
    );
}