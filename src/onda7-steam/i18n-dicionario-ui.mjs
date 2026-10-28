/**
 * Bio-Foil — Edição Comercial Steam (Onda 7)
 * Módulo: Internacionalização Completa (`pt-BR` e `en-US`) + Tradução dos 17 Eventos
 * Clássicos do GDD + Gate Estrito de Zero Truncamento (`auditarZeroTruncamentoViewModel`).
 */

function congelarI18n(valor) {
  if (valor === null || typeof valor !== 'object' || Object.isFrozen(valor)) {
    return valor;
  }
  for (const k of Object.keys(valor)) {
    congelarI18n(valor[k]);
  }
  return Object.freeze(valor);
}

export const IDIOMAS_SUPORTADOS_STEAM = Object.freeze(['pt-BR', 'en-US']);

export function normalizarIdiomaSteam(idioma) {
  return idioma === 'en-US' || idioma === 'en' || idioma === 'EN' ? 'en-US' : 'pt-BR';
}

export const DICIONARIO_UI_STEAM = congelarI18n({
  'pt-BR': {
    // Barra Superior & Abas
    HUD_CASCO: 'CASCO',
    HUD_SUCATA: 'SUCATA',
    HUD_BIOMASSA: 'BIOMASSA',
    HUD_COMB: 'COMB',
    HUD_MUN: 'MUN',
    HUD_PESO: 'PESO',
    HUD_SETOR: 'SETOR',
    HUD_PAUSADO: 'PAUSADO [ESPAÇO]',
    HUD_RODANDO: 'EM CURSO [ESPAÇO]',
    ABA_MAPA: 'CARTA',
    ABA_OFICINA: 'OFICINA',
    ABA_LOJA: 'PORTO',
    ABA_OPCOES: 'OPÇÕES [O]',
    ABA_CONQUISTAS: 'TROFÉUS [J]',

    // Hangar
    HANGAR_TITULO: 'HANGAR DE BIO-NAVES — ESCOLHA SEU CASCO VIVO',
    HANGAR_SUBTITULO: 'SELECIONE ESPÉCIE, TOPOLOGIA [A/B], DIFICULDADE E TRIPULAÇÃO',
    HANGAR_BTN_INICIAR: 'ZARPAR RUMO AO SETOR 1',
    HANGAR_BTN_TUTORIAL: 'TUTORIAL GUIADO [T]',
    HANGAR_BTN_OPCOES: 'OPÇÕES [O]',
    HANGAR_BTN_CONQUISTAS: 'CONQUISTAS [J]',
    HANGAR_BTN_IDIOMA: 'IDIOMA: PT-BR [L]',
    HANGAR_VARIANTE_A: 'LAYOUT A (PADRÃO)',
    HANGAR_VARIANTE_B: 'LAYOUT B (AVANÇADO)',
    HANGAR_TIPO_B_BLOQ: 'TIPO B BLOQUEADO — CONQUISTE OS 2 TROFÉUS DESTA NAVE',
    HANGAR_DIFICULDADE: 'DIFICULDADE',
    HANGAR_SLOTS_ARMAS: 'BOCAS',
    HANGAR_MCRIT: 'M_CRIT',

    // Combate & Termômetro Foil
    FOIL_EM_VOO: 'EM FOIL (+25% EV)',
    FOIL_TOUCHDOWN: 'TOUCHDOWN (0% EV)',
    FOIL_MERGULHO: 'MERGULHO 400 HZ!',
    FOIL_SPOOL_UP: 'SPOOL-UP FOIL',
    BTN_MERGULHO_TATICO: 'MERGULHO [M]',
    BTN_DRENAR_VALVULAS: 'DRENAR [D]',
    PAINEL_REATOR: 'REATOR & SISTEMAS',
    PAINEL_ARMAS: 'ARTILHARIA DORSAL',
    PAINEL_TRIPULACAO: 'TRIPULAÇÃO VIVA',
    PAINEL_ALVO: 'SONAR DO ALVO',
    ALVO_INTACTO_40: 'CAPTURA +40% ATIVA',

    // Câmaras da Bio-Nave (curtos <= 8 chars p/ zero overflow em 68px!)
    CAM_1_CURTO: 'ARMAS',
    CAM_2_CURTO: 'CÓRTEX',
    CAM_3_CURTO: 'BRÂNQUIA',
    CAM_4_CURTO: 'BARREIRA',
    CAM_5_CURTO: 'SIFÃO',
    CAM_6_CURTO: 'QUILHA',
    CAM_7_CURTO: 'ENXERTO',
    CAM_8_CURTO: 'SIMBIOSE',

    // Sistemas Completos
    SIS_CORTEX: 'Córtex de Navegação',
    SIS_BRANQUIA: 'Bomba Branquial',
    SIS_ARMAS: 'Câmara de Armas',
    SIS_BARREIRA: 'Glândula de Barreira',
    SIS_PROPULSAO: 'Sifão de Propulsão',
    SIS_FOIL: 'Mastro do Foil',
    SIS_BLINDAGEM: 'Placas de Blindagem',
    SIS_TINTA: 'Glândula de Tinta Furtiva',

    // Espécies Tripulação
    ESP_POLVO: 'Polvo',
    ESP_ARRAIA: 'Arraia Elétrica',
    ESP_BAIACU: 'Baiacu Espinhoso',
    ESP_CARANGUEJO: 'Caranguejo Anfíbio',

    // Carta Náutica, Loja e Oficina
    MAPA_AVANCO_FROTA: 'FROTA CORPORATIVA',
    MAPA_SALTAR: 'SALTAR PARA BOIA',
    MAPA_PROXIMO_SETOR: 'AVANÇAR AO PRÓXIMO SETOR',
    LOJA_TITULO: 'PORTO MERCANTE & SIMBIONTES — ESTOQUE DO SETOR',
    LOJA_REPARAR_1: 'REPARAR +1 HP',
    LOJA_REPARAR_TUDO: 'REPARO TOTAL',
    LOJA_COMPRAR: 'COMPRAR',
    LOJA_VENDER: 'VENDER PORÃO',
    OFICINA_TITULO: 'OFICINA BIOLÓGICA — SISTEMAS, REATOR & ENXERTOS',
    OFICINA_EVOLUIR: 'EVOLUIR SISTEMA',
    OFICINA_REATOR_MAIS: '+1 BARRA REATOR',

    // Modal Opções & Conquistas
    OPCOES_TITULO: 'MENU DE OPÇÕES — ÁUDIO, VÍDEO, IDIOMA E TECLAS',
    OPCOES_VOL_MASTER: 'VOLUME GERAL',
    OPCOES_VOL_MUSICA: 'MÚSICA ADAPTATIVA (.OGG)',
    OPCOES_VOL_SFX: 'FOLEY HIDROACÚSTICO (.OGG)',
    OPCOES_TELA_CHEIA: 'TELA CHEIA (STEAM)',
    OPCOES_ESCALA: 'ESCALA DE PIXEL',
    OPCOES_SHAKE: 'IMPACTO / SCREEN SHAKE',
    OPCOES_REDUZIR_MOV: 'REDUZIR PARTÍCULAS',
    OPCOES_IDIOMA: 'IDIOMA DA INTERFACE',
    OPCOES_ATALHOS: 'TECLAS RÁPIDAS (CLIQUE P/ TROCAR)',
    OPCOES_FECHAR: 'FECHAR [ESC]',
    CONQUISTAS_TITULO: 'GALERIA DE CONQUISTAS STEAM & DESBLOQUEIO TIPO B',
    CONQUISTAS_DESBLOQ: 'DESBLOQUEADA',
    CONQUISTAS_BLOQ: 'PENDENTE',

    // Fim de Run
    FIM_VITORIA: 'VITÓRIA — DRAGA CONTINENTAL DESTRUÍDA!',
    FIM_DERROTA: 'PERMADEATH — CASCO PERDIDO NO ABISMO',
    FIM_PONTUACAO: 'PONTUAÇÃO FINAL',
    FIM_NOVO_JOGO: 'RETORNAR AO HANGAR',
  },
  'en-US': {
    HUD_CASCO: 'HULL',
    HUD_SUCATA: 'SCRAP',
    HUD_BIOMASSA: 'BIOMASS',
    HUD_COMB: 'FUEL',
    HUD_MUN: 'AMMO',
    HUD_PESO: 'MASS',
    HUD_SETOR: 'SECTOR',
    HUD_PAUSADO: 'PAUSED [SPACE]',
    HUD_RODANDO: 'RUNNING [SPACE]',
    ABA_MAPA: 'CHART',
    ABA_OFICINA: 'WORKSHOP',
    ABA_LOJA: 'PORT',
    ABA_OPCOES: 'OPTIONS [O]',
    ABA_CONQUISTAS: 'TROPHIES [J]',

    HANGAR_TITULO: 'BIO-CRAFT HANGAR — SELECT YOUR LIVING HULL',
    HANGAR_SUBTITULO: 'CHOOSE SPECIES, [A/B] TOPOLOGY, DIFFICULTY & CREW',
    HANGAR_BTN_INICIAR: 'LAUNCH INTO SECTOR 1',
    HANGAR_BTN_TUTORIAL: 'GUIDED TUTORIAL [T]',
    HANGAR_BTN_OPCOES: 'OPTIONS [O]',
    HANGAR_BTN_CONQUISTAS: 'ACHIEVEMENTS [J]',
    HANGAR_BTN_IDIOMA: 'LANG: EN-US [L]',
    HANGAR_VARIANTE_A: 'LAYOUT A (STANDARD)',
    HANGAR_VARIANTE_B: 'LAYOUT B (ADVANCED)',
    HANGAR_TIPO_B_BLOQ: 'TYPE B LOCKED — EARN BOTH SHIP ACHIEVEMENTS TO UNLOCK',
    HANGAR_DIFICULDADE: 'DIFFICULTY',
    HANGAR_SLOTS_ARMAS: 'SLOTS',
    HANGAR_MCRIT: 'M_CRIT',

    FOIL_EM_VOO: 'ON FOIL (+25% EV)',
    FOIL_TOUCHDOWN: 'TOUCHDOWN (0% EV)',
    FOIL_MERGULHO: '400 HZ DIVE!',
    FOIL_SPOOL_UP: 'FOIL SPOOL-UP',
    BTN_MERGULHO_TATICO: 'TACTICAL DIVE [M]',
    BTN_DRENAR_VALVULAS: 'PURGE [D]',
    PAINEL_REATOR: 'REACTOR & SYSTEMS',
    PAINEL_ARMAS: 'DORSAL WEAPONS',
    PAINEL_TRIPULACAO: 'LIVING CREW',
    PAINEL_ALVO: 'TARGET SONAR',
    ALVO_INTACTO_40: 'INTACT +40% LOOT',

    CAM_1_CURTO: 'WEAPONS',
    CAM_2_CURTO: 'CORTEX',
    CAM_3_CURTO: 'GILLS',
    CAM_4_CURTO: 'BARRIER',
    CAM_5_CURTO: 'SIPHON',
    CAM_6_CURTO: 'KEEL',
    CAM_7_CURTO: 'GRAFT A',
    CAM_8_CURTO: 'GRAFT B',

    SIS_CORTEX: 'Navigation Cortex',
    SIS_BRANQUIA: 'Gill Pump',
    SIS_ARMAS: 'Weapons Chamber',
    SIS_BARREIRA: 'Bubble Barrier Gland',
    SIS_PROPULSAO: 'Propulsion Siphon',
    SIS_FOIL: 'Hydrofoil Mast',
    SIS_BLINDAGEM: 'Chitin Armor Plates',
    SIS_TINTA: 'Cloaking Ink Gland',

    ESP_POLVO: 'Octopus',
    ESP_ARRAIA: 'Electric Ray',
    ESP_BAIACU: 'Spiny Puffer',
    ESP_CARANGUEJO: 'Amphibious Crab',

    MAPA_AVANCO_FROTA: 'CORPORATE FLEET',
    MAPA_SALTAR: 'JUMP TO BUOY',
    MAPA_PROXIMO_SETOR: 'ADVANCE TO NEXT SECTOR',
    LOJA_TITULO: 'MERCHANT PORT & SYMBIONTS — SECTOR SHOWCASE',
    LOJA_REPARAR_1: 'REPAIR +1 HP',
    LOJA_REPARAR_TUDO: 'FULL HULL REPAIR',
    LOJA_COMPRAR: 'BUY ITEM',
    LOJA_VENDER: 'SELL HOLD ITEM',
    OFICINA_TITULO: 'BIO-WORKSHOP — SYSTEMS, REACTOR & ORGAN GRAFTS',
    OFICINA_EVOLUIR: 'UPGRADE SYSTEM',
    OFICINA_REATOR_MAIS: '+1 REACTOR BAR',

    OPCOES_TITULO: 'OPTIONS MENU — AUDIO, DISPLAY, LANGUAGE & KEYS',
    OPCOES_VOL_MASTER: 'MASTER VOLUME',
    OPCOES_VOL_MUSICA: 'ADAPTIVE MUSIC (.OGG)',
    OPCOES_VOL_SFX: 'HYDRO-FOLEY SFX (.OGG)',
    OPCOES_TELA_CHEIA: 'FULLSCREEN (STEAM)',
    OPCOES_ESCALA: 'PIXEL SCALING',
    OPCOES_SHAKE: 'IMPACT SCREEN SHAKE',
    OPCOES_REDUZIR_MOV: 'REDUCE PARTICLES',
    OPCOES_IDIOMA: 'UI LANGUAGE',
    OPCOES_ATALHOS: 'HOTKEYS (CLICK TO REBIND)',
    OPCOES_FECHAR: 'CLOSE [ESC]',
    CONQUISTAS_TITULO: 'STEAM ACHIEVEMENTS & TYPE-B HULL UNLOCKS',
    CONQUISTAS_DESBLOQ: 'UNLOCKED',
    CONQUISTAS_BLOQ: 'LOCKED',

    FIM_VITORIA: 'VICTORY — CONTINENTAL DREDGE DESTROYED!',
    FIM_DERROTA: 'PERMADEATH — HULL LOST TO THE ABYSS',
    FIM_PONTUACAO: 'FINAL SCORE',
    FIM_NOVO_JOGO: 'RETURN TO HANGAR',
  },
});

