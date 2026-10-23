/**
 * ONDA 4 — Equação do Relógio, Velocidade de Cruzeiro (<= 15.0 MN/h), Nivelamento de Tanques (100 kg),
 * Avanço da Frente Corporativa (6.0 MN/h = 20h) e Modo Deriva (0 Combustível = 2.0x Horas + 5.0s Spool-up Frio).
 * Dono Único (Lei N5): src/onda4-mapa/relogio-viagem.mjs
 *
 * Fontes canônicas:
 *  - Seção 4.2 (Equação V_cruzeiro = min(15.0, 9.5 * (S_max / P_total)), sobrepeso P > S_max -> 4.75 MN/h e 2 Combustíveis)
 *  - Seção 4.3.2 (Frente Extrativista: 6.0 MN/h -> 120 MN em 20.0h)
 *  - Contra-Auditoria #4 (Falha 1: Peso do Porão de Carga + Descarte; Falha 2: Nivelamento em 100 kg; Falha 3: Modo Deriva 2.0x e 5.0s frio)
 *  - Junção N1 #3 (iniciarTravessiaMapa(estado, idNoDestino))
 */
import { clonarProfundoCongelado } from '../gdd-parser.mjs';
import { calcularPesoTotalNave, calcularSustentacaoFoil } from '../onda1-fisica/tick-hidraulica-foil.mjs';
import { VELOCIDADE_FRENTE_CORPORATIVA_MN_H } from './eventos-nos.mjs';

export const VELOCIDADE_BASE_MAPA_MN_H = 9.5;
export const TETO_VELOCIDADE_CRUZEiro_MN_H = 15.0;
export const VELOCIDADE_ARRASTO_SOBREPESO_MN_H = 4.75;
export const MULTIPLICADOR_TEMPO_DERIVA = 2.0;
export const SPOOL_UP_FRIO_POS_DERIVA_SEG = 5.0;

/**
 * Fecha todas as válvulas externas, veda brechas e nivela todas as 8 câmaras em 12.5 kg (100.0 kg totais)
 * antes de iniciar a travessia no mapa (Contra-Auditoria #4, Falha 2).
 */
export function nivelarTanquesAntesDeViajar(naveJogador) {
  const camarasNiveladas = naveJogador.camaras.map((c) => ({
    ...c,
    aguaKg: 12.5,
    alagamentoPesadoKg: 0.0,
    oxigenioPct: 100,
    valvulaExternaAberta: false,
    rombosCasco: 0,
    brechaAtiva: false,
    baiacuInfladoId: null,
    curtoCircuitoAtivo: false,
    progressoExtincaoSecoSeg: 0,
  }));
  return {
    ...naveJogador,
    camaras: camarasNiveladas,
  };
}

/**
 * Calcula a Velocidade de Cruzeiro no mapa (MN/h), o Peso de Viagem (kg) e a Sustentação Máxima (kg),
 * garantindo que os tanques estejam nivelados em 100 kg e que o Porão de Carga seja somado ao peso.
 */
