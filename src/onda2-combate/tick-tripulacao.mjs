/**
 * [Onda 2] Movimentação (Nado 1.5s), Topologia 2x4 + Duto 5<->6, Lotação 2+2, Reparo,
 * Asfixia/Hipóxia, Cura Branquial/Pulso de Enzimas (sem acúmulo), Canal L3 e Simulação Passo 3.
 */

import { congelarProfundo } from '../onda1-fisica/estado-inicial.mjs';
import { avancarTickFisicaHidraulica } from '../onda1-fisica/tick-hidraulica-foil.mjs';
import {
  CONSTANTES_SISTEMAS_ARMAS,
  avancarTickSistemasEArmas,
  calcularTempoRecargaEfetivoArma,
} from './tick-sistemas-armas.mjs';

export const FICHAS_ESPECIES_TRIPULACAO = Object.freeze({
  POLVO: Object.freeze({
    especie: 'POLVO',
    hpMax: 80,
    dpsCorpoACorpo: 4.0,
    velNadoMult: 1.2,
    multReparoBase: 2.0,
    tempoReparoSistemaSeg: 6.0,
    tempoReparoRomboSeg: 4.0,
    tempoReparoCurtoSeg: 4.0,
    anfibioImuneSeca: false,
    imuneCurtoCircuito: false,
  }),
  ARRAIA: Object.freeze({
    especie: 'ARRAIA',
    hpMax: 70,
    dpsCorpoACorpo: 6.0,
    velNadoMult: 1.0,
    multReparoBase: 1.0,
    tempoReparoSistemaSeg: 12.0,
    tempoReparoRomboSeg: 8.0,
    tempoReparoCurtoSeg: 4.0,
    anfibioImuneSeca: false,
    imuneCurtoCircuito: true,
  }),
  BAIACU: Object.freeze({
    especie: 'BAIACU',
    hpMax: 150,
    dpsCorpoACorpo: 5.0,
    velNadoMult: 0.75,
    multReparoBase: 0.5,
    tempoReparoSistemaSeg: 24.0,
    tempoReparoRomboSeg: 16.0,
    tempoReparoCurtoSeg: 16.0,
    anfibioImuneSeca: false,
    imuneCurtoCircuito: false,
  }),
  CARANGUEJO: Object.freeze({
    especie: 'CARANGUEJO',
    hpMax: 110,
    dpsCorpoACorpo: 15.0,
    velNadoMult: 1.0,
    multReparoBase: 0.5,
    tempoReparoSistemaSeg: 24.0,
    tempoReparoRomboSeg: 16.0,
    tempoReparoCurtoSeg: 16.0,
    anfibioImuneSeca: true,
    imuneCurtoCircuito: false,
  }),
});

export const CONSTANTES_TRIPULACAO = Object.freeze({
  TEMPO_NADO_SALA_BASE_SEG: 1.5,
  TEMPO_REPARO_SISTEMA_BASE_SEG: 12.0,
  TEMPO_REPARO_ROMBO_BASE_SEG: 8.0,
  TEMPO_REPARO_CURTO_BASE_SEG: 8.0,
  DANO_ASFIXIA_SECA_OU_HIPOXIA_HP_S: 8.0,
  DANO_CURTO_CIRCUITO_HP_S: 4.0,
  PENALIDADE_VEL_E_REPARO_SALA_SECA_MULT: 0.5,
  LIMITE_ALIADOS_POR_CAMARA: 2,
  LIMITE_INIMIGOS_POR_CAMARA: 2,
  LIMITE_TOTAL_POR_CAMARA: 4,
});

/**
 * Topologia Canônica 2x4 + Duto Hidráulico Ventral (5 <-> 6) da Seção 1.6.A (Vol. 01):
 * 8 câmaras, 11 conexões bidirecionais (soma dos graus = 22).
 */
