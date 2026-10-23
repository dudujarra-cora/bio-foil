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
  '09_economia_bestiario_e_comandos.md',
]);

export const CADEIA_CANONICA_TESTES = Object.freeze([
  '01-portao-gdd.test.mjs',
  '02-hook-ambiente.test.mjs',
  '03-onda1-fisica.test.mjs',
  '04-onda2-combate.test.mjs',
  '05-onda3-inimigos.test.mjs',
  '06-onda4-mapa.test.mjs',
  '07-onda5-catalogo-chefe.test.mjs',
  '08-onda6-ui-juncao.test.mjs',
  '09-mutacoes-reais.test.mjs',
]);

export const CADEIA_CANONICA_SRC = Object.freeze([
  'gdd-parser.mjs',
  'oraculos-referencia.mjs',
]);

export const CADEIA_CANONICA_ONDAS_SRC = Object.freeze([
  'onda1-fisica/estado-inicial.mjs',
  'onda1-fisica/hash32-streams.mjs',
  'onda1-fisica/tick-hidraulica-foil.mjs',
  'onda2-combate/tick-sistemas-armas.mjs',
  'onda2-combate/tick-tripulacao.mjs',
  'onda3-inimigos/abordagem-vitoria.mjs',
  'onda3-inimigos/ia-barco-monstro.mjs',
  'onda4-mapa/ciclo-partida.mjs',
  'onda4-mapa/eventos-nos.mjs',
  'onda4-mapa/gerador-poisson.mjs',
  'onda4-mapa/relogio-viagem.mjs',
  'onda5-catalogo-chefe/catalogo-naves-itens.mjs',
  'onda5-catalogo-chefe/chefe-draga.mjs',
  'onda6-ui/cues-audio.mjs',
  'onda6-ui/despacho-comandos.mjs',
  'onda6-ui/persistencia-perfil.mjs',
  'onda6-ui/presenter-wireframe.mjs',
]);

