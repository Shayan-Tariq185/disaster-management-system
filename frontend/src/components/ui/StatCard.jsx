export default function StatCard({ title, value, subtitle, icon: Icon, iconBg = 'bg-blue-50', iconColor = 'text-blue-600', trend }) {
    return (
        <div className="card flex items-start gap-4">
            {Icon && (
                <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-500 font-medium truncate">{title}</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5 leading-none">{value}</p>
                {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
                {trend !== undefined && (
                    <p className={`text-xs mt-1 font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last week
                    </p>
                )}
            </div>
        </div>
    );
}