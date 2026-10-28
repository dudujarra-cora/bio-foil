/**
 * ONDA 6 — Máquina de Estados da Campanha Completa (Setores 1..8, Hangar, Oficina de Upgrades/Enxertos, Saque e Fim de Run)
 * Dono Único (Lei N5): src/onda6-ui/campanha-completa.mjs
 *
 * Responsabilidade única:
 *  - Orquestrar o loop roguelike completo do Bio-Foil no navegador e CLI (`INICIO` -> `MAPA` S1..S8 -> `COMBATE` / `LOJA` / `EVENTO` -> `SAQUE` -> `CHEFE_DRAGA` F1->F2->F3 -> `FIM_DE_RUN`);
 *  - Gerar encontros escalados reais do Bestiário 5.7.A (`BARCO_1..4` e `MONSTRO_1..4`) com curva 5.7.B;
 *  - Executar as 10 Árvores de Upgrade da Seção 5.6.A (`2330` unidades totais na Carcaça Alfa) + gestão completa de Porão de Carga e Enxerto de Órgãos;
 *  - Prover controle tático de Salva Manual (`AUTO` / `MANUAL`), traçado ortogonal assistido de Beam (`3` salas) e movimentação de aliados a bordo (`BORDO_INIMIGO`);
 *  - Sincronizar persistência atômica real em disco (`profile.json` + Permadeath em `run_save.json`).
 */
import { clonarProfundoCongelado } from '../gdd-parser.mjs';
import {
  congelarProfundo,
  criarEstadoInicialPartida,
  CATALOGO_ARMAS_BASE_PESO,
} from '../onda1-fisica/estado-inicial.mjs';
import { streamCombateDisparo } from '../onda1-fisica/hash32-streams.mjs';
import {
  calcularPesoTotalNave,
  calcularSustentacaoFoil,
} from '../onda1-fisica/tick-hidraulica-foil.mjs';
import { avaliarCondicaoDeVitoria } from '../onda3-inimigos/abordagem-vitoria.mjs';
import { sincronizarEnergiaArmasComCamaraArtilharia } from '../onda2-combate/tick-sistemas-armas.mjs';
import {
  CATALOGO_ARMAS_51,
  CATALOGO_ORGAOS_52,
  CATALOGO_BIOMAS_53,
  CATALOGO_NAVES_54,
  ARVORES_UPGRADE_56A,
  TETO_BARRAS_REATOR_COMPRAVEIS,
} from '../onda5-catalogo-chefe/catalogo-naves-itens.mjs';
import { transicionarFaseChefeDraga } from '../onda5-catalogo-chefe/chefe-draga.mjs';
import {
  despacharComandoUi,
  avancarTickPartidaEmTempoReal,
} from './despacho-comandos.mjs';
import {
  ACOES_CAMPANHA_BIOFOIL,
  MODOS_DISPARO_ARMAS,
  calcularTrincaBeamAutomatica,
  gerarAlvoInimigoEscaladoSetor,
  equiparArsenalModularInimigoSteam,
  anexarMapaSetorAoEstado,
  resolverEntradaNoMapaCampanha,
  aplicarRegrasSaquePosCombateCampanha,
  construirDesfechoEventoCanonicamente,
  alternarModoDisparoArma,
  dispararSalvaManualPronta,
  ordenarMovimentoAbordagemInimiga,
} from './encontros-eventos-campanha.mjs';

export {
  ACOES_CAMPANHA_BIOFOIL,
  MODOS_DISPARO_ARMAS,
  calcularTrincaBeamAutomatica,
  gerarAlvoInimigoEscaladoSetor,
  alternarModoDisparoArma,
  dispararSalvaManualPronta,
  ordenarMovimentoAbordagemInimiga,
};
import {
  CARCACAS_PERFIL_85B,
  criarPerfilInicial,
  atualizarPerfilComMetricasRun,
  carregarPerfilDisco,
  salvarPerfilDisco,
  carregarRunSaveDisco,
  salvarRunSaveDisco,
  apagarRunSavePermadeathDisco,
  sincronizarTransicaoPersistenciaDisco,
} from './persistencia-perfil.mjs';
import {
  CATALOGO_24_ARMAS_STEAM,
  CATALOGO_16_ORGAOS_STEAM,
  resolverArmaCatalogoUnificado,
  resolverOrgaoCatalogoUnificado,
  aplicarKitLayoutEDificuldadeSteamNaRun,
  calcularModificadoresPassivosOrgaosSteam,
} from '../onda7-steam/catalogo-armas-orgaos-ae.mjs';
import {
  criarConfiguracoesSteam,
  avaliarConquistasSteam,
  aplicarAcaoMetaSteamNoEstado,
  escalarInimigoPorDificuldade,
} from '../onda7-steam/dificuldades-conquistas-opcoes.mjs';
import {
  criarEstadoTutorialSteam,
  registrarAcaoNoTutorialSteam,
} from '../onda7-steam/tutorial-interativo.mjs';
import { resolverTemplateEventoUnificado } from '../onda7-steam/eventos-ae-setores-5a8.mjs';

const MAPA_ARVORE_PARA_CAMARA = Object.freeze({
  ARTILHARIA_DORSAL: 1,
  CORTEX_NAVEGACAO: 2,
  BOMBA_BRANQUIAL: 3,
  GLANDULA_BARREIRA: 4,
  SIFAO_PROPULSAO: 5,
  MASTRO_FOIL: 6,
  TUBO_PRESSURIZADO: 7,
  GLANDULA_TINTA_FURTIVA: 8,
});

function recalcularHidraulicaNaveImutavel(nave) {
  const pesoTotalKg = calcularPesoTotalNave(nave);
  const sustentacaoAtualKg = calcularSustentacaoFoil(nave);
  let estadoFisico = nave.estadoFisico ?? '1_NO_FOIL';
  if (estadoFisico === '1_NO_FOIL' && pesoTotalKg > sustentacaoAtualKg) {
    estadoFisico = '2_TOUCHDOWN';
  }
  return {
    ...nave,
    pesoTotalKg,
    sustentacaoAtualKg,
    estadoFisico,
  };
}

/**
 * Calcula o nível atual, nível máximo, moeda e custo exato do próximo degrau para qualquer uma das 10 árvores da Seção 5.6.A.
 */
export function calcularCustoProximoUpgradeNave(naveJogador, idArvore, emLojaForja = true) {
  const arvore = ARVORES_UPGRADE_56A.find((a) => a.id === idArvore);
  if (!arvore || !naveJogador) {
    return clonarProfundoCongelado({
      ok: false,
      codigoErro: 'ARVORE_UPGRADE_INEXISTENTE',
      idArvore: String(idArvore ?? ''),
    });
  }

  if (idArvore === 'CORACAO_BIO_ELETRICO') {
    const atual = Number(naveJogador.reator?.barrasCompradas ?? 6);
    const max = TETO_BARRAS_REATOR_COMPRAVEIS;
    if (atual >= max) {
      return clonarProfundoCongelado({
        ok: true,
        idArvore,
        nome: arvore.nome,
        moeda: 'FLEXIVEL',
        nivelAtual: atual,
        nivelMaximo: max,
        proximoNivel: max,
        custoProximo: null,
        exigeForjaLoja: false,
        disponivel: false,
        motivoBloqueio: 'NIVEL_MAXIMO_ATINGIDO',
      });
    }
    const idxCusto = Math.max(0, atual - arvore.nivelInicialAlfa);
    const custo = arvore.custos[idxCusto] ?? 45;
    return clonarProfundoCongelado({
      ok: true,
      idArvore,
      nome: arvore.nome,
      moeda: 'FLEXIVEL',
      nivelAtual: atual,
      nivelMaximo: max,
      proximoNivel: atual + 1,
      custoProximo: custo,
      exigeForjaLoja: false,
      disponivel: true,
      motivoBloqueio: null,
    });
  }

  if (idArvore === 'PLACAS_BLINDAGEM') {
    const atual = Number(naveJogador.nivelBlindagem ?? 0);
    const max = arvore.barrasMax;
    if (atual >= max) {
      return clonarProfundoCongelado({
        ok: true,
        idArvore,
        nome: arvore.nome,
        moeda: arvore.moeda,
        nivelAtual: atual,
        nivelMaximo: max,
        proximoNivel: max,
        custoProximo: null,
        exigeForjaLoja: true,
        disponivel: false,
        motivoBloqueio: 'NIVEL_MAXIMO_ATINGIDO',
      });
    }
    const custo = arvore.custos[atual];
    const disp = Boolean(emLojaForja);
    return clonarProfundoCongelado({
      ok: true,
      idArvore,
      nome: arvore.nome,
      moeda: arvore.moeda,
      nivelAtual: atual,
      nivelMaximo: max,
      proximoNivel: atual + 1,
      custoProximo: custo,
      exigeForjaLoja: true,
      disponivel: disp,
      motivoBloqueio: disp ? null : 'EXIGE_RECIFE_FORJA_LOJA',
    });
  }

  const camaraId = MAPA_ARVORE_PARA_CAMARA[idArvore];
  const camara = (naveJogador.camaras ?? []).find((c) => c.id === camaraId);
  const barrasAtuais = Number(camara?.nivelMaxBarras ?? camara?.nivelMax ?? 0);

  if (idArvore === 'MASTRO_FOIL') {
    const nivelEstagio = Math.max(1, barrasAtuais - 3);
    const maxEstagio = 4; // barrasMax = 7 -> 4 estágios (4, 5, 6, 7 barras)
    if (barrasAtuais >= arvore.barrasMax) {
      return clonarProfundoCongelado({
        ok: true,
        idArvore,
        nome: arvore.nome,
        moeda: arvore.moeda,
        nivelAtual: barrasAtuais,
        nivelMaximo: arvore.barrasMax,
        proximoNivel: arvore.barrasMax,
        custoProximo: null,
        exigeForjaLoja: false,
        disponivel: false,
        motivoBloqueio: 'NIVEL_MAXIMO_ATINGIDO',
      });
    }
    const idx = Math.max(0, nivelEstagio - 1);
    return clonarProfundoCongelado({
      ok: true,
      idArvore,
      nome: arvore.nome,
      moeda: arvore.moeda,
      nivelAtual: barrasAtuais,
      nivelMaximo: arvore.barrasMax,
      proximoNivel: barrasAtuais + 1,
      custoProximo: arvore.custos[idx] ?? 120,
      exigeForjaLoja: false,
      disponivel: true,
      motivoBloqueio: null,
    });
  }

  // Exceção canônica da Seção 5.6.A: Couraça-Limiar sem Barreira (0 -> 2 barras por 60 Biomassa no Recife-Forja)
  if (idArvore === 'GLANDULA_BARREIRA' && barrasAtuais === 0) {
    const disp = Boolean(emLojaForja);
    return clonarProfundoCongelado({
      ok: true,
      idArvore,
      nome: arvore.nome,
      moeda: arvore.moeda,
      nivelAtual: 0,
      nivelMaximo: arvore.barrasMax,
      proximoNivel: 2,
      custoProximo: 60,
      exigeForjaLoja: true,
      disponivel: disp,
      motivoBloqueio: disp ? null : 'EXIGE_RECIFE_FORJA_LOJA',
    });
  }

  // Subsistemas de enxerto nas câmaras 7 e 8: instalar Nv.0 -> Nv.1 exige Recife-Forja; evoluir Nv.1 -> Nv.2 é livre
  const ehInstalacaoSubsistemaZero =
    (idArvore === 'TUBO_PRESSURIZADO' || idArvore === 'GLANDULA_TINTA_FURTIVA') && barrasAtuais === 0;

  if (barrasAtuais >= arvore.barrasMax) {
    return clonarProfundoCongelado({
      ok: true,
      idArvore,
      nome: arvore.nome,
      moeda: arvore.moeda,
      nivelAtual: barrasAtuais,
      nivelMaximo: arvore.barrasMax,
      proximoNivel: arvore.barrasMax,
      custoProximo: null,
      exigeForjaLoja: ehInstalacaoSubsistemaZero,
      disponivel: false,
      motivoBloqueio: 'NIVEL_MAXIMO_ATINGIDO',
    });
  }

  const idxCusto = Math.max(0, barrasAtuais - arvore.nivelInicialAlfa);
  const custo = arvore.custos[idxCusto] ?? arvore.custos[arvore.custos.length - 1];
  const disp = ehInstalacaoSubsistemaZero ? Boolean(emLojaForja) : true;

  return clonarProfundoCongelado({
    ok: true,
    idArvore,
    nome: arvore.nome,
    moeda: arvore.moeda,
    nivelAtual: barrasAtuais,
    nivelMaximo: arvore.barrasMax,
    proximoNivel: barrasAtuais + 1,
    custoProximo: custo,
    exigeForjaLoja: ehInstalacaoSubsistemaZero,
    disponivel: disp,
    motivoBloqueio: disp ? null : 'EXIGE_RECIFE_FORJA_LOJA',
  });
}

/**
 * Executa a compra e instalação imutável de um degrau de qualquer uma das 10 árvores de upgrade da Seção 5.6.A.
 */
