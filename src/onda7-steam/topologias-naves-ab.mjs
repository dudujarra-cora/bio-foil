/**
 * ONDA 7 (STEAM EDITION) — 10 Layouts de Bio-Naves (5 Espécies x Variantes A e B) com Topologias e Câmaras Moldadas
 * Dono Único (Lei N5): src/onda7-steam/topologias-naves-ab.mjs
 *
 * Responsabilidades:
 *  - Módulo 100% puro e isomórfico (0 imports Node.js, 0 structuredClone — compatível com Browser ES Modules,
 *    bundle `/cliente.js`, Electron/Tauri e Node.js);
 *  - Definir os 10 layouts jogáveis (`CARCACA_ALFA_A/B`, `MANTA_VOLT_A/B`, `COURACA_LIMIAR_A/B`, `SOMBRA_ABISSAL_A/B`,
 *    `COLMEIA_VIVA_A/B`), cada qual com grafo de adjacência próprio (`grafoAdjacencia`), dutos biológicos dedicados,
 *    contagem de slots dorsais (`2..4`), 4 bocas dorsais anatômicas (`bocasDorsais960`), kit inicial distinto
 *    e geometria anatômica moldada à silhueta da criatura (`offsetsCamaras960` sem colisão AABB e largura >= 68px);
 *  - Prover busca em largura (`calcularCaminhoBfsTopologiaNave`), projeção de retângulos (`calcularRetangulosCamarasMoldadas960`)
 *    e consulta de boca dorsal por slot (`obterBocaDorsalLayout960`).
 */

function congelarRecursivoPuro(valor) {
  if (valor === null || typeof valor !== 'object' || (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(valor))) {
    return valor;
  }
  if (Array.isArray(valor)) {
    const copiaArr = new Array(valor.length);
    for (let i = 0; i < valor.length; i += 1) {
      copiaArr[i] = congelarRecursivoPuro(valor[i]);
    }
    return Object.freeze(copiaArr);
  }
  const copiaObj = {};
  const chaves = Object.keys(valor);
  for (let i = 0; i < chaves.length; i += 1) {
    const k = chaves[i];
    copiaObj[k] = congelarRecursivoPuro(valor[k]);
  }
  return Object.freeze(copiaObj);
}

export const GRAFO_PADRAO_2X4_DUTO56 = congelarRecursivoPuro({
  1: [7, 2],
  7: [1, 3],
  2: [1, 3, 4],
  3: [7, 2, 5],
  4: [2, 5, 6],
  5: [3, 4, 8, 6],
  6: [4, 8, 5],
  8: [5, 6],
});

/**
 * 10 Layouts A/B com topologias distintas (inspirados na escola FTL: Faster Than Light — Kestrel A/B, Mantis A/B,
 * Stealth A/B, Zoltan A/B, Lanius A/B) adaptados à hidrodinâmica do Bio-Foil:
 *  - offsetsCamaras960: { [camaraId]: { dx, dy, dw, dh, chanfroPx } } aplicados sobre a placa base 960x540,
 *    moldando as 8 salas ao contorno real de cada espécie (Espiral Náutilo, Asas de Arraia, Carapaça Frontal,
 *    Manto Fusiforme de Lula e Recife Polipoide Ramificado) mantendo ZERO sobreposição AABB e largura >= 68px!
 */
