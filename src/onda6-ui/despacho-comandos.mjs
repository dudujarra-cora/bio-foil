/**
 * ONDA 6 — Catálogo Fechado dos 15 Comandos Atômicos (`Action Schema`) e Despachante Puro UI <-> Motor
 * Dono Único (Lei N5): src/onda6-ui/despacho-comandos.mjs
 *
 * Fontes canônicas:
 *  - Seção 8.5.A (Tabela dos 15 Comandos Atômicos, Fases Permitidas, Pré-Condições e Marcadores de Rejeição)
 *  - Lei L2 (Imutabilidade: comandos rejeitados devolvem o estado sem mutar campos de jogo e registram no logDeterministico)
 */
import { clonarProfundoCongelado } from '../gdd-parser.mjs';
import { congelarProfundo } from '../onda1-fisica/estado-inicial.mjs';
import { streamCombateDisparo } from '../onda1-fisica/hash32-streams.mjs';
import {
  calcularPesoTotalNave,
  calcularSustentacaoFoil,
  alternarValvulaExterna,
  drenarTodasValvulas,
  alternarMergulhoTatico,
} from '../onda1-fisica/tick-hidraulica-foil.mjs';
import {
  GRAFOS_BEAM_CANONICOS,
  validarTrincaBeam,
  calcularEsquivaEfetivaNave,
} from '../onda2-combate/tick-sistemas-armas.mjs';
import { avancarTickCombateCompleto } from '../onda2-combate/tick-tripulacao.mjs';
import { avancarTickIaInimiga } from '../onda3-inimigos/ia-barco-monstro.mjs';
import { resolverImpactoNoAlvo } from '../onda3-inimigos/abordagem-vitoria.mjs';
import { iniciarTravessiaMapa } from '../onda4-mapa/relogio-viagem.mjs';
import { resolverVisitaNoMapa } from '../onda4-mapa/eventos-nos.mjs';
import {
  tentarAbordagemContraAlvo,
  avancarTickChefeDraga,
} from '../onda5-catalogo-chefe/chefe-draga.mjs';
import {
  CATALOGO_ARMAS_51,
  CATALOGO_ORGAOS_52,
  CATALOGO_LOJA_56B,
  avancarTickBiomaEColmeiaViva,
} from '../onda5-catalogo-chefe/catalogo-naves-itens.mjs';

export const ESQUEMA_15_COMANDOS_85A = Object.freeze([
  Object.freeze({
    tipo: 'ALOCAR_ENERGIA',
    fasesPermitidas: Object.freeze(['COMBATE', 'MAPA', 'EVENTO', 'LOJA']),
    marcadorRejeicao: 'PRECONDICAO_NAO_ATENDIDA',
  }),
  Object.freeze({
    tipo: 'MOVER_TRIPULANTE',
    fasesPermitidas: Object.freeze(['COMBATE', 'MAPA', 'EVENTO', 'LOJA']),
    marcadorRejeicao: 'PRECONDICAO_NAO_ATENDIDA',
  }),
  Object.freeze({
    tipo: 'MIRAR_ARMA',
    fasesPermitidas: Object.freeze(['COMBATE']),
    marcadorRejeicao: 'PRECONDICAO_NAO_ATENDIDA',
  }),
  Object.freeze({
    tipo: 'ALTERNAR_VALVULA',
    fasesPermitidas: Object.freeze(['COMBATE']),
    marcadorRejeicao: 'BLOQUEADO_TRAVA_HIDROSTATICA',
  }),
  Object.freeze({
    tipo: 'DRENAR_TUDO',
    fasesPermitidas: Object.freeze(['COMBATE']),
    marcadorRejeicao: 'BLOQUEADO_TRAVA_HIDROSTATICA',
  }),
  Object.freeze({
    tipo: 'ATIVAR_BAIACU',
    fasesPermitidas: Object.freeze(['COMBATE']),
    marcadorRejeicao: 'PRECONDICAO_NAO_ATENDIDA',
  }),
  Object.freeze({
    tipo: 'ATIVAR_PULSO_ENZIMAS',
    fasesPermitidas: Object.freeze(['COMBATE']),
    marcadorRejeicao: 'PRECONDICAO_NAO_ATENDIDA',
  }),
  Object.freeze({
    tipo: 'ATIVAR_TINTA_FURTIVA',
    fasesPermitidas: Object.freeze(['COMBATE']),
    marcadorRejeicao: 'PRECONDICAO_NAO_ATENDIDA',
  }),
  Object.freeze({
    tipo: 'LANCAR_ABORDAGEM',
    fasesPermitidas: Object.freeze(['COMBATE']),
    marcadorRejeicao: 'PRECONDICAO_NAO_ATENDIDA',
  }),
  Object.freeze({
    tipo: 'MERGULHO_TATICO',
    fasesPermitidas: Object.freeze(['COMBATE']),
    marcadorRejeicao: 'REJEITADO_FASE_INVALIDA',
  }),
  Object.freeze({
    tipo: 'SALTO_FUGA',
    fasesPermitidas: Object.freeze(['COMBATE']),
    marcadorRejeicao: 'PRECONDICAO_NAO_ATENDIDA',
  }),
  Object.freeze({
    tipo: 'ESCOLHER_OPCAO_EVENTO',
    fasesPermitidas: Object.freeze(['EVENTO']),
    marcadorRejeicao: 'BLOQUEADO_COMBATE_OBRIGATORIO',
  }),
  Object.freeze({
    tipo: 'COMPRAR_OU_VENDER_LOJA',
    fasesPermitidas: Object.freeze(['LOJA']),
    marcadorRejeicao: 'REJEITADO_FASE_INVALIDA',
  }),
  Object.freeze({
    tipo: 'ENXERTAR_ORGAO',
    fasesPermitidas: Object.freeze(['MAPA', 'LOJA']),
    marcadorRejeicao: 'REJEITADO_FASE_INVALIDA',
  }),
  Object.freeze({
    tipo: 'VIAJAR_NO_MAPA',
    fasesPermitidas: Object.freeze(['MAPA']),
    marcadorRejeicao: 'PRECONDICAO_NAO_ATENDIDA',
  }),
]);

function extrairCarteiraSincronizada(estado) {
  const padrao = { sucata: 30, biomassa: 15, combustivel: 12, municao: 8 };
  const eco = estado.economia ?? {};
  const rec = estado.recursos ?? {};
  const resolverCampo = (chave) => {
    const vEco = eco[chave];
    const vRec = rec[chave];
    if (vEco !== undefined && vRec !== undefined) {
      if (vEco !== padrao[chave]) return Number(vEco);
      if (vRec !== padrao[chave]) return Number(vRec);
      return Number(vEco);
    }
    return Number(vEco ?? vRec ?? padrao[chave]);
  };
  return {
    ...rec,
    ...eco,
    sucata: resolverCampo('sucata'),
    biomassa: resolverCampo('biomassa'),
    combustivel: resolverCampo('combustivel'),
    municao: resolverCampo('municao'),
  };
}

function rejeitarComando(estado, comando, marcadorRejeicao, cueEmitido = null) {
  const novoLog = [
    ...(estado.logDeterministico ?? []),
    {
      tick: estado.meta?.tickAtual ?? 0,
      tempoSeg: estado.meta?.tempoCombateSeg ?? 0,
      tipo: 'COMANDO_REJEITADO',
      comando: comando.tipo,
      marcadorRejeicao,
    },
  ];
  return clonarProfundoCongelado({
    aceito: false,
    marcadorRejeicao,
    cueEmitido,
    estado: {
      ...estado,
      logDeterministico: novoLog,
    },
  });
}

