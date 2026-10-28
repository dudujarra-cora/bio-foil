/**
 * ONDA 6 — Cliente Web Jogável HTML5/Canvas 60 FPS, ES Modules Nativos e Servidor HTTP Loopback Seguro
 * Dono Único (Lei N5): src/onda6-ui/cliente-web.mjs
 *
 * Responsabilidades:
 *  - Escapamento anti-XSS (`escaparHtmlSeguro`) e HTML5 autocontido (`gerarHtmlClienteJogavelBiofoil`);
 *  - Servir módulos ES puros nativos (`/onda6-ui/<modulo>.mjs`) E o bundle unificado `/cliente.js`
 *    a partir dos arquivos `.mjs` reais no disco (**ZERO `fn.toString()`**), garantindo paridade 0-byte Server<->Browser;
 *  - Servidor HTTP local (`iniciarServidorClienteWebBiofoil`) restrito a loopback (`127.0.0.1` / `localhost`)
 *    com CSP estrita, anti-DNS Rebinding, anti-CSRF (`Origin` / `Sec-Fetch-Site`), anti-Prototype Pollution e campanha completa.
 */
import fs from 'node:fs';
import http from 'node:http';
import {
  CADEIA_CANONICA_ONDAS_SRC,
  CADEIA_CANONICA_SRC,
  clonarProfundoCongelado,
} from '../gdd-parser.mjs';
import { criarEstadoInicialPartida } from '../onda1-fisica/estado-inicial.mjs';
import { criarAlvoSetor1Canonico } from '../onda3-inimigos/ia-barco-monstro.mjs';
import { construirPlanoGrafoWebAudio } from './cues-audio.mjs';
import { construirPaisagemSonoraCompleta } from './audio-maritimo.mjs';
import {
  exportarAtlasHiBitsPngBuffer,
  exportarPacoteAssets60Fps,
} from './assets-hibit.mjs';
import {
  salvarPerfilDisco,
  salvarRunSaveDisco,
} from './persistencia-perfil.mjs';
import {
  despacharComandoUi,
  obterMapaHitboxesNativo,
  avancarTickPartidaEmTempoReal,
} from './despacho-comandos.mjs';
import { traduzirInputDomParaComandoUi } from './tradutor-input-dom.mjs';
import {
  executarAcaoCampanhaCompleta,
  avancarTickCampanhaCompleta,
  sincronizarProgressoTutorialSteamNoEstado,
} from './campanha-completa.mjs';
import {
  projetarViewModelWireframe,
  renderizarViewModelNoCanvas2d,
  renderizarCenaCanvasParaPngBuffer,
  renderizarQuadroAnimadoCenaBiofoil,
} from './presenter-wireframe.mjs';

const COMANDOS_MOTOR_ROTEADOS_CAMPANHA = Object.freeze([
  'VIAJAR_NO_MAPA',
  'ESCOLHER_OPCAO_EVENTO',
  'COMPRAR_OU_VENDER_LOJA',
  'SALTO_FUGA',
]);

const MODULOS_RASTER_ONDA7_ORDENADOS = Object.freeze([
  'topologias-naves-ab.mjs',
  'tutorial-interativo.mjs',
  'dificuldades-conquistas-opcoes.mjs',
  'i18n-dicionario-ui.mjs',
  'particulas-juice-60fps.mjs',
  'renderizador-modais-steam.mjs',
]);

const MODULOS_ESM_NAVEGADOR_ONDA7 = Object.freeze([
  ...MODULOS_RASTER_ONDA7_ORDENADOS,
  'motor-audio-ogg-foley.mjs',
  'runtime-local-steam-cliente.mjs',
]);

const MODULOS_RASTER_PUROS_ORDENADOS = Object.freeze([
  'primitivas-raster-rgba.mjs',
  'geometria-layout-960.mjs',
  'interpolador-60fps.mjs',
  'renderizador-telas-campanha.mjs',
  'renderizador-alvo-inimigo.mjs',
  'renderizador-hud-tooltips.mjs',
  'renderizador-canvas.mjs',
]);

const MODULOS_RUNTIME_POS_BOOTSTRAP = Object.freeze([
  'sintetizador-webaudio-cliente.mjs',
  'runtime-navegador.mjs',
]);

export const MODULOS_ESM_NAVEGADOR_ONDA6 = Object.freeze([
  ...MODULOS_RASTER_PUROS_ORDENADOS,
  ...MODULOS_RUNTIME_POS_BOOTSTRAP,
]);

function limparSintaxeEsmParaEscopoBundle(codigoFonteEsm) {
  return codigoFonteEsm
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^export\s+\{[\s\S]*?\};?\s*$/gm, '')
    .replace(/^export\s+(?=(?:async\s+)?function\s+|const\s+|let\s+)/gm, '');
}

const MAPA_FONTES_ESM_PUROS = (() => {
  const mapa = {};
  for (const nomeArquivo of MODULOS_ESM_NAVEGADOR_ONDA6) {
    mapa[nomeArquivo] = fs.readFileSync(new URL(`./${nomeArquivo}`, import.meta.url), 'utf8');
  }
  return Object.freeze(mapa);
})();

const MAPA_FONTES_ESM_ONDA7 = (() => {
  const mapa = {};
  for (const nomeArquivo of MODULOS_ESM_NAVEGADOR_ONDA7) {
    mapa[nomeArquivo] = fs.readFileSync(new URL(`../onda7-steam/${nomeArquivo}`, import.meta.url), 'utf8');
  }
  return Object.freeze(mapa);
})();

const BINARIO_WASM_AUDIO_RT = fs.readFileSync(new URL('./libbiofoil_audio_rt.wasm', import.meta.url));

