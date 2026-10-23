# PASSO 9: Consolidação Executiva de Economia, Bestiário, Topologia, Eventos e Comandos (Rastreabilidade Ondas 1 a 6)

Este volume fecha a cadeia documental canônica (`01..09`) como o **Mapa de Integração Transversal de Engenharia de Game Design**. Ele conecta os **5 Pilares Sênior** (Economia Completa, Ficha das 3 Fases do Chefe + Bestiário, Topologia $2\times 4$ + *Beam*, Catálogo de Eventos SOS/*Blue Options* e *Action Schema*/Persistência/Target da Onda 6), a **Máquina de Estados de Ciclo de Vida da Partida (`meta.faseJogo`)** e o **Particionamento Determinístico de *Seeds* (`hash32` sem `Math.random()`)**.

> **Garantia da Lei L4 (Uma Fonte, Um Lugar):** Este documento só referencia as fontes primárias (`Vol. 01`, `Vol. 04`, `Vol. 05`, `Vol. 06` e `Vol. 08`). Os enums (`meta.faseJogo`, `estadoFisico`, `modalidadeVitoria`) vêm da tabela de Enums Canônicos da Seção 8.1 do Vol. 08; os módulos, da árvore 8.3 do Vol. 08.

---

## 9.1. Matriz Mestre de Rastreabilidade dos 5 Pilares Sênior (GDD $\leftrightarrow$ `src/` $\leftrightarrow$ `tests/` $\leftrightarrow$ Mutações)

Cada pilar tem endereço canônico único no GDD, módulo dono na árvore 8.3 (mesma Onda do portão), invariantes numéricas travadas e trio de mutações reais no `padrao/protocolo/mutacoes.json`:

| ID do Pilar | Escopo Técnico | Fonte Canônica GDD | Módulo Principal (`src/`) | Portão da Onda (`tests/`) | Invariante Numérica Chave | Mutações Reais (Onda 0) |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| `PILAR_1_ECONOMIA` | 10 Árvores de Upgrade, 20 Itens de Loja e Curva Setores 1..8 | `Vol. 05 (Seção 5.6)` | `src/onda5-catalogo-chefe/catalogo-naves-itens.mjs` | `tests/07-onda5-catalogo-chefe.test.mjs` | Maximização $= 2330\text{ un.}$ ($1473 < 2330 < 2789$); Venda $= \lfloor 0.5 \times \text{Compra} \rfloor$; Reator $6+12=18\text{ E}$; eventos nunca elevam o teto de moeda | `MUT-28, MUT-29, MUT-30` |
| `PILAR_2_CHEFE_BESTIARIO` | 3 Fases da Draga Continental, 8 Arquétipos e Escalamento S1..S7 | `Vol. 05 (Seções 5.5 e 5.7)` | `src/onda5-catalogo-chefe/chefe-draga.mjs` | `tests/07-onda5-catalogo-chefe.test.mjs` | Casco Chefe $= 66\text{ HP} + 10\text{ pts}$ Blindagem; TTK Fase 3: mediana $67.2\text{s}$ / esperado $74.2\text{s}$ / P90 $100.8\text{s}$ ($3$ a $5\text{ Surges}$); $8\text{ Templates}$ | `MUT-31, MUT-32, MUT-33` |
| `PILAR_3_TOPOLOGIA_BEAM` | Grafo $2\times 4 +$ Duto $5\leftrightarrow 6$, Lotação $2+2$ e Geometria do *Beam* | `Vol. 01 (Seção 1.6)` | `src/onda2-combate/tick-tripulacao.mjs` | `tests/04-onda2-combate.test.mjs` | $8\text{ Câmaras}$, $11\text{ Conexões}$ (grau $22$); Lotação $2+2=4$; *Beam* $= 32 / 8 / 4\text{ trincas}$ | `MUT-34, MUT-35, MUT-36` |
| `PILAR_4_EVENTOS_SOS` | 17 Templates (`8 SOS + 6 Exp + 3 Per`), *Blue Options* raras e SOS Expirado | `Vol. 04 (Seção 4.5)` | `src/onda4-mapa/eventos-nos.mjs` | `tests/06-onda4-mapa.test.mjs` | $17\text{ Templates}$; Alfa cumpre $0$ *Blue Options* e cada carcaça no máximo $1$; moeda por visita $\le \text{Sucata}_{\text{captura}}(S)$; SOS Expirado $= \lfloor 0.5 \times \text{Sucata} \rfloor$ | `MUT-37, MUT-38, MUT-39` |
| `PILAR_5_ACTION_SCHEMA_ONDA6` | 15 Comandos Atômicos, `profile.json` e Layout Nativo $960\times 540 \to 1080\text{p}$ | `Vol. 08 (Seção 8.5)` | `src/onda6-ui/despacho-comandos.mjs` | `tests/08-onda6-ui-juncao.test.mjs` | $15\text{ Comandos}$; $5\text{ Carcaças}$; câmara $50\times 35$ nativa; queda de $100\text{ px}$ nativos até o 2º/3º andar; $8\text{ Cues}$ | `MUT-40, MUT-41, MUT-42` |

