import test from 'node:test';
import assert from 'node:assert/strict';

import {
  criarEstadoInicialPartida,
  congelarProfundo,
} from '../src/onda1-fisica/estado-inicial.mjs';
import {
  criarAlvoSetor1Canonico,
  avancarTickIaInimiga,
} from '../src/onda3-inimigos/ia-barco-monstro.mjs';
import {
  resolverImpactoNoAlvo,
  tentarRecolherAbordagemEmCombate,
  executarFugaAbandonandoAbordagem,
  avaliarCondicaoDeVitoria,
} from '../src/onda3-inimigos/abordagem-vitoria.mjs';

test('Onda 3 (N1 + N4): 2 classes de inimigos (Metal vs. Carne), 3 condições de vitória e Tabela de Saque Setor 1', () => {
  const classesInimigos = ['BARCO_HUMANO', 'MONSTRO_MARINHO'];
  let classesExaminadas = 0;
  for (const c of classesInimigos) {
    const alvo = criarAlvoSetor1Canonico(c);
    assert.equal(alvo.classeAlvo, c);
    assert.equal(alvo.salasOuOrgaos.length, 4);
    if (c === 'BARCO_HUMANO') {
      assert.equal(alvo.hpCascoMax, 8, 'Lancha Patrulheira S1 deve ter 8 HP de casco (Vol. 03 / 5.7.B)');
      assert.equal(alvo.esquivaBasePct, 15, 'Lancha Patrulheira S1 deve ter 15% de esquiva base (Vol. 03 / 5.7.B)');
    } else {
      assert.equal(alvo.hpCascoMax, 10, 'Teuthis Couraçada S1 deve ter 10 HP de casco (Vol. 03 / 5.7.B)');
      assert.equal(alvo.esquivaBasePct, 20, 'Teuthis Couraçada S1 deve ter 20% de esquiva base (Vol. 03 / 5.7.B)');
    }
    classesExaminadas += 1;
  }

  // 1. DESTRUICAO_BRUTA de Barco no Setor 1 -> 12 Sucata, 0 Bio, 2 Comb, 1 Mun
  const baseBarco = structuredClone(criarEstadoInicialPartida({ idArquitetura: 'CARCACA_ALFA' }));
  baseBarco.alvoCombate = structuredClone(criarAlvoSetor1Canonico('BARCO_HUMANO'));
  baseBarco.alvoCombate.hpCascoAtual = 0;
  const vitBrutaBarco = avaliarCondicaoDeVitoria(congelarProfundo(baseBarco));
  assert.equal(vitBrutaBarco.encerrado, true);
  assert.equal(vitBrutaBarco.modalidade, 'DESTRUICAO_BRUTA');
  assert.deepEqual(vitBrutaBarco.recompensa, {
    sucata: 12,
    biomassa: 0,
    combustivel: 2,
    municao: 1,
    orgaoExtraido: null,
  });

  // 2. CAPTURA_INTACTA de Barco no Setor 1 (casco > 0, 0 humanos vivos) -> 25 Sucata, 0 Bio, 3 Comb, 2 Mun
  const baseCaptura = structuredClone(criarEstadoInicialPartida({ idArquitetura: 'CARCACA_ALFA' }));
  baseCaptura.alvoCombate = structuredClone(criarAlvoSetor1Canonico('BARCO_HUMANO'));
  baseCaptura.alvoCombate.hpCascoAtual = 2;
  for (const s of baseCaptura.alvoCombate.salasOuOrgaos) {
    for (const t of s.tripulantes) t.hpAtual = 0;
  }
  const vitCaptura = avaliarCondicaoDeVitoria(congelarProfundo(baseCaptura));
  assert.equal(vitCaptura.encerrado, true);
  assert.equal(vitCaptura.modalidade, 'CAPTURA_INTACTA');
  assert.deepEqual(vitCaptura.recompensa, {
    sucata: 25,
    biomassa: 0,
    combustivel: 3,
    municao: 2,
    orgaoExtraido: null,
  });

  // 3. EXTRACAO_CIRURGICA de Monstro no Setor 1 (Gânglio 0/3 e vida > 0) -> 5 Sucata, 25 Bio, 2 Comb, 1 Mun + Órgão Intacto
  const baseMonstro = structuredClone(criarEstadoInicialPartida({ idArquitetura: 'CARCACA_ALFA' }));
  baseMonstro.alvoCombate = structuredClone(criarAlvoSetor1Canonico('MONSTRO_MARINHO'));
  baseMonstro.alvoCombate.salasOuOrgaos.find((s) => s.id === 4).integridadeAtual = 0;
  const vitExtracao = avaliarCondicaoDeVitoria(congelarProfundo(baseMonstro));
  assert.equal(vitExtracao.encerrado, true);
  assert.equal(vitExtracao.modalidade, 'EXTRACAO_CIRURGICA');
  assert.deepEqual(vitExtracao.recompensa, {
    sucata: 5,
    biomassa: 25,
    combustivel: 2,
    municao: 1,
    orgaoExtraido: 'ORGAO_INTACTO_GARANTIDO',
  });

  const modalidadesExaminadas = [vitBrutaBarco.modalidade, vitCaptura.modalidade, vitExtracao.modalidade];
  console.log(
    `[N4] Onda 3 examinada: ${classesExaminadas} classes de inimigos, ${modalidadesExaminadas.length} condições de vitória (${modalidadesExaminadas.join(', ')})`
  );
  assert.equal(classesExaminadas, 2);
  assert.equal(new Set(modalidadesExaminadas).size, 3);
});

