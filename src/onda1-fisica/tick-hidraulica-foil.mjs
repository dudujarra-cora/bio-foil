/**
 * [Onda 1] Motor Físico, Hidráulico e Estados da Nave (1_NO_FOIL, 2_TOUCHDOWN, 3_SPOOL_UP).
 * Implementa as equações da Seção 1.1..1.3 (Vol. 01) e a Matriz 5x8 da Seção 6.2 (Vol. 06).
 * Cumpre estritamente L1 (sem mocks), L2 (imutabilidade total) e N4 (contadores de exame).
 */

import { clonarCongelado, congelarProfundo } from './estado-inicial.mjs';

export const CONSTANTES_FISICA_HIDRAULICA = Object.freeze({
  CAPACIDADE_AGUA_CAMARA_KG: 12.5,
  TETO_ALAGAMENTO_PESADO_SALA_KG: 20.0,
  RESERVA_MIN_SIFAO_KG: 62.5,
  PENALIDADE_CAVITACAO_POR_KG: 2.0,
  TAXA_VAZAMENTO_ROMBO_AR_KG_S: 1.0,
  TAXA_DRENO_VALVULA_AR_KG_S: 2.5,
  TAXA_INVASAO_MAR_KG_S: 5.0,
  TAXA_RECARGA_CAPILAR_AR_KG_S: 1.25,
  TAXA_DRENO_ALAGAMENTO_PESADO_KG_S: 4.0,
  EMPUXO_POR_BARRA_SIFAO_KG: 30.0,
  PESO_ORGAO_ENXERTADO_KG: 5.0,
  PESO_POR_NIVEL_BLINDAGEM_KG: 15.0,
  PATAMARES_MASTRO_KG: Object.freeze([0, 50, 100, 150, 200, 240, 280, 330]),
  ESTADOS_FISICOS_NAVE: Object.freeze([
    '1_NO_FOIL',
    '2_TOUCHDOWN',
    '3_SPOOL_UP',
    '4_FURTIVO_AR',
    '5_FURTIVO_AGUA',
  ]),
});

function arredondar4(v) {
  return Math.round(v * 10000) / 10000;
}

/**
 * Soma a água interna normal (0..12.5 kg por câmara) das 8 câmaras.
 */
export function calcularAguaInternaNormalTotalKg(naveJogador) {
  let soma = 0.0;
  for (const camara of naveJogador.camaras) {
    soma += camara.aguaKg;
  }
  return arredondar4(soma);
}

/**
 * Soma o alagamento pesado hidrostático (0..20.0 kg extras por câmara) das 8 câmaras.
 */
export function calcularAlagamentoPesadoTotalKg(naveJogador) {
  let soma = 0.0;
  for (const camara of naveJogador.camaras) {
    soma += camara.alagamentoPesadoKg ?? 0.0;
  }
  return arredondar4(soma);
}

/**
 * Calcula o peso de armas ativas, órgãos enxertados (+5 kg cada) e itens no Porão de Carga (4 slots).
 */
export function calcularPesoArmasECargaKg(naveJogador) {
  let peso = 0.0;
  for (const slot of naveJogador.armasAtivas ?? []) {
    const arma = slot?.arma !== undefined ? slot.arma : slot;
    if (arma) {
      peso += Number(arma.pesoBaseKg ?? arma.pesoKg ?? 0);
      const qtdOrgaos = Array.isArray(arma.orgaosEnxertados) ? arma.orgaosEnxertados.length : 0;
      peso += qtdOrgaos * CONSTANTES_FISICA_HIDRAULICA.PESO_ORGAO_ENXERTADO_KG;
    }
  }
  for (const slotPorao of naveJogador.poraoCarga ?? []) {
    if (slotPorao?.item) {
      peso += Number(slotPorao.item.pesoKg ?? slotPorao.item.pesoBaseKg ?? 0);
    } else if (slotPorao && typeof slotPorao === 'object') {
      peso += Number(slotPorao.pesoKg ?? slotPorao.pesoBaseKg ?? 0);
    }
  }
  return arredondar4(peso);
}

/**
 * Equação Mestre de Peso Total (Seção 1.1 do Vol. 01 + Contra-Auditoria #4 doPorão de Carga):
 * P_total = P_chassi + P_agua_normal + P_alagamento_pesado + P_armas_orgaos_porao + P_blindagem + P_arrasto_virtual
 */
