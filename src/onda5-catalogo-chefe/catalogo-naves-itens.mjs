/**
 * ONDA 5 — Catálogo Completo (7 Armas, 6 Órgãos +5 kg c/ Isolamento 5s, 8 Biomas, 5 Naves,
 * 10 Árvores de Upgrade = 2330, 20 Itens de Loja c/ Venda 50% e Digestão 2:1, e 8 Arquétipos Inimigos).
 * Dono Único (Lei N5): src/onda5-catalogo-chefe/catalogo-naves-itens.mjs
 *
 * Fontes canônicas:
 *  - Seção 5.1 (7 Chassis de Armas)
 *  - Seção 5.2 e Falha Global 1 (6 Órgãos de Enxerto +5 kg, encaixe livre fora de combate, Isolamento Residual de 5s pós-choque)
 *  - Seção 5.3 (8 Biomas: Chuva Ácida a cada 15s no Foil no Setor 6; Corrosão do Mastro após 8s em Touchdown no Setor 7)
 *  - Seção 5.4 e 5.4.A (5 Naves Desbloqueáveis; Colmeia-Viva +1 HP a cada 12s em Touchdown máx +2 HP por luta com inimigo vivo)
 *  - Seção 5.6.A..C e Falhas Globais 4..6 (10 Árvores = 2330, Reator teto 18 barras, 20 itens de loja 50% floor, Digestão 2:1, Solvência 1473..2789)
 *  - Seção 5.7.A..B (8 Arquétipos de Inimigos e Escalamento Setores 1..7)
 */
import { clonarProfundoCongelado } from '../gdd-parser.mjs';
import { streamLojaEstoque } from '../onda1-fisica/hash32-streams.mjs';

export const ISOLAMENTO_RESIDUAL_POS_CHOQUE_SEG = 5.0;
export const DURACAO_CHOQUE_ELETRO_PLACA_SEG = 6.0;
export const PESO_ORGAO_ENXERTADO_KG = 5;
export const TETO_BARRAS_REATOR_COMPRAVEIS = 18;
export const MAX_TRIPULANTES_NAVE = 6;

export const CATALOGO_ARMAS_51 = Object.freeze([
  Object.freeze({
    id: 'EMISSOR_ACUSTICO_I',
    ordem: 1,
    nome: '1. Emissor Acústico I',
    energia: 1,
    pesoKg: 10,
    recargaSeg: 9,
    municao: 0,
    soquetes: 1,
    projeteis: 1,
    danoCasco: 1,
    danoSistema: 1,
    ignoraBarreira: false,
    ehFeixe: false,
    exigeSalaSubmersa: false,
    chanceFuroPct: 0,
    precoCompra: 35,
    valorVenda: 17,
  }),
  Object.freeze({
    id: 'RAJADA_HIDROPNEUMATICA_II',
    ordem: 2,
    nome: '2. Rajada Hidropneumática II',
    energia: 2,
    pesoKg: 18,
    recargaSeg: 12,
    municao: 0,
    soquetes: 1,
    projeteis: 3,
    danoCasco: 1,
    danoSistema: 1,
    ignoraBarreira: false,
    ehFeixe: false,
    exigeSalaSubmersa: false,
    chanceFuroPct: 0,
    precoCompra: 65,
    valorVenda: 32,
  }),
  Object.freeze({
    id: 'CANHAO_ARPAO_CABO',
    ordem: 3,
    nome: '3. Canhão de Arpão de Cabo',
    energia: 2,
    pesoKg: 15,
    recargaSeg: 11,
    municao: 0,
    soquetes: 2,
    projeteis: 1,
    danoCasco: 1,
    danoSistema: 1,
    ignoraBarreira: false,
    ehFeixe: false,
    exigeSalaSubmersa: false,
    chanceFuroPct: 100,
    precoCompra: 50,
    valorVenda: 25,
  }),
  Object.freeze({
    id: 'DISPERSOR_ESTILHACOS',
    ordem: 4,
    nome: '4. Dispersor de Estilhaços (Flak Naval)',
    energia: 2,
    pesoKg: 22,
    recargaSeg: 10,
    municao: 0,
    soquetes: 1,
    projeteis: 3,
    danoCasco: 1,
    danoSistema: 1,
    ignoraBarreira: false,
    ehFeixe: false,
    exigeSalaSubmersa: false,
    chanceFuroPct: 0,
    precoCompra: 60,
    valorVenda: 30,
  }),
  Object.freeze({
    id: 'CORTADOR_TERMICO_PLASMA',
    ordem: 5,
    nome: '5. Cortador Térmico a Plasma (Beam)',
    energia: 2,
    pesoKg: 25,
    recargaSeg: 14,
    municao: 0,
    soquetes: 1,
    projeteis: 3, // 3 salas adjacentes
    danoCasco: 2,
    danoSistema: 2,
    ignoraBarreira: false,
    ehFeixe: true,
    exigeSalaSubmersa: false,
    chanceFuroPct: 0,
    precoCompra: 75,
    valorVenda: 37,
  }),
  Object.freeze({
    id: 'LANCADOR_TORPEDO_ABISSAL',
    ordem: 6,
    nome: '6. Lançador de Torpedo Abissal',
    energia: 2,
    pesoKg: 28,
    recargaSeg: 13,
    municao: 1,
    soquetes: 2,
    projeteis: 1,
    danoCasco: 3,
    danoSistema: 3,
    ignoraBarreira: true,
    ehFeixe: false,
    exigeSalaSubmersa: true,
    chanceFuroPct: 100,
    precoCompra: 70,
    valorVenda: 35,
  }),
  Object.freeze({
    id: 'MORTEIRO_ESPOROS',
    ordem: 7,
    nome: '7. Morteiro de Esporos / Bomba',
    energia: 1,
    pesoKg: 12,
    recargaSeg: 11,
    municao: 1,
    soquetes: 2,
    projeteis: 1,
    danoCasco: 0,
    danoSistema: 2,
    ignoraBarreira: true,
    ehFeixe: false,
    exigeSalaSubmersa: false,
    chanceFuroPct: 0,
    precoCompra: 45,
    valorVenda: 22,
  }),
]);

