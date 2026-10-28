/**
 * ONDA 6 — Runtime Client-Side HTML5/Canvas 60 FPS, Input Tático e Feedback Instantâneo de Rejeição
 * Dono Único (Lei N5): src/onda6-ui/runtime-navegador.mjs
 *
 * Responsabilidades:
 *  - Módulo 100% puro e isomórfico (0 imports Node.js, 0 structuredClone — carrega nativamente no navegador via
 *    ES Modules `/onda6-ui/runtime-navegador.mjs` e em `/cliente.js` sem `.toString()`);
 *  - `formatarMensagemRejeicaoUi`: traduz códigos de rejeição do motor/campanha em avisos táticos legíveis em PT-BR;
 *  - `criarControladorToastCliente`: temporizador determinístico por `dt` (sem depender de `Date`/`setTimeout`);
 *  - `iniciarRuntimeDomBiofoil`: loop `requestAnimationFrame` a 60 FPS + `pulsarQuadroMusical60Fps` + sincronização
 *    `/api/comando` e `/api/tick` sem replay espúrio de SFX em hover/pausa.
 */
import { interpolarEstadoVisual60Fps } from './interpolador-60fps.mjs';
import { rasterizarQuadroRgba960x540 } from './renderizador-canvas.mjs';
import { criarMotorAudioMaritimoCliente } from './sintetizador-webaudio-cliente.mjs';
import {
  criarMotorAudioOggFoleySteam,
  resolverChaveFoleyEventoVisual,
  resolverPanEstereoEventoVisual,
} from '../onda7-steam/motor-audio-ogg-foley.mjs';
import { obterCatalogo24ConquistasSteam } from '../onda7-steam/dificuldades-conquistas-opcoes.mjs';
import {
  calcularViewportDisplaySteam,
  traduzirEstadoGamepadSteamDeck,
  encontrarHitboxSnapDirecionalGamepad,
  criarRuntimeLocalSteamCliente,
} from '../onda7-steam/runtime-local-steam-cliente.mjs';

const MAPA_MENSAGENS_REJEICAO_PT = Object.freeze({
  ENERGIA_INSUFICIENTE: 'SEM ENERGIA RESERVA NO CORACAO BIO-ELETRICO',
  SEM_ENERGIA_LIVRE_REATOR: 'SEM ENERGIA RESERVA NO CORACAO BIO-ELETRICO',
  BARRAS_INTEIRAS_ESGOTADAS: 'SISTEMA NO LIMITE MAXIMO DE BARRAS INTEGRAS',
  SISTEMA_JA_ZERADO: 'SISTEMA JA ESTA COM 0 ENERGIA ALOCADA',
  BLOQUEADO_TRAVA_HIDROSTATICA: 'TRAVA HIDROSTATICA ATIVA: EMIRJA AO FOIL [M] PARA DRENAR',
  BLOQUEADO_COMBATE_OBRIGATORIO: 'COMBATE ATIVO — DESTRUA O ALVO OU CARREGUE FUGA [J] ANTES DE ZARPAR',
  CARCACA_BLOQUEADA_NO_PERFIL: 'BIONAVE BLOQUEADA NO PERFIL — CUMPRA O MARCO DE DESBLOQUEIO',
  LAYOUT_TIPO_B_BLOQUEADO: 'LAYOUT TIPO B BLOQUEADO — CUMPRA AS 2 CONQUISTAS DA ESPECIE',
  SLOTS_DORSAIS_LOTADOS: 'SLOTS DORSAIS OCUPADOS — DESEQUIPE UMA ARMA ANTES',
  SEM_SLOT_ARMA_LIVRE: 'TODOS OS 4 SLOTS DORSAIS ESTAO OCUPADOS — GUARDE UMA ARMA ANTES',
  SLOT_ARMA_VAZIO: 'SLOT DE ARMA SELECIONADO ESTA VAZIO',
  SLOT_ARMA_INVALIDO: 'SELECIONE UM SLOT DE ARMA VALIDO [1..4]',
  SOQUETES_ARMA_LOTADOS: 'SOQUETES BIOLOGICOS DA ARMA LOTADOS — REMOVA UM ORGAO',
  SEM_SOQUETE_LIVRE: 'ARMA SEM SOQUETE BIOLOGICO LIVRE — EXTRAIA UM ORGAO ANTES',
  FALHA_ENXERTAR_ORGAO: 'NAO FOI POSSIVEL ENXERTAR ORGAO — VERIFIQUE OS SOQUETES DA ARMA',
  FALHA_REMOVER_ORGAO: 'NAO FOI POSSIVEL EXTRAIR ORGAO PARA O PORAO',
  ARMA_SEM_ORGAOS_ENXERTADOS: 'ESTA ARMA NAO POSSUI ORGAOS ENXERTADOS PARA EXTRAIR',
  REMOVA_ORGAOS_ANTES_DE_GUARDAR: 'EXTRAIA OS ORGAOS ENXERTADOS ANTES DE GUARDAR A ARMA NO PORAO',
  REMOVA_ORGAOS_ANTES_DE_TROCAR_ARMA: 'EXTRAIA OS ORGAOS DA ARMA ATUAL ANTES DE SUBSTITUI-LA',
  PORAO_CARGA_LOTADO: 'PORAO DE CARGA LOTADO (4/4) — EQUIPE, VENDA OU DESCARTE UM ITEM',
  PORAO_LOTADO: 'PORAO DE CARGA LOTADO (4/4) — EQUIPE OU VENDA UM ITEM ANTES',
  SLOT_PORAO_VAZIO: 'COMPARTIMENTO DO PORAO SELECIONADO ESTA VAZIO',
  ITEM_PORAO_NAO_EH_ARMA: 'ESTE ITEM DO PORAO NAO E UM CHASSI DE ARMA',
  ITEM_PORAO_NAO_EH_ORGAO: 'ESTE ITEM DO PORAO NAO E UM ORGAO BIOLOGICO',
  INSUMOS_INSUFICIENTES: 'SUCATA OU BIOMASSA INSUFICIENTE PARA ESTA OPERACAO',
  MOEDA_INSUFICIENTE: 'SUCATA OU BIOMASSA INSUFICIENTE PARA ESTE UPGRADE OU COMPRA',
  NIVEL_MAXIMO_ATINGIDO: 'ESTA ARVORE DE UPGRADE JA ATINGIU O NIVEL MAXIMO',
  UPGRADE_NIVEL_MAXIMO: 'ESTA ARVORE DE UPGRADE JA ATINGIU O NIVEL MAXIMO',
  UPGRADE_INDISPONIVEL: 'UPGRADE INDISPONIVEL NO ESTADO ATUAL DA BIONAVE',
  EXIGE_RECIFE_FORJA_LOJA: 'OPERACAO EXCLUSIVA DE UM RECIFE-FORJA SIMBIOTICO [LOJA]',
  OFICINA_APENAS_MAPA_LOJA_OU_EVENTO: 'A OFICINA [U] NAO PODE SER ABERTA DURANTE COMBATE ATIVO',
  MODAL_PRIORITARIO_ATIVO: 'CONCLUA O MODAL ATUAL [ENTER] ANTES DE ABRIR A OFICINA',
  NENHUMA_ARMA_MANUAL_PRONTA: 'NENHUMA ARMA EM MODO MANUAL [MAN] COM 100% DE CARGA E MIRA ATIVA',
  SEM_TRIPULANTE_NA_CAMARA_7: 'POSICIONE TRIPULANTE NA CAMARA C7 PARA ABORDAGEM [G]',
  DOMO_TERMICO_BLOQUEIA_ABORDAGEM: 'DOMO TERMICO DA DRAGA BLOQUEIA CAPSULA DE ABORDAGEM [G]',
  TUBO_ABORDAGEM_AUSENTE: 'INSTALE O TUBO DE ABORDAGEM NA OFICINA [U] PARA ABORDAR',
  TUBO_ABORDAGEM_DESLIGADO: 'ALIMENTE O SISTEMA TUBO COM ENERGIA PARA LANCAR ABORDAGEM [G]',
  SALA_INIMIGA_LOTADA_MAX_2: 'SALA INIMIGA JA POSSUI O LIMITE DE 2 ABORDADORES ALIADOS',
  TRIPULANTE_NAO_ESTA_A_BORDO_INIMIGO: 'SELECIONE UM ALIADO JA A BORDO DO INIMIGO PARA MOVER LADO LA',
  SALA_BEAM_INVALIDA: 'SELECIONE SALAS ORTOGONALMENTE ADJACENTES PARA O FEIXE TERMICO',
  TRINCA_BEAM_INDISPONIVEL: 'NAO HA ROTA ORTOGONAL DE FEIXE A PARTIR DESTA SALA',
  SALTO_FUGA_INDISPONIVEL: 'CARGA DE SALTO INCOMPLETA — AGUARDE 100% COM SIFAO E CORTEX ATIVOS',
  COOLDOWN_ESPECIAL_ATIVO: 'HABILIDADE BIOLOGICA AINDA EM RECARGA METABOLICA',
  NO_MAPA_INALCANCAVEL: 'BOIA HIDROGRAFICA FORA DE ALCANCE A PARTIR DA POSICAO ATUAL',
  ESTOQUE_ESGOTADO_LOJA: 'ITEM ESGOTADO NESTE RECIFE-FORJA SIMBIOTICO',
  NENHUMA_RUN_SALVA_DISPONIVEL: 'NENHUMA EXPEDICAO SALVA DISPONIVEL PARA CONTINUAR',
  REJEITADO_FASE_INVALIDA: 'ACAO INDISPONIVEL NESTA FASE DA EXPEDICAO',
  PRECONDICAO_NAO_ATENDIDA: 'PRE-CONDICAO TATICA NAO ATENDIDA (VERIFIQUE ENERGIA, CUSTO OU RECARGA)',
});