test('Onda 3 (MUT-O3-01 + MUT-O3-02 + MUT-O3-03): Arma sem munição bloqueada por Barreira, Naufrágio Controlado por Sabotagem Interna e Via Única do Tubo', () => {
  // MUT-O3-01: Canhão de Arpão (municaoCusto=0) contra 1 camada de Barreira consome a bolha e NÃO causa dano ao casco
  const baseComBarreira = structuredClone(criarEstadoInicialPartida({ idArquitetura: 'CARCACA_ALFA' }));
  baseComBarreira.alvoCombate = structuredClone(criarAlvoSetor1Canonico('BARCO_HUMANO'));
  baseComBarreira.alvoCombate.camadasBarreiraAtivas = 1;
  const aposArpaoNaBarreira = resolverImpactoNoAlvo(congelarProfundo(baseComBarreira), {
    tipo: 'DISPARO_ARMA',
    chassiId: 'CANHAO_ARPAO_CABO',
    municaoCusto: 0,
    danoCasco: 1,
    danoSistema: 1,
    abreRombo: true,
    salaAlvoId: 3,
  });
  assert.equal(
    aposArpaoNaBarreira.alvoCombate.camadasBarreiraAtivas,
    0,
    'Arpão sem munição deve consumir 1 bolha da Barreira inimiga'
  );
  assert.equal(
    aposArpaoNaBarreira.alvoCombate.hpCascoAtual,
    8,
    'Arma sem munição NUNCA pode atravessar 1 camada ativa de Barreira (casco deve continuar em 8 HP)'
  );

  // Torpedo Abissal (municaoCusto=1) atravessa 1 camada ativa de Barreira diretamente
  const aposTorpedo = resolverImpactoNoAlvo(congelarProfundo(baseComBarreira), {
    tipo: 'DISPARO_ARMA',
    chassiId: 'LANCADOR_TORPEDO_ABISSAL',
    municaoCusto: 1,
    danoCasco: 2,
    danoSistema: 2,
    abreRombo: true,
    salaAlvoId: 3,
  });
  assert.equal(aposTorpedo.alvoCombate.camadasBarreiraAtivas, 1, 'Torpedo com munição ignora Barreira sem consumir bolha');
  assert.equal(aposTorpedo.alvoCombate.hpCascoAtual, 6, 'Torpedo causa 2 de dano direto ao casco através da Barreira');

  // Lança abordagem pelo Tubo Pressurizado (injeta +15 kg de água na sala inimiga e coloca o Caranguejo a bordo)
  const baseAbordagem = structuredClone(criarEstadoInicialPartida({ idArquitetura: 'COURACA_LIMIAR' }));
  baseAbordagem.alvoCombate = structuredClone(criarAlvoSetor1Canonico('BARCO_HUMANO'));
  baseAbordagem.alvoCombate.hpCascoAtual = 1;
  const aposCapsula = resolverImpactoNoAlvo(congelarProfundo(baseAbordagem), {
    tipo: 'CAPSULA_TUBO_PRESSURIZADO',
    tripulantesIds: ['trip-caranguejo-1'],
    salaAlvoId: 1,
  });
  assert.equal(aposCapsula.alvoCombate.salasOuOrgaos.find((s) => s.id === 1).aguaKg, 15.0, 'Tubo injeta +15 kg de água');
  assert.equal(
    aposCapsula.naveJogador.tripulacao.find((t) => t.id === 'trip-caranguejo-1').localizacao,
    'BORDO_INIMIGO'
  );

  // MUT-O3-03: tentar recolher o invasor no meio da luta é negado; se fugir, ele é perdido
  const aposTentativaRecolher = tentarRecolherAbordagemEmCombate(aposCapsula);
  assert.equal(
    aposTentativaRecolher.naveJogador.tripulacao.find((t) => t.id === 'trip-caranguejo-1').localizacao,
    'BORDO_INIMIGO',
    'Não é permitido recolher animal invasor no meio da luta (Via Única até o Atracar)'
  );
  const aposFuga = executarFugaAbandonandoAbordagem(aposCapsula);
  assert.equal(
    aposFuga.naveJogador.tripulacao.some((t) => t.id === 'trip-caranguejo-1'),
    false,
    'Se o jogador fugir da luta, animais a bordo do inimigo devem ser perdidos'
  );

  // MUT-O3-02: quando o casco inimigo zera por SABOTAGEM_INTERNA, ocorre Naufrágio Controlado e o animal sobrevive!
  const aposSabotagem = resolverImpactoNoAlvo(aposCapsula, {
    tipo: 'SABOTAGEM_INTERNA',
    salaAlvoId: 1,
  });
  assert.equal(aposSabotagem.alvoCombate.hpCascoAtual, 0);
  const caranguejoPosSabotagem = aposSabotagem.naveJogador.tripulacao.find((t) => t.id === 'trip-caranguejo-1');
  assert.equal(
    caranguejoPosSabotagem.hpAtual,
    110,
    'Em Naufrágio Controlado por Sabotagem Interna, o animal aliado a bordo NUNCA morre por explosão da nave'
  );
  const vitSabotagem = avaliarCondicaoDeVitoria(aposSabotagem);
  assert.deepEqual(vitSabotagem.animaisResgatadosIds, ['trip-caranguejo-1']);
});

