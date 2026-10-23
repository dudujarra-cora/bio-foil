import test from 'node:test';
import assert from 'node:assert/strict';

import {
  criarCamarasIniciais,
  criarEstadoInicialPartida,
  clonarCongelado,
  congelarProfundo,
} from '../src/onda1-fisica/estado-inicial.mjs';
import {
  CONSTANTES_FISICA_HIDRAULICA,
  calcularAguaInternaNormalTotalKg,
  calcularAlagamentoPesadoTotalKg,
  calcularPesoArmasECargaKg,
  calcularPesoTotalNave,
  calcularSustentacaoFoil,
  calcularPenalidadeCavitacaoKg,
  classificarEstadoCompostoMatriz,
  alternarValvulaExterna,
  drenarTodasValvulas,
  alternarMergulhoTatico,
  avancarTickFisicaHidraulica,
} from '../src/onda1-fisica/tick-hidraulica-foil.mjs';
import {
  formatarChaveHash32,
  hash32,
  hash32Uniforme01,
  hash32Percentual100,
  streamMapaPoisson,
  streamEventoOpcaoA,
  streamLojaEstoque,
  streamCombateDisparo,
  streamChefeDraga,
  streamSorteioTemplates,
} from '../src/onda1-fisica/hash32-streams.mjs';
import {
  calcularSustentacaoAtual,
  calcularHash32StreamDeterministico,
} from '../src/oraculos-referencia.mjs';

test('Onda 1 (L2 + L4 + N4): fábrica imutável das 5 carcaças, 8 câmaras, 5 estados e 7 patamares do Mastro', () => {
  const carcaçasEsperadas = [
    { id: 'CARCACA_ALFA', peso: 225, sust: 260, margem: 35, hp: 30 },
    { id: 'MANTA_VOLT', peso: 195, sust: 260, margem: 65, hp: 30 },
    { id: 'COURACA_LIMIAR', peso: 225, sust: 300, margem: 75, hp: 30 },
    { id: 'SOMBRA_ABISSAL', peso: 220, sust: 260, margem: 40, hp: 20 },
    { id: 'COLMEIA_VIVA', peso: 230, sust: 260, margem: 30, hp: 30 },
  ];

  let navesExaminadas = 0;
  for (const esp of carcaçasEsperadas) {
    const estado = criarEstadoInicialPartida({ idArquitetura: esp.id });
    assert.equal(Object.isFrozen(estado), true, `Estado de ${esp.id} deve nascer congelado`);
    assert.equal(Object.isFrozen(estado.naveJogador.camaras), true);
    assert.equal(estado.naveJogador.camaras.length, 8, 'Toda carcaça deve ter 8 câmaras');
    assert.equal(estado.naveJogador.hpCascoMax, esp.hp);

    const peso = calcularPesoTotalNave(estado.naveJogador);
    const sust = calcularSustentacaoFoil(estado.naveJogador);
    assert.equal(peso, esp.peso, `Peso inicial de ${esp.id} deve ser ${esp.peso} kg`);
    assert.equal(sust, esp.sust, `Sustentação inicial de ${esp.id} deve ser ${esp.sust} kg`);
    assert.equal(sust - peso, esp.margem, `Margem de ${esp.id} deve ser ${esp.margem} kg`);
    assert.equal(calcularAguaInternaNormalTotalKg(estado.naveJogador), 100.0);
    assert.equal(calcularAlagamentoPesadoTotalKg(estado.naveJogador), 0.0);
    assert.equal(
      calcularPesoArmasECargaKg(estado.naveJogador),
      esp.peso - estado.naveJogador.pesoChassiKg - 100.0
    );

    const barrasMastro = estado.naveJogador.camaras.find((c) => c.id === 6).barrasIntegridade;
    const sustOraculo =
      calcularSustentacaoAtual({
        barrasIntactasMastro: barrasMastro,
        barrasEnergiaSifao: 2,
        aguaTotalTanquesKg: 100,
      }) + estado.naveJogador.bonusSustentacaoMastroKg;
    assert.equal(sust, sustOraculo, `Oráculo de referência deve concordar com ${esp.id}`);
    navesExaminadas += 1;
  }

  // N4: 7 patamares de barras do Mastro (1..7 barras -> 50..330 kg)
  const patamaresEsperados = [
    [1, 50],
    [2, 100],
    [3, 150],
    [4, 200],
    [5, 240],
    [6, 280],
    [7, 330],
  ];
  let patamaresExaminados = 0;
  for (const [barras, kgEsperado] of patamaresEsperados) {
    const base = structuredClone(criarEstadoInicialPartida({ idArquitetura: 'CARCACA_ALFA' }));
    const mastro = base.naveJogador.camaras.find((c) => c.id === 6);
    const sifao = base.naveJogador.camaras.find((c) => c.id === 5);
    mastro.nivelMaxBarras = 7;
    mastro.barrasIntegridade = barras;
    sifao.barrasEnergiaAlocada = 1; // +30 kg
    const congelado = congelarProfundo(base);
    assert.equal(
      calcularSustentacaoFoil(congelado.naveJogador),
      kgEsperado + 30,
      `Mastro com ${barras} barras + 1 barra de Sifão deve sustentar ${kgEsperado + 30} kg`
    );
    patamaresExaminados += 1;
  }

  // N4: 5 estados físicos compostos da Matriz 6.2
  const estadosExaminados = CONSTANTES_FISICA_HIDRAULICA.ESTADOS_FISICOS_NAVE.length;
  console.log(
    `[N4] Onda 1 examinada: ${navesExaminadas} carcaças, 8 câmaras, ${estadosExaminados} estados físicos, ${patamaresExaminados} patamares do Mastro`
  );
  assert.equal(navesExaminadas, 5);
  assert.equal(estadosExaminados, 5);
  assert.equal(patamaresExaminados, 7);
  const camarasAlfa = criarCamarasIniciais('CARCACA_ALFA');
  assert.equal(camarasAlfa.length, 8);
  assert.equal(formatarChaveHash32('seed-a', 'STREAM_1', 1, 'X'), 'seed-a::STREAM_1::1:X');
});

