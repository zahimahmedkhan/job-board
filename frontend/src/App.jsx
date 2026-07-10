import React, { useEffect, useState } from 'react';
import {
  signup, login, getJobs, getJob, postJob, getMyJobs,
  getApplicants, applyToJob, getMyApplications,
} from './api.js';

function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('candidate');
  const [form, setForm] = useState({ name: '', email: '', password: '', companyName: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = mode === 'login'
        ? await login(form.email, form.password)
        : await signup({ ...form, role });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onAuthed(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>HireHub</h1>
        <p className="auth-subtitle">Find jobs, or find talent for your team.</p>

        {mode === 'signup' && (
          <div className="role-toggle">
            <button type="button" className={role === 'candidate' ? 'active' : ''} onClick={() => setRole('candidate')}>Candidate</button>
            <button type="button" className={role === 'company' ? 'active' : ''} onClick={() => setRole('company')}>Company</button>
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label>
              {role === 'company' ? 'Your name' : 'Full name'}
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </label>
          )}
          {mode === 'signup' && role === 'company' && (
            <label>
              Company Name
              <input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} required />
            </label>
          )}
          <label>
            Email
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          </label>
          <button type="submit" className="primary-btn" disabled={busy}>
            {busy ? <> <span className="loading-spinner"></span> Please wait… </> : mode === 'login' ? 'Login' : 'Signup'}
          </button>
        </form>
        <button className="link-btn" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  );
}

function JobCard({ job, onOpen }) {
  return (
    <button className="job-card" onClick={() => onOpen(job.id)}>
      <span className="job-type-tag">{job.job_type}</span>
      <h3>{job.title}</h3>
      <p className="company-name">{job.company_name}</p>
      <p className="job-meta">{job.location || 'Remote'} {job.salary && `· ${job.salary}`}</p>
    </button>
  );
}

function JobList({ onOpen }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getJobs().then(setJobs).finally(() => setLoading(false)); }, []);

  if (loading) return <p className="status-msg"><span className="loading-spinner"></span>Loading jobs…</p>;
  if (jobs.length === 0) return <div className="empty-state"><h3>No jobs posted yet</h3><p>Be the first to post a job!</p></div>;

  return (
    <div className="job-grid">
      {jobs.map(job => <JobCard key={job.id} job={job} onOpen={onOpen} />)}
    </div>
  );
}

function JobDetail({ jobId, user, onBack }) {
  const [job, setJob] = useState(null);
  const [coverNote, setCoverNote] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { getJob(jobId).then(setJob); }, [jobId]);

  async function handleApply(e) {
    e.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      await applyToJob(jobId, coverNote);
      setStatus('success');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!job) return <p className="status-msg"><span className="loading-spinner"></span>Loading…</p>;

  return (
    <div className="detail-view">
      <button className="back-btn" onClick={onBack}>&larr; Back to jobs</button>
      <span className="job-type-tag">{job.job_type}</span>
      <h2>{job.title}</h2>
      <p className="company-name">{job.company_name} · {job.location || 'Remote'} {job.salary && `· ${job.salary}`}</p>
      <p className="job-description">{job.description}</p>

      {user?.role === 'candidate' && (
        <div className="apply-box">
          <h4>Apply to this job</h4>
          {status === 'success' ? (
            <p className="success-msg">Application submitted!</p>
          ) : (
            <form onSubmit={handleApply}>
              {status && status !== 'success' && <p className="form-error">{status}</p>}
              <textarea
                placeholder="Write a short cover note (optional)…"
                rows={4}
                value={coverNote}
                onChange={e => setCoverNote(e.target.value)}
              />
              <button type="submit" className="primary-btn" disabled={busy}>
                {busy ? <> <span className="loading-spinner"></span> Submitting… </> : 'Apply'}
              </button>
            </form>
          )}
        </div>
      )}
      {!user && <p className="status-msg">Log in to apply.</p>}
    </div>
  );
}

