# Guia de Configuração para Dados Reais

## 1. O que já foi feito

O projeto já tem a estrutura principal implementada:

- Backend Express com rotas de autenticação JWT
- Integração com Strava (rotas de auth-url, callback, sync e status)
- Integração com Gemini AI para geração de narrativa de treino
- CRUD de treinos com Prisma + PostgreSQL
- Mobile Expo com:
  - `AuthContext` para login/register
  - `DashboardContext` para carregar treinos e analisar IA
  - `StravaContext` para iniciar o fluxo de conexão Strava
  - Tela de `settings` para conectar/desconectar e sincronizar

## 2. Onde colocar os dados de integração

### Backend
Os dados reais devem ser colocados no arquivo `backend/.env`.

Se quiser começar com um template, use `backend/.env.example`.

#### Variáveis necessárias

- `DATABASE_URL` — conexão PostgreSQL real
- `GEMINI_API_KEY` — chave da API Gemini/Google AI
- `JWT_SECRET` — segredo de JWT (pode ser qualquer string forte)
- `STRAVA_CLIENT_ID` — client ID do app Strava
- `STRAVA_CLIENT_SECRET` — client secret do Strava
- `STRAVA_REDIRECT_URI` — URI de callback registrada no Strava
- `PORT` — porta do backend (padrão `3000`)

### Exemplo de `.env`

```env
DATABASE_URL="postgresql://meu_usuario:minha_senha@meu_host:5432/sidekick_db"
GEMINI_API_KEY="AIza..."
JWT_SECRET="uma-string-secreta-muito-forte"
STRAVA_CLIENT_ID="123456"
STRAVA_CLIENT_SECRET="abcdef1234567890"
STRAVA_REDIRECT_URI="sidekick://strava/callback"
PORT=3000
NODE_ENV="development"
```

> Não comite esse arquivo no Git. Use `.env.example` como modelo.

## 3. Como configurar o Strava

### 3.1 Criar app no Strava

1. Acesse: https://developers.strava.com/
2. Faça login com sua conta Strava
3. Crie um novo app
4. Configure:
   - `Application Name`: Sidekick
   - `Authorization Callback Domain`: se usar mobile, `sidekick://` (ou seu domínio)
   - `Redirect URI`: `sidekick://strava/callback`

### 3.2 Colocar os dados no backend

No arquivo `backend/.env`, preencha:

- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REDIRECT_URI`

### 3.3 Observação importante

A implementação atual do backend espera que o código de autorização Strava seja trocado via `POST /api/strava/callback` com `code` e `userId`.

Isto significa que, para liberar completamente o fluxo de login Strava em mobile, ainda falta integrar o callback de deep link no app.

## 4. Como configurar o Gemini

### 4.1 Obter a chave Gemini

1. Acesse o console da Google Cloud / AI Platform
2. Ative a API Gemini ou Google Generative AI
3. Gere a chave de API

### 4.2 Colocar no backend

No arquivo `backend/.env`:

- `GEMINI_API_KEY="sua-chave-gemini-aqui"`

O backend usa essa variável em `backend/src/services/geminiService.ts`.

## 5. Como configurar o banco de dados

### 5.1 Conectar o PostgreSQL

No arquivo `backend/.env`, preencha `DATABASE_URL` com sua conexão PostgreSQL real.

Exemplo:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/sidekick"
```

### 5.2 Gerar Prisma Client

No diretório `backend` execute:

```bash
npm install
npx prisma generate
```

### 5.3 Rodar migrações

Se ainda não tiver migrado o banco:

```bash
npx prisma migrate dev --name init
```

Se quiser apenas aplicar um banco já existente, use:

```bash
npx prisma db push
```

## 6. Como rodar o backend

### 6.1 Usando Git Bash

Se o PowerShell estiver com problema no `npm`, use Git Bash conforme você mencionou.

### 6.2 Comandos principais

```bash
cd backend
npm install
npm run build
npm run dev
```

O backend ficará disponível em:

