/**
 * ONDA 6 — Paisagem Sonora Marítima Contínua, Extração Determinística de SFX e Síntese PCM Multicamada
 * Dono Único (Lei N5): src/onda6-ui/audio-maritimo.mjs
 *
 * Integra-se ao grafo canônico dos 8 Cues Táticos (`cues-audio.mjs` / Seção 8.5.C.3) e ao catálogo/motor WebAudio puro
 * (`sintetizador-webaudio-cliente.mjs`), roteando toda a mixagem pelo `BiquadFilterNode` passa-baixa a `400 Hz`
 * durante `2_TOUCHDOWN` e `3_SPOOL_UP`.
 */
import fs from 'node:fs';
import { clonarProfundoCongelado } from '../gdd-parser.mjs';
import { construirPlanoGrafoWebAudio } from './cues-audio.mjs';
import { ACOES_CAMPANHA_BIOFOIL } from './encontros-eventos-campanha.mjs';
import {
  CATALOGO_SFX_MULTICAMADA_BIOFOIL,
  ESTADOS_TRILHA_ADAPTATIVA_BIOFOIL,
  criarMotorAudioMaritimoCliente,
} from './sintetizador-webaudio-cliente.mjs';

export {
  CATALOGO_SFX_MULTICAMADA_BIOFOIL,
  ESTADOS_TRILHA_ADAPTATIVA_BIOFOIL,
  criarMotorAudioMaritimoCliente,
};

const CODIGO_FONTE_SINTETIZADOR_CLIENTE = fs
  .readFileSync(new URL('./sintetizador-webaudio-cliente.mjs', import.meta.url), 'utf8')
  .replace(/^export\s+(?=(?:async\s+)?function\s+|const\s+|let\s+)/gm, '');

export const CAMADAS_PAISAGEM_MARITIMA = Object.freeze([
  Object.freeze({
    id: 'CHUVA_TEMPESTADE_SUPERFICIE',
    tipoFonte: 'RUIDO_ROSA_FILTRADO',
    filtroTipo: 'bandpass',
    freqCentralHz: 1850,
    fatorQ: 0.85,
    ganhoNoFoil: 0.09,
    ganhoSubmerso: 0.018,
    lfoVentoHz: 0.14,
  }),
  Object.freeze({
    id: 'LAMINA_HIDROFOLIO_FOIL',
    tipoFonte: 'CISALHAMENTO_HIDRODINAMICO',
    filtroTipo: 'bandpass',
    freqCentralHz: 1120,
    fatorQ: 1.6,
    ganhoNoFoil: 0.08,
    ganhoSubmerso: 0.008,
    modulacaoCavitacaoHz: 11.5,
  }),
  Object.freeze({
    id: 'RESSONANCIA_SUBMERSA_ABISSAL',
    tipoFonte: 'DRONE_SUB_GRAVE',
    filtroTipo: 'lowpass',
    freqCentralHz: 180,
    fatorQ: 1.1,
    freqFundamentalHz: 52,
    ganhoNoFoil: 0.045,
    ganhoSubmerso: 0.16,
  }),
  Object.freeze({
    id: 'PULSO_CORACAO_BIO_ELETRICO',
    tipoFonte: 'BATIMENTO_ELETROCITICO',
    filtroTipo: 'lowpass',
    freqCentralHz: 240,
    fatorQ: 1.4,
    freqSistoleHz: 68,
    freqDiastoleHz: 38,
    bpmCalmo: 58,
    bpmCombate: 86,
    bpmCritico: 118,
  }),
]);

/**
 * Seleciona o estado musical adaptativo conforme a fase da campanha e a classe do alvo.
 */
