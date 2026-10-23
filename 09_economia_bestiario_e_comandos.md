# PASSO 9: Consolidação Executiva de Economia, Bestiário, Topologia, Eventos e Comandos (Rastreabilidade Ondas 1 a 6)

Este volume fecha a cadeia documental canônica (`01..09`) como o **Mapa de Integração Transversal de Engenharia de Game Design**, conectando os **5 Pilares Sênior** (Economia Completa, Ficha das 3 Fases do Chefe + Bestiário, Topologia $2\times 4$ + *Beam*, Catálogo de Eventos SOS/*Blue Options* e *Action Schema*/Persistência/Target da Onda 6), a **Máquina de Estados de Ciclo de Vida da Partida (`meta.faseJogo`)** e o **Particionamento Determinístico de *Seeds* (`hash32` sem `Math.random()`)**.

> **Garantia da Lei L4 (Uma Fonte, Um Lugar):** Este documento referencia as fontes primárias (`Vol. 01`, `Vol. 04`, `Vol. 05`, `Vol. 06` e `Vol. 08`) e estabelece as invariantes de junção (`N1`), máquina de fases e *streams* de PRNG auditadas pelo portão `tests/01-portao-gdd.test.mjs`.

---

## 9.1. Matriz Mestre de Rastreabilidade dos 5 Pilares Sênior (GDD $\leftrightarrow$ `src/` $\leftrightarrow$ `tests/` $\leftrightarrow$ Mutações)

Cada um dos 5 pilares de fechamento do planejamento possui endereço canônico único no GDD, módulo consumidor dedicado na arquitetura das 6 Ondas (Seção 8.3), invariantes numéricas travadas e trio de mutações reais no `padrao/protocolo/mutacoes.json`:

| ID do Pilar | Escopo Técnico | Fonte Canônica GDD | Módulo Principal (`src/`) | Portão da Onda (`tests/`) | Invariante Numérica Chave | Mutações Reais (Onda 0) |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| `PILAR_1_ECONOMIA` | 10 Árvores de Upgrade, 20 Itens de Loja e Curva Setores 1..8 | `Vol. 05 (Seção 5.6)` | `src/onda5-catalogo-chefe/catalogo-naves-itens.mjs` | `tests/07-onda5-catalogo-chefe.test.mjs` | Maximização $= 2330\text{ un.}$ ($1473 < 2330 < 2789$); Venda $= \lfloor 0.5 \times \text{Compra} \rfloor$; Reator $6+12=18\text{ E}$ | `MUT-28, MUT-29, MUT-30` |
| `PILAR_2_CHEFE_BESTIARIO` | 3 Fases da Draga Continental, 8 Arquétipos e Escalamento S1..S7 | `Vol. 05 (Seções 5.5 e 5.7)` | `src/onda5-catalogo-chefe/chefe-draga.mjs` | `tests/05-onda3-inimigos.test.mjs` | Casco Chefe $= 66\text{ HP} + 10\text{ pts}$ Blindagem; TTK Fase 3 $= 67.2\text{s}$ ($3\text{ Surges}$); $8\text{ Templates}$ | `MUT-31, MUT-32, MUT-33` |
| `PILAR_3_TOPOLOGIA_BEAM` | Grafo $2\times 4 +$ Duto $5\leftrightarrow 6$, Lotação $2+2$ e Geometria do *Beam* | `Vol. 01 (Seção 1.6)` | `src/onda2-combate/tick-tripulacao.mjs` | `tests/04-onda2-combate.test.mjs` | $8\text{ Câmaras}$, $11\text{ Conexões}$ (grau $22$); Lotação $2+2=4$; *Beam* $= 32 / 8 / 4\text{ trincas}$ | `MUT-34, MUT-35, MUT-36` |
| `PILAR_4_EVENTOS_SOS` | 10 Templates (`4 SOS + 3 Exp + 3 Per`), *Blue Options* e SOS Expirado | `Vol. 04 (Seção 4.5)` | `src/onda4-mapa/relogio-viagem.mjs` | `tests/06-onda4-mapa.test.mjs` | $10\text{ Templates}$; *Blue Option* $= 100\%$ ($0\text{ dano}$); SOS Expirado $= \lfloor 0.5 \times \text{Sucata} \rfloor$; Frente $= 1\text{ Comb.}$ | `MUT-37, MUT-38, MUT-39` |
| `PILAR_5_ACTION_SCHEMA_ONDA6` | 14 Comandos Atômicos, `profile.json` e Target $960\times 540 \to 1080\text{p}$ | `Vol. 08 (Seção 8.5)` | `src/onda6-ui/presenter-wireframe.mjs` | `tests/08-onda6-ui-juncao.test.mjs` | $14\text{ Comandos}$; $5\text{ Carcaças}$; $960\times 540 \xrightarrow{2\times} 1920\times 1080$ ($+120\text{ px}$ *Touchdown*); $8\text{ Cues}$ | `MUT-40, MUT-41, MUT-42` |

