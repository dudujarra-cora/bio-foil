/**
 * ONDA 4 — Gerador Procedural de Mapa Setorial (Poisson Disc 18..22 Nós, Rotas <= 28 MN, Correntes e Cotas)
 * Dono Único (Lei N5): src/onda4-mapa/gerador-poisson.mjs
 *
 * Fontes canônicas:
 *  - Seção 4.1 (Amostragem Poisson Disc em 6 colunas 0..5, distância 14..28 MN, zero beco sem saída à direita, correntes 60/20/20%)
 *  - Seção 4.3.1 (Janela de tempo T_prazo = T_rota_minima_peso_padrao + 1.5h)
 *  - Seção 4.4 (Baralho de nós: 1 Entrada, 1 Saída, 2 Lojas nas colunas 2..4 não adjacentes, 4 SOS, 3 Perigos, 3 Exploração, restante Combate)
 *  - Seção 9.3 (STREAM_1_MAPA_POISSON via hash32 determinístico sem Math.random())
 */
import { clonarProfundoCongelado } from '../gdd-parser.mjs';
import { streamMapaPoisson } from '../onda1-fisica/hash32-streams.mjs';
import { sortearTemplatesDoSetor } from './eventos-nos.mjs';

export const LARGURA_SETOR_MN = 120;
export const ALTURA_SETOR_MN = 60;
export const DISTANCIA_MIN_NOS_MN = 14.0;
export const DISTANCIA_MAX_ROTA_MN = 28.0;
export const FOLGA_PRAZO_SOS_HORAS = 1.5;
export const VELOCIDADE_PADRAO_ALFA_MN_H = 11.0;

export const MULTIPLICADORES_CORRENTE = Object.freeze({
  NORMAL: 1.0,
  FAVORAVEL: 0.75,
  REVOLTO: 1.35,
});

/**
 * Calcula a distância euclidiana em Milhas Náuticas (MN) entre dois nós (arredondada a 3 casas).
 */
export function calcularDistanciaEuclidianaMn(noA, noB) {
  const dx = noB.xMn - noA.xMn;
  const dy = noB.yMn - noA.yMn;
  return Math.round(Math.hypot(dx, dy) * 1000) / 1000;
}

/**
 * Gera os candidatos base de coordenadas (xMn, yMn) por coluna (1..4) para 4 ou 5 nós,
 * garantindo que qualquer par de nós tenha distância >= 14.0 MN e que todo nó tenha vizinhos
 * na coluna seguinte a distância <= 28.0 MN.
 */
function gerarCoordenadasColuna(seedPartida, setorNumero, coluna, qtdNosColuna) {
  const templates4 = {
    1: [
      { x: 24.5, y: 6.0 },
      { x: 22.8, y: 22.0 },
      { x: 22.8, y: 38.0 },
      { x: 24.5, y: 54.0 },
    ],
    2: [
      { x: 48.0, y: 6.0 },
      { x: 48.0, y: 22.0 },
      { x: 48.0, y: 38.0 },
      { x: 48.0, y: 54.0 },
    ],
    3: [
      { x: 72.0, y: 6.0 },
      { x: 72.0, y: 22.0 },
      { x: 72.0, y: 38.0 },
      { x: 72.0, y: 54.0 },
    ],
    4: [
      { x: 95.5, y: 6.0 },
      { x: 97.2, y: 22.0 },
      { x: 97.2, y: 38.0 },
      { x: 95.5, y: 54.0 },
    ],
  };

  const templates5 = {
    1: [
      { x: 24.5, y: 1.0 },
      { x: 22.8, y: 15.5 },
      { x: 22.8, y: 30.0 },
      { x: 22.8, y: 44.5 },
      { x: 24.5, y: 59.0 },
    ],
    2: [
      { x: 48.0, y: 1.0 },
      { x: 48.0, y: 15.5 },
      { x: 48.0, y: 30.0 },
      { x: 48.0, y: 44.5 },
      { x: 48.0, y: 59.0 },
    ],
    3: [
      { x: 72.0, y: 1.0 },
      { x: 72.0, y: 15.5 },
      { x: 72.0, y: 30.0 },
      { x: 72.0, y: 44.5 },
      { x: 72.0, y: 59.0 },
    ],
    4: [
      { x: 95.5, y: 1.0 },
      { x: 97.2, y: 15.5 },
      { x: 97.2, y: 30.0 },
      { x: 97.2, y: 44.5 },
      { x: 95.5, y: 59.0 },
    ],
  };

  const base = qtdNosColuna === 5 ? templates5[coluna] : templates4[coluna];
  return base.map((ponto, idx) => {
    const hX = streamMapaPoisson(seedPartida, setorNumero, 'JITTER_X', coluna, idx);
    const hY = streamMapaPoisson(seedPartida, setorNumero, 'JITTER_Y', coluna, idx);
    const jitterX = ((hX % 100) / 100 - 0.5) * 0.2;
    const jitterY = ((hY % 100) / 100 - 0.5) * 0.2;
    return {
      xMn: Math.round((ponto.x + jitterX) * 100) / 100,
      yMn: Math.round((ponto.y + jitterY) * 100) / 100,
    };
  });
}

