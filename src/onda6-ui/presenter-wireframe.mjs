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
  const pesoTotalKg = nave.pesoTotalKg ?? calcularPesoTotalNave(nave);
  const sustentacaoAtualKg = nave.sustentacaoAtualKg ?? calcularSustentacaoFoil(nave);
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
      rombosCasco: Math.max(Number(c.rombosCasco ?? 0), c.brechaAtiva ? 1 : 0),
      brechaAtiva: Boolean(c.brechaAtiva) || Number(c.rombosCasco ?? 0) > 0,
      curtoCircuitoAtivo: Boolean(c.curtoCircuitoAtivo),
      valvulaExternaAberta: Boolean(c.valvulaExternaAberta),
      statusValvulaExterna,
      botaoValvulaDesabilitado: travadoHidrost,
      iconeCadeadoVisivel: travadoHidrost,
      barrasNivelMax: Number(c.barrasNivelMax ?? c.nivelMaxBarras ?? c.nivelMax ?? 0),
      barrasIntegridade: Number(c.barrasIntegridade ?? c.integridade ?? 0),
      barrasEnergiaAlocada: Number(c.barrasEnergiaAlocada ?? c.energiaAlocada ?? 0),
      tripulantesPresentes,
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
    if (inspecao.canalPermissao !== 'VISIVEL') {
      if (opcoesDebug.vazarZeroTripulantesQuandoCegoL3 === true) {
        return {
          salaId: s.id,
          canalPermissao: inspecao.canalPermissao,
          status: inspecao.status,
          marcadorExplicito: inspecao.marcadorExplicito,
          tripulantesVisiveis: [],
          textoTripulacao: '0 tripulantes',
        };
      }
      return {
        salaId: s.id,
        canalPermissao: inspecao.canalPermissao,
        status: inspecao.status,
        marcadorExplicito: inspecao.marcadorExplicito,
        tripulantesVisiveis: undefined,
        textoTripulacao: inspecao.marcadorExplicito,
      };
    }
    const qtd = inspecao.dados.tripulantes.length;
    return {
      salaId: s.id,
      canalPermissao: inspecao.canalPermissao,
      status: inspecao.status,
      marcadorExplicito: inspecao.marcadorExplicito,
      tripulantesVisiveis: inspecao.dados.tripulantes,
      textoTripulacao: `${qtd} tripulante(s)`,
    };
  });

  const esquivaEfetivaPct = calcularEsquivaEfetivaNave(nave);
  const cargaSaltoPct = Math.min(100, Math.round(((nave.progressoFugaSeg ?? 0) / 20.0) * 100));
  const idCarcaca = nave.idArquitetura ?? nave.idCarcaca ?? 'CARCACA_ALFA';
  const barrasTotaisReator = Number(
    nave.reator?.barrasTotais ?? ((nave.reator?.barrasCompradas ?? 6) + (nave.reator?.barrasBonusArraias ?? 0))
  );

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
      barreiraBolhas: Number(nave.camadasBarreiraAtivas ?? nave.barreira?.bolhasAtuais ?? 0),
      estadoFisico: nave.estadoFisico,
      rotuloEstado: emNoFoil ? 'NO FOIL' : 'TOUCHDOWN',
      esquivaEfetivaPct,
      cargaSaltoPct,
      recursos: estado.economia ?? estado.recursos ?? { sucata: 30, biomassa: 15, combustivel: 12, municao: 8 },
    },
    reatorCoracaoBioEletrico: {
      barrasTotais: barrasTotaisReator,
      barrasDisponiveis: Number(nave.reator?.barrasDisponiveis ?? nave.energiaLivre ?? 0),
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
  '#': Object.freeze([5, 8, 12, 255]),
  Q: Object.freeze([13, 21, 32, 255]),
  C: Object.freeze([0, 229, 255, 255]),
  M: Object.freeze([216, 56, 72, 255]),
  E: Object.freeze([56, 224, 120, 255]),
  H: Object.freeze([140, 150, 164, 255]),
  A: Object.freeze([10, 58, 74, 255]),
  O: Object.freeze([255, 179, 0, 255]),
  V: Object.freeze([108, 42, 168, 255]),
  W: Object.freeze([235, 248, 255, 255]),
  L: Object.freeze([255, 112, 32, 255]),
});

/**
 * Avalia a geometria anatômica individual de cada uma das 26 entidades do Atlas (garantindo 26/26 máscaras binárias distintas,
 * exterior transparente `.` e contorno de 1px `#`).
 */
