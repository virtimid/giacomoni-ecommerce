# Giacomoni E-commerce

MVP acadêmico de uma loja de pijamas e moda íntima, desenvolvido como Projeto de Desenvolvimento de Sistemas (PDS).

## Tecnologias

- React + Vite no frontend
- Node.js + Express no backend
- MongoDB + Mongoose para persistência

## Como executar

1. Instale as dependências na raiz:

   ```bash
   npm install
   ```

2. Copie `backend/.env.example` para `backend/.env` e informe a conexão com o MongoDB.

3. Em dois terminais, execute:

   ```bash
   npm run dev:backend
   npm run dev:frontend
   ```

4. Abra `http://localhost:5173`.

Se o MongoDB ainda não estiver configurado, a interface usa produtos de demonstração para permitir o desenvolvimento visual.

### Execucao local completa com Docker

1. Inicie o MongoDB local:

   ```bash
   npm run db:up
   ```

2. Cadastre o administrador e os produtos iniciais:

   ```bash
   npm run seed
   ```

3. Inicie o backend e o frontend em terminais separados:

   ```bash
   npm run dev:backend
   npm run dev:frontend
   ```

4. Abra `http://localhost:5173`.

O acesso administrativo local configurado para demonstracao fica em `admin@giacomoni.local`. A senha permanece apenas no arquivo `backend/.env`, que nao deve ser enviado ao repositorio.

## Verificacao do projeto

Execute os testes automatizados e a compilacao de producao:

```bash
npm test
npm run build
```

O fluxo de verificacao cobre regras de itens, variacoes, transicoes de status e seguranca da busca. O roteiro de validacao manual esta em `docs/TESTES.md`.

## Publicacao

O projeto inclui imagens Docker, configuracao do Render para a API, configuracao do Vercel para o frontend e integracao continua no GitHub Actions. As instrucoes completas e as variaveis obrigatorias estao em `docs/DEPLOY.md`.

## Configuração do MongoDB e administrador

1. Crie um cluster gratuito no MongoDB Atlas e um usuário de banco de dados.
2. Autorize o IP usado para o desenvolvimento no Atlas.
3. Copie `backend/.env.example` para `backend/.env`.
4. Substitua `MONGODB_URI` pela conexão fornecida pelo Atlas.
5. Defina uma chave longa em `JWT_SECRET` e escolha `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
6. Cadastre o administrador e os produtos iniciais:

   ```bash
   npm run seed --workspace backend
   ```

7. Inicie o backend e o frontend. Na loja, clique em **Administração** para acessar o painel.

O arquivo `.env` não deve ser enviado ao GitHub. As senhas administrativas são armazenadas somente como hash usando bcrypt.

## Painel administrativo

O painel protegido permite:

- acompanhar produtos, pedidos pendentes, vendas do dia e estoque baixo;
- cadastrar, editar e desativar produtos;
- administrar tamanhos, cores e quantidades em estoque;
- visualizar pedidos e atualizar seus status;
- filtrar pedidos por cliente, status e data;
- consultar endereço, itens, variações, valores e histórico de cada pedido;
- cancelar pedidos com devolução automática das unidades ao estoque.

## Rotas de pedidos

- `POST /api/orders`: cria o pedido e reserva o estoque da variação escolhida.
- `GET /api/orders`: lista pedidos com paginação.
- `GET /api/orders/:id`: consulta os detalhes de um pedido.
- `PATCH /api/orders/:id/status`: altera o status para `enviado`, `concluído` ou `cancelado`.

A listagem aceita os filtros `page`, `limit`, `status`, `date` (`AAAA-MM-DD`) e `search`.
Quando um pedido é criado, o estoque de cada tamanho e cor é reduzido por uma operação condicional que impede valores negativos. Se o pedido for cancelado, as quantidades são devolvidas uma única vez.

