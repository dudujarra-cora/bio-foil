/**
 * ONDA 6 — Catálogo Acústico Multicamada, Composições Adaptativas de 32 Passos (A/B/A'/C) e Sintetizador WebAudio Client-Side
 * Dono Único (Lei N5): src/onda6-ui/sintetizador-webaudio-cliente.mjs
 *
 * Responsabilidades:
 *  - Módulo 100% puro e isomórfico (0 imports Node.js, 0 structuredClone — carrega nativamente no Browser via ES Modules
 *    em `/onda6-ui/sintetizador-webaudio-cliente.mjs`, em `/cliente.js` e em Node.js);
 *  - `CATALOGO_SFX_MULTICAMADA_BIOFOIL`: 11 timbres procedurais de 4 camadas (Corpo + Síntese FM + Ruído Filtrado c/ Multi-Rajada + Sub-Grave);
 *  - `ESTADOS_TRILHA_ADAPTATIVA_BIOFOIL`: 5 composições adaptativas de 32 passos (frases A/B/A'/C com pausas rítmicas,
 *    tríades harmônicas de pad abissal a 3 vozes, ciclo cardíaco lub-dub e percussão hidroacústica filtrada);
 *  - `criarMotorAudioMaritimoCliente`: grafo WebAudio real com agendamento sample-accurate (`ctx.currentTime` lookahead),
 *    `BiquadFilterNode` master (`400 Hz` em `2_TOUCHDOWN` / `3_SPOOL_UP` e ducking tático a `900 Hz` em Pausa Tática),
 *    espacialização `StereoPannerNode`, deduplicação de lotes SFX e limpeza `disconnect()` em `onended`.
 */

export const CATALOGO_SFX_MULTICAMADA_BIOFOIL = Object.freeze({
  SFX_DISPARO_ARPAO_CABO: Object.freeze({
    id: 'SFX_DISPARO_ARPAO_CABO',
    duracaoSeg: 0.34,
    camadaCorpo: Object.freeze({ forma: 'sawtooth', freqIniHz: 195, freqFimHz: 56, ganho: 0.32 }),
    camadaHarmonicaFm: Object.freeze({ portadoraHz: 640, moduladoraHz: 180, indiceFm: 110, freqFimHz: 1480, ganho: 0.16 }),
    camadaRuido: Object.freeze({ filtroHz: 2350, q: 1.8, decaimentoSeg: 0.09, ganho: 0.24 }),
    camadaSubGrave: Object.freeze({ freqIniHz: 88, freqFimHz: 34, ganho: 0.28 }),
  }),
  SFX_DISPARO_ESTILHACOS_FLAK: Object.freeze({
    id: 'SFX_DISPARO_ESTILHACOS_FLAK',
    duracaoSeg: 0.38,
    camadaCorpo: Object.freeze({ forma: 'square', freqIniHz: 155, freqFimHz: 48, ganho: 0.28 }),
    camadaHarmonicaFm: Object.freeze({ portadoraHz: 420, moduladoraHz: 290, indiceFm: 160, freqFimHz: 190, ganho: 0.14 }),
    camadaRuido: Object.freeze({ filtroHz: 1650, q: 1.1, decaimentoSeg: 0.26, ganho: 0.34, rajadasMs: Object.freeze([0, 48, 96]) }),
    camadaSubGrave: Object.freeze({ freqIniHz: 96, freqFimHz: 32, ganho: 0.3 }),
  }),
  SFX_FEIXE_CORTADOR_PLASMA: Object.freeze({
    id: 'SFX_FEIXE_CORTADOR_PLASMA',
    duracaoSeg: 0.52,
    camadaCorpo: Object.freeze({ forma: 'sawtooth', freqIniHz: 220, freqFimHz: 226, ganho: 0.26 }),
    camadaHarmonicaFm: Object.freeze({ portadoraHz: 880, moduladoraHz: 55, indiceFm: 95, freqFimHz: 1320, ganho: 0.2 }),
    camadaRuido: Object.freeze({ filtroHz: 2800, q: 2.4, decaimentoSeg: 0.48, ganho: 0.16 }),
    camadaSubGrave: Object.freeze({ freqIniHz: 110, freqFimHz: 73.4, ganho: 0.22 }),
  }),
  SFX_DISPARO_TORPEDO_ABISSAL: Object.freeze({
    id: 'SFX_DISPARO_TORPEDO_ABISSAL',
    duracaoSeg: 0.46,
    camadaCorpo: Object.freeze({ forma: 'triangle', freqIniHz: 135, freqFimHz: 42, ganho: 0.34 }),
    camadaHarmonicaFm: Object.freeze({ portadoraHz: 1320, moduladoraHz: 660, indiceFm: 45, freqFimHz: 990, ganho: 0.18 }),
    camadaRuido: Object.freeze({ filtroHz: 620, q: 1.5, decaimentoSeg: 0.32, ganho: 0.25 }),
    camadaSubGrave: Object.freeze({ freqIniHz: 78, freqFimHz: 28, ganho: 0.36 }),
  }),
  SFX_DISPARO_ACUSTICO_ESPORO: Object.freeze({
    id: 'SFX_DISPARO_ACUSTICO_ESPORO',
    duracaoSeg: 0.28,
    camadaCorpo: Object.freeze({ forma: 'sine', freqIniHz: 360, freqFimHz: 165, ganho: 0.3 }),
    camadaHarmonicaFm: Object.freeze({ portadoraHz: 540, moduladoraHz: 135, indiceFm: 85, freqFimHz: 270, ganho: 0.18 }),
    camadaRuido: Object.freeze({ filtroHz: 1150, q: 2.0, decaimentoSeg: 0.11, ganho: 0.14 }),
    camadaSubGrave: Object.freeze({ freqIniHz: 95, freqFimHz: 46, ganho: 0.2 }),
  }),
  SFX_IMPACTO_BRECHA_CASCO: Object.freeze({
    id: 'SFX_IMPACTO_BRECHA_CASCO',
    duracaoSeg: 0.44,
    camadaCorpo: Object.freeze({ forma: 'sawtooth', freqIniHz: 142, freqFimHz: 36, ganho: 0.34 }),
    camadaHarmonicaFm: Object.freeze({ portadoraHz: 310, moduladoraHz: 193, indiceFm: 140, freqFimHz: 88, ganho: 0.18 }),
    camadaRuido: Object.freeze({ filtroHz: 780, q: 0.9, decaimentoSeg: 0.38, ganho: 0.34 }),
    camadaSubGrave: Object.freeze({ freqIniHz: 72, freqFimHz: 26, ganho: 0.38 }),
  }),
  SFX_BARREIRA_BOLHA: Object.freeze({
    id: 'SFX_BARREIRA_BOLHA',
    duracaoSeg: 0.26,
    camadaCorpo: Object.freeze({ forma: 'sine', freqIniHz: 960, freqFimHz: 390, ganho: 0.24 }),
    camadaHarmonicaFm: Object.freeze({ portadoraHz: 1440, moduladoraHz: 480, indiceFm: 75, freqFimHz: 585, ganho: 0.16 }),
    camadaRuido: Object.freeze({ filtroHz: 2100, q: 3.1, decaimentoSeg: 0.12, ganho: 0.12 }),
    camadaSubGrave: Object.freeze({ freqIniHz: 120, freqFimHz: 65, ganho: 0.12 }),
  }),
  SFX_VALVULA_DUTO_HIDRAULICO: Object.freeze({
    id: 'SFX_VALVULA_DUTO_HIDRAULICO',
    duracaoSeg: 0.24,
    camadaCorpo: Object.freeze({ forma: 'triangle', freqIniHz: 240, freqFimHz: 118, ganho: 0.2 }),
    camadaHarmonicaFm: Object.freeze({ portadoraHz: 480, moduladoraHz: 120, indiceFm: 50, freqFimHz: 220, ganho: 0.11 }),
    camadaRuido: Object.freeze({ filtroHz: 640, q: 1.7, decaimentoSeg: 0.2, ganho: 0.25 }),
    camadaSubGrave: Object.freeze({ freqIniHz: 82, freqFimHz: 44, ganho: 0.16 }),
  }),
  SFX_FORJA_DIGESTAO_LOJA: Object.freeze({
    id: 'SFX_FORJA_DIGESTAO_LOJA',
    duracaoSeg: 0.36,
    camadaCorpo: Object.freeze({ forma: 'triangle', freqIniHz: 587.33, freqFimHz: 584, ganho: 0.24 }),
    camadaHarmonicaFm: Object.freeze({ portadoraHz: 880, moduladoraHz: 293.66, indiceFm: 65, freqFimHz: 440, ganho: 0.18 }),
    camadaRuido: Object.freeze({ filtroHz: 1450, q: 2.6, decaimentoSeg: 0.14, ganho: 0.12 }),
    camadaSubGrave: Object.freeze({ freqIniHz: 146.83, freqFimHz: 73.42, ganho: 0.18 }),
  }),
  SFX_RUGIDO_CRIATURA_DRAGA: Object.freeze({
    id: 'SFX_RUGIDO_CRIATURA_DRAGA',
    duracaoSeg: 0.68,
    camadaCorpo: Object.freeze({ forma: 'sawtooth', freqIniHz: 92.5, freqFimHz: 46.25, ganho: 0.34 }),
    camadaHarmonicaFm: Object.freeze({ portadoraHz: 138.59, moduladoraHz: 46.25, indiceFm: 90, freqFimHz: 69.3, ganho: 0.24 }),
    camadaRuido: Object.freeze({ filtroHz: 420, q: 1.9, decaimentoSeg: 0.56, ganho: 0.2 }),
    camadaSubGrave: Object.freeze({ freqIniHz: 55, freqFimHz: 30.87, ganho: 0.36 }),
  }),
  SFX_COMANDO_REJEITADO: Object.freeze({
    id: 'SFX_COMANDO_REJEITADO',
    duracaoSeg: 0.22,
    camadaCorpo: Object.freeze({ forma: 'sawtooth', freqIniHz: 168, freqFimHz: 112, ganho: 0.26 }),
    camadaHarmonicaFm: Object.freeze({ portadoraHz: 238, moduladoraHz: 119, indiceFm: 95, freqFimHz: 158, ganho: 0.18 }),
    camadaRuido: Object.freeze({ filtroHz: 890, q: 2.2, decaimentoSeg: 0.065, ganho: 0.22, rajadasMs: Object.freeze([0, 76]) }),
    camadaSubGrave: Object.freeze({ freqIniHz: 84, freqFimHz: 49, ganho: 0.22 }),
  }),
});