export function aplicarUpgradeNaveCampanha(estado, idArvore, opcoes = {}) {
  const fase = estado?.meta?.faseJogo ?? 'MAPA';
  if (fase !== 'MAPA' && fase !== 'LOJA' && fase !== 'EVENTO') {
    return clonarProfundoCongelado({
      ok: false,
      codigoErro: 'REJEITADO_FASE_INVALIDA',
      estado,
    });
  }

  const emLojaForja = fase === 'LOJA' || opcoes.permitirForaDeLoja === true;
  const cotacao = calcularCustoProximoUpgradeNave(estado.naveJogador, idArvore, emLojaForja);
  if (!cotacao.ok) {
    return clonarProfundoCongelado({
      ok: false,
      codigoErro: cotacao.codigoErro,
      estado,
    });
  }
  if (!cotacao.disponivel) {
    return clonarProfundoCongelado({
      ok: false,
      codigoErro: cotacao.motivoBloqueio ?? 'UPGRADE_INDISPONIVEL',
      cotacao,
      estado,
    });
  }

  const baseCarteira = {
    sucata: Number(estado.economia?.sucata ?? estado.recursos?.sucata ?? 0),
    biomassa: Number(estado.economia?.biomassa ?? estado.recursos?.biomassa ?? 0),
    combustivel: Number(estado.economia?.combustivel ?? estado.recursos?.combustivel ?? 0),
    municao: Number(estado.economia?.municao ?? estado.recursos?.municao ?? 0),
  };

  let chaveMoeda = 'sucata';
  if (cotacao.moeda === 'BIOMASSA') {
    chaveMoeda = 'biomassa';
  } else if (cotacao.moeda === 'FLEXIVEL') {
    const pref = String(opcoes.moedaPreferencial ?? 'SUCATA').toUpperCase();
    if (pref === 'BIOMASSA' && baseCarteira.biomassa >= cotacao.custoProximo) {
      chaveMoeda = 'biomassa';
    } else if (baseCarteira.sucata >= cotacao.custoProximo) {
      chaveMoeda = 'sucata';
    } else {
      chaveMoeda = 'biomassa';
    }
  }

  if (baseCarteira[chaveMoeda] < cotacao.custoProximo) {
    return clonarProfundoCongelado({
      ok: false,
      codigoErro: 'MOEDA_INSUFICIENTE',
      moedaExigida: chaveMoeda.toUpperCase(),
      custoExigido: cotacao.custoProximo,
      saldoAtual: baseCarteira[chaveMoeda],
      estado,
    });
  }

  const novaCarteira = {
    ...baseCarteira,
    [chaveMoeda]: baseCarteira[chaveMoeda] - cotacao.custoProximo,
  };

  let novaNave = structuredClone(estado.naveJogador);
  const deltaNivel = cotacao.proximoNivel - cotacao.nivelAtual;

  if (idArvore === 'CORACAO_BIO_ELETRICO') {
    novaNave.reator = {
      ...novaNave.reator,
      barrasCompradas: cotacao.proximoNivel,
      barrasDisponiveis: Number(novaNave.reator?.barrasDisponiveis ?? 0) + deltaNivel,
    };
  } else if (idArvore === 'PLACAS_BLINDAGEM') {
    novaNave.nivelBlindagem = cotacao.proximoNivel;
    novaNave.hpCascoMax = Math.min(45, Number(novaNave.hpCascoMax ?? 30) + 5);
    novaNave.hpCascoAtual = Math.min(novaNave.hpCascoMax, Number(novaNave.hpCascoAtual ?? 30) + 5);
  } else {
    const camaraId = MAPA_ARVORE_PARA_CAMARA[idArvore];
    novaNave.camaras = novaNave.camaras.map((c) => {
      if (c.id !== camaraId) return c;
      const novoSubsistema =
        idArvore === 'TUBO_PRESSURIZADO'
          ? 'TUBO_PRESSURIZADO_ABORDAGEM'
          : idArvore === 'GLANDULA_TINTA_FURTIVA'
            ? 'GLANDULA_TINTA_FURTIVA'
            : c.subsistemaInstalado;
      return {
        ...c,
        subsistemaInstalado: novoSubsistema,
        nivelMaxBarras: cotacao.proximoNivel,
        nivelMax: cotacao.proximoNivel,
        nivelUpgrade: camaraId === 6 ? Math.max(1, cotacao.proximoNivel - 3) : cotacao.proximoNivel,
        barrasIntegridade: Number(c.barrasIntegridade ?? 0) + deltaNivel,
      };
    });
    if (idArvore === 'GLANDULA_BARREIRA') {
      novaNave.barreira = {
        ...(novaNave.barreira ?? {}),
        bolhasMax: Math.floor(cotacao.proximoNivel / 2),
        bolhasAtuais: Number(novaNave.barreira?.bolhasAtuais ?? 0),
      };
    }
  }

  novaNave = recalcularHidraulicaNaveImutavel(novaNave);

  return clonarProfundoCongelado({
    ok: true,
    idArvore,
    novoNivel: cotacao.proximoNivel,
    nivelMaximo: cotacao.nivelMaximo,
    atingiuNivelMaximo: cotacao.proximoNivel >= cotacao.nivelMaximo,
    custoPago: cotacao.custoProximo,
    moedaUsada: chaveMoeda.toUpperCase(),
    estado: {
      ...estado,
      economia: novaCarteira,
      recursos: novaCarteira,
      naveJogador: novaNave,
    },
  });
}

function instanciarArmaDeCatalogo(idArma) {
  const base = CATALOGO_ARMAS_BASE_PESO[idArma];
  const spec51 = CATALOGO_ARMAS_51.find((a) => a.id === idArma) ?? resolverArmaCatalogoUnificado(idArma);
  if (!base && !spec51) return null;
  const chassiId = base?.chassiId ?? spec51.id;
  return {
    chassiId,
    idArma: chassiId,
    nome: base?.nome ?? spec51.nome,
    pesoBaseKg: Number(base?.pesoBaseKg ?? spec51.pesoKg ?? 10),
    energiaCusto: Number(base?.energiaCusto ?? spec51.energia ?? 1),
    energiaAlocada: 0,
    tempoRecargaBaseSeg: Number(base?.tempoRecargaBaseSeg ?? spec51.recargaSeg ?? 9),
    penalidadeOrgaosSeg: 0.0,
    progressoRecargaSeg: 0.0,
    municaoCusto: Number(base?.municaoCusto ?? spec51.municao ?? 0),
    soquetesMax: Number(base?.soquetesMax ?? spec51.soquetes ?? 1),
    cargasMaximas: Math.max(1, Number(spec51?.cargasMaximas ?? 1)),
    cargasEstocadas: 0,
    ...(spec51?.tipoEspecial ? { tipoEspecial: spec51.tipoEspecial } : {}),
    ...(spec51?.ehFeixe !== undefined ? { ehFeixe: Boolean(spec51.ehFeixe) } : {}),
    ...(spec51?.exigeSalaSubmersa !== undefined ? { exigeSalaSubmersa: Boolean(spec51.exigeSalaSubmersa) } : {}),
    orgaosEnxertados: [],
    salaAlvoId: null,
    trincaSalasBeam: null,
    modoDisparoManual: false,
    disparoManualAutorizado: false,
  };
}

/**
 * Gerencia equipamento entre Porão de Carga (4 slots), Armas Dorsais (4 slots) e Órgãos Bio-Sintéticos em `MAPA` e `LOJA`.
 */
export function gerenciarEquipamentoPoraoEOrgaos(estado, operacao = {}) {
  const fase = estado?.meta?.faseJogo ?? 'MAPA';
  if (fase !== 'MAPA' && fase !== 'LOJA' && fase !== 'EVENTO') {
    return clonarProfundoCongelado({
      ok: false,
      codigoErro: 'REJEITADO_FASE_INVALIDA',
      estado,
    });
  }

  const tipo = String(operacao.tipo ?? '').toUpperCase();
  const poraoAtual = [...(estado.naveJogador?.poraoCarga ?? [])];
  while (poraoAtual.length < 4) {
    poraoAtual.push({ slotIndex: poraoAtual.length, item: null });
  }
  const armasAtuais = [...(estado.naveJogador?.armasAtivas ?? [])];

  if (tipo === 'DESCARTAR_ITEM_PORAO') {
    const idxPorao = Number(operacao.indicePorao);
    if (!Number.isInteger(idxPorao) || idxPorao < 0 || idxPorao >= poraoAtual.length || !poraoAtual[idxPorao]?.item) {
      return clonarProfundoCongelado({ ok: false, codigoErro: 'SLOT_PORAO_VAZIO', estado });
    }
    const itemDescartado = poraoAtual[idxPorao].item;
    const novoPorao = poraoAtual.map((s, idx) => (idx === idxPorao ? { slotIndex: idx, item: null } : s));
    const novaNave = recalcularHidraulicaNaveImutavel({
      ...estado.naveJogador,
      poraoCarga: novoPorao,
    });
    return clonarProfundoCongelado({
      ok: true,
      itemDescartado,
      estado: { ...estado, naveJogador: novaNave },
    });
  }

  if (tipo === 'EQUIPAR_ARMA_PORAO') {
    const idxPorao = Number(operacao.indicePorao);
    const itemPorao = poraoAtual[idxPorao]?.item;
    if (!itemPorao || itemPorao.tipo !== 'ARMA') {
      return clonarProfundoCongelado({ ok: false, codigoErro: 'ITEM_PORAO_NAO_EH_ARMA', estado });
    }
    const novaInstancia = instanciarArmaDeCatalogo(itemPorao.id);
    if (!novaInstancia) {
      return clonarProfundoCongelado({ ok: false, codigoErro: 'ARMA_CATALOGO_DESCONHECIDA', estado });
    }
    const limiteSlots = Math.max(1, Math.min(4, Number(estado.naveJogador?.slotsArmasMax ?? 4)));
    const slotLivreIdx = armasAtuais.findIndex((s, idx) => idx < limiteSlots && !(s?.arma ?? s));
    const idxDestino =
      Number.isInteger(operacao.slotArmaIndex) && operacao.slotArmaIndex >= 0 && operacao.slotArmaIndex < limiteSlots
        ? operacao.slotArmaIndex
        : slotLivreIdx;
    if (idxDestino < 0) {
      return clonarProfundoCongelado({ ok: false, codigoErro: 'SEM_SLOT_ARMA_LIVRE', estado });
    }

    const armaAntiga = armasAtuais[idxDestino]?.arma ?? null;
    if (armaAntiga && Array.isArray(armaAntiga.orgaosEnxertados) && armaAntiga.orgaosEnxertados.length > 0) {
      return clonarProfundoCongelado({
        ok: false,
        codigoErro: 'REMOVA_ORGAOS_ANTES_DE_TROCAR_ARMA',
        estado,
      });
    }

    const novasArmasBrutas = armasAtuais.map((s, idx) =>
      idx === idxDestino ? { slotIndex: idx, arma: novaInstancia } : { ...s }
    );
    const novasArmas = sincronizarEnergiaArmasComCamaraArtilharia(
      { ...estado.naveJogador, armasAtivas: novasArmasBrutas },
      { redistribuir: true }
    ).armasAtivas;

    const novoPorao = poraoAtual.map((s, idx) => {
      if (idx !== idxPorao) return s;
      return armaAntiga
        ? {
            slotIndex: idx,
            item: {
              id: armaAntiga.chassiId,
              tipo: 'ARMA',
              pesoKg: Number(armaAntiga.pesoBaseKg ?? 10),
            },
          }
        : { slotIndex: idx, item: null };
    });

    const novaNave = recalcularHidraulicaNaveImutavel({
      ...estado.naveJogador,
      armasAtivas: novasArmas,
      poraoCarga: novoPorao,
    });
    return clonarProfundoCongelado({
      ok: true,
      slotArmaIndex: idxDestino,
      estado: { ...estado, naveJogador: novaNave },
    });
  }

  if (tipo === 'DESEQUIPAR_ARMA_PARA_PORAO') {
    const idxArma = Number(operacao.slotArmaIndex);
    const armaAtual = armasAtuais[idxArma]?.arma ?? null;
    if (!armaAtual) {
      return clonarProfundoCongelado({ ok: false, codigoErro: 'SLOT_ARMA_VAZIO', estado });
    }
    if ((armaAtual.orgaosEnxertados?.length ?? 0) > 0) {
      return clonarProfundoCongelado({ ok: false, codigoErro: 'REMOVA_ORGAOS_ANTES_DE_GUARDAR', estado });
    }
    const idxLivre = poraoAtual.findIndex((s) => !s?.item);
    if (idxLivre < 0) {
      return clonarProfundoCongelado({ ok: false, codigoErro: 'PORAO_LOTADO', estado });
    }
    const novasArmasBrutas = armasAtuais.map((s, idx) => (idx === idxArma ? { slotIndex: idx, arma: null } : s));
    const novasArmas = sincronizarEnergiaArmasComCamaraArtilharia(
      { ...estado.naveJogador, armasAtivas: novasArmasBrutas },
      { redistribuir: true }
    ).armasAtivas;
    const novoPorao = poraoAtual.map((s, idx) =>
      idx === idxLivre
        ? {
            slotIndex: idx,
            item: {
              id: armaAtual.chassiId,
              tipo: 'ARMA',
              pesoKg: Number(armaAtual.pesoBaseKg ?? 10),
            },
          }
        : s
    );
    const novaNave = recalcularHidraulicaNaveImutavel({
      ...estado.naveJogador,
      armasAtivas: novasArmas,
      poraoCarga: novoPorao,
    });
    return clonarProfundoCongelado({
      ok: true,
      indicePorao: idxLivre,
      estado: { ...estado, naveJogador: novaNave },
    });
  }

  if (tipo === 'ENXERTAR_ORGAO_PORAO') {
    const idxPorao = Number(operacao.indicePorao);
    const idxArma = Number(operacao.slotArmaIndex ?? 0);
    const itemPorao = poraoAtual[idxPorao]?.item;
    if (!itemPorao || itemPorao.tipo !== 'ORGAO') {
      return clonarProfundoCongelado({ ok: false, codigoErro: 'ITEM_PORAO_NAO_EH_ORGAO', estado });
    }
    const estadoParaEnx =
      fase === 'LOJA' || fase === 'EVENTO'
        ? congelarProfundo({ ...estado, meta: { ...estado.meta, faseJogo: 'MAPA' } })
        : estado;
    const resEnx = despacharComandoUi(estadoParaEnx, {
      tipo: 'ENXERTAR_ORGAO',
      payload: {
        slotIndex: idxArma,
        orgaoId: itemPorao.id,
        acao: 'ENCAIXAR',
      },
    });
    if (!resEnx.aceito) {
      const ehEnEnx = estado.meta?.configuracoesSteam?.idioma === 'en-US';
      const avisoPassivo =
        resEnx.marcadorRejeicao === 'ORGAO_PASSIVO_EXIGE_PORAO_SIMBIOTICO'
          ? ehEnEnx
            ? 'PASSIVE IMPLANT ACTIVE IN HOLD — CANNOT SOCKET INTO WEAPON'
            : 'IMPLANTE PASSIVO JÁ ATUA NO PORÃO — NÃO USA SOQUETE DE ARMA'
          : null;
      return clonarProfundoCongelado({
        ok: false,
        codigoErro: resEnx.marcadorRejeicao ?? 'FALHA_ENXERTAR_ORGAO',
        estado: avisoPassivo
          ? { ...estado, meta: { ...(estado.meta ?? {}), ultimoAvisoCampanha: avisoPassivo } }
          : estado,
      });
    }
    const novoPorao = resEnx.estado.naveJogador.poraoCarga.map((s, idx) =>
      idx === idxPorao ? { slotIndex: idx, item: null } : s
    );
    const novaNave = recalcularHidraulicaNaveImutavel({
      ...resEnx.estado.naveJogador,
      poraoCarga: novoPorao,
    });
    return clonarProfundoCongelado({
      ok: true,
      orgaoId: itemPorao.id,
      slotArmaIndex: idxArma,
      estado: {
        ...resEnx.estado,
        meta: { ...resEnx.estado.meta, faseJogo: fase },
        naveJogador: novaNave,
      },
    });
  }

  if (tipo === 'REMOVER_ORGAO_PARA_PORAO') {
    const idxArma = Number(operacao.slotArmaIndex ?? 0);
    const armaAtual = armasAtuais[idxArma]?.arma ?? null;
    const orgaos = armaAtual?.orgaosEnxertados ?? [];
    if (!armaAtual || orgaos.length === 0) {
      return clonarProfundoCongelado({ ok: false, codigoErro: 'ARMA_SEM_ORGAOS_ENXERTADOS', estado });
    }
    const idxLivre = poraoAtual.findIndex((s) => !s?.item);
    if (idxLivre < 0) {
      return clonarProfundoCongelado({ ok: false, codigoErro: 'PORAO_LOTADO', estado });
    }
    const orgaoId = operacao.orgaoId ?? orgaos[orgaos.length - 1];
    const estadoParaRem =
      fase === 'LOJA' || fase === 'EVENTO'
        ? congelarProfundo({ ...estado, meta: { ...estado.meta, faseJogo: 'MAPA' } })
        : estado;
    const resRem = despacharComandoUi(estadoParaRem, {
      tipo: 'ENXERTAR_ORGAO',
      payload: {
        slotIndex: idxArma,
        orgaoId,
        acao: 'REMOVER',
      },
    });
    if (!resRem.aceito) {
      return clonarProfundoCongelado({
        ok: false,
        codigoErro: resRem.marcadorRejeicao ?? 'FALHA_REMOVER_ORGAO',
        estado,
      });
    }
    const specOrg = CATALOGO_ORGAOS_52.find((o) => o.id === orgaoId) ?? resolverOrgaoCatalogoUnificado(orgaoId);
    const novoPorao = resRem.estado.naveJogador.poraoCarga.map((s, idx) =>
      idx === idxLivre
        ? {
            slotIndex: idx,
            item: {
              id: orgaoId,
              tipo: 'ORGAO',
              pesoKg: Number(specOrg?.pesoKg ?? 5),
            },
          }
        : s
    );
    const novaNave = recalcularHidraulicaNaveImutavel({
      ...resRem.estado.naveJogador,
      poraoCarga: novoPorao,
    });
    return clonarProfundoCongelado({
      ok: true,
      orgaoId,
      indicePorao: idxLivre,
      estado: {
        ...resRem.estado,
        meta: { ...resRem.estado.meta, faseJogo: fase },
        naveJogador: novaNave,
      },
    });
  }

  return clonarProfundoCongelado({
    ok: false,
    codigoErro: 'OPERACAO_EQUIPAMENTO_DESCONHECIDA',
    estado,
  });
}