export function selecionarEstadoTrilhaAdaptativa(estadoAtual) {
  const fase = estadoAtual?.meta?.faseJogo ?? 'COMBATE';
  if (fase === 'INICIO' || fase === 'FIM_DE_RUN') {
    return ESTADOS_TRILHA_ADAPTATIVA_BIOFOIL.TRILHA_HANGAR_INICIO;
  }
  if (fase === 'LOJA') {
    return ESTADOS_TRILHA_ADAPTATIVA_BIOFOIL.TRILHA_RECIFE_LOJA;
  }
  if (fase === 'MAPA' || fase === 'EVENTO') {
    return ESTADOS_TRILHA_ADAPTATIVA_BIOFOIL.TRILHA_CARTA_MAPA;
  }
  const classeAlvo = estadoAtual?.alvoCombate?.classeAlvo ?? estadoAtual?.alvoCombate?.classeInimigo ?? 'BARCO_HUMANO';
  if (classeAlvo === 'CHEFE_DRAGA' || Number(estadoAtual?.alvoCombate?.faseChefe ?? 0) >= 1) {
    return ESTADOS_TRILHA_ADAPTATIVA_BIOFOIL.TRILHA_CHEFE_DRAGA;
  }
  return ESTADOS_TRILHA_ADAPTATIVA_BIOFOIL.TRILHA_COMBATE_TENSIVO;
}

function mapearChassiArmaParaSfx(chassiId) {
  const id = String(chassiId ?? '');
  if (id.includes('ARPAO')) return 'SFX_DISPARO_ARPAO_CABO';
  if (id.includes('ESTILHACO') || id.includes('RAJADA')) return 'SFX_DISPARO_ESTILHACOS_FLAK';
  if (id.includes('CORTADOR') || id.includes('PLASMA')) return 'SFX_FEIXE_CORTADOR_PLASMA';
  if (id.includes('TORPEDO')) return 'SFX_DISPARO_TORPEDO_ABISSAL';
  return 'SFX_DISPARO_ACUSTICO_ESPORO';
}

const COMANDOS_SFX_HIDRAULICOS = new Set([
  'ALTERNAR_VALVULA',
  'DRENAR_TUDO',
  'MERGULHO_TATICO',
  'ATIVAR_TINTA_FURTIVA',
  'ATIVAR_BAIACU',
  ACOES_CAMPANHA_BIOFOIL.SOLICITAR_CONFIRMACAO_ABANDONO,
]);

const COMANDOS_SFX_BIOELETRICOS = new Set([
  'ALOCAR_ENERGIA',
  'ATIVAR_PULSO_ENZIMAS',
]);

const COMANDOS_SFX_TATICOS_MIRA = new Set([
  'MIRAR_ARMA',
  'TRACAR_BEAM',
  'MOVER_TRIPULANTE',
  'ORDENAR_MOVIMENTO_ABORDAGEM',
  ACOES_CAMPANHA_BIOFOIL.MOVER_ABORDO_INIMIGO,
  ACOES_CAMPANHA_BIOFOIL.ALTERNAR_MODO_DISPARO_ARMA,
]);

const COMANDOS_SFX_FORJA_CAMPANHA = new Set([
  'COMPRAR_OU_VENDER_LOJA',
  'ENXERTAR_ORGAO',
  ACOES_CAMPANHA_BIOFOIL.COMPRAR_UPGRADE_OFICINA,
  ACOES_CAMPANHA_BIOFOIL.ALTERNAR_MOEDA_REATOR,
  ACOES_CAMPANHA_BIOFOIL.EQUIPAR_ARMA_PORAO,
  ACOES_CAMPANHA_BIOFOIL.ENXERTAR_ORGAO_PORAO,
  ACOES_CAMPANHA_BIOFOIL.DESEQUIPAR_ARMA_PARA_PORAO,
  ACOES_CAMPANHA_BIOFOIL.REMOVER_ORGAO_PARA_PORAO,
  ACOES_CAMPANHA_BIOFOIL.DESCARTAR_ITEM_PORAO,
  ACOES_CAMPANHA_BIOFOIL.CONFIRMAR_SAQUE_POS_COMBATE,
  ACOES_CAMPANHA_BIOFOIL.CONFIRMAR_DESFECHO_EVENTO,
  'ESCOLHER_OPCAO_EVENTO',
  'ABRIR_FECHAR_OFICINA',
  ACOES_CAMPANHA_BIOFOIL.ALTERNAR_MODAL_OFICINA,
  ACOES_CAMPANHA_BIOFOIL.SELECIONAR_CARCACA_HANGAR,
]);