function pertenceSilhuetaEntidade26(idEntidade, x, y, largura, altura) {
  const cx = (largura - 1) / 2;
  const cy = (altura - 1) / 2;
  const dx = (x - cx) / (largura / 2 - 0.6);
  const dy = (y - cy) / (altura / 2 - 0.6);
  const r2 = dx * dx + dy * dy;

  switch (idEntidade) {
    // === 5 CARCAÇAS ===
    case 'CARCACA_ALFA': // Concha espiral de náutilo com abertura frontal à direita
      return (r2 <= 0.95 && !(y < 3 && x > 12)) || (y >= 4 && y <= 8 && x >= 11 && x <= 14);
    case 'MANTA_VOLT': // Asas largas em losango + cauda fina estendida à esquerda
      return Math.abs(dx) + Math.abs(dy) <= 1.02 || (y >= 5 && y <= 6 && x >= 1 && x <= 14);
    case 'COURACA_LIMIAR': // Domo pesado de límulo + tubo de abordagem frontal saliente à direita
      return (y >= 2 && y <= 9 && x >= 1 && x <= 14 && r2 <= 1.05) || (y >= 4 && y <= 7 && x >= 13 && x <= 16);
    case 'SOMBRA_ABISSAL': // Manto esguio de lula-vampiro + tentáculos traseiros recortados
      return (x >= 5 && x <= 14 && Math.abs(dy) <= 0.78 && r2 <= 0.95) || (x >= 1 && x <= 6 && (y === 3 || y === 5 || y === 8));
    case 'COLMEIA_VIVA': // Colônia assimétrica de corais com 3 ramos superiores
      return (y >= 4 && y <= 10 && x >= 2 && x <= 13) || (y >= 1 && y <= 4 && (x === 4 || x === 8 || x === 11));

    // === 5 ALIADOS ===
    case 'POLVO': // Domo cefálico arredondado + 4 tentáculos inferiores separados
      return (y >= 1 && y <= 6 && x >= 3 && x <= 10) || (y >= 7 && y <= 10 && (x === 2 || x === 5 || x === 8 || x === 11));
    case 'ARRAIA': // Silhueta achatada de manta + ferrão caudal inferior
      return Math.abs(dx) * 0.85 + Math.abs(dy) * 1.15 <= 0.95 || (y >= 8 && y <= 10 && x >= 7 && x <= 8);
    case 'BAIACU_NORMAL': // Peixe compacto em gota + nadadeira caudal em V
      return (x >= 3 && x <= 10 && y >= 3 && y <= 8) || (x >= 1 && x <= 2 && (y === 3 || y === 4 || y === 7 || y === 8));
    case 'BAIACU_INFLADO': { // Esfera inflada 20x18 com 8 espinhos radiais pronunciados
      const dist = Math.hypot(dx, dy);
      const ang8 = Math.abs(Math.sin(Math.atan2(dy, dx) * 4));
      return dist <= 0.68 || (dist <= 0.98 && ang8 > 0.76);
    }
    case 'CARANGUEJO': // Carapaça larga + 2 pinças erguidas no topo + patas laterais
      return (y >= 4 && y <= 9 && x >= 3 && x <= 12) || (y >= 1 && y <= 4 && (x === 2 || x === 3 || x === 12 || x === 13)) || (y === 10 && (x === 4 || x === 7 || x === 11));

    // === 3 INVASORES ===
    case 'MARINHEIRO': // Silhueta bípede humana (cabeça, tronco, braços e duas pernas separadas)
      return (y >= 1 && y <= 3 && x >= 4 && x <= 7) || (y >= 4 && y <= 8 && x >= 2 && x <= 9) || (y >= 9 && y <= 12 && ((x >= 3 && x <= 4) || (x >= 7 && x <= 8)));
    case 'MERGULHADOR': // Escafandro pesado (capacete esférico largo, ombros largos e botas unidas)
      return (y >= 1 && y <= 4 && x >= 3 && x <= 8) || (y >= 5 && y <= 9 && x >= 1 && x <= 10) || (y >= 10 && y <= 12 && x >= 3 && x <= 8);
    case 'PARASITA': // Verme segmentado em S com mandíbulas abertas à direita
      return (y >= 3 && y <= 6 && x >= 2 && x <= 8) || (x >= 9 && x <= 10 && (y === 2 || y === 3 || y === 6 || y === 7)) || (x === 1 && y >= 4 && y <= 5);

    // === 7 ARMAS DORSAIS ===
    case 'EMISSOR_ACUSTICO_I': // Corneta acústica que alarga na boca direita (20x10)
      return (x >= 2 && x <= 13 && y >= 3 && y <= 6) || (x >= 14 && x <= 18 && y >= 1 && y <= 8);
    case 'RAJADA_HIDROPNEUMATICA_II': // Canhão rotativo de 3 canos paralelos (22x10)
      return (x >= 2 && x <= 12 && y >= 2 && y <= 7) || (x >= 13 && x <= 20 && (y === 2 || y === 4 || y === 5 || y === 7));
    case 'CANHAO_ARPAO_CABO': // Trilho longo com carretel traseiro e ponta de arpão farpada (24x10)
      return (x >= 1 && x <= 5 && y >= 1 && y <= 8) || (x >= 6 && x <= 18 && y >= 3 && y <= 6) || (x >= 19 && x <= 22 && (y === 4 || y === 5 || (x === 20 && (y === 2 || y === 7))));
    case 'DISPERSOR_ESTILHACOS': // Boca dupla de flak naval (22x12)
      return (x >= 2 && x <= 14 && y >= 2 && y <= 9) || (x >= 15 && x <= 20 && ((y >= 1 && y <= 4) || (y >= 7 && y <= 10)));
    case 'CORTADOR_TERMICO_PLASMA': // Bobina emissora de feixe com lente focal dianteira (24x10)
      return (x >= 2 && x <= 16 && y >= 2 && y <= 7 && x % 4 !== 0) || (x >= 3 && x <= 22 && y >= 3 && y <= 6);
    case 'LANCADOR_TORPEDO_ABISSAL': // Tubo pesado de torpedo com aletas traseiras e ogiva (26x10)
      return (x >= 1 && x <= 4 && y >= 1 && y <= 8) || (x >= 5 && x <= 21 && y >= 2 && y <= 7) || (x >= 22 && x <= 24 && y >= 3 && y <= 6);
    case 'MORTEIRO_ESPOROS': // Tubo curto inclinado para o alto + bolsa de esporos (22x10)
      return (x >= 2 && x <= 11 && y >= 4 && y <= 8) || (x >= 10 && x <= 19 && y >= 1 && y <= 5);

    // === 6 ÓRGÃOS ENXERTÁVEIS (10x10) ===
    case 'GLANDULA_BAIACU': // Glândula bi-lobada com pontas tóxicas
      return (y >= 2 && y <= 7 && x >= 1 && x <= 8 && !(x >= 4 && x <= 5 && (y === 2 || y === 7))) || ((x === 4 || x === 5) && (y === 1 || y === 8));
    case 'ELETRO_PLACA_ARRAIA': // Disco bio-elétrico hexagonal chanfrado
      return x >= 1 && x <= 8 && y >= 2 && y <= 7 && (x + y >= 4) && (x + y <= 13);
    case 'BEXIGA_PRESSAO_ABISSAL': // Bexiga piriforme com gargalo de válvula no topo
      return (y >= 1 && y <= 3 && x >= 4 && x <= 5) || (y >= 4 && y <= 8 && x >= 2 && x <= 7);
    case 'BOLSA_TINTA_CEGANTE': // Saco de tinta assimétrico com sifão diagonal
      return (y >= 3 && y <= 8 && x >= 1 && x <= 6) || (y >= 1 && y <= 4 && x >= 5 && x <= 8);
    case 'DENTE_LEVIATA_SERRILHADO': // Presa curva serrilhada em diagonal
      return (y >= 1 && y <= 8 && x >= Math.max(1, y - 1) && x <= Math.min(8, y + 3));
    case 'GLANDULA_TERMOFILICA': // Nódulo vulcânico com 2 chaminés termais no topo
    default:
      return (y >= 5 && y <= 8 && x >= 1 && x <= 8) || (y >= 1 && y <= 4 && ((x >= 2 && x <= 3) || (x >= 6 && x <= 7)));
  }
}

