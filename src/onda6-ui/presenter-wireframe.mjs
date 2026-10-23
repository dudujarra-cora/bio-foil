/**
 * ONDA 6 — Seletor/Presenter 16:9 (`projetarViewModelWireframe`) e Orçamento de Layout Nativo (960x540 -> 1920x1080)
 * Dono Único (Lei N5): src/onda6-ui/presenter-wireframe.mjs
 *
 * Fontes canônicas:
 *  - Seção 2.1..2.3 (Wireframe 16:9: Barra Superior, Termômetro Peso vs Sustentação, 8 Câmaras, 8 Sistemas/Subsistemas, 4 Slots Armas, Painel Alvo)
 *  - Seção 8.2 (Lei L3: Canal de Visibilidade e Permissão — 5 estados, nunca retornar [] ou "0 tripulantes" quando cego)
 *  - Seção 8.4 Junção N1 #5 (`projetarViewModelWireframe(estado) -> ViewModelCongelado`)
 *  - Seção 8.5.C (Orçamento de Layout Nativo 960x540 -> 2x 1920x1080, 12 parâmetros canônicos)
 */
import http from 'node:http';
import zlib from 'node:zlib';
import { clonarProfundoCongelado } from '../gdd-parser.mjs';
import { calcularGeometriaLayoutNativo } from '../oraculos-referencia.mjs';
import { criarEstadoInicialPartida } from '../onda1-fisica/estado-inicial.mjs';
import {
  calcularPesoTotalNave,
  calcularSustentacaoFoil,
} from '../onda1-fisica/tick-hidraulica-foil.mjs';
import { calcularEsquivaEfetivaNave } from '../onda2-combate/tick-sistemas-armas.mjs';
import { inspecionarSalaAlvo, avancarTickCombateCompleto } from '../onda2-combate/tick-tripulacao.mjs';
import { criarAlvoSetor1Canonico } from '../onda3-inimigos/ia-barco-monstro.mjs';
import {
  COORDENADAS_GRADE_CAMARAS_16A,
  calcularGhostPreviewTermometro,
  despacharComandoUi,
  traduzirInputDomParaComandoUi,
} from './despacho-comandos.mjs';
import { construirPlanoGrafoWebAudio } from './cues-audio.mjs';

export const ORCAMENTO_LAYOUT_NATIVO_85C = Object.freeze({
  HUD_TOPO_ALTURA: 36,
  PAINEL_RODAPE_TOPO_Y: 440,
  COLUNA_TERMOMETRO_LARGURA: 112,
  PAINEL_INIMIGO_X: 600,
  CAMARA_LARGURA: 50,
  CAMARA_ALTURA: 35,
  PAREDE_ESPESSURA: 2,
  ARMAS_DORSAIS_ALTURA: 20,
  LINHA_DAGUA_Y: 330,
  VAO_DE_AR_NO_FOIL: 24,
  MASTRO_ASA_ALTURA: 50,
  QUEDA_TOUCHDOWN: 100,
});

export const SISTEMAS_BARRA_INFERIOR_CANONICOS = Object.freeze([
  { id: 'GLANDULA_BARREIRA', camaraId: 4, tipo: 'SISTEMA_PRINCIPAL', sigla: 'ESC' },
  { id: 'SIFAO_PROPULSAO', camaraId: 5, tipo: 'SISTEMA_PRINCIPAL', sigla: 'SIF' },
  { id: 'BOMBA_BRANQUIAL', camaraId: 3, tipo: 'SISTEMA_PRINCIPAL', sigla: 'BRQ' },
  { id: 'ARTILHARIA_DORSAL', camaraId: 1, tipo: 'SISTEMA_PRINCIPAL', sigla: 'ART' },
  { id: 'CORTEX_NAVEGACAO', camaraId: 2, tipo: 'SISTEMA_PASSIVO', sigla: 'CTX' },
  { id: 'MASTRO_FOIL', camaraId: 6, tipo: 'SISTEMA_ESTRUTURAL', sigla: 'MST' },
  { id: 'TUBO_PRESSURIZADO', camaraId: 7, tipo: 'SUBSISTEMA', sigla: 'TUB' },
  { id: 'GLANDULA_TINTA_FURTIVA', camaraId: 8, tipo: 'SUBSISTEMA', sigla: 'TNT' },
]);

/**
 * Assinatura Pura N1 #5: Projeta o GameState num ViewModel 16:9 imutável para renderização na grade nativa 960x540 (upscale 2x -> 1920x1080).
 */
export function projetarViewModelWireframe(estado, opcoesDebug = {}) {
  const nave = estado.naveJogador;
  const emNoFoil = nave.estadoFisico === '1_NO_FOIL';
  const desabilitarTravaValvulaMutacao = opcoesDebug.desabilitarTravaValvulaTouchdown === true;
  const travadoHidrost = !desabilitarTravaValvulaMutacao && !emNoFoil;

  const geometriaBase = calcularGeometriaLayoutNativo(ORCAMENTO_LAYOUT_NATIVO_85C);
  const deslocamentoVerticalPx = emNoFoil ? 0 : ORCAMENTO_LAYOUT_NATIVO_85C.QUEDA_TOUCHDOWN;

  // 1. Termômetro Vertical de Sustentação (Peso vs Sustentação + Ghost Preview Seção 2.1)
  const pesoTotalKg = calcularPesoTotalNave(nave);
  const sustentacaoAtualKg = calcularSustentacaoFoil(nave);
  const ghostPreview = calcularGhostPreviewTermometro(estado, opcoesDebug.idHitboxHover ?? null);

  const termometroSustentacao = {
    escalaTopoKg: 300,
    escalaBaseKg: 100,
    pesoTotalKg,
    sustentacaoAtualKg,
    emSobrepeso: pesoTotalKg > sustentacaoAtualKg,
    alertaTouchdownAtivo: !emNoFoil,
    ghostPreview,
    botaoMergulhoTatico: {
      rotulo: 'MERGULHO TÁTICO',
      ativo: Boolean(nave.mergulhoTaticoAtivo),
    },
    botaoDrenarTudo: {
      atalho: '[V] DRENAR TUDO',
      travadoTouchdown: travadoHidrost,
      desabilitado: travadoHidrost,
      statusValvula: travadoHidrost ? 'TRAVADA_TOUCHDOWN' : 'DISPONIVEL_NO_FOIL',
    },
  };

  // 2. Corte Transversal das 8 Câmaras (2 colunas x 4 andares, 50x35 px nativos cada, coordenadas Seção 1.6.A)
  const camaras = nave.camaras.map((c) => {
    const coordPadrao = COORDENADAS_GRADE_CAMARAS_16A[c.id] ?? { coluna: 0, andar: 0 };
    const coluna = Number(c.coluna ?? coordPadrao.coluna);
    const andar = Number(c.andar ?? coordPadrao.andar);
    const aguaKg = Number(c.aguaKg ?? 0);
    const nivelAguaPct = Math.round((aguaKg / 12.5) * 1000) / 10;
    const tripulantesPresentes = nave.tripulacao
      .filter((t) => t.localizacao === 'NAVE_JOGADOR' && t.camaraAtualId === c.id && t.hpAtual > 0)
      .map((t) => ({
        id: t.id,
        especie: t.especie,
        hpAtual: t.hpAtual,
        hpMax: t.hpMax ?? 100,
        inflado: Boolean(t.inflado),
        acopladoBulbo: Boolean(t.acopladoBulbo),
      }));

    const invasoresPresentes = (nave.invasores ?? [])
      .filter((inv) => inv.camaraAtualId === c.id && inv.hpAtual > 0)
      .map((inv) => ({
        id: inv.id,
        especie: inv.especie ?? 'MARINHEIRO',
        hpAtual: inv.hpAtual,
        hpMax: inv.hpMax ?? 100,
      }));

    const statusValvulaExterna = travadoHidrost
      ? 'TRAVADA_TOUCHDOWN'
      : c.valvulaExternaAberta
        ? 'ABERTA'
        : 'FECHADA_DISPONIVEL';

    return {
      id: c.id,
      nome: c.nome,
      coluna,
      andar,
      larguraNativaPx: ORCAMENTO_LAYOUT_NATIVO_85C.CAMARA_LARGURA,
      alturaNativaPx: ORCAMENTO_LAYOUT_NATIVO_85C.CAMARA_ALTURA,
      aguaKg,
      nivelAguaPct,
      oxigenioPct: Number(c.oxigenioPct ?? 100),
      rombosCasco: Math.max(Number(c.rombosCasco ?? 0), c.brechaAtiva || c.arrombouCasco ? 1 : 0),
      brechaAtiva: Boolean(c.brechaAtiva || c.arrombouCasco) || Number(c.rombosCasco ?? 0) > 0,
      curtoCircuitoAtivo: Boolean(c.curtoCircuitoAtivo),
      valvulaExternaAberta: Boolean(c.valvulaExternaAberta),
      statusValvulaExterna,
      botaoValvulaDesabilitado: travadoHidrost,
      iconeCadeadoVisivel: travadoHidrost,
      barrasNivelMax: Number(c.barrasNivelMax ?? c.nivelMaxBarras ?? c.nivelMax ?? 0),
      barrasIntegridade: Number(c.barrasIntegridade ?? c.integridade ?? 0),
      barrasEnergiaAlocada: Number(c.barrasEnergiaAlocada ?? c.energiaAlocada ?? 0),
      tripulantesPresentes,
      invasoresPresentes,
    };
  });

  // 3. Caixa de Sistemas (6 Sistemas + 2 Subsistemas = 8 itens na barra inferior)
  const caixaSistemas = SISTEMAS_BARRA_INFERIOR_CANONICOS.map((sys) => {
    const cam = camaras.find((c) => c.id === sys.camaraId);
    return {
      id: sys.id,
      sigla: sys.sigla,
      tipo: sys.tipo,
      camaraId: sys.camaraId,
      instalado: (cam?.barrasNivelMax ?? 0) > 0,
      barrasNivelMax: cam?.barrasNivelMax ?? 0,
      barrasIntegridade: cam?.barrasIntegridade ?? 0,
      barrasEnergiaAlocada: cam?.barrasEnergiaAlocada ?? 0,
    };
  });

  // 4. Caixa de Armas: estritamente 4 Slots Ativos (0..3), jamais misturando Tubo Pressurizado (MUT-O6-02)
  const slotsBase = [0, 1, 2, 3].map((slotIdx) => {
    const entrada = (nave.armasAtivas ?? [])[slotIdx];
    const armaObj = entrada?.arma !== undefined ? entrada.arma : entrada ?? null;
    return {
      slotIndex: slotIdx,
      ocupado: Boolean(armaObj),
      tipoItem: armaObj ? 'ARMA_DORSAL' : 'VAZIO',
      chassiId: armaObj?.chassiId ?? armaObj?.id ?? null,
      soquetesMax: armaObj?.soquetesMax ?? armaObj?.soquetes ?? 0,
      orgaosEnxertados: armaObj?.orgaosEnxertados ?? [],
      energiaCusto: armaObj?.energiaCusto ?? armaObj?.energia ?? 0,
      progressoRecargaSeg: armaObj?.progressoRecargaSeg ?? 0,
      salaAlvoId: armaObj?.salaAlvoId ?? null,
    };
  });

  const caixaArmas =
    opcoesDebug.misturarTuboNaCaixaArmas === true
      ? [...slotsBase.slice(0, 3), { slotIndex: 3, ocupado: true, tipoItem: 'SUBSISTEMA_TUBO_PRESSURIZADO', chassiId: 'TUBO_PRESSURIZADO' }]
      : slotsBase;

  // 5. Painel do Alvo respeitando estritamente o Canal de Visibilidade L3 (MUT-O6-03)
  const salasAlvoBrutas = estado.alvoCombate?.salasOuOrgaos ?? [];
  const salasInspecionadas = salasAlvoBrutas.map((s) => {
    const inspecao = inspecionarSalaAlvo(estado, s.id);
    const metadadosBaseSala = {
      salaId: s.id,
      nomeSala: s.nome ?? `SALA_${s.id}`,
      submersa: Boolean(s.submersa),
      barrasIntegridade: Number(s.integridadeAtual ?? s.integridade ?? s.barrasIntegridade ?? 1),
      barrasMax: Number(s.integridadeMax ?? s.barrasMax ?? 1),
      aguaKg: Number(s.aguaKg ?? 0),
    };
    if (inspecao.canalPermissao !== 'VISIVEL') {
      if (opcoesDebug.vazarZeroTripulantesQuandoCegoL3 === true) {
        return {
          ...metadadosBaseSala,
          canalPermissao: inspecao.canalPermissao,
          status: inspecao.status,
          marcadorExplicito: inspecao.marcadorExplicito,
          tripulantesVisiveis: [],
          textoTripulacao: '0 tripulantes',
        };
      }
      return {
        ...metadadosBaseSala,
        canalPermissao: inspecao.canalPermissao,
        status: inspecao.status,
        marcadorExplicito: inspecao.marcadorExplicito,
        tripulantesVisiveis: undefined,
        textoTripulacao: inspecao.marcadorExplicito,
      };
    }
    const qtd = inspecao.dados.tripulantes.length;
    return {
      ...metadadosBaseSala,
      canalPermissao: inspecao.canalPermissao,
      status: inspecao.status,
      marcadorExplicito: inspecao.marcadorExplicito,
      tripulantesVisiveis: inspecao.dados.tripulantes,
      textoTripulacao: `${qtd} tripulante(s)`,
    };
  });

  const esquivaEfetivaPct = calcularEsquivaEfetivaNave(nave);
  const cargaSaltoPct = Number(
    nave.cargaSaltoPct ?? Math.min(100, Math.round(((nave.progressoFugaSeg ?? 0) / 20.0) * 100))
  );
  const idCarcaca = nave.idArquitetura ?? nave.idCarcaca ?? 'CARCACA_ALFA';
  const barrasTotaisReator = Number(
    nave.reator?.barrasTotais ?? ((nave.reator?.barrasCompradas ?? 6) + (nave.reator?.barrasBonusArraias ?? 0))
  );
  const somaEnergiaAlocada = camaras.reduce((acc, c) => acc + c.barrasEnergiaAlocada, 0);
  const barrasLivresReator = Math.max(0, barrasTotaisReator - somaEnergiaAlocada);

  return clonarProfundoCongelado({
    idCarcaca,
    idArquitetura: idCarcaca,
    faseJogo: estado.meta?.faseJogo ?? 'COMBATE',
    resolucaoNativa: {
      largura: 960,
      altura: 540,
      upscaleFullHd: 2,
      larguraFullHd: 1920,
      alturaFullHd: 1080,
      imageRendering: 'pixelated',
    },
    orcamentoLayoutNativo: ORCAMENTO_LAYOUT_NATIVO_85C,
    geometria: {
      ...geometriaBase,
      deslocamentoVerticalAtualPx: deslocamentoVerticalPx,
      filtroPassaBaixaAudioHz: emNoFoil ? null : 400,
    },
    barraSuperior: {
      hpCascoAtual: nave.hpCascoAtual,
      hpCascoMax: nave.hpCascoMax,
      barreiraBolhas: Number(nave.barreiraBolhas ?? nave.camadasBarreiraAtivas ?? nave.barreira?.bolhasAtuais ?? 0),
      estadoFisico: nave.estadoFisico,
      rotuloEstado: emNoFoil ? 'NO FOIL' : 'TOUCHDOWN',
      esquivaEfetivaPct,
      cargaSaltoPct,
      recursos: estado.economia ?? estado.recursos ?? { sucata: 30, biomassa: 15, combustivel: 12, municao: 8 },
    },
    reatorCoracaoBioEletrico: {
      barrasTotais: barrasTotaisReator,
      barrasDisponiveis: Number(nave.reator?.barrasDisponiveis ?? nave.energiaLivre ?? 0),
      barrasLivres: barrasLivresReator,
    },
    termometroSustentacao,
    camaras,
    caixaSistemas,
    caixaArmas,
    painelAlvo: {
      presente: Boolean(estado.alvoCombate && estado.alvoCombate.ativo !== false),
      nomeAlvo: estado.alvoCombate?.nome ?? estado.alvoCombate?.idInimigo ?? null,
      classeAlvo: estado.alvoCombate?.classeAlvo ?? estado.alvoCombate?.classeInimigo ?? null,
      hpCascoAtual: estado.alvoCombate?.hpCascoAtual ?? 0,
      hpCascoMax: estado.alvoCombate?.hpCascoMax ?? 0,
      barreiraBolhas: Number(estado.alvoCombate?.camadasBarreiraAtivas ?? estado.alvoCombate?.barreiraBolhasAtual ?? 0),
      esquivaPct: Number(estado.alvoCombate?.esquivaEfetivaPct ?? estado.alvoCombate?.esquivaBasePct ?? 0),
      blindagemTermicaExternaPts: estado.alvoCombate?.blindagemTermicaExternaPts ?? 0,
      salasInspecionadas,
    },
  });
}

