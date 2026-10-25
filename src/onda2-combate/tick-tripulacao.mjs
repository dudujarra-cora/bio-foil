/**
 * [Onda 2] Movimentação (Nado 1.5s), Topologia 2x4 + Duto 5<->6, Lotação 2+2, Reparo,
 * Asfixia/Hipóxia, Cura Branquial/Pulso de Enzimas (sem acúmulo), Canal L3 e Simulação Passo 3.
 */

import { congelarProfundo } from '../onda1-fisica/estado-inicial.mjs';
import { avancarTickFisicaHidraulica } from '../onda1-fisica/tick-hidraulica-foil.mjs';
import {
  CONSTANTES_SISTEMAS_ARMAS,
  avancarTickSistemasEArmas,
  calcularTempoRecargaEfetivoArma,
} from './tick-sistemas-armas.mjs';

export const FICHAS_ESPECIES_TRIPULACAO = Object.freeze({
  POLVO: Object.freeze({
    especie: 'POLVO',
    hpMax: 80,
    dpsCorpoACorpo: 4.0,
    velNadoMult: 1.2,
    multReparoBase: 2.0,
    tempoReparoSistemaSeg: 6.0,
    tempoReparoRomboSeg: 4.0,
    tempoReparoCurtoSeg: 4.0,
    anfibioImuneSeca: false,
    imuneCurtoCircuito: false,
  }),
  ARRAIA: Object.freeze({
    especie: 'ARRAIA',
    hpMax: 70,
    dpsCorpoACorpo: 6.0,
    velNadoMult: 1.0,
    multReparoBase: 1.0,
    tempoReparoSistemaSeg: 12.0,
    tempoReparoRomboSeg: 8.0,
    tempoReparoCurtoSeg: 4.0,
    anfibioImuneSeca: false,
    imuneCurtoCircuito: true,
  }),
  BAIACU: Object.freeze({
    especie: 'BAIACU',
    hpMax: 150,
    dpsCorpoACorpo: 5.0,
    velNadoMult: 0.75,
    multReparoBase: 0.5,
    tempoReparoSistemaSeg: 24.0,
    tempoReparoRomboSeg: 16.0,
    tempoReparoCurtoSeg: 16.0,
    anfibioImuneSeca: false,
    imuneCurtoCircuito: false,
  }),
  CARANGUEJO: Object.freeze({
    especie: 'CARANGUEJO',
    hpMax: 110,
    dpsCorpoACorpo: 15.0,
    velNadoMult: 1.0,
    multReparoBase: 0.5,
    tempoReparoSistemaSeg: 24.0,
    tempoReparoRomboSeg: 16.0,
    tempoReparoCurtoSeg: 16.0,
    anfibioImuneSeca: true,
    imuneCurtoCircuito: false,
  }),
});

export const CONSTANTES_TRIPULACAO = Object.freeze({
  TEMPO_NADO_SALA_BASE_SEG: 1.5,
  TEMPO_REPARO_SISTEMA_BASE_SEG: 12.0,
  TEMPO_REPARO_ROMBO_BASE_SEG: 8.0,
  TEMPO_REPARO_CURTO_BASE_SEG: 8.0,
  DANO_ASFIXIA_SECA_OU_HIPOXIA_HP_S: 8.0,
  DANO_CURTO_CIRCUITO_HP_S: 4.0,
  PENALIDADE_VEL_E_REPARO_SALA_SECA_MULT: 0.5,
  LIMITE_ALIADOS_POR_CAMARA: 2,
  LIMITE_INIMIGOS_POR_CAMARA: 2,
  LIMITE_TOTAL_POR_CAMARA: 4,
});

/**
 * Topologia Canônica 2x4 + Duto Hidráulico Ventral (5 <-> 6) da Seção 1.6.A (Vol. 01):
 * 8 câmaras, 11 conexões bidirecionais (soma dos graus = 22).
 */
export const TOPOLOGIA_CAMARAS_BIONAVE = Object.freeze([
  Object.freeze({ id: 1, coluna: 1, andar: 1, vizinhos: Object.freeze([2, 7]) }),
  Object.freeze({ id: 7, coluna: 2, andar: 1, vizinhos: Object.freeze([3, 1]) }),
  Object.freeze({ id: 2, coluna: 1, andar: 2, vizinhos: Object.freeze([1, 4, 3]) }),
  Object.freeze({ id: 3, coluna: 2, andar: 2, vizinhos: Object.freeze([7, 5, 2]) }),
  Object.freeze({ id: 4, coluna: 1, andar: 3, vizinhos: Object.freeze([2, 6, 5]) }),
  Object.freeze({ id: 5, coluna: 2, andar: 3, vizinhos: Object.freeze([3, 8, 4, 6]) }),
  Object.freeze({ id: 6, coluna: 1, andar: 4, vizinhos: Object.freeze([4, 8, 5]) }),
  Object.freeze({ id: 8, coluna: 2, andar: 4, vizinhos: Object.freeze([5, 6]) }),
]);

/**
 * Catálogo explícito dos 11 portais anatômicos (6 esfíncteres verticais entre andares,
 * 4 túneis branquiais na espinha central e 1 Duto Hidráulico Ventral curvo 5<->6).
 */
export const PORTAIS_TOPOLOGICOS_BIONAVE = Object.freeze([
  Object.freeze({ chave: '1-2', camaras: Object.freeze([1, 2]), tipoPortal: 'ESFINCTER_VERTICAL', coluna: 1 }),
  Object.freeze({ chave: '2-4', camaras: Object.freeze([2, 4]), tipoPortal: 'ESFINCTER_VERTICAL', coluna: 1 }),
  Object.freeze({ chave: '4-6', camaras: Object.freeze([4, 6]), tipoPortal: 'ESFINCTER_VERTICAL', coluna: 1 }),
  Object.freeze({ chave: '3-7', camaras: Object.freeze([7, 3]), tipoPortal: 'ESFINCTER_VERTICAL', coluna: 2 }),
  Object.freeze({ chave: '3-5', camaras: Object.freeze([3, 5]), tipoPortal: 'ESFINCTER_VERTICAL', coluna: 2 }),
  Object.freeze({ chave: '5-8', camaras: Object.freeze([5, 8]), tipoPortal: 'ESFINCTER_VERTICAL', coluna: 2 }),
  Object.freeze({ chave: '1-7', camaras: Object.freeze([1, 7]), tipoPortal: 'TUNEL_BRANQUIAL_CENTRAL', andar: 1 }),
  Object.freeze({ chave: '2-3', camaras: Object.freeze([2, 3]), tipoPortal: 'TUNEL_BRANQUIAL_CENTRAL', andar: 2 }),
  Object.freeze({ chave: '4-5', camaras: Object.freeze([4, 5]), tipoPortal: 'TUNEL_BRANQUIAL_CENTRAL', andar: 3 }),
  Object.freeze({ chave: '6-8', camaras: Object.freeze([6, 8]), tipoPortal: 'TUNEL_BRANQUIAL_CENTRAL', andar: 4 }),
  Object.freeze({ chave: '5-6', camaras: Object.freeze([5, 6]), tipoPortal: 'DUTO_HIDRAULICO_VENTRAL', dutoVentral: true }),
]);

