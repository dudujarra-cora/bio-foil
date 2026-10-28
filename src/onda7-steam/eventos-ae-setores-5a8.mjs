/**
 * ONDA 7 (STEAM EDITION) — 45 Eventos Autorais dos Setores 5 a 8 + Motor Unificado de 100 Eventos Sem Repetição & Quests
 * Dono Único (Lei N5): src/onda7-steam/eventos-ae-setores-5a8.mjs
 *
 * Biomas cobertos:
 *  - Setor 5: Fossa da Escuridão Bioluminescente (águas turvas, cefalópodes gigantes, furtividade)
 *  - Setor 6: Mar Industrial de Chuva Ácida (refinarias tóxicas, corrosão no Foil, comboios químicos)
 *  - Setor 7: Chaminés Hidrotermais Abissais (fendas vulcânicas, corrosão em Touchdown, leviatãs térmicos)
 *  - Setor 8: Vanguarda da Draga Continental (bloqueio final, postos aliados de suprimento, escoltas de elite)
 *
 * Total Canônico Steam AE: 17 (GDD 4.5.A) + 38 (S1..S4) + 45 (S5..S8) = 100 Eventos Únicos Sem Repetição na Run!
 * Módulo 100% puro e isomórfico (0 imports Node.js, 0 structuredClone).
 */
import {
  CATALOGO_TEMPLATES_EVENTOS_45A,
  VELOCIDADE_FRENTE_CORPORATIVA_MN_H,
  extrairKitDaNave,
} from '../onda4-mapa/eventos-nos.mjs';
import { CURVA_SAQUE_SETORIAL_56C } from '../onda3-inimigos/abordagem-vitoria.mjs';
import { streamEventoOpcaoA, streamSorteioTemplates } from '../onda1-fisica/hash32-streams.mjs';
import { kitCumpreRequisitoBlueOption } from '../oraculos-referencia.mjs';
import { LISTA_42_EVENTOS_S1A4 } from './eventos-ae-setores-1a4.mjs';

function congelarEv(v) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return Object.freeze(v.map(congelarEv));
  const o = {};
  for (const k of Object.keys(v)) o[k] = congelarEv(v[k]);
  return Object.freeze(o);
}

const ev = (spec) => congelarEv(spec);