/**
 * Cria o estado completo de uma sessão de campanha jogável, começando no Hangar (`INICIO`) ou diretamente em `MAPA`/`COMBATE`,
 * lendo opcionalmente `profile.json` e `run_save.json` do disco.
 */
export function criarEstadoCampanhaCompleta(opcoes = {}) {
  const usarDisco = opcoes.persistirEmDisco === true;
  const perfilDisco = usarDisco ? carregarPerfilDisco(opcoes).perfil : null;
  const perfil = clonarProfundoCongelado(opcoes.perfilInicial ?? perfilDisco ?? criarPerfilInicial());
  const runSalvaInfo = usarDisco
    ? carregarRunSaveDisco(opcoes)
    : { status: opcoes.runSalvaInicial ? 'ENCONTRADO' : 'AUSENTE', estadoRun: opcoes.runSalvaInicial ?? null };

  const idArquitetura = CARCACAS_PERFIL_85B.some((c) => c.idArquitetura === opcoes.idArquitetura)
    ? opcoes.idArquitetura
    : 'CARCACA_ALFA';
  const seedPartida = String(opcoes.seedPartida ?? 'biofoil-campanha-0001');
  const faseInicial = opcoes.faseInicial ?? 'INICIO';
  const setorInicial = Math.max(1, Math.min(8, Math.floor(Number(opcoes.setorNumero ?? 1) || 1)));

  const ehEdicaoSteam = Boolean(opcoes.edicaoComercialSteam);
  let base = criarEstadoInicialPartida({
    idArquitetura,
    seedPartida,
    faseJogo: faseInicial === 'INICIO' ? 'INICIO' : faseInicial,
    setorNumero: setorInicial,
    biomaId: (CATALOGO_BIOMAS_53[setorInicial - 1] ?? CATALOGO_BIOMAS_53[0]).id,
  });

  const cfgSteamResolvida = ehEdicaoSteam
    ? criarConfiguracoesSteam(
        opcoes.configuracoesSteam ?? perfil.configuracoesSteam ?? { dificuldadePadrao: opcoes.dificuldade ?? 'NORMAL' }
      )
    : null;
  const difSteamResolvida = ehEdicaoSteam
    ? (opcoes.dificuldade ?? cfgSteamResolvida?.dificuldadePadrao ?? 'NORMAL')
    : 'NORMAL';

  if (ehEdicaoSteam) {
    base = aplicarKitLayoutEDificuldadeSteamNaRun(base, {
      idArquitetura,
      variante: opcoes.variante ?? 'A',
      dificuldade: difSteamResolvida,
      configuracoesSteam: cfgSteamResolvida,
    });
    const navSinc = recalcularHidraulicaNaveImutavel(base.naveJogador);
    base = { ...base, naveJogador: navSinc };
  }

  base = anexarMapaSetorAoEstado(base, seedPartida, setorInicial);
  const alvoInicialBase =
    faseInicial === 'COMBATE'
      ? gerarAlvoInimigoEscaladoSetor(seedPartida, setorInicial, 'NO_INICIAL', opcoes)
      : { ...base.alvoCombate, ativo: false };
  const alvoInicialEsc =
    ehEdicaoSteam && faseInicial === 'COMBATE'
      ? escalarInimigoPorDificuldade(alvoInicialBase, difSteamResolvida, setorInicial)
      : alvoInicialBase;
  const alvoInicial =
    ehEdicaoSteam && faseInicial === 'COMBATE'
      ? equiparArsenalModularInimigoSteam(alvoInicialEsc, seedPartida, setorInicial, 'NO_INICIAL')
      : alvoInicialEsc;

  return clonarProfundoCongelado({
    ...base,
    meta: {
      ...base.meta,
      faseJogo: faseInicial,
      modoCampanhaCompleta: true,
      edicaoComercialSteam: ehEdicaoSteam,
      ...(ehEdicaoSteam
        ? {
            layoutId: base.naveJogador?.layoutId ?? `${idArquitetura}_${opcoes.variante === 'B' ? 'B' : 'A'}`,
            varianteHangar: opcoes.variante === 'B' ? 'B' : 'A',
            dificuldade: difSteamResolvida,
            configuracoesSteam: cfgSteamResolvida,
            modalSteamAtivo: opcoes.modalSteamAtivo ?? null,
            tutorialSteam: opcoes.tutorialSteam ?? criarEstadoTutorialSteam(false),
            ...(faseInicial === 'COMBATE'
              ? {
                  hpCascoJogadorInicioLuta: Number(base.naveJogador?.hpCascoAtual ?? 0),
                  tripulacaoVivosInicioLutaCount: (base.naveJogador?.tripulacao ?? []).filter(
                    (t) => Number(t.hpAtual ?? 0) > 0
                  ).length,
                  telemetriaCombateSteam: {},
                }
              : {}),
            conquistasDesbloqueadas: Array.isArray(opcoes.conquistasDesbloqueadas)
              ? [...opcoes.conquistasDesbloqueadas]
              : (perfil.conquistasSteamDesbloqueadas ?? []),
            layoutsTipoBDesbloqueados: Array.isArray(opcoes.layoutsTipoBDesbloqueados)
              ? [...opcoes.layoutsTipoBDesbloqueados]
              : (perfil.layoutsTipoBDesbloqueados ?? []),
          }
        : {}),
      modalCampanhaAtivo: null,
      moedaPreferencialReator: 'SUCATA',
      audioMutado: false,
      carcacaSelecionadaHangar: idArquitetura,
      temRunSalvaDisponivel: Boolean((runSalvaInfo.status === 'ENCONTRADO' || runSalvaInfo.existeRunSalva) && runSalvaInfo.estadoRun),
      desfechoRun: null,
      carcacasDesbloqueadasAntesDaRun: { ...(perfil.carcacasDesbloqueadas ?? { CARCACA_ALFA: true }) },
      layoutsTipoBAntesDaRun: [...(perfil.layoutsTipoBDesbloqueados ?? [])],
      metricasRun: {
        setorMaximoAlcancado: setorInicial,
        combatesVencidos: 0,
        barcosCapturadosIntactosNaRun: 0,
        orgaosIntactosExtraidosNaRun: 0,
        venceuCombateSetor4SemDanoCascoInimigo: false,
        derrotouDragaFase3: false,
        sucataAcumuladaTotal: Number(base.economia?.sucata ?? 30),
        biomassaAcumuladaTotal: Number(base.economia?.biomassa ?? 15),
        novosDesbloqueiosNestaRun: [],
      },
      saquePendente: null,
      ultimoAvisoCampanha:
        ehEdicaoSteam && faseInicial === 'COMBATE'
          ? cfgSteamResolvida?.idioma === 'en-US'
            ? `HOSTILE CONTACT: ${
                ({
                  BARCO_1_LANCHA: 'PATROL CUTTER',
                  BARCO_2_CORVETA: 'SONAR CORVETTE',
                  BARCO_3_ARRASTAO: 'SHIELD TRAWLER',
                  BARCO_4_SUBMARINO: 'ASSAULT SUBMARINE',
                  MONSTRO_1_TEUTHIS: 'ARMORED TEUTHIS',
                  MONSTRO_2_ENGUIA: 'BIO-ELECTRIC EEL',
                  MONSTRO_3_CARANGUEJO: 'BASALT ROCK-CRAB',
                  MONSTRO_4_HIDRA: 'CRATER THERMO-HYDRA',
                  CHEFE_DRAGA_FASE_1: 'CONTINENTAL DREDGE F1',
                  CHEFE_DRAGA_FASE_2: 'CONTINENTAL DREDGE F2',
                  CHEFE_DRAGA_FASE_3: 'CONTINENTAL DREDGE F3',
                })[alvoInicial?.arquetipoId] ?? 'HOSTILE TARGET'
              }`
            : `CONTATO HOSTIL: ${alvoInicial?.nome ?? 'ALVO HOSTIL'}`
          : null,
    },
    perfilJogador: perfil,
    catalogoHangarNaves: CATALOGO_NAVES_54.map((n) => ({
      id: n.idArquitetura,
      nome: n.nome,
      estilo: n.estiloTatico,
      chassiKg: n.pesoChassiKg,
      hpMax: n.hpCascoMax,
      desbloqueada: Boolean(perfil.carcacasDesbloqueadas?.[n.idArquitetura]),
    })),
    alvoCombate: alvoInicial,
  });
}

function iniciarNovaRunDoHangar(estadoAtual, idArquiteturaEscolhida, seedNova, opcoesPersistencia = {}) {
  const perfil = estadoAtual.perfilJogador ?? criarPerfilInicial();
  const idArq = CARCACAS_PERFIL_85B.some((c) => c.idArquitetura === idArquiteturaEscolhida)
    ? idArquiteturaEscolhida
    : (estadoAtual.meta?.carcacaSelecionadaHangar ?? 'CARCACA_ALFA');

  if (!perfil.carcacasDesbloqueadas?.[idArq] && opcoesPersistencia.ignorarBloqueioCarcaca !== true) {
    return clonarProfundoCongelado({
      ok: false,
      codigoErro: 'CARCACA_BLOQUEADA_NO_PERFIL',
      idArquitetura: idArq,
      estado: estadoAtual,
    });
  }

  const perfilIncrementado = atualizarPerfilComMetricasRun(perfil, { incrementarRunsIniciadas: 1 });
  const seed = String(seedNova ?? `biofoil-run-${Number(perfilIncrementado.estatisticasGlobais?.runsIniciadas ?? 1)}`);
  const ehSteamRun = Boolean(estadoAtual.meta?.edicaoComercialSteam || opcoesPersistencia.iniciarTutorialCombate);
  const iniciarEmCombateTutorial = Boolean(opcoesPersistencia.iniciarTutorialCombate);

  let novoEstado = criarEstadoCampanhaCompleta({
    ...opcoesPersistencia,
    perfilInicial: perfilIncrementado,
    idArquitetura: idArq,
    seedPartida: seed,
    faseInicial: iniciarEmCombateTutorial ? 'COMBATE' : 'MAPA',
    setorNumero: 1,
    persistirEmDisco: false,
    ...(ehSteamRun
      ? {
          edicaoComercialSteam: true,
          variante: iniciarEmCombateTutorial ? 'A' : (estadoAtual.meta?.varianteHangar ?? 'A'),
          dificuldade: estadoAtual.meta?.dificuldade ?? 'NORMAL',
          configuracoesSteam: estadoAtual.meta?.configuracoesSteam,
          conquistasDesbloqueadas: estadoAtual.meta?.conquistasDesbloqueadas ?? [],
          tutorialSteam: iniciarEmCombateTutorial
            ? criarEstadoTutorialSteam(true)
            : (estadoAtual.meta?.tutorialSteam ?? criarEstadoTutorialSteam(false)),
        }
      : {}),
  });

  const ehEnNovaRun = ehSteamRun && novoEstado.meta?.configuracoesSteam?.idioma === 'en-US';
  novoEstado = {
    ...novoEstado,
    meta: {
      ...novoEstado.meta,
      temRunSalvaDisponivel: true,
      ultimoAvisoCampanha: iniciarEmCombateTutorial
        ? novoEstado.meta?.ultimoAvisoCampanha ?? (ehEnNovaRun ? 'TACTICAL TRAINING ENGAGED' : 'TREINAMENTO TÁTICO ATIVO')
        : ehEnNovaRun
          ? 'SECTOR 1: Shallow Scrap Atolls'
          : `SETOR 1: ${novoEstado.meta.nomeBioma}`,
    },
  };

  if (opcoesPersistencia.persistirEmDisco === true) {
    salvarPerfilDisco(perfilIncrementado, opcoesPersistencia);
    salvarRunSaveDisco(novoEstado, opcoesPersistencia);
  }

  return clonarProfundoCongelado({
    ok: true,
    acaoExecutada: 'INICIAR_NOVA_RUN',
    estado: novoEstado,
  });
}

