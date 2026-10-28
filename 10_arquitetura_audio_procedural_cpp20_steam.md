# PASSO 10: Arquitetura de Áudio Procedural C++20/WASM, Foley Submarino, Mixagem HDR e Fechamento Comercial Steam

Este volume fecha a cadeia documental canônica (`01..10`) como a **Fonte Única da Verdade (SSOT Acústica)** da engenharia sonora comercial do *Bio-Foil*. Ele especifica matematicamente: (1) a direção musical adaptativa unificada (*Groove Submarino: Biológico Místico $\times$ Industrial Hidráulico*) e os **6 gêneros procedurais (`G0..G5`)**, (2) a arquitetura **C++20 Dual-Layer** (`R\$ 0`, *EULA-clean*, zero dependências `npm`), (3) a matriz dos **6 barramentos de prioridade** com oclusão subaquática dividida e *ducking* espectral cirúrgico, (4) o catálogo completo de eventos táticos de sobrevivência, *loops* sustentados de sala e *stingers* quantizados ao compasso, e (5) a calibração de plataforma (`LUFS / HDR Audio`), persistência em `profile.json`, acessibilidade **`XAG 104` / Anti-Tinnitus** e o fechamento das **18 lacunas ocultas (`L1..L18`)** para lançamento comercial na Steam e Steam Deck.

> **Garantia da Lei L4 e Lei N1:** Todos os estados físicos (`1_NO_FOIL` .. `5_FURTIVO_AGUA`), fases de ciclo (`INICIO` .. `FIM_DE_RUN`), espécies (`POLVO, ARRAIA, BAIACU, CARANGUEJO`), armas (`7`), carcaças (`5`), fases da Draga Continental (`3`), transições de *Permadeath* (`TR_7A, TR_7B, TR_7C`), geometria nativa (`LINHA_DAGUA_Y = 330`) e os `8 Cues` de sobrevivência são cruzados diretamente contra os Volumes `01`, `05`, `06`, `08` e `09`.

---

## 10.1. Direção Musical Unificada, Descida Modal e Catálogo Fechado dos 6 Gêneros (`G0..G5`)

A identidade musical do *Bio-Foil* funde pulsação orgânica abissal com precisão mecânica hidráulica sob as seguintes constantes invariantes:

* **Invariantes Rítmicas, Espectrais e de Histerese (`MusicalDirector`):**
  * `SWING_SEMICOLCHEIA_MIN_PCT`: $55\%$ e `SWING_SEMICOLCHEIA_MAX_PCT`: $58\%$ (deslocamento das semicolcheias pares para *groove* propulsivo humano, sem rigidez mecânica quadrada).
  * `SUB_GRAVE_FUNDAMENTAL_MIN_HZ`: $43.65\text{ Hz}$ ($F_1$) e `SUB_GRAVE_FUNDAMENTAL_MAX_HZ`: $49.00\text{ Hz}$ ($G_1$), com crossover *Linkwitz-Riley* de 4ª ordem (`LR4` em $120\text{ Hz}$) garantindo correlação de fase mono `CORRELACAO_MONO_SUB_MIN` $\ge 0.99$.
  * `SCHMITT_HISTERESE_DELTA`: $\pm 0.08$ sobre a variável contínua de tensão $T \in [0.0, 1.0]$ e retenção mínima `HOLD_MINIMO_COMPASSOS`: $8\text{ compassos}$ antes de qualquer de-escalada (exceto *override* imediato em entrada de Chefe ou `FIM_DE_RUN`), eliminando *thrashing* de trilhas.
  * **Corte Explícito Anti-Fadiga Cognitiva:** Andamentos de *Rave / Full-On / Darkpsy* entre `CORTE_RAVE_PROIBIDO_MIN_BPM`: $142\text{ BPM}$ e `CORTE_RAVE_PROIBIDO_MAX_BPM`: $155\text{ BPM}$ são **estritamente proibidos** para não induzir erro precipitado de gerenciamento hidrostático em partidas de $45\text{ minutos}$.
