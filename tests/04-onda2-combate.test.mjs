import test from 'node:test';
import assert from 'node:assert/strict';

import {
  criarEstadoInicialPartida,
  congelarProfundo,
} from '../src/onda1-fisica/estado-inicial.mjs';
import {
  GRAFOS_BEAM_CANONICOS,
  calcularTempoRecargaEfetivoArma,
  calcularEsquivaEfetivaNave,
  calcularTempoRegenBarreiraSeg,
  validarTrincaBeam,
  enumerarTrincasBeam,
  avancarTickSistemasEArmas,
} from '../src/onda2-combate/tick-sistemas-armas.mjs';
import {
  FICHAS_ESPECIES_TRIPULACAO,
  TOPOLOGIA_CAMARAS_BIONAVE,
  calcularRotaCamarasBionave,
  inspecionarSalaAlvo,
  calcularCuraTripulanteHpPorSeg,
  calcularMultiplicadorReparoEfetivo,
  resolverCombateCorpoACorpoCamara,
  avancarTickTripulacao,
  avancarTickCombateCompleto,
  simularVerticalSlicePasso3,
} from '../src/onda2-combate/tick-tripulacao.mjs';
import {
  calcularRotaMinimaCamaras,
  resolverTickCombateCorpoACorpoSala,
  enumerarTracadosBeamValidos,
} from '../src/oraculos-referencia.mjs';

test('Onda 2 (PILAR_3 + N1 + N4): Topologia 2x4 + Duto 5<->6, 4 arquétipos de tripulação, Lotação 2+2 e Geometria do Beam (32/8/4)', () => {
  const especies = Object.values(FICHAS_ESPECIES_TRIPULACAO);
  assert.equal(especies.length, 4, 'Devem existir exatamente 4 espécies de tripulantes aliados');

  // Verifica grafo 2x4 + Duto Hidráulico Ventral (5 <-> 6): 8 câmaras e 11 conexões bidirecionais (grau 22)
  assert.equal(TOPOLOGIA_CAMARAS_BIONAVE.length, 8);
  const somaGraus = TOPOLOGIA_CAMARAS_BIONAVE.reduce((acc, c) => acc + c.vizinhos.length, 0);
  assert.equal(somaGraus, 22, 'Topologia 2x4 + Duto 5<->6 deve ter soma dos graus igual a 22 (11 conexões)');

  // Desempate vertical-primeiro: Córtex (2) -> Sifão (5) faz [2, 4, 5] em 2 saltos; Sifão (5) -> Poço (6) faz [5, 6] em 1 salto
  const rota25 = calcularRotaCamarasBionave(2, 5);
  const rota56 = calcularRotaCamarasBionave(5, 6);
  assert.deepEqual(rota25, { saltos: 2, rota: [2, 4, 5] });
  assert.deepEqual(rota56, { saltos: 1, rota: [5, 6] });
  assert.deepEqual(
    rota25.rota,
    calcularRotaMinimaCamaras(TOPOLOGIA_CAMARAS_BIONAVE, 2, 5).rota,
    'Rota 2->5 deve bater com o oráculo de referência'
  );

  // Lotação 2+2 e foco no Slot 1 + reflexão de 50% DPS do Baiacu inflado
  const luta = resolverCombateCorpoACorpoCamara(
    [
      { id: 'b1', especie: 'BAIACU', hpAtual: 150, dps: 5, inflado: true, acopladoBulbo: true },
      { id: 'c1', especie: 'CARANGUEJO', hpAtual: 110, dps: 15, inflado: false, acopladoBulbo: false },
    ],
    [
      { id: 'm1', especie: 'MARINHEIRO', hpAtual: 100, dps: 8 },
      { id: 'm2', especie: 'MERGULHADOR', hpAtual: 100, dps: 12 },
    ],
    1.0
  );
  // 20 DPS dos inimigos no Baiacu (150 -> 130); 20 DPS dos aliados + 4 DPS refletido no Marinheiro 1 (100 -> 76); 6 DPS refletido no Mergulhador 2 (100 -> 94)
  assert.equal(luta.aliados[0].hpAtual, 130);
  assert.equal(luta.aliados[1].hpAtual, 110);
  assert.equal(luta.inimigos[0].hpAtual, 76);
  assert.equal(luta.inimigos[1].hpAtual, 94);
  const lutaOraculo = resolverTickCombateCorpoACorpoSala({
    aliados: [
      { id: 'b1', especie: 'BAIACU', hpAtual: 150, dps: 5, inflado: true, acopladoBulbo: true },
      { id: 'c1', especie: 'CARANGUEJO', hpAtual: 110, dps: 15, inflado: false, acopladoBulbo: false },
    ],
    inimigos: [
      { id: 'm1', especie: 'MARINHEIRO', hpAtual: 100, dps: 8 },
      { id: 'm2', especie: 'MERGULHADOR', hpAtual: 100, dps: 12 },
    ],
    dtSeg: 1.0,
  });
  assert.deepEqual(luta, lutaOraculo);

  assert.throws(
    () =>
      resolverCombateCorpoACorpoCamara(
        [
          { id: 'a1', especie: 'POLVO', hpAtual: 80 },
          { id: 'a2', especie: 'ARRAIA', hpAtual: 70 },
          { id: 'a3', especie: 'BAIACU', hpAtual: 150 },
        ],
        [],
        0.25
      ),
    /Stacking Limit/,
    'Mais de 2 aliados estacionados na mesma câmara deve ser proibido'
  );

  // Geometria do Beam (Seção 1.6.C): 32 trincas na 2x4, 8 na 2x2 e 4 na 1x4
  const trincas2x4 = enumerarTrincasBeam(GRAFOS_BEAM_CANONICOS.BIONAVE_2X4);
  const trincas2x2 = enumerarTrincasBeam(GRAFOS_BEAM_CANONICOS.BARCO_2X2);
  const trincas1x4 = enumerarTrincasBeam(GRAFOS_BEAM_CANONICOS.MONSTRO_1X4);
  assert.equal(trincas2x4.length, 32, 'Grade 2x4 deve admitir exatamente 32 trincas simples de Beam');
  assert.equal(trincas2x2.length, 8, 'Grade 2x2 deve admitir exatamente 8 trincas simples de Beam');
  assert.equal(trincas1x4.length, 4, 'Coluna 1x4 deve admitir exatamente 4 trincas simples de Beam');
  assert.equal(validarTrincaBeam([1, 2, 1], GRAFOS_BEAM_CANONICOS.BIONAVE_2X4), false, 'Vai-e-volta S1===S3 deve ser inválido');
  assert.equal(trincas2x4.length, enumerarTracadosBeamValidos(GRAFOS_BEAM_CANONICOS.BIONAVE_2X4).length);

  console.log(
    `[N4] Onda 2 topologia e tripulação examinadas: ${especies.length} espécies, 8 câmaras, 11 conexões, ${trincas2x4.length}/${trincas2x2.length}/${trincas1x4.length} trincas de Beam`
  );
});

