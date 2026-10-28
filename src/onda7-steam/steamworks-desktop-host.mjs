/**
 * Bio-Foil — Edição Comercial Steam (Onda 7)
 * Módulo Host Desktop: Ponte Steamworks SDK (`steamworks.js`), Steam Cloud com escrita
 * atômica (`tmp -> rename`), Achievements Steam, Rich Presence, Steam Deck Detection e IPC.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOGO_24_CONQUISTAS_STEAM, criarConfiguracoesSteam } from './dificuldades-conquistas-opcoes.mjs';

export const STEAM_APP_ID_PADRAO = 2894510;

export function detectarAmbienteSteamDeck(env = process.env, dimensoesTela = null) {
  const flagSteamDeck = String(env?.SteamDeck ?? env?.STEAM_DECK ?? '') === '1';
  const eh1280x800 = Boolean(dimensoesTela && Number(dimensoesTela.width) === 1280 && Number(dimensoesTela.height) === 800);
  return Object.freeze({
    ehSteamDeck: flagSteamDeck || eh1280x800,
    flagSteamDeck,
    resolucao16x10Nativa: eh1280x800,
    escalaRecomendada: 'AUTO',
  });
}

function escreverJsonAtomico(caminhoAlvo, objetoDados) {
  fs.mkdirSync(path.dirname(caminhoAlvo), { recursive: true });
  const caminhoTmp = `${caminhoAlvo}.tmp.${process.pid}`;
  const payload = `${JSON.stringify(objetoDados, null, 2)}\n`;
  fs.writeFileSync(caminhoTmp, payload, 'utf8');
  fs.renameSync(caminhoTmp, caminhoAlvo);
}

function lerJsonSeguro(caminhoAlvo, fallback = null) {
  try {
    if (!fs.existsSync(caminhoAlvo)) return fallback;
    return JSON.parse(fs.readFileSync(caminhoAlvo, 'utf8'));
  } catch {
    return fallback;
  }
}

export function formatarRichPresenceSteam({ faseJogo = 'INICIO', setorNumero = 1, layoutId = 'CARCACA_ALFA_A', dificuldade = 'NORMAL', idioma = 'pt-BR' } = {}) {
  const f = String(faseJogo).toUpperCase();
  const s = Math.max(1, Math.min(8, Number(setorNumero) || 1));
  const en = idioma === 'en-US';
  if (f === 'INICIO') {
    return en ? 'In Hangar — Preparing Bio-Craft' : 'No Hangar — Preparando Bio-Nave';
  }
  if (f === 'FIM_DE_RUN') {
    return en ? `Expedition Complete — Sector ${s}/8` : `Expedição Encerrada — Setor ${s}/8`;
  }
  return en
    ? `Sector ${s}/8 — ${layoutId} (${dificuldade})`
    : `Setor ${s}/8 — ${layoutId} (${dificuldade})`;
}

/**
 * Inicializa a ponte Steamworks Desktop:
 * - Tenta carregar o cliente nativo `steamworks.js` caso o runtime Steam esteja presente;
 * - Mantém espelho local atômico (`steam_cloud/`, `settings.json`, `achievements.json`)
 *   para funcionamento 100% determinístico offline, no Steam Deck em modo avião e em CI!
 */
