/**
 * Bio-Foil — Estúdio de Modelagem Física Acústica & Síntese Analógica Multi-Seção (.ogg Vorbis 44.1 kHz Estéreo)
 * Combina:
 * - Cordas dedilhadas por guia de onda física Karplus-Strong acoplada + caixa de ressonância de madeira;
 * - Piano elétrico Fender Rhodes (tine inarmônica f*7.1 + tonebar saturada), Violoncelo friccionado com filtro de tampo
 *   em 2 polos acoplados (grave + banda média de abeto) e Polissintetizador Analógico com Filtro Ladder 4-polos em cascata;
 * - Ressonadores modais de placa de Bessel (anteparas de aço sob pressão hidrostática, sinos de forja e peles acústicas);
 * - Física real de nuvens de bolhas de Minnaert (f_0 = 3.26 / r_m com chirp ascendente de Laplace) + Reverb Estéreo FDN/Schroeder;
 * - Codificação nativa Ogg Vorbis 44.1 kHz Estéreo (`-c:a vorbis -ar 44100`) dos 57 arquivos `.ogg` (23 músicas + 8 biomas + 26 foleys).
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  MANIFESTO_TRILHAS_OGG_STEAM,
  MANIFESTO_FOLEY_OGG_STEAM,
} from '../src/onda7-steam/motor-audio-ogg-foley.mjs';

const TAXA_AMOSTRAGEM = 44100;

function resolverBinarioSistema(candidatos) {
  for (const cand of candidatos) {
    if (!cand.includes('/') || fs.existsSync(cand)) {
      return cand;
    }
  }
  return candidatos[candidatos.length - 1];
}

function codificarWav24BitParaOgg(caminhoWav, caminhoSaidaOgg, ffmpegBin = '/opt/homebrew/bin/ffmpeg') {
  fs.mkdirSync(path.dirname(caminhoSaidaOgg), { recursive: true });
  const bin = fs.existsSync(ffmpegBin) ? ffmpegBin : 'ffmpeg';
  const res = spawnSync(
    bin,
    [
      '-nostdin',
      '-loglevel', 'error',
      '-y',
      '-i', caminhoWav,
      '-ar', String(TAXA_AMOSTRAGEM),
      '-ac', '2',
      '-strict', '-2',
      '-c:a', 'vorbis',
      '-q:a', '6',
      caminhoSaidaOgg,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'], timeout: 60000 }
  );
  if (res.error) {
    throw new Error(`Erro ao executar ffmpeg em ${caminhoSaidaOgg}: ${res.error.message}`);
  }
  if (res.status !== 0) {
    throw new Error(`Falha ao codificar WAV C++20 ${caminhoSaidaOgg}: ${res.stderr?.toString() ?? res.status}`);
  }
  return fs.statSync(caminhoSaidaOgg).size;
}

function renderizarTrilhasMusicaisCpp20ParaOgg(diretorioDestino, ffmpegBin = '/opt/homebrew/bin/ffmpeg') {
  const raizRepo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const pastaAudioCpp = path.join(raizRepo, 'steam-desktop', 'audio-cpp');
  if (!fs.existsSync(path.join(pastaAudioCpp, 'CMakeLists.txt'))) {
    return null;
  }

  const cmakeBin = resolverBinarioSistema(['/opt/homebrew/bin/cmake', '/usr/local/bin/cmake', 'cmake']);
  const ninjaBin = resolverBinarioSistema(['/opt/homebrew/bin/ninja', '/usr/local/bin/ninja', 'ninja']);
  const dirBuildCpp = path.join(os.tmpdir(), 'biofoil-audio-forge-cpp20');
  const binForge = path.join(dirBuildCpp, process.platform === 'win32' ? 'biofoil_forge_cli.exe' : 'biofoil_forge_cli');

  if (!fs.existsSync(binForge)) {
    fs.mkdirSync(dirBuildCpp, { recursive: true });
    const cfg = spawnSync(
      cmakeBin,
      ['-S', pastaAudioCpp, '-B', dirBuildCpp, '-G', 'Ninja', `-DCMAKE_MAKE_PROGRAM=${ninjaBin}`, '-DCMAKE_BUILD_TYPE=Release'],
      { stdio: ['ignore', 'ignore', 'pipe'], timeout: 120000 }
    );
    if (cfg.status !== 0) {
      return null;
    }
    const bld = spawnSync(
      cmakeBin,
      ['--build', dirBuildCpp, '--target', 'biofoil_forge_cli'],
      { stdio: ['ignore', 'ignore', 'pipe'], timeout: 180000 }
    );
    if (bld.status !== 0 || !fs.existsSync(binForge)) {
      return null;
    }
  }

  const dirWavTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'biofoil-cpp20-wav-'));
  try {
    const execForge = spawnSync(binForge, ['--steam-tracks', dirWavTmp], {
      stdio: ['ignore', 'ignore', 'pipe'],
      timeout: 300000,
    });
    if (execForge.status !== 0) {
      throw new Error(`Falha em biofoil_forge_cli --steam-tracks: ${execForge.stderr?.toString() ?? execForge.status}`);
    }

    const geradasCpp = new Map();
    for (const [id, meta] of Object.entries(MANIFESTO_TRILHAS_OGG_STEAM)) {
      if (id.startsWith('AMBIENCIA_')) continue;
      const wavPath = path.join(dirWavTmp, `${id}.wav`);
      if (!fs.existsSync(wavPath)) {
        throw new Error(`WAV C++20 ausente para trilha ${id}: ${wavPath}`);
      }
      const outPath = path.join(diretorioDestino, meta.arquivo);
      const bytes = codificarWav24BitParaOgg(wavPath, outPath, ffmpegBin);
      geradasCpp.set(id, bytes);
    }
    return geradasCpp;
  } finally {
    fs.rmSync(dirWavTmp, { recursive: true, force: true });
  }
}

function midiParaHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function prng(seed) {
  let s = (seed | 0) || 1234567;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296) * 2 - 1;
  };
}

function codificarPcmStereoParaOgg(floatEsq, floatDir, caminhoSaidaOgg, ffmpegBin = '/opt/homebrew/bin/ffmpeg') {
  const n = floatEsq.length;
  const pcm16 = Buffer.allocUnsafe(n * 4);
  for (let i = 0; i < n; i += 1) {
    // Soft-clipping tangente hiperbólica p/ headroom limpo sem distorção digital
    const l = Math.tanh(floatEsq[i] * 0.92);
    const r = Math.tanh(floatDir[i] * 0.92);
    pcm16.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(l * 31500))), i * 4);
    pcm16.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(r * 31500))), i * 4 + 2);
  }

  fs.mkdirSync(path.dirname(caminhoSaidaOgg), { recursive: true });
  const bin = fs.existsSync(ffmpegBin) ? ffmpegBin : 'ffmpeg';
  const tmpPcm = `${caminhoSaidaOgg}.tmp.${process.pid}.${Math.random().toString(36).slice(2, 8)}.pcm`;
  fs.writeFileSync(tmpPcm, pcm16);
  let res;
  try {
    res = spawnSync(
      bin,
      [
        '-nostdin',
        '-loglevel', 'error',
        '-y',
        '-f', 's16le',
        '-ar', String(TAXA_AMOSTRAGEM),
        '-ac', '2',
        '-i', tmpPcm,
        '-strict', '-2',
        '-c:a', 'vorbis',
        '-q:a', '6',
        caminhoSaidaOgg,
      ],
      { stdio: ['ignore', 'ignore', 'pipe'], timeout: 30000 }
    );
  } finally {
    try {
      fs.unlinkSync(tmpPcm);
    } catch {
      // ignora se ja removido
    }
  }
  if (res.error) {
    throw new Error(`Erro ao executar ffmpeg em ${caminhoSaidaOgg}: ${res.error.message}`);
  }
  if (res.status !== 0) {
    throw new Error(`Falha ao codificar ${caminhoSaidaOgg}: ${res.stderr?.toString() ?? res.status}`);
  }
  return fs.statSync(caminhoSaidaOgg).size;
}

/**
 * Aplica reverberador estéreo de Schroeder (4 filtros comb realimentados em paralelo + 2 difusores all-pass em série)
 * com cauda circular contínua quando `loopContinuo === true` (zero corte abrupto na virada do compasso!).
 */
function aplicarReverbSchroederEstereo(esq, dir, mixUmido = 0.22, decaimento = 0.76, loopContinuo = true) {
  const n = esq.length;
  if (n < 2048 || mixUmido <= 0) return;
  const atrasosCombL = [1311, 1637, 1813, 1931];
  const atrasosCombR = [1361, 1693, 1861, 1997];
  const atrasosApL = [223, 79];
  const atrasosApR = [251, 97];

  const bufsCL = atrasosCombL.map((d) => new Float32Array(d));
  const bufsCR = atrasosCombR.map((d) => new Float32Array(d));
  const idxCL = [0, 0, 0, 0];
  const idxCR = [0, 0, 0, 0];
  const lpCL = [0, 0, 0, 0];
  const lpCR = [0, 0, 0, 0];

  const bufsApL = atrasosApL.map((d) => new Float32Array(d));
  const bufsApR = atrasosApR.map((d) => new Float32Array(d));
  const idxApL = [0, 0];
  const idxApR = [0, 0];

  // Pré-aquece os últimos ~0.18s quando em loop contínuo para continuidade acústica na costura t=0!
  const preAquecimento = loopContinuo ? Math.min(n, Math.floor(TAXA_AMOSTRAGEM * 0.18)) : 0;
  const totalPassos = preAquecimento + n;

  for (let p = 0; p < totalPassos; p += 1) {
    const i = p < preAquecimento ? (n - preAquecimento + p) : (p - preAquecimento);
    const inL = esq[i];
    const inR = dir[i];
    const excitL = (inL + inR * 0.25) * 0.28;
    const excitR = (inR + inL * 0.25) * 0.28;

    let somaL = 0;
    let somaR = 0;
    for (let c = 0; c < 4; c += 1) {
      const bL = bufsCL[c];
      const kL = idxCL[c];
      const yL = bL[kL];
      lpCL[c] = yL * 0.68 + lpCL[c] * 0.32;
      bL[kL] = excitL + lpCL[c] * decaimento;
      idxCL[c] = kL + 1 === bL.length ? 0 : kL + 1;
      somaL += yL;

      const bR = bufsCR[c];
      const kR = idxCR[c];
      const yR = bR[kR];
      lpCR[c] = yR * 0.68 + lpCR[c] * 0.32;
      bR[kR] = excitR + lpCR[c] * decaimento;
      idxCR[c] = kR + 1 === bR.length ? 0 : kR + 1;
      somaR += yR;
    }

    let difL = somaL;
    let difR = somaR;
    for (let a = 0; a < 2; a += 1) {
      const baL = bufsApL[a];
      const kaL = idxApL[a];
      const bufOutL = baL[kaL];
      const vnL = difL + bufOutL * 0.5;
      baL[kaL] = vnL;
      difL = bufOutL - vnL * 0.5;
      idxApL[a] = kaL + 1 === baL.length ? 0 : kaL + 1;

      const baR = bufsApR[a];
      const kaR = idxApR[a];
      const bufOutR = baR[kaR];
      const vnR = difR + bufOutR * 0.5;
      baR[kaR] = vnR;
      difR = bufOutR - vnR * 0.5;
      idxApR[a] = kaR + 1 === baR.length ? 0 : kaR + 1;
    }

    if (p >= preAquecimento) {
      const seco = 1 - mixUmido * 0.35;
      esq[i] = inL * seco + difL * mixUmido;
      dir[i] = inR * seco + difR * mixUmido;
    }
  }
}