export const MAPA_SALAS_INIMIGAS_CURTAS = congelarI18n({
  'pt-BR': {
    PONTE_DE_COMANDO: 'PONTE CMD',
    SALA_DE_MAQUINAS: 'MOTOR',
    CONVES_DE_ARTILHARIA: 'ARTILH.',
    GERADOR_DE_ESCUDO: 'ESCUDO',
    PAIOL_DE_MUNICAO: 'PAIOL',
    TORRETA_DE_MISSEIS_TRIPLOS: 'MÍSSEIS',
    LANCA_ARPAO_TRIPLO: 'ARPÃO 3X',
    CANHAO_DE_PLASMA_PESADO: 'PLASMA',
    REDE_MAGNETICA_DE_ARRASTO: 'REDE MAG',
    BAIA_DE_DRONES_INDUSTRIAIS: 'DRONES',
    BROCA_CONTINENTAL_ABISSAL: 'BROCA',
    NUCLEO_CENTRAL_DA_DRAGA: 'NÚCLEO',
    GERADOR_ESCUDO_QUATRO_CAMADAS: 'ESCUDO 4X',
    CABECA_SENSORIAL: 'CABEÇA',
    CORACAO_ABISSAL: 'CORAÇÃO',
    GLANDULA_DE_DISPARO: 'GLÂNDULA',
    CAUDA_PROPULSORA: 'CAUDA',
    CARAPACA_DORSAL: 'CARAPAÇA',
  },
  'en-US': {
    PONTE_DE_COMANDO: 'BRIDGE',
    SALA_DE_MAQUINAS: 'ENGINE',
    CONVES_DE_ARTILHARIA: 'GUN DECK',
    GERADOR_DE_ESCUDO: 'SHIELDS',
    PAIOL_DE_MUNICAO: 'MAGAZINE',
    TORRETA_DE_MISSEIS_TRIPLOS: 'MISSILES',
    LANCA_ARPAO_TRIPLO: 'HARPOONS',
    CANHAO_DE_PLASMA_PESADO: 'PLASMA',
    REDE_MAGNETICA_DE_ARRASTO: 'MAG NET',
    BAIA_DE_DRONES_INDUSTRIAIS: 'DRONES',
    BROCA_CONTINENTAL_ABISSAL: 'DRILL',
    NUCLEO_CENTRAL_DA_DRAGA: 'CORE CMD',
    GERADOR_ESCUDO_QUATRO_CAMADAS: 'SHIELD 4X',
    CABECA_SENSORIAL: 'HEAD',
    CORACAO_ABISSAL: 'HEART',
    GLANDULA_DE_DISPARO: 'BIO-GUN',
    CAUDA_PROPULSORA: 'TAIL FIN',
    CARAPACA_DORSAL: 'CARAPACE',
  },
});