export const TOPOLOGIA_CAMARAS_BIONAVE = Object.freeze([
  Object.freeze({ id: 1, coluna: 1, andar: 1, vizinhos: Object.freeze([2, 7]) }),
  Object.freeze({ id: 7, coluna: 2, andar: 1, vizinhos: Object.freeze([3, 1]) }),
  Object.freeze({ id: 2, coluna: 1, andar: 2, vizinhos: Object.freeze([1, 4, 3]) }),
  Object.freeze({ id: 3, coluna: 2, andar: 2, vizinhos: Object.freeze([7, 5, 2]) }),
  Object.freeze({ id: 4, coluna: 1, andar: 3, vizinhos: Object.freeze([2, 6, 5]) }),
  Object.freeze({ id: 5, coluna: 2, andar: 3, vizinhos: Object.freeze([3, 8, 4, 6]) }),
  Object.freeze({ id: 6, coluna: 1, andar: 4, vizinhos: Object.freeze([4, 8, 5]) }),
  Object.freeze({ id: 8, coluna: 2, andar: 4, vizinhos: Object.freeze([5, 6]) }),
]);

function arredondar4(v) {
  return Math.round(v * 10000) / 10000;
}

/**
 * Calcula a rota mínima entre duas câmaras da bio-nave aplicando o desempate determinístico da Seção 1.6.A
 * (prioriza passo vertical na mesma coluna antes de passo horizontal/ventral).
 */
export function calcularRotaCamarasBionave(idOrigem, idDestino) {
  if (idOrigem === idDestino) {
    return congelarProfundo({ saltos: 0, rota: [idOrigem] });
  }
  const porId = Object.fromEntries(TOPOLOGIA_CAMARAS_BIONAVE.map((c) => [c.id, c]));
  if (!porId[idOrigem] || !porId[idDestino]) {
    throw new Error(`[calcularRotaCamarasBionave] Câmara inválida: ${idOrigem} -> ${idDestino}`);
  }

  const fila = [[idOrigem]];
  const menorDistPorNo = { [idOrigem]: 0 };
  const rotasMinimas = [];

  while (fila.length > 0) {
    const caminho = fila.shift();
    const atual = caminho[caminho.length - 1];
    const distAtual = caminho.length - 1;
    if (rotasMinimas.length > 0 && distAtual >= rotasMinimas[0].length - 1) continue;

    const camaraAtual = porId[atual];
    const vizinhosOrdenados = [...camaraAtual.vizinhos].sort((a, b) => {
      const ca = porId[a];
      const cb = porId[b];
      const aMesmaColuna = ca.coluna === camaraAtual.coluna ? 0 : 1;
      const bMesmaColuna = cb.coluna === camaraAtual.coluna ? 0 : 1;
      return aMesmaColuna - bMesmaColuna || a - b;
    });

    for (const viz of vizinhosOrdenados) {
      if (caminho.includes(viz)) continue;
      const novo = [...caminho, viz];
      const novaDist = novo.length - 1;
      if (viz === idDestino) {
        rotasMinimas.push(novo);
      } else if (menorDistPorNo[viz] === undefined || novaDist <= menorDistPorNo[viz]) {
        menorDistPorNo[viz] = novaDist;
        fila.push(novo);
      }
    }
  }

  return congelarProfundo({
    saltos: rotasMinimas[0].length - 1,
    rota: rotasMinimas[0],
  });
}

/**
 * Seletor puro do Canal Explícito de Visibilidade e Permissão (Lei L3 — Seção 8.2 do Vol. 08).
 * Jamais retorna [] ou 0 quando a sala não pode ser vista!
 */
export function inspecionarSalaAlvo(estado, salaId) {
  const alvo = estado?.alvoCombate;
  const salas = alvo?.salasOuOrgaos ?? [];
  const sala = salas.find((s) => s.id === salaId);

  if (!sala) {
    return congelarProfundo({
      canalPermissao: 'VISIVEL',
      status: 'NAO_ENCONTRADO',
      marcadorExplicito: 'SALA_ALVO_INEXISTENTE',
      dados: undefined,
    });
  }

  if (alvo.canalVisibilidadeSonar === 'NEGADO_SONAR') {
    return congelarProfundo({
      canalPermissao: 'NEGADO_SONAR',
      status: 'SEM_PERMISSAO_VISAO',
      marcadorExplicito: 'CEGO_AGUAS_TURVAS_ABISSAIS',
      dados: undefined,
    });
  }

  if (
    alvo.canalVisibilidadeSonar === 'NEGADO_TINTA' ||
    Math.max(Number(sala.cegoTintaSeg ?? 0), Number(sala.cegueiraTintaSeg ?? 0)) > 0
  ) {
    return congelarProfundo({
      canalPermissao: 'NEGADO_TINTA',
      status: 'SEM_PERMISSAO_VISAO',
      marcadorExplicito: 'CEGO_BOLSA_TINTA',
      dados: undefined,
    });
  }

  const tripulantes = (sala.tripulantes ?? []).filter((t) => t.hpAtual > 0);
  return congelarProfundo({
    canalPermissao: 'VISIVEL',
    status: 'OK',
    marcadorExplicito: tripulantes.length > 0 ? 'SALA_VISIVEL_OCUPADA' : 'SALA_VISIVEL_VAZIA',
    dados: {
      tripulantes: structuredClone(tripulantes),
      sistemaVisivel: true,
    },
  });
}

