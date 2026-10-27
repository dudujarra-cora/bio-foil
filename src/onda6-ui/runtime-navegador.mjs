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

const MAPA_MENSAGENS_REJEICAO_PT = Object.freeze({
  ENERGIA_INSUFICIENTE: 'SEM ENERGIA RESERVA NO CORACAO BIO-ELETRICO',
  SEM_ENERGIA_LIVRE_REATOR: 'SEM ENERGIA RESERVA NO CORACAO BIO-ELETRICO',
  BARRAS_INTEIRAS_ESGOTADAS: 'SISTEMA NO LIMITE MAXIMO DE BARRAS INTEGRAS',
  SISTEMA_JA_ZERADO: 'SISTEMA JA ESTA COM 0 ENERGIA ALOCADA',
  BLOQUEADO_TRAVA_HIDROSTATICA: 'TRAVA HIDROSTATICA ATIVA: EMIRJA AO FOIL [M] PARA DRENAR',
  BLOQUEADO_COMBATE_OBRIGATORIO: 'COMBATE ATIVO — DESTRUA O ALVO OU CARREGUE FUGA [J] ANTES DE ZARPAR',
  CARCACA_BLOQUEADA_NO_PERFIL: 'BIONAVE BLOQUEADA NO PERFIL — CUMPRA O MARCO DE DESBLOQUEIO',
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

export function formatarMensagemRejeicaoUi(marcadorRejeicao, avisoCampanha = '', opcoesDebug = {}) {
  const avisoLimpo = String(avisoCampanha ?? '').trim();
  const chave = String(marcadorRejeicao ?? '').trim();
  if (opcoesDebug?.priorizarAvisoVelhoMutacao === true && avisoLimpo) {
    return avisoLimpo.slice(0, 76);
  }
  if (chave && MAPA_MENSAGENS_REJEICAO_PT[chave]) {
    return MAPA_MENSAGENS_REJEICAO_PT[chave];
  }
  if (chave) {
    return `ACAO BLOQUEADA: ${chave.replace(/_/g, ' ')}`.slice(0, 76);
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
            ? '[EM TOUCHDOWN]'
            : quedaSif && aguaAtual < 62.5
              ? '[CAVITAÇÃO -> QUEDA]'
              : aguaAtual < 62.5
                ? `[CAVITAÇÃO -${Math.round(perdaCavAtual)}kg]`
                : quedaSif
                  ? '[QUEDA NO MAR]'
                  : '[ESTÁVEL NO FOIL]',
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
          rotuloFantasma: '[TRAVA HIDROSTÁTICA]',
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
            ? (pesoAtual <= sustAlvoM ? '[EMERGIR -> FOIL]' : '[PESADO DEMAIS!]')
            : '[MERGULHO -> MAR]',
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
      ? '[CAVITAÇÃO -> QUEDA]'
      : entrariaEmCavitacao
        ? '[CAVITAÇÃO -' + Math.round(perdaCav) + 'kg]'
        : causariaQuedaNoMar
          ? '[QUEDA NO MAR]'
          : idHitboxHover === 'BTN_DRENAR_SEGURO'
            ? '[SEGURO >=63kg]'
            : '[ESTÁVEL NO FOIL]';
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

  const mediaReduzir =
    typeof win.matchMedia === 'function'
      ? win.matchMedia('(prefers-reduced-motion: reduce)')
      : { matches: false };

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

  function sincronizarAudioResposta(dados, gestoUsuario) {
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
      reduzirMovimento: Boolean(mediaReduzir.matches),
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
        modoOrdemAbordagem: contextoUi.modoOrdemAbordagem,
        salaAlvoAbordagemId: contextoUi.salaAlvoAbordagemId,
        avisoToastTexto,
      },
      assetsRgba,
      hbs,
      pacote60
    );
    imgData960.data.set(rgba);
    ctx.putImageData(imgData960, 0, 0);
  }

  function loop60Fps(agoraMs) {
    const dt = ultimoRafMs > 0 ? Math.min(0.05, Math.max(0.001, (agoraMs - ultimoRafMs) / 1000)) : 1 / 60;
    ultimoRafMs = agoraMs;
    desenharQuadro60Fps(dt);
    motorAudio.pulsarQuadroMusical60Fps(agoraMs);
    win.requestAnimationFrame(loop60Fps);
  }

  async function enviarEventoDom(eventoInput, gestoUsuario) {
    if (gestoUsuario) {
      // Desbloqueia WebAudio no gesto do usuário SEM re-tocar `estadoRt.paisagemSonora` antiga
      motorAudio.garantirGrafo();
    }
    const seqDisparo = ++seqRequisicao;
    const resp = await fetch('/api/comando', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventoInput, contextoUi }),
    });
    if (!resp.ok || seqDisparo < seqAplicada) return;
    const dados = await resp.json();
    if (seqDisparo < seqAplicada) return;
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
    if (eventoInput && eventoInput.tipoEvento !== 'MOUSEMOVE') {
      if (dados.aceito === false && dados.marcadorRejeicao) {
        controladorToast.acionarToast(
          formatarMensagemRejeicaoUi(dados.marcadorRejeicao, dados.viewModel?.ultimoAvisoCampanha),
          2.6
        );
      } else if (
        dados.acaoLocalUi === 'SELECIONAR_SALA_ABORDAGEM' ||
        dados.acaoLocalUi === 'DEFINIR_SALA_ALVO_ABORDAGEM'
      ) {
        controladorToast.acionarToast(
          `ALVO DE ABORDAGEM [G] DEFINIDO: SALA S${contextoUi.salaAlvoAbordagemId}`,
          1.9
        );
      }
    }
    if (dados.paisagemSonora) estadoRt.paisagemSonora = dados.paisagemSonora;
    sincronizarAudioResposta(dados, gestoUsuario);
  }

  async function avancarTick() {
    const vmAtu = estadoRt.viewModel;
    if (contextoUi.pausaTaticaAtiva || tickEmVoo) return;
    if (vmAtu && (vmAtu.faseJogo !== 'COMBATE' || vmAtu.modalCampanhaAtivo)) return;
    tickEmVoo = true;
    const seqAntesTick = seqRequisicao;
    try {
      const resp = await fetch('/api/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dtSeg: 0.25, pausaTaticaAtiva: contextoUi.pausaTaticaAtiva }),
      });
      if (!resp.ok) return;
      const dados = await resp.json();
      if (seqRequisicao !== seqAntesTick || contextoUi.pausaTaticaAtiva) return;
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

  canvas.addEventListener('mousedown', (ev) => {
    motorAudio.garantirGrafo();
    const { x, y } = resolverCoordenadaNativa(ev);
    const hb = resolverHitboxLocal(x, y);
    pressHitboxId = hb ? hb.idHitbox : null;
    if (ev.button === 0 && hb && hb.metadados) {
      if (hb.tipo === 'SLOT_ARMA' && hb.metadados.ocupado) {
        contextoUi = { ...contextoUi, slotArmaSelecionado: hb.metadados.slotIndex };
      } else if (hb.tipo === 'CARD_TRIPULANTE' && hb.metadados.tripulanteId) {
        contextoUi = {
          ...contextoUi,
          tripulanteSelecionadoId: hb.metadados.tripulanteId,
          modoOrdemAbordagem: Boolean(hb.metadados.aBordoInimigo || hb.metadados.localizacao === 'BORDO_INIMIGO'),
        };
      }
    }
  });
  win.addEventListener('mouseup', () => {
    pressHitboxId = null;
  });
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
    const { x, y } = resolverCoordenadaNativa(ev);
    const hb = resolverHitboxLocal(x, y);
    hoverHitboxId = hb ? hb.idHitbox : null;
    if (canvas.style) {
      canvas.style.cursor = hoverHitboxId ? 'pointer' : 'crosshair';
    }
  });
  canvas.addEventListener('mouseleave', () => {
    hoverHitboxId = null;
    pressHitboxId = null;
  });
  win.addEventListener('keydown', (ev) => {
    if (ev.code === 'Space') {
      if (typeof ev.preventDefault === 'function') ev.preventDefault();
      if (estadoRt.viewModel?.faseJogo === 'COMBATE' && !estadoRt.viewModel?.modalCampanhaAtivo) {
        contextoUi = { ...contextoUi, pausaTaticaAtiva: !contextoUi.pausaTaticaAtiva };
        if (typeof motorAudio.definirPausaTatica === 'function') {
          motorAudio.definirPausaTatica(contextoUi.pausaTaticaAtiva);
        }
      }
    } else if (/^Digit[1-4]$/.test(ev.code) && estadoRt.viewModel?.faseJogo !== 'INICIO') {
      contextoUi = { ...contextoUi, slotArmaSelecionado: Number(ev.code.slice(-1)) - 1 };
    }
    enviarEventoDom({ tipoEvento: 'KEYDOWN', code: ev.code, shiftKey: Boolean(ev.shiftKey) }, true);
  });

  desenharFallbackPrimitivas(estadoRt.frameCanvas);
  inicializarAssets60Fps();
  win.requestAnimationFrame(loop60Fps);
  setInterval(avancarTick, 250);

  return {
    motorAudio,
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
