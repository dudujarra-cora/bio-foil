/**
 * ONDA 6 — Os 8 Cues Sonoros Táticos Obrigatórios (Leitura Cega de Sobrevivência)
 * Dono Único (Lei N5): src/onda6-ui/cues-audio.mjs
 *
 * Fontes canônicas:
 *  - Seção 8.5.C.3 (Tabela dos 8 Cues Sonoros Táticos Obrigatórios e parâmetros temporais/acústicos)
 */
import { clonarProfundoCongelado } from '../gdd-parser.mjs';

export const CATALOGO_8_CUES_SONOROS_85C = Object.freeze([
  Object.freeze({
    id: 'CUE_ESTOL_TOUCHDOWN',
    gatilho: 'Transição 1_NO_FOIL -> 2_TOUCHDOWN (P_total > S_atual ou MERGULHO_TATICO)',
    parametroCanonico: 'Queda de 100 px nativos (200 px em 1080p) + passa-baixa 400 Hz',
    filtroPassaBaixaHz: 400,
    quedaNativaPx: 100,
  }),
  Object.freeze({
    id: 'CUE_SPOOL_UP_DECOLAGEM',
    gatilho: 'Estado 3_SPOOL_UP ativo (progressoSpoolUpSeg > 0) até decolar',
    parametroCanonico: 'Ramp-up contínuo de 3.0s (5.0s pós-Deriva)',
    tempoSpoolUpPadraoSeg: 3.0,
    tempoSpoolUpPosDerivaSeg: 5.0,
  }),
  Object.freeze({
    id: 'CUE_ALARME_FERVURA_4S',
    gatilho: 'alvoCombate.alarmeFervuraAtivoSeg > 0 antes da Fervura na Fase 3',
    parametroCanonico: 'Alarme antecedente de 4.0s (Fervura dura 5.0s)',
    alarmeAntecedenteSeg: 4.0,
    duracaoFervuraSeg: 5.0,
  }),
  Object.freeze({
    id: 'CUE_CURTO_CIRCUITO_AGUA',
    gatilho: 'Qualquer câmara com curtoCircuitoAtivo === true',
    parametroCanonico: 'Cessa após 3.0s contínuos a 0.0 kg de água',
    tempoExtincaoSecoSeg: 3.0,
  }),
  Object.freeze({
    id: 'CUE_CAVITACAO_SIFAO',
    gatilho: 'Soma de aguaKg das 8 câmaras < 62.5 kg',
    parametroCanonico: 'Alerta de perda de -2.0 kg de sustentação por kg',
    limiarAguaKg: 62.5,
    perdaSustentacaoPorKg: 2.0,
  }),
  Object.freeze({
    id: 'CUE_HIPOXIA_CRITICA',
    gatilho: 'Qualquer câmara ocupada com oxigenioPct < 20.0',
    parametroCanonico: 'Asfixia de -8 HP/s abaixo de 20% O2',
    limiarOxigenioPct: 20.0,
    danoAsfixiaHpPorSeg: 8.0,
  }),
  Object.freeze({
    id: 'CUE_TRAVA_HIDROSTATICA',
    gatilho: 'Comando ALTERNAR_VALVULA ou DRENAR_TUDO rejeitado no mar',
    parametroCanonico: 'Disparo imediato (0.0s) ao retornar BLOQUEADO_TRAVA_HIDROSTATICA',
    atrasoDisparoSeg: 0.0,
  }),
  Object.freeze({
    id: 'CUE_POWER_SURGE_CHEFE',
    gatilho: 'Disparo de Power Surge da Draga Continental',
    parametroCanonico: 'Ciclos de 22s (Fase 1), 20s (Fase 2) e 18s (Fase 3)',
    ciclosPorFaseSeg: Object.freeze({ 1: 22, 2: 20, 3: 18 }),
  }),
]);

/**
 * Avalia puramente quais dos 8 cues sonoros táticos estão ativos na transição `estadoAnterior -> estadoAtual`.
 */
