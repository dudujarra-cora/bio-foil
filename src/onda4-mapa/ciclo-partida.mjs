/**
 * ONDA 4 — Máquina de Estados do Ciclo de Vida da Partida (`meta.faseJogo` e Persistência)
 * Dono Único (Lei N5): src/onda4-mapa/ciclo-partida.mjs
 *
 * Fontes canônicas:
 *  - Seção 8.1 (Enum `meta.faseJogo`: INICIO, MAPA, EVENTO, LOJA, COMBATE, FIM_DE_RUN)
 *  - Seção 9.2 (Tabela das 13 Transições Puras TR_0..TR_9 e efeitos em run_save.json / profile.json)
 */
import { clonarProfundoCongelado } from '../gdd-parser.mjs';
import { analisarGrafoCicloPartida } from '../oraculos-referencia.mjs';

export const FASES_JOGO_CANONICAS = Object.freeze([
  'INICIO',
  'MAPA',
  'EVENTO',
  'LOJA',
  'COMBATE',
  'FIM_DE_RUN',
]);

export const TRANSICOES_CICLO_92 = Object.freeze([
  Object.freeze({
    id: 'TR_0_INICIAR_RUN',
    faseOrigem: 'INICIO',
    faseDestino: 'MAPA',
    gatilho: 'Escolher uma carcaça marcada como desbloqueada no profile.json',
    efeitoPersistencia: 'Cria run_save.json no Setor 1',
  }),
  Object.freeze({
    id: 'TR_1_INICIAR_NO_COMBATE',
    faseOrigem: 'MAPA',
    faseDestino: 'COMBATE',
    gatilho: 'VIAJAR_NO_MAPA p/ nó COMBATE, PERIGO, ZONA_MORTA_INDUSTRIALIZADA ou FROTA_PRINCIPAL_CORPORACAO',
    efeitoPersistencia: 'Grava run_save.json no instante t = 0.0s do encontro',
  }),
  Object.freeze({
    id: 'TR_2_ABRIR_EVENTO_NO',
    faseOrigem: 'MAPA',
    faseDestino: 'EVENTO',
    gatilho: 'VIAJAR_NO_MAPA p/ nó SOS (dentro de T_prazo) ou EXPLORACAO',
    efeitoPersistencia: 'Grava run_save.json antes da escolha A/B/C',
  }),
  Object.freeze({
    id: 'TR_3_EVENTO_PARA_COMBATE',
    faseOrigem: 'EVENTO',
    faseDestino: 'COMBATE',
    gatilho: 'ESCOLHER_OPCAO_EVENTO com desfecho de combate (p = 1 na Opção A)',
    efeitoPersistencia: 'Grava run_save.json com estado pós-opção',
  }),
  Object.freeze({
    id: 'TR_4_EVENTO_PARA_MAPA',
    faseOrigem: 'EVENTO',
    faseDestino: 'MAPA',
    gatilho: 'ESCOLHER_OPCAO_EVENTO pacífico (p = 0, Blue Option B ou Recuo C) com casco > 0',
    efeitoPersistencia: 'Avalia e atualiza profile.json e grava run_save.json',
  }),
  Object.freeze({
    id: 'TR_5A_ENTRAR_LOJA',
    faseOrigem: 'MAPA',
    faseDestino: 'LOJA',
    gatilho: 'VIAJAR_NO_MAPA p/ nó LOJA (Recife-Forja)',
    efeitoPersistencia: 'Grava run_save.json',
  }),
  Object.freeze({
    id: 'TR_5B_SAIR_LOJA',
    faseOrigem: 'LOJA',
    faseDestino: 'MAPA',
    gatilho: 'Fechar o Recife-Forja',
    efeitoPersistencia: 'Grava run_save.json',
  }),
  Object.freeze({
    id: 'TR_6_ENCERRAR_COMBATE_VIVO',
    faseOrigem: 'COMBATE',
    faseDestino: 'MAPA',
    gatilho: 'Vitória fora da Fase 3 do Setor 8, ou SALTO_FUGA',
    efeitoPersistencia: 'Avalia e atualiza profile.json e grava run_save.json',
  }),
  Object.freeze({
    id: 'TR_7A_DERROTA_EM_COMBATE',
    faseOrigem: 'COMBATE',
    faseDestino: 'FIM_DE_RUN',
    gatilho: 'hpCascoAtual <= 0 ou 0 aliados vivos',
    efeitoPersistencia: 'Apaga run_save.json (Permadeath) e preserva profile.json',
  }),
  Object.freeze({
    id: 'TR_7B_VITORIA_FINAL',
    faseOrigem: 'COMBATE',
    faseDestino: 'FIM_DE_RUN',
    gatilho: 'Vitória na Fase 3 da Draga Continental (Setor 8)',
    efeitoPersistencia: 'Apaga run_save.json (Permadeath) e atualiza profile.json (estatísticas e desbloqueios)',
  }),
  Object.freeze({
    id: 'TR_7C_DERROTA_EM_EVENTO',
    faseOrigem: 'EVENTO',
    faseDestino: 'FIM_DE_RUN',
    gatilho: 'Custo de risco da Opção A zera o casco (hpCascoAtual <= 0)',
    efeitoPersistencia: 'Apaga run_save.json (Permadeath) e preserva profile.json',
  }),
  Object.freeze({
    id: 'TR_8_TROCAR_SETOR',
    faseOrigem: 'MAPA',
    faseDestino: 'MAPA',
    gatilho: 'VIAJAR_NO_MAPA p/ o Nó de Saída do setor',
    efeitoPersistencia: 'setorNumero + 1, gera o novo setor pelo STREAM_1, avalia e atualiza profile.json e grava run_save.json',
  }),
  Object.freeze({
    id: 'TR_9_PROXIMA_FASE_CHEFE',
    faseOrigem: 'COMBATE',
    faseDestino: 'COMBATE',
    gatilho: 'Fase 1 ou 2 da Draga Continental zerada (transicionarFaseChefeDraga, Atracar Automático)',
    efeitoPersistencia: 'Grava run_save.json no início da nova fase',
  }),
]);

