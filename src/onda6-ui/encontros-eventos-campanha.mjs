/**
 * ONDA 6 — SSOT de Encontros Escalados, Topologia Ortogonal de Salas, Subsistemas Inimigos e Desfecho de Eventos
 * Dono Único (Lei N5): src/onda6-ui/encontros-eventos-campanha.mjs
 *
 * Responsabilidades:
 *  - Centralizar os identificadores canônicos de ações de campanha (`ACOES_CAMPANHA_BIOFOIL`) sem drift entre UI, motor e áudio;
 *  - Prover a resolução topológica única (`resolverGrafoOrtogonalAlvo`, `calcularCaminhoCurtoGrafoAlvo`, `calcularTrincaBeamAutomatica`);
 *  - Derivar de forma exata e sem contradição de tick `0` a presença e o estado do Sonar Militar (`possuiSalaSonarAlvo`, `possuiSonarMilitarAtivoAlvo`);
 *  - Gerar inimigos escalados S1..S8 (`gerarAlvoInimigoEscaladoSetor`), anexar mapas setoriais e unificar o contrato de `EVENTO_DESFECHO`.
 */
import { clonarProfundoCongelado } from '../gdd-parser.mjs';
import { kitCumpreRequisitoBlueOption } from '../oraculos-referencia.mjs';
import { streamCombateDisparo } from '../onda1-fisica/hash32-streams.mjs';
import {
  GRAFOS_BEAM_CANONICOS,
  enumerarTrincasBeam,
} from '../onda2-combate/tick-sistemas-armas.mjs';
import { gerarMapaSetorial } from '../onda4-mapa/gerador-poisson.mjs';
import {
  CATALOGO_TEMPLATES_EVENTOS_45A,
  VELOCIDADE_FRENTE_CORPORATIVA_MN_H,
  extrairKitDaNave,
} from '../onda4-mapa/eventos-nos.mjs';
import {
  calcularVelocidadeCruzeiroMapa,
  calcularHorasSaltoMapa,
} from '../onda4-mapa/relogio-viagem.mjs';
import {
  CATALOGO_BIOMAS_53,
  BESTIARIO_ARQUETIPOS_57A,
  calcularAtributosInimigoSetor,
  gerarEstoqueLojaForja,
} from '../onda5-catalogo-chefe/catalogo-naves-itens.mjs';
import { criarEstadoChefeDraga } from '../onda5-catalogo-chefe/chefe-draga.mjs';
import { salvarRunSaveDisco } from './persistencia-perfil.mjs';
import {
  resolverTemplateEventoUnificado,
  avaliarElegibilidadeBlueOptionSteam,
  sortearEventoCampanhaSteamSemRepeticao,
  plantarBoiaQuestNoSetor,
} from '../onda7-steam/eventos-ae-setores-5a8.mjs';
import { traduzirEventoSteam, TABELA_17_EVENTOS_GDD_I18N } from '../onda7-steam/i18n-dicionario-ui.mjs';
import {
  CATALOGO_24_ARMAS_STEAM,
  calcularModificadoresPassivosOrgaosSteam,
  sortearVitrineLojaSteam,
} from '../onda7-steam/catalogo-armas-orgaos-ae.mjs';
import {
  obterConfiguracaoDificuldadeSteam,
  escalarInimigoPorDificuldade,
} from '../onda7-steam/dificuldades-conquistas-opcoes.mjs';

export const ACOES_CAMPANHA_BIOFOIL = Object.freeze({
  EXECUTAR_ACAO_STEAM: 'EXECUTAR_ACAO_STEAM',
  ALTERNAR_AUDIO_MUDO: 'ALTERNAR_AUDIO_MUDO',
  SELECIONAR_CARCACA_HANGAR: 'SELECIONAR_CARCACA_HANGAR',
  ABANDONAR_EXPEDICAO: 'ABANDONAR_EXPEDICAO',
  ACEITAR_RENDICAO_INIMIGA: 'ACEITAR_RENDICAO_INIMIGA',
  SOLICITAR_CONFIRMACAO_ABANDONO: 'SOLICITAR_CONFIRMACAO_ABANDONO',
  CONFIRMAR_DESFECHO_EVENTO: 'CONFIRMAR_DESFECHO_EVENTO',
  INICIAR_NOVA_RUN: 'INICIAR_NOVA_RUN',
  CONTINUAR_RUN_SALVA: 'CONTINUAR_RUN_SALVA',
  VOLTAR_AO_HANGAR: 'VOLTAR_AO_HANGAR',
  ABRIR_FECHAR_OFICINA: 'ABRIR_FECHAR_OFICINA',
  ALTERNAR_MOEDA_REATOR: 'ALTERNAR_MOEDA_REATOR',
  COMPRAR_UPGRADE_OFICINA: 'COMPRAR_UPGRADE_OFICINA',
  EQUIPAR_ARMA_PORAO: 'EQUIPAR_ARMA_PORAO',
  DESEQUIPAR_ARMA_PARA_PORAO: 'DESEQUIPAR_ARMA_PARA_PORAO',
  ENXERTAR_ORGAO_PORAO: 'ENXERTAR_ORGAO_PORAO',
  REMOVER_ORGAO_PARA_PORAO: 'REMOVER_ORGAO_PARA_PORAO',
  DESCARTAR_ITEM_PORAO: 'DESCARTAR_ITEM_PORAO',
  ALTERNAR_MODO_DISPARO_ARMA: 'ALTERNAR_MODO_DISPARO_ARMA',
  DISPARAR_SALVA_MANUAL: 'DISPARAR_SALVA_MANUAL',
  MOVER_ABORDO_INIMIGO: 'MOVER_ABORDO_INIMIGO',
  CONFIRMAR_SAQUE_POS_COMBATE: 'CONFIRMAR_SAQUE_POS_COMBATE',
});

/**
 * Resolve o grafo ortogonal canônico de salas/órgãos para qualquer embarcação humana, criatura abissal ou fase da Draga Continental.
 */
export function resolverGrafoOrtogonalAlvo(alvoCombate) {
  if (alvoCombate?.grafoOrtogonal && typeof alvoCombate.grafoOrtogonal === 'object') {
    return alvoCombate.grafoOrtogonal;
  }
  const classe = String(alvoCombate?.classeAlvo ?? alvoCombate?.classeInimigo ?? 'BARCO_HUMANO').toUpperCase();
  const arqId = String(alvoCombate?.arquetipoId ?? '').toUpperCase();
  const salas = Array.isArray(alvoCombate?.salasOuOrgaos) ? alvoCombate.salasOuOrgaos : [];
  const nSalas = salas.length || 4;
  const nSubmersas = salas.filter((s) => Boolean(s.submersa)).length;

  if (classe === 'MONSTRO_MARINHO') {
    return GRAFOS_BEAM_CANONICOS.MONSTRO_1X4;
  }
  if (classe === 'CHEFE_DRAGA') {
    const fase = Number(alvoCombate?.faseChefe ?? alvoCombate?.faseAtual ?? 1);
    if (fase >= 3) return GRAFOS_BEAM_CANONICOS.DRAGA_F3_5;
    if (fase === 2) return GRAFOS_BEAM_CANONICOS.DRAGA_F2_6;
    return GRAFOS_BEAM_CANONICOS.DRAGA_F1_6;
  }
  if (arqId === 'BARCO_4_SUBMARINO' || (nSalas === 6 && nSubmersas === 4)) {
    return GRAFOS_BEAM_CANONICOS.BARCO_SUBMARINO_6;
  }
  if (arqId === 'BARCO_3_ARRASTAO' || nSalas === 6) {
    return GRAFOS_BEAM_CANONICOS.BARCO_ARRASTAO_6;
  }
  if (arqId === 'BARCO_2_CORVETA' || nSalas === 5) {
    return GRAFOS_BEAM_CANONICOS.BARCO_CORVETA_5;
  }
  return GRAFOS_BEAM_CANONICOS.BARCO_2X2;
}

/**
 * Calcula o caminho mais curto por busca em largura (BFS) no grafo ortogonal de salas do alvo.
 */
export function calcularCaminhoCurtoGrafoAlvo(alvoOuGrafo, salaOrigemId, salaDestinoId) {
  const grafo =
    alvoOuGrafo && typeof alvoOuGrafo === 'object' && ('salasOuOrgaos' in alvoOuGrafo || 'classeAlvo' in alvoOuGrafo || 'classeInimigo' in alvoOuGrafo)
      ? resolverGrafoOrtogonalAlvo(alvoOuGrafo)
      : (alvoOuGrafo ?? GRAFOS_BEAM_CANONICOS.BARCO_2X2);
  const orig = Number(salaOrigemId);
  const dest = Number(salaDestinoId);
  if (orig === dest) return [orig];
  const fila = [[orig]];
  const visitados = new Set([orig]);
  while (fila.length > 0) {
    const caminho = fila.shift();
    const atual = caminho[caminho.length - 1];
    for (const viz of grafo[atual] ?? []) {
      const vNum = Number(viz);
      if (vNum === dest) return [...caminho, vNum];
      if (!visitados.has(vNum)) {
        visitados.add(vNum);
        fila.push([...caminho, vNum]);
      }
    }
  }
  return [orig, dest];
}

/**
 * Verifica se o alvo possui de fato uma sala física de `SONAR` em `salasOuOrgaos`.
 */
export function possuiSalaSonarAlvo(alvoCombate) {
  const salas = Array.isArray(alvoCombate?.salasOuOrgaos) ? alvoCombate.salasOuOrgaos : [];
  if (salas.length === 0) return false;
  return salas.some((s) => /SONAR/i.test(String(s.nome ?? s.nomeSala ?? '')));
}

/**
 * Verifica se o subsistema de `SONAR` Militar do alvo está íntegro e não-ionizado neste exato instante.
 */
export function possuiSonarMilitarAtivoAlvo(alvoCombate) {
  if (!alvoCombate || typeof alvoCombate !== 'object') return false;
  const classe = String(alvoCombate.classeAlvo ?? alvoCombate.classeInimigo ?? 'BARCO_HUMANO').toUpperCase();
  if (classe === 'MONSTRO_MARINHO') return false;
  const salas = Array.isArray(alvoCombate.salasOuOrgaos) ? alvoCombate.salasOuOrgaos : [];
  const salaSonar = salas.find((s) => /SONAR/i.test(String(s.nome ?? s.nomeSala ?? '')));
  if (!salaSonar) return false;
  const ionSeg = Number(salaSonar.paralisiaIonSeg ?? salaSonar.tempoRestanteIonSeg ?? 0);
  if (ionSeg > 0) return false;
  const integridade = Math.max(0, Number(salaSonar.integridadeAtual ?? salaSonar.integridade ?? 0));
  return integridade > 0;
}

/**
 * Constrói automaticamente uma trinca ortogonal válida de 3 salas (`trincaSalasBeam`) para o `CORTADOR_TERMICO_PLASMA`
 * a partir de uma sala inicial clicada e (opcionalmente) uma segunda sala de direção/destino.
 */
export function calcularTrincaBeamAutomatica(alvoCombate, salaInicialId, salaSecundariaOpcionalId = null) {
  const s1 = Number(salaInicialId);
  const grafo = resolverGrafoOrtogonalAlvo(alvoCombate);
  const salasValidasIds = new Set(
    Array.isArray(alvoCombate?.salasOuOrgaos) && alvoCombate.salasOuOrgaos.length > 0
      ? alvoCombate.salasOuOrgaos.map((s) => Number(s.id))
      : Object.keys(grafo).map((k) => Number(k))
  );
  if (!Number.isInteger(s1) || !salasValidasIds.has(s1)) {
    return clonarProfundoCongelado({
      ok: false,
      codigoErro: 'SALA_BEAM_INVALIDA',
      trincaSalasBeam: null,
    });
  }

  const todas = enumerarTrincasBeam(grafo).filter((t) =>
    t.every((idSala) => salasValidasIds.has(Number(idSala)))
  );
  const iniciandoEmS1 = todas.filter((t) => t[0] === s1);
  const candidatas = iniciandoEmS1.length > 0 ? iniciandoEmS1 : todas.filter((t) => t.includes(s1));
  if (candidatas.length === 0) {
    return clonarProfundoCongelado({
      ok: false,
      codigoErro: 'TRINCA_BEAM_INDISPONIVEL',
      trincaSalasBeam: null,
    });
  }

  const s2Pref =
    salaSecundariaOpcionalId !== null && salaSecundariaOpcionalId !== undefined
      ? Number(salaSecundariaOpcionalId)
      : null;

  const mapaSalas = new Map((alvoCombate?.salasOuOrgaos ?? []).map((s) => [Number(s.id), s]));
  const pontuarTrinca = (trinca) => {
    let score = 0;
    if (s2Pref !== null && s2Pref !== s1) {
      if (trinca[1] === s2Pref) score += 200;
      else if (trinca[2] === s2Pref) score += 150;
    }
    for (const idS of trinca) {
      const salaObj = mapaSalas.get(idS);
      const intAtu = Number(salaObj?.integridadeAtual ?? salaObj?.integridade ?? 1);
      score += intAtu > 0 ? 20 + intAtu : 2;
    }
    return score;
  };

  let melhor = candidatas[0];
  let melhorScore = pontuarTrinca(melhor);
  for (let i = 1; i < candidatas.length; i += 1) {
    const sc = pontuarTrinca(candidatas[i]);
    if (sc > melhorScore) {
      melhor = candidatas[i];
      melhorScore = sc;
    }
  }

  return clonarProfundoCongelado({
    ok: true,
    salaInicialId: melhor[0],
    trincaSalasBeam: melhor,
  });
}

/**
 * Gera um inimigo escalado real para os Setores 1..8 a partir de `BESTIARIO_ARQUETIPOS_57A` + `calcularAtributosInimigoSetor`,
 * ou a `CHEFE_DRAGA` Fase 1 no confronto final do Setor 8.
 */
