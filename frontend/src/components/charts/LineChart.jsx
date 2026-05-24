import { Line } from 'react-chartjs-2';

const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 16 } } },
    scales: {
        x: { grid: { display: false } },
        y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
    },
};

export default function LineChart({ data, options = {}, height = 220 }) {
    return (
        <div style={{ height }}>
            <Line data={data} options={{ ...defaultOptions, ...options }} />
        </div>
    );
}