export const TABELA_17_EVENTOS_GDD_I18N = congelarI18n({
  SOS_1_REDE_ARRASTO: {
    tagEn: 'TRAWL',
    seloEn: 'SOS TRAWL NET',
    tituloEn: 'SYMBIONT POD TANGLED IN INDUSTRIAL TRAWL NET',
    linhasEn: [
      'A CORPORATE STEEL TRAWL NET TRAPS JUVENILE BIO-SYMBIONTS.',
      'AN AUTOMATED PATROL CUTTER APPROACHES ON SONAR.',
      'CHOOSE YOUR RESCUE PROTOCOL:',
    ],
    rotuloAEn: '[A] CUT CABLES MANUALLY UNDER RISK',
    detalheAEn: '50% BIOMASS + CREW | 50% HULL SCRAPE (-3 HP) OR FIGHT',
    rotuloBEn: '[B] SLICE NET (2+ CRABS OR THERMAL PLASMA BEAM)',
    detalheBEn: 'CLEAN RESCUE: SURGICAL BIOMASS + +1 CREWMATE!',
    rotuloCEn: '[C] AVOID PATROL AND DEPART',
    detalheCEn: 'RETURN TO SECTOR CHART',
  },
  SOS_2_CAPSULA_AFUNDANDO: {
    tagEn: 'SINKING',
    seloEn: 'SINKING POD',
    tituloEn: 'RESEARCH CAPSULE SINKING TOWARD CRUSH DEPTH',
    linhasEn: [
      'HYDROLOGISTS BROADCAST AN URGENT SOS AS THEIR SEAMS BUCKLE.',
      'REACHING THEM IN TIME DEMANDS THRUST OR AGILE TENTACLES.',
      'DECIDE YOUR DESCENT:',
    ],
    rotuloAEn: '[A] DIVE HARD AND WINCH THE CAPSULE',
    detalheAEn: '50% SCRAP + FUEL | 50% PRESSURE STRESS (-3 HP)',
    rotuloBEn: '[B] INTERCEPT VIA SIPHON LV.3+ / 2+ OCTOPUS',
    detalheBEn: 'CAPTURE SCRAP + +1 CREW + ZERO HULL DAMAGE',
    rotuloCEn: '[C] ABORT DESCENT',
    detalheCEn: 'RETURN TO SECTOR CHART',
  },
  SOS_3_NINHO_SITIADO: {
    tagEn: 'NEST',
    seloEn: 'BESIEGED NEST',
    tituloEn: 'REEF BROOD-NEST BESIEGED BY TOXIC SLUDGE',
    linhasEn: [
      'TOXIC DREDGE SLUDGE FLOODS A LIVING REEF SANCTUARY.',
      'FLUSHING THE CAVERN SAVES SYMBIONT EGGS AND ORGANS.',
      'CHOOSE YOUR ACTION:',
    ],
    rotuloAEn: '[A] PUMP WATER WITH STANDARD INTAKE',
    detalheAEn: '50% RAW BIOMASS | 50% PREDATOR SKIRMISH',
    rotuloBEn: '[B] PURGE SLUDGE (GILL PUMP LV.2+ / 2+ PUFFERS)',
    detalheBEn: 'SURGICAL BIOMASS + +1 INTACT ORGAN!',
    rotuloCEn: '[C] SEAL REEF AND WITHDRAW',
    detalheCEn: 'RETURN TO SECTOR CHART',
  },
  SOS_4_COMBOIO_ENCALHADO: {
    tagEn: 'CONVOY',
    seloEn: 'GROUNDED',
    tituloEn: 'FREE MERCHANT BARGE GROUNDED ON SANDBAR',
    linhasEn: [
      'A REBEL SUPPLY BARGE IS STUCK EXPOSED TO CORPORATE RADAR.',
      'MASKING OR RECHARGING THEIR DRIVE SECURES GENEROUS PAY.',
      'SELECT YOUR MANEUVER:',
    ],
    rotuloAEn: '[A] TOW BARGE IN THE OPEN',
    detalheAEn: '50% SCRAP + AMMO | 50% CORPORATE INTERCEPTOR FIGHT',
    rotuloBEn: '[B] CLOAK OR CHARGE (INK LV.2+ / 2+ ELECTRIC RAYS)',
    detalheBEn: 'CAPTURE SCRAP + +3 FUEL + +2 AMMO',
    rotuloCEn: '[C] IGNORE SIGNAL',
    detalheCEn: 'RETURN TO SECTOR CHART',
  },
  EXP_1_NAUFRAGIO_ANTIGO: {
    tagEn: 'WRECK',
    seloEn: 'OLD WRECK',
    tituloEn: 'PRE-COLLAPSE ARMORED CRUISER WRECKAGE',
    linhasEn: [
      'HEAVY BULKHEADS LOCK MUNITIONS AND ALLOYS INSIDE THE HULL.',
      'BLASTING THE VAULT REQUIRES CAREFUL ORDNANCE CONTROL.',
      'HOW WILL YOU BREACH IT?',
    ],
    rotuloAEn: '[A] PRY HATCHES WITH FOIL STRUTS',
    detalheAEn: '50% RAW SCRAP | 50% SHRAPNEL RICOCHET (-3 HP)',
    rotuloBEn: '[B] BREACH VAULT (ABYSSAL TORPEDO / FLAK CANNON)',
    detalheBEn: 'CAPTURE SCRAP + +3 AMMO + ZERO DAMAGE',
    rotuloCEn: '[C] LEAVE WRECK UNTOUCHED',
    detalheCEn: 'RETURN TO SECTOR CHART',
  },
  EXP_2_PLATAFORMA_FANTASMA: {
    tagEn: 'GHOST',
    seloEn: 'GHOST RIG',
    tituloEn: 'ABANDONED CORPORATE SONAR LISTENING STATION',
    linhasEn: [
      'ITS CONSOLES STILL BLINK WITH ENCRYPTED SECTOR CHARTS.',
      'AUTOMATED TURRETS SWEEP THE PERIMETER IN SILENCE.',
      'CHOOSE YOUR INFILTRATION:',
    ],
    rotuloAEn: '[A] SPRINT TO DATA CORE',
    detalheAEn: '50% REVEALS SECTOR + SCRAP | 50% TURRET COMBAT',
    rotuloBEn: '[B] BYPASS SENSORS (CORTEX LV.2+ / ABYSSAL INK SAC)',
    detalheBEn: 'REVEALS MAP + CAPTURE SCRAP + +2 FUEL',
    rotuloCEn: '[C] SLIP AWAY UNSEEN',
    detalheCEn: 'RETURN TO SECTOR CHART',
  },
  EXP_3_CARDUME_SIMBIOTICO: {
    tagEn: 'SHOAL',
    seloEn: 'SYMBIO SHOAL',
    tituloEn: 'MIGRATING SHOAL OF HEALING CLEANER SYMBIONTS',
    linhasEn: [
      'THOUSANDS OF LUMINESCENT CLEANERS CIRCLE YOUR CHITIN HULL.',
      'CALMING THEIR MATRIARCH YIELDS DEEP TISSUE REGENERATION.',
      'CHOOSE YOUR INTERACTION:',
    ],
    rotuloAEn: '[A] REST HULL IN SHALLOW SWELL',
    detalheAEn: 'REPAIR +4 HULL HP + RAW BIOMASS',
    rotuloBEn: '[B] HARMONIZE FLOW (GILL LV.3+ / PUFFER GLAND)',
    detalheBEn: 'REPAIR +8 HULL HP + SURGICAL BIOMASS!',
    rotuloCEn: '[C] MAINTAIN FOIL SPEED',
    detalheCEn: 'RETURN TO SECTOR CHART',
  },
  PER_1_CHUVA_ACIDA: {
    tagEn: 'ACID!',
    seloEn: 'ACID RAIN!',
    tituloEn: 'CAUSTIC INDUSTRIAL RAIN — MANDATORY ENGAGEMENT!',
    linhasEn: [
      'CORROSIVE DROPLETS EAT EXPOSED HULL PLATES ON THE FOIL!',
      'A CORPORATE RAIDER LUNGES OUT OF THE YELLOW SQUALL!',
      'PREPARE FOR IMMEDIATE COMBAT:',
    ],
    rotuloAEn: '[A] FIGHT THROUGH CAUSTIC RAIN',
    detalheAEn: 'MANDATORY COMBAT | ACID HAZARD ACTIVE',
    rotuloBEn: '[B] HARDEN HULL (ARMOR LV.2+ / BARRIER LV.4+)',
    detalheBEn: 'ACID NEUTRALIZED FOR 40s + BONUS SCRAP',
    rotuloCEn: '[C] SQUALL BLOCKS ESCAPE VECTOR',
    detalheCEn: 'DEFEAT HOSTILE TO CLEAR SECTOR NODE',
  },
  PER_2_VORTICE_CORRENTEZA: {
    tagEn: 'VORTEX!',
    seloEn: 'MAELSTROM!',
    tituloEn: 'ABYSSAL MAELSTROM VORTEX — TURBULENT COMBAT!',
    linhasEn: [
      'VIOLENT CROSS-CURRENTS THREATEN TO DRAG YOUR FOIL DOWN!',
      'AN APEX SEA PREDATOR HUNTS INSIDE THE WHIRLPOOL!',
      'STABILIZE YOUR TRIM:',
    ],
    rotuloAEn: '[A] BATTLE INSIDE THE WHIRLPOOL',
    detalheAEn: 'MANDATORY MONSTER FIGHT | HEAVY SWELL',
    rotuloBEn: '[B] LOCK FOIL TRIM (MAST LV.3+ / SIPHON LV.4+)',
    detalheBEn: '+15% EVASION BOOST + SURGICAL BIOMASS',
    rotuloCEn: '[C] VORTEX PREVENTS RETREAT',
    detalheCEn: 'WIN THE ENCOUNTER TO BREAK FREE',
  },
  PER_3_AGUAS_TURVAS: {
    tagEn: 'MURK!',
    seloEn: 'BLIND SILT!',
    tituloEn: 'SILT BLACKOUT ZONE — SONAR AMBUSH!',
    linhasEn: [
      'DENSE DREDGE SILT BLINDS OPTICAL AND PASSIVE SENSORS!',
      'A HOSTILE HUNTER STRIKES AT POINT-BLANK RANGE!',
      'ENGAGE TARGETING:',
    ],
    rotuloAEn: '[A] FIRE BY MANUAL HYDROPHONE',
    detalheAEn: 'MANDATORY COMBAT | REDUCED VISIBILITY',
    rotuloBEn: '[B] PIERCE SILT VIA NAVIGATION CORTEX LV.3+',
    detalheBEn: 'FULL TARGET LOCK + FIRST-SALVO ADVANTAGE',
    rotuloCEn: '[C] AMBUSH BLOCKS JUMP',
    detalheCEn: 'CLEAR THE HOSTILE TO PROCEED',
  },
  SOS_5_BALEIA_ENCALHADA: {
    tagEn: 'LEVIATH',
    seloEn: 'BEACHED TITAN',
    tituloEn: 'ANCIENT BIO-LEVIATHAN GROUNDED ON BASALT REEF',
    linhasEn: [
      'A GENTLE TITAN IS PINNED BY HARPOON ANCHORS IN FALLING TIDE.',
      'FREEING IT EARNS ANCIENT SYMBIOTIC GIFTS.',
      'CHOOSE YOUR EFFORT:',
    ],
    rotuloAEn: '[A] PULL ANCHORS AT FULL SIPHON',
    detalheAEn: '50% SURGICAL BIOMASS | 50% TAIL BACKLASH (-3 HP)',
    rotuloBEn: '[B] SHATTER ANCHORS (SIPHON LV.4+ / TORPEDO)',
    detalheBEn: '+1 INTACT ORGAN + SURGICAL BIOMASS!',
    rotuloCEn: '[C] LEAVE THE REEF',
    detalheCEn: 'RETURN TO SECTOR CHART',
  },
  SOS_6_DESERTORES_PRESOS: {
    tagEn: 'DEFECT',
    seloEn: 'DEFECTORS',
    tituloEn: 'CORPORATE DEFECTORS LOCKED IN FLOODED BUNKER',
    linhasEn: [
      'EX-ENGINEERS OFFER WEAPON SCHEMATICS FOR EXTRACTION.',
      'PRESSURE DOORS ARE JAMMED BY COLLAPSED RUBBLE.',
      'CHOOSE EXTRACTION:',
    ],
    rotuloAEn: '[A] FORCE AIRLOCK HATCH',
    detalheAEn: '50% +1 CREW + SCRAP | 50% GUARD DRONE FIGHT',
    rotuloBEn: '[B] EQUALIZE LOCK (PRESSURE BLADDER / FLAK)',
    detalheBEn: '+1 CREWMATE + +1 WEAPON IN HOLD!',
    rotuloCEn: '[C] DECLINE EXTRACTION',
    detalheCEn: 'RETURN TO SECTOR CHART',
  },
  SOS_7_CARDUME_ENVENENADO: {
    tagEn: 'TOXIN',
    seloEn: 'TOXIC PLUME',
    tituloEn: 'BIO-COLONY CHOKING IN MERCURY CONTAMINATION',
    linhasEn: [
      'TOXIC EFFLUENT POISONS A FRIENDLY HARVESTER COLONY.',
      'FILTERING THE PLUME RESTORES THEIR BIO-REACTORS.',
      'CHOOSE YOUR RESPONSE:',
    ],
    rotuloAEn: '[A] FLUSH WITH BALLAST WATER',
    detalheAEn: '50% BIOMASS + FUEL | 50% CORROSION (-2 HP)',
    rotuloBEn: '[B] DETOXIFY (GILL PUMP LV.3+ / THERMOPHILE GLAND)',
    detalheBEn: 'SURGICAL BIOMASS + +4 FUEL + REPAIR +4 HP',
    rotuloCEn: '[C] STEER AROUND PLUME',
    detalheCEn: 'RETURN TO SECTOR CHART',
  },
  SOS_8_FAROL_SUBMERSO: {
    tagEn: 'BEACON',
    seloEn: 'SUNKEN BEACON',
    tituloEn: 'SUNKEN NAVIGATION LIGHTHOUSE BROADCASTING SOS',
    linhasEn: [
      'AN OLD MARITIME BEACON KEEPER IS TRAPPED IN AN AIR POCKET.',
      'RESTORING THE BEACON REVEALS SAFE LANES ACROSS THE SECTOR.',
      'CHOOSE YOUR ACTION:',
    ],
    rotuloAEn: '[A] DIVE TO KEEPER DOME',
    detalheAEn: '50% REVEALS MAP + SCRAP | 50% REEF IMPACT (-2 HP)',
    rotuloBEn: '[B] REWIRE DOME (CORTEX LV.3+ / 2+ OCTOPUS)',
    detalheBEn: 'REVEALS SECTOR MAP + +1 CREWMATE + SCRAP',
    rotuloCEn: '[C] CONTINUE ON COURSE',
    detalheCEn: 'RETURN TO SECTOR CHART',
  },
  EXP_4_CEMITERIO_DRONES: {
    tagEn: 'DRONES',
    seloEn: 'DRONE GRAVE',
    tituloEn: 'DRIFTING GRAVEYARD OF DECOMMISSIONED WAR DRONES',
    linhasEn: [
      'DOZENS OF HULKS FLOAT WITH UNSPENT CELLS AND AMMO.',
      'SOME CORES MAY REBOOT WHEN DISTURBED.',
      'CHOOSE YOUR SALVAGE:',
    ],
    rotuloAEn: '[A] STRIP OUTER DRONE CASINGS',
    detalheAEn: '50% SCRAP + 2 AMMO | 50% ROGUE DRONE COMBAT',
    rotuloBEn: '[B] SWEEP SAFELY (FLAK CANNON / ARMOR LV.1+)',
    detalheBEn: 'CAPTURE SCRAP + +4 AMMO CLEANLY',
    rotuloCEn: '[C] PASS WITHOUT SALVAGING',
    detalheCEn: 'RETURN TO SECTOR CHART',
  },
  EXP_5_FONTE_HIDROTERMAL: {
    tagEn: 'VENT',
    seloEn: 'HYDRO VENT',
    tituloEn: 'MINERAL-RICH BLACK SMOKER HYDROTHERMAL VENT',
    linhasEn: [
      'SUPERHEATED PLUMES SPEW RARE METALS AND BIO-ENERGY.',
      'HARVESTING TOO CLOSE CAN SCALD UNPROTECTED HULLS.',
      'SELECT YOUR APPROACH:',
    ],
    rotuloAEn: '[A] SKIM OUTER PLUME',
    detalheAEn: '50% SCRAP + 3 FUEL | 50% STEAM SCALD (-3 HP)',
    rotuloBEn: '[B] HARVEST CORE (THERMOPHILE GLAND / MAST LV.3+)',
    detalheBEn: 'CAPTURE SCRAP + +4 FUEL + REPAIR +4 HP',
    rotuloCEn: '[C] BYPASS THERMAL VENT',
    detalheCEn: 'RETURN TO SECTOR CHART',
  },
  EXP_6_RECIFE_ESPELHO: {
    tagEn: 'MIRROR',
    seloEn: 'MIRROR REEF',
    tituloEn: 'CRYSTALLINE SILICA REEF REFLECTING SONAR WAVES',
    linhasEn: [
      'ACOUSTIC MIRRORS HIDE A CACHE OF SYMBIOTIC ORGANS.',
      'MISREADING ECHOES CAN SCRAPE YOUR FOIL AGAINST GLASS.',
      'CHOOSE YOUR ENTRY:',
    ],
    rotuloAEn: '[A] NAVIGATE BY VISUAL SIGHT',
    detalheAEn: '50% BIOMASS + FUEL | 50% GLASS SCRAPE (-2 HP)',
    rotuloBEn: '[B] PHASE-MATCH (ABYSSAL INK SAC / INK GLAND LV.2+)',
    detalheBEn: '+1 INTACT ORGAN + SURGICAL BIOMASS!',
    rotuloCEn: '[C] SKIRT AROUND THE REEF',
    detalheCEn: 'RETURN TO SECTOR CHART',
  },
});

