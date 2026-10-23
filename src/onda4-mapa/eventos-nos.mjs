/**
 * ONDA 4 — Catálogo Determinístico dos 17 Templates de Eventos (SOS, Exploração, Perigos),
 * Sorteio sem Repetição (STREAM_6), Paridade da Opção A (STREAM_2), Blue Options e SOS Expirado.
 * Dono Único (Lei N5): src/onda4-mapa/eventos-nos.mjs
 *
 * Fontes canônicas:
 *  - Seção 4.5.A (Tabela dos 17 Templates: 8 SOS + 6 EXPLORACAO + 3 PERIGO, Teto Monetário por Visita)
 *  - Seção 4.5.B (Zona Morta Industrializada floor(0.5 * Sucata) vs Frota Principal da Corporação 0 Sucata / 1 Combustível)
 *  - Seção 4.5.C (Matriz de Elegibilidade Inicial das Blue Options: Alfa = 0, demais = 1)
 *  - Seção 9.3 (STREAM_2_EVENTO_OPCAO_A e STREAM_6_SORTEIO_TEMPLATES)
 */
import { clonarProfundoCongelado } from '../gdd-parser.mjs';
import { streamEventoOpcaoA, streamSorteioTemplates } from '../onda1-fisica/hash32-streams.mjs';
import { CURVA_SAQUE_SETORIAL_56C } from '../onda3-inimigos/abordagem-vitoria.mjs';
import { kitCumpreRequisitoBlueOption } from '../oraculos-referencia.mjs';

export const VELOCIDADE_FRENTE_CORPORATIVA_MN_H = 6.0;

