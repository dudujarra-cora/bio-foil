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
} from '../src/gdd-parser.mjs';

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
  assert.equal(chaveValida.valor.valorBruto, '$30\\text{ HP}$');
});

test('Junção N1 + L4 + N4: cruza Tabela SSOT (26 constantes) e Matriz 5x8 (40 células) do Vol. 06 com Vols. 01..05', () => {
  const cadeia = carregarCadeiaCanonicaGdd(DIRETORIO_RAIZ);
  const vol01 = cadeia.volumes[0].conteudo;
  const vol02 = cadeia.volumes[1].conteudo;
  const vol03 = cadeia.volumes[2].conteudo;
  const vol04 = cadeia.volumes[3].conteudo;
  const vol05 = cadeia.volumes[4].conteudo;
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

  // L4: Asserções contra os valores literais reais de TODAS as 26 constantes da SSOT (0 falsos verdes!)
  const gabaritoLiteralSsot = {
    HP_CASCO_BASE: '$30\\text{ HP}$',
    PESO_CHASSI_BASE: '$100\\text{ kg}$',
    NUM_CAMARAS_NAVE: '$8\\text{ câmaras}$',
    CAP_AGUA_CAMARA: '$12.5\\text{ kg}$',
    RESERVA_MIN_SIFAO: '$62.5\\text{ kg}$',
    PENALIDADE_CAVITACAO: '$-2.0\\text{ kg}$',
    SLOTS_ARMAS_ATIVAS: '$4\\text{ slots}$',
    SLOTS_PORAO_CARGA: '$4\\text{ slots}$',
    PESO_ORGAO_ENXERTO: '$+5.0\\text{ kg}$',
    PESO_SUBSISTEMA: '$0.0\\text{ kg}$',
    PESO_BLINDAGEM_NV: '$+15.0\\text{ kg}$',
    MASTRO_FOIL_CURVA: '$200 / 240 / 280 / 330\\text{ kg}$',
    SIFAO_EMP_POR_BARRA: '$+30.0\\text{ kg}$',
    SUSTENTACAO_MAX_ABS: '$480.0\\text{ kg}$',
    TEMPO_SPOOL_UP: '$3.0\\text{ s}$',
    TAXA_FURO_AR: '$-1.0\\text{ kg/s}$',
    TAXA_VALVULA_AR: '$-2.5\\text{ kg/s}$',
    TAXA_FURO_MAR: '$+5.0\\text{ kg/s}$',
    TAXA_RECARGA_MAR: '$+5.0\\text{ kg/s}$',
    TAXA_CAPILAR_AR: '$+1.25\\text{ kg/s}$',
    TAXA_DRENO_PESADO: '$-4.0\\text{ kg/s}$',
    TEMPO_NADO_SALA: '$1.5\\text{ s}$',
    TEMPO_REPARO_SIST: '$12.0\\text{ s}$',
    TEMPO_REPARO_FURO: '$8.0\\text{ s}$',
    DANO_ANTIPESSOAL: '$15\\text{ HP}$',
    REATOR_TETO_COMPRA: '$18\\text{ barras}$',
  };
  let constantesVerificadasLiteralmente = 0;
  for (const [idConstante, valorLiteralEsperado] of Object.entries(gabaritoLiteralSsot)) {
    assert.ok(constantesSsot[idConstante], `Constante ${idConstante} ausente da SSOT`);
    assert.equal(
      constantesSsot[idConstante].valorBruto,
      valorLiteralEsperado,
      `Valor de ${idConstante} divergiu do literal canônico`
    );
    constantesVerificadasLiteralmente += 1;
  }
  assert.equal(constantesVerificadasLiteralmente, 26, 'Todas as 26 constantes da SSOT devem ter asserção literal');

  // Cruzamento N1 com Volume 01, 02, 03 e 04
  assert.match(vol01, /4\\text\{ Slots de Armas Ativas\}/, 'Vol. 01 deve declarar 4 Slots de Armas Ativas');
  assert.match(vol01, /8 \\times 12\.5\\text\{ kg\} = \\mathbf\{100\\text\{ kg\}\}/, 'Vol. 01 deve manter 8 x 12.5 kg = 100 kg');
  assert.match(vol02, /\[ARMAS: 4 SLOTS \(3 BARRAS\)\]/, 'Vol. 02 Wireframe deve exibir 4 SLOTS de armas');
  assert.match(vol02, /\[3: VAZIO\]\s+\[4: VAZIO\]/, 'Vol. 02 Wireframe deve listar os slots 3 e 4 vazios na nave inicial');

  // Verifica no Wireframe (Vol. 02) que [CABINE] e [TORRETA] estão acima da LINHA D'ÁGUA e [MOTOR SUB] / [TORP. SUB] abaixo
  const partesLinhaDaguaVol02 = vol02.split("LINHA D'ÁGUA");
  assert.equal(partesLinhaDaguaVol02.length, 2, 'Wireframe Vol. 02 deve conter a divisória LINHA D\'ÁGUA');
  assert.match(partesLinhaDaguaVol02[0], /\[CABINE\]/, '[CABINE] deve estar acima da linha d\'água no Vol. 02');
  assert.match(partesLinhaDaguaVol02[0], /\[TORRETA\]/, '[TORRETA] deve estar acima da linha d\'água no Vol. 02');
  assert.match(partesLinhaDaguaVol02[1], /\[MOTOR SUB\]/, '[MOTOR SUB] deve estar abaixo da linha d\'água no Vol. 02');
  assert.match(partesLinhaDaguaVol02[1], /\[TORP\. SUB\]/, '[TORP. SUB] deve estar abaixo da linha d\'água no Vol. 02');

  assert.match(vol03, /4 Slots de Armas Ativas/, 'Vol. 03 deve declarar 4 Slots de Armas Ativas na ficha da Carcaça Alfa');
  assert.match(vol04, /\\min\\left\(15\.0,\\; V_\{\\text\{base\}\} \\times \\left\(\\frac\{S_\{\\text\{máx\}\}\}\{P_\{\\text\{total\}\}\}\\right\)\\right\)/, 'Vol. 04 deve conter a equação de velocidade com teto 15.0 MN/h');

  // Verifica célula crítica 5A (Touchdown + Tinta Furtiva) e 3H (Spool-up + Fervura Oceânica)
  const celula5A = celulasMatriz.find(
    (c) => c.evento.startsWith('A. Esquiva') && c.estado === '5_FURTIVO_AGUA'
  );
  assert.ok(celula5A, 'Célula 5A deve existir na Matriz');
  assert.match(celula5A.regra, /\$0\\%\$ para projéteis já em voo/);
  assert.match(celula5A.regra, /congela \$100\\%\$ o carregamento de mira inimiga/);

  const celula3H = celulasMatriz.find(
    (c) => c.evento.startsWith('H. Perigos') && c.estado === '3_SPOOL_UP'
  );
  assert.ok(celula3H, 'Célula 3H deve existir na Matriz');
  assert.match(celula3H.regra, /\$4\.0\\text\{s\}\$ antes/);
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
  assert.equal(pesoManta, 195);
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
  console.log(`[N4] Marcos temporais da Simulação Vol. 03 examinados: ${simVol03.timestampsUnicos.length}`);
  assert.deepEqual(
    simVol03.timestampsUnicos,
    [0, 9, 10, 11, 11.7, 12.5, 13, 13.5, 15, 16.75, 18.5, 19.75, 20.625, 22.5, 23.5, 23.75, 29.75, 30.25, 32.75],
    'Todos os 19 marcos de tempo (t=0.0s a t=32.75s) da Simulação do Passo 3 devem fechar exatamente'
  );
  assert.equal(simVol03.possuiDanoBaiacu85Hp, true, 'Simulação deve registrar o dano antipessoal no Baiacu (100 -> 85 HP)');
  assert.equal(simVol03.possuiCalculoAfogamento28Hp, true, 'Simulação deve fechar a conta 100 - 15 - 57 = 28 HP nos 2 marinheiros');
  assert.equal(simVol03.possuiQuedaMarinheiros13Hp, true, 'Simulação deve registrar queda para 13 HP cada em t=23.50s');
  assert.equal(simVol03.possuiEliminacaoMarinheiros0Hp, true, 'Simulação deve registrar eliminação 13 -> 0 HP em t=30.25s');
});

test('Lei N2: verificação da Lista-Catraca (nenhum item resolvido pode permanecer na catraca)', () => {
  console.log(`[N4] Itens na Lista-Catraca examinados: ${LISTA_CATRACA.length} (capacidade ativa: 1 sentinela)`);
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