---

## 9.2. Máquina de Estados do Ciclo de Vida da Partida (`meta.faseJogo` e Persistência)

O campo `meta.faseJogo` do `GameState` (Seção 8.1) opera como um autômato finito determinístico com **6 fases canônicas** e **7 transições puras**, governando exatamente quando `run_save.json` e `profile.json` (Seção 8.5.B) são atualizados:

| ID da Transição | Fase de Origem | Comando / Gatilho Determinístico | Fase de Destino | Efeito em `run_save.json` e `profile.json` |
| :--- | :---: | :--- | :---: | :--- |
| `TR_1_INICIAR_NO_COMBATE` | `MAPA` | `VIAJAR_NO_MAPA` p/ nó `COMBATE`, `PERIGO`, `ZONA_MORTA` ou `FROTA_CORPORACAO` | `COMBATE` | Grava `run_save.json` no instante $t = 0.0\text{s}$ do encontro |
| `TR_2_ABRIR_EVENTO_NO` | `MAPA` | `VIAJAR_NO_MAPA` p/ nó `SOS` (dentro de $T_{\text{prazo}}$) ou `EXPLORACAO` | `EVENTO` | Grava `run_save.json` antes da escolha A/B/C |
| `TR_3_EVENTO_PARA_COMBATE` | `EVENTO` | `ESCOLHER_OPCAO_EVENTO` com desfecho de combate ($p = 1$ na Opção A) | `COMBATE` | Grava `run_save.json` com estado pós-opção |
| `TR_4_EVENTO_PARA_MAPA` | `EVENTO` | `ESCOLHER_OPCAO_EVENTO` pacífico ($p = 0$, *Blue Option* `'B'` ou Recuo `'C'`) | `MAPA` | Atualiza `profile.json` (se destravou carcaça) e grava `run_save.json` |
| `TR_5_ENTRAR_SAIR_LOJA` | `MAPA` | `VIAJAR_NO_MAPA` p/ nó `LOJA` (Recife-Forja) $\leftrightarrow$ Fechar Loja | `LOJA` | Permite `COMPRAR_OU_VENDER_LOJA` e grava `run_save.json` |
| `TR_6_ENCERRAR_COMBATE_VIVO` | `COMBATE` | Vitória (`DESTRUICAO_BRUTA`, `CAPTURA_INTACTA`, `EXTRACAO_CIRURGICA`) ou `SALTO_FUGA` | `MAPA` | Avalia predicados da Seção 8.5.B em `profile.json` e grava `run_save.json` |
| `TR_7_FIM_DE_PARTIDA` | `COMBATE` | Derrota (`hpCascoAtual <= 0` ou $0\text{ aliados}$) ou Vitória na Fase 3 (Setor 8) | `FIM_DE_RUN` | **Apaga `run_save.json` (*Permadeath*)** e preserva `profile.json` intacto |

