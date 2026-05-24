import api from './axiosInstance.js';

export const getTeams         = ()       => api.get('/rescue/teams');
export const getAssignments   = (params) => api.get('/rescue/assignments', { params });
export const assignTeam       = (data)   => api.post('/rescue/assign', data);
export const updateAssignment = (id, data) => api.patch(`/rescue/assignments/${id}`, data);