/**
 * Paleta RGBA Canônica Hi-Bit (Bíblia Artística Bio-Foil — contornos 1px, sem suavização).
 */
export const PALETA_PIXEL_ART_BIOFOIL = Object.freeze({
  '.': Object.freeze([0, 0, 0, 0]),
  '#': Object.freeze([6, 10, 15, 255]),
  Q: Object.freeze([8, 13, 19, 255]),
  C: Object.freeze([79, 242, 255, 255]),
  M: Object.freeze([255, 42, 56, 255]),
  E: Object.freeze([57, 230, 98, 255]),
  H: Object.freeze([110, 130, 140, 255]),
  A: Object.freeze([30, 45, 56, 255]),
  O: Object.freeze([245, 158, 11, 255]),
  V: Object.freeze([91, 42, 134, 255]),
  W: Object.freeze([214, 232, 240, 255]),
  L: Object.freeze([255, 224, 51, 255]),
});

/**
 * Tokens Semânticos Hexadecimais Canônicos da Bíblia Artística Bio-Foil (Seção 1.3).
 */
export const TOKENS_PALETA_BIBLIA_ARTISTICA_13 = Object.freeze({
  BG_ABYSS: '#060A0F',
  HUD_PANEL: '#080D13',
  HUD_BORDER: '#1E2D38',
  HUD_RIM: '#385668',
  TXT_PRIMARY: '#D6E8F0',
  TXT_DIM: '#6E828C',
  BIO_GREEN: '#39E662',
  FOIL_CYAN: '#4FF2FF',
  LIFT_AMBER: '#F59E0B',
  ALERT_RED: '#FF2A38',
  SPARK_YELLOW: '#FFE033',
  ORGAN_VIOLET: '#5B2A86',
});

/**
 * Matrizes Pixel-Art Hi-Bit Artesanais das 32 entidades (26 entidades canônicas + 6 elementos cênicos da Bíblia Artística),
 * todas com exterior transparente `.`, contorno de 1px `#`, dithering em xadrez e anatomia individual fiel às Pranchas F1..F5.
 */
export const GRADES_SPRITES_HIBITS_ARTESANAIS = Object.freeze({
  // === 5 CARCAÇAS BIOLÓGICAS JOGÁVEIS (Regra R2: 100% biológicas vivas, sem ossos/caveiras, sem chapas rebitadas) ===
  CARCACA_ALFA: Object.freeze([
    '......############......',
    '....##QQCCCCCCCCQQ##....',
    '...#QQCCQQQQQQQQCCQQ#...',
    '..#QCCQQ########QQCCQ#..',
    '.#QCQQ##CCCCCCCC##QQCQ#.',
    '.#QCQ#CCQQQQQQQQCC#QCMM#',
    '#QCQ#CQ##########QC#MWWM',
    '#QCQ#CQ#CCCCCCCC#QC#MMW#',
    '#QCQ#CCQ########QCC#MMM#',
    '.#QCQ##CCCCCCCCCC##QMM#.',
    '..#QCCQQ########QQCMM#..',
    '...#QQCCCCCCCCCCCCQQ#...',
    '....##QQQQQQQQQQQQ##....',
    '......############......',
  ]),
  MANTA_VOLT: Object.freeze([
    '.........######.........',
    '.......##AAOOAA##.......',
    '.....##AAAOOOOAAA##.....',
    '...##AAAAOLLLOOAAAA##...',
    '.##AAACCCOOOOOOCCCAAA##.',
    '#CCCCAAAAOLLLOOAAAACCCC#',
    '#####AAAAOOOOOOAAAA#####',
    '....##AAACCCCCAAA##.....',
    '......##AAAAAAAA##......',
    '........###AA###........',
    '.......#AA####..........',
    '......#A#...............',
    '.....#A#................',
    '.....##.................',
  ]),
  COURACA_LIMIAR: Object.freeze([
    '.....##############.....',
    '...##MMMMOOOOOOMMMM##...',
    '..#MMMOOOOOOOOOOOOMMM#..',
    '.#MMOOO##########OOOMM#.',
    '#MMOO##MMMMMMMMMM##OOMM#',
    '#MMO#MMOOOOOOOOOOMM#OMMM',
    '#MMO#MOO########OOM#OMWL',
    '#MMO#MMOOOOOOOOOOMM#OMWL',
    '#MMOO##MMMMMMMMMM##OOMM#',
    '.#MMOOO##########OOOMM#.',
    '..#MMMMMMMMMMMMMMMMMM#..',
    '...###MM###..###MM###...',
    '.....#####....#####.....',
    '........................',
  ]),
  SOMBRA_ABISSAL: Object.freeze([
    '..#.#....##########.....',
    '.#V#V#.##VVVVVVVVVV##...',
    '..#.#.#VVVVCCCCCCVVVV#..',
    '.#V#.###VVCCCCCCCCVVVV#.',
    '#.#V#VVV#VVCCWWCCVVVVVV#',
    '.###VVVV##VVCWWCCVVVVVV#',
    '#V#VVVVV#VVCCCCCCVVVVVV#',
    '.#.###VV##VVVVVVVVVVVV#.',
    '..#V#.#VVVVCCCCCCVVVV#..',
    '.#.#V#.##VVVVVVVVVV##...',
    '..#.#....##########.....',
    '........................',
  ]),
  COLMEIA_VIVA: Object.freeze([
    '...###....####....###...',
    '..#EEE#..#EEEE#..#EEE#..',
    '..#ECE#..#ECCE#..#ECE#..',
    '...#EE####EEEE####EE#...',
    '..#MMMMMMEEEEEEMMMMMM#..',
    '.#MMMEEEEMMMMMMEEEEMMM#.',
    '#MMMEECCEEMMMMEECCEEMMM#',
    '#MMMEEEEEEMMMMEEEEEEMMM#',
    '#MMMMMMEEEEEEEEEMMMMMMM#',
    '.#MMMMMMMEEEEEEMMMMMMM#.',
    '..##MMMMMMMMMMMMMMMM##..',
    '....################....',
  ]),

  // === 5 SPRITES DE TRIPULAÇÃO ALIADA (Seção 1.5 Vol. 01 + Prancha F5) ===
  POLVO: Object.freeze([
    '....######....',
    '..##MMMMMM##..',
    '.#MMCCCCCCMM#.',
    '#MMCWWMMWWCMM#',
    '#MMC#WMMW#CMM#',
    '.#MMMMMMMMMM#.',
    '..##MMMMMM##..',
    '.#MM##MM##MM#.',
    '#MM#.#MM#.#MM#',
    '#ML#.#ML#.#ML#',
    '.##...##...##.',
    '..............',
  ]),
  ARRAIA: Object.freeze([
    '.......##.......',
    '.....##AA##.....',
    '...##AACCAA##...',
    '.##AACOLLOCAA##.',
    '#AACCOLLLLOCCAA#',
    '.##AACOLLOCAA##.',
    '...##AACCAA##...',
    '.....##AA##.....',
    '.......##.......',
    '.......#C#......',
    '......#C#.......',
    '......##........',
  ]),
  BAIACU_NORMAL: Object.freeze([
    '....######....',
    '..##EEOOEE##..',
    '.#WEEOOOOEEW#.',
    '#C#EOOW#OOEEW#',
    '#CCEOOOOOOEEE#',
    '#C#EOOOOOOEEW#',
    '.#WEEOOOOEEW#.',
    '..##EEOOEE##..',
    '....######....',
    '..............',
    '..............',
    '..............',
  ]),
  BAIACU_INFLADO: Object.freeze([
    '....##...##...##....',
    '...#WW#.#WW#.#WW#...',
    '....#W###OO###W#....',
    '.##.#OOOOOOOOOO#.##.',
    '#WW##OOLLLLLLOO##WW#',
    '.#W#OOLW#OO#WLOO#W#.',
    '..#OOOLW#OO#WLOOO#..',
    '#WW#OOLLLLLLLLOO#WW#',
    '#WW#OOOOOMMMMOOO#WW#',
    '..#OOLLLLLLLLLLOO#..',
    '.#W#OOOOOOOOOOOO#W#.',
    '#WW##OOLLLLLLOO##WW#',
    '.##.#OOOOOOOOOO#.##.',
    '....#W###OO###W#....',
    '...#WW#.#WW#.#WW#...',
    '....##...##...##....',
    '....................',
    '....................',
  ]),
  CARANGUEJO: Object.freeze([
    '.###........###.',
    '#MWM#......#MWM#',
    '#MMM########MMM#',
    '.#MMMMMMMMMMMM#.',
    '#MMMW#MMMM#WMMM#',
    '#MMOOOOOOOOOOMM#',
    '#MMMMMMMMMMMMMM#',
    '.###MMMMMMMM###.',
    '#M#.#M#..#M#.#M#',
    '##..##....##..##',
    '................',
    '................',
  ]),

  // === 3 INVASORES (Prancha F5) ===
  MARINHEIRO: Object.freeze([
    '....####....',
    '...#HHHH#...',
    '...#WWWW#...',
    '..##MMMM##..',
    '.#HMMOOOMMH#',
    '.#HMMOOOMMH#',
    '.#H#MMMM#H#.',
    '..#QQQQQQ#..',
    '..#QQ##QQ#..',
    '..#QQ##QQ#..',
    '..#QQ##QQ#..',
    '..###..###..',
    '............',
    '............',
  ]),
  MERGULHADOR: Object.freeze([
    '...######...',
    '..#OOOOOO#..',
    '..#OCCCCO#..',
    '..#OOOOOO#..',
    '.##AAAAAA##.',
    '#AAOOOOOOAA#',
    '#AAOOOOOOAA#',
    '#AA#AAAA#AA#',
    '.##.#AA#.##.',
    '...#AAAA#...',
    '...#AA#A#...',
    '...######...',
    '............',
    '............',
  ]),
  PARASITA: Object.freeze([
    '......####..',
    '....##VVVV#.',
    '..##VVEEVVW#',
    '.#VVEEVVV#M#',
    '#VVEVVV##MW#',
    '#VEEVV#..##.',
    '.#VVV#......',
    '..###.......',
    '............',
    '............',
  ]),

  // === 7 CHASSIS DE ARMAS METÁLICAS RECUPERADAS (Regra R2: aço oxidado H/A + 2 tendões vermelhos M + soquetes exatos W: 1,1,2,1,1,2,2) ===
  EMISSOR_ACUSTICO_I: Object.freeze([
    '..............####..',
    '............##HCCC#.',
    '..##########HHCCLC#.',
    '.#HHHHHHHHWHHCCCLC#.',
    '.#HHHHHHHHHHHHCCLC#.',
    '..##MM####MM##HCCC#.',
    '...#MM#..#MM#.####..',
    '...####..####.......',
    '....................',
    '....................',
  ]),
  RAJADA_HIDROPNEUMATICA_II: Object.freeze([
    '..############........',
    '.#HHHHHHHHHHHH########',
    '.#HHHWHHHHHHHHCCCCCCL#',
    '.#HHHHHHHHHHHH########',
    '.#HHHHHHHHHHHHCCCCCCL#',
    '.#HHHHHHHHHHHH########',
    '.#HHHHHHHHHHHHCCCCCCL#',
    '..##MM####MM##########',
    '...#MM#..#MM#.........',
    '...####..####.........',
  ]),
  CANHAO_ARPAO_CABO: Object.freeze([
    '..####................',
    '.#OOOO##########....#.',
    '.#OAAOHHHWHHWHHH####C#',
    '.#OAAOHHHHHHHHHHCCCCC#',
    '.#OOOO##########AAAAC#',
    '..##MM####MM####....#.',
    '...#MM#..#MM#.........',
    '...####..####.........',
    '......................',
    '......................',
  ]),
  DISPERSOR_ESTILHACOS: Object.freeze([
    '..............######..',
    '..############HLLLLH#.',
    '.#HHHHHHHHHHHHHLLLLH#.',
    '.#HHHWHHHHHHHH######..',
    '.#HHHHHHHHHHHH######..',
    '.#HHHHHHHHHHHHHLLLLH#.',
    '..##MM####MM##HLLLLH#.',
    '...#MM#..#MM#.######..',
    '...####..####.........',
    '......................',
    '......................',
    '......................',
  ]),
  CORTADOR_TERMICO_PLASMA: Object.freeze([
    '..################......',
    '.#HHHLLHHLLHHLLHHH####..',
    '.#HHHWLHHLLHHLLHHHCCCC#.',
    '.#HHHLLHHLLHHLLHHHLLLL#.',
    '.#HHHHHHHHHHHHHHHHCCCC#.',
    '..##MM######MM########..',
    '...#MM#....#MM#.........',
    '...####....####.........',
    '........................',
    '........................',
  ]),
  LANCADOR_TORPEDO_ABISSAL: Object.freeze([
    '.####.....................',
    '#AAAA#################....',
    '#AAAAHHHWHHWHHHEEEEEE##...',
    '#AAAAHHHHHHHHHHEEEEEELL#..',
    '#AAAAHHHHHHHHHHEEEEEECC#..',
    '#AAAA#################....',
    '.##MM######MM###..........',
    '..#MM#....#MM#............',
    '..####....####............',
    '..........................',
  ]),
  MORTEIRO_ESPOROS: Object.freeze([
    '..........######......',
    '.........#HHHHHH#.....',
    '........#HHHHHH#......',
    '..######HHHHHH#.......',
    '.#HHHWHHWHHEEE#.......',
    '.#HHHHHHHHHECE#.......',
    '..##MM####MMEE#.......',
    '...#MM#..#MM###.......',
    '...####..####.........',
    '......................',
  ]),

  // === 6 ÓRGÃOS BIOLÓGICOS DE ENXERTO (10x10 px, +5 kg cada, com dithering em xadrez nas auréolas bioluminescentes — Prancha F5) ===
  GLANDULA_BAIACU: Object.freeze([
    '.E.#.##.E.',
    'E.##EEEE#.E',
    '.#EECEECE#',
    '#EEEEEEEE#',
    '#EECEECEE#',
    '.#EEEEEE#.',
    'E.#MMMM#.E',
    '.E.#CW#.E.',
    '..E.##.E..',
    '.E..E...E.',
  ].map((s) => s.slice(0, 10))),
  ELETRO_PLACA_ARRAIA: Object.freeze([
    '.C.######.',
    'C.#OOOOOO#',
    '.#OOCCCCO#',
    '#OCLLLLCO#',
    '#OCLLLLCO#',
    '#OOCCCCOO#',
    '.#OOOOOO#C',
    'C.#VVVV#.C',
    '.C.####.C.',
    'C..C..C..C',
  ]),
  BEXIGA_PRESSAO_ABISSAL: Object.freeze([
    '.C.####.C.',
    'C..#OO#..C',
    '.##AAAA##.',
    '#AACCCWAA#',
    '#AACCCCAA#',
    '#AACCCCAA#',
    '.#AAAAAA#.',
    'C.######.C',
    '.C..C..C..',
    'C..C..C..C',
  ]),
  BOLSA_TINTA_CEGANTE: Object.freeze([
    '.V..V###V.',
    'V.V.#VCC#V',
    '.V##VVV#.V',
    'V#VVVVVV#.',
    '#VVQVVQVV#',
    '#VVVVVVVV#',
    'V#VVVVVV#V',
    '.V######V.',
    'V.V.V.V.V.',
    '.V.V.V.V.V',
  ]),
  DENTE_LEVIATA_SERRILHADO: Object.freeze([
    '.M.M..###.',
    'M.M..#WWW#',
    '.M..#WWWH#',
    'M..#WWWH#.',
    '..#WWWH#.M',
    '.#MMMM#.M.',
    '#MMMMM#M.M',
    '.#####..M.',
    'M.M.M.M..M',
    '.M.M.M.M..',
  ]),
  GLANDULA_TERMOFILICA: Object.freeze([
    'O###..###O',
    '#OLO##OLO#',
    '#OLLOOLLO#',
    '#OOWWWWOO#',
    '#OOWWWWOO#',
    'O#OOOOOO#O',
    '.O#MMMM#O.',
    'O.O####O.O',
    '.O.O..O.O.',
    'O.O.OO.O.O',
  ]),

  // === 6 SPRITES CÊNICOS / ESTRUTURAIS DA BÍBLIA ARTÍSTICA (Coração Bio-Elétrico R6, Bulbo Neural, Válvula, Cadeado, Lancha e Teuthis) ===
  CORACAO_BIO_ELETRICO: Object.freeze([
    '.....########.....',
    '...##VVVVVVVV##...',
    '..#VVCCCCCCCCVV#..',
    '.#VVCVVVVVVVVCVV#.',
    '#VVCVVLLLLLLVVCVV#',
    '#VVCVLLWWWWLLVCVV#',
    '#VVCVLLWWWWLLVCVV#',
    '#VVCVVLLLLLLVVCVV#',
    '.#VVCVVVVVVVVCVV#.',
    '..#VVCCCCCCCCVV#..',
    '...##VVVVVVVV##...',
    '.....########.....',
  ]),
  BULBO_NEURAL: Object.freeze([
    '..####..',
    '.#CCCC#.',
    '#CCWWCC#',
    '#CCEECC#',
    '.#CCCC#.',
    '..#MM#..',
    '..####..',
  ]),
  VALVULA_ESFINCTER: Object.freeze([
    '.######.',
    '#MOOOOO#',
    '#MOLLOM#',
    '#M#QQ#M#',
    '#M#QQ#M#',
    '#MOLLOM#',
    '#MOOOOO#',
    '.######.',
  ]),
  CADEADO_HIDROSTATICO: Object.freeze([
    '..####..',
    '.#WWWW#.',
    '.#W..W#.',
    '########',
    '#OOOOOO#',
    '#OO##OO#',
    '#OOOOOO#',
    '########',
  ]),
  LANCHA_PATRULHEIRA: Object.freeze([
    '.............######......########.......',
    '.......######HHHHHH######HHHHHHHH#......',
    '....###HHHHHHHHHHHHHHHHHHHHHHHHHH#......',
    '..##HHHHHHHHHCCCCCCCHHHHHCCCCCCCC#......',
    '#HHHHHHHHHHHHCCCCCCCHHHHHCCCCCCCC##.....',
    '#CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC###..',
    '######################################O#',
    '.#AAAAAAAAAAAOOOOOOOAAAAACCCCCCCCAAAA#O#',
    '..#AAAAAAAAAAOOOOOOOAAAAACCCCCCCCAAA##..',
    '...#################################....',
  ]),
  TEUTHIS_COURACADA: Object.freeze([
    '..##....##....############..............',
    '.#VV#..#VV#.##VVVVVVVVVVVV##............',
    '#VV#..#VV#.#VVVVCCCCCCCCVVVV#...........',
    '.#VV##VV#.#VVVVCCWWWWWWCCVVVV#..........',
    '..#VVVV#..#VVVVCCWWWWWWCCVVVV#..........',
    '...####...#VVVVVVCCCCCCVVVVVV#..........',
    '########..#VVVVVVVVVVVVVVVVVV#..........',
    '#MMMMMM####CCCCCCCCCCCCCCCCCC##########.',
    '.#AAAAAAAAACCCCCCOOOOOOCCCCCCCCCCCCCCC#.',
    '..#AAAAAAAACCCCCCOOOOOOCCCCCEEEEEEEECC#.',
    '...#AAAAAAAAACCCCCCCCCCCCCCCEEWWWWEECC#.',
    '....##AAAAAAAAAAAAAAAAAAAAAAEEEEEEEE##..',
    '......##############################....',
  ]),
});

