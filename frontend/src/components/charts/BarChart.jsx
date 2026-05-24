import { Bar } from 'react-chartjs-2';

function deepMerge(base, override) {
    const result = { ...base };
    for (const key of Object.keys(override || {})) {
        if (
            override[key] !== null &&
            typeof override[key] === 'object' &&
            !Array.isArray(override[key]) &&
            typeof base[key] === 'object' &&
            base[key] !== null &&
            !Array.isArray(base[key])
        ) {
            result[key] = deepMerge(base[key], override[key]);
        } else {
            result[key] = override[key];
        }
    }
    return result;
}

const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 16 } } },
    scales: {
        x: { grid: { display: false } },
        y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: { font: { size: 11 }, precision: 0, stepSize: 1 },
        },
    },
};

export default function BarChart({ data, options = {}, height = 220 }) {
    return (
        <div style={{ height }}>
            <Bar data={data} options={deepMerge(defaultOptions, options)} />
        </div>
    );
}