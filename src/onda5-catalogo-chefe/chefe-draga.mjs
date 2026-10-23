/**
 * ONDA 5 — O Chefe Final em 3 Fases: A Draga Continental ("Leviatã S.A.")
 * Dono Único (Lei N5): src/onda5-catalogo-chefe/chefe-draga.mjs
 *
 * Fontes canônicas:
 *  - Seção 5.5 (3 Fases: 20/22/24 HP = 66 HP + 10 pts Blindagem Térmica na Fase 3 = 76 pts totais)
 *  - Falha Global 2 (IA de Backup 1 barra/15s quando 0 humanos vivos; Atracar Automático entre Fases)
 *  - Falha Global 3 e Matriz 6.2 Célula 3H (Alarme antecedente de 4.0s antes da Fervura Oceânica de 5.0s na Fase 3)
 *  - Falha Global 7 (Distribuição Markoviana exata do TTK da Fase 3: mediana 67.2s, esperado 74.2s, P90 100.8s)
 *  - Junção N1 #4 (transicionarFaseChefeDraga(estado))
 */
import { clonarProfundoCongelado } from '../gdd-parser.mjs';
import { streamChefeDraga } from '../onda1-fisica/hash32-streams.mjs';
import { calcularDistribuicaoTtkFase3 } from '../oraculos-referencia.mjs';

export const ALARME_ANTECEDENTE_FERVURA_SEG = 4.0;
export const DURACAO_FERVURA_OCEANICA_SEG = 5.0;
export const INTERVALO_AUTO_REPARO_IA_BACKUP_SEG = 15.0;

export const FASES_DRAGA_CONTINENTAL_55 = Object.freeze({
  1: Object.freeze({
    fase: 1,
    nome: 'A Muralha de Arrasto',
    hpCascoMax: 20,
    blindagemTermicaExternaPts: 0,
    barreiraBolhasMax: 3,
    barreiraBarras: 6,
    esquivaBasePct: 20,
    totalSalas: 6,
    salasSuperioresSecas: 4,
    salasInferioresSubmersas: 2,
    intervaloPowerSurgeSeg: 22.0,
    duracaoPowerSurgeSeg: 6.0,
    pesoVirtualArrastoKg: 50,
    salas: Object.freeze([
      { id: 1, nome: 'Ponte de Comando Blindada', submersa: false, barrasMax: 2, integridade: 2 },
      { id: 2, nome: 'Torre do Canhão de Arpão Triplo', submersa: false, barrasMax: 3, integridade: 3, recargaSeg: 11 },
      { id: 3, nome: 'Torre do Lançador de Mísseis Térmicos', submersa: false, barrasMax: 3, integridade: 3, recargaSeg: 14 },
      { id: 4, nome: 'Torre do Gerador de Rede Magnética', submersa: false, barrasMax: 2, integridade: 2, recargaSeg: 12 },
      { id: 5, nome: 'Gerador de Escudo Acústico Triplo', submersa: true, barrasMax: 6, integridade: 6 },
      { id: 6, nome: 'Casa de Máquinas e Bombas de Porão', submersa: true, barrasMax: 3, integridade: 3 },
    ]),
  }),
  2: Object.freeze({
    fase: 2,
    nome: 'O Enxame de Processamento',
    hpCascoMax: 22,
    blindagemTermicaExternaPts: 0,
    barreiraBolhasMax: 3,
    barreiraBarras: 6,
    esquivaBasePct: 25,
    totalSalas: 6,
    salasSuperioresSecas: 3,
    salasInferioresSubmersas: 3,
    intervaloPowerSurgeSeg: 20.0,
    duracaoPowerSurgeSeg: 6.0,
    dronesSurgeNormal: 4,
    dronesSurgeHangarQuebrado: 2,
    salas: Object.freeze([
      { id: 1, nome: 'Ponte de Comando Central', submersa: false, barrasMax: 2, integridade: 2 },
      { id: 2, nome: 'Bateria de Canhão de Arpão Triplo', submersa: false, barrasMax: 3, integridade: 3, recargaSeg: 11 },
      { id: 3, nome: 'Cortador Industrial a Plasma Pesado', submersa: false, barrasMax: 3, integridade: 3, recargaSeg: 15 },
      { id: 4, nome: 'Hangar de Controle de Drones e Sonar Militar', submersa: true, barrasMax: 4, integridade: 4, ehHangarDrones: true },
      { id: 5, nome: 'Gerador de Escudo Acústico Triplo', submersa: true, barrasMax: 6, integridade: 6 },
      { id: 6, nome: 'Reator Hidráulico e Bombas Submersas', submersa: true, barrasMax: 4, integridade: 4 },
    ]),
  }),
  3: Object.freeze({
    fase: 3,
    nome: 'O Núcleo de Perfuração Abissal',
    hpCascoMax: 24,
    blindagemTermicaExternaPts: 10,
    barreiraBolhasMax: 4,
    barreiraBarras: 8,
    esquivaBasePct: 30,
    totalSalas: 5,
    salasSuperioresSecas: 3,
    salasInferioresSubmersas: 2,
    intervaloPowerSurgeSeg: 18.0,
    alarmeAntecedenteFervuraSeg: ALARME_ANTECEDENTE_FERVURA_SEG,
    duracaoFervuraSeg: DURACAO_FERVURA_OCEANICA_SEG,
    lasersPorSurge: 7,
    salas: Object.freeze([
      { id: 1, nome: 'Núcleo de Comando Autônomo', submersa: false, barrasMax: 3, integridade: 3 },
      { id: 2, nome: 'Bateria de Arpão Triplo de Alta Pressão', submersa: false, barrasMax: 3, integridade: 3, recargaSeg: 10 },
      { id: 3, nome: 'Lançador de Mísseis Térmicos Pesados', submersa: false, barrasMax: 3, integridade: 3, recargaSeg: 13 },
      { id: 4, nome: 'Gerador de Escudo Quádruplo e Blindagem Térmica', submersa: true, barrasMax: 8, integridade: 8 },
      { id: 5, nome: 'Broca Geotérmica e Propulsão Abissal', submersa: true, barrasMax: 4, integridade: 4 },
    ]),
  }),
});

