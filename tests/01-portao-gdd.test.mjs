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
  extrairEconomiaVolume05,
  extrairChefeEBestiarioVolume05,
  extrairCustosMastroVolume01,
  extrairSaqueSetor1Volume03,
  extrairInimigosSetor1Volume03,
  calcularPesoTotalNave,
  calcularSustentacaoAtual,
  calcularVelocidadeCruzeiro,
  calcularTempoRecargaArma,
  extrairBaralhoVolume04,
  extrairSimulacaoVolume03,
  extrairContratoEstadoVolume08,
  extrairTripulacaoVolume01,
  extrairTopologiaOcupacaoBeamVolume01,
  calcularRotaMinimaCamaras,
  resolverTickCombateCorpoACorpoSala,
  validarTracadoBeamOrtogonal,
  enumerarTracadosBeamValidos,
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

  // B3: a linha do tempo é RECALCULADA a partir das fontes (Vol. 01 tripulação + topologia 1.6.A + motor + SSOT), não copiada do texto.
  const trip = extrairTripulacaoVolume01(cadeia.volumes[0].conteudo);
  const topologia = extrairTopologiaOcupacaoBeamVolume01(cadeia.volumes[0].conteudo);
  const polvo = trip.especies.find((e) => e.especie === 'POLVO');
  const nadoPolvo = 1.5 / polvo.velNado; // TEMPO_NADO_SALA ÷ velocidade da espécie
  const saltosCortexParaSifao = calcularRotaMinimaCamaras(topologia.camaras, 2, 5).saltos;
  const saltosSifaoParaPoco = calcularRotaMinimaCamaras(topologia.camaras, 5, 6).saltos;
  const tTouchdown = 13.0; // torpedo inimigo de 13 s quebra o Mastro
  const restanteNoMar = (tDisparoAnterior, recargaBase) =>
    tTouchdown + calcularTempoRecargaArma({ tempoChassiSeg: recargaBase - (tTouchdown - tDisparoAnterior), emTouchdown: true });

  const tAcustico1 = 9.0; // Emissor Acústico I: 9 s no ar
  const tArpao1 = 11.0; // Canhão de Arpão: 11 s no ar
  const tAcustico2 = restanteNoMar(tAcustico1, 9); // 4 s no ar + 5 s x 0.75
  const tArpao2 = restanteNoMar(tArpao1, 11); // 2 s no ar + 9 s x 0.75
  const tAcustico3 = tAcustico2 + recargaAcusticoTouchdown;
  const tAcustico4 = tAcustico3 + recargaAcusticoTouchdown;
  const tPolvoNoSifao = 10.0 + saltosCortexParaSifao * nadoPolvo; // Córtex (2) -> Sifão (5) pelo grafo 1.6.A
  const tSifaoReparado = tPolvoNoSifao + polvo.reparoSistSeg;
  const tFuroFechado = tSifaoReparado + polvo.reparoFuroSeg;
  const tPolvoNoPoco = tFuroFechado + saltosSifaoParaPoco * nadoPolvo; // Sifão (5) -> Poço da Quilha (6) pelo grafo 1.6.A
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