test('Onda 2 (MUT-O2-01 + MUT-O2-02 + MUT-O2-03 + MUT-O2-04): Hierarquia de recarga aditiva, Touchdown trava esquiva em 0%, Anti-Immortality Branquial e -50% reparo no seco', () => {
  // MUT-O2-01: recarga aditiva (1 - 0.20 - 0.25 = 0.55) vs multiplicativa ((1 - 0.20) * (1 - 0.25) = 0.60)
  const tempoAditivo = calcularTempoRecargaEfetivoArma({
    tempoChassiSeg: 10.0,
    especieOperadorArtilharia: 'POLVO',
    estadoFisico: '2_TOUCHDOWN',
  });
  assert.equal(
    tempoAditivo,
    5.5,
    'Reduções de recarga (Polvo -20% + Touchdown -25%) devem somar aditivamente para 0.55x (5.5s), nunca multiplicar (6.0s)'
  );

  // MUT-O2-02: em 2_TOUCHDOWN ou 3_SPOOL_UP, ativar Glândula de Tinta Furtiva NUNCA dá +60% de esquiva contra tiros em voo
  const baseNoAr = structuredClone(criarEstadoInicialPartida({ idArquitetura: 'CARCACA_ALFA' }));
  baseNoAr.naveJogador.furtividadeAtivaSeg = 5.0;
  assert.equal(
    calcularEsquivaEfetivaNave(congelarProfundo(baseNoAr).naveJogador),
    100,
    'Em 1_NO_FOIL com piloto no Córtex (25%+5%=30%), operador no Sifão (+10%) e Tinta Furtiva (+60%), a esquiva sobe para 100%'
  );
  const baseTouchdown = structuredClone(criarEstadoInicialPartida({ idArquitetura: 'CARCACA_ALFA' }));
  baseTouchdown.naveJogador.furtividadeAtivaSeg = 5.0;
  baseTouchdown.naveJogador.estadoFisico = '2_TOUCHDOWN';
  assert.equal(
    calcularEsquivaEfetivaNave(congelarProfundo(baseTouchdown).naveJogador),
    0,
    'Em 2_TOUCHDOWN (inclusive com Tinta Furtiva ativa), a esquiva contra projéteis em voo deve ser 0% (Hierarquia Nível 2 sobre Nível 3)'
  );

  // MUT-O2-03: Pulso de Enzimas (+5 HP/s) NUNCA soma em cima dos +18 HP/s dentro da própria Bomba Branquial (Câmara 3)
  const estadoBranquial = structuredClone(criarEstadoInicialPartida({ idArquitetura: 'CARCACA_ALFA' }));
  const camara3 = estadoBranquial.naveJogador.camaras.find((c) => c.id === 3);
  camara3.nivelMaxBarras = 3;
  camara3.barrasIntegridade = 3;
  camara3.barrasEnergiaAlocada = 3;
  estadoBranquial.naveJogador.pulsoEnzimasAtivoSeg = 6.0;
  const congeladoBranquial = congelarProfundo(estadoBranquial);
  const curaNaPropriaBranquial = calcularCuraTripulanteHpPorSeg(
    congeladoBranquial.naveJogador,
    congeladoBranquial.naveJogador.camaras.find((c) => c.id === 3)
  );
  const curaEmOutraSala = calcularCuraTripulanteHpPorSeg(
    congeladoBranquial.naveJogador,
    congeladoBranquial.naveJogador.camaras.find((c) => c.id === 5)
  );
  assert.equal(
    curaNaPropriaBranquial,
    18.0,
    'Cura na própria Bomba Branquial Nv.3 com Pulso de Enzimas ativo deve ser 18.0 HP/s (sem somar +5 HP/s, preservando Anti-Immortality < 24 DPS)'
  );
  assert.equal(curaEmOutraSala, 5.0, 'Cura do Pulso de Enzimas nas demais salas inundadas deve ser +5.0 HP/s');

  // MUT-O2-04: Polvo/Arraia/Baiacu em sala 0% seca sofrem -50% na velocidade de reparo; Caranguejo anfíbio não sofre
  assert.equal(
    calcularMultiplicadorReparoEfetivo('POLVO', 0.0),
    1.0,
    'Polvo (2.0x base) em sala 0% seca deve ter velocidade de reparo reduzida em -50% (para 1.0x)'
  );
  assert.equal(
    calcularMultiplicadorReparoEfetivo('ARRAIA', 0.0),
    0.5,
    'Arraia (1.0x base) em sala 0% seca deve ter velocidade de reparo reduzida em -50% (para 0.5x)'
  );
  assert.equal(
    calcularMultiplicadorReparoEfetivo('CARANGUEJO', 0.0),
    0.5,
    'Caranguejo anfíbio mantém 0.5x tanto no seco quanto na água'
  );
});

