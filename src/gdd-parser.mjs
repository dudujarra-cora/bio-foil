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
  '09-mutacoes-reais.test.mjs',
]);

export const CADEIA_CANONICA_SRC = Object.freeze([
  'gdd-parser.mjs',
]);

export const CADEIA_CANONICA_SCRIPTS = Object.freeze([
  'auditar-frente.sh',
  'hooks/pre-commit',
  'hooks/pre-push',
  'rodar-mutacoes.mjs',
]);

export const CADEIA_CANONICA_PROTOCOLO = Object.freeze([
  'LEIS-DE-TESTE.md',
  'MUTACOES.md',
  'PORTOES.md',
  'mutacoes.json',
]);

/** Arquivos da raiz que não são .md (dotfiles como .git são ignorados). */
export const CADEIA_CANONICA_RAIZ_OUTROS = Object.freeze([
  'package.json',
]);

/** Diretórios da raiz (dot-diretórios ignorados). */
export const CADEIA_CANONICA_DIRS_RAIZ = Object.freeze([
  'padrao',
  'scripts',
  'src',
  'tests',
]);

/** Workflows de CI em .github/workflows (portão no servidor). */
export const CADEIA_CANONICA_WORKFLOWS = Object.freeze([
  'portoes.yml',
]);

/**
 * Lei L6 (B7): remove a formatação LaTeX/Markdown para que as asserções meçam SIGNIFICADO, não formatação.
 * Ex.: "$100 \rightarrow 85\text{ HP}$" -> "100 -> 85 HP".
 */
export function normalizarTexto(texto) {
  let t = String(texto);
  for (let i = 0; i < 4; i += 1) {
    t = t.replace(/\\(?:text|mathbf|textbf|mathrm)\{([^{}]*)\}/g, '$1');
  }
  return t
    .replace(/\\rightarrow\b|\\to\b/g, '->')
    .replace(/\\leftrightarrow\b/g, '<->')
    .replace(/\\times\b/g, 'x')
    .replace(/\\le\b/g, '<=')
    .replace(/\\ge\b/g, '>=')
    .replace(/\\%/g, '%')
    .replace(/\\;/g, ' ')
    .replace(/\$/g, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/[ \t]+/g, ' ');
}

const MAPA_ESPECIES = Object.freeze({
  POLVO: 'POLVO',
  ARRAIA: 'ARRAIA',
  BAIACU: 'BAIACU',
  CARANGUEJO: 'CARANGUEJO',
});

/**
 * B2: Extrai a Tabela de Tripulação do Volume 01 (Seção 1.5) — fonte canônica de HP, velocidade, reparo e DPS.
 */
export function extrairTripulacaoVolume01(conteudoVol01) {
  const secao = conteudoVol01.split('## 1.5.')[1]?.split('\n---')[0] ?? '';
  const especies = [];
  for (const linhaBruta of secao.split('\n')) {
    if (!/^\| \*\*\d+\./.test(linhaBruta)) continue;
    const cols = normalizarTexto(linhaBruta)
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    const nomeLimpo = cols[0].replace(/^\d+\.\s*/, '');
    const chave = nomeLimpo.split(' ')[0].toUpperCase();
    const especie = MAPA_ESPECIES[chave];
    if (!especie) {
      throw new Error(`[Vol 01 Tripulação] Espécie desconhecida na tabela: "${nomeLimpo}"`);
    }
    const reparo = cols[4].match(/([\d.]+)x \(([\d.]+)s \/ ([\d.]+)s\)/);
    if (!reparo) {
      throw new Error(`[Vol 01 Tripulação] Coluna de reparo ilegível para ${especie}: "${cols[4]}"`);
    }
    especies.push({
      especie,
      hpMax: Number(cols[1].match(/([\d.]+) HP/)?.[1]),
      velNado: Number(cols[2].match(/([\d.]+)x/)?.[1]),
      multReparo: Number(reparo[1]),
      reparoSistSeg: Number(reparo[2]),
      reparoFuroSeg: Number(reparo[3]),
      dps: Number(cols[5].match(/([\d.]+) DPS/)?.[1]),
    });
  }
  const linhaMergulhador = normalizarTexto(secao)
    .split('\n')
    .find((l) => l.includes('Mergulhadores de Assalto'));
  return clonarProfundoCongelado({
    especies,
    mergulhadorDps: Number(linhaMergulhador?.match(/(\d+) DPS/)?.[1] ?? NaN),
    tempoInflarBaiacuSeg: Number(
      normalizarTexto(secao).match(/Inflar\):[^|]*?após ([\d.]+)s de ativação/)?.[1] ?? NaN
    ),
  });
}

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
    else if (linha.startsWith('## 5.6.')) secao = '5.6';
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
 * Extrai a Seção 5.6 do Volume 05 (Tabelas Canônicas da Economia: Upgrades, Lojas e Curva Setorial 1..8)
 * e os valores da Falha Global Encontrada 6 (Prova de Solvência vs. Escassez).
 */