const MOTIVOS_MELODICOS_ZONA = Object.freeze({
  HANGAR: [
    0, -1, 4, 7, 9, -1, 7, 4, 2, -1, 7, 12, 9, 7, 4, -1,
    0, 2, 4, -1, 7, 9, 12, -1, 14, 12, 9, 7, 4, -1, 2, -1,
    7, -1, 11, 12, 16, -1, 14, 12, 9, -1, 12, 9, 7, 4, 2, -1,
    4, 7, 9, -1, 12, 14, 16, -1, 12, 9, 7, 4, 2, 0, -1, -1,
  ],
  LOJA_RECIFE: [
    0, 4, 7, -1, 11, 9, 7, -1, 4, 2, 0, -1, 7, 9, 12, -1,
    2, -1, 7, 9, 11, -1, 14, 12, 11, 9, 7, -1, 4, 2, -1, -1,
    7, 11, 14, -1, 16, 14, 12, 11, 9, -1, 7, 4, 2, 4, 7, -1,
    0, -1, 4, 7, 11, 12, 14, -1, 12, 11, 9, 7, 4, 2, 0, -1,
  ],
  ZONA1: [
    0, -1, 3, 5, 7, -1, 10, 7, 5, 3, -1, 7, 12, -1, 10, 7,
    3, -1, 5, 7, 10, 12, 15, -1, 12, 10, 7, -1, 5, 3, 0, -1,
    7, 10, 12, -1, 14, 15, 12, 10, 7, -1, 10, 7, 5, 3, 2, -1,
    0, 3, 7, 10, 12, -1, 17, 15, 12, 10, 7, 5, 3, -1, 0, -1,
  ],
  BIOMA_S2: [
    0, 4, 6, -1, 9, 11, 9, 6, 4, -1, 11, 12, 14, -1, 11, 9,
    6, 4, -1, 7, 9, 11, 14, -1, 16, 14, 11, 9, 6, 4, 2, -1,
    9, -1, 11, 14, 16, 18, 16, 14, 11, -1, 9, 6, 4, 6, 9, -1,
    4, 6, 9, 11, 14, -1, 19, 16, 14, 11, 9, 6, 4, 2, 0, -1,
  ],
  BIOMA_S3: [
    0, -1, 2, 3, 7, -1, 10, 8, 7, 3, 2, -1, 12, 10, 7, -1,
    5, 7, 8, 10, -1, 14, 12, 10, 8, 7, -1, 3, 2, 0, -2, -1,
    7, 8, 12, -1, 15, 14, 12, 8, 7, -1, 10, 8, 5, 3, 2, -1,
    0, 3, 7, 8, 12, 14, 15, -1, 12, 10, 8, 7, 3, 2, 0, -1,
  ],
  ZONA2: [
    0, 2, 3, -1, 7, 8, 7, -1, 3, 2, 0, -1, 10, 8, 7, -1,
    12, -1, 10, 8, 7, -1, 14, 12, 10, 8, 7, 3, 2, -1, 0, -1,
    7, -1, 8, 10, 12, 15, 14, 12, 10, -1, 8, 7, 5, 3, 2, -1,
    3, 7, 10, 12, 15, -1, 19, 15, 14, 12, 10, 8, 7, 3, 0, -1,
  ],
  BIOMA_S5: [
    0, 1, -1, 4, 5, 7, 8, -1, 11, 8, 7, 5, 4, 1, 0, -1,
    12, 11, 8, 7, -1, 13, 12, 8, 7, 5, 4, 1, -1, 4, 7, -1,
    7, 8, 11, 12, -1, 16, 13, 12, 11, 8, 7, -1, 5, 4, 1, -1,
    0, 4, 7, 8, 11, 12, 17, 16, 13, 12, 8, 7, 5, 4, 1, 0,
  ],
  ZONA3: [
    0, -1, 1, 3, 6, 7, -1, 6, 3, -1, 8, 7, 6, 3, 1, -1,
    12, -1, 10, 8, 7, 6, -1, 3, 6, 7, 10, -1, 8, 6, 3, -1,
    6, 7, 10, 12, -1, 15, 13, 12, 10, 7, 6, -1, 3, 1, 0, -1,
    0, 3, 6, 7, 12, 13, 18, 15, 13, 12, 10, 7, 6, 3, 1, -1,
  ],
  BIOMA_S7: [
    0, 1, 4, 5, 7, -1, 10, 8, 7, 4, 1, -1, 12, 13, 10, 7,
    5, 4, -1, 7, 10, 12, 16, -1, 13, 12, 10, 7, 4, 1, 0, -1,
    7, 10, 12, 13, -1, 17, 16, 13, 12, 10, 7, -1, 5, 4, 1, -1,
    0, 4, 5, 7, 10, 12, 16, 19, 17, 16, 13, 12, 10, 7, 4, 0,
  ],
  BIOMA_S8: [
    0, 2, 3, 6, 7, -1, 11, 10, 7, 6, 3, -1, 12, -1, 14, 15,
    11, 7, 6, 3, 2, -1, 6, 7, 11, 12, -1, 10, 7, 6, 3, -1,
    7, 11, 12, 14, 15, -1, 18, 15, 14, 12, 11, 7, 6, 3, 2, -1,
    0, 3, 6, 7, 11, 12, 15, 19, 18, 15, 14, 12, 11, 7, 6, 0,
  ],
  BOSS: [
    0, 0, 7, -1, 8, 7, 5, 4, 0, -1, 12, 11, 8, 7, 5, 4,
    7, 8, 11, 12, -1, 15, 12, 11, 8, 7, 5, 4, 1, 4, 7, 11,
    12, 12, 15, 14, 12, 11, 8, 7, 5, 7, 8, 11, 12, 15, 19, 15,
    12, 11, 8, 7, 5, 4, 7, 8, 11, 12, 14, 15, 17, 16, 12, 7,
  ],
  BOSS_P2: [
    0, 7, 8, 12, 11, 8, 7, 5, 4, 7, 11, 12, 15, 14, 12, 11,
    0, 8, 7, 12, 13, 12, 8, 7, 5, 8, 11, 14, 15, 12, 11, 7,
    12, 15, 16, 19, 17, 15, 13, 12, 11, 12, 15, 17, 20, 19, 16, 15,
    12, 8, 7, 5, 4, 7, 8, 12, 13, 16, 17, 19, 20, 19, 15, 12,
  ],
  BOSS_P3: [
    0, 12, 1, 12, 6, 7, 8, 11, 12, 15, 13, 12, 8, 7, 6, 1,
    0, 7, 12, 13, 18, 15, 13, 12, 11, 8, 7, 6, 3, 1, 6, 11,
    12, 18, 19, 18, 15, 13, 12, 11, 12, 15, 18, 19, 24, 20, 19, 18,
    15, 13, 12, 8, 7, 6, 3, 1, 6, 7, 11, 12, 15, 18, 19, 24,
  ],
  FANFARRA_VIT: [0, 4, 7, 12, 11, 12, 16, -1, 19, -1, 16, 12, 14, 16, 19, -1, 24, -1, 19, 16, 12, 16, 19, 24, 24, -1, -1, -1, -1, -1, -1, -1],
  FANFARRA_DER: [7, -1, 3, 2, 0, -1, -1, -1, 8, -1, 7, 3, 2, -1, 0, -1, 3, 2, 0, -4, -5, -1, -1, -1, -5, -1, -1, -1, -1, -1, -1, -1],
});

const MODOS_PLACA_BESSEL = Object.freeze([1.0, 1.5934, 2.1355, 2.2954, 2.6531, 2.9173, 3.5001, 3.5985]);

function sintetizarPlacaModalBessel(dt, freqBaseHz, decaimentoBase = 7.5, rigidez = 1.0) {
  if (dt < 0) return 0;
  let soma = 0;
  for (let m = 0; m < MODOS_PLACA_BESSEL.length; m += 1) {
    const razao = Math.pow(MODOS_PLACA_BESSEL[m], rigidez);
    const freqModo = freqBaseHz * razao;
    if (freqModo >= TAXA_AMOSTRAGEM * 0.44) break;
    const peso = 1 / (1 + m * 0.78);
    const dec = decaimentoBase * (1 + m * 0.46);
    soma += Math.sin(2 * Math.PI * freqModo * dt + m * 0.61) * Math.exp(-dt * dec) * peso;
  }
  return soma * 0.36;
}

function adicionarNuvemBolhasMinnaertEstereo(esq, dir, semente, qtdBolhas, raioMinMm = 1.4, raioMaxMm = 6.8, ganho = 0.14) {
  const n = esq.length;
  if (n < 512 || qtdBolhas <= 0) return;
  const rnd = prng(semente);
  const u01 = () => (rnd() + 1) * 0.5;
  for (let b = 0; b < qtdBolhas; b += 1) {
    const idxIni = Math.floor(u01() * Math.max(1, n - Math.floor(TAXA_AMOSTRAGEM * 0.12)));
    const raioM = (raioMinMm + u01() * (raioMaxMm - raioMinMm)) * 0.001;
    // Fórmula hidroacústica real de Minnaert: f0 ≈ 3.26 / r (em metros a 1 atm)
    const fMinnaert = Math.min(4800, Math.max(240, 3.26 / raioM));
    const amort = 14 + (fMinnaert * 0.043);
    const durAmostras = Math.min(n - idxIni, Math.floor((5.5 / amort) * TAXA_AMOSTRAGEM));
    const pan = 0.15 + 0.7 * u01();
    const amp = ganho * (0.45 + 0.55 * u01());
    let faseB = 0;
    for (let k = 0; k < durAmostras; k += 1) {
      const dt = k / TAXA_AMOSTRAGEM;
      const fInst = fMinnaert * (1 + 0.22 * Math.min(1, dt * amort * 0.45));
      faseB += (2 * Math.PI * fInst) / TAXA_AMOSTRAGEM;
      const envB = Math.min(1, k / 24) * Math.exp(-dt * amort);
      const s = Math.sin(faseB) * envB * amp;
      esq[idxIni + k] += s * (1 - pan * 0.65);
      dir[idxIni + k] += s * (0.35 + pan * 0.65);
    }
  }
}

/**
 * Compõe uma trilha multi-seção A-B-C-D real (Explore ou Combat sincronizados no mesmo BPM, nº exato de compassos e harmonia!)
 * combinando Corda Dedilhada Física Karplus-Strong, Pad Polifônico Uníssono com Filtro Formante SVF 2-polos,
 * Piano Elétrico Rhodes (tine+tonebar) / Violoncelo de Tampo / Polissintetizador Ladder 4-polos, Percussão Modal Bessel e Reverb FDN!
 */