function recalcularFoilEPesoNave(nave) {
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

/**
 * Despacha um comando atômico da UI para o motor real, retornando `{ aceito, marcadorRejeicao, cueEmitido, estado }`.
 */
export function despacharComandoUi(estado, comando) {
  const def = ESQUEMA_15_COMANDOS_85A.find((c) => c.tipo === comando?.tipo);
  if (!def) {
    throw new Error(`Comando desconhecido fora da Seção 8.5.A: "${comando?.tipo}"`);
  }

  const faseAtual = estado.meta?.faseJogo ?? 'COMBATE';
  if (!def.fasesPermitidas.includes(faseAtual)) {
    return rejeitarComando(estado, comando, 'REJEITADO_FASE_INVALIDA');
  }

  const p = comando.payload ?? comando;
  const nave = estado.naveJogador;
  const estadoFisicoAtual =
    nave.estadoVoo && nave.estadoVoo !== '1_NO_FOIL'
      ? nave.estadoVoo
      : (nave.estadoFisico ?? nave.estadoVoo ?? '1_NO_FOIL');

  switch (comando.tipo) {
    case 'ALTERNAR_VALVULA': {
      if (estadoFisicoAtual !== '1_NO_FOIL') {
        return rejeitarComando(estado, comando, 'BLOQUEADO_TRAVA_HIDROSTATICA', 'CUE_TRAVA_HIDROSTATICA');
      }
      if (!(nave.camaras ?? []).some((c) => c.id === p.camaraId)) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      const novoEstado = alternarValvulaExterna(estado, p.camaraId, p.aberta ?? p.abrir);
      return clonarProfundoCongelado({
        aceito: true,
        marcadorRejeicao: null,
        cueEmitido: null,
        estado: novoEstado,
      });
    }

    case 'DRENAR_TUDO': {
      if (estadoFisicoAtual !== '1_NO_FOIL') {
        return rejeitarComando(estado, comando, 'BLOQUEADO_TRAVA_HIDROSTATICA', 'CUE_TRAVA_HIDROSTATICA');
      }
      if (p.modoSeguro === true) {
        const aguaTotalAtual = (nave.camaras ?? []).reduce((acc, c) => acc + Number(c.aguaKg ?? 0), 0);
        if (aguaTotalAtual <= 62.5) {
          const estadoFechado = drenarTodasValvulas(estado, false);
          return clonarProfundoCongelado({
            aceito: true,
            marcadorRejeicao: null,
            cueEmitido: null,
            estado: {
              ...estadoFechado,
              naveJogador: {
                ...estadoFechado.naveJogador,
                drenoSeguroAtivo: false,
              },
            },
          });
        }
        const idsComAquaticos = new Set(
          (nave.tripulacao ?? [])
            .filter(
              (t) =>
                t.localizacao === 'NAVE_JOGADOR' &&
                t.hpAtual > 0 &&
                t.especie !== 'CARANGUEJO'
            )
            .map((t) => t.camaraAtualId)
        );
        const candidatasOrdenadas = [...(nave.camaras ?? [])]
          .filter((c) => Number(c.aguaKg ?? 0) > 0.5)
          .sort((a, b) => {
            const penA = idsComAquaticos.has(a.id) ? 1 : 0;
            const penB = idsComAquaticos.has(b.id) ? 1 : 0;
            if (penA !== penB) return penA - penB;
            return Number(b.aguaKg ?? 0) - Number(a.aguaKg ?? 0);
          });
        let margemParaDrenarKg = Math.max(0, aguaTotalAtual - 62.5);
        const idsAbrirSeguro = new Set();
        for (const camCand of candidatasOrdenadas) {
          if (margemParaDrenarKg <= 0.01) break;
          idsAbrirSeguro.add(camCand.id);
          margemParaDrenarKg -= Number(camCand.aguaKg ?? 0);
        }
        const novasCamarasSeguras = (nave.camaras ?? []).map((c) => ({
          ...c,
          valvulaExternaAberta: idsAbrirSeguro.has(c.id),
        }));
        return clonarProfundoCongelado({
          aceito: true,
          marcadorRejeicao: null,
          cueEmitido: null,
          estado: {
            ...estado,
            naveJogador: {
              ...nave,
              drenoSeguroAtivo: idsAbrirSeguro.size > 0,
              camaras: novasCamarasSeguras,
            },
          },
        });
      }
      const novoEstado = drenarTodasValvulas(estado, p.abrirTodas ?? true);
      return clonarProfundoCongelado({
        aceito: true,
        marcadorRejeicao: null,
        cueEmitido: null,
        estado: {
          ...novoEstado,
          naveJogador: {
            ...novoEstado.naveJogador,
            drenoSeguroAtivo: false,
          },
        },
      });
    }

    case 'ALOCAR_ENERGIA': {
      const camaraId = p.camaraId;
      const deltaBarras = p.deltaBarras ?? p.delta;
      if (![1, -1].includes(deltaBarras)) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      const cam = nave.camaras.find((c) => c.id === camaraId);
      if (!cam) return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      const intBarra = Number(cam.barrasIntegridade ?? cam.integridade ?? 0);
      const ionBarra = Number(cam.barrasIonizadas ?? cam.danoIonizado ?? 0);
      const atualBarra = Number(cam.barrasEnergiaAlocada ?? cam.energiaAlocada ?? 0);
      const novaBarra = atualBarra + deltaBarras;
      const dispReator = Number(nave.reator?.barrasDisponiveis ?? nave.energiaLivre ?? 7);

      if (novaBarra < 0 || novaBarra > intBarra - ionBarra || dispReator - deltaBarras < 0) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }

      const eraNoFoil = estadoFisicoAtual === '1_NO_FOIL';
      const novasCamaras = nave.camaras.map((c) =>
        c.id === camaraId
          ? { ...c, barrasEnergiaAlocada: novaBarra, energiaAlocada: novaBarra }
          : c
      );
      const novaNave = recalcularFoilEPesoNave({
        ...nave,
        reator: {
          ...nave.reator,
          barrasDisponiveis: dispReator - deltaBarras,
        },
        camaras: novasCamaras,
      });
      const caiuParaTouchdown = eraNoFoil && novaNave.estadoFisico === '2_TOUCHDOWN';

      return clonarProfundoCongelado({
        aceito: true,
        marcadorRejeicao: null,
        cueEmitido: caiuParaTouchdown ? 'CUE_ESTOL_TOUCHDOWN' : null,
        estado: {
          ...estado,
          naveJogador: novaNave,
        },
      });
    }

    case 'MOVER_TRIPULANTE': {
      const idTrip = p.tripulanteId ?? p.idTripulante;
      const trip = nave.tripulacao.find((t) => t.id === idTrip);
      const camaraDestinoExiste = (nave.camaras ?? []).some((c) => c.id === p.camaraDestinoId);
      if (
        !trip ||
        trip.localizacao !== 'NAVE_JOGADOR' ||
        trip.inflado ||
        trip.hpAtual <= 0 ||
        trip.vivo === false ||
        !camaraDestinoExiste
      ) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      const aliadosNoDestino = nave.tripulacao.filter(
        (t) =>
          t.localizacao === 'NAVE_JOGADOR' &&
          t.camaraAtualId === p.camaraDestinoId &&
          t.hpAtual > 0 &&
          t.id !== trip.id
      );
      if (aliadosNoDestino.length >= 2) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      const jaNaCamaraDestino = trip.camaraAtualId === p.camaraDestinoId && !trip.camaraDestinoId;
      const novoAcoplado = jaNaCamaraDestino
        ? (p.acopladoBulbo !== undefined ? Boolean(p.acopladoBulbo) : !trip.acopladoBulbo)
        : false;
      return clonarProfundoCongelado({
        aceito: true,
        marcadorRejeicao: null,
        cueEmitido: null,
        estado: {
          ...estado,
          naveJogador: {
            ...nave,
            tripulacao: nave.tripulacao.map((t) =>
              t.id === trip.id
                ? {
                    ...t,
                    camaraDestinoId: jaNaCamaraDestino ? null : p.camaraDestinoId,
                    progressoNadoSeg: jaNaCamaraDestino ? 0.0 : Number(t.progressoNadoSeg ?? 0),
                    acopladoBulbo: novoAcoplado,
                  }
                : t
            ),
          },
        },
      });
    }

    case 'MIRAR_ARMA': {
      const listaArmas = nave.armasAtivas ?? [];
      if (!Number.isInteger(p.slotIndex) || p.slotIndex < 0 || p.slotIndex >= listaArmas.length) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      const slot = listaArmas[p.slotIndex];
      const arma = slot?.arma !== undefined ? slot.arma : slot;
      if (!arma) return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      const custoEne = Number(arma.energiaCusto ?? arma.energia ?? 1);
      const alocadaEne = Number(arma.energiaAlocada ?? custoEne);
      if (alocadaEne < custoEne) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      const idChassi = arma.chassiId ?? arma.idArma ?? arma.id ?? '';
      const ehFeixe = Boolean(arma.ehFeixe) || idChassi === 'CORTADOR_TERMICO_PLASMA' || idChassi === 'CORTADOR_TERMICO';
      const exigeSubmersa = Boolean(arma.exigeSalaSubmersa) || idChassi === 'LANCADOR_TORPEDO_ABISSAL';
      if (ehFeixe && !p.trincaSalasBeam) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      if (p.trincaSalasBeam) {
        const validaQualquerGrafo =
          validarTrincaBeam(p.trincaSalasBeam, GRAFOS_BEAM_CANONICOS.BIONAVE_2X4) ||
          validarTrincaBeam(p.trincaSalasBeam, GRAFOS_BEAM_CANONICOS.BARCO_2X2) ||
          validarTrincaBeam(p.trincaSalasBeam, GRAFOS_BEAM_CANONICOS.MONSTRO_1X4);
        if (!validaQualquerGrafo) {
          return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
        }
      }
      const salasAlvo = estado.alvoCombate?.salasOuOrgaos ?? [];
      if (p.salaAlvoId !== undefined && p.salaAlvoId !== null && salasAlvo.length > 0) {
        const salaAlvo = salasAlvo.find((s) => s.id === p.salaAlvoId);
        if (!salaAlvo || (exigeSubmersa && salaAlvo.submersa === false)) {
          return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
        }
      }
      return clonarProfundoCongelado({
        aceito: true,
        marcadorRejeicao: null,
        cueEmitido: null,
        estado: {
          ...estado,
          naveJogador: {
            ...nave,
            armasAtivas: nave.armasAtivas.map((s, idx) =>
              idx === p.slotIndex
                ? s.arma !== undefined
                  ? { ...s, arma: { ...s.arma, salaAlvoId: p.salaAlvoId, trincaSalasBeam: p.trincaSalasBeam ?? null } }
                  : { ...s, salaAlvoId: p.salaAlvoId, trincaSalasBeam: p.trincaSalasBeam ?? null }
                : s
            ),
          },
        },
      });
    }

    case 'ATIVAR_BAIACU': {
      const trip = nave.tripulacao.find((t) => t.id === p.tripulanteId);
      if (!trip || trip.especie !== 'BAIACU' || trip.localizacao !== 'NAVE_JOGADOR' || trip.hpAtual <= 0) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      const inflado = Boolean(p.inflado);
      return clonarProfundoCongelado({
        aceito: true,
        marcadorRejeicao: null,
        cueEmitido: null,
        estado: {
          ...estado,
          naveJogador: {
            ...nave,
            camaras: nave.camaras.map((c) =>
              c.id === trip.camaraAtualId
                ? { ...c, baiacuInfladoId: inflado ? trip.id : (c.baiacuInfladoId === trip.id ? null : c.baiacuInfladoId) }
                : c
            ),
            tripulacao: nave.tripulacao.map((t) =>
              t.id === trip.id ? { ...t, inflado, acopladoBulbo: inflado ? false : t.acopladoBulbo } : t
            ),
          },
        },
      });
    }

    case 'ATIVAR_PULSO_ENZIMAS': {
      const camBrq = nave.camaras.find((c) => c.id === 3);
      const ionBrq = Math.max(0, Number(camBrq?.danoIonizado ?? camBrq?.barrasIonizadas ?? 0));
      const energiaBrq = Math.max(0, Number(camBrq?.barrasEnergiaAlocada ?? camBrq?.energiaAlocada ?? 0) - ionBrq);
      if (energiaBrq < 2 || (nave.recargaPulsoEnzimasSeg ?? 0) > 0) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      return clonarProfundoCongelado({
        aceito: true,
        marcadorRejeicao: null,
        cueEmitido: null,
        estado: {
          ...estado,
          naveJogador: {
            ...nave,
            pulsoEnzimasAtivoSeg: 6.0,
            recargaPulsoEnzimasSeg: 25.0,
          },
        },
      });
    }

    case 'ATIVAR_TINTA_FURTIVA': {
      const camTinta = nave.camaras.find((c) => c.id === 8);
      const ionTinta = Math.max(0, Number(camTinta?.danoIonizado ?? camTinta?.barrasIonizadas ?? 0));
      const energiaTinta = Math.max(0, Number(camTinta?.barrasEnergiaAlocada ?? camTinta?.energiaAlocada ?? 0) - ionTinta);
      if (energiaTinta < 1 || (nave.recargaFurtividadeSeg ?? 0) > 0) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      const duracao = energiaTinta >= 2 ? 8.0 : 5.0;
      return clonarProfundoCongelado({
        aceito: true,
        marcadorRejeicao: null,
        cueEmitido: null,
        estado: {
          ...estado,
          naveJogador: {
            ...nave,
            furtividadeAtivaSeg: duracao,
            recargaFurtividadeSeg: 20.0,
          },
        },
      });
    }

    case 'LANCAR_ABORDAGEM': {
      const camTubo = nave.camaras.find((c) => c.id === 7);
      const ionTubo = Math.max(0, Number(camTubo?.danoIonizado ?? camTubo?.barrasIonizadas ?? 0));
      const energiaTubo = Math.max(0, Number(camTubo?.barrasEnergiaAlocada ?? camTubo?.energiaAlocada ?? 0) - ionTubo);
      if (
        energiaTubo < 1 ||
        (nave.recargaTuboAbordagemSeg ?? 0) > 0 ||
        !Array.isArray(p.tripulantesIds) ||
        p.tripulantesIds.length < 1 ||
        p.tripulantesIds.length > 2 ||
        new Set(p.tripulantesIds).size !== p.tripulantesIds.length ||
        Number(estado.alvoCombate?.blindagemTermicaExternaPts ?? 0) > 0
      ) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      const todosValidosNaCamara7 = p.tripulantesIds.every((idTrip) => {
        const t = (nave.tripulacao ?? []).find((x) => x.id === idTrip);
        return t && t.hpAtual > 0 && t.localizacao === 'NAVE_JOGADOR' && t.camaraAtualId === 7;
      });
      if (!todosValidosNaCamara7) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      if (
        Array.isArray(estado.alvoCombate?.salasOuOrgaos) &&
        estado.alvoCombate.salasOuOrgaos.length > 0 &&
        !estado.alvoCombate.salasOuOrgaos.some((s) => s.id === p.salaAlvoId)
      ) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      const resAbord = tentarAbordagemContraAlvo(estado, p.tripulantesIds, p.salaAlvoId);
      const recargaTuboSeg = energiaTubo >= 2 ? 9.0 : 14.0;
      return clonarProfundoCongelado({
        aceito: true,
        marcadorRejeicao: null,
        cueEmitido: null,
        estado: {
          ...resAbord.estado,
          naveJogador: {
            ...resAbord.estado.naveJogador,
            recargaTuboAbordagemSeg: recargaTuboSeg,
          },
        },
      });
    }

    case 'MERGULHO_TATICO': {
      const recolherAlvo =
        p.recolherFoil !== undefined ? Boolean(p.recolherFoil) : nave.estadoFisico === '1_NO_FOIL';
      const novoEstado = alternarMergulhoTatico(estado, recolherAlvo);
      const estRes = novoEstado.naveJogador.estadoFisico;
      const cueMergulho =
        estRes === '2_TOUCHDOWN'
          ? 'CUE_ESTOL_TOUCHDOWN'
          : estRes === '3_SPOOL_UP'
            ? 'CUE_SPOOL_UP_DECOLAGEM'
            : null;
      return clonarProfundoCongelado({
        aceito: true,
        marcadorRejeicao: null,
        cueEmitido: cueMergulho,
        estado: novoEstado,
      });
    }

    case 'SALTO_FUGA': {
      const camCtx = nave.camaras.find((c) => c.id === 2);
      const camSif = nave.camaras.find((c) => c.id === 5);
      const ionCtx = Math.max(0, Number(camCtx?.danoIonizado ?? camCtx?.barrasIonizadas ?? 0));
      const ionSif = Math.max(0, Number(camSif?.danoIonizado ?? camSif?.barrasIonizadas ?? 0));
      const ctxInt = Math.max(0, Number(camCtx?.barrasIntegridade ?? camCtx?.integridade ?? 0) - ionCtx);
      const sifEne = Math.max(0, Number(camSif?.barrasEnergiaAlocada ?? camSif?.energiaAlocada ?? 0) - ionSif);
      const baseCarteiraFuga = extrairCarteiraSincronizada(estado);
      const comb = baseCarteiraFuga.combustivel;
      const cargaPronta = (nave.progressoFugaSeg ?? 0) >= 20.0 || (nave.cargaSaltoPct ?? 0) >= 100;
      if (!cargaPronta || ctxInt < 1 || sifEne < 1 || comb < 1) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      const novaCarteira = {
        ...baseCarteiraFuga,
        combustivel: comb - 1,
      };
      return clonarProfundoCongelado({
        aceito: true,
        marcadorRejeicao: null,
        cueEmitido: null,
        estado: {
          ...estado,
          meta: { ...estado.meta, faseJogo: 'MAPA' },
          economia: novaCarteira,
          recursos: novaCarteira,
          naveJogador: {
            ...nave,
            progressoFugaSeg: 0.0,
            tripulacao: nave.tripulacao.filter((t) => t.localizacao !== 'BORDO_INIMIGO'),
          },
          alvoCombate: estado.alvoCombate ? { ...estado.alvoCombate, ativo: false } : null,
        },
      });
    }

    case 'ESCOLHER_OPCAO_EVENTO': {
      if (!['A', 'B', 'C'].includes(p.opcao)) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      const noEvento = p.noMapa ?? { id: 'NO_1_A', tipoNo: p.categoriaEvento ?? 'SOS', idTemplateEvento: p.idEvento, xMn: 50, tPrazoHoras: 10 };
      if (p.opcao === 'C' && (noEvento.tipoNo === 'PERIGO' || String(p.idEvento).startsWith('PER_'))) {
        return rejeitarComando(estado, comando, 'BLOQUEADO_COMBATE_OBRIGATORIO');
      }
      const resVisita = resolverVisitaNoMapa({
        seedPartida: estado.meta?.seedPartida ?? 'seed',
        setorNumero: estado.mapaSetorial?.setorNumero ?? 1,
        relogioSetorHoras: estado.mapaSetorial?.relogioSetorHoras ?? estado.mapaSetorial?.relogioHoras ?? 0,
        noMapa: noEvento,
        kitOuNave: nave,
        opcaoEscolhida: p.opcao,
      });
      if (resVisita.aceito === false) {
        return rejeitarComando(estado, comando, resVisita.marcadorRejeicao ?? 'PRECONDICAO_NAO_ATENDIDA');
      }
      const danoCasco = Number(resVisita.danoCasco ?? 0);
      const reparoHp = Number(resVisita.recompensaBlueOption?.reparaCascoHp ?? 0);
      const novoHpCasco = Math.min(
        nave.hpCascoMax,
        Math.max(0, nave.hpCascoAtual - danoCasco) + reparoHp
      );
      const baseCarteira = extrairCarteiraSincronizada(estado);
      const novaCarteiraEvento = {
        ...baseCarteira,
        sucata: baseCarteira.sucata + Number(resVisita.moedaGerada?.sucata ?? 0),
        biomassa: baseCarteira.biomassa + Number(resVisita.moedaGerada?.biomassa ?? 0),
        combustivel: baseCarteira.combustivel + Number(resVisita.recompensaBlueOption?.combustivel ?? 0),
        municao: baseCarteira.municao + Number(resVisita.recompensaBlueOption?.municao ?? 0),
      };
      const novaFase =
        novoHpCasco <= 0
          ? 'FIM_DE_RUN'
          : resVisita.combateObrigatorio
            ? 'COMBATE'
            : 'MAPA';
      return clonarProfundoCongelado({
        aceito: true,
        marcadorRejeicao: null,
        cueEmitido: null,
        estado: {
          ...estado,
          meta: { ...estado.meta, faseJogo: novaFase },
          economia: novaCarteiraEvento,
          recursos: novaCarteiraEvento,
          naveJogador: {
            ...nave,
            hpCascoAtual: novoHpCasco,
          },
        },
      });
    }

    case 'COMPRAR_OU_VENDER_LOJA': {
      const acao = p.operacao ?? p.acao ?? 'COMPRAR';
      if (acao === 'SAIR_DA_LOJA' || p.itemOuSistemaId === 'SAIR_DA_LOJA') {
        return clonarProfundoCongelado({
          aceito: true,
          marcadorRejeicao: null,
          cueEmitido: null,
          estado: {
            ...estado,
            meta: { ...estado.meta, faseJogo: 'MAPA' },
          },
        });
      }
      if (acao === 'DIGESTAO_ENZIMATICA' || p.itemOuSistemaId === 'DIGESTAO_ENZIMATICA') {
        const baseCartDig = extrairCarteiraSincronizada(estado);
        const origemDig = p.moedaOrigem === 'BIOMASSA' ? 'biomassa' : 'sucata';
        const destinoDig = origemDig === 'sucata' ? 'biomassa' : 'sucata';
        if (baseCartDig[origemDig] < 2) {
          return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
        }
        const novaCartDig = {
          ...baseCartDig,
          [origemDig]: baseCartDig[origemDig] - 2,
          [destinoDig]: baseCartDig[destinoDig] + 1,
        };
        return clonarProfundoCongelado({
          aceito: true,
          marcadorRejeicao: null,
          cueEmitido: null,
          estado: {
            ...estado,
            economia: novaCartDig,
            recursos: novaCartDig,
          },
        });
      }
      const aliasItem = {
        CELULA_COMBUSTIVEL: 'INSUMO_COMBUSTIVEL',
        MUNICAO_TORPEDO_ESPORO: 'INSUMO_MUNICAO',
      }[p.itemOuSistemaId] ?? p.itemOuSistemaId;
      const item = CATALOGO_LOJA_56B.find((i) => i.id === aliasItem);
      if (!item) return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      const chaveMoeda = item.moeda === 'BIOMASSA' ? 'biomassa' : 'sucata';
      const baseCarteira = extrairCarteiraSincronizada(estado);
      let novaCarteiraLoja = { ...baseCarteira };
      let novoHpCascoLoja = nave.hpCascoAtual;
      let novaTripulacaoLoja = nave.tripulacao;
      let novasArmasLoja = nave.armasAtivas ?? [];
      let novoPoraoLoja = [...(nave.poraoCarga ?? [])];
      if (acao === 'VENDER') {
        if ((item.valorVenda ?? 0) <= 0) {
          return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
        }
        const idxArmaAtiva = novasArmasLoja.findIndex(
          (s) => s?.arma && (s.arma.chassiId === item.id || s.arma.idArma === item.id)
        );
        const idxPorao = novoPoraoLoja.findIndex(
          (it) => (it?.item?.id ?? it?.id) === item.id
        );
        if (idxPorao >= 0) {
          novoPoraoLoja = novoPoraoLoja.map((s, idx) =>
            idx === idxPorao ? { ...s, item: null } : s
          );
        } else if (idxArmaAtiva >= 0) {
          novasArmasLoja = novasArmasLoja.map((s, idx) =>
            idx === idxArmaAtiva ? { ...s, arma: null } : s
          );
        } else {
          return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
        }
        novaCarteiraLoja[chaveMoeda] += item.valorVenda;
      } else {
        const setorAtual = estado.mapaSetorial?.setorNumero ?? 1;
        const preco =
          item.categoria === 'REPARO'
            ? (setorAtual <= 3 ? 2 : setorAtual <= 6 ? 3 : 4)
            : item.precoCompra;
        if (novaCarteiraLoja[chaveMoeda] < preco) {
          return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
        }
        if (item.categoria === 'REPARO' && novoHpCascoLoja >= nave.hpCascoMax) {
          return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
        }
        if (item.categoria === 'TRIPULANTE') {
          const vivos = (nave.tripulacao ?? []).filter((t) => t.hpAtual > 0).length;
          if (vivos >= 6) {
            return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
          }
          const especieMap = {
            TRIPULANTE_POLVO: { especie: 'POLVO', hp: 80 },
            TRIPULANTE_ARRAIA: { especie: 'ARRAIA', hp: 70 },
            TRIPULANTE_BAIACU: { especie: 'BAIACU', hp: 150 },
            TRIPULANTE_CARANGUEJO: { especie: 'CARANGUEJO', hp: 110 },
          }[item.id];
          if (especieMap) {
            novaTripulacaoLoja = [
              ...(nave.tripulacao ?? []),
              {
                id: `trip-loja-${(nave.tripulacao ?? []).length + 1}`,
                especie: especieMap.especie,
                hpAtual: especieMap.hp,
                hpMax: especieMap.hp,
                camaraAtualId: 3,
                camaraDestinoId: null,
                progressoNadoSeg: 0.0,
                acopladoBulbo: false,
                inflado: false,
                atordoadoSeg: 0.0,
                localizacao: 'NAVE_JOGADOR',
              },
            ];
          }
        } else if (item.categoria === 'ARMA' || item.categoria === 'ORGAO') {
          const idxLivrePorao = novoPoraoLoja.findIndex((s) => !s?.item);
          if (idxLivrePorao < 0) {
            return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
          }
          novoPoraoLoja = novoPoraoLoja.map((s, idx) =>
            idx === idxLivrePorao
              ? { ...s, item: { id: item.id, tipo: item.categoria, pesoKg: Number(item.pesoKg ?? 5.0) } }
              : s
          );
        }
        novaCarteiraLoja[chaveMoeda] -= preco;
        if (item.id === 'INSUMO_COMBUSTIVEL') novaCarteiraLoja.combustivel += 1;
        if (item.id === 'INSUMO_MUNICAO') novaCarteiraLoja.municao += 1;
        if (item.categoria === 'REPARO') novoHpCascoLoja = Math.min(nave.hpCascoMax, novoHpCascoLoja + 1);
      }
      const navePosLoja = recalcularFoilEPesoNave({
        ...nave,
        hpCascoAtual: novoHpCascoLoja,
        tripulacao: novaTripulacaoLoja,
        armasAtivas: novasArmasLoja,
        poraoCarga: novoPoraoLoja,
      });
      return clonarProfundoCongelado({
        aceito: true,
        marcadorRejeicao: null,
        cueEmitido: null,
        estado: {
          ...estado,
          economia: novaCarteiraLoja,
          recursos: novaCarteiraLoja,
          naveJogador: navePosLoja,
        },
      });
    }

    case 'ENXERTAR_ORGAO': {
      const listaArmasEnx = nave.armasAtivas ?? [];
      if (!Number.isInteger(p.slotIndex) || p.slotIndex < 0 || p.slotIndex >= listaArmasEnx.length) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      const orgao = CATALOGO_ORGAOS_52.find((o) => o.id === p.orgaoId);
      const slot = listaArmasEnx[p.slotIndex];
      const arma = slot?.arma !== undefined ? slot.arma : slot;
      if (!orgao || !arma) return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');

      let novosOrgaos = [...(arma.orgaosEnxertados ?? [])];
      if (p.acao === 'ENCAIXAR') {
        if (novosOrgaos.length >= (arma.soquetesMax ?? arma.soquetes ?? 1)) {
          return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
        }
        novosOrgaos.push(orgao.id);
      } else if (p.acao === 'REMOVER') {
        const idxRemover = novosOrgaos.indexOf(orgao.id);
        if (idxRemover === -1) {
          return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
        }
        novosOrgaos.splice(idxRemover, 1);
      } else {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }

      const penalidadeOrgaosSeg = novosOrgaos.reduce((acc, idOrg) => {
        const specOrg = CATALOGO_ORGAOS_52.find((o) => o.id === idOrg);
        return acc + Number(specOrg?.penalidadeRecargaSeg ?? 0);
      }, 0);

      const novasArmas = nave.armasAtivas.map((s, idx) =>
        idx === p.slotIndex
          ? s.arma !== undefined
            ? { ...s, arma: { ...s.arma, orgaosEnxertados: novosOrgaos, penalidadeOrgaosSeg } }
            : { ...s, orgaosEnxertados: novosOrgaos, penalidadeOrgaosSeg }
          : s
      );
      const novaNave = recalcularFoilEPesoNave({
        ...nave,
        armasAtivas: novasArmas,
      });
      return clonarProfundoCongelado({
        aceito: true,
        marcadorRejeicao: null,
        cueEmitido: null,
        estado: {
          ...estado,
          naveJogador: novaNave,
        },
      });
    }

    case 'VIAJAR_NO_MAPA':
    default: {
      const idNoDestino = p.idNoDestino ?? p.noDestinoId;
      if (!idNoDestino) return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      if (
        Array.isArray(estado.mapaSetorial?.rotas) &&
        estado.mapaSetorial.rotas.length > 0 &&
        !estado.mapaSetorial.rotas.some(
          (r) => r.origemId === estado.mapaSetorial.noAtualId && r.destinoId === idNoDestino
        )
      ) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      const novoEstado = iniciarTravessiaMapa(estado, idNoDestino, p.descartarCargaIds ?? []);
      return clonarProfundoCongelado({
        aceito: true,
        marcadorRejeicao: null,
        cueEmitido: null,
        estado: novoEstado,
      });
    }
  }
}

