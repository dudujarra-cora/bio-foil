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
  if (naveAtu.estadoFisico === '3_SPOOL_UP' && (naveAtu.progressoSpoolUpSeg ?? 0) > 0) {
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

  // 8. CUE_POWER_SURGE_CHEFE
  if (alvoAtu?.ultimoPowerSurgeDisparado || alvoAtu?.powerSurgeDisparadoNoTick) {
    cuesAtivos.push(CATALOGO_8_CUES_SONOROS_85C[7]);
  }

  return clonarProfundoCongelado(cuesAtivos);
}
