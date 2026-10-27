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
import { clonarProfundoCongelado } from '../gdd-parser.mjs';
import { criarEstadoInicialPartida } from '../onda1-fisica/estado-inicial.mjs';
import { criarAlvoSetor1Canonico } from '../onda3-inimigos/ia-barco-monstro.mjs';
import { construirPlanoGrafoWebAudio } from './cues-audio.mjs';
import { construirPaisagemSonoraCompleta } from './audio-maritimo.mjs';
import {
  exportarAtlasHiBitsPngBuffer,
  exportarPacoteAssets60Fps,
} from './assets-hibit.mjs';
import {
  despacharComandoUi,
  obterMapaHitboxesNativo,
  avancarTickPartidaEmTempoReal,
} from './despacho-comandos.mjs';
import { traduzirInputDomParaComandoUi } from './tradutor-input-dom.mjs';
import {
  executarAcaoCampanhaCompleta,
  avancarTickCampanhaCompleta,
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

const CODIGO_BUNDLE_CLIENTE_JS = (() => {
  const blocoRaster = MODULOS_RASTER_PUROS_ORDENADOS.map((nome) =>
    limparSintaxeEsmParaEscopoBundle(MAPA_FONTES_ESM_PUROS[nome])
  ).join('\n\n');
  const blocoRuntime = MODULOS_RUNTIME_POS_BOOTSTRAP.map((nome) =>
    limparSintaxeEsmParaEscopoBundle(MAPA_FONTES_ESM_PUROS[nome])
  ).join('\n\n');

  return `(() => {
  'use strict';
  const __BIOFOIL_BUNDLE_IIFE = true;
${blocoRaster}

  const bootEl = typeof document !== 'undefined' ? document.getElementById('biofoil-bootstrap') : null;
  let estadoCliente = JSON.parse(bootEl ? bootEl.textContent || '{}' : '{}');

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
    modoOrdemAbordagem: false,
    salaAlvoAbordagemId: 1,
    ultimaSalaBeamClicadaId: null,
  };
  let seqAudioServidor = 0;

  const cabecalhosSeguranca = {
    'Content-Security-Policy':
      "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",
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

    if (urlLimpa.startsWith('/onda6-ui/')) {
      if (req.method !== 'GET') {
        res.writeHead(405, { ...cabecalhosSeguranca, Allow: 'GET', 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ erro: 'METODO_NAO_PERMITIDO' }));
        return;
      }
      const nomeModulo = urlLimpa.slice('/onda6-ui/'.length);
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
      urlLimpa === '/api/estado'
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

    if (urlLimpa === '/api/comando' || urlLimpa === '/api/tick') {
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

      let bytesRecebidos = 0;
      let abortadoPorTamanho = false;
      const pedacos = [];

      req.on('data', (chunk) => {
        if (abortadoPorTamanho) return;
        bytesRecebidos += chunk.length;
        if (bytesRecebidos > maxPayloadBytes) {
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

        const estadoAnterior = estadoAtual;
        let ultimoResultadoComando = null;
        let idHitboxHover = null;
        let acaoLocalUi = null;
        const usaCampanha = Boolean(modoCampanhaAtivo || estadoAtual.meta?.modoCampanhaCompleta);

        try {
          if (urlLimpa === '/api/tick') {
            if (
              body.dtSeg !== undefined &&
              (typeof body.dtSeg !== 'number' || !Number.isFinite(body.dtSeg) || body.dtSeg <= 0)
            ) {
              res.writeHead(400, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ erro: 'DT_SEG_INVALIDO' }));
              return;
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
            const traducao = traduzirInputDomParaComandoUi(
              body.eventoInput,
              estadoAtual,
              vmAntes,
              ctxEntrada
            );
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

            contextoUiServidor = {
              pausaTaticaAtiva:
                traducao.pausaTaticaAtiva !== undefined
                  ? traducao.pausaTaticaAtiva
                  : Boolean(ctxEntrada.pausaTaticaAtiva),
              slotArmaSelecionado:
                Number.isInteger(slotCand) && slotCand >= 0 && slotCand <= 3 ? slotCand : 0,
              tripulanteSelecionadoId: tripCand,
              modoOrdemAbordagem:
                traducao.modoOrdemAbordagem !== undefined
                  ? Boolean(traducao.modoOrdemAbordagem)
                  : Boolean(ctxEntrada.modoOrdemAbordagem),
              salaAlvoAbordagemId:
                Number.isInteger(salaAbCand) && salaAbCand >= 1 && salaAbCand <= 8 ? salaAbCand : 1,
              ultimaSalaBeamClicadaId: Number.isInteger(ultBeamCand) ? ultBeamCand : null,
            };

            if (traducao.acaoLocalUi === 'ACAO_CAMPANHA' && traducao.acaoCampanhaUi) {
              const resCamp = executarAcaoCampanhaCompleta(
                estadoAtual,
                traducao.acaoCampanhaUi,
                opcoesPersistencia
              );
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
            }
          } else {
            res.writeHead(400, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ erro: 'COMANDO_AUSENTE' }));
            return;
          }
        } catch (err) {
          res.writeHead(400, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ erro: 'COMANDO_INVALIDO', detalhe: String(err.message) }));
          return;
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
        res.writeHead(200, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
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
          })
        );
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
    fechar: () => new Promise((resolve) => servidor.close(() => resolve())),
  };
}