/**
 * Traduz uma chave de UI com interpolação opcional `{variavel}`.
 */
export function tUi(idioma, chave, vars = null) {
  const lang = normalizarIdiomaSteam(idioma);
  const tab = DICIONARIO_UI_STEAM[lang] ?? DICIONARIO_UI_STEAM['pt-BR'];
  let base = tab[chave] ?? DICIONARIO_UI_STEAM['pt-BR'][chave] ?? String(chave);
  if (vars && typeof vars === 'object') {
    for (const [k, v] of Object.entries(vars)) {
      base = base.replaceAll(`{${k}}`, String(v));
    }
  }
  return base;
}

export const SIGLAS_24_ARMAS_HUD_I18N = congelarI18n({
  EMISSOR_ACUSTICO_I: { pt: 'ACÚST I', en: 'ACOUS I' },
  RAJADA_HIDROPNEUMATICA_II: { pt: 'RAJAD 2', en: 'BURST 2' },
  CANHAO_ARPAO_CABO: { pt: 'ARPÃO', en: 'HARPOON' },
  DISPERSOR_ESTILHACOS: { pt: 'FLAK I', en: 'FLAK I' },
  CORTADOR_TERMICO_PLASMA: { pt: 'PLASMA', en: 'PLASMA' },
  LANCADOR_TORPEDO_ABISSAL: { pt: 'TORPEDO', en: 'TORPEDO' },
  MORTEIRO_ESPOROS: { pt: 'ESPOROS', en: 'SPORES' },
  AGULHA_SONICA_RAPIDA: { pt: 'AGULHA', en: 'NEEDLE' },
  EMISSOR_RESSONANTE_CADEIA: { pt: 'CADEIA', en: 'CHAIN' },
  VULCAO_HIDROTERMAL_CADEIA: { pt: 'VULCÃO', en: 'VULCAN' },
  BATERIA_CARGA_HIDRAULICA: { pt: 'CARGA 3', en: 'CHARG 3' },
  TORPEDO_CARGA_DUPLA: { pt: 'TORP C2', en: 'TORP C2' },
  CANHAO_PULSO_BIOELETRICO_I: { pt: 'ÍON I', en: 'ION I' },
  BOMBARDEIRO_IONICO_PESADO: { pt: 'ÍON II', en: 'ION II' },
  DISPARADOR_ESPINHOS_QUILHA: { pt: 'ESPINHO', en: 'SPIKES' },
  CANHAO_PRESSAO_HIDRO: { pt: 'HIDRO 2', en: 'HYDRO 2' },
  RAJADA_HIDROPNEUMATICA_III: { pt: 'RAJAD 3', en: 'BURST 3' },
  DISPERSOR_ABISSAL_MK2: { pt: 'FLAK II', en: 'FLAK II' },
  LANCA_TERMICA_FOCAL: { pt: 'LANÇA 4', en: 'LANCE 4' },
  FEIXE_NEUROTOXICO_BIO: { pt: 'BIOFEIX', en: 'BIOBEAM' },
  CORTADOR_CASCO_ABISSAL: { pt: 'CORTA C', en: 'HULL BM' },
  TORPEDO_CRIO_TERMAL: { pt: 'CRIO TP', en: 'CRYO TP' },
  BOMBA_SIFAO_OSMOTICO: { pt: 'B.SIFÃO', en: 'OSMOTIC' },
  MORTEIRO_ACIDO_CORROSIVO: { pt: 'M.ÁCIDO', en: 'MORTAR' },
});

