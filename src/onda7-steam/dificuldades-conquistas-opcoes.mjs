/**
 * Bio-Foil — Edição Comercial Steam (Onda 7)
 * Módulo: 3 Dificuldades (`FACIL`, `NORMAL`, `DIFICIL`), 24 Conquistas Steam
 * (incluindo desbloqueio de layouts Tipo B) e Menu Completo de Opções + Keybinds.
 * 100% puro, determinístico, imutável (`Object.freeze`) e isomórfico (Browser + Node).
 */

import {
  criarEstadoTutorialSteam,
  avancarPassoTutorialSteam,
  pularTutorialSteam,
} from './tutorial-interativo.mjs';

function congelarProfundo(valor) {
  if (valor === null || typeof valor !== 'object' || Object.isFrozen(valor)) {
    return valor;
  }
  for (const chave of Object.keys(valor)) {
    congelarProfundo(valor[chave]);
  }
  return Object.freeze(valor);
}

export const TABELA_DIFICULDADES_STEAM = congelarProfundo({
  FACIL: {
    id: 'FACIL',
    nomePt: 'ÁGUAS CALMAS',
    nomeEn: 'CALM WATERS',
    curtoPt: 'FÁCIL',
    curtoEn: 'EASY',
    resumoPt: '+25 SUC | FROTA -20% | SAQUE +25% | PONTOS 0,80x',
    resumoEn: '+25 SCRAP | FLEET -20% | LOOT +25% | SCORE 0.80x',
    sucataInicial: 35,
    combustivelInicial: 18,
    bonusMunicaoInicial: 3,
    velocidadeFrotaMnPorHora: 4.8,
    multiplicadorSaque: 1.25,
    multiplicadorCascoInimigo: 0.85,
    ajusteBarreiraInimigoSetoresMedios: -1,
    bonusEvasaoInimigoPct: -3,
    iaMiraInteligente: false,
    multiplicadorPontuacao: 0.8,
  },
  NORMAL: {
    id: 'NORMAL',
    nomePt: 'TERMOCLINA',
    nomeEn: 'THERMOCLINE',
    curtoPt: 'NORMAL',
    curtoEn: 'NORMAL',
    resumoPt: 'EQUILÍBRIO GDD CANÔNICO | FROTA 6,0 MN/H | 1,00x',
    resumoEn: 'CANONICAL GDD BALANCE | FLEET 6.0 NM/H | 1.00x',
    sucataInicial: 10,
    combustivelInicial: 16,
    bonusMunicaoInicial: 0,
    velocidadeFrotaMnPorHora: 6.0,
    multiplicadorSaque: 1.0,
    multiplicadorCascoInimigo: 1.0,
    ajusteBarreiraInimigoSetoresMedios: 0,
    bonusEvasaoInimigoPct: 0,
    iaMiraInteligente: false,
    multiplicadorPontuacao: 1.0,
  },
  DIFICIL: {
    id: 'DIFICIL',
    nomePt: 'FOSSA ABISSAL',
    nomeEn: 'ABYSSAL TRENCH',
    curtoPt: 'DIFÍCIL',
    curtoEn: 'HARD',
    resumoPt: '0 SUC | FROTA 7,0 MN/H | IA TÁTICA | PONTOS 1,35x',
    resumoEn: '0 SCRAP | FLEET 7.0 NM/H | SMART AI | SCORE 1.35x',
    sucataInicial: 0,
    combustivelInicial: 13,
    bonusMunicaoInicial: -1,
    velocidadeFrotaMnPorHora: 7.0,
    multiplicadorSaque: 0.85,
    multiplicadorCascoInimigo: 1.2,
    ajusteBarreiraInimigoSetoresMedios: 1,
    bonusEvasaoInimigoPct: 5,
    iaMiraInteligente: true,
    multiplicadorPontuacao: 1.35,
  },
});

export const ORDEM_DIFICULDADES_STEAM = Object.freeze(['FACIL', 'NORMAL', 'DIFICIL']);

export function obterConfiguracaoDificuldadeSteam(dificuldadeId = 'NORMAL') {
  const chave = String(dificuldadeId ?? 'NORMAL').toUpperCase();
  return TABELA_DIFICULDADES_STEAM[chave] ?? TABELA_DIFICULDADES_STEAM.NORMAL;
}

export function ciclarDificuldadeSteam(dificuldadeAtual = 'NORMAL', direcao = 1) {
  const atual = obterConfiguracaoDificuldadeSteam(dificuldadeAtual).id;
  const idx = ORDEM_DIFICULDADES_STEAM.indexOf(atual);
  const prox = (idx + (direcao >= 0 ? 1 : -1) + ORDEM_DIFICULDADES_STEAM.length) % ORDEM_DIFICULDADES_STEAM.length;
  return ORDEM_DIFICULDADES_STEAM[prox];
}

/**
 * Escala os atributos de um encontro inimigo conforme a dificuldade selecionada.
 * Na dificuldade `NORMAL`, preserva 100% dos valores originais do GDD sem alteração!
 */
export function escalarInimigoPorDificuldade(inimigoBase, dificuldadeId = 'NORMAL', setorNumero = 1) {
  if (!inimigoBase) return inimigoBase;
  const cfg = obterConfiguracaoDificuldadeSteam(dificuldadeId);
  if (cfg.id === 'NORMAL') {
    return inimigoBase;
  }
  const s = Math.max(1, Math.min(8, Number(setorNumero) || 1));
  const hpBase = Number(inimigoBase.hpCascoAtual ?? inimigoBase.hpMax ?? 10);
  const hpMaxBase = Number(inimigoBase.hpCascoMax ?? inimigoBase.hpMax ?? hpBase);
  const novoHpMax = Math.max(4, Math.round(hpMaxBase * cfg.multiplicadorCascoInimigo));
  const novoHpAtual = Math.min(novoHpMax, Math.max(4, Math.round(hpBase * cfg.multiplicadorCascoInimigo)));

  const barreiraBase = Number(
    inimigoBase.camadasBarreiraMax ?? inimigoBase.barreiraBolhasMax ?? inimigoBase.barreiraMax ?? 0
  );
  let deltaBarreira = 0;
  if (cfg.id === 'FACIL' && s >= 2 && s <= 4 && barreiraBase >= 2) {
    deltaBarreira = -1;
  } else if (cfg.id === 'DIFICIL' && (s === 4 || s === 6 || s === 8) && barreiraBase >= 1) {
    deltaBarreira = 1;
  }
  const novaBarreiraMax = Math.max(0, Math.min(4, barreiraBase + deltaBarreira));
  const evasaoBase = Number(
    inimigoBase.evasaoBasePct ?? inimigoBase.esquivaBasePct ?? inimigoBase.evasaoPct ?? inimigoBase.esquivaEfetivaPct ?? 10
  );
  const novaEvasao = Math.max(0, Math.min(45, evasaoBase + cfg.bonusEvasaoInimigoPct));

  return congelarProfundo({
    ...inimigoBase,
    hpCascoMax: novoHpMax,
    hpCascoAtual: novoHpAtual,
    ...(inimigoBase.hpMax !== undefined ? { hpMax: novoHpMax } : {}),
    ...(inimigoBase.camadasBarreiraMax !== undefined ? { camadasBarreiraMax: novaBarreiraMax } : {}),
    ...(inimigoBase.camadasBarreiraAtuais !== undefined
      ? { camadasBarreiraAtuais: Math.min(novaBarreiraMax, Number(inimigoBase.camadasBarreiraAtuais) + Math.max(0, deltaBarreira)) }
      : {}),
    ...(inimigoBase.barreiraBolhasMax !== undefined
      ? {
          barreiraBolhasMax: novaBarreiraMax,
          tetoBolhasBarreira: novaBarreiraMax,
        }
      : {}),
    ...(inimigoBase.barreiraBolhasAtual !== undefined
      ? {
          barreiraBolhasAtual: Math.min(
            novaBarreiraMax,
            Number(inimigoBase.barreiraBolhasAtual) + Math.max(0, deltaBarreira)
          ),
        }
      : {}),
    ...(inimigoBase.camadasBarreiraAtivas !== undefined
      ? {
          camadasBarreiraAtivas: Math.min(
            novaBarreiraMax,
            Number(inimigoBase.camadasBarreiraAtivas) + Math.max(0, deltaBarreira)
          ),
        }
      : {}),
    ...(inimigoBase.evasaoBasePct !== undefined ? { evasaoBasePct: novaEvasao } : {}),
    ...(inimigoBase.esquivaBasePct !== undefined ? { esquivaBasePct: novaEvasao } : {}),
    ...(inimigoBase.esquivaEfetivaPct !== undefined ? { esquivaEfetivaPct: novaEvasao } : {}),
    dificuldadeAplicada: cfg.id,
  });
}

