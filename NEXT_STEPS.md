# Próximas Etapas do Sidekick

## 1. Fluxo de Deep Link Strava

### Objetivo
Implementar o fluxo completo de OAuth Strava via deep link no app Expo, deixando o processo fluido e profissional.

### O que deve ser feito
1. Configurar deep linking no Expo:
   - Atualizar `app.json` com `scheme` e `extra`:
     - `scheme`: `sidekick`
     - `extra.stravaRedirectUri`: `sidekick://strava/callback`
2. Em `mobile/src/contexts/StravaContext.tsx`:
   - usar `Linking.openURL(authUrl)` para iniciar o login Strava
   - registrar listener de deep link com `Linking.addEventListener('url', handler)`
   - interpretar `event.url` quando vier de `sidekick://strava/callback?code=...`
   - extrair o `code` do Strava e chamar `POST /api/strava/callback` no backend
3. No backend `backend/src/controllers/stravaController.ts`:
   - manter `POST /api/strava/callback`
   - garantir que o token do usuário autenticado seja usado para salvar os tokens Strava
4. Ajustar `StravaContext` para:
   - armazenar `athlete` e estado `isConnected`
   - sincronizar automaticamente após o callback
   - oferecer mensagem clara ao usuário: "Conta Strava conectada com sucesso"
5. Testar com Spoof do Strava:
   - usar URL de autorização retornada no console
   - validar retorno no app via deep link

### Resultado esperado
- app abre a autorização Strava
- usuário encerra no navegador/app Strava
- retorna para o Sidekick automaticamente
- backend grava tokens e sincroniza atividades

## 2. Estrutura de Análise de Treinos

### Como os treinos serão analisados
A abordagem deve considerar:
- métricas objetivas: duração, distância, pace/velocidade, BPM médio, intensidade
- histórico do atleta: comparação com últimos treinos
- humor atual: if the user selected a mood
- tipo de treino: corrida, ciclismo, musculação, recuperação

### Proposta de análise
1. Classificar o treino por tipo
2. Extrair sinais de qualidade
   - ritmo vs objetivo
   - esforço cardiovascular
   - consistência do pace
   - recuperação entre sessões
3. Gerar insights em três camadas:
   - "O que deu certo"
   - "O que merece atenção"
   - "O que fazer no próximo treino"
4. Incluir recomendação personalizada
   - se o humor for "cansado", sugerir recuperação leve
   - se for "feliz", reforçar positividade e planejamento

### Arquitetura de prompt Gemini
- enviar dados do treino + mood + metas do usuário
- usar prompt template em português
- manter resposta curta e motivacional
- incluir categoria do treino: esforço, técnica, recuperação

### Campos que devem ser guardados
- `aiNarrative` no workout
- `analysisType` (ex: `recovery`, `performance`, `tempo run`)
- `analysisScore` (opcional, se quiser rankear o treino)

## 3. Fluxo de Questionário para modelar IA

### Objetivo
Criar um pequeno questionnaire que alimenta o prompt de IA e aprimora a personalização da análise.

### Onde aplicar
- após a conexão inicial
- depois do primeiro treino sincronizado
- semana a semana, antes do resumo semanal

### Perguntas sugeridas
1. Como você está se sentindo hoje?
   - cansado, motivado, descansado, estressado, animado
2. Qual é o foco desta semana?
   - resistência, força, velocidade, recuperação
3. Você está treinando para algo específico?
   - prova, perda de peso, saúde geral, bem-estar
4. Teve algum desconforto/lesão recente?
   - sim/não
5. Quanto tempo você quer dedicar hoje?
   - curto, moderado, longo

### Como usar as respostas
- incluir no payload de análise IA:
  - `mood`, `goal`, `focus`, `injury`, `availableTime`
- gerar narrativa mais assertiva
- adaptar sugestões de treino e descanso
- construir perfis de usuário:
  - `recovery-first`, `performance-driven`, `balanced`

### Estrutura de dados no backend
- model `UserProfile` ou `UserPreference` com:
  - `goalType`
  - `weeklyFocus`
  - `trainingMood`
  - `injuryStatus`
  - `trainingAvailability`

## 4. Tornando o app profissional

### UI/UX
- telas limpas e consistentes
- tipografia e espaçamento uniformes
- animações suaves em carregamento e transições
- botões com feedback
- uso consistente do tema dark