/**
 * Cria o estado do alvo Draga Continental para a Fase indicada (1, 2 ou 3),
 * preservando a tripulação sobrevivente da fase anterior (ou ativando a IA de Backup se 0 humanos vivos).
 */
export function criarEstadoChefeDraga(fase = 1, tripulacaoSobrevivente = null) {
  const spec = FASES_DRAGA_CONTINENTAL_55[fase];
  if (!spec) {
    throw new Error(`Fase inválida da Draga Continental: ${fase}`);
  }

  const tripulacaoInicialFase1 = [
    { id: 'HUM_MAR_1', classe: 'MARINHEIRO', hpAtual: 100, hpMax: 100, dps: 8, salaId: 1, imuneAfogamento: false },
    { id: 'HUM_MAR_2', classe: 'MARINHEIRO', hpAtual: 100, hpMax: 100, dps: 8, salaId: 2, imuneAfogamento: false },
    { id: 'HUM_MAR_3', classe: 'MARINHEIRO', hpAtual: 100, hpMax: 100, dps: 8, salaId: 3, imuneAfogamento: false },
    { id: 'HUM_MAR_4', classe: 'MARINHEIRO', hpAtual: 100, hpMax: 100, dps: 8, salaId: 4, imuneAfogamento: false },
    { id: 'HUM_MERG_1', classe: 'MERGULHADOR', hpAtual: 100, hpMax: 100, dps: 12, salaId: 5, imuneAfogamento: true },
    { id: 'HUM_MERG_2', classe: 'MERGULHADOR', hpAtual: 100, hpMax: 100, dps: 12, salaId: 6, imuneAfogamento: true },
  ];

  const tripulacaoInimiga = (tripulacaoSobrevivente ?? tripulacaoInicialFase1)
    .filter((t) => t.hpAtual > 0)
    .map((t, idx) => ({
      ...t,
      salaId: Math.min(spec.totalSalas, t.salaId ?? idx + 1),
    }));

  const iaBackupAtiva = tripulacaoInimiga.length === 0;

  return clonarProfundoCongelado({
    ativo: true,
    idTemplate: `CHEFE_DRAGA_FASE_${fase}`,
    classeAlvo: 'CHEFE_DRAGA',
    classeInimigo: 'CHEFE_DRAGA',
    nome: `Draga Continental — Fase ${fase}: ${spec.nome}`,
    faseChefe: fase,
    hpCascoAtual: spec.hpCascoMax,
    hpCascoMax: spec.hpCascoMax,
    blindagemTermicaExternaPts: spec.blindagemTermicaExternaPts,
    camadasBarreiraAtivas: spec.barreiraBolhasMax,
    barreiraBolhasAtual: spec.barreiraBolhasMax,
    barreiraBolhasMax: spec.barreiraBolhasMax,
    progressoRegenBarreiraSeg: 0,
    esquivaBasePct: spec.esquivaBasePct,
    esquivaEfetivaPct: spec.esquivaBasePct,
    intervaloPowerSurgeSeg: spec.intervaloPowerSurgeSeg,
    progressoPowerSurgeSeg: 0,
    alarmeFervuraAtivoSeg: 0,
    fervuraAtivaSeg: 0,
    iaBackupAtiva,
    progressoReparoIaBackupSeg: 0,
    tripulacaoInimiga,
    salasOuOrgaos: spec.salas.map((s) => ({
      ...s,
      integridadeAtual: s.integridade,
      integridadeMax: s.barrasMax,
      aguaKg: 0,
      brechaAtiva: false,
      danoIonizado: 0,
      paralisiaIonSeg: 0,
      tempoRestanteIonSeg: 0,
      isolamentoResidualChoqueSeg: 0,
      tripulantes: tripulacaoInimiga.filter((t) => t.salaId === s.id),
    })),
  });
}

