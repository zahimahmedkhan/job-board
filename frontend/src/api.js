// api.js — talks to the Express backend running on EC2 (behind the ALB)
// IMPORTANT: after deploying, replace this with your ALB DNS name
const API_BASE = 'http://YOUR_ALB_DNS_NAME';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}

export const signup = (payload) =>
  fetch(`${API_BASE}/api/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(handle);

export const login = (email, password) =>
  fetch(`${API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then(handle);

export const getJobs = () => fetch(`${API_BASE}/api/jobs`).then(handle);

export const getJob = (id) => fetch(`${API_BASE}/api/jobs/${id}`).then(handle);

export const postJob = (payload) =>
  fetch(`${API_BASE}/api/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  }).then(handle);

export const getMyJobs = () =>
  fetch(`${API_BASE}/api/my-jobs`, { headers: authHeaders() }).then(handle);

export const getApplicants = (jobId) =>
  fetch(`${API_BASE}/api/jobs/${jobId}/applicants`, { headers: authHeaders() }).then(handle);

export const applyToJob = (jobId, coverNote) =>
  fetch(`${API_BASE}/api/jobs/${jobId}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ coverNote }),
  }).then(handle);

export const getMyApplications = () =>
  fetch(`${API_BASE}/api/my-applications`, { headers: authHeaders() }).then(handle);
