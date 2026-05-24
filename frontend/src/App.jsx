import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, PointElement,
    LineElement, ArcElement, Title, Tooltip, Legend, Filler
);

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <NotificationProvider>
                    <AppRoutes />
                </NotificationProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}