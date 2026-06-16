import api from './api';

export const confirmPayment = (request_id, payment_reference) =>
  api.post('/payment/confirm', { request_id, payment_reference });
