import axios from 'axios';

const metaEnv = (import.meta as any).env || {};
const baseURL = metaEnv.VITE_API_URL
  ? `${metaEnv.VITE_API_URL.replace(/\/+$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