export const CATALOGO_ORGAOS_52 = Object.freeze([
  Object.freeze({
    id: 'GLANDULA_BAIACU',
    ordem: 1,
    nome: '1. Glândula de Baiacu (Neurotoxina)',
    pesoKg: PESO_ORGAO_ENXERTADO_KG,
    penalidadeRecargaSeg: 0,
    venenoHpPorSeg: 6,
    duracaoVenenoSeg: 10,
    reducaoDanoCasco: 1,
    precoCompra: 40,
    valorVenda: 20,
  }),
  Object.freeze({
    id: 'ELETRO_PLACA_ARRAIA',
    ordem: 2,
    nome: '2. Eletro-Placa de Arraia (Choque / Íon)',
    pesoKg: PESO_ORGAO_ENXERTADO_KG,
    penalidadeRecargaSeg: 2,
    barrasIonizadas: 1,
    duracaoChoqueSeg: DURACAO_CHOQUE_ELETRO_PLACA_SEG,
    isolamentoResidualPosChoqueSeg: ISOLAMENTO_RESIDUAL_POS_CHOQUE_SEG,
    precoCompra: 50,
    valorVenda: 25,
  }),
  Object.freeze({
    id: 'BEXIGA_ALTA_PRESSAO',
    ordem: 3,
    nome: '3. Bexiga de Alta Pressão (Inundação / Concussão)',
    pesoKg: PESO_ORGAO_ENXERTADO_KG,
    penalidadeRecargaSeg: 0,
    aguaInjetadaKg: 15,
    atordoamentoSeg: 2,
    reducaoEsquivaMonstroPct: 10,
    duracaoReducaoEsquivaSeg: 5,
    precoCompra: 45,
    valorVenda: 22,
  }),
  Object.freeze({
    id: 'BOLSA_TINTA_ABISSAL',
    ordem: 4,
    nome: '4. Bolsa de Tinta Abissal (Cegueira)',
    pesoKg: PESO_ORGAO_ENXERTADO_KG,
    penalidadeRecargaSeg: 0,
    duracaoCegueiraSeg: 8,
    reducaoPrecisaoPct: 40,
    precoCompra: 40,
    valorVenda: 20,
  }),
  Object.freeze({
    id: 'DENTE_LEVIATA',
    ordem: 5,
    nome: '5. Dente Serrilhado de Leviatã (Sangramento/Perfuração)',
    pesoKg: PESO_ORGAO_ENXERTADO_KG,
    penalidadeRecargaSeg: 0,
    bonusDanoSistemaSemEscudo: 1,
    precoCompra: 55,
    valorVenda: 27,
  }),
  Object.freeze({
    id: 'GLANDULA_TERMOFILICA',
    ordem: 6,
    nome: '6. Glândula Termofílica (Fogo/Fervura)',
    pesoKg: PESO_ORGAO_ENXERTADO_KG,
    penalidadeRecargaSeg: 0,
    duracaoFervuraSeg: 8,
    danoTripulacaoHpPorSeg: 5,
    danoSistemaFinal: 1,
    precoCompra: 50,
    valorVenda: 25,
  }),
]);