test('Junção N1 + L4 + N4: audita a Economia Completa do Vol. 05 (Upgrades, Lojas, Reator 7..18 e Curva Setores 1..8) contra Vols. 01, 03, 06 e 08', () => {
  const cadeia = carregarCadeiaCanonicaGdd(DIRETORIO_RAIZ);
  const vol01 = cadeia.volumes[0].conteudo;
  const vol03 = cadeia.volumes[2].conteudo;
  const vol05 = cadeia.volumes[4].conteudo;
  const vol06 = cadeia.volumes[5].conteudo;
  const vol08 = extrairContratoEstadoVolume08(cadeia.volumes[7].conteudo);

  const catalogo = extrairCatalogoVolume05(vol05);
  const economia = extrairEconomiaVolume05(vol05);
  const custosMastroVol01 = extrairCustosMastroVolume01(vol01);
  const saqueSetor1Vol03 = extrairSaqueSetor1Volume03(vol03);
  const { constantesSsot } = extrairSsotEMatrizDoVolume06(vol06);
  const tripVol01 = extrairTripulacaoVolume01(vol01);

  console.log(
    `[N4] Economia Vol. 05 examinada: ${economia.upgrades.length} árvores de upgrade, ${economia.itensLoja.length} itens/serviços de loja, ${economia.curvaSetores.length} setores na curva de saque`
  );
  assert.equal(economia.upgrades.length, 10, 'Seção 5.6.A deve especificar exatamente as 10 árvores de upgrade');
  assert.equal(economia.itensLoja.length, 20, 'Seção 5.6.B deve especificar exatamente os 20 itens/serviços dos Recifes-Forja');
  assert.equal(economia.curvaSetores.length, 8, 'Seção 5.6.C deve especificar a curva de saque dos 8 setores');

  // 1. Verifica cada árvore de upgrade e a soma total de maximização (850 Sucata + 1100 Biomassa + 380 Flexível = 2330)
  for (const u of economia.upgrades) {
    assert.ok(u.custosNiveis.length > 0, `Upgrade ${u.nome} sem níveis de custo`);
    assert.equal(
      u.somaCalculada,
      u.somaDeclarada,
      `Soma dos níveis de ${u.nome} (${u.somaCalculada}) diverge do total declarado (${u.somaDeclarada})`
    );
  }
  const somaSucataUpgrades = economia.upgrades
    .filter((u) => u.moeda === 'SUCATA')
    .reduce((acc, u) => acc + u.somaCalculada, 0);
  const somaBiomassaUpgrades = economia.upgrades
    .filter((u) => u.moeda === 'BIOMASSA')
    .reduce((acc, u) => acc + u.somaCalculada, 0);
  const somaFlexivelUpgrades = economia.upgrades
    .filter((u) => u.moeda === 'FLEXIVEL')
    .reduce((acc, u) => acc + u.somaCalculada, 0);

  assert.equal(somaSucataUpgrades, 850, 'Soma dos upgrades mecânicos em Sucata deve ser 850');
  assert.equal(somaBiomassaUpgrades, 1100, 'Soma dos upgrades biológicos em Biomassa deve ser 1100');
  assert.equal(somaFlexivelUpgrades, 380, 'Soma das 12 barras compráveis do Reator deve ser 380');
  assert.equal(
    somaSucataUpgrades + somaBiomassaUpgrades + somaFlexivelUpgrades,
    economia.orcamentoTotalDeclarado,
    'Orçamento total de maximização diverge da soma das 10 árvores'
  );
  assert.equal(economia.orcamentoTotalDeclarado, 2330);

  // 2. Junção N1: Custos do Mastro do Foil no Vol. 05 batem com o Vol. 01 (45 / 80 / 120 Sucata)
  const upgradeMastro = economia.upgrades.find((u) => u.nome.includes('Mastro do Foil'));
  assert.ok(upgradeMastro, 'Upgrade do Mastro do Foil deve existir na Seção 5.6.A');
  assert.deepEqual(
    upgradeMastro.custosNiveis,
    custosMastroVol01,
    'Custos de upgrade do Mastro do Foil no Vol. 05 divergem do Vol. 01'
  );

  // 3. Junção N1: Teto de Energia dos Sistemas (28 barras) vs. Reator (6 iniciais no Vol. 08 + 12 compráveis = 18 da SSOT Vol. 06)
  const sistemasConsumidores = economia.upgrades.filter((u) => u.moeda !== 'FLEXIVEL');
  const somaBarrasSistemas = sistemasConsumidores.reduce((acc, u) => acc + u.barrasEnergiaMax, 0);
  assert.equal(somaBarrasSistemas, 28, 'Soma das barras máximas de sistemas ativos na Seção 5.6.A deve ser 28');

  const upgradeReator = economia.upgrades.find((u) => u.nome.includes('Coração Bio-Elétrico'));
  const tetoReatorSsot = Number(normalizarTexto(constantesSsot.REATOR_TETO_COMPRA.valorBruto).match(/(\d+)/)?.[1]);
  const barrasIniciaisVol08 = vol08.gameState.naveJogador.reator.barrasCompradas;
  assert.equal(upgradeReator.barrasEnergiaMax, tetoReatorSsot, 'Teto do Reator na Seção 5.6.A diverge da SSOT Vol. 06');
  assert.equal(
    barrasIniciaisVol08 + upgradeReator.custosNiveis.length,
    tetoReatorSsot,
    'Barras iniciais no Vol. 08 (6) + barras compráveis na Seção 5.6.A (12) devem fechar em 18 barras'
  );

  // 4. Junção N1: Loja (5.6.B) vs. Catálogo de Armas (5.1), Órgãos (5.2) e Tripulação (Vol. 01) + Regra de Venda de 50%
  const armasLoja = economia.itensLoja.filter((i) => i.categoria === 'ARMA');
  const orgaosLoja = economia.itensLoja.filter((i) => i.categoria === 'ORGAO');
  const tripulantesLoja = economia.itensLoja.filter((i) => i.categoria === 'TRIPULANTE');
  assert.equal(armasLoja.length, 7, 'Loja deve listar as 7 armas');
  assert.equal(orgaosLoja.length, 6, 'Loja deve listar os 6 órgãos');
  assert.equal(tripulantesLoja.length, 4, 'Loja deve listar as 4 espécies de tripulação');
  assert.equal(economia.limiteTripulacaoDeclarado, 6, 'Limite máximo de tripulação deve ser de 6 animais');

  armasLoja.forEach((item, idx) => {
    const armaCatalogo = catalogo.armas[idx];
    const nomeCatalogoLimpo = armaCatalogo.nome.replace(/^\d+\.\s*/, '');
    assert.equal(item.nome, nomeCatalogoLimpo, `Nome da arma ${idx + 1} na loja diverge do catálogo 5.1`);
    assert.equal(item.pesoKg, armaCatalogo.pesoKg, `Peso da arma ${item.nome} na loja diverge do catálogo 5.1`);
    assert.equal(item.moeda, 'SUCATA', `Arma ${item.nome} deve ser comprada com SUCATA`);
    assert.equal(
      item.valorVenda,
      Math.floor(item.precoCompra * 0.5),
      `Valor de venda da arma ${item.nome} (${item.valorVenda}) viola a regra de 50% de ${item.precoCompra}`
    );
  });

  orgaosLoja.forEach((item, idx) => {
    const orgaoCatalogo = catalogo.orgaos[idx];
    const nomeOrgaoLimpo = orgaoCatalogo.nome.replace(/:$/, '');
    assert.equal(item.nome, nomeOrgaoLimpo, `Nome do órgão ${idx + 1} na loja diverge do catálogo 5.2`);
    assert.equal(item.pesoKg, catalogo.pesoPorOrgaoKg, `Peso do órgão ${item.nome} na loja diverge de +5 kg`);
    assert.equal(item.moeda, 'BIOMASSA', `Órgão ${item.nome} deve ser comprado com BIOMASSA`);
    assert.equal(
      item.valorVenda,
      Math.floor(item.precoCompra * 0.5),
      `Valor de venda do órgão ${item.nome} (${item.valorVenda}) viola a regra de 50% de ${item.precoCompra}`
    );
  });

  assert.equal(tripulantesLoja.length, tripVol01.especies.length, 'Espécies na loja devem bater com o Vol. 01');
  for (const tLoja of tripulantesLoja) {
    assert.equal(tLoja.moeda, 'BIOMASSA', `Recrutamento de ${tLoja.nome} deve custar BIOMASSA`);
    assert.equal(tLoja.pesoKg, 0, `Tripulante ${tLoja.nome} não adiciona peso fora de P_chassi/P_agua`);
  }

  // 5. Junção N1: Curva Setorial (5.6.C) vs. Saque Setor 1 (Vol. 03) + Prova de Solvência vs. Escassez (Vol. 08)
  const s1 = economia.curvaSetores[0];
  assert.equal(
    s1.barcoBrutoSucata,
    saqueSetor1Vol03.barcoBrutoSucata,
    'Saque de Destruição Bruta no Setor 1 (Vol. 05) diverge da Lancha Patrulheira (Vol. 03)'
  );
  assert.equal(
    s1.barcoCapturaSucata,
    saqueSetor1Vol03.barcoCapturaSucata,
    'Saque de Captura Intacta no Setor 1 (Vol. 05) diverge da Lancha Patrulheira (Vol. 03)'
  );
  assert.equal(
    s1.monstroBrutoBiomassa,
    saqueSetor1Vol03.monstroBrutoBiomassa,
    'Saque de Dano Bruto no Setor 1 (Vol. 05) diverge da Teuthis Couraçada (Vol. 03)'
  );
  assert.equal(
    s1.monstroCirurgicoBiomassa,
    saqueSetor1Vol03.monstroCirurgicoBiomassa,
    'Saque de Extração Cirúrgica no Setor 1 (Vol. 05) diverge da Teuthis Couraçada (Vol. 03)'
  );

  for (const linhaSetor of economia.curvaSetores) {
    const s = linhaSetor.setor;
    assert.equal(linhaSetor.barcoBrutoSucata, 12 + 4 * (s - 1), `Fórmula de Sucata bruta violada no Setor ${s}`);
    assert.equal(linhaSetor.barcoCapturaSucata, 25 + 8 * (s - 1), `Fórmula de Sucata captura violada no Setor ${s}`);
    assert.equal(linhaSetor.monstroBrutoBiomassa, 15 + 4 * (s - 1), `Fórmula de Biomassa bruta violada no Setor ${s}`);
    assert.equal(linhaSetor.monstroCirurgicoBiomassa, 25 + 8 * (s - 1), `Fórmula de Biomassa cirúrgica violada no Setor ${s}`);
  }

  const reservaInicialVol08 = vol08.gameState.economia.sucata + vol08.gameState.economia.biomassa;
  assert.equal(reservaInicialVol08, 45, 'Reserva inicial no GameState (Vol. 08) deve somar 45 (30 Sucata + 15 Biomassa)');

  const setores1a7 = economia.curvaSetores.slice(0, 7);
  const pisoBrutoCalculado =
    reservaInicialVol08 +
    setores1a7.reduce((acc, s) => acc + 4 * s.barcoBrutoSucata + 4 * s.monstroBrutoBiomassa, 0);
  const tetoMaestriaCalculado =
    reservaInicialVol08 +
    setores1a7.reduce((acc, s) => acc + 4 * s.barcoCapturaSucata + 4 * s.monstroCirurgicoBiomassa, 0);

  assert.equal(pisoBrutoCalculado, 1473);
  assert.equal(pisoBrutoCalculado, economia.pisoBruto1a7Declarado, 'Piso de Solvência declarado diverge do cálculo 1..7');
  assert.equal(tetoMaestriaCalculado, 2789);
  assert.equal(tetoMaestriaCalculado, economia.tetoMaestria1a7Declarado, 'Teto de Maestria declarado diverge do cálculo 1..7');
  assert.ok(
    pisoBrutoCalculado < economia.orcamentoTotalDeclarado && economia.orcamentoTotalDeclarado < tetoMaestriaCalculado,
    'Curva econômica deve manter 1473 (piso bruto) < 2330 (maximização total) < 2789 (teto bruto de maestria antes de insumos)'
  );
});

