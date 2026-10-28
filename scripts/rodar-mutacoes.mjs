#!/usr/bin/env node
/**
 * B6 / Lei L6 / Lei L7: executor REAL de mutações.
 *
 * Para cada mutação de padrao/protocolo/mutacoes.json:
 *   1. copia o projeto inteiro para uma pasta descartável (o checkout vivo NUNCA é tocado);
 *   2. aplica as trocas (cada "buscar" tem de existir exatamente 1 vez — senão a mutação está desatualizada);
 *   3. roda os testes declarados da mutação;
 *   4. lê a 1ª linha de falha REAL da saída e confere com "falhaEsperada".
 * Antes de tudo roda uma linha de base sem mutação: se a cópia não estiver verde, qualquer vermelho seria pela
 * razão errada (L6), então o executor aborta.
 *
 * Uso: node scripts/rodar-mutacoes.mjs            (mede e imprime)
 *      node scripts/rodar-mutacoes.mjs --gerar-md (mede e reescreve só o bloco GERADO de MUTACOES.md)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CAMINHO_SCRIPT_ATUAL = fileURLToPath(import.meta.url);
const MARCADOR_INICIO = '<!-- INICIO BLOCO GERADO POR scripts/rodar-mutacoes.mjs — NÃO EDITAR À MÃO -->';
const MARCADOR_FIM = '<!-- FIM BLOCO GERADO -->';

function ambienteSemGit() {
  const env = { ...process.env };
  for (const chave of Object.keys(env)) {
    if (chave.startsWith('GIT_')) delete env[chave];
  }
  // B16: sem isso, o `node --test` filho entra em modo "child" e sai 0 mesmo com teste falhando
  delete env.NODE_TEST_CONTEXT;
  return env;
}

export function copiarProjeto(origem, destino, emAssets = false) {
  for (const entrada of fs.readdirSync(origem, { withFileTypes: true })) {
    if (entrada.name === '.git' || entrada.name === 'node_modules' || entrada.name === '.worktrees') continue;
    const de = path.join(origem, entrada.name);
    const para = path.join(destino, entrada.name);
    const subEmAssets = emAssets || entrada.name === 'assets';
    if (entrada.isDirectory()) {
      fs.mkdirSync(para, { recursive: true });
      copiarProjeto(de, para, subEmAssets);
    } else if (entrada.isFile()) {
      if (subEmAssets) {
        try {
          fs.linkSync(de, para);
          continue;
        } catch {
          // fallback para copia integral quando origem e destino estao em filesystems distintos (EXDEV)
        }
      }
      fs.copyFileSync(de, para);
      fs.chmodSync(para, fs.statSync(de).mode);
    }
  }
}

export function primeiraLinhaDeFalha(saida) {
  const aposFalhas = saida.split('failing tests:')[1] ?? '';
  const linha = aposFalhas
    .split('\n')
    .map((l) => l.trim())
    .find((l) => /^(AssertionError|Error|TypeError|ReferenceError|SyntaxError)\b/.test(l));
  return linha ?? '';
}

function rodarTestes(diretorio, testes) {
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=spec', ...testes], {
    cwd: diretorio,
    env: ambienteSemGit(),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return { status: r.status, saida: `${r.stdout ?? ''}\n${r.stderr ?? ''}` };
}

function rodarTestesAsync(diretorio, testes) {
  return new Promise((resolve) => {
    const filho = spawn(process.execPath, ['--test', '--test-reporter=spec', ...testes], {
      cwd: diretorio,
      env: ambienteSemGit(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const pedacosOut = [];
    const pedacosErr = [];
    filho.stdout.on('data', (d) => pedacosOut.push(d));
    filho.stderr.on('data', (d) => pedacosErr.push(d));
    filho.on('error', (err) => {
      resolve({ status: 1, saida: String(err?.stack ?? err) });
    });
    filho.on('close', (code) => {
      const stdout = Buffer.concat(pedacosOut).toString('utf8');
      const stderr = Buffer.concat(pedacosErr).toString('utf8');
      resolve({ status: code ?? 1, saida: `${stdout}\n${stderr}` });
    });
  });
}

function prepararTrocasMutacao(tmp, m) {
  const conteudosPorRel = new Map();
  for (const troca of m.trocas) {
    const relAlvo = troca.arquivo ?? m.arquivo;
    if (!conteudosPorRel.has(relAlvo)) {
      conteudosPorRel.set(relAlvo, fs.readFileSync(path.join(tmp, relAlvo), 'utf8'));
    }
    let conteudo = conteudosPorRel.get(relAlvo);
    const ocorrencias = conteudo.split(troca.buscar).length - 1;
    if (ocorrencias !== 1) {
      return {
        ok: false,
        desatualizada: `trecho "${troca.buscar.slice(0, 60)}" aparece ${ocorrencias}x em ${relAlvo} (esperado 1x)`,
      };
    }
    conteudo = conteudo.replace(troca.buscar, () => troca.substituir);
    conteudosPorRel.set(relAlvo, conteudo);
  }
  for (const [relAlvo, conteudo] of conteudosPorRel.entries()) {
    fs.writeFileSync(path.join(tmp, relAlvo), conteudo, 'utf8');
  }
  return { ok: true, desatualizada: null };
}

async function executarLoteMutacoesParalelo(raiz, mutacoes, concorrenciaMax) {
  const total = mutacoes.length;
  const resultados = new Array(total);
  let proximoIndice = 0;
  let ativos = 0;

  const paralelismoDisponivel = os.availableParallelism();
  const trabalhadoresPadrao =
    paralelismoDisponivel <= 4 ? paralelismoDisponivel : Math.floor(paralelismoDisponivel / 2);
  const limiteEfetivo = Math.max(1, Math.min(concorrenciaMax ?? Math.min(6, Math.max(2, trabalhadoresPadrao)), total));

  const esperarFolgaCarga = async () => {
    while (ativos >= 2 && os.loadavg()[0] >= 14.5) {
      await new Promise((r) => setTimeout(r, 180));
    }
  };

  const trabalhador = async () => {
    while (true) {
      await esperarFolgaCarga();
      const idx = proximoIndice;
      if (idx >= total) return;
      proximoIndice += 1;
      ativos += 1;
      const m = mutacoes[idx];
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `ftl-${m.id}-`));
      try {
        copiarProjeto(raiz, tmp);
        const prep = prepararTrocasMutacao(tmp, m);
        if (!prep.ok) {
          resultados[idx] = { id: m.id, vermelho: false, linha: '', confere: false, desatualizada: prep.desatualizada };
        } else {
          const r = await rodarTestesAsync(tmp, m.testes);
          const linha = primeiraLinhaDeFalha(r.saida);
          resultados[idx] = {
            id: m.id,
            vermelho: r.status !== 0,
            linha,
            confere: r.status !== 0 && linha.includes(m.falhaEsperada),
            desatualizada: null,
          };
        }
      } finally {
        ativos -= 1;
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    }
  };

  await Promise.all(Array.from({ length: limiteEfetivo }, () => trabalhador()));
  return resultados;
}

export function carregarMutacoes(raiz) {
  const json = JSON.parse(fs.readFileSync(path.join(raiz, 'padrao', 'protocolo', 'mutacoes.json'), 'utf8'));
  return json.mutacoes;
}

export function executarMutacoes(raiz, { ids = null, concorrencia = null } = {}) {
  const mutacoes = carregarMutacoes(raiz).filter((m) => !ids || ids.includes(m.id));
  const testesUsados = [...new Set(mutacoes.flatMap((m) => m.testes))];

  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'ftl-mut-base-'));
  let baseline;
  try {
    copiarProjeto(raiz, base);
    baseline = rodarTestes(base, testesUsados);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
  if (baseline.status !== 0) {
    throw new Error(
      `[L6 LINHA DE BASE VERMELHA] A cópia sem mutação já falha; nenhum vermelho de mutação prova nada. 1ª falha: ${primeiraLinhaDeFalha(baseline.saida)}`
    );
  }

  if (mutacoes.length > 2 && concorrencia !== 1) {
    const dirCoord = fs.mkdtempSync(path.join(os.tmpdir(), 'ftl-mut-coord-'));
    try {
      const arqIn = path.join(dirCoord, 'entrada.json');
      const arqOut = path.join(dirCoord, 'saida.json');
      fs.writeFileSync(arqIn, JSON.stringify({ raiz, mutacoes, concorrencia }), 'utf8');
      const coord = spawnSync(
        process.execPath,
        [CAMINHO_SCRIPT_ATUAL, '--coordenador-paralelo-interno', arqIn, arqOut],
        {
          cwd: raiz,
          env: ambienteSemGit(),
          encoding: 'utf8',
          maxBuffer: 64 * 1024 * 1024,
        }
      );
      if (coord.status === 0 && fs.existsSync(arqOut)) {
        const resultados = JSON.parse(fs.readFileSync(arqOut, 'utf8'));
        return { baselineVerde: true, testesBase: testesUsados, resultados };
      }
    } finally {
      fs.rmSync(dirCoord, { recursive: true, force: true });
    }
  }

  const resultados = [];
  for (const m of mutacoes) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `ftl-${m.id}-`));
    try {
      copiarProjeto(raiz, tmp);
      const prep = prepararTrocasMutacao(tmp, m);
      if (!prep.ok) {
        resultados.push({ id: m.id, vermelho: false, linha: '', confere: false, desatualizada: prep.desatualizada });
        continue;
      }
      const r = rodarTestes(tmp, m.testes);
      const linha = primeiraLinhaDeFalha(r.saida);
      resultados.push({
        id: m.id,
        vermelho: r.status !== 0,
        linha,
        confere: r.status !== 0 && linha.includes(m.falhaEsperada),
        desatualizada: null,
      });
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
  return { baselineVerde: true, testesBase: testesUsados, resultados };
}

export function renderizarBlocoMd(mutacoes, resultados) {
  const porId = Object.fromEntries(resultados.map((r) => [r.id, r]));
  const limpar = (s) => String(s).replace(/\|/g, '/').replace(/`/g, "'");
  const linhas = [
    MARCADOR_INICIO,
    '',
    '| ID | Alvo | Lei | Mutação (muda o significado, nunca a forma) | 1ª linha de falha real medida |',
    '| :--- | :--- | :---: | :--- | :--- |',
    ...mutacoes.map((m) => {
      const r = porId[m.id];
      return `| \`${m.id}\` | \`${limpar(m.arquivo)}\` | **${limpar(m.lei)}** | ${limpar(m.descricao)} | \`${limpar(r?.linha ?? 'NÃO MEDIDA')}\` |`;
    }),
    '',
    MARCADOR_FIM,
  ];
  return linhas.join('\n');
}

export function extrairBlocoMd(conteudoMd) {
  const ini = conteudoMd.indexOf(MARCADOR_INICIO);
  const fim = conteudoMd.indexOf(MARCADOR_FIM);
  if (ini < 0 || fim < 0 || fim < ini) return null;
  return conteudoMd.slice(ini, fim + MARCADOR_FIM.length);
}

export function executarCliMutacoes(
  raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  args = process.argv.slice(2),
  ids = null
) {
  const mutacoes = carregarMutacoes(raiz).filter((m) => !ids || ids.includes(m.id));
  const { resultados } = executarMutacoes(raiz, { ids });
  let falhas = 0;
  for (const r of resultados) {
    const ok = r.confere;
    if (!ok) falhas += 1;
    console.log(`${ok ? 'OK ' : 'XX '} ${r.id} | vermelho=${r.vermelho} | ${r.desatualizada ?? r.linha}`);
  }
  console.log(`[N4] Mutações executadas: ${resultados.length} | conferem: ${resultados.length - falhas}`);
  if (args.includes('--gerar-md')) {
    const caminho = path.join(raiz, 'padrao', 'protocolo', 'MUTACOES.md');
    const atual = fs.readFileSync(caminho, 'utf8');
    const novoBloco = renderizarBlocoMd(mutacoes, resultados);
    const blocoAtual = extrairBlocoMd(atual);
    const novo = blocoAtual ? atual.replace(blocoAtual, novoBloco) : `${atual.trimEnd()}\n\n${novoBloco}\n`;
    fs.writeFileSync(caminho, novo, 'utf8');
    console.log(`Bloco gerado de MUTACOES.md atualizado (${mutacoes.length} mutações).`);
  }
  return falhas === 0 ? 0 : 1;
}

const executadoDiretamente = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (executadoDiretamente) {
  if (process.argv[2] === '--coordenador-paralelo-interno') {
    const arqIn = process.argv[3];
    const arqOut = process.argv[4];
    const { raiz, mutacoes, concorrencia } = JSON.parse(fs.readFileSync(arqIn, 'utf8'));
    executarLoteMutacoesParalelo(raiz, mutacoes, concorrencia)
      .then((resultados) => {
        fs.writeFileSync(arqOut, JSON.stringify(resultados), 'utf8');
        process.exit(0);
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  } else {
    process.exit(executarCliMutacoes());
  }
}
