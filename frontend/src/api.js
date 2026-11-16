function getBaseUrl() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    if (!isLocal) {
      // On Render or any production deployment, always use relative '/api' on the same domain
      return '/api';
    }
  }

  const envUrl = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL;
  return envUrl || '/api';
}

const BASE = getBaseUrl();

function getToken() {
  return localStorage.getItem('token');
}

async function request(method, path, body, requiresAuth = true) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (requiresAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  return data;
}

// Authentication
export const register = (payload) => request('POST', '/auth/register', payload, false);
export const login = (payload) => request('POST', '/auth/login', payload, false);
export const getMe = () => request('GET', '/auth/me');
export const updateMyProfile = (payload) => request('PUT', '/auth/profile', payload);

// Notes
export const getNotes = (page = 1, limit = 5) =>
  request('GET', `/notes?page=${page}&limit=${limit}`);
export const getAllNotes = (page = 1, limit = 5) =>
  request('GET', `/notes/all?page=${page}&limit=${limit}`);
export const getNote = (id) => request('GET', `/notes/${id}`);
export const createNote = (payload) => request('POST', '/notes', payload);
export const updateNote = (id, payload) => request('PUT', `/notes/${id}`, payload);
export const deleteNote = (id) => request('DELETE', `/notes/${id}`);

// Users Management (Admin)
export const getUsers = (page = 1, limit = 5) =>
  request('GET', `/users?page=${page}&limit=${limit}`);
export const getUser = (id) => request('GET', `/users/${id}`);
export const createUser = (payload) => request('POST', '/users', payload);
export const updateUser = (id, payload) => request('PUT', `/users/${id}`, payload);
export const deleteUser = (id) => request('DELETE', `/users/${id}`);

// Posts (Public)
export const getPosts = (page = 1, limit = 5, userId = '') =>
  request('GET', `/posts?page=${page}&limit=${limit}${userId ? `&userId=${userId}` : ''}`, null, false);
export const createPost = (payload) => request('POST', '/posts', payload);
export const updatePost = (id, payload) => request('PUT', `/posts/${id}`, payload);
export const deletePost = (id) => request('DELETE', `/posts/${id}`);

// Aggregations
// Scenario 1: Group by Interests
export const groupByInterests = () => request('GET', '/aggregations/group-by-interests');

// Scenario 2: User Posts ($lookup)
export const getUserPosts = (userId) => request('GET', `/aggregations/user-posts/${userId}`, null, false);
