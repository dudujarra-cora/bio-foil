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
import { pathToFileURL } from 'node:url';
import { criarEstadoCampanhaCompleta } from '../src/onda6-ui/campanha-completa.mjs';
import { iniciarServidorClienteWebBiofoil } from '../src/onda6-ui/cliente-web.mjs';
import { obterDiretorioDadosPadraoBiofoil } from '../src/onda6-ui/persistencia-perfil.mjs';

function abrirNavegadorLoopbackSeguro(url) {
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/i.test(String(url ?? ''))) {
    return false;
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
    return true;
  } catch {
    return false;
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

  const navegadorDisparado =
    opcoes.abrirNavegador === true ? abrirNavegadorLoopbackSeguro(servidor.url) : false;

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
    faseInicial: estadoInicial.meta.faseJogo,
    temRunSalvaDisponivel: Boolean(estadoInicial.meta.temRunSalvaDisponivel),
    fechar: servidor.fechar,
  });
}

const ehExecucaoDiretaCli =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

if (ehExecucaoDiretaCli) {
  const args = process.argv.slice(2);
  const semNavegador = args.includes('--sem-navegador');
  const argPorta = args.find((a) => a.startsWith('--porta='));
  const argSeed = args.find((a) => a.startsWith('--seed='));
  const portaCli = argPorta ? Number(argPorta.split('=')[1]) : 4173;
  const seedCli = argSeed ? argSeed.split('=')[1] : undefined;

  iniciarJogoBiofoilCli({
    port: Number.isFinite(portaCli) ? portaCli : 4173,
    seedPartida: seedCli,
    abrirNavegador: !semNavegador,
  }).then((instancia) => {
    const encerrar = async () => {
      await instancia.fechar();
      process.exit(0);
    };
    process.on('SIGINT', encerrar);
    process.on('SIGTERM', encerrar);
  });
}