export async function inicializarSteamworksHost(opcoes = {}) {
  const appId = Number(opcoes.appId ?? STEAM_APP_ID_PADRAO);
  const pastaDados = opcoes.pastaDados
    ? path.resolve(opcoes.pastaDados)
    : path.join(os.homedir(), '.biofoil-steam');
  const pastaCloud = path.join(pastaDados, 'steam_cloud');
  fs.mkdirSync(pastaCloud, { recursive: true });

  let clienteNativo = opcoes.clienteSteamworksInjetado ?? null;
  let modoSdk = clienteNativo ? 'STEAMWORKS_NATIVO' : 'ESPELHO_LOCAL_OFFLINE';

  if (!clienteNativo && opcoes.tentarCarregarNativo !== false) {
    try {
      const mod = await import('steamworks.js');
      const fnInit = mod.init ?? mod.default?.init;
      if (typeof fnInit === 'function') {
        clienteNativo = fnInit(appId);
        modoSdk = 'STEAMWORKS_NATIVO';
      }
    } catch {
      modoSdk = 'ESPELHO_LOCAL_OFFLINE';
    }
  }

  const arqConquistas = path.join(pastaDados, 'achievements.json');
  const arqConfig = path.join(pastaDados, 'settings.json');
  const arqRichPresence = path.join(pastaDados, 'rich_presence.json');

  const estadoConquistas = new Set(lerJsonSeguro(arqConquistas, []));
  let configuracoesAtuais = criarConfiguracoesSteam(lerJsonSeguro(arqConfig, {}));
  let ultimoRichPresence = '';

  function desbloquearConquista(achievementId, steamApiKeyExplicita) {
    const meta = CATALOGO_24_CONQUISTAS_STEAM.find(
      (a) =>
        a.id === achievementId ||
        a.steamApiKey === achievementId ||
        (steamApiKeyExplicita && a.steamApiKey === steamApiKeyExplicita)
    );
    if (!meta) {
      return Object.freeze({ ok: false, motivo: 'CONQUISTA_INEXISTENTE', id: String(achievementId) });
    }
    const jaTinha = estadoConquistas.has(meta.id);
    estadoConquistas.add(meta.id);
    escreverJsonAtomico(arqConquistas, [...estadoConquistas]);

    const chaveSteamFinal = String(steamApiKeyExplicita || meta.steamApiKey);
    if (clienteNativo?.achievement?.activate) {
      try {
        clienteNativo.achievement.activate(chaveSteamFinal);
      } catch { /* fallback local ja persistido */ }
    }
    return Object.freeze({
      ok: true,
      id: meta.id,
      steamApiKey: chaveSteamFinal,
      recemDesbloqueada: !jaTinha,
      totalDesbloqueadas: estadoConquistas.size,
    });
  }

  function salvarArquivoCloud(nomeArquivo, dadosObj) {
    const nomeSeguro = path.basename(String(nomeArquivo || 'save.json'));
    const caminhoLocal = path.join(pastaCloud, nomeSeguro);
    escreverJsonAtomico(caminhoLocal, dadosObj);

    if (clienteNativo?.cloud?.writeFile) {
      try {
        clienteNativo.cloud.writeFile(nomeSeguro, JSON.stringify(dadosObj));
      } catch { /* espelho local garantido */ }
    }
    return Object.freeze({ ok: true, arquivo: nomeSeguro, bytes: fs.statSync(caminhoLocal).size });
  }

  function lerArquivoCloud(nomeArquivo, fallback = null) {
    const nomeSeguro = path.basename(String(nomeArquivo || 'save.json'));
    if (clienteNativo?.cloud?.isFileExisting && clienteNativo.cloud.isFileExisting(nomeSeguro)) {
      try {
        const txt = clienteNativo.cloud.readFile(nomeSeguro);
        return JSON.parse(txt);
      } catch { /* cai p/ espelho local */ }
    }
    return lerJsonSeguro(path.join(pastaCloud, nomeSeguro), fallback);
  }

  function removerArquivoCloud(nomeArquivo) {
    const nomeSeguro = path.basename(String(nomeArquivo || 'run_save.json'));
    const caminhoLocal = path.join(pastaCloud, nomeSeguro);
    if (fs.existsSync(caminhoLocal)) {
      fs.unlinkSync(caminhoLocal);
    }
    if (clienteNativo?.cloud?.deleteFile) {
      try { clienteNativo.cloud.deleteFile(nomeSeguro); } catch { /* noop */ }
    }
    return Object.freeze({ ok: true, removido: nomeSeguro });
  }

  function salvarConfiguracoes(parcial) {
    configuracoesAtuais = criarConfiguracoesSteam({ ...configuracoesAtuais, ...parcial });
    escreverJsonAtomico(arqConfig, configuracoesAtuais);
    salvarArquivoCloud('settings.json', configuracoesAtuais);
    return configuracoesAtuais;
  }

  function atualizarRichPresence(contexto) {
    ultimoRichPresence = formatarRichPresenceSteam(contexto);
    escreverJsonAtomico(arqRichPresence, { status: ultimoRichPresence });
    if (clienteNativo?.localplayer?.setRichPresence) {
      try {
        clienteNativo.localplayer.setRichPresence('steam_display', '#StatusGeneric');
        clienteNativo.localplayer.setRichPresence('status', ultimoRichPresence);
      } catch { /* noop */ }
    }
    return ultimoRichPresence;
  }

  function obterDiagnosticoHost() {
    return Object.freeze({
      appId,
      modoSdk,
      pastaDados,
      steamDeck: detectarAmbienteSteamDeck(opcoes.env ?? process.env, opcoes.dimensoesTela ?? null),
      totalConquistasDesbloqueadas: estadoConquistas.size,
      conquistasDesbloqueadas: Object.freeze([...estadoConquistas]),
      configuracoes: configuracoesAtuais,
      ultimoRichPresence,
    });
  }

  return Object.freeze({
    desbloquearConquista,
    salvarArquivoCloud,
    lerArquivoCloud,
    removerArquivoCloud,
    salvarConfiguracoes,
    atualizarRichPresence,
    obterDiagnosticoHost,
  });
}

