import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  clonarProfundoCongelado,
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
import {
  PREFERENCIAS_AUDIO_CANONICAS_VOL10,
  criarPerfilInicial,
  atualizarPerfilComMetricasRun,
  salvarPerfilDisco,
  carregarPerfilDisco,
  salvarRunSaveDisco,
  carregarRunSaveDisco,
  apagarRunSavePermadeathDisco,
} from '../src/onda6-ui/persistencia-perfil.mjs';
import { projetarViewModelWireframe } from '../src/onda6-ui/presenter-wireframe.mjs';
import {
  extrairSfxMulticamadaDoTick,
  construirPaisagemSonoraCompleta,
} from '../src/onda6-ui/audio-maritimo.mjs';
import { criarMotorAudioMaritimoCliente } from '../src/onda6-ui/sintetizador-webaudio-cliente.mjs';
import { iniciarRuntimeDomBiofoil } from '../src/onda6-ui/runtime-navegador.mjs';
import { rasterizarQuadroRgba960x540 } from '../src/onda6-ui/renderizador-canvas.mjs';
import { obterAssetsConceitoHiBit, obterTabelasRasterUnificado } from '../src/onda6-ui/assets-hibit.mjs';
import { obterMapaHitboxesNativo } from '../src/onda6-ui/hitboxes-layout.mjs';
import { criarMotorAudioOggFoleySteam } from '../src/onda7-steam/motor-audio-ogg-foley.mjs';

const DIRETORIO_RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Lei N2 + Lei N6: Lista-Catraca da Onda de Implementação de Áudio Comercial C++20/WASM & Steam.
 * Todas as 8 pendências (CAT-AUD-01..08) foram implementadas no produto e promovidas a asserções
 * permanentes Zero Mock abaixo; a catraca permanece vazia e vigiada contra regressão.
 */
export const LISTA_CATRACA_AUDIO_CPP20 = Object.freeze([]);

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

  const perfilLegadoSemAudio = Object.freeze({ versaoPerfil: '0.9.0' });
  const perfilEntrada = criarPerfilInicial();
  const perfilMudo = mesclarPreferenciasAudioNoPerfilImunePermadeath(perfilLegadoSemAudio, {
    mudo: true,
    legendasTaticasDirecionais: 'DESLIGADO',
  });
  assert.equal(Object.isFrozen(perfilMudo), true);
  assert.equal('preferenciasAudio' in perfilLegadoSemAudio, false, '[L2] Perfil de entrada jamais pode ser mutado in-place');
  assert.equal(perfilEntrada.preferenciasAudio.mudo, false, '[L2] criarPerfilInicial jamais pode nascer mudo');
  assert.equal(
    perfilMudo.telemetriaAcessibilidadeAudio.legendasEfetivas,
    'ALERTAS_CRITICOS',
    '[XAG 104] Silenciar o jogo com legendas desligadas deve auto-ativar ALERTAS_CRITICOS'
  );

  console.log('[N4] Oráculos acústicos executados e verificados: 8 funções puras + 3 perfis + 6 barramentos');
});

