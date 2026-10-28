/**
 * [Onda 3] IA Inimiga (Barcos Humanos vs. Monstros Marinhos), Bomba de Porão e Simulação dos Marinheiros.
 * Implementa as regras do Vol. 03 (Seções 3.1..3.4 e Contra-Auditoria #3) e Vol. 05 (Seção 5.7).
 */

import { congelarProfundo } from '../onda1-fisica/estado-inicial.mjs';

export const CONSTANTES_IA_INIMIGOS = Object.freeze({
  HP_MARINHEIRO_HUMANO: 100,
  DPS_MARINHEIRO_HUMANO: 8.0,
  HP_MERGULHADOR_ASSALTO: 100,
  DPS_MERGULHADOR_ASSALTO: 12.0,
  HP_PARASITA_ABISSAL: 60,
  DPS_PARASITA_ABISSAL: 10.0,
  LIMIAR_HP_FUGA_HUMANO: 30,
  VEL_HUMANO_SALA_INUNDADA_MULT: 0.7,
  TEMPO_TRAVESSIA_SALA_BASE_SEG: 1.5,
  TAXA_AFOGAMENTO_HUMANO_HP_S: 8.0,
  TAXA_INVASAO_ROMBO_SUBMERSO_KG_S: 5.0,
  TAXA_BOMBA_PORAO_BARCO_KG_S: 1.0,
  CAPACIDADE_INUNDACAO_SALA_BARCO_KG: 12.5,
});

function arredondar4(v) {
  return Math.round(v * 10000) / 10000;
}

/**
 * Cria o alvo canônico do Setor 1: Lancha Patrulheira Costeira (Metal) ou Teuthis Couraçada (Carne).
 */
export function criarAlvoSetor1Canonico(tipo = 'BARCO_HUMANO') {
  if (tipo === 'MONSTRO_MARINHO') {
    return congelarProfundo({
      ativo: true,
      classeAlvo: 'MONSTRO_MARINHO',
      classeInimigo: 'MONSTRO_MARINHO',
      idInimigo: 'TEUTHIS_COURACADA_S1',
      setorNumero: 1,
      hpCascoAtual: 10,
      hpCascoMax: 10,
      esquivaBasePct: 20,
      camadasBarreiraAtivas: 0,
      barreiraBolhasAtual: 0,
      faseChefe: null,
      blindagemTermicaExternaPts: 0,
      timerSurgeSeg: 0.0,
      alarmeFervuraAtivoSeg: 0.0,
      fervuraAtivaSeg: 0.0,
      iaBackupAtiva: false,
      canalVisibilidadeSonar: 'VISIVEL',
      salasOuOrgaos: [
        { id: 1, nome: 'TENTACULOS', submersa: false, integridadeMax: 2, barrasMax: 2, integridadeAtual: 2, integridade: 2, aguaKg: 12.5, bombaPoraoAtiva: false, cegoTintaSeg: 0.0, paralisiaIonSeg: 0.0, tempoRestanteIonSeg: 0.0, isolamentoResidualChoqueSeg: 0.0, tripulantes: [{ id: 'anticorpo-1', especie: 'PARASITA', hpAtual: 60, hpMax: 60, dps: 10, imuneAfogamento: true }] },
        { id: 2, nome: 'BICO_QUITINOSO', submersa: false, integridadeMax: 2, barrasMax: 2, integridadeAtual: 2, integridade: 2, aguaKg: 12.5, bombaPoraoAtiva: false, cegoTintaSeg: 0.0, paralisiaIonSeg: 0.0, tempoRestanteIonSeg: 0.0, isolamentoResidualChoqueSeg: 0.0, tripulantes: [] },
        { id: 3, nome: 'SIFAO_MUSCULAR', submersa: true, integridadeMax: 2, barrasMax: 2, integridadeAtual: 2, integridade: 2, aguaKg: 12.5, bombaPoraoAtiva: false, cegoTintaSeg: 0.0, paralisiaIonSeg: 0.0, tempoRestanteIonSeg: 0.0, isolamentoResidualChoqueSeg: 0.0, tripulantes: [] },
        { id: 4, nome: 'GANGLIO_CENTRAL', submersa: true, integridadeMax: 3, barrasMax: 3, integridadeAtual: 3, integridade: 3, aguaKg: 12.5, bombaPoraoAtiva: false, cegoTintaSeg: 0.0, paralisiaIonSeg: 0.0, tempoRestanteIonSeg: 0.0, isolamentoResidualChoqueSeg: 0.0, tripulantes: [] },
      ],
    });
  }

  return congelarProfundo({
    ativo: true,
    classeAlvo: 'BARCO_HUMANO',
    classeInimigo: 'BARCO_HUMANO',
    idInimigo: 'LANCHA_PATRULHEIRA_S1',
    setorNumero: 1,
    hpCascoAtual: 8,
    hpCascoMax: 8,
    esquivaBasePct: 15,
    camadasBarreiraAtivas: 0,
    barreiraBolhasAtual: 0,
    faseChefe: null,
    blindagemTermicaExternaPts: 0,
    timerSurgeSeg: 0.0,
    alarmeFervuraAtivoSeg: 0.0,
    fervuraAtivaSeg: 0.0,
    iaBackupAtiva: false,
    canalVisibilidadeSonar: 'VISIVEL',
    salasOuOrgaos: [
      { id: 1, nome: 'CABINE_COMANDO', submersa: false, integridadeMax: 1, barrasMax: 1, integridadeAtual: 1, integridade: 1, aguaKg: 0.0, rombosSubmersos: 0, bombaPoraoAtiva: false, cegoTintaSeg: 0.0, paralisiaIonSeg: 0.0, tempoRestanteIonSeg: 0.0, isolamentoResidualChoqueSeg: 0.0, tripulantes: [{ id: 'mar-1', especie: 'MARINHEIRO', hpAtual: 100, hpMax: 100, dps: 8, imuneAfogamento: false }] },
      { id: 2, nome: 'TORRETA_CONVES', submersa: false, integridadeMax: 2, barrasMax: 2, integridadeAtual: 2, integridade: 2, aguaKg: 0.0, rombosSubmersos: 0, bombaPoraoAtiva: false, cegoTintaSeg: 0.0, paralisiaIonSeg: 0.0, tempoRestanteIonSeg: 0.0, isolamentoResidualChoqueSeg: 0.0, tripulantes: [] },
      { id: 3, nome: 'CASA_DE_MAQUINAS_MOTOR', submersa: true, integridadeMax: 2, barrasMax: 2, integridadeAtual: 2, integridade: 2, aguaKg: 0.0, rombosSubmersos: 0, bombaPoraoAtiva: true, cegoTintaSeg: 0.0, paralisiaIonSeg: 0.0, tempoRestanteIonSeg: 0.0, isolamentoResidualChoqueSeg: 0.0, tripulantes: [{ id: 'mar-2', especie: 'MARINHEIRO', hpAtual: 100, hpMax: 100, dps: 8, imuneAfogamento: false }] },
      { id: 4, nome: 'TUBO_DE_TORPEDO', submersa: true, integridadeMax: 1, barrasMax: 1, integridadeAtual: 1, integridade: 1, aguaKg: 0.0, rombosSubmersos: 0, bombaPoraoAtiva: false, cegoTintaSeg: 0.0, paralisiaIonSeg: 0.0, tempoRestanteIonSeg: 0.0, isolamentoResidualChoqueSeg: 0.0, tripulantes: [] },
    ],
  });
}

