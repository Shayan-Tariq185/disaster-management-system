import { useState } from 'react';
import { User, Lock, Bell, CheckCircle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { useAuth }     from '../../context/AuthContext.jsx';
import { fmtDate }     from '../../utils/formatters.js';

export default function ProfileSettings() {
    const { user } = useAuth();
    const [saved,  setSaved]  = useState(false);
    const [name,   setName]   = useState(user?.name || '');
    const [notifs, setNotifs] = useState(true);

    const handleSave = async (e) => {
        e.preventDefault();
        await new Promise(r => setTimeout(r, 600));
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <DashboardLayout>
            <div className="max-w-2xl space-y-5">
                <div><h1 className="page-title">Profile & Settings</h1><p className="page-subtitle">Manage your account and preferences</p></div>

                {saved && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3">
                        <CheckCircle className="w-4 h-4" /> Changes saved successfully.
                    </div>
                )}

                {/* Profile */}
                <div className="card space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                        <User className="w-5 h-5 text-slate-400" />
                        <h2 className="text-sm font-semibold text-slate-700">Account Information</h2>
                    </div>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-blue-600 text-white text-2xl font-bold flex items-center justify-center flex-shrink-0">
                                {user?.name?.[0]}
                            </div>
                            <div>
                                <p className="font-semibold text-slate-800">{user?.name}</p>
                                <p className="text-sm text-slate-400">{user?.email}</p>
                            </div>
                        </div>
                        <div><label className="label">Full Name</label>
                            <input value={name} onChange={e=>setName(e.target.value)} className="input" /></div>
                        <div><label className="label">Email Address</label>
                            <input type="email" defaultValue={user?.email} className="input" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="label">Role</label>
                                <input readOnly value={user?.role} className="input bg-slate-50 cursor-not-allowed" /></div>
                            <div><label className="label">Department</label>
                                <input readOnly value={user?.department || '—'} className="input bg-slate-50 cursor-not-allowed" /></div>
                        </div>
                        <div><label className="label">Member Since</label>
                            <input readOnly value={fmtDate(new Date().toISOString())} className="input bg-slate-50 cursor-not-allowed" /></div>
                        <button type="submit" className="btn-primary">Save Changes</button>
                    </form>
                </div>

                {/* Security */}
                <div className="card space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                        <Lock className="w-5 h-5 text-slate-400" />
                        <h2 className="text-sm font-semibold text-slate-700">Security</h2>
                    </div>
                    <div className="space-y-3">
                        <div><label className="label">Current Password</label><input type="password" className="input" placeholder="••••••••" /></div>
                        <div><label className="label">New Password</label><input type="password" className="input" placeholder="••••••••" /></div>
                        <div><label className="label">Confirm New Password</label><input type="password" className="input" placeholder="••••••••" /></div>
                        <button className="btn-secondary">Update Password</button>
                    </div>
                </div>

                {/* Preferences */}
                <div className="card space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                        <Bell className="w-5 h-5 text-slate-400" />np
                        <h2 className="text-sm font-semibold text-slate-700">Preferences</h2>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-700">Email Notifications</p>
                            <p className="text-xs text-slate-400">Receive alerts for critical incidents and approvals</p>
                        </div>
                        <button onClick={() => setNotifs(n => !n)}
                                className={`relative w-11 h-6 rounded-full transition-colors ${notifs ? 'bg-blue-600' : 'bg-slate-300'}`}>
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifs ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-700">Low Stock Alerts</p>
                            <p className="text-xs text-slate-400">Notify when inventory drops below threshold</p>
                        </div>
                        <button className="relative w-11 h-6 rounded-full bg-blue-600 transition-colors">
                            <span className="absolute top-1 translate-x-6 w-4 h-4 bg-white rounded-full shadow" />
                        </button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}