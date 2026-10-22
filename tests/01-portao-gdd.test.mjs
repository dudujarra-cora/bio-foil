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
} from '../src/gdd-parser.mjs';

const DIRETORIO_RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Lei N2: Lista-catraca.
 * Se um defeito aberto na lista passar a verde, o teste reprova até sair da lista.
 */
const LISTA_CATRACA = Object.freeze([]);

test('Portão L5 + N4: aplica a cadeia canônica inteira (01..06) na ordem e valida tripwire de diretório', () => {
  const resultado = carregarCadeiaCanonicaGdd(DIRETORIO_RAIZ);

  console.log(`[N4] Arquivos .md examinados na cadeia canônica: ${resultado.arquivosExaminados}`);
  assert.ok(resultado.arquivosExaminados > 0, '[N4] Zero arquivos examinados deve reprovar');
  assert.equal(resultado.arquivosExaminados, 6, 'Deve examinar exatamente os 6 volumes canônicos');

  assert.deepEqual(resultado.cadeiaDeclarada, [
    '01_matematica_base_e_auditoria.md',
    '02_wireframe_ui_e_auditoria.md',
    '03_vertical_slice_combate_e_auditoria.md',
    '04_mapa_procedural_e_auditoria.md',
    '05_conteudo_chefe_e_auditoria_final.md',
    '06_prova_formal_matriz_e_limites.md',
  ]);

  // Prova do Tripwire L5: criar um diretório temporário com item extra fora da lista deve dar vermelho
  const pastaTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ftl-tripwire-l5-'));
  try {
    for (const v of resultado.volumes) {
      fs.writeFileSync(path.join(pastaTmp, v.arquivo), v.conteudo, 'utf8');
    }
    fs.writeFileSync(path.join(pastaTmp, '07_arquivo_intruso_nao_declarado.md'), '# Intruso', 'utf8');
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

  const { totalConstantes, constantesSsot, totalCelulasMatriz, celulasMatriz } =
    extrairSsotEMatrizDoVolume06(vol06);

  console.log(`[N4] Constantes SSOT examinadas: ${totalConstantes}`);
  console.log(`[N4] Células da Matriz de Estados 5x8 examinadas: ${totalCelulasMatriz}`);

  assert.equal(totalConstantes, 26, 'A Tabela SSOT 6.1 deve conter exatamente 26 constantes canônicas');
  assert.equal(totalCelulasMatriz, 40, 'A Matriz 6.2 (5 estados x 8 eventos) deve conter 40 células');

  // L4: Asserções contra valores literais reais e cruzamento com o texto dos Volumes 01..05
  assert.equal(constantesSsot.NUM_CAMARAS_NAVE.valorBruto, '$8\\text{ câmaras}$');
  assert.equal(constantesSsot.CAP_AGUA_CAMARA.valorBruto, '$12.5\\text{ kg}$');
  assert.equal(constantesSsot.RESERVA_MIN_SIFAO.valorBruto, '$62.5\\text{ kg}$');
  assert.equal(constantesSsot.SLOTS_ARMAS_ATIVAS.valorBruto, '$4\\text{ slots}$');
  assert.equal(constantesSsot.SUSTENTACAO_MAX_ABS.valorBruto, '$480.0\\text{ kg}$');
  assert.equal(constantesSsot.TEMPO_SPOOL_UP.valorBruto, '$3.0\\text{ s}$');

  // Cruzamento N1 com Volume 01, 02, 03 e 04
  assert.match(vol01, /4\\text\{ Slots de Armas Ativas\}/, 'Vol. 01 deve declarar 4 Slots de Armas Ativas');
  assert.match(vol01, /8 \\times 12\.5\\text\{ kg\} = \\mathbf\{100\\text\{ kg\}\}/, 'Vol. 01 deve manter 8 x 12.5 kg = 100 kg');
  assert.match(vol02, /\[ARMAS: 4 SLOTS \(3 BARRAS\)\]/, 'Vol. 02 Wireframe deve exibir 4 SLOTS de armas');
  assert.match(vol02, /\[3: VAZIO\]\s+\[4: VAZIO\]/, 'Vol. 02 Wireframe deve listar os slots 3 e 4 vazios na nave inicial');
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
  const vol05 = cadeia.volumes[4].conteudo;
  const catalogo = extrairCatalogoVolume05(vol05);

  console.log(
    `[N4] Catálogo Vol. 05 examinado: ${catalogo.armas.length} armas, ${catalogo.orgaos.length} órgãos, ${catalogo.naves.length} naves`
  );

  assert.equal(catalogo.armas.length, 7, 'Catálogo 5.1 deve ter exatamente 7 chassis de armas');
  assert.equal(catalogo.orgaos.length, 6, 'Catálogo 5.2 deve ter exatamente 6 órgãos de enxerto');
  assert.equal(catalogo.pesoPorOrgaoKg, 5, 'Cada órgão deve pesar exatamente +5 kg');
  assert.equal(catalogo.naves.length, 5, 'Catálogo 5.4 deve ter exatamente 5 naves desbloqueáveis');

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

  // Simulação do Passo 3: tempos de recarga resfriados em Touchdown (-25%)
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