function PostJobForm({ onPosted }) {
  const [form, setForm] = useState({ title: '', description: '', location: '', salary: '', jobType: 'Full-time' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await postJob(form);
      setForm({ title: '', description: '', location: '', salary: '', jobType: 'Full-time' });
      onPosted();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="post-job-form" onSubmit={handleSubmit}>
      <h2>Post a New Job</h2>
      {error && <p className="form-error">{error}</p>}
      <label>
        Job Title
        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
      </label>
      <label>
        Description
        <textarea rows={5} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
      </label>
      <div className="form-row">
        <label>
          Location
          <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Karachi / Remote" />
        </label>
        <label className="salary-input-wrapper">
          Salary
          <input value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} placeholder="80,000 - 120,000" />
        </label>
      </div>
      <label>
        Job Type
        <select value={form.jobType} onChange={e => setForm({ ...form, jobType: e.target.value })}>
          <option>Full-time</option>
          <option>Part-time</option>
          <option>Contract</option>
          <option>Internship</option>
        </select>
      </label>
      <button type="submit" className="primary-btn" disabled={busy}>
        {busy ? <> <span className="loading-spinner"></span> Posting… </> : 'Post Job'}
      </button>
    </form>
  );
}

function MyJobs() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    getMyJobs().then(setJobs).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function viewApplicants(job) {
    setSelectedJob(job);
    setApplicants(await getApplicants(job.id));
  }

  if (selectedJob) {
    return (
      <div className="detail-view">
        <button className="back-btn" onClick={() => setSelectedJob(null)}>&larr; Back to my jobs</button>
        <h2>{selectedJob.title} — Applicants</h2>
        {applicants.length === 0 ? (
          <div className="empty-state"><h3>No applicants yet</h3><p>Share the job to attract candidates.</p></div>
        ) : (
          <ul className="applicants-list">
            {applicants.map(a => (
              <li key={a.id} className="applicant-card">
                <strong>{a.name}</strong> <span className="applicant-email">({a.email})</span>
                {a.cover_note && <p>{a.cover_note}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (loading) return <p className="status-msg"><span className="loading-spinner"></span>Loading…</p>;
  if (jobs.length === 0) return <div className="empty-state"><h3>No jobs posted yet</h3><p>Get started by posting your first job.</p></div>;

  return (
    <div className="my-jobs-list">
      {jobs.map(job => (
        <div key={job.id} className="my-job-row">
          <div>
            <h3>{job.title}</h3>
            <p className="job-meta">{job.location || 'Remote'} · {job.job_type}</p>
          </div>
          <button className="secondary-btn" onClick={() => viewApplicants(job)}>View Applicants</button>
        </div>
      ))}
    </div>
  );
}

function MyApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getMyApplications().then(setApps).finally(() => setLoading(false)); }, []);

  if (loading) return <p className="status-msg"><span className="loading-spinner"></span>Loading…</p>;
  if (apps.length === 0) return <div className="empty-state"><h3>No applications yet</h3><p>Start browsing jobs and apply to get started.</p></div>;

  return (
    <ul className="applications-list">
      {apps.map(a => (
        <li key={a.id} className="application-card">
          <h3>{a.title}</h3>
          <p className="job-meta">{a.company_name} · {a.location || 'Remote'}</p>
        </li>
      ))}
    </ul>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const [view, setView] = useState('browse');
  const [jobId, setJobId] = useState(null);

  function logout() {
    localStorage.clear();
    setUser(null);
    setView('browse');
  }

  if (!user) {
    return <AuthScreen onAuthed={setUser} />;
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <h1 onClick={() => { setJobId(null); setView('browse'); }}>HireHub</h1>
        <nav>
          <button className={view === 'browse' ? 'nav-active' : ''} onClick={() => { setJobId(null); setView('browse'); }}>Browse Jobs</button>
          {user.role === 'company' && (
            <button className={view === 'post' ? 'nav-active' : ''} onClick={() => { setJobId(null); setView('post'); }}>Post a Job</button>
          )}
          {user.role === 'company' && (
            <button className={view === 'myjobs' ? 'nav-active' : ''} onClick={() => { setJobId(null); setView('myjobs'); }}>My Jobs</button>
          )}
          {user.role === 'candidate' && (
            <button className={view === 'myapps' ? 'nav-active' : ''} onClick={() => { setJobId(null); setView('myapps'); }}>My Applications</button>
          )}
          <span className="user-badge">{user.role === 'company' ? 'Company' : 'Candidate'}</span>
          <button className="link-btn danger" onClick={logout}>Logout</button>
        </nav>
      </header>

      <main>
        {view === 'browse' && <JobList onOpen={id => { setJobId(id); setView('detail'); }} />}
        {view === 'detail' && jobId && <JobDetail jobId={jobId} user={user} onBack={() => { setJobId(null); setView('browse'); }} />}
        {view === 'post' && <PostJobForm onPosted={() => setView('myjobs')} />}
        {view === 'myjobs' && <MyJobs />}
        {view === 'myapps' && <MyApplications />}
      </main>
    </div>
  );
}