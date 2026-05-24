import api from './axiosInstance.js';

export const getApprovals    = (params)     => api.get('/approvals', { params });
export const processApproval = (id, data)   => api.patch(`/approvals/${id}`, data);