### Funcionalidades profissionais
- perfil do usuário com foto/avatar
- tela de histórico de treinos completa
- filtros por tipo/intensidade/data
- resumo semanal/mensal
- feedback da IA com sugestões de metas

### Qualidade do código
- manter separação de responsabilidades
- usar contexts para estado global
- criar serviços reutilizáveis (`apiService`, `stravaService`, `geminiService`)
- documentar rotas e variáveis de ambiente

## 5. Controle de requisições / plano free

### Como limitar o app free
1. Backend rate limiting básico:
   - `express-rate-limit` por IP ou por usuário
   - limite diário de solicitações IA
2. Quotas de IA:
   - permitir N análises IA gratuitas por dia/semana
   - gravar contagem em banco (ex: `userUsage`)
3. Feature gating:
   - free: análise básica, histórico limitado, workouts salvos
   - premium: relatórios avançados, comparativos de performance, perguntas extras
4. Controle por usuário:
   - armazenar `planType` no usuário: `free`, `premium`
   - no middleware de rota IA, validar `planType`

### Sugestão de métricas de controle
- `dailyAiRequests`
- `weeklySyncs`
- `workoutsPerMonth`

### Exemplo de fluxo
1. usuário de plano free faz login
2. backend verifica uso atual
3. se dentro da cota, permite análise IA
4. caso exceda, retorna mensagem: "Você atingiu o limite grátis. Atualize para premium"

## 6. Como permitir alteração de imagem

### Perfil do usuário
- criar endpoint de upload no backend
  - `POST /api/users/avatar`
  - aceitar `multipart/form-data`
- salvar em S3 / cloud storage / local storage
- gravar `avatarUrl` no usuário

### Mobile
- usar `expo-image-picker` para selecionar foto
- mostrar pré-visualização antes do envio
- enviar para backend via `FormData`
- atualizar o avatar no perfil imediatamente

### Alternativa mínima viável
- permitir gravar `avatar` como URL de imagem
- usar `TextInput` para colar link da foto

## 7. O que podemos deixar pronto agora

### Backend
- criar model `UserProfile` no Prisma
- criar rotas de preferências e uso:
  - `GET /api/user/profile`
  - `PUT /api/user/profile`
  - `POST /api/user/avatar`
- ajustar `POST /api/strava/callback` para usar o usuário autenticado
- criar `POST /api/strava/deeplink` se quiser suporte a callback web
- implementar `express-rate-limit`

### Mobile
- adicionar `expo-linking` no `app.json`
- criar handler de URL no `StravaContext`
- usar `Linking.openURL(authUrl)` em vez de `console.log`
- adicionar UI de perfil com avatar e edição
- criar tela de questionário rápido
- criar cards de histórico com filtros e categorias

### IA
- refinar `geminiService.ts` com prompt template baseado em:
  - tipo de treino
  - humor
  - objetivo semanal
  - evolução de performance
- salvar respostas do questionário no backend
- usar contexto do usuário para personalizar narrativas

## 8. Próximas ações recomendadas

1. Implementar deep link Strava no app
2. Criar model de perfil e questionário no backend
3. Adicionar controle de cota para IA
4. Implementar upload de avatar
5. Refatorar análise IA para usar contexto de perfil
6. Melhorar UI da tela `settings` e adicionar perfil

## 9. Arquivos sugeridos para criar/atualizar

- `mobile/app/_layout.tsx` — deep link global listener
- `mobile/src/contexts/StravaContext.tsx` — deep link handler
- `mobile/app/settings.tsx` — nova opção de avatar e perfil
- `mobile/app/profile.tsx` — tela de perfil de usuário
- `mobile/app/questionnaire.tsx` — fluxo de perguntas rápidas
- `backend/prisma/schema.prisma` — `UserProfile`, `UsageQuota`
- `backend/src/controllers/userController.ts` — perfil, avatar, preferências
- `backend/src/services/usageService.ts` — controle de limites e planos
- `backend/src/services/geminiService.ts` — prompt estruturado com contextos

---

## Conclusão
Essa é a direção certa para deixar o Sidekick profissional e pronto para uso real. Com o deep link Strava e o questionário, a experiência ficará muito mais inteligente, personalizada e escalável.

Se quiser, posso já criar o arquivo de implementação de `deep link Strava` e o esqueleto das novas rotas/containers. 