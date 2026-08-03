# Guia de Deploy do Banco de Dados e API do Sidekick na Nuvem

Este guia orienta você no processo de tirar o banco de dados e a API do seu ambiente local (`localhost`) e publicá-los na nuvem. Isso permitirá que o aplicativo móvel acesse e salve dados a partir de qualquer dispositivo conectado à internet (permitindo, por exemplo, o acesso simultâneo de outras contas/aparelhos).

---

## 💾 Parte 1: Criando o Banco de Dados PostgreSQL na Nuvem

Recomendamos utilizar o **Neon** ou o **Supabase** pela facilidade e por oferecerem planos gratuitos generosos de PostgreSQL.

### Opção A: Neon PostgreSQL (Recomendado pela simplicidade)
1. Acesse [neon.tech](https://neon.tech/) e faça login/cadastro gratuito.
2. Crie um novo projeto chamado `Sidekick`.
3. Na tela inicial do projeto, selecione a linguagem **Prisma** ou copie a **Connection String** direta do PostgreSQL. Ela se parecerá com isto:
   `postgresql://neondb_owner:password@ep-cool-glade-a5tpdq.us-east-2.aws.neon.tech/neondb?sslmode=require`
4. Guarde essa URI de conexão.

### Opção B: Supabase
1. Acesse [supabase.com](https://supabase.com/) e crie uma conta.
2. Crie um novo projeto chamado `Sidekick` e defina uma senha forte para o banco de dados.
3. Vá em **Project Settings** > **Database**.
4. Procure pela seção **Connection String** > **URI** e copie o link.
   * *Atenção:* Lembre-se de substituir a tag `[YOUR-PASSWORD]` pela senha real que você cadastrou ao criar o projeto.

---

## 🚀 Parte 2: Publicando a API do Backend na Nuvem

Recomendamos o **Render** ou o **Railway** para hospedar o servidor Node.js/Express de graça ou com custos mínimos.

### Deploy no Render (Gratuito)
1. Coloque o código-fonte do projeto Sidekick em um repositório privado ou público no seu **GitHub**.
2. Acesse [dashboard.render.com](https://dashboard.render.com/) e crie uma conta.
3. Clique em **New** > **Web Service**.
4. Conecte sua conta do GitHub e selecione o repositório do `Sidekick`.
5. Configure as opções do Web Service:
   * **Name**: `sidekick-api`
   * **Root Directory**: `backend` (importante, pois o projeto está em uma pasta aninhada)
   * **Runtime**: `Node`
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `node dist/src/server.js` (ou `npm start`)
6. Abra a seção **Advanced** > **Environment Variables** e adicione as seguintes variáveis:
   * `DATABASE_URL`: *Cole a Connection String obtida na Parte 1.*
   * `JWT_SECRET`: *Crie uma chave secreta complexa de segurança.*
   * `GEMINI_API_KEY`: *Sua chave de API do Gemini para as análises.*
   * `STRAVA_CLIENT_ID`: *Seu ID do aplicativo Strava (para oauth).*
   * `STRAVA_CLIENT_SECRET`: *Seu segredo do aplicativo Strava.*
   * `PORT`: `3000`
7. Clique em **Create Web Service**. O Render fará o build e fornecerá a URL pública da sua API (ex: `https://sidekick-api.onrender.com`).

---

## 🗄️ Parte 3: Sincronizando o Banco de Dados Online (Prisma Push)

Antes de abrir o app, você precisa criar as tabelas no seu novo banco de dados online.

1. Na sua máquina local, acesse a pasta `backend` do projeto Sidekick.
2. Altere temporariamente a variável `DATABASE_URL` do arquivo `.env` para a sua nova **Connection String online**.
3. Rode o comando de migração:
   ```bash
   npx prisma db push
   ```
4. O Prisma criará todas as tabelas (`users`, `workouts`, `mood_checks`, `calendar_events`, `user_profiles`) no banco online instantaneamente.
5. Volte o arquivo `.env` local para o banco local (`localhost`) se quiser continuar testando offline na sua máquina.

---

## 📱 Parte 4: Apontando o Aplicativo Móvel para a Nuvem

1. Na pasta raiz do projeto `mobile`, abra o arquivo `.env` (ou `.env.production`).
2. Altere o valor de `EXPO_PUBLIC_API_URL` para a URL pública gerada no deploy da sua API:
   ```env
   EXPO_PUBLIC_API_URL=https://sidekick-api.onrender.com
   ```
3. Reinicie o Metro Bundler do celular.
4. **Feito!** O aplicativo agora lerá e gravará dados diretamente no banco de dados na nuvem, permitindo que múltiplos celulares usem a mesma base sem dependência de conexões de rede local.