export const COORDENADAS_GRADE_CAMARAS_16A = Object.freeze({
  1: Object.freeze({ coluna: 0, andar: 0 }),
  7: Object.freeze({ coluna: 1, andar: 0 }),
  2: Object.freeze({ coluna: 0, andar: 1 }),
  3: Object.freeze({ coluna: 1, andar: 1 }),
  4: Object.freeze({ coluna: 0, andar: 2 }),
  5: Object.freeze({ coluna: 1, andar: 2 }),
  6: Object.freeze({ coluna: 0, andar: 3 }),
  8: Object.freeze({ coluna: 1, andar: 3 }),
});

/**
 * Converte coordenadas de tela (ex.: 1920x1080 Full HD com upscale 2x ou janela com letterboxing 16:9)
 * para coordenadas inteiras na grade lógica nativa 960x540 (Seção 8.5.C).
 */
export function converterCoordenadaTelaParaNativa(
  clientX,
  clientY,
  retanguloCanvas = { left: 0, top: 0, width: 1920, height: 1080 }
) {
  const cx = Number(clientX);
  const cy = Number(clientY);
  const left = Number(retanguloCanvas?.left ?? 0);
  const top = Number(retanguloCanvas?.top ?? 0);
  const width = Number(retanguloCanvas?.width ?? 1920);
  const height = Number(retanguloCanvas?.height ?? 1080);

  if (
    !Number.isFinite(cx) ||
    !Number.isFinite(cy) ||
    !Number.isFinite(left) ||
    !Number.isFinite(top) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return clonarProfundoCongelado({
      dentroDoCanvas: false,
      xNativo: 0,
      yNativo: 0,
      escalaHorizontal: 0,
      escalaVertical: 0,
    });
  }

  // Calcula a caixa ativa 16:9 dentro do retângulo (suporta letterboxing horizontal ou vertical)
  const razaoAlvo = 960 / 540;
  const razaoAtual = width / height;
  let larguraUtil = width;
  let alturaUtil = height;
  let offsetX = 0;
  let offsetY = 0;

  if (razaoAtual > razaoAlvo + 1e-6) {
    larguraUtil = height * razaoAlvo;
    offsetX = (width - larguraUtil) / 2;
  } else if (razaoAtual < razaoAlvo - 1e-6) {
    alturaUtil = width / razaoAlvo;
    offsetY = (height - alturaUtil) / 2;
  }

  const relX = cx - left - offsetX;
  const relY = cy - top - offsetY;
  const dentroDoCanvas = relX >= 0 && relX < larguraUtil && relY >= 0 && relY < alturaUtil;
  const xNativo = Math.max(0, Math.min(959, Math.floor((relX / larguraUtil) * 960)));
  const yNativo = Math.max(0, Math.min(539, Math.floor((relY / alturaUtil) * 540)));

  return clonarProfundoCongelado({
    dentroDoCanvas,
    xNativo,
    yNativo,
    escalaHorizontal: Number((larguraUtil / 960).toFixed(4)),
    escalaVertical: Number((alturaUtil / 540).toFixed(4)),
  });
}