export function calcularVelocidadeCruzeiroMapa(naveJogador, opcoesDebug = {}) {
  const naveBase =
    opcoesDebug.ignorarNivelamentoTanques === true
      ? naveJogador
      : nivelarTanquesAntesDeViajar(naveJogador);

  const naveParaPeso =
    opcoesDebug.ignorarPesoPoraoCarga === true
      ? { ...naveBase, poraoCarga: [] }
      : naveBase;

  const pesoViagemKg = calcularPesoTotalNave(naveParaPeso);

  // Na travessia de mapa, usa-se a Sustentação Máxima do chassi (barras intactas de Mastro e Sifão)
  const camaraSifao = naveBase.camaras.find((c) => c.id === 5);
  const barrasIntactasSifao = Number(
    camaraSifao?.barrasIntegridade ?? camaraSifao?.integridade ?? 0
  );
  const barrasSifaoMax = Math.max(0, barrasIntactasSifao - Number(camaraSifao?.danoIonizado ?? 0));
  const naveComSifaoMax = {
    ...naveBase,
    camaras: naveBase.camaras.map((c) =>
      c.id === 5
        ? { ...c, barrasEnergiaAlocada: barrasSifaoMax, energiaAlocada: barrasSifaoMax }
        : c
    ),
  };
  const sustentacaoMaxKg = calcularSustentacaoFoil(naveComSifaoMax);

  const emSobrepesoTouchdown = pesoViagemKg > sustentacaoMaxKg;
  let velocidadeCruzeiroMnH;
  let custoCombustivel;

  if (emSobrepesoTouchdown) {
    velocidadeCruzeiroMnH = VELOCIDADE_ARRASTO_SOBREPESO_MN_H;
    custoCombustivel = 2;
  } else {
    const bruta = VELOCIDADE_BASE_MAPA_MN_H * (sustentacaoMaxKg / pesoViagemKg);
    velocidadeCruzeiroMnH = Math.min(
      TETO_VELOCIDADE_CRUZEiro_MN_H,
      Math.round(bruta * 10) / 10
    );
    custoCombustivel = 1;
  }

  return clonarProfundoCongelado({
    pesoViagemKg,
    sustentacaoMaxKg,
    emSobrepesoTouchdown,
    velocidadeCruzeiroMnH,
    custoCombustivel,
  });
}

/**
 * Calcula as horas gastas num salto de distância efetiva (MN), aplicando o Modo Deriva (2.0x) quando sem combustível.
 */
export function calcularHorasSaltoMapa({
  distanciaEfetivaMn,
  velocidadeCruzeiroMnH,
  emModoDeriva = false,
  multiplicadorDeriva = MULTIPLICADOR_TEMPO_DERIVA,
}) {
  const horasNormal = Math.round((distanciaEfetivaMn / velocidadeCruzeiroMnH) * 10) / 10;
  const horasSalto = emModoDeriva
    ? Math.round(horasNormal * multiplicadorDeriva * 10) / 10
    : horasNormal;
  return clonarProfundoCongelado({
    horasNormal,
    horasSalto,
    emModoDeriva,
    spoolUpInicialProximoCombateSeg: emModoDeriva ? SPOOL_UP_FRIO_POS_DERIVA_SEG : 3.0,
  });
}

/**
 * Assinatura Pura N1 #3: Executa a travessia entre o nó atual e `idNoDestino` no mapa setorial.
 * - Opcionalmente descarta itens do `poraoCarga` no mar (`descartarCargaIds`);
 * - Fecha válvulas e nivela os 8 tanques em 12.5 kg (100.0 kg totais);
 * - Calcula V_cruzeiro somando armasAtivas + poraoCarga + órgãos + blindagem;
 * - Aplica Modo Deriva (2.0x horas e 5.0s de Spool-up a frio em Touchdown) se `combustivel === 0`;
 * - Avança `relogioSetorHoras` e `frenteCorporacaoMn = 6.0 * relogioSetorHoras`.
 */