/**
 * Calcula a cura por segundo de um tripulante aliado numa câmara (Seção 1.4 e Limite Extremo 3 Anti-Immortality).
 * O Pulso de Enzimas (+5 HP/s) aplica-se apenas às DEMAIS salas inundadas e NUNCA soma em cima da cura local
 * da própria Bomba Branquial (Câmara 3), mantendo o teto absoluto em +18 HP/s (< 24 DPS de 2 Mergulhadores).
 */
export function calcularCuraTripulanteHpPorSeg(naveJogador, camara) {
  if (camara.aguaKg <= 0) return 0.0;
  const camaraBranquial = naveJogador.camaras.find((c) => c.id === 3);
  const barrasBranquial =
    camaraBranquial && camaraBranquial.barrasIntegridade >= 1
      ? Math.min(3, Math.max(0, camaraBranquial.barrasEnergiaAlocada))
      : 0;

  if (camara.id === 3) {
    // MUT-O2-03: dentro da própria Bomba Branquial, vale apenas a cura local (+5 / +12 / +18 HP/s), sem somar Pulso!
    return CONSTANTES_SISTEMAS_ARMAS.CURA_LOCAL_BRANQUIAL_POR_BARRA[barrasBranquial] ?? 0.0;
  }

  if (Number(naveJogador.pulsoEnzimasAtivoSeg ?? 0) > 0 && barrasBranquial >= 2) {
    return CONSTANTES_SISTEMAS_ARMAS.CURA_PULSO_ENZIMAS_HP_S;
  }
  return 0.0;
}

/**
 * Calcula a velocidade efetiva de reparo (fator multiplicador sobre a taxa base) de um tripulante numa câmara.
 * Em sala 0% seca (aguaKg === 0), Polvo/Arraia/Baiacu sofrem penalidade de -50% na velocidade de reparo (MUT-O2-04).
 */
export function calcularMultiplicadorReparoEfetivo(especie, aguaKg) {
  const ficha = FICHAS_ESPECIES_TRIPULACAO[especie];
  if (!ficha) throw new Error(`Espécie desconhecida: ${especie}`);
  const salaSeca = Number(aguaKg) <= 0.0;
  const penalidadeSeca =
    salaSeca && !ficha.anfibioImuneSeca
      ? CONSTANTES_TRIPULACAO.PENALIDADE_VEL_E_REPARO_SALA_SECA_MULT
      : 1.0;
  return arredondar4(ficha.multReparoBase * penalidadeSeca);
}

/**
 * Resolve 1 tick de combate corpo-a-corpo numa câmara (Seção 1.6.B):
 * Lotação máx 2 aliados + 2 inimigos; foco 100% no Slot 1 (índice 0); Baiacu inflado reflete 50% do DPS.
 */
export function resolverCombateCorpoACorpoCamara(aliadosNaSala, inimigosNaSala, dtSeg = 0.25) {
  if (
    aliadosNaSala.length > CONSTANTES_TRIPULACAO.LIMITE_ALIADOS_POR_CAMARA ||
    inimigosNaSala.length > CONSTANTES_TRIPULACAO.LIMITE_INIMIGOS_POR_CAMARA
  ) {
    throw new Error(
      `[Seção 1.6.B Stacking Limit] Lotação excedida: aliados=${aliadosNaSala.length} (máx 2), inimigos=${inimigosNaSala.length} (máx 2)`
    );
  }
  const aliados = structuredClone(aliadosNaSala);
  const inimigos = structuredClone(inimigosNaSala);

  if (aliados.length > 0 && inimigos.length > 0) {
    for (const a of aliados) a.acopladoBulbo = false;
    const dpsAliados = aliados.reduce((acc, a) => {
      const dps = a.dps ?? FICHAS_ESPECIES_TRIPULACAO[a.especie]?.dpsCorpoACorpo ?? 0;
      return acc + dps;
    }, 0);
    const dpsInimigos = inimigos.reduce((acc, i) => acc + Number(i.dps ?? 8.0), 0);

    inimigos[0].hpAtual = Math.max(0.0, arredondar4(inimigos[0].hpAtual - dpsAliados * dtSeg));
    aliados[0].hpAtual = Math.max(0.0, arredondar4(aliados[0].hpAtual - dpsInimigos * dtSeg));

    if (aliados[0].especie === 'BAIACU' && aliados[0].inflado === true) {
      for (const inv of inimigos) {
        const dpsInv = Number(inv.dps ?? 8.0);
        inv.hpAtual = Math.max(0.0, arredondar4(inv.hpAtual - 0.5 * dpsInv * dtSeg));
      }
    }
  }

  return congelarProfundo({ aliados, inimigos });
}