export const CATALOGO_TEMPLATES_EVENTOS_45A = Object.freeze([
  Object.freeze({
    id: 'SOS_1_REDE_ARRASTO',
    categoria: 'SOS',
    nome: '1. Criatura em Rede de Arrasto',
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_COM_CUSTO', recrutaTripulante: 1, danoCasco: 2, sucata: 0, biomassa: 0 },
      p1: { tipo: 'COMBATE_BARCO', danoCasco: 0, sucata: 0, biomassa: 0 },
    },
    requisitoBlueOption: 'TRIPULANTE: 2+ Caranguejo Anfíbio OU ARMA: Cortador Térmico a Plasma',
    recompensaBlueOption: { recrutaTripulante: 1, danoCasco: 0, termoMoeda: 'Biomassa_{bruta}(S)' },
  }),
  Object.freeze({
    id: 'SOS_2_CAPSULA_AFUNDANDO',
    categoria: 'SOS',
    nome: '2. Cápsula Suprimento na Fossa',
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, termoMoeda: 'Sucata_{bruta}(S)', combustivel: 2 },
      p1: { tipo: 'RECOMPENSA_COM_CUSTO', danoCasco: 3, termoMoeda: 'Sucata_{bruta}(S)', combustivel: 0 },
    },
    requisitoBlueOption: 'SISTEMA: Sifão de Propulsão Nv. 3+ OU TRIPULANTE: 2+ Polvo',
    recompensaBlueOption: { danoCasco: 0, termoMoeda: 'Sucata_{captura}(S)', combustivel: 3, municao: 2 },
  }),
  Object.freeze({
    id: 'SOS_3_NINHO_SITIADO',
    categoria: 'SOS',
    nome: '3. Recife-Berçário Sitiado',
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, termoMoeda: 'Biomassa_{cirúrgica}(S)' },
      p1: { tipo: 'COMBATE_MONSTRO', danoCasco: 0, sucata: 0, biomassa: 0 },
    },
    requisitoBlueOption: 'SISTEMA: Bomba Branquial Nv. 2+ OU TRIPULANTE: 2+ Baiacu Espinhoso',
    recompensaBlueOption: { danoCasco: 0, orgaoIntacto: 1, termoMoeda: 'Biomassa_{cirúrgica}(S)' },
  }),
  Object.freeze({
    id: 'SOS_4_COMBOIO_ENCALHADO',
    categoria: 'SOS',
    nome: '4. Cargueiro Corporativo em Pane',
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, termoMoeda: 'Sucata_{captura}(S)' },
      p1: { tipo: 'COMBATE_BARCO', danoCasco: 0, sucata: 0, biomassa: 0 },
    },
    requisitoBlueOption: 'SISTEMA: Glândula de Tinta Furtiva Nv. 2+ OU TRIPULANTE: 2+ Arraia Elétrica',
    recompensaBlueOption: { danoCasco: 0, armaRecuperada: 1, termoMoeda: 'Sucata_{captura}(S)' },
  }),
  Object.freeze({
    id: 'EXP_1_NAUFRAGIO_ANTIGO',
    categoria: 'EXPLORACAO',
    nome: '5. Couraçado Pré-Dilúvio',
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, termoMoeda: 'Sucata_{bruta}(S)' },
      p1: { tipo: 'RECOMPENSA_COM_CUSTO', danoCasco: 3, termoMoeda: 'Sucata_{bruta}(S)' },
    },
    requisitoBlueOption: 'ARMA: Lançador de Torpedo Abissal OU ARMA: Dispersor de Estilhaços',
    recompensaBlueOption: { danoCasco: 0, termoMoeda: 'Sucata_{captura}(S)', municao: 2 },
  }),
  Object.freeze({
    id: 'EXP_2_PLATAFORMA_FANTASMA',
    categoria: 'EXPLORACAO',
    nome: '6. Estação de Sonar Abandonada',
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, termoMoeda: 'Sucata_{bruta}(S)' },
      p1: { tipo: 'COMBATE_BARCO', danoCasco: 0, sucata: 0, biomassa: 0 },
    },
    requisitoBlueOption: 'SISTEMA: Córtex de Navegação Nv. 2+ OU ÓRGÃO: Bolsa de Tinta Abissal',
    recompensaBlueOption: { danoCasco: 0, revelaMapaSetorial: true, termoMoeda: 'Sucata_{bruta}(S)', combustivel: 2 },
  }),
  Object.freeze({
    id: 'EXP_3_CARDUME_SIMBIOTICO',
    categoria: 'EXPLORACAO',
    nome: '7. Cardume Bioluminescente',
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, termoMoeda: 'Biomassa_{bruta}(S)' },
      p1: { tipo: 'RECOMPENSA_COM_CUSTO', danoCasco: 2, termoMoeda: 'Biomassa_{bruta}(S)' },
    },
    requisitoBlueOption: 'SISTEMA: Bomba Branquial Nv. 3+ OU ÓRGÃO: Glândula de Baiacu',
    recompensaBlueOption: { danoCasco: 0, reparaCascoHp: 5, termoMoeda: 'Biomassa_{cirúrgica}(S)' },
  }),
  Object.freeze({
    id: 'PER_1_CHUVA_ACIDA',
    categoria: 'PERIGO',
    nome: '8. Chuva Radioativa Ácida',
    opcaoA: {
      p0: { tipo: 'COMBATE_PERIGO_ACIDO', danoCasco: 0, sucata: 0, biomassa: 0 },
      p1: { tipo: 'COMBATE_PERIGO_ACIDO', danoCasco: 0, sucata: 0, biomassa: 0 },
    },
    requisitoBlueOption: 'SISTEMA: Placas de Blindagem Nv. 2+ OU SISTEMA: Glândula de Barreira Nv. 4+',
    recompensaBlueOption: { danoCasco: 0, neutralizaChuvaAcidaSeg: 30, municaoPosLuta: 2, termoMoeda: null },
  }),
  Object.freeze({
    id: 'PER_2_VORTICE_CORRENTEZA',
    categoria: 'PERIGO',
    nome: '9. Vórtice de Correnteza',
    opcaoA: {
      p0: { tipo: 'COMBATE_PERIGO_VORTICE', penalidadeSustentacaoKg: 40, danoCasco: 0 },
      p1: { tipo: 'COMBATE_PERIGO_VORTICE', penalidadeSustentacaoKg: 40, danoCasco: 0 },
    },
    requisitoBlueOption: 'SISTEMA: Mastro do Foil Nv. 3+ OU SISTEMA: Sifão de Propulsão Nv. 4+',
    recompensaBlueOption: { danoCasco: 0, penalidadeSustentacaoKg: 20, termoMoeda: null },
  }),
  Object.freeze({
    id: 'PER_3_AGUAS_TURVAS',
    categoria: 'PERIGO',
    nome: '10. Águas Turvas Abissais',
    opcaoA: {
      p0: { tipo: 'COMBATE_PERIGO_TURVAS', canalVisibilidade: 'NEGADO_SONAR', danoCasco: 0 },
      p1: { tipo: 'COMBATE_PERIGO_TURVAS', canalVisibilidade: 'NEGADO_SONAR', danoCasco: 0 },
    },
    requisitoBlueOption: 'SISTEMA: Córtex de Navegação Nv. 3+',
    recompensaBlueOption: { danoCasco: 0, canalVisibilidade: 'VISIVEL', termoMoeda: null },
  }),
  Object.freeze({
    id: 'SOS_5_BALEIA_ENCALHADA',
    categoria: 'SOS',
    nome: '11. Baleia-Oficina Encalhada',
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, termoMoeda: 'Biomassa_{bruta}(S)' },
      p1: { tipo: 'RECOMPENSA_COM_CUSTO', danoCasco: 3, termoMoeda: 'Biomassa_{bruta}(S)' },
    },
    requisitoBlueOption: 'SISTEMA: Sifão de Propulsão Nv. 4+ OU ARMA: Lançador de Torpedo Abissal',
    recompensaBlueOption: { danoCasco: 0, orgaoIntacto: 1, termoMoeda: 'Biomassa_{bruta}(S)' },
  }),
  Object.freeze({
    id: 'SOS_6_DESERTORES_PRESOS',
    categoria: 'SOS',
    nome: '12. Mergulhadores Desertores Presos',
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_COM_CUSTO', armaRecuperada: 1, danoCasco: 2 },
      p1: { tipo: 'COMBATE_BARCO', danoCasco: 0, sucata: 0, biomassa: 0 },
    },
    requisitoBlueOption: 'ÓRGÃO: Bexiga de Alta Pressão OU ARMA: Dispersor de Estilhaços',
    recompensaBlueOption: { danoCasco: 0, armaRecuperada: 1, termoMoeda: 'Sucata_{bruta}(S)' },
  }),
  Object.freeze({
    id: 'SOS_7_CARDUME_ENVENENADO',
    categoria: 'SOS',
    nome: '13. Cardume Envenenado por Vazamento',
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_COM_CUSTO', recrutaTripulante: 1, danoCasco: 2 },
      p1: { tipo: 'RECOMPENSA_COM_CUSTO', danoCasco: 3 },
    },
    requisitoBlueOption: 'SISTEMA: Bomba Branquial Nv. 3+ OU ÓRGÃO: Glândula Termofílica',
    recompensaBlueOption: { danoCasco: 0, recrutaTripulante: 1, termoMoeda: 'Biomassa_{bruta}(S)' },
  }),
  Object.freeze({
    id: 'SOS_8_FAROL_SUBMERSO',
    categoria: 'SOS',
    nome: '14. Farol de Socorro Submerso',
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, termoMoeda: 'Sucata_{bruta}(S)', combustivel: 2 },
      p1: { tipo: 'COMBATE_BARCO', danoCasco: 0, sucata: 0, biomassa: 0 },
    },
    requisitoBlueOption: 'SISTEMA: Córtex de Navegação Nv. 3+ OU TRIPULANTE: 2+ Polvo',
    recompensaBlueOption: { danoCasco: 0, revelaMapaSetorial: true, termoMoeda: 'Sucata_{bruta}(S)', combustivel: 3 },
  }),
  Object.freeze({
    id: 'EXP_4_CEMITERIO_DRONES',
    categoria: 'EXPLORACAO',
    nome: '15. Cemitério de Drones Corporativos',
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, termoMoeda: 'Sucata_{bruta}(S)' },
      p1: { tipo: 'RECOMPENSA_COM_CUSTO', danoCasco: 3, termoMoeda: 'Sucata_{bruta}(S)' },
    },
    requisitoBlueOption: 'ARMA: Dispersor de Estilhaços OU SISTEMA: Placas de Blindagem Nv. 1+',
    recompensaBlueOption: { danoCasco: 0, termoMoeda: 'Sucata_{captura}(S)', municao: 2 },
  }),
  Object.freeze({
    id: 'EXP_5_FONTE_HIDROTERMAL',
    categoria: 'EXPLORACAO',
    nome: '16. Fonte Hidrotermal Viva',
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, termoMoeda: 'Biomassa_{bruta}(S)' },
      p1: { tipo: 'RECOMPENSA_COM_CUSTO', danoCasco: 2, termoMoeda: 'Biomassa_{bruta}(S)' },
    },
    requisitoBlueOption: 'ÓRGÃO: Glândula Termofílica OU SISTEMA: Mastro do Foil Nv. 3+',
    recompensaBlueOption: { danoCasco: 0, reparaCascoHp: 5, termoMoeda: 'Biomassa_{cirúrgica}(S)' },
  }),
  Object.freeze({
    id: 'EXP_6_RECIFE_ESPELHO',
    categoria: 'EXPLORACAO',
    nome: '17. Recife-Espelho de Tinta',
    opcaoA: {
      p0: { tipo: 'RECOMPENSA_LIMPA', danoCasco: 0, termoMoeda: 'Biomassa_{bruta}(S)' },
      p1: { tipo: 'COMBATE_MONSTRO', danoCasco: 0, sucata: 0, biomassa: 0 },
    },
    requisitoBlueOption: 'ÓRGÃO: Bolsa de Tinta Abissal OU SISTEMA: Glândula de Tinta Furtiva Nv. 2+',
    recompensaBlueOption: { danoCasco: 0, orgaoIntacto: 1, termoMoeda: 'Biomassa_{bruta}(S)' },
  }),
]);

