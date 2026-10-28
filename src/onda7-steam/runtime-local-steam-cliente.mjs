/**
 * Bio-Foil — Edição Comercial Steam (Onda 7)
 * Módulo: Runtime Local Client-Side (`0 ms` de latência, Zero HTTP Polling Obrigatório),
 * Suporte Nativo a Gamepad / Steam Deck (`1280x800`) e Persistência Offline + Steam Cloud IPC.
 * 100% Isomórfico (0 imports `node:*`).
 */

import {
  PADRAO_ATALHOS_TECLADO_STEAM,
  criarConfiguracoesSteam,
  atualizarConfiguracoesSteam,
  reatribuirAtalhoTecladoSteam,
  ciclarDificuldadeSteam,
  avaliarConquistasSteam,
  obterCatalogo24ConquistasSteam,
  verificarLayoutTipoBDesbloqueado,
} from './dificuldades-conquistas-opcoes.mjs';
import {
  criarEstadoTutorialSteam,
  avancarPassoTutorialSteam,
  pularTutorialSteam,
  registrarAcaoNoTutorialSteam,
} from './tutorial-interativo.mjs';
import { criarMotorAudioOggFoleySteam } from './motor-audio-ogg-foley.mjs';

const CHAVE_STORAGE_CONFIG = 'biofoil_steam_settings_v1';
const CHAVE_STORAGE_CONQUISTAS = 'biofoil_steam_achievements_v1';

/**
 * Calcula o retângulo exato de viewport CSS (com suporte nativo a Full HD `1920x1080`,
 * Steam Deck `1280x800` 16:10 com barras letterbox limpas, `1X` `960x540` e `2X` `1920x1080`).
 */
export function calcularViewportDisplaySteam(larguraJanela, alturaJanela, escalaPixel = 'AUTO') {
  const wJan = Math.max(320, Number(larguraJanela) || 1280);
  const hJan = Math.max(200, Number(alturaJanela) || 800);
  const ehSteamDeck16x10 = wJan === 1280 && hJan === 800;

  if (escalaPixel === '1X' && wJan >= 960 && hJan >= 540) {
    return Object.freeze({
      larguraCssPx: 960,
      alturaCssPx: 540,
      offsetX: Math.floor((wJan - 960) * 0.5),
      offsetY: Math.floor((hJan - 540) * 0.5),
      ehSteamDeck16x10,
      fatorEscala: 1,
    });
  }
  if (escalaPixel === '2X') {
    if (wJan >= 1920 && hJan >= 1080) {
      return Object.freeze({
        larguraCssPx: 1920,
        alturaCssPx: 1080,
        offsetX: Math.floor((wJan - 1920) * 0.5),
        offsetY: Math.floor((hJan - 1080) * 0.5),
        ehSteamDeck16x10,
        fatorEscala: 2,
      });
    }
    if (wJan >= 960 && hJan >= 540) {
      return Object.freeze({
        larguraCssPx: 960,
        alturaCssPx: 540,
        offsetX: Math.floor((wJan - 960) * 0.5),
        offsetY: Math.floor((hJan - 540) * 0.5),
        ehSteamDeck16x10,
        fatorEscala: 1,
      });
    }
  }

  const razaoAlvo = 960 / 540;
  let largUtil = wJan;
  let altUtil = Math.round(wJan / razaoAlvo);
  if (altUtil > hJan) {
    altUtil = hJan;
    largUtil = Math.round(hJan * razaoAlvo);
  }
  return Object.freeze({
    larguraCssPx: largUtil,
    alturaCssPx: altUtil,
    offsetX: Math.floor((wJan - largUtil) * 0.5),
    offsetY: Math.floor((hJan - altUtil) * 0.5),
    ehSteamDeck16x10,
    fatorEscala: Number((largUtil / 960).toFixed(4)),
  });
}