---

## 9.2. Máquina de Estados do Ciclo de Vida da Partida (`meta.faseJogo` e Persistência)

O campo `meta.faseJogo` opera como um autômato finito determinístico com as **6 fases canônicas** do Vol. 08 (`INICIO, MAPA, EVENTO, LOJA, COMBATE, FIM_DE_RUN`) e **13 transições puras**. O portão verifica que toda fase é alcançável a partir de `INICIO`, que toda fase não terminal tem saída e que `FIM_DE_RUN` é alcançável de qualquer fase (zero beco sem saída):

| ID da Transição | Fase de Origem | Comando / Gatilho Determinístico | Fase de Destino | Efeito em `run_save.json` e `profile.json` |
| :--- | :---: | :--- | :---: | :--- |
| `TR_0_INICIAR_RUN` | `INICIO` | Escolher uma carcaça marcada como desbloqueada no `profile.json` | `MAPA` | Cria `run_save.json` no Setor 1 |
| `TR_1_INICIAR_NO_COMBATE` | `MAPA` | `VIAJAR_NO_MAPA` p/ nó `COMBATE`, `PERIGO`, `ZONA_MORTA_INDUSTRIALIZADA` ou `FROTA_PRINCIPAL_CORPORACAO` | `COMBATE` | Grava `run_save.json` no instante $t = 0.0\text{s}$ do encontro |
| `TR_2_ABRIR_EVENTO_NO` | `MAPA` | `VIAJAR_NO_MAPA` p/ nó `SOS` (dentro de $T_{\text{prazo}}$) ou `EXPLORACAO` | `EVENTO` | Grava `run_save.json` antes da escolha A/B/C |
| `TR_3_EVENTO_PARA_COMBATE` | `EVENTO` | `ESCOLHER_OPCAO_EVENTO` com desfecho de combate ($p = 1$ na Opção A) | `COMBATE` | Grava `run_save.json` com estado pós-opção |
| `TR_4_EVENTO_PARA_MAPA` | `EVENTO` | `ESCOLHER_OPCAO_EVENTO` pacífico ($p = 0$, *Blue Option* `'B'` ou Recuo `'C'`) com casco $> 0$ | `MAPA` | Avalia e atualiza `profile.json` e grava `run_save.json` |
| `TR_5A_ENTRAR_LOJA` | `MAPA` | `VIAJAR_NO_MAPA` p/ nó `LOJA` (Recife-Forja) | `LOJA` | Grava `run_save.json` |
| `TR_5B_SAIR_LOJA` | `LOJA` | Fechar o Recife-Forja | `MAPA` | Grava `run_save.json` |
| `TR_6_ENCERRAR_COMBATE_VIVO` | `COMBATE` | Vitória (`DESTRUICAO_BRUTA`, `CAPTURA_INTACTA`, `EXTRACAO_CIRURGICA`) fora da Fase 3 do Setor 8, ou `SALTO_FUGA` | `MAPA` | Avalia e atualiza `profile.json` e grava `run_save.json` |
| `TR_7A_DERROTA_EM_COMBATE` | `COMBATE` | `hpCascoAtual <= 0` ou $0\text{ aliados}$ vivos | `FIM_DE_RUN` | **Apaga `run_save.json` (*Permadeath*)** e preserva `profile.json` |
| `TR_7B_VITORIA_FINAL` | `COMBATE` | Vitória na Fase 3 da Draga Continental (Setor 8) | `FIM_DE_RUN` | **Apaga `run_save.json` (*Permadeath*)** e atualiza `profile.json` (estatísticas e desbloqueios) |
| `TR_7C_DERROTA_EM_EVENTO` | `EVENTO` | Custo de risco da Opção A zera o casco (`hpCascoAtual <= 0`) | `FIM_DE_RUN` | **Apaga `run_save.json` (*Permadeath*)** e preserva `profile.json` |
| `TR_8_TROCAR_SETOR` | `MAPA` | `VIAJAR_NO_MAPA` p/ o Nó de Saída do setor | `MAPA` | `setorNumero + 1`, gera o novo setor pelo `STREAM_1`, avalia e atualiza `profile.json` (Colmeia-Viva ao chegar ao Setor 8) e grava `run_save.json` |
| `TR_9_PROXIMA_FASE_CHEFE` | `COMBATE` | Fase 1 ou 2 da Draga Continental zerada (`transicionarFaseChefeDraga`, Atracar Automático) | `COMBATE` | Grava `run_save.json` no início da nova fase |

---

## 9.3. Particionamento Determinístico de *Seeds* (`Seed Partitioning` via `hash32` — Zero `Math.random()`)

Para que uma ação lateral do jogador (abrir uma loja, disparar um tiro extra, inspecionar um nó) **nunca altere** o sorteio de um evento futuro ou a geração do próximo setor (*anti-Save Scumming* e replays $100\%$ reprodutíveis), o motor particiona `meta.seedPartida` em **6 *Streams* Isolados de PRNG**.