test('Onda 1 (MUT-O1-01 + MUT-O1-04 + N1): queda por Sifão=0/Mastro=0 e Cavitação ao drenar 4 câmaras no ar', () => {
  const inicial = criarEstadoInicialPartida({ idArquitetura: 'CARCACA_ALFA' });

  // MUT-O1-01: zerar barras de energia do Sifão deve derrubar a sustentação para 0 kg e entrar em 2_TOUCHDOWN
  const copiaSemSifao = structuredClone(inicial);
  copiaSemSifao.naveJogador.camaras.find((c) => c.id === 5).barrasEnergiaAlocada = 0;
  const estadoSemSifao = congelarProfundo(copiaSemSifao);
  assert.equal(
    calcularSustentacaoFoil(estadoSemSifao.naveJogador),
    0,
    'Com 0 barras de energia no Sifão, a sustentação deve cair para 0 kg (Mastro não sustenta parado)'
  );
  const posTickSemSifao = avancarTickFisicaHidraulica(estadoSemSifao, 0.25);
  assert.equal(
    posTickSemSifao.naveJogador.estadoFisico,
    '2_TOUCHDOWN',
    'Com 0 barras no Sifão a nave deve cair imediatamente em 2_TOUCHDOWN'
  );

  // Junção N1 + MUT-O1-04: esvaziar 4 câmaras no ar (-2.5 kg/s por 5.0s = 20 ticks de 0.25s)
  let estado = inicial;
  for (const idCamara of [1, 2, 7, 8]) {
    estado = alternarValvulaExterna(estado, idCamara, true);
  }
  for (let tick = 0; tick < 20; tick += 1) {
    estado = avancarTickFisicaHidraulica(estado, 0.25);
  }
  assert.equal(estado.telemetriaN4.ultimoTickCamarasExaminadas, 8, 'O tick deve examinar todas as 8 câmaras');
  assert.equal(
    estado.naveJogador.pesoTotalKg,
    175,
    'Após drenar 4 câmaras (-50 kg de água), o peso total da Carcaça Alfa deve cair de 225 kg para 175 kg'
  );
  assert.equal(
    calcularPenalidadeCavitacaoKg(50),
    25,
    'Com 50 kg de água interna (12.5 kg abaixo de 62.5 kg), a penalidade de cavitação deve ser 25 kg (-2 kg por kg)'
  );
  assert.equal(
    estado.naveJogador.sustentacaoAtualKg,
    235,
    'Com 4 câmaras secas (50 kg de água), a sustentação deve sofrer -25 kg de cavitação (260 -> 235 kg)'
  );
});