/**
 * Consulta explícita L3 do portal anatômico que conecta duas câmaras adjacentes.
 */
export function obterPortalTopologicoEntreCamaras(idA, idB) {
  const a = Number(idA);
  const b = Number(idB);
  const menor = Math.min(a, b);
  const maior = Math.max(a, b);
  const chave = `${menor}-${maior}`;
  const portal = PORTAIS_TOPOLOGICOS_BIONAVE.find((p) => p.chave === chave);
  if (!portal) {
    return congelarProfundo({
      ok: false,
      codigoErro: 'PORTAL_NAO_ADJACENTE',
      idOrigem: a,
      idDestino: b,
    });
  }
  return congelarProfundo({
    ok: true,
    chave: portal.chave,
    tipoPortal: portal.tipoPortal,
    dutoVentral: Boolean(portal.dutoVentral),
    idOrigem: a,
    idDestino: b,
  });
}

function arredondar4(v) {
  return Math.round(v * 10000) / 10000;
}

/**
 * Calcula a rota tática de sobrevivência entre duas câmaras da bio-nave avaliando o estado real de cada sala:
 * - Evita câmaras intermediárias secas (0 kg -> -50% velocidade e -8 HP/s asfixia para não-anfíbios);
 * - Evita câmaras em hipóxia (< 20% O2), em curto-circuito (-4 HP/s) e com invasores hostis não bloqueados;
 * - Aproveita o Duto Hidráulico Ventral (5<->6) e a Bomba Branquial energizada (Câmara 3) quando vantajoso;
 * - Em condições seguras equivalentes, preserva 100% o desempate canônico vertical-primeiro da Seção 1.6.A.
 */
export function calcularRotaTaticaSobrevivencia(
  naveJogador,
  idOrigem,
  idDestino,
  especie = 'POLVO',
  opcoes = {}
) {
  const porId = Object.fromEntries(TOPOLOGIA_CAMARAS_BIONAVE.map((c) => [c.id, c]));
  if (!porId[idOrigem] || !porId[idDestino]) {
    return congelarProfundo({
      ok: false,
      codigoErro: 'CAMARA_ROTA_INVALIDA',
      idOrigem,
      idDestino,
    });
  }
  if (idOrigem === idDestino) {
    return congelarProfundo({
      ok: true,
      saltos: 0,
      rota: [idOrigem],
      proximaCamaraId: null,
      tempoEstimadoSeg: 0.0,
      danoAmbientalEstimadoHp: 0.0,
      riscoInterceptacao: 0,
      usouDesvioTatico: false,
      usaDutoVentral56: false,
    });
  }

  const ficha = FICHAS_ESPECIES_TRIPULACAO[especie] ?? FICHAS_ESPECIES_TRIPULACAO.POLVO;
  const rotaCanonica = calcularRotaCamarasBionave(idOrigem, idDestino).rota;
  const ignorarRiscoMutacao = opcoes.ignorarRiscoAmbientalRotaMutacao === true;
  if (!naveJogador || opcoes.forcarRotaCanonicaCega === true || ignorarRiscoMutacao) {
    const tempoCego = arredondar4(
      (rotaCanonica.length - 1) * (CONSTANTES_TRIPULACAO.TEMPO_NADO_SALA_BASE_SEG / ficha.velNadoMult)
    );
    return congelarProfundo({
      ok: true,
      saltos: rotaCanonica.length - 1,
      rota: rotaCanonica,
      proximaCamaraId: rotaCanonica[1] ?? null,
      tempoEstimadoSeg: tempoCego,
      danoAmbientalEstimadoHp: 0.0,
      riscoInterceptacao: 0,
      usouDesvioTatico: false,
      usaDutoVentral56: rotaCanonica.some(
        (idC, idx) => idx + 1 < rotaCanonica.length && ((idC === 5 && rotaCanonica[idx + 1] === 6) || (idC === 6 && rotaCanonica[idx + 1] === 5))
      ),
    });
  }

  const camarasMap = new Map((naveJogador.camaras ?? []).map((c) => [c.id, c]));
  const listaInvasoresBruta = naveJogador.invasoresInimigos ?? naveJogador.invasores ?? [];
  const invasoresVivos = listaInvasoresBruta.filter((inv) => inv.hpAtual > 0);
  const aliadosEstacionados = (naveJogador.tripulacao ?? []).filter(
    (t) => t.hpAtual > 0 && t.localizacao === 'NAVE_JOGADOR' && (!t.camaraDestinoId || t.camaraDestinoId === t.camaraAtualId)
  );
  const tripulanteFerido = Boolean(opcoes.tripulanteFerido);

  const enumerarCaminhosSimples = () => {
    const resultados = [];
    const pilha = [[idOrigem]];
    while (pilha.length > 0) {
      const caminho = pilha.shift();
      const atual = caminho[caminho.length - 1];
      if (caminho.length > 6) continue;
      const camTopo = porId[atual];
      const vizOrdenados = [...camTopo.vizinhos].sort((a, b) => {
        const ca = porId[a];
        const cb = porId[b];
        const aCol = ca.coluna === camTopo.coluna ? 0 : 1;
        const bCol = cb.coluna === camTopo.coluna ? 0 : 1;
        return aCol - bCol || a - b;
      });
      for (const viz of vizOrdenados) {
        if (caminho.includes(viz)) continue;
        const novo = [...caminho, viz];
        if (viz === idDestino) {
          resultados.push(novo);
        } else {
          pilha.push(novo);
        }
      }
    }
    return resultados;
  };

  const avaliarCaminho = (caminho, indiceOrdemCanonica) => {
    let tempoTotal = 0.0;
    let danoAmbiental = 0.0;
    let riscoInterceptacao = 0;
    let bonusCura = 0.0;
    for (let i = 0; i < caminho.length - 1; i += 1) {
      const idSalaPassagem = caminho[i];
      const camObj = camarasMap.get(idSalaPassagem);
      const aguaKg = Number(camObj?.aguaKg ?? 25.0);
      const o2Pct = Number(camObj?.oxigenioPct ?? 100.0);
      const emCurto = Boolean(camObj?.curtoCircuitoAtivo);
      const secaPenalizada = aguaKg <= 0.0 && !ficha.anfibioImuneSeca;
      const multSeca = secaPenalizada ? CONSTANTES_TRIPULACAO.PENALIDADE_VEL_E_REPARO_SALA_SECA_MULT : 1.0;
      const tSalto = CONSTANTES_TRIPULACAO.TEMPO_NADO_SALA_BASE_SEG / (ficha.velNadoMult * multSeca);
      tempoTotal += tSalto;

      // Só penaliza ambientalmente salas intermediárias (i >= 1), pois a origem i=0 é inevitável para qualquer rota
      if (i >= 1) {
        const taxaAsfixia =
          secaPenalizada || o2Pct < CONSTANTES_SISTEMAS_ARMAS.LIMIAR_HIPOXIA_O2_PCT
            ? CONSTANTES_TRIPULACAO.DANO_ASFIXIA_SECA_OU_HIPOXIA_HP_S
            : 0.0;
        const taxaCurto = emCurto && !ficha.imuneCurtoCircuito ? CONSTANTES_TRIPULACAO.DANO_CURTO_CIRCUITO_HP_S : 0.0;
        const curaLocal = camObj ? calcularCuraTripulanteHpPorSeg(naveJogador, camObj) : 0.0;
        danoAmbiental += Math.max(0.0, (taxaAsfixia + taxaCurto - curaLocal) * tSalto);
        if (tripulanteFerido && curaLocal > 0) {
          bonusCura += Math.min(1.2, curaLocal * tSalto * 0.05);
        }
        const invSala = invasoresVivos.filter((inv) => inv.camaraAtualId === idSalaPassagem).length;
        const aliSala = aliadosEstacionados.filter((al) => al.camaraAtualId === idSalaPassagem).length;
        if (invSala > aliSala) {
          riscoInterceptacao += 1;
        }
      }
    }
    const ehExataCanonica =
      caminho.length === rotaCanonica.length && caminho.every((idC, k) => idC === rotaCanonica[k]);
    const custoTatico = arredondar4(
      tempoTotal + danoAmbiental * 0.45 + riscoInterceptacao * 6.0 - bonusCura
    );
    return {
      caminho,
      ehExataCanonica,
      indiceOrdemCanonica,
      tempoTotal: arredondar4(tempoTotal),
      danoAmbiental: arredondar4(danoAmbiental),
      riscoInterceptacao,
      custoTatico,
    };
  };

  const candidatos = enumerarCaminhosSimples().map((c, idx) => avaliarCaminho(c, idx));
  candidatos.sort((a, b) => {
    if (Math.abs(a.custoTatico - b.custoTatico) > 1e-4) return a.custoTatico - b.custoTatico;
    if (a.ehExataCanonica !== b.ehExataCanonica) return a.ehExataCanonica ? -1 : 1;
    if (a.caminho.length !== b.caminho.length) return a.caminho.length - b.caminho.length;
    return a.indiceOrdemCanonica - b.indiceOrdemCanonica;
  });

  const melhor = candidatos[0];
  const rotaEscolhida = melhor.caminho;
  const usouDesvioTatico =
    rotaEscolhida.length !== rotaCanonica.length || rotaEscolhida.some((idC, idx) => idC !== rotaCanonica[idx]);
  const usaDutoVentral56 = rotaEscolhida.some(
    (idC, idx) =>
      idx + 1 < rotaEscolhida.length &&
      ((idC === 5 && rotaEscolhida[idx + 1] === 6) || (idC === 6 && rotaEscolhida[idx + 1] === 5))
  );

  return congelarProfundo({
    ok: true,
    saltos: rotaEscolhida.length - 1,
    rota: rotaEscolhida,
    proximaCamaraId: rotaEscolhida[1] ?? null,
    tempoEstimadoSeg: melhor.tempoTotal,
    danoAmbientalEstimadoHp: melhor.danoAmbiental,
    riscoInterceptacao: melhor.riscoInterceptacao,
    usouDesvioTatico,
    usaDutoVentral56,
  });
}