const MAPA_MENSAGENS_REJEICAO_EN = Object.freeze({
  ENERGIA_INSUFICIENTE: 'NO RESERVE POWER IN BIO-ELECTRIC HEART',
  SEM_ENERGIA_LIVRE_REATOR: 'NO RESERVE POWER IN BIO-ELECTRIC HEART',
  BARRAS_INTEIRAS_ESGOTADAS: 'SYSTEM ALREADY AT MAXIMUM INTACT POWER BARS',
  SISTEMA_JA_ZERADO: 'SYSTEM ALREADY HAS 0 ALLOCATED POWER',
  BLOQUEADO_TRAVA_HIDROSTATICA: 'HYDROSTATIC LOCK ACTIVE: SURFACE TO FOIL [M] TO DRAIN',
  BLOQUEADO_COMBATE_OBRIGATORIO: 'HOSTILE ENGAGEMENT — DESTROY TARGET OR CHARGE JUMP [F]',
  CARCACA_BLOQUEADA_NO_PERFIL: 'BIO-CRAFT LOCKED IN PROFILE — COMPLETE UNLOCK MILESTONE',
  LAYOUT_TIPO_B_BLOQUEADO: 'TYPE B LAYOUT LOCKED — COMPLETE BOTH (2) SPECIES ACHIEVEMENTS',
  SLOTS_DORSAIS_LOTADOS: 'DORSAL SLOTS FULL — UNEQUIP A WEAPON FIRST',
  SEM_SLOT_ARMA_LIVRE: 'ALL 4 DORSAL SLOTS OCCUPIED — STORE A WEAPON FIRST',
  SLOT_ARMA_VAZIO: 'SELECTED WEAPON SLOT IS EMPTY',
  SLOT_ARMA_INVALIDO: 'SELECT A VALID WEAPON SLOT [1..4]',
  SOQUETES_ARMA_LOTADOS: 'BIO-SOCKETS FULL — EXTRACT AN ORGAN FIRST',
  SEM_SOQUETE_LIVRE: 'NO FREE BIO-SOCKET ON WEAPON — EXTRACT AN ORGAN FIRST',
  FALHA_ENXERTAR_ORGAO: 'CANNOT GRAFT ORGAN — CHECK WEAPON BIO-SOCKETS',
  FALHA_REMOVER_ORGAO: 'CANNOT EXTRACT ORGAN INTO CARGO HOLD',
  ARMA_SEM_ORGAOS_ENXERTADOS: 'THIS WEAPON HAS NO GRAFTED ORGANS TO EXTRACT',
  REMOVA_ORGAOS_ANTES_DE_GUARDAR: 'EXTRACT GRAFTED ORGANS BEFORE STORING WEAPON IN HOLD',
  REMOVA_ORGAOS_ANTES_DE_TROCAR_ARMA: 'EXTRACT ORGANS FROM CURRENT WEAPON BEFORE SWAPPING',
  PORAO_CARGA_LOTADO: 'CARGO HOLD FULL (4/4) — EQUIP, SELL OR DISCARD AN ITEM',
  PORAO_LOTADO: 'CARGO HOLD FULL (4/4) — EQUIP OR SELL AN ITEM FIRST',
  SLOT_PORAO_VAZIO: 'SELECTED CARGO HOLD COMPARTMENT IS EMPTY',
  ITEM_PORAO_NAO_EH_ARMA: 'SELECTED CARGO ITEM IS NOT A WEAPON CHASSIS',
  ITEM_PORAO_NAO_EH_ORGAO: 'SELECTED CARGO ITEM IS NOT A BIO-ORGAN',
  INSUMOS_INSUFICIENTES: 'NOT ENOUGH SCRAP OR BIOMASS FOR THIS OPERATION',
  MOEDA_INSUFICIENTE: 'NOT ENOUGH SCRAP OR BIOMASS FOR THIS UPGRADE OR PURCHASE',
  NIVEL_MAXIMO_ATINGIDO: 'UPGRADE TREE HAS ALREADY REACHED MAXIMUM LEVEL',
  UPGRADE_NIVEL_MAXIMO: 'UPGRADE TREE HAS ALREADY REACHED MAXIMUM LEVEL',
  UPGRADE_INDISPONIVEL: 'UPGRADE UNAVAILABLE IN CURRENT BIO-CRAFT STATE',
  EXIGE_RECIFE_FORJA_LOJA: 'OPERATION RESTRICTED TO A SYMBIOTIC REEF-FORGE [STORE]',
  OFICINA_APENAS_MAPA_LOJA_OU_EVENTO: 'WORKSHOP [U] CANNOT BE OPENED DURING ACTIVE COMBAT',
  MODAL_PRIORITARIO_ATIVO: 'DISMISS CURRENT MODAL [ENTER] BEFORE OPENING WORKSHOP',
  NENHUMA_ARMA_MANUAL_PRONTA: 'NO MANUAL [MAN] WEAPON AT 100% CHARGE WITH TARGET LOCK',
  SEM_TRIPULANTE_NA_CAMARA_7: 'STATION CREW IN CHAMBER C7 TO LAUNCH BOARDING POD [G]',
  DOMO_TERMICO_BLOQUEIA_ABORDAGEM: 'DREDGE THERMAL DOME BLOCKS BOARDING PODS [G]',
  TUBO_ABORDAGEM_AUSENTE: 'INSTALL BOARDING TUBE IN WORKSHOP [U] TO LAUNCH PODS',
  TUBO_ABORDAGEM_DESLIGADO: 'ALLOCATE POWER TO BOARDING TUBE TO LAUNCH PODS [G]',
  SALA_INIMIGA_LOTADA_MAX_2: 'ENEMY ROOM ALREADY AT MAXIMUM OF 2 ALLIED BOARDERS',
  TRIPULANTE_NAO_ESTA_A_BORDO_INIMIGO: 'SELECT AN ALLY ALREADY ABOARD ENEMY VESSEL TO MOVE',
  SALA_BEAM_INVALIDA: 'SELECT ORTHOGONALLY ADJACENT ROOMS FOR THERMAL BEAM',
  TRINCA_BEAM_INDISPONIVEL: 'NO ORTHOGONAL BEAM PATH AVAILABLE FROM THIS ROOM',
  SALTO_FUGA_INDISPONIVEL: 'JUMP CHARGE INCOMPLETE — WAIT FOR 100% WITH SIPHON & CORTEX',
  COOLDOWN_ESPECIAL_ATIVO: 'BIOLOGICAL ABILITY STILL ON METABOLIC COOLDOWN',
  NO_MAPA_INALCANCAVEL: 'HYDROGRAPHIC BUOY OUT OF RANGE FROM CURRENT POSITION',
  ESTOQUE_ESGOTADO_LOJA: 'ITEM SOLD OUT AT THIS SYMBIOTIC REEF-FORGE',
  NENHUMA_RUN_SALVA_DISPONIVEL: 'NO SAVED EXPEDITION AVAILABLE TO CONTINUE',
  REJEITADO_FASE_INVALIDA: 'ACTION UNAVAILABLE IN CURRENT EXPEDITION PHASE',
  PRECONDICAO_NAO_ATENDIDA: 'TACTICAL PRECONDITION NOT MET (CHECK POWER, COST OR CHARGE)',
});

export function formatarMensagemRejeicaoUi(marcadorRejeicao, avisoCampanha = '', opcoesDebug = {}) {
  const avisoLimpo = String(avisoCampanha ?? '').trim();
  const chave = String(marcadorRejeicao ?? '').trim();
  const en = opcoesDebug?.idioma === 'en-US';
  const mapa = en ? MAPA_MENSAGENS_REJEICAO_EN : MAPA_MENSAGENS_REJEICAO_PT;
  if (opcoesDebug?.priorizarAvisoVelhoMutacao === true && avisoLimpo) {
    return avisoLimpo.slice(0, 76);
  }
  if (chave && mapa[chave]) {
    return mapa[chave];
  }
  if (chave) {
    return `${en ? 'ACTION BLOCKED' : 'ACAO BLOQUEADA'}: ${chave.replace(/_/g, ' ')}`.slice(0, 76);
  }
  return avisoLimpo.slice(0, 76);
}

const PATAMARES_MASTRO_CLIENTE_KG = Object.freeze([0, 50, 100, 150, 200, 240, 280, 330]);

export function enriquecerGhostPreviewCliente(vm, idHitboxHover, opcoesDebug = {}) {
  if (!vm || !idHitboxHover) return vm;
  if (vm.termometroSustentacao?.ghostPreview?.ativo && vm.idHitboxHover === idHitboxHover) return vm;
  const ehValvulaExt = String(idHitboxHover).indexOf('VALVULA_CAMARA_') === 0;
  const ehSysSif = idHitboxHover === 'SISTEMA_SIF';
  if (
    idHitboxHover !== 'BTN_DRENAR_SEGURO' &&
    idHitboxHover !== 'BTN_DRENAR_TUDO' &&
    idHitboxHover !== 'BTN_MERGULHO_TATICO' &&
    !ehValvulaExt &&
    !ehSysSif
  ) {
    return vm.idHitboxHover === idHitboxHover ? vm : { ...vm, idHitboxHover };
  }
  const ts = vm.termometroSustentacao || {};
  if (
    opcoesDebug?.usarGhostAproximadoLegadoMutacao !== true &&
    ts.mapaGhostPorHitbox &&
    ts.mapaGhostPorHitbox[idHitboxHover]
  ) {
    return {
      ...vm,
      idHitboxHover,
      termometroSustentacao: {
        ...ts,
        ghostPreview: ts.mapaGhostPorHitbox[idHitboxHover],
      },
    };
  }
  const ehTd = (vm.barraSuperior?.estadoFisico || '1_NO_FOIL') !== '1_NO_FOIL';
  const camaras = Array.isArray(vm.camaras) ? vm.camaras : [];
  const aguaAtual = Number(
    ts.aguaTotalKg ??
      (camaras.length > 0
        ? Math.round(camaras.reduce((acc, c) => acc + Number(c.aguaKg ?? 0), 0) * 100) / 100
        : 100)
  );
  const pesoAtual = Number(ts.pesoTotalKg ?? 225);
  const sustAtual = Number(ts.sustentacaoAtualKg ?? 260);
  const perdaCavAtual = aguaAtual < 62.5 ? Math.round((62.5 - aguaAtual) * 2 * 100) / 100 : 0;
  const camSif = camaras.find((c) => c.id === 5) ?? null;
  const camMst = camaras.find((c) => c.id === 6) ?? null;
  const barrasSifAtu = camSif
    ? Math.max(0, Number(camSif.barrasEnergiaAlocada ?? 0) - Math.max(0, Number(camSif.barrasIonizadas ?? 0)))
    : Math.max(0, Math.round(sustAtual / 130));
  const barrasMstAtu = camMst ? Math.max(0, Math.min(7, Number(camMst.barrasIntegridade ?? 0))) : 4;
  const sustPotencialFoil =
    barrasSifAtu === 0 || barrasMstAtu === 0
      ? 0
      : sustAtual > 0
        ? sustAtual + perdaCavAtual
        : PATAMARES_MASTRO_CLIENTE_KG[barrasMstAtu] + barrasSifAtu * 30;

  const enGhost = vm.configuracoesSteam?.idioma === 'en-US';

  if (ehSysSif) {
    const deltaSif = opcoesDebug?.usarGhostAproximadoLegadoMutacao === true ? 130 : 30;
    const novaBarraSif = Math.max(0, barrasSifAtu - 1);
    const sustSif =
      opcoesDebug?.usarGhostAproximadoLegadoMutacao === true
        ? Math.max(0, sustAtual - deltaSif)
        : novaBarraSif === 0 || barrasMstAtu === 0
          ? 0
          : Math.max(0, Math.round((sustPotencialFoil - (barrasSifAtu > 0 ? 30 : 0) - perdaCavAtual) * 100) / 100);
    const quedaSif = !ehTd && pesoAtual > sustSif;
    return {
      ...vm,
      idHitboxHover,
      termometroSustentacao: {
        ...ts,
        ghostPreview: {
          ativo: true,
          alvoHover: idHitboxHover,
          aguaAtualKg: aguaAtual,
          aguaProjetadaKg: aguaAtual,
          travadoHidrostatico: false,
          pesoProjetadoKg: pesoAtual,
          sustentacaoProjetadaKg: sustSif,
          entrariaEmCavitacao: aguaAtual < 62.5,
          perdaSustentacaoCavitacaoKg: perdaCavAtual,
          causariaQuedaNoMar: quedaSif,
          rotuloFantasma: ehTd
            ? (enGhost ? '[IN TOUCHDOWN]' : '[EM TOUCHDOWN]')
            : quedaSif && aguaAtual < 62.5
              ? (enGhost ? '[CAVITATION -> DROP]' : '[CAVITAÇÃO -> QUEDA]')
              : aguaAtual < 62.5
                ? `[${enGhost ? 'CAVITATION' : 'CAVITAÇÃO'} -${Math.round(perdaCavAtual)}kg]`
                : quedaSif
                  ? (enGhost ? '[DROP TO SEA]' : '[QUEDA NO MAR]')
                  : (enGhost ? '[STABLE ON FOIL]' : '[ESTÁVEL NO FOIL]'),
        },
      },
    };
  }
  if (ehTd && idHitboxHover !== 'BTN_MERGULHO_TATICO') {
    return {
      ...vm,
      idHitboxHover,
      termometroSustentacao: {
        ...ts,
        ghostPreview: {
          ativo: true,
          alvoHover: idHitboxHover,
          aguaAtualKg: aguaAtual,
          aguaProjetadaKg: aguaAtual,
          travadoHidrostatico: true,
          pesoProjetadoKg: pesoAtual,
          sustentacaoProjetadaKg: sustAtual,
          entrariaEmCavitacao: aguaAtual < 62.5,
          perdaSustentacaoCavitacaoKg: perdaCavAtual,
          causariaQuedaNoMar: false,
          rotuloFantasma: enGhost ? '[HYDROSTATIC LOCK]' : '[TRAVA HIDROSTÁTICA]',
        },
      },
    };
  }
  if (idHitboxHover === 'BTN_MERGULHO_TATICO') {
    const sustAlvoM = ehTd ? Math.max(0, Math.round((sustPotencialFoil - perdaCavAtual) * 100) / 100) : 0;
    const quedaM = !ehTd || pesoAtual > sustAlvoM;
    return {
      ...vm,
      idHitboxHover,
      termometroSustentacao: {
        ...ts,
        ghostPreview: {
          ativo: true,
          alvoHover: idHitboxHover,
          aguaAtualKg: aguaAtual,
          aguaProjetadaKg: aguaAtual,
          travadoHidrostatico: false,
          pesoProjetadoKg: pesoAtual,
          sustentacaoProjetadaKg: sustAlvoM,
          entrariaEmCavitacao: aguaAtual < 62.5,
          perdaSustentacaoCavitacaoKg: perdaCavAtual,
          causariaQuedaNoMar: quedaM,
          rotuloFantasma: ehTd
            ? (pesoAtual <= sustAlvoM
                ? (enGhost ? '[SURFACE -> FOIL]' : '[EMERGIR -> FOIL]')
                : (enGhost ? '[TOO HEAVY!]' : '[PESADO DEMAIS!]'))
            : (enGhost ? '[DIVE -> SEA]' : '[MERGULHO -> MAR]'),
        },
      },
    };
  }
  const idCamValv = ehValvulaExt ? Number(String(idHitboxHover).replace('VALVULA_CAMARA_', '')) : 0;
  const camValv = ehValvulaExt ? camaras.find((c) => c.id === idCamValv) : null;
  const aguaDrenadaValv = camValv ? Math.max(0, Number(camValv.aguaKg ?? 0)) : Math.min(aguaAtual, 12.5);
  const aguaProj =
    idHitboxHover === 'BTN_DRENAR_SEGURO'
      ? Math.min(aguaAtual, 62.5)
      : idHitboxHover === 'BTN_DRENAR_TUDO'
        ? 0
        : Math.max(0, Math.round((aguaAtual - aguaDrenadaValv) * 100) / 100);
  const pesoProj = Math.max(0, Math.round((pesoAtual - Math.max(0, aguaAtual - aguaProj)) * 100) / 100);
  const perdaCav = aguaProj < 62.5 ? Math.round((62.5 - aguaProj) * 2 * 100) / 100 : 0;
  const sustProj =
    barrasSifAtu === 0 || barrasMstAtu === 0
      ? 0
      : Math.max(0, Math.round((sustPotencialFoil - perdaCav) * 100) / 100);
  const entrariaEmCavitacao = aguaProj < 62.5;
  const causariaQuedaNoMar = !ehTd && pesoProj > sustProj;
  const rotuloFantasma =
    entrariaEmCavitacao && causariaQuedaNoMar
      ? (enGhost ? '[CAVITATION -> DROP]' : '[CAVITAÇÃO -> QUEDA]')
      : entrariaEmCavitacao
        ? '[' + (enGhost ? 'CAVITATION' : 'CAVITAÇÃO') + ' -' + Math.round(perdaCav) + 'kg]'
        : causariaQuedaNoMar
          ? (enGhost ? '[DROP TO SEA]' : '[QUEDA NO MAR]')
          : idHitboxHover === 'BTN_DRENAR_SEGURO'
            ? (enGhost ? '[SAFE >=63kg]' : '[SEGURO >=63kg]')
            : (enGhost ? '[STABLE ON FOIL]' : '[ESTÁVEL NO FOIL]');
  return {
    ...vm,
    idHitboxHover,
    termometroSustentacao: {
      ...ts,
      ghostPreview: {
        ativo: true,
        alvoHover: idHitboxHover,
        aguaAtualKg: aguaAtual,
        aguaProjetadaKg: aguaProj,
        travadoHidrostatico: false,
        pesoProjetadoKg: pesoProj,
        sustentacaoProjetadaKg: sustProj,
        entrariaEmCavitacao,
        perdaSustentacaoCavitacaoKg: perdaCav,
        causariaQuedaNoMar,
        rotuloFantasma,
      },
    },
  };
}

