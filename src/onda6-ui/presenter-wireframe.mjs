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
import { clonarProfundoCongelado } from '../gdd-parser.mjs';
import { calcularGeometriaLayoutNativo } from '../oraculos-referencia.mjs';
import { calcularPesoTotalNave, calcularSustentacaoFoil } from '../onda1-fisica/tick-hidraulica-foil.mjs';
import { inspecionarSalaAlvo } from '../onda2-combate/tick-tripulacao.mjs';

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

  // 1. Termômetro Vertical de Sustentação (Peso vs Sustentação)
  const pesoTotalKg = nave.pesoTotalKg ?? calcularPesoTotalNave(nave);
  const sustentacaoAtualKg = nave.sustentacaoAtualKg ?? calcularSustentacaoFoil(nave);
  const termometroSustentacao = {
    escalaTopoKg: 300,
    escalaBaseKg: 100,
    pesoTotalKg,
    sustentacaoAtualKg,
    emSobrepeso: pesoTotalKg > sustentacaoAtualKg,
    alertaTouchdownAtivo: !emNoFoil,
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

  // 2. Corte Transversal das 8 Câmaras (2 colunas x 4 andares, 50x35 px nativos cada)
  const camaras = nave.camaras.map((c) => {
    const aguaKg = Number(c.aguaKg ?? 0);
    const nivelAguaPct = Math.round((aguaKg / 12.5) * 1000) / 10;
    const tripulantesPresentes = nave.tripulacao
      .filter((t) => t.localizacao === 'NAVE_JOGADOR' && t.camaraAtualId === c.id && t.hpAtual > 0)
      .map((t) => ({
        id: t.id,
        especie: t.especie,
        hpAtual: t.hpAtual,
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
      coluna: c.coluna,
      andar: c.andar,
      larguraNativaPx: ORCAMENTO_LAYOUT_NATIVO_85C.CAMARA_LARGURA,
      alturaNativaPx: ORCAMENTO_LAYOUT_NATIVO_85C.CAMARA_ALTURA,
      aguaKg,
      nivelAguaPct,
      oxigenioPct: Number(c.oxigenioPct ?? 100),
      brechaAtiva: Boolean(c.brechaAtiva),
      curtoCircuitoAtivo: Boolean(c.curtoCircuitoAtivo),
      valvulaExternaAberta: Boolean(c.valvulaExternaAberta),
      statusValvulaExterna,
      botaoValvulaDesabilitado: travadoHidrost,
      iconeCadeadoVisivel: travadoHidrost,
      barrasNivelMax: Number(c.barrasNivelMax ?? c.nivelMax ?? 0),
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

  return clonarProfundoCongelado({
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
      barreiraBolhas: nave.barreira?.bolhasAtuais ?? 0,
      estadoFisico: nave.estadoFisico,
      rotuloEstado: emNoFoil ? 'NO FOIL' : 'TOUCHDOWN',
      recursos: estado.economia ?? estado.recursos ?? { sucata: 30, biomassa: 15, combustivel: 12, municao: 8 },
    },
    termometroSustentacao,
    camaras,
    caixaSistemas,
    caixaArmas,
    painelAlvo: {
      presente: Boolean(estado.alvoCombate),
      nomeAlvo: estado.alvoCombate?.nome ?? null,
      hpCascoAtual: estado.alvoCombate?.hpCascoAtual ?? 0,
      hpCascoMax: estado.alvoCombate?.hpCascoMax ?? 0,
      blindagemTermicaExternaPts: estado.alvoCombate?.blindagemTermicaExternaPts ?? 0,
      salasInspecionadas,
    },
  });
}
