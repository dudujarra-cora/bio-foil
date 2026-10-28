import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PassThrough } from 'node:stream';
import { fileURLToPath } from 'node:url';
import {
  CADEIA_CANONICA_ONDAS_SRC,
  CADEIA_CANONICA_SRC,
  clonarProfundoCongelado,
  verificarCadeiaTestesEMutacoes,
  verificarRegraTestesParaTudo,
} from '../src/gdd-parser.mjs';
import {
  CATALOGO_FERRAMENTAS_MCP,
  CATALOGO_PROMPTS_MCP,
  CATALOGO_RECURSOS_MCP,
  auditarAmbienteN5Secao5,
  avaliarPoliticaAgenteMcp,
  consultarHudSessaoMcp,
  criarServidorHttpMcp,
  executarAcaoJogoMcp,
  executarMutacoesL6Mcp,
  executarPortoesMcp,
  gerenciarSessoesJogoMcp,
  iniciarCenarioBiofoilMcp,
  iniciarPartidaJogavelMcp,
  iniciarTransporteStdio,
  inspecionarAlvoL3Mcp,
  inspecionarCodigo14Leis,
  invocarFerramentaMcp,
  lerRecursoMcp,
  obterPromptMcp,
  processarMensagemJsonRpc,
  renderizarHudAsciiBiofoil,
  simularPassoAgenteMcp,
} from '../scripts/mcp-testes-agentes.mjs';
import {
  carregarMutacoes,
  copiarProjeto,
  executarCliMutacoes,
  executarMutacoes,
  extrairBlocoMd,
  primeiraLinhaDeFalha,
  renderizarBlocoMd,
} from '../scripts/rodar-mutacoes.mjs';
import { criarEstadoInicialPartida, congelarProfundo } from '../src/onda1-fisica/estado-inicial.mjs';

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
    fs.unlinkSync(path.join(tmpProjeto, 'tests', '99-intruso-nao-declarado.test.mjs'));

    // Prova recursiva do Tripwire L5 em src/: arquivo intruso dentro de subpasta de Onda deve dar vermelho
    for (const relSrc of [...CADEIA_CANONICA_SRC, ...CADEIA_CANONICA_ONDAS_SRC]) {
      const destinoSrc = path.join(tmpProjeto, 'src', relSrc);
      fs.mkdirSync(path.dirname(destinoSrc), { recursive: true });
      fs.writeFileSync(destinoSrc, '// ok\n', 'utf8');
    }
    fs.writeFileSync(path.join(tmpProjeto, 'src', 'onda1-fisica', 'intruso-nao-declarado.mjs'), '// intruso\n', 'utf8');
    assert.throws(
      () => verificarCadeiaTestesEMutacoes(tmpProjeto),
      /\[L5 TRIPWIRE SRC FALHOU\].*onda1-fisica\/intruso-nao-declarado\.mjs/,
      'Arquivo intruso dentro de subpasta src/onda1-fisica/ deve reprovar no tripwire recursivo L5'
    );
    fs.unlinkSync(path.join(tmpProjeto, 'src', 'onda1-fisica', 'intruso-nao-declarado.mjs'));

    // Subpasta vazia em src/ também é detectada pelo tripwire recursivo L5
    fs.mkdirSync(path.join(tmpProjeto, 'src', 'pasta-vazia'));
    assert.throws(() => verificarCadeiaTestesEMutacoes(tmpProjeto), /\[L5 TRIPWIRE SRC FALHOU\].*pasta-vazia\//);
    fs.rmdirSync(path.join(tmpProjeto, 'src', 'pasta-vazia'));

    // Cópia completa para testar tripwires de scripts/, padrao/protocolo/, raiz, CI, B10 engines, N3 PORTOES.md, B6 MUTACOES.md e Regra Testes-Para-Tudo
    copiarProjeto(DIRETORIO_RAIZ, tmpProjeto);

    fs.writeFileSync(path.join(tmpProjeto, 'scripts', 'intruso.sh'), '#!/bin/sh\n', 'utf8');
    assert.throws(() => verificarCadeiaTestesEMutacoes(tmpProjeto), /\[L5 TRIPWIRE SCRIPTS FALHOU\]/);
    fs.unlinkSync(path.join(tmpProjeto, 'scripts', 'intruso.sh'));

    fs.writeFileSync(path.join(tmpProjeto, 'padrao', 'protocolo', 'intruso.md'), '# intruso\n', 'utf8');
    assert.throws(() => verificarCadeiaTestesEMutacoes(tmpProjeto), /\[L5 TRIPWIRE PROTOCOLO FALHOU\]/);
    fs.unlinkSync(path.join(tmpProjeto, 'padrao', 'protocolo', 'intruso.md'));

    fs.writeFileSync(path.join(tmpProjeto, 'intruso.txt'), 'x\n', 'utf8');
    assert.throws(() => verificarCadeiaTestesEMutacoes(tmpProjeto), /\[L5 TRIPWIRE RAIZ ARQUIVOS FALHOU\]/);
    fs.unlinkSync(path.join(tmpProjeto, 'intruso.txt'));

    const caminhoPortoesYml = path.join(tmpProjeto, '.github', 'workflows', 'portoes.yml');
    const ymlOrig = fs.readFileSync(caminhoPortoesYml, 'utf8');
    fs.writeFileSync(caminhoPortoesYml, 'name: invalido\n', 'utf8');
    assert.throws(() => verificarCadeiaTestesEMutacoes(tmpProjeto), /\[CI FALHOU\]/);
    fs.writeFileSync(caminhoPortoesYml, ymlOrig, 'utf8');

    const caminhoPkg = path.join(tmpProjeto, 'package.json');
    const pkgOrig = fs.readFileSync(caminhoPkg, 'utf8');
    fs.writeFileSync(caminhoPkg, JSON.stringify({ engines: { node: 'invalido' } }), 'utf8');
    assert.throws(() => verificarCadeiaTestesEMutacoes(tmpProjeto), /\[B10 ENGINES FALHOU\].*ilegível/);
    fs.writeFileSync(caminhoPkg, JSON.stringify({ engines: { node: '>=99.0.0 <100.0.0' } }), 'utf8');
    assert.throws(() => verificarCadeiaTestesEMutacoes(tmpProjeto), /\[B10 ENGINES FALHOU\] versão do Node fora/);
    fs.writeFileSync(caminhoPkg, pkgOrig, 'utf8');

    const caminhoPortoesMd = path.join(tmpProjeto, 'padrao', 'protocolo', 'PORTOES.md');
    const portoesOrig = fs.readFileSync(caminhoPortoesMd, 'utf8');
    fs.writeFileSync(caminhoPortoesMd, portoesOrig.replace('| OBRIGATORIO |', '| STATUS_RUIM |'), 'utf8');
    assert.throws(() => verificarCadeiaTestesEMutacoes(tmpProjeto), /\[N3 FALHOU\] Status inválido/);
    fs.writeFileSync(caminhoPortoesMd, portoesOrig.replace('2026-10-22', 'data-ruim'), 'utf8');
    assert.throws(() => verificarCadeiaTestesEMutacoes(tmpProjeto), /\[N3 FALHOU\].*sem motivo ou sem data/);
    fs.writeFileSync(caminhoPortoesMd, portoesOrig.replace('3/3', '1/3'), 'utf8');
    assert.throws(() => verificarCadeiaTestesEMutacoes(tmpProjeto), /\[N3 FALHOU\].*sem evidência de 3 corridas/);
    fs.writeFileSync(caminhoPortoesMd, portoesOrig.replaceAll('OBRIGATORIO', 'DECLARADO'), 'utf8');
    assert.throws(() => verificarCadeiaTestesEMutacoes(tmpProjeto), /\[N4 FALHOU\] Zero portões OBRIGATORIO/);
    fs.writeFileSync(caminhoPortoesMd, portoesOrig, 'utf8');

    const caminhoMutMd = path.join(tmpProjeto, 'padrao', 'protocolo', 'MUTACOES.md');
    const mutOrig = fs.readFileSync(caminhoMutMd, 'utf8');
    fs.writeFileSync(caminhoMutMd, '# sem marcadores\n', 'utf8');
    assert.throws(() => verificarCadeiaTestesEMutacoes(tmpProjeto), /\[B6 FALHOU\]/);
    fs.writeFileSync(
      caminhoMutMd,
      '<!-- INICIO BLOCO GERADO POR scripts/rodar-mutacoes.mjs — NÃO EDITAR À MÃO -->\n<!-- FIM BLOCO GERADO -->\n',
      'utf8'
    );
    assert.throws(() => verificarCadeiaTestesEMutacoes(tmpProjeto), /Zero mutações encontradas/);
    fs.writeFileSync(caminhoMutMd, mutOrig.replaceAll('| `MUT-01` |', '| `MUT-99` |'), 'utf8');
    assert.throws(() => verificarCadeiaTestesEMutacoes(tmpProjeto), /ID de mutação fora de sequência/);
    fs.writeFileSync(
      caminhoMutMd,
      mutOrig.replaceAll('AssertionError', 'SemFalha').replaceAll('Error', 'SemFalha'),
      'utf8'
    );
    assert.throws(() => verificarCadeiaTestesEMutacoes(tmpProjeto), /sem primeira linha de falha real medida/);
    fs.writeFileSync(caminhoMutMd, mutOrig, 'utf8');

    // verificarRegraTestesParaTudo: arquivo sem teste, módulo sem função exportada e função órfã
    const caminhoGddParserTmp = path.join(tmpProjeto, 'src', 'gdd-parser.mjs');
    const gddParserOrig = fs.readFileSync(caminhoGddParserTmp, 'utf8');
    const nomeOrfaTmp = `funcaoOrfa_${'SemTeste_999'}`;
    fs.writeFileSync(caminhoGddParserTmp, `${gddParserOrig}\nexport function ${nomeOrfaTmp}() {}\n`, 'utf8');
    assert.throws(() => verificarRegraTestesParaTudo(tmpProjeto), /não possui teste direto/);
    fs.writeFileSync(caminhoGddParserTmp, 'const x = 1;\n', 'utf8');
    assert.throws(() => verificarRegraTestesParaTudo(tmpProjeto), /não exporta nenhuma função testável/);
    fs.writeFileSync(caminhoGddParserTmp, gddParserOrig, 'utf8');

    for (const nomeTeste of auditoria.testesDeclarados) {
      fs.writeFileSync(path.join(tmpProjeto, 'tests', nomeTeste), '// vazio\n', 'utf8');
    }
    assert.throws(() => verificarRegraTestesParaTudo(tmpProjeto), /não possui nenhum teste em tests/);
  } finally {
    fs.rmSync(tmpProjeto, { recursive: true, force: true });
  }

  console.log(
    `[N4] Hooks examinados: ${hooksVerificados.length}, suítes de teste: ${auditoria.totalTestesExaminados}, portões: ${auditoria.totalPortoesExaminados} (${auditoria.totalPortoesObrigatorios} obrigatórios), mutações registradas: ${auditoria.totalMutacoesExaminadas}`
  );
});