export const CADEIA_CANONICA_SCRIPTS = Object.freeze([
  'auditar-frente.sh',
  'hooks/pre-commit',
  'hooks/pre-push',
  'mcp-testes-agentes.mjs',
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

/**
 * Extrai a Seção 1.6 do Volume 01 (Topologia de Adjacência 2x4 + Duto 5<->6, Limite de Ocupação/Foco 2x1 e Geometria do Beam).
 */
export function extrairTopologiaOcupacaoBeamVolume01(conteudoVol01) {
  const secao16Bruta = conteudoVol01.split('## 1.6.')[1]?.split('# CONTRA-AUDITORIA')[0] ?? '';
  const secao16Norm = normalizarTexto(secao16Bruta);

  const camaras = [];
  const grafoAdjacencia = {};

  for (const linhaBruta of secao16Bruta.split('\n')) {
    if (!/^\| \*\*\d+\*\* \|/.test(linhaBruta)) continue;
    const cols = normalizarTexto(linhaBruta)
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    if (cols.length >= 5) {
      const id = Number(cols[0]);
      const nome = cols[1];
      const matchCoord = cols[2].match(/\((\d+),\s*(\d+)\)/);
      const coluna = Number(matchCoord?.[1] ?? NaN);
      const andar = Number(matchCoord?.[2] ?? NaN);
      const vizinhos = cols[3]
        .split(',')
        .map((v) => Number(v.trim()))
        .filter((v) => !Number.isNaN(v));
      const grauDeclarado = Number(cols[4]);
      camaras.push({ id, nome, coluna, andar, vizinhos, grauDeclarado });
      grafoAdjacencia[id] = vizinhos;
    }
  }

  const conexoesBidirecionaisDeclaradas = Number(
    secao16Norm.match(/totalizando (\d+) conexões bidirecionais/)?.[1] ?? NaN
  );
  const somaGrausDeclarada = Number(secao16Norm.match(/soma dos graus\s*=\s*(\d+)/)?.[1] ?? NaN);

  const matchLotacao = secao16Norm.match(
    /Capacidade Máxima por Sala \((\d+) unidades\):[^\n]*?(\d+) Tripulantes Aliados \+ (\d+) Invasores Inimigos/
  );
  const lotacaoTotalSala = Number(matchLotacao?.[1] ?? NaN);
  const lotacaoMaxAliados = Number(matchLotacao?.[2] ?? NaN);
  const lotacaoMaxInimigos = Number(matchLotacao?.[3] ?? NaN);

  const focoSemDivisaoDps = /o DPS nunca é dividido: ambos os atacantes de um lado concentram 100% do seu DPS somado no ocupante do Slot 1 adversário/.test(
    secao16Norm
  );
  const reflexaoBaiacuPct = Number(
    secao16Norm.match(/sofre individualmente (\d+)% do seu próprio DPS refletido/)?.[1] ?? NaN
  );

  const matchBeam = secao16Norm.match(
    /cortam até (\d+) salas adjacentes causando (\d+) de dano por sala \((\d+) de dano total\)/
  );
  const beamMaxSalas = Number(matchBeam?.[1] ?? NaN);
  const beamDanoPorSala = Number(matchBeam?.[2] ?? NaN);
  const beamDanoTotal = Number(matchBeam?.[3] ?? NaN);
  const beamProibeRepetirSala = /proibido repetir sala ou voltar de S_2 para S_1/.test(secao16Norm);

  return clonarProfundoCongelado({
    camaras,
    grafoAdjacencia,
    conexoesBidirecionaisDeclaradas,
    somaGrausDeclarada,
    lotacaoTotalSala,
    lotacaoMaxAliados,
    lotacaoMaxInimigos,
    focoSemDivisaoDps,
    reflexaoBaiacuPct,
    beamMaxSalas,
    beamDanoPorSala,
    beamDanoTotal,
    beamProibeRepetirSala,
  });
}

export function clonarProfundoCongelado(obj) {
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
    else if (linha.startsWith('## 5.7.')) secao = '5.7';
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
          condicaoDesbloqueio: cols[4] ?? '',
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
  const secao56 = conteudoVol05.split('## 5.6.')[1]?.split('## 5.7.')[0]?.split('# CONTRA-AUDITORIA')[0] ?? '';
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
          nivelInicial: Number(cols[2].match(/Nv\.\s*(\d+)/)?.[1] ?? NaN),
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
 * Extrai a Ficha Numérica das 3 Fases da Draga Continental (Seção 5.5), o Bestiário Escalado Setores 1..7 (Seção 5.7)
 * e a Prova Matemática de TTK da Fase 3 (Falha Global Encontrada 7).
 */
export function extrairChefeEBestiarioVolume05(conteudoVol05) {
  const secao55Bruta = conteudoVol05.split('## 5.5.')[1]?.split('## 5.6.')[0] ?? '';
  const secao57Bruta = conteudoVol05.split('## 5.7.')[1]?.split('# CONTRA-AUDITORIA')[0] ?? '';
  const auditoria5Norm = normalizarTexto(conteudoVol05.split('# CONTRA-AUDITORIA')[1] ?? '');
  const secao55Norm = normalizarTexto(secao55Bruta);

  const fasesResumo = [];
  const salasPorFase = { 1: [], 2: [], 3: [] };
  let faseAtual = 0;

  for (const linhaBruta of secao55Bruta.split('\n')) {
    const linha = normalizarTexto(linhaBruta);
    if (linhaBruta.startsWith('| **Fase ')) {
      const cols = linha
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
      if (cols.length >= 7) {
        const fase = Number(cols[0].match(/Fase (\d+)/)?.[1] ?? NaN);
        const nome = cols[1];
        const hpCasco = Number(cols[2].match(/(\d+)\s*HP/)?.[1] ?? NaN);
        const blindagemTermicaPts = Number(cols[3].match(/(\d+)\s*pts/)?.[1] ?? NaN);
        const matchBarreira = cols[4].match(/(\d+)\s*bolhas\s*\((\d+)\s*barras\)/);
        const bolhasBarreira = Number(matchBarreira?.[1] ?? NaN);
        const barrasBarreira = Number(matchBarreira?.[2] ?? NaN);
        const esquivaPct = Number(cols[5].match(/(\d+)%/)?.[1] ?? NaN);
        const matchSalas = cols[6].match(/(\d+)\s*salas\s*\((\d+)\s*\/\s*(\d+)\)/);
        const salasTotais = Number(matchSalas?.[1] ?? NaN);
        const salasSuperiores = Number(matchSalas?.[2] ?? NaN);
        const salasSubmersas = Number(matchSalas?.[3] ?? NaN);
        const intervaloSurgeSeg = Number(cols[7].match(/(\d+)s/)?.[1] ?? NaN);

        fasesResumo.push({
          fase,
          nome,
          hpCasco,
          blindagemTermicaPts,
          bolhasBarreira,
          barrasBarreira,
          esquivaPct,
          salasTotais,
          salasSuperiores,
          salasSubmersas,
          intervaloSurgeSeg,
        });
      }
    }

    if (linhaBruta.startsWith('### Fase ')) {
      faseAtual = Number(linhaBruta.match(/### Fase (\d+)/)?.[1] ?? 0);
    } else if (faseAtual >= 1 && faseAtual <= 3 && /^\s+\d+\.\s+\*\*/.test(linhaBruta)) {
      const nomeSala = linha.match(/^\s*\d+\.\s*([^:(]+)/)?.[1]?.trim() ?? '';
      const convSuperior = linha.includes('(Convés Superior)');
      const abaixoLinhaDagua = linha.includes("(Abaixo da Linha d'Água)");
      const barras = Number(linha.match(/\):\s*(\d+)\s*Barras/)?.[1] ?? NaN);
      salasPorFase[faseAtual].push({
        nomeSala,
        convSuperior,
        abaixoLinhaDagua,
        barras,
        texto: linha,
      });
    }
  }

  const humanosIniciaisFase1 = Number(secao55Norm.match(/Tripulação Inicial na Fase 1 \((\d+) Humanos\)/)?.[1] ?? NaN);
  const matchMarinheiros = secao55Norm.match(/(\d+) Marinheiros Humanos \((\d+) HP, (\d+) DPS/);
  const marinheirosIniciais = Number(matchMarinheiros?.[1] ?? NaN);
  const marinheiroHp = Number(matchMarinheiros?.[2] ?? NaN);
  const marinheiroDps = Number(matchMarinheiros?.[3] ?? NaN);
  const matchMergulhadores = secao55Norm.match(/(\d+) Mergulhadores de Assalto \((\d+) HP, (\d+) DPS/);
  const mergulhadoresIniciais = Number(matchMergulhadores?.[1] ?? NaN);
  const mergulhadorHp = Number(matchMergulhadores?.[2] ?? NaN);
  const mergulhadorDps = Number(matchMergulhadores?.[3] ?? NaN);
  const iaBackupAutoReparoSeg = Number(secao55Norm.match(/auto-repara todas as salas[^\n]*?1 barra a cada (\d+) segundos/)?.[1] ?? NaN);
  const hpTotalDeclarado = Number(secao55Norm.match(/Integridade Estrutural Total das 3 Fases:[^=]*=\s*(\d+)\s*HP/)?.[1] ?? NaN);
  const integridadeTotalDeclarada = Number(
    secao55Norm.match(/Blindagem Térmica Externa na Fase 3\s*=\s*(\d+)\s*pontos/)?.[1] ?? NaN
  );

  const matchSurge1 = secao55Norm.match(/Onda de Arrasto Hidráulico[^\n]*?\+(\d+)\s*kg de peso virtual[^\n]*?por (\d+) segundos/);
  const surgeFase1PesoVirtualKg = Number(matchSurge1?.[1] ?? NaN);
  const surgeFase1DuracaoSeg = Number(matchSurge1?.[2] ?? NaN);

  const matchSurge2 = secao55Norm.match(/(\d+) drones atacam simultaneamente durante (\d+) segundos:\s*(\d+) Drones Cortadores Aéreos[^\n]*?e (\d+) Drones Torpedeiros Subaquáticos/);
  const surgeFase2TotalDrones = Number(matchSurge2?.[1] ?? NaN);
  const surgeFase2DuracaoSeg = Number(matchSurge2?.[2] ?? NaN);
  const surgeFase2DronesAereos = Number(matchSurge2?.[3] ?? NaN);
  const surgeFase2DronesSubaquaticos = Number(matchSurge2?.[4] ?? NaN);

  const matchLasers3 = secao55Norm.match(/Rajada de (\d+) Lasers Industriais:\s*Dispara (\d+) projéteis\/feixes consecutivos de (\d+) dano cada/);
  const surgeFase3LasersCount = Number(matchLasers3?.[2] ?? NaN);
  const surgeFase3LaserDano = Number(matchLasers3?.[3] ?? NaN);

  const matchFervura3 = secao55Norm.match(
    /Durante (\d+) segundos \(precedidos por um alarme sonoro\/visual de (\d+) segundos\)[^\n]*?sofre (\d+) de Dano Estrutural por segundo \(até (\d+) HP de casco\)[^\n]*?sofrem -(\d+) HP\/s/
  );
  const surgeFase3DuracaoFervuraSeg = Number(matchFervura3?.[1] ?? NaN);
  const surgeFase3AlarmeFervuraSeg = Number(matchFervura3?.[2] ?? NaN);
  const surgeFase3DanoCascoPorSeg = Number(matchFervura3?.[3] ?? NaN);
  const surgeFase3DanoCascoMax = Number(matchFervura3?.[4] ?? NaN);
  const surgeFase3DanoTripulacaoPorSeg = Number(matchFervura3?.[5] ?? NaN);

  const templatesInimigos = [];
  const escalamentoSetores = [];
  let subsecao57 = '';

  for (const linhaBruta of secao57Bruta.split('\n')) {
    if (linhaBruta.startsWith('### A.')) subsecao57 = 'A';
    else if (linhaBruta.startsWith('### B.')) subsecao57 = 'B';

    const linha = normalizarTexto(linhaBruta);
    if (subsecao57 === 'A' && /^\| `(BARCO|MONSTRO)_/.test(linhaBruta)) {
      const cols = linha
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
      if (cols.length >= 6) {
        const matchSetores = cols[3].match(/Setores\s*(\d+)[–-](\d+)/);
        const matchSalas = cols[4].match(/(\d+)\s*(?:salas|órgãos)/);
        templatesInimigos.push({
          idTemplate: cols[0],
          classe: cols[1],
          nome: cols[2].replace(/^\d+\.\s*/, ''),
          setorMin: Number(matchSetores?.[1] ?? NaN),
          setorMax: Number(matchSetores?.[2] ?? NaN),
          numSalasOuOrgaos: Number(matchSalas?.[1] ?? NaN),
          arsenalBruto: cols[5],
        });
      }
    }

    if (subsecao57 === 'B' && /^\| \*\*Setor \d+/.test(linhaBruta)) {
      const cols = linha
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
      if (cols.length >= 8) {
        const setor = Number(cols[0].match(/Setor (\d+)/)?.[1] ?? NaN);
        const barcoHp = Number(cols[1].match(/(\d+)\s*HP/)?.[1] ?? NaN);
        const barcoBarreiraBolhas = Number(cols[2]);
        const barcoEsquivaPct = Number(cols[3].match(/(\d+)%/)?.[1] ?? NaN);
        const monstroHp = Number(cols[4].match(/(\d+)\s*HP/)?.[1] ?? NaN);
        const monstroEsquivaPct = Number(cols[5].match(/(\d+)%/)?.[1] ?? NaN);
        const orcamentoArmasBarras = Number(cols[6].match(/(\d+)\s*E/)?.[1] ?? NaN);
        const matchTripGanglio = cols[7].match(/(\d+)\s*Humanos\s*\/\s*(\d+)\s*Gânglio/);
        escalamentoSetores.push({
          setor,
          barcoHp,
          barcoBarreiraBolhas,
          barcoEsquivaPct,
          monstroHp,
          monstroEsquivaPct,
          orcamentoArmasBarras,
          tripulacaoHumana: Number(matchTripGanglio?.[1] ?? NaN),
          ganglioBarras: Number(matchTripGanglio?.[2] ?? NaN),
        });
      }
    }
  }

  const ttkMedianoSegDeclarado = Number(
    auditoria5Norm.match(/TTK mediano\s*=\s*(\d+(?:\.\d+)?)\s*segundos\s*\((\d+)\s*salvas\)/)?.[1] ?? NaN
  );
  const ttkEsperadoSegDeclarado = Number(
    auditoria5Norm.match(/TTK esperado\s*=\s*(\d+(?:\.\d+)?)\s*segundos/)?.[1] ?? NaN
  );
  const salvasEsperadasDeclaradas = Number(
    auditoria5Norm.match(/TTK esperado\s*=\s*\d+(?:\.\d+)?\s*segundos\s*\((\d+(?:\.\d+)?)\s*salvas\)/)?.[1] ?? NaN
  );
  const ttkP90SegDeclarado = Number(auditoria5Norm.match(/TTK P90\s*=\s*(\d+(?:\.\d+)?)\s*segundos/)?.[1] ?? NaN);
  const probQuebraBolhasDeclarada = Number(auditoria5Norm.match(/P\(H >= 4\)\s*=\s*(0\.\d+)/)?.[1] ?? NaN);
  const ciclosSurge = [...auditoria5Norm.matchAll(/=\s*(\d+)\s*ciclos\s+(na mediana|no valor esperado|no P90)/g)];
  const ciclosPor = (rotulo) => Number(ciclosSurge.find((m) => m[2] === rotulo)?.[1] ?? NaN);
  const ttkFase3 = {
    medianoSeg: ttkMedianoSegDeclarado,
    esperadoSeg: ttkEsperadoSegDeclarado,
    salvasEsperadas: salvasEsperadasDeclaradas,
    p90Seg: ttkP90SegDeclarado,
    probQuebraBolhas: probQuebraBolhasDeclarada,
    ciclosMediana: ciclosPor('na mediana'),
    ciclosEsperado: ciclosPor('no valor esperado'),
    ciclosP90: ciclosPor('no P90'),
  };

  return clonarProfundoCongelado({
    fasesResumo,
    salasPorFase,
    humanosIniciaisFase1,
    marinheirosIniciais,
    marinheiroHp,
    marinheiroDps,
    mergulhadoresIniciais,
    mergulhadorHp,
    mergulhadorDps,
    iaBackupAutoReparoSeg,
    hpTotalDeclarado,
    integridadeTotalDeclarada,
    surgeFase1PesoVirtualKg,
    surgeFase1DuracaoSeg,
    surgeFase2TotalDrones,
    surgeFase2DuracaoSeg,
    surgeFase2DronesAereos,
    surgeFase2DronesSubaquaticos,
    surgeFase3LasersCount,
    surgeFase3LaserDano,
    surgeFase3DuracaoFervuraSeg,
    surgeFase3AlarmeFervuraSeg,
    surgeFase3DanoCascoPorSeg,
    surgeFase3DanoCascoMax,
    surgeFase3DanoTripulacaoPorSeg,
    templatesInimigos,
    escalamentoSetores,
    ttkFase3,
  });
}

/**
 * Extrai o Kit Inicial Canônico das 5 Carcaças (Seção 5.4.A do Volume 05): chassi, tripulação, armas, órgãos e sistemas.
 */
export function extrairKitInicialVolume05(conteudoVol05) {
  const secao = conteudoVol05.split('### 5.4.A.')[1]?.split('## 5.5.')[0] ?? '';
  const kits = [];
  for (const linha of secao.split('\n')) {
    if (!/^\| `[A-Z_]+` \|/.test(linha)) continue;
    const cols = linha.split('|').map((c) => c.trim()).filter(Boolean);
    if (cols.length < 6) continue;
    const limpar = (c) => c.replace(/`/g, '').trim();
    const lista = (c) => (limpar(c) === '—' ? [] : limpar(c).split(';').map((x) => x.trim()).filter(Boolean));
    const mapa = (c) =>
      Object.fromEntries(
        limpar(c)
          .split(',')
          .map((par) => par.split(':').map((x) => x.trim()))
          .filter((par) => par.length === 2)
          .map(([k, v]) => [k, Number(v)])
      );
    kits.push({
      idArquitetura: limpar(cols[0]),
      chassiKg: Number(normalizarTexto(cols[1]).match(/(\d+(?:\.\d+)?)\s*kg/)?.[1] ?? NaN),
      tripulacao: mapa(cols[2]),
      armas: lista(cols[3]),
      orgaos: lista(cols[4]),
      sistemas: mapa(cols[5]),
    });
  }
  return clonarProfundoCongelado(kits);
}

/**
 * Extrai os atributos táticos dos 2 inimigos do Setor 1 declarados no Volume 03 (Seções 3.2 e 3.3)
 * para Junção N1 com o Bestiário Escalado do Volume 05 (Seção 5.7).
 */
export function extrairInimigosSetor1Volume03(conteudoVol03) {
  const vol03 = normalizarTexto(conteudoVol03);
  const secao32 = vol03.split('## 3.2.')[1]?.split('## 3.3.')[0] ?? '';
  const secao33 = vol03.split('## 3.3.')[1]?.split('## 3.4.')[0] ?? '';

  const lanchaHp = Number(secao32.match(/Casco:\s*(\d+)\s*HP/)?.[1] ?? NaN);
  const lanchaEsquivaPct = Number(secao32.match(/Esquiva:\s*(\d+)%/)?.[1] ?? NaN);
  const lanchaSemEscudo = /Sem escudo de energia/.test(secao32) ? 0 : NaN;
  const matchSalasLancha = secao32.match(/Salas do Barco \((\d+) Salas/i);
  const lanchaSalasTotais = Number(matchSalasLancha?.[1] ?? NaN);
  const lanchaMarinheiros = [...secao32.matchAll(/Marinheiro Humano \d+/g)].length;

  const teuthisHp = Number(secao33.match(/Vida Total \(Corpo\):\s*(\d+)\s*HP/)?.[1] ?? NaN);
  const teuthisEsquivaPct = Number(secao33.match(/Esquiva:\s*(\d+)%/)?.[1] ?? NaN);
  const teuthisOrgaos = Number(secao33.match(/(\d+)\s*Órgãos\s*=\s*4 Salas/)?.[1] ?? NaN);
  const teuthisGanglioBarras = Number(secao33.match(/Gânglio Central \(Cérebro [—-]\s*(\d+)\s*Barras/)?.[1] ?? NaN);

  return clonarProfundoCongelado({
    lancha: {
      hpCasco: lanchaHp,
      esquivaPct: lanchaEsquivaPct,
      barreiraBolhas: lanchaSemEscudo,
      salasTotais: lanchaSalasTotais,
      marinheiros: lanchaMarinheiros,
    },
    teuthis: {
      hpCorpo: teuthisHp,
      esquivaPct: teuthisEsquivaPct,
      orgaosTotais: teuthisOrgaos,
      ganglioBarras: teuthisGanglioBarras,
    },
  });
}

/**
 * Extrai e audita o Baralho Procedural de Nós do Volume 04 (Seção 4.4: soma = 20 nós base).
 */
export function extrairBaralhoVolume04(conteudoVol04) {
  const secao44 = conteudoVol04.split('## 4.4.')[1]?.split('## 4.5.')[0]?.split('# CONTRA-AUDITORIA')[0] ?? '';
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
 * Extrai e audita o Catálogo Determinístico de Eventos de Nós (Seção 4.5.A) e a Regra Mecânica
 * de SOS Expirado / Frente Extrativista (Seção 4.5.B + Falha Encontrada 4) do Volume 04.
 * Valor ausente vira null/NaN (L3).
 */
export function extrairCatalogoEventosVolume04(conteudoVol04) {
  const secao45 = conteudoVol04.split('## 4.5.')[1]?.split('# CONTRA-AUDITORIA')[0] ?? '';
  const subA = secao45.split('### A.')[1]?.split('### B.')[0] ?? '';
  const subB = secao45.split('### B.')[1] ?? '';
  const subANorm = normalizarTexto(subA);
  const subBNorm = normalizarTexto(subB);

  const taxaSucessoCriticoBlueOption = Number(
    subANorm.match(/(\d+)%\s+de sucesso cr[ií]tico garantido/i)?.[1] ?? NaN
  );
  const danoCascoBlueOption = Number(
    subANorm.match(/\((\d+)\s+dano\s+de casco e recompensa m[aá]xima\)/i)?.[1] ?? NaN
  );
  const marcadorOpcaoCPerigo =
    subA.match(/nos nós `PERIGO`, o combate é obrigatório \(`([A-Z0-9_]+)`\)/)?.[1] ?? null;

  const templates = [];
  for (const linha of subA.split('\n')) {
    if (
      linha.startsWith('| ') &&
      !linha.startsWith('| ID do Evento') &&
      !linha.startsWith('| :---')
    ) {
      const cols = linha.split('|').map((c) => c.trim()).filter(Boolean);
      if (cols.length >= 6) {
        templates.push({
          id: cols[0].replace(/`/g, '').trim(),
          categoria: cols[1].replace(/`/g, '').trim(),
          nome: normalizarTexto(cols[2]),
          opcaoA: normalizarTexto(cols[3]),
          requisitoBlueOption: normalizarTexto(cols[4].replace(/`/g, '')),
          recompensaBlueOption: normalizarTexto(cols[5]),
        });
      }
    }
  }

  const margemPrazoHoras = Number(
    subBNorm.match(/T_\{?prazo\}?\s*=\s*T_\{?rota m[ií]nima\}?\s*\+\s*(\d+(?:\.\d+)?)h/i)?.[1] ?? NaN
  );
  const estadoSosExpirado =
    subB.match(/o estado do nó muda para `([A-Z0-9_]+)`/)?.[1] ?? null;
  const multiplicadorSucataSosExpirado = Number(
    subBNorm.match(
      /Sucata_\{?SOS expirado\}?\(S\)\s*=\s*(?:\\lfloor|floor\()\s*(\d+(?:\.\d+)?)\s*[x*]\s*Sucata_\{?modalidade\}?\(S\)/i
    )?.[1] ?? NaN
  );
  const matchExtrasSos = subBNorm.match(/com\s+(\d+)\s+Combust[ií]vel\s+e\s+(\d+)\s+Muni[cç][aã]o\s+extras/i);
  const combustivelSosExpirado = matchExtrasSos ? Number(matchExtrasSos[1]) : NaN;
  const municaoSosExpirado = matchExtrasSos ? Number(matchExtrasSos[2]) : NaN;

  const matchExSetor1 = subBNorm.match(
    /Destrui[cç][aã]o Bruta num SOS Expirado rende apenas\s+[^=]+=\s*(\d+)\s+Sucata,\s+e por Captura Intacta rende\s+[^=]+=\s*(\d+)\s+Sucata/i
  );
  const exemplosSetor1SosExpirado = {
    destruicaoBruta: matchExSetor1 ? Number(matchExSetor1[1]) : NaN,
    capturaIntacta: matchExSetor1 ? Number(matchExSetor1[2]) : NaN,
  };

  const velocidadeFrenteCorporativaMnPorHora = Number(
    subBNorm.match(/X_\{?n[oó]\}?\s*<=\s*(\d+(?:\.\d+)?)\s*MN\/h\s*[x*]\s*t_\{?atual\}?/i)?.[1] ?? NaN
  );
  const matchBarreiraFrente = subBNorm.match(
    /\+(\d+)\s+bolha\s+de Barreira adicional\s+\(at[eé] o teto de\s+(\d+)\s+bolhas\)/i
  );
  const bonusBarreiraFrenteCorporativa = matchBarreiraFrente ? Number(matchBarreiraFrente[1]) : NaN;
  const tetoBarreiraFrenteCorporativa = matchBarreiraFrente ? Number(matchBarreiraFrente[2]) : NaN;

  const matchSaqueFrente = subBNorm.match(
    /concede\s+(\d+)\s+Sucata,\s+(\d+)\s+Biomassa\s+e\s+(\d+)\s+Muni[cç][aã]o,\s+entregando exclusivamente\s+(\d+)\s+C[eé]lula de Combust[ií]vel/i
  );
  const saqueFrenteCorporativa = {
    sucata: matchSaqueFrente ? Number(matchSaqueFrente[1]) : NaN,
    biomassa: matchSaqueFrente ? Number(matchSaqueFrente[2]) : NaN,
    municao: matchSaqueFrente ? Number(matchSaqueFrente[3]) : NaN,
    combustivel: matchSaqueFrente ? Number(matchSaqueFrente[4]) : NaN,
  };

  const secaoContra4 = conteudoVol04.split('# CONTRA-AUDITORIA #4')[1] ?? '';
  const temFalha4FarmingInfinitoSosExpirado =
    /### Falha Encontrada 4: O Exploit de "Farming Infinito" na Frente da Corporação e nos SOS Expirados/.test(
      secaoContra4
    );

  const subC = secao45.split('### C.')[1] ?? '';
  const elegibilidadeDeclarada = [];
  for (const linha of subC.split('\n')) {
    if (!/^\| `[A-Z_]+` \|/.test(linha)) continue;
    const cols = linha.split('|').map((c) => c.trim()).filter(Boolean);
    if (cols.length < 3) continue;
    const ids = [...cols[1].matchAll(/`([A-Z0-9_]+)`/g)].map((m) => m[1]);
    elegibilidadeDeclarada.push({
      idArquitetura: cols[0].replace(/`/g, ''),
      templates: ids,
      total: Number(normalizarTexto(cols[2]).match(/(\d+)/)?.[1] ?? NaN),
    });
  }
  const assinaturaHashOpcaoA = subA.match(/`(hash32\([^`]*\))\s*%\s*2`/)?.[1] ?? null;

  return clonarProfundoCongelado({
    templates,
    elegibilidadeDeclarada,
    assinaturaHashOpcaoA,
    regrasOpcoes: {
      taxaSucessoCriticoBlueOption,
      danoCascoBlueOption,
      marcadorOpcaoCPerigo,
    },
    regrasSosEFrente: {
      margemPrazoHoras,
      estadoSosExpirado,
      multiplicadorSucataSosExpirado,
      combustivelSosExpirado,
      municaoSosExpirado,
      exemplosSetor1SosExpirado,
      velocidadeFrenteCorporativaMnPorHora,
      bonusBarreiraFrenteCorporativa,
      tetoBarreiraFrenteCorporativa,
      saqueFrenteCorporativa,
    },
    temFalha4FarmingInfinitoSosExpirado,
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
    else if (linha.startsWith('## 8.5.')) secao = '8.5';
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
 * Extrai e audita a Seção 8.5 do Volume 08:
 *  - 8.5.A: Catálogo Fechado dos 14 Comandos Atômicos (Action Schema);
 *  - 8.5.B: Contrato de Persistência (profile.json vs run_save.json) e Desbloqueio das 5 Carcaças;
 *  - 8.5.C: Target Visual Pixel-Perfect (960x540 -> 1920x1080) e 8 Cues Sonoros Táticos da Onda 6.
 * Valor ausente vira null/NaN (L3).
 */
export function extrairComandosPersistenciaOnda6Volume08(conteudoVol08) {
  const secao85 = conteudoVol08.split('## 8.5.')[1]?.split('# CONTRA-AUDITORIA')[0] ?? '';
  const subA = secao85.split('### A.')[1]?.split('### B.')[0] ?? '';
  const subB = secao85.split('### B.')[1]?.split('### C.')[0] ?? '';
  const subC = secao85.split('### C.')[1] ?? '';
  const subCNorm = normalizarTexto(subC);

  const comandos = [];
  for (const linha of subA.split('\n')) {
    if (
      linha.startsWith('| ') &&
      !linha.startsWith('| ID do Comando') &&
      !linha.startsWith('| :---')
    ) {
      const cols = linha.split('|').map((c) => c.trim()).filter(Boolean);
      if (cols.length >= 5) {
        comandos.push({
          tipo: cols[0].replace(/`/g, '').trim(),
          fasesPermitidas: cols[1]
            .replace(/`/g, '')
            .split(',')
            .map((f) => f.trim())
            .filter(Boolean),
          payloadObrigatorio: cols[2].replace(/`/g, '').trim(),
          regraValidacao: normalizarTexto(cols[3]),
          marcadorRejeicao: cols[4].replace(/`/g, '').trim(),
        });
      }
    }
  }

  const carcacasPerfil = [];
  for (const linha of subB.split('\n')) {
    if (
      linha.startsWith('| ') &&
      !linha.startsWith('| ID da Carcaça') &&
      !linha.startsWith('| :---')
    ) {
      const cols = linha.split('|').map((c) => c.trim()).filter(Boolean);
      if (cols.length >= 4) {
        const estadoIniStr = cols[2].replace(/`/g, '').trim();
        carcacasPerfil.push({
          idArquitetura: cols[0].replace(/`/g, '').trim(),
          nomeCanonico: normalizarTexto(cols[1]),
          estadoInicialDesbloqueado:
            estadoIniStr === 'true' ? true : estadoIniStr === 'false' ? false : null,
          predicadoTexto: normalizarTexto(cols[3]),
          predicadoCodigo: cols[3].match(/`([^`]+)`/)?.[1]?.trim() ?? null,
        });
      }
    }
  }

  const matchResNativa = subCNorm.match(/Resolu[cç][aã]o L[oó]gica Nativa\s*\(16:9\):\s*(\d+)\s*x\s*(\d+)\s*pixels/i);
  const matchUpscale2x = subCNorm.match(/fator inteiro\s*(\d+)x\s*para\s*(\d+)\s*x\s*(\d+)\s*pixels/i);
  const matchPassaBaixaHz = subCNorm.match(/passa-baixa subaqu[aá]tico[^\n\d]*(\d+)\s*Hz/i);

  const layoutNativo = {};
  for (const linha of subC.split('\n')) {
    const m = linha.match(/^\| `([A-Z_]+)` \| \$?(\d+(?:\.\d+)?)\$? \|/);
    if (m && !m[1].startsWith('CUE_')) layoutNativo[m[1]] = Number(m[2]);
  }

  const targetVisual = {
    larguraNativaPx: matchResNativa ? Number(matchResNativa[1]) : NaN,
    alturaNativaPx: matchResNativa ? Number(matchResNativa[2]) : NaN,
    fatorUpscaleFullHd: matchUpscale2x ? Number(matchUpscale2x[1]) : NaN,
    larguraFullHdPx: matchUpscale2x ? Number(matchUpscale2x[2]) : NaN,
    alturaFullHdPx: matchUpscale2x ? Number(matchUpscale2x[3]) : NaN,
    filtroSubaquaticoHz: matchPassaBaixaHz ? Number(matchPassaBaixaHz[1]) : NaN,
    layoutNativo,
  };

  const cuesSonoros = [];
  for (const linha of subC.split('\n')) {
    if (
      linha.startsWith('| ') &&
      !linha.startsWith('| ID do Cue') &&
      !linha.startsWith('| :---')
    ) {
      const cols = linha.split('|').map((c) => c.trim()).filter(Boolean);
      if (cols.length >= 4) {
        cuesSonoros.push({
          id: cols[0].replace(/`/g, '').trim(),
          gatilho: normalizarTexto(cols[1]),
          parametroAcustico: normalizarTexto(cols[2]),
          cruzamentoGdd: normalizarTexto(cols[3]),
        });
      }
    }
  }

  const secaoContra8 = conteudoVol08.split('# CONTRA-AUDITORIA #8')[1] ?? '';
  const temItem3ContraAuditoria8 =
    /3\.\s+\*\*Existe risco da UI mutar o `GameState` em cliques inválidos ou de \*Save Scumming\* corromper o meta-progresso \(`profile\.json`\)\?\*\*/.test(
      secaoContra8
    );

  return clonarProfundoCongelado({
    comandos,
    carcacasPerfil,
    targetVisual,
    cuesSonoros,
    temItem3ContraAuditoria8,
  });
}

/**
 * Extrai e audita o Volume 09 (Consolidação Executiva e Rastreabilidade Ondas 1 a 6):
 *  - 9.1: Matriz Mestre dos 5 Pilares Sênior (GDD <-> src/ <-> tests/ <-> Mutações);
 *  - 9.2: Máquina de Estados do Ciclo de Vida da Partida (7 transições de meta.faseJogo);
 *  - 9.3: Particionamento Determinístico de Seeds (5 Streams isolados de hash32).
 */
export function extrairConsolidacaoVolume09(conteudoVol09) {
  const secao91 = conteudoVol09.split('## 9.1.')[1]?.split('## 9.2.')[0] ?? '';
  const secao92 = conteudoVol09.split('## 9.2.')[1]?.split('## 9.3.')[0] ?? '';
  const secao93 = conteudoVol09.split('## 9.3.')[1]?.split('# CONTRA-AUDITORIA')[0] ?? '';
  const secaoContra9 = conteudoVol09.split('# CONTRA-AUDITORIA #9')[1] ?? '';

  const pilares = [];
  for (const linha of secao91.split('\n')) {
    if (
      linha.startsWith('| ') &&
      !linha.startsWith('| ID do Pilar') &&
      !linha.startsWith('| :---')
    ) {
      const cols = linha.split('|').map((c) => c.trim()).filter(Boolean);
      if (cols.length >= 7) {
        pilares.push({
          id: cols[0].replace(/`/g, '').trim(),
          escopo: normalizarTexto(cols[1]),
          fonteGdd: cols[2].replace(/`/g, '').trim(),
          moduloSrc: cols[3].replace(/`/g, '').trim(),
          portaoTeste: cols[4].replace(/`/g, '').trim(),
          invarianteChave: normalizarTexto(cols[5]),
          mutacoesReais: cols[6]
            .replace(/`/g, '')
            .split(',')
            .map((m) => m.trim())
            .filter(Boolean),
        });
      }
    }
  }

  const transicoesCiclo = [];
  for (const linha of secao92.split('\n')) {
    if (
      linha.startsWith('| ') &&
      !linha.startsWith('| ID da Transição') &&
      !linha.startsWith('| :---')
    ) {
      const cols = linha.split('|').map((c) => c.trim()).filter(Boolean);
      if (cols.length >= 5) {
        transicoesCiclo.push({
          id: cols[0].replace(/`/g, '').trim(),
          faseOrigem: cols[1].replace(/`/g, '').trim(),
          gatilho: normalizarTexto(cols[2]),
          faseDestino: cols[3].replace(/`/g, '').trim(),
          efeitoPersistencia: normalizarTexto(cols[4]),
        });
      }
    }
  }

  const streamsPrng = [];
  for (const linha of secao93.split('\n')) {
    if (
      linha.startsWith('| ') &&
      !linha.startsWith('| ID do Stream') &&
      !linha.startsWith('| :---')
    ) {
      const cols = linha.split('|').map((c) => c.trim()).filter(Boolean);
      if (cols.length >= 4) {
        streamsPrng.push({
          id: cols[0].replace(/`/g, '').trim(),
          dominio: normalizarTexto(cols[1]),
          assinaturaChave: cols[2].replace(/`/g, '').trim(),
          moduloConsumidor: cols[3].replace(/`/g, '').trim(),
        });
      }
    }
  }

  const temContraAuditoria9Completa =
    /1\.\s+\*\*Existe efeito borboleta/.test(secaoContra9) &&
    /2\.\s+\*\*Todos os 5 Pilares Sênior possuem cobertura cruzada/.test(secaoContra9);

  const algoritmoHash = {
    nome: secao93.match(/\*\*(FNV-1a de 32 bits)\*\*/)?.[1] ?? null,
    base: Number(secao93.match(/base `(0x[0-9A-Fa-f]+)`/)?.[1] ?? NaN),
    primo: Number(secao93.match(/primo `(0x[0-9A-Fa-f]+)`/)?.[1] ?? NaN),
    formatoChave: secao93.match(/chave ASCII `([^`]+)`/)?.[1] ?? null,
  };
  const matchVetor = secao93.match(/`hash32\('([^']+)', '([^']+)', ([^)]+)\) = (\d+)`/);
  const vetorTesteHash = matchVetor
    ? {
        seed: matchVetor[1],
        dominio: matchVetor[2],
        coordenadas: matchVetor[3].split(',').map((c) => {
          const s = c.trim().replace(/^'|'$/g, '');
          return /^\d+$/.test(s) ? Number(s) : s;
        }),
        valor: Number(matchVetor[4]),
      }
    : null;

  return clonarProfundoCongelado({
    pilares,
    transicoesCiclo,
    streamsPrng,
    algoritmoHash,
    vetorTesteHash,
    temContraAuditoria9Completa,
  });
}

/**
 * Extrai a tabela de Enums Canônicos do GameState (Seção 8.1 do Volume 08).
 */
export function extrairEnumsCanonicosVolume08(conteudoVol08) {
  const secao = conteudoVol08.split('### Enums Canônicos do `GameState`')[1]?.split('## 8.2.')[0] ?? '';
  const enums = {};
  for (const linha of secao.split('\n')) {
    const m = linha.match(/^\| `([A-Za-z.]+)` \| `([^`]+)` \|/);
    if (m) enums[m[1]] = m[2].split(',').map((v) => v.trim()).filter(Boolean);
  }
  return clonarProfundoCongelado(enums);
}

/**
 * Extrai a Árvore de Módulos (Seção 8.3 do Volume 08) como caminhos relativos com a Onda dona de cada arquivo.
 */
export function extrairArvoreModulosVolume08(conteudoVol08) {
  const secao = conteudoVol08.split('## 8.3.')[1]?.split('## 8.4.')[0] ?? '';
  const bloco = secao.match(/```text\n([\s\S]*?)\n```/)?.[1] ?? '';
  const pilha = [];
  const entradas = [];
  for (const linha of bloco.split('\n')) {
    const m = linha.match(/^([│ ]*)(?:├──|└──) (\S+)(?:\s+#\s*\[Onda (\d+)\])?/);
    if (!m) continue;
    const profundidade = m[1].length / 4;
    pilha.length = profundidade;
    const nome = m[2];
    const caminho = [...pilha, nome].join('');
    if (nome.endsWith('/')) {
      pilha.push(nome);
    } else {
      entradas.push({ caminho, onda: m[3] === undefined ? null : Number(m[3]) });
    }
  }
  return clonarProfundoCongelado(entradas);
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

  const listarRecursivo = (dir, prefixo = '') => {
    const itens = [];
    const entradas = fs.readdirSync(dir, { withFileTypes: true });
    if (entradas.length === 0 && prefixo) {
      itens.push(`${prefixo}/`);
    }
    for (const entrada of entradas) {
      const rel = prefixo ? `${prefixo}/${entrada.name}` : entrada.name;
      if (entrada.isDirectory()) {
        itens.push(...listarRecursivo(path.join(dir, entrada.name), rel));
      } else if (entrada.isFile()) {
        itens.push(rel);
      }
    }
    return itens;
  };

  const pastaSrc = path.join(diretorioRaiz, 'src');
  if (fs.existsSync(pastaSrc)) {
    const arquivosSrcNoDisco = listarRecursivo(pastaSrc).sort();
    const esperadosSrc = [...CADEIA_CANONICA_SRC, ...CADEIA_CANONICA_ONDAS_SRC].sort();
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