function contarArsenalEOrgaosNaveSteam(nave) {
  const armasAtivasSimultaneas = (nave?.armasAtivas ?? []).filter((s) => Boolean(s?.arma ?? s)).length;
  const orgaosEmArmas = (nave?.armasAtivas ?? []).reduce((acc, s) => {
    const arma = s?.arma ?? s;
    return acc + (Array.isArray(arma?.orgaosEnxertados) ? arma.orgaosEnxertados.length : 0);
  }, 0);
  const orgaosNoPorao = (nave?.poraoCarga ?? []).filter(
    (s) =>
      s?.item?.tipo === 'ORGAO' ||
      s?.tipo === 'ORGAO' ||
      s?.categoria === 'ORGAO' ||
      Boolean(resolverOrgaoCatalogoUnificado(s?.item?.id ?? s?.id))
  ).length;
  const tripulacaoViva = (nave?.tripulacao ?? []).filter((t) => Number(t.hpAtual ?? 0) > 0);
  const especiesDistintasVivasABordo = new Set(tripulacaoViva.map((t) => t.especie)).size;
  const pctCascoAtual = Math.round(
    (Number(nave?.hpCascoAtual ?? 0) / Math.max(1, Number(nave?.hpCascoMax ?? 30))) * 100
  );
  return {
    armasAtivasSimultaneas,
    orgaosAtivosSimultaneos: orgaosEmArmas + orgaosNoPorao,
    especiesDistintasVivasABordo,
    pctCascoAtual,
  };
}

function sincronizarEstadoEConquistasSteam(estadoBruto, telemetriaExtra = {}, opcoesPersistencia = {}) {
  if (!estadoBruto?.meta?.edicaoComercialSteam) return estadoBruto;
  let est = estadoBruto;
  if (
    est.mapaSetorial &&
    est.mapaSetorial.cartaRevelada !== true &&
    calcularModificadoresPassivosOrgaosSteam(est.naveJogador).revelaNosAdjacentesMapa === true
  ) {
    est = {
      ...est,
      mapaSetorial: {
        ...est.mapaSetorial,
        cartaRevelada: true,
      },
    };
  }
  const mr = est.meta?.metricasRun ?? {};
  const telComb = est.meta?.telemetriaCombateSteam ?? {};
  const perfilBase = est.perfilJogador ?? criarPerfilInicial();
  const jaDesbloqueadas = [
    ...(perfilBase.conquistasSteamDesbloqueadas ?? []),
    ...(est.meta?.conquistasDesbloqueadas ?? []),
  ];
  const aval = avaliarConquistasSteam(
    {
      especieNave: est.naveJogador?.idArquitetura,
      setorAtual: Number(est.mapaSetorial?.setorNumero ?? est.meta?.setorAtual ?? 1),
      dificuldade: est.meta?.dificuldade ?? 'NORMAL',
      saltosRealizados: Number(mr.saltosRealizadosNaRun ?? 0),
      blueOptionsResolvidasNaRun: Number(mr.blueOptionsResolvidasNaRun ?? 0),
      questsConcluidasNaRun: Number(mr.questsConcluidasNaRun ?? 0),
      sistemaNoNivelMaximo: Boolean(mr.evoluiuSistemaNivelMaximoNaRun),
      tutorialConcluido: Boolean(est.meta?.tutorialSteam?.concluido),
      aguaDrenadaNaLutaKg: Number(telComb.aguaDrenadaNaLutaKg ?? 0),
      sistemasInimigosIonizadosSimultaneos: Number(telComb.sistemasInimigosIonizadosSimultaneos ?? 0),
      impactosAbsorvidosOuDefletidosNaLuta: Number(telComb.impactosAbsorvidosOuDefletidosNaLuta ?? 0),
      feixeDisparadoSobTintaFurtiva: Boolean(telComb.feixeDisparadoSobTintaFurtiva),
      esquivouEmMergulhoTatico: Boolean(telComb.esquivouEmMergulhoTatico),
      ...contarArsenalEOrgaosNaveSteam(est.naveJogador),
      layoutsTipoBDesbloqueados: [
        ...(perfilBase.layoutsTipoBDesbloqueados ?? []),
        ...(est.meta?.layoutsTipoBDesbloqueados ?? []),
      ],
      ...telemetriaExtra,
    },
    jaDesbloqueadas
  );
  if (aval.novosDesbloqueados.length === 0 && est === estadoBruto) {
    return estadoBruto;
  }
  const perfilPos = atualizarPerfilComMetricasRun(perfilBase, {
    conquistasSteamDesbloqueadas: aval.todosDesbloqueados,
    layoutsTipoBDesbloqueados: aval.layoutsTipoBDesbloqueados,
    configuracoesSteam: est.meta?.configuracoesSteam,
  });
  if (opcoesPersistencia.persistirEmDisco === true && aval.novosDesbloqueados.length > 0) {
    salvarPerfilDisco(perfilPos, opcoesPersistencia);
  }
  return congelarProfundo({
    ...est,
    perfilJogador: perfilPos,
    meta: {
      ...est.meta,
      conquistasDesbloqueadas: [...aval.todosDesbloqueados],
      layoutsTipoBDesbloqueados: [...aval.layoutsTipoBDesbloqueados],
      ...(aval.novosDesbloqueados.length > 0
        ? {
            popupConquistaRecente: {
              idConquista: aval.novosDesbloqueados[0],
              idsNovas: [...aval.novosDesbloqueados],
              restanteSeg: 4.5,
            },
          }
        : {}),
    },
  });
}

export function sincronizarProgressoTutorialSteamNoEstado(estadoBruto, chaveAcao, opcoesPersistencia = {}) {
  if (!estadoBruto?.meta?.edicaoComercialSteam || !estadoBruto?.meta?.tutorialSteam?.ativo) {
    return estadoBruto;
  }
  const cmdLimpo = String(chaveAcao ?? '').trim().toUpperCase();
  if (!cmdLimpo) return estadoBruto;
  const tutAnt = estadoBruto.meta.tutorialSteam;
  const tutProx = registrarAcaoNoTutorialSteam(tutAnt, cmdLimpo);
  if (tutProx === tutAnt) return estadoBruto;
  let estAtu = congelarProfundo({
    ...estadoBruto,
    meta: {
      ...estadoBruto.meta,
      tutorialSteam: tutProx,
    },
  });
  if (tutProx.concluido) {
    estAtu = sincronizarEstadoEConquistasSteam(estAtu, { tutorialConcluido: true }, opcoesPersistencia);
  }
  if (opcoesPersistencia.persistirEmDisco === true) {
    const faseT = estAtu.meta?.faseJogo;
    if (faseT && faseT !== 'INICIO' && faseT !== 'FIM_DE_RUN') {
      salvarRunSaveDisco(estAtu, opcoesPersistencia);
    }
  }
  return estAtu;
}

function finalizarRunComPersistencia(estado, desfechoRun, opcoesPersistencia = {}) {
  const metricasRun = {
    ...(estado.meta?.metricasRun ?? {}),
    setorMaximoAlcancado: Math.max(
      Number(estado.meta?.metricasRun?.setorMaximoAlcancado ?? 1),
      Number(estado.mapaSetorial?.setorNumero ?? estado.meta?.setorAtual ?? 1)
    ),
    derrotouDragaFase3: desfechoRun === 'VITORIA_CAMPANHA',
  };
  const transicao =
    desfechoRun === 'VITORIA_CAMPANHA'
      ? 'TR_7B_VITORIA_FINAL'
      : estado.meta?.faseJogo === 'EVENTO'
        ? 'TR_7C_DERROTA_EM_EVENTO'
        : 'TR_7A_DERROTA_EM_COMBATE';
  const perfilBase = estado.perfilJogador ?? criarPerfilInicial();
  const ehSteamFim = Boolean(estado.meta?.edicaoComercialSteam);
  const contNaveFim = ehSteamFim ? contarArsenalEOrgaosNaveSteam(estado.naveJogador) : null;
  const telFim = estado.meta?.telemetriaCombateSteam ?? {};
  const avalConqFim = ehSteamFim
    ? avaliarConquistasSteam(
        {
          especieNave: estado.naveJogador?.idArquitetura,
          setorAtual: metricasRun.setorMaximoAlcancado,
          dificuldade: estado.meta?.dificuldade ?? 'NORMAL',
          vitoriaCampanhaDraga: desfechoRun === 'VITORIA_CAMPANHA',
          saltosRealizados: Number(metricasRun.saltosRealizadosNaRun ?? metricasRun.combatesVencidos ?? 0),
          capturaIntactaRealizada:
            Number(metricasRun.barcosCapturadosIntactosNaRun ?? 0) > 0 ||
            Number(metricasRun.orgaosIntactosExtraidosNaRun ?? 0) > 0,
          blueOptionsResolvidasNaRun: Number(metricasRun.blueOptionsResolvidasNaRun ?? 0),
          questsConcluidasNaRun: Number(metricasRun.questsConcluidasNaRun ?? 0),
          sistemaNoNivelMaximo: Boolean(metricasRun.evoluiuSistemaNivelMaximoNaRun),
          tutorialConcluido: Boolean(estado.meta?.tutorialSteam?.concluido),
          aguaDrenadaNaLutaKg: Number(telFim.aguaDrenadaNaLutaKg ?? 0),
          sistemasInimigosIonizadosSimultaneos: Number(telFim.sistemasInimigosIonizadosSimultaneos ?? 0),
          impactosAbsorvidosOuDefletidosNaLuta: Number(telFim.impactosAbsorvidosOuDefletidosNaLuta ?? 0),
          feixeDisparadoSobTintaFurtiva: Boolean(telFim.feixeDisparadoSobTintaFurtiva),
          esquivouEmMergulhoTatico: Boolean(telFim.esquivouEmMergulhoTatico),
          ...(desfechoRun === 'VITORIA_CAMPANHA'
            ? {
                vitoriaCombateSemTouchdown:
                  !Boolean(telFim.caiuEmTouchdownNaLuta) && estado.naveJogador?.estadoFisico === '1_NO_FOIL',
                vitoriaEmTouchdownSemMortes:
                  estado.naveJogador?.estadoFisico !== '1_NO_FOIL' &&
                  !Boolean(telFim.sofreuMorteTripulanteNaLuta) &&
                  (estado.naveJogador?.tripulacao ?? []).filter((t) => Number(t.hpAtual ?? 0) > 0).length >=
                    Number(
                      estado.meta?.tripulacaoVivosInicioLutaCount ??
                        (estado.naveJogador?.tripulacao ?? []).filter((t) => Number(t.hpAtual ?? 0) > 0).length
                    ),
                vitoriaCombateZeroDanoCasco: !Boolean(telFim.sofreuDanoCascoNaLuta),
              }
            : {}),
          ...contNaveFim,
          layoutsTipoBDesbloqueados: [
            ...(perfilBase.layoutsTipoBDesbloqueados ?? []),
            ...(estado.meta?.layoutsTipoBDesbloqueados ?? []),
          ],
        },
        [
          ...(perfilBase.conquistasSteamDesbloqueadas ?? []),
          ...(estado.meta?.conquistasDesbloqueadas ?? []),
        ]
      )
    : null;
  const contextoMetricasPerfil = {
    setorNumero: metricasRun.setorMaximoAlcancado,
    setorNumeroAlcanceMaxNestaRun: metricasRun.setorMaximoAlcancado,
    barcosCapturadosIntactosNestaRun: Number(metricasRun.barcosCapturadosIntactosNaRun ?? 0),
    orgaosIntactosExtraidosNestaRun: Number(metricasRun.orgaosIntactosExtraidosNaRun ?? 0),
    vitoriaCombate: Boolean(metricasRun.venceuCombateSetor4SemDanoCascoInimigo || desfechoRun === 'VITORIA_CAMPANHA'),
    danoCascoCausadoAoInimigoNestaLuta: metricasRun.venceuCombateSetor4SemDanoCascoInimigo ? 0 : 99,
    incrementarVitoriasFinais: desfechoRun === 'VITORIA_CAMPANHA' ? 1 : 0,
    ...(avalConqFim
      ? {
          conquistasSteamDesbloqueadas: avalConqFim.todosDesbloqueados,
          layoutsTipoBDesbloqueados: avalConqFim.layoutsTipoBDesbloqueados,
          configuracoesSteam: estado.meta?.configuracoesSteam,
        }
      : {}),
  };
  const perfilPos = atualizarPerfilComMetricasRun(perfilBase, contextoMetricasPerfil);
  const desbloqueiosAntes = estado.meta?.carcacasDesbloqueadasAntesDaRun ?? perfilBase.carcacasDesbloqueadas ?? { CARCACA_ALFA: true };
  const layoutsBAntes = new Set(estado.meta?.layoutsTipoBAntesDaRun ?? perfilBase.layoutsTipoBDesbloqueados ?? []);
  const novasCarcacas = Object.entries(perfilPos.carcacasDesbloqueadas ?? {})
    .filter(([idC, ok]) => ok && idC !== 'CARCACA_ALFA' && !desbloqueiosAntes[idC])
    .map(([idC]) => idC);
  const novosLayoutsB = (perfilPos.layoutsTipoBDesbloqueados ?? []).filter((idL) => !layoutsBAntes.has(idL));
  const novosDesbloqueiosNestaRun = [...new Set([...novasCarcacas, ...novosLayoutsB])];
  metricasRun.novosDesbloqueiosNestaRun = novosDesbloqueiosNestaRun;
  if (avalConqFim && avalConqFim.novosDesbloqueados.length > 0) {
    metricasRun.novasConquistasSteamNestaRun = [...avalConqFim.novosDesbloqueados];
  }

  if (opcoesPersistencia.persistirEmDisco === true) {
    const faseEsperadaTr = transicao === 'TR_7C_DERROTA_EM_EVENTO' ? 'EVENTO' : 'COMBATE';
    const estadoParaTr =
      estado.meta?.faseJogo === faseEsperadaTr
        ? estado
        : { ...estado, meta: { ...estado.meta, faseJogo: faseEsperadaTr } };
    sincronizarTransicaoPersistenciaDisco(
      estadoParaTr,
      perfilBase,
      transicao,
      contextoMetricasPerfil,
      opcoesPersistencia
    );
    salvarPerfilDisco(perfilPos, opcoesPersistencia);
    apagarRunSavePermadeathDisco(opcoesPersistencia);
  }

  return clonarProfundoCongelado({
    ...estado,
    perfilJogador: perfilPos,
    catalogoHangarNaves: CATALOGO_NAVES_54.map((n) => ({
      id: n.idArquitetura,
      nome: n.nome,
      estilo: n.estiloTatico,
      chassiKg: n.pesoChassiKg,
      hpMax: n.hpCascoMax,
      desbloqueada: Boolean(perfilPos.carcacasDesbloqueadas?.[n.idArquitetura]),
    })),
    meta: {
      ...estado.meta,
      faseJogo: 'FIM_DE_RUN',
      modalCampanhaAtivo: null,
      desfechoRun,
      temRunSalvaDisponivel: false,
      ...(avalConqFim
        ? {
            conquistasDesbloqueadas: [...avalConqFim.todosDesbloqueados],
            layoutsTipoBDesbloqueados: [...avalConqFim.layoutsTipoBDesbloqueados],
            ...(avalConqFim.novosDesbloqueados.length > 0
              ? {
                  popupConquistaRecente: {
                    idConquista: avalConqFim.novosDesbloqueados[0],
                    idsNovas: [...avalConqFim.novosDesbloqueados],
                    restanteSeg: 4.5,
                  },
                }
              : {}),
          }
        : {}),
      metricasRun,
    },
  });
}

