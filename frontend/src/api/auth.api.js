import api from './axiosInstance.js';

export const loginApi = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    return data;   // { user, token }
};

export const getMeApi = () => api.get('/auth/me');