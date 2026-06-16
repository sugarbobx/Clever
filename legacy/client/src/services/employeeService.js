import api from './api';

export const getEmployees      = () => api.get('/employees');
export const createEmployee    = (data) => api.post('/employees', data);
export const toggleEmployee    = (id) => api.patch(`/employees/${id}/toggle`);
export const resetPassword     = (id, password) => api.patch(`/employees/${id}/password`, { password });
export const deleteEmployee    = (id) => api.delete(`/employees/${id}`);