const CODIGO_WORKLET_AUDIO_CPP20 = `class BiofoilAudioWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._inst = null;
    this._inOffset = 0;
    this._outOffset = 0;
    this._maxFrames = 128;
    this.port.onmessage = (ev) => {
      const msg = ev && ev.data ? ev.data : {};
      if (msg.tipo === 'INIT_WASM' && msg.wasmBytes) {
        WebAssembly.instantiate(msg.wasmBytes, {}).then((res) => {
          const inst = res.instance || res;
          if (inst.exports._initialize) inst.exports._initialize();
          inst.exports.biofoil_rt_init(sampleRate || 48000);
          this._inOffset = inst.exports.biofoil_rt_get_input_ptr();
          this._outOffset = inst.exports.biofoil_rt_get_output_ptr();
          this._maxFrames = inst.exports.biofoil_rt_get_max_block_frames() || 1024;
          this._inst = inst;
          this.port.postMessage({ tipo: 'WASM_PRONTO', zona: inst.exports.biofoil_rt_get_active_zone() });
        }).catch(() => {});
      } else if (this._inst) {
        const ex = this._inst.exports;
        if (msg.tipo === 'TELEMETRIA') {
          ex.biofoil_rt_push_telemetry(
            Number(msg.hullPct ?? 1),
            Number(msg.waterKg ?? 0),
            Number(msg.cavitMarginKg ?? 100),
            Number(msg.foilState ?? 1),
            Number(msg.enemyArchetype ?? 0),
            Number(msg.bossPhase ?? 0),
            msg.oceanBoil ? 1 : 0,
            msg.salvo ? 1 : 0
          );
        } else if (msg.tipo === 'SPOOL_PROGRESS') {
          ex.biofoil_rt_set_spool_progress(Number(msg.progress01 ?? 1));
        } else if (msg.tipo === 'PREFERENCIAS') {
          ex.biofoil_rt_set_preferences(
            Number(msg.perfilCodigo ?? 0),
            msg.saidaMono ? 1 : 0,
            msg.confortoAntiTinnitus ? 1 : 0
          );
        } else if (msg.tipo === 'SONAR') {
          ex.biofoil_rt_trigger_sonar(Number(msg.intensidade ?? 0.75));
        }
      }
    };
  }
  process(inputs, outputs) {
    const out = outputs[0];
    if (!out || out.length === 0) return true;
    const outL = out[0];
    const outR = out.length > 1 ? out[1] : out[0];
    const n = outL.length;
    const inp = inputs[0];
    const inL = inp && inp.length > 0 ? inp[0] : null;
    const inR = inp && inp.length > 1 ? inp[1] : inL;
    if (!this._inst || n > this._maxFrames) {
      for (let i = 0; i < n; i += 1) {
        outL[i] = inL ? inL[i] : 0;
        outR[i] = inR ? inR[i] : 0;
      }
      return true;
    }
    const mem = this._inst.exports.memory.buffer;
    const inView = new Float32Array(mem, this._inOffset, n * 2);
    for (let i = 0; i < n; i += 1) {
      inView[2 * i] = inL ? inL[i] : 0;
      inView[2 * i + 1] = inR ? inR[i] : 0;
    }
    this._inst.exports.biofoil_rt_process_scratch_block(n);
    const outView = new Float32Array(this._inst.exports.memory.buffer, this._outOffset, n * 2);
    for (let i = 0; i < n; i += 1) {
      outL[i] = outView[2 * i];
      outR[i] = outView[2 * i + 1];
    }
    return true;
  }
}
registerProcessor('biofoil-audio-cpp20', BiofoilAudioWorkletProcessor);
`;

const SET_MODULOS_SRC_SIMULACAO_BROWSER = new Set(
  [...CADEIA_CANONICA_SRC, ...CADEIA_CANONICA_ONDAS_SRC].filter(
    (m) =>
      m.endsWith('.mjs') &&
      m !== 'onda6-ui/cliente-web.mjs' &&
      m !== 'onda7-steam/steamworks-desktop-host.mjs'
  )
);

const CACHE_MODULOS_SRC_BROWSER = new Map();

function gerarFonteEsmSimulacaoNavegador(caminhoRelSrc) {
  if (!SET_MODULOS_SRC_SIMULACAO_BROWSER.has(caminhoRelSrc)) {
    return null;
  }
  if (CACHE_MODULOS_SRC_BROWSER.has(caminhoRelSrc)) {
    return CACHE_MODULOS_SRC_BROWSER.get(caminhoRelSrc);
  }
  let codigo = '';
  if (caminhoRelSrc === 'gdd-parser.mjs') {
    codigo = [
      'export function normalizarTexto(texto) {',
      '  let t = String(texto);',
      '  for (let i = 0; i < 4; i += 1) {',
      '    t = t.replace(/\\\\(?:text|mathbf|textbf|mathrm)\\{([^{}]*)\\}/g, "$1");',
      '  }',
      '  return t.replace(/\\\\rightarrow\\b|\\\\to\\b/g, "->").replace(/\\\\leftrightarrow\\b/g, "<->").replace(/\\\\times\\b/g, "x").replace(/\\\\le\\b/g, "<=").replace(/\\\\ge\\b/g, ">=").replace(/\\\\%/g, "%").replace(/\\\\;/g, " ").replace(/\\$/g, "").replace(/\\*\\*/g, "").replace(/`/g, "").replace(/[ \\t]+/g, " ");',
      '}',
      'export function clonarProfundoCongelado(obj) {',
      '  const copia = structuredClone(obj);',
      '  const congelar = (alvo) => {',
      '    if (alvo && typeof alvo === "object" && !ArrayBuffer.isView(alvo)) {',
      '      Object.freeze(alvo);',
      '      for (const chave of Object.keys(alvo)) congelar(alvo[chave]);',
      '    }',
      '    return alvo;',
      '  };',
      '  return congelar(copia);',
      '}',
      '',
    ].join('\n');
  } else if (caminhoRelSrc === 'onda6-ui/persistencia-perfil.mjs') {
    const fonteBruta = fs.readFileSync(new URL('./persistencia-perfil.mjs', import.meta.url), 'utf8');
    const shimFsBrowser = [
      'const __vfsMemBiofoil = new Map();',
      'const process = { env: {}, pid: 1 };',
      'const os = { homedir: () => "/biofoil-browser", tmpdir: () => "/biofoil-browser/tmp" };',
      'const path = {',
      '  resolve: (...p) => "/" + p.filter(Boolean).join("/").replace(/\\/+/g, "/").replace(/^\\//, ""),',
      '  join: (...p) => p.filter(Boolean).join("/").replace(/\\/+/g, "/"),',
      '  dirname: (p) => String(p).split("/").slice(0, -1).join("/") || "/",',
      '};',
      'const fs = {',
      '  mkdirSync: () => {},',
      '  existsSync: (c) => __vfsMemBiofoil.has(String(c)),',
      '  readFileSync: (c) => { if (!__vfsMemBiofoil.has(String(c))) throw new Error("ENOENT"); return __vfsMemBiofoil.get(String(c)); },',
      '  writeFileSync: (c, txt) => { __vfsMemBiofoil.set(String(c), String(txt)); },',
      '  renameSync: (de, para) => { if (__vfsMemBiofoil.has(String(de))) { __vfsMemBiofoil.set(String(para), __vfsMemBiofoil.get(String(de))); __vfsMemBiofoil.delete(String(de)); } },',
      '  unlinkSync: (c) => { __vfsMemBiofoil.delete(String(c)); },',
      '};',
    ].join('\n');
    codigo = fonteBruta.replace(
      /import fs from 'node:fs';\s*import os from 'node:os';\s*import path from 'node:path';/,
      shimFsBrowser
    );
  } else if (caminhoRelSrc === 'onda6-ui/assets-hibit.mjs') {
    const fonteBruta = fs.readFileSync(new URL('./assets-hibit.mjs', import.meta.url), 'utf8');
    codigo = fonteBruta.replace(
      /import zlib from 'node:zlib';/,
      'const zlib = { deflateSync: () => new Uint8Array(0), inflateSync: () => new Uint8Array(0) };'
    );
  } else if (caminhoRelSrc === 'onda6-ui/audio-maritimo.mjs') {
    const fonteBruta = fs.readFileSync(new URL('./audio-maritimo.mjs', import.meta.url), 'utf8');
    const fonteSintetizador = JSON.stringify(MAPA_FONTES_ESM_PUROS['sintetizador-webaudio-cliente.mjs']);
    codigo = fonteBruta
      .replace(/import fs from 'node:fs';\s*/, '')
      .replace(
        /fs\s*\.readFileSync\(new URL\('\.\/sintetizador-webaudio-cliente\.mjs',\s*import\.meta\.url\),\s*'utf8'\)/,
        fonteSintetizador
      );
  } else {
    codigo = fs.readFileSync(new URL(`../${caminhoRelSrc}`, import.meta.url), 'utf8');
  }
  CACHE_MODULOS_SRC_BROWSER.set(caminhoRelSrc, codigo);
  return codigo;
}