/**
 * Item 3 — Retorna o Atlas de Sprites Pixel Art Hi-Bit na Grade Nativa (960x540, câmara 50x35 px)
 * contendo as 5 Carcaças, 4 Espécies Aliadas (com Baiacu normal e inflado), 3 Invasores, 7 Armas, 6 Órgãos e 6 Sprites Cênicos.
 */
export function obterAtlasSpritesNativo(opcoesDebug = {}) {
  const asaCouracaPadraoMutacao = opcoesDebug.reduzirAsaCouracaLimiar === true;
  const larguraAsaPadraoPx = 44;
  const larguraAsaCouracaPx = asaCouracaPadraoMutacao ? larguraAsaPadraoPx : larguraAsaPadraoPx * 2;

  const carcacas = [
    {
      id: 'CARCACA_ALFA',
      nome: 'CARCAÇA ALFA',
      hpCascoMax: 30,
      pesoTotalKg: 225,
      sustentacaoMaxKg: 260,
      larguraSpritePx: 24,
      alturaSpritePx: 14,
      larguraAsaSubmersaPx: larguraAsaPadraoPx,
      temTuboAbordagemFrontal: false,
      temNevoaTinta: false,
      temPoliposBioluminescentes: false,
      tripulacaoInicial: Object.freeze({ POLVO: 1, ARRAIA: 1, BAIACU: 1 }),
      gradePixels: GRADES_SPRITES_HIBITS_ARTESANAIS.CARCACA_ALFA,
    },
    {
      id: 'MANTA_VOLT',
      nome: 'MANTA-VOLT',
      hpCascoMax: 30,
      pesoTotalKg: 195,
      sustentacaoMaxKg: 260,
      larguraSpritePx: 24,
      alturaSpritePx: 14,
      larguraAsaSubmersaPx: larguraAsaPadraoPx,
      temTuboAbordagemFrontal: false,
      temNevoaTinta: false,
      temPoliposBioluminescentes: false,
      tripulacaoInicial: Object.freeze({ ARRAIA: 2, POLVO: 1 }),
      gradePixels: GRADES_SPRITES_HIBITS_ARTESANAIS.MANTA_VOLT,
    },
    {
      id: 'COURACA_LIMIAR',
      nome: 'COURAÇA-LIMIAR',
      hpCascoMax: 30,
      pesoTotalKg: 225,
      sustentacaoMaxKg: 300,
      larguraSpritePx: 24,
      alturaSpritePx: 14,
      larguraAsaSubmersaPx: larguraAsaCouracaPx,
      temTuboAbordagemFrontal: true,
      temNevoaTinta: false,
      temPoliposBioluminescentes: false,
      tripulacaoInicial: Object.freeze({ CARANGUEJO: 2, BAIACU: 1 }),
      gradePixels: GRADES_SPRITES_HIBITS_ARTESANAIS.COURACA_LIMIAR,
    },
    {
      id: 'SOMBRA_ABISSAL',
      nome: 'SOMBRA-ABISSAL',
      hpCascoMax: 20,
      pesoTotalKg: 220,
      sustentacaoMaxKg: 260,
      larguraSpritePx: 24,
      alturaSpritePx: 12,
      larguraAsaSubmersaPx: larguraAsaPadraoPx,
      temTuboAbordagemFrontal: false,
      temNevoaTinta: true,
      temPoliposBioluminescentes: false,
      tripulacaoInicial: Object.freeze({ POLVO: 1, CARANGUEJO: 1 }),
      gradePixels: GRADES_SPRITES_HIBITS_ARTESANAIS.SOMBRA_ABISSAL,
    },
    {
      id: 'COLMEIA_VIVA',
      nome: 'COLMEIA-VIVA',
      hpCascoMax: 30,
      pesoTotalKg: 230,
      sustentacaoMaxKg: 260,
      larguraSpritePx: 24,
      alturaSpritePx: 12,
      larguraAsaSubmersaPx: larguraAsaPadraoPx,
      temTuboAbordagemFrontal: false,
      temNevoaTinta: false,
      temPoliposBioluminescentes: true,
      tripulacaoInicial: Object.freeze({ BAIACU: 2, ARRAIA: 1 }),
      gradePixels: GRADES_SPRITES_HIBITS_ARTESANAIS.COLMEIA_VIVA,
    },
  ];

  // Valores canônicos exatos da Seção 1.5 (Vol. 01): Polvo 80 HP/5 DPS, Arraia 70 HP/8 DPS, Baiacu 150 HP/14 DPS, Caranguejo 110 HP/12 DPS
  const aliados = [
    {
      id: 'POLVO',
      especie: 'POLVO',
      estadoVisual: 'NORMAL',
      hpMax: 80,
      dps: 5,
      larguraPx: 14,
      alturaPx: 12,
      gradePixels: GRADES_SPRITES_HIBITS_ARTESANAIS.POLVO,
    },
    {
      id: 'ARRAIA',
      especie: 'ARRAIA',
      estadoVisual: 'NORMAL',
      hpMax: 70,
      dps: 8,
      larguraPx: 16,
      alturaPx: 12,
      gradePixels: GRADES_SPRITES_HIBITS_ARTESANAIS.ARRAIA,
    },
    {
      id: 'BAIACU_NORMAL',
      especie: 'BAIACU',
      estadoVisual: 'NORMAL',
      hpMax: 150,
      dps: 14,
      larguraPx: 14,
      alturaPx: 12,
      gradePixels: GRADES_SPRITES_HIBITS_ARTESANAIS.BAIACU_NORMAL,
    },
    {
      id: 'BAIACU_INFLADO',
      especie: 'BAIACU',
      estadoVisual: 'INFLADO_ESPINHOSO',
      hpMax: 150,
      dps: 14,
      vedaRomboPct: 100,
      refleteDpsPct: 50,
      larguraPx: 20,
      alturaPx: 18,
      gradePixels: GRADES_SPRITES_HIBITS_ARTESANAIS.BAIACU_INFLADO,
    },
    {
      id: 'CARANGUEJO',
      especie: 'CARANGUEJO',
      estadoVisual: 'NORMAL',
      hpMax: 110,
      dps: 12,
      larguraPx: 16,
      alturaPx: 12,
      gradePixels: GRADES_SPRITES_HIBITS_ARTESANAIS.CARANGUEJO,
    },
  ];

  const invasores = [
    {
      id: 'MARINHEIRO',
      nome: 'MARINHEIRO',
      hpMax: 100,
      dps: 8,
      larguraPx: 12,
      alturaPx: 14,
      gradePixels: GRADES_SPRITES_HIBITS_ARTESANAIS.MARINHEIRO,
    },
    {
      id: 'MERGULHADOR',
      nome: 'MERGULHADOR',
      hpMax: 100,
      dps: 12,
      larguraPx: 12,
      alturaPx: 14,
      gradePixels: GRADES_SPRITES_HIBITS_ARTESANAIS.MERGULHADOR,
    },
    {
      id: 'PARASITA',
      nome: 'PARASITA',
      hpMax: 60,
      dps: 10,
      larguraPx: 12,
      alturaPx: 10,
      gradePixels: GRADES_SPRITES_HIBITS_ARTESANAIS.PARASITA,
    },
  ];

  const specsArmas = [
    { id: 'EMISSOR_ACUSTICO_I', idCatalogo52: 'EMISSOR_ACUSTICO', nome: 'Acústico I', pesoKg: 10, energia: 1, soquetes: 1, municao: 0 },
    { id: 'RAJADA_HIDROPNEUMATICA_II', idCatalogo52: 'ACUSTICO_RAJADA_II', nome: 'Rajada II', pesoKg: 18, energia: 2, soquetes: 1, municao: 0 },
    { id: 'CANHAO_ARPAO_CABO', idCatalogo52: 'CANHAO_ARPAO', nome: 'Arpão de Cabo', pesoKg: 15, energia: 2, soquetes: 2, municao: 0 },
    { id: 'DISPERSOR_ESTILHACOS', idCatalogo52: 'LANCADOR_ESTILHACOS', nome: 'Estilhaços', pesoKg: 22, energia: 2, soquetes: 1, municao: 0 },
    { id: 'CORTADOR_TERMICO_PLASMA', idCatalogo52: 'FEIXE_TERMICO', nome: 'Cortador Térmico', pesoKg: 25, energia: 2, soquetes: 1, municao: 0 },
    { id: 'LANCADOR_TORPEDO_ABISSAL', idCatalogo52: 'TORPEDO_ABISSAL', nome: 'Torpedo Abissal', pesoKg: 28, energia: 2, soquetes: 2, municao: 1 },
    { id: 'MORTEIRO_ESPOROS', idCatalogo52: 'MORTEIRO_ESPOROS', nome: 'Morteiro de Esporos', pesoKg: 12, energia: 1, soquetes: 2, municao: 1 },
  ];
  const armas = specsArmas.map((a) => {
    const grade = GRADES_SPRITES_HIBITS_ARTESANAIS[a.id];
    return {
      id: a.id,
      idCatalogo52: a.idCatalogo52,
      nome: a.nome,
      pesoKg: a.pesoKg,
      energia: a.energia,
      soquetes: a.soquetes,
      municao: a.municao,
      larguraPx: grade[0].length,
      alturaPx: grade.length,
      materialVisual: 'CHASSI_HUMANO_RECUPERADO_COM_TENDOES',
      gradePixels: grade,
    };
  });

  // Valores canônicos exatos da Seção 5.2 (Vol. 05)
  const specsOrgaos = [
    { id: 'GLANDULA_BAIACU', idCatalogo52: 'GLANDULA_BAIACU', nome: 'Glândula de Baiacu', pesoKg: 5, efeito: 'veneno -6 HP/s por 10s' },
    { id: 'ELETRO_PLACA_ARRAIA', idCatalogo52: 'ELETRO_PLACA_ARRAIA', nome: 'Eletro-Placa', pesoKg: 5, efeito: 'choque 6s' },
    { id: 'BEXIGA_PRESSAO_ABISSAL', idCatalogo52: 'BEXIGA_ALTA_PRESSAO', nome: 'Bexiga de Pressão', pesoKg: 5, efeito: '+15 kg água' },
    { id: 'BOLSA_TINTA_CEGANTE', idCatalogo52: 'BOLSA_TINTA_ABISSAL', nome: 'Bolsa de Tinta', pesoKg: 5, efeito: 'cegueira 8s' },
    { id: 'DENTE_LEVIATA_SERRILHADO', idCatalogo52: 'DENTE_LEVIATA', nome: 'Dente de Leviatã', pesoKg: 5, efeito: '+1 dano' },
    { id: 'GLANDULA_TERMOFILICA', idCatalogo52: 'GLANDULA_TERMOFILICA', nome: 'Glândula Termofílica', pesoKg: 5, efeito: 'fervura 8s' },
  ];
  const orgaos = specsOrgaos.map((o) => ({
    id: o.id,
    idCatalogo52: o.idCatalogo52,
    nome: o.nome,
    pesoKg: o.pesoKg,
    efeito: o.efeito,
    larguraPx: 10,
    alturaPx: 10,
    gradePixels: GRADES_SPRITES_HIBITS_ARTESANAIS[o.id],
  }));

  const cenarios = [
    { id: 'CORACAO_BIO_ELETRICO', nome: 'Coração Bio-Elétrico Marinho', regraBiblia: 'R6_ORGAO_ELETROCITICO_MARINHO', gradePixels: GRADES_SPRITES_HIBITS_ARTESANAIS.CORACAO_BIO_ELETRICO },
    { id: 'BULBO_NEURAL', nome: 'Bulbo Neural da Câmara', regraBiblia: 'R1_GRID_2X4', gradePixels: GRADES_SPRITES_HIBITS_ARTESANAIS.BULBO_NEURAL },
    { id: 'VALVULA_ESFINCTER', nome: 'Válvula Orgânica Esfinctérica', regraBiblia: 'R1_VALVULA_LARANJA', gradePixels: GRADES_SPRITES_HIBITS_ARTESANAIS.VALVULA_ESFINCTER },
    { id: 'CADEADO_HIDROSTATICO', nome: 'Cadeado Hidrostático de Touchdown', regraBiblia: 'F2_8_CADEADOS_DOURADOS', gradePixels: GRADES_SPRITES_HIBITS_ARTESANAIS.CADEADO_HIDROSTATICO },
    { id: 'LANCHA_PATRULHEIRA', nome: 'Lancha Patrulheira Assentada na Linha d’Água', regraBiblia: 'R2_ASSENTAMENTO_HIDROSTATICO', gradePixels: GRADES_SPRITES_HIBITS_ARTESANAIS.LANCHA_PATRULHEIRA },
    { id: 'TEUTHIS_COURACADA', nome: 'Teuthis Couraçada Submersa no Mar', regraBiblia: 'R2_ASSENTAMENTO_HIDROSTATICO', gradePixels: GRADES_SPRITES_HIBITS_ARTESANAIS.TEUTHIS_COURACADA },
  ].map((c) => ({
    ...c,
    larguraPx: c.gradePixels[0].length,
    alturaPx: c.gradePixels.length,
  }));

  return clonarProfundoCongelado({
    resolucaoNativaReferencia: { largura: 960, altura: 540, camaraLargura: 50, camaraAltura: 35 },
    paletaRgba: PALETA_PIXEL_ART_BIOFOIL,
    tokensBibliaArtistica: TOKENS_PALETA_BIBLIA_ARTISTICA_13,
    carcacas,
    aliados,
    invasores,
    armas,
    orgaos,
    cenarios,
  });
}