export const CATALOGO_BIOMAS_53 = Object.freeze([
  Object.freeze({
    id: 'BIOMA_1_ATOIS_SUCATA',
    setor: 1,
    cor: 'OBRIGATORIO',
    nome: '1. Setor 1 — Atóis de Sucata Rasos (Obrigatório)',
    regraEspecial: 'NONE',
  }),
  Object.freeze({
    id: 'BIOMA_2_RECIFES_BIOLUMINESCENTES',
    setor: 2,
    cor: 'VERDE',
    nome: '2. Bioma Verde — Recifes Bioluminescentes (Território Aliado)',
    regraEspecial: 'MAIS_FORJAS_E_RECRUTAMENTO',
  }),
  Object.freeze({
    id: 'BIOMA_3_FLORESTA_KELP',
    setor: 3,
    cor: 'VERDE',
    nome: '3. Bioma Verde — Floresta de Kelp Gigante',
    regraEspecial: 'RED_ESQUIVA_BARCOS_15_PCT',
    reducaoEsquivaBarcosPct: 15,
  }),
  Object.freeze({
    id: 'BIOMA_4_ESTREITO_ARRASTOES',
    setor: 4,
    cor: 'VERMELHO',
    nome: '4. Bioma Vermelho — Estreito dos Arrastões (Zona Industrial)',
    regraEspecial: 'ALTA_CONCENTRACAO_BARCOS_SONAR',
  }),
  Object.freeze({
    id: 'BIOMA_5_FOSSA_ABISSAL',
    setor: 5,
    cor: 'VERMELHO',
    nome: '5. Bioma Vermelho — Fossa Abissal de Pressão',
    regraEspecial: 'ESCURIDAO_SONAR_E_MONSTROS',
  }),
  Object.freeze({
    id: 'BIOMA_6_CRATERA_USINA',
    setor: 6,
    cor: 'ROXO',
    nome: '6. Bioma Roxo — Cratera da Usina Submersa (Zona Radioativa)',
    regraEspecial: 'CHUVA_ACIDA_15S_NO_FOIL',
    intervaloChuvaAcidaNoFoilSeg: 15.0,
    danoCascoChuvaAcida: 1,
  }),
  Object.freeze({
    id: 'BIOMA_7_MAR_SARGACOS_QUIMICOS',
    setor: 7,
    cor: 'ROXO',
    nome: '7. Bioma Roxo — Mar de Sargaços Químicos',
    regraEspecial: 'CORROSAO_MASTRO_8S_TOUCHDOWN',
    tempoMaxTouchdownSemCorrosaoSeg: 8.0,
    danoMastroCorrosao: 1,
  }),
  Object.freeze({
    id: 'BIOMA_8_CRATERA_DRAGA',
    setor: 8,
    cor: 'FINAL',
    nome: '8. Setor 8 — A Cratera da Draga Continental (Confronto Final)',
    regraEspecial: 'CHEFE_FINAL_3_FASES',
  }),
]);