export function calcularPesoTotalNave(naveJogador) {
  const pesoChassi = Number(naveJogador.pesoChassiKg ?? 100.0);
  const pesoAguaNormal = calcularAguaInternaNormalTotalKg(naveJogador);
  const pesoAlagamentoPesado = calcularAlagamentoPesadoTotalKg(naveJogador);
  const pesoArmasECarga = calcularPesoArmasECargaKg(naveJogador);
  const pesoBlindagem = Number(naveJogador.nivelBlindagem ?? 0) * CONSTANTES_FISICA_HIDRAULICA.PESO_POR_NIVEL_BLINDAGEM_KG;
  const pesoArrastoVirtual = Number(naveJogador.pesoVirtualArrastoKg ?? 0.0);
  return arredondar4(pesoChassi + pesoAguaNormal + pesoAlagamentoPesado + pesoArmasECarga + pesoBlindagem + pesoArrastoVirtual);
}

/**
 * Calcula a penalidade de cavitação do Sifão quando a água interna total cai abaixo de 62.5 kg (Seção 6.1).
 */
export function calcularPenalidadeCavitacaoKg(aguaInternaNormalKg) {
  if (aguaInternaNormalKg >= CONSTANTES_FISICA_HIDRAULICA.RESERVA_MIN_SIFAO_KG) {
    return 0.0;
  }
  const deficit = CONSTANTES_FISICA_HIDRAULICA.RESERVA_MIN_SIFAO_KG - aguaInternaNormalKg;
  return arredondar4(deficit * CONSTANTES_FISICA_HIDRAULICA.PENALIDADE_CAVITACAO_POR_KG);
}

/**
 * Equação Mestre de Sustentação do Hidrofólio (Seção 1.1 e 1.2 do Vol. 01):
 * Se Energia no Sifão == 0, Mastro == 0 ou Mergulho Tático ativo -> S_atual = 0 kg.
 * Caso contrário -> S_mastro + bonusArquitetura + S_sifao - C_cavitacao (mínimo 0 kg).
 */
export function calcularSustentacaoFoil(naveJogador) {
  if (naveJogador.mergulhoTaticoAtivo) {
    return 0.0;
  }
  const camaraSifao = naveJogador.camaras.find((c) => c.id === 5);
  const camaraMastro = naveJogador.camaras.find((c) => c.id === 6);
  const ionSifao = Math.max(0, Number(camaraSifao?.danoIonizado ?? camaraSifao?.barrasIonizadas ?? 0));
  const barrasSifao = Math.max(0, Number(camaraSifao?.barrasEnergiaAlocada ?? camaraSifao?.energiaAlocada ?? 0) - ionSifao);
  const barrasMastro = Math.max(0, Math.min(7, Number(camaraMastro?.barrasIntegridade ?? camaraMastro?.integridade ?? 0)));

  if (barrasSifao === 0 || barrasMastro === 0) {
    return 0.0;
  }

  const sustentacaoMastroBase = CONSTANTES_FISICA_HIDRAULICA.PATAMARES_MASTRO_KG[barrasMastro];
  const bonusArquitetura = Number(naveJogador.bonusSustentacaoMastroKg ?? 0.0);
  const sustentacaoSifao = barrasSifao * CONSTANTES_FISICA_HIDRAULICA.EMPUXO_POR_BARRA_SIFAO_KG;
  const aguaInterna = calcularAguaInternaNormalTotalKg(naveJogador);
  const cavitacao = calcularPenalidadeCavitacaoKg(aguaInterna);

  return Math.max(0.0, arredondar4(sustentacaoMastroBase + bonusArquitetura + sustentacaoSifao - cavitacao));
}

/**
 * Devolve o estado composto da Matriz 5x8 (Seção 6.2) a partir de estadoFisico + furtividadeAtivaSeg.
 */
export function classificarEstadoCompostoMatriz(naveJogador) {
  const furtivo = Number(naveJogador.furtividadeAtivaSeg ?? 0) > 0;
  if (naveJogador.estadoFisico === '1_NO_FOIL') {
    return furtivo ? '4_FURTIVO_AR' : '1_NO_FOIL';
  }
  return furtivo ? '5_FURTIVO_AGUA' : naveJogador.estadoFisico;
}

/**
 * Tenta alternar a válvula externa de uma câmara (Seção 8.5.A e Matriz 6.2 Linha C).
 * Em 2_TOUCHDOWN ou 3_SPOOL_UP, a Trava Hidrostática Automática rejeita com BLOQUEADO_TRAVA_HIDROSTATICA.
 */
