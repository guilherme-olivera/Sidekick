# FASE 2 - Autenticação & Login ✅ CONCLUÍDA

## Backend Changes

### Arquivos Criados:
1. **`src/services/authService.ts`**
   - Autenticação com JWT (mock, sem DB real)
   - Funções: `registerUser()`, `loginUser()`, `verifyToken()`
   - Middleware: `authMiddleware()` para proteger rotas
   - Banco de usuários em memória (mock)

2. **`src/controllers/authController.ts`**
   - Handlers para rotas de autenticação
   - `handleRegister()` - POST /api/auth/register
   - `handleLogin()` - POST /api/auth/login
   - `handleGetMe()` - GET /api/auth/me (protegido)

### Arquivos Modificados:
- `src/server.ts` - Adicionadas rotas de autenticação
- `package.json` - Adicionadas dependências: bcryptjs, jsonwebtoken

### Novas Rotas:
```
POST   /api/auth/register     - Registra novo usuário
POST   /api/auth/login        - Faz login e retorna JWT
GET    /api/auth/me           - Valida token (requer Bearer token)
```

### Mock User (para testar):
- Email: `athlete@sidekick.com`
- Senha: `password123`

---

## Mobile Changes

### Arquivos Criados:

1. **`src/services/apiService.ts`**
   - Serviço de comunicação com backend
   - Funções: `apiLogin()`, `apiRegister()`, `apiVerifyToken()`
   - Base URL configurável via .env

2. **`src/contexts/AuthContext.tsx`**
   - Context de autenticação global
   - Hook: `useAuth()` para acessar estado
   - Persiste token em AsyncStorage
   - Gerencia estado: user, token, isLoading, error

3. **`components/AuthComponents.tsx`**
   - Componentes reutilizáveis (Dark Mode)
   - `AuthInput` - Campo de entrada
   - `AuthButton` - Botão com loading
   - `ErrorMessage` - Exibição de erros
   - Paleta de cores: Dark Mode

4. **`app/login.tsx`**
   - Tela de login/registro (Dark Mode)
   - Toggle entre Login e Registro
   - Validação de formulário
   - Exibição de credenciais demo
   - Design Premium + Minimalista

### Arquivos Modificados:
- `app/_layout.tsx` - Adicionado AuthProvider e roteamento condicional
- `package.json` - Adicionado @react-native-async-storage/async-storage
- Criado `.env` - Configuração de API_URL

### Fluxo de Autenticação:
1. Usuário abre app → verifica token em AsyncStorage
2. Se token existir → mostra Dashboard (tabs)
3. Se não → mostra tela de Login
4. Após login bem-sucedido → salva token + user
5. Redireciona para Dashboard automaticamente

---

## Como Testar Localmente

### Backend:
```bash
cd backend

# Instalar dependências
npm install

# Rodar servidor (com mock auth)
npm run dev

# Servidor estará em: http://localhost:3000
```

### Testar Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "athlete@sidekick.com",
    "password": "password123"
  }'

# Resposta:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-001",
    "email": "athlete@sidekick.com",
    "name": "João Atleta"
  }
}
```

### Mobile:
```bash
cd mobile

# Instalar dependências
npm install

# Rodar app (iOS ou Android)
npm start

# Escanear QR code com Expo Go
```

---

## Arquitetura JWT

```
Login Flow:
┌─────────┐       POST /api/auth/login       ┌─────────┐
│ Mobile  │──────────────────────────────────→│ Backend │
└─────────┘       { email, password }        └─────────┘
     ↑                                              │
     │          ← JWT Token + User Data ←          │
     │                                              │
     └──────── Salva em AsyncStorage ───────────────┘

Rotas Protegidas:
┌─────────┐       GET /api/auth/me           ┌─────────┐
│ Mobile  │──────────────────────────────────→│ Backend │
└─────────┘  Authorization: Bearer {token}   └─────────┘
     ↑                                              │
     │         ← { userId, message } ←             │
     │                                              │
     └── Middleware valida token JWT ──────────────┘
```

---

## Próximas Fases

### FASE 3 - Dashboard (Abas):
- [ ] Layout com Tabs (Início, Histórico, Perfil)
- [ ] Widget de Humor (ícone + menu)
- [ ] Card de atividade
- [ ] Dados mock para testes

### FASE 4 - Strava & IA:
- [ ] OAuth Strava
- [ ] Sincronização de atividades
- [ ] Narrativa da IA (Gemini)
- [ ] Correlação Humor vs. Performance

---

## Observações

✅ **Autenticação funcional com JWT mock** - Pode fazer login/registro sem banco real
✅ **Design Dark Mode premium** - Telas minimalistas e otimizadas
✅ **Contexto global** - Estado de auth acessível em qualquer tela
✅ **Sem bloqueadores** - Tudo funciona com dados fictícios
⚠️ **PostgreSQL** - Ainda não conectado (será na FASE real)
⚠️ **Gemini API** - Será testada quando quisermos integrar IA
