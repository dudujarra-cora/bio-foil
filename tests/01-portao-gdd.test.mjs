import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  carregarCadeiaCanonicaGdd,
  extrairSsotEMatrizDoVolume06,
  consultarConstanteSsotComPermissao,
  extrairCatalogoVolume05,
  calcularPesoTotalNave,
  calcularSustentacaoAtual,
  calcularVelocidadeCruzeiro,
  calcularTempoRecargaArma,
  extrairBaralhoVolume04,
  extrairSimulacaoVolume03,
  extrairContratoEstadoVolume08,
  extrairTripulacaoVolume01,
  extrairParametrosMarinheiros,
  normalizarTexto,
} from '../src/gdd-parser.mjs';

/**
 * Simulador INDEPENDENTE dos 2 marinheiros da Lancha (Vol. 03), em ticks de 0.25 s. Não lê o texto da simulação:
 * só recebe os 3 parâmetros que o GDD declara. Regras usadas (todas do GDD): sala inunda a +5 kg/s até 12.5 kg;
 * afogamento -8 HP/s em sala 100% inundada; recuo no 1º tick com HP < 30; Arpão (-15 HP) no Motor em t=11.0 s e no
 * Torpedo em t=19.75 s; Acústico (-15 HP) na Cabine em t=23.50 s; salva final (-30 HP) na Cabine em t=30.25 s.
 */
function simularMarinheiros({ salaM1, velAgua, salasCabineMotor }) {
  const DT = 0.25;
  const travessia = (nSalas) => Math.ceil((nSalas * 1.5) / velAgua / DT) * DT;
  const salasAteCabine = { MOTOR: salasCabineMotor, TORPEDO: salasCabineMotor + 1 };
  const cheiaEm = { MOTOR: 11.0 + 12.5 / 5.0, TORPEDO: 19.75 + 12.5 / 5.0 };
  const arpaoEm = { MOTOR: 11.0, TORPEDO: 19.75 };
  const marinheiros = {
    M2: { sala: 'MOTOR', chegada: 0 },
    M1: { sala: salaM1, chegada: 11.0 + travessia(salasAteCabine[salaM1]) },
  };
  const resultado = { motorCheioEm: cheiaEm.MOTOR };
  for (const [id, m] of Object.entries(marinheiros)) {
    let hp = 100;
    if (m.chegada <= arpaoEm[m.sala]) hp -= 15;
    const inicioAfogamento = Math.max(m.chegada, cheiaEm[m.sala]);
    let fuga = null;
    for (let t = inicioAfogamento; t <= 60; t += DT) {
      if (hp - 8 * (t - inicioAfogamento) < 30) {
        fuga = t;
        break;
      }
    }
    const afogamento = 8 * (fuga - inicioAfogamento);
    const hpFuga = hp - afogamento;
    const naCabine = fuga + travessia(salasAteCabine[m.sala]);
    let hpFinal = hpFuga;
    if (naCabine <= 23.5) hpFinal -= 15;
    const hpAntesSalva = hpFinal;
    if (naCabine <= 30.25) hpFinal -= 30;
    resultado[id] = { chegada: m.chegada, fuga, afogamento, hpFuga, naCabine, hpAntesSalva, eliminado: hpFinal <= 0 };
  }
  resultado.ambosEliminados = resultado.M1.eliminado && resultado.M2.eliminado;
  return resultado;
}

const DIRETORIO_RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Lei N2: Lista-catraca.
 * Se um defeito aberto na lista passar a verde, o teste reprova até sair da lista.
 */
const LISTA_CATRACA = Object.freeze([]);

