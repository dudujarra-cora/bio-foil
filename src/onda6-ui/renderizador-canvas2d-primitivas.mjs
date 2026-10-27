/**
 * ONDA 6 — Atlas de Sprites Nativo, Rasterizador de Sprite RGBA, Renderizador de Primitivas Canvas2D e Oráculos de Encaixe 960x540
 * Dono Único (Lei N5): src/onda6-ui/renderizador-canvas2d-primitivas.mjs
 *
 * Responsabilidades:
 *  - `obterAtlasSpritesNativo` & `rasterizarSpriteRgba`: atlas pixel art hi-bit artesanal e hash FNV-1a determinístico;
 *  - `renderizarViewModelNoCanvas2d`: renderizador vetorial/pixel de primitivas 2D na grade nativa 960x540;
 *  - `calcularEncaixeCamaraBioNave` & `calcularEncaixeDorsalArma`: validação matemática cirúrgica de encaixe nas 8 câmaras e 2 slots dorsais.
 */
import { clonarProfundoCongelado } from '../gdd-parser.mjs';
import {
  PALETA_PIXEL_ART_BIOFOIL,
  TOKENS_PALETA_BIBLIA_ARTISTICA_13,
  GRADES_SPRITES_HIBITS_ARTESANAIS,
  CORES_HEX_PALETA,
  ATLAS_ANIMACAO_4FRAMES_BIOFOIL,
  obterQuadroAnimacaoEntidade,
} from './assets-hibit.mjs';
import { GEOMETRIA_ENCAIXE_CAMARAS_960 } from './interpolador-60fps.mjs';

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
  for (let wx = 120; rxCheck(wx); wx += 36) {
    registrar({ op: 'FILL_RECT', camada: 'CRISTA_ONDA', x: wx, y: L.LINHA_DAGUA_Y - 1, largura: 10, altura: 2, cor: T.TXT_PRIMARY });
  }

  function rxCheck(v) {
    return v < 940;
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

  // Casco orgânico vivo hi-bit (28x16 escalado 7x11 = 196x176 px) envolvendo o bloco 2x4 inteiro
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

  // Armas dorsais humanas recuperadas amarradas por tendões musculares vermelhos diretamente sobre o dorso
  viewModel.caixaArmas.forEach((slot, idx) => {
    if (slot.ocupado) {
      const xArmaDorsal = baseGradeX + 6 + idx * 28;
      const yArmaDorsal = baseGradeY - 12;
      const armaAtlas = atlas.armas.find((a) => a.id === slot.chassiId || a.idCatalogo52 === slot.chassiId);
      desenharGradeSprite(armaAtlas.gradePixels, xArmaDorsal, yArmaDorsal, `ARMA_DORSAL_PIXEL_${idx}`);
    }
  });

  // Mastro vertical da quilha biomineralizada + tendões vermelhos na raiz + Asa hidrofólio horizontal submersa
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

    if (cam.coluna === 0) {
      desenharGradeSprite(GRADES_SPRITES_HIBITS_ARTESANAIS.VALVULA_ESFINCTER, xCam + L.CAMARA_LARGURA - 2, yCam + 13, `VALVULA_INTERNA_${cam.id}`);
    }

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

    (cam.invasoresPresentes ?? []).forEach((inv, invIdx) => {
      const invAtlas = atlas.invasores.find((i) => i.id === inv.especie) ?? atlas.invasores[0];
      desenharGradeSprite(invAtlas.gradePixels, xCam + 18 + invIdx * 12, yCam + 12, `INVASOR_PIXEL_${inv.id}`);
    });
  }

  // 5. Inimigo Assentado na Linha d'Água (Regra R2.3: NUNCA voando no ar!)
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

    desenharGradeSprite(gradeInimigo, xInimigo, yTopoInimigo, 'INIMIGO_CORPO_PIXEL', escalaInimigoX, escalaInimigoY);

    const nomeAlvoCurto = String(viewModel.painelAlvo.nomeAlvo ?? 'ALVO').slice(0, 18);
    registrar({
      op: 'TEXT',
      camada: 'PAINEL_ALVO_CABECALHO',
      x: 612,
      y: 232,
      cor: T.ALERT_RED,
      texto: `${nomeAlvoCurto} HP:${viewModel.painelAlvo.hpCascoAtual}/${viewModel.painelAlvo.hpCascoMax} E:${viewModel.painelAlvo.esquivaPct}% B:${viewModel.painelAlvo.barreiraBolhas}`,
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
    const ySala = linAlvo === 0 ? 270 + Math.max(0, linAlvo - 1) * 58 : 334 + Math.max(0, linAlvo - 1) * 58;
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
    const nomeCurtoSala = String(sala.nomeSala ?? `SALA_${sala.salaId}`).slice(0, 8);
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
        ? String(sala.textoTripulacao ?? '').slice(0, 14)
        : ehMonstroAlvo
          ? sala.salaId === 3
            ? 'ESQUIVA 20%'
            : sala.tripulantesVisiveis.length > 0
              ? 'ANTICORPO'
              : 'ÓRGÃO VITAL'
          : String(sala.textoTripulacao ?? '').slice(0, 14);
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

  registrar({ op: 'FILL_RECT', camada: 'LINHA_DAGUA_FRENTE', x: 112, y: L.LINHA_DAGUA_Y, largura: 848, altura: 2, cor: T.FOIL_CYAN });
  if (dy > 0) {
    registrar({ op: 'FILL_RECT', camada: 'ESPUMA_TOUCHDOWN_ESQ', x: baseGradeX - 44, y: L.LINHA_DAGUA_Y - 4, largura: 22, altura: 6, cor: T.TXT_PRIMARY });
    registrar({ op: 'FILL_RECT', camada: 'ESPUMA_TOUCHDOWN_DIR', x: baseGradeX + larguraBlocoCamaras + 16, y: L.LINHA_DAGUA_Y - 4, largura: 22, altura: 6, cor: T.TXT_PRIMARY });
    registrar({ op: 'FILL_RECT', camada: 'EXPLOSAO_RAIZ_QUILHA_TOUCHDOWN', x: centroQuilhaX - 12, y: baseCascoY + 2, largura: 24, altura: 10, cor: T.LIFT_AMBER });
  } else {
    registrar({ op: 'FILL_RECT', camada: 'SPRAY_QUILHA_FOIL', x: centroQuilhaX - 10, y: L.LINHA_DAGUA_Y - 2, largura: 20, altura: 4, cor: T.FOIL_CYAN });
  }

  // 6. Rodapé Completo (y = 440..540)
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
    texto: 'CORAÇÃO BIO',
  });
  const livresExibidos = viewModel.reatorCoracaoBioEletrico.barrasLivres ?? viewModel.reatorCoracaoBioEletrico.barrasDisponiveis;
  registrar({
    op: 'TEXT',
    camada: 'RODAPE_REATOR_LIVRES',
    x: 6,
    y: 466,
    cor: T.TXT_PRIMARY,
    texto: `${livresExibidos}/${viewModel.reatorCoracaoBioEletrico.barrasTotais} LIV`,
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
      const yPip = 500 - b * 8;
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
        altura: 5,
        cor: corPip,
      });
    }
    registrar({
      op: 'TEXT',
      camada: `SISTEMA_${sys.sigla}`,
      x: xSys + 5,
      y: 515,
      cor: T.TXT_PRIMARY,
      texto: sys.sigla,
    });
    registrar({
      op: 'TEXT',
      camada: `SISTEMA_VAL_${sys.sigla}`,
      x: xSys + 5,
      y: 524,
      cor: T.BIO_GREEN,
      texto: `${sys.barrasEnergiaAlocada}/${sys.barrasIntegridade}`,
    });
  });

  const NOMES_CURTOS_ARMAS = Object.freeze({
    EMISSOR_ACUSTICO_I: 'ACUST',
    RAJADA_HIDROPNEUMATICA_II: 'RAJAD',
    CANHAO_ARPAO_CABO: 'ARPAO',
    DISPERSOR_ESTILHACOS: 'FLAK',
    CORTADOR_TERMICO_PLASMA: 'BEAM',
    LANCADOR_TORPEDO_ABISSAL: 'TORP',
    MORTEIRO_ESPOROS: 'MORT',
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
      ? `${idx + 1}:${NOMES_CURTOS_ARMAS[slot.chassiId] ?? slot.chassiId.slice(0, 5)}`
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
      const recMax = Math.max(1, Number(slot.tempoRecargaBaseSeg ?? 10));
      registrar({
        op: 'FILL_RECT',
        camada: `ARMA_RECARGA_${idx}`,
        x: xSlot + 4,
        y: 480,
        largura: Math.min(46, Math.round((slot.progressoRecargaSeg / recMax) * 46)),
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

  const todosTripulantes = viewModel.camaras.flatMap((c) => c.tripulantesPresentes);
  const passoCardWf = todosTripulantes.length <= 5 ? 45 : Math.floor(274 / todosTripulantes.length);
  const largCardWf = passoCardWf - 3;
  todosTripulantes.forEach((trip, idx) => {
    const xCard = 680 + idx * passoCardWf;
    registrar({
      op: 'STROKE_RECT',
      camada: `TRIPULANTE_CARD_${trip.id}`,
      x: xCard,
      y: 448,
      largura: largCardWf,
      altura: 80,
      cor: trip.inflado ? T.LIFT_AMBER : T.FOIL_CYAN,
    });
    registrar({
      op: 'TEXT',
      camada: `TRIPULANTE_CARD_${trip.id}`,
      x: xCard + 3,
      y: 460,
      cor: T.TXT_PRIMARY,
      texto: trip.especie.slice(0, 5),
    });
    registrar({
      op: 'TEXT',
      camada: `TRIPULANTE_CARD_HP_${trip.id}`,
      x: xCard + 3,
      y: 470,
      cor: T.BIO_GREEN,
      texto: `HP${Math.round(trip.hpAtual)}`,
    });
    const idSpriteCard =
      trip.especie === 'BAIACU'
        ? (trip.inflado ? 'BAIACU_INFLADO' : 'BAIACU_NORMAL')
        : trip.especie;
    const itemCardAtlas = atlas.aliados.find((a) => a.id === idSpriteCard);
    desenharGradeSprite(itemCardAtlas.gradePixels, xCard + 9, 482, `TRIPULANTE_CARD_PIXEL_${trip.id}`);
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

/**
 * Calcula e valida o encaixe cirúrgico de 0, 1 ou 2 ocupantes dentro de qualquer uma das 8 câmaras (Grade Nativa 960x540).
 */
export function calcularEncaixeCamaraBioNave(camaraId, ocupantesIds = [], indiceQuadro = 0) {
  const idNum = Number(camaraId);
  const camara = GEOMETRIA_ENCAIXE_CAMARAS_960.CAMARAS[idNum];
  if (!camara) {
    return clonarProfundoCongelado({
      ok: false,
      codigoErro: 'CAMARA_ID_INVALIDO',
      camaraId,
    });
  }
  if (!Array.isArray(ocupantesIds) || ocupantesIds.length > 2) {
    return clonarProfundoCongelado({
      ok: false,
      codigoErro: 'LOTACAO_SLOTS_CAMARA_INVALIDA',
      camaraId: idNum,
    });
  }
  if (typeof indiceQuadro !== 'number' || !Number.isInteger(indiceQuadro) || indiceQuadro < 0) {
    return clonarProfundoCongelado({
      ok: false,
      codigoErro: 'INDICE_QUADRO_INVALIDO',
      camaraId: idNum,
    });
  }

  const dim = GEOMETRIA_ENCAIXE_CAMARAS_960.DIMENSOES_SLOTS_CAMARA;
  const ehAndar4 = camara.andar === 4;
  const modoEncaixe = ocupantesIds.length === 0 ? 'VAZIA' : ocupantesIds.length === 1 ? 'SLOT_UNICO' : 'SLOT_DUPLO';
  const slotsCalculados = [];

  for (let i = 0; i < ocupantesIds.length; i += 1) {
    const entId = String(ocupantesIds[i]);
    const infoQuadro = obterQuadroAnimacaoEntidade(entId, indiceQuadro + i);
    if (!infoQuadro.ok) {
      return infoQuadro;
    }
    const larguraPx = modoEncaixe === 'SLOT_UNICO' ? dim.larguraSlotUnicoPx : dim.larguraSlotDuploPx;
    const alturaBase = modoEncaixe === 'SLOT_UNICO' ? dim.alturaSlotUnicoPx : dim.alturaSlotDuploPx;
    const alturaPx = ehAndar4 ? Math.min(alturaBase, dim.alturaMaxAndar4Px) : alturaBase;
    const x =
      modoEncaixe === 'SLOT_UNICO'
        ? camara.x0 + Math.floor((camara.larguraUtilPx - larguraPx) / 2)
        : camara.x0 + (i === 0 ? 2 : 38);
    const y = camara.y0 + Math.floor((camara.alturaUtilPx - alturaPx) / 2);

    slotsCalculados.push({
      slotIndex: i,
      entidadeId: entId,
      codigoFrame: infoQuadro.codigoFrame,
      indiceQuadro: infoQuadro.indiceQuadro,
      x,
      y,
      larguraPx,
      alturaPx,
      xDireita: x + larguraPx,
      yBase: y + alturaPx,
    });
  }

  const zeroColisaoParedes = slotsCalculados.every(
    (s) => s.x >= camara.x0 && s.xDireita <= camara.x1 && s.y >= camara.y0 && s.yBase <= camara.y1
  );
  const zeroColisaoValvulaCentral = slotsCalculados.every(
    (s) =>
      s.xDireita <= GEOMETRIA_ENCAIXE_CAMARAS_960.VALVULA_CENTRAL_X0 ||
      s.x >= GEOMETRIA_ENCAIXE_CAMARAS_960.VALVULA_CENTRAL_X1
  );
  const zeroColisaoEntreSlots =
    slotsCalculados.length < 2 || slotsCalculados[0].xDireita <= slotsCalculados[1].x;

  return clonarProfundoCongelado({
    ok: zeroColisaoParedes && zeroColisaoValvulaCentral && zeroColisaoEntreSlots,
    camaraId: idNum,
    rotuloCamara: camara.rotulo,
    andar: camara.andar,
    modoEncaixe,
    limpaBulboEstaticoFundo: ocupantesIds.length > 0,
    zeroColisaoRotulo: slotsCalculados.every((s) => s.y >= camara.y0),
    zeroColisaoParedes,
    zeroColisaoValvulaCentral,
    zeroColisaoEntreSlots,
    slots: slotsCalculados,
  });
}

/**
 * Calcula e valida o encaixe dorsal e o estágio de animação (F0..F3 com recuo de -4px no disparo) das 7 armas dorsais.
 */
export function calcularEncaixeDorsalArma(slotDorsalIndex, armaId, progressoCarga0a1 = 0, disparando = false) {
  const slot = GEOMETRIA_ENCAIXE_CAMARAS_960.SLOTS_DORSAIS.find((s) => s.slotIndex === slotDorsalIndex);
  if (!slot) {
    return clonarProfundoCongelado({
      ok: false,
      codigoErro: 'SLOT_DORSAL_INVALIDO',
      slotDorsalIndex,
    });
  }
  const entradaArma = ATLAS_ANIMACAO_4FRAMES_BIOFOIL[String(armaId ?? '')];
  if (!entradaArma || entradaArma.categoria !== 'ARMA_DORSAL') {
    return clonarProfundoCongelado({
      ok: false,
      codigoErro: 'ARMA_DORSAL_INEXISTENTE',
      armaId: String(armaId ?? ''),
    });
  }
  if (typeof progressoCarga0a1 !== 'number' || !Number.isFinite(progressoCarga0a1) || progressoCarga0a1 < 0 || progressoCarga0a1 > 1) {
    return clonarProfundoCongelado({
      ok: false,
      codigoErro: 'PROGRESSO_CARGA_INVALIDO',
    });
  }

  const indiceQuadro = disparando ? 3 : progressoCarga0a1 >= 1 ? 2 : progressoCarga0a1 > 0 ? 1 : 0;
  const quadro = entradaArma.quadros[indiceQuadro];
  const deslocamentoRecuoX = indiceQuadro === 3 ? entradaArma.recuoDisparoPx : 0;
  const xRender = slot.x + deslocamentoRecuoX;
  const yRender = slot.y;
  const zeroColisaoTopoCamaras = yRender + slot.alturaPx <= GEOMETRIA_ENCAIXE_CAMARAS_960.CAMARAS[1].y0;

  return clonarProfundoCongelado({
    ok: zeroColisaoTopoCamaras && deslocamentoRecuoX === (disparando ? -4 : 0),
    slotDorsalIndex,
    slotId: slot.id,
    armaId: entradaArma.id,
    soquetes: entradaArma.soquetes,
    indiceQuadro,
    codigoFrame: quadro.codigoFrame,
    deslocamentoRecuoX,
    x: xRender,
    y: yRender,
    larguraPx: slot.larguraPx,
    alturaPx: slot.alturaPx,
    zeroColisaoTopoCamaras,
  });
}