/**
 * IA tática para `DIFICIL`: escolhe a câmara-alvo mais vulnerável/crítica da nave do jogador!
 */
export function selecionarAlvoInimigoInteligente(naveJogador, camarasPadrao = [], sementeDeterministica = 0) {
  const camaras = Array.isArray(naveJogador?.camaras) && naveJogador.camaras.length > 0
    ? naveJogador.camaras
    : camarasPadrao;
  if (camaras.length === 0) return null;

  const escudosAtivos = Number(
    naveJogador?.camadasBarreiraAtivas ??
      naveJogador?.barreiraBolhas?.camadasAtuais ??
      naveJogador?.barreira?.bolhasAtuais ??
      naveJogador?.camadasBarreira ??
      0
  );
  const temCamaraAlagada = camaras.some(
    (c) =>
      Number(c.alagamentoPesadoKg ?? 0) >= 2 ||
      Boolean(c.curtoCircuitoAtivo) ||
      (Boolean(c.brechaAtiva) && Number(c.aguaKg ?? 0) >= 10) ||
      Number(c.massaAguaKg ?? 0) >= 40 ||
      Number(c.nivelInundacaoPct ?? 0) >= 35
  );
  const evasaoAlta = Number(naveJogador?.evasaoTotalPct ?? naveJogador?.esquivaEfetivaPct ?? 0) >= 25;

  const encontrarCamaraPorSub = (trechos) =>
    camaras.find((c) => {
      const idStr = typeof c.id === 'string' ? c.id : '';
      const chave = `${c.nome ?? ''} ${c.sistema ?? ''} ${c.tipoSistema ?? ''} ${idStr}`.toUpperCase();
      const intViva = Number(c.barrasIntegridade ?? c.integridadeAtual ?? c.barrasAtuais ?? c.integridade ?? 1);
      return trechos.some((t) => chave.includes(t)) && intViva > 0;
    });

  if (escudosAtivos >= 1) {
    const camBarreira = encontrarCamaraPorSub(['BARREIRA', 'BOLHA', 'ESC']);
    if (camBarreira) return camBarreira.id ?? camBarreira.nome;
  }
  if (temCamaraAlagada) {
    const camBranquia = encontrarCamaraPorSub(['BRANQUIA', 'BOMBA', 'BRQ']);
    if (camBranquia) return camBranquia.id ?? camBranquia.nome;
  }
  if (evasaoAlta) {
    const camCortex = encontrarCamaraPorSub(['CORTEX', 'PILOT', 'NAVEG', 'SIFAO', 'PROPULS']);
    if (camCortex) return camCortex.id ?? camCortex.nome;
  }
  const camArmas = encontrarCamaraPorSub(['ARMA', 'ARTILH', 'ART']);
  if (camArmas) return camArmas.id ?? camArmas.nome;

  const idx = Math.abs(Math.trunc(Number(sementeDeterministica) || 0)) % camaras.length;
  return camaras[idx]?.id ?? camaras[idx]?.nome ?? null;
}

