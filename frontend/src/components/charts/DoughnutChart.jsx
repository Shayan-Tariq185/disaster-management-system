import { Doughnut } from 'react-chartjs-2';

const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 16 } } },
};

export default function DoughnutChart({ data, options = {}, height = 220 }) {
    return (
        <div style={{ height }}>
            <Doughnut data={data} options={{ ...defaultOptions, ...options }} />
        </div>
    );
}