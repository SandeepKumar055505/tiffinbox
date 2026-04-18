import axios from 'axios';

const driverApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

driverApi.interceptors.request.use(config => {
  const token = localStorage.getItem('tb_driver_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const driverAuth = {
  login: (pin: string) => driverApi.post('/driver/auth', { pin }),
};

export const driverDelivery = {
  manifest: (date?: string) => driverApi.get('/driver/manifest', { params: { date } }),
  updateStatus: (id: number, data: { status: string; fail_reason?: string; driver_name?: string }) =>
    driverApi.patch(`/driver/cells/${id}/status`, data),
};

export default driverApi;