export function gerarAlvoInimigoEscaladoSetor(seedPartida = 'seed-biofoil', setorNumero = 1, noId = 'NO_1', opcoes = {}) {
  const s = Math.max(1, Math.min(8, Math.floor(Number(setorNumero) || 1)));
  if (opcoes.chefeDraga === true || (s === 8 && opcoes.forcarComumSetor8 !== true)) {
    const faseDraga = Math.max(1, Math.min(3, Math.floor(Number(opcoes.faseDraga ?? 1) || 1)));
    return criarEstadoChefeDraga(faseDraga);
  }

  const sCurva = Math.min(7, s);
  const biomaSetor = CATALOGO_BIOMAS_53[s - 1] ?? CATALOGO_BIOMAS_53[0];
  const atr = calcularAtributosInimigoSetor(sCurva);
  const canalVisOpcao = opcoes.canalVisibilidadeSonar ?? null;
  const elegiveis = BESTIARIO_ARQUETIPOS_57A.filter((arq) => {
    if (opcoes.arquetipoId) return arq.id === opcoes.arquetipoId;
    if (opcoes.classeForcada === 'BARCO_HUMANO' && arq.classe !== 'BARCO_HUMANO') return false;
    if (opcoes.classeForcada === 'MONSTRO_MARINHO' && arq.classe === 'BARCO_HUMANO') return false;
    return sCurva >= arq.setorMin && sCurva <= arq.setorMax;
  });

  const pool = elegiveis.length > 0 ? elegiveis : BESTIARIO_ARQUETIPOS_57A;
  const ehFossaMonstros =
    !opcoes.arquetipoId &&
    !opcoes.classeForcada &&
    biomaSetor?.regraEspecial === 'ESCURIDAO_SONAR_E_MONSTROS';
  const poolMonstrosFossa = ehFossaMonstros ? pool.filter((a) => a.classe !== 'BARCO_HUMANO') : [];
  const h = streamCombateDisparo(String(seedPartida), s, String(noId), 0, 77);
  const usarPoolMonstrosFossa = poolMonstrosFossa.length > 0 && h % 10 < 7;
  const poolFinal = usarPoolMonstrosFossa ? poolMonstrosFossa : pool;
  const arq = poolFinal[h % poolFinal.length];

  if (arq.classe !== 'BARCO_HUMANO') {
    const ganglioBarras = atr.ganglioCentralBarras;
    const barrasSec = Math.max(2, 1 + Math.floor(sCurva / 2));
    const ehSteamMon = opcoes.edicaoComercialSteam === true;
    let salasMonstro;
    let grafoMonstro = null;
    if (ehSteamMon && arq.id === 'MONSTRO_2_ENGUIA') {
      salasMonstro = [
        { id: 1, nome: 'MANDIBULA_VOLT', submersa: true, integridadeAtual: barrasSec + 1, integridade: barrasSec + 1, integridadeMax: barrasSec + 1, barrasMax: barrasSec + 1, aguaKg: 25, tripulantes: [] },
        { id: 2, nome: 'AMPOLAS_CHOQUE', submersa: true, integridadeAtual: barrasSec, integridade: barrasSec, integridadeMax: barrasSec, barrasMax: barrasSec, aguaKg: 25, tripulantes: [] },
        { id: 3, nome: 'SINAPSE_LATERAL', submersa: true, integridadeAtual: barrasSec, integridade: barrasSec, integridadeMax: barrasSec, barrasMax: barrasSec, aguaKg: 25, tripulantes: [] },
        { id: 4, nome: 'CAUDA_PROPULSORA', submersa: true, integridadeAtual: barrasSec, integridade: barrasSec, integridadeMax: barrasSec, barrasMax: barrasSec, aguaKg: 25, tripulantes: [] },
        { id: 5, nome: 'GANGLIO_CENTRAL', ehGanglioCentral: true, submersa: true, integridadeAtual: ganglioBarras, integridade: ganglioBarras, integridadeMax: ganglioBarras, barrasMax: ganglioBarras, aguaKg: 25, tripulantes: [] },
      ];
      grafoMonstro = { 1: [2], 2: [1, 3], 3: [2, 4], 4: [3, 5], 5: [4] };
    } else if (ehSteamMon && arq.id === 'MONSTRO_3_CARANGUEJO') {
      salasMonstro = [
        { id: 1, nome: 'GARRA_ESMAGADORA', submersa: true, integridadeAtual: barrasSec + 1, integridade: barrasSec + 1, integridadeMax: barrasSec + 1, barrasMax: barrasSec + 1, aguaKg: 25, tripulantes: [] },
        { id: 2, nome: 'BICO_QUITINOSO', submersa: true, integridadeAtual: barrasSec, integridade: barrasSec, integridadeMax: barrasSec, barrasMax: barrasSec, aguaKg: 25, tripulantes: [] },
        { id: 3, nome: 'CARAPACA_DORSAL', submersa: true, integridadeAtual: barrasSec + 1, integridade: barrasSec + 1, integridadeMax: barrasSec + 1, barrasMax: barrasSec + 1, aguaKg: 25, tripulantes: [] },
        { id: 4, nome: 'BEXIGA_PRESSAO', submersa: true, integridadeAtual: barrasSec, integridade: barrasSec, integridadeMax: barrasSec, barrasMax: barrasSec, aguaKg: 25, tripulantes: [] },
        { id: 5, nome: 'GANGLIO_CENTRAL', ehGanglioCentral: true, submersa: true, integridadeAtual: ganglioBarras, integridade: ganglioBarras, integridadeMax: ganglioBarras, barrasMax: ganglioBarras, aguaKg: 25, tripulantes: [] },
      ];
      grafoMonstro = { 1: [2, 3], 2: [1, 4], 3: [1, 4, 5], 4: [2, 3, 5], 5: [3, 4] };
    } else if (ehSteamMon && arq.id === 'MONSTRO_4_HIDRA') {
      salasMonstro = [
        { id: 1, nome: 'CABECA_TERMICA_A', submersa: true, integridadeAtual: barrasSec + 1, integridade: barrasSec + 1, integridadeMax: barrasSec + 1, barrasMax: barrasSec + 1, aguaKg: 25, tripulantes: [] },
        { id: 2, nome: 'CABECA_TERMICA_B', submersa: true, integridadeAtual: barrasSec + 1, integridade: barrasSec + 1, integridadeMax: barrasSec + 1, barrasMax: barrasSec + 1, aguaKg: 25, tripulantes: [] },
        { id: 3, nome: 'BOLSA_ESPOROS', submersa: true, integridadeAtual: barrasSec, integridade: barrasSec, integridadeMax: barrasSec, barrasMax: barrasSec, aguaKg: 25, tripulantes: [] },
        { id: 4, nome: 'SIFAO_MUSCULAR', submersa: true, integridadeAtual: barrasSec, integridade: barrasSec, integridadeMax: barrasSec, barrasMax: barrasSec, aguaKg: 25, tripulantes: [] },
        { id: 5, nome: 'CORACAO_MAGMA', submersa: true, integridadeAtual: barrasSec, integridade: barrasSec, integridadeMax: barrasSec, barrasMax: barrasSec, aguaKg: 25, tripulantes: [] },
        { id: 6, nome: 'GANGLIO_CENTRAL', ehGanglioCentral: true, submersa: true, integridadeAtual: ganglioBarras, integridade: ganglioBarras, integridadeMax: ganglioBarras, barrasMax: ganglioBarras, aguaKg: 25, tripulantes: [] },
      ];
      grafoMonstro = { 1: [2, 3], 2: [1, 4], 3: [1, 4, 5], 4: [2, 3, 6], 5: [3, 6], 6: [4, 5] };
    } else {
      salasMonstro = [
        { id: 1, nome: 'TENTACULOS', submersa: true, integridadeAtual: barrasSec + 1, integridade: barrasSec + 1, integridadeMax: barrasSec + 1, barrasMax: barrasSec + 1, aguaKg: 25, tripulantes: [] },
        { id: 2, nome: 'BICO_QUITINOSO', submersa: true, integridadeAtual: barrasSec, integridade: barrasSec, integridadeMax: barrasSec, barrasMax: barrasSec, aguaKg: 25, tripulantes: [] },
        { id: 3, nome: 'SIFAO_MUSCULAR', submersa: true, integridadeAtual: barrasSec, integridade: barrasSec, integridadeMax: barrasSec, barrasMax: barrasSec, aguaKg: 25, tripulantes: [] },
        { id: 4, nome: 'GANGLIO_CENTRAL', ehGanglioCentral: true, submersa: true, integridadeAtual: ganglioBarras, integridade: ganglioBarras, integridadeMax: ganglioBarras, barrasMax: ganglioBarras, aguaKg: 25, tripulantes: [] },
      ];
    }
    return clonarProfundoCongelado({
      ativo: true,
      arquetipoId: arq.id,
      idInimigo: `${arq.id}_S${s}`,
      nome: arq.nome.replace(/^\d+\.\s*/, ''),
      classeAlvo: 'MONSTRO_MARINHO',
      classeInimigo: 'MONSTRO_MARINHO',
      setorNumero: s,
      temSonarMilitar: false,
      sonarMilitarAtivo: false,
      ...(canalVisOpcao ? { canalVisibilidadeSonar: canalVisOpcao } : {}),
      ...(grafoMonstro ? { grafoOrtogonal: grafoMonstro } : {}),
      orgaoExtraido: arq.orgaoExtraido ?? 'BOLSA_TINTA_ABISSAL',
      hpCascoAtual: atr.monstroHp,
      hpCascoMax: atr.monstroHp,
      esquivaBasePct: atr.monstroEsquivaPct,
      esquivaEfetivaPct: atr.monstroEsquivaPct,
      camadasBarreiraAtivas: 0,
      barreiraBolhasAtual: 0,
      barreiraBolhasMax: 0,
      progressoAtaquePrimarioSeg: 0.0,
      progressoAtaqueSecundarioSeg: 0.0,
      salasOuOrgaos: salasMonstro,
      tripulacaoInimiga: [],
    });
  }

  const nTrip = atr.tripulacaoHumana;
  const usaMergulhador = arq.id === 'BARCO_3_ARRASTAO' || arq.id === 'BARCO_4_SUBMARINO';
  const bArmas = Math.min(4, 2 + Math.floor(sCurva / 2));
  const bMotor = Math.min(4, 2 + Math.floor(sCurva / 3));
  const bTorpedo = Math.min(4, 1 + Math.ceil(sCurva / 2));
  const bAux = Math.max(2, Math.min(4, 1 + Math.floor(sCurva / 2)));

  let definiSalasBarco;
  if (arq.id === 'BARCO_2_CORVETA') {
    definiSalasBarco = [
      { id: 1, nome: 'CABINE', submersa: false, barras: 2 },
      { id: 2, nome: 'TORRETA', submersa: false, barras: bArmas },
      { id: 3, nome: 'SONAR', submersa: false, barras: bAux },
      { id: 4, nome: 'TORPEDO', submersa: true, barras: bTorpedo },
      { id: 5, nome: 'MOTOR', submersa: true, barras: bMotor },
    ];
  } else if (arq.id === 'BARCO_3_ARRASTAO') {
    definiSalasBarco = [
      { id: 1, nome: 'CABINE', submersa: false, barras: 2 },
      { id: 2, nome: 'TORRETA', submersa: false, barras: bArmas },
      { id: 3, nome: 'GUINDASTE', submersa: false, barras: bAux },
      { id: 4, nome: 'TORPEDO', submersa: true, barras: bTorpedo },
      { id: 5, nome: 'ESCUDO', submersa: true, barras: Math.max(2, atr.barcoBarreiraBolhas) },
      { id: 6, nome: 'MOTOR', submersa: true, barras: bMotor },
    ];
  } else if (arq.id === 'BARCO_4_SUBMARINO') {
    definiSalasBarco = [
      { id: 1, nome: 'SONAR', submersa: false, barras: bAux },
      { id: 2, nome: 'TORRETA', submersa: false, barras: bArmas },
      { id: 3, nome: 'CABINE', submersa: true, barras: 2 },
      { id: 4, nome: 'TORPEDO', submersa: true, barras: bTorpedo },
      { id: 5, nome: 'ESCUDO', submersa: true, barras: Math.max(2, atr.barcoBarreiraBolhas) },
      { id: 6, nome: 'MOTOR', submersa: true, barras: bMotor },
    ];
  } else {
    definiSalasBarco = [
      { id: 1, nome: 'CABINE', submersa: false, barras: 2 },
      { id: 2, nome: 'TORRETA', submersa: false, barras: bArmas },
      { id: 3, nome: 'MOTOR', submersa: true, barras: bMotor },
      { id: 4, nome: 'TORPEDO', submersa: true, barras: bTorpedo },
    ];
  }

  const totalSalasBarco = definiSalasBarco.length;
  const tripulacaoInimiga = [];
  for (let i = 0; i < nTrip; i += 1) {
    const defAloc = definiSalasBarco[i % totalSalasBarco];
    const salaId = defAloc.id;
    const ehMerg = usaMergulhador && Boolean(defAloc.submersa);
    tripulacaoInimiga.push({
      id: `hum-${arq.id.toLowerCase()}-s${s}-${i + 1}`,
      especie: ehMerg ? 'MERGULHADOR' : 'MARINHEIRO',
      classe: ehMerg ? 'MERGULHADOR' : 'MARINHEIRO',
      hpAtual: 100,
      hpMax: 100,
      dps: ehMerg ? 12 : 8,
      salaId,
      imuneAfogamento: ehMerg,
    });
  }

  const salasOuOrgaos = definiSalasBarco.map((def) => ({
    id: def.id,
    nome: def.nome,
    submersa: def.submersa,
    integridadeAtual: def.barras,
    integridade: def.barras,
    integridadeMax: def.barras,
    barrasMax: def.barras,
    aguaKg: 0.0,
    rombosSubmersos: 0,
    tripulantes: tripulacaoInimiga.filter((t) => t.salaId === def.id),
  }));

  const temSonarReal = possuiSalaSonarAlvo({ salasOuOrgaos });
  const sonarAtivoReal = possuiSonarMilitarAtivoAlvo({ classeAlvo: 'BARCO_HUMANO', salasOuOrgaos });
  const reducaoKelpPct = Number(biomaSetor?.reducaoEsquivaBarcosPct ?? 0);
  const esquivaBarcoSetor = Math.max(0, Number(atr.barcoEsquivaPct ?? 0) - reducaoKelpPct);
  const bonusBolhasBarreira = Math.max(0, Number(opcoes.bonusBarreiraInimigo ?? 0));
  const bolhasTotaisBarco = Number(atr.barcoBarreiraBolhas ?? 0) + bonusBolhasBarreira;

  return clonarProfundoCongelado({
    ativo: true,
    arquetipoId: arq.id,
    idInimigo: `${arq.id}_S${s}`,
    nome: arq.nome.replace(/^\d+\.\s*/, ''),
    classeAlvo: 'BARCO_HUMANO',
    classeInimigo: 'BARCO_HUMANO',
    setorNumero: s,
    temSonarMilitar: temSonarReal,
    sonarMilitarAtivo: sonarAtivoReal,
    ...(canalVisOpcao ? { canalVisibilidadeSonar: canalVisOpcao } : {}),
    hpCascoAtual: atr.barcoHp,
    hpCascoMax: atr.barcoHp,
    esquivaBasePct: esquivaBarcoSetor,
    esquivaEfetivaPct: esquivaBarcoSetor,
    camadasBarreiraAtivas: bolhasTotaisBarco,
    barreiraBolhasAtual: bolhasTotaisBarco,
    barreiraBolhasMax: bolhasTotaisBarco,
    progressoAtaquePrimarioSeg: 0.0,
    progressoAtaqueSecundarioSeg: 0.0,
    salasOuOrgaos,
    tripulacaoInimiga,
  });
}

