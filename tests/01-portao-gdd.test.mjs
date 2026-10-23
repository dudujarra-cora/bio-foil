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
  extrairKitInicialVolume05,
  extrairCustosMastroVolume01,
  extrairSaqueSetor1Volume03,
  extrairInimigosSetor1Volume03,
  extrairBaralhoVolume04,
  extrairCatalogoEventosVolume04,
  extrairSimulacaoVolume03,
  extrairContratoEstadoVolume08,
  extrairComandosPersistenciaOnda6Volume08,
  extrairEnumsCanonicosVolume08,
  extrairArvoreModulosVolume08,
  extrairConsolidacaoVolume09,
  extrairTripulacaoVolume01,
  extrairTopologiaOcupacaoBeamVolume01,
  extrairParametrosMarinheiros,
  normalizarTexto,
} from '../src/gdd-parser.mjs';
import {
  calcularPesoTotalNave,
  calcularSustentacaoAtual,
  calcularVelocidadeCruzeiro,
  calcularTempoRecargaArma,
  resolverEventoNoESaque,
  validarDespachoComando,
  avaliarDesbloqueioCarcacas,
  extrairLimiaresPredicado,
  lerRequisitoBlueOption,
  kitCumpreRequisitoBlueOption,
  calcularMoedaTrechoEvento,
  sortearTemplatesSetor,
  calcularDistribuicaoTtkFase3,
  calcularGeometriaLayoutNativo,
  analisarGrafoCicloPartida,
  transicionarFaseCicloPartida,
  calcularHash32StreamDeterministico,
  HASH32_BASE_FNV,
  HASH32_PRIMO_FNV,
  calcularRotaMinimaCamaras,
  resolverTickCombateCorpoACorpoSala,
  validarTracadoBeamOrtogonal,
  enumerarTracadosBeamValidos,
} from '../src/oraculos-referencia.mjs';

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

