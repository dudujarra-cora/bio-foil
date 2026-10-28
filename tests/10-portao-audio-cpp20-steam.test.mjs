import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  carregarCadeiaCanonicaGdd,
  extrairTripulacaoVolume01,
  extrairCatalogoVolume05,
  extrairChefeEBestiarioVolume05,
  extrairSsotEMatrizDoVolume06,
  extrairComandosPersistenciaOnda6Volume08,
  extrairEnumsCanonicosVolume08,
  extrairConsolidacaoVolume09,
  extrairArquiteturaAudioVolume10,
} from '../src/gdd-parser.mjs';

import {
  calcularOrcamentoRamPcmAudioLru,
  avaliarDiretorMusicalSchmitt,
  converterSliderAudioParaGanhoDbELinear,
  calcularMixagemPlataformaHdrAudio,
  resolverRoteamentoOclusao6Barramentos,
  calcularWrapLoopSampleAccurate,
  auditarPoliticaCspAudioWasm,
  mesclarPreferenciasAudioNoPerfilImunePermadeath,
  transicionarFaseCicloPartida,
} from '../src/oraculos-referencia.mjs';

import { criarEstadoInicialPartida } from '../src/onda1-fisica/estado-inicial.mjs';
import { iniciarServidorClienteWebBiofoil } from '../src/onda6-ui/cliente-web.mjs';
import { criarPerfilInicial } from '../src/onda6-ui/persistencia-perfil.mjs';
import { projetarViewModelWireframe } from '../src/onda6-ui/presenter-wireframe.mjs';
import { construirPaisagemSonoraCompleta } from '../src/onda6-ui/audio-maritimo.mjs';
import { criarMotorAudioMaritimoCliente } from '../src/onda6-ui/sintetizador-webaudio-cliente.mjs';

const DIRETORIO_RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Lei N2 + Lei N6: Lista-Catraca da Onda de Implementação de Áudio Comercial C++20/WASM & Steam.
 * Cada sonda roda os módulos REAIS de src/ (Zero Mock — Lei L1) e comprova que a lacuna mapeada
 * no Volume 10 ainda aguarda codificação na sessão de produto. Assim que uma peça for implementada,
 * o portão acusa imediatamente [N2 CATRACA] exigindo promoção a asserção definitiva.
 */
export const LISTA_CATRACA_AUDIO_CPP20 = Object.freeze([
  Object.freeze({
    id: 'CAT-AUD-01',
    data: '2026-10-27',
    frase: 'LAC_01: CSP HTTP de cliente-web.mjs ainda bloqueia wasm-unsafe-eval e worker-src do AudioWorklet',
    verificarFalha: async () => {
      const srv = await iniciarServidorClienteWebBiofoil({ host: '127.0.0.1', port: 0 });
      try {
        const resp = await fetch(`${srv.url}/`);
        const csp = resp.headers.get('content-security-policy') ?? '';
        const diag = auditarPoliticaCspAudioWasm(csp);
        return diag.status !== 'CSP_APTA_WASM_WORKLET';
      } finally {
        await srv.fechar();
      }
    },
  }),
  Object.freeze({
    id: 'CAT-AUD-02',
    data: '2026-10-27',
    frase: 'LAC_14: criarPerfilInicial() em persistencia-perfil.mjs ainda não grava preferenciasAudio (6 faders dB)',
    verificarFalha: async () => {
      const perfil = criarPerfilInicial();
      return !perfil.preferenciasAudio || typeof perfil.preferenciasAudio.alertasUi !== 'number';
    },
  }),
  Object.freeze({
    id: 'CAT-AUD-03',
    data: '2026-10-27',
    frase: 'LAC_03/LAC_06: binário libbiofoil_audio_rt.wasm e processador AudioWorklet C++20 ainda não empacotados',
    verificarFalha: async () => {
      const wasmExiste = fs.existsSync(
        path.join(DIRETORIO_RAIZ, 'src', 'onda6-ui', 'libbiofoil_audio_rt.wasm')
      );
      return !wasmExiste;
    },
  }),
  Object.freeze({
    id: 'CAT-AUD-04',
    data: '2026-10-27',
    frase: 'LAC_02/LAC_17: Pool LRU <= 64 MB e manifesto exactFrameCount/preSkipFrames ainda não integrados ao runtime',
    verificarFalha: async () => {
      const motor = criarMotorAudioMaritimoCliente();
      return typeof motor.obterTelemetriaCacheLruMb !== 'function';
    },
  }),
  Object.freeze({
    id: 'CAT-AUD-05',
    data: '2026-10-27',
    frase: 'LAC_05: runtime-navegador.mjs ainda não registra visibilitychange para Auto-Pausa no Alt-Tab e silenciarSemFoco',
    verificarFalha: async () => {
      const codigoRuntime = fs.readFileSync(
        path.join(DIRETORIO_RAIZ, 'src', 'onda6-ui', 'runtime-navegador.mjs'),
        'utf8'
      );
      return !codigoRuntime.includes('visibilitychange');
    },
  }),
  Object.freeze({
    id: 'CAT-AUD-06',
    data: '2026-10-27',
    frase: 'LAC_07..LAC_11: audio-maritimo.mjs ainda não emite EVT_AUD_01..11 (Arma Pronta, Salva, Fuga, Morte, Loops e Stingers)',
    verificarFalha: async () => {
      const est = criarEstadoInicialPartida('seed-catraca-aud-06', 'CARCACA_ALFA');
      const paisagem = construirPaisagemSonoraCompleta(est, est, null);
      return !Array.isArray(paisagem.eventosComplementaresVol10);
    },
  }),
  Object.freeze({
    id: 'CAT-AUD-07',
    data: '2026-10-27',
    frase: 'LAC_12/LAC_13/LAC_16: sintetizador-webaudio-cliente.mjs ainda não expõe perfis ESTUDIO/STEAM_DECK/NOTURNO, saidaMono e confortoAntiTinnitus',
    verificarFalha: async () => {
      const motor = criarMotorAudioMaritimoCliente();
      return (
        typeof motor.definirPerfilAcustico !== 'function' ||
        typeof motor.definirSaidaMono !== 'function' ||
        typeof motor.definirConfortoAntiTinnitus !== 'function'
      );
    },
  }),
  Object.freeze({
    id: 'CAT-AUD-08',
    data: '2026-10-27',
    frase: 'LAC_15: projetarViewModelWireframe ainda não projeta legendasTaticasDirecionais (< / >) XAG 104 no HUD 960x540',
    verificarFalha: async () => {
      const est = criarEstadoInicialPartida('seed-catraca-aud-08', 'CARCACA_ALFA');
      const vm = projetarViewModelWireframe(est);
      return !Array.isArray(vm.legendasTaticasDirecionais);
    },
  }),
]);

