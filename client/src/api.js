import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE || '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bbt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Optionally handle global errors, e.g., redirect on 401
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data).then(res => res.data),
  registerClient: (data) => api.post('/auth/register-client', data).then(res => res.data),
  me: () => api.get('/auth/me').then(res => res.data),
  logout: () => api.post('/auth/logout').then(res => res.data)
};

export const searchAPI = {
  query: (q) => api.get(`/search?q=${encodeURIComponent(q)}`).then(res => res.data)
};

export const notificationsAPI = {
  list: () => api.get('/notifications').then(res => res.data),
  markRead: (id) => api.put(`/notifications/${id}/read`).then(res => res.data)
};

export const quotationsAPI = {
  list: () => api.get('/quotations').then(res => res.data),
  get: (id) => api.get(`/quotations/${id}`).then(res => res.data),
  create: (data) => api.post('/quotations', data).then(res => res.data),
  addCosting: (id, data) => api.post(`/quotations/${id}/costing`, data).then(res => res.data),
  requestClarification: (id, message) => api.post(`/quotations/${id}/clarification`, { message }).then(res => res.data),
  forwardToAdmin: (id) => api.post(`/quotations/${id}/forward-to-admin`).then(res => res.data),
  approve: (id, adminRemarks) => api.post(`/quotations/${id}/approve`, { adminRemarks }).then(res => res.data),
  reject: (id, adminRemarks) => api.post(`/quotations/${id}/reject`, { adminRemarks }).then(res => res.data)
};

export const invoicesAPI = {
  list: () => api.get('/invoices').then(res => res.data),
  generate: (quotationId) => api.post(`/invoices/generate/${quotationId}`).then(res => res.data)
};

export const paymentsAPI = {
  list: () => api.get('/payments').then(res => res.data),
  create: (data) => api.post('/payments', data).then(res => res.data)
};

export const clientsAPI = {
  list: () => api.get('/clients').then(res => res.data)
};

export const servicesAPI = {
  list: () => api.get('/services').then(res => res.data),
  create: (data) => api.post('/services', data).then(res => res.data),
  update: (id, data) => api.put(`/services/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/services/${id}`).then(res => res.data)
};

export const usersAPI = {
  list: () => api.get('/users').then(res => res.data)
};

export default api;
