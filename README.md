# Passaporte T.A.Y.

Passaporte digital de experiências para pacientes do Método T.A.Y. — funciona offline (localStorage),
sem banco de dados tradicional, hospedado no GitHub Pages. Os dados (pacientes cadastradas + diário
de cada uma) ficam centralizados numa Planilha Google via Google Apps Script. Um painel com
atualização automática mostra a evolução de cada paciente para a nutricionista — e é também onde
novas pacientes são cadastradas, sem precisar editar código nem publicar nada no GitHub de novo.

## Estrutura

```
passaporte.html      → app da paciente (o "passaporte" em si)
dashboard.html        → painel da nutricionista: acompanhamento + cadastro de pacientes
index.html             → página inicial simples
css/style.css           → visual (paleta e tipografia da marca)
js/app.js                → lógica do passaporte (offline-first)
js/dashboard.js           → lógica do painel (cadastro de pacientes + polling em tempo real)
js/config-loader.js        → busca a config da paciente no backend, com cache offline
config/site.json             → só a URL do backend (o token de acesso fica só no Apps Script)
gas/Code.gs                    → cole no Google Apps Script
```

> Não existem mais arquivos por paciente. Toda a personalização (nome, missões, opções de
> experiência etc.) é cadastrada pela aba **Pacientes** do painel e fica salva direto na planilha,
> numa aba chamada "Pacientes".

## Passo 1 — Criar a Planilha Google

1. Crie uma planilha nova em [sheets.google.com](https://sheets.google.com).
2. Copie o **ID da planilha** — é o trecho da URL entre `/d/` e `/edit`:
   `https://docs.google.com/spreadsheets/d/`**`ESTE_TRECHO_AQUI`**`/edit`

## Passo 2 — Publicar o backend (Google Apps Script)

1. Na planilha, vá em **Extensões → Apps Script**.
2. Apague o conteúdo padrão e cole o conteúdo de `gas/Code.gs`.
3. Troque a linha `const SHEET_ID = 'COLE_AQUI_O_ID_DA_PLANILHA';` pelo ID copiado no passo 1.
4. Clique em **Implantar → Nova implantação**.
   - Tipo: **App da Web**
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
5. Autorize o acesso (é a sua própria conta Google pedindo permissão para editar a planilha).
6. Copie a **URL do app da Web** gerada (termina em `/exec`).

O script cria sozinho, na primeira vez que for usado, duas abas na planilha:
- **Pacientes** — a configuração de cada paciente cadastrada.
- **Eventos** — cada carimbo, missão concluída e item de lista de desejos.

## Passo 3 — Conectar o site ao backend

Abra `config/site.json` e cole a URL copiada em `sync_url`:

```json
{
  "sync_url": "https://script.google.com/macros/s/SEU_ID_AQUI/exec"
}
```

### Proteger o painel e a leitura dos dados (importante)

Como o site fica num repositório **público** (exigência do GitHub Pages gratuito), qualquer
pessoa pode ver a URL do seu backend olhando o código do site. Para que estranhos não consigam
*ler* os diários das pacientes nem *cadastrar/editar* pacientes, essas ações exigem um token — mas
esse token nunca fica escrito em nenhum arquivo do projeto (nem local, nem no GitHub). Ele mora só
dentro do próprio Google Apps Script:

1. No editor do Apps Script, clique no ícone de engrenagem ⚙️ **Configurações do projeto** (menu
   lateral esquerdo).
2. Role até **Propriedades do script** → **Adicionar propriedade do script**.
3. Nome da propriedade: `ACCESS_TOKEN`
   Valor: escolha uma senha longa e única (ex.: `tay-2026-x7Qm-painel`).
4. Salve.
5. Na primeira vez que abrir `dashboard.html`, digite esse mesmo valor na tela de senha — o
   navegador guarda localmente (só no seu aparelho) e não pede de novo depois.

Sem essa propriedade configurada, o painel fica bloqueado por padrão.

A única informação que continua acessível sem token é a configuração de personalização de uma
paciente por vez, buscada pelo próprio id dela (é o que faz a página dela carregar) — isso não
inclui diário, nem outras pacientes, só os rótulos/opções do passaporte dela.

## Passo 4 — Publicar no GitHub Pages

1. Crie um repositório no GitHub e suba todos estes arquivos.
2. Em **Settings → Pages**, escolha a branch `main` e a pasta raiz (`/`).
3. Em alguns minutos seu site estará em algo como:
   `https://seu-usuario.github.io/passaporte-tay/`

## Passo 5 — Cadastrar pacientes (direto pelo painel, sem GitHub)

1. Acesse `.../dashboard.html`, digite o token (Passo 3).
2. Clique na aba **Pacientes**.
3. Preencha o formulário: nome, missões, opções de experiência (ex.: trocar "cafeterias" por outra
   coisa se a paciente não gostar de café), categorias da lista de desejos etc.
4. O link dela aparece automaticamente enquanto você digita o nome (baseado no nome, mas você pode
   clicar em "editar id" para escolher outro). Clique em **Salvar paciente**.
5. Pronto — o link já funciona, sem precisar publicar nada de novo no GitHub. Copie e envie para a
   paciente pelo botão **Copiar link** na lista abaixo do formulário.

Para editar uma paciente depois (trocar missões, opções etc.), clique em **Editar** na lista —
o id/link dela não muda, só o conteúdo.

## Passo 6 — Acompanhar no painel

Na aba **Acompanhamento**, escolha a paciente no seletor. O painel busca os dados a cada 15
segundos automaticamente — assim que a paciente registrar um carimbo (mesmo que ela estivesse
offline no momento e sincronize depois), ele aparece no painel e na planilha sem você precisar
fazer nada.

## Como funciona o modo offline

- Cada carimbo, missão marcada ou item da lista de desejos é salvo **imediatamente** no navegador
  da paciente (`localStorage`), então o app funciona mesmo sem internet.
- Em paralelo, o app tenta enviar para a planilha. Se não houver internet, o registro fica numa
  fila local e é reenviado automaticamente assim que a conexão voltar.
- A configuração da paciente (missões, opções etc.) também fica em cache no aparelho dela após o
  primeiro acesso — então mesmo sem internet, a página abre normalmente depois da primeira vez.
- Nada é perdido: o histórico completo da paciente também continua salvo localmente no aparelho
  dela, além de estar na planilha.

**Importante:** o `localStorage` é por navegador/aparelho. Se a paciente trocar de celular, o
histórico *local* não migra automaticamente — mas tudo que já foi sincronizado continua salvo na
planilha.

## Ideias para evoluir depois

- Botão "restaurar passaporte" que busca os carimbos já sincronizados da planilha e repovoa o
  `localStorage`, para o caso de troca de aparelho.
- Excluir/arquivar pacientes direto do painel (hoje dá para editar; exclusão pode ser adicionada
  facilmente reaproveitando o `patient_delete` que já existe no backend).
- Gerar um PDF/imagem de "página do passaporte" a cada carimbo, para a paciente compartilhar.
- Exportar a visão do painel em PDF ao final do acompanhamento, como lembrança para a paciente.