export const CATALOGO_NAVES_54 = Object.freeze([
  Object.freeze({
    idArquitetura: 'CARCACA_ALFA',
    ordem: 1,
    nome: '1. Carcaça Alfa',
    estiloTatico: 'Equilibrada',
    hpCascoMax: 30,
    pesoChassiKg: 100,
    aguaInicialKg: 100,
    pesoTotalInicialKg: 225,
    sustentacaoInicialKg: 260,
    tripulacaoInicial: Object.freeze({ POLVO: 1, ARRAIA: 1, BAIACU: 1, CARANGUEJO: 0 }),
    armasIniciais: Object.freeze(['CANHAO_ARPAO_CABO', 'EMISSOR_ACUSTICO_I']),
    orgaosIniciais: Object.freeze([]),
    condicaoDesbloqueio: 'Disponível desde o início.',
  }),
  Object.freeze({
    idArquitetura: 'MANTA_VOLT',
    ordem: 2,
    nome: '2. Manta-Volt',
    estiloTatico: 'Guerra Elétrica / Choque',
    hpCascoMax: 30,
    pesoChassiKg: 70,
    aguaInicialKg: 100,
    pesoTotalInicialKg: 195,
    sustentacaoInicialKg: 260,
    tripulacaoInicial: Object.freeze({ POLVO: 1, ARRAIA: 2, BAIACU: 0, CARANGUEJO: 0 }),
    armasIniciais: Object.freeze(['EMISSOR_ACUSTICO_I', 'EMISSOR_ACUSTICO_I']),
    orgaosIniciais: Object.freeze(['ELETRO_PLACA_ARRAIA']),
    condicaoDesbloqueio: 'Vencer um combate no Setor 4+ sem causar dano ao casco inimigo.',
  }),
  Object.freeze({
    idArquitetura: 'COURACA_LIMIAR',
    ordem: 3,
    nome: '3. Couraça-Limiar',
    estiloTatico: 'Abordagem Brutal (All-In)',
    hpCascoMax: 30,
    pesoChassiKg: 100,
    aguaInicialKg: 100,
    pesoTotalInicialKg: 225,
    sustentacaoInicialKg: 300,
    tripulacaoInicial: Object.freeze({ POLVO: 0, ARRAIA: 0, BAIACU: 1, CARANGUEJO: 2 }),
    armasIniciais: Object.freeze(['EMISSOR_ACUSTICO_I', 'CANHAO_ARPAO_CABO']),
    orgaosIniciais: Object.freeze([]),
    condicaoDesbloqueio: 'Capturar 5 barcos corporativos intactos em uma única run.',
  }),
  Object.freeze({
    idArquitetura: 'SOMBRA_ABISSAL',
    ordem: 4,
    nome: '4. Sombra-Abissal',
    estiloTatico: 'Furtiva / Veneno Cirúrgico',
    hpCascoMax: 20,
    pesoChassiKg: 90,
    aguaInicialKg: 100,
    pesoTotalInicialKg: 220,
    sustentacaoInicialKg: 260,
    tripulacaoInicial: Object.freeze({ POLVO: 1, ARRAIA: 0, BAIACU: 0, CARANGUEJO: 1 }),
    armasIniciais: Object.freeze(['EMISSOR_ACUSTICO_I', 'CANHAO_ARPAO_CABO']),
    orgaosIniciais: Object.freeze(['GLANDULA_BAIACU']),
    condicaoDesbloqueio: 'Extrair 4 Órgãos Intactos de monstros na mesma run.',
  }),
  Object.freeze({
    idArquitetura: 'COLMEIA_VIVA',
    ordem: 5,
    nome: '5. Colmeia-Viva',
    estiloTatico: 'Regeneração / Touchdown',
    hpCascoMax: 30,
    pesoChassiKg: 100,
    aguaInicialKg: 100,
    pesoTotalInicialKg: 230,
    sustentacaoInicialKg: 260,
    tripulacaoInicial: Object.freeze({ POLVO: 0, ARRAIA: 1, BAIACU: 2, CARANGUEJO: 0 }),
    armasIniciais: Object.freeze(['RAJADA_HIDROPNEUMATICA_II', 'MORTEIRO_ESPOROS']),
    orgaosIniciais: Object.freeze([]),
    regeneracaoTouchdownIntervaloSeg: 12.0,
    regeneracaoTouchdownMaxHpPorLuta: 2,
    condicaoDesbloqueio: 'Chegar ao Setor 8 pela primeira vez.',
  }),
]);

export const ARVORES_UPGRADE_56A = Object.freeze([
  Object.freeze({ id: 'MASTRO_FOIL', nome: '1. Mastro do Foil', moeda: 'SUCATA', nivelInicialAlfa: 1, barrasMax: 7, custos: [45, 80, 120], somaAlfa: 245 }),
  Object.freeze({ id: 'ARTILHARIA_DORSAL', nome: '2. Artilharia Dorsal', moeda: 'SUCATA', nivelInicialAlfa: 3, barrasMax: 8, custos: [35, 50, 70, 95, 125], somaAlfa: 375 }),
  Object.freeze({ id: 'PLACAS_BLINDAGEM', nome: '3. Placas de Blindagem', moeda: 'SUCATA', nivelInicialAlfa: 0, barrasMax: 3, custos: [40, 75, 115], somaAlfa: 230 }),
  Object.freeze({ id: 'GLANDULA_BARREIRA', nome: '4. Glândula de Barreira', moeda: 'BIOMASSA', nivelInicialAlfa: 2, barrasMax: 8, custos: [30, 50, 65, 90, 110, 140], somaAlfa: 485 }),
  Object.freeze({ id: 'SIFAO_PROPULSAO', nome: '5. Sifão de Propulsão', moeda: 'BIOMASSA', nivelInicialAlfa: 2, barrasMax: 5, custos: [35, 65, 105], somaAlfa: 205 }),
  Object.freeze({ id: 'BOMBA_BRANQUIAL', nome: '6. Bomba Branquial', moeda: 'BIOMASSA', nivelInicialAlfa: 1, barrasMax: 3, custos: [35, 65], somaAlfa: 100 }),
  Object.freeze({ id: 'CORTEX_NAVEGACAO', nome: '7. Córtex de Navegação', moeda: 'BIOMASSA', nivelInicialAlfa: 1, barrasMax: 3, custos: [25, 50], somaAlfa: 75 }),
  Object.freeze({ id: 'TUBO_PRESSURIZADO', nome: '8. Tubo Pressurizado', moeda: 'BIOMASSA', nivelInicialAlfa: 0, barrasMax: 2, custos: [60, 45], somaAlfa: 105 }),
  Object.freeze({ id: 'GLANDULA_TINTA_FURTIVA', nome: '9. Glândula de Tinta Furtiva', moeda: 'BIOMASSA', nivelInicialAlfa: 0, barrasMax: 2, custos: [75, 55], somaAlfa: 130 }),
  Object.freeze({ id: 'CORACAO_BIO_ELETRICO', nome: '10. Coração Bio-Elétrico', moeda: 'FLEXIVEL', nivelInicialAlfa: 6, barrasMax: 18, custos: [20, 20, 20, 20, 30, 30, 30, 30, 45, 45, 45, 45], somaAlfa: 380 }),
]);