function construirGradeSilhuetaPixelArt({
  idEntidade,
  largura,
  altura,
  corPrimaria,
  corSecundaria,
  soquetes = 0,
}) {
  const mascara = Array.from({ length: altura }, (_, y) =>
    Array.from({ length: largura }, (__, x) =>
      pertenceSilhuetaEntidade26(idEntidade, x, y, largura, altura)
    )
  );

  const linhas = [];
  for (let y = 0; y < altura; y += 1) {
    let linha = '';
    for (let x = 0; x < largura; x += 1) {
      if (!mascara[y][x]) {
        linha += '.';
        continue;
      }
      const naBorda =
        x === 0 ||
        x === largura - 1 ||
        y === 0 ||
        y === altura - 1 ||
        !mascara[y - 1][x] ||
        !mascara[y + 1][x] ||
        !mascara[y][x - 1] ||
        !mascara[y][x + 1];

      if (naBorda) {
        linha += '#';
      } else if (
        soquetes > 0 &&
        y === Math.floor(altura / 2) &&
        x >= 4 &&
        x < 4 + soquetes * 3 &&
        (x - 4) % 3 === 0
      ) {
        linha += 'W';
      } else if (idEntidade === 'BAIACU_INFLADO' && (x + y) % 2 === 0) {
        linha += 'W';
      } else if ((x + y) % 3 === 0) {
        linha += corSecundaria;
      } else {
        linha += corPrimaria;
      }
    }
    linhas.push(linha);
  }
  return linhas;
}