/**
 * Equipa barcos corporativos na Edição Comercial Steam com um par determinístico e visível de armas reais
 * do `CATALOGO_24_ARMAS_STEAM` escaladas pelo setor (Torreta Primária + Bateria Secundária).
 */
export function equiparArsenalModularInimigoSteam(
  alvoBase,
  seedPartida = 'seed-biofoil',
  setorNumero = 1,
  noId = 'NO_1'
) {
  if (!alvoBase || alvoBase.ativo === false || alvoBase.faseChefe) return alvoBase;
  const classe = alvoBase.classeAlvo ?? alvoBase.classeInimigo ?? 'BARCO_HUMANO';
  if (classe !== 'BARCO_HUMANO') return alvoBase;
  const s = Math.max(1, Math.min(8, Math.floor(Number(setorNumero) || 1)));
  const maxEnePrim = s <= 2 ? 1 : s <= 5 ? 2 : 3;
  const poolPrim = CATALOGO_24_ARMAS_STEAM.filter(
    (w) => Number(w.municao ?? 0) === 0 && !w.ehFeixe && Number(w.energia ?? 1) <= maxEnePrim
  );
  const poolSec = CATALOGO_24_ARMAS_STEAM.filter(
    (w) =>
      (Number(w.municao ?? 0) >= 1 || Boolean(w.mecanicaEspecial) || Number(w.chanceFuroPct ?? 0) >= 40) &&
      Number(w.energia ?? 1) <= Math.min(3, maxEnePrim + 1)
  );
  const h1 = streamCombateDisparo(String(seedPartida), s, String(noId), 0, 811);
  const h2 = streamCombateDisparo(String(seedPartida), s, String(noId), 0, 812);
  const w1 = (poolPrim.length > 0 ? poolPrim : CATALOGO_24_ARMAS_STEAM)[h1 % Math.max(1, poolPrim.length)];
  const w2 = (poolSec.length > 0 ? poolSec : CATALOGO_24_ARMAS_STEAM)[h2 % Math.max(1, poolSec.length)];
  const PREPOSICOES_CURTAS = new Set(['DE', 'DO', 'DA', 'DOS', 'DAS', 'EM', 'OF', 'THE']);
  const abreviarLimpo15 = (txt) => {
    const s = String(txt ?? '').replace(/^\d+\.\s*/, '').trim().toUpperCase();
    if (s.length <= 15) return s;
    const palavras = s.split(/\s+/).filter((p) => !PREPOSICOES_CURTAS.has(p));
    if (palavras.length >= 2) {
      const par = `${palavras[0]} ${palavras[1]}`;
      if (par.length <= 15) return par;
      return `${par.slice(0, 14).trimEnd()}.`;
    }
    return `${s.slice(0, 14).trimEnd()}.`;
  };
  const resumirArmaInim = (w, slot) => {
    const rotPtCurto = abreviarLimpo15(w.cardPt ?? w.nome ?? w.id);
    const rotEnCurto = abreviarLimpo15(w.cardEn ?? w.nomeEn ?? w.nome ?? w.id);
    const ionBase = Number(w.danoIonico ?? 0);
    return {
      slot,
      id: w.id,
      chassiId: w.id,
      nomePt: rotPtCurto,
      nomeEn: rotEnCurto,
      familiaVisual: w.familiaVisual ?? (slot === 2 ? 'TORPEDO_ABISSAL' : 'PROJETIL_ACUSTICO'),
      mecanicaEspecial: w.mecanicaEspecial ?? null,
      danoCasco: Number(w.danoCasco ?? (ionBase > 0 ? 0 : 1)),
      danoSistema: Number(w.danoSistema ?? (ionBase > 0 ? 0 : 1)),
      danoIonico: ionBase,
      duracaoIonSeg: Number(w.duracaoIonSeg ?? 4),
      chanceFuroPct: Number(w.chanceFuroPct ?? 0),
      ignoraEscudo: Number(w.municao ?? 0) > 0 || w.familiaVisual === 'TORPEDO_ABISSAL',
      atordoamentoAlvoSeg: Number(w.atordoamentoAlvoSeg ?? 0),
    };
  };
  return clonarProfundoCongelado({
    ...alvoBase,
    armasEquipadasInimigo: [resumirArmaInim(w1, 1), resumirArmaInim(w2, 2)],
  });
}

/**
 * Anexa de forma determinística o mapa hidrográfico setorial (`gerarMapaSetorial`) e metadados do bioma `1..8` ao estado.
 */
export function anexarMapaSetorAoEstado(estadoBase, seedPartida, setorNumero) {
  const s = Math.max(1, Math.min(8, Math.floor(Number(setorNumero) || 1)));
  const bioma = CATALOGO_BIOMAS_53[s - 1] ?? CATALOGO_BIOMAS_53[0];
  const idsTemplatesSetorAnterior = Array.isArray(estadoBase?.mapaSetorial?.templatesSorteados?.todos)
    ? estadoBase.mapaSetorial.templatesSorteados.todos
    : [];
  const questSpillover = estadoBase?.mapaSetorial?.questPendenteProximoSetor ?? null;
  const mapaBruto = gerarMapaSetorial(seedPartida, s, idsTemplatesSetorAnterior);
  const noEntrada = mapaBruto.nos.find((n) => n.tipoNo === 'ENTRADA') ?? mapaBruto.nos[0];
  const ehSteam = Boolean(estadoBase?.meta?.edicaoComercialSteam);
  const usadosAcumulados = Array.isArray(estadoBase?.meta?.eventosUsadosNaRun)
    ? [...estadoBase.meta.eventosUsadosNaRun]
    : [];
  let idxSalEv = 0;
  const nosComEntradaVisitada = mapaBruto.nos.map((n) => {
    const baseNo = n.id === noEntrada.id ? { ...n, visitado: true } : { ...n };
    if (ehSteam && (baseNo.tipoNo === 'SOS' || baseNo.tipoNo === 'EXPLORACAO' || baseNo.tipoNo === 'PERIGO')) {
      const evSorteado = sortearEventoCampanhaSteamSemRepeticao(seedPartida, s, baseNo.tipoNo, usadosAcumulados, idxSalEv++);
      if (evSorteado?.id) {
        usadosAcumulados.push(evSorteado.id);
        baseNo.idTemplateEvento = evSorteado.id;
      }
    }
    return baseNo;
  });
  const modsOrgaosMapa = ehSteam ? calcularModificadoresPassivosOrgaosSteam(estadoBase?.naveJogador) : null;
  const mapaSetorialBase = {
    ...mapaBruto,
    setorNumero: s,
    biomaId: bioma.id,
    nomeBioma: bioma.nome,
    noAtualId: noEntrada.id,
    relogioHoras: 0.0,
    relogioSetorHoras: 0.0,
    frenteCorporacaoMn: 0.0,
    ...(modsOrgaosMapa?.revelaNosAdjacentesMapa ? { cartaRevelada: true } : {}),
    nos: nosComEntradaVisitada,
  };
  const mapaSetorialFinal =
    ehSteam && questSpillover ? plantarBoiaQuestNoSetor(mapaSetorialBase, questSpillover) : mapaSetorialBase;

  return clonarProfundoCongelado({
    ...estadoBase,
    meta: {
      ...estadoBase.meta,
      seedPartida,
      setorAtual: s,
      biomaId: bioma.id,
      nomeBioma: bioma.nome,
      aguasTurvasAtivas: Boolean(bioma.aguasTurvas || bioma.regraEspecial === 'ESCURIDAO_SONAR_E_MONSTROS'),
      perigoAmbientalId: null,
      modificadoresCombateAtivos: null,
      ...(ehSteam ? { eventosUsadosNaRun: usadosAcumulados } : {}),
    },
    mapaSetorial: mapaSetorialFinal,
  });
}

/**
 * Resolve a transição de entrada em qualquer boia do mapa setorial (`SAIDA`, `LOJA`, `SOS`/`EXPLORACAO`/`PERIGO`, `COMBATE` ou Frente Corporativa).
 */