* **Arco Modal Descendente de Pressão Setorial:**
  * Setores `1..3` (Águas Rasas e Costeiras): `G_DORICO` ($G_1 = 49.00\text{ Hz}$, sexta maior luminosa de partida).
  * Setores `4..6` (Zona Mesopelágica e Industrial): `FS_FRIGIO` ($F^\#_1 = 46.25\text{ Hz}$, segunda menor metálica tensa).
  * Setores `7..8` (Fossa Abissal e Draga Continental): `F_LOCRIO` ($F_1 = 43.65\text{ Hz}$, quinta diminuta instável de pressão esmagadora).

### Tabela 10.1.A — Os 6 Gêneros Procedurais Canônicos (`G0..G5`)

| ID do Gênero | Nome e Referência Estética | BPM Canônico | Modo Base | Fases Permitidas (`meta.faseJogo`) | Arquitetura de Síntese Principal C++20 |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `G0_AMBIENT_DUB` | Ambient Dub Abissal (*Doca / Recife-Forja / Eventos*) | `90` | `G_DORICO` | `INICIO, EVENTO, LOJA` | `OBXdPad` + `HadamardFdn8Reverb` + `ModalRingsSonar` |
| `G1_DUB_TECHNO` | Dub Techno Hidrográfico (*Yagya / DeepChord*) | `110` | `G_DORICO` | `MAPA` | `MinorChordStabZdf` + `ChowTapeDubDelay 3/16` + `HydroNoise` |
| `G2_SLOW_INDUSTRIAL` | Slow Industrial Hidráulico (*Gesaffelstein*) | `110` | `FS_FRIGIO` | `COMBATE` | `K35Ms20Bass` + `AdaaWavefolder` + `HydraulicBrassPerc` |
| `G3_BIO_MYSTIC_GROOVE` | Bio-Mystic Groove (*Maceo Plex / Nicolas Jaar*) | `125` | `G_DORICO` | `COMBATE` | `KickSubPhaseAligner` + `FormantBioLead` + `SwingGroove` |
| `G4_ACID_DRIVING` | Acid Driving Submarino (*Plastikman / 303*) | `128` | `FS_FRIGIO` | `COMBATE` | `Diode303Filter` + `AcidSlideAccent` + `TptSvfDrive` |
| `G5_INDUSTRIAL_HARDGROOVE` | Industrial Hardgroove Chefe (*Stef Mendesidis / Blawan*) | `137` | `F_LOCRIO` | `COMBATE` | `Polyrhythm3x16Loop` + `FmAnvilPerc` + `LocrianSubF1` |

---

## 10.2. Arquitetura C++20 Dual-Layer (`R$ 0`, EULA-Clean e Zero Dependências NPM)

Para eliminar custos de licenciamento e respeitar a proibição comercial de versões *Trial* de DAWs proprietárias (como a Seção 9 do EULA do *Ableton Live Trial*) sem introduzir nenhuma dependência externa no `package.json`, a produção sonora divide-se em duas camadas C++20 nativas:

### Tabela 10.2.A — Especificação Técnica das 2 Camadas C++20

| ID da Camada | Binário / Artefato Alvo | Taxa Interna / Saída | Orçamento / Limite Crítico | Responsabilidade Técnica e Licenciamento |
| :--- | :--- | :---: | :---: | :--- |
| `CAMADA_1_FORJA_OFFLINE` | `biofoil_forge_cli` | `192000 -> 48000 Hz` | `SEAM_DELTA_MAX = 0.000000` (`24 amostras` / `0.5 ms` declick); `-16.0 LUFS` stem; `-1.0 dBTP` | Renderizador *offline* `arm64/x86_64` com `4x oversampling`, `ADAA`, filtros `ZDF` (`K35`, `Diode303`, `OB-Xd`, `TptSvf`), `ChowTapeDubDelay`, `HadamardFdn8Reverb`, `Second-Pass` de cauda cíclica e masterização `ITU-R BS.1770-5` em malha fechada (`FLAC 24-bit` + `Ogg Opus 192 kbps`). |
| `CAMADA_2_RUNTIME_WASM` | `libbiofoil_audio_rt.wasm` | `sampleRate` real do SO (`24000..96000 Hz`) | `0 malloc` no bloco de `128 frames`; snapshot RTPC de `64 bytes` a `60 Hz` via `MessagePort` | Motor em tempo real `100% MIT-clean` compilado via `emscripten` de sistema (`-sSTANDALONE_WASM=1 --no-entry -O3`), rodando em `AudioWorklet` no navegador e diretamente no `WebAssembly` nativo do Node.js `22` para testes `L1` sem mocks. |

---

## 10.3. Matriz dos 6 Barramentos, Oclusão Subaquática Dividida, Ducking Cirúrgico e 3 Leis de Foley/VO

Quando a Bionave cai de `1_NO_FOIL` para `2_TOUCHDOWN` (cruzando `LINHA_DAGUA_Y = 330` com queda de $100\text{ px}$ nativos, Seção `8.5.C`), aplicar um filtro passa-baixas cego de $400\text{ Hz}$ no *Master* inteiro destruiria a inteligibilidade dos alertas de sobrevivência e soaria fisicamente errado para sons internos da cabine pressurizada. O motor C++20 separa o sinal em **6 barramentos hierárquicos**:

### Tabela 10.3.A — Os 6 Barramentos de Prioridade (`BUS_0..BUS_5`) e Oclusão Física

| ID do Barramento | Prioridade | Trim Nominal (dB) | Corte `1_NO_FOIL` (Hz) | Corte Submerso `2_TOUCHDOWN` / `5_FURTIVO_AGUA` (Hz) | Regra de Oclusão e Ducking Espectral Cirúrgico |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `BUS_0_SURVIVAL_CUES` | `0` | `0.0` | `20000` | `20000` | `BYPASS_TOTAL_400HZ`; aciona filtro dinâmico *Bell EQ* de `-6.5 dB` centrado em `950 Hz` nos barramentos `1..3` e `5` |
| `BUS_1_MUSIC` | `1` | `-7.5` | `20000` | `400` | Filtro ZDF `400 Hz` submerso (`7200 Hz` em `4_FURTIVO_AR`, `900 Hz` em Pausa Tática); *ducking* `Bell -6.5 dB @ 950 Hz` mantém sub `45 Hz` em `0.0 dB` |
| `BUS_2_INTERIOR_CABIN` | `2` | `-3.0` | `20000` | `14000` | `CABINE_PRESSURIZADA_SECA` (isento do abafamento de `400 Hz`; recebe *early reflections* metálicas/quitinosas curtas do casco) |
| `BUS_3_EXTERIOR_SEA` | `3` | `-2.5` | `18000` | `380` | `OCLUSAO_SUBMARINA_TOTAL` (`dry + wet` filtrados a `380 Hz` para explosões, hélices, projéteis e mar externo) |
| `BUS_4_UI` | `4` | `-4.0` | `20000` | `20000` | `BYPASS_TOTAL_400HZ`; cliques mecânicos secos `< 18 ms` (sextante, bússola hidrográfica, barras de energia) |
| `BUS_5_HYDRO_BED` | `5` | `-9.0` | `16000` | `420` | Cama contínua de bolhas de *Minnaert*, cavitação do hidrofólio e pressão abissal, regida pela janela deslizante *HDR Audio* de `8.0 dB` |

* **As 3 Decisões Profissionais Travadas de Foley, UI e Voz (`Leis Acústicas`):**
  1. `LEI_SFX_1_OCLUSAO_DIVIDIDA`: Alertas de vida ou morte (`BUS_0`) e interface tática (`BUS_4`) têm `100%` de *bypass* do filtro submerso de $400\text{ Hz}$; o interior da nave (`BUS_2`) permanece seco/pressurizado ($14000\text{ Hz}$); apenas a música (`BUS_1`, $400\text{ Hz}$), o oceano externo (`BUS_3`, $380\text{ Hz}$) e a cama hidrodinâmica (`BUS_5`, $420\text{ Hz}$) mergulham sob a água. Em `3_SPOOL_UP`, o corte de `BUS_1` abre exponencialmente de $400\text{ Hz}$ até $20000\text{ Hz}$ ao longo dos $3.0\text{s}$ ($5.0\text{s}$ pós-Deriva).
  2. `LEI_SFX_2_ZERO_REUSO_ARMA_UI`: É proibido reutilizar qualquer síntese de armamento em ações de UI ou tripulação. Passos variam continuamente de secos a chapinhados conforme `camara.aguaKg` ($0.0\text{ a }12.5\text{ kg}$); alocar energia (`1..4` barras) toca harmônicos cravados na escala modal ativa; mirar armas aciona clique de sextante de latão de $18\text{ ms}$; viajar no mapa combina bússola hidrográfica com ressonador modal de $16\text{ modos}$ (`ModalRingsResonatorVoice`).
  3. `LEI_SFX_3_ZERO_VOZ_HUMANA_FALADA`: Não há falas humanas nem rádio em idioma falado (zero custo de localização de voz e zero repetição cansativa). Humanos produzem apenas sinais fisiológicos não-verbais (suspiro em regulador sob `< 20% O2`, passos e batimento cardíaco bioelétrico `58 -> 86 -> 118 BPM`). O sintetizador C++20 de trato vocal virtual de `3 formantes + sub-harmônico f0/2` é reservado exclusivamente a monstros marinhos, Baleia, Parasitas e ao chefe **Draga Continental**.

---

## 10.4. Catálogo Completo de Eventos Táticos Complementares, Loops de Sala e Stingers Quantizados

Além dos **8 Cues Obrigatórios da Seção 8.5.C.3 (Vol. 08)** roteados em `BUS_0_SURVIVAL_CUES`, o motor cobre obrigatoriamente os **11 grupos de eventos táticos e musicais (`EVT_AUD_01..11`)** abaixo, eliminando qualquer mecânica muda nas Ondas 1 a 6:

### Tabela 10.4.A — Os 11 Eventos Acústicos Complementares (`EVT_AUD_01..11`)

| ID do Evento Acústico | Barramento Dono | Gatilho Determinístico no Motor | Parâmetro Temporal / Regra Acústica | Cruzamento Canônico GDD (`N1`) |
| :--- | :---: | :--- | :--- | :--- |
| `EVT_AUD_01_ARMA_PRONTA_SLOT` | `BUS_0_SURVIVAL_CUES` | Slot de arma dorsal (`0..3`) cruza `100%` de carga | *Ready Ping* de `90 ms` com timbre distinto para cada uma das `7 armas` | `Vol. 05 (Seção 5.1)` e `Vol. 02` |
| `EVT_AUD_02_SALVA_COMPLETA_PRONTA` | `BUS_0_SURVIVAL_CUES` | Todas as armas manuais ativas prontas para Salva `[X]` | Acorde harmônico duplo de prontidão de artilharia (`140 ms`) | `Vol. 08 (Seção 8.5.A)` |
| `EVT_AUD_03_SALTO_FUGA_PRONTO` | `BUS_0_SURVIVAL_CUES` | `progressoFugaSeg >= 20.0` com Sifão e Córtex ativos | Pulso ascendente de destravamento do comando `SALTO_FUGA` `[J]` | `Vol. 06 (Matriz 6.2 Linha G)` |
| `EVT_AUD_04_INIMIGO_EM_FUGA` | `BUS_3_EXTERIOR_SEA` | Alvo inimigo inicia sequência de evasão do nó | *Spool-up* contínuo de hélice/cauda inimiga espacializado em `pan +0.40` | `Vol. 03` e `Vol. 05 (Seção 5.7)` |
| `EVT_AUD_05_MORTE_TRIPULANTE_ALIADO` | `BUS_0_SURVIVAL_CUES` | Aliado transiciona de `hpAtual > 0` para `hpAtual <= 0` | Sino sub-harmônico fúnebre + falha imediata de `1 batida` no pulso cardíaco | `Vol. 01 (Seção 1.5)` |
| `EVT_AUD_06_ESPECIAIS_4_ESPECIES` | `BUS_2_INTERIOR_CABIN` | Uso de `ATIVAR_TINTA_FURTIVA`, `ATIVAR_PULSO_ENZIMAS`, `ATIVAR_BAIACU` ou golpe de `CARANGUEJO` | Foley orgânico dedicado para cada uma das `4 espécies` (`POLVO, ARRAIA, BAIACU, CARANGUEJO`) | `Vol. 01 (Seções 1.4 e 1.5)` |
| `EVT_AUD_07_LOOP_ROMBO_PRESSURIZADO` | `BUS_2_INTERIOR_CABIN` | Câmara com rombo ativo não vedado por Baiacu | Loop sustentado de jorro com *Voice Stealing* e *fade-out* de `60 ms` ao soldar/vedar | `Vol. 01 (Seções 1.2 e 1.6.B)` |
| `EVT_AUD_08_LOOP_CURTO_E_REPARO` | `BUS_2_INTERIOR_CABIN` | `curtoCircuitoAtivo === true` ou tripulante reparando | Crepitação elétrica contínua (`8.0s`) e pulso de reparo com *pitch* subindo `0% -> 100%` | `Vol. 01 (Seções 1.3 e 1.5)` |
| `EVT_AUD_09_VARREDURA_BEAM_ORTOGONAL` | `BUS_3_EXTERIOR_SEA` | Disparo de Feixe Térmico em `trincaSalasBeam` | Varredura espectral contínua percorrendo as `3 salas` ortogonais | `Vol. 01 (Seção 1.6.C)` |
| `EVT_AUD_10_SEIS_STINGERS_QUANTIZADOS` | `BUS_1_MUSIC` | Vitória de luta, Draga `F1->F2`, Draga `F2->F3`, Desbloqueio de `5 Carcaças`, SOS Salvo, Emboscada Frota | `6 Stingers` de `2..4 compassos` disparados na próxima subdivisão de `1/4` de compasso | `Vol. 05 (Seção 5.5)` e `Vol. 08 (8.5.B)` |
| `EVT_AUD_11_ARCOS_FINAIS_FECHADOS` | `BUS_1_MUSIC` | Transições terminais `TR_7B_VITORIA_FINAL` vs `TR_7A / TR_7C` | `2 composições` fechadas (sem loop infinito) para Vitória da Expedição e Naufrágio *Permadeath* | `Vol. 09 (Seção 9.2)` |

---

## 10.5. Mixagem de Plataforma (`LUFS / HDR`), Persistência (`preferenciasAudio`), Acessibilidade (`XAG 104`) e as 18 Lacunas Steam

Para conciliar a masterização limpa dos arquivos individuais (`-16.0 LUFS`) com o conforto de sessões longas em PC/Console (norma **Sony ASWG-R001 / EBU R128** em `-23.0 a -24.0 LUFS`) e a resposta acústica reduzida de portáteis (**Steam Deck**), o mixer C++20 aplica `trimMusicaDb = -7.5 dB` (`-23.5 LUFS` nominais em jogo) sob uma **Janela Deslizante HDR Audio de `8.0 dB`** e oferece **3 Perfis Acústicos**:

### Tabela 10.5.A — Os 3 Perfis Acústicos de Plataforma (`perfilDinamico`)

| ID do Perfil | Alvo Integrado (`LUFS`) | `LRA` Máximo (`LU`) | Teto True Peak (`dBTP`) | Processamento Psicoacústico e Filtragem de Saída |
| :--- | :---: | :---: | :---: | :--- |
| `ESTUDIO` | `-23.0` | `14.0` | `-1.0` | Dinâmica integral de estúdio/fones; sub-grave fundamental `43.65..49.00 Hz` puro + janela HDR `8.0 dB` |
| `STEAM_DECK` | `-18.0` | `8.0` | `-1.0` | Excitador psicoacústico de `2x` e `3x` harmônicos (`87.30..147.00 Hz`, fundamental ausente) para falantes portáteis |
| `NOTURNO` | `-24.0` | `5.0` | `-2.0` | Filtro *High-Pass* suave em `65 Hz` + compressão noturna mantendo `100%` da clareza de `BUS_0_SURVIVAL_CUES` |

### Contrato Canônico de Persistência `preferenciasAudio` em `profile.json` (Imune ao *Permadeath*)

Gravado atomicamente dentro de `profile.json` (separado de `run_save.json`, sobrevivendo integralmente às transições `TR_7A_DERROTA_EM_COMBATE`, `TR_7B_VITORIA_FINAL` e `TR_7C_DERROTA_EM_EVENTO`), com conversão de cada *slider* (`0..100`) para escala logarítmica perceptual em `dB` (`0 -> -Infinity dB`, `100 -> 0.0 dB`) e alerta `L3` se `alertasUi < 20`:

```json
{
  "master": 85,
  "musica": 80,
  "sfxCombate": 90,
  "cabineTripulacao": 85,
  "ambienteMaritimo": 75,
  "alertasUi": 100,
  "mudo": false,
  "perfilDinamico": "ESTUDIO",
  "saidaMono": false,
  "silenciarSemFoco": true,
  "legendasTaticasDirecionais": "ALERTAS_CRITICOS",
  "confortoAntiTinnitus": false
}
```

### Tabela 10.5.B — Matriz de Fechamento das 18 Lacunas Comerciais Steam (`L1..L18`)

| Código | Eixo | Problema Oculto Auditado | Invariante Técnica de Fechamento Obrigatório |
| :---: | :--- | :--- | :--- |
| `LAC_01` | Runtime / CSP | `Content-Security-Policy` bloqueia `.wasm` e `AudioWorklet` | Header CSP inclui `script-src 'self' 'wasm-unsafe-eval'` e `worker-src 'self'` + MIME `application/wasm` |
| `LAC_02` | Memória RAM | Decodificar `101 stems` de `15s` consome `~581.76 MB` PCM `Float32` | Pool LRU por Zona Acústica mantém teto estrito `<= 64 MB` de RAM PCM |
| `LAC_03` | Toolchain | `package.json` proíbe `npm` e `SharedArrayBuffer` exige `COOP/COEP` | `emscripten` offline (`STANDALONE_WASM`) + snapshots de `64 bytes` via `MessagePort` a `60 Hz` |
| `LAC_04` | Hardware / SO | Bluetooth/DAC altera `sampleRate` (`24000 / 44100 / 96000 Hz`) | `biofoil_rt_init(sampleRate)` recalcula ZDF/modos dinamicamente e nunca abre microfone |
| `LAC_05` | Ciclo de Foco | `setInterval` avança combate às cegas em `Alt-Tab` / `Shift+Tab` | Listener `visibilitychange` aciona Auto-Pausa Tática em `COMBATE` + `silenciarSemFoco` |
| `LAC_06` | Testes `L1/L6` | Node.js `22` não possui `AudioContext` nativo em CLI | `node --test` instancia `libbiofoil_audio_rt.wasm` diretamente no `WebAssembly` nativo (zero mocks) |
| `LAC_07` | Gameplay | Armas de `8..16s` terminam recarga sem aviso auditivo | `EVT_AUD_01_ARMA_PRONTA_SLOT` por família + `EVT_AUD_02_SALVA_COMPLETA_PRONTA` |
| `LAC_08` | Gameplay | `SALTO_FUGA` `[J]` destravado e fuga inimiga sem telégrafo | `EVT_AUD_03_SALTO_FUGA_PRONTO` em `BUS_0` + `EVT_AUD_04_INIMIGO_EM_FUGA` em `pan +0.40` |
| `LAC_09` | Gameplay | Morte aliada em *Permadeath* e especiais das `4 espécies` mudos | `EVT_AUD_05_MORTE_TRIPULANTE_ALIADO` + `EVT_AUD_06_ESPECIAIS_4_ESPECIES` |
| `LAC_10` | Gameplay | Rombos, curtos e reparos sem sensação contínua de estado | Loops sustentados (`EVT_AUD_07..09`) com *Voice Stealing* e *pitch* de progresso `0% -> 100%` |
| `LAC_11` | Música | Cortes secos ao vencer lutas, mudar fase da Draga ou encerrar *run* | `6 Stingers` quantizados em `1/4` (`EVT_AUD_10`) + `2 temas` fechados (`EVT_AUD_11`) |
| `LAC_12` | Loudness | Stems a `-16.0 LUFS` somados a SFX gerariam `-12 LUFS` fatigantes | Trim musical `-7.5 dB` (`-23.5 LUFS` em jogo) + janela deslizante *HDR Audio* de `8.0 dB` |
| `LAC_13` | Portáteis | Sub-grave `43.65..49.00 Hz` desaparece nos falantes do Steam Deck | Perfil `STEAM_DECK` (`-18.0 LUFS`, `LRA 8.0 LU`) injeta `2x/3x` harmônicos (`87.30..147.00 Hz`) |
| `LAC_14` | Persistência | `profile.json` não salvava preferências de áudio entre sessões | Bloco `preferenciasAudio` com `6 faders` logarítmicos em `profile.json` imune ao *Permadeath* |
| `LAC_15` | Acessibilidade | Surdez unilateral e jogo no mudo perdem leitura cega `8.5.C.3` | Chave `saidaMono` (`LR4` segura) + `legendasTaticasDirecionais` (`< / >`) auto-ativadas em `mudo` |
| `LAC_16` | Acessibilidade | Pings agudos contínuos incomodam jogadores com *tinnitus* | Modo `confortoAntiTinnitus` atenua ressonâncias estreitas (`Q > 8`) acima de `3200 Hz` |
| `LAC_17` | Empacotamento | *Pre-skip* (`312 amostras`) do codec `Opus` causa clique em `<audio loop>` | Manifesto `exactFrameCount` / `preSkipFrames` com *wrap* sample-accurate no Worklet (`< 48 MB` totais) |
| `LAC_18` | Comercial Steam | Falsos *strikes* de *Content-ID* em *lives* e oportunidade de DLC | Síntese própria `100% Streamer-Safe` (sem *Content-ID lock*) + flag `--render-steam-ost` (`12 faixas`) |

---

# CONTRA-AUDITORIA #10 (Verificação da Arquitetura de Áudio C++20/WASM e Paisagem Comercial Steam)

1. **Há risco do filtro subaquático de *Touchdown* ($400\text{ Hz}$) esconder os 8 Cues de Sobrevivência ou abafar erroneamente o interior pressurizado da Bionave?**
   * *Verificação:* A Tabela `10.3.A` e a `LEI_SFX_1_OCLUSAO_DIVIDIDA` impõem `20000 Hz` (*bypass* integral) em `BUS_0_SURVIVAL_CUES` e `BUS_4_UI`, mantendo também `BUS_2_INTERIOR_CABIN` em `14000 Hz` com *early reflections* internas. Além disso, o disparo de qualquer cue em `BUS_0` abre uma cavidade espectral cirúrgica (*Bell EQ* `-6.5 dB` em `950 Hz`) sem derrubar a energia fundamental de `45 Hz` do sub-grave.
2. **A memória RAM e o tamanho de disco permanecem viáveis em máquinas modestas e no Steam Deck?**
   * *Verificação:* Sem gerenciamento, $101 \times 15\text{ s} \times 48000\text{ Hz} \times 2 \times 4\text{ bytes} = 581\,760\,000\text{ bytes}$ ($\approx 554.8\text{ MiB} / 581.76\text{ MB}$ decimais). Com o Pool LRU por Zona Acústica (`LAC_02`), a RAM residente fica travada em $\le 64\text{ MB}$, e o pacote em disco com `Ogg Opus 192 kbps` + manifesto `exactFrameCount` (`LAC_17`) fica abaixo de $48\text{ MB}$.
3. **O que este documento especifica vs. o que permanece na fila de implementação de produto (`Lei N2` e `Lei N6`)?**
   * *Limites declarados:* Nesta onda documental e de portões (`Lei N6`), todas as equações, tabelas SSOT, parsers e oráculos de referência rodam de verdade no portão `tests/10-portao-audio-cpp20-steam.test.mjs`, enquanto as `8` integrações pendentes no código de produto (`CSP WASM`, `preferenciasAudio` em `persistencia-perfil.mjs`, binário `libbiofoil_audio_rt.wasm`, Pool LRU, Auto-Pausa `Alt-Tab`, novos gatilhos `EVT_AUD_01..11`, perfis `STEAM_DECK/NOTURNO` e legendas `XAG 104`) ficam monitoradas ao vivo pela **Lista-Catraca (`Lei N2`)** até a sessão dedicada de implementação.
   * *Resultado:* Especificação acústica consistente entre os 10 volumes canônicos, auditada matematicamente e protegida por mutações semânticas reais (`L6`).