export const EVENTOS_AE_SETORES_5A8_PARTE1 = congelarEv([
  // ==================== SETOR 5: FOSSA BIOLUMINESCENTE (12 EVENTOS + QUEST 5) ====================
  ev({
    id: 'AE_S5_SOS_ORACULO_CEFALOPODE',
    setorAlvo: 5,
    categoria: 'SOS',
    tagMapaPt: 'ORÁCULO',
    tagMapaEn: 'ORACLE',
    seloPt: 'LULA ANCIÃ',
    seloEn: 'ELDER SQUID',
    tituloPt: 'ORÁCULO CEFALÓPODE CAÇADO POR SUBMARINO DE SONAR',
    tituloEn: 'CEPHALOPOD ORACLE HUNTED BY SONAR SUBMARINE',
    linhasPt: [
      'UMA LULA GIGANTE SAPIENTE FOGE DE PULSOS DE SONAR ATIVO.',
      'ELA CONHECE A ROTA PARA O TEMPLO SOMBRA-ABISSAL OCULTO.',
      'DECIDA SE CEGA O CAÇADOR OU ENFRENTA O SUBMARINO:',
    ],
    linhasEn: [
      'A SAPIENT GIANT SQUID FLEES ACTIVE MILITARY SONAR PINGS.',
      'IT KNOWS THE HIDDEN WAY TO THE ABYSSAL SHADOW SHRINE.',
      'CHOOSE HOW TO SHIELD THE ORACLE:',
    ],
    rotuloAPt: '[A] ENGAJAR O SUBMARINO CAÇADOR NA FOSSA',
    detalheAPt: 'COMBATE CONTRA BARCO | SALVA O ORÁCULO SE VENCER',
    rotuloAEn: '[A] INTERCEPT THE HUNTER SUBMARINE',
    detalheAEn: 'SHIP COMBAT | PROTECTS THE ORACLE IN THE DARK',
    rotuloBPt: '[B] CEGAR COM TINTA FURTIVA / BOLSA DE TINTA',
    detalheBPt: 'BIOMASSA CIRÚRGICA + PLANTA [QUEST] ALTAR SOMBRA',
    rotuloBEn: '[B] SHROUD IN CLOAKING INK / ABYSSAL INK SAC',
    detalheBEn: 'SURGICAL BIO + MARKS [QUEST] SHADOW SHRINE',
    rotuloCPt: '[C] APAGAR LUZES E DEIXAR PASSAR',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] DOUSE BIOLIGHTS AND SLIP AWAY',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'SISTEMA_OU_ORGAO', sistema: 'Glândula de Tinta Furtiva', nivelMin: 1, orgaoIds: ['BOLSA_TINTA_ABISSAL'], descPt: 'Tinta Furtiva OU Bolsa Tinta', descEn: 'Cloaking Ink OR Ink Sac' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 1, termoMoeda: 'Biomassa_{bruta}(S)', plantaQuestId: 'AE_Q5_ALTAR_SOMBRA_ABISSAL' },
      p1: { tipo: 'COMBATE_BARCO', danoCasco: 0 },
    },
    recompensaBlueOption: { danoCasco: 0, termoMoeda: 'Biomassa_{cirúrgica}(S)', plantaQuestId: 'AE_Q5_ALTAR_SOMBRA_ABISSAL' },
  }),
  ev({
    id: 'AE_Q5_ALTAR_SOMBRA_ABISSAL',
    setorAlvo: 5,
    ehEventoQuest: true,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'QUEST!',
    tagMapaEn: 'QUEST!',
    seloPt: 'QUEST SOMBRA',
    seloEn: 'SHADOW QUEST',
    tituloPt: '[QUEST] SANTUÁRIO NEURAL DA SOMBRA-ABISSAL',
    tituloEn: '[QUEST] NEURAL SANCTUARY OF THE ABYSSAL SHADOW',
    linhasPt: [
      'GUIADO PELO ORÁCULO, VOCÊ ADENTRA UMA CAVERNA DE TINTA ESTÁTICA.',
      'TECIDOS DE PRÉ-IGNIÇÃO E FEIXES CIRÚRGICOS REPOUSAM NO ALTAR.',
      'ESCOLHA A RELÍQUIA ABISSAL PARA SUA BIO-NAVE:',
    ],
    linhasEn: [
      'GUIDED BY THE ORACLE, YOU ENTER A CAVERN OF SUSPENDED INK.',
      'NEURAL GRAFTS AND SURGICAL LANCES REST UPON THE ALTAR.',
      'CLAIM ONE ABYSSAL RELIC FOR YOUR VESSEL:',
    ],
    rotuloAPt: '[A] RECOLHER ÓRGÃO SIMBIÓTICO + REVELAR MAPA',
    detalheAPt: '+1 ÓRGÃO INTACTO + REVELA SETOR + BIOMASSA',
    rotuloAEn: '[A] CLAIM SYMBIOTIC ORGAN + REVEAL CHART',
    detalheAEn: '+1 INTACT ORGAN + REVEALS MAP + BIOMASS',
    rotuloBPt: '[B] SINTONIZAR FEIXE CIRÚRGICO (CÓRTEX NV.3+)',
    detalheBPt: '+1 ARMA + REPARA +6 HP + BIOMASSA CIRÚRGICA',
    rotuloBEn: '[B] ATTUNE SURGICAL WEAPON (CORTEX LV.3+)',
    detalheBEn: '+1 WEAPON + REPAIR +6 HP + SURGICAL BIOMASS',
    rotuloCPt: '[C] DRENAR RESERVA DE COMBUSTÍVEL ABISSAL (+5)',
    detalheCPt: '+5 COMBUSTÍVEL + 2 MUNIÇÃO SEM PESO EXTRA',
    rotuloCEn: '[C] SIPHON ABYSSAL FUEL RESERVES (+5 FUEL)',
    detalheCEn: '+5 FUEL + 2 AMMO ZERO EXTRA WEIGHT',
    reqBlue: { tipo: 'SISTEMA_NIVEL', sistema: 'Córtex de Navegação', nivelMin: 3, descPt: 'Córtex Nv.3+', descEn: 'Cortex Lv.3+' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, orgaoIntacto: 1, revelaMapaSetorial: true, termoMoeda: 'Biomassa_{bruta}(S)' },
      p1: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, orgaoIntacto: 1, revelaMapaSetorial: true, termoMoeda: 'Biomassa_{bruta}(S)' },
    },
    recompensaBlueOption: { danoCasco: 0, armaRecuperada: 1, reparaCascoHp: 6, termoMoeda: 'Biomassa_{cirúrgica}(S)' },
  }),
  ev({
    id: 'AE_S5_EXP_MEDUSA_COLOSSAL_MORTA',
    setorAlvo: 5,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'MEDUSA',
    tagMapaEn: 'MEDUSA',
    seloPt: 'MEDUSA GIGANTE',
    seloEn: 'GIANT MEDUSA',
    tituloPt: 'CARCAÇA FLUTUANTE DE MEDUSA-IMPERATRIZ LUMINESCENTE',
    tituloEn: 'DRIFTING BELL OF AN EMPRESS BIOLUMINESCENT JELLY',
    linhasPt: [
      'A UMBRELA TRANSLÚCIDA DE 120 METROS AINDA PULSA ELETRICIDADE.',
      'NÚCLEOS DE BIOMASSA PURA BRILHAM ENTRE FILAMENTOS VENENOSOS.',
      'DEFINA A TÉCNICA DE DISSECAÇÃO:',
    ],
    linhasEn: [
      'THE 120-METER TRANSLUCENT BELL STILL TWITCHES WITH VOLTS.',
      'PURE BIOMASS CORES GLOW AMID VENOMOUS FILAMENTS.',
      'CHOOSE YOUR DISSECTION METHOD:',
    ],
    rotuloAPt: '[A] CORTAR UMBRELA EXTERNAMENTE',
    detalheAPt: '50% BIOMASSA CIRÚRGICA | 50% TOXINA (-3 HP) + BIO',
    rotuloAEn: '[A] SLICE OUTER BELL FROM RANGE',
    detalheAEn: '50% SURGICAL BIO | 50% VENOM LASH (-3 HP) + BIO',
    rotuloBPt: '[B] EXTRAIR COM BIO-FEIXE / GLÂNDULA BAIACU',
    detalheBPt: '+1 ÓRGÃO INTACTO + BIOMASSA CIRÚRGICA LIMPA',
    rotuloBEn: '[B] SURGICAL HARVEST VIA BIO-BEAM / PUFFER GLAND',
    detalheBEn: '+1 INTACT ORGAN + CLEAN SURGICAL BIOMASS',
    rotuloCPt: '[C] CONTORNAR OS FILAMENTOS',
    detalheCPt: 'RETORNA AO MAPA EM SEGURANÇA',
    rotuloCEn: '[C] STEER AROUND FILAMENTS',
    detalheCEn: 'RETURN TO CHART SAFELY',
    reqBlue: { tipo: 'ARMA_OU_ORGAO', armaIds: ['FEIXE_NEUROTOXICO_BIO'], orgaoIds: ['GLANDULA_BAIACU'], descPt: 'Feixe Neurotóxico OU Glândula Baiacu', descEn: 'Anti-Bio Beam OR Puffer Gland' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, termoMoeda: 'Biomassa_{cirúrgica}(S)' },
      p1: { tipo: 'RECOMPENSA_COM_CUSTO', danoCasco: 3, termoMoeda: 'Biomassa_{bruta}(S)' },
    },
    recompensaBlueOption: { danoCasco: 0, orgaoIntacto: 1, termoMoeda: 'Biomassa_{cirúrgica}(S)' },
  }),
  ev({
    id: 'AE_S5_PER_ISCA_ABISSAL_ANGUILLA',
    setorAlvo: 5,
    categoria: 'PERIGO',
    tagMapaPt: 'ISCA!',
    tagMapaEn: 'LURE!',
    seloPt: 'FALSA LUZ SOS',
    seloEn: 'ANGLER LURE',
    tituloPt: 'FALSO SINAL LUMINOSO — EMBOSCADA NA ESCURIDÃO TOTAL!',
    tituloEn: 'FALSE BIOLUMINESCENT BEACON — DARKNESS AMBUSH!',
    linhasPt: [
      'A BOIA DE SOCORRO ERA A ANTENA DE UM PREDADOR ABISSAL!',
      'NA ESCURIDÃO PROFUNDA, SEU SONAR INTERNO FICA CEGO!',
      'PREPARE AS ARMAS PARA O ATAQUE IMEDIATO:',
    ],
    linhasEn: [
      'THE DISTRESS LIGHT WAS AN ABYSSAL PREDATOR LURE!',
      'PITCH DARKNESS JAMS INTERNAL SONAR TELEMETRY!',
      'WEAPONS FREE — BRACE FOR IMPACT:',
    ],
    rotuloAPt: '[A] REVIDAR NA ESCURIDÃO (SONAR CEGO)',
    detalheAPt: 'COMBATE OBRIGATÓRIO | SALAS DO ALVO OCULTAS',
    rotuloAEn: '[A] FIGHT BLIND IN THE ABYSS',
    detalheAEn: 'MANDATORY COMBAT | TARGET ORGANS OBSCURED',
    rotuloBPt: '[B] ILUMINAR COM OLHO SONAR / PULSO BIO-ÍON',
    detalheBPt: 'VISÃO COMPLETA DO MONSTRO + +2 MUNIÇÃO PÓS-LUTA',
    rotuloBEn: '[B] ILLUMINATE VIA SONAR EYE / BIO-ION PULSE',
    detalheBEn: 'FULL TARGET VISIBILITY + +2 POST-COMBAT AMMO',
    rotuloCPt: '[C] MANDÍBULAS BLOQUEIAM O SALTO',
    detalheCPt: 'IMPOSSÍVEL RECUAR SEM ENGAJAR',
    rotuloCEn: '[C] JAWS BLOCK JUMP DRIVE',
    detalheCEn: 'MUST ENGAGE TO BREAK FREE',
    reqBlue: { tipo: 'ARMA_OU_ORGAO', armaIds: ['CANHAO_PULSO_BIOELETRICO_I', 'BOMBARDEIRO_IONICO_PESADO'], orgaoIds: ['OLHO_SONAR_ABISSAL'], descPt: 'Pulso Iônico OU Olho Sonar', descEn: 'Ion Weapon OR Sonar Eye' },
    opcaoA: {
      p0: { tipo: 'COMBATE_MONSTRO', canalVisibilidade: 'NEGADO_SONAR', danoCasco: 0 },
      p1: { tipo: 'COMBATE_MONSTRO', canalVisibilidade: 'NEGADO_SONAR', danoCasco: 0 },
    },
    recompensaBlueOption: { danoCasco: 0, canalVisibilidade: 'VISIVEL', municaoPosLuta: 2, termoMoeda: null },
  }),
  ev({
    id: 'AE_S5_EXP_CABO_TRANSOCEANICO',
    setorAlvo: 5,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'FIBRA',
    tagMapaEn: 'FIBER',
    seloPt: 'CABO DADOS',
    seloEn: 'TRUNK CABLE',
    tituloPt: 'CABO TRONCO DE DADOS DA FROTA CORPORATIVA',
    tituloEn: 'CORPORATE FLEET TRANSOCEANIC DATA TRUNK',
    linhasPt: [
      'UM CABO BLINDADO TRANSMITE ORDENS LOGÍSTICAS DA DRAGA NO FUNDO.',
      'INTERCEPTAR O SINAL PODE REVELAR TODO O SETOR E COMBOIOS.',
      'COMO GRAMPEAR A LINHA MILITAR?',
    ],
    linhasEn: [
      'AN ARMORED TRUNK LINE CARRIES DREDGE LOGISTICS ORDERS.',
      'TAPPING IT CAN EXPOSE EVERY BEACON IN THIS SECTOR.',
      'HOW WILL YOU SPLICE THE MILITARY LINE?',
    ],
    rotuloAPt: '[A] PERFURAR BLINDAGEM E COPIAR PACOTES',
    detalheAPt: '50% REVELA MAPA + SUCATA | 50% SUBMARINO RESPONDE',
    rotuloAEn: '[A] SPLICE ARMOR JACKET DIRECTLY',
    detalheAEn: '50% REVEALS MAP + SCRAP | 50% PATROL SUB RESPONDS',
    rotuloBPt: '[B] INDUÇÃO PASSIVA COM ARRAIA + POLVO',
    detalheBPt: 'REVELA MAPA + SUCATA CAPTURA + 3 CMB SEM ALARME',
    rotuloBEn: '[B] PASSIVE INDUCTION VIA RAY + OCTOPUS',
    detalheBEn: 'REVEALS MAP + CAPTURE SCRAP + 3 FUEL SILENTLY',
    rotuloCPt: '[C] NÃO TOCAR NO CABO MILITAR',
    detalheCPt: 'MANTÉM SILÊNCIO E SEGUE VIAGEM',
    rotuloCEn: '[C] LEAVE TRUNK CABLE UNTOUCHED',
    detalheCEn: 'MAINTAIN STEALTH AND MOVE ON',
    reqBlue: { tipo: 'DUPLA_ESPECIE', esp1: 'ARRAIA', esp2: 'POLVO', descPt: 'Arraia + Polvo a bordo', descEn: 'Electric Ray + Octopus crew' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, revelaMapaSetorial: true, termoMoeda: 'Sucata_{bruta}(S)' },
      p1: { tipo: 'COMBATE_BARCO', danoCasco: 0 },
    },
    recompensaBlueOption: { danoCasco: 0, revelaMapaSetorial: true, combustivel: 3, termoMoeda: 'Sucata_{captura}(S)' },
  }),
  ev({
    id: 'AE_S5_SOS_SONDA_FURTIVA_CAIDA',
    setorAlvo: 5,
    categoria: 'SOS',
    tagMapaPt: 'FURTIVO',
    tagMapaEn: 'STEALTH',
    seloPt: 'CAÇA FURTIVO',
    seloEn: 'STEALTH CRAFT',
    tituloPt: 'PROTÓTIPO FURTIVO SIMBIÓTICO À DERIVA NO ABISMO',
    tituloEn: 'SYMBIOTIC STEALTH PROTOTYPE ADRIFT IN THE ABYSS',
    linhasPt: [
      'UMA NAVE IRMÃ SOMBRA-ABISSAL SOFREU FALHA NO CORAÇÃO ELÉTRICO.',
      'A ÚNICA TRIPULANTE SOBREVIVENTE PEDE RECARGA OU RESGATE.',
      'ESCOLHA O PROTOCOLO DE SOCORRO:',
    ],
    linhasEn: [
      'A SISTER ABYSSAL-SHADOW VESSEL SUFFERED HEART FAILURE.',
      'ITS LONE SURVIVOR PLEADS FOR A JUMP-START OR RESCUE.',
      'CHOOSE YOUR RELIEF ACTION:',
    ],
    rotuloAPt: '[A] RECOLHER TRIPULANTE E DESMONTAR CHASSI',
    detalheAPt: '+1 TRIPULANTE + SUCATA BRUTA',
    rotuloAEn: '[A] RESCUE SURVIVOR & SALVAGE HULL',
    detalheAEn: '+1 CREWMATE + RAW SCRAP',
    rotuloBPt: '[B] RECARREGAR COM SINAPSE / REATOR 9+ BARRAS',
    detalheBPt: 'PILOTO DOA +1 ARMA + REPARA +5 HP + BIOMASSA',
    rotuloBEn: '[B] JUMP-START VIA PRE-IGNITER / 9+ REACTOR',
    detalheBEn: 'PILOT GIFTS +1 WEAPON + REPAIR +5 HP + BIOMASS',
    rotuloCPt: '[C] SINALIZAR ROTA E PROSSEGUIR',
    detalheCPt: 'RETORNA AO MAPA DO SETOR',
    rotuloCEn: '[C] MARK POSITION AND MOVE ON',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'REATOR_OU_ORGAO', barrasReatorMin: 9, orgaoIds: ['SINAPSE_PRE_IGNICAO', 'ELETRO_PLACA_ARRAIA'], descPt: 'Reator 9+ OU Pré-Ignição/Eletro', descEn: '9+ Reactor OR Pre-Igniter/Electro' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, recrutaTripulante: 1, termoMoeda: 'Sucata_{bruta}(S)' },
      p1: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, recrutaTripulante: 1 },
    },
    recompensaBlueOption: { danoCasco: 0, armaRecuperada: 1, reparaCascoHp: 5, termoMoeda: 'Biomassa_{cirúrgica}(S)' },
  }),
  ev({
    id: 'AE_S5_EXP_CHUVA_NEVE_MARINHA',
    setorAlvo: 5,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'PLÂNCTN',
    tagMapaEn: 'SNOW',
    seloPt: 'NEVE MARINHA',
    seloEn: 'MARINE SNOW',
    tituloPt: 'CORTINA NUTRITIVA DE NEVE MARINHA LUMINESCENTE',
    tituloEn: 'LUMINESCENT NUTRIENT CURTAIN OF MARINE SNOW',
    linhasPt: [
      'FLOCOS ORGÂNICOS CAEM DAS CAMADAS SUPERIORES COMO NEVE AZUL.',
      'FILTRAR O FLUXO ALIMENTA O CASCO E SINTETIZA BIOCOMBUSTÍVEL.',
      'ESCOLHA A ABERTURA DAS VÁLVULAS:',
    ],
    linhasEn: [
      'ORGANIC FLAKES DRIFT DOWNWARD LIKE GLOWING BLUE SNOW.',
      'FILTERING THE FALL NOURISHES CHITIN AND BIO-FUEL.',
      'CHOOSE YOUR VALVE INTAKE:',
    ],
    rotuloAPt: '[A] ABRIR VÁLVULAS DE CAPTAÇÃO PADRÃO',
    detalheAPt: 'BIOMASSA BRUTA + 2 COMBUSTÍVEL + REPARA +3 HP',
    rotuloAEn: '[A] OPEN STANDARD INTAKE VALVES',
    detalheAEn: 'RAW BIOMASS + 2 FUEL + REPAIR +3 HULL HP',
    rotuloBPt: '[B] SINTETIZAR MUNIÇÃO VIVA (GÂNGLIO MUNIÇÃO)',
    detalheBPt: 'BIOMASSA CIRÚRGICA + 4 MUNIÇÃO + 3 COMBUSTÍVEL',
    rotuloBEn: '[B] SYNTHESIZE ORDNANCE (AMMO GANGLION)',
    detalheBEn: 'SURGICAL BIOMASS + 4 AMMO + 3 FUEL',
    rotuloCPt: '[C] ATRAVESSAR EM VELOCIDADE DE CRUZEIRO',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] CRUISE THROUGH WITHOUT STOPPING',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'ORGAO_QUALQUER', orgaoIds: ['GANGLIO_RECICLADOR_MUNICAO', 'ENZIMA_DIGESTORA_SUCATA'], descPt: 'Gânglio Munição OU Enzima Sucata', descEn: 'Ammo Ganglion OR Scrap Enzyme' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, combustivel: 2, reparaCascoHp: 3, termoMoeda: 'Biomassa_{bruta}(S)' },
      p1: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, combustivel: 2, reparaCascoHp: 2, termoMoeda: 'Biomassa_{bruta}(S)' },
    },
    recompensaBlueOption: { danoCasco: 0, municao: 4, combustivel: 3, termoMoeda: 'Biomassa_{cirúrgica}(S)' },
  }),
  ev({
    id: 'AE_S5_EXP_CEMITERIO_BALEIAS',
    setorAlvo: 5,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'OSSADA',
    tagMapaEn: 'OSSUARY',
    seloPt: 'QUEDA LEVIATÃ',
    seloEn: 'WHALE FALL',
    tituloPt: 'ECOSSISTEMA DE OSSADA DE LEVIATÃ NO FUNDO ABISSAL',
    tituloEn: 'LEVIATHAN WHALE-FALL ECOSYSTEM ON ABYSSAL PLAIN',
    linhasPt: [
      'COSTELAS COLOSSAIS SUSTENTAM VERMES SIMBIÓTICOS E DENTES PUROS.',
      'CARANGUEJOS NECRÓFAGOS PROTEGEM A MEDULA CENTRAL.',
      'COMO COLHER OS RECURSOS DA OSSADA?',
    ],
    linhasEn: [
      'COLOSSAL RIBS CRADLE SYMBIOTIC WORMS AND SERRATED FANGS.',
      'SCAVENGER CRABS GUARD THE CENTRAL MARROW.',
      'HOW WILL YOU HARVEST THE OSSUARY?',
    ],
    rotuloAPt: '[A] RECOLHER OSSOS E BIOMASSA NA BORDA',
    detalheAPt: '50% BIOMASSA CIRÚRGICA | 50% PREDADOR ATACA',
    rotuloAEn: '[A] GATHER OUTER BONES AND BIOMASS',
    detalheAEn: '50% SURGICAL BIO | 50% ABYSSAL CRAB ATTACKS',
    rotuloBPt: '[B] EXTRAIR MEDULA COM SANGUESSUGA / DENTE',
    detalheBPt: '+1 ÓRGÃO INTACTO + BIOMASSA CIRÚRGICA + +4 HP',
    rotuloBEn: '[B] EXTRACT MARROW VIA LEECH / LEVIATHAN FANG',
    detalheBEn: '+1 INTACT ORGAN + SURGICAL BIO + +4 HULL HP',
    rotuloCPt: '[C] RESPEITAR O TÚMULO ABISSAL',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] RESPECT THE ABYSSAL GRAVE',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'ORGAO_QUALQUER', orgaoIds: ['BOLSA_SIMBIONTE_SANGUESSUGA', 'DENTE_LEVIATA', 'MEDULA_REGENERATIVA_CORAL'], descPt: 'Sanguessuga / Dente / Medula Coral', descEn: 'Leech / Fang / Coral Marrow' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, termoMoeda: 'Biomassa_{cirúrgica}(S)' },
      p1: { tipo: 'COMBATE_MONSTRO', danoCasco: 0 },
    },
    recompensaBlueOption: { danoCasco: 0, orgaoIntacto: 1, reparaCascoHp: 4, termoMoeda: 'Biomassa_{cirúrgica}(S)' },
  }),
  ev({
    id: 'AE_S5_SOS_SONDA_PROFUNDA_PRESA',
    setorAlvo: 5,
    categoria: 'SOS',
    tagMapaPt: 'ABISSAL',
    tagMapaEn: 'TRENCH',
    seloPt: 'SONDA PRESA',
    seloEn: 'TRAPPED RIG',
    tituloPt: ' CÁPSULA DE CARTÓGRAFOS PRESA EM FENDA ABISSAL',
    tituloEn: 'CARTOGRAPHER POD PINNED IN ABYSSAL CREVASSE',
    linhasPt: [
      'CARTÓGRAFOS LIVRES CAÍRAM NUMA GARGANTA DE ALTA PRESSÃO.',
      'ELES TROCAM COMBUSTÍVEL REFINADO POR REBOQUE ATÉ A ZONA RASA.',
      'DECIDA O REBOQUE:',
    ],
    linhasEn: [
      'FREE CARTOGRAPHERS SLID INTO A CRUSH-DEPTH CREVASSE.',
      'THEY OFFER REFINED FUEL IN EXCHANGE FOR A TOW UPWARD.',
      'CHOOSE YOUR TOWING PROTOCOL:',
    ],
    rotuloAPt: '[A] PUXAR COM CABO E FORÇAR TURBINA',
    detalheAPt: '50% +4 CMB + SUCATA | 50% ROCHA RASPA (-2 HP) + 3 CMB',
    rotuloAEn: '[A] HAUL WITH CABLE AT FULL POWER',
    detalheAEn: '50% +4 FUEL + SCRAP | 50% WALL SCRAPE (-2 HP) + 3 FUEL',
    rotuloBPt: '[B] FLUTUAR COM VESÍCULA HIPERBÁRICA / BEXIGA',
    detalheBPt: '+5 COMBUSTÍVEL + REVELA MAPA + SUCATA LIMPA',
    rotuloBEn: '[B] BUOY POD VIA HYPERBARIC VESICLE / BLADDER',
    detalheBEn: '+5 FUEL + REVEALS MAP + CLEAN SCRAP',
    rotuloCPt: '[C] NÃO ARRISCAR DESCIDA NA FENDA',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] DO NOT RISK CRUSH DEPTH',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'ORGAO_QUALQUER', orgaoIds: ['VESICULA_HIPERBARICA', 'BEXIGA_ALTA_PRESSAO', 'ALETA_ESTABILIZADORA_FOIL'], descPt: 'Vesícula / Bexiga / Aleta Foil', descEn: 'Vesicle / Bladder / Foil Fin' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, combustivel: 4, termoMoeda: 'Sucata_{bruta}(S)' },
      p1: { tipo: 'RECOMPENSA_COM_CUSTO', danoCasco: 2, combustivel: 3 },
    },
    recompensaBlueOption: { danoCasco: 0, combustivel: 5, revelaMapaSetorial: true, termoMoeda: 'Sucata_{bruta}(S)' },
  }),
  ev({
    id: 'AE_S5_EXP_ESPECIME_MIMETICO',
    setorAlvo: 5,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'MIMÉTIC',
    tagMapaEn: 'MIMIC',
    seloPt: 'ECO DUPLO',
    seloEn: 'SONAR ECHO',
    tituloPt: 'ECO DE SONAR IDÊNTICO À SUA PRÓPRIA BIO-NAVE',
    tituloEn: 'SONAR CONTACT MIRRORING YOUR OWN BIO-CRAFT',
    linhasPt: [
      'UM POLVO-MIMÉTICO GIGANTE IMITA A SILHUETA EXATA DO SEU CASCO!',
      'ELE PARECE TENTAR COMUNICAR PADRÕES DE LUZ CROMATÓFORA.',
      'COMO RESPONDER AO IMITADOR?',
    ],
    linhasEn: [
      'A GIANT MIMIC-OCTOPUS COPIES YOUR EXACT HULL SILHOUETTE!',
      'IT FLASHES CHROMATOPHORE PATTERNS ACROSS ITS SKIN.',
      'HOW DO YOU REPLY TO THE MIMIC?',
    ],
    rotuloAPt: '[A] PISCAR FARÓIS EM SEQUÊNCIA CALMA',
    detalheAPt: '50% +1 TRIPULANTE | 50% ASSUSTA E DEIXA BIOMASSA',
    rotuloAEn: '[A] FLASH RUNNING LIGHTS IN CALM RHYTHM',
    detalheAEn: '50% +1 CREWMATE | 50% FLEES LEAVING BIOMASS',
    rotuloBPt: '[B] RESPONDER COM POLVO OU TINTA FURTIVA',
    detalheBPt: '+1 TRIPULANTE + BIOMASSA CIRÚRGICA GARANTIDOS',
    rotuloBEn: '[B] ANSWER VIA OCTOPUS CREW / CLOAKING INK',
    detalheBEn: 'GUARANTEED +1 CREWMATE + SURGICAL BIOMASS',
    rotuloCPt: '[C] AFASTAR-SE SILENCIOSAMENTE',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] BACK AWAY QUIETLY',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'SISTEMA_OU_ESPECIE', sistema: 'Glândula de Tinta Furtiva', nivelMin: 1, especie: 'POLVO', descPt: 'Polvo OU Tinta Furtiva', descEn: 'Octopus OR Cloaking Ink' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, recrutaTripulante: 1 },
      p1: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, termoMoeda: 'Biomassa_{bruta}(S)' },
    },
    recompensaBlueOption: { danoCasco: 0, recrutaTripulante: 1, termoMoeda: 'Biomassa_{cirúrgica}(S)' },
  }),
  ev({
    id: 'AE_S5_EXP_DEPOSITO_TORPEDOS_ABISSAL',
    setorAlvo: 5,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'PAIOL',
    tagMapaEn: 'DEPOT',
    seloPt: 'PAIOL SECRETO',
    seloEn: 'BLACK DEPOT',
    tituloPt: 'SILO AUTOMÁTICO DE TORPEDOS DA FROTA SUBMARINA',
    tituloEn: 'AUTOMATED SUBMARINE FLEET TORPEDO SILO',
    linhasPt: [
      'UM SILO ESCONDIDO NO PLATÔ ABISSAL GUARDA OGIVAS E PEÇAS NAVAIS.',
      'SENSORES ÓPTICOS VERIFICAM ASSINATURA DE EMBARCAÇÃO ALIADA.',
      'ESCOLHA A ABORDAGEM:',
    ],
    linhasEn: [
      'A HIDDEN ABYSSAL SILO STORES WARHEADS AND NAVAL SPARES.',
      'OPTICAL SCANNERS QUERY FOR CORPORATE IFF TRANSPONDERS.',
      'CHOOSE YOUR APPROACH:',
    ],
    rotuloAPt: '[A] ARROMBAR COMPORTA EXTERNA E CORRER',
    detalheAPt: '50% +4 MUN + SUCATA | 50% SUBMARINO DE GUARDA ATACA',
    rotuloAEn: '[A] BREACH OUTER SILO DOOR AND GRAB',
    detalheAEn: '50% +4 AMMO + SCRAP | 50% GUARD SUB ATTACKS',
    rotuloBPt: '[B] FALSIFICAR SINAL COM SURTO IÔNICO II / CADEIA',
    detalheBPt: '+5 MUNIÇÃO + +1 ARMA NO PORÃO SEM COMBATE',
    rotuloBEn: '[B] SPOOF IFF VIA HEAVY ION / CHAIN EMITTER',
    detalheBEn: '+5 AMMO + +1 WEAPON IN HOLD WITHOUT FIGHT',
    rotuloCPt: '[C] IGNORAR O SILO VIGIADO',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] BYPASS GUARDED SILO',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'ARMA_QUALQUER', armaIds: ['BOMBARDEIRO_IONICO_PESADO', 'CANHAO_PULSO_BIOELETRICO_I', 'EMISSOR_RESSONANTE_CADEIA'], descPt: 'Arma Iônica OU Emissor Cadeia', descEn: 'Ion Weapon OR Chain Emitter' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, municao: 4, termoMoeda: 'Sucata_{bruta}(S)' },
      p1: { tipo: 'COMBATE_BARCO', danoCasco: 0 },
    },
    recompensaBlueOption: { danoCasco: 0, municao: 5, armaRecuperada: 1 },
  }),

  // ==================== SETOR 6: MAR INDUSTRIAL DE CHUVA ÁCIDA (11 EVENTOS + QUEST 6) ====================
  ev({
    id: 'AE_S6_SOS_REFINARIA_REBELDE',
    setorAlvo: 6,
    categoria: 'SOS',
    tagMapaPt: 'REFINAR',
    tagMapaEn: 'REFINRY',
    seloPt: 'TORRE QUÍMICA',
    seloEn: 'CHEM RIG',
    tituloPt: 'ENGENHEIROS AMOTINADOS EM PLATAFORMA DE NEUTRALIZAÇÃO',
    tituloEn: 'MUTINOUS ENGINEERS ON ACID-NEUTRALIZER RIG',
    linhasPt: [
      'OPERÁRIOS SABOTARAM UMA TORRE DE CHUVA ÁCIDA DA DRAGA!',
      'ELES GUARDAM A CHAVE DO COMBOIO QUÍMICO CENTRAL DO SETOR.',
      'AJUDE A DEFENDER A PLATAFORMA CONTRA A REPRESÁLIA:',
    ],
    linhasEn: [
      'WORKERS SABOTAGED A CORPORATE ACID-SEEDING PLATFORM!',
      'THEY HOLD ROUTING KEYS TO THE CENTRAL CHEMICAL CONVOY.',
      'HELP THEM HOLD THE RIG AGAINST RETALIATION:',
    ],
    rotuloAPt: '[A] LUTAR AO LADO DOS AMOTINADOS',
    detalheAPt: '50% SUCATA + PLANTA [QUEST] | 50% COMBATE CONTRA BARCO',
    rotuloAEn: '[A] STAND WITH THE MUTINEERS',
    detalheAEn: '50% SCRAP + MARKS [QUEST] | 50% SHIP COMBAT',
    rotuloBPt: '[B] PROTEGER TORRE COM BARREIRA NV.3+ / PLACAS',
    detalheBPt: 'SUCATA CAPTURA + +4 HP + PLANTA [QUEST] QUÍMICO',
    rotuloBEn: '[B] SHIELD RIG VIA BARRIER LV.3+ / ARMOR LV.2+',
    detalheBEn: 'CAPTURE SCRAP + +4 HP + MARKS [QUEST] CONVOY',
    rotuloCPt: '[C] DEIXAR A ZONA INDUSTRIAL',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] LEAVE THE INDUSTRIAL ZONE',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'SISTEMA_DUPLO_OU', sis1: 'Glândula de Barreira', nv1: 3, sis2: 'Placas de Blindagem', nv2: 2, descPt: 'Barreira Nv.3+ OU Blindagem Nv.2+', descEn: 'Barrier Lv.3+ OR Armor Lv.2+' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, termoMoeda: 'Sucata_{bruta}(S)', plantaQuestId: 'AE_Q6_COMBOIO_NEUTRALIZADOR' },
      p1: { tipo: 'COMBATE_BARCO', danoCasco: 0 },
    },
    recompensaBlueOption: { danoCasco: 0, reparaCascoHp: 4, termoMoeda: 'Sucata_{captura}(S)', plantaQuestId: 'AE_Q6_COMBOIO_NEUTRALIZADOR' },
  }),
  ev({
    id: 'AE_Q6_COMBOIO_NEUTRALIZADOR',
    setorAlvo: 6,
    ehEventoQuest: true,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'QUEST!',
    tagMapaEn: 'QUEST!',
    seloPt: 'QUEST ALCALIN',
    seloEn: 'ALKALI QUEST',
    tituloPt: '[QUEST] BARCAÇA- CISTERNA DE GEL ALCALINO E ÓRGÃOS',
    tituloEn: '[QUEST] ALKALINE GEL TANKER & BIO-CONTAINMENT BARGE',
    linhasPt: [
      'COM AS CHAVES DOS AMOTINADOS, VOCÊ INTERCEPTA A BARCAÇA SEM ALARME!',
      'GEL ALCALINO SELA TODAS AS FISSURAS DO CASCO E LIBERA OS TANQUES.',
      'ESCOLHA O SAQUE PRINCIPAL DA BARCAÇA:',
    ],
    linhasEn: [
      'USING THE MUTINEER KEYS, YOU BOARD THE BARGE UNOPPOSED!',
      'ALKALINE GEL SEALS EVERY CORRODED SEAM ACROSS YOUR HULL.',
      'SELECT YOUR PRIMARY PAYLOAD:',
    ],
    rotuloAPt: '[A] BANHO ALCALINO (+10 HP) + SUCATA CAPTURA',
    detalheAPt: 'REPARA +10 HP CASCO + SUCATA CAPTURA + 3 CMB',
    rotuloAEn: '[A] ALKALINE HULL BATH (+10 HP) + CAPTURE SCRAP',
    detalheAEn: 'REPAIR +10 HULL HP + CAPTURE SCRAP + 3 FUEL',
    rotuloBPt: '[B] LIBERTAR CÁPSULAS BIOLÓGICAS (OSMOSE / BAIACU)',
    detalheBPt: '+1 ÓRGÃO INTACTO + +1 TRIPULANTE + REPARA +6 HP',
    rotuloBEn: '[B] UNSEAL BIO-VAULT (REVERSE OSMOSIS / PUFFER)',
    detalheBEn: '+1 INTACT ORGAN + +1 CREW + REPAIR +6 HULL HP',
    rotuloCPt: '[C] CARREGAR MUNIÇÃO CORROSIVA (+5 MUN + SUC)',
    detalheCPt: '+5 MUNIÇÃO + SUCATA BRUTA',
    rotuloCEn: '[C] LOAD CORROSIVE ORDNANCE (+5 AMMO + SCRAP)',
    detalheCEn: '+5 AMMO + RAW SCRAP',
    reqBlue: { tipo: 'ESPECIE_OU_ORGAO', especie: 'BAIACU', qtdMin: 1, orgaoIds: ['BRANQUIA_OSMOSE_REVERSA'], descPt: 'Baiacu OU Osmose Reversa', descEn: 'Puffer Crew OR Reverse Osmosis' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, reparaCascoHp: 10, combustivel: 3, termoMoeda: 'Sucata_{captura}(S)' },
      p1: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, reparaCascoHp: 8, combustivel: 3, termoMoeda: 'Sucata_{captura}(S)' },
    },
    recompensaBlueOption: { danoCasco: 0, orgaoIntacto: 1, recrutaTripulante: 1, reparaCascoHp: 6 },
  }),
  ev({
    id: 'AE_S6_PER_TEMPESTADE_SULFURICA',
    setorAlvo: 6,
    categoria: 'PERIGO',
    tagMapaPt: 'ENXOFRE',
    tagMapaEn: 'SULFUR',
    seloPt: 'TEMP. ÁCIDA!',
    seloEn: 'ACID SQUALL!',
    tituloPt: 'TROMBA D’ÁGUA SULFÚRICA — CORROSÃO NO HIDROFÓLIO!',
    tituloEn: 'SULFURIC WATERSPOUT — FOIL ACID CORROSION!',
    linhasPt: [
      'CHUVA DE ÁCIDO CONCENTRADO DERRETE A QUITINA EXPOSTA NO AR!',
      'UM ARRASTÃO BLINDADO DA CORPORAÇÃO DISPARA ATRAVÉS DA NÉVOA!',
      'DECIDA COMO PROTEGER O CASCO NA LUTA:',
    ],
    linhasEn: [
      'CONCENTRATED ACID RAIN CORRODES EXPOSED CHITIN IN FLIGHT!',
      'AN ARMORED CORPORATE TRAWLER OPENS FIRE THROUGH THE FOG!',
      'CHOOSE YOUR PROTECTION PROTOCOL:',
    ],
    rotuloAPt: '[A] COMBATER SOB CHUVA SULFÚRICA ATIVA',
    detalheAPt: 'COMBATE OBRIGATÓRIO | CHUVA ÁCIDA (-1 HP / 15s NO FOIL)',
    rotuloAEn: '[A] ENGAGE UNDER ACTIVE SULFURIC RAIN',
    detalheAEn: 'MANDATORY COMBAT | ACID RAIN (-1 HP / 15s ON FOIL)',
    rotuloBPt: '[B] NEUTRALIZAR COM CRISTA QUITINA / MEDULA CORAL',
    detalheBPt: '45s IMUNE À CHUVA ÁCIDA + +2 MUNIÇÃO PÓS-LUTA',
    rotuloBEn: '[B] NEUTRALIZE VIA CHITIN CREST / CORAL MARROW',
    detalheBEn: '45s ACID IMMUNITY + +2 POST-COMBAT AMMO',
    rotuloCPt: '[C] TROMBA ÁCIDA IMPEDE SALTO DE FUGA',
    detalheCPt: 'SUPERE O ARRASTÃO PARA SAIR DA ZONA',
    rotuloCEn: '[C] WATERSPOUT BLOCKS JUMP VECTOR',
    detalheCEn: 'DEFEAT TRAWLER TO ESCAPE THE SQUALL',
    reqBlue: { tipo: 'ORGAO_QUALQUER', orgaoIds: ['CRISTA_REFRACAO_ACUSTICA', 'MEDULA_REGENERATIVA_CORAL'], descPt: 'Crista Quitina OU Medula Coral', descEn: 'Chitin Crest OR Coral Marrow' },
    opcaoA: {
      p0: { tipo: 'COMBATE_PERIGO_ACIDO', danoCasco: 0 },
      p1: { tipo: 'COMBATE_PERIGO_ACIDO', danoCasco: 0 },
    },
    recompensaBlueOption: { danoCasco: 0, neutralizaChuvaAcidaSeg: 45, municaoPosLuta: 2, termoMoeda: null },
  }),
  ev({
    id: 'AE_S6_EXP_DUTO_DESPEJO_QUIMICO',
    setorAlvo: 6,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'EFLUENT',
    tagMapaEn: 'OUTFALL',
    seloPt: 'DUTO QUÍMICO',
    seloEn: 'CHEM PIPE',
    tituloPt: ' COLETOR SUBMARINO DE SOLVENTES E CATALISADORES',
    tituloEn: 'SUBMARINE SOLVENT & CATALYST OUTFALL COLLECTOR',
    linhasPt: [
      'CATALISADORES DE PLATINA ACUMULAM-SE NAS GRADES DE UM DUTO.',
      'A CORROSÃO AO REDOR EXIGE DISSOLUÇÃO CONTROLADA OU GARRAS ANFÍBIAS.',
      'ESCOLHA O MÉTODO DE RECOLHIMENTO:',
    ],
    linhasEn: [
      'PLATINUM CATALYSTS CLOG THE GRATES OF AN INDUSTRIAL PIPE.',
      'ACIDIC SLUDGE DEMANDS CORROSIVE TOOLS OR CRAB SHELLS.',
      'SELECT YOUR EXTRACTION METHOD:',
    ],
    rotuloAPt: '[A] RASPAR GRADES COM O BRAÇO EXTERNO',
    detalheAPt: '50% SUCATA CAPTURA | 50% ÁCIDO CORRÓI (-3 HP) + SUC',
    rotuloAEn: '[A] SCRAPE GRATES WITH HULL MANIPULATOR',
    detalheAEn: '50% CAPTURE SCRAP | 50% ACID BURN (-3 HP) + SCRAP',
    rotuloBPt: '[B] ENVIAR CARANGUEJO OU MORTEIRO ÁCIDO',
    detalheBPt: 'SUCATA CAPTURA (+50%) + 3 COMBUSTÍVEL LIMPOS',
    rotuloBEn: '[B] DEPLOY CRAB CREW OR CORROSIVE MORTAR',
    detalheBEn: 'CAPTURE SCRAP (+50%) + 3 CLEAN FUEL',
    rotuloCPt: '[C] EVITAR O EFLUENTE TÓXICO',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] AVOID TOXIC OUTFALL',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'ESPECIE_OU_ARMA', especie: 'CARANGUEJO', qtdMin: 1, armaIds: ['MORTEIRO_ACIDO_CORROSIVO'], descPt: 'Caranguejo OU Morteiro Ácido', descEn: 'Crab Crew OR Acid Mortar' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, termoMoeda: 'Sucata_{captura}(S)' },
      p1: { tipo: 'RECOMPENSA_COM_CUSTO', danoCasco: 3, termoMoeda: 'Sucata_{bruta}(S)' },
    },
    recompensaBlueOption: { danoCasco: 0, combustivel: 3, termoMoeda: 'Sucata_{captura}(S)' },
  }),
  ev({
    id: 'AE_S6_EXP_MUTANTE_ACIDO_PACIFICO',
    setorAlvo: 6,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'LIMULUS',
    tagMapaEn: 'HORSESH',
    seloPt: 'FÓSSIL VIVO',
    seloEn: 'ACID LIMULUS',
    tituloPt: 'CARANGUEJO-FERRADURA GIGANTE ADAPTADO AO MAR ÁCIDO',
    tituloEn: 'GIANT HORSESHOE SYMBIONT ADAPTED TO ACID SEAS',
    linhasPt: [
      'SEU SANGUE AZUL DE COBRE NEUTRALIZA TOXINAS INSTANTANEAMENTE.',
      'A CRIATURA PERMITE COLHEITA SE NÃO FOR AMEAÇADA POR METAL QUENTE.',
      'ESCOLHA A INTERAÇÃO:',
    ],
    linhasEn: [
      'ITS COPPER-BLUE HEMOLYMPH NEUTRALIZES TOXINS INSTANTLY.',
      'IT PERMITS SYMBIOTIC BONDING IF APPROACHED GENTLY.',
      'CHOOSE HOW TO INTERACT:',
    ],
    rotuloAPt: '[A] COLHER AMOSTRA RÁPIDA DE HEMOLINFA',
    detalheAPt: '50% REPARA +6 HP + BIO | 50% CRIATURA REAGE E ATACA',
    rotuloAEn: '[A] DRAW QUICK HEMOLYMPH SAMPLE',
    detalheAEn: '50% REPAIR +6 HP + BIO | 50% CREATURE ATTACKS',
    rotuloBPt: '[B] ACALMAR COM BOMBA SIFÃO / BIO-FEIXE BAIXO',
    detalheBPt: 'REPARA +8 HP + +1 ÓRGÃO INTACTO + BIOMASSA',
    rotuloBEn: '[B] SOOTHE VIA OSMOTIC SIPHON / GILL PUMP LV.3+',
    detalheBEn: 'REPAIR +8 HP + +1 INTACT ORGAN + BIOMASS',
    rotuloCPt: '[C] DEIXAR O FÓSSIL VIVO SEGUIR',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] LET THE ANCIENT CREATURE PASS',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'SISTEMA_OU_ARMA', sistema: 'Bomba Branquial', nivelMin: 3, armaIds: ['BOMBA_SIFAO_OSMOTICO'], descPt: 'Branquial Nv.3+ OU Bomba Sifão', descEn: 'Gill Pump Lv.3+ OR Siphon Bomb' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, reparaCascoHp: 6, termoMoeda: 'Biomassa_{bruta}(S)' },
      p1: { tipo: 'COMBATE_MONSTRO', danoCasco: 0 },
    },
    recompensaBlueOption: { danoCasco: 0, reparaCascoHp: 8, orgaoIntacto: 1, termoMoeda: 'Biomassa_{cirúrgica}(S)' },
  }),
  ev({
    id: 'AE_S6_SOS_BARCACA_HOSPITAL_QUIMICA',
    setorAlvo: 6,
    categoria: 'SOS',
    tagMapaPt: 'LAZARET',
    tagMapaEn: 'MEDSHIP',
    seloPt: 'NAVE-HOSPITAL',
    seloEn: 'RELIEF SHIP',
    tituloPt: 'BARCAÇA-HOSPITAL HUMANITÁRIA RETIDA POR BLOQUEIO',
    tituloEn: 'HUMANITARIAN RELIEF BARGE HELD BY BLOCKADE CUTTER',
    linhasPt: [
      'MÉDICOS INDEPENDENTES TRATAM QUEIMADURAS QUÍMICAS DE REFUGIADOS.',
      'UMA CORVETA CONFISCOU SEUS GERADORES E SUPRIMENTOS.',
      'DECIDA SE ROMPE O BLOQUEIO:',
    ],
    linhasEn: [
      'INDEPENDENT MEDICS TREAT REFUGEES FOR ACID BURNS.',
      'A CORPORATE CORVETTE SEIZED THEIR POWER CELLS.',
      'CHOOSE WHETHER TO BREAK THE BLOCKADE:',
    ],
    rotuloAPt: '[A] ATACAR A CORVETA CONFISCADORA',
    detalheAPt: 'COMBATE CONTRA BARCO | LIBERTA A BARCAÇA',
    rotuloAEn: '[A] ATTACK THE CONFISCATING CORVETTE',
    detalheAEn: 'SHIP COMBAT | LIBERATE THE RELIEF BARGE',
    rotuloBPt: '[B] DESARMAR CORVETA COM LANÇA FOCAL / FLAK II',
    detalheBPt: 'CORVETA FOGE: +1 TRIPULANTE + REPARA +6 HP + SUC',
    rotuloBEn: '[B] DETER CORVETTE VIA FOCAL LANCE / FLAK MK.II',
    detalheBEn: 'CORVETTE FLEES: +1 CREW + REPAIR +6 HP + SCRAP',
    rotuloCPt: '[C] CONTORNAR O BLOQUEIO',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] SKIRT THE BLOCKADE',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'ARMA_QUALQUER', armaIds: ['LANCA_TERMICA_FOCAL', 'DISPERSOR_ABISSAL_MK2', 'RAJADA_HIDROPNEUMATICA_III'], descPt: 'Lança Focal / Flak II / Rajada III', descEn: 'Focal Lance / Flak II / Burst III' },
    opcaoA: {
      p0: { tipo: 'COMBATE_BARCO', danoCasco: 0 },
      p1: { tipo: 'COMBATE_BARCO', danoCasco: 0 },
    },
    recompensaBlueOption: { danoCasco: 0, recrutaTripulante: 1, reparaCascoHp: 6, termoMoeda: 'Sucata_{bruta}(S)' },
  }),
  ev({
    id: 'AE_S6_EXP_DRONE_COLETOR_DESGOVERNADO',
    setorAlvo: 6,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'COLETOR',
    tagMapaEn: 'HARVSTR',
    seloPt: 'DRONE PESADO',
    seloEn: 'SCRAP DRONE',
    tituloPt: 'MEGA-DRONE COLETOR CHEIO DE SUCATA COMPACTADA',
    tituloEn: 'RUNAWAY MEGA-HARVESTER PACKED WITH COMPACTED SCRAP',
    linhasPt: [
      'UM DRONE AUTÔNOMO GIRA COM O COMPARTIMENTO DE SUCATA ABARROTADO.',
      'SEU LASER DE CORTE DISPARA ALEATORIAMENTE NA NÉVOA AMARELA.',
      'ESCOLHA COMO ABATER OU HACKEAR O DRONE:',
    ],
    linhasEn: [
      'AN AUTONOMOUS HARVESTER SPINS WITH FULL SCRAP BINS.',
      'ITS MINING LASER SWEEPS WILDLY THROUGH YELLOW SMOG.',
      'HOW DO YOU CAPTURE ITS PAYLOAD?',
    ],
    rotuloAPt: '[A] DESTRUIR MOTOR DO DRONE A TIROS',
    detalheAPt: '50% SUCATA CAPTURA | 50% LASER CORTA (-3 HP) + SUC',
    rotuloAEn: '[A] SHOOT OUT DRONE THRUSTERS',
    detalheAEn: '50% CAPTURE SCRAP | 50% LASER GRAZE (-3 HP) + SCRAP',
    rotuloBPt: '[B] DESLIGAR COM PULSO ÍON / ELETRO-PLACA',
    detalheBPt: 'SUCATA CAPTURA (+50%) + 3 MUNIÇÃO + 2 COMBUSTÍVEL',
    rotuloBEn: '[B] SHUT DOWN VIA ION PULSE / ELECTRO-PLATE',
    detalheBEn: 'CAPTURE SCRAP (+50%) + 3 AMMO + 2 FUEL',
    rotuloCPt: '[C] DEIXAR O DRONE DESGOVERNADO',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] AVOID THE WILD MINING LASER',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'ARMA_OU_ORGAO', armaIds: ['CANHAO_PULSO_BIOELETRICO_I', 'BOMBARDEIRO_IONICO_PESADO'], orgaoIds: ['ELETRO_PLACA_ARRAIA'], descPt: 'Arma Iônica OU Eletro-Placa', descEn: 'Ion Weapon OR Electro-Plate' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, termoMoeda: 'Sucata_{captura}(S)' },
      p1: { tipo: 'RECOMPENSA_COM_CUSTO', danoCasco: 3, termoMoeda: 'Sucata_{bruta}(S)' },
    },
    recompensaBlueOption: { danoCasco: 0, municao: 3, combustivel: 2, termoMoeda: 'Sucata_{captura}(S)' },
  }),
  ev({
    id: 'AE_S6_EXP_TANQUE_BIOPLASMA',
    setorAlvo: 6,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'PLASMA',
    tagMapaEn: 'PLASMA',
    seloPt: 'SILO PLASMA',
    seloEn: 'PLASMA VAT',
    tituloPt: 'CUBA FLUTUANTE DE BIO-PLASMA SINTÉTICO ABANDONADA',
    tituloEn: 'FLOATING VAT OF SYNTHETIC BIO-PLASMA FUEL',
    linhasPt: [
      'A CORPORAÇÃO DESCARTOU UMA CUBA INSTÁVEL DE COMBUSTÍVEL DE ALTA OCTANAGEM.',
      'ESTABILIZAR A MISTURA RENDE COMBUSTÍVEL PARA O SETOR INTEIRO.',
      'DECIDA O REFINO:',
    ],
    linhasEn: [
      'A CORPORATE CONVOY JETTISONED AN UNSTABLE BIO-PLASMA VAT.',
      'STABILIZING IT YIELDS ENOUGH FUEL FOR HALF A SECTOR.',
      'CHOOSE YOUR REFINING STEP:',
    ],
    rotuloAPt: '[A] DRENAR METADE ESTÁVEL DA CUBA',
    detalheAPt: '50% +4 COMBUSTÍVEL | 50% VAPOR TÓXICO (-2 HP) + 2 CMB',
    rotuloAEn: '[A] SIPHON STABLE TOP LAYER',
    detalheAEn: '50% +4 FUEL | 50% TOXIC FUMES (-2 HP) + 2 FUEL',
    rotuloBPt: '[B] CATALISAR COM GLÂNDULA TERMOFÍLICA / POLVO',
    detalheBPt: '+6 COMBUSTÍVEL + BIOMASSA BRUTA SEM DANO',
    rotuloBEn: '[B] CATALYZE VIA THERMOPHILIC GLAND / OCTOPUS',
    detalheBEn: '+6 FUEL + RAW BIOMASS ZERO DAMAGE',
    rotuloCPt: '[C] NÃO TOCAR NA CUBA INSTÁVEL',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] DO NOT RISK DETONATION',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'ESPECIE_OU_ORGAO', especie: 'POLVO', qtdMin: 1, orgaoIds: ['GLANDULA_TERMOFILICA'], descPt: 'Polvo OU Glândula Termofílica', descEn: 'Octopus OR Thermophilic Gland' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, combustivel: 4 },
      p1: { tipo: 'RECOMPENSA_COM_CUSTO', danoCasco: 2, combustivel: 2 },
    },
    recompensaBlueOption: { danoCasco: 0, combustivel: 6, termoMoeda: 'Biomassa_{bruta}(S)' },
  }),
  ev({
    id: 'AE_S6_EXP_ARSENAL_QUIMICO_SUBMERSO',
    setorAlvo: 6,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'OGIVAS',
    tagMapaEn: 'WARHEAD',
    seloPt: 'BUNKER ÁCIDO',
    seloEn: 'ACID BUNKER',
    tituloPt: 'BUNKER DE TESTES DE MORTEIROS BIOQUÍMICOS',
    tituloEn: 'SUBMERGED BIO-CHEMICAL MORTAR TESTING BUNKER',
    linhasPt: [
      'CAIXAS LACRADAS DE MUNIÇÃO E UM PROTÓTIPO REPOUSAM NA CRATERA.',
      'RESÍDUOS CORROSIVOS IMPEDEM ACESSO SEM ESCUDO OU ANFÍBIOS.',
      'ESCOLHA A ENTRADA:',
    ],
    linhasEn: [
      'SEALED AMMO CRATES AND A WEAPON PROTOTYPE LIE IN THE CRATER.',
      'CAUSTIC BRINE BLOCKS UNPROTECTED DIVERS.',
      'CHOOSE YOUR ENTRY:',
    ],
    rotuloAPt: '[A] MERGULHAR RÁPIDO E IÇAR CAIXA MAIS PRÓXIMA',
    detalheAPt: '+3 MUNIÇÃO + SUCATA BRUTA (-1 HP CORROSÃO)',
    rotuloAEn: '[A] SNATCH NEAREST CRATE (-1 HP ACID)',
    detalheAEn: '+3 AMMO + RAW SCRAP (-1 HULL HP)',
    rotuloBPt: '[B] USAR ESPINHOS DE QUILHA / 2+ CARANGUEJOS',
    detalheBPt: '+1 ARMA NO PORÃO + +4 MUNIÇÃO SEM DANO',
    rotuloBEn: '[B] DEPLOY 2+ CRABS / KEEL SPIKE LAUNCHER',
    detalheBEn: '+1 WEAPON IN HOLD + +4 AMMO DAMAGE-FREE',
    rotuloCPt: '[C] SEGUIR VIAGEM',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] MOVE ON',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'ESPECIE_OU_ARMA', especie: 'CARANGUEJO', qtdMin: 2, armaIds: ['DISPARADOR_ESPINHOS_QUILHA', 'MORTEIRO_ACIDO_CORROSIVO'], descPt: '2+ Caranguejos OU Espinhos/Morteiro Ácido', descEn: '2+ Crabs OR Keel Spikes/Acid Mortar' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_COM_CUSTO', danoCasco: 1, municao: 3, termoMoeda: 'Sucata_{bruta}(S)' },
      p1: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, municao: 3, termoMoeda: 'Sucata_{bruta}(S)' },
    },
    recompensaBlueOption: { danoCasco: 0, armaRecuperada: 1, municao: 4 },
  }),
  ev({
    id: 'AE_S6_SOS_HIDRA_INTOXICADA',
    setorAlvo: 6,
    categoria: 'SOS',
    tagMapaPt: 'HIDRA',
    tagMapaEn: 'HYDRA',
    seloPt: 'COLOSSO FERIDO',
    seloEn: 'POISONED BEAST',
    tituloPt: 'HIDRA CORALINA ENLOUQUECIDA POR DESPEJO DE MERCÚRIO',
    tituloEn: 'CORAL HYDRA MADDENED BY CORPORATE MERCURY DUMP',
    linhasPt: [
      'UM TAMBOR DE MERCÚRIO CRAVOU-SE NO DORSO DA CRIATURA GIGANTE.',
      'ARRANCAR O TAMBOR PODE ACALMÁ-LA E RENDER UM ÓRGÃO SIMBIÓTICO.',
      'ESCOLHA O PROCEDIMENTO:',
    ],
    linhasEn: [
      'A TOXIC MERCURY DRUM IS LODGED IN THE BEAST DORSAL RIDGE.',
      'EXTRACTING IT MAY PACIFY THE HYDRA AND YIELD A SYMBIONT.',
      'CHOOSE YOUR PROCEDURE:',
    ],
    rotuloAPt: '[A] ENFRENTAR A HIDRA DESCONTROLADA',
    detalheAPt: 'COMBATE CONTRA MONSTRO | SAQUE BIOLÓGICO PADRÃO',
    rotuloAEn: '[A] FIGHT THE RAMPAGING HYDRA',
    detalheAEn: 'MONSTER COMBAT | STANDARD BIOMASS REWARD',
    rotuloBPt: '[B] ARRANCAR TAMBOR COM ARPÃO DE CABO',
    detalheBPt: 'HIDRA AGRADECE: +1 ÓRGÃO INTACTO + BIOMASSA CIRÚRGICA',
    rotuloBEn: '[B] YANK DRUM FREE WITH TETHER HARPOON',
    detalheBEn: 'HYDRA PACIFIED: +1 INTACT ORGAN + SURGICAL BIO',
    rotuloCPt: '[C] RECUAR ANTES QUE ELA NOTE SEU CASCO',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] BACK AWAY BEFORE IT SPOTS YOU',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'ARMA_QUALQUER', armaIds: ['CANHAO_ARPAO_CABO'], descPt: 'Canhão de Arpão de Cabo', descEn: 'Tethered Harpoon Cannon' },
    opcaoA: {
      p0: { tipo: 'COMBATE_MONSTRO', danoCasco: 0 },
      p1: { tipo: 'COMBATE_MONSTRO', danoCasco: 0 },
    },
    recompensaBlueOption: { danoCasco: 0, orgaoIntacto: 1, termoMoeda: 'Biomassa_{cirúrgica}(S)' },
  }),
  ev({
    id: 'AE_S6_EXP_TORRE_FILTRAGEM_ATMOSFERICA',
    setorAlvo: 6,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'FILTRO',
    tagMapaEn: 'SCRUBBR',
    seloPt: 'TORRE FILTRO',
    seloEn: 'AIR SCRUBBER',
    tituloPt: 'TORRE AUTOMÁTICA DE PURIFICAÇÃO E TELEMETRIA',
    tituloEn: 'AUTOMATED ATMOSPHERIC SCRUBBER & WEATHER TOWER',
    linhasPt: [
      'OS RADARES METEOROLÓGICOS MOSTRAM AS CORRENTES LIVRES DE ÁCIDO.',
      'PEÇAS DE MANUTENÇÃO E CÉLULAS SOLARES ESTÃO INTACTAS NO TOPO.',
      'DEFINA A EQUIPE:',
    ],
    linhasEn: [
      'WEATHER RADARS MAP ACID-FREE WIND LANES ACROSS THE SECTOR.',
      'SOLAR CELLS AND ALLOY SPARES REMAIN INTACT ALOFT.',
      'ASSIGN YOUR TEAM:',
    ],
    rotuloAPt: '[A] DESMONTAR CÉLULAS E BAIXAR MAPA PARCIAL',
    detalheAPt: '50% REVELA MAPA + SUCATA | 50% SUCATA + 2 CMB',
    rotuloAEn: '[A] STRIP SOLAR CELLS & DOWNLOAD LOGS',
    detalheAEn: '50% REVEALS MAP + SCRAP | 50% SCRAP + 2 FUEL',
    rotuloBPt: '[B] ACOPLAR CÓRTEX NV.3+ / OLHO SONAR',
    detalheBPt: 'REVELA MAPA DO SETOR + SUCATA CAPTURA + 3 CMB',
    rotuloBEn: '[B] LINK CORTEX LV.3+ / ABYSSAL SONAR EYE',
    detalheBEn: 'REVEALS SECTOR MAP + CAPTURE SCRAP + 3 FUEL',
    rotuloCPt: '[C] SEGUIR ROTA',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] CONTINUE ON COURSE',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'SISTEMA_OU_ORGAO', sistema: 'Córtex de Navegação', nivelMin: 3, orgaoIds: ['OLHO_SONAR_ABISSAL'], descPt: 'Córtex Nv.3+ OU Olho Sonar', descEn: 'Cortex Lv.3+ OR Sonar Eye' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, revelaMapaSetorial: true, termoMoeda: 'Sucata_{bruta}(S)' },
      p1: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, combustivel: 2, termoMoeda: 'Sucata_{bruta}(S)' },
    },
    recompensaBlueOption: { danoCasco: 0, revelaMapaSetorial: true, combustivel: 3, termoMoeda: 'Sucata_{captura}(S)' },
  }),
]);