export function criarControladorToastCliente(duracaoPadraoSeg = 2.4) {
  const durPadrao = Math.max(0.2, Number(duracaoPadraoSeg) || 2.4);
  let textoAtual = '';
  let restanteSeg = 0;

  return {
    acionarToast(mensagem, duracaoCustomSeg) {
      const txt = String(mensagem ?? '').trim();
      if (!txt) return '';
      textoAtual = txt.slice(0, 78);
      restanteSeg = Math.max(0.2, Number(duracaoCustomSeg) || durPadrao);
      return textoAtual;
    },
    avancarTempo(dtSeg) {
      const dt = Math.max(0, Number(dtSeg) || 0);
      if (restanteSeg > 0) {
        restanteSeg = Math.max(0, restanteSeg - dt);
        if (restanteSeg <= 0) {
          textoAtual = '';
        }
      }
      return textoAtual;
    },
    limparToast() {
      textoAtual = '';
      restanteSeg = 0;
    },
    obterTextoAtivo() {
      return restanteSeg > 0 ? textoAtual : '';
    },
  };
}

export function iniciarRuntimeDomBiofoil(docExplicito, winExplicito, estadoInicialPreCarregado) {
  const doc = docExplicito || (typeof document !== 'undefined' ? document : null);
  const win = winExplicito || (typeof window !== 'undefined' ? window : null);
  if (!doc || !win) return null;

  const canvas = doc.getElementById('biofoil-canvas');
  const bootEl = doc.getElementById('biofoil-bootstrap');
  if (!canvas || !bootEl) return null;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const imgData960 = typeof ctx.createImageData === 'function' ? ctx.createImageData(960, 540) : null;

  let estadoRt =
    estadoInicialPreCarregado && typeof estadoInicialPreCarregado === 'object'
      ? estadoInicialPreCarregado
      : JSON.parse(bootEl.textContent || '{}');

  const motorAudio = criarMotorAudioMaritimoCliente(win);
  const motorAudioSteam = criarMotorAudioOggFoleySteam();
  try {
    if (!win.bioFoilSteamDesktop && typeof win.location?.search === 'string' && win.location.search.includes('steam_ipc_port=')) {
      const paramsIpc = new URLSearchParams(win.location.search);
      const portaIpc = Number(paramsIpc.get('steam_ipc_port') || 0);
      const capiAtivo = paramsIpc.get('steam_capi') === '1';
      if (Number.isInteger(portaIpc) && portaIpc > 0 && portaIpc < 65536) {
        const postarIpcWin = (payload) => {
          try {
            if (typeof win.fetch === 'function') {
              const corpoJson = JSON.stringify(payload);
              return win
                .fetch(`/api/steam-ipc?port=${portaIpc}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: corpoJson,
                })
                .then((r) => (r.ok ? r.json() : Promise.reject(new Error('proxy_ipc'))))
                .catch(() =>
                  win
                    .fetch(`http://127.0.0.1:${portaIpc}/steam-ipc`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: corpoJson,
                    })
                    .then((r2) => r2.json())
                    .catch(() => ({ ok: false }))
                );
            }
          } catch {}
          return Promise.resolve({ ok: false });
        };
        Object.defineProperty(win, 'bioFoilSteamDesktop', {
          configurable: false,
          enumerable: true,
          writable: false,
          value: Object.freeze({
            hostNativo: 'WIN32_EDGE_WEBVIEW_IPC',
            steamworksCapiAtivo: capiAtivo,
            desbloquearConquista: (id, steamApiKey) =>
              postarIpcWin({
                op: 'desbloquearConquista',
                id: String(id || ''),
                ...(steamApiKey ? { steamApiKey: String(steamApiKey) } : {}),
              }),
            salvarConfiguracoes: (cfg) => postarIpcWin({ op: 'salvarConfiguracoes', cfg: cfg || {} }),
            salvarCloud: (arquivo, dados) => postarIpcWin({ op: 'salvarCloud', arquivo: String(arquivo || ''), dados: dados || {} }),
            atualizarRichPresence: (ctx) => postarIpcWin({ op: 'atualizarRichPresence', ctx: ctx || {} }),
            alternarTelaCheia: (ativo) => postarIpcWin({ op: 'alternarTelaCheia', ativo: Boolean(ativo) }),
          }),
        });
      }
    }
  } catch {}
  const runtimeLocalSteam = criarRuntimeLocalSteamCliente({
    estadoPartidaInicial: estadoRt.viewModel || {},
    ponteDesktopSteam: win.bioFoilSteamDesktop || null,
    adaptadorSimulacao: {
      avancarTick: (estAnt, dtSeg, optsLocais) => ({
        ...estAnt,
        tempoCombateSeg: Number(estAnt?.tempoCombateSeg ?? 0) + Number(dtSeg ?? 0.25),
        dificuldadeSteam: optsLocais?.dificuldade ?? estAnt?.dificuldadeSteam ?? 'NORMAL',
      }),
      despacharComando: (estAnt, cmd) => ({
        estadoPartida: {
          ...estAnt,
          ultimoComandoLocalTipo: cmd?.tipo ?? cmd?.acaoSteam ?? null,
        },
      }),
    },
  });
  try {
    win.__biofoilRuntimeLocalSteam = runtimeLocalSteam;
  } catch {
    // Escopo window congelado em ambiente restrito
  }
  const controladorToast = criarControladorToastCliente(2.4);

  function resolverTripulanteInicialCliente(vm) {
    const lista = vm && Array.isArray(vm.painelTripulacao) ? vm.painelTripulacao : [];
    return lista.length > 0 && lista[0].id ? lista[0].id : 'trip-polvo-1';
  }

  let contextoUi = {
    pausaTaticaAtiva: false,
    slotArmaSelecionado: 0,
    tripulanteSelecionadoId: resolverTripulanteInicialCliente(estadoRt.viewModel),
    modoOrdemAbordagem: false,
    salaAlvoAbordagemId: Number(estadoRt.viewModel?.resumoAbordagem?.salaAlvoPadraoId ?? 1) || 1,
    ultimaSalaBeamClicadaId: null,
  };
  let audioCtxLegado = null;
  let pacote60 = null;
  let assetsRgba = null;
  let assetsProntos = false;
  let tickEmVoo = false;
  let hoverHitboxId = null;
  let pressHitboxId = null;
  let ultimoRafMs = 0;
  let estadoVisual60 = null;
  let seqRequisicao = 0;
  let seqAplicada = 0;
  let botoesGamepadAnt = [];
  let cursorGamepad960 = { ativo: false, x: 480, y: 270 };
  let conquistasConhecidas = new Set(
    Array.isArray(estadoRt.viewModel?.conquistasDesbloqueadas)
      ? estadoRt.viewModel.conquistasDesbloqueadas
      : []
  );
  let ultimaTelaCheiaAplicada = Boolean(estadoRt.viewModel?.configuracoesSteam?.telaCheia);
  let ultimoRichPresenceChave = '';
  let ultimaAssinaturaCloudPerfil = '';
  let ultimaAssinaturaCloudRun = '';
  const idsEventosFoleyTocados = new Set();

  function extrairSnapshotFoleyHidraulico(vm) {
    if (!vm || typeof vm !== 'object') return null;
    const camaras = Array.isArray(vm.camaras)
      ? vm.camaras
      : (Array.isArray(vm.mapaBioNave) ? vm.mapaBioNave : []);
    let valvulasAbertas = 0;
    let brechasAtivas = 0;
    for (let i = 0; i < camaras.length; i += 1) {
      const c = camaras[i];
      if (c?.valvulaExternaAberta) valvulasAbertas += 1;
      brechasAtivas += Math.max(c?.brechaAtiva ? 1 : 0, Number(c?.rombosCasco ?? 0));
    }
    return {
      faseJogo: String(vm.faseJogo ?? 'INICIO'),
      estadoFisico: String(vm.barraSuperior?.estadoFisico ?? '1_NO_FOIL'),
      mergulhoAtivo: Boolean(vm.termometroSustentacao?.botaoMergulhoTatico?.ativo),
      valvulasAbertas,
      brechasAtivas,
      abordadoresAliados: Array.isArray(vm.tripulacaoAbordagemAliada) ? vm.tripulacaoAbordagemAliada.length : 0,
    };
  }
  let estadoHidraulicoFoleyAnt = extrairSnapshotFoleyHidraulico(estadoRt.viewModel);

  const mediaReduzir =
    typeof win.matchMedia === 'function'
      ? win.matchMedia('(prefers-reduced-motion: reduce)')
      : { matches: false };

  function aplicarViewportDisplaySteamAtual(gestoUsuario) {
    const vmVp = estadoRt.viewModel;
    if (!vmVp || !vmVp.edicaoComercialSteam) return;
    const cfgVp = vmVp.configuracoesSteam || {};
    if (canvas.style && Number(win.innerWidth) > 0 && Number(win.innerHeight) > 0) {
      const vp = calcularViewportDisplaySteam(win.innerWidth, win.innerHeight, cfgVp.escalaPixel || 'AUTO');
      canvas.style.width = `${vp.larguraCssPx}px`;
      canvas.style.height = `${vp.alturaCssPx}px`;
      if (canvas.dataset) {
        canvas.dataset.escalaEfetiva = String(vp.fatorEscala);
      }
    }
    const desejaTelaCheia = Boolean(cfgVp.telaCheia);
    if (desejaTelaCheia !== ultimaTelaCheiaAplicada) {
      ultimaTelaCheiaAplicada = desejaTelaCheia;
      const ponteDesktop = win.bioFoilSteamDesktop;
      if (ponteDesktop && typeof ponteDesktop.alternarTelaCheia === 'function') {
        void ponteDesktop.alternarTelaCheia(desejaTelaCheia);
      } else if (gestoUsuario) {
        try {
          if (desejaTelaCheia && doc.documentElement && typeof doc.documentElement.requestFullscreen === 'function') {
            Promise.resolve(doc.documentElement.requestFullscreen()).catch(() => {});
          } else if (!desejaTelaCheia && typeof doc.exitFullscreen === 'function') {
            Promise.resolve(doc.exitFullscreen()).catch(() => {});
          }
        } catch {
          // Navegador bloqueou fullscreen fora de gesto
        }
      }
    }
  }

  function tocarPlanoAudioLegado(planoAudio) {
    if (!planoAudio || typeof win.AudioContext !== 'function') return;
    if (!audioCtxLegado) audioCtxLegado = new win.AudioContext();
    const t0 = audioCtxLegado.currentTime;
    const filtro = audioCtxLegado.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.setValueAtTime(planoAudio.filtroSubaquaticoMaster.frequenciaCorteHz, t0);
    filtro.Q.setValueAtTime(planoAudio.filtroSubaquaticoMaster.fatorQ, t0);
    const masterGain = audioCtxLegado.createGain();
    masterGain.gain.setValueAtTime(planoAudio.ganhoMaster, t0);
    filtro.connect(masterGain);
    masterGain.connect(audioCtxLegado.destination);
    for (const spec of planoAudio.nosSintese || []) {
      const osc = audioCtxLegado.createOscillator();
      const gain = audioCtxLegado.createGain();
      osc.type = spec.tipoOscilador;
      osc.frequency.setValueAtTime(spec.freqInicialHz, t0 + spec.atrasoDisparoSeg);
      osc.frequency.linearRampToValueAtTime(spec.freqFinalHz, t0 + spec.atrasoDisparoSeg + spec.duracaoSeg);
      gain.gain.setValueAtTime(spec.ganhoPico, t0 + spec.atrasoDisparoSeg);
      gain.gain.linearRampToValueAtTime(0.0001, t0 + spec.atrasoDisparoSeg + spec.duracaoSeg);
      osc.connect(gain);
      gain.connect(filtro);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
      osc.start(t0 + spec.atrasoDisparoSeg);
      osc.stop(t0 + spec.atrasoDisparoSeg + spec.duracaoSeg);
    }
  }

  function sincronizarAudioResposta(dados, gestoUsuario, metaEvento = {}) {
    const vmAudio = dados?.viewModel || estadoRt.viewModel;
    if (vmAudio && vmAudio.edicaoComercialSteam) {
      const submersoReal = Boolean(
        vmAudio.mergulhoTaticoAtivo ||
          vmAudio.termometroSustentacao?.botaoMergulhoTatico?.ativo ||
          vmAudio.barraSuperior?.estadoFisico === '5_FURTIVO_AGUA'
      );
      const emTouchdownSuperficie = Boolean(
        vmAudio.faseJogo === 'COMBATE' &&
          vmAudio.barraSuperior?.estadoFisico &&
          vmAudio.barraSuperior.estadoFisico !== '1_NO_FOIL' &&
          !submersoReal
      );
      motorAudioSteam.atualizarEstadoJogo(
        {
          faseJogo: vmAudio.faseJogo,
          setorNumero: vmAudio.setorAtual ?? 1,
          emCombateHostil: vmAudio.faseJogo === 'COMBATE' && Boolean(vmAudio.painelAlvo?.presente),
          ehBossDraga: vmAudio.painelAlvo?.classeAlvo === 'CHEFE_DRAGA',
          faseChefe: Number(vmAudio.painelAlvo?.faseChefe ?? 1),
          submerso400Hz: submersoReal,
          pausaTaticaAtiva: Boolean(
            contextoUi.pausaTaticaAtiva && vmAudio.faseJogo === 'COMBATE' && !vmAudio.modalCampanhaAtivo
          ),
          emTouchdownCasco: emTouchdownSuperficie,
          vitoriaCampanha: Boolean(vmAudio.fimDeRunResumo?.vitoria),
        },
        {
          ...(vmAudio.configuracoesSteam || {}),
          mudoTotal: Boolean(vmAudio.audioMutado || vmAudio.configuracoesSteam?.mudoTotal),
        }
      );

      const ponteDesktop = win.bioFoilSteamDesktop;
      const listaConq = Array.isArray(vmAudio.conquistasDesbloqueadas) ? vmAudio.conquistasDesbloqueadas : [];
      const catalogoConqToast = obterCatalogo24ConquistasSteam();
      const ehEnConqToast = vmAudio.configuracoesSteam?.idioma === 'en-US';
      let tocouConquista = false;
      for (const idAch of listaConq) {
        if (!conquistasConhecidas.has(idAch)) {
          conquistasConhecidas.add(idAch);
          const metaAch = catalogoConqToast.find((a) => a.id === idAch);
          if (!tocouConquista) {
            tocouConquista = true;
            void motorAudioSteam.dispararFoley('CONQUISTA_STEAM', 0.95);
            if (metaAch) {
              const titAch = ehEnConqToast ? metaAch.tituloEn : metaAch.tituloPt;
              controladorToast.acionarToast(
                `${ehEnConqToast ? 'ACHIEVEMENT UNLOCKED' : 'CONQUISTA DESBLOQUEADA'}: ${titAch}`,
                3.6
              );
            }
          }
          if (ponteDesktop && typeof ponteDesktop.desbloquearConquista === 'function') {
            void ponteDesktop.desbloquearConquista(idAch, metaAch?.steamApiKey ?? idAch);
          }
        }
      }

      if (ponteDesktop && typeof ponteDesktop.atualizarRichPresence === 'function') {
        const chaveRp = `${vmAudio.faseJogo}|${vmAudio.setorAtual ?? 1}|${vmAudio.layoutId ?? ''}|${vmAudio.dificuldadeSteam ?? ''}|${vmAudio.configuracoesSteam?.idioma ?? ''}`;
        if (chaveRp !== ultimoRichPresenceChave) {
          ultimoRichPresenceChave = chaveRp;
          void ponteDesktop.atualizarRichPresence({
            faseJogo: vmAudio.faseJogo,
            setorNumero: vmAudio.setorAtual ?? 1,
            layoutId: vmAudio.layoutId ?? 'CARCACA_ALFA_A',
            dificuldade: vmAudio.dificuldadeSteam ?? 'NORMAL',
            idioma: vmAudio.configuracoesSteam?.idioma ?? 'pt-BR',
          });
        }
      }

      const hostJaSincronizaDiscoCloud = Boolean(
        ponteDesktop && typeof ponteDesktop.executarComandoMotor === 'function'
      );
      if (ponteDesktop && typeof ponteDesktop.salvarConfiguracoes === 'function' && vmAudio.configuracoesSteam) {
        const assCfg = `${JSON.stringify(vmAudio.configuracoesSteam)}|${listaConq.join(',')}`;
        if (assCfg !== ultimaAssinaturaCloudPerfil) {
          ultimaAssinaturaCloudPerfil = assCfg;
          void ponteDesktop.salvarConfiguracoes(vmAudio.configuracoesSteam);
          if (!hostJaSincronizaDiscoCloud && typeof ponteDesktop.salvarCloud === 'function') {
            const estLocalPerfil =
              moduloMotorLocal0ms && runtimeLocalSteam.temMotorRealHidratado()
                ? runtimeLocalSteam.obterSnapshotLocal().estadoPartida
                : null;
            const perfilReal = estLocalPerfil?.perfilJogador ?? estLocalPerfil?.perfilEterno ?? null;
            const carcacasFallback = { CARCACA_ALFA: true };
            const layoutsBFallback = [];
            for (const nv of vmAudio.hangarResumo?.naves ?? []) {
              if (nv.desbloqueada) carcacasFallback[nv.id] = true;
              if (nv.desbloqueadaTipoB) layoutsBFallback.push(`${nv.id}_B`);
            }
            void ponteDesktop.salvarCloud('profile.json', {
              ...(perfilReal && typeof perfilReal === 'object' ? perfilReal : {}),
              carcacasDesbloqueadas: perfilReal?.carcacasDesbloqueadas ?? carcacasFallback,
              layoutsTipoBDesbloqueados:
                estLocalPerfil?.meta?.layoutsTipoBDesbloqueados ??
                perfilReal?.layoutsTipoBDesbloqueados ??
                layoutsBFallback,
              estatisticasGlobais:
                perfilReal?.estatisticasGlobais ??
                perfilReal?.estatisticas ??
                vmAudio.hangarResumo?.estatisticas ??
                {},
              conquistasSteam: listaConq,
              conquistasSteamDesbloqueadas: listaConq,
              configuracoesSteam: vmAudio.configuracoesSteam,
            });
          }
        }
      }
      if (!hostJaSincronizaDiscoCloud && ponteDesktop && typeof ponteDesktop.salvarCloud === 'function') {
        const assRun = `${vmAudio.faseJogo}|${vmAudio.setorAtual ?? 1}|${vmAudio.barraSuperior?.hpCascoAtual ?? 0}|${vmAudio.barraSuperior?.recursos?.sucata ?? 0}`;
        if (assRun !== ultimaAssinaturaCloudRun && vmAudio.faseJogo !== 'INICIO') {
          ultimaAssinaturaCloudRun = assRun;
          const estCompletoCloud =
            moduloMotorLocal0ms && runtimeLocalSteam.temMotorRealHidratado()
              ? runtimeLocalSteam.obterSnapshotLocal().estadoPartida
              : null;
          void ponteDesktop.salvarCloud(
            'run_save.json',
            estCompletoCloud && typeof estCompletoCloud === 'object'
              ? estCompletoCloud
              : {
                  faseJogo: vmAudio.faseJogo,
                  setorAtual: vmAudio.setorAtual ?? 1,
                  layoutId: vmAudio.layoutId ?? 'CARCACA_ALFA_A',
                  hpCascoAtual: vmAudio.barraSuperior?.hpCascoAtual ?? 0,
                  recursos: vmAudio.barraSuperior?.recursos ?? null,
                }
          );
        }
      }

      if (vmAudio.faseJogo !== 'COMBATE') {
        idsEventosFoleyTocados.clear();
      }
      const snapHidAtu = extrairSnapshotFoleyHidraulico(vmAudio);
      if (snapHidAtu && estadoHidraulicoFoleyAnt && snapHidAtu.faseJogo === 'COMBATE' && estadoHidraulicoFoleyAnt.faseJogo === 'COMBATE') {
        if (snapHidAtu.mergulhoAtivo && !estadoHidraulicoFoleyAnt.mergulhoAtivo) {
          void motorAudioSteam.dispararFoley('MERGULHO_400HZ', 0.9);
        } else if (
          snapHidAtu.estadoFisico === '2_TOUCHDOWN' &&
          estadoHidraulicoFoleyAnt.estadoFisico === '1_NO_FOIL' &&
          !snapHidAtu.mergulhoAtivo
        ) {
          void motorAudioSteam.dispararFoley('TOUCHDOWN_IMPACTO', 0.95);
        } else if (
          (snapHidAtu.estadoFisico === '3_SPOOL_UP' && estadoHidraulicoFoleyAnt.estadoFisico === '2_TOUCHDOWN') ||
          (snapHidAtu.estadoFisico === '1_NO_FOIL' && estadoHidraulicoFoleyAnt.estadoFisico !== '1_NO_FOIL')
        ) {
          void motorAudioSteam.dispararFoley('FOIL_DECOLAGEM', 0.9);
        }
        if (snapHidAtu.valvulasAbertas > estadoHidraulicoFoleyAnt.valvulasAbertas) {
          void motorAudioSteam.dispararFoley('DRENO_VALVULA', 0.85);
        }
        if (snapHidAtu.brechasAtivas > estadoHidraulicoFoleyAnt.brechasAtivas) {
          void motorAudioSteam.dispararFoley('BRECHA_GEISER', 0.95);
        }
        if (snapHidAtu.abordadoresAliados > estadoHidraulicoFoleyAnt.abordadoresAliados) {
          void motorAudioSteam.dispararFoley('ESCLUSA_ABORDAGEM', 0.9);
        }
      }
      estadoHidraulicoFoleyAnt = snapHidAtu;

      const evVis = Array.isArray(vmAudio.eventosVisuaisUltimoTick) ? vmAudio.eventosVisuaisUltimoTick : [];
      let disparadosNesteCiclo = 0;
      for (let i = 0; i < evVis.length && disparadosNesteCiclo < 8; i += 1) {
        const ev = evVis[i];
        const chaveDedup =
          ev?.idEvento !== undefined && ev?.idEvento !== null
            ? `ID:${ev.idEvento}`
            : `${ev?.tick ?? 'T'}:${ev?.tipo ?? ''}:${ev?.chassiId ?? ''}:${ev?.salaAlvoId ?? ''}:${i}`;
        if (idsEventosFoleyTocados.has(chaveDedup)) continue;
        idsEventosFoleyTocados.add(chaveDedup);
        if (idsEventosFoleyTocados.size > 512) {
          const prim = idsEventosFoleyTocados.values().next().value;
          if (prim !== undefined) idsEventosFoleyTocados.delete(prim);
        }
        disparadosNesteCiclo += 1;
        const chaveFoley = resolverChaveFoleyEventoVisual(ev);
        const panEv = resolverPanEstereoEventoVisual(ev);
        void motorAudioSteam.dispararFoley(chaveFoley, 0.85, { pan: panEv });
      }
      if (gestoUsuario) {
        if (dados?.aceito === false) {
          motorAudioSteam.dispararCliqueUiCurto(0.18);
        } else if (metaEvento?.ehSaltoMapa) {
          void motorAudioSteam.dispararFoley('SONAR_PING', 0.55);
        } else {
          motorAudioSteam.dispararCliqueUiCurto(0.32);
        }
      }
      return;
    }
    if (gestoUsuario) {
      motorAudio.garantirGrafo();
    }
    if (dados && dados.paisagemSonora) {
      motorAudio.aplicarPlanoPaisagem(dados.paisagemSonora);
    } else if (dados && dados.planoAudio) {
      tocarPlanoAudioLegado(dados.planoAudio);
    }
  }

  function decodificarDataUriParaRgba(uri) {
    return new Promise((resolve) => {
      const img = new win.Image();
      img.onload = () => {
        const off = doc.createElement('canvas');
        off.width = img.naturalWidth || img.width;
        off.height = img.naturalHeight || img.height;
        const octx = off.getContext('2d');
        octx.imageSmoothingEnabled = false;
        octx.drawImage(img, 0, 0);
        const id = octx.getImageData(0, 0, off.width, off.height);
        resolve({ largura: off.width, altura: off.height, rgba: id.data });
      };
      img.onerror = () => resolve(null);
      img.src = uri;
    });
  }

  async function inicializarAssets60Fps() {
    try {
      const resp = await fetch('/api/assets-60fps');
      if (!resp.ok) return;
      pacote60 = await resp.json();
      const decPlacas = {};
      for (const [k, uri] of Object.entries(pacote60.placas || {})) {
        decPlacas[k] = await decodificarDataUriParaRgba(uri);
      }
      const decRetratos = {};
      for (const [k, uri] of Object.entries(pacote60.retratos || {})) {
        decRetratos[k] = await decodificarDataUriParaRgba(uri);
      }
      const decIcones = {};
      for (const [k, uri] of Object.entries(pacote60.iconesHiBit || {})) {
        decIcones[k] = await decodificarDataUriParaRgba(uri);
      }
      const decPoses4F = {};
      for (const [k, arrUris] of Object.entries(pacote60.poses4Frames || {})) {
        if (Array.isArray(arrUris)) {
          decPoses4F[k] = await Promise.all(arrUris.map((u) => decodificarDataUriParaRgba(u)));
        }
      }
      const decBestiario57a = {};
      for (const [k, uri] of Object.entries(pacote60.bestiario57a || {})) {
        decBestiario57a[k] = await decodificarDataUriParaRgba(uri);
      }
      assetsRgba = {
        f1Play: decPlacas.f1Play,
        f2Play: decPlacas.f2Play,
        f3Play: decPlacas.f3Play,
        f4Ships: decPlacas.f4Ships,
        dragaPlay: decPlacas.dragaPlay,
        eventoPlay: decPlacas.eventoPlay,
        mapaPlay: decPlacas.mapaPlay,
        retratos: decRetratos,
        poses4Frames: decPoses4F,
        iconesHiBit: decIcones,
        bestiario57a: decBestiario57a,
      };
      assetsProntos = Boolean(assetsRgba.f1Play && assetsRgba.f2Play && assetsRgba.f3Play && imgData960);
    } catch {
      assetsProntos = false;
    }
  }

  function resolverCoordenadaNativa(ev) {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return { x: -1, y: -1, r };
    const razaoAlvo = 960 / 540;
    const razaoAtual = r.width / r.height;
    let largUtil = r.width;
    let altUtil = r.height;
    let offX = 0;
    let offY = 0;
    if (razaoAtual > razaoAlvo + 1e-6) {
      largUtil = r.height * razaoAlvo;
      offX = (r.width - largUtil) / 2;
    } else if (razaoAtual < razaoAlvo - 1e-6) {
      altUtil = r.width / razaoAlvo;
      offY = (r.height - altUtil) / 2;
    }
    const x = Math.floor(((ev.clientX - r.left - offX) * 960) / largUtil);
    const y = Math.floor(((ev.clientY - r.top - offY) * 540) / altUtil);
    return { x, y, r };
  }

  function resolverHitboxLocal(x, y) {
    const hbs = estadoRt.hitboxes || [];
    for (let i = hbs.length - 1; i >= 0; i -= 1) {
      const h = hbs[i];
      if (x >= h.x && x < h.x + h.largura && y >= h.y && y < h.y + h.altura) {
        return h;
      }
    }
    return null;
  }

  function enriquecerGhostPreviewInstantaneo(vm) {
    return enriquecerGhostPreviewCliente(vm, hoverHitboxId);
  }

  function desenharFallbackPrimitivas(frameCanvas) {
    if (!frameCanvas || !Array.isArray(frameCanvas.comandosDesenho)) return;
    ctx.clearRect(0, 0, 960, 540);
    ctx.font = '8px monospace';
    for (const cmd of frameCanvas.comandosDesenho) {
      if (cmd.op === 'FILL_RECT') {
        ctx.fillStyle = cmd.cor;
        ctx.fillRect(cmd.x, cmd.y, cmd.largura, cmd.altura);
      } else if (cmd.op === 'STROKE_RECT') {
        ctx.strokeStyle = cmd.cor;
        ctx.strokeRect(cmd.x, cmd.y, cmd.largura, cmd.altura);
      } else if (cmd.op === 'TEXT') {
        ctx.fillStyle = cmd.cor;
        ctx.fillText(cmd.texto, cmd.x, cmd.y);
      }
    }
  }

  function desenharQuadro60Fps(dt) {
    const avisoToastTexto = controladorToast.avancarTempo(dt);
    const vmBase = estadoRt.viewModel;
    if (!vmBase) return;
    if (!assetsProntos) {
      desenharFallbackPrimitivas(estadoRt.frameCanvas);
      return;
    }
    const vm = enriquecerGhostPreviewInstantaneo(vmBase);
    const hbs = estadoRt.hitboxes || [];
    estadoVisual60 = interpolarEstadoVisual60Fps(estadoVisual60, vm, dt, {
      hoverHitboxId,
      pressHitboxId,
      hitboxes: hbs,
      reduzirMovimento: Boolean(mediaReduzir.matches || vmBase.configuracoesSteam?.reduzirMovimento),
    });
    const disparandoDorsal = (estadoVisual60.projeteisAtivos || []).some(
      (p) => p.lado === 'JOGADOR' && p.progresso0a1 < 0.35
    );
    const rgba = rasterizarQuadroRgba960x540(
      vm,
      {
        tempoSeg: estadoVisual60.tempoAcumuladoSeg,
        cicloSpriteF4: Math.floor(estadoVisual60.tempoAcumuladoSeg * 6) % 4,
        disparandoDorsal,
        estadoVisual60Fps: estadoVisual60,
        hoverHitboxId,
        pressHitboxId,
        exibirGhostPreview: Boolean(hoverHitboxId),
        exibirTooltipHover: Boolean(estadoVisual60.tooltipAberto),
        pausaTaticaAtiva: contextoUi.pausaTaticaAtiva,
        slotArmaSelecionado: contextoUi.slotArmaSelecionado,
        tripulanteSelecionadoId: contextoUi.tripulanteSelecionadoId,
        tripulantesSelecionadosIds: contextoUi.tripulantesSelecionadosIds,
        modoOrdemAbordagem: contextoUi.modoOrdemAbordagem,
        salaAlvoAbordagemId: contextoUi.salaAlvoAbordagemId,
        avisoToastTexto,
        cursorGamepad960,
        exibirLegendasTaticasDirecionais: Boolean(
          vm.audioMutado || vm.modoLegendasTaticasEfetivo === 'COMPLETO'
        ),
      },
      assetsRgba,
      hbs,
      pacote60
    );
    imgData960.data.set(rgba);
    ctx.putImageData(imgData960, 0, 0);
  }

  function dispararCliqueVirtualGamepad960(xNat, yNat, botaoMouse = 0) {
    const r = canvas.getBoundingClientRect();
    const wUtil = r.width || 960;
    const hUtil = r.height || 540;
    const cx = r.left + ((xNat + 0.5) / 960) * wUtil;
    const cy = r.top + ((yNat + 0.5) / 540) * hUtil;
    void enviarEventoDom(
      {
        tipoEvento: 'CLICK',
        botaoMouse,
        shiftKey: false,
        clientX: cx,
        clientY: cy,
        retanguloCanvas: { left: r.left, top: r.top, width: wUtil, height: hUtil },
      },
      true
    );
  }

  function sondarGamepadSteamDeck60Fps(dt) {
    if (!win.navigator || typeof win.navigator.getGamepads !== 'function') return;
    let listaGp;
    try {
      listaGp = win.navigator.getGamepads();
    } catch {
      return;
    }
    const gp = listaGp ? Array.from(listaGp).find(Boolean) : null;
    if (!gp) return;
    const lido = traduzirEstadoGamepadSteamDeck(gp, botoesGamepadAnt, dt);
    botoesGamepadAnt = [...lido.botoesAtuais];
    if (lido.direcaoDpadBorda?.ativou) {
      const snap = encontrarHitboxSnapDirecionalGamepad(
        cursorGamepad960,
        estadoRt.hitboxes || [],
        lido.direcaoDpadBorda
      );
      if (snap) {
        cursorGamepad960 = { ativo: true, x: snap.x, y: snap.y };
        hoverHitboxId = snap.idHitbox;
        if (estadoRt.viewModel?.edicaoComercialSteam) {
          motorAudioSteam.dispararCliqueUiCurto(0.16);
        }
      } else {
        cursorGamepad960 = {
          ativo: true,
          x: Math.max(4, Math.min(955, cursorGamepad960.x + lido.direcaoDpadBorda.dx * 28)),
          y: Math.max(4, Math.min(535, cursorGamepad960.y + lido.direcaoDpadBorda.dy * 28)),
        };
        const hbFallback = resolverHitboxLocal(Math.floor(cursorGamepad960.x), Math.floor(cursorGamepad960.y));
        hoverHitboxId = hbFallback ? hbFallback.idHitbox : null;
      }
    } else if (lido.deltaCursor960?.moveu) {
      cursorGamepad960 = {
        ativo: true,
        x: Math.max(4, Math.min(955, cursorGamepad960.x + lido.deltaCursor960.dx)),
        y: Math.max(4, Math.min(535, cursorGamepad960.y + lido.deltaCursor960.dy)),
      };
      const hbGp = resolverHitboxLocal(Math.floor(cursorGamepad960.x), Math.floor(cursorGamepad960.y));
      hoverHitboxId = hbGp ? hbGp.idHitbox : null;
    }
    if (lido.comandos.length === 0) return;
    const vmGp = estadoRt.viewModel || {};
    const atalhosGp = vmGp.configuracoesSteam?.atalhosTeclado || {};
    for (const cmd of lido.comandos) {
      if (cmd.tipo === 'GAMEPAD_CLIQUE_PRIMARIO') {
        cursorGamepad960 = { ...cursorGamepad960, ativo: true };
        dispararCliqueVirtualGamepad960(Math.floor(cursorGamepad960.x), Math.floor(cursorGamepad960.y), 0);
      } else if (cmd.tipo === 'GAMEPAD_CLIQUE_SECUNDARIO') {
        cursorGamepad960 = { ...cursorGamepad960, ativo: true };
        dispararCliqueVirtualGamepad960(Math.floor(cursorGamepad960.x), Math.floor(cursorGamepad960.y), 2);
      } else if (cmd.tipo === 'GAMEPAD_CONFIRMAR') {
        const hbSobCursor = cursorGamepad960.ativo
          ? resolverHitboxLocal(Math.floor(cursorGamepad960.x), Math.floor(cursorGamepad960.y))
          : null;
        const hbTut = (estadoRt.hitboxes || []).find((h) => h.idHitbox === 'TUTORIAL_BTN_AVANCAR');
        if (hbSobCursor) {
          dispararCliqueVirtualGamepad960(Math.floor(cursorGamepad960.x), Math.floor(cursorGamepad960.y), 0);
        } else if (vmGp.tutorialSteam?.ativo && hbTut) {
          dispararCliqueVirtualGamepad960(hbTut.x + hbTut.largura * 0.5, hbTut.y + hbTut.altura * 0.5, 0);
        } else {
          void enviarEventoDom({ tipoEvento: 'KEYDOWN', code: 'Enter', shiftKey: false }, true);
        }
      } else if (cmd.tipo === 'PAUSAR_ALTERNAR') {
        if (vmGp.modalSteamAtivo || vmGp.modalCampanhaAtivo) {
          void enviarEventoDom({ tipoEvento: 'KEYDOWN', code: 'Escape', shiftKey: false }, true);
        } else {
          const codPausa = atalhosGp.PAUSAR_TATICO || 'Space';
          if (vmGp.faseJogo === 'COMBATE') {
            contextoUi = { ...contextoUi, pausaTaticaAtiva: !contextoUi.pausaTaticaAtiva };
          }
          void enviarEventoDom({ tipoEvento: 'KEYDOWN', code: codPausa, shiftKey: false }, true);
        }
      } else if (cmd.tipo === 'ACIONAR_MERGULHO_TATICO') {
        void enviarEventoDom({ tipoEvento: 'KEYDOWN', code: atalhosGp.MERGULHO_TATICO || 'KeyM', shiftKey: false }, true);
      } else if (cmd.tipo === 'DRENAR_VALVULAS') {
        void enviarEventoDom({ tipoEvento: 'KEYDOWN', code: atalhosGp.DRENAR_VALVULAS || 'KeyD', shiftKey: false }, true);
      } else if (cmd.tipo === 'CICLAR_ARMA_ANTERIOR' || cmd.tipo === 'CICLAR_ARMA_PROXIMA') {
        const deltaSlot = cmd.tipo === 'CICLAR_ARMA_PROXIMA' ? 1 : -1;
        const proxSlot = (Number(contextoUi.slotArmaSelecionado ?? 0) + deltaSlot + 4) % 4;
        contextoUi = { ...contextoUi, slotArmaSelecionado: proxSlot };
        const teclasSlotsGp = [
          atalhosGp.ARMA_SLOT_1 || 'Digit1',
          atalhosGp.ARMA_SLOT_2 || 'Digit2',
          atalhosGp.ARMA_SLOT_3 || 'Digit3',
          atalhosGp.ARMA_SLOT_4 || 'Digit4',
        ];
        void enviarEventoDom({ tipoEvento: 'KEYDOWN', code: teclasSlotsGp[proxSlot], shiftKey: false }, true);
      } else if (cmd.tipo === 'ALTERNAR_MODAL_CONQUISTAS') {
        void enviarEventoDom({ tipoEvento: 'KEYDOWN', code: atalhosGp.ABRIR_CONQUISTAS || 'KeyJ', shiftKey: false }, true);
      } else if (cmd.tipo === 'ALTERNAR_MODAL_OPCOES') {
        void enviarEventoDom({ tipoEvento: 'KEYDOWN', code: atalhosGp.ABRIR_OPCOES || 'KeyO', shiftKey: false }, true);
      }
    }
  }

  function loop60Fps(agoraMs) {
    const dt = ultimoRafMs > 0 ? Math.min(0.05, Math.max(0.001, (agoraMs - ultimoRafMs) / 1000)) : 1 / 60;
    ultimoRafMs = agoraMs;
    sondarGamepadSteamDeck60Fps(dt);
    desenharQuadro60Fps(dt);
    if (!estadoRt.viewModel?.edicaoComercialSteam) {
      motorAudio.pulsarQuadroMusical60Fps(agoraMs);
    }
    win.requestAnimationFrame(loop60Fps);
  }

  const COMANDOS_MOTOR_CAMPANHA_LOCAL = ['VIAJAR_NO_MAPA', 'ESCOLHER_OPCAO_EVENTO', 'COMPRAR_OU_VENDER_LOJA', 'SALTO_FUGA'];
  let moduloMotorLocal0ms = null;
  let seqAudioLocal0ms = 0;
  let ticksDesdeUltimoSyncBg = 0;

  function dispararSincronizacaoBackground0ms(estadoParaSalvar, ctxParaSalvar, imediato = false) {
    if (!moduloMotorLocal0ms || typeof fetch !== 'function') return;
    if (!imediato && ticksDesdeUltimoSyncBg < 16) return;
    ticksDesdeUltimoSyncBg = 0;
    try {
      void fetch('/api/sincronizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: estadoParaSalvar, contextoUi: ctxParaSalvar }),
      }).catch(() => {});
    } catch {
      // Falha de rede assíncrona ignorada (estado local já está íntegro em memória)
    }
  }

  async function inicializarMotorLocal0msSteam() {
    if (!estadoRt.viewModel?.edicaoComercialSteam) return false;
    if (!win.location || !/^https?:$/i.test(String(win.location.protocol || ''))) return false;
    if (typeof fetch !== 'function') return false;
    try {
      const [
        respEst,
        modCampanha,
        modDespacho,
        modTradutor,
        modPresenter,
        modAudioMar,
        modCues,
      ] = await Promise.all([
        fetch('/api/estado-completo'),
        import('/src/onda6-ui/campanha-completa.mjs'),
        import('/src/onda6-ui/despacho-comandos.mjs'),
        import('/src/onda6-ui/tradutor-input-dom.mjs'),
        import('/src/onda6-ui/presenter-wireframe.mjs'),
        import('/src/onda6-ui/audio-maritimo.mjs'),
        import('/src/onda6-ui/cues-audio.mjs'),
      ]);
      if (!respEst.ok) return false;
      const dadosEst = await respEst.json();
      if (!dadosEst?.estado?.naveJogador) return false;

      moduloMotorLocal0ms = {
        ...modCampanha,
        ...modDespacho,
        ...modTradutor,
        ...modPresenter,
        ...modAudioMar,
        ...modCues,
      };
      if (dadosEst.contextoUi && typeof dadosEst.contextoUi === 'object') {
        contextoUi = { ...contextoUi, ...dadosEst.contextoUi };
      }

      const adaptadorReal0ms = {
        ehMotorCompletoBiofoil: true,
        projetarViewModel: (est) => moduloMotorLocal0ms.projetarViewModelWireframe(est),
        avancarTick: (estAnt, dtSeg) => {
          const usaCamp = Boolean(estAnt?.meta?.modoCampanhaCompleta ?? true);
          return usaCamp
            ? moduloMotorLocal0ms.avancarTickCampanhaCompleta(estAnt, dtSeg, { persistirEmDisco: false })
            : moduloMotorLocal0ms.avancarTickPartidaEmTempoReal(estAnt, dtSeg);
        },
        despacharComando: (estAnt, envelope, ctxEntradaBruto) => {
          const eventoInput = envelope?.eventoInput ?? envelope;
          let estadoNovo = estAnt;
          let ultRes = null;
          const vmAntes = moduloMotorLocal0ms.projetarViewModelWireframe(estadoNovo);
          const trad = moduloMotorLocal0ms.traduzirInputDomParaComandoUi(eventoInput, estadoNovo, vmAntes, ctxEntradaBruto);
          const idHover = trad.hitboxAtingida ?? null;
          const acaoLocal = trad.acaoLocalUi ?? null;

          const slotCand = trad.slotArmaSelecionado !== undefined ? trad.slotArmaSelecionado : Number(ctxEntradaBruto.slotArmaSelecionado ?? 0);
          const tripCand = String(
            trad.tripulanteSelecionadoId !== undefined
              ? trad.tripulanteSelecionadoId
              : (ctxEntradaBruto.tripulanteSelecionadoId ?? 'trip-polvo-1')
          ).slice(0, 64);
          const salaAbCand = Number(
            trad.salaAlvoAbordagemId !== undefined ? trad.salaAlvoAbordagemId : (ctxEntradaBruto.salaAlvoAbordagemId ?? 1)
          );
          const ultBeamCand =
            trad.ultimaSalaBeamClicadaId !== undefined ? trad.ultimaSalaBeamClicadaId : (ctxEntradaBruto.ultimaSalaBeamClicadaId ?? null);

          const listaTripCand = Array.isArray(trad.tripulantesSelecionadosIds)
            ? trad.tripulantesSelecionadosIds.map((id) => String(id).slice(0, 64))
            : Array.isArray(ctxEntradaBruto.tripulantesSelecionadosIds)
              ? ctxEntradaBruto.tripulantesSelecionadosIds.map((id) => String(id).slice(0, 64))
              : [tripCand];

          let novoCtx = {
            pausaTaticaAtiva: trad.pausaTaticaAtiva !== undefined ? trad.pausaTaticaAtiva : Boolean(ctxEntradaBruto.pausaTaticaAtiva),
            slotArmaSelecionado: Number.isInteger(slotCand) && slotCand >= 0 && slotCand <= 3 ? slotCand : 0,
            tripulanteSelecionadoId: tripCand,
            tripulantesSelecionadosIds: listaTripCand,
            modoOrdemAbordagem:
              trad.modoOrdemAbordagem !== undefined ? Boolean(trad.modoOrdemAbordagem) : Boolean(ctxEntradaBruto.modoOrdemAbordagem),
            salaAlvoAbordagemId: Number.isInteger(salaAbCand) && salaAbCand >= 1 && salaAbCand <= 8 ? salaAbCand : 1,
            ultimaSalaBeamClicadaId: Number.isInteger(ultBeamCand) ? ultBeamCand : null,
          };

          const usaCamp = Boolean(estadoNovo?.meta?.modoCampanhaCompleta ?? true);
          let exigeSyncImediato = false;

          if (trad.acaoLocalUi === 'ACAO_CAMPANHA' && trad.acaoCampanhaUi) {
            const resCamp = moduloMotorLocal0ms.executarAcaoCampanhaCompleta(estadoNovo, trad.acaoCampanhaUi, {
              persistirEmDisco: false,
              edicaoComercialSteam: Boolean(estadoNovo?.meta?.edicaoComercialSteam),
            });
            if (resCamp.estado) estadoNovo = resCamp.estado;
            if (
              trad.acaoCampanhaUi.tipoAcao === 'INICIAR_NOVA_RUN' ||
              trad.acaoCampanhaUi.tipoAcao === 'CONTINUAR_RUN_SALVA'
            ) {
              novoCtx = {
                ...novoCtx,
                pausaTaticaAtiva: false,
                slotArmaSelecionado: 0,
                tripulanteSelecionadoId: estadoNovo.naveJogador?.tripulacao?.[0]?.id ?? 'trip-polvo-1',
                tripulantesSelecionadosIds: [estadoNovo.naveJogador?.tripulacao?.[0]?.id ?? 'trip-polvo-1'],
                modoOrdemAbordagem: false,
                ultimaSalaBeamClicadaId: null,
              };
            }
            const tipoEf = resCamp.acaoExecutada ?? trad.acaoCampanhaUi.tipoAcao;
            ultRes = {
              aceito: Boolean(resCamp.ok),
              marcadorRejeicao: resCamp.ok ? null : (resCamp.codigoErro ?? 'ACAO_CAMPANHA_REJEITADA'),
              cueEmitido: resCamp.cueEmitido ?? null,
              comandoExecutado: { tipo: tipoEf },
              acaoCampanhaExecutada: { ...trad.acaoCampanhaUi, tipoAcao: tipoEf },
              estado: estadoNovo,
            };
            exigeSyncImediato = Boolean(resCamp.ok);
          } else if (usaCamp && trad.comandoMotor && COMANDOS_MOTOR_CAMPANHA_LOCAL.includes(trad.comandoMotor.tipo)) {
            const resCampCmd = moduloMotorLocal0ms.executarAcaoCampanhaCompleta(
              estadoNovo,
              { comandoMotor: trad.comandoMotor },
              {
                persistirEmDisco: false,
                edicaoComercialSteam: Boolean(estadoNovo?.meta?.edicaoComercialSteam),
              }
            );
            if (resCampCmd.estado) estadoNovo = resCampCmd.estado;
            ultRes = {
              aceito: Boolean(resCampCmd.ok),
              marcadorRejeicao: resCampCmd.ok ? null : (resCampCmd.codigoErro ?? 'COMANDO_CAMPANHA_REJEITADO'),
              cueEmitido: resCampCmd.cueEmitido ?? trad.resultadoMotor?.cueEmitido ?? null,
              comandoExecutado: trad.comandoMotor,
              estado: estadoNovo,
            };
            exigeSyncImediato = Boolean(resCampCmd.ok);
          } else {
            ultRes = trad.resultadoMotor;
            if (ultRes?.estado) estadoNovo = ultRes.estado;
            if (
              eventoInput?.tipoEvento !== 'MOUSEMOVE' &&
              estadoNovo?.meta?.edicaoComercialSteam &&
              estadoNovo?.meta?.tutorialSteam?.ativo &&
              (!ultRes || ultRes.aceito !== false)
            ) {
              const chaveTut = trad.comandoMotor?.tipo ?? acaoLocal ?? null;
              if (chaveTut && chaveTut !== 'ATUALIZAR_GHOST_PREVIEW') {
                estadoNovo = moduloMotorLocal0ms.sincronizarProgressoTutorialSteamNoEstado(estadoNovo, chaveTut, {
                  persistirEmDisco: false,
                });
                exigeSyncImediato = true;
              }
            }
          }

          return {
            estadoPartida: estadoNovo,
            ultimoResultadoComando: ultRes,
            hitboxAtingida: idHover,
            acaoLocalUi: acaoLocal,
            contextoUi: novoCtx,
            exigeSyncImediato,
          };
        },
      };

      runtimeLocalSteam.hidratarAdaptadorMotorReal(adaptadorReal0ms, dadosEst.estado);
      return true;
    } catch {
      moduloMotorLocal0ms = null;
      return false;
    }
  }

  function montarRespostaCompletaLocal0ms(estadoAnt, estadoNovo, ultRes, idHover, ctxNovo, ehHoverPuro) {
    const vmNovo = moduloMotorLocal0ms.projetarViewModelWireframe(estadoNovo, { idHitboxHover: idHover });
    const frameCanvas = moduloMotorLocal0ms.renderizarViewModelNoCanvas2d(vmNovo);
    const hitboxes = moduloMotorLocal0ms.obterMapaHitboxesNativo(vmNovo);
    const opcoesPais = ehHoverPuro
      ? { seqAudio: 'hover', pausaTaticaAtiva: Boolean(ctxNovo.pausaTaticaAtiva) }
      : { seqAudio: ++seqAudioLocal0ms, pausaTaticaAtiva: Boolean(ctxNovo.pausaTaticaAtiva) };
    const planoAudio = moduloMotorLocal0ms.construirPlanoGrafoWebAudio(estadoAnt, estadoNovo, ultRes);
    const paisagemSonora = moduloMotorLocal0ms.construirPaisagemSonoraCompleta(estadoAnt, estadoNovo, ultRes, opcoesPais);
    return {
      aceito: ultRes ? ultRes.aceito : true,
      marcadorRejeicao: ultRes?.marcadorRejeicao ?? null,
      acaoLocalUi: ultRes?.acaoLocalUi ?? null,
      hitboxAtingida: idHover,
      contextoUi: ctxNovo,
      viewModel: vmNovo,
      frameCanvas,
      hitboxes,
      planoAudio,
      paisagemSonora,
    };
  }

  async function enviarEventoDom(eventoInput, gestoUsuario) {
    if (gestoUsuario && !estadoRt.viewModel?.edicaoComercialSteam) {
      // Desbloqueia WebAudio legado no gesto do usuário apenas fora da Edição Steam
      motorAudio.garantirGrafo();
    }
    const faseAntesCmd = estadoRt.viewModel?.faseJogo;
    const seqDisparo = ++seqRequisicao;
    const ponteDesktopCmd = win.bioFoilSteamDesktop;
    let dados = null;
    if (ponteDesktopCmd && typeof ponteDesktopCmd.executarComandoMotor === 'function') {
      dados = await ponteDesktopCmd.executarComandoMotor(eventoInput, contextoUi);
      runtimeLocalSteam.despacharComandoLocal({ tipo: eventoInput?.tipoEvento ?? 'IPC_CMD' }, contextoUi);
    } else if (moduloMotorLocal0ms && runtimeLocalSteam.temMotorRealHidratado()) {
      const estAntesLocal = runtimeLocalSteam.obterSnapshotLocal().estadoPartida;
      const snapCmd = runtimeLocalSteam.despacharComandoLocal({ eventoInput }, contextoUi);
      const opLocal = snapCmd.resultadoOperacaoLocal;
      if (opLocal && opLocal.estadoPartida) {
        dados = montarRespostaCompletaLocal0ms(
          estAntesLocal,
          opLocal.estadoPartida,
          opLocal.ultimoResultadoComando,
          opLocal.hitboxAtingida,
          opLocal.contextoUi,
          eventoInput?.tipoEvento === 'MOUSEMOVE'
        );
        dados.acaoLocalUi = opLocal.acaoLocalUi;
        if (eventoInput?.tipoEvento !== 'MOUSEMOVE') {
          dispararSincronizacaoBackground0ms(opLocal.estadoPartida, opLocal.contextoUi, Boolean(opLocal.exigeSyncImediato));
        }
      }
    } else {
      const resp = await fetch('/api/comando', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventoInput, contextoUi }),
      });
      if (!resp.ok || seqDisparo < seqAplicada) return;
      dados = await resp.json();
    }
    if (!dados || seqDisparo < seqAplicada) return;
    seqAplicada = seqDisparo;
    if (dados.contextoUi) contextoUi = dados.contextoUi;
    if (Array.isArray(dados.hitboxes)) estadoRt.hitboxes = dados.hitboxes;
    if (dados.viewModel && dados.frameCanvas) {
      estadoRt.viewModel = dados.viewModel;
      estadoRt.frameCanvas = dados.frameCanvas;
      const listaTrip = Array.isArray(dados.viewModel.painelTripulacao) ? dados.viewModel.painelTripulacao : [];
      if (listaTrip.length > 0 && !listaTrip.some((t) => t.id === contextoUi.tripulanteSelecionadoId)) {
        contextoUi = {
          ...contextoUi,
          tripulanteSelecionadoId: listaTrip[0].id,
          modoOrdemAbordagem: listaTrip[0].localizacao === 'BORDO_INIMIGO',
        };
      }
    }
    aplicarViewportDisplaySteamAtual(gestoUsuario);
    const idiomaResp = dados.viewModel?.configuracoesSteam?.idioma || estadoRt.viewModel?.configuracoesSteam?.idioma || 'pt-BR';
    if (eventoInput && eventoInput.tipoEvento !== 'MOUSEMOVE') {
      if (dados.aceito === false && dados.marcadorRejeicao) {
        controladorToast.acionarToast(
          formatarMensagemRejeicaoUi(dados.marcadorRejeicao, dados.viewModel?.ultimoAvisoCampanha, { idioma: idiomaResp }),
          2.6
        );
      } else if (
        dados.acaoLocalUi === 'SELECIONAR_SALA_ABORDAGEM' ||
        dados.acaoLocalUi === 'DEFINIR_SALA_ALVO_ABORDAGEM'
      ) {
        controladorToast.acionarToast(
          idiomaResp === 'en-US'
            ? `BOARDING TARGET [G] SET: ROOM S${contextoUi.salaAlvoAbordagemId}`
            : `ALVO DE ABORDAGEM [G] DEFINIDO: SALA S${contextoUi.salaAlvoAbordagemId}`,
          1.9
        );
      }
    }
    if (dados.paisagemSonora) estadoRt.paisagemSonora = dados.paisagemSonora;
    const ehSaltoMapa =
      faseAntesCmd === 'MAPA' &&
      dados.aceito !== false &&
      String(dados.hitboxAtingida || '').startsWith('NO_MAPA_');
    sincronizarAudioResposta(dados, gestoUsuario, { ehSaltoMapa });
  }

  async function avancarTick() {
    const vmAtu = estadoRt.viewModel;
    if (contextoUi.pausaTaticaAtiva || tickEmVoo) return;
    if (vmAtu && (vmAtu.faseJogo !== 'COMBATE' || vmAtu.modalCampanhaAtivo || vmAtu.modalSteamAtivo)) return;
    tickEmVoo = true;
    const seqAntesTick = seqRequisicao;
    try {
      const ponteDesktopTick = win.bioFoilSteamDesktop;
      let dados = null;
      if (ponteDesktopTick && typeof ponteDesktopTick.avancarTickMotor === 'function') {
        dados = await ponteDesktopTick.avancarTickMotor(0.25, contextoUi.pausaTaticaAtiva);
        runtimeLocalSteam.avancarTickLocal(0.25, contextoUi.pausaTaticaAtiva);
      } else if (moduloMotorLocal0ms && runtimeLocalSteam.temMotorRealHidratado()) {
        const estAntesTick = runtimeLocalSteam.obterSnapshotLocal().estadoPartida;
        const snapPosTick = runtimeLocalSteam.avancarTickLocal(0.25, contextoUi.pausaTaticaAtiva);
        const estDepoisTick = snapPosTick.estadoPartida;
        dados = montarRespostaCompletaLocal0ms(estAntesTick, estDepoisTick, null, null, contextoUi, false);
        ticksDesdeUltimoSyncBg += 1;
        const mudouFaseOuModal =
          estDepoisTick?.meta?.faseJogo !== estAntesTick?.meta?.faseJogo ||
          estDepoisTick?.meta?.modalCampanhaAtivo !== estAntesTick?.meta?.modalCampanhaAtivo ||
          (estDepoisTick?.meta?.conquistasDesbloqueadas?.length ?? 0) !==
            (estAntesTick?.meta?.conquistasDesbloqueadas?.length ?? 0);
        dispararSincronizacaoBackground0ms(estDepoisTick, contextoUi, mudouFaseOuModal);
      } else {
        const resp = await fetch('/api/tick', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dtSeg: 0.25, pausaTaticaAtiva: contextoUi.pausaTaticaAtiva }),
        });
        if (!resp.ok) return;
        dados = await resp.json();
      }
      if (!dados || seqRequisicao !== seqAntesTick || contextoUi.pausaTaticaAtiva) return;
      if (Array.isArray(dados.hitboxes)) estadoRt.hitboxes = dados.hitboxes;
      if (dados.viewModel && dados.frameCanvas) {
        estadoRt.viewModel = dados.viewModel;
        estadoRt.frameCanvas = dados.frameCanvas;
      }
      if (dados.paisagemSonora) estadoRt.paisagemSonora = dados.paisagemSonora;
      sincronizarAudioResposta(dados, false);
    } finally {
      tickEmVoo = false;
    }
  }

  let sliderArrasteAtivo = null;

  canvas.addEventListener('mousedown', (ev) => {
    if (!estadoRt.viewModel?.edicaoComercialSteam) {
      motorAudio.garantirGrafo();
    }
    const { x, y } = resolverCoordenadaNativa(ev);
    const hb = resolverHitboxLocal(x, y);
    pressHitboxId = hb ? hb.idHitbox : null;
    if (ev.button === 0 && hb && hb.metadados?.acaoSteam === 'DEFINIR_VOLUME_DIRETO') {
      sliderArrasteAtivo = {
        idHitbox: hb.idHitbox,
        barraX: Number(hb.metadados.barraX ?? hb.x),
        barraLargura: Math.max(1, Number(hb.metadados.barraLargura ?? hb.largura)),
        centroY: Math.floor(hb.y + hb.altura / 2),
        ultimoValor: -1,
      };
    } else {
      sliderArrasteAtivo = null;
    }
    if (ev.button === 0 && hb && hb.metadados) {
      if (hb.metadados.acaoSteam && estadoRt.viewModel?.edicaoComercialSteam) {
        const snapLocal0ms = runtimeLocalSteam.executarAcaoMetaSteam(hb.metadados.acaoSteam, hb.metadados);
        if (snapLocal0ms && hb.metadados.acaoSteam === 'FECHAR_MODAL_STEAM') {
          estadoRt.viewModel = { ...estadoRt.viewModel, modalSteamAtivo: null, aguardandoRebindAcao: null };
        } else if (snapLocal0ms && hb.metadados.acaoSteam === 'ABRIR_OPCOES') {
          estadoRt.viewModel = { ...estadoRt.viewModel, modalSteamAtivo: 'OPCOES' };
        } else if (snapLocal0ms && hb.metadados.acaoSteam === 'ABRIR_CONQUISTAS') {
          estadoRt.viewModel = { ...estadoRt.viewModel, modalSteamAtivo: 'CONQUISTAS' };
        }
      }
      if (hb.tipo === 'SLOT_ARMA' && hb.metadados.ocupado) {
        contextoUi = { ...contextoUi, slotArmaSelecionado: hb.metadados.slotIndex };
      } else if (hb.tipo === 'CARD_TRIPULANTE' && hb.metadados.tripulanteId && !ev.shiftKey) {
        contextoUi = {
          ...contextoUi,
          tripulanteSelecionadoId: hb.metadados.tripulanteId,
          tripulantesSelecionadosIds: [hb.metadados.tripulanteId],
          modoOrdemAbordagem: Boolean(hb.metadados.aBordoInimigo || hb.metadados.localizacao === 'BORDO_INIMIGO'),
        };
      }
    }
  });
  win.addEventListener('mouseup', () => {
    pressHitboxId = null;
    sliderArrasteAtivo = null;
  });
  if (typeof win.addEventListener === 'function') {
    win.addEventListener('resize', () => {
      aplicarViewportDisplaySteamAtual(false);
    });
  }
  let silenciadoPorPerdaDeFoco = false;
  function resolverSilenciarSemFocoAtivo(vm) {
    if (typeof vm?.preferenciasAudio?.silenciarSemFoco === 'boolean') {
      return vm.preferenciasAudio.silenciarSemFoco;
    }
    if (typeof vm?.configuracoesSteam?.silenciarSemFoco === 'boolean') {
      return vm.configuracoesSteam.silenciarSemFoco;
    }
    return true;
  }
  if (typeof doc.addEventListener === 'function') {
    doc.addEventListener('visibilitychange', () => {
      const oculto = Boolean(doc.hidden || doc.visibilityState === 'hidden');
      const vmVis = estadoRt.viewModel;
      if (oculto) {
        if (vmVis?.faseJogo === 'COMBATE' && !vmVis?.modalCampanhaAtivo && !contextoUi.pausaTaticaAtiva) {
          contextoUi = { ...contextoUi, pausaTaticaAtiva: true };
          if (typeof motorAudio.definirPausaTatica === 'function') {
            motorAudio.definirPausaTatica(true);
          }
        }
        if (resolverSilenciarSemFocoAtivo(vmVis)) {
          if (!motorAudio.estaMudo()) {
            motorAudio.alternarMudo();
            silenciadoPorPerdaDeFoco = true;
          }
          if (vmVis?.edicaoComercialSteam) {
            sincronizarAudioResposta(
              {
                ...estadoRt,
                viewModel: { ...vmVis, audioMutado: true },
              },
              false
            );
          }
        } else if (vmVis?.edicaoComercialSteam) {
          sincronizarAudioResposta(estadoRt, false);
        }
      } else if (silenciadoPorPerdaDeFoco) {
        silenciadoPorPerdaDeFoco = false;
        if (motorAudio.estaMudo() && !vmVis?.audioMutado) {
          motorAudio.alternarMudo();
        }
        if (vmVis?.edicaoComercialSteam) {
          sincronizarAudioResposta(estadoRt, false);
        }
      }
    });
  }
  canvas.addEventListener('click', (ev) => {
    const { r } = resolverCoordenadaNativa(ev);
    enviarEventoDom(
      {
        tipoEvento: 'CLICK',
        botaoMouse: 0,
        shiftKey: Boolean(ev.shiftKey),
        clientX: ev.clientX,
        clientY: ev.clientY,
        retanguloCanvas: { left: r.left, top: r.top, width: r.width, height: r.height },
      },
      true
    );
  });
  canvas.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    const { r } = resolverCoordenadaNativa(ev);
    enviarEventoDom(
      {
        tipoEvento: 'CLICK',
        botaoMouse: 2,
        shiftKey: Boolean(ev.shiftKey),
        clientX: ev.clientX,
        clientY: ev.clientY,
        retanguloCanvas: { left: r.left, top: r.top, width: r.width, height: r.height },
      },
      true
    );
  });
  canvas.addEventListener('mousemove', (ev) => {
    if (cursorGamepad960.ativo) {
      cursorGamepad960 = { ...cursorGamepad960, ativo: false };
    }
    const { x, y, r } = resolverCoordenadaNativa(ev);
    const hb = resolverHitboxLocal(x, y);
    hoverHitboxId = hb ? hb.idHitbox : null;
    if (canvas.style) {
      canvas.style.cursor = hoverHitboxId ? 'pointer' : 'crosshair';
    }
    if (sliderArrasteAtivo && ((Number(ev.buttons ?? 0) & 1) === 1) && r.width > 0 && r.height > 0) {
      const fracDrag = Math.max(0, Math.min(1, (x - sliderArrasteAtivo.barraX) / sliderArrasteAtivo.barraLargura));
      const valDrag = Math.round((fracDrag * 100) / 5) * 5;
      if (valDrag !== sliderArrasteAtivo.ultimoValor) {
        sliderArrasteAtivo.ultimoValor = valDrag;
        const cySlider = r.top + ((sliderArrasteAtivo.centroY + 0.5) / 540) * r.height;
        void enviarEventoDom(
          {
            tipoEvento: 'CLICK',
            botaoMouse: 0,
            shiftKey: false,
            clientX: ev.clientX,
            clientY: cySlider,
            retanguloCanvas: { left: r.left, top: r.top, width: r.width, height: r.height },
          },
          false
        );
      }
    } else if (sliderArrasteAtivo && (Number(ev.buttons ?? 0) & 1) === 0) {
      sliderArrasteAtivo = null;
    }
  });
  canvas.addEventListener('mouseleave', () => {
    hoverHitboxId = null;
    pressHitboxId = null;
    sliderArrasteAtivo = null;
  });
  win.addEventListener('keydown', (ev) => {
    const vmKey = estadoRt.viewModel;
    const atalhosKey = vmKey?.edicaoComercialSteam ? (vmKey.configuracoesSteam?.atalhosTeclado || {}) : {};
    const teclaPausarAtu = atalhosKey.PAUSAR_TATICO || 'Space';
    const aguardandoRebind = Boolean(vmKey?.aguardandoRebindAcao);

    if (!aguardandoRebind && !vmKey?.modalSteamAtivo) {
      if (ev.code === teclaPausarAtu) {
        if (typeof ev.preventDefault === 'function') ev.preventDefault();
        if (vmKey?.faseJogo === 'COMBATE' && !vmKey?.modalCampanhaAtivo) {
          contextoUi = { ...contextoUi, pausaTaticaAtiva: !contextoUi.pausaTaticaAtiva };
          if (vmKey?.edicaoComercialSteam) {
            sincronizarAudioResposta(estadoRt, false);
          } else if (typeof motorAudio.definirPausaTatica === 'function') {
            motorAudio.definirPausaTatica(contextoUi.pausaTaticaAtiva);
          }
        }
      } else if (vmKey?.faseJogo !== 'INICIO') {
        const teclasSlotsAtu = [
          atalhosKey.ARMA_SLOT_1 || 'Digit1',
          atalhosKey.ARMA_SLOT_2 || 'Digit2',
          atalhosKey.ARMA_SLOT_3 || 'Digit3',
          atalhosKey.ARMA_SLOT_4 || 'Digit4',
        ];
        const idxSlotKey = teclasSlotsAtu.indexOf(ev.code);
        if (idxSlotKey >= 0) {
          contextoUi = { ...contextoUi, slotArmaSelecionado: idxSlotKey };
        }
      }
    } else if (ev.code === 'Space' && typeof ev.preventDefault === 'function') {
      ev.preventDefault();
    }
    enviarEventoDom({ tipoEvento: 'KEYDOWN', code: ev.code, shiftKey: Boolean(ev.shiftKey) }, true);
  });

  aplicarViewportDisplaySteamAtual(false);
  if (estadoRt.viewModel?.edicaoComercialSteam) {
    sincronizarAudioResposta(estadoRt, false);
    void inicializarMotorLocal0msSteam();
  }
  desenharFallbackPrimitivas(estadoRt.frameCanvas);
  inicializarAssets60Fps();
  win.requestAnimationFrame(loop60Fps);
  setInterval(avancarTick, 250);

  return {
    motorAudio,
    motorAudioSteam,
    runtimeLocalSteam,
    controladorToast,
    obterContextoUi: () => ({ ...contextoUi }),
  };
}

if (
  typeof document !== 'undefined' &&
  typeof window !== 'undefined' &&
  typeof __BIOFOIL_BUNDLE_IIFE === 'undefined' &&
  typeof document.getElementById === 'function' &&
  document.getElementById('biofoil-canvas')
) {
  iniciarRuntimeDomBiofoil(document, window, null);
}
