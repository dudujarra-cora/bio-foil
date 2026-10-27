/**
 * ONDA 6 — Seletor/Presenter 16:9 (`projetarViewModelWireframe`), Orçamento de Layout Nativo (960x540 -> 1920x1080) e Exportação PNG/Spreads
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
import {
  criarEstadoInicialPartida,
  HP_MAX_POR_ESPECIE,
} from '../onda1-fisica/estado-inicial.mjs';
import {
  calcularPesoTotalNave,
  calcularSustentacaoFoil,
} from '../onda1-fisica/tick-hidraulica-foil.mjs';
import { calcularEsquivaEfetivaNave } from '../onda2-combate/tick-sistemas-armas.mjs';
import {
  inspecionarSalaAlvo,
  PORTAIS_TOPOLOGICOS_BIONAVE,
} from '../onda2-combate/tick-tripulacao.mjs';
import { gerarMapaSetorial } from '../onda4-mapa/gerador-poisson.mjs';
import {
  ARVORES_UPGRADE_56A,
  CATALOGO_LOJA_56B,
  CATALOGO_NAVES_54,
  gerarEstoqueLojaForja,
} from '../onda5-catalogo-chefe/catalogo-naves-itens.mjs';
import {
  COORDENADAS_GRADE_CAMARAS_16A,
  calcularGhostPreviewTermometro,
  obterMapaHitboxesNativo,
} from './hitboxes-layout.mjs';
import { calcularCustoProximoUpgradeNave } from './campanha-completa.mjs';
import {
  possuiSalaSonarAlvo,
  possuiSonarMilitarAtivoAlvo,
  construirEventoResumoCanonico45A,
  construirTelemetriaMapaSetorial,
} from './encontros-eventos-campanha.mjs';
import {
  PALETA_PIXEL_ART_BIOFOIL,
  TOKENS_PALETA_BIBLIA_ARTISTICA_13,
  GRADES_SPRITES_HIBITS_ARTESANAIS,
  ATLAS_ANIMACAO_4FRAMES_BIOFOIL,
  codificarBufferRgbaParaPng,
  obterAssetsConceitoHiBit,
  escalarNearestRgba,
  exportarAtlasHiBitsPngBuffer,
  obterQuadroAnimacaoEntidade,
  exportarPacoteAssets60Fps,
  obterTabelasRasterUnificado,
} from './assets-hibit.mjs';
import {
  GEOMETRIA_ENCAIXE_CAMARAS_960,
  interpolarEstadoVisual60Fps,
} from './interpolador-60fps.mjs';
import {
  obterAtlasSpritesNativo,
  rasterizarSpriteRgba,
  renderizarViewModelNoCanvas2d,
  calcularEncaixeCamaraBioNave,
  calcularEncaixeDorsalArma,
} from './renderizador-canvas2d-primitivas.mjs';
import { rasterizarQuadroRgba960x540 } from './renderizador-canvas.mjs';
import { exportarSpreadAnimacaoSteamPngBufferComHooks } from './vitrine-spreads.mjs';

export {
  PALETA_PIXEL_ART_BIOFOIL,
  TOKENS_PALETA_BIBLIA_ARTISTICA_13,
  GRADES_SPRITES_HIBITS_ARTESANAIS,
  ATLAS_ANIMACAO_4FRAMES_BIOFOIL,
  exportarAtlasHiBitsPngBuffer,
  obterQuadroAnimacaoEntidade,
  exportarPacoteAssets60Fps,
  GEOMETRIA_ENCAIXE_CAMARAS_960,
  interpolarEstadoVisual60Fps,
  obterAtlasSpritesNativo,
  rasterizarSpriteRgba,
  renderizarViewModelNoCanvas2d,
  calcularEncaixeCamaraBioNave,
  calcularEncaixeDorsalArma,
  rasterizarQuadroRgba960x540,
};

const MAPA_SPRITE_OFERTA_LOJA = Object.freeze({
  EMISSOR_ACUSTICO_I: 'EMISSOR_ACUSTICO_I',
  RAJADA_HIDROPNEUMATICA_II: 'RAJADA_HIDROPNEUMATICA_II',
  CANHAO_ARPAO_CABO: 'CANHAO_ARPAO_CABO',
  DISPERSOR_ESTILHACOS: 'DISPERSOR_ESTILHACOS',
  CORTADOR_TERMICO_PLASMA: 'CORTADOR_TERMICO_PLASMA',
  LANCADOR_TORPEDO_ABISSAL: 'LANCADOR_TORPEDO_ABISSAL',
  MORTEIRO_ESPOROS: 'MORTEIRO_ESPOROS',
  GLANDULA_BAIACU: 'GLANDULA_BAIACU',
  ELETRO_PLACA_ARRAIA: 'ELETRO_PLACA_ARRAIA',
  BEXIGA_ALTA_PRESSAO: 'BEXIGA_PRESSAO_ABISSAL',
  BOLSA_TINTA_ABISSAL: 'BOLSA_TINTA_CEGANTE',
  DENTE_LEVIATA: 'DENTE_LEVIATA_SERRILHADO',
  GLANDULA_TERMOFILICA: 'GLANDULA_TERMOFILICA',
  TRIPULANTE_POLVO: 'POLVO',
  TRIPULANTE_ARRAIA: 'ARRAIA',
  TRIPULANTE_BAIACU: 'BAIACU_NORMAL',
  TRIPULANTE_CARANGUEJO: 'CARANGUEJO',
  INSUMO_COMBUSTIVEL: 'CELULA_COMBUSTIVEL_LOJA',
  INSUMO_MUNICAO: 'CAIXA_MUNICAO_LOJA',
});

const NOMES_ITENS_LOJA_CURTOS = Object.freeze({
  EMISSOR_ACUSTICO_I: 'EMISSOR ACÚSTICO I',
  RAJADA_HIDROPNEUMATICA_II: 'RAJADA HIDRO II',
  CANHAO_ARPAO_CABO: 'CANHÃO DE ARPÃO',
  DISPERSOR_ESTILHACOS: 'DISPERSOR ESTILH.',
  CORTADOR_TERMICO_PLASMA: 'CORTADOR TÉRMICO',
  LANCADOR_TORPEDO_ABISSAL: 'TORPEDO ABISSAL',
  MORTEIRO_ESPOROS: 'MORTEIRO ESPOROS',
  GLANDULA_BAIACU: 'GLÂNDULA DE BAIACU',
  ELETRO_PLACA_ARRAIA: 'ELETRO-PLACA VIVA',
  BEXIGA_ALTA_PRESSAO: 'BEXIGA DE PRESSÃO',
  BOLSA_TINTA_ABISSAL: 'BOLSA DE TINTA',
  DENTE_LEVIATA: 'DENTE DE LEVIATÃ',
  GLANDULA_TERMOFILICA: 'GLÂND. TERMOFÍLICA',
  TRIPULANTE_POLVO: 'POLVO ENGENHEIRO',
  TRIPULANTE_ARRAIA: 'ARRAIA ELÉTRICA',
  TRIPULANTE_BAIACU: 'BAIACU ESPINHOSO',
  TRIPULANTE_CARANGUEJO: 'CARANGUEJO GUARDA',
  INSUMO_COMBUSTIVEL: 'CÉLULA COMBUSTÍVEL',
  INSUMO_MUNICAO: 'MUNIÇÃO ABISSAL',
});

const SIGLAS_ARMAS_HANGAR = Object.freeze({
  EMISSOR_ACUSTICO_I: 'ACÚSTICO I',
  RAJADA_HIDROPNEUMATICA_II: 'RAJADA II',
  CANHAO_ARPAO_CABO: 'ARPÃO',
  DISPERSOR_ESTILHACOS: 'FLAK',
  CORTADOR_TERMICO_PLASMA: 'CORTADOR',
  LANCADOR_TORPEDO_ABISSAL: 'TORPEDO',
  MORTEIRO_ESPOROS: 'ESPOROS',
});

const RESUMOS_CURTOS_LOJA = Object.freeze({
  EMISSOR_ACUSTICO_I: '1 ENE | 10kg | PRECISO',
  RAJADA_HIDROPNEUMATICA_II: '2 ENE | 18kg | 3 TIROS',
  CANHAO_ARPAO_CABO: '2 ENE | 15kg | BRECHA',
  DISPERSOR_ESTILHACOS: '2 ENE | 22kg | FLAK x3',
  CORTADOR_TERMICO_PLASMA: '2 ENE | 25kg | FEIXE',
  LANCADOR_TORPEDO_ABISSAL: '2 ENE | 28kg | 3 DANO',
  MORTEIRO_ESPOROS: '1 ENE | 12kg | BIO-BOMBA',
  GLANDULA_BAIACU: '+5kg | VENENO -6HP/s',
  ELETRO_PLACA_ARRAIA: '+5kg | CHOQUE ÍON 6s',
  BEXIGA_ALTA_PRESSAO: '+5kg | +15kg ÁGUA ALVO',
  BOLSA_TINTA_ABISSAL: '+5kg | CEGUEIRA 8s',
  DENTE_LEVIATA: '+5kg | +1 DANO PERF.',
  GLANDULA_TERMOFILICA: '+5kg | FERVURA 8s',
  TRIPULANTE_POLVO: '80 HP | REPARO 2X',
  TRIPULANTE_ARRAIA: '70 HP | +1 REATOR VIVO',
  TRIPULANTE_BAIACU: '150 HP | SELA BRECHA',
  TRIPULANTE_CARANGUEJO: '110 HP | ANFÍBIO SECO',
  INSUMO_COMBUSTIVEL: '+1 SALTO HIDROGRÁFICO',
  INSUMO_MUNICAO: '+1 CARGA TORP./ESPORO',
});

function resolverPrecoVendaCatalogoPorao(item) {
  if (!item || typeof item !== 'object') {
    return { valorVenda: 0, moedaVenda: 'SUCATA' };
  }
  const entradaCat = CATALOGO_LOJA_56B.find((x) => x.id === item.id || x.id === item.chassiId) ?? null;
  if (entradaCat) {
    return {
      valorVenda: Number(entradaCat.valorVenda ?? Math.max(1, Math.floor((entradaCat.precoCompra ?? 10) / 2))),
      moedaVenda: entradaCat.moeda === 'BIOMASSA' ? 'BIOMASSA' : 'SUCATA',
    };
  }
  const ehBiomassa = item.tipo === 'ORGAO' || String(item.id ?? '').startsWith('GLANDULA') || String(item.id ?? '').startsWith('BOLSA');
  return {
    valorVenda: Number(item.valorVenda ?? (ehBiomassa ? 12 : 18)),
    moedaVenda: ehBiomassa ? 'BIOMASSA' : 'SUCATA',
  };
}

function construirLojaResumoDeterministico(estado) {
  const seed = String(estado.meta?.seedPartida ?? 'seed-loja');
  const setor = Math.max(1, Number(estado.mapaSetorial?.setorNumero ?? 1));
  const noId = String(estado.mapaSetorial?.noAtualId ?? 'NO_LOJA');
  const sorteio = gerarEstoqueLojaForja(seed, setor, noId);
  const armasCat = CATALOGO_LOJA_56B.filter((i) => i.categoria === 'ARMA');
  const orgaosCat = CATALOGO_LOJA_56B.filter((i) => i.categoria === 'ORGAO');
  const tripsCat = CATALOGO_LOJA_56B.filter((i) => i.categoria === 'TRIPULANTE');
  const arma2 = armasCat.find((a) => a.id !== sorteio.armaOferta.id) ?? armasCat[0];
  const orgao2 = orgaosCat.find((o) => o.id !== sorteio.orgaoOferta.id) ?? orgaosCat[0];
  const trip1 = tripsCat.find((t) => t.id === sorteio.tripulanteOfertaId) ?? tripsCat[0];
  const trip2 = tripsCat.find((t) => t.id !== trip1.id) ?? tripsCat[1];
  const insComb = CATALOGO_LOJA_56B.find((i) => i.id === 'INSUMO_COMBUSTIVEL');
  const insMun = CATALOGO_LOJA_56B.find((i) => i.id === 'INSUMO_MUNICAO');
  const selecionados = [
    CATALOGO_LOJA_56B.find((i) => i.id === sorteio.armaOferta.id) ?? armasCat[0],
    arma2,
    CATALOGO_LOJA_56B.find((i) => i.id === sorteio.orgaoOferta.id) ?? orgaosCat[0],
    orgao2,
    trip1,
    trip2,
    insComb,
    insMun,
  ].filter(Boolean);

  const precoReparo1Hp = setor <= 3 ? 2 : setor <= 6 ? 3 : 4;
  const compradosUnicos = new Set(estado.lojaAtual?.itensCompradosIds ?? []);
  const contagemInsumos = estado.lojaAtual?.contagemInsumosComprados ?? {};
  return {
    nomeDoca: `RECIFE-FORJA SIMBIÓTICO — SETOR ${setor}`,
    precoReparo1Hp,
    taxaDigestao: '2:1',
    ofertas: selecionados.map((item) => {
      const ehInsumo = item.categoria === 'INSUMO';
      const qtdComp = Number(contagemInsumos[item.id] ?? 0);
      const estoqueRestante = ehInsumo ? Math.max(0, 5 - qtdComp) : (compradosUnicos.has(item.id) ? 0 : 1);
      return {
        id: item.id,
        nomeCurto:
          NOMES_ITENS_LOJA_CURTOS[item.id] ??
          String(item.nome)
            .replace(/^\d+\.\s*/, '')
            .replace(/\s*\(.*?\)/g, '')
            .toUpperCase()
            .slice(0, 19),
        categoria: item.categoria,
        moeda: item.moeda,
        preco: Number(item.precoCompra ?? 10),
        valorVenda: Number(item.valorVenda ?? 0),
        pesoKg: Number(item.pesoKg ?? 0),
        chaveSprite: MAPA_SPRITE_OFERTA_LOJA[item.id] ?? 'BULBO_NEURAL',
        resumoCurto: RESUMOS_CURTOS_LOJA[item.id] ?? `${item.pesoKg ?? 0}kg`,
        estoqueRestante,
        esgotado: estoqueRestante <= 0,
      };
    }),
  };
}

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