const COMANDOS_SFX_PROPULSAO_TRAVESSIA = new Set([
  'LANCAR_ABORDAGEM',
  'SALTO_FUGA',
  'VIAJAR_NO_MAPA',
  ACOES_CAMPANHA_BIOFOIL.INICIAR_NOVA_RUN,
  ACOES_CAMPANHA_BIOFOIL.CONTINUAR_RUN_SALVA,
  ACOES_CAMPANHA_BIOFOIL.VOLTAR_AO_HANGAR,
  ACOES_CAMPANHA_BIOFOIL.ABANDONAR_EXPEDICAO,
]);

const REJEICOES_SILENCIOSAS_UI = new Set([
  'INPUT_SEM_EFEITO_TATICO',
  'CLICK_FORA_DE_HITBOX',
  'MOUSEMOVE_PREVIEW',
  'HOVER_ATUALIZADO',
]);

function eventosVisuaisMudaramNoTick(estadoAnterior, estadoAtual) {
  if (!estadoAtual || estadoAnterior === estadoAtual) {
    return false;
  }
  const evAtu = estadoAtual?.meta?.eventosVisuaisUltimoTick;
  if (!Array.isArray(evAtu) || evAtu.length === 0) {
    return false;
  }
  if (!estadoAnterior) {
    return true;
  }
  const tickAnt = Number(estadoAnterior?.meta?.tickAtual ?? 0);
  const tickAtu = Number(estadoAtual?.meta?.tickAtual ?? 0);
  if (tickAtu !== tickAnt) {
    return true;
  }
  const evAnt = estadoAnterior?.meta?.eventosVisuaisUltimoTick;
  if (evAnt === evAtu) {
    return false;
  }
  if (!Array.isArray(evAnt) || evAnt.length !== evAtu.length) {
    return true;
  }
  return JSON.stringify(evAnt) !== JSON.stringify(evAtu);
}

/**
 * Extrai deterministicamente os efeitos sonoros multicamada disparados no tick ou comando atual.
 * Garante que eventos visuais de ticks anteriores NUNCA sejam re-emitidos durante Pausa Tática ou `MOUSEMOVE`.
 */
