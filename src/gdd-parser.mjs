import fs from 'node:fs';
import path from 'node:path';

export const CADEIA_CANONICA_GDD = Object.freeze([
  '01_matematica_base_e_auditoria.md',
  '02_wireframe_ui_e_auditoria.md',
  '03_vertical_slice_combate_e_auditoria.md',
  '04_mapa_procedural_e_auditoria.md',
  '05_conteudo_chefe_e_auditoria_final.md',
  '06_prova_formal_matriz_e_limites.md',
  '07_plano_mestre_de_testes_14_leis.md',
  '08_contrato_estado_e_arquitetura_modulos.md',
]);

export const CADEIA_CANONICA_TESTES = Object.freeze([
  '01-portao-gdd.test.mjs',
  '02-hook-ambiente.test.mjs',
]);

export const CADEIA_CANONICA_SRC = Object.freeze([
  'gdd-parser.mjs',
]);

export const CADEIA_CANONICA_SCRIPTS = Object.freeze([
  'auditar-frente.sh',
  'hooks/pre-commit',
  'hooks/pre-push',
]);

export const CADEIA_CANONICA_PROTOCOLO = Object.freeze([
  'LEIS-DE-TESTE.md',
  'MUTACOES.md',
]);

function clonarProfundoCongelado(obj) {
  const copia = structuredClone(obj);
  const congelar = (alvo) => {
    if (alvo && typeof alvo === 'object') {
      Object.freeze(alvo);
      for (const chave of Object.keys(alvo)) {
        congelar(alvo[chave]);
      }
    }
    return alvo;
  };
  return congelar(copia);
}

/**
 * Lei L5: Portão de estado final com cadeia inteira + tripwire de diretório.
 * Lei L2: Retorna estrutura nova e congelada a cada chamada.
 */
export function carregarCadeiaCanonicaGdd(diretorioRaiz) {
  const entradasRaiz = fs.readdirSync(diretorioRaiz, { withFileTypes: true });
  const arquivosMdNoDiretorio = entradasRaiz
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => e.name)
    .sort();

  const esperadosOrdenados = [...CADEIA_CANONICA_GDD].sort();
  const faltando = esperadosOrdenados.filter((f) => !arquivosMdNoDiretorio.includes(f));
  const extrasForaDaLista = arquivosMdNoDiretorio.filter((f) => !esperadosOrdenados.includes(f));

  if (faltando.length > 0 || extrasForaDaLista.length > 0) {
    throw new Error(
      `[L5 TRIPWIRE FALHOU] Cadeia incompleta ou item fora da lista. Faltando=[${faltando.join(', ')}] Extras=[${extrasForaDaLista.join(', ')}]`
    );
  }

  const volumes = CADEIA_CANONICA_GDD.map((nomeArquivo, indice) => {
    const caminhoCompleto = path.join(diretorioRaiz, nomeArquivo);
    const conteudo = fs.readFileSync(caminhoCompleto, 'utf8');
    return {
      ordem: indice + 1,
      arquivo: nomeArquivo,
      bytes: Buffer.byteLength(conteudo, 'utf8'),
      linhas: conteudo.split('\n').length,
      conteudo,
    };
  });

  return clonarProfundoCongelado({
    cadeiaDeclarada: [...CADEIA_CANONICA_GDD],
    arquivosExaminados: volumes.length,
    volumes,
  });
}

/**
 * Extrai a Tabela SSOT (Seção 6.1) e a Matriz 5x8 (Seção 6.2) do Volume 06.
 */