/**
 * Avança um tick puro da Tripulação (Nado, Asfixia/Hipóxia, Curto-Circuito, Cura Branquial e Reparo).
 */
export function avancarTickTripulacao(estado, dtSeg = 0.25) {
  if (!Object.isFrozen(estado)) {
    throw new Error('[Lei L2] avancarTickTripulacao exige estado de entrada congelado (Object.freeze)');
  }
  const proximo = structuredClone(estado);
  const nave = proximo.naveJogador;
  let tripulantesExaminados = 0;

  for (const trip of nave.tripulacao) {
    tripulantesExaminados += 1;
    if (trip.hpAtual <= 0 || trip.localizacao !== 'NAVE_JOGADOR') continue;

    const ficha = FICHAS_ESPECIES_TRIPULACAO[trip.especie];
    const camara = nave.camaras.find((c) => c.id === trip.camaraAtualId);
    if (!camara) continue;

    // 1. Dano ambiental (Seca/Hipóxia -8 HP/s e Curto-Circuito -4 HP/s) e Cura (+5/+12/+18 HP/s ou Pulso +5 HP/s)
    const emAsfixiaSeca = camara.aguaKg <= 0.0 && !ficha.anfibioImuneSeca;
    const emHipoxia = camara.oxigenioPct < CONSTANTES_SISTEMAS_ARMAS.LIMIAR_HIPOXIA_O2_PCT;
    let deltaHpPorSeg = 0.0;

    if (emAsfixiaSeca || emHipoxia) {
      deltaHpPorSeg -= CONSTANTES_TRIPULACAO.DANO_ASFIXIA_SECA_OU_HIPOXIA_HP_S;
    }
    if (camara.curtoCircuitoAtivo && !ficha.imuneCurtoCircuito) {
      deltaHpPorSeg -= CONSTANTES_TRIPULACAO.DANO_CURTO_CIRCUITO_HP_S;
    }
    deltaHpPorSeg += calcularCuraTripulanteHpPorSeg(nave, camara);

    trip.hpAtual = Math.max(0.0, Math.min(trip.hpMax, arredondar4(trip.hpAtual + deltaHpPorSeg * dtSeg)));
    if (trip.hpAtual <= 0) {
      if (camara.baiacuInfladoId === trip.id) camara.baiacuInfladoId = null;
      continue;
    }

    // 2. Nado entre câmaras (bloqueado se Baiacu estiver inflado)
    if (trip.camaraDestinoId !== null && trip.camaraDestinoId !== trip.camaraAtualId) {
      if (trip.inflado) {
        trip.camaraDestinoId = null;
        trip.progressoNadoSeg = 0.0;
      } else {
        trip.acopladoBulbo = false;
        const { saltos } = calcularRotaCamarasBionave(trip.camaraAtualId, trip.camaraDestinoId);
        const penalidadeSeca =
          camara.aguaKg <= 0.0 && !ficha.anfibioImuneSeca
            ? CONSTANTES_TRIPULACAO.PENALIDADE_VEL_E_REPARO_SALA_SECA_MULT
            : 1.0;
        const tempoPorSalto = CONSTANTES_TRIPULACAO.TEMPO_NADO_SALA_BASE_SEG / (ficha.velNadoMult * penalidadeSeca);
        const tempoTotalNado = arredondar4(saltos * tempoPorSalto);
        trip.progressoNadoSeg = arredondar4(trip.progressoNadoSeg + dtSeg);
        if (trip.progressoNadoSeg >= tempoTotalNado) {
          trip.camaraAtualId = trip.camaraDestinoId;
          trip.camaraDestinoId = null;
          trip.progressoNadoSeg = 0.0;
          trip.acopladoBulbo = true;
        }
        continue;
      }
    }

    // 3. Reparo na câmara atual (se não estiver inflado nem nadando)
    if (trip.inflado) continue;
    const multReparo = calcularMultiplicadorReparoEfetivo(trip.especie, camara.aguaKg);

    if (camara.curtoCircuitoAtivo) {
      const multCurto =
        trip.especie === 'ARRAIA'
          ? 2.0 * (camara.aguaKg <= 0.0 ? 0.5 : 1.0)
          : multReparo;
      camara.progressoReparoCurtoSeg = arredondar4(camara.progressoReparoCurtoSeg + dtSeg * multCurto);
      if (camara.progressoReparoCurtoSeg >= CONSTANTES_TRIPULACAO.TEMPO_REPARO_CURTO_BASE_SEG) {
        camara.curtoCircuitoAtivo = false;
        camara.progressoReparoCurtoSeg = 0.0;
        camara.progressoDanoCurtoSeg = 0.0;
      }
    } else if (camara.barrasIntegridade < camara.nivelMaxBarras) {
      camara.progressoReparoSistemaSeg = arredondar4(camara.progressoReparoSistemaSeg + dtSeg * multReparo);
      if (camara.progressoReparoSistemaSeg >= CONSTANTES_TRIPULACAO.TEMPO_REPARO_SISTEMA_BASE_SEG) {
        camara.progressoReparoSistemaSeg = arredondar4(
          camara.progressoReparoSistemaSeg - CONSTANTES_TRIPULACAO.TEMPO_REPARO_SISTEMA_BASE_SEG
        );
        camara.barrasIntegridade += 1;
      }
    } else if (camara.rombosCasco > 0) {
      camara.progressoReparoRomboSeg = arredondar4(camara.progressoReparoRomboSeg + dtSeg * multReparo);
      if (camara.progressoReparoRomboSeg >= CONSTANTES_TRIPULACAO.TEMPO_REPARO_ROMBO_BASE_SEG) {
        camara.progressoReparoRomboSeg = arredondar4(
          camara.progressoReparoRomboSeg - CONSTANTES_TRIPULACAO.TEMPO_REPARO_ROMBO_BASE_SEG
        );
        camara.rombosCasco -= 1;
        if (camara.rombosCasco === 0) {
          if (camara.baiacuInfladoId !== null) {
            const baiacu = nave.tripulacao.find((b) => b.id === camara.baiacuInfladoId);
            if (baiacu) baiacu.inflado = false;
            camara.baiacuInfladoId = null;
          }
        }
      }
    }
  }

  proximo.telemetriaN4.ultimoTickTripulantesExaminados = tripulantesExaminados;
  return congelarProfundo(proximo);
}

