import { useNavigate } from 'react-router-dom';

export default function NotFound() {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center p-6">
            <p className="text-8xl font-bold text-slate-200">404</p>
            <h1 className="text-2xl font-bold text-slate-700 mt-2">Page Not Found</h1>
            <p className="text-slate-400 text-sm mt-2">The page you're looking for doesn't exist.</p>
            <button onClick={() => navigate(-1)} className="btn-primary mt-6">Go Back</button>
        </div>
    );
}