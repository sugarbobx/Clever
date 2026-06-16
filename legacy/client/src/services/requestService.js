import api from './api';

export const createRequest   = (formData) => api.post('/requests', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getRequests     = () => api.get('/requests');
export const getRequest      = (id) => api.get(`/requests/${id}`);
export const updateStatus    = (id, status) => api.patch(`/requests/${id}/status`, { status });
export const cancelRequest   = (id) => api.patch(`/requests/${id}/cancel`);
export const assignRequest   = (id, assigned_to) => api.patch(`/requests/${id}/assign`, { assigned_to });
export const uploadDeliverable = (id, formData) => api.post(`/requests/${id}/deliverable`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updatePriority  = (id, priority) => api.patch(`/requests/${id}/priority`, { priority });
export const updateDueDate   = (id, due_date) => api.patch(`/requests/${id}/due-date`, { due_date });
export const getNotes        = (id) => api.get(`/requests/${id}/notes`);
export const addNote         = (id, content) => api.post(`/requests/${id}/notes`, { content });
