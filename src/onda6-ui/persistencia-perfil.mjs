/**
 * ONDA 6 — Persistência: Meta-Progresso (`profile.json`) vs. Estado da Run (`run_save.json` c/ Permadeath)
 * Dono Único (Lei N5): src/onda6-ui/persistencia-perfil.mjs
 *
 * Fontes canônicas:
 *  - Seção 8.5.B (Tabela das 5 Carcaças Desbloqueáveis, Predicados Puros e Separação run_save.json vs profile.json)
 *  - Seção 9.2 (Transições TR_7A, TR_7B e TR_7C apagam run_save.json e preservam profile.json)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { clonarProfundoCongelado } from '../gdd-parser.mjs';
import { avaliarPredicadoDesbloqueio } from '../oraculos-referencia.mjs';
import { aplicarTransicaoCicloPartida } from '../onda4-mapa/ciclo-partida.mjs';

export const CARCACAS_PERFIL_85B = Object.freeze([
  Object.freeze({
    idArquitetura: 'CARCACA_ALFA',
    nome: '1. Carcaça Alfa',
    estadoInicialDesbloqueado: true,
    predicadoCodigo: 'sempreDesbloqueada === true',
  }),
  Object.freeze({
    idArquitetura: 'MANTA_VOLT',
    nome: '2. Manta-Volt',
    estadoInicialDesbloqueado: false,
    predicadoCodigo: 'setorNumero >= 4 && vitoriaCombate === true && danoCascoCausadoAoInimigoNestaLuta === 0',
  }),
  Object.freeze({
    idArquitetura: 'COURACA_LIMIAR',
    nome: '3. Couraça-Limiar',
    estadoInicialDesbloqueado: false,
    predicadoCodigo: 'barcosCapturadosIntactosNestaRun >= 5',
  }),
  Object.freeze({
    idArquitetura: 'SOMBRA_ABISSAL',
    nome: '4. Sombra-Abissal',
    estadoInicialDesbloqueado: false,
    predicadoCodigo: 'orgaosIntactosExtraidosNestaRun >= 4',
  }),
  Object.freeze({
    idArquitetura: 'COLMEIA_VIVA',
    nome: '5. Colmeia-Viva',
    estadoInicialDesbloqueado: false,
    predicadoCodigo: 'setorNumeroAlcanceMaxNestaRun >= 8',
  }),
]);

/**
 * Cria o estado inicial imutável do arquivo `profile.json`.
 */
export function criarPerfilInicial() {
  return clonarProfundoCongelado({
    versaoPerfil: '1.0.0',
    carcacasDesbloqueadas: {
      CARCACA_ALFA: true,
      MANTA_VOLT: false,
      COURACA_LIMIAR: false,
      SOMBRA_ABISSAL: false,
      COLMEIA_VIVA: false,
    },
    estatisticasGlobais: {
      runsIniciadas: 0,
      vitoriasFinais: 0,
      barcosCapturadosTotal: 0,
      orgaosExtraidosTotal: 0,
    },
  });
}

/**
 * Avalia os 5 predicados puros da Seção 8.5.B contra o contexto da run atual e atualiza `profile.json`.
 * Um desbloqueio conquistado nunca é desfeito.
 */
export function atualizarPerfilComMetricasRun(perfilAtual, contextoMetricas = {}) {
  const contextoCompleto = {
    sempreDesbloqueada: true,
    setorNumero: 1,
    vitoriaCombate: false,
    danoCascoCausadoAoInimigoNestaLuta: 99,
    barcosCapturadosIntactosNestaRun: 0,
    orgaosIntactosExtraidosNestaRun: 0,
    setorNumeroAlcanceMaxNestaRun: 1,
    ...contextoMetricas,
  };

  const novasCarcacas = { ...perfilAtual.carcacasDesbloqueadas };
  for (const spec of CARCACAS_PERFIL_85B) {
    const jaDesbloqueada = Boolean(novasCarcacas[spec.idArquitetura]) || spec.estadoInicialDesbloqueado;
    const desbloqueouAgora = avaliarPredicadoDesbloqueio(spec.predicadoCodigo, contextoCompleto);
    novasCarcacas[spec.idArquitetura] = jaDesbloqueada || desbloqueouAgora;
  }

  const baseEst = perfilAtual.estatisticasGlobais ?? {
    runsIniciadas: 0,
    vitoriasFinais: 0,
    barcosCapturadosTotal: 0,
    orgaosExtraidosTotal: 0,
  };
  const estatisticasGlobais = {
    runsIniciadas: Number(baseEst.runsIniciadas ?? 0) + Number(contextoMetricas.incrementarRunsIniciadas ?? 0),
    vitoriasFinais: Number(baseEst.vitoriasFinais ?? 0) + Number(contextoMetricas.incrementarVitoriasFinais ?? 0),
    barcosCapturadosTotal:
      Number(baseEst.barcosCapturadosTotal ?? 0) + Number(contextoMetricas.incrementarBarcosCapturados ?? 0),
    orgaosExtraidosTotal:
      Number(baseEst.orgaosExtraidosTotal ?? 0) + Number(contextoMetricas.incrementarOrgaosExtraidos ?? 0),
  };

  return clonarProfundoCongelado({
    ...perfilAtual,
    carcacasDesbloqueadas: novasCarcacas,
    estatisticasGlobais,
  });
}

