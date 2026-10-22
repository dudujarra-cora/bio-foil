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

  let secaoAtual = '';
  for (const linha of linhas) {
    if (linha.startsWith('## 6.1.')) secaoAtual = '6.1';
    else if (linha.startsWith('## 6.2.')) secaoAtual = '6.2';
    else if (linha.startsWith('## 6.3.')) secaoAtual = '6.3';

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
          celulasMatriz.push({
            evento,
            estado: estadoId,
            regra: colunas[idx + 1],
          });
        });
      }
    }
  }

  return clonarProfundoCongelado({
    totalConstantes: Object.keys(constantesSsot).length,
    constantesSsot,
    totalCelulasMatriz: celulasMatriz.length,
    celulasMatriz,
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
  const naves = [];

  let secao = '';
  for (const linha of linhas) {
    if (linha.startsWith('## 5.1.')) secao = '5.1';
    else if (linha.startsWith('## 5.2.')) secao = '5.2';
    else if (linha.startsWith('## 5.3.')) secao = '5.3';
    else if (linha.startsWith('## 5.4.')) secao = '5.4';
    else if (linha.startsWith('## 5.5.')) secao = '5.5';

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
  }

  const matchPesoOrgao = conteudoVol05.match(/Cada Órgão adiciona \*\*\$\+(\d+(?:\.\d+)?)\\text\{ kg\}\$\*\*/);
  const pesoPorOrgaoKg = matchPesoOrgao ? Number(matchPesoOrgao[1]) : NaN;

  return clonarProfundoCongelado({
    armas,
    orgaos,
    pesoPorOrgaoKg,
    naves,
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