export const CATALOGO_24_CONQUISTAS_STEAM = congelarProfundo([
  // 1..10: Conquistas de Espécie (2 por bio-nave -> desbloqueiam o Layout Tipo B correspondente!)
  {
    id: 'ACH_CARCACA_1_FOIL_PURO',
    steamApiKey: 'STAT_ACH_CARCACA_1',
    especieNave: 'CARCACA_ALFA',
    desbloqueiaLayoutId: 'CARCACA_ALFA_B',
    iconeCurto: 'FOIL',
    tituloPt: 'ASA INTOCÁVEL',
    tituloEn: 'UNTOUCHED HYDROFOIL',
    descPt: 'Carcaça Alfa: Vencer combate sem cair em Touchdown.',
    descEn: 'Alpha Carapace: Win combat without dropping off foil.',
  },
  {
    id: 'ACH_CARCACA_2_DRENAGEM_LAMPEJO',
    steamApiKey: 'STAT_ACH_CARCACA_2',
    especieNave: 'CARCACA_ALFA',
    desbloqueiaLayoutId: 'CARCACA_ALFA_B',
    iconeCurto: 'PUMP',
    tituloPt: 'EXPURGO BRANQUIAL',
    tituloEn: 'RAPID GILL PURGE',
    descPt: 'Carcaça Alfa: Drenar >80kg de água acumulada numa luta.',
    descEn: 'Alpha Carapace: Drain >80kg of water in one battle.',
  },
  {
    id: 'ACH_MANTA_1_BLACKOUT_TOTAL',
    steamApiKey: 'STAT_ACH_MANTA_1',
    especieNave: 'MANTA_VOLT',
    desbloqueiaLayoutId: 'MANTA_VOLT_B',
    iconeCurto: 'VOLT',
    tituloPt: 'CURTO-CIRCUITO NEURAL',
    tituloEn: 'NEURAL BLACKOUT',
    descPt: 'Manta Volt: Ionizar 2+ sistemas inimigos ao mesmo tempo.',
    descEn: 'Volt Manta: Ionize 2+ enemy systems simultaneously.',
  },
  {
    id: 'ACH_MANTA_2_SEM_ESCUDO_ATE_S5',
    steamApiKey: 'STAT_ACH_MANTA_2',
    especieNave: 'MANTA_VOLT',
    desbloqueiaLayoutId: 'MANTA_VOLT_B',
    iconeCurto: 'GLID',
    tituloPt: 'CORRENTEZA ELÉTRICA',
    tituloEn: 'ELECTRIC CURRENT',
    descPt: 'Manta Volt: Alcançar o Setor 5 com casco acima de 70%.',
    descEn: 'Volt Manta: Reach Sector 5 with hull above 70%.',
  },
  {
    id: 'ACH_COURACA_1_ARIETE_PESADO',
    steamApiKey: 'STAT_ACH_COURACA_1',
    especieNave: 'COURACA_LIMIAR',
    desbloqueiaLayoutId: 'COURACA_LIMIAR_B',
    iconeCurto: 'TANK',
    tituloPt: 'BASTIÃO DE TOUCHDOWN',
    tituloEn: 'TOUCHDOWN BASTION',
    descPt: 'Couraça Limiar: Vencer em Touchdown sem perder tripulantes.',
    descEn: 'Threshold Shell: Win in Touchdown with zero crew deaths.',
  },
  {
    id: 'ACH_COURACA_2_FORTALEZA_BLINDADA',
    steamApiKey: 'STAT_ACH_COURACA_2',
    especieNave: 'COURACA_LIMIAR',
    desbloqueiaLayoutId: 'COURACA_LIMIAR_B',
    iconeCurto: 'CHIT',
    tituloPt: 'QUITINA IMPENETRÁVEL',
    tituloEn: 'IMPENETRABLE CHITIN',
    descPt: 'Couraça Limiar: Absorver ou defletir 5+ disparos numa luta.',
    descEn: 'Threshold Shell: Absorb or deflect 5+ shots in one battle.',
  },
  {
    id: 'ACH_SOMBRA_1_FANTASMA_TERMAL',
    steamApiKey: 'STAT_ACH_SOMBRA_1',
    especieNave: 'SOMBRA_ABISSAL',
    desbloqueiaLayoutId: 'SOMBRA_ABISSAL_B',
    iconeCurto: 'INK!',
    tituloPt: 'ESPECTRO TERMOCLÍNICO',
    tituloEn: 'THERMOCLINE PHANTOM',
    descPt: 'Sombra Abissal: Disparar feixe durante Tinta Furtiva ativa.',
    descEn: 'Abyssal Shadow: Fire a thermal beam while Cloaked in Ink.',
  },
  {
    id: 'ACH_SOMBRA_2_PREDADOR_CIRURGICO',
    steamApiKey: 'STAT_ACH_SOMBRA_2',
    especieNave: 'SOMBRA_ABISSAL',
    desbloqueiaLayoutId: 'SOMBRA_ABISSAL_B',
    iconeCurto: 'SURG',
    tituloPt: 'BISTURI ABISSAL',
    tituloEn: 'ABYSSAL SCALPEL',
    descPt: 'Sombra Abissal: Vencer combate sem sofrer 1 HP de casco.',
    descEn: 'Abyssal Shadow: Win a battle taking zero hull damage.',
  },
  {
    id: 'ACH_COLMEIA_1_QUATRO_ESPECIES',
    steamApiKey: 'STAT_ACH_COLMEIA_1',
    especieNave: 'COLMEIA_VIVA',
    desbloqueiaLayoutId: 'COLMEIA_VIVA_B',
    iconeCurto: 'SYMB',
    tituloPt: 'SIMBIOSE TETRA-ESPÉCIE',
    tituloEn: 'FOURFOLD SYMBIOSIS',
    descPt: 'Colmeia Viva: Ter Polvo, Arraia, Baiacu e Caranguejo vivos.',
    descEn: 'Living Hive: Keep Octopus, Ray, Puffer & Crab alive aboard.',
  },
  {
    id: 'ACH_COLMEIA_2_ABORDAGEM_OSMOTICA',
    steamApiKey: 'STAT_ACH_COLMEIA_2',
    especieNave: 'COLMEIA_VIVA',
    desbloqueiaLayoutId: 'COLMEIA_VIVA_B',
    iconeCurto: 'CREW',
    tituloPt: 'EXPURGO DE CONVESES',
    tituloEn: 'DECK DEPOPULATION',
    descPt: 'Colmeia Viva: Realizar Captura Intacta de embarcação.',
    descEn: 'Living Hive: Achieve an Intact Capture victory.',
  },

  // 11..24: 14 Conquistas Globais de Maestria
  {
    id: 'ACH_GLOBAL_PRIMEIRO_SALTO',
    steamApiKey: 'STAT_ACH_GLOBAL_1',
    especieNave: null,
    desbloqueiaLayoutId: null,
    iconeCurto: 'JUMP',
    tituloPt: 'DECOLAGEM HIDRODINÂMICA',
    tituloEn: 'HYDRODYNAMIC LIFTOFF',
    descPt: 'Executar seu primeiro salto entre boias na carta náutica.',
    descEn: 'Complete your first jump between buoys on the sector chart.',
  },
  {
    id: 'ACH_GLOBAL_CAPTURA_INTACTA',
    steamApiKey: 'STAT_ACH_GLOBAL_2',
    especieNave: null,
    desbloqueiaLayoutId: null,
    iconeCurto: '+40%',
    tituloPt: 'PREDADOR CIRÚRGICO',
    tituloEn: 'SURGICAL PREDATOR',
    descPt: 'Conquistar vitória por Captura Intacta / Cirúrgica (+40%).',
    descEn: 'Win a fight via Intact / Surgical Capture (+40% loot).',
  },
  {
    id: 'ACH_GLOBAL_MERGULHO_EVASAO',
    steamApiKey: 'STAT_ACH_GLOBAL_3',
    especieNave: null,
    desbloqueiaLayoutId: null,
    iconeCurto: '400H',
    tituloPt: 'ABAIXO DO SONAR',
    tituloEn: 'BELOW SONAR HORIZON',
    descPt: 'Mergulhar em 400 Hz sob fogo hostil e retomar o voo no foil.',
    descEn: 'Dive to 400 Hz under hostile fire and spool back onto foil.',
  },
  {
    id: 'ACH_GLOBAL_BLUE_OPTION',
    steamApiKey: 'STAT_ACH_GLOBAL_4',
    especieNave: null,
    desbloqueiaLayoutId: null,
    iconeCurto: 'BLUE',
    tituloPt: 'ADAPTAÇÃO BIOLÓGICA',
    tituloEn: 'BIOLOGICAL ADAPTATION',
    descPt: 'Resolver 3+ Opções Azuis (B) em uma mesma campanha.',
    descEn: 'Resolve 3+ Blue Options (B) within a single campaign.',
  },
  {
    id: 'ACH_GLOBAL_QUEST_COMPLETA',
    steamApiKey: 'STAT_ACH_GLOBAL_5',
    especieNave: null,
    desbloqueiaLayoutId: null,
    iconeCurto: 'QST!',
    tituloPt: 'RASTREADOR DE COORDENADAS',
    tituloEn: 'COORDINATE TRACKER',
    descPt: 'Concluir uma missão encadeada [QUEST] na carta setorial.',
    descEn: 'Complete a multi-node [QUEST] chain on the sector chart.',
  },
  {
    id: 'ACH_GLOBAL_ARSENAL_4_BOCAS',
    steamApiKey: 'STAT_ACH_GLOBAL_6',
    especieNave: null,
    desbloqueiaLayoutId: null,
    iconeCurto: '4xWP',
    tituloPt: 'ESPINHA ARTILHEIRA',
    tituloEn: 'DORSAL BROADSIDE',
    descPt: 'Equipar 4 armas ativas simultâneas na espinha dorsal.',
    descEn: 'Equip 4 active weapons simultaneously on the dorsal spine.',
  },
  {
    id: 'ACH_GLOBAL_ENXERTO_TRIPLO',
    steamApiKey: 'STAT_ACH_GLOBAL_7',
    especieNave: null,
    desbloqueiaLayoutId: null,
    iconeCurto: '3xOR',
    tituloPt: 'QUIMERA SIMBIÓTICA',
    tituloEn: 'SYMBIOTIC CHIMERA',
    descPt: 'Manter 3+ órgãos simbióticos instalados/ativos na bio-nave.',
    descEn: 'Carry 3+ active symbiotic organs aboard your bio-craft.',
  },
  {
    id: 'ACH_GLOBAL_MESTRE_OFICINA',
    steamApiKey: 'STAT_ACH_GLOBAL_8',
    especieNave: null,
    desbloqueiaLayoutId: null,
    iconeCurto: 'MAX!',
    tituloPt: 'ARQUITETO GENÉTICO',
    tituloEn: 'GENETIC ARCHITECT',
    descPt: 'Evoluir qualquer sistema orgânico até seu nível máximo.',
    descEn: 'Upgrade any organic ship system to its maximum level.',
  },
  {
    id: 'ACH_GLOBAL_SETOR_5_PROFUNDO',
    steamApiKey: 'STAT_ACH_GLOBAL_9',
    especieNave: null,
    desbloqueiaLayoutId: null,
    iconeCurto: 'SEC5',
    tituloPt: 'ALÉM DA ZONA FÓTICA',
    tituloEn: 'BEYOND THE PHOTIC ZONE',
    descPt: 'Alcançar o Setor 5 (Fossa Bioluminescente) em qualquer run.',
    descEn: 'Reach Sector 5 (Bioluminescent Trench) in any run.',
  },
  {
    id: 'ACH_GLOBAL_MATADOR_LEVIATA',
    steamApiKey: 'STAT_ACH_GLOBAL_10',
    especieNave: null,
    desbloqueiaLayoutId: null,
    iconeCurto: 'LEVI',
    tituloPt: 'CAÇADOR DE TITÃS',
    tituloEn: 'TITAN HARPOONER',
    descPt: 'Superar um Leviatã Abissal nos Setores 5 a 8.',
    descEn: 'Defeat an Abyssal Leviathan in Sectors 5 through 8.',
  },
  {
    id: 'ACH_GLOBAL_VITORIA_CARCACA',
    steamApiKey: 'STAT_ACH_GLOBAL_11',
    especieNave: null,
    desbloqueiaLayoutId: null,
    iconeCurto: 'BOSS',
    tituloPt: 'OCEANO LIBERTADO',
    tituloEn: 'OCEAN UNCHAINED',
    descPt: 'Destruir as 3 Fases da Draga Continental no Setor 8.',
    descEn: 'Destroy all 3 Phases of the Continental Dredge in Sector 8.',
  },
  {
    id: 'ACH_GLOBAL_VITORIA_DIFICIL',
    steamApiKey: 'STAT_ACH_GLOBAL_12',
    especieNave: null,
    desbloqueiaLayoutId: null,
    iconeCurto: 'HARD',
    tituloPt: 'SENHOR DA FOSSA ABISSAL',
    tituloEn: 'LORD OF THE ABYSS',
    descPt: 'Vencer a campanha na dificuldade Difícil (Fossa Abissal).',
    descEn: 'Win the campaign on Hard difficulty (Abyssal Trench).',
  },
  {
    id: 'ACH_GLOBAL_FROTA_COMPLETA_AB',
    steamApiKey: 'STAT_ACH_GLOBAL_13',
    especieNave: null,
    desbloqueiaLayoutId: null,
    iconeCurto: '10AB',
    tituloPt: 'ALMIRANTE DE DEZ CASCOS',
    tituloEn: 'TEN-HULL ADMIRAL',
    descPt: 'Desbloquear todas as 5 variantes Tipo B do hangar.',
    descEn: 'Unlock all 5 Type-B hull variants in the hangar.',
  },
  {
    id: 'ACH_GLOBAL_TUTORIAL_CONCLUIDO',
    steamApiKey: 'STAT_ACH_GLOBAL_14',
    especieNave: null,
    desbloqueiaLayoutId: null,
    iconeCurto: 'TUTO',
    tituloPt: 'PILOTO DE HIDROFÓLIO',
    tituloEn: 'FOIL HELMSMAN',
    descPt: 'Concluir as 6 etapas do Tutorial Hidrodinâmico Guiado.',
    descEn: 'Complete all 6 steps of the Guided Hydrofoil Tutorial.',
  },
]);