/**
 * Tenta lançar a cápsula do Tubo Pressurizado contra a Draga Continental (ou qualquer alvo).
 * Bloqueia estritamente se `blindagemTermicaExternaPts > 0` na Fase 3 (Seção 5.5 / MUT-O5-02).
 */
export function tentarAbordagemContraAlvo(estado, tripulantesIds, salaAlvoId, opcoesDebug = {}) {
  const alvo = estado.alvoCombate;
  const ignorarBlindagem = opcoesDebug.ignorarBlindagemTermicaAbordagem === true;

  if (!ignorarBlindagem && (alvo?.blindagemTermicaExternaPts ?? 0) > 0) {
    return clonarProfundoCongelado({
      aceito: false,
      marcadorRejeicao: 'BLOQUEADO_BLINDAGEM_TERMICA_EXTERNA',
      estado,
    });
  }

  const idsSet = new Set(tripulantesIds);
  const novaTripulacao = estado.naveJogador.tripulacao.map((t) =>
    idsSet.has(t.id)
      ? {
          ...t,
          localizacao: 'BORDO_INIMIGO',
          salaInimigaId: salaAlvoId,
          acopladoBulbo: false,
        }
      : t
  );

  return clonarProfundoCongelado({
    aceito: true,
    marcadorRejeicao: null,
    estado: {
      ...estado,
      naveJogador: {
        ...estado.naveJogador,
        tripulacao: novaTripulacao,
      },
    },
  });
}

/**
 * Assinatura Pura N1 #4: Transiciona da Fase N para a Fase N+1 da Draga Continental,
 * executando o Atracar Automático entre Fases (resgata todos os tripulantes aliados com
 * `localizacao === 'BORDO_INIMIGO'` de volta para a Câmara 7 da nave do jogador) e preservando
 * apenas os humanos sobreviventes (ativando a IA de Backup se restarem 0 humanos).
 */
