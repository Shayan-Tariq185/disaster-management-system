import { Menu, Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Navbar({ onToggle }) {
    const { user } = useAuth();
    return (
        <header className="bg-white border-b border-slate-200 h-14 flex items-center gap-4 px-4 sticky top-0 z-20">
            <button onClick={onToggle} className="text-slate-500 hover:text-slate-700 lg:hidden">
                <Menu className="w-5 h-5" />
            </button>
            <button onClick={onToggle} className="text-slate-500 hover:text-slate-700 hidden lg:block">
                <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1" />

            <button className="relative text-slate-500 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {user?.name?.[0] ?? '?'}
                </div>
                <div className="hidden sm:block">
                    <p className="text-sm font-medium text-slate-700 leading-tight">{user?.name}</p>
                    <p className="text-xs text-slate-400 leading-tight">{user?.role}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            </div>
        </header>
    );
}