export function obterCatalogo24ConquistasSteam() {
  return CATALOGO_24_CONQUISTAS_STEAM;
}

/**
 * Avalia conquistas recém-desbloqueadas a partir de telemetria real da campanha/combate.
 */
export function avaliarConquistasSteam(telemetria = {}, idsJaDesbloqueados = []) {
  const jaTem = new Set(idsJaDesbloqueados ?? []);
  const novos = [];
  const tentar = (id, cond) => {
    if (cond && !jaTem.has(id)) {
      jaTem.add(id);
      novos.push(id);
    }
  };

  const esp = String(telemetria.especieNave ?? '').toUpperCase();
  const setor = Number(telemetria.setorAtual ?? 1);
  const dif = String(telemetria.dificuldade ?? 'NORMAL').toUpperCase();

  // Espécies
  tentar('ACH_CARCACA_1_FOIL_PURO', esp === 'CARCACA_ALFA' && Boolean(telemetria.vitoriaCombateSemTouchdown));
  tentar('ACH_CARCACA_2_DRENAGEM_LAMPEJO', esp === 'CARCACA_ALFA' && Number(telemetria.aguaDrenadaNaLutaKg ?? 0) >= 80);
  tentar('ACH_MANTA_1_BLACKOUT_TOTAL', esp === 'MANTA_VOLT' && Number(telemetria.sistemasInimigosIonizadosSimultaneos ?? 0) >= 2);
  tentar('ACH_MANTA_2_SEM_ESCUDO_ATE_S5', esp === 'MANTA_VOLT' && setor >= 5 && Number(telemetria.pctCascoAtual ?? 0) >= 70);
  tentar('ACH_COURACA_1_ARIETE_PESADO', esp === 'COURACA_LIMIAR' && Boolean(telemetria.vitoriaEmTouchdownSemMortes));
  tentar('ACH_COURACA_2_FORTALEZA_BLINDADA', esp === 'COURACA_LIMIAR' && Number(telemetria.impactosAbsorvidosOuDefletidosNaLuta ?? 0) >= 5);
  tentar('ACH_SOMBRA_1_FANTASMA_TERMAL', esp === 'SOMBRA_ABISSAL' && Boolean(telemetria.feixeDisparadoSobTintaFurtiva));
  tentar('ACH_SOMBRA_2_PREDADOR_CIRURGICO', esp === 'SOMBRA_ABISSAL' && Boolean(telemetria.vitoriaCombateZeroDanoCasco));
  tentar('ACH_COLMEIA_1_QUATRO_ESPECIES', esp === 'COLMEIA_VIVA' && Number(telemetria.especiesDistintasVivasABordo ?? 0) >= 4);
  tentar('ACH_COLMEIA_2_ABORDAGEM_OSMOTICA', esp === 'COLMEIA_VIVA' && Boolean(telemetria.capturaIntactaRealizada));

  // Globais
  tentar('ACH_GLOBAL_PRIMEIRO_SALTO', Number(telemetria.saltosRealizados ?? 0) >= 1);
  tentar('ACH_GLOBAL_CAPTURA_INTACTA', Boolean(telemetria.capturaIntactaRealizada));
  tentar('ACH_GLOBAL_MERGULHO_EVASAO', Boolean(telemetria.esquivouEmMergulhoTatico));
  tentar('ACH_GLOBAL_BLUE_OPTION', Number(telemetria.blueOptionsResolvidasNaRun ?? 0) >= 3);
  tentar('ACH_GLOBAL_QUEST_COMPLETA', Number(telemetria.questsConcluidasNaRun ?? 0) >= 1);
  tentar('ACH_GLOBAL_ARSENAL_4_BOCAS', Number(telemetria.armasAtivasSimultaneas ?? 0) >= 4);
  tentar('ACH_GLOBAL_ENXERTO_TRIPLO', Number(telemetria.orgaosAtivosSimultaneos ?? 0) >= 3);
  tentar('ACH_GLOBAL_MESTRE_OFICINA', Boolean(telemetria.sistemaNoNivelMaximo));
  tentar('ACH_GLOBAL_SETOR_5_PROFUNDO', setor >= 5);
  tentar('ACH_GLOBAL_MATADOR_LEVIATA', Boolean(telemetria.leviataDerrotado));
  tentar('ACH_GLOBAL_VITORIA_CARCACA', Boolean(telemetria.vitoriaCampanhaDraga));
  tentar('ACH_GLOBAL_VITORIA_DIFICIL', Boolean(telemetria.vitoriaCampanhaDraga) && dif === 'DIFICIL');
  tentar('ACH_GLOBAL_TUTORIAL_CONCLUIDO', Boolean(telemetria.tutorialConcluido));

  // Regra Canônica FTL AE (2/2): cada Variante Tipo B exige AMBAS as 2 conquistas dedicadas daquela espécie!
  const especiesComB = new Set(telemetria.layoutsTipoBDesbloqueados ?? []);
  const idsLayoutsCandidatosB = [...new Set(CATALOGO_24_CONQUISTAS_STEAM.map((a) => a.desbloqueiaLayoutId).filter(Boolean))];
  for (const idLayB of idsLayoutsCandidatosB) {
    const reqsLay = CATALOGO_24_CONQUISTAS_STEAM.filter((a) => a.desbloqueiaLayoutId === idLayB);
    if (reqsLay.length > 0 && reqsLay.every((a) => jaTem.has(a.id))) {
      especiesComB.add(idLayB);
    }
  }
  tentar('ACH_GLOBAL_FROTA_COMPLETA_AB', especiesComB.size >= 5);

  return congelarProfundo({
    novosDesbloqueados: novos,
    todosDesbloqueados: [...jaTem],
    layoutsTipoBDesbloqueados: [...especiesComB],
  });
}