export const CATALOGO_10_LAYOUTS_NAVES_STEAM = congelarRecursivoPuro([
  {
    idLayout: 'CARCACA_ALFA_A',
    idArquitetura: 'CARCACA_ALFA',
    variante: 'A',
    nomePt: 'Carcaça Alfa [A] — Espiral Hidro-Foil',
    nomeEn: 'Alpha Hull [A] — Hydro-Foil Spiral',
    nomeCurtoCardPt: 'CARCAÇA ALFA [A]',
    nomeCurtoCardEn: 'ALPHA HULL [A]',
    papelCurtoPt: 'EQUILÍBRIO FOIL (3 ARM)',
    papelCurtoEn: 'BALANCED FOIL (3 GUNS)',
    armaResumoCardPt: 'ARPÃO + ACÚSTICO I',
    armaResumoCardEn: 'HARPOON + SONIC I',
    doutrinaPt: 'Equilíbrio hidrodinâmico de concha espiralada com duto ventral 5↔6',
    doutrinaEn: 'Balanced nautilus hydrofoil cruiser with ventral siphon duct 5↔6',
    slotsArmasAtivos: 3,
    corDestaqueCascoRgba: [0, 229, 255, 255],
    tinturaVarianteRgb: [0, 0, 0],
    desbloqueadoPorPadrao: true,
    conquistasRequeridasB: [],
    bocasDorsais960: [
      [569, 95],
      [482, 58],
      [528, 74],
      [444, 66],
    ],
    grafoAdjacencia: GRAFO_PADRAO_2X4_DUTO56,
    dutosEspeciais: [{ de: 5, para: 6, tipo: 'DUTO_VENTRAL' }],
    kitVariante: {
      hpCascoMax: 30,
      reatorBarrasCompradas: 7,
      armasIniciais: ['CANHAO_ARPAO_CABO', 'EMISSOR_ACUSTICO_I'],
      orgaosIniciaisPorao: [],
      tripulacaoInicial: ['POLVO', 'ARRAIA', 'BAIACU'],
      sistemasExtrasNivel: {},
    },
    offsetsCamaras960: {
      1: { dx: -12, dy: -10, dw: -4, dh: -4, chanfroPx: 6 },
      7: { dx: 8, dy: -6, dw: 10, dh: -2, chanfroPx: 5 },
      2: { dx: -24, dy: -3, dw: 18, dh: 3, chanfroPx: 4 },
      3: { dx: 6, dy: -1, dw: 16, dh: 2, chanfroPx: 4 },
      4: { dx: -18, dy: 2, dw: 12, dh: 1, chanfroPx: 4 },
      5: { dx: 6, dy: 3, dw: 12, dh: 1, chanfroPx: 4 },
      6: { dx: -4, dy: 6, dw: -6, dh: -5, chanfroPx: 6 },
      8: { dx: 10, dy: 7, dw: 0, dh: -5, chanfroPx: 6 },
    },
  },
  {
    idLayout: 'CARCACA_ALFA_B',
    idArquitetura: 'CARCACA_ALFA',
    variante: 'B',
    nomePt: 'Carcaça Alfa [B] — Bateria Quádrupla',
    nomeEn: 'Alpha Hull [B] — Quad-Battery Gunship',
    nomeCurtoCardPt: 'CARCAÇA ALFA [B]',
    nomeCurtoCardEn: 'ALPHA HULL [B]',
    papelCurtoPt: 'ARTILHEIRA X-DUTO (4)',
    papelCurtoEn: 'QUAD-GUNSHIP X-DUCT (4)',
    armaResumoCardPt: '2x AGULHA + QUILHA',
    armaResumoCardEn: '2x NEEDLE + SPIKES',
    doutrinaPt: '4 slots dorsais ativos e dutos cruzados em X (2↔5 e 4↔3), sem porta 2↔4',
    doutrinaEn: '4 active dorsal weapon mounts and X-cross ducts (2↔5, 4↔3), sealed 2↔4 bulkhead',
    slotsArmasAtivos: 4,
    corDestaqueCascoRgba: [255, 183, 77, 255],
    tinturaVarianteRgb: [30, 12, -16],
    desbloqueadoPorPadrao: false,
    conquistasRequeridasB: ['ACH_CARCACA_1_FOIL_PURO', 'ACH_CARCACA_2_DRENAGEM_LAMPEJO'],
    bocasDorsais960: [
      [571, 92],
      [532, 74],
      [486, 58],
      [442, 64],
    ],
    grafoAdjacencia: {
      1: [7, 2],
      7: [1, 3],
      2: [1, 3, 5],
      3: [7, 2, 4],
      4: [3, 6],
      5: [2, 8, 6],
      6: [4, 5, 8],
      8: [5, 6],
    },
    dutosEspeciais: [
      { de: 2, para: 5, tipo: 'DUTO_CRUZADO' },
      { de: 4, para: 3, tipo: 'DUTO_CRUZADO' },
      { de: 5, para: 6, tipo: 'DUTO_VENTRAL' },
    ],
    kitVariante: {
      hpCascoMax: 30,
      reatorBarrasCompradas: 8,
      armasIniciais: ['AGULHA_SONICA_RAPIDA', 'AGULHA_SONICA_RAPIDA', 'DISPARADOR_ESPINHOS_QUILHA'],
      orgaosIniciaisPorao: ['ALETA_ESTABILIZADORA_FOIL'],
      tripulacaoInicial: ['POLVO', 'ARRAIA', 'CARANGUEJO'],
      sistemasExtrasNivel: { ARTILHARIA_DORSAL: 3 },
    },
    // Silhueta em Ampulheta: baterias dorsal/ventral largas (97px) e cintura estreitada X-duto (69px)
    offsetsCamaras960: {
      1: { dx: -28, dy: -12, dw: 20, dh: 2, chanfroPx: 4 },
      7: { dx: 6, dy: -12, dw: 20, dh: 2, chanfroPx: 4 },
      2: { dx: -2, dy: -3, dw: -8, dh: -6, chanfroPx: 6 },
      3: { dx: 8, dy: -3, dw: -8, dh: -6, chanfroPx: 6 },
      4: { dx: -26, dy: -2, dw: 18, dh: 4, chanfroPx: 4 },
      5: { dx: 6, dy: -2, dw: 18, dh: 4, chanfroPx: 4 },
      6: { dx: -12, dy: 6, dw: 4, dh: -5, chanfroPx: 6 },
      8: { dx: 10, dy: 6, dw: 4, dh: -5, chanfroPx: 6 },
    },
  },
  {
    idLayout: 'MANTA_VOLT_A',
    idArquitetura: 'MANTA_VOLT',
    variante: 'A',
    nomePt: 'Manta-Volt [A] — Envergadura Bio-Elétrica',
    nomeEn: 'Manta-Volt [A] — Bio-Electric Wingspan',
    nomeCurtoCardPt: 'MANTA-VOLT [A]',
    nomeCurtoCardEn: 'MANTA-VOLT [A]',
    papelCurtoPt: 'ASA BIO-ELÉTRICA (3)',
    papelCurtoEn: 'BIO-ELECTRIC WING (3)',
    armaResumoCardPt: '2x ACÚSTICO + ÍON',
    armaResumoCardEn: '2x SONIC + ELECTRO',
    doutrinaPt: 'Asas peitorais abertas com câmaras laterais deslocadas e sobrecarga de Arraias',
    doutrinaEn: 'Swept pectoral wings with wide lateral chambers and Electric Ray reactor boost',
    slotsArmasAtivos: 3,
    corDestaqueCascoRgba: [100, 220, 255, 255],
    tinturaVarianteRgb: [0, 0, 0],
    desbloqueadoPorPadrao: false,
    conquistasRequeridasB: [],
    bocasDorsais960: [
      [544, 98],
      [476, 72],
      [512, 84],
      [438, 78],
    ],
    grafoAdjacencia: {
      1: [2],
      7: [3],
      2: [1, 3, 4],
      3: [7, 2, 5],
      4: [2, 5, 6],
      5: [3, 4, 8],
      6: [4, 8],
      8: [5, 6],
    },
    dutosEspeciais: [{ de: 2, para: 3, tipo: 'PONTE_SINAPTICA' }],
    kitVariante: {
      hpCascoMax: 30,
      reatorBarrasCompradas: 6,
      armasIniciais: ['EMISSOR_ACUSTICO_I', 'EMISSOR_ACUSTICO_I'],
      orgaosIniciaisPorao: ['ELETRO_PLACA_ARRAIA'],
      tripulacaoInicial: ['POLVO', 'ARRAIA', 'ARRAIA'],
      sistemasExtrasNivel: {},
    },
    // Asas peitorais bem abertas nos andares 0 e 1 (248px de envergadura), afunilando rumo ao ferrão caudal
    offsetsCamaras960: {
      1: { dx: -38, dy: -10, dw: 18, dh: -4, chanfroPx: 6 },
      7: { dx: 18, dy: -10, dw: 18, dh: -4, chanfroPx: 6 },
      2: { dx: -26, dy: -6, dw: 18, dh: 2, chanfroPx: 5 },
      3: { dx: 8, dy: -6, dw: 18, dh: 2, chanfroPx: 5 },
      4: { dx: -12, dy: 0, dw: 6, dh: -3, chanfroPx: 4 },
      5: { dx: 6, dy: 0, dw: 6, dh: -3, chanfroPx: 4 },
      6: { dx: 0, dy: 4, dw: -8, dh: -6, chanfroPx: 6 },
      8: { dx: 6, dy: 4, dw: -8, dh: -6, chanfroPx: 6 },
    },
  },
  {
    idLayout: 'MANTA_VOLT_B',
    idArquitetura: 'MANTA_VOLT',
    variante: 'B',
    nomePt: 'Manta-Volt [B] — Tempestade Sináptica',
    nomeEn: 'Manta-Volt [B] — Synaptic Stormwing',
    nomeCurtoCardPt: 'MANTA-VOLT [B]',
    nomeCurtoCardEn: 'MANTA-VOLT [B]',
    papelCurtoPt: 'ÍON & PRÉ-IGNIÇÃO (4)',
    papelCurtoEn: 'ION & PRE-IGNITER (4)',
    armaResumoCardPt: 'PULSO ÍON + CADEIA',
    armaResumoCardEn: 'ION PULSE + CHAIN',
    doutrinaPt: 'Asas bipartidas ligadas por duto caudal 1↔6 e 7↔8 + Canhão Iônico e Pré-Ignição',
    doutrinaEn: 'Split-wing topology with wingtip-to-tail ducts (1↔6, 7↔8), Ion Cannon & Pre-Igniter',
    slotsArmasAtivos: 4,
    corDestaqueCascoRgba: [168, 130, 255, 255],
    tinturaVarianteRgb: [-10, 18, 36],
    desbloqueadoPorPadrao: false,
    conquistasRequeridasB: ['ACH_MANTA_1_BLACKOUT_TOTAL', 'ACH_MANTA_2_SEM_ESCUDO_ATE_S5'],
    bocasDorsais960: [
      [548, 96],
      [512, 82],
      [474, 70],
      [436, 76],
    ],
    grafoAdjacencia: {
      1: [2, 6],
      7: [3, 8],
      2: [1, 4],
      3: [7, 5],
      4: [2, 5, 6],
      5: [3, 4, 8],
      6: [1, 4, 8],
      8: [7, 5, 6],
    },
    dutosEspeciais: [
      { de: 1, para: 6, tipo: 'DUTO_ASA_BOMBORDO' },
      { de: 7, para: 8, tipo: 'DUTO_ASA_ESTIBORDO' },
    ],
    kitVariante: {
      hpCascoMax: 28,
      reatorBarrasCompradas: 7,
      armasIniciais: ['CANHAO_PULSO_BIOELETRICO_I', 'EMISSOR_RESSONANTE_CADEIA'],
      orgaosIniciaisPorao: ['SINAPSE_PRE_IGNICAO'],
      tripulacaoInicial: ['ARRAIA', 'ARRAIA', 'POLVO'],
      sistemasExtrasNivel: { GLANDULA_BARREIRA: 2 },
    },
    offsetsCamaras960: {
      1: { dx: -42, dy: -12, dw: 14, dh: -5, chanfroPx: 6 },
      7: { dx: 22, dy: -12, dw: 14, dh: -5, chanfroPx: 6 },
      2: { dx: -28, dy: -6, dw: 14, dh: 0, chanfroPx: 5 },
      3: { dx: 14, dy: -6, dw: 14, dh: 0, chanfroPx: 5 },
      4: { dx: -10, dy: 0, dw: 8, dh: 2, chanfroPx: 4 },
      5: { dx: 6, dy: 0, dw: 8, dh: 2, chanfroPx: 4 },
      6: { dx: -18, dy: 7, dw: 6, dh: -5, chanfroPx: 6 },
      8: { dx: 12, dy: 7, dw: 6, dh: -5, chanfroPx: 6 },
    },
  },
  {
    idLayout: 'COURACA_LIMIAR_A',
    idArquitetura: 'COURACA_LIMIAR',
    variante: 'A',
    nomePt: 'Couraça-Limiar [A] — Domo de Assalto',
    nomeEn: 'Threshold Carapace [A] — Assault Dome',
    nomeCurtoCardPt: 'COURAÇA-LIMIAR [A]',
    nomeCurtoCardEn: 'THRESHOLD [A]',
    papelCurtoPt: 'ASSALTO & ABORDAGEM (2)',
    papelCurtoEn: 'BOARDING VANGUARD (2)',
    armaResumoCardPt: 'ACÚSTICO I + ARPÃO',
    armaResumoCardEn: 'SONIC I + HARPOON',
    doutrinaPt: 'Carapaça frontal abaulada com Esclusa de Abordagem expandida e guarda anfíbia',
    doutrinaEn: 'Domed chitin prow with enlarged Boarding Lock and heavy Crab vanguard',
    slotsArmasAtivos: 2,
    corDestaqueCascoRgba: [255, 152, 82, 255],
    tinturaVarianteRgb: [0, 0, 0],
    desbloqueadoPorPadrao: false,
    conquistasRequeridasB: [],
    bocasDorsais960: [
      [494, 86],
      [557, 120],
      [526, 102],
      [462, 92],
    ],
    grafoAdjacencia: {
      1: [7, 2],
      7: [1, 3, 5],
      2: [1, 3, 4],
      3: [7, 2, 5],
      4: [2, 6],
      5: [7, 3, 8],
      6: [4, 8],
      8: [5, 6],
    },
    dutosEspeciais: [{ de: 7, para: 5, tipo: 'TUBO_ASSALTO_DIRETO' }],
    kitVariante: {
      hpCascoMax: 32,
      reatorBarrasCompradas: 6,
      armasIniciais: ['EMISSOR_ACUSTICO_I', 'CANHAO_ARPAO_CABO'],
      orgaosIniciaisPorao: ['DENTE_LEVIATA'],
      tripulacaoInicial: ['BAIACU', 'CARANGUEJO', 'CARANGUEJO'],
      sistemasExtrasNivel: { TUBO_PRESSURIZADO: 1 },
    },
    offsetsCamaras960: {
      1: { dx: -14, dy: -8, dw: 8, dh: 0, chanfroPx: 6 },
      7: { dx: 4, dy: -12, dw: 24, dh: 6, chanfroPx: 6 },
      2: { dx: -18, dy: -2, dw: 12, dh: 2, chanfroPx: 5 },
      3: { dx: 4, dy: 0, dw: 20, dh: 4, chanfroPx: 5 },
      4: { dx: -10, dy: 3, dw: 4, dh: -4, chanfroPx: 4 },
      5: { dx: 4, dy: 5, dw: 12, dh: -2, chanfroPx: 4 },
      6: { dx: -4, dy: 7, dw: -6, dh: -6, chanfroPx: 5 },
      8: { dx: 4, dy: 8, dw: 2, dh: -6, chanfroPx: 5 },
    },
  },
  {
    idLayout: 'COURACA_LIMIAR_B',
    idArquitetura: 'COURACA_LIMIAR',
    variante: 'B',
    nomePt: 'Couraça-Limiar [B] — Falange Sanguessuga',
    nomeEn: 'Threshold Carapace [B] — Leech Phalanx',
    nomeCurtoCardPt: 'COURAÇA-LIMIAR [B]',
    nomeCurtoCardEn: 'THRESHOLD [B]',
    papelCurtoPt: 'FALANGE VAMPÍRICA (2)',
    papelCurtoEn: 'LEECH PHALANX (2 GUNS)',
    armaResumoCardPt: 'SIFÃO + CONCUSSÃO',
    armaResumoCardEn: 'SIPHON + SLUG GUN',
    doutrinaPt: 'Corredor de abordagem expressa (2↔7 e 4↔7), Bomba Osmótica e Simbionte Vampírico',
    doutrinaEn: 'Express boarding chutes (2↔7, 4↔7), Osmotic Siphon Bomb & Leech Symbiont Sac',
    slotsArmasAtivos: 2,
    corDestaqueCascoRgba: [255, 96, 96, 255],
    tinturaVarianteRgb: [34, -8, -12],
    desbloqueadoPorPadrao: false,
    conquistasRequeridasB: ['ACH_COURACA_1_ARIETE_PESADO', 'ACH_COURACA_2_FORTALEZA_BLINDADA'],
    bocasDorsais960: [
      [496, 84],
      [560, 118],
      [528, 100],
      [464, 90],
    ],
    grafoAdjacencia: {
      1: [2],
      7: [2, 3, 4],
      2: [1, 7, 4],
      3: [7, 5],
      4: [2, 7, 6],
      5: [3, 8],
      6: [4, 8],
      8: [5, 6],
    },
    dutosEspeciais: [
      { de: 2, para: 7, tipo: 'ESCLUSA_EXPRESSA' },
      { de: 4, para: 7, tipo: 'ESCLUSA_EXPRESSA' },
    ],
    kitVariante: {
      hpCascoMax: 34,
      reatorBarrasCompradas: 7,
      armasIniciais: ['BOMBA_SIFAO_OSMOTICO', 'CANHAO_PRESSAO_HIDRO'],
      orgaosIniciaisPorao: ['BOLSA_SIMBIONTE_SANGUESSUGA'],
      tripulacaoInicial: ['CARANGUEJO', 'CARANGUEJO', 'BAIACU', 'POLVO'],
      sistemasExtrasNivel: { TUBO_PRESSURIZADO: 2 },
    },
    offsetsCamaras960: {
      1: { dx: -24, dy: -6, dw: 6, dh: -4, chanfroPx: 5 },
      7: { dx: 4, dy: -14, dw: 26, dh: 8, chanfroPx: 6 },
      2: { dx: -22, dy: -4, dw: 16, dh: 4, chanfroPx: 5 },
      3: { dx: 6, dy: 0, dw: 18, dh: 2, chanfroPx: 5 },
      4: { dx: -18, dy: 4, dw: 14, dh: 0, chanfroPx: 4 },
      5: { dx: 6, dy: 5, dw: 10, dh: -2, chanfroPx: 4 },
      6: { dx: -8, dy: 9, dw: -2, dh: -5, chanfroPx: 5 },
      8: { dx: 6, dy: 9, dw: -2, dh: -5, chanfroPx: 5 },
    },
  },
  {
    idLayout: 'SOMBRA_ABISSAL_A',
    idArquitetura: 'SOMBRA_ABISSAL',
    variante: 'A',
    nomePt: 'Sombra-Abissal [A] — Manto Cefalópode',
    nomeEn: 'Abyssal Shadow [A] — Cephalopod Mantle',
    nomeCurtoCardPt: 'SOMBRA-ABISSAL [A]',
    nomeCurtoCardEn: 'ABYSS SHADOW [A]',
    papelCurtoPt: 'FURTIVA & EXTRAÇÃO (3)',
    papelCurtoEn: 'CLOAK & EXTRACTION (3)',
    armaResumoCardPt: 'ACÚSTICO + ARPÃO',
    armaResumoCardEn: 'SONIC I + HARPOON',
    doutrinaPt: 'Fuselagem hidrodinâmica esguia com Tinta Furtiva ativa e extração neurotóxica',
    doutrinaEn: 'Streamlined squid mantle with Cloaking Ink gland and neurotoxic surgical extraction',
    slotsArmasAtivos: 3,
    corDestaqueCascoRgba: [186, 120, 255, 255],
    tinturaVarianteRgb: [0, 0, 0],
    desbloqueadoPorPadrao: false,
    conquistasRequeridasB: [],
    bocasDorsais960: [
      [558, 108],
      [485, 85],
      [522, 96],
      [448, 80],
    ],
    grafoAdjacencia: {
      1: [2],
      7: [3],
      2: [1, 3, 4],
      3: [7, 2, 5],
      4: [2, 6],
      5: [3, 8],
      6: [4, 8],
      8: [5, 6],
    },
    dutosEspeciais: [{ de: 1, para: 8, tipo: 'NERVO_TENTACULAR' }],
    kitVariante: {
      hpCascoMax: 24,
      reatorBarrasCompradas: 6,
      armasIniciais: ['EMISSOR_ACUSTICO_I', 'CANHAO_ARPAO_CABO'],
      orgaosIniciaisPorao: ['GLANDULA_BAIACU'],
      tripulacaoInicial: ['POLVO', 'CARANGUEJO'],
      sistemasExtrasNivel: { GLANDULA_TINTA_FURTIVA: 1 },
    },
    // Manto esguio escalonado em flecha diagonal hidrodinâmica
    offsetsCamaras960: {
      1: { dx: -30, dy: -12, dw: -4, dh: -5, chanfroPx: 6 },
      7: { dx: 6, dy: -4, dw: 4, dh: -5, chanfroPx: 6 },
      2: { dx: -20, dy: -8, dw: 6, dh: -2, chanfroPx: 5 },
      3: { dx: 12, dy: 0, dw: 10, dh: 0, chanfroPx: 5 },
      4: { dx: -10, dy: -4, dw: 8, dh: 0, chanfroPx: 5 },
      5: { dx: 16, dy: 4, dw: 14, dh: 0, chanfroPx: 5 },
      6: { dx: -2, dy: 2, dw: -4, dh: -5, chanfroPx: 6 },
      8: { dx: 20, dy: 8, dw: 16, dh: -3, chanfroPx: 6 },
    },
  },
  {
    idLayout: 'SOMBRA_ABISSAL_B',
    idArquitetura: 'SOMBRA_ABISSAL',
    variante: 'B',
    nomePt: 'Sombra-Abissal [B] — Espectro Térmico',
    nomeEn: 'Abyssal Shadow [B] — Thermal Specter',
    nomeCurtoCardPt: 'SOMBRA-ABISSAL [B]',
    nomeCurtoCardEn: 'ABYSS SHADOW [B]',
    papelCurtoPt: 'FURTIVA NV2 & FEIXE(3)',
    papelCurtoEn: 'CLOAK LV.2 & BEAMS (3)',
    armaResumoCardPt: 'LANÇA 4 + BIOFEIXE',
    armaResumoCardEn: 'GLAIVE + BIO-BEAM',
    doutrinaPt: 'Tinta Furtiva Nv. 2 + Lança Térmica Focal (4 dano) e Feixe Bio-Neurotóxico',
    doutrinaEn: 'Cloaking Ink Lv.2 + Pinpoint Thermal Lance (4 dmg) & Anti-Bio Neuro-Beam',
    slotsArmasAtivos: 3,
    corDestaqueCascoRgba: [240, 98, 192, 255],
    tinturaVarianteRgb: [26, -14, 30],
    desbloqueadoPorPadrao: false,
    conquistasRequeridasB: ['ACH_SOMBRA_1_FANTASMA_TERMAL', 'ACH_SOMBRA_2_PREDADOR_CIRURGICO'],
    bocasDorsais960: [
      [562, 106],
      [524, 94],
      [486, 82],
      [450, 78],
    ],
    grafoAdjacencia: {
      1: [7, 4],
      7: [1, 3],
      2: [3, 4],
      3: [7, 2, 8],
      4: [1, 2, 6],
      5: [6, 8],
      6: [4, 5],
      8: [3, 5],
    },
    dutosEspeciais: [
      { de: 1, para: 4, tipo: 'DUTO_MANTO_ESQ' },
      { de: 3, para: 8, tipo: 'DUTO_MANTO_DIR' },
    ],
    kitVariante: {
      hpCascoMax: 22,
      reatorBarrasCompradas: 7,
      armasIniciais: ['LANCA_TERMICA_FOCAL', 'FEIXE_NEUROTOXICO_BIO'],
      orgaosIniciaisPorao: ['VESICULA_HIPERBARICA'],
      tripulacaoInicial: ['POLVO', 'ARRAIA'],
      sistemasExtrasNivel: { GLANDULA_TINTA_FURTIVA: 2 },
    },
    offsetsCamaras960: {
      1: { dx: -22, dy: -12, dw: -4, dh: -6, chanfroPx: 6 },
      7: { dx: 14, dy: -10, dw: 12, dh: -4, chanfroPx: 6 },
      2: { dx: -10, dy: -8, dw: 4, dh: -3, chanfroPx: 5 },
      3: { dx: 18, dy: -3, dw: 16, dh: 0, chanfroPx: 5 },
      4: { dx: -24, dy: -2, dw: 14, dh: 2, chanfroPx: 5 },
      5: { dx: 8, dy: 2, dw: 8, dh: -3, chanfroPx: 5 },
      6: { dx: -14, dy: 6, dw: 4, dh: -5, chanfroPx: 6 },
      8: { dx: 20, dy: 6, dw: 16, dh: -3, chanfroPx: 6 },
    },
  },
  {
    idLayout: 'COLMEIA_VIVA_A',
    idArquitetura: 'COLMEIA_VIVA',
    variante: 'A',
    nomePt: 'Colmeia-Viva [A] — Atol Polipoide',
    nomeEn: 'Living Hive [A] — Polyp Atoll',
    nomeCurtoCardPt: 'COLMEIA-VIVA [A]',
    nomeCurtoCardEn: 'LIVING HIVE [A]',
    papelCurtoPt: 'SIMBIOSE & REGEN (3)',
    papelCurtoEn: 'SYMBIOSIS & REGEN (3)',
    armaResumoCardPt: 'RAJADA II + ESPORO',
    armaResumoCardEn: 'BURST II + SPORES',
    doutrinaPt: 'Recife assimétrico hiper-conectado com 3 túneis simbióticos e regeneração no mar',
    doutrinaEn: 'Hyper-connected coral colony with 3 symbiotic ducts and Touchdown hull regen',
    slotsArmasAtivos: 3,
    corDestaqueCascoRgba: [82, 242, 168, 255],
    tinturaVarianteRgb: [0, 0, 0],
    desbloqueadoPorPadrao: false,
    conquistasRequeridasB: [],
    bocasDorsais960: [
      [568, 100],
      [472, 58],
      [522, 78],
      [438, 66],
    ],
    grafoAdjacencia: {
      1: [7, 2, 3],
      7: [1, 3],
      2: [1, 3, 4],
      3: [1, 7, 2, 5],
      4: [2, 5, 6, 8],
      5: [3, 4, 6, 8],
      6: [4, 5, 8],
      8: [4, 5, 6],
    },
    dutosEspeciais: [
      { de: 1, para: 3, tipo: 'PORO_CORALINO' },
      { de: 4, para: 8, tipo: 'PORO_CORALINO' },
      { de: 5, para: 6, tipo: 'DUTO_VENTRAL' },
    ],
    kitVariante: {
      hpCascoMax: 30,
      reatorBarrasCompradas: 7,
      armasIniciais: ['RAJADA_HIDROPNEUMATICA_II', 'MORTEIRO_ESPOROS'],
      orgaosIniciaisPorao: ['GLANDULA_TERMOFILICA'],
      tripulacaoInicial: ['ARRAIA', 'BAIACU', 'BAIACU'],
      sistemasExtrasNivel: {},
    },
    offsetsCamaras960: {
      1: { dx: -24, dy: -12, dw: 16, dh: 2, chanfroPx: 7 },
      7: { dx: 10, dy: -4, dw: 4, dh: -5, chanfroPx: 7 },
      2: { dx: -10, dy: -3, dw: -2, dh: -5, chanfroPx: 6 },
      3: { dx: 6, dy: -3, dw: 20, dh: 4, chanfroPx: 6 },
      4: { dx: -26, dy: -2, dw: 18, dh: 4, chanfroPx: 7 },
      5: { dx: 12, dy: 5, dw: 2, dh: -5, chanfroPx: 7 },
      6: { dx: -12, dy: 7, dw: 6, dh: -4, chanfroPx: 7 },
      8: { dx: 6, dy: 6, dw: 18, dh: 2, chanfroPx: 7 },
    },
  },
  {
    idLayout: 'COLMEIA_VIVA_B',
    idArquitetura: 'COLMEIA_VIVA',
    variante: 'B',
    nomePt: 'Colmeia-Viva [B] — Abismo Osmótico',
    nomeEn: 'Living Hive [B] — Osmotic Abyss',
    nomeCurtoCardPt: 'COLMEIA-VIVA [B]',
    nomeCurtoCardEn: 'LIVING HIVE [B]',
    papelCurtoPt: 'OSMOSE & FLAK II (4)',
    papelCurtoEn: 'OSMOSIS & FLAK II (4)',
    armaResumoCardPt: 'FLAK II + M. ÁCIDO',
    armaResumoCardEn: 'FLAK II + ACID GUN',
    doutrinaPt: 'Câmaras alagadas regenerativas (Osmose Reversa) + Morteiro Ácido e Flak Abissal Mk.II',
    doutrinaEn: 'Flooded-chamber regen (Reverse Osmosis Gill) + Acid Mortar & Abyssal Flak Mk.II',
    slotsArmasAtivos: 4,
    corDestaqueCascoRgba: [130, 255, 120, 255],
    tinturaVarianteRgb: [-12, 28, 10],
    desbloqueadoPorPadrao: false,
    conquistasRequeridasB: ['ACH_COLMEIA_1_QUATRO_ESPECIES', 'ACH_COLMEIA_2_ABORDAGEM_OSMOTICA'],
    bocasDorsais960: [
      [570, 98],
      [524, 78],
      [476, 60],
      [438, 68],
    ],
    grafoAdjacencia: {
      1: [7, 3],
      7: [1, 5],
      2: [4, 3],
      3: [1, 2, 5],
      4: [2, 6, 5],
      5: [7, 3, 4, 8],
      6: [4, 8],
      8: [5, 6],
    },
    dutosEspeciais: [
      { de: 1, para: 3, tipo: 'PORO_OSMOTICO' },
      { de: 7, para: 5, tipo: 'PORO_OSMOTICO' },
    ],
    kitVariante: {
      hpCascoMax: 32,
      reatorBarrasCompradas: 8,
      armasIniciais: ['DISPERSOR_ABISSAL_MK2', 'MORTEIRO_ACIDO_CORROSIVO'],
      orgaosIniciaisPorao: ['BRANQUIA_OSMOSE_REVERSA', 'MEDULA_REGENERATIVA_CORAL'],
      tripulacaoInicial: ['POLVO', 'BAIACU', 'BAIACU'],
      sistemasExtrasNivel: { BOMBA_BRANQUIAL: 2 },
    },
    offsetsCamaras960: {
      1: { dx: -10, dy: -4, dw: -4, dh: -5, chanfroPx: 7 },
      7: { dx: 6, dy: -12, dw: 20, dh: 4, chanfroPx: 7 },
      2: { dx: -28, dy: -3, dw: 20, dh: 4, chanfroPx: 6 },
      3: { dx: 12, dy: -1, dw: 0, dh: -5, chanfroPx: 6 },
      4: { dx: -12, dy: 5, dw: 4, dh: -5, chanfroPx: 7 },
      5: { dx: 6, dy: -1, dw: 22, dh: 4, chanfroPx: 7 },
      6: { dx: -24, dy: 8, dw: 16, dh: 0, chanfroPx: 7 },
      8: { dx: 10, dy: 8, dw: 4, dh: -5, chanfroPx: 7 },
    },
  },
]);

