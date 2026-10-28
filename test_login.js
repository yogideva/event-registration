async function test() {
  const csrfRes = await fetch('https://eventregister1.netlify.app/api/auth/csrf');
  const cookies = csrfRes.headers.get('set-cookie');
  const { csrfToken } = await csrfRes.json();
  console.log('CSRF:', csrfToken);

  const loginRes = await fetch('https://eventregister1.netlify.app/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookies,
    },
    body: new URLSearchParams({
      csrfToken,
      email: 'admin@eventpro.com',
      password: 'admin123',
      json: 'true',
    }),
    redirect: 'manual',
  });

  console.log('Login status:', loginRes.status);
  const text = await loginRes.text();
  console.log('Login body:', text.slice(0, 300));
}

test().catch(console.error);
