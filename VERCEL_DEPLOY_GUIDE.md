# 🚀 Guia de Deploy no Vercel - Correção de Variáveis de Ambiente

## ❌ Problema Identificado

O app está mostrando "[MOCK AI RESPONSE]" porque as variáveis de ambiente foram adicionadas **DEPOIS** do último build. No Expo Web, variáveis `EXPO_PUBLIC_*` são injetadas no JavaScript bundle **durante o build**, não em runtime.

---

## ✅ Solução Completa

### Passo 1: Verificar Variáveis no Vercel

1. Acesse: https://vercel.com/olautreck-gmailcoms-projects/ronyzao-qe5v
2. Vá em **Settings** → **Environment Variables**
3. Confirme que estas 4 variáveis existem:

```env
EXPO_PUBLIC_NEWELL_API_URL=https://newell.fastshot.ai
EXPO_PUBLIC_PROJECT_ID=1de1f56f-4590-4e79-aa09-7ae09e21021a
EXPO_PUBLIC_POSTHOG_API_KEY=phc_yrRNNlvsUNi3opSHLQ80ATQhRstPWGeELiCihGMewCj
EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

4. ✅ Certifique-se de que estão marcadas para **Production**

---

### Passo 2: Forçar Redeploy SEM Cache (CRÍTICO!)

Este é o passo mais importante:

1. Vá para a aba **Deployments**
2. Encontre o último deployment (o mais recente)
3. Clique nos **três pontinhos (⋮)** ao lado
4. Selecione **"Redeploy"**
5. **❗ IMPORTANTE:** Desmarque a opção **"Use existing Build Cache"**
6. Clique em **"Redeploy"**

**Por que isso é necessário?**
- O cache antigo contém um build sem as variáveis de ambiente
- Um build limpo vai injetar as variáveis no código JavaScript
- Sem limpar o cache, as variáveis não serão incluídas

---

### Passo 3: Verificar se Funcionou

Após o deploy completar (2-5 minutos):

1. Abra o app: https://ronyzao-qe5v.vercel.app/onboarding
2. Você verá uma caixa amarela **"Configuração OK"** ou **"Configuração Incompleta"**
3. Clique nela para ver os detalhes
4. Se mostrar ✅ para **Newell API URL** e **Project ID**, está correto!

**Teste a IA:**
1. Clique em qualquer pilar para expandir
2. Digite um objetivo
3. Clique em **"Transformar em Meta Acionável"**
4. Deve aparecer uma resposta real da IA (não mais "MOCK AI RESPONSE")

---

### Passo 4: Remover Componente de Diagnóstico

Após confirmar que funcionou, remova o componente de diagnóstico:

1. Abra `app/onboarding.tsx`
2. Remova estas linhas:
```typescript
import { ConfigDiagnostic } from '@/components/ConfigDiagnostic';

// E também remova:
<ConfigDiagnostic />
```

3. Commit e push:
```bash
git add .
git commit -m "Remove diagnostic component"
git push
```

---

## 🔍 Verificação Manual (Console do Navegador)

Se precisar verificar manualmente se as variáveis estão no bundle:

1. Abra o app no navegador
2. Pressione **F12** para abrir DevTools
3. Vá na aba **Console**
4. Cole e execute:

```javascript
console.log('API URL:', process.env.EXPO_PUBLIC_NEWELL_API_URL);
console.log('Project ID:', process.env.EXPO_PUBLIC_PROJECT_ID);
```

**Resultado esperado:**
```
API URL: https://newell.fastshot.ai
Project ID: 1de1f56f-4590-4e79-aa09-7ae09e21021a
```

**Se aparecer `undefined`:**
- O build não incluiu as variáveis
- Repita o Passo 2, garantindo que desmarcou "Use existing Build Cache"

---

## 🛠️ Como Funciona (Técnico)

### Build Local vs Vercel

**Build Local:**
- Lê `.env` na raiz do projeto
- Injeta `EXPO_PUBLIC_*` no bundle durante `npx expo export`
- Variáveis ficam "hardcoded" no JavaScript final

**Build Vercel:**
- Lê variáveis de ambiente do painel do Vercel
- Injeta durante o build automático do Git push
- Cache pode manter builds antigos sem as variáveis

### Por que `EXPO_PUBLIC_` é especial?

No Expo, apenas variáveis com este prefixo são:
1. Expostas para o código do cliente
2. Injetadas estaticamente no bundle
3. Disponíveis via `process.env.EXPO_PUBLIC_*`

Outras variáveis (sem o prefixo) só ficam disponíveis no servidor.

---

## ⚠️ Problemas Comuns

### 1. "Ainda mostra MOCK após redeploy"
- ✅ Certifique-se de que desmarcou "Use existing Build Cache"
- ✅ Aguarde o deploy completar totalmente (não apenas "Building")
- ✅ Limpe o cache do navegador ou abra em aba anônima

### 2. "Variáveis aparecem como undefined"
- ✅ Confirme que as variáveis estão em **Production** no Vercel
- ✅ Verifique se os nomes estão EXATAMENTE como especificado (case-sensitive)
- ✅ Force um novo deploy sem cache

### 3. "Erro: Project validation failed"
- ✅ Verifique se o `EXPO_PUBLIC_PROJECT_ID` está correto
- ✅ Confirme que não tem espaços extras no valor

---

## 📝 Checklist Final

- [ ] Variáveis adicionadas no Vercel Settings
- [ ] Variáveis marcadas para Production
- [ ] Redeploy feito SEM cache
- [ ] Deploy completado com sucesso
- [ ] Componente de diagnóstico mostra ✅
- [ ] Teste de IA funcionou (resposta real)
- [ ] Componente de diagnóstico removido do código
- [ ] Build final feito e publicado

---

## 🎯 Resultado Esperado

Após seguir todos os passos:

✅ IA funcionando corretamente
✅ Analytics (PostHog) rastreando eventos
✅ Sem mensagens de "MOCK AI RESPONSE"
✅ Experiência completa do usuário

---

**Criado em:** 26 de Dezembro de 2024
**Última atualização:** 26/12/2024
