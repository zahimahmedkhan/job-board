// server.js — Express backend for Job Board App
// Runs on EC2, connects to RDS MySQL

require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

app.get('/health', (req, res) => res.status(200).send('OK'));

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Token missing' });
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    req.userId = decoded.userId;
    req.role = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.role !== role) return res.status(403).json({ message: `Only ${role} accounts can do this` });
    next();
  };
}

// ---------- Signup ----------
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password, role, companyName } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (!['company', 'candidate'].includes(role)) {
      return res.status(400).json({ message: 'Role must be company or candidate' });
    }
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'This email is already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password, role, company_name) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, role, role === 'company' ? (companyName || name) : null]
    );
    const token = jwt.sign({ userId: result.insertId, role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: result.insertId, name, email, role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ---------- Login ----------
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ message: 'Invalid email or password' });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid email or password' });
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ---------- Public: list all jobs ----------
app.get('/api/jobs', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT jobs.*, users.company_name FROM jobs
      JOIN users ON jobs.company_id = users.id
      ORDER BY jobs.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ---------- Public: single job detail ----------
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT jobs.*, users.company_name FROM jobs
      JOIN users ON jobs.company_id = users.id
      WHERE jobs.id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Job not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ---------- Company: post a new job ----------
app.post('/api/jobs', authMiddleware, requireRole('company'), async (req, res) => {
  try {
    const { title, description, location, salary, jobType } = req.body;
    if (!title || !description) return res.status(400).json({ message: 'Title and description are required' });
    const [result] = await pool.execute(
      'INSERT INTO jobs (company_id, title, description, location, salary, job_type) VALUES (?, ?, ?, ?, ?, ?)',
      [req.userId, title, description, location || '', salary || '', jobType || 'Full-time']
    );
    res.status(201).json({ id: result.insertId, title, description, location, salary, job_type: jobType });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ---------- Company: jobs they've posted ----------
app.get('/api/my-jobs', authMiddleware, requireRole('company'), async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM jobs WHERE company_id = ? ORDER BY created_at DESC', [req.userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ---------- Company: view applicants for one of their jobs ----------
app.get('/api/jobs/:id/applicants', authMiddleware, requireRole('company'), async (req, res) => {
  try {
    const [jobRows] = await pool.execute('SELECT * FROM jobs WHERE id = ? AND company_id = ?', [req.params.id, req.userId]);
    if (jobRows.length === 0) return res.status(404).json({ message: 'Job not found or you do not own it' });

    const [applicants] = await pool.execute(`
      SELECT applications.id, applications.cover_note, applications.applied_at,
             users.name, users.email
      FROM applications
      JOIN users ON applications.candidate_id = users.id
      WHERE applications.job_id = ?
      ORDER BY applications.applied_at DESC
    `, [req.params.id]);
    res.json(applicants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ---------- Candidate: apply to a job ----------
app.post('/api/jobs/:id/apply', authMiddleware, requireRole('candidate'), async (req, res) => {
  try {
    const { coverNote } = req.body;
    await pool.execute(
      'INSERT INTO applications (job_id, candidate_id, cover_note) VALUES (?, ?, ?)',
      [req.params.id, req.userId, coverNote || '']
    );
    res.status(201).json({ message: 'Application submitted successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'You have already applied to this job' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ---------- Candidate: their own applications ----------
app.get('/api/my-applications', authMiddleware, requireRole('candidate'), async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT applications.id, applications.applied_at, jobs.title, jobs.location, users.company_name
      FROM applications
      JOIN jobs ON applications.job_id = jobs.id
      JOIN users ON jobs.company_id = users.id
      WHERE applications.candidate_id = ?
      ORDER BY applications.applied_at DESC
    `, [req.userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