export function extrairSfxMulticamadaDoTick(estadoAnterior, estadoAtual, ultimoResultadoComando = null) {
  const sfxDisparados = [];
  const adicionar = (idSfx, atrasoSeg = 0, pan = 0) => {
    const spec = CATALOGO_SFX_MULTICAMADA_BIOFOIL[idSfx];
    if (!spec) return;
    if (sfxDisparados.length >= 8) return;
    sfxDisparados.push({
      idSfx,
      atrasoSeg: Number(atrasoSeg.toFixed(3)),
      pan: Number(Math.max(-0.85, Math.min(0.85, pan)).toFixed(2)),
      duracaoSeg: spec.duracaoSeg,
    });
  };

  const cmdTipo =
    ultimoResultadoComando?.comandoExecutado?.tipo ??
    ultimoResultadoComando?.acaoCampanhaExecutada?.tipoAcao ??
    null;

  if (ultimoResultadoComando?.aceito && cmdTipo) {
    if (COMANDOS_SFX_HIDRAULICOS.has(cmdTipo)) {
      adicionar('SFX_VALVULA_DUTO_HIDRAULICO', 0, -0.25);
    } else if (COMANDOS_SFX_BIOELETRICOS.has(cmdTipo)) {
      adicionar('SFX_BARREIRA_BOLHA', 0, -0.2);
    } else if (COMANDOS_SFX_TATICOS_MIRA.has(cmdTipo)) {
      adicionar('SFX_DISPARO_ACUSTICO_ESPORO', 0, 0.15);
    } else if (cmdTipo === 'DISPARAR_SALVA_MANUAL') {
      adicionar('SFX_DISPARO_ARPAO_CABO', 0, -0.15);
    } else if (COMANDOS_SFX_FORJA_CAMPANHA.has(cmdTipo)) {
      adicionar('SFX_FORJA_DIGESTAO_LOJA', 0, 0.0);
    } else if (COMANDOS_SFX_PROPULSAO_TRAVESSIA.has(cmdTipo)) {
      adicionar('SFX_DISPARO_TORPEDO_ABISSAL', 0, 0.12);
    }
  } else if (
    ultimoResultadoComando?.aceito === false ||
    ultimoResultadoComando?.ok === false
  ) {
    const codRejeicao = String(
      ultimoResultadoComando?.marcadorRejeicao ?? ultimoResultadoComando?.codigoErro ?? ''
    );
    if (codRejeicao && !REJEICOES_SILENCIOSAS_UI.has(codRejeicao)) {
      adicionar('SFX_COMANDO_REJEITADO', 0, 0.0);
    }
  }

  const ignorarGateTickMutacao = ultimoResultadoComando?.reemitirEventosEmPausaMutacao === true;
  if (ignorarGateTickMutacao || eventosVisuaisMudaramNoTick(estadoAnterior, estadoAtual)) {
    const eventos = estadoAtual?.meta?.eventosVisuaisUltimoTick ?? [];
    let idxEv = 0;
    for (const ev of eventos) {
      const atraso = Math.min(0.18, idxEv * 0.03);
      idxEv += 1;
      if (ev.tipo === 'FEIXE_JOGADOR') {
        adicionar('SFX_FEIXE_CORTADOR_PLASMA', atraso, -0.15);
      } else if (ev.tipo === 'DISPARO_JOGADOR') {
        adicionar(mapearChassiArmaParaSfx(ev.chassiId), atraso, -0.2);
      } else if (ev.tipo === 'DISPARO_INIMIGO') {
        adicionar(
          ev.subtipo === 'TORPEDO_OU_BICO' ? 'SFX_DISPARO_TORPEDO_ABISSAL' : 'SFX_DISPARO_ARPAO_CABO',
          atraso,
          0.35
        );
      } else if (ev.tipo === 'IMPACTO_JOGADOR' || ev.tipo === 'IMPACTO_ALVO') {
        adicionar('SFX_IMPACTO_BRECHA_CASCO', atraso + 0.04, ev.tipo === 'IMPACTO_JOGADOR' ? -0.35 : 0.4);
      } else if (
        ev.tipo === 'BLOQUEIO_BARREIRA_JOGADOR' ||
        ev.tipo === 'IMPACTO_CARAPACA' ||
        ev.tipo === 'IMPACTO_BLINDAGEM'
      ) {
        adicionar('SFX_BARREIRA_BOLHA', atraso + 0.02, 0.2);
      } else if (ev.tipo === 'CARAPACA_REFLEXA_ATIVADA' || ev.tipo === 'SOBRECARGA_DRAGA') {
        adicionar('SFX_RUGIDO_CRIATURA_DRAGA', atraso, 0.35);
      } else if (ev.tipo === 'CORTE_DRENO_SEGURO' || ev.tipo === 'REFLEXO_BRANQUIAL') {
        adicionar('SFX_VALVULA_DUTO_HIDRAULICO', atraso, -0.3);
      }
    }
  }

  const barreiraAnt = Number(estadoAnterior?.naveJogador?.camadasBarreiraAtivas ?? 0);
  const barreiraAtu = Number(estadoAtual?.naveJogador?.camadasBarreiraAtivas ?? 0);
  if (estadoAnterior !== estadoAtual && barreiraAtu > barreiraAnt) {
    adicionar('SFX_BARREIRA_BOLHA', 0.01, -0.25);
  }

  return clonarProfundoCongelado(sfxDisparados);
}