test('Onda 1 (MUT-O1-02 + MUT-O1-03 + Matriz 6.2): Trava Hidrostática em 2_TOUCHDOWN/3_SPOOL_UP e aborto de Spool-up em t=2.5s', () => {
  // Coloca a nave em 2_TOUCHDOWN por Mergulho Tático
  let estado = criarEstadoInicialPartida({ idArquitetura: 'CARCACA_ALFA' });
  estado = alternarMergulhoTatico(estado, true);
  assert.equal(estado.naveJogador.estadoFisico, '2_TOUCHDOWN');

  // MUT-O1-02 (Célula 2C): tentar abrir válvula externa em 2_TOUCHDOWN deve ser bloqueado com BLOQUEADO_TRAVA_HIDROSTATICA
  const aposTentativaTouchdown = alternarValvulaExterna(estado, 1, true);
  assert.equal(
    aposTentativaTouchdown.naveJogador.camaras.find((c) => c.id === 1).valvulaExternaAberta,
    false,
    'Válvula Externa não pode abrir em 2_TOUCHDOWN (Trava Hidrostática Automática)'
  );
  assert.equal(
    aposTentativaTouchdown.logDeterministico.at(-1)?.motivo,
    'BLOQUEADO_TRAVA_HIDROSTATICA',
    'Rejeição em 2_TOUCHDOWN deve emitir BLOQUEADO_TRAVA_HIDROSTATICA'
  );

  // Desativa Mergulho Tático -> entra em 3_SPOOL_UP
  estado = alternarMergulhoTatico(aposTentativaTouchdown, false);
  assert.equal(estado.naveJogador.estadoFisico, '3_SPOOL_UP');

  // MUT-O1-02 (Célula 3C): tentar abrir válvula externa em 3_SPOOL_UP também deve ser bloqueado
  const aposTentativaSpool = alternarValvulaExterna(estado, 1, true);
  assert.equal(
    aposTentativaSpool.naveJogador.camaras.find((c) => c.id === 1).valvulaExternaAberta,
    false,
    'Válvula Externa não pode abrir em 3_SPOOL_UP (Trava Hidrostática Automática)'
  );
  assert.equal(
    aposTentativaSpool.logDeterministico.at(-1)?.motivo,
    'BLOQUEADO_TRAVA_HIDROSTATICA',
    'Rejeição em 3_SPOOL_UP deve emitir BLOQUEADO_TRAVA_HIDROSTATICA'
  );

  // MUT-O1-03 (Célula 3B): avança Spool-up até t = 2.5s (10 ticks de 0.25s) e injeta alagamento pesado fazendo P_total > S_atual
  let emSpool = estado;
  for (let i = 0; i < 10; i += 1) {
    emSpool = avancarTickFisicaHidraulica(emSpool, 0.25);
  }
  assert.equal(emSpool.naveJogador.estadoFisico, '3_SPOOL_UP');
  assert.equal(emSpool.naveJogador.progressoSpoolUpSeg, 2.5);

  // Abre 2 rombos submersos com sobrecarga hidrostática (+40 kg -> 265 kg > 260 kg)
  const copiaAlagada = structuredClone(emSpool);
  copiaAlagada.naveJogador.camaras.find((c) => c.id === 1).alagamentoPesadoKg = 20.0;
  copiaAlagada.naveJogador.camaras.find((c) => c.id === 2).alagamentoPesadoKg = 20.0;
  const aposSobrecarga = avancarTickFisicaHidraulica(congelarProfundo(copiaAlagada), 0.25);

  assert.equal(
    aposSobrecarga.naveJogador.estadoFisico,
    '2_TOUCHDOWN',
    'Se P_total > S_atual durante o Spool-up, a nave deve voltar imediatamente para 2_TOUCHDOWN'
  );
  assert.equal(
    aposSobrecarga.naveJogador.progressoSpoolUpSeg,
    0,
    'Se P_total > S_atual em t=2.5s do Spool-up, o progresso do Spool-up (3.0s) deve ser zerado para 0.0s'
  );
});