/**
 * Traduz estado de um controle padrão W3C Gamepad / Steam Deck Input para comandos atômicos de UI
 * e movimento suave de cursor tático virtual (`960x540`) via Analógico Esquerdo/Direito ou D-Pad:
 * - Botão 0 (`A`) / Botão 7 (`RT`): Confirmar / Clique Primário no Cursor Tático / Avançar Tutorial
 * - Botão 6 (`LT`): Clique Secundário no Cursor Tático (Desalocar Energia / Alternar Modo Arma / Sala Abordagem)
 * - Botão 1 (`B`): Pausa Tática / Fechar Modal
 * - Botão 2 (`X`): Mergulho Tático 400 Hz (`[M]`)
 * - Botão 3 (`Y`): Drenar Válvulas Seguras (`[D]`)
 * - Botões 4/5 (`LB`/`RB`): Selecionar Slot de Arma anterior / próximo (`1..4`)
 * - Botão 8 (`View/Select`): Abrir/Fechar Conquistas (`[J]`)
 * - Botão 9 (`Start/Menu`): Abrir/Fechar Menu de Opções (`[O]`)
 */
export function traduzirEstadoGamepadSteamDeck(gamepadAtual, botoesAnteriores = [], dtSeg = 1 / 60) {
  if (!gamepadAtual || !Array.isArray(gamepadAtual.buttons)) {
    return Object.freeze({
      comandos: Object.freeze([]),
      botoesAtuais: Object.freeze([]),
      deltaCursor960: Object.freeze({ dx: 0, dy: 0, moveu: false }),
      direcaoDpadBorda: Object.freeze({ dx: 0, dy: 0, ativou: false }),
    });
  }
  const botoesAtuais = gamepadAtual.buttons.map((b) => Boolean(b?.pressed));
  const bordaSubida = (idx) => Boolean(botoesAtuais[idx]) && !Boolean(botoesAnteriores[idx]);
  const comandos = [];

  if (bordaSubida(0)) comandos.push({ tipo: 'GAMEPAD_CONFIRMAR' });
  if (bordaSubida(1)) comandos.push({ tipo: 'PAUSAR_ALTERNAR' });
  if (bordaSubida(2)) comandos.push({ tipo: 'ACIONAR_MERGULHO_TATICO' });
  if (bordaSubida(3)) comandos.push({ tipo: 'DRENAR_VALVULAS' });
  if (bordaSubida(4)) comandos.push({ tipo: 'CICLAR_ARMA_ANTERIOR' });
  if (bordaSubida(5)) comandos.push({ tipo: 'CICLAR_ARMA_PROXIMA' });
  if (bordaSubida(6)) comandos.push({ tipo: 'GAMEPAD_CLIQUE_SECUNDARIO' });
  if (bordaSubida(7)) comandos.push({ tipo: 'GAMEPAD_CLIQUE_PRIMARIO' });
  if (bordaSubida(8)) comandos.push({ tipo: 'ALTERNAR_MODAL_CONQUISTAS' });
  if (bordaSubida(9)) comandos.push({ tipo: 'ALTERNAR_MODAL_OPCOES' });

  const bordaDpadX = (bordaSubida(15) ? 1 : 0) - (bordaSubida(14) ? 1 : 0);
  const bordaDpadY = (bordaSubida(13) ? 1 : 0) - (bordaSubida(12) ? 1 : 0);

  const eixos = Array.isArray(gamepadAtual.axes) ? gamepadAtual.axes : [];
  const filtrarZonaMorta = (v) => {
    const n = Number(v) || 0;
    return Math.abs(n) >= 0.18 ? Math.max(-1, Math.min(1, n)) : 0;
  };
  const dpadX = (botoesAtuais[15] ? 1 : 0) - (botoesAtuais[14] ? 1 : 0);
  const dpadY = (botoesAtuais[13] ? 1 : 0) - (botoesAtuais[12] ? 1 : 0);
  const eixoX = filtrarZonaMorta(eixos[0]) || filtrarZonaMorta(eixos[2]) || (bordaDpadX === 0 && bordaDpadY === 0 ? dpadX * 0.85 : 0);
  const eixoY = filtrarZonaMorta(eixos[1]) || filtrarZonaMorta(eixos[3]) || (bordaDpadX === 0 && bordaDpadY === 0 ? dpadY * 0.85 : 0);
  const dt = Math.max(0.001, Math.min(0.1, Number(dtSeg) || 1 / 60));
  const velPxSeg = 420;
  const dx = Number((eixoX * velPxSeg * dt).toFixed(3));
  const dy = Number((eixoY * velPxSeg * dt).toFixed(3));

  return Object.freeze({
    comandos: Object.freeze(comandos),
    botoesAtuais: Object.freeze(botoesAtuais),
    deltaCursor960: Object.freeze({
      dx,
      dy,
      moveu: Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01,
    }),
    direcaoDpadBorda: Object.freeze({
      dx: bordaDpadX,
      dy: bordaDpadY,
      ativou: bordaDpadX !== 0 || bordaDpadY !== 0,
    }),
  });
}

