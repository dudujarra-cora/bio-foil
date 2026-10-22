import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  carregarMutacoes,
  executarMutacoes,
  renderizarBlocoMd,
  extrairBlocoMd,
} from '../scripts/rodar-mutacoes.mjs';

const DIRETORIO_RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('B6 / L6 / L7: toda mutação de mutacoes.json é RE-EXECUTADA numa cópia e fica vermelha pelo motivo declarado', () => {
  const mutacoes = carregarMutacoes(DIRETORIO_RAIZ);
  assert.ok(mutacoes.length > 0, '[N4] Zero mutações declaradas deve reprovar');

  // IDs sequenciais, sem buraco nem duplicata; cada mutação declara arquivo, lei, testes e falha esperada
  mutacoes.forEach((m, idx) => {
    assert.equal(m.id, `MUT-${String(idx + 1).padStart(2, '0')}`, `ID fora de sequência: ${m.id}`);
    assert.ok(m.arquivo && m.lei && m.descricao && m.falhaEsperada, `${m.id} incompleta`);
    assert.ok(Array.isArray(m.trocas) && m.trocas.length > 0, `${m.id} sem trocas`);
    assert.ok(Array.isArray(m.testes) && m.testes.length > 0, `${m.id} sem testes`);
    assert.ok(!m.testes.includes('tests/09-mutacoes-reais.test.mjs'), `${m.id} não pode rodar o próprio executor (recursão)`);
  });

  const { baselineVerde, resultados } = executarMutacoes(DIRETORIO_RAIZ);
  assert.equal(baselineVerde, true);

  let conferidas = 0;
  for (const r of resultados) {
    assert.equal(r.desatualizada, null, `${r.id} desatualizada: ${r.desatualizada}`);
    assert.equal(r.vermelho, true, `${r.id} NÃO ficou vermelha: o portão não vê esta quebra`);
    const esperada = mutacoes.find((m) => m.id === r.id).falhaEsperada;
    assert.ok(r.linha.includes(esperada), `${r.id} ficou vermelha pela razão errada. Esperado conter "${esperada}", medido: "${r.linha}"`);
    conferidas += 1;
  }
  console.log(`[N4] Mutações re-executadas de verdade: ${resultados.length} | vermelhas pelo motivo certo: ${conferidas}`);
  assert.equal(conferidas, mutacoes.length);

  // L7: o registro humano (bloco gerado do MUTACOES.md) tem de ser idêntico ao que acabou de ser MEDIDO
  const md = fs.readFileSync(path.join(DIRETORIO_RAIZ, 'padrao', 'protocolo', 'MUTACOES.md'), 'utf8');
  assert.equal(
    extrairBlocoMd(md),
    renderizarBlocoMd(mutacoes, resultados),
    'MUTACOES.md diverge da medição atual — rode: node scripts/rodar-mutacoes.mjs --gerar-md'
  );
});