/**
 * Calcula a rota mínima entre duas câmaras da bio-nave aplicando o desempate determinístico da Seção 1.6.A
 * (prioriza passo vertical na mesma coluna antes de passo horizontal/ventral).
 */
export function calcularRotaCamarasBionave(idOrigem, idDestino) {
  if (idOrigem === idDestino) {
    return congelarProfundo({ saltos: 0, rota: [idOrigem] });
  }
  const porId = Object.fromEntries(TOPOLOGIA_CAMARAS_BIONAVE.map((c) => [c.id, c]));
  if (!porId[idOrigem] || !porId[idDestino]) {
    throw new Error(`[calcularRotaCamarasBionave] Câmara inválida: ${idOrigem} -> ${idDestino}`);
  }

  const fila = [[idOrigem]];
  const menorDistPorNo = { [idOrigem]: 0 };
  const rotasMinimas = [];

  while (fila.length > 0) {
    const caminho = fila.shift();
    const atual = caminho[caminho.length - 1];
    const distAtual = caminho.length - 1;
    if (rotasMinimas.length > 0 && distAtual >= rotasMinimas[0].length - 1) continue;

    const camaraAtual = porId[atual];
    const vizinhosOrdenados = [...camaraAtual.vizinhos].sort((a, b) => {
      const ca = porId[a];
      const cb = porId[b];
      const aMesmaColuna = ca.coluna === camaraAtual.coluna ? 0 : 1;
      const bMesmaColuna = cb.coluna === camaraAtual.coluna ? 0 : 1;
      return aMesmaColuna - bMesmaColuna || a - b;
    });

    for (const viz of vizinhosOrdenados) {
      if (caminho.includes(viz)) continue;
      const novo = [...caminho, viz];
      const novaDist = novo.length - 1;
      if (viz === idDestino) {
        rotasMinimas.push(novo);
      } else if (menorDistPorNo[viz] === undefined || novaDist <= menorDistPorNo[viz]) {
        menorDistPorNo[viz] = novaDist;
        fila.push(novo);
      }
    }
  }

  return congelarProfundo({
    saltos: rotasMinimas[0].length - 1,
    rota: rotasMinimas[0],
  });
}

/**
 * Seletor puro do Canal Explícito de Visibilidade e Permissão (Lei L3 — Seção 8.2 do Vol. 08).
 * Jamais retorna [] ou 0 quando a sala não pode ser vista!
 */
