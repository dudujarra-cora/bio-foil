# PASSO 8: Contrato Imutável de Estado (`GameState`) e Arquitetura de Módulos (Dono Único por Onda)

Este documento fecha **100% do planejamento técnico no papel** antes de iniciarmos a programação do jogo. Ele define:
1. O **Contrato Imutável de Dados (`GameState`)** que representa qualquer instante de uma partida sem variáveis globais ocultas;
2. O **Canal Explícito de Visibilidade/Permissão (Lei L3)** nas leituras de estado;
3. A **Árvore de Diretórios e Matriz de Propriedade de Arquivos (Lei N5: um dono por arquivo)** para que nenhuma Onda atropele arquivos de outra;
4. As **Assinaturas de Junção (`N1`)** entre os módulos das 6 Ondas.

---

## 8.1. O Contrato Canônico do `GameState` (Imutabilidade Estrita — Lei L2 e L7)

Toda a simulação do *Bio-Foil* é uma função pura:
$$\text{Transição}(\text{EstadoAnterior Congelado}, \text{Ação/Comando}, \Delta t) \longrightarrow \{\text{NovoEstado Congelado}, \text{LogDeEventos}\}$$

* **Garantia da Lei L2:** Nenhum módulo pode fazer `camara.aguaKg -= 1.0` mutando o objeto recebido. Toda transição devolve uma cópia estrutural congelada (`Object.freeze` recursivo).
* **Garantia da Lei L7 (Log Primeiro, Tela Depois):** Como todo o estado vive num único JSON serializável e determinístico, qualquer bug é reproduzido e medido direto no terminal/log sem depender de interface gráfica.

### Esquema Completo dos 8 Domínios do `GameState`:

```json
{
  "meta": {
    "versaoContrato": "1.0.0",
    "seedPartida": "biofoil-setor1-0001",
    "tickAtual": 0,
    "tempoCombateSeg": 0.0,
    "faseJogo": "COMBATE"
  },
  "economia": {
    "sucata": 30,
    "biomassa": 15,
    "combustivel": 12,
    "municao": 8
  },
  "naveJogador": {
    "idArquitetura": "CARCACA_ALFA",
    "hpCascoAtual": 30,
    "hpCascoMax": 30,
    "pesoChassiKg": 100.0,
    "nivelBlindagem": 0,
    "reator": {
      "barrasCompradas": 6,
      "barrasBonusArraias": 1,
      "barrasDisponiveis": 7
    },
    "estadoFisico": "1_NO_FOIL",
    "progressoSpoolUpSeg": 0.0,
    "tempoTouchdownContinuoSeg": 0.0,
    "regeneracoesColmeiaNestaLuta": 0,
    "pesoVirtualArrastoKg": 0.0,
    "progressoFugaSeg": 0.0,
    "pulsoEnzimasAtivoSeg": 0.0,
    "recargaPulsoEnzimasSeg": 0.0,
    "furtividadeAtivaSeg": 0.0,
    "recargaFurtividadeSeg": 0.0,
    "camaras": [
      { "id": 1, "nome": "ARTILHARIA_DORSAL", "tipoSlot": "SISTEMA_BASE", "nivelMaxBarras": 3, "barrasIntegridade": 3, "barrasEnergiaAlocada": 3, "aguaKg": 12.5, "alagamentoPesadoKg": 0.0, "oxigenioPct": 100.0, "rombosCasco": 0, "progressoReparoRomboSeg": 0.0, "progressoReparoSistemaSeg": 0.0, "valvulaExternaAberta": false, "curtoCircuitoAtivo": false, "progressoExtincaoSecoSeg": 0.0, "progressoDanoCurtoSeg": 0.0, "progressoReparoCurtoSeg": 0.0, "tempoParalisiaIonSeg": 0.0, "isolamentoResidualChoqueSeg": 0.0, "baiacuInfladoId": null },
      { "id": 2, "nome": "CORTEX_NAVEGACAO", "tipoSlot": "SISTEMA_BASE", "nivelMaxBarras": 1, "barrasIntegridade": 1, "barrasEnergiaAlocada": 0, "aguaKg": 12.5, "alagamentoPesadoKg": 0.0, "oxigenioPct": 100.0, "rombosCasco": 0, "progressoReparoRomboSeg": 0.0, "progressoReparoSistemaSeg": 0.0, "valvulaExternaAberta": false, "curtoCircuitoAtivo": false, "progressoExtincaoSecoSeg": 0.0, "progressoDanoCurtoSeg": 0.0, "progressoReparoCurtoSeg": 0.0, "tempoParalisiaIonSeg": 0.0, "isolamentoResidualChoqueSeg": 0.0, "baiacuInfladoId": null },
      { "id": 3, "nome": "BOMBA_BRANQUIAL", "tipoSlot": "SISTEMA_BASE", "nivelMaxBarras": 1, "barrasIntegridade": 1, "barrasEnergiaAlocada": 0, "aguaKg": 12.5, "alagamentoPesadoKg": 0.0, "oxigenioPct": 100.0, "rombosCasco": 0, "progressoReparoRomboSeg": 0.0, "progressoReparoSistemaSeg": 0.0, "valvulaExternaAberta": false, "curtoCircuitoAtivo": false, "progressoExtincaoSecoSeg": 0.0, "progressoDanoCurtoSeg": 0.0, "progressoReparoCurtoSeg": 0.0, "tempoParalisiaIonSeg": 0.0, "isolamentoResidualChoqueSeg": 0.0, "baiacuInfladoId": null },
      { "id": 4, "nome": "GLANDULA_BARREIRA", "tipoSlot": "SISTEMA_BASE", "nivelMaxBarras": 2, "barrasIntegridade": 2, "barrasEnergiaAlocada": 2, "aguaKg": 12.5, "alagamentoPesadoKg": 0.0, "oxigenioPct": 100.0, "rombosCasco": 0, "progressoReparoRomboSeg": 0.0, "progressoReparoSistemaSeg": 0.0, "valvulaExternaAberta": false, "curtoCircuitoAtivo": false, "progressoExtincaoSecoSeg": 0.0, "progressoDanoCurtoSeg": 0.0, "progressoReparoCurtoSeg": 0.0, "tempoParalisiaIonSeg": 0.0, "isolamentoResidualChoqueSeg": 0.0, "baiacuInfladoId": null },
      { "id": 5, "nome": "SIFAO_PROPULSAO", "tipoSlot": "SISTEMA_BASE", "nivelMaxBarras": 2, "barrasIntegridade": 2, "barrasEnergiaAlocada": 2, "aguaKg": 12.5, "alagamentoPesadoKg": 0.0, "oxigenioPct": 100.0, "rombosCasco": 0, "progressoReparoRomboSeg": 0.0, "progressoReparoSistemaSeg": 0.0, "valvulaExternaAberta": false, "curtoCircuitoAtivo": false, "progressoExtincaoSecoSeg": 0.0, "progressoDanoCurtoSeg": 0.0, "progressoReparoCurtoSeg": 0.0, "tempoParalisiaIonSeg": 0.0, "isolamentoResidualChoqueSeg": 0.0, "baiacuInfladoId": null },
      { "id": 6, "nome": "POCO_DA_QUILHA_MASTRO", "tipoSlot": "SISTEMA_BASE", "nivelMaxBarras": 4, "barrasIntegridade": 4, "barrasEnergiaAlocada": 0, "aguaKg": 12.5, "alagamentoPesadoKg": 0.0, "oxigenioPct": 100.0, "rombosCasco": 0, "progressoReparoRomboSeg": 0.0, "progressoReparoSistemaSeg": 0.0, "valvulaExternaAberta": false, "curtoCircuitoAtivo": false, "progressoExtincaoSecoSeg": 0.0, "progressoDanoCurtoSeg": 0.0, "progressoReparoCurtoSeg": 0.0, "tempoParalisiaIonSeg": 0.0, "isolamentoResidualChoqueSeg": 0.0, "baiacuInfladoId": null },
      { "id": 7, "nome": "CAMARA_ENXERTO_A", "tipoSlot": "SUBSISTEMA_ENXERTO", "nivelMaxBarras": 0, "barrasIntegridade": 0, "barrasEnergiaAlocada": 0, "aguaKg": 12.5, "alagamentoPesadoKg": 0.0, "oxigenioPct": 100.0, "rombosCasco": 0, "progressoReparoRomboSeg": 0.0, "progressoReparoSistemaSeg": 0.0, "valvulaExternaAberta": false, "curtoCircuitoAtivo": false, "progressoExtincaoSecoSeg": 0.0, "progressoDanoCurtoSeg": 0.0, "progressoReparoCurtoSeg": 0.0, "tempoParalisiaIonSeg": 0.0, "isolamentoResidualChoqueSeg": 0.0, "baiacuInfladoId": null },
      { "id": 8, "nome": "CAMARA_ENXERTO_B", "tipoSlot": "SUBSISTEMA_ENXERTO", "nivelMaxBarras": 0, "barrasIntegridade": 0, "barrasEnergiaAlocada": 0, "aguaKg": 12.5, "alagamentoPesadoKg": 0.0, "oxigenioPct": 100.0, "rombosCasco": 0, "progressoReparoRomboSeg": 0.0, "progressoReparoSistemaSeg": 0.0, "valvulaExternaAberta": false, "curtoCircuitoAtivo": false, "progressoExtincaoSecoSeg": 0.0, "progressoDanoCurtoSeg": 0.0, "progressoReparoCurtoSeg": 0.0, "tempoParalisiaIonSeg": 0.0, "isolamentoResidualChoqueSeg": 0.0, "baiacuInfladoId": null }
    ],
    "armasAtivas": [
      {
        "slotIndex": 0,
        "arma": {
          "chassiId": "CANHAO_ARPAO_CABO",
          "pesoBaseKg": 15.0,
          "energiaCusto": 2,
          "energiaAlocada": 2,
          "tempoRecargaBaseSeg": 11.0,
          "progressoRecargaSeg": 0.0,
          "municaoCusto": 0,
          "soquetesMax": 2,
          "orgaosEnxertados": []
        }
      },
      { "slotIndex": 1, "arma": { "chassiId": "EMISSOR_ACUSTICO_I", "pesoBaseKg": 10.0, "energiaCusto": 1, "energiaAlocada": 1, "tempoRecargaBaseSeg": 9.0, "progressoRecargaSeg": 0.0, "municaoCusto": 0, "soquetesMax": 1, "orgaosEnxertados": [] } },
      { "slotIndex": 2, "arma": null },
      { "slotIndex": 3, "arma": null }
    ],
    "poraoCarga": [
      { "slotIndex": 0, "item": null },
      { "slotIndex": 1, "item": null },
      { "slotIndex": 2, "item": null },
      { "slotIndex": 3, "item": null }
    ],
    "tripulacao": [
      { "id": "trip-polvo-1", "especie": "POLVO", "hpAtual": 80, "hpMax": 80, "camaraAtualId": 2, "camaraDestinoId": null, "progressoNadoSeg": 0.0, "acopladoBulbo": true, "inflado": false, "atordoadoSeg": 0.0, "localizacao": "NAVE_JOGADOR" },
      { "id": "trip-arraia-1", "especie": "ARRAIA", "hpAtual": 70, "hpMax": 70, "camaraAtualId": 4, "camaraDestinoId": null, "progressoNadoSeg": 0.0, "acopladoBulbo": true, "inflado": false, "atordoadoSeg": 0.0, "localizacao": "NAVE_JOGADOR" },
      { "id": "trip-baiacu-1", "especie": "BAIACU", "hpAtual": 150, "hpMax": 150, "camaraAtualId": 5, "camaraDestinoId": null, "progressoNadoSeg": 0.0, "acopladoBulbo": true, "inflado": false, "atordoadoSeg": 0.0, "localizacao": "NAVE_JOGADOR" }
    ]
  },
  "alvoCombate": {
    "ativo": true,
    "classeAlvo": "BARCO_HUMANO",
    "idInimigo": "LANCHA_PATRULHEIRA_S1",
    "hpCascoAtual": 8,
    "hpCascoMax": 8,
    "faseChefe": null,
    "blindagemTermicaExternaPts": 0,
    "timerSurgeSeg": 0.0,
    "alarmeFervuraAtivoSeg": 0.0,
    "fervuraAtivaSeg": 0.0,
    "iaBackupAtiva": false,
    "canalVisibilidadeSonar": "VISIVEL",
    "salasOuOrgaos": []
  },
  "projeteisEmVoo": [],
  "mapaSetorial": {
    "setorNumero": 1,
    "biomaId": "SETOR_1_ATOIS_RASOS",
    "relogioHoras": 0.0,
    "frenteCorporacaoMn": 0.0,
    "noAtualId": "NO_0_ENTRADA",
    "nos": [],
    "rotas": []
  },
  "telemetriaN4": {
    "ultimoTickCamarasExaminadas": 8,
    "ultimoTickTripulantesExaminados": 3,
    "ultimoTickSalasInimigasExaminadas": 4
  },
  "logDeterministico": []
}
```