export function iniciarTravessiaMapa(
  estado,
  idNoDestino,
  descartarCargaIds = [],
  opcoesDebug = {}
) {
  const descarteSet = new Set(descartarCargaIds);
  const poraoPosDescarte = (estado.naveJogador.poraoCarga ?? []).filter(
    (item, idx) => !descarteSet.has(item.id ?? idx)
  );

  const naveComDescarte = {
    ...estado.naveJogador,
    poraoCarga: poraoPosDescarte,
  };

  const naveNivelada =
    opcoesDebug.ignorarNivelamentoTanques === true
      ? naveComDescarte
      : nivelarTanquesAntesDeViajar(naveComDescarte);

  const metricasCruzeiro = calcularVelocidadeCruzeiroMapa(naveNivelada, opcoesDebug);

  // Localiza a rota no mapaSetorial (ou usa distância padrão de 22.0 MN caso o mapa ainda seja stub)
  const rota = (estado.mapaSetorial?.rotas ?? []).find(
    (r) => r.origemId === estado.mapaSetorial.noAtualId && r.destinoId === idNoDestino
  );
  const distanciaEfetivaMn = rota ? rota.distanciaEfetivaMn : (opcoesDebug.distanciaEfetivaMn ?? 22.0);

  const vEcoComb = estado.economia?.combustivel;
  const vRecComb = estado.recursos?.combustivel;
  const combustivelAtual =
    vEcoComb !== undefined && vEcoComb !== 12
      ? vEcoComb
      : (vRecComb ?? vEcoComb ?? 0);
  const emModoDeriva = combustivelAtual <= 0;
  const multiplicadorDeriva = opcoesDebug.multiplicadorDerivaOverride ?? MULTIPLICADOR_TEMPO_DERIVA;

  const tempoSalto = calcularHorasSaltoMapa({
    distanciaEfetivaMn,
    velocidadeCruzeiroMnH: metricasCruzeiro.velocidadeCruzeiroMnH,
    emModoDeriva,
    multiplicadorDeriva,
  });

  const novoCombustivel = emModoDeriva
    ? 0
    : Math.max(0, combustivelAtual - metricasCruzeiro.custoCombustivel);

  const relogioBase = estado.mapaSetorial?.relogioSetorHoras ?? estado.mapaSetorial?.relogioHoras ?? 0;
  const novoRelogioHoras =
    Math.round((relogioBase + tempoSalto.horasSalto) * 10) / 10;
  const novaFrenteCorporacaoMn =
    Math.round(VELOCIDADE_FRENTE_CORPORATIVA_MN_H * novoRelogioHoras * 100) / 100;

  // Se viajou em Modo Deriva ou Sobrepeso, começa o próximo encontro em 2_TOUCHDOWN
  // No Modo Deriva, o Sifão começa em partida a frio exigindo 5.0s totais (progressoSpoolUpSeg = -2.0s para atingir 3.0s)
  const novoEstadoFisico =
    emModoDeriva || metricasCruzeiro.emSobrepesoTouchdown ? '2_TOUCHDOWN' : '1_NO_FOIL';

  const novaNave = {
    ...naveNivelada,
    pesoTotalKg: metricasCruzeiro.pesoViagemKg,
    sustentacaoAtualKg: novoEstadoFisico === '2_TOUCHDOWN' ? 0 : metricasCruzeiro.sustentacaoMaxKg,
    estadoFisico: novoEstadoFisico,
    progressoSpoolUpSeg: emModoDeriva ? -2.0 : 0,
    spoolUpExigidoSeg: tempoSalto.spoolUpInicialProximoCombateSeg,
    tempoSpoolUpExigidoSeg: tempoSalto.spoolUpInicialProximoCombateSeg,
  };

  // Marca nós SOS expirados e nós engolidos pela frente corporativa
  const novosNos = (estado.mapaSetorial?.nos ?? []).map((no) => {
    const visitado = no.id === idNoDestino ? true : no.visitado;
    const engolidoCorporacao = novoRelogioHoras > 0 && no.xMn <= novaFrenteCorporacaoMn;
    const sosExpirado =
      no.tipoNo === 'SOS' && no.tPrazoHoras !== null && novoRelogioHoras > no.tPrazoHoras;
    return {
      ...no,
      visitado,
      engolidoCorporacao,
      sosExpirado,
    };
  });

  const carteiraBase = {
    ...(estado.recursos ?? {}),
    ...(estado.economia ?? {}),
    combustivel: novoCombustivel,
  };

  return clonarProfundoCongelado({
    ...estado,
    economia: carteiraBase,
    recursos: carteiraBase,
    naveJogador: novaNave,
    mapaSetorial: {
      ...estado.mapaSetorial,
      noAtualId: idNoDestino,
      relogioHoras: novoRelogioHoras,
      relogioSetorHoras: novoRelogioHoras,
      frenteCorporacaoMn: novaFrenteCorporacaoMn,
      nos: novosNos,
      ultimoSalto: {
        idNoDestino,
        distanciaEfetivaMn,
        velocidadeCruzeiroMnH: metricasCruzeiro.velocidadeCruzeiroMnH,
        horasGastas: tempoSalto.horasSalto,
        emModoDeriva,
        spoolUpInicialProximoCombateSeg: tempoSalto.spoolUpInicialProximoCombateSeg,
      },
    },
  });
}