/**
 * Compila (ou reutiliza em cache por mtime) o host nativo macOS `BioFoil.app` (`AppKit` + `WKWebView`)
 * a partir de `steam-desktop/macos-native/BioFoilNativeHost.swift`, eliminando 100% a abertura de abas
 * em navegadores externos como Safari/Chrome!
 */
export function compilarHostNativoMacOsBioFoil(opcoes = {}) {
  const dirModulo = path.dirname(fileURLToPath(import.meta.url));
  const raizProjeto = path.resolve(opcoes.raizProjeto ?? path.join(dirModulo, '..', '..'));
  const arqSwift = path.resolve(
    opcoes.caminhoFonteSwift ?? path.join(raizProjeto, 'steam-desktop', 'macos-native', 'BioFoilNativeHost.swift')
  );
  const pastaSaida = path.resolve(
    opcoes.pastaSaida ?? path.join(os.tmpdir(), 'biofoil-macos-native-cache')
  );
  const pastaApp = path.join(pastaSaida, 'BioFoil.app');
  const pastaContents = path.join(pastaApp, 'Contents');
  const pastaMacOs = path.join(pastaContents, 'MacOS');
  const binDestino = path.join(pastaMacOs, 'BioFoil');
  const plistDestino = path.join(pastaContents, 'Info.plist');
  const binSwiftc = opcoes.caminhoSwiftc ?? '/usr/bin/swiftc';

  if (process.platform !== 'darwin' || !fs.existsSync(binSwiftc) || !fs.existsSync(arqSwift)) {
    return Object.freeze({
      ok: false,
      suportado: false,
      motivo: process.platform !== 'darwin' ? 'PLATAFORMA_NAO_DARWIN' : 'SWIFTC_OU_FONTE_AUSENTE',
      caminhoExecutavel: null,
      pastaApp: null,
    });
  }

  fs.mkdirSync(pastaMacOs, { recursive: true });
  const plistXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    '<dict>',
    '  <key>CFBundleDisplayName</key><string>Bio-Foil</string>',
    '  <key>CFBundleExecutable</key><string>BioFoil</string>',
    '  <key>CFBundleIdentifier</key><string>com.biofoil.roguelike</string>',
    '  <key>CFBundleName</key><string>Bio-Foil</string>',
    '  <key>CFBundlePackageType</key><string>APPL</string>',
    '  <key>CFBundleShortVersionString</key><string>1.0.0</string>',
    '  <key>CFBundleVersion</key><string>100</string>',
    '  <key>LSMinimumSystemVersion</key><string>13.0</string>',
    '  <key>NSHighResolutionCapable</key><true/>',
    '</dict>',
    '</plist>',
    '',
  ].join('\n');
  fs.writeFileSync(plistDestino, plistXml, 'utf8');

  const stFonte = fs.statSync(arqSwift);
  if (fs.existsSync(binDestino) && opcoes.forcarRecompilar !== true) {
    const stBin = fs.statSync(binDestino);
    if (stBin.size > 4096 && stBin.mtimeMs >= stFonte.mtimeMs) {
      return Object.freeze({
        ok: true,
        suportado: true,
        reutilizadoCache: true,
        caminhoExecutavel: binDestino,
        pastaApp,
        tamanhoBytes: stBin.size,
      });
    }
  }

  const resComp = spawnSync(
    binSwiftc,
    ['-O', arqSwift, '-framework', 'AppKit', '-framework', 'WebKit', '-o', binDestino],
    { encoding: 'utf8', timeout: 45000 }
  );
  if (resComp.status !== 0 || !fs.existsSync(binDestino)) {
    return Object.freeze({
      ok: false,
      suportado: true,
      motivo: 'FALHA_COMPILACAO_SWIFTC',
      detalhe: String(resComp.stderr || resComp.stdout || '').slice(0, 400),
      caminhoExecutavel: null,
      pastaApp: null,
    });
  }
  try {
    fs.chmodSync(binDestino, 0o755);
  } catch { /* noop */ }
  const stNovo = fs.statSync(binDestino);
  return Object.freeze({
    ok: true,
    suportado: true,
    reutilizadoCache: false,
    caminhoExecutavel: binDestino,
    pastaApp,
    tamanhoBytes: stNovo.size,
  });
}

