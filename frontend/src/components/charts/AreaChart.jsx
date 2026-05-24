import { Line } from 'react-chartjs-2';

const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 16 } } },
    scales: {
        x: { grid: { display: false } },
        y: { grid: { color: '#f1f5f9' } },
    },
};

export function makeAreaDataset(label, data, color) {
    return {
        label,
        data,
        borderColor: color,
        backgroundColor: color + '20',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
    };
}

export default function AreaChart({ data, options = {}, height = 220 }) {
    return (
        <div style={{ height }}>
            <Line data={data} options={{ ...defaultOptions, ...options }} />
        </div>
    );
}