export function resolverEntradaNoMapaCampanha(estadoPosSaltoBruto, noDestino, opcoesPersistencia = {}) {
  const ehSteamSalto = Boolean(estadoPosSaltoBruto.meta?.edicaoComercialSteam);
  const curaSaltoAe = ehSteamSalto
    ? Number(calcularModificadoresPassivosOrgaosSteam(estadoPosSaltoBruto.naveJogador).reparaCascoPorSaltoHp ?? 0)
    : 0;
  const estadoPosSalto =
    curaSaltoAe > 0 && estadoPosSaltoBruto.naveJogador
      ? {
          ...estadoPosSaltoBruto,
          naveJogador: {
            ...estadoPosSaltoBruto.naveJogador,
            hpCascoAtual: Math.min(
              Number(estadoPosSaltoBruto.naveJogador.hpCascoMax ?? 30),
              Number(estadoPosSaltoBruto.naveJogador.hpCascoAtual ?? 0) + curaSaltoAe
            ),
          },
        }
      : estadoPosSaltoBruto;
  const seed = estadoPosSalto.meta?.seedPartida ?? 'seed-campanha';
  const setor = Number(estadoPosSalto.mapaSetorial?.setorNumero ?? estadoPosSalto.meta?.setorAtual ?? 1);
  const tipoNo = noDestino?.tipoNo ?? 'COMBATE';
  const biomaAtual = CATALOGO_BIOMAS_53[Math.max(0, Math.min(7, setor - 1))] ?? CATALOGO_BIOMAS_53[0];
  const ehSteamEnt = Boolean(estadoPosSalto.meta?.edicaoComercialSteam);
  const difEnt = estadoPosSalto.meta?.dificuldade ?? 'NORMAL';
  const velFrotaEnt = ehSteamEnt
    ? obterConfiguracaoDificuldadeSteam(difEnt).velocidadeFrotaMnPorHora
    : VELOCIDADE_FRENTE_CORPORATIVA_MN_H;
  const relogioHoras = Number(
    estadoPosSalto.mapaSetorial?.relogioSetorHoras ?? estadoPosSalto.mapaSetorial?.relogioHoras ?? 0
  );
  const frenteMn = Number(estadoPosSalto.mapaSetorial?.frenteCorporacaoMn ?? relogioHoras * velFrotaEnt);
  const camCortex = (estadoPosSalto.naveJogador?.camaras ?? []).find((c) => c.id === 2);
  const intCortex = Math.max(
    0,
    Number(camCortex?.barrasIntegridade ?? camCortex?.integridade ?? 1) -
      Number(camCortex?.danoIonizado ?? camCortex?.barrasIonizadas ?? 0)
  );
  const canalVisBioma =
    biomaAtual?.regraEspecial === 'ESCURIDAO_SONAR_E_MONSTROS' && intCortex < 3 ? 'NEGADO_SONAR' : null;
  const engolidoFrota =
    tipoNo !== 'SAIDA' &&
    (noDestino?.engolidoCorporacao === true ||
      (relogioHoras > 0 && noDestino?.xMn !== undefined && Number(noDestino.xMn) <= frenteMn));

  const ehEnEnt = ehSteamEnt && estadoPosSalto.meta?.configuracoesSteam?.idioma === 'en-US';
  if (engolidoFrota) {
    const alvoEliteBase = gerarAlvoInimigoEscaladoSetor(seed, Math.min(7, setor + 1), noDestino.id, {
      classeForcada: 'BARCO_HUMANO',
      bonusBarreiraInimigo: 1,
      canalVisibilidadeSonar: canalVisBioma,
    });
    const alvoEliteEsc = ehSteamEnt ? escalarInimigoPorDificuldade(alvoEliteBase, difEnt, Math.min(7, setor + 1)) : alvoEliteBase;
    const alvoElite = ehSteamEnt ? equiparArsenalModularInimigoSteam(alvoEliteEsc, seed, Math.min(7, setor + 1), noDestino.id) : alvoEliteEsc;
    return {
      ...estadoPosSalto,
      meta: {
        ...estadoPosSalto.meta,
        faseJogo: 'COMBATE',
        modalCampanhaAtivo: null,
        hpCascoInimigoInicioLuta: alvoElite.hpCascoMax,
        ...(ehSteamEnt
          ? {
              hpCascoJogadorInicioLuta: Number(estadoPosSalto.naveJogador?.hpCascoAtual ?? 0),
              tripulacaoVivosInicioLutaCount: (estadoPosSalto.naveJogador?.tripulacao ?? []).filter(
                (t) => Number(t.hpAtual ?? 0) > 0
              ).length,
              telemetriaCombateSteam: {},
            }
          : {}),
        ultimoAvisoCampanha: ehEnEnt ? 'CORPORATE FLEET AMBUSH!' : 'EMBOSCADA DA FRENTE CORPORATIVA!',
        perigoAmbientalId: null,
        modificadoresCombateAtivos: {
          origemCombate: 'FROTA_PRINCIPAL_CORPORACAO',
          bonusBarreiraInimigo: 1,
        },
      },
      alvoCombate: alvoElite,
    };
  }

  if (
    tipoNo === 'SOS' &&
    noDestino?.tPrazoHoras !== null &&
    noDestino?.tPrazoHoras !== undefined &&
    relogioHoras > Number(noDestino.tPrazoHoras)
  ) {
    const alvoZonaMortaBase = gerarAlvoInimigoEscaladoSetor(seed, setor, noDestino.id, {
      classeForcada: 'BARCO_HUMANO',
      canalVisibilidadeSonar: canalVisBioma,
    });
    const alvoZonaMortaEsc = ehSteamEnt ? escalarInimigoPorDificuldade(alvoZonaMortaBase, difEnt, setor) : alvoZonaMortaBase;
    const alvoZonaMorta = ehSteamEnt ? equiparArsenalModularInimigoSteam(alvoZonaMortaEsc, seed, setor, noDestino.id) : alvoZonaMortaEsc;
    return {
      ...estadoPosSalto,
      meta: {
        ...estadoPosSalto.meta,
        faseJogo: 'COMBATE',
        modalCampanhaAtivo: null,
        hpCascoInimigoInicioLuta: alvoZonaMorta.hpCascoMax,
        ...(ehSteamEnt
          ? {
              hpCascoJogadorInicioLuta: Number(estadoPosSalto.naveJogador?.hpCascoAtual ?? 0),
              tripulacaoVivosInicioLutaCount: (estadoPosSalto.naveJogador?.tripulacao ?? []).filter(
                (t) => Number(t.hpAtual ?? 0) > 0
              ).length,
              telemetriaCombateSteam: {},
            }
          : {}),
        ultimoAvisoCampanha: ehEnEnt ? 'SOS EXPIRED — INDUSTRIAL DEAD ZONE!' : 'SOS EXPIRADO — ZONA MORTA INDUSTRIALIZADA!',
        perigoAmbientalId: null,
        modificadoresCombateAtivos: {
          origemCombate: 'ZONA_MORTA_INDUSTRIALIZADA',
          bonusBarreiraInimigo: 0,
        },
      },
      alvoCombate: alvoZonaMorta,
    };
  }

  if (tipoNo === 'SAIDA') {
    if (setor < 8) {
      const proximoSetor = setor + 1;
      const estadoProxMapa = anexarMapaSetorAoEstado(estadoPosSalto, seed, proximoSetor);
      const metricasAtu = estadoPosSalto.meta?.metricasRun ?? {};
      const novoHp = Math.min(
        estadoProxMapa.naveJogador.hpCascoMax,
        estadoProxMapa.naveJogador.hpCascoAtual + 2
      );
      const estAvancado = {
        ...estadoProxMapa,
        naveJogador: {
          ...estadoProxMapa.naveJogador,
          hpCascoAtual: novoHp,
        },
        meta: {
          ...estadoProxMapa.meta,
          faseJogo: 'MAPA',
          modalCampanhaAtivo: null,
          ultimoAvisoCampanha: ehEnEnt
            ? `SECTOR ${proximoSetor}/8: ${
                ({
                  BIOMA_1_ATOIS_SUCATA: 'Shallow Scrap Atolls',
                  BIOMA_2_RECIFES_BIOLUMINESCENTES: 'Bioluminescent Reefs',
                  BIOMA_3_FLORESTA_KELP: 'Giant Kelp Forest',
                  BIOMA_4_ESTREITO_ARRASTOES: 'Trawler Strait',
                  BIOMA_5_FOSSA_ABISSAL: 'Abyssal Pressure Trench',
                  BIOMA_6_CRATERA_USINA: 'Submerged Reactor Crater',
                  BIOMA_7_MAR_SARGACOS_QUIMICOS: 'Chemical Sargasso Sea',
                  BIOMA_8_CRATERA_DRAGA: 'Continental Dredge Crater',
                })[estadoProxMapa.meta.biomaId] ?? estadoProxMapa.meta.nomeBioma
              } (+2 HP)`
            : `SETOR ${proximoSetor}/8: ${estadoProxMapa.meta.nomeBioma} (+2 HP)`,
          metricasRun: {
            ...metricasAtu,
            setorMaximoAlcancado: Math.max(Number(metricasAtu.setorMaximoAlcancado ?? 1), proximoSetor),
          },
        },
        alvoCombate: { ...(estadoProxMapa.alvoCombate ?? {}), ativo: false },
      };
      if (opcoesPersistencia.persistirEmDisco === true) {
        salvarRunSaveDisco(estAvancado, opcoesPersistencia);
      }
      return estAvancado;
    }

    const chefeF1Base = criarEstadoChefeDraga(1);
    const chefeF1 = ehSteamEnt ? escalarInimigoPorDificuldade(chefeF1Base, difEnt, 8) : chefeF1Base;
    return {
      ...estadoPosSalto,
      meta: {
        ...estadoPosSalto.meta,
        faseJogo: 'COMBATE',
        modalCampanhaAtivo: null,
        hpCascoInimigoInicioLuta: chefeF1.hpCascoMax,
        ...(ehSteamEnt
          ? {
              hpCascoJogadorInicioLuta: Number(estadoPosSalto.naveJogador?.hpCascoAtual ?? 0),
              tripulacaoVivosInicioLutaCount: (estadoPosSalto.naveJogador?.tripulacao ?? []).filter(
                (t) => Number(t.hpAtual ?? 0) > 0
              ).length,
              telemetriaCombateSteam: {},
            }
          : {}),
        ultimoAvisoCampanha: ehEnEnt
          ? 'FINAL SHOWDOWN: CONTINENTAL DREDGE — PHASE 1!'
          : 'CONFRONTO FINAL: DRAGA CONTINENTAL — FASE 1!',
      },
      alvoCombate: chefeF1,
    };
  }

  if (tipoNo === 'LOJA') {
    const estoque = gerarEstoqueLojaForja(seed, setor, noDestino.id);
    const ehSteamLoja = Boolean(estadoPosSalto.meta?.edicaoComercialSteam);
    const noIdxNum = Number((String(noDestino.id ?? '').match(/\d+/) ?? ['0'])[0]) || 0;
    const vitrineAe = ehSteamLoja
      ? sortearVitrineLojaSteam(seed, setor, noIdxNum, estadoPosSalto.naveJogador)
      : null;
    const ofertasSteam = vitrineAe
      ? vitrineAe
          .filter(
            (x) =>
              x.categoria === 'ARMA' ||
              x.categoria === 'ORGAO' ||
              x.categoria === 'TRIPULANTE' ||
              x.categoria === 'SUBSISTEMA'
          )
          .map((x) => ({
            id: x.id,
            categoria: x.categoria,
            moeda: x.moeda,
            precoCompra: x.preco ?? x.precoCompra ?? 45,
            valorVenda: x.valorVenda ?? 22,
            pesoKg: x.pesoKg ?? 0,
          }))
      : null;
    const estLoja = {
      ...estadoPosSalto,
      meta: {
        ...estadoPosSalto.meta,
        faseJogo: 'LOJA',
        modalCampanhaAtivo: null,
        ultimoAvisoCampanha: ehEnEnt ? 'SYMBIOTIC FORGE-REEF DOCKED' : 'RECIFE-FORJA SIMBIÓTICO ATRACADO',
      },
      lojaAtual: {
        ...estoque,
        ...(vitrineAe ? { ofertasSteam: vitrineAe } : {}),
        ...(ofertasSteam ? { ofertasUnicas: ofertasSteam } : {}),
        itensCompradosIds: [],
        contagemInsumosComprados: {},
      },
      alvoCombate: { ...(estadoPosSalto.alvoCombate ?? {}), ativo: false },
    };
    if (opcoesPersistencia.persistirEmDisco === true) {
      salvarRunSaveDisco(estLoja, opcoesPersistencia);
    }
    return estLoja;
  }

  if (tipoNo === 'SOS' || tipoNo === 'PERIGO' || tipoNo === 'EXPLORACAO') {
    const tipoNoEn = tipoNo === 'EXPLORACAO' ? 'EXPLORATION' : tipoNo === 'PERIGO' ? 'HAZARD' : 'SOS';
    const estEvento = {
      ...estadoPosSalto,
      meta: {
        ...estadoPosSalto.meta,
        faseJogo: 'EVENTO',
        modalCampanhaAtivo: null,
        ultimoAvisoCampanha: ehEnEnt ? `${tipoNoEn} SIGNAL DETECTED` : `SINAL ${tipoNo} DETECTADO`,
      },
      eventoAtual: {
        noId: noDestino.id,
        tipoNo,
        idTemplateEvento: noDestino.idTemplateEvento,
        noMapa: noDestino,
      },
      alvoCombate: { ...(estadoPosSalto.alvoCombate ?? {}), ativo: false },
    };
    if (opcoesPersistencia.persistirEmDisco === true) {
      salvarRunSaveDisco(estEvento, opcoesPersistencia);
    }
    return estEvento;
  }

  const ehSteamComb = Boolean(estadoPosSalto.meta?.edicaoComercialSteam);
  const alvoCombateBase = gerarAlvoInimigoEscaladoSetor(seed, setor, noDestino.id, {
    forcarComumSetor8: setor === 8,
    canalVisibilidadeSonar: canalVisBioma,
    edicaoComercialSteam: ehSteamComb,
  });
  const alvoCombateEsc = ehSteamComb
    ? escalarInimigoPorDificuldade(alvoCombateBase, estadoPosSalto.meta?.dificuldade ?? 'NORMAL', setor)
    : alvoCombateBase;
  const alvoCombate = ehSteamComb
    ? equiparArsenalModularInimigoSteam(alvoCombateEsc, seed, setor, noDestino.id)
    : alvoCombateEsc;
  const modsComb = ehSteamComb ? calcularModificadoresPassivosOrgaosSteam(estadoPosSalto.naveJogador) : null;
  const navePreCombate =
    modsComb && modsComb.preIgnicaoCombatePct > 0
      ? {
          ...estadoPosSalto.naveJogador,
          armasAtivas: (estadoPosSalto.naveJogador.armasAtivas ?? []).map((s) =>
            s?.arma
              ? {
                  ...s,
                  arma: {
                    ...s.arma,
                    progressoRecargaSeg: Math.max(
                      Number(s.arma.progressoRecargaSeg ?? 0),
                      Math.round(Number(s.arma.tempoRecargaBaseSeg ?? 10) * modsComb.preIgnicaoCombatePct * 100) / 100
                    ),
                  },
                }
              : s
          ),
        }
      : estadoPosSalto.naveJogador;
  return {
    ...estadoPosSalto,
    naveJogador: navePreCombate,
    meta: {
      ...estadoPosSalto.meta,
      faseJogo: 'COMBATE',
      modalCampanhaAtivo: null,
      hpCascoInimigoInicioLuta: alvoCombate.hpCascoMax,
      ...(ehSteamComb
        ? {
            hpCascoJogadorInicioLuta: Number(navePreCombate?.hpCascoAtual ?? 0),
            tripulacaoVivosInicioLutaCount: (navePreCombate?.tripulacao ?? []).filter(
              (t) => Number(t.hpAtual ?? 0) > 0
            ).length,
            telemetriaCombateSteam: {},
          }
        : {}),
      ultimoAvisoCampanha: ehEnEnt
        ? `HOSTILE CONTACT: ${
            ({
              BARCO_1_LANCHA: 'PATROL CUTTER',
              BARCO_2_CORVETA: 'SONAR CORVETTE',
              BARCO_3_ARRASTAO: 'SHIELD TRAWLER',
              BARCO_4_SUBMARINO: 'ASSAULT SUBMARINE',
              MONSTRO_1_TEUTHIS: 'ARMORED TEUTHIS',
              MONSTRO_2_ENGUIA: 'BIO-ELECTRIC EEL',
              MONSTRO_3_CARANGUEJO: 'BASALT ROCK-CRAB',
              MONSTRO_4_HIDRA: 'CRATER THERMO-HYDRA',
              CHEFE_DRAGA_FASE_1: 'CONTINENTAL DREDGE F1',
              CHEFE_DRAGA_FASE_2: 'CONTINENTAL DREDGE F2',
              CHEFE_DRAGA_FASE_3: 'CONTINENTAL DREDGE F3',
            })[alvoCombate.arquetipoId] ?? 'HOSTILE TARGET'
          }`
        : `CONTATO HOSTIL: ${alvoCombate.nome}`,
      perigoAmbientalId: null,
      modificadoresCombateAtivos: null,
    },
    alvoCombate,
  };
}

/**
 * Aplica as regras canônicas anti-farming da Seção 4.5.B (`FROTA_PRINCIPAL_CORPORACAO`: 0 Sucata / 1 Combustível;
 * `ZONA_MORTA_INDUSTRIALIZADA`: `floor(0.5 * Sucata)`) e bônus pós-combate de Blue Options (`PER_1_CHUVA_ACIDA` +2 munição).
 */
export function aplicarRegrasSaquePosCombateCampanha(recompensaBase, estadoPosTick) {
  const base = recompensaBase ?? { sucata: 0, biomassa: 0, combustivel: 0, municao: 0 };
  const mod = estadoPosTick?.meta?.modificadoresCombateAtivos ?? null;
  if (mod?.origemCombate === 'FROTA_PRINCIPAL_CORPORACAO') {
    return clonarProfundoCongelado({
      sucata: 0,
      biomassa: 0,
      combustivel: 1,
      municao: 0,
    });
  }
  if (mod?.origemCombate === 'ZONA_MORTA_INDUSTRIALIZADA') {
    return clonarProfundoCongelado({
      sucata: Math.floor(0.5 * Number(base.sucata ?? 0)),
      biomassa: 0,
      combustivel: 0,
      municao: 0,
    });
  }
  const ehSteamSaque = Boolean(estadoPosTick?.meta?.edicaoComercialSteam);
  const multDif = ehSteamSaque
    ? obterConfiguracaoDificuldadeSteam(estadoPosTick?.meta?.dificuldade ?? 'NORMAL').multiplicadorSaque ?? 1.0
    : 1.0;
  const multOrg = ehSteamSaque
    ? 1.0 + (calcularModificadoresPassivosOrgaosSteam(estadoPosTick?.naveJogador).multiplicadorSaqueBonus ?? 0)
    : 1.0;
  const fatorTotal = multDif * multOrg;
  return clonarProfundoCongelado({
    sucata: Math.round(Number(base.sucata ?? 0) * fatorTotal),
    biomassa: Math.round(Number(base.biomassa ?? 0) * fatorTotal),
    combustivel: Number(base.combustivel ?? 0),
    municao: Number(base.municao ?? 0) + Math.max(0, Number(mod?.municaoPosLuta ?? 0)),
  });
}

/**
 * Constrói o contrato SSOT unificado do desfecho de evento (`ultimoResultadoEvento` / `desfechoEventoPendente` / `desfechoEventoResumo`),
 * calculando os deltas reais assinados entre `estadoAnterior` e `estadoPosterior` e preservando todos os aliases legados.
 */