/**
 * Embaralha deterministicamente uma lista usando o streamMapaPoisson.
 */
function embaralharDeterministico(lista, seedPartida, setorNumero, subdominio) {
  return [...lista]
    .map((item, idx) => ({
      item,
      peso: streamMapaPoisson(seedPartida, setorNumero, subdominio, idx),
      idx,
    }))
    .sort((a, b) => a.peso - b.peso || a.idx - b.idx)
    .map((x) => x.item);
}

/**
 * Calcula o menor tempo de viagem (em horas, com precisão contínua antes do arredondamento final)
 * do nó inicial até cada nó do setor usando a velocidade padrão da Carcaça Alfa (11.0 MN/h).
 */
export function calcularTemposRotaMinimaPadrao(nos, rotas, velocidadePadraoMnH = VELOCIDADE_PADRAO_ALFA_MN_H) {
  const distHoras = Object.fromEntries(nos.map((n) => [n.id, Infinity]));
  const noEntrada = nos.find((n) => n.coluna === 0);
  if (!noEntrada) return distHoras;
  distHoras[noEntrada.id] = 0;

  // Como o grafo avança estritamente para a direita (xDestino > xOrigem), relaxamos em ordem de xMn
  const nosOrdenados = [...nos].sort((a, b) => a.xMn - b.xMn || a.coluna - b.coluna);
  for (const u of nosOrdenados) {
    if (distHoras[u.id] === Infinity) continue;
    const rotasSaindo = rotas.filter((r) => r.origemId === u.id);
    for (const r of rotasSaindo) {
      const horasSalto = Math.round(((r.distanciaEfetivaMn / velocidadePadraoMnH) * 10)) / 10;
      const cand = Math.round((distHoras[u.id] + horasSalto) * 10) / 10;
      if (cand < distHoras[r.destinoId]) {
        distHoras[r.destinoId] = cand;
      }
    }
  }
  return distHoras;
}

/**
 * Gera o grafo completo de um setor oceânico (18 a 22 nós, 6 colunas 0..5, rotas <= 28 MN,
 * correntes 60/20/20%, baralho invariante de cotas e prazos T_prazo dos nós SOS).
 */
