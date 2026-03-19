import http from 'http';

http.get('http://localhost:5000/api/v1/alerts', (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
  });
}).on('error', err => {
  console.error('Error:', err.message);
});