test('Onda 2 (Lei L3 + Junção N1 Simulação Passo 3): Canal L3 de visão do alvo e reprodução exata t=0.0s..32.75s', () => {
  const base = criarEstadoInicialPartida({ idArquitetura: 'CARCACA_ALFA' });

  // Canal L3: 5 situações distintas sem jamais devolver [] quando sem permissão de visão
  const visivelOcupada = inspecionarSalaAlvo(base, 1);
  const visivelVazia = inspecionarSalaAlvo(base, 2);
  const inexistente = inspecionarSalaAlvo(base, 99);

  const copiaTurvas = structuredClone(base);
  copiaTurvas.alvoCombate.canalVisibilidadeSonar = 'NEGADO_SONAR';
  const cegoTurvas = inspecionarSalaAlvo(congelarProfundo(copiaTurvas), 1);

  const copiaTinta = structuredClone(base);
  copiaTinta.alvoCombate.salasOuOrgaos.find((s) => s.id === 1).cegoTintaSeg = 8.0;
  const cegoTinta = inspecionarSalaAlvo(congelarProfundo(copiaTinta), 1);

  assert.equal(visivelOcupada.marcadorExplicito, 'SALA_VISIVEL_OCUPADA');
  assert.equal(visivelVazia.marcadorExplicito, 'SALA_VISIVEL_VAZIA');
  assert.deepEqual(visivelVazia.dados.tripulantes, []);
  assert.equal(inexistente.marcadorExplicito, 'SALA_ALVO_INEXISTENTE');
  assert.equal(inexistente.dados, undefined);
  assert.equal(cegoTurvas.marcadorExplicito, 'CEGO_AGUAS_TURVAS_ABISSAIS');
  assert.equal(cegoTurvas.dados, undefined, '[Lei L3] Sala cega por Águas Turvas nunca pode devolver []');
  assert.equal(cegoTinta.marcadorExplicito, 'CEGO_BOLSA_TINTA');
  assert.equal(cegoTinta.dados, undefined, '[Lei L3] Sala cega por Bolsa de Tinta nunca pode devolver []');

  // Simulação Cronometrada do Passo 3 (t = 0.0s..32.75s)
  const sim = simularVerticalSlicePasso3();
  console.log(`[N4] Marcos temporais da Simulação Onda 2 examinados: ${sim.timestampsUnicos.length}`);
  assert.equal(sim.timestampsUnicos.length, 22);
  assert.deepEqual(
    sim.timestampsUnicos,
    [0, 9, 10, 11, 11.7, 12.5, 13, 13.5, 15, 16.75, 18.5, 19.75, 20.5, 22.5, 22.75, 23.5, 23.75, 24.75, 28, 29.75, 30.25, 32.75]
  );
  assert.equal(sim.modalidadeVitoria, 'CAPTURA_INTACTA');
  assert.equal(sim.hpCascoInimigoFinal, 2);

  // Executa avancarTickCombateCompleto (Junção N1 Onda 1 + Onda 2) e confirma contadores N4
  const apos1Tick = avancarTickCombateCompleto(base, 0.25);
  assert.equal(apos1Tick.telemetriaN4.ultimoTickCamarasExaminadas, 8);
  assert.equal(apos1Tick.telemetriaN4.ultimoTickTripulantesExaminados, 3);
});