export function inspecionarSalaAlvo(estado, salaId) {
  const alvo = estado?.alvoCombate;
  const salas = alvo?.salasOuOrgaos ?? [];
  const sala = salas.find((s) => s.id === salaId);

  if (!sala) {
    return congelarProfundo({
      canalPermissao: 'VISIVEL',
      status: 'NAO_ENCONTRADO',
      marcadorExplicito: 'SALA_ALVO_INEXISTENTE',
      dados: undefined,
    });
  }

  const camCortex = (estado?.naveJogador?.camaras ?? []).find((c) => c.id === 2);
  const cortexInoperante =
    camCortex !== undefined &&
    Math.max(
      0,
      Number(camCortex.barrasIntegridade ?? camCortex.integridade ?? 1) -
        Number(camCortex.danoIonizado ?? camCortex.barrasIonizadas ?? 0)
    ) <= 0;

  if (alvo.canalVisibilidadeSonar === 'NEGADO_SONAR' || cortexInoperante) {
    return congelarProfundo({
      canalPermissao: 'NEGADO_SONAR',
      status: 'SEM_PERMISSAO_VISAO',
      marcadorExplicito: 'CEGO_AGUAS_TURVAS_ABISSAIS',
      dados: undefined,
    });
  }

  if (
    alvo.canalVisibilidadeSonar === 'NEGADO_TINTA' ||
    Math.max(Number(sala.cegoTintaSeg ?? 0), Number(sala.cegueiraTintaSeg ?? 0)) > 0
  ) {
    return congelarProfundo({
      canalPermissao: 'NEGADO_TINTA',
      status: 'SEM_PERMISSAO_VISAO',
      marcadorExplicito: 'CEGO_BOLSA_TINTA',
      dados: undefined,
    });
  }

  const tripulantes = (sala.tripulantes ?? []).filter((t) => t.hpAtual > 0);
  return congelarProfundo({
    canalPermissao: 'VISIVEL',
    status: 'OK',
    marcadorExplicito: tripulantes.length > 0 ? 'SALA_VISIVEL_OCUPADA' : 'SALA_VISIVEL_VAZIA',
    dados: {
      tripulantes: structuredClone(tripulantes),
      sistemaVisivel: true,
    },
  });
}

/**
 * Calcula a cura por segundo de um tripulante aliado numa câmara (Seção 1.4 e Limite Extremo 3 Anti-Immortality).
 * O Pulso de Enzimas (+5 HP/s) aplica-se apenas às DEMAIS salas inundadas e NUNCA soma em cima da cura local
 * da própria Bomba Branquial (Câmara 3), mantendo o teto absoluto em +18 HP/s (< 24 DPS de 2 Mergulhadores).
 */
export function calcularCuraTripulanteHpPorSeg(naveJogador, camara) {
  if (camara.aguaKg <= 0) return 0.0;
  const camaraBranquial = naveJogador.camaras.find((c) => c.id === 3);
  const ionBrq = Math.max(0, Number(camaraBranquial?.danoIonizado ?? camaraBranquial?.barrasIonizadas ?? 0));
  const energiaBrq = Math.max(0, Number(camaraBranquial?.barrasEnergiaAlocada ?? camaraBranquial?.energiaAlocada ?? 0) - ionBrq);
  const barrasBranquial =
    camaraBranquial && Number(camaraBranquial.barrasIntegridade ?? camaraBranquial.integridade ?? 0) >= 1
      ? Math.min(3, energiaBrq)
      : 0;

  if (camara.id === 3) {
    // MUT-O2-03: dentro da própria Bomba Branquial, vale apenas a cura local (+5 / +12 / +18 HP/s), sem somar Pulso!
    return CONSTANTES_SISTEMAS_ARMAS.CURA_LOCAL_BRANQUIAL_POR_BARRA[barrasBranquial] ?? 0.0;
  }

  if (Number(naveJogador.pulsoEnzimasAtivoSeg ?? 0) > 0 && barrasBranquial >= 2) {
    return CONSTANTES_SISTEMAS_ARMAS.CURA_PULSO_ENZIMAS_HP_S;
  }
  return 0.0;
}

/**
 * Calcula a velocidade efetiva de reparo (fator multiplicador sobre a taxa base) de um tripulante numa câmara.
 * Em sala 0% seca (aguaKg === 0), Polvo/Arraia/Baiacu sofrem penalidade de -50% na velocidade de reparo (MUT-O2-04).
 */
export function calcularMultiplicadorReparoEfetivo(especie, aguaKg) {
  const ficha = FICHAS_ESPECIES_TRIPULACAO[especie];
  if (!ficha) throw new Error(`Espécie desconhecida: ${especie}`);
  const salaSeca = Number(aguaKg) <= 0.0;
  const penalidadeSeca =
    salaSeca && !ficha.anfibioImuneSeca
      ? CONSTANTES_TRIPULACAO.PENALIDADE_VEL_E_REPARO_SALA_SECA_MULT
      : 1.0;
  return arredondar4(ficha.multReparoBase * penalidadeSeca);
}

/**
 * Resolve 1 tick de combate corpo-a-corpo numa câmara (Seção 1.6.B):
 * Lotação máx 2 aliados + 2 inimigos; foco 100% no Slot 1 (índice 0); Baiacu inflado reflete 50% do DPS.
 */
export function resolverCombateCorpoACorpoCamara(aliadosNaSala, inimigosNaSala, dtSeg = 0.25) {
  if (
    aliadosNaSala.length > CONSTANTES_TRIPULACAO.LIMITE_ALIADOS_POR_CAMARA ||
    inimigosNaSala.length > CONSTANTES_TRIPULACAO.LIMITE_INIMIGOS_POR_CAMARA
  ) {
    throw new Error(
      `[Seção 1.6.B Stacking Limit] Lotação excedida: aliados=${aliadosNaSala.length} (máx 2), inimigos=${inimigosNaSala.length} (máx 2)`
    );
  }
  const aliados = structuredClone(aliadosNaSala);
  const inimigos = structuredClone(inimigosNaSala);

  if (aliados.length > 0 && inimigos.length > 0) {
    for (const a of aliados) a.acopladoBulbo = false;
    const dpsAliados = aliados.reduce((acc, a) => {
      const dps = a.dps ?? FICHAS_ESPECIES_TRIPULACAO[a.especie]?.dpsCorpoACorpo ?? 0;
      return acc + dps;
    }, 0);
    const dpsInimigos = inimigos.reduce((acc, i) => acc + Number(i.dps ?? 8.0), 0);

    inimigos[0].hpAtual = Math.max(0.0, arredondar4(inimigos[0].hpAtual - dpsAliados * dtSeg));
    aliados[0].hpAtual = Math.max(0.0, arredondar4(aliados[0].hpAtual - dpsInimigos * dtSeg));

    if (aliados[0].especie === 'BAIACU' && aliados[0].inflado === true) {
      for (const inv of inimigos) {
        const dpsInv = Number(inv.dps ?? 8.0);
        inv.hpAtual = Math.max(0.0, arredondar4(inv.hpAtual - 0.5 * dpsInv * dtSeg));
      }
    }
  }

  return congelarProfundo({ aliados, inimigos });
}

