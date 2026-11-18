# Controle de Moldagem — design curto

Data: 2026-11-18 · Tamanho: mudança pequena

## Intenção e porquê
Quem lança um rompimento precisa registrar também as condições em que o lote foi
moldado: data, hora, temperatura, tempo (sol/chuva) e slump. Esses dados são do
**lote**, iguais para os rompimentos de 1, 3, 7 e 28 dias (os prints do pedido dizem
"dados do lote — iguais em todas as idades de rompimento"). Eles devem sair no laudo
(PDF) e nos relatórios, para rastreabilidade e para ajudar a achar a causa de um lote
reprovado (temperatura alta, chuva, slump fora do esperado).

## Objetivos
- Cartão **Controle de Moldagem** em `RuptureDetailPage`, logo abaixo da linha
  "Data Real do Ensaio / Responsável", com os campos Data, Hora da Moldagem,
  Temperatura (°C), Tempo (sol/chuva), Slump Test (cm) e botão próprio **Salvar Moldagem**.
- Lançado uma vez; aparece preenchido em todas as idades do mesmo lote.
- Aparece no laudo (versões interna e cliente) e no relatório mensal.

## Não-objetivos
- Moldagem diferente por idade, histórico ou auditoria de alterações.
- Tornar os campos obrigatórios ou bloquear o rompimento sem eles.
- Alterar `produced_at` ou o cronograma de rompimentos.
- Mexer no cadastro do lote (`RegisterProductionModal`).

## Anti-objetivos (seria falha mesmo que "funcione")
- "Salvar Moldagem" apagar ou alterar amostras, resultados ou responsável do rompimento.
- "Salvar Moldagem" exigir Responsável ou amostras preenchidas.
- O salvar do rompimento sobrescrever os dados de moldagem.

## Restrições
- Banco: Supabase/Postgres; migrations numeradas em `supabase/migrations` (a próxima é a 033).
  A migration precisa ser aplicada no banco antes de a tela gravar. Não há acesso ao
  Supabase nesta sessão, então a aplicação fica com o usuário.
- O laudo gera o PDF a partir do HTML da página (`QualityReportPage`), com layout
  próprio quando `exporting`. O bloco novo deve funcionar nos dois modos.
- Respeitar `isReadOnly` da tela: perfis VENDAS, GERENTE e PRODUCAO só visualizam;
  rompimento concluído só é editável por ADMIN.

## Abordagens consideradas
- **A. Colunas novas em `production_batches` (escolhida).** Padrão já usado para pista,
  fios e volume. O laudo já lê o lote com `select *`. Limite: uma moldagem por lote.
- B. Tabela `batch_moldagem` 1:1. Permite histórico, mas cada consulta ganha uma junção
  e uma política de acesso. Mais estrutura do que o necessário.
- C. Campo JSON no lote. Flexível, mas sem tipos nem validação e ruim para filtrar.

O usuário escolheu a **A**.

## Design (decidido na conversa)
- Colunas nullable em `production_batches`: `data_moldagem DATE`, `hora_moldagem TIME`,
  `temperatura_c NUMERIC(4,1)`, `tempo_clima TEXT` (`sol` | `chuva`), `slump_cm NUMERIC(4,1)`.
- Tela: `useScheduleDetail` passa a trazer as colunas do lote. Nova mutation de
  atualização do lote (mesmo padrão de `updateBatchRecipeMutation` em `useProduction.ts`).
  Ao salvar, invalidar `rupture_schedule_detail`, `production_batches` e `batch_report`.
- Laudo: nova linha "Moldagem" em "Dados Gerais", nas duas versões. Campo vazio aparece
  como "—".
- Relatório mensal: nas linhas de lotes reprovados ou com ressalva, acrescentar a moldagem
  ao texto, só com os campos preenchidos (ex.: "moldagem: 28,5 °C, chuva, slump 11 cm").

## Minhas decisões (a conferir)
- Todos os campos são opcionais e aparecem para todos os tipos de amostra
  (bloco e paver incluídos), mesmo que o slump normalmente não se aplique a eles.
- Data e Hora começam preenchidas com a data e a hora da produção do lote (fuso local),
  editáveis. Só viram dado salvo quando o usuário clica em Salvar Moldagem. Não alteram
  `produced_at`.
- Tempo: duas opções, Sol e Chuva, como no rótulo do print.
- Validação no banco: temperatura entre -10 e 60 °C; slump maior ou igual a 0.
- A edição do cartão segue o `isReadOnly` da página.

## Fica para quem constrói
- Nome exato das colunas e texto das constraints.
- Estilo do cartão (seguir os prints: título, subtítulo em caixa alta, grade de 5 colunas
  em telas médias, botão alinhado à direita).
- Formato do texto no relatório mensal e do bloco no laudo em modo `exporting`.
- Função pura para formatar a moldagem, com teste unitário em `src/test`.