export const CATALOGO_LOJA_56B = Object.freeze([
  ...CATALOGO_ARMAS_51.map((a) =>
    Object.freeze({
      id: a.id,
      categoria: 'ARMA',
      nome: a.nome,
      moeda: 'SUCATA',
      pesoKg: a.pesoKg,
      precoCompra: a.precoCompra,
      valorVenda: Math.floor(0.5 * a.precoCompra),
    })
  ),
  ...CATALOGO_ORGAOS_52.map((o) =>
    Object.freeze({
      id: o.id,
      categoria: 'ORGAO',
      nome: o.nome,
      moeda: 'BIOMASSA',
      pesoKg: o.pesoKg,
      precoCompra: o.precoCompra,
      valorVenda: Math.floor(0.5 * o.precoCompra),
    })
  ),
  Object.freeze({ id: 'TRIPULANTE_POLVO', categoria: 'TRIPULANTE', nome: '1. Polvo', moeda: 'BIOMASSA', pesoKg: 0, precoCompra: 50, valorVenda: 0 }),
  Object.freeze({ id: 'TRIPULANTE_ARRAIA', categoria: 'TRIPULANTE', nome: '2. Arraia Elétrica', moeda: 'BIOMASSA', pesoKg: 0, precoCompra: 55, valorVenda: 0 }),
  Object.freeze({ id: 'TRIPULANTE_BAIACU', categoria: 'TRIPULANTE', nome: '3. Baiacu Espinhoso', moeda: 'BIOMASSA', pesoKg: 0, precoCompra: 45, valorVenda: 0 }),
  Object.freeze({ id: 'TRIPULANTE_CARANGUEJO', categoria: 'TRIPULANTE', nome: '4. Caranguejo Anfíbio', moeda: 'BIOMASSA', pesoKg: 0, precoCompra: 50, valorVenda: 0 }),
  Object.freeze({ id: 'INSUMO_COMBUSTIVEL', categoria: 'INSUMO', nome: 'Célula de Combustível (1 un.)', moeda: 'SUCATA', pesoKg: 0, precoCompra: 3, valorVenda: 0 }),
  Object.freeze({ id: 'INSUMO_MUNICAO', categoria: 'INSUMO', nome: 'Munição de Torpedo/Esporo (1 un.)', moeda: 'SUCATA', pesoKg: 0, precoCompra: 4, valorVenda: 0 }),
  Object.freeze({ id: 'REPARO_CASCO_1HP', categoria: 'REPARO', nome: 'Reparo de Casco por 1 HP (Setores 1–3 / 4–6 / 7–8)', moeda: 'SUCATA', pesoKg: 0, precoCompraPorFaixa: Object.freeze([2, 3, 4]), valorVenda: 0 }),
]);

export const BESTIARIO_ARQUETIPOS_57A = Object.freeze([
  Object.freeze({ id: 'BARCO_1_LANCHA', classe: 'BARCO_HUMANO', nome: '1. Lancha Patrulheira', setorMin: 1, setorMax: 3, totalSalas: 4, salasSuperiores: 2, salasSubmersas: 2 }),
  Object.freeze({ id: 'BARCO_2_CORVETA', classe: 'BARCO_HUMANO', nome: '2. Corveta de Sonar', setorMin: 2, setorMax: 5, totalSalas: 5, salasSuperiores: 3, salasSubmersas: 2, temSonarMilitar: true }),
  Object.freeze({ id: 'BARCO_3_ARRASTAO', classe: 'BARCO_HUMANO', nome: '3. Arrastão Blindado', setorMin: 3, setorMax: 6, totalSalas: 6, salasSuperiores: 3, salasSubmersas: 3 }),
  Object.freeze({ id: 'BARCO_4_SUBMARINO', classe: 'BARCO_HUMANO', nome: '4. Submarino Térmico de Assalto', setorMin: 5, setorMax: 7, totalSalas: 6, salasSuperiores: 2, salasSubmersas: 4, temSonarMilitar: true }),
  Object.freeze({ id: 'MONSTRO_1_TEUTHIS', classe: 'MONSTRO_BIOLOGICO', nome: '5. Teuthis Couraçada Mutante', setorMin: 1, setorMax: 3, totalSalas: 4, orgaoExtraido: 'BOLSA_TINTA_ABISSAL' }),
  Object.freeze({ id: 'MONSTRO_2_ENGUIA', classe: 'MONSTRO_BIOLOGICO', nome: '6. Enguia Elétrica Abissal', setorMin: 2, setorMax: 5, totalSalas: 4, orgaoExtraido: 'ELETRO_PLACA_ARRAIA' }),
  Object.freeze({ id: 'MONSTRO_3_CARANGUEJO', classe: 'MONSTRO_BIOLOGICO', nome: '7. Caranguejo-Titã de Trincheira', setorMin: 4, setorMax: 6, totalSalas: 4, orgaoExtraido: 'BEXIGA_ALTA_PRESSAO' }),
  Object.freeze({ id: 'MONSTRO_4_HIDRA', classe: 'MONSTRO_BIOLOGICO', nome: '8. Hidra Termofílica de Cratera', setorMin: 5, setorMax: 7, totalSalas: 4, orgaoExtraido: 'GLANDULA_TERMOFILICA' }),
]);