const CODIGO_BUNDLE_CLIENTE_JS = (() => {
  const codigoPrimitivas = limparSintaxeEsmParaEscopoBundle(MAPA_FONTES_ESM_PUROS['primitivas-raster-rgba.mjs']);
  const blocoOnda7 = MODULOS_RASTER_ONDA7_ORDENADOS.map((nome) =>
    limparSintaxeEsmParaEscopoBundle(MAPA_FONTES_ESM_ONDA7[nome])
  ).join('\n\n');
  const blocoRasterRestante = MODULOS_RASTER_PUROS_ORDENADOS.filter((n) => n !== 'primitivas-raster-rgba.mjs')
    .map((nome) => limparSintaxeEsmParaEscopoBundle(MAPA_FONTES_ESM_PUROS[nome]))
    .join('\n\n');
  const codigoAudioSteamOnda7 = limparSintaxeEsmParaEscopoBundle(
    MAPA_FONTES_ESM_ONDA7['motor-audio-ogg-foley.mjs']
  );
  const codigoRuntimeSteamOnda7 = limparSintaxeEsmParaEscopoBundle(
    MAPA_FONTES_ESM_ONDA7['runtime-local-steam-cliente.mjs']
  );
  const blocoRuntime = MODULOS_RUNTIME_POS_BOOTSTRAP.map((nome) =>
    limparSintaxeEsmParaEscopoBundle(MAPA_FONTES_ESM_PUROS[nome])
  ).join('\n\n');

  return `(() => {
  'use strict';
  const __BIOFOIL_BUNDLE_IIFE = true;
${codigoPrimitivas}

${blocoOnda7}

${blocoRasterRestante}

  const bootEl = typeof document !== 'undefined' ? document.getElementById('biofoil-bootstrap') : null;
  let estadoCliente = JSON.parse(bootEl ? bootEl.textContent || '{}' : '{}');

${codigoAudioSteamOnda7}

${codigoRuntimeSteamOnda7}

${blocoRuntime}

  iniciarRuntimeDomBiofoil(
    typeof document !== 'undefined' ? document : null,
    typeof window !== 'undefined' ? window : null,
    estadoCliente
  );
})();\n`;
})();

/**
 * Escapa caracteres especiais HTML para impedir injeção XSS ao renderizar dados no documento.
 */
