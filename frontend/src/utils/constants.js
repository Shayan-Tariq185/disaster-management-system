export const ROLES = {
    ADMIN:     'Admin',
    OPERATOR:  'Operator',
    FIELD:     'Field Officer',
    WAREHOUSE: 'Warehouse Manager',
    FINANCE:   'Finance Officer',
};

export const ROLE_DASHBOARD = {
    [ROLES.ADMIN]:     '/admin',
    [ROLES.OPERATOR]:  '/operator',
    [ROLES.FIELD]:     '/field',
    [ROLES.WAREHOUSE]: '/warehouse',
    [ROLES.FINANCE]:   '/finance',
};

export const SEVERITY = {
    Critical: { label: 'Critical', bg: 'bg-red-100',    text: 'text-red-700' },
    High:     { label: 'High',     bg: 'bg-orange-100', text: 'text-orange-700' },
    Medium:   { label: 'Medium',   bg: 'bg-yellow-100', text: 'text-yellow-700' },
    Low:      { label: 'Low',      bg: 'bg-green-100',  text: 'text-green-700' },
};

export const INCIDENT_STATUS = {
    Pending:   { label: 'Pending',   bg: 'bg-yellow-100',  text: 'text-yellow-700'  },
    Verified:  { label: 'Verified',  bg: 'bg-blue-100',    text: 'text-blue-700'    },
    Assigned:  { label: 'Assigned',  bg: 'bg-purple-100',  text: 'text-purple-700'  },
    Resolved:  { label: 'Resolved',  bg: 'bg-emerald-100', text: 'text-emerald-700' },
    Cancelled: { label: 'Cancelled', bg: 'bg-slate-100',   text: 'text-slate-600'   },
};

export const TEAM_STATUS = {
    Available: { bg: 'bg-green-100',  text: 'text-green-700' },
    Assigned:  { bg: 'bg-blue-100',   text: 'text-blue-700'  },
    Busy:      { bg: 'bg-orange-100', text: 'text-orange-700'},
    Completed: { bg: 'bg-slate-100',  text: 'text-slate-600' },
};

export const APPROVAL_STATUS = {
    Pending:  { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    Approved: { bg: 'bg-green-100',  text: 'text-green-700'  },
    Rejected: { bg: 'bg-red-100',    text: 'text-red-700'    },
};

export const TX_TYPE = {
    Donation:    { bg: 'bg-green-100',  text: 'text-green-700'  },
    Expense:     { bg: 'bg-red-100',    text: 'text-red-700'    },
    Procurement: { bg: 'bg-amber-100',  text: 'text-amber-700'  },
};

// Mock users removed as we are now using the database API
export const MOCK_USERS = [];

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';