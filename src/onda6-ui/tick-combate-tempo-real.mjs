/**
 * ONDA 6 — Motor de Tick Tático em Tempo Real (Onda 1 + Onda 2 + Onda 3 + Onda 5)
 * Dono Único (Lei N5): src/onda6-ui/tick-combate-tempo-real.mjs
 *
 * Responsabilidades:
 *  - Resolver disparos das 7 armas dorsais do jogador (PRNG de esquiva inimiga, trincas Beam e Blindagem Térmica);
 *  - Executar travessia ortogonal BFS sala-a-sala (1.25s/salto), combate corpo-a-corpo e sabotagem interna (5.0s/barra) a bordo;
 *  - Degradar e regenerar subsistemas inimigos (Motor, Cabine, Sonar Militar e Barreira de Bolhas a 2.0s/bolha);
 *  - Executar fogo de retorno determinístico e contragolpes táticos (Mina Magnética, Carapaça Reflexa, Sobrecarga Geotérmica).
 */
import { congelarProfundo } from '../onda1-fisica/estado-inicial.mjs';
import { streamCombateDisparo } from '../onda1-fisica/hash32-streams.mjs';
import {
  calcularPesoTotalNave,
  calcularSustentacaoFoil,
} from '../onda1-fisica/tick-hidraulica-foil.mjs';
import {
  GRAFOS_BEAM_CANONICOS,
  validarTrincaBeam,
  validarCaminhoBeamAdjacente,
  calcularEsquivaEfetivaNave,
  sincronizarEnergiaArmasComCamaraArtilharia,
} from '../onda2-combate/tick-sistemas-armas.mjs';
import {
  avancarTickCombateCompleto,
  FICHAS_ESPECIES_TRIPULACAO,
  CONSTANTES_TRIPULACAO,
} from '../onda2-combate/tick-tripulacao.mjs';
import { avancarTickIaInimiga } from '../onda3-inimigos/ia-barco-monstro.mjs';
import { resolverImpactoNoAlvo } from '../onda3-inimigos/abordagem-vitoria.mjs';
import { avancarTickChefeDraga } from '../onda5-catalogo-chefe/chefe-draga.mjs';
import {
  CATALOGO_ARMAS_51,
  avancarTickBiomaEColmeiaViva,
} from '../onda5-catalogo-chefe/catalogo-naves-itens.mjs';
import {
  resolverGrafoOrtogonalAlvo,
  calcularCaminhoCurtoGrafoAlvo,
  possuiSonarMilitarAtivoAlvo,
} from './encontros-eventos-campanha.mjs';
import {
  resolverArmaCatalogoUnificado,
  calcularModificadoresPassivosOrgaosSteam,
} from '../onda7-steam/catalogo-armas-orgaos-ae.mjs';
import { selecionarAlvoInimigoInteligente } from '../onda7-steam/dificuldades-conquistas-opcoes.mjs';

function recalcularFoilEPesoNaveTick(nave) {
  const pesoTotalKg = calcularPesoTotalNave(nave);
  const sustentacaoAtualKg = calcularSustentacaoFoil(nave);
  let estadoFisico = nave.estadoFisico;
  let progressoSpoolUpSeg = nave.progressoSpoolUpSeg ?? 0.0;
  let camaras = nave.camaras;
  if (pesoTotalKg > sustentacaoAtualKg && estadoFisico === '1_NO_FOIL') {
    estadoFisico = '2_TOUCHDOWN';
    progressoSpoolUpSeg = 0.0;
    camaras = nave.camaras.map((c) => ({ ...c, valvulaExternaAberta: false }));
  }
  return {
    ...nave,
    pesoTotalKg,
    sustentacaoAtualKg,
    estadoFisico,
    progressoSpoolUpSeg,
    camaras,
  };
}

function concederXpMaestriaCombateInPlace(trip, disciplina, pontos = 1) {
  if (!trip || typeof trip !== 'object' || Number(trip.hpAtual ?? 0) <= 0) return;
  const mapaXp = {
    pilotagem: Number(trip.xpMaestria?.pilotagem ?? 0),
    armas: Number(trip.xpMaestria?.armas ?? 0),
    barreira: Number(trip.xpMaestria?.barreira ?? 0),
    reparo: Number(trip.xpMaestria?.reparo ?? 0),
    combate: Number(trip.xpMaestria?.combate ?? 0),
  };
  if (Object.prototype.hasOwnProperty.call(mapaXp, disciplina)) {
    mapaXp[disciplina] += Math.max(1, Math.round(pontos));
  }
  let melhorDisc = trip.disciplinaMaestria ?? disciplina;
  let maxXp = 0;
  for (const [disc, val] of Object.entries(mapaXp)) {
    if (val > maxXp) {
      maxXp = val;
      melhorDisc = disc;
    }
  }
  trip.xpMaestria = mapaXp;
  trip.nivelMaestria = maxXp >= 8 ? 2 : maxXp >= 3 ? 1 : 0;
  if (maxXp > 0) trip.disciplinaMaestria = melhorDisc;
}

export function resolverGrafoBeamAlvoInterno(alvoCombate) {
  return resolverGrafoOrtogonalAlvo(alvoCombate);
}

export function calcularCaminhoCurtoGrafoAlvoInterno(alvoCombate, salaOrigemId, salaDestinoId) {
  return calcularCaminhoCurtoGrafoAlvo(alvoCombate, salaOrigemId, salaDestinoId);
}

export function recalcularSubsistemasAlvoInPlace(alvo) {
  if (!alvo || typeof alvo !== 'object') return;
  const salas = Array.isArray(alvo.salasOuOrgaos) ? alvo.salasOuOrgaos : [];
  if (salas.length === 0) return;
  const classe = String(alvo.classeAlvo ?? alvo.classeInimigo ?? 'BARCO_HUMANO').toUpperCase();
  const baseEsq = Number(alvo.esquivaBasePct ?? alvo.esquivaEfetivaPct ?? (classe === 'MONSTRO_MARINHO' ? 20 : 15));
  alvo.esquivaBasePct = baseEsq;

  if (classe === 'MONSTRO_MARINHO') {
    alvo.sonarMilitarAtivo = false;
    const sifao = salas.find((s) => /SIFAO/i.test(s.nome ?? '') || s.id === 3);
    if (sifao) {
      const intS = Math.max(0, Number(sifao.integridadeAtual ?? sifao.integridade ?? 1));
      const maxS = Math.max(1, Number(sifao.integridadeMax ?? sifao.barrasMax ?? 1));
      const paralisado = Number(sifao.paralisiaIonSeg ?? 0) > 0;
      alvo.esquivaEfetivaPct = paralisado ? 0 : Math.round((baseEsq * intS) / maxS);
    }
    return;
  }

  const salaMotor = salas.find((s) => /MOTOR|M[AÁ]QUINAS|PROPULS[AÃ]O|HIDROJATO|REATOR|BROCA/i.test(s.nome ?? ''));
  const salaCabine = salas.find((s) => /CABINE|COMANDO|PONTE|N[UÚ]CLEO/i.test(s.nome ?? ''));
  const fatorMotor = salaMotor
    ? Number(salaMotor.paralisiaIonSeg ?? 0) > 0
      ? 0
      : Math.max(0, Number(salaMotor.integridadeAtual ?? salaMotor.integridade ?? 1)) /
        Math.max(1, Number(salaMotor.integridadeMax ?? salaMotor.barrasMax ?? 1))
    : 1;
  const fatorCabine = salaCabine
    ? Number(salaCabine.paralisiaIonSeg ?? 0) > 0
      ? 0.5
      : 0.5 +
        0.5 *
          (Math.max(0, Number(salaCabine.integridadeAtual ?? salaCabine.integridade ?? 1)) /
            Math.max(1, Number(salaCabine.integridadeMax ?? salaCabine.barrasMax ?? 1)))
    : 1;
  alvo.esquivaEfetivaPct = Math.round(baseEsq * fatorMotor * fatorCabine);

  // Subsistema SONAR Militar (Corveta, Submarino, Draga Fase 2): ativo apenas enquanto a sala SONAR não for destruída/ionizada
  alvo.sonarMilitarAtivo = possuiSonarMilitarAtivoAlvo(alvo);

  const salaEscudo = salas.find((s) => /ESCUDO|BARREIRA/i.test(s.nome ?? ''));
  if (Number(alvo.barreiraBolhasMax ?? 0) > 0) {
    if (salaEscudo) {
      const intEsc =
        Number(salaEscudo.paralisiaIonSeg ?? salaEscudo.tempoRestanteIonSeg ?? 0) > 0
          ? 0
          : Math.max(0, Number(salaEscudo.integridadeAtual ?? salaEscudo.integridade ?? 0));
      const maxEsc = Math.max(1, Number(salaEscudo.integridadeMax ?? salaEscudo.barrasMax ?? 1));
      const tetoBolhas = Math.floor((Number(alvo.barreiraBolhasMax) * intEsc) / maxEsc);
      alvo.tetoBolhasBarreira = tetoBolhas;
      alvo.camadasBarreiraAtivas = Math.min(Number(alvo.camadasBarreiraAtivas ?? 0), tetoBolhas);
      alvo.barreiraBolhasAtual = alvo.camadasBarreiraAtivas;
    } else {
      alvo.tetoBolhasBarreira = Number(alvo.barreiraBolhasMax);
    }
  } else {
    alvo.tetoBolhasBarreira = 0;
  }
}

function aplicarDanoEmCamaraJogador(
  nave,
  camaraAlvoId,
  danoCasco,
  danoSistema,
  abreRombo = false,
  rolagemBlindagem = 99,
  bonusDeflexaoPct = 0
) {
  const nivelBlindagem = Math.max(0, Number(nave.nivelBlindagem ?? 0));
  const chanceDeflexaoTotal = nivelBlindagem * 15 + Math.max(0, Number(bonusDeflexaoPct ?? 0));
  const blindagemDefletiu = danoCasco > 0 && chanceDeflexaoTotal > 0 && rolagemBlindagem < chanceDeflexaoTotal;
  const danoCascoEfetivo = blindagemDefletiu ? 0 : danoCasco;
  const abreRomboEfetivo = blindagemDefletiu ? false : abreRombo;
  nave.hpCascoAtual = Math.max(0, Number(nave.hpCascoAtual ?? 0) - danoCascoEfetivo);
  const cam = nave.camaras.find((c) => c.id === camaraAlvoId) ?? nave.camaras[0];
  if (!cam) return;
  if (danoSistema > 0 && cam.barrasIntegridade > 0) {
    cam.barrasIntegridade = Math.max(0, cam.barrasIntegridade - danoSistema);
    if (cam.barrasEnergiaAlocada > cam.barrasIntegridade) {
      const liberada = cam.barrasEnergiaAlocada - cam.barrasIntegridade;
      cam.barrasEnergiaAlocada = cam.barrasIntegridade;
      if (nave.reator) {
        nave.reator.barrasDisponiveis = Number(nave.reator.barrasDisponiveis ?? 0) + liberada;
      }
      if (Number(cam.id) === 1) {
        nave.armasAtivas = sincronizarEnergiaArmasComCamaraArtilharia(nave, { redistribuir: false }).armasAtivas;
      }
    }
    for (const t of nave.tripulacao ?? []) {
      if (t.localizacao === 'NAVE_JOGADOR' && t.camaraAtualId === cam.id && t.hpAtual > 0) {
        t.hpAtual = Math.max(0, t.hpAtual - 15 * danoSistema);
      }
    }
  }
  if (abreRomboEfetivo) {
    const baiacuSelando = (nave.tripulacao ?? []).some(
      (t) =>
        t.localizacao === 'NAVE_JOGADOR' &&
        t.camaraAtualId === cam.id &&
        t.hpAtual > 0 &&
        t.especie === 'BAIACU' &&
        t.inflado === true
    );
    if (!baiacuSelando) {
      cam.brechaAtiva = true;
      cam.rombosCasco = Math.max(1, Number(cam.rombosCasco ?? 0) + 1);
    }
  }
  return blindagemDefletiu;
}

function traduzirTextoFlutuanteCombateEn(textoPt) {
  if (typeof textoPt !== 'string') return textoPt;
  const exatos = {
    'DRENO SEGURO 62.5 kg': 'SAFE DRAIN 62.5 kg',
    'REFLEXO BRANQUIAL +1 BRQ!': 'GILL REFLEX +1 BRQ!',
    'CARAPAÇA BLOQUEOU!': 'CARAPACE BLOCKED!',
    'CARAPAÇA QUEBRADA!': 'CARAPACE SHATTERED!',
    'BLINDAGEM!': 'ARMOR DEFLECT!',
    'BLINDAGEM BLOQUEOU!': 'ARMOR BLOCKED!',
    'ESQUIVA!': 'MISS!',
    '-1 SABOTAGEM!': '-1 SABOTAGE!',
    'SURGE: ONDA ARRASTO +50kg!': 'SURGE: DRAG WAVE +50kg!',
    'BARREIRA DRONE!': 'SHIELD BLOCK!',
    '-1 DRONE!': '-1 DRONE!',
    '-1 DRONE MASTRO!': '-1 MAST DRONE!',
    'BARREIRA LASER!': 'SHIELD LASER!',
    '-1 SURGE!': '-1 SURGE!',
    'PROTOCOLO CORTA-FOGO + MINA 4s!': 'FIREWALL + MAG MINE 4s!',
    'MINA ANTI-TOUCHDOWN 4s!': 'ANTI-FOIL MAG MINE 4s!',
    'MINA EVADIDA NO FOIL!': 'MINE EVADED ON FOIL!',
    '-2 MINA!': '-2 MINE!',
    'CARAPAÇA + APERTO +40kg!': 'CARAPACE + GRIP +40kg!',
    'SOBRECARGA +3 BLINDAGEM!': 'OVERLOAD +3 ARMOR!',
    'BARREIRA!': 'SHIELD!',
    '-1 ÁCIDO': '-1 ACID',
    '+1 CASCO DRONE!': '+1 HULL DRONE!',
    'DRONE BARREIRA!': 'DRONE SHIELD!',
    'DRONE -1!': 'DRONE -1!',
  };
  if (exatos[textoPt]) return exatos[textoPt];
  return textoPt
    .replace(' QUILHA!', ' KEEL!')
    .replace(' BRECHA!', ' BREACH!')
    .replace(' BLIND', ' ARMOR');
}

/**
 * Avança 1 tick completo de partida em tempo real (Onda 1 + Onda 2 + Onda 3 + Onda 5).
 */