function sintetizarTrilhaMusicalEstereo({
  compassosAlvo = null,
  duracaoFixaSeg = null,
  escalaDuracao = 1.0,
  bpm,
  acordesSecoes,
  modoCombate,
  timbreZona = 'ZONA1',
  ehBoss = false,
  ehFanfarra = null,
  loopContinuo = true,
  seed = 101,
}) {
  const segPorBatida = 60 / bpm;
  const segPorCompasso = segPorBatida * 4;
  const duracaoNaturalSeg = compassosAlvo ? compassosAlvo * segPorCompasso : (duracaoFixaSeg ?? 64);
  const duracaoSeg = escalaDuracao === 1.0
    ? duracaoNaturalSeg
    : Math.max(ehFanfarra ? 3 : 4, duracaoNaturalSeg * escalaDuracao);
  const n = Math.floor(duracaoSeg * TAXA_AMOSTRAGEM);
  const esq = new Float32Array(n);
  const dir = new Float32Array(n);
  const ruido = prng(seed);

  let faseBaixo = 0;
  let faseSubBaixo = 0;
  let faseLead = 0;
  let lpEstado = 0;
  let svfLowL = 0;
  let svfBandL = 0;
  let svfLowR = 0;
  let svfBandR = 0;

  // Linha de guia de onda física Karplus-Strong para harpa/corda acústica submarina!
  const maxKsLen = 1024;
  const bufKs = new Float32Array(maxKsLen);
  let ksLenAtual = 180;
  let ksIdx = 0;
  let ksPrev = 0;
  let passo16Anterior = -1;

  const delayEsq = new Float32Array(Math.max(1, Math.floor(segPorBatida * 0.75 * TAXA_AMOSTRAGEM)));
  const delayDir = new Float32Array(delayEsq.length);
  let idxDelay = 0;

  const padroesArpZona = {
    HANGAR: [0, 2, 1, 3, 2, 0, 3, 1, 0, 3, 2, 1, 3, 1, 2, 0],
    LOJA_RECIFE: [0, 1, 3, 2, 0, 2, 3, 1, 2, 0, 1, 3, 0, 3, 2, 1],
    ZONA1: [0, 1, 2, 3, 2, 1, 3, 2, 0, 2, 1, 3, 2, 3, 1, 0],
    BIOMA_S2: [0, 2, 3, 1, 2, 3, 0, 2, 1, 3, 2, 0, 3, 2, 1, 3],
    BIOMA_S3: [2, 0, 3, 1, 0, 2, 1, 3, 3, 1, 2, 0, 1, 3, 0, 2],
    ZONA2: [0, 0, 2, 1, 3, 2, 0, 3, 1, 2, 3, 1, 0, 2, 3, 1],
    BIOMA_S5: [0, 1, 0, 3, 2, 1, 3, 0, 1, 0, 2, 3, 0, 3, 2, 1],
    ZONA3: [3, 2, 1, 0, 3, 1, 2, 0, 2, 3, 0, 1, 3, 2, 0, 1],
    BIOMA_S7: [1, 3, 0, 2, 3, 1, 2, 0, 0, 3, 1, 2, 3, 0, 2, 1],
    BIOMA_S8: [0, 2, 3, 2, 1, 3, 0, 3, 2, 1, 3, 0, 2, 3, 1, 2],
    BOSS: [0, 3, 1, 3, 2, 3, 0, 2, 1, 3, 2, 3, 0, 1, 2, 3],
    BOSS_P2: [0, 3, 2, 3, 1, 3, 0, 3, 2, 3, 1, 2, 0, 3, 1, 3],
    BOSS_P3: [3, 0, 3, 1, 3, 2, 3, 0, 2, 3, 1, 3, 0, 3, 2, 3],
    FANFARRA: [0, 1, 2, 3, 2, 1, 3, 0],
  };
  const padraoArp = padroesArpZona[timbreZona] ?? padroesArpZona.ZONA1;
  const chaveMotivo = ehFanfarra === 'DERROTA'
    ? 'FANFARRA_DER'
    : ehFanfarra === 'VITORIA'
      ? 'FANFARRA_VIT'
      : (MOTIVOS_MELODICOS_ZONA[timbreZona] ? timbreZona : 'ZONA1');
  const motivoMelodico = MOTIVOS_MELODICOS_ZONA[chaveMotivo];

  let notaLeadSustentadaHz = 220;
  let envLeadNota = 0;
  let tInicioNotaLead = 0;
  let passoMelAnterior = -1;
  let lad1 = 0;
  let lad2 = 0;
  let lad3 = 0;
  let lad4 = 0;
  let celloForm1 = 0;
  let celloForm2 = 0;

  const denteSuave = (faseRad) => {
    const u = (faseRad / (2 * Math.PI)) % 1;
    const f = u < 0 ? u + 1 : u;
    return (2 * f - 1) - 0.18 * Math.sin(faseRad * 2);
  };

  for (let i = 0; i < n; i += 1) {
    const t = i / TAXA_AMOSTRAGEM;
    let envGlobal = 1.0;
    if (loopContinuo) {
      const janelaLoop = 0.025;
      if (t < janelaLoop) {
        envGlobal = 0.5 - 0.5 * Math.cos((Math.PI * t) / janelaLoop);
      } else if (duracaoSeg - t < janelaLoop) {
        envGlobal = 0.5 - 0.5 * Math.cos((Math.PI * (duracaoSeg - t)) / janelaLoop);
      }
    } else {
      envGlobal = Math.min(1, t / 0.12) * Math.min(1, (duracaoSeg - t) / Math.min(2.6, duracaoSeg * 0.28));
    }

    const compassoGlobal = Math.floor(t / segPorCompasso);
    const secaoIdx = Math.floor(compassoGlobal / 4) % acordesSecoes.length;
    const secao = acordesSecoes[secaoIdx];
    const acordeIdx = compassoGlobal % secao.length;
    const acorde = secao[acordeIdx];

    const posNoCompasso = (t % segPorCompasso) / segPorCompasso;
    const posSub16Global = t / (segPorBatida * 0.25);
    const passo16Global = Math.floor(posSub16Global);
    const posSub16 = posSub16Global % 16;
    const passo16 = Math.floor(posSub16);
    const frac16 = posSub16 - passo16;

    // 1. Pad Polifônico Uníssono (3 osciladores desafinados/voz) + Filtro Formante SVF 2-polos respirante!
    let padCruL = 0;
    let padCruR = 0;
    for (let v = 0; v < acorde.length; v += 1) {
      const f = midiParaHz(acorde[v]);
      const pL = 2 * Math.PI * f * 0.9965 * t + v * 1.1;
      const pC = 2 * Math.PI * f * t + v * 2.3;
      const pR = 2 * Math.PI * f * 1.0035 * t + v * 0.7;
      if (timbreZona === 'ZONA3') {
        const idxFm = 0.65 + 0.35 * Math.sin(t * 0.52 + v);
        padCruL += (Math.sin(pL + idxFm * Math.sin(pL * 2)) + 0.55 * denteSuave(pC)) * 0.068;
        padCruR += (Math.sin(pR + idxFm * Math.sin(pR * 2)) + 0.55 * denteSuave(pC)) * 0.068;
      } else {
        padCruL += (denteSuave(pL) * 0.58 + Math.sin(pC) * 0.62) * 0.072;
        padCruR += (denteSuave(pR) * 0.58 + Math.sin(pC) * 0.62) * 0.072;
      }
    }
    const cutoffHz = (ehBoss ? 880 : modoCombate ? 760 : 540) +
      (ehBoss ? 520 : 340) * (0.5 + 0.5 * Math.sin(t * 0.42 + secaoIdx * 0.9));
    const fSvf = Math.min(0.45, 2 * Math.sin((Math.PI * cutoffHz) / TAXA_AMOSTRAGEM));
    const qSvf = timbreZona === 'ZONA2' || ehBoss ? 0.52 : 0.68;
    svfLowL += fSvf * svfBandL;
    const highL = padCruL - svfLowL - qSvf * svfBandL;
    svfBandL += fSvf * highL;
    svfLowR += fSvf * svfBandR;
    const highR = padCruR - svfLowR - qSvf * svfBandR;
    svfBandR += fSvf * highR;
    const padL = svfLowL * 0.85 + svfBandL * 0.26;
    const padR = svfLowR * 0.85 + svfBandR * 0.26;

    // 2. Corda Dedilhada Física Karplus-Strong + Delay Ping-Pong Estéreo Pontuado
    if (passo16Global !== passo16Anterior) {
      passo16Anterior = passo16Global;
      const pausaArp = (timbreZona === 'HANGAR' && (passo16 === 3 || passo16 === 11)) ||
        (!modoCombate && passo16 === 15 && compassoGlobal % 2 === 1);
      if (!pausaArp) {
        const grauArp = padraoArp[(passo16 + secaoIdx) % padraoArp.length] % acorde.length;
        const oitavaExtra = (passo16 % 4 === 3 || (timbreZona === 'ZONA3' && passo16 % 3 === 2)) ? 12 : 0;
        const freqKs = midiParaHz(acorde[grauArp] + oitavaExtra);
        ksLenAtual = Math.max(18, Math.min(maxKsLen - 1, Math.round(TAXA_AMOSTRAGEM / freqKs)));
        const brilhoPluck = modoCombate ? 0.58 : 0.42;
        let filtroExcit = 0;
        for (let k = 0; k < ksLenAtual; k += 1) {
          const exc = ruido() * brilhoPluck + Math.sin((2 * Math.PI * k) / ksLenAtual) * 0.42;
          filtroExcit = filtroExcit * 0.38 + exc * 0.62;
          bufKs[k] = filtroExcit * (timbreZona === 'HANGAR' && passo16 % 2 === 1 ? 0.48 : 0.85);
        }
        ksIdx = 0;
      }
    }
    const amostraKs = bufKs[ksIdx];
    const amortKs = modoCombate ? 0.9925 : 0.9955;
    const filtradoKs = amortKs * (0.54 * amostraKs + 0.46 * ksPrev);
    ksPrev = amostraKs;
    bufKs[ksIdx] = filtradoKs;
    ksIdx = ksIdx + 1 >= ksLenAtual ? 0 : ksIdx + 1;

    const timbArp = amostraKs * 0.21;
    const panArp = 0.5 + 0.36 * Math.sin(passo16 * 0.95 + secaoIdx);
    const arpDir = timbArp * (1 - panArp) + delayDir[idxDelay] * 0.31;
    const arpEsq = timbArp * panArp + delayEsq[idxDelay] * 0.31;
    delayEsq[idxDelay] = arpDir;
    delayDir[idxDelay] = arpEsq;
    idxDelay = (idxDelay + 1) % delayEsq.length;

    // 3. Baixo Acústico/Analógico em Camadas (Sub-fundamental pura + Harmônico de Cello/Moog)
    const saltoQuinta = (modoCombate && (passo16 === 6 || passo16 === 14)) ? 7 : (ehBoss && passo16 % 4 === 2 ? 12 : 0);
    const freqBaixo = midiParaHz(acorde[0] - 12 + saltoQuinta);
    faseBaixo += (2 * Math.PI * freqBaixo) / TAXA_AMOSTRAGEM;
    faseSubBaixo += (Math.PI * freqBaixo) / TAXA_AMOSTRAGEM;
    const envBaixo = modoCombate
      ? 0.28 + 0.72 * Math.exp(-((posSub16 % (ehBoss ? 1 : 2)) * (ehBoss ? 2.9 : 2.2)))
      : 0.66 + 0.34 * Math.sin(posNoCompasso * Math.PI * 2);
    const corpoBaixo = Math.tanh((Math.sin(faseBaixo) + 0.35 * denteSuave(faseBaixo)) * (ehBoss ? 2.1 : 1.55));
    const subPuro = Math.sin(faseSubBaixo * 2) * 0.45;
    const ondaBaixo = (corpoBaixo * 0.65 + subPuro * 0.35) * envBaixo * (modoCombate ? 0.24 : 0.175);

    // 4. Melodia Principal Acústica/Analógica Multi-Timbral (Rhodes Tine+Tonebar, Cello de Tampo 2-Polos ou Ladder 4-Polos!)
    const subdivMel = ehBoss ? 0.5 : 1.0;
    const passoMelGlobal = Math.floor(t / (segPorBatida * subdivMel));
    if (passoMelGlobal !== passoMelAnterior) {
      passoMelAnterior = passoMelGlobal;
      const idxMotivo = (passoMelGlobal + secaoIdx * 16) % motivoMelodico.length;
      const semiTom = motivoMelodico[idxMotivo];
      const secaoAtiva = secaoIdx !== 0 || Boolean(ehFanfarra) || timbreZona === 'LOJA_RECIFE' || modoCombate || (passoMelGlobal % 4 === 0);
      if (semiTom !== -1 && secaoAtiva) {
        const transposicaoSecao = secaoIdx === 2 ? 12 : 0;
        notaLeadSustentadaHz = midiParaHz(acorde[0] + 12 + semiTom + transposicaoSecao);
        const velHumana = 0.88 + 0.14 * Math.sin(passoMelGlobal * 1.37 + seed * 0.1);
        envLeadNota = (ehBoss ? 0.24 : modoCombate ? 0.185 : 0.16) * velHumana;
        tInicioNotaLead = t;
      }
    }
    envLeadNota *= ehBoss ? 0.99972 : 0.99983;
    const dtNotaLead = Math.max(0, t - tInicioNotaLead);
    const vibratoLead = 1 + 0.0032 * Math.min(1, dtNotaLead * 2.5) * Math.sin(t * 5.7 + Math.sin(t * 0.7) * 0.4);
    faseLead += (2 * Math.PI * notaLeadSustentadaHz * vibratoLead) / TAXA_AMOSTRAGEM;

    let leadSinal = 0;
    const usaRhodes = timbreZona === 'HANGAR' || timbreZona === 'LOJA_RECIFE' || timbreZona === 'ZONA1' || timbreZona === 'BIOMA_S2';
    const usaCelloSolo = !usaRhodes && (timbreZona === 'ZONA2' || timbreZona === 'BIOMA_S3' || timbreZona === 'ZONA3' || ehFanfarra === 'DERROTA');
    if (usaRhodes) {
      // Fender Rhodes físico: martelo de feltro + tine metálica inarmônica (f * 7.11) + tonebar quente saturada + sino de forja no LOJA_RECIFE
      const tineStrike = Math.sin(faseLead * 7.11) * Math.exp(-dtNotaLead * 26) * 0.42;
      const marteloMadeira = ruido() * Math.exp(-dtNotaLead * 95) * 0.18;
      const tonebar = Math.tanh((Math.sin(faseLead) + 0.28 * Math.sin(faseLead * 2) + 0.09 * Math.sin(faseLead * 3)) * 1.35);
      const sinoForja = timbreZona === 'LOJA_RECIFE'
        ? sintetizarPlacaModalBessel(dtNotaLead, notaLeadSustentadaHz * 2, 5.2, 0.88) * 0.34
        : 0;
      leadSinal = (tonebar * 0.78 + tineStrike + marteloMadeira + sinoForja) * envLeadNota * (0.88 + 0.12 * Math.sin(t * 4.8));
    } else if (usaCelloSolo) {
      // Violoncelo friccionado acústico: dente Helmholtz + breu de crina no ataque + filtro de tampo de abeto!
      const ataqueArco = Math.min(1, dtNotaLead / 0.055);
      const breuCrina = ruido() * Math.exp(-dtNotaLead * 22) * 0.16;
      const cordaHelmholtz = denteSuave(faseLead) * 0.65 + denteSuave(faseLead * 1.0025 + 0.9) * 0.35 + breuCrina;
      celloForm1 += 0.072 * (cordaHelmholtz - celloForm1);
      celloForm2 += 0.185 * (cordaHelmholtz - celloForm2);
      const corpoMadeira = Math.tanh((celloForm1 * 0.72 + (celloForm2 - celloForm1) * 0.58) * 1.55);
      leadSinal = corpoMadeira * ataqueArco * envLeadNota * 1.12;
    } else {
      // Polissintetizador Analógico Moog/Prophet: 3 dentes desafinados + cascata Ladder 4-polos não-linear c/ envelope de corte!
      const oscUnison =
        denteSuave(faseLead) * 0.44 +
        denteSuave(faseLead * 0.994 + 1.3) * 0.3 +
        denteSuave(faseLead * 1.006 + 2.7) * 0.3;
      const fcLad = Math.min(5400, 480 + 3100 * Math.exp(-dtNotaLead * (ehBoss ? 4.8 : 3.4)) + notaLeadSustentadaHz * 1.4);
      const gLad = Math.min(0.58, (2 * Math.PI * fcLad) / TAXA_AMOSTRAGEM);
      const entradaRes = Math.tanh(oscUnison - 1.35 * lad4);
      lad1 += gLad * (entradaRes - lad1);
      lad2 += gLad * (lad1 - lad2);
      lad3 += gLad * (lad2 - lad3);
      lad4 += gLad * (lad3 - lad4);
      leadSinal = lad4 * envLeadNota * 1.24;
    }

    // 4b. Contra-canto de Violoncelo/Trompa Submarina nas seções B e D (terças/sextas respirantes)
    const vozContraAtiva = (secaoIdx === 1 || secaoIdx === 3 || ehBoss) && !ehFanfarra;
    const freqContra = midiParaHz(acorde[Math.min(acorde.length - 1, 2)] + (secaoIdx === 3 ? 12 : 0));
    const arcoCello = vozContraAtiva
      ? Math.tanh(Math.sin(2 * Math.PI * freqContra * t + 0.35 * Math.sin(4 * Math.PI * freqContra * t)) * 1.4) *
        (0.5 - 0.5 * Math.cos(posNoCompasso * Math.PI * 2)) *
        (ehBoss ? 0.095 : 0.072)
      : 0;

    // 5. Percussão Tática Hidroacústica com ghost-notes sincopadas e fills de 4º compasso
    let percL = 0;
    let percR = 0;
    if (modoCombate || ehBoss) {
      const ehViradaFrase = compassoGlobal % 4 === 3 && passo16 >= 12;
      const bateKick =
        passo16 === 0 ||
        passo16 === 8 ||
        (passo16 === 10 && timbreZona !== 'ZONA1') ||
        (ehBoss && (passo16 === 3 || passo16 === 6 || passo16 === 14));
      if (bateKick) {
        const dtSub16 = frac16 * (segPorBatida * 0.25);
        const fKick = (ehBoss ? 44 : 49) + 124 * Math.exp(-frac16 * 20);
        const punch = Math.sin(2 * Math.PI * fKick * dtSub16) * Math.exp(-frac16 * 7.2) * 0.32;
        const membranaCasco = sintetizarPlacaModalBessel(dtSub16, ehBoss ? 86 : 96, 22, 0.78) * 0.19;
        percL += punch + membranaCasco;
        percR += punch + membranaCasco * 0.96;
      }
      const ehCaixaPrincipal = passo16 === 4 || passo16 === 12;
      const ehGhostNote = !ehCaixaPrincipal && (passo16 === 7 || passo16 === 9 || passo16 === 15);
      if (ehCaixaPrincipal || ehGhostNote || ehViradaFrase) {
        const dtSn = frac16 * (segPorBatida * 0.25);
        const pesoCaixa = ehCaixaPrincipal ? 1.0 : ehViradaFrase ? 0.78 : 0.32;
        const nSn = ruido();
        lpEstado += 0.38 * (nSn - lpEstado);
        const peleBessel = sintetizarPlacaModalBessel(dtSn, ehViradaFrase ? 214 - (passo16 - 12) * 24 : 188, 18, 0.84) * 0.28;
        const esteiraCaixa = (nSn * 0.45 + lpEstado * 0.55) * Math.exp(-frac16 * (ehGhostNote ? 18 : 11)) * 0.23;
        const sn = (peleBessel + esteiraCaixa) * pesoCaixa;
        const panFill = ehViradaFrase ? 0.24 + ((passo16 - 12) / 3) * 0.52 : 0.5;
        percL += sn * (1.28 - panFill);
        percR += sn * (0.72 + panFill);
      }
      const hatAberto = passo16 === 2 || passo16 === 10;
      const hihat = (ruido() - lpEstado * 0.6) * Math.exp(-frac16 * (hatAberto ? 11 : 26)) * (hatAberto ? 0.082 : 0.048);
      percL += hihat * 0.88;
      percR += hihat * 1.12;
    } else if (timbreZona !== 'FANFARRA') {
      // Shaker orgânico escovado + pulso cardíaco de sonar nos temas Explore/Hangar
      if (passo16 % 2 === 0) {
        const shk = ruido() * Math.exp(-frac16 * 22) * (passo16 % 4 === 0 ? 0.026 : 0.015);
        percL += shk * 0.9;
        percR += shk * 1.1;
      }
      if (passo16 === 0 && compassoGlobal % 2 === 0) {
        const pulso = Math.sin(2 * Math.PI * midiParaHz(acorde[2] + 12) * frac16 * (segPorBatida * 0.25)) * Math.exp(-frac16 * 5.8) * 0.058;
        percL += pulso;
        percR += pulso * 0.86;
      }
    }

    esq[i] = (padL + arpEsq + ondaBaixo + leadSinal * 0.84 + arcoCello * 1.06 + percL) * envGlobal;
    dir[i] = (padR + arpDir + ondaBaixo + leadSinal * 1.08 + arcoCello * 0.82 + percR) * envGlobal;
  }

  aplicarReverbSchroederEstereo(
    esq,
    dir,
    modoCombate ? 0.16 : 0.26,
    ehFanfarra ? 0.8 : modoCombate ? 0.72 : 0.78,
    loopContinuo
  );

  if (loopContinuo) {
    const jan = Math.min(n >> 2, Math.floor(0.025 * TAXA_AMOSTRAGEM));
    for (let k = 0; k < jan; k += 1) {
      const g = 0.5 - 0.5 * Math.cos((Math.PI * k) / jan);
      esq[k] *= g;
      dir[k] *= g;
      esq[n - 1 - k] *= g;
      dir[n - 1 - k] *= g;
    }
  }

  return { esq, dir };
}

