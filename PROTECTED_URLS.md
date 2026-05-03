# URLs Protegidas - Security Implementation

## Overview
Todas as URLs de gerenciamento (`/api/management/*`) e administrativas estão agora protegidas com autenticação, autorização por papéis (roles), rate limiting e auditoria.

## 1. Autenticação e Autorização

### Middleware de Autenticação (`authMiddleware`)
- **Requisito**: Bearer token JWT válido no header `Authorization`
- **Validação**:
  - Token deve ser válido e não expirado
  - Usuário deve existir no banco de dados
  - Usuário não pode estar banido
- **Status**: 401 (Unauthorized) se token ausente ou inválido

### Middleware de Papéis (`roleMiddleware`)
Três níveis de autorização:

| Middleware | Inclusão de Papéis | Quem acessa |
|---|---|---|
| `ownerMiddleware` | [owner] | Apenas dono do sistema |
| `adminMiddleware` | [owner, admin] | Dono ou administrador |
| `moderatorMiddleware` | [owner, admin, moderator] | Dono, admin ou moderador |

**Status**: 403 (Forbidden) se papel insuficiente

## 2. Rate Limiting

Prevenção de abuso com limites específicos por tipo de operação:

### Configurações
```typescript
rateLimits.sensitive()    // 5 requests / 15 minutos (operações críticas)
rateLimits.moderation()   // 20 requests / 10 minutos (moderação)
rateLimits.management()   // 50 requests / 5 minutos (leitura/consulta)
```

### Endpoints com Rate Limit

#### Sensíveis (Owner only)
- `PATCH /api/management/users/:id/role` - Mudar papel
- `POST /api/management/users/:id/ban` - Banir usuário
- `POST /api/management/users/:id/unban` - Desbanir usuário
- `PATCH /api/management/requests/:id/approve|reject` - Revisar solicitações
- `POST /api/management/posts/:id/block|unblock` - Bloquear posts

#### Moderação (Moderators+)
- `POST /api/management/users/:id/warning` - Enviar aviso
- `POST /api/management/requests` - Criar solicitação
- `GET /api/management/requests` - Listar solicitações

#### Gerenciamento (Geralmente Moderators+)
- `GET /api/management/users` - Listar usuários
- `GET /api/management/users/:id/stats` - Ver estatísticas
- `GET /api/management/logs` - Ver logs de auditoria

**Resposta ao exceder limite**: 429 (Too Many Requests)
```json
{
  "error": "Muitas requisições. Tente novamente mais tarde.",
  "retryAfter": "2026-04-30T15:45:30.000Z"
}
```

## 3. Auditoria (Audit Logging)

Todos os acessos e ações em URLs protegidas são registrados automaticamente.

### Informações Registradas
```typescript
{
  action: string;              // Ação realizada (ex: USER_BANNED)
  userId: number;              // ID do usuário que realizou
  userEmail: string;           // Email do usuário
  targetUserId?: number;       // ID do alvo (se aplicável)
  targetResourceId?: string;   // ID do recurso modificado
  resourceType?: string;       // Tipo de recurso (users, posts, etc)
  ipAddress: string;           // IP do cliente
  userAgent: string;           // User agent do navegador
  status: 'success'|'failure'; // Sucesso ou falha
  statusCode: number;          // HTTP status code
  timestamp: Date;             // Quando ocorreu
  details?: object;            // Detalhes adicionais (method, path, etc)
}
```

### Ações Auditadas
```
USER_LISTED              - Listou usuários
USER_ROLE_CHANGED        - Modificou papel de usuário
USER_BANNED              - Banimento de usuário
USER_UNBANNED            - Remoção de banimento
USER_WARNING_SENT        - Aviso enviado
USER_STATS_VIEWED        - Visualizou estatísticas
MODERATION_REQUEST_CREATED   - Criou solicitação
MODERATION_REQUEST_LISTED    - Listou solicitações
MODERATION_REQUEST_REVIEWED  - Revisou solicitação
POST_BLOCKED             - Bloqueou post
POST_UNBLOCKED           - Desbloqueou post
```

### Acesso aos Logs
**Endpoint**: `GET /api/management/logs?limit=50&skip=0`
- **Requisito**: Owner
- **Query Params**:
  - `limit`: Máximo de registros (default: 50, máximo: 500)
  - `skip`: Offset para paginação (default: 0)