test('Portão Vol. 10 (L4 + L5 + N4): extrai e valida integralmente os 6 Gêneros, 2 Camadas C++20, 6 Barramentos, 3 Leis, 11 Eventos, 3 Perfis, 6 Faders e 18 Lacunas Steam', () => {
  const cadeia = carregarCadeiaCanonicaGdd(DIRETORIO_RAIZ);
  const vol10Texto = cadeia.volumes[9].conteudo;
  const arqAudio = extrairArquiteturaAudioVolume10(vol10Texto);

  console.log(
    `[N4] Vol. 10 examinado: ${arqAudio.generos.length} gêneros, ${arqAudio.camadasCpp20.length} camadas C++20, ${arqAudio.barramentos.length} barramentos, ${arqAudio.leisSfxVo.length} leis SFX/VO, ${arqAudio.eventosComplementares.length} eventos complementares, ${arqAudio.perfisAcusticos.length} perfis acústicos, ${arqAudio.lacunasSteam.length} lacunas Steam`
  );

  assert.ok(arqAudio.generos.length > 0, '[N4] Zero gêneros examinados deve reprovar');
  assert.equal(arqAudio.generos.length, 6, '[Vol. 10] Seção 10.1 deve declarar exatamente os 6 gêneros procedurais (G0..G5)');
  assert.equal(arqAudio.camadasCpp20.length, 2, '[Vol. 10] Seção 10.2 deve declarar exatamente as 2 camadas C++20');
  assert.equal(arqAudio.barramentos.length, 6, '[Vol. 10] Seção 10.3 deve declarar exatamente os 6 barramentos (BUS_0..BUS_5)');
  assert.equal(arqAudio.leisSfxVo.length, 3, '[Vol. 10] Seção 10.3 deve travar exatamente as 3 leis de Foley/UI/VO');
  assert.equal(arqAudio.eventosComplementares.length, 11, '[Vol. 10] Seção 10.4 deve declarar exatamente os 11 eventos complementares (EVT_AUD_01..11)');
  assert.equal(arqAudio.perfisAcusticos.length, 3, '[Vol. 10] Seção 10.5 deve declarar exatamente os 3 perfis acústicos (ESTUDIO, STEAM_DECK, NOTURNO)');
  assert.equal(arqAudio.lacunasSteam.length, 18, '[Vol. 10] Seção 10.5 deve fechar exatamente as 18 lacunas comerciais Steam (LAC_01..LAC_18)');

  // Validação literal independente L4 das invariantes rítmicas, espectrais e modais (Seção 10.1)
  const pm = arqAudio.parametrosMusicais;
  assert.equal(pm.swingMinPct, 55, '[Vol. 10 L4] Swing mínimo deve ser 55%');
  assert.equal(pm.swingMaxPct, 58, '[Vol. 10 L4] Swing máximo deve ser 58%');
  assert.equal(pm.subMinHz, 43.65, '[Vol. 10 L4] Sub-grave mínimo deve ser F1 = 43.65 Hz');
  assert.equal(pm.subMaxHz, 49.0, '[Vol. 10 L4] Sub-grave máximo deve ser G1 = 49.00 Hz');
  assert.equal(pm.correlacaoMonoSubMin, 0.99, '[Vol. 10 L4] Correlação mono mínima do sub LR4 deve ser 0.99');
  assert.equal(pm.schmittHistereseDelta, 0.08, '[Vol. 10 L4] Histerese de Schmitt do MusicalDirector deve ser ±0.08');
  assert.equal(pm.holdMinimoCompassos, 8, '[Vol. 10 L4] Retenção mínima antes de de-escalar deve ser 8 compassos');
  assert.equal(pm.corteRaveMinBpm, 142, '[Vol. 10 L4] Faixa proibida de rave deve iniciar em 142 BPM');
  assert.equal(pm.corteRaveMaxBpm, 155, '[Vol. 10 L4] Faixa proibida de rave deve ir até 155 BPM');

  assert.deepEqual(
    pm.arcoModal,
    [
      { setorMin: 1, setorMax: 3, modo: 'G_DORICO', freqFundamentalHz: 49.0 },
      { setorMin: 4, setorMax: 6, modo: 'FS_FRIGIO', freqFundamentalHz: 46.25 },
      { setorMin: 7, setorMax: 8, modo: 'F_LOCRIO', freqFundamentalHz: 43.65 },
    ],
    '[Vol. 10 L4] Arco modal descendente S1..S8 deve descer G Dórico (49 Hz) -> F# Frígio (46.25 Hz) -> F Lócrio (43.65 Hz)'
  );

  // Nenhum gênero aprovado pode invadir a zona proibida de rave (142..155 BPM)
  for (const g of arqAudio.generos) {
    assert.ok(
      g.bpm < pm.corteRaveMinBpm,
      `[Vol. 10] Gênero ${g.id} (${g.bpm} BPM) invadiu a faixa proibida >= ${pm.corteRaveMinBpm} BPM`
    );
  }
  assert.deepEqual(
    arqAudio.generos.map((g) => [g.id, g.bpm, g.modoBase]),
    [
      ['G0_AMBIENT_DUB', 90, 'G_DORICO'],
      ['G1_DUB_TECHNO', 110, 'G_DORICO'],
      ['G2_SLOW_INDUSTRIAL', 110, 'FS_FRIGIO'],
      ['G3_BIO_MYSTIC_GROOVE', 125, 'G_DORICO'],
      ['G4_ACID_DRIVING', 128, 'FS_FRIGIO'],
      ['G5_INDUSTRIAL_HARDGROOVE', 137, 'F_LOCRIO'],
    ]
  );

  // Camadas C++20 Dual-Layer (Seção 10.2)
  assert.equal(arqAudio.camadasCpp20[0].id, 'CAMADA_1_FORJA_OFFLINE');
  assert.match(arqAudio.camadasCpp20[0].orcamentoCritico, /SEAM_DELTA_MAX = 0\.000000/);
  assert.match(arqAudio.camadasCpp20[0].orcamentoCritico, /-16\.0 LUFS/);
  assert.equal(arqAudio.camadasCpp20[1].id, 'CAMADA_2_RUNTIME_WASM');
  assert.match(arqAudio.camadasCpp20[1].orcamentoCritico, /0 malloc/);
  assert.match(arqAudio.camadasCpp20[1].orcamentoCritico, /64 bytes/);

  // 6 Barramentos, prioridades 0..5 sem lacunas e bypass estrito em BUS_0 e BUS_4 (Seção 10.3)
  assert.equal(
    arqAudio.barramentos[1].corteSubmersoHz,
    400,
    '[Vol. 10] BUS_1_MUSIC submerso deve cortar exatamente em 400 Hz (paridade Seção 8.5.C)'
  );
  assert.deepEqual(
    arqAudio.barramentos.map((b) => [b.id, b.prioridade, b.trimNominalDb, b.corteNoFoilHz, b.corteSubmersoHz]),
    [
      ['BUS_0_SURVIVAL_CUES', 0, 0.0, 20000, 20000],
      ['BUS_1_MUSIC', 1, -7.5, 20000, 400],
      ['BUS_2_INTERIOR_CABIN', 2, -3.0, 20000, 14000],
      ['BUS_3_EXTERIOR_SEA', 3, -2.5, 18000, 380],
      ['BUS_4_UI', 4, -4.0, 20000, 20000],
      ['BUS_5_HYDRO_BED', 5, -9.0, 16000, 420],
    ]
  );
  assert.deepEqual(
    arqAudio.leisSfxVo.map((l) => l.id),
    [
      'LEI_SFX_1_OCLUSAO_DIVIDIDA',
      'LEI_SFX_2_ZERO_REUSO_ARMA_UI',
      'LEI_SFX_3_ZERO_VOZ_HUMANA_FALADA',
    ]
  );

  // 3 Perfis acústicos e contrato JSON preferenciasAudio (Seção 10.5)
  assert.deepEqual(
    arqAudio.perfisAcusticos.map((p) => [p.id, p.alvoLufs, p.lraMaxLu, p.truePeakMaxDbtp]),
    [
      ['ESTUDIO', -23.0, 14.0, -1.0],
      ['STEAM_DECK', -18.0, 8.0, -1.0],
      ['NOTURNO', -24.0, 5.0, -2.0],
    ]
  );
  const pref = arqAudio.preferenciasAudioPadrao;
  assert.deepEqual(
    [
      pref.master,
      pref.musica,
      pref.sfxCombate,
      pref.cabineTripulacao,
      pref.ambienteMaritimo,
      pref.alertasUi,
    ],
    [85, 80, 90, 85, 75, 100],
    '[Vol. 10] preferenciasAudio deve declarar os 6 faders independentes canônicos'
  );
  assert.equal(pref.perfilDinamico, 'ESTUDIO');
  assert.equal(pref.saidaMono, false);
  assert.equal(pref.silenciarSemFoco, true);
  assert.equal(pref.legendasTaticasDirecionais, 'ALERTAS_CRITICOS');
  assert.equal(pref.confortoAntiTinnitus, false);

  // Sequência estrita LAC_01..LAC_18 e Contra-Auditoria #10 sem promessa enganosa "100% fechado"
  arqAudio.lacunasSteam.forEach((lac, idx) => {
    const esperado = `LAC_${String(idx + 1).padStart(2, '0')}`;
    assert.equal(lac.codigo, esperado, `[Vol. 10] Lacuna fora de sequência: ${lac.codigo}`);
  });
  assert.equal(arqAudio.temContraAuditoria10Completa, true, '[Vol. 10] Contra-Auditoria #10 deve conter os 3 itens de verificação');
  assert.equal(/100\\?%\$? fechado/.test(vol10Texto), false, '[Vol. 10] Contra-Auditoria #10 não pode alegar "100% fechado"');
});