export function avaliarCuesSonorosAtivos(
  estadoAnterior,
  estadoAtual,
  ultimoResultadoComando = null
) {
  const cuesAtivos = [];
  const naveAnt = estadoAnterior?.naveJogador;
  const naveAtu = estadoAtual.naveJogador;
  const alvoAtu = estadoAtual.alvoCombate;

  // 1. CUE_ESTOL_TOUCHDOWN
  if (
    (naveAnt?.estadoFisico === '1_NO_FOIL' && naveAtu.estadoFisico === '2_TOUCHDOWN') ||
    ultimoResultadoComando?.cueEmitido === 'CUE_ESTOL_TOUCHDOWN'
  ) {
    cuesAtivos.push(CATALOGO_8_CUES_SONOROS_85C[0]);
  }

  // 2. CUE_SPOOL_UP_DECOLAGEM
  if (
    (naveAtu.estadoFisico === '3_SPOOL_UP' && (naveAtu.progressoSpoolUpSeg ?? 0) > 0) ||
    ultimoResultadoComando?.cueEmitido === 'CUE_SPOOL_UP_DECOLAGEM'
  ) {
    cuesAtivos.push(CATALOGO_8_CUES_SONOROS_85C[1]);
  }

  // 3. CUE_ALARME_FERVURA_4S
  if ((alvoAtu?.alarmeFervuraAtivoSeg ?? 0) > 0) {
    cuesAtivos.push(CATALOGO_8_CUES_SONOROS_85C[2]);
  }

  // 4. CUE_CURTO_CIRCUITO_AGUA
  if (naveAtu.camaras.some((c) => c.curtoCircuitoAtivo === true)) {
    cuesAtivos.push(CATALOGO_8_CUES_SONOROS_85C[3]);
  }

  // 5. CUE_CAVITACAO_SIFAO
  const somaAguaKg = naveAtu.camaras.reduce((acc, c) => acc + Number(c.aguaKg ?? 0), 0);
  if (somaAguaKg < 62.5) {
    cuesAtivos.push(CATALOGO_8_CUES_SONOROS_85C[4]);
  }

  // 6. CUE_HIPOXIA_CRITICA
  const camarasOcupadasIds = new Set(
    naveAtu.tripulacao
      .filter((t) => t.localizacao === 'NAVE_JOGADOR' && t.hpAtual > 0)
      .map((t) => t.camaraAtualId)
  );
  if (naveAtu.camaras.some((c) => camarasOcupadasIds.has(c.id) && Number(c.oxigenioPct ?? 100) < 20.0)) {
    cuesAtivos.push(CATALOGO_8_CUES_SONOROS_85C[5]);
  }

  // 7. CUE_TRAVA_HIDROSTATICA
  if (
    ultimoResultadoComando?.marcadorRejeicao === 'BLOQUEADO_TRAVA_HIDROSTATICA' ||
    ultimoResultadoComando?.cueEmitido === 'CUE_TRAVA_HIDROSTATICA'
  ) {
    cuesAtivos.push(CATALOGO_8_CUES_SONOROS_85C[6]);
  }

  // 8. CUE_POWER_SURGE_CHEFE (dispara apenas na transição de um novo Power Surge ou flag explícita do tick)
  const surgeAnt = estadoAnterior?.alvoCombate?.ultimoPowerSurgeDisparado ?? null;
  const surgeAtu = alvoAtu?.ultimoPowerSurgeDisparado ?? null;
  const novoPowerSurgeNaTransicao =
    Boolean(surgeAtu) && JSON.stringify(surgeAtu) !== JSON.stringify(surgeAnt);
  if (alvoAtu?.powerSurgeDisparadoNoTick === true || novoPowerSurgeNaTransicao) {
    cuesAtivos.push(CATALOGO_8_CUES_SONOROS_85C[7]);
  }

  return clonarProfundoCongelado(cuesAtivos);
}

