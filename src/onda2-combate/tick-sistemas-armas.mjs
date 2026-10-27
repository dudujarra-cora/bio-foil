/**
 * [Onda 2] Armas, Barreira, Bomba Branquial, Curto-Circuito, Furtividade e Geometria do Beam.
 * Implementa as regras das Seções 1.3, 1.4 e 1.6.C (Vol. 01), Seção 5.1/5.2 (Vol. 05) e Hierarquia 6.4 (Vol. 06).
 */

import { congelarProfundo } from '../onda1-fisica/estado-inicial.mjs';

export const CONSTANTES_SISTEMAS_ARMAS = Object.freeze({
  REDUCAO_RECARGA_TOUCHDOWN: 0.25,
  REDUCAO_RECARGA_OPERADOR_COMUM: 0.10,
  REDUCAO_RECARGA_OPERADOR_POLVO: 0.20,
  PISO_MULTIPLICADOR_RECARGA: 0.50,
  TEMPO_REGEN_BARREIRA_SEM_OPERADOR_SEG: 2.0,
  TEMPO_REGEN_BARREIRA_OPERADOR_COMUM_SEG: 1.7,
  TEMPO_REGEN_BARREIRA_POLVO_SEG: 1.5,
  TAXA_QUEDA_O2_BRANQUIAL_DESLIGADA_PCT_S: 4.0,
  TAXA_RECUPERACAO_O2_BRANQUIAL_ATIVA_PCT_S: 8.0,
  LIMIAR_HIPOXIA_O2_PCT: 20.0,
  CURA_LOCAL_BRANQUIAL_POR_BARRA: Object.freeze({ 0: 0.0, 1: 5.0, 2: 12.0, 3: 18.0 }),
  CURA_PULSO_ENZIMAS_HP_S: 5.0,
  DURACAO_PULSO_ENZIMAS_SEG: 6.0,
  RECARGA_PULSO_ENZIMAS_SEG: 25.0,
  BONUS_ESQUIVA_TINTA_FURTIVA_PCT: 60,
  DURACAO_TINTA_FURTIVA_POR_BARRA_SEG: Object.freeze({ 1: 5.0, 2: 8.0 }),
  RECARGA_TINTA_FURTIVA_SEG: 20.0,
  TEMPO_EXTINCAO_CURTO_SECO_SEG: 3.0,
  TEMPO_DANO_SISTEMA_CURTO_SEG: 8.0,
  ESQUIVA_BASE_SIFAO_POR_BARRA_PCT: Object.freeze([0, 15, 25, 32, 40, 45]),
  BONUS_ESQUIVA_PILOTO_CORTEX_PCT: 5,
  BONUS_ESQUIVA_OPERADOR_SIFAO_PCT: 10,
  DANO_ANTIPESSOAL_POR_PONTO_SISTEMA_HP: 15,
});

export const GRAFOS_BEAM_CANONICOS = Object.freeze({
  BIONAVE_2X4: Object.freeze({
    1: [7, 2],
    7: [1, 3],
    2: [1, 3, 4],
    3: [7, 2, 5],
    4: [2, 5, 6],
    5: [3, 4, 8],
    6: [4, 8],
    8: [5, 6],
  }),
  BARCO_2X2: Object.freeze({
    1: [2, 3],
    2: [1, 4],
    3: [1, 4],
    4: [2, 3],
  }),
  BARCO_CORVETA_5: Object.freeze({
    1: [2, 4],
    2: [1, 3, 4, 5],
    3: [2, 5],
    4: [1, 2, 5],
    5: [2, 3, 4],
  }),
  BARCO_ARRASTAO_6: Object.freeze({
    1: [2, 4],
    2: [1, 3, 5],
    3: [2, 6],
    4: [1, 5],
    5: [2, 4, 6],
    6: [3, 5],
  }),
  BARCO_SUBMARINO_6: Object.freeze({
    1: [2, 3, 4],
    2: [1, 5, 6],
    3: [1, 4],
    4: [1, 3, 5],
    5: [2, 4, 6],
    6: [2, 5],
  }),
  MONSTRO_1X4: Object.freeze({
    1: [2],
    2: [1, 3],
    3: [2, 4],
    4: [3],
  }),
  DRAGA_F1_6: Object.freeze({
    1: [2, 5],
    2: [1, 3, 5],
    3: [2, 4, 6],
    4: [3, 6],
    5: [1, 2, 6],
    6: [3, 4, 5],
  }),
  DRAGA_F2_6: Object.freeze({
    1: [2, 4],
    2: [1, 3, 5],
    3: [2, 6],
    4: [1, 5],
    5: [2, 4, 6],
    6: [3, 5],
  }),
  DRAGA_F3_5: Object.freeze({
    1: [2, 4],
    2: [1, 3, 4, 5],
    3: [2, 5],
    4: [1, 2, 5],
    5: [2, 3, 4],
  }),
});