/**
 * Kits iniciais canônicos das 5 carcaças (Seção 5.4.A) para validação de elegibilidade de Blue Options (Seção 4.5.C).
 */
export const KITS_INICIAIS_5_CARCACAS = Object.freeze({
  CARCACA_ALFA: Object.freeze({
    tripulacao: { POLVO: 1, ARRAIA: 1, BAIACU: 1, CARANGUEJO: 0 },
    armas: ['Canhão de Arpão de Cabo', 'Emissor Acústico I'],
    orgaos: [],
    sistemas: {
      'Artilharia Dorsal': 3,
      'Córtex de Navegação': 1,
      'Bomba Branquial': 1,
      'Glândula de Barreira': 2,
      'Sifão de Propulsão': 2,
      'Mastro do Foil': 1,
      'Tubo Pressurizado': 0,
      'Glândula de Tinta Furtiva': 0,
      'Placas de Blindagem': 0,
    },
  }),
  MANTA_VOLT: Object.freeze({
    tripulacao: { POLVO: 1, ARRAIA: 2, BAIACU: 0, CARANGUEJO: 0 },
    armas: ['Emissor Acústico I', 'Emissor Acústico I'],
    orgaos: ['Eletro-Placa de Arraia'],
    sistemas: {
      'Artilharia Dorsal': 3,
      'Córtex de Navegação': 1,
      'Bomba Branquial': 1,
      'Glândula de Barreira': 2,
      'Sifão de Propulsão': 2,
      'Mastro do Foil': 1,
      'Tubo Pressurizado': 0,
      'Glândula de Tinta Furtiva': 0,
      'Placas de Blindagem': 0,
    },
  }),
  COURACA_LIMIAR: Object.freeze({
    tripulacao: { POLVO: 0, ARRAIA: 0, BAIACU: 1, CARANGUEJO: 2 },
    armas: ['Emissor Acústico I', 'Canhão de Arpão de Cabo'],
    orgaos: [],
    sistemas: {
      'Artilharia Dorsal': 3,
      'Córtex de Navegação': 1,
      'Bomba Branquial': 1,
      'Glândula de Barreira': 0,
      'Sifão de Propulsão': 2,
      'Mastro do Foil': 2,
      'Tubo Pressurizado': 2,
      'Glândula de Tinta Furtiva': 0,
      'Placas de Blindagem': 0,
    },
  }),
  SOMBRA_ABISSAL: Object.freeze({
    tripulacao: { POLVO: 1, ARRAIA: 0, BAIACU: 0, CARANGUEJO: 1 },
    armas: ['Emissor Acústico I', 'Canhão de Arpão de Cabo'],
    orgaos: ['Glândula de Baiacu'],
    sistemas: {
      'Artilharia Dorsal': 3,
      'Córtex de Navegação': 1,
      'Bomba Branquial': 1,
      'Glândula de Barreira': 2,
      'Sifão de Propulsão': 2,
      'Mastro do Foil': 1,
      'Tubo Pressurizado': 0,
      'Glândula de Tinta Furtiva': 1,
      'Placas de Blindagem': 0,
    },
  }),
  COLMEIA_VIVA: Object.freeze({
    tripulacao: { POLVO: 0, ARRAIA: 1, BAIACU: 2, CARANGUEJO: 0 },
    armas: ['Rajada Hidropneumática II', 'Morteiro de Esporos'],
    orgaos: [],
    sistemas: {
      'Artilharia Dorsal': 3,
      'Córtex de Navegação': 1,
      'Bomba Branquial': 1,
      'Glândula de Barreira': 2,
      'Sifão de Propulsão': 2,
      'Mastro do Foil': 1,
      'Tubo Pressurizado': 0,
      'Glândula de Tinta Furtiva': 0,
      'Placas de Blindagem': 0,
    },
  }),
});

