import api from './api';

export const getCatalogue = (account_type) =>
  api.get('/catalogue', { params: { account_type } });