function arredondar4(v) {
  return Math.round(v * 10000) / 10000;
}

/**
 * Calcula o tempo de recarga efetivo de uma arma aplicando a Hierarquia Nível 3 (Seção 6.4):
 * Soma aditiva de reduções percentuais (operador -10%/-20% + Touchdown -25%) com piso em 50% (0.50).
 */
export function calcularTempoRecargaEfetivoArma({
  tempoChassiSeg,
  penalidadeOrgaosSeg = 0.0,
  especieOperadorArtilharia = null,
  estadoFisico = '1_NO_FOIL',
}) {
  const reducaoOperador =
    especieOperadorArtilharia === 'POLVO'
      ? CONSTANTES_SISTEMAS_ARMAS.REDUCAO_RECARGA_OPERADOR_POLVO
      : especieOperadorArtilharia !== null
        ? CONSTANTES_SISTEMAS_ARMAS.REDUCAO_RECARGA_OPERADOR_COMUM
        : 0.0;

  const emTouchdownOuSpool =
    estadoFisico === '2_TOUCHDOWN' ||
    estadoFisico === '3_SPOOL_UP' ||
    estadoFisico === '5_FURTIVO_AGUA';
  const reducaoTouchdown = emTouchdownOuSpool ? CONSTANTES_SISTEMAS_ARMAS.REDUCAO_RECARGA_TOUCHDOWN : 0.0;

  // Hierarquia Nível 3 (MUT-O2-01): soma aditiva 1.0 - reducaoOperador - reducaoTouchdown (nunca multiplicativa!)
  const multiplicador = Math.max(
    CONSTANTES_SISTEMAS_ARMAS.PISO_MULTIPLICADOR_RECARGA,
    1.0 - reducaoOperador - reducaoTouchdown
  );
  return arredondar4((Number(tempoChassiSeg) + Number(penalidadeOrgaosSeg)) * multiplicador);
}

/**
 * Calcula a esquiva efetiva da bio-nave contra projéteis em voo respeitando a Hierarquia Nível 2 sobre Nível 3 (Seção 6.4):
 * Em 2_TOUCHDOWN ou 3_SPOOL_UP (inclusive 5_FURTIVO_AGUA), a esquiva contra projéteis já em voo é SEMPRE 0%!
 */
