/**
 * [Onda 1] FNV-1a de 32 bits sem sinal e os 6 Streams isolados de PRNG (Seção 9.3 do Vol. 09).
 * Zero Math.random() — determinismo estrito por domínio e coordenada.
 */

export const FNV1A_32_OFFSET_BASIS = 0x811c9dc5;
export const FNV1A_32_PRIME = 0x01000193;

export const DOMINIOS_STREAM_PRNG = Object.freeze({
  STREAM_1_MAPA_POISSON: 'MAPA_SETORIAL',
  STREAM_2_EVENTO_OPCAO_A: 'EVENTO_NO',
  STREAM_3_LOJA_ESTOQUE: 'LOJA_FORJA',
  STREAM_4_COMBATE_DISPARO: 'COMBATE_TICK',
  STREAM_5_CHEFE_DRAGA: 'CHEFE_DRAGA',
  STREAM_6_SORTEIO_TEMPLATES: 'EVENTO_SORTEIO',
});

/**
 * Formata a chave ASCII canônica `seedPartida::DOMINIO::c1:c2:...`.
 */
export function formatarChaveHash32(seedPartida, dominio, ...coordenadas) {
  if (typeof seedPartida !== 'string' || seedPartida.trim().length === 0) {
    throw new Error('[hash32] seedPartida deve ser uma string não vazia');
  }
  if (typeof dominio !== 'string' || dominio.trim().length === 0) {
    throw new Error('[hash32] dominio deve ser uma string não vazia');
  }
  const sufixo = coordenadas.map((c) => String(c)).join(':');
  return `${seedPartida}::${dominio}::${sufixo}`;
}

/**
 * Calcula o hash FNV-1a de 32 bits sem sinal sobre a chave ASCII `seedPartida::DOMINIO::c1:c2:...`.
 * Vetor de teste canônico (Seção 9.3):
 *   hash32('biofoil-seed-01', 'EVENTO_NO', 2, 'NO_SOS_3') === 2219090311
 */
export function hash32(seedPartida, dominio, ...coordenadas) {
  const chave = formatarChaveHash32(seedPartida, dominio, ...coordenadas);
  let h = FNV1A_32_OFFSET_BASIS;
  for (let i = 0; i < chave.length; i += 1) {
    h ^= chave.charCodeAt(i) & 0xff;
    h = Math.imul(h, FNV1A_32_PRIME) >>> 0;
  }
  return h >>> 0;
}

/**
 * Converte um inteiro 32 bits sem sinal em fração uniforme [0, 1).
 */
export function hash32Uniforme01(seedPartida, dominio, ...coordenadas) {
  return hash32(seedPartida, dominio, ...coordenadas) / 0x100000000;
}

/**
 * Converte um inteiro 32 bits sem sinal em percentual inteiro [0, 99].
 */
export function hash32Percentual100(seedPartida, dominio, ...coordenadas) {
  return hash32(seedPartida, dominio, ...coordenadas) % 100;
}

export function streamMapaPoisson(seedPartida, setorNumero, ...subCoords) {
  return hash32(seedPartida, DOMINIOS_STREAM_PRNG.STREAM_1_MAPA_POISSON, setorNumero, ...subCoords);
}

export function streamEventoOpcaoA(seedPartida, setorNumero, noId, ...subCoords) {
  return hash32(seedPartida, DOMINIOS_STREAM_PRNG.STREAM_2_EVENTO_OPCAO_A, setorNumero, noId, ...subCoords);
}

export function streamLojaEstoque(seedPartida, setorNumero, noId, ...subCoords) {
  return hash32(seedPartida, DOMINIOS_STREAM_PRNG.STREAM_3_LOJA_ESTOQUE, setorNumero, noId, ...subCoords);
}

export function streamCombateDisparo(seedPartida, setorNumero, noId, tickAtual, indiceDisparo) {
  return hash32(
    seedPartida,
    DOMINIOS_STREAM_PRNG.STREAM_4_COMBATE_DISPARO,
    setorNumero,
    noId,
    tickAtual,
    indiceDisparo
  );
}

export function streamChefeDraga(seedPartida, faseChefe, tickAtual, indiceLaserOuDrone) {
  return hash32(
    seedPartida,
    DOMINIOS_STREAM_PRNG.STREAM_5_CHEFE_DRAGA,
    faseChefe,
    tickAtual,
    indiceLaserOuDrone
  );
}

export function streamSorteioTemplates(seedPartida, setorNumero, idTemplate) {
  return hash32(seedPartida, DOMINIOS_STREAM_PRNG.STREAM_6_SORTEIO_TEMPLATES, setorNumero, idTemplate);
}