export function extrairSsotEMatrizDoVolume06(conteudoVol06) {
  const linhas = conteudoVol06.split('\n');
  const constantesSsot = {};
  const celulasMatriz = [];
  const limitesExtremos = [];
  const niveisPrecedencia = [];

  let secaoAtual = '';
  for (const linha of linhas) {
    if (linha.startsWith('## 6.1.')) secaoAtual = '6.1';
    else if (linha.startsWith('## 6.2.')) secaoAtual = '6.2';
    else if (linha.startsWith('## 6.3.')) secaoAtual = '6.3';
    else if (linha.startsWith('## 6.4.')) secaoAtual = '6.4';

    if (secaoAtual === '6.1' && linha.startsWith('| `')) {
      const colunas = linha
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
      if (colunas.length >= 4) {
        const id = colunas[0].replace(/`/g, '');
        constantesSsot[id] = {
          id,
          valorBruto: colunas[1],
          escopo: colunas[2],
          ondeAtua: colunas[3],
        };
      }
    }

    if (secaoAtual === '6.2' && linha.startsWith('| **')) {
      const colunas = linha
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
      if (colunas.length === 6) {
        const evento = colunas[0].replace(/\*\*/g, '');
        const estados = [
          '1_NO_FOIL',
          '2_TOUCHDOWN',
          '3_SPOOL_UP',
          '4_FURTIVO_AR',
          '5_FURTIVO_AGUA',
        ];
        estados.forEach((estadoId, idx) => {
          const regra = colunas[idx + 1];
          if (!regra || regra.length < 10 || /\b(TODO|TBD|FIXME)\b/i.test(regra)) {
            throw new Error(`[Vol 06 Matriz 6.2] Célula inválida ou incompleta em (${evento} x ${estadoId}): "${regra}"`);
          }
          celulasMatriz.push({
            evento,
            estado: estadoId,
            regra,
          });
        });
      }
    }

    if (secaoAtual === '6.3' && linha.startsWith('### Limite Extremo ')) {
      limitesExtremos.push(linha.replace(/^###\s+/, '').trim());
    }

    if (secaoAtual === '6.4' && /^\d+\.\s+\*\*Nível\s+\d+/.test(linha)) {
      niveisPrecedencia.push(linha.trim());
    }
  }

  return clonarProfundoCongelado({
    totalConstantes: Object.keys(constantesSsot).length,
    constantesSsot,
    totalCelulasMatriz: celulasMatriz.length,
    celulasMatriz,
    limitesExtremos,
    niveisPrecedencia,
  });
}

/**
 * Lei L3: Zero por ausência não é zero por cálculo.
 * Permissão viaja por canal próprio ({ canalPermissao, status, valor }).
 */
export function consultarConstanteSsotComPermissao(ssotMapa, chave, contextoPermissao) {
  if (!contextoPermissao || contextoPermissao.autorizado !== true) {
    return clonarProfundoCongelado({
      canalPermissao: 'NEGADO',
      status: 'SEM_PERMISSAO',
      marcadorExplicito: 'ACESSO_BLOQUEADO_CANAL_PERMISSAO',
      valor: undefined,
    });
  }

  if (!Object.prototype.hasOwnProperty.call(ssotMapa, chave)) {
    return clonarProfundoCongelado({
      canalPermissao: 'AUTORIZADO',
      status: 'NAO_ENCONTRADO',
      marcadorExplicito: 'CHAVE_INEXISTENTE_NO_SSOT',
      valor: undefined,
    });
  }

  return clonarProfundoCongelado({
    canalPermissao: 'AUTORIZADO',
    status: 'OK',
    marcadorExplicito: 'VALOR_PRESENTE',
    valor: ssotMapa[chave],
  });
}

/**
 * Extrai os 7 Chassis de Armas, 6 Órgãos e 5 Naves Desbloqueáveis do Volume 05.
 */
export function extrairCatalogoVolume05(conteudoVol05) {
  const linhas = conteudoVol05.split('\n');
  const armas = [];
  const orgaos = [];
  const biomas = [];
  const naves = [];
  const fasesChefe = [];

  let secao = '';
  for (const linha of linhas) {
    if (linha.startsWith('## 5.1.')) secao = '5.1';
    else if (linha.startsWith('## 5.2.')) secao = '5.2';
    else if (linha.startsWith('## 5.3.')) secao = '5.3';
    else if (linha.startsWith('## 5.4.')) secao = '5.4';
    else if (linha.startsWith('## 5.5.')) secao = '5.5';
    else if (linha.startsWith('# CONTRA-AUDITORIA')) secao = 'AUDITORIA';

    if (secao === '5.1' && linha.startsWith('| **')) {
      const cols = linha
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
      if (cols.length >= 7) {
        const nome = cols[0].replace(/\*\*/g, '');
        const energia = Number(cols[1].replace(/[^0-9.]/g, ''));
        const pesoKg = Number(cols[2].match(/(\d+(?:\.\d+)?)/)?.[1]);
        const recargaSeg = Number(cols[3].match(/(\d+(?:\.\d+)?)/)?.[1]);
        const municao = Number(cols[4].replace(/[^0-9.]/g, ''));
        const soquetes = Number(cols[6].replace(/[^0-9.]/g, ''));
        armas.push({ nome, energia, pesoKg, recargaSeg, municao, soquetes });
      }
    }

    if (secao === '5.2' && /^\d+\.\s+\*\*/.test(linha)) {
      const nome = linha.match(/^\d+\.\s+\*\*([^*]+)\*\*/)?.[1] ?? linha;
      orgaos.push({ nome });
    }

    if (secao === '5.3' && /^\d+\.\s+\*\*/.test(linha)) {
      const nome = linha.match(/^\d+\.\s+\*\*([^*]+)\*\*/)?.[1] ?? linha;
      biomas.push({ nome });
    }

    if (secao === '5.4' && linha.startsWith('| **')) {
      const cols = linha
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
      if (cols.length >= 5) {
        const nome = cols[0].replace(/\*\*/g, '');
        const diferencial = cols[3];
        const pesosEncontrados = [...diferencial.matchAll(/\\mathbf\{(\d+(?:\.\d+)?)\\text\{\s*kg\}\}/g)].map(
          (m) => Number(m[1])
        );
        naves.push({
          nome,
          estilo: cols[1],
          tripulacao: cols[2],
          pesoTotalKgDeclarado: pesosEncontrados[0] ?? null,
          sustentacaoInicialKgDeclarada: pesosEncontrados[1] ?? null,
          diferencialBruto: diferencial,
        });
      }
    }

    if (secao === '5.5' && linha.startsWith('### Fase ')) {
      fasesChefe.push(linha.replace(/^###\s+/, '').trim());
    }
  }

  const matchPesoOrgao = conteudoVol05.match(/Cada Órgão adiciona \*\*\$\+(\d+(?:\.\d+)?)\\text\{ kg\}\$\*\*/);
  const pesoPorOrgaoKg = matchPesoOrgao ? Number(matchPesoOrgao[1]) : NaN;

  return clonarProfundoCongelado({
    armas,
    orgaos,
    biomas,
    pesoPorOrgaoKg,
    naves,
    fasesChefe,
  });
}

/**
 * Motor Matemático Canônico do Bio-Foil (usado na Junção N1 contra os documentos 01..06).
 */
export function calcularPesoTotalNave({
  pesoChassiKg,
  aguaPorCamaraKg,
  pesosArmasAtivasKg = [],
  pesosCargaPoraoKg = [],
  quantidadeOrgaosEnxertados = 0,
  nivelBlindagem = 0,
}) {
  if (!Array.isArray(aguaPorCamaraKg) || aguaPorCamaraKg.length !== 8) {
    throw new Error(`A nave exige exatamente 8 câmaras (recebido: ${aguaPorCamaraKg?.length})`);
  }
  const somaAgua = aguaPorCamaraKg.reduce((acc, v) => acc + v, 0);
  const somaArmas = pesosArmasAtivasKg.reduce((acc, v) => acc + v, 0);
  const somaPorao = pesosCargaPoraoKg.reduce((acc, v) => acc + v, 0);
  const somaOrgaos = quantidadeOrgaosEnxertados * 5;
  const somaBlindagem = nivelBlindagem * 15;
  return pesoChassiKg + somaAgua + somaArmas + somaPorao + somaOrgaos + somaBlindagem;
}

export function calcularSustentacaoAtual({
  barrasIntactasMastro,
  barrasEnergiaSifao,
  aguaTotalTanquesKg,
}) {
  if (barrasIntactasMastro <= 0 || barrasEnergiaSifao <= 0) {
    return 0;
  }
  const tabelaMastroPorBarras = {
    1: 50,
    2: 100,
    3: 150,
    4: 200,
    5: 240,
    6: 280,
    7: 330,
  };
  const baseMastro = tabelaMastroPorBarras[barrasIntactasMastro];
  if (baseMastro === undefined) {
    throw new Error(`Barras de mastro fora do intervalo [0..7]: ${barrasIntactasMastro}`);
  }
  const empuxoSifao = barrasEnergiaSifao * 30;
  const deficitCavitacaoKg = Math.max(0, 62.5 - aguaTotalTanquesKg);
  const penalidadeCavitacao = deficitCavitacaoKg * 2;
  return Math.max(0, baseMastro + empuxoSifao - penalidadeCavitacao);
}

export function calcularVelocidadeCruzeiro({ sustentacaoAtualKg, pesoTotalKg }) {
  if (sustentacaoAtualKg <= 0 || pesoTotalKg <= 0) {
    return 0;
  }
  const velocidadeBruta = 9.5 * (sustentacaoAtualKg / pesoTotalKg);
  return Math.min(15.0, Math.round(velocidadeBruta * 10) / 10);
}

export function calcularTempoRecargaArma({
  tempoChassiSeg,
  penalidadeOrgaosSeg = 0,
  reducaoOperador = 0,
  emTouchdown = false,
}) {
  const reducaoTouchdown = emTouchdown ? 0.25 : 0;
  const multiplicador = Math.max(0.5, 1.0 - reducaoOperador - reducaoTouchdown);
  return (tempoChassiSeg + penalidadeOrgaosSeg) * multiplicador;
}

/**
 * Extrai e audita o Baralho Procedural de Nós do Volume 04 (Seção 4.4: soma = 20 nós base).
 */
export function extrairBaralhoVolume04(conteudoVol04) {
  const secao44 = conteudoVol04.split('## 4.4.')[1]?.split('# CONTRA-AUDITORIA')[0] ?? '';
  const cotas = [];
  for (const linha of secao44.split('\n')) {
    if (linha.startsWith('* **')) {
      const nums = [...linha.matchAll(/(\d+)\s+Nó(?:s)?(?![a-zA-ZÀ-ÿ])/g)].map((m) => Number(m[1]));
      if (nums.length > 0) {
        cotas.push(...nums);
      }
    }
  }
  const somaTotalNosBase = cotas.reduce((acc, n) => acc + n, 0);
  return clonarProfundoCongelado({
    cotas,
    somaTotalNosBase,
  });
}

/**
 * Extrai e audita os marcos temporais da Simulação do Volume 03 (Seção 3.4: t = 0.0s a t = 32.75s).
 */
export function extrairSimulacaoVolume03(conteudoVol03) {
  const secao34 = conteudoVol03.split('## 3.4.')[1]?.split('# CONTRA-AUDITORIA')[0] ?? '';
  const timestamps = [...secao34.matchAll(/\$t = (\d+(?:\.\d+)?)\\text\{s\}\$/g)].map((m) => Number(m[1]));
  const unicosOrdenados = [...new Set(timestamps)].sort((a, b) => a - b);
  return clonarProfundoCongelado({
    timestampsUnicos: unicosOrdenados,
    possuiDanoBaiacu85Hp: /100 \\rightarrow 85\\text\{ HP\}/.test(secao34),
    possuiCalculoAfogamento28Hp: /100 - 15 - 57 = \\mathbf\{28\\text\{ HP\}\}/.test(secao34),
    possuiQuedaMarinheiros13Hp: /\$13\\text\{ HP\}\$ cada/.test(secao34),
    possuiEliminacaoMarinheiros0Hp: /13\\text\{ HP\} \\rightarrow 0\\text\{ HP\}/.test(secao34),
  });
}

/**
 * Extrai e valida o Contrato JSON do GameState (Seção 8.1), a Tabela L3 (8.2) e as Junções N1 (8.4) do Volume 08.
 */
export function extrairContratoEstadoVolume08(conteudoVol08) {
  const matchJson = conteudoVol08.match(/```json\n([\s\S]*?)\n```/);
  if (!matchJson) {
    throw new Error('[Vol 08] Bloco JSON do GameState não encontrado');
  }
  const gameState = JSON.parse(matchJson[1]);
  const dominiosRaiz = Object.keys(gameState);

  const linhas = conteudoVol08.split('\n');
  let secao = '';
  const linhasTabelaL3 = [];
  const juncoesN1 = [];

  for (const linha of linhas) {
    if (linha.startsWith('## 8.2.')) secao = '8.2';
    else if (linha.startsWith('## 8.3.')) secao = '8.3';
    else if (linha.startsWith('## 8.4.')) secao = '8.4';
    else if (linha.startsWith('# CONTRA-AUDITORIA')) secao = 'AUDITORIA';

    if (secao === '8.2' && linha.startsWith('| ') && !linha.startsWith('| Situação') && !linha.startsWith('| :---')) {
      const cols = linha.split('|').map((c) => c.trim()).filter(Boolean);
      if (cols.length >= 5) {
        linhasTabelaL3.push({
          situacao: cols[0],
          canalPermissao: cols[1].replace(/`/g, ''),
          status: cols[2].replace(/`/g, ''),
          marcadorExplicito: cols[3].replace(/`/g, ''),
          dados: cols[4],
        });
      }
    }

    if (secao === '8.4' && /^\d+\.\s+\*\*Junção/.test(linha)) {
      juncoesN1.push(linha);
    }
  }

  return clonarProfundoCongelado({
    gameState,
    dominiosRaiz,
    linhasTabelaL3,
    juncoesN1,
  });
}