export function calcularEsquivaEfetivaNave(naveJogador) {
  if (naveJogador.estadoFisico === '4_FURTIVO_AR') {
    return calcularEsquivaEfetivaNave({
      ...naveJogador,
      estadoFisico: '1_NO_FOIL',
      furtividadeAtivaSeg: Math.max(1.0, Number(naveJogador.furtividadeAtivaSeg ?? 0)),
    });
  }
  // Hierarquia Nível 2 sobre Nível 3 (MUT-O2-02 / Célula 5A da Matriz 6.2): Touchdown trava esquiva em 0%
  if (naveJogador.estadoFisico !== '1_NO_FOIL') {
    return 0;
  }

  const camaraCortex = naveJogador.camaras.find((c) => c.id === 2);
  const camaraSifao = naveJogador.camaras.find((c) => c.id === 5);
  const ionCortex = Math.max(0, Number(camaraCortex?.danoIonizado ?? camaraCortex?.barrasIonizadas ?? 0));
  const intCortexEfetiva = Math.max(0, Number(camaraCortex?.barrasIntegridade ?? camaraCortex?.integridade ?? 0) - ionCortex);
  const ionSifao = Math.max(0, Number(camaraSifao?.danoIonizado ?? camaraSifao?.barrasIonizadas ?? 0));
  const barrasSifaoEfetivas = Math.max(0, Number(camaraSifao?.barrasEnergiaAlocada ?? camaraSifao?.energiaAlocada ?? 0) - ionSifao);
  if (!camaraCortex || intCortexEfetiva <= 0 || !camaraSifao || barrasSifaoEfetivas <= 0) {
    return 0;
  }

  const pilotoNoCortex = naveJogador.tripulacao.some(
    (t) =>
      t.localizacao === 'NAVE_JOGADOR' &&
      t.hpAtual > 0 &&
      t.camaraAtualId === 2 &&
      t.camaraDestinoId === null &&
      t.acopladoBulbo === true &&
      !t.inflado
  );

  // Sem piloto no Córtex Nv. 1, a esquiva cai para 0% (Córtex Nv. 2/3 mantém piloto automático parcial se não tripulado)
  let fatorAutonomo = 1.0;
  if (!pilotoNoCortex) {
    if (intCortexEfetiva === 2) fatorAutonomo = 0.5;
    else if (intCortexEfetiva >= 3) fatorAutonomo = 0.8;
    else return 0;
  }

  const barrasSifao = Math.min(5, barrasSifaoEfetivas);
  const esquivaBaseSifao = CONSTANTES_SISTEMAS_ARMAS.ESQUIVA_BASE_SIFAO_POR_BARRA_PCT[barrasSifao] ?? 0;

  const operadorNoSifao = naveJogador.tripulacao.some(
    (t) =>
      t.localizacao === 'NAVE_JOGADOR' &&
      t.hpAtual > 0 &&
      t.camaraAtualId === 5 &&
      t.camaraDestinoId === null &&
      t.acopladoBulbo === true &&
      !t.inflado
  );

  const bonusPiloto = pilotoNoCortex ? CONSTANTES_SISTEMAS_ARMAS.BONUS_ESQUIVA_PILOTO_CORTEX_PCT : 0;
  const bonusSifao = operadorNoSifao ? CONSTANTES_SISTEMAS_ARMAS.BONUS_ESQUIVA_OPERADOR_SIFAO_PCT : 0;
  const bonusTinta =
    Number(naveJogador.furtividadeAtivaSeg ?? 0) > 0
      ? CONSTANTES_SISTEMAS_ARMAS.BONUS_ESQUIVA_TINTA_FURTIVA_PCT
      : 0;

  const esquivaAntesFator = esquivaBaseSifao + bonusPiloto + bonusSifao;
  return Math.min(100, Math.floor(esquivaAntesFator * fatorAutonomo) + bonusTinta);
}

/**
 * Calcula o tempo de regeneração de 1 camada da Glândula de Barreira (Seção 1.4: 2.0s / 1.7s / 1.5s).
 */
export function calcularTempoRegenBarreiraSeg(naveJogador) {
  const operadorBarreira = naveJogador.tripulacao.find(
    (t) =>
      t.localizacao === 'NAVE_JOGADOR' &&
      t.hpAtual > 0 &&
      t.camaraAtualId === 4 &&
      t.camaraDestinoId === null &&
      t.acopladoBulbo === true &&
      !t.inflado
  );
  if (!operadorBarreira) return CONSTANTES_SISTEMAS_ARMAS.TEMPO_REGEN_BARREIRA_SEM_OPERADOR_SEG;
  if (operadorBarreira.especie === 'POLVO') return CONSTANTES_SISTEMAS_ARMAS.TEMPO_REGEN_BARREIRA_POLVO_SEG;
  return CONSTANTES_SISTEMAS_ARMAS.TEMPO_REGEN_BARREIRA_OPERADOR_COMUM_SEG;
}

/**
 * Valida se uma trinca ordenada de salas [S1, S2, S3] é um caminho simples ortogonal válido para o Beam (Seção 1.6.C).
 */