export const PERFIS_ACUSTICOS_WEB_AUDIO_85C = Object.freeze({
  CUE_ESTOL_TOUCHDOWN: Object.freeze({
    tipoOscilador: 'sawtooth',
    freqInicialHz: 220,
    freqFinalHz: 55,
    duracaoSeg: 0.6,
    ganhoPico: 0.45,
  }),
  CUE_SPOOL_UP_DECOLAGEM: Object.freeze({
    tipoOscilador: 'triangle',
    freqInicialHz: 110,
    freqFinalHz: 440,
    duracaoSeg: 3.0,
    ganhoPico: 0.35,
  }),
  CUE_ALARME_FERVURA_4S: Object.freeze({
    tipoOscilador: 'square',
    freqInicialHz: 880,
    freqFinalHz: 660,
    duracaoSeg: 4.0,
    ganhoPico: 0.4,
  }),
  CUE_CURTO_CIRCUITO_AGUA: Object.freeze({
    tipoOscilador: 'sawtooth',
    freqInicialHz: 1200,
    freqFinalHz: 320,
    duracaoSeg: 3.0,
    ganhoPico: 0.3,
  }),
  CUE_CAVITACAO_SIFAO: Object.freeze({
    tipoOscilador: 'triangle',
    freqInicialHz: 160,
    freqFinalHz: 95,
    duracaoSeg: 0.8,
    ganhoPico: 0.35,
  }),
  CUE_HIPOXIA_CRITICA: Object.freeze({
    tipoOscilador: 'sine',
    freqInicialHz: 520,
    freqFinalHz: 520,
    duracaoSeg: 0.5,
    ganhoPico: 0.4,
  }),
  CUE_TRAVA_HIDROSTATICA: Object.freeze({
    tipoOscilador: 'triangle',
    freqInicialHz: 300,
    freqFinalHz: 90,
    duracaoSeg: 0.18,
    ganhoPico: 0.5,
  }),
  CUE_POWER_SURGE_CHEFE: Object.freeze({
    tipoOscilador: 'sawtooth',
    freqInicialHz: 140,
    freqFinalHz: 560,
    duracaoSeg: 1.2,
    ganhoPico: 0.45,
  }),
});

/**
 * Constrói o plano imutável do grafo WebAudio (BiquadFilterNode passa-baixa a 400 Hz em Touchdown/Spool-up
 * + nós de síntese para os cues ativos).
 */
export function construirPlanoGrafoWebAudio(
  estadoAnterior,
  estadoAtual,
  ultimoResultadoComando = null,
  opcoesDebug = {}
) {
  const naveAtu = estadoAtual.naveJogador;
  const emNoFoil = naveAtu.estadoFisico === '1_NO_FOIL';
  const ignorarFiltroSubaquaticoMutacao = opcoesDebug.ignorarFiltroSubaquatico400Hz === true;
  const frequenciaCorteHz = emNoFoil || ignorarFiltroSubaquaticoMutacao ? 20000 : 400;
  const fatorQ = emNoFoil ? 0.7071 : 1.2;

  const cuesAtivos = avaliarCuesSonorosAtivos(estadoAnterior, estadoAtual, ultimoResultadoComando);
  const faseChefe = Number(estadoAtual.alvoCombate?.faseChefe ?? estadoAtual.alvoCombate?.ultimoPowerSurgeDisparado?.fase ?? 1);
  const posDeriva = Boolean(naveAtu.spoolUpPosDeriva);

  const nosSintese = cuesAtivos.map((cue, idx) => {
    const perfil = PERFIS_ACUSTICOS_WEB_AUDIO_85C[cue.id];
    const duracaoEfetivaSeg =
      cue.id === 'CUE_SPOOL_UP_DECOLAGEM' && posDeriva
        ? cue.tempoSpoolUpPosDerivaSeg
        : perfil.duracaoSeg;
    const intervaloCicloSurgeSeg =
      cue.id === 'CUE_POWER_SURGE_CHEFE' ? (cue.ciclosPorFaseSeg[faseChefe] ?? 22) : null;

    return {
      indiceNo: idx,
      idCue: cue.id,
      tipoOscilador: perfil.tipoOscilador,
      freqInicialHz: perfil.freqInicialHz,
      freqFinalHz: perfil.freqFinalHz,
      atrasoDisparoSeg: cue.atrasoDisparoSeg ?? 0.0,
      duracaoSeg: duracaoEfetivaSeg,
      ganhoPico: perfil.ganhoPico,
      passaPeloFiltroSubaquatico: true,
      intervaloCicloSurgeSeg,
    };
  });

  const somaGanhos = nosSintese.reduce((acc, n) => acc + n.ganhoPico, 0);
  const ganhoMaster =
    opcoesDebug.mudo === true ? 0 : somaGanhos > 0.85 ? Number((0.85 / somaGanhos).toFixed(4)) : 0.85;

  return clonarProfundoCongelado({
    estadoFisico: naveAtu.estadoFisico,
    filtroSubaquaticoMaster: {
      tipo: 'lowpass',
      frequenciaCorteHz,
      fatorQ,
      ativoSubmerso: !emNoFoil,
    },
    ganhoMaster,
    totalCuesAgendados: nosSintese.length,
    cuesAtivos,
    nosSintese,
  });
}

