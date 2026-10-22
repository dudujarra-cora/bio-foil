# Registro de Portões (Lei N3) — Projeto Bio-Foil (`ftl`)

Regra: um portão entra como `DECLARADO` (roda no `scripts/auditar-frente.sh`, **não** trava commit). Só vira `OBRIGATORIO` (trava `pre-commit` e `pre-push`) depois de **3 corridas verdes seguidas na `main`**, com a evidência colada na coluna própria. Se o motivo de um portão morrer, ele é revisado no mesmo dia.

O hook lê **só** as linhas com status exato `OBRIGATORIO`. O portão `tests/02-hook-ambiente.test.mjs` reprova se algum arquivo de `tests/` não tiver linha aqui.

| Portão | Status | Motivo | Desde | Evidência (3 corridas verdes na main) |
| :--- | :--- | :--- | :--- | :--- |
| `tests/01-portao-gdd.test.mjs` | OBRIGATORIO | Cadeia canônica dos 8 volumes, SSOT, Matriz 5x8, tripulação, linha do tempo recalculada | 2026-10-22 | `5b857ef`: `auditar-frente.sh` 3/3 — pass 6 / fail 0 (192.00 ms, 181.92 ms, 181.83 ms) |
| `tests/02-hook-ambiente.test.mjs` | OBRIGATORIO | Hook real executado (Seção 5, B4 índice do commit, N5), tripwires L5 | 2026-10-22 | `5b857ef`: `auditar-frente.sh` 3/3 — pass 6 / fail 0 (192.00 ms, 181.92 ms, 181.83 ms) |
| `tests/09-mutacoes-reais.test.mjs` | DECLARADO | B6: re-executa todas as mutações de `mutacoes.json` numa cópia e confere a 1ª linha de falha real | 2026-10-22 | pendente: precisa de 3 corridas verdes seguidas na `main` |