export function verificarLayoutTipoBDesbloqueado(layoutId, perfilOuConquistas = {}) {
  const id = String(layoutId ?? '').toUpperCase();
  if (!id.endsWith('_B')) return true;
  if (perfilOuConquistas?.desbloquearTudoDev === true) return true;
  const listaLayouts = new Set(perfilOuConquistas?.layoutsDesbloqueados ?? perfilOuConquistas?.layoutsTipoBDesbloqueados ?? []);
  if (listaLayouts.has(id)) return true;
  const conquistas = new Set(perfilOuConquistas?.conquistasDesbloqueadas ?? []);
  const reqs = CATALOGO_24_CONQUISTAS_STEAM.filter((a) => a.desbloqueiaLayoutId === id);
  return reqs.length > 0 && reqs.every((a) => conquistas.has(a.id));
}

export const PADRAO_ATALHOS_TECLADO_STEAM = congelarProfundo({
  PAUSAR_TATICO: 'Space',
  MERGULHO_TATICO: 'KeyM',
  DRENAR_VALVULAS: 'KeyD',
  SALVA_MANUAL: 'KeyX',
  ARMA_SLOT_1: 'Digit1',
  ARMA_SLOT_2: 'Digit2',
  ARMA_SLOT_3: 'Digit3',
  ARMA_SLOT_4: 'Digit4',
  SALVAR_POSTOS: 'KeyZ',
  RETORNAR_POSTOS: 'KeyY',
  SONDA_HACK: 'KeyH',
  PARASITA_NEURAL: 'KeyN',
  ABORDAGEM_ENVIO: 'KeyG',
  ALTERNAR_IDIOMA: 'KeyL',
  ABRIR_OPCOES: 'KeyO',
  ABRIR_CONQUISTAS: 'KeyJ',
});

export const PADRAO_CONFIGURACOES_STEAM = congelarProfundo({
  volumeMaster: 85,
  volumeMusica: 75,
  volumeSfx: 90,
  mudoTotal: false,
  telaCheia: false,
  escalaPixel: 'AUTO',
  screenShakeAtivo: true,
  reduzirMovimento: false,
  idioma: 'pt-BR',
  dificuldadePadrao: 'NORMAL',
  atalhosTeclado: PADRAO_ATALHOS_TECLADO_STEAM,
});