/**
 * Sorteia os 10 templates de um setor (3 PERIGO + 4 SOS + 3 EXPLORACAO) sem repetir o setor anterior,
 * usando exclusivamente o STREAM_6 (streamSorteioTemplates).
 */
export function sortearTemplatesDoSetor(seedPartida, setorNumero = 1, idsTemplatesSetorAnterior = []) {
  const anteriores = new Set(idsTemplatesSetorAnterior);
  const perigo = CATALOGO_TEMPLATES_EVENTOS_45A.filter((t) => t.categoria === 'PERIGO').map((t) => t.id);

  const sortearCategoria = (categoria, cota) => {
    const candidatos = CATALOGO_TEMPLATES_EVENTOS_45A.filter(
      (t) => t.categoria === categoria && !anteriores.has(t.id)
    )
      .map((t) => ({
        id: t.id,
        h: streamSorteioTemplates(seedPartida, setorNumero, t.id),
      }))
      .sort((a, b) => a.h - b.h || (a.id < b.id ? -1 : 1));
    if (candidatos.length < cota) {
      throw new Error(`Candidatos insuficientes para ${categoria} no Setor ${setorNumero}`);
    }
    return candidatos.slice(0, cota).map((c) => c.id);
  };

  const sos = sortearCategoria('SOS', 4);
  const exploracao = sortearCategoria('EXPLORACAO', 3);

  return clonarProfundoCongelado({
    perigo,
    sos,
    exploracao,
    todos: [...perigo, ...sos, ...exploracao],
  });
}