/**
 * Gera o mapa imutável de hitboxes na grade nativa 960x540 a partir do ViewModel,
 * 100% alinhado ao pixel (0 px de desvio) com as divisórias e placas de cena Hi-Bit (F1/F2/F3/Draga/Mapa).
 */
export function obterMapaHitboxesNativo(viewModel, opcoesDebug = {}) {
  if (!viewModel || typeof viewModel !== 'object') return Object.freeze([]);
  const desalinhamentoMutacao = opcoesDebug.desalinharHitboxesCenaMutacao === true ? 48 : 0;
  const ehTouchdown = (viewModel.barraSuperior?.estadoFisico ?? '1_NO_FOIL') !== '1_NO_FOIL';
  const classeAlvo = String(viewModel.painelAlvo?.classeAlvo ?? '');
  const ehMonstroAlvo = classeAlvo.includes('MONSTRO');
  const dyCena = !ehTouchdown && ehMonstroAlvo ? -12 : 0;
  const hitboxes = [];

  // 1. Botões da Coluna do Termômetro (painel esquerdo 0..150, y = 40..430 — zero sobreposição AABB)
  hitboxes.push({
    idHitbox: 'BTN_MERGULHO_TATICO',
    tipo: 'BOTAO_TERMOMETRO',
    x: 6 + desalinhamentoMutacao,
    y: 344,
    largura: 138,
    altura: 26,
    metadados: { acao: 'MERGULHO_TATICO', ativoAtual: Boolean(viewModel.termometroSustentacao?.botaoMergulhoTatico?.ativo) },
  });

  hitboxes.push({
    idHitbox: 'BTN_DRENAR_SEGURO',
    tipo: 'BOTAO_TERMOMETRO',
    x: 6 + desalinhamentoMutacao,
    y: 373,
    largura: 138,
    altura: 24,
    metadados: {
      acao: 'DRENAR_SEGURO',
      travadoTouchdown: Boolean(viewModel.termometroSustentacao?.botaoDrenarTudo?.travadoTouchdown),
      limiarCavitacaoKg: 62.5,
    },
  });

  hitboxes.push({
    idHitbox: 'BTN_DRENAR_TUDO',
    tipo: 'BOTAO_TERMOMETRO',
    x: 6 + desalinhamentoMutacao,
    y: 400,
    largura: 138,
    altura: 24,
    metadados: { acao: 'DRENAR_TUDO', travadoTouchdown: Boolean(viewModel.termometroSustentacao?.botaoDrenarTudo?.travadoTouchdown) },
  });

  // 2. As 8 Câmaras (2 colunas x 4 andares) + 8 Válvulas Externas cravadas ao pixel na placa cênica ativa (F1 / F2 / F3)
  const layoutPlacaCamaras = ehTouchdown
    ? {
        xEsq: 338,
        xDir: 438,
        larguraCam: 79,
        xValvEsq: 319,
        xValvDir: 520,
        toposY: [130, 178, 224, 272],
        alturasY: [40, 38, 42, 40],
      }
    : ehMonstroAlvo
      ? {
          xEsq: 378,
          xDir: 466,
          larguraCam: 72,
          xValvEsq: 359,
          xValvDir: 541,
          toposY: [122, 164, 204, 246],
          alturasY: [38, 36, 38, 40],
        }
      : {
          xEsq: 364,
          xDir: 462,
          larguraCam: 77,
          xValvEsq: 345,
          xValvDir: 542,
          toposY: [126, 172, 218, 264],
          alturasY: [42, 42, 43, 44],
        };

  if ((viewModel.faseJogo ?? 'COMBATE') === 'COMBATE') {
    for (const cam of viewModel.camaras ?? []) {
      const coordPadrao = COORDENADAS_GRADE_CAMARAS_16A[cam.id] ?? { coluna: 0, andar: 0 };
      const col = Number(cam.coluna ?? coordPadrao.coluna);
      const andar = Math.max(0, Math.min(3, Number(cam.andar ?? coordPadrao.andar)));
      const xCam = (col === 0 ? layoutPlacaCamaras.xEsq : layoutPlacaCamaras.xDir) + desalinhamentoMutacao;
      const yCam = layoutPlacaCamaras.toposY[andar];
      const larguraCam = layoutPlacaCamaras.larguraCam;
      const alturaCam = layoutPlacaCamaras.alturasY[andar];
      const xValvula = (col === 0 ? layoutPlacaCamaras.xValvEsq : layoutPlacaCamaras.xValvDir) + desalinhamentoMutacao;
      const yValvula = yCam + Math.floor((alturaCam - 20) / 2);

      hitboxes.push({
        idHitbox: `VALVULA_CAMARA_${cam.id}`,
        tipo: 'VALVULA_EXTERNA',
        x: xValvula,
        y: yValvula,
        largura: 16,
        altura: 20,
        metadados: {
          camaraId: cam.id,
          abertaAtual: Boolean(cam.valvulaExternaAberta),
          travadoTouchdown: Boolean(cam.botaoValvulaDesabilitado),
        },
      });

      hitboxes.push({
        idHitbox: `CAMARA_${cam.id}`,
        tipo: 'CAMARA_BIONAVE',
        x: xCam,
        y: yCam,
        largura: larguraCam,
        altura: alturaCam,
        metadados: {
          camaraId: cam.id,
          nome: cam.nome,
          coluna: col,
          andar,
        },
      });
    }
  }

  // 3. Os 8 Sistemas/Subsistemas na Barra Inferior (painel SISTEMAS x = 200..495, y = 430..539)
  (viewModel.caixaSistemas ?? []).forEach((sys, idx) => {
    hitboxes.push({
      idHitbox: `SISTEMA_${sys.sigla}`,
      tipo: 'SISTEMA_RODAPE',
      x: 205 + idx * 36 + desalinhamentoMutacao,
      y: 448,
      largura: 32,
      altura: 80,
      metadados: {
        idSistema: sys.id,
        sigla: sys.sigla,
        camaraId: sys.camaraId,
      },
    });
  });

  // 4. Os 4 Slots de Armas Ativas na Barra Inferior (painel ARMAS x = 497..735, y = 430..539)
  (viewModel.caixaArmas ?? []).forEach((slot, idx) => {
    hitboxes.push({
      idHitbox: `ARMA_SLOT_${idx}`,
      tipo: 'SLOT_ARMA',
      x: 502 + idx * 58 + desalinhamentoMutacao,
      y: 448,
      largura: 55,
      altura: 80,
      metadados: {
        slotIndex: idx,
        ocupado: Boolean(slot.ocupado),
        chassiId: slot.chassiId,
      },
    });
  });

  // 5. Cartões de Tripulação na Barra Inferior (painel TRIPULAÇÃO x = 737..959, y = 430..539, até 6 tripulantes)
  const tripulantesUnicos = [];
  for (const cam of viewModel.camaras ?? []) {
    for (const t of cam.tripulantesPresentes ?? []) {
      tripulantesUnicos.push({ ...t, camaraId: cam.id });
    }
  }
  const nCards = Math.max(1, tripulantesUnicos.length);
  const passoCard = nCards <= 3 ? 71 : Math.floor(216 / nCards);
  const larguraCard = passoCard - 3;
  tripulantesUnicos.forEach((trip, idx) => {
    hitboxes.push({
      idHitbox: `TRIPULANTE_CARD_${trip.id}`,
      tipo: 'CARD_TRIPULANTE',
      x: 742 + idx * passoCard + desalinhamentoMutacao,
      y: 448,
      largura: larguraCard,
      altura: 80,
      metadados: {
        tripulanteId: trip.id,
        especie: trip.especie,
        camaraId: trip.camaraId,
        hpAtual: trip.hpAtual,
        hpMax: trip.hpMax,
        inflado: Boolean(trip.inflado),
      },
    });
  });

  // 6. Salas/Órgãos do Painel do Alvo em COMBATE ou Nós do Mapa em MAPA
  const salasAlvo = viewModel.painelAlvo?.salasInspecionadas ?? [];
  if ((viewModel.faseJogo ?? 'COMBATE') === 'COMBATE' && viewModel.painelAlvo?.presente !== false && salasAlvo.length > 0) {
    if (ehMonstroAlvo) {
      const dyMonstroTd = ehTouchdown ? -108 : 0;
      const CAIXAS_ORGAOS_MONSTRO = [
        { x: 628, y: 220 + dyMonstroTd, w: 80, h: 48 },
        { x: 628, y: 283 + dyMonstroTd, w: 79, h: 40 },
        { x: 628, y: 338 + dyMonstroTd, w: 79, h: 40 },
        { x: 627, y: 384 + dyMonstroTd, w: 80, h: 40 },
      ];
      salasAlvo.forEach((sala, idx) => {
        const cx = CAIXAS_ORGAOS_MONSTRO[idx] ?? { x: 630, y: 220 + dyMonstroTd + idx * 54, w: 73, h: 40 };
        hitboxes.push({
          idHitbox: `SALA_ALVO_${sala.salaId}`,
          tipo: 'SALA_ALVO',
          x: cx.x + desalinhamentoMutacao,
          y: cx.y,
          largura: cx.w,
          altura: cx.h,
          metadados: {
            salaId: sala.salaId,
            nomeSala: sala.nomeSala,
            integridade: Number(sala.integridade ?? sala.barrasIntegridade ?? 1),
            integridadeMax: Number(sala.integridadeMax ?? sala.barrasMax ?? 1),
            submersa: Boolean(sala.submersa),
            canalPermissao: sala.canalPermissao,
            marcadorExplicito: sala.marcadorExplicito,
          },
        });
      });
    } else if (classeAlvo === 'CHEFE_DRAGA' || salasAlvo.length > 4) {
      const secas = salasAlvo.filter((s) => !s.submersa);
      const submersas = salasAlvo.filter((s) => s.submersa);
      for (const sala of salasAlvo) {
        const fila = sala.submersa ? submersas : secas;
        const idxFila = Math.max(0, fila.findIndex((x) => x.salaId === sala.salaId));
        const passoFila = Math.floor(296 / Math.max(1, fila.length));
        const larguraSala = Math.min(92, passoFila - 4);
        hitboxes.push({
          idHitbox: `SALA_ALVO_${sala.salaId}`,
          tipo: 'SALA_ALVO',
          x: 656 + idxFila * passoFila + desalinhamentoMutacao,
          y: sala.submersa ? 338 : 268,
          largura: larguraSala,
          altura: 56,
          metadados: {
            salaId: sala.salaId,
            nomeSala: sala.nomeSala,
            integridade: Number(sala.integridade ?? sala.barrasIntegridade ?? 1),
            integridadeMax: Number(sala.integridadeMax ?? sala.barrasMax ?? 1),
            submersa: Boolean(sala.submersa),
            canalPermissao: sala.canalPermissao,
            marcadorExplicito: sala.marcadorExplicito,
          },
        });
      }
    } else {
      const ocupados = new Set();
      salasAlvo.forEach((sala, idx) => {
        const nome = String(sala.nomeSala ?? '');
        let linArt = sala.submersa ? 1 : 0;
        let colArt = /CABINE|COMANDO|PONTE|MOTOR|MAQUINAS|PROPULSAO/i.test(nome) ? 1 : 0;
        if (ocupados.has(`${colArt},${linArt}`)) {
          colArt = 1 - colArt;
          if (ocupados.has(`${colArt},${linArt}`)) {
            linArt = Math.floor(idx / 2);
            colArt = idx % 2;
          }
        }
        ocupados.add(`${colArt},${linArt}`);
        const geomX = ehTouchdown
          ? (colArt === 0 ? { x: 726, w: 58 } : { x: 788, w: 62 })
          : (colArt === 0 ? { x: 736, w: 58 } : { x: 798, w: 62 });
        const geomY = ehTouchdown
          ? (linArt === 0 ? { y: 165, h: 49 } : { y: 222, h: 36 })
          : (linArt === 0 ? { y: 305, h: 49 } : { y: 362, h: 36 });
        hitboxes.push({
          idHitbox: `SALA_ALVO_${sala.salaId}`,
          tipo: 'SALA_ALVO',
          x: geomX.x + desalinhamentoMutacao,
          y: geomY.y,
          largura: geomX.w,
          altura: geomY.h,
          metadados: {
            salaId: sala.salaId,
            nomeSala: sala.nomeSala,
            integridade: Number(sala.integridade ?? sala.barrasIntegridade ?? 1),
            integridadeMax: Number(sala.integridadeMax ?? sala.barrasMax ?? 1),
            submersa: Boolean(sala.submersa),
            canalPermissao: sala.canalPermissao,
            marcadorExplicito: sala.marcadorExplicito,
          },
        });
      });
    }
  } else if (viewModel.faseJogo === 'MAPA' && Array.isArray(viewModel.mapaSetorialResumo?.nos)) {
    for (const no of viewModel.mapaSetorialResumo.nos) {
      const xNo = Math.round(186 + (Number(no.xMn ?? 0) / 120) * 736) - 10 + desalinhamentoMutacao;
      const yNo = Math.round(84 + (Number(no.yMn ?? 30) / 60) * 310) - 10;
      hitboxes.push({
        idHitbox: `NO_MAPA_${no.id}`,
        tipo: 'NO_MAPA',
        x: xNo,
        y: yNo,
        largura: 20,
        altura: 20,
        metadados: {
          noDestinoId: no.id,
          tipoNo: no.tipo,
        },
      });
    }
  } else if (viewModel.faseJogo === 'LOJA') {
    hitboxes.push({
      idHitbox: 'LOJA_REPARAR_CASCO',
      tipo: 'ACAO_LOJA',
      x: 162 + desalinhamentoMutacao,
      y: 94,
      largura: 224,
      altura: 26,
      metadados: { itemId: 'REPARO_CASCO_1HP', operacao: 'COMPRAR' },
    });
    hitboxes.push({
      idHitbox: 'LOJA_DIGESTAO_SUC_BIO',
      tipo: 'ACAO_LOJA',
      x: 394 + desalinhamentoMutacao,
      y: 94,
      largura: 244,
      altura: 26,
      metadados: { itemId: 'DIGESTAO_ENZIMATICA', operacao: 'DIGESTAO_ENZIMATICA', moedaOrigem: 'SUCATA' },
    });
    hitboxes.push({
      idHitbox: 'BTN_SAIR_LOJA',
      tipo: 'ACAO_LOJA',
      x: 756 + desalinhamentoMutacao,
      y: 94,
      largura: 190,
      altura: 26,
      metadados: { itemId: 'SAIR_DA_LOJA', operacao: 'SAIR_DA_LOJA' },
    });
    const ofertasLoja =
      Array.isArray(viewModel.lojaResumo?.ofertas) && viewModel.lojaResumo.ofertas.length > 0
        ? viewModel.lojaResumo.ofertas
        : CATALOGO_LOJA_56B.filter((i) => i.categoria !== 'REPARO').slice(0, 8);
    ofertasLoja.slice(0, 8).forEach((item, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      hitboxes.push({
        idHitbox: `LOJA_ITEM_${item.id}`,
        tipo: 'ITEM_LOJA',
        x: 162 + col * 198 + desalinhamentoMutacao,
        y: 125 + row * 138,
        largura: 192,
        altura: 132,
        metadados: {
          itemId: item.id,
          nomeCurto: item.nomeCurto ?? item.nome ?? item.id,
          resumoCurto: item.resumoCurto ?? '',
          categoria: item.categoria,
          preco: Number(item.preco ?? item.precoCompra ?? 10),
          valorVenda: Number(item.valorVenda ?? 0),
          pesoKg: Number(item.pesoKg ?? 0),
          moeda: item.moeda ?? 'SUCATA',
        },
      });
    });
  } else if (viewModel.faseJogo === 'EVENTO') {
    const opcoesEv =
      Array.isArray(viewModel.eventoResumo?.opcoes) && viewModel.eventoResumo.opcoes.length > 0
        ? viewModel.eventoResumo.opcoes
        : [
            { codigo: 'A', rotulo: '[A] ABORDAGEM PADRÃO', detalhe: '' },
            { codigo: 'B', rotulo: '[B] OPÇÃO SIMBIÓTICA (AZUL)', detalhe: '', azul: true },
            { codigo: 'C', rotulo: '[C] RECUAR COM CAUTELA', detalhe: '' },
          ];
    opcoesEv.slice(0, 3).forEach((op, idx) => {
      hitboxes.push({
        idHitbox: `EVENTO_OPCAO_${op.codigo}`,
        tipo: 'OPCAO_EVENTO',
        x: 168 + desalinhamentoMutacao,
        y: 242 + idx * 50,
        largura: 774,
        altura: 44,
        metadados: {
          opcao: op.codigo,
          rotulo: op.rotulo ?? `[${op.codigo}]`,
          detalhe: op.detalhe ?? '',
          azul: Boolean(op.azul),
          bloqueada: Boolean(op.bloqueada),
          idEvento: viewModel.eventoResumo?.idEvento ?? 'SOS_01',
          categoriaEvento: viewModel.eventoResumo?.categoria ?? 'SOS',
        },
      });
    });
  }

  return clonarProfundoCongelado(hitboxes);
}