export function transicionarFaseChefeDraga(estado) {
  const faseAtual = estado.alvoCombate?.faseChefe ?? 1;
  if (faseAtual >= 3) {
    throw new Error('A Fase 3 é a última fase da Draga Continental (vitória final)');
  }
  const proximaFase = faseAtual + 1;

  // 1. Atracar Automático entre Fases: recolhe todos os animais aliados sobreviventes a bordo do chefe
  const tripulacaoAliadaResgatada = estado.naveJogador.tripulacao
    .filter((t) => t.hpAtual > 0)
    .map((t) =>
      t.localizacao === 'BORDO_INIMIGO'
        ? {
            ...t,
            localizacao: 'NAVE_JOGADOR',
            camaraAtualId: 7,
            salaInimigaId: null,
          }
        : t
    );

  // 2. Cria o estado da próxima fase preservando apenas os humanos sobreviventes
  const novoAlvoChefe = criarEstadoChefeDraga(
    proximaFase,
    estado.alvoCombate?.tripulacaoInimiga ?? []
  );

  return clonarProfundoCongelado({
    ...estado,
    naveJogador: {
      ...estado.naveJogador,
      pesoVirtualArrastoKg: 0,
      tripulacao: tripulacaoAliadaResgatada,
    },
    alvoCombate: novoAlvoChefe,
  });
}

/**
 * Avança 1 tick da mecânica específica da Draga Continental (Power Surges das Fases 1, 2 e 3,
 * Alarme antecedente de 4.0s da Fervura Oceânica na Fase 3, e Auto-Reparo de 1 barra/15s da IA de Backup).
 */