/**
 * Encontra o hitbox interativo mais próximo na direção pressionada no D-Pad (`dx`, `dy`),
 * permitindo navegação magnética precisa em 1 toque no Steam Deck / Gamepad!
 */
export function encontrarHitboxSnapDirecionalGamepad(cursorAtual, hitboxes = [], direcao = { dx: 0, dy: 0 }) {
  const dirX = Number(direcao?.dx ?? 0);
  const dirY = Number(direcao?.dy ?? 0);
  if ((dirX === 0 && dirY === 0) || !Array.isArray(hitboxes) || hitboxes.length === 0) {
    return null;
  }
  const cx0 = Number(cursorAtual?.x ?? 480);
  const cy0 = Number(cursorAtual?.y ?? 270);
  const normDir = Math.hypot(dirX, dirY) || 1;
  const ux = dirX / normDir;
  const uy = dirY / normDir;

  let melhor = null;
  let menorCusto = Infinity;

  for (let i = 0; i < hitboxes.length; i += 1) {
    const hb = hitboxes[i];
    if (!hb || !(hb.largura > 0) || !(hb.altura > 0)) continue;
    const hcx = hb.x + hb.largura * 0.5;
    const hcy = hb.y + hb.altura * 0.5;
    const vx = hcx - cx0;
    const vy = hcy - cy0;
    const dist = Math.hypot(vx, vy);
    if (dist < 4) continue;
    const proj = vx * ux + vy * uy;
    if (proj <= 2) continue;
    const cosAng = proj / dist;
    if (cosAng < 0.38) continue;
    const perp = Math.abs(vx * -uy + vy * ux);
    const custo = proj + perp * 2.35;
    if (custo < menorCusto) {
      menorCusto = custo;
      melhor = hb;
    }
  }

  if (!melhor) return null;
  return Object.freeze({
    idHitbox: melhor.idHitbox,
    x: Math.round(melhor.x + melhor.largura * 0.5),
    y: Math.round(melhor.y + melhor.altura * 0.5),
  });
}

/**
 * Cria o motor cliente local em memória (`0 ms` de latência para ticks e comandos Steam),
 * eliminando dependência obrigatória de rede `/api/tick` durante o gameplay!
 */
