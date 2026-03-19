import jwt from 'jsonwebtoken';
import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

const token = jwt.sign({ id: 'dummy-id', role: 'ADMIN' }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '1h' });

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/alerts',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('Status code:', res.statusCode);
    if (res.statusCode === 200) {
      console.log('Body:', data);
    } else {
      console.log('Error Body:', data);
    }
  });
});

req.on('error', err => {
  console.error('Request error:', err);
});

req.end();
