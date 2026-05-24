import api from './axiosInstance';

export const getUsers = () => api.get('/users');

export const createUser = (userData) => api.post('/users', userData);

export const toggleUserStatus = (id) => api.patch(`/users/${id}/toggle`);

export const getRoles = () => api.get('/users/roles');
