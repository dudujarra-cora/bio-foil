/**
 * Oráculos puros de referência da Onda 0 (Seção 8.3 do Vol. 08).
 * Cada função implementa uma regra do GDD de forma mínima e determinística, para que os portões
 * conferam o GDD contra um cálculo independente e, depois, para teste diferencial dos módulos das Ondas 1..6.
 * Nada aqui é o produto final: o dono de cada regra no jogo é o módulo indicado na árvore 8.3.
 */
import { clonarProfundoCongelado } from './gdd-parser.mjs';

/**
 * Calcula a rota mínima entre duas câmaras da bio-nave aplicando a regra determinística de desempate da Seção 1.6.A:
 * prioriza o passo vertical na mesma coluna antes do passo horizontal/ventral quando dois caminhos têm o mesmo número de saltos.
 */
export function calcularRotaMinimaCamaras(camaras, idOrigem, idDestino) {
  if (idOrigem === idDestino) {
    return clonarProfundoCongelado({ saltos: 0, rota: [idOrigem] });
  }
  const porId = Object.fromEntries(camaras.map((c) => [c.id, c]));
  if (!porId[idOrigem] || !porId[idDestino]) {
    throw new Error(`Câmara inválida em calcularRotaMinimaCamaras: ${idOrigem} -> ${idDestino}`);
  }

  const fila = [[idOrigem]];
  const menorDistPorNo = { [idOrigem]: 0 };
  const rotasMinimas = [];

  while (fila.length > 0) {
    const caminho = fila.shift();
    const atual = caminho[caminho.length - 1];
    const distAtual = caminho.length - 1;

    if (rotasMinimas.length > 0 && distAtual >= rotasMinimas[0].length - 1) {
      continue;
    }

    const camaraAtual = porId[atual];
    // Ordena vizinhos priorizando passo vertical na mesma coluna antes de passo horizontal/ventral
    const vizinhosOrdenados = [...camaraAtual.vizinhos].sort((a, b) => {
      const ca = porId[a];
      const cb = porId[b];
      const aMesmaColuna = ca.coluna === camaraAtual.coluna ? 0 : 1;
      const bMesmaColuna = cb.coluna === camaraAtual.coluna ? 0 : 1;
      return aMesmaColuna - bMesmaColuna || a - b;
    });

    for (const viz of vizinhosOrdenados) {
      if (caminho.includes(viz)) continue;
      const novoCaminho = [...caminho, viz];
      const novaDist = novoCaminho.length - 1;
      if (viz === idDestino) {
        rotasMinimas.push(novoCaminho);
      } else if (menorDistPorNo[viz] === undefined || novaDist <= menorDistPorNo[viz]) {
        menorDistPorNo[viz] = novaDist;
        fila.push(novoCaminho);
      }
    }
  }

  if (rotasMinimas.length === 0) {
    throw new Error(`Sem caminho entre câmaras ${idOrigem} e ${idDestino}`);
  }

  return clonarProfundoCongelado({
    saltos: rotasMinimas[0].length - 1,
    rota: rotasMinimas[0],
    todasRotasMinimas: rotasMinimas,
  });
}

/**
 * Resolve 1 tick de combate corpo-a-corpo numa sala conforme a Seção 1.6.B:
 * - Limite de lotação: máx. 2 aliados + 2 inimigos estacionados;
 * - Foco determinístico integral (100% do DPS somado) no Slot 1 adversário (índice 0);
 * - Reflexão de 50% do próprio DPS de cada atacante quando o defensor no Slot 1 é um Baiacu inflado.
 */
export function resolverTickCombateCorpoACorpoSala({ aliados, inimigos, dtSeg = 1.0 }) {
  if (aliados.length > 2 || inimigos.length > 2) {
    throw new Error(
      `[Seção 1.6.B Stacking Limit] Sala excedeu limite de 2 aliados (${aliados.length}) ou 2 inimigos (${inimigos.length})`
    );
  }
  const novosAliados = aliados.map((a) => ({ ...a, acopladoBulbo: aliados.length > 0 && inimigos.length > 0 ? false : a.acopladoBulbo }));
  const novosInimigos = inimigos.map((i) => ({ ...i }));

  if (novosAliados.length > 0 && novosInimigos.length > 0) {
    const dpsTotalAliados = novosAliados.reduce((acc, a) => acc + a.dps, 0);
    const dpsTotalInimigos = novosInimigos.reduce((acc, i) => acc + i.dps, 0);

    // 100% do DPS aliado foca no Slot 1 inimigo (índice 0)
    novosInimigos[0].hpAtual = Math.max(0, novosInimigos[0].hpAtual - dpsTotalAliados * dtSeg);

    // 100% do DPS inimigo foca no Slot 1 aliado (índice 0)
    novosAliados[0].hpAtual = Math.max(0, novosAliados[0].hpAtual - dpsTotalInimigos * dtSeg);

    // Se o Slot 1 aliado for Baiacu inflado, reflete 50% do próprio DPS de cada atacante inimigo
    if (novosAliados[0].inflado === true) {
      for (const inimigo of novosInimigos) {
        inimigo.hpAtual = Math.max(0, inimigo.hpAtual - 0.5 * inimigo.dps * dtSeg);
      }
    }
  }

  return clonarProfundoCongelado({
    aliados: novosAliados,
    inimigos: novosInimigos,
  });
}

/**
 * Valida e enumera traçados de 3 salas distintas (S1 -> S2 -> S3, com S3 != S1) do Cortador Térmico a Plasma (Seção 1.6.C).
 */
export function validarTracadoBeamOrtogonal(grafoOrtogonal, trincaSalas) {
  if (!Array.isArray(trincaSalas) || trincaSalas.length !== 3) {
    return false;
  }
  const [s1, s2, s3] = trincaSalas;
  if (s1 === s2 || s2 === s3 || s1 === s3) {
    return false;
  }
  const vizS1 = grafoOrtogonal[s1] ?? [];
  const vizS2 = grafoOrtogonal[s2] ?? [];
  return vizS1.includes(s2) && vizS2.includes(s3);
}

export function enumerarTracadosBeamValidos(grafoOrtogonal) {
  const nos = Object.keys(grafoOrtogonal);
  const tracados = [];
  for (const s1 of nos) {
    for (const s2 of grafoOrtogonal[s1] ?? []) {
      for (const s3 of grafoOrtogonal[s2] ?? []) {
        const s1Norm = typeof s2 === 'number' ? Number(s1) : s1;
        if (validarTracadoBeamOrtogonal(grafoOrtogonal, [s1Norm, s2, s3])) {
          tracados.push([s1Norm, s2, s3]);
        }
      }
    }
  }
  return clonarProfundoCongelado(tracados);
}