test('Onda 3 (Junção N1 Hidráulica Barco + IA Marinheiros): rombo submerso (+5 kg/s), afogamento (-8 HP/s) e fuga < 30 HP para a Cabine', () => {
  let estado = criarEstadoInicialPartida({ idArquitetura: 'CARCACA_ALFA' });
  const copia = structuredClone(estado);
  copia.alvoCombate = structuredClone(criarAlvoSetor1Canonico('BARCO_HUMANO'));
  estado = congelarProfundo(copia);

  // Abre rombo submerso na Sala do Motor (id=3, submersa=true) com Arpão
  estado = resolverImpactoNoAlvo(estado, {
    tipo: 'DISPARO_ARMA',
    chassiId: 'CANHAO_ARPAO_CABO',
    municaoCusto: 0,
    danoCasco: 1,
    danoSistema: 1,
    abreRombo: true,
    salaAlvoId: 3,
  });
  // Marinheiro 2 na Sala do Motor levou -15 HP de dano antipessoal (100 -> 85 HP)
  assert.equal(estado.alvoCombate.salasOuOrgaos.find((s) => s.id === 3).tripulantes[0].hpAtual, 85);

  // Avança 2.5s (10 ticks de 0.25s) -> Sala do Motor enche 12.5 kg (+5.0 kg/s)
  for (let i = 0; i < 10; i += 1) {
    estado = avancarTickIaInimiga(estado, 0.25);
  }
  assert.equal(estado.alvoCombate.salasOuOrgaos.find((s) => s.id === 3).aguaKg, 12.5);

  // Avança mais 7.0s (28 ticks de 0.25s) -> Marinheiro 2 sofre -56 HP de afogamento (85 - 56 = 29 HP < 30 HP)
  for (let i = 0; i < 28; i += 1) {
    estado = avancarTickIaInimiga(estado, 0.25);
  }
  assert.equal(estado.alvoCombate.salasOuOrgaos.find((s) => s.id === 3).tripulantes[0].hpAtual, 29);

  // Avança mais 2.25s (9 ticks de 0.25s) -> Marinheiro 2 conclui subida da escada para a Cabine seca (id=1)
  for (let i = 0; i < 9; i += 1) {
    estado = avancarTickIaInimiga(estado, 0.25);
  }
  assert.equal(estado.alvoCombate.salasOuOrgaos.find((s) => s.id === 3).tripulantes.length, 0);
  assert.equal(estado.alvoCombate.salasOuOrgaos.find((s) => s.id === 1).tripulantes.length, 2);
});