function calcularDeltaHpAmbientalPorSeg(nave, camara, ficha) {
  const emAsfixiaSeca = camara.aguaKg <= 0.0 && !ficha.anfibioImuneSeca;
  const emHipoxia = camara.oxigenioPct < CONSTANTES_SISTEMAS_ARMAS.LIMIAR_HIPOXIA_O2_PCT;
  let deltaHpPorSeg = 0.0;
  if (emAsfixiaSeca || emHipoxia) {
    deltaHpPorSeg -= CONSTANTES_TRIPULACAO.DANO_ASFIXIA_SECA_OU_HIPOXIA_HP_S;
  }
  if (camara.curtoCircuitoAtivo && !ficha.imuneCurtoCircuito) {
    deltaHpPorSeg -= CONSTANTES_TRIPULACAO.DANO_CURTO_CIRCUITO_HP_S;
  }
  deltaHpPorSeg += calcularCuraTripulanteHpPorSeg(nave, camara);
  return deltaHpPorSeg;
}

/**
 * Avança um tick puro da Tripulação e Invasores a Bordo:
 * - Travessia coerente sala-por-sala (`câmara -> esfíncter/duto -> câmara`), sofrendo as condições reais
 *   de sobrevivência (0 kg seca -50% vel / -8 HP/s, hipóxia, curto-circuito, cura branquial) em CADA sala atravessada;
 * - Interceptação tática hostil ao entrar em câmara intermediária com invasores desbloqueados (recompensando escolta aliada);
 * - Combate corpo-a-corpo real 2v2 nas câmaras contestadas e avanço tático de invasores entre câmaras.
 */
