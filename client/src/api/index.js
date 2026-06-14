import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('idlink_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401: clear session and redirect to clerk login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/clerk') {
      localStorage.removeItem('idlink_token');
      localStorage.removeItem('idlink_staff');
      window.location.href = '/clerk';
    }
    return Promise.reject(err);
  }
);

// Public
export const searchDocuments  = (params)              => api.get('/search', { params });
export const getRegions        = ()                    => api.get('/regions');
export const initiateClaim     = (data)                => api.post('/claims', data);
export const verifyOTP         = (claimId, otp)        => api.post(`/claims/${claimId}/verify-otp`, { otp });
export const resendOTP         = (claimId)             => api.post(`/claims/${claimId}/resend-otp`);
export const pay               = (claimId, gatewayRef) => api.post(`/claims/${claimId}/pay`, { gateway_ref: gatewayRef });
export const subscribeAlert    = (data)                => api.post('/alerts', data);

// Auth
export const login          = (phone, password)        => api.post('/auth/login', { phone, password });
export const changePassword = (current, next)          => api.patch('/auth/change-password', { current_password: current, new_password: next });

// Upload
export const uploadPhoto = (file) => {
  const form = new FormData();
  form.append('photo', file);
  return api.post('/upload/photo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
};

// Clerk
export const logDocument         = (data)           => api.post('/clerk/documents', data);
export const getClerkDocuments   = (params)         => api.get('/clerk/documents', { params });
export const updateDocumentStatus = (id, status)   => api.patch(`/clerk/documents/${id}/status`, { status });
export const collectDocument     = (claimId, token) => api.post(`/clerk/claims/${claimId}/collect`, { qr_token: token });

// Admin
export const getStats          = ()       => api.get('/admin/stats');
export const getAdminDocuments = (params) => api.get('/admin/documents', { params });
export const getBranches       = ()       => api.get('/admin/branches');
export const createBranch      = (data)   => api.post('/admin/branches', data);
export const getStaff          = ()       => api.get('/admin/staff');
export const createStaff       = (data)   => api.post('/admin/staff', data);