function sintetizarAmbienciaHidrofone(duracaoSeg = 64, setorBioma = 1) {
  const n = Math.floor(duracaoSeg * TAXA_AMOSTRAGEM);
  const esq = new Float32Array(n);
  const dir = new Float32Array(n);
  const ruido = prng(9091 + setorBioma * 1301);
  let lpL = 0;
  let lpR = 0;
  const wBase = (2 * Math.PI) / duracaoSeg;

  for (let i = 0; i < n; i += 1) {
    const t = i / TAXA_AMOSTRAGEM;
    const janelaLoop = 0.03;
    let env = 1.0;
    if (t < janelaLoop) env = 0.5 - 0.5 * Math.cos((Math.PI * t) / janelaLoop);
    else if (duracaoSeg - t < janelaLoop) env = 0.5 - 0.5 * Math.cos((Math.PI * (duracaoSeg - t)) / janelaLoop);

    const rEsq = ruido();
    const rDir = ruido();
    const coefLp = setorBioma === 3 ? 0.042 : setorBioma === 6 ? 0.015 : setorBioma === 8 ? 0.012 : 0.022;
    lpL += coefLp * (rEsq - lpL);
    lpR += coefLp * (rDir - lpR);
    const turbCavL = (rEsq - lpL) * 0.03 * (0.5 + 0.5 * Math.sin(wBase * (9 + setorBioma) * t));
    const turbCavR = (rDir - lpR) * 0.03 * (0.5 + 0.5 * Math.cos(wBase * (11 + setorBioma) * t));

    let assinaturaL = 0;
    let assinaturaR = 0;
    switch (setorBioma) {
      case 2: {
        // S2 Floresta de Kelp Bioluminescente: colônias de camarão-estalo + bolhas densas de recife
        const cEstalo = ((t / duracaoSeg) * Math.round(duracaoSeg * 4.5)) % 1;
        const estaloRecife = cEstalo < 0.018 ? rEsq * Math.exp(-cEstalo * 180) * 0.14 : 0;
        const brisaKelp = Math.sin(2 * Math.PI * (196 + 14 * Math.sin(wBase * 5 * t)) * t) * Math.max(0, Math.sin(wBase * 6 * t)) * 0.055;
        assinaturaL = estaloRecife + brisaKelp;
        assinaturaR = estaloRecife * 0.65 + brisaKelp * 0.92;
        break;
      }
      case 3: {
        // S3 Chaminés Hidrotermais: estrondo tectônico grave + jatos de vapor em ebulição
        const magma = Math.tanh(Math.sin(2 * Math.PI * (46 + 6 * Math.sin(wBase * 2 * t)) * t) * 1.8) * 0.11;
        const vapor = (rEsq - lpL) * Math.pow(Math.max(0, Math.sin(wBase * 7 * t)), 4) * 0.085;
        assinaturaL = magma + vapor;
        assinaturaR = magma * 0.95 - vapor * 0.75;
        break;
      }
      case 4: {
        // S4 Cemitério de Encouraçados: chapas de aço rangendo + ping distante de boia naufragada
        const chapa = Math.sin(2 * Math.PI * (118 + 22 * Math.cos(wBase * 8 * t)) * t) * Math.pow(Math.max(0, Math.cos(wBase * 4 * t)), 8) * 0.095;
        const cBoia = ((t / duracaoSeg) * Math.max(2, Math.round(duracaoSeg * 0.25))) % 1;
        const boia = cBoia < 0.12 ? Math.sin(2 * Math.PI * 1088 * cBoia) * Math.exp(-cBoia * 28) * 0.075 : 0;
        assinaturaL = chapa + boia * 0.6;
        assinaturaR = chapa * 0.72 + boia;
        break;
      }
      case 5: {
        // S5 Fossa Bioelétrica: descargas iônicas distantes + vórtice eletrostático
        const cRaio = ((t / duracaoSeg) * Math.max(3, Math.round(duracaoSeg * 0.5))) % 1;
        const arco = cRaio < 0.08 ? Math.sin(2 * Math.PI * (520 - cRaio * 2400) * cRaio) * Math.exp(-cRaio * 34) * 0.11 : 0;
        const zumbido = Math.sin(2 * Math.PI * 92 * t + 0.6 * Math.sin(2 * Math.PI * 184 * t)) * 0.052;
        assinaturaL = arco + zumbido;
        assinaturaR = -arco * 0.8 + zumbido * 0.9;
        break;
      }
      case 6: {
        // S6 Calota Subglacial: estalos cristalinos de banquisa + ressonância vítrea fria
        const cristal = (Math.sin(2 * Math.PI * 1480 * t) + 0.5 * Math.sin(2 * Math.PI * 2210 * t)) *
          Math.pow(Math.max(0, Math.sin(wBase * 9 * t)), 10) * 0.068;
        const geloGrave = Math.sin(2 * Math.PI * (78 - 12 * Math.sin(wBase * 3 * t)) * t) * 0.075;
        assinaturaL = cristal + geloGrave;
        assinaturaR = cristal * 0.85 + geloGrave;
        break;
      }
      case 7: {
        // S7 Colmeia Abissal Viva: pulsação cardíaca orgânica + respiração peristáltica
        const cPulso = ((t / duracaoSeg) * Math.max(4, Math.round(duracaoSeg * 0.9))) % 1;
        const batida = cPulso < 0.22 ? Math.sin(2 * Math.PI * (58 * Math.exp(-cPulso * 5)) * cPulso) * Math.exp(-cPulso * 12) * 0.16 : 0;
        const resp = lpL * (0.5 + 0.5 * Math.sin(wBase * 6 * t)) * 0.35;
        assinaturaL = batida + resp;
        assinaturaR = batida * 0.92 + resp * 0.85;
        break;
      }
      case 8: {
        // S8 Trincheira da Draga: sub-grave esmagador + pulsação mecânica de turbina de sucção
        const turbina = Math.tanh(Math.sin(2 * Math.PI * 41 * t + 0.5 * Math.sin(wBase * 16 * t)) * 2.1) * 0.125;
        const cisalha = Math.sin(2 * Math.PI * 164 * t) * Math.pow(Math.max(0, Math.sin(wBase * 12 * t)), 6) * 0.065;
        assinaturaL = turbina + cisalha;
        assinaturaR = turbina + cisalha * 0.7;
        break;
      }
      case 1:
      default: {
        const modLenta = Math.max(0, Math.sin(wBase * 4 * t));
        const canto =
          (Math.sin(2 * Math.PI * (64 + 11 * Math.sin(wBase * 3 * t)) * t) +
            0.38 * Math.sin(2 * Math.PI * (129 + 19 * Math.sin(wBase * 3 * t)) * t)) *
          modLenta *
          0.095;
        const gateCasco = Math.pow(Math.max(0, Math.cos(wBase * 5 * t)), 6);
        const rangidoCasco =
          (Math.sin(2 * Math.PI * (142 + 18 * Math.cos(wBase * 7 * t)) * t) +
            0.45 * Math.sin(2 * Math.PI * (296 + 31 * Math.sin(wBase * 9 * t)) * t)) *
          gateCasco *
          0.058;
        assinaturaL = canto + rangidoCasco;
        assinaturaR = canto * 0.84 + rangidoCasco * 0.72;
        break;
      }
    }

    const cicloBolhaA = ((t / duracaoSeg) * Math.round(duracaoSeg * 1.5)) % 1;
    const cicloBolhaB = ((t / duracaoSeg + 0.37) * Math.round(duracaoSeg * 2.25)) % 1;
    const bolhaA = cicloBolhaA < 0.075
      ? Math.sin(2 * Math.PI * (490 + setorBioma * 35 + cicloBolhaA * 1950) * cicloBolhaA) * Math.exp(-cicloBolhaA * 46) * 0.125
      : 0;
    const bolhaB = cicloBolhaB < 0.055
      ? Math.sin(2 * Math.PI * (760 + setorBioma * 40 + cicloBolhaB * 2400) * cicloBolhaB) * Math.exp(-cicloBolhaB * 58) * 0.085
      : 0;
    esq[i] = (lpL * 0.48 + turbCavL + assinaturaL + bolhaA + bolhaB * 0.45) * env;
    dir[i] = (lpR * 0.48 + turbCavR + assinaturaR + bolhaA * 0.58 + bolhaB) * env;
  }
  adicionarNuvemBolhasMinnaertEstereo(
    esq,
    dir,
    4040 + setorBioma * 313,
    Math.max(12, Math.round(duracaoSeg * (setorBioma === 2 || setorBioma === 3 ? 2.4 : 1.3))),
    1.5,
    6.4,
    0.095
  );
  aplicarReverbSchroederEstereo(esq, dir, 0.24, 0.81, true);
  return { esq, dir };
}

