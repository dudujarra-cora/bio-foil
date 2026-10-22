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

---

## 8.2. Contrato do Canal de Visibilidade e Permissão (Lei L3 no Domínio do Jogo)

Na **Lei L3**, uma função nunca pode retornar `[]` ou `0` tanto para *"a sala inimiga está vazia"* quanto para *"não consigo ver a sala inimiga por causa de Águas Turvas ou Bolsa de Tinta"*.

Toda leitura do estado inimigo (pela UI ou pela IA de mira) é obrigada a passar pelo seletor puro `inspecionarSalaAlvo(estado, salaId)`:

| Situação Real no Jogo | `canalPermissao` | `status` | `marcadorExplicito` | `dados` |
| :--- | :---: | :---: | :--- | :--- |
| Sonar ativo / Sala visível e vazia | `'VISIVEL'` | `'OK'` | `'SALA_VISIVEL_VAZIA'` | `{ tripulantes: [], sistemaVisivel: true }` |
| Sonar ativo / Sala visível com 2 humanos | `'VISIVEL'` | `'OK'` | `'SALA_VISIVEL_OCUPADA'` | `{ tripulantes: [h1, h2], sistemaVisivel: true }` |
| Bioma *Águas Turvas* sem Arraia/Acústico | `'NEGADO_SONAR'` | `'SEM_PERMISSAO_VISAO'` | `'CEGO_AGUAS_TURVAS_ABISSAIS'` | `undefined` (nunca `[]`!) |
| Sala atingida por *Bolsa de Tinta Abissal* | `'NEGADO_TINTA'` | `'SEM_PERMISSAO_VISAO'` | `'CEGO_BOLSA_TINTA'` | `undefined` (nunca `[]`!) |
| ID de sala fora do intervalo do alvo | `'VISIVEL'` | `'NAO_ENCONTRADO'` | `'SALA_ALVO_INEXISTENTE'` | `undefined` |

---

## 8.3. Árvore de Módulos e Matriz de Dono Único (Lei N5 e Lei N6)

Para cumprir a **Lei N5 ("Um dono por arquivo compartilhado")** e a **Lei N6 ("Onda de teste não conserta produto")**, cada arquivo do projeto pertence a **uma única Onda** e tem separação física estrita entre **Código de Produto (`src/`)** e **Portão de Teste (`tests/`)**:

```text
/Users/dudujarra/Documents/ftl/
├── 01..08_*.md                          # [Onda 0] 8 Volumes Canônicos do GDD (Congelados)
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
│   ├── gdd-parser.mjs                   # [Onda 0] Parser SSOT/Matriz e equações base do GDD
│   ├── onda1-fisica/
│   │   ├── estado-inicial.mjs           # [Onda 1] Fábrica imutável do GameState e das 8 câmaras
│   │   └── tick-hidraulica-foil.mjs     # [Onda 1] Peso, Sustentação, Cavitação, Água, Spool-up, Válvulas
│   ├── onda2-combate/
│   │   ├── tick-sistemas-armas.mjs      # [Onda 2] Armas, Barreira, Branquial, Curto-Circuito, Furtividade
│   │   └── tick-tripulacao.mjs          # [Onda 2] Nado (1.5s), Reparo, Asfixia, Baiacu, Visão L3
│   ├── onda3-inimigos/
│   │   ├── ia-barco-monstro.mjs         # [Onda 3] IA Humana (Bomba Porão) e Monstro (Anticorpos)
│   │   └── abordagem-vitoria.mjs        # [Onda 3] Tubo Pressurizado, Modo Parasita e 3 Vitórias/Saque
│   ├── onda4-mapa/
│   │   ├── gerador-poisson.mjs          # [Onda 4] Malha 18..22 nós, Correntes e Baralho de Cotas
│   │   └── relogio-viagem.mjs           # [Onda 4] Velocidade (<=15 MN/h), Maré 20h e Modo Deriva
│   ├── onda5-catalogo-chefe/
│   │   ├── catalogo-naves-itens.mjs     # [Onda 5] 5 Naves, 7 Armas, 6 Órgãos (+5kg, Isolamento 5s), Lojas
│   │   └── chefe-draga.mjs              # [Onda 5] As 3 Fases da Draga Continental, Surges e IA Backup
│   └── onda6-ui/
│       └── presenter-wireframe.mjs      # [Onda 6] Seletor/Presenter 16:9 puro acoplado ao GameState
└── tests/
    ├── 01-portao-gdd.test.mjs           # [Onda 0] Portão L5 dos 8 volumes GDD + SSOT + Matriz 5x8 + tripulação + linha do tempo
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
   * `avaliarCondicaoDeVitoria(estado) -> { encerrado: boolean, modalidade: 'DESTRUICAO_BRUTA' | 'CAPTURA_ASFIXIA' | 'EXTRACAO_BIOCHOQUE' | null, recompensa }`.
3. **Junção Onda 3 $\leftrightarrow$ Onda 4 (`Pós-Combate/Porão` $\leftrightarrow$ `Mapa/Relógio`):**
   * `iniciarTravessiaMapa(estado, idNoDestino) -> estadoPosViagem` (fecha válvulas, nivela `aguaKg = 12.5` nas 8 câmaras, soma `armasAtivas + poraoCarga + orgaos + blindagem`, calcula $\Delta t_{\text{horas}}$ e avança `frenteCorporacaoMn += 6.0 * dtHoras`).
4. **Junção Onda 4 $\leftrightarrow$ Onda 5 (`Setor 8` $\leftrightarrow$ `Chefe Final em 3 Fases`):**
   * `transicionarFaseChefeDraga(estado) -> estadoProximaFase` (executa o **Atracar Automático entre Fases**, resgatando todos os tripulantes aliados com `localizacao === 'BORDO_INIMIGO'` antes de carregar a próxima fase da Draga Continental!).
5. **Junção Ondas 1–5 $\leftrightarrow$ Onda 6 (`Motor` $\leftrightarrow$ `Wireframe UI 16:9`):**
   * `projetarViewModelWireframe(estado) -> ViewModelCongelado` (calcula a posição da barra no Termômetro Vertical `Peso vs. Sustentação`, o estado `TRAVADA_TOUCHDOWN` das válvulas externas, os 4 slots da caixa `[ARMAS]` e o canal `L3` do painel inimigo).

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