/**
 * Calcula a Pré-Visualização Fantasma (Ghost Preview — Seção 2.1 + GD-2 Limiar de Cavitação 62.5 kg) no Termômetro Vertical
 * ao passar o mouse sobre válvulas externas, botão Dreno Seguro, botão Drenar Tudo ou barra de energia do Sifão.
 */
export function calcularGhostPreviewTermometro(estado, idHitboxHover = null, opcoesDebug = {}) {
  const nave = estado.naveJogador;
  const ehTouchdown = nave.estadoFisico !== '1_NO_FOIL';
  const pesoAtualKg = calcularPesoTotalNave(nave);
  const sustentacaoAtualKg = calcularSustentacaoFoil(nave);
  const aguaAtualKg =
    Math.round((nave.camaras ?? []).reduce((acc, c) => acc + Number(c.aguaKg ?? 0), 0) * 100) / 100;

  const ehValvulaHover = typeof idHitboxHover === 'string' && idHitboxHover.startsWith('VALVULA_CAMARA_');
  const ehHitboxGhost =
    idHitboxHover === 'SISTEMA_SIF' ||
    idHitboxHover === 'BTN_MERGULHO_TATICO' ||
    idHitboxHover === 'BTN_DRENAR_TUDO' ||
    idHitboxHover === 'BTN_DRENAR_SEGURO' ||
    ehValvulaHover;

  if (!ehHitboxGhost) {
    return clonarProfundoCongelado({
      ativo: false,
      alvoHover: null,
      aguaAtualKg,
      aguaProjetadaKg: aguaAtualKg,
      entrariaEmCavitacao: aguaAtualKg < 62.5,
      perdaSustentacaoCavitacaoKg: aguaAtualKg < 62.5 ? Math.round((62.5 - aguaAtualKg) * 2 * 100) / 100 : 0,
      pesoProjetadoKg: pesoAtualKg,
      sustentacaoProjetadaKg: sustentacaoAtualKg,
      causariaQuedaNoMar: false,
      travadoHidrostatico: false,
      rotuloFantasma: null,
    });
  }

  // Trava Hidrostática (Lei 2C): em 2_TOUCHDOWN / 3_SPOOL_UP, escotilhas externas e botões de dreno NÃO expulsam água!
  const travadoHidrostatico =
    ehTouchdown &&
    (idHitboxHover === 'BTN_DRENAR_SEGURO' || idHitboxHover === 'BTN_DRENAR_TUDO' || ehValvulaHover);

  if (travadoHidrostatico) {
    return clonarProfundoCongelado({
      ativo: true,
      alvoHover: idHitboxHover,
      aguaAtualKg,
      aguaProjetadaKg: aguaAtualKg,
      entrariaEmCavitacao: aguaAtualKg < 62.5,
      perdaSustentacaoCavitacaoKg: aguaAtualKg < 62.5 ? Math.round((62.5 - aguaAtualKg) * 2 * 100) / 100 : 0,
      pesoProjetadoKg: Math.round(pesoAtualKg * 100) / 100,
      sustentacaoProjetadaKg: Math.round(sustentacaoAtualKg * 100) / 100,
      causariaQuedaNoMar: false,
      travadoHidrostatico: true,
      rotuloFantasma: '[TRAVA HIDROSTÁTICA]',
    });
  }

  if (idHitboxHover === 'BTN_MERGULHO_TATICO') {
    const naveFoilSim = { ...nave, estadoFisico: ehTouchdown ? '1_NO_FOIL' : '2_TOUCHDOWN' };
    const sustProjM = calcularSustentacaoFoil(naveFoilSim);
    const quedaM = !ehTouchdown || pesoAtualKg > sustProjM;
    return clonarProfundoCongelado({
      ativo: true,
      alvoHover: idHitboxHover,
      aguaAtualKg,
      aguaProjetadaKg: aguaAtualKg,
      entrariaEmCavitacao: aguaAtualKg < 62.5,
      perdaSustentacaoCavitacaoKg: aguaAtualKg < 62.5 ? Math.round((62.5 - aguaAtualKg) * 2 * 100) / 100 : 0,
      pesoProjetadoKg: Math.round(pesoAtualKg * 100) / 100,
      sustentacaoProjetadaKg: Math.round(sustProjM * 100) / 100,
      causariaQuedaNoMar: quedaM,
      travadoHidrostatico: false,
      rotuloFantasma: ehTouchdown
        ? (pesoAtualKg <= sustProjM ? '[EMERGIR -> FOIL]' : '[PESADO DEMAIS!]')
        : '[MERGULHO -> MAR]',
    });
  }

  let naveSimulada = nave;
  if (idHitboxHover === 'SISTEMA_SIF') {
    const camSif = nave.camaras.find((c) => c.id === 5);
    const barraAtu = Number(camSif?.barrasEnergiaAlocada ?? camSif?.energiaAlocada ?? 0);
    const novaBarra = Math.max(0, barraAtu - 1);
    naveSimulada = {
      ...nave,
      camaras: nave.camaras.map((c) =>
        c.id === 5 ? { ...c, barrasEnergiaAlocada: novaBarra, energiaAlocada: novaBarra } : c
      ),
    };
  } else if (idHitboxHover === 'BTN_DRENAR_SEGURO') {
    let excedente = Math.max(0, aguaAtualKg - 62.5);
    const camComTripSecoVuln = new Set(
      (nave.tripulacao ?? [])
        .filter((t) => t.localizacao === 'NAVE_JOGADOR' && t.hpAtual > 0 && t.especie !== 'CARANGUEJO')
        .map((t) => t.camaraAtualId)
    );
    const prioridadeIds = [
      ...nave.camaras.filter((c) => !camComTripSecoVuln.has(c.id)).map((c) => c.id),
      ...nave.camaras.filter((c) => camComTripSecoVuln.has(c.id)).map((c) => c.id),
    ];
    const mapaReducao = new Map();
    for (const idC of prioridadeIds) {
      if (excedente <= 0) break;
      const camRef = nave.camaras.find((c) => c.id === idC);
      const disp = Number(camRef?.aguaKg ?? 0);
      const drena = Math.min(disp, excedente);
      mapaReducao.set(idC, drena);
      excedente = Math.round((excedente - drena) * 100) / 100;
    }
    naveSimulada = {
      ...nave,
      camaras: nave.camaras.map((c) => ({
        ...c,
        aguaKg: Math.max(0, Math.round((Number(c.aguaKg ?? 0) - (mapaReducao.get(c.id) ?? 0)) * 100) / 100),
      })),
    };
  } else if (idHitboxHover === 'BTN_DRENAR_TUDO') {
    naveSimulada = {
      ...nave,
      camaras: nave.camaras.map((c) => ({ ...c, aguaKg: 0.0 })),
    };
  } else {
    const idCam = Number(idHitboxHover.replace('VALVULA_CAMARA_', ''));
    naveSimulada = {
      ...nave,
      camaras: nave.camaras.map((c) => (c.id === idCam ? { ...c, aguaKg: 0.0 } : c)),
    };
  }

  const aguaProjetadaKg =
    Math.round((naveSimulada.camaras ?? []).reduce((acc, c) => acc + Number(c.aguaKg ?? 0), 0) * 100) / 100;
  const entrariaEmCavitacao =
    opcoesDebug.ocultarAlertaCavitacaoGhostMutacao === true ? false : aguaProjetadaKg < 62.5;
  const perdaSustentacaoCavitacaoKg = entrariaEmCavitacao
    ? Math.round((62.5 - aguaProjetadaKg) * 2 * 100) / 100
    : 0;
  const pesoProjetadoKg = calcularPesoTotalNave(naveSimulada);
  const sustentacaoProjetadaKg = calcularSustentacaoFoil(naveSimulada);
  const causariaQuedaNoMar =
    !ehTouchdown && pesoProjetadoKg > sustentacaoProjetadaKg;

  const rotuloFantasma =
    ehTouchdown
      ? '[EM TOUCHDOWN]'
      : causariaQuedaNoMar && entrariaEmCavitacao
        ? '[CAVITAÇÃO -> QUEDA]'
        : entrariaEmCavitacao
          ? `[CAVITAÇÃO -${Math.round(perdaSustentacaoCavitacaoKg)}kg]`
          : causariaQuedaNoMar
            ? '[QUEDA NO MAR]'
            : idHitboxHover === 'BTN_DRENAR_SEGURO'
              ? '[SEGURO >=63kg]'
              : '[ESTÁVEL NO FOIL]';

  return clonarProfundoCongelado({
    ativo: true,
    alvoHover: idHitboxHover,
    aguaAtualKg,
    aguaProjetadaKg,
    entrariaEmCavitacao,
    perdaSustentacaoCavitacaoKg,
    pesoProjetadoKg: Math.round(pesoProjetadoKg * 100) / 100,
    sustentacaoProjetadaKg: Math.round(sustentacaoProjetadaKg * 100) / 100,
    causariaQuedaNoMar,
    travadoHidrostatico: false,
    rotuloFantasma,
  });
}

