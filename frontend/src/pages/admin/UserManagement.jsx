import { useState, useEffect } from 'react';
import { UserPlus, Search, Loader2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import DataTable       from '../../components/ui/DataTable.jsx';
import Badge           from '../../components/ui/Badge.jsx';
import Modal           from '../../components/ui/Modal.jsx';
import { ROLES }       from '../../utils/constants.js';
import { fmtDate }     from '../../utils/formatters.js';
import { getUsers, createUser, toggleUserStatus, getRoles } from '../../api/users.api.js';

const ROLE_BADGE = {
    [ROLES.ADMIN]:     { bg: 'bg-purple-100', text: 'text-purple-700' },
    [ROLES.OPERATOR]:  { bg: 'bg-blue-100',   text: 'text-blue-700'   },
    [ROLES.FIELD]:     { bg: 'bg-emerald-100',text: 'text-emerald-700'},
    [ROLES.WAREHOUSE]: { bg: 'bg-amber-100',  text: 'text-amber-700'  },
    [ROLES.FINANCE]:   { bg: 'bg-rose-100',   text: 'text-rose-700'   },
};

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', roleName: '' });

    const fetchUsers = async () => {
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        getRoles().then(setRoles).catch(console.error);
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await createUser(formData);
            setShowModal(false);
            setFormData({ name: '', email: '', password: '', roleName: '' });
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to create user');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggle = async (id) => {
        try {
            await toggleUserStatus(id);
            fetchUsers();
        } catch (err) {
            alert('Failed to toggle status');
        }
    };

    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const columns = [
        { key: 'name',       label: 'Name',       render: (v, r) => (
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{v ? v[0] : '?'}</div>
                    <div>
                        <p className="font-medium text-slate-800">{v}</p>
                        <p className="text-xs text-slate-400">{r.email}</p>
                    </div>
                </div>
            )},
        { key: 'role',       label: 'Role',        render: (v) => <Badge label={v} {...(ROLE_BADGE[v] || {})} /> },
        { key: 'isActive',   label: 'Status',      render: (v) => v ? <Badge label="Active" bg="bg-emerald-100" text="text-emerald-700" /> : <Badge label="Disabled" bg="bg-red-100" text="text-red-700" /> },
        { key: 'createdAt',  label: 'Created',     render: (v) => <span className="text-slate-400 text-xs">{fmtDate(v)}</span> },
        { key: 'id',         label: 'Actions',     render: (_, r) => (
                <div className="flex gap-1.5">
                    <button className="btn btn-secondary btn-sm" onClick={() => handleToggle(r.id)}>
                        {r.isActive ? 'Disable' : 'Enable'}
                    </button>
                </div>
            )},
    ];

    return (
        <DashboardLayout>
            <div className="space-y-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="page-header mb-0">
                        <h1 className="page-title">User Management</h1>
                        <p className="page-subtitle">Manage system users and role assignments</p>
                    </div>
                    <button className="btn-primary" onClick={() => setShowModal(true)}>
                        <UserPlus className="w-4 h-4" /> Add User
                    </button>
                </div>

                <div className="card">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="relative flex-1 max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)}
                                   className="input pl-9" placeholder="Search users…" />
                        </div>
                        {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
                    </div>
                    <DataTable columns={columns} data={filtered} />
                </div>
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New User">
                <form onSubmit={handleCreate} className="space-y-4">
                    <div><label className="label">Full Name</label>
                        <input className="input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Full name" />
                    </div>
                    <div><label className="label">Email</label>
                        <input type="email" className="input" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@disaster.gov.pk" />
                    </div>
                    <div><label className="label">Role</label>
                        <select className="select" required value={formData.roleName} onChange={e => setFormData({...formData, roleName: e.target.value})}>
                            <option value="">Select Role</option>
                            {roles.map(r => <option key={r.roleID} value={r.roleName}>{r.roleName}</option>)}
                        </select>
                    </div>
                    <div><label className="label">Password</label>
                        <input type="password" required className="input" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" disabled={submitting} className="btn-primary flex-1">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create User'}
                        </button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    );
}