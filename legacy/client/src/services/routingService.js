import api from './api';

export const getRules   = () => api.get('/routing');
export const saveRule   = (document_type, assigned_to) => api.put('/routing', { document_type, assigned_to });
export const deleteRule = (id) => api.delete(`/routing/${id}`);
