# Guia de Implementação — Passaporte T.A.Y.

Este guia parte do zero: você tem a pasta `tay-passport` (do zip) e vai deixá-la publicada e
funcionando. São 4 blocos: **VS Code → Google Sheets/Apps Script → GitHub → Testes**.

Tempo estimado: 30–40 minutos na primeira vez.

---

## Bloco 1 — Preparar no VS Code

### 1.1 Instalar o VS Code
Baixe em [code.visualstudio.com](https://code.visualstudio.com) e instale (Windows/Mac).

### 1.2 Abrir o projeto
1. Extraia o `passaporte-tay.zip` em uma pasta (ex.: `Documentos/passaporte-tay`).
2. Abra o VS Code → **File → Open Folder** → selecione a pasta `tay-passport`.
3. Você verá no painel esquerdo: `passaporte.html`, `dashboard.html`, pastas `css/`, `js/`,
   `patients/`, `config/`, `gas/`, `assets/`.

### 1.3 Instalar a extensão "Live Server"
1. Clique no ícone de quadrados (Extensions) na barra lateral esquerda, ou `Ctrl+Shift+X`.
2. Busque **"Live Server"** (autor: Ritwick Dey) → **Install**.
3. Isso permite abrir o site localmente no navegador para testar antes de publicar, com atualização automática a cada alteração.

### 1.4 Testar localmente (antes de mexer em Google/GitHub)
1. Clique com o botão direito em `passaporte.html` → **Open with Live Server**.
2. Vai abrir algo como `http://127.0.0.1:5500/passaporte.html?p=ligia` no navegador.
3. Navegue pelas abas, preencha um carimbo de teste. Deve funcionar (fica salvo no navegador),
   mas o aviso vai mostrar "backend não configurado" — normal, isso é o Bloco 2.

> Se abrir o arquivo direto (duplo clique, sem Live Server), o navegador bloqueia o carregamento
> dos arquivos `.json` por segurança (erro de CORS local). Use sempre o Live Server para testar.

---

## Bloco 2 — Google Sheets + Apps Script (o backend)

### 2.1 Criar a planilha
1. Acesse [sheets.google.com](https://sheets.google.com) → **Planilha em branco**.
2. Renomeie para algo como "Passaporte T.A.Y. — Dados".
3. Na URL, copie o trecho entre `/d/` e `/edit`:
   `https://docs.google.com/spreadsheets/d/`**`1AbCxyz...`**`/edit` — esse é o `SHEET_ID`.

### 2.2 Criar o Apps Script
1. Ainda na planilha, vá em **Extensões → Apps Script**. Isso já abre o projeto conectado a essa
   planilha (mais simples que criar em script.google.com separado).
2. Apague todo o conteúdo do editor (`Code.gs`).
3. No VS Code, abra `gas/Code.gs`, selecione tudo (`Ctrl+A`), copie (`Ctrl+C`).
4. Cole no editor do Apps Script.
5. Troque a linha:
   ```js
   const SHEET_ID = 'COLE_AQUI_O_ID_DA_PLANILHA';
   ```
   pelo ID copiado no passo 2.1.
6. Salve (`Ctrl+S` ou ícone de disquete). Dê um nome ao projeto, ex.: "Passaporte T.A.Y. Backend".

### 2.3 Publicar como App da Web
1. Clique em **Implantar** (canto superior direito) → **Nova implantação**.
2. Clique no ícone de engrenagem ao lado de "Selecionar tipo" → **App da Web**.
3. Preencha:
   - Descrição: `v1`
   - Executar como: **Eu (seu e-mail)**
   - Quem pode acessar: **Qualquer pessoa**
4. Clique **Implantar**.
5. O Google vai pedir autorização (é você autorizando seu próprio script a editar sua planilha):
   **Autorizar acesso** → escolha sua conta → pode aparecer um aviso "app não verificado" →
   clique em **Avançado** → **Acessar Passaporte T.A.Y. Backend (não seguro)** → **Permitir**.
   (Isso aparece porque é um script pessoal seu, não publicado na Google Store — é seguro,
   é seu próprio código.)
6. Copie a **URL do app da Web** — termina em `/exec`. Guarde essa URL.

> Sempre que você **editar** o `Code.gs` depois, precisa ir em **Implantar → Gerenciar
> implantações → ✏️ (editar) → Nova versão → Implantar** para as mudanças valerem. Só salvar
> (`Ctrl+S`) no editor não atualiza a versão publicada.

### 2.4 Conectar o site à URL
1. No VS Code, abra `config/site.json`.
2. Cole a URL copiada:
   ```json
   {
     "sync_url": "https://script.google.com/macros/s/AKfycb.../exec",
     "dashboard_passphrase": "escolha-uma-senha-aqui"
   }
   ```
3. Troque `dashboard_passphrase` para uma senha sua (é a senha do painel).
4. Salve o arquivo.

### 2.5 Testar o backend isoladamente
Cole a URL do `/exec` direto no navegador. Deve aparecer algo como:
```json
{"ok":true,"rows":[]}
```
Se aparecer isso, o backend está no ar. Se der erro, revise o `SHEET_ID` e repita o passo 2.3.

---

## Bloco 3 — Publicar no GitHub (GitHub Pages)

### 3.1 Criar conta e repositório
1. Se ainda não tem, crie uma conta em [github.com](https://github.com).
2. Clique em **+ → New repository**.
3. Nome: `passaporte-tay` (pode ser outro). Deixe **Public** (necessário para o GitHub Pages
   gratuito funcionar direto; se quiser privado, GitHub Pages privado exige plano pago).
4. Não marque nenhuma opção extra (sem README, sem .gitignore) — vamos subir os arquivos que já
   existem. Clique **Create repository**.

### 3.2 Instalar o Git (se ainda não tiver)
Baixe em [git-scm.com](https://git-scm.com/downloads) e instale (aceite as opções padrão).

### 3.3 Publicar pelo VS Code (interface, sem digitar comandos)
1. No VS Code, com a pasta `tay-passport` aberta, clique no ícone de **Source Control**
   (terceiro ícone da barra lateral, parece um "Y" ramificado), ou `Ctrl+Shift+G`.
2. Clique em **Initialize Repository**.
3. Vai aparecer a lista de todos os arquivos como "Changes". Clique no **+** ao lado de
   "Changes" (ou no botão de três pontinhos → **Stage All Changes**).
4. Na caixinha de mensagem no topo, escreva algo como `versão inicial` e clique no ✔ (Commit).
5. Clique em **Publish Branch** (vai aparecer no lugar do botão de commit).
6. O VS Code vai pedir login no GitHub — autorize.
7. Escolha **Publish to GitHub public repository**, e selecione o repositório
   `passaporte-tay` que você criou (ou deixe o VS Code criar um novo com esse nome, se preferir
   pular o passo 3.1).

> Alternativa por linha de comando, se preferir (terminal integrado do VS Code, `` Ctrl+` ``):
> ```bash
> git init
> git add .
> git commit -m "versão inicial"
> git branch -M main
> git remote add origin https://github.com/SEU-USUARIO/passaporte-tay.git
> git push -u origin main
> ```

### 3.4 Ativar o GitHub Pages
1. No site do GitHub, abra seu repositório → **Settings** → **Pages** (menu lateral esquerdo).
2. Em **Source**, escolha **Deploy from a branch**.
3. Em **Branch**, escolha `main` e pasta `/ (root)` → **Save**.
4. Aguarde 1–3 minutos. A página vai mostrar a URL publicada, algo como:
   `https://seu-usuario.github.io/passaporte-tay/`

---

## Bloco 4 — Testar tudo publicado

1. Acesse `https://seu-usuario.github.io/passaporte-tay/passaporte.html?p=ligia`.
2. Registre um carimbo de teste.
3. Abra a planilha do Google — deve aparecer uma nova linha na aba "Eventos" em poucos segundos.
4. Acesse `https://seu-usuario.github.io/passaporte-tay/dashboard.html`, digite a senha definida
   no passo 2.4, escolha "Lígia" no seletor — o carimbo de teste deve aparecer.
5. Apague a linha de teste na planilha quando terminar de validar.

### Enviando o link para uma paciente
- Lígia (já configurada): `.../passaporte.html?p=ligia`
- Nova paciente: copie `patients/_template.json`, renomeie (ex.: `joana.json`), preencha os
  campos, faça commit + push (Bloco 3.3, passos 3–5) e envie
  `.../passaporte.html?p=joana`.

---

## Erros comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| "backend não configurado ainda" | `sync_url` ainda com `COLE_AQUI...` | Repita o passo 2.4 |
| Carimbo não aparece na planilha | Implantação do Apps Script desatualizada | Implantar → Gerenciar implantações → Nova versão |
| Página em branco / erro CORS ao testar local | Abriu o `.html` direto (duplo clique) | Use sempre o Live Server (passo 1.4) |
| "Paciente não encontrada" | Link com `?p=` de um id que não tem arquivo em `patients/` | Confira o nome do arquivo `.json` |
| Painel pede senha errada | Senha diferente da configurada | Confira `dashboard_passphrase` em `config/site.json` |
| GitHub Pages mostra 404 | Pages ainda propagando, ou branch/pasta errada em Settings → Pages | Aguarde alguns minutos; confira Branch = main, pasta = / (root) |
