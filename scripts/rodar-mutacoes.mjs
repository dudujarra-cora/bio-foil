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
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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

export function copiarProjeto(origem, destino) {
  for (const entrada of fs.readdirSync(origem, { withFileTypes: true })) {
    if (entrada.name.startsWith('.') || entrada.name === 'node_modules') continue;
    const de = path.join(origem, entrada.name);
    const para = path.join(destino, entrada.name);
    if (entrada.isDirectory()) {
      fs.mkdirSync(para, { recursive: true });
      copiarProjeto(de, para);
    } else if (entrada.isFile()) {
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

export function carregarMutacoes(raiz) {
  const json = JSON.parse(fs.readFileSync(path.join(raiz, 'padrao', 'protocolo', 'mutacoes.json'), 'utf8'));
  return json.mutacoes;
}

export function executarMutacoes(raiz, { ids = null } = {}) {
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

  const resultados = [];
  for (const m of mutacoes) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `ftl-${m.id}-`));
    try {
      copiarProjeto(raiz, tmp);
      const alvo = path.join(tmp, m.arquivo);
      let conteudo = fs.readFileSync(alvo, 'utf8');
      let desatualizada = null;
      for (const troca of m.trocas) {
        const ocorrencias = conteudo.split(troca.buscar).length - 1;
        if (ocorrencias !== 1) {
          desatualizada = `trecho "${troca.buscar.slice(0, 60)}" aparece ${ocorrencias}x em ${m.arquivo} (esperado 1x)`;
          break;
        }
        conteudo = conteudo.replace(troca.buscar, () => troca.substituir);
      }
      if (desatualizada) {
        resultados.push({ id: m.id, vermelho: false, linha: '', confere: false, desatualizada });
        continue;
      }
      fs.writeFileSync(alvo, conteudo, 'utf8');
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

const executadoDiretamente = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (executadoDiretamente) {
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const mutacoes = carregarMutacoes(raiz);
  const { resultados } = executarMutacoes(raiz);
  let falhas = 0;
  for (const r of resultados) {
    const ok = r.confere;
    if (!ok) falhas += 1;
    console.log(`${ok ? 'OK ' : 'XX '} ${r.id} | vermelho=${r.vermelho} | ${r.desatualizada ?? r.linha}`);
  }
  console.log(`[N4] Mutações executadas: ${resultados.length} | conferem: ${resultados.length - falhas}`);
  if (process.argv.includes('--gerar-md')) {
    const caminho = path.join(raiz, 'padrao', 'protocolo', 'MUTACOES.md');
    const atual = fs.readFileSync(caminho, 'utf8');
    const novoBloco = renderizarBlocoMd(mutacoes, resultados);
    const blocoAtual = extrairBlocoMd(atual);
    const novo = blocoAtual ? atual.replace(blocoAtual, novoBloco) : `${atual.trimEnd()}\n\n${novoBloco}\n`;
    fs.writeFileSync(caminho, novo, 'utf8');
    console.log(`Bloco gerado de MUTACOES.md atualizado (${mutacoes.length} mutações).`);
  }
  process.exit(falhas === 0 ? 0 : 1);
}
