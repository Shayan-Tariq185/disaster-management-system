import api from './axiosInstance.js';

export const getDashboardStats     = ()       => api.get('/reports/dashboard-stats');
export const getIncidentStats      = (params) => api.get('/reports/incidents',           { params });
export const getIncidentsByProvince = ()      => api.get('/reports/incidents-by-province');
export const getFinancialReport    = ()       => api.get('/reports/finance');
export const getResourceReport     = ()       => api.get('/reports/resources');
export const getResponseTimes      = ()       => api.get('/reports/response-times');
export const getAuditLogs          = (params) => api.get('/reports/audit',               { params });