/**
 * Rasteriza um sprite do Atlas Nativo num buffer RGBA de 32 bits por pixel e calcula seu hash FNV-1a determinístico.
 */
export function rasterizarSpriteRgba(categoria, idSprite) {
  const atlas = obterAtlasSpritesNativo();
  const lista = atlas[categoria];
  const item = Array.isArray(lista)
    ? lista.find((x) => x.id === idSprite || x.idCatalogo52 === idSprite)
    : null;
  if (!item) {
    throw new Error(`[SPRITE_INEXISTENTE_NO_ATLAS] Categoria="${categoria}" id="${idSprite}" não encontrado`);
  }

  const altura = item.gradePixels.length;
  const largura = item.gradePixels[0].length;
  const bytesRgba = [];
  let hash = 0x811c9dc5;
  let pixelsTransparentes = 0;
  let pixelsContorno1px = 0;
  let pixelsPreenchimento = 0;

  for (let y = 0; y < altura; y += 1) {
    const linha = item.gradePixels[y];
    for (let x = 0; x < largura; x += 1) {
      const ch = linha[x];
      const rgba = PALETA_PIXEL_ART_BIOFOIL[ch];
      if (ch === '.') pixelsTransparentes += 1;
      else if (ch === '#') pixelsContorno1px += 1;
      else pixelsPreenchimento += 1;
      for (const canal of rgba) {
        bytesRgba.push(canal);
        hash ^= canal & 0xff;
        hash = Math.imul(hash, 0x01000193) >>> 0;
      }
    }
  }

  return clonarProfundoCongelado({
    categoria,
    idSprite: item.id,
    largura,
    altura,
    cabeNaCamaraNativa50x35: largura <= 50 && altura <= 35,
    pixelsTransparentes,
    pixelsContorno1px,
    pixelsPreenchimento,
    hashFnv1aRgba: hash >>> 0,
    bytesRgba,
  });
}

const TABELA_CRC32_PNG = (() => {
  const tab = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tab[n] = c >>> 0;
  }
  return tab;
})();