export function obterSiglaHudArma(chassiId, idioma = 'pt-BR') {
  const entrada = SIGLAS_24_ARMAS_HUD_I18N[String(chassiId ?? '').toUpperCase()];
  if (!entrada) return null;
  return normalizarIdiomaSteam(idioma) === 'en-US' ? entrada.en : entrada.pt;
}

export function obterRotuloCurtoCamara(camaraId, idioma = 'pt-BR') {
  return tUi(idioma, `CAM_${Number(camaraId)}_CURTO`);
}

export function obterRotuloCurtoSalaInimiga(chaveSala, idioma = 'pt-BR', maxChars = 10) {
  const lang = normalizarIdiomaSteam(idioma);
  const mapa = MAPA_SALAS_INIMIGAS_CURTAS[lang] ?? MAPA_SALAS_INIMIGAS_CURTAS['pt-BR'];
  const limpo = String(chaveSala ?? '').toUpperCase().trim();
  const candidato = mapa[limpo] ?? limpo.replace(/_/g, ' ');
  if (candidato.length <= maxChars) return candidato;
  // Abreviações semânticas curtas (jamais cortar palavra no meio!)
  const ultraCurto = lang === 'en-US'
    ? { MISSILES: 'MISSILE', HARPOONS: 'HARPOON', MAGAZINE: 'AMMO', 'SHIELD 4X': 'SHLD 4X', 'CORE CMD': 'CORE', CARAPACE: 'SHELL' }
    : { 'PONTE CMD': 'PONTE', 'ARPÃO 3X': 'ARPÃO', 'REDE MAG': 'REDE', 'ESCUDO 4X': 'ESCUDO', GLÂNDULA: 'GLÂND.', CARAPAÇA: 'CASCO' };
  return ultraCurto[candidato] ?? candidato;
}

