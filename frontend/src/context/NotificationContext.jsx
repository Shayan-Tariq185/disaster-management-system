import { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const colors = {
        info:    'bg-blue-600',
        success: 'bg-emerald-600',
        error:   'bg-red-600',
        warning: 'bg-amber-500',
    };

    return (
        <NotificationContext.Provider value={{ addToast, removeToast }}>
            {children}
            <div className="fixed top-4 right-4 z-[9999] space-y-2 w-80">
                {toasts.map(t => (
                    <div key={t.id}
                         className={`flex items-center justify-between gap-3 text-white text-sm px-4 py-3 rounded-lg shadow-lg ${colors[t.type] || colors.info}`}>
                        <span>{t.message}</span>
                        <button onClick={() => removeToast(t.id)} className="text-white/80 hover:text-white">✕</button>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    return useContext(NotificationContext);
}