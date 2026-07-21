# Passaporte T.A.Y.

Passaporte digital de experiências para pacientes do Método T.A.Y. — funciona offline (localStorage),
sem banco de dados, hospedado no GitHub Pages, com dados centralizados numa Planilha Google via
Google Apps Script. Um painel em tempo real (com atualização automática) mostra a evolução de cada
paciente para a nutricionista.

## Estrutura

```
passaporte.html      → app da paciente (o "passaporte" em si)
dashboard.html        → painel da nutricionista
index.html             → página inicial simples
css/style.css           → visual (paleta e tipografia da marca)
js/app.js                → lógica do passaporte (offline-first)
js/dashboard.js           → lógica do painel (polling em tempo real)
js/config-loader.js        → carrega as configs
config/site.json             → URL do backend + senha do painel
patients/ligia.json           → configuração da Lígia (exemplo pronto)
patients/_template.json        → copie para criar uma nova paciente
gas/Code.gs                     → cole no Google Apps Script
```

## Passo 1 — Criar a Planilha Google

1. Crie uma planilha nova em [sheets.google.com](https://sheets.google.com).
2. Copie o **ID da planilha** — é o trecho da URL entre `/d/` e `/edit`:
   `https://docs.google.com/spreadsheets/d/`**`ESTE_TRECHO_AQUI`**`/edit`

## Passo 2 — Publicar o backend (Google Apps Script)

1. Acesse [script.google.com](https://script.google.com) → **Novo projeto**.
2. Apague o conteúdo padrão e cole o conteúdo de `gas/Code.gs`.
3. Troque a linha `const SHEET_ID = 'COLE_AQUI_O_ID_DA_PLANILHA';` pelo ID copiado no passo 1.
4. Clique em **Implantar → Nova implantação**.
   - Tipo: **App da Web**
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
5. Autorize o acesso (é a sua própria conta Google pedindo permissão para escrever na planilha).
6. Copie a **URL do app da Web** gerada (termina em `/exec`).

## Passo 3 — Conectar o site ao backend

Abra `config/site.json` e cole a URL copiada em `sync_url`:

```json
{
  "sync_url": "https://script.google.com/macros/s/SEU_ID_AQUI/exec",
  "dashboard_passphrase": "escolha-uma-senha-para-o-painel"
}
```

> A senha do painel é uma proteção simples (só para evitar acesso casual) — não é segurança real,
> já que roda inteiramente no navegador. Se quiser algo mais robusto no futuro, dá para evoluir
> para login com Google.

## Passo 4 — Publicar no GitHub Pages

1. Crie um repositório no GitHub (pode ser privado ou público) e suba todos estes arquivos.
2. Em **Settings → Pages**, escolha a branch `main` e a pasta raiz (`/`).
3. Em alguns minutos seu site estará em algo como:
   `https://seu-usuario.github.io/passaporte-tay/`

## Passo 5 — Personalizar para cada paciente (sem tocar no código)

1. Copie `patients/_template.json`, renomeie para o id da paciente (ex.: `patients/joana.json`).
2. Preencha o nome, a saudação, as opções de experiência (ex.: trocar "cafeterias" por outra coisa
   se a paciente não gostar de café), as missões e as categorias da lista de desejos.
3. Envie para a paciente o link:
   `https://seu-usuario.github.io/passaporte-tay/passaporte.html?p=joana`

O arquivo `patients/ligia.json` já vem pronto com a estrutura que você desenhou (cafeterias, 12
carimbos, as 10 missões e os 6 vistos).

## Passo 6 — Acompanhar no painel

Acesse `dashboard.html`, digite a senha definida no passo 3, e escolha a paciente no seletor.
O painel busca os dados a cada 15 segundos automaticamente — assim que a paciente registrar um
carimbo (mesmo que ela estivesse offline no momento e sincronize depois), ele aparece no painel e
na planilha sem você precisar fazer nada.

## Como funciona o modo offline

- Cada carimbo, missão marcada ou item da lista de desejos é salvo **imediatamente** no navegador
  da paciente (`localStorage`), então o app funciona mesmo sem internet.
- Em paralelo, o app tenta enviar para a planilha. Se não houver internet, o registro fica numa
  fila local e é reenviado automaticamente assim que a conexão voltar (o app escuta o evento
  `online` do navegador e também tenta a cada 20 segundos).
- Nada é perdido: o histórico completo da paciente também continua salvo localmente no aparelho
  dela, além de estar na planilha.

**Importante:** o `localStorage` é por navegador/aparelho. Se a paciente trocar de celular, o
histórico *local* não migra automaticamente — mas tudo que já foi sincronizado continua salvo na
planilha e pode, futuramente, ser recarregado por um recurso de "restaurar meu passaporte" (não
incluído nesta primeira versão, mas dá pra evoluir).

## Ideias para evoluir depois

- Adicionar um botão "restaurar passaporte" que busca os carimbos já sincronizados da planilha
  (via `?action=list&patient=id`) e repovoa o `localStorage`, para o caso de troca de aparelho.
- Gerar um PDF/imagem de "página do passaporte" a cada carimbo, para a paciente compartilhar.
- Exportar a visão do painel em PDF ao final do acompanhamento, como lembrança para a paciente.