const MAPA_NOME_CANONICO_ARMA = Object.freeze({
  EMISSOR_ACUSTICO_I: 'Emissor Acústico I',
  RAJADA_HIDROPNEUMATICA_II: 'Rajada Hidropneumática II',
  EMISSOR_RAJADA_ACUSTICA_II: 'Rajada Hidropneumática II',
  CANHAO_ARPAO_CABO: 'Canhão de Arpão de Cabo',
  DISPERSOR_ESTILHACOS: 'Dispersor de Estilhaços',
  DISPARADOR_ESTILHACOS_QUITINA: 'Dispersor de Estilhaços',
  CORTADOR_TERMICO_PLASMA: 'Cortador Térmico a Plasma',
  CORTADOR_TERMICO: 'Cortador Térmico a Plasma',
  LANCADOR_TORPEDO_ABISSAL: 'Lançador de Torpedo Abissal',
  MORTEIRO_ESPOROS: 'Morteiro de Esporos',
  MORTEIRO_ESPOROS_ACIDOS: 'Morteiro de Esporos',
});

const MAPA_NOME_CANONICO_ORGAO = Object.freeze({
  GLANDULA_BAIACU: 'Glândula de Baiacu',
  GLANDULA_VENENO_BAIACU: 'Glândula de Baiacu',
  ELETRO_PLACA_ARRAIA: 'Eletro-Placa de Arraia',
  BEXIGA_ALTA_PRESSAO: 'Bexiga de Alta Pressão',
  BOLSA_TINTA_ABISSAL: 'Bolsa de Tinta Abissal',
  DENTE_SERRILHADO_LEVIATA: 'Dente Serrilhado de Leviatã',
  GLANDULA_TERMOFILICA: 'Glândula Termofílica',
});