export function criarRuntimeLocalSteamCliente({
  estadoPartidaInicial,
  adaptadorSimulacao = null,
  storage = null,
  ponteDesktopSteam = null,
  opcoesAudio = {},
} = {}) {
  const store = storage ?? (typeof globalThis.localStorage !== 'undefined' ? globalThis.localStorage : null);
  const ponte = ponteDesktopSteam ?? globalThis.bioFoilSteamDesktop ?? null;

  let configuracoes = (() => {
    try {
      const cru = store?.getItem(CHAVE_STORAGE_CONFIG);
      return criarConfiguracoesSteam(cru ? JSON.parse(cru) : {});
    } catch {
      return criarConfiguracoesSteam({});
    }
  })();

  let conquistasDesbloqueadas = (() => {
    try {
      const cru = store?.getItem(CHAVE_STORAGE_CONQUISTAS);
      const arr = cru ? JSON.parse(cru) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  })();

  let adaptadorAtivo = adaptadorSimulacao;
  let motorRealHidratado = Boolean(adaptadorSimulacao?.ehMotorCompletoBiofoil);
  let estadoPartida = estadoPartidaInicial ?? {};
  let varianteHangar = 'A';
  let dificuldadeSelecionada = configuracoes.dificuldadePadrao ?? 'NORMAL';
  let modalSteamAtivo = null; // null | 'OPCOES' | 'CONQUISTAS'
  let tutorialSteam = criarEstadoTutorialSteam(false);
  let botoesGamepadAnt = [];
  let latenciaUltimoTickMs = 0;
  let ticksLocaisExecutados = 0;

  const motorAudio = criarMotorAudioOggFoleySteam({
    ...opcoesAudio,
    configuracoesIniciais: configuracoes,
  });

  function persistirConfigEConquistas() {
    try {
      store?.setItem(CHAVE_STORAGE_CONFIG, JSON.stringify(configuracoes));
      store?.setItem(CHAVE_STORAGE_CONQUISTAS, JSON.stringify(conquistasDesbloqueadas));
    } catch { /* modo privado / sem storage */ }
    if (ponte && typeof ponte.salvarConfiguracoes === 'function') {
      void ponte.salvarConfiguracoes(configuracoes);
    }
  }

  function registrarTelemetriaConquistas(telemetriaExtra = {}) {
    const aval = avaliarConquistasSteam(
      {
        especieNave: estadoPartida?.naveJogador?.especie ?? estadoPartida?.arquiteturaSelecionadaId,
        setorAtual: estadoPartida?.setorAtual ?? 1,
        dificuldade: dificuldadeSelecionada,
        tutorialConcluido: tutorialSteam.concluido,
        ...telemetriaExtra,
      },
      conquistasDesbloqueadas
    );
    if (aval.novosDesbloqueados.length > 0) {
      conquistasDesbloqueadas = [...aval.todosDesbloqueados];
      persistirConfigEConquistas();
      void motorAudio.dispararFoley('CONQUISTA_STEAM', 1.0);
      if (ponte && typeof ponte.desbloquearConquista === 'function') {
        const catAch = obterCatalogo24ConquistasSteam();
        for (const idAch of aval.novosDesbloqueados) {
          const metaAch = catAch.find((a) => a.id === idAch);
          void ponte.desbloquearConquista(idAch, metaAch?.steamApiKey ?? idAch);
        }
      }
    }
    return aval;
  }

  function enriquecerViewModelComEstadoSteam(vmBase) {
    if (!vmBase || typeof vmBase !== 'object') return vmBase;
    const arqId = vmBase?.hangarResumo?.arquiteturaSelecionadaId ?? estadoPartida?.arquiteturaSelecionadaId ?? 'CARCACA_ALFA';
    const layoutEfetivo = estadoPartida?.naveJogador?.layoutId ?? `${arqId}_${varianteHangar}`;
    return Object.freeze({
      ...vmBase,
      layoutId: layoutEfetivo,
      configuracoesSteam: configuracoes,
      modalSteamAtivo,
      tutorialSteam,
      conquistasDesbloqueadas: Object.freeze([...conquistasDesbloqueadas]),
      hangarResumo: vmBase.hangarResumo
        ? Object.freeze({
            ...vmBase.hangarResumo,
            varianteSelecionada: varianteHangar,
            dificuldadeSelecionada,
          })
        : undefined,
    });
  }

  function executarAcaoMetaSteam(acaoSteam, payload = {}) {
    switch (acaoSteam) {
      case 'ABRIR_OPCOES':
        modalSteamAtivo = 'OPCOES';
        break;
      case 'ALTERNAR_MODAL_OPCOES':
        modalSteamAtivo = modalSteamAtivo === 'OPCOES' ? null : 'OPCOES';
        break;
      case 'ABRIR_CONQUISTAS':
        modalSteamAtivo = 'CONQUISTAS';
        break;
      case 'FECHAR_MODAL_STEAM':
        modalSteamAtivo = null;
        break;
      case 'AJUSTAR_VOLUME': {
        const canal = payload.canal ?? 'volumeMaster';
        const atual = Number(configuracoes[canal] ?? 80);
        configuracoes = atualizarConfiguracoesSteam(configuracoes, { [canal]: atual + Number(payload.delta ?? 0) });
        persistirConfigEConquistas();
        break;
      }
      case 'DEFINIR_VOLUME_DIRETO': {
        const canal = payload.canal ?? 'volumeMaster';
        const valDir = Math.max(0, Math.min(100, Math.round(Number(payload.valor ?? configuracoes[canal] ?? 80))));
        configuracoes = atualizarConfiguracoesSteam(configuracoes, { [canal]: valDir });
        persistirConfigEConquistas();
        break;
      }
      case 'RESTAURAR_PADROES_OPCOES': {
        configuracoes = criarConfiguracoesSteam({
          idioma: configuracoes.idioma,
          dificuldadePadrao: dificuldadeSelecionada,
          telaCheia: configuracoes.telaCheia,
          escalaPixel: configuracoes.escalaPixel,
          volumeMaster: 85,
          volumeMusica: 75,
          volumeSfx: 90,
          mudoTotal: false,
          screenShakeAtivo: true,
          reduzirMovimento: false,
          atalhosTeclado: { ...PADRAO_ATALHOS_TECLADO_STEAM },
        });
        persistirConfigEConquistas();
        break;
      }
      case 'ALTERNAR_TELA_CHEIA':
        configuracoes = atualizarConfiguracoesSteam(configuracoes, { telaCheia: !configuracoes.telaCheia });
        persistirConfigEConquistas();
        if (ponte && typeof ponte.alternarTelaCheia === 'function') {
          void ponte.alternarTelaCheia(configuracoes.telaCheia);
        }
        break;
      case 'CICLAR_ESCALA_PIXEL': {
        const ordem = ['AUTO', '1X', '2X'];
        const prox = ordem[(ordem.indexOf(configuracoes.escalaPixel) + 1) % ordem.length];
        configuracoes = atualizarConfiguracoesSteam(configuracoes, { escalaPixel: prox });
        persistirConfigEConquistas();
        break;
      }
      case 'ALTERNAR_SCREEN_SHAKE':
        configuracoes = atualizarConfiguracoesSteam(configuracoes, { screenShakeAtivo: !configuracoes.screenShakeAtivo });
        persistirConfigEConquistas();
        break;
      case 'ALTERNAR_REDUZIR_MOVIMENTO':
        configuracoes = atualizarConfiguracoesSteam(configuracoes, { reduzirMovimento: !configuracoes.reduzirMovimento });
        persistirConfigEConquistas();
        break;
      case 'ALTERNAR_IDIOMA':
        configuracoes = atualizarConfiguracoesSteam(configuracoes, {
          idioma: configuracoes.idioma === 'en-US' ? 'pt-BR' : 'en-US',
        });
        persistirConfigEConquistas();
        break;
      case 'REATRIBUIR_TECLA':
        configuracoes = reatribuirAtalhoTecladoSteam(configuracoes, payload.acaoId, payload.novaTeclaCodigo);
        persistirConfigEConquistas();
        break;
      case 'ALTERNAR_VARIANTE_AB': {
        const candidata = varianteHangar === 'A' ? 'B' : 'A';
        const arq = estadoPartida?.arquiteturaSelecionadaId ?? 'CARCACA_ALFA';
        if (
          candidata === 'A' ||
          verificarLayoutTipoBDesbloqueado(`${arq}_B`, { conquistasDesbloqueadas, desbloquearTudoDev: Boolean(payload.desbloquearTudoDev) })
        ) {
          varianteHangar = candidata;
        }
        break;
      }
      case 'CICLAR_DIFICULDADE':
        dificuldadeSelecionada = ciclarDificuldadeSteam(dificuldadeSelecionada, 1);
        configuracoes = atualizarConfiguracoesSteam(configuracoes, { dificuldadePadrao: dificuldadeSelecionada });
        persistirConfigEConquistas();
        break;
      case 'INICIAR_TUTORIAL_GUIADO':
        tutorialSteam = criarEstadoTutorialSteam(true);
        modalSteamAtivo = null;
        break;
      case 'TUTORIAL_AVANCAR':
        tutorialSteam = avancarPassoTutorialSteam(tutorialSteam);
        if (tutorialSteam.concluido) {
          registrarTelemetriaConquistas({ tutorialConcluido: true });
        }
        break;
      case 'TUTORIAL_PULAR':
        tutorialSteam = pularTutorialSteam(tutorialSteam);
        break;
      default:
        break;
    }

    motorAudio.atualizarEstadoJogo(
      {
        faseJogo: estadoPartida?.faseJogo ?? 'INICIO',
        setorNumero: estadoPartida?.setorAtual ?? 1,
        submerso400Hz: Boolean(estadoPartida?.naveJogador?.emMergulhoTatico || estadoPartida?.naveJogador?.mergulhoTaticoAtivo),
        emTouchdownCasco: Boolean(
          estadoPartida?.naveJogador?.estadoFisico &&
            estadoPartida.naveJogador.estadoFisico !== '1_NO_FOIL' &&
            !estadoPartida?.naveJogador?.emMergulhoTatico &&
            !estadoPartida?.naveJogador?.mergulhoTaticoAtivo
        ),
      },
      configuracoes
    );

    return obterSnapshotLocal();
  }

  function avancarTickLocal(dtSeg = 0.25, pausaTaticaAtiva = false) {
    if (pausaTaticaAtiva || modalSteamAtivo) {
      return obterSnapshotLocal();
    }
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    if (adaptadorAtivo && typeof adaptadorAtivo.avancarTick === 'function') {
      estadoPartida = adaptadorAtivo.avancarTick(estadoPartida, dtSeg, {
        dificuldade: dificuldadeSelecionada,
        idioma: configuracoes.idioma,
      });
    }
    ticksLocaisExecutados += 1;
    latenciaUltimoTickMs = typeof performance !== 'undefined' ? Number((performance.now() - t0).toFixed(3)) : 0;

    motorAudio.atualizarEstadoJogo(
      {
        faseJogo: estadoPartida?.faseJogo ?? 'COMBATE',
        setorNumero: estadoPartida?.setorAtual ?? 1,
        submerso400Hz: Boolean(estadoPartida?.naveJogador?.emMergulhoTatico || estadoPartida?.naveJogador?.mergulhoTaticoAtivo),
        emTouchdownCasco: Boolean(
          estadoPartida?.naveJogador?.estadoFisico &&
            estadoPartida.naveJogador.estadoFisico !== '1_NO_FOIL' &&
            !estadoPartida?.naveJogador?.emMergulhoTatico &&
            !estadoPartida?.naveJogador?.mergulhoTaticoAtivo
        ),
      },
      configuracoes
    );
    return obterSnapshotLocal();
  }

  function despacharComandoLocal(comando, contextoUi = {}) {
    if (comando?.acaoSteam && !motorRealHidratado) {
      return executarAcaoMetaSteam(comando.acaoSteam, comando);
    }
    if (adaptadorAtivo && typeof adaptadorAtivo.despacharComando === 'function') {
      const res = adaptadorAtivo.despacharComando(estadoPartida, comando, {
        ...contextoUi,
        varianteHangar,
        dificuldade: dificuldadeSelecionada,
        idioma: configuracoes.idioma,
      });
      if (res?.estadoPartida) {
        estadoPartida = res.estadoPartida;
        if (estadoPartida?.meta?.configuracoesSteam) {
          configuracoes = estadoPartida.meta.configuracoesSteam;
        }
        if (estadoPartida?.meta?.modalSteamAtivo !== undefined) {
          modalSteamAtivo = estadoPartida.meta.modalSteamAtivo;
        }
        if (estadoPartida?.meta?.tutorialSteam) {
          tutorialSteam = estadoPartida.meta.tutorialSteam;
        }
        if (Array.isArray(estadoPartida?.meta?.conquistasDesbloqueadas)) {
          conquistasDesbloqueadas = [...estadoPartida.meta.conquistasDesbloqueadas];
        }
      }
      if (res?.eventoAudioFoley) {
        void motorAudio.dispararFoley(res.eventoAudioFoley, 1.0);
      }
      if (motorRealHidratado) {
        return Object.freeze({
          ...obterSnapshotLocal(),
          resultadoOperacaoLocal: res ?? null,
        });
      }
    }
    tutorialSteam = registrarAcaoNoTutorialSteam(tutorialSteam, comando?.tipo ?? comando?.acaoCampanha ?? '');
    if (tutorialSteam.concluido) {
      registrarTelemetriaConquistas({ tutorialConcluido: true });
    }
    return obterSnapshotLocal();
  }

  function hidratarAdaptadorMotorReal(novoAdaptador, estadoInicialCompleto = null) {
    if (novoAdaptador && typeof novoAdaptador === 'object') {
      adaptadorAtivo = novoAdaptador;
      motorRealHidratado = Boolean(novoAdaptador.ehMotorCompletoBiofoil ?? true);
    }
    if (estadoInicialCompleto && typeof estadoInicialCompleto === 'object') {
      estadoPartida = estadoInicialCompleto;
      if (estadoInicialCompleto.meta?.configuracoesSteam) {
        configuracoes = estadoInicialCompleto.meta.configuracoesSteam;
      }
      if (estadoInicialCompleto.meta?.modalSteamAtivo !== undefined) {
        modalSteamAtivo = estadoInicialCompleto.meta.modalSteamAtivo;
      }
      if (estadoInicialCompleto.meta?.tutorialSteam) {
        tutorialSteam = estadoInicialCompleto.meta.tutorialSteam;
      }
      if (Array.isArray(estadoInicialCompleto.meta?.conquistasDesbloqueadas)) {
        conquistasDesbloqueadas = [...estadoInicialCompleto.meta.conquistasDesbloqueadas];
      }
    }
    return obterSnapshotLocal();
  }

  function processarFrameGamepad(listaGamepads) {
    const gp = Array.isArray(listaGamepads) ? listaGamepads.find(Boolean) : null;
    const lido = traduzirEstadoGamepadSteamDeck(gp, botoesGamepadAnt);
    botoesGamepadAnt = [...lido.botoesAtuais];
    for (const cmd of lido.comandos) {
      if (cmd.tipo === 'ALTERNAR_MODAL_OPCOES') {
        executarAcaoMetaSteam('ALTERNAR_MODAL_OPCOES');
      } else if (cmd.tipo === 'GAMEPAD_CONFIRMAR' && tutorialSteam.ativo) {
        executarAcaoMetaSteam('TUTORIAL_AVANCAR');
      } else {
        despacharComandoLocal(cmd);
      }
    }
    return lido.comandos;
  }

  function obterSnapshotLocal() {
    const vmCru = adaptadorAtivo && typeof adaptadorAtivo.projetarViewModel === 'function'
      ? adaptadorAtivo.projetarViewModel(estadoPartida, { idioma: configuracoes.idioma })
      : (estadoPartida?.viewModel ?? estadoPartida);

    const vmFinal = motorRealHidratado && adaptadorAtivo?.projetarViewModel
      ? vmCru
      : enriquecerViewModelComEstadoSteam(vmCru);

    return Object.freeze({
      modoExecucao: 'LOCAL_MEMORIA_0MS',
      motorRealHidratado,
      latenciaUltimoTickMs,
      ticksLocaisExecutados,
      configuracoes,
      varianteHangar,
      dificuldadeSelecionada,
      modalSteamAtivo,
      tutorialSteam,
      conquistasDesbloqueadas: Object.freeze([...conquistasDesbloqueadas]),
      estadoAudio: motorAudio.obterEstadoInstantaneo(),
      viewModel: vmFinal,
      estadoPartida,
    });
  }

  return Object.freeze({
    executarAcaoMetaSteam,
    avancarTickLocal,
    despacharComandoLocal,
    hidratarAdaptadorMotorReal,
    temMotorRealHidratado: () => motorRealHidratado,
    processarFrameGamepad,
    registrarTelemetriaConquistas,
    enriquecerViewModelComEstadoSteam,
    obterSnapshotLocal,
    motorAudio,
  });
}