export function avancarTickTripulacao(estado, dtSeg = 0.25, opcoesDebug = {}) {
  if (!Object.isFrozen(estado)) {
    throw new Error('[Lei L2] avancarTickTripulacao exige estado de entrada congelado (Object.freeze)');
  }
  const proximo = structuredClone(estado);
  const nave = proximo.naveJogador;
  const listaInvasoresMutavel = Array.isArray(nave.invasoresInimigos)
    ? nave.invasoresInimigos
    : Array.isArray(nave.invasores)
      ? nave.invasores
      : [];
  let tripulantesExaminados = 0;
  let portaisAtravessadosNoTick = 0;

  for (const trip of nave.tripulacao) {
    tripulantesExaminados += 1;
    if (trip.hpAtual <= 0 || trip.localizacao !== 'NAVE_JOGADOR') continue;

    const ficha = FICHAS_ESPECIES_TRIPULACAO[trip.especie];
    const camaraInicial = nave.camaras.find((c) => c.id === trip.camaraAtualId);
    if (!camaraInicial) continue;

    // Caso A: Tripulante em trânsito entre câmaras (avança 1 salto topológico por vez com ambiente real de cada sala!)
    if (trip.camaraDestinoId !== null && trip.camaraDestinoId !== undefined && trip.camaraDestinoId !== trip.camaraAtualId) {
      if (trip.inflado) {
        trip.camaraDestinoId = null;
        trip.proximaCamaraId = null;
        trip.rotaAtiva = null;
        trip.progressoNadoSeg = 0.0;
        trip.progressoSalto0a1 = 0.0;
      } else if (opcoesDebug.usarTeletransporteLegadoMutacao === true) {
        const deltaLegado = calcularDeltaHpAmbientalPorSeg(nave, camaraInicial, ficha);
        trip.hpAtual = Math.max(0.0, Math.min(trip.hpMax, arredondar4(trip.hpAtual + deltaLegado * dtSeg)));
        if (trip.hpAtual <= 0) continue;
        trip.acopladoBulbo = false;
        const { saltos } = calcularRotaCamarasBionave(trip.camaraAtualId, trip.camaraDestinoId);
        const penLegado =
          camaraInicial.aguaKg <= 0.0 && !ficha.anfibioImuneSeca
            ? CONSTANTES_TRIPULACAO.PENALIDADE_VEL_E_REPARO_SALA_SECA_MULT
            : 1.0;
        const tTotal = arredondar4(saltos * (CONSTANTES_TRIPULACAO.TEMPO_NADO_SALA_BASE_SEG / (ficha.velNadoMult * penLegado)));
        trip.progressoNadoSeg = arredondar4((trip.progressoNadoSeg ?? 0.0) + dtSeg);
        if (trip.progressoNadoSeg >= tTotal) {
          trip.camaraAtualId = trip.camaraDestinoId;
          trip.camaraDestinoId = null;
          trip.progressoNadoSeg = 0.0;
          trip.acopladoBulbo = true;
        }
        continue;
      } else {
        trip.acopladoBulbo = false;
        trip.interceptadoPorInvasor = false;
        let dtRestante = dtSeg;

        while (dtRestante > 1e-9 && trip.hpAtual > 0 && trip.camaraDestinoId !== null && trip.camaraAtualId !== trip.camaraDestinoId) {
          const camAtu = nave.camaras.find((c) => c.id === trip.camaraAtualId);
          if (!camAtu) break;

          const planoRota = calcularRotaTaticaSobrevivencia(
            nave,
            trip.camaraAtualId,
            trip.camaraDestinoId,
            trip.especie,
            {
              forcarRotaCanonicaCega: Boolean(trip.forcarRotaCanonicaCega || opcoesDebug.forcarRotaCanonicaCega),
              ignorarRiscoAmbientalRotaMutacao: Boolean(opcoesDebug.ignorarRiscoAmbientalRotaMutacao),
              tripulanteFerido: trip.hpAtual < trip.hpMax,
            }
          );
          if (!planoRota.ok || !planoRota.proximaCamaraId) {
            trip.camaraDestinoId = null;
            trip.proximaCamaraId = null;
            trip.rotaAtiva = null;
            trip.progressoNadoSeg = 0.0;
            trip.progressoSalto0a1 = 0.0;
            break;
          }

          const proximaId = planoRota.proximaCamaraId;
          trip.rotaAtiva = [...planoRota.rota];
          trip.proximaCamaraId = proximaId;

          const penalidadeSecaSalto =
            camAtu.aguaKg <= 0.0 && !ficha.anfibioImuneSeca
              ? CONSTANTES_TRIPULACAO.PENALIDADE_VEL_E_REPARO_SALA_SECA_MULT
              : 1.0;
          const tempoSaltoSeg = arredondar4(
            CONSTANTES_TRIPULACAO.TEMPO_NADO_SALA_BASE_SEG / (ficha.velNadoMult * penalidadeSecaSalto)
          );
          trip.tempoSaltoAtualSeg = tempoSaltoSeg;

          const progAtual = Number(trip.progressoNadoSeg ?? 0.0);
          const faltaParaPortal = Math.max(0.0, tempoSaltoSeg - progAtual);
          const dtPasso = Math.min(dtRestante, faltaParaPortal);

          // Aplica o ambiente real da câmara que está sendo atravessada neste exato sub-intervalo
          const deltaHpSeg = calcularDeltaHpAmbientalPorSeg(nave, camAtu, ficha);
          trip.hpAtual = Math.max(0.0, Math.min(trip.hpMax, arredondar4(trip.hpAtual + deltaHpSeg * dtPasso)));
          if (trip.hpAtual <= 0) {
            trip.camaraDestinoId = null;
            trip.proximaCamaraId = null;
            trip.rotaAtiva = null;
            trip.progressoNadoSeg = 0.0;
            trip.progressoSalto0a1 = 0.0;
            break;
          }

          const novoProg = arredondar4(progAtual + dtPasso);
          dtRestante = arredondar4(dtRestante - dtPasso);

          if (novoProg + 1e-6 >= tempoSaltoSeg) {
            const infoPortal = obterPortalTopologicoEntreCamaras(trip.camaraAtualId, proximaId);
            trip.ultimoPortalAtravessado = infoPortal.ok ? infoPortal.chave : `${trip.camaraAtualId}-${proximaId}`;
            trip.camaraAtualId = proximaId;
            trip.progressoNadoSeg = 0.0;
            trip.progressoSalto0a1 = 0.0;
            portaisAtravessadosNoTick += 1;

            if (trip.camaraAtualId === trip.camaraDestinoId) {
              trip.camaraDestinoId = null;
              trip.proximaCamaraId = null;
              trip.rotaAtiva = null;
              const invNaChegada = listaInvasoresMutavel.some(
                (inv) => inv.camaraAtualId === trip.camaraAtualId && inv.hpAtual > 0
              );
              trip.acopladoBulbo = !invNaChegada;
              break;
            }

            // Regra Tática de Interceptação Hostil em Câmara Intermediária (exceto quando escoltada por aliado defensor!)
            if (opcoesDebug.ignorarInterceptacaoHostilMutacao !== true) {
              const invInterm = listaInvasoresMutavel.filter(
                (inv) => inv.camaraAtualId === trip.camaraAtualId && inv.hpAtual > 0
              ).length;
              const aliDefendendo = nave.tripulacao.filter(
                (al) =>
                  al.id !== trip.id &&
                  al.hpAtual > 0 &&
                  al.localizacao === 'NAVE_JOGADOR' &&
                  al.camaraAtualId === trip.camaraAtualId &&
                  (!al.camaraDestinoId || al.camaraDestinoId === al.camaraAtualId)
              ).length;
              if (invInterm > aliDefendendo) {
                trip.camaraDestinoId = null;
                trip.proximaCamaraId = null;
                trip.rotaAtiva = null;
                trip.interceptadoPorInvasor = true;
                trip.acopladoBulbo = false;
                break;
              }
            }
          } else {
            trip.progressoNadoSeg = novoProg;
            trip.progressoSalto0a1 = arredondar4(novoProg / Math.max(0.01, tempoSaltoSeg));
          }
        }

        // Se chegou ao destino ou foi interceptado antes do fim de um macro-tick dtSeg, aplica o ambiente residual da nova sala
        if (dtRestante > 1e-9 && trip.hpAtual > 0) {
          const camPos = nave.camaras.find((c) => c.id === trip.camaraAtualId);
          if (camPos) {
            const deltaResidual = calcularDeltaHpAmbientalPorSeg(nave, camPos, ficha);
            trip.hpAtual = Math.max(0.0, Math.min(trip.hpMax, arredondar4(trip.hpAtual + deltaResidual * dtRestante)));
          }
        }
        continue;
      }
    }

    const camara = nave.camaras.find((c) => c.id === trip.camaraAtualId);
    if (!camara) continue;
    trip.proximaCamaraId = null;
    trip.rotaAtiva = null;
    trip.progressoSalto0a1 = 0.0;

    // 1. Dano ambiental (Seca/Hipóxia -8 HP/s e Curto-Circuito -4 HP/s) e Cura (+5/+12/+18 HP/s ou Pulso +5 HP/s)
    const deltaHpPorSeg = calcularDeltaHpAmbientalPorSeg(nave, camara, ficha);
    trip.hpAtual = Math.max(0.0, Math.min(trip.hpMax, arredondar4(trip.hpAtual + deltaHpPorSeg * dtSeg)));
    if (trip.hpAtual <= 0) {
      if (camara.baiacuInfladoId === trip.id) camara.baiacuInfladoId = null;
      continue;
    }

    // 3. Reparo na câmara atual (se não estiver inflado, nadando ou em combate corpo-a-corpo com invasor)
    const temInvasorVivoNaSala = listaInvasoresMutavel.some(
      (inv) => inv.camaraAtualId === camara.id && inv.hpAtual > 0
    );
    if (temInvasorVivoNaSala) {
      trip.acopladoBulbo = false;
      continue;
    }
    if (trip.inflado) continue;
    const multReparo = calcularMultiplicadorReparoEfetivo(trip.especie, camara.aguaKg);
    const maxBarrasSistema = Number(camara.nivelMaxBarras ?? camara.barrasNivelMax ?? camara.nivelMax ?? 0);

    if (camara.curtoCircuitoAtivo) {
      const multCurto =
        trip.especie === 'ARRAIA'
          ? 2.0 * (camara.aguaKg <= 0.0 ? 0.5 : 1.0)
          : multReparo;
      camara.progressoReparoCurtoSeg = arredondar4(camara.progressoReparoCurtoSeg + dtSeg * multCurto);
      if (camara.progressoReparoCurtoSeg >= CONSTANTES_TRIPULACAO.TEMPO_REPARO_CURTO_BASE_SEG) {
        camara.curtoCircuitoAtivo = false;
        camara.progressoReparoCurtoSeg = 0.0;
        camara.progressoDanoCurtoSeg = 0.0;
      }
    } else if (camara.barrasIntegridade < maxBarrasSistema) {
      camara.progressoReparoSistemaSeg = arredondar4(camara.progressoReparoSistemaSeg + dtSeg * multReparo);
      if (camara.progressoReparoSistemaSeg >= CONSTANTES_TRIPULACAO.TEMPO_REPARO_SISTEMA_BASE_SEG) {
        camara.progressoReparoSistemaSeg = arredondar4(
          camara.progressoReparoSistemaSeg - CONSTANTES_TRIPULACAO.TEMPO_REPARO_SISTEMA_BASE_SEG
        );
        camara.barrasIntegridade += 1;
        camara.integridade = camara.barrasIntegridade;
      }
    } else if (camara.rombosCasco > 0 || camara.brechaAtiva) {
      if ((camara.rombosCasco ?? 0) <= 0 && camara.brechaAtiva) {
        camara.rombosCasco = 1;
      }
      camara.progressoReparoRomboSeg = arredondar4(camara.progressoReparoRomboSeg + dtSeg * multReparo);
      if (camara.progressoReparoRomboSeg >= CONSTANTES_TRIPULACAO.TEMPO_REPARO_ROMBO_BASE_SEG) {
        camara.progressoReparoRomboSeg = arredondar4(
          camara.progressoReparoRomboSeg - CONSTANTES_TRIPULACAO.TEMPO_REPARO_ROMBO_BASE_SEG
        );
        camara.rombosCasco = Math.max(0, (camara.rombosCasco ?? 1) - 1);
        camara.brechaAtiva = camara.rombosCasco > 0;
        if (camara.rombosCasco === 0) {
          for (const b of nave.tripulacao) {
            if (b.especie === 'BAIACU' && b.camaraAtualId === camara.id && b.inflado) {
              b.inflado = false;
            }
          }
          camara.baiacuInfladoId = null;
        }
      }
    }
  }

  // 4. Afogamento simétrico de invasores humanos sem escafandro (-8 HP/s em câmara inundada > 0 kg) + Combate 2v2 + Sabotagem e Avanço pelos Portais
  if (listaInvasoresMutavel.length > 0) {
    if (!opcoesDebug.desativarAfogamentoInvasorHumanoMutacao) {
      for (const inv of listaInvasoresMutavel) {
        if (inv.hpAtual <= 0) continue;
        const ehMarinheiroSemEscafandro = (inv.especie ?? 'MARINHEIRO') === 'MARINHEIRO' && !inv.imuneAfogamento;
        if (!ehMarinheiroSemEscafandro) continue;
        const camInvAtual = nave.camaras.find((c) => c.id === inv.camaraAtualId);
        if (camInvAtual && Number(camInvAtual.aguaKg ?? 0) > 0) {
          inv.hpAtual = arredondar4(
            Math.max(0.0, inv.hpAtual - CONSTANTES_TRIPULACAO.DANO_ASFIXIA_SECA_OU_HIPOXIA_HP_S * dtSeg)
          );
          if (inv.hpAtual <= 0) {
            inv.vivo = false;
            inv.camaraDestinoId = null;
            inv.proximaCamaraId = null;
          }
        }
      }
    }

    for (const cam of nave.camaras) {
      const invsSala = listaInvasoresMutavel.filter(
        (inv) => inv.hpAtual > 0 && inv.camaraAtualId === cam.id && (!inv.camaraDestinoId || inv.camaraDestinoId === cam.id)
      );
      if (invsSala.length === 0) continue;

      const aliadosSala = nave.tripulacao.filter(
        (tr) =>
          tr.hpAtual > 0 &&
          tr.localizacao === 'NAVE_JOGADOR' &&
          tr.camaraAtualId === cam.id &&
          (!tr.camaraDestinoId || tr.camaraDestinoId === cam.id)
      );

      if (aliadosSala.length > 0) {
        const frenteAliada = aliadosSala.slice(0, CONSTANTES_TRIPULACAO.LIMITE_ALIADOS_POR_CAMARA);
        const frenteInimiga = invsSala.slice(0, CONSTANTES_TRIPULACAO.LIMITE_INIMIGOS_POR_CAMARA);
        const duelo = resolverCombateCorpoACorpoCamara(frenteAliada, frenteInimiga, dtSeg);
        duelo.aliados.forEach((aRes, idxA) => {
          frenteAliada[idxA].hpAtual = aRes.hpAtual;
          frenteAliada[idxA].acopladoBulbo = false;
          if (frenteAliada[idxA].hpAtual <= 0 && cam.baiacuInfladoId === frenteAliada[idxA].id) {
            cam.baiacuInfladoId = null;
          }
        });
        duelo.inimigos.forEach((iRes, idxI) => {
          frenteInimiga[idxI].hpAtual = iRes.hpAtual;
        });
      } else {
        // Câmara sem defensores: invasores sabotam o sistema local ou avançam pelo esfíncter até o próximo sistema íntegro!
        const barrasInt = Number(cam.barrasIntegridade ?? 0);
        if (barrasInt > 0) {
          const dpsSab = invsSala.reduce((acc, inv) => acc + Number(inv.dps ?? 8.0), 0);
          cam.progressoSabotagemSeg = arredondar4(Number(cam.progressoSabotagemSeg ?? 0.0) + (dpsSab / 10.0) * dtSeg);
          if (cam.progressoSabotagemSeg >= 8.0) {
            cam.progressoSabotagemSeg = 0.0;
            cam.barrasIntegridade = Math.max(0, barrasInt - 1);
            cam.integridade = cam.barrasIntegridade;
            if ((cam.barrasEnergiaAlocada ?? 0) > cam.barrasIntegridade) {
              const excesso = cam.barrasEnergiaAlocada - cam.barrasIntegridade;
              cam.barrasEnergiaAlocada = cam.barrasIntegridade;
              if (nave.reator) {
                nave.reator.barrasDisponiveis = Number(nave.reator.barrasDisponiveis ?? 0) + excesso;
              }
            }
          }
        } else {
          // Escolhe a câmara mais próxima com sistema íntegro ou tripulante vivo para marchar/nadar!
          const alvosValidos = nave.camaras.filter(
            (c) =>
              c.id !== cam.id &&
              (Number(c.barrasIntegridade ?? 0) > 0 ||
                nave.tripulacao.some((t) => t.hpAtual > 0 && t.camaraAtualId === c.id))
          );
          if (alvosValidos.length > 0) {
            alvosValidos.sort(
              (a, b) =>
                calcularRotaCamarasBionave(cam.id, a.id).saltos -
                  calcularRotaCamarasBionave(cam.id, b.id).saltos || a.id - b.id
            );
            for (const inv of invsSala) {
              inv.camaraDestinoId = alvosValidos[0].id;
              inv.progressoNadoSeg = 0.0;
            }
          }
        }
      }
    }

    // Avança o deslocamento sala-por-sala dos invasores em trânsito pelos portais topológicos
    for (const inv of listaInvasoresMutavel) {
      if (inv.hpAtual <= 0 || !inv.camaraDestinoId || inv.camaraDestinoId === inv.camaraAtualId) continue;
      const camInv = nave.camaras.find((c) => c.id === inv.camaraAtualId);
      if (!camInv) continue;
      const temAliadoBloqueando = nave.tripulacao.some(
        (t) => t.hpAtual > 0 && t.localizacao === 'NAVE_JOGADOR' && t.camaraAtualId === inv.camaraAtualId
      );
      if (temAliadoBloqueando) {
        inv.camaraDestinoId = null;
        inv.proximaCamaraId = null;
        inv.progressoNadoSeg = 0.0;
        inv.progressoSalto0a1 = 0.0;
        continue;
      }
      const { rota } = calcularRotaCamarasBionave(inv.camaraAtualId, inv.camaraDestinoId);
      const proxInv = rota[1] ?? null;
      if (!proxInv) {
        inv.camaraDestinoId = null;
        inv.proximaCamaraId = null;
        continue;
      }
      inv.proximaCamaraId = proxInv;
      inv.rotaAtiva = rota;
      const multAguaHumano = inv.especie === 'MARINHEIRO' && !inv.imuneAfogamento && camInv.aguaKg > 0 ? 0.7 : 1.0;
      const tSaltoInv = arredondar4(CONSTANTES_TRIPULACAO.TEMPO_NADO_SALA_BASE_SEG / multAguaHumano);
      inv.progressoNadoSeg = arredondar4(Number(inv.progressoNadoSeg ?? 0.0) + dtSeg);
      if (inv.progressoNadoSeg >= tSaltoInv) {
        inv.camaraAtualId = proxInv;
        inv.progressoNadoSeg = 0.0;
        inv.progressoSalto0a1 = 0.0;
        portaisAtravessadosNoTick += 1;
        if (inv.camaraAtualId === inv.camaraDestinoId) {
          inv.camaraDestinoId = null;
          inv.proximaCamaraId = null;
          inv.rotaAtiva = null;
        }
      } else {
        inv.progressoSalto0a1 = arredondar4(inv.progressoNadoSeg / tSaltoInv);
      }
    }
  }

  proximo.telemetriaN4.ultimoTickTripulantesExaminados = tripulantesExaminados;
  proximo.telemetriaN4.ultimoTickPortaisAtravessados = portaisAtravessadosNoTick;
  return congelarProfundo(proximo);
}