export function obterCatalogoLayoutsNavesSteam() {
  return CATALOGO_10_LAYOUTS_NAVES_STEAM;
}

export function resolverLayoutNaveSteam(idArquitetura = 'CARCACA_ALFA', varianteLayout = 'A') {
  const bruto = String(idArquitetura ?? 'CARCACA_ALFA').trim().toUpperCase();
  const temSufixo = bruto.endsWith('_A') || bruto.endsWith('_B');
  const arqLimpa = temSufixo ? bruto.slice(0, -2) : bruto;
  const varLimpa = temSufixo
    ? bruto.slice(-1)
    : (String(varianteLayout ?? 'A').trim().toUpperCase() === 'B' ? 'B' : 'A');
  const idBusca = `${arqLimpa}_${varLimpa}`;
  const encontrado =
    CATALOGO_10_LAYOUTS_NAVES_STEAM.find((l) => l.idLayout === idBusca) ??
    CATALOGO_10_LAYOUTS_NAVES_STEAM.find((l) => l.idArquitetura === arqLimpa && l.variante === 'A') ??
    CATALOGO_10_LAYOUTS_NAVES_STEAM[0];
  return encontrado;
}

export function resolverLayoutTopologiaNave(idLayoutOuArq = 'CARCACA_ALFA_A', varianteLayout = 'A') {
  return resolverLayoutNaveSteam(idLayoutOuArq, varianteLayout);
}