export function validarTrincaBeam(trincaSalasBeam, grafoOrtogonal = GRAFOS_BEAM_CANONICOS.BIONAVE_2X4) {
  if (!Array.isArray(trincaSalasBeam) || trincaSalasBeam.length !== 3) return false;
  const [s1, s2, s3] = trincaSalasBeam;
  if (s1 === s2 || s2 === s3 || s1 === s3) return false;
  const vizS1 = grafoOrtogonal[s1] ?? [];
  const vizS2 = grafoOrtogonal[s2] ?? [];
  return vizS1.includes(s2) && vizS2.includes(s3);
}

/**
 * Enumera todas as trincas ordenadas simples de Beam num grafo ortogonal (32 na 2x4, 8 na 2x2, 4 na 1x4).
 */
export function enumerarTrincasBeam(grafoOrtogonal = GRAFOS_BEAM_CANONICOS.BIONAVE_2X4) {
  const trincas = [];
  for (const s1Str of Object.keys(grafoOrtogonal)) {
    const s1 = Number(s1Str);
    for (const s2 of grafoOrtogonal[s1] ?? []) {
      for (const s3 of grafoOrtogonal[s2] ?? []) {
        if (validarTrincaBeam([s1, s2, s3], grafoOrtogonal)) {
          trincas.push([s1, s2, s3]);
        }
      }
    }
  }
  return congelarProfundo(trincas);
}

/**
 * Sincroniza da esquerda para a direita (`slot 0..3`) a energia ativa das armas dorsais (`armasAtivas`)
 * com o orçamento energético efetivo da Câmara 1 (`ARTILHARIA_DORSAL`: `min(barrasEnergiaAlocada, barrasIntegridade) - danoIonizado`).
 */
export function sincronizarEnergiaArmasComCamaraArtilharia(nave, opcoes = {}) {
  if (!nave || typeof nave !== 'object' || !Array.isArray(nave.armasAtivas)) {
    return nave;
  }
  const camArt = Array.isArray(nave.camaras) ? nave.camaras.find((c) => Number(c.id) === 1) : null;
  if (!camArt) {
    return Object.isFrozen(nave) ? nave : congelarProfundo(structuredClone(nave));
  }
  const intArt = Math.max(0, Number(camArt.barrasIntegridade ?? camArt.integridade ?? 0));
  const ionArt = Math.max(0, Number(camArt.danoIonizado ?? camArt.barrasIonizadas ?? 0));
  const alocArt = Math.max(0, Number(camArt.barrasEnergiaAlocada ?? camArt.energiaAlocada ?? 0));
  const redistribuir = opcoes.redistribuir === true;
  let orcamentoRestante =
    opcoes.ignorarTetoArtilhariaMutacao === true
      ? 99
      : Math.max(0, Math.min(alocArt, Math.max(0, intArt - ionArt)));

  const ordemIndices = nave.armasAtivas
    .map((slot, idx) => {
      const arma = slot && typeof slot === 'object' && 'arma' in slot ? slot.arma : slot;
      const temAlvoAtivo =
        Boolean(arma) &&
        ((arma.salaAlvoId !== null && arma.salaAlvoId !== undefined) ||
          (Array.isArray(arma.trincaSalasBeam) && arma.trincaSalasBeam.length > 0));
      return { idx, prioridade: temAlvoAtivo ? 0 : 1 };
    })
    .sort((a, b) => a.prioridade - b.prioridade || a.idx - b.idx);

  const novasArmas = new Array(nave.armasAtivas.length);
  for (const { idx } of ordemIndices) {
    const slot = nave.armasAtivas[idx];
    const temWrapper = slot && typeof slot === 'object' && 'arma' in slot;
    const arma = temWrapper ? slot.arma : slot;
    if (!arma) {
      novasArmas[idx] = slot;
      continue;
    }
    const custo = Math.max(1, Number(arma.energiaCusto ?? arma.energia ?? 1));
    const estavaLigada = Number(arma.energiaAlocada ?? custo) >= custo;
    const deveLigar = redistribuir ? orcamentoRestante >= custo : estavaLigada && orcamentoRestante >= custo;
    if (deveLigar) {
      orcamentoRestante -= custo;
      const armaLigada = {
        ...arma,
        energiaAlocada: custo,
      };
      novasArmas[idx] = temWrapper ? { ...slot, arma: armaLigada } : armaLigada;
      continue;
    }
    const armaDesligada = {
      ...arma,
      energiaAlocada: 0,
      progressoRecargaSeg: 0.0,
      disparoManualAutorizado: false,
    };
    novasArmas[idx] = temWrapper ? { ...slot, arma: armaDesligada } : armaDesligada;
  }

  const resultado = {
    ...nave,
    armasAtivas: novasArmas,
  };
  return Object.isFrozen(nave) ? congelarProfundo(structuredClone(resultado)) : resultado;
}