/**
 * Aplica o plano de áudio num contexto compatível com WebAudio API (`AudioContext` / `OfflineAudioContext`),
 * conectando `OscillatorNode -> GainNode -> BiquadFilterNode (400 Hz no mar) -> GainMaster -> destination`.
 */
export function aplicarPlanoNoContextoWebAudio(audioCtx, planoAudio) {
  if (!audioCtx || typeof audioCtx.createBiquadFilter !== 'function' || typeof audioCtx.createOscillator !== 'function') {
    throw new Error('[WebAudio] Contexto de áudio inválido: esperado AudioContext com createBiquadFilter e createOscillator');
  }
  const t0 = Number.isFinite(Number(audioCtx.currentTime)) ? Number(audioCtx.currentTime) : 0;
  const filtroMaster = audioCtx.createBiquadFilter();
  filtroMaster.type = planoAudio.filtroSubaquaticoMaster.tipo;
  filtroMaster.frequency.setValueAtTime(planoAudio.filtroSubaquaticoMaster.frequenciaCorteHz, t0);
  filtroMaster.Q.setValueAtTime(planoAudio.filtroSubaquaticoMaster.fatorQ, t0);

  const ganhoMasterNode = audioCtx.createGain();
  ganhoMasterNode.gain.setValueAtTime(planoAudio.ganhoMaster, t0);
  filtroMaster.connect(ganhoMasterNode);
  ganhoMasterNode.connect(audioCtx.destination);

  const nosCriados = [];
  for (const spec of planoAudio.nosSintese) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const inicio = t0 + spec.atrasoDisparoSeg;
    const fim = inicio + spec.duracaoSeg;

    osc.type = spec.tipoOscilador;
    osc.frequency.setValueAtTime(spec.freqInicialHz, inicio);
    osc.frequency.linearRampToValueAtTime(spec.freqFinalHz, fim);

    gain.gain.setValueAtTime(0.0001, inicio);
    gain.gain.linearRampToValueAtTime(spec.ganhoPico, inicio + Math.min(0.02, spec.duracaoSeg * 0.2));
    gain.gain.linearRampToValueAtTime(0.0001, fim);

    osc.connect(gain);
    gain.connect(filtroMaster);
    osc.onended = () => {
      osc.disconnect?.();
      gain.disconnect?.();
    };
    osc.start(inicio);
    osc.stop(fim);
    nosCriados.push({ idCue: spec.idCue, tipoOscilador: spec.tipoOscilador, inicioSeg: inicio, fimSeg: fim });
  }

  return clonarProfundoCongelado({
    aplicado: true,
    tempoBaseContextoSeg: t0,
    frequenciaFiltroAplicadaHz: planoAudio.filtroSubaquaticoMaster.frequenciaCorteHz,
    ganhoMasterAplicado: planoAudio.ganhoMaster,
    nosAgendados: nosCriados,
  });
}

function avaliarFormaDeOnda(tipoOscilador, faseRad) {
  const faseNorm = ((faseRad / (2 * Math.PI)) % 1 + 1) % 1;
  if (tipoOscilador === 'square') {
    return faseNorm < 0.5 ? 1.0 : -1.0;
  }
  if (tipoOscilador === 'sawtooth') {
    return 2.0 * faseNorm - 1.0;
  }
  if (tipoOscilador === 'triangle') {
    return 1.0 - 4.0 * Math.abs(faseNorm - 0.5);
  }
  return Math.sin(faseRad);
}

