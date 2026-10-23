/**
 * PORTÃO 06 — ONDA 4: Gerador Procedural de Mapa (18 a 22 Nós), Relógio da Corporação,
 * 17 Templates de Eventos (SOS/Blue Options/Perigos), SOS Expirado e Ciclo de Partida.
 *
 * Cumpre:
 *  - Lei N1 (Junção real: Porão de Carga + Tanques Pós-Combate <-> Horas de Salto e Expiração de SOS)
 *  - Lei N4 (Contadores explícitos: 100 seeds procedurais, 17 templates, 5 carcaças, 13 transições)
 *  - Lei L2 (Imutabilidade profunda Object.isFrozen)
 *  - Lei L6 (Cobertura explícita de MUT-O4-01, MUT-O4-02, MUT-O4-03 e MUT-O4-04)
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { criarEstadoInicialPartida } from '../src/onda1-fisica/estado-inicial.mjs';
import {
  calcularDistanciaEuclidianaMn,
  calcularTemposRotaMinimaPadrao,
  gerarMapaSetorial,
  auditarInvariantesMapaSetorial,
} from '../src/onda4-mapa/gerador-poisson.mjs';
import {
  calcularVelocidadeCruzeiroMapa,
  calcularHorasSaltoMapa,
  nivelarTanquesAntesDeViajar,
  iniciarTravessiaMapa,
} from '../src/onda4-mapa/relogio-viagem.mjs';
import {
  CATALOGO_TEMPLATES_EVENTOS_45A,
  KITS_INICIAIS_5_CARCACAS,
  extrairKitDaNave,
  avaliarMatrizElegibilidadeInicial45C,
  sortearTemplatesDoSetor,
  resolverVisitaNoMapa,
} from '../src/onda4-mapa/eventos-nos.mjs';
import { kitCumpreRequisitoBlueOption } from '../src/oraculos-referencia.mjs';
import {
  FASES_JOGO_CANONICAS,
  TRANSICOES_CICLO_92,
  auditarGrafoCicloPartida,
  aplicarTransicaoCicloPartida,
} from '../src/onda4-mapa/ciclo-partida.mjs';

test('[PORTÃO 06.1 | N4 + MUT-O4-03] Lote de 100 seeds procedurais: 18..22 nós, rotas <= 28 MN, zero beco sem saída e cotas invariantes', () => {
  let seedsAuditadas = 0;
  const totaisVistos = new Set();

  for (let i = 1; i <= 100; i += 1) {
    const seed = `seed-onda4-${String(i).padStart(3, '0')}`;
    const mapa = gerarMapaSetorial(seed, (i % 8) + 1);
    assert.equal(Object.isFrozen(mapa), true);

    const auditoria = auditarInvariantesMapaSetorial(mapa);
    assert.equal(
      auditoria.valido,
      true,
      `Seed ${seed} violou invariantes do mapa: ${auditoria.erros.join('; ')}`
    );
    assert.ok(mapa.totalNos >= 18 && mapa.totalNos <= 22);
    totaisVistos.add(mapa.totalNos);

    // MUT-O4-03: nenhum nó nas Colunas 1 a 4 pode ter 0 rotas de saída para a direita
    for (const no of mapa.nos) {
      if (no.coluna >= 1 && no.coluna <= 4) {
        assert.ok(
          no.rotasSaidaDireita.length >= 1,
          `[MUT-O4-03] Nó ${no.id} na seed ${seed} ficou com 0 rotas de saída à direita`
        );
      }
    }

    seedsAuditadas += 1;
  }

  assert.equal(seedsAuditadas, 100, `[N4] Examinados: ${seedsAuditadas}/100 seeds procedurais`);
  assert.ok(totaisVistos.size >= 4, 'O lote de 100 seeds deve exercitar variações reais entre 18 e 22 nós');
  assert.equal(calcularDistanciaEuclidianaMn({ xMn: 0, yMn: 0 }, { xMn: 3, yMn: 4 }), 5.0);
  const mapaRef = gerarMapaSetorial('seed-onda4-001', 1);
  const temposMinimos = calcularTemposRotaMinimaPadrao(mapaRef.nos, mapaRef.rotas);
  assert.equal(temposMinimos.NO_0_ENTRADA, 0);
  const naveNivelada = nivelarTanquesAntesDeViajar(criarEstadoInicialPartida().naveJogador);
  assert.equal(naveNivelada.camaras.reduce((acc, c) => acc + c.aguaKg, 0), 100.0);
});

test('[PORTÃO 06.2 | N1 + MUT-O4-01..02..04] Junção Porão + Tanques Pós-Combate <-> Velocidade de Cruzeiro, Modo Deriva (<= 4.0h) e Expiração de SOS', () => {
  const estadoBase = criarEstadoInicialPartida('seed-viagem-01', 'CARCACA_ALFA');
  const mapa = gerarMapaSetorial('seed-viagem-01', 1);

  // 1. Nave Inicial Padrão (225 kg / 260 kg) -> 11.0 MN/h -> 2.0h em salto de 22 MN
  const cruzeiroPadrao = calcularVelocidadeCruzeiroMapa(estadoBase.naveJogador);
  assert.equal(cruzeiroPadrao.pesoViagemKg, 225);
  assert.equal(cruzeiroPadrao.sustentacaoMaxKg, 260);
  assert.equal(cruzeiroPadrao.velocidadeCruzeiroMnH, 11.0);

  // 2. MUT-O4-01: Adicionar itens no Porão de Carga (+33 kg -> 258 kg / 260 kg) reduz V_cruzeiro de 11.0 para 9.6 MN/h
  const naveComPorao = {
    ...estadoBase.naveJogador,
    poraoCarga: [
      { id: 'CARGA_1', tipo: 'ARMA', nome: 'Cortador Térmico a Plasma', pesoKg: 25 },
      { id: 'CARGA_2', tipo: 'ARMA', nome: 'Peso Lastro', pesoKg: 8 },
    ],
  };
  const cruzeiroComPorao = calcularVelocidadeCruzeiroMapa(naveComPorao);
  assert.equal(
    cruzeiroComPorao.pesoViagemKg,
    258,
    '[MUT-O4-01] O peso dos itens guardados no Porão de Carga deve somar ao Peso de Viagem'
  );
  assert.ok(
    cruzeiroComPorao.velocidadeCruzeiroMnH < cruzeiroPadrao.velocidadeCruzeiroMnH,
    '[MUT-O4-01] Carregar itens pesados no porão deve reduzir a Velocidade de Cruzeiro no mapa'
  );

  // 3. MUT-O4-02: Se a nave terminou a luta com os tanques drenados (ex: 0 kg de água nas 8 câmaras = 125 kg),
  // viajar no mapa é obrigado a nivelar os tanques em 100.0 kg (225 kg totais), nunca viajando a 15.0 MN/h com tanque seco!
  const estadoTanquesSecos = {
    ...estadoBase,
    mapaSetorial: {
      ...estadoBase.mapaSetorial,
      ...mapa,
      noAtualId: 'NO_0_ENTRADA',
      relogioSetorHoras: 0,
      frenteCorporacaoMn: 0,
    },
    naveJogador: {
      ...estadoBase.naveJogador,
      camaras: estadoBase.naveJogador.camaras.map((c) => ({
        ...c,
        aguaKg: 0,
        valvulaExternaAberta: true,
      })),
    },
  };

  const idPrimeiroDestino = mapa.nos.find((n) => n.id === 'NO_0_ENTRADA').rotasSaidaDireita[0];
  const estadoPosSalto = iniciarTravessiaMapa(estadoTanquesSecos, idPrimeiroDestino, [], {
    distanciaEfetivaMn: 22.0,
  });
  const somaAguaPosSalto = estadoPosSalto.naveJogador.camaras.reduce((acc, c) => acc + c.aguaKg, 0);
  assert.equal(
    somaAguaPosSalto,
    100.0,
    '[MUT-O4-02] Iniciar travessia no mapa deve fechar válvulas e estabilizar os 8 tanques em 100.0 kg'
  );
  assert.equal(
    estadoPosSalto.mapaSetorial.ultimoSalto.velocidadeCruzeiroMnH,
    11.0,
    '[MUT-O4-02] A velocidade de cruzeiro deve ser calculada com os tanques estabilizados em 100 kg (11.0 MN/h), não com tanque drenado'
  );

  // 4. MUT-O4-04: Modo Deriva (0 Combustível) num salto padrão de 22 MN deve demorar 4.0h (2.0x) <= 4.0h (5 saltos em 20.0h sem softlock)
  const saltoDerivaPadrao = calcularHorasSaltoMapa({
    distanciaEfetivaMn: 22.0,
    velocidadeCruzeiroMnH: 11.0,
    emModoDeriva: true,
  });
  assert.equal(saltoDerivaPadrao.horasNormal, 2.0);
  assert.ok(
    saltoDerivaPadrao.horasSalto <= 4.0,
    `[MUT-O4-04] Modo Deriva num salto padrão de 22 MN não pode exceder 4.0h (obtido: ${saltoDerivaPadrao.horasSalto}h)`
  );
  assert.equal(saltoDerivaPadrao.horasSalto, 4.0);
  assert.equal(saltoDerivaPadrao.spoolUpInicialProximoCombateSeg, 5.0);
});

test('[PORTÃO 06.3 | N4] 17 Templates de Eventos, Raridade das Blue Options (5 carcaças), SOS Expirado e Ciclo de Partida (13 transições)', () => {
  // 17 templates exatos (8 SOS + 6 EXPLORACAO + 3 PERIGO)
  assert.equal(CATALOGO_TEMPLATES_EVENTOS_45A.length, 17, '[N4] Examinados: 17 templates de eventos');
  assert.equal(CATALOGO_TEMPLATES_EVENTOS_45A.filter((t) => t.categoria === 'SOS').length, 8);
  assert.equal(CATALOGO_TEMPLATES_EVENTOS_45A.filter((t) => t.categoria === 'EXPLORACAO').length, 6);
  assert.equal(CATALOGO_TEMPLATES_EVENTOS_45A.filter((t) => t.categoria === 'PERIGO').length, 3);

  // Matriz de Elegibilidade Inicial (Seção 4.5.C): Alfa = 0, demais = 1
  const matrizEleg = avaliarMatrizElegibilidadeInicial45C();
  assert.equal(Object.keys(matrizEleg).length, 5, '[N4] Examinados: 5 carcaças na Matriz 4.5.C');
  assert.equal(matrizEleg.CARCACA_ALFA.total, 0);
  assert.deepEqual(matrizEleg.MANTA_VOLT.templatesElegiveis, ['SOS_4_COMBOIO_ENCALHADO']);
  assert.deepEqual(matrizEleg.COURACA_LIMIAR.templatesElegiveis, ['SOS_1_REDE_ARRASTO']);
  assert.deepEqual(matrizEleg.SOMBRA_ABISSAL.templatesElegiveis, ['EXP_3_CARDUME_SIMBIOTICO']);
  assert.deepEqual(matrizEleg.COLMEIA_VIVA.templatesElegiveis, ['SOS_3_NINHO_SITIADO']);

  // Junção Cross-Wave Onda 1 <-> Onda 4: extrairKitDaNave sobre criarEstadoInicialPartida real das 5 carcaças
  // deve bater 100% com a Matriz de Elegibilidade Inicial 4.5.C e iniciarTravessiaMapa não pode entrar em Deriva com 12 comb.
  for (const idArq of Object.keys(KITS_INICIAIS_5_CARCACAS)) {
    const estadoOnda1 = criarEstadoInicialPartida({ idArquitetura: idArq });
    const kitReal = extrairKitDaNave(estadoOnda1.naveJogador);
    const elegiveisReais = CATALOGO_TEMPLATES_EVENTOS_45A.filter((t) =>
      kitCumpreRequisitoBlueOption(t.requisitoBlueOption, kitReal)
    ).map((t) => t.id);
    assert.deepEqual(
      elegiveisReais,
      matrizEleg[idArq].templatesElegiveis,
      `Kit extraído de criarEstadoInicialPartida(${idArq}) deve produzir a mesma elegibilidade de Blue Options da Seção 4.5.C`
    );
  }
  const travessiaDeEstadoOnda1 = iniciarTravessiaMapa(
    criarEstadoInicialPartida({ idArquitetura: 'CARCACA_ALFA', faseJogo: 'MAPA' }),
    'NO_1_A'
  );
  assert.equal(travessiaDeEstadoOnda1.mapaSetorial.ultimoSalto.emModoDeriva, false);
  assert.equal(travessiaDeEstadoOnda1.economia.combustivel, 11);
  assert.equal(travessiaDeEstadoOnda1.recursos.combustivel, 11);
  assert.equal(travessiaDeEstadoOnda1.mapaSetorial.relogioHoras, 2.0);
  assert.equal(travessiaDeEstadoOnda1.mapaSetorial.relogioSetorHoras, 2.0);

  // Sorteio por setor sem repetir o setor anterior (STREAM_6)
  const s1 = sortearTemplatesDoSetor('seed-eventos', 1, []);
  const s2 = sortearTemplatesDoSetor('seed-eventos', 2, [...s1.sos, ...s1.exploracao]);
  assert.equal(s1.todos.length, 10);
  assert.equal(s2.todos.length, 10);
  for (const idSos of s2.sos) {
    assert.equal(s1.sos.includes(idSos), false, 'Setor 2 não pode repetir template SOS do Setor 1');
  }
  for (const idExp of s2.exploracao) {
    assert.equal(s1.exploracao.includes(idExp), false, 'Setor 2 não pode repetir template EXPLORACAO do Setor 1');
  }

  // Resolução de SOS Expirado (floor(0.5 * Sucata)) e Frota Principal da Corporação (0 Sucata, 1 Combustível)
  const noSos = {
    id: 'NO_2_A',
    tipoNo: 'SOS',
    idTemplateEvento: 'SOS_2_CAPSULA_AFUNDANDO',
    xMn: 45,
    tPrazoHoras: 5.5,
  };
  const visitaExpirada = resolverVisitaNoMapa({
    seedPartida: 'seed-eventos',
    setorNumero: 1,
    relogioSetorHoras: 6.0, // > 5.5h -> SOS Expirado, mas 6.0 * 6.0 = 36 MN < 45 MN (ainda não engolido pela corporação)
    noMapa: noSos,
    modalidadeVitoriaCombate: 'CAPTURA_INTACTA',
  });
  assert.equal(visitaExpirada.estadoNo, 'ZONA_MORTA_INDUSTRIALIZADA');
  assert.equal(visitaExpirada.saquePosCombate.sucata, 12); // floor(0.5 * 25) = 12

  const visitaFrenteCorp = resolverVisitaNoMapa({
    seedPartida: 'seed-eventos',
    setorNumero: 1,
    relogioSetorHoras: 8.0, // 8.0 * 6.0 = 48 MN >= 45 MN -> Engolido pela Frente Extrativista!
    noMapa: noSos,
  });
  assert.equal(visitaFrenteCorp.estadoNo, 'FROTA_PRINCIPAL_CORPORACAO');
  assert.equal(visitaFrenteCorp.bonusBarreiraInimigo, 1);
  assert.deepEqual(visitaFrenteCorp.saquePosCombate, {
    sucata: 0,
    biomassa: 0,
    combustivel: 1,
    municao: 0,
  });

  // Máquina de Estados do Ciclo de Partida (6 fases, 13 transições)
  assert.equal(FASES_JOGO_CANONICAS.length, 6);
  assert.equal(TRANSICOES_CICLO_92.length, 13, '[N4] Examinados: 13 transições do ciclo de partida');
  const grafoCiclo = auditarGrafoCicloPartida();
  assert.deepEqual(grafoCiclo.inalcancaveis, []);
  assert.deepEqual(grafoCiclo.semSaida, []);
  assert.deepEqual(grafoCiclo.semCaminhoParaFim, []);
  assert.equal(grafoCiclo.finalTemSaida, false);

  const trDerrota = aplicarTransicaoCicloPartida('COMBATE', 'TR_7A_DERROTA_EM_COMBATE');
  assert.equal(trDerrota.aceita, true);
  assert.equal(trDerrota.faseResultante, 'FIM_DE_RUN');
  assert.equal(trDerrota.apagaRunSavePermadeath, true);
  assert.equal(trDerrota.preservaProfileJson, true);

  // Cobertura completa de resolverVisitaNoMapa (Opções A, B aceita/rejeitada, C recuo/bloqueada em PERIGO, COMBATE_PADRAO),
  // sobrepeso no mapa (4.75 MN/h, 2 comb.) e rejeições de transição no ciclo de partida
  const visitaPadraoSemTemplate = resolverVisitaNoMapa({
    seedPartida: 'seed-ev',
    setorNumero: 1,
    relogioSetorHoras: 1.0,
    noMapa: { id: 'NO_1_X', tipoNo: 'COMBATE', idTemplateEvento: null, xMn: 30, tPrazoHoras: null },
  });
  assert.equal(visitaPadraoSemTemplate.estadoNo, 'COMBATE_PADRAO');
  assert.equal(visitaPadraoSemTemplate.combateObrigatorio, true);

  const noSosRede = { id: 'NO_1_SOS', tipoNo: 'SOS', idTemplateEvento: 'SOS_1_REDE_ARRASTO', xMn: 30, tPrazoHoras: 10 };
  const visitaOpcaoA = resolverVisitaNoMapa({
    seedPartida: 'seed-ev-a',
    setorNumero: 1,
    relogioSetorHoras: 1.0,
    noMapa: noSosRede,
    kitOuNave: KITS_INICIAIS_5_CARCACAS.CARCACA_ALFA,
    opcaoEscolhida: 'A',
  });
  assert.equal(visitaOpcaoA.estadoNo, 'EVENTO_ATIVO');
  assert.equal(visitaOpcaoA.aceito, true);

  const visitaOpcaoBRejeitada = resolverVisitaNoMapa({
    seedPartida: 'seed-ev-b',
    setorNumero: 1,
    relogioSetorHoras: 1.0,
    noMapa: noSosRede,
    kitOuNave: KITS_INICIAIS_5_CARCACAS.CARCACA_ALFA,
    opcaoEscolhida: 'B',
  });
  assert.equal(visitaOpcaoBRejeitada.aceito, false);
  assert.equal(visitaOpcaoBRejeitada.marcadorRejeicao, 'PRECONDICAO_NAO_ATENDIDA');

  const visitaOpcaoBAceita = resolverVisitaNoMapa({
    seedPartida: 'seed-ev-b',
    setorNumero: 1,
    relogioSetorHoras: 1.0,
    noMapa: noSosRede,
    kitOuNave: KITS_INICIAIS_5_CARCACAS.COURACA_LIMIAR,
    opcaoEscolhida: 'B',
  });
  assert.equal(visitaOpcaoBAceita.aceito, true);
  assert.equal(visitaOpcaoBAceita.resultadoEscolha, 'SUCESSO_CRITICO_BLUE_OPTION');
  assert.equal(visitaOpcaoBAceita.moedaGerada.biomassa, 15);

  const visitaOpcaoCRecuo = resolverVisitaNoMapa({
    seedPartida: 'seed-ev-c',
    setorNumero: 1,
    relogioSetorHoras: 1.0,
    noMapa: noSosRede,
    kitOuNave: KITS_INICIAIS_5_CARCACAS.CARCACA_ALFA,
    opcaoEscolhida: 'C',
  });
  assert.equal(visitaOpcaoCRecuo.aceito, true);
  assert.equal(visitaOpcaoCRecuo.resultadoEscolha, 'RECUO_SEGURO');

  const noPerigo = { id: 'NO_1_PER', tipoNo: 'PERIGO', idTemplateEvento: 'PER_1_CHUVA_ACIDA', xMn: 30, tPrazoHoras: null };
  const visitaOpcaoCPerigo = resolverVisitaNoMapa({
    seedPartida: 'seed-ev-per',
    setorNumero: 1,
    relogioSetorHoras: 1.0,
    noMapa: noPerigo,
    kitOuNave: KITS_INICIAIS_5_CARCACAS.CARCACA_ALFA,
    opcaoEscolhida: 'C',
  });
  assert.equal(visitaOpcaoCPerigo.aceito, false);
  assert.equal(visitaOpcaoCPerigo.marcadorRejeicao, 'BLOQUEADO_COMBATE_OBRIGATORIO');

  // Sobrepeso na travessia (P_viagem > S_max -> 4.75 MN/h e custo 2 combustíveis)
  const estadoBaseSobrepeso = criarEstadoInicialPartida('seed-sp', 'CARCACA_ALFA');
  const naveSobrepeso = {
    ...estadoBaseSobrepeso.naveJogador,
    poraoCarga: [
      { id: 'P1', pesoKg: 25 },
      { id: 'P2', pesoKg: 25 },
    ],
  };
  const cruzeiroSobrepeso = calcularVelocidadeCruzeiroMapa(naveSobrepeso);
  assert.equal(cruzeiroSobrepeso.emSobrepesoTouchdown, true);
  assert.equal(cruzeiroSobrepeso.velocidadeCruzeiroMnH, 4.75);
  assert.equal(cruzeiroSobrepeso.custoCombustivel, 2);

  // Transições inválidas na máquina de ciclo de partida e detecção de beco sem saída pelo auditor do mapa
  assert.throws(() => aplicarTransicaoCicloPartida('COMBATE', 'TR_INEXISTENTE'), /Transição desconhecida/);
  const trFaseErrada = aplicarTransicaoCicloPartida('LOJA', 'TR_7A_DERROTA_EM_COMBATE');
  assert.equal(trFaseErrada.aceita, false);
  assert.equal(trFaseErrada.faseResultante, 'LOJA');

  const mapaComBeco = gerarMapaSetorial('seed-beco', 1, [], { forcarBecoSemSaidaColuna2: true });
  const audBeco = auditarInvariantesMapaSetorial(mapaComBeco);
  assert.equal(audBeco.valido, false);
  assert.ok(audBeco.erros.some((e) => e.includes('Beco sem saída')));

  // Cobertura completa de invariantes de auditarInvariantesMapaSetorial, sortearTemplatesDoSetor e extrairKitDaNave com poraoCarga
  const mapaViolado = structuredClone(mapaComBeco);
  mapaViolado.totalNos = 10;
  mapaViolado.nos[0].xMn = 0;
  mapaViolado.nos[0].yMn = 0;
  mapaViolado.nos[1].xMn = 5;
  mapaViolado.nos[1].yMn = 0;
  mapaViolado.nos[1].tipoNo = 'LOJA';
  mapaViolado.nos[1].coluna = 1;
  mapaViolado.nos[2].tipoNo = 'LOJA';
  mapaViolado.nos[2].coluna = 2;
  for (let i = 3; i < mapaViolado.nos.length; i += 1) {
    if (mapaViolado.nos[i].tipoNo === 'LOJA') mapaViolado.nos[i].tipoNo = 'COMBATE';
  }
  mapaViolado.rotas.push({
    id: 'R_LONGA',
    origemId: mapaViolado.nos[1].id,
    destinoId: mapaViolado.nos[2].id,
    distanciaMn: 45.0,
  });
  const audViolado = auditarInvariantesMapaSetorial(mapaViolado);
  assert.equal(audViolado.valido, false);
  assert.ok(audViolado.erros.some((e) => e.includes('Total de nós')));
  assert.ok(audViolado.erros.some((e) => e.includes('< 14.0 MN')));
  assert.ok(audViolado.erros.some((e) => e.includes('fora de [14.0, 28.0] MN')));
  assert.ok(audViolado.erros.some((e) => e.includes('fora das Colunas 2..4')));
  assert.ok(audViolado.erros.some((e) => e.includes('coladas por rota direta')));

  const todosSosIds = CATALOGO_TEMPLATES_EVENTOS_45A.filter((t) => t.categoria === 'SOS').map((t) => t.id);
  assert.throws(
    () => sortearTemplatesDoSetor('seed-sem-sos', 2, todosSosIds),
    /Candidatos insuficientes para SOS/
  );

  const naveComPorao = structuredClone(estadoBaseSobrepeso.naveJogador);
  naveComPorao.poraoCarga = [
    null,
    { tipo: 'ARMA', id: 'CORTADOR_TERMICO_PLASMA' },
    { item: { tipo: 'ORGAO', id: 'BOLSA_TINTA_ABISSAL' } },
  ];
  const kitPorao = extrairKitDaNave(naveComPorao);
  assert.ok(kitPorao.armas.includes('Cortador Térmico a Plasma'));
  assert.ok(kitPorao.orgaos.includes('Bolsa de Tinta Abissal'));
});