/**
 * Extrai o kit atual de uma nave em GameState para verificar requisitos de Blue Option.
 */
export function extrairKitDaNave(naveJogador) {
  const tripulacao = { POLVO: 0, ARRAIA: 0, BAIACU: 0, CARANGUEJO: 0 };
  for (const t of naveJogador.tripulacao ?? []) {
    if (t.hpAtual > 0) {
      tripulacao[t.especie] = (tripulacao[t.especie] ?? 0) + 1;
    }
  }
  const normalizarArma = (idOuNome) => MAPA_NOME_CANONICO_ARMA[idOuNome] ?? String(idOuNome ?? '').replace(/^\d+\.\s*/, '');
  const normalizarOrgao = (idOuNome) => MAPA_NOME_CANONICO_ORGAO[idOuNome] ?? String(idOuNome ?? '').replace(/^\d+\.\s*/, '');

  const armas = [];
  const orgaos = [];
  for (const slot of naveJogador.armasAtivas ?? []) {
    const objArma = slot?.arma !== undefined ? slot.arma : slot;
    if (!objArma) continue;
    const chaveArma = objArma.chassiId ?? objArma.idArma ?? objArma.id ?? objArma.nome;
    if (chaveArma) armas.push(normalizarArma(chaveArma));
    for (const o of objArma.orgaosEnxertados ?? []) {
      const chaveOrgao = typeof o === 'object' && o !== null ? (o.id ?? o.nome) : o;
      if (chaveOrgao) orgaos.push(normalizarOrgao(chaveOrgao));
    }
  }
  for (const entradaPorao of naveJogador.poraoCarga ?? []) {
    const item = entradaPorao?.item !== undefined ? entradaPorao.item : entradaPorao;
    if (!item) continue;
    const chave = item.chassiId ?? item.idArma ?? item.id ?? item.nome;
    if (item.tipo === 'ARMA' || MAPA_NOME_CANONICO_ARMA[chave]) {
      armas.push(normalizarArma(chave));
    } else if (item.tipo === 'ORGAO' || MAPA_NOME_CANONICO_ORGAO[chave]) {
      orgaos.push(normalizarOrgao(chave));
    }
  }

  const camaraObj = (id) => naveJogador.camaras?.find((c) => c.id === id);
  const camaraNivel = (id) => {
    const c = camaraObj(id);
    return Number(c?.nivelMax ?? c?.nivelMaxBarras ?? 0);
  };
  const mastroBruto = camaraNivel(6);
  const nivelMastro = mastroBruto >= 4 ? mastroBruto - 3 : mastroBruto;
  const sistemas = {
    'Artilharia Dorsal': camaraNivel(1),
    'Córtex de Navegação': camaraNivel(2),
    'Bomba Branquial': camaraNivel(3),
    'Glândula de Barreira': camaraNivel(4),
    'Sifão de Propulsão': camaraNivel(5),
    'Mastro do Foil': nivelMastro,
    'Tubo Pressurizado': camaraNivel(7),
    'Glândula de Tinta Furtiva': camaraNivel(8),
    'Placas de Blindagem': naveJogador.nivelBlindagem ?? 0,
  };
  return { tripulacao, armas, orgaos, sistemas };
}