**Resposta**:
```json
{
  "logs": [
    {
      "_id": "...",
      "action": "USER_BANNED",
      "userId": 123,
      "userEmail": "admin@toolora.com",
      "targetUserId": 456,
      "ipAddress": "192.168.1.1",
      "status": "success",
      "statusCode": 200,
      "timestamp": "2026-04-30T15:30:00Z",
      ...
    }
  ],
  "pagination": {
    "total": 1500,
    "limit": 50,
    "skip": 0,
    "hasMore": true
  }
}
```

## 4. Fluxo de Proteção Completo

```
Requisição → URL Protegida
    ↓
[1] authMiddleware
    ├─ Token presente?
    ├─ Token válido?
    ├─ Usuário existe?
    └─ Usuário não está banido?
    ↓
[2] Role Middleware (ownerMiddleware/adminMiddleware/moderatorMiddleware)
    ├─ Usuário tem papel necessário?
    └─ (403 se insuficiente)
    ↓
[3] Rate Limiter
    ├─ Requisição dentro do limite?
    └─ (429 se excedido)
    ↓
[4] Audit Logger
    └─ Registra ação no banco de dados
    ↓
[5] Controller Handler
    └─ Processa requisição
    ↓
Resposta com Status apropriado
```

## 5. Exemplo: Fluxo de Banimento de Usuário

### Requisição
```bash
POST /api/management/users/456/ban
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Spam repetitivo"
}
```

### Validações
1. ✅ Token presente e válido? → 401 se não
2. ✅ Usuário é owner? → 403 se não
3. ✅ Não excedeu 5 banimentos/15min? → 429 se sim
4. ✅ Ação será auditada automaticamente

### Resposta de Sucesso
```json
HTTP/1.1 200 OK
{
  "message": "Usuário banido com sucesso."
}
```

**Audit Log criado**:
```javascript
{
  action: "USER_BANNED",
  userId: 123,                           // dono do sistema
  targetUserId: 456,                     // usuário banido
  status: "success",
  statusCode: 200,
  timestamp: "2026-04-30T15:35:20Z",
  details: { method: "POST", path: "/api/management/users/456/ban", ... }
}
```

## 6. Segurança em Camadas

| Camada | Mecanismo | Proteção |
|--------|-----------|----------|
| **1. Transporte** | CORS configurado | Apenas localhost (dev) |
| **2. Autenticação** | JWT | Token deve existir e ser válido |
| **3. Autorização** | Roles | Papel inadequado = 403 |
| **4. Rate Limiting** | Token bucket | Limite de requisições por usuário |
| **5. Auditoria** | Logging | Rastreamento de todas ações |
| **6. Input Validation** | Controllers | Validações específicas por endpoint |
| **7. URL Obscuring** | `/management` | Admin endpoints não se autopublicam como admin |

## 7. Tratamento de Erros

### 401 Unauthorized
```json
{
  "error": "Token não fornecido."
}
```
ou
```json
{
  "error": "Token inválido."
}
```
ou
```json
{
  "error": "Conta bloqueada."
}
```

### 403 Forbidden
```json
{
  "error": "Acesso restrito à moderação."
}
```

### 429 Too Many Requests
```json
{
  "error": "Muitas requisições. Tente novamente mais tarde.",
  "retryAfter": "2026-04-30T15:50:00Z"
}
```

## 8. Monitoramento e Debug

### Ver Todos os Logs
```bash
# Owner pode acessar
curl -H "Authorization: Bearer <owner_token>" \
  http://localhost:8080/api/management/logs?limit=100
```

### Logs de Console (Desenvolvimento)
```
Failed to log audit event: [erro]
```

## 9. Boas Práticas para Operadores

✅ **Faça**:
- Rotacionar tokens regularmente
- Monitorar logs de auditoria para atividades suspeitas
- Usar senhas fortes para contas de administrador
- Revisar limites de rate limit periodicamente

❌ **Não faça**:
- Compartilhar tokens de admin
- Desabilitar auditoria
- Usar senhas padrão
- Ignorar alertas 429 (rate limit)

---

*Versão: 1.0 | Atualizado: 2026-04-30*