export function avancarTickChefeDraga(estado, dtSeg = 1.0, opcoesDebug = {}) {
  const alvo = estado.alvoCombate;
  if (!alvo || alvo.classeInimigo !== 'CHEFE_DRAGA') {
    return clonarProfundoCongelado(estado);
  }

  let nave = {
    ...estado.naveJogador,
    tripulacao: estado.naveJogador.tripulacao.map((t) => ({ ...t })),
    camaras: estado.naveJogador.camaras.map((c) => ({ ...c })),
  };
  let salas = alvo.salasOuOrgaos.map((s) => ({ ...s }));
  const humanosVivos = (alvo.tripulacaoInimiga ?? []).filter((t) => t.hpAtual > 0);
  const iaBackupAtiva = humanosVivos.length === 0;

  // 1. IA de Backup: se 0 humanos vivos, auto-repara 1 barra em todas as salas danificadas a cada 15.0s
  let progressoReparoIaBackupSeg = alvo.progressoReparoIaBackupSeg ?? 0;
  if (iaBackupAtiva) {
    progressoReparoIaBackupSeg = Math.round((progressoReparoIaBackupSeg + dtSeg) * 1000) / 1000;
    if (progressoReparoIaBackupSeg >= INTERVALO_AUTO_REPARO_IA_BACKUP_SEG) {
      progressoReparoIaBackupSeg -= INTERVALO_AUTO_REPARO_IA_BACKUP_SEG;
      salas = salas.map((s) => ({
        ...s,
        integridade: Math.min(s.barrasMax, s.integridade + 1),
      }));
    }
  }

  // 2. Relógio do Power Surge (22s na Fase 1, 20s na Fase 2, 18s na Fase 3)
  const intervaloSurge = alvo.intervaloPowerSurgeSeg;
  const alarmeAntecedenteConfig =
    opcoesDebug.alarmeFervuraSegOverride ?? ALARME_ANTECEDENTE_FERVURA_SEG;
  let progressoPowerSurgeSeg = Math.round(((alvo.progressoPowerSurgeSeg ?? 0) + dtSeg) * 1000) / 1000;
  let alarmeFervuraAtivoSeg = alvo.alarmeFervuraAtivoSeg ?? 0;
  let fervuraAtivaSeg = alvo.fervuraAtivaSeg ?? 0;
  let ultimoPowerSurgeDisparado = null;

  // Na Fase 3, faltando `alarmeAntecedenteConfig` (4.0s) para o Surge de 18.0s (isto é, em t >= 14.0s),
  // dispara o alarme sonoro/visual para dar tempo da nave em Touchdown concluir os 3.0s de Spool-up (MUT-O5-03)
  if (alvo.faseChefe === 3 && fervuraAtivaSeg <= 0) {
    const tempoFaltando = Math.round((intervaloSurge - progressoPowerSurgeSeg) * 1000) / 1000;
    if (tempoFaltando > 0 && tempoFaltando <= alarmeAntecedenteConfig) {
      alarmeFervuraAtivoSeg = tempoFaltando;
    } else {
      alarmeFervuraAtivoSeg = 0;
    }
  }

  if (progressoPowerSurgeSeg >= intervaloSurge) {
    progressoPowerSurgeSeg = Math.round((progressoPowerSurgeSeg - intervaloSurge) * 1000) / 1000;
    alarmeFervuraAtivoSeg = 0;

    if (alvo.faseChefe === 1) {
      // Fase 1: Onda de Arrasto Hidráulico (+50 kg por 6.0s)
      nave.pesoVirtualArrastoKg = 50;
      nave.tempoRestanteArrastoSeg = 6.0;
      ultimoPowerSurgeDisparado = { fase: 1, tipo: 'ONDA_ARRASTO_HIDRAULICO', pesoVirtualKg: 50 };
    } else if (alvo.faseChefe === 2) {
      // Fase 2: Enxame de Drones (4 drones se Hangar Sala 4 intacto > 0, ou 2 drones se Hangar quebrado = 0)
      const salaHangar = salas.find((s) => s.id === 4);
      const hangarIntacto = (salaHangar?.integridade ?? 0) > 0;
      const totalDrones = hangarIntacto ? 4 : 2;
      const alvoDrone1 = (streamChefeDraga(estado.meta?.seedPartida ?? 'seed', 2, estado.meta?.tickAtual ?? 0, 1) % 8) + 1;
      ultimoPowerSurgeDisparado = {
        fase: 2,
        tipo: 'ENXAME_DRONES_CORTADORES',
        totalDrones,
        dronesAereos: totalDrones / 2,
        dronesTorpedeirosMastro: totalDrones / 2,
        camaraAlvoAereo: alvoDrone1,
      };
    } else if (alvo.faseChefe === 3) {
      // Fase 3: Fervura Oceânica (5.0s) + Rajada de 7 Lasers Industriais
      fervuraAtivaSeg = DURACAO_FERVURA_OCEANICA_SEG;
      ultimoPowerSurgeDisparado = {
        fase: 3,
        tipo: 'FERVURA_OCEANICA_E_7_LASERS',
        lasersDisparados: 7,
        duracaoFervuraSeg: DURACAO_FERVURA_OCEANICA_SEG,
        alarmeAntecedenteConcedidoSeg: alarmeAntecedenteConfig,
      };
    }
  } else if (fervuraAtivaSeg > 0) {
    // Dano de Fervura Oceânica se a nave do jogador estiver em Touchdown/Spool-up na água
    if (nave.estadoFisico === '2_TOUCHDOWN' || nave.estadoFisico === '3_SPOOL_UP') {
      nave.hpCascoAtual = Math.max(0, nave.hpCascoAtual - 1 * dtSeg);
      nave.tripulacao = nave.tripulacao.map((t) =>
        t.localizacao === 'NAVE_JOGADOR' && [4, 5, 6, 8].includes(t.camaraAtualId)
          ? { ...t, hpAtual: Math.max(0, t.hpAtual - 5 * dtSeg) }
          : t
      );
    }
    fervuraAtivaSeg = Math.max(0, Math.round((fervuraAtivaSeg - dtSeg) * 1000) / 1000);
  }

  return clonarProfundoCongelado({
    ...estado,
    naveJogador: nave,
    alvoCombate: {
      ...alvo,
      iaBackupAtiva,
      progressoReparoIaBackupSeg,
      progressoPowerSurgeSeg,
      alarmeFervuraAtivoSeg,
      fervuraAtivaSeg,
      ultimoPowerSurgeDisparado,
      salasOuOrgaos: salas,
    },
  });
}

/**
 * Calcula a distribuição canônica do TTK da Fase 3 da Draga Continental (Falha Global 7 do Vol. 05).
 */
export function calcularTtkFase3DragaPadrao() {
  return calcularDistribuicaoTtkFase3({
    projeteisPorSalva: 6,
    probAcerto: 0.7,
    danoFeixe: 6,
    bolhas: 4,
    blindagem: 10,
    casco: 24,
    intervaloSalvaSeg: 11.2,
  });
}