/**
 * Calcula os atributos escalados de um inimigo para o Setor S (1..7) segundo a Seção 5.7.B.
 */
export function calcularAtributosInimigoSetor(setorNumero) {
  const s = Math.max(1, Math.min(7, Number(setorNumero)));
  return clonarProfundoCongelado({
    setor: s,
    barcoHp: 8 + 2 * (s - 1),
    barcoBarreiraBolhas: Math.floor(s / 2),
    barcoEsquivaPct: 15 + 2 * (s - 1),
    monstroHp: 10 + 3 * (s - 1),
    monstroEsquivaPct: 20 + 2 * (s - 1),
    orcamentoArmasBarras: 2 + (s - 1),
    tripulacaoHumana: 2 + Math.floor((s - 1) / 2),
    ganglioCentralBarras: 3 + Math.floor((s - 1) / 2),
  });
}

/**
 * Aplica o disparo da Eletro-Placa de Arraia num sistema/órgão, respeitando estritamente o
 * Isolamento Residual de 5.0s pós-choque (Falha Global 1 / MUT-O5-01).
 */
export function aplicarChoqueEletroPlacaEmSala(salaAlvo, opcoesDebug = {}) {
  const ignorarIsolamento = opcoesDebug.ignorarIsolamentoResidualChoque === true;
  if (!ignorarIsolamento && (salaAlvo.isolamentoResidualChoqueSeg ?? 0) > 0) {
    return clonarProfundoCongelado({
      choqueAplicado: false,
      motivoBloqueio: 'BLOQUEADO_ISOLAMENTO_RESIDUAL_5S',
      sala: salaAlvo,
    });
  }
  const ionRestante = Math.max(
    Number(salaAlvo.tempoRestanteIonSeg ?? 0),
    Number(salaAlvo.tempoParalisiaIonSeg ?? 0),
    Number(salaAlvo.paralisiaIonSeg ?? 0)
  );
  if (!ignorarIsolamento && ionRestante > 0) {
    return clonarProfundoCongelado({
      choqueAplicado: false,
      motivoBloqueio: 'CHOQUE_JA_ATIVO',
      sala: salaAlvo,
    });
  }
  return clonarProfundoCongelado({
    choqueAplicado: true,
    motivoBloqueio: null,
    sala: {
      ...salaAlvo,
      danoIonizado: (salaAlvo.danoIonizado ?? 0) + 1,
      tempoRestanteIonSeg: DURACAO_CHOQUE_ELETRO_PLACA_SEG,
      tempoParalisiaIonSeg: DURACAO_CHOQUE_ELETRO_PLACA_SEG,
      paralisiaIonSeg: DURACAO_CHOQUE_ELETRO_PLACA_SEG,
    },
  });
}

/**
 * Avança o timer de Choque/Íon e de Isolamento Residual (5.0s após o fim dos 6.0s de choque) numa sala.
 */