export function escaparHtmlSeguro(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Retorna o script JavaScript client-side (`/cliente.js`, servido sob `script-src 'self'`) montado diretamente
 * dos módulos `.mjs` reais da Onda 6 (ZERO `.toString()`), mantendo paridade pixel a pixel (`0 bytes diff`)
 * entre Servidor e Navegador em todas as fases e modais.
 */
export function gerarCodigoJsClienteBiofoil() {
  return CODIGO_BUNDLE_CLIENTE_JS;
}

/**
 * Gera o HTML5 autocontido e seguro do cliente jogável (Canvas 960x540 -> 1920x1080 pixelated a 60 FPS + WebAudio 400 Hz).
 * Suporta tanto `/cliente.js` quanto ES Modules nativos (`opcoes.usarModulosEsmNativos === true` -> `/onda6-ui/runtime-navegador.mjs`).
 */
export function gerarHtmlClienteJogavelBiofoil(estadoInicial, opcoes = {}) {
  const vm = projetarViewModelWireframe(estadoInicial);
  const frameCanvas = renderizarViewModelNoCanvas2d(vm);
  const hitboxes = obterMapaHitboxesNativo(vm);
  const paisagemSonora = construirPaisagemSonoraCompleta(estadoInicial, estadoInicial, null, { seqAudio: 'boot' });
  const tituloSeguro = escaparHtmlSeguro(opcoes.titulo ?? 'BIO-FOIL — Tactical Hydrofoil Roguelike (60 FPS Hi-Bit)');
  const jsonEstadoSeguro = JSON.stringify({ viewModel: vm, frameCanvas, hitboxes, paisagemSonora })
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  const tagScriptMotor =
    opcoes.usarModulosEsmNativos === true
      ? '<script type="module" src="/onda6-ui/runtime-navegador.mjs"></script>'
      : '<script src="/cliente.js" defer></script>';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${tituloSeguro}</title>
  <style>
    body { margin: 0; background: #05080c; color: #ebf8ff; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; font-family: monospace; user-select: none; }
    #biofoil-canvas { width: 1920px; height: 1080px; max-width: 100vw; max-height: 100vh; aspect-ratio: 16 / 9; image-rendering: pixelated; image-rendering: crisp-edges; border: 1px solid #00e5ff; }
  </style>
</head>
<body>
  <canvas id="biofoil-canvas" width="960" height="540" data-upscale="2" data-engine-fps="60" data-filtro-touchdown-hz="400"></canvas>
  <script id="biofoil-bootstrap" type="application/json">${jsonEstadoSeguro}</script>
  ${tagScriptMotor}
</body>
</html>`;
}

const CHAVES_PROTOTYPE_PROIBIDAS = Object.freeze(['__proto__', 'constructor', 'prototype']);

function contemChaveProibida(textoJson) {
  return CHAVES_PROTOTYPE_PROIBIDAS.some((k) => textoJson.includes(`"${k}"`));
}

function inspecionarObjetoJsonSeguro(valor, profundidade = 0) {
  if (profundidade > 12) return false;
  if (valor === null || typeof valor !== 'object') return true;
  for (const chave of Object.getOwnPropertyNames(valor)) {
    if (CHAVES_PROTOTYPE_PROIBIDAS.includes(chave)) return false;
    if (!inspecionarObjetoJsonSeguro(valor[chave], profundidade + 1)) return false;
  }
  return true;
}

/**
 * Sobe o servidor HTTP local seguro (apenas 127.0.0.1/localhost, com CSP, anti-DNS Rebinding, anti-CSRF Origin/Sec-Fetch-Site,
 * socket timeouts, bloqueio de Prototype Pollution inclusive escapado e limite de payload) servindo o Front-End Canvas 960x540 + endpoints.
 */
export async function iniciarServidorClienteWebBiofoil(opcoes = {}) {
  const host = String(opcoes.host ?? '127.0.0.1');
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error(`[SEGURANCA HTTP] Bind proibido fora de loopback: "${host}" (use 127.0.0.1)`);
  }
  const porta = Number(opcoes.port ?? opcoes.porta ?? 0);
  const maxPayloadBytes = Number(opcoes.maxPayloadBytes ?? 16384);
  const seedPadrao = String(opcoes.seedInicial ?? 'seed-web-01');
  const modoCampanhaAtivo = Boolean(opcoes.modoCampanhaCompleta || opcoes.estadoInicial?.meta?.modoCampanhaCompleta);
  const opcoesPersistencia = {
    persistirEmDisco: Boolean(opcoes.persistirEmDisco),
    diretorioDados: opcoes.diretorioDados,
  };

  let estadoAtual = clonarProfundoCongelado(
    opcoes.estadoInicial ?? {
      ...criarEstadoInicialPartida(seedPadrao, 'CARCACA_ALFA'),
      alvoCombate: criarAlvoSetor1Canonico('BARCO_HUMANO'),
    }
  );
  let contextoUiServidor = {
    pausaTaticaAtiva: false,
    slotArmaSelecionado: 0,
    tripulanteSelecionadoId: estadoAtual.naveJogador?.tripulacao?.[0]?.id ?? 'trip-polvo-1',
    tripulantesSelecionadosIds: [estadoAtual.naveJogador?.tripulacao?.[0]?.id ?? 'trip-polvo-1'],
    modoOrdemAbordagem: false,
    salaAlvoAbordagemId: 1,
    ultimaSalaBeamClicadaId: null,
  };
  let seqAudioServidor = 0;

  function processarOperacaoMotorEmMemoria(urlOperacao, body) {
    const estadoAnterior = estadoAtual;
    let ultimoResultadoComando = null;
    let idHitboxHover = null;
    let acaoLocalUi = null;
    const usaCampanha = Boolean(modoCampanhaAtivo || estadoAtual.meta?.modoCampanhaCompleta);

    if (urlOperacao === '/api/tick') {
      if (
        body.dtSeg !== undefined &&
        (typeof body.dtSeg !== 'number' || !Number.isFinite(body.dtSeg) || body.dtSeg <= 0)
      ) {
        return { statusHttp: 400, payload: { erro: 'DT_SEG_INVALIDO' } };
      }
      const dtSeg = Math.max(0.05, Math.min(5.0, body.dtSeg ?? 0.25));
      const pausaAtiva =
        body.pausaTaticaAtiva !== undefined ? Boolean(body.pausaTaticaAtiva) : contextoUiServidor.pausaTaticaAtiva;
      contextoUiServidor = { ...contextoUiServidor, pausaTaticaAtiva: pausaAtiva };
      if (pausaAtiva !== true) {
        estadoAtual = usaCampanha
          ? avancarTickCampanhaCompleta(estadoAtual, dtSeg, opcoesPersistencia)
          : avancarTickPartidaEmTempoReal(estadoAtual, dtSeg);
      }
    } else if (body.eventoInput && typeof body.eventoInput === 'object') {
      const ctxEntrada = {
        ...contextoUiServidor,
        ...(body.contextoUi && typeof body.contextoUi === 'object' ? body.contextoUi : {}),
      };
      const vmAntes = projetarViewModelWireframe(estadoAtual);
      const traducao = traduzirInputDomParaComandoUi(body.eventoInput, estadoAtual, vmAntes, ctxEntrada);
      idHitboxHover = traducao.hitboxAtingida ?? null;
      acaoLocalUi = traducao.acaoLocalUi ?? null;
      const slotCand =
        traducao.slotArmaSelecionado !== undefined
          ? traducao.slotArmaSelecionado
          : Number(ctxEntrada.slotArmaSelecionado ?? 0);
      const tripCand = String(
        traducao.tripulanteSelecionadoId !== undefined
          ? traducao.tripulanteSelecionadoId
          : (ctxEntrada.tripulanteSelecionadoId ?? 'trip-polvo-1')
      ).slice(0, 64);
      const salaAbCand = Number(
        traducao.salaAlvoAbordagemId !== undefined
          ? traducao.salaAlvoAbordagemId
          : (ctxEntrada.salaAlvoAbordagemId ?? 1)
      );
      const ultBeamCand =
        traducao.ultimaSalaBeamClicadaId !== undefined
          ? traducao.ultimaSalaBeamClicadaId
          : (ctxEntrada.ultimaSalaBeamClicadaId ?? null);

      const listaTripCand = Array.isArray(traducao.tripulantesSelecionadosIds)
        ? traducao.tripulantesSelecionadosIds.map((id) => String(id).slice(0, 64))
        : Array.isArray(ctxEntrada.tripulantesSelecionadosIds)
          ? ctxEntrada.tripulantesSelecionadosIds.map((id) => String(id).slice(0, 64))
          : [tripCand];

      contextoUiServidor = {
        pausaTaticaAtiva:
          traducao.pausaTaticaAtiva !== undefined ? traducao.pausaTaticaAtiva : Boolean(ctxEntrada.pausaTaticaAtiva),
        slotArmaSelecionado: Number.isInteger(slotCand) && slotCand >= 0 && slotCand <= 3 ? slotCand : 0,
        tripulanteSelecionadoId: tripCand,
        tripulantesSelecionadosIds: listaTripCand,
        modoOrdemAbordagem:
          traducao.modoOrdemAbordagem !== undefined
            ? Boolean(traducao.modoOrdemAbordagem)
            : Boolean(ctxEntrada.modoOrdemAbordagem),
        salaAlvoAbordagemId: Number.isInteger(salaAbCand) && salaAbCand >= 1 && salaAbCand <= 8 ? salaAbCand : 1,
        ultimaSalaBeamClicadaId: Number.isInteger(ultBeamCand) ? ultBeamCand : null,
      };

      if (traducao.acaoLocalUi === 'ACAO_CAMPANHA' && traducao.acaoCampanhaUi) {
        const resCamp = executarAcaoCampanhaCompleta(estadoAtual, traducao.acaoCampanhaUi, opcoesPersistencia);
        if (resCamp.estado) {
          estadoAtual = resCamp.estado;
        }
        if (
          traducao.acaoCampanhaUi.tipoAcao === 'INICIAR_NOVA_RUN' ||
          traducao.acaoCampanhaUi.tipoAcao === 'CONTINUAR_RUN_SALVA'
        ) {
          contextoUiServidor = {
            ...contextoUiServidor,
            pausaTaticaAtiva: false,
            slotArmaSelecionado: 0,
            tripulanteSelecionadoId: estadoAtual.naveJogador?.tripulacao?.[0]?.id ?? 'trip-polvo-1',
            tripulantesSelecionadosIds: [estadoAtual.naveJogador?.tripulacao?.[0]?.id ?? 'trip-polvo-1'],
            modoOrdemAbordagem: false,
            ultimaSalaBeamClicadaId: null,
          };
        }
        const tipoEfetivoUi = resCamp.acaoExecutada ?? traducao.acaoCampanhaUi.tipoAcao;
        ultimoResultadoComando = {
          aceito: Boolean(resCamp.ok),
          marcadorRejeicao: resCamp.ok ? null : (resCamp.codigoErro ?? 'ACAO_CAMPANHA_REJEITADA'),
          cueEmitido: resCamp.cueEmitido ?? null,
          comandoExecutado: { tipo: tipoEfetivoUi },
          acaoCampanhaExecutada: { ...traducao.acaoCampanhaUi, tipoAcao: tipoEfetivoUi },
          estado: estadoAtual,
        };
      } else if (
        usaCampanha &&
        traducao.comandoMotor &&
        COMANDOS_MOTOR_ROTEADOS_CAMPANHA.includes(traducao.comandoMotor.tipo)
      ) {
        const resCampCmd = executarAcaoCampanhaCompleta(
          estadoAtual,
          { comandoMotor: traducao.comandoMotor },
          opcoesPersistencia
        );
        if (resCampCmd.estado) {
          estadoAtual = resCampCmd.estado;
        }
        ultimoResultadoComando = {
          aceito: Boolean(resCampCmd.ok),
          marcadorRejeicao: resCampCmd.ok ? null : (resCampCmd.codigoErro ?? 'COMANDO_CAMPANHA_REJEITADO'),
          cueEmitido: resCampCmd.cueEmitido ?? traducao.resultadoMotor?.cueEmitido ?? null,
          comandoExecutado: traducao.comandoMotor,
          estado: estadoAtual,
        };
      } else {
        ultimoResultadoComando = traducao.resultadoMotor;
        if (ultimoResultadoComando?.estado) {
          estadoAtual = ultimoResultadoComando.estado;
        }
        if (
          body.eventoInput?.tipoEvento !== 'MOUSEMOVE' &&
          estadoAtual?.meta?.edicaoComercialSteam &&
          estadoAtual?.meta?.tutorialSteam?.ativo &&
          (!ultimoResultadoComando || ultimoResultadoComando.aceito !== false)
        ) {
          const chaveTutEv = traducao.comandoMotor?.tipo ?? acaoLocalUi ?? null;
          if (chaveTutEv && chaveTutEv !== 'ATUALIZAR_GHOST_PREVIEW') {
            estadoAtual = sincronizarProgressoTutorialSteamNoEstado(estadoAtual, chaveTutEv, opcoesPersistencia);
          }
        }
      }
    } else if (body.acaoCampanha && typeof body.acaoCampanha === 'object') {
      const resCampDir = executarAcaoCampanhaCompleta(estadoAtual, body.acaoCampanha, opcoesPersistencia);
      if (resCampDir.estado) {
        estadoAtual = resCampDir.estado;
      }
      const tipoCampDir =
        body.acaoCampanha.comandoMotor?.tipo ?? body.acaoCampanha.tipoAcao ?? body.acaoCampanha.tipo ?? null;
      const acaoEfetivaCamp = resCampDir.acaoExecutada
        ? { ...body.acaoCampanha, tipoAcao: resCampDir.acaoExecutada }
        : body.acaoCampanha;
      ultimoResultadoComando = {
        aceito: Boolean(resCampDir.ok),
        marcadorRejeicao: resCampDir.ok ? null : (resCampDir.codigoErro ?? 'ACAO_CAMPANHA_REJEITADA'),
        cueEmitido: resCampDir.cueEmitido ?? null,
        comandoExecutado: tipoCampDir ? { tipo: tipoCampDir } : null,
        acaoCampanhaExecutada: acaoEfetivaCamp,
        estado: estadoAtual,
      };
    } else if (body.comando && typeof body.comando === 'object') {
      if (usaCampanha && COMANDOS_MOTOR_ROTEADOS_CAMPANHA.includes(body.comando.tipo)) {
        const resCampBody = executarAcaoCampanhaCompleta(
          estadoAtual,
          { comandoMotor: body.comando },
          opcoesPersistencia
        );
        if (resCampBody.estado) {
          estadoAtual = resCampBody.estado;
        }
        ultimoResultadoComando = {
          aceito: Boolean(resCampBody.ok),
          marcadorRejeicao: resCampBody.ok ? null : (resCampBody.codigoErro ?? 'COMANDO_CAMPANHA_REJEITADO'),
          cueEmitido: resCampBody.cueEmitido ?? null,
          comandoExecutado: body.comando,
          estado: estadoAtual,
        };
      } else {
        ultimoResultadoComando = despacharComandoUi(estadoAtual, body.comando);
        estadoAtual = ultimoResultadoComando.estado;
        if (
          ultimoResultadoComando.aceito !== false &&
          estadoAtual?.meta?.edicaoComercialSteam &&
          estadoAtual?.meta?.tutorialSteam?.ativo
        ) {
          estadoAtual = sincronizarProgressoTutorialSteamNoEstado(estadoAtual, body.comando.tipo, opcoesPersistencia);
        }
      }
    } else {
      return { statusHttp: 400, payload: { erro: 'COMANDO_AUSENTE' } };
    }

    const vmNovo = projetarViewModelWireframe(estadoAtual, { idHitboxHover });
    const frameCanvas = renderizarViewModelNoCanvas2d(vmNovo);
    const hitboxes = obterMapaHitboxesNativo(vmNovo);
    const ehMouseMovePuro = body.eventoInput?.tipoEvento === 'MOUSEMOVE';
    const opcoesPaisagem = ehMouseMovePuro
      ? { seqAudio: 'hover', pausaTaticaAtiva: Boolean(contextoUiServidor.pausaTaticaAtiva) }
      : { seqAudio: ++seqAudioServidor, pausaTaticaAtiva: Boolean(contextoUiServidor.pausaTaticaAtiva) };
    const planoAudio = construirPlanoGrafoWebAudio(estadoAnterior, estadoAtual, ultimoResultadoComando);
    const paisagemSonora = construirPaisagemSonoraCompleta(
      estadoAnterior,
      estadoAtual,
      ultimoResultadoComando,
      opcoesPaisagem
    );
    return {
      statusHttp: 200,
      payload: {
        aceito: ultimoResultadoComando ? ultimoResultadoComando.aceito : true,
        marcadorRejeicao: ultimoResultadoComando?.marcadorRejeicao ?? null,
        acaoLocalUi,
        hitboxAtingida: idHitboxHover,
        contextoUi: contextoUiServidor,
        viewModel: vmNovo,
        frameCanvas,
        hitboxes,
        planoAudio,
        paisagemSonora,
      },
    };
  }

  const cabecalhosSeguranca = {
    'Content-Security-Policy':
      "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'unsafe-inline'; img-src 'self' data:; media-src 'self' data: blob:; connect-src 'self' http://127.0.0.1:* http://localhost:*; frame-ancestors 'none'; base-uri 'none'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cache-Control': 'no-store',
  };

  const servidor = http.createServer((req, res) => {
    const hostHeader = String(req.headers.host ?? '');
    if (!/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(hostHeader)) {
      res.writeHead(403, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ erro: 'DNS_REBINDING_BLOQUEADO' }));
      return;
    }

    const originHeader = req.headers.origin;
    const secFetchSite = String(req.headers['sec-fetch-site'] ?? '').toLowerCase();
    if (
      secFetchSite === 'cross-site' ||
      (originHeader && !/^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(String(originHeader)))
    ) {
      res.writeHead(403, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ erro: 'ORIGEM_CRUZADA_BLOQUEADA' }));
      return;
    }

    const urlBruta = String(req.url ?? '/');
    const urlLimpa = urlBruta.split('?')[0];

    if (urlLimpa.startsWith('/src/') && urlLimpa.endsWith('.mjs')) {
      if (req.method !== 'GET') {
        res.writeHead(405, { ...cabecalhosSeguranca, Allow: 'GET', 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ erro: 'METODO_NAO_PERMITIDO' }));
        return;
      }
      const caminhoRelSrc = urlLimpa.slice('/src/'.length);
      const codigoSrcBrowser = gerarFonteEsmSimulacaoNavegador(caminhoRelSrc);
      if (codigoSrcBrowser !== null) {
        res.writeHead(200, { ...cabecalhosSeguranca, 'Content-Type': 'application/javascript; charset=utf-8' });
        res.end(codigoSrcBrowser);
        return;
      }
      res.writeHead(404, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ erro: 'MODULO_ESM_NAO_ENCONTRADO' }));
      return;
    }

    if (urlLimpa.startsWith('/onda7-steam/')) {
      if (req.method !== 'GET') {
        res.writeHead(405, { ...cabecalhosSeguranca, Allow: 'GET', 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ erro: 'METODO_NAO_PERMITIDO' }));
        return;
      }
      const nomeModulo7 = urlLimpa.slice('/onda7-steam/'.length);
      if (Object.prototype.hasOwnProperty.call(MAPA_FONTES_ESM_ONDA7, nomeModulo7)) {
        res.writeHead(200, { ...cabecalhosSeguranca, 'Content-Type': 'application/javascript; charset=utf-8' });
        res.end(MAPA_FONTES_ESM_ONDA7[nomeModulo7]);
        return;
      }
      res.writeHead(404, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ erro: 'MODULO_ESM_NAO_ENCONTRADO' }));
      return;
    }

    if (urlLimpa.startsWith('/assets/audio/') && urlLimpa.endsWith('.ogg')) {
      if (req.method !== 'GET') {
        res.writeHead(405, { ...cabecalhosSeguranca, Allow: 'GET', 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ erro: 'METODO_NAO_PERMITIDO' }));
        return;
      }
      const nomeOgg = urlLimpa.slice('/assets/audio/'.length);
      if (/^[a-z0-9_]+\.ogg$/i.test(nomeOgg)) {
        const urlArquivoOgg = new URL(`../../assets/audio/${nomeOgg}`, import.meta.url);
        if (fs.existsSync(urlArquivoOgg)) {
          const bufOgg = fs.readFileSync(urlArquivoOgg);
          res.writeHead(200, {
            ...cabecalhosSeguranca,
            'Content-Type': 'audio/ogg',
            'Content-Length': String(bufOgg.length),
          });
          res.end(bufOgg);
          return;
        }
      }
      res.writeHead(404, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ erro: 'AUDIO_OGG_NAO_ENCONTRADO' }));
      return;
    }

    if (urlLimpa.startsWith('/onda6-ui/')) {
      if (req.method !== 'GET') {
        res.writeHead(405, { ...cabecalhosSeguranca, Allow: 'GET', 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ erro: 'METODO_NAO_PERMITIDO' }));
        return;
      }
      const nomeModulo = urlLimpa.slice('/onda6-ui/'.length);
      if (nomeModulo === 'libbiofoil_audio_rt.wasm') {
        res.writeHead(200, {
          ...cabecalhosSeguranca,
          'Content-Type': 'application/wasm',
          'Content-Length': String(BINARIO_WASM_AUDIO_RT.length),
        });
        res.end(BINARIO_WASM_AUDIO_RT);
        return;
      }
      if (nomeModulo === 'worklet-audio-cpp20.js') {
        res.writeHead(200, { ...cabecalhosSeguranca, 'Content-Type': 'application/javascript; charset=utf-8' });
        res.end(CODIGO_WORKLET_AUDIO_CPP20);
        return;
      }
      if (Object.prototype.hasOwnProperty.call(MAPA_FONTES_ESM_PUROS, nomeModulo)) {
        res.writeHead(200, { ...cabecalhosSeguranca, 'Content-Type': 'application/javascript; charset=utf-8' });
        res.end(MAPA_FONTES_ESM_PUROS[nomeModulo]);
        return;
      }
      res.writeHead(404, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ erro: 'MODULO_ESM_NAO_ENCONTRADO' }));
      return;
    }

    if (
      urlLimpa === '/' ||
      urlLimpa === '/cliente.js' ||
      urlLimpa === '/atlas-hibits.png' ||
      urlLimpa === '/cena-atual.png' ||
      urlLimpa === '/quadro-animado-f1.png' ||
      urlLimpa === '/api/assets-60fps' ||
      urlLimpa === '/api/estado' ||
      urlLimpa === '/api/estado-completo'
    ) {
      if (req.method !== 'GET') {
        res.writeHead(405, { ...cabecalhosSeguranca, Allow: 'GET', 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ erro: 'METODO_NAO_PERMITIDO' }));
        return;
      }
      if (urlLimpa === '/') {
        const paramsRaiz = new URLSearchParams(urlBruta.includes('?') ? urlBruta.slice(urlBruta.indexOf('?') + 1) : '');
        const usarEsm =
          opcoes.usarModulosEsmNativos !== undefined
            ? Boolean(opcoes.usarModulosEsmNativos)
            : paramsRaiz.get('legacy') !== '1';
        const html = gerarHtmlClienteJogavelBiofoil(estadoAtual, {
          titulo: opcoes.titulo,
          usarModulosEsmNativos: usarEsm,
        });
        res.writeHead(200, { ...cabecalhosSeguranca, 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }
      if (urlLimpa === '/cliente.js') {
        const js = gerarCodigoJsClienteBiofoil();
        res.writeHead(200, { ...cabecalhosSeguranca, 'Content-Type': 'application/javascript; charset=utf-8' });
        res.end(js);
        return;
      }
      if (urlLimpa === '/api/assets-60fps') {
        const pacote = exportarPacoteAssets60Fps();
        res.writeHead(200, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(pacote));
        return;
      }
      if (urlLimpa === '/atlas-hibits.png') {
        const pngBuffer = exportarAtlasHiBitsPngBuffer(2);
        res.writeHead(200, {
          ...cabecalhosSeguranca,
          'Content-Type': 'image/png',
          'Content-Length': String(pngBuffer.length),
        });
        res.end(pngBuffer);
        return;
      }
      if (urlLimpa === '/cena-atual.png') {
        const pngCena = renderizarCenaCanvasParaPngBuffer(projetarViewModelWireframe(estadoAtual), {
          escalaInteira: 1,
          exibirGhostPreview: true,
        });
        res.writeHead(200, {
          ...cabecalhosSeguranca,
          'Content-Type': 'image/png',
          'Content-Length': String(pngCena.length),
        });
        res.end(pngCena);
        return;
      }
      if (urlLimpa === '/quadro-animado-f1.png') {
        const params = new URLSearchParams(urlBruta.includes('?') ? urlBruta.slice(urlBruta.indexOf('?') + 1) : '');
        const frameStr = params.get('frame') ?? '0';
        const fpsStr = params.get('fps') ?? '24';
        if (!/^\d{1,4}$/.test(frameStr)) {
          res.writeHead(400, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ erro: 'QUADRO_TICK_INVALIDO' }));
          return;
        }
        const resultadoQuadro = renderizarQuadroAnimadoCenaBiofoil(estadoAtual, {
          quadroTick: Number(frameStr),
          fps: fpsStr === '60' ? 60 : 24,
          escalaInteira: 1,
          exibirGhostPreview: true,
        });
        res.writeHead(200, {
          ...cabecalhosSeguranca,
          'Content-Type': 'image/png',
          'Content-Length': String(resultadoQuadro.pngBuffer.length),
        });
        res.end(resultadoQuadro.pngBuffer);
        return;
      }
      if (urlLimpa === '/api/estado-completo') {
        res.writeHead(200, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            estado: estadoAtual,
            contextoUi: contextoUiServidor,
            modoCampanhaCompleta: modoCampanhaAtivo,
          })
        );
        return;
      }
      const vm = projetarViewModelWireframe(estadoAtual);
      const frameCanvas = renderizarViewModelNoCanvas2d(vm);
      const hitboxes = obterMapaHitboxesNativo(vm);
      const planoAudio = construirPlanoGrafoWebAudio(estadoAtual, estadoAtual, null);
      const paisagemSonora = construirPaisagemSonoraCompleta(estadoAtual, estadoAtual, null, {
        seqAudio: 'estado',
        pausaTaticaAtiva: Boolean(contextoUiServidor.pausaTaticaAtiva),
      });
      res.writeHead(200, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          viewModel: vm,
          frameCanvas,
          hitboxes,
          planoAudio,
          paisagemSonora,
          contextoUi: contextoUiServidor,
        })
      );
      return;
    }

    if (
      urlLimpa === '/api/comando' ||
      urlLimpa === '/api/tick' ||
      urlLimpa === '/api/sincronizar' ||
      urlLimpa === '/api/steam-ipc'
    ) {
      if (req.method !== 'POST') {
        res.writeHead(405, { ...cabecalhosSeguranca, Allow: 'POST', 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ erro: 'METODO_NAO_PERMITIDO' }));
        return;
      }

      const contentType = String(req.headers['content-type'] ?? '');
      if (!contentType.toLowerCase().includes('application/json')) {
        res.writeHead(415, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ erro: 'CONTENT_TYPE_INVALIDO' }));
        return;
      }

      const limiteBytesRota = urlLimpa === '/api/sincronizar' ? Math.max(maxPayloadBytes, 524288) : maxPayloadBytes;
      let bytesRecebidos = 0;
      let abortadoPorTamanho = false;
      const pedacos = [];

      req.on('data', (chunk) => {
        if (abortadoPorTamanho) return;
        bytesRecebidos += chunk.length;
        if (bytesRecebidos > limiteBytesRota) {
          abortadoPorTamanho = true;
          res.writeHead(413, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ erro: 'PAYLOAD_MUITO_GRANDE' }));
          req.destroy();
          return;
        }
        pedacos.push(chunk);
      });

      req.on('end', () => {
        if (abortadoPorTamanho) return;
        const textoJson = Buffer.concat(pedacos).toString('utf8') || '{}';
        if (contemChaveProibida(textoJson)) {
          res.writeHead(400, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ erro: 'PROTOTYPE_POLLUTION_BLOQUEADO' }));
          return;
        }

        let body;
        try {
          body = JSON.parse(textoJson);
        } catch {
          res.writeHead(400, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ erro: 'JSON_INVALIDO' }));
          return;
        }

        if (body === null || typeof body !== 'object' || Array.isArray(body)) {
          res.writeHead(400, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ erro: 'PAYLOAD_OBJETO_INVALIDO' }));
          return;
        }

        if (!inspecionarObjetoJsonSeguro(body)) {
          res.writeHead(400, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ erro: 'PROTOTYPE_POLLUTION_BLOQUEADO' }));
          return;
        }

        if (urlLimpa === '/api/steam-ipc') {
          const paramsIpc = new URLSearchParams(urlBruta.includes('?') ? urlBruta.slice(urlBruta.indexOf('?') + 1) : '');
          const portaIpc = Number(paramsIpc.get('port') ?? body.portaIpc ?? 0);
          if (!Number.isInteger(portaIpc) || portaIpc < 1 || portaIpc > 65535) {
            res.writeHead(400, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: false, erro: 'PORTA_IPC_INVALIDA' }));
            return;
          }
          const payloadIpc = Buffer.from(JSON.stringify(body), 'utf8');
          const reqIpc = http.request(
            {
              hostname: '127.0.0.1',
              port: portaIpc,
              path: '/steam-ipc',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Length': String(payloadIpc.length),
              },
              timeout: 1500,
            },
            (respIpc) => {
              const pedacosIpc = [];
              respIpc.on('data', (c) => pedacosIpc.push(c));
              respIpc.on('end', () => {
                const txtIpc = Buffer.concat(pedacosIpc).toString('utf8') || '{"ok":true}';
                res.writeHead(200, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
                res.end(txtIpc);
              });
            }
          );
          reqIpc.on('error', () => {
            res.writeHead(200, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: false, erro: 'IPC_LOOPBACK_INDISPONIVEL' }));
          });
          reqIpc.on('timeout', () => {
            reqIpc.destroy();
          });
          reqIpc.end(payloadIpc);
          return;
        }

        if (urlLimpa === '/api/sincronizar') {
          if (!body.estado || typeof body.estado !== 'object' || !body.estado.naveJogador || !body.estado.meta) {
            res.writeHead(400, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ erro: 'ESTADO_SINCRONIZACAO_INVALIDO' }));
            return;
          }
          estadoAtual = clonarProfundoCongelado(body.estado);
          if (body.contextoUi && typeof body.contextoUi === 'object') {
            contextoUiServidor = { ...contextoUiServidor, ...body.contextoUi };
          }
          if (opcoesPersistencia.persistirEmDisco === true) {
            if (estadoAtual.perfilJogador) {
              salvarPerfilDisco(estadoAtual.perfilJogador, opcoesPersistencia);
            }
            const faseSinc = estadoAtual.meta?.faseJogo;
            if (faseSinc && faseSinc !== 'INICIO') {
              salvarRunSaveDisco(estadoAtual, opcoesPersistencia);
            }
          }
          res.writeHead(200, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(
            JSON.stringify({
              ok: true,
              sincronizado: true,
              faseJogo: estadoAtual.meta?.faseJogo ?? 'COMBATE',
            })
          );
          return;
        }

        try {
          const resultadoMem = processarOperacaoMotorEmMemoria(urlLimpa, body);
          res.writeHead(resultadoMem.statusHttp, {
            ...cabecalhosSeguranca,
            'Content-Type': 'application/json; charset=utf-8',
          });
          res.end(JSON.stringify(resultadoMem.payload));
        } catch (err) {
          res.writeHead(400, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ erro: 'COMANDO_INVALIDO', detalhe: String(err.message) }));
        }
      });
      return;
    }

    res.writeHead(404, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ erro: 'ROTA_NAO_ENCONTRADA' }));
  });

  servidor.requestTimeout = 5000;
  servidor.headersTimeout = 5000;
  servidor.keepAliveTimeout = 1000;

  await new Promise((resolve) => servidor.listen(porta, host, resolve));
  const endereco = servidor.address();
  const portaAlocada = typeof endereco === 'object' && endereco ? endereco.port : porta;

  return {
    url: `http://${host}:${portaAlocada}`,
    port: portaAlocada,
    obterEstadoAtualDireto: () => estadoAtual,
    executarComandoDireto: (eventoInput, contextoUi) =>
      processarOperacaoMotorEmMemoria('/api/comando', { eventoInput, contextoUi }).payload,
    avancarTickDireto: (dtSeg = 0.25, pausaTaticaAtiva = false) =>
      processarOperacaoMotorEmMemoria('/api/tick', { dtSeg, pausaTaticaAtiva }).payload,
    fechar: () =>
      new Promise((resolve) => {
        servidor.closeAllConnections?.();
        servidor.close(() => resolve());
      }),
  };
}
