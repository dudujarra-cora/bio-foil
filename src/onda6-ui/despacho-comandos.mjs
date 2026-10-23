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
import { validarTrincaBeam } from '../onda2-combate/tick-sistemas-armas.mjs';
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

  const p = comando.payload ?? {};
  const nave = estado.naveJogador;

  switch (comando.tipo) {
    case 'ALTERNAR_VALVULA': {
      if (nave.estadoFisico !== '1_NO_FOIL') {
        return rejeitarComando(estado, comando, 'BLOQUEADO_TRAVA_HIDROSTATICA', 'CUE_TRAVA_HIDROSTATICA');
      }
      const novoEstado = alternarValvulaExterna(estado, p.camaraId, p.aberta);
      return clonarProfundoCongelado({
        aceito: true,
        marcadorRejeicao: null,
        cueEmitido: null,
        estado: novoEstado,
      });
    }

    case 'DRENAR_TUDO': {
      if (nave.estadoFisico !== '1_NO_FOIL') {
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
      const { camaraId, deltaBarras } = p;
      if (![1, -1].includes(deltaBarras)) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      const cam = nave.camaras.find((c) => c.id === camaraId);
      if (!cam) return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      const intBarra = Number(cam.barrasIntegridade ?? cam.integridade ?? 0);
      const ionBarra = Number(cam.barrasIonizadas ?? cam.danoIonizado ?? 0);
      const atualBarra = Number(cam.barrasEnergiaAlocada ?? cam.energiaAlocada ?? 0);
      const novaBarra = atualBarra + deltaBarras;
      const dispReator = Number(nave.reator?.barrasDisponiveis ?? 7);

      if (novaBarra < 0 || novaBarra > intBarra - ionBarra || dispReator - deltaBarras < 0) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }

      const eraNoFoil = nave.estadoFisico === '1_NO_FOIL';
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
      const trip = nave.tripulacao.find((t) => t.id === p.tripulanteId);
      if (!trip || trip.localizacao !== 'NAVE_JOGADOR' || trip.inflado) {
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
      if (p.trincaSalasBeam && !validarTrincaBeam(p.trincaSalasBeam)) {
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
      const energiaBrq = Number(camBrq?.barrasEnergiaAlocada ?? camBrq?.energiaAlocada ?? 0);
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
      const energiaTinta = Number(camTinta?.barrasEnergiaAlocada ?? camTinta?.energiaAlocada ?? 0);
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
      const energiaTubo = Number(camTubo?.barrasEnergiaAlocada ?? camTubo?.energiaAlocada ?? 0);
      if (energiaTubo < 1 || !Array.isArray(p.tripulantesIds) || p.tripulantesIds.length < 1 || p.tripulantesIds.length > 2) {
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
        estado: resAbord.estado,
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
      const ctxInt = Number(camCtx?.barrasIntegridade ?? camCtx?.integridade ?? 0);
      const sifEne = Number(camSif?.barrasEnergiaAlocada ?? camSif?.energiaAlocada ?? 0);
      const comb = Number(estado.economia?.combustivel ?? estado.recursos?.combustivel ?? 0);
      const cargaPronta = (nave.progressoFugaSeg ?? 0) >= 20.0 || (nave.cargaSaltoPct ?? 0) >= 100;
      if (!cargaPronta || ctxInt < 1 || sifEne < 1 || comb < 1) {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }
      const novaCarteira = {
        ...(estado.economia ?? {}),
        ...(estado.recursos ?? {}),
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
      const baseCarteira = {
        sucata: 30,
        biomassa: 15,
        combustivel: 12,
        municao: 8,
        ...(estado.economia ?? {}),
        ...(estado.recursos ?? {}),
      };
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
      const baseCarteira = {
        sucata: 30,
        biomassa: 15,
        combustivel: 12,
        municao: 8,
        ...(estado.economia ?? {}),
        ...(estado.recursos ?? {}),
      };
      let novaCarteiraLoja = { ...baseCarteira };
      let novoHpCascoLoja = nave.hpCascoAtual;
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
        novosOrgaos = novosOrgaos.filter((id) => id !== orgao.id);
      } else {
        return rejeitarComando(estado, comando, 'PRECONDICAO_NAO_ATENDIDA');
      }

      const novasArmas = nave.armasAtivas.map((s, idx) =>
        idx === p.slotIndex
          ? s.arma !== undefined
            ? { ...s, arma: { ...s.arma, orgaosEnxertados: novosOrgaos } }
            : { ...s, orgaosEnxertados: novosOrgaos }
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