const PAPEIS_CURTOS_HANGAR = Object.freeze({
  CARCACA_ALFA: 'EQUILÍBRIO HIDRO-FOIL',
  MANTA_VOLT: 'GUERRA BIO-ELÉTRICA',
  COURACA_LIMIAR: 'ABORDAGEM PESADA',
  SOMBRA_ABISSAL: 'FURTIVA & NEUROTOXINA',
  COLMEIA_VIVA: 'SIMBIOSE & REGENERAÇÃO',
});

const REQUISITOS_CURTOS_HANGAR = Object.freeze({
  CARCACA_ALFA: 'DESBLOQUEADA',
  MANTA_VOLT: 'SETOR 4+ SEM DANO',
  COURACA_LIMIAR: '5 CAPTURAS INTACTAS',
  SOMBRA_ABISSAL: '4 ÓRGÃOS EXTRAÍDOS',
  COLMEIA_VIVA: 'CHEGAR AO SETOR 8',
});

const REATOR_INICIAL_POR_CARCACA = Object.freeze({
  CARCACA_ALFA: 7,
  MANTA_VOLT: 8,
  COURACA_LIMIAR: 6,
  SOMBRA_ABISSAL: 6,
  COLMEIA_VIVA: 7,
});

const NOMES_CURTOS_ARVORES_OFICINA = Object.freeze({
  MASTRO_FOIL: '1. MASTRO DO FOIL',
  ARTILHARIA_DORSAL: '2. ARTILHARIA DORS.',
  PLACAS_BLINDAGEM: '3. BLINDAGEM +15kg',
  GLANDULA_BARREIRA: '4. BARREIRA BOLHA',
  SIFAO_PROPULSAO: '5. SIFÃO PROPULSÃO',
  BOMBA_BRANQUIAL: '6. BOMBA BRANQUIAL',
  CORTEX_NAVEGACAO: '7. CÓRTEX SONAR',
  TUBO_PRESSURIZADO: '8. TUBO ABORDAGEM',
  GLANDULA_TINTA_FURTIVA: '9. TINTA FURTIVA',
  CORACAO_BIO_ELETRICO: '10. REATOR BIO-EL.',
});