export const EVENTOS_AE_SETORES_5A8_PARTE2 = congelarEv([
  // ==================== SETOR 7: CHAMINÉS HIDROTERMAIS ABISSAIS (12 EVENTOS + QUEST 7) ====================
  ev({
    id: 'AE_S7_SOS_FORJA_VULCANICA_SITIADA',
    setorAlvo: 7,
    categoria: 'SOS',
    tagMapaPt: 'VULCÃO',
    tagMapaEn: 'VENTRIG',
    seloPt: 'FORJA TERMAL',
    seloEn: 'THERMAL FORGE',
    tituloPt: 'FORJA GEOTÉRMICA INDEPENDENTE CERCADA POR SUBMARINO',
    tituloEn: 'INDEPENDENT GEOTHERMAL FORGE BESIEGED BY SUBMARINE',
    linhasPt: [
      'FERREIROS SIMBIÓTICOS USAM MAGMA SUBMARINO PARA FUNDIR ARMAS AE.',
      'SALVÁ-LOS GARANTE ACESSO À CÂMARA MESTRA DE TÊMPERA VULCÂNICA.',
      'DECIDA COMO INTERVIR:',
    ],
    linhasEn: [
      'SYMBIOTIC SMITHS HARNESS SUBSEA MAGMA TO FORGE AE WEAPONS.',
      'SAVING THEM UNLOCKS THEIR MASTER VOLCANIC TEMPERING VAULT.',
      'CHOOSE HOW TO INTERVENE:',
    ],
    rotuloAPt: '[A] ENFRENTAR O SUBMARINO DE CERCO',
    detalheAPt: '50% SUCATA + PLANTA [QUEST] | 50% COMBATE CONTRA BARCO',
    rotuloAEn: '[A] ENGAGE THE SIEGE SUBMARINE',
    detalheAEn: '50% SCRAP + MARKS [QUEST] | 50% SHIP COMBAT',
    rotuloBPt: '[B] CONGELAR FENDA COM TORPEDO CRIO / VULCÃO',
    detalheBPt: 'SUCATA CAPTURA + 3 MUN + PLANTA [QUEST] FORJA MESTRA',
    rotuloBEn: '[B] SEAL VENT VIA CRYO TORPEDO / HYDRO VULCAN',
    detalheBEn: 'CAPTURE SCRAP + 3 AMMO + MARKS [QUEST] MASTER FORGE',
    rotuloCPt: '[C] EVITAR A CALDEIRA EM GUERRA',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] BYPASS THE CONTESTED CALDERA',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'ARMA_QUALQUER', armaIds: ['TORPEDO_CRIO_TERMAL', 'VULCAO_HIDROTERMAL_CADEIA', 'LANCA_TERMICA_FOCAL'], descPt: 'Torpedo Crio / Vulcão / Lança Focal', descEn: 'Cryo Torpedo / Vulcan / Focal Lance' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, termoMoeda: 'Sucata_{bruta}(S)', plantaQuestId: 'AE_Q7_CAMARA_TEMPERA_MAGMA' },
      p1: { tipo: 'COMBATE_BARCO', danoCasco: 0 },
    },
    recompensaBlueOption: { danoCasco: 0, municao: 3, termoMoeda: 'Sucata_{captura}(S)', plantaQuestId: 'AE_Q7_CAMARA_TEMPERA_MAGMA' },
  }),
  ev({
    id: 'AE_Q7_CAMARA_TEMPERA_MAGMA',
    setorAlvo: 7,
    ehEventoQuest: true,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'QUEST!',
    tagMapaEn: 'QUEST!',
    seloPt: 'QUEST MAGMA',
    seloEn: 'MAGMA QUEST',
    tituloPt: '[QUEST] BIGORNA HIDROTERMAL DOS MESTRES FERREIROS',
    tituloEn: '[QUEST] HYDROTHERMAL ANVIL OF THE MASTER SMITHS',
    linhasPt: [
      'OS FERREIROS ABREM A COMPORTA DE BASALTO PARA SUA BIO-NAVE!',
      'ELES TEMPERAM SUA CARAPAÇA E ENTREGAM UMA OBRA-PRIMA DORSAL.',
      'ESCOLHA A RECOMPENSA DA BIGORNA:',
    ],
    linhasEn: [
      'THE SMITHS UNSEAL THE BASALT VAULT FOR YOUR BIO-CRAFT!',
      'THEY TEMPER YOUR HULL AND PRESENT A MASTERWORK WEAPON.',
      'SELECT YOUR ANVIL REWARD:',
    ],
    rotuloAPt: '[A] RECEBER ARMA DORSAL + REPARO (+8 HP)',
    detalheAPt: '+1 ARMA NO PORÃO + REPARA +8 HP + SUCATA',
    rotuloAEn: '[A] CLAIM MASTERWORK WEAPON + REPAIR (+8 HP)',
    detalheAEn: '+1 WEAPON IN HOLD + REPAIR +8 HP + SCRAP',
    rotuloBPt: '[B] FORJAR ENXERTO TÉRMICO (GLÂNDULA TERMOFÍLICA)',
    detalheBPt: '+1 ARMA + +1 ÓRGÃO + REPARA +10 HP CASCO!',
    rotuloBEn: '[B] FUSE THERMAL GRAFT (THERMOPHILIC / ARMOR LV.3+)',
    detalheBEn: '+1 WEAPON + +1 ORGAN + REPAIR +10 HULL HP!',
    rotuloCPt: '[C] ABASTECER LINGOTES E MUNIÇÃO (+5 MUN)',
    detalheCPt: 'SUCATA CAPTURA + 5 MUNIÇÃO + 3 COMBUSTÍVEL',
    rotuloCEn: '[C] STOCK INGOTS & ORDNANCE (+5 AMMO)',
    detalheCEn: 'CAPTURE SCRAP + 5 AMMO + 3 FUEL',
    reqBlue: { tipo: 'SISTEMA_OU_ORGAO', sistema: 'Placas de Blindagem', nivelMin: 3, orgaoIds: ['GLANDULA_TERMOFILICA', 'CRISTA_REFRACAO_ACUSTICA'], descPt: 'Blindagem Nv.3+ OU Termofílica/Crista', descEn: 'Armor Lv.3+ OR Thermophilic/Crest' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, armaRecuperada: 1, reparaCascoHp: 8, termoMoeda: 'Sucata_{bruta}(S)' },
      p1: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, armaRecuperada: 1, reparaCascoHp: 7, termoMoeda: 'Sucata_{bruta}(S)' },
    },
    recompensaBlueOption: { danoCasco: 0, armaRecuperada: 1, orgaoIntacto: 1, reparaCascoHp: 10 },
  }),
  ev({
    id: 'AE_S7_PER_GEISER_EBULICAO',
    setorAlvo: 7,
    categoria: 'PERIGO',
    tagMapaPt: 'GÊISER!',
    tagMapaEn: 'GEYSER!',
    seloPt: 'PLUMA FERVENTE',
    seloEn: 'BOILING VENT',
    tituloPt: 'ERUPÇÃO DE GÊISER ABISSAL — BOLHAS REDUZEM SUSTENTAÇÃO!',
    tituloEn: 'ABYSSAL GEYSER ERUPTION — STEAM CAVITATES FOIL!',
    linhasPt: [
      'VAPOR VULCÂNICO CAUSA CAVITAÇÃO NAS ASAS (-40 kg NO FOIL)!',
      'UMA ENGUIA-VOLT TERMAL ATACA EM MEIO À FERVURA!',
      'PREPARE O HIDROFÓLIO PARA O IMPACTO:',
    ],
    linhasEn: [
      'VOLCANIC STEAM CAVITATES YOUR FOIL (-40 kg LIFT)!',
      'A THERMAL VOLT-EEL STRIKES THROUGH THE BOILING PLUME!',
      'BRACE HYDROFOIL SYSTEMS FOR COMBAT:',
    ],
    rotuloAPt: '[A] LUTAR SOBRE A CHAMINÉ (-40 kg FOIL)',
    detalheAPt: 'COMBATE OBRIGATÓRIO | SUSTENTAÇÃO -40 kg NA LUTA',
    rotuloAEn: '[A] FIGHT OVER BOILING VENT (-40 kg LIFT)',
    detalheAEn: 'MANDATORY COMBAT | -40 kg HYDROFOIL LIFT',
    rotuloBPt: '[B] COMPENSAR COM ALETA FOIL / VESÍCULA / MASTRO NV.3+',
    detalheBPt: 'REDUZ PERDA A -10 kg + +2 MUNIÇÃO PÓS-COMBATE',
    rotuloBEn: '[B] STABILIZE VIA FOIL FIN / VESICLE / STRUT LV.3+',
    detalheBEn: 'CUTS PENALTY TO -10 kg + +2 POST-COMBAT AMMO',
    rotuloCPt: '[C] COLUNA DE VAPOR BLOQUEIA O SALTO',
    detalheCPt: 'DERROTE O PREDADOR PARA SAIR DA CALDEIRA',
    rotuloCEn: '[C] STEAM PLUME BLOCKS ESCAPE VECTOR',
    detalheCEn: 'DEFEAT PREDATOR TO CLEAR CALDERA',
    reqBlue: { tipo: 'SISTEMA_OU_ORGAO', sistema: 'Mastro do Foil', nivelMin: 3, orgaoIds: ['ALETA_ESTABILIZADORA_FOIL', 'VESICULA_HIPERBARICA'], descPt: 'Mastro Nv.3+ OU Aleta/Vesícula', descEn: 'Foil Strut Lv.3+ OR Foil Fin/Vesicle' },
    opcaoA: {
      p0: { tipo: 'COMBATE_MONSTRO', penalidadeSustentacaoKg: 40, danoCasco: 0 },
      p1: { tipo: 'COMBATE_MONSTRO', penalidadeSustentacaoKg: 40, danoCasco: 0 },
    },
    recompensaBlueOption: { danoCasco: 0, penalidadeSustentacaoKg: 10, municaoPosLuta: 2, termoMoeda: null },
  }),
  ev({
    id: 'AE_S7_EXP_NODULOS_POLIMETALICOS',
    setorAlvo: 7,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'NÓDULOS',
    tagMapaEn: 'NODULES',
    seloPt: 'CAMPO MANGANÊS',
    seloEn: 'NODULE BED',
    tituloPt: 'LEITO DE NÓDULOS POLIMETÁLICOS PUROS JUNTO AO MAGMA',
    tituloEn: 'BED OF PURE POLYMETALLIC NODULES BY LAVA FLOW',
    linhasPt: [
      'ESFERAS DE NÍQUEL, COBALTO E TITÂNIO COBREM A BORDA DE LAVA.',
      'RECOLHÊ-LAS EXIGE RAPIDEZ ANTES QUE A CROSTA CEDA.',
      'ESCOLHA A EXTRAÇÃO:',
    ],
    linhasEn: [
      'NICKEL, COBALT AND TITANIUM SPHERES BLANKET A LAVA RIM.',
      'GATHERING THEM REQUIRES SPEED BEFORE THE CRUST CRACKS.',
      'CHOOSE YOUR EXTRACTION:',
    ],
    rotuloAPt: '[A] DRAGAR NÓDULOS SUPERFICIAIS',
    detalheAPt: '50% SUCATA CAPTURA | 50% LAVA QUEIMA (-3 HP) + SUC',
    rotuloAEn: '[A] DREDGE SURFACE NODULES',
    detalheAEn: '50% CAPTURE SCRAP | 50% LAVA SCORCH (-3 HP) + SCRAP',
    rotuloBPt: '[B] RECOLHER COM ENZIMA SUCATA / SIFÃO NV.4+',
    detalheBPt: 'SUCATA CAPTURA (+50%) + 3 MUNIÇÃO SEM DANO',
    rotuloBEn: '[B] SCOOP VIA SCRAP ENZYME / SIPHON LV.4+',
    detalheBEn: 'CAPTURE SCRAP (+50%) + 3 AMMO ZERO DAMAGE',
    rotuloCPt: '[C] NÃO ARRANCAR A CROSTA FINA',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] DO NOT DISTURB THIN CRUST',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'SISTEMA_OU_ORGAO', sistema: 'Sifão de Propulsão', nivelMin: 4, orgaoIds: ['ENZIMA_DIGESTORA_SUCATA'], descPt: 'Sifão Nv.4+ OU Enzima Sucata', descEn: 'Siphon Lv.4+ OR Scrap Enzyme' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, termoMoeda: 'Sucata_{captura}(S)' },
      p1: { tipo: 'RECOMPENSA_COM_CUSTO', danoCasco: 3, termoMoeda: 'Sucata_{bruta}(S)' },
    },
    recompensaBlueOption: { danoCasco: 0, municao: 3, termoMoeda: 'Sucata_{captura}(S)' },
  }),
  ev({
    id: 'AE_S7_EXP_VERMES_TUBICOLAS_GIGANTES',
    setorAlvo: 7,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'TUBÍCOL',
    tagMapaEn: 'TUBEWRM',
    seloPt: 'COLÔNIA TERMAL',
    seloEn: 'VENT WORMS',
    tituloPt: 'FLORESTA DE VERMES TUBÍCOLAS QUIMIOSSINTÉTICOS',
    tituloEn: 'FOREST OF GIANT CHEMOSYNTHETIC TUBE WORMS',
    linhasPt: [
      'PLUMAS VERMELHAS CONVERTEM ENXOFRE VULCÂNICO EM ENERGIA VIVA.',
      'SEUS TECIDOS REGENERAM CARAPAÇAS EM SEGUNDOS.',
      'ESCOLHA A COLHEITA:',
    ],
    linhasEn: [
      'CRIMSON PLUMES CONVERT VOLCANIC SULFUR INTO BIO-ENERGY.',
      'THEIR SYMBIOTIC BACTERIA MEND CHITIN RAPIDLY.',
      'SELECT YOUR HARVEST:',
    ],
    rotuloAPt: '[A] SINTETIZAR BIOMASSA E REPARAR CASCO',
    detalheAPt: 'BIOMASSA BRUTA + REPARA +5 HP CASCO',
    rotuloAEn: '[A] SYNTHESIZE BIOMASS & PATCH HULL',
    detalheAEn: 'RAW BIOMASS + REPAIR +5 HULL HP',
    rotuloBPt: '[B] CULTIVAR COM GLÂNDULA TERMOFÍLICA / MEDULA',
    detalheBPt: '+1 ÓRGÃO INTACTO + BIOMASSA CIRÚRGICA + +6 HP',
    rotuloBEn: '[B] CULTIVATE VIA THERMOPHILIC / CORAL MARROW',
    detalheBEn: '+1 INTACT ORGAN + SURGICAL BIO + +6 HULL HP',
    rotuloCPt: '[C] SEGUIR VIAGEM',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] SAIL ON',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'ORGAO_QUALQUER', orgaoIds: ['GLANDULA_TERMOFILICA', 'MEDULA_REGENERATIVA_CORAL'], descPt: 'Termofílica OU Medula Coral', descEn: 'Thermophilic OR Coral Marrow' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, reparaCascoHp: 5, termoMoeda: 'Biomassa_{bruta}(S)' },
      p1: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, reparaCascoHp: 4, termoMoeda: 'Biomassa_{bruta}(S)' },
    },
    recompensaBlueOption: { danoCasco: 0, orgaoIntacto: 1, reparaCascoHp: 6, termoMoeda: 'Biomassa_{cirúrgica}(S)' },
  }),
  ev({
    id: 'AE_S7_SOS_SONDA_GEOTERMAl_CIENTISTAS',
    setorAlvo: 7,
    categoria: 'SOS',
    tagMapaPt: 'VULCAN.',
    tagMapaEn: 'VOLCANO',
    seloPt: 'ESTAÇÃO MAGMA',
    seloEn: 'MAGMA LAB',
    tituloPt: 'VULCANÓLOGOS ISOLADOS POR RIO DE LAVA SUBMARINA',
    tituloEn: 'VOLCANOLOGISTS CUT OFF BY SUBSEA LAVA FLOW',
    linhasPt: [
      'A ESTAÇÃO DE PESQUISA PERDEU A REFRIGERAÇÃO EXTERNA.',
      'UM ESPECIALISTA PEDE PASSAGEM ATÉ O SETOR 8 COM DADOS DA DRAGA.',
      'ESCOLHA A OPERAÇÃO:',
    ],
    linhasEn: [
      'THE RESEARCH POD LOST EXTERNAL COOLING LOOPS.',
      'A SPECIALIST OFFERS DREDGE TELEMETRY FOR EVACUATION.',
      'CHOOSE YOUR RESCUE PLAN:',
    ],
    rotuloAPt: '[A] PLANAR SOBRE A LAVA E RECOLHER EQUIPE',
    detalheAPt: '50% +1 TRIPULANTE + MAPA | 50% CALOR (-3 HP) + MAPA',
    rotuloAEn: '[A] SKIM OVER LAVA TO DOCK',
    detalheAEn: '50% +1 CREW + REVEAL MAP | 50% HEAT (-3 HP) + MAP',
    rotuloBPt: '[B] PROTEGER COM BARREIRA NV.3+ / TORPEDO CRIO',
    detalheBPt: '+1 TRIPULANTE + REVELA MAPA + 4 COMBUSTÍVEL',
    rotuloBEn: '[B] SHIELD DOCKING VIA BARRIER LV.3+ / CRYO',
    detalheBEn: '+1 CREWMATE + REVEALS MAP + 4 FUEL',
    rotuloCPt: '[C] NÃO ENTRAR NO CAMPO DE LAVA',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] DO NOT CROSS LAVA FIELD',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'SISTEMA_OU_ARMA', sistema: 'Glândula de Barreira', nivelMin: 3, armaIds: ['TORPEDO_CRIO_TERMAL'], descPt: 'Barreira Nv.3+ OU Torpedo Crio', descEn: 'Barrier Lv.3+ OR Cryo Torpedo' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, recrutaTripulante: 1, revelaMapaSetorial: true },
      p1: { tipo: 'RECOMPENSA_COM_CUSTO', danoCasco: 3, revelaMapaSetorial: true },
    },
    recompensaBlueOption: { danoCasco: 0, recrutaTripulante: 1, revelaMapaSetorial: true, combustivel: 4 },
  }),
  ev({
    id: 'AE_S7_EXP_USINA_MARE_TERMAL',
    setorAlvo: 7,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'GERADOR',
    tagMapaEn: 'TURBINE',
    seloPt: 'USINA TERMAL',
    seloEn: 'THERMAL PLANT',
    tituloPt: 'USINA GEOTÉRMICA AUTOMÁTICA ABASTECENDO A DRAGA',
    tituloEn: 'AUTOMATED GEOTHERMAL PLANT FEEDING THE DREDGE',
    linhasPt: [
      'CÉLULAS DE ALTA DENSIDADE ESTÃO SENDO CARREGADAS PARA A FROTA.',
      'SABOTAR A SUBESTAÇÃO RENDE GRANDE ESTOQUE DE COMBUSTÍVEL E SUCATA.',
      'DECIDA O ATAQUE:',
    ],
    linhasEn: [
      'HIGH-DENSITY CELLS CHARGE HERE FOR THE DREDGE ARMADA.',
      'RAIDING THE SUBSTATION YIELDS MASSIVE FUEL AND SCRAP.',
      'CHOOSE YOUR STRIKE:',
    ],
    rotuloAPt: '[A] SAQUEAR CÉLULAS E DESTRUIR TRANSFORMADOR',
    detalheAPt: '50% +5 CMB + SUCATA | 50% ESCOLTA PESADA ATACA',
    rotuloAEn: '[A] RAID CELLS & BLOW TRANSFORMER',
    detalheAEn: '50% +5 FUEL + SCRAP | 50% HEAVY ESCORT ATTACKS',
    rotuloBPt: '[B] SOBRECARREGAR COM 2+ ARRAIAS / SURTO ÍON II',
    detalheBPt: '+6 COMBUSTÍVEL + SUCATA CAPTURA SEM ALARME',
    rotuloBEn: '[B] DRAIN VIA 2+ ELECTRIC RAYS / HEAVY ION II',
    detalheBEn: '+6 FUEL + CAPTURE SCRAP WITHOUT ALARM',
    rotuloCPt: '[C] EVITAR A USINA FORTIFICADA',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] BYPASS FORTIFIED PLANT',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'ESPECIE_OU_ARMA', especie: 'ARRAIA', qtdMin: 2, armaIds: ['BOMBARDEIRO_IONICO_PESADO'], descPt: '2+ Arraias OU Surto Iônico II', descEn: '2+ Electric Rays OR Heavy Ion II' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, combustivel: 5, termoMoeda: 'Sucata_{bruta}(S)' },
      p1: { tipo: 'COMBATE_BARCO', danoCasco: 0 },
    },
    recompensaBlueOption: { danoCasco: 0, combustivel: 6, termoMoeda: 'Sucata_{captura}(S)' },
  }),
  ev({
    id: 'AE_S7_EXP_CRISTA_OBSIDIANA',
    setorAlvo: 7,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'OBSIDIA',
    tagMapaEn: 'OBSIDN',
    seloPt: 'VIDRO VULCÂN.',
    seloEn: 'OBSIDIAN REEF',
    tituloPt: 'ARCO DE OBSIDIANA COM DESTROÇOS DE CAÇA-LEVIATÃ',
    tituloEn: 'OBSIDIAN ARCH HOLDING A WRECKED LEVIATHAN-HUNTER',
    linhasPt: [
      'UM NAVIO BALEEIRO MILITAR PARTIU-SE NO ARCO DE VIDRO VULCÂNICO.',
      'SUA TORRETA DORSAL INTACTA AINDA PENDE SOBRE O ABISMO.',
      'ESCOLHA A RECUPERAÇÃO:',
    ],
    linhasEn: [
      'A MILITARY WHALER SPLIT ACROSS A VOLCANIC GLASS ARCH.',
      'ITS DORSAL WEAPON MOUNT HANGS INTACT OVER THE ABYSS.',
      'CHOOSE YOUR SALVAGE METHOD:',
    ],
    rotuloAPt: '[A] CORTAR SUPORTES E APANHAR NA QUEDA',
    detalheAPt: '50% +1 ARMA NO PORÃO | 50% VIDRO CORTA (-3 HP) + SUC',
    rotuloAEn: '[A] CUT BRACKETS AND CATCH MOUNT',
    detalheAEn: '50% +1 WEAPON | 50% OBSIDIAN SLASH (-3 HP) + SCRAP',
    rotuloBPt: '[B] DESMONTAR COM TUBO ABORDAGEM / POLVO',
    detalheBPt: '+1 ARMA NO PORÃO + 3 MUNIÇÃO SEM DANO',
    rotuloBEn: '[B] RIGGING TEAM VIA BOARDING TUBE / OCTOPUS',
    detalheBEn: '+1 WEAPON IN HOLD + 3 AMMO DAMAGE-FREE',
    rotuloCPt: '[C] SEGUIR VIAGEM',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] MOVE ON',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'SISTEMA_OU_ESPECIE', sistema: 'Tubo Pressurizado', nivelMin: 1, especie: 'POLVO', descPt: 'Tubo Pressurizado OU Polvo', descEn: 'Boarding Tube OR Octopus' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, armaRecuperada: 1 },
      p1: { tipo: 'RECOMPENSA_COM_CUSTO', danoCasco: 3, termoMoeda: 'Sucata_{bruta}(S)' },
    },
    recompensaBlueOption: { danoCasco: 0, armaRecuperada: 1, municao: 3 },
  }),
  ev({
    id: 'AE_S7_EXP_LEVIATA_TERMAL_ADORMECIDO',
    setorAlvo: 7,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'TITÃ',
    tagMapaEn: 'TITAN',
    seloPt: 'TITÃ ADORMEC.',
    seloEn: 'SLEEPING TITAN',
    tituloPt: 'TEUTHIS TERMAL ANCESTRAL HIBERNANDO NA CRATERA',
    tituloEn: 'ANCIENT THERMAL TEUTHIS HIBERNATING IN CRATER',
    linhasPt: [
      'A CRIATURA RESPIRA LENTAMENTE A CADA TRINTA SEGUNDOS.',
      'PÉROLAS DE BIOMASSA E DENTES DESPRENDIDOS CERCAM SEU MANTO.',
      'DECIDA SE ARRISCA APROXIMAÇÃO:',
    ],
    linhasEn: [
      'THE COLOSSUS BREATHES ONCE EVERY THIRTY SECONDS.',
      'SHED FANGS AND BIOMASS PEARLS RING ITS MANTLE.',
      'DARE YOU APPROACH THE CRATER?',
    ],
    rotuloAPt: '[A] RECOLHER NA BORDA DA CRATERA',
    detalheAPt: '50% BIOMASSA CIRÚRGICA | 50% TITÃ DESPERTA E ATACA!',
    rotuloAEn: '[A] GATHER FROM CRATER RIM',
    detalheAEn: '50% SURGICAL BIO | 50% TITAN WAKES & ATTACKS!',
    rotuloBPt: '[B] INFILTRAR COM TINTA FURTIVA NV.2+',
    detalheBPt: '+1 ÓRGÃO INTACTO + BIOMASSA CIRÚRGICA EM SILÊNCIO',
    rotuloBEn: '[B] SLIP IN WITH CLOAKING INK LV.2+',
    detalheBEn: '+1 INTACT ORGAN + SURGICAL BIOMASS UNDETECTED',
    rotuloCPt: '[C] NÃO PERTURBAR O TITÃ',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] DO NOT WAKE THE TITAN',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'SISTEMA_NIVEL', sistema: 'Glândula de Tinta Furtiva', nivelMin: 2, descPt: 'Tinta Furtiva Nv.2+', descEn: 'Cloaking Ink Lv.2+' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, termoMoeda: 'Biomassa_{cirúrgica}(S)' },
      p1: { tipo: 'COMBATE_MONSTRO', danoCasco: 0 },
    },
    recompensaBlueOption: { danoCasco: 0, orgaoIntacto: 1, termoMoeda: 'Biomassa_{cirúrgica}(S)' },
  }),
  ev({
    id: 'AE_S7_SOS_COMBOIO_MUNICAO_ENCURRALADO',
    setorAlvo: 7,
    categoria: 'SOS',
    tagMapaPt: 'COMBOIO',
    tagMapaEn: 'AMMOSHP',
    seloPt: 'CARGA OGIVAS',
    seloEn: 'ORDNANCE SHIP',
    tituloPt: 'TRANSPORTE REBELDE DE MUNIÇÃO ENCURRALADO NA FENDA',
    tituloEn: 'REBEL ORDNANCE TRANSPORT CORNERED IN VENT RIFT',
    linhasPt: [
      'CONTRABANDISTAS ALIADOS CARREGAM MUNIÇÃO PARA A LINHA DE FRENTE.',
      'UMA CORVETA DE ATAQUE DISPARA CONTRA SEUS MOTORES.',
      'ESCOLHA SUA AÇÃO:',
    ],
    linhasEn: [
      'ALLIED RUNNERS HAUL TORPEDOES TOWARD SECTOR 8.',
      'A STRIKE CORVETTE POUNDS THEIR AFT THRUSTERS.',
      'CHOOSE YOUR ACTION:',
    ],
    rotuloAPt: '[A] ENFRENTAR A CORVETA DE ATAQUE',
    detalheAPt: 'COMBATE CONTRA BARCO | PROTEGE O TRANSPORTE',
    rotuloAEn: '[A] ENGAGE THE STRIKE CORVETTE',
    detalheAEn: 'SHIP COMBAT | DEFEND ALLIED RUNNERS',
    rotuloBPt: '[B] COBRIR FUGA COM BATERIA DE CARGA / FLAK',
    detalheBPt: '+6 MUNIÇÃO + SUCATA CAPTURA DOS ALIADOS!',
    rotuloBEn: '[B] SUPPRESSIVE BARRAGE VIA CHARGE / FLAK',
    detalheBEn: '+6 AMMO + CAPTURE SCRAP FROM GRATEFUL CREW!',
    rotuloCPt: '[C] SEGUIR DIRETO RUMO À SAÍDA',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] PUSH TOWARD SECTOR EXIT',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'ARMA_QUALQUER', armaIds: ['BATERIA_CARGA_HIDRAULICA', 'TORPEDO_CARGA_DUPLA', 'DISPERSOR_ESTILHACOS', 'DISPERSOR_ABISSAL_MK2'], descPt: 'Arma de Carga OU Flak', descEn: 'Charge Weapon OR Flak' },
    opcaoA: {
      p0: { tipo: 'COMBATE_BARCO', danoCasco: 0 },
      p1: { tipo: 'COMBATE_BARCO', danoCasco: 0 },
    },
    recompensaBlueOption: { danoCasco: 0, municao: 6, termoMoeda: 'Sucata_{captura}(S)' },
  }),
  ev({
    id: 'AE_S7_EXP_CAMARA_HIPERBARICA_ANTIGA',
    setorAlvo: 7,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'ESTASE',
    tagMapaEn: 'STASIS',
    seloPt: 'BUNKER ANCIÃO',
    seloEn: 'ANCIENT VAULT',
    tituloPt: 'BUNKER BIO-ENGENHEIRO DOS CRIADORES DO PROJETO FOIL',
    tituloEn: 'BIO-ENGINEER VAULT OF THE ORIGINAL FOIL CREATORS',
    linhasPt: [
      'INSCRIÇÕES DO PROJETO BIO-FOIL ORIGINAL ADORNAM A ESCOTILHA.',
      'TANQUES DE REGENERAÇÃO E UM GUARDA ADORMECIDO AGUARDAM LÁ DENTRO.',
      'ATIVE O TERMINAL GENÉTICO:',
    ],
    linhasEn: [
      'ORIGINAL BIO-FOIL PROJECT INSIGNIAS MARK THE HATCH.',
      'REGENERATION VATS AND A STASIS GUARDIAN WAIT WITHIN.',
      'ACTIVATE THE GENETIC TERMINAL:',
    ],
    rotuloAPt: '[A] INICIAR CICLO DE REGENERAÇÃO DE CASCO',
    detalheAPt: 'REPARA +8 HP CASCO + 2 COMBUSTÍVEL',
    rotuloAEn: '[A] RUN HULL REGENERATION CYCLE',
    detalheAEn: 'REPAIR +8 HULL HP + 2 FUEL',
    rotuloBPt: '[B] AUTENTICAR SINAPSE PRÉ-IGNIÇÃO / REATOR 12+',
    detalheBPt: '+1 TRIPULANTE + REPARA +8 HP + BIOMASSA CIRÚRGICA',
    rotuloBEn: '[B] AUTHENTICATE PRE-IGNITER / 12+ REACTOR',
    detalheBEn: '+1 CREWMATE + REPAIR +8 HP + SURGICAL BIOMASS',
    rotuloCPt: '[C] LACRAR O BUNKER E SEGUIR',
    detalheCPt: 'RETORNA À CARTA DO SETOR',
    rotuloCEn: '[C] RESEAL THE VAULT AND DEPART',
    detalheCEn: 'RETURN TO SECTOR CHART',
    reqBlue: { tipo: 'REATOR_OU_ORGAO', barrasReatorMin: 12, orgaoIds: ['SINAPSE_PRE_IGNICAO'], descPt: 'Reator 12+ OU Sinapse Pré-Ignição', descEn: '12+ Reactor OR Neural Pre-Igniter' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, reparaCascoHp: 8, combustivel: 2 },
      p1: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, reparaCascoHp: 7, combustivel: 2 },
    },
    recompensaBlueOption: { danoCasco: 0, recrutaTripulante: 1, reparaCascoHp: 8, termoMoeda: 'Biomassa_{cirúrgica}(S)' },
  }),

  // ==================== SETOR 8: VANGUARDA DA DRAGA CONTINENTAL (12 EVENTOS + QUEST 8) ====================
  ev({
    id: 'AE_S8_SOS_CAPITANIA_COALIZAO',
    setorAlvo: 8,
    categoria: 'SOS',
    tagMapaPt: 'COALIZ.',
    tagMapaEn: 'ALLIED',
    seloPt: 'FROTA ALIADA',
    seloEn: 'ALLIED FLEET',
    tituloPt: 'CAPITÂNIA DA COALIZÃO SIMBIÓTICA SOB ATAQUE DE ELITE',
    tituloEn: 'SYMBIOTIC COALITION FLAGSHIP UNDER ELITE ATTACK',
    linhasPt: [
      'O ALMIRANTE SIMBIÓTICO GUARDA OS CÓDIGOS DO DEPÓSITO AVANÇADO S8.',
      'SALVE A CAPITÂNIA ANTES DO CONFRONTO COM A DRAGA CONTINENTAL!',
      'ESCOLHA SUA MANOBRA:',
    ],
    linhasEn: [
      'THE COALITION ADMIRAL HOLDS CODES TO THE SECTOR 8 FORWARD DEPOT.',
      'SAVE THE FLAGSHIP BEFORE FACING THE CONTINENTAL DREDGE!',
      'CHOOSE YOUR MANEUVER:',
    ],
    rotuloAPt: '[A] COBRIR A CAPITÂNIA E TRANSFERIR REPAROS',
    detalheAPt: '50% SUCATA + PLANTA [QUEST] | 50% COMBATE DE ELITE',
    rotuloAEn: '[A] SHIELD FLAGSHIP & TRANSFER REPAIRS',
    detalheAEn: '50% SCRAP + MARKS [QUEST] | 50% ELITE SHIP COMBAT',
    rotuloBPt: '[B] CONTRA-ATAQUE ARTILHARIA NV.4+ / LANÇA FOCAL',
    detalheBPt: 'SUCATA CAPTURA + +6 HP + PLANTA [QUEST] DEPÓSITO S8',
    rotuloBEn: '[B] BROADSIDE VIA ARTILLERY LV.4+ / FOCAL LANCE',
    detalheBEn: 'CAPTURE SCRAP + +6 HP + MARKS [QUEST] S8 DEPOT',
    rotuloCPt: '[C] POUPAR FORÇAS PARA A DRAGA',
    detalheCPt: 'RETORNA À CARTA DO SETOR 8',
    rotuloCEn: '[C] SAVE STRENGTH FOR THE DREDGE',
    detalheCEn: 'RETURN TO SECTOR 8 CHART',
    reqBlue: { tipo: 'SISTEMA_OU_ARMA', sistema: 'Artilharia Dorsal', nivelMin: 4, armaIds: ['LANCA_TERMICA_FOCAL', 'VULCAO_HIDROTERMAL_CADEIA', 'DISPERSOR_ABISSAL_MK2'], descPt: 'Artilharia Nv.4+ OU Arma Pesada AE', descEn: 'Artillery Lv.4+ OR Heavy AE Weapon' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, termoMoeda: 'Sucata_{bruta}(S)', plantaQuestId: 'AE_Q8_ARSENAL_FINAL_COALIZAO' },
      p1: { tipo: 'COMBATE_BARCO', danoCasco: 0 },
    },
    recompensaBlueOption: { danoCasco: 0, reparaCascoHp: 6, termoMoeda: 'Sucata_{captura}(S)', plantaQuestId: 'AE_Q8_ARSENAL_FINAL_COALIZAO' },
  }),
  ev({
    id: 'AE_Q8_ARSENAL_FINAL_COALIZAO',
    setorAlvo: 8,
    ehEventoQuest: true,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'QUEST!',
    tagMapaEn: 'QUEST!',
    seloPt: 'DOCA FINAL',
    seloEn: 'FINAL DEPOT',
    tituloPt: '[QUEST] DOCA DE REPARO E ARSENAL FINAL DA COALIZÃO',
    tituloEn: '[QUEST] COALITION FINAL DRYDOCK & WAR RESERVE',
    linhasPt: [
      'TODA A GUARNIÇÃO ALIADA TRABALHA EM SUA BIO-NAVE ANTES DA DRAGA!',
      'CASCO REFORÇADO, PAIÓIS CHEIOS E ARSENAL DE GUERRA PRONTOS.',
      'ESCOLHA O PACOTE DE BATALHA FINAL:',
    ],
    linhasEn: [
      'ALLIED CREWS SWARM YOUR HULL AHEAD OF THE FINAL BATTLE!',
      'PLATING MENDED, MAGAZINES TOPPED, WAR STORES UNLOCKED.',
      'SELECT YOUR FINAL BATTLE PACKAGE:',
    ],
    rotuloAPt: '[A] REPARO PESADO (+12 HP) + 5 MUNIÇÃO + SUCATA',
    detalheAPt: 'REPARA +12 HP CASCO + 5 MUNIÇÃO + SUCATA CAPTURA',
    rotuloAEn: '[A] HEAVY OVERHAUL (+12 HP) + 5 AMMO + SCRAP',
    detalheAEn: 'REPAIR +12 HULL HP + 5 AMMO + CAPTURE SCRAP',
    rotuloBPt: '[B] EQUIPAMENTO COMPLETO DE ELITE (CÓRTEX NV.2+)',
    detalheBPt: 'REPARA +12 HP + +1 ARMA + 4 MUN + 3 CMB!',
    rotuloBEn: '[B] FULL ELITE LOADOUT (CORTEX LV.2+)',
    detalheBEn: 'REPAIR +12 HP + +1 WEAPON + 4 AMMO + 3 FUEL!',
    rotuloCPt: '[C] RECARGA RÁPIDA (+10 HP + 4 CMB + 4 MUN)',
    detalheCPt: 'REPARA +10 HP + 4 COMBUSTÍVEL + 4 MUNIÇÃO',
    rotuloCEn: '[C] RAPID RESUPPLY (+10 HP + 4 FUEL + 4 AMMO)',
    detalheCEn: 'REPAIR +10 HP + 4 FUEL + 4 AMMO',
    reqBlue: { tipo: 'SISTEMA_NIVEL', sistema: 'Córtex de Navegação', nivelMin: 2, descPt: 'Córtex Nv.2+', descEn: 'Cortex Lv.2+' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, reparaCascoHp: 12, municao: 5, termoMoeda: 'Sucata_{captura}(S)' },
      p1: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, reparaCascoHp: 12, municao: 4, termoMoeda: 'Sucata_{captura}(S)' },
    },
    recompensaBlueOption: { danoCasco: 0, reparaCascoHp: 12, armaRecuperada: 1, municao: 4, combustivel: 3 },
  }),
  ev({
    id: 'AE_S8_EXP_POSTO_REPARO_AVANCADO',
    setorAlvo: 8,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'REPARO',
    tagMapaEn: 'REPAIR',
    seloPt: 'BOIA ALIADA',
    seloEn: 'REPAIR BUOY',
    tituloPt: 'BOIA AUTOMÁTICA DE REPARO E MUNIÇÃO DA RESISTÊNCIA',
    tituloEn: 'RESISTANCE AUTOMATED HULL REPAIR & AMMO BUOY',
    linhasPt: [
      'UMA ESTAÇÃO ESCONDIDA ENTRE OS DESTROÇOS DA DRAGA AINDA OPERA!',
      'APROVEITE OS SUPRIMENTOS GRATUITOS ANTES DO CHEFE FINAL:',
      'ESCOLHA O PACOTE:',
    ],
    linhasEn: [
      'A HIDDEN SUPPLY RIG AMID DREDGE TAILINGS STILL OPERATES!',
      'CLAIM EMERGENCY STORES BEFORE ENGAGING THE BOSS:',
      'CHOOSE YOUR PACKAGE:',
    ],
    rotuloAPt: '[A] REPARAR CASCO (+8 HP) E REABASTECER (+3 MUN)',
    detalheAPt: 'REPARA +8 HP CASCO + 3 MUNIÇÃO + 2 COMBUSTÍVEL',
    rotuloAEn: '[A] REPAIR HULL (+8 HP) & RESUPPLY (+3 AMMO)',
    detalheAEn: 'REPAIR +8 HULL HP + 3 AMMO + 2 FUEL',
    rotuloBPt: '[B] DESBLOQUEAR COFRE EXTRA COM POLVO ENGENHEIRO',
    detalheBPt: 'REPARA +10 HP + SUCATA CAPTURA + 4 MUNIÇÃO',
    rotuloBEn: '[B] UNLOCK BONUS CACHE VIA OCTOPUS ENGINEER',
    detalheBEn: 'REPAIR +10 HP + CAPTURE SCRAP + 4 AMMO',
    rotuloCPt: '[C] PEGAR SÓ COMBUSTÍVEL (+4 CMB) E PARTIR',
    detalheCPt: '+4 COMBUSTÍVEL E RETORNO IMEDIATO À CARTA',
    rotuloCEn: '[C] GRAB FUEL (+4 FUEL) AND DEPART',
    detalheCEn: '+4 FUEL AND IMMEDIATE RETURN TO CHART',
    reqBlue: { tipo: 'ESPECIE_MIN', especie: 'POLVO', qtdMin: 1, descPt: '1+ Polvo', descEn: '1+ Octopus' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, reparaCascoHp: 8, municao: 3, combustivel: 2 },
      p1: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, reparaCascoHp: 7, municao: 3, combustivel: 2 },
    },
    recompensaBlueOption: { danoCasco: 0, reparaCascoHp: 10, municao: 4, termoMoeda: 'Sucata_{captura}(S)' },
  }),
  ev({
    id: 'AE_S8_PER_ESTEIRA_DETRITOS_DRAGA',
    setorAlvo: 8,
    categoria: 'PERIGO',
    tagMapaPt: 'ESCÓRIA',
    tagMapaEn: 'SLAG!',
    seloPt: 'ESTEIRA DRAGA',
    seloEn: 'DREDGE WAKE',
    tituloPt: 'ESTEIRA DE ESCÓRIA FERVENTE DA DRAGA CONTINENTAL!',
    tituloEn: 'BOILING SLAG WAKE OF THE CONTINENTAL DREDGE!',
    linhasPt: [
      'A DRAGA PASSOU POR AQUI HÁ MINUTOS — O MAR FERVE DE ESCÓRIA!',
      'TURBULÊNCIA TÉRMICA RETIRA -35 kg DE SUSTENTAÇÃO E CEGA SONAR!',
      'UM BATEDOR DA GUARDA REAL FECHA O CAMINHO:',
    ],
    linhasEn: [
      'THE DREDGE PASSED MINUTES AGO — SLAG BOILS THE SEA!',
      'THERMAL WAKE DRAINS -35 kg LIFT AND CLOUDS SONAR!',
      'A ROYAL GUARD CUTTER BLOCKS THE LANE:',
    ],
    rotuloAPt: '[A] ATRAVESSAR A ESCÓRIA COMBATENDO (-35 kg)',
    detalheAPt: 'COMBATE OBRIGATÓRIO | SUSTENTAÇÃO -35 kg NA LUTA',
    rotuloAEn: '[A] FIGHT THROUGH BOILING SLAG (-35 kg LIFT)',
    detalheAEn: 'MANDATORY COMBAT | -35 kg HYDROFOIL LIFT',
    rotuloBPt: '[B] PLANAR ALTO COM MASTRO NV.3+ / SIFÃO NV.4+',
    detalheBPt: 'ANULA PENALIDADE DE SUSTENTAÇÃO + +3 MUNIÇÃO',
    rotuloBEn: '[B] HIGH-FOIL TRIM VIA STRUT LV.3+ / SIPHON LV.4+',
    detalheBEn: 'NEGATES LIFT PENALTY + +3 POST-COMBAT AMMO',
    rotuloCPt: '[C] GUARDA REAL BLOQUEIA RECUO',
    detalheCPt: 'COMBATE OBRIGATÓRIO PARA AVANÇAR',
    rotuloCEn: '[C] ROYAL GUARD BLOCKS RETREAT',
    detalheCEn: 'MUST ENGAGE TO ADVANCE',
    reqBlue: { tipo: 'SISTEMA_DUPLO_OU', sis1: 'Mastro do Foil', nv1: 3, sis2: 'Sifão de Propulsão', nv2: 4, descPt: 'Mastro Nv.3+ OU Sifão Nv.4+', descEn: 'Foil Strut Lv.3+ OR Siphon Lv.4+' },
    opcaoA: {
      p0: { tipo: 'COMBATE_BARCO', penalidadeSustentacaoKg: 35, danoCasco: 0 },
      p1: { tipo: 'COMBATE_BARCO', penalidadeSustentacaoKg: 35, danoCasco: 0 },
    },
    recompensaBlueOption: { danoCasco: 0, penalidadeSustentacaoKg: 0, municaoPosLuta: 3, termoMoeda: null },
  }),
  ev({
    id: 'AE_S8_EXP_VAGAO_SUPRIMENTOS_DRAGA',
    setorAlvo: 8,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'BARCAÇA',
    tagMapaEn: 'TENDER',
    seloPt: 'TENDER DRAGA',
    seloEn: 'DREDGE TENDER',
    tituloPt: 'BARCAÇA DE ABASTECIMENTO DESGARRADA DA DRAGA',
    tituloEn: 'STRAY RESUPPLY TENDER SEPARATED FROM THE DREDGE',
    linhasPt: [
      'UM REBOCADOR DE SUPRIMENTOS PERDEU CONTATO COM A NAVE-MÃE.',
      'CAPTURÁ-LO ANTES DO ALERTA RENDE ENORME QUANTIDADE DE SUCATA.',
      'DECIDA O ATAQUE:',
    ],
    linhasEn: [
      'A HEAVY SUPPLY TENDER LOST VISUAL WITH THE MOTHERSHIP.',
      'SEIZING IT BEFORE IT RADIOS YIELDS MASSIVE SCRAP.',
      'CHOOSE YOUR STRIKE:',
    ],
    rotuloAPt: '[A] ATACAR ANTES QUE TRANSMITA ALERTA',
    detalheAPt: '50% SUCATA CAPTURA + 3 MUN | 50% ESCOLTA CHEGA',
    rotuloAEn: '[A] STRIKE BEFORE DISTRESS CALL',
    detalheAEn: '50% CAPTURE SCRAP + 3 AMMO | 50% ESCORT ARRIVES',
    rotuloBPt: '[B] ABORDAGEM SILENCIOSA (TUBO + SANGUESSUGA/CARANG)',
    detalheBPt: 'SUCATA CAPTURA + +4 MUNIÇÃO + +3 COMBUSTÍVEL',
    rotuloBEn: '[B] SILENT BOARDING (TUBE + CRAB / LEECH SAC)',
    detalheBEn: 'CAPTURE SCRAP + +4 AMMO + +3 FUEL',
    rotuloCPt: '[C] NÃO REVELAR POSIÇÃO À DRAGA',
    detalheCPt: 'RETORNA À CARTA DO SETOR 8',
    rotuloCEn: '[C] CONCEAL YOUR POSITION',
    detalheCEn: 'RETURN TO SECTOR 8 CHART',
    reqBlue: { tipo: 'SISTEMA_OU_ORGAO', sistema: 'Tubo Pressurizado', nivelMin: 1, orgaoIds: ['BOLSA_SIMBIONTE_SANGUESSUGA'], descPt: 'Tubo Pressurizado OU Bolsa Sanguessuga', descEn: 'Boarding Tube OR Leech Sac' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, municao: 3, termoMoeda: 'Sucata_{captura}(S)' },
      p1: { tipo: 'COMBATE_BARCO', danoCasco: 0 },
    },
    recompensaBlueOption: { danoCasco: 0, municao: 4, combustivel: 3, termoMoeda: 'Sucata_{captura}(S)' },
  }),
  ev({
    id: 'AE_S8_EXP_SANTUARIO_ULTIMOS_GUARDIOES',
    setorAlvo: 8,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'GUARDIÃ',
    tagMapaEn: 'WARDENS',
    seloPt: 'GUARDIÕES S8',
    seloEn: 'LAST WARDENS',
    tituloPt: 'CÍRCULO DOS ÚLTIMOS GUARDIÕES OCEÂNICOS',
    tituloEn: 'CIRCLE OF THE LAST OCEANIC SYMBIONT WARDENS',
    linhasPt: [
      'VETERANOS DAS QUATRO ESPÉCIES REÚNEM FORÇAS PARA A LUTA FINAL.',
      'UM VOLUNTÁRIO DE ELITE OFERECE EMBARCAR SE HOUVER VAGA.',
      'RECEBA O REFORÇO:',
    ],
    linhasEn: [
      'VETERANS OF ALL FOUR SPECIES RALLY FOR THE LAST STAND.',
      'AN ELITE VOLUNTEER OFFERS TO JOIN YOUR CREW.',
      'ACCEPT THEIR REINFORCEMENT:',
    ],
    rotuloAPt: '[A] ACEITAR VOLUNTÁRIO + BIOMASSA DE GUERRA',
    detalheAPt: '+1 TRIPULANTE + BIOMASSA CIRÚRGICA',
    rotuloAEn: '[A] WELCOME VOLUNTEER + WAR BIOMASS',
    detalheAEn: '+1 CREWMATE + SURGICAL BIOMASS',
    rotuloBPt: '[B] UNIR CORAÇÕES (4+ TRIPULANTES VIVOS)',
    detalheBPt: '+1 TRIPULANTE + +1 ÓRGÃO + REPARA +6 HP CASCO',
    rotuloBEn: '[B] UNITE HEARTS (4+ LIVING CREWMATES)',
    detalheBEn: '+1 CREW + +1 ORGAN + REPAIR +6 HULL HP',
    rotuloCPt: '[C] RECEBER APENAS SUPRIMENTOS (+3 CMB + 3 MUN)',
    detalheCPt: '+3 COMBUSTÍVEL + 3 MUNIÇÃO',
    rotuloCEn: '[C] ACCEPT SUPPLIES ONLY (+3 FUEL + 3 AMMO)',
    detalheCEn: '+3 FUEL + 3 AMMO',
    reqBlue: { tipo: 'TOTAL_TRIPULACAO_MIN', qtdMin: 4, descPt: '4+ Tripulantes vivos', descEn: '4+ Living Crew' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, recrutaTripulante: 1, termoMoeda: 'Biomassa_{cirúrgica}(S)' },
      p1: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, recrutaTripulante: 1, termoMoeda: 'Biomassa_{bruta}(S)' },
    },
    recompensaBlueOption: { danoCasco: 0, recrutaTripulante: 1, orgaoIntacto: 1, reparaCascoHp: 6 },
  }),
  ev({
    id: 'AE_S8_EXP_SATELITE_DIRECAO_TIRO_DRAGA',
    setorAlvo: 8,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'BOIA CMD',
    tagMapaEn: 'CMD BUOY',
    seloPt: 'REDE TIRO S8',
    seloEn: 'FIRE CONTROL',
    tituloPt: 'BOIA DIRETORA DE ARTILHARIA DA DRAGA CONTINENTAL',
    tituloEn: 'CONTINENTAL DREDGE ARTILLERY TELEMETRY BUOY',
    linhasPt: [
      'ESTA BOIA CALCULA VETORES DE BOMBARDEIO E MAPEAMENTO DO SETOR 8.',
      'INVERTER SUA MATRIZ EXPÕE TODAS AS POSIÇÕES INIMIGAS!',
      'ESCOLHA A INVASÃO:',
    ],
    linhasEn: [
      'THIS BUOY COMPUTES FIRE VECTORS ACROSS SECTOR 8.',
      'INVERTING ITS MATRIX REVEALS EVERY HOSTILE POSITION!',
      'CHOOSE YOUR INTRUSION:',
    ],
    rotuloAPt: '[A] EXTRAIR MATRIZ À FORÇA',
    detalheAPt: '50% REVELA MAPA + SUCATA | 50% AUTODESTRUIÇÃO (-3 HP)',
    rotuloAEn: '[A] RIP TELEMETRY CORE BY FORCE',
    detalheAEn: '50% REVEALS MAP + SCRAP | 50% SELF-DESTRUCT (-3 HP)',
    rotuloBPt: '[B] INVADIR COM CÓRTEX NV.3+ / OLHO SONAR',
    detalheBPt: 'REVELA MAPA DO SETOR 8 + SUCATA CAPTURA + 3 MUN',
    rotuloBEn: '[B] HACK VIA CORTEX LV.3+ / ABYSSAL SONAR EYE',
    detalheBEn: 'REVEALS SECTOR 8 MAP + CAPTURE SCRAP + 3 AMMO',
    rotuloCPt: '[C] DESTRUIR DE LONGE E SEGUIR',
    detalheCPt: 'RETORNA À CARTA DO SETOR 8',
    rotuloCEn: '[C] SNIPE FROM AFAR AND MOVE ON',
    detalheCEn: 'RETURN TO SECTOR 8 CHART',
    reqBlue: { tipo: 'SISTEMA_OU_ORGAO', sistema: 'Córtex de Navegação', nivelMin: 3, orgaoIds: ['OLHO_SONAR_ABISSAL'], descPt: 'Córtex Nv.3+ OU Olho Sonar', descEn: 'Cortex Lv.3+ OR Sonar Eye' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, revelaMapaSetorial: true, termoMoeda: 'Sucata_{bruta}(S)' },
      p1: { tipo: 'RECOMPENSA_COM_CUSTO', danoCasco: 3, revelaMapaSetorial: true },
    },
    recompensaBlueOption: { danoCasco: 0, revelaMapaSetorial: true, municao: 3, termoMoeda: 'Sucata_{captura}(S)' },
  }),
  ev({
    id: 'AE_S8_SOS_NAVE_IRMA_DANIFICADA',
    setorAlvo: 8,
    categoria: 'SOS',
    tagMapaPt: 'BIO-IRMÃ',
    tagMapaEn: 'BIO-KIN',
    seloPt: 'BIO-NAVE CAÍDA',
    seloEn: 'FALLEN FOIL',
    tituloPt: 'BIO-NAVE IRMÃ EM TOUCHDOWN CRÍTICO APÓS EMBATE',
    tituloEn: 'SISTER BIO-CRAFT IN CRITICAL TOUCHDOWN AFTER SKIRMISH',
    linhasPt: [
      'A CAPITÃ FERIDA ENTREGA SUAS ARMAS RESERVAS PARA QUE VOCÊ VENÇA A DRAGA.',
      'ESTABILIZAR SEU CASCO TAMBÉM SALVA A TRIPULAÇÃO DELA.',
      'ESCOLHA O APOIO:',
    ],
    linhasEn: [
      'ITS WOUNDED CAPTAIN OFFERS HER WEAPONS SO YOU MAY SLAY THE DREDGE.',
      'STABILIZING HER HULL SAVES HER REMAINING CREW AS WELL.',
      'CHOOSE YOUR AID:',
    ],
    rotuloAPt: '[A] RECEBER ARSENAL E REBOCAR TRIPULAÇÃO',
    detalheAPt: '+1 ARMA NO PORÃO + 2 MUNIÇÃO',
    rotuloAEn: '[A] ACCEPT WEAPON & TOW SURVIVORS',
    detalheAEn: '+1 WEAPON IN HOLD + 2 AMMO',
    rotuloBPt: '[B] TRANSFUNDIR BIOMASSA COM OSMOSE / BRANQUIAL NV.3+',
    detalheBPt: '+1 ARMA + +1 TRIPULANTE + REPARA +5 HP CASCO',
    rotuloBEn: '[B] TRANSFUSE VIA REVERSE OSMOSIS / GILL LV.3+',
    detalheBEn: '+1 WEAPON + +1 CREW + REPAIR +5 HULL HP',
    rotuloCPt: '[C] RECEBER APENAS MUNIÇÃO (+4 MUN)',
    detalheCPt: '+4 MUNIÇÃO SEM PESO NO PORÃO',
    rotuloCEn: '[C] TAKE AMMO RESERVES ONLY (+4 AMMO)',
    detalheCEn: '+4 AMMO WITH ZERO HOLD WEIGHT',
    reqBlue: { tipo: 'SISTEMA_OU_ORGAO', sistema: 'Bomba Branquial', nivelMin: 3, orgaoIds: ['BRANQUIA_OSMOSE_REVERSA', 'MEDULA_REGENERATIVA_CORAL'], descPt: 'Branquial Nv.3+ OU Osmose/Medula', descEn: 'Gill Pump Lv.3+ OR Osmosis/Marrow' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, armaRecuperada: 1, municao: 2 },
      p1: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, armaRecuperada: 1, municao: 2 },
    },
    recompensaBlueOption: { danoCasco: 0, armaRecuperada: 1, recrutaTripulante: 1, reparaCascoHp: 5 },
  }),
  ev({
    id: 'AE_S8_EXP_BROCA_DESCARTADA_DRAGA',
    setorAlvo: 8,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'BROCA',
    tagMapaEn: 'DRILLHD',
    seloPt: 'DENTE DRAGA',
    seloEn: 'DREDGE BIT',
    tituloPt: 'CABEÇA DE BROCA CONTINENTAL DESCARTADA PELA NAVE-MÃE',
    tituloEn: 'SHED CONTINENTAL DRILL-HEAD OF THE MOTHERSHIP',
    linhasPt: [
      'UM CONE DE DIAMANTE INDUSTRIAL DO TAMANHO DE UM PRÉDIO JAZ NA AREIA.',
      'ESTUDAR SUAS JUNTAS REVELA PONTOS FRACOS E LIGAS RARAS!',
      'ESCOLHA A ANÁLISE:',
    ],
    linhasEn: [
      'A BUILDING-SIZED DIAMOND DRILL CONE LIES HALF-BURIED.',
      'DISSECTING ITS SEAMS YIELDS SUPER-ALLOYS AND INTEL!',
      'SELECT YOUR OPERATION:',
    ],
    rotuloAPt: '[A] CORTAR LIGAS SUPERCONDUTORAS EXTERNAS',
    detalheAPt: 'SUCATA CAPTURA + REPARA +4 HP CASCO',
    rotuloAEn: '[A] STRIP SUPERCONDUCTING ALLOY RINGS',
    detalheAEn: 'CAPTURE SCRAP + REPAIR +4 HULL HP',
    rotuloBPt: '[B] PERFURAR NÚCLEO COM CORTADOR / LANÇA TÉRMICA',
    detalheBPt: 'SUCATA CAPTURA + +4 MUNIÇÃO + REPARA +6 HP',
    rotuloBEn: '[B] CORE-SLICE VIA THERMAL BEAM / FOCAL LANCE',
    detalheBEn: 'CAPTURE SCRAP + +4 AMMO + REPAIR +6 HULL HP',
    rotuloCPt: '[C] SEGUIR DIRETO RUMO À DRAGA',
    detalheCPt: 'RETORNA À CARTA DO SETOR 8',
    rotuloCEn: '[C] PRESS ON TOWARD THE DREDGE',
    detalheCEn: 'RETURN TO SECTOR 8 CHART',
    reqBlue: { tipo: 'ARMA_QUALQUER', armaIds: ['CORTADOR_TERMICO_PLASMA', 'CORTADOR_CASCO_ABISSAL', 'LANCA_TERMICA_FOCAL'], descPt: 'Qualquer Feixe Térmico', descEn: 'Any Thermal Beam' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, reparaCascoHp: 4, termoMoeda: 'Sucata_{captura}(S)' },
      p1: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, reparaCascoHp: 3, termoMoeda: 'Sucata_{captura}(S)' },
    },
    recompensaBlueOption: { danoCasco: 0, reparaCascoHp: 6, municao: 4, termoMoeda: 'Sucata_{captura}(S)' },
  }),
  ev({
    id: 'AE_S8_EXP_FONTE_ABISSAL_PURA_FINAL',
    setorAlvo: 8,
    categoria: 'EXPLORACAO',
    tagMapaPt: 'OASIS',
    tagMapaEn: 'OASIS',
    seloPt: 'OÁSIS PURO',
    seloEn: 'PURE OASIS',
    tituloPt: 'ÚLTIMO OÁSIS BIOLÓGICO INTACTO ANTES DA ZONA MORTA',
    tituloEn: 'LAST UNTOUCHED BIO-OASIS BEFORE THE DEAD ZONE',
    linhasPt: [
      'UM BOLSÃO DE ÁGUA CRISTALINA RESISTE À POLUIÇÃO DA DRAGA.',
      'A VIDA MARINHA CANALIZA SUAS ÚLTIMAS ENERGIAS PARA SUA CARCAÇA.',
      'ABSORVA A DÁDIVA:',
    ],
    linhasEn: [
      'A POCKET OF CRYSTAL WATER DEFIES THE DREDGE PLUME.',
      'MARINE SYMBIONTS CHANNEL THEIR FINAL VIGOR INTO YOUR HULL.',
      'RECEIVE THEIR GIFT:',
    ],
    rotuloAPt: '[A] REGENERAR QUITINA (+9 HP) + BIOMASSA',
    detalheAPt: 'REPARA +9 HP CASCO + BIOMASSA CIRÚRGICA',
    rotuloAEn: '[A] REGENERATE CHITIN (+9 HP) + BIOMASS',
    detalheAEn: 'REPAIR +9 HULL HP + SURGICAL BIOMASS',
    rotuloBPt: '[B] SÍNTESE TOTAL (ENZIMA SUCATA / GÂNGLIO MUNIÇÃO)',
    detalheBPt: 'REPARA +10 HP + 4 MUNIÇÃO + 4 COMBUSTÍVEL!',
    rotuloBEn: '[B] FULL SYNTHESIS (SCRAP ENZYME / AMMO GANGLION)',
    detalheBEn: 'REPAIR +10 HP + 4 AMMO + 4 FUEL!',
    rotuloCPt: '[C] PARTIR IMEDIATAMENTE',
    detalheCPt: 'RETORNA À CARTA DO SETOR 8',
    rotuloCEn: '[C] DEPART IMMEDIATELY',
    detalheCEn: 'RETURN TO SECTOR 8 CHART',
    reqBlue: { tipo: 'ORGAO_QUALQUER', orgaoIds: ['ENZIMA_DIGESTORA_SUCATA', 'GANGLIO_RECICLADOR_MUNICAO', 'MEDULA_REGENERATIVA_CORAL'], descPt: 'Enzima / Gânglio Munição / Medula', descEn: 'Enzyme / Ammo Ganglion / Marrow' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, reparaCascoHp: 9, termoMoeda: 'Biomassa_{cirúrgica}(S)' },
      p1: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, reparaCascoHp: 8, termoMoeda: 'Biomassa_{bruta}(S)' },
    },
    recompensaBlueOption: { danoCasco: 0, reparaCascoHp: 10, municao: 4, combustivel: 4 },
  }),
  ev({
    id: 'AE_S8_SOS_SUBMARINO_DESERTOR_FINAL',
    setorAlvo: 8,
    categoria: 'SOS',
    tagMapaPt: 'MOTIM',
    tagMapaEn: 'MUTINY',
    seloPt: 'MOTIM ELITE',
    seloEn: 'ELITE MUTINY',
    tituloPt: 'CAPITÃO HUMANO DESERTOR RECUSANDO ORDEM DE EXTERMÍNIO',
    tituloEn: 'DEFECTING HUMAN CAPTAIN REFUSING EXTERMINATION ORDER',
    linhasPt: [
      'UM SUBMARINO DESERTOU DA FROTA PESSOAL DA DRAGA CONTINENTAL!',
      'ELE OFERECE SUAS OGIVAS E DADOS DE ESCUDO SE VOCÊ COBRIR SUA FUGA.',
      'DECIDA SE CONFIA NO DESERTOR:',
    ],
    linhasEn: [
      'A SUBMARINE DEFECTED FROM THE DREDGE PERSONAL ESCORT!',
      'ITS CAPTAIN OFFERS TORPEDOES AND SHIELD CODES FOR SAFE PASSAGE.',
      'DO YOU TRUST THE DEFECTOR?',
    ],
    rotuloAPt: '[A] ACEITAR ACORDO E RECEBER OGIVAS',
    detalheAPt: '50% +5 MUNIÇÃO + SUCATA | 50% EMBOSCADA FALSA!',
    rotuloAEn: '[A] ACCEPT TRUCE & RECEIVE WARHEADS',
    detalheAEn: '50% +5 AMMO + SCRAP | 50% FALSE-FLAG AMBUSH!',
    rotuloBPt: '[B] ESCANEAR INTENÇÃO COM OLHO SONAR / CÓRTEX NV.2+',
    detalheBPt: 'ACORDO VERIFICADO: +5 MUNIÇÃO + +1 ARMA + SUCATA!',
    rotuloBEn: '[B] VERIFY WEAPONS DOWN VIA SONAR EYE / CORTEX LV.2+',
    detalheBEn: 'VERIFIED ALLY: +5 AMMO + +1 WEAPON + CAPTURE SCRAP!',
    rotuloCPt: '[C] NÃO ARRISCAR TRAIÇÃO NA HORA FINAL',
    detalheCPt: 'RETORNA À CARTA DO SETOR 8',
    rotuloCEn: '[C] DO NOT RISK TREACHERY',
    detalheCEn: 'RETURN TO SECTOR 8 CHART',
    reqBlue: { tipo: 'SISTEMA_OU_ORGAO', sistema: 'Córtex de Navegação', nivelMin: 2, orgaoIds: ['OLHO_SONAR_ABISSAL'], descPt: 'Córtex Nv.2+ OU Olho Sonar', descEn: 'Cortex Lv.2+ OR Sonar Eye' },
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, municao: 5, termoMoeda: 'Sucata_{bruta}(S)' },
      p1: { tipo: 'COMBATE_BARCO', danoCasco: 0 },
    },
    recompensaBlueOption: { danoCasco: 0, municao: 5, armaRecuperada: 1, termoMoeda: 'Sucata_{captura}(S)' },
  }),
  ev({
    id: 'AE_S8_PER_BARRAGEM_DRAGA_ORBITAL',
    setorAlvo: 8,
    categoria: 'PERIGO',
    tagMapaPt: 'MORTEIR',
    tagMapaEn: 'MORTAR',
    seloPt: 'BARRAGEM S8!',
    seloEn: 'SIEGE FIRE!',
    tituloPt: 'BARRAGEM DE MORTEIROS ACÚSTICOS DA GUARDA DA DRAGA',
    tituloEn: 'ACOUSTIC MORTAR BARRAGE OF THE DREDGE VANGUARD',
    linhasPt: [
      'A VANGUARDA DA DRAGA DISPARA CARGAS DE PROFUNDIDADE NO CANAL FINAL!',
      'UM CRUZADOR PESADO FECHA A PASSAGEM RUMO À NAVE-MÃE!',
      'ESCOLHA SUA MANOBRA DE ENTRADA:',
    ],
    linhasEn: [
      'THE DREDGE VANGUARD RAINS DEPTH CHARGES ACROSS THE FINAL CHANNEL!',
      'A HEAVY CRUISER BLOCKS THE APPROACH TO THE MOTHERSHIP!',
      'CHOOSE YOUR BREAKTHROUGH MANEUVER:',
    ],
    rotuloAPt: '[A] AVANÇAR EM FOIL RASANTE E ENGAJAR',
    detalheAPt: 'COMBATE OBRIGATÓRIO | ONDAS SÍSMICAS NO CANAL',
    rotuloAEn: '[A] SKIM LOW ON FOIL AND ENGAGE',
    detalheAEn: 'MANDATORY COMBAT | SEISMIC SHOCKWAVES',
    rotuloBPt: '[B] MERGULHAR EM SOMBRA (TINTA FURTIVA / PRÉ-IGNIÇÃO)',
    detalheBPt: 'EMBOSCADA PERFEITA: REPARA +5 HP + +3 MUNIÇÃO PÓS-LUTA',
    rotuloBEn: '[B] SHADOW-DIVE (CLOAKING INK / PRE-IGNITER)',
    detalheBEn: 'PERFECT AMBUSH: REPAIR +5 HP + +3 POST-FIGHT AMMO',
    rotuloCPt: '[C] CANAL CERCADO — RECUO IMPOSSÍVEL',
    detalheCPt: 'ROMPA A VANGUARDA PARA ALCANÇAR A DRAGA',
    rotuloCEn: '[C] CHANNEL SEALED — NO RETREAT',
    detalheCEn: 'BREAK THE VANGUARD TO REACH THE DREDGE',
    reqBlue: { tipo: 'SISTEMA_OU_ORGAO', sistema: 'Glândula de Tinta Furtiva', nivelMin: 1, orgaoIds: ['SINAPSE_PRE_IGNICAO', 'CRISTA_REFRACAO_ACUSTICA'], descPt: 'Tinta Furtiva OU Pré-Ignição/Crista', descEn: 'Cloaking Ink OR Pre-Igniter/Crest' },
    opcaoA: {
      p0: { tipo: 'COMBATE_BARCO', danoCasco: 0 },
      p1: { tipo: 'COMBATE_BARCO', danoCasco: 2 },
    },
    recompensaBlueOption: { danoCasco: 0, reparaCascoHp: 5, municaoPosLuta: 3, termoMoeda: null },
  }),
]);

