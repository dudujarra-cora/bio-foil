/**
 * Bio-Foil — Edição Comercial Steam (Onda 7)
 * Módulo: Tutorial Interativo Guiado em 6 Etapas (Hands-On Spotlight).
 * Ensina na prática: (1) Termômetro Foil & M_crit, (2) Dreno Seguro de Válvulas,
 * (3) Mergulho Tático 400 Hz & Spool-up, (4) Pausa Tática + Energia + Mira,
 * (5) Tripulação Simbiótica (Polvo/Arraia/Baiacu/Caranguejo), (6) Captura Intacta (+40%).
 */

function congelarTut(valor) {
  if (valor === null || typeof valor !== 'object' || Object.isFrozen(valor)) {
    return valor;
  }
  for (const chave of Object.keys(valor)) {
    congelarTut(valor[chave]);
  }
  return Object.freeze(valor);
}

export const ETAPAS_TUTORIAL_STEAM = congelarTut([
  {
    indice: 0,
    id: 'ETAPA_1_FOIL_TERMOMETRO',
    spotlight960: { x: 4, y: 42, w: 144, h: 382 },
    caixaCallout960: { x: 162, y: 308, w: 462, h: 118 },
    acoesGatilho: ['PAUSAR_ALTERNAR', 'ALTERNAR_PAUSA_TATICA', 'TUTORIAL_AVANCAR'],
    seloPt: 'LIÇÃO 1/6 — SUSTENTAÇÃO NO HIDROFÓLIO',
    seloEn: 'LESSON 1/6 — HYDROFOIL LIFT & WEIGHT',
    tituloPt: 'MANTENHA O PESO ABAIXO DO LIMITE (260 KG) PARA VOAR!',
    tituloEn: 'KEEP SHIP MASS BELOW LIFT LIMIT (260 KG) TO FLY!',
    linhasPt: [
      'À ESQUERDA ESTÁ O TERMÔMETRO DE HIDROFÓLIO: ENQUANTO A MASSA TOTAL',
      'FICAR ABAIXO DO LIMITE AZUL, SUA NAVE VOA COM +25% DE EVASÃO BASE.',
      'PRESSIONE [ESPAÇO] (PAUSA TÁTICA) OU CLIQUE EM [AVANÇAR] PARA SEGUIR.',
    ],
    linhasEn: [
      'ON THE LEFT IS YOUR FOIL THERMOMETER: WHILE TOTAL SHIP MASS STAYS',
      'BELOW THE CYAN LIFT BAR, YOUR BIO-SHIP FLIES WITH +25% BASE EVASION.',
      'PRESS [SPACE] (TACTICAL PAUSE) OR CLICK [NEXT STEP] TO CONTINUE.',
    ],
  },
  {
    indice: 1,
    id: 'ETAPA_2_DRENO_VALVULA',
    spotlight960: { x: 320, y: 116, w: 244, h: 188 },
    caixaCallout960: { x: 162, y: 308, w: 462, h: 118 },
    acoesGatilho: [
      'ALTERNAR_VALVULA',
      'ALTERNAR_VALVULA_CAMARA',
      'CORTE_DRENO_62_5',
      'DRENAR_SEGURO',
      'DRENAR_TUDO',
      'DRENAR_VALVULAS',
      'TUTORIAL_AVANCAR',
    ],
    seloPt: 'LIÇÃO 2/6 — ÁGUA É PESO REAL (DRENO SEGURO)',
    seloEn: 'LESSON 2/6 — FLOODING ADDS REAL MASS (SAFE DRAIN)',
    tituloPt: 'DRENE ÁGUA PELAS VÁLVULAS OU DRENO SEGURO [D]!',
    tituloEn: 'PURGE FLOODWATER VIA SEA VALVES OR SAFE DRAIN [D]!',
    linhasPt: [
      'CADA QUILO DE ÁGUA SOMA MASSA REAL E PODE DERRUBAR A NAVE NO MAR!',
      'CLIQUE NUMA VÁLVULA EXTERNA OU APERTE [D] PARA DRENAR ATÉ O PISO',
      'SEGURO (63 KG) SEM ENTRAR EM CAVITAÇÃO NEM ASFIXIAR A TRIPULAÇÃO.',
    ],
    linhasEn: [
      'EVERY KILOGRAM OF FLOODWATER WEIGHS DOWN YOUR FOIL TOWARD TOUCHDOWN!',
      'CLICK AN OUTER CHAMBER VALVE OR PRESS [D] TO DRAIN SAFELY DOWN',
      'TO THE 63 KG RESERVE FLOOR WITHOUT CAVITATION OR CREW HYPOXIA.',
    ],
  },
  {
    indice: 2,
    id: 'ETAPA_3_MERGULHO_400HZ',
    spotlight960: { x: 4, y: 342, w: 144, h: 86 },
    caixaCallout960: { x: 162, y: 308, w: 462, h: 118 },
    acoesGatilho: ['ACIONAR_MERGULHO_TATICO', 'MERGULHO_TATICO', 'TUTORIAL_AVANCAR'],
    seloPt: 'LIÇÃO 3/6 — MERGULHO TÁTICO (FILTRO 400 HZ)',
    seloEn: 'LESSON 3/6 — TACTICAL SUBMERSION (400 HZ FILTER)',
    tituloPt: 'MERGULHE [M] PARA RESISTIR E RECARREGUE O SPOOL-UP!',
    tituloEn: 'DIVE [M] BENEATH THE WAVES & SPOOL UP TO TAKE OFF!',
    linhasPt: [
      'PRESSIONE [M] OU CLIQUE EM MERGULHO TÁTICO À ESQUERDA: O ÁUDIO',
      'SUBMERGE EM 400 HZ E AS VÁLVULAS TRAVAM SOB PRESSÃO. APERTE [M]',
      'NOVAMENTE PARA CUMPRIR O SPOOL-UP E RETOMAR O VOO NO HIDROFÓLIO!',
    ],
    linhasEn: [
      'PRESS [M] OR CLICK TACTICAL SEA DIVE ON THE LEFT: HYDROACOUSTIC',
      'AUDIO DIPS TO 400 HZ AND VALVES SEAL UNDER PRESSURE. PRESS [M]',
      'AGAIN TO COMPLETE ENGINE SPOOL-UP AND LIFT BACK ONTO FOIL!',
    ],
  },
  {
    indice: 3,
    id: 'ETAPA_4_PAUSA_ENERGIA_MIRA',
    spotlight960: { x: 495, y: 428, w: 242, h: 112 },
    caixaCallout960: { x: 162, y: 308, w: 462, h: 118 },
    acoesGatilho: [
      'SELECIONAR_ARMA',
      'SELECIONAR_SLOT_ARMA',
      'MIRAR_ARMA',
      'DEFINIR_ALVO_ARMA',
      'ALOCAR_ENERGIA',
      'DESALOCAR_ENERGIA',
      'AJUSTAR_ENERGIA_SISTEMA',
      'ALTERNAR_MODO_DISPARO_ARMA',
      'TUTORIAL_AVANCAR',
    ],
    seloPt: 'LIÇÃO 4/6 — ENERGIA DO REATOR & ARTILHARIA DORSAL',
    seloEn: 'LESSON 4/6 — REACTOR POWER & DORSAL ARTILLERY',
    tituloPt: 'SELECIONE UMA ARMA [1..4] E MIRE NUMA SALA INIMIGA!',
    tituloEn: 'SELECT A WEAPON [1..4] AND TARGET AN ENEMY ROOM!',
    linhasPt: [
      'APERTE [1..4] OU CLIQUE EM UM SLOT DE ARMA E DEPOIS EM UMA SALA DO',
      'ALVO À DIREITA PARA TRAVAR MIRA CONTÍNUA. BARRAS DE ENERGIA PODEM',
      'SER REALOCADAS ENTRE BARREIRA, SIFÃO, BRÂNQUIA E ARMAS SEM CUSTO!',
    ],
    linhasEn: [
      'PRESS [1..4] OR CLICK A WEAPON SLOT AND THEN AN ENEMY ROOM ON THE',
      'RIGHT TO LOCK CONTINUOUS FIRE. REACTOR BARS CAN BE RE-ROUTED',
      'FREELY BETWEEN BUBBLE BARRIER, SIPHON, GILL PUMP AND WEAPONS!',
    ],
  },
  {
    indice: 4,
    id: 'ETAPA_5_TRIPULACAO_REPARO',
    spotlight960: { x: 737, y: 428, w: 222, h: 112 },
    caixaCallout960: { x: 162, y: 308, w: 462, h: 118 },
    acoesGatilho: [
      'SELECIONAR_TRIPULANTE',
      'MOVER_TRIPULANTE',
      'ACOPLAR_BULBO',
      'ATIVAR_BAIACU',
      'ATIVAR_HABILIDADE_TRIPULANTE',
      'TUTORIAL_AVANCAR',
    ],
    seloPt: 'LIÇÃO 5/6 — SIMBIOSE DAS 4 ESPÉCIES DE TRIPULAÇÃO',
    seloEn: 'LESSON 5/6 — SYMBIOSIS OF THE 4 CREW SPECIES',
    tituloPt: 'POLVO REPARA, ARRAIA ENERGIZA, BAIACU SELA BRECHAS!',
    tituloEn: 'OCTOPUS REPAIRS, RAY POWERS, PUFFER SEALS BREACHES!',
    linhasPt: [
      'SELECIONE UM TRIPULANTE À DIREITA E CLIQUE NUMA CÂMARA PARA MOVÊ-LO:',
      'POLVO = REPARO RÁPIDO | ARRAIA = +1 ENERGIA VIVA | BAIACU = TAMPÃO',
      'DE BRECHA IMEDIATO | CARANGUEJO = LUTA ANFÍBIA DE ABORDAGEM.',
    ],
    linhasEn: [
      'SELECT A CREWMATE CARD AND CLICK ANY SHIP CHAMBER TO DISPATCH THEM:',
      'OCTOPUS = FAST REPAIR | ELECTRIC RAY = +1 LIVING POWER | PUFFER =',
      'INSTANT BREACH PLUG | AMPHIBIOUS CRAB = HEAVY BOARDING VANGUARD.',
    ],
  },
  {
    indice: 5,
    id: 'ETAPA_6_CAPTURA_SAQUE',
    spotlight960: { x: 636, y: 42, w: 320, h: 382 },
    caixaCallout960: { x: 162, y: 308, w: 462, h: 118 },
    acoesGatilho: [
      'LANCAR_ABORDAGEM',
      'ATALHO_ABORDAGEM_UI',
      'MIRAR_ARMA',
      'DEFINIR_ALVO_ARMA',
      'CONFIRMAR_SAQUE_POS_COMBATE',
      'SAQUE_CONFIRMAR',
      'CONTINUAR_POS_COMBATE',
      'TUTORIAL_CONCLUIR',
      'TUTORIAL_AVANCAR',
    ],
    seloPt: 'LIÇÃO 6/6 — CAPTURA CIRÚRGICA (+40% DE SAQUE)',
    seloEn: 'LESSON 6/6 — SURGICAL CAPTURE (+40% INTACT LOOT)',
    tituloPt: 'NEUTRALIZE A TRIPULAÇÃO PARA CAPTURA INTACTA!',
    tituloEn: 'NEUTRALIZE ENEMY CREW FOR INTACT CAPTURE BONUS!',
    linhasPt: [
      'DESTRUIR O CASCO VENCE A LUTA, MAS USAR ABORDAGEM, FEIXE BIO OU',
      'SABOTAGEM PARA RENDER O INIMIGO INTACTO GARANTE +40% DE SUCATA E',
      'ÓRGÃOS RAROS! CLIQUE EM [AVANÇAR] PARA ASSUMIR COMANDO TOTAL!',
    ],
    linhasEn: [
      'SHATTERING HULL HP WINS FAST, BUT USING BOARDERS, ANTI-BIO BEAMS',
      'OR TOXIC GRAFTS TO CAPTURE THE TARGET INTACT GRANTS +40% BONUS',
      'SCRAP AND RARE ORGANS! CLICK [NEXT STEP] TO TAKE FULL COMMAND!',
    ],
  },
]);