### Enums Canônicos do `GameState` (Fonte Única — Lei L4)

Todo volume, oráculo e módulo usa exatamente estes valores; o portão reprova qualquer sinônimo.

| Campo | Valores Canônicos | Observação |
| :--- | :--- | :--- |
| `meta.faseJogo` | `INICIO, MAPA, EVENTO, LOJA, COMBATE, FIM_DE_RUN` | Transições na Seção 9.2 do Vol. 09 |
| `naveJogador.estadoFisico` | `1_NO_FOIL, 2_TOUCHDOWN, 3_SPOOL_UP` | Os estados 4 e 5 da Matriz 6.2 são composições, não valores do campo: `4_FURTIVO_AR` = `1_NO_FOIL` com `furtividadeAtivaSeg > 0`; `5_FURTIVO_AGUA` = `2_TOUCHDOWN` ou `3_SPOOL_UP` com `furtividadeAtivaSeg > 0` |
| `modalidadeVitoria` | `DESTRUICAO_BRUTA, CAPTURA_INTACTA, EXTRACAO_CIRURGICA` | Destruição Bruta ($0\text{ HP}$), Captura Intacta (barco com casco $> 0$ e tripulação asfixiada), Extração Cirúrgica (monstro com Gânglio $0/3$ e vida $> 0$) |

---

## 8.2. Contrato do Canal de Visibilidade e Permissão (Lei L3 no Domínio do Jogo)

Na **Lei L3**, uma função nunca pode retornar `[]` ou `0` tanto para *"a sala inimiga está vazia"* quanto para *"não consigo ver a sala inimiga por causa de Águas Turvas ou Bolsa de Tinta"*.

Toda leitura do estado inimigo (pela UI ou pela IA de mira) é obrigada a passar pelo seletor puro `inspecionarSalaAlvo(estado, salaId)`:

| Situação Real no Jogo | `canalPermissao` | `status` | `marcadorExplicito` | `dados` |
| :--- | :---: | :---: | :--- | :--- |
| Sonar ativo / Sala visível e vazia | `'VISIVEL'` | `'OK'` | `'SALA_VISIVEL_VAZIA'` | `{ tripulantes: [], sistemaVisivel: true }` |
| Sonar ativo / Sala visível com 2 humanos | `'VISIVEL'` | `'OK'` | `'SALA_VISIVEL_OCUPADA'` | `{ tripulantes: [h1, h2], sistemaVisivel: true }` |
| Bioma *Águas Turvas* sem a *Blue Option* `PER_3` | `'NEGADO_SONAR'` | `'SEM_PERMISSAO_VISAO'` | `'CEGO_AGUAS_TURVAS_ABISSAIS'` | `undefined` (nunca `[]`!) |
| Sala atingida por *Bolsa de Tinta Abissal* | `'NEGADO_TINTA'` | `'SEM_PERMISSAO_VISAO'` | `'CEGO_BOLSA_TINTA'` | `undefined` (nunca `[]`!) |
| ID de sala fora do intervalo do alvo | `'VISIVEL'` | `'NAO_ENCONTRADO'` | `'SALA_ALVO_INEXISTENTE'` | `undefined` |

---

## 8.3. Árvore de Módulos e Matriz de Dono Único (Lei N5 e Lei N6)

Para cumprir a **Lei N5 ("Um dono por arquivo compartilhado")** e a **Lei N6 ("Onda de teste não conserta produto")**, cada arquivo do projeto pertence a **uma única Onda** e tem separação física estrita entre **Código de Produto (`src/`)** e **Portão de Teste (`tests/`)**:

