import api from './axiosInstance.js';

export const getTransactions = (params) => api.get('/finance/transactions', { params });
export const getFinanceSummary = ()     => api.get('/finance/summary');
export const recordDonation  = (data)  => api.post('/finance/donations', data);
export const recordExpense   = (data)  => api.post('/finance/expenses', data);