export const LISTA_45_EVENTOS_S5A8 = Object.freeze(
  [...EVENTOS_AE_SETORES_5A8_PARTE1, ...EVENTOS_AE_SETORES_5A8_PARTE2].map((item) =>
    Object.freeze({
      ...item,
      id: String(item.id).replace(/\s+/g, ''),
      tituloPt: String(item.tituloPt ?? '').trim().replace(/\s+/g, ' '),
      tituloEn: String(item.tituloEn ?? '').trim().replace(/\s+/g, ' '),
      tagMapaPt: String(item.tagMapaPt).trim(),
      tagMapaEn: String(item.tagMapaEn).trim(),
    })
  )
);

export const CATALOGO_100_EVENTOS_STEAM = Object.freeze([
  ...CATALOGO_TEMPLATES_EVENTOS_45A.map((b) =>
    Object.freeze({
      ...b,
      edicao: 'CLASSICO_GDD',
      ehEventoQuest: false,
    })
  ),
  ...LISTA_42_EVENTOS_S1A4.map((e) => Object.freeze({ ...e, edicao: 'STEAM_AE' })),
  ...LISTA_45_EVENTOS_S5A8.map((e) => Object.freeze({ ...e, edicao: 'STEAM_AE' })),
]);

export function obterEventosAeSetores5a8() {
  return LISTA_45_EVENTOS_S5A8;
}