test('Junção Transversal N1: cruza o Volume 10 contra Volumes 01, 05, 06, 08 e 09 (Espécies, Armas, Draga, 8 Cues, Matriz 5x8 e Permadeath)', () => {
  const cadeia = carregarCadeiaCanonicaGdd(DIRETORIO_RAIZ);
  const tripVol01 = extrairTripulacaoVolume01(cadeia.volumes[0].conteudo);
  const catVol05 = extrairCatalogoVolume05(cadeia.volumes[4].conteudo);
  const chefeVol05 = extrairChefeEBestiarioVolume05(cadeia.volumes[4].conteudo);
  const matrizVol06 = extrairSsotEMatrizDoVolume06(cadeia.volumes[5].conteudo);
  const enumsVol08 = extrairEnumsCanonicosVolume08(cadeia.volumes[7].conteudo);
  const especOnda6 = extrairComandosPersistenciaOnda6Volume08(cadeia.volumes[7].conteudo);
  const consolVol09 = extrairConsolidacaoVolume09(cadeia.volumes[8].conteudo);
  const arqAudio = extrairArquiteturaAudioVolume10(cadeia.volumes[9].conteudo);

  const fasesValidas = new Set(enumsVol08['meta.faseJogo']);
  let fasesCruzadas = 0;
  for (const g of arqAudio.generos) {
    for (const f of g.fasesPermitidas) {
      assert.equal(fasesValidas.has(f), true, `[N1 Vol.10 x Vol.08] Fase "${f}" do gênero ${g.id} não existe em meta.faseJogo`);
      fasesCruzadas += 1;
    }
  }

  // O corte submerso de BUS_1_MUSIC (400 Hz) deve coincidir exatamente com o filtro subaquático da Seção 8.5.C (Vol. 08)
  const busMusica = arqAudio.barramentos.find((b) => b.id === 'BUS_1_MUSIC');
  assert.equal(
    busMusica.corteSubmersoHz,
    especOnda6.targetVisual.filtroSubaquaticoHz,
    '[N1 Vol.10 x Vol.08] Corte submerso de BUS_1_MUSIC diverge do filtroSubaquaticoHz (400 Hz) da Seção 8.5.C'
  );
  assert.equal(especOnda6.cuesSonoros.length, 8, '[N1 Vol.08] Seção 8.5.C.3 deve manter os 8 Cues Obrigatórios');

  // Todos os barramentos referenciados nos 11 eventos complementares existem na Tabela 10.3.A
  const idsBarramentos = new Set(arqAudio.barramentos.map((b) => b.id));
  for (const ev of arqAudio.eventosComplementares) {
    assert.equal(
      idsBarramentos.has(ev.barramento),
      true,
      `[N1 Vol.10] Evento ${ev.id} aponta para barramento inexistente "${ev.barramento}"`
    );
  }

  // Cruzamento quantitativo N1 com Vol. 01 (4 espécies), Vol. 05 (7 armas, 3 fases Draga) e Vol. 08 (5 carcaças)
  const evArmaPronta = arqAudio.eventosComplementares.find((e) => e.id === 'EVT_AUD_01_ARMA_PRONTA_SLOT');
  assert.match(evArmaPronta.parametroAcustico, new RegExp(`${catVol05.armas.length} armas`));

  const evEspeciais = arqAudio.eventosComplementares.find((e) => e.id === 'EVT_AUD_06_ESPECIAIS_4_ESPECIES');
  for (const esp of tripVol01.especies) {
    assert.equal(
      evEspeciais.parametroAcustico.includes(esp.especie),
      true,
      `[N1 Vol.10 x Vol.01] Espécie ${esp.especie} ausente em EVT_AUD_06_ESPECIAIS_4_ESPECIES`
    );
  }

  const evStingers = arqAudio.eventosComplementares.find((e) => e.id === 'EVT_AUD_10_SEIS_STINGERS_QUANTIZADOS');
  assert.equal(catVol05.fasesChefe.length, 3);
  assert.equal(Object.keys(chefeVol05.salasPorFase).length, 3);
  assert.match(evStingers.gatilho, new RegExp(`${especOnda6.carcacasPerfil.length} Carcaças`));

  // Cruzamento N1 com os 5 estados físicos da Matriz 6.2 (Vol. 06) e as 3 transições de Permadeath do Vol. 09
  const estadosMatriz = [...new Set(matrizVol06.celulasMatriz.map((c) => c.estado))];
  assert.equal(estadosMatriz.length, 5);
  for (const estadoFisico of estadosMatriz) {
    const rot = resolverRoteamentoOclusao6Barramentos({ estadoFisico, cueSobrevivenciaAtivo: true });
    assert.equal(
      rot.barramentos.BUS_0_SURVIVAL_CUES.corteLowPassHz,
      20000,
      `[N1 Vol.10 x Vol.06] BUS_0_SURVIVAL_CUES jamais pode sofrer oclusão em ${estadoFisico}`
    );
    assert.equal(
      rot.barramentos.BUS_4_UI.corteLowPassHz,
      20000,
      `[N1 Vol.10 x Vol.06] BUS_4_UI jamais pode sofrer oclusão em ${estadoFisico}`
    );
  }

  const transicoesPermadeath = ['TR_7A_DERROTA_EM_COMBATE', 'TR_7B_VITORIA_FINAL', 'TR_7C_DERROTA_EM_EVENTO'];
  const origensPorTr = {
    TR_7A_DERROTA_EM_COMBATE: 'COMBATE',
    TR_7B_VITORIA_FINAL: 'COMBATE',
    TR_7C_DERROTA_EM_EVENTO: 'EVENTO',
  };
  for (const trId of transicoesPermadeath) {
    const tr = transicionarFaseCicloPartida(consolVol09, origensPorTr[trId], trId);
    assert.equal(tr.apagaRunSavePermadeath, true);
    assert.equal(tr.preservaProfileJson, true);
    const perfilCustom = mesclarPreferenciasAudioNoPerfilImunePermadeath(
      criarPerfilInicial(),
      { musica: 42, perfilDinamico: 'STEAM_DECK', saidaMono: true },
      trId
    );
    assert.equal(perfilCustom.telemetriaAcessibilidadeAudio.runSaveApagadoPermadeath, true);
    assert.equal(perfilCustom.preferenciasAudio.musica, 42, `[N1 Permadeath] ${trId} perdeu preferenciasAudio.musica`);
    assert.equal(perfilCustom.preferenciasAudio.perfilDinamico, 'STEAM_DECK');
    assert.equal(perfilCustom.preferenciasAudio.saidaMono, true);
  }

  console.log(
    `[N4] Cruzamentos N1 validados: ${fasesCruzadas} vínculos gênero-fase, ${estadosMatriz.length} estados físicos x 6 barramentos, ${transicoesPermadeath.length} transições Permadeath`
  );
});