/**
 * Traduz um evento DOM (teclado, hover ou clique de mouse no Canvas 16:9) num comando atômico da Seção 8.5.A
 * ou ação de interface (pausa tática / seleção / Ghost Preview) e opcionalmente despacha no motor real.
 */
export function traduzirInputDomParaComandoUi(eventoInput, estado, viewModel, contextoUi = {}) {
  const tipoEvento = eventoInput?.tipoEvento ?? 'CLICK';
  const todasAbertas = (estado.naveJogador?.camaras ?? []).every((c) => c.valvulaExternaAberta);
  const faseAtual = estado.meta?.faseJogo ?? viewModel?.faseJogo ?? 'COMBATE';

  if (tipoEvento === 'KEYDOWN') {
    const code = String(eventoInput.code ?? '');
    if (code === 'Space') {
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: 'ALTERNAR_PAUSA_TATICA',
        pausaTaticaAtiva: !contextoUi.pausaTaticaAtiva,
        comandoMotor: null,
        resultadoMotor: null,
      });
    }
    if (faseAtual === 'EVENTO' && (code === 'KeyA' || code === 'KeyB' || code === 'KeyC')) {
      const opcao = code.replace('Key', '');
      const comandoMotor = {
        tipo: 'ESCOLHER_OPCAO_EVENTO',
        payload: {
          opcao,
          idEvento: viewModel?.eventoResumo?.idEvento ?? 'SOS_01',
          categoriaEvento: viewModel?.eventoResumo?.categoria ?? 'SOS',
        },
      };
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: null,
        comandoMotor,
        resultadoMotor: despacharComandoUi(estado, comandoMotor),
      });
    }
    if (code === 'KeyD') {
      const comandoMotor = { tipo: 'DRENAR_TUDO', payload: { modoSeguro: true } };
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: null,
        comandoMotor,
        resultadoMotor: despacharComandoUi(estado, comandoMotor),
      });
    }
    if (code === 'KeyB') {
      const camBrq = (estado.naveJogador?.camaras ?? []).find((c) => c.id === 3);
      const barrasLivres = Number(estado.naveJogador?.reator?.barrasDisponiveis ?? 0);
      const brqAloc = Number(camBrq?.barrasEnergiaAlocada ?? camBrq?.energiaAlocada ?? 0);
      const brqInt = Number(camBrq?.barrasIntegridade ?? camBrq?.integridade ?? 1);
      if (eventoInput.shiftKey === true && brqAloc > 0) {
        const comandoMotor = { tipo: 'ALOCAR_ENERGIA', payload: { camaraId: 3, deltaBarras: -1 } };
        return clonarProfundoCongelado({
          reconhecido: true,
          acaoLocalUi: null,
          comandoMotor,
          resultadoMotor: despacharComandoUi(estado, comandoMotor),
        });
      }
      if (barrasLivres === 0 && brqAloc < brqInt) {
        const doadora = [8, 7, 4, 1, 5]
          .map((idC) => (estado.naveJogador?.camaras ?? []).find((c) => c.id === idC))
          .find((c) => c && Number(c.barrasEnergiaAlocada ?? c.energiaAlocada ?? 0) >= 1);
        if (doadora) {
          const passo1 = despacharComandoUi(estado, {
            tipo: 'ALOCAR_ENERGIA',
            payload: { camaraId: doadora.id, deltaBarras: -1 },
          });
          const comandoMotor = { tipo: 'ALOCAR_ENERGIA', payload: { camaraId: 3, deltaBarras: 1 } };
          const passo2 = passo1.aceito ? despacharComandoUi(passo1.estado, comandoMotor) : passo1;
          return clonarProfundoCongelado({
            reconhecido: true,
            acaoLocalUi: null,
            comandoMotor,
            resultadoMotor: passo2,
          });
        }
      }
      const comandoMotor = { tipo: 'ALOCAR_ENERGIA', payload: { camaraId: 3, deltaBarras: 1 } };
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: null,
        comandoMotor,
        resultadoMotor: despacharComandoUi(estado, comandoMotor),
      });
    }
    if (code === 'KeyV') {
      const comandoMotor = { tipo: 'DRENAR_TUDO', payload: { abrirTodas: !todasAbertas } };
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: null,
        comandoMotor,
        resultadoMotor: despacharComandoUi(estado, comandoMotor),
      });
    }
    if (code === 'KeyM') {
      const recolher = estado.naveJogador?.estadoFisico === '1_NO_FOIL';
      const comandoMotor = { tipo: 'MERGULHO_TATICO', payload: { recolherFoil: recolher } };
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: null,
        comandoMotor,
        resultadoMotor: despacharComandoUi(estado, comandoMotor),
      });
    }
    if (code === 'KeyF') {
      const comandoMotor = { tipo: 'SALTO_FUGA', payload: {} };
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: null,
        comandoMotor,
        resultadoMotor: despacharComandoUi(estado, comandoMotor),
      });
    }
    if (code === 'KeyP') {
      const tripulacaoViva = (estado.naveJogador?.tripulacao ?? []).filter(
        (t) => t.localizacao === 'NAVE_JOGADOR' && t.hpAtual > 0 && t.especie === 'BAIACU'
      );
      const baiacuAlvo =
        tripulacaoViva.find((t) => t.id === contextoUi.tripulanteSelecionadoId) ?? tripulacaoViva[0] ?? null;
      const comandoMotor = {
        tipo: 'ATIVAR_BAIACU',
        payload: {
          tripulanteId: baiacuAlvo?.id ?? 'trip-baiacu-1',
          inflado: !(baiacuAlvo?.inflado),
        },
      };
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: null,
        comandoMotor,
        resultadoMotor: despacharComandoUi(estado, comandoMotor),
      });
    }
    if (code === 'KeyE') {
      const comandoMotor = { tipo: 'ATIVAR_PULSO_ENZIMAS', payload: {} };
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: null,
        comandoMotor,
        resultadoMotor: despacharComandoUi(estado, comandoMotor),
      });
    }
    if (code === 'KeyT') {
      const comandoMotor = { tipo: 'ATIVAR_TINTA_FURTIVA', payload: {} };
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: null,
        comandoMotor,
        resultadoMotor: despacharComandoUi(estado, comandoMotor),
      });
    }
    const mDigito = code.match(/^Digit([1-4])$/);
    if (mDigito) {
      const slotIndex = Number(mDigito[1]) - 1;
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: 'SELECIONAR_SLOT_ARMA',
        slotArmaSelecionado: slotIndex,
        comandoMotor: null,
        resultadoMotor: null,
      });
    }
    return clonarProfundoCongelado({
      reconhecido: false,
      acaoLocalUi: null,
      comandoMotor: null,
      resultadoMotor: null,
    });
  }

  const coord = converterCoordenadaTelaParaNativa(
    eventoInput?.clientX ?? 0,
    eventoInput?.clientY ?? 0,
    eventoInput?.retanguloCanvas
  );
  if (!coord.dentroDoCanvas) {
    return clonarProfundoCongelado({
      reconhecido: false,
      foraDoCanvas: true,
      coordenadaNativa: coord,
      comandoMotor: null,
      resultadoMotor: null,
    });
  }

  const hitboxes = obterMapaHitboxesNativo(viewModel);
  const hb = hitboxes.find(
    (h) =>
      coord.xNativo >= h.x &&
      coord.xNativo < h.x + h.largura &&
      coord.yNativo >= h.y &&
      coord.yNativo < h.y + h.altura
  );

  if (tipoEvento === 'MOUSEMOVE') {
    const ghostPreview = calcularGhostPreviewTermometro(estado, hb?.idHitbox ?? null);
    return clonarProfundoCongelado({
      reconhecido: Boolean(hb),
      foraDoCanvas: false,
      hitboxAtingida: hb?.idHitbox ?? null,
      acaoLocalUi: 'ATUALIZAR_GHOST_PREVIEW',
      ghostPreview,
      coordenadaNativa: coord,
      comandoMotor: null,
      resultadoMotor: null,
    });
  }

  if (!hb) {
    return clonarProfundoCongelado({
      reconhecido: false,
      foraDoCanvas: false,
      coordenadaNativa: coord,
      comandoMotor: null,
      resultadoMotor: null,
    });
  }

  const botaoMouse = eventoInput.botaoMouse ?? eventoInput.button ?? 0;
  let comandoMotor = null;
  if (hb.idHitbox === 'BTN_DRENAR_SEGURO') {
    comandoMotor = { tipo: 'DRENAR_TUDO', payload: { modoSeguro: true } };
  } else if (hb.idHitbox === 'BTN_DRENAR_TUDO') {
    comandoMotor = { tipo: 'DRENAR_TUDO', payload: { abrirTodas: !todasAbertas } };
  } else if (hb.idHitbox === 'BTN_MERGULHO_TATICO') {
    const recolher = estado.naveJogador?.estadoFisico === '1_NO_FOIL';
    comandoMotor = { tipo: 'MERGULHO_TATICO', payload: { recolherFoil: recolher } };
  } else if (hb.tipo === 'ACAO_LOJA') {
    if (hb.idHitbox === 'LOJA_DIGESTAO_SUC_BIO') {
      const moedaOrigem = botaoMouse === 2 || eventoInput.shiftKey === true ? 'BIOMASSA' : 'SUCATA';
      comandoMotor = {
        tipo: 'COMPRAR_OU_VENDER_LOJA',
        payload: { itemOuSistemaId: 'DIGESTAO_ENZIMATICA', operacao: 'DIGESTAO_ENZIMATICA', moedaOrigem },
      };
    } else {
      comandoMotor = {
        tipo: 'COMPRAR_OU_VENDER_LOJA',
        payload: { itemOuSistemaId: hb.metadados.itemId, operacao: hb.metadados.operacao },
      };
    }
  } else if (hb.tipo === 'ITEM_LOJA') {
    const operacao = botaoMouse === 2 || eventoInput.shiftKey === true ? 'VENDER' : 'COMPRAR';
    comandoMotor = {
      tipo: 'COMPRAR_OU_VENDER_LOJA',
      payload: { itemOuSistemaId: hb.metadados.itemId, operacao },
    };
  } else if (hb.tipo === 'OPCAO_EVENTO') {
    comandoMotor = {
      tipo: 'ESCOLHER_OPCAO_EVENTO',
      payload: {
        opcao: hb.metadados.opcao,
        idEvento: hb.metadados.idEvento,
        categoriaEvento: hb.metadados.categoriaEvento,
      },
    };
  } else if (hb.tipo === 'VALVULA_EXTERNA') {
    comandoMotor = {
      tipo: 'ALTERNAR_VALVULA',
      payload: { camaraId: hb.metadados.camaraId, aberta: !hb.metadados.abertaAtual },
    };
  } else if (hb.tipo === 'SISTEMA_RODAPE') {
    const deltaBarras = botaoMouse === 2 || eventoInput.shiftKey === true ? -1 : 1;
    comandoMotor = {
      tipo: 'ALOCAR_ENERGIA',
      payload: { camaraId: hb.metadados.camaraId, deltaBarras },
    };
  } else if (hb.tipo === 'CARD_TRIPULANTE') {
    if ((botaoMouse === 2 || eventoInput.shiftKey === true) && hb.metadados.especie === 'BAIACU') {
      comandoMotor = {
        tipo: 'ATIVAR_BAIACU',
        payload: { tripulanteId: hb.metadados.tripulanteId, inflado: !hb.metadados.inflado },
      };
    } else {
      return clonarProfundoCongelado({
        reconhecido: true,
        hitboxAtingida: hb.idHitbox,
        acaoLocalUi: 'SELECIONAR_TRIPULANTE',
        tripulanteSelecionadoId: hb.metadados.tripulanteId,
        coordenadaNativa: coord,
        comandoMotor: null,
        resultadoMotor: null,
      });
    }
  } else if (hb.tipo === 'CAMARA_BIONAVE') {
    const tripulanteSelecionadoId =
      contextoUi.tripulanteSelecionadoId ?? estado.naveJogador?.tripulacao?.[0]?.id ?? 'trip-polvo-1';
    const tripObj = (estado.naveJogador?.tripulacao ?? []).find((t) => t.id === tripulanteSelecionadoId);
    comandoMotor = {
      tipo: 'MOVER_TRIPULANTE',
      payload: {
        tripulanteId: tripulanteSelecionadoId,
        camaraDestinoId: hb.metadados.camaraId,
        ...(eventoInput.shiftKey === true ? { acopladoBulbo: !(tripObj?.acopladoBulbo) } : {}),
      },
    };
  } else if (hb.tipo === 'SALA_ALVO') {
    const slotIndex = Number(contextoUi.slotArmaSelecionado ?? 0);
    comandoMotor = {
      tipo: 'MIRAR_ARMA',
      payload: {
        slotIndex,
        salaAlvoId: hb.metadados.salaId,
        ...(contextoUi.trincaSalasBeam ? { trincaSalasBeam: contextoUi.trincaSalasBeam } : {}),
      },
    };
  } else if (hb.tipo === 'NO_MAPA') {
    comandoMotor = {
      tipo: 'VIAJAR_NO_MAPA',
      payload: {
        idNoDestino: hb.metadados.noDestinoId,
        noDestinoId: hb.metadados.noDestinoId,
      },
    };
  } else {
    return clonarProfundoCongelado({
      reconhecido: true,
      hitboxAtingida: hb.idHitbox,
      acaoLocalUi: 'SELECIONAR_SLOT_ARMA',
      slotArmaSelecionado: hb.metadados.slotIndex,
      coordenadaNativa: coord,
      comandoMotor: null,
      resultadoMotor: null,
    });
  }

  return clonarProfundoCongelado({
    reconhecido: true,
    hitboxAtingida: hb.idHitbox,
    acaoLocalUi: null,
    coordenadaNativa: coord,
    comandoMotor,
    resultadoMotor: despacharComandoUi(estado, comandoMotor),
  });
}

