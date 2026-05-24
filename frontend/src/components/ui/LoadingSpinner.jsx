import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ fullPage, size = 6 }) {
    const cls = `w-${size} h-${size} animate-spin text-blue-600`;
    if (fullPage)
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70">
                <Loader2 className={cls} />
            </div>
        );
    return (
        <div className="flex justify-center py-8">
            <Loader2 className={cls} />
        </div>
    );
}