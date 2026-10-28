/**
 * ONDA 6 — Catálogo Fechado dos 15 Comandos Atômicos (`Action Schema`) e Despachante Puro UI <-> Motor
 * Dono Único (Lei N5): src/onda6-ui/despacho-comandos.mjs
 *
 * Fontes canônicas:
 *  - Seção 8.5.A (Tabela dos 15 Comandos Atômicos, Fases Permitidas, Pré-Condições e Marcadores de Rejeição)
 *  - Lei L2 (Imutabilidade: comandos rejeitados devolvem o estado sem mutar campos de jogo e registram no logDeterministico)
 */
import { clonarProfundoCongelado } from '../gdd-parser.mjs';
import { HP_MAX_POR_ESPECIE } from '../onda1-fisica/estado-inicial.mjs';
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
  validarCaminhoBeamAdjacente,
  sincronizarEnergiaArmasComCamaraArtilharia,
} from '../onda2-combate/tick-sistemas-armas.mjs';
import { calcularRotaTaticaSobrevivencia } from '../onda2-combate/tick-tripulacao.mjs';
import { iniciarTravessiaMapa } from '../onda4-mapa/relogio-viagem.mjs';
import { resolverVisitaNoMapa } from '../onda4-mapa/eventos-nos.mjs';
import { streamCombateDisparo } from '../onda1-fisica/hash32-streams.mjs';
import { tentarAbordagemContraAlvo } from '../onda5-catalogo-chefe/chefe-draga.mjs';
import {
  CATALOGO_ARMAS_51,
  CATALOGO_ORGAOS_52,
  CATALOGO_LOJA_56B,
  MAX_TRIPULANTES_NAVE,
} from '../onda5-catalogo-chefe/catalogo-naves-itens.mjs';
import {
  resolverGrafoOrtogonalAlvo,
  construirDesfechoEventoCanonicamente,
} from './encontros-eventos-campanha.mjs';
import {
  CATALOGO_24_ARMAS_STEAM,
  CATALOGO_16_ORGAOS_STEAM,
  CATALOGO_LOJA_STEAM_COMPLETO,
  resolverArmaCatalogoUnificado,
  resolverOrgaoCatalogoUnificado,
  calcularModificadoresPassivosOrgaosSteam,
  sortearVitrineLojaSteam,
} from '../onda7-steam/catalogo-armas-orgaos-ae.mjs';
import {
  resolverVisitaNoMapaSteam,
  plantarBoiaQuestNoSetor,
} from '../onda7-steam/eventos-ae-setores-5a8.mjs';
import { registrarAcaoNoTutorialSteam } from '../onda7-steam/tutorial-interativo.mjs';
import {
  obterConfiguracaoDificuldadeSteam,
  avaliarConquistasSteam,
} from '../onda7-steam/dificuldades-conquistas-opcoes.mjs';

export {
  COORDENADAS_GRADE_CAMARAS_16A,
  converterCoordenadaTelaParaNativa,
  obterMapaHitboxesNativo,
  calcularGhostPreviewTermometro,
} from './hitboxes-layout.mjs';
export { avancarTickPartidaEmTempoReal } from './tick-combate-tempo-real.mjs';

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
    comandoExecutado: { tipo: comando.tipo, payload: comando.payload ?? null },
    estado: {
      ...estado,
      logDeterministico: novoLog,
    },
  });
}

function mapearGatilhoTutorialComando(tipoComando) {
  if (tipoComando === 'ALTERNAR_VALVULA' || tipoComando === 'DRENAR_TUDO') return 'DRENAR_VALVULAS';
  if (tipoComando === 'MERGULHO_TATICO') return 'MERGULHO_TATICO';
  if (tipoComando === 'MIRAR_ARMA') return 'DEFINIR_ALVO_ARMA';
  if (tipoComando === 'MOVER_TRIPULANTE' || tipoComando === 'ATIVAR_BAIACU') return 'MOVER_TRIPULANTE';
  return tipoComando;
}