/**
 * Calcula a capacidade real de tripulantes por câmara (`1x1 = 1`, `1x2 = 2`, `2x2 = 4`) a partir da
 * geometria anatômica (`offsetsCamaras960`) de cada layout Steam A/B.
 */
export function obterLimitesPorSalaLayout(idArquitetura = 'CARCACA_ALFA', varianteLayout = 'A') {
  const layout = resolverLayoutNaveSteam(idArquitetura, varianteLayout);
  if (layout?.limitesPorSala) return layout.limitesPorSala;
  const offsets = layout?.offsetsCamaras960 ?? {};
  const limites = {};
  for (const idCam of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const off = offsets[idCam] ?? { dw: 0, dh: 0 };
    const dw = Number(off.dw ?? 0);
    const dh = Number(off.dh ?? 0);
    if (dw >= 16 && dh >= 2) {
      limites[idCam] = 4; // Câmara ampla 2x2 (4 tripulantes)
    } else if (dw <= 6 && dh <= -5) {
      limites[idCam] = 1; // Cápsula compacta 1x1 (1 tripulante)
    } else {
      limites[idCam] = 2; // Câmara padrão 1x2 (2 tripulantes)
    }
  }
  return congelarRecursivoPuro(limites);
}

export function obterBocaDorsalLayout960(
  idArquitetura = 'CARCACA_ALFA',
  varianteLayout = 'A',
  slotIdx = 0,
  opcoes = {}
) {
  const layout = resolverLayoutNaveSteam(idArquitetura, varianteLayout);
  const idx = Math.max(0, Math.min(3, Number(slotIdx) || 0));
  const bocas = layout.bocasDorsais960 ?? [
    [569, 95],
    [482, 58],
    [528, 74],
    [444, 66],
  ];
  const [bx, by] = bocas[idx] ?? bocas[0];
  const ehTouchdown = Boolean(opcoes.ehTouchdown);
  const ehMonstroAlvo = Boolean(opcoes.ehMonstroAlvo);
  const deslSubTick = Number(opcoes.deslSubTick ?? 0);
  const dyBase = ehTouchdown ? 104 : ehMonstroAlvo ? -12 : 0;
  const dxTd = ehTouchdown ? -24 : 0;
  return Object.freeze([bx + dxTd, by + dyBase + deslSubTick]);
}

