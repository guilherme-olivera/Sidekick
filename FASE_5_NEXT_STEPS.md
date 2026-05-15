# Sidekick - Fase 5: Auth Local, Avatar, e UI Refinements

## Status Geral
- ✅ Backend PostgreSQL conectado e migrado
- ✅ Autenticação JWT (login/registro) implementada
- ✅ Integração Strava (OAuth deeplink) pronta
- ✅ **Avatar upload** implementado (backend + mobile)
- ✅ **Tela de Perfil** com avatar e Strava (mobile)
- 🚀 **PRÓXIMAS FEATURES** (Esta fase)

---

## 1. ✅ Autenticação Local - Login/Registro

### Backend
- ✅ `POST /api/auth/register` - Cria usuário com email/senha
- ✅ `POST /api/auth/login` - Login e retorna JWT
- ✅ `GET /api/auth/me` - Retorna dados do usuário autenticado (refreshUser)

### Mobile (React Native + Expo)
- ✅ Tela de Login (`app/login.tsx`) - Funcional
- ✅ Tela de Registro (`app/register.tsx`) - Funcional via toggle
- ✅ Validação de email e senha
- ✅ Auto-login após registro

---

## 2. ✅ Upload de Avatar/Foto

### Backend
- ✅ `POST /api/user/avatar` - Upload com multer
- ✅ `DELETE /api/user/avatar` - Remove avatar
- ✅ Salva em `/public/avatars/`
- ✅ Middleware autenticado

### Mobile
- ✅ Na tela de Perfil:
  - Image Picker para selecionar foto
  - Upload para backend
  - Exibição do avatar salvo
  - Badge para editar foto

---

## 3. ✅ Integração Strava no Perfil

### Backend
- ✅ `POST /api/strava/connect` - Inicia OAuth flow
- ✅ `GET /api/strava/callback` - Recebe callback e salva tokens
- ✅ `GET /api/strava/status` - Retorna status de conexão
- ✅ `POST /api/strava/disconnect` - Desconecta do Strava

### Mobile
- ✅ Na tela de Perfil, seção "Integrações":
  - Status "Conectado" (verde) ou "Não conectado" (cinza)
  - Botão "Conectar Strava" (não conectado)
  - Botões "Sincronizar" e "Desconectar" (conectado)
  - Mostra nome do atleta se conectado

---

## 4. ✅ Resumo Semanal com Cores Dinâmicas (COMPLETO)

### ✅ Implementação Finalizada
- ✅ **Backend**: `GET /api/workouts` com filtros de data (query params)
  - `?date=YYYY-MM-DD` - Treinos de um dia
  - `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` - Range de semana
  
- ✅ **Frontend - DashboardContext**:
  - `loadWeeklyWorkouts(startDate)` - Carrega semana completa
  - `getWorkoutsByDate(date)` - Retorna treinos de um dia
  - `groupWorkoutsByDay()` - Agrupa por day of week (0-6)
  - `workoutsByDay` state com mapeamento de dia → array de treinos