/**
 * Executa qualquer ação de alto nível da Campanha Completa (Hangar, Oficina, Upgrades, Porão/Órgãos, Salva Manual,
 * Abordagem Sala-a-Sala, Confirmação de Saque, ou qualquer um dos 15 comandos atômicos com transição automática de encontros).
 */
export function executarAcaoCampanhaCompleta(estadoCampanha, acao = {}, opcoesPersistencia = {}) {
  if (!estadoCampanha || typeof estadoCampanha !== 'object') {
    return clonarProfundoCongelado({ ok: false, codigoErro: 'ESTADO_CAMPANHA_INVALIDO', estado: null });
  }

  const tipoAcao = String(acao.tipoAcao ?? acao.tipo ?? '').toUpperCase();
  const payload = acao.payload ?? acao;

  if (tipoAcao === 'EXECUTAR_ACAO_STEAM') {
    const resSteam = aplicarAcaoMetaSteamNoEstado(estadoCampanha, payload.acaoSteam, payload);
    if (!resSteam.ok) {
      return clonarProfundoCongelado({ ok: false, codigoErro: resSteam.codigoErro, estado: resSteam.estado });
    }
    const perfilAtuSteam = atualizarPerfilComMetricasRun(resSteam.estado.perfilJogador ?? criarPerfilInicial(), {
      conquistasSteamDesbloqueadas: resSteam.estado.meta?.conquistasDesbloqueadas ?? [],
      configuracoesSteam: resSteam.estado.meta?.configuracoesSteam,
    });
    const estadoComPerfilSteam = {
      ...resSteam.estado,
      perfilJogador: perfilAtuSteam,
    };
    if (opcoesPersistencia.persistirEmDisco === true) {
      salvarPerfilDisco(perfilAtuSteam, opcoesPersistencia);
      const faseS = estadoComPerfilSteam.meta?.faseJogo;
      if (faseS && faseS !== 'INICIO' && faseS !== 'FIM_DE_RUN') {
        salvarRunSaveDisco(estadoComPerfilSteam, opcoesPersistencia);
      }
    }
    if (resSteam.iniciarRunTutorialCombate) {
      return iniciarNovaRunDoHangar(
        estadoComPerfilSteam,
        'CARCACA_ALFA',
        payload.seedPartida ?? 'biofoil-tutorial-steam',
        { ...opcoesPersistencia, ignorarBloqueioCarcaca: true, iniciarTutorialCombate: true }
      );
    }
    return clonarProfundoCongelado({
      ok: true,
      acaoExecutada: resSteam.acaoSteamExecutada,
      estado: estadoComPerfilSteam,
    });
  }

  if (tipoAcao === 'ALTERNAR_AUDIO_MUDO') {
    const novoMudo = payload.mutado !== undefined ? Boolean(payload.mutado) : !Boolean(estadoCampanha.meta?.audioMutado);
    return clonarProfundoCongelado({
      ok: true,
      acaoExecutada: tipoAcao,
      audioMutado: novoMudo,
      estado: {
        ...estadoCampanha,
        meta: { ...estadoCampanha.meta, audioMutado: novoMudo },
      },
    });
  }

  if (tipoAcao === 'SELECIONAR_CARCACA_HANGAR') {
    const idArq = String(payload.idArquitetura ?? 'CARCACA_ALFA');
    if (!CARCACAS_PERFIL_85B.some((c) => c.idArquitetura === idArq)) {
      return clonarProfundoCongelado({ ok: false, codigoErro: 'CARCACA_DESCONHECIDA', estado: estadoCampanha });
    }
    const perfil = estadoCampanha.perfilJogador ?? criarPerfilInicial();
    const desbloqueada = idArq === 'CARCACA_ALFA' || Boolean(perfil.carcacasDesbloqueadas?.[idArq]);
    if (!desbloqueada && opcoesPersistencia.ignorarBloqueioCarcaca !== true) {
      return clonarProfundoCongelado({
        ok: false,
        codigoErro: 'CARCACA_BLOQUEADA_NO_PERFIL',
        idArquitetura: idArq,
        estado: {
          ...estadoCampanha,
          meta: {
            ...estadoCampanha.meta,
            ultimoAvisoCampanha: 'CARCAÇA BLOQUEADA — CUMPRA O REQUISITO DE DESBLOQUEIO!',
          },
        },
      });
    }
    return clonarProfundoCongelado({
      ok: true,
      acaoExecutada: tipoAcao,
      idArquitetura: idArq,
      estado: {
        ...estadoCampanha,
        meta: {
          ...estadoCampanha.meta,
          carcacaSelecionadaHangar: idArq,
          ...(estadoCampanha.meta?.edicaoComercialSteam
            ? { layoutId: `${idArq}_${estadoCampanha.meta?.varianteHangar === 'B' ? 'B' : 'A'}` }
            : {}),
          ultimoAvisoCampanha: null,
        },
      },
    });
  }

  if (tipoAcao === 'ABANDONAR_EXPEDICAO') {
    const ehSteamAband = Boolean(opcoesPersistencia.edicaoComercialSteam ?? estadoCampanha.meta?.edicaoComercialSteam);
    const ehEnAband = ehSteamAband && estadoCampanha.meta?.configuracoesSteam?.idioma === 'en-US';
    const jaConfirmou = payload.confirmado === true || Boolean(estadoCampanha.meta?.confirmarAbandonoPendente);
    if (!jaConfirmou) {
      return clonarProfundoCongelado({
        ok: true,
        acaoExecutada: 'SOLICITAR_CONFIRMACAO_ABANDONO',
        aguardaConfirmacao: true,
        estado: {
          ...estadoCampanha,
          meta: {
            ...estadoCampanha.meta,
            confirmarAbandonoPendente: true,
            ultimoAvisoCampanha: ehEnAband
              ? 'CLICK ABANDON AGAIN TO END CURRENT RUN'
              : 'CLIQUE NOVAMENTE EM ABANDONAR PARA ENCERRAR A RUN',
          },
        },
      });
    }
    if (opcoesPersistencia.persistirEmDisco === true) {
      apagarRunSavePermadeathDisco(opcoesPersistencia);
    }
    const baseHangar = criarEstadoCampanhaCompleta({
      ...opcoesPersistencia,
      perfilInicial: estadoCampanha.perfilJogador,
      idArquitetura:
        estadoCampanha.meta?.carcacaSelecionadaHangar ??
        estadoCampanha.naveJogador?.idArquitetura ??
        'CARCACA_ALFA',
      faseInicial: 'INICIO',
      persistirEmDisco: false,
      ...(ehSteamAband
        ? {
            edicaoComercialSteam: true,
            variante: estadoCampanha.meta?.varianteHangar ?? 'A',
            dificuldade: estadoCampanha.meta?.dificuldade ?? 'NORMAL',
            configuracoesSteam: estadoCampanha.meta?.configuracoesSteam,
            conquistasDesbloqueadas: estadoCampanha.meta?.conquistasDesbloqueadas,
            layoutsTipoBDesbloqueados: estadoCampanha.meta?.layoutsTipoBDesbloqueados,
            tutorialSteam: estadoCampanha.meta?.tutorialSteam?.concluido
              ? estadoCampanha.meta.tutorialSteam
              : criarEstadoTutorialSteam(false),
          }
        : {}),
    });
    const hangarPosAbandono = {
      ...baseHangar,
      meta: {
        ...baseHangar.meta,
        temRunSalvaDisponivel: false,
        modalCampanhaAtivo: null,
        confirmarAbandonoPendente: false,
        ultimoAvisoCampanha: ehEnAband
          ? 'EXPEDITION ABANDONED — SELECT A NEW HULL'
          : 'EXPEDIÇÃO ABANDONADA — SELECIONE UMA NOVA CARCAÇA',
      },
    };
    return clonarProfundoCongelado({
      ok: true,
      acaoExecutada: tipoAcao,
      estado: hangarPosAbandono,
    });
  }

  if (tipoAcao === 'CONFIRMAR_DESFECHO_EVENTO') {
    if (estadoCampanha.meta?.modalCampanhaAtivo !== 'EVENTO_DESFECHO') {
      return clonarProfundoCongelado({ ok: false, codigoErro: 'SEM_DESFECHO_EVENTO_PENDENTE', estado: estadoCampanha });
    }
    const estPosDesfecho = clonarProfundoCongelado({
      ...estadoCampanha,
      meta: {
        ...estadoCampanha.meta,
        modalCampanhaAtivo: null,
        desfechoEventoPendente: null,
      },
    });
    if (opcoesPersistencia.persistirEmDisco === true) {
      salvarRunSaveDisco(estPosDesfecho, opcoesPersistencia);
    }
    return clonarProfundoCongelado({
      ok: true,
      acaoExecutada: tipoAcao,
      estado: estPosDesfecho,
    });
  }

  if (tipoAcao === 'INICIAR_NOVA_RUN') {
    return iniciarNovaRunDoHangar(
      estadoCampanha,
      payload.idArquitetura ?? estadoCampanha.meta?.carcacaSelecionadaHangar ?? 'CARCACA_ALFA',
      payload.seedPartida ?? null,
      opcoesPersistencia
    );
  }

  if (tipoAcao === 'CONTINUAR_RUN_SALVA') {
    const salvo = opcoesPersistencia.runSalvaOverride
      ? { status: 'ENCONTRADO', estadoRun: opcoesPersistencia.runSalvaOverride }
      : carregarRunSaveDisco(opcoesPersistencia);
    if ((salvo.status !== 'ENCONTRADO' && !salvo.existeRunSalva) || !salvo.estadoRun) {
      return clonarProfundoCongelado({
        ok: false,
        codigoErro: 'NENHUMA_RUN_SALVA_DISPONIVEL',
        estado: estadoCampanha,
      });
    }
    return clonarProfundoCongelado({
      ok: true,
      acaoExecutada: tipoAcao,
      estado: salvo.estadoRun,
    });
  }

  if (tipoAcao === 'VOLTAR_AO_HANGAR') {
    const ehSteamVoltar = Boolean(opcoesPersistencia.edicaoComercialSteam ?? estadoCampanha.meta?.edicaoComercialSteam);
    const novoHangar = criarEstadoCampanhaCompleta({
      ...opcoesPersistencia,
      perfilInicial: estadoCampanha.perfilJogador,
      idArquitetura: estadoCampanha.meta?.carcacaSelecionadaHangar ?? estadoCampanha.naveJogador?.idArquitetura ?? 'CARCACA_ALFA',
      faseInicial: 'INICIO',
      ...(ehSteamVoltar
        ? {
            edicaoComercialSteam: true,
            variante: estadoCampanha.meta?.varianteHangar ?? 'A',
            dificuldade: estadoCampanha.meta?.dificuldade ?? 'NORMAL',
            configuracoesSteam: estadoCampanha.meta?.configuracoesSteam,
            conquistasDesbloqueadas: estadoCampanha.meta?.conquistasDesbloqueadas,
            layoutsTipoBDesbloqueados: estadoCampanha.meta?.layoutsTipoBDesbloqueados,
            tutorialSteam: estadoCampanha.meta?.tutorialSteam?.concluido
              ? estadoCampanha.meta.tutorialSteam
              : criarEstadoTutorialSteam(false),
          }
        : {}),
    });
    return clonarProfundoCongelado({
      ok: true,
      acaoExecutada: tipoAcao,
      estado: novoHangar,
    });
  }

  if (tipoAcao === 'ABRIR_FECHAR_OFICINA') {
    const fase = estadoCampanha.meta?.faseJogo ?? 'MAPA';
    if (fase !== 'MAPA' && fase !== 'LOJA' && fase !== 'EVENTO') {
      return clonarProfundoCongelado({ ok: false, codigoErro: 'OFICINA_APENAS_MAPA_LOJA_OU_EVENTO', estado: estadoCampanha });
    }
    if (
      estadoCampanha.meta?.modalCampanhaAtivo &&
      estadoCampanha.meta.modalCampanhaAtivo !== 'OFICINA'
    ) {
      return clonarProfundoCongelado({ ok: false, codigoErro: 'MODAL_PRIORITARIO_ATIVO', estado: estadoCampanha });
    }
    const proximoModal =
      payload.aberto === true
        ? 'OFICINA'
        : payload.aberto === false
          ? null
          : estadoCampanha.meta?.modalCampanhaAtivo === 'OFICINA'
            ? null
            : 'OFICINA';
    return clonarProfundoCongelado({
      ok: true,
      acaoExecutada: tipoAcao,
      modalCampanhaAtivo: proximoModal,
      estado: {
        ...estadoCampanha,
        meta: {
          ...estadoCampanha.meta,
          modalCampanhaAtivo: proximoModal,
          confirmarAbandonoPendente: false,
        },
      },
    });
  }

  if (tipoAcao === 'ALTERNAR_MOEDA_REATOR') {
    const atual = estadoCampanha.meta?.moedaPreferencialReator ?? 'SUCATA';
    const nova = atual === 'SUCATA' ? 'BIOMASSA' : 'SUCATA';
    return clonarProfundoCongelado({
      ok: true,
      acaoExecutada: tipoAcao,
      moedaPreferencialReator: nova,
      estado: {
        ...estadoCampanha,
        meta: { ...estadoCampanha.meta, moedaPreferencialReator: nova },
      },
    });
  }

  if (tipoAcao === 'COMPRAR_UPGRADE_OFICINA') {
    const resUp = aplicarUpgradeNaveCampanha(estadoCampanha, payload.idArvore, {
      moedaPreferencial: payload.moedaPreferencial ?? estadoCampanha.meta?.moedaPreferencialReator ?? 'SUCATA',
      permitirForaDeLoja: Boolean(payload.permitirForaDeLoja),
    });
    if (!resUp.ok) return resUp;
    let estPosUp = resUp.estado;
    if (resUp.atingiuNivelMaximo && estPosUp.meta?.edicaoComercialSteam) {
      estPosUp = {
        ...estPosUp,
        meta: {
          ...estPosUp.meta,
          metricasRun: {
            ...(estPosUp.meta?.metricasRun ?? {}),
            evoluiuSistemaNivelMaximoNaRun: true,
          },
        },
      };
    }
    estPosUp = sincronizarEstadoEConquistasSteam(
      estPosUp,
      resUp.atingiuNivelMaximo ? { sistemaNoNivelMaximo: true } : {},
      opcoesPersistencia
    );
    if (opcoesPersistencia.persistirEmDisco === true) {
      salvarRunSaveDisco(estPosUp, opcoesPersistencia);
    }
    return clonarProfundoCongelado({ ...resUp, estado: estPosUp });
  }

  if (
    tipoAcao === 'EQUIPAR_ARMA_PORAO' ||
    tipoAcao === 'DESEQUIPAR_ARMA_PARA_PORAO' ||
    tipoAcao === 'ENXERTAR_ORGAO_PORAO' ||
    tipoAcao === 'REMOVER_ORGAO_PARA_PORAO' ||
    tipoAcao === 'DESCARTAR_ITEM_PORAO'
  ) {
    const resEq = gerenciarEquipamentoPoraoEOrgaos(estadoCampanha, { ...payload, tipo: tipoAcao });
    if (!resEq.ok) return resEq;
    const estPosEq = sincronizarEstadoEConquistasSteam(resEq.estado, {}, opcoesPersistencia);
    if (opcoesPersistencia.persistirEmDisco === true) {
      salvarRunSaveDisco(estPosEq, opcoesPersistencia);
    }
    return clonarProfundoCongelado({ ...resEq, estado: estPosEq });
  }

  if (tipoAcao === 'ALTERNAR_MODO_DISPARO_ARMA') {
    const resAltModo = alternarModoDisparoArma(estadoCampanha, payload.slotIndex ?? 'TODOS', payload.forcarManual ?? null);
    if (!resAltModo.ok) return resAltModo;
    return clonarProfundoCongelado({
      ...resAltModo,
      estado: sincronizarProgressoTutorialSteamNoEstado(resAltModo.estado, tipoAcao, opcoesPersistencia),
    });
  }

  if (tipoAcao === 'DISPARAR_SALVA_MANUAL') {
    const resSalva = dispararSalvaManualPronta(estadoCampanha, payload.slotIndex ?? 'TODOS');
    if (!resSalva.ok) return resSalva;
    return clonarProfundoCongelado({
      ...resSalva,
      estado: sincronizarProgressoTutorialSteamNoEstado(resSalva.estado, tipoAcao, opcoesPersistencia),
    });
  }

  if (tipoAcao === 'MOVER_ABORDO_INIMIGO') {
    const resAb = ordenarMovimentoAbordagemInimiga(estadoCampanha, payload.tripulanteId, payload.salaInimigaDestinoId);
    if (!resAb.ok) return resAb;
    return clonarProfundoCongelado({
      ...resAb,
      estado: sincronizarProgressoTutorialSteamNoEstado(resAb.estado, tipoAcao, opcoesPersistencia),
    });
  }

  if (tipoAcao === 'ACEITAR_RENDICAO_INIMIGA') {
    const oferta = estadoCampanha.alvoCombate?.ofertaRendicaoAtiva;
    if (estadoCampanha.meta?.faseJogo !== 'COMBATE' || !oferta) {
      return clonarProfundoCongelado({ ok: false, codigoErro: 'SEM_OFERTA_RENDICAO', estado: estadoCampanha });
    }
    const vivosPreRend = (estadoCampanha.naveJogador?.tripulacao ?? []).filter((t) => Number(t.hpAtual ?? 0) > 0);
    const ocupacaoRend = {};
    for (const t of vivosPreRend) {
      if (t.localizacao !== 'BORDO_INIMIGO') {
        ocupacaoRend[t.camaraAtualId] = (ocupacaoRend[t.camaraAtualId] ?? 0) + 1;
      }
    }
    const tripResgatadaRend = vivosPreRend.map((t) => {
      if (t.localizacao !== 'BORDO_INIMIGO') return t;
      const camDestRend =
        [7, 3, 5, 2, 4, 1, 6, 8].find(
          (idC) =>
            (ocupacaoRend[idC] ?? 0) < Math.max(1, Number(estadoCampanha.naveJogador?.limitesPorSala?.[idC] ?? 2))
        ) ?? 7;
      ocupacaoRend[camDestRend] = (ocupacaoRend[camDestRend] ?? 0) + 1;
      return {
        ...t,
        localizacao: 'NAVE_JOGADOR',
        camaraAtualId: camDestRend,
        camaraDestinoId: null,
        salaInimigaId: null,
        salaInimigaDestinoId: null,
        proximaSalaInimigaId: null,
        rotaInimigaAtiva: [],
        progressoTravessiaInimigaSeg: 0.0,
        modoParasita: false,
        progressoSabotagemInternaSeg: 0.0,
      };
    });
    const navePosRend = recalcularHidraulicaNaveImutavel({
      ...estadoCampanha.naveJogador,
      pesoVirtualArrastoKg: 0.0,
      penalidadeSustentacaoKg: 0.0,
      neutralizaChuvaAcidaRestanteSeg: 0.0,
      tripulacao: tripResgatadaRend,
    });
    const recRend = aplicarRegrasSaquePosCombateCampanha(
      {
        sucata: Number(oferta.sucata ?? 12),
        biomassa: Number(oferta.biomassa ?? 0),
        combustivel: Number(oferta.combustivel ?? 2),
        municao: Number(oferta.municao ?? 1),
      },
      estadoCampanha
    );
    const novaCartRend = {
      sucata: Number(estadoCampanha.economia?.sucata ?? 0) + Number(recRend.sucata ?? 0),
      biomassa: Number(estadoCampanha.economia?.biomassa ?? 0) + Number(recRend.biomassa ?? 0),
      combustivel: Number(estadoCampanha.economia?.combustivel ?? 0) + Number(recRend.combustivel ?? 0),
      municao: Number(estadoCampanha.economia?.municao ?? 0) + Number(recRend.municao ?? 0),
    };
    const mrRendAnt = estadoCampanha.meta?.metricasRun ?? {};
    const estRend = clonarProfundoCongelado({
      ...estadoCampanha,
      economia: novaCartRend,
      recursos: novaCartRend,
      naveJogador: navePosRend,
      alvoCombate: { ...(estadoCampanha.alvoCombate ?? {}), ativo: false, ofertaRendicaoAtiva: null },
      meta: {
        ...estadoCampanha.meta,
        modalCampanhaAtivo: 'SAQUE',
        perigoAmbientalId: null,
        modificadoresCombateAtivos: null,
        metricasRun: {
          ...mrRendAnt,
          combatesVencidos: Number(mrRendAnt.combatesVencidos ?? 0) + 1,
          rendicoesAceitasNaRun: Number(mrRendAnt.rendicoesAceitasNaRun ?? 0) + 1,
          sucataAcumuladaTotal: Number(mrRendAnt.sucataAcumuladaTotal ?? 0) + Number(recRend.sucata ?? 0),
          biomassaAcumuladaTotal: Number(mrRendAnt.biomassaAcumuladaTotal ?? 0) + Number(recRend.biomassa ?? 0),
        },
        saquePendente: {
          modalidade: 'RENDICAO_NEGOCIADA',
          inimigoNome: estadoCampanha.alvoCombate?.nome ?? estadoCampanha.alvoCombate?.idInimigo ?? 'Alvo Hostil',
          sucata: Number(recRend.sucata ?? 0),
          biomassa: Number(recRend.biomassa ?? 0),
          combustivel: Number(recRend.combustivel ?? 0),
          municao: Number(recRend.municao ?? 0),
          itemRecuperado: null,
          depositadoNoPorao: false,
          animaisResgatadosIds: [],
        },
      },
    });
    if (opcoesPersistencia.persistirEmDisco === true) {
      salvarRunSaveDisco(estRend, opcoesPersistencia);
    }
    return clonarProfundoCongelado({ ok: true, acaoExecutada: tipoAcao, estado: estRend });
  }

  if (tipoAcao === 'CONFIRMAR_SAQUE_POS_COMBATE') {
    if (estadoCampanha.meta?.modalCampanhaAtivo !== 'SAQUE') {
      return clonarProfundoCongelado({ ok: false, codigoErro: 'SEM_SAQUE_PENDENTE', estado: estadoCampanha });
    }
    let estMapa = clonarProfundoCongelado({
      ...estadoCampanha,
      meta: {
        ...estadoCampanha.meta,
        faseJogo: 'MAPA',
        modalCampanhaAtivo: null,
        saquePendente: null,
      },
      alvoCombate: { ...(estadoCampanha.alvoCombate ?? {}), ativo: false },
    });
    estMapa = sincronizarProgressoTutorialSteamNoEstado(estMapa, tipoAcao, opcoesPersistencia);
    if (opcoesPersistencia.persistirEmDisco === true) {
      salvarRunSaveDisco(estMapa, opcoesPersistencia);
      salvarPerfilDisco(estMapa.perfilJogador, opcoesPersistencia);
    }
    return clonarProfundoCongelado({
      ok: true,
      acaoExecutada: tipoAcao,
      estado: estMapa,
    });
  }

  // Comandos atômicos do motor (`ESQUEMA_15_COMANDOS_85A`) com transições automáticas de Campanha
  const comandoAtomico = acao.comandoMotor ?? { tipo: tipoAcao, payload };
  const estadoBaseMotor =
    estadoCampanha.meta?.modalCampanhaAtivo === 'EVENTO_DESFECHO'
      ? {
          ...estadoCampanha,
          meta: {
            ...estadoCampanha.meta,
            modalCampanhaAtivo: null,
            desfechoEventoPendente: null,
          },
        }
      : estadoCampanha;
  const resMotor = despacharComandoUi(estadoBaseMotor, comandoAtomico);
  if (!resMotor.aceito) {
    return clonarProfundoCongelado({
      ok: false,
      codigoErro: resMotor.marcadorRejeicao ?? 'COMANDO_REJEITADO',
      cueEmitido: resMotor.cueEmitido,
      estado: resMotor.estado,
    });
  }

  let proximoEstado = resMotor.estado;
  const ganhoSucataCmd = Math.max(
    0,
    Number(proximoEstado.economia?.sucata ?? 0) - Number(estadoBaseMotor.economia?.sucata ?? 0)
  );
  const ganhoBioCmd = Math.max(
    0,
    Number(proximoEstado.economia?.biomassa ?? 0) - Number(estadoBaseMotor.economia?.biomassa ?? 0)
  );
  if ((ganhoSucataCmd > 0 || ganhoBioCmd > 0) && proximoEstado.meta?.metricasRun) {
    const mrAnt = proximoEstado.meta.metricasRun;
    proximoEstado = congelarProfundo({
      ...proximoEstado,
      meta: {
        ...proximoEstado.meta,
        metricasRun: {
          ...mrAnt,
          sucataAcumuladaTotal: Number(mrAnt.sucataAcumuladaTotal ?? 0) + ganhoSucataCmd,
          biomassaAcumuladaTotal: Number(mrAnt.biomassaAcumuladaTotal ?? 0) + ganhoBioCmd,
        },
      },
    });
  }

  if (comandoAtomico.tipo === 'VIAJAR_NO_MAPA') {
    const idDest = comandoAtomico.payload?.idNoDestino ?? comandoAtomico.payload?.noDestinoId;
    const noDest = (proximoEstado.mapaSetorial?.nos ?? []).find((n) => n.id === idDest) ?? { id: idDest, tipoNo: 'COMBATE' };
    let estEnt = resolverEntradaNoMapaCampanha(proximoEstado, noDest, opcoesPersistencia);
    if (estEnt.meta?.edicaoComercialSteam) {
      const mrSalto = estEnt.meta?.metricasRun ?? {};
      const saltosRealizadosNaRun = Number(mrSalto.saltosRealizadosNaRun ?? 0) + 1;
      const setorPosSalto = Number(estEnt.mapaSetorial?.setorNumero ?? estEnt.meta?.setorAtual ?? 1);
      const avalSalto = avaliarConquistasSteam(
        {
          especieNave: estEnt.naveJogador?.idArquitetura,
          setorAtual: setorPosSalto,
          dificuldade: estEnt.meta?.dificuldade ?? 'NORMAL',
          saltosRealizados: saltosRealizadosNaRun,
          ...contarArsenalEOrgaosNaveSteam(estEnt.naveJogador),
          layoutsTipoBDesbloqueados: estEnt.perfilJogador?.layoutsTipoBDesbloqueados ?? [],
        },
        [
          ...(estEnt.perfilJogador?.conquistasSteamDesbloqueadas ?? []),
          ...(estEnt.meta?.conquistasDesbloqueadas ?? []),
        ]
      );
      const perfilPosSalto = atualizarPerfilComMetricasRun(
        estEnt.perfilJogador ?? criarPerfilInicial(),
        {
          conquistasSteamDesbloqueadas: avalSalto.todosDesbloqueados,
          layoutsTipoBDesbloqueados: avalSalto.layoutsTipoBDesbloqueados,
          configuracoesSteam: estEnt.meta?.configuracoesSteam,
        }
      );
      estEnt = {
        ...estEnt,
        perfilJogador: perfilPosSalto,
        meta: {
          ...estEnt.meta,
          conquistasDesbloqueadas: [...avalSalto.todosDesbloqueados],
          layoutsTipoBDesbloqueados: [...avalSalto.layoutsTipoBDesbloqueados],
          ...(avalSalto.novosDesbloqueados.length > 0
            ? {
                popupConquistaRecente: {
                  idConquista: avalSalto.novosDesbloqueados[0],
                  idsNovas: [...avalSalto.novosDesbloqueados],
                  restanteSeg: 4.5,
                },
              }
            : {}),
          metricasRun: { ...mrSalto, saltosRealizadosNaRun },
        },
      };
      if (opcoesPersistencia.persistirEmDisco === true) {
        salvarPerfilDisco(perfilPosSalto, opcoesPersistencia);
        salvarRunSaveDisco(estEnt, opcoesPersistencia);
      }
    }
    proximoEstado = congelarProfundo(estEnt);
  } else if (comandoAtomico.tipo === 'ESCOLHER_OPCAO_EVENTO') {
    const resumoEv = construirDesfechoEventoCanonicamente(
      estadoBaseMotor,
      proximoEstado,
      {
        idEvento: proximoEstado.meta?.ultimoResultadoEvento?.idEvento ?? comandoAtomico.payload?.idEvento ?? 'EVENTO_MARITIMO',
        opcao: comandoAtomico.payload?.opcao ?? 'A',
        opcaoEscolhida: comandoAtomico.payload?.opcao ?? 'A',
        iniciouCombate: proximoEstado.meta?.faseJogo === 'COMBATE',
        revelaMapaSetorial: proximoEstado.meta?.ultimoResultadoEvento?.revelaMapaSetorial,
        novoTripulanteEspecie: proximoEstado.meta?.ultimoResultadoEvento?.novoTripulanteEspecie,
        itemRecuperadoNome: proximoEstado.meta?.ultimoResultadoEvento?.itemRecuperadoNome,
      },
      opcoesPersistencia
    );
    if (proximoEstado.meta?.edicaoComercialSteam) {
      const mrEv = proximoEstado.meta?.metricasRun ?? {};
      const blueOptionsResolvidasNaRun =
        Number(mrEv.blueOptionsResolvidasNaRun ?? 0) + (resumoEv.blueOptionAtivada ? 1 : 0);
      const idEvQuestCheck = String(resumoEv.idEvento ?? '');
      const tplEvQuestCheck = resolverTemplateEventoUnificado(idEvQuestCheck);
      const ehQuestConcluida =
        Boolean(estadoBaseMotor.eventoAtual?.noMapa?.ehQuestAtiva) ||
        Boolean(tplEvQuestCheck?.ehEventoQuest) ||
        /^AE_Q[1-8]_/.test(idEvQuestCheck) ||
        idEvQuestCheck.includes('_QUEST');
      const questsConcluidasNaRun = Number(mrEv.questsConcluidasNaRun ?? 0) + (ehQuestConcluida ? 1 : 0);
      const avalEv = avaliarConquistasSteam(
        {
          especieNave: proximoEstado.naveJogador?.idArquitetura,
          setorAtual: Number(proximoEstado.mapaSetorial?.setorNumero ?? 1),
          dificuldade: proximoEstado.meta?.dificuldade ?? 'NORMAL',
          blueOptionsResolvidasNaRun,
          questsConcluidasNaRun,
          ...contarArsenalEOrgaosNaveSteam(proximoEstado.naveJogador),
          layoutsTipoBDesbloqueados: proximoEstado.perfilJogador?.layoutsTipoBDesbloqueados ?? [],
        },
        [
          ...(proximoEstado.perfilJogador?.conquistasSteamDesbloqueadas ?? []),
          ...(proximoEstado.meta?.conquistasDesbloqueadas ?? []),
        ]
      );
      const perfilPosEv = atualizarPerfilComMetricasRun(
        proximoEstado.perfilJogador ?? criarPerfilInicial(),
        {
          conquistasSteamDesbloqueadas: avalEv.todosDesbloqueados,
          layoutsTipoBDesbloqueados: avalEv.layoutsTipoBDesbloqueados,
          configuracoesSteam: proximoEstado.meta?.configuracoesSteam,
        }
      );
      proximoEstado = congelarProfundo({
        ...proximoEstado,
        perfilJogador: perfilPosEv,
        meta: {
          ...proximoEstado.meta,
          conquistasDesbloqueadas: [...avalEv.todosDesbloqueados],
          layoutsTipoBDesbloqueados: [...avalEv.layoutsTipoBDesbloqueados],
          ...(avalEv.novosDesbloqueados.length > 0
            ? {
                popupConquistaRecente: {
                  idConquista: avalEv.novosDesbloqueados[0],
                  idsNovas: [...avalEv.novosDesbloqueados],
                  restanteSeg: 4.5,
                },
              }
            : {}),
          metricasRun: {
            ...mrEv,
            blueOptionsResolvidasNaRun,
            questsConcluidasNaRun,
          },
        },
      });
      if (opcoesPersistencia.persistirEmDisco === true) {
        salvarPerfilDisco(perfilPosEv, opcoesPersistencia);
      }
    }
    if (proximoEstado.meta?.faseJogo === 'FIM_DE_RUN') {
      proximoEstado = finalizarRunComPersistencia(proximoEstado, 'DERROTA_PERMADEATH', opcoesPersistencia);
    } else if (proximoEstado.meta?.faseJogo === 'COMBATE') {
      const seed = proximoEstado.meta?.seedPartida ?? 'seed-ev';
      const setor = Number(proximoEstado.mapaSetorial?.setorNumero ?? 1);
      const noId = proximoEstado.mapaSetorial?.noAtualId ?? 'NO_EVENTO';
      const modEv = proximoEstado.meta?.modificadoresCombateAtivos ?? {};
      const ehSteamEvComb = Boolean(proximoEstado.meta?.edicaoComercialSteam);
      const alvoEvBase = gerarAlvoInimigoEscaladoSetor(seed, setor, noId, {
        classeForcada: modEv.classeForcada ?? undefined,
        bonusBarreiraInimigo: modEv.bonusBarreiraInimigo ?? 0,
        canalVisibilidadeSonar: modEv.canalVisibilidadeSonar ?? undefined,
        edicaoComercialSteam: ehSteamEvComb,
      });
      const alvoEvEsc = ehSteamEvComb
        ? escalarInimigoPorDificuldade(alvoEvBase, proximoEstado.meta?.dificuldade ?? 'NORMAL', setor)
        : alvoEvBase;
      const alvoEv = ehSteamEvComb ? equiparArsenalModularInimigoSteam(alvoEvEsc, seed, setor, noId) : alvoEvEsc;
      const modsCombEv = ehSteamEvComb ? calcularModificadoresPassivosOrgaosSteam(proximoEstado.naveJogador) : null;
      const navePreCombEv =
        modsCombEv && modsCombEv.preIgnicaoCombatePct > 0
          ? {
              ...proximoEstado.naveJogador,
              armasAtivas: (proximoEstado.naveJogador.armasAtivas ?? []).map((s) =>
                s?.arma
                  ? {
                      ...s,
                      arma: {
                        ...s.arma,
                        progressoRecargaSeg: Math.max(
                          Number(s.arma.progressoRecargaSeg ?? 0),
                          Math.round(Number(s.arma.tempoRecargaBaseSeg ?? 10) * modsCombEv.preIgnicaoCombatePct * 100) / 100
                        ),
                      },
                    }
                  : s
              ),
            }
          : proximoEstado.naveJogador;
      const desfechoCombate = { ...resumoEv, iniciouCombate: true, combateObrigatorio: true, proximaFase: 'COMBATE' };
      proximoEstado = congelarProfundo({
        ...proximoEstado,
        naveJogador: navePreCombEv,
        meta: {
          ...proximoEstado.meta,
          hpCascoInimigoInicioLuta: alvoEv.hpCascoMax,
          ...(ehSteamEvComb
            ? {
                hpCascoJogadorInicioLuta: Number(navePreCombEv?.hpCascoAtual ?? 0),
                tripulacaoVivosInicioLutaCount: (navePreCombEv?.tripulacao ?? []).filter(
                  (t) => Number(t.hpAtual ?? 0) > 0 && t.vivo !== false
                ).length,
                telemetriaCombateSteam: {},
              }
            : {}),
          ultimoResultadoEvento: desfechoCombate,
          modalCampanhaAtivo: opcoesPersistencia.pularModalDesfechoEvento === true ? null : 'EVENTO_DESFECHO',
          desfechoEventoPendente: opcoesPersistencia.pularModalDesfechoEvento === true ? null : desfechoCombate,
        },
        alvoCombate: alvoEv,
      });
    } else {
      const desfechoMapa = { ...resumoEv, iniciouCombate: false, combateObrigatorio: false, proximaFase: 'MAPA' };
      proximoEstado = congelarProfundo({
        ...proximoEstado,
        meta: {
          ...proximoEstado.meta,
          ultimoResultadoEvento: desfechoMapa,
          modalCampanhaAtivo: opcoesPersistencia.pularModalDesfechoEvento === true ? null : 'EVENTO_DESFECHO',
          desfechoEventoPendente: opcoesPersistencia.pularModalDesfechoEvento === true ? null : desfechoMapa,
        },
      });
      if (opcoesPersistencia.persistirEmDisco === true) {
        salvarRunSaveDisco(proximoEstado, opcoesPersistencia);
      }
    }
  } else if (comandoAtomico.tipo === 'COMPRAR_OU_VENDER_LOJA' || comandoAtomico.tipo === 'SALTO_FUGA') {
    proximoEstado = sincronizarEstadoEConquistasSteam(proximoEstado, {}, opcoesPersistencia);
    if (opcoesPersistencia.persistirEmDisco === true) {
      salvarRunSaveDisco(proximoEstado, opcoesPersistencia);
    }
  } else if (proximoEstado.meta?.edicaoComercialSteam) {
    proximoEstado = sincronizarEstadoEConquistasSteam(proximoEstado, {}, opcoesPersistencia);
  }

  if (proximoEstado.meta?.edicaoComercialSteam && proximoEstado.meta?.tutorialSteam?.ativo) {
    proximoEstado = sincronizarProgressoTutorialSteamNoEstado(proximoEstado, comandoAtomico.tipo, opcoesPersistencia);
  }

  return clonarProfundoCongelado({
    ok: true,
    acaoExecutada: comandoAtomico.tipo,
    cueEmitido: resMotor.cueEmitido,
    estado: proximoEstado,
  });
}

