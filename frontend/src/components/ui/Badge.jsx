export default function Badge({ label, bg = 'bg-slate-100', text = 'text-slate-600', size = 'sm' }) {
  const sz = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  return (
      <span className={`inline-flex items-center font-medium rounded-full ${sz} ${bg} ${text}`}>
      {label}
    </span>
  );
}