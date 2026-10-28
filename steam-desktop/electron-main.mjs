/**
 * Bio-Foil — Wrapper Desktop Electron + Steamworks SDK (`steam-desktop/electron-main.mjs`)
 * Executa o jogo em janela nativa (Windows / macOS / SteamOS Linux `1280x800` & `1920x1080`)
 * com `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` e Steam Overlay ativo.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarEstadoCampanhaCompleta } from '../src/onda6-ui/campanha-completa.mjs';
import { iniciarServidorClienteWebBiofoil } from '../src/onda6-ui/cliente-web.mjs';
import { inicializarSteamworksHost, detectarAmbienteSteamDeck } from '../src/onda7-steam/steamworks-desktop-host.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function mesclarPerfisLocalECloud(perfilLocal, perfilCloud) {
  if (!perfilLocal) return perfilCloud;
  if (!perfilCloud) return perfilLocal;
  const maisRecente = Number(perfilCloud._cloudSyncMs ?? 0) >= Number(perfilLocal._cloudSyncMs ?? 0) ? perfilCloud : perfilLocal;
  const maisAntigo = maisRecente === perfilCloud ? perfilLocal : perfilCloud;
  const uniaoConq = [
    ...new Set([
      ...(Array.isArray(maisAntigo.conquistasSteamDesbloqueadas) ? maisAntigo.conquistasSteamDesbloqueadas : []),
      ...(Array.isArray(maisRecente.conquistasSteamDesbloqueadas) ? maisRecente.conquistasSteamDesbloqueadas : []),
    ]),
  ];
  const uniaoLayoutsB = [
    ...new Set([
      ...(Array.isArray(maisAntigo.layoutsTipoBDesbloqueados) ? maisAntigo.layoutsTipoBDesbloqueados : []),
      ...(Array.isArray(maisRecente.layoutsTipoBDesbloqueados) ? maisRecente.layoutsTipoBDesbloqueados : []),
    ]),
  ];
  const carcacasUnidas = {
    ...(maisAntigo.carcacasDesbloqueadas ?? {}),
    ...(maisRecente.carcacasDesbloqueadas ?? {}),
  };
  for (const k of Object.keys(carcacasUnidas)) {
    carcacasUnidas[k] = Boolean(maisAntigo.carcacasDesbloqueadas?.[k] || maisRecente.carcacasDesbloqueadas?.[k]);
  }
  return {
    ...maisAntigo,
    ...maisRecente,
    carcacasDesbloqueadas: carcacasUnidas,
    conquistasSteamDesbloqueadas: uniaoConq,
    layoutsTipoBDesbloqueados: uniaoLayoutsB,
  };
}

function sincronizarArquivosSaveComCloud(diretorioDados, hostSteam, direcao = 'PUSH') {
  if (!diretorioDados || !hostSteam) return;
  fs.mkdirSync(diretorioDados, { recursive: true });
  for (const nomeArq of ['profile.json', 'run_save.json']) {
    const caminhoLocal = path.join(diretorioDados, nomeArq);
    if (direcao === 'PULL') {
      const dadosCloud = hostSteam.lerArquivoCloud(nomeArq, null);
      if (dadosCloud && typeof dadosCloud === 'object') {
        const existeLocal = fs.existsSync(caminhoLocal);
        if (!existeLocal) {
          const tmp = `${caminhoLocal}.tmp.${process.pid}`;
          fs.writeFileSync(tmp, `${JSON.stringify(dadosCloud, null, 2)}\n`, 'utf8');
          fs.renameSync(tmp, caminhoLocal);
        } else if (nomeArq === 'profile.json') {
          try {
            const objLocal = JSON.parse(fs.readFileSync(caminhoLocal, 'utf8'));
            const mesclado = mesclarPerfisLocalECloud(objLocal, dadosCloud);
            const tmp = `${caminhoLocal}.tmp.${process.pid}`;
            fs.writeFileSync(tmp, `${JSON.stringify(mesclado, null, 2)}\n`, 'utf8');
            fs.renameSync(tmp, caminhoLocal);
          } catch {
            // mantém arquivo local íntegro
          }
        } else if (nomeArq === 'run_save.json') {
          try {
            const stLocal = fs.statSync(caminhoLocal);
            const objLocal = JSON.parse(fs.readFileSync(caminhoLocal, 'utf8'));
            const tsLocal = Number(objLocal?._cloudSyncMs ?? stLocal.mtimeMs ?? 0);
            const tsCloud = Number(dadosCloud._cloudSyncMs ?? 0);
            if (tsCloud > tsLocal && dadosCloud.naveJogador) {
              const tmp = `${caminhoLocal}.tmp.${process.pid}`;
              fs.writeFileSync(tmp, `${JSON.stringify(dadosCloud, null, 2)}\n`, 'utf8');
              fs.renameSync(tmp, caminhoLocal);
            }
          } catch {
            // mantém arquivo local íntegro
          }
        }
      }
    } else if (direcao === 'PUSH') {
      if (fs.existsSync(caminhoLocal)) {
        try {
          const obj = JSON.parse(fs.readFileSync(caminhoLocal, 'utf8'));
          hostSteam.salvarArquivoCloud(nomeArq, { ...obj, _cloudSyncMs: Date.now() });
        } catch {
          // arquivo em escrita parcial ignorado
        }
      } else if (nomeArq === 'run_save.json') {
        hostSteam.removerArquivoCloud('run_save.json');
      }
    }
  }
}

export async function construirConfiguracaoJanelaDesktopSteam(env = process.env, dimensoesDisplay = { width: 1920, height: 1080 }) {
  const deck = detectarAmbienteSteamDeck(env, dimensoesDisplay);
  return Object.freeze({
    title: 'BIO-FOIL — Tactical Hydrofoil Roguelike',
    width: deck.ehSteamDeck ? 1280 : 1600,
    height: deck.ehSteamDeck ? 800 : 900,
    minWidth: 960,
    minHeight: 540,
    fullscreen: deck.ehSteamDeck,
    autoHideMenuBar: true,
    backgroundColor: '#040a10',
    webPreferences: Object.freeze({
      preload: path.join(__dirname, 'electron-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    }),
  });
}

export async function iniciarAplicacaoElectronSteam(electronMod = null, opcoes = {}) {
  const hostSteam = await inicializarSteamworksHost(opcoes.opcoesSteamworks ?? {});
  const diag = hostSteam.obterDiagnosticoHost();
  const persistirBruto = opcoes.persistirEmDisco ?? opcoes.opcoesServidor?.persistirEmDisco;
  const persistirEmDisco = persistirBruto !== undefined ? Boolean(persistirBruto) : Boolean(electronMod);
  const diretorioDados =
    opcoes.diretorioDados ??
    opcoes.opcoesServidor?.diretorioDados ??
    (persistirEmDisco ? path.join(diag.pastaDados, 'save_data') : undefined);

  if (persistirEmDisco && diretorioDados) {
    sincronizarArquivosSaveComCloud(diretorioDados, hostSteam, 'PULL');
  }

  const estadoInicial = criarEstadoCampanhaCompleta({
    persistirEmDisco,
    diretorioDados,
    edicaoComercialSteam: true,
  });
  const servidorLocal = await iniciarServidorClienteWebBiofoil({
    porta: 0,
    host: '127.0.0.1',
    estadoInicial,
    modoCampanhaCompleta: true,
    persistirEmDisco,
    diretorioDados,
  });

  if (!electronMod) {
    return Object.freeze({
      modoHeadlessVerificacao: true,
      urlLocal: servidorLocal.url,
      hostSteam,
      executarComandoMotor: (eventoInput, contextoUi) => {
        const res = servidorLocal.executarComandoDireto(eventoInput, contextoUi);
        if (persistirEmDisco && diretorioDados) {
          sincronizarArquivosSaveComCloud(diretorioDados, hostSteam, 'PUSH');
        }
        return res;
      },
      avancarTickMotor: (dtSeg = 0.25, pausaTaticaAtiva = false) => {
        const res = servidorLocal.avancarTickDireto(dtSeg, pausaTaticaAtiva);
        if (persistirEmDisco && diretorioDados) {
          sincronizarArquivosSaveComCloud(diretorioDados, hostSteam, 'PUSH');
        }
        return res;
      },
      encerrar: async () => {
        if (persistirEmDisco && diretorioDados) {
          sincronizarArquivosSaveComCloud(diretorioDados, hostSteam, 'PUSH');
        }
        await servidorLocal.fechar();
      },
    });
  }

  const { app, BrowserWindow, ipcMain, screen } = electronMod;
  app.commandLine.appendSwitch('in-process-gpu'); // Necessário para renderizar Steam Overlay sobre Chromium

  await app.whenReady();
  const displayPrimario = screen.getPrimaryDisplay()?.workAreaSize ?? { width: 1920, height: 1080 };
  const cfgJanela = await construirConfiguracaoJanelaDesktopSteam(process.env, displayPrimario);
  const win = new BrowserWindow(cfgJanela);

  ipcMain.handle('biofoil:desbloquearConquista', (_ev, idAch, steamApiKey) =>
    hostSteam.desbloquearConquista(idAch, steamApiKey)
  );
  ipcMain.handle('biofoil:salvarConfiguracoes', (_ev, cfg) => hostSteam.salvarConfiguracoes(cfg));
  ipcMain.handle('biofoil:salvarCloud', (_ev, arq, dados) => hostSteam.salvarArquivoCloud(arq, dados));
  ipcMain.handle('biofoil:atualizarRichPresence', (_ev, ctx) => hostSteam.atualizarRichPresence(ctx));
  ipcMain.handle('biofoil:diagnosticoSteam', () => hostSteam.obterDiagnosticoHost());
  ipcMain.handle('biofoil:executarComandoMotor', (_ev, eventoInput, contextoUi) => {
    const res = servidorLocal.executarComandoDireto(eventoInput, contextoUi);
    if (persistirEmDisco && diretorioDados) {
      sincronizarArquivosSaveComCloud(diretorioDados, hostSteam, 'PUSH');
    }
    return res;
  });
  ipcMain.handle('biofoil:avancarTickMotor', (_ev, dtSeg, pausaTaticaAtiva) => {
    const res = servidorLocal.avancarTickDireto(dtSeg, pausaTaticaAtiva);
    if (persistirEmDisco && diretorioDados) {
      sincronizarArquivosSaveComCloud(diretorioDados, hostSteam, 'PUSH');
    }
    return res;
  });
  ipcMain.handle('biofoil:alternarTelaCheia', (_ev, flag) => {
    const novo = flag === undefined ? !win.isFullScreen() : Boolean(flag);
    win.setFullScreen(novo);
    return novo;
  });

  app.on('window-all-closed', async () => {
    if (persistirEmDisco && diretorioDados) {
      sincronizarArquivosSaveComCloud(diretorioDados, hostSteam, 'PUSH');
    }
    await servidorLocal.fechar();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  await win.loadURL(servidorLocal.url);
  return Object.freeze({ win, hostSteam, servidorLocal });
}

if (typeof process !== 'undefined' && process.versions?.electron && process.env.BIOFOIL_SKIP_AUTOBOOT !== '1') {
  import('electron')
    .then((mod) => iniciarAplicacaoElectronSteam(mod.default ?? mod, { persistirEmDisco: true }))
    .catch((err) => {
      process.stderr.write(`[BIO-FOIL ELECTRON BOOT ERROR] ${err?.stack || err}\n`);
      process.exitCode = 1;
    });
}