/**
 * Avalia a Matriz de Elegibilidade Inicial das 5 carcaças (Seção 4.5.C).
 */
export function avaliarMatrizElegibilidadeInicial45C() {
  const matriz = {};
  for (const [idCarcaca, kit] of Object.entries(KITS_INICIAIS_5_CARCACAS)) {
    const elegiveis = CATALOGO_TEMPLATES_EVENTOS_45A.filter((t) =>
      kitCumpreRequisitoBlueOption(t.requisitoBlueOption, kit)
    ).map((t) => t.id);
    matriz[idCarcaca] = {
      templatesElegiveis: elegiveis,
      total: elegiveis.length,
    };
  }
  return clonarProfundoCongelado(matriz);
}

function resolverMoedaPorTermo(termoMoeda, setorNumero) {
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
 * Resolve de forma determinística a visita e escolha em um nó do mapa (SOS, EXPLORACAO, PERIGO,
 * SOS Expirado = ZONA_MORTA_INDUSTRIALIZADA ou Nó Engolido = FROTA_PRINCIPAL_CORPORACAO).
 */
export function resolverVisitaNoMapa({
  seedPartida,
  setorNumero = 1,
  relogioSetorHoras = 0,
  noMapa,
  kitOuNave = KITS_INICIAIS_5_CARCACAS.CARCACA_ALFA,
  opcaoEscolhida = 'A',
  modalidadeVitoriaCombate = 'DESTRUICAO_BRUTA',
}) {
  const frenteCorporacaoMn = Math.round(VELOCIDADE_FRENTE_CORPORATIVA_MN_H * relogioSetorHoras * 100) / 100;
  const linhaSaque = CURVA_SAQUE_SETORIAL_56C[setorNumero] ?? CURVA_SAQUE_SETORIAL_56C[1];

  // 1. Verifica se o nó foi engolido pela Frente Extrativista da Corporação (X_no <= 6.0 * t_atual, exceto nó inicial em t=0)
  if (relogioSetorHoras > 0 && noMapa.xMn <= frenteCorporacaoMn) {
    return clonarProfundoCongelado({
      estadoNo: 'FROTA_PRINCIPAL_CORPORACAO',
      combateObrigatorio: true,
      bonusBarreiraInimigo: 1,
      opcoesDisponiveis: [],
      saquePosCombate: {
        sucata: 0,
        biomassa: 0,
        combustivel: 1,
        municao: 0,
      },
    });
  }

  // 2. Verifica se é um nó SOS Expirado (t_atual > T_prazo)
  if (noMapa.tipoNo === 'SOS' && noMapa.tPrazoHoras !== null && relogioSetorHoras > noMapa.tPrazoHoras) {
    const sucataModalidade =
      modalidadeVitoriaCombate === 'CAPTURA_INTACTA'
        ? linhaSaque.barcoCapturaSucata
        : linhaSaque.barcoBrutoSucata;
    return clonarProfundoCongelado({
      estadoNo: 'ZONA_MORTA_INDUSTRIALIZADA',
      combateObrigatorio: true,
      bonusBarreiraInimigo: 0,
      opcoesDisponiveis: [],
      saquePosCombate: {
        sucata: Math.floor(0.5 * sucataModalidade),
        biomassa: 0,
        combustivel: 0,
        municao: 0,
      },
    });
  }

  const template = CATALOGO_TEMPLATES_EVENTOS_45A.find((t) => t.id === noMapa.idTemplateEvento);
  if (!template) {
    return clonarProfundoCongelado({
      estadoNo: 'COMBATE_PADRAO',
      combateObrigatorio: noMapa.tipoNo === 'COMBATE',
      opcoesDisponiveis: [],
    });
  }

  const kit = kitOuNave.tripulacao && !Array.isArray(kitOuNave.tripulacao)
    ? kitOuNave
    : extrairKitDaNave(kitOuNave);
  const cumpreBlueOption = kitCumpreRequisitoBlueOption(template.requisitoBlueOption, kit);

  const opcoesDisponiveis = ['A'];
  if (cumpreBlueOption) opcoesDisponiveis.push('B');
  if (template.categoria !== 'PERIGO') opcoesDisponiveis.push('C');

  if (opcaoEscolhida === 'C') {
    if (template.categoria === 'PERIGO') {
      return clonarProfundoCongelado({
        estadoNo: 'EVENTO_ATIVO',
        aceito: false,
        marcadorRejeicao: 'BLOQUEADO_COMBATE_OBRIGATORIO',
        combateObrigatorio: true,
        opcoesDisponiveis,
      });
    }
    return clonarProfundoCongelado({
      estadoNo: 'EVENTO_ATIVO',
      aceito: true,
      resultadoEscolha: 'RECUO_SEGURO',
      combateObrigatorio: false,
      danoCasco: 0,
      moedaGerada: { sucata: 0, biomassa: 0, totalMoeda: 0, tetoCapturaSetor: linhaSaque.barcoCapturaSucata },
      opcoesDisponiveis,
    });
  }

  if (opcaoEscolhida === 'B') {
    if (!cumpreBlueOption) {
      return clonarProfundoCongelado({
        estadoNo: 'EVENTO_ATIVO',
        aceito: false,
        marcadorRejeicao: 'PRECONDICAO_NAO_ATENDIDA',
        combateObrigatorio: template.categoria === 'PERIGO',
        opcoesDisponiveis,
      });
    }
    const moeda = resolverMoedaPorTermo(template.recompensaBlueOption.termoMoeda, setorNumero);
    return clonarProfundoCongelado({
      estadoNo: 'EVENTO_ATIVO',
      aceito: true,
      resultadoEscolha: 'SUCESSO_CRITICO_BLUE_OPTION',
      combateObrigatorio: template.categoria === 'PERIGO',
      danoCasco: 0,
      recompensaBlueOption: template.recompensaBlueOption,
      moedaGerada: moeda,
      opcoesDisponiveis,
    });
  }

  // Opção A: Paridade determinística via STREAM_2 (hash32(seedPartida, 'EVENTO_NO', setorNumero, noId) % 2)
  const paridade = streamEventoOpcaoA(seedPartida, setorNumero, noMapa.id) % 2;
  const ramoA = paridade === 0 ? template.opcaoA.p0 : template.opcaoA.p1;
  const moeda = resolverMoedaPorTermo(ramoA.termoMoeda, setorNumero);
  const levaACombate = ramoA.tipo.startsWith('COMBATE_');

  return clonarProfundoCongelado({
    estadoNo: 'EVENTO_ATIVO',
    aceito: true,
    resultadoEscolha: paridade === 0 ? 'SUCESSO_PADRAO_A' : 'COMPLICACAO_PADRAO_A',
    paridadeSeed: paridade,
    combateObrigatorio: levaACombate,
    danoCasco: ramoA.danoCasco ?? 0,
    moedaGerada: moeda,
    opcoesDisponiveis,
  });
}
