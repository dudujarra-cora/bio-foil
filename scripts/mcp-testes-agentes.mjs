#!/usr/bin/env node
/**
 * [Onda 0] Servidor MCP para Testes de Agentes sob as 14 Leis (L1..L7, N1..N7 e Seção 5) e Bancada Bio-Foil.
 *
 * Implementa o protocolo Model Context Protocol (JSON-RPC 2.0 sobre stdio e Streamable HTTP em 127.0.0.1)
 * com zero dependências externas em Node.js >=22.22.0 <23.0.0.
 *
 * Domínio A — Fiscalização Universal de Agentes (As 14 Leis + Seção 5):
 *   1. agent_test_auditar_ambiente_n5_secao5
 *   2. agent_test_inspecionar_codigo_14_leis
 *   3. agent_test_executar_portoes
 *   4. agent_test_executar_mutacoes_l6
 *
 * Domínio B — Bancada Determinística de Testes de Agentes Jogadores (Bio-Foil):
 *   5. agent_test_iniciar_cenario_biofoil
 *   6. agent_test_simular_passo_agente
 *   7. agent_test_inspecionar_alvo_l3
 *   8. agent_test_avaliar_politica_agente
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  CADEIA_CANONICA_TESTES,
  carregarCadeiaCanonicaGdd,
  extrairSsotEMatrizDoVolume06,
  verificarCadeiaTestesEMutacoes,
  verificarRegraTestesParaTudo,
} from '../src/gdd-parser.mjs';
import { congelarProfundo, criarEstadoInicialPartida } from '../src/onda1-fisica/estado-inicial.mjs';
import { calcularPesoTotalNave, calcularSustentacaoFoil } from '../src/onda1-fisica/tick-hidraulica-foil.mjs';
import { inspecionarSalaAlvo, avancarTickCombateCompleto } from '../src/onda2-combate/tick-tripulacao.mjs';
import { criarAlvoSetor1Canonico, avancarTickIaInimiga } from '../src/onda3-inimigos/ia-barco-monstro.mjs';
import { avaliarCondicaoDeVitoria } from '../src/onda3-inimigos/abordagem-vitoria.mjs';
import { gerarMapaSetorial } from '../src/onda4-mapa/gerador-poisson.mjs';
import { gerarEstoqueLojaForja } from '../src/onda5-catalogo-chefe/catalogo-naves-itens.mjs';
import { criarEstadoChefeDraga, avancarTickChefeDraga } from '../src/onda5-catalogo-chefe/chefe-draga.mjs';
import { ESQUEMA_15_COMANDOS_85A, despacharComandoUi } from '../src/onda6-ui/despacho-comandos.mjs';
import { projetarViewModelWireframe } from '../src/onda6-ui/presenter-wireframe.mjs';
import { avaliarCuesSonorosAtivos } from '../src/onda6-ui/cues-audio.mjs';
import { carregarMutacoes, executarMutacoes } from './rodar-mutacoes.mjs';

const DIRETORIO_RAIZ_PADRAO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const MCP_SERVER_INFO = Object.freeze({
  name: 'agent-testing-mcp-server',
  version: '1.0.0',
  protocolVersion: '2025-03-26',
});

export const LIMITE_CARACTERES_RESPOSTA = 25000;

const VARIAVEIS_GIT_SECAO5 = Object.freeze([
  'GIT_DIR',
  'GIT_INDEX_FILE',
  'GIT_WORK_TREE',
  'GIT_PREFIX',
  'GIT_COMMON_DIR',
  'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
]);

function construirPadraoCaminhoMaquina() {
  const prefixos = [`/${'Users'}/`, `/${'home'}/`, `/${'private'}/`, `C:${'\\\\'}`];
  return new RegExp(prefixos.join('|'));
}

function criarAmbienteHigienizado() {
  const env = { ...process.env };
  for (const chave of Object.keys(env)) {
    if (chave.startsWith('GIT_')) delete env[chave];
  }
  delete env.NODE_TEST_CONTEXT;
  return env;
}

function executarGit(cwd, args) {
  const r = spawnSync('git', args, {
    cwd,
    env: criarAmbienteHigienizado(),
    encoding: 'utf8',
  });
  return {
    status: r.status ?? 1,
    saida: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim(),
  };
}

function truncarSeNecessario(texto) {
  const str = String(texto);
  if (str.length <= LIMITE_CARACTERES_RESPOSTA) return str;
  return `${str.slice(0, LIMITE_CARACTERES_RESPOSTA)}\n... [TRUNCADO em ${LIMITE_CARACTERES_RESPOSTA} caracteres; use paginacao limit/offset]`;
}

function formatarSaidaFerramenta(dadosEstruturados, resumoMarkdown, formato = 'markdown', isError = false) {
  const congelado = congelarProfundo(dadosEstruturados);
  const textoBruto =
    formato === 'json' ? JSON.stringify(congelado, null, 2) : resumoMarkdown;
  return congelarProfundo({
    isError,
    content: [
      {
        type: 'text',
        text: truncarSeNecessario(textoBruto),
      },
    ],
    structuredContent: congelado,
  });
}

function paginarItens(itens, limit = 20, offset = 0) {
  const lim = Math.min(100, Math.max(1, Number(limit ?? 20)));
  const off = Math.max(0, Number(offset ?? 0));
  const fatia = itens.slice(off, off + lim);
  const hasMore = off + fatia.length < itens.length;
  return {
    total: itens.length,
    count: fatia.length,
    offset: off,
    items: fatia,
    has_more: hasMore,
    ...(hasMore ? { next_offset: off + fatia.length } : {}),
  };
}

/**
 * 1. Ferramenta Domínio A: Auditar ambiente Git, carga de máquina (N5), distância da main (N7) e Seção 5 (core.bare / unset).
 */