/**
 * Avança um tick puro da IA e Hidráulica do alvo inimigo (Barco Humano ou Monstro Marinho).
 */
export function avancarTickIaInimiga(estado, dtSeg = 0.25) {
  if (!Object.isFrozen(estado)) {
    throw new Error('[Lei L2] avancarTickIaInimiga exige estado de entrada congelado (Object.freeze)');
  }
  const proximo = structuredClone(estado);
  const alvo = proximo.alvoCombate;
  if (!alvo || alvo.ativo === false) return congelarProfundo(proximo);
  alvo.classeAlvo = alvo.classeAlvo ?? alvo.classeInimigo ?? 'BARCO_HUMANO';
  alvo.classeInimigo = alvo.classeAlvo;

  const bexigaSeg = Math.max(Number(alvo.reducaoEsquivaBexigaSeg ?? 0), Number(alvo.penalidadeEsquivaBexigaSeg ?? 0));
  if (bexigaSeg > 0) {
    const novoBexiga = Math.max(0.0, arredondar4(bexigaSeg - dtSeg));
    alvo.reducaoEsquivaBexigaSeg = novoBexiga;
    alvo.penalidadeEsquivaBexigaSeg = novoBexiga;
    alvo.esquivaEfetivaPct = novoBexiga > 0 ? Math.max(0, Number(alvo.esquivaBasePct ?? 20) - 15) : Number(alvo.esquivaBasePct ?? 20);
  }

  let salasExaminadas = 0;
  const ehEdicaoSteam = Boolean(proximo.meta?.edicaoComercialSteam);
  const salaMotor = alvo.salasOuOrgaos.find((s) => /MOTOR|MAQUINAS|PROPULSAO|REATOR/i.test(s.nome));
  const bombaPoraoOperacional =
    alvo.classeAlvo === 'BARCO_HUMANO' && (!salaMotor || (salaMotor.integridadeAtual ?? salaMotor.integridade ?? 1) > 0);
  const abordadoresPorSalaInim = new Map();
  for (const ali of proximo.naveJogador?.tripulacao ?? []) {
    if (ali.localizacao === 'BORDO_INIMIGO' && Number(ali.hpAtual ?? 0) > 0) {
      const idS = Number(ali.salaInimigaId ?? 0);
      abordadoresPorSalaInim.set(idS, (abordadoresPorSalaInim.get(idS) ?? 0) + 1);
    }
  }

  // Sincroniza e decai timers individuais de tripulação inimiga (`atordoadoSeg` e `controleNeuralSeg`) 1x por ID único
  const estadoTripPorId = new Map();
  for (const hTop of alvo.tripulacaoInimiga ?? []) {
    estadoTripPorId.set(hTop.id, { ...hTop });
  }
  for (const sPre of alvo.salasOuOrgaos) {
    for (const tSala of sPre.tripulantes ?? []) {
      const prev = estadoTripPorId.get(tSala.id);
      estadoTripPorId.set(tSala.id, {
        ...(prev ?? {}),
        ...tSala,
        salaId: sPre.id,
        hpAtual: prev ? Math.min(Number(prev.hpAtual ?? 100), Number(tSala.hpAtual ?? 100)) : Number(tSala.hpAtual ?? 100),
        atordoadoSeg: Math.max(Number(prev?.atordoadoSeg ?? 0), Number(tSala.atordoadoSeg ?? 0)),
        controleNeuralSeg: Math.max(Number(prev?.controleNeuralSeg ?? 0), Number(tSala.controleNeuralSeg ?? 0)),
      });
    }
  }
  for (const infoT of estadoTripPorId.values()) {
    if (Number(infoT.atordoadoSeg ?? 0) > 0) {
      infoT.atordoadoSeg = Math.max(0.0, arredondar4(Number(infoT.atordoadoSeg) - dtSeg));
    }
    if (Number(infoT.controleNeuralSeg ?? 0) > 0) {
      infoT.controleNeuralSeg = Math.max(0.0, arredondar4(Number(infoT.controleNeuralSeg) - dtSeg));
    }
  }
  for (const sSync of alvo.salasOuOrgaos) {
    if (Array.isArray(sSync.tripulantes)) {
      for (const tSala of sSync.tripulantes) {
        const sync = estadoTripPorId.get(tSala.id);
        if (!sync) continue;
        tSala.hpAtual = sync.hpAtual;
        if (sync.atordoadoSeg !== undefined || tSala.atordoadoSeg !== undefined) {
          tSala.atordoadoSeg = Number(sync.atordoadoSeg ?? 0);
        }
        if (sync.controleNeuralSeg !== undefined || tSala.controleNeuralSeg !== undefined) {
          tSala.controleNeuralSeg = Number(sync.controleNeuralSeg ?? 0);
        }
      }
    }
  }

  for (const sala of alvo.salasOuOrgaos) {
    salasExaminadas += 1;
    sala.integridadeAtual = sala.integridadeAtual ?? sala.integridade ?? sala.integridadeMax ?? sala.barrasMax ?? 1;
    sala.integridade = sala.integridadeAtual;

    // 1. Timers de cegueira por tinta, paralisia por choque/íon + isolamento residual de 5s, veneno e fervura termofílica
    const cegoSeg = Math.max(Number(sala.cegoTintaSeg ?? 0), Number(sala.cegueiraTintaSeg ?? 0));
    if (cegoSeg > 0) {
      const novoCego = Math.max(0.0, arredondar4(cegoSeg - dtSeg));
      sala.cegoTintaSeg = novoCego;
      sala.cegueiraTintaSeg = novoCego;
    }
    const ionSeg = Math.max(Number(sala.paralisiaIonSeg ?? 0), Number(sala.tempoRestanteIonSeg ?? 0));
    if (ionSeg > 0) {
      const novoIon = Math.max(0.0, arredondar4(ionSeg - dtSeg));
      sala.paralisiaIonSeg = novoIon;
      sala.tempoRestanteIonSeg = novoIon;
      if (novoIon === 0) {
        sala.isolamentoResidualChoqueSeg = 5.0;
      }
    } else if (sala.isolamentoResidualChoqueSeg > 0) {
      sala.isolamentoResidualChoqueSeg = Math.max(0.0, arredondar4(sala.isolamentoResidualChoqueSeg - dtSeg));
    }
    if ((sala.venenoToxinaSeg ?? 0) > 0) {
      sala.venenoToxinaSeg = Math.max(0.0, arredondar4(sala.venenoToxinaSeg - dtSeg));
      for (const t of sala.tripulantes ?? []) {
        if (t.hpAtual > 0) {
          t.hpAtual = Math.max(0.0, arredondar4(t.hpAtual - 6.0 * dtSeg));
        }
      }
    }
    if ((sala.fervuraTermofilicaSeg ?? 0) > 0) {
      const novoFerv = Math.max(0.0, arredondar4(sala.fervuraTermofilicaSeg - dtSeg));
      sala.fervuraTermofilicaSeg = novoFerv;
      for (const t of sala.tripulantes ?? []) {
        if (t.hpAtual > 0) {
          t.hpAtual = Math.max(0.0, arredondar4(t.hpAtual - 5.0 * dtSeg));
        }
      }
      if (novoFerv === 0 && sala.integridadeAtual > 0) {
        sala.integridadeAtual -= 1;
        sala.integridade = sala.integridadeAtual;
      }
    }

    // 2. Hidráulica interna de Barcos Humanos (rombo submerso +5.0 kg/s vs Bomba de Porão -1.0 kg/s)
    if (alvo.classeAlvo === 'BARCO_HUMANO') {
      const jaEstavaTotalmenteInundada =
        (sala.aguaKg ?? 0) >= CONSTANTES_IA_INIMIGOS.CAPACIDADE_INUNDACAO_SALA_BARCO_KG;
      const rombosSub = sala.submersa ? Math.max(0, Number(sala.rombosSubmersos ?? 0)) : 0;
      if (rombosSub > 0) {
        const entrada = rombosSub * CONSTANTES_IA_INIMIGOS.TAXA_INVASAO_ROMBO_SUBMERSO_KG_S * dtSeg;
        sala.aguaKg = Math.min(
          CONSTANTES_IA_INIMIGOS.CAPACIDADE_INUNDACAO_SALA_BARCO_KG,
          arredondar4(sala.aguaKg + entrada)
        );
      } else if (sala.aguaKg > 0 && bombaPoraoOperacional) {
        const dreno = CONSTANTES_IA_INIMIGOS.TAXA_BOMBA_PORAO_BARCO_KG_S * dtSeg;
        sala.aguaKg = Math.max(0.0, arredondar4(sala.aguaKg - dreno));
      }

      // Afogamento de marinheiros humanos sem escafandro na sala já 100% inundada (>= 12.5 kg)
      if (jaEstavaTotalmenteInundada) {
        for (const t of sala.tripulantes ?? []) {
          if (t.hpAtual > 0 && !t.imuneAfogamento && t.especie === 'MARINHEIRO' && !t.emFugaEscada) {
            t.hpAtual = Math.max(
              0.0,
              arredondar4(t.hpAtual - CONSTANTES_IA_INIMIGOS.TAXA_AFOGAMENTO_HUMANO_HP_S * dtSeg)
            );
          }
        }
      }

      // Controle Neural (Parasita Neural AE) e Reparo Ativo de Sistemas por Marinheiros/Mergulhadores não-atordoados (Edição Steam)
      const vivosNaSala = (sala.tripulantes ?? []).filter((t) => Number(t.hpAtual ?? 0) > 0);
      const controladosNaSala = vivosNaSala.filter((t) => Number(t.controleNeuralSeg ?? 0) > 0 && !(Number(t.atordoadoSeg ?? 0) > 0));
      if (controladosNaSala.length > 0) {
        sala.progressoReparoInimigoSeg = 0.0;
        const outrosHostis = vivosNaSala.filter((t) => !(Number(t.controleNeuralSeg ?? 0) > 0));
        if (outrosHostis.length > 0) {
          outrosHostis[0].hpAtual = Math.max(0.0, arredondar4(outrosHostis[0].hpAtual - 10.0 * controladosNaSala.length * dtSeg));
        } else {
          sala.progressoSabotagemNeuralSeg = arredondar4(Number(sala.progressoSabotagemNeuralSeg ?? 0) + dtSeg * controladosNaSala.length);
          if (sala.progressoSabotagemNeuralSeg >= 6.0 && sala.integridadeAtual > 0) {
            sala.progressoSabotagemNeuralSeg = arredondar4(sala.progressoSabotagemNeuralSeg - 6.0);
            sala.integridadeAtual = Math.max(0, sala.integridadeAtual - 1);
            sala.integridade = sala.integridadeAtual;
          }
        }
      } else if (ehEdicaoSteam) {
        const intMaxSala = Math.max(1, Number(sala.integridadeMax ?? sala.barrasMax ?? sala.integridadeAtual ?? 1));
        const reparadoresAptos = vivosNaSala.filter(
          (t) =>
            !(Number(t.atordoadoSeg ?? 0) > 0) &&
            !(Number(t.controleNeuralSeg ?? 0) > 0) &&
            !t.emFugaEscada
        ).length;
        const contestadaPorAliado = (abordadoresPorSalaInim.get(Number(sala.id)) ?? 0) > 0;
        if (
          reparadoresAptos > 0 &&
          !contestadaPorAliado &&
          sala.integridadeAtual < intMaxSala &&
          !(Number(sala.corrosaoAcidaSeg ?? 0) > 0)
        ) {
          sala.progressoReparoInimigoSeg = arredondar4(
            Number(sala.progressoReparoInimigoSeg ?? 0) + dtSeg * reparadoresAptos
          );
          if (sala.progressoReparoInimigoSeg >= 14.0) {
            sala.progressoReparoInimigoSeg = arredondar4(sala.progressoReparoInimigoSeg - 14.0);
            sala.integridadeAtual = Math.min(intMaxSala, sala.integridadeAtual + 1);
            sala.integridade = sala.integridadeAtual;
          }
        } else if (sala.integridadeAtual >= intMaxSala) {
          sala.progressoReparoInimigoSeg = 0.0;
        }
      }
    }
  }

  // 3. IA Humana de sobrevivência: marinheiro com HP < 30 em sala submersa inundada sobe para a Cabine seca (id=1) se NÃO estiver atordoado!
  if (alvo.classeAlvo === 'BARCO_HUMANO') {
    const salaCabine = alvo.salasOuOrgaos.find((s) => s.id === 1 && !s.submersa);
    if (salaCabine) {
      const tempoEscada = Math.ceil(1.5 / CONSTANTES_IA_INIMIGOS.VEL_HUMANO_SALA_INUNDADA_MULT / 0.25) * 0.25;
      for (const sala of alvo.salasOuOrgaos) {
        if (!sala.submersa || sala.aguaKg < CONSTANTES_IA_INIMIGOS.CAPACIDADE_INUNDACAO_SALA_BARCO_KG) continue;
        const restantes = [];
        for (const t of sala.tripulantes ?? []) {
          const bloqueadoPorStunOuNeuro = Number(t.atordoadoSeg ?? 0) > 0 || Number(t.controleNeuralSeg ?? 0) > 0;
          if (
            !bloqueadoPorStunOuNeuro &&
            t.hpAtual > 0 &&
            t.especie === 'MARINHEIRO' &&
            t.hpAtual < CONSTANTES_IA_INIMIGOS.LIMIAR_HP_FUGA_HUMANO
          ) {
            if (t.emFugaEscada) {
              t.progressoFugaEscadaSeg = arredondar4((t.progressoFugaEscadaSeg ?? 0.0) + dtSeg);
              if (t.progressoFugaEscadaSeg >= tempoEscada) {
                t.progressoFugaEscadaSeg = 0.0;
                t.emFugaEscada = false;
                t.salaId = salaCabine.id;
                salaCabine.tripulantes.push(t);
                continue;
              }
            } else {
              t.emFugaEscada = true;
              t.progressoFugaEscadaSeg = 0.0;
            }
          }
          restantes.push(t);
        }
        sala.tripulantes = restantes;
      }
    }
  }

  if (Array.isArray(alvo.tripulacaoInimiga)) {
    const posFinalPorId = new Map();
    for (const sFim of alvo.salasOuOrgaos) {
      for (const tFim of sFim.tripulantes ?? []) {
        posFinalPorId.set(tFim.id, { ...tFim, salaId: sFim.id });
      }
    }
    alvo.tripulacaoInimiga = alvo.tripulacaoInimiga.map((h) => {
      const f = posFinalPorId.get(h.id) ?? estadoTripPorId.get(h.id);
      if (!f) return h;
      return {
        ...h,
        salaId: f.salaId ?? h.salaId,
        hpAtual: f.hpAtual,
        ...(f.atordoadoSeg !== undefined || h.atordoadoSeg !== undefined ? { atordoadoSeg: Number(f.atordoadoSeg ?? 0) } : {}),
        ...(f.controleNeuralSeg !== undefined || h.controleNeuralSeg !== undefined
          ? { controleNeuralSeg: Number(f.controleNeuralSeg ?? 0) }
          : {}),
      };
    });
  }

  proximo.telemetriaN4.ultimoTickSalasInimigasExaminadas = salasExaminadas;
  return congelarProfundo(proximo);
}