const DETALHES_CURTOS_ARVORES_OFICINA = Object.freeze({
  MASTRO_FOIL: '+SUSTENTAÇÃO',
  ARTILHARIA_DORSAL: 'ENERGIA ARMAS',
  PLACAS_BLINDAGEM: '+5HP +15%DEF',
  GLANDULA_BARREIRA: 'ATÉ 4 BOLHAS',
  SIFAO_PROPULSAO: 'ESQUIVA +FOIL',
  BOMBA_BRANQUIAL: 'DRENO RÁPIDO',
  CORTEX_NAVEGACAO: 'VISÃO SALAS',
  TUBO_PRESSURIZADO: 'RECARGA TUBO',
  GLANDULA_TINTA_FURTIVA: 'ESQUIVA +60%',
  CORACAO_BIO_ELETRICO: 'SUC OU BIO',
});

function expandirTripulacaoInicialHangar(mapaTrip) {
  const lista = [];
  for (const esp of ['POLVO', 'ARRAIA', 'BAIACU', 'CARANGUEJO']) {
    const qtd = Number(mapaTrip?.[esp] ?? 0);
    for (let i = 0; i < qtd; i += 1) lista.push(esp);
  }
  return lista.length > 0 ? lista : ['POLVO', 'ARRAIA', 'BAIACU'];
}

function formatarArmasIniciaisHangar(armasIniciais = []) {
  const lista = Array.isArray(armasIniciais) && armasIniciais.length > 0
    ? armasIniciais
    : ['EMISSOR_ACUSTICO_I'];
  if (lista.length === 1) {
    const arma0 = lista[0];
    return NOMES_ITENS_LOJA_CURTOS[arma0] ?? arma0;
  }
  if (lista.every((idArma) => idArma === lista[0])) {
    const sigla0 = SIGLAS_ARMAS_HANGAR[lista[0]] ?? NOMES_ITENS_LOJA_CURTOS[lista[0]] ?? lista[0];
    return `${lista.length}x ${sigla0}`;
  }
  return lista
    .map((idArma) => SIGLAS_ARMAS_HANGAR[idArma] ?? NOMES_ITENS_LOJA_CURTOS[idArma] ?? idArma)
    .join(' + ');
}

function construirHangarResumoDeterministico(estado, idCarcacaPadrao) {
  const perfil = estado.perfilJogador ?? estado.perfilEterno ?? null;
  const desbloqueios = perfil?.carcacasDesbloqueadas ?? { CARCACA_ALFA: true };
  const stats = perfil?.estatisticasGlobais ?? perfil?.estatisticas ?? {};
  const idSel = estado.meta?.carcacaSelecionadaHangar ?? estado.meta?.idArquiteturaHangar ?? idCarcacaPadrao;
  const naves = CATALOGO_NAVES_54.map((arq) => {
    return {
      id: arq.idArquitetura,
      nome: String(arq.nome ?? arq.idArquitetura).replace(/^\d+\.\s*/, '').toUpperCase(),
      papel: PAPEIS_CURTOS_HANGAR[arq.idArquitetura] ?? String(arq.estiloTatico ?? 'BIO-CAÇA').toUpperCase(),
      hpMax: Number(arq.hpCascoMax ?? 30),
      reator: REATOR_INICIAL_POR_CARCACA[arq.idArquitetura] ?? 8,
      pesoBaseKg: Number(arq.pesoTotalInicialKg ?? 225),
      armaInicial: formatarArmasIniciaisHangar(arq.armasIniciais),
      armasIniciaisIds: [...(arq.armasIniciais ?? ['EMISSOR_ACUSTICO_I'])],
      tripulacao: expandirTripulacaoInicialHangar(arq.tripulacaoInicial),
      desbloqueada: arq.idArquitetura === 'CARCACA_ALFA' ? true : Boolean(desbloqueios[arq.idArquitetura]),
      requisito: REQUISITOS_CURTOS_HANGAR[arq.idArquitetura] ?? 'BLOQUEADA',
    };
  });
  return {
    idArquiteturaSelecionada: idSel,
    seedPartida: String(estado.meta?.seedPartida ?? 'biofoil-campanha-0001'),
    temRunSalvaDisponivel: Boolean(estado.meta?.temRunSalvaDisponivel),
    totalRuns: Number(stats.runsIniciadas ?? stats.totalRunsIniciadas ?? 0),
    totalVitorias: Number(stats.vitoriasFinais ?? stats.totalVitorias ?? 0),
    naves,
  };
}

function construirOficinaResumoDeterministico(estado, nave, faseJogoAtual, recursos) {
  const emLoja = faseJogoAtual === 'LOJA';
  const moedaReator = String(
    estado.meta?.moedaPreferencialReator ?? estado.meta?.moedaReatorSelecionada ?? 'SUCATA'
  ).toUpperCase() === 'BIOMASSA'
    ? 'BIOMASSA'
    : 'SUCATA';
  const sucSaldo = Number(recursos?.sucata ?? 0);
  const bioSaldo = Number(recursos?.biomassa ?? 0);
  const arvores = ARVORES_UPGRADE_56A.map((arv) => {
    const info = calcularCustoProximoUpgradeNave(nave, arv.id, emLoja);
    const moedaEf = info.moeda === 'FLEXIVEL' ? moedaReator : (info.moeda ?? arv.moeda ?? 'SUCATA');
    const noMaximo = info.motivoBloqueio === 'NIVEL_MAXIMO_ATINGIDO' || info.custoProximo === null;
    const saldoDisp = moedaEf === 'BIOMASSA' ? bioSaldo : sucSaldo;
    const podeComprar = !noMaximo && Boolean(info.disponivel) && saldoDisp >= Number(info.custoProximo ?? 999999);
    const detalheCurto =
      !noMaximo && info.motivoBloqueio === 'EXIGE_RECIFE_FORJA_LOJA'
        ? 'SÓ NA LOJA!'
        : (DETALHES_CURTOS_ARVORES_OFICINA[arv.id] ?? '');
    return {
      idArvore: arv.id,
      nomeCurto: NOMES_CURTOS_ARVORES_OFICINA[arv.id] ?? arv.id,
      nivelAtual: Number(info.nivelAtual ?? 0),
      nivelMax: Number(info.nivelMaximo ?? arv.barrasMax ?? 4),
      custoProximo: info.custoProximo,
      moeda: moedaEf,
      noMaximo,
      podeComprar,
      detalheCurto,
    };
  });
  const poraoBruto = nave.poraoCarga ?? estado.poraoCarga ?? [];
  const porao = [0, 1, 2, 3].map((idx) => {
    const slot = poraoBruto[idx];
    const item = slot && typeof slot === 'object' && 'item' in slot ? slot.item : slot;
    if (!item) return null;
    const infoVenda = resolverPrecoVendaCatalogoPorao(item);
    return {
      id: item.id,
      tipo: item.tipo ?? 'ORGAO',
      nome: item.nome ?? NOMES_ITENS_LOJA_CURTOS[item.id] ?? item.id,
      pesoKg: Number(item.pesoKg ?? (item.tipo === 'ARMA' ? 15 : 5)),
      ocupado: true,
      valorVenda: infoVenda.valorVenda,
      moedaVenda: infoVenda.moedaVenda,
    };
  });
  return {
    moedaReator,
    confirmarAbandonoPendente: Boolean(estado.meta?.confirmarAbandonoPendente),
    arvores,
    porao,
  };
}