export function avancarTickChoqueEIsolamentoSala(salaAlvo, dtSeg = 1.0, opcoesDebug = {}) {
  const ignorarIsolamento = opcoesDebug.ignorarIsolamentoResidualChoque === true;
  let danoIonizado = salaAlvo.danoIonizado ?? 0;
  let tempoRestanteIonSeg = Math.max(
    Number(salaAlvo.tempoRestanteIonSeg ?? 0),
    Number(salaAlvo.tempoParalisiaIonSeg ?? 0),
    Number(salaAlvo.paralisiaIonSeg ?? 0)
  );
  let isolamentoResidualChoqueSeg = salaAlvo.isolamentoResidualChoqueSeg ?? 0;

  if (tempoRestanteIonSeg > 0) {
    const novoTempoIon = Math.max(0, Math.round((tempoRestanteIonSeg - dtSeg) * 1000) / 1000);
    if (novoTempoIon === 0) {
      danoIonizado = 0;
      isolamentoResidualChoqueSeg = ignorarIsolamento ? 0 : ISOLAMENTO_RESIDUAL_POS_CHOQUE_SEG;
    }
    tempoRestanteIonSeg = novoTempoIon;
  } else if (isolamentoResidualChoqueSeg > 0) {
    isolamentoResidualChoqueSeg = Math.max(
      0,
      Math.round((isolamentoResidualChoqueSeg - dtSeg) * 1000) / 1000
    );
  }

  return clonarProfundoCongelado({
    ...salaAlvo,
    danoIonizado,
    tempoRestanteIonSeg,
    tempoParalisiaIonSeg: tempoRestanteIonSeg,
    paralisiaIonSeg: tempoRestanteIonSeg,
    isolamentoResidualChoqueSeg,
  });
}

/**
 * Avança 1 tick das regras ambientais de bioma (Setor 6 Chuva Ácida a cada 15s no Foil;
 * Setor 7 Corrosão do Mastro após 8s contínuos em Touchdown) e da regeneração passiva da
 * Colmeia-Viva (+1 HP a cada 12s contínuos em Touchdown em combate ativo, máx. +2 HP por luta — MUT-O5-04).
 */
export function avancarTickBiomaEColmeiaViva(estado, dtSeg = 1.0, opcoesDebug = {}) {
  let nave = estado.naveJogador;
  const alvo = estado.alvoCombate;
  const classeInimigo = alvo?.classeInimigo ?? alvo?.classeAlvo ?? 'BARCO_HUMANO';
  const tripulacaoAlvo =
    alvo?.tripulacaoInimiga ?? (alvo?.salasOuOrgaos ?? []).flatMap((s) => s.tripulantes ?? []);
  const ganglioCentral = alvo?.salasOuOrgaos?.find(
    (s) => s.ehGanglioCentral || /GANGLIO/i.test(s.nome)
  );
  const inimigoVivo =
    alvo &&
    alvo.ativo !== false &&
    alvo.hpCascoAtual > 0 &&
    (classeInimigo === 'MONSTRO_MARINHO'
      ? (ganglioCentral?.integridadeAtual ?? ganglioCentral?.integridade ?? 1) > 0
      : tripulacaoAlvo.some((t) => t.hpAtual > 0) || alvo.iaBackupAtiva === true);

  let hpCascoAtual = nave.hpCascoAtual;
  let tempoTouchdownContinuoSeg = nave.tempoTouchdownContinuoSeg ?? 0;
  let regeneracoesColmeiaNestaLuta = nave.regeneracoesColmeiaNestaLuta ?? 0;
  let corrosoesMastroTouchdown = nave.corrosoesMastroTouchdown ?? 0;
  let tempoChuvaAcidaAcumuladoSeg = nave.tempoChuvaAcidaAcumuladoSeg ?? 0;
  let camaras = nave.camaras.map((c) => ({ ...c }));

  if (nave.estadoFisico === '2_TOUCHDOWN' || nave.estadoFisico === '3_SPOOL_UP') {
    tempoTouchdownContinuoSeg = Math.round((tempoTouchdownContinuoSeg + dtSeg) * 1000) / 1000;
    tempoChuvaAcidaAcumuladoSeg = 0; // Lavou o casco no mar

    // Setor 7: Corrosão do Mastro se ficar mais de 8.0s contínuos em Touchdown (1 barra a cada ciclo de 8.0s)
    if (estado.mapaSetorial?.setorNumero === 7 && tempoTouchdownContinuoSeg > 8.0) {
      const marcosCorrosao = Math.floor(tempoTouchdownContinuoSeg / 8.0);
      if (marcosCorrosao > corrosoesMastroTouchdown) {
        const danoMastro = marcosCorrosao - corrosoesMastroTouchdown;
        corrosoesMastroTouchdown = marcosCorrosao;
        camaras = camaras.map((c) =>
          c.id === 6
            ? {
                ...c,
                barrasIntegridade: Math.max(0, (c.barrasIntegridade ?? c.integridade ?? 4) - danoMastro),
                integridade: Math.max(0, (c.integridade ?? c.barrasIntegridade ?? 4) - danoMastro),
              }
            : c
        );
      }
    }

    // Colmeia-Viva: +1 HP a cada 12.0s contínuos em Touchdown, máx +2 HP por luta, SOMENTE com inimigo vivo (MUT-O5-04)
    if (nave.idArquitetura === 'COLMEIA_VIVA') {
      const ignorarTravasColmeia = opcoesDebug.ignorarLimitesRegeneracaoColmeia === true;
      const marcosAtingidos = Math.floor(tempoTouchdownContinuoSeg / 12.0);
      if (
        marcosAtingidos > regeneracoesColmeiaNestaLuta &&
        (ignorarTravasColmeia || (regeneracoesColmeiaNestaLuta < 2 && inimigoVivo))
      ) {
        const ganhos = marcosAtingidos - regeneracoesColmeiaNestaLuta;
        const permitido = ignorarTravasColmeia
          ? ganhos
          : Math.min(ganhos, 2 - regeneracoesColmeiaNestaLuta);
        hpCascoAtual = Math.min(nave.hpCascoMax, hpCascoAtual + permitido);
        regeneracoesColmeiaNestaLuta += permitido;
      }
    }
  } else {
    tempoTouchdownContinuoSeg = 0;
    corrosoesMastroTouchdown = 0;
    // Setor 6 (ou nó PER_1_CHUVA_ACIDA): Chuva Ácida a cada 15.0s em 1_NO_FOIL (neutralizável por Blue Option 30s)
    const neutrAtual = Math.max(0, Number(nave.neutralizaChuvaAcidaRestanteSeg ?? 0));
    if (neutrAtual > 0) {
      nave = {
        ...nave,
        neutralizaChuvaAcidaRestanteSeg: Math.max(0, Math.round((neutrAtual - dtSeg) * 1000) / 1000),
      };
    } else if (estado.mapaSetorial?.setorNumero === 6 || estado.meta?.perigoAmbientalId === 'PER_1_CHUVA_ACIDA') {
      tempoChuvaAcidaAcumuladoSeg = Math.round((tempoChuvaAcidaAcumuladoSeg + dtSeg) * 1000) / 1000;
      if (tempoChuvaAcidaAcumuladoSeg >= 15.0) {
        hpCascoAtual = Math.max(0, hpCascoAtual - 1);
        tempoChuvaAcidaAcumuladoSeg -= 15.0;
      }
    }
  }

  return clonarProfundoCongelado({
    ...estado,
    naveJogador: {
      ...nave,
      hpCascoAtual,
      tempoTouchdownContinuoSeg,
      regeneracoesColmeiaNestaLuta,
      corrosoesMastroTouchdown,
      tempoChuvaAcidaAcumuladoSeg,
      camaras,
    },
  });
}