/**
 * Avança um tick puro dos Sistemas, Armas, Barreira, Oxigênio e Curto-Circuito da nave.
 */
export function avancarTickSistemasEArmas(estado, dtSeg = 0.25, opcoesDebug = {}) {
  if (!Object.isFrozen(estado)) {
    throw new Error('[Lei L2] avancarTickSistemasEArmas exige estado de entrada congelado (Object.freeze)');
  }
  const proximo = structuredClone(estado);
  const nave = proximo.naveJogador;

  // 1. Atualizar timers globais de habilidades (Pulso de Enzimas e Tinta Furtiva)
  if (nave.pulsoEnzimasAtivoSeg > 0) {
    nave.pulsoEnzimasAtivoSeg = Math.max(0.0, arredondar4(nave.pulsoEnzimasAtivoSeg - dtSeg));
  }
  if (nave.recargaPulsoEnzimasSeg > 0) {
    nave.recargaPulsoEnzimasSeg = Math.max(0.0, arredondar4(nave.recargaPulsoEnzimasSeg - dtSeg));
  }
  if (nave.furtividadeAtivaSeg > 0) {
    nave.furtividadeAtivaSeg = Math.max(0.0, arredondar4(nave.furtividadeAtivaSeg - dtSeg));
  }
  if (nave.recargaFurtividadeSeg > 0) {
    nave.recargaFurtividadeSeg = Math.max(0.0, arredondar4(nave.recargaFurtividadeSeg - dtSeg));
  }
  if (nave.recargaTuboAbordagemSeg > 0) {
    nave.recargaTuboAbordagemSeg = Math.max(0.0, arredondar4(nave.recargaTuboAbordagemSeg - dtSeg));
  }

  // 2. Glândula de Barreira (Câmara 4): 2 barras por camada ativa (descontando barras ionizadas se em choque)
  const camaraBarreira = nave.camaras.find((c) => c.id === 4);
  const barrasIonizadasBarreira = Math.max(0, Number(camaraBarreira?.danoIonizado ?? camaraBarreira?.barrasIonizadas ?? 0));
  const maxCamadasBarreira = camaraBarreira
    ? Math.floor(Math.max(0, Number(camaraBarreira.barrasEnergiaAlocada ?? camaraBarreira.energiaAlocada ?? 0) - barrasIonizadasBarreira) / 2)
    : 0;
  if (nave.camadasBarreiraAtivas > maxCamadasBarreira) {
    nave.camadasBarreiraAtivas = maxCamadasBarreira;
    nave.progressoRegenBarreiraSeg = 0.0;
  } else if (nave.camadasBarreiraAtivas < maxCamadasBarreira) {
    const tempoRegen = calcularTempoRegenBarreiraSeg(nave);
    nave.progressoRegenBarreiraSeg = arredondar4((nave.progressoRegenBarreiraSeg ?? 0.0) + dtSeg);
    while (nave.progressoRegenBarreiraSeg >= tempoRegen && nave.camadasBarreiraAtivas < maxCamadasBarreira) {
      nave.progressoRegenBarreiraSeg = arredondar4(nave.progressoRegenBarreiraSeg - tempoRegen);
      nave.camadasBarreiraAtivas += 1;
    }
    if (nave.camadasBarreiraAtivas >= maxCamadasBarreira) {
      nave.progressoRegenBarreiraSeg = 0.0;
    }
  } else {
    nave.progressoRegenBarreiraSeg = 0.0;
  }
  nave.barreira = {
    ...(nave.barreira ?? {}),
    bolhasAtuais: nave.camadasBarreiraAtivas,
    bolhasMax: maxCamadasBarreira,
  };

  // 3. Bomba Branquial (Câmara 3): Oxigênio (-4%/s desligada, +8%/s ligada) e Curto-Circuito por câmara
  const camaraBranquial = nave.camaras.find((c) => c.id === 3);
  const barrasIonizadasBranquial = Math.max(0, Number(camaraBranquial?.danoIonizado ?? camaraBranquial?.barrasIonizadas ?? 0));
  const branquialLigada =
    camaraBranquial &&
    Number(camaraBranquial.barrasIntegridade ?? camaraBranquial.integridade ?? 0) >= 1 &&
    Number(camaraBranquial.barrasEnergiaAlocada ?? camaraBranquial.energiaAlocada ?? 0) - barrasIonizadasBranquial >= 1;

  for (const camara of nave.camaras) {
    // Timers de Choque/Íon e Isolamento Residual Pós-Choque (5.0s)
    const ionSegAtual = Math.max(Number(camara.tempoParalisiaIonSeg ?? 0), Number(camara.tempoRestanteIonSeg ?? 0));
    if (ionSegAtual > 0) {
      const novoIonSeg = Math.max(0.0, arredondar4(ionSegAtual - dtSeg));
      camara.tempoParalisiaIonSeg = novoIonSeg;
      camara.tempoRestanteIonSeg = novoIonSeg;
      if (novoIonSeg === 0) {
        camara.danoIonizado = 0;
        camara.isolamentoResidualChoqueSeg = 5.0;
      }
    } else if (camara.isolamentoResidualChoqueSeg > 0) {
      camara.isolamentoResidualChoqueSeg = Math.max(0.0, arredondar4(camara.isolamentoResidualChoqueSeg - dtSeg));
    }

    // Oxigênio (O2)
    if (branquialLigada && camara.aguaKg > 0) {
      camara.oxigenioPct = Math.min(
        100.0,
        arredondar4(camara.oxigenioPct + CONSTANTES_SISTEMAS_ARMAS.TAXA_RECUPERACAO_O2_BRANQUIAL_ATIVA_PCT_S * dtSeg)
      );
    } else {
      camara.oxigenioPct = Math.max(
        0.0,
        arredondar4(camara.oxigenioPct - CONSTANTES_SISTEMAS_ARMAS.TAXA_QUEDA_O2_BRANQUIAL_DESLIGADA_PCT_S * dtSeg)
      );
    }

    // Curto-Circuito Aquático (Seção 1.3): extingue em 3.0s a 0% água; queima 1 barra a cada 8.0s na água
    if (camara.curtoCircuitoAtivo) {
      if (camara.aguaKg === 0.0 && camara.alagamentoPesadoKg === 0.0) {
        camara.progressoExtincaoSecoSeg = arredondar4(camara.progressoExtincaoSecoSeg + dtSeg);
        if (camara.progressoExtincaoSecoSeg >= CONSTANTES_SISTEMAS_ARMAS.TEMPO_EXTINCAO_CURTO_SECO_SEG) {
          camara.curtoCircuitoAtivo = false;
          camara.progressoExtincaoSecoSeg = 0.0;
          camara.progressoDanoCurtoSeg = 0.0;
          camara.progressoReparoCurtoSeg = 0.0;
        }
      } else {
        camara.progressoExtincaoSecoSeg = 0.0;
        camara.progressoDanoCurtoSeg = arredondar4(camara.progressoDanoCurtoSeg + dtSeg);
        if (camara.progressoDanoCurtoSeg >= CONSTANTES_SISTEMAS_ARMAS.TEMPO_DANO_SISTEMA_CURTO_SEG) {
          camara.progressoDanoCurtoSeg = arredondar4(
            camara.progressoDanoCurtoSeg - CONSTANTES_SISTEMAS_ARMAS.TEMPO_DANO_SISTEMA_CURTO_SEG
          );
          if (camara.barrasIntegridade > 0) {
            camara.barrasIntegridade -= 1;
            if (camara.barrasEnergiaAlocada > camara.barrasIntegridade) {
              const liberada = camara.barrasEnergiaAlocada - camara.barrasIntegridade;
              camara.barrasEnergiaAlocada = camara.barrasIntegridade;
              nave.reator.barrasDisponiveis += liberada;
            }
          }
        }
      }
    }
  }

  // 4. Recarga de Armas Ativas (Câmara 1 — Artilharia Dorsal acoplada ao orçamento real de energia/integridade/íon)
  nave.armasAtivas = sincronizarEnergiaArmasComCamaraArtilharia(nave, {
    redistribuir: false,
    ...opcoesDebug,
  }).armasAtivas;
  const operadorArtilharia = nave.tripulacao.find(
    (t) =>
      t.localizacao === 'NAVE_JOGADOR' &&
      t.hpAtual > 0 &&
      t.camaraAtualId === 1 &&
      t.camaraDestinoId === null &&
      t.acopladoBulbo === true &&
      !t.inflado
  );
  const especieOpArt = operadorArtilharia ? operadorArtilharia.especie : null;

  for (const slot of nave.armasAtivas) {
    if (!slot.arma) continue;
    const arma = slot.arma;
    if (arma.energiaAlocada < arma.energiaCusto) {
      arma.progressoRecargaSeg = 0.0;
      continue;
    }
    const tempoEfetivo = calcularTempoRecargaEfetivoArma({
      tempoChassiSeg: arma.tempoRecargaBaseSeg,
      penalidadeOrgaosSeg: arma.penalidadeOrgaosSeg ?? 0.0,
      especieOperadorArtilharia: especieOpArt,
      estadoFisico: nave.estadoFisico,
    });
    const fatorVelocidadeRecarga = arma.tempoRecargaBaseSeg / tempoEfetivo;
    arma.progressoRecargaSeg = Math.min(
      arma.tempoRecargaBaseSeg,
      arredondar4(arma.progressoRecargaSeg + dtSeg * fatorVelocidadeRecarga)
    );
  }

  // 5. Carga de Salto de Fuga (Seção 8.5.A e Matriz 6.2 Linha G: 20.0s base, 15.0s c/ operador no Sifão, 0.5x em Touchdown/Spool-up)
  const camaraCortex = nave.camaras.find((c) => c.id === 2);
  const camaraSifao = nave.camaras.find((c) => c.id === 5);
  const ionCortex = Math.max(0, Number(camaraCortex?.danoIonizado ?? camaraCortex?.barrasIonizadas ?? 0));
  const intCortexEfetiva = Math.max(0, Number(camaraCortex?.barrasIntegridade ?? camaraCortex?.integridade ?? 0) - ionCortex);
  const ionSifao = Math.max(0, Number(camaraSifao?.danoIonizado ?? camaraSifao?.barrasIonizadas ?? 0));
  const eneSifaoEfetiva = Math.max(0, Number(camaraSifao?.barrasEnergiaAlocada ?? camaraSifao?.energiaAlocada ?? 0) - ionSifao);
  const pilotoCortexAtivo =
    intCortexEfetiva >= 2 ||
    nave.tripulacao.some(
      (t) =>
        t.localizacao === 'NAVE_JOGADOR' &&
        t.hpAtual > 0 &&
        t.camaraAtualId === 2 &&
        t.camaraDestinoId === null &&
        t.acopladoBulbo === true &&
        !t.inflado
    );
  if (intCortexEfetiva >= 1 && eneSifaoEfetiva >= 1 && pilotoCortexAtivo) {
    const operadorSifaoAtivo = nave.tripulacao.some(
      (t) =>
        t.localizacao === 'NAVE_JOGADOR' &&
        t.hpAtual > 0 &&
        t.camaraAtualId === 5 &&
        t.camaraDestinoId === null &&
        t.acopladoBulbo === true &&
        !t.inflado
    );
    const multOperadorSifao = operadorSifaoAtivo ? 20.0 / 15.0 : 1.0;
    const multEstadoFisico = nave.estadoFisico === '1_NO_FOIL' ? 1.0 : 0.5;
    const taxaFuga = multOperadorSifao * multEstadoFisico;
    nave.progressoFugaSeg = Math.min(20.0, arredondar4((nave.progressoFugaSeg ?? 0.0) + dtSeg * taxaFuga));
  }

  return congelarProfundo(proximo);
}