function construirSaqueResumoDeterministico(estado) {
  const sq = estado.meta?.saquePendente ?? estado.saquePendente ?? null;
  if (!sq) return null;
  const itemBruto = sq.itemDropado ?? sq.itemRecuperado ?? sq.itemRecuperadoPorao ?? null;
  const itemDropado = itemBruto
    ? typeof itemBruto === 'object'
      ? {
          id: itemBruto.id,
          tipo: itemBruto.tipo ?? 'ORGAO',
          nome: itemBruto.nome ?? NOMES_ITENS_LOJA_CURTOS[itemBruto.id] ?? itemBruto.id,
          pesoKg: Number(itemBruto.pesoKg ?? (itemBruto.tipo === 'ARMA' ? 15 : 5)),
        }
      : {
          id: String(itemBruto),
          tipo: 'ORGAO',
          nome: NOMES_ITENS_LOJA_CURTOS[String(itemBruto)] ?? String(itemBruto),
          pesoKg: 5,
        }
    : null;
  return {
    modalidadeVitoria: String(sq.modalidadeVitoria ?? sq.modalidade ?? 'DESTRUICAO_BRUTA'),
    inimigoNome: String(sq.inimigoNome ?? sq.alvoNome ?? 'ALVO HOSTIL'),
    sucataGanha: Number(sq.sucataGanha ?? sq.sucata ?? 0),
    biomassaGanha: Number(sq.biomassaGanha ?? sq.biomassa ?? 0),
    combustivelGanho: Number(sq.combustivelGanho ?? sq.combustivel ?? 0),
    municaoGanha: Number(sq.municaoGanha ?? sq.municao ?? 0),
    itemDropado,
    abordadoresResgatados: Number(
      sq.abordadoresResgatados ??
        sq.tripulantesResgatadosAbordagem ??
        (Array.isArray(sq.animaisResgatadosIds) ? sq.animaisResgatadosIds.length : 0)
    ),
  };
}

function construirDesfechoEventoResumoDeterministico(estado) {
  const df = estado.meta?.desfechoEventoPendente ?? estado.meta?.ultimoResultadoEvento ?? null;
  if (!df) return null;
  const opcaoEscolhida = String(df.opcaoEscolhida ?? df.opcao ?? 'A');
  const deltaSucata = Number(df.deltaSucata ?? df.ganhoSucata ?? 0);
  const deltaBiomassa = Number(df.deltaBiomassa ?? df.ganhoBiomassa ?? 0);
  const deltaHpCasco = Number(
    df.deltaHpCasco !== undefined
      ? df.deltaHpCasco
      : Number(df.reparoCascoHp ?? 0) - Number(df.danoCascoHp ?? 0)
  );
  const deltaCombustivel = Number(df.deltaCombustivel ?? df.ganhoCombustivel ?? 0);
  const deltaMunicao = Number(df.deltaMunicao ?? df.ganhoMunicao ?? 0);
  const iniciouCombate =
    Boolean(df.iniciouCombate ?? df.combateObrigatorio) || estado.meta?.faseJogo === 'COMBATE';
  const titulo =
    df.titulo ??
    (iniciouCombate
      ? `OPÇÃO [${opcaoEscolhida}] — CONTATO HOSTIL IMEDIATO!`
      : deltaHpCasco < 0
        ? `OPÇÃO [${opcaoEscolhida}] — EXTRAÇÃO COM AVARIA NO CASCO`
        : deltaSucata > 0 || deltaBiomassa > 0 || deltaHpCasco > 0
          ? `OPÇÃO [${opcaoEscolhida}] — MANOBRA CONCLUÍDA COM ÊXITO`
          : `OPÇÃO [${opcaoEscolhida}] — ROTA MANTIDA EM SILÊNCIO`);
  return {
    idEvento: String(df.idEvento ?? 'EVENTO_MARITIMO'),
    opcaoEscolhida,
    titulo,
    narrativaPrincipal: df.narrativaPrincipal ?? null,
    bonusEspecialTexto: df.bonusEspecialTexto ?? null,
    novoTripulanteEspecie: df.novoTripulanteEspecie ?? null,
    itemRecuperadoNome: df.itemRecuperadoNome ?? null,
    blueOptionAtivada: Boolean(df.blueOptionAtivada ?? opcaoEscolhida === 'B'),
    deltaSucata,
    deltaBiomassa,
    deltaHpCasco,
    deltaCombustivel,
    deltaMunicao,
    iniciouCombate,
    proximaFase: iniciouCombate ? 'COMBATE' : 'MAPA',
  };
}

function construirFimDeRunResumoDeterministico(estado, recursos) {
  const desfecho = estado.meta?.desfechoRun ?? null;
  const met = estado.meta?.metricasRun ?? {};
  const vitoria =
    desfecho === 'VITORIA_CAMPANHA' ||
    Boolean(met.derrotouDragaFase3) ||
    (desfecho === null && Number(estado.naveJogador?.hpCascoAtual ?? 0) > 0 && estado.meta?.faseJogo === 'FIM_DE_RUN');
  const motivoEncerramento = vitoria
    ? 'DRAGA CONTINENTAL FASE 3 DESTRUÍDA!'
    : desfecho === 'PERMADEATH_TRIPULACAO_EXTINTA'
      ? 'TRIPULAÇÃO SIMBIÓTICA EXTINTA EM COMBATE'
      : 'CASCO ROMPIDO A 0 HP — BIO-NAVE PERDIDA';
  const antesRun = estado.meta?.carcacasDesbloqueadasAntesDaRun ?? null;
  const novosDesbloqueios = Array.isArray(met.novosDesbloqueiosNestaRun)
    ? met.novosDesbloqueiosNestaRun
    : antesRun
      ? Object.entries(estado.perfilJogador?.carcacasDesbloqueadas ?? {})
          .filter(([idC, ok]) => ok && idC !== 'CARCACA_ALFA' && !antesRun[idC])
          .map(([idC]) => idC)
      : [];
  return {
    vitoria,
    motivoEncerramento,
    setorAlcancado: Number(met.setorMaximoAlcancado ?? estado.mapaSetorial?.setorNumero ?? estado.meta?.setorAtual ?? 1),
    vitoriasCombate: Number(met.combatesVencidos ?? 0),
    capturasIntactas: Number(met.barcosCapturadosIntactosNaRun ?? 0),
    extracoesCirurgicas: Number(met.orgaosIntactosExtraidosNaRun ?? 0),
    sucataColetada: Number(met.sucataAcumuladaTotal ?? recursos?.sucata ?? 0),
    biomassaColetada: Number(met.biomassaAcumuladaTotal ?? recursos?.biomassa ?? 0),
    novosDesbloqueios,
  };
}

/**
 * Assinatura Pura N1 #5: Projeta o GameState num ViewModel 16:9 imutável para renderização na grade nativa 960x540 (upscale 2x -> 1920x1080).
 */