function concluirComandoAceito(comando, p, novoEstado, cueEmitido = null, extras = {}) {
  let estFinal = novoEstado;
  if (estFinal?.meta?.tutorialSteam?.ativo === true) {
    const tutProx = registrarAcaoNoTutorialSteam(
      estFinal.meta.tutorialSteam,
      mapearGatilhoTutorialComando(comando.tipo)
    );
    let conqAtu = estFinal.meta?.conquistasDesbloqueadas;
    if (tutProx.concluido && estFinal?.meta?.edicaoComercialSteam === true) {
      const avTut = avaliarConquistasSteam({ tutorialConcluido: true }, conqAtu ?? []);
      conqAtu = [...avTut.todosDesbloqueados];
    }
    estFinal = {
      ...estFinal,
      meta: {
        ...estFinal.meta,
        tutorialSteam: tutProx,
        ...(conqAtu !== undefined ? { conquistasDesbloqueadas: conqAtu } : {}),
      },
    };
  }
  if (
    estFinal?.meta?.edicaoComercialSteam === true &&
    estFinal?.mapaSetorial &&
    estFinal.mapaSetorial.cartaRevelada !== true &&
    calcularModificadoresPassivosOrgaosSteam(estFinal.naveJogador).revelaNosAdjacentesMapa === true
  ) {
    estFinal = {
      ...estFinal,
      mapaSetorial: {
        ...estFinal.mapaSetorial,
        cartaRevelada: true,
      },
    };
  }
  return clonarProfundoCongelado({
    aceito: true,
    marcadorRejeicao: null,
    cueEmitido,
    comandoExecutado: { tipo: comando.tipo, payload: p },
    ...extras,
    estado: estFinal,
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
 * Despacha um comando atômico da UI para o motor real, retornando `{ aceito, marcadorRejeicao, cueEmitido, comandoExecutado, estado }`.
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
      return concluirComandoAceito(comando, p, novoEstado);
    }

    case 'DRENAR_TUDO': {
      if (estadoFisicoAtual !== '1_NO_FOIL') {
        return rejeitarComando(estado, comando, 'BLOQUEADO_TRAVA_HIDROSTATICA', 'CUE_TRAVA_HIDROSTATICA');
      }
      if (p.modoSeguro === true) {
        const aguaTotalAtual = (nave.camaras ?? []).reduce((acc, c) => acc + Number(c.aguaKg ?? 0), 0);
        if (aguaTotalAtual <= 62.5) {
          const estadoFechado = drenarTodasValvulas(estado, false);
          return concluirComandoAceito(comando, p, {
            ...estadoFechado,
            naveJogador: {
              ...estadoFechado.naveJogador,
              drenoSeguroAtivo: false,
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
        return concluirComandoAceito(comando, p, {
          ...estado,
          naveJogador: {
            ...nave,
            drenoSeguroAtivo: idsAbrirSeguro.size > 0,
            camaras: novasCamarasSeguras,
          },
        });
      }
      const novoEstado = drenarTodasValvulas(estado, p.abrirTodas ?? true);
      return concluirComandoAceito(comando, p, {
        ...novoEstado,
        naveJogador: {
          ...novoEstado.naveJogador,
          drenoSeguroAtivo: false,
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
      const baseNaveAlocada = {
        ...nave,
        reator: {
          ...nave.reator,
          barrasDisponiveis: dispReator - deltaBarras,
        },
        camaras: novasCamaras,
      };
      const naveSincronizadaArt =
        Number(camaraId) === 1
          ? sincronizarEnergiaArmasComCamaraArtilharia(baseNaveAlocada, { redistribuir: true })
          : baseNaveAlocada;
      const novaNave = recalcularFoilEPesoNave(naveSincronizadaArt);
      const caiuParaTouchdown = eraNoFoil && novaNave.estadoFisico === '2_TOUCHDOWN';

      return concluirComandoAceito(
        comando,
        p,
        {
          ...estado,
          naveJogador: novaNave,
        },
        caiuParaTouchdown ? 'CUE_ESTOL_TOUCHDOWN' : null
      );
    }

    case 'MOVER_TRIPULANTE': {
      const listaIdsEsquadrao =
        Array.isArray(p.tripulanteIds) && p.tripulanteIds.length > 0
          ? p.tripulanteIds
          : [p.tripulanteId ?? p.idTripulante];
      const camaraDestinoExiste = (nave.camaras ?? []).some((c) => c.id === p.camaraDestinoId);
      if (!camaraDestinoExiste) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      const candidatosValidos = listaIdsEsquadrao
        .map((idT) => nave.tripulacao.find((t) => t.id === idT))
        .filter(
          (t) =>
            t &&
            t.localizacao === 'NAVE_JOGADOR' &&
            !t.inflado &&
            !(Number(t.atordoadoSeg ?? 0) > 0) &&
            t.hpAtual > 0 &&
            t.vivo !== false
        );
      if (candidatosValidos.length === 0) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      const idsEsquadraoSet = new Set(candidatosValidos.map((t) => t.id));
      let ocupantesAtuaisNoDestino = nave.tripulacao.filter(
        (t) =>
          t.localizacao === 'NAVE_JOGADOR' &&
          (t.camaraDestinoId ?? t.camaraAtualId) === p.camaraDestinoId &&
          t.hpAtual > 0 &&
          !idsEsquadraoSet.has(t.id)
      ).length;
      const limiteSalaDestino = Math.max(1, Number(nave?.limitesPorSala?.[p.camaraDestinoId] ?? 2));
      if (ocupantesAtuaisNoDestino >= limiteSalaDestino) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      const ordensAceitas = new Map();
      for (const trip of candidatosValidos) {
        const jaNaCamaraDestino = trip.camaraAtualId === p.camaraDestinoId && !trip.camaraDestinoId;
        if (!jaNaCamaraDestino && ocupantesAtuaisNoDestino >= limiteSalaDestino) continue;
        if (!jaNaCamaraDestino) ocupantesAtuaisNoDestino += 1;
        else ocupantesAtuaisNoDestino += 1;
        const novoAcoplado = jaNaCamaraDestino
          ? (p.acopladoBulbo !== undefined ? Boolean(p.acopladoBulbo) : !trip.acopladoBulbo)
          : false;
        const planoRota = jaNaCamaraDestino
          ? null
          : calcularRotaTaticaSobrevivencia(nave, trip.camaraAtualId, p.camaraDestinoId, trip.especie);
        const novaRotaAtiva = !jaNaCamaraDestino && planoRota?.ok ? [...planoRota.rota] : [];
        const novaProximaCamaraId =
          novaRotaAtiva.length >= 2 ? novaRotaAtiva[1] : jaNaCamaraDestino ? null : p.camaraDestinoId;
        const mudandoDestino = trip.camaraDestinoId !== p.camaraDestinoId;
        ordensAceitas.set(trip.id, {
          camaraDestinoId: jaNaCamaraDestino ? null : p.camaraDestinoId,
          proximaCamaraId: jaNaCamaraDestino ? null : novaProximaCamaraId,
          rotaAtiva: novaRotaAtiva,
          progressoNadoSeg: jaNaCamaraDestino || mudandoDestino ? 0.0 : Number(trip.progressoNadoSeg ?? 0),
          progressoSalto0a1: jaNaCamaraDestino || mudandoDestino ? 0.0 : Number(trip.progressoSalto0a1 ?? 0),
          interceptadoPorInvasor: false,
          acopladoBulbo: novoAcoplado,
        });
      }
      if (ordensAceitas.size === 0) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      return concluirComandoAceito(comando, p, {
        ...estado,
        naveJogador: {
          ...nave,
          tripulacao: nave.tripulacao.map((t) =>
            ordensAceitas.has(t.id) ? { ...t, ...ordensAceitas.get(t.id) } : t
          ),
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
      const specUnif = resolverArmaCatalogoUnificado(idChassi);
      const ehFeixe = Boolean(arma.ehFeixe ?? specUnif?.ehFeixe) || idChassi === 'CORTADOR_TERMICO_PLASMA' || idChassi === 'CORTADOR_TERMICO';
      const tamFeixeEsperado =
        idChassi === 'CORTADOR_TERMICO_PLASMA' || idChassi === 'CORTADOR_TERMICO'
          ? 3
          : ehFeixe
            ? Math.max(1, Math.min(3, Number(specUnif?.projeteis ?? 3)))
            : 0;
      const ehFeixeMultiSala = ehFeixe && tamFeixeEsperado >= 2;
      const exigeSubmersa =
        Boolean(arma.exigeSalaSubmersa ?? specUnif?.exigeSalaSubmersa) || idChassi === 'LANCADOR_TORPEDO_ABISSAL';
      if (ehFeixeMultiSala && !p.trincaSalasBeam) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      if (p.trincaSalasBeam) {
        const grafosTodos = [
          GRAFOS_BEAM_CANONICOS.BIONAVE_2X4,
          GRAFOS_BEAM_CANONICOS.BARCO_2X2,
          GRAFOS_BEAM_CANONICOS.BARCO_CORVETA_5,
          GRAFOS_BEAM_CANONICOS.BARCO_ARRASTAO_6,
          GRAFOS_BEAM_CANONICOS.BARCO_SUBMARINO_6,
          GRAFOS_BEAM_CANONICOS.MONSTRO_1X4,
          GRAFOS_BEAM_CANONICOS.DRAGA_F1_6,
          GRAFOS_BEAM_CANONICOS.DRAGA_F2_6,
          GRAFOS_BEAM_CANONICOS.DRAGA_F3_5,
        ];
        const validaQualquerGrafo =
          tamFeixeEsperado === 3 || !ehFeixe
            ? grafosTodos.some((g) => validarTrincaBeam(p.trincaSalasBeam, g))
            : grafosTodos.some((g) => validarCaminhoBeamAdjacente(p.trincaSalasBeam, g, tamFeixeEsperado));
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
      return concluirComandoAceito(comando, p, {
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
      });
    }

    case 'ATIVAR_BAIACU': {
      const trip = nave.tripulacao.find((t) => t.id === p.tripulanteId);
      if (!trip || trip.especie !== 'BAIACU' || trip.localizacao !== 'NAVE_JOGADOR' || trip.hpAtual <= 0) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      const inflado = Boolean(p.inflado);
      return concluirComandoAceito(comando, p, {
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
      });
    }

    case 'ATIVAR_PULSO_ENZIMAS': {
      const camBrq = nave.camaras.find((c) => c.id === 3);
      const ionBrq = Math.max(0, Number(camBrq?.danoIonizado ?? camBrq?.barrasIonizadas ?? 0));
      const energiaBrq = Math.max(0, Number(camBrq?.barrasEnergiaAlocada ?? camBrq?.energiaAlocada ?? 0) - ionBrq);
      if (energiaBrq < 2 || (nave.recargaPulsoEnzimasSeg ?? 0) > 0) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      return concluirComandoAceito(comando, p, {
        ...estado,
        naveJogador: {
          ...nave,
          pulsoEnzimasAtivoSeg: 6.0,
          recargaPulsoEnzimasSeg: 25.0,
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
      return concluirComandoAceito(comando, p, {
        ...estado,
        naveJogador: {
          ...nave,
          furtividadeAtivaSeg: duracao,
          recargaFurtividadeSeg: 20.0,
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
      return concluirComandoAceito(comando, p, {
        ...resAbord.estado,
        naveJogador: {
          ...resAbord.estado.naveJogador,
          recargaTuboAbordagemSeg: recargaTuboSeg,
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
      return concluirComandoAceito(comando, p, novoEstado, cueMergulho);
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
      const naveLimpaFuga = recalcularFoilEPesoNave({
        ...nave,
        progressoFugaSeg: 0.0,
        penalidadeSustentacaoKg: 0.0,
        neutralizaChuvaAcidaRestanteSeg: 0.0,
        tripulacao: nave.tripulacao.filter((t) => t.localizacao !== 'BORDO_INIMIGO'),
      });
      return concluirComandoAceito(comando, p, {
        ...estado,
        meta: {
          ...estado.meta,
          faseJogo: 'MAPA',
          perigoAmbientalId: null,
          modificadoresCombateAtivos: null,
        },
        economia: novaCarteira,
        recursos: novaCarteira,
        naveJogador: naveLimpaFuga,
        alvoCombate: estado.alvoCombate ? { ...estado.alvoCombate, ativo: false } : null,
      });
    }

    case 'ESCOLHER_OPCAO_EVENTO': {
      if (!['A', 'B', 'C'].includes(p.opcao)) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      const noEvento =
        p.noMapa ??
        estado.eventoAtual?.noMapa ?? {
          id: estado.eventoAtual?.noId ?? 'NO_1_A',
          tipoNo: p.categoriaEvento ?? estado.eventoAtual?.tipoNo ?? 'SOS',
          idTemplateEvento: p.idEvento ?? estado.eventoAtual?.idTemplateEvento,
          xMn: 50,
          tPrazoHoras: 10,
        };
      if (p.opcao === 'C' && (noEvento.tipoNo === 'PERIGO' || String(p.idEvento).startsWith('PER_'))) {
        return rejeitarComando(estado, comando, 'BLOQUEADO_COMBATE_OBRIGATORIO');
      }
      const baseCarteira = extrairCarteiraSincronizada(estado);
      const ehEventoAe = String(noEvento.idTemplateEvento ?? p.idEvento ?? '').startsWith('AE_');
      const usarMotorSteamEv = ehEventoAe || Boolean(estado.meta?.edicaoComercialSteam);
      const velFrotaEv = estado.meta?.edicaoComercialSteam
        ? obterConfiguracaoDificuldadeSteam(estado.meta?.dificuldade ?? 'NORMAL').velocidadeFrotaMnPorHora
        : undefined;
      const fnResolverVisita = usarMotorSteamEv ? resolverVisitaNoMapaSteam : resolverVisitaNoMapa;
      const resVisita = fnResolverVisita({
        seedPartida: estado.meta?.seedPartida ?? 'seed',
        setorNumero: estado.mapaSetorial?.setorNumero ?? 1,
        relogioSetorHoras: estado.mapaSetorial?.relogioSetorHoras ?? estado.mapaSetorial?.relogioHoras ?? 0,
        noMapa: noEvento,
        kitOuNave: nave,
        opcaoEscolhida: p.opcao,
        ...(usarMotorSteamEv
          ? {
              velocidadeFrenteMnH: velFrotaEv,
              frenteCorporacaoMn: estado.mapaSetorial?.frenteCorporacaoMn ?? null,
              municaoAtual: baseCarteira.municao,
            }
          : {}),
      });
      if (resVisita.aceito === false) {
        return rejeitarComando(estado, comando, resVisita.marcadorRejeicao ?? 'PRECONDICAO_NAO_ATENDIDA');
      }
      const recompensaOpcao =
        p.opcao === 'B'
          ? (resVisita.recompensaBlueOption ?? {})
          : (resVisita.recompensaOpcaoA ?? {});
      const danoCasco = Number(resVisita.danoCasco ?? 0);
      const reparoHp = Number(recompensaOpcao.reparaCascoHp ?? 0);
      const novoHpCasco = Math.min(
        nave.hpCascoMax,
        Math.max(0, nave.hpCascoAtual - danoCasco) + reparoHp
      );
      const ganhoSucBruto = Number(resVisita.moedaGerada?.sucata ?? 0);
      const ganhoBioBruto = Number(resVisita.moedaGerada?.biomassa ?? 0);
      const aplicaEscalaSaqueEventoSteam =
        estado.meta?.edicaoComercialSteam === true &&
        resVisita.estadoNo !== 'FROTA_PRINCIPAL_CORPORACAO' &&
        resVisita.estadoNo !== 'ZONA_MORTA_INDUSTRIALIZADA';
      const fatorSaqueEventoSteam = aplicaEscalaSaqueEventoSteam
        ? Number(obterConfiguracaoDificuldadeSteam(estado.meta?.dificuldade ?? 'NORMAL').multiplicadorSaque ?? 1.0) *
          (1.0 + Number(calcularModificadoresPassivosOrgaosSteam(nave).multiplicadorSaqueBonus ?? 0))
        : 1.0;
      const ganhoSuc =
        aplicaEscalaSaqueEventoSteam && ganhoSucBruto > 0
          ? Math.max(1, Math.round(ganhoSucBruto * fatorSaqueEventoSteam))
          : ganhoSucBruto;
      const ganhoBio =
        aplicaEscalaSaqueEventoSteam && ganhoBioBruto > 0
          ? Math.max(1, Math.round(ganhoBioBruto * fatorSaqueEventoSteam))
          : ganhoBioBruto;
      const ganhoComb = Number(recompensaOpcao.combustivel ?? 0);
      const ganhoMun = Number(recompensaOpcao.municao ?? 0);
      const novaCarteiraEvento = {
        ...baseCarteira,
        sucata: Math.max(0, baseCarteira.sucata + ganhoSuc),
        biomassa: Math.max(0, baseCarteira.biomassa + ganhoBio),
        combustivel: Math.max(0, baseCarteira.combustivel + ganhoComb),
        municao: Math.max(0, baseCarteira.municao + ganhoMun),
      };

      const seedEv = String(estado.meta?.seedPartida ?? 'seed-evento');
      const setorEv = Number(estado.mapaSetorial?.setorNumero ?? 1);
      const noIdEv = String(noEvento.id ?? p.idEvento ?? 'NO_EVENTO');
      let novaTripEv = nave.tripulacao;
      let novoTripulanteEspecie = null;
      const vivosAtuaisEv = (nave.tripulacao ?? []).filter(
        (t) => Number(t.hpAtual ?? 0) > 0 && t.vivo !== false
      ).length;
      if (Number(recompensaOpcao.recrutaTripulante ?? 0) > 0 && vivosAtuaisEv < MAX_TRIPULANTES_NAVE) {
        const especiesPool = ['POLVO', 'ARRAIA', 'BAIACU', 'CARANGUEJO'];
        const espNova = especiesPool[streamCombateDisparo(seedEv, setorEv, noIdEv, 1, 701) % 4];
        const hpMaxEsp = Number(HP_MAX_POR_ESPECIE[espNova] ?? 100);
        const camLivre =
          (nave.camaras ?? []).find(
            (c) =>
              (nave.tripulacao ?? []).filter((t) => t.localizacao === 'NAVE_JOGADOR' && t.hpAtual > 0 && t.camaraAtualId === c.id).length <
              Math.max(1, Number(nave?.limitesPorSala?.[c.id] ?? 2))
          )?.id ?? 3;
        novoTripulanteEspecie = espNova;
        novaTripEv = [
          ...(nave.tripulacao ?? []),
          {
            id: `trip-ev-${noIdEv.toLowerCase()}-${(nave.tripulacao ?? []).length + 1}`,
            especie: espNova,
            hpAtual: hpMaxEsp,
            hpMax: hpMaxEsp,
            localizacao: 'NAVE_JOGADOR',
            camaraAtualId: camLivre,
            camaraDestinoId: null,
            progressoNadoSeg: 0,
            acopladoBulbo: false,
            inflado: false,
          },
        ];
      }

      let novoPoraoEv = [...(nave.poraoCarga ?? [])];
      while (novoPoraoEv.length < 4) {
        novoPoraoEv.push({ slotIndex: novoPoraoEv.length, item: null });
      }
      let itemRecuperadoNome = null;
      const idxPoraoLivreEv = novoPoraoEv.findIndex((s) => !s?.item);
      const catOrgaosPool = estado.meta?.edicaoComercialSteam ? CATALOGO_16_ORGAOS_STEAM : CATALOGO_ORGAOS_52;
      const catArmasPool = estado.meta?.edicaoComercialSteam ? CATALOGO_24_ARMAS_STEAM : CATALOGO_ARMAS_51;
      if (idxPoraoLivreEv >= 0) {
        if (Number(recompensaOpcao.orgaoIntacto ?? 0) > 0) {
          const specOrg = catOrgaosPool[streamCombateDisparo(seedEv, setorEv, noIdEv, 1, 702) % catOrgaosPool.length];
          novoPoraoEv[idxPoraoLivreEv] = {
            slotIndex: idxPoraoLivreEv,
            item: { id: specOrg.id, nome: specOrg.nome, tipo: 'ORGAO', pesoKg: Number(specOrg.pesoKg ?? 5) },
          };
          itemRecuperadoNome = specOrg.nome;
        } else if (Number(recompensaOpcao.armaRecuperada ?? 0) > 0) {
          const specArma = catArmasPool[streamCombateDisparo(seedEv, setorEv, noIdEv, 1, 703) % catArmasPool.length];
          novoPoraoEv[idxPoraoLivreEv] = {
            slotIndex: idxPoraoLivreEv,
            item: { id: specArma.id, nome: specArma.nome, tipo: 'ARMA', pesoKg: Number(specArma.pesoKg ?? 10) },
          };
          itemRecuperadoNome = specArma.nome;
        }
      }

      const novaFase =
        novoHpCasco <= 0
          ? 'FIM_DE_RUN'
          : resVisita.combateObrigatorio
            ? 'COMBATE'
            : 'MAPA';

      const idTemplateEv = noEvento.idTemplateEvento ?? p.idEvento ?? null;
      const tipoRamoEv = recompensaOpcao.tipo ?? null;
      const classeForcadaEv =
        tipoRamoEv === 'COMBATE_MONSTRO'
          ? 'MONSTRO_MARINHO'
          : tipoRamoEv === 'COMBATE_BARCO' || resVisita.estadoNo === 'FROTA_PRINCIPAL_CORPORACAO' || resVisita.estadoNo === 'ZONA_MORTA_INDUSTRIALIZADA'
            ? 'BARCO_HUMANO'
            : null;
      const perigoAmbientalId =
        novaFase === 'COMBATE' && (idTemplateEv === 'PER_1_CHUVA_ACIDA' || tipoRamoEv === 'COMBATE_PERIGO_ACIDO')
          ? 'PER_1_CHUVA_ACIDA'
          : null;
      const penalidadeSustentacaoEv =
        novaFase === 'COMBATE' ? Math.max(0, Number(recompensaOpcao.penalidadeSustentacaoKg ?? 0)) : 0;
      const neutralizaChuvaSegEv =
        novaFase === 'COMBATE' ? Math.max(0, Number(recompensaOpcao.neutralizaChuvaAcidaSeg ?? 0)) : 0;
      const canalVisibilidadeEv = novaFase === 'COMBATE' ? (recompensaOpcao.canalVisibilidade ?? null) : null;
      const modificadoresCombateAtivos =
        novaFase === 'COMBATE'
          ? {
              origemCombate: resVisita.estadoNo ?? 'EVENTO_ATIVO',
              idEvento: idTemplateEv,
              classeForcada: classeForcadaEv,
              perigoAmbientalId,
              penalidadeSustentacaoKg: penalidadeSustentacaoEv,
              neutralizaChuvaAcidaSeg: neutralizaChuvaSegEv,
              municaoPosLuta: Math.max(0, Number(recompensaOpcao.municaoPosLuta ?? 0)),
              canalVisibilidadeSonar: canalVisibilidadeEv,
              bonusBarreiraInimigo: Math.max(0, Number(resVisita.bonusBarreiraInimigo ?? 0)),
            }
          : null;

      const novaNaveEvento = recalcularFoilEPesoNave({
        ...nave,
        hpCascoAtual: novoHpCasco,
        tripulacao: novaTripEv,
        poraoCarga: novoPoraoEv,
        penalidadeSustentacaoKg: penalidadeSustentacaoEv,
        ...(neutralizaChuvaSegEv > 0 ? { neutralizaChuvaAcidaRestanteSeg: neutralizaChuvaSegEv } : {}),
      });

      const revelaCartaSetor = Boolean(recompensaOpcao.revelaMapaSetorial);
      let novoMapaEvento =
        revelaCartaSetor && estado.mapaSetorial
          ? { ...estado.mapaSetorial, cartaRevelada: true }
          : estado.mapaSetorial;
      if (resVisita.plantaQuestId && novoMapaEvento) {
        novoMapaEvento = plantarBoiaQuestNoSetor(novoMapaEvento, resVisita.plantaQuestId);
      }

      const estadoPosteriorTemp = {
        ...estado,
        meta: {
          ...estado.meta,
          faseJogo: novaFase,
          perigoAmbientalId,
          modificadoresCombateAtivos,
        },
        ...(novoMapaEvento ? { mapaSetorial: novoMapaEvento } : {}),
        economia: novaCarteiraEvento,
        recursos: novaCarteiraEvento,
        naveJogador: novaNaveEvento,
      };
      const desfechoCanonico = construirDesfechoEventoCanonicamente(estado, estadoPosteriorTemp, {
        opcao: p.opcao,
        opcaoEscolhida: p.opcao,
        tipoNo: noEvento.tipoNo ?? 'SOS',
        idEvento: noEvento.idTemplateEvento ?? p.idEvento ?? 'SOS_01',
        combateObrigatorio: Boolean(resVisita.combateObrigatorio),
        revelaMapaSetorial: Boolean(recompensaOpcao.revelaMapaSetorial),
        novoTripulanteEspecie,
        itemRecuperadoNome,
      });

      return concluirComandoAceito(
        comando,
        p,
        {
          ...estadoPosteriorTemp,
          meta: {
            ...estadoPosteriorTemp.meta,
            ultimoResultadoEvento: desfechoCanonico,
          },
        }
      );
    }

    case 'COMPRAR_OU_VENDER_LOJA': {
      const acao = p.operacao ?? p.acao ?? 'COMPRAR';
      if (acao === 'SAIR_DA_LOJA' || p.itemOuSistemaId === 'SAIR_DA_LOJA') {
        return concluirComandoAceito(comando, p, {
          ...estado,
          meta: { ...estado.meta, faseJogo: 'MAPA', modalCampanhaAtivo: null },
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
        return concluirComandoAceito(comando, p, {
          ...estado,
          economia: novaCartDig,
          recursos: novaCartDig,
        });
      }

      let novasArmasLoja = nave.armasAtivas ?? [];
      let novoPoraoLoja = [...(nave.poraoCarga ?? [])];
      while (novoPoraoLoja.length < 4) {
        novoPoraoLoja.push({ slotIndex: novoPoraoLoja.length, item: null });
      }

      // Permite vender especificando `indicePorao` ou `slotArmaIndex` (qualquer item do inventário, mesmo fora da vitrine!)
      let idItemResolvido = p.itemOuSistemaId;
      if (acao === 'VENDER' && !idItemResolvido) {
        if (Number.isInteger(p.indicePorao) && novoPoraoLoja[p.indicePorao]?.item?.id) {
          idItemResolvido = novoPoraoLoja[p.indicePorao].item.id;
        } else if (Number.isInteger(p.slotArmaIndex) && novasArmasLoja[p.slotArmaIndex]?.arma) {
          idItemResolvido =
            novasArmasLoja[p.slotArmaIndex].arma.chassiId ?? novasArmasLoja[p.slotArmaIndex].arma.idArma;
        }
      }

      const aliasItem = {
        CELULA_COMBUSTIVEL: 'INSUMO_COMBUSTIVEL',
        COMBUSTIVEL_1UN: 'INSUMO_COMBUSTIVEL',
        MUNICAO_TORPEDO_ESPORO: 'INSUMO_MUNICAO',
        MUNICAO_1UN: 'INSUMO_MUNICAO',
      }[idItemResolvido] ?? idItemResolvido;
      const itemCru =
        CATALOGO_LOJA_56B.find((i) => i.id === aliasItem) ??
        CATALOGO_LOJA_STEAM_COMPLETO.find((i) => i.id === aliasItem);
      const item = itemCru ? { ...itemCru, precoCompra: itemCru.precoCompra ?? itemCru.preco } : null;
      if (!item) return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      const chaveMoeda = item.moeda === 'BIOMASSA' ? 'biomassa' : 'sucata';
      const baseCarteira = extrairCarteiraSincronizada(estado);
      let novaCarteiraLoja = { ...baseCarteira };
      let novoHpCascoLoja = nave.hpCascoAtual;
      let novaTripulacaoLoja = nave.tripulacao;
      let novasCamarasLoja = nave.camaras;
      let novosPostosLoja = nave.postosSalvosTripulacao ? { ...nave.postosSalvosTripulacao } : null;
      let novoSubsistemasLoja = nave.subsistemasTaticosSteam
        ? { ...nave.subsistemasTaticosSteam }
        : {
            sondaSabotagem: false,
            parasitaNeural: false,
            droneDefesa: false,
            droneReparo: false,
            droneAtaque: false,
            recargaSondaSeg: 0,
            sondaAtivaSeg: 0,
            recargaNeuralSeg: 0,
            recargaDroneDefesaSeg: 0,
            recargaDroneReparoSeg: 0,
            recargaDroneAtaqueSeg: 0,
          };
      let novosItensCompradosLoja = [...(estado.lojaAtual?.itensCompradosIds ?? [])];
      let novaContagemInsumosLoja = { ...(estado.lojaAtual?.contagemInsumosComprados ?? {}) };

      if (acao === 'VENDER') {
        if ((item.valorVenda ?? 0) <= 0) {
          return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
        }
        const idxPoraoExplicito =
          Number.isInteger(p.indicePorao) &&
          p.indicePorao >= 0 &&
          p.indicePorao < novoPoraoLoja.length &&
          (novoPoraoLoja[p.indicePorao]?.item?.id ?? novoPoraoLoja[p.indicePorao]?.id) === item.id
            ? p.indicePorao
            : -1;
        const idxArmaExplicita =
          Number.isInteger(p.slotArmaIndex) &&
          p.slotArmaIndex >= 0 &&
          p.slotArmaIndex < novasArmasLoja.length &&
          novasArmasLoja[p.slotArmaIndex]?.arma &&
          (novasArmasLoja[p.slotArmaIndex].arma.chassiId === item.id ||
            novasArmasLoja[p.slotArmaIndex].arma.idArma === item.id)
            ? p.slotArmaIndex
            : -1;

        const idxPorao =
          idxPoraoExplicito >= 0
            ? idxPoraoExplicito
            : idxArmaExplicita >= 0
              ? -1
              : novoPoraoLoja.findIndex((it) => (it?.item?.id ?? it?.id) === item.id);
        const idxArmaAtiva =
          idxArmaExplicita >= 0
            ? idxArmaExplicita
            : novasArmasLoja.findIndex(
                (s) => s?.arma && (s.arma.chassiId === item.id || s.arma.idArma === item.id)
              );

        if (idxPorao >= 0) {
          novoPoraoLoja = novoPoraoLoja.map((s, idx) =>
            idx === idxPorao ? { ...s, item: null } : s
          );
        } else if (idxArmaAtiva >= 0) {
          const armaVendida = novasArmasLoja[idxArmaAtiva]?.arma ?? novasArmasLoja[idxArmaAtiva];
          const orgaosNaArma = Array.isArray(armaVendida?.orgaosEnxertados) ? armaVendida.orgaosEnxertados : [];
          novasArmasLoja = novasArmasLoja.map((s, idx) =>
            idx === idxArmaAtiva ? { ...s, arma: null } : s
          );
          // Preserva órgãos enxertados na arma vendida: devolve ao Porão de Carga (ou credita valorVenda em Biomassa se lotado!)
          for (const idOrg of orgaosNaArma) {
            const specOrg = CATALOGO_ORGAOS_52.find((o) => o.id === idOrg) ?? resolverOrgaoCatalogoUnificado(idOrg);
            const specLojaOrg =
              CATALOGO_LOJA_56B.find((i) => i.id === idOrg) ?? CATALOGO_LOJA_STEAM_COMPLETO.find((i) => i.id === idOrg);
            const idxLivreOrg = novoPoraoLoja.findIndex((s) => !s?.item);
            if (idxLivreOrg >= 0) {
              novoPoraoLoja = novoPoraoLoja.map((s, idx) =>
                idx === idxLivreOrg
                  ? {
                      ...s,
                      item: {
                        id: idOrg,
                        tipo: 'ORGAO',
                        pesoKg: Number(specOrg?.pesoKg ?? 5.0),
                      },
                    }
                  : s
              );
            } else {
              novaCarteiraLoja.biomassa += Number(specLojaOrg?.valorVenda ?? 22);
            }
          }
        } else {
          return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
        }
        novaCarteiraLoja[chaveMoeda] += item.valorVenda;
        novosItensCompradosLoja = novosItensCompradosLoja.filter((idC) => idC !== item.id);
      } else {
        const ehSteamLoja = estado.meta?.edicaoComercialSteam === true;
        const ehUnicoLoja =
          item.categoria === 'ARMA' ||
          item.categoria === 'ORGAO' ||
          item.categoria === 'TRIPULANTE' ||
          item.categoria === 'SUBSISTEMA';
        if (ehUnicoLoja && novosItensCompradosLoja.includes(item.id)) {
          return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
        }
        const setorAtual = estado.mapaSetorial?.setorNumero ?? 1;
        if (item.categoria === 'INSUMO') {
          let limiteEstoqueInsumo = 5;
          if (ehSteamLoja) {
            const noIdLojaStr = String(estado.mapaSetorial?.noAtualId ?? estado.lojaAtual?.noId ?? '');
            const mNoLoja = /(\d+)$/.exec(noIdLojaStr);
            const noIdxLojaNum = mNoLoja ? Number(mNoLoja[1]) : 0;
            const vitrineLojaRef =
              estado.lojaAtual?.ofertasSteam ??
              sortearVitrineLojaSteam(estado.meta?.seedPartida ?? 'biofoil', setorAtual, noIdxLojaNum, nave);
            const cardIns = Array.isArray(vitrineLojaRef) ? vitrineLojaRef.find((o) => o?.id === item.id) : null;
            limiteEstoqueInsumo = Number(cardIns?.estoqueInicial ?? cardIns?.estoqueRestante ?? cardIns?.estoqueMax ?? 6);
          }
          if (Number(novaContagemInsumosLoja[item.id] ?? 0) >= limiteEstoqueInsumo) {
            return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
          }
        }
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
            TRIPULANTE_POLVO: { especie: 'POLVO', hp: 80, disciplina: 'reparo' },
            TRIPULANTE_ARRAIA: { especie: 'ARRAIA', hp: 70, disciplina: 'armas' },
            TRIPULANTE_BAIACU: { especie: 'BAIACU', hp: 150, disciplina: 'pilotagem' },
            TRIPULANTE_CARANGUEJO: { especie: 'CARANGUEJO', hp: 110, disciplina: 'combate' },
          }[item.id];
          if (especieMap) {
            const camLojaLivre =
              [3, 2, 4, 5, 1, 7, 6, 8].find(
                (idC) =>
                  (nave.tripulacao ?? []).filter((t) => t.localizacao === 'NAVE_JOGADOR' && t.hpAtual > 0 && t.camaraAtualId === idC)
                    .length < Math.max(1, Number(nave?.limitesPorSala?.[idC] ?? 2))
              ) ?? 3;
            const idNovoTripLoja = `trip-loja-${(nave.tripulacao ?? []).length + 1}`;
            const nvVetLoja = ehSteamLoja ? (setorAtual >= 7 ? 2 : setorAtual >= 4 ? 1 : 0) : 0;
            const xpVetLoja = nvVetLoja >= 2 ? 8 : nvVetLoja === 1 ? 3 : 0;
            const xpMapNovo = { pilotagem: 0, armas: 0, barreira: 0, reparo: 0, combate: 0 };
            if (xpVetLoja > 0) xpMapNovo[especieMap.disciplina] = xpVetLoja;
            novaTripulacaoLoja = [
              ...(nave.tripulacao ?? []),
              {
                id: idNovoTripLoja,
                especie: especieMap.especie,
                hpAtual: especieMap.hp,
                hpMax: especieMap.hp,
                camaraAtualId: camLojaLivre,
                camaraDestinoId: null,
                progressoNadoSeg: 0.0,
                acopladoBulbo: false,
                inflado: false,
                atordoadoSeg: 0.0,
                localizacao: 'NAVE_JOGADOR',
                ...(ehSteamLoja
                  ? {
                      xpMaestria: xpMapNovo,
                      nivelMaestria: nvVetLoja,
                      ...(nvVetLoja > 0 ? { disciplinaMaestria: especieMap.disciplina } : {}),
                    }
                  : {}),
              },
            ];
            if (novosPostosLoja) {
              novosPostosLoja[idNovoTripLoja] = camLojaLivre;
            }
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
        } else if (item.categoria === 'SUBSISTEMA') {
          if (item.id === 'SUBSISTEMA_SONDA_SABOTAGEM') {
            if (novoSubsistemasLoja.sondaSabotagem) {
              return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
            }
            novoSubsistemasLoja.sondaSabotagem = true;
          } else if (item.id === 'SUBSISTEMA_PARASITA_NEURAL') {
            if (novoSubsistemasLoja.parasitaNeural) {
              return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
            }
            novoSubsistemasLoja.parasitaNeural = true;
          } else if (item.id === 'SUBSISTEMA_DRONE_DEFESA') {
            if (novoSubsistemasLoja.droneDefesa) {
              return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
            }
            novoSubsistemasLoja.droneDefesa = true;
          } else if (item.id === 'SUBSISTEMA_DRONE_REPARO') {
            if (novoSubsistemasLoja.droneReparo) {
              return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
            }
            novoSubsistemasLoja.droneReparo = true;
          } else if (item.id === 'SUBSISTEMA_DRONE_ATAQUE') {
            if (novoSubsistemasLoja.droneAtaque) {
              return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
            }
            novoSubsistemasLoja.droneAtaque = true;
          } else if (item.id === 'SUBSISTEMA_TUBO_PRESSURIZADO' || item.id === 'SUBSISTEMA_TINTA_FURTIVA') {
            const idCamInst = item.id === 'SUBSISTEMA_TUBO_PRESSURIZADO' ? 7 : 8;
            const camAlvoInst = (nave.camaras ?? []).find((c) => c.id === idCamInst);
            if (!camAlvoInst || Number(camAlvoInst.nivelMaxBarras ?? camAlvoInst.barrasNivelMax ?? 0) > 0) {
              return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
            }
            novasCamarasLoja = (nave.camaras ?? []).map((c) =>
              c.id === idCamInst
                ? {
                    ...c,
                    nivelMaxBarras: 1,
                    barrasNivelMax: 1,
                    nivelMax: 1,
                    barrasIntegridade: 1,
                    integridade: 1,
                    instalado: true,
                  }
                : c
            );
          } else {
            return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
          }
        }
        novaCarteiraLoja[chaveMoeda] -= preco;
        if (ehUnicoLoja) {
          novosItensCompradosLoja.push(item.id);
        }
        if (item.categoria === 'INSUMO') {
          novaContagemInsumosLoja[item.id] = Number(novaContagemInsumosLoja[item.id] ?? 0) + 1;
        }
        if (item.id === 'INSUMO_COMBUSTIVEL') novaCarteiraLoja.combustivel += 1;
        if (item.id === 'INSUMO_MUNICAO') novaCarteiraLoja.municao += 1;
        if (item.categoria === 'REPARO') novoHpCascoLoja = Math.min(nave.hpCascoMax, novoHpCascoLoja + 1);
      }
      const naveBaseLoja = sincronizarEnergiaArmasComCamaraArtilharia(
        {
          ...nave,
          hpCascoAtual: novoHpCascoLoja,
          camaras: novasCamarasLoja,
          tripulacao: novaTripulacaoLoja,
          armasAtivas: novasArmasLoja,
          poraoCarga: novoPoraoLoja,
          ...(estado.meta?.edicaoComercialSteam === true
            ? {
                subsistemasTaticosSteam: novoSubsistemasLoja,
                ...(novosPostosLoja ? { postosSalvosTripulacao: novosPostosLoja } : {}),
              }
            : {}),
        },
        { redistribuir: acao === 'VENDER' }
      );
      const navePosLoja = recalcularFoilEPesoNave(naveBaseLoja);
      return concluirComandoAceito(comando, p, {
        ...estado,
        economia: novaCarteiraLoja,
        recursos: novaCarteiraLoja,
        lojaAtual: {
          ...(estado.lojaAtual ?? {}),
          itensCompradosIds: novosItensCompradosLoja,
          contagemInsumosComprados: novaContagemInsumosLoja,
        },
        naveJogador: navePosLoja,
      });
    }

    case 'ENXERTAR_ORGAO': {
      const listaArmasEnx = nave.armasAtivas ?? [];
      if (!Number.isInteger(p.slotIndex) || p.slotIndex < 0 || p.slotIndex >= listaArmasEnx.length) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      const orgao = CATALOGO_ORGAOS_52.find((o) => o.id === p.orgaoId) ?? resolverOrgaoCatalogoUnificado(p.orgaoId);
      const slot = listaArmasEnx[p.slotIndex];
      const arma = slot?.arma !== undefined ? slot.arma : slot;
      if (!orgao || !arma) return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');

      let novosOrgaos = [...(arma.orgaosEnxertados ?? [])];
      if (p.acao === 'ENCAIXAR') {
        if (orgao.categoriaEnxerto === 'CASCO_PASSIVO') {
          return rejeitarComando(estado, comando, 'ORGAO_PASSIVO_EXIGE_PORAO_SIMBIOTICO');
        }
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
        const specOrg = CATALOGO_ORGAOS_52.find((o) => o.id === idOrg) ?? resolverOrgaoCatalogoUnificado(idOrg);
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
      return concluirComandoAceito(comando, p, {
        ...estado,
        naveJogador: novaNave,
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
      const opcoesTravessia = estado.meta?.edicaoComercialSteam
        ? {
            velocidadeFrenteMnH: obterConfiguracaoDificuldadeSteam(estado.meta?.dificuldade ?? 'NORMAL')
              .velocidadeFrotaMnPorHora,
          }
        : {};
      const novoEstado = iniciarTravessiaMapa(estado, idNoDestino, p.descartarCargaIds ?? [], opcoesTravessia);
      return concluirComandoAceito(comando, p, novoEstado);
    }
  }
}
