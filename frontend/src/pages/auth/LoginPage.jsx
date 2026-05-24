import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { loginApi } from '../../api/auth.api.js';
import { ROLE_DASHBOARD, MOCK_USERS } from '../../utils/constants.js';

export default function LoginPage() {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState('');
    const { login } = useAuth();
    const navigate  = useNavigate();

    const onSubmit = async ({ email, password }) => {
        setLoading(true);
        setError('');
        try {
            const { user, token } = await loginApi(email, password);
            login(user, token);
            navigate(ROLE_DASHBOARD[user.role] || '/', { replace: true });
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Disaster Response MIS</h1>
                    <p className="text-slate-400 text-sm mt-1">Secure Government Portal — NDMA</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <h2 className="text-lg font-semibold text-slate-800 mb-5">Sign in to your account</h2>

                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5 mb-4">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <label className="label">Email Address</label>
                            <input type="email"
                                   {...register('email', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })}
                                   className="input" placeholder="you@disaster.gov.pk" autoFocus />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                        </div>
                        <div>
                            <label className="label">Password</label>
                            <input type="password"
                                   {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
                                   className="input" placeholder="••••••••" />
                            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                        </div>
                        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : 'Sign In'}
                        </button>
                    </form>

                </div>
            </div>
        </div>
    );
}