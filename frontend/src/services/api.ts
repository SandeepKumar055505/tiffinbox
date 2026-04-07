import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('tb_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      const isAdmin = window.location.pathname.startsWith('/admin');
      localStorage.removeItem('tb_token');
      if (isAdmin) {
        localStorage.removeItem('tb_admin_token');
        window.location.href = '/admin/login';
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  googleLogin: (id_token: string) => api.post('/auth/google', { id_token }),
  me: () => api.get('/auth/me'),
  updateProfile: (data: { wallet_auto_apply?: boolean; delivery_address?: string }) =>
    api.patch('/auth/me', data),
};

// ── Persons ───────────────────────────────────────────────────────────────────
export const persons = {
  list: () => api.get('/persons'),
  create: (data: any) => api.post('/persons', data),
  update: (id: number, data: any) => api.patch(`/persons/${id}`, data),
  remove: (id: number) => api.delete(`/persons/${id}`),
};

// ── Menu ──────────────────────────────────────────────────────────────────────
export const menu = {
  week: () => api.get('/menu/week'),
};

// ── Subscriptions ─────────────────────────────────────────────────────────────
export const subscriptions = {
  list: () => api.get('/subscriptions'),
  get: (id: number) => api.get(`/subscriptions/${id}`),
  priceQuote: (data: any) => api.post('/subscriptions/price-quote', data),
  validatePromo: (code: string) => api.post('/subscriptions/validate-promo', { code }),
  create: (data: any) => api.post('/subscriptions', data),
  cancel: (id: number, reason?: string) => api.post(`/subscriptions/${id}/cancel`, { reason }),
  pause: (id: number, reason?: string) => api.post(`/subscriptions/${id}/pause`, { reason }),
  resume: (id: number) => api.post(`/subscriptions/${id}/resume`),
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const payments = {
  createOrder: (subscription_id: number) => api.post('/payments/create-order', { subscription_id }),
  verify: (data: any) => api.post('/payments/verify', data),
  activateFree: (subscription_id: number) => api.post('/payments/activate-free', { subscription_id }),
};

// ── Wallet ────────────────────────────────────────────────────────────────────
export const wallet = {
  balance: () => api.get('/wallet/balance'),
  entries: (limit?: number) => api.get('/wallet/entries', { params: { limit } }),
};

// ── Skip ──────────────────────────────────────────────────────────────────────
export const skip = {
  request: (meal_cell_id: number) => api.post('/skip', { meal_cell_id }),
  list: () => api.get('/skip'),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notifications = {
  list: () => api.get('/notifications'),
  markRead: (id: number) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

// ── Support ───────────────────────────────────────────────────────────────────
export const support = {
  listTickets: () => api.get('/support/tickets'),
  createTicket: (data: any) => api.post('/support/tickets', data),
  getMessages: (id: number) => api.get(`/support/tickets/${id}/messages`),
  sendMessage: (id: number, message: string) => api.post(`/support/tickets/${id}/messages`, { message }),
};
