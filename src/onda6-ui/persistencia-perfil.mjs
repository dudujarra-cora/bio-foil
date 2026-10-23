/**
 * ONDA 6 — Persistência: Meta-Progresso (`profile.json`) vs. Estado da Run (`run_save.json` c/ Permadeath)
 * Dono Único (Lei N5): src/onda6-ui/persistencia-perfil.mjs
 *
 * Fontes canônicas:
 *  - Seção 8.5.B (Tabela das 5 Carcaças Desbloqueáveis, Predicados Puros e Separação run_save.json vs profile.json)
 *  - Seção 9.2 (Transições TR_7A, TR_7B e TR_7C apagam run_save.json e preservam profile.json)
 */
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

  return clonarProfundoCongelado({
    ...perfilAtual,
    carcacasDesbloqueadas: novasCarcacas,
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