export const ESTADOS_TRILHA_ADAPTATIVA_BIOFOIL = Object.freeze({
  TRILHA_HANGAR_INICIO: Object.freeze({
    id: 'TRILHA_HANGAR_INICIO',
    bpm: 68,
    notasBaixoHz: Object.freeze([
      // Frase A (D Dórico contemplativo)
      73.42, 73.42, 110.0, 73.42, 87.31, 87.31, 82.41, 65.41,
      // Frase B (Subida ao VI grau Bb/C)
      58.27, 58.27, 87.31, 65.41, 65.41, 98.0, 82.41, 73.42,
      // Frase A' (Variação com oitava grave)
      73.42, 110.0, 73.42, 87.31, 98.0, 87.31, 82.41, 65.41,
      // Frase C (Cadência suspensa de doca)
      58.27, 65.41, 73.42, 110.0, 98.0, 87.31, 82.41, 65.41,
    ]),
    notasArpejoHz: Object.freeze([
      293.66, 349.23, 440.0, 523.25, 440.0, 349.23, 329.63, 293.66,
      233.08, 293.66, 349.23, 440.0, 261.63, 329.63, 392.0, 440.0,
      293.66, 440.0, 587.33, 523.25, 440.0, 392.0, 349.23, 329.63,
      233.08, 349.23, 440.0, 523.25, 392.0, 349.23, 329.63, 261.63,
    ]),
    mascaraRitmoArpejo: Object.freeze([
      1, 1, 1, 0, 1, 0, 1, 0,
      1, 0, 1, 1, 0, 1, 1, 0,
      1, 1, 0, 1, 1, 0, 1, 0,
      1, 0, 1, 1, 0, 1, 0, 0,
    ]),
    notasPadAcordeHz: Object.freeze([146.83, 116.54, 146.83, 130.81]),
    percussaoAtiva: false,
    ganhoBaixo: 0.08,
    ganhoArpejo: 0.045,
    formaBaixo: 'triangle',
    formaArpejo: 'sine',
  }),
  TRILHA_CARTA_MAPA: Object.freeze({
    id: 'TRILHA_CARTA_MAPA',
    bpm: 76,
    notasBaixoHz: Object.freeze([
      // Frase A (C Menor Hidrográfico)
      65.41, 65.41, 98.0, 77.78, 73.42, 65.41, 58.27, 65.41,
      // Frase B (Ab Lydian -> G Phrygian)
      51.91, 51.91, 77.78, 87.31, 49.0, 73.42, 65.41, 58.27,
      // Frase A' (Pulso de Sonar em navegação)
      65.41, 98.0, 65.41, 77.78, 87.31, 77.78, 73.42, 58.27,
      // Frase C (Aproximação da Frente da Draga)
      51.91, 58.27, 65.41, 77.78, 73.42, 65.41, 58.27, 49.0,
    ]),
    notasArpejoHz: Object.freeze([
      261.63, 311.13, 392.0, 466.16, 392.0, 311.13, 293.66, 261.63,
      207.65, 261.63, 311.13, 392.0, 196.0, 246.94, 293.66, 392.0,
      261.63, 392.0, 523.25, 466.16, 392.0, 349.23, 311.13, 293.66,
      207.65, 311.13, 392.0, 466.16, 392.0, 311.13, 293.66, 246.94,
    ]),
    mascaraRitmoArpejo: Object.freeze([
      1, 0, 1, 1, 0, 1, 0, 0,
      1, 0, 1, 1, 0, 1, 1, 0,
      1, 1, 0, 1, 0, 1, 0, 0,
      1, 0, 1, 0, 1, 1, 0, 0,
    ]),
    notasPadAcordeHz: Object.freeze([130.81, 103.83, 130.81, 98.0]),
    percussaoAtiva: false,
    ganhoBaixo: 0.095,
    ganhoArpejo: 0.05,
    formaBaixo: 'triangle',
    formaArpejo: 'triangle',
  }),
  TRILHA_RECIFE_LOJA: Object.freeze({
    id: 'TRILHA_RECIFE_LOJA',
    bpm: 72,
    notasBaixoHz: Object.freeze([
      // Frase A (Simbiose Bioluminescente em F Maior 7 / D Menor 9)
      87.31, 87.31, 110.0, 130.81, 73.42, 73.42, 110.0, 98.0,
      // Frase B (Forja Orgânica Bb Maj7 -> C9)
      58.27, 87.31, 110.0, 87.31, 65.41, 98.0, 110.0, 82.41,
      // Frase A'
      87.31, 130.81, 110.0, 87.31, 73.42, 110.0, 130.81, 98.0,
      // Frase C (Resolução cristalina)
      58.27, 65.41, 73.42, 87.31, 98.0, 110.0, 87.31, 65.41,
    ]),
    notasArpejoHz: Object.freeze([
      349.23, 440.0, 523.25, 659.25, 587.33, 523.25, 440.0, 392.0,
      233.08, 349.23, 440.0, 523.25, 261.63, 392.0, 440.0, 523.25,
      349.23, 523.25, 659.25, 587.33, 523.25, 440.0, 392.0, 349.23,
      293.66, 349.23, 440.0, 523.25, 587.33, 523.25, 440.0, 329.63,
    ]),
    mascaraRitmoArpejo: Object.freeze([
      1, 1, 0, 1, 0, 1, 1, 0,
      1, 0, 1, 1, 0, 1, 0, 1,
      1, 1, 0, 1, 1, 0, 1, 0,
      1, 0, 1, 0, 1, 1, 0, 0,
    ]),
    notasPadAcordeHz: Object.freeze([174.61, 116.54, 146.83, 130.81]),
    percussaoAtiva: false,
    ganhoBaixo: 0.085,
    ganhoArpejo: 0.055,
    formaBaixo: 'sine',
    formaArpejo: 'sine',
  }),
  TRILHA_COMBATE_TENSIVO: Object.freeze({
    id: 'TRILHA_COMBATE_TENSIVO',
    bpm: 108,
    notasBaixoHz: Object.freeze([
      // Frase A (Ostinato propulsivo no Foil — D Menor / Eb Frígio)
      73.42, 73.42, 146.83, 73.42, 77.78, 73.42, 87.31, 82.41,
      // Frase B (Modulação tática Bb -> C -> A7)
      58.27, 58.27, 116.54, 58.27, 65.41, 65.41, 55.0, 82.41,
      // Frase A' (Escalada de artilharia dorsal)
      73.42, 146.83, 73.42, 110.0, 87.31, 82.41, 77.78, 65.41,
      // Frase C (Turnaround sincopado)
      58.27, 65.41, 73.42, 87.31, 82.41, 77.78, 65.41, 55.0,
    ]),
    notasArpejoHz: Object.freeze([
      293.66, 349.23, 440.0, 293.66, 311.13, 466.16, 440.0, 349.23,
      233.08, 293.66, 349.23, 466.16, 261.63, 329.63, 392.0, 440.0,
      293.66, 440.0, 587.33, 440.0, 466.16, 440.0, 349.23, 311.13,
      233.08, 261.63, 293.66, 349.23, 329.63, 311.13, 261.63, 220.0,
    ]),
    mascaraRitmoArpejo: Object.freeze([
      1, 0, 1, 1, 1, 0, 1, 0,
      1, 0, 1, 1, 0, 1, 1, 0,
      1, 1, 1, 0, 1, 0, 1, 1,
      1, 0, 1, 1, 1, 0, 1, 0,
    ]),
    notasPadAcordeHz: Object.freeze([146.83, 116.54, 146.83, 110.0]),
    percussaoAtiva: true,
    ganhoBaixo: 0.125,
    ganhoArpejo: 0.065,
    formaBaixo: 'sawtooth',
    formaArpejo: 'triangle',
  }),
  TRILHA_CHEFE_DRAGA: Object.freeze({
    id: 'TRILHA_CHEFE_DRAGA',
    bpm: 124,
    notasBaixoHz: Object.freeze([
      // Frase A (Fortaleza Extrativista — C Locrian / Phrygian Dominant c/ trítono Gb)
      65.41, 65.41, 69.3, 65.41, 92.5, 87.31, 65.41, 61.74,
      // Frase B (Fornalha Geotérmica Ab -> G7)
      51.91, 51.91, 103.83, 51.91, 49.0, 49.0, 98.0, 61.74,
      // Frase A' (Power Surge iminente)
      65.41, 130.81, 69.3, 92.5, 98.0, 92.5, 82.41, 69.3,
      // Frase C (Colapso Industrial)
      51.91, 55.0, 61.74, 65.41, 69.3, 82.41, 92.5, 61.74,
    ]),
    notasArpejoHz: Object.freeze([
      261.63, 277.18, 369.99, 392.0, 369.99, 311.13, 277.18, 246.94,
      207.65, 261.63, 311.13, 415.3, 196.0, 246.94, 293.66, 392.0,
      261.63, 392.0, 523.25, 466.16, 369.99, 392.0, 311.13, 277.18,
      207.65, 220.0, 246.94, 261.63, 277.18, 329.63, 369.99, 493.88,
    ]),
    mascaraRitmoArpejo: Object.freeze([
      1, 1, 0, 1, 1, 0, 1, 1,
      1, 0, 1, 1, 1, 0, 1, 1,
      1, 1, 1, 0, 1, 1, 0, 1,
      1, 1, 0, 1, 1, 1, 0, 1,
    ]),
    notasPadAcordeHz: Object.freeze([130.81, 103.83, 130.81, 98.0]),
    percussaoAtiva: true,
    ganhoBaixo: 0.145,
    ganhoArpejo: 0.08,
    formaBaixo: 'sawtooth',
    formaArpejo: 'square',
  }),
});