- ✅ **Frontend - UI (app/(tabs)/index.tsx)**:
  - 7 day badges em grid (Seg-Dom)
  - Cores dinâmicas: Verde (#51cf66) se tem treino, Cinza (#333333) se vazio
  - Modal ao clicar em dia com treino
  - Lista de treinos com tipo (🏃 corrida, 🚴 ciclismo, 💪 academia), título e duração
  - Navegação para history ao clicar em treino

### TypeScript Status: ✅ SEM ERROS
- Mobile: ✅ Compila sem erros
- Backend: ✅ Compila sem erros


---

## 5. 📋 Histórico de Treinos (Próxima fase)

### Backend
- [ ] `GET /api/workouts?date=YYYY-MM-DD` - Filtro por data
- [ ] `GET /api/workouts?month=YYYY-MM` - Filtro por mês

### Mobile (`app/history.tsx`)
- [ ] Listar todos os treinos com filtros
- [ ] Detalhes completos ao clicar
- [ ] Botão para deletar treino

---

## 📊 Estrutura Atual

```
backend/
  src/
    controllers/
      ✅ authController.ts        # login/register/getMe
      ✅ avatarController.ts      # upload/delete avatar
      ✅ stravaController.ts      # OAuth flow
      ✅ workoutController.ts     # UPDATED: date filtering
    services/
      ✅ avatarService.ts         # file operations
    middleware/
      ✅ uploadMiddleware.ts      # multer config
    routes/
      ✅ server.ts               # rotas registradas
  public/
    avatars/                  # pasta para imagens

mobile/
  app/
    ✅ login.tsx                 # login/register toggle
    ✅ history.tsx               # placeholder (próx: detalhes)
    (tabs)/
      ✅ index.tsx               # REFACTORED: dynamic weekly view
      ✅ profile.tsx             # avatar + Strava
  src/
    contexts/
      ✅ DashboardContext.tsx    # UPDATED: loadWeeklyWorkouts, groupWorkoutsByDay
    components/
      ✅ AvatarUpload           # integrado no profile
      ✅ StravaStatus           # integrado no profile
    services/
      ✅ apiService.ts          # adicionado apiUpload
```

---

## 🎯 Próximos Passos (ORDEM RECOMENDADA)

### Fase 5C - Histórico Detalhado (PRÓXIMA)
1. Melhorar `app/history.tsx` com dados reais de treinos
2. Implementar filtros (mês, tipo de treino, duração)
3. Exibição de detalhes completos: stats, gráficos, AI narrative
4. Botão de delete com confirmação
5. Compartilhar resultado no Strava

### Fase 5D - Refinamentos
6. Integração Gemini AI (fix API key issue)
7. Month-based calendar view
8. Premium tier unlock flows
9. Notificações de meta semanal
10. Modo offline (cache de treinos)

---

## ✅ Validações Atuais

- ✅ Backend TypeScript: SEM ERROS
- ✅ Mobile TypeScript: SEM ERROS
- ✅ Prisma schema: OK
- ✅ Dependências instaladas: OK
- ✅ Date filtering backend: Implementado
- ✅ Weekly grouping frontend: Implementado
- ✅ Dynamic day colors: Implementado (green/gray)
- ✅ Modal for workouts: Implementado


---

## 🚀 Para Testar Agora

### Terminal 1: Backend
```bash
cd backend
npm run dev  # Servidor rodando em http://localhost:3000
```

### Terminal 2: Mobile
```bash
cd mobile
npm start
```

### Terminal 3: Ambos em Paralelo (Monorepo)
```bash
cd e:\Projetos\Sidekick
npm run dev  # Inicia backend + mobile simultaneamente
```

### Fluxo de Teste (Phase 5B - Weekly Dashboard)
1. **Login/Criar conta** (mobile)
2. **Ir para Dashboard** (home screen)
3. **Observe**: Semana atual com 7 dias - todos cinza (sem treinos)
4. **Via Strava**: Sincronize atividades (ou crie treinos manualmente)
5. **Refresh Dashboard**: Alguns dias devem ficar verdes
6. **Clique dia verde**: Modal mostra lista de treinos
7. **Clique treino**: Navega para `/history` (placeholder até Phase 5C)

### Fluxo de Teste (Phase 5A - Avatar & Strava)
1. Fazer login
2. Ir para Perfil
3. Clicar em avatar → Image Picker
4. Selecionar imagem → Upload
5. Avatar atualiza na tela
6. Conectar Strava (botão verde)
7. Sincronizar atividades
8. Desconectar Strava


---

## Dependências Adicionadas

✅ Backend:
- multer (file upload)
- dotenv-expand

✅ Mobile:
- expo-image-picker (image selection)


---

## 1. Autenticação Local - Login/Registro

### Backend
- ✅ `POST /api/auth/register` - Cria usuário com email/senha
- ✅ `POST /api/auth/login` - Login e retorna JWT
- ✅ `GET /api/auth/me` - Retorna dados do usuário autenticado (refreshUser)
- 🔲 Validar e melhorar tratamento de erros

### Mobile (React Native + Expo)
- 🔲 Criar/completar tela de Login (`app/login.tsx`)
  - Input: email + senha
  - Botão "Fazer Login"
  - Link "Criar Conta" → tela de registro
  - Validação básica de email
  - Mostrar erros do backend

- 🔲 Criar/completar tela de Registro (`app/register.tsx`)
  - Input: nome + email + senha + confirmar senha
  - Botão "Criar Conta"
  - Link "Já tem conta?" → volta para login
  - Validações: senha mínimo 8 caracteres, email válido
  - Auto-login após registro bem-sucedido

---

## 2. Upload de Avatar/Foto

### Backend
- 🔲 Instalar `multer` para upload de arquivos
- 🔲 Criar endpoint `POST /api/user/avatar` (autenticado)
  - Recebe arquivo PNG/JPG
  - Salva em `/public/avatars/`
  - Retorna URL para salvar no BD
  - Usa middleware `authMiddleware`

- 🔲 Criar endpoint `DELETE /api/user/avatar` (autenticado)
  - Remove avatar do usuário
  - Limpa arquivo do servidor

### Mobile
- 🔲 Na tela de Perfil:
  - Mostrar avatar atual (ou ícone padrão)
  - Botão "Editar Foto" → abre Image Picker
  - Salva foto localmente primeiro
  - Upload para backend (`POST /api/user/avatar`)
  - Atualiza `user.avatar` no AuthContext
  - Exibe loading durante upload

---

## 3. Integração Strava no Perfil

### Backend
- ✅ `POST /api/strava/connect` - Inicia OAuth flow
- ✅ `GET /api/strava/callback` - Recebe callback e salva tokens
- ✅ `GET /api/strava/status` - Retorna status de conexão
- ✅ `POST /api/strava/disconnect` - Desconecta do Strava

### Mobile
- 🔲 Na tela de Perfil, adicionar seção "Integrações":
  - Card "Strava"
  - Status: "Conectado" (verde) ou "Não conectado" (cinza)
  - Se NÃO conectado:
    - Botão "Conectar Strava" → abre deeplink
  - Se CONECTADO:
    - Mostra: "Conectado como: [athlete_name]"
    - Botão "Sincronizar Agora" → chama `POST /api/strava/sync`
    - Botão "Desconectar" → aviso de confirmação

---

## 4. Resumo Semanal com Cores Dinâmicas

### Lógica
- **Sem treino**: Cinza (#333333)
- **Com treino**: Verde (#51cf66) ✅
- Clique em dia verde → mostra lista de treinos desse dia
- Clique em treino na lista → redireciona para `history.tsx` com filtro

### Backend
- ✅ `GET /api/workouts` - Retorna treinos do usuário
- 🔲 `GET /api/workouts?date=2026-05-14` - Filtro por data (opcional)

### Mobile (`app/(tabs)/index.tsx`)
- 🔲 Buscar treinos da semana atual (segunda-domingo)
- 🔲 Agrupar treinos por dia
- 🔲 Atualizar `DayBadge` para:
  - Verde se dia tem treino
  - Cinza se não tem
- 🔲 Adicionar modal/bottomSheet com lista de treinos do dia ao clicar
- 🔲 Clicar em treino na lista → vai para `history.tsx`

---

## 5. Histórico de Treinos

### Backend
- ✅ `GET /api/workouts/:id` - Retorna detalhes de um treino
- 🔲 `GET /api/workouts?date=YYYY-MM-DD` - Filtro por data
- 🔲 `GET /api/workouts?month=YYYY-MM` - Filtro por mês

### Mobile (`app/history.tsx`)
- 🔲 Listar todos os treinos com filtros:
  - Data (recente primeiro)
  - Mês selecionado
- 🔲 Cada treino mostra: tipo, data, duração, distância
- 🔲 Clicar para ver detalhes completos
- 🔲 Botão para deletar treino

---

## 6. Dashboard/Home Melhorado

### Current State
- Mostra último treino
- Stats básicos (treinos, tempo, km)
- Resumo semanal com intensidade (hardcoded)
- Mood widget

### Improvements Needed
- 🔲 Dados reais do banco (não mock)
- 🔲 Cores dinâmicas dos dias baseadas em treinos reais
- 🔲 Lista interativa ao clicar em dia da semana
- 🔲 Integração com histórico

---

## 7. Estrutura de Arquivos

```
backend/
  src/
    controllers/
      avatarController.ts     # novo
      userController.ts       # já existe, melhorar
    services/
      avatarService.ts        # novo
    middleware/
      uploadMiddleware.ts      # novo
    routes/
      userRoutes.ts
    server.ts
  public/
    avatars/                  # pasta para imagens

mobile/
  app/
    login.tsx                 # novo
    register.tsx              # novo
    history.tsx               # melhorar
    (tabs)/
      index.tsx               # melhorar resumo semanal
      profile.tsx             # melhorar com avatar + Strava
  src/
    components/
      AvatarUpload.tsx        # novo
      StravaStatus.tsx        # novo
      WeeklyBreakdown.tsx     # melhorar
    services/
      avatarService.ts        # novo
      historyService.ts       # novo
```

---

## Ordem de Implementação

1. ✅ Login/Registro (já 70% pronto)
2. ✅ Avatar upload (backend + mobile)
3. ✅ Strava integration na tela de perfil
4. ✅ Resumo semanal com cores dinâmicas
5. ✅ Histórico de treinos
6. ✅ Testes e ajustes

---

## Métricas de Sucesso

- [ ] Usuário consegue criar conta e fazer login 100% local
- [ ] Avatar é salvo e exibido no perfil
- [ ] Strava mostra status (conectado/desconectado)
- [ ] Dias com treino ficam verdes no resumo semanal
- [ ] Clicar em dia verde mostra treinos daquele dia
- [ ] Clicar em treino vai para histórico com detalhes
- [ ] Sem erros de compilação no backend/mobile

---

## Dependências a Adicionar

### Backend
```bash
npm install multer dotenv-expand
npm install --save-dev @types/multer
```

### Mobile
```bash
npm install expo-image-picker expo-media-library expo-file-system
```

---

## Testing

### Backend
```bash
npm run test-db-connection
npm run dev  # rodar servidor
```

### Mobile
```bash
npm run dev:mobile
# ou
npm run dev  # ambos
```

---

## Próximos Passos Imediatos

1. Implementar login/registro UI no mobile
2. Criar avatar upload endpoint
3. Atualizar tela de perfil com avatar + Strava
4. Refatorar resumo semanal com dados reais
