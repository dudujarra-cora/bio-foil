import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verificarCadeiaTestesEMutacoes } from '../src/gdd-parser.mjs';

const DIRETORIO_RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const VARIAVEIS_GIT_HOOK = [
  'GIT_DIR',
  'GIT_INDEX_FILE',
  'GIT_WORK_TREE',
  'GIT_PREFIX',
  'GIT_COMMON_DIR',
  'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
];

test('Seção 5 + N4: prova real de isolamento de GIT_DIR/GIT_INDEX_FILE em hooks (core.bare permanece false)', () => {
  const raizTeste = fs.mkdtempSync(path.join(os.tmpdir(), 'ftl-secao5-hook-'));
  const repoPrincipalSimulado = path.join(raizTeste, 'repo-principal');
  const pastaTmpSemUnset = path.join(raizTeste, 'tmp-sem-unset');
  const pastaTmpComUnset = path.join(raizTeste, 'tmp-com-unset');

  try {
    fs.mkdirSync(repoPrincipalSimulado, { recursive: true });
    fs.mkdirSync(pastaTmpSemUnset, { recursive: true });
    fs.mkdirSync(pastaTmpComUnset, { recursive: true });

    // 1. Cria um repositório principal isolado + uma worktree real para obter o GIT_DIR real de worktree
    execFileSync('git', ['init', '-b', 'main'], { cwd: repoPrincipalSimulado });
    execFileSync('git', ['config', 'user.email', 'teste@biofoil.local'], { cwd: repoPrincipalSimulado });
    execFileSync('git', ['config', 'user.name', 'Teste BioFoil'], { cwd: repoPrincipalSimulado });
    fs.writeFileSync(path.join(repoPrincipalSimulado, 'README.md'), '# Teste\n', 'utf8');
    execFileSync('git', ['add', 'README.md'], { cwd: repoPrincipalSimulado });
    execFileSync('git', ['commit', '-m', 'init'], { cwd: repoPrincipalSimulado });

    const wtSimulada = path.join(raizTeste, 'wt-simulada');
    execFileSync('git', ['worktree', 'add', '-b', 'ramo-wt', wtSimulada, 'main'], {
      cwd: repoPrincipalSimulado,
    });

    const bareInicial = execFileSync('git', ['config', '--get', 'core.bare'], {
      cwd: repoPrincipalSimulado,
      encoding: 'utf8',
    }).trim();
    assert.equal(bareInicial, 'false');

    // Ambiente contaminado idêntico ao que o Git exporta dentro de um hook de worktree (.git/worktrees/wt-simulada)
    const gitDirWorktree = path.join(repoPrincipalSimulado, '.git', 'worktrees', 'wt-simulada');
    const envContaminado = {
      ...process.env,
      GIT_DIR: gitDirWorktree,
      GIT_INDEX_FILE: path.join(gitDirWorktree, 'index'),
    };

    // 2. PROVA COM O UNSET DO NOSSO HOOK: rodar git init numa pasta temporária limpando as 7 variáveis
    // mantém o repositório principal com core.bare=false
    const envLimpoPeloHook = { ...envContaminado };
    for (const nomeVar of VARIAVEIS_GIT_HOOK) {
      delete envLimpoPeloHook[nomeVar];
    }

    execFileSync('git', ['init', '-b', 'main'], {
      cwd: pastaTmpComUnset,
      env: envLimpoPeloHook,
    });

    const bareAposComUnset = execFileSync('git', ['config', '--get', 'core.bare'], {
      cwd: repoPrincipalSimulado,
      encoding: 'utf8',
    }).trim();
    assert.equal(
      bareAposComUnset,
      'false',
      '[Seção 5] Com o unset das 7 variáveis do hook, o repositório principal DEVE permanecer core.bare=false'
    );

    // 3. PROVA CONTRA-FACTUAL (sem o unset tem que corromper / dar diferente):
    // Demonstra o exato fenômeno medido na Seção 5 quando GIT_DIR vaza para um git init em pasta temporária
    execFileSync('git', ['init', '-b', 'main'], {
      cwd: pastaTmpSemUnset,
      env: envContaminado,
    });
    const bareAposSemUnset = execFileSync('git', ['config', '--get', 'core.bare'], {
      cwd: repoPrincipalSimulado,
      encoding: 'utf8',
    }).trim();
    assert.equal(
      bareAposSemUnset,
      'true',
      '[Seção 5] Sem unset de GIT_DIR, git init em pasta temporária marca o principal como core.bare=true'
    );

    // 4. Verifica que os scripts reais de hook (pre-commit e pre-push) existem e contêm o unset obrigatório
    const hooksVerificados = ['scripts/hooks/pre-commit', 'scripts/hooks/pre-push'];
    for (const relPath of hooksVerificados) {
      const conteudoHook = fs.readFileSync(path.join(DIRETORIO_RAIZ, relPath), 'utf8');
      assert.match(
        conteudoHook,
        /unset GIT_DIR GIT_INDEX_FILE GIT_WORK_TREE GIT_PREFIX GIT_COMMON_DIR GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES/,
        `O hook ${relPath} deve conter o unset das 7 variáveis no topo`
      );
      assert.match(
        conteudoHook,
        /git --git-dir="\$MAIN_GIT_DIR" config --get core\.bare/,
        `O hook ${relPath} deve verificar core.bare no repositório principal via --git-dir="$MAIN_GIT_DIR"`
      );
    }

    const auditoriaTestesMutacoes = verificarCadeiaTestesEMutacoes(DIRETORIO_RAIZ);
    assert.equal(auditoriaTestesMutacoes.totalTestesExaminados, 2, 'Cadeia de testes Onda 0 deve ter 2 suítes');
    assert.ok(auditoriaTestesMutacoes.totalMutacoesExaminadas >= 8, 'MUTACOES.md deve ter pelo menos 8 mutações registradas');

    // Prova do Tripwire L5 na pasta tests/: arquivo .test.mjs fora da lista deve dar vermelho
    const tmpProjeto = path.join(raizTeste, 'projeto-tripwire-testes');
    fs.mkdirSync(path.join(tmpProjeto, 'tests'), { recursive: true });
    for (const nomeTeste of auditoriaTestesMutacoes.testesDeclarados) {
      fs.writeFileSync(path.join(tmpProjeto, 'tests', nomeTeste), '// ok\n', 'utf8');
    }
    fs.writeFileSync(path.join(tmpProjeto, 'tests', '99-intruso-nao-declarado.test.mjs'), '// intruso\n', 'utf8');
    assert.throws(
      () => verificarCadeiaTestesEMutacoes(tmpProjeto),
      /\[L5 TRIPWIRE TESTES FALHOU\]/,
      'Arquivo .test.mjs fora da cadeia canônica deve reprovar no tripwire L5'
    );

    console.log(
      `[N4] Variáveis de ambiente de hook examinadas: ${VARIAVEIS_GIT_HOOK.length}, scripts de hook examinados: ${hooksVerificados.length}, suítes de teste: ${auditoriaTestesMutacoes.totalTestesExaminados}, mutações registradas: ${auditoriaTestesMutacoes.totalMutacoesExaminadas}`
    );
  } finally {
    fs.rmSync(raizTeste, { recursive: true, force: true });
  }
});