test('Portão L5 + N4: aplica a cadeia canônica inteira (01..09) na ordem e valida tripwire de diretório', () => {
  const resultado = carregarCadeiaCanonicaGdd(DIRETORIO_RAIZ);

  console.log(`[N4] Arquivos .md examinados na cadeia canônica: ${resultado.arquivosExaminados}`);
  assert.ok(resultado.arquivosExaminados > 0, '[N4] Zero arquivos examinados deve reprovar');
  assert.equal(resultado.arquivosExaminados, 9, 'Deve examinar exatamente os 9 volumes canônicos (01..09)');

  assert.deepEqual(resultado.cadeiaDeclarada, [
    '01_matematica_base_e_auditoria.md',
    '02_wireframe_ui_e_auditoria.md',
    '03_vertical_slice_combate_e_auditoria.md',
    '04_mapa_procedural_e_auditoria.md',
    '05_conteudo_chefe_e_auditoria_final.md',
    '06_prova_formal_matriz_e_limites.md',
    '07_plano_mestre_de_testes_14_leis.md',
    '08_contrato_estado_e_arquitetura_modulos.md',
    '09_economia_bestiario_e_comandos.md',
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
    fs.writeFileSync(path.join(pastaTmp, '10_arquivo_intruso_nao_declarado.md'), '# Intruso', 'utf8');
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

test('Junção N1 + L4 + N4: cruza Tabela SSOT (27 constantes) e Matriz 5x8 (40 células) do Vol. 06 com Vols. 01..05', () => {
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

  assert.equal(totalConstantes, 27, 'A Tabela SSOT 6.1 deve conter exatamente 27 constantes canônicas');
  assert.equal(totalCelulasMatriz, 40, 'A Matriz 6.2 (5 estados x 8 eventos) deve conter 40 células');
  assert.equal(limitesExtremos.length, 4, 'A Seção 6.3 deve conter exatamente 4 Provas de Limite Extremo');
  assert.equal(niveisPrecedencia.length, 4, 'A Seção 6.4 deve conter exatamente 4 Níveis de Precedência');

  // L4 + L6: valor literal real de TODAS as 27 constantes, comparado pelo SIGNIFICADO (texto normalizado, sem LaTeX)
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
    VEL_FRENTE_EXTRATIVISTA: '6.0 MN/h',
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
  assert.equal(constantesVerificadasLiteralmente, 27, 'Todas as 27 constantes da SSOT devem ter asserção literal');

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
  // Parâmetros da cadeia de Markov: todos lidos do GDD (Vols. 01 e 05), nenhum número fixado no teste
  const vol05Norm = normalizarTexto(vol05);
  const tirosPorRajada = Number(
    vol05Norm.match(/Rajada Hidropneumática II \| 2 \| 18 kg \| 12s \| 0 \| Dispara (\d+) projéteis/)?.[1] ?? NaN
  );
  const rajadasNoArsenal = Number(vol05Norm.match(/Arsenal Padrão de Setor 8 sem Munição: \*(\d+)x Rajada Hidropneumática II\*/)?.[1] ?? NaN);
  const topologiaVol01 = extrairTopologiaOcupacaoBeamVolume01(vol01);
  assert.ok(vol05Norm.includes('Feixes não sofrem esquiva'), 'Seção 5.1 deve declarar que feixes não sofrem esquiva (premissa do TTK)');
  const distribuicaoTtk = calcularDistribuicaoTtkFase3({
    projeteisPorSalva: rajadasNoArsenal * tirosPorRajada,
    probAcerto: 1 - fase3.esquivaPct / 100,
    danoFeixe: topologiaVol01.beamMaxSalas * topologiaVol01.beamDanoPorSala,
    bolhas: fase3.bolhasBarreira,
    blindagem: fase3.blindagemTermicaPts,
    casco: fase3.hpCasco,
    intervaloSalvaSeg: recargaCortadorPolvo,
  });
  assert.equal(distribuicaoTtk.massaTotal, 1, 'A cadeia de Markov do TTK deve somar probabilidade 1');
  const ttk = chefeBestiario.ttkFase3;
  assert.equal(ttk.probQuebraBolhas, distribuicaoTtk.probQuebraBolhas, 'P(H >= 4) declarada na Falha Global 7 diverge da binomial exata');
  assert.equal(ttk.medianoSeg, distribuicaoTtk.ttkMedianoSeg, 'TTK mediano declarado na Falha Global 7 diverge da cadeia de Markov exata');
  assert.equal(
    ttk.esperadoSeg,
    distribuicaoTtk.ttkEsperadoSeg,
    `TTK esperado declarado na Falha Global 7 diverge da cadeia de Markov exata (${distribuicaoTtk.ttkEsperadoSeg}s)`
  );
  assert.equal(ttk.salvasEsperadas, distribuicaoTtk.salvasEsperadas, 'Salvas esperadas declaradas divergem da cadeia de Markov');
  assert.equal(ttk.p90Seg, distribuicaoTtk.ttkP90Seg, 'TTK P90 declarado na Falha Global 7 diverge da cadeia de Markov exata');
  assert.equal(ttk.ciclosMediana, Math.floor(distribuicaoTtk.ttkMedianoSeg / fase3.intervaloSurgeSeg));
  assert.equal(ttk.ciclosEsperado, Math.floor(distribuicaoTtk.ttkEsperadoSeg / fase3.intervaloSurgeSeg));
  assert.equal(ttk.ciclosP90, Math.floor(distribuicaoTtk.ttkP90Seg / fase3.intervaloSurgeSeg));
  assert.ok(
    ttk.ciclosMediana >= 1,
    'A Fase 3 não pode morrer antes do primeiro ciclo de Fervura Oceânica (Falha Global 7)'
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

test('Junção N1 + L4 + N4: audita o Catálogo de 17 Eventos (4.5.A), Raridade das Blue Options (4.5.C), Teto por Visita e SOS Expirado (4.5.B) contra Vols. 01, 03, 05, 06, 08 e 09', () => {
  const cadeia = carregarCadeiaCanonicaGdd(DIRETORIO_RAIZ);
  const vol03 = cadeia.volumes[2].conteudo;
  const vol04 = cadeia.volumes[3].conteudo;
  const vol05 = cadeia.volumes[4].conteudo;
  const vol06 = cadeia.volumes[5].conteudo;
  const vol08 = extrairContratoEstadoVolume08(cadeia.volumes[7].conteudo);
  const vol09 = extrairConsolidacaoVolume09(cadeia.volumes[8].conteudo);

  const baralho = extrairBaralhoVolume04(vol04);
  const catalogoEventos = extrairCatalogoEventosVolume04(vol04);
  const catalogoVol05 = extrairCatalogoVolume05(vol05);
  const economiaVol05 = extrairEconomiaVolume05(vol05);
  const kits = extrairKitInicialVolume05(vol05);
  const saqueS1Vol03 = extrairSaqueSetor1Volume03(vol03);
  const { constantesSsot } = extrairSsotEMatrizDoVolume06(vol06);

  const porCategoria = (c) => catalogoEventos.templates.filter((t) => t.categoria === c);
  console.log(
    `[N4] Catálogo de Eventos Vol. 04 examinado: ${catalogoEventos.templates.length} templates (SOS=${porCategoria('SOS').length}, EXPLORACAO=${porCategoria('EXPLORACAO').length}, PERIGO=${porCategoria('PERIGO').length}), ${kits.length} kits iniciais, estado expirado=${catalogoEventos.regrasSosEFrente.estadoSosExpirado}`
  );

  // 1. Tamanho do catálogo contra as cotas do Baralho 4.4 (sorteio sem repetição exige pelo menos 2x a cota)
  assert.equal(baralho.somaTotalNosBase, 20, 'Baralho base da Seção 4.4 deve continuar somando exatamente 20 nós');
  const [cotaForja, cotaSos, cotaPadrao, cotaPerigo, cotaExploracao] = baralho.cotas;
  assert.equal(cotaForja, 2);
  assert.equal(cotaPadrao, 6);
  assert.equal(porCategoria('SOS').length, 2 * cotaSos, `Catálogo 4.5.A deve conter exatamente 8 templates SOS (2 x cota 4.4 = 8)`);
  assert.equal(porCategoria('EXPLORACAO').length, 2 * cotaExploracao, 'Catálogo 4.5.A deve conter exatamente 6 templates EXPLORACAO (2 x cota 4.4 = 6)');
  assert.equal(porCategoria('PERIGO').length, cotaPerigo, 'Catálogo 4.5.A deve conter exatamente 3 templates PERIGO (cota 4.4 = 3)');
  assert.equal(catalogoEventos.templates.length, 17);
  assert.equal(new Set(catalogoEventos.templates.map((t) => t.id)).size, 17, 'IDs dos templates da Seção 4.5.A devem ser únicos');

  assert.equal(catalogoEventos.regrasOpcoes.taxaSucessoCriticoBlueOption, 100, 'Blue Option (Opção B) deve ter 100% de sucesso crítico garantido');
  assert.equal(catalogoEventos.regrasOpcoes.danoCascoBlueOption, 0, 'Blue Option (Opção B) deve causar 0 dano de casco');
  assert.equal(catalogoEventos.regrasOpcoes.marcadorOpcaoCPerigo, 'BLOQUEADO_COMBATE_OBRIGATORIO');

  // 2. Kit Inicial 5.4.A contra a tabela 5.4 (tripulação, peso e níveis de sistema fora do padrão Alfa)
  assert.equal(kits.length, catalogoVol05.naves.length, 'Seção 5.4.A deve ter um kit para cada uma das 5 naves da Seção 5.4');
  const pesoArma = (nome) => catalogoVol05.armas.find((a) => normalizarTexto(a.nome).includes(nome))?.pesoKg;
  const nivelPadraoAlfa = Object.fromEntries(economiaVol05.upgrades.map((u) => [u.nome, u.nivelInicial]));
  kits.forEach((kit, idx) => {
    const nave = catalogoVol05.naves[idx];
    const tripulacao5_4 = {};
    for (const m of normalizarTexto(nave.tripulacao).matchAll(/(\d+)\s+(Polvo|Arraia|Baiacu|Caranguejo)/g)) {
      tripulacao5_4[m[2].toUpperCase()] = Number(m[1]);
    }
    assert.deepEqual(kit.tripulacao, tripulacao5_4, `Tripulação do kit ${kit.idArquitetura} na Seção 5.4.A diverge da Seção 5.4`);
    for (const arma of kit.armas) {
      assert.ok(pesoArma(arma) > 0, `Arma "${arma}" do kit ${kit.idArquitetura} não existe no Catálogo 5.1`);
    }
    for (const orgao of kit.orgaos) {
      assert.ok(catalogoVol05.orgaos.some((o) => o.nome.startsWith(orgao)), `Órgão "${orgao}" do kit ${kit.idArquitetura} não existe no Catálogo 5.2`);
      assert.ok(normalizarTexto(nave.diferencialBruto).includes(orgao.split(' ')[0]), `Órgão "${orgao}" do kit ${kit.idArquitetura} não aparece na Seção 5.4`);
    }
    const pesoKit =
      kit.chassiKg + 100 + kit.armas.reduce((s, a) => s + pesoArma(a), 0) + catalogoVol05.pesoPorOrgaoKg * kit.orgaos.length;
    assert.equal(pesoKit, nave.pesoTotalKgDeclarado, `Peso do kit ${kit.idArquitetura} (Seção 5.4.A) diverge do P_total da Seção 5.4`);
    const linhaNave = normalizarTexto(nave.diferencialBruto);
    for (const [sistema, nivel] of Object.entries(kit.sistemas)) {
      assert.ok(sistema in nivelPadraoAlfa, `Sistema "${sistema}" do kit ${kit.idArquitetura} não existe na Tabela 5.6.A`);
      if (nivel === nivelPadraoAlfa[sistema]) continue;
      const declarado =
        nivel === 0
          ? new RegExp(`SEM ${sistema.split(' ').at(-1)}`, 'i').test(linhaNave)
          : linhaNave.includes(`${sistema} Nv.${nivel}`);
      assert.ok(declarado, `Nível ${nivel} de "${sistema}" no kit ${kit.idArquitetura} não está declarado na linha da Seção 5.4`);
    }
  });

  // 3. Requisitos das Blue Options: formato, existência no catálogo e nível alcançável (Tabela 5.6.A)
  const nivelMaximo = Object.fromEntries(economiaVol05.upgrades.map((u) => [u.nome, u.nivelInicial + u.custosNiveis.length]));
  for (const t of catalogoEventos.templates) {
    for (const alt of lerRequisitoBlueOption(t.requisitoBlueOption)) {
      if (alt.tipo === 'ARMA') assert.ok(pesoArma(alt.nome) > 0, `Arma "${alt.nome}" exigida por ${t.id} não existe no Catálogo 5.1`);
      if (alt.tipo === 'ÓRGÃO') assert.ok(catalogoVol05.orgaos.some((o) => o.nome.startsWith(alt.nome)), `Órgão "${alt.nome}" exigido por ${t.id} não existe no Catálogo 5.2`);
      if (alt.tipo === 'SISTEMA') {
        assert.ok(alt.sistema in nivelMaximo, `Sistema "${alt.sistema}" exigido por ${t.id} não existe na Tabela 5.6.A`);
        assert.ok(alt.nivelMin <= nivelMaximo[alt.sistema], `${t.id} exige ${alt.sistema} Nv. ${alt.nivelMin}, acima do máximo ${nivelMaximo[alt.sistema]}`);
      }
    }
  }

  // 4. Regra de Raridade (4.5.C): Alfa cumpre 0, nenhuma carcaça cumpre mais de 1, e a matriz declarada bate com o cálculo
  const elegibilidade = kits.map((kit) => ({
    idArquitetura: kit.idArquitetura,
    templates: catalogoEventos.templates.filter((t) => kitCumpreRequisitoBlueOption(t.requisitoBlueOption, kit)).map((t) => t.id),
  }));
  assert.deepEqual(
    elegibilidade.find((e) => e.idArquitetura === 'CARCACA_ALFA').templates,
    [],
    'Carcaça Alfa deve cumprir 0 requisitos de Blue Option (Regra de Raridade da Seção 4.5.A)'
  );
  for (const e of elegibilidade) {
    assert.ok(e.templates.length <= 1, `Carcaça ${e.idArquitetura} cumpre ${e.templates.length} Blue Options de fábrica (máximo 1)`);
  }
  assert.deepEqual(
    catalogoEventos.elegibilidadeDeclarada.map((e) => ({ idArquitetura: e.idArquitetura, templates: e.templates })),
    elegibilidade,
    'Matriz de Elegibilidade da Seção 4.5.C diverge do cálculo a partir do Kit Inicial 5.4.A'
  );
  for (const e of catalogoEventos.elegibilidadeDeclarada) assert.equal(e.total, e.templates.length);

  // 5. Teto Monetário por Visita: nenhuma opção rende mais moeda que uma Captura Intacta; opção de combate não soma moeda
  let trechosAuditados = 0;
  for (const t of catalogoEventos.templates) {
    const [antesP1, depoisP1] = t.opcaoA.split('p=1:');
    const trechos = [
      { rotulo: 'A(p=0)', texto: antesP1 },
      ...(depoisP1 === undefined ? [] : [{ rotulo: 'A(p=1)', texto: depoisP1 }]),
      { rotulo: 'B', texto: t.recompensaBlueOption },
    ];
    for (const trecho of trechos) {
      for (const linhaCurva of economiaVol05.curvaSetores) {
        const { moeda, temCombate } = calcularMoedaTrechoEvento(trecho.texto, linhaCurva);
        if (temCombate || t.categoria === 'PERIGO') {
          assert.equal(moeda, 0, `Opção ${t.id} ${trecho.rotulo} leva a combate e não pode somar moeda extra (Teto Monetário por Visita)`);
        } else {
          assert.ok(
            moeda <= linhaCurva.barcoCapturaSucata,
            `Opção ${t.id} ${trecho.rotulo} rende ${moeda} no Setor ${linhaCurva.setor}, acima da Captura Intacta (${linhaCurva.barcoCapturaSucata})`
          );
        }
        trechosAuditados += 1;
      }
    }
  }
  assert.ok(trechosAuditados > 0);

  // Orçamento de visitas da Falha Global 6 (item 3) contra a Seção 4.3
  const vol04Norm = normalizarTexto(vol04);
  const vol05Norm = normalizarTexto(vol05);
  const visitasPorSetor = Number(vol04Norm.match(/consegue visitar (\d+) nós no setor/)?.[1] ?? NaN);
  const matchOrcamento = vol05Norm.match(/1 Saída \+ 1 Recife-Forja[^+]*\+ (\d+) visitas remuneradas/);
  const remuneradasPorSetor = Number(vol05Norm.match(/\((\d+) encontros remunerados por setor/)?.[1] ?? NaN);
  assert.equal(visitasPorSetor, 10);
  assert.equal(Number(matchOrcamento?.[1]), remuneradasPorSetor, 'Visitas remuneradas da Falha Global 6 (item 3) divergem dos encontros da prova');
  assert.equal(1 + 1 + remuneradasPorSetor, visitasPorSetor, 'Orçamento de visitas (1 Saída + 1 Forja + remuneradas) deve fechar com a Seção 4.3');

  // 6. Sorteio por setor sem repetição (STREAM_6) e assinatura do hash da Opção A igual à Seção 9.3
  for (const seed of ['biofoil-seed-01', 'biofoil-seed-02', 'biofoil-seed-03']) {
    let anteriores = [];
    for (let setor = 1; setor <= 8; setor += 1) {
      const sorteados = sortearTemplatesSetor(catalogoEventos, seed, setor, anteriores, { SOS: cotaSos, EXPLORACAO: cotaExploracao });
      assert.equal(sorteados.length, cotaSos + cotaExploracao + cotaPerigo);
      const repetidos = sorteados.filter((id) => anteriores.includes(id) && !id.startsWith('PER_'));
      assert.deepEqual(repetidos, [], `Sorteio do Setor ${setor} repetiu template do setor anterior`);
      assert.deepEqual(sorteados, sortearTemplatesSetor(catalogoEventos, seed, setor, anteriores, { SOS: cotaSos, EXPLORACAO: cotaExploracao }));
      anteriores = sorteados;
    }
  }
  const stream2 = vol09.streamsPrng.find((s) => s.id === 'STREAM_2_EVENTO_OPCAO_A');
  assert.equal(
    catalogoEventos.assinaturaHashOpcaoA,
    stream2.assinaturaChave,
    'Assinatura do hash32 da Opção A na Seção 4.5.A (Vol. 04) diverge do STREAM_2_EVENTO_OPCAO_A da Seção 9.3 (Vol. 09)'
  );

  // 7. Perigo Águas Turvas contra a Tabela 8.2 (Vol. 08): canal L3 negado para todas as naves, restaurado só pela Blue Option
  const per3 = catalogoEventos.templates.find((t) => t.id === 'PER_3_AGUAS_TURVAS');
  const linhaSonarVol08 = vol08.linhasTabelaL3.find((l) => l.canalPermissao.includes('NEGADO_SONAR'));
  assert.ok(linhaSonarVol08, 'Tabela 8.2 do Vol. 08 deve declarar canalPermissao NEGADO_SONAR');
  assert.ok(
    per3.opcaoA.includes('L3') && per3.opcaoA.includes('NEGADO_SONAR') && per3.recompensaBlueOption.includes('VISIVEL'),
    'PER_3_AGUAS_TURVAS na Seção 4.5.A deve referenciar o Canal L3 e os estados NEGADO_SONAR / VISIVEL da Tabela 8.2 (Vol. 08)'
  );
  assert.ok(linhaSonarVol08.situacao.includes('PER_3'), 'Tabela 8.2 deve condicionar a cegueira de Águas Turvas à Blue Option PER_3, não a Arraia/Acústico');
  assert.ok(!/Arraia Elétrica ou arma/.test(vol04Norm), 'Seção 4.4 não pode mais isentar Arraia/Acústico de Águas Turvas');

  // 8. SOS Expirado e Frente Corporativa (4.5.B) contra Vols. 03, 05 e 06
  const regras = catalogoEventos.regrasSosEFrente;
  assert.equal(regras.margemPrazoHoras, 1.5, 'Margem de T_prazo em relação a T_rota_minima deve ser +1.5h');
  assert.equal(regras.estadoSosExpirado, 'ZONA_MORTA_INDUSTRIALIZADA');
  assert.equal(regras.multiplicadorSucataSosExpirado, 0.5);
  assert.equal(regras.combustivelSosExpirado, 0);
  assert.equal(regras.municaoSosExpirado, 0);
  assert.equal(
    regras.exemplosSetor1SosExpirado.destruicaoBruta,
    Math.floor(0.5 * saqueS1Vol03.barcoBrutoSucata),
    'Exemplo de SOS Expirado (Destruição Bruta Setor 1) na Seção 4.5.B diverge de floor(0.5 x 12) = 6 Sucata'
  );
  assert.equal(
    regras.exemplosSetor1SosExpirado.capturaIntacta,
    Math.floor(0.5 * saqueS1Vol03.barcoCapturaSucata),
    'Exemplo de SOS Expirado (Captura Intacta Setor 1) na Seção 4.5.B diverge de floor(0.5 x 25) = 12 Sucata'
  );
  const velFrenteSsot = Number(normalizarTexto(constantesSsot.VEL_FRENTE_EXTRATIVISTA.valorBruto).match(/(\d+(?:\.\d+)?)/)?.[1]);
  const velFrenteSecao43 = Number(vol04Norm.match(/velocidade constante de (\d+(?:\.\d+)?) MN por Hora/i)?.[1]);
  assert.equal(regras.velocidadeFrenteCorporativaMnPorHora, velFrenteSsot, 'Velocidade da Frente Extrativista na Seção 4.5.B diverge da SSOT VEL_FRENTE_EXTRATIVISTA (Vol. 06)');
  assert.equal(velFrenteSecao43, velFrenteSsot, 'Velocidade da Frente Extrativista na Seção 4.3 diverge da SSOT VEL_FRENTE_EXTRATIVISTA (Vol. 06)');
  assert.equal(regras.bonusBarreiraFrenteCorporativa, 1);
  assert.equal(regras.tetoBarreiraFrenteCorporativa, 4);
  assert.deepEqual(regras.saqueFrenteCorporativa, { sucata: 0, biomassa: 0, municao: 0, combustivel: 1 });
  assert.equal(catalogoEventos.temFalha4FarmingInfinitoSosExpirado, true);

  // 9. Oráculo resolverEventoNoESaque nos 3 estados de nó e nos 8 setores
  const sosAtivoBlue = resolverEventoNoESaque(catalogoEventos, economiaVol05, {
    idEvento: 'SOS_1_REDE_ARRASTO',
    setor: 1,
    tAtualHoras: 3.5,
    tRotaMinimaHoras: 2.0,
    xNoMn: 25,
    temRequisitoBlueOption: true,
    escolha: 'B',
  });
  assert.equal(sosAtivoBlue.estadoNo, 'EVENTO_ATIVO');
  assert.deepEqual(sosAtivoBlue.opcoesDisponiveis, ['A', 'B', 'C']);
  assert.equal(sosAtivoBlue.resultadoEscolha, 'SUCESSO_CRITICO_BLUE_OPTION');
  assert.equal(sosAtivoBlue.danoCasco, 0);
  for (const linhaSaque of economiaVol05.curvaSetores) {
    const expBruta = resolverEventoNoESaque(catalogoEventos, economiaVol05, {
      idEvento: 'SOS_2_CAPSULA_AFUNDANDO',
      setor: linhaSaque.setor,
      tAtualHoras: 3.6,
      tRotaMinimaHoras: 2.0,
      xNoMn: 30,
      modalidadeVit: 'DESTRUICAO_BRUTA',
    });
    assert.equal(expBruta.estadoNo, 'ZONA_MORTA_INDUSTRIALIZADA');
    assert.deepEqual(expBruta.opcoesDisponiveis, []);
    assert.equal(expBruta.saquePosCombate.sucata, Math.floor(0.5 * linhaSaque.barcoBrutoSucata));
    const expCaptura = resolverEventoNoESaque(catalogoEventos, economiaVol05, {
      idEvento: 'SOS_4_COMBOIO_ENCALHADO',
      setor: linhaSaque.setor,
      tAtualHoras: 4.0,
      tRotaMinimaHoras: 2.0,
      xNoMn: 30,
      modalidadeVit: 'CAPTURA_INTACTA',
    });
    assert.equal(expCaptura.saquePosCombate.sucata, Math.floor(0.5 * linhaSaque.barcoCapturaSucata));
  }
  const noEngolidoFrente = resolverEventoNoESaque(catalogoEventos, economiaVol05, {
    idEvento: 'EXP_1_NAUFRAGIO_ANTIGO',
    setor: 4,
    tAtualHoras: 5.0,
    tRotaMinimaHoras: 2.0,
    xNoMn: 30.0,
  });
  assert.equal(noEngolidoFrente.estadoNo, 'FROTA_PRINCIPAL_CORPORACAO');
  assert.deepEqual(noEngolidoFrente.saquePosCombate, { sucata: 0, biomassa: 0, municao: 0, combustivel: 1 });
  assert.throws(
    () =>
      resolverEventoNoESaque(catalogoEventos, economiaVol05, {
        idEvento: 'PER_1_CHUVA_ACIDA',
        setor: 2,
        tAtualHoras: 1.0,
        tRotaMinimaHoras: 1.0,
        xNoMn: 20,
        escolha: 'C',
      }),
    /BLOQUEADO_COMBATE_OBRIGATORIO/
  );
});

test('Junção N1 + L4 + N4: audita o Action Schema de 15 comandos (8.5.A), Predicados do profile.json (8.5.B), Layout Nativo e Cues (8.5.C) e Enums (8.1) contra Vols. 01, 02, 04, 05, 06 e 09', () => {
  const cadeia = carregarCadeiaCanonicaGdd(DIRETORIO_RAIZ);
  const vol01Norm = normalizarTexto(cadeia.volumes[0].conteudo);
  const vol02Norm = normalizarTexto(cadeia.volumes[1].conteudo);
  const vol04Norm = normalizarTexto(cadeia.volumes[3].conteudo);
  const vol05 = cadeia.volumes[4].conteudo;
  const vol06 = cadeia.volumes[5].conteudo;
  const vol08Texto = cadeia.volumes[7].conteudo;

  const especOnda6 = extrairComandosPersistenciaOnda6Volume08(vol08Texto);
  const enums = extrairEnumsCanonicosVolume08(vol08Texto);
  const contrato = extrairContratoEstadoVolume08(vol08Texto);
  const catalogoVol05 = extrairCatalogoVolume05(vol05);
  const chefeBestiario = extrairChefeEBestiarioVolume05(vol05);
  const topologia = extrairTopologiaOcupacaoBeamVolume01(cadeia.volumes[0].conteudo);
  const { constantesSsot, celulasMatriz } = extrairSsotEMatrizDoVolume06(vol06);
  const tv = especOnda6.targetVisual;

  console.log(
    `[N4] Onda 6 / Action Schema Vol. 08 examinado: ${especOnda6.comandos.length} comandos atômicos, ${especOnda6.carcacasPerfil.length} carcaças no profile.json, ${especOnda6.cuesSonoros.length} cues sonoros, ${Object.keys(tv.layoutNativo).length} parâmetros de layout, resolução nativa=${tv.larguraNativaPx}x${tv.alturaNativaPx}`
  );

  // 1. Lista fechada dos 15 comandos e fases dentro do enum canônico
  assert.deepEqual(
    especOnda6.comandos.map((c) => c.tipo),
    [
      'ALOCAR_ENERGIA',
      'MOVER_TRIPULANTE',
      'MIRAR_ARMA',
      'ALTERNAR_VALVULA',
      'DRENAR_TUDO',
      'ATIVAR_BAIACU',
      'ATIVAR_PULSO_ENZIMAS',
      'ATIVAR_TINTA_FURTIVA',
      'LANCAR_ABORDAGEM',
      'MERGULHO_TATICO',
      'SALTO_FUGA',
      'ESCOLHER_OPCAO_EVENTO',
      'COMPRAR_OU_VENDER_LOJA',
      'ENXERTAR_ORGAO',
      'VIAJAR_NO_MAPA',
    ],
    'Lista de comandos atômicos na Seção 8.5.A diverge da lista canônica de 15'
  );
  const marcadoresValidos = ['REJEITADO_FASE_INVALIDA', 'BLOQUEADO_TRAVA_HIDROSTATICA', 'BLOQUEADO_COMBATE_OBRIGATORIO', 'PRECONDICAO_NAO_ATENDIDA'];
  for (const c of especOnda6.comandos) {
    for (const f of c.fasesPermitidas) assert.ok(enums['meta.faseJogo'].includes(f), `Fase "${f}" do comando ${c.tipo} fora do enum meta.faseJogo (Vol. 08)`);
    assert.ok(c.payloadObrigatorio.startsWith('{'), `Comando ${c.tipo} sem schema de payload`);
    assert.ok(marcadoresValidos.includes(c.marcadorRejeicao), `Marcador de ${c.tipo} fora da Regra de Rejeição Pura`);
  }

  // 2. Junção numérica de cada linha da 8.5.A com a fonte primária citada
  const regra = (tipo) => especOnda6.comandos.find((c) => c.tipo === tipo).regraValidacao;
  const mPulso = vol01Norm.match(/(\d+) Barras \(Enzimas Regenerativas Nv\. 1\):.*?Pulso de Enzimas \(cura \+(\d+) HP\/s nas demais salas inundadas por (\d+)s.*?com (\d+)s de recarga\)/);
  assert.ok(mPulso, 'Vol. 01 (Seção 1.4) deve declarar o Pulso de Enzimas');
  assert.ok(
    regra('ATIVAR_PULSO_ENZIMAS').includes(`>= ${mPulso[1]} barras`) &&
      regra('ATIVAR_PULSO_ENZIMAS').includes(`+${mPulso[2]} HP/s nas demais salas inundadas por ${mPulso[3]}s, recarga ${mPulso[4]}s`),
    'ATIVAR_PULSO_ENZIMAS na Seção 8.5.A diverge do Pulso de Enzimas da Seção 1.4 (Vol. 01)'
  );
  const mTinta = vol01Norm.match(/concede \+(\d+)% de Esquiva.*?por (\d+) segundos \(Nível 1\) ou (\d+) segundos \(Nível 2\), seguido de (\d+) segundos de recarga/);
  assert.ok(
    mTinta && regra('ATIVAR_TINTA_FURTIVA').includes(`+${mTinta[1]}% esquiva por ${mTinta[2]}s/${mTinta[3]}s, recarga ${mTinta[4]}s`),
    'ATIVAR_TINTA_FURTIVA na Seção 8.5.A diverge da Glândula de Tinta Furtiva da Seção 1.4 (Vol. 01)'
  );
  const celula = (prefixo, estado) => normalizarTexto(celulasMatriz.find((c) => c.evento.startsWith(prefixo) && c.estado === estado)?.regra ?? '');
  const c1G = celula('G. Carregamento', '1_NO_FOIL');
  const mFuga = c1G.match(/(\d+\.\d+)s base \((\d+\.\d+)s com operador/);
  const mFugaAgua = celula('G. Carregamento', '2_TOUCHDOWN').match(/(\d+\.\d+)x/);
  assert.ok(
    mFuga && mFugaAgua && regra('SALTO_FUGA').includes(`progressoFugaSeg >= ${mFuga[1]}`) &&
      regra('SALTO_FUGA').includes(`(${mFuga[1]}s / ${mFuga[2]}s / ${mFugaAgua[1]}x`),
    'SALTO_FUGA na Seção 8.5.A diverge da Linha G da Matriz 6.2 (20.0s / 15.0s / 0.5x)'
  );
  const tempoSpoolSsot = normalizarTexto(constantesSsot.TEMPO_SPOOL_UP.valorBruto).match(/(\d+(?:\.\d+)?)/)?.[1];
  assert.ok(regra('MERGULHO_TATICO').includes(`${tempoSpoolSsot}s`), 'MERGULHO_TATICO diverge de TEMPO_SPOOL_UP (Tabela 6.1)');
  assert.ok(regra('MOVER_TRIPULANTE').includes(`< ${topologia.lotacaoMaxAliados} aliados`), 'MOVER_TRIPULANTE diverge da lotação da Seção 1.6.B');
  assert.ok(regra('ATIVAR_BAIACU').includes(`${topologia.reflexaoBaiacuPct}% DPS`), 'ATIVAR_BAIACU diverge da reflexão da Seção 1.6.B');
  const animaisPorCapsula = Number(vol01Norm.match(/lança até (\d+) animais/)?.[1] ?? NaN);
  assert.ok(regra('LANCAR_ABORDAGEM').includes(`1..${animaisPorCapsula} aliados`), 'LANCAR_ABORDAGEM diverge do Tubo Pressurizado da Seção 1.4');
  assert.ok(vol04Norm.includes('DOBRO de Horas (2.0x)') && vol04Norm.includes('5 segundos totais'), 'Vol. 04 (Falha 3) deve declarar Deriva 2.0x e 5 s');
  assert.ok(regra('VIAJAR_NO_MAPA').includes('2.0x as horas, 5.0s frio'), 'VIAJAR_NO_MAPA diverge do Modo Deriva da Falha Encontrada 3 (Vol. 04)');

  // 3. Validador puro: trava hidrostática pela Linha C da Matriz, loja só no Recife-Forja, enxerto fora de combate
  for (const estado of ['1_NO_FOIL', '4_FURTIVO_AR']) assert.ok(!celula('C. Abrir Válvula', estado).includes('BLOQUEADO'), `Célula C de ${estado} deve liberar a válvula`);
  for (const estado of ['2_TOUCHDOWN', '3_SPOOL_UP', '5_FURTIVO_AGUA']) assert.ok(celula('C. Abrir Válvula', estado).includes('BLOQUEADO PELA FÍSICA'), `Célula C de ${estado} deve bloquear a válvula`);
  const despachar = (contexto, tipo, payload = {}) => validarDespachoComando(especOnda6, contexto, { tipo, payload });
  const valvulaMar = despachar({ faseJogo: 'COMBATE', estadoFisico: '2_TOUCHDOWN' }, 'ALTERNAR_VALVULA', { camaraId: 5, aberta: true });
  assert.equal(valvulaMar.aceito, false);
  assert.equal(valvulaMar.estadoInalterado, true);
  assert.equal(valvulaMar.marcadorRejeicao, 'BLOQUEADO_TRAVA_HIDROSTATICA', 'ALTERNAR_VALVULA em Touchdown deve ser rejeitado com BLOQUEADO_TRAVA_HIDROSTATICA');
  assert.equal(valvulaMar.cueEmitido, 'CUE_TRAVA_HIDROSTATICA');
  assert.equal(despachar({ faseJogo: 'COMBATE', estadoFisico: '3_SPOOL_UP' }, 'DRENAR_TUDO').marcadorRejeicao, 'BLOQUEADO_TRAVA_HIDROSTATICA');
  assert.equal(
    despachar({ faseJogo: 'COMBATE', estadoFisico: '1_NO_FOIL', furtividadeAtivaSeg: 3 }, 'ALTERNAR_VALVULA').aceito,
    true,
    'Válvula deve abrir em No Foil com Tinta Furtiva ativa (Célula 4C da Matriz 6.2)'
  );
  assert.equal(
    despachar({ faseJogo: 'MAPA' }, 'COMPRAR_OU_VENDER_LOJA', { operacao: 'COMPRAR' }).marcadorRejeicao,
    'REJEITADO_FASE_INVALIDA',
    'COMPRAR_OU_VENDER_LOJA fora do Recife-Forja (fase MAPA) deve ser rejeitado'
  );
  assert.equal(despachar({ faseJogo: 'LOJA' }, 'COMPRAR_OU_VENDER_LOJA').aceito, true);
  assert.equal(despachar({ faseJogo: 'MAPA' }, 'ENXERTAR_ORGAO', { acao: 'ENCAIXAR' }).aceito, true, 'Enxerto de órgão deve ser livre no Mapa (Seção 5.2)');
  assert.equal(despachar({ faseJogo: 'COMBATE', estadoFisico: '1_NO_FOIL' }, 'ENXERTAR_ORGAO').marcadorRejeicao, 'REJEITADO_FASE_INVALIDA');
  const mergulho = despachar({ faseJogo: 'COMBATE', estadoFisico: '1_NO_FOIL' }, 'MERGULHO_TATICO', { recolherFoil: true });
  assert.equal(mergulho.aceito, true);
  assert.equal(mergulho.cueEmitido, 'CUE_ESTOL_TOUCHDOWN');

  // 4. Enums canônicos (8.1) contra o GameState, a Matriz 6.2 e a Junção 2 (8.4)
  assert.ok(enums['meta.faseJogo'].includes(contrato.gameState.meta.faseJogo));
  assert.ok(enums['naveJogador.estadoFisico'].includes(contrato.gameState.naveJogador.estadoFisico));
  const estadosMatriz = [...new Set(celulasMatriz.map((c) => c.estado))];
  for (const e of enums['naveJogador.estadoFisico']) assert.ok(estadosMatriz.includes(e), `estadoFisico ${e} ausente da Matriz 6.2`);
  const juncao2 = vol08Texto.split('2. **Junção Onda 2')[1]?.split('3. **Junção')[0] ?? '';
  const modalidadesJuncao2 = [...juncao2.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]).filter((v) => v !== 'null');
  assert.deepEqual(modalidadesJuncao2, enums.modalidadeVitoria, 'Modalidades da Junção 2 (8.4) divergem dos Enums Canônicos da Seção 8.1');

  // 5. Persistência (8.5.B): predicados interpretados literalmente e cruzados com a Seção 5.4
  assert.equal(especOnda6.carcacasPerfil.length, catalogoVol05.naves.length);
  especOnda6.carcacasPerfil.forEach((c, idx) => {
    const nave = catalogoVol05.naves[idx];
    assert.equal(c.nomeCanonico, normalizarTexto(nave.nome), `Nome da carcaça ${idx + 1} na Seção 8.5.B diverge da Seção 5.4`);
    const numeroCondicao = Number(normalizarTexto(nave.condicaoDesbloqueio).match(/(\d+)/)?.[1] ?? NaN);
    if (Number.isNaN(numeroCondicao)) return;
    const limiares = extrairLimiaresPredicado(c.predicadoCodigo).filter((l) => l.operador === '>=').map((l) => l.valor);
    assert.ok(limiares.includes(numeroCondicao), `Predicado de ${c.idArquitetura} na Seção 8.5.B diverge da Condição de Desbloqueio da Seção 5.4 (Vol. 05)`);
  });
  const condicaoManta = normalizarTexto(catalogoVol05.naves[1].condicaoDesbloqueio);
  assert.ok(condicaoManta.includes('sem causar dano'));
  assert.ok(especOnda6.carcacasPerfil[1].predicadoCodigo.includes('danoCascoCausadoAoInimigoNestaLuta === 0'));
  assert.deepEqual(
    avaliarDesbloqueioCarcacas(especOnda6, {}),
    { CARCACA_ALFA: true, MANTA_VOLT: false, COURACA_LIMIAR: false, SOMBRA_ABISSAL: false, COLMEIA_VIVA: false },
    'No profile.json inicial, apenas CARCACA_ALFA deve começar desbloqueada (true)'
  );
  assert.equal(avaliarDesbloqueioCarcacas(especOnda6, { barcosCapturadosIntactosNestaRun: 4 }).COURACA_LIMIAR, false);
  assert.equal(avaliarDesbloqueioCarcacas(especOnda6, { barcosCapturadosIntactosNestaRun: 5 }).COURACA_LIMIAR, true);
  assert.equal(avaliarDesbloqueioCarcacas(especOnda6, { setorNumero: 4, vitoriaCombate: true, danoCascoCausadoAoInimigoNestaLuta: 1 }).MANTA_VOLT, false);
  assert.deepEqual(
    avaliarDesbloqueioCarcacas(especOnda6, {
      setorNumero: 4,
      vitoriaCombate: true,
      danoCascoCausadoAoInimigoNestaLuta: 0,
      barcosCapturadosIntactosNestaRun: 5,
      orgaosIntactosExtraidosNestaRun: 4,
      setorNumeroAlcanceMaxNestaRun: 8,
    }),
    { CARCACA_ALFA: true, MANTA_VOLT: true, COURACA_LIMIAR: true, SOMBRA_ABISSAL: true, COLMEIA_VIVA: true }
  );

  // 6. Layout nativo (8.5.C): geometria recalculada sem violações e cruzada com o Vol. 02 (pixels em 1080p)
  assert.equal(tv.larguraNativaPx, 960);
  assert.equal(tv.alturaNativaPx, 540);
  assert.equal(tv.larguraNativaPx * tv.fatorUpscaleFullHd, tv.larguraFullHdPx);
  assert.equal(tv.alturaNativaPx * tv.fatorUpscaleFullHd, tv.alturaFullHdPx);
  const L = tv.layoutNativo;
  const geo = calcularGeometriaLayoutNativo(L);
  assert.deepEqual(geo.violacoes, [], `Orçamento de Layout Nativo da Seção 8.5.C viola: ${geo.violacoes.join('; ')}`);
  assert.ok(L.PAINEL_RODAPE_TOPO_Y <= tv.alturaNativaPx && L.PAINEL_INIMIGO_X <= tv.larguraNativaPx);
  const f = tv.fatorUpscaleFullHd;
  assert.ok(
    vol02Norm.includes(`Cada câmara tem ${L.CAMARA_LARGURA * f}x ${L.CAMARA_ALTURA * f} pixels de área útil interna (${L.CAMARA_LARGURA}x ${L.CAMARA_ALTURA} px nativos)`),
    'Câmara do Vol. 02 (1080p) diverge do Layout Nativo da Seção 8.5.C x 2'
  );
  assert.ok(
    vol02Norm.includes(`cai fisicamente ${L.QUEDA_TOUCHDOWN * f} pixels para baixo na tela (${L.QUEDA_TOUCHDOWN} px nativos)`),
    'Queda do Touchdown no Vol. 02 (1080p) diverge de QUEDA_TOUCHDOWN x 2 da Seção 8.5.C'
  );
  assert.ok(vol02Norm.includes('todo valor em pixels deste volume é medido na tela final 1920x 1080'), 'Vol. 02 deve declarar a convenção de pixels em 1080p');
  assert.equal(tv.filtroSubaquaticoHz, 400);

  // 7. Os 8 cues contra as fontes primárias
  assert.equal(especOnda6.cuesSonoros.length, 8);
  const cue = (id) => especOnda6.cuesSonoros.find((c) => c.id === id);
  assert.ok(
    cue('CUE_ALARME_FERVURA_4S').parametroAcustico.includes(`${chefeBestiario.surgeFase3AlarmeFervuraSeg}.0s`) &&
      cue('CUE_ALARME_FERVURA_4S').parametroAcustico.includes(`${chefeBestiario.surgeFase3DuracaoFervuraSeg}.0s`),
    'CUE_ALARME_FERVURA_4S na Seção 8.5.C diverge do alarme de 4.0s e duração de 5.0s da Fase 3 (Vol. 05 / Matriz 6.2)'
  );
  assert.ok(cue('CUE_SPOOL_UP_DECOLAGEM').parametroAcustico.includes(`${tempoSpoolSsot}s`), 'CUE_SPOOL_UP_DECOLAGEM diverge de TEMPO_SPOOL_UP');
  const reservaMinSsot = normalizarTexto(constantesSsot.RESERVA_MIN_SIFAO.valorBruto).match(/(\d+(?:\.\d+)?)/)?.[1];
  assert.ok(cue('CUE_CAVITACAO_SIFAO').gatilho.includes(`${reservaMinSsot} kg`), 'CUE_CAVITACAO_SIFAO diverge de RESERVA_MIN_SIFAO');
  const mAsfixia = vol01Norm.match(/O_2 < (\d+)% causa asfixia \((-\d+) HP\/s\)/);
  assert.ok(
    mAsfixia && cue('CUE_HIPOXIA_CRITICA').gatilho.includes(`oxigenioPct < ${mAsfixia[1]}.0`) &&
      cue('CUE_HIPOXIA_CRITICA').parametroAcustico.includes(`${mAsfixia[2]} HP/s abaixo de ${mAsfixia[1]}%`),
    'CUE_HIPOXIA_CRITICA na Seção 8.5.C diverge da asfixia da Seção 1.4 (Vol. 01)'
  );
  const secao13 = vol01Norm.split('## 1.3.')[1]?.split('## 1.4.')[0] ?? '';
  const segundosCurto = secao13.match(/apaga sozinho em (\d+) segundos/)?.[1];
  assert.ok(
    cue('CUE_CURTO_CIRCUITO_AGUA').parametroAcustico.includes(`${segundosCurto}.0s`) && cue('CUE_CURTO_CIRCUITO_AGUA').cruzamentoGdd.includes('Seção 1.3'),
    'CUE_CURTO_CIRCUITO_AGUA deve citar a Seção 1.3 e os 3 s de extinção a seco'
  );
  for (const fase of chefeBestiario.fasesResumo) {
    assert.ok(cue('CUE_POWER_SURGE_CHEFE').parametroAcustico.includes(`${fase.intervaloSurgeSeg}s (Fase ${fase.fase})`), `CUE_POWER_SURGE_CHEFE diverge do intervalo da Fase ${fase.fase}`);
  }
  assert.ok(
    cue('CUE_ESTOL_TOUCHDOWN').parametroAcustico.includes(`${L.QUEDA_TOUCHDOWN} px nativos (${L.QUEDA_TOUCHDOWN * f} px em 1080p)`) &&
      cue('CUE_ESTOL_TOUCHDOWN').parametroAcustico.includes(`${tv.filtroSubaquaticoHz} Hz`),
    'CUE_ESTOL_TOUCHDOWN diverge do Layout Nativo (queda) e do filtro de 400 Hz'
  );
  assert.equal(especOnda6.temItem3ContraAuditoria8, true);
});

test('Junção N1 + L4 + N5: audita a Consolidação do Vol. 09 (5 Pilares x Árvore 8.3, Máquina de Ciclo sem beco sem saída, 6 Streams e hash32 com vetor) contra Vols. 04, 08 e mutacoes.json', () => {
  const cadeia = carregarCadeiaCanonicaGdd(DIRETORIO_RAIZ);
  const vol08Texto = cadeia.volumes[7].conteudo;
  const consolidacao = extrairConsolidacaoVolume09(cadeia.volumes[8].conteudo);
  const enums = extrairEnumsCanonicosVolume08(vol08Texto);
  const arvore = extrairArvoreModulosVolume08(vol08Texto);
  const ondaDe = new Map(arvore.map((e) => [e.caminho, e.onda]));
  const idsMutacoesJson = new Set(
    JSON.parse(fs.readFileSync(path.join(DIRETORIO_RAIZ, 'padrao', 'protocolo', 'mutacoes.json'), 'utf8')).mutacoes.map((m) => m.id)
  );

  console.log(
    `[N4] Vol. 09 examinado: ${consolidacao.pilares.length} pilares sênior, ${consolidacao.transicoesCiclo.length} transições de ciclo, ${consolidacao.streamsPrng.length} streams isolados de PRNG, ${arvore.length} arquivos na árvore 8.3`
  );

  // 1. Árvore 8.3: caminhos únicos e Onda declarada coerente com a pasta (Lei N5)
  assert.equal(new Set(arvore.map((e) => e.caminho)).size, arvore.length, 'Árvore 8.3 tem caminho duplicado (dois donos)');
  for (const e of arvore) {
    const pasta = e.caminho.match(/onda(\d)-/);
    if (pasta) assert.equal(e.onda, Number(pasta[1]), `Arquivo ${e.caminho} está na pasta da Onda ${pasta[1]} mas declara Onda ${e.onda}`);
    if (e.caminho !== '01..09_*.md') {
      assert.equal(fs.existsSync(path.join(DIRETORIO_RAIZ, e.caminho)), true, `Arquivo ${e.caminho} declarado na Árvore 8.3 não existe no disco`);
    }
  }

  // 2. Os 5 pilares: módulo e portão existem na árvore, na mesma Onda, com 3 mutações reais cada
  assert.deepEqual(consolidacao.pilares.map((p) => p.id), [
    'PILAR_1_ECONOMIA',
    'PILAR_2_CHEFE_BESTIARIO',
    'PILAR_3_TOPOLOGIA_BEAM',
    'PILAR_4_EVENTOS_SOS',
    'PILAR_5_ACTION_SCHEMA_ONDA6',
  ]);
  for (const p of consolidacao.pilares) {
    assert.ok(ondaDe.has(p.moduloSrc), `Módulo ${p.moduloSrc} do pilar ${p.id} no Vol. 09 não consta na Árvore de Módulos do Vol. 08 (Seção 8.3)`);
    assert.ok(ondaDe.has(p.portaoTeste), `Portão de teste ${p.portaoTeste} do pilar ${p.id} no Vol. 09 não consta na Árvore de Módulos do Vol. 08 (Seção 8.3)`);
    assert.equal(
      ondaDe.get(p.moduloSrc),
      ondaDe.get(p.portaoTeste),
      `Pilar ${p.id} mistura Onda ${ondaDe.get(p.moduloSrc)} (módulo) com Onda ${ondaDe.get(p.portaoTeste)} (portão)`
    );
    assert.equal(p.mutacoesReais.length, 3, `Pilar ${p.id} na Seção 9.1 deve listar exatamente 3 mutações reais`);
    for (const mutId of p.mutacoesReais) assert.ok(idsMutacoesJson.has(mutId), `Mutação ${mutId} do pilar ${p.id} não existe em mutacoes.json`);
  }

  // 3. Máquina de ciclo: fases = enum do Vol. 08, zero beco sem saída, modalidades = enum
  const fases = enums['meta.faseJogo'];
  const grafo = analisarGrafoCicloPartida(consolidacao.transicoesCiclo, fases);
  assert.deepEqual(grafo.fasesForaDoEnum, [], `Transições da Seção 9.2 usam fase fora do enum meta.faseJogo: ${grafo.fasesForaDoEnum.join(', ')}`);
  assert.deepEqual(grafo.semSaida, [], `Máquina de ciclo da Seção 9.2 tem fase(s) sem saída (beco sem saída): ${grafo.semSaida.join(', ')}`);
  assert.deepEqual(grafo.inalcancaveis, [], `Fase(s) inalcançável(is) a partir de INICIO na Seção 9.2: ${grafo.inalcancaveis.join(', ')}`);
  assert.deepEqual(grafo.semCaminhoParaFim, [], `Fase(s) sem caminho até FIM_DE_RUN na Seção 9.2: ${grafo.semCaminhoParaFim.join(', ')}`);
  assert.equal(grafo.finalTemSaida, false, 'FIM_DE_RUN tem de ser terminal');
  assert.equal(new Set(consolidacao.transicoesCiclo.map((t) => t.id)).size, consolidacao.transicoesCiclo.length);
  const tr6 = consolidacao.transicoesCiclo.find((t) => t.id === 'TR_6_ENCERRAR_COMBATE_VIVO');
  const modalidadesTr6 = enums.modalidadeVitoria.filter((m) => tr6.gatilho.includes(m));
  const nomesMaiusculosTr6 = [...tr6.gatilho.matchAll(/\b([A-Z]+_[A-Z_]+)\b/g)].map((m) => m[1]).filter((n) => n !== 'SALTO_FUGA');
  assert.deepEqual(nomesMaiusculosTr6, enums.modalidadeVitoria, 'Modalidades de vitória da Seção 9.2 (Vol. 09) divergem dos Enums Canônicos da Seção 8.1 (Vol. 08)');
  assert.deepEqual(modalidadesTr6, enums.modalidadeVitoria);

  const trCombate = transicionarFaseCicloPartida(consolidacao, 'MAPA', 'TR_1_INICIAR_NO_COMBATE');
  assert.equal(trCombate.faseResultante, 'COMBATE');
  assert.equal(trCombate.apagaRunSavePermadeath, false);
  const trDerrota = transicionarFaseCicloPartida(consolidacao, 'COMBATE', 'TR_7A_DERROTA_EM_COMBATE');
  assert.equal(trDerrota.faseResultante, 'FIM_DE_RUN');
  assert.equal(trDerrota.apagaRunSavePermadeath, true, 'TR_7A_DERROTA_EM_COMBATE deve apagar run_save.json (Permadeath) preservando profile.json');
  assert.equal(trDerrota.preservaProfileJson, true);
  const trVitoria = transicionarFaseCicloPartida(consolidacao, 'COMBATE', 'TR_7B_VITORIA_FINAL');
  assert.equal(trVitoria.apagaRunSavePermadeath, true);
  assert.equal(trVitoria.atualizaProfileJson, true, 'TR_7B_VITORIA_FINAL deve atualizar o profile.json (estatísticas e desbloqueios)');
  assert.equal(transicionarFaseCicloPartida(consolidacao, 'EVENTO', 'TR_7C_DERROTA_EM_EVENTO').apagaRunSavePermadeath, true);
  assert.equal(transicionarFaseCicloPartida(consolidacao, 'LOJA', 'TR_5B_SAIR_LOJA').faseResultante, 'MAPA');
  assert.equal(transicionarFaseCicloPartida(consolidacao, 'LOJA', 'TR_7A_DERROTA_EM_COMBATE').aceita, false);

  // 4. Streams PRNG: assinatura pura, consumidor na árvore, e algoritmo com vetor de teste
  assert.equal(consolidacao.streamsPrng.length, 6, 'Seção 9.3 deve especificar exatamente os 6 Streams isolados de PRNG');
  for (const s of consolidacao.streamsPrng) {
    assert.ok(s.assinaturaChave.startsWith('hash32(seedPartida,'), `Stream ${s.id} na Seção 9.3 deve usar assinatura pura hash32(seedPartida, ...)`);
    assert.ok(ondaDe.has(s.moduloConsumidor), `Consumidor ${s.moduloConsumidor} do stream ${s.id} não consta na Árvore 8.3`);
  }
  assert.equal(consolidacao.algoritmoHash.nome, 'FNV-1a de 32 bits');
  assert.equal(consolidacao.algoritmoHash.base, HASH32_BASE_FNV, 'Base do FNV-1a da Seção 9.3 diverge do oráculo');
  assert.equal(consolidacao.algoritmoHash.primo, HASH32_PRIMO_FNV, 'Primo do FNV-1a da Seção 9.3 diverge do oráculo');
  const v = consolidacao.vetorTesteHash;
  assert.equal(
    calcularHash32StreamDeterministico(v.seed, v.dominio, ...v.coordenadas),
    v.valor,
    'Vetor de teste do hash32 da Seção 9.3 diverge do FNV-1a recalculado'
  );
  assert.ok(ondaDe.has('src/onda1-fisica/hash32-streams.mjs'), 'O hash32 precisa de dono único na Árvore 8.3');

  // Anti-Butterfly: rolagens de combate nunca alteram o hash de um nó de evento; domínios distintos não colidem
  const antes = calcularHash32StreamDeterministico('biofoil-seed-01', 'EVENTO_NO', 2, 'NO_SOS_3');
  for (let tick = 1; tick <= 20; tick += 1) calcularHash32StreamDeterministico('biofoil-seed-01', 'COMBATE_TICK', 1, 'NO_1', tick, 0);
  assert.equal(calcularHash32StreamDeterministico('biofoil-seed-01', 'EVENTO_NO', 2, 'NO_SOS_3'), antes);
  assert.notEqual(antes, calcularHash32StreamDeterministico('biofoil-seed-01', 'LOJA_FORJA', 2, 'NO_SOS_3'));

  assert.equal(consolidacao.temContraAuditoria9Completa, true);
  assert.ok(!/100\\?%\$? fechado/.test(cadeia.volumes[8].conteudo), 'Contra-Auditoria #9 não pode alegar "100% fechado"');
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