/**
 * Motor Matemático Canônico do Bio-Foil (usado na Junção N1 contra os documentos 01..06).
 */
export function calcularPesoTotalNave({
  pesoChassiKg,
  aguaPorCamaraKg,
  pesosArmasAtivasKg = [],
  pesosCargaPoraoKg = [],
  quantidadeOrgaosEnxertados = 0,
  nivelBlindagem = 0,
}) {
  if (!Array.isArray(aguaPorCamaraKg) || aguaPorCamaraKg.length !== 8) {
    throw new Error(`A nave exige exatamente 8 câmaras (recebido: ${aguaPorCamaraKg?.length})`);
  }
  const somaAgua = aguaPorCamaraKg.reduce((acc, v) => acc + v, 0);
  const somaArmas = pesosArmasAtivasKg.reduce((acc, v) => acc + v, 0);
  const somaPorao = pesosCargaPoraoKg.reduce((acc, v) => acc + v, 0);
  const somaOrgaos = quantidadeOrgaosEnxertados * 5;
  const somaBlindagem = nivelBlindagem * 15;
  return pesoChassiKg + somaAgua + somaArmas + somaPorao + somaOrgaos + somaBlindagem;
}

export function calcularSustentacaoAtual({
  barrasIntactasMastro,
  barrasEnergiaSifao,
  aguaTotalTanquesKg,
}) {
  if (barrasIntactasMastro <= 0 || barrasEnergiaSifao <= 0) {
    return 0;
  }
  const tabelaMastroPorBarras = {
    1: 50,
    2: 100,
    3: 150,
    4: 200,
    5: 240,
    6: 280,
    7: 330,
  };
  const baseMastro = tabelaMastroPorBarras[barrasIntactasMastro];
  if (baseMastro === undefined) {
    throw new Error(`Barras de mastro fora do intervalo [0..7]: ${barrasIntactasMastro}`);
  }
  const empuxoSifao = barrasEnergiaSifao * 30;
  const deficitCavitacaoKg = Math.max(0, 62.5 - aguaTotalTanquesKg);
  const penalidadeCavitacao = deficitCavitacaoKg * 2;
  return Math.max(0, baseMastro + empuxoSifao - penalidadeCavitacao);
}

export function calcularVelocidadeCruzeiro({ sustentacaoAtualKg, pesoTotalKg }) {
  if (sustentacaoAtualKg <= 0 || pesoTotalKg <= 0) {
    return 0;
  }
  const velocidadeBruta = 9.5 * (sustentacaoAtualKg / pesoTotalKg);
  return Math.min(15.0, Math.round(velocidadeBruta * 10) / 10);
}

export function calcularTempoRecargaArma({
  tempoChassiSeg,
  penalidadeOrgaosSeg = 0,
  reducaoOperador = 0,
  emTouchdown = false,
}) {
  const reducaoTouchdown = emTouchdown ? 0.25 : 0;
  const multiplicador = Math.max(0.5, 1.0 - reducaoOperador - reducaoTouchdown);
  return Math.round((tempoChassiSeg + penalidadeOrgaosSeg) * multiplicador * 1000) / 1000;
}

/**
 * Avaliador puro determinístico de estado de nó especial (SOS, Exploração, Perigo),
 * opções disponíveis (A/B/C) e saque pós-combate (SOS Expirado vs Frente Corporativa).
 */
export function resolverEventoNoESaque(
  catalogoEventos,
  economiaSetorial,
  {
    idEvento,
    setor = 1,
    tAtualHoras = 0,
    tRotaMinimaHoras = 2.0,
    xNoMn = 50,
    modalidadeVit = 'DESTRUICAO_BRUTA',
    temRequisitoBlueOption = false,
    escolha = 'A',
    paridadeSeed = 0,
  }
) {
  const template = catalogoEventos.templates.find((t) => t.id === idEvento);
  if (!template) {
    throw new Error(`[EVENTO FALHOU] Template de evento inexistente: "${idEvento}"`);
  }

  const {
    margemPrazoHoras,
    estadoSosExpirado,
    multiplicadorSucataSosExpirado,
    combustivelSosExpirado,
    municaoSosExpirado,
    velocidadeFrenteCorporativaMnPorHora,
    bonusBarreiraFrenteCorporativa,
    saqueFrenteCorporativa,
  } = catalogoEventos.regrasSosEFrente;

  // 1. Verifica se o nó já foi engolido pela Frente Extrativista da Corporação
  if (xNoMn <= velocidadeFrenteCorporativaMnPorHora * tAtualHoras) {
    return clonarProfundoCongelado({
      estadoNo: 'FROTA_PRINCIPAL_CORPORACAO',
      opcoesDisponiveis: [],
      combateObrigatorio: true,
      bonusBarreiraInimigo: bonusBarreiraFrenteCorporativa,
      saquePosCombate: { ...saqueFrenteCorporativa },
    });
  }

  // 2. Verifica se é um nó SOS cujo relógio ultrapassou T_prazo = T_rota_minima + margemPrazoHoras
  const tPrazo = tRotaMinimaHoras + margemPrazoHoras;
  if (template.categoria === 'SOS' && tAtualHoras > tPrazo) {
    const linhaSaque = economiaSetorial.curvaSetores.find((s) => s.setor === setor);
    if (!linhaSaque) {
      throw new Error(`[EVENTO FALHOU] Setor ${setor} ausente na curva setorial 5.6.C`);
    }
    const sucataBase =
      modalidadeVit === 'CAPTURA_INTACTA'
        ? linhaSaque.barcoCapturaSucata
        : linhaSaque.barcoBrutoSucata;
    const sucataExpirado = Math.floor(multiplicadorSucataSosExpirado * sucataBase);
    return clonarProfundoCongelado({
      estadoNo: estadoSosExpirado,
      opcoesDisponiveis: [],
      combateObrigatorio: true,
      bonusBarreiraInimigo: 0,
      saquePosCombate: {
        sucata: sucataExpirado,
        biomassa: 0,
        combustivel: combustivelSosExpirado,
        municao: municaoSosExpirado,
      },
    });
  }

  // 3. Nó de evento ativo dentro do prazo
  const opcoesDisponiveis = ['A'];
  if (temRequisitoBlueOption) opcoesDisponiveis.push('B');
  if (template.categoria !== 'PERIGO') opcoesDisponiveis.push('C');

  if (escolha === 'B') {
    if (!temRequisitoBlueOption) {
      throw new Error(
        `[EVENTO FALHOU] Opção B (Blue Option) indisponível para "${idEvento}" sem cumprir requisito`
      );
    }
    return clonarProfundoCongelado({
      estadoNo: 'EVENTO_ATIVO',
      opcoesDisponiveis,
      combateObrigatorio: template.categoria === 'PERIGO',
      resultadoEscolha: 'SUCESSO_CRITICO_BLUE_OPTION',
      taxaSucessoCriticoPct: catalogoEventos.regrasOpcoes.taxaSucessoCriticoBlueOption,
      danoCasco: catalogoEventos.regrasOpcoes.danoCascoBlueOption,
      recompensaBlueOption: template.recompensaBlueOption,
    });
  }

  if (escolha === 'C') {
    if (template.categoria === 'PERIGO') {
      throw new Error(
        `[EVENTO FALHOU] Opção C bloqueada em nó PERIGO: ${catalogoEventos.regrasOpcoes.marcadorOpcaoCPerigo}`
      );
    }
    return clonarProfundoCongelado({
      estadoNo: 'EVENTO_ATIVO',
      opcoesDisponiveis,
      combateObrigatorio: false,
      resultadoEscolha: 'RECUO_SEGURO',
      danoCasco: 0,
    });
  }

  return clonarProfundoCongelado({
    estadoNo: 'EVENTO_ATIVO',
    opcoesDisponiveis,
    combateObrigatorio: template.categoria === 'PERIGO',
    resultadoEscolha: paridadeSeed === 0 ? 'SUCESSO_PADRAO_A' : 'COMPLICACAO_PADRAO_A',
    paridadeSeed,
  });
}