function clampInt(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function criarConfiguracoesSteam(parcial = {}) {
  const idioma = parcial.idioma === 'en-US' ? 'en-US' : 'pt-BR';
  const escala = ['AUTO', '1X', '2X'].includes(parcial.escalaPixel) ? parcial.escalaPixel : 'AUTO';
  const dif = obterConfiguracaoDificuldadeSteam(parcial.dificuldadePadrao ?? 'NORMAL').id;
  const atalhos = {
    ...PADRAO_ATALHOS_TECLADO_STEAM,
    ...(parcial.atalhosTeclado && typeof parcial.atalhosTeclado === 'object' ? parcial.atalhosTeclado : {}),
  };

  return congelarProfundo({
    volumeMaster: clampInt(parcial.volumeMaster, 0, 100, PADRAO_CONFIGURACOES_STEAM.volumeMaster),
    volumeMusica: clampInt(parcial.volumeMusica, 0, 100, PADRAO_CONFIGURACOES_STEAM.volumeMusica),
    volumeSfx: clampInt(parcial.volumeSfx, 0, 100, PADRAO_CONFIGURACOES_STEAM.volumeSfx),
    mudoTotal: Boolean(parcial.mudoTotal ?? false),
    telaCheia: Boolean(parcial.telaCheia ?? false),
    escalaPixel: escala,
    screenShakeAtivo: parcial.screenShakeAtivo === undefined ? true : Boolean(parcial.screenShakeAtivo),
    reduzirMovimento: Boolean(parcial.reduzirMovimento ?? false),
    idioma,
    dificuldadePadrao: dif,
    atalhosTeclado: atalhos,
  });
}

export function atualizarConfiguracoesSteam(configAtual, mudancas = {}) {
  const base = criarConfiguracoesSteam(configAtual);
  return criarConfiguracoesSteam({
    ...base,
    ...mudancas,
    atalhosTeclado: {
      ...base.atalhosTeclado,
      ...(mudancas.atalhosTeclado ?? {}),
    },
  });
}

/**
 * Reatribui uma tecla para `acaoId`. Se a tecla já estiver atribuída a outra ação,
 * troca (swap) as duas teclas automaticamente para evitar conflito silencioso!
 */
export function reatribuirAtalhoTecladoSteam(configAtual, acaoId, novaTeclaCodigo) {
  const base = criarConfiguracoesSteam(configAtual);
  const acao = String(acaoId ?? '');
  const codigo = String(novaTeclaCodigo ?? '').trim();
  if (!Object.prototype.hasOwnProperty.call(PADRAO_ATALHOS_TECLADO_STEAM, acao) || codigo.length === 0) {
    return base;
  }
  const teclaAntigaDaAcao = base.atalhosTeclado[acao];
  const proximoMapa = { ...base.atalhosTeclado };
  for (const [outraAcao, codAtual] of Object.entries(proximoMapa)) {
    if (outraAcao !== acao && codAtual === codigo) {
      proximoMapa[outraAcao] = teclaAntigaDaAcao;
    }
  }
  proximoMapa[acao] = codigo;
  return atualizarConfiguracoesSteam(base, { atalhosTeclado: proximoMapa });
}

/**
 * Aplica de forma pura e imutável qualquer ação comercial Steam (`OPCOES`, `CONQUISTAS`, `IDIOMA`,
 * `VARIANTE_AB`, `DIFICULDADE`, `TUTORIAL`, `VOLUME`, `KEYBIND`) sobre `estado.meta`.
 */
export function aplicarAcaoMetaSteamNoEstado(estado, acaoSteam, payload = {}) {
  if (!estado || typeof estado !== 'object') {
    return congelarProfundo({ ok: false, codigoErro: 'ESTADO_INVALIDO', estado });
  }
  const metaAnt = estado.meta ?? {};
  let cfg = criarConfiguracoesSteam(metaAnt.configuracoesSteam ?? {});
  let modalSteamAtivo = metaAnt.modalSteamAtivo ?? null;
  let aguardandoRebindAcao = metaAnt.aguardandoRebindAcao ?? null;
  let conquistaInspecionadaId = metaAnt.conquistaInspecionadaId ?? null;
  let varianteHangar = metaAnt.varianteHangar === 'B' ? 'B' : 'A';
  let dificuldade = obterConfiguracaoDificuldadeSteam(metaAnt.dificuldade ?? cfg.dificuldadePadrao ?? 'NORMAL').id;
  let tutorialSteam = metaAnt.tutorialSteam ?? criarEstadoTutorialSteam(false);
  let conquistas = Array.isArray(metaAnt.conquistasDesbloqueadas) ? [...metaAnt.conquistasDesbloqueadas] : [];
  let iniciarRunTutorialCombate = false;
  let aviso = metaAnt.ultimoAvisoCampanha ?? null;
  let naveMutada = estado.naveJogador;
  let alvoMutado = estado.alvoCombate;
  let economiaMutada = estado.economia;
  let recursosMutados = estado.recursos;
  let eventosExtrasMeta = null;
  let projeteisExtrasMeta = null;

  let popupConquistaRecente = metaAnt.popupConquistaRecente ?? null;

  const acao = String(acaoSteam ?? '').trim().toUpperCase();
  switch (acao) {
    case 'ABRIR_OPCOES':
      modalSteamAtivo = 'OPCOES';
      aguardandoRebindAcao = null;
      break;
    case 'ALTERNAR_MODAL_OPCOES':
      modalSteamAtivo = modalSteamAtivo === 'OPCOES' ? null : 'OPCOES';
      aguardandoRebindAcao = null;
      break;
    case 'ABRIR_CONQUISTAS':
      modalSteamAtivo = 'CONQUISTAS';
      aguardandoRebindAcao = null;
      break;
    case 'INSPECIONAR_CONQUISTA':
      conquistaInspecionadaId = String(payload.conquistaId ?? '').trim() || conquistaInspecionadaId;
      break;
    case 'FECHAR_MODAL_STEAM':
      modalSteamAtivo = null;
      aguardandoRebindAcao = null;
      break;
    case 'AJUSTAR_VOLUME': {
      const canal = payload.canal ?? 'volumeMaster';
      const atual = Number(cfg[canal] ?? 80);
      cfg = atualizarConfiguracoesSteam(cfg, { [canal]: atual + Number(payload.delta ?? 0) });
      break;
    }
    case 'DEFINIR_VOLUME_DIRETO': {
      const canal = payload.canal ?? 'volumeMaster';
      const valorDireto = Math.max(0, Math.min(100, Math.round(Number(payload.valor ?? cfg[canal] ?? 80))));
      cfg = atualizarConfiguracoesSteam(cfg, { [canal]: valorDireto });
      break;
    }
    case 'RESTAURAR_PADROES_OPCOES': {
      cfg = criarConfiguracoesSteam({
        idioma: cfg.idioma,
        dificuldadePadrao: dificuldade,
        telaCheia: cfg.telaCheia,
        escalaPixel: cfg.escalaPixel,
        volumeMaster: PADRAO_CONFIGURACOES_STEAM.volumeMaster,
        volumeMusica: PADRAO_CONFIGURACOES_STEAM.volumeMusica,
        volumeSfx: PADRAO_CONFIGURACOES_STEAM.volumeSfx,
        mudoTotal: false,
        screenShakeAtivo: true,
        reduzirMovimento: false,
        atalhosTeclado: { ...PADRAO_ATALHOS_TECLADO_STEAM },
      });
      aguardandoRebindAcao = null;
      aviso =
        cfg.idioma === 'en-US'
          ? 'DEFAULT HOTKEYS & AUDIO SETTINGS RESTORED'
          : 'ATALHOS E ÁUDIO RESTAURADOS AO PADRÃO';
      break;
    }
    case 'ALTERNAR_TELA_CHEIA':
      cfg = atualizarConfiguracoesSteam(cfg, { telaCheia: !cfg.telaCheia });
      break;
    case 'CICLAR_ESCALA_PIXEL': {
      const ordem = ['AUTO', '1X', '2X'];
      const prox = ordem[(ordem.indexOf(cfg.escalaPixel) + 1) % ordem.length];
      cfg = atualizarConfiguracoesSteam(cfg, { escalaPixel: prox });
      break;
    }
    case 'ALTERNAR_SCREEN_SHAKE':
      cfg = atualizarConfiguracoesSteam(cfg, { screenShakeAtivo: !cfg.screenShakeAtivo });
      break;
    case 'ALTERNAR_REDUZIR_MOVIMENTO':
      cfg = atualizarConfiguracoesSteam(cfg, { reduzirMovimento: !cfg.reduzirMovimento });
      break;
    case 'ALTERNAR_IDIOMA':
      cfg = atualizarConfiguracoesSteam(cfg, { idioma: cfg.idioma === 'en-US' ? 'pt-BR' : 'en-US' });
      aviso = cfg.idioma === 'en-US' ? 'LANGUAGE SET TO ENGLISH (EN-US)' : 'IDIOMA DEFINIDO: PORTUGUÊS (PT-BR)';
      break;
    case 'INICIAR_REMAPEAR_TECLA': {
      const alvoAcao = String(payload.acaoId ?? '').trim();
      aguardandoRebindAcao = Object.prototype.hasOwnProperty.call(PADRAO_ATALHOS_TECLADO_STEAM, alvoAcao)
        ? (aguardandoRebindAcao === alvoAcao ? null : alvoAcao)
        : null;
      break;
    }
    case 'REATRIBUIR_TECLA': {
      const acaoAlvo = payload.acaoId ?? aguardandoRebindAcao;
      cfg = reatribuirAtalhoTecladoSteam(cfg, acaoAlvo, payload.novaTeclaCodigo);
      aguardandoRebindAcao = null;
      break;
    }
    case 'ALTERNAR_VARIANTE_AB': {
      const arq = metaAnt.carcacaSelecionadaHangar ?? estado.naveJogador?.idArquitetura ?? 'CARCACA_ALFA';
      const cand = varianteHangar === 'A' ? 'B' : 'A';
      const podeB =
        cand === 'A' ||
        Boolean(payload.ignorarBloqueioTipoB) ||
        verificarLayoutTipoBDesbloqueado(`${arq}_B`, {
          conquistasDesbloqueadas: conquistas,
          layoutsDesbloqueados: metaAnt.layoutsTipoBDesbloqueados ?? estado.perfilJogador?.layoutsTipoBDesbloqueados ?? [],
        });
      if (!podeB) {
        return congelarProfundo({
          ok: false,
          codigoErro: 'LAYOUT_TIPO_B_BLOQUEADO',
          estado: {
            ...estado,
            meta: {
              ...metaAnt,
              edicaoComercialSteam: true,
              ultimoAvisoCampanha:
                cfg.idioma === 'en-US'
                  ? 'TYPE B LOCKED — COMPLETE BOTH (2) SPECIES ACHIEVEMENTS!'
                  : 'LAYOUT TIPO B BLOQUEADO — CUMPRA AS 2 CONQUISTAS DA ESPÉCIE!',
            },
          },
        });
      }
      varianteHangar = cand;
      aviso =
        cfg.idioma === 'en-US'
          ? `SHIP TOPOLOGY SELECTED: ${arq} [TYPE ${varianteHangar}]`
          : `TOPOLOGIA SELECIONADA: ${arq} [TIPO ${varianteHangar}]`;
      break;
    }
    case 'CICLAR_DIFICULDADE':
      dificuldade = ciclarDificuldadeSteam(dificuldade, 1);
      cfg = atualizarConfiguracoesSteam(cfg, { dificuldadePadrao: dificuldade });
      aviso =
        cfg.idioma === 'en-US'
          ? `DIFFICULTY: ${obterConfiguracaoDificuldadeSteam(dificuldade).curtoEn}`
          : `DIFICULDADE: ${obterConfiguracaoDificuldadeSteam(dificuldade).curtoPt}`;
      break;
    case 'INICIAR_TUTORIAL_GUIADO':
      tutorialSteam = criarEstadoTutorialSteam(true);
      modalSteamAtivo = null;
      iniciarRunTutorialCombate = (metaAnt.faseJogo ?? 'INICIO') === 'INICIO';
      break;
    case 'TUTORIAL_AVANCAR': {
      tutorialSteam = avancarPassoTutorialSteam(tutorialSteam);
      if (tutorialSteam.concluido) {
        const avConq = avaliarConquistasSteam({ tutorialConcluido: true }, conquistas);
        conquistas = [...avConq.todosDesbloqueados];
        if (avConq.novosDesbloqueados.length > 0) {
          popupConquistaRecente = {
            idConquista: avConq.novosDesbloqueados[0],
            idsNovas: [...avConq.novosDesbloqueados],
            restanteSeg: 4.5,
          };
        }
      }
      break;
    }
    case 'TUTORIAL_PULAR':
      tutorialSteam = pularTutorialSteam(tutorialSteam);
      break;
    case 'SALVAR_POSTOS_TRIPULACAO': {
      if (!estado.naveJogador) {
        return congelarProfundo({ ok: false, codigoErro: 'NAVE_AUSENTE', estado });
      }
      const postosNovos = { ...(estado.naveJogador.postosSalvosTripulacao ?? {}) };
      for (const tr of estado.naveJogador.tripulacao ?? []) {
        if (tr.localizacao === 'NAVE_JOGADOR' && Number(tr.hpAtual ?? 0) > 0) {
          postosNovos[tr.id] = Number(tr.camaraDestinoId ?? tr.camaraAtualId ?? 2);
        }
      }
      naveMutada = {
        ...estado.naveJogador,
        postosSalvosTripulacao: postosNovos,
      };
      aviso =
        cfg.idioma === 'en-US'
          ? 'CREW STATIONS SAVED [Z]!'
          : 'POSTOS DA TRIPULAÇÃO SALVOS [Z]!';
      break;
    }
    case 'RETORNAR_POSTOS_TRIPULACAO': {
      if (!estado.naveJogador) {
        return congelarProfundo({ ok: false, codigoErro: 'NAVE_AUSENTE', estado });
      }
      const postosRef = estado.naveJogador.postosSalvosTripulacao ?? {};
      const limitesSala = estado.naveJogador.limitesPorSala ?? {};
      const ocupacaoAlvo = {};
      const tripBase = estado.naveJogador.tripulacao ?? [];
      for (const tr of tripBase) {
        if (tr.localizacao === 'NAVE_JOGADOR' && Number(tr.hpAtual ?? 0) > 0) {
          const postoDesejado = Number(postosRef[tr.id]);
          const ficaMesma = !Number.isInteger(postoDesejado) || postoDesejado < 1 || postoDesejado > 8 || postoDesejado === tr.camaraAtualId;
          if (ficaMesma || Number(tr.atordoadoSeg ?? 0) > 0) {
            const camFixa = Number(tr.camaraDestinoId ?? tr.camaraAtualId ?? 2);
            ocupacaoAlvo[camFixa] = (ocupacaoAlvo[camFixa] ?? 0) + 1;
          }
        }
      }
      let movidosPosto = 0;
      const tripRetornando = tripBase.map((tr) => {
        if (tr.localizacao !== 'NAVE_JOGADOR' || Number(tr.hpAtual ?? 0) <= 0 || Number(tr.atordoadoSeg ?? 0) > 0) {
          return tr;
        }
        const postoDesejado = Number(postosRef[tr.id]);
        if (!Number.isInteger(postoDesejado) || postoDesejado < 1 || postoDesejado > 8) {
          return tr;
        }
        if (postoDesejado === tr.camaraAtualId && !tr.camaraDestinoId) {
          return tr;
        }
        if (postoDesejado === tr.camaraAtualId && tr.camaraDestinoId) {
          movidosPosto += 1;
          return {
            ...tr,
            camaraDestinoId: null,
            acaoPendente: null,
            progressoNadoSeg: 0.0,
          };
        }
        const capMaxPosto = Math.max(1, Number(limitesSala[postoDesejado] ?? 2));
        if ((ocupacaoAlvo[postoDesejado] ?? 0) >= capMaxPosto) {
          return tr;
        }
        ocupacaoAlvo[postoDesejado] = (ocupacaoAlvo[postoDesejado] ?? 0) + 1;
        movidosPosto += 1;
        return {
          ...tr,
          camaraDestinoId: postoDesejado,
          acaoPendente: 'MOVER',
          acopladoBulbo: false,
        };
      });
      naveMutada = {
        ...estado.naveJogador,
        tripulacao: tripRetornando,
      };
      aviso =
        cfg.idioma === 'en-US'
          ? `CREW RETURNING TO STATIONS (${movidosPosto})!`
          : `RETORNANDO AOS POSTOS SALVOS (${movidosPosto})!`;
      break;
    }
    case 'ACIONAR_SONDA_SABOTAGEM': {
      const subAtu = estado.naveJogador?.subsistemasTaticosSteam;
      const alvoH = estado.alvoCombate;
      const cartH = { ...(estado.economia ?? estado.recursos ?? { sucata: 0, biomassa: 0, combustivel: 0, municao: 0 }) };
      if (
        (metaAnt.faseJogo ?? 'COMBATE') !== 'COMBATE' ||
        !alvoH ||
        alvoH.ativo === false ||
        Number(alvoH.hpCascoAtual ?? 0) <= 0 ||
        !subAtu?.sondaSabotagem ||
        Number(subAtu.recargaSondaSeg ?? 0) > 0 ||
        Number(cartH.municao ?? 0) < 1
      ) {
        return congelarProfundo({
          ok: false,
          codigoErro: 'SONDA_SABOTAGEM_INDISPONIVEL',
          estado: {
            ...estado,
            meta: {
              ...metaAnt,
              ultimoAvisoCampanha:
                cfg.idioma === 'en-US'
                  ? 'HACK PROBE UNAVAILABLE (NEEDS COMBAT, COOLDOWN 0S & 1 AMMO)'
                  : 'SONDA DE SABOTAGEM INDISPONÍVEL (EXIGE COMBATE, RECARGA 0S E 1 MUNIÇÃO)',
            },
          },
        });
      }
      const salasCand = alvoH.salasOuOrgaos ?? [];
      const salaPedida = salasCand.find((s) => Number(s.id) === Number(payload.salaAlvoId));
      const salaEscudo = salasCand.find((s) => /ESCUDO|BARREIRA/i.test(s.nome ?? '') && Number(s.integridadeAtual ?? s.integridade ?? 0) > 0);
      const salaTatica =
        salaPedida ??
        salaEscudo ??
        salasCand.find((s) => /TORRETA|ARMA|MOTOR|GANGLIO/i.test(s.nome ?? '') && Number(s.integridadeAtual ?? s.integridade ?? 0) > 0) ??
        salasCand[0];
      const idSalaHack = Number(salaTatica?.id ?? 1);
      cartH.municao = Math.max(0, Number(cartH.municao ?? 0) - 1);
      economiaMutada = cartH;
      recursosMutados = cartH;
      naveMutada = {
        ...estado.naveJogador,
        subsistemasTaticosSteam: {
          ...subAtu,
          recargaSondaSeg: 16.0,
          sondaAtivaSeg: 7.0,
        },
      };
      const idsStunHack = new Set();
      const novasSalasH = salasCand.map((s) => {
        if (Number(s.id) !== idSalaHack) return s;
        const ionNovo = Math.min(4, Number(s.danoIonizado ?? 0) + 2);
        const durH = Math.max(Number(s.paralisiaIonSeg ?? s.tempoRestanteIonSeg ?? 0), 7.0);
        const tripSalaH = Array.isArray(s.tripulantes)
          ? s.tripulantes.map((t) => {
              if (Number(t.hpAtual ?? 0) > 0) idsStunHack.add(t.id);
              return Number(t.hpAtual ?? 0) > 0
                ? { ...t, atordoadoSeg: Math.max(Number(t.atordoadoSeg ?? 0), 3.5) }
                : t;
            })
          : s.tripulantes;
        return {
          ...s,
          danoIonizado: ionNovo,
          barrasIonizadas: ionNovo,
          paralisiaIonSeg: durH,
          tempoRestanteIonSeg: durH,
          ...(Array.isArray(tripSalaH) ? { tripulantes: tripSalaH } : {}),
        };
      });
      const novaTripInimH = Array.isArray(alvoH.tripulacaoInimiga)
        ? alvoH.tripulacaoInimiga.map((t) =>
            idsStunHack.has(t.id) || Number(t.salaAtualId ?? t.salaId) === idSalaHack
              ? { ...t, atordoadoSeg: Math.max(Number(t.atordoadoSeg ?? 0), 3.5) }
              : t
          )
        : alvoH.tripulacaoInimiga;
      const bolhasPosHack = Math.max(0, Number(alvoH.camadasBarreiraAtivas ?? alvoH.barreiraBolhasAtual ?? 0) - 2);
      alvoMutado = {
        ...alvoH,
        camadasBarreiraAtivas: bolhasPosHack,
        barreiraBolhasAtual: bolhasPosHack,
        salasOuOrgaos: novasSalasH,
        ...(Array.isArray(novaTripInimH) ? { tripulacaoInimiga: novaTripInimH } : {}),
      };
      eventosExtrasMeta = [
        ...(Array.isArray(metaAnt.eventosVisuaisUltimoTick) ? metaAnt.eventosVisuaisUltimoTick : []),
        {
          tipo: 'SONDA_SABOTAGEM_IMPACTO',
          salaAlvoId: idSalaHack,
          texto: cfg.idioma === 'en-US' ? 'HACKED -2 SHLD!' : 'SONDA HACK -2 ESC!',
        },
      ];
      projeteisExtrasMeta = [
        ...(Array.isArray(metaAnt.projeteisAtivos) ? metaAnt.projeteisAtivos : []),
        {
          id: `PJ-HACK-${Number(estado.relogio?.tickAtual ?? 0)}`,
          familia: 'ION_ELETRICO',
          resultado: 'IMPACTO',
          origem: 'JOGADOR',
          slotIndice: 0,
          salaAlvoId: idSalaHack,
          progresso: 0.15,
        },
      ];
      aviso =
        cfg.idioma === 'en-US'
          ? `HACK PROBE LOCKED ON ROOM #${idSalaHack} (-2 SHIELDS, 7S ION)!`
          : `SONDA DE SABOTAGEM CRAVADA NA SALA #${idSalaHack} (-2 ESCUDOS, 7S ÍON)!`;
      break;
    }
    case 'ACIONAR_PARASITA_NEURAL': {
      const subAtuN = estado.naveJogador?.subsistemasTaticosSteam;
      const alvoN = estado.alvoCombate;
      if (
        (metaAnt.faseJogo ?? 'COMBATE') !== 'COMBATE' ||
        !alvoN ||
        alvoN.ativo === false ||
        Number(alvoN.hpCascoAtual ?? 0) <= 0 ||
        !subAtuN?.parasitaNeural ||
        Number(subAtuN.recargaNeuralSeg ?? 0) > 0
      ) {
        return congelarProfundo({
          ok: false,
          codigoErro: 'PARASITA_NEURAL_INDISPONIVEL',
          estado: {
            ...estado,
            meta: {
              ...metaAnt,
              ultimoAvisoCampanha:
                cfg.idioma === 'en-US'
                  ? 'NEURO SPORE UNAVAILABLE (NEEDS COMBAT & COOLDOWN 0S)'
                  : 'ESPORO NEURAL INDISPONÍVEL (EXIGE COMBATE E RECARGA 0S)',
            },
          },
        });
      }
      naveMutada = {
        ...estado.naveJogador,
        subsistemasTaticosSteam: {
          ...subAtuN,
          recargaNeuralSeg: 18.0,
        },
      };
      const candidatosInimigos = [];
      const vistosN = new Set();
      for (const s of alvoN.salasOuOrgaos ?? []) {
        for (const t of s.tripulantes ?? []) {
          if (Number(t.hpAtual ?? 0) > 0 && !vistosN.has(t.id)) {
            vistosN.add(t.id);
            candidatosInimigos.push({ ...t, salaRefId: s.id });
          }
        }
      }
      for (const t of alvoN.tripulacaoInimiga ?? []) {
        if (Number(t.hpAtual ?? 0) > 0 && !vistosN.has(t.id)) {
          vistosN.add(t.id);
          candidatosInimigos.push({ ...t, salaRefId: Number(t.salaAtualId ?? t.salaId ?? 1) });
        }
      }
      let salaImpactoNeuralId = 1;
      if (candidatosInimigos.length > 0) {
        candidatosInimigos.sort((a, b) => {
          const prefA = Number(a.salaRefId) === Number(payload.salaAlvoId) ? 1 : 0;
          const prefB = Number(b.salaRefId) === Number(payload.salaAlvoId) ? 1 : 0;
          if (prefA !== prefB) return prefB - prefA;
          return Number(b.hpAtual ?? 0) - Number(a.hpAtual ?? 0);
        });
        const escolhidoN = candidatosInimigos[0];
        salaImpactoNeuralId = Number(escolhidoN.salaRefId ?? 1);
        const novasSalasN = (alvoN.salasOuOrgaos ?? []).map((s) => ({
          ...s,
          ...(Array.isArray(s.tripulantes)
            ? {
                tripulantes: s.tripulantes.map((t) =>
                  t.id === escolhidoN.id ? { ...t, controleNeuralSeg: 8.0, atordoadoSeg: 0, emFugaEscada: false } : t
                ),
              }
            : {}),
        }));
        const novaTripInimN = Array.isArray(alvoN.tripulacaoInimiga)
          ? alvoN.tripulacaoInimiga.map((t) =>
              t.id === escolhidoN.id ? { ...t, controleNeuralSeg: 8.0, atordoadoSeg: 0, emFugaEscada: false } : t
            )
          : alvoN.tripulacaoInimiga;
        alvoMutado = {
          ...alvoN,
          salasOuOrgaos: novasSalasN,
          ...(Array.isArray(novaTripInimN) ? { tripulacaoInimiga: novaTripInimN } : {}),
        };
      } else {
        // Contra Monstro Marinho / IA Autónoma: sinapse neural paralisa o Gânglio/Núcleo por 5.0s e cancela Aperto/Carapaça!
        const ganglioN =
          (alvoN.salasOuOrgaos ?? []).find((s) => s.ehGanglioCentral || /GANGLIO|CONTROLE|PONTE/i.test(s.nome ?? '')) ??
          (alvoN.salasOuOrgaos ?? [])[0];
        salaImpactoNeuralId = Number(ganglioN?.id ?? 1);
        alvoMutado = {
          ...alvoN,
          carapacaReflexaSeg: 0,
          escudoQuitinaGanglioPts: 0,
          apertoQuilhaSeg: 0,
          salasOuOrgaos: (alvoN.salasOuOrgaos ?? []).map((s) =>
            Number(s.id) === salaImpactoNeuralId
              ? {
                  ...s,
                  paralisiaIonSeg: Math.max(Number(s.paralisiaIonSeg ?? 0), 5.0),
                  tempoRestanteIonSeg: Math.max(Number(s.tempoRestanteIonSeg ?? 0), 5.0),
                }
              : s
          ),
        };
      }
      eventosExtrasMeta = [
        ...(Array.isArray(metaAnt.eventosVisuaisUltimoTick) ? metaAnt.eventosVisuaisUltimoTick : []),
        {
          tipo: 'PARASITA_NEURAL_ATIVO',
          salaAlvoId: salaImpactoNeuralId,
          texto: cfg.idioma === 'en-US' ? 'NEURAL CONTROL 8S!' : 'DOMÍNIO NEURAL 8S!',
        },
      ];
      aviso =
        cfg.idioma === 'en-US'
          ? 'NEURO SPORE ACTIVE — HOSTILE MIND DOMINATED FOR 8S!'
          : 'ESPORO NEURAL ATIVO — MENTE HOSTIL DOMINADA POR 8S!';
      break;
    }
    default:
      return congelarProfundo({ ok: false, codigoErro: 'ACAO_STEAM_DESCONHECIDA', estado });
  }

  const arqAtual = metaAnt.carcacaSelecionadaHangar ?? estado.naveJogador?.idArquitetura ?? 'CARCACA_ALFA';
  const proximoEstado = congelarProfundo({
    ...estado,
    ...(naveMutada !== estado.naveJogador ? { naveJogador: naveMutada } : {}),
    ...(alvoMutado !== estado.alvoCombate ? { alvoCombate: alvoMutado } : {}),
    ...(economiaMutada !== estado.economia ? { economia: economiaMutada } : {}),
    ...(recursosMutados !== estado.recursos ? { recursos: recursosMutados } : {}),
    meta: {
      ...metaAnt,
      edicaoComercialSteam: true,
      audioMutado: Boolean(cfg.mudoTotal),
      configuracoesSteam: cfg,
      modalSteamAtivo,
      aguardandoRebindAcao,
      conquistaInspecionadaId,
      varianteHangar,
      dificuldade,
      tutorialSteam,
      conquistasDesbloqueadas: conquistas,
      ...(popupConquistaRecente ? { popupConquistaRecente } : {}),
      ...(eventosExtrasMeta ? { eventosVisuaisUltimoTick: eventosExtrasMeta } : {}),
      ...(projeteisExtrasMeta ? { projeteisAtivos: projeteisExtrasMeta } : {}),
      layoutId:
        (metaAnt.faseJogo ?? 'INICIO') === 'INICIO'
          ? `${arqAtual}_${varianteHangar}`
          : (metaAnt.layoutId ?? `${arqAtual}_${varianteHangar}`),
      ultimoAvisoCampanha: aviso,
    },
  });

  return congelarProfundo({
    ok: true,
    acaoSteamExecutada: acao,
    iniciarRunTutorialCombate,
    estado: proximoEstado,
  });
}
