# Publicacao do sistema Giacomoni

## Servicos sugeridos

- MongoDB Atlas para o banco de producao.
- Render para a API usando `render.yaml` ou `backend/Dockerfile`.
- Vercel para o frontend usando `frontend/vercel.json`.

## Variaveis do backend

Configure `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URLS`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `ADMIN_NAME`. Use valores exclusivos de producao e nunca envie o arquivo `.env` ao repositorio.

## Variavel do frontend

Configure `VITE_API_URL` com a URL base publica da API, sem acrescentar `/api`.

## Ordem de publicacao

1. Crie o cluster no MongoDB Atlas e restrinja os acessos de rede.
2. Publique a API no Render e configure as variaveis.
3. Execute o seed uma vez no ambiente de producao.
4. Publique o frontend na Vercel com `VITE_API_URL`.
5. Atualize `FRONTEND_URLS` na API com o dominio final.
6. Teste saude da API, catalogo, checkout e login administrativo.

## Integracao continua

O arquivo `.github/workflows/ci.yml` executa instalacao limpa, testes e build em cada envio ou pedido de alteracao. A publicacao externa depende das contas do proprietario no Atlas, Render, Vercel e GitHub.
