import { useAuth } from './useAuth.js';
import { ROLES } from '../utils/constants.js';

export default function usePermissions() {
    const { user } = useAuth();
    const role = user?.role;

    return {
        isAdmin:     role === ROLES.ADMIN,
        isOperator:  role === ROLES.OPERATOR,
        isField:     role === ROLES.FIELD,
        isWarehouse: role === ROLES.WAREHOUSE,
        isFinance:   role === ROLES.FINANCE,
        can: (allowedRoles) => allowedRoles.includes(role),
        role,
    };
}