export function gerarMapaSetorial(
  seedPartida,
  setorNumero = 1,
  idsTemplatesSetorAnterior = [],
  opcoesDebug = {}
) {
  // 1. Sorteia quantos nós cada coluna 1..4 terá (4 ou 5 nós por coluna -> total 18 a 22 nós)
  const qtdPorColuna = [1, 4, 4, 4, 4, 1];
  const extrasTotal = streamMapaPoisson(seedPartida, setorNumero, 'TOTAL_EXTRAS') % 5; // 0..4 extras -> 18..22 nós
  const colunasCandidatas = embaralharDeterministico([1, 2, 3, 4], seedPartida, setorNumero, 'ORDEM_COLUNAS_EXTRAS');
  for (let i = 0; i < extrasTotal; i += 1) {
    qtdPorColuna[colunasCandidatas[i]] = 5;
  }

  // 2. Instancia os nós com coordenadas (xMn, yMn)
  const nosBrutos = [];
  nosBrutos.push({
    id: 'NO_0_ENTRADA',
    coluna: 0,
    indiceNaColuna: 0,
    xMn: 0,
    yMn: 30,
  });

  const sufixos = ['A', 'B', 'C', 'D', 'E'];
  for (let col = 1; col <= 4; col += 1) {
    const coords = gerarCoordenadasColuna(seedPartida, setorNumero, col, qtdPorColuna[col]);
    coords.forEach((pt, idx) => {
      nosBrutos.push({
        id: `NO_${col}_${sufixos[idx]}`,
        coluna: col,
        indiceNaColuna: idx,
        xMn: pt.xMn,
        yMn: pt.yMn,
      });
    });
  }

  nosBrutos.push({
    id: 'NO_5_SAIDA',
    coluna: 5,
    indiceNaColuna: 0,
    xMn: LARGURA_SETOR_MN,
    yMn: 30,
  });

  // 3. Conecta rotas navegáveis de avanço para a direita (xDestino > xOrigem + 0.5) onde 14 <= dist <= 28 MN
  const rotasBrutas = [];
  for (const orig of nosBrutos) {
    for (const dest of nosBrutos) {
      if (dest.xMn > orig.xMn + 0.5 && dest.coluna >= orig.coluna && dest.coluna <= orig.coluna + 1) {
        const dist = calcularDistanciaEuclidianaMn(orig, dest);
        if (dist >= DISTANCIA_MIN_NOS_MN && dist <= DISTANCIA_MAX_ROTA_MN) {
          rotasBrutas.push({
            id: `ROTA_${orig.id}_${dest.id}`,
            origemId: orig.id,
            destinoId: dest.id,
            colunaOrigem: orig.coluna,
            colunaDestino: dest.coluna,
            xOrigemMn: orig.xMn,
            xDestinoMn: dest.xMn,
            distanciaMn: dist,
          });
        }
      }
    }
  }

  // Modo de injeção de defeito para teste de mutação (MUT-O4-03: remover saídas de um nó da coluna 2)
  if (opcoesDebug.forcarBecoSemSaidaColuna2 === true) {
    const noAlvo = nosBrutos.find((n) => n.coluna === 2);
    for (let i = rotasBrutas.length - 1; i >= 0; i -= 1) {
      if (rotasBrutas[i].origemId === noAlvo.id) {
        rotasBrutas.splice(i, 1);
      }
    }
  }

  // 4. Distribui as correntes marítimas nas rotas respeitando as cotas 60% NORMAL, 20% FAVORAVEL, 20% REVOLTO
  const totalRotas = rotasBrutas.length;
  const qtdFavoravel = Math.round(totalRotas * 0.2);
  const qtdRevolto = Math.round(totalRotas * 0.2);
  const qtdNormal = Math.max(0, totalRotas - qtdFavoravel - qtdRevolto);

  const baralhoCorrentes = [
    ...Array(qtdNormal).fill('NORMAL'),
    ...Array(qtdFavoravel).fill('FAVORAVEL'),
    ...Array(qtdRevolto).fill('REVOLTO'),
  ];
  const correntesSorteadas = embaralharDeterministico(
    baralhoCorrentes,
    seedPartida,
    setorNumero,
    'CORRENTES_ROTAS'
  );

  const rotas = rotasBrutas.map((r, idx) => {
    const tipoCorrente = correntesSorteadas[idx] ?? 'NORMAL';
    const mult = MULTIPLICADORES_CORRENTE[tipoCorrente];
    const distanciaEfetivaMn = Math.round(r.distanciaMn * mult * 1000) / 1000;
    return {
      ...r,
      tipoCorrente,
      multiplicadorCorrente: mult,
      distanciaEfetivaMn,
    };
  });

  // 5. Distribui o baralho de tipos de nós nas Colunas 1..4:
  //    - 2 LOJA nas Colunas 2..4 sem rota direta entre elas (nunca coladas uma na outra)
  //    - 4 SOS
  //    - 3 PERIGO
  //    - 3 EXPLORACAO
  //    - Restante: COMBATE (4 a 8 nós conforme total 18..22)
  const nosInternos = nosBrutos.filter((n) => n.coluna >= 1 && n.coluna <= 4);
  const candidatosLoja = embaralharDeterministico(
    nosInternos.filter((n) => n.coluna >= 2 && n.coluna <= 4),
    seedPartida,
    setorNumero,
    'CANDIDATOS_LOJA'
  );

  const loja1 = candidatosLoja[0];
  const adjacentesLoja1 = new Set(
    rotas
      .filter((r) => r.origemId === loja1.id || r.destinoId === loja1.id)
      .flatMap((r) => [r.origemId, r.destinoId])
  );
  const loja2 =
    candidatosLoja.find((n) => n.id !== loja1.id && !adjacentesLoja1.has(n.id)) ??
    candidatosLoja[1];

  const idsLojas = new Set([loja1.id, loja2.id]);
  const restantesInternos = embaralharDeterministico(
    nosInternos.filter((n) => !idsLojas.has(n.id)),
    seedPartida,
    setorNumero,
    'DISTRIBUICAO_TIPOS_NOS'
  );

  const idsSos = new Set(restantesInternos.slice(0, 4).map((n) => n.id));
  const idsPerigo = new Set(restantesInternos.slice(4, 7).map((n) => n.id));
  const idsExploracao = new Set(restantesInternos.slice(7, 10).map((n) => n.id));

  // 6. Sorteia os 10 templates de eventos do setor (4 SOS, 3 EXPLORACAO, 3 PERIGO) sem repetir o setor anterior
  const templatesSorteados = sortearTemplatesDoSetor(seedPartida, setorNumero, idsTemplatesSetorAnterior);
  let idxSos = 0;
  let idxPerigo = 0;
  let idxExp = 0;

  // 7. Calcula T_rota_minima com a Carcaça Alfa padrão (11.0 MN/h) para fixar T_prazo = T_rota_minima + 1.5h nos nós SOS
  const temposMinimosHoras = calcularTemposRotaMinimaPadrao(nosBrutos, rotas, VELOCIDADE_PADRAO_ALFA_MN_H);

  const nos = nosBrutos.map((n) => {
    let tipoNo = 'COMBATE';
    let idTemplateEvento = null;
    let tPrazoHoras = null;
    const tRotaMinimaHoras = temposMinimosHoras[n.id] ?? 0;

    if (n.coluna === 0) {
      tipoNo = 'ENTRADA';
    } else if (n.coluna === 5) {
      tipoNo = 'SAIDA';
    } else if (idsLojas.has(n.id)) {
      tipoNo = 'LOJA';
    } else if (idsSos.has(n.id)) {
      tipoNo = 'SOS';
      idTemplateEvento = templatesSorteados.sos[idxSos];
      idxSos += 1;
      tPrazoHoras = Math.round((tRotaMinimaHoras + FOLGA_PRAZO_SOS_HORAS) * 10) / 10;
    } else if (idsPerigo.has(n.id)) {
      tipoNo = 'PERIGO';
      idTemplateEvento = templatesSorteados.perigo[idxPerigo];
      idxPerigo += 1;
    } else if (idsExploracao.has(n.id)) {
      tipoNo = 'EXPLORACAO';
      idTemplateEvento = templatesSorteados.exploracao[idxExp];
      idxExp += 1;
    }

    const rotasSaidaDireita = rotas
      .filter((r) => r.origemId === n.id && r.xDestinoMn > n.xMn)
      .map((r) => r.destinoId);
    const rotasEntradaEsquerda = rotas
      .filter((r) => r.destinoId === n.id && r.xOrigemMn < n.xMn)
      .map((r) => r.origemId);

    return {
      ...n,
      tipoNo,
      idTemplateEvento,
      tRotaMinimaHoras,
      tPrazoHoras,
      rotasSaidaDireita,
      rotasEntradaEsquerda,
      visitado: n.coluna === 0,
    };
  });

  return clonarProfundoCongelado({
    seedPartida,
    setorNumero,
    larguraMn: LARGURA_SETOR_MN,
    alturaMn: ALTURA_SETOR_MN,
    totalNos: nos.length,
    nos,
    rotas,
    templatesSorteados,
  });
}