export function obterCatalogo100EventosSteam() {
  return CATALOGO_100_EVENTOS_STEAM;
}

export function resolverTemplateEventoUnificado(idEvento) {
  const idLimpo = String(idEvento ?? '').replace(/\s+/g, '');
  return CATALOGO_100_EVENTOS_STEAM.find((e) => e.id === idLimpo) ?? null;
}

function extrairIdsArmasDaNave(naveOuKit) {
  const ids = new Set();
  for (const s of naveOuKit?.armasAtivas ?? naveOuKit?.armasEquipadas ?? []) {
    const a = s?.arma !== undefined ? s.arma : s;
    const id = a?.chassiId ?? a?.idArma ?? a?.id ?? (typeof a === 'string' ? a : null);
    if (id) ids.add(String(id).toUpperCase());
  }
  for (const p of naveOuKit?.poraoCarga ?? naveOuKit?.porao ?? []) {
    const it = p?.item !== undefined ? p.item : p;
    const id = it?.chassiId ?? it?.id ?? (typeof it === 'string' ? it : null);
    if (id) ids.add(String(id).toUpperCase());
  }
  return ids;
}

function extrairIdsOrgaosDaNave(naveOuKit) {
  const ids = new Set();
  for (const s of naveOuKit?.armasAtivas ?? naveOuKit?.armasEquipadas ?? []) {
    const a = s?.arma !== undefined ? s.arma : s;
    for (const oId of a?.orgaosEnxertados ?? []) {
      if (oId) ids.add(String(oId).toUpperCase());
    }
  }
  for (const p of naveOuKit?.poraoCarga ?? naveOuKit?.porao ?? []) {
    const it = p?.item !== undefined ? p.item : p;
    const id = it?.id ?? (typeof it === 'string' ? it : null);
    if (id) ids.add(String(id).toUpperCase());
  }
  return ids;
}