export function construirDesfechoEventoCanonicamente(estadoAnterior, estadoPosterior, contextoEvento = {}, opcoesDebug = {}) {
  const opcaoBruta = String(
    contextoEvento.opcaoEscolhida ??
      contextoEvento.opcao ??
      estadoPosterior?.meta?.ultimoResultadoEvento?.opcaoEscolhida ??
      estadoPosterior?.meta?.ultimoResultadoEvento?.opcao ??
      'A'
  ).toUpperCase();
  const opcaoEscolhida = opcoesDebug.zerarDeltasDesfechoMutacao === true ? 'A' : opcaoBruta;

  const sucAnt = Number(estadoAnterior?.economia?.sucata ?? estadoAnterior?.recursos?.sucata ?? 0);
  const sucPos = Number(estadoPosterior?.economia?.sucata ?? estadoPosterior?.recursos?.sucata ?? 0);
  const bioAnt = Number(estadoAnterior?.economia?.biomassa ?? estadoAnterior?.recursos?.biomassa ?? 0);
  const bioPos = Number(estadoPosterior?.economia?.biomassa ?? estadoPosterior?.recursos?.biomassa ?? 0);
  const combAnt = Number(estadoAnterior?.economia?.combustivel ?? estadoAnterior?.recursos?.combustivel ?? 0);
  const combPos = Number(estadoPosterior?.economia?.combustivel ?? estadoPosterior?.recursos?.combustivel ?? 0);
  const munAnt = Number(estadoAnterior?.economia?.municao ?? estadoAnterior?.recursos?.municao ?? 0);
  const munPos = Number(estadoPosterior?.economia?.municao ?? estadoPosterior?.recursos?.municao ?? 0);
  const hpAnt = Number(estadoAnterior?.naveJogador?.hpCascoAtual ?? 0);
  const hpPos = Number(estadoPosterior?.naveJogador?.hpCascoAtual ?? 0);

  const deltaSucata = opcoesDebug.zerarDeltasDesfechoMutacao === true ? 0 : sucPos - sucAnt;
  const deltaBiomassa = opcoesDebug.zerarDeltasDesfechoMutacao === true ? 0 : bioPos - bioAnt;
  const deltaCombustivel = opcoesDebug.zerarDeltasDesfechoMutacao === true ? 0 : combPos - combAnt;
  const deltaMunicao = opcoesDebug.zerarDeltasDesfechoMutacao === true ? 0 : munPos - munAnt;
  const deltaHpCasco = opcoesDebug.zerarDeltasDesfechoMutacao === true ? 0 : hpPos - hpAnt;

  const idEvento = String(
    contextoEvento.idEvento ??
      estadoPosterior?.meta?.ultimoResultadoEvento?.idEvento ??
      estadoAnterior?.eventoAtual?.idTemplateEvento ??
      'EVENTO_MARITIMO'
  );
  const tipoNo = String(
    contextoEvento.tipoNo ??
      estadoPosterior?.meta?.ultimoResultadoEvento?.tipoNo ??
      estadoAnterior?.eventoAtual?.tipoNo ??
      'SOS'
  );
  const template = CATALOGO_TEMPLATES_EVENTOS_45A.find((t) => t.id === idEvento) ?? null;
  const tplSteamDesf = !template ? resolverTemplateEventoUnificado(idEvento) : null;
  const idiomaDesf = estadoPosterior?.meta?.configuracoesSteam?.idioma ?? estadoAnterior?.meta?.configuracoesSteam?.idioma ?? 'pt-BR';
  const ehEnDesf = idiomaDesf === 'en-US';
  const enGddDesf = ehEnDesf && template ? TABELA_17_EVENTOS_GDD_I18N[template.id] : null;
  const nomeEventoLimpo = template
    ? (enGddDesf ? enGddDesf.seloEn : template.nome.replace(/^\d+\.\s*/, '').toUpperCase())
    : tplSteamDesf
      ? (traduzirEventoSteam(tplSteamDesf, idiomaDesf).selo ?? idEvento)
      : idEvento;
  const iniciouCombate =
    contextoEvento.iniciouCombate !== undefined
      ? Boolean(contextoEvento.iniciouCombate)
      : Boolean(contextoEvento.combateObrigatorio) || estadoPosterior?.meta?.faseJogo === 'COMBATE';
  const blueOptionAtivada = opcaoEscolhida === 'B';

  const tripAntIds = new Set((estadoAnterior?.naveJogador?.tripulacao ?? []).map((t) => t.id));
  const novoTripulante = (estadoPosterior?.naveJogador?.tripulacao ?? []).find((t) => !tripAntIds.has(t.id)) ?? null;
  const novoTripulanteEspecie = contextoEvento.novoTripulanteEspecie ?? novoTripulante?.especie ?? null;

  const itensAnt = (estadoAnterior?.naveJogador?.poraoCarga ?? []).filter((s) => Boolean(s?.item)).length;
  const itensPosLista = (estadoPosterior?.naveJogador?.poraoCarga ?? []).filter((s) => Boolean(s?.item));
  const itemGanho =
    itensPosLista.length > itensAnt ? itensPosLista[itensPosLista.length - 1]?.item ?? null : null;
  const itemRecuperadoNome =
    contextoEvento.itemRecuperadoNome ?? itemGanho?.nome ?? itemGanho?.id ?? null;

  const mapaEspDesfEn = { POLVO: 'OCTOPUS', ARRAIA: 'ELECTRIC RAY', BAIACU: 'SPINY PUFFER', CARANGUEJO: 'AMPHIB CRAB' };
  const bonusPartes = [];
  if (novoTripulanteEspecie) {
    bonusPartes.push(
      ehEnDesf
        ? `+1 CREWMATE (${mapaEspDesfEn[novoTripulanteEspecie] ?? novoTripulanteEspecie})`
        : `+1 TRIPULANTE (${novoTripulanteEspecie})`
    );
  }
  if (itemRecuperadoNome) {
    bonusPartes.push(`${ehEnDesf ? 'HOLD' : 'PORÃO'}: +${String(itemRecuperadoNome).replace(/_/g, ' ')}`);
  }
  if (contextoEvento.revelaMapaSetorial) {
    bonusPartes.push(ehEnDesf ? 'SECTOR CHART REVEALED' : 'CARTA HIDROGRÁFICA REVELADA');
  }
  const bonusEspecialTexto = bonusPartes.length > 0 ? bonusPartes.join(' | ') : null;

  let narrativaPrincipal;
  if (ehEnDesf) {
    if (blueOptionAtivada) {
      narrativaPrincipal = `SYMBIOTIC SYNERGY AT ${nomeEventoLimpo}: CLEAN EXTRACTION WITH ZERO RISK!`;
    } else if (opcaoEscolhida === 'C') {
      narrativaPrincipal = `HYDRO-ACOUSTIC WITHDRAWAL AT ${nomeEventoLimpo}: STEALTH COURSE MAINTAINED.`;
    } else if (iniciouCombate) {
      narrativaPrincipal = `HOSTILE AMBUSH AT ${nomeEventoLimpo} — ENGAGING COMBAT TRIM ON FOIL!`;
    } else if (deltaHpCasco < 0) {
      narrativaPrincipal = `RISKY MANEUVER AT ${nomeEventoLimpo}: CHITIN HULL TOOK ${deltaHpCasco} HP DURING SALVAGE.`;
    } else {
      narrativaPrincipal = `STANDARD OPERATION AT ${nomeEventoLimpo}: SHIP STORES UPDATED CLEANLY.`;
    }
  } else if (blueOptionAtivada) {
    narrativaPrincipal = `SINERGIA SIMBIÓTICA EM ${nomeEventoLimpo}: EXTRAÇÃO LIMPA SEM RISCO ESTRUTURAL!`;
  } else if (opcaoEscolhida === 'C') {
    narrativaPrincipal = `RECUO HIDROACÚSTICO EM ${nomeEventoLimpo}: BIO-NAVE MANTEVE ROTA FURTIVA.`;
  } else if (iniciouCombate) {
    narrativaPrincipal = `EMBOSCADA EM ${nomeEventoLimpo} — ENGATANDO POSIÇÃO DE COMBATE NO HIDROFÓLIO!`;
  } else if (deltaHpCasco < 0) {
    narrativaPrincipal = `MANOBRA ARRISCADA EM ${nomeEventoLimpo}: QUITINA SOFREU ${deltaHpCasco} HP DURANTE A COLETA.`;
  } else {
    narrativaPrincipal = `OPERAÇÃO PADRÃO EM ${nomeEventoLimpo}: RESERVATÓRIOS ATUALIZADOS COM SUCESSO.`;
  }

  const titulo = ehEnDesf
    ? (blueOptionAtivada
        ? `BLUE OPTION [B] — ${nomeEventoLimpo}`
        : iniciouCombate
          ? `OPTION [${opcaoEscolhida}] — HOSTILE CONTACT AT ${nomeEventoLimpo}!`
          : deltaHpCasco < 0
            ? `OPTION [${opcaoEscolhida}] — HULL STRAIN (${deltaHpCasco} HP)`
            : opcaoEscolhida === 'C'
              ? `OPTION [C] — TACTICAL RETREAT FROM ${nomeEventoLimpo}`
              : `OPTION [${opcaoEscolhida}] — ${nomeEventoLimpo}`)
    : (blueOptionAtivada
        ? `OPÇÃO AZUL [B] — ${nomeEventoLimpo}`
        : iniciouCombate
          ? `OPÇÃO [${opcaoEscolhida}] — CONTATO HOSTIL EM ${nomeEventoLimpo}!`
          : deltaHpCasco < 0
            ? `OPÇÃO [${opcaoEscolhida}] — EXTRAÇÃO COM AVARIA (${deltaHpCasco} HP)`
            : opcaoEscolhida === 'C'
              ? `OPÇÃO [C] — RECUO TÁTICO DE ${nomeEventoLimpo}`
              : `OPÇÃO [${opcaoEscolhida}] — ${nomeEventoLimpo}`);

  return clonarProfundoCongelado({
    idEvento,
    tipoNo,
    opcao: opcaoEscolhida,
    opcaoEscolhida,
    titulo,
    narrativaPrincipal,
    bonusEspecialTexto,
    novoTripulanteEspecie,
    itemRecuperadoNome,
    deltaSucata,
    deltaBiomassa,
    deltaCombustivel,
    deltaMunicao,
    deltaHpCasco,
    ganhoSucata: Math.max(0, deltaSucata),
    ganhoBiomassa: Math.max(0, deltaBiomassa),
    ganhoCombustivel: Math.max(0, deltaCombustivel),
    ganhoMunicao: Math.max(0, deltaMunicao),
    reparoCascoHp: Math.max(0, deltaHpCasco),
    danoCascoHp: Math.max(0, -deltaHpCasco),
    blueOptionAtivada,
    combateObrigatorio: iniciouCombate,
    iniciouCombate,
    proximaFase: iniciouCombate ? 'COMBATE' : 'MAPA',
  });
}

export const MODOS_DISPARO_ARMAS = Object.freeze({
  AUTOMATICO: 'AUTOMATICO',
  MANUAL: 'MANUAL',
});

/**
 * Alterna o modo de disparo (`AUTOMATICO` <-> `MANUAL`) de um slot dorsal (`0..3`) ou de todas as armas ativas (`'TODOS'`).
 */
export function alternarModoDisparoArma(estado, slotIndexOuTodos = 'TODOS', forcarManual = null) {
  if (!estado || typeof estado !== 'object' || !estado.naveJogador) {
    return clonarProfundoCongelado({ ok: false, codigoErro: 'ESTADO_INVALIDO', estado: null });
  }
  const slotsAtuais = estado.naveJogador.armasAtivas ?? [];
  const usarTodos = slotIndexOuTodos === 'TODOS' || slotIndexOuTodos === null || slotIndexOuTodos === undefined;
  if (!usarTodos && (!Number.isInteger(slotIndexOuTodos) || slotIndexOuTodos < 0 || slotIndexOuTodos >= slotsAtuais.length)) {
    return clonarProfundoCongelado({ ok: false, codigoErro: 'SLOT_ARMA_INVALIDO', estado });
  }

  const armasEquipadas = slotsAtuais
    .map((s, idx) => ({ idx, arma: s?.arma !== undefined ? s.arma : s }))
    .filter((x) => Boolean(x.arma) && (usarTodos || x.idx === slotIndexOuTodos));

  if (armasEquipadas.length === 0) {
    return clonarProfundoCongelado({ ok: false, codigoErro: 'SLOT_ARMA_VAZIO', estado });
  }

  const eraGlobalManual = estado.naveJogador.modoSalvaGlobal === MODOS_DISPARO_ARMAS.MANUAL;
  const algumaAutomatica = armasEquipadas.some((x) => {
    const manualAtual =
      x.arma.modoDisparoManual !== undefined
        ? x.arma.modoDisparoManual === true
        : x.arma.modoDisparo === 'MANUAL' || eraGlobalManual;
    return !manualAtual;
  });
  const novoManual = typeof forcarManual === 'boolean' ? forcarManual : algumaAutomatica;

  const novasArmas = slotsAtuais.map((s, idx) => {
    const arma = s?.arma !== undefined ? s.arma : s;
    if (!arma) return s;
    const manualExistente =
      arma.modoDisparoManual !== undefined
        ? arma.modoDisparoManual === true
        : arma.modoDisparo === 'MANUAL' || eraGlobalManual;
    const modoSlotFinal = usarTodos || idx === slotIndexOuTodos ? novoManual : manualExistente;
    const armaAtualizada = {
      ...arma,
      modoDisparoManual: modoSlotFinal,
      modoDisparo: modoSlotFinal ? MODOS_DISPARO_ARMAS.MANUAL : MODOS_DISPARO_ARMAS.AUTOMATICO,
      disparoManualAutorizado: usarTodos || idx === slotIndexOuTodos ? false : Boolean(arma.disparoManualAutorizado),
    };
    return s?.arma !== undefined ? { ...s, arma: armaAtualizada } : armaAtualizada;
  });

  const ocupadasPos = novasArmas
    .map((s) => (s?.arma !== undefined ? s.arma : s))
    .filter(Boolean);
  const todasManuais = ocupadasPos.length > 0 && ocupadasPos.every((a) => a.modoDisparoManual === true);

  const novoEstado = clonarProfundoCongelado({
    ...estado,
    naveJogador: {
      ...estado.naveJogador,
      modoSalvaGlobal: todasManuais ? MODOS_DISPARO_ARMAS.MANUAL : MODOS_DISPARO_ARMAS.AUTOMATICO,
      armasAtivas: novasArmas,
    },
  });

  return clonarProfundoCongelado({
    ok: true,
    modoAtivo: novoManual ? MODOS_DISPARO_ARMAS.MANUAL : MODOS_DISPARO_ARMAS.AUTOMATICO,
    estado: novoEstado,
  });
}

/**
 * Autoriza o disparo imediato da salva sincronizada para armas em modo `MANUAL` que já atingiram 100% de carga e possuem alvo válido.
 */
export function dispararSalvaManualPronta(estado, slotIndexOuTodos = 'TODOS') {
  if (!estado || typeof estado !== 'object' || !estado.naveJogador) {
    return clonarProfundoCongelado({ ok: false, codigoErro: 'ESTADO_INVALIDO', estado: null });
  }
  const slotsAtuais = estado.naveJogador.armasAtivas ?? [];
  const usarTodos = slotIndexOuTodos === 'TODOS' || slotIndexOuTodos === null || slotIndexOuTodos === undefined;
  let armasAutorizadas = 0;

  const novasArmas = slotsAtuais.map((s, idx) => {
    const arma = s?.arma !== undefined ? s.arma : s;
    if (!arma || (!usarTodos && idx !== slotIndexOuTodos)) return s;
    const temAlvo =
      (arma.salaAlvoId !== null && arma.salaAlvoId !== undefined) ||
      (Array.isArray(arma.trincaSalasBeam) && arma.trincaSalasBeam.length > 0);
    const pronta = Number(arma.progressoRecargaSeg ?? 0) >= Number(arma.tempoRecargaBaseSeg ?? 9);
    if (arma.modoDisparoManual === true && temAlvo && pronta) {
      armasAutorizadas += 1;
      const armaAut = { ...arma, disparoManualAutorizado: true };
      return s?.arma !== undefined ? { ...s, arma: armaAut } : armaAut;
    }
    return s;
  });

  if (armasAutorizadas === 0) {
    return clonarProfundoCongelado({
      ok: false,
      codigoErro: 'NENHUMA_ARMA_MANUAL_PRONTA',
      armasAutorizadas: 0,
      estado,
    });
  }

  return clonarProfundoCongelado({
    ok: true,
    armasAutorizadas,
    estado: {
      ...estado,
      naveJogador: {
        ...estado.naveJogador,
        armasAtivas: novasArmas,
      },
    },
  });
}

