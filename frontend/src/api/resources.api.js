import api from './axiosInstance.js';

export const getInventory     = (params) => api.get('/resources/inventory',   { params });
export const getWarehouses    = ()        => api.get('/resources/warehouses');
export const getAllocations    = (params) => api.get('/resources/allocations', { params });
export const allocateResource = (data)   => api.post('/resources/allocate', data);
export const getLowStock      = ()        => api.get('/resources/low-stock');