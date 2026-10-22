import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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

function ambienteSemGit() {
  const env = { ...process.env };
  for (const chave of Object.keys(env)) {
    if (chave.startsWith('GIT_')) delete env[chave];
  }
  return env;
}

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, env: ambienteSemGit(), encoding: 'utf8' });
  return { status: r.status, saida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

function gitOk(cwd, args) {
  const r = git(cwd, args);
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} falhou: ${r.saida}`);
  return r.saida.trim();
}

const TESTE_MINIMO = `import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
test('minimo', () => {
  // Seção 5: este git init herda o ambiente do hook; se o hook não limpar GIT_DIR, corrompe o principal
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ftl-minimo-'));
  execFileSync('git', ['init', '-q'], { cwd: tmp });
  fs.rmSync(tmp, { recursive: true, force: true });
  assert.equal(fs.readFileSync(path.join(raiz, 'alvo.txt'), 'utf8').trim(), 'BOM', 'alvo.txt testado precisa ser BOM');
});
`;

/**
 * Monta um repositório descartável com os hooks REAIS do projeto (copiados de scripts/hooks).
 * L1: o hook roda de verdade, disparado pelo próprio git — nada é simulado.
 */
function montarRepoComHooksReais(raiz) {
  const repo = path.join(raiz, 'repo');
  fs.mkdirSync(path.join(repo, 'scripts', 'hooks'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'tests'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'padrao', 'protocolo'), { recursive: true });
  for (const hook of ['pre-commit', 'pre-push']) {
    const destino = path.join(repo, 'scripts', 'hooks', hook);
    fs.copyFileSync(path.join(DIRETORIO_RAIZ, 'scripts', 'hooks', hook), destino);
    fs.chmodSync(destino, 0o755);
  }
  fs.writeFileSync(path.join(repo, 'alvo.txt'), 'BOM\n', 'utf8');
  fs.writeFileSync(path.join(repo, 'tests', '01-minimo.test.mjs'), TESTE_MINIMO, 'utf8');
  fs.writeFileSync(
    path.join(repo, 'padrao', 'protocolo', 'PORTOES.md'),
    '| Portão | Status | Motivo | Desde | Evidência |\n| :--- | :--- | :--- | :--- | :--- |\n| `tests/01-minimo.test.mjs` | OBRIGATORIO | minimo | 2026-10-22 | `abc1234` 3/3 |\n',
    'utf8'
  );
  gitOk(repo, ['init', '-q', '-b', 'main']);
  gitOk(repo, ['config', 'user.email', 'teste@biofoil.local']);
  gitOk(repo, ['config', 'user.name', 'Teste BioFoil']);
  gitOk(repo, ['config', 'commit.gpgsign', 'false']);
  gitOk(repo, [
    'add',
    'alvo.txt',
    'tests/01-minimo.test.mjs',
    'padrao/protocolo/PORTOES.md',
    'scripts/hooks/pre-commit',
    'scripts/hooks/pre-push',
  ]);
  gitOk(repo, ['commit', '-q', '-m', 'init']); // hooksPath ainda não ativo
  gitOk(repo, ['config', 'core.hooksPath', 'scripts/hooks']);
  gitOk(repo, ['switch', '-q', '-c', 'frente/teste']);
  return repo;
}

test('Seção 5 REAL: hook pre-commit disparado pelo git numa worktree mantém o principal com core.bare=false', () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'ftl-secao5-real-'));
  try {
    const repo = montarRepoComHooksReais(raiz);
    const wt = path.join(raiz, 'wt');
    gitOk(repo, ['worktree', 'add', '-q', '-b', 'frente/wt', wt]);
    fs.writeFileSync(path.join(wt, 'novo.txt'), 'x\n', 'utf8');
    gitOk(wt, ['add', 'novo.txt']);
    const commit = git(wt, ['commit', '-m', 'commit na worktree']); // o git exporta GIT_DIR=.git/worktrees/wt ao hook
    const bare = gitOk(repo, ['config', '--get', 'core.bare']);
    assert.equal(bare, 'false', `[Seção 5 REAL] core.bare do principal virou "${bare}" após commit na worktree`);
    assert.equal(commit.status, 0, `[Seção 5 REAL] commit legítimo na worktree foi recusado: ${commit.saida}`);
    assert.match(commit.saida, /\[N4\] Portoes obrigatorios examinados no pre-commit: 1/, 'O hook tem de ter rodado de verdade');
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
});

test('B4 REAL: pre-commit testa o CONTEÚDO DO COMMIT (índice), nunca a árvore de trabalho', () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'ftl-b4-real-'));
  try {
    const repo = montarRepoComHooksReais(raiz);
    const alvo = path.join(repo, 'alvo.txt');

    // B4a: índice RUIM, árvore BOM -> o commit levaria RUIM -> tem de ser recusado
    fs.writeFileSync(alvo, 'RUIM\n', 'utf8');
    gitOk(repo, ['add', 'alvo.txt']);
    fs.writeFileSync(alvo, 'BOM\n', 'utf8');
    const b4a = git(repo, ['commit', '-m', 'indice ruim']);
    assert.notEqual(b4a.status, 0, '[B4 REAL] commit com índice RUIM passou porque o hook leu a árvore de trabalho');

    // Controle (L6): índice BOM e árvore BOM -> tem de passar (prova que o hook não reprova tudo)
    gitOk(repo, ['add', 'alvo.txt']);
    fs.writeFileSync(path.join(repo, 'extra.txt'), 'e\n', 'utf8');
    gitOk(repo, ['add', 'extra.txt']);
    const controle = git(repo, ['commit', '-m', 'controle']);
    assert.equal(controle.status, 0, `[B4 REAL] commit legítimo recusado: ${controle.saida}`);

    // B4b: commit parcial `git commit alvo.txt` — o git usa índice temporário com a árvore (RUIM) -> tem de ser recusado
    fs.writeFileSync(alvo, 'RUIM\n', 'utf8');
    const b4b = git(repo, ['commit', '-m', 'parcial', 'alvo.txt']);
    assert.notEqual(b4b.status, 0, '[B4b REAL] commit parcial com conteúdo RUIM passou porque o hook leu o índice errado');
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
});

test('N5 REAL: pre-commit recusa commit direto na main', () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'ftl-n5-real-'));
  try {
    const repo = montarRepoComHooksReais(raiz);
    gitOk(repo, ['switch', '-q', 'main']);
    fs.writeFileSync(path.join(repo, 'na-main.txt'), 'm\n', 'utf8');
    gitOk(repo, ['add', 'na-main.txt']);
    const naMain = git(repo, ['commit', '-m', 'direto na main']);
    assert.notEqual(naMain.status, 0, '[N5 REAL] commit direto na main foi aceito');
    assert.match(naMain.saida, /Lei N5/, '[N5 REAL] recusa tem de citar a Lei N5');
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
});

test('PRE-PUSH REAL: pre-push testa o que está em HEAD, não a árvore de trabalho', () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'ftl-prepush-real-'));
  try {
    const repo = montarRepoComHooksReais(raiz);
    const remoto = path.join(raiz, 'remoto.git');
    gitOk(raiz, ['init', '-q', '--bare', remoto]);
    gitOk(repo, ['remote', 'add', 'origin', remoto]);
    fs.writeFileSync(path.join(repo, 'alvo.txt'), 'RUIM\n', 'utf8'); // árvore suja, HEAD limpo
    const push = git(repo, ['push', '-q', 'origin', 'frente/teste']);
    assert.equal(push.status, 0, `[PRE-PUSH REAL] push de HEAD limpo recusado por causa da árvore suja: ${push.saida}`);
    assert.match(push.saida, /\[N4\] Portoes obrigatorios examinados no pre-push: 1/, 'O pre-push tem de ter rodado de verdade');
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
});

test('Seção 5 + L5 + N3 + N4: hooks contêm o unset no topo; tripwires de 6 áreas, PORTOES.md e engines', () => {
  const hooksVerificados = ['scripts/hooks/pre-commit', 'scripts/hooks/pre-push'];
  for (const relPath of hooksVerificados) {
    const linhas = fs.readFileSync(path.join(DIRETORIO_RAIZ, relPath), 'utf8').split('\n');
    const idxUnset = linhas.findIndex((l) => l.startsWith(`unset ${VARIAVEIS_GIT_HOOK.join(' ')}`));
    const idxPrimeiroGit = linhas.findIndex((l) => /\bgit\b/.test(l) && !l.startsWith('#') && !l.startsWith('unset'));
    assert.ok(idxUnset >= 0, `O hook ${relPath} deve conter o unset das 7 variáveis`);
    assert.ok(idxUnset < idxPrimeiroGit, `O unset de ${relPath} tem de vir antes de qualquer comando git`);
  }

  const auditoria = verificarCadeiaTestesEMutacoes(DIRETORIO_RAIZ);
  const totalNoJson = JSON.parse(
    fs.readFileSync(path.join(DIRETORIO_RAIZ, 'padrao', 'protocolo', 'mutacoes.json'), 'utf8')
  ).mutacoes.length;
  assert.equal(auditoria.totalTestesExaminados, auditoria.testesDeclarados.length);
  assert.equal(auditoria.totalMutacoesExaminadas, totalNoJson, 'MUTACOES.md (bloco gerado) e mutacoes.json têm de ter o mesmo número de mutações');
  assert.ok(auditoria.totalPortoesObrigatorios > 0);

  // Prova do Tripwire L5 na pasta tests/: arquivo .test.mjs fora da lista deve dar vermelho
  const tmpProjeto = fs.mkdtempSync(path.join(os.tmpdir(), 'ftl-tripwire-testes-'));
  try {
    fs.mkdirSync(path.join(tmpProjeto, 'tests'), { recursive: true });
    for (const nomeTeste of auditoria.testesDeclarados) {
      fs.writeFileSync(path.join(tmpProjeto, 'tests', nomeTeste), '// ok\n', 'utf8');
    }
    fs.writeFileSync(path.join(tmpProjeto, 'tests', '99-intruso-nao-declarado.test.mjs'), '// intruso\n', 'utf8');
    assert.throws(
      () => verificarCadeiaTestesEMutacoes(tmpProjeto),
      /\[L5 TRIPWIRE TESTES FALHOU\]/,
      'Arquivo .test.mjs fora da cadeia canônica deve reprovar no tripwire L5'
    );
  } finally {
    fs.rmSync(tmpProjeto, { recursive: true, force: true });
  }

  console.log(
    `[N4] Hooks examinados: ${hooksVerificados.length}, suítes de teste: ${auditoria.totalTestesExaminados}, portões: ${auditoria.totalPortoesExaminados} (${auditoria.totalPortoesObrigatorios} obrigatórios), mutações registradas: ${auditoria.totalMutacoesExaminadas}`
  );
});