/**
 * Ordena que um tripulante aliado já lançado a bordo da embarcação/criatura inimiga (`localizacao === 'BORDO_INIMIGO'`)
 * avance para outra sala/órgão inimigo (`salaInimigaDestinoId`) durante o combate ativo.
 */
export function ordenarMovimentoAbordagemInimiga(estado, tripulanteId, salaInimigaDestinoId) {
  if (!estado || (estado.meta?.faseJogo ?? 'COMBATE') !== 'COMBATE' || !estado.alvoCombate?.ativo) {
    return clonarProfundoCongelado({
      ok: false,
      codigoErro: 'FASE_INVALIDA_ABORDO',
      estado,
    });
  }
  const idSala = Number(salaInimigaDestinoId);
  const salaAlvo = (estado.alvoCombate.salasOuOrgaos ?? []).find((s) => Number(s.id) === idSala);
  if (!salaAlvo) {
    return clonarProfundoCongelado({
      ok: false,
      codigoErro: 'SALA_INIMIGA_INEXISTENTE',
      estado,
    });
  }
  const trip = (estado.naveJogador?.tripulacao ?? []).find((t) => t.id === tripulanteId);
  if (!trip || trip.hpAtual <= 0 || trip.localizacao !== 'BORDO_INIMIGO') {
    return clonarProfundoCongelado({
      ok: false,
      codigoErro: 'TRIPULANTE_NAO_ESTA_A_BORDO_INIMIGO',
      estado,
    });
  }

  const salaAtual = Number(trip.salaInimigaId ?? 1);
  if (idSala === salaAtual) {
    const novaTripMesma = estado.naveJogador.tripulacao.map((t) =>
      t.id === tripulanteId
        ? {
            ...t,
            salaInimigaDestinoId: null,
            proximaSalaInimigaId: null,
            rotaInimigaAtiva: [],
            progressoTravessiaInimigaSeg: 0.0,
          }
        : t
    );
    return clonarProfundoCongelado({
      ok: true,
      tripulanteId,
      salaOrigemId: salaAtual,
      salaDestinoId: idSala,
      emTravessia: false,
      estado: {
        ...estado,
        naveJogador: {
          ...estado.naveJogador,
          tripulacao: novaTripMesma,
        },
      },
    });
  }

  const ocupantesDestino = (estado.naveJogador.tripulacao ?? []).filter(
    (t) =>
      t.id !== tripulanteId &&
      t.hpAtual > 0 &&
      t.localizacao === 'BORDO_INIMIGO' &&
      Number(t.salaInimigaDestinoId ?? t.salaInimigaId ?? 1) === idSala
  ).length;
  if (ocupantesDestino >= 2) {
    return clonarProfundoCongelado({
      ok: false,
      codigoErro: 'SALA_INIMIGA_LOTADA_MAX_2',
      estado,
    });
  }

  const grafoAlvo = resolverGrafoOrtogonalAlvo(estado.alvoCombate);
  const caminho = calcularCaminhoCurtoGrafoAlvo(grafoAlvo, salaAtual, idSala);
  const saltosRestantes = caminho.slice(1);

  const novaTripulacao = estado.naveJogador.tripulacao.map((t) =>
    t.id === tripulanteId
      ? {
          ...t,
          salaInimigaId: salaAtual,
          salaInimigaDestinoId: idSala,
          proximaSalaInimigaId: saltosRestantes[0] ?? idSala,
          rotaInimigaAtiva: saltosRestantes,
          progressoTravessiaInimigaSeg: 0.0,
          progressoSabotagemInternaSeg: 0.0,
        }
      : t
  );

  return clonarProfundoCongelado({
    ok: true,
    tripulanteId,
    salaOrigemId: salaAtual,
    salaDestinoId: idSala,
    rotaSalas: caminho,
    emTravessia: true,
    estado: {
      ...estado,
      naveJogador: {
        ...estado.naveJogador,
        tripulacao: novaTripulacao,
      },
    },
  });
}

const defEv = (tagMapa, seloCenarioCurto, titulo, narrativaLinhas, rotuloA, detalheA, rotuloB, efeitoCurtoB, rotuloC, detalheC) =>
  Object.freeze({
    tagMapa,
    seloCenarioCurto,
    titulo,
    narrativaLinhas: Object.freeze(narrativaLinhas),
    rotuloA,
    detalheA,
    rotuloB,
    efeitoCurtoB,
    rotuloC,
    detalheC,
  });

export const TABELA_NARRATIVA_17_EVENTOS_45A = Object.freeze({
  SOS_1_REDE_ARRASTO: defEv('ARRASTO', 'REDE ARRASTO', 'CRIATURA SIMBIÓTICA EM REDE DE ARRASTO', [
    'UM ESPÉCIME SIMBIÓTICO DEBATE-SE EM CABOS DE AÇO DE UM ARRASTÃO.',
    'SONARES CAPTAM PATRULHA CORPORATIVA RASTREANDO A BOIA DE CARGA.',
    'DECIDA COMO CORTAR OS CABOS ANTES QUE A REDE ESTRANGULE A CRIATURA:',
  ], '[A] FORÇAR CABOS COM O CASCO', '50% +1 TRIPULANTE (-2 HP CASCO) | 50% EMBOSCADA DE BARCO', '[B] GARRAS / PLASMA CORTA-CABOS', '+1 TRIPULANTE + BIOMASSA SEM DANO', '[C] SILENCIAR FOIL E CONTORNAR REDE', 'RECUO SEGURO À CARTA HIDROGRÁFICA SEM EXPOR A CARCAÇA'),
  SOS_2_CAPSULA_AFUNDANDO: defEv('CÁPSULA', 'CÁPSULA FOSSA', 'CÁPSULA DE SUPRIMENTO AFUNDANDO NA FOSSA', [
    'UMA CÁPSULA LOGÍSTICA AFUNDA RÁPIDO RUMO À ZONA DE ESMAGAMENTO.',
    'SENSORES INDICAM SUCATA REFINADA E CÉLULAS DE COMBUSTÍVEL SELADAS.',
    'ESCOLHA O PROTOCOLO DE RESGATE CONTRA A PRESSÃO CRESCENTE:',
  ], '[A] MERGULHAR E IÇAR NO LIMITE', '50% SUCATA + 2 CMB LIMPOS | 50% SUCATA COM -3 HP PRESSÃO', '[B] REBOQUE PROPULSIVO / POLVOS', 'SUCATA CAPTURA (+50%) + 3 CMB + 2 MUN', '[C] ABORTAR DESCIDA E SEGUIR ROTA', 'EVITA RISCO BAROMÉTRICO E RETORNA À CARTA DO SETOR'),
  SOS_3_NINHO_SITIADO: defEv('NINHO', 'NINHO SITIADO', 'RECIFE-BERÇÁRIO SIMBIÓTICO SITIADO', [
    'PREDADORES ABISSAIS CERCAM UM BERÇÁRIO VIVO DE PÓLIPOS SIMBIÓTICOS.',
    'A COLÔNIA EMITE PULSOS BIOELTRS. DE SOCORRO EM CURTO ALCANCE.',
    'DEFINA A TÁTICA DE INTERVENÇÃO NO RECIFE:',
  ], '[A] DISPERSAR PREDADORES NO RASO', '50% BIOMASSA CIRÚRGICA LIMPA | 50% COMBATE CONTRA MONSTRO', '[B] PULSO BRANQUIAL / ESPINHOS', '+1 ÓRGÃO INTACTO + BIOMASSA CIRÚRGICA', '[C] MANTER DISTÂNCIA DO BERÇÁRIO', 'PRESERVA O CASCO E RETORNA À NAVEGAÇÃO SETORIAL'),
  SOS_4_COMBOIO_ENCALHADO: defEv('COMBOIO', 'COMBOIO PANE', 'CARGUEIRO CORPORATIVO EM PANE NO RECIFE', [
    'UM CARGUEIRO DA CORPORAÇÃO DERIVA COM TURBINAS APAGADAS NO RECIFE.',
    'CONTAINERS DE ARMAMENTO E SUCATA ESTÃO EXPOSTOS NO CONVÉS.',
    'ESCOLHA COMO ABORDAR O CASCÃO ANTES DO REPARO INIMIGO:',
  ], '[A] SAQUEAR CONVÉS À QUEIMA-ROUPA', '50% SUCATA CAPTURA (+50%) | 50% ESCOLTA ARMADA REAGE', '[B] NUVEM FURTIVA / CURTO ARRAIAS', '+1 ARMA NO PORÃO + SUCATA CAPTURA', '[C] IGNORAR CARGUEIRO E ZARPAR', 'EVITA ALERTA DA FROTA E RETORNA AO MAPA'),
  SOS_5_BALEIA_ENCALHADA: defEv('BALEIA', 'BALEIA-OFICINA', 'BALEIA-OFICINA SIMBIÓTICA ENCALHADA', [
    'UMA BALEIA-OFICINA COLOSSAL ESTÁ PRESA ENTRE COLUNAS BASÁLTICAS.',
    'TECIDOS SIMBIÓTICOS RAROS PULSAM SOB SUA CARAPAÇA CALCIFICADA.',
    'DECIDA COMO DESENCALHAR O LEVIATÃ ALIADO:',
  ], '[A] EMPURRAR ROCHA COM O CHASSI', '50% BIOMASSA BRUTA LIMPA | 50% BIOMASSA COM -3 HP NA QUILHA', '[B] SIFÃO FORTE / TORPEDO EM ROCHA', '+1 ÓRGÃO INTACTO + BIOMASSA SEM DANO', '[C] DEIXAR A MARÉ AGIR E SEGUIR', 'RECUO TÁTICO SEM AVARIAR A BIO-NAVE'),
  SOS_6_DESERTORES_PRESOS: defEv('DESERT.', 'DESERTORES', 'MERGULHADORES DESERTORES EM CAMPÂNULA', [
    'ESCAFANDRISTAS DESERTORES PEDEM RESGATE EM CAMPÂNULA INUNDANDO.',
    'ELES OFERECEM CHASSI DE ARMA MILITAR EM TROCA DE EXTRAÇÃO.',
    'ESCOLHA O MÉTODO DE ABERTURA DA ESCOTILHA:',
  ], '[A] ARROMBAR TRINCO SOB PRESSÃO', '50% +1 ARMA NO PORÃO (-2 HP) | 50% CAÇA-DESERTORES ATACA', '[B] EQUALIZAR BEXIGA / ESTILHAÇOS', '+1 ARMA NO PORÃO + SUCATA SEM DANO', '[C] RECUSAR CONTATO E NAVEGAR', 'EVITA EMBOSCADA HUMANA E RETORNA AO MAPA'),
  SOS_7_CARDUME_ENVENENADO: defEv('TÓXICO', 'VAZAMENTO TOX', 'CARDUME ENVENENADO POR VAZAMENTO QUÍMICO', [
    'ÓLEO QUÍMICO DA DRAGA SUFOCA UM CARDUME SIMBIÓTICO INTEIRO.',
    'UM SOBREVIVENTE DE ELITE TENTA NADAR PARA FORA DA MANCHA TÓXICA.',
    'ESCOLHA COMO FILTRAR OU ATRAVESSAR O VAZAMENTO:',
  ], '[A] ENTRAR NA MANCHA E RESGATAR', '50% +1 TRIPULANTE (-2 HP) | 50% CORROSÃO TÓXICA (-3 HP)', '[B] PURGA BRANQUIAL / TERMOFÍLICA', '+1 TRIPULANTE + BIOMASSA SEM DANO', '[C] CONTORNAR MANCHA QUÍMICA', 'PROTEGE AS BRÂNQUIAS E RETORNA À CARTA'),
  SOS_8_FAROL_SUBMERSO: defEv('FAROL', 'FAROL SUBMERSO', 'FAROL HIDROGRÁFICO DE SOCORRO SUBMERSO', [
    'ANTENA HIDROGRÁFICA PRÉ-DILÚVIO TRANSMITE TELEMETRIA DO SETOR.',
    'BATERIAS DE COMBUSTÍVEL E MAPAS DE ROTAS AINDA ESTÃO ATIVOS.',
    'DEFINA A EXTRAÇÃO ANTES DO RASTREIO CORPORATIVO:',
  ], '[A] EXTRAIR CÉLULAS DO TERMINAL', '50% SUCATA + 2 COMBUSTÍVEL | 50% PATRULHA CORPORATIVA CHEGA', '[B] DECODIFICAR CÓRTEX / POLVOS', 'REVELA CARTA DO SETOR + SUCATA + 3 CMB', '[C] DESLIGAR TRANSPONDER E SAIR', 'MANTÉM FURTIVIDADE E VOLTA AO MAPA'),
  EXP_1_NAUFRAGIO_ANTIGO: defEv('COURAÇ.', 'COURAÇADO ANT.', 'COURAÇADO PRÉ-DILÚVIO NA PLATAFORMA RASA', [
    'O ESQUELETO DE UM COURAÇADO PRÉ-DILÚVIO REPOUSA NUM PLATÔ RASO.',
    'PAIÓIS BLINDADOS GUARDAM LIGAS DENSAS E MUNIÇÃO INTACTA.',
    'ESCOLHA COMO ABRIR O CASCO OXIDADO:',
  ], '[A] FORÇAR PAIOL COM MASTRO RETRAÍDO', '50% SUCATA BRUTA LIMPA | 50% DESABAMENTO (-3 HP) + SUCATA', '[B] BRECHA TORPEDO / ESTILHAÇOS', 'SUCATA CAPTURA (+50%) + 2 MUNIÇÃO', '[C] NÃO PERTURBAR O NAUFRÁGIO', 'EVITA DESMORONAMENTO E SEGUE VIAGEM'),
  EXP_2_PLATAFORMA_FANTASMA: defEv('SONAR', 'ESTAÇÃO SONAR', 'ESTAÇÃO DE SONAR ABANDONADA PELA FROTA', [
    'UMA TORRE DE SONAR ABANDONADA AINDA VARRE AS CORRENTES DO SETOR.',
    'SEU BANCO DE DADOS CONTÉM TODOS OS ENCONTROS DESTA REGIÃO.',
    'DECIDA SE CONECTA A BIO-NAVE À REDE FANTASMA:',
  ], '[A] DRENAR CONDENSADORES DE BORDO', '50% SUCATA BRUTA LIMPA | 50% ALARME ATRAI BARCO DE GUARDA', '[B] HACK ACÚSTICO CÓRTEX / TINTA', 'REVELA CARTA DO SETOR + SUCATA + 2 CMB', '[C] CONTORNAR CONE DE VARREDURA', 'PERMANECE INVISÍVEL E VOLTA À CARTA'),
  EXP_3_CARDUME_SIMBIOTICO: defEv('CARDUME', 'CARDUME LUZ', 'CARDUME BIOLUMINESCENTE EM SIMBIOSE', [
    'MILHARES DE ORGANISMOS LUMINOSOS CERCAM O HIDROFÓLIO EM HARMONIA.',
    'ENZIMAS REGENERATIVAS FLUTUAM NA ESTEIRA BIOLUMINESCENTE.',
    'DEFINA A COLHEITA DE TECIDO SIMBIÓTICO:',
  ], '[A] ABRIR VÁLVULAS DE CAPTAÇÃO', '50% BIOMASSA BRUTA LIMPA | 50% CHOQUE OSMÓTICO (-2 HP) + BIO', '[B] SIMBIOSE BRANQUIAL / BAIACU', 'REPARA +5 HP CASCO + BIOMASSA CIRÚRGICA', '[C] NAVEGAR SUAVEMENTE PELO CARDUME', 'SEGUE ROTA SEM ALTERAR A HOMEOSTASE'),
  EXP_4_CEMITERIO_DRONES: defEv('DRONES', 'CEMITÉRIO DRN', 'CEMITÉRIO DE DRONES CORPORATIVOS', [
    'CENTENAS DE DRONES ABATIDOS FORMAM UM CAMPO DE DESTROÇOS FLUTUANTES.',
    'MINAS RESIDUAIS AINDA PISCAM ENTRE NÚCLEOS DE SUCATA PURA.',
    'ESCOLHA COMO GARIMPAR O CAMPO DE DRONES:',
  ], '[A] GARIMPAR ENTRE FUSÍVEIS ATIVOS', '50% SUCATA BRUTA LIMPA | 50% DETONAÇÃO (-3 HP) + SUCATA', '[B] VARREDURA FLAK / BLINDAGEM', 'SUCATA CAPTURA (+50%) + 2 MUNIÇÃO', '[C] DESVIAR DO CAMPO MINADO', 'RETORNA À CARTA SEM RISCO DE DETONAÇÃO'),
  EXP_5_FONTE_HIDROTERMAL: defEv('TERMAL', 'FONTE TERMAL', 'FONTE HIDROTERMAL VIVA DE ALTA PRESSÃO', [
    'CHAMINÉS VULCÂNICAS EXPELEM VAPOR RICO EM MINERAIS E BIOMASSA.',
    'TURBULÊNCIA CONVECTIVA EXIGE CONTROLE FINO DE SUSTENTAÇÃO.',
    'DEFINA A APROXIMAÇÃO À CHAMINÉ ABISSAL:',
  ], '[A] PAIRAR SOBRE A PLUMA QUENTE', '50% BIOMASSA BRUTA LIMPA | 50% ESCALDAMENTO (-2 HP) + BIO', '[B] ENZIMA TÉRMICA / FOIL NV.3+', 'REPARA +5 HP CASCO + BIOMASSA CIRÚRGICA', '[C] AFASTAR-SE DA PLUMA VULCÂNICA', 'PRESERVA A QUITINA E RETORNA AO MAPA'),
  EXP_6_RECIFE_ESPELHO: defEv('ESPELHO', 'RECIFE-ESPELHO', 'RECIFE-ESPELHO DE TINTA ABISSAL', [
    'CORAIS NEGROS REFLETEM OS PULSOS DE SONAR COMO ESPELHOS ACÚSTICOS.',
    'ÓRGÃOS ABISSAIS RAROS CRESCEM NO CENTRO DO LABIRINTO ESCURO.',
    'ESCOLHA COMO ORIENTAR A TRIPULAÇÃO NO LABIRINTO:',
  ], '[A] TATEAR PELO ECO DO CASCO', '50% BIOMASSA BRUTA LIMPA | 50% PREDADOR OCULTO ATACA', '[B] CAMUFLAGEM TINTA SIMBIÓTICA', '+1 ÓRGÃO INTACTO + BIOMASSA BRUTA', '[C] RECUAR ANTES DE PERDER O RUMO', 'VOLTA À CARTA HIDROGRÁFICA EM SEGURANÇA'),
  PER_1_CHUVA_ACIDA: defEv('ÁCIDA', 'CHUVA ÁCIDA', 'CHUVA RADIOATIVA ÁCIDA — CORROSÃO EM SUPERFÍCIE!', [
    'NUVENS TÓXICAS DA DRAGA DESPEJAM CHUVA ÁCIDA SOBRE A SUPERFÍCIE!',
    'NO HIDROFÓLIO, O ÁCIDO CORRÓI -1 HP DO CASCO A CADA 15 SEGUNDOS!',
    'HOSTIS BLOQUEIAM A SAÍDA — ENGAJAMENTO OBRIGATÓRIO:',
  ], '[A] COMBATER SOB CHUVA ÁCIDA ATIVA', 'COMBATE OBRIGATÓRIO | CORROSÃO ÁCIDA NO FOIL (-1 HP / 15s)', '[B] SELAGEM PLACAS / BARREIRA', '30s IMUNE AO ÁCIDO + 2 MUNIÇÃO PÓS-LUTA', '[C] RECUO BLOQUEADO — CHUVA ÁCIDA', 'TEMPESTADE ÁCIDA IMPEDE SALTO SEM VENCER O COMBATE'),
  PER_2_VORTICE_CORRENTEZA: defEv('VÓRTICE', 'VÓRTICE -40kg', 'VÓRTICE DE CORRENTEZA — SUCÇÃO NO HIDROFÓLIO!', [
    'UM REMOINHO ABISSAL PUXA A ASA DO HIDROFÓLIO PARA BAIXO!',
    'A CORRENTEZA ROUBA -40 kg DE SUSTENTAÇÃO E PODE FORÇAR TOUCHDOWN!',
    'INIMIGOS CERCAM O FUNIL — PREPARE OS SISTEMAS:',
  ], '[A] ENFRENTAR VÓRTICE (-40 kg FOIL)', 'COMBATE OBRIGATÓRIO | PENALIDADE DE -40 kg NA SUSTENTAÇÃO', '[B] COMPENSAR MASTRO / SIFÃO FORTE', 'REDUZ PERDA PARA APENAS -20 kg NO FOIL', '[C] RECUO BLOQUEADO — VÓRTICE ATIVO', 'SUCÇÃO HIDRODINÂMICA IMPEDE RECUO IMEDIATO'),
  PER_3_AGUAS_TURVAS: defEv('TURVAS', 'ÁGUAS TURVAS', 'ÁGUAS TURVAS ABISSAIS — SONAR INTERNO CEGO!', [
    'SEDIMENTOS DENSOS E TINTA ABISSAL CEGAM OS SENSORES EXTERNOS!',
    'SONAR INTERNO BLOQUEADO (NEGADO_SONAR) NAS SALAS DO INIMIGO!',
    'CONTATO HOSTIL IMINENTE NA ESCURIDÃO — ESCOLHA A ABERTURA:',
  ], '[A] LUTAR COM SONAR CEGO (TURVAS)', 'COMBATE OBRIGATÓRIO | SALAS INIMIGAS EM NÉVOA (NEGADO_SONAR)', '[B] VARREDURA NEURAL CÓRTEX NV.3+', 'RESTAURA VISÃO TOTAL (VISIVEL) DO ALVO', '[C] RECUO BLOQUEADO — EMBOSCADA CEGA', 'NÉVOA ABISSAL IMPEDE NAVEGAÇÃO DE FUGA IMEDIATA'),
});

