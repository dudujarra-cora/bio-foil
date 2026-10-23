# Registro de Portões (Lei N3) — Projeto Bio-Foil (`ftl`)

Regra: um portão entra como `DECLARADO` (roda no `scripts/auditar-frente.sh`, **não** trava commit). Só vira `OBRIGATORIO` (trava `pre-commit` e `pre-push`) depois de **3 corridas verdes seguidas na `main`**, com a evidência colada na coluna própria. Se o motivo de um portão morrer, ele é revisado no mesmo dia.

O hook lê **só** as linhas com status exato `OBRIGATORIO`. O portão `tests/02-hook-ambiente.test.mjs` reprova se algum arquivo de `tests/` não tiver linha aqui.

| Portão | Status | Motivo | Desde | Evidência (3 corridas verdes na main) |
| :--- | :--- | :--- | :--- | :--- |
| `tests/01-portao-gdd.test.mjs` | OBRIGATORIO | Cadeia canônica dos 9 volumes (`01..09`), SSOT (27 constantes), Matriz 5x8, tripulação, linha do tempo recalculada e oráculos de referência (`src/oraculos-referencia.mjs`) | 2026-10-22 | `70891aa`: `auditar-frente.sh` 3/3 — pass 19 / fail 0 (67737 ms, 58173 ms, 65067 ms). Evolução do portão validado desde `aecd5f6`. |
| `tests/02-hook-ambiente.test.mjs` | OBRIGATORIO | Hook real executado (Seção 5, B4 índice do commit, N5), tripwires L5 | 2026-10-22 | `70891aa`: `auditar-frente.sh` 3/3 — pass 19 / fail 0 (67737 ms, 58173 ms, 65067 ms). Evolução do portão validado desde `aecd5f6`. |
| `tests/03-onda1-fisica.test.mjs` | DECLARADO | Onda 1: Motor de Sustentação, Hidráulica, 5 Estados do Foil, Válvulas, Cavitação e `hash32` (`src/onda1-fisica/`) | 2026-10-23 | Aguardando 3/3 corridas verdes na `main` para promoção a `OBRIGATORIO`. |
| `tests/04-onda2-combate.test.mjs` | DECLARADO | Onda 2: Sistemas, Subsistema Branquial, Armas, Topologia 2x4 + Duto 5<->6, Beam e Simulação Passo 3 (`src/onda2-combate/`) | 2026-10-23 | Aguardando 3/3 corridas verdes na `main` para promoção a `OBRIGATORIO`. |
| `tests/05-onda3-inimigos.test.mjs` | DECLARADO | Onda 3: IA de Barcos Humanos e Monstros Marinhos, Abordagem Via Única, Naufrágio Controlado e 3 Condições de Vitória (`src/onda3-inimigos/`) | 2026-10-23 | Aguardando 3/3 corridas verdes na `main` para promoção a `OBRIGATORIO`. |
| `tests/06-onda4-mapa.test.mjs` | DECLARADO | Onda 4: Gerador Procedural Poisson Disc, Relógio de Viagem, Modo Deriva, 17 Eventos SOS/Blue Options e Ciclo de Partida (`src/onda4-mapa/`) | 2026-10-23 | Aguardando 3/3 corridas verdes na `main` para promoção a `OBRIGATORIO`. |
| `tests/07-onda5-catalogo-chefe.test.mjs` | DECLARADO | Onda 5: Catálogo Completo (7 Armas, 6 Órgãos c/ Isolamento 5s, 8 Biomas, 5 Naves, 10 Upgrades, 20 Itens Loja) e 3 Fases da Draga Continental (`src/onda5-catalogo-chefe/`) | 2026-10-23 | Aguardando 3/3 corridas verdes na `main` para promoção a `OBRIGATORIO`. |
| `tests/08-onda6-ui-juncao.test.mjs` | DECLARADO | Onda 6: Presenter Wireframe 960x540 -> 1080p, Canal L3 de Visibilidade, 15 Comandos Atômicos, Persistência `profile.json` e 8 Cues Sonoros (`src/onda6-ui/`) | 2026-10-23 | Aguardando 3/3 corridas verdes na `main` para promoção a `OBRIGATORIO`. |
| `tests/09-mutacoes-reais.test.mjs` | OBRIGATORIO | B6: re-executa todas as mutações de `mutacoes.json` numa cópia e confere a 1ª linha de falha real | 2026-10-22 | `70891aa`: `auditar-frente.sh` 3/3 — pass 19 / fail 0; 45/45 mutações vermelhas pelo motivo certo nas 3 corridas (expandido para 60/60 nesta revisão). |
