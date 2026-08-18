# SwagWear — relatório de estudo para a FECIP

## 1. O que é o projeto

A SwagWear é um e-commerce de roupas com cadastro, login, catálogo, carrinho, pedidos e um provador virtual. O objetivo do provador é receber uma foto, combinar essa foto com a roupa escolhida e mostrar uma simulação gerada por inteligência artificial.

## 2. Arquitetura usada

```text
Navegador do usuário
        |
        v
Frontend HTML, CSS e JavaScript na Vercel
        |
        v
Backend Node.js + Express na Vercel
        |                     |
        v                     v
Supabase PostgreSQL      Hugging Face Space
(dados da loja)          (provador com IA)
```

O frontend e o backend usam o mesmo domínio: `https://swagwear.vercel.app`. Por isso, o navegador chama rotas relativas como `/api/produtos` sem depender do computador onde o projeto foi desenvolvido.

## 3. Responsabilidade de cada parte

- **HTML, CSS e JavaScript:** exibem as páginas e controlam a interação do usuário.
- **Node.js:** executa JavaScript no servidor.
- **Express:** organiza as rotas da API, como cadastro, login, produtos, pedidos e provador.
- **Supabase PostgreSQL:** guarda usuários, produtos, pedidos e itens dos pedidos.
- **Vercel:** hospeda o site e executa o backend pela internet.
- **Hugging Face Space:** executa o modelo de provador virtual em uma GPU remota.
- **localStorage:** mantém o carrinho no navegador do usuário.

## 4. Fluxo do provador virtual

```text
Usuário escolhe o produto
        |
        v
Usuário envia uma foto
        |
        v
POST /api/provador
        |
        v
Backend busca imagem_sem_fundo do produto
        |
        v
Backend chama o Hugging Face Space
        |
        v
IA gera a simulação
        |
        v
Resultado aparece no navegador
```

A categoria `camiseta / parte_superior` é convertida para `upper_body`, formato entendido pelo modelo de IA.

## 5. Privacidade das imagens

A rota do provador usa memória RAM para receber a foto. O backend não grava automaticamente a foto original:

- no PostgreSQL;
- no Supabase Storage;
- no SQLite;
- no disco do servidor;
- no `localStorage` ou `sessionStorage`.

O resultado também não é salvo automaticamente pela SwagWear. A foto é enviada ao serviço externo somente para realizar a geração solicitada. O limite do upload é 4 MB e apenas JPG, PNG e WEBP são aceitos.

## 6. Segurança

- Senhas de usuários são transformadas em hash com `bcryptjs`.
- O login devolve um token JWT com validade limitada.
- Consultas ao banco usam parâmetros para reduzir risco de SQL injection.
- Credenciais ficam em variáveis de ambiente da Vercel.
- `.env` e `.env.local` são ignorados pelo Git e não são publicados.
- Dados reais de cartão e CVV não são armazenados.
- O provedor de produção está definido como `huggingface`; não existe fallback automático para a Replicate.

## 7. Variáveis de produção

Os valores secretos não aparecem neste relatório. A produção utiliza somente as configurações necessárias:

- `DATABASE_URL`
- `DATABASE_SSL`
- `DATABASE_SSL_REJECT_UNAUTHORIZED`
- `JWT_SECRET`
- `APP_ORIGIN`
- `TRYON_PROVIDER`
- `HF_SPACE`

Na produção, `TRYON_PROVIDER` usa `huggingface` e `HF_SPACE` identifica `zepolmix2/swagwear-virtual-tryon`.

## 8. Testes finais realizados

Em 17 de agosto de 2026, foram confirmados no domínio público:

- páginas principais: HTTP 200;
- `GET /api/status`: HTTP 200;
- `GET /api/produtos`: HTTP 200;
- `GET /api/produtos/1`: HTTP 200;
- cadastro com usuário sintético: HTTP 201;
- login do usuário sintético: HTTP 200;
- token de login recebido corretamente;
- provador em teste real: HTTP 200;
- duração da geração real: aproximadamente 17,7 segundos;
- resultado do provador: URL HTTPS com imagem PNG acessível por HTTP 200;
- segunda tentativa automática: não realizada.

## 9. Como executar localmente

Na pasta do projeto:

```powershell
pnpm install
pnpm start
```

`pnpm install` instala as dependências descritas no projeto. `pnpm start` inicia o backend. Com a porta padrão, o site local fica em `http://localhost:3000`.

Para encerrar o servidor, pressione `Ctrl + C` no terminal em que ele está sendo executado.

## 10. Limitações conhecidas

- O ZeroGPU gratuito pode ter fila, demora ou cota diária.
- A infraestrutura gratuita é adequada para protótipo e apresentação, não para uma loja com muitos acessos simultâneos.
- O endereço do resultado é fornecido pelo serviço de IA e pode não ser permanente.
- O carrinho permanece no navegador até que o pedido seja enviado ao backend.
- O IDM-VTON usado no Space possui licença voltada a uso acadêmico e não comercial; uma operação comercial exige nova avaliação de licença e infraestrutura.

## 11. Resultado final

A arquitetura da FECIP está funcional pela internet: frontend, backend, banco PostgreSQL e provador virtual se comunicam sem depender do computador de desenvolvimento para permanecer online.