* **Algoritmo Canônico do `hash32`:** **FNV-1a de 32 bits** (base `0x811C9DC5`, primo `0x01000193`, multiplicação módulo $2^{32}$) aplicado à chave ASCII `seedPartida::DOMINIO::c1:c2:...` (coordenadas unidas por `:`), com resultado sem sinal. Dono: `src/onda1-fisica/hash32-streams.mjs`.
* **Vetor de Teste Canônico:** `hash32('biofoil-seed-01', 'EVENTO_NO', 2, 'NO_SOS_3') = 2219090311`.

| ID do Stream PRNG | Domínio Isolado | Assinatura Canônica da Chave Determinística | Consumidor Exclusivo |
| :--- | :--- | :--- | :--- |
| `STREAM_1_MAPA_POISSON` | Malha *Poisson Disc* ($18..22\text{ nós}$), rotas ($\le 28\text{ MN}$) e correntes ($60/20/20\%$) | `hash32(seedPartida, 'MAPA_SETORIAL', setorNumero)` | `src/onda4-mapa/gerador-poisson.mjs` |
| `STREAM_2_EVENTO_OPCAO_A` | Paridade $p \in \{0, 1\}$ da Opção A e sorteio de item em *Blue Option* | `hash32(seedPartida, 'EVENTO_NO', setorNumero, noId)` | `src/onda4-mapa/eventos-nos.mjs` |
| `STREAM_3_LOJA_ESTOQUE` | Oferta de armas, órgãos e espécies nos 2 Recifes-Forja do setor | `hash32(seedPartida, 'LOJA_FORJA', setorNumero, noId)` | `src/onda5-catalogo-chefe/catalogo-naves-itens.mjs` |
| `STREAM_4_COMBATE_DISPARO` | Rolagem de Esquiva, deflexão de Blindagem ($15\%\text{/nv}$) e alvo de IA | `hash32(seedPartida, 'COMBATE_TICK', setorNumero, noId, tickAtual, indiceDisparo)` | `src/onda2-combate/tick-sistemas-armas.mjs` |
| `STREAM_5_CHEFE_DRAGA` | Alvos dos Drones (Fase 2) e dos 7 Lasers Industriais (Fase 3) | `hash32(seedPartida, 'CHEFE_DRAGA', faseChefe, tickAtual, indiceLaserOuDrone)` | `src/onda5-catalogo-chefe/chefe-draga.mjs` |
| `STREAM_6_SORTEIO_TEMPLATES` | Quais 4 SOS e 3 Exploração entram em cada setor (sem repetir o setor anterior) | `hash32(seedPartida, 'EVENTO_SORTEIO', setorNumero, idTemplate)` | `src/onda4-mapa/eventos-nos.mjs` |

---

# CONTRA-AUDITORIA #9 (Verificação de Fechamento dos 9 Volumes Canônicos)

1. **Existe efeito borboleta (*Butterfly Effect*) entre combate e mapa/eventos que permita *Save Scumming*?**
   * *Problema:* Se o jogo usasse uma fila única de PRNG (`seed += 1` a cada chamada), esperar $0.25\text{s}$ a mais num combate mudaria o resultado de um nó `SOS` duas colunas adiante.
   * *Correção Aplicada na Seção 9.3:* com os **6 *Streams* Isolados por domínio e coordenada (`setorNumero`, `noId`, `tickAtual`)**, a paridade de um evento é **invariante** em relação a quantos tiros foram disparados nos combates anteriores. A assinatura do `STREAM_2` é a mesma escrita na Seção 4.5.A do Vol. 04, e o algoritmo tem vetor de teste fixo.
2. **Todos os 5 Pilares Sênior possuem cobertura cruzada (`N1`) e mutações reais verificadas?**
   * *Verificação:* os 5 pilares somam **15 mutações reais dedicadas (`MUT-28` a `MUT-42`)**, além das 27 mutações base (`MUT-01` a `MUT-27`), das do próprio Volume 09 (`MUT-43` a `MUT-45`) e das mutações da correção da auditoria (`MUT-46` em diante). Todas são re-executadas em cópia isolada pelo portão `tests/09-mutacoes-reais.test.mjs`.
3. **O que este planejamento ainda NÃO garante (limites declarados)?**
   * As provas econômicas usam a **nave de referência** ($2.0\text{ h}$ por salto). Naves mais rápidas visitam mais nós, e o teto de moeda cresce em proporção (Falha Global 6, item 3).
   * O TTK da Fase 3 é uma **distribuição** (mediana, esperado, P90) sob o arsenal padrão de Setor 8; outras *builds* exigem nova prova.
   * As Ondas 1 a 6 estão implementadas como motor lógico puro e ViewModel determinístico (`src/onda1-fisica/` a `src/onda6-ui/`, validadas por `tests/03..08` e comparadas contra os oráculos de `src/oraculos-referencia.mjs`); o empacotamento gráfico/sonoro final em navegador (Canvas/WebAudio) consome esse `ViewModel` e os `8 Cues` sem alterar a lógica pura.
   * *Resultado:* planejamento técnico **consistente entre os 9 volumes e auditado pelo portão**, com os limites acima declarados.
