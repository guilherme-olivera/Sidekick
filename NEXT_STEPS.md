# Sidekick — Status Atual e Próximos Passos

## 1. Resumo consolidado do projeto

### Fase 2: Autenticação e login
- Backend com JWT mock e autenticação básica
- Rotas de login, registro e `me`
- AuthProvider no mobile para gerenciar token e usuário
- Tela de autenticação com login/registro e validação de formulário

### Fase 3: Dashboard e UX principal
- Layout de abas: Início, Histórico, Perfil
- Tela Home com cards de estatísticas e resumo semanal
- Histórico com filtros por tipo de treino
- Perfil com dados do usuário, estatísticas e logout
- Widget de humor funcional e estado global via contexto

### Fase atual: Calendário local e dados mock
- Implementado calendário com eventos locais
- CRUD de eventos com título, descrição e hora
- Mock de eventos do Germini com horário incluso
- UI do modal ajustada para foco no essencial

## 2. Limpeza feita

### Removido do `mobile/package.json`
- `lucide-react-native` (não usado no código)
- `react-native-worklets` (não usado no código)

### Removido do `backend/package.json`
- `dotenv-expand` (não referenciado no backend)

### Arquivos e redundâncias eliminados
- Consolidado o histórico de etapas num único arquivo principal: `NEXT_STEPS.md`
- Removidos arquivos de fase antigos:
  - `FASE_2_COMPLETE.md`
  - `FASE_3_COMPLETE.md`
  - `FASE_4_COMPLETE.md`
  - `FASE_5_NEXT_STEPS.md`
  - `PHASE_5B_COMPLETE.md`
- Removido `mobile/.gitignore` por redundância com o `.gitignore` raiz
- Corrigido `.gitignore` raiz para remover entradas duplicadas

## 3. Dependências mantidas

### Mobile
- `expo`, `expo-router`, `expo-linking`, `expo-web-browser`, `expo-image-picker`, `@expo/vector-icons` etc.
- `@react-navigation/native`, `react-native-reanimated`, `react-native-safe-area-context`

### Backend
- `@prisma/client`, `express`, `cors`, `jsonwebtoken`, `bcryptjs`, `dotenv`, `multer`, `pg`
- `prisma`, `ts-node-dev`, `typescript`

## 4. Próximos passos recomendados

### Prioridade imediata
1. Finalizar fluxo de deep link Strava
2. Estruturar análise IA com Gemini e prompt contextual
3. Criar perfil do usuário e upload de avatar
4. Implementar controle de cota/free vs premium

### Melhorias de organização
- Manter apenas um arquivo de roadmap/etapas no root
- Usar `NEXT_STEPS.md` como referência viva do projeto
- Evitar documentos de fase duplicados no repo

## 5. Observações
- O projeto agora está mais enxuto e com menos dependências inúteis
- A base de configuração está correta para Expo e backend TypeScript
- O próximo foco deve ser Strava + IA, deixando a integração completa para depois

---

## Ações realizadas no repo
- Atualizei `mobile/package.json`
- Atualizei `backend/package.json`
- Limpei `.gitignore` raiz
- Consolidei a documentação de fases em `NEXT_STEPS.md`
- Removi arquivos de fase antigos e `mobile/.gitignore` 