function abreviarRequisitoBlueOptionUi(reqTexto) {
  return String(reqTexto ?? '')
    .replace(/SISTEMA:\s*/g, '')
    .replace(/TRIPULANTE:\s*/g, '')
    .replace(/ARMA:\s*/g, '')
    .replace(/ÓRGÃO:\s*/g, '')
    .replace(/Córtex de Navegação/g, 'Córtex')
    .replace(/Glândula de Tinta Furtiva/g, 'Tinta Furtiva')
    .replace(/Glândula de Barreira/g, 'Barreira')
    .replace(/Sifão de Propulsão/g, 'Sifão')
    .replace(/Placas de Blindagem/g, 'Placas')
    .replace(/Lançador de Torpedo Abissal/g, 'Torpedo Abissal')
    .replace(/Cortador Térmico a Plasma/g, 'Cortador Térmico')
    .replace(/Caranguejo Anfíbio/g, 'Caranguejo')
    .replace(/Baiacu Espinhoso/g, 'Baiacu')
    .replace(/Arraia Elétrica/g, 'Arraia');
}

/**
 * Projeta o resumo determinístico de qualquer um dos 17 templates canônicos de Evento (Seção 4.5.A),
 * avaliando elegibilidade real da Blue Option contra o kit vivo da bio-nave (`kitCumpreRequisitoBlueOption`).
 */
export function construirEventoResumoCanonico45A(estado) {
  const noAtual = (estado?.mapaSetorial?.nos ?? []).find(
    (n) => n.id === (estado?.mapaSetorial?.noAtualId ?? 'NO_1_A')
  );
  const tipoBruto = estado?.eventoAtual?.tipoNo ?? noAtual?.tipo ?? noAtual?.tipoNo ?? 'SOS';
  const categoriaFallback =
    tipoBruto === 'PERIGO' ? 'PERIGO' : tipoBruto === 'EXPLORACAO' ? 'EXPLORACAO' : 'SOS';
  const idPadraoCategoria =
    categoriaFallback === 'PERIGO'
      ? 'PER_1_CHUVA_ACIDA'
      : categoriaFallback === 'EXPLORACAO'
        ? 'EXP_1_NAUFRAGIO_ANTIGO'
        : 'SOS_1_REDE_ARRASTO';
  const idCandidato =
    estado?.eventoAtual?.idTemplateEvento ?? noAtual?.idTemplateEvento ?? idPadraoCategoria;
  const idiomaEv = estado?.meta?.configuracoesSteam?.idioma ?? 'pt-BR';
  const tplUnificado = resolverTemplateEventoUnificado(idCandidato);
  if (tplUnificado && (String(tplUnificado.id).startsWith('AE_') || idiomaEv === 'en-US')) {
    const trad = traduzirEventoSteam(tplUnificado, idiomaEv);
    const cumpreBlueSteam = avaliarElegibilidadeBlueOptionSteam(tplUnificado, estado?.naveJogador ?? {});
    return clonarProfundoCongelado({
      idEvento: tplUnificado.id,
      categoria: tplUnificado.categoria,
      ehEventoQuest: Boolean(tplUnificado.ehEventoQuest),
      seloCenarioCurto: trad.seloCenarioCurto ?? trad.selo ?? tplUnificado.categoria,
      titulo: trad.titulo,
      narrativaLinhas: trad.linhasNarrativas ?? trad.linhas ?? [],
      requisitoBlueOption: tplUnificado.reqBlue ?? tplUnificado.requisitoBlueOption ?? null,
      blueOptionDisponivel: cumpreBlueSteam,
      opcoes: trad.opcoes.map((op) => {
        const codOp = op.codigo ?? op.letra ?? 'A';
        return {
          codigo: codOp,
          rotulo: op.rotulo,
          detalhe: op.detalhe,
          azul: Boolean(op.ehBlue ?? codOp === 'B'),
          bloqueada: codOp === 'B' ? !cumpreBlueSteam : codOp === 'C' && tplUnificado.categoria === 'PERIGO',
        };
      }),
    });
  }
  const template =
    CATALOGO_TEMPLATES_EVENTOS_45A.find((t) => t.id === idCandidato) ??
    CATALOGO_TEMPLATES_EVENTOS_45A.find((t) => t.id === idPadraoCategoria);
  const spec = TABELA_NARRATIVA_17_EVENTOS_45A[template.id] ?? TABELA_NARRATIVA_17_EVENTOS_45A.SOS_1_REDE_ARRASTO;

  const kitAtual = extrairKitDaNave(estado?.naveJogador ?? {});
  const cumpreBlue = kitCumpreRequisitoBlueOption(template.requisitoBlueOption, kitAtual);
  const reqCurto = abreviarRequisitoBlueOptionUi(template.requisitoBlueOption);

  return clonarProfundoCongelado({
    idEvento: template.id,
    categoria: template.categoria,
    seloCenarioCurto: spec.seloCenarioCurto,
    titulo: spec.titulo,
    narrativaLinhas: spec.narrativaLinhas,
    requisitoBlueOption: template.requisitoBlueOption,
    blueOptionDisponivel: cumpreBlue,
    opcoes: [
      {
        codigo: 'A',
        rotulo: spec.rotuloA,
        detalhe: spec.detalheA,
        azul: false,
        bloqueada: false,
      },
      {
        codigo: 'B',
        rotulo: spec.rotuloB,
        detalhe: `REQ: ${reqCurto} -> ${spec.efeitoCurtoB}`,
        azul: true,
        bloqueada: !cumpreBlue,
        requisitoBlueOption: template.requisitoBlueOption,
      },
      {
        codigo: 'C',
        rotulo: spec.rotuloC,
        detalhe: spec.detalheC,
        azul: false,
        bloqueada: template.categoria === 'PERIGO',
      },
    ],
  });
}

