import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, AlertTriangle, Users, Package, Building2,
    DollarSign, CheckSquare, BarChart3, ScrollText, Zap,
    UserCog, Settings, LogOut, Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLES } from '../../utils/constants.js';

const { ADMIN, OPERATOR, FIELD, WAREHOUSE, FINANCE } = ROLES;
const ALL = [ADMIN, OPERATOR, FIELD, WAREHOUSE, FINANCE];

const NAV = [
    { to: '/admin',               label: 'Dashboard',    icon: LayoutDashboard, roles: [ADMIN] },
    { to: '/operator',            label: 'Dashboard',    icon: LayoutDashboard, roles: [OPERATOR] },
    { to: '/field',               label: 'Dashboard',    icon: LayoutDashboard, roles: [FIELD] },
    { to: '/warehouse',           label: 'Dashboard',    icon: LayoutDashboard, roles: [WAREHOUSE] },
    { to: '/finance',             label: 'Dashboard',    icon: LayoutDashboard, roles: [FINANCE] },
    { to: '/operator/incidents',  label: 'Incidents',    icon: AlertTriangle,   roles: [ADMIN, OPERATOR] },
    { to: '/field/teams',         label: 'Rescue Teams', icon: Users,           roles: [ADMIN, FIELD] },
    { to: '/warehouse/resources', label: 'Resources',    icon: Package,         roles: [ADMIN, WAREHOUSE] },
    { to: '/hospitals',           label: 'Hospitals',    icon: Building2,       roles: [ADMIN, OPERATOR] },
    { to: '/finance/transactions',label: 'Finance',      icon: DollarSign,      roles: [ADMIN, FINANCE] },
    { to: '/approvals',           label: 'Approvals',    icon: CheckSquare,     roles: ALL },
    { to: '/reports',             label: 'MIS Reports',  icon: BarChart3,       roles: [ADMIN, FINANCE] },
    { to: '/audit',               label: 'Audit Logs',   icon: ScrollText,      roles: [ADMIN] },
    { to: '/admin/users',         label: 'Users',        icon: UserCog,         roles: [ADMIN] },
];

export default function Sidebar({ isOpen, onClose }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const items = NAV.filter(n => n.roles.includes(user?.role));
    const seen  = new Set();
    const unique = items.filter(n => {
        const key = n.label === 'Dashboard' ? 'Dashboard' : n.to;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    const handleLogout = () => { logout(); navigate('/login'); };

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />
            )}
            <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-60 bg-slate-900 flex flex-col
        transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
                {/* Logo */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Shield className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white leading-tight">DisasterMIS</p>
                        <p className="text-xs text-slate-400">Gov. Portal</p>
                    </div>
                </div>

                {/* User pill */}
                <div className="mx-3 mt-3 px-3 py-2.5 bg-slate-800 rounded-lg">
                    <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.role}</p>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
                    {unique.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end
                            onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`
                            }
                        >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom */}
                <div className="px-3 py-3 border-t border-slate-700 space-y-0.5">
                    <NavLink to="/profile"
                             className="flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg text-sm">
                        <Settings className="w-4 h-4" /> Profile
                    </NavLink>
                    <button onClick={handleLogout}
                            className="flex items-center gap-3 px-3 py-2.5 w-full text-left text-slate-300 hover:bg-red-900/50 hover:text-red-400 rounded-lg text-sm">
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                </div>
            </aside>
        </>
    );
}