# Plano de testes do sistema Giacomoni

## Verificacao automatizada

Execute `npm test` na raiz. Os testes validam agrupamento de itens iguais, separacao de variacoes, rejeicao de itens invalidos, transicoes de pedido e escape de caracteres usados na busca.

Execute `npm run build` para confirmar que o frontend gera a versao de producao.

## Roteiro funcional

| Area | Procedimento | Resultado esperado |
| --- | --- | --- |
| Catalogo | Abrir a loja e pesquisar um produto | Produtos ativos aparecem e os filtros respondem |
| Carrinho | Escolher tamanho e cor e adicionar unidades | Carrinho preserva variacao, quantidade e subtotal |
| Checkout | Informar cliente e endereco validos | Pedido e criado e o estoque diminui |
| Estoque | Tentar comprar mais unidades que o disponivel | API recusa sem deixar estoque negativo |
| Administracao | Entrar com credenciais validas | Painel e indicadores ficam disponiveis |
| Pedidos | Filtrar e abrir um pedido | Detalhes, endereco, itens e historico aparecem |
| Status | Enviar e concluir um pedido | Historico registra as mudancas permitidas |
| Cancelamento | Cancelar um pedido pendente | Estoque retorna uma unica vez |
| Seguranca | Acessar rota protegida sem token | API responde com acesso nao autorizado |

## Resultado validado em 8 de novembro de 2026

O teste integrado local confirmou API saudavel, dois produtos iniciais, login administrativo, criacao de pedido, reducao do estoque de 4 para 3 e retorno para 4 apos cancelamento.
