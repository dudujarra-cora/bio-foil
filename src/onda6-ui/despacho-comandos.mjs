/**
 * ONDA 6 — Catálogo Fechado dos 15 Comandos Atômicos (`Action Schema`) e Despachante Puro UI <-> Motor
 * Dono Único (Lei N5): src/onda6-ui/despacho-comandos.mjs
 *
 * Fontes canônicas:
 *  - Seção 8.5.A (Tabela dos 15 Comandos Atômicos, Fases Permitidas, Pré-Condições e Marcadores de Rejeição)
 *  - Lei L2 (Imutabilidade: comandos rejeitados devolvem o estado sem mutar campos de jogo e registram no logDeterministico)
 */
import { clonarProfundoCongelado } from '../gdd-parser.mjs';
import {
  calcularPesoTotalNave,
  calcularSustentacaoFoil,
  alternarValvulaExterna,
  drenarTodasValvulas,
  alternarMergulhoTatico,
} from '../onda1-fisica/tick-hidraulica-foil.mjs';
import { GRAFOS_BEAM_CANONICOS, validarTrincaBeam } from '../onda2-combate/tick-sistemas-armas.mjs';
import { iniciarTravessiaMapa } from '../onda4-mapa/relogio-viagem.mjs';
import { resolverVisitaNoMapa } from '../onda4-mapa/eventos-nos.mjs';
import { tentarAbordagemContraAlvo } from '../onda5-catalogo-chefe/chefe-draga.mjs';
import { CATALOGO_ORGAOS_52, CATALOGO_LOJA_56B } from '../onda5-catalogo-chefe/catalogo-naves-itens.mjs';

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
      const novoEstado = drenarTodasValvulas(estado, p.abrirTodas ?? true);
      return clonarProfundoCongelado({
        aceito: true,
        marcadorRejeicao: null,
        cueEmitido: null,
        estado: novoEstado,
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
      return clonarProfundoCongelado({
        aceito: true,
        marcadorRejeicao: null,
        cueEmitido: null,
        estado: {
          ...estado,
          naveJogador: {
            ...nave,
            tripulacao: nave.tripulacao.map((t) =>
              t.id === trip.id ? { ...t, camaraDestinoId: p.camaraDestinoId, acopladoBulbo: false } : t
            ),
          },
        },
      });
    }

    case 'MIRAR_ARMA': {
      const slot = (nave.armasAtivas ?? [])[p.slotIndex];
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
      if (exigeSubmersa && p.salaAlvoId !== undefined && p.salaAlvoId !== null) {
        const salaAlvo = (estado.alvoCombate?.salasOuOrgaos ?? []).find((s) => s.id === p.salaAlvoId);
        if (salaAlvo && salaAlvo.submersa === false) {
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
        p.tripulantesIds.length > 2
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
      if (!resAbord.aceito) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      return clonarProfundoCongelado({
        aceito: true,
        marcadorRejeicao: null,
        cueEmitido: null,
        estado: {
          ...resAbord.estado,
          naveJogador: {
            ...resAbord.estado.naveJogador,
            recargaTuboAbordagemSeg: 15.0,
          },
        },
      });
    }

    case 'MERGULHO_TATICO': {
      const novoEstado = alternarMergulhoTatico(estado, Boolean(p.recolherFoil));
      return clonarProfundoCongelado({
        aceito: true,
        marcadorRejeicao: null,
        cueEmitido: p.recolherFoil ? 'CUE_ESTOL_TOUCHDOWN' : 'CUE_SPOOL_UP_DECOLAGEM',
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
      const aliasItem = {
        CELULA_COMBUSTIVEL: 'INSUMO_COMBUSTIVEL',
        MUNICAO_TORPEDO_ESPORO: 'INSUMO_MUNICAO',
      }[p.itemOuSistemaId] ?? p.itemOuSistemaId;
      const item = CATALOGO_LOJA_56B.find((i) => i.id === aliasItem);
      if (!item) return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      const acao = p.acao ?? 'COMPRAR';
      const chaveMoeda = item.moeda === 'BIOMASSA' ? 'biomassa' : 'sucata';
      const baseCarteira = extrairCarteiraSincronizada(estado);
      let novaCarteiraLoja = { ...baseCarteira };
      let novoHpCascoLoja = nave.hpCascoAtual;
      let novaTripulacaoLoja = nave.tripulacao;
      if (acao === 'VENDER') {
        if ((item.valorVenda ?? 0) <= 0) {
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
        }
        novaCarteiraLoja[chaveMoeda] -= preco;
        if (item.id === 'INSUMO_COMBUSTIVEL') novaCarteiraLoja.combustivel += 1;
        if (item.id === 'INSUMO_MUNICAO') novaCarteiraLoja.municao += 1;
        if (item.categoria === 'REPARO') novoHpCascoLoja = Math.min(nave.hpCascoMax, novoHpCascoLoja + 1);
      }
      return clonarProfundoCongelado({
        aceito: true,
        marcadorRejeicao: null,
        cueEmitido: null,
        estado: {
          ...estado,
          economia: novaCarteiraLoja,
          recursos: novaCarteiraLoja,
          naveJogador: {
            ...nave,
            hpCascoAtual: novoHpCascoLoja,
            tripulacao: novaTripulacaoLoja,
          },
        },
      });
    }

    case 'ENXERTAR_ORGAO': {
      const orgao = CATALOGO_ORGAOS_52.find((o) => o.id === p.orgaoId);
      const slot = (nave.armasAtivas ?? [])[p.slotIndex];
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

    case 'VIAJAR_NO_MAPA': {
      if (!p.idNoDestino) return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      if (
        Array.isArray(estado.mapaSetorial?.rotas) &&
        estado.mapaSetorial.rotas.length > 0 &&
        !estado.mapaSetorial.rotas.some(
          (r) => r.origemId === estado.mapaSetorial.noAtualId && r.destinoId === p.idNoDestino
        )
      ) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      const novoEstado = iniciarTravessiaMapa(estado, p.idNoDestino, p.descartarCargaIds ?? []);
      return clonarProfundoCongelado({
        aceito: true,
        marcadorRejeicao: null,
        cueEmitido: null,
        estado: novoEstado,
      });
    }

    default:
      return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
  }
}