export function alternarValvulaExterna(estado, camaraId, aberta) {
  if (!Object.isFrozen(estado)) {
    throw new Error('[Lei L2] alternarValvulaExterna exige estado de entrada congelado (Object.freeze)');
  }
  if (estado.naveJogador.estadoFisico !== '1_NO_FOIL') {
    const copiaRejeitada = structuredClone(estado);
    copiaRejeitada.logDeterministico.push({
      tick: estado.meta.tickAtual,
      tempoSeg: estado.meta.tempoCombateSeg,
      tipo: 'COMANDO_REJEITADO',
      comando: 'ALTERNAR_VALVULA',
      camaraId,
      motivo: 'BLOQUEADO_TRAVA_HIDROSTATICA',
    });
    return congelarProfundo(copiaRejeitada);
  }

  const proximo = structuredClone(estado);
  const camara = proximo.naveJogador.camaras.find((c) => c.id === camaraId);
  if (!camara) {
    proximo.logDeterministico.push({
      tick: estado.meta.tickAtual,
      tempoSeg: estado.meta.tempoCombateSeg,
      tipo: 'COMANDO_REJEITADO',
      comando: 'ALTERNAR_VALVULA',
      camaraId,
      motivo: 'PRECONDICAO_NAO_ATENDIDA',
    });
    return congelarProfundo(proximo);
  }

  camara.valvulaExternaAberta = Boolean(aberta);
  proximo.logDeterministico.push({
    tick: estado.meta.tickAtual,
    tempoSeg: estado.meta.tempoCombateSeg,
    tipo: 'VALVULA_ALTERNADA',
    camaraId,
    aberta: camara.valvulaExternaAberta,
  });
  return congelarProfundo(proximo);
}

/**
 * Atalho [V] DRENAR TUDO (Seção 8.5.A e Matriz 6.2 Linha C).
 */
export function drenarTodasValvulas(estado, abrirTodas = true) {
  if (!Object.isFrozen(estado)) {
    throw new Error('[Lei L2] drenarTodasValvulas exige estado de entrada congelado (Object.freeze)');
  }
  if (estado.naveJogador.estadoFisico !== '1_NO_FOIL') {
    const copiaRejeitada = structuredClone(estado);
    copiaRejeitada.logDeterministico.push({
      tick: estado.meta.tickAtual,
      tempoSeg: estado.meta.tempoCombateSeg,
      tipo: 'COMANDO_REJEITADO',
      comando: 'DRENAR_TUDO',
      motivo: 'BLOQUEADO_TRAVA_HIDROSTATICA',
    });
    return congelarProfundo(copiaRejeitada);
  }

  const proximo = structuredClone(estado);
  for (const camara of proximo.naveJogador.camaras) {
    camara.valvulaExternaAberta = Boolean(abrirTodas);
  }
  proximo.logDeterministico.push({
    tick: estado.meta.tickAtual,
    tempoSeg: estado.meta.tempoCombateSeg,
    tipo: 'DRENAR_TUDO_EXECUTADO',
    abrirTodas: Boolean(abrirTodas),
  });
  return congelarProfundo(proximo);
}

/**
 * Alterna o Mergulho Tático voluntário (Seção 8.5.A).
 */
export function alternarMergulhoTatico(estado, recolherFoil) {
  if (!Object.isFrozen(estado)) {
    throw new Error('[Lei L2] alternarMergulhoTatico exige estado de entrada congelado (Object.freeze)');
  }
  const proximo = structuredClone(estado);
  proximo.naveJogador.mergulhoTaticoAtivo = Boolean(recolherFoil);
  if (recolherFoil) {
    proximo.naveJogador.estadoFisico = '2_TOUCHDOWN';
    proximo.naveJogador.progressoSpoolUpSeg = 0.0;
    for (const c of proximo.naveJogador.camaras) {
      c.valvulaExternaAberta = false;
    }
  } else if (proximo.naveJogador.estadoFisico === '2_TOUCHDOWN') {
    const peso = calcularPesoTotalNave(proximo.naveJogador);
    const sust = calcularSustentacaoFoil(proximo.naveJogador);
    if (sust > 0 && peso <= sust) {
      proximo.naveJogador.estadoFisico = '3_SPOOL_UP';
      proximo.naveJogador.progressoSpoolUpSeg = 0.0;
    }
  }
  return congelarProfundo(proximo);
}