export function extrairEconomiaVolume05(conteudoVol05) {
  const secao56 = conteudoVol05.split('## 5.6.')[1]?.split('# CONTRA-AUDITORIA')[0] ?? '';
  const auditoria5 = normalizarTexto(conteudoVol05.split('# CONTRA-AUDITORIA')[1] ?? '');

  const upgrades = [];
  const itensLoja = [];
  const curvaSetores = [];

  let subsecao = '';
  for (const linhaBruta of secao56.split('\n')) {
    if (linhaBruta.startsWith('### A.')) subsecao = 'A';
    else if (linhaBruta.startsWith('### B.')) subsecao = 'B';
    else if (linhaBruta.startsWith('### C.')) subsecao = 'C';

    const linha = normalizarTexto(linhaBruta);
    if (subsecao === 'A' && linhaBruta.startsWith('| **')) {
      const cols = linha
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
      if (cols.length >= 6) {
        const nome = cols[0].replace(/^\d+\.\s*/, '');
        const moeda = cols[1];
        const barrasEnergiaMax = Number(cols[3].match(/(\d+)\s*E/)?.[1] ?? NaN);
        const custosNiveis = cols[4]
          .split('/')
          .map((n) => Number(n.trim()))
          .filter((n) => !Number.isNaN(n));
        const somaDeclarada = Number(cols[5].match(/(\d+)/)?.[1] ?? NaN);
        const somaCalculada = custosNiveis.reduce((acc, v) => acc + v, 0);
        upgrades.push({
          nome,
          moeda,
          nivelInicialBruto: cols[2],
          barrasEnergiaMax,
          custosNiveis,
          somaDeclarada,
          somaCalculada,
        });
      }
    }

    if (subsecao === 'B' && /^\| `(ARMA|ORGAO|TRIPULANTE|INSUMO|REPARO)`/.test(linhaBruta)) {
      const cols = linha
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
      if (cols.length >= 6) {
        const categoria = cols[0];
        const nome = cols[1].replace(/^\d+\.\s*/, '');
        const moeda = cols[2];
        const pesoKg = Number(cols[3].match(/(\d+(?:\.\d+)?)\s*kg/)?.[1] ?? NaN);
        const precosCompra = cols[4]
          .split('/')
          .map((n) => Number(n.trim()))
          .filter((n) => !Number.isNaN(n));
        const valorVenda = Number(cols[5].match(/(\d+)/)?.[1] ?? NaN);
        itensLoja.push({
          categoria,
          nome,
          moeda,
          pesoKg,
          precosCompra,
          precoCompra: precosCompra[0],
          valorVenda,
        });
      }
    }

    if (subsecao === 'C' && /^\| \*\*Setor \d+\*\*/.test(linhaBruta)) {
      const cols = linha
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
      if (cols.length >= 5) {
        const setor = Number(cols[0].match(/Setor (\d+)/)?.[1] ?? NaN);
        curvaSetores.push({
          setor,
          barcoBrutoSucata: Number(cols[1]),
          barcoCapturaSucata: Number(cols[2]),
          monstroBrutoBiomassa: Number(cols[3]),
          monstroCirurgicoBiomassa: Number(cols[4]),
        });
      }
    }
  }

  const textoSecao56Norm = normalizarTexto(secao56);
  const orcamentoTotalDeclarado = Number(
    textoSecao56Norm.match(/Orçamento Total de Maximização Completa[^=]*=\s*(\d+)\s*unidades/)?.[1] ?? NaN
  );
  const limiteTripulacaoDeclarado = Number(
    textoSecao56Norm.match(/limite máximo da tripulação a bordo da nave é de\s*(\d+)\s*animais/)?.[1] ?? NaN
  );
  const pisoBruto1a7Declarado = Number(
    auditoria5.match(/Bruto_\{1\.\.7\}[^\n]*?=\s*(\d+)\s*unidades/)?.[1] ?? NaN
  );
  const tetoMaestria1a7Declarado = Number(
    auditoria5.match(/Maestria_\{1\.\.7\}[^\n]*?=\s*(\d+)\s*unidades/)?.[1] ?? NaN
  );

  return clonarProfundoCongelado({
    upgrades,
    itensLoja,
    curvaSetores,
    orcamentoTotalDeclarado,
    limiteTripulacaoDeclarado,
    pisoBruto1a7Declarado,
    tetoMaestria1a7Declarado,
  });
}

