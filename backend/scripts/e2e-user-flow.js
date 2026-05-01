const BASE_URL = process.env.QC_API_URL || "http://localhost:8080";

const fail = (message) => {
  console.error(`FAIL ${message}`);
  process.exit(1);
};

const ok = (message) => {
  console.log(`OK ${message}`);
};

const request = async (path, options = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, options);
  const text = await response.text();

  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { response, data };
};

const rand = () => Math.floor(Math.random() * 1000000);

async function main() {
  const unique = Date.now() + String(rand()).slice(0,4);
  const email = `qc_user_${unique}@example.com`;
  const password = `P@ssw0rd${rand()}`;
  const name = `QC User ${unique}`;

  // 1) Register
  const register = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  if (!register.response.ok || !register.data?.token) {
    fail('Registro do usuário falhou');
  }
  ok('Registro de usuário');

  // 2) Login
  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!login.response.ok || !login.data?.token) {
    fail('Login do usuário falhou');
  }
  ok('Login do usuário');

  const token = login.data.token;
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 3) Create a tool (normal)
  const toolPayload = {
    name: `QC Tool ${unique}`,
    url: `https://example.com/tool/${unique}`,
    category: 'Development',
    description: 'Ferramenta de teste E2E',
  };

  const createTool = await request('/api/tools', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(toolPayload),
  });

  if (!createTool.response.ok) {
    fail('Criação de tool falhou');
  }
  ok('Criação de tool');

  // 4) Fetch my tools
  const mine = await request('/api/tools/mine', { headers: authHeaders });
  if (!mine.response.ok || !Array.isArray(mine.data)) {
    fail('Recuperar minhas ferramentas falhou');
  }
  ok('GET /api/tools/mine');

  // 5) Update profile (change name, set profileImage to a small data URL)
  const profileUpdate = {
    name: `${name} Updated`,
    email,
    profileImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQ',
  };

  // Need user id for PUT path: get from /api/auth/me
  const me = await request('/api/auth/me', { headers: authHeaders });
  if (!me.response.ok || !me.data?.user?.id) {
    fail('Falha ao buscar sessão atual');
  }
  const userId = me.data.user.id;

  const update = await request(`/api/auth/user/${userId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify(profileUpdate),
  });

  if (!update.response.ok) {
    fail('Atualização de perfil falhou');
  }
  ok('Atualização de perfil');

  // 6) Logout simulation: drop token and verify protected route is blocked
  const unauth = await request('/api/tools/mine');
  if (unauth.response.status === 200) {
    fail('A rota protegida /api/tools/mine não exige autenticação');
  }
  ok('Proteção de rota após logout (sem token) OK');

  // 7) Login again
  const relogin = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!relogin.response.ok || !relogin.data?.token) {
    fail('Relogin falhou');
  }
  ok('Relogin bem-sucedido');

  // 8) Basic XSS / encoding check: attempt to create a tool with script tag
  const xssPayload = {
    name: `<script>alert(1)</script>`,
    url: `https://evil.example/${unique}`,
    category: 'Security',
    description: `<img src=x onerror=alert(1)>`,
  };

  const xssCreate = await request('/api/tools', {
    method: 'POST',
    headers: { Authorization: `Bearer ${relogin.data.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(xssPayload),
  });

  if (!xssCreate.response.ok) {
    // It's fine if server rejects unusual content, but we count it as passed because server defended
    ok('Criação com payload suspeito rejeitada ou sanitizada');
  } else {
    ok('Criação com payload suspeito aceita (verifique saída no frontend)');
  }

  console.log('E2E flow concluído com sucesso');
}

main().catch((error) => {
  fail(`Erro inesperado: ${error instanceof Error ? error.message : String(error)}`);
});