function sintetizarFoleyHidroacustico(idFoley) {
  const durMap = {
    FOIL_DECOLAGEM: 1.35,
    TOUCHDOWN_IMPACTO: 1.45,
    MERGULHO_400HZ: 1.6,
    DRENO_VALVULA: 1.4,
    BRECHA_GEISER: 1.5,
    TIRO_ESPINHO: 0.55,
    TIRO_TORPEDO: 1.15,
    TIRO_FLAK: 0.85,
    FEIXE_TERMICO: 1.35,
    PULSO_IONICO: 0.95,
    BOMBA_OSMOTICA: 1.25,
    ESCUDO_BOLHA_ABSORCAO: 0.75,
    CASCO_IMPACTO_PESADO: 0.9,
    ESQUIVA_FLYBY: 0.65,
    SONAR_PING: 1.3,
    CONQUISTA_STEAM: 1.6,
    MORTEIRO_ACIDO: 1.2,
    CRIO_ESTILHACO: 1.1,
    FEIXE_NEURO_BIO: 1.4,
    CADEIA_VULCAO: 0.72,
    ESCLUSA_ABORDAGEM: 1.05,
    AGULHA_SONICA: 0.62,
    DISPARO_HIDRO_CARGA: 0.92,
    SONDA_HACK_ION: 1.05,
    PARASITA_NEURAL_SINAPSE: 1.15,
    DRONE_DEFESA_LASER: 0.58,
  };
  const dur = durMap[idFoley] ?? 0.9;
  const n = Math.floor(dur * TAXA_AMOSTRAGEM);
  const esq = new Float32Array(n);
  const dir = new Float32Array(n);
  const ruido = prng(idFoley.length * 7919 + idFoley.charCodeAt(0) * 131);
  let fase = 0;
  let lp = 0;

  for (let i = 0; i < n; i += 1) {
    const t = i / TAXA_AMOSTRAGEM;
    const u = t / dur;
    let sL = 0;
    let sR = 0;

    switch (idFoley) {
      case 'FOIL_DECOLAGEM': {
        const f = 140 + 680 * Math.pow(u, 1.3);
        fase += (2 * Math.PI * f) / TAXA_AMOSTRAGEM;
        lp += 0.12 * (ruido() - lp);
        const s = (Math.sin(fase) * 0.35 + lp * 0.45) * Math.sin(u * Math.PI);
        sL = s; sR = s * 0.95;
        break;
      }
      case 'TOUCHDOWN_IMPACTO': {
        const thud = Math.sin(2 * Math.PI * (95 * Math.exp(-t * 4.5)) * t) * Math.exp(-t * 4.2) * 0.7;
        lp += 0.18 * (ruido() - lp);
        const splash = lp * Math.exp(-t * 2.4) * 0.65;
        sL = thud + splash; sR = thud + splash * 0.9;
        break;
      }
      case 'MERGULHO_400HZ': {
        const f = 520 * Math.exp(-t * 1.6) + 75;
        fase += (2 * Math.PI * f) / TAXA_AMOSTRAGEM;
        lp += 0.04 * (ruido() - lp);
        const bolhas = Math.sin(2 * Math.PI * (340 + 90 * Math.sin(t * 26)) * t) * 0.22;
        sL = (Math.sin(fase) * 0.4 + lp * 0.7 + bolhas) * (1 - u * 0.6);
        sR = (Math.sin(fase * 1.01) * 0.4 + lp * 0.7 - bolhas * 0.5) * (1 - u * 0.6);
        break;
      }
      case 'DRENO_VALVULA':
      case 'BRECHA_GEISER': {
        const taxa = idFoley === 'BRECHA_GEISER' ? 0.32 : 0.14;
        lp += taxa * (ruido() - lp);
        const jato = lp * (0.65 + 0.25 * Math.sin(t * 34)) * Math.sin(Math.min(1, u * 4) * (1 - u * 0.7) * Math.PI * 0.5);
        const rasgo = idFoley === 'BRECHA_GEISER' ? Math.sin(2 * Math.PI * 220 * t) * Math.exp(-t * 12) * 0.5 : 0;
        sL = jato + rasgo; sR = jato * 0.92 + rasgo;
        break;
      }
      case 'TIRO_ESPINHO': {
        const f = 920 * Math.exp(-t * 14) + 160;
        fase += (2 * Math.PI * f) / TAXA_AMOSTRAGEM;
        sL = Math.tanh(Math.sin(fase) * 2.1) * Math.exp(-t * 9) * 0.65;
        sR = sL * 0.94;
        break;
      }
      case 'TIRO_TORPEDO': {
        const f = 110 + 190 * u;
        fase += (2 * Math.PI * f) / TAXA_AMOSTRAGEM;
        lp += 0.22 * (ruido() - lp);
        const cav = lp * (0.5 + 0.5 * Math.sin(t * 48)) * (1 - u * 0.5);
        sL = Math.sin(fase) * 0.35 * Math.exp(-t * 2.5) + cav;
        sR = sL;
        break;
      }
      case 'TIRO_FLAK': {
        const burst = ruido() * Math.exp(-t * 6.5) * 0.75;
        const estalo = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 11) * 0.5;
        sL = burst + estalo; sR = -burst * 0.7 + estalo;
        break;
      }
      case 'FEIXE_TERMICO': {
        const f = 330 + 18 * Math.sin(t * 42);
        fase += (2 * Math.PI * f) / TAXA_AMOSTRAGEM;
        const vapor = ruido() * 0.18;
        const env = Math.min(1, t / 0.08) * Math.min(1, (dur - t) / 0.15);
        sL = (Math.tanh(Math.sin(fase) * 2.6) * 0.45 + vapor) * env;
        sR = (Math.tanh(Math.sin(fase * 1.005) * 2.6) * 0.45 - vapor) * env;
        break;
      }
      case 'PULSO_IONICO': {
        const f = 680 - 420 * u + 95 * Math.sin(t * 75);
        fase += (2 * Math.PI * f) / TAXA_AMOSTRAGEM;
        sL = Math.sin(fase + Math.sin(fase * 2.5)) * Math.exp(-t * 3.6) * 0.6;
        sR = Math.sin(fase * 1.02 + Math.cos(fase * 2.5)) * Math.exp(-t * 3.6) * 0.6;
        break;
      }
      case 'BOMBA_OSMOTICA': {
        const impl = u < 0.35
          ? Math.sin(2 * Math.PI * (80 + 500 * (u / 0.35)) * t) * (u / 0.35) * 0.55
          : Math.sin(2 * Math.PI * (140 * Math.exp(-(u - 0.35) * 6)) * t) * Math.exp(-(u - 0.35) * 5) * 0.85;
        sL = impl; sR = impl;
        break;
      }
      case 'ESCUDO_BOLHA_ABSORCAO': {
        const f = 460 + 380 * Math.sin(t * 28) * Math.exp(-t * 5);
        fase += (2 * Math.PI * f) / TAXA_AMOSTRAGEM;
        sL = Math.sin(fase) * Math.exp(-t * 4.5) * 0.6;
        sR = Math.cos(fase) * Math.exp(-t * 4.5) * 0.6;
        break;
      }
      case 'CASCO_IMPACTO_PESADO': {
        const boom = Math.sin(2 * Math.PI * (125 * Math.exp(-t * 7)) * t) * Math.exp(-t * 5) * 0.8;
        const crunch = ruido() * Math.exp(-t * 14) * 0.5;
        sL = boom + crunch; sR = boom + crunch * 0.85;
        break;
      }
      case 'ESQUIVA_FLYBY': {
        const doppler = 620 * (1 - 0.55 * u);
        fase += (2 * Math.PI * doppler) / TAXA_AMOSTRAGEM;
        lp += 0.25 * (ruido() - lp);
        const env = Math.sin(u * Math.PI);
        sL = (lp * 0.55 + Math.sin(fase) * 0.2) * env * (1 - u * 0.7);
        sR = (lp * 0.55 + Math.sin(fase) * 0.2) * env * (0.3 + u * 0.7);
        break;
      }
      case 'SONAR_PING': {
        const ping = Math.sin(2 * Math.PI * 1320 * t) * Math.exp(-t * 4.2) * 0.55;
        const eco = t > 0.38 ? Math.sin(2 * Math.PI * 1316 * (t - 0.38)) * Math.exp(-(t - 0.38) * 5.5) * 0.22 : 0;
        sL = ping + eco * 0.6; sR = ping * 0.85 + eco;
        break;
      }
      case 'MORTEIRO_ACIDO': {
        const thump = Math.sin(2 * Math.PI * (145 * Math.exp(-t * 6.5)) * t) * Math.exp(-t * 7.5) * 0.62;
        lp += 0.28 * (ruido() - lp);
        const borbulha = Math.sin(2 * Math.PI * (640 + 380 * Math.sin(t * 58)) * t) * 0.24 * Math.exp(-t * 2.1);
        const chiadoCorrosivo = (ruido() - lp) * (0.45 + 0.35 * Math.sin(t * 37)) * Math.exp(-t * 2.4);
        sL = thump + borbulha + chiadoCorrosivo;
        sR = thump + borbulha * 0.75 - chiadoCorrosivo * 0.85;
        break;
      }
      case 'CRIO_ESTILHACO': {
        const assobio = Math.sin(2 * Math.PI * (1980 - 820 * u) * t) * Math.exp(-t * 4.8) * 0.28;
        const cristais = (Math.sin(2 * Math.PI * 2840 * t) + Math.sin(2 * Math.PI * 3710 * t) * 0.7 + Math.sin(2 * Math.PI * 4490 * t) * 0.5) *
          (0.5 + 0.5 * Math.cos(t * 92)) * Math.exp(-t * 5.6) * 0.32;
        const fratura = ruido() * Math.exp(-Math.max(0, t - 0.14) * 16) * (t >= 0.14 ? 0.55 : 0.12);
        sL = assobio + cristais + fratura;
        sR = assobio * 0.9 - cristais * 0.85 + fratura * 0.8;
        break;
      }
      case 'FEIXE_NEURO_BIO': {
        const fBio = 264 + 28 * Math.sin(t * 19) + 12 * Math.cos(t * 63);
        fase += (2 * Math.PI * fBio) / TAXA_AMOSTRAGEM;
        const envBio = Math.min(1, t / 0.06) * Math.min(1, (dur - t) / 0.16);
        const sinapse = Math.sin(fase + 1.8 * Math.sin(fase * 2.5)) * (0.65 + 0.35 * Math.sin(t * 32));
        sL = sinapse * envBio * 0.58;
        sR = Math.sin(fase * 1.008 + 1.8 * Math.cos(fase * 2.5)) * envBio * 0.58;
        break;
      }
      case 'CADEIA_VULCAO': {
        const spool = 220 + 640 * u;
        fase += (2 * Math.PI * spool) / TAXA_AMOSTRAGEM;
        const rajada = Math.pow(Math.max(0, Math.sin(t * Math.PI * 22)), 4);
        const tiro = (Math.tanh(Math.sin(fase) * 2.4) * 0.52 + ruido() * 0.26) * (0.28 + 0.72 * rajada) * Math.exp(-t * 1.8);
        sL = tiro;
        sR = tiro * 0.92;
        break;
      }
      case 'ESCLUSA_ABORDAGEM': {
        const trava = Math.sin(2 * Math.PI * 420 * t) * Math.exp(-t * 28) * 0.45;
        const pistao = t >= 0.09
          ? Math.sin(2 * Math.PI * (165 * Math.exp(-(t - 0.09) * 5.2)) * (t - 0.09)) * Math.exp(-(t - 0.09) * 4.5) * 0.74
          : 0;
        lp += 0.19 * (ruido() - lp);
        const arPressurizado = t >= 0.09 ? lp * Math.exp(-(t - 0.09) * 3.8) * 0.52 : 0;
        sL = trava + pistao + arPressurizado;
        sR = trava * 0.85 + pistao + arPressurizado * 0.88;
        break;
      }
      case 'AGULHA_SONICA': {
        const chirp = 2650 + 3800 * Math.pow(u, 0.75);
        fase += (2 * Math.PI * chirp) / TAXA_AMOSTRAGEM;
        const pulso = Math.sin(fase + 0.85 * Math.sin(fase * 2.0)) * Math.exp(-t * 8.4) * 0.62;
        const agulhaSub = Math.sin(2 * Math.PI * (420 * Math.exp(-t * 9.5)) * t) * Math.exp(-t * 10.5) * 0.34;
        sL = pulso + agulhaSub;
        sR = pulso * 0.88 - agulhaSub * 0.4 + Math.cos(fase) * Math.exp(-t * 8.4) * 0.25;
        break;
      }
      case 'DISPARO_HIDRO_CARGA': {
        let salva = 0;
        for (let c = 0; c < 3; c += 1) {
          const dtC = t - c * 0.14;
          if (dtC >= 0) {
            const fH = (260 + c * 75) * Math.exp(-dtC * 6.8) + 95;
            salva += Math.tanh(Math.sin(2 * Math.PI * fH * dtC) * 1.9) * Math.exp(-dtC * 7.2) * 0.48;
          }
        }
        lp += 0.21 * (ruido() - lp);
        const jatoPressao = lp * Math.exp(-t * 3.2) * 0.34;
        sL = salva + jatoPressao;
        sR = salva * 0.94 - jatoPressao * 0.65;
        break;
      }
      case 'SONDA_HACK_ION': {
        const fHack = 1280 - 760 * u + 140 * Math.sin(t * 96);
        fase += (2 * Math.PI * fHack) / TAXA_AMOSTRAGEM;
        const pulsoDigital = Math.sign(Math.sin(t * Math.PI * 38)) * 0.18 * Math.exp(-t * 3.1);
        const travaMagn = Math.sin(2 * Math.PI * 240 * t) * Math.exp(-Math.max(0, t - 0.16) * 14) * (t >= 0.16 ? 0.48 : 0);
        sL = Math.sin(fase + Math.sin(fase * 2)) * Math.exp(-t * 2.9) * 0.52 + pulsoDigital + travaMagn;
        sR = Math.cos(fase * 1.01 + Math.sin(fase * 2)) * Math.exp(-t * 2.9) * 0.52 - pulsoDigital + travaMagn;
        break;
      }
      case 'PARASITA_NEURAL_SINAPSE': {
        const fPsi = 310 + 95 * Math.sin(t * 27) + 45 * Math.cos(t * 71);
        fase += (2 * Math.PI * fPsi) / TAXA_AMOSTRAGEM;
        const coralNeuro = Math.sin(fase + 2.2 * Math.sin(fase * 1.5)) * Math.sin(Math.min(1, u * 5) * (1 - u * 0.65) * Math.PI * 0.5) * 0.58;
        sL = coralNeuro;
        sR = Math.sin(fase * 1.012 + 2.2 * Math.cos(fase * 1.5)) * 0.58 * (1 - u * 0.65);
        break;
      }
      case 'DRONE_DEFESA_LASER': {
        const fZap = 2400 * Math.exp(-t * 11) + 320;
        fase += (2 * Math.PI * fZap) / TAXA_AMOSTRAGEM;
        const zap = Math.tanh(Math.sin(fase) * 2.2) * Math.exp(-t * 7.5) * 0.62;
        const boomInterc = t >= 0.11 ? (ruido() * 0.45 + Math.sin(2 * Math.PI * 190 * (t - 0.11)) * 0.42) * Math.exp(-(t - 0.11) * 12) : 0;
        sL = zap + boomInterc;
        sR = zap * 0.86 + boomInterc * 0.94;
        break;
      }
      case 'CONQUISTA_STEAM':
      default: {
        const notas = [523.25, 659.25, 783.99, 1046.5];
        let ac = 0;
        for (let k = 0; k < notas.length; k += 1) {
          const dt = Math.max(0, t - k * 0.11);
          if (t >= k * 0.11) {
            ac += Math.sin(2 * Math.PI * notas[k] * dt) * Math.exp(-dt * 2.6) * 0.22;
          }
        }
        sL = ac; sR = ac;
        break;
      }
    }

    const ressonanciaAntepara =
      idFoley === 'TOUCHDOWN_IMPACTO' || idFoley === 'CASCO_IMPACTO_PESADO' || idFoley === 'BRECHA_GEISER' || idFoley === 'ESCLUSA_ABORDAGEM'
        ? sintetizarPlacaModalBessel(t, idFoley === 'ESCLUSA_ABORDAGEM' ? 238 : 134, 8.8, 1.04) * 0.42
        : idFoley !== 'CONQUISTA_STEAM' && idFoley !== 'SONAR_PING'
          ? sintetizarPlacaModalBessel(t, 420, 32, 0.92) * 0.16
          : 0;
    const estaloQuitina = idFoley !== 'CONQUISTA_STEAM' && idFoley !== 'SONAR_PING'
      ? (ruido() * 0.14 + ressonanciaAntepara) * Math.exp(-t * 12)
      : 0;
    const atrasoHaasL = i >= 970 ? dir[i - 970] * 0.18 : 0;
    const atrasoHaasR = i >= 1675 ? esq[i - 1675] * 0.18 : 0;
    const envFoley = Math.min(1, t / 0.004) * Math.min(1, (dur - t) / 0.015);
    esq[i] = Math.max(-0.98, Math.min(0.98, (sL + estaloQuitina + atrasoHaasL) * envFoley));
    dir[i] = Math.max(-0.98, Math.min(0.98, (sR + estaloQuitina * 0.86 + atrasoHaasR) * envFoley));
  }

  if (
    idFoley === 'MERGULHO_400HZ' ||
    idFoley === 'DRENO_VALVULA' ||
    idFoley === 'BRECHA_GEISER' ||
    idFoley === 'TIRO_TORPEDO' ||
    idFoley === 'TOUCHDOWN_IMPACTO' ||
    idFoley === 'BOMBA_OSMOTICA'
  ) {
    adicionarNuvemBolhasMinnaertEstereo(esq, dir, idFoley.charCodeAt(0) * 977 + n, 18, 1.2, 5.2, 0.13);
  }
  aplicarReverbSchroederEstereo(esq, dir, idFoley === 'SONAR_PING' || idFoley === 'CONQUISTA_STEAM' ? 0.28 : 0.16, 0.72, false);

  return { esq, dir };
}