/**
 * Executa a transição de ciclo de partida coordenando `run_save.json` (Permadeath) e `profile.json`.
 */
export function gerenciarPersistenciaTransicao(
  estadoRun,
  perfilAtual,
  idTransicao,
  contextoMetricas = {}
) {
  const tr = aplicarTransicaoCicloPartida(estadoRun, idTransicao);
  if (!tr.aceita) {
    return clonarProfundoCongelado({
      aceita: false,
      erro: tr.erro,
      runSaveJson: JSON.stringify(estadoRun),
      profileJson: JSON.stringify(perfilAtual),
      perfilObjeto: perfilAtual,
      estadoRun: tr.estado,
    });
  }

  const novoPerfil = tr.atualizaProfileJson
    ? atualizarPerfilComMetricasRun(perfilAtual, contextoMetricas)
    : perfilAtual;

  const runSaveJson = tr.apagaRunSavePermadeath ? null : JSON.stringify(tr.estado);

  return clonarProfundoCongelado({
    aceita: true,
    erro: null,
    faseResultante: tr.faseResultante,
    apagouRunSavePermadeath: tr.apagaRunSavePermadeath,
    runSaveJson,
    profileJson: JSON.stringify(novoPerfil),
    perfilObjeto: novoPerfil,
    estadoRun: tr.estado,
  });
}

/**
 * Resolve o diretório de dados persistentes no sistema operacional (ou override em testes),
 * nunca poluindo a raiz do repositório (Lei L5) nem embutindo caminhos fixos de máquina.
 */
export function obterDiretorioDadosPadraoBiofoil(opcoes = {}) {
  const explicito = opcoes?.diretorioDados ?? process.env.BIOFOIL_DATA_DIR ?? null;
  if (typeof explicito === 'string' && explicito.trim().length > 0) {
    return path.resolve(explicito.trim());
  }
  const home = typeof os.homedir === 'function' ? os.homedir() : os.tmpdir();
  return path.join(home, '.biofoil-save');
}

function gravarJsonAtomico(caminhoAlvo, objetoDados) {
  const pasta = path.dirname(caminhoAlvo);
  fs.mkdirSync(pasta, { recursive: true });
  const sufixoTmp = `.tmp-${process.pid}-${Date.now()}`;
  const caminhoTmp = `${caminhoAlvo}${sufixoTmp}`;
  fs.writeFileSync(caminhoTmp, JSON.stringify(objetoDados, null, 2), 'utf8');
  fs.renameSync(caminhoTmp, caminhoAlvo);
}

/**
 * Salva `profile.json` atomicamente em disco, preservando desbloqueios e estatísticas globais.
 */