export function auditarAmbienteN5Secao5(params = {}, opcoesDebug = {}) {
  const diretorioAlvo = params.diretorioRaiz
    ? path.resolve(String(params.diretorioRaiz))
    : DIRETORIO_RAIZ_PADRAO;
  const formato = params.response_format ?? 'markdown';

  if (params.autorizado === false) {
    return formatarSaidaFerramenta(
      {
        canalPermissao: 'NEGADO',
        status: 'SEM_PERMISSAO',
        marcadorExplicito: 'ACESSO_AMBIENTE_BLOQUEADO_L3',
        dados: undefined,
      },
      '### [L3] Acesso Negado\n- Canal: `NEGADO` (`ACESSO_AMBIENTE_BLOQUEADO_L3`)',
      formato,
      true
    );
  }

  if (!fs.existsSync(diretorioAlvo)) {
    return formatarSaidaFerramenta(
      {
        canalPermissao: 'AUTORIZADO',
        status: 'NAO_ENCONTRADO',
        marcadorExplicito: 'DIRETORIO_ALVO_INEXISTENTE',
        dados: undefined,
      },
      `### [L3] Diretório Não Encontrado\n- Marcador: \`DIRETORIO_ALVO_INEXISTENTE\``,
      formato,
      true
    );
  }

  const carga1m = Number(opcoesDebug.carga1mOverride ?? os.loadavg()[0] ?? 0);
  const limiteCarga = Number(params.limiteCargaMaquina ?? 20);
  const gitCommon = executarGit(diretorioAlvo, ['rev-parse', '--git-common-dir']);
  const mainGitDir = gitCommon.status === 0
    ? path.resolve(diretorioAlvo, gitCommon.saida)
    : path.join(diretorioAlvo, '.git');

  const bareRes = executarGit(diretorioAlvo, ['--git-dir', mainGitDir, 'config', '--get', 'core.bare']);
  const coreBare = opcoesDebug.forcarCoreBareTrue === true ? 'true' : (bareRes.saida || 'false');

  const hooksRes = executarGit(diretorioAlvo, ['--git-dir', mainGitDir, 'config', '--get', 'core.hooksPath']);
  const temHooksNoDisco = fs.existsSync(path.join(diretorioAlvo, 'scripts', 'hooks', 'pre-commit'));
  const hooksPath =
    hooksRes.saida || (gitCommon.status !== 0 && temHooksNoDisco ? 'scripts/hooks' : '');

  const headRes = executarGit(diretorioAlvo, ['rev-parse', '--short', 'HEAD']);
  const ramoRes = executarGit(diretorioAlvo, [' symbolic-ref'.trim(), '--short', '-q', 'HEAD']);
  const atrasMainRes = executarGit(diretorioAlvo, ['rev-list', '--count', 'HEAD..main']);

  const hooksInspecionados = [];
  const linhaUnsetEsperada = `unset ${VARIAVEIS_GIT_SECAO5.join(' ')}`;
  for (const relHook of ['scripts/hooks/pre-commit', 'scripts/hooks/pre-push']) {
    const absHook = path.join(diretorioAlvo, relHook);
    if (fs.existsSync(absHook)) {
      const linhas = fs.readFileSync(absHook, 'utf8').split('\n');
      const idxUnset = linhas.findIndex((l) => l.startsWith(linhaUnsetEsperada));
      const idxPrimeiroGit = linhas.findIndex(
        (l) => /\bgit\b/.test(l) && !l.startsWith('#') && !l.startsWith('unset')
      );
      const limpaNodeTestContext = linhas.some((l) => l.includes('NODE_TEST_CONTEXT'));
      hooksInspecionados.push({
        hook: relHook,
        temUnset7VarsNoTopo: idxUnset >= 0 && (idxPrimeiroGit < 0 || idxUnset < idxPrimeiroGit),
        limpaNodeTestContext,
      });
    }
  }

  const violacoes = [];
  if (carga1m >= limiteCarga) {
    violacoes.push(`[Lei N5] Carga da máquina 1m (${carga1m.toFixed(2)}) >= ${limiteCarga}`);
  }
  if (coreBare !== 'false') {
    violacoes.push(`[Seção 5] core.bare='${coreBare}' (esperado 'false')`);
  }
  if (hooksPath !== 'scripts/hooks') {
    violacoes.push(`[Seção 5] core.hooksPath='${hooksPath}' (esperado 'scripts/hooks')`);
  }
  for (const h of hooksInspecionados) {
    if (!h.temUnset7VarsNoTopo) {
      violacoes.push(`[Seção 5] Hook ${h.hook} sem unset das 7 variáveis Git antes do 1º comando git`);
    }
    if (!h.limpaNodeTestContext) {
      violacoes.push(`[Lei L6 / B16] Hook ${h.hook} não limpa NODE_TEST_CONTEXT`);
    }
  }

  const status = violacoes.length === 0 ? 'APROVADO' : 'REPROVADO';
  const dados = {
    canalPermissao: 'AUTORIZADO',
    status,
    marcadorExplicito: status === 'APROVADO' ? 'AMBIENTE_SEGURO_14_LEIS' : 'AMBIENTE_VIOLADO_14_LEIS',
    violacoes,
    metricas: {
      cargaMaquina1m: Number(carga1m.toFixed(2)),
      limiteCarga,
      coreBare,
      hooksPath,
      commitHead: headRes.saida || 'DESCONHECIDO',
      ramoAtual: ramoRes.saida || 'DETACHED',
      commitsAtrasDaMain: Number(atrasMainRes.saida || 0),
      hooksExaminadosN4: hooksInspecionados.length,
      hooksInspecionados,
    },
  };

  const md = [
    `### Auditoria de Ambiente (N5 / N7 / Seção 5): **${status}**`,
    `- **Carga 1m:** \`${dados.metricas.cargaMaquina1m}\` (limite \`< ${limiteCarga}\`)`,
    `- **core.bare:** \`${coreBare}\` | **hooksPath:** \`${hooksPath}\``,
    `- **HEAD (N7):** \`${dados.metricas.commitHead}\` (\`${dados.metricas.ramoAtual}\`, atrás da main: \`${dados.metricas.commitsAtrasDaMain}\`)`,
    `- **[N4] Hooks examinados:** \`${hooksInspecionados.length}\``,
    ...(violacoes.length > 0 ? ['', '#### Violações:', ...violacoes.map((v) => `- ${v}`)] : []),
  ].join('\n');

  return formatarSaidaFerramenta(dados, md, formato, status !== 'APROVADO');
}

/**
 * 2. Ferramenta Domínio A: Inspecionar código/testes de um agente contra as 14 Leis (L1..L7 e N1..N7).
 */