test('Junção N1 + L4 + N4: audita as 3 Fases da Draga Continental (5.5) e o Bestiário Escalado Setores 1..7 (5.7) contra Vols. 01, 03, 06 e 08', () => {
  const cadeia = carregarCadeiaCanonicaGdd(DIRETORIO_RAIZ);
  const vol01 = cadeia.volumes[0].conteudo;
  const vol03 = cadeia.volumes[2].conteudo;
  const vol05 = cadeia.volumes[4].conteudo;
  const vol06 = cadeia.volumes[5].conteudo;
  const vol08 = extrairContratoEstadoVolume08(cadeia.volumes[7].conteudo);

  const catalogo = extrairCatalogoVolume05(vol05);
  const chefeBestiario = extrairChefeEBestiarioVolume05(vol05);
  const inimigosS1Vol03 = extrairInimigosSetor1Volume03(vol03);
  const tripVol01 = extrairTripulacaoVolume01(vol01);
  const { celulasMatriz } = extrairSsotEMatrizDoVolume06(vol06);

  console.log(
    `[N4] Chefe e Bestiário Vol. 05 examinados: ${chefeBestiario.fasesResumo.length} fases da Draga Continental, ${chefeBestiario.templatesInimigos.length} arquétipos de inimigos, ${chefeBestiario.escalamentoSetores.length} setores escalados`
  );

  // 1. Auditoria estrutural e numérica das 3 Fases da Draga Continental (Seção 5.5)
  assert.equal(chefeBestiario.fasesResumo.length, 3, 'Tabela 5.5 deve especificar exatamente as 3 fases da Draga Continental');
  const gabaritoFases = [
    { fase: 1, hpCasco: 20, blindagemTermicaPts: 0, bolhasBarreira: 3, barrasBarreira: 6, esquivaPct: 20, salasTotais: 6, salasSuperiores: 4, salasSubmersas: 2, intervaloSurgeSeg: 22 },
    { fase: 2, hpCasco: 22, blindagemTermicaPts: 0, bolhasBarreira: 3, barrasBarreira: 6, esquivaPct: 25, salasTotais: 6, salasSuperiores: 3, salasSubmersas: 3, intervaloSurgeSeg: 20 },
    { fase: 3, hpCasco: 24, blindagemTermicaPts: 10, bolhasBarreira: 4, barrasBarreira: 8, esquivaPct: 30, salasTotais: 5, salasSuperiores: 3, salasSubmersas: 2, intervaloSurgeSeg: 18 },
  ];

  for (let i = 0; i < 3; i += 1) {
    const f = chefeBestiario.fasesResumo[i];
    const esp = gabaritoFases[i];
    assert.equal(f.fase, esp.fase);
    assert.equal(f.hpCasco, esp.hpCasco, `HP de casco da Fase ${f.fase} diverge do canônico`);
    assert.equal(f.blindagemTermicaPts, esp.blindagemTermicaPts, `Blindagem Térmica da Fase ${f.fase} diverge do canônico`);
    assert.equal(f.bolhasBarreira, esp.bolhasBarreira, `Bolhas de Barreira da Fase ${f.fase} divergem do canônico`);
    assert.equal(f.barrasBarreira, esp.barrasBarreira, `Barras de Barreira da Fase ${f.fase} divergem de 2x bolhas`);
    assert.equal(f.esquivaPct, esp.esquivaPct, `Esquiva base da Fase ${f.fase} diverge do canônico`);
    assert.equal(f.salasTotais, esp.salasTotais, `Total de salas da Fase ${f.fase} diverge do canônico`);
    assert.equal(f.salasSuperiores + f.salasSubmersas, f.salasTotais, `Soma Sup+Sub da Fase ${f.fase} não fecha`);
    assert.equal(f.intervaloSurgeSeg, esp.intervaloSurgeSeg, `Intervalo de Power Surge da Fase ${f.fase} diverge do canônico`);

    const salasDetalhadas = chefeBestiario.salasPorFase[f.fase];
    assert.equal(salasDetalhadas.length, f.salasTotais, `Lista detalhada de salas da Fase ${f.fase} diverge da tabela resumo`);
    assert.equal(
      salasDetalhadas.filter((s) => s.convSuperior).length,
      f.salasSuperiores,
      `Contagem de salas do Convés Superior na Fase ${f.fase} diverge da tabela resumo`
    );
    assert.equal(
      salasDetalhadas.filter((s) => s.abaixoLinhaDagua).length,
      f.salasSubmersas,
      `Contagem de salas Abaixo da Linha d'Água na Fase ${f.fase} diverge da tabela resumo`
    );
    const salaEscudo = salasDetalhadas.find((s) => s.nomeSala.includes('Gerador de Escudo'));
    assert.ok(salaEscudo, `Fase ${f.fase} deve ter sala do Gerador de Escudo`);
    assert.equal(salaEscudo.barras, f.barrasBarreira, `Barras do Gerador de Escudo na Fase ${f.fase} divergem da tabela resumo`);
  }

  const somaHpFases = chefeBestiario.fasesResumo.reduce((acc, f) => acc + f.hpCasco, 0);
  const somaIntegridadeTotal = somaHpFases + chefeBestiario.fasesResumo[2].blindagemTermicaPts;
  assert.equal(somaHpFases, 66);
  assert.equal(chefeBestiario.hpTotalDeclarado, somaHpFases, 'HP total das 3 fases declarado diverge da soma 20+22+24');
  assert.equal(somaIntegridadeTotal, 76);
  assert.equal(
    chefeBestiario.integridadeTotalDeclarada,
    somaIntegridadeTotal,
    'Integridade estrutural total declarada (casco + blindagem térmica) diverge de 76 pontos'
  );

  // 2. Junção N1: Tripulação da Draga Continental vs. Vol. 01 + Power Surges vs. Matriz 6.2 (Vol. 06)
  assert.equal(
    chefeBestiario.marinheirosIniciais + chefeBestiario.mergulhadoresIniciais,
    chefeBestiario.humanosIniciaisFase1,
    'Soma de Marinheiros (4) + Mergulhadores (2) na Fase 1 deve fechar em 6 humanos'
  );
  assert.equal(chefeBestiario.humanosIniciaisFase1, 6);
  assert.equal(chefeBestiario.marinheiroHp, 100);
  assert.equal(chefeBestiario.marinheiroDps, 8, 'DPS do Marinheiro na Draga Continental diverge do Vol. 01 (8 DPS)');
  assert.equal(chefeBestiario.mergulhadorHp, 100);
  assert.equal(
    chefeBestiario.mergulhadorDps,
    tripVol01.mergulhadorDps,
    'DPS do Mergulhador de Assalto na Draga Continental diverge do Vol. 01 (12 DPS)'
  );
  assert.equal(chefeBestiario.iaBackupAutoReparoSeg, 15, 'Auto-reparo da IA de Backup deve ser de 1 barra a cada 15s');

  const celula1H = normalizarTexto(
    celulasMatriz.find((c) => c.evento.startsWith('H. Perigos') && c.estado === '1_NO_FOIL')?.regra ?? ''
  );
  const celula2H = normalizarTexto(
    celulasMatriz.find((c) => c.evento.startsWith('H. Perigos') && c.estado === '2_TOUCHDOWN')?.regra ?? ''
  );
  const celula3H = normalizarTexto(
    celulasMatriz.find((c) => c.evento.startsWith('H. Perigos') && c.estado === '3_SPOOL_UP')?.regra ?? ''
  );
  assert.ok(
    celula1H.includes(`+${chefeBestiario.surgeFase1PesoVirtualKg} kg por ${chefeBestiario.surgeFase1DuracaoSeg}s na Fase 1`),
    'Onda de Arrasto da Fase 1 no Vol. 05 diverge da Célula 1H da Matriz 6.2 (Vol. 06)'
  );
  assert.equal(chefeBestiario.surgeFase2DronesAereos + chefeBestiario.surgeFase2DronesSubaquaticos, chefeBestiario.surgeFase2TotalDrones);
  assert.equal(chefeBestiario.surgeFase2TotalDrones, 4, 'Power Surge da Fase 2 deve lançar exatamente 4 drones (2 aéreos + 2 subaquáticos)');
  assert.equal(chefeBestiario.surgeFase3LasersCount, 7, 'Power Surge da Fase 3 deve disparar 7 Lasers Industriais');
  assert.equal(chefeBestiario.surgeFase3LaserDano, 1, 'Cada Laser Industrial da Fase 3 deve causar 1 de dano');
  assert.ok(
    celula2H.includes(`-${chefeBestiario.surgeFase3DanoCascoPorSeg} HP casco/s e -${chefeBestiario.surgeFase3DanoTripulacaoPorSeg} HP/s tripulação`),
    'Dano da Fervura Oceânica da Fase 3 no Vol. 05 diverge da Célula 2H da Matriz 6.2 (Vol. 06)'
  );
  assert.ok(
    celula3H.includes(`${chefeBestiario.surgeFase3AlarmeFervuraSeg}.0s antes`),
    'Alarme da Fervura Oceânica da Fase 3 no Vol. 05 diverge da Célula 3H da Matriz 6.2 (Vol. 06)'
  );
  assert.equal(
    chefeBestiario.surgeFase3DuracaoFervuraSeg * chefeBestiario.surgeFase3DanoCascoPorSeg,
    chefeBestiario.surgeFase3DanoCascoMax,
    'Dano máximo de casco da Fervura Oceânica deve fechar em duração (5s) x 1 HP/s = 5 HP'
  );

  // 3. Auditoria dos 8 Arquétipos do Bestiário (5.7.A) e Curva de Escalamento Setores 1..7 (5.7.B) contra Vol. 03 e Vol. 08
  assert.equal(chefeBestiario.templatesInimigos.length, 8, 'Seção 5.7.A deve definir exatamente 8 arquétipos de inimigos');
  const barcosTemplates = chefeBestiario.templatesInimigos.filter((t) => t.classe === 'BARCO_HUMANO');
  const monstrosTemplates = chefeBestiario.templatesInimigos.filter((t) => t.classe === 'MONSTRO_BIOLOGICO');
  assert.equal(barcosTemplates.length, 4, 'Bestiário deve ter exatamente 4 templates de Barcos Corporativos');
  assert.equal(monstrosTemplates.length, 4, 'Bestiário deve ter exatamente 4 templates de Monstros Colossais');
  for (const m of monstrosTemplates) {
    assert.equal(m.numSalasOuOrgaos, 4, `Monstro ${m.nome} deve ter exatamente 4 órgãos mapeados pelo Sonar`);
  }

  assert.equal(chefeBestiario.escalamentoSetores.length, 7, 'Seção 5.7.B deve definir o escalamento dos Setores 1 a 7');
  const escS1 = chefeBestiario.escalamentoSetores[0];
  assert.equal(
    escS1.barcoHp,
    inimigosS1Vol03.lancha.hpCasco,
    'HP de barco no Setor 1 (Seção 5.7.B) diverge da Lancha Patrulheira (Vol. 03)'
  );
  assert.equal(
    escS1.barcoHp,
    vol08.gameState.alvoCombate.hpCascoMax,
    'HP de barco no Setor 1 (Seção 5.7.B) diverge do alvoCombate inicial no GameState (Vol. 08)'
  );
  assert.equal(
    escS1.barcoBarreiraBolhas,
    inimigosS1Vol03.lancha.barreiraBolhas,
    'Barreira de barco no Setor 1 (Seção 5.7.B) diverge da Lancha Patrulheira (Vol. 03)'
  );
  assert.equal(
    escS1.barcoEsquivaPct,
    inimigosS1Vol03.lancha.esquivaPct,
    'Esquiva de barco no Setor 1 (Seção 5.7.B) diverge da Lancha Patrulheira (Vol. 03)'
  );
  assert.equal(
    escS1.tripulacaoHumana,
    inimigosS1Vol03.lancha.marinheiros,
    'Tripulação humana no Setor 1 (Seção 5.7.B) diverge da Lancha Patrulheira (Vol. 03)'
  );
  assert.equal(
    escS1.monstroHp,
    inimigosS1Vol03.teuthis.hpCorpo,
    'HP de monstro no Setor 1 (Seção 5.7.B) diverge da Teuthis Couraçada (Vol. 03)'
  );
  assert.equal(
    escS1.monstroEsquivaPct,
    inimigosS1Vol03.teuthis.esquivaPct,
    'Esquiva de monstro no Setor 1 (Seção 5.7.B) diverge da Teuthis Couraçada (Vol. 03)'
  );
  assert.equal(
    escS1.ganglioBarras,
    inimigosS1Vol03.teuthis.ganglioBarras,
    'Barras do Gânglio no Setor 1 (Seção 5.7.B) diverge da Teuthis Couraçada (Vol. 03)'
  );

  for (const linha of chefeBestiario.escalamentoSetores) {
    const s = linha.setor;
    assert.equal(linha.barcoHp, 8 + 2 * (s - 1), `Fórmula de HP de barco violada no Setor ${s}`);
    assert.equal(linha.barcoBarreiraBolhas, Math.floor(s / 2), `Fórmula de Barreira de barco violada no Setor ${s}`);
    assert.equal(linha.barcoEsquivaPct, 15 + 2 * (s - 1), `Fórmula de Esquiva de barco violada no Setor ${s}`);
    assert.equal(linha.monstroHp, 10 + 3 * (s - 1), `Fórmula de HP de monstro violada no Setor ${s}`);
    assert.equal(linha.monstroEsquivaPct, 20 + 2 * (s - 1), `Fórmula de Esquiva de monstro violada no Setor ${s}`);
    assert.equal(linha.orcamentoArmasBarras, 2 + (s - 1), `Fórmula de Orçamento de Armas violada no Setor ${s}`);
    assert.equal(linha.tripulacaoHumana, 2 + Math.floor((s - 1) / 2), `Fórmula de Tripulação Humana violada no Setor ${s}`);
    assert.equal(linha.ganglioBarras, 3 + Math.floor((s - 1) / 2), `Fórmula de Barras do Gânglio violada no Setor ${s}`);
  }

  // 4. Prova Matemática de TTK na Fase 3 (Falha Global Encontrada 7 recalculada pelo motor)
  const chassiRajada2 = catalogo.armas.find((a) => a.nome.includes('Rajada Hidropneumática II'));
  const chassiCortador = catalogo.armas.find((a) => a.nome.includes('Cortador Térmico a Plasma'));
  const recargaRajadaPolvo = calcularTempoRecargaArma({
    tempoChassiSeg: chassiRajada2.recargaSeg,
    reducaoOperador: 0.2,
  });
  const recargaCortadorPolvo = calcularTempoRecargaArma({
    tempoChassiSeg: chassiCortador.recargaSeg,
    reducaoOperador: 0.2,
  });
  assert.equal(recargaRajadaPolvo, 9.6);
  assert.equal(recargaCortadorPolvo, 11.2);

  const fase3 = chefeBestiario.fasesResumo[2];
  const salvasParaQuebrarBlindagemTermica = 2;
  const danoCascoCortadorPorSalva = 6;
  const salvasPosBlindagem = fase3.hpCasco / danoCascoCortadorPorSalva;
  const ttkFase3Calculado =
    Math.round((salvasParaQuebrarBlindagemTermica + salvasPosBlindagem) * recargaCortadorPolvo * 10) / 10;
  const ciclosSurgeFase3Calculados = Math.floor(ttkFase3Calculado / fase3.intervaloSurgeSeg);

  assert.equal(ttkFase3Calculado, 67.2);
  assert.equal(
    chefeBestiario.ttkFase3SegDeclarado,
    ttkFase3Calculado,
    'TTK canônico da Fase 3 declarado na Falha Global 7 diverge do cálculo do motor (67.2s)'
  );
  assert.equal(ciclosSurgeFase3Calculados, 3);
  assert.equal(
    chefeBestiario.ciclosSurgeFase3Declarados,
    ciclosSurgeFase3Calculados,
    'Ciclos de Power Surge da Fase 3 declarados na Falha Global 7 divergem de floor(67.2 / 18) = 3'
  );
});