/**
 * Avança um tick puro de Física e Hidráulica (Junção N1 Onda 1 <-> Onda 2).
 * Atualiza as 8 câmaras, recalcula PesoTotal e SustentacaoAtual, aplica Cavitação e gerencia
 * as transições 1_NO_FOIL <-> 2_TOUCHDOWN <-> 3_SPOOL_UP.
 */
export function avancarTickFisicaHidraulica(estado, dtSeg = 0.25) {
  if (!Object.isFrozen(estado)) {
    throw new Error('[Lei L2] avancarTickFisicaHidraulica exige estado de entrada congelado (Object.freeze)');
  }
  if (typeof dtSeg !== 'number' || !(dtSeg > 0)) {
    throw new Error('[avancarTickFisicaHidraulica] dtSeg deve ser um número positivo');
  }

  const proximo = structuredClone(estado);
  const nave = proximo.naveJogador;
  const camaraBranquial = nave.camaras.find((c) => c.id === 3);
  const ionBrq = Math.max(0, Number(camaraBranquial?.danoIonizado ?? camaraBranquial?.barrasIonizadas ?? 0));
  const energiaEfetivaBrq = Math.max(0, Number(camaraBranquial?.barrasEnergiaAlocada ?? camaraBranquial?.energiaAlocada ?? 0) - ionBrq);
  const branquialAtiva = energiaEfetivaBrq >= 1 && Number(camaraBranquial?.barrasIntegridade ?? camaraBranquial?.integridade ?? 0) >= 1;

  // 1. Verificar antes do fluxo se perda de Sifão/Mastro ou excesso de peso já derrubou a nave neste instante
  const pesoPreTick = calcularPesoTotalNave(nave);
  const sustPreTick = calcularSustentacaoFoil(nave);
  if (nave.estadoFisico === '1_NO_FOIL' && (nave.mergulhoTaticoAtivo || sustPreTick === 0 || pesoPreTick > sustPreTick)) {
    nave.estadoFisico = '2_TOUCHDOWN';
    nave.progressoSpoolUpSeg = 0.0;
    for (const c of nave.camaras) {
      c.valvulaExternaAberta = false;
    }
    proximo.logDeterministico.push({
      tick: proximo.meta.tickAtual,
      tempoSeg: proximo.meta.tempoCombateSeg,
      tipo: 'TRANSICAO_ESTADO_FISICO',
      de: '1_NO_FOIL',
      para: '2_TOUCHDOWN',
      pesoTotalKg: pesoPreTick,
      sustentacaoAtualKg: sustPreTick,
    });
  }

  const noAr = nave.estadoFisico === '1_NO_FOIL';
  let camarasExaminadas = 0;

  // 2. Processar a hidráulica de cada uma das 8 câmaras
  for (const camara of nave.camaras) {
    camarasExaminadas += 1;
    const baiacuInfladoNaSala = (nave.tripulacao ?? []).find(
      (t) =>
        (camara.baiacuInfladoId === null || camara.baiacuInfladoId === undefined || t.id === camara.baiacuInfladoId) &&
        t.especie === 'BAIACU' &&
        t.inflado === true &&
        t.camaraAtualId === camara.id &&
        t.localizacao === 'NAVE_JOGADOR' &&
        t.hpAtual > 0
    );
    const baiacuVedando = Boolean(baiacuInfladoNaSala);
    camara.baiacuInfladoId = baiacuInfladoNaSala ? baiacuInfladoNaSala.id : null;
    const totalRombos = Math.max(0, Number(camara.rombosCasco ?? 0), camara.brechaAtiva ? 1 : 0);
    camara.rombosCasco = totalRombos;
    camara.brechaAtiva = totalRombos > 0;
    const rombosAtivos = baiacuVedando ? 0 : totalRombos;

    if (noAr) {
      let perdaKg = 0.0;
      if (rombosAtivos > 0) {
        perdaKg += rombosAtivos * CONSTANTES_FISICA_HIDRAULICA.TAXA_VAZAMENTO_ROMBO_AR_KG_S * dtSeg;
      }
      if (camara.valvulaExternaAberta) {
        perdaKg += CONSTANTES_FISICA_HIDRAULICA.TAXA_DRENO_VALVULA_AR_KG_S * dtSeg;
      }

      if (perdaKg > 0) {
        if (camara.alagamentoPesadoKg > 0) {
          const drenoPesado = Math.min(camara.alagamentoPesadoKg, perdaKg);
          camara.alagamentoPesadoKg = arredondar4(camara.alagamentoPesadoKg - drenoPesado);
          const resto = perdaKg - drenoPesado;
          camara.aguaKg = Math.max(0.0, arredondar4(camara.aguaKg - resto));
        } else {
          camara.aguaKg = Math.max(0.0, arredondar4(camara.aguaKg - perdaKg));
        }
      } else {
        // Sem furo ativo e válvula fechada no ar: Bomba Branquial puxa água capilar (+1.25 kg/s) e drena alagamento pesado (-4.0 kg/s)
        if (branquialAtiva) {
          if (camara.alagamentoPesadoKg > 0) {
            const dreno = CONSTANTES_FISICA_HIDRAULICA.TAXA_DRENO_ALAGAMENTO_PESADO_KG_S * dtSeg;
            camara.alagamentoPesadoKg = Math.max(0.0, arredondar4(camara.alagamentoPesadoKg - dreno));
          }
          if (camara.aguaKg < CONSTANTES_FISICA_HIDRAULICA.CAPACIDADE_AGUA_CAMARA_KG) {
            const ganho = CONSTANTES_FISICA_HIDRAULICA.TAXA_RECARGA_CAPILAR_AR_KG_S * dtSeg;
            camara.aguaKg = Math.min(
              CONSTANTES_FISICA_HIDRAULICA.CAPACIDADE_AGUA_CAMARA_KG,
              arredondar4(camara.aguaKg + ganho)
            );
          }
        }
      }
    } else {
      // Na água (2_TOUCHDOWN ou 3_SPOOL_UP): Trava Hidrostática mantém válvulas fechadas
      camara.valvulaExternaAberta = false;

      // Recarga tática de câmaras secas a +5.0 kg/s até 12.5 kg
      let faltaNormal = Math.max(0.0, CONSTANTES_FISICA_HIDRAULICA.CAPACIDADE_AGUA_CAMARA_KG - camara.aguaKg);
      const entradaBaseMar = CONSTANTES_FISICA_HIDRAULICA.TAXA_INVASAO_MAR_KG_S * Math.max(1, rombosAtivos) * dtSeg;
      if (faltaNormal > 0) {
        const preenchido = Math.min(faltaNormal, entradaBaseMar);
        camara.aguaKg = arredondar4(camara.aguaKg + preenchido);
      }

      if (rombosAtivos > 0) {
        // Rombo submerso não vedado causa Sobrecarga Hidrostática (Alagamento Pesado até +20.0 kg por sala)
        const invasaoRombo = rombosAtivos * CONSTANTES_FISICA_HIDRAULICA.TAXA_INVASAO_MAR_KG_S * dtSeg;
        const usadoParaNormal = Math.min(faltaNormal, invasaoRombo);
        const excesso = Math.max(0.0, invasaoRombo - usadoParaNormal);
        if (excesso > 0 && camara.aguaKg >= CONSTANTES_FISICA_HIDRAULICA.CAPACIDADE_AGUA_CAMARA_KG) {
          const antesPesado = camara.alagamentoPesadoKg;
          camara.alagamentoPesadoKg = Math.min(
            CONSTANTES_FISICA_HIDRAULICA.TETO_ALAGAMENTO_PESADO_SALA_KG,
            arredondar4(camara.alagamentoPesadoKg + excesso)
          );
          if (camara.alagamentoPesadoKg > 0 && antesPesado === 0) {
            camara.curtoCircuitoAtivo = true;
          }
        }
      } else if (camara.alagamentoPesadoKg > 0 && branquialAtiva) {
        // Rombo vedado (ou inexistente) + Bomba Branquial ativa bombeia o excesso para fora a -4.0 kg/s
        const dreno = CONSTANTES_FISICA_HIDRAULICA.TAXA_DRENO_ALAGAMENTO_PESADO_KG_S * dtSeg;
        camara.alagamentoPesadoKg = Math.max(0.0, arredondar4(camara.alagamentoPesadoKg - dreno));
      }
    }
  }

  proximo.telemetriaN4.ultimoTickCamarasExaminadas = camarasExaminadas;

  // 3. Recalcular PesoTotal e SustentacaoAtual após a atualização de água (inclui Cavitação no mesmo tick)
  const pesoPosTick = calcularPesoTotalNave(nave);
  const sustPosTick = calcularSustentacaoFoil(nave);
  nave.pesoTotalKg = pesoPosTick;
  nave.sustentacaoAtualKg = sustPosTick;

  // 4. Transições de estado físico e timer de Spool-up (3.0s)
  if (nave.estadoFisico === '1_NO_FOIL') {
    if (nave.mergulhoTaticoAtivo || sustPosTick === 0 || pesoPosTick > sustPosTick) {
      nave.estadoFisico = '2_TOUCHDOWN';
      nave.progressoSpoolUpSeg = 0.0;
      nave.tempoTouchdownContinuoSeg = arredondar4(nave.tempoTouchdownContinuoSeg + dtSeg);
      for (const c of nave.camaras) {
        c.valvulaExternaAberta = false;
      }
      proximo.logDeterministico.push({
        tick: proximo.meta.tickAtual,
        tempoSeg: arredondar4(proximo.meta.tempoCombateSeg + dtSeg),
        tipo: 'TRANSICAO_ESTADO_FISICO',
        de: '1_NO_FOIL',
        para: '2_TOUCHDOWN',
        pesoTotalKg: pesoPosTick,
        sustentacaoAtualKg: sustPosTick,
      });
    } else {
      nave.tempoTouchdownContinuoSeg = 0.0;
      nave.progressoSpoolUpSeg = 0.0;
    }
  } else if (nave.estadoFisico === '2_TOUCHDOWN') {
    nave.tempoTouchdownContinuoSeg = arredondar4(nave.tempoTouchdownContinuoSeg + dtSeg);
    if (!nave.mergulhoTaticoAtivo && sustPosTick > 0 && pesoPosTick <= sustPosTick) {
      nave.estadoFisico = '3_SPOOL_UP';
      nave.progressoSpoolUpSeg = arredondar4(dtSeg);
      const exigido = Number(nave.tempoSpoolUpExigidoSeg ?? 3.0);
      if (nave.progressoSpoolUpSeg >= exigido) {
        nave.estadoFisico = '1_NO_FOIL';
        nave.progressoSpoolUpSeg = 0.0;
        nave.tempoTouchdownContinuoSeg = 0.0;
      }
    } else {
      nave.progressoSpoolUpSeg = 0.0;
    }
  } else if (nave.estadoFisico === '3_SPOOL_UP') {
    if (nave.mergulhoTaticoAtivo || sustPosTick === 0 || pesoPosTick > sustPosTick) {
      // Célula 3B da Matriz 6.2: se PesoTotal > SustentacaoAtual durante o Spool-up, aborta e zera o timer
      nave.estadoFisico = '2_TOUCHDOWN';
      nave.progressoSpoolUpSeg = 0.0;
      nave.tempoTouchdownContinuoSeg = arredondar4(nave.tempoTouchdownContinuoSeg + dtSeg);
      proximo.logDeterministico.push({
        tick: proximo.meta.tickAtual,
        tempoSeg: arredondar4(proximo.meta.tempoCombateSeg + dtSeg),
        tipo: 'SPOOL_UP_ABORTADO',
        de: '3_SPOOL_UP',
        para: '2_TOUCHDOWN',
        pesoTotalKg: pesoPosTick,
        sustentacaoAtualKg: sustPosTick,
      });
    } else {
      nave.tempoTouchdownContinuoSeg = arredondar4(nave.tempoTouchdownContinuoSeg + dtSeg);
      nave.progressoSpoolUpSeg = arredondar4(nave.progressoSpoolUpSeg + dtSeg);
      const exigido = Number(nave.tempoSpoolUpExigidoSeg ?? 3.0);
      if (nave.progressoSpoolUpSeg >= exigido) {
        nave.estadoFisico = '1_NO_FOIL';
        nave.progressoSpoolUpSeg = 0.0;
        nave.tempoTouchdownContinuoSeg = 0.0;
        nave.tempoSpoolUpExigidoSeg = 3.0;
        proximo.logDeterministico.push({
          tick: proximo.meta.tickAtual,
          tempoSeg: arredondar4(proximo.meta.tempoCombateSeg + dtSeg),
          tipo: 'DECOLAGEM_CONCLUIDA',
          de: '3_SPOOL_UP',
          para: '1_NO_FOIL',
          pesoTotalKg: pesoPosTick,
          sustentacaoAtualKg: sustPosTick,
        });
      }
    }
  }

  proximo.meta.tickAtual += 1;
  proximo.meta.tempoCombateSeg = arredondar4(proximo.meta.tempoCombateSeg + dtSeg);

  return congelarProfundo(proximo);
}