/**
 * Digestão Enzimática nos Recifes-Forja (Falha Global 4): converte 2 unidades de uma moeda em 1 da outra (2:1).
 */
export function converterMoedaDigestaoEnzimatica(recursos, moedaOrigem, lotesDeDois = 1) {
  const custo = 2 * lotesDeDois;
  if (moedaOrigem === 'SUCATA') {
    if ((recursos.sucata ?? 0) < custo) {
      throw new Error('Sucata insuficiente para Digestão Enzimática 2:1');
    }
    return clonarProfundoCongelado({
      ...recursos,
      sucata: recursos.sucata - custo,
      biomassa: (recursos.biomassa ?? 0) + lotesDeDois,
    });
  }
  if (moedaOrigem === 'BIOMASSA') {
    if ((recursos.biomassa ?? 0) < custo) {
      throw new Error('Biomassa insuficiente para Digestão Enzimática 2:1');
    }
    return clonarProfundoCongelado({
      ...recursos,
      biomassa: recursos.biomassa - custo,
      sucata: (recursos.sucata ?? 0) + lotesDeDois,
    });
  }
  throw new Error(`Moeda desconhecida: ${moedaOrigem}`);
}

/**
 * Gera deterministicamente o estoque de um Recife-Forja usando exclusivamente o STREAM_3 (streamLojaEstoque).
 */
export function gerarEstoqueLojaForja(seedPartida, setorNumero, noId) {
  const hArma = streamLojaEstoque(seedPartida, setorNumero, noId, 'ARMA') % CATALOGO_ARMAS_51.length;
  const hOrgao = streamLojaEstoque(seedPartida, setorNumero, noId, 'ORGAO') % CATALOGO_ORGAOS_52.length;
  const especies = ['TRIPULANTE_POLVO', 'TRIPULANTE_ARRAIA', 'TRIPULANTE_BAIACU', 'TRIPULANTE_CARANGUEJO'];
  const hTrip = streamLojaEstoque(seedPartida, setorNumero, noId, 'TRIPULANTE') % especies.length;

  return clonarProfundoCongelado({
    armaOferta: CATALOGO_ARMAS_51[hArma],
    orgaoOferta: CATALOGO_ORGAOS_52[hOrgao],
    tripulanteOfertaId: especies[hTrip],
  });
}