export function projetarViewModelWireframe(estado, opcoesDebug = {}) {
  const nave = estado?.naveJogador ?? criarEstadoInicialPartida('seed-fallback', 'CARCACA_ALFA').naveJogador;
  const emNoFoil = nave.estadoFisico === '1_NO_FOIL';
  const desabilitarTravaValvulaMutacao = opcoesDebug.desabilitarTravaValvulaTouchdown === true;
  const travadoHidrost = !desabilitarTravaValvulaMutacao && !emNoFoil;

  const geometriaBase = calcularGeometriaLayoutNativo(ORCAMENTO_LAYOUT_NATIVO_85C);
  const deslocamentoVerticalPx = emNoFoil ? 0 : ORCAMENTO_LAYOUT_NATIVO_85C.QUEDA_TOUCHDOWN;

  // 1. Termômetro Vertical de Sustentação (Peso vs Sustentação + GD-2 Limiar de Cavitação 62.5 kg + Ghost Preview Seção 2.1)
  const pesoTotalKg = calcularPesoTotalNave(nave);
  const sustentacaoAtualKg = calcularSustentacaoFoil(nave);
  const aguaTotalKg =
    Math.round((nave.camaras ?? []).reduce((acc, c) => acc + Number(c.aguaKg ?? 0), 0) * 100) / 100;
  const idsGhostPreview = [
    'SISTEMA_SIF',
    'BTN_MERGULHO_TATICO',
    'BTN_DRENAR_SEGURO',
    'BTN_DRENAR_TUDO',
    'VALVULA_CAMARA_1',
    'VALVULA_CAMARA_2',
    'VALVULA_CAMARA_3',
    'VALVULA_CAMARA_4',
    'VALVULA_CAMARA_5',
    'VALVULA_CAMARA_6',
    'VALVULA_CAMARA_7',
    'VALVULA_CAMARA_8',
  ];
  const mapaGhostPorHitbox = {};
  for (const idGhost of idsGhostPreview) {
    mapaGhostPorHitbox[idGhost] = calcularGhostPreviewTermometro(estado, idGhost, opcoesDebug);
  }
  const ghostPreview =
    opcoesDebug.idHitboxHover && mapaGhostPorHitbox[opcoesDebug.idHitboxHover]
      ? mapaGhostPorHitbox[opcoesDebug.idHitboxHover]
      : calcularGhostPreviewTermometro(estado, opcoesDebug.idHitboxHover ?? null, opcoesDebug);

  const termometroSustentacao = {
    escalaTopoKg: 300,
    escalaBaseKg: 100,
    pesoTotalKg,
    sustentacaoAtualKg,
    aguaTotalKg,
    limiarCavitacaoKg: 62.5,
    emCavitacao: aguaTotalKg < 62.5,
    drenoSeguroAtivo: Boolean(nave.drenoSeguroAtivo),
    emSobrepeso: pesoTotalKg > sustentacaoAtualKg,
    alertaTouchdownAtivo: !emNoFoil,
    ghostPreview,
    mapaGhostPorHitbox,
    botaoMergulhoTatico: {
      rotulo: 'MERGULHO TÁTICO',
      ativo: Boolean(nave.mergulhoTaticoAtivo),
    },
    botaoDrenarSeguro: {
      atalho: '[D] DRENO SEGURO',
      travadoTouchdown: travadoHidrost,
      desabilitado: travadoHidrost || aguaTotalKg <= 62.5,
      limiarCavitacaoKg: 62.5,
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
    const invasoresVivosCamara = (nave.invasoresInimigos ?? nave.invasores ?? []).filter(
      (inv) => inv.camaraAtualId === c.id && inv.hpAtual > 0
    );
    const barrasNivelMax = Number(c.barrasNivelMax ?? c.nivelMaxBarras ?? c.nivelMax ?? 0);
    const barrasIntegridade = Number(c.barrasIntegridade ?? c.integridade ?? 0);
    const salaPrecisaReparo = Boolean(c.brechaAtiva || c.arrombouCasco) || Number(c.rombosCasco ?? 0) > 0 || barrasIntegridade < barrasNivelMax;

    const tripulantesPresentes = nave.tripulacao
      .filter((t) => t.localizacao === 'NAVE_JOGADOR' && t.camaraAtualId === c.id && t.hpAtual > 0)
      .map((t) => {
        const emNado = Boolean(t.camaraDestinoId && t.camaraDestinoId !== c.id);
        const emCombate = !emNado && invasoresVivosCamara.length > 0 && !t.inflado;
        const reparando = !emCombate && !emNado && !t.inflado && t.especie === 'POLVO' && salaPrecisaReparo;
        return {
          id: t.id,
          especie: t.especie,
          hpAtual: t.hpAtual,
          hpMax: t.hpMax ?? 100,
          inflado: Boolean(t.inflado),
          acopladoBulbo: Boolean(t.acopladoBulbo),
          camaraDestinoId: t.camaraDestinoId ?? null,
          proximaCamaraId: t.proximaCamaraId ?? null,
          rotaAtiva: Array.isArray(t.rotaAtiva) ? t.rotaAtiva : [],
          progressoNadoSeg: Number(t.progressoNadoSeg ?? 0),
          progressoSalto0a1: Number(t.progressoSalto0a1 ?? 0),
          ultimoPortalAtravessado: t.ultimoPortalAtravessado ?? null,
          interceptadoPorInvasor: Boolean(t.interceptadoPorInvasor),
          rastejandoNoSeco: aguaKg === 0 && t.especie !== 'CARANGUEJO',
          emCombate,
          reparando,
        };
      });

    const invasoresPresentes = invasoresVivosCamara.map((inv) => {
      const emMarcha = Boolean(
        (inv.proximaCamaraId && inv.proximaCamaraId !== c.id) ||
          (inv.camaraDestinoId && inv.camaraDestinoId !== c.id)
      );
      const emCombate = !emMarcha && tripulantesPresentes.some((t) => !t.inflado && !(t.camaraDestinoId && t.camaraDestinoId !== c.id));
      return {
        id: inv.id,
        especie: inv.especie ?? 'MARINHEIRO',
        hpAtual: inv.hpAtual,
        hpMax: inv.hpMax ?? 100,
        camaraDestinoId: inv.camaraDestinoId ?? null,
        proximaCamaraId: inv.proximaCamaraId ?? null,
        progressoMarchaSeg: Number(inv.progressoNadoSeg ?? inv.progressoMarchaSeg ?? 0),
        progressoSalto0a1: Number(inv.progressoSalto0a1 ?? 0),
        emCombate,
        sabotando: !emCombate && !emMarcha && barrasIntegridade > 0,
      };
    });

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
      barrasNivelMax,
      barrasIntegridade,
      barrasEnergiaAlocada: Number(c.barrasEnergiaAlocada ?? c.energiaAlocada ?? 0),
      barrasIonizadas: Number(c.barrasIonizadas ?? c.danoIonizadas ?? c.danoIonizado ?? 0),
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
      barrasIonizadas: cam?.barrasIonizadas ?? 0,
    };
  });

  // 4. Caixa de Armas: estritamente 4 Slots Ativos (0..3), jamais misturando Tubo Pressurizado (MUT-O6-02)
  const slotsBase = [0, 1, 2, 3].map((slotIdx) => {
    const entrada = (nave.armasAtivas ?? [])[slotIdx];
    const armaObj = entrada?.arma !== undefined ? entrada.arma : entrada ?? null;
    const modoDisparoManual = armaObj
      ? armaObj.modoDisparoManual !== undefined
        ? armaObj.modoDisparoManual === true
        : armaObj.modoDisparo !== undefined
          ? armaObj.modoDisparo === 'MANUAL'
          : nave.modoSalvaGlobal === 'MANUAL'
      : false;
    const energiaCusto = armaObj?.energiaCusto ?? armaObj?.energia ?? 0;
    const energiaAlocada = armaObj
      ? Number(armaObj.energiaAlocada !== undefined ? armaObj.energiaAlocada : energiaCusto)
      : 0;
    return {
      slotIndex: slotIdx,
      ocupado: Boolean(armaObj),
      tipoItem: armaObj ? 'ARMA_DORSAL' : 'VAZIO',
      chassiId: armaObj?.chassiId ?? armaObj?.id ?? null,
      soquetesMax: armaObj?.soquetesMax ?? armaObj?.soquetes ?? 0,
      orgaosEnxertados: armaObj?.orgaosEnxertados ?? [],
      energiaCusto,
      energiaAlocada,
      energizada: Boolean(armaObj) && energiaAlocada >= Math.max(1, energiaCusto),
      progressoRecargaSeg: armaObj?.progressoRecargaSeg ?? 0,
      tempoRecargaBaseSeg: armaObj?.tempoRecargaBaseSeg ?? armaObj?.recargaSeg ?? 9,
      salaAlvoId: armaObj?.salaAlvoId ?? null,
      trincaSalasBeam: armaObj?.trincaSalasBeam ?? null,
      modoDisparoManual,
      disparoManualAutorizado: Boolean(armaObj?.disparoManualAutorizado),
      modoDisparo: modoDisparoManual ? 'MANUAL' : 'AUTOMATICO',
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
    const bInt = Number(s.integridadeAtual ?? s.integridade ?? s.barrasIntegridade ?? 1);
    const bMax = Number(s.integridadeMax ?? s.barrasMax ?? 1);
    const metadadosBaseSala = {
      salaId: s.id,
      nomeSala: s.nome ?? `SALA_${s.id}`,
      submersa: Boolean(s.submersa),
      barrasIntegridade: bInt,
      barrasMax: bMax,
      integridade: bInt,
      integridadeMax: bMax,
      aguaKg: Number(s.aguaKg ?? 0),
      paralisiaIonSeg: Number(s.paralisiaIonSeg ?? 0),
      cegoTintaSeg: Number(s.cegoTintaSeg ?? 0),
    };
    if (inspecao.canalPermissao !== 'VISIVEL') {
      if (opcoesDebug.vazarZeroTripulantesQuandoCegoL3 === true) {
        return {
          ...metadadosBaseSala,
          canalPermissao: inspecao.canalPermissao,
          status: inspecao.status,
          marcadorExplicito: inspecao.marcadorExplicito,
          tripulantesVisiveis: [],
          contagemTripulantes: 0,
          textoTripulacao: '0 tripulantes',
        };
      }
      return {
        ...metadadosBaseSala,
        canalPermissao: inspecao.canalPermissao,
        status: inspecao.status,
        marcadorExplicito: inspecao.marcadorExplicito,
        tripulantesVisiveis: undefined,
        contagemTripulantes: undefined,
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
      contagemTripulantes: qtd,
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

  const camarasOcupadasComAgua = camaras.filter((c) => c.aguaKg > 0 && c.tripulantesPresentes.length > 0);
  const menorOxigenioOcupadoPct =
    camarasOcupadasComAgua.length > 0
      ? Math.round(Math.min(...camarasOcupadasComAgua.map((c) => c.oxigenioPct)) * 10) / 10
      : 100;

  const classeAlvoAtu = estado.alvoCombate?.classeAlvo ?? estado.alvoCombate?.classeInimigo ?? null;
  const recPrimInim = classeAlvoAtu === 'MONSTRO_MARINHO' ? 8.0 : classeAlvoAtu === 'CHEFE_DRAGA' ? 9.5 : 10.1;
  const recSecInim = classeAlvoAtu === 'MONSTRO_MARINHO' ? 11.5 : classeAlvoAtu === 'CHEFE_DRAGA' ? 12.5 : 14.0;
  const faseJogoAtual = estado.meta?.faseJogo ?? estado.faseJogo ?? 'COMBATE';

  const recursosAtuais = estado.economia ?? estado.recursos ?? { sucata: 30, biomassa: 15, combustivel: 12, municao: 8 };
  const modalCampanhaAtivo = estado.meta?.modalCampanhaAtivo ?? null;
  const modoCampanhaCompleta = Boolean(estado.meta?.modoCampanhaCompleta);
  const setorAtualVm = Number(estado.mapaSetorial?.setorNumero ?? estado.meta?.setorAtual ?? 1);
  const nomeBiomaVm = String(
    estado.mapaSetorial?.nomeBioma ??
      estado.meta?.nomeBioma ??
      (setorAtualVm === 8 ? 'FOSSA DA DRAGA CONTINENTAL' : 'ÁGUAS COSTEIRAS RASAS')
  );
  const arquetipoAlvoId =
    estado.alvoCombate?.arquetipoId ??
    (typeof estado.alvoCombate?.idInimigo === 'string'
      ? estado.alvoCombate.idInimigo.replace(/_S\d+$/i, '')
      : null);
  const camTuboAb = camaras.find((c) => c.id === 7);
  const tuboInstaladoAb = (camTuboAb?.barrasIntegridade ?? 0) >= 1;
  const energiaEfetivaTubo = Math.max(
    0,
    Number(camTuboAb?.barrasEnergiaAlocada ?? 0) - Number(camTuboAb?.barrasIonizadas ?? 0)
  );
  const recargaTuboBruta = nave.recargaTuboAbordagemSeg ?? nave.recargaTuboPressurizadoSeg ?? 0;
  const recargaTuboRestSeg = Math.round(Math.max(0, Number(recargaTuboBruta)) * 10) / 10;
  const tripProntosTuboIds = (camTuboAb?.tripulantesPresentes ?? [])
    .filter((t) => !t.inflado)
    .slice(0, 2)
    .map((t) => t.id);
  const blindagemAlvoAtiva = Number(estado.alvoCombate?.blindagemTermicaExternaPts ?? 0) > 0;
  const salaAlvoPadraoAbordagem =
    caixaArmas.find((s) => s.ocupado && s.salaAlvoId)?.salaAlvoId ??
    salasInspecionadas[0]?.salaId ??
    1;
  const statusCurtoAbordagem = !tuboInstaladoAb
    ? 'S/ TUBO'
    : blindagemAlvoAtiva
      ? 'BLINDAGEM'
      : energiaEfetivaTubo < 1
        ? '0 ENERGIA'
        : recargaTuboRestSeg > 0
          ? 'RECARGA'
          : tripProntosTuboIds.length === 0
            ? 'S/ TRIP C7'
            : 'PRONTO';
  const resumoAbordagem = {
    tuboInstalado: tuboInstaladoAb,
    energiaEfetivaTubo,
    tuboPronto: Boolean(
      tuboInstaladoAb &&
        !blindagemAlvoAtiva &&
        energiaEfetivaTubo >= 1 &&
        recargaTuboRestSeg <= 0 &&
        tripProntosTuboIds.length > 0 &&
        estado.alvoCombate &&
        estado.alvoCombate.ativo !== false
    ),
    recargaRestanteSeg: recargaTuboRestSeg,
    tripulantesProntosTuboIds: tripProntosTuboIds,
    salaAlvoPadraoId: salaAlvoPadraoAbordagem,
    statusCurto: statusCurtoAbordagem,
  };
  const tripulacaoAbordagemAliada = (nave.tripulacao ?? [])
    .filter((t) => t.localizacao === 'BORDO_INIMIGO' && t.hpAtual > 0)
    .map((t) => {
      const salaInimigaNum = Number(t.salaInimigaId ?? t.salaAlvoId ?? t.camaraAlvoInimigoId ?? 1);
      const salaDestNum =
        t.salaInimigaDestinoId && Number(t.salaInimigaDestinoId) !== salaInimigaNum
          ? Number(t.salaInimigaDestinoId)
          : null;
      return {
        id: t.id,
        especie: t.especie,
        hpAtual: t.hpAtual,
        hpMax: t.hpMax ?? HP_MAX_POR_ESPECIE[t.especie] ?? 100,
        salaInimigaId: salaInimigaNum,
        salaInimigaDestinoId: salaDestNum,
        proximaSalaInimigaId: t.proximaSalaInimigaId ?? null,
        emTravessia: Boolean(t.proximaSalaInimigaId),
        progressoTravessia0a1: Math.min(1, Math.max(0, Number(t.progressoTravessiaInimigaSeg ?? 0) / 1.25)),
        salaAlvoId: salaInimigaNum,
        camaraAlvoInimigoId: salaInimigaNum,
      };
    });

  return clonarProfundoCongelado({
    idCarcaca,
    idArquitetura: idCarcaca,
    faseJogo: faseJogoAtual,
    modoCampanhaCompleta,
    modalCampanhaAtivo,
    audioMutado: Boolean(estado.meta?.audioMutado),
    setorAtual: setorAtualVm,
    nomeBioma: nomeBiomaVm,
    ultimoAvisoCampanha: estado.meta?.ultimoAvisoCampanha ?? null,
    nivelBlindagem: Number(nave.nivelBlindagem ?? 0),
    modoSalvaGlobal: String(nave.modoSalvaGlobal ?? 'AUTOMATICO'),
    arquetipoAlvoId,
    tickAtual: Number(estado.meta?.tickAtual ?? 0),
    tempoCombateSeg: Number(estado.meta?.tempoCombateSeg ?? 0),
    idHitboxHover: opcoesDebug.idHitboxHover ?? null,
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
    telemetriaBioReflexo: {
      menorOxigenioOcupadoPct,
      alertaPreHipoxia: menorOxigenioOcupadoPct < 55,
      alertaHipoxiaPrevia: menorOxigenioOcupadoPct < 55,
      reflexoBranquialUsado: Boolean(nave.reflexoBranquialUsado),
      alertaReflexoBranquialSeg: Number(nave.alertaReflexoBranquialSeg ?? estado.reflexoBranquialBannerSeg ?? 0),
      reflexoRecenteAtivo: Number(nave.alertaReflexoBranquialSeg ?? estado.reflexoBranquialBannerSeg ?? 0) > 0,
      sistemaEmprestadoReflexoId: nave.sistemaEmprestadoReflexoId ?? null,
      furtividadeAtivaSeg: Number(nave.furtividadeAtivaSeg ?? 0),
      pulsoEnzimasAtivoSeg: Number(nave.pulsoEnzimasAtivoSeg ?? 0),
    },
    reatorCoracaoBioEletrico: {
      barrasTotais: barrasTotaisReator,
      barrasDisponiveis: Number(nave.reator?.barrasDisponiveis ?? nave.energiaLivre ?? 0),
      barrasLivres: barrasLivresReator,
    },
    termometroSustentacao,
    portaisTopologicos: PORTAIS_TOPOLOGICOS_BIONAVE,
    camaras,
    caixaSistemas,
    caixaArmas,
    telemetriaContragolpe: {
      minaMagneticaAtivaSeg: Number(estado.alvoCombate?.minaMagneticaAtivaSeg ?? estado.alvoCombate?.minaMagneticaSuperficieSeg ?? 0),
      minaMagneticaSuperficieSeg: Number(estado.alvoCombate?.minaMagneticaAtivaSeg ?? estado.alvoCombate?.minaMagneticaSuperficieSeg ?? 0),
      protocoloCortaFogoUsado: Boolean(estado.alvoCombate?.protocoloCortaFogoUsado),
      carapacaReflexaSeg: Number(estado.alvoCombate?.carapacaReflexaSeg ?? estado.alvoCombate?.carapacaGanglioSeg ?? 0),
      carapacaGanglioSeg: Number(estado.alvoCombate?.carapacaReflexaSeg ?? estado.alvoCombate?.carapacaGanglioSeg ?? 0),
      escudoQuitinaGanglioPts: Number(estado.alvoCombate?.escudoQuitinaGanglioPts ?? 0),
      apertoQuilhaSeg: Number(estado.alvoCombate?.apertoQuilhaSeg ?? 0),
      sobrecargaFaseUsada: estado.alvoCombate?.sobrecargaFaseUsada ?? null,
      progressoAtaquePrimario0a1: Math.max(
        0,
        Math.min(1, Number(estado.alvoCombate?.progressoAtaquePrimarioSeg ?? 0) / recPrimInim)
      ),
      progressoAtaqueSecundario0a1: Math.max(
        0,
        Math.min(1, Number(estado.alvoCombate?.progressoAtaqueSecundarioSeg ?? 0) / recSecInim)
      ),
    },
    painelAlvo: {
      presente: Boolean(estado.alvoCombate && estado.alvoCombate.ativo !== false),
      nomeAlvo: estado.alvoCombate?.nome ?? estado.alvoCombate?.idInimigo ?? null,
      arquetipoId: arquetipoAlvoId,
      arquetipoAlvoId,
      classeAlvo: classeAlvoAtu,
      faseChefe: estado.alvoCombate?.faseChefe ?? null,
      temSalaSonar: possuiSalaSonarAlvo(estado.alvoCombate),
      sonarMilitarAtivo: Boolean(
        estado.alvoCombate?.sonarMilitarAtivo !== undefined
          ? estado.alvoCombate.sonarMilitarAtivo
          : possuiSonarMilitarAtivoAlvo(estado.alvoCombate)
      ),
      alarmeFervuraAtivoSeg: Number(estado.alvoCombate?.alarmeFervuraAtivoSeg ?? estado.alvoCombate?.alarmeFervuraSeg ?? 0),
      fervuraAtivaSeg: Number(estado.alvoCombate?.fervuraAtivaSeg ?? 0),
      hpCascoAtual: estado.alvoCombate?.hpCascoAtual ?? 0,
      hpCascoMax: estado.alvoCombate?.hpCascoMax ?? 0,
      barreiraBolhas: Number(estado.alvoCombate?.camadasBarreiraAtivas ?? estado.alvoCombate?.barreiraBolhasAtual ?? 0),
      esquivaPct: Number(estado.alvoCombate?.esquivaEfetivaPct ?? estado.alvoCombate?.esquivaBasePct ?? 0),
      blindagemTermicaExternaPts: estado.alvoCombate?.blindagemTermicaExternaPts ?? 0,
      telemetriaContragolpe: {
        minaMagneticaAtivaSeg: Number(estado.alvoCombate?.minaMagneticaAtivaSeg ?? estado.alvoCombate?.minaMagneticaSuperficieSeg ?? 0),
        protocoloCortaFogoUsado: Boolean(estado.alvoCombate?.protocoloCortaFogoUsado),
        carapacaReflexaSeg: Number(estado.alvoCombate?.carapacaReflexaSeg ?? estado.alvoCombate?.carapacaGanglioSeg ?? 0),
        escudoQuitinaGanglioPts: Number(estado.alvoCombate?.escudoQuitinaGanglioPts ?? 0),
        apertoQuilhaSeg: Number(estado.alvoCombate?.apertoQuilhaSeg ?? 0),
        sobrecargaFaseUsada: estado.alvoCombate?.sobrecargaFaseUsada ?? null,
        progressoAtaquePrimario0a1: Math.max(
          0,
          Math.min(1, Number(estado.alvoCombate?.progressoAtaquePrimarioSeg ?? 0) / recPrimInim)
        ),
        progressoAtaqueSecundario0a1: Math.max(
          0,
          Math.min(1, Number(estado.alvoCombate?.progressoAtaqueSecundarioSeg ?? 0) / recSecInim)
        ),
      },
      salasInspecionadas,
    },
    resumoAbordagem,
    tripulacaoAbordagemAliada,
    hangarResumo:
      faseJogoAtual === 'INICIO' || modoCampanhaCompleta
        ? construirHangarResumoDeterministico(estado, idCarcaca)
        : null,
    oficinaResumo:
      modalCampanhaAtivo === 'OFICINA' ||
      faseJogoAtual === 'MAPA' ||
      faseJogoAtual === 'LOJA' ||
      faseJogoAtual === 'EVENTO'
        ? construirOficinaResumoDeterministico(estado, nave, faseJogoAtual, recursosAtuais)
        : null,
    saqueResumo: construirSaqueResumoDeterministico(estado),
    desfechoEventoResumo:
      modalCampanhaAtivo === 'EVENTO_DESFECHO'
        ? construirDesfechoEventoResumoDeterministico(estado)
        : null,
    fimDeRunResumo:
      faseJogoAtual === 'FIM_DE_RUN' || estado.meta?.desfechoRun
        ? construirFimDeRunResumoDeterministico(estado, recursosAtuais)
        : null,
    lojaResumo: faseJogoAtual === 'LOJA' ? construirLojaResumoDeterministico(estado) : null,
    eventoResumo: faseJogoAtual === 'EVENTO' ? construirEventoResumoCanonico45A(estado) : null,
    eventosVisuaisUltimoTick: estado.meta?.eventosVisuaisUltimoTick ?? estado.eventosVisuaisUltimoTick ?? [],
    mapaSetorialResumo: construirTelemetriaMapaSetorial(estado, faseJogoAtual),
  });
}

/**
 * Exporta o quadro atual renderizado em PNG 32-bit RGBA lossless (960x540 em escala 1x ou 1920x1080 em escala 2x nearest-neighbor).
 */
export function renderizarCenaCanvasParaPngBuffer(viewModel, opcoes = {}) {
  const opcoesNorm = { ...opcoes };
  if (opcoes && typeof opcoes === 'object') {
    if (opcoes.estourarBarraChefeMutacao === true) {
      opcoesNorm.estourarBarraChefeMutacao = true;
    }
  }
  const escala = Math.max(1, Math.min(2, Math.floor(Number(opcoesNorm.escalaInteira ?? 2) || 2)));
  const assets = obterAssetsConceitoHiBit();
  const hitboxes = obterMapaHitboxesNativo(viewModel, opcoesNorm);
  const rgba = rasterizarQuadroRgba960x540(viewModel, opcoesNorm, assets, hitboxes, obterTabelasRasterUnificado());
  const finalImg = escalarNearestRgba(960, 540, Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength), escala);
  return codificarBufferRgbaParaPng(finalImg.largura, finalImg.altura, finalImg.rgba);
}

/**
 * Renderiza um quadro animado completo (t = 0..95) da cena de combate do Bio-Foil com os sprites 4-frames nas 8 câmaras
 * e nos slots dorsais, retornando os metadados de animação/encaixe e o buffer PNG lossless.
 */
export function renderizarQuadroAnimadoCenaBiofoil(estadoJogo, opcoes = {}) {
  const quadroTick = Number.isInteger(opcoes.quadroTick) && opcoes.quadroTick >= 0 ? opcoes.quadroTick : 0;
  const escalaInteira = opcoes.escalaInteira === 2 ? 2 : 1;
  const fpsAlvo = opcoes.fps === 60 ? 60 : 24;
  const divisorF4 = fpsAlvo === 60 ? 12 : 6;
  const f4 = Math.floor(quadroTick / divisorF4) % 4;
  const cicloDisparo = fpsAlvo === 60 ? 120 : 48;
  const limiarInicioDisparo = fpsAlvo === 60 ? 80 : 32;
  const limiarFimDisparo = fpsAlvo === 60 ? 105 : 42;
  const subT = quadroTick % cicloDisparo;
  const disparando = subT >= limiarInicioDisparo && subT <= limiarFimDisparo;
  const progCarga = disparando ? 1.0 : Math.min(1.0, subT / limiarInicioDisparo);
  const tempoSeg = Number.isFinite(Number(opcoes.tempoSeg)) ? Number(opcoes.tempoSeg) : quadroTick / fpsAlvo;
  const vm = projetarViewModelWireframe(estadoJogo, { idHitboxHover: opcoes.hoverHitboxId ?? null });
  const pngBuffer = renderizarCenaCanvasParaPngBuffer(vm, {
    escalaInteira,
    cicloSpriteF4: f4,
    disparandoDorsal: disparando,
    tempoSeg,
    estadoVisual60Fps: opcoes.estadoVisual60Fps ?? null,
    hoverHitboxId: opcoes.hoverHitboxId ?? null,
    pressHitboxId: opcoes.pressHitboxId ?? null,
    exibirTooltipHover: Boolean(opcoes.exibirTooltipHover),
    slotArmaSelecionado: opcoes.slotArmaSelecionado ?? 0,
    tripulanteSelecionadoId: opcoes.tripulanteSelecionadoId ?? null,
    pausaTaticaAtiva: Boolean(opcoes.pausaTaticaAtiva),
    exibirGhostPreview: Boolean(opcoes.exibirGhostPreview ?? true),
  });

  const encaixesCamaras = [
    calcularEncaixeCamaraBioNave(1, ['POLVO'], f4),
    calcularEncaixeCamaraBioNave(7, ['CARANGUEJO', 'MARINHEIRO'], f4),
    calcularEncaixeCamaraBioNave(2, ['ARRAIA'], f4),
    calcularEncaixeCamaraBioNave(3, ['CARANGUEJO', 'MERGULHADOR'], f4),
    calcularEncaixeCamaraBioNave(4, ['ARRAIA'], f4),
    calcularEncaixeCamaraBioNave(5, ['POLVO', 'BAIACU'], f4),
    calcularEncaixeCamaraBioNave(6, ['BAIACU', 'PARASITA'], f4),
    calcularEncaixeCamaraBioNave(8, ['GLANDULA_BAIACU'], f4),
  ];

  const encaixesDorsais = [
    calcularEncaixeDorsalArma(0, quadroTick < cicloDisparo ? 'EMISSOR_ACUSTICO_I' : 'EMISSOR_RAJADA_II', progCarga, disparando),
    calcularEncaixeDorsalArma(1, quadroTick < cicloDisparo ? 'CANHAO_ARPAO_CABO' : 'CORTADOR_TERMICO', progCarga, disparando),
  ];

  const metadadosCongelados = clonarProfundoCongelado({
    ok: encaixesCamaras.every((c) => c.ok) && encaixesDorsais.every((d) => d.ok),
    quadroTick,
    fps: fpsAlvo,
    cicloSpriteF4: f4,
    larguraPx: 960 * escalaInteira,
    alturaPx: 540 * escalaInteira,
    encaixesCamaras,
    encaixesDorsais,
  });

  return Object.freeze({
    ...metadadosCongelados,
    pngBuffer,
  });
}

/**
 * Exporta as 3 Pranchas Steam-Tier de Animação 4-Frames, Órgãos Puros e Travessia Tática 60 FPS (960x540 -> 1920x1080 x2 lossless PNG).
 */
export function exportarSpreadAnimacaoSteamPngBuffer(tipoSpread, opcoes = {}) {
  return exportarSpreadAnimacaoSteamPngBufferComHooks(tipoSpread, opcoes, {
    projetarViewModelWireframe,
    interpolarEstadoVisual60Fps,
  });
}