/**
 * Avança 1 tick de simulação da Campanha Completa em tempo real, processando:
 * - Derrota Permadeath (Casco `0 HP` ou `0` tripulantes vivos -> apaga `run_save.json` e atualiza `profile.json`);
 * - Transição automática das Fases `1 -> 2 -> 3` da Draga Continental e Vitória Final na Fase `3`;
 * - Vitória em combates setoriais (`DESTRUICAO_BRUTA`, `CAPTURA_INTACTA`, `EXTRACAO_CIRURGICA`), resgate da equipe de abordagem,
 *   depósito de órgãos/armas recuperadas no Porão de Carga e abertura do modal `SAQUE`.
 */
export function avancarTickCampanhaCompleta(estadoCampanha, dtSeg = 0.25, opcoesPersistencia = {}) {
  if (!estadoCampanha || typeof estadoCampanha !== 'object') {
    throw new Error('[campanha-completa] estadoCampanha inválido');
  }
  if ((estadoCampanha.meta?.faseJogo ?? 'COMBATE') !== 'COMBATE') {
    return estadoCampanha;
  }
  if (
    estadoCampanha.meta?.modalCampanhaAtivo === 'SAQUE' ||
    estadoCampanha.meta?.modalCampanhaAtivo === 'EVENTO_DESFECHO'
  ) {
    return estadoCampanha;
  }

  let estadoPosTick = avancarTickPartidaEmTempoReal(estadoCampanha, dtSeg, opcoesPersistencia.opcoesDebugTick ?? {});
  if (estadoPosTick.meta?.edicaoComercialSteam) {
    if (Number(estadoPosTick.meta?.popupConquistaRecente?.restanteSeg ?? 0) > 0) {
      const novoRestPop = Math.max(
        0,
        Math.round((Number(estadoPosTick.meta.popupConquistaRecente.restanteSeg) - dtSeg) * 1000) / 1000
      );
      estadoPosTick = congelarProfundo({
        ...estadoPosTick,
        meta: {
          ...estadoPosTick.meta,
          popupConquistaRecente:
            novoRestPop > 0 ? { ...estadoPosTick.meta.popupConquistaRecente, restanteSeg: novoRestPop } : null,
        },
      });
    }
    estadoPosTick = sincronizarEstadoEConquistasSteam(estadoPosTick, {}, opcoesPersistencia);
  }

  const vivosJogador = (estadoPosTick.naveJogador?.tripulacao ?? []).filter((t) => Number(t.hpAtual ?? 0) > 0).length;
  if (Number(estadoPosTick.naveJogador?.hpCascoAtual ?? 0) <= 0 || vivosJogador === 0) {
    return finalizarRunComPersistencia(estadoPosTick, 'DERROTA_PERMADEATH', opcoesPersistencia);
  }

  const alvo = estadoPosTick.alvoCombate;
  if (!alvo || alvo.ativo === false) {
    return estadoPosTick;
  }

  const classeAlvo = String(alvo.classeAlvo ?? alvo.classeInimigo ?? 'BARCO_HUMANO').toUpperCase();

  // Caso 1: Chefe Final Draga Continental (3 fases consecutivas)
  if (classeAlvo === 'CHEFE_DRAGA') {
    if (Number(alvo.hpCascoAtual ?? 1) <= 0) {
      const faseAtual = Number(alvo.faseChefe ?? 1);
      if (faseAtual < 3) {
        const transicionado = transicionarFaseChefeDraga(estadoPosTick);
        const alvoProxFase = estadoPosTick.meta?.edicaoComercialSteam
          ? escalarInimigoPorDificuldade(
              transicionado.alvoCombate,
              estadoPosTick.meta?.dificuldade ?? 'NORMAL',
              8
            )
          : transicionado.alvoCombate;
        const bonusSucata = faseAtual === 1 ? 15 : 20;
        const bonusBio = faseAtual === 1 ? 10 : 15;
        const cartBase = {
          sucata: Number(transicionado.economia?.sucata ?? 0) + bonusSucata,
          biomassa: Number(transicionado.economia?.biomassa ?? 0) + bonusBio,
          combustivel: Number(transicionado.economia?.combustivel ?? 0) + 1,
          municao: Number(transicionado.economia?.municao ?? 0) + 1,
        };
        const mrFase = transicionado.meta?.metricasRun ?? {};
        return clonarProfundoCongelado({
          ...transicionado,
          alvoCombate: alvoProxFase,
          economia: cartBase,
          recursos: cartBase,
          meta: {
            ...transicionado.meta,
            metricasRun: {
              ...mrFase,
              sucataAcumuladaTotal: Number(mrFase.sucataAcumuladaTotal ?? 0) + bonusSucata,
              biomassaAcumuladaTotal: Number(mrFase.biomassaAcumuladaTotal ?? 0) + bonusBio,
            },
            ultimoAvisoCampanha:
              transicionado.meta?.configuracoesSteam?.idioma === 'en-US'
                ? `DREDGE RETREATED! ENGAGING PHASE ${faseAtual + 1}/3 (+${bonusSucata} SCR, +${bonusBio} BIO)`
                : `DRAGA RECUOU! INICIANDO FASE ${faseAtual + 1}/3 (+${bonusSucata} SUC, +${bonusBio} BIO)`,
          },
        });
      }
      // Fase 3 derrotada -> VITÓRIA FINAL DA CAMPANHA!
      return finalizarRunComPersistencia(estadoPosTick, 'VITORIA_CAMPANHA', opcoesPersistencia);
    }
    return estadoPosTick;
  }

  // Caso 2: Inimigo regular (BARCO_HUMANO ou MONSTRO_MARINHO) -> avalia as 3 Condições de Vitória
  const vitoria = avaliarCondicaoDeVitoria(estadoPosTick);
  if (!vitoria.encerrado) {
    return estadoPosTick;
  }

  const setor = Math.max(1, Number(alvo.setorNumero ?? estadoPosTick.mapaSetorial?.setorNumero ?? 1));
  const seed = String(estadoPosTick.meta?.seedPartida ?? 'seed-saque');
  const noId = String(estadoPosTick.mapaSetorial?.noAtualId ?? 'NO_SAQUE');

  // Resgata tripulantes aliados vivos que estavam em BORDO_INIMIGO respeitando limitesPorSala
  const vivosPreSaque = (estadoPosTick.naveJogador.tripulacao ?? []).filter((t) => Number(t.hpAtual ?? 0) > 0);
  const ocupacaoSaque = {};
  for (const t of vivosPreSaque) {
    if (t.localizacao !== 'BORDO_INIMIGO') {
      ocupacaoSaque[t.camaraAtualId] = (ocupacaoSaque[t.camaraAtualId] ?? 0) + 1;
    }
  }
  const tripulacaoResgatada = vivosPreSaque.map((t) => {
    if (t.localizacao !== 'BORDO_INIMIGO') return t;
    const camDestSaque =
      [7, 3, 5, 2, 4, 1, 6, 8].find(
        (idC) =>
          (ocupacaoSaque[idC] ?? 0) < Math.max(1, Number(estadoPosTick.naveJogador?.limitesPorSala?.[idC] ?? 2))
      ) ?? 7;
    ocupacaoSaque[camDestSaque] = (ocupacaoSaque[camDestSaque] ?? 0) + 1;
    return {
      ...t,
      localizacao: 'NAVE_JOGADOR',
      camaraAtualId: camDestSaque,
      camaraDestinoId: null,
      salaInimigaId: null,
      salaInimigaDestinoId: null,
      proximaSalaInimigaId: null,
      rotaInimigaAtiva: [],
      progressoTravessiaInimigaSeg: 0.0,
      modoParasita: false,
      progressoSabotagemInternaSeg: 0.0,
    };
  });

  // Determina item bônus recuperado (Órgão Intacto em EXTRACAO_CIRURGICA ou 25% Arma em CAPTURA_INTACTA)
  let itemRecuperado = null;
  const poolOrgaosSaque = estadoPosTick.meta?.edicaoComercialSteam ? CATALOGO_16_ORGAOS_STEAM : CATALOGO_ORGAOS_52;
  const poolArmasSaque = estadoPosTick.meta?.edicaoComercialSteam ? CATALOGO_24_ARMAS_STEAM : CATALOGO_ARMAS_51;
  if (vitoria.modalidade === 'EXTRACAO_CIRURGICA') {
    const idOrgao = alvo.orgaoExtraido ?? poolOrgaosSaque[streamCombateDisparo(seed, setor, noId, 1, 501) % poolOrgaosSaque.length].id;
    const specOrg = poolOrgaosSaque.find((o) => o.id === idOrgao) ?? poolOrgaosSaque[0];
    itemRecuperado = { id: specOrg.id, nome: specOrg.nome, tipo: 'ORGAO', pesoKg: Number(specOrg.pesoKg ?? 5) };
  } else if (vitoria.modalidade === 'CAPTURA_INTACTA') {
    const rolaArma = streamCombateDisparo(seed, setor, noId, 1, 502) % 4;
    if (rolaArma === 0) {
      const specArma = poolArmasSaque[streamCombateDisparo(seed, setor, noId, 1, 503) % poolArmasSaque.length];
      itemRecuperado = { id: specArma.id, nome: specArma.nome, tipo: 'ARMA', pesoKg: Number(specArma.pesoKg ?? 10) };
    }
  }

  const poraoPosSaque = [...(estadoPosTick.naveJogador.poraoCarga ?? [])];
  while (poraoPosSaque.length < 4) {
    poraoPosSaque.push({ slotIndex: poraoPosSaque.length, item: null });
  }
  let depositadoNoPorao = false;
  if (itemRecuperado) {
    const idxLivre = poraoPosSaque.findIndex((s) => !s?.item);
    if (idxLivre >= 0) {
      poraoPosSaque[idxLivre] = {
        slotIndex: idxLivre,
        item: { id: itemRecuperado.id, tipo: itemRecuperado.tipo, pesoKg: itemRecuperado.pesoKg },
      };
      depositadoNoPorao = true;
    }
  }

  const rec = aplicarRegrasSaquePosCombateCampanha(vitoria.recompensa, estadoPosTick);
  const novaCarteira = {
    sucata: Number(estadoPosTick.economia?.sucata ?? 0) + Number(rec.sucata ?? 0),
    biomassa: Number(estadoPosTick.economia?.biomassa ?? 0) + Number(rec.biomassa ?? 0),
    combustivel: Number(estadoPosTick.economia?.combustivel ?? 0) + Number(rec.combustivel ?? 0),
    municao: Number(estadoPosTick.economia?.municao ?? 0) + Number(rec.municao ?? 0),
  };

  const metricasAnt = estadoPosTick.meta?.metricasRun ?? {};
  const semDanoCascoInimigo = Number(alvo.hpCascoAtual ?? 0) >= Number(alvo.hpCascoMax ?? 1);
  const novasMetricas = {
    ...metricasAnt,
    setorMaximoAlcancado: Math.max(Number(metricasAnt.setorMaximoAlcancado ?? 1), setor),
    combatesVencidos: Number(metricasAnt.combatesVencidos ?? 0) + 1,
    barcosCapturadosIntactosNaRun:
      Number(metricasAnt.barcosCapturadosIntactosNaRun ?? 0) + (vitoria.modalidade === 'CAPTURA_INTACTA' ? 1 : 0),
    orgaosIntactosExtraidosNaRun:
      Number(metricasAnt.orgaosIntactosExtraidosNaRun ?? 0) + (vitoria.modalidade === 'EXTRACAO_CIRURGICA' ? 1 : 0),
    venceuCombateSetor4SemDanoCascoInimigo:
      Boolean(metricasAnt.venceuCombateSetor4SemDanoCascoInimigo) || (setor >= 4 && semDanoCascoInimigo),
    sucataAcumuladaTotal: Number(metricasAnt.sucataAcumuladaTotal ?? 0) + Number(rec.sucata ?? 0),
    biomassaAcumuladaTotal: Number(metricasAnt.biomassaAcumuladaTotal ?? 0) + Number(rec.biomassa ?? 0),
  };

  const perfilAtualizado = atualizarPerfilComMetricasRun(
    estadoPosTick.perfilJogador ?? criarPerfilInicial(),
    {
      setorNumero: setor,
      vitoriaCombate: true,
      danoCascoCausadoAoInimigoNestaLuta: semDanoCascoInimigo ? 0 : 1,
      barcosCapturadosIntactosNestaRun: novasMetricas.barcosCapturadosIntactosNaRun,
      orgaosIntactosExtraidosNestaRun: novasMetricas.orgaosIntactosExtraidosNaRun,
      setorNumeroAlcanceMaxNestaRun: novasMetricas.setorMaximoAlcancado,
      incrementarBarcosCapturados: vitoria.modalidade === 'CAPTURA_INTACTA' ? 1 : 0,
      incrementarOrgaosExtraidos: vitoria.modalidade === 'EXTRACAO_CIRURGICA' ? 1 : 0,
    }
  );

  const navePosVitoria = recalcularHidraulicaNaveImutavel({
    ...estadoPosTick.naveJogador,
    pesoVirtualArrastoKg: 0.0,
    penalidadeSustentacaoKg: 0.0,
    neutralizaChuvaAcidaRestanteSeg: 0.0,
    tripulacao: tripulacaoResgatada,
    poraoCarga: poraoPosSaque,
  });

  const telLuta = estadoPosTick.meta?.telemetriaCombateSteam ?? {};
  const hpInicioLuta = Number(estadoPosTick.meta?.hpCascoJogadorInicioLuta ?? navePosVitoria.hpCascoAtual ?? 1);
  const avalConqPosCombate = estadoPosTick.meta?.edicaoComercialSteam
    ? avaliarConquistasSteam(
        {
          especieNave: navePosVitoria.idArquitetura,
          setorAtual: setor,
          dificuldade: estadoPosTick.meta?.dificuldade ?? 'NORMAL',
          saltosRealizados: Number(novasMetricas.saltosRealizadosNaRun ?? novasMetricas.combatesVencidos ?? 1),
          capturaIntactaRealizada:
            vitoria.modalidade === 'CAPTURA_INTACTA' || vitoria.modalidade === 'EXTRACAO_CIRURGICA',
          leviataDerrotado:
            alvo.arquetipoId === 'MONSTRO_4_HIDRA' || alvo.arquetipoId === 'MONSTRO_4_LEVIATA_FOSSA',
          vitoriaCombateSemTouchdown:
            !Boolean(telLuta.caiuEmTouchdownNaLuta) && navePosVitoria.estadoFisico === '1_NO_FOIL',
          vitoriaEmTouchdownSemMortes:
            navePosVitoria.estadoFisico !== '1_NO_FOIL' &&
            !Boolean(telLuta.sofreuMorteTripulanteNaLuta) &&
            tripulacaoResgatada.filter((t) => Number(t.hpAtual ?? 0) > 0).length >=
              Number(
                estadoPosTick.meta?.tripulacaoVivosInicioLutaCount ??
                  (estadoCampanha.naveJogador?.tripulacao ?? []).filter((t) => Number(t.hpAtual ?? 0) > 0).length
              ),
          vitoriaCombateZeroDanoCasco:
            !Boolean(telLuta.sofreuDanoCascoNaLuta) && Number(navePosVitoria.hpCascoAtual ?? 0) >= hpInicioLuta,
          aguaDrenadaNaLutaKg: Number(telLuta.aguaDrenadaNaLutaKg ?? 0),
          sistemasInimigosIonizadosSimultaneos: Number(telLuta.sistemasInimigosIonizadosSimultaneos ?? 0),
          impactosAbsorvidosOuDefletidosNaLuta: Number(telLuta.impactosAbsorvidosOuDefletidosNaLuta ?? 0),
          feixeDisparadoSobTintaFurtiva: Boolean(telLuta.feixeDisparadoSobTintaFurtiva),
          esquivouEmMergulhoTatico: Boolean(telLuta.esquivouEmMergulhoTatico),
          sistemaNoNivelMaximo: Boolean(novasMetricas.evoluiuSistemaNivelMaximoNaRun),
          tutorialConcluido: Boolean(estadoPosTick.meta?.tutorialSteam?.concluido),
          ...contarArsenalEOrgaosNaveSteam(navePosVitoria),
          layoutsTipoBDesbloqueados: [
            ...(perfilAtualizado.layoutsTipoBDesbloqueados ?? []),
            ...(estadoPosTick.meta?.layoutsTipoBDesbloqueados ?? []),
          ],
        },
        [
          ...(perfilAtualizado.conquistasSteamDesbloqueadas ?? []),
          ...(estadoPosTick.meta?.conquistasDesbloqueadas ?? []),
        ]
      )
    : null;
  const perfilFinalPosCombate = avalConqPosCombate
    ? atualizarPerfilComMetricasRun(perfilAtualizado, {
        conquistasSteamDesbloqueadas: avalConqPosCombate.todosDesbloqueados,
        layoutsTipoBDesbloqueados: avalConqPosCombate.layoutsTipoBDesbloqueados,
        configuracoesSteam: estadoPosTick.meta?.configuracoesSteam,
      })
    : perfilAtualizado;

  const mapaPosSaque =
    estadoPosTick.meta?.edicaoComercialSteam &&
    estadoPosTick.mapaSetorial &&
    calcularModificadoresPassivosOrgaosSteam(navePosVitoria).revelaNosAdjacentesMapa === true
      ? { ...estadoPosTick.mapaSetorial, cartaRevelada: true }
      : estadoPosTick.mapaSetorial;

  const estadoComModalSaque = clonarProfundoCongelado({
    ...estadoPosTick,
    ...(mapaPosSaque ? { mapaSetorial: mapaPosSaque } : {}),
    perfilJogador: perfilFinalPosCombate,
    catalogoHangarNaves: CATALOGO_NAVES_54.map((n) => ({
      id: n.idArquitetura,
      nome: n.nome,
      estilo: n.estiloTatico,
      chassiKg: n.pesoChassiKg,
      hpMax: n.hpCascoMax,
      desbloqueada: Boolean(perfilFinalPosCombate.carcacasDesbloqueadas?.[n.idArquitetura]),
    })),
    economia: novaCarteira,
    recursos: novaCarteira,
    naveJogador: navePosVitoria,
    alvoCombate: {
      ...alvo,
      ativo: false,
    },
    meta: {
      ...estadoPosTick.meta,
      ...(avalConqPosCombate
        ? {
            conquistasDesbloqueadas: [...avalConqPosCombate.todosDesbloqueados],
            layoutsTipoBDesbloqueados: [...avalConqPosCombate.layoutsTipoBDesbloqueados],
            ...(avalConqPosCombate.novosDesbloqueados.length > 0
              ? {
                  popupConquistaRecente: {
                    idConquista: avalConqPosCombate.novosDesbloqueados[0],
                    idsNovas: [...avalConqPosCombate.novosDesbloqueados],
                    restanteSeg: 4.5,
                  },
                }
              : {}),
          }
        : {}),
      modalCampanhaAtivo: 'SAQUE',
      perigoAmbientalId: null,
      modificadoresCombateAtivos: null,
      metricasRun: novasMetricas,
      saquePendente: {
        modalidade: vitoria.modalidade,
        inimigoNome: alvo.nome ?? alvo.idInimigo ?? 'Alvo Hostil',
        sucata: Number(rec.sucata ?? 0),
        biomassa: Number(rec.biomassa ?? 0),
        combustivel: Number(rec.combustivel ?? 0),
        municao: Number(rec.municao ?? 0),
        itemRecuperado,
        depositadoNoPorao,
        animaisResgatadosIds: vitoria.animaisResgatadosIds ?? [],
      },
    },
  });

  if (opcoesPersistencia.persistirEmDisco === true) {
    salvarPerfilDisco(perfilFinalPosCombate, opcoesPersistencia);
    salvarRunSaveDisco(estadoComModalSaque, opcoesPersistencia);
  }

  return estadoComModalSaque;
}