export function avancarTickPartidaEmTempoReal(estado, dtSeg = 0.25, opcoesDebug = {}) {
  if (!Object.isFrozen(estado)) {
    throw new Error('[Lei L2] avancarTickPartidaEmTempoReal exige estado de entrada congelado (Object.freeze)');
  }
  if ((estado.meta?.faseJogo ?? 'COMBATE') !== 'COMBATE') {
    return estado;
  }

  const somarAguaTotalNave = (nv) =>
    (nv?.camaras ?? []).reduce((acc, c) => acc + Number(c.aguaKg ?? 0) + Number(c.alagamentoPesadoKg ?? 0), 0);
  const aguaTotalAntesTickKg = somarAguaTotalNave(estado.naveJogador);
  const hpCascoAntesTick = Number(estado.naveJogador?.hpCascoAtual ?? 0);
  const idsTripulantesVivosAntesTick = (estado.naveJogador?.tripulacao ?? [])
    .filter((t) => Number(t?.hpAtual ?? 0) > 0)
    .map((t) => t.id);

  let estadoAtual = avancarTickCombateCompleto(estado, dtSeg);
  estadoAtual = avancarTickBiomaEColmeiaViva(estadoAtual, dtSeg);

  const seed = String(estadoAtual.meta?.seedPartida ?? estadoAtual.meta?.sementeRun ?? 'seed-padrao');
  const setorComb = Math.max(
    1,
    Number(estadoAtual.alvoCombate?.setorNumero ?? estadoAtual.mapaSetorial?.setorNumero ?? estadoAtual.meta?.setorAtual ?? 1)
  );
  const noIdComb = String(estadoAtual.mapaSetorial?.noAtualId ?? 'NO_COMBATE');
  const tick = Number(estadoAtual.meta?.tickAtual ?? 0);
  const ehIdiomaEn = estadoAtual.meta?.configuracoesSteam?.idioma === 'en-US';
  const eventosVisuais = [];
  let seqEventoVisual = 0;
  const emitirEventoVisual = (ev) => {
    seqEventoVisual += 1;
    const textoFinal = ehIdiomaEn && typeof ev.texto === 'string' ? traduzirTextoFlutuanteCombateEn(ev.texto) : ev.texto;
    eventosVisuais.push({
      idEvento: tick * 100 + seqEventoVisual,
      tick,
      ...ev,
      ...(textoFinal !== undefined ? { texto: textoFinal } : {}),
    });
  };

  // GD-2 (Corte Automático do Dreno Seguro >= 62.5 kg) + GD-1 (Reflexo Simbiótico Branquial Autônomo)
  {
    const cloneBio = structuredClone(estadoAtual);
    const naveBio = cloneBio.naveJogador;
    let mudouBio = false;

    if (Number(naveBio.alertaReflexoBranquialSeg ?? 0) > 0) {
      naveBio.alertaReflexoBranquialSeg = Math.max(
        0,
        Math.round((Number(naveBio.alertaReflexoBranquialSeg) - dtSeg) * 1000) / 1000
      );
      mudouBio = true;
    }

    if (naveBio.drenoSeguroAtivo === true) {
      const aguaTotal = (naveBio.camaras ?? []).reduce((acc, c) => acc + Number(c.aguaKg ?? 0), 0);
      const algumaAberta = (naveBio.camaras ?? []).some((c) => c.valvulaExternaAberta === true);
      if (!algumaAberta || aguaTotal <= 64.0) {
        if (aguaTotal < 62.5) {
          const falta = Math.round((62.5 - aguaTotal) * 100) / 100;
          const camAjuste =
            (naveBio.camaras ?? []).find((c) => c.valvulaExternaAberta && Number(c.aguaKg ?? 0) + falta <= 12.5) ??
            (naveBio.camaras ?? []).find((c) => Number(c.aguaKg ?? 0) + falta <= 12.5);
          if (camAjuste) {
            camAjuste.aguaKg = Math.min(12.5, Math.round((Number(camAjuste.aguaKg ?? 0) + falta) * 100) / 100);
          }
        }
        for (const c of naveBio.camaras ?? []) {
          c.valvulaExternaAberta = false;
        }
        naveBio.drenoSeguroAtivo = false;
        const nRecalc = recalcularFoilEPesoNaveTick(naveBio);
        cloneBio.naveJogador = nRecalc;
        emitirEventoVisual({
          tipo: 'CORTE_DRENO_SEGURO',
          camaraId: 5,
          texto: 'DRENO SEGURO 62.5 kg',
        });
        mudouBio = true;
      }
    }

    if (!opcoesDebug.desativarReflexoBranquialMutacao && !cloneBio.naveJogador.reflexoBranquialUsado) {
      const nAtu = cloneBio.naveJogador;
      const tripVivos = (nAtu.tripulacao ?? []).filter(
        (t) => t.localizacao === 'NAVE_JOGADOR' && Number(t.hpAtual ?? 0) > 0
      );
      const camHipoxia = (nAtu.camaras ?? []).find(
        (c) =>
          Number(c.aguaKg ?? 0) > 0 &&
          Number(c.oxigenioPct ?? 100) <= 35 &&
          tripVivos.some((t) => t.camaraAtualId === c.id)
      );
      const camBrq = (nAtu.camaras ?? []).find((c) => c.id === 3);
      if (camHipoxia && camBrq) {
        const ionBrq = Math.max(0, Number(camBrq.barrasIonizadas ?? camBrq.danoIonizado ?? 0));
        const intBrq = Math.max(0, Number(camBrq.barrasIntegridade ?? camBrq.integridade ?? 0) - ionBrq);
        const eneBrq = Number(camBrq.barrasEnergiaAlocada ?? camBrq.energiaAlocada ?? 0);
        if (intBrq >= 1 && eneBrq === 0) {
          const dispReator = Number(nAtu.reator?.barrasDisponiveis ?? 0);
          let origemReflexo = null;
          if (dispReator >= 1) {
            nAtu.reator.barrasDisponiveis = dispReator - 1;
            camBrq.barrasEnergiaAlocada = 1;
            camBrq.energiaAlocada = 1;
            origemReflexo = 'REATOR';
          } else {
            const doadora = [8, 7, 4, 1]
              .map((idC) => (nAtu.camaras ?? []).find((c) => c.id === idC))
              .find((c) => c && Number(c.barrasEnergiaAlocada ?? c.energiaAlocada ?? 0) >= 1);
            if (doadora) {
              const novaEneDoadora = Number(doadora.barrasEnergiaAlocada ?? doadora.energiaAlocada ?? 1) - 1;
              doadora.barrasEnergiaAlocada = novaEneDoadora;
              doadora.energiaAlocada = novaEneDoadora;
              camBrq.barrasEnergiaAlocada = 1;
              camBrq.energiaAlocada = 1;
              origemReflexo = `CAMARA_${doadora.id}`;
            }
          }
          if (origemReflexo) {
            nAtu.reflexoBranquialUsado = true;
            nAtu.alertaReflexoBranquialSeg = 6.0;
            nAtu.sistemaEmprestadoReflexoId = origemReflexo;
            const nSincronizadaReflexo =
              origemReflexo === 'CAMARA_1'
                ? sincronizarEnergiaArmasComCamaraArtilharia(nAtu, { redistribuir: false })
                : nAtu;
            cloneBio.naveJogador = recalcularFoilEPesoNaveTick(nSincronizadaReflexo);
            emitirEventoVisual({
              tipo: 'REFLEXO_BRANQUIAL',
              camaraId: 3,
              texto: 'REFLEXO BRANQUIAL +1 BRQ!',
            });
            mudouBio = true;
          }
        }
      }
    }

    if (mudouBio) {
      estadoAtual = congelarProfundo(cloneBio);
    }
  }

  // 0B. Sinapse de Pré-Ignição Neural (AE): no início do encontro carrega imediatamente armas energizadas a 85%
  {
    const modsPre = calcularModificadoresPassivosOrgaosSteam(estadoAtual.naveJogador);
    if (modsPre.preIgnicaoCombatePct > 0 && !estadoAtual.naveJogador?.preIgnicaoAplicadaCombate) {
      const clonePreIg = structuredClone(estadoAtual);
      clonePreIg.naveJogador.preIgnicaoAplicadaCombate = true;
      for (const sl of clonePreIg.naveJogador.armasAtivas ?? []) {
        const ar = sl?.arma !== undefined ? sl.arma : sl;
        if (!ar) continue;
        const cE = Math.max(1, Number(ar.energiaCusto ?? ar.energia ?? 1));
        if (Number(ar.energiaAlocada ?? cE) >= cE) {
          const tRec = Number(ar.tempoRecargaBaseSeg ?? 9);
          ar.progressoRecargaSeg = Math.max(
            Number(ar.progressoRecargaSeg ?? 0),
            Math.round(tRec * modsPre.preIgnicaoCombatePct * 10000) / 10000
          );
        }
      }
      estadoAtual = congelarProfundo(clonePreIg);
    }
  }

  // 0C. Subsistemas Táticos Compráveis Steam (Sonda [H], Esporo Neural [N], Drones de Defesa / Reparo / Assalto)
  if (estadoAtual.meta?.edicaoComercialSteam === true && estadoAtual.naveJogador?.subsistemasTaticosSteam) {
    const subS = estadoAtual.naveJogador.subsistemasTaticosSteam;
    const temAlgumCooldown =
      Number(subS.recargaSondaSeg ?? 0) > 0 ||
      Number(subS.sondaAtivaSeg ?? 0) > 0 ||
      Number(subS.recargaNeuralSeg ?? 0) > 0 ||
      Number(subS.recargaDroneDefesaSeg ?? 0) > 0 ||
      Number(subS.recargaDroneReparoSeg ?? 0) > 0 ||
      Number(subS.recargaDroneAtaqueSeg ?? 0) > 0;
    const podeRepararDrone =
      subS.droneReparo === true &&
      Number(estadoAtual.naveJogador.hpCascoAtual ?? 0) > 0 &&
      Number(estadoAtual.naveJogador.hpCascoAtual ?? 0) < Number(estadoAtual.naveJogador.hpCascoMax ?? 30);
    const podeAtacarDrone =
      subS.droneAtaque === true &&
      Boolean(estadoAtual.alvoCombate) &&
      estadoAtual.alvoCombate.ativo !== false &&
      Number(estadoAtual.alvoCombate.hpCascoAtual ?? 0) > 0;

    if (temAlgumCooldown || podeRepararDrone || podeAtacarDrone) {
      const cloneSubS = structuredClone(estadoAtual);
      const st = cloneSubS.naveJogador.subsistemasTaticosSteam;
      st.recargaSondaSeg = Math.max(0, Math.round((Number(st.recargaSondaSeg ?? 0) - dtSeg) * 10000) / 10000);
      st.sondaAtivaSeg = Math.max(0, Math.round((Number(st.sondaAtivaSeg ?? 0) - dtSeg) * 10000) / 10000);
      st.recargaNeuralSeg = Math.max(0, Math.round((Number(st.recargaNeuralSeg ?? 0) - dtSeg) * 10000) / 10000);
      st.recargaDroneDefesaSeg = Math.max(0, Math.round((Number(st.recargaDroneDefesaSeg ?? 0) - dtSeg) * 10000) / 10000);
      st.recargaDroneReparoSeg = Math.max(0, Math.round((Number(st.recargaDroneReparoSeg ?? 0) - dtSeg) * 10000) / 10000);
      st.recargaDroneAtaqueSeg = Math.max(0, Math.round((Number(st.recargaDroneAtaqueSeg ?? 0) - dtSeg) * 10000) / 10000);

      if (
        st.droneReparo === true &&
        Number(st.recargaDroneReparoSeg ?? 0) <= 0 &&
        Number(cloneSubS.naveJogador.hpCascoAtual ?? 0) > 0 &&
        Number(cloneSubS.naveJogador.hpCascoAtual ?? 0) < Number(cloneSubS.naveJogador.hpCascoMax ?? 30)
      ) {
        cloneSubS.naveJogador.hpCascoAtual = Math.min(
          Number(cloneSubS.naveJogador.hpCascoMax ?? 30),
          Number(cloneSubS.naveJogador.hpCascoAtual ?? 0) + 1
        );
        st.recargaDroneReparoSeg = 12.0;
        emitirEventoVisual({
          tipo: 'REPARO_DRONE_CASCO',
          camaraId: 6,
          texto: '+1 CASCO DRONE!',
        });
      }

      const dispararDroneAtaqueAgora =
        st.droneAtaque === true &&
        Number(st.recargaDroneAtaqueSeg ?? 0) <= 0 &&
        Boolean(cloneSubS.alvoCombate) &&
        cloneSubS.alvoCombate.ativo !== false &&
        Number(cloneSubS.alvoCombate.hpCascoAtual ?? 0) > 0;
      if (dispararDroneAtaqueAgora) {
        st.recargaDroneAtaqueSeg = 8.5;
      }
      estadoAtual = congelarProfundo(cloneSubS);

      if (dispararDroneAtaqueAgora && estadoAtual.alvoCombate?.ativo !== false && Number(estadoAtual.alvoCombate?.hpCascoAtual ?? 0) > 0) {
        const salasCand = (estadoAtual.alvoCombate.salasOuOrgaos ?? []).filter(
          (s) => Number(s.integridadeAtual ?? s.integridade ?? 0) > 0
        );
        const listaSalas = salasCand.length > 0 ? salasCand : (estadoAtual.alvoCombate.salasOuOrgaos ?? []);
        const salaEscolhida =
          listaSalas.length > 0
            ? listaSalas[streamCombateDisparo(seed, setorComb, noIdComb, tick, 977) % listaSalas.length]
            : null;
        const idSalaDr = Number(salaEscolhida?.id ?? 1);
        const hpAntesDr = Number(estadoAtual.alvoCombate.hpCascoAtual ?? 0);
        const barAntesDr = Number(estadoAtual.alvoCombate.camadasBarreiraAtivas ?? 0);
        emitirEventoVisual({
          tipo: 'DISPARO_JOGADOR',
          subtipo: 'DRONE_ATAQUE',
          familiaVisual: 'ACUSTICO',
          slotIndex: 0,
          chassiId: 'EMISSOR_ACUSTICO_I',
          salaAlvoId: idSalaDr,
          acertou: true,
        });
        estadoAtual = resolverImpactoNoAlvo(
          estadoAtual,
          congelarProfundo({
            tipo: 'DISPARO_ARMA',
            salaAlvoId: idSalaDr,
            chassiId: 'EMISSOR_ACUSTICO_I',
            danoCasco: 1,
            danoSistema: 1,
            abreRombo: false,
            municaoCusto: 0,
            orgaosEnxertados: [],
          })
        );
        const hpDepoisDr = Number(estadoAtual.alvoCombate?.hpCascoAtual ?? hpAntesDr);
        const barDepoisDr = Number(estadoAtual.alvoCombate?.camadasBarreiraAtivas ?? barAntesDr);
        emitirEventoVisual({
          tipo: 'IMPACTO_ALVO',
          salaAlvoId: idSalaDr,
          dano: Math.max(0, hpAntesDr - hpDepoisDr),
          texto: barDepoisDr < barAntesDr ? 'DRONE BARREIRA!' : 'DRONE -1!',
        });
      }
    }
  }

  // 1. Disparo das armas dorsais carregadas do jogador (CATALOGO_ARMAS_51 + 17 Armas AE)
  for (let idxSlot = 0; idxSlot < (estadoAtual.naveJogador.armasAtivas ?? []).length; idxSlot += 1) {
    if (!estadoAtual.alvoCombate || estadoAtual.alvoCombate.ativo === false || estadoAtual.alvoCombate.hpCascoAtual <= 0) break;
    const slot = estadoAtual.naveJogador.armasAtivas[idxSlot];
    const arma = slot?.arma !== undefined ? slot.arma : slot;
    if (!arma) continue;
    const custoEnergiaArma = Math.max(1, Number(arma.energiaCusto ?? arma.energia ?? 1));
    if (Number(arma.energiaAlocada ?? custoEnergiaArma) < custoEnergiaArma) {
      continue;
    }
    const chassiDisparo = arma.chassiId ?? arma.id;
    const spec51 = CATALOGO_ARMAS_51.find((a) => a.id === chassiDisparo) ?? resolverArmaCatalogoUnificado(chassiDisparo);
    const ehCargaEstoque = spec51?.mecanicaEspecial === 'CARGA_ESTOQUE' || Number(arma.cargasMaximas ?? spec51?.cargasMaximas ?? 1) > 1;
    const cargasProntas = ehCargaEstoque ? Math.max(0, Number(arma.cargasEstocadas ?? 0)) : 0;
    const prontaParaDisparo = ehCargaEstoque
      ? (cargasProntas >= 1 || Number(arma.progressoRecargaSeg ?? 0) >= Number(arma.tempoRecargaBaseSeg ?? 9))
      : Number(arma.progressoRecargaSeg ?? 0) >= Number(arma.tempoRecargaBaseSeg ?? 9);
    const temAlvo =
      (arma.salaAlvoId !== null && arma.salaAlvoId !== undefined) ||
      (Array.isArray(arma.trincaSalasBeam) && arma.trincaSalasBeam.length > 0);
    if (!temAlvo || !prontaParaDisparo) {
      continue;
    }
    if (arma.modoDisparoManual === true && arma.disparoManualAutorizado !== true) {
      continue;
    }

    const modsOrgDisp = calcularModificadoresPassivosOrgaosSteam(estadoAtual.naveJogador);
    const qtdCargasLiberadas = ehCargaEstoque ? Math.max(1, cargasProntas) : 1;
    const custoMunUnit = Number(arma.municaoCusto ?? spec51?.municao ?? 0);
    const custoMun = custoMunUnit * qtdCargasLiberadas;
    const munAtual = Number(estadoAtual.economia?.municao ?? estadoAtual.recursos?.municao ?? 0);
    if (custoMunUnit > 0 && munAtual < custoMunUnit) {
      continue;
    }
    const cargasEfetivasMun = custoMunUnit > 0 ? Math.min(qtdCargasLiberadas, Math.floor(munAtual / custoMunUnit)) : qtdCargasLiberadas;
    const custoMunReal = custoMunUnit * cargasEfetivasMun;

    {
      const clonePre = structuredClone(estadoAtual);
      const economizouMun =
        custoMunReal > 0 &&
        modsOrgDisp.chanceEconomizarMunicaoPct > 0 &&
        streamCombateDisparo(seed, setorComb, noIdComb, tick, 880 + idxSlot) % 100 < modsOrgDisp.chanceEconomizarMunicaoPct;
      if (custoMunReal > 0 && !economizouMun) {
        if (clonePre.economia) clonePre.economia.municao = Math.max(0, munAtual - custoMunReal);
        if (clonePre.recursos) clonePre.recursos.municao = Math.max(0, munAtual - custoMunReal);
      }
      const sClone = clonePre.naveJogador.armasAtivas[idxSlot];
      const armaCloneRef = sClone?.arma ?? sClone;
      armaCloneRef.progressoRecargaSeg = 0.0;
      armaCloneRef.cargasEstocadas = 0;
      armaCloneRef.disparoManualAutorizado = false;
      if (spec51?.mecanicaEspecial === 'CADEIA_RECARGA' || spec51?.mecanicaEspecial === 'ACELERACAO_CADEIA') {
        const redPorSalva = Number(spec51.reducaoRecargaPorSalvaSeg ?? spec51.reducaoPorCicloSeg ?? 2.0);
        const pisoRec = Number(spec51.pisoRecargaSeg ?? spec51.recargaMinCadeiaSeg ?? 5.0);
        const baseOrig = Number(spec51.recargaSeg ?? armaCloneRef.tempoRecargaOriginalSeg ?? armaCloneRef.tempoRecargaBaseSeg ?? 13);
        armaCloneRef.tempoRecargaOriginalSeg = baseOrig;
        const maxCiclos = Math.max(1, Math.ceil((baseOrig - pisoRec) / Math.max(0.1, redPorSalva)));
        const proxCiclo = Math.min(Number(spec51.ciclosMaxCadeia ?? maxCiclos), Number(armaCloneRef.ciclosCadeiaAtivos ?? 0) + 1);
        armaCloneRef.ciclosCadeiaAtivos = proxCiclo;
        armaCloneRef.tempoRecargaBaseSeg = Math.max(
          pisoRec,
          Math.round((baseOrig - proxCiclo * redPorSalva) * 10000) / 10000
        );
      }
      if (clonePre.meta?.edicaoComercialSteam === true) {
        const artilheiroC1 = (clonePre.naveJogador.tripulacao ?? []).find(
          (t) =>
            t.localizacao === 'NAVE_JOGADOR' &&
            t.camaraAtualId === 1 &&
            t.acopladoBulbo === true &&
            Number(t.hpAtual ?? 0) > 0 &&
            Number(t.atordoadoSeg ?? 0) <= 0
        );
        if (artilheiroC1) {
          concederXpMaestriaCombateInPlace(artilheiroC1, 'armas', 1);
        }
      }
      estadoAtual = congelarProfundo(clonePre);
    }

    const danoCascoBase = arma.danoCasco ?? spec51?.danoCasco ?? 1;
    const danoSistemaBase = arma.danoSistema ?? spec51?.danoSistema ?? 1;
    const danoIonicoBase = Number(arma.danoIonico ?? spec51?.danoIonico ?? 0);
    const duracaoIonBase = Number(arma.duracaoIonSeg ?? spec51?.duracaoIonSeg ?? 5.0);
    const chanceFuroPct = Math.max(0, Number(arma.chanceFuroPct ?? spec51?.chanceFuroPct ?? 0));
    const bonusDanoCascoPuro = Number(arma.bonusDanoCascoPuro ?? spec51?.bonusDanoCascoPuro ?? 0);
    const danoBioDireto = Number(arma.danoTripulacaoDireto ?? spec51?.danoTripulacaoDireto ?? spec51?.danoBioTripulacao ?? 0);
    const atordoamentoSeg = Number(arma.atordoamentoAlvoSeg ?? spec51?.atordoamentoAlvoSeg ?? 0);
    const ignoraBarreira = Boolean(spec51?.ignoraBarreira) || custoMunUnit > 0;

    if (spec51?.ehFeixe) {
      const grafoAlvoBeam = resolverGrafoBeamAlvoInterno(estadoAtual.alvoCombate);
      const tamMaxFeixe = chassiDisparo === 'CORTADOR_TERMICO_PLASMA' ? 3 : Math.max(1, Math.min(3, Number(spec51?.projeteis ?? 3)));
      const caminhoValidoNoAlvo =
        Array.isArray(arma.trincaSalasBeam) &&
        (tamMaxFeixe === 3
          ? validarTrincaBeam(arma.trincaSalasBeam, grafoAlvoBeam)
          : validarCaminhoBeamAdjacente(arma.trincaSalasBeam.slice(0, tamMaxFeixe), grafoAlvoBeam));
      const salasFeixe = caminhoValidoNoAlvo
        ? arma.trincaSalasBeam.slice(0, tamMaxFeixe)
        : [arma.salaAlvoId ?? arma.trincaSalasBeam?.[0] ?? 1];
      emitirEventoVisual({
        tipo: 'FEIXE_JOGADOR',
        slotIndex: idxSlot,
        chassiId: chassiDisparo,
        salasFeixe,
      });
      if ((estadoAtual.alvoCombate.camadasBarreiraAtivas ?? 0) > 0) {
        estadoAtual = resolverImpactoNoAlvo(estadoAtual, {
          tipo: 'DISPARO_ARMA',
          salaAlvoId: salasFeixe[0],
          chassiId: chassiDisparo,
          danoCasco: danoCascoBase,
          danoSistema: danoSistemaBase,
          abreRombo: false,
          municaoCusto: 0,
          orgaosEnxertados: arma.orgaosEnxertados ?? [],
        });
      } else {
        for (const idSalaBeam of salasFeixe) {
          if (!estadoAtual.alvoCombate?.ativo || estadoAtual.alvoCombate.hpCascoAtual <= 0) break;
          const alvoBeam = estadoAtual.alvoCombate;
          const classeBeam = alvoBeam.classeAlvo ?? alvoBeam.classeInimigo ?? 'BARCO_HUMANO';
          if (
            !opcoesDebug.desativarContragolpeInimigoMutacao &&
            classeBeam === 'MONSTRO_MARINHO' &&
            Number(alvoBeam.carapacaReflexaSeg ?? 0) > 0
          ) {
            const orgaoBeam = (alvoBeam.salasOuOrgaos ?? []).find((s) => s.id === idSalaBeam);
            const ehGanglioB = Boolean(orgaoBeam?.ehGanglioCentral || /GANGLIO/i.test(orgaoBeam?.nome ?? ''));
            const ehTentOuBicoB = /TENTACULO|BICO/i.test(orgaoBeam?.nome ?? '');
            if (ehGanglioB && Number(alvoBeam.escudoQuitinaGanglioPts ?? 0) > 0) {
              const cQuitB = structuredClone(estadoAtual);
              cQuitB.alvoCombate.escudoQuitinaGanglioPts = Math.max(
                0,
                Number(cQuitB.alvoCombate.escudoQuitinaGanglioPts ?? 1) - 1
              );
              estadoAtual = congelarProfundo(cQuitB);
              emitirEventoVisual({
                tipo: 'IMPACTO_CARAPACA',
                salaAlvoId: idSalaBeam,
                texto: 'CARAPAÇA BLOQUEOU!',
              });
              continue;
            }
            if (ehTentOuBicoB) {
              const cQuebraB = structuredClone(estadoAtual);
              cQuebraB.alvoCombate.carapacaReflexaSeg = 0;
              cQuebraB.alvoCombate.escudoQuitinaGanglioPts = 0;
              cQuebraB.alvoCombate.apertoQuilhaSeg = 0;
              cQuebraB.naveJogador.pesoVirtualArrastoKg = 0;
              cQuebraB.naveJogador.pesoTotalKg = calcularPesoTotalNave(cQuebraB.naveJogador);
              const orgTentB = (cQuebraB.alvoCombate.salasOuOrgaos ?? []).find((s) => /TENTACULO/i.test(s.nome ?? ''));
              if (orgTentB) orgTentB.paralisiaIonSeg = Math.max(Number(orgTentB.paralisiaIonSeg ?? 0), 3.0);
              estadoAtual = congelarProfundo(cQuebraB);
              emitirEventoVisual({
                tipo: 'QUEBRA_CARAPACA',
                salaAlvoId: idSalaBeam,
                texto: 'CARAPAÇA QUEBRADA!',
              });
            }
          }
          if ((estadoAtual.alvoCombate.blindagemTermicaExternaPts ?? 0) > 0) {
            const cBlind = structuredClone(estadoAtual);
            cBlind.alvoCombate.blindagemTermicaExternaPts = Math.max(
              0,
              cBlind.alvoCombate.blindagemTermicaExternaPts - danoCascoBase
            );
            estadoAtual = congelarProfundo(cBlind);
            emitirEventoVisual({
              tipo: 'IMPACTO_BLINDAGEM',
              salaAlvoId: idSalaBeam,
              texto: 'BLINDAGEM!',
            });
          } else {
            const rolaFuroBeam = streamCombateDisparo(seed, setorComb, noIdComb, tick, 720 + idxSlot * 8 + Number(idSalaBeam)) % 100;
            const abreRomboBeam = chanceFuroPct >= 100 || (chanceFuroPct > 0 && rolaFuroBeam < chanceFuroPct);
            const hpAntesBeam = Number(estadoAtual.alvoCombate?.hpCascoAtual ?? 0);
            estadoAtual = resolverImpactoNoAlvo(estadoAtual, {
              tipo: 'DISPARO_ARMA',
              salaAlvoId: idSalaBeam,
              chassiId: chassiDisparo,
              danoCasco: danoCascoBase,
              danoSistema: danoSistemaBase,
              bonusDanoCascoPuro,
              abreRombo: abreRomboBeam,
              municaoCusto: 0,
              orgaosEnxertados: arma.orgaosEnxertados ?? [],
            });
            const hpDepoisBeam = Number(estadoAtual.alvoCombate?.hpCascoAtual ?? hpAntesBeam);
            const danoCascoEfetivoBeam = Math.max(danoCascoBase, hpAntesBeam - hpDepoisBeam);
            if (danoBioDireto > 0 && estadoAtual.alvoCombate) {
              const cBio = structuredClone(estadoAtual);
              const salaBeamObj = (cBio.alvoCombate.salasOuOrgaos ?? []).find((s) => Number(s.id) === Number(idSalaBeam));
              for (const trSala of salaBeamObj?.tripulantes ?? []) {
                if (Number(trSala.hpAtual ?? 0) > 0) {
                  trSala.hpAtual = Math.max(0, Number(trSala.hpAtual) - danoBioDireto);
                }
              }
              for (const trInim of cBio.alvoCombate.tripulacaoInimiga ?? []) {
                if (Number(trInim.salaAtualId ?? trInim.salaId) === Number(idSalaBeam) && Number(trInim.hpAtual ?? 0) > 0) {
                  trInim.hpAtual = Math.max(0, Number(trInim.hpAtual) - danoBioDireto);
                }
              }
              estadoAtual = congelarProfundo(cBio);
            }
            emitirEventoVisual({
              tipo: 'IMPACTO_ALVO',
              salaAlvoId: idSalaBeam,
              dano: danoCascoEfetivoBeam,
              texto: danoCascoEfetivoBeam > 0 ? `-${danoCascoEfetivoBeam}` : danoBioDireto > 0 ? `-${danoBioDireto} BIO` : `-${danoSistemaBase} SYS`,
            });
          }
        }
      }
    } else {
      const totalProjeteis = cargasEfetivasMun * Math.max(1, Number(spec51?.projeteis ?? 1));
      for (let p = 0; p < totalProjeteis; p += 1) {
        if (!estadoAtual.alvoCombate?.ativo || estadoAtual.alvoCombate.hpCascoAtual <= 0) break;
        const alvo = estadoAtual.alvoCombate;
        const classe = alvo.classeAlvo ?? alvo.classeInimigo ?? 'BARCO_HUMANO';
        const salaProp = (alvo.salasOuOrgaos ?? []).find((s) =>
          classe === 'MONSTRO_MARINHO'
            ? /SIF[AÃ]O/i.test(s.nome)
            : /MOTOR|M[AÁ]QUINAS|PROPULS[AÃ]O|HIDROJATO|REATOR|BROCA/i.test(s.nome)
        );
        const propViva = !salaProp || Number(salaProp.integridadeAtual ?? salaProp.integridade ?? 1) > 0;
        const bonusPrecisaoSonar = Number(modsOrgDisp.bonusPrecisaoArmasPct ?? 0);
        const esquivaAlvo = propViva
          ? Math.max(0, Number(alvo.esquivaEfetivaPct ?? alvo.esquivaBasePct ?? 15) - bonusPrecisaoSonar)
          : 0;
        const rolagem = streamCombateDisparo(seed, setorComb, noIdComb, tick, idxSlot * 16 + p + 1) % 100;
        emitirEventoVisual({
          tipo: 'DISPARO_JOGADOR',
          slotIndex: idxSlot,
          chassiId: chassiDisparo,
          salaAlvoId: arma.salaAlvoId,
          acertou: Boolean(opcoesDebug.forcarAcerto100Pct || rolagem >= esquivaAlvo),
        });
        if (!opcoesDebug.forcarAcerto100Pct && rolagem < esquivaAlvo) {
          emitirEventoVisual({
            tipo: 'ESQUIVA_ALVO',
            salaAlvoId: arma.salaAlvoId,
            texto: 'ESQUIVA!',
          });
          continue;
        }
        if (!opcoesDebug.desativarContragolpeInimigoMutacao && classe === 'MONSTRO_MARINHO' && Number(alvo.carapacaReflexaSeg ?? 0) > 0) {
          const orgaoMirado = (alvo.salasOuOrgaos ?? []).find((s) => s.id === arma.salaAlvoId);
          const ehGanglio = Boolean(orgaoMirado?.ehGanglioCentral || /GANGLIO/i.test(orgaoMirado?.nome ?? ''));
          const ehTentaculoOuBico = /TENTACULO|BICO/i.test(orgaoMirado?.nome ?? '');
          if (ehGanglio && Number(alvo.escudoQuitinaGanglioPts ?? 0) > 0) {
            const cQuitina = structuredClone(estadoAtual);
            cQuitina.alvoCombate.escudoQuitinaGanglioPts = Math.max(0, Number(cQuitina.alvoCombate.escudoQuitinaGanglioPts ?? 1) - 1);
            estadoAtual = congelarProfundo(cQuitina);
            emitirEventoVisual({
              tipo: 'IMPACTO_CARAPACA',
              salaAlvoId: arma.salaAlvoId,
              texto: 'CARAPAÇA BLOQUEOU!',
            });
            continue;
          }
          if (ehTentaculoOuBico) {
            const cQuebra = structuredClone(estadoAtual);
            cQuebra.alvoCombate.carapacaReflexaSeg = 0;
            cQuebra.alvoCombate.escudoQuitinaGanglioPts = 0;
            cQuebra.alvoCombate.apertoQuilhaSeg = 0;
            cQuebra.naveJogador.pesoVirtualArrastoKg = 0;
            cQuebra.naveJogador.pesoTotalKg = calcularPesoTotalNave(cQuebra.naveJogador);
            const orgTent = (cQuebra.alvoCombate.salasOuOrgaos ?? []).find((s) => /TENTACULO/i.test(s.nome ?? ''));
            if (orgTent) orgTent.paralisiaIonSeg = Math.max(Number(orgTent.paralisiaIonSeg ?? 0), 3.0);
            estadoAtual = congelarProfundo(cQuebra);
            emitirEventoVisual({
              tipo: 'QUEBRA_CARAPACA',
              salaAlvoId: arma.salaAlvoId,
              texto: 'CARAPAÇA QUEBRADA!',
            });
          }
        }
        if (
          (estadoAtual.alvoCombate.blindagemTermicaExternaPts ?? 0) > 0 &&
          (ignoraBarreira || Number(estadoAtual.alvoCombate.camadasBarreiraAtivas ?? 0) === 0)
        ) {
          const cBlind = structuredClone(estadoAtual);
          cBlind.alvoCombate.blindagemTermicaExternaPts = Math.max(
            0,
            cBlind.alvoCombate.blindagemTermicaExternaPts - Math.max(1, danoCascoBase)
          );
          estadoAtual = congelarProfundo(cBlind);
          emitirEventoVisual({
            tipo: 'IMPACTO_BLINDAGEM',
            salaAlvoId: arma.salaAlvoId,
            texto: `-${Math.max(1, danoCascoBase)} BLIND`,
          });
          continue;
        }
        const rolaFuroProj = streamCombateDisparo(seed, setorComb, noIdComb, tick, 760 + idxSlot * 16 + p) % 100;
        const abreRomboProj = chanceFuroPct >= 100 || (chanceFuroPct > 0 && rolaFuroProj < chanceFuroPct);
        const tinhaBarreiraAntes = Number(estadoAtual.alvoCombate.camadasBarreiraAtivas ?? 0) > 0 && !ignoraBarreira;
        estadoAtual = resolverImpactoNoAlvo(estadoAtual, {
          tipo: 'DISPARO_ARMA',
          salaAlvoId: arma.salaAlvoId,
          chassiId: chassiDisparo,
          danoCasco: danoCascoBase,
          danoSistema: danoSistemaBase,
          bonusDanoCascoPuro,
          abreRombo: abreRomboProj,
          municaoCusto: ignoraBarreira ? 1 : 0,
          orgaosEnxertados: arma.orgaosEnxertados ?? [],
        });
        if (
          !tinhaBarreiraAntes &&
          (danoIonicoBase > 0 ||
            atordoamentoSeg > 0 ||
            spec51?.mecanicaEspecial === 'SIFAO_OSMOTICO' ||
            spec51?.mecanicaEspecial === 'ESTASE_CRIO' ||
            spec51?.mecanicaEspecial === 'CORROSAO_ACIDA')
        ) {
          const cAe = structuredClone(estadoAtual);
          const salaHit = (cAe.alvoCombate?.salasOuOrgaos ?? []).find((s) => s.id === arma.salaAlvoId);
          if (salaHit && danoIonicoBase > 0) {
            salaHit.paralisiaIonSeg = Math.max(Number(salaHit.paralisiaIonSeg ?? 0), duracaoIonBase * danoIonicoBase);
          }
          if (salaHit && spec51?.mecanicaEspecial === 'CORROSAO_ACIDA') {
            salaHit.corrosaoAcidaSeg = Math.max(
              Number(salaHit.corrosaoAcidaSeg ?? 0),
              Number(spec51.duracaoAcidoSeg ?? 6.0)
            );
            salaHit.acumuladorAcidoSeg = Number(salaHit.acumuladorAcidoSeg ?? 0);
          }
          if (atordoamentoSeg > 0 || spec51?.mecanicaEspecial === 'ESTASE_CRIO') {
            const durStun = Math.max(atordoamentoSeg, spec51?.mecanicaEspecial === 'ESTASE_CRIO' ? 8 : 0);
            for (const trSala of salaHit?.tripulantes ?? []) {
              if (Number(trSala.hpAtual ?? 0) > 0) {
                trSala.atordoadoSeg = Math.max(Number(trSala.atordoadoSeg ?? 0), durStun);
              }
            }
            for (const trInim of cAe.alvoCombate?.tripulacaoInimiga ?? []) {
              if (Number(trInim.salaAtualId ?? trInim.salaId) === Number(arma.salaAlvoId)) {
                trInim.atordoadoSeg = Math.max(Number(trInim.atordoadoSeg ?? 0), durStun);
              }
            }
          }
          if (spec51?.mecanicaEspecial === 'SIFAO_OSMOTICO') {
            for (const trAli of cAe.naveJogador?.tripulacao ?? []) {
              if (trAli.localizacao === 'BORDO_INIMIGO' && Number(trAli.salaInimigaId ?? trAli.salaAlvoId) === Number(arma.salaAlvoId) && trAli.hpAtual > 0) {
                trAli.hpAtual = Math.min(Number(trAli.hpMax ?? 100), Number(trAli.hpAtual) + Number(spec51.curaAliadosAbordagemHp ?? 28));
              }
            }
          }
          estadoAtual = congelarProfundo(cAe);
        } else if (tinhaBarreiraAntes && danoIonicoBase > 1 && estadoAtual.alvoCombate) {
          const cIonEsc = structuredClone(estadoAtual);
          cIonEsc.alvoCombate.camadasBarreiraAtivas = Math.max(0, Number(cIonEsc.alvoCombate.camadasBarreiraAtivas ?? 0) - (danoIonicoBase - 1));
          estadoAtual = congelarProfundo(cIonEsc);
        }
        emitirEventoVisual({
          tipo: 'IMPACTO_ALVO',
          salaAlvoId: arma.salaAlvoId,
          familiaVisual: spec51?.familiaVisual ?? 'PROJETIL_ACUSTICO',
          resultadoBalistico: tinhaBarreiraAntes ? 'ESCUDO' : 'IMPACTO',
          dano: Math.max(danoCascoBase, danoSistemaBase, danoIonicoBase),
          texto: danoCascoBase > 0 ? `-${danoCascoBase}` : danoIonicoBase > 0 ? `+${danoIonicoBase} ION` : `-${danoSistemaBase} ORG`,
        });
      }
    }
  }

  // 1A-Acido. DoT de Corrosão Ácida (MORTEIRO_ACIDO_CORROSIVO): -4 HP/s na tripulação da sala + -1 integridade a cada 2.0s
  if (
    estadoAtual.alvoCombate &&
    estadoAtual.alvoCombate.ativo !== false &&
    (estadoAtual.alvoCombate.salasOuOrgaos ?? []).some((s) => Number(s.corrosaoAcidaSeg ?? 0) > 0)
  ) {
    const cloneAcido = structuredClone(estadoAtual);
    for (const sAc of cloneAcido.alvoCombate.salasOuOrgaos ?? []) {
      const restAc = Number(sAc.corrosaoAcidaSeg ?? 0);
      if (restAc <= 0) continue;
      const dtAc = Math.min(dtSeg, restAc);
      sAc.corrosaoAcidaSeg = Math.max(0, Math.round((restAc - dtSeg) * 1000) / 1000);
      for (const h of sAc.tripulantes ?? []) {
        if (Number(h.hpAtual ?? 0) > 0) {
          h.hpAtual = Math.max(0, Math.round((Number(h.hpAtual) - 4.0 * dtAc) * 1000) / 1000);
        }
      }
      for (const h of cloneAcido.alvoCombate.tripulacaoInimiga ?? []) {
        if (Number(h.salaAtualId ?? h.salaId) === Number(sAc.id) && Number(h.hpAtual ?? 0) > 0) {
          h.hpAtual = Math.max(0, Math.round((Number(h.hpAtual) - 4.0 * dtAc) * 1000) / 1000);
        }
      }
      let acum = Math.round(((Number(sAc.acumuladorAcidoSeg ?? 0)) + dtAc) * 1000) / 1000;
      while (acum >= 2.0) {
        acum = Math.round((acum - 2.0) * 1000) / 1000;
        const intAtu = Number(sAc.integridadeAtual ?? sAc.integridade ?? 0);
        if (intAtu > 0) {
          sAc.integridadeAtual = intAtu - 1;
          sAc.integridade = intAtu - 1;
          emitirEventoVisual({
            tipo: 'IMPACTO_ALVO',
            salaAlvoId: sAc.id,
            dano: 1,
            texto: '-1 ÁCIDO',
          });
        }
      }
      sAc.acumuladorAcidoSeg = sAc.corrosaoAcidaSeg > 0 ? acum : 0;
    }
    estadoAtual = congelarProfundo(cloneAcido);
  }

  if (estadoAtual.alvoCombate && estadoAtual.alvoCombate.ativo !== false) {
    const cloneSubArmas = structuredClone(estadoAtual);
    recalcularSubsistemasAlvoInPlace(cloneSubArmas.alvoCombate);
    estadoAtual = congelarProfundo(cloneSubArmas);
  }

  // 1B. Travessia Sala-a-Sala (1.25s/salto), Combate Corpo-a-Corpo, Sabotagem Interna (5.0s/barra) e Desidratação em Sala Seca
  if (
    estadoAtual.alvoCombate &&
    estadoAtual.alvoCombate.ativo !== false &&
    estadoAtual.alvoCombate.hpCascoAtual > 0 &&
    (estadoAtual.naveJogador.tripulacao ?? []).some((t) => t.localizacao === 'BORDO_INIMIGO' && Number(t.hpAtual ?? 0) > 0)
  ) {
    const cloneBordo = structuredClone(estadoAtual);
    const alvoB = cloneBordo.alvoCombate;
    const classeB = alvoB.classeAlvo ?? alvoB.classeInimigo ?? 'BARCO_HUMANO';
    const sabotagensSalasIds = [];

    for (const ali of cloneBordo.naveJogador.tripulacao ?? []) {
      if (ali.localizacao !== 'BORDO_INIMIGO' || Number(ali.hpAtual ?? 0) <= 0) continue;
      let salaHostil =
        (alvoB.salasOuOrgaos ?? []).find((s) => Number(s.id) === Number(ali.salaInimigaId)) ??
        (alvoB.salasOuOrgaos ?? [])[0];
      if (!salaHostil) continue;
      ali.salaInimigaId = salaHostil.id;

      const fichaAli = FICHAS_ESPECIES_TRIPULACAO[ali.especie] ?? FICHAS_ESPECIES_TRIPULACAO.CARANGUEJO;
      const salaSecaHostil =
        classeB !== 'MONSTRO_MARINHO' &&
        !salaHostil.submersa &&
        Number(salaHostil.aguaKg ?? 0) <= 0;
      if (salaSecaHostil && !fichaAli.anfibioImuneSeca) {
        ali.hpAtual = Math.max(
          0,
          Math.round((Number(ali.hpAtual) - CONSTANTES_TRIPULACAO.DANO_ASFIXIA_SECA_OU_HIPOXIA_HP_S * dtSeg) * 1000) / 1000
        );
        if (ali.hpAtual <= 0) continue;
      }

      const multVelSeca =
        salaSecaHostil && !fichaAli.anfibioImuneSeca
          ? CONSTANTES_TRIPULACAO.PENALIDADE_VEL_E_REPARO_SALA_SECA_MULT
          : 1.0;

      let dtRestanteAcao = dtSeg;
      if (
        ali.proximaSalaInimigaId !== null &&
        ali.proximaSalaInimigaId !== undefined &&
        Number(ali.proximaSalaInimigaId) !== Number(ali.salaInimigaId)
      ) {
        ali.progressoSabotagemInternaSeg = 0.0;
        let progTrav = Number(ali.progressoTravessiaInimigaSeg ?? 0) + dtSeg * multVelSeca;
        const TEMPO_SALTO_INIMIGO_SEG = 1.25;
        while (
          progTrav >= TEMPO_SALTO_INIMIGO_SEG &&
          ali.proximaSalaInimigaId !== null &&
          ali.proximaSalaInimigaId !== undefined
        ) {
          const idProx = Number(ali.proximaSalaInimigaId);
          const ocupantesProx = (cloneBordo.naveJogador.tripulacao ?? []).filter(
            (o) =>
              o.id !== ali.id &&
              Number(o.hpAtual ?? 0) > 0 &&
              o.localizacao === 'BORDO_INIMIGO' &&
              Number(o.salaInimigaId) === idProx
          ).length;
          if (ocupantesProx >= 2) {
            progTrav = TEMPO_SALTO_INIMIGO_SEG;
            break;
          }
          progTrav = Math.max(0, Math.round((progTrav - TEMPO_SALTO_INIMIGO_SEG) * 10000) / 10000);
          ali.salaInimigaId = idProx;
          const novaRota = Array.isArray(ali.rotaInimigaAtiva) ? ali.rotaInimigaAtiva.slice(1) : [];
          ali.rotaInimigaAtiva = novaRota;
          if (novaRota.length > 0) {
            ali.proximaSalaInimigaId = novaRota[0];
          } else {
            ali.proximaSalaInimigaId = null;
            ali.salaInimigaDestinoId = null;
          }
        }
        ali.progressoTravessiaInimigaSeg =
          ali.proximaSalaInimigaId !== null && ali.proximaSalaInimigaId !== undefined
            ? Math.round(progTrav * 10000) / 10000
            : 0.0;
        salaHostil =
          (alvoB.salasOuOrgaos ?? []).find((s) => Number(s.id) === Number(ali.salaInimigaId)) ?? salaHostil;
        if (ali.proximaSalaInimigaId !== null && ali.proximaSalaInimigaId !== undefined) {
          continue;
        }
        dtRestanteAcao = multVelSeca > 0 ? Math.min(dtSeg, progTrav / multVelSeca) : 0;
        ali.progressoTravessiaInimigaSeg = 0.0;
        if (dtRestanteAcao <= 0.0001) continue;
      }

      const idsVistos = new Set();
      const defensoresNaSala = [];
      for (const h of salaHostil.tripulantes ?? []) {
        if (Number(h.hpAtual ?? 0) > 0 && !idsVistos.has(h.id)) {
          idsVistos.add(h.id);
          defensoresNaSala.push(h);
        }
      }
      for (const h of alvoB.tripulacaoInimiga ?? []) {
        if (Number(h.salaId) === Number(salaHostil.id) && Number(h.hpAtual ?? 0) > 0 && !idsVistos.has(h.id)) {
          idsVistos.add(h.id);
          defensoresNaSala.push(h);
        }
      }

      if (classeB !== 'MONSTRO_MARINHO' && defensoresNaSala.length > 0) {
        ali.progressoSabotagemInternaSeg = 0.0;
        const modsBordo = calcularModificadoresPassivosOrgaosSteam(cloneBordo.naveJogador);
        const vampHp = Number(modsBordo.vampirismoAbordagemHpSeg ?? 0) * dtRestanteAcao;
        const nvMaestriaBordo = Math.max(0, Math.min(2, Number(ali.nivelMaestria ?? 0)));
        const danoAliado =
          Number(fichaAli.dpsCorpoACorpo ?? 10) * (1 + 0.15 * nvMaestriaBordo) * multVelSeca * dtRestanteAcao + vampHp;
        const idAlvoHum = defensoresNaSala[0].id;
        const hpHumAntes = Number(defensoresNaSala[0].hpAtual);
        const novoHpHum = Math.max(0, Math.round((hpHumAntes - danoAliado) * 1000) / 1000);
        if (novoHpHum <= 0 && hpHumAntes > 0 && cloneBordo.meta?.edicaoComercialSteam === true) {
          concederXpMaestriaCombateInPlace(ali, 'combate', 2);
        }
        if (vampHp > 0 && ali.hpAtual > 0) {
          ali.hpAtual = Math.min(Number(ali.hpMax ?? 110), Math.round((Number(ali.hpAtual) + vampHp) * 1000) / 1000);
        }
        if (Array.isArray(salaHostil.tripulantes)) {
          for (const h of salaHostil.tripulantes) {
            if (h.id === idAlvoHum) h.hpAtual = novoHpHum;
          }
        }
        if (Array.isArray(alvoB.tripulacaoInimiga)) {
          for (const h of alvoB.tripulacaoInimiga) {
            if (h.id === idAlvoHum) h.hpAtual = novoHpHum;
          }
        }
        let danoRetorno = 0;
        for (const h of defensoresNaSala) {
          if (h.id === idAlvoHum && novoHpHum <= 0) continue;
          if (Number(h.atordoadoSeg ?? 0) > 0) continue;
          danoRetorno += Number(h.dps ?? (h.especie === 'MERGULHADOR' ? 12 : 8)) * dtRestanteAcao;
        }
        if (danoRetorno > 0) {
          ali.hpAtual = Math.max(0, Math.round((Number(ali.hpAtual) - danoRetorno) * 1000) / 1000);
        }
      } else {
        const intSala = Number(salaHostil.integridadeAtual ?? salaHostil.integridade ?? 0);
        if (intSala <= 0) {
          const proximaSala =
            (alvoB.salasOuOrgaos ?? []).find(
              (s) => (s.ehGanglioCentral || /GANGLIO/i.test(s.nome ?? '')) && Number(s.integridadeAtual ?? s.integridade ?? 0) > 0
            ) ??
            (alvoB.salasOuOrgaos ?? []).find((s) => Number(s.integridadeAtual ?? s.integridade ?? 0) > 0) ??
            null;
          if (proximaSala && Number(proximaSala.id) !== Number(ali.salaInimigaId)) {
            const ocupDestAuto = (cloneBordo.naveJogador.tripulacao ?? []).filter(
              (o) =>
                o.id !== ali.id &&
                Number(o.hpAtual ?? 0) > 0 &&
                o.localizacao === 'BORDO_INIMIGO' &&
                Number(o.salaInimigaDestinoId ?? o.salaInimigaId) === Number(proximaSala.id)
            ).length;
            if (ocupDestAuto < 2) {
              // Avanço automático respeitando estritamente o grafo ortogonal BFS (1.25s por salto adjacente, sem teletransporte!)
              const caminhoAuto = calcularCaminhoCurtoGrafoAlvoInterno(alvoB, ali.salaInimigaId, proximaSala.id);
              const saltosAuto = caminhoAuto.slice(1);
              ali.salaInimigaDestinoId = proximaSala.id;
              ali.proximaSalaInimigaId = saltosAuto[0] ?? proximaSala.id;
              ali.rotaInimigaAtiva = saltosAuto.length > 0 ? saltosAuto : [proximaSala.id];
              ali.progressoTravessiaInimigaSeg = 0.0;
              ali.progressoSabotagemInternaSeg = 0.0;
            }
          }
        } else {
          ali.progressoSabotagemInternaSeg =
            Math.round(((Number(ali.progressoSabotagemInternaSeg ?? 0) + dtRestanteAcao * multVelSeca) * 10000)) / 10000;
          if (ali.progressoSabotagemInternaSeg >= 5.0) {
            ali.progressoSabotagemInternaSeg = Math.max(0, Math.round((ali.progressoSabotagemInternaSeg - 5.0) * 10000) / 10000);
            sabotagensSalasIds.push(salaHostil.id);
          }
        }
      }
    }

    estadoAtual = congelarProfundo(cloneBordo);
    for (const idSalaSab of sabotagensSalasIds) {
      if (!estadoAtual.alvoCombate?.ativo || estadoAtual.alvoCombate.hpCascoAtual <= 0) break;
      estadoAtual = resolverImpactoNoAlvo(estadoAtual, {
        tipo: 'SABOTAGEM_INTERNA',
        salaAlvoId: idSalaSab,
      });
      emitirEventoVisual({
        tipo: 'IMPACTO_ALVO',
        salaAlvoId: idSalaSab,
        dano: 1,
        texto: '-1 SABOTAGEM!',
      });
    }
    if (sabotagensSalasIds.length > 0 && estadoAtual.alvoCombate?.ativo) {
      const cloneSubSab = structuredClone(estadoAtual);
      recalcularSubsistemasAlvoInPlace(cloneSubSab.alvoCombate);
      estadoAtual = congelarProfundo(cloneSubSab);
    }
  }

  // 2. Avança IA/Hidráulica Inimiga ou Mecânicas da Draga Continental + Regeneração 2.0s/bolha da Barreira Inimiga
  if (estadoAtual.alvoCombate && estadoAtual.alvoCombate.ativo !== false) {
    if (estadoAtual.alvoCombate.faseChefe) {
      estadoAtual = avancarTickChefeDraga(estadoAtual, dtSeg, opcoesDebug);
    } else {
      estadoAtual = avancarTickIaInimiga(estadoAtual, dtSeg);
    }
    const cloneSubIa = structuredClone(estadoAtual);
    recalcularSubsistemasAlvoInPlace(cloneSubIa.alvoCombate);
    if (cloneSubIa.alvoCombate.faseChefe) {
      cloneSubIa.naveJogador = recalcularFoilEPesoNaveTick(cloneSubIa.naveJogador);
      const surge = cloneSubIa.alvoCombate.ultimoPowerSurgeDisparado;
      if (
        surge &&
        opcoesDebug.desativarPowerSurgeChefeMutacao !== true &&
        !opcoesDebug.suprimirAtaqueInimigoMutacao
      ) {
        const naveSurge = cloneSubIa.naveJogador;
        const modsSurgeAe = calcularModificadoresPassivosOrgaosSteam(naveSurge);
        const bonusCristaSurge = Number(modsSurgeAe.chanceDefletirCascoPct ?? 0);
        const sonarSurge = !opcoesDebug.desativarSonarMilitarMutacao && Boolean(cloneSubIa.alvoCombate.sonarMilitarAtivo);
        const esquivaSurge = Math.max(
          0,
          calcularEsquivaEfetivaNave(naveSurge) -
            (sonarSurge && Number(naveSurge.furtividadeAtivaSeg ?? 0) > 0 ? 30 : 0)
        );
        emitirEventoVisual({
          tipo: 'SOBRECARGA_DRAGA',
          subtipo: surge.tipo,
          fase: Number(surge.fase ?? cloneSubIa.alvoCombate.faseChefe ?? 1),
        });
        if (surge.tipo === 'ONDA_ARRASTO_HIDRAULICO') {
          emitirEventoVisual({
            tipo: 'POWER_SURGE_DRAGA',
            fase: 1,
            texto: 'SURGE: ONDA ARRASTO +50kg!',
          });
        } else if (surge.tipo === 'ENXAME_DRONES_CORTADORES') {
          const nAereos = Math.max(0, Number(surge.dronesAereos ?? 1));
          const nTorp = Math.max(0, Number(surge.dronesTorpedeirosMastro ?? 1));
          const camAereo = Math.max(1, Math.min(8, Number(surge.camaraAlvoAereo ?? 1)));
          for (let d = 0; d < nAereos; d += 1) {
            const rolaEsqD = streamCombateDisparo(seed, setorComb, noIdComb, tick, 960 + d) % 100;
            const acertouD = rolaEsqD >= esquivaSurge;
            emitirEventoVisual({
              tipo: 'DISPARO_INIMIGO',
              subtipo: 'DRONE_AEREO_SURGE',
              classeAlvo: 'CHEFE_DRAGA',
              acertou: acertouD,
            });
            if (acertouD) {
              if (Number(naveSurge.camadasBarreiraAtivas ?? 0) > 0) {
                naveSurge.camadasBarreiraAtivas -= 1;
                naveSurge.progressoRegenBarreiraSeg = 0.0;
                emitirEventoVisual({ tipo: 'BLOQUEIO_BARREIRA_JOGADOR', texto: 'BARREIRA DRONE!' });
              } else {
                const rolaBlD = streamCombateDisparo(seed, setorComb, noIdComb, tick, 965 + d) % 100;
                const defD = aplicarDanoEmCamaraJogador(naveSurge, camAereo, 1, 1, false, rolaBlD, bonusCristaSurge);
                emitirEventoVisual({
                  tipo: defD ? 'DEFLEXAO_BLINDAGEM_JOGADOR' : 'IMPACTO_JOGADOR',
                  camaraId: camAereo,
                  dano: defD ? 0 : 1,
                  texto: defD ? 'BLINDAGEM!' : '-1 DRONE!',
                });
              }
            }
          }
          for (let d = 0; d < nTorp; d += 1) {
            const rolaEsqT = streamCombateDisparo(seed, setorComb, noIdComb, tick, 970 + d) % 100;
            const acertouT = rolaEsqT >= esquivaSurge;
            emitirEventoVisual({
              tipo: 'DISPARO_INIMIGO',
              subtipo: 'DRONE_TORPEDO_MASTRO',
              classeAlvo: 'CHEFE_DRAGA',
              camaraAlvoId: 6,
              acertou: acertouT,
            });
            if (acertouT) {
              if (
                cloneSubIa.meta?.edicaoComercialSteam === true &&
                naveSurge.subsistemasTaticosSteam?.droneDefesa === true &&
                Number(naveSurge.subsistemasTaticosSteam.recargaDroneDefesaSeg ?? 0) <= 0
              ) {
                naveSurge.subsistemasTaticosSteam.recargaDroneDefesaSeg = 9.0;
                emitirEventoVisual({
                  tipo: 'INTERCEPTACAO_DRONE_DEFESA',
                  camaraId: 6,
                  texto: ehIdiomaEn ? 'DEFENSE DRONE!' : 'DRONE DEFESA!',
                });
              } else {
                const rolaBlT = streamCombateDisparo(seed, setorComb, noIdComb, tick, 975 + d) % 100;
                const defT = aplicarDanoEmCamaraJogador(naveSurge, 6, 1, 1, true, rolaBlT, bonusCristaSurge);
                naveSurge.pesoVirtualArrastoKg = Math.max(Number(naveSurge.pesoVirtualArrastoKg ?? 0), 25);
                naveSurge.tempoRestanteArrastoSeg = Math.max(Number(naveSurge.tempoRestanteArrastoSeg ?? 0), 4.0);
                emitirEventoVisual({
                  tipo: defT ? 'DEFLEXAO_BLINDAGEM_JOGADOR' : 'IMPACTO_JOGADOR',
                  camaraId: 6,
                  dano: defT ? 0 : 1,
                  abriuBrecha: !defT,
                  texto: defT ? 'BLINDAGEM!' : '-1 DRONE MASTRO!',
                });
              }
            }
          }
          cloneSubIa.naveJogador = recalcularFoilEPesoNaveTick(naveSurge);
        } else if (surge.tipo === 'FERVURA_OCEANICA_E_7_LASERS') {
          const totalLasers = Math.max(1, Number(surge.lasersDisparados ?? 7));
          const cicloCamaras = [1, 2, 4, 5, 6, 3, 7];
          for (let i = 0; i < totalLasers; i += 1) {
            const rolaEsqL = streamCombateDisparo(seed, setorComb, noIdComb, tick, 980 + i) % 100;
            const acertouL = rolaEsqL >= esquivaSurge;
            emitirEventoVisual({
              tipo: 'DISPARO_INIMIGO',
              subtipo: 'LASER_SURGE_DRAGA_F3',
              classeAlvo: 'CHEFE_DRAGA',
              acertou: acertouL,
            });
            if (acertouL) {
              if (Number(naveSurge.camadasBarreiraAtivas ?? 0) > 0) {
                naveSurge.camadasBarreiraAtivas -= 1;
                naveSurge.progressoRegenBarreiraSeg = 0.0;
                emitirEventoVisual({ tipo: 'BLOQUEIO_BARREIRA_JOGADOR', texto: 'BARREIRA LASER!' });
              } else {
                const camL = cicloCamaras[i % cicloCamaras.length];
                const rolaBlL = streamCombateDisparo(seed, setorComb, noIdComb, tick, 990 + i) % 100;
                const defL = aplicarDanoEmCamaraJogador(naveSurge, camL, 1, 1, false, rolaBlL, bonusCristaSurge);
                emitirEventoVisual({
                  tipo: defL ? 'DEFLEXAO_BLINDAGEM_JOGADOR' : 'IMPACTO_JOGADOR',
                  camaraId: camL,
                  dano: defL ? 0 : 1,
                  texto: defL ? 'BLINDAGEM!' : '-1 SURGE!',
                });
              }
            }
          }
        }
        if (cloneSubIa.naveJogador.hpCascoAtual <= 0) {
          cloneSubIa.meta = { ...cloneSubIa.meta, faseJogo: 'FIM_DE_RUN' };
        }
      }
    }
    if (!opcoesDebug.desativarSonarMilitarMutacao && cloneSubIa.alvoCombate.sonarMilitarAtivo) {
      if (Number(cloneSubIa.naveJogador.furtividadeAtivaSeg ?? 0) > 0) {
        cloneSubIa.naveJogador.furtividadeAtivaSeg = Math.max(
          0,
          Math.round((Number(cloneSubIa.naveJogador.furtividadeAtivaSeg) - dtSeg) * 10000) / 10000
        );
      }
      for (const sAlvo of cloneSubIa.alvoCombate.salasOuOrgaos ?? []) {
        if (sAlvo.cegaPorTinta) sAlvo.cegaPorTinta = false;
        if (Number(sAlvo.cegoTintaSeg ?? 0) > 0) sAlvo.cegoTintaSeg = 0;
      }
    }

    // Para barcos humanos regulares com barreira acústica (Setores 2..7), regenera 1 bolha a cada 2.0s se ESCUDO intacto
    const alvoRegen = cloneSubIa.alvoCombate;
    if (
      !alvoRegen.faseChefe &&
      String(alvoRegen.classeAlvo ?? alvoRegen.classeInimigo ?? '') !== 'MONSTRO_MARINHO' &&
      Number(alvoRegen.barreiraBolhasMax ?? 0) > 0
    ) {
      const tetoBolhas = Number(alvoRegen.tetoBolhasBarreira ?? alvoRegen.barreiraBolhasMax ?? 0);
      let bolhasAtu = Number(alvoRegen.camadasBarreiraAtivas ?? alvoRegen.barreiraBolhasAtual ?? 0);
      let progRegen = Number(alvoRegen.progressoRegenBarreiraSeg ?? 0);
      if (bolhasAtu > tetoBolhas) {
        bolhasAtu = tetoBolhas;
        progRegen = 0;
      } else if (bolhasAtu < tetoBolhas && opcoesDebug.desativarRegenBarreiraInimigaMutacao !== true) {
        progRegen = Math.round((progRegen + dtSeg) * 10000) / 10000;
        while (progRegen >= 2.0 && bolhasAtu < tetoBolhas) {
          progRegen = Math.round((progRegen - 2.0) * 10000) / 10000;
          bolhasAtu += 1;
        }
        if (bolhasAtu >= tetoBolhas) progRegen = 0;
      } else {
        progRegen = 0;
      }
      alvoRegen.camadasBarreiraAtivas = bolhasAtu;
      alvoRegen.barreiraBolhasAtual = bolhasAtu;
      alvoRegen.progressoRegenBarreiraSeg = progRegen;
    }

    estadoAtual = congelarProfundo(cloneSubIa);
  }

  // 3. Fogo de Retorno Determinístico + GD-3 Contragolpe Tático de Meio de Luta
  if (
    !opcoesDebug.suprimirAtaqueInimigoMutacao &&
    estadoAtual.alvoCombate &&
    estadoAtual.alvoCombate.ativo !== false &&
    estadoAtual.alvoCombate.hpCascoAtual > 0
  ) {
    const cloneAtk = structuredClone(estadoAtual);
    const alvo = cloneAtk.alvoCombate;
    recalcularSubsistemasAlvoInPlace(alvo);
    const nave = cloneAtk.naveJogador;
    const classe = alvo.classeAlvo ?? alvo.classeInimigo ?? 'BARCO_HUMANO';
    const setor = Math.max(1, Number(alvo.setorNumero ?? cloneAtk.mapaSetorial?.setorNumero ?? 1));
    const tripAlvo = alvo.tripulacaoInimiga ?? (alvo.salasOuOrgaos ?? []).flatMap((s) => s.tripulantes ?? []);
    const ganglio = (alvo.salasOuOrgaos ?? []).find((s) => s.ehGanglioCentral || /GANGLIO/i.test(s.nome));
    const inimigoOperante =
      classe === 'MONSTRO_MARINHO'
        ? Number(ganglio?.integridadeAtual ?? ganglio?.integridade ?? 1) > 0
        : tripAlvo.some((t) => t.hpAtual > 0) || alvo.iaBackupAtiva === true;

    if (!opcoesDebug.desativarContragolpeInimigoMutacao && inimigoOperante) {
      if (classe === 'BARCO_HUMANO') {
        alvo.recargaMinaMagneticaSeg = Math.max(
          0,
          Math.round((Number(alvo.recargaMinaMagneticaSeg ?? 0) - dtSeg) * 1000) / 1000
        );
        alvo.tempoJogadorEmTouchdownSeg =
          nave.estadoFisico !== '1_NO_FOIL'
            ? Math.round((Number(alvo.tempoJogadorEmTouchdownSeg ?? 0) + dtSeg) * 1000) / 1000
            : 0;

        if (!alvo.protocoloCortaFogoUsado && alvo.hpCascoAtual <= Math.floor(alvo.hpCascoMax * 0.5)) {
          alvo.protocoloCortaFogoUsado = true;
          const salaCritica = (alvo.salasOuOrgaos ?? []).find(
            (s) =>
              /TORRETA|MOTOR|MAQUINAS/i.test(s.nome ?? '') &&
              Number(s.integridadeAtual ?? s.integridade ?? 0) < Number(s.integridadeMax ?? s.barrasMax ?? 2)
          );
          if (salaCritica) {
            const intNova = Number(salaCritica.integridadeAtual ?? salaCritica.integridade ?? 0) + 1;
            salaCritica.integridadeAtual = intNova;
            salaCritica.integridade = intNova;
          }
          alvo.minaMagneticaAtivaSeg = 4.0;
          alvo.recargaMinaMagneticaSeg = 14.0;
          emitirEventoVisual({
            tipo: 'MINA_MAGNETICA_LANCADA',
            texto: 'PROTOCOLO CORTA-FOGO + MINA 4s!',
          });
        } else if (
          alvo.tempoJogadorEmTouchdownSeg >= 6.0 &&
          Number(alvo.minaMagneticaAtivaSeg ?? 0) <= 0 &&
          Number(alvo.recargaMinaMagneticaSeg ?? 0) <= 0
        ) {
          alvo.tempoJogadorEmTouchdownSeg = 0;
          alvo.minaMagneticaAtivaSeg = 4.0;
          alvo.recargaMinaMagneticaSeg = 14.0;
          emitirEventoVisual({
            tipo: 'MINA_MAGNETICA_LANCADA',
            texto: 'MINA ANTI-TOUCHDOWN 4s!',
          });
        }

        if (Number(alvo.minaMagneticaAtivaSeg ?? 0) > 0) {
          alvo.minaMagneticaAtivaSeg = Math.max(
            0,
            Math.round((Number(alvo.minaMagneticaAtivaSeg) - dtSeg) * 1000) / 1000
          );
          if (alvo.minaMagneticaAtivaSeg <= 0) {
            if (nave.estadoFisico === '1_NO_FOIL' || (Number(nave.furtividadeAtivaSeg ?? 0) > 0 && !alvo.sonarMilitarAtivo)) {
              emitirEventoVisual({
                tipo: 'MINA_EVADIDA',
                texto: 'MINA EVADIDA NO FOIL!',
              });
            } else if (
              cloneAtk.meta?.edicaoComercialSteam === true &&
              nave.subsistemasTaticosSteam?.droneDefesa === true &&
              Number(nave.subsistemasTaticosSteam.recargaDroneDefesaSeg ?? 0) <= 0
            ) {
              nave.subsistemasTaticosSteam.recargaDroneDefesaSeg = 9.0;
              emitirEventoVisual({
                tipo: 'INTERCEPTACAO_DRONE_DEFESA',
                camaraId: 6,
                texto: ehIdiomaEn ? 'MINE INTERCEPTED!' : 'MINA ABATIDA!',
              });
            } else {
              const bonusCristaMina = Number(calcularModificadoresPassivosOrgaosSteam(nave).chanceDefletirCascoPct ?? 0);
              const rolaBlindMina = streamCombateDisparo(seed, setorComb, noIdComb, tick, 950) % 100;
              const defletiuMina = aplicarDanoEmCamaraJogador(nave, 6, 2, 1, true, rolaBlindMina, bonusCristaMina);
              emitirEventoVisual({
                tipo: defletiuMina ? 'DEFLEXAO_BLINDAGEM_JOGADOR' : 'IMPACTO_JOGADOR',
                camaraId: 6,
                dano: defletiuMina ? 0 : 2,
                abriuBrecha: !defletiuMina,
                texto: defletiuMina ? 'BLINDAGEM BLOQUEOU!' : '-2 MINA!',
              });
            }
          }
        }
      } else if (classe === 'MONSTRO_MARINHO') {
        const tinhaAperto = Number(alvo.apertoQuilhaSeg ?? 0) > 0;
        alvo.carapacaReflexaSeg = Math.max(
          0,
          Math.round((Number(alvo.carapacaReflexaSeg ?? 0) - dtSeg) * 1000) / 1000
        );
        if (alvo.carapacaReflexaSeg <= 0) {
          alvo.escudoQuitinaGanglioPts = 0;
        }
        alvo.apertoQuilhaSeg = Math.max(
          0,
          Math.round((Number(alvo.apertoQuilhaSeg ?? 0) - dtSeg) * 1000) / 1000
        );

        const intGanglio = Number(ganglio?.integridadeAtual ?? ganglio?.integridade ?? 3);
        const maxGanglio = Number(ganglio?.integridadeMax ?? ganglio?.barrasMax ?? 3);
        if (
          !alvo.instintoAbissalUsado &&
          ((intGanglio > 0 && intGanglio < maxGanglio) || alvo.hpCascoAtual <= Math.ceil(alvo.hpCascoMax * 0.6))
        ) {
          alvo.instintoAbissalUsado = true;
          alvo.carapacaReflexaSeg = 5.5;
          alvo.escudoQuitinaGanglioPts = 1;
          alvo.apertoQuilhaSeg = 5.5;
          emitirEventoVisual({
            tipo: 'CARAPACA_REFLEXA_ATIVADA',
            texto: 'CARAPAÇA + APERTO +40kg!',
          });
        }

        if (alvo.apertoQuilhaSeg > 0) {
          nave.pesoVirtualArrastoKg = 40.0;
          nave.pesoTotalKg = calcularPesoTotalNave(nave);
          const sustAtu = calcularSustentacaoFoil(nave);
          if (nave.pesoTotalKg > sustAtu) {
            nave.estadoFisico = '2_TOUCHDOWN';
            nave.progressoSpoolUpSeg = 0.0;
          }
        } else if (tinhaAperto) {
          nave.pesoVirtualArrastoKg = 0.0;
          nave.pesoTotalKg = calcularPesoTotalNave(nave);
          if (nave.estadoFisico === '2_TOUCHDOWN' && !nave.mergulhoTaticoAtivo) {
            if (nave.pesoTotalKg <= calcularSustentacaoFoil(nave)) {
              nave.estadoFisico = '3_SPOOL_UP';
              nave.progressoSpoolUpSeg = 0.0;
            }
          }
        }
      } else if (classe === 'CHEFE_DRAGA') {
        const faseAtu = Number(alvo.faseChefe ?? 1);
        if (alvo.sobrecargaFaseUsada !== faseAtu && alvo.hpCascoAtual <= Math.floor(alvo.hpCascoMax * 0.5)) {
          alvo.sobrecargaFaseUsada = faseAtu;
          alvo.sobrecargaGeotermicaFaseUsada = true;
          alvo.blindagemTermicaExternaPts = Number(alvo.blindagemTermicaExternaPts ?? 0) + 3;
          alvo.alarmeFervuraAtivoSeg = Math.max(Number(alvo.alarmeFervuraAtivoSeg ?? 0), 3.5);
          emitirEventoVisual({
            tipo: 'SOBRECARGA_DRAGA',
            texto: 'SOBRECARGA +3 BLINDAGEM!',
          });
        }
      }
    }

    if (inimigoOperante) {
      // Subsistema SONAR Militar ativo corta pela metade o bônus da Tinta Furtiva (-30% esquiva) e ignora cegoTintaSeg!
      const sonarAtivo = !opcoesDebug.desativarSonarMilitarMutacao && Boolean(alvo.sonarMilitarAtivo);
      const modsDefesaAe = calcularModificadoresPassivosOrgaosSteam(nave);
      const esquivaBaseJogador = calcularEsquivaEfetivaNave(nave);
      const penalidadeSonarFurtivo = sonarAtivo && Number(nave.furtividadeAtivaSeg ?? 0) > 0 ? 30 : 0;
      const esquivaJogador = Math.max(0, esquivaBaseJogador - penalidadeSonarFurtivo);
      const ehIaDificil = estadoAtual.meta?.dificuldade === 'DIFICIL';
      if (modsDefesaAe.curaTripulacaoAlagadaHpSeg > 0) {
        for (const trCura of nave.tripulacao ?? []) {
          if (trCura.localizacao === 'NAVE_JOGADOR' && trCura.hpAtual > 0) {
            const camTr = (nave.camaras ?? []).find((c) => c.id === trCura.camaraAtualId);
            if (Number(camTr?.aguaKg ?? 0) >= 10) {
              trCura.hpAtual = Math.min(Number(trCura.hpMax ?? 100), Math.round((trCura.hpAtual + modsDefesaAe.curaTripulacaoAlagadaHpSeg * dtSeg) * 100) / 100);
            }
          }
        }
      }

      const idPrimaria = classe === 'MONSTRO_MARINHO' ? 1 : 2;
      const idSecundaria = classe === 'MONSTRO_MARINHO' ? 2 : classe === 'CHEFE_DRAGA' ? 3 : 4;
      const salaPrim = (alvo.salasOuOrgaos ?? []).find((s) => s.id === idPrimaria);
      const salaSec = (alvo.salasOuOrgaos ?? []).find((s) => s.id === idSecundaria);

      const recargaPrim =
        classe === 'MONSTRO_MARINHO'
          ? 8.0
          : classe === 'CHEFE_DRAGA'
            ? 9.5
            : Math.max(7.5, 10.5 - 0.4 * setor);
      const recargaSec =
        classe === 'MONSTRO_MARINHO'
          ? 11.5
          : classe === 'CHEFE_DRAGA'
            ? 12.5
            : Math.max(10.5, 14.5 - 0.5 * setor);

      if (
        salaPrim &&
        Number(salaPrim.integridadeAtual ?? salaPrim.integridade ?? 0) > 0 &&
        Number(salaPrim.paralisiaIonSeg ?? 0) <= 0
      ) {
        const armaModPrim = Array.isArray(alvo.armasEquipadasInimigo) ? alvo.armasEquipadasInimigo[0] : null;
        const intPrim = Math.max(0, Number(salaPrim.integridadeAtual ?? salaPrim.integridade ?? 1));
        const maxPrim = Math.max(1, Number(salaPrim.integridadeMax ?? salaPrim.barrasMax ?? intPrim));
        const fatorCadPrim = 0.45 + 0.55 * Math.min(1, intPrim / maxPrim);
        alvo.progressoAtaquePrimarioSeg =
          Math.round(((alvo.progressoAtaquePrimarioSeg ?? 0) + dtSeg * fatorCadPrim) * 10000) / 10000;
        if (alvo.progressoAtaquePrimarioSeg >= recargaPrim) {
          alvo.progressoAtaquePrimarioSeg = 0.0;
          const precisao = !sonarAtivo && Number(salaPrim.cegoTintaSeg ?? 0) > 0 ? 60 : 100;
          const rolaPrec = streamCombateDisparo(seed, setorComb, noIdComb, tick, 901) % 100;
          const rolaEsq = streamCombateDisparo(seed, setorComb, noIdComb, tick, 902) % 100;
          const ehModPrimPre = estadoAtual.meta?.edicaoComercialSteam === true && Boolean(armaModPrim);
          const ehIonPuroPrimPre =
            ehModPrimPre &&
            Number(armaModPrim.danoCasco ?? 1) === 0 &&
            Number(armaModPrim.danoSistema ?? 1) === 0 &&
            Number(armaModPrim.danoIonico ?? 0) > 0;
          const ignoraEscudoPrimPre = ehModPrimPre && Boolean(armaModPrim.ignoraEscudo);
          const rajadaPre = ehIonPuroPrimPre ? 1 : (classe === 'CHEFE_DRAGA' || setor >= 5 ? 2 : 1);
          const segundoPenetraBarreira =
            !ignoraEscudoPrimPre && rajadaPre > 1 && Number(nave.camadasBarreiraAtivas ?? 0) === 1;
          const camIaVisPrim = ehIaDificil
            ? Number(
                selecionarAlvoInimigoInteligente(
                  {
                    camadasBarreiraAtivas: segundoPenetraBarreira ? 0 : (nave.camadasBarreiraAtivas ?? 0),
                    evasaoTotalPct: esquivaJogador,
                    camaras: nave.camaras,
                  },
                  [],
                  tick + (segundoPenetraBarreira ? 1 : 0)
                )
              )
            : NaN;
          const camVisPrim = Number.isFinite(camIaVisPrim) && camIaVisPrim >= 1 && camIaVisPrim <= 8
            ? camIaVisPrim
            : [5, 4, 1, 2][streamCombateDisparo(seed, setorComb, noIdComb, tick, 910) % 4];
          const tirosVisuaisPrimSteam = [];
          emitirEventoVisual({
            tipo: 'DISPARO_INIMIGO',
            subtipo: 'PRIMARIO',
            classeAlvo: classe,
            salaOrigemId: idPrimaria,
            camaraAlvoId: camVisPrim,
            ...(armaModPrim?.familiaVisual ? { familiaVisual: armaModPrim.familiaVisual } : {}),
            ...(estadoAtual.meta?.edicaoComercialSteam === true ? { tirosVisuaisSteam: tirosVisuaisPrimSteam } : {}),
            acertou: rolaPrec < precisao && rolaEsq >= esquivaJogador,
          });
          if (rolaPrec < precisao && rolaEsq < esquivaJogador && estadoAtual.meta?.edicaoComercialSteam === true) {
            for (const trPil of nave.tripulacao ?? []) {
              if (
                trPil.localizacao === 'NAVE_JOGADOR' &&
                (trPil.camaraAtualId === 2 || trPil.camaraAtualId === 5) &&
                trPil.acopladoBulbo === true &&
                Number(trPil.hpAtual ?? 0) > 0 &&
                Number(trPil.atordoadoSeg ?? 0) <= 0
              ) {
                concederXpMaestriaCombateInPlace(trPil, 'pilotagem', 1);
              }
            }
            emitirEventoVisual({
              tipo: 'ESQUIVA_JOGADOR',
              camaraId: 5,
              texto: 'ESQUIVA!',
            });
          }
          if (rolaPrec < precisao && rolaEsq >= esquivaJogador) {
            const ehModPrimSteam = estadoAtual.meta?.edicaoComercialSteam === true && Boolean(armaModPrim);
            const ehIonPuroPrim =
              ehModPrimSteam &&
              Number(armaModPrim.danoCasco ?? 1) === 0 &&
              Number(armaModPrim.danoSistema ?? 1) === 0 &&
              Number(armaModPrim.danoIonico ?? 0) > 0;
            const ignoraEscudoPrim = ehModPrimSteam && Boolean(armaModPrim.ignoraEscudo);
            const danoCascoPrim = ehIonPuroPrim ? 0 : ehModPrimSteam ? Math.max(0, Number(armaModPrim.danoCasco ?? 1)) : 1;
            const danoSisPrim = ehIonPuroPrim ? 0 : ehModPrimSteam ? Math.max(0, Number(armaModPrim.danoSistema ?? 1)) : 1;
            const abreBrechaPrim = !ehIonPuroPrim && ehModPrimSteam && Number(armaModPrim.chanceFuroPct ?? 0) >= 100;
            const rajada = ehIonPuroPrim ? 1 : (classe === 'CHEFE_DRAGA' || setor >= 5 ? 2 : 1);
            for (let r = 0; r < rajada; r += 1) {
              if (!ignoraEscudoPrim && Number(nave.camadasBarreiraAtivas ?? 0) > 0) {
                const bolhasRemovidas = ehIonPuroPrim
                  ? Math.min(Number(nave.camadasBarreiraAtivas), Math.max(1, Number(armaModPrim.danoIonico ?? 1)))
                  : 1;
                nave.camadasBarreiraAtivas -= bolhasRemovidas;
                nave.progressoRegenBarreiraSeg = 0.0;
                if (estadoAtual.meta?.edicaoComercialSteam === true) {
                  const opBar = (nave.tripulacao ?? []).find(
                    (t) =>
                      t.localizacao === 'NAVE_JOGADOR' &&
                      t.camaraAtualId === 4 &&
                      t.acopladoBulbo === true &&
                      Number(t.hpAtual ?? 0) > 0 &&
                      Number(t.atordoadoSeg ?? 0) <= 0
                  );
                  if (opBar) concederXpMaestriaCombateInPlace(opBar, 'barreira', 1);
                }
                emitirEventoVisual({
                  tipo: 'BLOQUEIO_BARREIRA_JOGADOR',
                  texto: 'BARREIRA!',
                });
                if (estadoAtual.meta?.edicaoComercialSteam === true) {
                  tirosVisuaisPrimSteam.push({ camaraAlvoId: camVisPrim, resultado: 'ESCUDO' });
                }
              } else {
                const camIa = ehIaDificil
                  ? Number(
                      selecionarAlvoInimigoInteligente(
                        {
                          camadasBarreiraAtivas: nave.camadasBarreiraAtivas ?? 0,
                          evasaoTotalPct: esquivaJogador,
                          camaras: nave.camaras,
                        },
                        [],
                        tick + r
                      )
                    )
                  : NaN;
                const camAlvo = Number.isFinite(camIa) && camIa >= 1 && camIa <= 8
                  ? camIa
                  : [5, 4, 1, 2][streamCombateDisparo(seed, setorComb, noIdComb, tick, 910 + r) % 4];
                const rolaBlindPrim = streamCombateDisparo(seed, setorComb, noIdComb, tick, 951 + r) % 100;
                const defletiuPrim =
                  danoCascoPrim === 0 && danoSisPrim === 0
                    ? false
                    : aplicarDanoEmCamaraJogador(
                        nave,
                        camAlvo,
                        danoCascoPrim,
                        danoSisPrim,
                        abreBrechaPrim,
                        rolaBlindPrim,
                        Number(modsDefesaAe.chanceDefletirCascoPct ?? 0)
                      );
                if (!defletiuPrim && ehModPrimSteam) {
                  const camHitP = (nave.camaras ?? []).find((c) => c.id === camAlvo);
                  if (camHitP && Number(armaModPrim.danoIonico ?? 0) > 0) {
                    const addIonPrim = Math.max(1, Number(armaModPrim.danoIonico ?? 1));
                    camHitP.danoIonizado = Math.min(4, Number(camHitP.danoIonizado ?? 0) + addIonPrim);
                    camHitP.barrasIonizadas = camHitP.danoIonizado;
                    const durIonInimPrim = Number(armaModPrim.duracaoIonSeg ?? 5.0) * camHitP.danoIonizado;
                    camHitP.tempoParalisiaIonSeg = Math.max(Number(camHitP.tempoParalisiaIonSeg ?? 0), durIonInimPrim);
                    camHitP.tempoRestanteIonSeg = camHitP.tempoParalisiaIonSeg;
                    if (camAlvo === 1) {
                      nave.armasAtivas = sincronizarEnergiaArmasComCamaraArtilharia(nave, { redistribuir: false }).armasAtivas;
                    }
                  }
                  if (armaModPrim.mecanicaEspecial === 'ESTASE_CRIO') {
                    for (const tC of nave.tripulacao ?? []) {
                      if (tC.localizacao === 'NAVE_JOGADOR' && tC.camaraAtualId === camAlvo && tC.hpAtual > 0) {
                        tC.atordoadoSeg = Math.max(Number(tC.atordoadoSeg ?? 0), 4.0);
                        tC.acopladoBulbo = false;
                      }
                    }
                  }
                }
                emitirEventoVisual({
                  tipo: defletiuPrim ? 'DEFLEXAO_BLINDAGEM_JOGADOR' : 'IMPACTO_JOGADOR',
                  camaraId: camAlvo,
                  dano: defletiuPrim ? 0 : danoCascoPrim,
                  ...(abreBrechaPrim && !defletiuPrim ? { abriuBrecha: true } : {}),
                  texto: defletiuPrim
                    ? 'BLINDAGEM!'
                    : ehIonPuroPrim
                      ? (ehIdiomaEn ? 'IONIZED!' : 'IONIZADO!')
                      : `-${danoCascoPrim}`,
                });
                if (estadoAtual.meta?.edicaoComercialSteam === true) {
                  tirosVisuaisPrimSteam.push({ camaraAlvoId: camAlvo, resultado: 'IMPACTO' });
                }
              }
            }
          }
        }
      }

      if (
        salaSec &&
        Number(salaSec.integridadeAtual ?? salaSec.integridade ?? 0) > 0 &&
        Number(salaSec.paralisiaIonSeg ?? 0) <= 0
      ) {
        const armaModSec = Array.isArray(alvo.armasEquipadasInimigo) ? alvo.armasEquipadasInimigo[1] : null;
        const intSec = Math.max(0, Number(salaSec.integridadeAtual ?? salaSec.integridade ?? 1));
        const maxSec = Math.max(1, Number(salaSec.integridadeMax ?? salaSec.barrasMax ?? intSec));
        const fatorCadSec = 0.45 + 0.55 * Math.min(1, intSec / maxSec);
        alvo.progressoAtaqueSecundarioSeg =
          Math.round(((alvo.progressoAtaqueSecundarioSeg ?? 0) + dtSeg * fatorCadSec) * 10000) / 10000;
        if (alvo.progressoAtaqueSecundarioSeg >= recargaSec) {
          alvo.progressoAtaqueSecundarioSeg = 0.0;
          const precisao = !sonarAtivo && Number(salaSec.cegoTintaSeg ?? 0) > 0 ? 60 : 100;
          const rolaPrec = streamCombateDisparo(seed, setorComb, noIdComb, tick, 921) % 100;
          const rolaEsq = streamCombateDisparo(seed, setorComb, noIdComb, tick, 922) % 100;
          const camIaTorpPre =
            classe !== 'MONSTRO_MARINHO' && ehIaDificil
              ? Number(
                  selecionarAlvoInimigoInteligente(
                    {
                      camadasBarreiraAtivas: nave.camadasBarreiraAtivas ?? 0,
                      evasaoTotalPct: esquivaJogador,
                      camaras: nave.camaras,
                    },
                    [],
                    tick + 17
                  )
                )
              : NaN;
          const camVisSec =
            classe === 'MONSTRO_MARINHO'
              ? 6
              : Number.isFinite(camIaTorpPre) && camIaTorpPre >= 1 && camIaTorpPre <= 8
                ? camIaTorpPre
                : [5, 6, 4, 3][streamCombateDisparo(seed, setorComb, noIdComb, tick, 930) % 4];
          const tirosVisuaisSecSteam = [];
          emitirEventoVisual({
            tipo: 'DISPARO_INIMIGO',
            subtipo: 'TORPEDO_OU_BICO',
            classeAlvo: classe,
            salaOrigemId: idSecundaria,
            camaraAlvoId: camVisSec,
            ...(armaModSec?.familiaVisual ? { familiaVisual: armaModSec.familiaVisual } : {}),
            ...(estadoAtual.meta?.edicaoComercialSteam === true ? { tirosVisuaisSteam: tirosVisuaisSecSteam } : {}),
            acertou: rolaPrec < precisao && rolaEsq >= esquivaJogador,
          });
          if (rolaPrec < precisao && rolaEsq < esquivaJogador && estadoAtual.meta?.edicaoComercialSteam === true) {
            for (const trPil of nave.tripulacao ?? []) {
              if (
                trPil.localizacao === 'NAVE_JOGADOR' &&
                (trPil.camaraAtualId === 2 || trPil.camaraAtualId === 5) &&
                trPil.acopladoBulbo === true &&
                Number(trPil.hpAtual ?? 0) > 0 &&
                Number(trPil.atordoadoSeg ?? 0) <= 0
              ) {
                concederXpMaestriaCombateInPlace(trPil, 'pilotagem', 1);
              }
            }
            emitirEventoVisual({
              tipo: 'ESQUIVA_JOGADOR',
              camaraId: 5,
              texto: 'ESQUIVA!',
            });
          }
          if (rolaPrec < precisao && rolaEsq >= esquivaJogador) {
            if (classe === 'MONSTRO_MARINHO') {
              if (nave.estadoFisico === '1_NO_FOIL' && Number(nave.camadasBarreiraAtivas ?? 0) > 0) {
                nave.camadasBarreiraAtivas -= 1;
                nave.progressoRegenBarreiraSeg = 0.0;
                if (estadoAtual.meta?.edicaoComercialSteam === true) {
                  const opBarM = (nave.tripulacao ?? []).find(
                    (t) =>
                      t.localizacao === 'NAVE_JOGADOR' &&
                      t.camaraAtualId === 4 &&
                      t.acopladoBulbo === true &&
                      Number(t.hpAtual ?? 0) > 0 &&
                      Number(t.atordoadoSeg ?? 0) <= 0
                  );
                  if (opBarM) concederXpMaestriaCombateInPlace(opBarM, 'barreira', 1);
                }
                emitirEventoVisual({
                  tipo: 'BLOQUEIO_BARREIRA_JOGADOR',
                  texto: 'BARREIRA!',
                });
                if (estadoAtual.meta?.edicaoComercialSteam === true) {
                  tirosVisuaisSecSteam.push({ camaraAlvoId: 6, resultado: 'ESCUDO' });
                }
              } else {
                const dMon = setor >= 3 ? 2 : 1;
                const rolaBlindMon = streamCombateDisparo(seed, setorComb, noIdComb, tick, 955) % 100;
                const defletiuMon = aplicarDanoEmCamaraJogador(
                  nave,
                  6,
                  dMon,
                  1,
                  nave.estadoFisico !== '1_NO_FOIL',
                  rolaBlindMon,
                  Number(modsDefesaAe.chanceDefletirCascoPct ?? 0)
                );
                emitirEventoVisual({
                  tipo: defletiuMon ? 'DEFLEXAO_BLINDAGEM_JOGADOR' : 'IMPACTO_JOGADOR',
                  camaraId: 6,
                  dano: defletiuMon ? 0 : dMon,
                  abriuBrecha: !defletiuMon && nave.estadoFisico !== '1_NO_FOIL',
                  texto: defletiuMon ? 'BLINDAGEM!' : `-${dMon} QUILHA!`,
                });
                if (estadoAtual.meta?.edicaoComercialSteam === true) {
                  tirosVisuaisSecSteam.push({ camaraAlvoId: 6, resultado: 'IMPACTO' });
                }
              }
            } else {
              const ehModSecSteam = estadoAtual.meta?.edicaoComercialSteam === true && Boolean(armaModSec);
              const ehIonPuroSec =
                ehModSecSteam &&
                Number(armaModSec.danoCasco ?? 1) === 0 &&
                Number(armaModSec.danoSistema ?? 1) === 0 &&
                Number(armaModSec.danoIonico ?? 0) > 0;
              const ignoraEscudoSec = ehModSecSteam ? Boolean(armaModSec.ignoraEscudo) : true;
              const camAlvo = camVisSec;
              if (
                ignoraEscudoSec &&
                !ehIonPuroSec &&
                estadoAtual.meta?.edicaoComercialSteam === true &&
                nave.subsistemasTaticosSteam?.droneDefesa === true &&
                Number(nave.subsistemasTaticosSteam.recargaDroneDefesaSeg ?? 0) <= 0
              ) {
                nave.subsistemasTaticosSteam.recargaDroneDefesaSeg = 9.0;
                emitirEventoVisual({
                  tipo: 'INTERCEPTACAO_DRONE_DEFESA',
                  camaraId: camAlvo,
                  texto: ehIdiomaEn ? 'DEFENSE DRONE!' : 'DRONE DEFESA!',
                });
                tirosVisuaisSecSteam.push({ camaraAlvoId: camAlvo, resultado: 'INTERCEPTADO' });
              } else if (!ignoraEscudoSec && Number(nave.camadasBarreiraAtivas ?? 0) > 0) {
                const bolhasRemSec = ehIonPuroSec
                  ? Math.min(Number(nave.camadasBarreiraAtivas), Math.max(1, Number(armaModSec.danoIonico ?? 1)))
                  : 1;
                nave.camadasBarreiraAtivas -= bolhasRemSec;
                nave.progressoRegenBarreiraSeg = 0.0;
                if (estadoAtual.meta?.edicaoComercialSteam === true) {
                  const opBarS = (nave.tripulacao ?? []).find(
                    (t) =>
                      t.localizacao === 'NAVE_JOGADOR' &&
                      t.camaraAtualId === 4 &&
                      t.acopladoBulbo === true &&
                      Number(t.hpAtual ?? 0) > 0 &&
                      Number(t.atordoadoSeg ?? 0) <= 0
                  );
                  if (opBarS) concederXpMaestriaCombateInPlace(opBarS, 'barreira', 1);
                }
                emitirEventoVisual({
                  tipo: 'BLOQUEIO_BARREIRA_JOGADOR',
                  texto: 'BARREIRA!',
                });
                if (estadoAtual.meta?.edicaoComercialSteam === true) {
                  tirosVisuaisSecSteam.push({ camaraAlvoId: camAlvo, resultado: 'ESCUDO' });
                }
              } else {
                const danoTorpPadrao = classe === 'CHEFE_DRAGA' || setor >= 4 ? 2 : 1;
                const danoTorp = ehIonPuroSec
                  ? 0
                  : ehModSecSteam
                    ? Math.max(0, Number(armaModSec.danoCasco ?? danoTorpPadrao))
                    : danoTorpPadrao;
                const danoSisSec = ehIonPuroSec
                  ? 0
                  : ehModSecSteam
                    ? Math.max(0, Number(armaModSec.danoSistema ?? 1))
                    : 1;
                const abreBrechaSec = !ehIonPuroSec && (ehModSecSteam ? Number(armaModSec.chanceFuroPct ?? 100) > 0 : true);
                const rolaBlindTorp = streamCombateDisparo(seed, setorComb, noIdComb, tick, 956) % 100;
                const defletiuTorp =
                  danoTorp === 0 && danoSisSec === 0
                    ? false
                    : aplicarDanoEmCamaraJogador(
                        nave,
                        camAlvo,
                        danoTorp,
                        danoSisSec,
                        abreBrechaSec,
                        rolaBlindTorp,
                        Number(modsDefesaAe.chanceDefletirCascoPct ?? 0)
                      );
                if (!defletiuTorp && ehModSecSteam) {
                  const camHitSec = (nave.camaras ?? []).find((c) => c.id === camAlvo);
                  if (camHitSec && Number(armaModSec.danoIonico ?? 0) > 0) {
                    const addIonSec = Math.max(1, Number(armaModSec.danoIonico ?? 1));
                    camHitSec.danoIonizado = Math.min(4, Number(camHitSec.danoIonizado ?? 0) + addIonSec);
                    camHitSec.barrasIonizadas = camHitSec.danoIonizado;
                    const durIonInimSec = Number(armaModSec.duracaoIonSeg ?? 5.0) * camHitSec.danoIonizado;
                    camHitSec.tempoParalisiaIonSeg = Math.max(Number(camHitSec.tempoParalisiaIonSeg ?? 0), durIonInimSec);
                    camHitSec.tempoRestanteIonSeg = camHitSec.tempoParalisiaIonSeg;
                    if (camAlvo === 1) {
                      nave.armasAtivas = sincronizarEnergiaArmasComCamaraArtilharia(nave, { redistribuir: false }).armasAtivas;
                    }
                  }
                  if (armaModSec.mecanicaEspecial === 'ESTASE_CRIO') {
                    for (const tCS of nave.tripulacao ?? []) {
                      if (tCS.localizacao === 'NAVE_JOGADOR' && tCS.camaraAtualId === camAlvo && tCS.hpAtual > 0) {
                        tCS.atordoadoSeg = Math.max(Number(tCS.atordoadoSeg ?? 0), 4.0);
                        tCS.acopladoBulbo = false;
                      }
                    }
                  }
                }
                emitirEventoVisual({
                  tipo: defletiuTorp ? 'DEFLEXAO_BLINDAGEM_JOGADOR' : 'IMPACTO_JOGADOR',
                  camaraId: camAlvo,
                  dano: defletiuTorp ? 0 : danoTorp,
                  abriuBrecha: !defletiuTorp && abreBrechaSec,
                  texto: defletiuTorp
                    ? 'BLINDAGEM!'
                    : ehIonPuroSec
                      ? (ehIdiomaEn ? 'IONIZED!' : 'IONIZADO!')
                      : abreBrechaSec
                        ? `-${danoTorp} BRECHA!`
                        : `-${danoTorp}`,
                });
                if (estadoAtual.meta?.edicaoComercialSteam === true) {
                  tirosVisuaisSecSteam.push({ camaraAlvoId: camAlvo, resultado: 'IMPACTO' });
                }
              }
            }
          }
        }
      }
    }
    if (nave.hpCascoAtual <= 0) {
      cloneAtk.meta = { ...cloneAtk.meta, faseJogo: 'FIM_DE_RUN' };
    }
    estadoAtual = congelarProfundo(cloneAtk);
  }

  // 3B. Oferta de Rendição Tática de Meio de Luta (Edição Comercial Steam — Barcos Humanos <= 28% Casco)
  if (
    estadoAtual.meta?.edicaoComercialSteam === true &&
    estadoAtual.alvoCombate &&
    estadoAtual.alvoCombate.ativo !== false &&
    !estadoAtual.alvoCombate.faseChefe &&
    String(estadoAtual.alvoCombate.classeAlvo ?? estadoAtual.alvoCombate.classeInimigo ?? '') === 'BARCO_HUMANO' &&
    Number(estadoAtual.alvoCombate.hpCascoAtual ?? 0) > 0 &&
    !estadoAtual.alvoCombate.rendicaoAvaliadaNaLuta
  ) {
    const limiarRendicao = Math.max(2, Math.floor(Number(estadoAtual.alvoCombate.hpCascoMax ?? 10) * 0.28));
    const tripVivaRend =
      (estadoAtual.alvoCombate.tripulacaoInimiga ?? []).some((t) => Number(t.hpAtual ?? 0) > 0) ||
      (estadoAtual.alvoCombate.salasOuOrgaos ?? []).some((s) =>
        (s.tripulantes ?? []).some((t) => Number(t.hpAtual ?? 0) > 0)
      );
    if (Number(estadoAtual.alvoCombate.hpCascoAtual) <= limiarRendicao && tripVivaRend) {
      const cloneRend = structuredClone(estadoAtual);
      cloneRend.alvoCombate.rendicaoAvaliadaNaLuta = true;
      const rolaRend = streamCombateDisparo(seed, setorComb, noIdComb, 1, 991) % 100;
      if (opcoesDebug.forcarOfertaRendicaoSteam === true || rolaRend < 70) {
        cloneRend.alvoCombate.ofertaRendicaoAtiva = {
          sucata: Math.max(10, 8 + setorComb * 4),
          biomassa: setorComb >= 4 ? 2 : 0,
          combustivel: 2 + (setorComb % 2),
          municao: 1 + ((setorComb + 1) % 2),
        };
        emitirEventoVisual({
          tipo: 'OFERTA_RENDICAO_INIMIGA',
          salaAlvoId: 1,
          texto: ehIdiomaEn ? 'ENEMY SURRENDERS! [R]' : 'INIMIGO SE RENDE! [R]',
        });
      }
      estadoAtual = congelarProfundo(cloneRend);
    }
  }

  // Mantém buffer vivo de projéteis/feixes em voo (0.85s) para renderização balística 60 FPS
  const projAntigos = Array.isArray(estadoAtual.meta?.projeteisAtivos) ? estadoAtual.meta.projeteisAtivos : [];
  const projAvancados = projAntigos
    .map((pr) => ({ ...pr, progresso: Math.round((Number(pr.progresso ?? 0) + dtSeg / 0.85) * 1000) / 1000 }))
    .filter((pr) => pr.progresso < 1.0);
  let seqProj = 0;
  for (const ev of eventosVisuais) {
    if (ev.tipo === 'FEIXE_JOGADOR') {
      const spF = resolverArmaCatalogoUnificado(ev.chassiId);
      const salasB = Array.isArray(ev.salasFeixe) ? [...ev.salasFeixe] : [];
      projAvancados.push({
        id: `PJ-${tick}-${seqProj++}`,
        familia: spF?.familiaVisual ?? 'FEIXE_PLASMA',
        resultado: 'EM_VOO',
        origem: 'JOGADOR',
        slotIndice: Number(ev.slotIndex ?? 0),
        salaAlvoId: Number(salasB[0] ?? 1),
        salasFeixe: salasB,
        progresso: 0.15,
      });
    } else if (ev.tipo === 'DISPARO_JOGADOR') {
      const spP = resolverArmaCatalogoUnificado(ev.chassiId);
      projAvancados.push({
        id: `PJ-${tick}-${seqProj++}`,
        familia: spP?.familiaVisual ?? 'PROJETIL_ACUSTICO',
        resultado: ev.acertou === false ? 'ESQUIVA' : 'IMPACTO',
        origem: 'JOGADOR',
        slotIndice: Number(ev.slotIndex ?? 0),
        salaAlvoId: Number(ev.salaAlvoId ?? 1),
        progresso: 0.12,
      });
    } else if (ev.tipo === 'DISPARO_INIMIGO') {
      const tirosDet =
        estadoAtual.meta?.edicaoComercialSteam === true && Array.isArray(ev.tirosVisuaisSteam) && ev.tirosVisuaisSteam.length > 0
          ? ev.tirosVisuaisSteam
          : null;
      if (tirosDet) {
        for (let idxTiro = 0; idxTiro < tirosDet.length; idxTiro += 1) {
          const infoT = tirosDet[idxTiro];
          projAvancados.push({
            id: `PI-${tick}-${seqProj++}`,
            familia: ev.familiaVisual ?? (ev.subtipo === 'TORPEDO_OU_BICO' ? 'TORPEDO_ABISSAL' : 'PROJETIL_ESPINHO'),
            resultado: infoT.resultado ?? 'IMPACTO',
            origem: 'INIMIGO',
            salaOrigemId: Number(ev.salaOrigemId ?? (ev.subtipo === 'TORPEDO_OU_BICO' ? 4 : 2)),
            camaraId: Number(infoT.camaraAlvoId ?? ev.camaraAlvoId ?? (ev.subtipo === 'TORPEDO_OU_BICO' ? 6 : 4)),
            xOrigem960: 716,
            yOrigem960: ev.subtipo === 'TORPEDO_OU_BICO' ? 228 : 176,
            xAlvo960: 412,
            yAlvo960: ev.subtipo === 'TORPEDO_OU_BICO' ? 214 : 188,
            progresso: Math.max(0.03, Math.round((0.12 - idxTiro * 0.06) * 100) / 100),
          });
        }
      } else {
        const bloqueouEscudo = eventosVisuais.some((x) => x.tipo === 'BLOQUEIO_BARREIRA_JOGADOR');
        const interceptadoDrone = eventosVisuais.some((x) => x.tipo === 'INTERCEPTACAO_DRONE_DEFESA');
        projAvancados.push({
          id: `PI-${tick}-${seqProj++}`,
          familia: ev.familiaVisual ?? (ev.subtipo === 'TORPEDO_OU_BICO' ? 'TORPEDO_ABISSAL' : 'PROJETIL_ESPINHO'),
          resultado:
            ev.acertou === false
              ? 'ESQUIVA'
              : interceptadoDrone
                ? 'INTERCEPTADO'
                : bloqueouEscudo
                  ? 'ESCUDO'
                  : 'IMPACTO',
          origem: 'INIMIGO',
          salaOrigemId: Number(ev.salaOrigemId ?? (ev.subtipo === 'TORPEDO_OU_BICO' ? 4 : 2)),
          camaraId: Number(ev.camaraAlvoId ?? (ev.subtipo === 'TORPEDO_OU_BICO' ? 6 : 4)),
          xOrigem960: 716,
          yOrigem960: ev.subtipo === 'TORPEDO_OU_BICO' ? 228 : 176,
          xAlvo960: 412,
          yAlvo960: ev.subtipo === 'TORPEDO_OU_BICO' ? 214 : 188,
          progresso: 0.12,
        });
      }
    }
  }

  if (
    estadoAtual.meta?.edicaoComercialSteam === true ||
    eventosVisuais.length > 0 ||
    projAvancados.length !== projAntigos.length ||
    projAntigos.length > 0 ||
    !Array.isArray(estadoAtual.meta?.eventosVisuaisUltimoTick) ||
    estadoAtual.meta.eventosVisuaisUltimoTick.length > 0
  ) {
    const cloneEv = structuredClone(estadoAtual);
    let telemetriaCombateSteam = cloneEv.meta?.telemetriaCombateSteam;
    if (cloneEv.meta?.edicaoComercialSteam === true) {
      const ant = telemetriaCombateSteam ?? {};
      const aguaDepoisKg = somarAguaTotalNave(cloneEv.naveJogador);
      const deltaDrenadoKg = Math.max(0, Math.round((aguaTotalAntesTickKg - aguaDepoisKg) * 1000) / 1000);
      const ionizadosAgora = (cloneEv.alvoCombate?.salasOuOrgaos ?? []).filter(
        (s) =>
          Number(s.paralisiaIonSeg ?? s.tempoRestanteIonSeg ?? 0) > 0 ||
          Number(s.barrasIonizadas ?? s.danoIonizado ?? 0) > 0
      ).length;
      const bloqueiosTick = eventosVisuais.filter(
        (e) => e.tipo === 'BLOQUEIO_BARREIRA_JOGADOR' || e.tipo === 'DEFLEXAO_BLINDAGEM_JOGADOR'
      ).length;
      const emMergulhoAgora =
        Boolean(estado.naveJogador?.mergulhoTaticoAtivo) || Boolean(cloneEv.naveJogador?.mergulhoTaticoAtivo);
      const usouMergulhoSobFogo =
        Boolean(ant.usouMergulhoSobFogo) || (emMergulhoAgora && cloneEv.alvoCombate?.ativo !== false);
      const evadiuOuRetomouMergulho =
        Boolean(ant.esquivouEmMergulhoTatico) ||
        (usouMergulhoSobFogo &&
          estado.naveJogador?.estadoFisico !== '1_NO_FOIL' &&
          cloneEv.naveJogador?.estadoFisico === '1_NO_FOIL') ||
        (emMergulhoAgora &&
          eventosVisuais.some(
            (e) =>
              (e.tipo === 'DISPARO_INIMIGO' && e.acertou === false) ||
              e.tipo === 'BLOQUEIO_BARREIRA_JOGADOR' ||
              e.tipo === 'DEFLEXAO_BLINDAGEM_JOGADOR'
          ));
      telemetriaCombateSteam = {
        aguaDrenadaNaLutaKg: Math.round(((Number(ant.aguaDrenadaNaLutaKg ?? 0)) + deltaDrenadoKg) * 1000) / 1000,
        sistemasInimigosIonizadosSimultaneos: Math.max(
          Number(ant.sistemasInimigosIonizadosSimultaneos ?? 0),
          ionizadosAgora
        ),
        impactosAbsorvidosOuDefletidosNaLuta:
          Number(ant.impactosAbsorvidosOuDefletidosNaLuta ?? 0) + bloqueiosTick,
        feixeDisparadoSobTintaFurtiva:
          Boolean(ant.feixeDisparadoSobTintaFurtiva) ||
          ((Number(estado.naveJogador?.furtividadeAtivaSeg ?? 0) > 0 ||
            Number(cloneEv.naveJogador?.furtividadeAtivaSeg ?? 0) > 0) &&
            eventosVisuais.some((e) => e.tipo === 'FEIXE_JOGADOR')),
        sofreuDanoCascoNaLuta:
          Boolean(ant.sofreuDanoCascoNaLuta) || Number(cloneEv.naveJogador?.hpCascoAtual ?? 0) < hpCascoAntesTick,
        sofreuMorteTripulanteNaLuta:
          Boolean(ant.sofreuMorteTripulanteNaLuta) ||
          idsTripulantesVivosAntesTick.some((idVivo) => {
            const trDep = (cloneEv.naveJogador?.tripulacao ?? []).find((t) => t.id === idVivo);
            return !trDep || Number(trDep.hpAtual ?? 0) <= 0;
          }),
        caiuEmTouchdownNaLuta:
          Boolean(ant.caiuEmTouchdownNaLuta) ||
          estado.naveJogador?.estadoFisico !== '1_NO_FOIL' ||
          cloneEv.naveJogador?.estadoFisico !== '1_NO_FOIL',
        usouMergulhoSobFogo,
        esquivouEmMergulhoTatico: evadiuOuRetomouMergulho,
      };
    }
    cloneEv.meta = {
      ...cloneEv.meta,
      eventosVisuaisUltimoTick: eventosVisuais,
      projeteisAtivos: projAvancados,
      ...(telemetriaCombateSteam !== undefined ? { telemetriaCombateSteam } : {}),
    };
    estadoAtual = congelarProfundo(cloneEv);
  }

  return estadoAtual;
}