```text
./
├── 01..09_*.md                          # [Onda 0] 9 Volumes Canônicos do GDD (Congelados)
├── .github/workflows/portoes.yml        # [Onda 0] CI no servidor: roda o pre-push; a main protegida exige verde
├── package.json                         # [Onda 0] Fixa Node >=22.22 <23 (engines) — sem dependências
├── padrao/protocolo/
│   ├── LEIS-DE-TESTE.md                 # [Onda 0] As 14 Leis + Seção 5
│   ├── PORTOES.md                       # [Onda 0] Lei N3: portão DECLARADO vs OBRIGATORIO (o hook só roda OBRIGATORIO)
│   ├── mutacoes.json                    # [Ondas 0..6] Fonte EXECUTÁVEL das mutações (B6)
│   └── MUTACOES.md                      # [Ondas 0..6] Bloco gerado pelo executor real (nunca editar à mão)
├── scripts/
│   ├── auditar-frente.sh                # [Onda 0] Pré-voo/fechamento: carga, core.bare, hooksPath, N7, 3 corridas
│   ├── rodar-mutacoes.mjs               # [Onda 0] Executor real de mutações numa cópia descartável
│   └── hooks/
│       ├── pre-commit                   # [Onda 0] unset 7 vars + índice do commit + bloqueio N5 + portões OBRIGATORIO
│       └── pre-push                     # [Onda 0] unset 7 vars + testa HEAD exportado
├── src/
│   ├── gdd-parser.mjs                   # [Onda 0] Parser SSOT/Matriz: só extrai dados dos 9 volumes
│   ├── oraculos-referencia.mjs          # [Onda 0] Oráculos puros de referência (teste diferencial das Ondas 1..6)
│   ├── onda1-fisica/
│   │   ├── estado-inicial.mjs           # [Onda 1] Fábrica imutável do GameState e das 8 câmaras
│   │   ├── tick-hidraulica-foil.mjs     # [Onda 1] Peso, Sustentação, Cavitação, Água, Spool-up, Válvulas
│   │   └── hash32-streams.mjs           # [Onda 1] FNV-1a 32 bits e os 5 Streams isolados de PRNG (Seção 9.3)
│   ├── onda2-combate/
│   │   ├── tick-sistemas-armas.mjs      # [Onda 2] Armas, Barreira, Branquial, Curto-Circuito, Furtividade
│   │   └── tick-tripulacao.mjs          # [Onda 2] Nado (1.5s), Reparo, Asfixia, Baiacu, Visão L3
│   ├── onda3-inimigos/
│   │   ├── ia-barco-monstro.mjs         # [Onda 3] IA Humana (Bomba Porão) e Monstro (Anticorpos)
│   │   └── abordagem-vitoria.mjs        # [Onda 3] Tubo Pressurizado, Modo Parasita e 3 Vitórias/Saque
│   ├── onda4-mapa/
│   │   ├── gerador-poisson.mjs          # [Onda 4] Malha 18..22 nós, Correntes e Baralho de Cotas
│   │   ├── relogio-viagem.mjs           # [Onda 4] Velocidade (<=15 MN/h), Maré 20h e Modo Deriva
│   │   ├── eventos-nos.mjs              # [Onda 4] 17 Templates, Blue Options, Sorteio e SOS Expirado (Seção 4.5)
│   │   └── ciclo-partida.mjs            # [Onda 4] Máquina de Estados meta.faseJogo (Seção 9.2)
│   ├── onda5-catalogo-chefe/
│   │   ├── catalogo-naves-itens.mjs     # [Onda 5] 5 Naves, 7 Armas, 6 Órgãos (+5kg, Isolamento 5s), Lojas
│   │   └── chefe-draga.mjs              # [Onda 5] As 3 Fases da Draga Continental, Surges e IA Backup
│   └── onda6-ui/
│       ├── presenter-wireframe.mjs      # [Onda 6] Seletor/Presenter 16:9 e Orçamento de Layout Nativo (Seção 8.5.C)
│       ├── despacho-comandos.mjs        # [Onda 6] Validação dos 15 Comandos Atômicos (Seção 8.5.A)
│       ├── persistencia-perfil.mjs      # [Onda 6] run_save.json e profile.json (Seção 8.5.B)
│       └── cues-audio.mjs               # [Onda 6] 8 Cues Sonoros Táticos (Seção 8.5.C)
└── tests/
    ├── 01-portao-gdd.test.mjs           # [Onda 0] Portão L5 dos 9 volumes GDD + SSOT + Matriz 5x8 + tripulação + linha do tempo
    ├── 02-hook-ambiente.test.mjs        # [Onda 0] Hooks REAIS disparados pelo git (Seção 5, B4, N5, pre-push) + tripwires
    ├── 03-onda1-fisica.test.mjs         # [Onda 1] Portão Hidráulica <-> Foil (MUT-O1-01..04)
    ├── 04-onda2-combate.test.mjs        # [Onda 2] Portão Simulação 0s..32.75s (MUT-O2-01..04)
    ├── 05-onda3-inimigos.test.mjs       # [Onda 3] Portão IA + Abordagem + Saque (MUT-O3-01..03)
    ├── 06-onda4-mapa.test.mjs           # [Onda 4] Portão 100 Seeds + Relógio/Deriva (MUT-O4-01..04)
    ├── 07-onda5-catalogo-chefe.test.mjs # [Onda 5] Portão 5 Naves + Chefe 3 Fases (MUT-O5-01..04)
    ├── 08-onda6-ui-juncao.test.mjs      # [Onda 6] Portão Ponta a Ponta UI <-> Motor
    └── 09-mutacoes-reais.test.mjs       # [Onda 0] Re-executa todas as mutações de mutacoes.json (B6)
```