/**
 * Retorna textos localizados (`pt-BR` ou `en-US`) para qualquer um dos 100 eventos da Edição Steam!
 */
export function traduzirEventoSteam(template, idioma = 'pt-BR') {
  if (!template) return null;
  const lang = normalizarIdiomaSteam(idioma);
  if (template.edicao === 'STEAM_AE' || template.tituloPt) {
    return Object.freeze({
      id: template.id,
      categoria: template.categoria,
      ehEventoQuest: Boolean(template.ehEventoQuest),
      tagMapa: lang === 'en-US' ? template.tagMapaEn : template.tagMapaPt,
      selo: lang === 'en-US' ? template.seloEn : template.seloPt,
      titulo: lang === 'en-US' ? template.tituloEn : template.tituloPt,
      linhas: lang === 'en-US' ? template.linhasEn : template.linhasPt,
      opcoes: [
        { letra: 'A', rotulo: lang === 'en-US' ? template.rotuloAEn : template.rotuloAPt, detalhe: lang === 'en-US' ? template.detalheAEn : template.detalheAPt },
        { letra: 'B', rotulo: lang === 'en-US' ? template.rotuloBEn : template.rotuloBPt, detalhe: lang === 'en-US' ? template.detalheBEn : template.detalheBPt },
        { letra: 'C', rotulo: lang === 'en-US' ? template.rotuloCEn : template.rotuloCPt, detalhe: lang === 'en-US' ? template.detalheCEn : template.detalheCPt },
      ],
    });
  }

  const en = TABELA_17_EVENTOS_GDD_I18N[template.id];
  if (lang === 'en-US' && en) {
    return Object.freeze({
      id: template.id,
      categoria: template.categoria,
      ehEventoQuest: false,
      tagMapa: en.tagEn,
      selo: en.seloEn,
      titulo: en.tituloEn,
      linhas: en.linhasEn,
      opcoes: [
        { letra: 'A', rotulo: en.rotuloAEn, detalhe: en.detalheAEn },
        { letra: 'B', rotulo: en.rotuloBEn, detalhe: en.detalheBEn },
        { letra: 'C', rotulo: en.rotuloCEn, detalhe: en.detalheCEn },
      ],
    });
  }

  return Object.freeze({
    id: template.id,
    categoria: template.categoria,
    ehEventoQuest: false,
    tagMapa: template.categoria === 'SOS' ? 'SOS' : template.categoria === 'PERIGO' ? 'PERIGO' : 'EXPLOR',
    selo: template.categoria,
    titulo: template.nome ?? template.id.replace(/_/g, ' '),
    linhas: [
      `SINAL DETECTADO NA BOIA (${template.categoria}).`,
      `REQUISITO AZUL: ${template.requisitoBlueOption ?? 'NENHUM'}.`,
      'ESCOLHA SUA ABORDAGEM TÁTICA:',
    ],
    opcoes: [
      { letra: 'A', rotulo: '[A] ABORDAGEM PADRÃO (50% / 50%)', detalhe: 'RESOLUÇÃO DETERMINÍSTICA POR SEED DA PARTIDA' },
      { letra: 'B', rotulo: '[B] OPÇÃO AZUL ESPECIALIZADA', detalhe: String(template.requisitoBlueOption ?? '').slice(0, 64) },
      { letra: 'C', rotulo: template.categoria === 'PERIGO' ? '[C] BLOQUEADO EM PERIGO' : '[C] RECUAR EM SEGURANÇA', detalhe: 'RETORNA À CARTA NÁUTICA' },
    ],
  });
}