/**
 * Item 3 — Retorna o Atlas de Sprites Pixel Art na Grade Nativa (960x540, câmara 50x35 px)
 * contendo as 5 Carcaças, 4 Espécies Aliadas (com Baiacu normal e inflado), 3 Invasores, 7 Armas e 6 Órgãos.
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
      larguraSpritePx: 48,
      alturaSpritePx: 32,
      larguraAsaSubmersaPx: larguraAsaPadraoPx,
      temTuboAbordagemFrontal: false,
      temNevoaTinta: false,
      temPoliposBioluminescentes: false,
      tripulacaoInicial: Object.freeze({ POLVO: 1, ARRAIA: 1, BAIACU: 1 }),
      gradePixels: construirGradeSilhuetaPixelArt({
        idEntidade: 'CARCACA_ALFA',
        largura: 16,
        altura: 12,
        corPrimaria: 'Q',
        corSecundaria: 'C',
      }),
    },
    {
      id: 'MANTA_VOLT',
      nome: 'MANTA-VOLT',
      hpCascoMax: 30,
      pesoTotalKg: 195,
      sustentacaoMaxKg: 260,
      larguraSpritePx: 48,
      alturaSpritePx: 32,
      larguraAsaSubmersaPx: larguraAsaPadraoPx,
      temTuboAbordagemFrontal: false,
      temNevoaTinta: false,
      temPoliposBioluminescentes: false,
      tripulacaoInicial: Object.freeze({ ARRAIA: 2, POLVO: 1 }),
      gradePixels: construirGradeSilhuetaPixelArt({
        idEntidade: 'MANTA_VOLT',
        largura: 16,
        altura: 12,
        corPrimaria: 'A',
        corSecundaria: 'O',
      }),
    },
    {
      id: 'COURACA_LIMIAR',
      nome: 'COURAÇA-LIMIAR',
      hpCascoMax: 30,
      pesoTotalKg: 225,
      sustentacaoMaxKg: 300,
      larguraSpritePx: 48,
      alturaSpritePx: 32,
      larguraAsaSubmersaPx: larguraAsaCouracaPx,
      temTuboAbordagemFrontal: true,
      temNevoaTinta: false,
      temPoliposBioluminescentes: false,
      tripulacaoInicial: Object.freeze({ CARANGUEJO: 2, BAIACU: 1 }),
      gradePixels: construirGradeSilhuetaPixelArt({
        idEntidade: 'COURACA_LIMIAR',
        largura: 18,
        altura: 12,
        corPrimaria: 'M',
        corSecundaria: 'L',
      }),
    },
    {
      id: 'SOMBRA_ABISSAL',
      nome: 'SOMBRA-ABISSAL',
      hpCascoMax: 20,
      pesoTotalKg: 220,
      sustentacaoMaxKg: 260,
      larguraSpritePx: 48,
      alturaSpritePx: 32,
      larguraAsaSubmersaPx: larguraAsaPadraoPx,
      temTuboAbordagemFrontal: false,
      temNevoaTinta: true,
      temPoliposBioluminescentes: false,
      tripulacaoInicial: Object.freeze({ POLVO: 1, CARANGUEJO: 1 }),
      gradePixels: construirGradeSilhuetaPixelArt({
        idEntidade: 'SOMBRA_ABISSAL',
        largura: 16,
        altura: 12,
        corPrimaria: 'V',
        corSecundaria: 'C',
      }),
    },
    {
      id: 'COLMEIA_VIVA',
      nome: 'COLMEIA-VIVA',
      hpCascoMax: 30,
      pesoTotalKg: 230,
      sustentacaoMaxKg: 260,
      larguraSpritePx: 48,
      alturaSpritePx: 32,
      larguraAsaSubmersaPx: larguraAsaPadraoPx,
      temTuboAbordagemFrontal: false,
      temNevoaTinta: false,
      temPoliposBioluminescentes: true,
      tripulacaoInicial: Object.freeze({ BAIACU: 2, ARRAIA: 1 }),
      gradePixels: construirGradeSilhuetaPixelArt({
        idEntidade: 'COLMEIA_VIVA',
        largura: 16,
        altura: 12,
        corPrimaria: 'E',
        corSecundaria: 'M',
      }),
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
      gradePixels: construirGradeSilhuetaPixelArt({
        idEntidade: 'POLVO',
        largura: 14,
        altura: 12,
        corPrimaria: 'C',
        corSecundaria: 'Q',
      }),
    },
    {
      id: 'ARRAIA',
      especie: 'ARRAIA',
      estadoVisual: 'NORMAL',
      hpMax: 70,
      dps: 8,
      larguraPx: 16,
      alturaPx: 12,
      gradePixels: construirGradeSilhuetaPixelArt({
        idEntidade: 'ARRAIA',
        largura: 16,
        altura: 12,
        corPrimaria: 'O',
        corSecundaria: 'A',
      }),
    },
    {
      id: 'BAIACU_NORMAL',
      especie: 'BAIACU',
      estadoVisual: 'NORMAL',
      hpMax: 150,
      dps: 14,
      larguraPx: 14,
      alturaPx: 12,
      gradePixels: construirGradeSilhuetaPixelArt({
        idEntidade: 'BAIACU_NORMAL',
        largura: 14,
        altura: 12,
        corPrimaria: 'E',
        corSecundaria: 'O',
      }),
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
      gradePixels: construirGradeSilhuetaPixelArt({
        idEntidade: 'BAIACU_INFLADO',
        largura: 20,
        altura: 18,
        corPrimaria: 'O',
        corSecundaria: 'W',
      }),
    },
    {
      id: 'CARANGUEJO',
      especie: 'CARANGUEJO',
      estadoVisual: 'NORMAL',
      hpMax: 110,
      dps: 12,
      larguraPx: 16,
      alturaPx: 12,
      gradePixels: construirGradeSilhuetaPixelArt({
        idEntidade: 'CARANGUEJO',
        largura: 16,
        altura: 12,
        corPrimaria: 'M',
        corSecundaria: 'L',
      }),
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
      gradePixels: construirGradeSilhuetaPixelArt({
        idEntidade: 'MARINHEIRO',
        largura: 12,
        altura: 14,
        corPrimaria: 'H',
        corSecundaria: 'W',
      }),
    },
    {
      id: 'MERGULHADOR',
      nome: 'MERGULHADOR',
      hpMax: 100,
      dps: 12,
      larguraPx: 12,
      alturaPx: 14,
      gradePixels: construirGradeSilhuetaPixelArt({
        idEntidade: 'MERGULHADOR',
        largura: 12,
        altura: 14,
        corPrimaria: 'A',
        corSecundaria: 'L',
      }),
    },
    {
      id: 'PARASITA',
      nome: 'PARASITA',
      hpMax: 60,
      dps: 10,
      larguraPx: 12,
      alturaPx: 10,
      gradePixels: construirGradeSilhuetaPixelArt({
        idEntidade: 'PARASITA',
        largura: 12,
        altura: 10,
        corPrimaria: 'V',
        corSecundaria: 'E',
      }),
    },
  ];

  const specsArmas = [
    { id: 'EMISSOR_ACUSTICO_I', nome: 'Acústico I', pesoKg: 10, energia: 1, soquetes: 1, municao: 0, larguraPx: 20, alturaPx: 10, corSec: 'C' },
    { id: 'RAJADA_HIDROPNEUMATICA_II', nome: 'Rajada II', pesoKg: 18, energia: 2, soquetes: 1, municao: 0, larguraPx: 22, alturaPx: 10, corSec: 'O' },
    { id: 'CANHAO_ARPAO_CABO', nome: 'Arpão de Cabo', pesoKg: 15, energia: 2, soquetes: 2, municao: 0, larguraPx: 24, alturaPx: 10, corSec: 'M' },
    { id: 'DISPERSOR_ESTILHACOS', nome: 'Estilhaços', pesoKg: 22, energia: 2, soquetes: 1, municao: 0, larguraPx: 22, alturaPx: 12, corSec: 'L' },
    { id: 'CORTADOR_TERMICO_PLASMA', nome: 'Cortador Térmico', pesoKg: 25, energia: 2, soquetes: 1, municao: 0, larguraPx: 24, alturaPx: 10, corSec: 'E' },
    { id: 'LANCADOR_TORPEDO_ABISSAL', nome: 'Torpedo Abissal', pesoKg: 28, energia: 2, soquetes: 2, municao: 1, larguraPx: 26, alturaPx: 10, corSec: 'A' },
    { id: 'MORTEIRO_ESPOROS', nome: 'Morteiro de Esporos', pesoKg: 12, energia: 1, soquetes: 2, municao: 1, larguraPx: 22, alturaPx: 10, corSec: 'V' },
  ];
  const armas = specsArmas.map((a) => ({
    id: a.id,
    nome: a.nome,
    pesoKg: a.pesoKg,
    energia: a.energia,
    soquetes: a.soquetes,
    municao: a.municao,
    larguraPx: a.larguraPx,
    alturaPx: a.alturaPx,
    materialVisual: 'CHASSI_HUMANO_RECUPERADO_COM_TENDOES',
    gradePixels: construirGradeSilhuetaPixelArt({
      idEntidade: a.id,
      largura: a.larguraPx,
      altura: a.alturaPx,
      corPrimaria: 'H',
      corSecundaria: a.corSec,
      soquetes: a.soquetes,
    }),
  }));

  // Valores canônicos exatos da Seção 5.2 (Vol. 05)
  const specsOrgaos = [
    { id: 'GLANDULA_BAIACU', idCatalogo52: 'GLANDULA_BAIACU', nome: 'Glândula de Baiacu', pesoKg: 5, efeito: 'veneno -6 HP/s por 10s', cor: 'E' },
    { id: 'ELETRO_PLACA_ARRAIA', idCatalogo52: 'ELETRO_PLACA_ARRAIA', nome: 'Eletro-Placa', pesoKg: 5, efeito: 'choque 6s', cor: 'O' },
    { id: 'BEXIGA_PRESSAO_ABISSAL', idCatalogo52: 'BEXIGA_ALTA_PRESSAO', nome: 'Bexiga de Pressão', pesoKg: 5, efeito: '+15 kg água', cor: 'C' },
    { id: 'BOLSA_TINTA_CEGANTE', idCatalogo52: 'BOLSA_TINTA_ABISSAL', nome: 'Bolsa de Tinta', pesoKg: 5, efeito: 'cegueira 8s', cor: 'V' },
    { id: 'DENTE_LEVIATA_SERRILHADO', idCatalogo52: 'DENTE_LEVIATA', nome: 'Dente de Leviatã', pesoKg: 5, efeito: '+1 dano', cor: 'W' },
    { id: 'GLANDULA_TERMOFILICA', idCatalogo52: 'GLANDULA_TERMOFILICA', nome: 'Glândula Termofílica', pesoKg: 5, efeito: 'fervura 8s', cor: 'L' },
  ];
  const orgaos = specsOrgaos.map((o) => ({
    id: o.id,
    idCatalogo52: o.idCatalogo52,
    nome: o.nome,
    pesoKg: o.pesoKg,
    efeito: o.efeito,
    larguraPx: 10,
    alturaPx: 10,
    gradePixels: construirGradeSilhuetaPixelArt({
      idEntidade: o.id,
      largura: 10,
      altura: 10,
      corPrimaria: o.cor,
      corSecundaria: 'M',
    }),
  }));

  return clonarProfundoCongelado({
    resolucaoNativaReferencia: { largura: 960, altura: 540, camaraLargura: 50, camaraAltura: 35 },
    paletaRgba: PALETA_PIXEL_ART_BIOFOIL,
    carcacas,
    aliados,
    invasores,
    armas,
    orgaos,
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

const CORES_HEX_PALETA = Object.freeze({
  '#': '#05080c',
  Q: '#0d1520',
  C: '#00e5ff',
  M: '#d83848',
  E: '#38e078',
  H: '#8c96a4',
  A: '#0a3a4a',
  O: '#ffb300',
  V: '#6c2aa8',
  W: '#ebf8ff',
  L: '#ff7020',
});

/**
 * Item 1 — Renderiza o ViewModel 16:9 completo num contexto Canvas 2D nativo (960x540 -> upscale 2x 1920x1080)
 * com `imageSmoothingEnabled = false` e devolve a lista completa de primitivas desenhadas.
 */