```
http://localhost:3000
```

## 7. Como rodar o mobile

No diretório `mobile`:

```bash
npm install
npm start
```

Se estiver usando Expo, use o app Expo Go ou o emulador para abrir a aplicação.

## 8. Como testar com dados reais

### 8.1 Testar login/register

1. Abra o app mobile
2. Crie uma conta ou faça login
3. Verifique se o token JWT é salvo e a navegação segue para a área autenticada

### 8.2 Testar IA Gemini com dados reais

No backend ou via Postman, chame:

```http
POST http://localhost:3000/api/test/ai-analysis
Content-Type: application/json

{
  "workout": {
    "type": "run",
    "date": "2026-05-13",
    "duration": 3600,
    "distance": 10.5,
    "pace": 12.5,
    "avgHeartRate": 145,
    "maxHeartRate": 160,
    "intensity": "high"
  }
}
```

Se o Gemini estiver configurado, retorna uma narrativa.

### 8.3 Testar Strava com conta real

1. Faça login no app
2. Abra a tela `Configurações`
3. Clique em `Conectar Strava`
4. Copie a URL de autorização que aparece no console/log
5. Cole essa URL no navegador e autorize o Strava
6. Copie o `code` retornado no callback (se o deep link não estiver ativo)
7. Envie um `POST` para:

```http
POST http://localhost:3000/api/strava/callback
Content-Type: application/json
Authorization: Bearer <seu-token-jwt>

{
  "code": "<codigo-do-strava>",
  "userId": "<seu-userId>"
}
```

### 8.4 Sincronizar atividades Strava

Após o usuário estar conectado, chame:

```http
POST http://localhost:3000/api/strava/sync
Authorization: Bearer <seu-token-jwt>
```

Isso irá buscar atividades dos últimos 30 dias e salvar como treinos.

## 9. Onde estão os arquivos relevantes

- `backend/src/services/stravaService.ts` — lógica Strava OAuth + sync
- `backend/src/controllers/stravaController.ts` — rotas Strava
- `backend/src/services/geminiService.ts` — lógica Gemini AI
- `backend/src/controllers/workoutController.ts` — rotinas de treino + análise IA
- `backend/prisma/schema.prisma` — modelo do banco
- `backend/.env` — variáveis reais de execução
- `backend/.env.example` — modelo de configuração
- `mobile/src/contexts/AuthContext.tsx` — login/register e token
- `mobile/src/contexts/DashboardContext.tsx` — carregamento de treinos e análise IA
- `mobile/src/contexts/StravaContext.tsx` — inicia conexão Strava
- `mobile/app/settings.tsx` — UI de conexão e sincronização

## 10. O que ainda falta estruturar

### 10.1 Deep link Strava no mobile

Hoje o app já pega a URL de autorização, mas não abre automaticamente o fluxo de retorno.

Para completar, é necessário:

- configurar `expo-linking` com `sidekick://strava/callback`
- chamar `Linking.openURL(authUrl)` em `StravaContext.connectStrava()`
- tratar o callback no app e enviar o `code` para `POST /api/strava/callback`

### 10.2 Callback automático no backend

A rota atual de callback é `POST /api/strava/callback`.

Se quiser usar um callback web normal, será preciso criar uma rota `GET /api/strava/callback` que receba `code` e redirecione para o app ou grave o token.

## 11. Resumo rápido

### Feito:
- Backend pronto para receber `DATABASE_URL`, `GEMINI_API_KEY`, `STRAVA_*`
- Mobile pronto para login e uso de API real
- Rotas de análise IA e sincronização já criadas

### Para fazer agora:
1. Preencher `backend/.env`
2. Instalar dependências em `backend` e `mobile`
3. Gerar Prisma client e migrar DB
4. Iniciar backend e app
5. Testar IA com `POST /api/test/ai-analysis`
6. Autorizar Strava e sincronizar atividades

---

Se quiser, posso também adicionar automaticamente o fluxo de deep link Strava no mobile para fechar essa etapa por completo.