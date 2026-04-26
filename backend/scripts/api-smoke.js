const BASE_URL = process.env.QC_API_URL || "http://localhost:8080";
const ADMIN_EMAIL = process.env.QC_ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.QC_ADMIN_PASSWORD || "";

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

async function main() {
  const toolsResult = await request("/api/tools");
  if (!toolsResult.response.ok || !Array.isArray(toolsResult.data)) {
    fail("GET /api/tools não retornou lista válida");
  }
  ok("GET /api/tools");

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log("SKIP testes autenticados (defina QC_ADMIN_EMAIL e QC_ADMIN_PASSWORD)");
    return;
  }

  const loginResult = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  if (!loginResult.response.ok || !loginResult.data?.token) {
    fail("Login admin falhou");
  }
  ok("POST /api/auth/login");

  const token = loginResult.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  const adminUsersResult = await request("/api/admin/users", { headers: authHeaders });
  if (!adminUsersResult.response.ok || !Array.isArray(adminUsersResult.data)) {
    fail("GET /api/admin/users falhou");
  }
  ok("GET /api/admin/users");

  const mineResult = await request("/api/tools/mine", { headers: authHeaders });
  if (!mineResult.response.ok || !Array.isArray(mineResult.data)) {
    fail("GET /api/tools/mine falhou");
  }
  ok("GET /api/tools/mine");

  const messagesResult = await request("/api/messages/me", { headers: authHeaders });
  if (!messagesResult.response.ok || !Array.isArray(messagesResult.data)) {
    fail("GET /api/messages/me falhou");
  }
  ok("GET /api/messages/me");
}

main().catch((error) => {
  fail(`Erro inesperado: ${error instanceof Error ? error.message : String(error)}`);
});
