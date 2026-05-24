export const fmtDate = (d) =>
    new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });

export const fmtDateTime = (d) =>
    new Date(d).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });

export const fmtCurrency = (n) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

export const fmtNumber = (n) => new Intl.NumberFormat('en-PK').format(n);

export const truncate = (s, n = 45) => (s?.length > n ? s.slice(0, n) + '…' : s ?? '—');

export const timeAgo = (d) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};