# Arquitetura do sistema Giacomoni

## Visao geral

O sistema usa uma arquitetura web em tres partes. O frontend React apresenta a loja e o painel administrativo. A API Node.js com Express aplica as regras de negocio. O MongoDB armazena administradores, produtos, variacoes, estoque e pedidos.

## Componentes

- **Frontend:** React, Vite, CSS e Lucide React. Mantem o carrinho no navegador, consulta o catalogo e envia pedidos para a API.
- **Backend:** Node.js, Express, Mongoose, JWT e bcrypt. Valida dados, protege rotas administrativas e controla o estoque.
- **Banco:** MongoDB. Os documentos de produto guardam variacoes por tamanho e cor; os pedidos preservam os dados e precos usados na compra.

## Fluxos principais

1. O cliente consulta produtos publicos e escolhe uma variacao disponivel.
2. O checkout envia cliente, endereco e itens para `POST /api/orders`.
3. A API reserva o estoque com uma atualizacao condicional e grava o pedido.
4. O administrador entra com e-mail e senha, recebe um token e administra catalogo e pedidos.
5. O cancelamento devolve o estoque uma unica vez; pedidos enviados podem ser concluidos.

## Seguranca e integridade

As senhas usam hash bcrypt. As rotas de escrita do catalogo, consulta de pedidos e indicadores exigem JWT. A API aceita apenas origens configuradas em producao. A reserva condicional impede estoque negativo e o historico registra cada mudanca de status.