function contarEspecieViva(naveOuKit, especie) {
  const espUp = String(especie).toUpperCase();
  if (Array.isArray(naveOuKit?.tripulacao)) {
    return naveOuKit.tripulacao.filter(
      (t) => Number(t.hpAtual ?? 1) > 0 && t.vivo !== false && String(t.especie).toUpperCase() === espUp
    ).length;
  }
  const mapaEsp = {
    POLVO: 'Polvo',
    ARRAIA: 'Arraia Elétrica',
    BAIACU: 'Baiacu Espinhoso',
    CARANGUEJO: 'Caranguejo Anfíbio',
  };
  return Number(naveOuKit?.tripulacao?.[mapaEsp[espUp]] ?? 0);
}

/**
 * Avalia elegibilidade da Opção Azul (B) para todos os 100 eventos (17 GDD clássicos + 83 Steam AE).
 */
export function avaliarElegibilidadeBlueOptionSteam(template, naveOuKit) {
  if (!template || !naveOuKit) return false;
  if (template.requisitoBlueOption) {
    const kit =
      naveOuKit.tripulacao && !Array.isArray(naveOuKit.tripulacao)
        ? naveOuKit
        : extrairKitDaNave(naveOuKit);
    return kitCumpreRequisitoBlueOption(template.requisitoBlueOption, kit);
  }
  const req = template.reqBlue;
  if (!req) return true;
  const kit =
    naveOuKit.tripulacao && !Array.isArray(naveOuKit.tripulacao)
      ? naveOuKit
      : extrairKitDaNave(naveOuKit);
  const armasIds = extrairIdsArmasDaNave(naveOuKit);
  const orgaosIds = extrairIdsOrgaosDaNave(naveOuKit);
  const temArma = (lista) => (lista ?? []).some((id) => armasIds.has(String(id).toUpperCase()));
  const temOrgao = (lista) => (lista ?? []).some((id) => orgaosIds.has(String(id).toUpperCase()));
  const nvSis = (nomeSis) => Number(kit.sistemas?.[nomeSis] ?? 0);

  switch (req.tipo) {
    case 'ESPECIE_MIN':
      return contarEspecieViva(naveOuKit, req.especie) >= Number(req.qtdMin ?? 1);
    case 'DUPLA_ESPECIE':
      return contarEspecieViva(naveOuKit, req.esp1) >= 1 && contarEspecieViva(naveOuKit, req.esp2) >= 1;
    case 'TOTAL_TRIPULACAO_MIN': {
      const tot = ['POLVO', 'ARRAIA', 'BAIACU', 'CARANGUEJO'].reduce((a, e) => a + contarEspecieViva(naveOuKit, e), 0);
      return tot >= Number(req.qtdMin ?? 4);
    }
    case 'SISTEMA_NIVEL':
      return nvSis(req.sistema) >= Number(req.nivelMin ?? 1);
    case 'SISTEMA_DUPLO_OU':
      return nvSis(req.sis1) >= Number(req.nv1 ?? 1) || nvSis(req.sis2) >= Number(req.nv2 ?? 1);
    case 'ARMA_QUALQUER':
      return temArma(req.armaIds);
    case 'ORGAO_QUALQUER':
      return temOrgao(req.orgaoIds);
    case 'ESPECIE_OU_ARMA':
      return contarEspecieViva(naveOuKit, req.especie) >= Number(req.qtdMin ?? 1) || temArma(req.armaIds);
    case 'ESPECIE_OU_ORGAO':
      return contarEspecieViva(naveOuKit, req.especie) >= Number(req.qtdMin ?? 1) || temOrgao(req.orgaoIds);
    case 'SISTEMA_OU_ESPECIE':
      return nvSis(req.sistema) >= Number(req.nivelMin ?? 1) || contarEspecieViva(naveOuKit, req.especie) >= 1;
    case 'SISTEMA_OU_ARMA':
      return nvSis(req.sistema) >= Number(req.nivelMin ?? 1) || temArma(req.armaIds);
    case 'SISTEMA_OU_ORGAO':
      return nvSis(req.sistema) >= Number(req.nivelMin ?? 1) || temOrgao(req.orgaoIds);
    case 'ARMA_OU_ORGAO':
      return temArma(req.armaIds) || temOrgao(req.orgaoIds);
    case 'REATOR_OU_ORGAO': {
      const reator = Number(naveOuKit?.reatorBarrasCompradas ?? naveOuKit?.barrasReatorTotais ?? 7);
      return reator >= Number(req.barrasReatorMin ?? 10) || temOrgao(req.orgaoIds);
    }
    default:
      return false;
  }
}

