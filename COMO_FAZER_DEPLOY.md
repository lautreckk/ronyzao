# 🚀 COMO FAZER DEPLOY DO DOZE (3 Passos Simples)

## ✅ SEU APP ESTÁ 100% PRONTO!

A pasta `dist/` contém tudo que você precisa:
- **Tamanho:** 7.3 MB
- **Arquivos:** Build completo do Doze
- **Branding:** "Doze" configurado
- **Funcionalidades:** AI, Planner, Notificações

---

## 📍 ONDE ESTÁ A PASTA `dist/`?

No **Explorer** (painel esquerdo), você verá:

```
WORKSPACE
├── dist/          👈 ESTA PASTA!
│   ├── _expo/
│   ├── assets/
│   ├── favicon.ico
│   ├── index.html
│   └── _redirects
├── app/
├── components/
└── ...outros arquivos
```

**IMPORTANTE:** Você vai fazer UPLOAD ou DEPLOY apenas da pasta `dist/`

---

## 🌐 OPÇÃO 1: Vercel (Interface Web) ⭐ RECOMENDADO

### Passo 1: Acesse o Vercel
1. Abra: https://vercel.com/login
2. Faça login (GitHub, GitLab ou Email)

### Passo 2: Criar Projeto
1. Clique no botão **"Add New..."** (canto superior direito)
2. Selecione **"Project"**

### Passo 3: Upload via CLI ou Interface

**OPÇÃO A - Via Interface (Mais Fácil):**
1. No Vercel, vá em: https://vercel.com/new
2. Role até **"Or, deploy without Git"**
3. Clique em **"Browse"**
4. Navegue até a pasta `dist/` do seu projeto
5. Selecione TODA a pasta `dist/`
6. Configure:
   - **Project Name:** doze
   - **Framework Preset:** Other
   - **Root Directory:** . (ponto)
7. Clique em **"Deploy"**

**OPÇÃO B - Via GitHub (Automático):**
1. Crie um repositório no GitHub
2. Faça upload de TODO o projeto (não só a pasta dist/)
3. No Vercel, clique em **"Import Git Repository"**
4. Selecione seu repositório
5. Vercel detectará automaticamente as configurações
6. Clique em **"Deploy"**

### ✅ Pronto!
Você receberá uma URL: `https://doze-[random].vercel.app`

---

## ☁️ OPÇÃO 2: Netlify Drop (Mais Rápido)

### Passo 1: Acesse Netlify Drop
1. Abra: https://app.netlify.com/drop
2. Você NEM precisa criar conta!

### Passo 2: Arraste a Pasta
1. Abra o Explorer (lado esquerdo do VS Code)
2. Encontre a pasta `dist/`
3. **Arraste e solte** a pasta `dist/` na página do Netlify
4. Aguarde o upload (10-30 segundos)

### ✅ Pronto!
Você receberá uma URL aleatória: `https://random-name.netlify.app`

**Para personalizar:**
- Crie conta no Netlify
- Vá em: Site Settings → Change Site Name

---

## 📦 OPÇÃO 3: Firebase Hosting

### Passo 1: Instalar Firebase Tools (PRECISA DE TERMINAL)
```bash
npm install -g firebase-tools
```

### Passo 2: Login e Init
```bash
firebase login
firebase init hosting
```

### Passo 3: Deploy
```bash
firebase deploy
```

---

## 📱 OPÇÃO 4: Upload Manual (Qualquer Hospedagem)

Se você já tem uma hospedagem (AWS, DigitalOcean, etc.):

1. Baixe a pasta `dist/` para seu computador
2. Faça upload via FTP/SFTP/painel da hospedagem
3. Configure para servir arquivos estáticos
4. Pronto!

---

## 🎯 RECOMENDAÇÃO PARA VOCÊ

### Se NÃO quer usar terminal:
✅ **Use NETLIFY DROP** (Opção 2)
- Mais rápido
- Sem terminal
- Sem configuração

### Se quer algo profissional:
✅ **Use VERCEL via GitHub** (Opção 1B)
- Deploy automático
- Custom domain fácil
- Updates automáticos

---

## 🔑 RESUMO SUPER SIMPLES

### Para Netlify (SEM TERMINAL):
1. Vá para: https://app.netlify.com/drop
2. Arraste a pasta `dist/` (do Explorer do VS Code)
3. Solte na página
4. Pronto! 🎉

### Para Vercel (SEM TERMINAL):
1. Vá para: https://vercel.com/new
2. Role até "Or, deploy without Git"
3. Upload da pasta `dist/`
4. Clique em Deploy
5. Pronto! 🎉

---

## ❓ ONDE ENCONTRAR A PASTA `dist/` NO SEU COMPUTADOR

Se precisar fazer download da pasta `dist/`:

**No VS Code (Fastshot):**
1. Clique com botão direito na pasta `dist/` (no Explorer)
2. Selecione **"Download..."** ou **"Reveal in File Explorer"**
3. A pasta será baixada para seu computador

**Localização no servidor:**
```
/workspace/dist/
```

---

## 🆘 PRECISA DE AJUDA?

### Se a pasta `dist/` não aparece no Explorer:
1. Clique no ícone de **"Refresh"** no Explorer
2. Ou pressione `Ctrl + Shift + E` para focar no Explorer

### Se o upload falhar:
1. Verifique o tamanho da pasta (deve ser ~7.3MB)
2. Verifique se tem conexão com internet
3. Tente compactar a pasta em `.zip` e fazer upload do zip

---

## ✅ CHECKLIST FINAL

- ✅ Pasta `dist/` localizada no Explorer
- ✅ Tamanho: 7.3 MB
- ✅ Contém: `index.html`, `_expo/`, `assets/`, `_redirects`
- ✅ Pronta para upload

---

## 🎉 APÓS O DEPLOY

Compartilhe a URL com seus amigos:
```
https://seu-app.vercel.app
ou
https://seu-app.netlify.app
```

Eles podem:
- Abrir no navegador (mobile ou desktop)
- Adicionar à tela inicial do celular
- Usar todas as funcionalidades do Doze! 📱

---

**Escolha Netlify Drop se quiser o mais rápido (SEM TERMINAL)! 🚀**
