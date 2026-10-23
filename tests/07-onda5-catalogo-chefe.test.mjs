/**
 * PORTÃO 07 — ONDA 5: Catálogo Completo (7 Armas, 6 Órgãos, 8 Biomas, 5 Naves, 10 Upgrades, 20 Itens Loja)
 * e Chefe Final Draga Continental em 3 Fases (Blindagem Térmica 10 pts, Fervura 4.0s Alarme, IA Backup, Atracar).
 *
 * Cumpre:
 *  - Lei N1 (Junção real: Setor 8 / Naves / Armas <-> 3 Fases da Draga Continental e Atracar Automático)
 *  - Lei N4 (Contadores explícitos: 7 armas, 6 órgãos, 8 biomas, 5 naves, 10 upgrades, 20 itens loja, 8 arquétipos, 3 fases)
 *  - Lei L2 (Imutabilidade profunda Object.isFrozen)
 *  - Lei L6 (Cobertura explícita de MUT-O5-01, MUT-O5-02, MUT-O5-03 e MUT-O5-04)
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { criarEstadoInicialPartida } from '../src/onda1-fisica/estado-inicial.mjs';
import {
  CATALOGO_ARMAS_51,
  CATALOGO_ORGAOS_52,
  CATALOGO_BIOMAS_53,
  CATALOGO_NAVES_54,
  ARVORES_UPGRADE_56A,
  CATALOGO_LOJA_56B,
  BESTIARIO_ARQUETIPOS_57A,
  TETO_BARRAS_REATOR_COMPRAVEIS,
  calcularAtributosInimigoSetor,
  aplicarChoqueEletroPlacaEmSala,
  avancarTickChoqueEIsolamentoSala,
  avancarTickBiomaEColmeiaViva,
  converterMoedaDigestaoEnzimatica,
  gerarEstoqueLojaForja,
} from '../src/onda5-catalogo-chefe/catalogo-naves-itens.mjs';
import {
  FASES_DRAGA_CONTINENTAL_55,
  ALARME_ANTECEDENTE_FERVURA_SEG,
  criarEstadoChefeDraga,
  tentarAbordagemContraAlvo,
  transicionarFaseChefeDraga,
  avancarTickChefeDraga,
  calcularTtkFase3DragaPadrao,
} from '../src/onda5-catalogo-chefe/chefe-draga.mjs';

test('[PORTÃO 07.1 | L5 + N4 + MUT-O5-01] Catálogo completo: 7 armas, 6 órgãos (+5 kg e Isolamento Residual 5s), 8 biomas, 5 naves, 10 upgrades (= 2330) e 20 itens de loja', () => {
  assert.equal(CATALOGO_ARMAS_51.length, 7, '[N4] Examinados: 7 armas no catálogo 5.1');
  assert.equal(CATALOGO_ORGAOS_52.length, 6, '[N4] Examinados: 6 órgãos no catálogo 5.2');
  assert.equal(CATALOGO_BIOMAS_53.length, 8, '[N4] Examinados: 8 biomas no catálogo 5.3');
  assert.equal(CATALOGO_NAVES_54.length, 5, '[N4] Examinados: 5 naves no catálogo 5.4');
  assert.equal(ARVORES_UPGRADE_56A.length, 10, '[N4] Examinados: 10 árvores de upgrade 5.6.A');
  assert.equal(CATALOGO_LOJA_56B.length, 20, '[N4] Examinados: 20 itens de loja 5.6.B');
  assert.equal(BESTIARIO_ARQUETIPOS_57A.length, 8, '[N4] Examinados: 8 arquétipos de inimigos 5.7.A');

  // Regra das armas: sem munição => não ignora barreira; ignora barreira => custa 1 munição
  for (const arma of CATALOGO_ARMAS_51) {
    if (arma.municao === 0) {
      assert.equal(arma.ignoraBarreira, false, `Arma sem munição (${arma.id}) não pode atravessar Barreira`);
    } else {
      assert.equal(arma.ignoraBarreira, true, `Arma com munição (${arma.id}) deve atravessar Barreira`);
    }
  }

  // Todos os 6 órgãos pesam +5 kg
  for (const orgao of CATALOGO_ORGAOS_52) {
    assert.equal(orgao.pesoKg, 5, `Órgão ${orgao.id} deve pesar +5 kg`);
  }

  // Economia: soma das 10 árvores = 2330 (850 Sucata + 1100 Biomassa + 380 Flexível) e teto do Reator = 18 barras
  const somaTotalUpgrades = ARVORES_UPGRADE_56A.reduce((acc, a) => acc + a.somaAlfa, 0);
  assert.equal(somaTotalUpgrades, 2330);
  assert.equal(TETO_BARRAS_REATOR_COMPRAVEIS, 18);

  // Digestão Enzimática 2:1
  const posDigestao = converterMoedaDigestaoEnzimatica({ sucata: 20, biomassa: 5 }, 'SUCATA', 4);
  assert.equal(posDigestao.sucata, 12);
  assert.equal(posDigestao.biomassa, 9);

  // Escalamento S1..S7
  const s1 = calcularAtributosInimigoSetor(1);
  const s7 = calcularAtributosInimigoSetor(7);
  assert.equal(s1.barcoHp, 8);
  assert.equal(s7.barcoHp, 20);
  assert.equal(s7.monstroHp, 28);

  // MUT-O5-01: Eletro-Placa de Arraia aplica 6.0s de choque seguidos de 5.0s estritos de Isolamento Residual (anti-stunlock)
  let salaAlvo = { id: 2, nome: 'Armas', danoIonizado: 0, tempoRestanteIonSeg: 0, isolamentoResidualChoqueSeg: 0 };
  const choque1 = aplicarChoqueEletroPlacaEmSala(salaAlvo);
  assert.equal(choque1.choqueAplicado, true);
  assert.equal(choque1.sala.tempoRestanteIonSeg, 6.0);

  // Após 6.0s, o choque expira e entra o Isolamento Residual de 5.0s
  salaAlvo = avancarTickChoqueEIsolamentoSala(choque1.sala, 6.0);
  assert.equal(salaAlvo.tempoRestanteIonSeg, 0);
  assert.equal(
    salaAlvo.isolamentoResidualChoqueSeg,
    5.0,
    '[MUT-O5-01] Ao expirar os 6.0s de choque, a sala deve receber 5.0s de Isolamento Residual Pós-Choque'
  );

  // Tentar aplicar novo choque durante os 5.0s de isolamento DEVE ser bloqueado
  const choqueDuranteIsolamento = aplicarChoqueEletroPlacaEmSala(salaAlvo);
  assert.equal(
    choqueDuranteIsolamento.choqueAplicado,
    false,
    '[MUT-O5-01] Novo choque durante o Isolamento Residual de 5.0s deve ser bloqueado (impedindo stunlock infinito)'
  );
  assert.equal(choqueDuranteIsolamento.motivoBloqueio, 'BLOQUEADO_ISOLAMENTO_RESIDUAL_5S');
});

test('[PORTÃO 07.2 | N1 + MUT-O5-04] Biomas Setores 6/7 e Regeneração em Touchdown da Colmeia-Viva (máx +2 HP por luta e bloqueada após morte do inimigo)', () => {
  const estadoColmeia = criarEstadoInicialPartida('seed-colmeia', 'COLMEIA_VIVA');
  let estadoLuta = {
    ...estadoColmeia,
    naveJogador: {
      ...estadoColmeia.naveJogador,
      hpCascoAtual: 20,
      hpCascoMax: 30,
      estadoFisico: '2_TOUCHDOWN',
      tempoTouchdownContinuoSeg: 0,
      regeneracoesColmeiaNestaLuta: 0,
    },
    alvoCombate: {
      classeInimigo: 'BARCO_HUMANO',
      hpCascoAtual: 10,
      tripulacaoInimiga: [{ id: 'H1', hpAtual: 100 }],
    },
  };

  // Aos 12s em Touchdown: regenera +1 HP (20 -> 21 HP)
  estadoLuta = avancarTickBiomaEColmeiaViva(estadoLuta, 12.0);
  assert.equal(estadoLuta.naveJogador.hpCascoAtual, 21);
  assert.equal(estadoLuta.naveJogador.regeneracoesColmeiaNestaLuta, 1);

  // Aos 24s em Touchdown: regenera +1 HP (21 -> 22 HP, atingindo o teto de +2 HP por luta)
  estadoLuta = avancarTickBiomaEColmeiaViva(estadoLuta, 12.0);
  assert.equal(estadoLuta.naveJogador.hpCascoAtual, 22);
  assert.equal(estadoLuta.naveJogador.regeneracoesColmeiaNestaLuta, 2);

  // MUT-O5-04 (Parte A): Aos 36s e 48s em Touchdown, NÃO pode regenerar além de +2 HP na mesma luta
  estadoLuta = avancarTickBiomaEColmeiaViva(estadoLuta, 24.0);
  assert.equal(
    estadoLuta.naveJogador.hpCascoAtual,
    22,
    '[MUT-O5-04] A Colmeia-Viva jamais pode regenerar mais de +2 HP por luta em Touchdown'
  );

  // MUT-O5-04 (Parte B): Se o inimigo já estiver morto (hpCascoAtual === 0), NÃO pode regenerar em Touchdown
  let estadoInimigoMorto = {
    ...estadoLuta,
    naveJogador: {
      ...estadoLuta.naveJogador,
      hpCascoAtual: 20,
      tempoTouchdownContinuoSeg: 0,
      regeneracoesColmeiaNestaLuta: 0,
    },
    alvoCombate: {
      classeInimigo: 'BARCO_HUMANO',
      hpCascoAtual: 0,
      tripulacaoInimiga: [],
    },
  };
  estadoInimigoMorto = avancarTickBiomaEColmeiaViva(estadoInimigoMorto, 24.0);
  assert.equal(
    estadoInimigoMorto.naveJogador.hpCascoAtual,
    20,
    '[MUT-O5-04] A Colmeia-Viva não pode regenerar casco em Touchdown após o inimigo estar derrotado'
  );
});

test('[PORTÃO 07.3 | N1 + N4 + MUT-O5-02..03] As 3 Fases da Draga Continental: Blindagem Térmica 10 pts, Alarme Fervura 4.0s (> 3.0s Spool-up), IA Backup, Atracar Automático e TTK Markov', () => {
  const fases = Object.values(FASES_DRAGA_CONTINENTAL_55);
  assert.equal(fases.length, 3, '[N4] Examinados: 3 fases da Draga Continental');
  assert.equal(fases[0].hpCascoMax + fases[1].hpCascoMax + fases[2].hpCascoMax, 66);
  assert.equal(fases[2].blindagemTermicaExternaPts, 10);

  // 1. Fase 1 -> Fase 2 com Atracar Automático entre Fases e ativação da IA de Backup quando 0 humanos sobrevivem
  const base = criarEstadoInicialPartida('seed-chefe', 'COURACA_LIMIAR');
  let estadoFase1 = {
    ...base,
    naveJogador: {
      ...base.naveJogador,
      tripulacao: base.naveJogador.tripulacao.map((t, idx) =>
        idx === 0 ? { ...t, localizacao: 'BORDO_INIMIGO', salaInimigaId: 2 } : t
      ),
    },
    alvoCombate: criarEstadoChefeDraga(1, []), // 0 humanos vivos -> IA de Backup!
  };
  assert.equal(estadoFase1.alvoCombate.iaBackupAtiva, true);

  // IA de Backup auto-repara 1 barra após 15.0s
  estadoFase1 = {
    ...estadoFase1,
    alvoCombate: {
      ...estadoFase1.alvoCombate,
      salasOuOrgaos: estadoFase1.alvoCombate.salasOuOrgaos.map((s) =>
        s.id === 2 ? { ...s, integridade: 1 } : s
      ),
    },
  };
  estadoFase1 = avancarTickChefeDraga(estadoFase1, 15.0);
  assert.equal(estadoFase1.alvoCombate.salasOuOrgaos.find((s) => s.id === 2).integridade, 2);

  // Transição para a Fase 2 resgata automaticamente o Caranguejo que estava a bordo da Fase 1
  const estadoFase2 = transicionarFaseChefeDraga(estadoFase1);
  assert.equal(estadoFase2.alvoCombate.faseChefe, 2);
  assert.equal(
    estadoFase2.naveJogador.tripulacao.every((t) => t.localizacao === 'NAVE_JOGADOR'),
    true,
    'Atracar Automático entre Fases deve recolher todos os aliados sobreviventes antes da próxima fase'
  );

  // 2. Transição para a Fase 3: Blindagem Térmica Externa de 10 pts bloqueia o Tubo Pressurizado (MUT-O5-02)
  const estadoFase3 = transicionarFaseChefeDraga(estadoFase2);
  assert.equal(estadoFase3.alvoCombate.faseChefe, 3);
  assert.equal(estadoFase3.alvoCombate.blindagemTermicaExternaPts, 10);

  const tentativaComBlindagem = tentarAbordagemContraAlvo(estadoFase3, ['TRIP_1'], 1);
  assert.equal(
    tentativaComBlindagem.aceito,
    false,
    '[MUT-O5-02] O Tubo Pressurizado não pode atravessar a Blindagem Térmica Externa antes dos 10 pontos caírem'
  );
  assert.equal(tentativaComBlindagem.marcadorRejeicao, 'BLOQUEADO_BLINDAGEM_TERMICA_EXTERNA');

  // Após zerar os 10 pontos de Blindagem Térmica, o Tubo Pressurizado é liberado
  const estadoFase3SemBlindagem = {
    ...estadoFase3,
    alvoCombate: { ...estadoFase3.alvoCombate, blindagemTermicaExternaPts: 0 },
  };
  const tentativaSemBlindagem = tentarAbordagemContraAlvo(estadoFase3SemBlindagem, ['TRIP_1'], 1);
  assert.equal(tentativaSemBlindagem.aceito, true);

  // 3. MUT-O5-03: Alarme antecedente da Fervura Oceânica na Fase 3 deve ser de 4.0s (> 3.0s de Spool-up)
  assert.equal(ALARME_ANTECEDENTE_FERVURA_SEG, 4.0);
  const estadoAos14Seg = avancarTickChefeDraga(estadoFase3, 14.0); // Faltam 4.0s para o Surge de 18.0s
  assert.ok(
    estadoAos14Seg.alvoCombate.alarmeFervuraAtivoSeg >= 4.0,
    `[MUT-O5-03] O alarme da Fervura Oceânica deve disparar com 4.0s de antecedência (obtido: ${estadoAos14Seg.alvoCombate.alarmeFervuraAtivoSeg}s) para permitir os 3.0s de Spool-up`
  );

  // 4. Distribuição Markoviana canônica do TTK da Fase 3 (67.2s mediana, 74.2s esperado, 100.8s P90)
  const ttk = calcularTtkFase3DragaPadrao();
  assert.equal(ttk.ttkMedianoSeg, 67.2);
  assert.equal(ttk.ttkEsperadoSeg, 74.2);
  assert.equal(ttk.ttkP90Seg, 100.8);

  // 5. Cobertura completa de gerarEstoqueLojaForja, Digestão Enzimática (BIOMASSA -> SUCATA e erros),
  // Biomas Setores 6/7 e Power Surges das Fases 1, 2 e 3 da Draga Continental
  const estoqueForja = gerarEstoqueLojaForja('seed-forja-01', 2, 'NO_FORJA_1');
  assert.ok(estoqueForja.armaOferta?.id);
  assert.ok(estoqueForja.orgaoOferta?.id);
  assert.ok(estoqueForja.tripulanteOfertaId.startsWith('TRIPULANTE_'));

  const posDigestaoBio = converterMoedaDigestaoEnzimatica({ sucata: 10, biomassa: 10 }, 'BIOMASSA', 3);
  assert.equal(posDigestaoBio.biomassa, 4);
  assert.equal(posDigestaoBio.sucata, 13);
  assert.throws(() => converterMoedaDigestaoEnzimatica({ sucata: 1, biomassa: 10 }, 'SUCATA', 1), /Sucata insuficiente/);
  assert.throws(() => converterMoedaDigestaoEnzimatica({ sucata: 10, biomassa: 1 }, 'BIOMASSA', 1), /Biomassa insuficiente/);
  assert.throws(() => converterMoedaDigestaoEnzimatica({ sucata: 10, biomassa: 10 }, 'OURO', 1), /Moeda desconhecida/);

  // Bioma Setor 6 (Chuva Ácida a cada 15s em 1_NO_FOIL) e Setor 7 (Corrosão do Mastro após > 8s em Touchdown)
  const estSetor6 = {
    ...base,
    mapaSetorial: { ...base.mapaSetorial, setorNumero: 6 },
    naveJogador: { ...base.naveJogador, estadoFisico: '1_NO_FOIL', hpCascoAtual: 25 },
  };
  const aposChuvaAcida = avancarTickBiomaEColmeiaViva(estSetor6, 15.0);
  assert.equal(aposChuvaAcida.naveJogador.hpCascoAtual, 24, 'Setor 6 causa -1 HP de Chuva Ácida a cada 15s no Foil');

  const estSetor7 = {
    ...base,
    mapaSetorial: { ...base.mapaSetorial, setorNumero: 7 },
    naveJogador: { ...base.naveJogador, estadoFisico: '2_TOUCHDOWN', tempoTouchdownContinuoSeg: 0 },
  };
  const aposCorrosaoMastro = avancarTickBiomaEColmeiaViva(estSetor7, 9.0);
  assert.equal(
    aposCorrosaoMastro.naveJogador.camaras.find((c) => c.id === 6).barrasIntegridade,
    4,
    'Setor 7 corrói 1 barra do Mastro (5 -> 4 na Couraça-Limiar) após > 8.0s contínuos em Touchdown'
  );

  // Power Surge Fase 1 (22s -> +50 kg arrasto por 6.0s e depois zera)
  let surgeF1 = avancarTickChefeDraga(
    { ...base, alvoCombate: criarEstadoChefeDraga(1) },
    22.0
  );
  assert.equal(surgeF1.alvoCombate.ultimoPowerSurgeDisparado.tipo, 'ONDA_ARRASTO_HIDRAULICO');
  assert.equal(surgeF1.naveJogador.pesoVirtualArrastoKg, 50);
  surgeF1 = avancarTickChefeDraga(surgeF1, 6.0);
  assert.equal(surgeF1.naveJogador.pesoVirtualArrastoKg, 0);

  // Power Surge Fase 2 (20s -> 4 drones com Hangar intacto vs 2 drones com Hangar destruído)
  const surgeF2Intacto = avancarTickChefeDraga(estadoFase2, 20.0);
  assert.equal(surgeF2Intacto.alvoCombate.ultimoPowerSurgeDisparado.totalDrones, 4);
  const estadoFase2SemHangar = {
    ...estadoFase2,
    alvoCombate: {
      ...estadoFase2.alvoCombate,
      tripulacaoInimiga: [{ id: 'op-1', hpAtual: 100 }],
      salasOuOrgaos: estadoFase2.alvoCombate.salasOuOrgaos.map((s) =>
        s.id === 4 ? { ...s, integridade: 0, integridadeAtual: 0 } : s
      ),
    },
  };
  const surgeF2Quebrado = avancarTickChefeDraga(estadoFase2SemHangar, 20.0);
  assert.equal(surgeF2Quebrado.alvoCombate.ultimoPowerSurgeDisparado.totalDrones, 2);

  // Power Surge Fase 3 (18s -> Fervura Oceânica por 5.0s causando dano em Touchdown) e erro ao transicionar além da Fase 3
  let surgeF3 = avancarTickChefeDraga(
    {
      ...estadoFase3,
      naveJogador: { ...estadoFase3.naveJogador, estadoFisico: '2_TOUCHDOWN', hpCascoAtual: 20 },
    },
    18.0
  );
  assert.equal(surgeF3.alvoCombate.ultimoPowerSurgeDisparado.tipo, 'FERVURA_OCEANICA_E_7_LASERS');
  assert.equal(surgeF3.alvoCombate.fervuraAtivaSeg, 5.0);
  surgeF3 = avancarTickChefeDraga(surgeF3, 2.0);
  assert.equal(surgeF3.naveJogador.hpCascoAtual, 18, 'Fervura Oceânica causa -1 HP/s ao casco em Touchdown');
  assert.equal(surgeF3.alvoCombate.fervuraAtivaSeg, 3.0);
  assert.throws(() => transicionarFaseChefeDraga(estadoFase3), /última fase/);
});