test('Oráculos Acústicos C++20/DSP (L1 + L2 + L3 + L4): Memória LRU 64 MB, Histerese Schmitt, 6 Barramentos, HDR/Steam Deck, Loop Sample-Accurate e CSP', () => {
  // 1. LAC_02: Bomba de 581.76 MB vs. Pool LRU <= 64 MB com canal explícito L3
  const lruPadrao = calcularOrcamentoRamPcmAudioLru({
    totalStemsCatalogo: 101,
    duracaoMediaSeg: 15,
    sampleRateHz: 48000,
    canais: 2,
    stemsZonaAtiva: 5,
    stemsProximaZona: 3,
    bytesOneShotsFixos: 8_000_000,
    tetoOrcamentoMb: 64,
  });
  assert.equal(Object.isFrozen(lruPadrao), true, '[L2] Retorno de calcularOrcamentoRamPcmAudioLru deve ser congelado');
  assert.equal(
    lruPadrao.ramCatalogoCompletoBytes,
    581_760_000,
    '[LAC_02] 101 stems Float32 (4 bytes) a 48 kHz consomem exatos 581.760.000 bytes de RAM PCM'
  );
  assert.equal(lruPadrao.ramCatalogoCompletoMb, 581.76);
  assert.equal(lruPadrao.ramResidenteLruMb, 54.08);
  assert.equal(lruPadrao.statusOrcamento, 'DENTRO_ORCAMENTO_LRU');

  const lruEstourado = calcularOrcamentoRamPcmAudioLru({
    totalStemsCatalogo: 101,
    stemsZonaAtiva: 12,
    stemsProximaZona: 8,
    tetoOrcamentoMb: 64,
  });
  assert.equal(lruEstourado.statusOrcamento, 'ESTOURO_ORCAMENTO_LRU');

  // 2. Histerese de Schmitt (±0.08) + Hold de 8 compassos no MusicalDirector
  const zonaMorta = avaliarDiretorMusicalSchmitt({
    generoAtual: 'G3_BIO_MYSTIC_GROOVE',
    generoSubida: 'G4_ACID_DRIVING',
    generoDescida: 'G1_DUB_TECHNO',
    tensaoAtual0a1: 0.56,
    limiarTransicao0a1: 0.5,
    histereseDelta: 0.08,
    compassosNoEstadoAtual: 12,
  });
  assert.equal(zonaMorta.trocouGenero, false);
  assert.equal(zonaMorta.motivoTransicao, 'MANTIDO_ZONA_MORTA_SCHMITT');

  const subida = avaliarDiretorMusicalSchmitt({
    generoAtual: 'G3_BIO_MYSTIC_GROOVE',
    generoSubida: 'G4_ACID_DRIVING',
    generoDescida: 'G1_DUB_TECHNO',
    tensaoAtual0a1: 0.58,
    limiarTransicao0a1: 0.5,
    histereseDelta: 0.08,
    compassosNoEstadoAtual: 2,
  });
  assert.equal(subida.generoResultante, 'G4_ACID_DRIVING');
  assert.equal(subida.motivoTransicao, 'ESCALADA_ACIMA_SCHMITT');

  const bloqueioHold = avaliarDiretorMusicalSchmitt({
    generoAtual: 'G4_ACID_DRIVING',
    generoSubida: 'G5_INDUSTRIAL_HARDGROOVE',
    generoDescida: 'G3_BIO_MYSTIC_GROOVE',
    tensaoAtual0a1: 0.35,
    limiarTransicao0a1: 0.5,
    histereseDelta: 0.08,
    compassosNoEstadoAtual: 7,
    holdMinimoCompassos: 8,
  });
  assert.equal(
    bloqueioHold.trocouGenero,
    false,
    '[MusicalDirector] De-escalada antes de 8 compassos deve ser bloqueada contra thrashing'
  );
  assert.equal(bloqueioHold.motivoTransicao, 'BLOQUEADO_HOLD_MINIMO_COMPASSOS');

  const descidaAposHold = avaliarDiretorMusicalSchmitt({
    generoAtual: 'G4_ACID_DRIVING',
    generoSubida: 'G5_INDUSTRIAL_HARDGROOVE',
    generoDescida: 'G3_BIO_MYSTIC_GROOVE',
    tensaoAtual0a1: 0.35,
    limiarTransicao0a1: 0.5,
    histereseDelta: 0.08,
    compassosNoEstadoAtual: 8,
    holdMinimoCompassos: 8,
  });
  assert.equal(descidaAposHold.generoResultante, 'G3_BIO_MYSTIC_GROOVE');
  assert.equal(descidaAposHold.motivoTransicao, 'DE_ESCALADA_APOS_HOLD');

  const overrideChefe = avaliarDiretorMusicalSchmitt({
    generoAtual: 'G1_DUB_TECHNO',
    tensaoAtual0a1: 0.1,
    compassosNoEstadoAtual: 1,
    overrideImediatoGenero: 'G5_INDUSTRIAL_HARDGROOVE',
  });
  assert.equal(overrideChefe.generoResultante, 'G5_INDUSTRIAL_HARDGROOVE');
  assert.equal(overrideChefe.motivoTransicao, 'OVERRIDE_IMEDIATO_PRIORITARIO');

  // 3. Curva logarítmica dB dos 6 sliders + aviso L3 para alertasUi < 20%
  const slZero = converterSliderAudioParaGanhoDbELinear(0, 'alertasUi');
  assert.equal(slZero.ganhoDb, -Infinity);
  assert.equal(slZero.ganhoLinear, 0);
  assert.equal(
    slZero.avisoSeguranca,
    'ALERTA_SOBREVIVENCIA_ABAIXO_20PCT',
    '[L3] Slider alertasUi abaixo de 20% deve emitir alerta explícito de segurança'
  );

  const slMeio = converterSliderAudioParaGanhoDbELinear(50, 'musica');
  assert.equal(slMeio.ganhoDb, -30);
  assert.equal(slMeio.ganhoLinear, 0.031623);
  assert.equal(slMeio.avisoSeguranca, 'NIVEL_SEGURO');

  const slCheio = converterSliderAudioParaGanhoDbELinear(100, 'alertasUi');
  assert.equal(slCheio.ganhoDb, 0);
  assert.equal(slCheio.ganhoLinear, 1);

  // 4. Mixagem HDR Audio (-23.5 LUFS em jogo) + Harmônicos 2x/3x no Steam Deck + High-Pass 65 Hz no Noturno
  const hdrEstudio = calcularMixagemPlataformaHdrAudio({
    stemMusicaLufs: -16.0,
    trimMusicaDb: -7.5,
    picoTransienteBus0Db: 0.0,
    nivelEntradaBus5Db: -5.0,
    janelaHdrDb: 8.0,
    perfilDinamico: 'ESTUDIO',
    freqSubFundamentalHz: 43.65,
  });
  assert.equal(hdrEstudio.loudnessMusicaEmJogoLufs, -23.5);
  assert.equal(hdrEstudio.alvoIntegradoLufs, -23.0);
  assert.equal(hdrEstudio.reducaoHdrBus5Db, 3.0);
  assert.deepEqual(hdrEstudio.harmonicosFundamentalAusenteHz, []);
  assert.equal(hdrEstudio.highPassSaidaHz, 20);

  const hdrDeck = calcularMixagemPlataformaHdrAudio({
    perfilDinamico: 'STEAM_DECK',
    freqSubFundamentalHz: 43.65,
  });
  assert.equal(hdrDeck.alvoIntegradoLufs, -18.0);
  assert.equal(hdrDeck.lraMaxLu, 8.0);
  assert.deepEqual(
    hdrDeck.harmonicosFundamentalAusenteHz,
    [87.3, 130.95],
    '[LAC_13] Perfil STEAM_DECK deve injetar 2x e 3x harmônicos (87.30 e 130.95 Hz) de fundamental ausente'
  );

  const hdrNoturno = calcularMixagemPlataformaHdrAudio({ perfilDinamico: 'NOTURNO' });
  assert.equal(hdrNoturno.alvoIntegradoLufs, -24.0);
  assert.equal(hdrNoturno.lraMaxLu, 5.0);
  assert.equal(hdrNoturno.truePeakMaxDbtp, -2.0);
  assert.equal(hdrNoturno.highPassSaidaHz, 65);

  // 5. Oclusão dividida dos 6 barramentos + Spool-up exponencial + Anti-Tinnitus (3200 Hz)
  const rotTd = resolverRoteamentoOclusao6Barramentos({
    estadoFisico: '2_TOUCHDOWN',
    cueSobrevivenciaAtivo: true,
    confortoAntiTinnitus: true,
  });
  assert.equal(rotTd.tetoNotchTinnitusHz, 3200);
  assert.equal(rotTd.barramentos.BUS_0_SURVIVAL_CUES.corteLowPassHz, 20000);
  assert.equal(rotTd.barramentos.BUS_1_MUSIC.corteLowPassHz, 400);
  assert.equal(rotTd.barramentos.BUS_1_MUSIC.duckingBell950HzDb, -6.5);
  assert.equal(rotTd.barramentos.BUS_1_MUSIC.ganhoSub45HzDb, 0.0);
  assert.equal(rotTd.barramentos.BUS_2_INTERIOR_CABIN.corteLowPassHz, 14000);
  assert.equal(rotTd.barramentos.BUS_2_INTERIOR_CABIN.earlyReflectionsCascoAtivas, true);
  assert.equal(rotTd.barramentos.BUS_3_EXTERIOR_SEA.corteLowPassHz, 380);
  assert.equal(rotTd.barramentos.BUS_4_UI.corteLowPassHz, 20000);
  assert.equal(rotTd.barramentos.BUS_5_HYDRO_BED.corteLowPassHz, 420);

  const rotSpoolMeio = resolverRoteamentoOclusao6Barramentos({
    estadoFisico: '3_SPOOL_UP',
    progressoSpoolUp0a1: 0.5,
  });
  assert.equal(rotSpoolMeio.barramentos.BUS_1_MUSIC.corteLowPassHz, 2828);

  const rotFurtivoAr = resolverRoteamentoOclusao6Barramentos({
    estadoFisico: '4_FURTIVO_AR',
    pausaTaticaAtiva: false,
  });
  assert.equal(rotFurtivoAr.barramentos.BUS_1_MUSIC.corteLowPassHz, 7200);

  const rotPausa = resolverRoteamentoOclusao6Barramentos({
    estadoFisico: '1_NO_FOIL',
    pausaTaticaAtiva: true,
  });
  assert.equal(rotPausa.barramentos.BUS_1_MUSIC.corteLowPassHz, 900);

  // 6. Loop sample-accurate compensando preSkipFrames = 312 (Opus) e quantização de Stinger em 44.1 / 48 / 96 kHz
  const wrapOpus = calcularWrapLoopSampleAccurate({
    indiceAmostraGlobal: 368_645,
    exactFrameCount: 368_640,
    preSkipFrames: 312,
    seamDeltaMedido: 0.0,
    bpm: 125,
    sampleRateHz: 48000,
  });
  assert.equal(wrapOpus.offsetUtil, 5);
  assert.equal(
    wrapOpus.frameBufferDecodificado,
    317,
    '[LAC_17] Wrap sample-accurate deve somar preSkipFrames (312) do codec Opus evitando clique'
  );
  assert.equal(wrapOpus.loopSemClique, true);
  assert.equal(wrapOpus.amostrasPorQuartoCompasso, 23040);
  assert.equal(wrapOpus.proximoDisparoStingerFrame, 391680);

  const wrapClique = calcularWrapLoopSampleAccurate({
    indiceAmostraGlobal: 0,
    exactFrameCount: 48000,
    seamDeltaMedido: 0.015,
    bpm: 120,
    sampleRateHz: 44100,
  });
  assert.equal(wrapClique.loopSemClique, false);
  assert.equal(wrapClique.amostrasPorQuartoCompasso, 22050);

  // 7. Auditoria L3 de CSP e imutabilidade L2 + auto-ativação XAG 104 no mudo
  assert.equal(
    auditarPoliticaCspAudioWasm("default-src 'none'; script-src 'self'").status,
    'BLOQUEIO_WASM_UNSAFE_EVAL'
  );
  assert.equal(
    auditarPoliticaCspAudioWasm("default-src 'none'; script-src 'self' 'wasm-unsafe-eval'").status,
    'BLOQUEIO_WORKER_SRC',
    '[LAC_01 / L3] CSP sem worker-src self deve acusar BLOQUEIO_WORKER_SRC explícito'
  );
  assert.equal(
    auditarPoliticaCspAudioWasm(
      "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'"
    ).status,
    'CSP_APTA_WASM_WORKLET'
  );

  const perfilEntrada = criarPerfilInicial();
  const perfilMudo = mesclarPreferenciasAudioNoPerfilImunePermadeath(perfilEntrada, {
    mudo: true,
    legendasTaticasDirecionais: 'DESLIGADO',
  });
  assert.equal(Object.isFrozen(perfilMudo), true);
  assert.equal('preferenciasAudio' in perfilEntrada, false, '[L2] Perfil de entrada jamais pode ser mutado in-place');
  assert.equal(
    perfilMudo.telemetriaAcessibilidadeAudio.legendasEfetivas,
    'ALERTAS_CRITICOS',
    '[XAG 104] Silenciar o jogo com legendas desligadas deve auto-ativar ALERTAS_CRITICOS'
  );

  console.log('[N4] Oráculos acústicos executados e verificados: 8 funções puras + 3 perfis + 6 barramentos');
});