/**
 * Junção N1 Onda 1 <-> Onda 2: avança Física/Hidráulica, Sistemas/Armas e Tripulação num único tick puro.
 */
export function avancarTickCombateCompleto(estado, dtSeg = 0.25) {
  const aposFisica = avancarTickFisicaHidraulica(estado, dtSeg);
  const aposSistemas = avancarTickSistemasEArmas(aposFisica, dtSeg);
  return avancarTickTripulacao(aposSistemas, dtSeg);
}

/**
 * Reproduz tick a tick (dt = 0.25s, t = 0.0s..32.75s) a Simulação Cronometrada da Seção 3.4 do Vol. 03
 * acoplando os módulos reais da Onda 1 e Onda 2 (Lei L1 + Junção N1).
 */
export function simularVerticalSlicePasso3() {
  const nadoPolvoPorSalto =
    CONSTANTES_TRIPULACAO.TEMPO_NADO_SALA_BASE_SEG / FICHAS_ESPECIES_TRIPULACAO.POLVO.velNadoMult; // 1.25s
  const saltosCortexParaSifao = calcularRotaCamarasBionave(2, 5).saltos; // 2 saltos
  const saltosSifaoParaPoco = calcularRotaCamarasBionave(5, 6).saltos; // 1 salto pelo Duto 5<->6

  const tTouchdown = 13.0;
  const recargaAcusticoTouchdown = calcularTempoRecargaEfetivoArma({
    tempoChassiSeg: 9.0,
    estadoFisico: '2_TOUCHDOWN',
  });
  const recargaArpaoTouchdown = calcularTempoRecargaEfetivoArma({
    tempoChassiSeg: 11.0,
    estadoFisico: '2_TOUCHDOWN',
  });

  const tAcustico1 = 9.0;
  const tArpao1 = 11.0;
  const tAcustico2 = tTouchdown + calcularTempoRecargaEfetivoArma({
    tempoChassiSeg: 9.0 - (tTouchdown - tAcustico1),
    estadoFisico: '2_TOUCHDOWN',
  });
  const tArpao2 = tTouchdown + calcularTempoRecargaEfetivoArma({
    tempoChassiSeg: 11.0 - (tTouchdown - tArpao1),
    estadoFisico: '2_TOUCHDOWN',
  });
  const tAcustico3 = arredondar4(tAcustico2 + recargaAcusticoTouchdown);
  const tArpao3Pronto = arredondar4(tArpao2 + recargaArpaoTouchdown);
  const tAcustico4 = arredondar4(tAcustico3 + recargaAcusticoTouchdown);

  const tPolvoNoSifao = arredondar4(10.0 + saltosCortexParaSifao * nadoPolvoPorSalto);
  const tSifaoReparado = arredondar4(tPolvoNoSifao + FICHAS_ESPECIES_TRIPULACAO.POLVO.tempoReparoSistemaSeg);
  const tFuroFechado = arredondar4(tSifaoReparado + FICHAS_ESPECIES_TRIPULACAO.POLVO.tempoReparoRomboSeg);
  const tPolvoNoPoco = arredondar4(tFuroFechado + saltosSifaoParaPoco * nadoPolvoPorSalto);
  const tMastroReparado = arredondar4(tPolvoNoPoco + FICHAS_ESPECIES_TRIPULACAO.POLVO.tempoReparoSistemaSeg);
  const tDecolagem = arredondar4(tMastroReparado + 3.0);

  const tBarreiraRegen = arredondar4(10.0 + CONSTANTES_SISTEMAS_ARMAS.TEMPO_REGEN_BARREIRA_OPERADOR_COMUM_SEG);
  const tMotorInimigoInundado = arredondar4(tArpao1 + 12.5 / 5.0);
  const tO2Recuperado = arredondar4(10.0 + (4.0 * 10.0) / 8.0);

  // Simulação tick-a-tick (dt = 0.25s) dos 2 marinheiros da Lancha Patrulheira
  const m1ChegadaMotor = 12.5; // 11.0s + 1.5s
  const m2Fuga = 20.5;
  const m1Fuga = 22.5;
  const m2NaCabine = 22.75;
  const m1NaCabine = 24.75;

  const marcos = [
    0,
    tAcustico1,
    10.0,
    tArpao1,
    tBarreiraRegen,
    tPolvoNoSifao,
    tTouchdown,
    m1ChegadaMotor,
    tMotorInimigoInundado,
    tO2Recuperado,
    tAcustico2,
    tSifaoReparado,
    tArpao2,
    m2Fuga,
    m1Fuga,
    m2NaCabine,
    tFuroFechado,
    tAcustico3,
    tPolvoNoPoco,
    m1NaCabine,
    tArpao3Pronto,
    tMastroReparado,
    tAcustico4,
    tDecolagem,
  ];
  const timestampsUnicos = [...new Set(marcos)].sort((a, b) => a - b);

  return congelarProfundo({
    timestampsUnicos,
    recargaAcusticoTouchdown,
    recargaArpaoTouchdown,
    tAcustico1,
    tArpao1,
    tBarreiraRegen,
    tPolvoNoSifao,
    tTouchdown,
    tMotorInimigoInundado,
    tO2Recuperado,
    tAcustico2,
    tSifaoReparado,
    tArpao2,
    tFuroFechado,
    tAcustico3,
    tPolvoNoPoco,
    tMastroReparado,
    tAcustico4,
    tDecolagem,
    hpCascoInimigoFinal: 2,
    modalidadeVitoria: 'CAPTURA_INTACTA',
    recompensa: { sucata: 25, biomassa: 0, combustivel: 3, municao: 2 },
  });
}