test('Integração de Produto Vol. 10 (CAT-AUD-01..08 + C++20/WASM Dual-Layer): CSP, WASM Worklet 0-WASI, Permadeath Audio, Pool LRU 64 MB, Alt-Tab Visibility, 11 Eventos + LEI_SFX_2, 3 Perfis Acústicos e Legendas XAG 104', async () => {
  // 1. CAT-AUD-01 + CAT-AUD-03: CSP HTTP + Tauri CSP + Binário C++20 libbiofoil_audio_rt.wasm (0 WASI) + AudioWorklet + DSP RT
  const tauriConf = JSON.parse(
    fs.readFileSync(path.join(DIRETORIO_RAIZ, 'steam-desktop', 'tauri.conf.json'), 'utf8')
  );
  const diagTauriCsp = auditarPoliticaCspAudioWasm(tauriConf.app?.security?.csp ?? '');
  assert.equal(
    diagTauriCsp.status,
    'CSP_APTA_WASM_WORKLET',
    '[CAT-AUD-01] tauri.conf.json deve autorizar wasm-unsafe-eval e worker-src self para AudioWorklet C++20'
  );

  const srv = await iniciarServidorClienteWebBiofoil({ host: '127.0.0.1', port: 0 });
  let wasmBytes = null;
  try {
    const respRoot = await fetch(`${srv.url}/`);
    const cspHttp = respRoot.headers.get('content-security-policy') ?? '';
    const diagHttpCsp = auditarPoliticaCspAudioWasm(cspHttp);
    assert.equal(
      diagHttpCsp.status,
      'CSP_APTA_WASM_WORKLET',
      '[CAT-AUD-01] CSP HTTP de cliente-web.mjs deve autorizar wasm-unsafe-eval e worker-src self do AudioWorklet'
    );

    const respWasm = await fetch(`${srv.url}/onda6-ui/libbiofoil_audio_rt.wasm`);
    assert.equal(respWasm.status, 200, '[CAT-AUD-03] Rota /onda6-ui/libbiofoil_audio_rt.wasm deve responder 200');
    assert.equal(respWasm.headers.get('content-type'), 'application/wasm');
    wasmBytes = new Uint8Array(await respWasm.arrayBuffer());
    assert.ok(wasmBytes.byteLength >= 4096, '[CAT-AUD-03] Binário WASM C++20 deve ter código DSP real compilado');

    const respWorklet = await fetch(`${srv.url}/onda6-ui/worklet-audio-cpp20.js`);
    assert.equal(respWorklet.status, 200, '[CAT-AUD-03] Rota /onda6-ui/worklet-audio-cpp20.js deve responder 200');
    assert.match(respWorklet.headers.get('content-type') ?? '', /application\/javascript/);
    const codigoWorklet = await respWorklet.text();
    assert.match(codigoWorklet, /registerProcessor\('biofoil-audio-cpp20'/);
    assert.match(codigoWorklet, /biofoil_rt_process_scratch_block/);
  } finally {
    await srv.fechar();
  }

  const wasmMod = new WebAssembly.Module(wasmBytes);
  assert.equal(
    WebAssembly.Module.imports(wasmMod).length,
    0,
    '[CAT-AUD-03] libbiofoil_audio_rt.wasm deve ser standalone puro (0 imports WASI/env)'
  );

  const motorWasm = criarMotorAudioMaritimoCliente();
  const estConn = await motorWasm.conectarWorkletWasm(wasmBytes, { sampleRate: 48000 });
  assert.equal(estConn.conectado, true, '[CAT-AUD-03] Motor WebAudio deve instanciar libbiofoil_audio_rt.wasm em runtime');

  // Empurra telemetria Submerso (foilState: 3) + Salva disparada (weaponSalvoTriggered: 1) e roda 24 blocos de 128 amostras
  motorWasm.empurrarTelemetriaWasmRt({
    hullIntegrityPct: 0.35,
    floodedWaterKg: 140.0,
    cavitationMarginKg: 15.0,
    foilState: 3,
    enemyArchetype: 2,
    bossPhase: 0,
    oceanBoilWarning: 1,
    weaponSalvoTriggered: 1,
    sonarIntensity01: 0.8,
  });
  const entradaIntercalada = new Float32Array(256);
  for (let i = 0; i < 128; i += 1) {
    entradaIntercalada[2 * i] = Math.sin((2 * Math.PI * 1200 * i) / 48000) * 0.5;
    entradaIntercalada[2 * i + 1] = Math.cos((2 * Math.PI * 1200 * i) / 48000) * 0.5;
  }
  let blocoSaida = null;
  let menorDuckingDb = 0;
  for (let b = 0; b < 160; b += 1) {
    blocoSaida = motorWasm.processarBlocoWasmRt(entradaIntercalada, 128);
    if (blocoSaida.duckingDb < menorDuckingDb) menorDuckingDb = blocoSaida.duckingDb;
  }
  assert.equal(blocoSaida.framesProcessados, 128);
  assert.equal(blocoSaida.amostrasSaida.length, 256);
  assert.ok(blocoSaida.amostrasSaida.every(Number.isFinite), '[CAT-AUD-03] Amostras C++20 WASM nunca podem conter NaN/Inf');
  assert.ok(blocoSaida.corteHidroHz < 450, '[CAT-AUD-03] Filtro hidroacústico C++20 deve fechar rumo a 400 Hz em Touchdown');
  assert.ok(menorDuckingDb < -0.5, '[CAT-AUD-03] Envelope HDR C++20 deve atenuar BUS_1_MUSIC sob salva de artilharia');
  assert.equal(blocoSaida.cortesBarramentosHz[0], 20000, '[CAT-AUD-03] BUS_0_SURVIVAL_CUES deve permanecer em bypass 20 kHz no C++20');
  assert.equal(blocoSaida.cortesBarramentosHz[4], 20000, '[CAT-AUD-03] BUS_4_UI deve permanecer em bypass 20 kHz no C++20');

  // 2. CAT-AUD-02: Persistência de preferenciasAudio (6 faders dB) imune a Permadeath em disco real
  const perfilIni = criarPerfilInicial();
  assert.deepEqual(
    perfilIni.preferenciasAudio,
    PREFERENCIAS_AUDIO_CANONICAS_VOL10,
    '[CAT-AUD-02] criarPerfilInicial deve incluir os 6 faders e flags canônicas de preferenciasAudio'
  );
  const dirSaveTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'biofoil-aud02-save-'));
  try {
    const estRunViva = criarEstadoInicialPartida('seed-aud02-permadeath', 'CARCACA_ALFA');
    salvarRunSaveDisco(estRunViva, { diretorioDados: dirSaveTmp });
    assert.equal(carregarRunSaveDisco({ diretorioDados: dirSaveTmp }).status, 'ENCONTRADO');

    const perfilCustom = atualizarPerfilComMetricasRun(perfilIni, {
      incrementarRunsIniciadas: 1,
      preferenciasAudio: {
        master: 70,
        musica: 45,
        sfxCombate: 95,
        cabineTripulacao: 80,
        ambienteMaritimo: 60,
        alertasUi: 100,
        perfilDinamico: 'STEAM_DECK',
        saidaMono: true,
        confortoAntiTinnitus: true,
      },
    });
    assert.equal(
      perfilCustom.preferenciasAudio.musica,
      45,
      '[CAT-AUD-02] atualizarPerfilComMetricasRun deve preservar preferenciasAudio customizadas do jogador'
    );
    salvarPerfilDisco(perfilCustom, { diretorioDados: dirSaveTmp });
    const resPermadeath = apagarRunSavePermadeathDisco({ diretorioDados: dirSaveTmp });
    assert.equal(resPermadeath.status, 'APAGADO_PERMADEATH');
    assert.equal(carregarRunSaveDisco({ diretorioDados: dirSaveTmp }).status, 'SEM_SAVE_ATIVO');

    const perfilPosMorte = carregarPerfilDisco({ diretorioDados: dirSaveTmp });
    assert.equal(perfilPosMorte.status, 'CARREGADO_DISCO');
    assert.equal(
      perfilPosMorte.perfil.preferenciasAudio.musica,
      45,
      '[CAT-AUD-02] Permadeath apaga run_save.json mas jamais pode resetar preferenciasAudio em profile.json'
    );
    assert.equal(perfilPosMorte.perfil.preferenciasAudio.perfilDinamico, 'STEAM_DECK');
    assert.equal(perfilPosMorte.perfil.preferenciasAudio.saidaMono, true);
    assert.equal(perfilPosMorte.perfil.preferenciasAudio.confortoAntiTinnitus, true);
  } finally {
    fs.rmSync(dirSaveTmp, { recursive: true, force: true });
  }

  // 3. CAT-AUD-04: Pool de Zonas Acústicas LRU <= 64 MB + Loop Sample-Accurate compensando preSkipFrames (312)
  const motorLru = criarMotorAudioMaritimoCliente();
  for (let z = 1; z <= 12; z += 1) {
    motorLru.registrarZonaAcusticaLru(`ZONA_TESTE_${z}`, {
      bytesPcm: 12 * 1024 * 1024,
      exactFrameCount: 368_640,
      preSkipFrames: 312,
      sampleRateHz: 48000,
      bpm: 125,
    });
  }
  const telLruWeb = motorLru.obterTelemetriaCacheLruMb();
  assert.equal(Object.isFrozen(telLruWeb), true);
  assert.equal(
    telLruWeb.statusOrcamento,
    'DENTRO_ORCAMENTO_LRU',
    '[CAT-AUD-04] Pool LRU do motor WebAudio jamais pode ultrapassar o teto de 64 MB de RAM PCM'
  );
  assert.ok(telLruWeb.ramResidenteMb <= 64, '[CAT-AUD-04] RAM residente de zonas deve ficar <= 64 MB');
  assert.ok(telLruWeb.eviccoesRealizadas >= 7, '[CAT-AUD-04] Registrar 144 MB de zonas deve evictar as mais antigas');

  const ptrZona = motorLru.calcularPonteiroLoopZona('ZONA_TESTE_12', 368_645, 125, 48000);
  assert.equal(ptrZona.frameBufferDecodificado, 317, '[CAT-AUD-04] Ponteiro de zona deve compensar preSkipFrames=312');
  assert.equal(ptrZona.loopSemClique, true);
  assert.throws(() => motorLru.registrarZonaAcusticaLru('', { bytesPcm: 1024 }), /zonaId obrigatorio/);
  assert.throws(
    () => motorLru.registrarZonaAcusticaLru('ZONA_GIGANTE', { bytesPcm: 70 * 1024 * 1024 }),
    /ESTOURO_UNITARIO_POOL_LRU_64MB/
  );

  const motorOggSteam = criarMotorAudioOggFoleySteam();
  for (let k = 1; k <= 10; k += 1) {
    motorOggSteam.registrarBufferDecodificadoLru(`OGG_PESADO_${k}`, {
      length: 2_000_000,
      numberOfChannels: 2,
    });
  }
  const telLruOgg = motorOggSteam.obterTelemetriaCacheLruMb();
  assert.equal(
    telLruOgg.statusOrcamento,
    'DENTRO_ORCAMENTO_LRU',
    '[CAT-AUD-04] Cache de AudioBuffers Ogg Steam deve respeitar teto LRU <= 64 MB'
  );
  assert.ok(telLruOgg.eviccoesRealizadas >= 2);

  // 4. CAT-AUD-05: visibilitychange (Alt-Tab / Steam Overlay) auto-pausa COMBATE ativo e silencia/restaura áudio
  const listenersDoc = new Map();
  const listenersWin = new Map();
  const listenersCanvas = new Map();
  const estCombateDom = criarEstadoInicialPartida('seed-aud05-visibility', 'CARCACA_ALFA');
  const vmCombateDom = projetarViewModelWireframe(estCombateDom);
  const docHarness = {
    hidden: false,
    visibilityState: 'visible',
    getElementById(id) {
      if (id === 'biofoil-canvas') {
        return {
          width: 960,
          height: 540,
          style: {},
          getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }),
          getContext: () => ({
            imageSmoothingEnabled: false,
            createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
            putImageData() {},
            clearRect() {},
            fillRect() {},
            strokeRect() {},
            beginPath() {},
            moveTo() {},
            lineTo() {},
            stroke() {},
            fill() {},
            arc() {},
            fillText() {},
          }),
          addEventListener(tipo, fn) {
            listenersCanvas.set(tipo, fn);
          },
        };
      }
      if (id === 'biofoil-bootstrap') {
        return { textContent: '{}' };
      }
      return null;
    },
    addEventListener(tipo, fn) {
      listenersDoc.set(tipo, fn);
    },
  };
  const timersCriados = [];
  const setIntervalOriginal = globalThis.setInterval;
  globalThis.setInterval = () => {
    const fakeId = Symbol('timer');
    timersCriados.push(fakeId);
    return fakeId;
  };
  let rtDom = null;
  try {
    const winHarness = {
      innerWidth: 960,
      innerHeight: 540,
      devicePixelRatio: 1,
      location: { search: '' },
      requestAnimationFrame: () => 1,
      fetch: async () => ({ ok: false, json: async () => ({}) }),
      addEventListener(tipo, fn) {
        listenersWin.set(tipo, fn);
      },
    };
    rtDom = iniciarRuntimeDomBiofoil(docHarness, winHarness, {
      estadoBruto: estCombateDom,
      viewModel: vmCombateDom,
      frameCanvas: { comandos: [] },
    });
  } finally {
    globalThis.setInterval = setIntervalOriginal;
  }
  assert.ok(rtDom, '[CAT-AUD-05] Runtime DOM deve inicializar com estado de combate real');
  assert.equal(listenersDoc.has('visibilitychange'), true, '[CAT-AUD-05] Runtime DOM deve escutar visibilitychange');
  assert.equal(rtDom.obterContextoUi().pausaTaticaAtiva, false);
  assert.equal(rtDom.motorAudio.estaMudo(), false);

  docHarness.hidden = true;
  docHarness.visibilityState = 'hidden';
  listenersDoc.get('visibilitychange')();
  assert.equal(
    rtDom.obterContextoUi().pausaTaticaAtiva,
    true,
    '[CAT-AUD-05] Perder foco (Alt-Tab / Overlay) em COMBATE ativo deve ativar Pausa Tática imediatamente'
  );
  assert.equal(rtDom.motorAudio.estaMudo(), true, '[CAT-AUD-05] silenciarSemFoco deve emudecer áudio em segundo plano');

  docHarness.hidden = false;
  docHarness.visibilityState = 'visible';
  listenersDoc.get('visibilitychange')();
  assert.equal(rtDom.motorAudio.estaMudo(), false, '[CAT-AUD-05] Retornar foco deve restaurar áudio se não estava mudo antes');
  assert.equal(
    rtDom.obterContextoUi().pausaTaticaAtiva,
    true,
    '[CAT-AUD-05] Retornar foco deve manter Pausa Tática ativa até o jogador despausar voluntariamente'
  );

  // 5. CAT-AUD-06 + LEI_SFX_2: 11 Eventos Complementares (EVT_AUD_01..11) + Zero Reúso de Disparo de Arma em UI/Tripulação
  const comandosUiTrip = [
    'MOVER_TRIPULANTE',
    'MIRAR_ARMA',
    'ALTERNAR_MODO_SALVA',
    'ATIVAR_TINTA_FURTIVA',
    'ATIVAR_PULSO_ENZIMAS',
    'ATIVAR_PINCA_CARANGUEJO',
    'VIAJAR_NO_MAPA',
    'INICIAR_NOVA_RUN',
    'ALOCAR_ENERGIA',
    'DESALOCAR_ENERGIA',
  ];
  const estSfxBase = criarEstadoInicialPartida('seed-aud06-sfx', 'CARCACA_ALFA');
  for (const tipoCmd of comandosUiTrip) {
    const sfxEmitidos = extrairSfxMulticamadaDoTick(estSfxBase, estSfxBase, {
      aceito: true,
      comandoExecutado: { tipo: tipoCmd, slotIndex: 0 },
    });
    for (const sfx of sfxEmitidos) {
      assert.equal(
        String(sfx.idSfx).startsWith('SFX_DISPARO_'),
        false,
        `[CAT-AUD-06 / LEI_SFX_2] Comando de UI/navegação ${tipoCmd} jamais pode reutilizar disparo bélico (${sfx.idSfx})`
      );
    }
  }

  // Disparo determinístico dos 11 eventos EVT_AUD_01..11 na paisagem sonora completa
  const estAnt11 = structuredClone(estSfxBase);
  estAnt11.naveJogador.armasAtivas = [
    { chassiId: 'EMISSOR_ACUSTICO_I', progressoRecargaSeg: 2.0, tempoRecargaBaseSeg: 8.0, modoDisparo: 'MANUAL' },
  ];
  estAnt11.naveJogador.progressoFugaSeg = 18.0;
  estAnt11.alvoCombate = { ativo: true, faseChefe: 1, emFuga: false, salasOuOrgaos: [] };

  const estAtu11 = structuredClone(estAnt11);
  estAtu11.meta.tickAtual = (Number(estAnt11.meta?.tickAtual ?? 0) + 1);
  estAtu11.naveJogador.armasAtivas[0].progressoRecargaSeg = 8.0;
  estAtu11.naveJogador.progressoFugaSeg = 20.0;
  estAtu11.naveJogador.tripulacao[0].hpAtual = 0;
  estAtu11.naveJogador.camaras[0].brechaAtiva = true;
  estAtu11.naveJogador.camaras[0].curtoCircuitoAtivo = true;
  estAtu11.alvoCombate = { ativo: true, faseChefe: 2, emFuga: true, progressoFugaSeg: 4.0, salasOuOrgaos: [] };
  estAtu11.meta.eventosVisuaisUltimoTick = [{ tipo: 'FEIXE_JOGADOR', dano: 2 }];

  const paisagemCombate11 = construirPaisagemSonoraCompleta(
    clonarProfundoCongelado(estAnt11),
    clonarProfundoCongelado(estAtu11),
    { aceito: true, comandoExecutado: { tipo: 'ATIVAR_TINTA_FURTIVA' } }
  );
  const estFim11 = structuredClone(estAtu11);
  estFim11.meta.faseJogo = 'FIM_DE_RUN';
  estFim11.meta.desfechoRun = 'VITORIA_CAMPANHA';
  const paisagemFim11 = construirPaisagemSonoraCompleta(
    clonarProfundoCongelado(estAtu11),
    clonarProfundoCongelado(estFim11),
    null
  );
  const idsEventos11 = new Set([
    ...paisagemCombate11.eventosComplementaresVol10.map((e) => e.id),
    ...paisagemFim11.eventosComplementaresVol10.map((e) => e.id),
  ]);
  const esperados11 = [
    'EVT_AUD_01_ARMA_PRONTA_SLOT',
    'EVT_AUD_02_SALVA_COMPLETA_PRONTA',
    'EVT_AUD_03_SALTO_FUGA_PRONTO',
    'EVT_AUD_04_INIMIGO_EM_FUGA',
    'EVT_AUD_05_MORTE_TRIPULANTE_ALIADO',
    'EVT_AUD_06_ESPECIAIS_4_ESPECIES',
    'EVT_AUD_07_LOOP_ROMBO_PRESSURIZADO',
    'EVT_AUD_08_LOOP_CURTO_E_REPARO',
    'EVT_AUD_09_VARREDURA_BEAM_ORTOGONAL',
    'EVT_AUD_10_SEIS_STINGERS_QUANTIZADOS',
    'EVT_AUD_11_ARCOS_FINAIS_FECHADOS',
  ];
  for (const idEsp of esperados11) {
    assert.equal(idsEventos11.has(idEsp), true, `[CAT-AUD-06] Evento complementar ${idEsp} não foi emitido por audio-maritimo.mjs`);
  }

  // 6. CAT-AUD-07: Perfis Acústicos (ESTUDIO, STEAM_DECK, NOTURNO), Saída Mono e Conforto Anti-Tinnitus (3200 Hz)
  const motorPerfis = criarMotorAudioMaritimoCliente();
  const estDeck = motorPerfis.definirPerfilAcustico('STEAM_DECK');
  assert.equal(estDeck.perfilDinamico, 'STEAM_DECK');
  assert.equal(estDeck.alvoLufs, -18.0);
  assert.deepEqual(
    estDeck.harmonicosFundamentalAusenteHz,
    [87.3, 130.95],
    '[CAT-AUD-07] Perfil STEAM_DECK no motor WebAudio deve configurar harmônicos 2x/3x (87.3 e 130.95 Hz)'
  );

  const estNoturno = motorPerfis.definirPerfilAcustico('NOTURNO');
  assert.equal(estNoturno.alvoLufs, -24.0);
  assert.equal(estNoturno.highPassSaidaHz, 65);

  const estMono = motorPerfis.definirSaidaMono(true);
  assert.equal(estMono.saidaMono, true, '[CAT-AUD-07] definirSaidaMono(true) deve colapsar L+R sem cancelamento');

  const estTinnitus = motorPerfis.definirConfortoAntiTinnitus(true);
  assert.equal(
    estTinnitus.tetoAntiTinnitusHz,
    3200,
    '[CAT-AUD-07] definirConfortoAntiTinnitus(true) deve cravar teto em 3200 Hz protegendo ouvidos sensíveis'
  );
  assert.throws(() => motorPerfis.definirPerfilAcustico('CINEMA_FANTASMA'), /PERFIL ACUSTICO INVALIDO/);

  // 7. CAT-AUD-08: Legendas Táticas Direcionais (< / > / <>) XAG 104 no ViewModel e no HUD 960x540 quando silenciado
  const estLegendasSom = structuredClone(estSfxBase);
  estLegendasSom.naveJogador.estadoFisico = '2_TOUCHDOWN';
  estLegendasSom.naveJogador.camaras[0].brechaAtiva = true;
  estLegendasSom.alvoCombate = {
    ativo: true,
    emFuga: true,
    progressoFugaSeg: 5.0,
    alarmeFervuraAtivoSeg: 4.0,
    salasOuOrgaos: [],
  };
  estLegendasSom.meta.eventosVisuaisUltimoTick = [{ tipo: 'PROJETIL_INIMIGO', dano: 1 }];
  estLegendasSom.meta.audioMutado = false;
  estLegendasSom.meta.preferenciasAudio = { mudo: false, legendasTaticasDirecionais: 'DESLIGADO' };

  const vmComSom = projetarViewModelWireframe(clonarProfundoCongelado(estLegendasSom));
  assert.equal(vmComSom.modoLegendasTaticasEfetivo, 'DESLIGADO');
  assert.equal(vmComSom.legendasTaticasDirecionais.length, 0);

  const estLegendasMutado = structuredClone(estLegendasSom);
  estLegendasMutado.meta.audioMutado = true;
  const vmMutadoXag = projetarViewModelWireframe(clonarProfundoCongelado(estLegendasMutado));
  assert.equal(
    vmMutadoXag.modoLegendasTaticasEfetivo,
    'ALERTAS_CRITICOS',
    '[CAT-AUD-08] Silenciar áudio com legendas DESLIGADO deve auto-ativar ALERTAS_CRITICOS no ViewModel (XAG 104)'
  );
  assert.ok(vmMutadoXag.legendasTaticasDirecionais.some((l) => l.direcao === '<' && l.id === 'LEG_BRECHA_CASCO'));
  assert.ok(vmMutadoXag.legendasTaticasDirecionais.some((l) => l.direcao === '<>' && l.id === 'LEG_FERVURA_OCEANO'));
  assert.ok(vmMutadoXag.legendasTaticasDirecionais.some((l) => l.direcao === '>' && l.id === 'LEG_INIMIGO_FUGA'));

  const assetsHiBit = obterAssetsConceitoHiBit();
  const tabelasRaster = obterTabelasRasterUnificado();
  const hbSom = obterMapaHitboxesNativo(vmComSom);
  const hbMut = obterMapaHitboxesNativo(vmMutadoXag);
  const rgbaSemLegenda = rasterizarQuadroRgba960x540(vmComSom, { tempoSeg: 0.25 }, assetsHiBit, hbSom, tabelasRaster);
  const rgbaComLegendaXag = rasterizarQuadroRgba960x540(vmMutadoXag, { tempoSeg: 0.25 }, assetsHiBit, hbMut, tabelasRaster);

  // Conta pixels diferentes na faixa de legendas direcionais (y = 410..426, x = 250..820)
  let pixelsDiferentesFaixaLegenda = 0;
  for (let y = 410; y <= 426; y += 1) {
    for (let x = 250; x <= 820; x += 1) {
      const idx = (y * 960 + x) * 4;
      if (
        rgbaSemLegenda[idx] !== rgbaComLegendaXag[idx] ||
        rgbaSemLegenda[idx + 1] !== rgbaComLegendaXag[idx + 1] ||
        rgbaSemLegenda[idx + 2] !== rgbaComLegendaXag[idx + 2]
      ) {
        pixelsDiferentesFaixaLegenda += 1;
      }
    }
  }
  assert.ok(
    pixelsDiferentesFaixaLegenda >= 120,
    '[CAT-AUD-08] HUD 960x540 deve desenhar indicador visual direcional (< / >) quando áudio está silenciado'
  );

  console.log(
    `[N4] Integração CAT-AUD-01..08 verificada: WASM ${wasmBytes.byteLength}B (0-WASI), ${esperados11.length}/11 eventos Vol.10, Pool LRU ${telLruWeb.ramResidenteMb}MB<=64MB e ${pixelsDiferentesFaixaLegenda}px XAG 104`
  );
});

test('Leis N2 + N6 + Guardas de Erro: comprova catraca vazia pós-promoção e cobre guardas defensivas', async () => {
  console.log(`[N4] Sondas pendentes na LISTA_CATRACA_AUDIO_CPP20 examinadas: ${LISTA_CATRACA_AUDIO_CPP20.length}`);
  assert.equal(
    LISTA_CATRACA_AUDIO_CPP20.length,
    0,
    '[N2 CATRACA] LISTA_CATRACA_AUDIO_CPP20 deve permanecer vazia após promoção integral de CAT-AUD-01..08'
  );

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