/**
 * Sintetiza de verdade um buffer PCM mono (respeitando `sine`, `square`, `sawtooth`, `triangle`
 * e calculando a atenuação real pelo filtro Biquad passa-baixa de 2ª ordem em 400 Hz)
 * para qualquer um dos 8 Cues Sonoros Táticos Obrigatórios.
 */
export function sintetizarBufferPcmCueTatico(idCue, opcoes = {}) {
  const perfil = PERFIS_ACUSTICOS_WEB_AUDIO_85C[idCue];
  if (!perfil) {
    throw new Error(`[WebAudio PCM] Cue sonoro desconhecido: "${idCue}"`);
  }
  const srBruto = Number(opcoes.sampleRate ?? 8000);
  const sampleRate = Math.max(4000, Math.min(48000, Number.isFinite(srBruto) ? srBruto : 8000));
  const submerso = Boolean(opcoes.submerso);
  const durBruta = Number(opcoes.duracaoSinteseSeg ?? 0.1);
  const duracaoSinteseSeg = Math.max(0.05, Math.min(1.0, Number.isFinite(durBruta) ? durBruta : 0.1));
  const totalAmostras = Math.floor(sampleRate * duracaoSinteseSeg);
  const fc = submerso ? 400 : Math.min(3800, sampleRate * 0.45);
  const q = submerso ? 1.2 : 0.7071;

  // Coeficientes RBJ Audio EQ Cookbook para filtro Biquad Low-Pass de 2ª ordem
  const w0 = (2 * Math.PI * fc) / sampleRate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * q);
  const a0 = 1 + alpha;
  const b0 = (1 - cosW0) / 2 / a0;
  const b1 = (1 - cosW0) / a0;
  const b2 = (1 - cosW0) / 2 / a0;
  const a1 = (-2 * cosW0) / a0;
  const a2 = (1 - alpha) / a0;

  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  let faseRad = 0;
  let somaQuadrados = 0;
  let somaDiferencasPrimeiraOrdem = 0;
  const amostras = new Array(totalAmostras);

  for (let i = 0; i < totalAmostras; i += 1) {
    const progresso = i / Math.max(1, totalAmostras - 1);
    const freqBase = perfil.freqInicialHz + (perfil.freqFinalHz - perfil.freqInicialHz) * progresso;
    // Harmônico superior em 1600 Hz para medir atenuação do filtro subaquático de 400 Hz
    const faseHarm = (2 * Math.PI * 1600 * i) / sampleRate;
    faseRad += (2 * Math.PI * freqBase) / sampleRate;
    const fundamental = avaliarFormaDeOnda(perfil.tipoOscilador, faseRad);
    const harmonicoAgudo = 0.5 * Math.sin(faseHarm);
    const x0 = (fundamental + harmonicoAgudo) * perfil.ganhoPico;
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;

    const amostraClamped = Math.max(-1, Math.min(1, y0));
    amostras[i] = Number(amostraClamped.toFixed(6));
    somaQuadrados += amostraClamped * amostraClamped;
    if (i > 0) {
      const diff = amostraClamped - amostras[i - 1];
      somaDiferencasPrimeiraOrdem += diff * diff;
    }
  }

  const rmsTotal = Number(Math.sqrt(somaQuadrados / totalAmostras).toFixed(6));
  const energiaAltaFreqRelativa = Number(
    (somaDiferencasPrimeiraOrdem / Math.max(1e-9, somaQuadrados)).toFixed(6)
  );

  return clonarProfundoCongelado({
    idCue,
    tipoOscilador: perfil.tipoOscilador,
    sampleRate,
    submerso,
    frequenciaCorteHz: submerso ? 400 : 20000,
    totalAmostras,
    rmsTotal,
    energiaAltaFreqRelativa,
    amostrasPcm: amostras,
  });
}