/**
 * Validador puro de despacho de comando da UI para o motor (Seção 8.5.A + 8.5.C).
 */
export function validarDespachoComando(especVol08, contextoEstado, comando) {
  const def = especVol08.comandos.find((c) => c.tipo === comando?.tipo);
  if (!def) {
    throw new Error(`[ACTION SCHEMA FALHOU] Comando desconhecido fora da Seção 8.5.A: "${comando?.tipo}"`);
  }

  if (!def.fasesPermitidas.includes(contextoEstado.faseJogo)) {
    return clonarProfundoCongelado({
      aceito: false,
      estadoInalterado: true,
      marcadorRejeicao: 'REJEITADO_FASE_INVALIDA',
      cueEmitido: null,
    });
  }

  if (
    (comando.tipo === 'ALTERNAR_VALVULA' || comando.tipo === 'DRENAR_TUDO') &&
    contextoEstado.estadoFisico !== '1_NO_FOIL'
  ) {
    return clonarProfundoCongelado({
      aceito: false,
      estadoInalterado: true,
      marcadorRejeicao: def.marcadorRejeicao,
      cueEmitido: 'CUE_TRAVA_HIDROSTATICA',
    });
  }

  if (comando.tipo === 'LANCAR_ABORDAGEM' && (contextoEstado.blindagemTermicaExternaPts ?? 0) > 0) {
    return clonarProfundoCongelado({
      aceito: false,
      estadoInalterado: true,
      marcadorRejeicao: def.marcadorRejeicao,
      cueEmitido: null,
    });
  }

  if (
    comando.tipo === 'ESCOLHER_OPCAO_EVENTO' &&
    comando.payload?.opcao === 'C' &&
    contextoEstado.categoriaEvento === 'PERIGO'
  ) {
    return clonarProfundoCongelado({
      aceito: false,
      estadoInalterado: true,
      marcadorRejeicao: def.marcadorRejeicao,
      cueEmitido: null,
    });
  }

  return clonarProfundoCongelado({
    aceito: true,
    estadoInalterado: false,
    marcadorRejeicao: null,
    cueEmitido:
      comando.tipo === 'MERGULHO_TATICO' && comando.payload?.recolherFoil === true
        ? 'CUE_ESTOL_TOUCHDOWN'
        : null,
  });
}

const OPERADORES_PREDICADO = Object.freeze({
  '>=': (a, b) => a >= b,
  '<=': (a, b) => a <= b,
  '===': (a, b) => a === b,
  '>': (a, b) => a > b,
  '<': (a, b) => a < b,
});

/**
 * Interpreta literalmente um predicado da Seção 8.5.B: conjunção `&&` de comparações `campo op valor`,
 * com valor numérico, `true` ou `false`. Sintaxe fora disso lança erro (nada de eval).
 */
export function avaliarPredicadoDesbloqueio(predicadoCodigo, contexto) {
  const termos = String(predicadoCodigo).split('&&').map((t) => t.trim());
  return termos.every((termo) => {
    const m = termo.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(>=|<=|===|>|<)\s*(-?\d+(?:\.\d+)?|true|false)$/);
    if (!m) {
      throw new Error(`[PREDICADO 8.5.B FALHOU] Termo fora da sintaxe canônica: "${termo}"`);
    }
    const valor = m[3] === 'true' ? true : m[3] === 'false' ? false : Number(m[3]);
    return OPERADORES_PREDICADO[m[2]](contexto[m[1]], valor);
  });
}

/**
 * Extrai os limiares numéricos (`campo op número`) de um predicado da Seção 8.5.B.
 */
export function extrairLimiaresPredicado(predicadoCodigo) {
  return [...String(predicadoCodigo).matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*(>=|<=|===|>|<)\s*(-?\d+(?:\.\d+)?)/g)].map(
    (m) => ({ campo: m[1], operador: m[2], valor: Number(m[3]) })
  );
}

/**
 * Avaliador puro de desbloqueio de carcaças no profile.json (Seção 8.5.B): usa o predicado escrito no GDD.
 */
export function avaliarDesbloqueioCarcacas(especVol08, contexto = {}) {
  const mapa = {};
  for (const c of especVol08.carcacasPerfil) {
    mapa[c.idArquitetura] =
      c.estadoInicialDesbloqueado === true || avaliarPredicadoDesbloqueio(c.predicadoCodigo, contexto);
  }
  return clonarProfundoCongelado(mapa);
}

const ESPECIE_POR_PALAVRA = Object.freeze({
  POLVO: 'POLVO',
  ARRAIA: 'ARRAIA',
  BAIACU: 'BAIACU',
  CARANGUEJO: 'CARANGUEJO',
});