/**
 * Gate de Qualidade Steam: audita recursivamente strings visíveis de um ViewModel/Catálogo
 * garantindo ZERO reticências de truncamento (`...` ou `…`) e cumprimento dos tetos de layout!
 */
export function auditarZeroTruncamentoViewModel(alvo, limitesPorCampo = {}) {
  const violacoes = [];
  const limitesPadrao = {
    siglaHudPt: 8,
    siglaHudEn: 8,
    nomeCurtoCardPt: 18,
    nomeCurtoCardEn: 18,
    papelCurtoPt: 24,
    papelCurtoEn: 24,
    armaResumoCardPt: 18,
    armaResumoCardEn: 18,
    cardPt: 18,
    cardEn: 18,
    resumoPt: 21,
    resumoEn: 21,
    nomeCardPt: 18,
    nomeCardEn: 18,
    resumoCurtoPt: 21,
    resumoCurtoEn: 21,
    tituloPt: 66,
    tituloEn: 66,
    rotuloAPt: 56,
    rotuloAEn: 56,
    rotuloBPt: 56,
    rotuloBEn: 56,
    rotuloCPt: 56,
    rotuloCEn: 56,
    detalheAPt: 68,
    detalheAEn: 68,
    detalheBPt: 68,
    detalheBEn: 68,
    detalheCPt: 68,
    detalheCEn: 68,
    ...limitesPorCampo,
  };

  function visitar(no, caminho) {
    if (no === null || no === undefined) return;
    if (typeof no === 'string') {
      if (no.includes('...') || no.includes('…')) {
        violacoes.push({ caminho, motivo: 'RETICENCIAS_TRUNCAMENTO', valor: no });
      }
      const nomeChave = caminho.split('.').pop();
      const teto = limitesPadrao[nomeChave];
      if (teto !== undefined && no.length > teto) {
        violacoes.push({ caminho, motivo: `ESTOURO_LIMITE_${teto}`, comprimento: no.length, valor: no });
      }
      return;
    }
    if (Array.isArray(no)) {
      for (let i = 0; i < no.length; i += 1) {
        visitar(no[i], `${caminho}[${i}]`);
      }
      return;
    }
    if (typeof no === 'object') {
      for (const [k, v] of Object.entries(no)) {
        visitar(v, caminho ? `${caminho}.${k}` : k);
      }
    }
  }

  visitar(alvo, 'raiz');
  return congelarI18n({
    aprovado: violacoes.length === 0,
    totalViolacoes: violacoes.length,
    violacoes,
  });
}
