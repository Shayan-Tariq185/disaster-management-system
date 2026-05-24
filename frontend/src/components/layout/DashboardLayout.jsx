import { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Navbar  from './Navbar.jsx';

export default function DashboardLayout({ children }) {
    const [open, setOpen] = useState(true);
    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            <Sidebar isOpen={open} onClose={() => setOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <Navbar onToggle={() => setOpen(o => !o)} />
                <main className="flex-1 overflow-y-auto p-5 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}