/**
 * Sorteia templates de evento para as boias de um setor na Edição Steam, garantindo
 * ZERO repetição em toda a run de 8 setores (`idsUsadosNaRun`).
 */
export function sortearEventoCampanhaSteamSemRepeticao(
  seedPartida,
  setorNumero,
  categoriaDesejada = 'EXPLORACAO',
  idsUsadosNaRun = [],
  indiceSal = 0
) {
  const seedStr = String(seedPartida || 'SEED_STEAM_100');
  const s = Math.max(1, Math.min(8, Number(setorNumero) || 1));
  const usados = new Set(idsUsadosNaRun ?? []);
  const cat = ['SOS', 'EXPLORACAO', 'PERIGO'].includes(categoriaDesejada) ? categoriaDesejada : 'EXPLORACAO';

  // Prioriza eventos não-quest do setor atual ou adjacente (+/-1), depois qualquer evento não usado da categoria,
  // e por fim qualquer evento não-quest ainda inédito na run inteira (zero repetição em 8 setores!)
  const candidatosSetor = CATALOGO_100_EVENTOS_STEAM.filter(
    (e) => !e.ehEventoQuest && e.categoria === cat && !usados.has(e.id) && (!e.setorAlvo || Math.abs(e.setorAlvo - s) <= 1)
  );
  const candidatosGerais = CATALOGO_100_EVENTOS_STEAM.filter(
    (e) => !e.ehEventoQuest && e.categoria === cat && !usados.has(e.id)
  );
  const candidatosIneditosRun = CATALOGO_100_EVENTOS_STEAM.filter(
    (e) => !e.ehEventoQuest && !usados.has(e.id)
  );
  const fallback = CATALOGO_100_EVENTOS_STEAM.filter((e) => !e.ehEventoQuest && e.categoria === cat);
  const pool =
    candidatosSetor.length > 0
      ? candidatosSetor
      : candidatosGerais.length > 0
        ? candidatosGerais
        : candidatosIneditosRun.length > 0
          ? candidatosIneditosRun
          : fallback;

  const u = streamSorteioTemplates(seedStr, s * 10 + (cat === 'SOS' ? 1 : cat === 'PERIGO' ? 2 : 3), indiceSal);
  const idx = Math.min(pool.length - 1, Math.floor(u * pool.length));
  return pool[idx];
}

