const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(resBody) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      headers,
    }, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(resBody) }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const users = [
    { name: 'Admin', email: 'panacea@endtest-mail.io', pass: 'guru@1234', dash: '/api/admin/dashboard-stats' },
    { name: 'Customer', email: 'customer@endtest-mail.io', pass: 'Password@123', dash: '/api/customer/dashboard' },
    { name: 'QSA', email: 'qsa@endtest-mail.io', pass: 'Password@123', dash: '/api/qsa/dashboard' },
    { name: 'QA', email: 'qa@endtest-mail.io', pass: 'Password@123', dash: '/api/qa/dashboard' },
    { name: 'Consultant', email: 'consultant@endtest-mail.io', pass: 'Password@123', dash: '/api/consultant/dashboard' },
  ];

  console.log('=== TESTING ROLE AUTHENTICATION WITHOUT CERTIFICATES ===');
  for (const u of users) {
    const loginRes = await post('/api/auth/login', { email: u.email, password: u.pass });
    console.log(`[LOGIN] ${u.name} (${u.email}) -> Status: ${loginRes.status}, Success: ${loginRes.data.success}, Name: ${loginRes.data.user?.fullName}`);
    if (loginRes.data.token) {
      const dashRes = await get(u.dash, loginRes.data.token);
      console.log(`  [DASHBOARD ACCESS] ${u.dash} -> Status: ${dashRes.status}, Success: ${dashRes.data.success}`);
    }
  }
}

run().catch(console.error);