---

## 9.3. Particionamento Determinístico de *Seeds* (`Seed Partitioning` via `hash32` — Zero `Math.random()`)

Para que uma ação lateral do jogador (ex.: abrir uma loja, disparar um tiro extra ou inspecionar um nó) **nunca altere** o sorteio de um evento futuro ou a geração do próximo setor (*anti-Save Scumming* e reprodutibilidade $100\%$ de replays), o motor particiona `meta.seedPartida` em **5 *Streams* Isolados de PRNG (`hash32`)**:

| ID do Stream PRNG | Domínio Isolado | Assinatura Canônica da Chave Determinística | Consumidor Exclusivo |
| :--- | :--- | :--- | :--- |
| `STREAM_1_MAPA_POISSON` | Malha *Poisson Disc* ($18..22\text{ nós}$), rotas ($\le 28\text{ MN}$) e correntes ($60/20/20\%$) | `hash32(seedPartida, 'MAPA_SETORIAL', setorNumero)` | `src/onda4-mapa/gerador-poisson.mjs` |
| `STREAM_2_EVENTO_OPCAO_A` | Paridade $p \in \{0, 1\}$ da Opção A e sorteio de item em *Blue Option* | `hash32(seedPartida, 'EVENTO_NO', setorNumero, noId)` | `src/onda4-mapa/relogio-viagem.mjs` |
| `STREAM_3_LOJA_ESTOQUE` | Oferta de armas, órgãos e espécies nos 2 Recifes-Forja do setor | `hash32(seedPartida, 'LOJA_FORJA', setorNumero, noId)` | `src/onda5-catalogo-chefe/catalogo-naves-itens.mjs` |
| `STREAM_4_COMBATE_DISPARO` | Rolagem de Esquiva, deflexão de Blindagem ($15\%\text{/nv}$) e alvo de IA | `hash32(seedPartida, 'COMBATE_TICK', setorNumero, noId, tickAtual, indiceDisparo)` | `src/onda2-combate/tick-sistemas-armas.mjs` |
| `STREAM_5_CHEFE_DRAGA` | Alvos dos Drones (Fase 2) e dos 7 Lasers Industriais (Fase 3) | `hash32(seedPartida, 'CHEFE_DRAGA', faseChefe, tickAtual, indiceLaserOuDrone)` | `src/onda5-catalogo-chefe/chefe-draga.mjs` |

---

# CONTRA-AUDITORIA #9 (Verificação de Fechamento dos 9 Volumes Canônicos)

1. **Existe efeito borboleta (*Butterfly Effect*) entre combate e mapa/eventos para permitir *Save Scumming*?**
   * *Problema:* Se o jogo usasse uma fila única de PRNG (`seed += 1` a cada chamada), esperar $0.25\text{s}$ a mais num combate mudaria o resultado de um nó `SOS` duas colunas adiante!
   * *Correção Aplicada na Seção 9.3:* Com os **5 *Streams* Isolados por domínio e coordenada (`setorNumero`, `noId`, `tickAtual`)**, a paridade $p = \text{hash32}(\text{seedPartida}, \text{'EVENTO\_NO'}, S, \text{noId}) \bmod 2$ de um evento é **invariante** em relação a quantos tiros foram disparados nos combates anteriores.
2. **Todos os 5 Pilares Sênior possuem cobertura cruzada (`N1`) e mutações reais verificadas?**
   * *Verificação:* Os 5 pilares somam **15 mutações reais dedicadas (`MUT-28` a `MUT-42`)** além das 27 mutações base (`MUT-01` a `MUT-27`) e das mutações do próprio Volume 09 (`MUT-43` a `MUT-45`), todas re-executadas em cópia isolada pelo portão `tests/09-mutacoes-reais.test.mjs`.
   * *Resultado:* **Planejamento técnico $100\%$ fechado e blindado para a execução das Ondas 1 a 6.**