/**
 * Lei L5 + Seção 3.5: Tripwire da pasta tests/ e auditoria estrutural de padrao/protocolo/MUTACOES.md.
 */
export function verificarCadeiaTestesEMutacoes(diretorioRaiz) {
  const pastaTestes = path.join(diretorioRaiz, 'tests');
  const arquivosTesteNoDisco = fs
    .readdirSync(pastaTestes, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.test.mjs'))
    .map((e) => e.name)
    .sort();

  const esperadosOrdenados = [...CADEIA_CANONICA_TESTES].sort();
  const faltando = esperadosOrdenados.filter((f) => !arquivosTesteNoDisco.includes(f));
  const extras = arquivosTesteNoDisco.filter((f) => !esperadosOrdenados.includes(f));

  if (faltando.length > 0 || extras.length > 0) {
    throw new Error(
      `[L5 TRIPWIRE TESTES FALHOU] Suíte de testes fora da cadeia canônica. Faltando=[${faltando.join(', ')}] Extras=[${extras.join(', ')}]`
    );
  }

  const pastaSrc = path.join(diretorioRaiz, 'src');
  if (fs.existsSync(pastaSrc)) {
    const arquivosSrcNoDisco = fs
      .readdirSync(pastaSrc, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .sort();
    const esperadosSrc = [...CADEIA_CANONICA_SRC].sort();
    const faltandoSrc = esperadosSrc.filter((f) => !arquivosSrcNoDisco.includes(f));
    const extrasSrc = arquivosSrcNoDisco.filter((f) => !esperadosSrc.includes(f));
    if (faltandoSrc.length > 0 || extrasSrc.length > 0) {
      throw new Error(
        `[L5 TRIPWIRE SRC FALHOU] Módulo em src/ fora da cadeia canônica. Faltando=[${faltandoSrc.join(', ')}] Extras=[${extrasSrc.join(', ')}]`
      );
    }
  }

  const pastaScripts = path.join(diretorioRaiz, 'scripts');
  if (fs.existsSync(pastaScripts)) {
    const listarRecursivo = (dir, prefixo = '') => {
      const itens = [];
      for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = prefixo ? `${prefixo}/${entrada.name}` : entrada.name;
        if (entrada.isDirectory()) {
          itens.push(...listarRecursivo(path.join(dir, entrada.name), rel));
        } else if (entrada.isFile()) {
          itens.push(rel);
        }
      }
      return itens;
    };
    const scriptsNoDisco = listarRecursivo(pastaScripts).sort();
    const esperadosScripts = [...CADEIA_CANONICA_SCRIPTS].sort();
    const faltandoScripts = esperadosScripts.filter((f) => !scriptsNoDisco.includes(f));
    const extrasScripts = scriptsNoDisco.filter((f) => !esperadosScripts.includes(f));
    if (faltandoScripts.length > 0 || extrasScripts.length > 0) {
      throw new Error(
        `[L5 TRIPWIRE SCRIPTS FALHOU] Script em scripts/ fora da cadeia canônica. Faltando=[${faltandoScripts.join(', ')}] Extras=[${extrasScripts.join(', ')}]`
      );
    }
  }

  const pastaProtocolo = path.join(diretorioRaiz, 'padrao', 'protocolo');
  if (fs.existsSync(pastaProtocolo)) {
    const arquivosProtoNoDisco = fs
      .readdirSync(pastaProtocolo, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .sort();
    const esperadosProto = [...CADEIA_CANONICA_PROTOCOLO].sort();
    const faltandoProto = esperadosProto.filter((f) => !arquivosProtoNoDisco.includes(f));
    const extrasProto = arquivosProtoNoDisco.filter((f) => !esperadosProto.includes(f));
    if (faltandoProto.length > 0 || extrasProto.length > 0) {
      throw new Error(
        `[L5 TRIPWIRE PROTOCOLO FALHOU] Arquivo em padrao/protocolo/ fora da cadeia canônica. Faltando=[${faltandoProto.join(', ')}] Extras=[${extrasProto.join(', ')}]`
      );
    }
  }

  const caminhoMutacoes = path.join(diretorioRaiz, 'padrao', 'protocolo', 'MUTACOES.md');
  const conteudoMutacoes = fs.readFileSync(caminhoMutacoes, 'utf8');
  const linhasMutacao = conteudoMutacoes
    .split('\n')
    .filter((l) => l.startsWith('| `MUT-'));

  if (linhasMutacao.length === 0) {
    throw new Error('[N4 / Seção 3.5 FALHOU] Zero mutações encontradas em MUTACOES.md');
  }

  const idsVistos = new Set();
  const mutacoes = linhasMutacao.map((linha, idx) => {
    const cols = linha
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    const id = cols[0]?.replace(/`/g, '') ?? '';
    const alvo = cols[1] ?? '';
    const lei = cols[2] ?? '';
    const descricao = cols[3] ?? '';
    const primeiraLinhaFalha = cols[4]?.replace(/`/g, '') ?? '';

    const idEsperado = `MUT-${String(idx + 1).padStart(2, '0')}`;
    if (id !== idEsperado || idsVistos.has(id)) {
      throw new Error(
        `[L5 / Seção 3.5 FALHOU] ID de mutação fora de sequência ou duplicado: recebido="${id}", esperado="${idEsperado}"`
      );
    }
    idsVistos.add(id);

    if (!id || !alvo || !descricao || !/(Error|AssertionError)/.test(primeiraLinhaFalha)) {
      throw new Error(
        `[L6 / Seção 3.5 FALHOU] Mutação ${id || 'SEM_ID'} sem primeira linha de falha real medida: "${primeiraLinhaFalha}"`
      );
    }
    return { id, alvo, lei, descricao, primeiraLinhaFalha };
  });

  return clonarProfundoCongelado({
    testesDeclarados: [...CADEIA_CANONICA_TESTES],
    totalTestesExaminados: arquivosTesteNoDisco.length,
    totalMutacoesExaminadas: mutacoes.length,
    mutacoes,
  });
}
