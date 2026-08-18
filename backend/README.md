# Backend SwagWear — etapa 1

Esta pasta contém o servidor, o banco e as rotas iniciais de cadastro, login e produtos. O carrinho existente continua usando `localStorage`.

## Como executar

1. Instale uma versão LTS atual do Node.js.
2. Abra um terminal na pasta principal do projeto.
3. Execute `npm install` para baixar Express e SQLite.
4. Execute `npm start` para criar o banco e iniciar o servidor.
5. Abra `http://localhost:3000` no navegador.
6. Para testar o backend, abra `http://localhost:3000/api/status`.

O arquivo `backend/database/swagwear.db` será criado automaticamente. Se quiser apenas preparar o banco sem iniciar o site, execute `npm run init-db`.

## SQLite e PostgreSQL

- Sem `DATABASE_URL`, `database/index.js` seleciona SQLite para desenvolvimento.
- Com `DATABASE_URL`, a mesma API seleciona PostgreSQL para produção.
- `npm run migrate` cria as tabelas e índices do banco selecionado.
- `npm run seed` insere os produtos iniciais sem duplicá-los.

Os controladores usam somente `get`, `all`, `run` e `transaction`. Os adaptadores
traduzem essas operações para cada banco. Pedidos continuam atômicos: qualquer falha
executa rollback do pedido, dos itens e do estoque.

## Preparação para Vercel

`api/index.js` é o único entrypoint serverless e importa o mesmo Express usado localmente.
`vercel.json` encaminha `/api/*` a esse entrypoint e preserva o caminho para as rotas.
O frontend usa URLs relativas como `/api/produtos`, funcionando no mesmo domínio em
desenvolvimento e produção.

Antes do deploy, configure `DATABASE_URL`, `JWT_SECRET`, `APP_ORIGIN` e as variáveis da IA
no ambiente do Vercel. Execute a migration e o seed contra o PostgreSQL de produção como
etapa controlada; o servidor não altera o schema automaticamente em cada cold start.

O adaptador valida certificados SSL por padrão. O Session Pooler testado localmente apresentou
uma cadeia autoassinada; por isso o `.env` local usa `DATABASE_SSL_REJECT_UNAUTHORIZED=false`
de forma restrita ao Pool PostgreSQL. Para a configuração mais forte em produção, instale o
certificado CA fornecido pelo Supabase e mantenha a validação ativada.

## Organização

- `server.js`: inicia o Express, serve o frontend atual e oferece a rota de teste.
- `database/schema.sql`: descreve as tabelas, relações, validações e índices.
- `database/database.js`: abre o SQLite e aplica o schema.
- `database/init.js`: permite inicializar o banco por um comando separado.
- `controllers/usuariosController.js`: valida cadastro/login e protege as senhas com hash.
- `controllers/produtosController.js`: consulta produtos ativos no SQLite.
- `routes/usuarios.js`: define as rotas `/api/cadastro` e `/api/login`.
- `routes/produtos.js`: define as rotas de consulta do catálogo.
- `routes/pedidos.js`: cria pedidos autenticados e recalcula preços pelo banco.
- `routes/provador.js`: recebe uma foto temporária com limite de 5 MB.
- `services/virtualTryOnService.js`: concentra modo mock, categorias e Replicate.

## Rotas disponíveis

- `POST /api/cadastro`: cria uma conta com senha protegida por hash.
- `POST /api/login`: compara a senha informada com o hash salvo.
- `GET /api/produtos`: lista os produtos ativos.
- `GET /api/produtos/:id`: busca um produto ativo pelo id.
- `POST /api/pedidos`: cria pedido e itens usando um token Bearer.
- `POST /api/provador`: recebe `foto` e `produto_id` como FormData.

## Provador virtual local

Sem configuração adicional, o projeto usa `TRYON_MOCK=true` por padrão. Nesse modo,
nenhuma API externa é chamada e a própria foto enviada volta como resultado simulado.

Para preparar um teste real, copie `.env.example` para `.env`, coloque seu token apenas
no arquivo local e acrescente `TRYON_MOCK=false`. Nunca coloque o token no HTML.

O upload usa memória RAM e aceita uma imagem JPG, PNG ou WEBP de até 5 MB. A foto não é
gravada no SQLite, no disco nem no `localStorage`.

## Autenticação e pedidos

O login devolve um token com validade de oito horas. O carrinho envia esse token no
cabeçalho `Authorization: Bearer ...`. O backend usa o usuário do token, consulta cada
produto no SQLite, verifica o estoque e recalcula o total antes de criar o pedido.

## Segurança de pagamento

O banco registra apenas o tipo do pagamento (`cartao`, `pix` ou `boleto`). Número do cartão, validade e CVV não são armazenados. Em uma etapa futura, pagamentos reais deverão passar por um provedor especializado.
