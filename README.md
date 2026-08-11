# Sidekick 👟🔥

> **Seu Companheiro Inteligente de Jornada e Treino**

O **Sidekick** é um aplicativo móvel premium projetado para simplificar dados brutos de treinos de corrida e ciclismo e traduzi-los em relatórios motivadores, sarcásticos ou técnicos através de um **companheiro digital inteligente** personalizado.

O projeto consiste em um aplicativo móvel multiplataforma (**React Native + Expo**) e um servidor back-end (**Node.js + Express + Prisma**) integrado às APIs do **Strava** e do **Google Gemini AI**.

---

## ✨ Funcionalidades Principais

- 🔄 **Sincronização com o Strava**: Conexão simples e direta para importar atividades físicas (corrida e pedalada) em tempo real.
- 🧠 **Companheiro Digital IA**: Customização de Nome, Gênero e Personalidade (Motivador, Rígido, Bravo, Sarcástico ou Calmo) do seu parceiro digital de treinos.
- 💬 **Chat em Tempo Real**: Converse diretamente com seu companheiro sobre fisiologia do esporte, dicas de cadência, ritmo (pace) ou nutrição, blindado contra assuntos fora do escopo esportivo.
- 📅 **Calendário e Diário de Treinos**: Planeje compromissos, agende alarmes de notificação no celular e registre a sua percepção de esforço físico (escala de 1 a 5 com emojis) juntamente com anotações sobre como se sentiu no treino.
- 📊 **Relatório de Evolução Histórica (Premium)**: Análises de progresso acumulado com conquistas gamificadas e comparações divertidas de quilometragem.
- 📧 **Sistema de E-mails**: E-mails automáticos de boas-vindas ao se cadastrar e envio de código de 6 dígitos para redefinir senha esquecida via SMTP.

---

## 🛠️ Tecnologias Utilizadas

### Mobile
- **React Native** & **Expo** (SDK 52+)
- **Expo Router** (Navegação estruturada por pastas)
- **TypeScript** & **Context API** (Gerenciamento de estado global)
- **Expo Notifications** (Agendamento nativo de lembretes)

### Backend
- **Node.js** & **Express**
- **Prisma ORM** (Modelagem de dados e migrations)
- **PostgreSQL** (Hospedado via **Supabase**)
- **Google Gemini 1.5 Flash API** (Geração de narrativas e chatbot)
- **Nodemailer** (Disparo de e-mails transacionais via SMTP)

---

## 🚀 Como Executar o Projeto Localmente

### 1. Pré-requisitos
- Node.js (v18+)
- Conta no Supabase (PostgreSQL)
- Conta no Google AI Studio (API Key do Gemini)
- Conta de desenvolvedor do Strava (Client ID e Secret)

---

### 2. Configurando o Servidor (Backend)
1. Navegue até a pasta do servidor:
   ```bash
   cd backend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env` baseado no `.env.example` e preencha as variáveis de ambiente:
   ```env
   DATABASE_URL="sua-url-do-supabase"
   GEMINI_API_KEY="sua-chave-do-gemini"
   JWT_SECRET="chave-secreta-jwt"
   
   # E-mails (Gmail SMTP)
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT=587
   SMTP_USER="seu-email-verificado@gmail.com"
   SMTP_PASS="sua-senha-de-app-de-16-letras"
   SMTP_FROM='"Sidekick" <seu-email-verificado@gmail.com>'
   ```
4. Execute as migrações do banco de dados:
   ```bash
   npx prisma migrate dev
   ```
5. Inicie o servidor em modo de desenvolvimento:
   ```bash
   npm run dev
   ```

---

### 3. Configurando o Aplicativo (Mobile)
1. Navegue até a pasta do aplicativo:
   ```bash
   cd mobile
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Certifique-se de preencher a URL do servidor no arquivo `.env` para testes locais ou de produção:
   ```env
   EXPO_PUBLIC_API_URL=https://sua-api.onrender.com
   ```
4. Inicie o Metro Bundler da Expo:
   ```bash
   npx expo start
   ```
5. Escaneie o QR Code exibido no terminal utilizando o app do **Expo Go** no seu celular Android.

---

## 🔒 Regras de Segurança e Cadastro

- **Formato do E-mail**: O aplicativo e o servidor exigem e-mails em formato padrão válido (ex: `nome@provedor.com`).
- **Política de Senha Forte**: No cadastro de novas contas, a senha deve obedecer a critérios mínimos de segurança:
  - Pelo menos **6 caracteres**
  - Pelo menos **uma letra maiúscula**
  - Pelo menos **um caractere especial** (ex: `!`, `@`, `#`, `$`, `%`)

---

## 🎨 Branding & Design

O Sidekick utiliza uma paleta de cores moderna em tons escuros e vermelho vibrante (`#ff6b6b`), com micro-animações suaves e tipografia moderna para uma experiência visual premium e envolvente.