const SECOES_LOJA_RECIFE = [
  [[50, 57, 62, 69], [53, 60, 64, 72], [55, 62, 67, 74], [52, 59, 64, 71]],
  [[48, 55, 60, 67], [50, 57, 62, 69], [53, 60, 65, 72], [55, 62, 67, 74]],
  [[45, 52, 57, 64], [48, 55, 60, 67], [50, 57, 62, 69], [52, 59, 64, 71]],
  [[50, 57, 62, 69], [55, 62, 67, 74], [53, 60, 64, 72], [48, 55, 60, 67]],
];

const SECOES_ZONA1 = [
  [[48, 55, 60, 67], [46, 53, 58, 65], [44, 51, 56, 63], [43, 50, 55, 62]],
  [[51, 58, 63, 70], [48, 55, 60, 67], [44, 51, 56, 63], [46, 53, 58, 65]],
  [[41, 48, 53, 60], [44, 51, 56, 63], [48, 55, 60, 67], [50, 57, 62, 69]],
  [[48, 55, 60, 67], [53, 60, 65, 72], [51, 58, 63, 70], [46, 53, 58, 65]],
];

const SECOES_BIOMA_S2 = [
  [[53, 60, 64, 71], [55, 62, 67, 74], [50, 57, 62, 69], [52, 59, 64, 71]],
  [[48, 55, 60, 67], [53, 60, 64, 71], [55, 62, 66, 74], [50, 57, 62, 69]],
  [[45, 52, 57, 64], [48, 55, 60, 67], [53, 60, 64, 71], [55, 62, 67, 74]],
  [[53, 60, 64, 71], [57, 64, 69, 76], [55, 62, 67, 74], [50, 57, 62, 69]],
];