/**
 * Constrói o plano acústico completo do jogo:
 * - Grafo tático canônico dos 8 Cues (`cues-audio.mjs`) + filtro subaquático 400 Hz em Touchdown/Spool-up;
 * - 4 camadas de paisagem sonora marítima contínua;
 * - SFX multicamada disparados no tick/comando;
 * - Estado e compasso de 32 passos (A/B/A'/C) da trilha sintetizada adaptativa + controles de volume/mudo.
 */
export function construirPaisagemSonoraCompleta(
  estadoAnterior,
  estadoAtual,
  ultimoResultadoComando = null,
  opcoesAudio = {}
) {
  const mudo =
    opcoesAudio.mudo !== undefined
      ? Boolean(opcoesAudio.mudo)
      : Boolean(estadoAtual?.meta?.audioMutado);
  const pausaTaticaAtiva =
    opcoesAudio.pausaTaticaAtiva !== undefined
      ? Boolean(opcoesAudio.pausaTaticaAtiva)
      : Boolean(estadoAtual?.meta?.pausaTaticaAtiva);
  const planoCues85C = construirPlanoGrafoWebAudio(
    estadoAnterior,
    estadoAtual,
    ultimoResultadoComando,
    { ...opcoesAudio, mudo }
  );
  const nave = estadoAtual.naveJogador;
  const emNoFoil = nave.estadoFisico === '1_NO_FOIL';
  const volumeUsuario = Math.max(0, Math.min(1, Number(opcoesAudio.volume ?? 0.85)));
  const frequenciaCorteEfetivaHz = !emNoFoil
    ? planoCues85C.filtroSubaquaticoMaster.frequenciaCorteHz
    : pausaTaticaAtiva
      ? 900
      : planoCues85C.filtroSubaquaticoMaster.frequenciaCorteHz;

  const aguaTotalKg = (nave.camaras ?? []).reduce((acc, c) => acc + Number(c.aguaKg ?? 0), 0);
  const o2MinPct = Math.min(
    100,
    ...(nave.camaras ?? []).map((c) => Number(c.oxigenioPct ?? 100))
  );
  const razaoHp = Number(nave.hpCascoAtual ?? 30) / Math.max(1, Number(nave.hpCascoMax ?? 30));
  const estresseCritico = razaoHp <= 0.35 || o2MinPct <= 35;

  const trilha = selecionarEstadoTrilhaAdaptativa(estadoAtual);
  const faseAtualAudio = estadoAtual.meta?.faseJogo ?? 'COMBATE';
  const vitoriaFimRun =
    estadoAtual.meta?.desfechoRun === 'VITORIA_CAMPANHA' ||
    Boolean(estadoAtual.meta?.metricasRun?.derrotouDragaFase3) ||
    Boolean(estadoAtual.campanha?.vitoria) ||
    estadoAtual.meta?.resultadoRun === 'VITORIA';
  const modoFimDeRun =
    faseAtualAudio === 'FIM_DE_RUN' ? (vitoriaFimRun ? 'VITORIA' : 'DERROTA') : null;
  const escalaTomTrilha = modoFimDeRun === 'DERROTA' ? 0.75 : modoFimDeRun === 'VITORIA' ? 1.1225 : 1.0;
  const bpmEfetivoTrilha =
    modoFimDeRun === 'DERROTA' ? 54 : modoFimDeRun === 'VITORIA' ? 84 : trilha.bpm;
  const bpmCoracao =
    modoFimDeRun === 'DERROTA'
      ? 46
      : faseAtualAudio !== 'COMBATE'
        ? 58
        : estresseCritico
          ? 118
          : 86;

  const camadasAmbiente = CAMADAS_PAISAGEM_MARITIMA.map((cam) => {
    let ganhoAtivo = emNoFoil ? cam.ganhoNoFoil : cam.ganhoSubmerso;
    if (cam.id === 'PULSO_CORACAO_BIO_ELETRICO') {
      ganhoAtivo = estresseCritico ? 0.14 : 0.075;
    } else if (cam.id === 'LAMINA_HIDROFOLIO_FOIL' && emNoFoil && aguaTotalKg < 62.5) {
      ganhoAtivo = Number((ganhoAtivo * 1.45).toFixed(4));
    }
    return {
      id: cam.id,
      tipoFonte: cam.tipoFonte,
      filtroTipo: cam.filtroTipo,
      freqCentralHz:
        cam.id === 'LAMINA_HIDROFOLIO_FOIL' && aguaTotalKg < 62.5 ? 1480 : cam.freqCentralHz,
      ganhoEfetivo: mudo ? 0 : Number((ganhoAtivo * volumeUsuario).toFixed(4)),
      bpmCoracao: cam.id === 'PULSO_CORACAO_BIO_ELETRICO' ? bpmCoracao : null,
    };
  });

  const sfxMulticamada = extrairSfxMulticamadaDoTick(
    estadoAnterior,
    estadoAtual,
    ultimoResultadoComando
  );
  const tamFrase = trilha.notasBaixoHz.length;
  const passoSequenciador = Number(estadoAtual.meta?.tickAtual ?? 0) % tamFrase;
  const seqAudio = opcoesAudio.seqAudio !== undefined ? String(opcoesAudio.seqAudio) : '';

  const atenTrilhaPausa = pausaTaticaAtiva ? 0.58 : 1.0;

  return clonarProfundoCongelado({
    mudo,
    pausaTaticaAtiva,
    volumeUsuario,
    estadoFisico: nave.estadoFisico,
    frequenciaCorteEfetivaHz,
    filtroSubaquaticoMaster: planoCues85C.filtroSubaquaticoMaster,
    ganhoMasterEfetivo: mudo ? 0 : Number((planoCues85C.ganhoMaster * volumeUsuario).toFixed(4)),
    planoTatico85C: planoCues85C,
    camadasAmbiente,
    sfxMulticamada,
    assinaturaLoteSfx: seqAudio && sfxMulticamada.length > 0 ? `${seqAudio}:${sfxMulticamada.length}` : '',
    trilhaAdaptativa: {
      idEstado: trilha.id,
      modoFimDeRun,
      escalaTomTrilha,
      bpm: bpmEfetivoTrilha,
      totalPassosFrase: tamFrase,
      passoSequenciador,
      notaBaixoAtualHz: Number((trilha.notasBaixoHz[passoSequenciador] * escalaTomTrilha).toFixed(2)),
      notaArpejoAtualHz: Number((trilha.notasArpejoHz[passoSequenciador] * escalaTomTrilha).toFixed(2)),
      ganhoBaixo: mudo ? 0 : Number((trilha.ganhoBaixo * volumeUsuario * atenTrilhaPausa).toFixed(4)),
      ganhoArpejo: mudo ? 0 : Number((trilha.ganhoArpejo * volumeUsuario * atenTrilhaPausa).toFixed(4)),
      formaBaixo: trilha.formaBaixo,
      formaArpejo: trilha.formaArpejo,
      vozesPadTriade: 3,
      passaPeloFiltroSubaquatico400Hz: true,
    },
  });
}