/**
 * Audita se um mapa setorial gerado cumpre todas as invariantes geométricas e de baralho da Seção 4.1..4.4.
 */
export function auditarInvariantesMapaSetorial(mapa) {
  const erros = [];

  if (mapa.totalNos < 18 || mapa.totalNos > 22 || mapa.nos.length !== mapa.totalNos) {
    erros.push(`Total de nós (${mapa.totalNos}) fora do intervalo [18..22]`);
  }

  // Distância mínima entre quaisquer dois nós >= 14.0 MN
  for (let i = 0; i < mapa.nos.length; i += 1) {
    for (let j = i + 1; j < mapa.nos.length; j += 1) {
      const dist = calcularDistanciaEuclidianaMn(mapa.nos[i], mapa.nos[j]);
      if (dist < DISTANCIA_MIN_NOS_MN) {
        erros.push(`Par de nós (${mapa.nos[i].id}, ${mapa.nos[j].id}) com distância ${dist} < 14.0 MN`);
      }
    }
  }

  // Rotas <= 28.0 MN
  for (const r of mapa.rotas) {
    if (r.distanciaMn > DISTANCIA_MAX_ROTA_MN || r.distanciaMn < DISTANCIA_MIN_NOS_MN) {
      erros.push(`Rota ${r.id} com distância ${r.distanciaMn} fora de [14.0, 28.0] MN`);
    }
  }

  // Zero becos sem saída nas colunas 0..4 e alcançabilidade nas colunas 1..5
  for (const no of mapa.nos) {
    if (no.coluna >= 0 && no.coluna <= 4 && no.rotasSaidaDireita.length === 0) {
      erros.push(`Nó ${no.id} na coluna ${no.coluna} tem 0 rotas de saída para a direita (Beco sem saída!)`);
    }
    if (no.coluna >= 1 && no.coluna <= 5 && no.rotasEntradaEsquerda.length === 0) {
      erros.push(`Nó ${no.id} na coluna ${no.coluna} tem 0 rotas de entrada vindas da esquerda`);
    }
  }

  // Cotas invariantes: 1 ENTRADA, 1 SAIDA, 2 LOJA (colunas 2..4, não adjacentes), 4 SOS, 3 PERIGO, 3 EXPLORACAO
  const contagemPorTipo = {};
  for (const no of mapa.nos) {
    contagemPorTipo[no.tipoNo] = (contagemPorTipo[no.tipoNo] ?? 0) + 1;
  }
  if (contagemPorTipo.ENTRADA !== 1) erros.push(`Esperado 1 ENTRADA, obtido ${contagemPorTipo.ENTRADA}`);
  if (contagemPorTipo.SAIDA !== 1) erros.push(`Esperado 1 SAIDA, obtido ${contagemPorTipo.SAIDA}`);
  if (contagemPorTipo.LOJA !== 2) erros.push(`Esperado 2 LOJA, obtido ${contagemPorTipo.LOJA}`);
  if (contagemPorTipo.SOS !== 4) erros.push(`Esperado 4 SOS, obtido ${contagemPorTipo.SOS}`);
  if (contagemPorTipo.PERIGO !== 3) erros.push(`Esperado 3 PERIGO, obtido ${contagemPorTipo.PERIGO}`);
  if (contagemPorTipo.EXPLORACAO !== 3) erros.push(`Esperado 3 EXPLORACAO, obtido ${contagemPorTipo.EXPLORACAO}`);

  const lojas = mapa.nos.filter((n) => n.tipoNo === 'LOJA');
  for (const l of lojas) {
    if (l.coluna < 2 || l.coluna > 4) {
      erros.push(`Loja ${l.id} gerada fora das Colunas 2..4 (coluna=${l.coluna})`);
    }
  }
  if (lojas.length === 2) {
    const coladas = mapa.rotas.some(
      (r) =>
        (r.origemId === lojas[0].id && r.destinoId === lojas[1].id) ||
        (r.origemId === lojas[1].id && r.destinoId === lojas[0].id)
    );
    if (coladas) {
      erros.push(`Lojas ${lojas[0].id} e ${lojas[1].id} estão coladas por rota direta`);
    }
  }

  return clonarProfundoCongelado({
    valido: erros.length === 0,
    erros,
    contagemPorTipo,
  });
}