---

## 8.4. As 5 Assinaturas Puras de Junção (`N1`) entre as Ondas

Nenhum módulo conversa por efeito colateral; todas as junções (`N1`) usam contratos explícitos:

1. **Junção Onda 1 $\leftrightarrow$ Onda 2 (`Física/Água` $\leftrightarrow$ `Sistemas/Tripulação`):**
   * `avancarTickFisicaHidraulica(estado, dtSeg) -> estadoComAguaEFoilAtualizados`
   * `avancarTickCombateCompleto(estado, comandos, dtSeg)` chama primeiro a física/água e entrega o novo estado para recarga de armas (aplicando `-25%` se `estadoFisico === '2_TOUCHDOWN' || '3_SPOOL_UP'`) e reparo de tripulação (aplicando `-50%` se `camara.aguaKg === 0`).
2. **Junção Onda 2 $\leftrightarrow$ Onda 3 (`Disparos/Tubo` $\leftrightarrow$ `Alvo/Saque`):**
   * `resolverImpactoNoAlvo(estado, eventoDisparoOuCapsula) -> estadoComDanoInimigo`
   * `avaliarCondicaoDeVitoria(estado) -> { encerrado: boolean, modalidade: 'DESTRUICAO_BRUTA' | 'CAPTURA_INTACTA' | 'EXTRACAO_CIRURGICA' | null, recompensa }`.
3. **Junção Onda 3 $\leftrightarrow$ Onda 4 (`Pós-Combate/Porão` $\leftrightarrow$ `Mapa/Relógio`):**
   * `iniciarTravessiaMapa(estado, idNoDestino) -> estadoPosViagem` (fecha válvulas, nivela `aguaKg = 12.5` nas 8 câmaras, soma `armasAtivas + poraoCarga + orgaos + blindagem`, calcula $\Delta t_{\text{horas}}$ e avança `frenteCorporacaoMn += 6.0 * dtHoras`).
4. **Junção Onda 4 $\leftrightarrow$ Onda 5 (`Setor 8` $\leftrightarrow$ `Chefe Final em 3 Fases`):**
   * `transicionarFaseChefeDraga(estado) -> estadoProximaFase` (executa o **Atracar Automático entre Fases**, resgatando todos os tripulantes aliados com `localizacao === 'BORDO_INIMIGO'` antes de carregar a próxima fase da Draga Continental!).
5. **Junção Ondas 1–5 $\leftrightarrow$ Onda 6 (`Motor` $\leftrightarrow$ `Wireframe UI 16:9`):**
   * `projetarViewModelWireframe(estado) -> ViewModelCongelado` (calcula a posição da barra no Termômetro Vertical `Peso vs. Sustentação`, o estado `TRAVADA_TOUCHDOWN` das válvulas externas, os 4 slots da caixa `[ARMAS]` e o canal `L3` do painel inimigo).

---

## 8.5. Catálogo Fechado de Comandos (`Action Schema`), Persistência (`profile.json`) e Target da Onda 6 (`UI/Áudio`)

Para que a função pura $\text{Transição}(\text{EstadoAnterior Congelado}, \text{Comando}, \Delta t)$ opere sem ambiguidade, ficam travados abaixo: (A) o esquema fechado dos **15 comandos atômicos** (dono: `src/onda6-ui/despacho-comandos.mjs`), (B) a persistência de meta-progresso (`profile.json`) vs. estado da *run* (`run_save.json`) (dono: `src/onda6-ui/persistencia-perfil.mjs`), e (C) o orçamento de layout nativo ($960\times 540 \xrightarrow{2\times} 1920\times 1080$, dono: `src/onda6-ui/presenter-wireframe.mjs`) e os **8 *cues* sonoros táticos obrigatórios** (dono: `src/onda6-ui/cues-audio.mjs`).

### A. Catálogo Fechado dos 15 Comandos Atômicos (`Action Schema`)

* **Regra de Rejeição Pura (Imutabilidade `L2`):** Se um comando violar sua pré-condição de fase ou física, a transição devolve o mesmo `GameState` sem mutação e anexa ao `logDeterministico` o marcador explícito de rejeição (`REJEITADO_FASE_INVALIDA`, `BLOQUEADO_TRAVA_HIDROSTATICA`, `BLOQUEADO_COMBATE_OBRIGATORIO` ou `PRECONDICAO_NAO_ATENDIDA`).
* **Fonte dos Números (Lei L4):** todo número desta tabela é cópia de uma fonte primária citada na própria linha; o portão confere cada um contra a fonte.