const SECOES_BIOMA_S3 = [
  [[40, 47, 52, 59], [43, 50, 55, 62], [38, 45, 50, 57], [42, 49, 54, 61]],
  [[45, 52, 57, 64], [40, 47, 52, 59], [43, 50, 55, 62], [38, 45, 50, 57]],
  [[36, 43, 48, 55], [40, 47, 52, 59], [43, 50, 55, 62], [47, 54, 59, 66]],
  [[40, 47, 52, 59], [45, 52, 57, 64], [43, 50, 55, 62], [38, 45, 50, 57]],
];

const SECOES_ZONA2 = [
  [[45, 52, 57, 64], [41, 48, 53, 60], [43, 50, 55, 62], [38, 45, 50, 57]],
  [[48, 55, 60, 67], [45, 52, 57, 64], [40, 47, 52, 59], [43, 50, 55, 62]],
  [[38, 45, 50, 57], [41, 48, 53, 60], [45, 52, 57, 64], [47, 54, 59, 66]],
  [[45, 52, 57, 64], [50, 57, 62, 69], [48, 55, 60, 67], [43, 50, 55, 62]],
];

const SECOES_BIOMA_S5 = [
  [[38, 45, 50, 58], [39, 46, 51, 58], [41, 48, 53, 61], [37, 44, 49, 57]],
  [[43, 50, 55, 62], [38, 45, 50, 58], [34, 41, 46, 53], [37, 44, 49, 57]],
  [[34, 41, 46, 53], [38, 45, 50, 58], [41, 48, 53, 61], [45, 52, 57, 64]],
  [[38, 45, 50, 58], [46, 53, 58, 65], [43, 50, 55, 62], [37, 44, 49, 57]],
];

const SECOES_ZONA3 = [
  [[43, 50, 55, 61], [42, 49, 54, 60], [39, 46, 51, 58], [38, 45, 50, 57]],
  [[46, 53, 58, 65], [43, 50, 55, 62], [41, 48, 53, 60], [42, 49, 54, 61]],
  [[36, 43, 48, 55], [39, 46, 51, 58], [43, 50, 55, 62], [45, 52, 57, 64]],
  [[43, 50, 55, 62], [48, 55, 60, 67], [46, 53, 58, 65], [42, 49, 54, 61]],
];

const SECOES_BIOMA_S7 = [
  [[47, 54, 59, 63], [48, 55, 60, 67], [45, 52, 57, 64], [46, 53, 58, 63]],
  [[50, 57, 62, 69], [47, 54, 59, 63], [43, 50, 55, 62], [46, 53, 58, 63]],
  [[40, 47, 52, 59], [43, 50, 55, 62], [47, 54, 59, 63], [52, 59, 64, 71]],
  [[47, 54, 59, 63], [52, 59, 64, 71], [48, 55, 60, 67], [46, 53, 58, 63]],
];

const SECOES_BIOMA_S8 = [
  [[37, 44, 49, 56], [40, 47, 52, 59], [36, 43, 48, 55], [39, 46, 51, 58]],
  [[42, 49, 54, 61], [37, 44, 49, 56], [35, 42, 47, 54], [36, 43, 48, 55]],
  [[33, 40, 45, 52], [37, 44, 49, 56], [40, 47, 52, 59], [44, 51, 56, 63]],
  [[37, 44, 49, 56], [45, 52, 57, 64], [42, 49, 54, 61], [36, 43, 48, 55]],
];

const SECOES_BOSS = [
  [[40, 47, 52, 59], [39, 46, 51, 58], [36, 43, 48, 55], [41, 48, 53, 60]],
  [[43, 50, 55, 62], [40, 47, 52, 59], [38, 45, 50, 57], [39, 46, 51, 58]],
  [[45, 52, 57, 64], [43, 50, 55, 62], [40, 47, 52, 59], [47, 54, 59, 66]],
  [[40, 47, 52, 59], [48, 55, 60, 67], [45, 52, 57, 64], [39, 46, 51, 58]],
];

const SECOES_BOSS_P2 = [
  [[41, 48, 53, 60], [42, 49, 54, 61], [37, 44, 49, 56], [40, 47, 52, 59]],
  [[44, 51, 56, 63], [41, 48, 53, 60], [39, 46, 51, 58], [40, 47, 52, 59]],
  [[46, 53, 58, 65], [44, 51, 56, 63], [41, 48, 53, 60], [48, 55, 60, 67]],
  [[41, 48, 53, 60], [49, 56, 61, 68], [46, 53, 58, 65], [40, 47, 52, 59]],
];

const SECOES_BOSS_P3 = [
  [[36, 42, 48, 55], [37, 44, 49, 56], [39, 46, 51, 58], [35, 42, 47, 54]],
  [[41, 48, 53, 60], [36, 42, 48, 55], [34, 41, 46, 53], [35, 42, 47, 54]],
  [[43, 50, 55, 62], [41, 48, 53, 60], [36, 42, 48, 55], [44, 51, 56, 63]],
  [[36, 42, 48, 55], [46, 53, 58, 65], [43, 50, 55, 62], [35, 42, 47, 54]],
];

/**
 * Gera os 46 arquivos `.ogg` reais em `diretorioDestino` (default `<raiz>/assets/audio`) em 44.1 kHz Estéreo.
 */