export function obterEtapasTutorialSteam() {
  return ETAPAS_TUTORIAL_STEAM;
}

export function criarEstadoTutorialSteam(ativo = false) {
  return congelarTut({
    ativo: Boolean(ativo),
    etapaIndice: 0,
    concluido: false,
    pulado: false,
    totalEtapas: ETAPAS_TUTORIAL_STEAM.length,
    etapaAtual: ativo ? ETAPAS_TUTORIAL_STEAM[0] : null,
  });
}

export function obterEtapaAtualTutorialSteam(estadoTutorial) {
  if (!estadoTutorial || !estadoTutorial.ativo || estadoTutorial.concluido || estadoTutorial.pulado) {
    return null;
  }
  const idx = Math.max(0, Math.min(ETAPAS_TUTORIAL_STEAM.length - 1, Number(estadoTutorial.etapaIndice ?? 0)));
  return ETAPAS_TUTORIAL_STEAM[idx];
}

export function pularTutorialSteam(estadoTutorial) {
  return congelarTut({
    ...(estadoTutorial ?? criarEstadoTutorialSteam(false)),
    ativo: false,
    pulado: true,
    etapaAtual: null,
  });
}

export function avancarPassoTutorialSteam(estadoTutorial) {
  if (!estadoTutorial || !estadoTutorial.ativo) {
    return criarEstadoTutorialSteam(false);
  }
  const proxIdx = Number(estadoTutorial.etapaIndice ?? 0) + 1;
  if (proxIdx >= ETAPAS_TUTORIAL_STEAM.length) {
    return congelarTut({
      ativo: false,
      etapaIndice: ETAPAS_TUTORIAL_STEAM.length - 1,
      concluido: true,
      pulado: false,
      totalEtapas: ETAPAS_TUTORIAL_STEAM.length,
      etapaAtual: null,
    });
  }
  return congelarTut({
    ativo: true,
    etapaIndice: proxIdx,
    concluido: false,
    pulado: false,
    totalEtapas: ETAPAS_TUTORIAL_STEAM.length,
    etapaAtual: ETAPAS_TUTORIAL_STEAM[proxIdx],
  });
}

/**
 * Inspeciona um comando real despachado pelo jogador e avança automaticamente
 * a etapa do tutorial caso o comando corresponda à habilidade ensinada!
 */
export function registrarAcaoNoTutorialSteam(estadoTutorial, tipoComando) {
  if (!estadoTutorial || !estadoTutorial.ativo) {
    return estadoTutorial ?? criarEstadoTutorialSteam(false);
  }
  const cmd = String(tipoComando ?? '').toUpperCase();
  if (cmd === 'TUTORIAL_PULAR') {
    return pularTutorialSteam(estadoTutorial);
  }
  if (cmd === 'TUTORIAL_CONCLUIR') {
    return congelarTut({
      ativo: false,
      etapaIndice: ETAPAS_TUTORIAL_STEAM.length - 1,
      concluido: true,
      pulado: false,
      totalEtapas: ETAPAS_TUTORIAL_STEAM.length,
      etapaAtual: null,
    });
  }
  const etapa = obterEtapaAtualTutorialSteam(estadoTutorial);
  if (!etapa) return estadoTutorial;
  if (etapa.acoesGatilho.includes(cmd)) {
    return avancarPassoTutorialSteam(estadoTutorial);
  }
  return estadoTutorial;
}