| ID do Comando (`tipo`) | Fase(s) Permitida(s) | Payload Obrigatório | Pré-Condição / Regra de Validação no Motor | Marcador de Rejeição Principal |
| :--- | :---: | :--- | :--- | :--- |
| `ALOCAR_ENERGIA` | `COMBATE, MAPA, EVENTO, LOJA` | `{ camaraId, deltaBarras }` | `deltaBarras` $\in \{+1, -1\}$, $0 \le \text{energiaAlocada} \le \text{integridade} - \text{ion}$ e `reator.barrasDisponiveis >= 0` | `PRECONDICAO_NAO_ATENDIDA` |
| `MOVER_TRIPULANTE` | `COMBATE, MAPA, EVENTO, LOJA` | `{ tripulanteId, camaraDestinoId }` | `localizacao === 'NAVE_JOGADOR'`, `!inflado` e lotação da câmara destino $< 2\text{ aliados}$ (Seção 1.6.B) | `PRECONDICAO_NAO_ATENDIDA` |
| `MIRAR_ARMA` | `COMBATE` | `{ slotIndex, salaAlvoId, trincaSalasBeam }` | Arma energizada; *Beam* exige $3\text{ salas}$ ortogonais distintas (Seção 1.6.C); Torpedo exige sala submersa (Seção 5.1) | `PRECONDICAO_NAO_ATENDIDA` |
| `ALTERNAR_VALVULA` | `COMBATE` | `{ camaraId, aberta }` | Permitido **exclusivamente** em `estadoFisico === '1_NO_FOIL'`, com ou sem Tinta Furtiva (Matriz 6.2: Células 1C e 4C liberam; 2C, 3C e 5C bloqueiam) | `BLOQUEADO_TRAVA_HIDROSTATICA` |
| `DRENAR_TUDO` | `COMBATE` | `{ abrirTodas }` | Atalho tecla `[V]` (Seção 2.2); mesma regra de `ALTERNAR_VALVULA` (Matriz 6.2, Linha C) | `BLOQUEADO_TRAVA_HIDROSTATICA` |
| `ATIVAR_BAIACU` | `COMBATE` | `{ tripulanteId, inflado }` | `especie === 'BAIACU'`; veda $100\%$ de rombo na sala, velocidade $= 0$ e reflete $50\%$ DPS (Seções 1.5 e 1.6.B) | `PRECONDICAO_NAO_ATENDIDA` |
| `ATIVAR_PULSO_ENZIMAS` | `COMBATE` | `{ camaraId: 3 }` | Bomba Branquial $\ge 2\text{ barras}$ e `recargaPulsoEnzimasSeg === 0` ($+5\text{ HP/s}$ nas demais salas inundadas por $6\text{s}$, recarga $25\text{s}$ — Seção 1.4) | `PRECONDICAO_NAO_ATENDIDA` |
| `ATIVAR_TINTA_FURTIVA` | `COMBATE` | `{ camaraId: 8 }` | Glândula de Tinta $\ge 1\text{ barra}$ e `recargaFurtividadeSeg === 0` ($+60\%$ esquiva por $5\text{s}/8\text{s}$, recarga $20\text{s}$ — Seção 1.4) | `PRECONDICAO_NAO_ATENDIDA` |
| `LANCAR_ABORDAGEM` | `COMBATE` | `{ tripulantesIds, salaAlvoId }` | Tubo Pressurizado $\ge 1\text{ barra}$, $1..2\text{ aliados}$ na Câmara 7 (Seção 1.4: lança até 2 animais) e `blindagemTermicaExternaPts === 0` (Seção 5.5) | `PRECONDICAO_NAO_ATENDIDA` |
| `MERGULHO_TATICO` | `COMBATE` | `{ recolherFoil }` | Em `1_NO_FOIL`, força `2_TOUCHDOWN` voluntário ($S_{\text{atual}} = 0$); ao desativar, inicia `3_SPOOL_UP` ($3.0\text{s}$ — Tabela 6.1) | `REJEITADO_FASE_INVALIDA` |
| `SALTO_FUGA` | `COMBATE` | `{ idNoDestino }` | `progressoFugaSeg >= 20.0`, com o progresso acumulando $1.0\text{/s}$ base, $\times (20/15)$ com operador no Sifão e $\times 0.5$ em *Touchdown*/*Spool-up* ($20.0\text{s}$ / $15.0\text{s}$ / $0.5\times$ — Matriz 6.2 Linha G); Córtex $\ge 1\text{ barra}$, Sifão $\ge 1\text{ barra}$ e `combustivel >= 1` | `PRECONDICAO_NAO_ATENDIDA` |
| `ESCOLHER_OPCAO_EVENTO` | `EVENTO` | `{ idEvento, opcao }` | `opcao` $\in \{\text{'A'}, \text{'B'}, \text{'C'}\}$; `'B'` exige *Blue Option*; `'C'` proibida em nó `PERIGO` (Seção 4.5.A) | `BLOQUEADO_COMBATE_OBRIGATORIO` |
| `COMPRAR_OU_VENDER_LOJA` | `LOJA` | `{ operacao, itemOuSistemaId, moeda }` | Só dentro de um Recife-Forja; respeita preços e venda ($50\%\text{ floor}$) da Seção 5.6 | `REJEITADO_FASE_INVALIDA` |
| `ENXERTAR_ORGAO` | `MAPA, LOJA` | `{ orgaoId, slotIndex, acao }` | `acao` $\in \{\text{'ENCAIXAR'}, \text{'REMOVER'}\}$; livre fora de `COMBATE` (Seção 5.2); respeita os soquetes do chassi (Seção 5.1) e soma $+5\text{ kg}$ por órgão | `REJEITADO_FASE_INVALIDA` |
| `VIAJAR_NO_MAPA` | `MAPA` | `{ idNoDestino, descartarCargaIds }` | Fecha válvulas, nivela $8 \times 12.5\text{ kg} = 100.0\text{ kg}$ de água; aplica Modo Deriva ($2.0\times$ as horas, $5.0\text{s}$ frio) se $0\text{ Comb.}$ (Falha Encontrada 3 do Vol. 04) | `PRECONDICAO_NAO_ATENDIDA` |

### B. Persistência: Meta-Progresso (`profile.json`) vs. Estado da Run (`run_save.json`)

* **`run_save.json` (*Permadeath* / Run Atual):** Serialização direta e determinística do `GameState` da Seção 8.1. Gravado a cada transição de nó ou saída para o menu; **apagado permanentemente** ao fim da run (derrota ou vitória final — transições `TR_7A` e `TR_7B` da Seção 9.2 do Vol. 09).
* **`profile.json` (Meta-Progresso Imune ao *Permadeath*):** Arquivo separado que armazena as estatísticas globais e o registro booleano das **5 Carcaças Desbloqueáveis da Seção 5.4**. Os predicados abaixo são avaliados **literalmente** pelo motor (conjunção `&&` de comparações `campo op valor`) ao fim de cada combate, a cada troca de setor e na vitória final. Um desbloqueio nunca é desfeito.

| ID da Carcaça (`idArquitetura`) | Nome Canônico (Seção 5.4) | Estado Inicial no `profile.json` | Predicado Puro de Desbloqueio (Cruzamento `N1` com a Seção 5.4) |
| :--- | :--- | :---: | :--- |
| `CARCACA_ALFA` | **1. Carcaça Alfa** | `true` | `sempreDesbloqueada === true` (Disponível desde o início) |
| `MANTA_VOLT` | **2. Manta-Volt** | `false` | `setorNumero >= 4 && vitoriaCombate === true && danoCascoCausadoAoInimigoNestaLuta === 0` |
| `COURACA_LIMIAR` | **3. Couraça-Limiar** | `false` | `barcosCapturadosIntactosNestaRun >= 5` |
| `SOMBRA_ABISSAL` | **4. Sombra-Abissal** | `false` | `orgaosIntactosExtraidosNestaRun >= 4` |
| `COLMEIA_VIVA` | **5. Colmeia-Viva** | `false` | `setorNumeroAlcanceMaxNestaRun >= 8` |

### C. Orçamento de Layout Nativo ($960\times 540 \xrightarrow{2\times} 1920\times 1080$) e 8 Cues Sonoros Táticos da Onda 6

1. **Target Visual e Geometria do Framebuffer (`src/onda6-ui/presenter-wireframe.mjs`):**
   * **Resolução Lógica Nativa ($16:9$):** **$960\times 540\text{ pixels}$** (*pixel art hi-bit* com `image-rendering: pixelated`), escalada por **fator inteiro $2\times$ para $1920\times 1080\text{ pixels}$** (Full HD) e $4\times$ para $3840\times 2160\text{ pixels}$ (4K).
   * **Convenção de Unidades (Lei L4):** os pixels do Vol. 02 são medidos na tela $1920\times 1080$; os desta seção são **nativos**. Uma câmara de $100\times 70\text{ px}$ no Vol. 02 é uma câmara de $50\times 35\text{ px}$ aqui.
   * **Frames de Arte F1–F5:** são *mockups* conceituais gerados fora da grade nativa (F1–F4 em $1920\times 1080$, F5 em $1376\times 768$). Servem de referência de composição e paleta, **não** de geometria de pixel.
2. **Orçamento de Layout Nativo (recalculado pelo portão):**

| Parâmetro de Layout | Valor Nativo (px) | Significado |
| :--- | :---: | :--- |
| `HUD_TOPO_ALTURA` | $36$ | Barra superior (Casco, Barreira, Estado, Recursos) |
| `PAINEL_RODAPE_TOPO_Y` | $440$ | Início dos painéis Coração / Sistemas / Armas / Tripulação |
| `COLUNA_TERMOMETRO_LARGURA` | $112$ | Termômetro de Sustentação + botões à esquerda |
| `PAINEL_INIMIGO_X` | $600$ | Início da janela do alvo inimigo à direita |
| `CAMARA_LARGURA` | $50$ | Área útil interna de cada câmara |
| `CAMARA_ALTURA` | $35$ | Área útil interna de cada câmara |
| `PAREDE_ESPESSURA` | $2$ | Paredes e válvulas entre câmaras |
| `ARMAS_DORSAIS_ALTURA` | $20$ | Chassis de armas presos no dorso |
| `LINHA_DAGUA_Y` | $330$ | Superfície do mar (fixa nos dois estados) |
| `VAO_DE_AR_NO_FOIL` | $24$ | Espaço entre a barriga do casco e a água em `1_NO_FOIL` |
| `MASTRO_ASA_ALTURA` | $50$ | Quilha + asa submersa abaixo da linha d'água |
| `QUEDA_TOUCHDOWN` | $100$ | Deslocamento vertical da nave ao cair em `2_TOUCHDOWN` |

   * **Geometria Derivada:** grade $2\times 4$ $= (2 \times 50 + 3 \times 2) \times (4 \times 35 + 5 \times 2) = 106 \times 150\text{ px}$. Em `1_NO_FOIL`: armas em $y = 136..156$, grade em $156..306$, vão de ar $306..330$, quilha e asa em $330..380$. Em `2_TOUCHDOWN` (queda de $100\text{ px}$ nativos $= 200\text{ px}$ em 1080p): grade em $256..406$, com a parede entre o 2º e o 3º andar em $y = 330..332$, exatamente na `LINHA_DAGUA_Y` (Seção 2.2.2 do Vol. 02). As 8 câmaras ficam visíveis nos dois estados (topo $\ge 36$, base $\le 440$). O filtro passa-baixa subaquático do Touchdown fica em **$400\text{ Hz}$**.
3. **Tabela dos 8 Cues Sonoros Táticos Obrigatórios (Leitura Cega de Sobrevivência):**

| ID do Cue Sonoro | Gatilho Determinístico no `GameState` | Parâmetro Temporal / Acústico Canônico | Cruzamento GDD (`N1`) |
| :--- | :--- | :---: | :--- |
| `CUE_ESTOL_TOUCHDOWN` | Transição `1_NO_FOIL` $\rightarrow$ `2_TOUCHDOWN` ($P_{\text{total}} > S_{\text{atual}}$ ou `MERGULHO_TATICO`) | Queda de $100\text{ px}$ nativos ($200\text{ px}$ em 1080p) + passa-baixa $400\text{ Hz}$ | Seção 2.2 (Itens 1 e 2) |
| `CUE_SPOOL_UP_DECOLAGEM` | Estado `3_SPOOL_UP` ativo (`progressoSpoolUpSeg > 0`) até decolar | Ramp-up contínuo de $3.0\text{s}$ ($5.0\text{s}$ pós-Deriva) | Tabela 6.1 (`TEMPO_SPOOL_UP`) |
| `CUE_ALARME_FERVURA_4S` | `alvoCombate.alarmeFervuraAtivoSeg > 0` antes da Fervura na Fase 3 | Alarme antecedente de **$4.0\text{s}$** (Fervura dura **$5.0\text{s}$**) | Matriz 6.2 (Célula 3H) e Seção 5.5 |
| `CUE_CURTO_CIRCUITO_AGUA` | Qualquer câmara com `curtoCircuitoAtivo === true` | Cessa após **$3.0\text{s}$** contínuos a $0.0\text{ kg}$ de água | Seção 1.3 e Seção 2.2.3 |
| `CUE_CAVITACAO_SIFAO` | Soma de `aguaKg` das 8 câmaras $< 62.5\text{ kg}$ | Alerta de perda de $-2.0\text{ kg}$ de sustentação por kg | Tabela 6.1 (`RESERVA_MIN_SIFAO`) |
| `CUE_HIPOXIA_CRITICA` | Qualquer câmara ocupada com `oxigenioPct < 20.0` | Asfixia de $-8\text{ HP/s}$ abaixo de $20\%\text{ O}_2$ | Seção 1.4 e Seção 2.2.3 |
| `CUE_TRAVA_HIDROSTATICA` | Comando `ALTERNAR_VALVULA` ou `DRENAR_TUDO` rejeitado no mar | Disparo imediato ($0.0\text{s}$) ao retornar `BLOQUEADO_TRAVA_HIDROSTATICA` | Matriz 6.2 (Células 2C, 3C e 5C) |
| `CUE_POWER_SURGE_CHEFE` | Disparo de *Power Surge* da Draga Continental | Ciclos de **$22\text{s}$** (Fase 1), **$20\text{s}$** (Fase 2) e **$18\text{s}$** (Fase 3) | Seção 5.5 (Fases 1, 2 e 3) |

---


# CONTRA-AUDITORIA #8 (Auditoria do Contrato de Estado e Arquitetura)

1. **Existe algum timer ou regra das Contra-Auditorias #1 a #6 que ficou sem campo explícito no `GameState`?**
   * *Verificação campo a campo:*
     * *Spool-up* de $3.0\text{s}$ $\rightarrow$ `naveJogador.progressoSpoolUpSeg`.
     * Corrosão do Mastro após $8.0\text{s}$ em *Touchdown* (Setor 7) e Regeneração da *Colmeia-Viva* a cada $12.0\text{s}$ em *Touchdown* (máx. $+2\text{ HP}$ por luta) $\rightarrow$ `naveJogador.tempoTouchdownContinuoSeg` e `naveJogador.regeneracoesColmeiaNestaLuta`.
     * *Onda de Arrasto Hidráulico* ($+50\text{ kg}$ por $6\text{s}$ na Fase 1 do Chefe) $\rightarrow$ `naveJogador.pesoVirtualArrastoKg`.
     * *Isolamento Residual Pós-Choque* de $5.0\text{s}$ $\rightarrow$ `camara.isolamentoResidualChoqueSeg`.
     * Extinção de Curto-Circuito em $3.0\text{s}$ a $0\%$ de água $\rightarrow$ `camara.progressoExtincaoSecoSeg`.
     * Alarme de $4.0\text{s}$ e Fervura Oceânica de $5.0\text{s}$ (Fase 3 do Chefe) $\rightarrow$ `alvoCombate.alarmeFervuraAtivoSeg` e `alvoCombate.fervuraAtivaSeg`.
     * IA de Backup da Draga Continental $\rightarrow$ `alvoCombate.iaBackupAtiva`.
   * *Resultado:* **Zero estados implícitos.** Toda variável temporal da matemática base tem endereço fixo no `GameState`.
2. **Existe risco de duas Ondas disputarem o mesmo arquivo (`Lei N5`)?**
   * *Verificação:* Cada Onda (`onda1-fisica` até `onda6-ui`) escreve em sua própria subpasta em `src/` e em seu próprio arquivo de teste numerado em `tests/03..08`.
   * *Resultado:* **Zero conflito de arquivos entre frentes.**
3. **Existe risco da UI mutar o `GameState` em cliques inválidos ou de *Save Scumming* corromper o meta-progresso (`profile.json`)?**
   * *Verificação:*
     * Qualquer clique proibido pela física (como abrir válvulas em `2_TOUCHDOWN` / `3_SPOOL_UP` ou enxertar órgãos em `COMBATE`) é interceptado pela tabela da Seção 8.5.A antes de alterar o estado, emitindo apenas o marcador de rejeição e o `CUE_TRAVA_HIDROSTATICA`.
     * A separação física entre `run_save.json` (run efêmera com *permadeath*) e `profile.json` (meta-progresso avaliado por predicados puros na Seção 8.5.B) garante que a morte do jogador apague a run sem jamais perder carcaças desbloqueadas.
   * *Resultado:* **Zero mutação ilegal de UI e zero corrupção entre *permadeath* e meta-progresso.**