test('MCP para Testes e Jogo Bio-Foil (L1/L2/L3/L4/L6/N4): 12 ferramentas, 4 recursos, 3 prompts, Modo Jogo Interativo e HTTP c/ DNS Rebinding', async () => {
  console.log(
    `[N4] MCP Testes e Jogo examinado: ${CATALOGO_FERRAMENTAS_MCP.length} ferramentas, ${CATALOGO_RECURSOS_MCP.length} recursos, ${CATALOGO_PROMPTS_MCP.length} prompts`
  );
  assert.equal(
    CATALOGO_FERRAMENTAS_MCP.length,
    12,
    'O servidor MCP deve expor 12 ferramentas (8 agent_test_* + 4 biofoil_jogar_*)'
  );
  assert.equal(CATALOGO_RECURSOS_MCP.length, 4, 'O servidor MCP deve expor os 4 recursos canônicos');
  assert.equal(CATALOGO_PROMPTS_MCP.length, 3, 'O servidor MCP deve expor os 3 prompts canônicos');

  const ferramentasTeste = CATALOGO_FERRAMENTAS_MCP.filter((t) => t.name.startsWith('agent_test_'));
  const ferramentasJogar = CATALOGO_FERRAMENTAS_MCP.filter((t) => t.name.startsWith('biofoil_jogar_'));
  assert.equal(ferramentasTeste.length, 8);
  assert.equal(ferramentasJogar.length, 4);

  for (const tool of ferramentasTeste) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
    assert.equal(tool.annotations.idempotentHint, true);
  }

  // 1. JSON-RPC 2.0: initialize, ping, tools/list, resources/list, resources/read, prompts/list, prompts/get
  const initRes = processarMensagemJsonRpc({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-03-26' },
  });
  assert.equal(Object.isFrozen(initRes), true, '[Lei L2] Resposta JSON-RPC deve ser imutável');
  assert.equal(initRes.result.serverInfo.name, 'agent-testing-mcp-server');
  assert.equal(
    processarMensagemJsonRpc({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    null,
    'Notificação sem id deve retornar null'
  );
  assert.deepEqual(processarMensagemJsonRpc({ jsonrpc: '2.0', id: 2, method: 'ping' }).result, {});
  assert.equal(
    processarMensagemJsonRpc({ jsonrpc: '2.0', id: 3, method: 'tools/list' }).result.tools.length,
    12
  );
  assert.equal(
    processarMensagemJsonRpc({ jsonrpc: '2.0', id: 4, method: 'resources/list' }).result.resources.length,
    4
  );
  const resLeis = processarMensagemJsonRpc({
    jsonrpc: '2.0',
    id: 5,
    method: 'resources/read',
    params: { uri: 'leis://protocolo/14-leis' },
  });
  assert.match(resLeis.result.contents[0].text, /As 14 Leis/);
  const resPortoes = processarMensagemJsonRpc({
    jsonrpc: '2.0',
    id: 6,
    method: 'resources/read',
    params: { uri: 'leis://protocolo/portoes' },
  });
  assert.match(resPortoes.result.contents[0].text, /OBRIGATORIO/);
  const resSsot = processarMensagemJsonRpc({
    jsonrpc: '2.0',
    id: 7,
    method: 'resources/read',
    params: { uri: 'biofoil://gdd/ssot-matriz' },
  });
  assert.equal(JSON.parse(resSsot.result.contents[0].text).totalConstantes, 27);
  const resManualJogo = processarMensagemJsonRpc({
    jsonrpc: '2.0',
    id: 71,
    method: 'resources/read',
    params: { uri: 'biofoil://jogo/manual-interativo' },
  });
  assert.match(resManualJogo.result.contents[0].text, /biofoil_jogar_iniciar_partida/);
  assert.equal(
    processarMensagemJsonRpc({ jsonrpc: '2.0', id: 8, method: 'prompts/list' }).result.prompts.length,
    3
  );
  const prompt1 = processarMensagemJsonRpc({
    jsonrpc: '2.0',
    id: 9,
    method: 'prompts/get',
    params: { name: 'auditar_frente_14_leis', arguments: { frente: 'frente-mcp' } },
  });
  assert.match(prompt1.result.messages[0].content.text, /frente-mcp/);
  const prompt2 = processarMensagemJsonRpc({
    jsonrpc: '2.0',
    id: 10,
    method: 'prompts/get',
    params: { name: 'avaliar_agente_combate_biofoil', arguments: { idArquitetura: 'MANTA_VOLT' } },
  });
  assert.match(prompt2.result.messages[0].content.text, /MANTA_VOLT/);
  const prompt3 = processarMensagemJsonRpc({
    jsonrpc: '2.0',
    id: 11,
    method: 'prompts/get',
    params: { name: 'jogar_partida_biofoil', arguments: { idArquitetura: 'COURACA_LIMIAR', seedPartida: 'seed-jogar-1' } },
  });
  assert.match(prompt3.result.messages[0].content.text, /COURACA_LIMIAR/);

  // 2. Ferramenta 1: agent_test_auditar_ambiente_n5_secao5 + MUT-MCP-01 (core.bare=true) + L3
  const ambOk = auditarAmbienteN5Secao5({ diretorioRaiz: DIRETORIO_RAIZ, limiteCargaMaquina: 99 });
  assert.equal(ambOk.isError, false);
  assert.equal(ambOk.structuredContent.status, 'APROVADO');
  assert.equal(ambOk.structuredContent.metricas.coreBare, 'false');

  const ambBareTrue = auditarAmbienteN5Secao5(
    { diretorioRaiz: DIRETORIO_RAIZ, limiteCargaMaquina: 99 },
    { forcarCoreBareTrue: true }
  );
  assert.equal(
    ambBareTrue.structuredContent.status,
    'REPROVADO',
    '[MUT-MCP-01 / Seção 5] auditarAmbienteN5Secao5 deve reprovar quando core.bare=true'
  );
  const ambSemPerm = auditarAmbienteN5Secao5({ autorizado: false });
  assert.equal(ambSemPerm.structuredContent.canalPermissao, 'NEGADO');
  assert.equal(ambSemPerm.structuredContent.status, 'SEM_PERMISSAO');
  const ambNaoExiste = auditarAmbienteN5Secao5({ diretorioRaiz: path.join(DIRETORIO_RAIZ, 'pasta-inexistente-xyz') });
  assert.equal(ambNaoExiste.structuredContent.status, 'NAO_ENCONTRADO');
  assert.notEqual(
    ambSemPerm.structuredContent.marcadorExplicito,
    ambNaoExiste.structuredContent.marcadorExplicito,
    '[Lei L3] Sem permissão e não encontrado devem ter marcadores distintos no MCP'
  );

  // 3. Ferramenta 2: agent_test_inspecionar_codigo_14_leis + MUT-MCP-02 + Regra Testes-Para-Tudo (MUT-MCP-05)
  const inspOk = inspecionarCodigo14Leis({ diretorioRaiz: DIRETORIO_RAIZ, response_format: 'json' });
  assert.equal(inspOk.isError, false);
  assert.equal(inspOk.structuredContent.status, 'APROVADO');
  assert.equal(inspOk.structuredContent.arquivosTesteExaminadosN4, 10);
  assert.equal(inspOk.structuredContent.arquivosCodigoTestadosN4, 44);
  assert.ok(inspOk.structuredContent.funcoesExportadasTestadasN4 >= 200);

  const relatorioTudo = verificarRegraTestesParaTudo(DIRETORIO_RAIZ);
  assert.equal(relatorioTudo.arquivosCodigoExaminados, 44);
  assert.equal(Object.isFrozen(clonarProfundoCongelado({ ok: true })), true);
  assert.equal(fs.existsSync(path.join(DIRETORIO_RAIZ, 'scripts', 'auditar-frente.sh')), true);
  assert.equal(typeof iniciarTransporteStdio, 'function');
  assert.equal(typeof copiarProjeto, 'function');
  assert.equal(
    primeiraLinhaDeFalha('failing tests:\nAssertionError [ERR_ASSERTION]: falha simulada\n'),
    'AssertionError [ERR_ASSERTION]: falha simulada'
  );
  assert.equal(lerRecursoMcp('leis://protocolo/14-leis').contents.length, 1);
  assert.equal(obterPromptMcp('auditar_frente_14_leis', { frente: 'f1' }).messages.length, 1);

  assert.throws(
    () =>
      verificarRegraTestesParaTudo(DIRETORIO_RAIZ, {
        funcaoOrfaSimulada: { nome: `funcao_${'orfa_sem_teste'}`, arquivo: 'src/gdd-parser.mjs' },
      }),
    /\[REGRA TESTES-PARA-TUDO FALHOU\] Função exportada "funcao_orfa_/,
    '[MUT-MCP-05 / Regra Testes-Para-Tudo] Qualquer função exportada sem teste direto em tests/*.test.mjs deve reprovar'
  );

  const tmpTautologia = fs.mkdtempSync(path.join(os.tmpdir(), 'ftl-mcp-l4-'));
  try {
    fs.mkdirSync(path.join(tmpTautologia, 'tests'), { recursive: true });
    const metodoSkip = `test.${'skip'}`;
    const exprTautologia = `assert.equal(${'peso'}, ${'peso'})`;
    fs.writeFileSync(
      path.join(tmpTautologia, 'tests', '01-portao-gdd.test.mjs'),
      `import test from 'node:test';\nimport assert from 'node:assert/strict';\n${metodoSkip}('pulado', () => {\n  const peso = 225;\n  ${exprTautologia};\n});\n`,
      'utf8'
    );
    const inspRuim = inspecionarCodigo14Leis({ diretorioRaiz: tmpTautologia });
    assert.equal(inspRuim.structuredContent.status, 'REPROVADO');
    assert.ok(
      inspRuim.structuredContent.violacoes.some((v) => v.includes('[Lei L4]')),
      '[MUT-MCP-02 / Lei L4] inspecionarCodigo14Leis deve reprovar asserção tautológica que compara o símbolo consigo mesmo'
    );
    assert.ok(
      inspRuim.structuredContent.violacoes.some((v) => v.includes('[Lei N2]')),
      'inspecionarCodigo14Leis deve detectar test.skip proibido pela Lei N2'
    );
  } finally {
    fs.rmSync(tmpTautologia, { recursive: true, force: true });
  }

  // 4. Ferramenta 3 e 4: agent_test_executar_portoes e agent_test_executar_mutacoes_l6
  const portaoExec = executarPortoesMcp({
    diretorioRaiz: DIRETORIO_RAIZ,
    filtroSuite: '03-onda1-fisica',
  });
  assert.equal(portaoExec.isError, false);
  assert.equal(portaoExec.structuredContent.status, 'VERDE');
  assert.equal(portaoExec.structuredContent.suitesExaminadasN4, 1);

  const mutExec = executarMutacoesL6Mcp({
    diretorioRaiz: DIRETORIO_RAIZ,
    ids: ['MUT-61'],
  });
  assert.equal(mutExec.isError, false);
  assert.equal(mutExec.structuredContent.status, 'TODAS_MORTAS_MOTIVO_CERTO');
  assert.equal(mutExec.structuredContent.mortasPeloMotivoCerto, 1);

  // 5. Ferramentas 5, 6, 7 e 8 (Domínio B: Bio-Foil Agent Harness + MUT-MCP-03 e MUT-MCP-04)
  for (const tipoCenario of ['COMBATE_BARCO', 'COMBATE_MONSTRO', 'CHEFE_FASE_3', 'MAPA_SETORIAL', 'LOJA_FORJA']) {
    const cen = iniciarCenarioBiofoilMcp({
      seedPartida: 'seed-mcp-cenario',
      idArquitetura: 'CARCACA_ALFA',
      setorNumero: 1,
      tipoCenario,
    });
    assert.equal(cen.isError, false);
    assert.equal(cen.structuredContent.status, 'OK');
  }

  const cenarioCombate = invocarFerramentaMcp('agent_test_iniciar_cenario_biofoil', {
    seedPartida: 'seed-mcp-combate',
    tipoCenario: 'COMBATE_BARCO',
  });
  const passoSim = simularPassoAgenteMcp({
    estado: cenarioCombate.structuredContent.estado,
    comandos: [{ tipo: 'MERGULHO_TATICO', payload: { recolherFoil: true } }],
    passosTick: 2,
    dtSeg: 0.25,
  });
  assert.equal(passoSim.isError, false);
  assert.equal(passoSim.structuredContent.resumoPosPasso.estadoFisico, '2_TOUCHDOWN');
  assert.ok(passoSim.structuredContent.cuesAtivosIds.includes('CUE_ESTOL_TOUCHDOWN'));

  // Lei L3 no MCP (MUT-MCP-03)
  const baseCego = structuredClone(criarEstadoInicialPartida());
  baseCego.alvoCombate.canalVisibilidadeSonar = 'NEGADO_SONAR';
  const inspL3 = inspecionarAlvoL3Mcp({ estado: congelarProfundo(baseCego), salaId: 'SALA_MOTOR' });
  assert.equal(inspL3.structuredContent.leiturasL3[0].canalPermissao, 'NEGADO_SONAR');
  assert.equal(
    inspL3.structuredContent.leiturasL3[0].dados,
    undefined,
    '[MUT-MCP-03 / Lei L3] inspecionarAlvoL3Mcp deve retornar dados=undefined quando cego por NEGADO_SONAR'
  );

  // Benchmark de Política de Agente (MUT-MCP-04)
  const benchOtima = avaliarPoliticaAgenteMcp({ estrategia: 'CANONICA_OTIMA' });
  assert.equal(
    benchOtima.structuredContent.pontuacaoTotal,
    100,
    '[MUT-MCP-04 / Benchmark Agente] Estratégia CANONICA_OTIMA deve atingir 100/100 nos 5 cenários táticos'
  );
  const benchIngenua = avaliarPoliticaAgenteMcp({ estrategia: 'INGENUA_VIOLA_LEIS' });
  assert.equal(benchIngenua.structuredContent.pontuacaoTotal, 0);

  // 5b. Ferramentas 9, 10, 11 e 12 (Domínio C: Modo Jogo Interativo Completo + MUT-MCP-06)
  const hudTextoDireto = renderizarHudAsciiBiofoil(congelarProfundo(baseCego));
  assert.match(hudTextoDireto, /CEGO_AGUAS_TURVAS_ABISSAIS/, 'HUD ASCII deve exibir marcador L3 quando sonar cego');
  assert.doesNotMatch(hudTextoDireto, /0 tripulantes/, 'HUD ASCII nunca deve exibir "0 tripulantes" quando sonar cego');

  const sessaoJogo = iniciarPartidaJogavelMcp({
    sessaoId: 'sessao-teste-jogar',
    seedPartida: 'seed-jogar-mcp-01',
    idArquitetura: 'CARCACA_ALFA',
    setorNumero: 1,
    faseInicial: 'MAPA',
  });
  assert.equal(sessaoJogo.isError, false);
  assert.equal(sessaoJogo.structuredContent.status, 'PARTIDA_INICIADA');
  assert.equal(sessaoJogo.structuredContent.faseJogo, 'MAPA');

  const hudConsulta = consultarHudSessaoMcp({ sessaoId: 'sessao-teste-jogar' });
  assert.equal(hudConsulta.isError, false);
  assert.ok(hudConsulta.structuredContent.rotasDisponiveisCountN4 >= 1);

  // Testa Loja + Digestão Enzimática 2:1 + Sair da Loja
  iniciarPartidaJogavelMcp({
    sessaoId: 'sessao-teste-jogar',
    seedPartida: 'seed-jogar-mcp-01',
    idArquitetura: 'CARCACA_ALFA',
    setorNumero: 1,
    faseInicial: 'LOJA',
  });
  const acaoDigestao = executarAcaoJogoMcp({
    sessaoId: 'sessao-teste-jogar',
    acaoEspecial: 'DIGESTAO_ENZIMATICA',
    moedaOrigemDigestao: 'SUCATA',
    lotesDigestao: 2,
  });
  assert.equal(acaoDigestao.structuredContent.recursosAtuais.sucata, 26);
  assert.equal(acaoDigestao.structuredContent.recursosAtuais.biomassa, 17);

  const acaoSairLoja = executarAcaoJogoMcp({
    sessaoId: 'sessao-teste-jogar',
    acaoEspecial: 'SAIR_DA_LOJA',
  });
  assert.equal(acaoSairLoja.structuredContent.faseJogo, 'MAPA');

  // Testa Combate + Coleta de Saque de Vitória (MUT-MCP-06)
  const partidaCombate = iniciarPartidaJogavelMcp({
    sessaoId: 'sessao-combate-vitoria',
    seedPartida: 'seed-combate-vitoria',
    idArquitetura: 'CARCACA_ALFA',
    setorNumero: 1,
    faseInicial: 'COMBATE',
    classeInimigoInicial: 'BARCO_HUMANO',
  });
  const sucataInicialCombate = partidaCombate.structuredContent.estado.economia.sucata; // 30
  // Liga a Bomba Branquial (Câmara 3) para manter O2 em 100%, mira as 2 armas na Sala 2 e avança ticks até destruir o casco (8 HP -> +12 Sucata no Setor 1)
  const acaoVitoria = executarAcaoJogoMcp({
    sessaoId: 'sessao-combate-vitoria',
    comandos: [
      { tipo: 'ALOCAR_ENERGIA', payload: { camaraId: 4, deltaBarras: -1 } },
      { tipo: 'ALOCAR_ENERGIA', payload: { camaraId: 3, deltaBarras: 1 } },
      { tipo: 'MIRAR_ARMA', payload: { slotIndex: 0, salaAlvoId: 2 } },
      { tipo: 'MIRAR_ARMA', payload: { slotIndex: 1, salaAlvoId: 2 } },
    ],
    passosTick: 200,
    dtSeg: 0.5,
  });
  assert.equal(acaoVitoria.structuredContent.vitoria.encerrado, true);
  assert.equal(acaoVitoria.structuredContent.faseJogo, 'MAPA');
  assert.equal(
    acaoVitoria.structuredContent.recursosAtuais.sucata,
    sucataInicialCombate + 12,
    '[MUT-MCP-06 / Modo Jogo] executarAcaoJogoMcp deve creditar o saque de vitória (+12 Sucata Bruta no Setor 1) na carteira ao vencer combate'
  );

  // Gerenciamento de sessões: LISTAR, EXPORTAR_REPLAY e REMOVER
  const listaSessoes = gerenciarSessoesJogoMcp({ acao: 'LISTAR' });
  assert.ok(listaSessoes.structuredContent.sessoesAtivasN4 >= 2);
  const replaySessao = gerenciarSessoesJogoMcp({
    acao: 'EXPORTAR_REPLAY',
    sessaoId: 'sessao-combate-vitoria',
  });
  assert.equal(replaySessao.structuredContent.comandosReplayCountN4, 4);
  const remocao1 = gerenciarSessoesJogoMcp({ acao: 'REMOVER', sessaoId: 'sessao-teste-jogar' });
  assert.equal(remocao1.structuredContent.removida, true);
  const remocao2 = gerenciarSessoesJogoMcp({ acao: 'REMOVER', sessaoId: 'sessao-combate-vitoria' });
  assert.equal(remocao2.structuredContent.removida, true);

  // Validação de erros e schema
  assert.equal(invocarFerramentaMcp('ferramenta_inexistente').isError, true);
  assert.equal(
    invocarFerramentaMcp('agent_test_iniciar_cenario_biofoil', { propIntrusa: 123 }).isError,
    true
  );

  // 6. Transporte REAL stdio via subprocesso (Lei L1)
  const entradaStdio = [
    JSON.stringify({ jsonrpc: '2.0', id: 101, method: 'initialize', params: { protocolVersion: '2025-03-26' } }),
    JSON.stringify({ jsonrpc: '2.0', id: 102, method: 'tools/call', params: { name: 'agent_test_avaliar_politica_agente', arguments: { estrategia: 'CANONICA_OTIMA' } } }),
  ].join('\n') + '\n';
  const procStdio = spawnSync(process.execPath, [path.join(DIRETORIO_RAIZ, 'scripts', 'mcp-testes-agentes.mjs')], {
    cwd: DIRETORIO_RAIZ,
    env: ambienteSemGit(),
    input: entradaStdio,
    encoding: 'utf8',
  });
  assert.equal(procStdio.status, 0);
  const linhasStdio = procStdio.stdout.trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(linhasStdio.length, 2);
  assert.equal(linhasStdio[0].id, 101);
  assert.equal(linhasStdio[1].result.structuredContent.pontuacaoTotal, 100);

  // 7. Transporte REAL Streamable HTTP + proteção DNS Rebinding
  const srvHttp = criarServidorHttpMcp();
  await new Promise((resolve) => srvHttp.listen(0, '127.0.0.1', resolve));
  const porta = srvHttp.address().port;
  try {
    const respOk = await fetch(`http://127.0.0.1:${porta}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: `http://127.0.0.1:${porta}` },
      body: JSON.stringify({ jsonrpc: '2.0', id: 201, method: 'tools/list' }),
    });
    assert.equal(respOk.status, 200);
    const jsonOk = await respOk.json();
    assert.equal(jsonOk.result.tools.length, 12);

    const respRebinding = await fetch(`http://127.0.0.1:${porta}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://dominio-malicioso.evil' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 202, method: 'ping' }),
    });
    assert.equal(respRebinding.status, 403, 'Servidor HTTP MCP deve rejeitar Origin externo (DNS Rebinding)');

    const resp404 = await fetch(`http://127.0.0.1:${porta}/outro`, { method: 'GET' });
    assert.equal(resp404.status, 404);

    const resp400 = await fetch(`http://127.0.0.1:${porta}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{json_invalido',
    });
    assert.equal(resp400.status, 400);

    const resp202 = await fetch(`http://127.0.0.1:${porta}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    });
    assert.equal(resp202.status, 202);
  } finally {
    await new Promise((resolve) => srvHttp.close(resolve));
  }

  // 8. Transporte stdio in-process com PassThrough (linha vazia, JSON inválido, notificação e comando válido)
  const inStream = new PassThrough();
  const outStream = new PassThrough();
  let bufferOut = '';
  outStream.on('data', (chunk) => {
    bufferOut += chunk.toString('utf8');
  });
  const rlStdio = iniciarTransporteStdio({ input: inStream, output: outStream });
  inStream.write('   \n');
  inStream.write('{json_invalido\n');
  inStream.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
  inStream.write(`${JSON.stringify({ jsonrpc: '2.0', id: 301, method: 'ping' })}\n`);
  inStream.end();
  await new Promise((resolve) => rlStdio.on('close', resolve));
  const respostasInProc = bufferOut.trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(respostasInProc.length, 2);
  assert.equal(respostasInProc[0].error.code, -32700);
  assert.equal(respostasInProc[1].id, 301);

  // 9. Cobertura integral dos ramos do MCP (invocarFerramentaMcp nas 12 tools, validações de schema, rotas de mapa/loja/evento/Draga e erros JSON-RPC)
  assert.equal(processarMensagemJsonRpc({ jsonrpc: '1.0', id: 1 }).error.code, -32600);
  assert.equal(processarMensagemJsonRpc({ jsonrpc: '2.0', id: 1, method: 'metodo/inexistente' }).error.code, -32601);
  assert.equal(
    processarMensagemJsonRpc({ jsonrpc: '2.0', id: 1, method: 'resources/read', params: { uri: 'uri://inexistente' } })
      .error.code,
    -32603
  );
  assert.throws(() => lerRecursoMcp('uri://inexistente'), /URI não encontrada/);
  assert.throws(() => obterPromptMcp('prompt_inexistente'), /Prompt não encontrado/);

  assert.equal(invocarFerramentaMcp('agent_test_simular_passo_agente', []).isError, true);
  assert.equal(invocarFerramentaMcp('agent_test_simular_passo_agente', {}).isError, true);
  assert.equal(
    invocarFerramentaMcp('agent_test_auditar_ambiente_n5_secao5', { response_format: 'formato_invalido' }).isError,
    true
  );

  // Chamadas diretas via invocarFerramentaMcp nas ferramentas restantes e ramos de erro/filtro
  assert.equal(
    invocarFerramentaMcp(
      'agent_test_auditar_ambiente_n5_secao5',
      {
        limiteCargaMaquina: 1,
        response_format: 'json',
      },
      { carga1mOverride: 50 }
    ).isError,
    true
  );
  assert.equal(invocarFerramentaMcp('agent_test_executar_portoes', { filtroSuite: 'inexistente' }).isError, true);
  assert.equal(
    invocarFerramentaMcp('agent_test_executar_mutacoes_l6', {
      ids: ['MUT-INEXISTENTE'],
      arquivoAlvo: 'inexistente.mjs',
    }).isError,
    true
  );
  assert.equal(
    invocarFerramentaMcp('agent_test_iniciar_cenario_biofoil', { tipoCenario: 'CHEFE_FASE_1' }).isError,
    false
  );
  assert.equal(iniciarCenarioBiofoilMcp({ tipoCenario: 'CENARIO_INEXISTENTE' }).isError, true);
  assert.equal(simularPassoAgenteMcp({}).isError, true);
  assert.equal(inspecionarAlvoL3Mcp({}).isError, true);
  assert.equal(
    avaliarPoliticaAgenteMcp({ estrategia: 'CANONICA_OTIMA' }, { forcarPontuacaoZero: true }).structuredContent
      .pontuacaoTotal,
    0
  );

  const cenDraga = iniciarCenarioBiofoilMcp({ tipoCenario: 'CHEFE_FASE_3' }).structuredContent.estado;
  const passoDraga = invocarFerramentaMcp('agent_test_simular_passo_agente', {
    estado: cenDraga,
    passosTick: 1,
    dtSeg: 0.25,
  });
  assert.equal(passoDraga.isError, false);

  const inspSala = invocarFerramentaMcp('agent_test_inspecionar_alvo_l3', {
    estado: cenDraga,
    salaId: 'SALA_1',
  });
  assert.equal(inspSala.structuredContent.salasInspecionadasN4, 1);

  const inspVazado = inspecionarAlvoL3Mcp(
    { estado: congelarProfundo(baseCego) },
    { vazarVazioQuandoCegoL3: true }
  );
  assert.deepEqual(inspVazado.structuredContent.leiturasL3[0].dados.tripulantes, []);

  // Domínio C completo: sessão inexistente, Monstro Marinho, Setor 8 Draga, Digestão, Sair da Loja, Avançar Setor, Eventos, Mapa e Vitória/Derrota
  assert.equal(executarAcaoJogoMcp({ sessaoId: 'inexistente' }).isError, true);
  assert.equal(consultarHudSessaoMcp({ sessaoId: 'inexistente' }).isError, true);
  assert.equal(gerenciarSessoesJogoMcp({ acao: 'EXPORTAR_REPLAY', sessaoId: 'inexistente' }).isError, true);

  iniciarPartidaJogavelMcp({
    sessaoId: 'sessao-monstro',
    setorNumero: 2,
    faseInicial: 'COMBATE',
    classeInimigoInicial: 'MONSTRO_MARINHO',
  });
  // Digestão e Sair da Loja fora da fase LOJA (rejeitados)
  const rejForaLoja = executarAcaoJogoMcp({
    sessaoId: 'sessao-monstro',
    acaoEspecial: 'DIGESTAO_ENZIMATICA',
  });
  assert.equal(rejForaLoja.structuredContent.resultadosComandos[0].aceito, false);
  const rejSairForaLoja = executarAcaoJogoMcp({
    sessaoId: 'sessao-monstro',
    acaoEspecial: 'SAIR_DA_LOJA',
  });
  assert.equal(rejSairForaLoja.structuredContent.resultadosComandos[0].aceito, false);

  // Vitória por EXTRACAO_CIRURGICA / CAPTURA_INTACTA e avanço de setor
  iniciarPartidaJogavelMcp({
    sessaoId: 'sessao-loja-digestao',
    setorNumero: 1,
    faseInicial: 'LOJA',
  });
  const digOk = executarAcaoJogoMcp({
    sessaoId: 'sessao-loja-digestao',
    acaoEspecial: 'DIGESTAO_ENZIMATICA',
    moedaOrigemDigestao: 'SUCATA',
    lotesDigestao: 1,
  });
  assert.equal(digOk.structuredContent.resultadosComandos[0].aceito, true);
  const digFalha = executarAcaoJogoMcp({
    sessaoId: 'sessao-loja-digestao',
    acaoEspecial: 'DIGESTAO_ENZIMATICA',
    moedaOrigemDigestao: 'SUCATA',
    lotesDigestao: 999,
  });
  assert.equal(digFalha.structuredContent.resultadosComandos[0].aceito, false);
  const sairLojaOk = executarAcaoJogoMcp({
    sessaoId: 'sessao-loja-digestao',
    acaoEspecial: 'SAIR_DA_LOJA',
  });
  assert.equal(sairLojaOk.structuredContent.faseJogo, 'MAPA');

  // Avançar próximo setor (Setor 1 -> 2 e Setor 7 -> 8)
  const avSetor2 = executarAcaoJogoMcp({
    sessaoId: 'sessao-loja-digestao',
    acaoEspecial: 'AVANCAR_PROXIMO_SETOR',
  });
  assert.equal(avSetor2.status === 'OK' || avSetor2.isError === false, true);

  iniciarPartidaJogavelMcp({
    sessaoId: 'sessao-setor7',
    setorNumero: 7,
    faseInicial: 'MAPA',
  });
  const avSetor8 = executarAcaoJogoMcp({
    sessaoId: 'sessao-setor7',
    acaoEspecial: 'AVANCAR_PROXIMO_SETOR',
  });
  assert.equal(avSetor8.structuredContent.faseJogo, 'COMBATE');

  // HUD em EVENTO e FIM_DE_RUN
  const estEvHud = structuredClone(cenDraga);
  estEvHud.meta.faseJogo = 'EVENTO';
  estEvHud.mapaSetorial.nos = [{ id: 'NO_0_ENTRADA', tipoNo: 'SOS', idTemplateEvento: 'SOS_1_REDE_ARRASTO' }];
  assert.match(renderizarHudAsciiBiofoil(congelarProfundo(estEvHud)), /ENCONTRO DE EVENTO/);
  const estFimHud = structuredClone(cenDraga);
  estFimHud.meta.faseJogo = 'FIM_DE_RUN';
  estFimHud.meta.resultadoRun = 'VITORIA_FINAL_DRAGA';
  assert.match(renderizarHudAsciiBiofoil(congelarProfundo(estFimHud)), /FIM DE RUN/);

  // Invocar tools restantes via invocarFerramentaMcp e cobrir todas as transições do Domínio C
  assert.equal(
    invocarFerramentaMcp('agent_test_inspecionar_codigo_14_leis', { diretorioRaiz: DIRETORIO_RAIZ }).isError,
    false
  );
  const sessaoLongaId = 's'.repeat(25050);
  const resTruncado = iniciarPartidaJogavelMcp({ sessaoId: sessaoLongaId, response_format: 'json' });
  assert.match(resTruncado.content[0].text, /TRUNCADO em 25000 caracteres/);
  gerenciarSessoesJogoMcp({ acao: 'REMOVER', sessaoId: sessaoLongaId });

  // Travessia de mapa real: EXPLORACAO -> EVENTO (opção C sem noMapa no payload -> MAPA) -> LOJA -> SOS -> SAIDA (Setor 1 -> 2)
  iniciarPartidaJogavelMcp({
    sessaoId: 'sessao-mapa-s5',
    seedPartida: 'seed-5',
    setorNumero: 1,
    faseInicial: 'MAPA',
  });
  executarAcaoJogoMcp({
    sessaoId: 'sessao-mapa-s5',
    comandos: [
      { tipo: 'VIAJAR_NO_MAPA', payload: { idNoDestino: 'NO_1_B' } },
      { tipo: 'ESCOLHER_OPCAO_EVENTO', payload: { opcao: 'C' } },
      { tipo: 'VIAJAR_NO_MAPA', payload: { idNoDestino: 'NO_2_C' } },
      { tipo: 'ESCOLHER_OPCAO_EVENTO', payload: { opcao: 'C' } },
      { tipo: 'VIAJAR_NO_MAPA', payload: { idNoDestino: 'NO_3_B' } },
    ],
  });
  executarAcaoJogoMcp({ sessaoId: 'sessao-mapa-s5', acaoEspecial: 'SAIR_DA_LOJA' });
  const rSaidaS1 = executarAcaoJogoMcp({
    sessaoId: 'sessao-mapa-s5',
    comandos: [
      { tipo: 'VIAJAR_NO_MAPA', payload: { idNoDestino: 'NO_4_B' } },
      { tipo: 'ESCOLHER_OPCAO_EVENTO', payload: { opcao: 'C' } },
      { tipo: 'VIAJAR_NO_MAPA', payload: { idNoDestino: 'NO_5_SAIDA' } },
    ],
  });
  assert.ok(rSaidaS1.structuredContent.eventosTransicao.includes('TR_8_TROCAR_SETOR:2'));
  gerenciarSessoesJogoMcp({ acao: 'REMOVER', sessaoId: 'sessao-mapa-s5' });

  // Travessia até SAIDA no Setor 7 -> Setor 8 (Draga Fase 1)
  iniciarPartidaJogavelMcp({
    sessaoId: 'sessao-mapa-s7',
    seedPartida: 'seed-7',
    setorNumero: 7,
    faseInicial: 'MAPA',
  });
  executarAcaoJogoMcp({
    sessaoId: 'sessao-mapa-s7',
    comandos: [
      { tipo: 'VIAJAR_NO_MAPA', payload: { idNoDestino: 'NO_1_B' } },
      { tipo: 'ESCOLHER_OPCAO_EVENTO', payload: { opcao: 'C' } },
      { tipo: 'VIAJAR_NO_MAPA', payload: { idNoDestino: 'NO_2_C' } },
      { tipo: 'ESCOLHER_OPCAO_EVENTO', payload: { opcao: 'C' } },
      { tipo: 'VIAJAR_NO_MAPA', payload: { idNoDestino: 'NO_3_B' } },
      { tipo: 'ESCOLHER_OPCAO_EVENTO', payload: { opcao: 'C' } },
      { tipo: 'VIAJAR_NO_MAPA', payload: { idNoDestino: 'NO_4_B' } },
    ],
  });
  executarAcaoJogoMcp({ sessaoId: 'sessao-mapa-s7', acaoEspecial: 'SAIR_DA_LOJA' });
  const rSaidaS7 = executarAcaoJogoMcp({
    sessaoId: 'sessao-mapa-s7',
    comandos: [{ tipo: 'VIAJAR_NO_MAPA', payload: { idNoDestino: 'NO_5_SAIDA' } }],
  });
  assert.ok(rSaidaS7.structuredContent.eventosTransicao.includes('TR_8_CHEGADA_SETOR_8_DRAGA_FASE_1'));
  gerenciarSessoesJogoMcp({ acao: 'REMOVER', sessaoId: 'sessao-mapa-s7' });

  // Travessia para nó COMBATE (s1: NO_1_B) e EVENTO -> COMBATE (seed-1: NO_1_C opção A)
  iniciarPartidaJogavelMcp({ sessaoId: 'sessao-no-comb', seedPartida: 's1', faseInicial: 'MAPA' });
  const rNoComb = executarAcaoJogoMcp({
    sessaoId: 'sessao-no-comb',
    comandos: [{ tipo: 'VIAJAR_NO_MAPA', payload: { idNoDestino: 'NO_1_B' } }],
  });
  assert.equal(rNoComb.structuredContent.faseJogo, 'COMBATE');
  gerenciarSessoesJogoMcp({ acao: 'REMOVER', sessaoId: 'sessao-no-comb' });

  iniciarPartidaJogavelMcp({ sessaoId: 'sessao-ev-comb', seedPartida: 'seed-1', faseInicial: 'MAPA' });
  const rEvComb = executarAcaoJogoMcp({
    sessaoId: 'sessao-ev-comb',
    comandos: [
      { tipo: 'VIAJAR_NO_MAPA', payload: { idNoDestino: 'NO_1_C' } },
      { tipo: 'ESCOLHER_OPCAO_EVENTO', payload: { opcao: 'A' } },
    ],
  });
  assert.ok(rEvComb.structuredContent.eventosTransicao.includes('TR_3_EVENTO_PARA_COMBATE'));
  gerenciarSessoesJogoMcp({ acao: 'REMOVER', sessaoId: 'sessao-ev-comb' });

  // Derrota permadeath, Extração Cirúrgica, Captura Intacta (c/ resgate de BORDO_INIMIGO) e Draga Fases 1->2->3
  iniciarPartidaJogavelMcp({ sessaoId: 'sessao-derrota', faseInicial: 'COMBATE' });
  const rDerrota = executarAcaoJogoMcp({
    sessaoId: 'sessao-derrota',
    comandos: [{ tipo: 'DRENAR_TUDO', payload: { aberta: true } }],
    passosTick: 65,
    dtSeg: 1.0,
  });
  assert.equal(rDerrota.structuredContent.faseJogo, 'FIM_DE_RUN');
  gerenciarSessoesJogoMcp({ acao: 'REMOVER', sessaoId: 'sessao-derrota' });

  iniciarPartidaJogavelMcp({
    sessaoId: 'sessao-extracao',
    faseInicial: 'COMBATE',
    classeInimigoInicial: 'MONSTRO_MARINHO',
  });
  const rExtracao = executarAcaoJogoMcp({
    sessaoId: 'sessao-extracao',
    comandos: [
      { tipo: 'ALOCAR_ENERGIA', payload: { camaraId: 4, deltaBarras: -1 } },
      { tipo: 'ALOCAR_ENERGIA', payload: { camaraId: 3, deltaBarras: 1 } },
      { tipo: 'MIRAR_ARMA', payload: { slotIndex: 1, salaAlvoId: 4 } },
    ],
    passosTick: 90,
    dtSeg: 0.5,
  });
  assert.equal(rExtracao.structuredContent.metricasRun.orgaosIntactosExtraidosNestaRun, 1);
  gerenciarSessoesJogoMcp({ acao: 'REMOVER', sessaoId: 'sessao-extracao' });

  iniciarPartidaJogavelMcp({
    sessaoId: 'sessao-captura',
    idArquitetura: 'SOMBRA_ABISSAL',
    faseInicial: 'COMBATE',
    classeInimigoInicial: 'BARCO_HUMANO',
  });
  executarAcaoJogoMcp({
    sessaoId: 'sessao-captura',
    comandos: [
      { tipo: 'ALOCAR_ENERGIA', payload: { camaraId: 8, deltaBarras: -1 } },
      { tipo: 'ALOCAR_ENERGIA', payload: { camaraId: 3, deltaBarras: 1 } },
      { tipo: 'MOVER_TRIPULANTE', payload: { tripulanteId: 'trip-polvo-1', camaraDestinoId: 1 } },
      { tipo: 'MIRAR_ARMA', payload: { slotIndex: 1, salaAlvoId: 3 } },
    ],
    passosTick: 60,
    dtSeg: 0.5,
  });
  const rCaptura = executarAcaoJogoMcp({
    sessaoId: 'sessao-captura',
    comandos: [
      { tipo: 'MIRAR_ARMA', payload: { slotIndex: 1, salaAlvoId: 1 } },
    ],
    passosTick: 100,
    dtSeg: 0.5,
  });
  assert.equal(rCaptura.structuredContent.metricasRun.barcosCapturadosIntactosNestaRun, 1);
  gerenciarSessoesJogoMcp({ acao: 'REMOVER', sessaoId: 'sessao-captura' });

  invocarFerramentaMcp('biofoil_jogar_iniciar_partida', {
    sessaoId: 'sessao-via-tool',
    setorNumero: 8,
    faseInicial: 'COMBATE',
  });
  for (let f = 1; f <= 3; f += 1) {
    for (let r = 0; r < 5; r += 1) {
      const resDraga = invocarFerramentaMcp('biofoil_jogar_executar_acao', {
        sessaoId: 'sessao-via-tool',
        comandos:
          r === 0
            ? [
                ...(f === 1
                  ? [
                      { tipo: 'ALOCAR_ENERGIA', payload: { camaraId: 4, deltaBarras: -1 } },
                      { tipo: 'ALOCAR_ENERGIA', payload: { camaraId: 3, deltaBarras: 1 } },
                    ]
                  : []),
                { tipo: 'MIRAR_ARMA', payload: { slotIndex: 0, salaAlvoId: 1 } },
                { tipo: 'MIRAR_ARMA', payload: { slotIndex: 1, salaAlvoId: 1 } },
              ]
            : [],
        passosTick: 200,
        dtSeg: 0.5,
      });
      if (resDraga.structuredContent.vitoria.encerrado) break;
    }
  }
  const hudFinalDraga = invocarFerramentaMcp('biofoil_jogar_consultar_hud', { sessaoId: 'sessao-via-tool' });
  assert.equal(hudFinalDraga.structuredContent.faseJogo, 'FIM_DE_RUN');
  assert.equal(
    invocarFerramentaMcp('biofoil_jogar_gerenciar_sessoes', {
      acao: 'REMOVER',
      sessaoId: 'sessao-via-tool',
    }).isError,
    false
  );

  // 10. Executor de mutações L6 e inspeção estática MCP em diretório temporário (100% funções e ramos)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ftl-mut-cov-'));
  try {
    copiarProjeto(DIRETORIO_RAIZ, tmp);

    // 1. renderizarBlocoMd, extrairBlocoMd e carregarMutacoes
    const muts = carregarMutacoes(tmp);
    const bloco = renderizarBlocoMd(muts.slice(0, 1), [
      { id: 'MUT-01', vermelho: true, linha: 'Error: falha', confere: true, desatualizada: null },
    ]);
    assert.match(bloco, /MUT-01/);
    assert.equal(extrairBlocoMd('sem marcadores'), null);
    assert.equal(extrairBlocoMd(`antes\n${bloco}\ndepois`), bloco);

    // 2. executarCliMutacoes em 1 mutação rápida (MUT-03) com --gerar-md
    const codeCli = executarCliMutacoes(tmp, ['--gerar-md'], ['MUT-03']);
    assert.equal(codeCli, 0);

    // 3. Mutação desatualizada (buscar aparece 0x) -> retorna desatualizada e código 1 no CLI
    const caminhoJson = path.join(tmp, 'padrao', 'protocolo', 'mutacoes.json');
    const jsonOrig = fs.readFileSync(caminhoJson, 'utf8');
    const jsonMod = JSON.parse(jsonOrig);
    jsonMod.mutacoes[2].trocas[0].buscar = 'TRECHO_QUE_NAO_EXISTE_EM_LUGAR_NENHUM_999';
    fs.writeFileSync(caminhoJson, JSON.stringify(jsonMod, null, 2), 'utf8');
    const codeDesat = executarCliMutacoes(tmp, [], ['MUT-03']);
    assert.equal(codeDesat, 1);
    fs.writeFileSync(caminhoJson, jsonOrig, 'utf8');

    // 4. Linha de base vermelha -> executarMutacoes lança [L6 LINHA DE BASE VERMELHA]
    const caminhoT01 = path.join(tmp, 'tests', '01-portao-gdd.test.mjs');
    const t01Orig = fs.readFileSync(caminhoT01, 'utf8');
    fs.writeFileSync(caminhoT01, `import test from 'node:test';\ntest('falha', () => { throw new Error('boom'); });\n`, 'utf8');
    assert.throws(() => executarMutacoes(tmp, { ids: ['MUT-03'] }), /\[L6 LINHA DE BASE VERMELHA\]/);

    // 5. inspecionarCodigo14Leis detectando mock proibido, caminho de máquina, tautologia L4 e pasta tests vazia
    const prefixoUsr = `/${'Users'}/dudu/arq`;
    const fnMockStr = `${'jest'}.fn()`;
    const tautStr = `assert.${'equal'}(b, b)`;
    const caminhoT02 = path.join(tmp, 'tests', '02-hook-ambiente.test.mjs');
    fs.writeFileSync(
      caminhoT02,
      `import test from 'node:test';\nimport assert from 'node:assert/strict';\ntest('y', () => { ${fnMockStr}; const p = '${prefixoUsr}'; const b = 1; ${tautStr}; });\n`,
      'utf8'
    );
    const inspRuim = inspecionarCodigo14Leis({ diretorioRaiz: tmp });
    assert.equal(inspRuim.isError, true);
    assert.ok(inspRuim.structuredContent.violacoes.some((v) => v.includes('[Lei L1]')));
    assert.ok(inspRuim.structuredContent.violacoes.some((v) => v.includes('[Lei N5]')));
    assert.ok(inspRuim.structuredContent.violacoes.some((v) => v.includes('[Lei L4]')));

    for (const f of fs.readdirSync(path.join(tmp, 'tests'))) {
      fs.unlinkSync(path.join(tmp, 'tests', f));
    }
    const inspZero = inspecionarCodigo14Leis({ diretorioRaiz: tmp });
    assert.ok(inspZero.structuredContent.violacoes.some((v) => v.includes('Zero arquivos de teste')));

    // 6. auditarAmbienteN5Secao5 quando hook não tem unset/NODE_TEST_CONTEXT e quando hooksPath está vazio
    const hookPreCommitTmp = path.join(tmp, 'scripts', 'hooks', 'pre-commit');
    fs.writeFileSync(hookPreCommitTmp, '#!/bin/sh\ngit status\n', 'utf8');
    const ambHookRuim = auditarAmbienteN5Secao5({ diretorioRaiz: tmp, limiteCargaMaquina: 99 });
    assert.equal(ambHookRuim.isError, true);
    fs.unlinkSync(hookPreCommitTmp);
    const ambSemHooks = auditarAmbienteN5Secao5({ diretorioRaiz: tmp, limiteCargaMaquina: 99 });
    assert.equal(ambSemHooks.isError, true);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
