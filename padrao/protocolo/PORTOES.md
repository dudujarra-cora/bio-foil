# Registro de Portões (Lei N3) — Projeto Bio-Foil (`ftl`)

Regra: um portão entra como `DECLARADO` (roda no `scripts/auditar-frente.sh`, **não** trava commit). Só vira `OBRIGATORIO` (trava `pre-commit` e `pre-push`) depois de **3 corridas verdes seguidas na `main`**, com a evidência colada na coluna própria. Se o motivo de um portão morrer, ele é revisado no mesmo dia.

O hook lê **só** as linhas com status exato `OBRIGATORIO`. O portão `tests/02-hook-ambiente.test.mjs` reprova se algum arquivo de `tests/` não tiver linha aqui.

| Portão | Status | Motivo | Desde | Evidência (3 corridas verdes na main) |
| :--- | :--- | :--- | :--- | :--- |
| `tests/01-portao-gdd.test.mjs` | OBRIGATORIO | Cadeia canônica dos 9 volumes (`01..09`), SSOT (27 constantes), Matriz 5x8, tripulação, linha do tempo recalculada e oráculos de referência (`src/oraculos-referencia.mjs`) | 2026-10-22 | `70891aa`: `auditar-frente.sh` 3/3 — pass 19 / fail 0 (67737 ms, 58173 ms, 65067 ms). Evolução do portão validado desde `aecd5f6`. |
| `tests/02-hook-ambiente.test.mjs` | OBRIGATORIO | Hook real executado (Seção 5, B4 índice do commit, N5), tripwires L5 | 2026-10-22 | `70891aa`: `auditar-frente.sh` 3/3 — pass 19 / fail 0 (67737 ms, 58173 ms, 65067 ms). Evolução do portão validado desde `aecd5f6`. |
| `tests/09-mutacoes-reais.test.mjs` | OBRIGATORIO | B6: re-executa todas as mutações de `mutacoes.json` numa cópia e confere a 1ª linha de falha real | 2026-10-22 | `70891aa`: `auditar-frente.sh` 3/3 — pass 19 / fail 0; 45/45 mutações vermelhas pelo motivo certo nas 3 corridas (expandido para 60/60 nesta revisão). |
