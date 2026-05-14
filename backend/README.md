# 🚀 Sidekick Backend - Setup Guide

## Pré-requisitos
- Node.js v18+
- PostgreSQL local (ou use Prisma PostgreSQL)
- Chave da API Gemini (Google AI)

## Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente (.env)
# Edite o arquivo .env com suas chaves:
# - GEMINI_API_KEY (obtenha em: https://ai.google.dev)
# - JWT_SECRET (qualquer string forte)
# - DATABASE_URL (já configurada)

# 3. Executar primeira migração
npm run prisma:migrate init

# 4. (Opcional) Visualizar banco de dados
npm run prisma:studio
```

## Desenvolvimento

```bash
# Iniciar servidor em modo watch
npm run dev

# O servidor estará disponível em: http://localhost:3000
```

## Endpoints Disponíveis

### ✅ Health Check
```
GET /health
```
Retorna status da API.

### 🧠 Teste da IA
```
POST /api/test/ai-analysis
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

Retorna análise narrativa gerada pelo Gemini.

## Estrutura de Pastas

```
backend/
├── prisma/
│   └── schema.prisma       # Definição das tabelas
├── src/
│   ├── server.ts           # Servidor Express principal
│   ├── services/
│   │   └── geminiService.ts # Integração com Gemini API
│   ├── controllers/        # Controladores de rotas
│   ├── models/            # Tipos TypeScript
│   └── utils/             # Funções auxiliares
├── .env                    # Variáveis de ambiente
├── package.json
└── tsconfig.json
```

## Modelo de Dados

### User
- `id`: UUID único
- `email`: Email único
- `password`: Hash da senha (opcional, se usar OAuth)
- `stravaId`: ID do Strava (se conectado)
- `stravaToken`: Token de acesso Strava

### Workout
- `id`: UUID único
- `userId`: Referência ao usuário
- `title`: Nome do treino
- `type`: Tipo (run, cycling, strength)
- `duration`: Duração em segundos
- `distance`: Distância em km
- `pace`: Velocidade média
- `avgHeartRate`: BPM médio
- `aiNarrative`: Análise gerada pela IA

### MoodCheck
- `id`: UUID único
- `userId`: Referência ao usuário
- `date`: Data do dia
- `mood`: Emoção (tired, sick, normal, angry, sad, happy)
- **Constraint**: Um humor por dia por usuário

## Próximos Passos

- [ ] FASE 2: Autenticação (JWT)
- [ ] FASE 3: Dashboard (Expo Router)
- [ ] FASE 4: OAuth Strava
