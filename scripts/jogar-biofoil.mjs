#!/usr/bin/env node
/**
 * ONDA 6 — Launcher CLI Oficial da Campanha Jogável Completa (`npm start`)
 * Dono Único (Lei N5): scripts/jogar-biofoil.mjs
 *
 * Sobe o servidor loopback seguro (`127.0.0.1`) da edição completa do BIO-FOIL (60 FPS Hi-Bit,
 * Hangar de 5 Bio-Naves, Setores 1..8, Oficina de 10 Árvores + Porão 0 kg, Saque, Draga 3 Fases,
 * Áudio Marítimo Procedural Multicamada + Filtro 400 Hz e Persistência Atômica `profile.json` / Permadeath `run_save.json`).
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { criarEstadoCampanhaCompleta } from '../src/onda6-ui/campanha-completa.mjs';
import { iniciarServidorClienteWebBiofoil } from '../src/onda6-ui/cliente-web.mjs';
import { obterDiretorioDadosPadraoBiofoil } from '../src/onda6-ui/persistencia-perfil.mjs';
import { resolverHostDesktopNativoMultiplataforma } from '../src/onda7-steam/steamworks-desktop-host.mjs';

const RAIZ_PROJETO_CLI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function abrirJanelaNativaOuNavegadorSeguro(url, opcoesJanela = {}) {
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/i.test(String(url ?? ''))) {
    return { disparado: false, modoJanela: 'NENHUM' };
  }
  const modoDesktopEstrito = Boolean(opcoesJanela.modoDesktopEstrito);
  if (opcoesJanela.forcarNavegadorWeb !== true) {
    try {
      const pastaHostCache = path.join(
        String(opcoesJanela.diretorioDados ?? obterDiretorioDadosPadraoBiofoil()),
        'native-host'
      );
      const resHost = resolverHostDesktopNativoMultiplataforma({
        raizProjeto: RAIZ_PROJETO_CLI,
        pastaCache: pastaHostCache,
      });
      if (resHost.ok && resHost.caminhoExecutavel) {
        const filhoApp = spawn(resHost.caminhoExecutavel, [...(resHost.argumentos ?? [])], {
          detached: true,
          stdio: 'ignore',
          env: {
            ...process.env,
            BIOFOIL_ENGINE_URL: url,
            BIOFOIL_ROOT_DIR: RAIZ_PROJETO_CLI,
          },
        });
        filhoApp.on('error', () => {});
        filhoApp.unref();
        return { disparado: true, modoJanela: resHost.tipoHost };
      }
    } catch {
      if (modoDesktopEstrito) {
        return { disparado: false, modoJanela: 'HOST_NATIVO_INDISPONIVEL' };
      }
    }
  }
  if (modoDesktopEstrito) {
    return { disparado: false, modoJanela: 'HOST_NATIVO_INDISPONIVEL' };
  }
  try {
    const cmd =
      process.platform === 'darwin'
        ? 'open'
        : process.platform === 'win32'
          ? 'explorer.exe'
          : 'xdg-open';
    const filho = spawn(cmd, [url], { detached: true, stdio: 'ignore' });
    filho.on('error', () => {});
    filho.unref();
    return { disparado: true, modoJanela: 'NAVEGADOR_SISTEMA_FALLBACK' };
  } catch {
    return { disparado: false, modoJanela: 'ERRO_ABERTURA' };
  }
}

/**
 * Inicia programaticamente ou via CLI a campanha jogável completa do BIO-FOIL no navegador.
 */
export async function iniciarJogoBiofoilCli(opcoes = {}) {
  const host = String(opcoes.host ?? '127.0.0.1');
  const port = Number(opcoes.port ?? 4173);
  const persistirEmDisco = opcoes.persistirEmDisco !== false;
  const diretorioDados = String(opcoes.diretorioDados ?? obterDiretorioDadosPadraoBiofoil());
  const seedPartida = String(opcoes.seedPartida ?? `biofoil-${Date.now().toString(36)}`);
  const idArquitetura = String(opcoes.idArquitetura ?? 'CARCACA_ALFA');
  const faseInicial = String(opcoes.faseInicial ?? 'INICIO');

  const estadoInicial = criarEstadoCampanhaCompleta({
    persistirEmDisco,
    diretorioDados,
    seedPartida,
    idArquitetura,
    faseInicial,
    edicaoComercialSteam: opcoes.edicaoComercialSteam !== false,
  });

  const servidor = await iniciarServidorClienteWebBiofoil({
    host,
    port,
    estadoInicial,
    modoCampanhaCompleta: true,
    persistirEmDisco,
    diretorioDados,
    titulo: 'BIO-FOIL — Edição Completa 60 FPS Hi-Bit',
  });

  const infoJanela =
    opcoes.abrirNavegador === true
      ? abrirJanelaNativaOuNavegadorSeguro(servidor.url, {
          diretorioDados,
          forcarNavegadorWeb: Boolean(opcoes.forcarNavegadorWeb),
          modoDesktopEstrito: Boolean(opcoes.modoDesktopEstrito),
        })
      : { disparado: false, modoJanela: 'HEADLESS' };
  const navegadorDisparado = infoJanela.disparado;

  if (opcoes.silencioso !== true) {
    console.log('==============================================================');
    console.log(' BIO-FOIL — TACTICAL HYDROFOIL ROGUELIKE (60 FPS HI-BIT)');
    console.log(` Servidor ativo em: ${servidor.url}`);
    console.log(` Persistência (profile.json / run_save.json): ${diretorioDados}`);
    console.log(' Controles: [1..4] Armas | [A] Auto/Manual | [X] Salva | [G] Abordar');
    console.log('            [U] Oficina | [M] Mergulho | [D/V] Dreno | [Espaço] Pausa');
    console.log('==============================================================');
  }

  return Object.freeze({
    ok: true,
    url: servidor.url,
    port: servidor.port,
    diretorioDados,
    navegadorDisparado,
    modoJanela: infoJanela.modoJanela,
    faseInicial: estadoInicial.meta.faseJogo,
    temRunSalvaDisponivel: Boolean(estadoInicial.meta.temRunSalvaDisponivel),
    fechar: servidor.fechar,
  });
}

const ehExecucaoDiretaCli =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

if (ehExecucaoDiretaCli) {
  const args = process.argv.slice(2);
  const semNavegador = args.includes('--sem-navegador') || args.includes('--sem-abrir');
  const forcarNavegadorWeb = args.includes('--navegador-web');
  const modoDesktopEstrito = args.includes('--steam-desktop');
  const idxPortaFlag = args.indexOf('--porta');
  const argPortaIgual = args.find((a) => a.startsWith('--porta='));
  const argSeed = args.find((a) => a.startsWith('--seed='));
  const portaCli = argPortaIgual
    ? Number(argPortaIgual.split('=')[1])
    : idxPortaFlag >= 0 && args[idxPortaFlag + 1]
      ? Number(args[idxPortaFlag + 1])
      : 4173;
  const seedCli = argSeed ? argSeed.split('=')[1] : undefined;

  iniciarJogoBiofoilCli({
    port: Number.isFinite(portaCli) ? portaCli : 4173,
    seedPartida: seedCli,
    abrirNavegador: !semNavegador,
    forcarNavegadorWeb,
    modoDesktopEstrito,
  }).then((instancia) => {
    const encerrar = async () => {
      await instancia.fechar();
      process.exit(0);
    };
    process.on('SIGINT', encerrar);
    process.on('SIGTERM', encerrar);
  });
}
