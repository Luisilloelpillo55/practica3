// API Configuration
export const API_CONFIG = {
  BASE_URL: typeof window !== 'undefined' ? 'http://localhost:3000' : 'http://localhost:3000',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

export const API_ENDPOINTS = {
  USERS: `${API_CONFIG.BASE_URL}/api/users`,
  GROUPS: `${API_CONFIG.BASE_URL}/api/groups`,
  TICKETS: `${API_CONFIG.BASE_URL}/api/tickets`,
};