const COORDENADAS_BASE_CAMARAS = Object.freeze({
  1: Object.freeze({ coluna: 0, andar: 0 }),
  7: Object.freeze({ coluna: 1, andar: 0 }),
  2: Object.freeze({ coluna: 0, andar: 1 }),
  3: Object.freeze({ coluna: 1, andar: 1 }),
  4: Object.freeze({ coluna: 0, andar: 2 }),
  5: Object.freeze({ coluna: 1, andar: 2 }),
  6: Object.freeze({ coluna: 0, andar: 3 }),
  8: Object.freeze({ coluna: 1, andar: 3 }),
});

/**
 * Calcula os retângulos nativos 960x540 das 8 câmaras e suas válvulas externas:
 *  - Quando `modoClassico2x4 === true` (testes legados de Onda 6 sem `edicaoSteamAtiva`), preserva 100% da grade clássica;
 *  - Na Edição Steam (`modoClassico2x4 === false`), aplica os `offsetsCamaras960` anatômicos da espécie/variante A ou B,
 *    garantindo matematicamente distância mínima >= 4px entre câmaras (ZERO colisão AABB), largura >= 68px e válvulas externas!
 */
export function calcularRetangulosCamarasMoldadas960(opcoes = {}) {
  const idArquitetura = String(opcoes.idArquitetura ?? 'CARCACA_ALFA').toUpperCase();
  const varianteLayout = String(opcoes.varianteLayout ?? 'A').toUpperCase() === 'B' ? 'B' : 'A';
  const ehTouchdown = Boolean(opcoes.ehTouchdown);
  const ehMonstroAlvo = Boolean(opcoes.ehMonstroAlvo);
  const modoClassico2x4 = Boolean(opcoes.modoClassico2x4);
  const desalinhamentoPx = Number(opcoes.desalinhamentoPx ?? 0);

  const base = ehTouchdown
    ? (modoClassico2x4
        ? {
            xEsq: 338,
            xDir: 438,
            larguraCam: 79,
            toposY: [130, 178, 224, 272],
            alturasY: [40, 38, 42, 40],
          }
        : {
            // Na Edição Steam, Touchdown / Mergulho Tático aplica a queda física real de +106px sob a linha d'água y=219
            xEsq: 338,
            xDir: 438,
            larguraCam: 79,
            toposY: [232, 276, 320, 364],
            alturasY: [38, 38, 39, 39],
          })
    : ehMonstroAlvo
      ? {
          xEsq: 378,
          xDir: 466,
          larguraCam: 72,
          toposY: [122, 164, 204, 246],
          alturasY: [38, 36, 38, 40],
        }
      : {
          xEsq: 364,
          xDir: 462,
          larguraCam: 77,
          toposY: [126, 172, 218, 264],
          alturasY: [42, 42, 43, 44],
        };

  const layout = resolverLayoutNaveSteam(idArquitetura, varianteLayout);
  const camaras = {};

  if (modoClassico2x4) {
    const idsOrdenados = [1, 7, 2, 3, 4, 5, 6, 8];
    for (let i = 0; i < idsOrdenados.length; i += 1) {
      const idCam = idsOrdenados[i];
      const grade = COORDENADAS_BASE_CAMARAS[idCam];
      const x = (grade.coluna === 0 ? base.xEsq : base.xDir) + desalinhamentoPx;
      const y = Math.max(44, base.toposY[grade.andar]);
      const largura = Math.max(68, base.larguraCam);
      const altura = Math.max(33, base.alturasY[grade.andar]);
      const xValvula = grade.coluna === 0 ? x - 19 : x + largura + 3;
      const yValvula = y + Math.max(4, Math.floor((altura - 20) / 2));
      camaras[idCam] = Object.freeze({
        camaraId: idCam,
        coluna: grade.coluna,
        andar: grade.andar,
        x,
        y,
        largura,
        altura,
        chanfroPx: 3,
        valvulaExterna: Object.freeze({ x: xValvula, y: yValvula, largura: 16, altura: 20 }),
      });
    }
  } else {
    const idsCol0 = [1, 2, 4, 6];
    const idsCol1 = [7, 3, 5, 8];
    let prevYFimCol0 = null;
    for (let i = 0; i < idsCol0.length; i += 1) {
      const idCam = idsCol0[i];
      const grade = COORDENADAS_BASE_CAMARAS[idCam];
      const off = layout.offsetsCamaras960[idCam] ?? { dx: 0, dy: 0, dw: 0, dh: 0, chanfroPx: 4 };
      const largura = Math.max(68, base.larguraCam + off.dw);
      const altura = Math.max(34, base.alturasY[grade.andar] + off.dh);
      const x = Math.max(176 + desalinhamentoPx, base.xEsq + off.dx + desalinhamentoPx);
      let y = Math.max(46, base.toposY[grade.andar] + off.dy);
      if (prevYFimCol0 !== null) {
        y = Math.max(y, prevYFimCol0 + 5);
      }
      prevYFimCol0 = y + altura;
      const xValvula = x - 19;
      const yValvula = y + Math.max(4, Math.floor((altura - 20) / 2));
      camaras[idCam] = Object.freeze({
        camaraId: idCam,
        coluna: 0,
        andar: grade.andar,
        x,
        y,
        largura,
        altura,
        chanfroPx: off.chanfroPx ?? 4,
        valvulaExterna: Object.freeze({ x: xValvula, y: yValvula, largura: 16, altura: 20 }),
      });
    }

    const maxDirCol0 = Math.max(...idsCol0.map((id) => camaras[id].x + camaras[id].largura));
    const maxXEstibordo = (ehMonstroAlvo ? 566 : 574) + desalinhamentoPx;
    let prevYFimCol1 = null;
    for (let i = 0; i < idsCol1.length; i += 1) {
      const idCam = idsCol1[i];
      const grade = COORDENADAS_BASE_CAMARAS[idCam];
      const off = layout.offsetsCamaras960[idCam] ?? { dx: 0, dy: 0, dw: 0, dh: 0, chanfroPx: 4 };
      const altura = Math.max(34, base.alturasY[grade.andar] + off.dh);
      const xMinEspinha = maxDirCol0 + 12;
      let x = Math.max(xMinEspinha, base.xDir + off.dx + desalinhamentoPx);
      let largura = Math.max(68, base.larguraCam + off.dw);
      if (x + largura > maxXEstibordo) {
        largura = Math.max(68, maxXEstibordo - x);
        if (x + largura > maxXEstibordo) {
          x = Math.max(maxDirCol0 + 10, maxXEstibordo - largura);
        }
      }
      let y = Math.max(46, base.toposY[grade.andar] + off.dy);
      if (prevYFimCol1 !== null) {
        y = Math.max(y, prevYFimCol1 + 5);
      }
      prevYFimCol1 = y + altura;
      const xValvula = x + largura + 3;
      const yValvula = y + Math.max(4, Math.floor((altura - 20) / 2));
      camaras[idCam] = Object.freeze({
        camaraId: idCam,
        coluna: 1,
        andar: grade.andar,
        x,
        y,
        largura,
        altura,
        chanfroPx: off.chanfroPx ?? 4,
        valvulaExterna: Object.freeze({ x: xValvula, y: yValvula, largura: 16, altura: 20 }),
      });
    }
  }

  return congelarRecursivoPuro({
    idLayout: layout.idLayout,
    idArquitetura: layout.idArquitetura,
    variante: layout.variante,
    chanfroOrganicoAtivo: !modoClassico2x4,
    grafoAdjacencia: layout.grafoAdjacencia,
    dutosEspeciais: layout.dutosEspeciais,
    camaras,
  });
}