export function criarMotorAudioMaritimoCliente(ambienteExplicito) {
  const escopoGlobal =
    ambienteExplicito ||
    (typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : {});
  let ctx = null;
  let filtroMaster = null;
  let ganhoMaster = null;
  let compressor = null;
  let bufRuido = null;
  let ganhoChuva = null;
  let ganhoFoil = null;
  let ganhoAbissal = null;
  let filtroFoil = null;
  let mudo = false;
  let volume = 0.82;
  let pausaTaticaAtiva = false;
  let estadoFisicoAtual = '1_NO_FOIL';
  let fcPlanoBaseHz = 20000;
  let ultimoBeatCoracaoMs = -10000;
  let ultimoStepTrilhaMs = -10000;
  let proximoTempoStepCtxSeg = null;
  let proximoBeatCoracaoCtxSeg = null;
  let ultimoCtxTimeObservado = -1;
  let relogioCtxDinamico = false;
  let passoTrilha = 0;
  let estadoTrilhaId = 'TRILHA_HANGAR_INICIO';
  let modoFimDeRunAtual = null;
  let escalaTomTrilhaAtual = 1.0;
  let bpmTrilhaOverride = null;
  let bpmCoracao = 62;
  let ultimoAssinaturaLoteSfx = '';

  function calcularCorteEfetivoHz() {
    if (estadoFisicoAtual !== '1_NO_FOIL') return Math.min(400, fcPlanoBaseHz);
    if (pausaTaticaAtiva) return Math.min(900, fcPlanoBaseHz);
    return fcPlanoBaseHz;
  }

  function garantirGrafo() {
    if (ctx) {
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        ctx.resume().catch(() => {});
      }
      return true;
    }
    const Ctor = escopoGlobal.AudioContext || escopoGlobal.webkitAudioContext;
    if (typeof Ctor !== 'function') return false;
    ctx = new Ctor();
    filtroMaster = ctx.createBiquadFilter();
    filtroMaster.type = 'lowpass';
    filtroMaster.frequency.value = 20000;
    filtroMaster.Q.value = 0.7071;

    compressor = typeof ctx.createDynamicsCompressor === 'function' ? ctx.createDynamicsCompressor() : null;
    // IMPORTANTE: ganhoMaster é sempre o primeiro createGain() do grafo master
    ganhoMaster = ctx.createGain();
    ganhoMaster.gain.value = mudo ? 0 : volume;

    if (compressor) {
      filtroMaster.connect(compressor);
      compressor.connect(ganhoMaster);
    } else {
      filtroMaster.connect(ganhoMaster);
    }
    ganhoMaster.connect(ctx.destination);

    // Buffer cíclico de ruído rosa marítimo (3 segundos) p/ chuva, lâmina do hidrofólio, percussão e 4ª camada dos SFX
    const tamRuido = ctx.sampleRate * 3;
    bufRuido = ctx.createBuffer(1, tamRuido, ctx.sampleRate);
    const canal = bufRuido.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let s = 0x12345678;
    for (let i = 0; i < tamRuido; i += 1) {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      const w = ((s >>> 0) / 0xffffffff) * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.96300 * b1 + w * 0.2965164;
      b2 = 0.57000 * b2 + w * 1.0526913;
      canal[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + w * 0.1848) * 0.18));
    }

    const srcChuva = ctx.createBufferSource();
    srcChuva.buffer = bufRuido;
    srcChuva.loop = true;
    const fltChuva = ctx.createBiquadFilter();
    fltChuva.type = 'bandpass';
    fltChuva.frequency.value = 1850;
    fltChuva.Q.value = 0.85;
    ganhoChuva = ctx.createGain();
    ganhoChuva.gain.value = 0.065;
    srcChuva.connect(fltChuva);
    fltChuva.connect(ganhoChuva);
    ganhoChuva.connect(filtroMaster);
    srcChuva.start();

    const srcFoil = ctx.createBufferSource();
    srcFoil.buffer = bufRuido;
    srcFoil.loop = true;
    filtroFoil = ctx.createBiquadFilter();
    filtroFoil.type = 'bandpass';
    filtroFoil.frequency.value = 1120;
    filtroFoil.Q.value = 1.8;
    ganhoFoil = ctx.createGain();
    ganhoFoil.gain.value = 0.055;
    srcFoil.connect(filtroFoil);
    filtroFoil.connect(ganhoFoil);
    ganhoFoil.connect(filtroMaster);
    srcFoil.start();

    const oscAbissal = ctx.createOscillator();
    oscAbissal.type = 'triangle';
    oscAbissal.frequency.value = 52;
    const fltAbissal = ctx.createBiquadFilter();
    fltAbissal.type = 'lowpass';
    fltAbissal.frequency.value = 165;
    ganhoAbissal = ctx.createGain();
    ganhoAbissal.gain.value = 0.04;
    oscAbissal.connect(fltAbissal);
    fltAbissal.connect(ganhoAbissal);
    ganhoAbissal.connect(filtroMaster);
    oscAbissal.start();

    return true;
  }

  function dispararSfxMulticamada(idSfx, atrasoSeg = 0, panValor = 0) {
    if (mudo || !garantirGrafo()) return;
    const spec = CATALOGO_SFX_MULTICAMADA_BIOFOIL[idSfx];
    if (!spec) return;
    const t0 = ctx.currentTime + Math.max(0, atrasoSeg);
    const tFim = t0 + spec.duracaoSeg;

    const gBusSfx = ctx.createGain();
    gBusSfx.gain.setValueAtTime(1, t0);
    let pannerSfx = null;
    if (typeof ctx.createStereoPanner === 'function') {
      pannerSfx = ctx.createStereoPanner();
      const panLimpo = Math.max(-1, Math.min(1, Number(panValor) || 0));
      if (pannerSfx.pan && typeof pannerSfx.pan.setValueAtTime === 'function') {
        pannerSfx.pan.setValueAtTime(panLimpo, t0);
      } else if (pannerSfx.pan) {
        pannerSfx.pan.value = panLimpo;
      }
      gBusSfx.connect(pannerSfx);
      pannerSfx.connect(filtroMaster);
    } else {
      gBusSfx.connect(filtroMaster);
    }

    const rajadasMs =
      bufRuido && spec.camadaRuido
        ? Array.isArray(spec.camadaRuido.rajadasMs) && spec.camadaRuido.rajadasMs.length > 0
          ? spec.camadaRuido.rajadasMs
          : [0]
        : [];
    let camadasRestantes = 3 + rajadasMs.length;
    const liberarBusSeConcluido = () => {
      camadasRestantes -= 1;
      if (camadasRestantes <= 0) {
        gBusSfx.disconnect();
        if (pannerSfx) pannerSfx.disconnect();
      }
    };

    const oscCorpo = ctx.createOscillator();
    const gCorpo = ctx.createGain();
    oscCorpo.type = spec.camadaCorpo.forma;
    oscCorpo.frequency.setValueAtTime(spec.camadaCorpo.freqIniHz, t0);
    oscCorpo.frequency.exponentialRampToValueAtTime(Math.max(20, spec.camadaCorpo.freqFimHz), tFim);
    gCorpo.gain.setValueAtTime(0.0001, t0);
    if (rajadasMs.length > 1) {
      for (let rIdx = 0; rIdx < rajadasMs.length; rIdx += 1) {
        const tB = t0 + Math.max(0, Number(rajadasMs[rIdx]) || 0) / 1000;
        const pesoB = Math.max(0.45, 1 - rIdx * 0.14);
        gCorpo.gain.setValueAtTime(0.002, tB);
        gCorpo.gain.linearRampToValueAtTime(spec.camadaCorpo.ganho * 0.72 * pesoB, tB + 0.008);
      }
      gCorpo.gain.exponentialRampToValueAtTime(0.0001, tFim);
    } else {
      gCorpo.gain.linearRampToValueAtTime(spec.camadaCorpo.ganho * 0.7, t0 + 0.01);
      gCorpo.gain.exponentialRampToValueAtTime(0.0001, tFim);
    }
    oscCorpo.connect(gCorpo);
    gCorpo.connect(gBusSfx);
    oscCorpo.onended = () => {
      oscCorpo.disconnect();
      gCorpo.disconnect();
      liberarBusSeConcluido();
    };
    oscCorpo.start(t0);
    oscCorpo.stop(tFim + 0.02);

    const oscSub = ctx.createOscillator();
    const gSub = ctx.createGain();
    oscSub.type = 'sine';
    oscSub.frequency.setValueAtTime(spec.camadaSubGrave.freqIniHz, t0);
    oscSub.frequency.exponentialRampToValueAtTime(Math.max(22, spec.camadaSubGrave.freqFimHz), tFim);
    gSub.gain.setValueAtTime(spec.camadaSubGrave.ganho * 0.75, t0);
    gSub.gain.exponentialRampToValueAtTime(0.0001, tFim);
    oscSub.connect(gSub);
    gSub.connect(gBusSfx);
    oscSub.onended = () => {
      oscSub.disconnect();
      gSub.disconnect();
      liberarBusSeConcluido();
    };
    oscSub.start(t0);
    oscSub.stop(tFim + 0.02);

    const oscPort = ctx.createOscillator();
    const oscMod = ctx.createOscillator();
    const gMod = ctx.createGain();
    const gPort = ctx.createGain();
    oscPort.type = 'sine';
    oscPort.frequency.setValueAtTime(spec.camadaHarmonicaFm.portadoraHz, t0);
    oscPort.frequency.exponentialRampToValueAtTime(Math.max(30, spec.camadaHarmonicaFm.freqFimHz), tFim);
    oscMod.frequency.setValueAtTime(spec.camadaHarmonicaFm.moduladoraHz, t0);
    gMod.gain.setValueAtTime(spec.camadaHarmonicaFm.indiceFm, t0);
    gPort.gain.setValueAtTime(spec.camadaHarmonicaFm.ganho * 0.65, t0);
    gPort.gain.exponentialRampToValueAtTime(0.0001, tFim);
    oscMod.connect(gMod);
    gMod.connect(oscPort.frequency);
    oscPort.connect(gPort);
    gPort.connect(gBusSfx);
    oscMod.onended = () => {
      oscMod.disconnect();
      gMod.disconnect();
    };
    oscPort.onended = () => {
      oscPort.disconnect();
      gPort.disconnect();
      liberarBusSeConcluido();
    };
    oscMod.start(t0);
    oscPort.start(t0);
    oscMod.stop(tFim + 0.02);
    oscPort.stop(tFim + 0.02);

    for (let rIdx = 0; rIdx < rajadasMs.length; rIdx += 1) {
      const atrasoBurstSeg = Math.max(0, Number(rajadasMs[rIdx]) || 0) / 1000;
      const tBurst = t0 + atrasoBurstSeg;
      const decSeg = rajadasMs.length > 1
        ? Math.min(0.09, Math.max(0.035, (spec.camadaRuido.decaimentoSeg || 0.12) * 0.42))
        : spec.camadaRuido.decaimentoSeg || 0.12;
      const tFimRuido = Math.min(tFim + 0.03, tBurst + Math.max(0.045, decSeg * 2.2));
      const srcRuido = ctx.createBufferSource();
      srcRuido.buffer = bufRuido;
      const fltRuido = ctx.createBiquadFilter();
      fltRuido.type = 'bandpass';
      fltRuido.frequency.setValueAtTime((spec.camadaRuido.filtroHz || 1400) * (1 - rIdx * 0.06), tBurst);
      fltRuido.Q.setValueAtTime(Math.max(0.5, spec.camadaRuido.q || 1.2), tBurst);
      const gRuido = ctx.createGain();
      const pesoBurst = Math.max(0.5, 1 - rIdx * 0.12);
      gRuido.gain.setValueAtTime(Math.max(0.0002, (spec.camadaRuido.ganho || 0.25) * 0.82 * pesoBurst), tBurst);
      gRuido.gain.exponentialRampToValueAtTime(0.0001, tFimRuido);
      srcRuido.connect(fltRuido);
      fltRuido.connect(gRuido);
      gRuido.connect(gBusSfx);
      srcRuido.onended = () => {
        srcRuido.disconnect();
        fltRuido.disconnect();
        gRuido.disconnect();
        liberarBusSeConcluido();
      };
      const offRuido = ((Math.floor(tBurst * 97) + rIdx * 7) % 20) * 0.1;
      srcRuido.start(tBurst, offRuido, Math.max(0.05, tFimRuido - tBurst + 0.01));
    }
  }

  function aplicarPlanoPaisagem(plano) {
    if (!plano) return;
    if (typeof plano.mudo === 'boolean') {
      mudo = plano.mudo;
    }
    if (typeof plano.volumeUsuario === 'number' && Number.isFinite(plano.volumeUsuario)) {
      volume = Math.max(0, Math.min(1, plano.volumeUsuario));
    }
    if (typeof plano.pausaTaticaAtiva === 'boolean') {
      pausaTaticaAtiva = plano.pausaTaticaAtiva;
    }
    if (typeof plano.estadoFisico === 'string') {
      estadoFisicoAtual = plano.estadoFisico;
    }
    fcPlanoBaseHz = plano.filtroSubaquaticoMaster?.frequenciaCorteHz ?? 20000;
    if (!garantirGrafo()) return;
    const t0 = ctx.currentTime;
    const fcAlvo = calcularCorteEfetivoHz();
    const qAlvo =
      estadoFisicoAtual !== '1_NO_FOIL'
        ? plano.filtroSubaquaticoMaster?.fatorQ ?? 1.25
        : pausaTaticaAtiva
          ? 0.95
          : plano.filtroSubaquaticoMaster?.fatorQ ?? 0.7071;
    filtroMaster.frequency.setTargetAtTime(fcAlvo, t0, 0.08);
    filtroMaster.Q.setTargetAtTime(qAlvo, t0, 0.08);
    if (mudo) {
      ganhoMaster.gain.value = 0;
    }
    ganhoMaster.gain.setTargetAtTime(mudo ? 0 : volume, t0, 0.03);

    const emFoil = estadoFisicoAtual === '1_NO_FOIL';
    const fatorAmbPausa = pausaTaticaAtiva ? 0.65 : 1.0;
    if (ganhoChuva) ganhoChuva.gain.setTargetAtTime((emFoil ? 0.065 : 0.015) * fatorAmbPausa, t0, 0.12);
    if (ganhoFoil) {
      const camFoil = (plano.camadasAmbiente || []).find((c) => c.id === 'LAMINA_HIDROFOLIO_FOIL');
      if (filtroFoil && camFoil?.freqCentralHz) {
        filtroFoil.frequency.setTargetAtTime(camFoil.freqCentralHz, t0, 0.1);
      }
      ganhoFoil.gain.setTargetAtTime((emFoil ? 0.055 : 0.006) * fatorAmbPausa, t0, 0.12);
    }
    if (ganhoAbissal) ganhoAbissal.gain.setTargetAtTime(emFoil ? 0.035 : 0.145, t0, 0.12);

    if (plano.trilhaAdaptativa?.idEstado && plano.trilhaAdaptativa.idEstado !== estadoTrilhaId) {
      estadoTrilhaId = plano.trilhaAdaptativa.idEstado;
      passoTrilha = 0;
      proximoTempoStepCtxSeg = null;
    }
    modoFimDeRunAtual = plano.trilhaAdaptativa?.modoFimDeRun ?? null;
    escalaTomTrilhaAtual = Number(plano.trilhaAdaptativa?.escalaTomTrilha ?? 1.0) || 1.0;
    bpmTrilhaOverride = Number(plano.trilhaAdaptativa?.bpm ?? 0) || null;
    const camCoracao = (plano.camadasAmbiente || []).find((c) => c.id === 'PULSO_CORACAO_BIO_ELETRICO');
    if (camCoracao?.bpmCoracao) bpmCoracao = camCoracao.bpmCoracao;

    const assinaturaLote = typeof plano.assinaturaLoteSfx === 'string' ? plano.assinaturaLoteSfx : '';
    if (assinaturaLote && assinaturaLote === ultimoAssinaturaLoteSfx) {
      return;
    }
    if (assinaturaLote) {
      ultimoAssinaturaLoteSfx = assinaturaLote;
    }

    const listaSfxMulti = Array.isArray(plano.sfxMulticamada) ? plano.sfxMulticamada : [];
    if (listaSfxMulti.length > 0) {
      for (const sfx of listaSfxMulti) {
        dispararSfxMulticamada(sfx.idSfx, sfx.atrasoSeg || 0, sfx.pan || 0);
      }
    } else {
      const nosCues = plano.planoTatico85C?.nosSintese ?? plano.nosSintese ?? [];
      for (const spec of nosCues) {
        if (mudo) break;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const ini = t0 + (spec.atrasoDisparoSeg || 0);
        const fim = ini + (spec.duracaoSeg || 0.3);
        osc.type = spec.tipoOscilador || 'triangle';
        osc.frequency.setValueAtTime(spec.freqInicialHz || 220, ini);
        osc.frequency.linearRampToValueAtTime(spec.freqFinalHz || 110, fim);
        gain.gain.setValueAtTime(0.0001, ini);
        gain.gain.linearRampToValueAtTime((spec.ganhoPico || 0.3) * 0.75, ini + 0.015);
        gain.gain.linearRampToValueAtTime(0.0001, fim);
        osc.connect(gain);
        gain.connect(filtroMaster);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
        osc.start(ini);
        osc.stop(fim + 0.01);
      }
    }
  }

  function agendarStepMusicalEm(trilha, tStep, durStepExatoSeg) {
    const tamSeq = trilha.notasBaixoHz.length;
    const idx = passoTrilha % tamSeq;
    passoTrilha += 1;
    const durStep = Math.min(0.36, durStepExatoSeg * 0.9);
    const atenPausa = pausaTaticaAtiva ? 0.58 : 1.0;

    // 1. Linha de baixo sintetizada com articulação dinâmica por compasso (32 passos A/B/A'/C)
    const acentoBaixo = idx % 4 === 0 ? 1.0 : idx % 2 === 0 ? 0.82 : 0.68;
    const oscB = ctx.createOscillator();
    const fltB = ctx.createBiquadFilter();
    const gB = ctx.createGain();
    oscB.type = modoFimDeRunAtual === 'DERROTA' ? 'sine' : trilha.formaBaixo;
    oscB.frequency.setValueAtTime(trilha.notasBaixoHz[idx] * escalaTomTrilhaAtual, tStep);
    fltB.type = 'lowpass';
    fltB.frequency.setValueAtTime(modoFimDeRunAtual === 'DERROTA' ? 240 : idx % 8 === 0 ? 440 : 320, tStep);
    gB.gain.setValueAtTime(0.0001, tStep);
    gB.gain.linearRampToValueAtTime(trilha.ganhoBaixo * 0.76 * acentoBaixo * atenPausa, tStep + 0.012);
    gB.gain.exponentialRampToValueAtTime(0.0001, tStep + durStep);
    oscB.connect(fltB);
    fltB.connect(gB);
    gB.connect(filtroMaster);
    oscB.onended = () => {
      oscB.disconnect();
      fltB.disconnect();
      gB.disconnect();
    };
    oscB.start(tStep);
    oscB.stop(tStep + durStep + 0.02);

    // 2. Tríade harmônica de pad abissal a 3 vozes (fundamental + terça modal + quinta/trítono com chorus analógico)
    if (idx % 8 === 0 && Array.isArray(trilha.notasPadAcordeHz)) {
      const notaPad = trilha.notasPadAcordeHz[Math.floor(idx / 8) % trilha.notasPadAcordeHz.length] * escalaTomTrilhaAtual;
      if (notaPad > 0) {
        const durPad = Math.min(2.6, durStepExatoSeg * 7.4);
        const ratiosAcorde =
          modoFimDeRunAtual === 'VITORIA' || trilha.id === 'TRILHA_RECIFE_LOJA'
            ? [1.0, 1.2599, 1.4983]
            : modoFimDeRunAtual === 'DERROTA' || trilha.id === 'TRILHA_CHEFE_DRAGA'
              ? [1.0, 1.1892, 1.4142]
              : [1.0, 1.1892, 1.4983];
        const detunesChorus = [0.9982, 1.0, 1.0018];
        const fltPad = ctx.createBiquadFilter();
        const gPad = ctx.createGain();
        fltPad.type = 'lowpass';
        fltPad.frequency.setValueAtTime(560, tStep);
        gPad.gain.setValueAtTime(0.0001, tStep);
        gPad.gain.linearRampToValueAtTime(trilha.ganhoArpejo * 0.64 * atenPausa, tStep + Math.min(0.24, durPad * 0.25));
        gPad.gain.exponentialRampToValueAtTime(0.0001, tStep + durPad);
        fltPad.connect(gPad);
        gPad.connect(filtroMaster);
        let vozesRestantes = ratiosAcorde.length;
        for (let vIdx = 0; vIdx < ratiosAcorde.length; vIdx += 1) {
          const oscVoz = ctx.createOscillator();
          oscVoz.type = vIdx === 1 ? 'sine' : 'triangle';
          oscVoz.frequency.setValueAtTime(notaPad * ratiosAcorde[vIdx] * detunesChorus[vIdx], tStep);
          oscVoz.connect(fltPad);
          oscVoz.onended = () => {
            oscVoz.disconnect();
            vozesRestantes -= 1;
            if (vozesRestantes <= 0) {
              fltPad.disconnect();
              gPad.disconnect();
            }
          };
          oscVoz.start(tStep);
          oscVoz.stop(tStep + durPad + 0.03);
        }
      }
    }

    // 3. Arpejo melódico cristalino com pausas respiratórias (mascaraRitmoArpejo)
    const tocaArpejo = !trilha.mascaraRitmoArpejo || trilha.mascaraRitmoArpejo[idx] !== 0;
    if (tocaArpejo) {
      const oscA = ctx.createOscillator();
      const gA = ctx.createGain();
      oscA.type = modoFimDeRunAtual === 'DERROTA' ? 'sine' : trilha.formaArpejo;
      oscA.frequency.setValueAtTime(trilha.notasArpejoHz[idx] * escalaTomTrilhaAtual, tStep);
      gA.gain.setValueAtTime(0.0001, tStep);
      gA.gain.linearRampToValueAtTime(trilha.ganhoArpejo * 0.72 * atenPausa, tStep + 0.01);
      gA.gain.exponentialRampToValueAtTime(0.0001, tStep + durStep * 0.8);
      oscA.connect(gA);
      gA.connect(filtroMaster);
      oscA.onended = () => {
        oscA.disconnect();
        gA.disconnect();
      };
      oscA.start(tStep);
      oscA.stop(tStep + durStep * 0.84 + 0.02);
    }

    // 4. Pulso rítmico hidroacústico sutil em Combate / Chefe Draga
    if (trilha.percussaoAtiva && bufRuido && (idx % 2 === 1 || idx % 8 === 6)) {
      const srcP = ctx.createBufferSource();
      srcP.buffer = bufRuido;
      const fltP = ctx.createBiquadFilter();
      fltP.type = 'bandpass';
      fltP.frequency.setValueAtTime(idx % 4 === 3 ? 2600 : 1750, tStep);
      fltP.Q.setValueAtTime(2.6, tStep);
      const gP = ctx.createGain();
      gP.gain.setValueAtTime(0.028 * atenPausa, tStep);
      gP.gain.exponentialRampToValueAtTime(0.0001, tStep + 0.055);
      srcP.connect(fltP);
      fltP.connect(gP);
      gP.connect(filtroMaster);
      srcP.onended = () => {
        srcP.disconnect();
        fltP.disconnect();
        gP.disconnect();
      };
      srcP.start(tStep, (idx * 0.07) % 2.2, 0.07);
    }
  }

  function agendarBatimentoCardiacoEm(tBeat) {
    const ganhoPicoSistole = bpmCoracao > 100 ? 0.11 : 0.055;
    // Sístole (lub) + Diástole (dub) orgânica do Coração Bio-Elétrico
    const pulsos = [
      { atraso: 0, fIni: 68, fFim: 36, ganho: ganhoPicoSistole, dur: 0.14 },
      { atraso: 0.18, fIni: 52, fFim: 30, ganho: ganhoPicoSistole * 0.62, dur: 0.11 },
    ];
    for (const p of pulsos) {
      const tp = tBeat + p.atraso;
      const oscH = ctx.createOscillator();
      const gH = ctx.createGain();
      oscH.type = 'sine';
      oscH.frequency.setValueAtTime(p.fIni, tp);
      oscH.frequency.exponentialRampToValueAtTime(p.fFim, tp + p.dur);
      gH.gain.setValueAtTime(0.0001, tp);
      gH.gain.linearRampToValueAtTime(p.ganho, tp + 0.014);
      gH.gain.exponentialRampToValueAtTime(0.0001, tp + p.dur + 0.02);
      oscH.connect(gH);
      gH.connect(filtroMaster);
      oscH.onended = () => {
        oscH.disconnect();
        gH.disconnect();
      };
      oscH.start(tp);
      oscH.stop(tp + p.dur + 0.03);
    }
  }

  function pulsarQuadroMusical60Fps(agoraMs) {
    if (mudo || !ctx || ctx.state !== 'running') return;
    const trilha =
      ESTADOS_TRILHA_ADAPTATIVA_BIOFOIL[estadoTrilhaId] ||
      ESTADOS_TRILHA_ADAPTATIVA_BIOFOIL.TRILHA_HANGAR_INICIO;
    const durStepExatoSeg = 60 / (bpmTrilhaOverride || trilha.bpm) / 2;
    const intervaloStepMs = durStepExatoSeg * 1000;
    const intervaloBeatSeg = 60 / Math.max(45, bpmCoracao);
    const intervaloBeatMs = intervaloBeatSeg * 1000;

    if (ultimoCtxTimeObservado >= 0 && ctx.currentTime > ultimoCtxTimeObservado) {
      relogioCtxDinamico = true;
    }
    ultimoCtxTimeObservado = ctx.currentTime;

    if (relogioCtxDinamico) {
      // Agendamento sample-accurate no relógio de hardware WebAudio (janela lookahead de 100 ms, 0 jitter de rAF)
      const janelaLookaheadSeg = 0.1;
      if (proximoTempoStepCtxSeg === null || proximoTempoStepCtxSeg < ctx.currentTime - 0.25) {
        proximoTempoStepCtxSeg = ctx.currentTime + 0.005;
      }
      let guardSteps = 0;
      while (proximoTempoStepCtxSeg <= ctx.currentTime + janelaLookaheadSeg && guardSteps < 4) {
        agendarStepMusicalEm(trilha, proximoTempoStepCtxSeg, durStepExatoSeg);
        proximoTempoStepCtxSeg += durStepExatoSeg;
        ultimoStepTrilhaMs = agoraMs;
        guardSteps += 1;
      }

      if (proximoBeatCoracaoCtxSeg === null || proximoBeatCoracaoCtxSeg < ctx.currentTime - 0.35) {
        proximoBeatCoracaoCtxSeg = ctx.currentTime + 0.01;
      }
      let guardBeats = 0;
      while (proximoBeatCoracaoCtxSeg <= ctx.currentTime + janelaLookaheadSeg && guardBeats < 2) {
        agendarBatimentoCardiacoEm(proximoBeatCoracaoCtxSeg);
        proximoBeatCoracaoCtxSeg += intervaloBeatSeg;
        ultimoBeatCoracaoMs = agoraMs;
        guardBeats += 1;
      }
      return;
    }

    // Fallback determinístico quando o stub de teste mantém ctx.currentTime estático em 0
    if (agoraMs - ultimoStepTrilhaMs >= intervaloStepMs) {
      ultimoStepTrilhaMs = agoraMs;
      agendarStepMusicalEm(trilha, ctx.currentTime, durStepExatoSeg);
    }
    if (agoraMs - ultimoBeatCoracaoMs >= intervaloBeatMs) {
      ultimoBeatCoracaoMs = agoraMs;
      agendarBatimentoCardiacoEm(ctx.currentTime);
    }
  }

  function definirPausaTatica(ativa) {
    pausaTaticaAtiva = Boolean(ativa);
    if (ctx && filtroMaster) {
      const t0 = ctx.currentTime;
      filtroMaster.frequency.setTargetAtTime(calcularCorteEfetivoHz(), t0, 0.06);
      filtroMaster.Q.setTargetAtTime(
        estadoFisicoAtual !== '1_NO_FOIL' ? 1.25 : pausaTaticaAtiva ? 0.95 : 0.7071,
        t0,
        0.06
      );
    }
    return pausaTaticaAtiva;
  }

  function alternarMudo() {
    mudo = !mudo;
    if (ctx && ganhoMaster) {
      if (mudo) ganhoMaster.gain.value = 0;
      ganhoMaster.gain.setTargetAtTime(mudo ? 0 : volume, ctx.currentTime, 0.03);
    }
    return mudo;
  }

  function ajustarVolume(novoVolume) {
    volume = Math.max(0, Math.min(1, Number(novoVolume)));
    if (ctx && ganhoMaster && !mudo) {
      ganhoMaster.gain.setTargetAtTime(volume, ctx.currentTime, 0.03);
    }
    return volume;
  }

  return {
    garantirGrafo,
    garantirContextoAtivo: garantirGrafo,
    aplicarPlanoPaisagem,
    aplicarPaisagemSonora: aplicarPlanoPaisagem,
    dispararSfxMulticamada,
    pulsarQuadroMusical60Fps,
    definirPausaTatica,
    estaEmPausaTatica: () => pausaTaticaAtiva,
    alternarMudo,
    ajustarVolume,
    estaMudo: () => mudo,
    obterVolume: () => volume,
  };
}