export function salvarPerfilDisco(perfil, opcoes = {}) {
  if (!perfil || typeof perfil !== 'object') {
    return clonarProfundoCongelado({
      ok: false,
      status: 'PERFIL_INVALIDO',
      marcadorExplicito: 'PERFIL_OBJETO_OBRIGATORIO',
      caminhoArquivo: null,
      perfil: null,
    });
  }
  const dir = obterDiretorioDadosPadraoBiofoil(opcoes);
  const caminhoPerfil = path.join(dir, 'profile.json');
  const perfilNormalizado = {
    versaoPerfil: String(perfil.versaoPerfil ?? '1.0.0'),
    carcacasDesbloqueadas: {
      CARCACA_ALFA: true,
      MANTA_VOLT: Boolean(perfil.carcacasDesbloqueadas?.MANTA_VOLT),
      COURACA_LIMIAR: Boolean(perfil.carcacasDesbloqueadas?.COURACA_LIMIAR),
      SOMBRA_ABISSAL: Boolean(perfil.carcacasDesbloqueadas?.SOMBRA_ABISSAL),
      COLMEIA_VIVA: Boolean(perfil.carcacasDesbloqueadas?.COLMEIA_VIVA),
    },
    estatisticasGlobais: {
      runsIniciadas: Math.max(0, Math.floor(Number(perfil.estatisticasGlobais?.runsIniciadas ?? 0))),
      vitoriasFinais: Math.max(0, Math.floor(Number(perfil.estatisticasGlobais?.vitoriasFinais ?? 0))),
      barcosCapturadosTotal: Math.max(0, Math.floor(Number(perfil.estatisticasGlobais?.barcosCapturadosTotal ?? 0))),
      orgaosExtraidosTotal: Math.max(0, Math.floor(Number(perfil.estatisticasGlobais?.orgaosExtraidosTotal ?? 0))),
    },
  };
  gravarJsonAtomico(caminhoPerfil, perfilNormalizado);
  return clonarProfundoCongelado({
    ok: true,
    status: 'SALVO_DISCO',
    marcadorExplicito: 'PROFILE_JSON_PERSISTIDO',
    caminhoArquivo: caminhoPerfil,
    perfil: perfilNormalizado,
  });
}

/**
 * Carrega `profile.json` do disco (ou inicializa o perfil padrão se ainda não existir, com canal L3 explícito).
 */
export function carregarPerfilDisco(opcoes = {}) {
  const dir = obterDiretorioDadosPadraoBiofoil(opcoes);
  const caminhoPerfil = path.join(dir, 'profile.json');
  if (!fs.existsSync(caminhoPerfil)) {
    const inicial = criarPerfilInicial();
    if (opcoes.inicializarSeAusente !== false) {
      gravarJsonAtomico(caminhoPerfil, inicial);
    }
    return clonarProfundoCongelado({
      ok: true,
      status: 'CRIADO_PADRAO',
      marcadorExplicito: 'PROFILE_JSON_CRIADO_INICIAL',
      caminhoArquivo: caminhoPerfil,
      perfil: inicial,
    });
  }
  try {
    const bruto = JSON.parse(fs.readFileSync(caminhoPerfil, 'utf8'));
    const perfilValidado = {
      versaoPerfil: String(bruto?.versaoPerfil ?? '1.0.0'),
      carcacasDesbloqueadas: {
        CARCACA_ALFA: true,
        MANTA_VOLT: Boolean(bruto?.carcacasDesbloqueadas?.MANTA_VOLT),
        COURACA_LIMIAR: Boolean(bruto?.carcacasDesbloqueadas?.COURACA_LIMIAR),
        SOMBRA_ABISSAL: Boolean(bruto?.carcacasDesbloqueadas?.SOMBRA_ABISSAL),
        COLMEIA_VIVA: Boolean(bruto?.carcacasDesbloqueadas?.COLMEIA_VIVA),
      },
      estatisticasGlobais: {
        runsIniciadas: Math.max(0, Math.floor(Number(bruto?.estatisticasGlobais?.runsIniciadas ?? 0))),
        vitoriasFinais: Math.max(0, Math.floor(Number(bruto?.estatisticasGlobais?.vitoriasFinais ?? 0))),
        barcosCapturadosTotal: Math.max(0, Math.floor(Number(bruto?.estatisticasGlobais?.barcosCapturadosTotal ?? 0))),
        orgaosExtraidosTotal: Math.max(0, Math.floor(Number(bruto?.estatisticasGlobais?.orgaosExtraidosTotal ?? 0))),
      },
    };
    return clonarProfundoCongelado({
      ok: true,
      status: 'CARREGADO_DISCO',
      marcadorExplicito: 'PROFILE_JSON_LIDO_COM_SUCESSO',
      caminhoArquivo: caminhoPerfil,
      perfil: perfilValidado,
    });
  } catch {
    const fallback = criarPerfilInicial();
    return clonarProfundoCongelado({
      ok: false,
      status: 'ARQUIVO_CORROMPIDO',
      marcadorExplicito: 'PROFILE_JSON_CORROMPIDO_FALLBACK_INICIAL',
      caminhoArquivo: caminhoPerfil,
      perfil: fallback,
    });
  }
}