test('Junção N1 + L4 + N4: audita Topologia 2x4 + Duto 5<->6 (1.6.A), Lotação/Foco Corpo-a-Corpo (1.6.B) e Geometria do Beam (1.6.C) contra Vols. 02, 03, 05, 06 e 08', () => {
  const cadeia = carregarCadeiaCanonicaGdd(DIRETORIO_RAIZ);
  const vol01 = cadeia.volumes[0].conteudo;
  const vol02 = cadeia.volumes[1].conteudo;
  const vol03 = normalizarTexto(cadeia.volumes[2].conteudo);
  const vol05 = cadeia.volumes[4].conteudo;
  const vol08 = extrairContratoEstadoVolume08(cadeia.volumes[7].conteudo);

  const topologia = extrairTopologiaOcupacaoBeamVolume01(vol01);
  const tripVol01 = extrairTripulacaoVolume01(vol01);

  console.log(
    `[N4] Topologia Vol. 01 examinada: ${topologia.camaras.length} câmaras, ${topologia.conexoesBidirecionaisDeclaradas} conexões bidirecionais, lotação máx=${topologia.lotacaoTotalSala}, Beam=${topologia.beamMaxSalas} salas`
  );

  // 1. Auditoria do Grafo 2x4 + Duto Hidráulico Ventral (5<->6) contra o GameState (Vol. 08) e a Simulação (Vol. 03)
  assert.equal(topologia.camaras.length, 8, 'Seção 1.6.A deve listar exatamente as 8 câmaras da bio-nave');
  const camarasVol08 = vol08.gameState.naveJogador.camaras;
  assert.equal(camarasVol08.length, 8);

  let somaGrausCalculada = 0;
  for (let i = 0; i < 8; i += 1) {
    const cTopo = topologia.camaras[i];
    const cState = camarasVol08[i];
    assert.equal(cTopo.id, cState.id, `ID da câmara ${i + 1} na Seção 1.6.A diverge do GameState (Vol. 08)`);
    assert.equal(cTopo.nome, cState.nome, `Nome da câmara ${cTopo.id} na Seção 1.6.A diverge do GameState (Vol. 08)`);
    assert.ok(cTopo.coluna === 0 || cTopo.coluna === 1, `Coluna inválida na câmara ${cTopo.id}`);
    assert.ok(cTopo.andar >= 0 && cTopo.andar <= 3, `Andar inválido na câmara ${cTopo.id}`);
    assert.equal(
      cTopo.vizinhos.length,
      cTopo.grauDeclarado,
      `Grau declarado da câmara ${cTopo.id} (${cTopo.grauDeclarado}) diverge da lista de vizinhos (${cTopo.vizinhos.length})`
    );
    somaGrausCalculada += cTopo.vizinhos.length;

    // Simetria bidirecional: u vizinho de v <=> v vizinho de u
    for (const v of cTopo.vizinhos) {
      const vizCamara = topologia.camaras.find((x) => x.id === v);
      assert.ok(vizCamara, `Vizinho ${v} da câmara ${cTopo.id} não existe`);
      assert.ok(
        vizCamara.vizinhos.includes(cTopo.id),
        `Grafo de câmaras assimétrico: ${cTopo.id} lista ${v}, mas ${v} não lista ${cTopo.id}`
      );
    }
  }

  assert.equal(somaGrausCalculada, 22, 'Soma dos graus das 8 câmaras deve ser 22 (11 conexões bidirecionais)');
  assert.equal(topologia.somaGrausDeclarada, somaGrausCalculada, 'Soma dos graus declarada na Seção 1.6.A diverge de 22');
  assert.equal(
    topologia.conexoesBidirecionaisDeclaradas,
    somaGrausCalculada / 2,
    'Total de conexões bidirecionais declarado diverge de 11'
  );

  // Verifica desempate determinístico de rota (2 -> 4 -> 5 em 2 saltos) e o Duto Hidráulico (5 -> 6 em 1 salto) contra o Vol. 02 e Vol. 03
  const rotaCortexSifao = calcularRotaMinimaCamaras(topologia.camaras, 2, 5);
  assert.equal(rotaCortexSifao.saltos, 2, 'Distância Córtex (2) -> Sifão (5) deve ser de 2 saltos');
  assert.deepEqual(
    rotaCortexSifao.rota,
    [2, 4, 5],
    'Regra de desempate (vertical na mesma coluna antes de horizontal) deve escolher [2, 4, 5]'
  );
  assert.deepEqual(rotaCortexSifao.todasRotasMinimas, [
    [2, 4, 5],
    [2, 3, 5],
  ]);
  assert.ok(
    vol03.includes(`atravessando ${rotaCortexSifao.saltos} salas (${rotaCortexSifao.saltos} x 1.25s = 2.5s`),
    'Vol. 03 deve concordar com os 2 saltos da rota Córtex -> Sifão'
  );

  const rotaSifaoPoco = calcularRotaMinimaCamaras(topologia.camaras, 5, 6);
  assert.equal(rotaSifaoPoco.saltos, 1, 'Duto Hidráulico Ventral (5 <-> 6) deve ligar Sifão (5) ao Poço da Quilha (6) em 1 salto');
  assert.deepEqual(rotaSifaoPoco.rota, [5, 6]);
  assert.ok(
    vol02.includes('| [6. POÇO DA QUILHA]   | [8. ENXERTO B]   |'),
    'Wireframe Vol. 02 deve posicionar o Poço da Quilha (6) sob a junção ventral com o Sifão (5)'
  );
  assert.ok(
    vol03.includes('nada do Sifão até o Poço da Quilha adjacente (1.25s'),
    'Vol. 03 deve concordar com 1 salto (1.25s) entre Sifão (5) e Poço da Quilha (6)'
  );

  // 2. Auditoria de Lotação (2 aliados + 2 inimigos = 4) e Foco Corpo-a-Corpo sem divisão de DPS (Seção 1.6.B vs. Limite Extremo 3 do Vol. 06)
  assert.equal(topologia.lotacaoMaxAliados, 2, 'Limite de aliados estacionados por câmara deve ser 2');
  assert.equal(topologia.lotacaoMaxInimigos, 2, 'Limite de inimigos estacionados por câmara deve ser 2');
  assert.equal(
    topologia.lotacaoMaxAliados + topologia.lotacaoMaxInimigos,
    topologia.lotacaoTotalSala,
    'Capacidade máxima da sala deve ser 2 aliados + 2 inimigos = 4 unidades'
  );
  assert.equal(topologia.lotacaoTotalSala, 4);
  assert.equal(topologia.focoSemDivisaoDps, true, 'Seção 1.6.B deve travar Foco Integral no Slot 1 sem divisão de DPS');
  assert.equal(topologia.reflexaoBaiacuPct, 50, 'Reflexão de espinhos do Baiacu inflado deve ser de 50%');

  const baiacuSpec = tripVol01.especies.find((e) => e.especie === 'BAIACU');
  const polvoSpec = tripVol01.especies.find((e) => e.especie === 'POLVO');
  const resultadoCombateSala = resolverTickCombateCorpoACorpoSala({
    aliados: [
      { id: 'baiacu-1', hpAtual: baiacuSpec.hpMax, dps: baiacuSpec.dps, inflado: true, acopladoBulbo: true },
      { id: 'polvo-1', hpAtual: polvoSpec.hpMax, dps: polvoSpec.dps, inflado: false, acopladoBulbo: false },
    ],
    inimigos: [
      { id: 'merg-1', hpAtual: 100, dps: tripVol01.mergulhadorDps },
      { id: 'merg-2', hpAtual: 100, dps: tripVol01.mergulhadorDps },
    ],
    dtSeg: 1.0,
  });

  // Ambos os aliados pausam acoplamento ao Bulbo durante combate na sala
  assert.equal(resultadoCombateSala.aliados[0].acopladoBulbo, false);
  // Slot 1 aliado (Baiacu 150 HP) recebe 100% do DPS dos 2 Mergulhadores (2 x 12 = 24 HP -> 126 HP); Slot 2 aliado (Polvo 80 HP) recebe 0 dano!
  assert.equal(resultadoCombateSala.aliados[0].hpAtual, 150 - 2 * tripVol01.mergulhadorDps);
  assert.equal(resultadoCombateSala.aliados[1].hpAtual, 80);
  // Slot 1 inimigo recebe 100% do DPS de Baiacu+Polvo (14 + 5 = 19) + 50% de reflexão do próprio DPS (6) = 25 dano -> 75 HP!
  assert.equal(resultadoCombateSala.inimigos[0].hpAtual, 100 - (baiacuSpec.dps + polvoSpec.dps) - 0.5 * tripVol01.mergulhadorDps);
  // Slot 2 inimigo recebe 0 de foco corpo-a-corpo, mas sofre os 50% de reflexão dos espinhos do Baiacu ao atacá-lo (6 dano -> 94 HP)!
  assert.equal(resultadoCombateSala.inimigos[1].hpAtual, 100 - 0.5 * tripVol01.mergulhadorDps);

  assert.throws(
    () =>
      resolverTickCombateCorpoACorpoSala({
        aliados: [{ id: '1', hpAtual: 80, dps: 5 }, { id: '2', hpAtual: 80, dps: 5 }, { id: '3', hpAtual: 80, dps: 5 }],
        inimigos: [],
      }),
    /\[Seção 1\.6\.B Stacking Limit\]/,
    'Exceder 2 aliados estacionados na mesma câmara deve lançar erro de Stacking Limit'
  );

  // 3. Auditoria da Geometria do Cortador Térmico a Plasma (Beam — Seção 1.6.C vs. Vol. 05)
  assert.equal(topologia.beamMaxSalas, 3, 'Cortador Térmico deve cortar exatamente até 3 salas adjacentes');
  assert.equal(topologia.beamDanoPorSala, 2, 'Cortador Térmico deve causar 2 de dano por sala');
  assert.equal(
    topologia.beamMaxSalas * topologia.beamDanoPorSala,
    topologia.beamDanoTotal,
    'Dano total do Cortador Térmico sem escudo deve ser 3 x 2 = 6'
  );
  assert.equal(topologia.beamProibeRepetirSala, true, 'Seção 1.6.C deve proibir repetir sala (vai-e-volta S1->S2->S1)');
  assert.ok(
    normalizarTexto(vol05).includes('corta 3 salas adjacentes (2 dano por sala'),
    'Catálogo 5.1 (Vol. 05) deve concordar com 3 salas adjacentes e 2 de dano por sala'
  );

  // Grafo ortogonal puro 2x4 da bio-nave (10 conexões ortogonais: |colA - colB| + |andarA - andarB| === 1)
  const grafoOrtogonalBioNave = {};
  for (const a of topologia.camaras) {
    grafoOrtogonalBioNave[a.id] = topologia.camaras
      .filter((b) => Math.abs(a.coluna - b.coluna) + Math.abs(a.andar - b.andar) === 1)
      .map((b) => b.id);
  }
  const tracadosBioNave = enumerarTracadosBeamValidos(grafoOrtogonalBioNave);
  assert.equal(tracadosBioNave.length, 32, 'Grade ortogonal 2x4 (4 cantos grau 2 + 4 internos grau 3) deve admitir exatamente 32 trincas ordenadas simples de Beam');
  assert.equal(validarTracadoBeamOrtogonal(grafoOrtogonalBioNave, [1, 2, 4]), true);
  assert.equal(validarTracadoBeamOrtogonal(grafoOrtogonalBioNave, [1, 7, 3]), true);
  assert.equal(validarTracadoBeamOrtogonal(grafoOrtogonalBioNave, [1, 2, 1]), false, 'Vai-e-volta [1, 2, 1] deve ser rejeitado');
  assert.equal(validarTracadoBeamOrtogonal(grafoOrtogonalBioNave, [1, 4, 6]), false, 'Salto não adjacente [1, 4, 6] deve ser rejeitado');

  // Grafo 2x2 de Barco Humano (Lancha Patrulheira: 4 salas em ciclo ortogonal)
  const grafoBarco2x2 = {
    CABINE: ['TORRETA', 'MOTOR_SUB'],
    TORRETA: ['CABINE', 'TORP_SUB'],
    MOTOR_SUB: ['CABINE', 'TORP_SUB'],
    TORP_SUB: ['TORRETA', 'MOTOR_SUB'],
  };
  const tracadosBarco2x2 = enumerarTracadosBeamValidos(grafoBarco2x2);
  assert.equal(tracadosBarco2x2.length, 8, 'Barco 2x2 (4 salas) deve admitir exatamente 8 traçados em L de 3 salas distintas');
  assert.equal(validarTracadoBeamOrtogonal(grafoBarco2x2, ['CABINE', 'TORRETA', 'TORP_SUB']), true);
  assert.equal(validarTracadoBeamOrtogonal(grafoBarco2x2, ['CABINE', 'TORRETA', 'CABINE']), false);

  // Grafo 1x4 de Monstro Colossal (4 órgãos em coluna linear no Sonar)
  const grafoMonstro1x4 = {
    1: [2],
    2: [1, 3],
    3: [2, 4],
    4: [3],
  };
  const tracadosMonstro1x4 = enumerarTracadosBeamValidos(grafoMonstro1x4);
  assert.equal(tracadosMonstro1x4.length, 4, 'Monstro de 4 órgãos em coluna deve admitir exatamente 4 traçados de 3 órgãos consecutivos');
  assert.deepEqual(tracadosMonstro1x4, [
    [1, 2, 3],
    [2, 3, 4],
    [3, 2, 1],
    [4, 3, 2],
  ]);
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
