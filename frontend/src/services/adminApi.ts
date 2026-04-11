import api from './api';

export const adminAuth = {
  login: (email: string, password: string) => api.post('/auth/admin/login', { email, password }),
};

export const adminDashboard = {
  stats: () => api.get('/admin'),
  deliveryToday: (date?: string) => api.get('/admin/delivery/today', { params: { date } }),
  updateCellStatus: (id: number, status: string, note?: string) =>
    api.patch(`/admin/delivery/cells/${id}`, { status, note }),
  bulkDeliver: (date: string, meal_type?: string) =>
    api.post('/admin/delivery/bulk-deliver', { date, meal_type }),
  refreshOtp: (id: number) =>
    api.post(`/admin/delivery/cells/${id}/refresh-otp`),
};

export const adminSubscriptions = {
  list: (params?: any) => api.get('/admin/subscriptions', { params }),
  get: (id: number) => api.get(`/admin/subscriptions/${id}`),
  cancel: (id: number, reason?: string) => api.post(`/admin/subscriptions/${id}/cancel`, { reason }),
  updateCutoff: (id: number, data: any) => api.patch(`/admin/subscriptions/${id}/cutoff`, data),
};

export const adminSkip = {
  list: (status?: string) => api.get('/admin/skip', { params: { status } }),
  approve: (id: number, note?: string) => api.post(`/admin/skip/${id}/approve`, { note }),
  deny: (id: number, note?: string) => api.post(`/admin/skip/${id}/deny`, { note }),
};

export const adminMenu = {
  get: () => api.get('/admin/menu'),
  items: () => api.get('/admin/menu/items'),
  updateSlot: (id: number, item_id: number) => api.patch(`/admin/menu/${id}`, { item_id }),
  addAlternative: (menuId: number, item_id: number) => api.post(`/admin/menu/${menuId}/alternatives`, { item_id }),
  removeAlternative: (id: number) => api.delete(`/admin/menu/alternatives/${id}`),
  createItem: (data: any) => api.post('/admin/menu/items', data),
  uploadImage: (data: string) => api.post('/upload/meal-image', { data }),
};

export const adminSupport = {
  tickets: (status?: string) => api.get('/admin/support/tickets', { params: { status } }),
  getTicket: (id: number) => api.get(`/admin/support/tickets/${id}`),
  reply: (id: number, message: string) => api.post(`/admin/support/tickets/${id}/reply`, { message }),
  updateStatus: (id: number, status: string) => api.patch(`/admin/support/tickets/${id}/status`, { status }),
};

export const adminSettings = {
  get: () => api.get('/admin/settings'),
  update: (data: any) => api.patch('/admin/settings', data),
  updateDiscount: (id: number, discount_amount: number) => api.patch(`/admin/settings/discounts/${id}`, { discount_amount }),
  auditLog: (limit?: number) => api.get('/admin/settings/audit', { params: { limit } }),
  broadcast: (data: any) => api.post('/admin/settings/notifications/broadcast', data),
  // Streak rewards
  getStreakRewards: () => api.get('/admin/settings/streak-rewards'),
  createStreakReward: (data: any) => api.post('/admin/settings/streak-rewards', data),
  updateStreakReward: (id: number, data: any) => api.patch(`/admin/settings/streak-rewards/${id}`, data),
  deleteStreakReward: (id: number) => api.delete(`/admin/settings/streak-rewards/${id}`),
  // Promo codes
  getOffers: () => api.get('/admin/settings/offers'),
  createOffer: (data: any) => api.post('/admin/settings/offers', data),
  updateOffer: (id: number, data: any) => api.patch(`/admin/settings/offers/${id}`, data),
};

export const adminHolidays = {
  list: (year?: number) => api.get('/admin/holidays', { params: { year } }),
  create: (data: { date: string; name: string; is_active?: boolean }) =>
    api.post('/admin/holidays', data),
  update: (id: number, data: { name?: string; is_active?: boolean }) =>
    api.patch(`/admin/holidays/${id}`, data),
  remove: (id: number) => api.delete(`/admin/holidays/${id}`),
  holidaySkip: (date: string) =>
    api.post('/admin/delivery/holiday-skip', { date }),
};

export const adminLedger = {
  list: (params?: { user_id?: number; entry_type?: string; limit?: number; offset?: number }) =>
    api.get('/admin/ledger', { params }),
  credit: (data: { user_id: number; amount: number; description: string; note?: string }) =>
    api.post('/admin/ledger/credit', data),
  debit: (data: { user_id: number; amount: number; description: string; note?: string }) =>
    api.post('/admin/ledger/debit', data),
};