/**
 * Audita estruturalmente o grafo de transições da Seção 9.2 contra os 6 estados de `meta.faseJogo`.
 */
export function auditarGrafoCicloPartida() {
  return analisarGrafoCicloPartida(TRANSICOES_CICLO_92, FASES_JOGO_CANONICAS, 'INICIO', 'FIM_DE_RUN');
}

/**
 * Aplica puramente uma transição da Máquina de Estados sobre um GameState (ou sobre uma fase isolada).
 */
export function aplicarTransicaoCicloPartida(estadoOuFase, idTransicao) {
  const tr = TRANSICOES_CICLO_92.find((t) => t.id === idTransicao);
  if (!tr) {
    throw new Error(`Transição desconhecida fora da Seção 9.2: "${idTransicao}"`);
  }

  const ehObjetoEstado = typeof estadoOuFase === 'object' && estadoOuFase !== null && 'meta' in estadoOuFase;
  const faseAtual = ehObjetoEstado ? estadoOuFase.meta.faseJogo : String(estadoOuFase);

  if (tr.faseOrigem !== faseAtual) {
    return clonarProfundoCongelado({
      aceita: false,
      faseResultante: faseAtual,
      apagaRunSavePermadeath: false,
      gravaRunSave: false,
      atualizaProfileJson: false,
      preservaProfileJson: true,
      erro: `TRANSIÇÃO_FASE_ILEGAL:${faseAtual}->${tr.faseDestino}`,
      estado: ehObjetoEstado ? estadoOuFase : undefined,
    });
  }

  const apagaRunSavePermadeath = /Apaga run_save\.json/i.test(tr.efeitoPersistencia);
  const gravaRunSave = /(?:Grava|Cria) run_save\.json/i.test(tr.efeitoPersistencia);
  const atualizaProfileJson = /atualiza profile\.json/i.test(tr.efeitoPersistencia);

  let novoEstado;
  if (ehObjetoEstado) {
    const novoSetor =
      idTransicao === 'TR_8_TROCAR_SETOR'
        ? (estadoOuFase.mapaSetorial?.setorNumero ?? 1) + 1
        : (estadoOuFase.mapaSetorial?.setorNumero ?? 1);
    novoEstado = {
      ...estadoOuFase,
      meta: {
        ...estadoOuFase.meta,
        faseJogo: tr.faseDestino,
      },
      mapaSetorial: {
        ...estadoOuFase.mapaSetorial,
        setorNumero: novoSetor,
      },
    };
  }

  return clonarProfundoCongelado({
    aceita: true,
    faseResultante: tr.faseDestino,
    apagaRunSavePermadeath,
    gravaRunSave,
    atualizaProfileJson,
    preservaProfileJson: true,
    erro: null,
    estado: novoEstado,
  });
}
