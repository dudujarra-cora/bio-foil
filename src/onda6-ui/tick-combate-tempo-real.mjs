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

function aplicarDanoEmCamaraJogador(nave, camaraAlvoId, danoCasco, danoSistema, abreRombo = false, rolagemBlindagem = 99) {
  const nivelBlindagem = Math.max(0, Number(nave.nivelBlindagem ?? 0));
  const blindagemDefletiu = danoCasco > 0 && nivelBlindagem > 0 && rolagemBlindagem < nivelBlindagem * 15;
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

  let estadoAtual = avancarTickCombateCompleto(estado, dtSeg);
  estadoAtual = avancarTickBiomaEColmeiaViva(estadoAtual, dtSeg);

  const seed = String(estadoAtual.meta?.seedPartida ?? estadoAtual.meta?.sementeRun ?? 'seed-padrao');
  const setorComb = Math.max(
    1,
    Number(estadoAtual.alvoCombate?.setorNumero ?? estadoAtual.mapaSetorial?.setorNumero ?? estadoAtual.meta?.setorAtual ?? 1)
  );
  const noIdComb = String(estadoAtual.mapaSetorial?.noAtualId ?? 'NO_COMBATE');
  const tick = Number(estadoAtual.meta?.tickAtual ?? 0);
  const eventosVisuais = [];
  let seqEventoVisual = 0;
  const emitirEventoVisual = (ev) => {
    seqEventoVisual += 1;
    eventosVisuais.push({
      idEvento: tick * 100 + seqEventoVisual,
      tick,
      ...ev,
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

  // 1. Disparo das armas dorsais carregadas do jogador (CATALOGO_ARMAS_51)
  for (let idxSlot = 0; idxSlot < (estadoAtual.naveJogador.armasAtivas ?? []).length; idxSlot += 1) {
    if (!estadoAtual.alvoCombate || estadoAtual.alvoCombate.ativo === false || estadoAtual.alvoCombate.hpCascoAtual <= 0) break;
    const slot = estadoAtual.naveJogador.armasAtivas[idxSlot];
    const arma = slot?.arma !== undefined ? slot.arma : slot;
    if (!arma) continue;
    const custoEnergiaArma = Math.max(1, Number(arma.energiaCusto ?? arma.energia ?? 1));
    if (Number(arma.energiaAlocada ?? custoEnergiaArma) < custoEnergiaArma) {
      continue;
    }
    const temAlvo =
      (arma.salaAlvoId !== null && arma.salaAlvoId !== undefined) ||
      (Array.isArray(arma.trincaSalasBeam) && arma.trincaSalasBeam.length > 0);
    if (!temAlvo || Number(arma.progressoRecargaSeg ?? 0) < Number(arma.tempoRecargaBaseSeg ?? 9)) {
      continue;
    }
    if (arma.modoDisparoManual === true && arma.disparoManualAutorizado !== true) {
      continue;
    }

    const chassiDisparo = arma.chassiId ?? arma.id;
    const spec51 = CATALOGO_ARMAS_51.find((a) => a.id === chassiDisparo) ?? null;
    const custoMun = Number(arma.municaoCusto ?? spec51?.municao ?? 0);
    const munAtual = Number(estadoAtual.economia?.municao ?? estadoAtual.recursos?.municao ?? 0);
    if (custoMun > 0 && munAtual < custoMun) {
      continue;
    }

    {
      const clonePre = structuredClone(estadoAtual);
      if (custoMun > 0) {
        if (clonePre.economia) clonePre.economia.municao = Math.max(0, munAtual - custoMun);
        if (clonePre.recursos) clonePre.recursos.municao = Math.max(0, munAtual - custoMun);
      }
      const sClone = clonePre.naveJogador.armasAtivas[idxSlot];
      const armaCloneRef = sClone?.arma ?? sClone;
      armaCloneRef.progressoRecargaSeg = 0.0;
      armaCloneRef.disparoManualAutorizado = false;
      estadoAtual = congelarProfundo(clonePre);
    }

    const danoCascoBase = arma.danoCasco ?? spec51?.danoCasco ?? 1;
    const danoSistemaBase = arma.danoSistema ?? spec51?.danoSistema ?? 1;
    const ignoraBarreira = Boolean(spec51?.ignoraBarreira) || custoMun > 0;
    const abreRombo = Number(arma.chanceFuroPct ?? spec51?.chanceFuroPct ?? 0) > 0;

    if (spec51?.ehFeixe) {
      const grafoAlvoBeam = resolverGrafoBeamAlvoInterno(estadoAtual.alvoCombate);
      const trincaValidaNoAlvo =
        Array.isArray(arma.trincaSalasBeam) && validarTrincaBeam(arma.trincaSalasBeam, grafoAlvoBeam);
      const salasFeixe = trincaValidaNoAlvo
        ? arma.trincaSalasBeam
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
            estadoAtual = resolverImpactoNoAlvo(estadoAtual, {
              tipo: 'DISPARO_ARMA',
              salaAlvoId: idSalaBeam,
              chassiId: chassiDisparo,
              danoCasco: danoCascoBase,
              danoSistema: danoSistemaBase,
              abreRombo: false,
              municaoCusto: 0,
              orgaosEnxertados: arma.orgaosEnxertados ?? [],
            });
            emitirEventoVisual({
              tipo: 'IMPACTO_ALVO',
              salaAlvoId: idSalaBeam,
              dano: danoCascoBase,
              texto: danoCascoBase > 0 ? `-${danoCascoBase}` : `-${danoSistemaBase} SYS`,
            });
          }
        }
      }
    } else {
      const totalProjeteis = Math.max(1, Number(spec51?.projeteis ?? 1));
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
        const esquivaAlvo = propViva
          ? Math.max(0, Number(alvo.esquivaEfetivaPct ?? alvo.esquivaBasePct ?? 15))
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
        estadoAtual = resolverImpactoNoAlvo(estadoAtual, {
          tipo: 'DISPARO_ARMA',
          salaAlvoId: arma.salaAlvoId,
          chassiId: chassiDisparo,
          danoCasco: danoCascoBase,
          danoSistema: danoSistemaBase,
          abreRombo,
          municaoCusto: ignoraBarreira ? 1 : 0,
          orgaosEnxertados: arma.orgaosEnxertados ?? [],
        });
        emitirEventoVisual({
          tipo: 'IMPACTO_ALVO',
          salaAlvoId: arma.salaAlvoId,
          dano: Math.max(danoCascoBase, danoSistemaBase),
          texto: danoCascoBase > 0 ? `-${danoCascoBase}` : `-${danoSistemaBase} ORG`,
        });
      }
    }
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
        const danoAliado = Number(fichaAli.dpsCorpoACorpo ?? 10) * multVelSeca * dtRestanteAcao;
        const idAlvoHum = defensoresNaSala[0].id;
        const novoHpHum = Math.max(0, Math.round((Number(defensoresNaSala[0].hpAtual) - danoAliado) * 1000) / 1000);
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
        const sonarSurge = !opcoesDebug.desativarSonarMilitarMutacao && Boolean(cloneSubIa.alvoCombate.sonarMilitarAtivo);
        const esquivaSurge = Math.max(
          0,
          calcularEsquivaEfetivaNave(naveSurge) - (sonarSurge && Number(naveSurge.furtividadeAtivaSeg ?? 0) > 0 ? 30 : 0)
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
                const defD = aplicarDanoEmCamaraJogador(naveSurge, camAereo, 1, 1, false, rolaBlD);
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
              acertou: acertouT,
            });
            if (acertouT) {
              const rolaBlT = streamCombateDisparo(seed, setorComb, noIdComb, tick, 975 + d) % 100;
              const defT = aplicarDanoEmCamaraJogador(naveSurge, 6, 1, 1, true, rolaBlT);
              naveSurge.pesoVirtualArrastoKg = Math.max(Number(naveSurge.pesoVirtualArrastoKg ?? 0), 25);
              naveSurge.tempoRestanteArrastoSeg = Math.max(Number(naveSurge.tempoRestanteArrastoSeg ?? 0), 4.0);
              emitirEventoVisual({
                tipo: defT ? 'DEFLEXAO_BLINDAGEM_JOGADOR' : 'IMPACTO_JOGADOR',
                camaraId: 6,
                dano: defT ? 0 : 1,
                texto: defT ? 'BLINDAGEM!' : '-1 DRONE MASTRO!',
              });
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
                const defL = aplicarDanoEmCamaraJogador(naveSurge, camL, 1, 1, false, rolaBlL);
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
            } else {
              const rolaBlindMina = streamCombateDisparo(seed, setorComb, noIdComb, tick, 950) % 100;
              const defletiuMina = aplicarDanoEmCamaraJogador(nave, 6, 2, 1, true, rolaBlindMina);
              emitirEventoVisual({
                tipo: defletiuMina ? 'DEFLEXAO_BLINDAGEM_JOGADOR' : 'IMPACTO_JOGADOR',
                camaraId: 6,
                dano: defletiuMina ? 0 : 2,
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
      const esquivaBaseJogador = calcularEsquivaEfetivaNave(nave);
      const penalidadeSonarFurtivo = sonarAtivo && Number(nave.furtividadeAtivaSeg ?? 0) > 0 ? 30 : 0;
      const esquivaJogador = Math.max(0, esquivaBaseJogador - penalidadeSonarFurtivo);

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
          emitirEventoVisual({
            tipo: 'DISPARO_INIMIGO',
            subtipo: 'PRIMARIO',
            classeAlvo: classe,
            acertou: rolaPrec < precisao && rolaEsq >= esquivaJogador,
          });
          if (rolaPrec < precisao && rolaEsq >= esquivaJogador) {
            const rajada = classe === 'CHEFE_DRAGA' || setor >= 5 ? 2 : 1;
            for (let r = 0; r < rajada; r += 1) {
              if (Number(nave.camadasBarreiraAtivas ?? 0) > 0) {
                nave.camadasBarreiraAtivas -= 1;
                nave.progressoRegenBarreiraSeg = 0.0;
                emitirEventoVisual({
                  tipo: 'BLOQUEIO_BARREIRA_JOGADOR',
                  texto: 'BARREIRA!',
                });
              } else {
                const camAlvo = [5, 4, 1, 2][streamCombateDisparo(seed, setorComb, noIdComb, tick, 910 + r) % 4];
                const rolaBlindPrim = streamCombateDisparo(seed, setorComb, noIdComb, tick, 951 + r) % 100;
                const defletiuPrim = aplicarDanoEmCamaraJogador(nave, camAlvo, 1, 1, false, rolaBlindPrim);
                emitirEventoVisual({
                  tipo: defletiuPrim ? 'DEFLEXAO_BLINDAGEM_JOGADOR' : 'IMPACTO_JOGADOR',
                  camaraId: camAlvo,
                  dano: defletiuPrim ? 0 : 1,
                  texto: defletiuPrim ? 'BLINDAGEM!' : '-1',
                });
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
          emitirEventoVisual({
            tipo: 'DISPARO_INIMIGO',
            subtipo: 'TORPEDO_OU_BICO',
            classeAlvo: classe,
            acertou: rolaPrec < precisao && rolaEsq >= esquivaJogador,
          });
          if (rolaPrec < precisao && rolaEsq >= esquivaJogador) {
            if (classe === 'MONSTRO_MARINHO') {
              if (nave.estadoFisico === '1_NO_FOIL' && Number(nave.camadasBarreiraAtivas ?? 0) > 0) {
                nave.camadasBarreiraAtivas -= 1;
                nave.progressoRegenBarreiraSeg = 0.0;
                emitirEventoVisual({
                  tipo: 'BLOQUEIO_BARREIRA_JOGADOR',
                  texto: 'BARREIRA!',
                });
              } else {
                const dMon = setor >= 3 ? 2 : 1;
                const rolaBlindMon = streamCombateDisparo(seed, setorComb, noIdComb, tick, 955) % 100;
                const defletiuMon = aplicarDanoEmCamaraJogador(nave, 6, dMon, 1, nave.estadoFisico !== '1_NO_FOIL', rolaBlindMon);
                emitirEventoVisual({
                  tipo: defletiuMon ? 'DEFLEXAO_BLINDAGEM_JOGADOR' : 'IMPACTO_JOGADOR',
                  camaraId: 6,
                  dano: defletiuMon ? 0 : dMon,
                  texto: defletiuMon ? 'BLINDAGEM!' : `-${dMon} QUILHA!`,
                });
              }
            } else {
              const camAlvo = [5, 6, 4, 3][streamCombateDisparo(seed, setorComb, noIdComb, tick, 930) % 4];
              const danoTorp = classe === 'CHEFE_DRAGA' || setor >= 4 ? 2 : 1;
              const rolaBlindTorp = streamCombateDisparo(seed, setorComb, noIdComb, tick, 956) % 100;
              const defletiuTorp = aplicarDanoEmCamaraJogador(nave, camAlvo, danoTorp, 1, true, rolaBlindTorp);
              emitirEventoVisual({
                tipo: defletiuTorp ? 'DEFLEXAO_BLINDAGEM_JOGADOR' : 'IMPACTO_JOGADOR',
                camaraId: camAlvo,
                dano: defletiuTorp ? 0 : danoTorp,
                texto: defletiuTorp ? 'BLINDAGEM!' : `-${danoTorp} BRECHA!`,
              });
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

  if (
    eventosVisuais.length > 0 ||
    !Array.isArray(estadoAtual.meta?.eventosVisuaisUltimoTick) ||
    estadoAtual.meta.eventosVisuaisUltimoTick.length > 0
  ) {
    const cloneEv = structuredClone(estadoAtual);
    cloneEv.meta = {
      ...cloneEv.meta,
      eventosVisuaisUltimoTick: eventosVisuais,
    };
    estadoAtual = congelarProfundo(cloneEv);
  }

  return estadoAtual;
}
