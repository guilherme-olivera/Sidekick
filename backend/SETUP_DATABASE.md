## 🔧 Como Iniciar o PostgreSQL Local para Sidekick

A migração do Prisma foi **validada com sucesso**! Agora precisamos apenas iniciar o banco de dados.

### Opção 1: Usar Prisma PostgreSQL (Recomendado - Mais Fácil)

```bash
# No terminal, na pasta /backend:
npx prisma db push

# Ou para interface visual:
npm run prisma:studio
```

O Prisma já está configurado com uma URL local. Isso vai:
1. Criar o banco automaticamente
2. Aplicar o schema
3. Estar pronto para uso

### Opção 2: PostgreSQL Local Instalado

Se você tiver PostgreSQL instalado:

1. **Inicie o serviço PostgreSQL**:
   ```bash
   # Windows (abra como Admin)
   net start PostgreSQL15  # ou sua versão
   ```

2. **Verifique a conexão**:
   ```bash
   psql -U postgres
   ```

3. **Execute a migração**:
   ```bash
   npm run prisma:migrate init
   ```

---

## 🚀 Próximo Passo: Testar o Servidor

Depois que o banco estiver pronto:

```bash
# Terminal 1: Inicie o servidor
npm run dev

# Terminal 2: Teste o endpoint da IA
curl -X POST http://localhost:3000/api/test/ai-analysis \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

---

## ⚠️ IMPORTANTE: Configurar Chave Gemini

Antes de testar a IA, você precisa:

1. Ir em: https://ai.google.dev
2. Clique em "Get API Key"
3. Copie sua chave
4. **Cole no arquivo `.env`**:
   ```
   GEMINI_API_KEY="sua-chave-aqui"
   ```

5. Salve e reinicie o servidor (`npm run dev`)

Sem isso, o endpoint `/api/test/ai-analysis` vai retornar erro de API não configurada.

---

## ✅ Checklist de Conclusão da FASE 1

- [x] Schema Prisma criado (User, Workout, MoodCheck)
- [x] Arquivo de migração validado
- [ ] PostgreSQL iniciado
- [ ] Migração aplicada no banco
- [ ] GEMINI_API_KEY configurada
- [ ] Servidor rodando (`npm run dev`)
- [ ] Endpoint `/api/test/ai-analysis` testado com sucesso

---

Depois que esses passos estiverem completos, podemos passar para a **FASE 2: Autenticação** 🟢→🔵
