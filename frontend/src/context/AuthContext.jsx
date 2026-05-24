import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser]     = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('dis_user');
            if (saved) setUser(JSON.parse(saved));
        } catch {/* ignore */}
        setLoading(false);
    }, []);

    const login = (userData, token) => {
        localStorage.setItem('dis_user',  JSON.stringify(userData));
        localStorage.setItem('dis_token', token);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('dis_user');
        localStorage.removeItem('dis_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}