function aplicarDanoEmCamaraJogador(nave, camaraAlvoId, danoCasco, danoSistema, abreRombo = false) {
  nave.hpCascoAtual = Math.max(0, Number(nave.hpCascoAtual ?? 0) - danoCasco);
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
    }
    for (const t of nave.tripulacao ?? []) {
      if (t.localizacao === 'NAVE_JOGADOR' && t.camaraAtualId === cam.id && t.hpAtual > 0) {
        t.hpAtual = Math.max(0, t.hpAtual - 15 * danoSistema);
      }
    }
  }
  if (abreRombo) {
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
}

/**
 * Avança 1 tick completo de partida em tempo real (Onda 1 + Onda 2 + Onda 3 + Onda 5):
 * resolve disparos das 7 armas dorsais do jogador (com PRNG de esquiva inimiga, trincas Beam e Blindagem Térmica)
 * e fogo de retorno determinístico de Barcos Humanos, Monstros Marinhos e Draga Continental.
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
        const nRecalc = recalcularFoilEPesoNave(naveBio);
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
            cloneBio.naveJogador = recalcularFoilEPesoNave(nAtu);
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
    const temAlvo =
      (arma.salaAlvoId !== null && arma.salaAlvoId !== undefined) ||
      (Array.isArray(arma.trincaSalasBeam) && arma.trincaSalasBeam.length > 0);
    if (!temAlvo || Number(arma.progressoRecargaSeg ?? 0) < Number(arma.tempoRecargaBaseSeg ?? 9)) {
      continue;
    }

    const chassiDisparo = arma.chassiId ?? arma.id;
    const spec51 = CATALOGO_ARMAS_51.find((a) => a.id === chassiDisparo) ?? null;
    const custoMun = Number(arma.municaoCusto ?? spec51?.municao ?? 0);
    const munAtual = Number(estadoAtual.economia?.municao ?? estadoAtual.recursos?.municao ?? 0);
    if (custoMun > 0 && munAtual < custoMun) {
      continue;
    }

    // Consome munição da salva e reseta o timer da arma
    {
      const clonePre = structuredClone(estadoAtual);
      if (custoMun > 0) {
        if (clonePre.economia) clonePre.economia.municao = Math.max(0, munAtual - custoMun);
        if (clonePre.recursos) clonePre.recursos.municao = Math.max(0, munAtual - custoMun);
      }
      const sClone = clonePre.naveJogador.armasAtivas[idxSlot];
      (sClone?.arma ?? sClone).progressoRecargaSeg = 0.0;
      estadoAtual = congelarProfundo(clonePre);
    }

    const danoCascoBase = arma.danoCasco ?? spec51?.danoCasco ?? 1;
    const danoSistemaBase = arma.danoSistema ?? spec51?.danoSistema ?? 1;
    const ignoraBarreira = Boolean(spec51?.ignoraBarreira) || custoMun > 0;
    const abreRombo = Number(arma.chanceFuroPct ?? spec51?.chanceFuroPct ?? 0) > 0;

    if (spec51?.ehFeixe) {
      const salasFeixe =
        Array.isArray(arma.trincaSalasBeam) && arma.trincaSalasBeam.length > 0
          ? arma.trincaSalasBeam
          : [arma.salaAlvoId];
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
        for (const [kSala, idSalaBeam] of salasFeixe.entries()) {
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
              cBlind.alvoCombate.blindagemTermicaExternaPts - (kSala === 0 ? danoCascoBase : 1)
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
              danoCasco: kSala === 0 ? danoCascoBase : 0,
              danoSistema: 1,
              abreRombo: false,
              municaoCusto: 0,
              orgaosEnxertados: arma.orgaosEnxertados ?? [],
            });
            emitirEventoVisual({
              tipo: 'IMPACTO_ALVO',
              salaAlvoId: idSalaBeam,
              dano: kSala === 0 ? danoCascoBase : 1,
              texto: kSala === 0 && danoCascoBase > 0 ? `-${danoCascoBase}` : '-1 SYS',
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
            ? /SIFAO/i.test(s.nome)
            : /MOTOR|MAQUINAS|PROPULSAO|BROCA/i.test(s.nome)
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
        // GD-3: Carapaça Reflexa da Teuthis Couraçada (bloqueia spam no Gânglio, mas estilhaça se atingir Tentáculos/Bico!)
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

  // 2. Avança IA/ Hidráulica Inimiga ou Mecânicas da Draga Continental
  if (estadoAtual.alvoCombate && estadoAtual.alvoCombate.ativo !== false) {
    if (estadoAtual.alvoCombate.faseChefe) {
      estadoAtual = avancarTickChefeDraga(estadoAtual, dtSeg);
    } else {
      estadoAtual = avancarTickIaInimiga(estadoAtual, dtSeg);
    }
  }

  // 3. Fogo de Retorno Determinístico + GD-3 Contragolpe Tático de Meio de Luta (Anti-Piloto Automático)
  if (
    !opcoesDebug.suprimirAtaqueInimigoMutacao &&
    estadoAtual.alvoCombate &&
    estadoAtual.alvoCombate.ativo !== false &&
    estadoAtual.alvoCombate.hpCascoAtual > 0
  ) {
    const cloneAtk = structuredClone(estadoAtual);
    const alvo = cloneAtk.alvoCombate;
    const nave = cloneAtk.naveJogador;
    const classe = alvo.classeAlvo ?? alvo.classeInimigo ?? 'BARCO_HUMANO';
    const setor = Math.max(1, Number(alvo.setorNumero ?? cloneAtk.mapaSetorial?.setorNumero ?? 1));
    const tripAlvo = alvo.tripulacaoInimiga ?? (alvo.salasOuOrgaos ?? []).flatMap((s) => s.tripulantes ?? []);
    const ganglio = (alvo.salasOuOrgaos ?? []).find((s) => s.ehGanglioCentral || /GANGLIO/i.test(s.nome));
    const inimigoOperante =
      classe === 'MONSTRO_MARINHO'
        ? Number(ganglio?.integridadeAtual ?? ganglio?.integridade ?? 1) > 0
        : tripAlvo.some((t) => t.hpAtual > 0) || alvo.iaBackupAtiva === true;

    // GD-3: Contragolpe Tático por Classe de Inimigo
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
            if (nave.estadoFisico === '1_NO_FOIL' || Number(nave.furtividadeAtivaSeg ?? 0) > 0) {
              emitirEventoVisual({
                tipo: 'MINA_EVADIDA',
                texto: 'MINA EVADIDA NO FOIL!',
              });
            } else {
              aplicarDanoEmCamaraJogador(nave, 6, 2, 1, true);
              emitirEventoVisual({
                tipo: 'IMPACTO_JOGADOR',
                camaraId: 6,
                dano: 2,
                texto: '-2 MINA!',
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
      const esquivaJogador = calcularEsquivaEfetivaNave(nave);
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
        alvo.progressoAtaquePrimarioSeg =
          Math.round(((alvo.progressoAtaquePrimarioSeg ?? 0) + dtSeg) * 10000) / 10000;
        if (alvo.progressoAtaquePrimarioSeg >= recargaPrim) {
          alvo.progressoAtaquePrimarioSeg = 0.0;
          const precisao = Number(salaPrim.cegoTintaSeg ?? 0) > 0 ? 60 : 100;
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
                aplicarDanoEmCamaraJogador(nave, camAlvo, 1, 1, false);
                emitirEventoVisual({
                  tipo: 'IMPACTO_JOGADOR',
                  camaraId: camAlvo,
                  dano: 1,
                  texto: '-1',
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
        alvo.progressoAtaqueSecundarioSeg =
          Math.round(((alvo.progressoAtaqueSecundarioSeg ?? 0) + dtSeg) * 10000) / 10000;
        if (alvo.progressoAtaqueSecundarioSeg >= recargaSec) {
          alvo.progressoAtaqueSecundarioSeg = 0.0;
          const precisao = Number(salaSec.cegoTintaSeg ?? 0) > 0 ? 60 : 100;
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
                aplicarDanoEmCamaraJogador(nave, 6, dMon, 1, nave.estadoFisico !== '1_NO_FOIL');
                emitirEventoVisual({
                  tipo: 'IMPACTO_JOGADOR',
                  camaraId: 6,
                  dano: dMon,
                  texto: `-${dMon} QUILHA!`,
                });
              }
            } else {
              // Torpedo / Míssil Térmico ignora Barreira e abre brecha se acertar!
              const camAlvo = [5, 6, 4, 3][streamCombateDisparo(seed, setorComb, noIdComb, tick, 930) % 4];
              const danoTorp = classe === 'CHEFE_DRAGA' || setor >= 4 ? 2 : 1;
              aplicarDanoEmCamaraJogador(nave, camAlvo, danoTorp, 1, true);
              emitirEventoVisual({
                tipo: 'IMPACTO_JOGADOR',
                camaraId: camAlvo,
                dano: danoTorp,
                texto: `-${danoTorp} BRECHA!`,
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

  if (eventosVisuais.length > 0 || (estadoAtual.meta?.eventosVisuaisUltimoTick?.length ?? 0) > 0) {
    const cloneEv = structuredClone(estadoAtual);
    cloneEv.meta = {
      ...cloneEv.meta,
      eventosVisuaisUltimoTick: eventosVisuais,
    };
    estadoAtual = congelarProfundo(cloneEv);
  }

  return estadoAtual;
}