/**
 * Extrai os custos de upgrade do Mastro do Foil declarados no Volume 01 (Seção 1.2.A) para Junção N1 com o Volume 05.
 */
export function extrairCustosMastroVolume01(conteudoVol01) {
  const secao12A = normalizarTexto(conteudoVol01.split('### A. Mastro do Foil')[1]?.split('### B.')[0] ?? '');
  const custos = [...secao12A.matchAll(/Custo:\s*(\d+)\s*Sucata/g)].map((m) => Number(m[1]));
  return clonarProfundoCongelado(custos);
}

/**
 * Extrai os valores de saque do Setor 1 declarados no Volume 03 (Seções 3.2 e 3.3) para Junção N1 com a Curva Setorial do Volume 05.
 */
export function extrairSaqueSetor1Volume03(conteudoVol03) {
  const vol03 = normalizarTexto(conteudoVol03);
  const secao32 = vol03.split('## 3.2.')[1]?.split('## 3.3.')[0] ?? '';
  const secao33 = vol03.split('## 3.3.')[1]?.split('## 3.4.')[0] ?? '';

  const barcoBrutoSucata = Number(secao32.match(/Destruição Bruta[^:]*:\*?\s*(\d+)\s*Sucata/)?.[1] ?? NaN);
  const barcoCapturaSucata = Number(secao32.match(/Barco Intacto\):\*?\s*(\d+)\s*Sucata/)?.[1] ?? NaN);
  const monstroBrutoBiomassa = Number(secao33.match(/Dano Bruto[^:]*:\*?\s*(\d+)\s*Biomassa/)?.[1] ?? NaN);
  const monstroCirurgicoBiomassa = Number(secao33.match(/Vitória Cirúrgica[^:]*:\*?\s*(\d+)\s*Biomassa/)?.[1] ?? NaN);

  return clonarProfundoCongelado({
    barcoBrutoSucata,
    barcoCapturaSucata,
    monstroBrutoBiomassa,
    monstroCirurgicoBiomassa,
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
 * Extrai os 3 parâmetros que decidem o destino dos marinheiros da Lancha (Vol. 03) — cada um de um volume diferente:
 *  - velAgua / arredondaTick: Vol. 01 (Regra de Simetria — Marinheiros Humanos);
 *  - salasCabineMotor: Vol. 02 (Wireframe: Cabine na mesma coluna que a Sala do Motor = 1 sala de distância);
 *  - salaM1: Vol. 03 (para onde o Marinheiro 1 desce em t = 11.0 s).
 * Valor ausente vira null/NaN (L3: "não declarado" nunca vira um número padrão silencioso).
 */
export function extrairParametrosMarinheiros(cadeia) {
  const vol01 = normalizarTexto(cadeia.volumes[0].conteudo);
  const vol02Linhas = cadeia.volumes[1].conteudo.split('\n');
  const vol03 = normalizarTexto(cadeia.volumes[2].conteudo);

  const linhaMarinheiros = vol01.split('\n').find((l) => l.includes('Marinheiros Humanos')) ?? '';
  const velAgua = Number(linhaMarinheiros.match(/([\d.]+)x em sala inundada/)?.[1] ?? NaN);
  const arredondaTick = /arredondad[oa] para cima ao próximo tick de 0\.25 ?s/.test(vol01);

  const coluna = (marcador) => {
    const linha = vol02Linhas.find((l) => l.includes(marcador));
    return linha ? linha.indexOf(marcador) : -1;
  };
  const colCabine = coluna('[CABINE]');
  const colMotor = coluna('[MOTOR SUB]');
  const salasCabineMotor = colCabine < 0 || colMotor < 0 ? null : Math.abs(colCabine - colMotor) <= 2 ? 1 : 2;

  const destino = vol03.match(/Marinheiro 1\*? a descer da Cabine[^.]*?até a Sala do (Motor|Torpedo)/)?.[1];
  const salaM1 = destino ? destino.toUpperCase() : null;

  return clonarProfundoCongelado({ velAgua, arredondaTick, salasCabineMotor, salaM1 });
}

/**
 * Extrai e audita os marcos temporais da Simulação do Volume 03 (Seção 3.4: t = 0.0s a t = 32.75s).
 */
export function extrairSimulacaoVolume03(conteudoVol03) {
  const secao34 = normalizarTexto(conteudoVol03.split('## 3.4.')[1]?.split('# CONTRA-AUDITORIA')[0] ?? '');
  const timestamps = [...secao34.matchAll(/t = (\d+(?:\.\d+)?)s\b/g)].map((m) => Number(m[1]));
  const unicosOrdenados = [...new Set(timestamps)].sort((a, b) => a - b);
  return clonarProfundoCongelado({
    textoNormalizado: secao34,
    timestampsUnicos: unicosOrdenados,
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

  // L5: raiz do projeto — só .md canônicos (verificados em carregarCadeiaCanonicaGdd), arquivos e diretórios declarados
  const entradasRaiz = fs.readdirSync(diretorioRaiz, { withFileTypes: true }).filter((e) => !e.name.startsWith('.'));
  const outrosArquivosRaiz = entradasRaiz.filter((e) => e.isFile() && !e.name.endsWith('.md')).map((e) => e.name).sort();
  const dirsRaiz = entradasRaiz.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const compararLista = (rotulo, noDisco, esperados) => {
    const ordenados = [...esperados].sort();
    const falt = ordenados.filter((f) => !noDisco.includes(f));
    const ext = noDisco.filter((f) => !ordenados.includes(f));
    if (falt.length > 0 || ext.length > 0) {
      throw new Error(`[L5 TRIPWIRE ${rotulo} FALHOU] Faltando=[${falt.join(', ')}] Extras=[${ext.join(', ')}]`);
    }
  };
  compararLista('RAIZ ARQUIVOS', outrosArquivosRaiz, CADEIA_CANONICA_RAIZ_OUTROS);
  compararLista('RAIZ DIRETORIOS', dirsRaiz, CADEIA_CANONICA_DIRS_RAIZ);

  // L5: CI no servidor — .github/workflows só contém os workflows declarados, e o portoes.yml roda o pre-push
  const pastaWorkflows = path.join(diretorioRaiz, '.github', 'workflows');
  const workflowsNoDisco = fs.existsSync(pastaWorkflows)
    ? fs.readdirSync(pastaWorkflows, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name).sort()
    : [];
  compararLista('WORKFLOWS CI', workflowsNoDisco, CADEIA_CANONICA_WORKFLOWS);
  const workflowPortoes = fs.readFileSync(path.join(pastaWorkflows, 'portoes.yml'), 'utf8');
  if (!/^\s{2}portoes:\s*$/m.test(workflowPortoes) || !/^\s+run: sh scripts\/hooks\/pre-push\s*$/m.test(workflowPortoes)) {
    throw new Error('[CI FALHOU] .github/workflows/portoes.yml tem de ter o job "portoes" rodando "sh scripts/hooks/pre-push"');
  }

  // B10: a versão de Node que roda os portões tem de estar dentro do intervalo fixado em package.json
  const pacote = JSON.parse(fs.readFileSync(path.join(diretorioRaiz, 'package.json'), 'utf8'));
  const faixa = String(pacote.engines?.node ?? '').match(/^>=(\d+)\.(\d+)\.(\d+) <(\d+)\.(\d+)\.(\d+)$/);
  if (!faixa) {
    throw new Error(`[B10 ENGINES FALHOU] package.json engines.node ilegível: "${pacote.engines?.node}"`);
  }
  const versao = process.versions.node.split('.').map(Number);
  const comparar = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  const minimo = faixa.slice(1, 4).map(Number);
  const teto = faixa.slice(4, 7).map(Number);
  if (comparar(versao, minimo) < 0 || comparar(versao, teto) >= 0) {
    // 1ª linha determinística (vai para o registro de mutações); a versão medida vai na 2ª linha (difere por máquina)
    throw new Error(
      `[B10 ENGINES FALHOU] versão do Node fora de engines.node "${pacote.engines.node}"\nversão medida: ${process.versions.node}`
    );
  }

  // Lei N3: todo portão de tests/ tem linha no PORTOES.md; OBRIGATORIO exige evidência de 3 corridas na main
  const conteudoPortoes = fs.readFileSync(path.join(diretorioRaiz, 'padrao', 'protocolo', 'PORTOES.md'), 'utf8');
  const portoes = conteudoPortoes
    .split('\n')
    .filter((l) => l.startsWith('| `tests/'))
    .map((linha) => {
      const cols = linha.split('|').map((c) => c.trim()).filter(Boolean);
      return {
        arquivo: cols[0].replace(/`/g, '').replace(/^tests\//, ''),
        status: cols[1],
        motivo: cols[2] ?? '',
        desde: cols[3] ?? '',
        evidencia: cols[4] ?? '',
      };
    });
  compararLista('PORTOES N3', portoes.map((p) => p.arquivo).sort(), CADEIA_CANONICA_TESTES);
  for (const p of portoes) {
    if (!['OBRIGATORIO', 'DECLARADO'].includes(p.status)) {
      throw new Error(`[N3 FALHOU] Status inválido para ${p.arquivo}: "${p.status}"`);
    }
    if (!p.motivo || !/^\d{4}-\d{2}-\d{2}$/.test(p.desde)) {
      throw new Error(`[N3 FALHOU] Portão ${p.arquivo} sem motivo ou sem data (AAAA-MM-DD)`);
    }
    if (p.status === 'OBRIGATORIO' && !/`[0-9a-f]{7,40}`.*3\/3/.test(p.evidencia)) {
      throw new Error(`[N3 FALHOU] Portão ${p.arquivo} OBRIGATORIO sem evidência de 3 corridas verdes na main (commit + 3/3)`);
    }
  }
  const obrigatorios = portoes.filter((p) => p.status === 'OBRIGATORIO').length;
  if (obrigatorios === 0) {
    throw new Error('[N4 FALHOU] Zero portões OBRIGATORIO no PORTOES.md');
  }

  const caminhoMutacoes = path.join(diretorioRaiz, 'padrao', 'protocolo', 'MUTACOES.md');
  const conteudoMutacoesCompleto = fs.readFileSync(caminhoMutacoes, 'utf8');
  // B6: só o bloco GERADO pelo executor real conta como medição; a tabela manual antiga é histórico.
  const iniBloco = conteudoMutacoesCompleto.indexOf('<!-- INICIO BLOCO GERADO');
  const fimBloco = conteudoMutacoesCompleto.indexOf('<!-- FIM BLOCO GERADO -->');
  if (iniBloco < 0 || fimBloco < iniBloco) {
    throw new Error('[B6 FALHOU] MUTACOES.md sem bloco gerado pelo executor real (scripts/rodar-mutacoes.mjs --gerar-md)');
  }
  const conteudoMutacoes = conteudoMutacoesCompleto.slice(iniBloco, fimBloco);
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
    totalPortoesExaminados: portoes.length,
    totalPortoesObrigatorios: obrigatorios,
    mutacoes,
  });
}