test('Onda 1: Baiacu Inflado veda rombo (0.0 kg/s), Bomba Branquial drena alagamento pesado (-4.0 kg/s) e hash32 bate com o vetor canônico', () => {
  // Verifica Baiacu Inflado vedando rombo no ar e no mar
  const base = structuredClone(criarEstadoInicialPartida({ idArquitetura: 'CARCACA_ALFA' }));
  const camaraSifao = base.naveJogador.camaras.find((c) => c.id === 5);
  camaraSifao.rombosCasco = 1;
  camaraSifao.baiacuInfladoId = 'trip-baiacu-1';
  base.naveJogador.tripulacao.find((t) => t.id === 'trip-baiacu-1').inflado = true;

  const apos1sNoAr = avancarTickFisicaHidraulica(congelarProfundo(base), 1.0);
  assert.equal(
    apos1sNoAr.naveJogador.camaras.find((c) => c.id === 5).aguaKg,
    12.5,
    'Com Baiacu Inflado vedando o rombo no ar, a perda de água deve ser 0.0 kg/s'
  );

  // Verifica hash32 e os 6 streams isolados contra o oráculo de referência
  const vetorMedido = hash32('biofoil-seed-01', 'EVENTO_NO', 2, 'NO_SOS_3');
  assert.equal(vetorMedido, 2219090311, 'hash32 deve produzir o vetor de teste canônico 2219090311');
  assert.equal(vetorMedido, calcularHash32StreamDeterministico('biofoil-seed-01', 'EVENTO_NO', 2, 'NO_SOS_3'));

  const s1 = streamMapaPoisson('seed-x', 1);
  const s2 = streamEventoOpcaoA('seed-x', 1, 'NO_1');
  const s3 = streamLojaEstoque('seed-x', 1, 'NO_2');
  const s4 = streamCombateDisparo('seed-x', 1, 'NO_1', 10, 0);
  const s5 = streamChefeDraga('seed-x', 3, 40, 2);
  const s6 = streamSorteioTemplates('seed-x', 1, 'SOS_1_REDE_ARRASTO');
  assert.equal(new Set([s1, s2, s3, s4, s5, s6]).size, 6, 'Os 6 streams PRNG devem produzir hashes distintos e isolados');

  // Cobertura completa de utilitários Onda 1: clonarCongelado, hash32Uniforme01, hash32Percentual100,
  // classificarEstadoCompostoMatriz, drenarTodasValvulas, sobrecarga hidrostática, dreno Branquial e decolagem completa
  const inicial = criarEstadoInicialPartida({ idArquitetura: 'CARCACA_ALFA' });
  const clone = clonarCongelado(inicial);
  assert.notEqual(clone, inicial);
  assert.equal(Object.isFrozen(clone), true);
  assert.throws(() => criarEstadoInicialPartida({ idArquitetura: 'INEXISTENTE' }), /Arquitetura desconhecida/);

  const u01 = hash32Uniforme01('seed-x', 'TESTE', null, undefined, { k: 1 });
  const p100 = hash32Percentual100('seed-x', 'TESTE', true);
  assert.ok(u01 >= 0 && u01 < 1);
  assert.ok(Number.isInteger(p100) && p100 >= 0 && p100 <= 99);

  assert.equal(classificarEstadoCompostoMatriz({ estadoFisico: '1_NO_FOIL', furtividadeAtivaSeg: 0 }), '1_NO_FOIL');
  assert.equal(classificarEstadoCompostoMatriz({ estadoFisico: '1_NO_FOIL', furtividadeAtivaSeg: 5 }), '4_FURTIVO_AR');
  assert.equal(classificarEstadoCompostoMatriz({ estadoFisico: '2_TOUCHDOWN', furtividadeAtivaSeg: 0 }), '2_TOUCHDOWN');
  assert.equal(classificarEstadoCompostoMatriz({ estadoFisico: '2_TOUCHDOWN', furtividadeAtivaSeg: 5 }), '5_FURTIVO_AGUA');

  // Atalho [V] DRENAR TUDO no ar vs bloqueado em Touchdown e câmara inválida em alternarValvulaExterna
  const todasAbertas = drenarTodasValvulas(inicial, true);
  assert.equal(todasAbertas.naveJogador.camaras.every((c) => c.valvulaExternaAberta === true), true);
  const todasFechadas = drenarTodasValvulas(todasAbertas, false);
  assert.equal(todasFechadas.naveJogador.camaras.every((c) => c.valvulaExternaAberta === false), true);
  const camInvalida = alternarValvulaExterna(inicial, 999, true);
  assert.equal(camInvalida.logDeterministico.at(-1)?.motivo, 'PRECONDICAO_NAO_ATENDIDA');

  const emTouchdown = alternarMergulhoTatico(inicial, true);
  const drenoBloqueado = drenarTodasValvulas(emTouchdown, true);
  assert.equal(drenoBloqueado.logDeterministico.at(-1)?.motivo, 'BLOQUEADO_TRAVA_HIDROSTATICA');

  // Sobrecarga hidrostática em 2_TOUCHDOWN (+5.0 kg/s -> alagamentoPesadoKg + curtoCircuitoAtivo) e dreno pela Bomba Branquial (-4.0 kg/s)
  const copiaRomboMar = structuredClone(emTouchdown);
  copiaRomboMar.naveJogador.camaras.find((c) => c.id === 1).aguaKg = 10.0;
  copiaRomboMar.naveJogador.camaras.find((c) => c.id === 5).rombosCasco = 1;
  copiaRomboMar.naveJogador.camaras.find((c) => c.id === 3).barrasEnergiaAlocada = 1;
  const aposRomboMar = avancarTickFisicaHidraulica(congelarProfundo(copiaRomboMar), 1.0);
  assert.equal(aposRomboMar.naveJogador.camaras.find((c) => c.id === 1).aguaKg, 12.5, 'Recarga tática no mar enche sala seca a +5.0 kg/s até 12.5 kg');
  assert.equal(aposRomboMar.naveJogador.camaras.find((c) => c.id === 5).alagamentoPesadoKg, 5.0, 'Rombo submerso gera +5.0 kg/s de alagamento pesado');
  assert.equal(aposRomboMar.naveJogador.camaras.find((c) => c.id === 5).curtoCircuitoAtivo, true, 'Alagamento pesado dispara Curto-Circuito Aquático');

  // Vedando o rombo na água com Bomba Branquial ligada drena o alagamento pesado (-4.0 kg/s) e conclui os 3.0s de Spool-up
  const copiaVedadaMar = structuredClone(aposRomboMar);
  copiaVedadaMar.naveJogador.mergulhoTaticoAtivo = false;
  copiaVedadaMar.naveJogador.camaras.find((c) => c.id === 5).rombosCasco = 0;
  copiaVedadaMar.naveJogador.camaras.find((c) => c.id === 5).brechaAtiva = false;
  let estadoDecolagem = congelarProfundo(copiaVedadaMar);
  for (let i = 0; i < 4; i += 1) {
    estadoDecolagem = avancarTickFisicaHidraulica(estadoDecolagem, 1.0);
  }
  assert.equal(estadoDecolagem.naveJogador.camaras.find((c) => c.id === 5).alagamentoPesadoKg, 0.0);
  assert.equal(estadoDecolagem.naveJogador.estadoFisico, '1_NO_FOIL', 'Após 3.0s de Spool-up contínuo, a nave retorna para 1_NO_FOIL');

  // No ar com Bomba Branquial ativa: drena alagamento pesado residual (-4.0 kg/s) e puxa recarga capilar (+1.25 kg/s)
  const copiaCapilar = structuredClone(estadoDecolagem);
  copiaCapilar.naveJogador.camaras.find((c) => c.id === 1).aguaKg = 10.0;
  copiaCapilar.naveJogador.camaras.find((c) => c.id === 1).alagamentoPesadoKg = 4.0;
  copiaCapilar.naveJogador.camaras.find((c) => c.id === 2).alagamentoPesadoKg = 2.0;
  copiaCapilar.naveJogador.camaras.find((c) => c.id === 2).valvulaExternaAberta = true;
  const aposCapilar = avancarTickFisicaHidraulica(congelarProfundo(copiaCapilar), 1.0);
  assert.equal(aposCapilar.naveJogador.camaras.find((c) => c.id === 1).alagamentoPesadoKg, 0.0);
  assert.equal(aposCapilar.naveJogador.camaras.find((c) => c.id === 1).aguaKg, 11.25);
  assert.equal(aposCapilar.naveJogador.camaras.find((c) => c.id === 2).alagamentoPesadoKg, 0.0);
  assert.equal(aposCapilar.naveJogador.camaras.find((c) => c.id === 2).aguaKg, 12.0);

  // Guardas Lei L2 (Object.freeze), validações de formatarChaveHash32, porão com { item } e queda 1_NO_FOIL -> 2_TOUCHDOWN por rombo no ar
  assert.throws(() => formatarChaveHash32('', 'DOM'), /seedPartida deve ser uma string não vazia/);
  assert.throws(() => formatarChaveHash32('SEED', '   '), /dominio deve ser uma string não vazia/);
  assert.throws(() => alternarValvulaExterna(structuredClone(inicial), 1, true), /\[Lei L2\]/);
  assert.throws(() => drenarTodasValvulas(structuredClone(inicial), true), /\[Lei L2\]/);
  assert.throws(() => alternarMergulhoTatico(structuredClone(inicial), true), /\[Lei L2\]/);
  assert.throws(() => avancarTickFisicaHidraulica(structuredClone(inicial), 0.25), /\[Lei L2\]/);
  assert.throws(() => avancarTickFisicaHidraulica(inicial, 0), /dtSeg deve ser um número positivo/);

  const copiaQuedaAr = structuredClone(inicial);
  copiaQuedaAr.naveJogador.poraoCarga = [{ item: { pesoKg: 20 } }];
  copiaQuedaAr.naveJogador.camaras.find((c) => c.id === 6).barrasIntegridade = 3;
  copiaQuedaAr.naveJogador.camaras.find((c) => c.id === 5).barrasEnergiaAlocada = 2;
  for (const c of copiaQuedaAr.naveJogador.camaras) {
    c.aguaKg = 7.9;
    c.rombosCasco = 2;
    c.valvulaExternaAberta = true;
  }
  const aposQuedaAr = avancarTickFisicaHidraulica(congelarProfundo(copiaQuedaAr), 1.0);
  assert.equal(aposQuedaAr.naveJogador.estadoFisico, '2_TOUCHDOWN', 'Cavitação pós-vazamento de rombos no ar transiciona 1_NO_FOIL -> 2_TOUCHDOWN');
  assert.equal(aposQuedaAr.naveJogador.camaras.find((c) => c.id === 1).aguaKg, 3.4, '2 rombos (-2.0 kg/s) + válvula aberta (-2.5 kg/s) vazam -4.5 kg/s no ar');
});