function calcularCrc32Png(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = TABELA_CRC32_PNG[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function empacotarChunkPng(tipoAscii, dadosBuffer) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(dadosBuffer.length, 0);
  const tipoBuf = Buffer.from(tipoAscii, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(calcularCrc32Png(Buffer.concat([tipoBuf, dadosBuffer])), 0);
  return Buffer.concat([lenBuf, tipoBuf, dadosBuffer, crcBuf]);
}

function codificarBufferRgbaParaPng(largura, altura, bufferRgba) {
  const linhasBrutas = Buffer.alloc(altura * (1 + largura * 4));
  for (let y = 0; y < altura; y += 1) {
    const offsetLinha = y * (1 + largura * 4);
    linhasBrutas[offsetLinha] = 0;
    bufferRgba.copy(linhasBrutas, offsetLinha + 1, y * largura * 4, (y + 1) * largura * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    empacotarChunkPng('IHDR', ihdr),
    empacotarChunkPng('IDAT', zlib.deflateSync(linhasBrutas)),
    empacotarChunkPng('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Exporta o Sprite Sheet Hi-Bit completo (todas as 32 entidades: 5 carcaças, 5 aliados, 3 invasores,
 * 7 armas, 6 órgãos e 6 elementos cênicos da Bíblia Artística) num Buffer PNG real sem perdas.
 */
export function exportarAtlasHiBitsPngBuffer(escalaInteira = 4) {
  const escala = Math.max(1, Math.min(8, Math.floor(Number(escalaInteira) || 4)));
  const atlas = obterAtlasSpritesNativo();
  const todosItens = [
    ...atlas.carcacas.map((x) => ({ cat: 'carcacas', id: x.id })),
    ...atlas.aliados.map((x) => ({ cat: 'aliados', id: x.id })),
    ...atlas.invasores.map((x) => ({ cat: 'invasores', id: x.id })),
    ...atlas.armas.map((x) => ({ cat: 'armas', id: x.id })),
    ...atlas.orgaos.map((x) => ({ cat: 'orgaos', id: x.id })),
    ...atlas.cenarios.map((x) => ({ cat: 'cenarios', id: x.id })),
  ];
  const cols = 4;
  const rows = Math.ceil(todosItens.length / cols);
  const celulaW = 54 * escala;
  const celulaH = 40 * escala;
  const larguraPng = cols * celulaW;
  const alturaPng = rows * celulaH;
  const rgba = Buffer.alloc(larguraPng * alturaPng * 4);

  for (let i = 0; i < larguraPng * alturaPng; i += 1) {
    rgba[i * 4] = 6;
    rgba[i * 4 + 1] = 10;
    rgba[i * 4 + 2] = 15;
    rgba[i * 4 + 3] = 255;
  }

  const pintarPixel = (x, y, r, g, b, a = 255) => {
    const idx = (y * larguraPng + x) * 4;
    rgba[idx] = r;
    rgba[idx + 1] = g;
    rgba[idx + 2] = b;
    rgba[idx + 3] = a;
  };

  todosItens.forEach((entry, idx) => {
    const col = idx % cols;
    const lin = Math.floor(idx / cols);
    const ox = col * celulaW;
    const oy = lin * celulaH;

    // Moldura da célula em HUD_BORDER (#1E2D38) e filete superior HUD_RIM (#385668)
    for (let x = 2; x < celulaW - 2; x += 1) {
      pintarPixel(ox + x, oy + 2, 56, 86, 104, 255);
      pintarPixel(ox + x, oy + celulaH - 3, 30, 45, 56, 255);
    }
    for (let y = 2; y < celulaH - 2; y += 1) {
      pintarPixel(ox + 2, oy + y, 30, 45, 56, 255);
      pintarPixel(ox + celulaW - 3, oy + y, 30, 45, 56, 255);
    }

    const rast = rasterizarSpriteRgba(entry.cat, entry.id);
    const sx0 = ox + Math.floor((celulaW - rast.largura * escala) / 2);
    const sy0 = oy + Math.floor((celulaH - rast.altura * escala) / 2);
    for (let py = 0; py < rast.altura; py += 1) {
      for (let px = 0; px < rast.largura; px += 1) {
        const bi = (py * rast.largura + px) * 4;
        if (rast.bytesRgba[bi + 3] > 0) {
          for (let dy = 0; dy < escala; dy += 1) {
            for (let dx = 0; dx < escala; dx += 1) {
              pintarPixel(
                sx0 + px * escala + dx,
                sy0 + py * escala + dy,
                rast.bytesRgba[bi],
                rast.bytesRgba[bi + 1],
                rast.bytesRgba[bi + 2],
                255
              );
            }
          }
        }
      }
    }
  });

  return codificarBufferRgbaParaPng(larguraPng, alturaPng, rgba);
}

const CORES_HEX_PALETA = Object.freeze({
  '#': '#060A0F',
  Q: '#080D13',
  C: '#4FF2FF',
  M: '#FF2A38',
  E: '#39E662',
  H: '#6E828C',
  A: '#1E2D38',
  O: '#F59E0B',
  V: '#5B2A86',
  W: '#D6E8F0',
  L: '#FFE033',
});

/**
 * Item 1 & Item Artístico 2 — Renderiza o ViewModel 16:9 completo num contexto Canvas 2D nativo (960x540 -> upscale 2x 1920x1080)
 * com `imageSmoothingEnabled = false`, seguindo os tokens da Bíblia Artística (`TOKENS_PALETA_BIBLIA_ARTISTICA_13`) e todas as camadas hi-bit.
 */
export function renderizarViewModelNoCanvas2d(viewModel, ctxCanvas2d = null, opcoesDebug = {}) {
  const L = viewModel.orcamentoLayoutNativo;
  const T = TOKENS_PALETA_BIBLIA_ARTISTICA_13;
  const dy = opcoesDebug.ignorarQuedaTouchdownNoCanvas === true ? 0 : viewModel.geometria.deslocamentoVerticalAtualPx;
  const comandosDesenho = [];
  const atlas = obterAtlasSpritesNativo();

  const registrar = (cmd) => {
    comandosDesenho.push(cmd);
    if (!ctxCanvas2d) return;
    if (cmd.op === 'FILL_RECT') {
      ctxCanvas2d.fillStyle = cmd.cor;
      ctxCanvas2d.fillRect(cmd.x, cmd.y, cmd.largura, cmd.altura);
    } else if (cmd.op === 'STROKE_RECT') {
      ctxCanvas2d.strokeStyle = cmd.cor;
      ctxCanvas2d.strokeRect(cmd.x, cmd.y, cmd.largura, cmd.altura);
    } else {
      ctxCanvas2d.fillStyle = cmd.cor;
      ctxCanvas2d.fillText(cmd.texto, cmd.x, cmd.y);
    }
  };

  const desenharGradeSprite = (gradePixels, x0, y0, camada, escalaX = 1, escalaY = escalaX) => {
    for (let py = 0; py < gradePixels.length; py += 1) {
      const linha = gradePixels[py];
      for (let px = 0; px < linha.length; px += 1) {
        const ch = linha[px];
        if (ch !== '.') {
          registrar({
            op: 'FILL_RECT',
            camada,
            x: x0 + px * escalaX,
            y: y0 + py * escalaY,
            largura: escalaX,
            altura: escalaY,
            cor: CORES_HEX_PALETA[ch],
          });
        }
      }
    }
  };

  if (ctxCanvas2d) {
    ctxCanvas2d.imageSmoothingEnabled = false;
    ctxCanvas2d.font = '8px monospace';
  }

  // 1. Céu tempestuoso abissal (0..330) com chuva estritamente acima da linha d'água, cristas de espuma e oceano subaquático contínuo (330..540)
  registrar({ op: 'FILL_RECT', camada: 'CEU', x: 0, y: 0, largura: 960, altura: L.LINHA_DAGUA_Y, cor: T.BG_ABYSS });
  for (let rx = 140; rx < 940; rx += 64) {
    const ry = 48 + ((rx * 17) % 240);
    registrar({ op: 'FILL_RECT', camada: 'CHUVA_NOTURNA', x: rx, y: ry, largura: 1, altura: 8, cor: T.HUD_RIM });
  }
  registrar({
    op: 'FILL_RECT',
    camada: 'OCEANO_SUBMERSO',
    x: 0,
    y: L.LINHA_DAGUA_Y,
    largura: 960,
    altura: 540 - L.LINHA_DAGUA_Y,
    cor: '#0A2636',
  });
  registrar({ op: 'FILL_RECT', camada: 'LINHA_DAGUA', x: 112, y: L.LINHA_DAGUA_Y, largura: 848, altura: 2, cor: T.FOIL_CYAN });
  for (let wx = 120; wx < 940; wx += 36) {
    registrar({ op: 'FILL_RECT', camada: 'CRISTA_ONDA', x: wx, y: L.LINHA_DAGUA_Y - 1, largura: 10, altura: 2, cor: T.TXT_PRIMARY });
  }

  // 2. Barra Superior (y = 0..36) com tokens HUD_PANEL, HUD_BORDER e HUD_RIM
  const rec = viewModel.barraSuperior.recursos;
  const rotuloTouchdownRecarga =
    viewModel.barraSuperior.estadoFisico === '2_TOUCHDOWN'
      ? `${viewModel.barraSuperior.rotuloEstado} - ESQUIVA 0% | RECARGA -25%`
      : `${viewModel.barraSuperior.rotuloEstado} - ESQUIVA ${viewModel.barraSuperior.esquivaEfetivaPct}%`;
  registrar({ op: 'FILL_RECT', camada: 'HUD_TOPO', x: 0, y: 0, largura: 960, altura: L.HUD_TOPO_ALTURA, cor: T.HUD_PANEL });
  registrar({ op: 'FILL_RECT', camada: 'HUD_TOPO_RIM', x: 0, y: L.HUD_TOPO_ALTURA - 1, largura: 960, altura: 1, cor: T.HUD_RIM });
  registrar({
    op: 'TEXT',
    camada: 'HUD_TOPO',
    x: 12,
    y: 22,
    cor: viewModel.barraSuperior.estadoFisico === '2_TOUCHDOWN' ? T.ALERT_RED : T.BIO_GREEN,
    texto: `CASCO ${viewModel.barraSuperior.hpCascoAtual}/${viewModel.barraSuperior.hpCascoMax} | BARREIRA ${viewModel.barraSuperior.barreiraBolhas} | ${rotuloTouchdownRecarga}`,
  });
  const sufixoSaltoTouchdown = viewModel.barraSuperior.estadoFisico === '1_NO_FOIL' ? '' : ' (X0.5)';
  registrar({
    op: 'TEXT',
    camada: 'HUD_TOPO_RECURSOS',
    x: 540,
    y: 22,
    cor: T.TXT_PRIMARY,
    texto: `SUCATA ${rec.sucata} | BIO ${rec.biomassa} | COMB ${rec.combustivel} | MUN ${rec.municao} | SALTO ${viewModel.barraSuperior.cargaSaltoPct}%${sufixoSaltoTouchdown}`,
  });

  // 3. Termômetro Vertical de Sustentação (x = 0..112, y = 36..440) sem transbordo de texto
  const term = viewModel.termometroSustentacao;
  registrar({
    op: 'FILL_RECT',
    camada: 'TERMOMETRO',
    x: 0,
    y: L.HUD_TOPO_ALTURA,
    largura: L.COLUNA_TERMOMETRO_LARGURA,
    altura: L.PAINEL_RODAPE_TOPO_Y - L.HUD_TOPO_ALTURA,
    cor: T.HUD_PANEL,
  });
  registrar({
    op: 'STROKE_RECT',
    camada: 'TERMOMETRO_BORDA',
    x: 0,
    y: L.HUD_TOPO_ALTURA,
    largura: L.COLUNA_TERMOMETRO_LARGURA,
    altura: L.PAINEL_RODAPE_TOPO_Y - L.HUD_TOPO_ALTURA,
    cor: T.HUD_BORDER,
  });
  const alturaEscalaPx = 220;
  const baseEscalaY = 304;
  const topoEscalaY = baseEscalaY - alturaEscalaPx;
  const alturaPesoPx = Math.max(0, Math.min(alturaEscalaPx, Math.round(((term.pesoTotalKg - 100) / 200) * alturaEscalaPx)));
  const yLinhaSustentacao = baseEscalaY - Math.max(0, Math.min(alturaEscalaPx, Math.round(((term.sustentacaoAtualKg - 100) / 200) * alturaEscalaPx)));
  registrar({
    op: 'STROKE_RECT',
    camada: 'TERMOMETRO_TUBO_ESCALA',
    x: 16,
    y: topoEscalaY,
    largura: 30,
    altura: alturaEscalaPx,
    cor: T.HUD_BORDER,
  });
  registrar({
    op: 'TEXT',
    camada: 'TERMOMETRO_ESCALA_TOPO',
    x: 2,
    y: topoEscalaY + 6,
    cor: T.TXT_DIM,
    texto: '300',
  });
  registrar({
    op: 'TEXT',
    camada: 'TERMOMETRO_ESCALA_BASE',
    x: 2,
    y: baseEscalaY,
    cor: T.TXT_DIM,
    texto: '100',
  });
  registrar({
    op: 'FILL_RECT',
    camada: 'TERMOMETRO_BARRA_PESO',
    x: 18,
    y: baseEscalaY - alturaPesoPx,
    largura: 26,
    altura: alturaPesoPx,
    cor: term.emSobrepeso ? T.ALERT_RED : T.LIFT_AMBER,
  });
  registrar({
    op: 'FILL_RECT',
    camada: 'TERMOMETRO_LINHA_LIMITE',
    x: 12,
    y: yLinhaSustentacao,
    largura: 38,
    altura: 2,
    cor: T.FOIL_CYAN,
  });
  registrar({
    op: 'TEXT',
    camada: 'TERMOMETRO_MARCA_LIMITE',
    x: 52,
    y: yLinhaSustentacao + 3,
    cor: T.FOIL_CYAN,
    texto: `LIM ${term.sustentacaoAtualKg}`,
  });
  registrar({
    op: 'TEXT',
    camada: 'TERMOMETRO_MARCA_PESO',
    x: 52,
    y: baseEscalaY - alturaPesoPx + 3,
    cor: term.emSobrepeso ? T.ALERT_RED : T.LIFT_AMBER,
    texto: `PES ${term.pesoTotalKg}`,
  });
  registrar({
    op: 'TEXT',
    camada: 'TERMOMETRO_TEXTO',
    x: 6,
    y: 50,
    cor: term.emSobrepeso ? T.ALERT_RED : T.LIFT_AMBER,
    texto: `${term.pesoTotalKg} KG PESO`,
  });
  registrar({
    op: 'TEXT',
    camada: 'TERMOMETRO_TEXTO_LIMITE',
    x: 6,
    y: 60,
    cor: T.FOIL_CYAN,
    texto: `${term.sustentacaoAtualKg} KG LIMITE`,
  });
  if (term.alertaTouchdownAtivo) {
    registrar({
      op: 'STROKE_RECT',
      camada: 'ALERTA_TOUCHDOWN_BOX',
      x: 52,
      y: 68,
      largura: 54,
      altura: 14,
      cor: T.ALERT_RED,
    });
    registrar({
      op: 'TEXT',
      camada: 'ALERTA_TOUCHDOWN_TXT',
      x: 56,
      y: 77,
      cor: T.ALERT_RED,
      texto: 'TOUCHDOWN',
    });
  }
  if (term.ghostPreview?.ativo) {
    const yGhost =
      baseEscalaY -
      Math.max(
        0,
        Math.min(
          alturaEscalaPx,
          Math.round(((term.ghostPreview.pesoProjetadoKg - 100) / 200) * alturaEscalaPx)
        )
      );
    registrar({
      op: 'FILL_RECT',
      camada: 'TERMOMETRO_GHOST_LINHA',
      x: 12,
      y: yGhost,
      largura: 38,
      altura: 2,
      cor: term.ghostPreview.causariaQuedaNoMar ? T.ALERT_RED : T.LIFT_AMBER,
    });
    registrar({
      op: 'TEXT',
      camada: 'TERMOMETRO_GHOST_PREVIEW',
      x: 6,
      y: 332,
      cor: term.ghostPreview.causariaQuedaNoMar ? T.ALERT_RED : T.LIFT_AMBER,
      texto: `GHOST ${term.ghostPreview.pesoProjetadoKg}/${term.ghostPreview.sustentacaoProjetadaKg}KG`,
    });
    registrar({
      op: 'TEXT',
      camada: 'TERMOMETRO_GHOST_STATUS',
      x: 6,
      y: 342,
      cor: term.ghostPreview.causariaQuedaNoMar ? T.ALERT_RED : T.LIFT_AMBER,
      texto: term.ghostPreview.rotuloFantasma,
    });
  }
  registrar({
    op: 'STROKE_RECT',
    camada: 'BTN_MERGULHO_TATICO',
    x: 8,
    y: 360,
    largura: 96,
    altura: 32,
    cor: term.botaoMergulhoTatico.ativo ? T.LIFT_AMBER : T.FOIL_CYAN,
  });
  registrar({
    op: 'TEXT',
    camada: 'BTN_MERGULHO_TATICO',
    x: 12,
    y: 380,
    cor: T.TXT_PRIMARY,
    texto: term.botaoMergulhoTatico.rotulo,
  });
  registrar({
    op: 'STROKE_RECT',
    camada: 'BTN_DRENAR_TUDO',
    x: 8,
    y: 398,
    largura: 96,
    altura: 32,
    cor: term.botaoDrenarTudo.travadoTouchdown ? T.ALERT_RED : T.BIO_GREEN,
  });
  registrar({
    op: 'TEXT',
    camada: 'TERMOMETRO',
    x: 12,
    y: 418,
    cor: term.botaoDrenarTudo.travadoTouchdown ? T.ALERT_RED : T.BIO_GREEN,
    texto: term.botaoDrenarTudo.atalho,
  });

  // 4. Bio-nave do jogador: Casco Biológico Envolvente (R2), Armas Dorsais c/ Tendões, 8 Câmaras (2x4, 50x35 px), Bulbos Neurais, Válvulas Laranja, Cadeados, Quilha e Asa
  const baseGradeX = 240;
  const baseGradeY = 156 + dy;
  const larguraBlocoCamaras = 2 * L.CAMARA_LARGURA + 3 * L.PAREDE_ESPESSURA;
  const alturaBlocoCamaras = 4 * L.CAMARA_ALTURA + 5 * L.PAREDE_ESPESSURA;
  const parede2e3AndarY = baseGradeY + 2 * L.CAMARA_ALTURA + 2 * L.PAREDE_ESPESSURA;
  const specCarcaca = atlas.carcacas.find((c) => c.id === viewModel.idCarcaca) ?? atlas.carcacas[0];
  const corCascoPrincipal = specCarcaca.temNevoaTinta ? T.ORGAN_VIOLET : T.HUD_PANEL;
  const corVeiasCasco = specCarcaca.temPoliposBioluminescentes ? T.BIO_GREEN : T.FOIL_CYAN;

  // Casco orgânico vivo hi-bit (28x16 escalado 7x11 = 196x176 px) envolvendo o bloco 2x4 inteiro (sem ossos/caveiras, sem chapas rebitadas e sem adesivo colado na lateral)
  desenharGradeSprite(specCarcaca.gradePixels, baseGradeX - 42, baseGradeY - 13, `CASCO_SILHUETA_PIXEL_${specCarcaca.id}`, 7, 11);
  registrar({
    op: 'FILL_RECT',
    camada: `CASCO_INTERIOR_BLOCO_${specCarcaca.id}`,
    x: baseGradeX - 2,
    y: baseGradeY - 2,
    largura: larguraBlocoCamaras + 4,
    altura: alturaBlocoCamaras + 4,
    cor: T.HUD_PANEL,
  });

  if (specCarcaca.temTuboAbordagemFrontal) {
    registrar({
      op: 'FILL_RECT',
      camada: 'TUBO_ABORDAGEM_FRONTAL_CARNUDO',
      x: baseGradeX + larguraBlocoCamaras + 34,
      y: baseGradeY + 28,
      largura: 22,
      altura: 14,
      cor: T.ALERT_RED,
    });
  }
  if (specCarcaca.temNevoaTinta) {
    registrar({
      op: 'STROKE_RECT',
      camada: 'NEVOA_TINTA_SOMBRA_ABISSAL',
      x: baseGradeX - 46,
      y: baseGradeY - 16,
      largura: 204,
      altura: 182,
      cor: T.ORGAN_VIOLET,
    });
  }
  if (specCarcaca.temPoliposBioluminescentes) {
    registrar({
      op: 'FILL_RECT',
      camada: 'POLIPOS_BIOLUMINESCENTES_COLMEIA',
      x: baseGradeX - 16,
      y: baseGradeY - 15,
      largura: larguraBlocoCamaras + 32,
      altura: 4,
      cor: T.BIO_GREEN,
    });
  }

  // Armas dorsais humanas recuperadas amarradas por tendões musculares vermelhos diretamente sobre o dorso (sem fundo opaco matando a transparência)
  viewModel.caixaArmas.forEach((slot, idx) => {
    if (slot.ocupado) {
      const xArmaDorsal = baseGradeX + 6 + idx * 28;
      const yArmaDorsal = baseGradeY - 12;
      const armaAtlas = atlas.armas.find((a) => a.id === slot.chassiId || a.idCatalogo52 === slot.chassiId);
      desenharGradeSprite(armaAtlas.gradePixels, xArmaDorsal, yArmaDorsal, `ARMA_DORSAL_PIXEL_${idx}`);
    }
  });

  // Mastro vertical da quilha biomineralizada + tendões vermelhos na raiz + Asa hidrofólio horizontal submersa (88 px na Couraça-Limiar, 44 px nas demais)
  const centroQuilhaX = baseGradeX + L.CAMARA_LARGURA + L.PAREDE_ESPESSURA;
  const baseCascoY = baseGradeY + alturaBlocoCamaras;
  const asaY = Math.min(426, Math.max(L.LINHA_DAGUA_Y + 28, baseCascoY + 18));
  registrar({
    op: 'FILL_RECT',
    camada: 'TENDOES_RAIZ_QUILHA',
    x: centroQuilhaX - 8,
    y: baseCascoY - 2,
    largura: 16,
    altura: 6,
    cor: T.ALERT_RED,
  });
  registrar({
    op: 'FILL_RECT',
    camada: 'MASTRO_QUILHA',
    x: centroQuilhaX - 4,
    y: baseCascoY,
    largura: 8,
    altura: asaY - baseCascoY,
    cor: T.HUD_BORDER,
  });
  registrar({
    op: 'FILL_RECT',
    camada: 'ASA_HIDROFOLIO_SUBMERSA',
    x: centroQuilhaX - Math.floor(specCarcaca.larguraAsaSubmersaPx / 2),
    y: asaY,
    largura: specCarcaca.larguraAsaSubmersaPx,
    altura: 8,
    cor: T.FOIL_CYAN,
  });

  const spritesDesenhados = [];
  const SIGLAS_CAMARAS = Object.freeze({
    1: '1:ART',
    2: '2:CTX',
    3: '3:BRQ',
    4: '4:BAR',
    5: '5:SIF',
    6: '6:MST',
    7: '7:ENX-A',
    8: '8:ENX-B',
  });

  for (const cam of viewModel.camaras) {
    const xCam = baseGradeX + L.PAREDE_ESPESSURA + cam.coluna * (L.CAMARA_LARGURA + L.PAREDE_ESPESSURA);
    const yCam = baseGradeY + L.PAREDE_ESPESSURA + cam.andar * (L.CAMARA_ALTURA + L.PAREDE_ESPESSURA);

    // Água interna da câmara (roxa #5B2A86 se hipóxia < 20% O2; ciano-abissal normal)
    const alturaAguaPx = Math.round((Math.min(100, Math.max(0, cam.nivelAguaPct)) / 100) * (L.CAMARA_ALTURA - 2));
    if (alturaAguaPx > 0) {
      registrar({
        op: 'FILL_RECT',
        camada: `AGUA_CAMARA_${cam.id}`,
        x: xCam + 1,
        y: yCam + L.CAMARA_ALTURA - 1 - alturaAguaPx,
        largura: L.CAMARA_LARGURA - 2,
        altura: alturaAguaPx,
        cor: cam.oxigenioPct < 20 ? T.ORGAN_VIOLET : '#0A3A4A',
      });
    }

    // Bulbo neural luminoso no topo interno de cada câmara (Regra R1)
    desenharGradeSprite(GRADES_SPRITES_HIBITS_ARTESANAIS.BULBO_NEURAL, xCam + 38, yCam + 2, `BULBO_NEURAL_CAMARA_${cam.id}`);

    if (cam.curtoCircuitoAtivo) {
      registrar({
        op: 'STROKE_RECT',
        camada: `CURTO_CAMARA_${cam.id}`,
        x: xCam + 2,
        y: yCam + 2,
        largura: L.CAMARA_LARGURA - 4,
        altura: L.CAMARA_ALTURA - 4,
        cor: T.SPARK_YELLOW,
      });
    }

    // Parede da câmara (50x35 px nativos) e rótulo identificador
    registrar({
      op: 'STROKE_RECT',
      camada: `CAMARA_${cam.id}`,
      x: xCam,
      y: yCam,
      largura: L.CAMARA_LARGURA,
      altura: L.CAMARA_ALTURA,
      cor: cam.brechaAtiva ? T.ALERT_RED : T.FOIL_CYAN,
    });
    if (cam.brechaAtiva) {
      registrar({
        op: 'FILL_RECT',
        camada: `ROMBO_PAREDE_CAMARA_${cam.id}`,
        x: xCam + L.CAMARA_LARGURA - 3,
        y: yCam + 12,
        largura: 3,
        altura: 12,
        cor: T.BG_ABYSS,
      });
    }
    registrar({
      op: 'TEXT',
      camada: `ROTULO_CAMARA_${cam.id}`,
      x: xCam + 3,
      y: yCam + 8,
      cor: T.TXT_PRIMARY,
      texto: SIGLAS_CAMARAS[cam.id],
    });

    // Válvula orgânica esfinctérica laranja-coral desenhada APÓS a parede da câmara para não ser cortada (Regra R1)
    if (cam.coluna === 0) {
      desenharGradeSprite(GRADES_SPRITES_HIBITS_ARTESANAIS.VALVULA_ESFINCTER, xCam + L.CAMARA_LARGURA - 2, yCam + 13, `VALVULA_INTERNA_${cam.id}`);
    }

    // Válvula externa e sprite de Cadeado Hidrostático Dourado em Touchdown (F2)
    const xValvula = cam.coluna === 0 ? xCam - 12 : xCam + L.CAMARA_LARGURA + 2;
    const yValvula = yCam + 10;
    registrar({
      op: 'FILL_RECT',
      camada: `VALVULA_CAMARA_${cam.id}`,
      x: xValvula,
      y: yValvula,
      largura: 10,
      altura: 15,
      cor: cam.iconeCadeadoVisivel ? T.ALERT_RED : cam.valvulaExternaAberta ? T.BIO_GREEN : T.LIFT_AMBER,
    });
    if (cam.iconeCadeadoVisivel) {
      desenharGradeSprite(GRADES_SPRITES_HIBITS_ARTESANAIS.CADEADO_HIDROSTATICO, xValvula + 1, yValvula + 3, `CADEADO_PIXEL_${cam.id}`);
    }

    // Desenho pixel-a-pixel dos sprites hi-bit dos tripulantes presentes (Slot 0 à esquerda, Slot 1 à direita sem sobreposição)
    cam.tripulantesPresentes.forEach((trip, slotIdx) => {
      const idSprite =
        trip.especie === 'BAIACU'
          ? (trip.inflado ? 'BAIACU_INFLADO' : 'BAIACU_NORMAL')
          : trip.especie;
      const sprite = rasterizarSpriteRgba('aliados', idSprite);
      const itemAtlas = atlas.aliados.find((a) => a.id === idSprite);
      const xSprite = xCam + 4 + slotIdx * 22;
      const ySprite = yCam + 12;

      desenharGradeSprite(itemAtlas.gradePixels, xSprite, ySprite, `SPRITE_PIXEL_${trip.id}`);
      if (trip.especie === 'POLVO' && (cam.brechaAtiva || cam.barrasIntegridade < cam.barrasNivelMax)) {
        registrar({
          op: 'FILL_RECT',
          camada: `FAISCA_REPARO_POLVO_${cam.id}`,
          x: xSprite + 16,
          y: ySprite + 2,
          largura: 3,
          altura: 3,
          cor: T.SPARK_YELLOW,
        });
      }

      spritesDesenhados.push({
        idTripulante: trip.id,
        idSprite,
        camaraId: cam.id,
        slotIdx,
        x: xSprite,
        y: ySprite,
        hashFnv1aRgba: sprite.hashFnv1aRgba,
      });
    });

    // Desenho de invasores presentes na câmara (MARINHEIRO, MERGULHADOR ou PARASITA de atlas.invasores)
    (cam.invasoresPresentes ?? []).forEach((inv, invIdx) => {
      const invAtlas = atlas.invasores.find((i) => i.id === inv.especie) ?? atlas.invasores[0];
      desenharGradeSprite(invAtlas.gradePixels, xCam + 18 + invIdx * 12, yCam + 12, `INVASOR_PIXEL_${inv.id}`);
    });
  }

  // 5. Inimigo Assentado na Linha d'Água (Regra R2.3: NUNCA voando no ar! Salas 1 e 2 acima de 330; Salas 3 e 4 submersas abaixo de 330)
  let inimigoAssentadoNaLinhaDagua = null;
  const ehMonstroAlvo = String(viewModel.painelAlvo.classeAlvo ?? '').includes('MONSTRO');
  if (viewModel.painelAlvo.presente) {
    const idSpriteInimigo = ehMonstroAlvo ? 'TEUTHIS_COURACADA' : 'LANCHA_PATRULHEIRA';
    const gradeInimigo = GRADES_SPRITES_HIBITS_ARTESANAIS[idSpriteInimigo];
    const escalaInimigoX = 8;
    const escalaInimigoY = ehMonstroAlvo ? 11 : 15;
    const linhaDaguaRelativaSprite = (ehMonstroAlvo ? 7 : 6) * escalaInimigoY;
    const yTopoInimigo = L.LINHA_DAGUA_Y - linhaDaguaRelativaSprite;
    const yBaseInimigo = yTopoInimigo + gradeInimigo.length * escalaInimigoY;
    const xInimigo = 592;

    // Sprite hi-bit completo do Barco/Monstro (288 px de largura) assentado na linha d'água envolvendo as 4 salas/órgãos (zero miniatura duplicada!)
    desenharGradeSprite(gradeInimigo, xInimigo, yTopoInimigo, 'INIMIGO_CORPO_PIXEL', escalaInimigoX, escalaInimigoY);

    registrar({
      op: 'TEXT',
      camada: 'PAINEL_ALVO_CABECALHO',
      x: 616,
      y: 232,
      cor: T.ALERT_RED,
      texto: `${viewModel.painelAlvo.nomeAlvo} | CASCO ${viewModel.painelAlvo.hpCascoAtual}/${viewModel.painelAlvo.hpCascoMax} | ESQUIVA ${viewModel.painelAlvo.esquivaPct}% | BARREIRA ${viewModel.painelAlvo.barreiraBolhas}`,
    });

    if (ehMonstroAlvo) {
      registrar({
        op: 'FILL_RECT',
        camada: 'ESPUMA_MONSTRO_LINHA_DAGUA',
        x: 590,
        y: L.LINHA_DAGUA_Y - 3,
        largura: 276,
        altura: 4,
        cor: T.TXT_PRIMARY,
      });
    }

    // Arco vermelho pontilhado de mira inimiga (F1: Torreta -> Câmara 5 SIFÃO com "3.2S"; F3: Bico Quitinso -> Mastro com "MIRANDO: MASTRO")
    const yArcoMira = ehMonstroAlvo ? L.LINHA_DAGUA_Y - 6 : L.LINHA_DAGUA_Y - 40;
    for (let ax = 356; ax <= 630; ax += 20) {
      registrar({
        op: 'FILL_RECT',
        camada: 'ARCO_MIRA_INIMIGO',
        x: ax,
        y: yArcoMira,
        largura: 6,
        altura: 2,
        cor: T.ALERT_RED,
      });
    }
    registrar({
      op: 'TEXT',
      camada: 'ROTULO_MIRA_INIMIGO',
      x: 440,
      y: yArcoMira - 4,
      cor: T.ALERT_RED,
      texto: ehMonstroAlvo ? 'MIRANDO: MASTRO (8S)' : 'MIRA -> 5:SIF (3.2S)',
    });

    inimigoAssentadoNaLinhaDagua = {
      idSprite: idSpriteInimigo,
      classeAlvo: viewModel.painelAlvo.classeAlvo,
      yTopoPx: yTopoInimigo,
      yBasePx: yBaseInimigo,
      linhaDaguaY: L.LINHA_DAGUA_Y,
      parteSuperiorAcimaDagua: yTopoInimigo < L.LINHA_DAGUA_Y,
      parteInferiorSubmersa: yBaseInimigo > L.LINHA_DAGUA_Y,
    };
  }

  const textosPainelAlvo = [];
  for (const [idx, sala] of viewModel.painelAlvo.salasInspecionadas.entries()) {
    const colAlvo = idx % 2;
    const linAlvo = Math.floor(idx / 2);
    const xSala = 640 + colAlvo * 110;
    const ySala = linAlvo === 0 ? 270 : 334;
    const textoSala = `${sala.salaId}: ${sala.textoTripulacao}`;
    textosPainelAlvo.push(textoSala);

    registrar({
      op: 'FILL_RECT',
      camada: `FUNDO_SALA_ALVO_${sala.salaId}`,
      x: xSala,
      y: ySala,
      largura: 96,
      altura: 56,
      cor: ehMonstroAlvo ? '#180B26' : T.HUD_PANEL,
    });

    if (!ehMonstroAlvo && Number(sala.aguaKg ?? 0) > 0) {
      const hAguaInimigo = Math.min(52, Math.max(8, Math.round((Number(sala.aguaKg) / 12.5) * 52)));
      registrar({
        op: 'FILL_RECT',
        camada: `AGUA_SALA_ALVO_${sala.salaId}`,
        x: xSala + 1,
        y: ySala + 55 - hAguaInimigo,
        largura: 94,
        altura: hAguaInimigo,
        cor: '#0A3A4A',
      });
    }

    registrar({
      op: 'STROKE_RECT',
      camada: `SALA_ALVO_${sala.salaId}`,
      x: xSala,
      y: ySala,
      largura: 96,
      altura: 56,
      cor:
        ehMonstroAlvo && sala.salaId === 2
          ? T.ALERT_RED
          : sala.canalPermissao === 'VISIVEL'
            ? T.FOIL_CYAN
            : T.LIFT_AMBER,
    });
    const nomeCurtoSala = String(sala.nomeSala ?? `SALA_${sala.salaId}`).slice(0, 12);
    registrar({
      op: 'TEXT',
      camada: `NOME_SALA_ALVO_${sala.salaId}`,
      x: xSala + 4,
      y: ySala + 10,
      cor: T.FOIL_CYAN,
      texto: `${sala.salaId}:${nomeCurtoSala} ${sala.barrasIntegridade ?? 1}/${sala.barrasMax ?? 1}`,
    });
    const rotuloDetalheSala =
      sala.canalPermissao !== 'VISIVEL'
        ? sala.textoTripulacao
        : ehMonstroAlvo
          ? sala.salaId === 3
            ? 'ESQUIVA 20%'
            : sala.tripulantesVisiveis.length > 0
              ? 'ANTICORPO ATIVO'
              : 'ORGAO VITAL'
          : sala.textoTripulacao;
    registrar({
      op: 'TEXT',
      camada: 'PAINEL_ALVO_L3',
      x: xSala + 4,
      y: ySala + 22,
      cor: sala.canalPermissao === 'VISIVEL' ? T.TXT_PRIMARY : T.LIFT_AMBER,
      texto: rotuloDetalheSala,
    });

    if (sala.canalPermissao === 'VISIVEL' && Array.isArray(sala.tripulantesVisiveis)) {
      sala.tripulantesVisiveis.forEach((tripInimigo, tIdx) => {
        const espInimigo = tripInimigo.especie ?? (ehMonstroAlvo ? 'PARASITA' : 'MARINHEIRO');
        const invAtlas = atlas.invasores.find((i) => i.id === espInimigo) ?? atlas.invasores[0];
        desenharGradeSprite(invAtlas.gradePixels, xSala + 8 + tIdx * 18, ySala + 30, `INIMIGO_SALA_PIXEL_${sala.salaId}_${tIdx}`);
      });
    }
  }

  // Camada Frontal da Linha d'Água (Z-order acima dos cascos): corta visivelmente entre o 2º e o 3º andar em Touchdown (F2) e entre as salas secas e submersas do inimigo (F1/F2/F3)
  registrar({ op: 'FILL_RECT', camada: 'LINHA_DAGUA_FRENTE', x: 112, y: L.LINHA_DAGUA_Y, largura: 848, altura: 2, cor: T.FOIL_CYAN });
  if (dy > 0) {
    registrar({ op: 'FILL_RECT', camada: 'ESPUMA_TOUCHDOWN_ESQ', x: baseGradeX - 44, y: L.LINHA_DAGUA_Y - 4, largura: 22, altura: 6, cor: T.TXT_PRIMARY });
    registrar({ op: 'FILL_RECT', camada: 'ESPUMA_TOUCHDOWN_DIR', x: baseGradeX + larguraBlocoCamaras + 16, y: L.LINHA_DAGUA_Y - 4, largura: 22, altura: 6, cor: T.TXT_PRIMARY });
    registrar({ op: 'FILL_RECT', camada: 'EXPLOSAO_RAIZ_QUILHA_TOUCHDOWN', x: centroQuilhaX - 12, y: baseCascoY + 2, largura: 24, altura: 10, cor: T.LIFT_AMBER });
  } else {
    registrar({ op: 'FILL_RECT', camada: 'SPRAY_QUILHA_FOIL', x: centroQuilhaX - 10, y: L.LINHA_DAGUA_Y - 2, largura: 20, altura: 4, cor: T.FOIL_CYAN });
  }

  // 6. Rodapé Completo (y = 440..540): Coração Bio-Elétrico Marinho (Regra R6), 8 Sistemas c/ Pips, 4 Slots de Armas c/ Soquetes e Órgãos, e Cartões de Tripulação
  registrar({
    op: 'FILL_RECT',
    camada: 'RODAPE',
    x: 0,
    y: L.PAINEL_RODAPE_TOPO_Y,
    largura: 960,
    altura: 540 - L.PAINEL_RODAPE_TOPO_Y,
    cor: T.HUD_PANEL,
  });
  registrar({
    op: 'FILL_RECT',
    camada: 'RODAPE_RIM',
    x: 0,
    y: L.PAINEL_RODAPE_TOPO_Y,
    largura: 960,
    altura: 1,
    cor: T.HUD_RIM,
  });
  desenharGradeSprite(GRADES_SPRITES_HIBITS_ARTESANAIS.CORACAO_BIO_ELETRICO, 8, 474, 'CORACAO_BIO_ELETRICO_PIXEL');
  registrar({
    op: 'TEXT',
    camada: 'RODAPE_REATOR',
    x: 6,
    y: 456,
    cor: T.BIO_GREEN,
    texto: 'CORACAO BIO-ELETR.',
  });
  const livresExibidos = viewModel.reatorCoracaoBioEletrico.barrasLivres ?? viewModel.reatorCoracaoBioEletrico.barrasDisponiveis;
  registrar({
    op: 'TEXT',
    camada: 'RODAPE_REATOR_LIVRES',
    x: 6,
    y: 466,
    cor: T.TXT_PRIMARY,
    texto: `${livresExibidos}/${viewModel.reatorCoracaoBioEletrico.barrasTotais} LIVRES`,
  });
  for (let b = 0; b < viewModel.reatorCoracaoBioEletrico.barrasTotais; b += 1) {
    registrar({
      op: 'FILL_RECT',
      camada: `REATOR_PIP_${b}`,
      x: 34 + (b % 4) * 18,
      y: 476 + Math.floor(b / 4) * 8,
      largura: 14,
      altura: 5,
      cor: T.BIO_GREEN,
    });
  }

  viewModel.caixaSistemas.forEach((sys, idx) => {
    const xSys = 120 + idx * 38;
    registrar({
      op: 'STROKE_RECT',
      camada: `SISTEMA_${sys.sigla}`,
      x: xSys,
      y: 448,
      largura: 34,
      altura: 80,
      cor: sys.instalado ? T.FOIL_CYAN : T.TXT_DIM,
    });
    for (let b = 0; b < sys.barrasNivelMax; b += 1) {
      const yPip = 504 - b * 9;
      const corPip =
        b >= sys.barrasIntegridade
          ? T.ALERT_RED
          : b < sys.barrasEnergiaAlocada
            ? T.BIO_GREEN
            : T.HUD_BORDER;
      registrar({
        op: 'FILL_RECT',
        camada: `SISTEMA_PIP_${sys.sigla}_${b}`,
        x: xSys + 5,
        y: yPip,
        largura: 24,
        altura: 6,
        cor: corPip,
      });
    }
    registrar({
      op: 'TEXT',
      camada: `SISTEMA_${sys.sigla}`,
      x: xSys + 3,
      y: 522,
      cor: T.TXT_PRIMARY,
      texto: `${sys.sigla} ${sys.barrasEnergiaAlocada}/${sys.barrasIntegridade}`,
    });
  });

  const NOMES_CURTOS_ARMAS = Object.freeze({
    EMISSOR_ACUSTICO_I: 'ACUSTICO',
    RAJADA_HIDROPNEUMATICA_II: 'RAJADA',
    CANHAO_ARPAO_CABO: 'ARPAO',
    DISPERSOR_ESTILHACOS: 'FLAK',
    CORTADOR_TERMICO_PLASMA: 'BEAM',
    LANCADOR_TORPEDO_ABISSAL: 'TORPEDO',
    MORTEIRO_ESPOROS: 'MORTEIRO',
  });

  viewModel.caixaArmas.forEach((slot, idx) => {
    const xSlot = 440 + idx * 58;
    registrar({
      op: 'STROKE_RECT',
      camada: `ARMA_SLOT_${idx}`,
      x: xSlot,
      y: 448,
      largura: 54,
      altura: 80,
      cor: slot.ocupado ? T.LIFT_AMBER : T.TXT_DIM,
    });
    const rotuloArmaCurto = slot.ocupado
      ? `${idx + 1}:${NOMES_CURTOS_ARMAS[slot.chassiId] ?? slot.chassiId.slice(0, 7)}`
      : `${idx + 1}:VAZIO`;
    registrar({
      op: 'TEXT',
      camada: `ARMA_SLOT_${idx}`,
      x: xSlot + 3,
      y: 460,
      cor: T.TXT_PRIMARY,
      texto: rotuloArmaCurto,
    });
    if (slot.ocupado) {
      registrar({
        op: 'TEXT',
        camada: `ARMA_SLOT_SOQ_${idx}`,
        x: xSlot + 3,
        y: 470,
        cor: T.FOIL_CYAN,
        texto: `SOQ ${slot.orgaosEnxertados.length}/${slot.soquetesMax}`,
      });
      registrar({
        op: 'FILL_RECT',
        camada: `ARMA_RECARGA_${idx}`,
        x: xSlot + 4,
        y: 480,
        largura: Math.min(46, Math.round((slot.progressoRecargaSeg / 10) * 46)),
        altura: 6,
        cor: T.BIO_GREEN,
      });
      for (let s = 0; s < slot.soquetesMax; s += 1) {
        const xSoq = xSlot + 4 + s * 16;
        const ySoq = 494;
        registrar({
          op: 'STROKE_RECT',
          camada: `ARMA_SOQUETE_${idx}_${s}`,
          x: xSoq,
          y: ySoq,
          largura: 12,
          altura: 12,
          cor: s < slot.orgaosEnxertados.length ? T.BIO_GREEN : T.TXT_DIM,
        });
        if (s < slot.orgaosEnxertados.length) {
          const idOrgao = slot.orgaosEnxertados[s];
          const orgaoAtlas =
            atlas.orgaos.find((o) => o.id === idOrgao || o.idCatalogo52 === idOrgao) ?? atlas.orgaos[0];
          desenharGradeSprite(orgaoAtlas.gradePixels, xSoq + 1, ySoq + 1, `ORGAO_ENXERTADO_PIXEL_${idx}_${s}`);
        }
      }
    }
  });

  // Cartões de Tripulação no Rodapé Direito (x = 680 + idx * 45, y = 448, largura = 42, altura = 80), sem transbordo e com sprite
  const todosTripulantes = viewModel.camaras.flatMap((c) => c.tripulantesPresentes);
  todosTripulantes.forEach((trip, idx) => {
    const xCard = 680 + idx * 45;
    registrar({
      op: 'STROKE_RECT',
      camada: `TRIPULANTE_CARD_${trip.id}`,
      x: xCard,
      y: 448,
      largura: 42,
      altura: 80,
      cor: trip.inflado ? T.LIFT_AMBER : T.FOIL_CYAN,
    });
    registrar({
      op: 'TEXT',
      camada: `TRIPULANTE_CARD_${trip.id}`,
      x: xCard + 3,
      y: 460,
      cor: T.TXT_PRIMARY,
      texto: trip.especie.slice(0, 6),
    });
    registrar({
      op: 'TEXT',
      camada: `TRIPULANTE_CARD_HP_${trip.id}`,
      x: xCard + 3,
      y: 470,
      cor: T.BIO_GREEN,
      texto: `${trip.hpAtual}/${trip.hpMax}`,
    });
    const idSpriteCard =
      trip.especie === 'BAIACU'
        ? (trip.inflado ? 'BAIACU_INFLADO' : 'BAIACU_NORMAL')
        : trip.especie;
    const itemCardAtlas = atlas.aliados.find((a) => a.id === idSpriteCard);
    desenharGradeSprite(itemCardAtlas.gradePixels, xCard + 11, 482, `TRIPULANTE_CARD_PIXEL_${trip.id}`);
  });

  return clonarProfundoCongelado({
    resolucaoNativa: viewModel.resolucaoNativa,
    imageSmoothingEnabled: false,
    gradeCamarasTopoY: baseGradeY,
    paredeEntre2e3AndarY: parede2e3AndarY,
    linhaDaguaY: L.LINHA_DAGUA_Y,
    larguraAsaSubmersaDesenhadaPx: specCarcaca.larguraAsaSubmersaPx,
    inimigoAssentadoNaLinhaDagua,
    totalPrimitivasDesenhadas: comandosDesenho.length,
    spritesDesenhados,
    textosPainelAlvo,
    comandosDesenho,
  });
}

function converterHexParaRgb(hex) {
  const limpo = String(hex).replace('#', '');
  const n = Number.parseInt(limpo, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

const FONTE_PIXEL_3X5 = Object.freeze({
  A: 0b010101111101101, B: 0b110101110101110, C: 0b011100100100011, D: 0b110101101101110,
  E: 0b111100110100111, F: 0b111100110100100, G: 0b011100101101011, H: 0b101101111101101,
  I: 0b111010010010111, J: 0b001001001101010, K: 0b101101110101101, L: 0b100100100100111,
  M: 0b101111111101101, N: 0b101111111111101, O: 0b010101101101010, P: 0b110101110100100,
  Q: 0b010101101111011, R: 0b110101110101101, S: 0b011100010001110, T: 0b111010010010010,
  U: 0b101101101101111, V: 0b101101101101010, W: 0b101101111111101, X: 0b101101010101101,
  Y: 0b101101010010010, Z: 0b111001010100111,
  '0': 0b111101101101111, '1': 0b010110010010111, '2': 0b111001111100111, '3': 0b111001111001111,
  '4': 0b101101111001001, '5': 0b111100111001111, '6': 0b111100111101111, '7': 0b111001001010010,
  '8': 0b111101111101111, '9': 0b111101111001111,
  ':': 0b000010000010000, '/': 0b001001010100100, '-': 0b000000111000000, '%': 0b101001010100101,
  '[': 0b110100100100110, ']': 0b011001001001011, '(': 0b010100100100010, ')': 0b010001001001010,
  '.': 0b000000000000010, '|': 0b010010010010010, '_': 0b000000000000111,
});

/**
 * Rasteriza o quadro completo 960x540 de `renderizarViewModelNoCanvas2d(viewModel)` num Buffer PNG real sem perdas.
 */
export function renderizarCenaCanvasParaPngBuffer(viewModel) {
  const frame = renderizarViewModelNoCanvas2d(viewModel, null);
  const W = 960;
  const H = 540;
  const rgba = Buffer.alloc(W * H * 4);

  const pintar = (x, y, r, g, b) => {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const i = (y * W + x) * 4;
    rgba[i] = r;
    rgba[i + 1] = g;
    rgba[i + 2] = b;
    rgba[i + 3] = 255;
  };

  for (const cmd of frame.comandosDesenho) {
    const [r, g, b] = converterHexParaRgb(cmd.cor);
    if (cmd.op === 'FILL_RECT') {
      for (let y = cmd.y; y < cmd.y + cmd.altura; y += 1) {
        for (let x = cmd.x; x < cmd.x + cmd.largura; x += 1) {
          pintar(x, y, r, g, b);
        }
      }
    } else if (cmd.op === 'STROKE_RECT') {
      for (let x = cmd.x; x < cmd.x + cmd.largura; x += 1) {
        pintar(x, cmd.y, r, g, b);
        pintar(x, cmd.y + cmd.altura - 1, r, g, b);
      }
      for (let y = cmd.y; y < cmd.y + cmd.altura; y += 1) {
        pintar(cmd.x, y, r, g, b);
        pintar(cmd.x + cmd.largura - 1, y, r, g, b);
      }
    } else {
      const txtNorm = String(cmd.texto)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
      for (let c = 0; c < txtNorm.length; c += 1) {
        const mascara = FONTE_PIXEL_3X5[txtNorm[c]] ?? 0;
        for (let lin = 0; lin < 5; lin += 1) {
          for (let col = 0; col < 3; col += 1) {
            const bit = 14 - (lin * 3 + col);
            if ((mascara >> bit) & 1) {
              pintar(cmd.x + c * 4 + col, cmd.y - 4 + lin, r, g, b);
            }
          }
        }
      }
    }
  }

  return codificarBufferRgbaParaPng(W, H, rgba);
}

/**
 * Escapa caracteres especiais HTML para impedir injeção XSS ao renderizar dados no documento.
 */
export function escaparHtmlSeguro(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Gera o script JavaScript client-side (`/cliente.js`, servido sob `script-src 'self'`) que liga o `<canvas id="biofoil-canvas">`,
 * eventos DOM (mouse/teclado/Ghost Preview), loop de tick (`/api/tick`) e síntese `AudioContext` + `BiquadFilterNode` 400 Hz aos endpoints do motor.
 */
export function gerarCodigoJsClienteBiofoil() {
  return `(() => {
  'use strict';
  const canvas = document.getElementById('biofoil-canvas');
  const bootEl = document.getElementById('biofoil-bootstrap');
  if (!canvas || !bootEl) return;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  let estadoCliente = JSON.parse(bootEl.textContent || '{}');
  let contextoUi = { pausaTaticaAtiva: false, slotArmaSelecionado: 0, tripulanteSelecionadoId: 'trip-polvo-1' };
  let audioCtx = null;

  function tocarPlanoAudio(planoAudio) {
    if (!planoAudio || typeof window.AudioContext !== 'function') return;
    if (!audioCtx) audioCtx = new window.AudioContext();
    const t0 = audioCtx.currentTime;
    const filtro = audioCtx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.setValueAtTime(planoAudio.filtroSubaquaticoMaster.frequenciaCorteHz, t0);
    filtro.Q.setValueAtTime(planoAudio.filtroSubaquaticoMaster.fatorQ, t0);
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(planoAudio.ganhoMaster, t0);
    filtro.connect(masterGain);
    masterGain.connect(audioCtx.destination);
    for (const spec of planoAudio.nosSintese || []) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = spec.tipoOscilador;
      osc.frequency.setValueAtTime(spec.freqInicialHz, t0 + spec.atrasoDisparoSeg);
      osc.frequency.linearRampToValueAtTime(spec.freqFinalHz, t0 + spec.atrasoDisparoSeg + spec.duracaoSeg);
      gain.gain.setValueAtTime(spec.ganhoPico, t0 + spec.atrasoDisparoSeg);
      gain.gain.linearRampToValueAtTime(0.0001, t0 + spec.atrasoDisparoSeg + spec.duracaoSeg);
      osc.connect(gain);
      gain.connect(filtro);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      osc.start(t0 + spec.atrasoDisparoSeg);
      osc.stop(t0 + spec.atrasoDisparoSeg + spec.duracaoSeg);
    }
  }

  function desenhar(vm, frameCanvas) {
    if (!vm || !frameCanvas || !Array.isArray(frameCanvas.comandosDesenho)) return;
    ctx.imageSmoothingEnabled = false;
    ctx.font = '8px monospace';
    for (const cmd of frameCanvas.comandosDesenho) {
      if (cmd.op === 'FILL_RECT') {
        ctx.fillStyle = cmd.cor;
        ctx.fillRect(cmd.x, cmd.y, cmd.largura, cmd.altura);
      } else if (cmd.op === 'STROKE_RECT') {
        ctx.strokeStyle = cmd.cor;
        ctx.strokeRect(cmd.x, cmd.y, cmd.largura, cmd.altura);
      } else if (cmd.op === 'TEXT') {
        ctx.fillStyle = cmd.cor;
        ctx.fillText(cmd.texto, cmd.x, cmd.y);
      }
    }
  }

  async function enviarEventoDom(eventoInput) {
    const resp = await fetch('/api/comando', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventoInput, contextoUi }),
    });
    if (!resp.ok) return;
    const dados = await resp.json();
    if (dados.contextoUi) contextoUi = dados.contextoUi;
    if (dados.viewModel && dados.frameCanvas) {
      estadoCliente.viewModel = dados.viewModel;
      estadoCliente.frameCanvas = dados.frameCanvas;
      desenhar(dados.viewModel, dados.frameCanvas);
    }
    if (dados.planoAudio) tocarPlanoAudio(dados.planoAudio);
  }

  async function avancarTick() {
    if (contextoUi.pausaTaticaAtiva) return;
    const resp = await fetch('/api/tick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dtSeg: 0.25, pausaTaticaAtiva: contextoUi.pausaTaticaAtiva }),
    });
    if (!resp.ok) return;
    const dados = await resp.json();
    if (dados.viewModel && dados.frameCanvas) {
      estadoCliente.viewModel = dados.viewModel;
      estadoCliente.frameCanvas = dados.frameCanvas;
      desenhar(dados.viewModel, dados.frameCanvas);
    }
    if (dados.planoAudio) tocarPlanoAudio(dados.planoAudio);
  }

  canvas.addEventListener('click', (ev) => {
    const r = canvas.getBoundingClientRect();
    enviarEventoDom({ tipoEvento: 'CLICK', botaoMouse: 0, shiftKey: ev.shiftKey, clientX: ev.clientX, clientY: ev.clientY, retanguloCanvas: { left: r.left, top: r.top, width: r.width, height: r.height } });
  });
  canvas.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    const r = canvas.getBoundingClientRect();
    enviarEventoDom({ tipoEvento: 'CLICK', botaoMouse: 2, shiftKey: ev.shiftKey, clientX: ev.clientX, clientY: ev.clientY, retanguloCanvas: { left: r.left, top: r.top, width: r.width, height: r.height } });
  });
  canvas.addEventListener('mousemove', (ev) => {
    const r = canvas.getBoundingClientRect();
    enviarEventoDom({ tipoEvento: 'MOUSEMOVE', clientX: ev.clientX, clientY: ev.clientY, retanguloCanvas: { left: r.left, top: r.top, width: r.width, height: r.height } });
  });
  window.addEventListener('keydown', (ev) => {
    enviarEventoDom({ tipoEvento: 'KEYDOWN', code: ev.code });
  });

  desenhar(estadoCliente.viewModel, estadoCliente.frameCanvas);
  setInterval(avancarTick, 250);
})();\n`;
}

/**
 * Gera o HTML5 autocontido e seguro do cliente jogável (Canvas 960x540 -> 1920x1080 pixelated + WebAudio 400 Hz + /cliente.js).
 */
export function gerarHtmlClienteJogavelBiofoil(estadoInicial, opcoes = {}) {
  const vm = projetarViewModelWireframe(estadoInicial);
  const frameCanvas = renderizarViewModelNoCanvas2d(vm);
  const tituloSeguro = escaparHtmlSeguro(opcoes.titulo ?? 'BIO-FOIL — Tactical Hydrofoil Roguelike (960x540 -> 1080p)');
  const jsonEstadoSeguro = JSON.stringify({ viewModel: vm, frameCanvas })
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${tituloSeguro}</title>
  <style>
    body { margin: 0; background: #05080c; color: #ebf8ff; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; font-family: monospace; }
    #biofoil-canvas { width: 1920px; height: 1080px; max-width: 100vw; max-height: 100vh; aspect-ratio: 16 / 9; image-rendering: pixelated; image-rendering: crisp-edges; border: 1px solid #00e5ff; }
  </style>
</head>
<body>
  <canvas id="biofoil-canvas" width="960" height="540" data-upscale="2" data-filtro-touchdown-hz="400"></canvas>
  <script id="biofoil-bootstrap" type="application/json">${jsonEstadoSeguro}</script>
  <script src="/cliente.js" defer></script>
</body>
</html>`;
}

const CHAVES_PROTOTYPE_PROIBIDAS = Object.freeze(['__proto__', 'constructor', 'prototype']);

function contemChaveProibida(textoJson) {
  return CHAVES_PROTOTYPE_PROIBIDAS.some((k) => textoJson.includes(`"${k}"`));
}

function inspecionarObjetoJsonSeguro(valor, profundidade = 0) {
  if (profundidade > 12) return false;
  if (valor === null || typeof valor !== 'object') return true;
  for (const chave of Object.getOwnPropertyNames(valor)) {
    if (CHAVES_PROTOTYPE_PROIBIDAS.includes(chave)) return false;
    if (!inspecionarObjetoJsonSeguro(valor[chave], profundidade + 1)) return false;
  }
  return true;
}

/**
 * Sobe o servidor HTTP local seguro (apenas 127.0.0.1/localhost, com CSP, anti-DNS Rebinding, anti-CSRF Origin/Sec-Fetch-Site,
 * socket timeouts, bloqueio de Prototype Pollution inclusive escapado e limite de payload) servindo o Front-End Canvas 960x540 + endpoints.
 */
export async function iniciarServidorClienteWebBiofoil(opcoes = {}) {
  const host = String(opcoes.host ?? '127.0.0.1');
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error(`[SEGURANCA HTTP] Bind proibido fora de loopback: "${host}" (use 127.0.0.1)`);
  }
  const porta = Number(opcoes.port ?? 0);
  const maxPayloadBytes = Number(opcoes.maxPayloadBytes ?? 16384);

  let estadoAtual = clonarProfundoCongelado(
    opcoes.estadoInicial ?? {
      ...criarEstadoInicialPartida('seed-web-01', 'CARCACA_ALFA'),
      alvoCombate: criarAlvoSetor1Canonico('BARCO_HUMANO'),
    }
  );
  let contextoUiServidor = {
    pausaTaticaAtiva: false,
    slotArmaSelecionado: 0,
    tripulanteSelecionadoId: 'trip-polvo-1',
  };

  const cabecalhosSeguranca = {
    'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cache-Control': 'no-store',
  };

  const servidor = http.createServer((req, res) => {
    const hostHeader = String(req.headers.host ?? '');
    if (!/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(hostHeader)) {
      res.writeHead(403, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ erro: 'DNS_REBINDING_BLOQUEADO' }));
      return;
    }

    const originHeader = req.headers.origin;
    const secFetchSite = String(req.headers['sec-fetch-site'] ?? '').toLowerCase();
    if (
      secFetchSite === 'cross-site' ||
      (originHeader && !/^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(String(originHeader)))
    ) {
      res.writeHead(403, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ erro: 'ORIGEM_CRUZADA_BLOQUEADA' }));
      return;
    }

    const urlLimpa = String(req.url ?? '/').split('?')[0];

    if (
      urlLimpa === '/' ||
      urlLimpa === '/cliente.js' ||
      urlLimpa === '/atlas-hibits.png' ||
      urlLimpa === '/api/estado'
    ) {
      if (req.method !== 'GET') {
        res.writeHead(405, { ...cabecalhosSeguranca, Allow: 'GET', 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ erro: 'METODO_NAO_PERMITIDO' }));
        return;
      }
      if (urlLimpa === '/') {
        const html = gerarHtmlClienteJogavelBiofoil(estadoAtual);
        res.writeHead(200, { ...cabecalhosSeguranca, 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }
      if (urlLimpa === '/cliente.js') {
        const js = gerarCodigoJsClienteBiofoil();
        res.writeHead(200, { ...cabecalhosSeguranca, 'Content-Type': 'application/javascript; charset=utf-8' });
        res.end(js);
        return;
      }
      if (urlLimpa === '/atlas-hibits.png') {
        const pngBuffer = exportarAtlasHiBitsPngBuffer(4);
        res.writeHead(200, {
          ...cabecalhosSeguranca,
          'Content-Type': 'image/png',
          'Content-Length': String(pngBuffer.length)
        });
        res.end(pngBuffer);
        return;
      }
      const vm = projetarViewModelWireframe(estadoAtual);
      const frameCanvas = renderizarViewModelNoCanvas2d(vm);
      const planoAudio = construirPlanoGrafoWebAudio(estadoAtual, estadoAtual, null);
      res.writeHead(200, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ viewModel: vm, frameCanvas, planoAudio, contextoUi: contextoUiServidor }));
      return;
    }

    if (urlLimpa === '/api/comando' || urlLimpa === '/api/tick') {
      if (req.method !== 'POST') {
        res.writeHead(405, { ...cabecalhosSeguranca, Allow: 'POST', 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ erro: 'METODO_NAO_PERMITIDO' }));
        return;
      }

      const contentType = String(req.headers['content-type'] ?? '');
      if (!contentType.toLowerCase().includes('application/json')) {
        res.writeHead(415, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ erro: 'CONTENT_TYPE_INVALIDO' }));
        return;
      }

      let bytesRecebidos = 0;
      let abortadoPorTamanho = false;
      const pedacos = [];

      req.on('data', (chunk) => {
        if (abortadoPorTamanho) return;
        bytesRecebidos += chunk.length;
        if (bytesRecebidos > maxPayloadBytes) {
          abortadoPorTamanho = true;
          res.writeHead(413, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ erro: 'PAYLOAD_MUITO_GRANDE' }));
          req.destroy();
          return;
        }
        pedacos.push(chunk);
      });

      req.on('end', () => {
        if (abortadoPorTamanho) return;
        const textoJson = Buffer.concat(pedacos).toString('utf8') || '{}';
        if (contemChaveProibida(textoJson)) {
          res.writeHead(400, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ erro: 'PROTOTYPE_POLLUTION_BLOQUEADO' }));
          return;
        }

        let body;
        try {
          body = JSON.parse(textoJson);
        } catch {
          res.writeHead(400, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ erro: 'JSON_INVALIDO' }));
          return;
        }

        if (body === null || typeof body !== 'object' || Array.isArray(body)) {
          res.writeHead(400, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ erro: 'PAYLOAD_OBJETO_INVALIDO' }));
          return;
        }

        if (!inspecionarObjetoJsonSeguro(body)) {
          res.writeHead(400, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ erro: 'PROTOTYPE_POLLUTION_BLOQUEADO' }));
          return;
        }

        const estadoAnterior = estadoAtual;
        let ultimoResultadoComando = null;
        let idHitboxHover = null;
        let acaoLocalUi = null;

        try {
          if (urlLimpa === '/api/tick') {
            if (
              body.dtSeg !== undefined &&
              (typeof body.dtSeg !== 'number' || !Number.isFinite(body.dtSeg) || body.dtSeg <= 0)
            ) {
              res.writeHead(400, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ erro: 'DT_SEG_INVALIDO' }));
              return;
            }
            const dtSeg = Math.max(0.05, Math.min(5.0, body.dtSeg ?? 0.25));
            const pausaAtiva = body.pausaTaticaAtiva !== undefined ? body.pausaTaticaAtiva : contextoUiServidor.pausaTaticaAtiva;
            if (pausaAtiva !== true) {
              estadoAtual = avancarTickCombateCompleto(estadoAtual, dtSeg);
            }
          } else if (body.eventoInput && typeof body.eventoInput === 'object') {
            const ctxEntrada = {
              ...contextoUiServidor,
              ...(body.contextoUi && typeof body.contextoUi === 'object' ? body.contextoUi : {}),
            };
            const vmAntes = projetarViewModelWireframe(estadoAtual);
            const traducao = traduzirInputDomParaComandoUi(
              body.eventoInput,
              estadoAtual,
              vmAntes,
              ctxEntrada
            );
            idHitboxHover = traducao.hitboxAtingida ?? null;
            acaoLocalUi = traducao.acaoLocalUi ?? null;
            const slotCand =
              traducao.slotArmaSelecionado !== undefined
                ? traducao.slotArmaSelecionado
                : Number(ctxEntrada.slotArmaSelecionado ?? 0);
            const tripCand = String(
              traducao.tripulanteSelecionadoId !== undefined
                ? traducao.tripulanteSelecionadoId
                : (ctxEntrada.tripulanteSelecionadoId ?? 'trip-polvo-1')
            ).slice(0, 64);
            contextoUiServidor = {
              pausaTaticaAtiva:
                traducao.pausaTaticaAtiva !== undefined
                  ? traducao.pausaTaticaAtiva
                  : Boolean(ctxEntrada.pausaTaticaAtiva),
              slotArmaSelecionado:
                Number.isInteger(slotCand) && slotCand >= 0 && slotCand <= 3 ? slotCand : 0,
              tripulanteSelecionadoId: tripCand,
            };
            ultimoResultadoComando = traducao.resultadoMotor;
            if (ultimoResultadoComando?.estado) {
              estadoAtual = ultimoResultadoComando.estado;
            }
          } else if (body.comando && typeof body.comando === 'object') {
            ultimoResultadoComando = despacharComandoUi(estadoAtual, body.comando);
            estadoAtual = ultimoResultadoComando.estado;
          } else {
            res.writeHead(400, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ erro: 'COMANDO_AUSENTE' }));
            return;
          }
        } catch (err) {
          res.writeHead(400, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ erro: 'COMANDO_INVALIDO', detalhe: String(err.message) }));
          return;
        }

        const vmNovo = projetarViewModelWireframe(estadoAtual, { idHitboxHover });
        const frameCanvas = renderizarViewModelNoCanvas2d(vmNovo);
        const planoAudio = construirPlanoGrafoWebAudio(estadoAnterior, estadoAtual, ultimoResultadoComando);
        res.writeHead(200, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            aceito: ultimoResultadoComando ? ultimoResultadoComando.aceito : true,
            marcadorRejeicao: ultimoResultadoComando?.marcadorRejeicao ?? null,
            acaoLocalUi,
            hitboxAtingida: idHitboxHover,
            contextoUi: contextoUiServidor,
            viewModel: vmNovo,
            frameCanvas,
            planoAudio,
          })
        );
      });
      return;
    }

    res.writeHead(404, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ erro: 'ROTA_NAO_ENCONTRADA' }));
  });

  servidor.requestTimeout = 5000;
  servidor.headersTimeout = 5000;
  servidor.keepAliveTimeout = 1000;

  await new Promise((resolve) => servidor.listen(porta, host, resolve));
  const endereco = servidor.address();
  const portaAlocada = typeof endereco === 'object' && endereco ? endereco.port : porta;

  return {
    url: `http://${host}:${portaAlocada}`,
    port: portaAlocada,
    fechar: () => new Promise((resolve) => servidor.close(() => resolve())),
  };
}