/**
 * Planta um marcador `[QUEST]` em uma boia futura não-visitada (à direita da posição atual) no mapa setorial!
 */
export function plantarBoiaQuestNoSetor(mapaSetorial, questTemplateId) {
  if (!mapaSetorial || !Array.isArray(mapaSetorial.nos) || !questTemplateId) {
    return mapaSetorial;
  }
  const tplQuest = resolverTemplateEventoUnificado(questTemplateId);
  if (!tplQuest) return mapaSetorial;

  const noAtual = mapaSetorial.nos.find((n) => n.id === mapaSetorial.noAtualId);
  const xAtual = Number(noAtual?.xMn ?? 0);

  const candidatosAvante = mapaSetorial.nos.filter(
    (n) =>
      !n.visitado &&
      n.id !== mapaSetorial.noAtualId &&
      n.tipoNo !== 'ENTRADA' &&
      n.tipoNo !== 'SAIDA' &&
      n.tipoNo !== 'LOJA' &&
      !n.ehQuestAtiva &&
      Number(n.xMn ?? 0) > xAtual + 4
  );

  // Fallback Tier 2: qualquer boia não-visitada válida no setor atual caso o jogador já esteja perto da saída
  const candidatosFallback =
    candidatosAvante.length > 0
      ? candidatosAvante
      : mapaSetorial.nos.filter(
          (n) =>
            !n.visitado &&
            n.id !== mapaSetorial.noAtualId &&
            n.tipoNo !== 'ENTRADA' &&
            n.tipoNo !== 'SAIDA' &&
            n.tipoNo !== 'LOJA' &&
            !n.ehQuestAtiva
        );

  // Spillover Tier 3: se literalmente não restam boias livres neste setor (ex: última boia antes da SAIDA),
  // preserva a quest em `questPendenteProximoSetor` para plantar imediatamente na entrada do próximo setor!
  if (candidatosFallback.length === 0) {
    return congelarEv({
      ...mapaSetorial,
      questPendenteProximoSetor: tplQuest.id,
    });
  }

  candidatosFallback.sort((a, b) => Math.abs(Number(a.xMn) - (xAtual + 38)) - Math.abs(Number(b.xMn) - (xAtual + 38)));
  const alvoNo = candidatosFallback[0];

  return congelarEv({
    ...mapaSetorial,
    questPendenteProximoSetor: null,
    nos: mapaSetorial.nos.map((n) =>
      n.id === alvoNo.id
        ? {
            ...n,
            tipoNo: 'EXPLORACAO',
            idTemplateEvento: tplQuest.id,
            ehQuestAtiva: true,
            tagMapa: 'QUEST!',
            subtipoCurto: 'QUEST!',
          }
        : n
    ),
  });
}

function resolverMoedaSteam(termoMoeda, setorNumero) {
  const linha = CURVA_SAQUE_SETORIAL_56C[setorNumero] ?? CURVA_SAQUE_SETORIAL_56C[1];
  if (!termoMoeda) return { sucata: 0, biomassa: 0, totalMoeda: 0, tetoCapturaSetor: linha.barcoCapturaSucata };
  const mapa = {
    'Sucata_{bruta}(S)': { sucata: linha.barcoBrutoSucata, biomassa: 0 },
    'Sucata_{captura}(S)': { sucata: linha.barcoCapturaSucata, biomassa: 0 },
    'Biomassa_{bruta}(S)': { sucata: 0, biomassa: linha.monstroBrutoBiomassa },
    'Biomassa_{cirúrgica}(S)': { sucata: 0, biomassa: linha.monstroCirurgicoBiomassa },
  };
  const res = mapa[termoMoeda] ?? { sucata: 0, biomassa: 0 };
  return {
    ...res,
    totalMoeda: res.sucata + res.biomassa,
    tetoCapturaSetor: linha.barcoCapturaSucata,
  };
}

/**
 * Resolve visita a qualquer um dos 100 eventos da Edição Steam preservando 100% da matemática de `resolverVisitaNoMapa`.
 */
export function resolverVisitaNoMapaSteam({
  seedPartida,
  setorNumero = 1,
  relogioSetorHoras = 0,
  noMapa,
  kitOuNave,
  opcaoEscolhida = 'A',
  modalidadeVitoriaCombate = 'DESTRUICAO_BRUTA',
  velocidadeFrenteMnH = VELOCIDADE_FRENTE_CORPORATIVA_MN_H,
  frenteCorporacaoMn: frenteCorporacaoExplicitaMn = null,
  municaoAtual = null,
}) {
  const seedStr = String(seedPartida || 'SEED_STEAM');
  const velFrente = Number.isFinite(Number(velocidadeFrenteMnH))
    ? Number(velocidadeFrenteMnH)
    : VELOCIDADE_FRENTE_CORPORATIVA_MN_H;
  const frenteCorporacaoMn =
    frenteCorporacaoExplicitaMn !== null && frenteCorporacaoExplicitaMn !== undefined
      ? Number(frenteCorporacaoExplicitaMn)
      : Math.round(velFrente * relogioSetorHoras * 100) / 100;
  const linhaSaque = CURVA_SAQUE_SETORIAL_56C[setorNumero] ?? CURVA_SAQUE_SETORIAL_56C[1];

  if (relogioSetorHoras > 0 && Number(noMapa?.xMn ?? 999) <= frenteCorporacaoMn) {
    return congelarEv({
      estadoNo: 'FROTA_PRINCIPAL_CORPORACAO',
      combateObrigatorio: true,
      bonusBarreiraInimigo: 1,
      opcoesDisponiveis: [],
      saquePosCombate: { sucata: 0, biomassa: 0, combustivel: 1, municao: 0 },
    });
  }

  if (noMapa?.tipoNo === 'SOS' && noMapa?.tPrazoHoras != null && relogioSetorHoras > Number(noMapa.tPrazoHoras)) {
    const sucataModalidade =
      modalidadeVitoriaCombate === 'CAPTURA_INTACTA' ? linhaSaque.barcoCapturaSucata : linhaSaque.barcoBrutoSucata;
    return congelarEv({
      estadoNo: 'ZONA_MORTA_INDUSTRIALIZADA',
      combateObrigatorio: true,
      bonusBarreiraInimigo: 0,
      opcoesDisponiveis: [],
      saquePosCombate: { sucata: Math.floor(0.5 * sucataModalidade), biomassa: 0, combustivel: 0, municao: 0 },
    });
  }

  const template = resolverTemplateEventoUnificado(noMapa?.idTemplateEvento);
  if (!template) {
    return congelarEv({
      estadoNo: 'COMBATE_PADRAO',
      combateObrigatorio: noMapa?.tipoNo === 'COMBATE',
      opcoesDisponiveis: [],
    });
  }

  const munMinOpA = Number(template.exigeMunicaoOpcaoA ?? 0);
  const temMunOpA = municaoAtual === null || municaoAtual === undefined || Number(municaoAtual) >= munMinOpA;
  const cumpreBlue = avaliarElegibilidadeBlueOptionSteam(template, kitOuNave);
  const opcoesDisponiveis = [];
  if (temMunOpA) opcoesDisponiveis.push('A');
  if (cumpreBlue) opcoesDisponiveis.push('B');
  if (template.categoria !== 'PERIGO') opcoesDisponiveis.push('C');
  if (opcoesDisponiveis.length === 0) opcoesDisponiveis.push('C');

  if (opcaoEscolhida === 'C') {
    if (template.categoria === 'PERIGO') {
      return congelarEv({
        estadoNo: 'EVENTO_ATIVO',
        aceito: false,
        marcadorRejeicao: 'BLOQUEADO_COMBATE_OBRIGATORIO',
        combateObrigatorio: true,
        opcoesDisponiveis,
      });
    }
    const recC = template.ehEventoQuest && template.id === 'AE_Q1_ESCONDERIJO_COSTEIRO'
      ? { combustivel: 4 }
      : template.ehEventoQuest && template.id === 'AE_Q2_SANTUARIO_MANTA'
        ? { combustivel: 4 }
        : template.ehEventoQuest && template.id === 'AE_Q3_COFRE_CORALINO'
          ? { termoMoeda: 'Biomassa_{cirúrgica}(S)' }
          : template.ehEventoQuest && template.id === 'AE_Q4_COMBOIO_PROTOTIPO'
            ? { combustivel: 4, termoMoeda: 'Sucata_{captura}(S)' }
            : template.ehEventoQuest && template.id === 'AE_Q5_ALTAR_SOMBRA_ABISSAL'
              ? { combustivel: 5, municao: 2 }
              : template.ehEventoQuest && template.id === 'AE_Q6_COMBOIO_NEUTRALIZADOR'
                ? { municao: 5, termoMoeda: 'Sucata_{bruta}(S)' }
                : template.ehEventoQuest && template.id === 'AE_Q7_CAMARA_TEMPERA_MAGMA'
                  ? { municao: 5, combustivel: 3, termoMoeda: 'Sucata_{captura}(S)' }
                  : template.ehEventoQuest && template.id === 'AE_Q8_ARSENAL_FINAL_COALIZAO'
                    ? { reparaCascoHp: 10, combustivel: 4, municao: 4 }
                    : {};
    const moedaC = resolverMoedaSteam(recC.termoMoeda ?? null, setorNumero);
    return congelarEv({
      estadoNo: 'EVENTO_ATIVO',
      aceito: true,
      resultadoEscolha: 'RECUO_SEGURO',
      combateObrigatorio: false,
      danoCasco: 0,
      recompensaOpcaoA: recC,
      moedaGerada: moedaC,
      opcoesDisponiveis,
    });
  }

  if (opcaoEscolhida === 'B') {
    if (!cumpreBlue) {
      return congelarEv({
        estadoNo: 'EVENTO_ATIVO',
        aceito: false,
        marcadorRejeicao: 'PRECONDICAO_NAO_ATENDIDA',
        combateObrigatorio: template.categoria === 'PERIGO',
        opcoesDisponiveis,
      });
    }
    const moeda = resolverMoedaSteam(template.recompensaBlueOption.termoMoeda, setorNumero);
    return congelarEv({
      estadoNo: 'EVENTO_ATIVO',
      aceito: true,
      resultadoEscolha: 'SUCESSO_CRITICO_BLUE_OPTION',
      combateObrigatorio: template.categoria === 'PERIGO',
      danoCasco: 0,
      recompensaBlueOption: template.recompensaBlueOption,
      plantaQuestId: template.recompensaBlueOption.plantaQuestId ?? null,
      moedaGerada: moeda,
      opcoesDisponiveis,
    });
  }

  if (!temMunOpA) {
    return congelarEv({
      estadoNo: 'EVENTO_ATIVO',
      aceito: false,
      marcadorRejeicao: 'MUNICAO_INSUFICIENTE_OPCAO_A',
      combateObrigatorio: false,
      opcoesDisponiveis,
    });
  }

  const paridade = streamEventoOpcaoA(seedStr, setorNumero, String(noMapa?.id ?? 'NO_0')) % 2;
  const ramoA = paridade === 0 ? template.opcaoA.p0 : template.opcaoA.p1;
  const moeda = resolverMoedaSteam(ramoA.termoMoeda, setorNumero);
  const levaACombate = String(ramoA.tipo ?? '').startsWith('COMBATE_');

  return congelarEv({
    estadoNo: 'EVENTO_ATIVO',
    aceito: true,
    resultadoEscolha: paridade === 0 ? 'SUCESSO_PADRAO_A' : 'COMPLICACAO_PADRAO_A',
    paridadeSeed: paridade,
    combateObrigatorio: levaACombate,
    danoCasco: Number(ramoA.danoCasco ?? 0),
    recompensaOpcaoA: ramoA,
    plantaQuestId: ramoA.plantaQuestId ?? null,
    moedaGerada: moeda,
    opcoesDisponiveis,
  });
}