function semAcento(texto) {
  return String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

/**
 * Lê um requisito de Blue Option da Seção 4.5.A ("TIPO: [N+ ]Nome[ Nv. N+]" unidos por " OU ").
 */
export function lerRequisitoBlueOption(requisitoTexto) {
  return String(requisitoTexto)
    .split(' OU ')
    .map((alt) => alt.trim())
    .map((alt) => {
      const m = alt.match(/^(TRIPULANTE|ARMA|ÓRGÃO|SISTEMA):\s*(.+)$/);
      if (!m) {
        throw new Error(`[BLUE OPTION FALHOU] Alternativa fora do formato canônico: "${alt}"`);
      }
      const tipo = m[1];
      let resto = m[2].trim();
      if (tipo === 'TRIPULANTE') {
        const mq = resto.match(/^(?:(\d+)\+\s+)?(.+)$/);
        const especie = ESPECIE_POR_PALAVRA[semAcento(mq[2].split(' ')[0])];
        if (!especie) throw new Error(`[BLUE OPTION FALHOU] Espécie desconhecida: "${mq[2]}"`);
        return { tipo, especie, quantidadeMin: Number(mq[1] ?? 1), texto: alt };
      }
      if (tipo === 'SISTEMA') {
        const ms = resto.match(/^(.+?)\s+Nv\.\s*(\d+)\+$/);
        if (!ms) throw new Error(`[BLUE OPTION FALHOU] Sistema sem nível mínimo "Nv. N+": "${alt}"`);
        return { tipo, sistema: ms[1].trim(), nivelMin: Number(ms[2]), texto: alt };
      }
      return { tipo, nome: resto, texto: alt };
    });
}

/**
 * Diz se um kit inicial (Seção 5.4.A) cumpre um requisito de Blue Option.
 */
export function kitCumpreRequisitoBlueOption(requisitoTexto, kit) {
  return lerRequisitoBlueOption(requisitoTexto).some((alt) => {
    if (alt.tipo === 'TRIPULANTE') return (kit.tripulacao[alt.especie] ?? 0) >= alt.quantidadeMin;
    if (alt.tipo === 'ARMA') return kit.armas.some((a) => semAcento(a).includes(semAcento(alt.nome)));
    if (alt.tipo === 'ÓRGÃO') return kit.orgaos.some((o) => semAcento(o).includes(semAcento(alt.nome)));
    if (!(alt.sistema in kit.sistemas)) {
      throw new Error(`[BLUE OPTION FALHOU] Sistema "${alt.sistema}" não existe no kit da Seção 5.4.A`);
    }
    return kit.sistemas[alt.sistema] >= alt.nivelMin;
  });
}

/**
 * Moeda (Sucata + Biomassa) que um trecho de opção de evento rende no setor S, a partir da curva 5.6.C.
 * Lança erro se houver menção a moeda que não seja um termo canônico (nada de moeda escondida).
 */
export function calcularMoedaTrechoEvento(trechoNormalizado, linhaCurvaSetor) {
  const valorTermo = {
    'Sucata_{bruta}(S)': linhaCurvaSetor.barcoBrutoSucata,
    'Sucata_{captura}(S)': linhaCurvaSetor.barcoCapturaSucata,
    'Biomassa_{bruta}(S)': linhaCurvaSetor.monstroBrutoBiomassa,
    'Biomassa_{cirúrgica}(S)': linhaCurvaSetor.monstroCirurgicoBiomassa,
  };
  let moeda = 0;
  let termosReconhecidos = 0;
  for (const m of trechoNormalizado.matchAll(/(Sucata|Biomassa)_\{(bruta|captura|cirúrgica)\}\(S\)/g)) {
    moeda += valorTermo[m[0]];
    termosReconhecidos += 1;
  }
  for (const m of trechoNormalizado.matchAll(/(\d+)\s+(Sucata|Biomassa)\b/g)) {
    moeda += Number(m[1]);
    termosReconhecidos += 1;
  }
  const mencoes = (trechoNormalizado.match(/Sucata|Biomassa/g) ?? []).length;
  if (mencoes !== termosReconhecidos) {
    throw new Error(`[TETO POR VISITA FALHOU] Menção a moeda fora dos termos canônicos: "${trechoNormalizado}"`);
  }
  return { moeda, temCombate: /Combate/.test(trechoNormalizado) };
}

/**
 * Sorteio determinístico dos templates de um setor (Seção 4.5.A + STREAM_6 da Seção 9.3).
 */
export function sortearTemplatesSetor(catalogoEventos, seedPartida, setorNumero, idsSetorAnterior = [], cotas = { SOS: 4, EXPLORACAO: 3 }) {
  const anteriores = new Set(idsSetorAnterior);
  const escolhidos = catalogoEventos.templates.filter((t) => t.categoria === 'PERIGO').map((t) => t.id);
  for (const [categoria, cota] of Object.entries(cotas)) {
    const candidatos = catalogoEventos.templates
      .filter((t) => t.categoria === categoria && !anteriores.has(t.id))
      .map((t) => ({ id: t.id, h: calcularHash32StreamDeterministico(seedPartida, 'EVENTO_SORTEIO', setorNumero, t.id) }))
      .sort((a, b) => a.h - b.h || (a.id < b.id ? -1 : 1));
    if (candidatos.length < cota) {
      throw new Error(`[SORTEIO FALHOU] Categoria ${categoria} sem candidatos suficientes no Setor ${setorNumero}`);
    }
    escolhidos.push(...candidatos.slice(0, cota).map((c) => c.id));
  }
  return clonarProfundoCongelado(escolhidos);
}

function distribuicaoBinomial(n, p) {
  const comb = (k) => {
    let r = 1;
    for (let i = 1; i <= k; i += 1) r = (r * (n - k + i)) / i;
    return r;
  };
  return Array.from({ length: n + 1 }, (_, k) => comb(k) * p ** k * (1 - p) ** (n - k));
}

/**
 * Distribuição exata do TTK da Fase 3 (cadeia de Markov sobre salvas sincronizadas — Falha Global 7 do Vol. 05).
 * Blindagem absorve H + feixe por salva; depois, a salva só fura o casco com H >= bolhas e causa (H - bolhas) + feixe.
 */
export function calcularDistribuicaoTtkFase3({ projeteisPorSalva, probAcerto, danoFeixe, bolhas, blindagem, casco, intervaloSalvaSeg, maxSalvas = 60 }) {
  const P = distribuicaoBinomial(projeteisPorSalva, probAcerto);
  let estados = new Map([[`B${blindagem}`, 1]]);
  const fimEm = Array(maxSalvas + 1).fill(0);
  for (let n = 1; n <= maxSalvas; n += 1) {
    const prox = new Map();
    for (const [chave, pr] of estados) {
      const fase = chave[0];
      const v = Number(chave.slice(1));
      for (let h = 0; h <= projeteisPorSalva; h += 1) {
        const q = pr * P[h];
        let destino;
        if (fase === 'B') {
          const resto = v - (h + danoFeixe);
          destino = resto <= 0 ? `C${casco}` : `B${resto}`;
        } else {
          const dano = h >= bolhas ? h - bolhas + danoFeixe : 0;
          const resto = v - dano;
          if (resto <= 0) {
            fimEm[n] += q;
            continue;
          }
          destino = `C${resto}`;
        }
        prox.set(destino, (prox.get(destino) ?? 0) + q);
      }
    }
    estados = prox;
  }
  let esperado = 0;
  let acumulado = 0;
  let mediana = null;
  let p90 = null;
  for (let n = 1; n <= maxSalvas; n += 1) {
    esperado += n * fimEm[n];
    acumulado += fimEm[n];
    if (mediana === null && acumulado >= 0.5) mediana = n;
    if (p90 === null && acumulado >= 0.9) p90 = n;
  }
  const probQuebraBolhas = P.slice(bolhas).reduce((a, b) => a + b, 0);
  const r = (x, casas) => Math.round(x * 10 ** casas) / 10 ** casas;
  return clonarProfundoCongelado({
    probQuebraBolhas: r(probQuebraBolhas, 4),
    salvasEsperadas: r(esperado, 2),
    ttkEsperadoSeg: r(esperado * intervaloSalvaSeg, 1),
    ttkMedianoSeg: r(mediana * intervaloSalvaSeg, 1),
    ttkP90Seg: r(p90 * intervaloSalvaSeg, 1),
    salvasMediana: mediana,
    salvasP90: p90,
    massaTotal: r(acumulado, 6),
  });
}

/**
 * Geometria derivada do Orçamento de Layout Nativo (Seção 8.5.C) e lista de violações.
 */
export function calcularGeometriaLayoutNativo(p) {
  const gradeLargura = 2 * p.CAMARA_LARGURA + 3 * p.PAREDE_ESPESSURA;
  const gradeAltura = 4 * p.CAMARA_ALTURA + 5 * p.PAREDE_ESPESSURA;
  const baseNoFoil = p.LINHA_DAGUA_Y - p.VAO_DE_AR_NO_FOIL;
  const topoGradeNoFoil = baseNoFoil - gradeAltura;
  const topoArmasNoFoil = topoGradeNoFoil - p.ARMAS_DORSAIS_ALTURA;
  const fimAsaNoFoil = p.LINHA_DAGUA_Y + p.MASTRO_ASA_ALTURA;
  const topoGradeTouchdown = topoGradeNoFoil + p.QUEDA_TOUCHDOWN;
  const baseTouchdown = baseNoFoil + p.QUEDA_TOUCHDOWN;
  const offsetParede23 = p.PAREDE_ESPESSURA + 2 * p.CAMARA_ALTURA + p.PAREDE_ESPESSURA;
  const parede23Touchdown = [topoGradeTouchdown + offsetParede23, topoGradeTouchdown + offsetParede23 + p.PAREDE_ESPESSURA];
  const larguraCena = p.PAINEL_INIMIGO_X - p.COLUNA_TERMOMETRO_LARGURA;
  const violacoes = [];
  if (topoArmasNoFoil < p.HUD_TOPO_ALTURA) violacoes.push('Em 1_NO_FOIL as armas dorsais invadem o HUD do topo');
  if (fimAsaNoFoil > p.PAINEL_RODAPE_TOPO_Y) violacoes.push('Em 1_NO_FOIL a quilha e a asa invadem o painel do rodapé');
  if (baseTouchdown > p.PAINEL_RODAPE_TOPO_Y) violacoes.push('Em 2_TOUCHDOWN a grade de câmaras invade o painel do rodapé');
  if (!(p.LINHA_DAGUA_Y >= parede23Touchdown[0] && p.LINHA_DAGUA_Y <= parede23Touchdown[1])) {
    violacoes.push("Em 2_TOUCHDOWN a linha d'água deve cruzar a parede entre o 2º e o 3º andar");
  }
  if (gradeLargura > larguraCena) violacoes.push('A grade 2x4 não cabe na largura da cena');
  return clonarProfundoCongelado({
    gradeLargura,
    gradeAltura,
    topoArmasNoFoil,
    topoGradeNoFoil,
    baseNoFoil,
    fimAsaNoFoil,
    topoGradeTouchdown,
    baseTouchdown,
    parede23Touchdown,
    violacoes,
  });
}

/**
 * Análise estrutural da Máquina de Ciclo (Seção 9.2): alcance a partir de INICIO, saídas e caminho até FIM_DE_RUN.
 */
export function analisarGrafoCicloPartida(transicoes, fases, faseInicial = 'INICIO', faseFinal = 'FIM_DE_RUN') {
  const saidas = new Map(fases.map((f) => [f, new Set()]));
  const entradas = new Map(fases.map((f) => [f, new Set()]));
  const fasesForaDoEnum = new Set();
  for (const t of transicoes) {
    if (!saidas.has(t.faseOrigem)) fasesForaDoEnum.add(t.faseOrigem);
    if (!saidas.has(t.faseDestino)) fasesForaDoEnum.add(t.faseDestino);
    saidas.get(t.faseOrigem)?.add(t.faseDestino);
    entradas.get(t.faseDestino)?.add(t.faseOrigem);
  }
  const alcancar = (inicio, vizinhos) => {
    const vistos = new Set([inicio]);
    const fila = [inicio];
    while (fila.length) {
      const f = fila.shift();
      for (const v of vizinhos.get(f) ?? []) {
        if (!vistos.has(v)) {
          vistos.add(v);
          fila.push(v);
        }
      }
    }
    return vistos;
  };
  const alcancaveis = alcancar(faseInicial, saidas);
  const chegamAoFim = alcancar(faseFinal, entradas);
  return clonarProfundoCongelado({
    fasesForaDoEnum: [...fasesForaDoEnum].sort(),
    inalcancaveis: fases.filter((f) => !alcancaveis.has(f)),
    semSaida: fases.filter((f) => f !== faseFinal && saidas.get(f).size === 0),
    semCaminhoParaFim: fases.filter((f) => !chegamAoFim.has(f)),
    finalTemSaida: saidas.get(faseFinal)?.size > 0,
  });
}

/**
 * Avalia puramente uma transição da Máquina de Estados do Ciclo de Vida da Partida (Seção 9.2).
 */
export function transicionarFaseCicloPartida(consolidacaoVol09, faseAtual, idTransicao) {
  const tr = consolidacaoVol09.transicoesCiclo.find((t) => t.id === idTransicao);
  if (!tr) {
    throw new Error(`[CICLO PARTIDA FALHOU] Transição desconhecida fora da Seção 9.2: "${idTransicao}"`);
  }
  if (tr.faseOrigem !== faseAtual) {
    return clonarProfundoCongelado({
      aceita: false,
      faseResultante: faseAtual,
      apagaRunSavePermadeath: false,
      atualizaProfileJson: false,
      preservaProfileJson: true,
      erro: `TRANSIÇÃO_FASE_ILEGAL:${faseAtual}->${tr.faseDestino}`,
    });
  }
  return clonarProfundoCongelado({
    aceita: true,
    faseResultante: tr.faseDestino,
    apagaRunSavePermadeath: /Apaga run_save\.json \(\*?Permadeath\*?\)/i.test(tr.efeitoPersistencia),
    atualizaProfileJson: /atualiza profile\.json/i.test(tr.efeitoPersistencia),
    preservaProfileJson: !/apaga profile\.json/i.test(tr.efeitoPersistencia),
    erro: null,
  });
}

/** Constantes canônicas do FNV-1a 32 bits (Seção 9.3 do Vol. 09). */
export const HASH32_BASE_FNV = 0x811c9dc5;
export const HASH32_PRIMO_FNV = 0x01000193;

/**
 * Função pura FNV-1a 32-bit para o Particionamento Determinístico de Seeds (Seção 9.3).
 * Isola completamente o sorteio por (seedPartida, dominio, ...coordenadas) sem Math.random().
 */
export function calcularHash32StreamDeterministico(seedPartida, dominio, ...coordenadas) {
  const chave = `${String(seedPartida)}::${String(dominio)}::${coordenadas.map(String).join(':')}`;
  let h = HASH32_BASE_FNV;
  for (let i = 0; i < chave.length; i += 1) {
    h ^= chave.charCodeAt(i);
    h = Math.imul(h, HASH32_PRIMO_FNV);
  }
  return h >>> 0;
}

/**
 * Oráculo puro do Volume 10 (Seção 10.5 / LAC_02): calcula o consumo exato de RAM PCM Float32 (4 bytes/amostra)
 * do catálogo completo vs. Pool LRU por Zona Acústica, emitindo canal explícito L3 de orçamento.
 */
export function calcularOrcamentoRamPcmAudioLru({
  totalStemsCatalogo = 101,
  duracaoMediaSeg = 15,
  sampleRateHz = 48000,
  canais = 2,
  stemsZonaAtiva = 6,
  stemsProximaZona = 4,
  bytesOneShotsFixos = 8 * 1000 * 1000,
  tetoOrcamentoMb = 64,
}) {
  if (totalStemsCatalogo <= 0 || duracaoMediaSeg <= 0 || sampleRateHz <= 0 || canais <= 0) {
    throw new Error('[AUDIO LRU FALHOU] Parâmetros de catálogo PCM devem ser estritamente positivos');
  }
  const bytesPorStem = duracaoMediaSeg * sampleRateHz * canais * 4;
  const ramCatalogoCompletoBytes = totalStemsCatalogo * bytesPorStem;
  const ramResidenteLruBytes = (stemsZonaAtiva + stemsProximaZona) * bytesPorStem + bytesOneShotsFixos;
  const ramCatalogoCompletoMb = Math.round((ramCatalogoCompletoBytes / 1_000_000) * 100) / 100;
  const ramResidenteLruMb = Math.round((ramResidenteLruBytes / 1_000_000) * 100) / 100;
  const dentroOrcamento = ramResidenteLruMb <= tetoOrcamentoMb;

  return clonarProfundoCongelado({
    bytesPorStem,
    ramCatalogoCompletoBytes,
    ramCatalogoCompletoMb,
    ramResidenteLruBytes,
    ramResidenteLruMb,
    tetoOrcamentoMb,
    statusOrcamento: dentroOrcamento ? 'DENTRO_ORCAMENTO_LRU' : 'ESTOURO_ORCAMENTO_LRU',
  });
}

/**
 * Oráculo puro do Volume 10 (Seção 10.1): avalia o MusicalDirector com histerese de Schmitt (±0.08)
 * e retenção mínima de 8 compassos antes de de-escalar (salvo override imediato de Chefe / Fim de Run).
 */
export function avaliarDiretorMusicalSchmitt({
  generoAtual,
  generoSubida,
  generoDescida,
  tensaoAtual0a1,
  limiarTransicao0a1 = 0.5,
  histereseDelta = 0.08,
  compassosNoEstadoAtual = 0,
  holdMinimoCompassos = 8,
  overrideImediatoGenero = null,
}) {
  if (!generoAtual) {
    throw new Error('[DIRETOR MUSICAL FALHOU] generoAtual obrigatório');
  }
  if (overrideImediatoGenero) {
    return clonarProfundoCongelado({
      generoResultante: overrideImediatoGenero,
      trocouGenero: overrideImediatoGenero !== generoAtual,
      motivoTransicao: 'OVERRIDE_IMEDIATO_PRIORITARIO',
    });
  }
  const tetoSubida = Math.round((limiarTransicao0a1 + histereseDelta) * 10000) / 10000;
  const pisoDescida = Math.round((limiarTransicao0a1 - histereseDelta) * 10000) / 10000;

  if (generoSubida && tensaoAtual0a1 >= tetoSubida) {
    return clonarProfundoCongelado({
      generoResultante: generoSubida,
      trocouGenero: generoSubida !== generoAtual,
      motivoTransicao: 'ESCALADA_ACIMA_SCHMITT',
    });
  }
  if (generoDescida && tensaoAtual0a1 <= pisoDescida) {
    if (compassosNoEstadoAtual < holdMinimoCompassos) {
      return clonarProfundoCongelado({
        generoResultante: generoAtual,
        trocouGenero: false,
        motivoTransicao: 'BLOQUEADO_HOLD_MINIMO_COMPASSOS',
      });
    }
    return clonarProfundoCongelado({
      generoResultante: generoDescida,
      trocouGenero: generoDescida !== generoAtual,
      motivoTransicao: 'DE_ESCALADA_APOS_HOLD',
    });
  }
  return clonarProfundoCongelado({
    generoResultante: generoAtual,
    trocouGenero: false,
    motivoTransicao: 'MANTIDO_ZONA_MORTA_SCHMITT',
  });
}

/**
 * Oráculo puro do Volume 10 (Seção 10.5 / LAC_14): converte slider perceptual (0..100%)
 * em escala logarítmica dB (-60..0 dB, 0% -> -Infinity) e emite aviso L3 se alertasUi < 20%.
 */
export function converterSliderAudioParaGanhoDbELinear(valorPct, categoriaSlider = 'master') {
  const num = Number(valorPct);
  if (!Number.isFinite(num) || num < 0 || num > 100) {
    throw new Error(`[SLIDER AUDIO FALHOU] Valor fora de 0..100: ${valorPct}`);
  }
  const avisoSeguranca =
    categoriaSlider === 'alertasUi' && num < 20
      ? 'ALERTA_SOBREVIVENCIA_ABAIXO_20PCT'
      : 'NIVEL_SEGURO';

  if (num === 0) {
    return clonarProfundoCongelado({
      valorPct: 0,
      ganhoDb: -Infinity,
      ganhoLinear: 0,
      avisoSeguranca,
    });
  }
  const ganhoDbBruto = Math.round(-60 * (1 - num / 100) * 1000) / 1000;
  const ganhoDb = ganhoDbBruto === 0 ? 0 : ganhoDbBruto;
  const ganhoLinear = Math.round(Math.pow(10, ganhoDb / 20) * 1_000_000) / 1_000_000;
  return clonarProfundoCongelado({
    valorPct: num,
    ganhoDb,
    ganhoLinear,
    avisoSeguranca,
  });
}

/**
 * Oráculo puro do Volume 10 (Seção 10.5 / LAC_12 e LAC_13): calcula calibração LUFS em jogo,
 * compressão da janela deslizante HDR Audio (8 dB) e os 3 perfis acústicos (ESTUDIO, STEAM_DECK, NOTURNO).
 */
export function calcularMixagemPlataformaHdrAudio({
  stemMusicaLufs = -16.0,
  trimMusicaDb = -7.5,
  picoTransienteBus0Db = 0.0,
  nivelEntradaBus5Db = -9.0,
  janelaHdrDb = 8.0,
  perfilDinamico = 'ESTUDIO',
  freqSubFundamentalHz = 43.65,
}) {
  const perfis = {
    ESTUDIO: { alvoIntegradoLufs: -23.0, lraMaxLu: 14.0, truePeakMaxDbtp: -1.0, highPassSaidaHz: 20 },
    STEAM_DECK: { alvoIntegradoLufs: -18.0, lraMaxLu: 8.0, truePeakMaxDbtp: -1.0, highPassSaidaHz: 20 },
    NOTURNO: { alvoIntegradoLufs: -24.0, lraMaxLu: 5.0, truePeakMaxDbtp: -2.0, highPassSaidaHz: 65 },
  };
  const cfg = perfis[perfilDinamico];
  if (!cfg) {
    throw new Error(`[HDR AUDIO FALHOU] Perfil acústico desconhecido: "${perfilDinamico}"`);
  }

  const loudnessMusicaEmJogoLufs = Math.round((stemMusicaLufs + trimMusicaDb) * 100) / 100;
  const pisoJanelaHdrDb = picoTransienteBus0Db - janelaHdrDb;
  const reducaoHdrBus5Db =
    nivelEntradaBus5Db > pisoJanelaHdrDb
      ? Math.round((nivelEntradaBus5Db - pisoJanelaHdrDb) * 100) / 100
      : 0;
  const harmonicosFundamentalAusenteHz =
    perfilDinamico === 'STEAM_DECK'
      ? [
          Math.round(freqSubFundamentalHz * 2 * 100) / 100,
          Math.round(freqSubFundamentalHz * 3 * 100) / 100,
        ]
      : [];

  return clonarProfundoCongelado({
    perfilDinamico,
    loudnessMusicaEmJogoLufs,
    alvoIntegradoLufs: cfg.alvoIntegradoLufs,
    lraMaxLu: cfg.lraMaxLu,
    truePeakMaxDbtp: cfg.truePeakMaxDbtp,
    highPassSaidaHz: cfg.highPassSaidaHz,
    reducaoHdrBus5Db,
    harmonicosFundamentalAusenteHz,
  });
}

/**
 * Oráculo puro do Volume 10 (Seção 10.3 / LEI_SFX_1_OCLUSAO_DIVIDIDA e LAC_16):
 * resolve os cortes de oclusão física e ducking cirúrgico (Bell EQ 950 Hz -6.5 dB preservando sub 45 Hz)
 * nos 6 barramentos para os 5 estados físicos da nave.
 */
export function resolverRoteamentoOclusao6Barramentos({
  estadoFisico = '1_NO_FOIL',
  progressoSpoolUp0a1 = 0.0,
  pausaTaticaAtiva = false,
  cueSobrevivenciaAtivo = false,
  confortoAntiTinnitus = false,
}) {
  const estadosValidos = new Set([
    '1_NO_FOIL',
    '2_TOUCHDOWN',
    '3_SPOOL_UP',
    '4_FURTIVO_AR',
    '5_FURTIVO_AGUA',
  ]);
  if (!estadosValidos.has(estadoFisico)) {
    throw new Error(`[OCLUSAO 6 BARRAMENTOS FALHOU] Estado físico inválido: "${estadoFisico}"`);
  }
  const pSpool = Math.max(0, Math.min(1, Number(progressoSpoolUp0a1)));
  const submersoPleno = estadoFisico === '2_TOUCHDOWN' || estadoFisico === '5_FURTIVO_AGUA';
  const duckBell = cueSobrevivenciaAtivo ? -6.5 : 0.0;

  let corteMusicaHz = 20000;
  if (submersoPleno) {
    corteMusicaHz = 400;
  } else if (estadoFisico === '3_SPOOL_UP') {
    corteMusicaHz = Math.round(400 * Math.pow(20000 / 400, pSpool));
  } else if (estadoFisico === '4_FURTIVO_AR') {
    corteMusicaHz = pausaTaticaAtiva ? 900 : 7200;
  } else if (pausaTaticaAtiva) {
    corteMusicaHz = 900;
  }

  const corteExteriorHz = submersoPleno
    ? 380
    : estadoFisico === '3_SPOOL_UP'
      ? Math.round(380 * Math.pow(18000 / 380, pSpool))
      : 18000;
  const corteHydroHz = submersoPleno
    ? 420
    : estadoFisico === '3_SPOOL_UP'
      ? Math.round(420 * Math.pow(16000 / 420, pSpool))
      : 16000;
  const corteCabineHz = submersoPleno || estadoFisico === '3_SPOOL_UP' ? 14000 : 20000;

  return clonarProfundoCongelado({
    estadoFisico,
    tetoNotchTinnitusHz: confortoAntiTinnitus ? 3200 : null,
    barramentos: {
      BUS_0_SURVIVAL_CUES: {
        prioridade: 0,
        corteLowPassHz: 20000,
        duckingBell950HzDb: 0.0,
        bypassSubmersoTotal: true,
      },
      BUS_1_MUSIC: {
        prioridade: 1,
        corteLowPassHz: corteMusicaHz,
        duckingBell950HzDb: duckBell,
        ganhoSub45HzDb: 0.0,
        bypassSubmersoTotal: false,
      },
      BUS_2_INTERIOR_CABIN: {
        prioridade: 2,
        corteLowPassHz: corteCabineHz,
        duckingBell950HzDb: duckBell,
        earlyReflectionsCascoAtivas: submersoPleno || estadoFisico === '3_SPOOL_UP',
        bypassSubmersoTotal: false,
      },
      BUS_3_EXTERIOR_SEA: {
        prioridade: 3,
        corteLowPassHz: corteExteriorHz,
        duckingBell950HzDb: duckBell,
        bypassSubmersoTotal: false,
      },
      BUS_4_UI: {
        prioridade: 4,
        corteLowPassHz: 20000,
        duckingBell950HzDb: 0.0,
        bypassSubmersoTotal: true,
      },
      BUS_5_HYDRO_BED: {
        prioridade: 5,
        corteLowPassHz: corteHydroHz,
        duckingBell950HzDb: duckBell,
        bypassSubmersoTotal: false,
      },
    },
  });
}

/**
 * Oráculo puro do Volume 10 (Seções 10.2, 10.4 e LAC_04 / LAC_11 / LAC_17):
 * calcula o ponteiro sample-accurate de loop compensando preSkipFrames (ex.: 312 amostras Opus),
 * valida seamDelta === 0 e quantiza o disparo de Stingers na próxima subdivisão de 1/4 de compasso.
 */
export function calcularWrapLoopSampleAccurate({
  indiceAmostraGlobal,
  exactFrameCount,
  preSkipFrames = 0,
  seamDeltaMedido = 0,
  bpm = 125,
  sampleRateHz = 48000,
}) {
  if (exactFrameCount <= 0 || bpm <= 0 || sampleRateHz < 24000 || sampleRateHz > 96000) {
    throw new Error('[LOOP SAMPLE-ACCURATE FALHOU] Parâmetros fora dos limites acústicos suportados');
  }
  const offsetUtil = ((indiceAmostraGlobal % exactFrameCount) + exactFrameCount) % exactFrameCount;
  const frameBufferDecodificado = preSkipFrames + offsetUtil;
  const loopSemClique = Math.abs(seamDeltaMedido) <= 1e-6;
  const amostrasPorQuartoCompasso = Math.round((60 / bpm) * sampleRateHz);
  const restoQuarto = ((indiceAmostraGlobal % amostrasPorQuartoCompasso) + amostrasPorQuartoCompasso) % amostrasPorQuartoCompasso;
  const proximoDisparoStingerFrame =
    restoQuarto === 0
      ? indiceAmostraGlobal
      : indiceAmostraGlobal + (amostrasPorQuartoCompasso - restoQuarto);

  return clonarProfundoCongelado({
    frameBufferDecodificado,
    offsetUtil,
    loopSemClique,
    amostrasPorQuartoCompasso,
    proximoDisparoStingerFrame,
  });
}

/**
 * Oráculo puro do Volume 10 (LAC_01): audita um header Content-Security-Policy real e retorna
 * canal explícito L3 distinguindo aptidão WASM/Worklet de bloqueio de compilação ou de worker-src.
 */
export function auditarPoliticaCspAudioWasm(cabecalhoCsp) {
  const texto = String(cabecalhoCsp ?? '').trim();
  const diretivas = {};
  for (const parte of texto.split(';')) {
    const tokens = parte.trim().split(/\s+/).filter(Boolean);
    if (tokens.length > 0) {
      diretivas[tokens[0].toLowerCase()] = tokens.slice(1);
    }
  }
  const scriptSrc = diretivas['script-src'] ?? diretivas['default-src'] ?? [];
  const workerSrc = diretivas['worker-src'] ?? diretivas['child-src'] ?? diretivas['default-src'] ?? [];

  const permiteWasm = scriptSrc.includes("'wasm-unsafe-eval'") || scriptSrc.includes("'unsafe-eval'");
  const permiteWorklet = workerSrc.includes("'self'");

  let status = 'CSP_APTA_WASM_WORKLET';
  if (!permiteWasm) status = 'BLOQUEIO_WASM_UNSAFE_EVAL';
  else if (!permiteWorklet) status = 'BLOQUEIO_WORKER_SRC';

  return clonarProfundoCongelado({
    status,
    permiteWasm,
    permiteWorklet,
  });
}

/**
 * Oráculo puro do Volume 10 (Seção 10.5 / LAC_14 e LAC_15 — Leis L2 e XAG 104):
 * mescla preferenciasAudio em um perfil clonado/congelado sem mutar a entrada, preservando-as
 * intactas mesmo em transições de Permadeath (TR_7A/7B/7C) e auto-ativando legendas no mudo.
 */
export function mesclarPreferenciasAudioNoPerfilImunePermadeath(
  perfilAtual,
  patchPreferencias = {},
  idTransicao = null
) {
  const padrao = {
    master: 85,
    musica: 80,
    sfxCombate: 90,
    cabineTripulacao: 85,
    ambienteMaritimo: 75,
    alertasUi: 100,
    mudo: false,
    perfilDinamico: 'ESTUDIO',
    saidaMono: false,
    silenciarSemFoco: true,
    legendasTaticasDirecionais: 'ALERTAS_CRITICOS',
    confortoAntiTinnitus: false,
  };
  const basePref = {
    ...padrao,
    ...(perfilAtual?.preferenciasAudio ?? {}),
    ...(patchPreferencias ?? {}),
  };
  const chavesSliders = [
    'master',
    'musica',
    'sfxCombate',
    'cabineTripulacao',
    'ambienteMaritimo',
    'alertasUi',
  ];
  for (const chave of chavesSliders) {
    const v = Number(basePref[chave]);
    if (!Number.isFinite(v)) {
      throw new Error(`[PERFIL AUDIO FALHOU] Slider inválido "${chave}": ${basePref[chave]}`);
    }
    basePref[chave] = Math.max(0, Math.min(100, Math.round(v)));
  }
  basePref.mudo = Boolean(basePref.mudo);
  basePref.saidaMono = Boolean(basePref.saidaMono);
  basePref.silenciarSemFoco = Boolean(basePref.silenciarSemFoco);
  basePref.confortoAntiTinnitus = Boolean(basePref.confortoAntiTinnitus);

  const audioSilenciado = basePref.mudo === true || basePref.master === 0;
  const legendasEfetivas =
    audioSilenciado && basePref.legendasTaticasDirecionais === 'DESLIGADO'
      ? 'ALERTAS_CRITICOS'
      : basePref.legendasTaticasDirecionais;

  const transicoesPermadeath = new Set([
    'TR_7A_DERROTA_EM_COMBATE',
    'TR_7B_VITORIA_FINAL',
    'TR_7C_DERROTA_EM_EVENTO',
  ]);

  return clonarProfundoCongelado({
    ...perfilAtual,
    preferenciasAudio: basePref,
    telemetriaAcessibilidadeAudio: {
      legendasEfetivas,
      runSaveApagadoPermadeath: transicoesPermadeath.has(idTransicao),
      perfilPreservadoPosPermadeath: true,
    },
  });
}