test('Leis N2 + N6 + Guardas de Erro: executa as 8 sondas reais da Lista-Catraca contra src/ e cobre guardas defensivas', async () => {
  console.log(`[N4] Sondas reais na LISTA_CATRACA_AUDIO_CPP20 examinadas: ${LISTA_CATRACA_AUDIO_CPP20.length}`);
  assert.equal(LISTA_CATRACA_AUDIO_CPP20.length, 8, 'Devem existir exatamente 8 sondas reais na catraca da Onda de Áudio');

  for (const item of LISTA_CATRACA_AUDIO_CPP20) {
    assert.ok(item.id && item.data && item.frase, 'Item da catraca exige id, data e frase');
    const aindaFalha = await item.verificarFalha();
    assert.equal(
      aindaFalha,
      true,
      `[N2 CATRACA] O item ${item.id} (${item.frase}) passou a verde! Promova para asserção definitiva e remova da LISTA_CATRACA_AUDIO_CPP20.`
    );
  }

  // Cobertura explícita dos ramos de erro defensivo das funções novas (100% cobertura funcional)
  assert.throws(
    () => extrairArquiteturaAudioVolume10('## 10.5. Sem json'),
    /Bloco JSON de preferenciasAudio não encontrado/
  );
  assert.throws(() => calcularOrcamentoRamPcmAudioLru({ totalStemsCatalogo: 0 }), /estritamente positivos/);
  assert.throws(() => avaliarDiretorMusicalSchmitt({ generoAtual: '' }), /generoAtual obrigatório/);
  assert.throws(() => converterSliderAudioParaGanhoDbELinear(105, 'master'), /fora de 0\.\.100/);
  assert.throws(() => calcularMixagemPlataformaHdrAudio({ perfilDinamico: 'INEXISTENTE' }), /Perfil acústico desconhecido/);
  assert.throws(
    () => resolverRoteamentoOclusao6Barramentos({ estadoFisico: 'ESTADO_FANTASMA' }),
    /Estado físico inválido/
  );
  assert.throws(
    () => calcularWrapLoopSampleAccurate({ indiceAmostraGlobal: 0, exactFrameCount: 48000, sampleRateHz: 8000 }),
    /fora dos limites acústicos/
  );
  assert.throws(
    () => mesclarPreferenciasAudioNoPerfilImunePermadeath(criarPerfilInicial(), { master: 'nao-numero' }),
    /Slider inválido/
  );
});