/**
 * Apaga fisicamente `run_save.json` do disco em Permadeath (TR_7A, TR_7B, TR_7C), preservando `profile.json`.
 */
export function apagarRunSavePermadeathDisco(opcoes = {}) {
  const dir = obterDiretorioDadosPadraoBiofoil(opcoes);
  const caminhoRun = path.join(dir, 'run_save.json');
  const ignorarPermadeathMutacao = opcoes.ignorarDelecaoPermadeathDiscoMutacao === true;
  const existia = fs.existsSync(caminhoRun);
  if (existia && !ignorarPermadeathMutacao) {
    fs.unlinkSync(caminhoRun);
  }
  return clonarProfundoCongelado({
    ok: true,
    status: existia ? 'APAGADO_PERMADEATH' : 'JA_AUSENTE',
    marcadorExplicito: existia ? 'RUN_SAVE_REMOVIDO_PERMADEATH' : 'RUN_SAVE_NAO_EXISTIA',
    caminhoArquivo: caminhoRun,
    tinhaArquivoAntes: existia,
  });
}

/**
 * Salva `run_save.json` atomicamente em disco (ou apaga se `estadoRun` estiver em `FIM_DE_RUN`).
 */
export function salvarRunSaveDisco(estadoRun, opcoes = {}) {
  if (!estadoRun || estadoRun.meta?.faseJogo === 'FIM_DE_RUN') {
    return apagarRunSavePermadeathDisco(opcoes);
  }
  const dir = obterDiretorioDadosPadraoBiofoil(opcoes);
  const caminhoRun = path.join(dir, 'run_save.json');
  gravarJsonAtomico(caminhoRun, estadoRun);
  return clonarProfundoCongelado({
    ok: true,
    status: 'SALVO_DISCO',
    marcadorExplicito: 'RUN_SAVE_JSON_PERSISTIDO',
    caminhoArquivo: caminhoRun,
  });
}

/**
 * Carrega `run_save.json` ativo do disco com canal explícito L3 (`ENCONTRADO` vs `SEM_SAVE_ATIVO` vs `CORROMPIDO`).
 */
export function carregarRunSaveDisco(opcoes = {}) {
  const dir = obterDiretorioDadosPadraoBiofoil(opcoes);
  const caminhoRun = path.join(dir, 'run_save.json');
  if (!fs.existsSync(caminhoRun)) {
    return clonarProfundoCongelado({
      ok: true,
      status: 'SEM_SAVE_ATIVO',
      marcadorExplicito: 'RUN_SAVE_AUSENTE',
      caminhoArquivo: caminhoRun,
      estadoRun: null,
    });
  }
  try {
    const estadoLido = JSON.parse(fs.readFileSync(caminhoRun, 'utf8'));
    if (!estadoLido?.naveJogador || estadoLido?.meta?.faseJogo === 'FIM_DE_RUN') {
      return clonarProfundoCongelado({
        ok: true,
        status: 'SEM_SAVE_ATIVO',
        marcadorExplicito: 'RUN_SAVE_ENCERRADO',
        caminhoArquivo: caminhoRun,
        estadoRun: null,
      });
    }
    return clonarProfundoCongelado({
      ok: true,
      status: 'ENCONTRADO',
      marcadorExplicito: 'RUN_SAVE_CARREGADO_VIVO',
      caminhoArquivo: caminhoRun,
      estadoRun: estadoLido,
    });
  } catch {
    return clonarProfundoCongelado({
      ok: false,
      status: 'ARQUIVO_CORROMPIDO',
      marcadorExplicito: 'RUN_SAVE_CORROMPIDO',
      caminhoArquivo: caminhoRun,
      estadoRun: null,
    });
  }
}

/**
 * Executa a transição canônica de ciclo de partida e persiste atomicamente `profile.json` e `run_save.json` no disco.
 */
export function sincronizarTransicaoPersistenciaDisco(
  estadoRun,
  perfilAtual,
  idTransicao,
  contextoMetricas = {},
  opcoes = {}
) {
  const res = gerenciarPersistenciaTransicao(estadoRun, perfilAtual, idTransicao, contextoMetricas);
  if (!res.aceita) {
    return res;
  }
  salvarPerfilDisco(res.perfilObjeto, opcoes);
  if (res.apagouRunSavePermadeath) {
    apagarRunSavePermadeathDisco(opcoes);
  } else {
    salvarRunSaveDisco(res.estadoRun, opcoes);
  }
  return res;
}