export function renderizarViewModelNoCanvas2d(viewModel, ctxCanvas2d = null, opcoesDebug = {}) {
  const L = viewModel.orcamentoLayoutNativo;
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

  if (ctxCanvas2d) {
    ctxCanvas2d.imageSmoothingEnabled = false;
  }

  // 1. Céu tempestuoso (0..330), linha d'água e oceano subaquático contínuo abaixo de LINHA_DAGUA_Y (330..540)
  registrar({ op: 'FILL_RECT', camada: 'CEU', x: 0, y: 0, largura: 960, altura: L.LINHA_DAGUA_Y, cor: '#05080c' });
  registrar({
    op: 'FILL_RECT',
    camada: 'OCEANO_SUBMERSO',
    x: 0,
    y: L.LINHA_DAGUA_Y,
    largura: 960,
    altura: 540 - L.LINHA_DAGUA_Y,
    cor: '#0a3a4a',
  });
  registrar({ op: 'FILL_RECT', camada: 'LINHA_DAGUA', x: 112, y: L.LINHA_DAGUA_Y, largura: 848, altura: 2, cor: '#00e5ff' });

  // 2. Barra Superior (y = 0..36): Casco, Barreira, Estado/Esquiva, 4 Moedas e Carga de Salto
  const rec = viewModel.barraSuperior.recursos;
  registrar({ op: 'FILL_RECT', camada: 'HUD_TOPO', x: 0, y: 0, largura: 960, altura: L.HUD_TOPO_ALTURA, cor: '#0d1520' });
  registrar({
    op: 'TEXT',
    camada: 'HUD_TOPO',
    x: 12,
    y: 22,
    cor: '#00e5ff',
    texto: `CASCO ${viewModel.barraSuperior.hpCascoAtual}/${viewModel.barraSuperior.hpCascoMax} | BARREIRA ${viewModel.barraSuperior.barreiraBolhas} | ${viewModel.barraSuperior.rotuloEstado} - ESQUIVA ${viewModel.barraSuperior.esquivaEfetivaPct}%`,
  });
  registrar({
    op: 'TEXT',
    camada: 'HUD_TOPO_RECURSOS',
    x: 520,
    y: 22,
    cor: '#ebf8ff',
    texto: `SUCATA ${rec.sucata} | BIO ${rec.biomassa} | COMB ${rec.combustivel} | MUN ${rec.municao} | SALTO ${viewModel.barraSuperior.cargaSaltoPct}%`,
  });

  // 3. Termômetro Vertical de Sustentação (x = 0..112, y = 36..440): Escala 300..100 kg, Barra de Peso, Linha Limite, Ghost Preview e Botões
  const term = viewModel.termometroSustentacao;
  registrar({
    op: 'FILL_RECT',
    camada: 'TERMOMETRO',
    x: 0,
    y: L.HUD_TOPO_ALTURA,
    largura: L.COLUNA_TERMOMETRO_LARGURA,
    altura: L.PAINEL_RODAPE_TOPO_Y - L.HUD_TOPO_ALTURA,
    cor: '#0d1520',
  });
  const alturaEscalaPx = 240;
  const baseEscalaY = 300;
  const alturaPesoPx = Math.max(0, Math.min(alturaEscalaPx, Math.round(((term.pesoTotalKg - 100) / 200) * alturaEscalaPx)));
  const yLinhaSustentacao = baseEscalaY - Math.max(0, Math.min(alturaEscalaPx, Math.round(((term.sustentacaoAtualKg - 100) / 200) * alturaEscalaPx)));
  registrar({
    op: 'FILL_RECT',
    camada: 'TERMOMETRO_BARRA_PESO',
    x: 24,
    y: baseEscalaY - alturaPesoPx,
    largura: 28,
    altura: alturaPesoPx,
    cor: term.emSobrepeso ? '#d83848' : '#00e5ff',
  });
  registrar({
    op: 'FILL_RECT',
    camada: 'TERMOMETRO_LINHA_LIMITE',
    x: 16,
    y: yLinhaSustentacao,
    largura: 44,
    altura: 2,
    cor: '#38e078',
  });
  registrar({
    op: 'TEXT',
    camada: 'TERMOMETRO_TEXTO',
    x: 8,
    y: 54,
    cor: '#ebf8ff',
    texto: `${term.pesoTotalKg} kg PESO / ${term.sustentacaoAtualKg} kg LIMITE`,
  });
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
      x: 16,
      y: yGhost,
      largura: 44,
      altura: 2,
      cor: term.ghostPreview.causariaQuedaNoMar ? '#d83848' : '#ffb300',
    });
    registrar({
      op: 'TEXT',
      camada: 'TERMOMETRO_GHOST_PREVIEW',
      x: 8,
      y: 342,
      cor: term.ghostPreview.causariaQuedaNoMar ? '#d83848' : '#ffb300',
      texto: `${term.ghostPreview.pesoProjetadoKg}/${term.ghostPreview.sustentacaoProjetadaKg} kg ${term.ghostPreview.rotuloFantasma}`,
    });
  }
  registrar({
    op: 'STROKE_RECT',
    camada: 'BTN_MERGULHO_TATICO',
    x: 8,
    y: 360,
    largura: 96,
    altura: 32,
    cor: term.botaoMergulhoTatico.ativo ? '#ffb300' : '#00e5ff',
  });
  registrar({
    op: 'TEXT',
    camada: 'BTN_MERGULHO_TATICO',
    x: 12,
    y: 380,
    cor: '#ebf8ff',
    texto: term.botaoMergulhoTatico.rotulo,
  });
  registrar({
    op: 'STROKE_RECT',
    camada: 'BTN_DRENAR_TUDO',
    x: 8,
    y: 398,
    largura: 96,
    altura: 32,
    cor: term.botaoDrenarTudo.travadoTouchdown ? '#d83848' : '#38e078',
  });
  registrar({
    op: 'TEXT',
    camada: 'TERMOMETRO',
    x: 12,
    y: 418,
    cor: term.botaoDrenarTudo.travadoTouchdown ? '#d83848' : '#38e078',
    texto: term.botaoDrenarTudo.atalho,
  });

  // 4. Bio-nave do jogador: Armas Dorsais (y = 136+dy), 8 Câmaras (2x4, 50x35 px), Válvulas Externas, Água, Quilha e Asa Submersa
  const baseGradeX = 240;
  const baseGradeY = 156 + dy;
  const parede2e3AndarY = baseGradeY + 2 * L.CAMARA_ALTURA + 2 * L.PAREDE_ESPESSURA;
  const specCarcaca = atlas.carcacas.find((c) => c.id === viewModel.idCarcaca) ?? atlas.carcacas[0];

  // Armas dorsais presas por tendões acima do 1º andar (y = baseGradeY - 20) com pixels do sprite do Atlas
  viewModel.caixaArmas.forEach((slot, idx) => {
    if (slot.ocupado) {
      const xArmaDorsal = baseGradeX + 4 + idx * 26;
      const yArmaDorsal = baseGradeY - L.ARMAS_DORSAIS_ALTURA;
      registrar({
        op: 'FILL_RECT',
        camada: `ARMA_DORSAL_${idx}`,
        x: xArmaDorsal,
        y: yArmaDorsal,
        largura: 22,
        altura: L.ARMAS_DORSAIS_ALTURA - 2,
        cor: '#8c96a4',
      });
      const armaAtlas = atlas.armas.find((a) => a.id === slot.chassiId || a.idCatalogo52 === slot.chassiId);
      for (let py = 0; py < armaAtlas.gradePixels.length; py += 1) {
        const linha = armaAtlas.gradePixels[py];
        for (let px = 0; px < linha.length; px += 1) {
          const ch = linha[px];
          if (ch !== '.') {
            registrar({
              op: 'FILL_RECT',
              camada: `ARMA_DORSAL_PIXEL_${idx}`,
              x: xArmaDorsal + px,
              y: yArmaDorsal + py,
              largura: 1,
              altura: 1,
              cor: CORES_HEX_PALETA[ch],
            });
          }
        }
      }
    }
  });

  // Mastro vertical da quilha + Asa hidrofólio horizontal submersa (largura 88 px na Couraça-Limiar, 44 px nas demais)
  const centroQuilhaX = baseGradeX + L.CAMARA_LARGURA + L.PAREDE_ESPESSURA;
  const baseCascoY = baseGradeY + 4 * L.CAMARA_ALTURA + 5 * L.PAREDE_ESPESSURA;
  const asaY = Math.max(L.LINHA_DAGUA_Y + 28, baseCascoY + 38);
  registrar({
    op: 'FILL_RECT',
    camada: 'MASTRO_QUILHA',
    x: centroQuilhaX - 4,
    y: baseCascoY,
    largura: 8,
    altura: asaY - baseCascoY,
    cor: '#0d1520',
  });
  registrar({
    op: 'FILL_RECT',
    camada: 'ASA_HIDROFOLIO_SUBMERSA',
    x: centroQuilhaX - Math.floor(specCarcaca.larguraAsaSubmersaPx / 2),
    y: asaY,
    largura: specCarcaca.larguraAsaSubmersaPx,
    altura: 8,
    cor: '#00e5ff',
  });

  const spritesDesenhados = [];

  for (const cam of viewModel.camaras) {
    const xCam = baseGradeX + L.PAREDE_ESPESSURA + cam.coluna * (L.CAMARA_LARGURA + L.PAREDE_ESPESSURA);
    const yCam = baseGradeY + L.PAREDE_ESPESSURA + cam.andar * (L.CAMARA_ALTURA + L.PAREDE_ESPESSURA);

    // Água interna da câmara (roxa #6c2aa8 se hipóxia < 20% O2; ciano-escuro #0a3a4a normal)
    const alturaAguaPx = Math.round((Math.min(100, Math.max(0, cam.nivelAguaPct)) / 100) * (L.CAMARA_ALTURA - 2));
    if (alturaAguaPx > 0) {
      registrar({
        op: 'FILL_RECT',
        camada: `AGUA_CAMARA_${cam.id}`,
        x: xCam + 1,
        y: yCam + L.CAMARA_ALTURA - 1 - alturaAguaPx,
        largura: L.CAMARA_LARGURA - 2,
        altura: alturaAguaPx,
        cor: cam.oxigenioPct < 20 ? '#6c2aa8' : '#0a3a4a',
      });
    }
    if (cam.curtoCircuitoAtivo) {
      registrar({
        op: 'STROKE_RECT',
        camada: `CURTO_CAMARA_${cam.id}`,
        x: xCam + 2,
        y: yCam + 2,
        largura: L.CAMARA_LARGURA - 4,
        altura: L.CAMARA_ALTURA - 4,
        cor: '#ffb300',
      });
    }

    // Parede da câmara (50x35 px nativos)
    registrar({
      op: 'STROKE_RECT',
      camada: `CAMARA_${cam.id}`,
      x: xCam,
      y: yCam,
      largura: L.CAMARA_LARGURA,
      altura: L.CAMARA_ALTURA,
      cor: cam.brechaAtiva ? '#d83848' : '#00e5ff',
    });

    // Válvula externa e ícone de cadeado hidrostático em Touchdown
    const xValvula = cam.coluna === 0 ? xCam - 12 : xCam + L.CAMARA_LARGURA + 2;
    const yValvula = yCam + 10;
    registrar({
      op: 'FILL_RECT',
      camada: `VALVULA_CAMARA_${cam.id}`,
      x: xValvula,
      y: yValvula,
      largura: 10,
      altura: 15,
      cor: cam.iconeCadeadoVisivel ? '#d83848' : cam.valvulaExternaAberta ? '#38e078' : '#ff7020',
    });

    // Desenho pixel-a-pixel dos sprites dos tripulantes presentes (Slot 0 à esquerda, Slot 1 à direita sem sobreposição)
    cam.tripulantesPresentes.forEach((trip, slotIdx) => {
      const idSprite =
        trip.especie === 'BAIACU'
          ? (trip.inflado ? 'BAIACU_INFLADO' : 'BAIACU_NORMAL')
          : trip.especie;
      const sprite = rasterizarSpriteRgba('aliados', idSprite);
      const itemAtlas = atlas.aliados.find((a) => a.id === idSprite);
      const xSprite = xCam + 4 + slotIdx * 22;
      const ySprite = yCam + 10;

      for (let py = 0; py < itemAtlas.gradePixels.length; py += 1) {
        const linha = itemAtlas.gradePixels[py];
        for (let px = 0; px < linha.length; px += 1) {
          const ch = linha[px];
          if (ch !== '.') {
            registrar({
              op: 'FILL_RECT',
              camada: `SPRITE_PIXEL_${trip.id}`,
              x: xSprite + px,
              y: ySprite + py,
              largura: 1,
              altura: 1,
              cor: CORES_HEX_PALETA[ch],
            });
          }
        }
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
  }

  // 5. Painel do Alvo (x = 600..960) alinhado com obterMapaHitboxesNativo (x = 640 + col*110, y = 160 + row*70) e Lei L3
  if (viewModel.painelAlvo.presente) {
    registrar({
      op: 'TEXT',
      camada: 'PAINEL_ALVO_CABECALHO',
      x: 640,
      y: 140,
      cor: '#d83848',
      texto: `${viewModel.painelAlvo.nomeAlvo} | CASCO ${viewModel.painelAlvo.hpCascoAtual}/${viewModel.painelAlvo.hpCascoMax} | ESQUIVA ${viewModel.painelAlvo.esquivaPct}%`,
    });
  }
  const textosPainelAlvo = [];
  for (const [idx, sala] of viewModel.painelAlvo.salasInspecionadas.entries()) {
    const colAlvo = idx % 2;
    const linAlvo = Math.floor(idx / 2);
    const xSala = 640 + colAlvo * 110;
    const ySala = 160 + linAlvo * 70;
    const textoSala = `${sala.salaId}: ${sala.textoTripulacao}`;
    textosPainelAlvo.push(textoSala);
    registrar({
      op: 'STROKE_RECT',
      camada: `SALA_ALVO_${sala.salaId}`,
      x: xSala,
      y: ySala,
      largura: 96,
      altura: 56,
      cor: sala.canalPermissao === 'VISIVEL' ? '#00e5ff' : '#ffb300',
    });
    registrar({
      op: 'TEXT',
      camada: 'PAINEL_ALVO_L3',
      x: xSala + 6,
      y: ySala + 28,
      cor: sala.canalPermissao === 'VISIVEL' ? '#ebf8ff' : '#ffb300',
      texto: textoSala,
    });
  }

  // 6. Rodapé Completo (y = 440..540): Coração Bio-Elétrico, 8 Sistemas, 4 Slots de Armas c/ Soquetes e Cartões de Tripulação
  registrar({
    op: 'FILL_RECT',
    camada: 'RODAPE',
    x: 0,
    y: L.PAINEL_RODAPE_TOPO_Y,
    largura: 960,
    altura: 540 - L.PAINEL_RODAPE_TOPO_Y,
    cor: '#0d1520',
  });
  registrar({
    op: 'TEXT',
    camada: 'RODAPE_REATOR',
    x: 8,
    y: 468,
    cor: '#38e078',
    texto: `CORAÇÃO ${viewModel.reatorCoracaoBioEletrico.barrasDisponiveis}/${viewModel.reatorCoracaoBioEletrico.barrasTotais} LIVRES`,
  });

  viewModel.caixaSistemas.forEach((sys, idx) => {
    const xSys = 120 + idx * 38;
    registrar({
      op: 'STROKE_RECT',
      camada: `SISTEMA_${sys.sigla}`,
      x: xSys,
      y: 448,
      largura: 34,
      altura: 80,
      cor: sys.instalado ? '#00e5ff' : '#8c96a4',
    });
    registrar({
      op: 'TEXT',
      camada: `SISTEMA_${sys.sigla}`,
      x: xSys + 4,
      y: 520,
      cor: '#ebf8ff',
      texto: `${sys.sigla} ${sys.barrasEnergiaAlocada}/${sys.barrasIntegridade}`,
    });
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
      cor: slot.ocupado ? '#ffb300' : '#8c96a4',
    });
    registrar({
      op: 'TEXT',
      camada: `ARMA_SLOT_${idx}`,
      x: xSlot + 4,
      y: 468,
      cor: '#ebf8ff',
      texto: slot.ocupado ? `${idx + 1}:${slot.chassiId.slice(0, 6)} (${slot.orgaosEnxertados.length}/${slot.soquetesMax})` : `${idx + 1}:VAZIO`,
    });
    if (slot.ocupado) {
      registrar({
        op: 'FILL_RECT',
        camada: `ARMA_RECARGA_${idx}`,
        x: xSlot + 4,
        y: 480,
        largura: Math.min(46, Math.round((slot.progressoRecargaSeg / 10) * 46)),
        altura: 6,
        cor: '#38e078',
      });
      for (let s = 0; s < slot.soquetesMax; s += 1) {
        registrar({
          op: 'STROKE_RECT',
          camada: `ARMA_SOQUETE_${idx}_${s}`,
          x: xSlot + 4 + s * 14,
          y: 494,
          largura: 10,
          altura: 10,
          cor: s < slot.orgaosEnxertados.length ? '#38e078' : '#8c96a4',
        });
      }
    }
  });

  // Cartões de Tripulação no Rodapé Direito (x = 680 + idx * 45, y = 448, largura = 42, altura = 80), alinhados com obterMapaHitboxesNativo
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
      cor: trip.inflado ? '#ffb300' : '#00e5ff',
    });
    registrar({
      op: 'TEXT',
      camada: `TRIPULANTE_CARD_${trip.id}`,
      x: xCard + 2,
      y: 468,
      cor: '#ebf8ff',
      texto: `${trip.especie.slice(0, 3)} ${trip.hpAtual}/${trip.hpMax}`,
    });
  });

  return clonarProfundoCongelado({
    resolucaoNativa: viewModel.resolucaoNativa,
    imageSmoothingEnabled: false,
    gradeCamarasTopoY: baseGradeY,
    paredeEntre2e3AndarY: parede2e3AndarY,
    linhaDaguaY: L.LINHA_DAGUA_Y,
    larguraAsaSubmersaDesenhadaPx: specCarcaca.larguraAsaSubmersaPx,
    totalPrimitivasDesenhadas: comandosDesenho.length,
    spritesDesenhados,
    textosPainelAlvo,
    comandosDesenho,
  });
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

    if (urlLimpa === '/' || urlLimpa === '/cliente.js' || urlLimpa === '/api/estado') {
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
            contextoUiServidor = {
              pausaTaticaAtiva:
                traducao.pausaTaticaAtiva !== undefined
                  ? traducao.pausaTaticaAtiva
                  : Boolean(ctxEntrada.pausaTaticaAtiva),
              slotArmaSelecionado:
                traducao.slotArmaSelecionado !== undefined
                  ? traducao.slotArmaSelecionado
                  : Number(ctxEntrada.slotArmaSelecionado ?? 0),
              tripulanteSelecionadoId:
                traducao.tripulanteSelecionadoId !== undefined
                  ? traducao.tripulanteSelecionadoId
                  : String(ctxEntrada.tripulanteSelecionadoId ?? 'trip-polvo-1'),
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