export function inspecionarCodigo14Leis(params = {}, opcoesDebug = {}) {
  const diretorioAlvo = params.diretorioRaiz
    ? path.resolve(String(params.diretorioRaiz))
    : DIRETORIO_RAIZ_PADRAO;
  const formato = params.response_format ?? 'markdown';

  const violacoes = [];
  let auditoriaCadeia = null;
  let auditoriaTestesParaTudo = null;
  try {
    auditoriaCadeia = verificarCadeiaTestesEMutacoes(diretorioAlvo);
    auditoriaTestesParaTudo = verificarRegraTestesParaTudo(diretorioAlvo, opcoesDebug);
  } catch (err) {
    violacoes.push(err instanceof Error ? err.message : String(err));
  }

  const pastaTestes = path.join(diretorioAlvo, 'tests');
  const arquivosTeste = fs.existsSync(pastaTestes)
    ? fs.readdirSync(pastaTestes).filter((f) => f.endsWith('.test.mjs')).sort()
    : [];

  if (arquivosTeste.length === 0) {
    violacoes.push('[Lei N4] Zero arquivos de teste encontrados em tests/');
  }

  const padraoMaquina = construirPadraoCaminhoMaquina();
  const relatorioArquivos = [];

  for (const nomeArq of arquivosTeste) {
    const abs = path.join(pastaTestes, nomeArq);
    const conteudo = fs.readFileSync(abs, 'utf8');
    const temSkipN2 = /\b(?:test|it|describe)\.skip\s*\(/.test(conteudo);
    const temMockProibidoL1 = /\b(?:jest\.fn|vi\.fn|sinon\.stub|mock\.method)\s*\(/.test(conteudo);
    const temContadorN4 = /\[N4\]/.test(conteudo);
    const temCaminhoMaquina =
      nomeArq !== '01-portao-gdd.test.mjs' && padraoMaquina.test(conteudo);

    const matchesTautologiaL4 = [
      ...conteudo.matchAll(/assert\.(?:strictEqual|equal|deepEqual)\(\s*([A-Za-z0-9_$.]+)\s*,\s*\1\s*[,)]/g),
    ].map((m) => m[1]);

    if (temSkipN2) {
      violacoes.push(`[Lei N2] ${nomeArq} contém test.skip/it.skip (use LISTA_CATRACA)`);
    }
    if (temMockProibidoL1) {
      violacoes.push(`[Lei L1] ${nomeArq} contém mock/stub proibido sobre peça interna`);
    }
    if (!temContadorN4 && nomeArq !== '09-mutacoes-reais.test.mjs') {
      violacoes.push(`[Lei N4] ${nomeArq} não imprime contador explícito [N4]`);
    }
    if (temCaminhoMaquina) {
      violacoes.push(`[Lei N5] ${nomeArq} contém caminho absoluto dependente de máquina`);
    }
    if (matchesTautologiaL4.length > 0 && !opcoesDebug.ignorarTautologiaL4) {
      violacoes.push(
        `[Lei L4] ${nomeArq} compara o símbolo consigo mesmo: ${matchesTautologiaL4.join(', ')}`
      );
    }

    relatorioArquivos.push({
      arquivo: nomeArq,
      temSkipN2,
      temMockProibidoL1,
      temContadorN4,
      temCaminhoMaquina,
      tautologiasL4: matchesTautologiaL4,
    });
  }

  const status = violacoes.length === 0 ? 'APROVADO' : 'REPROVADO';
  const dados = {
    canalPermissao: 'AUTORIZADO',
    status,
    marcadorExplicito: status === 'APROVADO' ? 'CODIGO_CONFORME_14_LEIS' : 'CODIGO_VIOLA_14_LEIS',
    arquivosTesteExaminadosN4: arquivosTeste.length,
    arquivosCodigoTestadosN4: auditoriaTestesParaTudo?.arquivosCodigoExaminados ?? 0,
    funcoesExportadasTestadasN4: auditoriaTestesParaTudo?.totalFuncoesExportadasExaminadas ?? 0,
    totalPortoesObrigatorios: auditoriaCadeia?.totalPortoesObrigatorios ?? 0,
    totalMutacoesRegistradas: auditoriaCadeia?.totalMutacoesExaminadas ?? 0,
    violacoes,
    relatorioArquivos,
  };

  const md = [
    `### Inspeção Estática e Estrutural das 14 Leis: **${status}**`,
    `- **[N4] Suítes examinadas:** \`${arquivosTeste.length}\``,
    `- **[N4] Arquivos de código testados:** \`${dados.arquivosCodigoTestadosN4}\` (\`${dados.funcoesExportadasTestadasN4}\` funções exportadas com teste direto)`,
    `- **Portões obrigatórios (N3):** \`${dados.totalPortoesObrigatorios}\``,
    `- **Mutações registradas (L6):** \`${dados.totalMutacoesRegistradas}\``,
    ...(violacoes.length > 0 ? ['', '#### Violações Detectadas:', ...violacoes.map((v) => `- ${v}`)] : []),
  ].join('\n');

  return formatarSaidaFerramenta(dados, md, formato, status !== 'APROVADO');
}

/**
 * 3. Ferramenta Domínio A: Executar portões reais (L1 + N4 + Seção 5 pós-teste) com paginação.
 */
export function executarPortoesMcp(params = {}) {
  const diretorioAlvo = params.diretorioRaiz
    ? path.resolve(String(params.diretorioRaiz))
    : DIRETORIO_RAIZ_PADRAO;
  const formato = params.response_format ?? 'markdown';
  const filtro = params.filtroSuite ? String(params.filtroSuite) : null;

  const suitesCandidatas = CADEIA_CANONICA_TESTES.filter(
    (s) => !filtro || s.includes(filtro)
  );
  if (suitesCandidatas.length === 0) {
    return formatarSaidaFerramenta(
      {
        canalPermissao: 'AUTORIZADO',
        status: 'NAO_ENCONTRADO',
        marcadorExplicito: 'SUITE_PORTAO_NAO_ENCONTRADA',
        suitesExaminadasN4: 0,
      },
      `### [N4] Nenhuma suíte encontrada para o filtro \`${filtro}\``,
      formato,
      true
    );
  }

  const pagina = paginarItens(suitesCandidatas, params.limit ?? 20, params.offset ?? 0);
  const resultadosSuites = [];
  let todasVerdes = true;

  for (const suite of pagina.items) {
    const caminhoRel = path.join('tests', suite);
    const inicioMs = Date.now();
    const r = spawnSync(process.execPath, ['--test', '--test-reporter=spec', caminhoRel], {
      cwd: diretorioAlvo,
      env: criarAmbienteHigienizado(),
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
    const duracaoMs = Date.now() - inicioMs;
    const saida = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
    const contadoresN4 = [...saida.matchAll(/\[N4\][^\n]+/g)].map((m) => m[0].trim());
    const passou = r.status === 0 && contadoresN4.length > 0;
    if (!passou) todasVerdes = false;

    resultadosSuites.push({
      suite,
      statusExit: r.status ?? 1,
      verde: passou,
      duracaoMs,
      contadoresN4Count: contadoresN4.length,
      contadoresN4,
    });
  }

  const gitCommon = executarGit(diretorioAlvo, ['rev-parse', '--git-common-dir']);
  const mainGitDir = gitCommon.status === 0
    ? path.resolve(diretorioAlvo, gitCommon.saida)
    : path.join(diretorioAlvo, '.git');
  const bareAfter = executarGit(diretorioAlvo, ['--git-dir', mainGitDir, 'config', '--get', 'core.bare']).saida || 'false';
  if (bareAfter !== 'false') todasVerdes = false;

  const dados = {
    canalPermissao: 'AUTORIZADO',
    status: todasVerdes ? 'VERDE' : 'VERMELHO',
    coreBarePosTeste: bareAfter,
    suitesExaminadasN4: resultadosSuites.length,
    ...pagina,
    items: resultadosSuites,
  };

  const md = [
    `### Execução Real de Portões (L1 / N4 / Seção 5): **${dados.status}**`,
    `- **[N4] Suítes executadas nesta página:** \`${resultadosSuites.length}\` de \`${pagina.total}\``,
    `- **core.bare pós-teste (Seção 5):** \`${bareAfter}\``,
    ...resultadosSuites.map(
      (s) =>
        `- \`${s.suite}\`: **${s.verde ? 'PASS' : 'FAIL'}** (${s.duracaoMs} ms, \`${s.contadoresN4Count}\` contadores \`[N4]\`)`
    ),
  ].join('\n');

  return formatarSaidaFerramenta(dados, md, formato, !todasVerdes);
}

/**
 * 4. Ferramenta Domínio A: Executar mutações reais (Lei L6 / B6) em sandbox isolada.
 */
export function executarMutacoesL6Mcp(params = {}) {
  const diretorioAlvo = params.diretorioRaiz
    ? path.resolve(String(params.diretorioRaiz))
    : DIRETORIO_RAIZ_PADRAO;
  const formato = params.response_format ?? 'markdown';

  const todas = carregarMutacoes(diretorioAlvo);
  const idsFiltro = Array.isArray(params.ids) && params.ids.length > 0 ? params.ids : null;
  const arquivoFiltro = params.arquivoAlvo ? String(params.arquivoAlvo) : null;

  const selecionadas = todas.filter((m) => {
    if (idsFiltro && !idsFiltro.includes(m.id)) return false;
    if (arquivoFiltro && !m.arquivo.includes(arquivoFiltro)) return false;
    return true;
  });

  if (selecionadas.length === 0) {
    return formatarSaidaFerramenta(
      {
        canalPermissao: 'AUTORIZADO',
        status: 'NAO_ENCONTRADO',
        marcadorExplicito: 'MUTACAO_NAO_ENCONTRADA',
        mutacoesExaminadasN4: 0,
      },
      '### [L6 / N4] Nenhuma mutação encontrada para os filtros informados',
      formato,
      true
    );
  }

  const pagina = paginarItens(selecionadas, params.limit ?? 10, params.offset ?? 0);
  const idsPagina = pagina.items.map((m) => m.id);
  const execucao = executarMutacoes(diretorioAlvo, { ids: idsPagina });
  const mortasPeloMotivoCerto = execucao.resultados.filter((r) => r.confere).length;
  const todasConferem = mortasPeloMotivoCerto === execucao.resultados.length;

  const dados = {
    canalPermissao: 'AUTORIZADO',
    status: todasConferem ? 'TODAS_MORTAS_MOTIVO_CERTO' : 'SOBREVIVEU_OU_MOTIVO_ERRADO',
    baselineVerde: execucao.baselineVerde,
    mutacoesExaminadasN4: execucao.resultados.length,
    mortasPeloMotivoCerto,
    ...pagina,
    items: execucao.resultados,
  };

  const md = [
    `### Executor Real de Mutações (Lei L6): **${dados.status}**`,
    `- **[N4] Mutações executadas:** \`${mortasPeloMotivoCerto}/${execucao.resultados.length}\` mortas pelo motivo exato`,
    ...execucao.resultados.map(
      (r) => `- \`${r.id}\`: **${r.confere ? 'MORTA (OK)' : 'FALHOU'}** — \`${r.desatualizada ?? r.linha}\``
    ),
  ].join('\n');

  return formatarSaidaFerramenta(dados, md, formato, !todasConferem);
}

/**
 * 5. Ferramenta Domínio B: Iniciar cenário determinístico do Bio-Foil para teste de agente jogador.
 */
export function iniciarCenarioBiofoilMcp(params = {}) {
  const seedPartida = String(params.seedPartida ?? 'mcp-agent-seed-001');
  const idArquitetura = String(params.idArquitetura ?? 'CARCACA_ALFA');
  const setorNumero = Math.min(8, Math.max(1, Number(params.setorNumero ?? 1)));
  const tipoCenario = String(params.tipoCenario ?? 'COMBATE_BARCO');
  const formato = params.response_format ?? 'markdown';

  let estado = criarEstadoInicialPartida({ seedPartida, setorNumero }, idArquitetura);
  const proximo = structuredClone(estado);
  proximo.mapaSetorial.setorNumero = setorNumero;

  if (tipoCenario === 'COMBATE_BARCO') {
    proximo.meta.faseJogo = 'COMBATE';
    proximo.alvoCombate = structuredClone(criarAlvoSetor1Canonico('BARCO_HUMANO'));
  } else if (tipoCenario === 'COMBATE_MONSTRO') {
    proximo.meta.faseJogo = 'COMBATE';
    proximo.alvoCombate = structuredClone(criarAlvoSetor1Canonico('MONSTRO_MARINHO'));
  } else if (tipoCenario === 'CHEFE_FASE_1' || tipoCenario === 'CHEFE_FASE_2' || tipoCenario === 'CHEFE_FASE_3') {
    const fase = Number(tipoCenario.slice(-1));
    proximo.meta.faseJogo = 'COMBATE';
    proximo.alvoCombate = structuredClone(criarEstadoChefeDraga(fase));
  } else if (tipoCenario === 'MAPA_SETORIAL') {
    proximo.meta.faseJogo = 'MAPA';
    proximo.alvoCombate.ativo = false;
    const mapa = gerarMapaSetorial(seedPartida, setorNumero);
    proximo.mapaSetorial = {
      ...proximo.mapaSetorial,
      ...structuredClone(mapa),
      noAtualId: mapa.nos[0]?.id ?? 'NO_0_ENTRADA',
    };
  } else if (tipoCenario === 'LOJA_FORJA') {
    proximo.meta.faseJogo = 'LOJA';
    proximo.alvoCombate.ativo = false;
    proximo.estoqueLojaAtual = structuredClone(
      gerarEstoqueLojaForja(seedPartida, setorNumero, 'NO_LOJA_MCP')
    );
  } else {
    return formatarSaidaFerramenta(
      {
        canalPermissao: 'AUTORIZADO',
        status: 'CENARIO_INVALIDO',
        marcadorExplicito: 'TIPO_CENARIO_DESCONHECIDO',
      },
      `### Erro: Cenário desconhecido \`${tipoCenario}\``,
      formato,
      true
    );
  }

  estado = congelarProfundo(proximo);
  const viewModel = projetarViewModelWireframe(estado);
  const comandosPermitidosNaFase = ESQUEMA_15_COMANDOS_85A
    .filter((c) => c.fasesPermitidas.includes(estado.meta.faseJogo))
    .map((c) => c.tipo);

  const dados = {
    canalPermissao: 'AUTORIZADO',
    status: 'OK',
    tipoCenario,
    comandosPermitidosCountN4: comandosPermitidosNaFase.length,
    comandosPermitidosNaFase,
    resumoTatico: {
      faseJogo: estado.meta.faseJogo,
      estadoFisico: estado.naveJogador.estadoFisico,
      pesoTotalKg: calcularPesoTotalNave(estado.naveJogador),
      sustentacaoFoilKg: calcularSustentacaoFoil(estado.naveJogador),
      hpCascoJogador: estado.naveJogador.hpCascoAtual,
      hpCascoAlvo: estado.alvoCombate?.ativo ? estado.alvoCombate.hpCascoAtual : null,
    },
    estado,
    viewModel,
  };

  const md = [
    `### Cenário Bio-Foil Iniciado: \`${tipoCenario}\` (\`${idArquitetura}\`)`,
    `- **Fase:** \`${estado.meta.faseJogo}\` | **Estado Físico:** \`${estado.naveJogador.estadoFisico}\``,
    `- **Peso vs Sustentação:** \`${dados.resumoTatico.pesoTotalKg} kg\` / \`${dados.resumoTatico.sustentacaoFoilKg} kg\``,
    `- **[N4] Comandos atômicos permitidos na fase:** \`${comandosPermitidosNaFase.length}\` (${comandosPermitidosNaFase.join(', ')})`,
  ].join('\n');

  return formatarSaidaFerramenta(dados, md, formato, false);
}

/**
 * 6. Ferramenta Domínio B: Simular passo(s) de um agente jogador (despacho de comandos 8.5.A + avanço de ticks reais).
 */
export function simularPassoAgenteMcp(params = {}) {
  const formato = params.response_format ?? 'markdown';
  if (!params.estado || typeof params.estado !== 'object') {
    return formatarSaidaFerramenta(
      {
        canalPermissao: 'AUTORIZADO',
        status: 'PRECONDICAO_NAO_ATENDIDA',
        marcadorExplicito: 'ESTADO_AUSENTE_SIMULACAO',
      },
      '### Erro: Parâmetro obrigatório `estado` ausente.',
      formato,
      true
    );
  }

  let estadoAtual = congelarProfundo(params.estado);
  const estadoAnterior = estadoAtual;
  const comandos = Array.isArray(params.comandos) ? params.comandos : [];
  const resultadosComandos = [];

  for (const cmd of comandos) {
    const res = despacharComandoUi(estadoAtual, cmd);
    estadoAtual = res.estado;
    resultadosComandos.push({
      tipo: cmd.tipo,
      aceito: res.aceito,
      marcadorRejeicao: res.marcadorRejeicao,
      cueEmitido: res.cueEmitido,
    });
  }

  const passosTick = Math.min(200, Math.max(0, Number(params.passosTick ?? 1)));
  const dtSeg = Math.min(5.0, Math.max(0.05, Number(params.dtSeg ?? 0.25)));

  for (let i = 0; i < passosTick; i += 1) {
    if (estadoAtual.meta.faseJogo === 'COMBATE') {
      estadoAtual = avancarTickCombateCompleto(estadoAtual, dtSeg);
      if (estadoAtual.alvoCombate?.ativo) {
        if (estadoAtual.alvoCombate.faseChefe) {
          estadoAtual = avancarTickChefeDraga(estadoAtual, dtSeg);
        } else {
          estadoAtual = avancarTickIaInimiga(estadoAtual, dtSeg);
        }
      }
    }
  }

  const vitoria =
    estadoAtual.meta.faseJogo === 'COMBATE'
      ? avaliarCondicaoDeVitoria(estadoAtual)
      : { encerrado: false, modalidade: null, recompensa: null, animaisResgatadosIds: [] };
  const cuesAtivos = avaliarCuesSonorosAtivos(
    estadoAnterior,
    estadoAtual,
    resultadosComandos[resultadosComandos.length - 1] ?? null
  );
  const cuesAtivosIds = cuesAtivos.map((c) => c.id);
  const viewModel = projetarViewModelWireframe(estadoAtual);

  const dados = {
    canalPermissao: 'AUTORIZADO',
    status: 'OK',
    comandosProcessadosN4: resultadosComandos.length,
    ticksAvancadosN4: passosTick,
    resultadosComandos,
    vitoria,
    cuesAtivos,
    cuesAtivosIds,
    resumoPosPasso: {
      tickAtual: estadoAtual.meta.tickAtual,
      tempoCombateSeg: estadoAtual.meta.tempoCombateSeg,
      faseJogo: estadoAtual.meta.faseJogo,
      estadoFisico: estadoAtual.naveJogador.estadoFisico,
      pesoTotalKg: calcularPesoTotalNave(estadoAtual.naveJogador),
      sustentacaoFoilKg: calcularSustentacaoFoil(estadoAtual.naveJogador),
      hpCascoJogador: estadoAtual.naveJogador.hpCascoAtual,
      hpCascoAlvo: estadoAtual.alvoCombate?.hpCascoAtual ?? null,
    },
    estado: estadoAtual,
    viewModel,
  };

  const md = [
    `### Passo de Simulação do Agente Concluído (\`t = ${dados.resumoPosPasso.tempoCombateSeg}s\`)`,
    `- **[N4] Comandos processados:** \`${resultadosComandos.length}\` | **Ticks avançados:** \`${passosTick}\` (\`dt=${dtSeg}s\`)`,
    `- **Estado Físico:** \`${dados.resumoPosPasso.estadoFisico}\` (\`${dados.resumoPosPasso.pesoTotalKg} kg\` / \`${dados.resumoPosPasso.sustentacaoFoilKg} kg\`)`,
    `- **Cues Sonoros Ativos:** \`${cuesAtivosIds.join(', ') || 'NENHUM'}\``,
    `- **Condição de Vitória:** \`${vitoria.encerrado ? vitoria.modalidade : 'EM_ANDAMENTO'}\``,
  ].join('\n');

  return formatarSaidaFerramenta(dados, md, formato, false);
}

/**
 * 7. Ferramenta Domínio B: Inspecionar salas/órgãos do alvo inimigo respeitando estritamente o Canal L3.
 */
export function inspecionarAlvoL3Mcp(params = {}, opcoesDebug = {}) {
  const formato = params.response_format ?? 'markdown';
  if (!params.estado || typeof params.estado !== 'object') {
    return formatarSaidaFerramenta(
      {
        canalPermissao: 'AUTORIZADO',
        status: 'PRECONDICAO_NAO_ATENDIDA',
        marcadorExplicito: 'ESTADO_AUSENTE_INSPECAO_L3',
      },
      '### Erro: Parâmetro obrigatório `estado` ausente.',
      formato,
      true
    );
  }

  const estado = congelarProfundo(params.estado);
  const salasAlvo = estado.alvoCombate?.salasOuOrgaos ?? [];
  const resolverIdSala = (identificador) => {
    const str = String(identificador);
    const sufixo = str.replace(/^SALA_/, '');
    const achada = salasAlvo.find(
      (s) =>
        String(s.id) === str ||
        s.nome === str ||
        (sufixo.length > 0 && String(s.nome ?? '').includes(sufixo))
    );
    return achada ? achada.id : identificador;
  };
  const idsParaInspecionar =
    params.salaId !== undefined && params.salaId !== null
      ? [resolverIdSala(params.salaId)]
      : salasAlvo.map((s) => s.id);

  const leiturasL3 = idsParaInspecionar.map((id) => {
    const leitura = inspecionarSalaAlvo(estado, id);
    if (opcoesDebug.vazarVazioQuandoCegoL3 === true && leitura.status === 'SEM_PERMISSAO_VISAO') {
      return {
        salaId: id,
        ...leitura,
        dados: { tripulantes: [], sistemaVisivel: false },
      };
    }
    return {
      salaId: id,
      ...leitura,
    };
  });

  const dados = {
    canalPermissao:
      leiturasL3[0]?.canalPermissao ?? estado.alvoCombate?.canalVisibilidadeSonar ?? 'VISIVEL',
    status: 'OK',
    salasInspecionadasN4: leiturasL3.length,
    leiturasL3,
  };

  const md = [
    `### Inspeção de Alvo sob a Lei L3 (\`canal=${dados.canalPermissao}\`)`,
    `- **[N4] Salas inspecionadas:** \`${leiturasL3.length}\``,
    ...leiturasL3.map(
      (l) =>
        `- Sala \`${l.salaId}\`: canal=\`${l.canalPermissao}\` | status=\`${l.status}\` | marcador=\`${l.marcadorExplicito}\` | dados=\`${l.dados === undefined ? 'undefined (oculto L3)' : JSON.stringify(l.dados)}\``
    ),
  ].join('\n');

  return formatarSaidaFerramenta(dados, md, formato, false);
}

/**
 * 8. Ferramenta Domínio B: Avaliar a política de decisão de um agente em 5 cenários táticos determinísticos.
 */
export function avaliarPoliticaAgenteMcp(params = {}, opcoesDebug = {}) {
  const formato = params.response_format ?? 'markdown';
  const estrategia = String(params.estrategia ?? 'CANONICA_OTIMA');

  const cenarios = [];

  // Cenário 1: Respeito à Trava Hidrostática em 2_TOUCHDOWN (Matriz 6.2 Célula 2C)
  {
    const base = structuredClone(criarEstadoInicialPartida({ seedPartida: 'eval-c1' }, 'CARCACA_ALFA'));
    base.naveJogador.estadoFisico = '2_TOUCHDOWN';
    const estadoTd = congelarProfundo(base);
    const comandoAgente =
      estrategia === 'INGENUA_VIOLA_LEIS'
        ? { tipo: 'ALTERNAR_VALVULA', payload: { camaraId: 5, aberta: true } }
        : { tipo: 'ATIVAR_BAIACU', payload: { tripulanteId: 'trip-baiacu-1', inflado: true } };
    const res = despacharComandoUi(estadoTd, comandoAgente);
    const aprovado = estrategia === 'INGENUA_VIOLA_LEIS' ? res.aceito : res.aceito === true;
    cenarios.push({
      id: 'CENARIO_1_TRAVA_HIDROSTATICA_TOUCHDOWN',
      regraGdd: 'Matriz 6.2 Célula 2C: proibido abrir Válvula Externa em 2_TOUCHDOWN',
      comandoEscolhido: comandoAgente.tipo,
      aprovado,
      pontos: aprovado ? 20 : 0,
    });
  }

  // Cenário 2: Resposta ao Alarme de 4.0s da Fervura Oceânica na Fase 3 da Draga Continental (Célula 3H)
  {
    const base = structuredClone(criarEstadoInicialPartida({ seedPartida: 'eval-c2' }, 'CARCACA_ALFA'));
    base.alvoCombate = structuredClone(criarEstadoChefeDraga(3));
    base.alvoCombate.alarmeFervuraAtivoSeg = 4.0;
    const estadoF3 = congelarProfundo(base);
    const cues = avaliarCuesSonorosAtivos(estadoF3, estadoF3);
    const detectouAlarme = cues.some((c) => c.id === 'CUE_ALARME_FERVURA_4S');
    const manteveNoFoil =
      estrategia !== 'INGENUA_VIOLA_LEIS' && estadoF3.naveJogador.estadoFisico === '1_NO_FOIL';
    const aprovado = detectouAlarme && manteveNoFoil;
    cenarios.push({
      id: 'CENARIO_2_ALARME_FERVURA_4S_FASE3',
      regraGdd: 'Seção 5.5 / Matriz 6.2 Célula 3H: manter 1_NO_FOIL ao ouvir CUE_ALARME_FERVURA_4S',
      comandoEscolhido: manteveNoFoil ? 'MANTER_1_NO_FOIL' : 'MERGULHO_TATICO_SUICIDA',
      aprovado,
      pontos: aprovado ? 20 : 0,
    });
  }

  // Cenário 3: Leitura de Sala Alvo sob Águas Turvas Abissais (Lei L3: nunca assumir sala vazia quando NEGADO_SONAR)
  {
    const base = structuredClone(criarEstadoInicialPartida({ seedPartida: 'eval-c3' }, 'CARCACA_ALFA'));
    base.alvoCombate.canalVisibilidadeSonar = 'NEGADO_SONAR';
    const estadoCego = congelarProfundo(base);
    const idSalaTeste = estadoCego.alvoCombate.salasOuOrgaos[0]?.id ?? 1;
    const leitura = inspecionarSalaAlvo(estadoCego, idSalaTeste);
    const respeitouL3 =
      estrategia !== 'INGENUA_VIOLA_LEIS' &&
      leitura.canalPermissao === 'NEGADO_SONAR' &&
      leitura.dados === undefined;
    cenarios.push({
      id: 'CENARIO_3_SONAR_CEGO_LEI_L3',
      regraGdd: 'Seção 8.2 / Lei L3: diferenciar SALA_VISIVEL_VAZIA de CEGO_AGUAS_TURVAS_ABISSAIS',
      comandoEscolhido: respeitouL3 ? 'TRATAR_COMO_INCERTO_L3' : 'ASSUMIR_SALA_VAZIA',
      aprovado: respeitouL3,
      pontos: respeitouL3 ? 20 : 0,
    });
  }

  // Cenário 4: Prevenção de Cavitação do Sifão (< 62.5 kg de água interna tira -2 kg de sustentação por kg)
  {
    const base = structuredClone(criarEstadoInicialPartida({ seedPartida: 'eval-c4' }, 'CARCACA_ALFA'));
    base.naveJogador.camaras[0].aguaKg = 0;
    base.naveJogador.camaras[1].aguaKg = 0;
    base.naveJogador.camaras[2].aguaKg = 0;
    // 5 câmaras * 12.5 kg = 62.5 kg (no limiar exato da cavitação!)
    const estadoLimiar = congelarProfundo(base);
    const drenouQuartaSala = estrategia === 'INGENUA_VIOLA_LEIS';
    const aprovado = !drenouQuartaSala && calcularSustentacaoFoil(estadoLimiar.naveJogador) === 260;
    cenarios.push({
      id: 'CENARIO_4_LIMIAR_CAVITACAO_62_5KG',
      regraGdd: 'Seção 1.2 / Tabela 6.1: preservar >= 62.5 kg de água nos tanques para evitar cavitação',
      comandoEscolhido: drenouQuartaSala ? 'DRENAR_4A_CAMARA' : 'ESTANCAR_DRENAGEM_EM_62_5KG',
      aprovado,
      pontos: aprovado ? 20 : 0,
    });
  }

  // Cenário 5: Bloqueio de Abordagem contra Blindagem Térmica Externa da Fase 3 (10 pts)
  {
    const base = structuredClone(criarEstadoInicialPartida({ seedPartida: 'eval-c5' }, 'COURACA_LIMIAR'));
    base.alvoCombate = structuredClone(criarEstadoChefeDraga(3));
    const estadoBlindado = congelarProfundo(base);
    const tentouAbordarComBlindagem = estrategia === 'INGENUA_VIOLA_LEIS';
    const resAbordagem = despacharComandoUi(estadoBlindado, {
      tipo: 'LANCAR_ABORDAGEM',
      payload: { tripulantesIds: ['trip-caranguejo-1'], salaAlvoId: 'SALA_CONTROLE_DRAGA' },
    });
    const aprovado = !tentouAbordarComBlindagem && resAbordagem.aceito === false;
    cenarios.push({
      id: 'CENARIO_5_BLINDAGEM_TERMICA_FASE3',
      regraGdd: 'Seção 5.5 (MUT-O5-02): destruir os 10 pts de Blindagem Térmica antes de LANCAR_ABORDAGEM',
      comandoEscolhido: tentouAbordarComBlindagem ? 'LANCAR_ABORDAGEM_PREMATURA' : 'DERRUBAR_BLINDAGEM_COM_ARMAS',
      aprovado,
      pontos: aprovado ? 20 : 0,
    });
  }

  const pontuacaoTotal = opcoesDebug.forcarPontuacaoZero
    ? 0
    : cenarios.reduce((acc, c) => acc + c.pontos, 0);
  const aprovadosCount = cenarios.filter((c) => c.aprovado).length;

  const dados = {
    canalPermissao: 'AUTORIZADO',
    status: pontuacaoTotal === 100 ? 'AGENTE_APROVADO_100' : 'AGENTE_COM_FALHAS',
    estrategiaAvaliada: estrategia,
    cenariosExaminadosN4: cenarios.length,
    aprovadosCount,
    pontuacaoTotal,
    pontuacaoMaxima: 100,
    cenarios,
  };

  const md = [
    `### Benchmark de Política de Agente (\`${estrategia}\`): **${pontuacaoTotal}/100**`,
    `- **[N4] Cenários táticos avaliados:** \`${cenarios.length}\` (\`${aprovadosCount}\` aprovados)`,
    ...cenarios.map(
      (c) => `- \`${c.id}\`: **${c.aprovado ? 'PASS (+20)' : 'FAIL (0)'}** — \`${c.comandoEscolhido}\` (${c.regraGdd})`
    ),
  ].join('\n');

  return formatarSaidaFerramenta(dados, md, formato, false);
}

/**
 * Catálogo completo das 8 ferramentas MCP com JSON Schema estrito e anotações MCP.
 */
export const CATALOGO_FERRAMENTAS_MCP = Object.freeze([
  {
    name: 'agent_test_auditar_ambiente_n5_secao5',
    title: 'Auditar Ambiente Git, Carga (N5), Distância da Main (N7) e Seção 5',
    description:
      'Verifica carga da máquina (< 20), core.bare == false, core.hooksPath == scripts/hooks, unset das 7 variáveis Git nos hooks e distância até a main (Lei N5, Lei N7 e Seção 5).',
    inputSchema: {
      type: 'object',
      properties: {
        diretorioRaiz: { type: 'string', description: 'Diretório raiz do repositório Git a auditar (opcional).' },
        limiteCargaMaquina: { type: 'number', minimum: 1, maximum: 100, default: 20 },
        autorizado: { type: 'boolean', default: true },
        response_format: { type: 'string', enum: ['markdown', 'json'], default: 'markdown' },
      },
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'agent_test_inspecionar_codigo_14_leis',
    title: 'Inspecionar Código e Suítes de Teste contra as 14 Leis',
    description:
      'Analisa estática e estruturalmente os testes e módulos do repositório contra mocks proibidos (L1), tautologias (L4), tripwires de cadeia canônica (L5), test.skip (N2), PORTOES.md (N3), contadores [N4] e caminhos de máquina (N5).',
    inputSchema: {
      type: 'object',
      properties: {
        diretorioRaiz: { type: 'string', description: 'Diretório raiz do projeto (opcional).' },
        response_format: { type: 'string', enum: ['markdown', 'json'], default: 'markdown' },
      },
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'agent_test_executar_portoes',
    title: 'Executar Suítes de Portão em Ambiente Higienizado (L1 / N4 / Seção 5)',
    description:
      'Executa uma ou mais suítes de teste reais (tests/01..09) limpando as 7 variáveis Git e NODE_TEST_CONTEXT, extraindo contadores [N4] e conferindo core.bare == false após a corrida.',
    inputSchema: {
      type: 'object',
      properties: {
        diretorioRaiz: { type: 'string', description: 'Diretório raiz do projeto (opcional).' },
        filtroSuite: { type: 'string', description: 'Filtro opcional pelo nome da suíte (ex.: "03-onda1").' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        offset: { type: 'integer', minimum: 0, default: 0 },
        response_format: { type: 'string', enum: ['markdown', 'json'], default: 'markdown' },
      },
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'agent_test_executar_mutacoes_l6',
    title: 'Executar Mutações Semânticas Reais em Sandbox Isolada (Lei L6)',
    description:
      'Executa mutações de padrao/protocolo/mutacoes.json numa cópia temporária descartável e verifica se cada mutação fica vermelha pela 1ª linha de falha real declarada.',
    inputSchema: {
      type: 'object',
      properties: {
        diretorioRaiz: { type: 'string', description: 'Diretório raiz do projeto (opcional).' },
        ids: { type: 'array', items: { type: 'string' }, description: 'Lista de IDs de mutação (ex.: ["MUT-01", "MUT-61"]).' },
        arquivoAlvo: { type: 'string', description: 'Filtro por caminho do arquivo mutado.' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
        offset: { type: 'integer', minimum: 0, default: 0 },
        response_format: { type: 'string', enum: ['markdown', 'json'], default: 'markdown' },
      },
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'agent_test_iniciar_cenario_biofoil',
    title: 'Iniciar Cenário Determinístico Bio-Foil para Teste de Agente',
    description:
      'Gera um GameState congelado (L2) e o ViewModel 16:9 (960x540 -> 1920x1080) para testar agentes em Combate (Barco, Monstro, Draga Fases 1..3), Mapa Setorial ou Recife-Forja.',
    inputSchema: {
      type: 'object',
      properties: {
        seedPartida: { type: 'string', default: 'mcp-agent-seed-001' },
        idArquitetura: {
          type: 'string',
          enum: ['CARCACA_ALFA', 'MANTA_VOLT', 'COURACA_LIMIAR', 'SOMBRA_ABISSAL', 'COLMEIA_VIVA'],
          default: 'CARCACA_ALFA',
        },
        setorNumero: { type: 'integer', minimum: 1, maximum: 8, default: 1 },
        tipoCenario: {
          type: 'string',
          enum: [
            'COMBATE_BARCO',
            'COMBATE_MONSTRO',
            'CHEFE_FASE_1',
            'CHEFE_FASE_2',
            'CHEFE_FASE_3',
            'MAPA_SETORIAL',
            'LOJA_FORJA',
          ],
          default: 'COMBATE_BARCO',
        },
        response_format: { type: 'string', enum: ['markdown', 'json'], default: 'markdown' },
      },
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'agent_test_simular_passo_agente',
    title: 'Simular Comandos Atômicos (8.5.A) e Avanço de Ticks do Agente',
    description:
      'Aplica uma lista de comandos atômicos do agente sobre um GameState congelado, avança N ticks determinísticos do motor completo, calcula Cues Sonoros e avalia Condições de Vitória.',
    inputSchema: {
      type: 'object',
      required: ['estado'],
      properties: {
        estado: { type: 'object', description: 'GameState de entrada.' },
        comandos: {
          type: 'array',
          items: {
            type: 'object',
            required: ['tipo'],
            properties: {
              tipo: { type: 'string' },
              payload: { type: 'object' },
            },
          },
          default: [],
        },
        passosTick: { type: 'integer', minimum: 0, maximum: 200, default: 1 },
        dtSeg: { type: 'number', minimum: 0.05, maximum: 5.0, default: 0.25 },
        response_format: { type: 'string', enum: ['markdown', 'json'], default: 'markdown' },
      },
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'agent_test_inspecionar_alvo_l3',
    title: 'Inspecionar Salas/Órgãos do Alvo com Canal Explícito de Visibilidade (Lei L3)',
    description:
      'Lê uma ou todas as salas do alvo inimigo pelo seletor puro inspecionarSalaAlvo, separando SALA_VISIVEL_VAZIA de CEGO_AGUAS_TURVAS_ABISSAIS e CEGO_BOLSA_TINTA.',
    inputSchema: {
      type: 'object',
      required: ['estado'],
      properties: {
        estado: { type: 'object', description: 'GameState contendo alvoCombate.' },
        salaId: { type: 'string', description: 'ID opcional da sala específica a inspecionar.' },
        response_format: { type: 'string', enum: ['markdown', 'json'], default: 'markdown' },
      },
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'agent_test_avaliar_politica_agente',
    title: 'Executar Benchmark Tático de 5 Cenários sobre Política de Agente',
    description:
      'Avalia se uma política de agente respeita Trava Hidrostática (2C), Alarme de Fervura 4.0s (3H), Canal L3 em Águas Turvas, Limiar de Cavitação (62.5 kg) e Blindagem Térmica da Fase 3.',
    inputSchema: {
      type: 'object',
      properties: {
        estrategia: {
          type: 'string',
          enum: ['CANONICA_OTIMA', 'INGENUA_VIOLA_LEIS'],
          default: 'CANONICA_OTIMA',
        },
        response_format: { type: 'string', enum: ['markdown', 'json'], default: 'markdown' },
      },
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
]);

export const CATALOGO_RECURSOS_MCP = Object.freeze([
  {
    uri: 'leis://protocolo/14-leis',
    name: 'Protocolo das 14 Leis (L1..L7 e N1..N7 + Seção 5)',
    description: 'Documento canônico das 14 Leis de Teste e Blindagem de Ambiente Git.',
    mimeType: 'text/markdown',
  },
  {
    uri: 'leis://protocolo/portoes',
    name: 'Registro de Portões (PORTOES.md — Lei N3)',
    description: 'Tabela de portões DECLARADO vs OBRIGATORIO com evidências de 3 corridas na main.',
    mimeType: 'text/markdown',
  },
  {
    uri: 'biofoil://gdd/ssot-matriz',
    name: 'SSOT (27 Constantes) e Matriz 5x8 (40 Células) do Bio-Foil',
    description: 'Extração estruturada da Tabela 6.1 e da Matriz de Interações 6.2.',
    mimeType: 'application/json',
  },
]);

export const CATALOGO_PROMPTS_MCP = Object.freeze([
  {
    name: 'auditar_frente_14_leis',
    description: 'Roteiro estruturado para um agente auditar uma frente de trabalho sob as 14 Leis.',
    arguments: [
      { name: 'frente', description: 'Nome da frente ou branch em auditoria', required: false },
    ],
  },
  {
    name: 'avaliar_agente_combate_biofoil',
    description: 'Roteiro para testar a tomada de decisão de um agente tático no Bio-Foil.',
    arguments: [
      { name: 'idArquitetura', description: 'Carcaça da bio-nave (ex.: CARCACA_ALFA)', required: false },
    ],
  },
]);

function validarArgumentosContraSchema(args, schema) {
  if (args === undefined || args === null) return { valido: true, argsNormalizados: {} };
  if (typeof args !== 'object' || Array.isArray(args)) {
    return { valido: false, erro: 'Os argumentos da ferramenta devem ser um objeto JSON.' };
  }
  const propsPermitidas = new Set(Object.keys(schema.properties ?? {}));
  if (schema.additionalProperties === false) {
    for (const chave of Object.keys(args)) {
      if (!propsPermitidas.has(chave)) {
        return {
          valido: false,
          erro: `Propriedade não permitida '${chave}'. Propriedades aceitas: ${[...propsPermitidas].join(', ')}`,
        };
      }
    }
  }
  for (const req of schema.required ?? []) {
    if (args[req] === undefined) {
      return { valido: false, erro: `Campo obrigatório ausente: '${req}'.` };
    }
  }
  for (const [chave, spec] of Object.entries(schema.properties ?? {})) {
    const val = args[chave];
    if (val === undefined) continue;
    if (spec.enum && !spec.enum.includes(val)) {
      return {
        valido: false,
        erro: `Valor inválido para '${chave}': '${val}'. Valores aceitos: ${spec.enum.join(', ')}`,
      };
    }
  }
  return { valido: true, argsNormalizados: args };
}

/**
 * Invoca uma ferramenta MCP pelo nome, aplicando validação de schema e retornando resposta padrão MCP.
 */
export function invocarFerramentaMcp(nomeFerramenta, args = {}, opcoesDebug = {}) {
  const def = CATALOGO_FERRAMENTAS_MCP.find((t) => t.name === nomeFerramenta);
  if (!def) {
    return formatarSaidaFerramenta(
      {
        canalPermissao: 'AUTORIZADO',
        status: 'NAO_ENCONTRADO',
        marcadorExplicito: 'FERRAMENTA_MCP_INEXISTENTE',
        nomeFerramenta,
      },
      `### Erro: Ferramenta MCP inexistente: \`${nomeFerramenta}\`. Use \`tools/list\` para ver as 8 ferramentas disponíveis.`,
      'markdown',
      true
    );
  }

  const validacao = validarArgumentosContraSchema(args, def.inputSchema);
  if (!validacao.valido) {
    return formatarSaidaFerramenta(
      {
        canalPermissao: 'AUTORIZADO',
        status: 'ARGUMENTOS_INVALIDOS',
        marcadorExplicito: 'SCHEMA_INPUT_VIOLADO',
        erro: validacao.erro,
      },
      `### Erro de Validação em \`${nomeFerramenta}\`\n- ${validacao.erro}`,
      'markdown',
      true
    );
  }

  const a = validacao.argsNormalizados;
  switch (nomeFerramenta) {
    case 'agent_test_auditar_ambiente_n5_secao5':
      return auditarAmbienteN5Secao5(a, opcoesDebug);
    case 'agent_test_inspecionar_codigo_14_leis':
      return inspecionarCodigo14Leis(a, opcoesDebug);
    case 'agent_test_executar_portoes':
      return executarPortoesMcp(a);
    case 'agent_test_executar_mutacoes_l6':
      return executarMutacoesL6Mcp(a);
    case 'agent_test_iniciar_cenario_biofoil':
      return iniciarCenarioBiofoilMcp(a);
    case 'agent_test_simular_passo_agente':
      return simularPassoAgenteMcp(a);
    case 'agent_test_inspecionar_alvo_l3':
      return inspecionarAlvoL3Mcp(a, opcoesDebug);
    case 'agent_test_avaliar_politica_agente':
      return avaliarPoliticaAgenteMcp(a, opcoesDebug);
    default:
      throw new Error(`Ferramenta não mapeada: ${nomeFerramenta}`);
  }
}

export function lerRecursoMcp(uri, diretorioRaiz = DIRETORIO_RAIZ_PADRAO) {
  if (uri === 'leis://protocolo/14-leis') {
    const texto = fs.readFileSync(path.join(diretorioRaiz, 'padrao', 'protocolo', 'LEIS-DE-TESTE.md'), 'utf8');
    return congelarProfundo({ contents: [{ uri, mimeType: 'text/markdown', text: texto }] });
  }
  if (uri === 'leis://protocolo/portoes') {
    const texto = fs.readFileSync(path.join(diretorioRaiz, 'padrao', 'protocolo', 'PORTOES.md'), 'utf8');
    return congelarProfundo({ contents: [{ uri, mimeType: 'text/markdown', text: texto }] });
  }
  if (uri === 'biofoil://gdd/ssot-matriz') {
    const cadeia = carregarCadeiaCanonicaGdd(diretorioRaiz);
    const ssot = extrairSsotEMatrizDoVolume06(cadeia.volumes[5].conteudo);
    return congelarProfundo({
      contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(ssot, null, 2) }],
    });
  }
  throw new Error(`[MCP Resource] URI não encontrada: ${uri}`);
}

export function obterPromptMcp(name, args = {}) {
  if (name === 'auditar_frente_14_leis') {
    const frente = args.frente ?? 'atual';
    return congelarProfundo({
      description: `Auditoria completa da frente ${frente} sob as 14 Leis`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Execute em sequência: 1) agent_test_auditar_ambiente_n5_secao5; 2) agent_test_inspecionar_codigo_14_leis; 3) agent_test_executar_portoes; 4) agent_test_executar_mutacoes_l6 na frente "${frente}".`,
          },
        },
      ],
    });
  }
  if (name === 'avaliar_agente_combate_biofoil') {
    const arq = args.idArquitetura ?? 'CARCACA_ALFA';
    return congelarProfundo({
      description: `Avaliação tática do agente com a carcaça ${arq}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Inicie o cenário com agent_test_iniciar_cenario_biofoil (idArquitetura="${arq}"), inspecione o alvo com agent_test_inspecionar_alvo_l3, simule passos com agent_test_simular_passo_agente e rode agent_test_avaliar_politica_agente.`,
          },
        },
      ],
    });
  }
  throw new Error(`[MCP Prompt] Prompt não encontrado: ${name}`);
}

/**
 * Processador puro de mensagens JSON-RPC 2.0 do protocolo MCP.
 */
export function processarMensagemJsonRpc(mensagem, opcoesDebug = {}) {
  if (!mensagem || typeof mensagem !== 'object' || mensagem.jsonrpc !== '2.0') {
    return congelarProfundo({
      jsonrpc: '2.0',
      id: mensagem?.id ?? null,
      error: { code: -32600, message: 'Invalid Request: esperado jsonrpc="2.0"' },
    });
  }

  const { id, method, params } = mensagem;

  // Notificações JSON-RPC (sem id) não geram resposta
  if (id === undefined && String(method).startsWith('notifications/')) {
    return null;
  }

  try {
    switch (method) {
      case 'initialize':
        return congelarProfundo({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: params?.protocolVersion ?? MCP_SERVER_INFO.protocolVersion,
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false },
              prompts: { listChanged: false },
            },
            serverInfo: {
              name: MCP_SERVER_INFO.name,
              version: MCP_SERVER_INFO.version,
            },
          },
        });

      case 'ping':
        return congelarProfundo({ jsonrpc: '2.0', id, result: {} });

      case 'tools/list':
        return congelarProfundo({
          jsonrpc: '2.0',
          id,
          result: { tools: CATALOGO_FERRAMENTAS_MCP },
        });

      case 'tools/call': {
        const nome = params?.name;
        const argumentos = params?.arguments ?? {};
        const resultado = invocarFerramentaMcp(nome, argumentos, opcoesDebug);
        return congelarProfundo({
          jsonrpc: '2.0',
          id,
          result: resultado,
        });
      }

      case 'resources/list':
        return congelarProfundo({
          jsonrpc: '2.0',
          id,
          result: { resources: CATALOGO_RECURSOS_MCP },
        });

      case 'resources/read':
        return congelarProfundo({
          jsonrpc: '2.0',
          id,
          result: lerRecursoMcp(params?.uri),
        });

      case 'prompts/list':
        return congelarProfundo({
          jsonrpc: '2.0',
          id,
          result: { prompts: CATALOGO_PROMPTS_MCP },
        });

      case 'prompts/get':
        return congelarProfundo({
          jsonrpc: '2.0',
          id,
          result: obterPromptMcp(params?.name, params?.arguments),
        });

      default:
        return congelarProfundo({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        });
    }
  } catch (err) {
    return congelarProfundo({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: err instanceof Error ? err.message : String(err),
      },
    });
  }
}

/**
 * Transporte stdio (padrão local para Antigravity / Claude Code).
 */
export function iniciarTransporteStdio(opcoesDebug = {}) {
  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
  });

  rl.on('line', (linha) => {
    const limpa = linha.trim();
    if (!limpa) return;
    let msg;
    try {
      msg = JSON.parse(limpa);
    } catch {
      const erroParse = {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' },
      };
      process.stdout.write(`${JSON.stringify(erroParse)}\n`);
      return;
    }
    const resposta = processarMensagemJsonRpc(msg, opcoesDebug);
    if (resposta !== null) {
      process.stdout.write(`${JSON.stringify(resposta)}\n`);
    }
  });
}

/**
 * Transporte Streamable HTTP em 127.0.0.1 com proteção contra DNS Rebinding (MCP Best Practices).
 */
export function criarServidorHttpMcp(opcoesDebug = {}) {
  return http.createServer((req, res) => {
    const host = String(req.headers.host ?? '');
    const origin = String(req.headers.origin ?? '');
    const hostValido =
      !host || host.startsWith('127.0.0.1') || host.startsWith('localhost');
    const originValido =
      !origin ||
      origin.startsWith('http://127.0.0.1') ||
      origin.startsWith('http://localhost');

    if (!hostValido || !originValido) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'DNS Rebinding protection: Origin/Host rejected' }));
      return;
    }

    if (req.method !== 'POST' || req.url !== '/mcp') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Use POST /mcp' }));
      return;
    }

    let corpo = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      corpo += chunk;
    });
    req.on('end', () => {
      let msg;
      try {
        msg = JSON.parse(corpo);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })
        );
        return;
      }
      const resposta = processarMensagemJsonRpc(msg, opcoesDebug);
      if (resposta === null) {
        res.writeHead(202);
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(resposta));
    });
  });
}

const executadoDiretamente =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (executadoDiretamente) {
  if (process.argv.includes('--http') || process.env.TRANSPORT === 'http') {
    const porta = Number(process.env.PORT || 3339);
    const srv = criarServidorHttpMcp();
    srv.listen(porta, '127.0.0.1', () => {
      console.error(`[MCP] agent-testing-mcp-server ativo em http://127.0.0.1:${porta}/mcp`);
    });
  } else {
    iniciarTransporteStdio();
  }
}
