import api from './axiosInstance.js';

export const getIncidents = (params) => api.get('/incidents', { params });
export const getIncidentById = (id) => api.get(`/incidents/${id}`);
export const createIncident = (data) => api.post('/incidents', data);
export const updateIncidentStatus = (id, data) => api.patch(`/incidents/${id}/status`, data);
export const getDisasterEvents = () => api.get('/incidents/events/list');