/**
 * Busca em largura (BFS) determinística sobre o grafo de adjacência real da Bio-Nave selecionada.
 */
export function calcularCaminhoBfsTopologiaNave(grafoAdjacencia, camaraOrigemId, camaraDestinoId) {
  const grafo = grafoAdjacencia && typeof grafoAdjacencia === 'object' ? grafoAdjacencia : GRAFO_PADRAO_2X4_DUTO56;
  const orig = Number(camaraOrigemId);
  const dest = Number(camaraDestinoId);
  if (!Number.isInteger(orig) || !Number.isInteger(dest) || !grafo[orig] || !grafo[dest]) {
    return Object.freeze([]);
  }
  if (orig === dest) {
    return Object.freeze([orig]);
  }
  const fila = [[orig]];
  const visitados = new Set([orig]);
  while (fila.length > 0) {
    const caminho = fila.shift();
    const ultimo = caminho[caminho.length - 1];
    const vizinhos = grafo[ultimo] ?? [];
    for (let i = 0; i < vizinhos.length; i += 1) {
      const prox = Number(vizinhos[i]);
      if (prox === dest) {
        return Object.freeze([...caminho, prox]);
      }
      if (!visitados.has(prox)) {
        visitados.add(prox);
        fila.push([...caminho, prox]);
      }
    }
  }
  return Object.freeze([]);
}