/**
 * Resolve ou compila sob demanda o binário nativo de janela Desktop para macOS (`BioFoil.app`),
 * Windows (`bio-foil-steam.exe` / `electron.exe` / `BioFoilWindowsHost.cs` via `csc.exe`) ou
 * Linux / SteamOS (`bio-foil-steam` / `electron` / `biofoil_linux_host.c` via `cc` + `webkit2gtk`),
 * sem NUNCA recorrer a abas de navegador externo!
 */
export function resolverHostDesktopNativoMultiplataforma(opcoes = {}) {
  const dirModulo = path.dirname(fileURLToPath(import.meta.url));
  const raizProjeto = path.resolve(opcoes.raizProjeto ?? path.join(dirModulo, '..', '..'));
  const plataforma = String(opcoes.plataforma ?? process.platform);
  const pastaCache = path.resolve(
    opcoes.pastaCache ?? path.join(os.tmpdir(), 'biofoil-desktop-native-cache')
  );

  if (plataforma === 'darwin') {
    const resMac = compilarHostNativoMacOsBioFoil({
      raizProjeto,
      pastaSaida: pastaCache,
      forcarRecompilar: Boolean(opcoes.forcarRecompilar),
    });
    if (resMac.ok && resMac.caminhoExecutavel) {
      return Object.freeze({
        ok: true,
        plataforma,
        tipoHost: 'JANELA_NATIVA_MACOS_APP',
        caminhoExecutavel: resMac.caminhoExecutavel,
        argumentos: Object.freeze([]),
      });
    }
  }

  if (plataforma === 'win32') {
    const candsWin = [
      { tipo: 'TAURI_WIN32_EXE', bin: path.join(raizProjeto, 'bio-foil-steam.exe'), args: [] },
      { tipo: 'TAURI_WIN32_EXE', bin: path.join(raizProjeto, 'steam-desktop', 'src-tauri', 'target', 'release', 'bio-foil-steam.exe'), args: [] },
      { tipo: 'ELECTRON_WIN32_EXE', bin: path.join(raizProjeto, 'runtime', 'electron', 'electron.exe'), args: [path.join(raizProjeto, 'steam-desktop', 'electron-main.mjs')] },
    ];
    for (const c of candsWin) {
      if (fs.existsSync(c.bin)) {
        return Object.freeze({ ok: true, plataforma, tipoHost: c.tipo, caminhoExecutavel: c.bin, argumentos: Object.freeze(c.args) });
      }
    }
    const arqCs = path.join(raizProjeto, 'steam-desktop', 'windows-native', 'BioFoilWindowsHost.cs');
    const raizWin = String(process.env.SystemRoot ?? process.env.WINDIR ?? 'Windows');
    const cscPadrao = path.join(raizWin, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe');
    const exeOut = path.join(pastaCache, 'BioFoilWindowsHost.exe');
    if (fs.existsSync(arqCs) && fs.existsSync(cscPadrao)) {
      fs.mkdirSync(pastaCache, { recursive: true });
      if (!fs.existsSync(exeOut)) {
        spawnSync(
          cscPadrao,
          [
            '/target:winexe',
            '/nologo',
            '/r:System.dll',
            '/r:System.Drawing.dll',
            '/r:System.Windows.Forms.dll',
            `/out:${exeOut}`,
            arqCs,
          ],
          { encoding: 'utf8', timeout: 30000 }
        );
      }
      if (fs.existsSync(exeOut)) {
        return Object.freeze({ ok: true, plataforma, tipoHost: 'WIN32_CSHARP_WEBVIEW', caminhoExecutavel: exeOut, argumentos: Object.freeze([]) });
      }
    }
  }

  if (plataforma === 'linux') {
    const candsLin = [
      { tipo: 'TAURI_LINUX_BIN', bin: path.join(raizProjeto, 'bio-foil-steam'), args: [] },
      { tipo: 'TAURI_LINUX_BIN', bin: path.join(raizProjeto, 'steam-desktop', 'src-tauri', 'target', 'release', 'bio-foil-steam'), args: [] },
      { tipo: 'ELECTRON_LINUX_BIN', bin: path.join(raizProjeto, 'runtime', 'electron', 'electron'), args: [path.join(raizProjeto, 'steam-desktop', 'electron-main.mjs')] },
    ];
    for (const c of candsLin) {
      if (fs.existsSync(c.bin)) {
        return Object.freeze({ ok: true, plataforma, tipoHost: c.tipo, caminhoExecutavel: c.bin, argumentos: Object.freeze(c.args) });
      }
    }
    const arqC = path.join(raizProjeto, 'steam-desktop', 'linux-native', 'biofoil_linux_host.c');
    const binLinOut = path.join(pastaCache, 'biofoil-linux-host');
    if (fs.existsSync(arqC)) {
      fs.mkdirSync(pastaCache, { recursive: true });
      if (!fs.existsSync(binLinOut)) {
        spawnSync(
          'sh',
          ['-c', `cc -O2 "${arqC}" $(pkg-config --cflags --libs gtk+-3.0 webkit2gtk-4.1 2>/dev/null || pkg-config --cflags --libs gtk+-3.0 webkit2gtk-4.0) -ldl -o "${binLinOut}"`],
          { encoding: 'utf8', timeout: 30000 }
        );
      }
      if (fs.existsSync(binLinOut)) {
        return Object.freeze({ ok: true, plataforma, tipoHost: 'LINUX_WEBKITGTK_NATIVO', caminhoExecutavel: binLinOut, argumentos: Object.freeze([]) });
      }
    }
  }

  return Object.freeze({
    ok: false,
    plataforma,
    tipoHost: 'HOST_NATIVO_INDISPONIVEL',
    caminhoExecutavel: null,
    argumentos: Object.freeze([]),
    fontesDisponiveis: Object.freeze({
      macosSwift: fs.existsSync(path.join(raizProjeto, 'steam-desktop', 'macos-native', 'BioFoilNativeHost.swift')),
      windowsCSharp: fs.existsSync(path.join(raizProjeto, 'steam-desktop', 'windows-native', 'BioFoilWindowsHost.cs')),
      linuxWebKitGtkC: fs.existsSync(path.join(raizProjeto, 'steam-desktop', 'linux-native', 'biofoil_linux_host.c')),
      tauriRust: fs.existsSync(path.join(raizProjeto, 'steam-desktop', 'src-tauri', 'src', 'main.rs')),
    }),
  });
}

/**
 * Monta o diretório autocontido de staging do Depot SteamPipe (`empacotarDepotSteamAutocontido`),
 * copiando `src/`, `assets/`, `steam-desktop/`, `scripts/jogar-biofoil.mjs`, `package.json`, `GDD.md`,
 * gerando `BioFoil.app` nativo em macOS + inicializadores executáveis multiplataforma (`BioFoil.bat`,
 * `BioFoil.command`, `BioFoil.sh`) e gravando `depot_manifest.json` verificável.
 */
export function empacotarDepotSteamAutocontido(opcoes = {}) {
  const raizProjeto = path.resolve(opcoes.raizProjeto ?? opcoes.diretorioRaiz ?? process.cwd());
  const pastaDestino = path.resolve(
    opcoes.pastaDestino ?? opcoes.diretorioSaida ?? path.join(raizProjeto, 'steam-desktop', 'output', 'depot-stage')
  );
  const appId = Number(opcoes.appId ?? process.env.BIOFOIL_STEAM_APP_ID ?? 2894510);
  fs.mkdirSync(pastaDestino, { recursive: true });

  const copiarRecursivo = (orig, dest) => {
    const st = fs.statSync(orig);
    if (st.isDirectory()) {
      const base = path.basename(orig);
      if (base === 'output' || base === 'target' || base === 'node_modules' || base.startsWith('.git')) return 0;
      fs.mkdirSync(dest, { recursive: true });
      let cont = 0;
      for (const item of fs.readdirSync(orig)) {
        if (item === '.DS_Store' || item.endsWith('.test.mjs') || item.includes('.tmp')) continue;
        cont += copiarRecursivo(path.join(orig, item), path.join(dest, item));
      }
      return cont;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(orig, dest);
    return 1;
  };

  let totalArquivosCopiados = 0;
  for (const rel of ['src', 'assets', 'steam-desktop', 'package.json', 'GDD.md', path.join('scripts', 'jogar-biofoil.mjs')]) {
    const absOrig = path.join(raizProjeto, rel);
    if (fs.existsSync(absOrig)) {
      totalArquivosCopiados += copiarRecursivo(absOrig, path.join(pastaDestino, rel));
    }
  }

  const shUnix = [
    '#!/usr/bin/env sh',
    'set -eu',
    'DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"',
    'if [ -x "$DIR/BioFoil.app/Contents/MacOS/BioFoil" ]; then',
    '  BIOFOIL_ROOT_DIR="$DIR" exec "$DIR/BioFoil.app/Contents/MacOS/BioFoil"',
    'elif [ -x "$DIR/bio-foil-steam" ]; then',
    '  BIOFOIL_ROOT_DIR="$DIR" exec "$DIR/bio-foil-steam"',
    'elif [ -x "$DIR/runtime/electron/electron" ]; then',
    '  exec "$DIR/runtime/electron/electron" "$DIR/steam-desktop/electron-main.mjs"',
    'elif [ -x "$DIR/runtime/node/bin/node" ]; then',
    '  exec "$DIR/runtime/node/bin/node" "$DIR/scripts/jogar-biofoil.mjs" --steam-desktop',
    'else',
    '  exec node "$DIR/scripts/jogar-biofoil.mjs" --steam-desktop',
    'fi',
    '',
  ].join('\n');
  const batWin = [
    '@echo off',
    'set "DIR=%~dp0"',
    'if exist "%DIR%bio-foil-steam.exe" (',
    '  "%DIR%bio-foil-steam.exe"',
    ') else if exist "%DIR%runtime\\electron\\electron.exe" (',
    '  "%DIR%runtime\\electron\\electron.exe" "%DIR%steam-desktop\\electron-main.mjs"',
    ') else if exist "%DIR%runtime\\node\\node.exe" (',
    '  "%DIR%runtime\\node\\node.exe" "%DIR%scripts\\jogar-biofoil.mjs" --steam-desktop',
    ') else (',
    '  node "%DIR%scripts\\jogar-biofoil.mjs" --steam-desktop',
    ')',
    '',
  ].join('\r\n');

  const arqSh = path.join(pastaDestino, 'BioFoil.sh');
  const arqCmdMac = path.join(pastaDestino, 'BioFoil.command');
  const arqBat = path.join(pastaDestino, 'BioFoil.bat');
  fs.writeFileSync(arqSh, shUnix, { encoding: 'utf8', mode: 0o755 });
  fs.writeFileSync(arqCmdMac, shUnix, { encoding: 'utf8', mode: 0o755 });
  fs.writeFileSync(arqBat, batWin, 'utf8');
  fs.writeFileSync(path.join(pastaDestino, 'steam_appid.txt'), `${appId}\n`, 'utf8');

  let binarioRuntimeEmpacotado = false;
  let caminhoBinarioRuntime = null;
  if (opcoes.incluirRuntimeNode !== false) {
    const execOrig = opcoes.caminhoBinarioNode ?? process.execPath;
    if (execOrig && fs.existsSync(execOrig)) {
      const ehWin = process.platform === 'win32' || String(execOrig).toLowerCase().endsWith('.exe');
      const relRuntime = ehWin ? path.join('runtime', 'node', 'node.exe') : path.join('runtime', 'node', 'bin', 'node');
      const destRuntime = path.join(pastaDestino, relRuntime);
      fs.mkdirSync(path.dirname(destRuntime), { recursive: true });
      if (fs.existsSync(destRuntime)) {
        fs.unlinkSync(destRuntime);
      }
      try {
        fs.linkSync(execOrig, destRuntime);
      } catch {
        fs.copyFileSync(execOrig, destRuntime);
      }
      if (!ehWin) {
        try {
          fs.chmodSync(destRuntime, 0o755);
        } catch {
          // filesystem sem chmod POSIX
        }
      }
      binarioRuntimeEmpacotado = true;
      caminhoBinarioRuntime = relRuntime;
      totalArquivosCopiados += 1;
    }
  }

  let appNativoMacGerado = false;
  let caminhoAppNativoMac = null;
  if (opcoes.compilarHostNativoMac !== false && process.platform === 'darwin') {
    const resMac = compilarHostNativoMacOsBioFoil({
      raizProjeto,
      pastaSaida: pastaDestino,
    });
    if (resMac.ok) {
      appNativoMacGerado = true;
      caminhoAppNativoMac = path.join('BioFoil.app', 'Contents', 'MacOS', 'BioFoil');
      totalArquivosCopiados += 2;
    }
  }

  const manifesto = Object.freeze({
    ok: true,
    produto: 'Bio-Foil — Tactical Hydrofoil Roguelike',
    appId,
    pastaDestino,
    totalArquivosCopiados: totalArquivosCopiados + 4,
    launchersGerados: Object.freeze(['BioFoil.bat', 'BioFoil.command', 'BioFoil.sh']),
    suportaRuntimeEmbutido: true,
    possuiBinarioExecutavelAutocontido: binarioRuntimeEmpacotado,
    caminhoBinarioRuntime,
    possuiAppNativoMacOs: appNativoMacGerado,
    caminhoAppNativoMacOs: caminhoAppNativoMac,
  });
  escreverJsonAtomico(path.join(pastaDestino, 'depot_manifest.json'), manifesto);
  return manifesto;
}