function resumirInteligenciaNoMapa(no, seedPartida, setorNumero, idiomaMapa = 'pt-BR') {
  const ehEnM = idiomaMapa === 'en-US';
  const tipo = no.tipo ?? no.tipoNo ?? 'COMBATE';
  if (tipo === 'ENTRADA') {
    return ehEnM
      ? { subtipoCurto: 'ENTRY', detalheInteligencia: 'SECTOR ENTRY BUOY' }
      : { subtipoCurto: 'ENTRADA', detalheInteligencia: 'BOIA DE INSERÇÃO DO SETOR' };
  }
  if (tipo === 'LOJA') {
    return ehEnM
      ? { subtipoCurto: 'FORGE', detalheInteligencia: 'SYMBIOTIC FORGE-REEF (SHOP & REPAIR)' }
      : { subtipoCurto: 'FORJA', detalheInteligencia: 'RECIFE-FORJA SIMBIÓTICO (LOJA & REPARO)' };
  }
  if (tipo === 'SAIDA' || tipo === 'CHEFE') {
    return setorNumero >= 8
      ? (ehEnM
          ? { subtipoCurto: 'DREDGE', detalheInteligencia: 'FINAL BOSS: CONTINENTAL DREDGE (3 PHASES)' }
          : { subtipoCurto: 'DRAGA F1', detalheInteligencia: 'CONFRONTO FINAL: DRAGA CONTINENTAL (3 FASES)' })
      : (ehEnM
          ? { subtipoCurto: 'PORTAL', detalheInteligencia: `SECTOR EXIT GATE -> SECTOR ${setorNumero + 1}/8` }
          : { subtipoCurto: 'PORTAL', detalheInteligencia: `SALTO INTER-SETORIAL -> SETOR ${setorNumero + 1}/8` });
  }
  if (tipo === 'SOS' || tipo === 'EXPLORACAO' || tipo === 'PERIGO') {
    if (no.ehQuestAtiva) {
      const tplQ = resolverTemplateEventoUnificado(no.idTemplateEvento);
      return {
        tagMapa: 'QUEST!',
        subtipoCurto: 'QUEST!',
        detalheInteligencia: ehEnM
          ? (tplQ?.tituloEn ?? 'ACTIVE SIDE QUEST BEACON [QUEST]')
          : (tplQ?.tituloPt ?? 'MISSÃO SECUNDÁRIA ATIVA [QUEST]'),
      };
    }
    if (ehEnM && no.idTemplateEvento && TABELA_17_EVENTOS_GDD_I18N[no.idTemplateEvento]) {
      const specEn = TABELA_17_EVENTOS_GDD_I18N[no.idTemplateEvento];
      return {
        tagMapa: specEn.tagEn,
        subtipoCurto: specEn.seloEn,
        detalheInteligencia: specEn.tituloEn,
      };
    }
    const specEv = no.idTemplateEvento ? TABELA_NARRATIVA_17_EVENTOS_45A[no.idTemplateEvento] : null;
    if (specEv) {
      return {
        tagMapa: specEv.tagMapa,
        subtipoCurto: specEv.seloCenarioCurto,
        detalheInteligencia: specEv.titulo,
      };
    }
    const tplAe = no.idTemplateEvento ? resolverTemplateEventoUnificado(no.idTemplateEvento) : null;
    if (tplAe) {
      return ehEnM
        ? {
            tagMapa: tplAe.tagMapaEn ?? tipo,
            subtipoCurto: tplAe.seloEn ?? tipo,
            detalheInteligencia: tplAe.tituloEn ?? `${tipo} SIGNAL DETECTED`,
          }
        : {
            tagMapa: tplAe.tagMapaPt ?? tipo,
            subtipoCurto: tplAe.seloPt ?? tipo,
            detalheInteligencia: tplAe.tituloPt ?? `SINAL DE ${tipo} DETECTADO`,
          };
    }
    const mapTipoEn = { SOS: 'SOS', EXPLORACAO: 'EXPLORE', PERIGO: 'HAZARD' };
    const tExib = ehEnM ? (mapTipoEn[tipo] ?? tipo) : tipo;
    return { subtipoCurto: tExib, detalheInteligencia: ehEnM ? `${tExib} SIGNAL DETECTED` : `SINAL DE ${tipo} DETECTADO` };
  }
  const alvoPrevisto = gerarAlvoInimigoEscaladoSetor(seedPartida, setorNumero, no.id);
  const ehMon = alvoPrevisto.classeAlvo === 'MONSTRO_MARINHO';
  if (ehEnM) {
    const mapaAlvoEn = {
      BARCO_1_LANCHA: 'PATROL CUTTER',
      BARCO_1_PATRULHA: 'PATROL CUTTER',
      BARCO_2_CORVETA: 'SONAR CORVETTE',
      BARCO_3_ARRASTAO: 'SHIELD TRAWLER',
      BARCO_4_SUBMARINO: 'ASSAULT SUB',
      MONSTRO_1_TEUTHIS: 'ARMORED TEUTHIS',
      MONSTRO_1_LULA: 'CHITIN KRAKEN',
      MONSTRO_2_ENGUIA: 'VOLT EEL',
      MONSTRO_3_CARANGUEJO: 'BASALT CRAB',
      MONSTRO_3_CARANGUEJO_ROCHA: 'BASALT CRAB',
      MONSTRO_4_HIDRA: 'THERMO-HYDRA',
      MONSTRO_4_LEVIATA_FOSSA: 'TRENCH LEVIATHAN',
    };
    const clsEn = ehMon ? 'BEAST' : 'VESSEL';
    const nomeEn = mapaAlvoEn[alvoPrevisto.arquetipoId] ?? clsEn;
    return {
      subtipoCurto: clsEn,
      detalheInteligencia: `${clsEn}: ${nomeEn} (${alvoPrevisto.hpCascoMax} HP)`,
    };
  }
  const prefixoClasse = ehMon ? 'MONSTRO' : 'BARCO';
  const nomeCurtoAlvo = String(alvoPrevisto.nome ?? prefixoClasse).toUpperCase().slice(0, 18);
  return {
    subtipoCurto: prefixoClasse === 'MONSTRO' ? 'MONSTRO' : 'BARCO',
    detalheInteligencia: `${prefixoClasse}: ${nomeCurtoAlvo} (${alvoPrevisto.hpCascoMax} HP)`,
  };
}

/**
 * Projeta toda a telemetria tática da Carta Hidrográfica (`MAPA`):
 *  - `alcancavel` exato por nó;
 *  - `relogioSetorHoras`, `velocidadeCruzeiroMnH`, `custoCombustivelSalto`, `emModoDeriva`;
 *  - `rotas` com `tipoCorrente` (`FAVORAVEL` 0.75x / `NORMAL` 1.0x / `REVOLTO` 1.35x) e `horasViagem`;
 *  - `tPrazoHoras`, `sosExpirado` (`ZONA_MORTA_INDUSTRIALIZADA`) e `engolidoCorporacao` (`FROTA_PRINCIPAL_CORPORACAO`);
 *  - `cartaRevelada` (`SOS_8` / `EXP_2`), revelando subtipos exatos em nós não-adjacentes do setor.
 */
export function construirTelemetriaMapaSetorial(estado, faseJogoAtual = 'MAPA') {
  if (!estado?.mapaSetorial && faseJogoAtual !== 'MAPA') return null;
  const seedPartida = String(estado?.meta?.seedPartida ?? 'seed-mapa-padrao');
  const setorSolicitado = Number(estado?.mapaSetorial?.setorNumero ?? estado?.meta?.setorAtual ?? 1);
  const mapaFonte =
    (estado?.mapaSetorial?.nos ?? []).length > 0
      ? estado.mapaSetorial
      : faseJogoAtual === 'MAPA'
        ? gerarMapaSetorial(seedPartida, setorSolicitado)
        : estado?.mapaSetorial;
  if (!mapaFonte) return null;

  const setorNumero = Number(mapaFonte.setorNumero ?? setorSolicitado);
  const noAtualId = mapaFonte.noAtualId ?? mapaFonte.idNoAtual ?? 'NO_0_ENTRADA';
  const relogioSetorHoras = Math.round(
    Number(
      estado?.mapaSetorial?.relogioSetorHoras ??
        estado?.mapaSetorial?.relogioHoras ??
        mapaFonte.relogioSetorHoras ??
        mapaFonte.relogioHoras ??
        0
    ) * 100
  ) / 100;
  const idiomaMapa = estado?.meta?.configuracoesSteam?.idioma ?? 'pt-BR';
  const velFrotaMapa = estado?.meta?.edicaoComercialSteam
    ? obterConfiguracaoDificuldadeSteam(estado?.meta?.dificuldade ?? 'NORMAL').velocidadeFrotaMnPorHora
    : VELOCIDADE_FRENTE_CORPORATIVA_MN_H;
  const frenteCorporativaX = Number(
    estado?.mapaSetorial?.frenteCorporativaX ??
      estado?.mapaSetorial?.frenteCorporacaoMn ??
      (estado?.mapaSetorial?.avancoDraga !== undefined ? Number(estado.mapaSetorial.avancoDraga) * 18 : undefined) ??
      mapaFonte.frenteCorporacaoMn ??
      (relogioSetorHoras > 0 ? Math.round(velFrotaMapa * relogioSetorHoras * 100) / 100 : -18)
  );
  const cartaRevelada = Boolean(estado?.mapaSetorial?.cartaRevelada ?? mapaFonte.cartaRevelada);

  const infoCruzeiro =
    Array.isArray(estado?.naveJogador?.camaras) && estado.naveJogador.camaras.length > 0
      ? calcularVelocidadeCruzeiroMapa(estado.naveJogador)
      : { velocidadeCruzeiroMnH: 12.0, custoCombustivel: 1, emSobrepesoTouchdown: false };
  const combustivelAtual = Number(estado?.economia?.combustivel ?? estado?.recursos?.combustivel ?? 12);
  const emModoDeriva = combustivelAtual < infoCruzeiro.custoCombustivel;

  const rotas = (mapaFonte.rotas ?? []).map((r) => {
    const tipoCorrente = r.tipoCorrente ?? 'NORMAL';
    const multiplicadorCorrente = Number(
      r.multiplicadorCorrente ?? (tipoCorrente === 'FAVORAVEL' ? 0.75 : tipoCorrente === 'REVOLTO' ? 1.35 : 1.0)
    );
    const distanciaMn = Number(r.distanciaMn ?? 24);
    const distanciaEfetivaMn = Number(
      r.distanciaEfetivaMn ?? Math.round(distanciaMn * multiplicadorCorrente * 1000) / 1000
    );
    const resHoras = calcularHorasSaltoMapa({
      distanciaEfetivaMn,
      velocidadeCruzeiroMnH: infoCruzeiro.velocidadeCruzeiroMnH,
      emModoDeriva,
    });
    const horasViagem = Number(resHoras?.horasSalto ?? resHoras ?? 2.0);
    return {
      origemId: r.origemId,
      destinoId: r.destinoId,
      tipoCorrente,
      multiplicadorCorrente,
      distanciaMn,
      distanciaEfetivaMn,
      horasViagem: Math.round(horasViagem * 10) / 10,
    };
  });

  const nosBrutos = mapaFonte.nos ?? [];
  const noAtualBruto = nosBrutos.find((n) => n.id === noAtualId) ?? null;
  const mapaRotasAtivasPorDestino = new Map();
  for (const r of rotas) {
    if (r.origemId === noAtualId) {
      mapaRotasAtivasPorDestino.set(r.destinoId, r);
    }
  }
  const saidasFallback = new Set(
    mapaRotasAtivasPorDestino.size > 0
      ? [...mapaRotasAtivasPorDestino.keys()]
      : [...(noAtualBruto?.conexoesSaida ?? noAtualBruto?.arestasSaida ?? [])]
  );

  const nos = nosBrutos.map((n) => {
    const tipo = n.tipo ?? n.tipoNo ?? 'COMBATE';
    const xMn = Number(n.x ?? n.xMn ?? 0);
    const yMn = Number(n.y ?? n.yMn ?? 30);
    const visitado = Boolean(n.visitado);
    const ehAtual = n.id === noAtualId;
    const alcancavel = !ehAtual && saidasFallback.has(n.id);
    const rotasDoMapa = rotas.filter((r) => r.origemId === n.id).map((r) => r.destinoId);
    const tPrazoHoras =
      n.tPrazoHoras !== null && n.tPrazoHoras !== undefined ? Math.round(Number(n.tPrazoHoras) * 10) / 10 : null;
    const sosExpirado = Boolean(tipo === 'SOS' && tPrazoHoras !== null && relogioSetorHoras > tPrazoHoras);
    const horasRestantesSos =
      tipo === 'SOS' && tPrazoHoras !== null ? Math.round((tPrazoHoras - relogioSetorHoras) * 10) / 10 : null;
    const engolidoCorporacao = Boolean(relogioSetorHoras > 0 && xMn <= frenteCorporativaX);

    const rAtiva = mapaRotasAtivasPorDestino.get(n.id) ?? null;
    const horasSalto = rAtiva ? rAtiva.horasViagem : alcancavel ? 2.0 : null;
    const rotaAtiva = alcancavel
      ? {
          tipoCorrente: rAtiva?.tipoCorrente ?? 'NORMAL',
          multiplicadorCorrente: rAtiva?.multiplicadorCorrente ?? 1.0,
          distanciaEfetivaMn: rAtiva?.distanciaEfetivaMn ?? 24.0,
          horasViagem: horasSalto,
          expiraSosNoSalto: Boolean(
            tipo === 'SOS' && tPrazoHoras !== null && !sosExpirado && relogioSetorHoras + horasSalto > tPrazoHoras
          ),
          engolidoNoSalto: Boolean(
            !engolidoCorporacao && xMn <= frenteCorporativaX + velFrotaMapa * horasSalto
          ),
        }
      : null;

    const ehQuestAtiva = Boolean(n.ehQuestAtiva);
    const inteligenciaRevelada = Boolean(ehAtual || visitado || alcancavel || cartaRevelada || ehQuestAtiva);
    const infoIntel = inteligenciaRevelada
      ? resumirInteligenciaNoMapa(n, seedPartida, setorNumero, idiomaMapa)
      : {
          subtipoCurto: null,
          detalheInteligencia:
            idiomaMapa === 'en-US' ? 'HIDDEN SIGNATURE (OUT OF SONAR CONE)' : 'ASSINATURA OCULTA (FORA DO CONE SONAR)',
        };

    return {
      id: n.id,
      tipo,
      idTemplateEvento: inteligenciaRevelada ? (n.idTemplateEvento ?? null) : null,
      xMn,
      yMn,
      visitado,
      ehAtual,
      ehQuestAtiva,
      alcancavel,
      tPrazoHoras,
      sosExpirado,
      horasRestantesSos,
      engolidoCorporacao,
      rotaAtiva,
      inteligenciaRevelada,
      tagMapa: infoIntel.tagMapa ?? infoIntel.subtipoCurto ?? null,
      subtipoCurto: infoIntel.subtipoCurto,
      detalheInteligencia: infoIntel.detalheInteligencia,
      rotasSaida:
        rotasDoMapa.length > 0 ? rotasDoMapa : [...(n.conexoesSaida ?? n.arestasSaida ?? [])],
    };
  });

  return clonarProfundoCongelado({
    setorNumero,
    noAtualId,
    relogioSetorHoras,
    frenteCorporativaX,
    cartaRevelada,
    velocidadeCruzeiroMnH: infoCruzeiro.velocidadeCruzeiroMnH,
    custoCombustivelSalto: emModoDeriva ? 0 : infoCruzeiro.custoCombustivel,
    emModoDeriva,
    rotas,
    nos,
  });
}
