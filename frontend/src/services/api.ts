import axios from 'axios';
import { translateToGourmet } from '../utils/GourmetTranslator';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  const isAdminRequest = config.url?.startsWith('/admin') || window.location.pathname.startsWith('/admin');
  const token = isAdminRequest 
    ? (localStorage.getItem('tb_admin_token') || localStorage.getItem('tb_token'))
    : localStorage.getItem('tb_token');
    
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    // Handling unauthorised access - redirect to login
    if (err.response?.status === 401) {
      const isAdmin = window.location.pathname.startsWith('/admin');
      localStorage.removeItem('tb_token');
      if (isAdmin) {
        localStorage.removeItem('tb_admin_token');
        window.location.href = '/admin/login';
      } else {
        window.location.href = '/login';
      }
      return Promise.reject(err);
    }

    // Best in World: Sensorial Error Orchestration
    // Technical culprits are translated into Gourmet narratives
    const gourmet = translateToGourmet(err);
    const requestId = err.response?.data?.requestId || err.response?.headers?.['x-request-id'];

    window.dispatchEvent(new CustomEvent('diamond-sensorial-error', {
      detail: { title: gourmet.title, message: gourmet.message, requestId }
    }));

    return Promise.reject(err);
  }
);

export default api;

// ── Public Config (no auth needed) ───────────────────────────────────────────
export const config = {
  getPublic: () => api.get('/config/public'),
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  googleLogin: (id_token: string, referral_code?: string) =>
    api.post('/auth/google', { id_token, ...(referral_code ? { referral_code } : {}) }),
  me: () => api.get('/auth/me'),
  updateProfile: (data: { wallet_auto_apply?: boolean; delivery_address?: string; notification_mutes?: string[] }) =>
    api.patch('/auth/me', data),
  deleteAccount: () => api.delete('/auth/me'),
  sendOtp: (phone: string) => api.post('/auth/phone/otp', { phone }),
  verifyPhone: (phone: string, otp: string) => api.post('/auth/phone/verify', { phone, otp }),
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
  resume: (id: number, shiftDates: boolean) => api.post(`/subscriptions/${id}/resume`, { shiftDates }),
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
  createTicket: (data: { subject: string; message: string; attachment_url?: string }) => 
    api.post('/support/tickets', data),
  getMessages: (id: number) => api.get(`/support/tickets/${id}/messages`),
  sendMessage: (id: number, message: string, attachment_url?: string) => 
    api.post(`/support/tickets/${id}/messages`, { message, attachment_url }),
};

// ── Upload ────────────────────────────────────────────────────────────────────
export const upload = {
  image: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ── Delivery OTP ──────────────────────────────────────────────────────────────
export const delivery = {
  getOtp: (meal_cell_id: number) => api.get(`/delivery/otp/${meal_cell_id}`),
  verifyOtp: (meal_cell_id: number, otp: string) =>
    api.post('/delivery/otp/verify', { meal_cell_id, otp }),
};

// ── Ratings ───────────────────────────────────────────────────────────────────
export const ratings = {
  submit: (meal_cell_id: number, rating: number, note?: string) =>
    api.post('/ratings', { meal_cell_id, rating, note }),
  list: () => api.get('/ratings'),
};

// ── Referrals ─────────────────────────────────────────────────────────────────
export const referrals = {
  myReferrals: () => api.get('/referrals'),
};

// ── Addresses ─────────────────────────────────────────────────────────────────
export const addresses = {
  list: () => api.get('/addresses'),
  create: (data: { label: string; address: string; is_default: boolean }) => api.post('/addresses', data),
  update: (id: number, data: { label?: string; address?: string; is_default?: boolean }) => api.patch(`/addresses/${id}`, data),
  remove: (id: number) => api.delete(`/addresses/${id}`),
};

// ── Vouchers ──────────────────────────────────────────────────────────────────
export const vouchers = {
  list: () => api.get('/vouchers'),
  inaugurate: (data: { voucher_id: number; date: string; subscription_id: number }) => 
    api.post('/vouchers/inaugurate', data),
  gift: (id: number, target_person_id: number) => 
    api.post(`/vouchers/${id}/gift`, { target_person_id }),
};