function avaliarOndaBasica(forma, faseRad) {
  const u = ((faseRad / (2 * Math.PI)) % 1 + 1) % 1;
  if (forma === 'square') return u < 0.5 ? 1 : -1;
  if (forma === 'sawtooth') return 2 * u - 1;
  if (forma === 'triangle') return 1 - 4 * Math.abs(u - 0.5);
  return Math.sin(faseRad);
}

/**
 * Sintetiza um buffer PCM real multicamada (Corpo + Síntese FM + Ruído Filtrado + Sub-Grave + Biquad 400 Hz submerso)
 * para qualquer SFX de `CATALOGO_SFX_MULTICAMADA_BIOFOIL`, comprovando riqueza espectral e atenuação subaquática real.
 */
export function sintetizarBufferPcmMulticamada(idSfx, opcoes = {}) {
  const spec = CATALOGO_SFX_MULTICAMADA_BIOFOIL[idSfx];
  if (!spec) {
    return clonarProfundoCongelado({
      ok: false,
      codigoErro: 'SFX_MULTICAMADA_INEXISTENTE',
      idSfx: String(idSfx ?? ''),
    });
  }
  const sampleRate = Math.max(8000, Math.min(48000, Math.floor(Number(opcoes.sampleRate ?? 16000) || 16000)));
  const submerso = Boolean(opcoes.submerso);
  const ignorarFiltroMutacao = opcoes.ignorarFiltroSubaquaticoSfxMutacao === true;
  const duracaoSeg = Math.max(0.08, Math.min(1.0, Number(opcoes.duracaoSeg ?? spec.duracaoSeg)));
  const totalAmostras = Math.floor(sampleRate * duracaoSeg);

  const fcMaster = submerso && !ignorarFiltroMutacao ? 400 : Math.min(6800, sampleRate * 0.44);
  const qMaster = submerso && !ignorarFiltroMutacao ? 1.25 : 0.7071;
  const w0 = (2 * Math.PI * fcMaster) / sampleRate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * qMaster);
  const a0 = 1 + alpha;
  const b0 = (1 - cosW0) / 2 / a0;
  const b1 = (1 - cosW0) / a0;
  const b2 = (1 - cosW0) / 2 / a0;
  const a1 = (-2 * cosW0) / a0;
  const a2 = (1 - alpha) / a0;

  const fcRuido = Math.min(sampleRate * 0.42, spec.camadaRuido.filtroHz);
  const wR = (2 * Math.PI * fcRuido) / sampleRate;
  const alphaR = Math.sin(wR) / (2 * Math.max(0.5, spec.camadaRuido.q));
  const a0R = 1 + alphaR;
  const b0R = alphaR / a0R;
  const b2R = -alphaR / a0R;
  const a1R = (-2 * Math.cos(wR)) / a0R;
  const a2R = (1 - alphaR) / a0R;

  let lfsr = 0x9e3779b9;
  let faseCorpo = 0;
  let fasePortadora = 0;
  let faseMod = 0;
  let faseSub = 0;
  let rx1 = 0;
  let rx2 = 0;
  let ry1 = 0;
  let ry2 = 0;
  let mx1 = 0;
  let mx2 = 0;
  let my1 = 0;
  let my2 = 0;

  const rajadasMs =
    Array.isArray(spec.camadaRuido?.rajadasMs) && spec.camadaRuido.rajadasMs.length > 0
      ? spec.camadaRuido.rajadasMs
      : [0];
  const decaimentoBurstSeg =
    rajadasMs.length > 1
      ? Math.max(0.018, spec.camadaRuido.decaimentoSeg * 0.25)
      : Math.max(0.02, spec.camadaRuido.decaimentoSeg);

  const amostras = new Array(totalAmostras);
  const amostrasPcmInt16 = new Int16Array(totalAmostras);
  let somaQuad = 0;
  let somaDiffQuad = 0;
  let picoAbs = 0;

  for (let i = 0; i < totalAmostras; i += 1) {
    const t = i / sampleRate;
    const p = i / Math.max(1, totalAmostras - 1);
    let envGeral = Math.min(1, t / 0.008) * Math.exp(-3.2 * p);

    lfsr ^= lfsr << 13;
    lfsr ^= lfsr >>> 17;
    lfsr ^= lfsr << 5;
    const ruidoBranco = ((lfsr >>> 0) / 0xffffffff) * 2 - 1;
    const ruidoBand = b0R * ruidoBranco + b2R * rx2 - a1R * ry1 - a2R * ry2;
    rx2 = rx1;
    rx1 = ruidoBranco;
    ry2 = ry1;
    ry1 = ruidoBand;
    let envRuido = 0;
    for (let rIdx = 0; rIdx < rajadasMs.length; rIdx += 1) {
      const tBurst = Math.max(0, Number(rajadasMs[rIdx]) || 0) / 1000;
      if (t >= tBurst) {
        const dtB = t - tBurst;
        const pesoB = Math.max(0.5, 1 - rIdx * 0.12);
        const eB = Math.min(1, dtB / 0.004) * Math.exp(-dtB / decaimentoBurstSeg) * pesoB;
        if (eB > envRuido) envRuido = eB;
        if (rajadasMs.length > 1 && eB * 0.85 > envGeral) {
          envGeral = eB * 0.85;
        }
      }
    }

    const freqCorpo = spec.camadaCorpo.freqIniHz + (spec.camadaCorpo.freqFimHz - spec.camadaCorpo.freqIniHz) * p;
    faseCorpo += (2 * Math.PI * freqCorpo) / sampleRate;
    const sinalCorpo = avaliarOndaBasica(spec.camadaCorpo.forma, faseCorpo) * spec.camadaCorpo.ganho * envGeral;

    faseMod += (2 * Math.PI * spec.camadaHarmonicaFm.moduladoraHz) / sampleRate;
    const freqPortBase =
      spec.camadaHarmonicaFm.portadoraHz +
      (spec.camadaHarmonicaFm.freqFimHz - spec.camadaHarmonicaFm.portadoraHz) * p;
    const freqInstFm = freqPortBase + Math.sin(faseMod) * spec.camadaHarmonicaFm.indiceFm * (1 - 0.6 * p);
    fasePortadora += (2 * Math.PI * freqInstFm) / sampleRate;
    const sinalFm = Math.sin(fasePortadora) * spec.camadaHarmonicaFm.ganho * envGeral;

    const freqSub = spec.camadaSubGrave.freqIniHz + (spec.camadaSubGrave.freqFimHz - spec.camadaSubGrave.freqIniHz) * p;
    faseSub += (2 * Math.PI * freqSub) / sampleRate;
    const sinalSub = Math.sin(faseSub) * spec.camadaSubGrave.ganho * Math.exp(-2.1 * p);

    const x0 = sinalCorpo + sinalFm + sinalSub + ruidoBand * spec.camadaRuido.ganho * envRuido;
    const y0 = b0 * x0 + b1 * mx1 + b2 * mx2 - a1 * my1 - a2 * my2;
    mx2 = mx1;
    mx1 = x0;
    my2 = my1;
    my1 = y0;

    const saturado = Math.tanh(y0 * 1.35);
    const val = Number(saturado.toFixed(6));
    amostras[i] = val;
    amostrasPcmInt16[i] = Math.max(-32768, Math.min(32767, Math.round(saturado * 32767)));
    somaQuad += val * val;
    if (Math.abs(val) > picoAbs) picoAbs = Math.abs(val);
    if (i > 0) {
      const d = val - amostras[i - 1];
      somaDiffQuad += d * d;
    }
  }

  const rmsTotal = Number(Math.sqrt(somaQuad / Math.max(1, totalAmostras)).toFixed(6));
  const energiaAltaFreqRelativa = Number((somaDiffQuad / Math.max(1e-9, somaQuad)).toFixed(6));

  return clonarProfundoCongelado({
    ok: true,
    idSfx,
    sampleRate,
    submerso,
    frequenciaCorteMasterHz: submerso && !ignorarFiltroMutacao ? 400 : 20000,
    totalAmostras,
    rmsTotal,
    picoAbs: Number(picoAbs.toFixed(6)),
    energiaAltaFreqRelativa,
    camadasAtivas: 4,
    amostrasPcm: amostras,
    amostrasPcmInt16,
  });
}

/**
 * Retorna o código-fonte real do sintetizador WebAudio client-side lido diretamente do módulo ES
 * `./sintetizador-webaudio-cliente.mjs` (ZERO `.toString()`, paridade 1:1 com ES Modules nativos).
 */
export function gerarCodigoSintetizadorMaritimoClienteJs() {
  return CODIGO_FONTE_SINTETIZADOR_CLIENTE;
}
