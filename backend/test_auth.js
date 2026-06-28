(async () => {
  try {
    const base = 'http://localhost:5000/api';
    const registerRes = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'DevTester', email: 'devtester@example.com', password: 'password' })
    });
    const registerJson = await registerRes.json();
    console.log('register:', registerJson);

    const loginRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'devtester@example.com', password: 'password' })
    });
    const loginJson = await loginRes.json();
    console.log('login:', loginJson);
  } catch (err) {
    console.error('error:', err.message);
  }
})();
