const BASE_URL = process.env.QC_API_URL || "http://localhost:8080";

const fail = (message) => {
  console.error(`FAIL ${message}`);
  process.exit(1);
};

const ok = (message) => {
  console.log(`OK ${message}`);
};

const ensureUnauthorized = (status, label) => {
  if (status === 401 || status === 403) {
    ok(label);
    return;
  }

  fail(`${label} (status inesperado: ${status})`);
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

async function main() {
  const publicTools = await request("/api/tools?q=' OR 1=1 --");
  if (!publicTools.response.ok || !Array.isArray(publicTools.data)) {
    fail("GET /api/tools com query suspeita não retornou resposta válida");
  }
  ok("GET /api/tools resistente a query suspeita");

  const unauthAdmin = await request("/api/admin/users");
  ensureUnauthorized(unauthAdmin.response.status, "Admin sem token bloqueado");

  const malformedToken = await request("/api/admin/users", {
    headers: { Authorization: "Bearer token.invalido.123" },
  });
  ensureUnauthorized(malformedToken.response.status, "Admin com token malformado bloqueado");

  const unauthMessages = await request("/api/messages/me");
  ensureUnauthorized(unauthMessages.response.status, "Mensagens sem token bloqueadas");

  const injectionLogin = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "' OR 1=1 --",
      password: "qualquer",
    }),
  });

  if (injectionLogin.response.ok || injectionLogin.data?.token) {
    fail("Login aceitou payload suspeito");
  }
  ok("Login rejeita payload suspeito");
}

main().catch((error) => {
  fail(`Erro inesperado: ${error instanceof Error ? error.message : String(error)}`);
});
