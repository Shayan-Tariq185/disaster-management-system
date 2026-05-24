import api from './axiosInstance.js';

export const getHospitals     = ()       => api.get('/hospitals');
export const getPatients      = (params) => api.get('/hospitals/patients', { params });
export const admitPatient     = (data)   => api.post('/hospitals/admit', data);
export const dischargePatient = (id)     => api.patch(`/hospitals/patients/${id}/discharge`);