export function gerarAssetsAudioOggSteam(diretorioDestino, opcoes = {}) {
  const escalaDuracao = Number(opcoes.escalaDuracao ?? 1.0);
  fs.mkdirSync(diretorioDestino, { recursive: true });
  const gerados = [];

  const receitasTrilhas = {
    HANGAR: () => sintetizarTrilhaMusicalEstereo({ compassosAlvo: 32, escalaDuracao, bpm: 96, acordesSecoes: SECOES_ZONA1, modoCombate: false, timbreZona: 'HANGAR', loopContinuo: true, seed: 11 }),
    LOJA_RECIFE: () => sintetizarTrilhaMusicalEstereo({ compassosAlvo: 26, escalaDuracao, bpm: 92, acordesSecoes: SECOES_LOJA_RECIFE, modoCombate: false, timbreZona: 'LOJA_RECIFE', loopContinuo: true, seed: 17 }),
    ZONA1_EXPLORE: () => sintetizarTrilhaMusicalEstereo({ compassosAlvo: 32, escalaDuracao, bpm: 108, acordesSecoes: SECOES_ZONA1, modoCombate: false, timbreZona: 'ZONA1', loopContinuo: true, seed: 21 }),
    ZONA1_COMBAT: () => sintetizarTrilhaMusicalEstereo({ compassosAlvo: 32, escalaDuracao, bpm: 108, acordesSecoes: SECOES_ZONA1, modoCombate: true, timbreZona: 'ZONA1', loopContinuo: true, seed: 22 }),
    BIOMA_S2_EXPLORE: () => sintetizarTrilhaMusicalEstereo({ compassosAlvo: 32, escalaDuracao, bpm: 102, acordesSecoes: SECOES_BIOMA_S2, modoCombate: false, timbreZona: 'BIOMA_S2', loopContinuo: true, seed: 25 }),
    BIOMA_S2_COMBAT: () => sintetizarTrilhaMusicalEstereo({ compassosAlvo: 32, escalaDuracao, bpm: 102, acordesSecoes: SECOES_BIOMA_S2, modoCombate: true, timbreZona: 'BIOMA_S2', loopContinuo: true, seed: 26 }),
    BIOMA_S3_EXPLORE: () => sintetizarTrilhaMusicalEstereo({ compassosAlvo: 32, escalaDuracao, bpm: 112, acordesSecoes: SECOES_BIOMA_S3, modoCombate: false, timbreZona: 'BIOMA_S3', loopContinuo: true, seed: 27 }),
    BIOMA_S3_COMBAT: () => sintetizarTrilhaMusicalEstereo({ compassosAlvo: 32, escalaDuracao, bpm: 112, acordesSecoes: SECOES_BIOMA_S3, modoCombate: true, timbreZona: 'BIOMA_S3', loopContinuo: true, seed: 28 }),
    ZONA2_EXPLORE: () => sintetizarTrilhaMusicalEstereo({ compassosAlvo: 32, escalaDuracao, bpm: 114, acordesSecoes: SECOES_ZONA2, modoCombate: false, timbreZona: 'ZONA2', loopContinuo: true, seed: 31 }),
    ZONA2_COMBAT: () => sintetizarTrilhaMusicalEstereo({ compassosAlvo: 32, escalaDuracao, bpm: 114, acordesSecoes: SECOES_ZONA2, modoCombate: true, timbreZona: 'ZONA2', loopContinuo: true, seed: 32 }),
    BIOMA_S5_EXPLORE: () => sintetizarTrilhaMusicalEstereo({ compassosAlvo: 32, escalaDuracao, bpm: 118, acordesSecoes: SECOES_BIOMA_S5, modoCombate: false, timbreZona: 'BIOMA_S5', loopContinuo: true, seed: 35 }),
    BIOMA_S5_COMBAT: () => sintetizarTrilhaMusicalEstereo({ compassosAlvo: 32, escalaDuracao, bpm: 118, acordesSecoes: SECOES_BIOMA_S5, modoCombate: true, timbreZona: 'BIOMA_S5', loopContinuo: true, seed: 36 }),
    ZONA3_EXPLORE: () => sintetizarTrilhaMusicalEstereo({ compassosAlvo: 32, escalaDuracao, bpm: 124, acordesSecoes: SECOES_ZONA3, modoCombate: false, timbreZona: 'ZONA3', loopContinuo: true, seed: 41 }),
    ZONA3_COMBAT: () => sintetizarTrilhaMusicalEstereo({ compassosAlvo: 32, escalaDuracao, bpm: 124, acordesSecoes: SECOES_ZONA3, modoCombate: true, timbreZona: 'ZONA3', loopContinuo: true, seed: 42 }),
    BIOMA_S7_EXPLORE: () => sintetizarTrilhaMusicalEstereo({ compassosAlvo: 32, escalaDuracao, bpm: 128, acordesSecoes: SECOES_BIOMA_S7, modoCombate: false, timbreZona: 'BIOMA_S7', loopContinuo: true, seed: 45 }),
    BIOMA_S7_COMBAT: () => sintetizarTrilhaMusicalEstereo({ compassosAlvo: 32, escalaDuracao, bpm: 128, acordesSecoes: SECOES_BIOMA_S7, modoCombate: true, timbreZona: 'BIOMA_S7', loopContinuo: true, seed: 46 }),
    BIOMA_S8_EXPLORE: () => sintetizarTrilhaMusicalEstereo({ compassosAlvo: 32, escalaDuracao, bpm: 132, acordesSecoes: SECOES_BIOMA_S8, modoCombate: false, timbreZona: 'BIOMA_S8', loopContinuo: true, seed: 47 }),
    BIOMA_S8_COMBAT: () => sintetizarTrilhaMusicalEstereo({ compassosAlvo: 32, escalaDuracao, bpm: 132, acordesSecoes: SECOES_BIOMA_S8, modoCombate: true, timbreZona: 'BIOMA_S8', loopContinuo: true, seed: 48 }),
    BOSS_DRAGA: () => sintetizarTrilhaMusicalEstereo({ compassosAlvo: 48, escalaDuracao, bpm: 136, acordesSecoes: SECOES_BOSS, modoCombate: true, timbreZona: 'BOSS', ehBoss: true, loopContinuo: true, seed: 88 }),
    BOSS_DRAGA_FASE2: () => sintetizarTrilhaMusicalEstereo({ compassosAlvo: 48, escalaDuracao, bpm: 142, acordesSecoes: SECOES_BOSS_P2, modoCombate: true, timbreZona: 'BOSS_P2', ehBoss: true, loopContinuo: true, seed: 89 }),
    BOSS_DRAGA_FASE3: () => sintetizarTrilhaMusicalEstereo({ compassosAlvo: 48, escalaDuracao, bpm: 150, acordesSecoes: SECOES_BOSS_P3, modoCombate: true, timbreZona: 'BOSS_P3', ehBoss: true, loopContinuo: true, seed: 90 }),
    VITORIA: () => sintetizarTrilhaMusicalEstereo({ compassosAlvo: 10, escalaDuracao, bpm: 112, acordesSecoes: [[[52, 59, 64, 71], [55, 62, 67, 74], [57, 64, 69, 76], [60, 67, 72, 79]]], modoCombate: false, timbreZona: 'FANFARRA', ehFanfarra: 'VITORIA', loopContinuo: false, seed: 91 }),
    DERROTA: () => sintetizarTrilhaMusicalEstereo({ compassosAlvo: 8, escalaDuracao, bpm: 72, acordesSecoes: [[[45, 48, 52, 57], [43, 46, 50, 55], [41, 44, 48, 53], [40, 43, 47, 52]]], modoCombate: false, timbreZona: 'FANFARRA', ehFanfarra: 'DERROTA', loopContinuo: false, seed: 92 }),
    AMBIENCIA_HIDROFONE: () => sintetizarAmbienciaHidrofone(escalaDuracao === 1.0 ? 64 : Math.max(4, 64 * escalaDuracao), 1),
    AMBIENCIA_SETOR_2: () => sintetizarAmbienciaHidrofone(escalaDuracao === 1.0 ? 64 : Math.max(4, 64 * escalaDuracao), 2),
    AMBIENCIA_SETOR_3: () => sintetizarAmbienciaHidrofone(escalaDuracao === 1.0 ? 64 : Math.max(4, 64 * escalaDuracao), 3),
    AMBIENCIA_SETOR_4: () => sintetizarAmbienciaHidrofone(escalaDuracao === 1.0 ? 64 : Math.max(4, 64 * escalaDuracao), 4),
    AMBIENCIA_SETOR_5: () => sintetizarAmbienciaHidrofone(escalaDuracao === 1.0 ? 64 : Math.max(4, 64 * escalaDuracao), 5),
    AMBIENCIA_SETOR_6: () => sintetizarAmbienciaHidrofone(escalaDuracao === 1.0 ? 64 : Math.max(4, 64 * escalaDuracao), 6),
    AMBIENCIA_SETOR_7: () => sintetizarAmbienciaHidrofone(escalaDuracao === 1.0 ? 64 : Math.max(4, 64 * escalaDuracao), 7),
    AMBIENCIA_SETOR_8: () => sintetizarAmbienciaHidrofone(escalaDuracao === 1.0 ? 64 : Math.max(4, 64 * escalaDuracao), 8),
  };

  const mapaTrilhasCpp20 =
    escalaDuracao === 1.0 && opcoes.usarMotorCpp20 !== false
      ? renderizarTrilhasMusicaisCpp20ParaOgg(diretorioDestino, opcoes.ffmpegBin)
      : null;

  for (const [id, meta] of Object.entries(MANIFESTO_TRILHAS_OGG_STEAM)) {
    if (mapaTrilhasCpp20 && mapaTrilhasCpp20.has(id)) {
      gerados.push({ id, tipo: 'MUSICA', arquivo: meta.arquivo, bytes: mapaTrilhasCpp20.get(id), motor: 'CPP20_BS1770' });
      continue;
    }
    const { esq, dir } = receitasTrilhas[id]();
    const outPath = path.join(diretorioDestino, meta.arquivo);
    const bytes = codificarPcmStereoParaOgg(esq, dir, outPath, opcoes.ffmpegBin);
    gerados.push({ id, tipo: 'MUSICA', arquivo: meta.arquivo, bytes });
  }

  for (const [id, meta] of Object.entries(MANIFESTO_FOLEY_OGG_STEAM)) {
    const { esq, dir } = sintetizarFoleyHidroacustico(id);
    const outPath = path.join(diretorioDestino, meta.arquivo);
    const bytes = codificarPcmStereoParaOgg(esq, dir, outPath, opcoes.ffmpegBin);
    gerados.push({ id, tipo: 'FOLEY', arquivo: meta.arquivo, bytes });
  }

  return Object.freeze({
    totalArquivos: gerados.length,
    arquivos: Object.freeze(gerados),
  });
}

const ehExecucaoDireta = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (ehExecucaoDireta) {
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const dest = path.join(raiz, 'assets', 'audio');
  const res = gerarAssetsAudioOggSteam(dest);
  console.log(`[audio-ogg] ${res.totalArquivos} arquivos .ogg gerados em ${dest}`);
}
