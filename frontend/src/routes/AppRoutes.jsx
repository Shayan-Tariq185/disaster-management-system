import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_DASHBOARD, ROLES } from '../utils/constants.js';
import ProtectedRoute from './ProtectedRoute.jsx';
import RoleRoute     from './RoleRoute.jsx';

import LoginPage           from '../pages/auth/LoginPage.jsx';
import AdminDashboard      from '../pages/admin/AdminDashboard.jsx';
import UserManagement      from '../pages/admin/UserManagement.jsx';
import OperatorDashboard   from '../pages/operator/OperatorDashboard.jsx';
import IncidentManagement  from '../pages/operator/IncidentManagement.jsx';
import FieldDashboard      from '../pages/field/FieldDashboard.jsx';
import RescueTeamManagement from '../pages/field/RescueTeamManagement.jsx';
import WarehouseDashboard  from '../pages/warehouse/WarehouseDashboard.jsx';
import ResourceManagement  from '../pages/warehouse/ResourceManagement.jsx';
import FinanceDashboard    from '../pages/finance/FinanceDashboard.jsx';
import FinanceManagement   from '../pages/finance/FinanceManagement.jsx';
import ApprovalWorkflow    from '../pages/shared/ApprovalWorkflow.jsx';
import HospitalCoordination from '../pages/shared/HospitalCoordination.jsx';
import MISReports          from '../pages/shared/MISReports.jsx';
import AuditLogs           from '../pages/shared/AuditLogs.jsx';
import ProfileSettings     from '../pages/shared/ProfileSettings.jsx';
import NotFound            from '../pages/NotFound.jsx';

const { ADMIN, OPERATOR, FIELD, WAREHOUSE, FINANCE } = ROLES;

function RoleRedirect() {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    return <Navigate to={ROLE_DASHBOARD[user.role] || '/login'} replace />;
}

function P({ children, roles }) {
    return (
        <ProtectedRoute>
            {roles ? <RoleRoute roles={roles}>{children}</RoleRoute> : children}
        </ProtectedRoute>
    );
}

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/login"         element={<LoginPage />} />
            <Route path="/"              element={<P><RoleRedirect /></P>} />

            <Route path="/admin"         element={<P roles={[ADMIN]}><AdminDashboard /></P>} />
            <Route path="/admin/users"   element={<P roles={[ADMIN]}><UserManagement /></P>} />

            <Route path="/operator"      element={<P roles={[ADMIN,OPERATOR]}><OperatorDashboard /></P>} />
            <Route path="/operator/incidents" element={<P roles={[ADMIN,OPERATOR]}><IncidentManagement /></P>} />

            <Route path="/field"         element={<P roles={[ADMIN,FIELD]}><FieldDashboard /></P>} />
            <Route path="/field/teams"   element={<P roles={[ADMIN,FIELD]}><RescueTeamManagement /></P>} />

            <Route path="/warehouse"     element={<P roles={[ADMIN,WAREHOUSE]}><WarehouseDashboard /></P>} />
            <Route path="/warehouse/resources" element={<P roles={[ADMIN,WAREHOUSE]}><ResourceManagement /></P>} />

            <Route path="/finance"       element={<P roles={[ADMIN,FINANCE]}><FinanceDashboard /></P>} />
            <Route path="/finance/transactions" element={<P roles={[ADMIN,FINANCE]}><FinanceManagement /></P>} />

            <Route path="/approvals"     element={<P><ApprovalWorkflow /></P>} />
            <Route path="/hospitals"     element={<P roles={[ADMIN,OPERATOR]}><HospitalCoordination /></P>} />
            <Route path="/reports"       element={<P roles={[ADMIN,FINANCE]}><MISReports /></P>} />
            <Route path="/audit"         element={<P roles={[ADMIN]}><AuditLogs /></P>} />
            <Route path="/profile"       element={<P><ProfileSettings /></P>} />

            <Route path="/unauthorized"  element={
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-6xl font-bold text-slate-300">403</p>
                        <p className="text-xl font-semibold text-slate-600 mt-2">Access Denied</p>
                    </div>
                </div>
            } />
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}