import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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
  criarServidorHttpMcp,
  executarMutacoesL6Mcp,
  executarPortoesMcp,
  iniciarCenarioBiofoilMcp,
  iniciarTransporteStdio,
  inspecionarAlvoL3Mcp,
  inspecionarCodigo14Leis,
  invocarFerramentaMcp,
  lerRecursoMcp,
  obterPromptMcp,
  processarMensagemJsonRpc,
  simularPassoAgenteMcp,
} from '../scripts/mcp-testes-agentes.mjs';
import { copiarProjeto, primeiraLinhaDeFalha } from '../scripts/rodar-mutacoes.mjs';
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
  } finally {
    fs.rmSync(tmpProjeto, { recursive: true, force: true });
  }

  console.log(
    `[N4] Hooks examinados: ${hooksVerificados.length}, suítes de teste: ${auditoria.totalTestesExaminados}, portões: ${auditoria.totalPortoesExaminados} (${auditoria.totalPortoesObrigatorios} obrigatórios), mutações registradas: ${auditoria.totalMutacoesExaminadas}`
  );
});

test('MCP para Testes de Agentes (L1/L2/L3/L4/L6/N4): 8 ferramentas, 3 recursos, 2 prompts, stdio real e HTTP c/ DNS Rebinding', async () => {
  console.log(
    `[N4] MCP Testes de Agentes examinado: ${CATALOGO_FERRAMENTAS_MCP.length} ferramentas, ${CATALOGO_RECURSOS_MCP.length} recursos, ${CATALOGO_PROMPTS_MCP.length} prompts`
  );
  assert.equal(CATALOGO_FERRAMENTAS_MCP.length, 8, 'O servidor MCP deve expor exatamente 8 ferramentas agent_test_*');
  assert.equal(CATALOGO_RECURSOS_MCP.length, 3, 'O servidor MCP deve expor os 3 recursos canônicos');
  assert.equal(CATALOGO_PROMPTS_MCP.length, 2, 'O servidor MCP deve expor os 2 prompts de auditoria');

  for (const tool of CATALOGO_FERRAMENTAS_MCP) {
    assert.ok(tool.name.startsWith('agent_test_'), `Ferramenta ${tool.name} deve usar prefixo agent_test_`);
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
    8
  );
  assert.equal(
    processarMensagemJsonRpc({ jsonrpc: '2.0', id: 4, method: 'resources/list' }).result.resources.length,
    3
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
  assert.equal(
    processarMensagemJsonRpc({ jsonrpc: '2.0', id: 8, method: 'prompts/list' }).result.prompts.length,
    2
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
  assert.equal(inspOk.structuredContent.arquivosTesteExaminadosN4, 9);
  assert.equal(inspOk.structuredContent.arquivosCodigoTestadosN4, 24);
  assert.ok(inspOk.structuredContent.funcoesExportadasTestadasN4 >= 139);

  const relatorioTudo = verificarRegraTestesParaTudo(DIRETORIO_RAIZ);
  assert.equal(relatorioTudo.arquivosCodigoExaminados, 24);
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
    assert.equal(jsonOk.result.tools.length, 8);

    const respRebinding = await fetch(`http://127.0.0.1:${porta}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://dominio-malicioso.evil' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 202, method: 'ping' }),
    });
    assert.equal(respRebinding.status, 403, 'Servidor HTTP MCP deve rejeitar Origin externo (DNS Rebinding)');
  } finally {
    await new Promise((resolve) => srvHttp.close(resolve));
  }
});