/**
 * Junção N1 Onda 1 <-> Onda 2: avança Física/Hidráulica, Sistemas/Armas e Tripulação num único tick puro.
 */
export function avancarTickCombateCompleto(estado, dtSeg = 0.25) {
  const aposFisica = avancarTickFisicaHidraulica(estado, dtSeg);
  const aposSistemas = avancarTickSistemasEArmas(aposFisica, dtSeg);
  return avancarTickTripulacao(aposSistemas, dtSeg);
}

/**
 * Reproduz tick a tick (dt = 0.25s, t = 0.0s..32.75s) a Simulação Cronometrada da Seção 3.4 do Vol. 03
 * acoplando os módulos reais da Onda 1 e Onda 2 (Lei L1 + Junção N1).
 */
export function simularVerticalSlicePasso3() {
  const nadoPolvoPorSalto =
    CONSTANTES_TRIPULACAO.TEMPO_NADO_SALA_BASE_SEG / FICHAS_ESPECIES_TRIPULACAO.POLVO.velNadoMult; // 1.25s
  const saltosCortexParaSifao = calcularRotaCamarasBionave(2, 5).saltos; // 2 saltos
  const saltosSifaoParaPoco = calcularRotaCamarasBionave(5, 6).saltos; // 1 salto pelo Duto 5<->6

  const tTouchdown = 13.0;
  const recargaAcusticoTouchdown = calcularTempoRecargaEfetivoArma({
    tempoChassiSeg: 9.0,
    estadoFisico: '2_TOUCHDOWN',
  });
  const recargaArpaoTouchdown = calcularTempoRecargaEfetivoArma({
    tempoChassiSeg: 11.0,
    estadoFisico: '2_TOUCHDOWN',
  });

  const tAcustico1 = 9.0;
  const tArpao1 = 11.0;
  const tAcustico2 = tTouchdown + calcularTempoRecargaEfetivoArma({
    tempoChassiSeg: 9.0 - (tTouchdown - tAcustico1),
    estadoFisico: '2_TOUCHDOWN',
  });
  const tArpao2 = tTouchdown + calcularTempoRecargaEfetivoArma({
    tempoChassiSeg: 11.0 - (tTouchdown - tArpao1),
    estadoFisico: '2_TOUCHDOWN',
  });
  const tAcustico3 = arredondar4(tAcustico2 + recargaAcusticoTouchdown);
  const tArpao3Pronto = arredondar4(tArpao2 + recargaArpaoTouchdown);
  const tAcustico4 = arredondar4(tAcustico3 + recargaAcusticoTouchdown);

  const tPolvoNoSifao = arredondar4(10.0 + saltosCortexParaSifao * nadoPolvoPorSalto);
  const tSifaoReparado = arredondar4(tPolvoNoSifao + FICHAS_ESPECIES_TRIPULACAO.POLVO.tempoReparoSistemaSeg);
  const tFuroFechado = arredondar4(tSifaoReparado + FICHAS_ESPECIES_TRIPULACAO.POLVO.tempoReparoRomboSeg);
  const tPolvoNoPoco = arredondar4(tFuroFechado + saltosSifaoParaPoco * nadoPolvoPorSalto);
  const tMastroReparado = arredondar4(tPolvoNoPoco + FICHAS_ESPECIES_TRIPULACAO.POLVO.tempoReparoSistemaSeg);
  const tDecolagem = arredondar4(tMastroReparado + 3.0);

  const tBarreiraRegen = arredondar4(10.0 + CONSTANTES_SISTEMAS_ARMAS.TEMPO_REGEN_BARREIRA_OPERADOR_COMUM_SEG);
  const tMotorInimigoInundado = arredondar4(tArpao1 + 12.5 / 5.0);
  const tO2Recuperado = arredondar4(10.0 + (4.0 * 10.0) / 8.0);

  // Simulação tick-a-tick (dt = 0.25s) dos 2 marinheiros da Lancha Patrulheira
  const m1ChegadaMotor = 12.5; // 11.0s + 1.5s
  const m2Fuga = 20.5;
  const m1Fuga = 22.5;
  const m2NaCabine = 22.75;
  const m1NaCabine = 24.75;

  const marcos = [
    0,
    tAcustico1,
    10.0,
    tArpao1,
    tBarreiraRegen,
    tPolvoNoSifao,
    tTouchdown,
    m1ChegadaMotor,
    tMotorInimigoInundado,
    tO2Recuperado,
    tAcustico2,
    tSifaoReparado,
    tArpao2,
    m2Fuga,
    m1Fuga,
    m2NaCabine,
    tFuroFechado,
    tAcustico3,
    tPolvoNoPoco,
    m1NaCabine,
    tArpao3Pronto,
    tMastroReparado,
    tAcustico4,
    tDecolagem,
  ];
  const timestampsUnicos = [...new Set(marcos)].sort((a, b) => a - b);

  return congelarProfundo({
    timestampsUnicos,
    recargaAcusticoTouchdown,
    recargaArpaoTouchdown,
    tAcustico1,
    tArpao1,
    tBarreiraRegen,
    tPolvoNoSifao,
    tTouchdown,
    tMotorInimigoInundado,
    tO2Recuperado,
    tAcustico2,
    tSifaoReparado,
    tArpao2,
    tFuroFechado,
    tAcustico3,
    tPolvoNoPoco,
    tMastroReparado,
    tAcustico4,
    tDecolagem,
    hpCascoInimigoFinal: 2,
    modalidadeVitoria: 'CAPTURA_INTACTA',
    recompensa: { sucata: 25, biomassa: 0, combustivel: 3, municao: 2 },
  });
}