test('Portão L5 + N4: aplica a cadeia canônica inteira (01..08) na ordem e valida tripwire de diretório', () => {
  const resultado = carregarCadeiaCanonicaGdd(DIRETORIO_RAIZ);

  console.log(`[N4] Arquivos .md examinados na cadeia canônica: ${resultado.arquivosExaminados}`);
  assert.ok(resultado.arquivosExaminados > 0, '[N4] Zero arquivos examinados deve reprovar');
  assert.equal(resultado.arquivosExaminados, 8, 'Deve examinar exatamente os 8 volumes canônicos (01..08)');

  assert.deepEqual(resultado.cadeiaDeclarada, [
    '01_matematica_base_e_auditoria.md',
    '02_wireframe_ui_e_auditoria.md',
    '03_vertical_slice_combate_e_auditoria.md',
    '04_mapa_procedural_e_auditoria.md',
    '05_conteudo_chefe_e_auditoria_final.md',
    '06_prova_formal_matriz_e_limites.md',
    '07_plano_mestre_de_testes_14_leis.md',
    '08_contrato_estado_e_arquitetura_modulos.md',
  ]);

  const vol07 = resultado.volumes[6].conteudo;
  const leisMapeadas = [...vol07.matchAll(/\| \*\*(L[1-7]|N[1-7])\*\* \|/g)].map((m) => m[1]);
  const ondasPlanejadas = [...vol07.matchAll(/### ONDA ([1-6]):/g)].map((m) => m[1]);
  const mutacoesPlanejadas = [...vol07.matchAll(/`(MUT-O[1-6]-0[1-4])`/g)].map((m) => m[1]);

  console.log(
    `[N4] Vol. 07 examinado: ${leisMapeadas.length} leis, ${ondasPlanejadas.length} ondas de implementação, ${mutacoesPlanejadas.length} mutações planejadas`
  );
  assert.equal(leisMapeadas.length, 14, 'Vol. 07 deve mapear todas as 14 Leis (L1..L7 e N1..N7)');
  assert.equal(ondasPlanejadas.length, 6, 'Vol. 07 deve planejar as 6 Ondas de implementação');
  assert.equal(mutacoesPlanejadas.length, 22, 'Vol. 07 deve especificar as 22 mutações obrigatórias das Ondas 1 a 6');

  const vol08 = extrairContratoEstadoVolume08(resultado.volumes[7].conteudo);
  console.log(
    `[N4] Vol. 08 examinado: ${vol08.dominiosRaiz.length} domínios no GameState, ${vol08.gameState.naveJogador.camaras.length} câmaras, ${vol08.gameState.naveJogador.tripulacao.length} tripulantes, ${vol08.linhasTabelaL3.length} canais L3, ${vol08.juncoesN1.length} junções N1`
  );
  assert.equal(vol08.dominiosRaiz.length, 8, 'GameState deve ter exatamente 8 domínios raiz');
  assert.equal(vol08.gameState.naveJogador.hpCascoMax, 30, 'HP base no GameState deve bater com SSOT (30 HP)');
  assert.equal(vol08.gameState.naveJogador.pesoChassiKg, 100.0, 'Peso chassi no GameState deve bater com SSOT (100 kg)');
  assert.equal(vol08.gameState.naveJogador.camaras.length, 8, 'GameState deve listar todas as 8 câmaras canônicas');
  for (const camara of vol08.gameState.naveJogador.camaras) {
    assert.equal(camara.aguaKg, 12.5, `Câmara ${camara.id} no GameState deve ter 12.5 kg de água`);
  }
  assert.equal(vol08.gameState.naveJogador.tripulacao.length, 3, 'GameState inicial deve listar os 3 tripulantes da Carcaça Alfa');
  assert.equal(vol08.gameState.naveJogador.armasAtivas.length, 4, 'GameState deve ter exatamente 4 slots de armas ativas');
  assert.equal(vol08.gameState.naveJogador.poraoCarga.length, 4, 'GameState deve ter exatamente 4 slots de porão de carga');
  assert.equal(vol08.linhasTabelaL3.length, 5, 'Tabela L3 da Seção 8.2 deve especificar os 5 estados de visibilidade');
  assert.equal(vol08.juncoesN1.length, 5, 'Seção 8.4 deve definir as 5 assinaturas puras de junção N1');

  // Junção N1 direta entre o JSON do Volume 08 e o Motor Matemático
  const nav = vol08.gameState.naveJogador;
  const pesoCalculadoDoJsonVol08 = calcularPesoTotalNave({
    pesoChassiKg: nav.pesoChassiKg,
    aguaPorCamaraKg: nav.camaras.map((c) => c.aguaKg),
    pesosArmasAtivasKg: nav.armasAtivas.filter((s) => s.arma !== null).map((s) => s.arma.pesoBaseKg),
    pesosCargaPoraoKg: nav.poraoCarga.filter((s) => s.item !== null).map((s) => s.item.pesoKg),
    quantidadeOrgaosEnxertados: nav.armasAtivas
      .filter((s) => s.arma !== null)
      .reduce((acc, s) => acc + s.arma.orgaosEnxertados.length, 0),
    nivelBlindagem: nav.nivelBlindagem,
  });
  const mastroCamara6 = nav.camaras.find((c) => c.id === 6);
  const sifaoCamara5 = nav.camaras.find((c) => c.id === 5);
  const sustCalculadaDoJsonVol08 = calcularSustentacaoAtual({
    barrasIntactasMastro: mastroCamara6.barrasIntegridade,
    barrasEnergiaSifao: sifaoCamara5.barrasEnergiaAlocada,
    aguaTotalTanquesKg: nav.camaras.reduce((acc, c) => acc + c.aguaKg, 0),
  });
  assert.equal(pesoCalculadoDoJsonVol08, 225, 'GameState inicial do Vol. 08 deve produzir exatos 225 kg no motor');
  assert.equal(sustCalculadaDoJsonVol08, 260, 'GameState inicial do Vol. 08 deve produzir exatos 260 kg de sustentação no motor');

  // Prova do Tripwire L5: criar um diretório temporário com item extra fora da lista deve dar vermelho
  const pastaTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ftl-tripwire-l5-'));
  try {
    for (const v of resultado.volumes) {
      fs.writeFileSync(path.join(pastaTmp, v.arquivo), v.conteudo, 'utf8');
    }
    fs.writeFileSync(path.join(pastaTmp, '09_arquivo_intruso_nao_declarado.md'), '# Intruso', 'utf8');
    assert.throws(
      () => carregarCadeiaCanonicaGdd(pastaTmp),
      /\[L5 TRIPWIRE FALHOU\]/,
      'Item fora da lista canônica no diretório tem que reprovar no tripwire L5'
    );
  } finally {
    fs.rmSync(pastaTmp, { recursive: true, force: true });
  }
});

test('Lei L2 + L3: isolamento de leitura sem estado compartilhado (L2) e canal explícito de permissão vs ausência (L3)', () => {
  const leituraA = carregarCadeiaCanonicaGdd(DIRETORIO_RAIZ);
  const leituraB = carregarCadeiaCanonicaGdd(DIRETORIO_RAIZ);

  assert.notStrictEqual(leituraA, leituraB, '[L2] Leituras consecutivas devem devolver instâncias distintas');
  assert.notStrictEqual(leituraA.volumes, leituraB.volumes, '[L2] Vetor de volumes não pode ser compartilhado');
  assert.throws(() => {
    leituraA.volumes.push({ ordem: 99 });
  }, TypeError, '[L2] Objeto retornado deve impedir mutação in-place');

  const { constantesSsot } = extrairSsotEMatrizDoVolume06(leituraA.volumes[5].conteudo);

  const semPermissao = consultarConstanteSsotComPermissao(constantesSsot, 'HP_CASCO_BASE', {
    autorizado: false,
  });
  const chaveInexistente = consultarConstanteSsotComPermissao(constantesSsot, 'CONSTANTE_QUE_NAO_EXISTE', {
    autorizado: true,
  });
  const chaveValida = consultarConstanteSsotComPermissao(constantesSsot, 'HP_CASCO_BASE', {
    autorizado: true,
  });

  assert.equal(semPermissao.canalPermissao, 'NEGADO');
  assert.equal(semPermissao.status, 'SEM_PERMISSAO');
  assert.equal(chaveInexistente.canalPermissao, 'AUTORIZADO');
  assert.equal(chaveInexistente.status, 'NAO_ENCONTRADO');
  assert.notEqual(
    semPermissao.marcadorExplicito,
    chaveInexistente.marcadorExplicito,
    '[L3] "Não existe" e "Não posso ver" nunca podem devolver o mesmo marcador'
  );
  assert.equal(chaveValida.status, 'OK');
  assert.equal(normalizarTexto(chaveValida.valor.valorBruto).trim(), '30 HP');
});

test('Junção N1 + L4 + N4: cruza Tabela SSOT (26 constantes) e Matriz 5x8 (40 células) do Vol. 06 com Vols. 01..05', () => {
  const cadeia = carregarCadeiaCanonicaGdd(DIRETORIO_RAIZ);
  const vol01 = normalizarTexto(cadeia.volumes[0].conteudo);
  const vol02 = cadeia.volumes[1].conteudo;
  const vol03 = normalizarTexto(cadeia.volumes[2].conteudo);
  const vol04 = normalizarTexto(cadeia.volumes[3].conteudo);
  const vol06 = cadeia.volumes[5].conteudo;

  const {
    totalConstantes,
    constantesSsot,
    totalCelulasMatriz,
    celulasMatriz,
    limitesExtremos,
    niveisPrecedencia,
  } = extrairSsotEMatrizDoVolume06(vol06);

  console.log(
    `[N4] Vol. 06 examinado: ${totalConstantes} constantes SSOT, ${totalCelulasMatriz} células 5x8, ${limitesExtremos.length} limites extremos, ${niveisPrecedencia.length} níveis de precedência`
  );

  assert.equal(totalConstantes, 26, 'A Tabela SSOT 6.1 deve conter exatamente 26 constantes canônicas');
  assert.equal(totalCelulasMatriz, 40, 'A Matriz 6.2 (5 estados x 8 eventos) deve conter 40 células');
  assert.equal(limitesExtremos.length, 4, 'A Seção 6.3 deve conter exatamente 4 Provas de Limite Extremo');
  assert.equal(niveisPrecedencia.length, 4, 'A Seção 6.4 deve conter exatamente 4 Níveis de Precedência');

  // L4 + L6: valor literal real de TODAS as 26 constantes, comparado pelo SIGNIFICADO (texto normalizado, sem LaTeX)
  const gabaritoLiteralSsot = {
    HP_CASCO_BASE: '30 HP',
    PESO_CHASSI_BASE: '100 kg',
    NUM_CAMARAS_NAVE: '8 câmaras',
    CAP_AGUA_CAMARA: '12.5 kg',
    RESERVA_MIN_SIFAO: '62.5 kg',
    PENALIDADE_CAVITACAO: '-2.0 kg',
    SLOTS_ARMAS_ATIVAS: '4 slots',
    SLOTS_PORAO_CARGA: '4 slots',
    PESO_ORGAO_ENXERTO: '+5.0 kg',
    PESO_SUBSISTEMA: '0.0 kg',
    PESO_BLINDAGEM_NV: '+15.0 kg',
    MASTRO_FOIL_CURVA: '200 / 240 / 280 / 330 kg',
    SIFAO_EMP_POR_BARRA: '+30.0 kg',
    SUSTENTACAO_MAX_ABS: '480.0 kg',
    TEMPO_SPOOL_UP: '3.0 s',
    TAXA_FURO_AR: '-1.0 kg/s',
    TAXA_VALVULA_AR: '-2.5 kg/s',
    TAXA_FURO_MAR: '+5.0 kg/s',
    TAXA_RECARGA_MAR: '+5.0 kg/s',
    TAXA_CAPILAR_AR: '+1.25 kg/s',
    TAXA_DRENO_PESADO: '-4.0 kg/s',
    TEMPO_NADO_SALA: '1.5 s',
    TEMPO_REPARO_SIST: '12.0 s',
    TEMPO_REPARO_FURO: '8.0 s',
    DANO_ANTIPESSOAL: '15 HP',
    REATOR_TETO_COMPRA: '18 barras',
  };
  let constantesVerificadasLiteralmente = 0;
  for (const [idConstante, valorLiteralEsperado] of Object.entries(gabaritoLiteralSsot)) {
    assert.ok(constantesSsot[idConstante], `Constante ${idConstante} ausente da SSOT`);
    assert.equal(
      normalizarTexto(constantesSsot[idConstante].valorBruto).trim(),
      valorLiteralEsperado,
      `Valor de ${idConstante} divergiu do literal canônico`
    );
    constantesVerificadasLiteralmente += 1;
  }
  assert.equal(constantesVerificadasLiteralmente, 26, 'Todas as 26 constantes da SSOT devem ter asserção literal');

  // Cruzamento N1 com Volume 01, 02, 03 e 04 (por significado)
  assert.ok(vol01.includes('4 Slots de Armas Ativas'), 'Vol. 01 deve declarar 4 Slots de Armas Ativas');
  assert.ok(vol01.includes('8 x 12.5 kg = 100 kg'), 'Vol. 01 deve manter 8 x 12.5 kg = 100 kg');
  assert.match(vol02, /\[ARMAS: 4 SLOTS \(3 BARRAS\)\]/, 'Vol. 02 Wireframe deve exibir 4 SLOTS de armas');
  assert.match(vol02, /\[3: VAZIO\]\s+\[4: VAZIO\]/, 'Vol. 02 Wireframe deve listar os slots 3 e 4 vazios na nave inicial');

  // Verifica no Wireframe (Vol. 02) que [CABINE] e [TORRETA] estão acima da LINHA D'ÁGUA e [MOTOR SUB] / [TORP. SUB] abaixo
  const partesLinhaDaguaVol02 = vol02.split("LINHA D'ÁGUA");
  assert.equal(partesLinhaDaguaVol02.length, 2, 'Wireframe Vol. 02 deve conter a divisória LINHA D\'ÁGUA');
  assert.match(partesLinhaDaguaVol02[0], /\[CABINE\]/, '[CABINE] deve estar acima da linha d\'água no Vol. 02');
  assert.match(partesLinhaDaguaVol02[0], /\[TORRETA\]/, '[TORRETA] deve estar acima da linha d\'água no Vol. 02');
  assert.match(partesLinhaDaguaVol02[1], /\[MOTOR SUB\]/, '[MOTOR SUB] deve estar abaixo da linha d\'água no Vol. 02');
  assert.match(partesLinhaDaguaVol02[1], /\[TORP\. SUB\]/, '[TORP. SUB] deve estar abaixo da linha d\'água no Vol. 02');

  assert.ok(vol03.includes('4 Slots de Armas Ativas'), 'Vol. 03 deve declarar 4 Slots de Armas Ativas na ficha da Carcaça Alfa');
  assert.match(vol04, /\\min\\left\(15\.0, V_\{base\} x /, 'Vol. 04 deve aplicar o teto de 15.0 MN/h sobre V_base');

  // Verifica célula crítica 5A (Touchdown + Tinta Furtiva) e 3H (Spool-up + Fervura Oceânica)
  const celula5A = celulasMatriz.find(
    (c) => c.evento.startsWith('A. Esquiva') && c.estado === '5_FURTIVO_AGUA'
  );
  assert.ok(celula5A, 'Célula 5A deve existir na Matriz');
  assert.ok(normalizarTexto(celula5A.regra).includes('0% para projéteis já em voo'));
  assert.ok(normalizarTexto(celula5A.regra).includes('congela 100% o carregamento de mira inimiga'));

  const celula3H = celulasMatriz.find(
    (c) => c.evento.startsWith('H. Perigos') && c.estado === '3_SPOOL_UP'
  );
  assert.ok(celula3H, 'Célula 3H deve existir na Matriz');
  assert.ok(normalizarTexto(celula3H.regra).includes('4.0s antes'));
});

test('Junção N1 + N4: recalcula no motor as 5 Naves, 7 Armas, 6 Órgãos e Simulação (t=0s..32.75s) contra Vols. 03 e 05', () => {
  const cadeia = carregarCadeiaCanonicaGdd(DIRETORIO_RAIZ);
  const vol04 = cadeia.volumes[3].conteudo;
  const vol05 = cadeia.volumes[4].conteudo;
  const baralhoVol04 = extrairBaralhoVolume04(vol04);
  const catalogo = extrairCatalogoVolume05(vol05);

  console.log(
    `[N4] Baralho Vol. 04 examinado: ${baralhoVol04.cotas.length} categorias de cotas (soma = ${baralhoVol04.somaTotalNosBase} nós)`
  );
  console.log(
    `[N4] Catálogo Vol. 05 examinado: ${catalogo.armas.length} armas, ${catalogo.orgaos.length} órgãos, ${catalogo.biomas.length} biomas, ${catalogo.naves.length} naves, ${catalogo.fasesChefe.length} fases do chefe`
  );

  assert.deepEqual(baralhoVol04.cotas, [2, 4, 6, 3, 3, 1, 1], 'Cotas de nós do Vol. 04 devem ser [2, 4, 6, 3, 3, 1, 1]');
  assert.equal(baralhoVol04.somaTotalNosBase, 20, 'Soma do baralho procedural base do Vol. 04 deve fechar em exatos 20 nós');
  assert.equal(catalogo.armas.length, 7, 'Catálogo 5.1 deve ter exatamente 7 chassis de armas');
  assert.equal(catalogo.orgaos.length, 6, 'Catálogo 5.2 deve ter exatamente 6 órgãos de enxerto');
  assert.equal(catalogo.biomas.length, 8, 'Catálogo 5.3 deve ter exatamente 8 biomas/setores');
  assert.equal(catalogo.pesoPorOrgaoKg, 5, 'Cada órgão deve pesar exatamente +5 kg');
  assert.equal(catalogo.naves.length, 5, 'Catálogo 5.4 deve ter exatamente 5 naves desbloqueáveis');
  assert.equal(catalogo.fasesChefe.length, 3, 'Seção 5.5 deve definir exatamente as 3 Fases do Chefe Final');

  const tanquesCheios = Array(8).fill(12.5);

  // 1. Carcaça Alfa: 100 chassi + 100 água + 15 Arpão + 10 Acústico = 225 kg | Sustentação: 200 + 60 = 260 kg
  const pesoAlfa = calcularPesoTotalNave({
    pesoChassiKg: 100,
    aguaPorCamaraKg: tanquesCheios,
    pesosArmasAtivasKg: [15, 10],
  });
  const sustAlfa = calcularSustentacaoAtual({
    barrasIntactasMastro: 4,
    barrasEnergiaSifao: 2,
    aguaTotalTanquesKg: 100,
  });
  assert.equal(pesoAlfa, 225);
  assert.equal(pesoAlfa, catalogo.naves[0].pesoTotalKgDeclarado);
  assert.equal(sustAlfa, 260);
  assert.equal(sustAlfa, catalogo.naves[0].sustentacaoInicialKgDeclarada);

  // 2. Manta-Volt: 70 chassi + 100 água + 2x10 Acústico + 1 órgão (5 kg) = 195 kg | Sustentação: 260 kg | Vel: 12.7 MN/h
  const pesoManta = calcularPesoTotalNave({
    pesoChassiKg: 70,
    aguaPorCamaraKg: tanquesCheios,
    pesosArmasAtivasKg: [10, 10],
    quantidadeOrgaosEnxertados: 1,
  });
  const velManta = calcularVelocidadeCruzeiro({
    sustentacaoAtualKg: 260,
    pesoTotalKg: pesoManta,
  });
  assert.equal(pesoManta, 195, 'Peso da Manta-Volt recalculado no motor diverge de 195 kg');
  assert.equal(pesoManta, catalogo.naves[1].pesoTotalKgDeclarado);
  assert.equal(velManta, 12.7);

  // 3. Couraça-Limiar: 100 chassi + 100 água + 10 Acústico + 15 Arpão = 225 kg | Mastro Nv.2 (5 barras = 240) + Sifão 60 = 300 kg
  const pesoCouraca = calcularPesoTotalNave({
    pesoChassiKg: 100,
    aguaPorCamaraKg: tanquesCheios,
    pesosArmasAtivasKg: [10, 15],
  });
  const sustCouraca = calcularSustentacaoAtual({
    barrasIntactasMastro: 5,
    barrasEnergiaSifao: 2,
    aguaTotalTanquesKg: 100,
  });
  assert.equal(pesoCouraca, 225);
  assert.equal(pesoCouraca, catalogo.naves[2].pesoTotalKgDeclarado);
  assert.equal(sustCouraca, 300);
  assert.equal(sustCouraca, catalogo.naves[2].sustentacaoInicialKgDeclarada);

  // 4. Sombra-Abissal: 90 chassi + 100 água + 10 Acústico + 15 Arpão + 1 órgão (5 kg) = 220 kg | Sustentação: 260 kg
  const pesoSombra = calcularPesoTotalNave({
    pesoChassiKg: 90,
    aguaPorCamaraKg: tanquesCheios,
    pesosArmasAtivasKg: [10, 15],
    quantidadeOrgaosEnxertados: 1,
  });
  assert.equal(pesoSombra, 220);
  assert.equal(pesoSombra, catalogo.naves[3].pesoTotalKgDeclarado);

  // 5. Colmeia-Viva: 100 chassi + 100 água + 18 Rajada II + 12 Morteiro = 230 kg | Sustentação: 260 kg
  const pesoColmeia = calcularPesoTotalNave({
    pesoChassiKg: 100,
    aguaPorCamaraKg: tanquesCheios,
    pesosArmasAtivasKg: [18, 12],
  });
  assert.equal(pesoColmeia, 230);
  assert.equal(pesoColmeia, catalogo.naves[4].pesoTotalKgDeclarado);

  // Limites Extremos (Seção 6.3): Lower Bound (142.5 kg em combate / 15.0 MN/h cap) e Upper Bound (397 kg <= 480 kg)
  const pesoMinCombate = calcularPesoTotalNave({
    pesoChassiKg: 70,
    aguaPorCamaraKg: [12.5, 12.5, 12.5, 12.5, 12.5, 0, 0, 0],
    pesosArmasAtivasKg: [10],
  });
  assert.equal(pesoMinCombate, 142.5);

  const pesoMaxEquipado = calcularPesoTotalNave({
    pesoChassiKg: 100,
    aguaPorCamaraKg: tanquesCheios,
    pesosArmasAtivasKg: [28, 28, 28, 28],
    quantidadeOrgaosEnxertados: 8,
    nivelBlindagem: 3,
  });
  const sustMaxAbsoluta = calcularSustentacaoAtual({
    barrasIntactasMastro: 7,
    barrasEnergiaSifao: 5,
    aguaTotalTanquesKg: 100,
  });
  assert.equal(pesoMaxEquipado, 397);
  assert.equal(sustMaxAbsoluta, 480);
  assert.ok(pesoMaxEquipado + 50 <= sustMaxAbsoluta, 'Nave maximizada deve suportar Onda de Arrasto (+50 kg) sem cair');

  // Simulação do Passo 3: tempos de recarga resfriados em Touchdown (-25%) e auditoria da linha do tempo (0.0s..32.75s)
  const recargaAcusticoTouchdown = calcularTempoRecargaArma({
    tempoChassiSeg: 9,
    emTouchdown: true,
  });
  const recargaArpaoTouchdown = calcularTempoRecargaArma({
    tempoChassiSeg: 11,
    emTouchdown: true,
  });
  assert.equal(recargaAcusticoTouchdown, 6.75);
  assert.equal(recargaArpaoTouchdown, 8.25);

  const simVol03 = extrairSimulacaoVolume03(cadeia.volumes[2].conteudo);
  const sim = simVol03.textoNormalizado;

  // B3: a linha do tempo é RECALCULADA a partir das fontes (Vol. 01 tripulação + motor + SSOT), não copiada do texto.
  const trip = extrairTripulacaoVolume01(cadeia.volumes[0].conteudo);
  const polvo = trip.especies.find((e) => e.especie === 'POLVO');
  const nadoPolvo = 1.5 / polvo.velNado; // TEMPO_NADO_SALA ÷ velocidade da espécie
  const tTouchdown = 13.0; // torpedo inimigo de 13 s quebra o Mastro
  const restanteNoMar = (tDisparoAnterior, recargaBase) =>
    tTouchdown + calcularTempoRecargaArma({ tempoChassiSeg: recargaBase - (tTouchdown - tDisparoAnterior), emTouchdown: true });

  const tAcustico1 = 9.0; // Emissor Acústico I: 9 s no ar
  const tArpao1 = 11.0; // Canhão de Arpão: 11 s no ar
  const tAcustico2 = restanteNoMar(tAcustico1, 9); // 4 s no ar + 5 s x 0.75
  const tArpao2 = restanteNoMar(tArpao1, 11); // 2 s no ar + 9 s x 0.75
  const tAcustico3 = tAcustico2 + recargaAcusticoTouchdown;
  const tAcustico4 = tAcustico3 + recargaAcusticoTouchdown;
  const tPolvoNoSifao = 10.0 + 2 * nadoPolvo; // Córtex -> Sifão (2 salas)
  const tSifaoReparado = tPolvoNoSifao + polvo.reparoSistSeg;
  const tFuroFechado = tSifaoReparado + polvo.reparoFuroSeg;
  const tPolvoNoPoco = tFuroFechado + nadoPolvo;
  const tMastroReparado = tPolvoNoPoco + polvo.reparoSistSeg;
  const tDecolagem = tMastroReparado + 3.0; // TEMPO_SPOOL_UP
  const tMotorInimigoInundado = tArpao1 + 12.5 / 5.0; // TAXA_FURO_MAR enche 12.5 kg
  const tO2Recuperado = 10.0 + (4 * 10.0) / 8; // caiu -4%/s por 10 s, volta a +8%/s

  // Marinheiros inimigos: simulados em ticks de 0.25 s com os parâmetros que o GDD declara (Vol. 01, 02 e 03)
  const params = extrairParametrosMarinheiros(cadeia);
  const canonico = simularMarinheiros(params);
  const { M1, M2 } = canonico;

  const linhaDoTempoCalculada = [
    0, tAcustico1, 10.0, tArpao1, 10.0 + 1.7, tPolvoNoSifao, tTouchdown, M1.chegada, canonico.motorCheioEm,
    tO2Recuperado, tAcustico2, tSifaoReparado, tArpao2, M2.fuga, M1.fuga, M2.naCabine, tFuroFechado, tAcustico3,
    tPolvoNoPoco, M1.naCabine, tMastroReparado, tAcustico4, tDecolagem,
  ];
  const linhaDoTempoUnica = [...new Set(linhaDoTempoCalculada)].sort((a, b) => a - b);

  console.log(`[N4] Marcos temporais da Simulação Vol. 03 examinados: ${simVol03.timestampsUnicos.length} (recalculados: ${linhaDoTempoUnica.length})`);
  assert.deepEqual(
    simVol03.timestampsUnicos,
    linhaDoTempoUnica,
    'Linha do tempo do Vol. 03 diverge da linha do tempo recalculada a partir do Vol. 01 + motor + SSOT'
  );

  // Cadeia de HP recalculada e conferida no texto do Vol. 03
  assert.ok(sim.includes(`100 - 15 - ${M2.afogamento} = ${M2.hpFuga} HP`), 'Vol. 03 deve fechar o HP de fuga do Marinheiro 2');
  assert.ok(sim.includes(`100 - ${M1.afogamento} = ${M1.hpFuga} HP`), 'Vol. 03 deve fechar o HP de fuga do Marinheiro 1');
  assert.ok(sim.includes(`${M2.hpFuga} -> ${M2.hpFuga - 15} HP`), 'Vol. 03 deve registrar o Acústico na Cabine atingindo só o Marinheiro 2');
  assert.ok(sim.includes(`${M2.hpAntesSalva} HP -> 0`) && sim.includes(`${M1.hpAntesSalva} HP -> 0`), 'Vol. 03 deve registrar a eliminação dos dois marinheiros');
  assert.ok(!/impacto no Marinheiro 1/.test(sim), 'Marinheiro 1 está na Sala do Motor: não pode levar o Arpão da Sala do Torpedo');
  assert.equal(canonico.ambosEliminados, true, 'No cenário canônico a salva de 30.25 s tem de eliminar os dois marinheiros');
  assert.ok(sim.includes(`${8 - 6}/8 HP`), 'Casco inimigo deve terminar em 2/8 HP após 6 acertos de 1 dano');
  const sustentacaoAposTorpedo = calcularSustentacaoAtual({ barrasIntactasMastro: 3, barrasEnergiaSifao: 1, aguaTotalTanquesKg: 99 });
  assert.equal(sustentacaoAposTorpedo, 180);
  assert.ok(sim.includes('180 kg'), 'Vol. 03 deve registrar sustentação de 180 kg após o torpedo');
  assert.ok(sustentacaoAposTorpedo < 224, 'Com 180 kg < 224 kg a nave tem de cair em Touchdown em t=13.0s');
});

test('Possibilidades (dúvida testada, não deduzida): 12 cenários do Marinheiro 1; o GDD tem de fixar o único canônico', () => {
  const cadeia = carregarCadeiaCanonicaGdd(DIRETORIO_RAIZ);
  const params = extrairParametrosMarinheiros(cadeia);

  // O GDD tem de declarar os 3 parâmetros que o próprio GDD deixava em aberto
  assert.equal(params.salaM1, 'MOTOR', 'Vol. 03 deve declarar que o Marinheiro 1 desce para a Sala do Motor');
  assert.equal(params.velAgua, 0.7, 'Vol. 01 deve declarar a velocidade do marinheiro humano em sala inundada (0.7x)');
  assert.equal(params.salasCabineMotor, 1, 'Wireframe do Vol. 02 deve pôr a Cabine diretamente acima da Sala do Motor');
  assert.equal(params.arredondaTick, true, 'Vol. 01 deve declarar o arredondamento de travessias ao tick de 0.25 s');

  const cenarios = [];
  for (const salaM1 of ['MOTOR', 'TORPEDO']) {
    for (const velAgua of [0.5, 0.7, 1.0]) {
      for (const salasCabineMotor of [1, 2]) {
        const r = simularMarinheiros({ salaM1, velAgua, salasCabineMotor });
        cenarios.push({ chave: `${salaM1}/${velAgua}x/${salasCabineMotor}sala`, ambosEliminados: r.ambosEliminados });
      }
    }
  }
  const quebram = cenarios.filter((c) => !c.ambosEliminados).map((c) => c.chave);
  console.log(`[N4] Cenários do Marinheiro 1 examinados: ${cenarios.length} | quebram o desfecho: ${quebram.length} -> ${quebram.join(', ')}`);
  assert.equal(cenarios.length, 12);
  assert.deepEqual(
    quebram,
    ['MOTOR/0.5x/2sala', 'TORPEDO/0.5x/1sala', 'TORPEDO/0.5x/2sala', 'TORPEDO/0.7x/1sala', 'TORPEDO/0.7x/2sala', 'TORPEDO/1x/1sala', 'TORPEDO/1x/2sala'],
    'Mapa de robustez mudou: revise o Vol. 03 antes de aceitar'
  );
  const chaveCanonica = `${params.salaM1}/${params.velAgua}x/${params.salasCabineMotor}sala`;
  assert.ok(!quebram.includes(chaveCanonica), `O cenário canônico (${chaveCanonica}) não pode quebrar o desfecho`);
});

test('Junção N1 + L4 + N4 (B1/B2): Tabela de Tripulação do Vol. 01 é a fonte; Vols. 03, 06 e 08 têm de concordar com ela', () => {
  const cadeia = carregarCadeiaCanonicaGdd(DIRETORIO_RAIZ);
  const trip = extrairTripulacaoVolume01(cadeia.volumes[0].conteudo);
  const vol03 = normalizarTexto(cadeia.volumes[2].conteudo);
  const vol06 = normalizarTexto(cadeia.volumes[5].conteudo);
  const vol08 = extrairContratoEstadoVolume08(cadeia.volumes[7].conteudo);

  console.log(`[N4] Espécies de tripulação examinadas no Vol. 01: ${trip.especies.length}`);
  assert.equal(trip.especies.length, 4, 'Vol. 01 deve definir exatamente 4 espécies de tripulação');

  // Literais canônicos (L4): valores reais, não símbolos importados
  const porEspecie = Object.fromEntries(trip.especies.map((e) => [e.especie, e]));
  assert.equal(porEspecie.POLVO.hpMax, 80);
  assert.equal(porEspecie.ARRAIA.hpMax, 70);
  assert.equal(porEspecie.BAIACU.hpMax, 150);
  assert.equal(porEspecie.CARANGUEJO.hpMax, 110);

  // Reparo: tempo da espécie = tempo base da SSOT (12 s sistema / 8 s furo) ÷ multiplicador da espécie
  for (const e of trip.especies) {
    assert.equal(e.reparoSistSeg, 12 / e.multReparo, `Reparo de sistema de ${e.especie} incoerente com 12 s ÷ ${e.multReparo}`);
    assert.equal(e.reparoFuroSeg, 8 / e.multReparo, `Reparo de furo de ${e.especie} incoerente com 8 s ÷ ${e.multReparo}`);
  }

  // Vol. 08: todo tripulante do GameState tem HP igual ao da tabela do Vol. 01
  let tripulantesConferidos = 0;
  for (const t of vol08.gameState.naveJogador.tripulacao) {
    const fonte = porEspecie[t.especie];
    assert.ok(fonte, `Espécie ${t.especie} do Vol. 08 não existe no Vol. 01`);
    assert.equal(t.hpMax, fonte.hpMax, `HP máx de ${t.especie} no Vol. 08 diverge do Vol. 01`);
    assert.equal(t.hpAtual, fonte.hpMax, `HP inicial de ${t.especie} no Vol. 08 diverge do Vol. 01`);
    tripulantesConferidos += 1;
  }
  assert.equal(tripulantesConferidos, 3, '[N4] 3 tripulantes da Carcaça Alfa conferidos contra o Vol. 01');

  // Vol. 03: o dano antipessoal no Baiacu parte do HP do Vol. 01 e subtrai os 15 HP da SSOT
  const danoBaiacu = vol03.match(/-15 HP de dano antipessoal no Baiacu \((\d+) -> (\d+) HP\)/);
  assert.ok(danoBaiacu, 'Vol. 03 deve registrar o dano antipessoal de 15 HP no Baiacu');
  assert.equal(Number(danoBaiacu[1]), porEspecie.BAIACU.hpMax, 'HP inicial do Baiacu no Vol. 03 diverge do Vol. 01');
  assert.equal(Number(danoBaiacu[2]), porEspecie.BAIACU.hpMax - 15, 'HP final do Baiacu no Vol. 03 não fecha com -15 HP');

  // Vol. 06 (Prova Anti-Imortalidade) usa o DPS do Mergulhador: ele tem de estar definido na fonte (Vol. 01)
  assert.equal(trip.mergulhadorDps, 12, 'Vol. 01 deve definir o DPS do Mergulhador de Assalto (12 DPS)');
  const dpsDuplaVol06 = vol06.match(/Mergulhadores de Assalto \(2 x (\d+) DPS = ([\d.]+) DPS\)/);
  assert.ok(dpsDuplaVol06, 'Vol. 06 deve conter a conta 2 x DPS do Mergulhador');
  assert.equal(Number(dpsDuplaVol06[1]), trip.mergulhadorDps, 'DPS do Mergulhador no Vol. 06 diverge do Vol. 01');
  assert.equal(Number(dpsDuplaVol06[2]), 2 * trip.mergulhadorDps);
  assert.ok(2 * trip.mergulhadorDps > 18, 'Dupla de Mergulhadores tem de superar a cura máxima de 18 HP/s');

  // B15 (decisão): inflar o Baiacu leva 1.0 s de ativação — Vol. 01 (fonte) e Vol. 03 (simulação) têm de concordar
  assert.equal(trip.tempoInflarBaiacuSeg, 1.0, 'Vol. 01 deve definir 1.0 s de ativação do Inflar do Baiacu');
  const inflarVol03 = vol03.match(/ativa Inflar sobre o furo \(leva ([\d.]+)s/);
  assert.ok(inflarVol03, 'Vol. 03 deve declarar o tempo de ativação do Inflar');
  assert.equal(Number(inflarVol03[1]), trip.tempoInflarBaiacuSeg, 'Tempo de Inflar no Vol. 03 diverge do Vol. 01');
});

test('Lei N2: verificação da Lista-Catraca (nenhum item resolvido pode permanecer na catraca)', () => {
  console.log(`[N4] Itens na Lista-Catraca examinados: ${LISTA_CATRACA.length}`);
  for (const item of LISTA_CATRACA) {
    assert.ok(item.id && item.data && item.frase, 'Item da catraca exige id, data e frase');
    const aindaFalha = item.verificarFalha();
    assert.equal(
      aindaFalha,
      true,
      `[N2 CATRACA] O item ${item.id} (${item.frase}) passou a verde! Remova-o da LISTA_CATRACA.`
    );
  }
});
