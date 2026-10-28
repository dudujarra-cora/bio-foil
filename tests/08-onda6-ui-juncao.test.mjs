/**
 * PORTÃO 08 — ONDA 6: Junção Ponta a Ponta Interface 16:9 (`UI`) <-> Motor (`N1`),
 * 15 Comandos Atômicos (`Action Schema`), Persistência (`run_save.json` vs `profile.json`) e 8 Cues Sonoros.
 *
 * Cumpre:
 *  - Lei N1 (Junção real: Clique/Comando na UI -> Motor roda de verdade -> Presenter re-renderiza ViewModel 16:9)
 *  - Lei N4 (Contadores explícitos: 8 câmaras, 4 slots de armas, 8 sistemas/subsistemas, 5 estados L3, 15 comandos, 5 carcaças, 12 parâmetros layout, 8 cues)
 *  - Lei L2 (Imutabilidade profunda Object.isFrozen)
 *  - Lei L3 (Proibição de retornar [] ou "0 tripulantes" quando cego no Painel do Alvo)
 *  - Lei L6 (Cobertura explícita de MUT-O6-01, MUT-O6-02 e MUT-O6-03)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';

import {
  criarEstadoInicialPartida,
  congelarProfundo,
  CATALOGO_ARMAS_BASE_PESO,
  HP_MAX_POR_ESPECIE,
  ARQUITETURAS_INICIAIS,
} from '../src/onda1-fisica/estado-inicial.mjs';
import {
  FNV1A_32_OFFSET_BASIS,
  FNV1A_32_PRIME,
  DOMINIOS_STREAM_PRNG,
} from '../src/onda1-fisica/hash32-streams.mjs';
import { avancarTickFisicaHidraulica } from '../src/onda1-fisica/tick-hidraulica-foil.mjs';
import { criarAlvoSetor1Canonico, CONSTANTES_IA_INIMIGOS } from '../src/onda3-inimigos/ia-barco-monstro.mjs';
import { CURVA_SAQUE_SETORIAL_56C } from '../src/onda3-inimigos/abordagem-vitoria.mjs';
import { inspecionarSalaAlvo, CONSTANTES_TRIPULACAO } from '../src/onda2-combate/tick-tripulacao.mjs';
import {
  CONSTANTES_SISTEMAS_ARMAS,
  sincronizarEnergiaArmasComCamaraArtilharia,
} from '../src/onda2-combate/tick-sistemas-armas.mjs';
import {
  LARGURA_SETOR_MN,
  ALTURA_SETOR_MN,
  DISTANCIA_MIN_NOS_MN,
  DISTANCIA_MAX_ROTA_MN,
  FOLGA_PRAZO_SOS_HORAS,
  VELOCIDADE_PADRAO_ALFA_MN_H,
  MULTIPLICADORES_CORRENTE,
  gerarMapaSetorial,
} from '../src/onda4-mapa/gerador-poisson.mjs';
import {
  VELOCIDADE_BASE_MAPA_MN_H,
  TETO_VELOCIDADE_CRUZEiro_MN_H,
  VELOCIDADE_ARRASTO_SOBREPESO_MN_H,
  MULTIPLICADOR_TEMPO_DERIVA,
  SPOOL_UP_FRIO_POS_DERIVA_SEG,
} from '../src/onda4-mapa/relogio-viagem.mjs';
import { VELOCIDADE_FRENTE_CORPORATIVA_MN_H } from '../src/onda4-mapa/eventos-nos.mjs';
import {
  ISOLAMENTO_RESIDUAL_POS_CHOQUE_SEG,
  DURACAO_CHOQUE_ELETRO_PLACA_SEG,
  PESO_ORGAO_ENXERTADO_KG,
  MAX_TRIPULANTES_NAVE,
} from '../src/onda5-catalogo-chefe/catalogo-naves-itens.mjs';
import {
  DURACAO_FERVURA_OCEANICA_SEG,
  INTERVALO_AUTO_REPARO_IA_BACKUP_SEG,
  criarEstadoChefeDraga,
  avancarTickChefeDraga,
} from '../src/onda5-catalogo-chefe/chefe-draga.mjs';
import {
  CADEIA_CANONICA_GDD,
  CADEIA_CANONICA_TESTES,
  CADEIA_CANONICA_SCRIPTS,
  CADEIA_CANONICA_PROTOCOLO,
  CADEIA_CANONICA_RAIZ_OUTROS,
  CADEIA_CANONICA_DIRS_RAIZ,
  CADEIA_CANONICA_WORKFLOWS,
} from '../src/gdd-parser.mjs';
import { MCP_SERVER_INFO, LIMITE_CARACTERES_RESPOSTA } from '../scripts/mcp-testes-agentes.mjs';
import {
  ORCAMENTO_LAYOUT_NATIVO_85C,
  SISTEMAS_BARRA_INFERIOR_CANONICOS,
  PALETA_PIXEL_ART_BIOFOIL,
  TOKENS_PALETA_BIBLIA_ARTISTICA_13,
  GRADES_SPRITES_HIBITS_ARTESANAIS,
  GEOMETRIA_ENCAIXE_CAMARAS_960,
  ATLAS_ANIMACAO_4FRAMES_BIOFOIL,
  projetarViewModelWireframe,
  obterAtlasSpritesNativo,
  calcularEncaixeCamaraBioNave,
  calcularEncaixeDorsalArma,
  renderizarQuadroAnimadoCenaBiofoil,
  rasterizarSpriteRgba,
  interpolarEstadoVisual60Fps,
  renderizarViewModelNoCanvas2d,
  renderizarCenaCanvasParaPngBuffer,
  exportarSpreadAnimacaoSteamPngBuffer,
} from '../src/onda6-ui/presenter-wireframe.mjs';
import {
  codificarBufferRgbaParaPng,
  obterAssetsConceitoHiBit,
  escalarNearestRgba,
  exportarAtlasHiBitsPngBuffer,
  obterQuadroAnimacaoEntidade,
  exportarPacoteAssets60Fps,
  obterTabelasRasterUnificado,
  obterIconeSistemaRodape12x12,
  obterPerfilVisualArquetipoInimigo,
  VARIANTES_VISUAIS_INIMIGOS_57A,
  ICONES_SISTEMAS_RODAPE_12X12,
} from '../src/onda6-ui/assets-hibit.mjs';
import {
  CAMADAS_PAISAGEM_MARITIMA,
  CATALOGO_SFX_MULTICAMADA_BIOFOIL,
  ESTADOS_TRILHA_ADAPTATIVA_BIOFOIL,
  selecionarEstadoTrilhaAdaptativa,
  extrairSfxMulticamadaDoTick,
  construirPaisagemSonoraCompleta,
  sintetizarBufferPcmMulticamada,
  gerarCodigoSintetizadorMaritimoClienteJs,
} from '../src/onda6-ui/audio-maritimo.mjs';
import {
  ACOES_CAMPANHA_BIOFOIL,
  MODOS_DISPARO_ARMAS,
  resolverGrafoOrtogonalAlvo,
  calcularCaminhoCurtoGrafoAlvo,
  possuiSalaSonarAlvo,
  possuiSonarMilitarAtivoAlvo,
  calcularTrincaBeamAutomatica,
  gerarAlvoInimigoEscaladoSetor,
  anexarMapaSetorAoEstado,
  resolverEntradaNoMapaCampanha,
  aplicarRegrasSaquePosCombateCampanha,
  construirDesfechoEventoCanonicamente,
  alternarModoDisparoArma,
  dispararSalvaManualPronta,
  ordenarMovimentoAbordagemInimiga,
  TABELA_NARRATIVA_17_EVENTOS_45A,
  construirEventoResumoCanonico45A,
  construirTelemetriaMapaSetorial,
} from '../src/onda6-ui/encontros-eventos-campanha.mjs';
import {
  calcularCustoProximoUpgradeNave,
  aplicarUpgradeNaveCampanha,
  gerenciarEquipamentoPoraoEOrgaos,
  criarEstadoCampanhaCompleta,
  executarAcaoCampanhaCompleta,
  avancarTickCampanhaCompleta,
} from '../src/onda6-ui/campanha-completa.mjs';
import {
  MODULOS_ESM_NAVEGADOR_ONDA6,
  escaparHtmlSeguro,
  gerarCodigoJsClienteBiofoil,
  gerarHtmlClienteJogavelBiofoil,
  iniciarServidorClienteWebBiofoil,
} from '../src/onda6-ui/cliente-web.mjs';
import { criarContextoPrimitivasRgba960x540 } from '../src/onda6-ui/primitivas-raster-rgba.mjs';
import {
  congelarProfundoClienteSeguro,
  calcularLayoutPlacaCamaras960,
  calcularRetanguloCardHangar960,
  calcularRetanguloCardLoja960,
  calcularRetanguloVendaPoraoLoja960,
  calcularGeometriaOficina960,
  calcularRetangulosModaisCampanha960,
  calcularRetangulosSalasAlvo960,
} from '../src/onda6-ui/geometria-layout-960.mjs';
import {
  converterCoordenadaTelaParaNativa as converterCoordenadaHitboxDireta,
  obterMapaHitboxesNativo as obterMapaHitboxesDireto,
  calcularGhostPreviewTermometro as calcularGhostPreviewDireto,
} from '../src/onda6-ui/hitboxes-layout.mjs';
import { interpolarEstadoVisual60Fps as interpolar60FpsDireto } from '../src/onda6-ui/interpolador-60fps.mjs';
import {
  obterAtlasSpritesNativo as obterAtlasPrimitivasDireto,
  rasterizarSpriteRgba as rasterizarSpriteDireto,
  renderizarViewModelNoCanvas2d as renderizarCanvas2dDireto,
  calcularEncaixeCamaraBioNave as calcularEncaixeCamaraDireto,
  calcularEncaixeDorsalArma as calcularEncaixeDorsalDireto,
} from '../src/onda6-ui/renderizador-canvas2d-primitivas.mjs';
import {
  renderizarHudSuperiorTermometroERodape,
  renderizarTooltipContextualEAvisoToast,
} from '../src/onda6-ui/renderizador-hud-tooltips.mjs';
import {
  renderizarTelaHangarOuFimDeRun,
  renderizarViewportCampanhaNaoCombate,
  renderizarModalSaqueOverlay,
  renderizarModalOficinaOverlay,
  renderizarModalDesfechoEventoOverlay,
} from '../src/onda6-ui/renderizador-telas-campanha.mjs';
import {
  renderizarAlvoInimigoESalasCombate,
  prepararFundoAtmosfericoCombate,
  renderizarSobrecomposicaoCombate60Fps,
} from '../src/onda6-ui/renderizador-alvo-inimigo.mjs';
import { rasterizarQuadroRgba960x540 } from '../src/onda6-ui/renderizador-canvas.mjs';
import {
  formatarMensagemRejeicaoUi,
  enriquecerGhostPreviewCliente,
  criarControladorToastCliente,
  iniciarRuntimeDomBiofoil,
} from '../src/onda6-ui/runtime-navegador.mjs';
import { criarMotorAudioMaritimoCliente } from '../src/onda6-ui/sintetizador-webaudio-cliente.mjs';
import {
  resolverGrafoBeamAlvoInterno,
  calcularCaminhoCurtoGrafoAlvoInterno,
  recalcularSubsistemasAlvoInPlace,
  avancarTickPartidaEmTempoReal as avancarTickDireto,
} from '../src/onda6-ui/tick-combate-tempo-real.mjs';
import {
  construirTrincaBeamAssistidaDom,
  traduzirInputDomParaComandoUi,
} from '../src/onda6-ui/tradutor-input-dom.mjs';
import { exportarSpreadAnimacaoSteamPngBufferComHooks } from '../src/onda6-ui/vitrine-spreads.mjs';
import { iniciarJogoBiofoilCli } from '../scripts/jogar-biofoil.mjs';
import {
  ESQUEMA_15_COMANDOS_85A,
  COORDENADAS_GRADE_CAMARAS_16A,
  despacharComandoUi,
  converterCoordenadaTelaParaNativa,
  obterMapaHitboxesNativo,
  calcularGhostPreviewTermometro,
  avancarTickPartidaEmTempoReal,
} from '../src/onda6-ui/despacho-comandos.mjs';
const traduzirInputDomDireto = traduzirInputDomParaComandoUi;
import {
  CARCACAS_PERFIL_85B,
  criarPerfilInicial,
  atualizarPerfilComMetricasRun,
  gerenciarPersistenciaTransicao,
  obterDiretorioDadosPadraoBiofoil,
  salvarPerfilDisco,
  carregarPerfilDisco,
  apagarRunSavePermadeathDisco,
  salvarRunSaveDisco,
  carregarRunSaveDisco,
  sincronizarTransicaoPersistenciaDisco,
} from '../src/onda6-ui/persistencia-perfil.mjs';
import {
  CATALOGO_8_CUES_SONOROS_85C,
  PERFIS_ACUSTICOS_WEB_AUDIO_85C,
  avaliarCuesSonorosAtivos,
  construirPlanoGrafoWebAudio,
  aplicarPlanoNoContextoWebAudio,
  sintetizarBufferPcmCueTatico,
} from '../src/onda6-ui/cues-audio.mjs';
import {
  calcularPesoTotalNave as calcularPesoOraculo,
  avaliarPredicadoDesbloqueio,
} from '../src/oraculos-referencia.mjs';

test('[PORTÃO 08.1 | N1 + N4 + MUT-O6-01..02] Junção Ponta a Ponta UI <-> Motor: desligar Sifão derruba Sustentação, aciona Touchdown, trava Válvulas e renderiza 8 câmaras, 4 slots de armas e 8 sistemas', () => {
  const estadoInicial = {
    ...criarEstadoInicialPartida('seed-ui-01', 'CARCACA_ALFA'),
    alvoCombate: criarAlvoSetor1Canonico('BARCO_HUMANO'),
  };

  // 1. ViewModel Inicial em 1_NO_FOIL (225 kg Peso vs 260 kg Sustentação)
  const vmInicial = projetarViewModelWireframe(estadoInicial);
  assert.equal(Object.isFrozen(vmInicial), true);
  assert.equal(Object.keys(ORCAMENTO_LAYOUT_NATIVO_85C).length, 12, '[N4] Examinados: 12 parâmetros de layout nativo');
  assert.equal(vmInicial.resolucaoNativa.largura, 960);
  assert.equal(vmInicial.resolucaoNativa.altura, 540);
  assert.equal(vmInicial.resolucaoNativa.larguraFullHd, 1920);
  assert.equal(vmInicial.resolucaoNativa.alturaFullHd, 1080);
  assert.deepEqual(vmInicial.geometria.violacoes, []);

  // Contadores obrigatórios N4: 8 câmaras (50x35 nativas), 8 sistemas/subsistemas, 4 slots de armas
  console.log(
    `[N4] Onda 6 examinada: ${vmInicial.camaras.length} câmaras, ${vmInicial.caixaSistemas.length} sistemas, ${vmInicial.caixaArmas.length} slots de armas, ${Object.keys(GRADES_SPRITES_HIBITS_ARTESANAIS).length} sprites hi-bit`
  );
  assert.equal(vmInicial.camaras.length, 8, '[N4] Examinados: 8 câmaras renderizadas');
  for (const cam of vmInicial.camaras) {
    assert.equal(cam.larguraNativaPx, 50);
    assert.equal(cam.alturaNativaPx, 35);
    assert.equal(cam.statusValvulaExterna, 'FECHADA_DISPONIVEL');
    assert.equal(cam.botaoValvulaDesabilitado, false);
  }

  assert.equal(vmInicial.caixaSistemas.length, 8, '[N4] Examinados: 8 sistemas/subsistemas na barra inferior');
  assert.equal(
    vmInicial.caixaArmas.length,
    4,
    '[MUT-O6-02 / N4] Examinados: 4 slots de armas ativas renderizados na caixa [ARMAS]'
  );
  for (const slotArma of vmInicial.caixaArmas) {
    assert.notEqual(
      slotArma.tipoItem,
      'SUBSISTEMA_TUBO_PRESSURIZADO',
      '[MUT-O6-02] Jamais misturar o Subsistema Tubo Pressurizado dentro da caixa [ARMAS]'
    );
    assert.notEqual(slotArma.chassiId, 'TUBO_PRESSURIZADO');
  }

  assert.equal(vmInicial.termometroSustentacao.pesoTotalKg, 225);
  assert.equal(vmInicial.termometroSustentacao.sustentacaoAtualKg, 260);
  assert.equal(vmInicial.termometroSustentacao.emSobrepeso, false);

  // 2. Ação na UI #1: Desligar 2 barras de energia do Sifão (Câmara 5: 2 -> 1 -> 0 barras)
  const passo1 = despacharComandoUi(estadoInicial, {
    tipo: 'ALOCAR_ENERGIA',
    payload: { camaraId: 5, deltaBarras: -1 },
  });
  assert.equal(passo1.aceito, true);
  const vmPasso1 = projetarViewModelWireframe(passo1.estado);
  // Com 1 barra no Sifão: Sustentação cai de 260 kg para 230 kg (ainda >= 225 kg -> 1_NO_FOIL)
  assert.equal(vmPasso1.termometroSustentacao.sustentacaoAtualKg, 230);
  assert.equal(vmPasso1.barraSuperior.estadoFisico, '1_NO_FOIL');

  const passo2 = despacharComandoUi(passo1.estado, {
    tipo: 'ALOCAR_ENERGIA',
    payload: { camaraId: 5, deltaBarras: -1 },
  });
  assert.equal(passo2.aceito, true);
  assert.equal(passo2.cueEmitido, 'CUE_ESTOL_TOUCHDOWN');

  // 3. Re-renderização após queda para 2_TOUCHDOWN (Sustentação = 0 kg < Peso = 225 kg)
  const vmTouchdown = projetarViewModelWireframe(passo2.estado);
  assert.equal(vmTouchdown.termometroSustentacao.sustentacaoAtualKg, 0);
  assert.equal(vmTouchdown.termometroSustentacao.emSobrepeso, true);
  assert.equal(vmTouchdown.barraSuperior.estadoFisico, '2_TOUCHDOWN');
  assert.equal(vmTouchdown.geometria.deslocamentoVerticalAtualPx, 100);
  assert.equal(vmTouchdown.geometria.filtroPassaBaixaAudioHz, 400);

  // MUT-O6-01: Todas as 8 válvulas externas e o botão [V] DRENAR TUDO devem estar travados em 2_TOUCHDOWN
  assert.equal(
    vmTouchdown.termometroSustentacao.botaoDrenarTudo.travadoTouchdown,
    true,
    '[MUT-O6-01] Botão [V] DRENAR TUDO deve ficar travado em 2_TOUCHDOWN'
  );
  assert.equal(vmTouchdown.termometroSustentacao.botaoDrenarTudo.statusValvula, 'TRAVADA_TOUCHDOWN');
  for (const cam of vmTouchdown.camaras) {
    assert.equal(
      cam.botaoValvulaDesabilitado,
      true,
      `[MUT-O6-01] Botão da válvula externa da câmara ${cam.id} deve estar desabilitado em 2_TOUCHDOWN`
    );
    assert.equal(cam.statusValvulaExterna, 'TRAVADA_TOUCHDOWN');
    assert.equal(cam.iconeCadeadoVisivel, true);
  }

  // 4. Ação na UI #2: Tentar clicar na válvula externa em 2_TOUCHDOWN -> Motor rejeita com BLOQUEADO_TRAVA_HIDROSTATICA e emite CUE_TRAVA_HIDROSTATICA
  const tentativaValvulaNoMar = despacharComandoUi(passo2.estado, {
    tipo: 'ALTERNAR_VALVULA',
    payload: { camaraId: 5, aberta: true },
  });
  assert.equal(tentativaValvulaNoMar.aceito, false);
  assert.equal(tentativaValvulaNoMar.marcadorRejeicao, 'BLOQUEADO_TRAVA_HIDROSTATICA');
  assert.equal(tentativaValvulaNoMar.cueEmitido, 'CUE_TRAVA_HIDROSTATICA');
});

test('[PORTÃO 08.2 | L3 + N4 + MUT-O6-03] Os 5 estados do Canal de Visibilidade L3 no Painel do Alvo: proibido exibir "0 tripulantes" ou [] quando cego', () => {
  const base = {
    ...criarEstadoInicialPartida('seed-l3-ui', 'CARCACA_ALFA'),
    alvoCombate: criarAlvoSetor1Canonico('BARCO_HUMANO'),
  };

  // Estado 1: Sala visível e vazia (Sala 2 — Torreta Naval sem marinheiros)
  const vmVisivel = projetarViewModelWireframe(base);
  const salaVazia = vmVisivel.painelAlvo.salasInspecionadas.find((s) => s.salaId === 2);
  assert.equal(salaVazia.canalPermissao, 'VISIVEL');
  assert.equal(salaVazia.marcadorExplicito, 'SALA_VISIVEL_VAZIA');
  assert.deepEqual(salaVazia.tripulantesVisiveis, []);

  // Estado 2: Sala visível e ocupada (Sala 1 — Cabine de Comando com 1 marinheiro)
  const salaOcupada = vmVisivel.painelAlvo.salasInspecionadas.find((s) => s.salaId === 1);
  assert.equal(salaOcupada.canalPermissao, 'VISIVEL');
  assert.equal(salaOcupada.marcadorExplicito, 'SALA_VISIVEL_OCUPADA');
  assert.equal(salaOcupada.tripulantesVisiveis.length, 1);

  // Estado 3: Bioma Águas Turvas sem Blue Option PER_3 -> NEGADO_SONAR / CEGO_AGUAS_TURVAS_ABISSAIS
  const estadoAguasTurvas = {
    ...base,
    alvoCombate: {
      ...base.alvoCombate,
      canalVisibilidadeSonar: 'NEGADO_SONAR',
    },
  };
  const vmTurvas = projetarViewModelWireframe(estadoAguasTurvas);
  for (const s of vmTurvas.painelAlvo.salasInspecionadas) {
    assert.equal(s.canalPermissao, 'NEGADO_SONAR');
    assert.equal(s.marcadorExplicito, 'CEGO_AGUAS_TURVAS_ABISSAIS');
    assert.equal(
      s.tripulantesVisiveis,
      undefined,
      '[MUT-O6-03 / Lei L3] Quando cego por Águas Turvas, tripulantesVisiveis deve ser undefined, nunca []'
    );
    assert.notEqual(
      s.textoTripulacao,
      '0 tripulantes',
      '[MUT-O6-03 / Lei L3] Proibido exibir "0 tripulantes" quando canalPermissao !== VISIVEL'
    );
  }

  // Estado 4: Sala atingida por Bolsa de Tinta Abissal -> NEGADO_TINTA / CEGO_BOLSA_TINTA
  const estadoTintaSala1 = {
    ...base,
    alvoCombate: {
      ...base.alvoCombate,
      salasOuOrgaos: base.alvoCombate.salasOuOrgaos.map((s) =>
        s.id === 1 ? { ...s, cegueiraTintaSeg: 8.0 } : s
      ),
    },
  };
  const vmTinta = projetarViewModelWireframe(estadoTintaSala1);
  const sala1Tinta = vmTinta.painelAlvo.salasInspecionadas.find((s) => s.salaId === 1);
  assert.equal(sala1Tinta.canalPermissao, 'NEGADO_TINTA');
  assert.equal(sala1Tinta.marcadorExplicito, 'CEGO_BOLSA_TINTA');
  assert.equal(sala1Tinta.tripulantesVisiveis, undefined);
  assert.notEqual(sala1Tinta.textoTripulacao, '0 tripulantes');

  // Estado 5: ID de sala fora do intervalo do alvo -> NAO_ENCONTRADO / SALA_ALVO_INEXISTENTE
  const salaInexistente = inspecionarSalaAlvo(base, 999);
  assert.equal(salaInexistente.status, 'NAO_ENCONTRADO');
  assert.equal(salaInexistente.marcadorExplicito, 'SALA_ALVO_INEXISTENTE');
  assert.equal(salaInexistente.dados, undefined);
});

test('[PORTÃO 08.3 | N4] Os 15 Comandos Atômicos (8.5.A), Persistência Permadeath vs profile.json (5 carcaças, 8.5.B) e os 8 Cues Sonoros Táticos (8.5.C)', () => {
  assert.equal(ESQUEMA_15_COMANDOS_85A.length, 15, '[N4] Examinados: 15 comandos atômicos na Seção 8.5.A');
  assert.equal(CARCACAS_PERFIL_85B.length, 5, '[N4] Examinados: 5 carcaças no profile.json 8.5.B');
  assert.equal(CATALOGO_8_CUES_SONOROS_85C.length, 8, '[N4] Examinados: 8 cues sonoros táticos 8.5.C');

  // Rejeição de comando em fase inválida (ex: ENXERTAR_ORGAO durante COMBATE)
  const estadoCombate = criarEstadoInicialPartida('seed-cmd', 'CARCACA_ALFA');
  const resEnxertoEmCombate = despacharComandoUi(estadoCombate, {
    tipo: 'ENXERTAR_ORGAO',
    payload: { orgaoId: 'GLANDULA_BAIACU', slotIndex: 0, acao: 'ENCAIXAR' },
  });
  assert.equal(resEnxertoEmCombate.aceito, false);
  assert.equal(resEnxertoEmCombate.marcadorRejeicao, 'REJEITADO_FASE_INVALIDA');

  // Enxertar órgão na fase MAPA aumenta o peso da nave em +5 kg (225 -> 230 kg)
  const estadoMapa = { ...estadoCombate, meta: { ...estadoCombate.meta, faseJogo: 'MAPA' } };
  const resEnxertoMapa = despacharComandoUi(estadoMapa, {
    tipo: 'ENXERTAR_ORGAO',
    payload: { orgaoId: 'GLANDULA_BAIACU', slotIndex: 0, acao: 'ENCAIXAR' },
  });
  assert.equal(resEnxertoMapa.aceito, true);
  assert.equal(resEnxertoMapa.estado.naveJogador.pesoTotalKg, 230);

  // Persistência: Permadeath apaga run_save.json em TR_7A_DERROTA_EM_COMBATE mas preserva profile.json
  let perfil = criarPerfilInicial();
  assert.equal(perfil.carcacasDesbloqueadas.CARCACA_ALFA, true);
  assert.equal(perfil.carcacasDesbloqueadas.MANTA_VOLT, false);

  perfil = atualizarPerfilComMetricasRun(perfil, {
    setorNumero: 4,
    vitoriaCombate: true,
    danoCascoCausadoAoInimigoNestaLuta: 0,
  });
  assert.equal(perfil.carcacasDesbloqueadas.MANTA_VOLT, true);

  const posDerrota = gerenciarPersistenciaTransicao(
    estadoCombate,
    perfil,
    'TR_7A_DERROTA_EM_COMBATE'
  );
  assert.equal(posDerrota.aceita, true);
  assert.equal(posDerrota.apagouRunSavePermadeath, true);
  assert.equal(posDerrota.runSaveJson, null);
  assert.equal(posDerrota.perfilObjeto.carcacasDesbloqueadas.MANTA_VOLT, true);

  // Avaliação dos cues sonoros táticos
  const estadoTouchdownFervura = {
    ...estadoCombate,
    naveJogador: {
      ...estadoCombate.naveJogador,
      estadoFisico: '2_TOUCHDOWN',
      camaras: estadoCombate.naveJogador.camaras.map((c) => ({
        ...c,
        aguaKg: 5.0, // Soma = 40 kg < 62.5 kg -> Cavitação!
        oxigenioPct: 15.0, // < 20% O2 -> Hipóxia!
        curtoCircuitoAtivo: c.id === 5,
      })),
    },
    alvoCombate: {
      alarmeFervuraAtivoSeg: 4.0,
      ultimoPowerSurgeDisparado: { fase: 3 },
    },
  };
  const cues = avaliarCuesSonorosAtivos(estadoCombate, estadoTouchdownFervura, {
    marcadorRejeicao: 'BLOQUEADO_TRAVA_HIDROSTATICA',
  });
  const idsCues = cues.map((c) => c.id);
  assert.ok(idsCues.includes('CUE_ESTOL_TOUCHDOWN'));
  assert.ok(idsCues.includes('CUE_ALARME_FERVURA_4S'));
  assert.ok(idsCues.includes('CUE_CURTO_CIRCUITO_AGUA'));
  assert.ok(idsCues.includes('CUE_CAVITACAO_SIFAO'));
  assert.ok(idsCues.includes('CUE_HIPOXIA_CRITICA'));
  assert.ok(idsCues.includes('CUE_TRAVA_HIDROSTATICA'));
  assert.ok(idsCues.includes('CUE_POWER_SURGE_CHEFE'));

  // Junção Cross-Wave Onda 6 <-> Onda 1: ATIVAR_BAIACU veda rombo real no tick de física e Presenter reflete Barreira e Brecha
  const copiaComRombo = structuredClone(estadoCombate);
  copiaComRombo.naveJogador.camaras.find((c) => c.id === 5).rombosCasco = 1;
  const estadoComRombo = congelarProfundo(copiaComRombo);
  const vmComRombo = projetarViewModelWireframe(estadoComRombo);
  assert.equal(vmComRombo.barraSuperior.barreiraBolhas, 1);
  assert.equal(vmComRombo.camaras.find((c) => c.id === 5).brechaAtiva, true);

  const cmdInflar = despacharComandoUi(estadoComRombo, {
    tipo: 'ATIVAR_BAIACU',
    payload: { tripulanteId: 'trip-baiacu-1', inflado: true },
  });
  assert.equal(cmdInflar.aceito, true);
  assert.equal(cmdInflar.estado.naveJogador.camaras.find((c) => c.id === 5).baiacuInfladoId, 'trip-baiacu-1');
  const posTickVedado = avancarTickFisicaHidraulica(cmdInflar.estado, 1.0);
  assert.equal(
    posTickVedado.naveJogador.camaras.find((c) => c.id === 5).aguaKg,
    12.5,
    'Baiacu inflado via comando da UI deve estancar o vazamento do rombo na Câmara 5'
  );

  // SALTO_FUGA desconta 1 combustível, desativa alvo e abandona invasores a bordo do inimigo
  const copiaProntaFuga = structuredClone(estadoCombate);
  copiaProntaFuga.naveJogador.progressoFugaSeg = 20.0;
  copiaProntaFuga.naveJogador.tripulacao[0].localizacao = 'BORDO_INIMIGO';
  const resFuga = despacharComandoUi(congelarProfundo(copiaProntaFuga), {
    tipo: 'SALTO_FUGA',
    payload: {},
  });
  assert.equal(resFuga.aceito, true);
  assert.equal(resFuga.estado.meta.faseJogo, 'MAPA');
  assert.equal(resFuga.estado.economia.combustivel, 11);
  assert.equal(resFuga.estado.alvoCombate.ativo, false);
  assert.equal(resFuga.estado.naveJogador.tripulacao.length, 2);

  // COMPRAR_OU_VENDER_LOJA debita Sucata e adiciona Combustível
  const estadoLoja = congelarProfundo({
    ...structuredClone(estadoCombate),
    meta: { ...estadoCombate.meta, faseJogo: 'LOJA' },
  });
  const resCompra = despacharComandoUi(estadoLoja, {
    tipo: 'COMPRAR_OU_VENDER_LOJA',
    payload: { itemOuSistemaId: 'INSUMO_COMBUSTIVEL', acao: 'COMPRAR' },
  });
  assert.equal(resCompra.aceito, true);
  assert.equal(resCompra.estado.economia.sucata, 27);
  assert.equal(resCompra.estado.economia.combustivel, 13);

  // ENXERTAR_ORGAO com ELETRO_PLACA_ARRAIA aplica penalidadeOrgaosSeg = 2.0s
  const resEnxertoEletro = despacharComandoUi(estadoMapa, {
    tipo: 'ENXERTAR_ORGAO',
    payload: { orgaoId: 'ELETRO_PLACA_ARRAIA', slotIndex: 0, acao: 'ENCAIXAR' },
  });
  assert.equal(resEnxertoEletro.aceito, true);
  assert.equal(resEnxertoEletro.estado.naveJogador.armasAtivas[0].arma.penalidadeOrgaosSeg, 2);

  // Cobertura fim-a-fim de TODOS os 15 comandos atômicos da Seção 8.5.A no motor real (despacharComandoUi)
  const cmdDesconhecido = () => despacharComandoUi(estadoCombate, { tipo: 'COMANDO_FANTASMA' });
  assert.throws(cmdDesconhecido, /Comando desconhecido/);

  // 1) DRENAR_TUDO e ALTERNAR_VALVULA em 1_NO_FOIL vs bloqueado em 2_TOUCHDOWN
  const resValvulaAr = despacharComandoUi(estadoCombate, {
    tipo: 'ALTERNAR_VALVULA',
    payload: { camaraId: 1, aberta: true },
  });
  assert.equal(resValvulaAr.aceito, true);
  const resValvulaInvalida = despacharComandoUi(estadoCombate, {
    tipo: 'ALTERNAR_VALVULA',
    payload: { camaraId: 999, aberta: true },
  });
  assert.equal(resValvulaInvalida.aceito, false);
  assert.equal(resValvulaInvalida.marcadorRejeicao, 'PRECONDICAO_NAO_ATENDIDA');

  const resDrenarAr = despacharComandoUi(estadoCombate, {
    tipo: 'DRENAR_TUDO',
    payload: { abrirTodas: true },
  });
  assert.equal(resDrenarAr.aceito, true);
  assert.equal(resDrenarAr.estado.naveJogador.camaras.every((c) => c.valvulaExternaAberta), true);

  // 2) MERGULHO_TATICO (recolherFoil=true -> 2_TOUCHDOWN; recolherFoil=false -> 3_SPOOL_UP) e bloqueio de DRENAR_TUDO no mar
  const resMergulho = despacharComandoUi(estadoCombate, {
    tipo: 'MERGULHO_TATICO',
    payload: { recolherFoil: true },
  });
  assert.equal(resMergulho.aceito, true);
  assert.equal(resMergulho.cueEmitido, 'CUE_ESTOL_TOUCHDOWN');
  assert.equal(resMergulho.estado.naveJogador.estadoFisico, '2_TOUCHDOWN');

  const resDrenarMar = despacharComandoUi(resMergulho.estado, {
    tipo: 'DRENAR_TUDO',
    payload: { abrirTodas: true },
  });
  assert.equal(resDrenarMar.aceito, false);
  assert.equal(resDrenarMar.marcadorRejeicao, 'BLOQUEADO_TRAVA_HIDROSTATICA');

  const resEmergir = despacharComandoUi(resMergulho.estado, {
    tipo: 'MERGULHO_TATICO',
    payload: { recolherFoil: false },
  });
  assert.equal(resEmergir.aceito, true);
  assert.equal(resEmergir.cueEmitido, 'CUE_SPOOL_UP_DECOLAGEM');
  assert.equal(resEmergir.estado.naveJogador.estadoFisico, '3_SPOOL_UP');

  // 3) MOVER_TRIPULANTE (aceito + rejeitado por lotação máxima de 2 aliados na sala destino)
  const resMover = despacharComandoUi(estadoCombate, {
    tipo: 'MOVER_TRIPULANTE',
    payload: { tripulanteId: 'trip-polvo-1', camaraDestinoId: 4 },
  });
  assert.equal(resMover.aceito, true);
  assert.equal(resMover.estado.naveJogador.tripulacao.find((t) => t.id === 'trip-polvo-1').camaraDestinoId, 4);

  const copiaLotada = structuredClone(estadoCombate);
  copiaLotada.naveJogador.tripulacao[0].camaraAtualId = 4; // Polvo + Arraia já estão na Câmara 4 (2 aliados)
  const resMoverLotado = despacharComandoUi(congelarProfundo(copiaLotada), {
    tipo: 'MOVER_TRIPULANTE',
    payload: { tripulanteId: 'trip-baiacu-1', camaraDestinoId: 4 },
  });
  assert.equal(resMoverLotado.aceito, false);
  assert.equal(resMoverLotado.marcadorRejeicao, 'PRECONDICAO_NAO_ATENDIDA');

  // 4) MIRAR_ARMA (projétil comum, Feixe Beam com trinca ortogonal [1,2,4] e Torpedo exigindo sala submersa)
  const resMirarPadrao = despacharComandoUi(estadoCombate, {
    tipo: 'MIRAR_ARMA',
    payload: { slotIndex: 0, salaAlvoId: 3 },
  });
  assert.equal(resMirarPadrao.aceito, true);
  assert.equal(resMirarPadrao.estado.naveJogador.armasAtivas[0].arma.salaAlvoId, 3);

  const copiaBeamTorpedo = structuredClone(estadoCombate);
  copiaBeamTorpedo.alvoCombate = structuredClone(criarAlvoSetor1Canonico('BARCO_HUMANO'));
  copiaBeamTorpedo.naveJogador.armasAtivas[0].arma.chassiId = 'CORTADOR_TERMICO_PLASMA';
  copiaBeamTorpedo.naveJogador.armasAtivas[1].arma.chassiId = 'LANCADOR_TORPEDO_ABISSAL';
  const estBeamTorp = congelarProfundo(copiaBeamTorpedo);

  assert.equal(
    despacharComandoUi(estBeamTorp, { tipo: 'MIRAR_ARMA', payload: { slotIndex: 0, salaAlvoId: 1 } }).aceito,
    false,
    'Beam sem trincaSalasBeam deve ser rejeitado'
  );
  assert.equal(
    despacharComandoUi(estBeamTorp, { tipo: 'MIRAR_ARMA', payload: { slotIndex: 0, salaAlvoId: 1, trincaSalasBeam: [1, 2, 1] } }).aceito,
    false,
    'Beam com trinca vai-e-volta deve ser rejeitado'
  );
  assert.equal(
    despacharComandoUi(estBeamTorp, { tipo: 'MIRAR_ARMA', payload: { slotIndex: 0, salaAlvoId: 1, trincaSalasBeam: [1, 2, 4] } }).aceito,
    true,
    'Beam com trinca ortogonal simples [1,2,4] deve ser aceito'
  );
  assert.equal(
    despacharComandoUi(estBeamTorp, { tipo: 'MIRAR_ARMA', payload: { slotIndex: 1, salaAlvoId: 1 } }).aceito,
    false,
    'Torpedo contra sala seca superior (id=1) deve ser rejeitado'
  );
  assert.equal(
    despacharComandoUi(estBeamTorp, { tipo: 'MIRAR_ARMA', payload: { slotIndex: 1, salaAlvoId: 3 } }).aceito,
    true,
    'Torpedo contra sala submersa (id=3) deve ser aceito'
  );

  // 5) ATIVAR_PULSO_ENZIMAS e ATIVAR_TINTA_FURTIVA
  const copiaHab = structuredClone(estadoCombate);
  copiaHab.naveJogador.camaras.find((c) => c.id === 3).barrasEnergiaAlocada = 2;
  copiaHab.naveJogador.camaras.find((c) => c.id === 8).barrasEnergiaAlocada = 2;
  const estHab = congelarProfundo(copiaHab);
  const resPulso = despacharComandoUi(estHab, { tipo: 'ATIVAR_PULSO_ENZIMAS', payload: { camaraId: 3 } });
  assert.equal(resPulso.aceito, true);
  assert.equal(resPulso.estado.naveJogador.pulsoEnzimasAtivoSeg, 6.0);
  assert.equal(resPulso.estado.naveJogador.recargaPulsoEnzimasSeg, 25.0);

  const resTinta = despacharComandoUi(estHab, { tipo: 'ATIVAR_TINTA_FURTIVA', payload: { camaraId: 8 } });
  assert.equal(resTinta.aceito, true);
  assert.equal(resTinta.estado.naveJogador.furtividadeAtivaSeg, 8.0);
  assert.equal(resTinta.estado.naveJogador.recargaFurtividadeSeg, 20.0);

  // 6) LANCAR_ABORDAGEM (Couraça-Limiar com Caranguejo na Câmara 7: Nv 2 inicial = 9s, Nv 1 = 14s, valida IDs duplicados e blindagem térmica > 0)
  const estCouraca = congelarProfundo({
    ...structuredClone(criarEstadoInicialPartida('seed-ab', 'COURACA_LIMIAR')),
    alvoCombate: criarAlvoSetor1Canonico('BARCO_HUMANO'),
  });
  const resAbordOk = despacharComandoUi(estCouraca, {
    tipo: 'LANCAR_ABORDAGEM',
    payload: { tripulantesIds: ['trip-caranguejo-1'], salaAlvoId: 1 },
  });
  assert.equal(resAbordOk.aceito, true);
  assert.equal(resAbordOk.estado.naveJogador.recargaTuboAbordagemSeg, 9.0);
  assert.equal(
    resAbordOk.estado.naveJogador.tripulacao.find((t) => t.id === 'trip-caranguejo-1').localizacao,
    'BORDO_INIMIGO'
  );

  const copiaCouracaNv1 = structuredClone(estCouraca);
  copiaCouracaNv1.naveJogador.camaras.find((c) => c.id === 7).barrasEnergiaAlocada = 1;
  const resAbordNv1 = despacharComandoUi(congelarProfundo(copiaCouracaNv1), {
    tipo: 'LANCAR_ABORDAGEM',
    payload: { tripulantesIds: ['trip-caranguejo-1'], salaAlvoId: 1 },
  });
  assert.equal(resAbordNv1.aceito, true);
  assert.equal(resAbordNv1.estado.naveJogador.recargaTuboAbordagemSeg, 14.0);

  const resAbordDuplicado = despacharComandoUi(estCouraca, {
    tipo: 'LANCAR_ABORDAGEM',
    payload: { tripulantesIds: ['trip-caranguejo-1', 'trip-caranguejo-1'], salaAlvoId: 1 },
  });
  assert.equal(resAbordDuplicado.aceito, false);

  const copiaBlindagemTermica = structuredClone(estCouraca);
  copiaBlindagemTermica.alvoCombate.blindagemTermicaExternaPts = 3;
  const resAbordBlindagem = despacharComandoUi(congelarProfundo(copiaBlindagemTermica), {
    tipo: 'LANCAR_ABORDAGEM',
    payload: { tripulantesIds: ['trip-caranguejo-1'], salaAlvoId: 1 },
  });
  assert.equal(resAbordBlindagem.aceito, false);

  const resAbordSalaInvalida = despacharComandoUi(estCouraca, {
    tipo: 'LANCAR_ABORDAGEM',
    payload: { tripulantesIds: ['trip-caranguejo-1'], salaAlvoId: 99 },
  });
  assert.equal(resAbordSalaInvalida.aceito, false);

  // Validação de slotIndex negativo/não-inteiro e salaAlvoId inexistente em MIRAR_ARMA e ENXERTAR_ORGAO
  assert.equal(
    despacharComandoUi(estBeamTorp, { tipo: 'MIRAR_ARMA', payload: { slotIndex: -1, salaAlvoId: 1 } }).aceito,
    false
  );
  assert.equal(
    despacharComandoUi(estBeamTorp, { tipo: 'MIRAR_ARMA', payload: { slotIndex: 1, salaAlvoId: 999 } }).aceito,
    false
  );
  assert.equal(
    despacharComandoUi(estBeamTorp, {
      tipo: 'MIRAR_ARMA',
      payload: { slotIndex: 0, trincaSalasIds: [1, 2, 999] },
    }).aceito,
    false
  );
  assert.equal(
    despacharComandoUi(estadoLoja, {
      tipo: 'ENXERTAR_ORGAO',
      payload: { orgaoId: 'ELETRO_PLACA_ARRAIA', slotIndex: -1, acao: 'INSTALAR' },
    }).aceito,
    false
  );

  // 7) ESCOLHER_OPCAO_EVENTO (Opções A, B e C em fase EVENTO)
  const estEvento = congelarProfundo({
    ...structuredClone(estCouraca),
    meta: { ...estCouraca.meta, faseJogo: 'EVENTO' },
  });
  const resEvB = despacharComandoUi(estEvento, {
    tipo: 'ESCOLHER_OPCAO_EVENTO',
    payload: { idEvento: 'SOS_1_REDE_ARRASTO', categoriaEvento: 'SOS', opcao: 'B' },
  });
  assert.equal(resEvB.aceito, true);
  assert.equal(resEvB.estado.economia.biomassa, 30);

  const resEvCPerigo = despacharComandoUi(estEvento, {
    tipo: 'ESCOLHER_OPCAO_EVENTO',
    payload: { idEvento: 'PER_1_CHUVA_ACIDA', categoriaEvento: 'PERIGO', opcao: 'C' },
  });
  assert.equal(resEvCPerigo.aceito, false);
  assert.equal(resEvCPerigo.marcadorRejeicao, 'BLOQUEADO_COMBATE_OBRIGATORIO');

  // 8) COMPRAR_OU_VENDER_LOJA (aceita tanto payload.operacao quanto payload.acao) e ENXERTAR_ORGAO (REMOVER)
  const copiaLojaRica = structuredClone(estadoLoja);
  copiaLojaRica.economia.sucata = 200;
  copiaLojaRica.economia.biomassa = 200;
  copiaLojaRica.naveJogador.hpCascoAtual = 25;
  const estLojaRica = congelarProfundo(copiaLojaRica);

  const resReparoLoja = despacharComandoUi(estLojaRica, {
    tipo: 'COMPRAR_OU_VENDER_LOJA',
    payload: { itemOuSistemaId: 'REPARO_CASCO_1HP', operacao: 'COMPRAR' },
  });
  assert.equal(resReparoLoja.aceito, true);
  assert.equal(resReparoLoja.estado.naveJogador.hpCascoAtual, 26);

  const resRecrutaLoja = despacharComandoUi(estLojaRica, {
    tipo: 'COMPRAR_OU_VENDER_LOJA',
    payload: { itemOuSistemaId: 'TRIPULANTE_POLVO', acao: 'COMPRAR' },
  });
  assert.equal(resRecrutaLoja.aceito, true);
  assert.equal(resRecrutaLoja.estado.naveJogador.tripulacao.length, 4);

  const resVendaLoja = despacharComandoUi(estLojaRica, {
    tipo: 'COMPRAR_OU_VENDER_LOJA',
    payload: { itemOuSistemaId: 'EMISSOR_ACUSTICO_I', operacao: 'VENDER' },
  });
  assert.equal(resVendaLoja.aceito, true);
  assert.equal(resVendaLoja.estado.economia.sucata, 217);
  assert.equal(
    despacharComandoUi(resVendaLoja.estado, {
      tipo: 'COMPRAR_OU_VENDER_LOJA',
      payload: { itemOuSistemaId: 'EMISSOR_ACUSTICO_I', operacao: 'VENDER' },
    }).aceito,
    false,
    'Vender uma segunda vez a arma já vendida deve ser rejeitado'
  );
  const resCompraArmaLoja = despacharComandoUi(resVendaLoja.estado, {
    tipo: 'COMPRAR_OU_VENDER_LOJA',
    payload: { itemOuSistemaId: 'EMISSOR_ACUSTICO_I', operacao: 'COMPRAR' },
  });
  assert.equal(resCompraArmaLoja.aceito, true);
  assert.equal(resCompraArmaLoja.estado.naveJogador.poraoCarga.filter((s) => s.item !== null).length, 1);
  const resVendaPoraoLoja = despacharComandoUi(resCompraArmaLoja.estado, {
    tipo: 'COMPRAR_OU_VENDER_LOJA',
    payload: { itemOuSistemaId: 'EMISSOR_ACUSTICO_I', operacao: 'VENDER' },
  });
  assert.equal(resVendaPoraoLoja.aceito, true);
  assert.equal(resVendaPoraoLoja.estado.naveJogador.poraoCarga.filter((s) => s.item !== null).length, 0);

  // Comprar quando os 4 slots do porão já estão ocupados deve rejeitar
  const copiaPoraoCheio = structuredClone(resVendaPoraoLoja.estado);
  copiaPoraoCheio.naveJogador.poraoCarga = [0, 1, 2, 3].map((slotIndex) => ({
    slotIndex,
    item: { id: 'EMISSOR_ACUSTICO_I', pesoKg: 10 },
  }));
  assert.equal(
    despacharComandoUi(congelarProfundo(copiaPoraoCheio), {
      tipo: 'COMPRAR_OU_VENDER_LOJA',
      payload: { itemOuSistemaId: 'EMISSOR_ACUSTICO_I', operacao: 'COMPRAR' },
    }).aceito,
    false
  );

  const resRemoverOrgao = despacharComandoUi(resEnxertoEletro.estado, {
    tipo: 'ENXERTAR_ORGAO',
    payload: { orgaoId: 'ELETRO_PLACA_ARRAIA', slotIndex: 0, acao: 'REMOVER' },
  });
  assert.equal(resRemoverOrgao.aceito, true);
  assert.equal(resRemoverOrgao.estado.naveJogador.armasAtivas[0].arma.orgaosEnxertados.length, 0);

  // 9) VIAJAR_NO_MAPA (aceito e rejeitado sem destino ou sem rota conectada) + oráculos auxiliares
  const estadoMapaComRotas = congelarProfundo({
    ...structuredClone(estadoMapa),
    mapaSetorial: {
      ...estadoMapa.mapaSetorial,
      noAtualId: 'NO_0_ENTRADA',
      rotas: [{ origemId: 'NO_0_ENTRADA', destinoId: 'NO_1_A', distanciaEfetivaMn: 22.0 }],
    },
  });
  const resViagemSemRota = despacharComandoUi(estadoMapaComRotas, {
    tipo: 'VIAJAR_NO_MAPA',
    payload: { idNoDestino: 'NO_4_SAIDA', descartarCargaIds: [] },
  });
  assert.equal(resViagemSemRota.aceito, false);
  assert.equal(resViagemSemRota.marcadorRejeicao, 'PRECONDICAO_NAO_ATENDIDA');

  const resViagemOk = despacharComandoUi(estadoMapaComRotas, {
    tipo: 'VIAJAR_NO_MAPA',
    payload: { idNoDestino: 'NO_1_A', descartarCargaIds: [] },
  });
  assert.equal(resViagemOk.aceito, true);
  assert.equal(resViagemOk.estado.mapaSetorial.noAtualId, 'NO_1_A');

  assert.equal(
    calcularPesoOraculo({
      pesoChassiKg: 100,
      aguaPorCamaraKg: [12.5, 12.5, 12.5, 12.5, 12.5, 12.5, 12.5, 12.5],
      pesosArmasAtivasKg: [15, 10],
      pesosCargaPoraoKg: [10],
      quantidadeOrgaosEnxertados: 1,
      nivelBlindagem: 1,
    }),
    255
  );
  assert.equal(avaliarPredicadoDesbloqueio('a <= 5 && b > 1 && c < 10', { a: 5, b: 2, c: 9 }), true);

  // Cobertura completa de CUE_SPOOL_UP_DECOLAGEM (tanto por comando MERGULHO_TATICO(false) quanto em andamento), rejeições e debug L3
  const passoRetornoSpool = despacharComandoUi(resMergulho.estado, {
    tipo: 'MERGULHO_TATICO',
    payload: { recolherFoil: false },
  });
  assert.equal(passoRetornoSpool.cueEmitido, 'CUE_SPOOL_UP_DECOLAGEM');
  const cuesRetornoSpool = avaliarCuesSonorosAtivos(resMergulho.estado, passoRetornoSpool.estado, passoRetornoSpool);
  assert.ok(cuesRetornoSpool.some((c) => c.id === 'CUE_SPOOL_UP_DECOLAGEM'));

  const estSpool = structuredClone(estadoMapa);
  estSpool.naveJogador.estadoFisico = '3_SPOOL_UP';
  estSpool.naveJogador.progressoSpoolUpSeg = 1.5;
  const cuesSpool = avaliarCuesSonorosAtivos(estadoMapa, congelarProfundo(estSpool));
  assert.ok(cuesSpool.some((c) => c.id === 'CUE_SPOOL_UP_DECOLAGEM'));

  const vmCouraca = projetarViewModelWireframe(estCouraca);
  assert.equal(vmCouraca.idCarcaca, 'COURACA_LIMIAR');
  const frameCouraca = renderizarViewModelNoCanvas2d(vmCouraca);
  assert.equal(
    frameCouraca.larguraAsaSubmersaDesenhadaPx,
    88,
    '[MUT-O6-06 / Atlas Sprites] A asa submersa da COURACA_LIMIAR no Atlas deve ter o dobro da largura padrão (88 px = 2x 44 px)'
  );

  const resBaiacuInv = despacharComandoUi(estCouraca, {
    tipo: 'ATIVAR_BAIACU',
    payload: { tripulanteId: 'inexistente', inflado: true },
  });
  assert.equal(resBaiacuInv.aceito, false);

  const resAbordFora7 = despacharComandoUi(estCouraca, {
    tipo: 'LANCAR_ABORDAGEM',
    payload: { tripulantesIds: ['trip-baiacu-1'], salaAlvoId: 1 },
  });
  assert.equal(resAbordFora7.aceito, false);

  const copiaRecargaTubo = structuredClone(estCouraca);
  copiaRecargaTubo.naveJogador.recargaTuboAbordagemSeg = 5.0;
  const resAbordEmRecarga = despacharComandoUi(congelarProfundo(copiaRecargaTubo), {
    tipo: 'LANCAR_ABORDAGEM',
    payload: { tripulantesIds: ['trip-caranguejo-1'], salaAlvoId: 1 },
  });
  assert.equal(resAbordEmRecarga.aceito, false);

  const trPersInv = gerenciarPersistenciaTransicao(
    estadoMapa,
    criarPerfilInicial(),
    'TR_7A_DERROTA_EM_COMBATE'
  );
  assert.equal(trPersInv.aceita, false);

  const copiaCega = structuredClone(estCouraca);
  copiaCega.naveJogador.camaras.find((c) => c.id === 2).barrasIntegridade = 0;
  copiaCega.naveJogador.tripulacao = [];
  const vmVazado = projetarViewModelWireframe(congelarProfundo(copiaCega), {
    vazarZeroTripulantesQuandoCegoL3: true,
  });
  assert.equal(vmVazado.painelAlvo.salasInspecionadas[0].textoTripulacao, '0 tripulantes');
});

test('[PORTÃO 08.4 | Itens 1, 2 e 3 | N1 + N4 + MUT-O6-04..06] Front-End Canvas 960x540 -> 1080p, Motor WebAudio 400 Hz, Atlas de Sprites Pixel Art e Servidor HTTP Seguro', async () => {
  // === ITEM 3: Atlas de Sprites Pixel Art na Grade Nativa (960x540, câmara 50x35 px) ===
  const atlas = obterAtlasSpritesNativo();
  assert.equal(Object.isFrozen(atlas), true);
  assert.equal(Object.keys(PALETA_PIXEL_ART_BIOFOIL).length, 12, '[N4] Examinadas: 12 cores RGBA canônicas na paleta hi-bit');
  assert.equal(
    Object.keys(TOKENS_PALETA_BIBLIA_ARTISTICA_13).length,
    12,
    '[N4] Examinados: 12 tokens semânticos hex da Bíblia Artística (Seção 1.3)'
  );
  assert.equal(Object.keys(GRADES_SPRITES_HIBITS_ARTESANAIS).length, 32, '[N4] Examinadas: 32 matrizes de sprites hi-bit artesanais');
  assert.equal(atlas.carcacas.length, 5, '[N4] Examinadas: 5 carcaças no Atlas Nativo');
  assert.equal(atlas.aliados.length, 5, '[N4] Examinados: 5 sprites de aliados (4 espécies + Baiacu normal/inflado)');
  assert.equal(atlas.invasores.length, 3, '[N4] Examinados: 3 invasores no Atlas Nativo');
  assert.equal(atlas.armas.length, 7, '[N4] Examinadas: 7 armas no Atlas Nativo');
  assert.equal(atlas.orgaos.length, 6, '[N4] Examinados: 6 órgãos enxertáveis no Atlas Nativo');
  assert.equal(atlas.cenarios.length, 6, '[N4] Examinados: 6 sprites cenográficos/estruturais hi-bit no Atlas Nativo');

  // Asserções literais L4 (Vol. 01 Seção 1.5 e Vol. 05 Seção 5.2)
  assert.equal(atlas.aliados.find((a) => a.id === 'ARRAIA').dps, 8, 'Arraia deve ter exatamente 8 DPS (Seção 1.5)');
  assert.equal(atlas.aliados.find((a) => a.id === 'CARANGUEJO').dps, 12, 'Caranguejo deve ter exatamente 12 DPS (Seção 1.5)');
  assert.equal(
    atlas.orgaos.find((o) => o.id === 'GLANDULA_BAIACU').efeito,
    'veneno -6 HP/s por 10s',
    'Glândula de Baiacu deve ter veneno -6 HP/s por 10s (Seção 5.2)'
  );

  const couraca = atlas.carcacas.find((c) => c.id === 'COURACA_LIMIAR');
  const alfa = atlas.carcacas.find((c) => c.id === 'CARCACA_ALFA');
  assert.equal(
    couraca.larguraAsaSubmersaPx,
    88,
    '[MUT-O6-06 / Atlas Sprites] A asa submersa da COURACA_LIMIAR no Atlas deve ter o dobro da largura padrão (88 px = 2x 44 px)'
  );
  assert.equal(couraca.larguraAsaSubmersaPx, alfa.larguraAsaSubmersaPx * 2);
  assert.equal(couraca.temTuboAbordagemFrontal, true);
  assert.equal(atlas.carcacas.find((c) => c.id === 'SOMBRA_ABISSAL').temNevoaTinta, true);
  assert.equal(atlas.carcacas.find((c) => c.id === 'COLMEIA_VIVA').temPoliposBioluminescentes, true);

  const atlasMutAsa = obterAtlasSpritesNativo({ reduzirAsaCouracaLimiar: true });
  assert.equal(atlasMutAsa.carcacas.find((c) => c.id === 'COURACA_LIMIAR').larguraAsaSubmersaPx, 44);

  // Rasterização RGBA: silhueta própria com exterior transparente ('.'), contorno 1px ('#') e 32/32 hashes FNV-1a únicos (26 + 6 cenários)
  const hashesSprites = new Set();
  let totalSpritesExaminados = 0;
  for (const cat of ['carcacas', 'aliados', 'invasores', 'armas', 'orgaos', 'cenarios']) {
    for (const item of atlas[cat]) {
      const rast = rasterizarSpriteRgba(cat, item.id);
      if (cat !== 'cenarios') {
        assert.equal(rast.cabeNaCamaraNativa50x35, true, `Sprite ${cat}/${item.id} excede 50x35 px`);
      }
      assert.ok(rast.pixelsTransparentes > 0, `Sprite ${cat}/${item.id} deve ter silhueta recortada com pixels transparentes '.'`);
      assert.ok(rast.pixelsContorno1px > 0 && rast.pixelsPreenchimento > 0);
      assert.ok(rast.hashFnv1aRgba > 0);
      assert.equal(rast.bytesRgba.length, rast.largura * rast.altura * 4);
      hashesSprites.add(rast.hashFnv1aRgba);
      totalSpritesExaminados += 1;
    }
  }
  assert.equal(totalSpritesExaminados, 32, '[N4] Examinados: 32 sprites totais no Atlas Nativo (26 entidades + 6 cenários)');
  assert.equal(hashesSprites.size, 32, 'Todos os 32 sprites do Atlas devem ter silhuetas e hashes FNV-1a estritamente únicos');

  // Exportador PNG sem perda do Atlas Hi-Bit (Item Artístico A)
  const pngAtlasBuffer = exportarAtlasHiBitsPngBuffer(4);
  assert.equal(Buffer.isBuffer(pngAtlasBuffer), true);
  assert.equal(pngAtlasBuffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Deve gerar cabeçalho PNG válido');
  assert.ok(pngAtlasBuffer.includes(Buffer.from('IEND')), 'Deve conter chunk final IEND');
  assert.ok(pngAtlasBuffer.length > 4000, 'Atlas PNG 32 sprites deve ter conteúdo comprimido real');
  assert.equal(
    rasterizarSpriteRgba('orgaos', 'BEXIGA_ALTA_PRESSAO').idSprite,
    'BEXIGA_PRESSAO_ABISSAL',
    'Deve aceitar busca tanto pelo id do Atlas quanto pelo idCatalogo52'
  );
  assert.throws(() => rasterizarSpriteRgba('aliados', 'TUBARAO_FANTASMA'), /\[SPRITE_INEXISTENTE_NO_ATLAS\]/);
  assert.throws(() => rasterizarSpriteRgba('categoria_invalida', 'POLVO'), /\[SPRITE_INEXISTENTE_NO_ATLAS\]/);

  // === ITEM 1: Renderizador Canvas 2D (960x540 -> 1920x1080) e Hitboxes/Input DOM ===
  assert.equal(Object.keys(COORDENADAS_GRADE_CAMARAS_16A).length, 8, '[N4] Examinadas: 8 coordenadas de câmara na grade 2x4');
  const estadoBase = congelarProfundo({
    ...criarEstadoInicialPartida('seed-canvas-01', 'CARCACA_ALFA'),
    alvoCombate: criarAlvoSetor1Canonico('BARCO_HUMANO'),
  });
  const vmNoFoil = projetarViewModelWireframe(estadoBase, { idHitboxHover: 'SISTEMA_SIF' });
  assert.equal(vmNoFoil.termometroSustentacao.ghostPreview.ativo, true);
  assert.equal(vmNoFoil.termometroSustentacao.ghostPreview.sustentacaoProjetadaKg, 230);

  // Verifica que todas as 8 câmaras têm coordenadas (coluna, andar) numéricas válidas e distintas
  const coordsCamarasSet = new Set();
  for (const cam of vmNoFoil.camaras) {
    assert.equal(Number.isInteger(cam.coluna), true);
    assert.equal(Number.isInteger(cam.andar), true);
    coordsCamarasSet.add(`${cam.coluna},${cam.andar}`);
  }
  assert.equal(coordsCamarasSet.size, 8, 'As 8 câmaras devem ocupar 8 posições distintas na grade 2x4');

  const chamadasCtx = [];
  const ctxRealSimulado = {
    imageSmoothingEnabled: true,
    fillStyle: '',
    strokeStyle: '',
    fillRect(x, y, w, h) {
      assert.equal(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(w) && Number.isFinite(h), true, 'Proibido NaN em fillRect');
      chamadasCtx.push({ op: 'fillRect', x, y, w, h });
    },
    strokeRect(x, y, w, h) {
      assert.equal(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(w) && Number.isFinite(h), true, 'Proibido NaN em strokeRect');
      chamadasCtx.push({ op: 'strokeRect', x, y, w, h });
    },
    fillText(t, x, y) {
      assert.equal(Number.isFinite(x) && Number.isFinite(y), true, 'Proibido NaN em fillText');
      chamadasCtx.push({ op: 'fillText', t, x, y });
    },
  };

  const frameNoFoil = renderizarViewModelNoCanvas2d(vmNoFoil, ctxRealSimulado);
  assert.equal(ctxRealSimulado.imageSmoothingEnabled, false, 'Canvas 2D deve desativar suavização bilinear (pixelated)');
  assert.equal(frameNoFoil.gradeCamarasTopoY, 156);
  assert.equal(frameNoFoil.linhaDaguaY, 330);
  assert.equal(frameNoFoil.larguraAsaSubmersaDesenhadaPx, 44);
  assert.equal(frameNoFoil.spritesDesenhados.length, 3, 'Deve desenhar os 3 tripulantes iniciais da Carcaça Alfa');
  assert.equal(frameNoFoil.inimigoAssentadoNaLinhaDagua.parteSuperiorAcimaDagua, true, 'Parte superior do inimigo deve estar acima da linha dágua');
  assert.equal(frameNoFoil.inimigoAssentadoNaLinhaDagua.parteInferiorSubmersa, true, 'Parte inferior do inimigo deve estar submersa sob a linha dágua (Regra R2.3: proibido barco voando!)');
  assert.ok(frameNoFoil.comandosDesenho.some((c) => c.camada === 'CORACAO_BIO_ELETRICO_PIXEL'), 'Rodapé deve desenhar o órgão marinho Coração Bio-Elétrico (Regra R6)');
  assert.ok(chamadasCtx.length > 200, 'Deve desenhar HUD, câmaras, água, válvulas, armas, quilha/asa e pixels dos sprites no Canvas');

  // Verifica renderização no Canvas das 5 carcaças (incluindo SOMBRA_ABISSAL com névoa de tinta e COLMEIA_VIVA com pólipos) e do Monstro TEUTHIS_COURACADA + exportação PNG do frame 960x540 (Item Artístico B)
  for (const idCarc of ['CARCACA_ALFA', 'MANTA_VOLT', 'COURACA_LIMIAR', 'SOMBRA_ABISSAL', 'COLMEIA_VIVA']) {
    const estCarc = congelarProfundo({
      ...criarEstadoInicialPartida(`seed-${idCarc}`, idCarc),
      alvoCombate: criarAlvoSetor1Canonico(idCarc === 'SOMBRA_ABISSAL' ? 'MONSTRO_MARINHO' : 'BARCO_HUMANO'),
    });
    const vmCarc = projetarViewModelWireframe(estCarc);
    const frameCarc = renderizarViewModelNoCanvas2d(vmCarc);
    assert.equal(frameCarc.inimigoAssentadoNaLinhaDagua.parteSuperiorAcimaDagua, true);
    assert.equal(frameCarc.inimigoAssentadoNaLinhaDagua.parteInferiorSubmersa, true);
    if (idCarc === 'COURACA_LIMIAR') {
      assert.ok(frameCarc.comandosDesenho.some((c) => c.camada === 'TUBO_ABORDAGEM_FRONTAL_CARNUDO'));
    }
    if (idCarc === 'SOMBRA_ABISSAL') {
      assert.ok(frameCarc.comandosDesenho.some((c) => c.camada === 'NEVOA_TINTA_SOMBRA_ABISSAL'));
      assert.equal(frameCarc.inimigoAssentadoNaLinhaDagua.idSprite, 'TEUTHIS_COURACADA');
      const pngF3 = renderizarCenaCanvasParaPngBuffer(vmCarc, { escalaInteira: 1 });
      assert.equal(pngF3.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    }
    if (idCarc === 'COLMEIA_VIVA') {
      assert.ok(frameCarc.comandosDesenho.some((c) => c.camada === 'POLIPOS_BIOLUMINESCENTES_COLMEIA'));
    }
  }
  const pngCenaBuffer = renderizarCenaCanvasParaPngBuffer(vmNoFoil, { exibirGhostPreview: true });
  assert.equal(Buffer.isBuffer(pngCenaBuffer), true);
  assert.equal(pngCenaBuffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.ok(pngCenaBuffer.length > 5000);

  // Verifica que 2 tripulantes na mesma câmara (Slot 0 e Slot 1), invasores, sala inimiga inundada e barras danificadas são desenhados
  const copia2MesmaSala = structuredClone(estadoBase);
  copia2MesmaSala.naveJogador.tripulacao[0].camaraAtualId = 4; // Polvo + Arraia juntos na Câmara 4
  copia2MesmaSala.naveJogador.camaras.find((c) => c.id === 4).curtoCircuitoAtivo = true;
  copia2MesmaSala.naveJogador.camaras.find((c) => c.id === 4).brechaAtiva = true;
  copia2MesmaSala.naveJogador.camaras.find((c) => c.id === 4).oxigenioPct = 15;
  copia2MesmaSala.naveJogador.camaras.find((c) => c.id === 5).barrasIntegridade = 1;
  copia2MesmaSala.naveJogador.invasores = [
    { id: 'inv-1', especie: 'MARINHEIRO', camaraAtualId: 4, hpAtual: 80, hpMax: 100 },
  ];
  copia2MesmaSala.naveJogador.armasAtivas[0].arma.orgaosEnxertados = ['ELETRO_PLACA_ARRAIA'];
  copia2MesmaSala.alvoCombate.salasOuOrgaos[2].aguaKg = 10.0;
  const vm2MesmaSala = projetarViewModelWireframe(congelarProfundo(copia2MesmaSala));
  const frame2MesmaSala = renderizarViewModelNoCanvas2d(vm2MesmaSala, null);
  const spritesCam4 = frame2MesmaSala.spritesDesenhados.filter((s) => s.camaraId === 4);
  assert.equal(spritesCam4.length, 2);
  assert.notEqual(spritesCam4[0].x, spritesCam4[1].x, 'Dois tripulantes na mesma câmara devem ocupar X distintos (Slot 0 e Slot 1)');
  assert.ok(frame2MesmaSala.comandosDesenho.some((c) => c.camada === 'ROMBO_PAREDE_CAMARA_4'));
  assert.ok(frame2MesmaSala.comandosDesenho.some((c) => c.camada === 'FAISCA_REPARO_POLVO_4'));
  assert.ok(frame2MesmaSala.comandosDesenho.some((c) => c.camada === 'INVASOR_PIXEL_inv-1'));
  assert.ok(frame2MesmaSala.comandosDesenho.some((c) => c.camada === 'ORGAO_ENXERTADO_PIXEL_0_0'));
  assert.ok(frame2MesmaSala.comandosDesenho.some((c) => c.camada === 'AGUA_SALA_ALVO_3'));

  // Infla o Baiacu e derruba a bio-nave em 2_TOUCHDOWN -> parede entre 2º e 3º andar deve cair exatamente na LINHA_DAGUA_Y = 330
  const passoInflar = despacharComandoUi(estadoBase, {
    tipo: 'ATIVAR_BAIACU',
    payload: { tripulanteId: 'trip-baiacu-1', inflado: true },
  });
  const passoMergulho = despacharComandoUi(passoInflar.estado, {
    tipo: 'MERGULHO_TATICO',
    payload: { recolherFoil: true },
  });
  const vmTouchdown = projetarViewModelWireframe(passoMergulho.estado);
  const frameTouchdown = renderizarViewModelNoCanvas2d(vmTouchdown, null);
  const pngTouchdown = renderizarCenaCanvasParaPngBuffer(vmTouchdown, { escalaInteira: 1 });
  assert.equal(pngTouchdown.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(
    frameTouchdown.paredeEntre2e3AndarY,
    330,
    '[MUT-O6-04 / Canvas 960x540] Em 2_TOUCHDOWN, a grade das 8 câmaras no Canvas deve descer 100 px nativos (parede 2º/3º andar na LINHA_DAGUA_Y = 330)'
  );
  assert.ok(frameTouchdown.spritesDesenhados.some((s) => s.idSprite === 'BAIACU_INFLADO'));

  const frameMutIgnoraQueda = renderizarViewModelNoCanvas2d(vmTouchdown, null, {
    ignorarQuedaTouchdownNoCanvas: true,
  });
  assert.equal(frameMutIgnoraQueda.paredeEntre2e3AndarY, 230);

  // Conversão de coordenadas de tela (1080p, 4K com letterboxing horizontal e vertical, e proteção contra NaN/Infinity/rect inválido)
  const coord1080p = converterCoordenadaTelaParaNativa(960, 540, { left: 0, top: 0, width: 1920, height: 1080 });
  assert.equal(coord1080p.dentroDoCanvas, true);
  assert.equal(coord1080p.xNativo, 480);
  assert.equal(coord1080p.yNativo, 270);

  const coordLetterboxX = converterCoordenadaTelaParaNativa(10, 540, { left: 0, top: 0, width: 2200, height: 1080 });
  assert.equal(coordLetterboxX.dentroDoCanvas, false);

  const coordLetterboxY = converterCoordenadaTelaParaNativa(960, 10, { left: 0, top: 0, width: 1920, height: 1400 });
  assert.equal(coordLetterboxY.dentroDoCanvas, false);

  const coordNaN = converterCoordenadaTelaParaNativa(Number.NaN, 100, { left: 0, top: 0, width: 1920, height: 1080 });
  assert.equal(coordNaN.dentroDoCanvas, false);
  assert.equal(coordNaN.xNativo, 0);
  const coordRectZero = converterCoordenadaTelaParaNativa(100, 100, { left: 0, top: 0, width: 0, height: -10 });
  assert.equal(coordRectZero.dentroDoCanvas, false);

  // Tradutor de Teclado, Hover Ghost Preview e Cliques de Mouse em Hitboxes Nativas (todas as 8 câmaras e 8 válvulas)
  assert.equal(
    traduzirInputDomParaComandoUi({ tipoEvento: 'KEYDOWN', code: 'Space' }, estadoBase, vmNoFoil, { pausaTaticaAtiva: false })
      .pausaTaticaAtiva,
    true
  );
  assert.equal(
    traduzirInputDomParaComandoUi({ tipoEvento: 'KEYDOWN', code: 'KeyV' }, estadoBase, vmNoFoil).resultadoMotor.aceito,
    true
  );
  assert.equal(
    traduzirInputDomParaComandoUi({ tipoEvento: 'KEYDOWN', code: 'KeyM' }, estadoBase, vmNoFoil).resultadoMotor.estado
      .naveJogador.estadoFisico,
    '2_TOUCHDOWN'
  );
  assert.equal(
    traduzirInputDomParaComandoUi({ tipoEvento: 'KEYDOWN', code: 'KeyF' }, estadoBase, vmNoFoil).resultadoMotor.aceito,
    false
  );
  assert.equal(
    traduzirInputDomParaComandoUi({ tipoEvento: 'KEYDOWN', code: 'Digit2' }, estadoBase, vmNoFoil).slotArmaSelecionado,
    1
  );
  assert.equal(
    traduzirInputDomParaComandoUi({ tipoEvento: 'KEYDOWN', code: 'KeyZ' }, estadoBase, vmNoFoil).reconhecido,
    false
  );
  assert.equal(
    traduzirInputDomParaComandoUi(
      { tipoEvento: 'CLICK', clientX: -50, clientY: -50, retanguloCanvas: { left: 0, top: 0, width: 960, height: 540 } },
      estadoBase,
      vmNoFoil
    ).foraDoCanvas,
    true
  );
  assert.equal(
    traduzirInputDomParaComandoUi(
      { tipoEvento: 'CLICK', clientX: 550, clientY: 100, retanguloCanvas: { left: 0, top: 0, width: 960, height: 540 } },
      estadoBase,
      vmNoFoil
    ).reconhecido,
    false
  );

  const hitboxes = obterMapaHitboxesNativo(vmNoFoil);
  const clicarHitbox = (id, extras = {}, ctxUi = {}) => {
    const hb = hitboxes.find((h) => h.idHitbox === id);
    return traduzirInputDomParaComandoUi(
      {
        tipoEvento: 'CLICK',
        clientX: hb.x + 2,
        clientY: hb.y + 2,
        retanguloCanvas: { left: 0, top: 0, width: 960, height: 540 },
        ...extras,
      },
      estadoBase,
      vmNoFoil,
      ctxUi
    );
  };

  // Verifica que clicar em cada uma das 8 câmaras (1..8) e das 8 válvulas externas (1..8) acerta seu próprio ID sem colisão!
  for (let idCam = 1; idCam <= 8; idCam += 1) {
    const resCam = clicarHitbox(`CAMARA_${idCam}`);
    assert.equal(resCam.hitboxAtingida, `CAMARA_${idCam}`);
    assert.equal(resCam.comandoMotor.payload.camaraDestinoId, idCam);

    const resValv = clicarHitbox(`VALVULA_CAMARA_${idCam}`);
    assert.equal(resValv.hitboxAtingida, `VALVULA_CAMARA_${idCam}`);
    assert.equal(resValv.comandoMotor.payload.camaraId, idCam);
  }

  assert.equal(clicarHitbox('BTN_DRENAR_TUDO').comandoMotor.tipo, 'DRENAR_TUDO');
  assert.equal(clicarHitbox('BTN_MERGULHO_TATICO').comandoMotor.tipo, 'MERGULHO_TATICO');
  assert.equal(clicarHitbox('SISTEMA_SIF', { shiftKey: true }).comandoMotor.payload.deltaBarras, -1);
  assert.equal(clicarHitbox('SISTEMA_SIF', { shiftKey: false }).comandoMotor.payload.deltaBarras, 1);
  assert.equal(clicarHitbox('SALA_ALVO_1', {}, { slotArmaSelecionado: 0, trincaSalasBeam: null }).comandoMotor.tipo, 'MIRAR_ARMA');
  assert.equal(clicarHitbox('ARMA_SLOT_1').acaoLocalUi, 'SELECIONAR_SLOT_ARMA');
  assert.equal(clicarHitbox('TRIPULANTE_CARD_trip-arraia-1').acaoLocalUi, 'SELECIONAR_TRIPULANTE');
  assert.equal(clicarHitbox('TRIPULANTE_CARD_trip-arraia-1').tripulanteSelecionadoId, 'trip-arraia-1');

  // Ghost Preview via MOUSEMOVE sobre válvula, botão Drenar Tudo (cavitação < 62.5 kg), Sifão e hitbox fora de água/Sifão
  const hbValv1 = hitboxes.find((h) => h.idHitbox === 'VALVULA_CAMARA_1');
  const hoverValv1 = traduzirInputDomParaComandoUi(
    { tipoEvento: 'MOUSEMOVE', clientX: hbValv1.x + 2, clientY: hbValv1.y + 2, retanguloCanvas: { left: 0, top: 0, width: 960, height: 540 } },
    estadoBase,
    vmNoFoil
  );
  assert.equal(hoverValv1.acaoLocalUi, 'ATUALIZAR_GHOST_PREVIEW');
  assert.equal(hoverValv1.ghostPreview.pesoProjetadoKg, 212.5);
  const ghostDrenarTudo = calcularGhostPreviewTermometro(estadoBase, 'BTN_DRENAR_TUDO');
  assert.equal(ghostDrenarTudo.pesoProjetadoKg, 125);
  assert.equal(
    ghostDrenarTudo.sustentacaoProjetadaKg,
    135,
    'Drenar todas as 8 câmaras (0 kg de água < 62.5 kg) deve descontar -125 kg de cavitação (62.5 * 2.0 kg/kg) na sustentação projetada (260 -> 135 kg)'
  );
  assert.equal(
    calcularGhostPreviewTermometro(estadoBase, 'CAMARA_1').ativo,
    false,
    'Hover em hitbox que não altera água nem Sifão deve ter Ghost Preview inativo'
  );
  assert.equal(calcularGhostPreviewTermometro(estadoBase, null).ativo, false);

  // Verifica novas primitivas visuais do Canvas 2D: TERMOMETRO_GHOST_LINHA, ARMA_DORSAL_PIXEL_0, ARMA_RECARGA_0, ARMA_SOQUETE_0_0 e TRIPULANTE_CARD_*
  assert.ok(frameNoFoil.comandosDesenho.some((c) => c.camada === 'TERMOMETRO_GHOST_LINHA'));
  assert.ok(frameNoFoil.comandosDesenho.some((c) => c.camada === 'ARMA_DORSAL_PIXEL_0'));
  assert.ok(frameNoFoil.comandosDesenho.some((c) => c.camada === 'ARMA_RECARGA_0'));
  assert.ok(frameNoFoil.comandosDesenho.some((c) => c.camada === 'ARMA_SOQUETE_0_0'));
  assert.ok(frameNoFoil.comandosDesenho.some((c) => c.camada === 'TRIPULANTE_CARD_trip-polvo-1'));

  // === ITEM 2: Motor WebAudio Tático + BiquadFilterNode 400 Hz + Síntese PCM com 4 Formas de Onda ===
  assert.equal(Object.keys(PERFIS_ACUSTICOS_WEB_AUDIO_85C).length, 8);
  const planoNoFoil = construirPlanoGrafoWebAudio(estadoBase, estadoBase, null);
  assert.equal(planoNoFoil.filtroSubaquaticoMaster.frequenciaCorteHz, 20000);
  assert.equal(planoNoFoil.filtroSubaquaticoMaster.ativoSubmerso, false);

  const estSpoolDeriva = structuredClone(passoMergulho.estado);
  estSpoolDeriva.naveJogador.estadoFisico = '3_SPOOL_UP';
  estSpoolDeriva.naveJogador.progressoSpoolUpSeg = 1.0;
  estSpoolDeriva.naveJogador.spoolUpPosDeriva = true;
  estSpoolDeriva.alvoCombate.alarmeFervuraAtivoSeg = 4.0;
  estSpoolDeriva.alvoCombate.ultimoPowerSurgeDisparado = { fase: 3, tick: 10 };
  const estadoCongeladoSpoolDeriva = congelarProfundo(estSpoolDeriva);
  const planoSubmerso = construirPlanoGrafoWebAudio(estadoBase, estadoCongeladoSpoolDeriva, {
    marcadorRejeicao: 'BLOQUEADO_TRAVA_HIDROSTATICA',
  });
  assert.equal(
    planoSubmerso.filtroSubaquaticoMaster.frequenciaCorteHz,
    400,
    '[MUT-O6-05 / WebAudio 400Hz] Em 2_TOUCHDOWN/3_SPOOL_UP, o BiquadFilterNode master deve operar em passa-baixa a 400 Hz'
  );
  assert.equal(
    planoSubmerso.nosSintese.find((n) => n.idCue === 'CUE_SPOOL_UP_DECOLAGEM').duracaoSeg,
    5.0,
    'Spool-up pós-Deriva deve agendar rampa WebAudio de 5.0s'
  );
  assert.equal(
    planoSubmerso.nosSintese.find((n) => n.idCue === 'CUE_POWER_SURGE_CHEFE').intervaloCicloSurgeSeg,
    18
  );

  // CUE_POWER_SURGE_CHEFE não deve re-disparar no tick seguinte se ultimoPowerSurgeDisparado não mudou
  const cuesMesmoSurge = avaliarCuesSonorosAtivos(estadoCongeladoSpoolDeriva, estadoCongeladoSpoolDeriva, null);
  assert.equal(
    cuesMesmoSurge.some((c) => c.id === 'CUE_POWER_SURGE_CHEFE'),
    false,
    'CUE_POWER_SURGE_CHEFE deve disparar apenas na transição de um novo Power Surge'
  );

  const planoMutSemFiltro = construirPlanoGrafoWebAudio(estadoBase, estadoCongeladoSpoolDeriva, null, {
    ignorarFiltroSubaquatico400Hz: true,
  });
  assert.equal(planoMutSemFiltro.filtroSubaquaticoMaster.frequenciaCorteHz, 20000);

  // Execução real sobre AudioContext WebAudio API, guarda de erro e limpeza onended (disconnect)
  assert.throws(() => aplicarPlanoNoContextoWebAudio(null, planoSubmerso), /\[WebAudio\] Contexto de áudio inválido/);
  const nosAudioConectados = [];
  let totalDesconectados = 0;
  const audioCtxPadrao = {
    currentTime: 10.0,
    destination: { id: 'DESTINATION' },
    createBiquadFilter() {
      return {
        type: '',
        frequency: { setValueAtTime(v, t) { nosAudioConectados.push({ op: 'biquadFreq', v, t }); } },
        Q: { setValueAtTime(v, t) { nosAudioConectados.push({ op: 'biquadQ', v, t }); } },
        connect(dest) { nosAudioConectados.push({ op: 'biquadConnect', dest }); },
      };
    },
    createGain() {
      return {
        gain: {
          setValueAtTime(v, t) { nosAudioConectados.push({ op: 'gainSet', v, t }); },
          linearRampToValueAtTime(v, t) { nosAudioConectados.push({ op: 'gainRamp', v, t }); },
        },
        connect(dest) { nosAudioConectados.push({ op: 'gainConnect', dest }); },
        disconnect() { totalDesconectados += 1; },
      };
    },
    createOscillator() {
      const noOsc = {
        type: '',
        onended: null,
        frequency: {
          setValueAtTime(v, t) { nosAudioConectados.push({ op: 'oscSet', v, t }); },
          linearRampToValueAtTime(v, t) { nosAudioConectados.push({ op: 'oscRamp', v, t }); },
        },
        connect(dest) { nosAudioConectados.push({ op: 'oscConnect', dest }); },
        disconnect() { totalDesconectados += 1; },
        start(t) { nosAudioConectados.push({ op: 'oscStart', t }); },
        stop(t) {
          nosAudioConectados.push({ op: 'oscStop', t });
          if (typeof noOsc.onended === 'function') noOsc.onended();
        },
      };
      return noOsc;
    },
  };
  const resAudioCtx = aplicarPlanoNoContextoWebAudio(audioCtxPadrao, planoSubmerso);
  assert.equal(resAudioCtx.aplicado, true);
  assert.equal(resAudioCtx.frequenciaFiltroAplicadaHz, 400);
  assert.equal(resAudioCtx.nosAgendados.length, planoSubmerso.nosSintese.length);
  assert.equal(totalDesconectados, planoSubmerso.nosSintese.length * 2, 'onended deve desconectar cada par OscillatorNode + GainNode');

  // Síntese PCM real com filtro Biquad IIR de 2ª ordem, buffer completo de amostras e as 4 formas de onda (sine, square, sawtooth, triangle)
  const tiposOndasVistos = new Set();
  for (const cue of CATALOGO_8_CUES_SONOROS_85C) {
    const pcmAr = sintetizarBufferPcmCueTatico(cue.id, { submerso: false, sampleRate: 8000, duracaoSinteseSeg: 0.08 });
    const pcmMar = sintetizarBufferPcmCueTatico(cue.id, { submerso: true, sampleRate: 8000, duracaoSinteseSeg: 0.08 });
    tiposOndasVistos.add(pcmAr.tipoOscilador);
    assert.equal(pcmAr.amostrasPcm.length, pcmAr.totalAmostras, 'Buffer PCM sintetizado deve conter todas as totalAmostras sem truncamento');
    assert.ok(pcmAr.rmsTotal > 0 && pcmMar.rmsTotal > 0);
    assert.ok(
      pcmMar.energiaAltaFreqRelativa < pcmAr.energiaAltaFreqRelativa,
      `Filtro Biquad de 400 Hz deve atenuar altas frequências em ${cue.id}`
    );
  }
  assert.deepEqual([...tiposOndasVistos].sort(), ['sawtooth', 'sine', 'square', 'triangle']);
  assert.throws(() => sintetizarBufferPcmCueTatico('CUE_INEXISTENTE'), /\[WebAudio PCM\] Cue sonoro desconhecido/);

  // === Segurança HTML/XSS, Script Client-Side /cliente.js e Servidor HTTP Endurecido ===
  const htmlSeguro = gerarHtmlClienteJogavelBiofoil(estadoBase, { titulo: '<script>alert("xss")</script>' });
  assert.ok(!htmlSeguro.includes('<script>alert("xss")</script>'), 'Título HTML deve ser escapado contra XSS');
  assert.ok(htmlSeguro.includes('width="960" height="540"'));
  assert.ok(htmlSeguro.includes('image-rendering: pixelated'));
  assert.ok(htmlSeguro.includes('<script src="/cliente.js" defer></script>'), 'HTML deve carregar o script /cliente.js compatível com script-src self');

  const codigoJsCliente = gerarCodigoJsClienteBiofoil();
  assert.ok(codigoJsCliente.includes("getElementById('biofoil-canvas')"));
  assert.ok(codigoJsCliente.includes("createBiquadFilter"));
  assert.ok(codigoJsCliente.includes("fetch('/api/comando'"));
  assert.ok(codigoJsCliente.includes("fetch('/api/tick'"));
  assert.ok(codigoJsCliente.includes("frameCanvas.comandosDesenho"));

  await assert.rejects(
    () => iniciarServidorClienteWebBiofoil({ host: '0.0.0.0' }),
    /\[SEGURANCA HTTP\] Bind proibido fora de loopback/
  );

  const srv = await iniciarServidorClienteWebBiofoil({ host: '127.0.0.1', port: 0, maxPayloadBytes: 512 });
  try {
    const rHtml = await fetch(`${srv.url}/`);
    assert.equal(rHtml.status, 200);
    assert.ok(rHtml.headers.get('content-security-policy')?.includes("default-src 'none'"));
    assert.equal(rHtml.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(rHtml.headers.get('x-frame-options'), 'DENY');
    const txtHtml = await rHtml.text();
    assert.ok(txtHtml.includes('biofoil-canvas'));

    const rJs = await fetch(`${srv.url}/cliente.js`);
    assert.equal(rJs.status, 200);
    assert.ok(rJs.headers.get('content-type')?.includes('application/javascript'));
    const txtJs = await rJs.text();
    assert.ok(txtJs.includes('imageSmoothingEnabled = false'));

    const rPngAtlas = await fetch(`${srv.url}/atlas-hibits.png`);
    assert.equal(rPngAtlas.status, 200);
    assert.equal(rPngAtlas.headers.get('content-type'), 'image/png');
    const bufPngHttp = Buffer.from(await rPngAtlas.arrayBuffer());
    assert.equal(bufPngHttp.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');

    const rPngCena = await fetch(`${srv.url}/cena-atual.png`);
    assert.equal(rPngCena.status, 200);
    assert.equal(rPngCena.headers.get('content-type'), 'image/png');
    const bufCenaHttp = Buffer.from(await rPngCena.arrayBuffer());
    assert.equal(bufCenaHttp.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');

    const rEstado = await fetch(`${srv.url}/api/estado`);
    assert.equal(rEstado.status, 200);
    const jsonEstado = await rEstado.json();
    assert.equal(jsonEstado.viewModel.resolucaoNativa.largura, 960);
    assert.ok(Array.isArray(jsonEstado.frameCanvas.comandosDesenho));

    // Métodos HTTP não permitidos devem retornar 405 com cabeçalho Allow
    const r405Get = await fetch(`${srv.url}/api/estado`, { method: 'POST' });
    assert.equal(r405Get.status, 405);
    assert.equal(r405Get.headers.get('allow'), 'GET');

    const r405Post = await fetch(`${srv.url}/api/comando`, { method: 'GET' });
    assert.equal(r405Post.status, 405);
    assert.equal(r405Post.headers.get('allow'), 'POST');

    // Content-Type inválido deve retornar 415
    const r415 = await fetch(`${srv.url}/api/comando`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: '{}',
    });
    assert.equal(r415.status, 415);

    // Cross-Origin (Origin malicioso ou Sec-Fetch-Site: cross-site) deve retornar 403
    const r403Origin = await fetch(`${srv.url}/api/estado`, {
      headers: { Origin: 'http://evil.attacker.com' },
    });
    assert.equal(r403Origin.status, 403);

    const r403FetchSite = await fetch(`${srv.url}/api/estado`, {
      headers: { 'Sec-Fetch-Site': 'cross-site' },
    });
    assert.equal(r403FetchSite.status, 403);

    // Prototype Pollution (literal, escapado em Unicode ou aninhado > 12 níveis) e objetos JSON inválidos devem retornar 400
    const rProto = await fetch(`${srv.url}/api/comando`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"__proto__":{"polluted":true}}',
    });
    assert.equal(rProto.status, 400);

    const rProtoUnicode = await fetch(`${srv.url}/api/comando`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"\\u005f\\u005fproto\\u005f\\u005f":{"polluted":true}}',
    });
    assert.equal(rProtoUnicode.status, 400);

    let profundo = { fim: 1 };
    for (let i = 0; i < 14; i += 1) profundo = { n: profundo };
    const rProfundo = await fetch(`${srv.url}/api/comando`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profundo),
    });
    assert.equal(rProfundo.status, 400);

    const rBodyNull = await fetch(`${srv.url}/api/comando`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'null',
    });
    assert.equal(rBodyNull.status, 400);

    const rSemComando = await fetch(`${srv.url}/api/comando`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(rSemComando.status, 400);

    const rCmdDesconhecido = await fetch(`${srv.url}/api/comando`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comando: { tipo: 'COMANDO_INEXISTENTE' } }),
    });
    assert.equal(rCmdDesconhecido.status, 400);

    const rDtInvalido = await fetch(`${srv.url}/api/tick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dtSeg: 'invalido' }),
    });
    assert.equal(rDtInvalido.status, 400);

    // Round-trip de contextoUi via POST /api/comando (Space, Digit2 e clique em TRIPULANTE_CARD)
    const rSpace = await fetch(`${srv.url}/api/comando`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventoInput: { tipoEvento: 'KEYDOWN', code: 'Space' }, contextoUi: { pausaTaticaAtiva: false, slotArmaSelecionado: 0, tripulanteSelecionadoId: 'trip-polvo-1' } }),
    });
    const jsonSpace = await rSpace.json();
    assert.equal(jsonSpace.contextoUi.pausaTaticaAtiva, true);

    const rDigit2 = await fetch(`${srv.url}/api/comando`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventoInput: { tipoEvento: 'KEYDOWN', code: 'Digit2' } }),
    });
    const jsonDigit2 = await rDigit2.json();
    assert.equal(jsonDigit2.contextoUi.slotArmaSelecionado, 1);

    const hbCardArraia = hitboxes.find((h) => h.idHitbox === 'TRIPULANTE_CARD_trip-arraia-1');
    const rCard = await fetch(`${srv.url}/api/comando`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventoInput: {
          tipoEvento: 'CLICK',
          clientX: hbCardArraia.x + 2,
          clientY: hbCardArraia.y + 2,
          retanguloCanvas: { left: 0, top: 0, width: 960, height: 540 },
        },
      }),
    });
    const jsonCard = await rCard.json();
    assert.equal(jsonCard.contextoUi.tripulanteSelecionadoId, 'trip-arraia-1');

    const rCmdDireto = await fetch(`${srv.url}/api/comando`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comando: { tipo: 'MERGULHO_TATICO', payload: { recolherFoil: true } } }),
    });
    assert.equal(rCmdDireto.status, 200);
    const jsonCmdDireto = await rCmdDireto.json();
    assert.equal(jsonCmdDireto.viewModel.barraSuperior.estadoFisico, '2_TOUCHDOWN');
    assert.equal(jsonCmdDireto.planoAudio.filtroSubaquaticoMaster.frequenciaCorteHz, 400);

    const rCmdInput = await fetch(`${srv.url}/api/comando`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventoInput: { tipoEvento: 'KEYDOWN', code: 'KeyV' } }),
    });
    assert.equal(rCmdInput.status, 200);
    const jsonCmdInput = await rCmdInput.json();
    assert.equal(jsonCmdInput.aceito, false);
    assert.equal(jsonCmdInput.marcadorRejeicao, 'BLOQUEADO_TRAVA_HIDROSTATICA');

    const rTick = await fetch(`${srv.url}/api/tick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dtSeg: 0.25, pausaTaticaAtiva: false }),
    });
    assert.equal(rTick.status, 200);

    const rJsonRuim = await fetch(`${srv.url}/api/comando`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalido',
    });
    assert.equal(rJsonRuim.status, 400);

    const r413 = await fetch(`${srv.url}/api/comando`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lixo: 'A'.repeat(1024) }),
    });
    assert.equal(r413.status, 413);

    const r404 = await fetch(`${srv.url}/rota-inexistente`);
    assert.equal(r404.status, 404);

    // DNS Rebinding com Host malicioso deve retornar 403
    const codigoRebinding = await new Promise((resolve, reject) => {
      import('node:http').then(({ default: httpMod }) => {
        const reqReb = httpMod.request(
          { host: '127.0.0.1', port: srv.port, path: '/api/estado', method: 'GET', headers: { Host: 'attacker.evil.com' } },
          (resReb) => resolve(resReb.statusCode)
        );
        reqReb.on('error', reject);
        reqReb.end();
      });
    });
    assert.equal(codigoRebinding, 403);
  } finally {
    await srv.fechar();
  }
});

test('[PORTÃO 08.5 | Animação 4-Frames + Encaixes Câmara/Dorso + Cobertura 100% Exports | L2 + L3 + L4 + N4 + MUT-O6-07..09] Todos os 23 itens x 4 frames (= 92 quadros), encaixe 1/2 slots nas 8 câmaras, recuo dorsal -4px e 100% dos símbolos exportados', async () => {
  // 1. Imutabilidade L2 e Contadores Explícitos N4 do Atlas de Animação 4-Frames (23 itens x 4 frames = 92 quadros)
  assert.equal(Object.isFrozen(GEOMETRIA_ENCAIXE_CAMARAS_960), true);
  assert.equal(Object.isFrozen(ATLAS_ANIMACAO_4FRAMES_BIOFOIL), true);

  const chavesAnimadas = Object.keys(ATLAS_ANIMACAO_4FRAMES_BIOFOIL);
  assert.equal(chavesAnimadas.length, 23, '[N4] Examinados: 23 itens animados no Atlas 4-Frames (7 personagens + 7 armas + 6 órgãos + 3 sistemas)');

  let totalQuadrosContados = 0;
  for (const idItem of chavesAnimadas) {
    const entrada = ATLAS_ANIMACAO_4FRAMES_BIOFOIL[idItem];
    assert.equal(Object.isFrozen(entrada), true);
    assert.equal(entrada.totalFrames, 4, `[MUT-O6-09] Todo item animado (${idItem}) deve possuir exatamente 4 quadros (F0..F3)`);
    assert.equal(entrada.quadros.length, 4);
    for (let f = 0; f < 4; f += 1) {
      const q = obterQuadroAnimacaoEntidade(idItem, f);
      assert.equal(q.ok, true);
      assert.equal(q.indiceQuadro, f);
      assert.equal(Array.isArray(q.matrizPixels) && q.matrizPixels.length >= 3, true);
      totalQuadrosContados += 1;
    }
    // Ciclo módulo 4 (quadro 4 === quadro 0)
    const qCiclo = obterQuadroAnimacaoEntidade(idItem, 4);
    assert.equal(qCiclo.ok, true);
    assert.equal(qCiclo.indiceQuadro, 0);
    assert.equal(qCiclo.codigoFrame, entrada.quadros[0].codigoFrame);
  }
  assert.equal(totalQuadrosContados, 92, '[N4] Examinados: 92 quadros de animação hi-bit (23 itens x 4 frames)');
  console.log(
    `[N4] Animação e Encaixe examinados: ${chavesAnimadas.length} itens animados, ${totalQuadrosContados} quadros (F0..F3), 8 câmaras, 2 slots dorsais`
  );

  // 2. Canal explícito de erro L3 em obterQuadroAnimacaoEntidade
  const errInexistente = obterQuadroAnimacaoEntidade('ENTIDADE_FANTASMA', 0);
  assert.equal(errInexistente.ok, false);
  assert.equal(errInexistente.codigoErro, 'ENTIDADE_ANIMACAO_INEXISTENTE');

  const errQuadroNeg = obterQuadroAnimacaoEntidade('POLVO', -1);
  assert.equal(errQuadroNeg.ok, false);
  assert.equal(errQuadroNeg.codigoErro, 'INDICE_QUADRO_INVALIDO');

  // 3. Teste Cirúrgico de Encaixe nas 8 Câmaras (Vazia, 1 Slot 44x28 e 2 Slots 36x26 + Andar 4 22px)
  const idsCamaras = [1, 7, 2, 3, 4, 5, 6, 8];
  assert.equal(Object.keys(GEOMETRIA_ENCAIXE_CAMARAS_960.CAMARAS).length, 8, '[N4] Examinadas: 8 câmaras na geometria 960x540');

  for (const cid of idsCamaras) {
    const encVazia = calcularEncaixeCamaraBioNave(cid, [], 0);
    assert.equal(encVazia.ok, true);
    assert.equal(encVazia.modoEncaixe, 'VAZIA');
    assert.equal(encVazia.limpaBulboEstaticoFundo, false);

    const enc1Slot = calcularEncaixeCamaraBioNave(cid, ['POLVO'], 2);
    assert.equal(enc1Slot.ok, true, `[MUT-O6-07] Câmara ${cid} deve encaixar 1 slot sem colisão`);
    assert.equal(enc1Slot.modoEncaixe, 'SLOT_UNICO');
    assert.equal(enc1Slot.limpaBulboEstaticoFundo, true);
    assert.equal(enc1Slot.slots[0].larguraPx, 44, '[MUT-O6-07] Slot único na câmara 76px deve ter largura canônica 44px');
    assert.equal(
      enc1Slot.slots[0].alturaPx,
      cid === 6 || cid === 8 ? 22 : 28,
      '[MUT-O6-09] Altura do slot único deve ser 28px nos andares 1..3 e 22px no andar 4'
    );
    assert.equal(enc1Slot.zeroColisaoRotulo, true);
    assert.equal(enc1Slot.zeroColisaoParedes, true);
    assert.equal(enc1Slot.zeroColisaoValvulaCentral, true);

    const enc2Slots = calcularEncaixeCamaraBioNave(cid, ['CARANGUEJO', 'MARINHEIRO'], 3);
    assert.equal(enc2Slots.ok, true, `[MUT-O6-07] Câmara ${cid} deve encaixar 2 slots (36x26px) sem colisão`);
    assert.equal(enc2Slots.modoEncaixe, 'SLOT_DUPLO');
    assert.equal(enc2Slots.slots[0].larguraPx, 36, '[MUT-O6-07] Slot duplo na câmara 76px deve ter largura canônica 36px');
    assert.equal(enc2Slots.slots[1].larguraPx, 36);
    assert.equal(
      enc2Slots.slots[0].alturaPx,
      cid === 6 || cid === 8 ? 22 : 26,
      '[MUT-O6-09] Altura do slot duplo deve ser 26px nos andares 1..3 e 22px no andar 4'
    );
    assert.equal(enc2Slots.zeroColisaoEntreSlots, true);
    assert.equal(enc2Slots.zeroColisaoValvulaCentral, true);
  }

  // Rejeições explícitas L3 em calcularEncaixeCamaraBioNave
  assert.equal(calcularEncaixeCamaraBioNave(99, ['POLVO'], 0).codigoErro, 'CAMARA_ID_INVALIDO');
  assert.equal(calcularEncaixeCamaraBioNave(1, ['POLVO', 'ARRAIA', 'BAIACU'], 0).codigoErro, 'LOTACAO_SLOTS_CAMARA_INVALIDA');
  assert.equal(calcularEncaixeCamaraBioNave(1, ['POLVO'], -3).codigoErro, 'INDICE_QUADRO_INVALIDO');
  assert.equal(calcularEncaixeCamaraBioNave(1, ['INEXISTENTE'], 0).codigoErro, 'ENTIDADE_ANIMACAO_INEXISTENTE');

  // 4. Teste Cirúrgico de Encaixe e Animação nas 7 Armas Dorsais (F0..F3 + Recuo -4px no Disparo)
  const armasEsperadas = [
    ['EMISSOR_ACUSTICO_I', 1, 10],
    ['EMISSOR_RAJADA_II', 1, 18],
    ['CANHAO_ARPAO_CABO', 2, 15],
    ['DISPERSOR_ESTILHACOS', 1, 22],
    ['CORTADOR_TERMICO', 1, 25],
    ['LANCADOR_TORPEDO_ABISSAL', 2, 28],
    ['MORTEIRO_ESPOROS', 2, 12],
  ];
  for (const [armaId, soquetesEsp, pesoEsp] of armasEsperadas) {
    assert.equal(ATLAS_ANIMACAO_4FRAMES_BIOFOIL[armaId].pesoKg, pesoEsp);
    assert.equal(ATLAS_ANIMACAO_4FRAMES_BIOFOIL[armaId].soquetes, soquetesEsp);

    const f0 = calcularEncaixeDorsalArma(0, armaId, 0, false);
    assert.equal(f0.ok, true);
    assert.equal(f0.codigoFrame, 'F0_IDLE_0');
    assert.equal(f0.deslocamentoRecuoX, 0);
    assert.equal(f0.x, 392);

    const f1 = calcularEncaixeDorsalArma(0, armaId, 0.5, false);
    assert.equal(f1.codigoFrame, 'F1_CARGA_50');

    const f2 = calcularEncaixeDorsalArma(1, armaId, 1.0, false);
    assert.equal(f2.codigoFrame, 'F2_PRONTA_100');
    assert.equal(f2.x, 438);

    const f3 = calcularEncaixeDorsalArma(1, armaId, 1.0, true);
    assert.equal(f3.ok, true, `[MUT-O6-08] Disparo da arma ${armaId} deve aplicar recuo canônico de -4px e manter zero colisão`);
    assert.equal(f3.codigoFrame, 'F3_DISPARO_RECUO');
    assert.equal(f3.deslocamentoRecuoX, -4, '[MUT-O6-08] Recuo horizontal no disparo (F3) deve ser exatamente -4px');
    assert.equal(f3.x, 434);
    assert.equal(f3.zeroColisaoTopoCamaras, true);
  }

  assert.equal(calcularEncaixeDorsalArma(5, 'EMISSOR_ACUSTICO_I', 0, false).codigoErro, 'SLOT_DORSAL_INVALIDO');
  assert.equal(calcularEncaixeDorsalArma(0, 'POLVO', 0, false).codigoErro, 'ARMA_DORSAL_INEXISTENTE');
  assert.equal(calcularEncaixeDorsalArma(0, 'EMISSOR_ACUSTICO_I', 1.5, false).codigoErro, 'PROGRESSO_CARGA_INVALIDO');

  // 5. Renderizador de Quadro Animado Completo e Endpoint HTTP /quadro-animado-f1.png
  const estadoCombate = congelarProfundo({
    ...criarEstadoInicialPartida('seed-anim-01', 'CARCACA_ALFA'),
    alvoCombate: criarAlvoSetor1Canonico('BARCO_HUMANO'),
  });
  const quadro38 = renderizarQuadroAnimadoCenaBiofoil(estadoCombate, { quadroTick: 38, escalaInteira: 1 });
  assert.equal(quadro38.ok, true);
  assert.equal(quadro38.cicloSpriteF4, 2);
  assert.equal(quadro38.larguraPx, 960);
  assert.equal(quadro38.alturaPx, 540);
  assert.equal(quadro38.encaixesCamaras.length, 8);
  assert.equal(quadro38.encaixesDorsais[0].codigoFrame, 'F3_DISPARO_RECUO');
  assert.equal(quadro38.pngBuffer.subarray(0, 4).toString('hex'), '89504e47');

  const srvAnim = await iniciarServidorClienteWebBiofoil({ host: '127.0.0.1', port: 0, estadoInicial: estadoCombate });
  try {
    const rOk = await fetch(`${srvAnim.url}/quadro-animado-f1.png?frame=38`);
    assert.equal(rOk.status, 200);
    assert.equal(rOk.headers.get('content-type'), 'image/png');
    const buf = Buffer.from(await rOk.arrayBuffer());
    assert.equal(buf.subarray(0, 4).toString('hex'), '89504e47');

    const rInv = await fetch(`${srvAnim.url}/quadro-animado-f1.png?frame=invalido`);
    assert.equal(rInv.status, 400);
  } finally {
    await srvAnim.fechar();
  }

  // 6. Validação direta L4 de 100% das constantes canônicas exportadas pelos módulos do repositório (Regra #7)
  assert.equal(SISTEMAS_BARRA_INFERIOR_CANONICOS.length, 8);
  assert.equal(CADEIA_CANONICA_GDD.length, 10);
  assert.equal(CADEIA_CANONICA_TESTES.length, 10);
  assert.equal(CADEIA_CANONICA_SCRIPTS.length >= 2, true);
  assert.equal(CADEIA_CANONICA_PROTOCOLO.length >= 2, true);
  assert.equal(CADEIA_CANONICA_RAIZ_OUTROS.includes('package.json'), true);
  assert.equal(CADEIA_CANONICA_DIRS_RAIZ.includes('src'), true);
  assert.equal(Array.isArray(CADEIA_CANONICA_WORKFLOWS), true);
  assert.equal(CATALOGO_ARMAS_BASE_PESO.CANHAO_ARPAO_CABO.pesoBaseKg, 15);
  assert.equal(HP_MAX_POR_ESPECIE.POLVO, 80);
  assert.equal(Object.keys(ARQUITETURAS_INICIAIS).length, 5);
  assert.equal(FNV1A_32_OFFSET_BASIS, 0x811c9dc5);
  assert.equal(FNV1A_32_PRIME, 0x01000193);
  assert.equal(Object.keys(DOMINIOS_STREAM_PRNG).length, 6);
  assert.equal(CONSTANTES_SISTEMAS_ARMAS.REDUCAO_RECARGA_TOUCHDOWN, 0.25);
  assert.equal(CONSTANTES_TRIPULACAO.TEMPO_NADO_SALA_BASE_SEG, 1.5);
  assert.equal(Object.keys(CURVA_SAQUE_SETORIAL_56C).length, 8);
  assert.equal(CONSTANTES_IA_INIMIGOS.TAXA_INVASAO_ROMBO_SUBMERSO_KG_S, 5.0);
  assert.equal(VELOCIDADE_FRENTE_CORPORATIVA_MN_H, 6);
  assert.equal(LARGURA_SETOR_MN, 120);
  assert.equal(ALTURA_SETOR_MN, 60);
  assert.equal(DISTANCIA_MIN_NOS_MN, 14);
  assert.equal(DISTANCIA_MAX_ROTA_MN, 28);
  assert.equal(FOLGA_PRAZO_SOS_HORAS, 1.5);
  assert.equal(VELOCIDADE_PADRAO_ALFA_MN_H, 11);
  assert.equal(MULTIPLICADORES_CORRENTE.FAVORAVEL, 0.75);
  assert.equal(VELOCIDADE_BASE_MAPA_MN_H, 9.5);
  assert.equal(TETO_VELOCIDADE_CRUZEiro_MN_H, 15);
  assert.equal(VELOCIDADE_ARRASTO_SOBREPESO_MN_H, 4.75);
  assert.equal(MULTIPLICADOR_TEMPO_DERIVA, 2);
  assert.equal(SPOOL_UP_FRIO_POS_DERIVA_SEG, 5.0);
  assert.equal(ISOLAMENTO_RESIDUAL_POS_CHOQUE_SEG, 5.0);
  assert.equal(DURACAO_CHOQUE_ELETRO_PLACA_SEG, 6.0);
  assert.equal(PESO_ORGAO_ENXERTADO_KG, 5);
  assert.equal(MAX_TRIPULANTES_NAVE, 6);
  assert.equal(DURACAO_FERVURA_OCEANICA_SEG, 5.0);
  assert.equal(INTERVALO_AUTO_REPARO_IA_BACKUP_SEG, 15.0);
  assert.equal(MCP_SERVER_INFO.name, 'agent-testing-mcp-server');
  assert.equal(LIMITE_CARACTERES_RESPOSTA, 25000);
});

function decodificarPngRgbaParaTeste(pngBuf) {
  assert.equal(pngBuf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  let offset = 8;
  let largura = 0;
  let altura = 0;
  const idats = [];
  while (offset < pngBuf.length) {
    const len = pngBuf.readUInt32BE(offset);
    const tipo = pngBuf.subarray(offset + 4, offset + 8).toString('ascii');
    const dados = pngBuf.subarray(offset + 8, offset + 8 + len);
    if (tipo === 'IHDR') {
      largura = dados.readUInt32BE(0);
      altura = dados.readUInt32BE(4);
    } else if (tipo === 'IDAT') {
      idats.push(dados);
    } else if (tipo === 'IEND') {
      break;
    }
    offset += 12 + len;
  }
  const descompactado = zlib.inflateSync(Buffer.concat(idats));
  const rgba = Buffer.alloc(largura * altura * 4);
  const stride = largura * 4;
  for (let y = 0; y < altura; y += 1) {
    const srcRow = y * (stride + 1);
    const filtro = descompactado[srcRow];
    for (let i = 0; i < stride; i += 1) {
      const rawByte = descompactado[srcRow + 1 + i];
      const esq = i >= 4 ? rgba[y * stride + i - 4] : 0;
      const cima = y > 0 ? rgba[(y - 1) * stride + i] : 0;
      const supEsq = y > 0 && i >= 4 ? rgba[(y - 1) * stride + i - 4] : 0;
      let val = rawByte;
      if (filtro === 1) val = (rawByte + esq) & 0xff;
      else if (filtro === 2) val = (rawByte + cima) & 0xff;
      else if (filtro === 3) val = (rawByte + ((esq + cima) >> 1)) & 0xff;
      else if (filtro === 4) {
        const p = esq + cima - supEsq;
        const pa = Math.abs(p - esq);
        const pb = Math.abs(p - cima);
        const pc = Math.abs(p - supEsq);
        const pr = pa <= pb && pa <= pc ? esq : pb <= pc ? cima : supEsq;
        val = (rawByte + pr) & 0xff;
      }
      rgba[y * stride + i] = val;
    }
  }
  return { largura, altura, rgba };
}

test('[PORTÃO 08.6 | Auditoria Visual Pixel-a-Pixel + Hitboxes 0 Colisão + Combate Vivo | L1 + L2 + L4 + N4 + MUT-O6-10..12] Zero sobreposição em 7 layouts, barra 24/24 da Draga contida em X<=956, 5 carcaças distintas, 23 sprites reais >=8 linhas e combate em tempo real com fogo inimigo e cliques 1080p', () => {
  // 1. Auditoria geométrica 960x540 (0 fora da tela e 0 colisão AABB par-a-par) nos 7 cenários visuais + MUT-O6-10
  const estFoilBarco = congelarProfundo({
    ...criarEstadoInicialPartida('seed-p086-f1', 'CARCACA_ALFA'),
    alvoCombate: criarAlvoSetor1Canonico('BARCO_HUMANO'),
  });
  const estTdBarco = despacharComandoUi(estFoilBarco, {
    tipo: 'MERGULHO_TATICO',
    payload: { recolherFoil: true },
  }).estado;
  const estFoilMonstro = congelarProfundo({
    ...criarEstadoInicialPartida('seed-p086-f3', 'CARCACA_ALFA'),
    alvoCombate: criarAlvoSetor1Canonico('MONSTRO_MARINHO'),
  });
  const estTdMonstro = despacharComandoUi(estFoilMonstro, {
    tipo: 'MERGULHO_TATICO',
    payload: { recolherFoil: true },
  }).estado;
  const estDragaF3 = congelarProfundo({
    ...criarEstadoInicialPartida('seed-p086-draga', 'COURACA_LIMIAR'),
    alvoCombate: criarEstadoChefeDraga(3),
  });
  const estEstresse6Trip = congelarProfundo({
    ...estFoilBarco,
    naveJogador: {
      ...estFoilBarco.naveJogador,
      reator: { barrasTotais: 18, barrasDisponiveis: 6 },
      tripulacao: [
        ...estFoilBarco.naveJogador.tripulacao,
        { id: 'trip-crab-4', especie: 'CARANGUEJO', nome: 'Garra-4', hpAtual: 110, hpMax: 110, camaraAtualId: 1, localizacao: 'NAVE_JOGADOR', vivo: true, inflado: false },
        { id: 'trip-ray-5', especie: 'ARRAIA', nome: 'Volt-5', hpAtual: 70, hpMax: 70, camaraAtualId: 3, localizacao: 'NAVE_JOGADOR', vivo: true, inflado: false },
        { id: 'trip-oct-6', especie: 'POLVO', nome: 'Sonda-6', hpAtual: 80, hpMax: 80, camaraAtualId: 7, localizacao: 'NAVE_JOGADOR', vivo: true, inflado: false },
      ],
    },
  });
  const mapaSetor1 = gerarMapaSetorial('seed-p086-mapa', 1);
  const idEntradaMapa = mapaSetor1.nos.find((n) => n.tipoNo === 'ENTRADA')?.id ?? mapaSetor1.nos[0].id;
  const estMapa = congelarProfundo({
    ...criarEstadoInicialPartida('seed-p086-mapa', 'MANTA_VOLT'),
    meta: { tickAtual: 0, tempoCombateSeg: 0, faseJogo: 'MAPA', setorAtual: 1, seedPartida: 'seed-p086-mapa' },
    mapaSetorial: { ...mapaSetor1, setorNumero: 1, noAtualId: idEntradaMapa, frenteCorporativaX: -18 },
  });

  const cenarios7 = [
    ['F1_FOIL_BARCO', estFoilBarco],
    ['F2_TOUCHDOWN_BARCO', estTdBarco],
    ['F3_FOIL_MONSTRO', estFoilMonstro],
    ['F3_TOUCHDOWN_MONSTRO', estTdMonstro],
    ['ESTRESSE_6_TRIP_18_REATOR', estEstresse6Trip],
    ['DRAGA_FASE_3', estDragaF3],
    ['MAPA_SETORIAL', estMapa],
  ];

  let totalHitboxesAuditadas = 0;
  for (const [nomeCenario, estadoCen] of cenarios7) {
    const vm = projetarViewModelWireframe(estadoCen);
    const hbs = obterMapaHitboxesNativo(vm);
    assert.equal(Object.isFrozen(hbs), true);
    totalHitboxesAuditadas += hbs.length;

    let foraLimites = 0;
    let colisoes = 0;
    for (let i = 0; i < hbs.length; i += 1) {
      const a = hbs[i];
      if (a.x < 0 || a.y < 0 || a.x + a.largura > 960 || a.y + a.altura > 540) {
        foraLimites += 1;
      }
      for (let j = i + 1; j < hbs.length; j += 1) {
        const b = hbs[j];
        const interX = a.x < b.x + b.largura && a.x + a.largura > b.x;
        const interY = a.y < b.y + b.altura && a.y + a.altura > b.y;
        if (interX && interY) {
          colisoes += 1;
        }
      }
    }
    assert.equal(
      foraLimites,
      0,
      `[MUT-O6-10] Cenário ${nomeCenario} não pode ter nenhuma hitbox fora da grade nativa 960x540`
    );
    assert.equal(colisoes, 0, `Cenário ${nomeCenario} não pode ter sobreposição entre quadrados de ação`);
  }

  // Coordenadas exatas L4 cravadas nas placas de arte Hi-Bit (F1 / F2 / F3) e divisória de linha d'água do barco
  const hbsF1 = obterMapaHitboxesNativo(projetarViewModelWireframe(estFoilBarco));
  const hbsF2 = obterMapaHitboxesNativo(projetarViewModelWireframe(estTdBarco));
  const hbsF3 = obterMapaHitboxesNativo(projetarViewModelWireframe(estFoilMonstro));
  assert.equal(
    hbsF1.find((h) => h.idHitbox === 'CAMARA_1').x,
    364,
    '[MUT-O6-10] CAMARA_1 na placa F1 deve iniciar exatamente em X=364 (sem desvio de hitbox)'
  );
  assert.equal(hbsF1.find((h) => h.idHitbox === 'CAMARA_7').x, 462);
  assert.equal(hbsF2.find((h) => h.idHitbox === 'CAMARA_1').x, 338);
  assert.equal(hbsF2.find((h) => h.idHitbox === 'CAMARA_7').x, 438);
  assert.equal(hbsF3.find((h) => h.idHitbox === 'CAMARA_1').x, 378);
  assert.equal(hbsF3.find((h) => h.idHitbox === 'SALA_ALVO_1').y, 220);
  assert.equal(hbsF3.find((h) => h.idHitbox === 'SALA_ALVO_4').y, 384);
  const hbBarcoSup = hbsF1.find((h) => h.idHitbox === 'SALA_ALVO_1');
  const hbBarcoSub = hbsF1.find((h) => h.idHitbox === 'SALA_ALVO_3');
  assert.equal(hbBarcoSup.y + hbBarcoSup.altura <= 356, true, 'Salas aéreas do barco ficam 100% acima da linha d’água Y=356');
  assert.equal(hbBarcoSub.y >= 360, true, 'Salas submersas do barco ficam 100% abaixo da linha d’água Y=356');
  assert.equal(obterMapaHitboxesNativo(null).length, 0);

  // 2. Decodificação real de pixels PNG: contenção da barra 24/24 da Draga (MUT-O6-12), 5 carcaças únicas e Baiacu inflado
  const pngDraga = renderizarCenaCanvasParaPngBuffer(projetarViewModelWireframe(estDragaF3), { escalaInteira: 1 });
  const imgDraga = decodificarPngRgbaParaTeste(pngDraga);
  assert.equal(imgDraga.largura, 960);
  assert.equal(imgDraga.altura, 540);
  let pixelsBarraVazandoBorda956 = 0;
  for (let py = 64; py <= 71; py += 1) {
    for (let px = 957; px <= 959; px += 1) {
      const idx = (py * imgDraga.largura + px) * 4;
      if (imgDraga.rgba[idx] === 255 && imgDraga.rgba[idx + 1] === 42 && imgDraga.rgba[idx + 2] === 56) {
        pixelsBarraVazandoBorda956 += 1;
      }
    }
  }
  assert.equal(
    pixelsBarraVazandoBorda956,
    0,
    '[MUT-O6-12] A barra de 24/24 HP da CHEFE_DRAGA jamais pode vazar para fora da moldura X=956'
  );

  // As 5 bio-naves jogáveis produzem 5 silhuetas PNG distintas em combate
  const hashesCarcacas = new Set();
  for (const idCarcaca of ['CARCACA_ALFA', 'MANTA_VOLT', 'COURACA_LIMIAR', 'SOMBRA_ABISSAL', 'COLMEIA_VIVA']) {
    const estHull = congelarProfundo({
      ...criarEstadoInicialPartida('seed-hull-png', idCarcaca),
      alvoCombate: criarAlvoSetor1Canonico('BARCO_HUMANO'),
    });
    const bufHull = renderizarCenaCanvasParaPngBuffer(projetarViewModelWireframe(estHull), { escalaInteira: 1 });
    hashesCarcacas.add(crypto.createHash('sha1').update(bufHull).digest('hex'));
  }
  assert.equal(hashesCarcacas.size, 5, '[N4] Examinadas: 5 silhuetas orgânicas distintas das 5 bio-naves no PNG de combate');

  // Todas as 23 entidades do Atlas 4-Frames possuem matriz artesanal real >= 7 linhas (zero fallback placeholder 3x5)
  let entidadesSemFallback = 0;
  for (const idEnt of Object.keys(ATLAS_ANIMACAO_4FRAMES_BIOFOIL)) {
    const linhasMatriz = ATLAS_ANIMACAO_4FRAMES_BIOFOIL[idEnt].quadros[0].matrizPixels.length;
    assert.equal(linhasMatriz >= 7, true, `Entidade animada ${idEnt} não pode cair em fallback placeholder 3x5`);
    entidadesSemFallback += 1;
  }
  assert.equal(entidadesSemFallback, 23);

  // 3. Cliques humanos 1920x1080 (botão direito W3C button=2 no Baiacu + viagem em NO_MAPA_*) e mudança real de pixels na câmara 5
  const hbCardBaiacu = hbsF1.find((h) => h.idHitbox === 'TRIPULANTE_CARD_trip-baiacu-1');
  const tradInflar = traduzirInputDomParaComandoUi(
    {
      tipoEvento: 'CLICK',
      clientX: (hbCardBaiacu.x + 12) * 2,
      clientY: (hbCardBaiacu.y + 20) * 2,
      button: 2,
      retanguloCanvas: { left: 0, top: 0, width: 1920, height: 1080 },
    },
    estFoilBarco,
    projetarViewModelWireframe(estFoilBarco),
    {}
  );
  assert.equal(tradInflar.resultadoMotor?.aceito, true);
  assert.equal(
    tradInflar.resultadoMotor.estado.naveJogador.tripulacao.find((t) => t.id === 'trip-baiacu-1').inflado,
    true
  );
  const pngAntesInflar = renderizarCenaCanvasParaPngBuffer(projetarViewModelWireframe(estFoilBarco), { escalaInteira: 1 });
  const pngDepoisInflar = renderizarCenaCanvasParaPngBuffer(
    projetarViewModelWireframe(tradInflar.resultadoMotor.estado),
    { escalaInteira: 1 }
  );
  assert.notEqual(
    crypto.createHash('sha1').update(pngAntesInflar).digest('hex'),
    crypto.createHash('sha1').update(pngDepoisInflar).digest('hex'),
    'Inflar o Baiacu em 1_NO_FOIL deve atualizar visualmente o sprite dentro da câmara 5 no PNG'
  );

  const vmMapa = projetarViewModelWireframe(estMapa);
  const hbsMapa = obterMapaHitboxesNativo(vmMapa);
  const noEntrada = vmMapa.mapaSetorialResumo.nos.find((n) => n.id === idEntradaMapa);
  const idNoConectado = noEntrada.rotasSaida[0];
  const hbNoConectado = hbsMapa.find((h) => h.idHitbox === `NO_MAPA_${idNoConectado}`);
  const tradViagem = traduzirInputDomParaComandoUi(
    {
      tipoEvento: 'CLICK',
      clientX: (hbNoConectado.x + 10) * 2,
      clientY: (hbNoConectado.y + 10) * 2,
      button: 0,
      retanguloCanvas: { left: 0, top: 0, width: 1920, height: 1080 },
    },
    estMapa,
    vmMapa,
    {}
  );
  assert.equal(tradViagem.resultadoMotor?.aceito, true);
  assert.equal(tradViagem.resultadoMotor.estado.mapaSetorial.noAtualId, idNoConectado);

  // 4. Combate em tempo real (`avancarTickPartidaEmTempoReal`): Lei L2, armas do jogador, ablação de Blindagem Térmica e fogo inimigo (MUT-O6-11)
  assert.throws(
    () => avancarTickPartidaEmTempoReal({ naoCongelado: true }, 0.25),
    /Lei L2/,
    'avancarTickPartidaEmTempoReal deve exigir estado congelado (Object.freeze)'
  );
  assert.equal(avancarTickPartidaEmTempoReal(estMapa, 0.25), estMapa);

  // Duelo em Touchdown (esquiva 0%): jogador fere casco inimigo com Arpão + Emissor Acústico I E inimigo fere a bio-nave!
  let estDuelo = despacharComandoUi(estTdBarco, {
    tipo: 'MIRAR_ARMA',
    payload: { slotIndex: 0, salaAlvoId: 3 },
  }).estado;
  estDuelo = despacharComandoUi(estDuelo, {
    tipo: 'MIRAR_ARMA',
    payload: { slotIndex: 1, salaAlvoId: 3 },
  }).estado;
  const hpAlvoAntes = estDuelo.alvoCombate.hpCascoAtual;
  const defesaJogadorAntes = estDuelo.naveJogador.hpCascoAtual + estDuelo.naveJogador.camadasBarreiraAtivas;
  for (let t = 0; t < 64; t += 1) {
    estDuelo = avancarTickPartidaEmTempoReal(estDuelo, 0.25);
  }
  assert.equal(estDuelo.alvoCombate.hpCascoAtual < hpAlvoAntes, true, 'Armas dorsais do jogador devem causar dano real ao alvo');
  const defesaJogadorDepois = estDuelo.naveJogador.hpCascoAtual + estDuelo.naveJogador.camadasBarreiraAtivas;
  assert.equal(
    defesaJogadorDepois < defesaJogadorAntes,
    true,
    '[MUT-O6-11] O fogo de retorno determinístico do inimigo deve atingir a Barreira/Casco da bio-nave'
  );

  console.log(
    `[N4] Auditoria visual e combate vivo examinados: ${cenarios7.length} cenários de tela, ${totalHitboxesAuditadas} hitboxes com 0 colisão, 5 carcaças PNG e ${entidadesSemFallback} entidades animadas`
  );
});

test('[PORTÃO 08.7 | Motor 60 FPS Paridade 0-Byte + GD-1/GD-2/GD-3 + Microinterações | L1 + L2 + L4 + L6 + N4 + MUT-O6-13..16] Paridade bit-a-bit Servidor<->Cliente nas 7 telas, interpolação sub-tick 60Hz, Reflexo Branquial, Dreno Seguro 62.5kg e Contragolpes Inimigos', async () => {
  // 1. Exportação imutável de texturas Hi-Bit para 60 FPS + endpoint HTTP GET /api/assets-60fps
  const pacote60 = exportarPacoteAssets60Fps();
  assert.equal(Object.isFrozen(pacote60), true);
  assert.equal(pacote60.versao, 'STEAM_60FPS_V4');
  assert.equal(Object.keys(pacote60.bestiario57a).length, 6, '[N4] Examinados: 6 sprites Hi-Bit Bestiário 5.7.A dedicados');
  assert.equal(Object.keys(pacote60.placas).length, 7, '[N4] Examinadas: 7 placas cênicas Hi-Bit base64 (F1, F2, F3, F4, Draga, Evento, Mapa)');
  assert.equal(Object.keys(pacote60.retratos).length, 4, '[N4] Examinados: 4 retratos orgânicos Hi-Bit base64');
  assert.equal(Object.keys(pacote60.iconesHiBit).length, 22, '[N4] Examinados: 22 sprites/ícones Hi-Bit base64 (7 armas + 6 órgãos + 3 invasores + 6 extras)');

  const srv60 = await iniciarServidorClienteWebBiofoil({ porta: 0, seedInicial: 'seed-60fps-http' });
  try {
    const respAssets = await fetch(`${srv60.url}/api/assets-60fps`);
    assert.equal(respAssets.status, 200);
    assert.equal(String(respAssets.headers.get('content-security-policy') ?? '').includes("script-src 'self'"), true);
    assert.equal(respAssets.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(respAssets.headers.get('x-frame-options'), 'DENY');
    const jsonAssets = await respAssets.json();
    assert.equal(jsonAssets.versao, 'STEAM_60FPS_V4');
    assert.equal(typeof jsonAssets.bestiario57a?.BARCO_2_CORVETA, 'string');
    assert.equal(typeof jsonAssets.placas?.f1Play, 'string');
    assert.equal(typeof jsonAssets.placas?.dragaPlay, 'string');
    assert.equal(typeof jsonAssets.placas?.eventoPlay, 'string');
    assert.equal(typeof jsonAssets.placas?.mapaPlay, 'string');
    assert.equal(typeof jsonAssets.iconesHiBit?.CORACAO_BIO_ELETRICO, 'string');
  } finally {
    await srv60.fechar();
  }

  // 2. Paridade 100% Bit-a-Bit (0 bytes diff em 14.515.200 bytes RGBA) entre Servidor e funções embutidas no /cliente.js nas 7 telas!
  const decodificarDataUri = (uri) => {
    const buf = Buffer.from(String(uri).split(',')[1], 'base64');
    const dec = decodificarPngRgbaParaTeste(buf);
    return Object.freeze({ largura: dec.largura, altura: dec.altura, rgba: new Uint8ClampedArray(dec.rgba) });
  };
  const iconesDecodificadosCli = {};
  for (const [kIcone, uriIcone] of Object.entries(pacote60.iconesHiBit)) {
    iconesDecodificadosCli[kIcone] = decodificarDataUri(uriIcone);
  }
  const poses4FDecodificadosCli = {};
  for (const [kPose, arrUrisPose] of Object.entries(pacote60.poses4Frames ?? {})) {
    poses4FDecodificadosCli[kPose] = Object.freeze(arrUrisPose.map((u) => decodificarDataUri(u)));
  }
  const assetsDecodificadosCli = Object.freeze({
    f1Play: decodificarDataUri(pacote60.placas.f1Play),
    f2Play: decodificarDataUri(pacote60.placas.f2Play),
    f3Play: decodificarDataUri(pacote60.placas.f3Play),
    f4Ships: decodificarDataUri(pacote60.placas.f4Ships),
    dragaPlay: decodificarDataUri(pacote60.placas.dragaPlay),
    eventoPlay: decodificarDataUri(pacote60.placas.eventoPlay),
    mapaPlay: decodificarDataUri(pacote60.placas.mapaPlay),
    retratos: Object.freeze({
      POLVO: decodificarDataUri(pacote60.retratos.POLVO),
      ARRAIA: decodificarDataUri(pacote60.retratos.ARRAIA),
      BAIACU: decodificarDataUri(pacote60.retratos.BAIACU),
      CARANGUEJO: decodificarDataUri(pacote60.retratos.CARANGUEJO),
    }),
    poses4Frames: Object.freeze(poses4FDecodificadosCli),
    iconesHiBit: Object.freeze(iconesDecodificadosCli),
  });
  assert.equal(Object.isFrozen(assetsDecodificadosCli.f1Play), true, 'Lei L2: wrappers de placa Hi-Bit permanecem imutáveis via WeakMap');
  assert.equal(Object.isFrozen(assetsDecodificadosCli.f4Ships), true, 'Lei L2: wrapper f4Ships permanece imutável via WeakMap');
  const tabelasCli = Object.freeze({
    glifos8px: pacote60.glifos8px,
    glifos5x7: pacote60.glifos5x7,
    glifos6x7: pacote60.glifos6x7,
    mapaAcentos: pacote60.mapaAcentos,
    mascaraSoquete: pacote60.mascaraSoquete,
    mascaraBolha: pacote60.mascaraBolha,
    mascaraCadeado: pacote60.mascaraCadeado,
    mascaraCoracao: pacote60.mascaraCoracao,
    recortesF4: pacote60.recortesF4,
    nomesCarcacas: pacote60.nomesCarcacas,
    nomesSalasAlvo: pacote60.nomesSalasAlvo,
    nomesArmasHud: pacote60.nomesArmasHud,
    siglasEspecieHud: pacote60.siglasEspecieHud,
    spritesHiBit: pacote60.spritesHiBit,
    spritesInsumosLoja: pacote60.spritesInsumosLoja,
    atlasAnimacao4Frames: pacote60.atlasAnimacao4Frames,
    paletaRgba: pacote60.paletaRgba,
  });
  assert.equal(Object.keys(pacote60.glifos5x7).length >= 38, true);
  assert.equal(Object.keys(pacote60.glifos6x7).length >= 38, true);

  const codigoClienteJs = gerarCodigoJsClienteBiofoil();
  assert.equal(codigoClienteJs.includes('function rasterizarQuadroRgba960x540'), true);
  assert.equal(codigoClienteJs.includes('function interpolarEstadoVisual60Fps'), true);
  assert.equal(codigoClienteJs.includes('ctx.putImageData'), true);
  assert.equal(codigoClienteJs.includes('seqRequisicao'), true);
  assert.equal(codigoClienteJs.includes('new Function'), false, 'CSP estrito: /cliente.js não usa new Function');
  assert.equal(codigoClienteJs.includes('eval('), false, 'CSP estrito: /cliente.js não usa eval');

  // Executa a exata função rasterizarQuadroRgba960x540 (e submódulos puros) extraída de /cliente.js num contexto VM isolado
  const iniFnRaster = codigoClienteJs.indexOf('function criarContextoPrimitivasRgba960x540');
  const fimFnRaster = codigoClienteJs.indexOf('let estadoCliente = JSON.parse');
  assert.equal(iniFnRaster > 0 && fimFnRaster > iniFnRaster, true);
  const fnRasterExtraidaCliente = vm.runInNewContext(
    `(function() {\n"use strict";\n${codigoClienteJs.slice(iniFnRaster, fimFnRaster)}\nreturn rasterizarQuadroRgba960x540;\n})()`,
    { Math, Number, String, Boolean, Array, Object, Set, Map, WeakMap, Uint8Array, Uint8ClampedArray, Int16Array, Int32Array, Float64Array }
  );

  const estF1 = criarEstadoInicialPartida({
    seedPartida: 'paridade-f1',
    idArquitetura: 'CARCACA_ALFA',
    faseJogo: 'COMBATE',
    classeAlvoInicial: 'BARCO_HUMANO',
  });
  const estF2 = despacharComandoUi(estF1, { tipo: 'MERGULHO_TATICO', payload: { recolherFoil: true } }).estado;
  const estF3Base = criarEstadoInicialPartida({
    seedPartida: 'paridade-f3',
    idArquitetura: 'MANTA_VOLT',
    faseJogo: 'COMBATE',
  });
  const estF3 = congelarProfundo({
    ...structuredClone(estF3Base),
    alvoCombate: structuredClone(criarAlvoSetor1Canonico('MONSTRO_MARINHO')),
  });
  const estDragaBase = criarEstadoInicialPartida({
    seedPartida: 'paridade-draga',
    idArquitetura: 'COURACA_LIMIAR',
    faseJogo: 'COMBATE',
    classeAlvoInicial: 'CHEFE_DRAGA',
  });
  const estDraga = congelarProfundo({
    ...structuredClone(estDragaBase),
    alvoCombate: structuredClone(criarEstadoChefeDraga(3)),
  });
  const estMapa7 = criarEstadoInicialPartida({
    seedPartida: 'paridade-mapa',
    idArquitetura: 'SOMBRA_ABISSAL',
    faseJogo: 'MAPA',
  });
  const estLoja7 = criarEstadoInicialPartida({
    seedPartida: 'paridade-loja',
    idArquitetura: 'COLMEIA_VIVA',
    faseJogo: 'LOJA',
  });
  const estEvento7 = criarEstadoInicialPartida({
    seedPartida: 'paridade-evento',
    idArquitetura: 'CARCACA_ALFA',
    faseJogo: 'EVENTO',
  });

  const telas7 = [estF1, estF2, estF3, estDraga, estMapa7, estLoja7, estEvento7];
  let bytesComparados = 0;
  let bytesDiferentes = 0;
  let totalHitboxesZeroColisao9 = 0;
  for (const estTela of telas7) {
    const vmTela = projetarViewModelWireframe(estTela);
    const hbsTela = obterMapaHitboxesNativo(vmTela);
    // Verifica 0 colisão AABB em todas as 7 telas (incluindo LOJA e EVENTO!)
    for (let i = 0; i < hbsTela.length; i += 1) {
      for (let j = i + 1; j < hbsTela.length; j += 1) {
        const a = hbsTela[i];
        const b = hbsTela[j];
        const colide =
          a.x < b.x + b.largura &&
          a.x + a.largura > b.x &&
          a.y < b.y + b.altura &&
          a.y + a.altura > b.y;
        assert.equal(colide, false, `Hitboxes ${a.idHitbox} e ${b.idHitbox} não podem colidir em ${vmTela.faseJogo}`);
      }
    }
    totalHitboxesZeroColisao9 += hbsTela.length;

    const idHover = hbsTela[0]?.idHitbox ?? null;
    const ev60 = interpolarEstadoVisual60Fps(null, vmTela, 1 / 60, { hoverHitboxId: idHover, hitboxes: hbsTela });
    const opcoesRender = {
      tempoSeg: 0.75,
      cicloSpriteF4: 2,
      estadoVisual60Fps: ev60,
      hoverHitboxId: idHover,
    };
    const rgbaServidorDireto = rasterizarQuadroRgba960x540(vmTela, opcoesRender, assetsDecodificadosCli, hbsTela, tabelasCli);
    const rgbaClienteSandbox = fnRasterExtraidaCliente(vmTela, opcoesRender, assetsDecodificadosCli, hbsTela, tabelasCli);
    const pngServidorBuf = renderizarCenaCanvasParaPngBuffer(vmTela, { ...opcoesRender, escalaInteira: 1 });
    const rgbaPngServidor = decodificarPngRgbaParaTeste(pngServidorBuf).rgba;
    assert.equal(rgbaClienteSandbox.length, 960 * 540 * 4);
    assert.equal(rgbaServidorDireto.length, 960 * 540 * 4);
    for (let bIdx = 0; bIdx < rgbaClienteSandbox.length; bIdx += 1) {
      bytesComparados += 1;
      if (rgbaClienteSandbox[bIdx] !== rgbaPngServidor[bIdx] || rgbaServidorDireto[bIdx] !== rgbaPngServidor[bIdx]) {
        bytesDiferentes += 1;
      }
    }
  }
  assert.equal(bytesComparados, 14515200, '[N4] Examinados: 14.515.200 bytes RGBA (7 telas x 960 x 540 x 4)');
  assert.equal(bytesDiferentes, 0, 'Paridade visual Servidor <-> Navegador (/cliente.js) deve ter 0 bytes de diferença nas 7 telas');

  // 2B. Prova L4 de Coesão Pictórica Hi-Bit (CHEFE_DRAGA, LOJA, EVENTO, MAPA e CORAÇÃO BIO-ELÉTRICO com densidade real de cores Hi-Bit)
  const contarCoresUnicasRegiao = (rgbaImg, x0, y0, x1, y1) => {
    const setCores = new Set();
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const i = (y * 960 + x) * 4;
        setCores.add((rgbaImg[i] << 16) | (rgbaImg[i + 1] << 8) | rgbaImg[i + 2]);
      }
    }
    return setCores.size;
  };
  const imgDragaCo = decodificarPngRgbaParaTeste(renderizarCenaCanvasParaPngBuffer(projetarViewModelWireframe(estDraga), { escalaInteira: 1 })).rgba;
  const imgLojaCo = decodificarPngRgbaParaTeste(renderizarCenaCanvasParaPngBuffer(projetarViewModelWireframe(estLoja7), { escalaInteira: 1 })).rgba;
  const imgEvCo = decodificarPngRgbaParaTeste(renderizarCenaCanvasParaPngBuffer(projetarViewModelWireframe(estEvento7), { escalaInteira: 1 })).rgba;
  const imgMapaCo = decodificarPngRgbaParaTeste(renderizarCenaCanvasParaPngBuffer(projetarViewModelWireframe(estMapa7), { escalaInteira: 1 })).rgba;
  assert.equal(contarCoresUnicasRegiao(imgDragaCo, 620, 128, 955, 425) >= 80, true, 'CHEFE_DRAGA deve renderizar placa Hi-Bit rica (>= 80 tons)');
  assert.equal(contarCoresUnicasRegiao(imgLojaCo, 165, 146, 945, 200) >= 80, true, 'LOJA deve renderizar vitrine Hi-Bit rica (>= 80 tons)');
  assert.equal(contarCoresUnicasRegiao(imgEvCo, 162, 102, 945, 216) >= 80, true, 'EVENTO deve renderizar cena marítima Hi-Bit rica (>= 80 tons)');
  assert.equal(contarCoresUnicasRegiao(imgMapaCo, 152, 96, 955, 425) >= 24, true, 'MAPA deve renderizar relevo batimétrico Hi-Bit (>= 24 tons)');
  assert.equal(contarCoresUnicasRegiao(imgDragaCo, 6, 456, 48, 502) >= 28, true, 'CORAÇÃO BIO-ELÉTRICO deve renderizar sprite orgânico Hi-Bit (>= 28 tons)');

  // 2C. Prova L4 de Integridade Anatômica das 5 Carcaças em EVENTO e LOJA (0 fenda de céu na silhueta e haste da quilha centrada |xQuilha - xCentroCorpo| <= 4 px)
  const cincoCarcacasMini = ['CARCACA_ALFA', 'MANTA_VOLT', 'COURACA_LIMIAR', 'SOMBRA_ABISSAL', 'COLMEIA_VIVA'];
  let carcacasMiniAuditadas = 0;
  const placaEvRef = assetsDecodificadosCli.eventoPlay;
  for (const idArqMini of cincoCarcacasMini) {
    const estEvMini = criarEstadoInicialPartida({ seedPartida: `mini-ev-${idArqMini}`, idArquitetura: idArqMini, faseJogo: 'EVENTO' });
    const vmEvMini = projetarViewModelWireframe(estEvMini);
    const hbsEvMini = obterMapaHitboxesNativo(vmEvMini);
    const rgbaEvMini = rasterizarQuadroRgba960x540(vmEvMini, { tempoSeg: 0.5 }, assetsDecodificadosCli, hbsEvMini, tabelasCli);
    const colunasOpacasCasco = [];
    for (let xM = 206; xM <= 352; xM += 1) {
      let colTemCasco = false;
      for (let yM = 58; yM <= 114; yM += 1) {
        const iM = (yM * 960 + xM) * 4;
        const iRef = ((yM - 46) * placaEvRef.largura + (xM - 168)) * 4;
        const ehChuvaFina =
          rgbaEvMini[iM] >= 55 &&
          rgbaEvMini[iM] <= 75 &&
          rgbaEvMini[iM + 1] >= 80 &&
          rgbaEvMini[iM + 1] <= 105 &&
          rgbaEvMini[iM + 2] >= 100 &&
          rgbaEvMini[iM + 2] <= 125;
        const diff =
          Math.abs(rgbaEvMini[iM] - placaEvRef.rgba[iRef]) +
          Math.abs(rgbaEvMini[iM + 1] - placaEvRef.rgba[iRef + 1]) +
          Math.abs(rgbaEvMini[iM + 2] - placaEvRef.rgba[iRef + 2]);
        if (diff > 24 && !ehChuvaFina) {
          colTemCasco = true;
          break;
        }
      }
      if (colTemCasco) colunasOpacasCasco.push(xM);
    }
    assert.equal(colunasOpacasCasco.length >= 70, true, `${idArqMini} em EVENTO deve ter envergadura íntegra >= 70 px (atual=${colunasOpacasCasco.length})`);
    // Zero fenda vertical aberta entre o início e o fim da silhueta da bio-nave!
    for (let kC = 1; kC < colunasOpacasCasco.length; kC += 1) {
      assert.equal(
        colunasOpacasCasco[kC] - colunasOpacasCasco[kC - 1],
        1,
        `${idArqMini} em EVENTO não pode ter fenda vertical de céu na silhueta (salto em x=${colunasOpacasCasco[kC - 1]}..${colunasOpacasCasco[kC]})`
      );
    }
    // Verifica que a haste submersa da quilha (y=136) está alinhada ao núcleo central do casco e conectada sem buraco de céu acima da linha d'água (y=104..126)
    let somaXQuilha = 0;
    let contXQuilha = 0;
    for (let xQ = 225; xQ <= 325; xQ += 1) {
      const iQ = (136 * 960 + xQ) * 4;
      if (rgbaEvMini[iQ + 1] >= 80 && rgbaEvMini[iQ + 2] >= 98 && rgbaEvMini[iQ] <= 60) {
        somaXQuilha += xQ;
        contXQuilha += 1;
      }
    }
    assert.equal(contXQuilha >= 1, true, `${idArqMini} deve exibir haste submersa refratada em y=136`);
    const xQuilhaDetectado = Math.round(somaXQuilha / contXQuilha);
    for (let yHaste = 104; yHaste <= 126; yHaste += 1) {
      const iH = (yHaste * 960 + xQuilhaDetectado) * 4;
      const iRefH = ((yHaste - 46) * placaEvRef.largura + (xQuilhaDetectado - 168)) * 4;
      const diffH =
        Math.abs(rgbaEvMini[iH] - placaEvRef.rgba[iRefH]) +
        Math.abs(rgbaEvMini[iH + 1] - placaEvRef.rgba[iRefH + 1]) +
        Math.abs(rgbaEvMini[iH + 2] - placaEvRef.rgba[iRefH + 2]);
      assert.equal(diffH > 12, true, `${idArqMini}: haste da quilha deve emergir continuamente do corpo em x=${xQuilhaDetectado}, y=${yHaste}`);
    }
    // Verifica também LOJA com as 5 carcaças (inclusive fallback da miniatura 68x36 e 0 bytes diff Server <-> Browser)
    const estLojaMini = criarEstadoInicialPartida({ seedPartida: `mini-lj-${idArqMini}`, idArquitetura: idArqMini, faseJogo: 'LOJA' });
    const vmLojaMini = projetarViewModelWireframe(estLojaMini);
    const hbsLojaMini = obterMapaHitboxesNativo(vmLojaMini);
    const rgbaLojaSrv = rasterizarQuadroRgba960x540(vmLojaMini, { tempoSeg: 0.5 }, assetsDecodificadosCli, hbsLojaMini, tabelasCli);
    const rgbaLojaCli = fnRasterExtraidaCliente(vmLojaMini, { tempoSeg: 0.5 }, assetsDecodificadosCli, hbsLojaMini, tabelasCli);
    assert.equal(Buffer.compare(Buffer.from(rgbaLojaSrv), Buffer.from(rgbaLojaCli)), 0, `LOJA 0-byte diff em ${idArqMini}`);
    carcacasMiniAuditadas += 1;
  }
  assert.equal(carcacasMiniAuditadas, 5, '[N4] 5 carcaças auditadas em EVENTO e LOJA sem fendas e com quilha centrada');

  // 3. Interpolação Sub-Tick 60 FPS (casco, nado contínuo entre câmaras, shake, warm tooltip <16ms) — [MUT-O6-13]
  const vmFoilInterp = projetarViewModelWireframe(estF1);
  const vmTdInterp = projetarViewModelWireframe(estF2);
  let estadoVis = interpolarEstadoVisual60Fps(null, vmFoilInterp, 1 / 60);
  assert.equal(Object.isFrozen(estadoVis), true);
  assert.equal(estadoVis.deslocamentoCascoPx, 0);
  estadoVis = interpolarEstadoVisual60Fps(estadoVis, vmTdInterp, 1 / 60);
  assert.equal(
    estadoVis.deslocamentoCascoPx > 10 && estadoVis.deslocamentoCascoPx < 90,
    true,
    '[MUT-O6-13] A interpolação sub-tick a 60 FPS deve deslizar suavemente o casco entre 0 px e 100 px no primeiro quadro (16.6ms)'
  );
  for (let q = 0; q < 45; q += 1) {
    estadoVis = interpolarEstadoVisual60Fps(estadoVis, vmTdInterp, 1 / 60);
  }
  assert.equal(estadoVis.deslocamentoCascoPx, 100);

  // Nado contínuo de tripulante + Warm Tooltip (< 16ms na janela quente após abertura fria de 180ms)
  const polvoAlfa = estF1.naveJogador.tripulacao.find((t) => t.especie === 'POLVO');
  const estPolvoNadando = despacharComandoUi(estF1, {
    tipo: 'MOVER_TRIPULANTE',
    payload: { tripulanteId: polvoAlfa.id, camaraDestinoId: 5 },
  }).estado;
  const estPolvoMeioNado = avancarTickPartidaEmTempoReal(estPolvoNadando, 0.25);
  let visNado = interpolarEstadoVisual60Fps(null, projetarViewModelWireframe(estF1), 1 / 60, { hoverHitboxId: 'BTN_DRENAR_SEGURO' });
  assert.equal(visNado.tooltipAberto, false, 'Tooltip frio não abre no 1º frame (16.6ms < 180ms)');
  for (let q = 0; q < 12; q += 1) {
    visNado = interpolarEstadoVisual60Fps(visNado, projetarViewModelWireframe(estPolvoMeioNado), 1 / 60, {
      hoverHitboxId: 'BTN_DRENAR_SEGURO',
    });
  }
  assert.equal(visNado.tooltipAberto, true, 'Tooltip abre após ~180ms de hover sustentado');
  assert.equal(visNado.posicoesTripulantes[polvoAlfa.id].nadando, true, 'Polvo deve interpolar nado contínuo entre câmaras');
  const visWarm = interpolarEstadoVisual60Fps(visNado, projetarViewModelWireframe(estPolvoMeioNado), 1 / 60, {
    hoverHitboxId: 'BTN_DRENAR_TUDO',
  });
  assert.equal(visWarm.tooltipAberto, true, 'Na janela quente (Warm Tooltip), trocar de botão abre o novo tooltip instantaneamente em < 16ms!');

  // 4. GD-1: Reflexo Branquial Simbiótico salva a tripulação da morte silenciosa aos 38s + atalho inteligente [B] / Shift+[B] — [MUT-O6-14]
  let estSemReflexo = estF1;
  let estComReflexo = estF1;
  for (let t = 0; t < 168; t += 1) {
    estSemReflexo = avancarTickPartidaEmTempoReal(estSemReflexo, 0.25, {
      suprimirAtaqueInimigoMutacao: true,
      desativarReflexoBranquialMutacao: true,
    });
    estComReflexo = avancarTickPartidaEmTempoReal(estComReflexo, 0.25, {
      suprimirAtaqueInimigoMutacao: true,
    });
  }
  const vivosSemReflexo = estSemReflexo.naveJogador.tripulacao.filter((t) => t.hpAtual > 0).length;
  const vivosComReflexo = estComReflexo.naveJogador.tripulacao.filter((t) => t.hpAtual > 0).length;
  assert.equal(vivosSemReflexo < 3, true, 'Sem BRQ nem reflexo, a hipóxia aos 38s vitima tripulantes aquáticos');
  assert.equal(
    estComReflexo.naveJogador.reflexoBranquialUsado,
    true,
    '[MUT-O6-14] O Reflexo Branquial Simbiótico deve disparar automaticamente em O2 <= 35%'
  );
  assert.equal(
    vivosComReflexo,
    3,
    '[MUT-O6-14] O Reflexo Branquial Simbiótico deve manter os 3 tripulantes vivos após 42s'
  );

  // Atalho [B] empresta 1 barra quando reator está 0/7, e Shift+[B] desaloca BRQ
  const tradKeyB = traduzirInputDomParaComandoUi({ tipoEvento: 'KEYDOWN', code: 'KeyB' }, estF1, vmFoilInterp, {});
  assert.equal(tradKeyB.resultadoMotor?.aceito, true);
  assert.equal(tradKeyB.resultadoMotor.estado.naveJogador.camaras.find((c) => c.id === 3).barrasEnergiaAlocada, 1);
  const tradShiftKeyB = traduzirInputDomParaComandoUi(
    { tipoEvento: 'KEYDOWN', code: 'KeyB', shiftKey: true },
    tradKeyB.resultadoMotor.estado,
    projetarViewModelWireframe(tradKeyB.resultadoMotor.estado),
    {}
  );
  assert.equal(tradShiftKeyB.resultadoMotor?.aceito, true);
  assert.equal(tradShiftKeyB.resultadoMotor.estado.naveJogador.camaras.find((c) => c.id === 3).barrasEnergiaAlocada, 0);

  // 5. GD-2: Dreno Seguro ([D] / BTN_DRENAR_SEGURO) corta em >= 62.5 kg sem cavitação vs DRENAR_TUDO cavitando — [MUT-O6-15]
  const ghostDrenoTudo = calcularGhostPreviewTermometro(estF1, 'BTN_DRENAR_TUDO');
  assert.equal(ghostDrenoTudo.entrariaEmCavitacao, true);
  assert.equal(ghostDrenoTudo.perdaSustentacaoCavitacaoKg, 125);
  assert.equal(ghostDrenoTudo.pesoProjetadoKg, 125);
  assert.equal(ghostDrenoTudo.sustentacaoProjetadaKg, 135);
  assert.equal(ghostDrenoTudo.causariaQuedaNoMar, false);
  assert.equal(ghostDrenoTudo.rotuloFantasma, '[CAVITAÇÃO -125kg]');

  const estF1ComCarga = congelarProfundo({
    ...structuredClone(estF1),
    naveJogador: {
      ...structuredClone(estF1.naveJogador),
      poraoCarga: [{ item: { id: 'CARGA_PESADA', pesoKg: 15 } }],
    },
  });
  const ghostDrenoTudoQueda = calcularGhostPreviewTermometro(estF1ComCarga, 'BTN_DRENAR_TUDO');
  assert.equal(ghostDrenoTudoQueda.entrariaEmCavitacao, true);
  assert.equal(ghostDrenoTudoQueda.causariaQuedaNoMar, true);
  assert.equal(ghostDrenoTudoQueda.rotuloFantasma, '[CAVITAÇÃO -> QUEDA]');

  const ghostDrenoSeguro = calcularGhostPreviewTermometro(estF1, 'BTN_DRENAR_SEGURO');
  assert.equal(ghostDrenoSeguro.aguaProjetadaKg, 62.5);
  assert.equal(ghostDrenoSeguro.entrariaEmCavitacao, false);
  assert.equal(ghostDrenoSeguro.causariaQuedaNoMar, false);
  assert.equal(ghostDrenoSeguro.travadoHidrostatico, false);
  assert.equal(ghostDrenoSeguro.rotuloFantasma, '[SEGURO >=63kg]');

  const ghostTravaTouchdown = calcularGhostPreviewTermometro(estF2, 'BTN_DRENAR_SEGURO');
  assert.equal(ghostTravaTouchdown.travadoHidrostatico, true);
  assert.equal(ghostTravaTouchdown.pesoProjetadoKg, estF2.naveJogador.pesoTotalKg);
  assert.equal(ghostTravaTouchdown.rotuloFantasma, '[TRAVA HIDROSTÁTICA]');

  let estDrenoSeg = traduzirInputDomParaComandoUi({ tipoEvento: 'KEYDOWN', code: 'KeyD' }, estF1, vmFoilInterp, {}).resultadoMotor.estado;
  for (let t = 0; t < 36; t += 1) {
    estDrenoSeg = avancarTickPartidaEmTempoReal(estDrenoSeg, 0.25, { suprimirAtaqueInimigoMutacao: true });
  }
  const aguaFinalDrenoSeg = estDrenoSeg.naveJogador.camaras.reduce((acc, c) => acc + c.aguaKg, 0);
  assert.equal(
    aguaFinalDrenoSeg >= 62.5 && aguaFinalDrenoSeg <= 65.0,
    true,
    '[MUT-O6-15] O Dreno Seguro [D] deve cortar automaticamente as válvulas em >= 62.5 kg sem entrar em cavitação'
  );
  assert.equal(projetarViewModelWireframe(estDrenoSeg).termometroSustentacao.emCavitacao, false);
  assert.equal(estDrenoSeg.naveJogador.estadoFisico, '1_NO_FOIL');
  assert.equal(estDrenoSeg.naveJogador.sustentacaoAtualKg, 260);

  // 6. GD-3: Contragolpes Táticos de Meio de Luta (Barco Mina Magnética, Teuthis Carapaça/Quilha e Chefe Draga Sobrecarga 50%) — [MUT-O6-16]
  const copiaBarco50 = structuredClone(estF1);
  copiaBarco50.alvoCombate.hpCascoAtual = Math.floor(copiaBarco50.alvoCombate.hpCascoMax * 0.5);
  const estMinaLancada = avancarTickPartidaEmTempoReal(congelarProfundo(copiaBarco50), 0.25);
  assert.equal(
    estMinaLancada.alvoCombate.protocoloCortaFogoUsado && estMinaLancada.alvoCombate.minaMagneticaAtivaSeg > 0,
    true,
    '[MUT-O6-16] Barco Humano <= 50% HP deve acionar Protocolo Corta-Fogo e lançar Mina Magnética de 4.0s'
  );
  // Em 1_NO_FOIL evade a mina; em 2_TOUCHDOWN sofre -2 HP de casco e brecha na câmara 6
  let estMinaEvadida = estMinaLancada;
  let estMinaExplodida = despacharComandoUi(estMinaLancada, { tipo: 'MERGULHO_TATICO', payload: { recolherFoil: true } }).estado;
  const hpAntesMina = estMinaExplodida.naveJogador.hpCascoAtual;
  for (let t = 0; t < 18; t += 1) {
    estMinaEvadida = avancarTickPartidaEmTempoReal(estMinaEvadida, 0.25, { suprimirAtaqueInimigoMutacao: true });
    // Avança apenas a contagem da mina em Touchdown mantendo fogo normal controlado: usamos seed determinística e checamos brecha na câmara 6
    estMinaExplodida = avancarTickPartidaEmTempoReal(estMinaExplodida, 0.25);
  }
  assert.equal(estMinaEvadida.naveJogador.camaras.find((c) => c.id === 6).brechaAtiva, false);
  assert.equal(estMinaExplodida.naveJogador.hpCascoAtual <= hpAntesMina - 2, true);
  assert.equal(estMinaExplodida.naveJogador.camaras.find((c) => c.id === 6).brechaAtiva, true);

  // Teuthis Couraçada: Aperto de Quilha (+40 kg) + Carapaça Quitina sobre Gânglio quebrada ao atingir Tentáculos!
  const copiaMonstroQuilha = structuredClone(estF3);
  copiaMonstroQuilha.alvoCombate.carapacaReflexaSeg = 5.0;
  copiaMonstroQuilha.alvoCombate.escudoQuitinaGanglioPts = 1;
  copiaMonstroQuilha.alvoCombate.apertoQuilhaSeg = 5.0;
  copiaMonstroQuilha.naveJogador.armasAtivas[0].arma.salaAlvoId = 4; // Gânglio
  copiaMonstroQuilha.naveJogador.armasAtivas[0].arma.progressoRecargaSeg = 99;
  const estBloqueouGanglio = avancarTickPartidaEmTempoReal(congelarProfundo(copiaMonstroQuilha), 0.25, {
    forcarAcerto100Pct: true,
  });
  assert.equal(estBloqueouGanglio.alvoCombate.escudoQuitinaGanglioPts, 0, 'Carapaça deve absorver o tiro direto no Gânglio');
  assert.equal(
    estBloqueouGanglio.naveJogador.pesoTotalKg,
    estF3.naveJogador.pesoTotalKg + 40,
    'Aperto de Quilha deve adicionar +40 kg de arrasto real à bio-nave'
  );
  const copiaQuebraTent = structuredClone(estBloqueouGanglio);
  copiaQuebraTent.alvoCombate.escudoQuitinaGanglioPts = 1;
  copiaQuebraTent.naveJogador.armasAtivas[0].arma.salaAlvoId = 1; // Tentáculos
  copiaQuebraTent.naveJogador.armasAtivas[0].arma.progressoRecargaSeg = 99;
  const estQuebrouCarapaca = avancarTickPartidaEmTempoReal(congelarProfundo(copiaQuebraTent), 0.25, {
    forcarAcerto100Pct: true,
  });
  assert.equal(estQuebrouCarapaca.alvoCombate.carapacaReflexaSeg, 0);
  assert.equal(estQuebrouCarapaca.alvoCombate.apertoQuilhaSeg, 0);

  // Chefe Draga: Sobrecarga Geotérmica de Meio de Fase (<= 50% HP -> +3 Blindagem Térmica + 3.5s Alarme de Fervura)
  const copiaDraga50 = structuredClone(estDragaBase);
  copiaDraga50.alvoCombate = structuredClone(criarEstadoChefeDraga(1));
  copiaDraga50.alvoCombate.hpCascoAtual = 10;
  const estDragaSobrecarga = avancarTickPartidaEmTempoReal(congelarProfundo(copiaDraga50), 0.25);
  assert.equal(estDragaSobrecarga.alvoCombate.sobrecargaGeotermicaFaseUsada, true);
  assert.equal(estDragaSobrecarga.alvoCombate.blindagemTermicaExternaPts, 3);
  assert.equal(estDragaSobrecarga.alvoCombate.alarmeFervuraAtivoSeg >= 3.25, true);

  // 7. Atalhos de Microinteração (KeyP, KeyE, KeyT, Shift+Click bulbo, Click mover, Loja 2:1 e Evento KeyB)
  const resKeyP = traduzirInputDomParaComandoUi({ tipoEvento: 'KEYDOWN', code: 'KeyP' }, estF1, vmFoilInterp, {});
  assert.equal(resKeyP.comandoMotor?.tipo, 'ATIVAR_BAIACU');
  assert.equal(resKeyP.resultadoMotor?.aceito, true);
  const hbCam5 = obterMapaHitboxesNativo(vmFoilInterp).find((h) => h.idHitbox === 'CAMARA_5');
  const resClickMover = traduzirInputDomParaComandoUi(
    {
      tipoEvento: 'CLICK',
      clientX: (hbCam5.x + 20) * 2,
      clientY: (hbCam5.y + 20) * 2,
      button: 0,
      retanguloCanvas: { left: 0, top: 0, width: 1920, height: 1080 },
    },
    estF1,
    vmFoilInterp,
    { tripulanteSelecionadoId: polvoAlfa.id }
  );
  assert.equal(resClickMover.comandoMotor?.tipo, 'MOVER_TRIPULANTE');
  assert.equal(resClickMover.resultadoMotor?.aceito, true);

  const hbCam2 = obterMapaHitboxesNativo(vmFoilInterp).find((h) => h.idHitbox === 'CAMARA_2');
  const resShiftBulbo = traduzirInputDomParaComandoUi(
    {
      tipoEvento: 'CLICK',
      clientX: (hbCam2.x + 20) * 2,
      clientY: (hbCam2.y + 20) * 2,
      button: 0,
      shiftKey: true,
      retanguloCanvas: { left: 0, top: 0, width: 1920, height: 1080 },
    },
    estF1,
    vmFoilInterp,
    { tripulanteSelecionadoId: polvoAlfa.id }
  );
  assert.equal(resShiftBulbo.comandoMotor?.tipo, 'MOVER_TRIPULANTE');
  assert.equal(resShiftBulbo.resultadoMotor?.aceito, true);
  assert.equal(
    resShiftBulbo.resultadoMotor.estado.naveJogador.tripulacao.find((t) => t.id === polvoAlfa.id).acopladoBulbo,
    !polvoAlfa.acopladoBulbo
  );

  const vmLoja7 = projetarViewModelWireframe(estLoja7);
  const hbDigLoja = obterMapaHitboxesNativo(vmLoja7).find((h) => h.idHitbox === 'LOJA_DIGESTAO_SUC_BIO');
  const resDigLoja = traduzirInputDomParaComandoUi(
    {
      tipoEvento: 'CLICK',
      clientX: (hbDigLoja.x + 12) * 2,
      clientY: (hbDigLoja.y + 12) * 2,
      button: 0,
      retanguloCanvas: { left: 0, top: 0, width: 1920, height: 1080 },
    },
    estLoja7,
    vmLoja7,
    {}
  );
  assert.equal(resDigLoja.resultadoMotor?.aceito, true);
  assert.equal(resDigLoja.resultadoMotor.estado.economia.sucata, estLoja7.economia.sucata - 2);
  assert.equal(resDigLoja.resultadoMotor.estado.economia.biomassa, estLoja7.economia.biomassa + 1);

  const vmEv7 = projetarViewModelWireframe(estEvento7);
  const resEvKeyB = traduzirInputDomParaComandoUi({ tipoEvento: 'KEYDOWN', code: 'KeyB' }, estEvento7, vmEv7, {});
  assert.equal(resEvKeyB.comandoMotor?.tipo, 'ESCOLHER_OPCAO_EVENTO');
  assert.equal(resEvKeyB.resultadoMotor?.aceito, false);
  const resEvKeyA = traduzirInputDomParaComandoUi({ tipoEvento: 'KEYDOWN', code: 'KeyA' }, estEvento7, vmEv7, {});
  assert.equal(resEvKeyA.comandoMotor?.tipo, 'ESCOLHER_OPCAO_EVENTO');
  assert.equal(resEvKeyA.resultadoMotor?.aceito, true);
  const estEvCouraca7 = criarEstadoInicialPartida({
    seedPartida: 'paridade-evento',
    idArquitetura: 'COURACA_LIMIAR',
    faseJogo: 'EVENTO',
  });
  const clEvCouraca7 = structuredClone(estEvCouraca7);
  clEvCouraca7.eventoAtual = { noId: 'NO_1_A', tipoNo: 'SOS', idTemplateEvento: 'SOS_1_REDE_ARRASTO' };
  const congEvCouraca7 = congelarProfundo(clEvCouraca7);
  const resEvKeyBCouraca = traduzirInputDomParaComandoUi(
    { tipoEvento: 'KEYDOWN', code: 'KeyB' },
    congEvCouraca7,
    projetarViewModelWireframe(congEvCouraca7),
    {}
  );
  assert.equal(resEvKeyBCouraca.resultadoMotor?.aceito, true);

  console.log(
    `[N4] Portão 08.7 examinado: ${telas7.length} telas com 0 bytes diff (${bytesComparados} bytes RGBA), ${totalHitboxesZeroColisao9} hitboxes 0 colisão, GD-1/GD-2/GD-3 e 60 FPS validados`
  );
});

test('[PORTÃO 08.8 | Vitrine Steam 4-Frames + Travessia de Portais 60 FPS | L1 + L2 + L3 + L4 + L6 + N4 + MUT-105] As 28 poses Hi-Bit (7x4), as 3 pranchas 1920x1080 de animação/estratégia e o sifão curvo J do Duto Ventral 5<->6', () => {
  // 1. Pacote 60 FPS entrega as 28 poses 4-frames de estúdio (7 espécies x 4 quadros)
  const pacote60 = exportarPacoteAssets60Fps();
  const especiesEsperadas = ['POLVO', 'ARRAIA', 'BAIACU', 'CARANGUEJO', 'MARINHEIRO', 'MERGULHADOR', 'PARASITA'];
  let totalPosesContadas = 0;
  for (const esp of especiesEsperadas) {
    const arr = pacote60.poses4Frames?.[esp];
    assert.equal(Array.isArray(arr), true, `poses4Frames.${esp} deve ser array`);
    assert.equal(arr.length, 4, `poses4Frames.${esp} deve conter exatamente 4 poses`);
    for (const uri of arr) {
      assert.equal(String(uri).startsWith('data:image/png;base64,'), true);
      totalPosesContadas += 1;
    }
  }
  assert.equal(totalPosesContadas, 28, '[N4] Examinadas: 28 poses Hi-Bit 4-frames no pacote 60 FPS');

  // 2. Canal explícito de erro L3 e imutabilidade L2 em exportarSpreadAnimacaoSteamPngBuffer
  const erroSpread = exportarSpreadAnimacaoSteamPngBuffer('SPREAD_INEXISTENTE');
  assert.equal(Object.isFrozen(erroSpread), true);
  assert.equal(erroSpread.ok, false);
  assert.equal(erroSpread.codigoErro, 'TIPO_SPREAD_INVALIDO');

  const tiposSpreads = [
    'TRIPULACAO_INVASORES_4FRAMES',
    'ARMAS_ORGAOS_SISTEMAS_4FRAMES',
    'TRAVESSIA_PORTAIS_60FPS',
  ];
  const hashesSpreads = new Set();
  for (const tipo of tiposSpreads) {
    const res = exportarSpreadAnimacaoSteamPngBuffer(tipo, { escalaInteira: 2 });
    assert.equal(Object.isFrozen(res), true);
    assert.equal(res.ok, true);
    assert.equal(res.tipoSpread, tipo);
    assert.equal(res.larguraPx, 1920);
    assert.equal(res.alturaPx, 1080);
    assert.equal(Buffer.isBuffer(res.pngBuffer), true);
    assert.equal(res.pngBuffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), true);
    hashesSpreads.add(crypto.createHash('sha256').update(res.pngBuffer).digest('hex'));
  }
  assert.equal(hashesSpreads.size, 3, '[N4] Examinadas: 3 pranchas Steam 1920x1080 distintas e lossless');

  // 3. Travessia sub-tick 60 FPS pelo Duto Hidráulico Ventral curvo 5 <-> 6 (sifão em J sob Piso 4 sem cortar câmara 8!)
  const baseDuto = structuredClone(
    criarEstadoInicialPartida({
      seedPartida: 'teste-duto-ventral-60fps',
      idArquitetura: 'CARCACA_ALFA',
      faseJogo: 'COMBATE',
      classeAlvoInicial: 'BARCO_HUMANO',
    })
  );
  baseDuto.naveJogador.tripulacao = [
    {
      id: 'polvo-duto-56',
      especie: 'POLVO',
      hpAtual: 100,
      hpMax: 100,
      camaraAtualId: 6,
      camaraDestinoId: 5,
      proximaCamaraId: 5,
      progressoSalto0a1: 0.28,
      localizacao: 'NAVE_JOGADOR',
    },
  ];
  const vmDuto = projetarViewModelWireframe(congelarProfundo(baseDuto));
  const hbDuto = obterMapaHitboxesNativo(vmDuto);
  const hb6 = hbDuto.find((h) => h.idHitbox === 'CAMARA_6');
  const hb8 = hbDuto.find((h) => h.idHitbox === 'CAMARA_8');
  const centroY6 = hb6.y + 11 + Math.floor((hb6.altura - 13) / 2);

  let evDuto = null;
  for (let s = 0; s < 12; s += 1) {
    evDuto = interpolarEstadoVisual60Fps(evDuto, vmDuto, 1 / 60, { hitboxes: hbDuto });
  }
  const posPolvoDuto = evDuto.posicoesTripulantes['polvo-duto-56'];
  assert.equal(
    posPolvoDuto.y > centroY6 && Number(evDuto.portaisDilatados['5-6'] ?? 0) > 0.5,
    true,
    '[MUT-O6-17] Travessia 6->5 a 60 FPS deve mergulhar pelo Duto Hidráulico Ventral curvo (y > centroY6) e dilatar o portal 5-6'
  );

  // Também garante que na subida (t = 0.65) o Polvo passa pela coluna vertebral central (x < hb8.x), jamais invadindo o interior da Câmara 8!
  const baseSubida = structuredClone(baseDuto);
  baseSubida.naveJogador.tripulacao[0].progressoSalto0a1 = 0.65;
  const vmSubida = projetarViewModelWireframe(congelarProfundo(baseSubida));
  let evSubida = null;
  for (let s = 0; s < 12; s += 1) {
    evSubida = interpolarEstadoVisual60Fps(evSubida, vmSubida, 1 / 60, { hitboxes: hbDuto });
  }
  assert.equal(
    evSubida.posicoesTripulantes['polvo-duto-56'].x < hb8.x,
    true,
    'Sifão em J do Duto Ventral sobe pela coluna vertebral central sem invadir o interior da Câmara 8'
  );

  // Prova explícita em memória da mutação semântica desativarWaypointsPortal60FpsMutacao
  let evMutado = null;
  for (let s = 0; s < 12; s += 1) {
    evMutado = interpolarEstadoVisual60Fps(evMutado, vmDuto, 1 / 60, {
      hitboxes: hbDuto,
      desativarWaypointsPortal60FpsMutacao: true,
    });
  }
  assert.equal(evMutado.posicoesTripulantes['polvo-duto-56'].y < centroY6, true);

  // 4. Validação SSOT e Paleta 100% Válida nas 92 matrizes de ATLAS_ANIMACAO_4FRAMES_BIOFOIL
  const chavesPaletaValidas = new Set(Object.keys(PALETA_PIXEL_ART_BIOFOIL));
  let matrizes4FVerificadas = 0;
  for (const entrada4F of Object.values(ATLAS_ANIMACAO_4FRAMES_BIOFOIL)) {
    for (const q of entrada4F.quadros) {
      matrizes4FVerificadas += 1;
      for (const lin of q.matrizPixels) {
        for (const ch of lin) {
          assert.equal(
            chavesPaletaValidas.has(ch),
            true,
            `Token '${ch}' inválido em ATLAS_ANIMACAO_4FRAMES_BIOFOIL.${entrada4F.id} frame ${q.indice}`
          );
        }
      }
    }
  }
  assert.equal(matrizes4FVerificadas, 92, '[N4] Examinadas: 92 matrizes de quadros (23 entidades x 4 frames) com 100% de tokens válidos');
  assert.equal(ATLAS_ANIMACAO_4FRAMES_BIOFOIL.MERGULHADOR.hpMax, 100);
  assert.equal(ATLAS_ANIMACAO_4FRAMES_BIOFOIL.PARASITA.hpMax, 60);
  assert.equal(ATLAS_ANIMACAO_4FRAMES_BIOFOIL.MARINHEIRO.hpMax, 100);
  assert.equal(ATLAS_ANIMACAO_4FRAMES_BIOFOIL.CORTADOR_TERMICO.energia, 2);
  assert.equal(ATLAS_ANIMACAO_4FRAMES_BIOFOIL.CORTADOR_TERMICO.recargaSeg, 14);

  // 5. Continuidade suave no handoff de câmara (zero snap/teleporte ao mudar camaraAtualId 2->3) e cadência por espécie (Polvo 1.2x > Baiacu 0.75x)
  const baseCadencia = structuredClone(baseDuto);
  baseCadencia.naveJogador.tripulacao = [
    { id: 'polvo-veloz', especie: 'POLVO', hpAtual: 80, hpMax: 80, camaraAtualId: 2, camaraDestinoId: 5, proximaCamaraId: 3, progressoSalto0a1: 0.10, localizacao: 'NAVE_JOGADOR' },
    { id: 'baiacu-lento', especie: 'BAIACU', hpAtual: 150, hpMax: 150, camaraAtualId: 2, camaraDestinoId: 5, proximaCamaraId: 3, progressoSalto0a1: 0.10, localizacao: 'NAVE_JOGADOR' },
  ];
  const vmCad = projetarViewModelWireframe(congelarProfundo(baseCadencia));
  const evCad0 = interpolarEstadoVisual60Fps(null, vmCad, 1 / 60, { hitboxes: hbDuto });
  const evCad1 = interpolarEstadoVisual60Fps(evCad0, vmCad, 1 / 60, { hitboxes: hbDuto });
  const avancoPolvo = evCad1.posicoesTripulantes['polvo-veloz'].progNado01 - evCad0.posicoesTripulantes['polvo-veloz'].progNado01;
  const avancoBaiacu = evCad1.posicoesTripulantes['baiacu-lento'].progNado01 - evCad0.posicoesTripulantes['baiacu-lento'].progNado01;
  assert.equal(avancoBaiacu > 0 && avancoPolvo > avancoBaiacu, true, 'Polvo (1.2x) avança mais rápido sub-tick que Baiacu (0.75x)');

  const baseHandoff = structuredClone(baseDuto);
  baseHandoff.naveJogador.tripulacao = [
    { id: 'polvo-veloz', especie: 'POLVO', hpAtual: 80, hpMax: 80, camaraAtualId: 2, camaraDestinoId: 5, proximaCamaraId: 3, progressoSalto0a1: 0.96, localizacao: 'NAVE_JOGADOR' },
  ];
  const vmH1 = projetarViewModelWireframe(congelarProfundo(baseHandoff));
  let evH = null;
  for (let s = 0; s < 14; s += 1) {
    evH = interpolarEstadoVisual60Fps(evH, vmH1, 1 / 60, { hitboxes: hbDuto });
  }
  const posAntesHandoff = { ...evH.posicoesTripulantes['polvo-veloz'] };
  // Agora o tick autoritativo promove camaraAtualId: 2 -> 3 e proximaCamaraId: 3 -> 5 (progressoSalto0a1 = 0.02)
  const baseHandoff2 = structuredClone(baseHandoff);
  baseHandoff2.naveJogador.tripulacao[0].camaraAtualId = 3;
  baseHandoff2.naveJogador.tripulacao[0].proximaCamaraId = 5;
  baseHandoff2.naveJogador.tripulacao[0].progressoSalto0a1 = 0.02;
  const vmH2 = projetarViewModelWireframe(congelarProfundo(baseHandoff2));
  const evAposHandoff = interpolarEstadoVisual60Fps(evH, vmH2, 1 / 60, { hitboxes: hbDuto });
  const posDepoisHandoff = evAposHandoff.posicoesTripulantes['polvo-veloz'];
  const saltoPixelsHandoff = Math.hypot(posDepoisHandoff.x - posAntesHandoff.x, posDepoisHandoff.y - posAntesHandoff.y);
  assert.equal(
    saltoPixelsHandoff < 12,
    true,
    `Transição de câmara 2->3 deve ser contínua no espaço de tela sem teletransporte (moveu ${saltoPixelsHandoff.toFixed(2)} px em 16.6ms)`
  );

  console.log('[N4] Portão 08.8 examinado: 28 poses 4-frames, 92 matrizes Hi-Bit, 3 pranchas Steam 1080p, continuidade de handoff e sifão J do Duto Ventral 5<->6 validados');
});

test('[PORTÃO 08.9 | Jogo Completo Steam 9/10 | L1 + L2 + L3 + L4 + L6 + N1 + N4 + MUT-O6-18..25] Campanha S1..S8 ponta a ponta, Persistência em Disco + Permadeath, Oficina 10 Árvores (2330 Alfa) + Porão Peso Real, Salva Manual, Placas de Blindagem, Abordagem Sala-a-Sala, Áudio Marítimo Multicamada 400Hz, 8 Variantes 5.7.A, Paridade 0-Byte nas Novas Telas e Launcher CLI', async () => {
  const dirTmpPersist = fs.mkdtempSync(path.join(os.tmpdir(), 'biofoil-portao089-persist-'));
  const dirTmpCli = fs.mkdtempSync(path.join(os.tmpdir(), 'biofoil-portao089-cli-'));

  try {
    // 1. Persistência Atômica Real em Disco (profile.json + run_save.json + Permadeath TR_7A) [MUT-O6-18]
    const dirPadraoResolvido = obterDiretorioDadosPadraoBiofoil({ diretorioDados: dirTmpPersist });
    assert.equal(dirPadraoResolvido, path.resolve(dirTmpPersist));

    const perfilIni = criarPerfilInicial();
    assert.equal(Object.isFrozen(perfilIni), true);
    const resSalvaPerfil = salvarPerfilDisco(perfilIni, { diretorioDados: dirTmpPersist });
    assert.equal(resSalvaPerfil.ok, true);
    const resLidoPerfil = carregarPerfilDisco({ diretorioDados: dirTmpPersist });
    assert.equal(resLidoPerfil.ok, true);
    assert.equal(resLidoPerfil.status, 'CARREGADO_DISCO');
    assert.equal(resLidoPerfil.perfil.carcacasDesbloqueadas.CARCACA_ALFA, true);
    assert.equal(resLidoPerfil.perfil.carcacasDesbloqueadas.MANTA_VOLT, false);

    const estRunDisco = criarEstadoInicialPartida({
      seedPartida: 'seed-persist-089',
      idArquitetura: 'CARCACA_ALFA',
      faseJogo: 'COMBATE',
      classeAlvoInicial: 'BARCO_HUMANO',
    });
    const resSalvaRun = salvarRunSaveDisco(estRunDisco, { diretorioDados: dirTmpPersist });
    assert.equal(resSalvaRun.ok, true);
    assert.equal(fs.existsSync(path.join(dirTmpPersist, 'run_save.json')), true);

    const resLidoRun = carregarRunSaveDisco({ diretorioDados: dirTmpPersist });
    assert.equal(resLidoRun.ok, true);
    assert.equal(resLidoRun.status, 'ENCONTRADO');
    assert.equal(resLidoRun.estadoRun.meta.seedPartida, 'seed-persist-089');

    const resSyncPermadeath = sincronizarTransicaoPersistenciaDisco(
      estRunDisco,
      perfilIni,
      'TR_7A_DERROTA_EM_COMBATE',
      { setorNumeroAlcanceMaxNestaRun: 8, incrementarRunsIniciadas: 1 },
      { diretorioDados: dirTmpPersist }
    );
    assert.equal(resSyncPermadeath.aceita, true);
    assert.equal(resSyncPermadeath.apagouRunSavePermadeath, true);
    assert.equal(
      fs.existsSync(path.join(dirTmpPersist, 'run_save.json')),
      false,
      '[MUT-O6-18] Permadeath (TR_7A_DERROTA_EM_COMBATE) deve apagar fisicamente run_save.json do disco'
    );

    salvarRunSaveDisco(estRunDisco, { diretorioDados: dirTmpPersist });
    const resSyncVitoriaFinal = sincronizarTransicaoPersistenciaDisco(
      estRunDisco,
      perfilIni,
      'TR_7B_VITORIA_FINAL',
      { setorNumeroAlcanceMaxNestaRun: 8, incrementarVitoriasFinais: 1 },
      { diretorioDados: dirTmpPersist }
    );
    assert.equal(resSyncVitoriaFinal.aceita, true);
    assert.equal(fs.existsSync(path.join(dirTmpPersist, 'run_save.json')), false);
    const perfilPosTr7b = carregarPerfilDisco({ diretorioDados: dirTmpPersist });
    assert.equal(perfilPosTr7b.perfil.carcacasDesbloqueadas.COLMEIA_VIVA, true);

    salvarRunSaveDisco(estRunDisco, { diretorioDados: dirTmpPersist });
    const resApagaDireto = apagarRunSavePermadeathDisco({ diretorioDados: dirTmpPersist });
    assert.equal(resApagaDireto.ok, true);
    assert.equal(fs.existsSync(path.join(dirTmpPersist, 'run_save.json')), false);

    // 2. Assets Hi-Bit, Escala Nearest, Ícones 12x12 dos 8 Sistemas e 8 Variantes Visuais 5.7.A [MUT-O6-19]
    const assetsHiBit = obterAssetsConceitoHiBit();
    assert.equal(assetsHiBit.f1Play.largura, 810);
    assert.equal(assetsHiBit.f1Play.altura, 390);
    const tabRaster = obterTabelasRasterUnificado();
    assert.equal(Object.isFrozen(tabRaster), true);

    const miniRgba = Buffer.from([
      255, 0, 0, 255, 0, 255, 0, 255,
      0, 0, 255, 255, 255, 255, 0, 255,
    ]);
    const esc2x = escalarNearestRgba(2, 2, miniRgba, 2);
    assert.equal(esc2x.largura, 4);
    assert.equal(esc2x.altura, 4);
    const png4x4 = codificarBufferRgbaParaPng(esc2x.largura, esc2x.altura, esc2x.rgba);
    assert.equal(png4x4.subarray(0, 4).toString('hex'), '89504e47');
    const atlasPngBuf = exportarAtlasHiBitsPngBuffer(1);
    assert.equal(atlasPngBuf.length > 1000, true);
    const qPolvo0 = obterQuadroAnimacaoEntidade('POLVO', 0);
    assert.equal(qPolvo0.ok, true);
    assert.equal(exportarPacoteAssets60Fps().versao, 'STEAM_60FPS_V4');

    const siglasSistemas = ['ESC', 'SIF', 'BRQ', 'ART', 'CTX', 'MST', 'TUB', 'TNT'];
    const hashesIcones = new Set();
    for (const sig of siglasSistemas) {
      const ic = obterIconeSistemaRodape12x12(sig);
      assert.equal(ic.ok, true);
      assert.equal(ic.gradePixels.length, 12);
      assert.equal(ic.gradePixels[0].length, 12);
      hashesIcones.add(ic.gradePixels.join('|'));
    }
    assert.equal(hashesIcones.size, 8);
    assert.equal(Object.keys(ICONES_SISTEMAS_RODAPE_12X12).length, 8);
    assert.equal(obterIconeSistemaRodape12x12('INEXISTENTE').ok, false);

    const idsBestiario8 = [
      'BARCO_1_LANCHA',
      'BARCO_2_CORVETA',
      'BARCO_3_ARRASTAO',
      'BARCO_4_SUBMARINO',
      'MONSTRO_1_TEUTHIS',
      'MONSTRO_2_ENGUIA',
      'MONSTRO_3_CARANGUEJO',
      'MONSTRO_4_HIDRA',
    ];
    const assinaturasVisuais8 = new Set();
    for (const idArqInim of idsBestiario8) {
      const pv = obterPerfilVisualArquetipoInimigo(idArqInim);
      assert.equal(Object.isFrozen(pv), true);
      assinaturasVisuais8.add(
        `${pv.idArquetipo}|${pv.superestrutura ?? pv.morfologia}|${pv.tintCascoRgb.join(',')}`
      );
    }
    assert.equal(
      assinaturasVisuais8.size,
      8,
      '[MUT-O6-19] Todos os 8 arquétipos do Bestiário 5.7.A devem ter silhueta/superestrutura/paleta distintas'
    );
    assert.equal(Object.keys(VARIANTES_VISUAIS_INIMIGOS_57A).length, 11);

    // 3. Áudio Marítimo Multicamada (4 camadas + 11 SFX FM/Ruído + Trilha 5 Estados + Filtro 400 Hz) [MUT-O6-20]
    assert.equal(CAMADAS_PAISAGEM_MARITIMA.length, 4);
    assert.equal(Object.keys(CATALOGO_SFX_MULTICAMADA_BIOFOIL).length, 11);
    assert.equal(Object.keys(ESTADOS_TRILHA_ADAPTATIVA_BIOFOIL).length, 5);

    const trilhaHangar = selecionarEstadoTrilhaAdaptativa({ meta: { faseJogo: 'INICIO' } });
    const trilhaDraga = selecionarEstadoTrilhaAdaptativa({
      meta: { faseJogo: 'COMBATE' },
      alvoCombate: { ativo: true, classeAlvo: 'CHEFE_DRAGA' },
    });
    assert.equal(trilhaHangar.id, 'TRILHA_HANGAR_INICIO');
    assert.equal(trilhaDraga.id, 'TRILHA_CHEFE_DRAGA');

    const estFoilSom = criarEstadoCampanhaCompleta({ faseInicial: 'COMBATE', seedPartida: 'seed-som-089' });
    const estTdSom = structuredClone(estFoilSom);
    estTdSom.naveJogador.estadoFisico = '2_TOUCHDOWN';
    estTdSom.meta.eventosVisuaisUltimoTick = [
      { idEvento: 1, tipo: 'DISPARO_JOGADOR', chassiId: 'CANHAO_ARPAO_CABO' },
      { idEvento: 2, tipo: 'IMPACTO_JOGADOR', dano: 2 },
    ];
    const sfxTick = extrairSfxMulticamadaDoTick(estFoilSom, estTdSom, null);
    assert.equal(sfxTick.length >= 2, true);

    const paisagemFoil = construirPaisagemSonoraCompleta(estFoilSom, estFoilSom, null);
    const paisagemTd = construirPaisagemSonoraCompleta(estFoilSom, estTdSom, null);
    assert.equal(paisagemFoil.filtroSubaquaticoMaster.frequenciaCorteHz, 20000);
    assert.equal(
      paisagemTd.filtroSubaquaticoMaster.frequenciaCorteHz,
      400,
      '[MUT-O6-20] Em 2_TOUCHDOWN o filtro subaquático master da paisagem sonora deve cortar em 400 Hz'
    );

    const pcmArpao = sintetizarBufferPcmMulticamada('SFX_DISPARO_ARPAO_CABO', { submerso: false, sampleRate: 8000 });
    const pcmArpaoSub = sintetizarBufferPcmMulticamada('SFX_DISPARO_ARPAO_CABO', { submerso: true, sampleRate: 8000 });
    assert.equal(pcmArpao.ok, true);
    assert.equal(pcmArpao.picoAbs > 0.05, true);
    assert.equal(pcmArpaoSub.frequenciaCorteMasterHz, 400);
    assert.equal(pcmArpaoSub.energiaAltaFreqRelativa < pcmArpao.energiaAltaFreqRelativa, true);
    const srcSintJs = gerarCodigoSintetizadorMaritimoClienteJs();
    assert.equal(srcSintJs.includes('criarMotorAudioMaritimoCliente'), true);

    // 4. Beam Assistido (4 salas + Draga F1/F2/F3), Salva Manual [A]/[X], 10 Árvores (2330 Alfa), Blindagem, Porão 0kg e Abordagem Viva [MUT-O6-21..23]
    for (const [faseDraga, totalSalas] of [[1, 6], [2, 6], [3, 5]]) {
      const trincaDraga = calcularTrincaBeamAutomatica(
        { classeAlvo: 'CHEFE_DRAGA', faseChefe: faseDraga, salasOuOrgaos: Array.from({ length: totalSalas }, (_, i) => ({ id: i + 1 })) },
        1
      );
      assert.equal(trincaDraga.ok, true);
      assert.equal(trincaDraga.trincaSalasBeam.length, 3);
    }

    // Prova real do Cortador Térmico a Plasma varrendo 3 salas ortogonais da CHEFE_DRAGA Fase 3 (após Blindagem Térmica cair a 0) [MUT-O6-21]
    const estBeamDragaF3 = structuredClone(estFoilSom);
    estBeamDragaF3.naveJogador.camaras.find((c) => c.id === 1).nivelMaxBarras = 4;
    estBeamDragaF3.naveJogador.camaras.find((c) => c.id === 1).barrasIntegridade = 4;
    estBeamDragaF3.naveJogador.camaras.find((c) => c.id === 1).energiaAlocada = 2;
    estBeamDragaF3.naveJogador.armasAtivas = [
      {
        slotIndex: 0,
        arma: {
          id: 'CORTADOR_TERMICO_PLASMA',
          chassiId: 'CORTADOR_TERMICO_PLASMA',
          energiaCusto: 2,
          soquetesMax: 1,
          orgaosEnxertados: [],
          tempoRecargaBaseSeg: 14,
          progressoRecargaSeg: 13.9,
          salaAlvoId: 1,
          trincaSalasBeam: [1, 2, 3],
          modoDisparo: 'AUTOMATICO',
        },
      },
    ];
    estBeamDragaF3.alvoCombate = {
      ativo: true,
      idInimigo: 'CHEFE_DRAGA',
      nome: 'Draga Continental Fase 3',
      classeAlvo: 'CHEFE_DRAGA',
      faseChefe: 3,
      hpCascoAtual: 24,
      hpCascoMax: 24,
      camadasBarreiraAtivas: 0,
      blindagemTermicaExternaPts: 0,
      esquivaEfetivaPct: 0,
      salasOuOrgaos: [1, 2, 3, 4, 5].map((idS) => ({
        id: idS,
        nome: `SALA_F3_${idS}`,
        integridadeAtual: 3,
        integridadeMax: 3,
        aguaKg: 0,
        tripulantes: [],
      })),
    };
    const posDisparoBeamF3 = avancarTickPartidaEmTempoReal(congelarProfundo(estBeamDragaF3), 0.25);
    assert.equal(
      posDisparoBeamF3.alvoCombate.hpCascoAtual,
      18,
      '[MUT-O6-21] Cortador Térmico (2 dano/sala, Seção 5.1) deve varrer as 3 salas ortogonais [1,2,3] da Draga Fase 3 (DRAGA_F3_5) causando 6 de dano total ao casco'
    );

    // Salva Manual [A] segura disparo em 100% e [X] dispara em uníssono [MUT-O6-22]
    const resModoManual = alternarModoDisparoArma(estFoilSom, 'TODOS', true);
    assert.equal(resModoManual.ok, true);
    assert.equal(resModoManual.modoAtivo, 'MANUAL');
    assert.equal(MODOS_DISPARO_ARMAS.MANUAL, 'MANUAL');
    const estProntoManual = structuredClone(resModoManual.estado);
    estProntoManual.naveJogador.armasAtivas[0].arma.salaAlvoId = 1;
    estProntoManual.naveJogador.armasAtivas[0].arma.progressoRecargaSeg =
      estProntoManual.naveJogador.armasAtivas[0].arma.tempoRecargaBaseSeg;
    estProntoManual.alvoCombate.esquivaEfetivaPct = 0;
    estProntoManual.alvoCombate.camadasBarreiraAtivas = 0;
    const hpAlvoAntesHold = estProntoManual.alvoCombate.hpCascoAtual;
    const estAposTickHold = avancarTickPartidaEmTempoReal(congelarProfundo(estProntoManual), 0.25);
    assert.equal(
      estAposTickHold.alvoCombate.hpCascoAtual,
      hpAlvoAntesHold,
      '[MUT-O6-22] Armas em modo MANUAL devem segurar 100% de carga sem disparar sozinhas no tick'
    );
    const resSalva = dispararSalvaManualPronta(estAposTickHold, 'TODOS');
    assert.equal(resSalva.ok, true);
    assert.equal(resSalva.armasAutorizadas >= 1, true);
    const estPosSalvaDisparada = avancarTickPartidaEmTempoReal(resSalva.estado, 0.25);
    assert.equal(estPosSalvaDisparada.naveJogador.armasAtivas[0].arma.progressoRecargaSeg, 0);

    // Todas as 10 árvores da Oficina (5.6.A): soma exata 2330 na Carcaça Alfa + Placas de Blindagem (+15kg/nv e +5 HP/nv) [MUT-O6-23]
    let estOficinaAlfa = criarEstadoCampanhaCompleta({
      idArquitetura: 'CARCACA_ALFA',
      faseInicial: 'LOJA',
      seedPartida: 'seed-oficina-2330',
    });
    const cloneCarteiraRica = structuredClone(estOficinaAlfa);
    cloneCarteiraRica.economia = { sucata: 5000, biomassa: 5000, combustivel: 20, municao: 20 };
    cloneCarteiraRica.recursos = cloneCarteiraRica.economia;
    estOficinaAlfa = congelarProfundo(cloneCarteiraRica);
    const pesoAlfaAntesUpgrades = estOficinaAlfa.naveJogador.pesoTotalKg;

    let gastoTotal2330 = 0;
    const ids10Arvores = [
      'MASTRO_FOIL',
      'ARTILHARIA_DORSAL',
      'PLACAS_BLINDAGEM',
      'GLANDULA_BARREIRA',
      'SIFAO_PROPULSAO',
      'BOMBA_BRANQUIAL',
      'CORTEX_NAVEGACAO',
      'TUBO_PRESSURIZADO',
      'GLANDULA_TINTA_FURTIVA',
      'CORACAO_BIO_ELETRICO',
    ];
    for (const idArv of ids10Arvores) {
      let guard = 0;
      while (guard < 20) {
        guard += 1;
        const cot = calcularCustoProximoUpgradeNave(estOficinaAlfa.naveJogador, idArv, true);
        if (!cot.disponivel || cot.custoProximo === null) break;
        const moedaUsar = idArv === 'CORACAO_BIO_ELETRICO' && guard % 2 === 0 ? 'BIOMASSA' : 'SUCATA';
        const resUp = aplicarUpgradeNaveCampanha(estOficinaAlfa, idArv, { moedaPreferencial: moedaUsar });
        assert.equal(resUp.ok, true);
        gastoTotal2330 += resUp.custoPago;
        estOficinaAlfa = resUp.estado;
      }
    }
    assert.equal(gastoTotal2330, 2330);
    assert.equal(estOficinaAlfa.naveJogador.nivelBlindagem, 3);
    assert.equal(estOficinaAlfa.naveJogador.hpCascoMax, 45);
    assert.equal(
      estOficinaAlfa.naveJogador.pesoTotalKg,
      pesoAlfaAntesUpgrades + 45,
      '[MUT-O6-23] Placas de Blindagem Nv.3 devem adicionar exatamente +45 kg (3 x 15 kg) à massa total da bio-nave'
    );

    // Porão de Carga com Massa Física Real (Contra-Auditoria #4) + Equipar/Desequipar Arma + Enxertar/Remover/Ejetar Órgão
    const pesoSemPorao = estOficinaAlfa.naveJogador.pesoTotalKg;
    let estPorao = structuredClone(estOficinaAlfa);
    estPorao.naveJogador.poraoCarga = [
      { slotIndex: 0, item: { id: 'GLANDULA_BAIACU', tipo: 'ORGAO', nome: 'Glândula de Baiacu', pesoKg: 5 } },
      { slotIndex: 1, item: { id: 'MORTEIRO_ESPOROS', tipo: 'ARMA', nome: 'Morteiro de Esporos', pesoKg: 12 } },
      { slotIndex: 2, item: { id: 'BOLSA_TINTA_ABISSAL', tipo: 'ORGAO', nome: 'Bolsa de Tinta', pesoKg: 5 } },
      { slotIndex: 3, item: null },
    ];
    estPorao = congelarProfundo(estPorao);
    const pesoEsperadoCom22KgPorao = pesoSemPorao + 22;
    const resEnxerto = gerenciarEquipamentoPoraoEOrgaos(estPorao, {
      tipo: 'ENXERTAR_ORGAO_PORAO',
      indicePorao: 0,
      slotArmaIndex: 0,
    });
    assert.equal(resEnxerto.ok, true);
    assert.equal(resEnxerto.estado.naveJogador.pesoTotalKg, pesoEsperadoCom22KgPorao);
    assert.equal(resEnxerto.estado.naveJogador.armasAtivas[0].arma.orgaosEnxertados.length, 1);
    const resRemoverOrg = gerenciarEquipamentoPoraoEOrgaos(resEnxerto.estado, {
      tipo: 'REMOVER_ORGAO_PARA_PORAO',
      slotArmaIndex: 0,
      indiceOrgao: 0,
    });
    assert.equal(resRemoverOrg.ok, true);
    assert.equal(resRemoverOrg.estado.naveJogador.pesoTotalKg, pesoEsperadoCom22KgPorao);
    const resEquipArma = gerenciarEquipamentoPoraoEOrgaos(resRemoverOrg.estado, {
      tipo: 'EQUIPAR_ARMA_PORAO',
      indicePorao: 1,
      slotArmaIndex: 2,
    });
    assert.equal(resEquipArma.ok, true);
    assert.equal(resEquipArma.estado.naveJogador.pesoTotalKg, pesoEsperadoCom22KgPorao);
    assert.equal(resEquipArma.estado.naveJogador.armasAtivas[2].arma.chassiId, 'MORTEIRO_ESPOROS');
    const resDesequipArma = gerenciarEquipamentoPoraoEOrgaos(resEquipArma.estado, {
      tipo: 'DESEQUIPAR_ARMA_PARA_PORAO',
      slotArmaIndex: 2,
    });
    assert.equal(resDesequipArma.ok, true);
    assert.equal(resDesequipArma.estado.naveJogador.pesoTotalKg, pesoEsperadoCom22KgPorao);
    const resDescartar = gerenciarEquipamentoPoraoEOrgaos(resDesequipArma.estado, {
      tipo: 'DESCARTAR_ITEM_PORAO',
      indicePorao: 2,
    });
    assert.equal(resDescartar.ok, true);
    assert.equal(resDescartar.estado.naveJogador.pesoTotalKg, pesoEsperadoCom22KgPorao - 5);

    // Abordagem Real BORDO_INIMIGO: Caranguejos (15 DPS), Movimento entre Salas Inimigas e Captura Intacta
    let estAbord = criarEstadoCampanhaCompleta({
      idArquitetura: 'COURACA_LIMIAR',
      faseInicial: 'COMBATE',
      seedPartida: 'seed-abordagem-089',
    });
    const cloneAbord = structuredClone(estAbord);
    const crabs = cloneAbord.naveJogador.tripulacao.filter((t) => t.especie === 'CARANGUEJO');
    crabs[0].camaraAtualId = 7;
    crabs[1].camaraAtualId = 7;
    cloneAbord.alvoCombate = criarAlvoSetor1Canonico('BARCO_HUMANO');
    estAbord = congelarProfundo(cloneAbord);
    const lancRes = despacharComandoUi(estAbord, {
      tipo: 'LANCAR_ABORDAGEM',
      tripulantesIds: [crabs[0].id, crabs[1].id],
      salaAlvoId: 1,
    });
    assert.equal(lancRes.aceito, true);
    const movAbRes = ordenarMovimentoAbordagemInimiga(lancRes.estado, crabs[0].id, 2);
    assert.equal(movAbRes.ok, true);
    assert.equal(
      movAbRes.estado.naveJogador.tripulacao.find((t) => t.id === crabs[0].id).proximaSalaInimigaId,
      2
    );
    // Move ambos com travessia cadenciada (1.25s/salto) para eliminar a tripulação inimiga e acionar CAPTURA_INTACTA!
    let estLutaBordo = ordenarMovimentoAbordagemInimiga(movAbRes.estado, crabs[1].id, 2).estado;
    const clInimFraco = structuredClone(estLutaBordo);
    for (const s of clInimFraco.alvoCombate.salasOuOrgaos) {
      s.tripulantes = s.id === 2 ? [{ id: 'mar-unico', especie: 'MARINHEIRO', hpAtual: 12, hpMax: 100 }] : [];
    }
    estLutaBordo = avancarTickCampanhaCompleta(congelarProfundo(clInimFraco), 1.5);
    assert.equal(
      estLutaBordo.naveJogador.tripulacao.find((t) => t.id === crabs[0].id).salaInimigaId,
      2
    );
    estLutaBordo = avancarTickCampanhaCompleta(estLutaBordo, 1.0);
    assert.equal(estLutaBordo.meta.modalCampanhaAtivo, 'SAQUE');
    assert.equal(estLutaBordo.meta.saquePendente.modalidade, 'CAPTURA_INTACTA');

    // 5. Escalonamento S1..S7, Campanha HTTP Completa + Draga F1->F2->F3 -> VITÓRIA, Paridade 0-Byte nas Novas Telas e Launcher CLI [MUT-O6-24..25]
    const alvoS1 = gerarAlvoInimigoEscaladoSetor('seed-s17', 1, 'NO_1');
    const alvoS7 = gerarAlvoInimigoEscaladoSetor('seed-s17', 7, 'NO_7');
    assert.equal(alvoS7.hpCascoMax > alvoS1.hpCascoMax, true);

    const spreadViaHooks = exportarSpreadAnimacaoSteamPngBufferComHooks(
      'TRIPULACAO_INVASORES_4FRAMES',
      { escalaInteira: 1 },
      { projetarViewModelWireframe, interpolarEstadoVisual60Fps }
    );
    assert.equal(spreadViaHooks.ok, true);

    const cliInst = await iniciarJogoBiofoilCli({
      port: 0,
      diretorioDados: dirTmpCli,
      seedPartida: 'seed-cli-campanha-089',
      abrirNavegador: false,
      silencioso: true,
    });
    try {
      assert.equal(cliInst.ok, true);
      assert.equal(cliInst.faseInicial, 'INICIO');

      // Verifica Hangar inicial via GET /api/estado e inicia Nova Run via POST /api/comando (ACAO_CAMPANHA) [MUT-O6-24]
      const rEstIni = await fetch(`${cliInst.url}/api/estado`);
      const jEstIni = await rEstIni.json();
      assert.equal(jEstIni.viewModel.faseJogo, 'INICIO');
      assert.equal(jEstIni.paisagemSonora.trilhaAdaptativa.idEstado, 'TRILHA_HANGAR_INICIO');

      const hbIniciar = jEstIni.hitboxes.find((h) => h.idHitbox === 'HANGAR_INICIAR_RUN');
      const rClickIni = await fetch(`${cliInst.url}/api/comando`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventoInput: {
            tipoEvento: 'CLICK',
            botaoMouse: 0,
            clientX: hbIniciar.x + 10,
            clientY: hbIniciar.y + 10,
            retanguloCanvas: { left: 0, top: 0, width: 960, height: 540 },
          },
        }),
      });
      const jPosIni = await rClickIni.json();
      assert.equal(
        jPosIni.viewModel.faseJogo,
        'MAPA',
        '[MUT-O6-24] Clicar em HANGAR_INICIAR_RUN no servidor web deve iniciar a campanha e transicionar INICIO -> MAPA'
      );
      assert.equal(fs.existsSync(path.join(dirTmpCli, 'run_save.json')), true);

      // Abre modal OFICINA via tecla KeyU no servidor web e valida paridade 0-byte + visibilidade real [MUT-O6-25]
      const rKeyU = await fetch(`${cliInst.url}/api/comando`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventoInput: { tipoEvento: 'KEYDOWN', code: 'KeyU' } }),
      });
      const jOficina = await rKeyU.json();
      assert.equal(jOficina.viewModel.modalCampanhaAtivo, 'OFICINA');
      assert.equal(jOficina.viewModel.oficinaResumo.arvores.length, 10);

      // Prova visual e paridade 0-byte Server<->Browser nas 4 telas/modais novos: INICIO, OFICINA, SAQUE e FIM_DE_RUN!
      const vmSaque = projetarViewModelWireframe(estLutaBordo);
      const resConfSaque = executarAcaoCampanhaCompleta(estLutaBordo, { tipoAcao: 'CONFIRMAR_SAQUE_POS_COMBATE' });
      assert.equal(resConfSaque.ok, true);
      assert.equal(resConfSaque.estado.meta.modalCampanhaAtivo, null);

      // Derrota as 3 fases da CHEFE_DRAGA no Setor 8 -> VITORIA_CAMPANHA em FIM_DE_RUN!
      let estDragaS8 = criarEstadoCampanhaCompleta({
        idArquitetura: 'CARCACA_ALFA',
        faseInicial: 'COMBATE',
        setorNumero: 8,
        seedPartida: 'seed-vitoria-draga-089',
      });
      const prepFase = (st, faseEsperada) => {
        const cl = structuredClone(st);
        if (faseEsperada === 1) {
          cl.alvoCombate = {
            ativo: true,
            idInimigo: 'CHEFE_DRAGA',
            nome: 'Draga Continental',
            classeAlvo: 'CHEFE_DRAGA',
            faseChefe: 1,
            hpCascoAtual: 1,
            hpCascoMax: 24,
            camadasBarreiraAtivas: 0,
            esquivaEfetivaPct: 0,
            salasOuOrgaos: [1, 2, 3, 4, 5, 6].map((i) => ({ id: i, nome: `S_${i}`, integridadeAtual: 2, integridadeMax: 2, aguaKg: 0, tripulantes: [] })),
          };
        } else {
          cl.alvoCombate.hpCascoAtual = 1;
          cl.alvoCombate.camadasBarreiraAtivas = 0;
          cl.alvoCombate.blindagemTermicaExternaPts = 0;
          cl.alvoCombate.esquivaEfetivaPct = 0;
        }
        cl.naveJogador.armasAtivas[0].arma.salaAlvoId = 1;
        cl.naveJogador.armasAtivas[0].arma.progressoRecargaSeg = 99;
        return congelarProfundo(cl);
      };
      estDragaS8 = avancarTickCampanhaCompleta(prepFase(estDragaS8, 1), 0.25);
      assert.equal(estDragaS8.alvoCombate.faseChefe, 2);
      estDragaS8 = avancarTickCampanhaCompleta(prepFase(estDragaS8, 2), 0.25);
      assert.equal(estDragaS8.alvoCombate.faseChefe, 3);
      estDragaS8 = avancarTickCampanhaCompleta(prepFase(estDragaS8, 3), 0.25);
      assert.equal(estDragaS8.meta.faseJogo, 'FIM_DE_RUN');
      assert.equal(estDragaS8.meta.desfechoRun, 'VITORIA_CAMPANHA');
      assert.equal(estDragaS8.perfilJogador.estatisticasGlobais.vitoriasFinais, 1);

      const vmOficina = jOficina.viewModel;
      const hbsOficina = obterMapaHitboxesNativo(vmOficina);
      const rgbaMapaPuro = rasterizarQuadroRgba960x540(
        { ...vmOficina, modalCampanhaAtivo: null },
        {},
        assetsHiBit,
        hbsOficina,
        tabRaster
      );
      const rgbaOficina = rasterizarQuadroRgba960x540(vmOficina, {}, assetsHiBit, hbsOficina, tabRaster);
      let diffOficinaVsMapa = 0;
      for (let b = 0; b < rgbaOficina.length; b += 1) {
        if (rgbaOficina[b] !== rgbaMapaPuro[b]) diffOficinaVsMapa += 1;
      }
      assert.equal(
        diffOficinaVsMapa > 50000,
        true,
        '[MUT-O6-25] Modal OFICINA deve desenhar o painel completo sobre o Mapa no Canvas 960x540'
      );

      // Valida 0 colisão de hitboxes E paridade 0-byte Servidor<->Cliente nas 4 telas/modais novos!
      const codigoCliente089 = gerarCodigoJsClienteBiofoil();
      const idxRast089 = codigoCliente089.indexOf('function criarContextoPrimitivasRgba960x540');
      const idxBoot089 = codigoCliente089.indexOf('let estadoCliente = JSON.parse');
      const ctxVm089 = vm.createContext({
        Math,
        Number,
        String,
        Boolean,
        Array,
        Object,
        Set,
        Map,
        WeakMap,
        Uint8Array,
        Uint8ClampedArray,
        Int16Array,
        Int32Array,
      });
      vm.runInContext(
        `${codigoCliente089.slice(idxRast089, idxBoot089)}\nglobalThis.__rast089 = rasterizarQuadroRgba960x540;`,
        ctxVm089
      );

      const telasNovas = [
        ['INICIO', jEstIni.viewModel],
        ['OFICINA', vmOficina],
        ['SAQUE', vmSaque],
        ['FIM_DE_RUN', projetarViewModelWireframe(estDragaS8)],
      ];
      let bytesParidade089 = 0;
      for (const [rotTela, vmT] of telasNovas) {
        const hbsT = obterMapaHitboxesNativo(vmT);
        assert.equal(hbsT.length >= 2, true, `Tela ${rotTela} deve expor hitboxes interativas`);
        for (let i = 0; i < hbsT.length; i += 1) {
          for (let j = i + 1; j < hbsT.length; j += 1) {
            const A = hbsT[i];
            const B = hbsT[j];
            const colide =
              A.x < B.x + B.largura &&
              A.x + A.largura > B.x &&
              A.y < B.y + B.altura &&
              A.y + A.altura > B.y;
            assert.equal(colide, false, `Colisão de hitboxes em ${rotTela}: ${A.idHitbox} vs ${B.idHitbox}`);
          }
        }
        const srvBuf = rasterizarQuadroRgba960x540(vmT, {}, assetsHiBit, hbsT, tabRaster);
        const cliBuf = ctxVm089.__rast089(vmT, {}, assetsHiBit, hbsT, tabRaster);
        let diffBytes = 0;
        for (let k = 0; k < srvBuf.length; k += 1) {
          if (srvBuf[k] !== cliBuf[k]) diffBytes += 1;
        }
        assert.equal(diffBytes, 0, `Paridade 0-byte Server<->Browser violada em ${rotTela}`);
        bytesParidade089 += srvBuf.length;
      }

      console.log(
        `[N4] Portão 08.9 examinado: 10 árvores (2330 Alfa), 8 arquétipos 5.7.A, 10 SFX + 5 trilhas + 4 camadas marítimas, 4 novas telas com 0 bytes diff (${bytesParidade089} bytes RGBA) e campanha S1..S8 completa`
      );
    } finally {
      await cliInst.fechar();
    }
  } finally {
    fs.rmSync(dirTmpPersist, { recursive: true, force: true });
    fs.rmSync(dirTmpCli, { recursive: true, force: true });
  }
});

test('Portão 08.10: Submódulos Acíclicos Onda 6, Estoque Finito de Loja, Topologias 5/6 Salas 5.7.A, PCM Int16 e Runtime Completo /cliente.js em VM [MUT-O6-26]', async () => {
  const dirTmp0810 = fs.mkdtempSync(path.join(os.tmpdir(), 'biofoil-rt-0810-'));
  try {
    const assetsHiBit = obterAssetsConceitoHiBit();
    const tabRaster = obterTabelasRasterUnificado();
    const cachesTeste = {
      f4CropCache: new WeakMap(),
      portraitCleanCache: new WeakMap(),
      placaCleanCache: new WeakMap(),
    };

    // 0. Auditoria Estática Real de Aciclicidade (DFS) sobre 100% do grafo ESM de src/ (38 módulos, 0 ciclos dirigidos)
    const listarMjsRecursivo = (dir) =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((ent) =>
        ent.isDirectory()
          ? listarMjsRecursivo(path.join(dir, ent.name))
          : ent.name.endsWith('.mjs')
            ? [path.resolve(dir, ent.name)]
            : []
      );
    const arquivosSrcEsm = listarMjsRecursivo(path.resolve(process.cwd(), 'src'));
    assert.equal(arquivosSrcEsm.length >= 38, true);
    const arestasEsm = new Map();
    for (const arqAbs of arquivosSrcEsm) {
      const conteudoArq = fs.readFileSync(arqAbs, 'utf8');
      const depsArq = [];
      for (const mImp of conteudoArq.matchAll(/(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"](\.[^'"]+)['"]/g)) {
        depsArq.push(path.resolve(path.dirname(arqAbs), mImp[1]));
      }
      arestasEsm.set(arqAbs, depsArq);
    }
    const corVisita = new Map();
    const pilhaDfs = [];
    const ciclosDirigidosEsm = [];
    const visitarDfsEsm = (u) => {
      corVisita.set(u, 1);
      pilhaDfs.push(u);
      for (const v of arestasEsm.get(u) ?? []) {
        if (!corVisita.get(v)) {
          visitarDfsEsm(v);
        } else if (corVisita.get(v) === 1) {
          const idxCiclo = pilhaDfs.indexOf(v);
          ciclosDirigidosEsm.push(
            pilhaDfs
              .slice(idxCiclo)
              .concat(v)
              .map((p) => path.relative(process.cwd(), p))
              .join(' -> ')
          );
        }
      }
      pilhaDfs.pop();
      corVisita.set(u, 2);
    };
    for (const arqAbs of arquivosSrcEsm) {
      if (!corVisita.get(arqAbs)) visitarDfsEsm(arqAbs);
    }
    assert.deepEqual(
      ciclosDirigidosEsm,
      [],
      `Grafo ESM de src/ deve ser estritamente acíclico (0 ciclos dirigidos), mas encontrou: ${ciclosDirigidosEsm.join(' | ')}`
    );

    // 1. Invocação direta de 100% dos 6 submódulos/funções puras de renderização (Regra #7)
    const perfilDesbloqueado0810 = congelarProfundo({
      ...structuredClone(criarPerfilInicial()),
      carcacasDesbloqueadas: Object.fromEntries(CARCACAS_PERFIL_85B.map((c) => [c.idArquitetura, true])),
    });
    const estHangar = criarEstadoCampanhaCompleta({
      seedPartida: 'seed-0810-mod',
      faseInicial: 'INICIO',
      perfilInicial: perfilDesbloqueado0810,
    });
    const vmHangar = projetarViewModelWireframe(estHangar);
    const hbsHangar = obterMapaHitboxesNativo(vmHangar);
    const ctxPrimHangar = criarContextoPrimitivasRgba960x540(vmHangar, { tempoSeg: 0.5 }, assetsHiBit, hbsHangar, tabRaster, cachesTeste);
    assert.equal(ctxPrimHangar.W, 960);
    assert.equal(ctxPrimHangar.H, 540);
    const resTelaHangar = renderizarTelaHangarOuFimDeRun(ctxPrimHangar);
    assert.equal(resTelaHangar instanceof Uint8ClampedArray, true);
    assert.equal(resTelaHangar.length, 960 * 540 * 4);

    let estMapa = executarAcaoCampanhaCompleta(estHangar, { tipo: 'INICIAR_NOVA_RUN', idArquitetura: 'COLMEIA_VIVA', seedPartida: 'seed-0810-colmeia' }).estado;
    assert.deepEqual(
      estMapa.naveJogador.tripulacao.map((t) => t.especie),
      ['BAIACU', 'BAIACU', 'ARRAIA'],
      'COLMEIA_VIVA deve iniciar com 2 BAIACU + 1 ARRAIA conforme Catálogo 5.1.A'
    );
    const vmMapa = projetarViewModelWireframe(estMapa);
    const ctxPrimMapa = criarContextoPrimitivasRgba960x540(vmMapa, { tempoSeg: 0.4 }, assetsHiBit, obterMapaHitboxesNativo(vmMapa), tabRaster, cachesTeste);
    renderizarViewportCampanhaNaoCombate(ctxPrimMapa);
    let somaAlphaMapa = 0;
    for (let i = 3; i < ctxPrimMapa.rgba.length; i += 4096) somaAlphaMapa += ctxPrimMapa.rgba[i];
    assert.equal(somaAlphaMapa > 0, true);

    const estOficina = executarAcaoCampanhaCompleta(estMapa, { tipoAcao: 'ABRIR_FECHAR_OFICINA' }).estado;
    const vmOficina = projetarViewModelWireframe(estOficina);
    const ctxPrimOficina = criarContextoPrimitivasRgba960x540(vmOficina, {}, assetsHiBit, obterMapaHitboxesNativo(vmOficina), tabRaster, cachesTeste);
    renderizarViewportCampanhaNaoCombate(ctxPrimOficina);
    renderizarModalOficinaOverlay(ctxPrimOficina);

    const clSaque = structuredClone(estMapa);
    clSaque.meta.modalCampanhaAtivo = 'SAQUE';
    clSaque.meta.saquePendente = {
      modalidade: 'DESTRUICAO_CASCO',
      sucataGanha: 21,
      biomassaGanha: 6,
      dropItemEspecial: 'ARMA:CANHAO_FERRO',
      arquetipoDerrotado: 'Corveta Blindada',
      setorNumero: 1,
    };
    const vmSaque = projetarViewModelWireframe(congelarProfundo(clSaque));
    const ctxPrimSaque = criarContextoPrimitivasRgba960x540(vmSaque, {}, assetsHiBit, obterMapaHitboxesNativo(vmSaque), tabRaster, cachesTeste);
    renderizarModalSaqueOverlay(ctxPrimSaque);

    // 2. Topologias 5/6 salas 5.7.A, degradação real de subsistemas inimigos, limite de 2 invasores/sala e renderizador-alvo-inimigo
    const corveta5 = gerarAlvoInimigoEscaladoSetor('seed-57a', 2, 'NO_CORV', { arquetipoId: 'BARCO_2_CORVETA' });
    const arrastao6 = gerarAlvoInimigoEscaladoSetor('seed-57a', 4, 'NO_ARR', { arquetipoId: 'BARCO_3_ARRASTAO' });
    const submarino6 = gerarAlvoInimigoEscaladoSetor('seed-57a', 6, 'NO_SUB', { arquetipoId: 'BARCO_4_SUBMARINO' });
    assert.equal(corveta5.salasOuOrgaos.length, 5);
    assert.equal(arrastao6.salasOuOrgaos.length, 6);
    assert.equal(submarino6.salasOuOrgaos.length, 6);
    const trincaSub = calcularTrincaBeamAutomatica(submarino6, 1, 2);
    assert.equal(trincaSub.ok, true);
    assert.equal(trincaSub.trincaSalasBeam.length, 3, 'Grafo ortogonal BARCO_SUBMARINO_6 deve traçar trinca válida de 3 salas');

    const clCombSub = structuredClone(estMapa);
    clCombSub.meta.faseJogo = 'COMBATE';
    clCombSub.alvoCombate = structuredClone(submarino6);
    const camTub = clCombSub.naveJogador.camaras.find((c) => c.id === 7);
    if (camTub) {
      camTub.barrasIntegridade = Math.max(2, Number(camTub.barrasIntegridade ?? 1));
      camTub.barrasEnergiaAlocada = 2;
      camTub.energiaAlocada = 2;
    }
    clCombSub.naveJogador.recargaTuboAbordagemSeg = 0;
    clCombSub.naveJogador.tripulacao.push(
      { id: 'crab-a', especie: 'CARANGUEJO', camaraAtualId: 7, camaraDestinoId: null, hpAtual: 110, hpMax: 110, localizacao: 'NAVE_JOGADOR', salaInimigaId: null },
      { id: 'crab-b', especie: 'CARANGUEJO', camaraAtualId: 7, camaraDestinoId: null, hpAtual: 110, hpMax: 110, localizacao: 'NAVE_JOGADOR', salaInimigaId: null },
      { id: 'crab-c', especie: 'CARANGUEJO', camaraAtualId: 7, camaraDestinoId: null, hpAtual: 110, hpMax: 110, localizacao: 'NAVE_JOGADOR', salaInimigaId: null }
    );
    let estCombSub = congelarProfundo(clCombSub);
    const vmCombSub = projetarViewModelWireframe(estCombSub);
    const ctxPrimAlvo = criarContextoPrimitivasRgba960x540(vmCombSub, { tempoSeg: 0.7 }, assetsHiBit, obterMapaHitboxesNativo(vmCombSub), tabRaster, cachesTeste);
    const perfilEsqTeste = ctxPrimAlvo.obterPerfilLimpo(assetsHiBit.f1Play);
    renderizarAlvoInimigoESalasCombate(ctxPrimAlvo, {
      placaEsq: assetsHiBit.f1Play,
      perfilEsq: perfilEsqTeste,
      yLinhaDaguaCena: 232,
      obterBocaDorsalRender: () => ({ x: 340, y: 120 }),
    });
    assert.equal(ctxPrimAlvo.hitboxes.filter((h) => h.tipo === 'SALA_ALVO').length, 6);

    // Lançar 2 invasores na sala 1 aceita; tentar mover 3º invasor para a mesma sala lotada (cap 2) rejeita!
    const resAb1 = despacharComandoUi(estCombSub, {
      tipo: 'LANCAR_ABORDAGEM',
      payload: { tripulantesIds: ['crab-a', 'crab-b'], salaAlvoId: 1 },
    });
    assert.equal(resAb1.aceito, true);
    const clResetTubo = structuredClone(resAb1.estado);
    clResetTubo.naveJogador.recargaTuboAbordagemSeg = 0;
    const resAb2 = despacharComandoUi(congelarProfundo(clResetTubo), {
      tipo: 'LANCAR_ABORDAGEM',
      payload: { tripulantesIds: ['crab-c'], salaAlvoId: 2 },
    });
    assert.equal(resAb2.aceito, true);
    estCombSub = resAb2.estado;
    const movLotado = ordenarMovimentoAbordagemInimiga(estCombSub, 'crab-c', 1);
    assert.equal(movLotado.ok, false);
    assert.equal(movLotado.codigoErro, 'SALA_INIMIGA_LOTADA_MAX_2');

    // Zerar integridade da Sala MOTOR/PROPULSAO e Sala ESCUDO/BARREIRA do alvo degrada esquiva e bolhas no tick real!
    const clDeg = structuredClone(estMapa);
    clDeg.meta.faseJogo = 'COMBATE';
    clDeg.alvoCombate = structuredClone(arrastao6);
    clDeg.alvoCombate.barreiraBolhasMax = 2;
    clDeg.alvoCombate.camadasBarreiraAtivas = 2;
    clDeg.alvoCombate.barreiraBolhasAtual = 2;
    for (const s of clDeg.alvoCombate.salasOuOrgaos) {
      if (/MOTOR|MAQUINAS|PROPULSAO|REATOR|ESCUDO|BARREIRA/i.test(s.nome ?? '')) {
        s.integridadeAtual = 0;
        s.integridade = 0;
        s.tripulantes = [];
      }
    }
    const estPosDeg = avancarTickCampanhaCompleta(congelarProfundo(clDeg), 0.25);
    assert.equal(estPosDeg.alvoCombate.esquivaEfetivaPct, 0, 'Sala MOTOR destruída (0 HP) deve zerar esquiva efetiva do barco inimigo');
    assert.equal(estPosDeg.alvoCombate.camadasBarreiraAtivas, 0, 'Sala ESCUDO destruída (0 HP) deve derrubar barreira de bolhas inimiga');

    // Paridade 0-byte Server<->Client nos 8 arquétipos 5.7.A (incluindo os 6 novos sprites Bestiário Hi-Bit)
    const idsVariantes8 = [
      'BARCO_1_LANCHA',
      'BARCO_2_CORVETA',
      'BARCO_3_ARRASTAO',
      'BARCO_4_SUBMARINO',
      'MONSTRO_1_TEUTHIS',
      'MONSTRO_2_ENGUIA',
      'MONSTRO_3_CARANGUEJO',
      'MONSTRO_4_HIDRA',
    ];
    for (const idVCheck of idsVariantes8) {
      assert.equal(Boolean(VARIANTES_VISUAIS_INIMIGOS_57A[idVCheck]), true);
    }
    const codCliParity8 = gerarCodigoJsClienteBiofoil();
    const fnCliParity8 = vm.runInNewContext(
      `(function(){\n"use strict";\n${codCliParity8.slice(
        codCliParity8.indexOf('function criarContextoPrimitivasRgba960x540'),
        codCliParity8.indexOf('let estadoCliente = JSON.parse')
      )}\nreturn rasterizarQuadroRgba960x540;\n})()`,
      { Math, Number, String, Boolean, Array, Object, Set, Map, WeakMap, Uint8Array, Uint8ClampedArray, Int16Array, Int32Array }
    );
    for (let idxV = 0; idxV < idsVariantes8.length; idxV += 1) {
      const idVar = idsVariantes8[idxV];
      const alvoVar = gerarAlvoInimigoEscaladoSetor('seed-par8', idxV + 1, `NO_V_${idxV}`, { arquetipoId: idVar });
      const clV = structuredClone(estMapa);
      clV.meta.faseJogo = 'COMBATE';
      clV.alvoCombate = structuredClone(alvoVar);
      const vmV = projetarViewModelWireframe(congelarProfundo(clV));
      const hbsV = obterMapaHitboxesNativo(vmV);
      const bSrv = rasterizarQuadroRgba960x540(vmV, { tempoSeg: 0.35 }, assetsHiBit, hbsV, tabRaster);
      const bCli = fnCliParity8(vmV, { tempoSeg: 0.35 }, assetsHiBit, hbsV, tabRaster);
      let diffV = 0;
      for (let p = 0; p < bSrv.length; p += 1) {
        if (bSrv[p] !== bCli[p]) diffV += 1;
      }
      assert.equal(diffV, 0, `Paridade 0-byte violada no arquétipo ${idVar}`);
    }

    // 3. Estoque finito de Loja, reposição ao vender e digestão independente 2 SUC->1 BIO vs 2 BIO->1 SUC [MUT-O6-26]
    const clLoja = structuredClone(estMapa);
    clLoja.meta.faseJogo = 'LOJA';
    clLoja.economia = { ...(clLoja.economia ?? {}), sucata: 250, biomassa: 40, combustivel: 10, municao: 8 };
    clLoja.recursos = { ...clLoja.economia };
    const noLojaRef = clLoja.mapaSetorial.nos[0];
    clLoja.mapaSetorial.noAtualId = noLojaRef.id;
    noLojaRef.tipo = 'LOJA';
    noLojaRef.tipoNo = 'LOJA';
    let estLoja = congelarProfundo(clLoja);
    const vmLojaIni = projetarViewModelWireframe(estLoja);
    const hbsLojaIni = obterMapaHitboxesNativo(vmLojaIni);
    assert.equal(hbsLojaIni.some((h) => h.idHitbox === 'LOJA_DIGESTAO_SUC_BIO'), true);
    assert.equal(hbsLojaIni.some((h) => h.idHitbox === 'LOJA_DIGESTAO_BIO_SUC'), true);

    const resDigSucBio = despacharComandoUi(estLoja, {
      tipo: 'COMPRAR_OU_VENDER_LOJA',
      payload: { acao: 'DIGESTAO_ENZIMATICA', moedaOrigem: 'SUCATA' },
    });
    assert.equal(resDigSucBio.aceito, true);
    assert.equal(resDigSucBio.estado.economia.sucata, 248);
    assert.equal(resDigSucBio.estado.economia.biomassa, 41);

    const resDigBioSuc = despacharComandoUi(resDigSucBio.estado, {
      tipo: 'COMPRAR_OU_VENDER_LOJA',
      payload: { acao: 'DIGESTAO_ENZIMATICA', moedaOrigem: 'BIOMASSA' },
    });
    assert.equal(resDigBioSuc.aceito, true);
    assert.equal(resDigBioSuc.estado.economia.sucata, 249);
    assert.equal(resDigBioSuc.estado.economia.biomassa, 39);

    const idArmaUnicaLoja = 'CANHAO_ARPAO_CABO';
    const resCompra1 = despacharComandoUi(resDigBioSuc.estado, {
      tipo: 'COMPRAR_OU_VENDER_LOJA',
      payload: { acao: 'COMPRAR', itemOuSistemaId: idArmaUnicaLoja },
    });
    assert.equal(resCompra1.aceito, true);
    const resCompraRepetida = despacharComandoUi(resCompra1.estado, {
      tipo: 'COMPRAR_OU_VENDER_LOJA',
      payload: { acao: 'COMPRAR', itemOuSistemaId: idArmaUnicaLoja },
    });
    assert.equal(resCompraRepetida.aceito, false, '[MUT-O6-26] Item único comprado na Loja deve ficar ESGOTADO neste nó');
    assert.equal(resCompraRepetida.marcadorRejeicao, 'PRECONDICAO_NAO_ATENDIDA');

    const resVendaRepoe = despacharComandoUi(resCompra1.estado, {
      tipo: 'COMPRAR_OU_VENDER_LOJA',
      payload: { acao: 'VENDER', itemOuSistemaId: idArmaUnicaLoja },
    });
    assert.equal(resVendaRepoe.aceito, true);
    const resRecompraPosVenda = despacharComandoUi(resVendaRepoe.estado, {
      tipo: 'COMPRAR_OU_VENDER_LOJA',
      payload: { acao: 'COMPRAR', itemOuSistemaId: idArmaUnicaLoja },
    });
    assert.equal(resRecompraPosVenda.aceito, true, 'Vender a arma de volta deve repor 1 unidade na vitrine da Loja');

    // 4. PCM 16-bit com sinal (Int16Array) + mudo sincronizado em construirPaisagemSonoraCompleta
    const pcmArpao = sintetizarBufferPcmMulticamada('SFX_DISPARO_ARPAO_CABO', { sampleRate: 8000 });
    assert.equal(pcmArpao.amostrasPcmInt16 instanceof Int16Array, true);
    let temPositivo = false;
    let temNegativo = false;
    for (let i = 0; i < pcmArpao.amostrasPcmInt16.length; i += 1) {
      if (pcmArpao.amostrasPcmInt16[i] > 500) temPositivo = true;
      if (pcmArpao.amostrasPcmInt16[i] < -500) temNegativo = true;
    }
    assert.equal(temPositivo && temNegativo, true, 'PCM Int16Array deve preservar excursão positiva e negativa sem wrap unsigned');
    const clMudo = structuredClone(estMapa);
    clMudo.meta.audioMutado = true;
    const paisagemMuda = construirPaisagemSonoraCompleta(congelarProfundo(clMudo), congelarProfundo(clMudo), null);
    assert.equal(paisagemMuda.mudo, true);
    assert.equal(paisagemMuda.ganhoMasterEfetivo, 0);
    assert.equal(paisagemMuda.planoTatico85C.ganhoMaster, 0);

    // Invoca vitrine-spreads diretamente (Regra #7)
    const spreadCheck = exportarSpreadAnimacaoSteamPngBufferComHooks(
      'ARMAS_ORGAOS_SISTEMAS_4FRAMES',
      { escalaInteira: 1 },
      { projetarViewModelWireframe, interpolarEstadoVisual60Fps }
    );
    assert.equal(spreadCheck.ok, true);

    // 5. Execução ponta a ponta do /cliente.js COMPLETO (sem slice!) em node:vm contra servidor HTTP real
    function decodificarPngDataUriSemPerdas(uri) {
      const b64 = String(uri).replace(/^data:image\/png;base64,/, '');
      const bufPng = Buffer.from(b64, 'base64');
      let pos = 8;
      let width = 0;
      let height = 0;
      const chunksIdat = [];
      while (pos + 8 <= bufPng.length) {
        const len = bufPng.readUInt32BE(pos);
        const tipo = bufPng.subarray(pos + 4, pos + 8).toString('ascii');
        const dados = bufPng.subarray(pos + 8, pos + 8 + len);
        if (tipo === 'IHDR') {
          width = dados.readUInt32BE(0);
          height = dados.readUInt32BE(4);
        } else if (tipo === 'IDAT') {
          chunksIdat.push(dados);
        } else if (tipo === 'IEND') {
          break;
        }
        pos += 12 + len;
      }
      const bruto = zlib.inflateSync(Buffer.concat(chunksIdat));
      const rgba = new Uint8ClampedArray(width * height * 4);
      const stride = 1 + width * 4;
      for (let y = 0; y < height; y += 1) {
        const ini = y * stride + 1;
        rgba.set(bruto.subarray(ini, ini + width * 4), y * width * 4);
      }
      return { width, height, rgba };
    }

    const srvRt = await iniciarServidorClienteWebBiofoil({
      port: 0,
      host: '127.0.0.1',
      modoCampanhaCompleta: true,
      diretorioDados: dirTmp0810,
      estadoInicial: criarEstadoCampanhaCompleta({ seedPartida: 'seed-vm-full-0810', faseInicial: 'INICIO' }),
    });
    try {
      const htmlBoot = await (await fetch(srvRt.url)).text();
      const scriptCli = await (await fetch(`${srvRt.url}/cliente.js`)).text();
      const matchBoot = htmlBoot.match(/<script id="biofoil-bootstrap" type="application\/json">([\s\S]*?)<\/script>/);
      assert.equal(Boolean(matchBoot), true);
      const jsonBootstrapDesescapado = matchBoot[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');

      const listenersCanvas = new Map();
      const listenersWindow = new Map();
      const quadrosPutImageData = [];
      let rafCallback = null;
      const timersInterval = [];

      const telemetriaAudioVm = {
        filtrosCriados: [],
        ganhosCriados: [],
        osciladoresCriados: [],
        fontesRuidoCriadas: [],
        pannersCriados: [],
        buffersCriados: 0,
        desconexoesOnEnded: 0,
      };

      function criarAudioParamSpy(valorInicial = 1) {
        const param = {
          value: valorInicial,
          historicoTargets: [],
          setValueAtTime(v) { param.value = v; },
          linearRampToValueAtTime(v) { param.value = v; },
          exponentialRampToValueAtTime(v) { param.value = v; },
          setTargetAtTime(v) {
            param.value = v;
            param.historicoTargets.push(v);
          },
        };
        return param;
      }

      class AudioContextSpy {
        constructor() {
          this.state = 'running';
          this.sampleRate = 22050;
          this.currentTime = 0;
          this.destination = { tipo: 'DESTINATION' };
        }
        resume() { return Promise.resolve(); }
        createBiquadFilter() {
          const flt = {
            type: 'lowpass',
            frequency: criarAudioParamSpy(20000),
            Q: criarAudioParamSpy(0.7071),
            connect() {},
            disconnect() { telemetriaAudioVm.desconexoesOnEnded += 1; },
          };
          telemetriaAudioVm.filtrosCriados.push(flt);
          return flt;
        }
        createGain() {
          const g = {
            gain: criarAudioParamSpy(1),
            connect() {},
            disconnect() { telemetriaAudioVm.desconexoesOnEnded += 1; },
          };
          telemetriaAudioVm.ganhosCriados.push(g);
          return g;
        }
        createDynamicsCompressor() {
          return { connect() {}, disconnect() {} };
        }
        createStereoPanner() {
          const p = {
            pan: criarAudioParamSpy(0),
            connect() {},
            disconnect() { telemetriaAudioVm.desconexoesOnEnded += 1; },
          };
          telemetriaAudioVm.pannersCriados.push(p);
          return p;
        }
        createBuffer(canais, tamanho, taxa) {
          telemetriaAudioVm.buffersCriados += 1;
          const arr = new Float32Array(tamanho);
          return { numberOfChannels: canais, length: tamanho, sampleRate: taxa, getChannelData: () => arr };
        }
        createBufferSource() {
          const src = {
            buffer: null,
            loop: false,
            onended: null,
            connect() {},
            disconnect() { telemetriaAudioVm.desconexoesOnEnded += 1; },
            start() {},
            stop() { if (typeof src.onended === 'function') src.onended(); },
          };
          telemetriaAudioVm.fontesRuidoCriadas.push(src);
          return src;
        }
        createOscillator() {
          const osc = {
            type: 'sine',
            frequency: criarAudioParamSpy(440),
            onended: null,
            connect() {},
            disconnect() { telemetriaAudioVm.desconexoesOnEnded += 1; },
            start() {},
            stop() { if (typeof osc.onended === 'function') osc.onended(); },
          };
          telemetriaAudioVm.osciladoresCriados.push(osc);
          return osc;
        }
      }

      class ImageVm {
        constructor() {
          this.onload = null;
          this.onerror = null;
          this.naturalWidth = 0;
          this.naturalHeight = 0;
          this.width = 0;
          this.height = 0;
          this._rgba = null;
        }
        set src(uri) {
          try {
            const dec = decodificarPngDataUriSemPerdas(uri);
            this.naturalWidth = dec.width;
            this.naturalHeight = dec.height;
            this.width = dec.width;
            this.height = dec.height;
            this._rgba = dec.rgba;
            Promise.resolve().then(() => {
              if (typeof this.onload === 'function') this.onload();
            });
          } catch (err) {
            Promise.resolve().then(() => {
              if (typeof this.onerror === 'function') this.onerror(err);
            });
          }
        }
      }

      const canvasPrincipal = {
        width: 960,
        height: 540,
        style: { cursor: 'crosshair' },
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }),
        addEventListener(tipo, fn) {
          listenersCanvas.set(tipo, fn);
        },
        getContext() {
          return {
            imageSmoothingEnabled: false,
            fillStyle: '#000',
            strokeStyle: '#000',
            font: '8px monospace',
            clearRect() {},
            fillRect() {},
            strokeRect() {},
            fillText() {},
            createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
            putImageData(imgData) {
              quadrosPutImageData.push(new Uint8ClampedArray(imgData.data));
            },
          };
        },
      };

      const documentVm = {
        getElementById(id) {
          if (id === 'biofoil-canvas') return canvasPrincipal;
          if (id === 'biofoil-bootstrap') return { textContent: jsonBootstrapDesescapado };
          return null;
        },
        createElement(tag) {
          if (tag === 'canvas') {
            let bufOff = null;
            const cOff = {
              width: 1,
              height: 1,
              getContext: () => ({
                imageSmoothingEnabled: false,
                drawImage(img) {
                  bufOff = img._rgba;
                },
                getImageData: (x, y, w, h) => ({ width: w, height: h, data: bufOff || new Uint8ClampedArray(w * h * 4) }),
              }),
            };
            return cOff;
          }
          return {};
        },
      };

      const windowVm = {
        AudioContext: AudioContextSpy,
        Image: ImageVm,
        matchMedia: () => ({ matches: false }),
        requestAnimationFrame(cb) {
          rafCallback = cb;
          return 1;
        },
        addEventListener(tipo, fn) {
          listenersWindow.set(tipo, fn);
        },
      };

      const ctxFullCli = vm.createContext({
        window: windowVm,
        document: documentVm,
        fetch: (urlRel, init) => fetch(`${srvRt.url}${urlRel}`, init),
        setInterval: (fn) => {
          timersInterval.push(fn);
          return timersInterval.length;
        },
        clearInterval: () => {},
        Promise,
        JSON,
        Math,
        Number,
        String,
        Boolean,
        Array,
        Object,
        Set,
        Map,
        WeakMap,
        RegExp,
        Uint8Array,
        Uint8ClampedArray,
        Int16Array,
        Int32Array,
        Float32Array,
        Float64Array,
      });

      vm.runInContext(scriptCli, ctxFullCli);

      // Aguarda decodificação assíncrona de todos os data-URIs de /api/assets-60fps
      for (let tent = 0; tent < 40 && quadrosPutImageData.length === 0; tent += 1) {
        await new Promise((r) => setTimeout(r, 15));
        if (rafCallback) rafCallback(16.67 * (tent + 1));
      }
      assert.equal(quadrosPutImageData.length >= 1, true, '/cliente.js deve decodificar /api/assets-60fps e pintar no Canvas via putImageData');

      // Clica em HANGAR_INICIAR_RUN no Canvas real -> transiciona INICIO -> MAPA e inicializa grafo WebAudio!
      const hbIniciar = obterMapaHitboxesNativo(JSON.parse(jsonBootstrapDesescapado).viewModel).find(
        (h) => h.idHitbox === 'HANGAR_INICIAR_RUN'
      );
      const cxIni = hbIniciar.x + Math.floor(hbIniciar.largura / 2);
      const cyIni = hbIniciar.y + Math.floor(hbIniciar.altura / 2);
      listenersCanvas.get('mousedown')({ button: 0, clientX: cxIni, clientY: cyIni });
      listenersCanvas.get('click')({ button: 0, shiftKey: false, clientX: cxIni, clientY: cyIni });
      await new Promise((r) => setTimeout(r, 45));
      rafCallback(500);

      const estSrvMapa = await (await fetch(`${srvRt.url}/api/estado`)).json();
      assert.equal(estSrvMapa.viewModel.faseJogo, 'MAPA');
      assert.equal(telemetriaAudioVm.buffersCriados, 1, 'Motor WebAudio do cliente deve gerar o buffer de ruído rosa marítimo');
      assert.equal(telemetriaAudioVm.fontesRuidoCriadas.length >= 2, true, 'Chuva + hidrofólio contínuos devem usar BufferSource de ruído rosa');

      // KeyU abre OFICINA e Escape fecha OFICINA via listener real de teclado do /cliente.js
      listenersWindow.get('keydown')({ code: 'KeyU', shiftKey: false, preventDefault() {} });
      await new Promise((r) => setTimeout(r, 35));
      const estSrvOfic = await (await fetch(`${srvRt.url}/api/estado`)).json();
      assert.equal(estSrvOfic.viewModel.modalCampanhaAtivo, 'OFICINA');

      listenersWindow.get('keydown')({ code: 'Escape', shiftKey: false, preventDefault() {} });
      await new Promise((r) => setTimeout(r, 35));
      const estSrvFechou = await (await fetch(`${srvRt.url}/api/estado`)).json();
      assert.equal(estSrvFechou.viewModel.modalCampanhaAtivo, null);

      // Salta para um nó do Mapa -> entra em COMBATE ou EVENTO; força salto até COMBATE ou aciona tecla M (MERGULHO_TATICO) e KeyK (Mudo)
      const hbNo = (estSrvFechou.hitboxes || []).find((h) => h.tipo === 'NO_MAPA' && h.metadados?.alcancavel);
      assert.ok(
        hbNo,
        '[MUT-O6-40] Mapa setorial deve expor nós adjacentes com metadados.alcancavel === true nas hitboxes'
      );
      listenersCanvas.get('click')({
        button: 0,
        shiftKey: false,
        clientX: hbNo.x + 6,
        clientY: hbNo.y + 6,
      });
      await new Promise((r) => setTimeout(r, 45));
      // Tecla M (em Combate recolhe foil -> filtroMaster 400 Hz + SFX 4 camadas com StereoPannerNode!)
      listenersWindow.get('keydown')({ code: 'KeyM', shiftKey: false, preventDefault() {} });
      await new Promise((r) => setTimeout(r, 40));
      rafCallback(1400);

      // Tecla K alterna mudo real sincronizado Servidor <-> Cliente (ganhoMaster === 0)
      listenersWindow.get('keydown')({ code: 'KeyK', shiftKey: false, preventDefault() {} });
      await new Promise((r) => setTimeout(r, 40));
      const estSrvMudo = await (await fetch(`${srvRt.url}/api/estado`)).json();
      assert.equal(estSrvMudo.paisagemSonora.mudo, true, 'KeyK no browser deve mutar paisagemSonora no servidor e cliente');
      const ganhoMasterVm = telemetriaAudioVm.ganhosCriados[0];
      assert.equal(ganhoMasterVm.gain.value, 0, 'ganhoMaster do WebAudio cliente deve cair imediatamente a 0 no mute');
      assert.equal(telemetriaAudioVm.desconexoesOnEnded > 0, true, 'Nós efêmeros WebAudio devem chamar disconnect() em onended');

      console.log(
        `[N4] Portão 08.10 examinado: 6 submódulos de renderização, 8 arquétipos 5.7.A (0 diff), topologias 5/6 salas, estoque finito de Loja, PCM Int16 e /cliente.js completo em VM (${quadrosPutImageData.length} quadros Canvas, ${telemetriaAudioVm.osciladoresCriados.length} osciladores WebAudio)`
      );
    } finally {
      await srvRt.fechar();
    }
  } finally {
    fs.rmSync(dirTmp0810, { recursive: true, force: true });
  }
});

test('Portão 08.11 — Arquitetura Modular 22 Módulos Onda 6, Regen Barreira 2.0s [MUT-O6-27], Preservação de Órgãos [MUT-O6-28], Hangar Bloqueado [MUT-O6-29], Áudio 32 Passos/Zero Replay [MUT-O6-30] e ES Modules Nativos', async () => {
  // 1. Cobertura direta da SSOT de geometria 960x540 (geometria-layout-960.mjs)
  const objCongelado = congelarProfundoClienteSeguro({ a: [1, { b: 2 }] });
  assert.equal(Object.isFrozen(objCongelado), true);
  assert.equal(Object.isFrozen(objCongelado.a), true);
  assert.equal(Object.isFrozen(objCongelado.a[1]), true);

  const layoutFoil = calcularLayoutPlacaCamaras960(false, false);
  const layoutTd = calcularLayoutPlacaCamaras960(true, false);
  assert.equal(layoutFoil.larguraCam, 77);
  assert.equal(layoutTd.toposY[0] - layoutFoil.toposY[0], 4);

  const cardH0 = calcularRetanguloCardHangar960(0, 0);
  assert.equal(cardH0.largura, 176);
  assert.equal(cardH0.altura, 272);

  const cardL0 = calcularRetanguloCardLoja960(0, 0);
  assert.equal(cardL0.largura, 192);
  const pillPorao2 = calcularRetanguloVendaPoraoLoja960(2, 0);
  assert.equal(pillPorao2.largura, 89);

  const geomOfic = calcularGeometriaOficina960(0);
  assert.equal(geomOfic.arvoreUpgrade(0).largura, 218);
  assert.equal(geomOfic.caixaSlotDorsal(0).altura, 46);
  assert.equal(geomOfic.btnAbandonarRun.altura, 22);

  const modaisRect = calcularRetangulosModaisCampanha960(0);
  assert.equal(modaisRect.saqueBtnConfirmar.altura, 34);
  assert.equal(modaisRect.desfechoEventoBtnConfirmar.altura, 34);

  const salasRect5 = calcularRetangulosSalasAlvo960(
    [1, 2, 3, 4, 5].map((id) => ({ id })),
    { ehChefeDraga: false, ehMonstroAlvo: false, faseChefe: 0 }
  );
  assert.equal(salasRect5.length, 5);

  // 2. Cobertura direta dos módulos puros extraídos (hitboxes-layout, interpolador-60fps, renderizador-canvas2d-primitivas, renderizador-hud-tooltips)
  const coordDir = converterCoordenadaHitboxDireta(480, 270, { left: 0, top: 0, width: 960, height: 540 });
  assert.equal(coordDir.xNativo, 480);
  assert.equal(coordDir.yNativo, 270);

  const estCombDir = criarEstadoCampanhaCompleta({ faseInicial: 'COMBATE', seedPartida: 'seed-0811-dir' });
  const vmCombDir = projetarViewModelWireframe(estCombDir);
  const hbsDir = obterMapaHitboxesDireto(vmCombDir);
  assert.equal(hbsDir.length >= 20, true);
  const ghostDir = calcularGhostPreviewDireto(estCombDir, 'BTN_DRENAR_SEGURO');
  assert.equal(ghostDir.ativo, true);

  const ev60Dir = interpolar60FpsDireto(null, vmCombDir, 1 / 60, { hitboxes: hbsDir, hoverHitboxId: 'BTN_DRENAR_SEGURO' });
  assert.equal(Object.isFrozen(ev60Dir), true);

  const atlasDir = obterAtlasPrimitivasDireto();
  assert.equal(Object.isFrozen(atlasDir), true);
  const sprDir = rasterizarSpriteDireto('aliados', 'POLVO');
  assert.equal(sprDir.bytesRgba.length > 0, true);
  const frame2dDir = renderizarCanvas2dDireto(vmCombDir);
  assert.equal(frame2dDir.comandosDesenho.length > 10, true);
  const encCamDir = calcularEncaixeCamaraDireto(1, ['POLVO', 'ARRAIA'], 0);
  assert.equal(encCamDir.zeroColisaoEntreSlots, true);
  const encDorDir = calcularEncaixeDorsalDireto(0, 'EMISSOR_ACUSTICO_I', 1, true);
  assert.equal(encDorDir.zeroColisaoTopoCamaras, true);

  const assets0811 = obterAssetsConceitoHiBit();
  const tab0811 = obterTabelasRasterUnificado();
  const caches0811 = {};
  const ctxHudDir = criarContextoPrimitivasRgba960x540(
    vmCombDir,
    { exibirTooltipHover: true, hoverHitboxId: 'BTN_LANCAR_ABORDAGEM', avisoToastTexto: 'AVISO TATICO DE TESTE' },
    assets0811,
    hbsDir,
    tab0811,
    caches0811
  );
  renderizarHudSuperiorTermometroERodape(ctxHudDir);
  renderizarTooltipContextualEAvisoToast(ctxHudDir);
  let pixelsToast = 0;
  for (let i = 3; i < ctxHudDir.rgba.length; i += 2048) {
    if (ctxHudDir.rgba[i] > 0) pixelsToast += 1;
  }
  assert.equal(pixelsToast > 10, true);

  // 3. Regen de Barreira Acústica Inimiga 2.0s/bolha ([MUT-O6-27]) + Grafo/BFS Interno + SONAR vs Tinta
  assert.equal(resolverGrafoBeamAlvoInterno({ classeAlvo: 'CHEFE_DRAGA', faseChefe: 3 })[1].includes(2), true);
  const caminhoInt = calcularCaminhoCurtoGrafoAlvoInterno(
    { classeAlvo: 'BARCO_HUMANO', salasOuOrgaos: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] },
    1,
    4
  );
  assert.equal(caminhoInt[0], 1);
  assert.equal(caminhoInt[caminhoInt.length - 1], 4);

  const cloneBarcoEscudo = structuredClone(estCombDir);
  cloneBarcoEscudo.alvoCombate = structuredClone(
    gerarAlvoInimigoEscaladoSetor('seed-0811-escudo', 4, 'N_S4', {
      arquetipoId: 'BARCO_2_CORVETA',
    })
  );
  recalcularSubsistemasAlvoInPlace(cloneBarcoEscudo.alvoCombate);
  const maxBolhasInimigo = Number(cloneBarcoEscudo.alvoCombate.tetoBolhasBarreira);
  assert.equal(maxBolhasInimigo >= 1, true);
  cloneBarcoEscudo.alvoCombate.camadasBarreiraAtivas = 0;
  cloneBarcoEscudo.alvoCombate.barreiraBolhasAtual = 0;
  cloneBarcoEscudo.alvoCombate.progressoRegenBarreiraSeg = 0;
  // Suprime disparos do jogador p/ medir isoladamente a regeneração de 2.0s da Barreira inimiga
  cloneBarcoEscudo.naveJogador.armasAtivas = [];
  let estPosRegen = congelarProfundo(cloneBarcoEscudo);
  for (let i = 0; i < 8; i += 1) {
    estPosRegen = avancarTickDireto(estPosRegen, 0.25, { suprimirAtaqueInimigoMutacao: true });
  }
  assert.equal(
    estPosRegen.alvoCombate.camadasBarreiraAtivas,
    1,
    '[MUT-O6-27] Barco inimigo com sistema ESCUDO íntegro deve regenerar 1 bolha de Barreira Acústica a cada 2.0s'
  );

  // Chefe Draga Fase 3 também regenera bolhas a 2.0s/bolha quando a Blindagem Térmica Externa (10 pts) já foi rompida
  let estDragaRegen = congelarProfundo({
    ...structuredClone(estCombDir),
    naveJogador: { ...structuredClone(estCombDir.naveJogador), armasAtivas: [] },
    alvoCombate: {
      ...structuredClone(criarEstadoChefeDraga(3)),
      blindagemTermicaExternaPts: 0,
      camadasBarreiraAtivas: 0,
      barreiraBolhasAtual: 0,
      progressoRegenBarreiraSeg: 0,
    },
  });
  for (let i = 0; i < 8; i += 1) {
    estDragaRegen = avancarTickChefeDraga(estDragaRegen, 0.25);
  }
  assert.equal(estDragaRegen.alvoCombate.camadasBarreiraAtivas, 1);

  // SONAR inimigo íntegro corta Tinta Furtiva pela metade e limpa cegueira de Bolsa de Tinta
  const cloneSonar = structuredClone(estCombDir);
  cloneSonar.naveJogador.armasAtivas = [];
  cloneSonar.naveJogador.furtividadeAtivaSeg = 4.0;
  cloneSonar.alvoCombate.salasOuOrgaos = [
    { id: 1, nome: 'LEME', integridadeAtual: 2, integridadeMax: 2, cegaPorTinta: true, tripulantes: [{ id: 'h1', hpAtual: 100 }] },
    { id: 2, nome: 'SONAR', integridadeAtual: 2, integridadeMax: 2, cegaPorTinta: false, tripulantes: [] },
    { id: 3, nome: 'ARMAS', integridadeAtual: 2, integridadeMax: 2, cegaPorTinta: true, tripulantes: [] },
    { id: 4, nome: 'CASCO', integridadeAtual: 2, integridadeMax: 2, cegaPorTinta: false, tripulantes: [] },
  ];
  const estPosSonar = avancarTickDireto(congelarProfundo(cloneSonar), 1.0, { suprimirAtaqueInimigoMutacao: true });
  assert.equal(estPosSonar.naveJogador.furtividadeAtivaSeg, 2.0, 'SONAR inimigo ativo deve consumir Tinta Furtiva a 2x (4.0s -> 2.0s em 1.0s)');
  assert.equal(estPosSonar.alvoCombate.salasOuOrgaos[0].cegaPorTinta, false, 'SONAR inimigo ativo deve anular cegueira de tinta nas salas');
  assert.equal(projetarViewModelWireframe(estPosSonar).painelAlvo.sonarMilitarAtivo, true);

  // 4. Loja: Preservação de Órgãos Enxertados ao vender arma equipada ([MUT-O6-28]) + Venda de qualquer slot do Porão
  const estLojaOrg = congelarProfundo({
    ...structuredClone(estCombDir),
    meta: { ...estCombDir.meta, faseJogo: 'LOJA', itensCompradosLojaAtual: [] },
    economia: { ...estCombDir.economia, sucata: 20, biomassa: 10 },
    naveJogador: {
      ...structuredClone(estCombDir.naveJogador),
      armasAtivas: [
        {
          slotIndex: 0,
          arma: {
            id: 'CANHAO_ARPAO_CABO',
            chassiId: 'CANHAO_ARPAO_CABO',
            energiaCusto: 1,
            soquetesMax: 1,
            orgaosEnxertados: ['ELETRO_PLACA_ARRAIA'],
            tempoRecargaBaseSeg: 10,
            progressoRecargaSeg: 0,
            salaAlvoId: 1,
          },
        },
        { slotIndex: 1, arma: null },
      ],
      poraoCarga: [
        { slotIndex: 0, item: null },
        { slotIndex: 1, item: null },
        { slotIndex: 2, item: { id: 'GLANDULA_BAIACU', tipo: 'ORGAO', pesoKg: 0, valorVenda: 15 } },
        { slotIndex: 3, item: null },
      ],
    },
  });
  const resVendaPorao2 = despacharComandoUi(estLojaOrg, {
    tipo: 'COMPRAR_OU_VENDER_LOJA',
    payload: { acao: 'VENDER', itemOuSistemaId: 'GLANDULA_BAIACU', indicePorao: 2 },
  });
  assert.equal(resVendaPorao2.aceito, true);
  assert.equal(resVendaPorao2.estado.naveJogador.poraoCarga[2].item, null);
  assert.equal(resVendaPorao2.estado.economia.biomassa >= 25, true);

  const resVendaArmaComOrgao = despacharComandoUi(resVendaPorao2.estado, {
    tipo: 'COMPRAR_OU_VENDER_LOJA',
    payload: { acao: 'VENDER', itemOuSistemaId: 'CANHAO_ARPAO_CABO', slotArmaIndex: 0 },
  });
  assert.equal(resVendaArmaComOrgao.aceito, true);
  assert.equal(
    resVendaArmaComOrgao.estado.naveJogador.poraoCarga.some((s) => s.item?.id === 'ELETRO_PLACA_ARRAIA'),
    true,
    '[MUT-O6-28] Vender arma equipada na Loja deve preservar e devolver seus órgãos enxertados ao Porão de Carga'
  );

  // 5. Campanha: Hangar bloqueia carcaças trancadas ([MUT-O6-29]), Modal EVENTO_DESFECHO e Abandonar Expedição em 2 etapas
  const estHangarTrancado = criarEstadoCampanhaCompleta({
    seedPartida: 'seed-0811-lock',
    faseInicial: 'INICIO',
    perfilInicial: criarPerfilInicial(),
  });
  const resTrancado = executarAcaoCampanhaCompleta(estHangarTrancado, {
    tipoAcao: 'INICIAR_NOVA_RUN',
    idArquitetura: 'MANTA_VOLT',
    seedPartida: 'seed-0811-lock',
  });
  assert.equal(
    resTrancado.ok,
    false,
    '[MUT-O6-29] INICIAR_NOVA_RUN deve rejeitar bio-nave bloqueada no profile.json com CARCACA_BLOQUEADA_NO_PERFIL'
  );
  assert.equal(
    resTrancado.codigoErro,
    'CARCACA_BLOQUEADA_NO_PERFIL',
    '[MUT-O6-29] INICIAR_NOVA_RUN deve rejeitar bio-nave bloqueada no profile.json com CARCACA_BLOQUEADA_NO_PERFIL'
  );

  let estRunAlfa = executarAcaoCampanhaCompleta(estHangarTrancado, {
    tipoAcao: 'INICIAR_NOVA_RUN',
    idArquitetura: 'CARCACA_ALFA',
    seedPartida: 'seed-0811-alfa',
  }).estado;
  assert.equal(estRunAlfa.meta.faseJogo, 'MAPA');

  // Abandono em 2 cliques dentro da Oficina
  estRunAlfa = executarAcaoCampanhaCompleta(estRunAlfa, { tipoAcao: 'ABRIR_FECHAR_OFICINA' }).estado;
  const resAband1 = executarAcaoCampanhaCompleta(estRunAlfa, { tipoAcao: 'ABANDONAR_EXPEDICAO' });
  assert.equal(resAband1.aguardaConfirmacao, true);
  assert.equal(resAband1.estado.meta.faseJogo, 'MAPA');
  const resAband2 = executarAcaoCampanhaCompleta(resAband1.estado, { tipoAcao: 'ABANDONAR_EXPEDICAO' });
  assert.equal(resAband2.estado.meta.faseJogo, 'INICIO');
  assert.equal(resAband2.estado.meta.temRunSalvaDisponivel, false);

  // Modal EVENTO_DESFECHO e renderizarModalDesfechoEventoOverlay
  const estEvDesfecho = congelarProfundo({
    ...structuredClone(estCombDir),
    meta: {
      ...estCombDir.meta,
      faseJogo: 'EVENTO',
      modalCampanhaAtivo: null,
      eventoAtual: {
        id: 'SOS_1_REDE_ARRASTO',
        categoria: 'SOS',
        titulo: 'Rede de Arrasto Fantasma',
        opcoes: [{ letra: 'A', rotulo: 'Cortar cabos' }, { letra: 'B', rotulo: 'Extrair Biomassa' }],
      },
    },
  });
  const resEscEv = executarAcaoCampanhaCompleta(estEvDesfecho, {
    comandoMotor: {
      tipo: 'ESCOLHER_OPCAO_EVENTO',
      payload: { idEvento: 'SOS_1_REDE_ARRASTO', categoriaEvento: 'SOS', opcao: 'C' },
    },
  });
  assert.equal(resEscEv.ok, true);
  assert.equal(resEscEv.estado.meta.modalCampanhaAtivo, 'EVENTO_DESFECHO');
  const vmDesf = projetarViewModelWireframe(resEscEv.estado);
  const hbsDesf = obterMapaHitboxesDireto(vmDesf);
  assert.equal(hbsDesf.some((h) => h.idHitbox === 'EVENTO_DESFECHO_CONFIRMAR'), true);
  const ctxDesf = criarContextoPrimitivasRgba960x540(vmDesf, {}, assets0811, hbsDesf, tab0811, caches0811);
  renderizarViewportCampanhaNaoCombate(ctxDesf);
  renderizarModalDesfechoEventoOverlay(ctxDesf);
  const resConfDesf = executarAcaoCampanhaCompleta(resEscEv.estado, { tipoAcao: 'CONFIRMAR_DESFECHO_EVENTO' });
  assert.equal(resConfDesf.estado.meta.modalCampanhaAtivo, null);
  assert.equal(resConfDesf.estado.meta.faseJogo, 'MAPA');

  // 6. Tradutor Input DOM direto: Trinca Beam, Hangar Digit2, Botão Direito SALA_ALVO -> salaAlvoAbordagemId
  const trincaDom = construirTrincaBeamAssistidaDom(estCombDir.alvoCombate, 1, 2);
  assert.equal(trincaDom.length, 3);
  const vmHangTr = projetarViewModelWireframe(estHangarTrancado);
  const trHangD2 = traduzirInputDomDireto({ tipoEvento: 'KEYDOWN', code: 'Digit2' }, estHangarTrancado, vmHangTr, {});
  assert.equal(trHangD2.acaoCampanhaUi.payload.idArquitetura, 'MANTA_VOLT');
  const hbSala3 = hbsDir.find((h) => h.idHitbox === 'SALA_ALVO_3');
  const trBotDirSala3 = traduzirInputDomDireto(
    {
      tipoEvento: 'CLICK',
      botaoMouse: 2,
      clientX: hbSala3.x + 8,
      clientY: hbSala3.y + 8,
      retanguloCanvas: { left: 0, top: 0, width: 960, height: 540 },
    },
    estCombDir,
    vmCombDir,
    { modoOrdemAbordagem: false, salaAlvoAbordagemId: 1 }
  );
  assert.equal(trBotDirSala3.acaoLocalUi, 'SELECIONAR_SALA_ABORDAGEM');
  assert.equal(trBotDirSala3.salaAlvoAbordagemId, 3);

  // 7. Áudio Marítimo: 32 passos A/B/A'/C, SFX em comandos de jogador/campanha e ZERO replay em Pausa/Hover ([MUT-O6-30])
  for (const tr of Object.values(ESTADOS_TRILHA_ADAPTATIVA_BIOFOIL)) {
    assert.equal(tr.notasBaixoHz.length, 32);
    assert.equal(tr.notasArpejoHz.length, 32);
    assert.equal(tr.mascaraRitmoArpejo.length, 32);
  }
  const estComDisparoAntigo = congelarProfundo({
    ...structuredClone(estCombDir),
    meta: {
      ...estCombDir.meta,
      tickAtual: 12,
      eventosVisuaisUltimoTick: [{ idEvento: 99, tipo: 'DISPARO_JOGADOR', chassiId: 'CANHAO_ARPAO_CABO' }],
    },
  });
  const estMesmoTickPausa = congelarProfundo(structuredClone(estComDisparoAntigo));
  const sfxEmPausaSemComando = extrairSfxMulticamadaDoTick(estComDisparoAntigo, estMesmoTickPausa, null);
  assert.equal(
    sfxEmPausaSemComando.length,
    0,
    '[MUT-O6-30] Comandos em Pausa Tática ou MOUSEMOVE sem avanço de tick jamais podem re-tocar disparos antigos de eventosVisuaisUltimoTick'
  );
  const sfxAlocarEnergia = extrairSfxMulticamadaDoTick(estComDisparoAntigo, estMesmoTickPausa, {
    aceito: true,
    comandoExecutado: { tipo: 'ALOCAR_ENERGIA' },
  });
  assert.equal(sfxAlocarEnergia.length, 1);
  assert.equal(sfxAlocarEnergia[0].idSfx, 'SFX_BARREIRA_BOLHA');

  // Cobertura direta de sintetizador-webaudio-cliente.mjs e runtime-navegador.mjs
  const motorDireto = criarMotorAudioMaritimoCliente({});
  assert.equal(motorDireto.garantirGrafo(), false);
  assert.equal(motorDireto.ajustarVolume(0.5), 0.5);
  assert.equal(motorDireto.alternarMudo(), true);

  assert.equal(
    formatarMensagemRejeicaoUi('CARCACA_BLOQUEADA_NO_PERFIL').includes('BLOQUEADA'),
    true
  );
  const toastCtrl = criarControladorToastCliente(2.0);
  toastCtrl.acionarToast('TESTE TOAST');
  assert.equal(toastCtrl.obterTextoAtivo(), 'TESTE TOAST');
  toastCtrl.avancarTempo(2.5);
  assert.equal(toastCtrl.obterTextoAtivo(), '');
  assert.equal(iniciarRuntimeDomBiofoil(null, null, null), null);

  // 8. Servidor HTTP: rotas ES Modules nativas (/onda6-ui/*.mjs) + bloqueio de traversal + HTML ESM
  const htmlEsm = gerarHtmlClienteJogavelBiofoil(estCombDir, { usarModulosEsmNativos: true });
  assert.equal(htmlEsm.includes('type="module" src="/onda6-ui/runtime-navegador.mjs"'), true);

  const srvEsm = await iniciarServidorClienteWebBiofoil({ modoCampanhaCompleta: true, seedInicial: 'seed-0811-esm' });
  try {
    let modulosServidos = 0;
    for (const nomeMod of MODULOS_ESM_NAVEGADOR_ONDA6) {
      const rMod = await fetch(`${srvEsm.url}/onda6-ui/${nomeMod}`);
      assert.equal(rMod.status, 200);
      assert.equal((rMod.headers.get('content-type') ?? '').includes('application/javascript'), true);
      const txtMod = await rMod.text();
      assert.equal(txtMod.length > 100, true);
      modulosServidos += 1;
    }
    assert.equal(modulosServidos, 9);
    const rTraversal = await fetch(`${srvEsm.url}/onda6-ui/../gdd-parser.mjs`);
    assert.equal(rTraversal.status, 404);

    console.log(
      `[N4] Portão 08.11 examinado: ${modulosServidos} módulos ES nativos servidos sem .toString(), 10 árvores Oficina, 32 passos musicais A/B/A'/C e mutações MUT-O6-27..30 validadas`
    );
  } finally {
    await srvEsm.fechar();
  }
});

test('Portão 08.12: Encontros/Eventos Canônicos, Power Surges F2/F3 da Draga em Tempo Real, Sonar Militar Dinâmico, WebAudio Lookahead + Ducking 900Hz e Isolamento de Modais [MUT-O6-31, MUT-O6-32]', () => {
  // 1. Cobertura direta 100% de src/onda6-ui/encontros-eventos-campanha.mjs (Regra #7 + Lei L4)
  assert.equal(ACOES_CAMPANHA_BIOFOIL.CONFIRMAR_DESFECHO_EVENTO, 'CONFIRMAR_DESFECHO_EVENTO');
  assert.equal(MODOS_DISPARO_ARMAS.MANUAL, 'MANUAL');

  const submarino57a = gerarAlvoInimigoEscaladoSetor('seed-0812-sub', 6, 'NO_SUB_6', {
    arquetipoId: 'BARCO_4_SUBMARINO',
  });
  assert.equal(submarino57a.salasOuOrgaos.length, 6);
  assert.equal(possuiSalaSonarAlvo(submarino57a), true);
  assert.equal(possuiSonarMilitarAtivoAlvo(submarino57a), true);

  const grafoSub6 = resolverGrafoOrtogonalAlvo(submarino57a);
  assert.deepEqual(grafoSub6[1], [2, 3, 4]);
  const rotaSub = calcularCaminhoCurtoGrafoAlvo(submarino57a, 1, 6);
  assert.equal(rotaSub[0], 1);
  assert.equal(rotaSub[rotaSub.length - 1], 6);

  const dragaF2 = criarEstadoChefeDraga(2);
  assert.equal(dragaF2.temSonarMilitar, true);
  assert.equal(possuiSonarMilitarAtivoAlvo(dragaF2), true);
  const dragaF2SonarQuebrado = structuredClone(dragaF2);
  const s4Draga = dragaF2SonarQuebrado.salasOuOrgaos.find((s) => s.id === 4);
  s4Draga.integridadeAtual = 0;
  s4Draga.integridade = 0;
  const estComDragaF2 = congelarProfundo({
    ...structuredClone(criarEstadoInicialPartida({ seedPartida: 'seed-0812-draga2' })),
    alvoCombate: dragaF2SonarQuebrado,
  });
  const dragaF2Tickada = avancarTickChefeDraga(estComDragaF2, 0.25);
  assert.equal(dragaF2Tickada.alvoCombate.sonarMilitarAtivo, false);

  const estBaseMapa = anexarMapaSetorAoEstado(
    criarEstadoInicialPartida({ seedPartida: 'seed-0812-mapa' }),
    'seed-0812-mapa',
    2
  );
  assert.equal(estBaseMapa.mapaSetorial.setorNumero, 2);
  assert.equal(Object.isFrozen(estBaseMapa), true);

  const noEventoReal =
    estBaseMapa.mapaSetorial.nos.find((n) => n.tipoNo === 'EVENTO' || n.tipoNo === 'SOS') ?? {
      id: 'NO_EV_0812',
      tipoNo: 'SOS',
      idTemplateEvento: 'SOS_2_CAPSULA_AFUNDANDO',
      xMn: 20,
      tPrazoHoras: 12,
    };
  const estEmEvento = resolverEntradaNoMapaCampanha(estBaseMapa, noEventoReal);
  assert.equal(['EVENTO', 'COMBATE', 'LOJA'].includes(estEmEvento.meta.faseJogo), true);

  // 2. Desfecho Canônico de Evento + Recrutamento/Carga na Opção Azul Real (SOS_4_COMBOIO_ENCALHADO + SOS_1_REDE_ARRASTO) [MUT-O6-32]
  const estMantaEvento = structuredClone(
    criarEstadoCampanhaCompleta({
      faseInicial: 'MAPA',
      idArquitetura: 'MANTA_VOLT',
      seedPartida: 'seed-0812-ev',
      opcoesPersistencia: { ignorarBloqueioCarcaca: true },
    })
  );
  estMantaEvento.meta.faseJogo = 'EVENTO';
  estMantaEvento.economia.sucata = 40;
  estMantaEvento.recursos.sucata = 40;
  estMantaEvento.eventoAtual = {
    noId: 'NO_SOS_4',
    tipoNo: 'SOS',
    idTemplateEvento: 'SOS_4_COMBOIO_ENCALHADO',
    titulo: '4. Cargueiro Corporativo em Pane',
    noMapa: {
      id: 'NO_SOS_4',
      tipoNo: 'SOS',
      idTemplateEvento: 'SOS_4_COMBOIO_ENCALHADO',
      xMn: 30,
      tPrazoHoras: 12,
    },
  };
  const armasPoraoAntes = (estMantaEvento.naveJogador.poraoCarga ?? []).filter((s) => s?.item?.tipo === 'ARMA').length;

  const resEscolhaCamp = executarAcaoCampanhaCompleta(congelarProfundo(estMantaEvento), {
    tipoAcao: 'ESCOLHER_OPCAO_EVENTO',
    payload: { opcao: 'B', idEvento: 'SOS_4_COMBOIO_ENCALHADO' },
  });
  assert.equal(resEscolhaCamp.ok, true);
  assert.equal(resEscolhaCamp.estado.meta.modalCampanhaAtivo, 'EVENTO_DESFECHO');
  const armasPoraoDepois = (resEscolhaCamp.estado.naveJogador.poraoCarga ?? []).filter((s) => s?.item?.tipo === 'ARMA').length;
  assert.equal(armasPoraoDepois, armasPoraoAntes + 1, 'Blue Option de SOS_4_COMBOIO_ENCALHADO deve depositar 1 arma recuperada no Porão');
  assert.equal(
    resEscolhaCamp.estado.meta.desfechoEventoPendente.deltaSucata > 0,
    true,
    '[MUT-O6-32] construirDesfechoEventoCanonicamente deve preservar os deltas reais de recursos e bônus de recrutamento/carga do Evento'
  );
  assert.equal(
    resEscolhaCamp.estado.meta.desfechoEventoPendente.bonusEspecialTexto.includes('PORÃO'),
    true
  );

  // Recrutamento real via COURACA_LIMIAR (2 Caranguejos) em SOS_1_REDE_ARRASTO (Opção Azul B) + construirDesfechoEventoCanonicamente direto
  const estCouracaEvento = structuredClone(
    criarEstadoCampanhaCompleta({
      faseInicial: 'MAPA',
      idArquitetura: 'COURACA_LIMIAR',
      seedPartida: 'seed-0812-recruta',
      opcoesPersistencia: { ignorarBloqueioCarcaca: true },
    })
  );
  estCouracaEvento.meta.faseJogo = 'EVENTO';
  estCouracaEvento.eventoAtual = {
    noId: 'NO_SOS_1',
    tipoNo: 'SOS',
    idTemplateEvento: 'SOS_1_REDE_ARRASTO',
    noMapa: { id: 'NO_SOS_1', tipoNo: 'SOS', idTemplateEvento: 'SOS_1_REDE_ARRASTO', xMn: 25, tPrazoHoras: 12 },
  };
  const tripAntesRec = estCouracaEvento.naveJogador.tripulacao.length;
  const resEscolhaUi = despacharComandoUi(congelarProfundo(estCouracaEvento), {
    tipo: 'ESCOLHER_OPCAO_EVENTO',
    payload: { opcao: 'B', idEvento: 'SOS_1_REDE_ARRASTO' },
  });
  assert.equal(resEscolhaUi.aceito, true);
  assert.equal(resEscolhaUi.estado.naveJogador.tripulacao.length, tripAntesRec + 1);
  const desfechoDireto = construirDesfechoEventoCanonicamente(estMantaEvento, resEscolhaCamp.estado, {
    opcao: 'B',
    idEvento: 'SOS_4_COMBOIO_ENCALHADO',
  });
  assert.equal(desfechoDireto.deltaSucata > 0, true);

  // 3. Power Surges F2 (Enxame de Drones Cortadores + Arrasto Mastro) e F3 (7 Lasers Industriais) em Tempo Real [MUT-O6-31]
  const estCombBase = criarEstadoCampanhaCompleta({ faseInicial: 'COMBATE', seedPartida: 'seed-0812-surge' });
  const estSurgeF2 = structuredClone(estCombBase);
  estSurgeF2.naveJogador.estadoFisico = '1_NO_FOIL';
  estSurgeF2.naveJogador.esquivaEfetivaPct = 0;
  estSurgeF2.naveJogador.tripulacao.forEach((tr) => {
    if (tr.salaId === 2) tr.salaId = 1;
  });
  estSurgeF2.naveJogador.camadasBarreiraAtivas = 2;
  estSurgeF2.alvoCombate = {
    ...structuredClone(dragaF2),
    progressoPowerSurgeSeg: 19.9,
    salasOuOrgaos: dragaF2.salasOuOrgaos.map((s) => ({
      ...s,
      barrasIntegridade: s.integridadeAtual,
      barrasMax: s.integridadeMax,
    })),
  };
  const dragaF3 = criarEstadoChefeDraga(3);
  const estSurgeF3 = structuredClone(estSurgeF2);
  estSurgeF3.naveJogador.camadasBarreiraAtivas = 3;
  estSurgeF3.alvoCombate = {
    ...structuredClone(dragaF3),
    progressoPowerSurgeSeg: 17.9,
    salasOuOrgaos: dragaF3.salasOuOrgaos.map((s) => ({
      ...s,
      barrasIntegridade: s.integridadeAtual,
      barrasMax: s.integridadeMax,
    })),
  };
  const somaDefesaAntesF3 =
    estSurgeF3.naveJogador.hpCascoAtual + estSurgeF3.naveJogador.camadasBarreiraAtivas;
  const estPosSurgeF3 = avancarTickPartidaEmTempoReal(congelarProfundo(estSurgeF3), 0.25);
  const somaDefesaDepoisF3 =
    estPosSurgeF3.naveJogador.hpCascoAtual + estPosSurgeF3.naveJogador.camadasBarreiraAtivas;
  assert.equal(
    somaDefesaDepoisF3 <= somaDefesaAntesF3 - 5,
    true,
    '[MUT-O6-31] Power Surges da Draga Continental (Enxame de Drones F2 e 7 Lasers F3) devem causar impacto real em combate em tempo real'
  );

  const hpAntesF2 = estSurgeF2.naveJogador.hpCascoAtual;
  const bolhasAntesF2 = estSurgeF2.naveJogador.camadasBarreiraAtivas;
  const estPosSurgeF2 = avancarTickPartidaEmTempoReal(congelarProfundo(estSurgeF2), 0.25);
  const impactoRealF2 =
    estPosSurgeF2.naveJogador.hpCascoAtual < hpAntesF2 ||
    estPosSurgeF2.naveJogador.camadasBarreiraAtivas < bolhasAntesF2 ||
    Number(estPosSurgeF2.naveJogador.pesoVirtualArrastoKg ?? 0) >= 25;
  assert.equal(
    impactoRealF2,
    true,
    '[MUT-O6-31] Power Surge Fase 2 (Enxame de Drones Cortadores) deve atingir Barreira/Casco ou impor arrasto no Mastro'
  );
  assert.equal(
    (estPosSurgeF2.meta.eventosVisuaisUltimoTick ?? []).some((e) => e.tipo === 'SOBRECARGA_DRAGA'),
    true,
    '[MUT-O6-31] Power Surges da Draga Continental devem emitir SOBRECARGA_DRAGA no tick real'
  );

  // 4. Cobertura direta das funções táticas de encontros-eventos-campanha e renderizador-alvo-inimigo
  const resModoSlot0 = alternarModoDisparoArma(estCombBase, 0, true);
  assert.equal(resModoSlot0.ok, true);
  assert.equal(resModoSlot0.modoAtivo, 'MANUAL');

  const estSalvaPronta = structuredClone(resModoSlot0.estado);
  estSalvaPronta.naveJogador.armasAtivas[0].arma.salaAlvoId = 1;
  estSalvaPronta.naveJogador.armasAtivas[0].arma.progressoRecargaSeg =
    estSalvaPronta.naveJogador.armasAtivas[0].arma.tempoRecargaBaseSeg;
  const resSalvaDir = dispararSalvaManualPronta(congelarProfundo(estSalvaPronta), 0);
  assert.equal(resSalvaDir.ok, true);
  assert.equal(resSalvaDir.armasAutorizadas, 1);

  const estAbordoDir = structuredClone(estCombBase);
  estAbordoDir.naveJogador.tripulacao[0].localizacao = 'BORDO_INIMIGO';
  estAbordoDir.naveJogador.tripulacao[0].salaInimigaId = 1;
  const resMovAbordoDir = ordenarMovimentoAbordagemInimiga(
    congelarProfundo(estAbordoDir),
    estAbordoDir.naveJogador.tripulacao[0].id,
    2
  );
  assert.equal(resMovAbordoDir.ok, true);

  // Renderizadores atmosféricos e sobreposição 60 FPS diretos
  const vmCombateDir = projetarViewModelWireframe(estCombBase);
  const cachesAtmosTeste = {};
  const ctxRgbaTeste = criarContextoPrimitivasRgba960x540(
    vmCombateDir,
    { tempoSeg: 0.5, eventos60Fps: interpolarEstadoVisual60Fps(null, estCombBase, 0.016) },
    obterAssetsConceitoHiBit(),
    obterMapaHitboxesNativo(vmCombateDir),
    obterTabelasRasterUnificado(),
    cachesAtmosTeste
  );
  const { placaEsq, perfilEsq, deslSubTick } = prepararFundoAtmosfericoCombate(ctxRgbaTeste, cachesAtmosTeste);
  assert.equal(typeof deslSubTick, 'number');
  renderizarSobrecomposicaoCombate60Fps(ctxRgbaTeste, {
    placaEsq,
    perfilEsq,
    yLinhaDaguaCena: 332,
    deslSubTick,
    brqLigadoCena: true,
  });

  // 5. Isolamento de Modais (SAQUE / EVENTO_DESFECHO / OFICINA), [U] em EVENTO, Clique Direito por Slot e [H] em FIM_DE_RUN
  const estMantaCong = congelarProfundo(estMantaEvento);
  const vmEvento = projetarViewModelWireframe(estMantaCong);
  assert.equal(Boolean(vmEvento.oficinaResumo), true);
  const cmdKeyUEvento = traduzirInputDomParaComandoUi({ tipoEvento: 'KEYDOWN', code: 'KeyU' }, estMantaCong, vmEvento);
  assert.equal(cmdKeyUEvento.acaoLocalUi, 'ACAO_CAMPANHA');
  assert.equal(cmdKeyUEvento.acaoCampanhaUi?.tipoAcao, 'ABRIR_FECHAR_OFICINA');

  const vmComModalDesfecho = projetarViewModelWireframe(resEscolhaCamp.estado);
  const cmdKeyDVazado = traduzirInputDomParaComandoUi({ tipoEvento: 'KEYDOWN', code: 'KeyD' }, resEscolhaCamp.estado, vmComModalDesfecho);
  assert.equal(cmdKeyDVazado.reconhecido, false, 'Atalhos táticos não devem vazar por trás do modal EVENTO_DESFECHO');
  const cmdEnterDesfecho = traduzirInputDomParaComandoUi({ tipoEvento: 'KEYDOWN', code: 'Enter' }, resEscolhaCamp.estado, vmComModalDesfecho);
  assert.equal(cmdEnterDesfecho.acaoCampanhaUi?.tipoAcao, 'CONFIRMAR_DESFECHO_EVENTO');

  const hbSlot0 = obterMapaHitboxesNativo(vmCombateDir).find((h) => h.tipo === 'SLOT_ARMA' && h.metadados?.slotIndex === 0);
  const cmdBotaoDireitoSlot = traduzirInputDomParaComandoUi(
    {
      tipoEvento: 'CLICK',
      botaoMouse: 2,
      clientX: hbSlot0.x + 8,
      clientY: hbSlot0.y + 8,
      retanguloCanvas: { left: 0, top: 0, width: 960, height: 540 },
    },
    estCombBase,
    vmCombateDir
  );
  assert.equal(cmdBotaoDireitoSlot.acaoCampanhaUi?.tipoAcao, 'ALTERNAR_MODO_DISPARO_ARMA');
  assert.equal(cmdBotaoDireitoSlot.acaoCampanhaUi?.payload?.slotIndex, 0);

  // 6. WebAudio: Multi-rajada Flak/Rejeição, Lookahead Sample-Accurate (ctx.currentTime dinâmico) e Ducking 900 Hz em Pausa Tática
  const sfxRejeicaoReal = extrairSfxMulticamadaDoTick(estCombBase, estCombBase, {
    aceito: false,
    marcadorRejeicao: 'SEM_ENERGIA_LIVRE_REATOR',
  });
  assert.equal(sfxRejeicaoReal.length, 1);
  assert.equal(sfxRejeicaoReal[0].idSfx, 'SFX_COMANDO_REJEITADO');

  const sfxHoverSilencioso = extrairSfxMulticamadaDoTick(estCombBase, estCombBase, {
    aceito: false,
    marcadorRejeicao: 'INPUT_SEM_EFEITO_TATICO',
  });
  assert.equal(sfxHoverSilencioso.length, 0);

  const pcmFlak = sintetizarBufferPcmMulticamada('SFX_DISPARO_ESTILHACOS_FLAK', { sampleRate: 8000 });
  assert.equal(pcmFlak.ok, true);
  assert.equal(pcmFlak.picoAbs > 0.1, true);

  const paisagemPausada = construirPaisagemSonoraCompleta(estCombBase, estCombBase, null, {
    pausaTaticaAtiva: true,
  });
  assert.equal(paisagemPausada.pausaTaticaAtiva, true);
  assert.equal(paisagemPausada.frequenciaCorteEfetivaHz, 900);

  let relogioHwSeg = 0;
  let alvosFiltroMaster = [];
  let oscStarts = [];
  class AudioCtxLookaheadTeste {
    constructor() {
      this.state = 'running';
      this.sampleRate = 22050;
      this.destination = {};
    }
    get currentTime() {
      return relogioHwSeg;
    }
    resume() { return Promise.resolve(); }
    createDynamicsCompressor() { return { connect() {}, disconnect() {} }; }
    createBiquadFilter() {
      const flt = {
        type: 'lowpass',
        frequency: {
          value: 20000,
          setValueAtTime(v) { this.value = v; },
          setTargetAtTime(v) { this.value = v; alvosFiltroMaster.push(v); },
        },
        Q: { value: 0.7, setValueAtTime() {}, setTargetAtTime() {} },
        connect() {},
        disconnect() {},
      };
      return flt;
    }
    createGain() {
      return {
        gain: {
          value: 1,
          setValueAtTime(v) { this.value = v; },
          linearRampToValueAtTime(v) { this.value = v; },
          exponentialRampToValueAtTime(v) { this.value = v; },
          setTargetAtTime(v) { this.value = v; },
        },
        connect() {},
        disconnect() {},
      };
    }
    createStereoPanner() {
      return { pan: { value: 0, setValueAtTime() {} }, connect() {}, disconnect() {} };
    }
    createBuffer(_c, len, sr) {
      return { length: len, sampleRate: sr, getChannelData: () => new Float32Array(len) };
    }
    createBufferSource() {
      const s = { buffer: null, loop: false, onended: null, connect() {}, disconnect() {}, start() {}, stop() {} };
      return s;
    }
    createOscillator() {
      return {
        type: 'sine',
        frequency: { value: 440, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
        onended: null,
        connect() {},
        disconnect() {},
        start(t) { oscStarts.push(t); },
        stop() {},
      };
    }
  }

  const motorLookahead = criarMotorAudioMaritimoCliente({ AudioContext: AudioCtxLookaheadTeste });
  motorLookahead.aplicarPlanoPaisagem(construirPaisagemSonoraCompleta(estCombBase, estCombBase, null));
  motorLookahead.pulsarQuadroMusical60Fps(0);
  relogioHwSeg = 0.05;
  motorLookahead.pulsarQuadroMusical60Fps(50);
  relogioHwSeg = 0.42;
  motorLookahead.pulsarQuadroMusical60Fps(420);
  assert.equal(oscStarts.length >= 6, true, 'Lookahead sample-accurate + Pad tríade de 3 vozes + batimento lub-dub devem agendar osciladores em tStep exato');

  assert.equal(motorLookahead.definirPausaTatica(true), true);
  assert.equal(motorLookahead.estaEmPausaTatica(), true);
  assert.equal(alvosFiltroMaster.includes(900), true, 'Pausa Tática em 1_NO_FOIL deve aplicar ducking passa-baixa em 900 Hz');
  assert.equal(motorLookahead.definirPausaTatica(false), false);

  console.log(
    `[N4] Portão 08.12 examinado: 12 funções encontros-eventos-campanha, Power Surges F2/F3 reais, Sonar dinâmico, Desfecho c/ recrutamento e WebAudio lookahead + ducking 900 Hz (${oscStarts.length} agendamentos)`
  );
});

test('Portão 08.13: Acoplamento Energético Artilharia<->Armas [MUT-O6-33], Isolamento MAN/AUT por Slot [MUT-O6-34], Rejeições Verdadeiras no Toast [MUT-O6-35], HP Canônico de Recrutamento e Elegia Permadeath', () => {
  const estComb = criarEstadoCampanhaCompleta({ faseInicial: 'COMBATE', seedPartida: 'seed-0813-art-ux' });
  const naveDir = sincronizarEnergiaArmasComCamaraArtilharia(estComb.naveJogador, { redistribuir: true });
  assert.equal(Object.isFrozen(naveDir), true);
  assert.equal(naveDir.armasAtivas[0].arma.energiaAlocada, 2);
  assert.equal(naveDir.armasAtivas[1].arma.energiaAlocada, 1);

  // 1. Câmara 1 (ART) sem energia/integridade corta energiaAlocada e zera progressoRecargaSeg das armas dorsais [MUT-O6-33]
  const estArtDestruida = structuredClone(estComb);
  estArtDestruida.naveJogador.armasAtivas[0].arma.progressoRecargaSeg = 4.0;
  estArtDestruida.naveJogador.armasAtivas[1].arma.progressoRecargaSeg = 4.0;
  const cam1Dest = estArtDestruida.naveJogador.camaras.find((c) => c.id === 1);
  cam1Dest.barrasIntegridade = 0;
  cam1Dest.barrasEnergiaAlocada = 0;
  const estPosTickArtZero = avancarTickPartidaEmTempoReal(congelarProfundo(estArtDestruida), 0.25);
  assert.equal(
    estPosTickArtZero.naveJogador.armasAtivas[0].arma.energiaAlocada === 0 &&
      estPosTickArtZero.naveJogador.armasAtivas[0].arma.progressoRecargaSeg === 0 &&
      estPosTickArtZero.naveJogador.armasAtivas[1].arma.energiaAlocada === 0,
    true,
    '[MUT-O6-33] Câmara 1 (ART) sem energia/integridade deve cortar energiaAlocada e zerar progressoRecargaSeg das armas dorsais'
  );

  // Retirar energia da Câmara 1 via ALOCAR_ENERGIA (ART: 3->2->0) desenergiza armas que excedem o orçamento [MUT-O6-33]
  const resMenos1 = despacharComandoUi(estComb, {
    tipo: 'ALOCAR_ENERGIA',
    payload: { camaraId: 1, deltaBarras: -1 },
  });
  assert.equal(resMenos1.aceito, true);
  const vmMenos1 = projetarViewModelWireframe(resMenos1.estado);
  assert.equal(
    vmMenos1.caixaArmas[0].energizada === true &&
      vmMenos1.caixaArmas[1].energizada === false &&
      vmMenos1.caixaArmas[1].energiaAlocada === 0,
    true,
    '[MUT-O6-33] Câmara 1 (ART) com 2 barras deve manter Slot 0 (custo 2) energizado e cortar Slot 1 (custo 1)'
  );

  const resMenos2 = despacharComandoUi(resMenos1.estado, {
    tipo: 'ALOCAR_ENERGIA',
    payload: { camaraId: 1, deltaBarras: -1 },
  });
  const resZeroArt = despacharComandoUi(resMenos2.estado, {
    tipo: 'ALOCAR_ENERGIA',
    payload: { camaraId: 1, deltaBarras: -1 },
  });
  assert.equal(resZeroArt.aceito, true);
  assert.equal(resZeroArt.estado.naveJogador.armasAtivas[0].arma.energiaAlocada, 0);
  assert.equal(resZeroArt.estado.naveJogador.armasAtivas[1].arma.energiaAlocada, 0);

  // Re-alocar +2 barras em ART religa imediatamente o Slot 0 (Arpão de 2 energia)
  const resReligar1 = despacharComandoUi(resZeroArt.estado, {
    tipo: 'ALOCAR_ENERGIA',
    payload: { camaraId: 1, deltaBarras: 1 },
  });
  assert.equal(resReligar1.estado.naveJogador.armasAtivas[0].arma.energiaAlocada, 0);
  assert.equal(resReligar1.estado.naveJogador.armasAtivas[1].arma.energiaAlocada, 1);
  const resReligar2 = despacharComandoUi(resReligar1.estado, {
    tipo: 'ALOCAR_ENERGIA',
    payload: { camaraId: 1, deltaBarras: 1 },
  });
  assert.equal(resReligar2.estado.naveJogador.armasAtivas[0].arma.energiaAlocada, 2);
  assert.equal(resReligar2.estado.naveJogador.armasAtivas[1].arma.energiaAlocada, 0);

  // 2. Clique direito individual num único slot de arma marca APENAS aquele slot como MAN e mantém os demais em AUT [MUT-O6-34]
  const resSlot0Man = alternarModoDisparoArma(estComb, 0, true);
  assert.equal(resSlot0Man.ok, true);
  const vmMisto = projetarViewModelWireframe(resSlot0Man.estado);
  assert.equal(
    vmMisto.caixaArmas[0].modoDisparo === 'MANUAL' && vmMisto.caixaArmas[1].modoDisparo === 'AUTOMATICO',
    true,
    '[MUT-O6-34] Alternar modo MANUAL em um único slot de arma jamais pode marcar os outros slots como MANUAL no ViewModel/HUD'
  );

  // 3. Toast de rejeição jamais exibe banners antigos de chegada em ultimoAvisoCampanha [MUT-O6-35]
  const msgMoeda = formatarMensagemRejeicaoUi('MOEDA_INSUFICIENTE', 'RECIFE-FORJA SIMBIÓTICO ATRACADO');
  const msgPrecond = formatarMensagemRejeicaoUi('PRECONDICAO_NAO_ATENDIDA', 'CONTATO HOSTIL: LANCHA PATRULHEIRA');
  const msgFallback = formatarMensagemRejeicaoUi('BLOQUEIO_EXOTICO_99', 'SETOR 1: CARCAÇA ALFA');
  assert.equal(
    msgMoeda.includes('INSUFICIENTE') &&
      !msgMoeda.includes('RECIFE-FORJA') &&
      !msgPrecond.includes('CONTATO HOSTIL') &&
      msgFallback === 'ACAO BLOQUEADA: BLOQUEIO EXOTICO 99',
    true,
    '[MUT-O6-35] formatarMensagemRejeicaoUi deve traduzir o código real de rejeição sem vazar ultimoAvisoCampanha antigo no toast de erro'
  );

  // 4. Recrutamento em Evento usa HP_MAX_POR_ESPECIE canônico e respeita MAX_TRIPULANTES_NAVE = 6
  const estEvRec = structuredClone(
    criarEstadoCampanhaCompleta({ idArquitetura: 'MANTA_VOLT', faseInicial: 'EVENTO', seedPartida: 'seed-0813-rec' })
  );
  estEvRec.eventoAtual = { idEvento: 'SOS_4_COMBOIO_ENCALHADO', titulo: 'Comboio Encalhado' };
  if (estEvRec.mapaSetorial?.nos?.[0]) {
    estEvRec.mapaSetorial.noAtualId = estEvRec.mapaSetorial.nos[0].id;
    estEvRec.mapaSetorial.nos[0].tipo = 'SOS';
    estEvRec.mapaSetorial.nos[0].idEvento = 'SOS_4_COMBOIO_ENCALHADO';
  }
  const resRec = despacharComandoUi(congelarProfundo(estEvRec), {
    tipo: 'ESCOLHER_OPCAO_EVENTO',
    payload: { idEvento: 'SOS_4_COMBOIO_ENCALHADO', opcao: 'B' },
  });
  assert.equal(resRec.aceito, true);
  const recrutaNovo = resRec.estado.naveJogador.tripulacao.at(-1);
  assert.equal(recrutaNovo.hpMax, HP_MAX_POR_ESPECIE[recrutaNovo.especie]);
  assert.equal(recrutaNovo.hpAtual, HP_MAX_POR_ESPECIE[recrutaNovo.especie]);

  const estLotado6 = structuredClone(estEvRec);
  while (estLotado6.naveJogador.tripulacao.length < MAX_TRIPULANTES_NAVE) {
    estLotado6.naveJogador.tripulacao.push({
      ...estLotado6.naveJogador.tripulacao[0],
      id: `trip-extra-${estLotado6.naveJogador.tripulacao.length}`,
    });
  }
  const resRecLotado = despacharComandoUi(congelarProfundo(estLotado6), {
    tipo: 'ESCOLHER_OPCAO_EVENTO',
    payload: { idEvento: 'SOS_4_COMBOIO_ENCALHADO', opcao: 'B' },
  });
  assert.equal(resRecLotado.estado.naveJogador.tripulacao.length, MAX_TRIPULANTES_NAVE);

  // 5. Junção N1 real FIM_DE_RUN -> Paisagem Sonora: derrotar Draga Fase 3 via avancarTickCampanhaCompleta toca tema de VITORIA (84 BPM) e Permadeath toca elegia de DERROTA (54 BPM) [MUT-O6-36]
  const estPreVitoriaDraga = structuredClone(
    criarEstadoCampanhaCompleta({ faseInicial: 'COMBATE', setorNumero: 8, seedPartida: 'seed-0813-vit-real' })
  );
  estPreVitoriaDraga.alvoCombate = structuredClone(criarEstadoChefeDraga(3));
  estPreVitoriaDraga.alvoCombate.hpCascoAtual = 2;
  estPreVitoriaDraga.alvoCombate.camadasBarreiraAtivas = 0;
  estPreVitoriaDraga.alvoCombate.barreiraBolhasAtual = 0;
  estPreVitoriaDraga.alvoCombate.blindagemTermicaExternaPts = 0;
  estPreVitoriaDraga.alvoCombate.esquivaEfetivaPct = 0;
  estPreVitoriaDraga.naveJogador.armasAtivas[0] = {
    slotIndex: 0,
    arma: {
      id: 'CORTADOR_TERMICO_PLASMA',
      chassiId: 'CORTADOR_TERMICO_PLASMA',
      nome: 'Cortador Térmico a Plasma',
      energiaCusto: 2,
      energiaAlocada: 2,
      soquetesMax: 1,
      orgaosEnxertados: [],
      tempoRecargaBaseSeg: 14,
      progressoRecargaSeg: 14,
      salaAlvoId: 1,
      trincaSalasBeam: [1, 2, 3],
      modoDisparoManual: false,
    },
  };
  const estPosVitoriaReal = avancarTickCampanhaCompleta(congelarProfundo(estPreVitoriaDraga), 0.25);
  assert.equal(estPosVitoriaReal.meta.faseJogo, 'FIM_DE_RUN');
  assert.equal(estPosVitoriaReal.meta.desfechoRun, 'VITORIA_CAMPANHA');

  const estPrePermadeath = structuredClone(estComb);
  estPrePermadeath.naveJogador.hpCascoAtual = 0;
  const estPosPermadeathReal = avancarTickCampanhaCompleta(congelarProfundo(estPrePermadeath), 0.25);
  assert.equal(estPosPermadeathReal.meta.faseJogo, 'FIM_DE_RUN');
  assert.equal(estPosPermadeathReal.meta.desfechoRun, 'DERROTA_PERMADEATH');

  const paisDerrota = construirPaisagemSonoraCompleta(estPosPermadeathReal, estPosPermadeathReal);
  const paisVitoria = construirPaisagemSonoraCompleta(estPosVitoriaReal, estPosVitoriaReal);
  assert.equal(
    paisVitoria.trilhaAdaptativa.modoFimDeRun === 'VITORIA' &&
      paisVitoria.trilhaAdaptativa.bpm === 84 &&
      paisDerrota.trilhaAdaptativa.modoFimDeRun === 'DERROTA' &&
      paisDerrota.trilhaAdaptativa.bpm === 54 &&
      paisDerrota.trilhaAdaptativa.notaBaixoAtualHz < paisVitoria.trilhaAdaptativa.notaBaixoAtualHz,
    true,
    '[MUT-O6-36] VITORIA_CAMPANHA real em FIM_DE_RUN deve tocar tema luminoso de VITORIA (84 BPM) e Permadeath deve tocar elegia de DERROTA (54 BPM)'
  );

  console.log(
    '[N4] Portão 08.13 examinado: acoplamento ART<->Armas, isolamento MAN/AUT por slot, toast sem aviso velho, HP recrutamento SSOT e junção real FIM_DE_RUN VITORIA (84 BPM) vs DERROTA (54 BPM)'
  );
});

test('Portão 08.14: Junção N1 Onda 4/5 <-> Campanha Onda 6 — Perigos PER_1..3 [MUT-O6-37], Anti-Farming Frota/SOS Expirado [MUT-O6-38], Biomas S3/S5, Não-Repetição Setorial e Reator SSOT no Hangar', () => {
  // 1. Paridade estrita do Reator Inicial nos 5 cards do Hangar contra criarEstadoInicialPartida (SSOT: [7, 8, 6, 6, 7])
  const estHangar = criarEstadoCampanhaCompleta({ faseInicial: 'INICIO', seedPartida: 'seed-0814-hangar' });
  const vmHangar = projetarViewModelWireframe(estHangar);
  const reatoresHangar = vmHangar.hangarResumo.naves.map((n) => n.reator);
  const reatoresReaisMotor = vmHangar.hangarResumo.naves.map((n) => {
    const r = criarEstadoInicialPartida({ idArquitetura: n.id }).naveJogador.reator;
    return r.barrasCompradas + r.barrasBonusArraias;
  });
  assert.deepEqual(reatoresHangar, [7, 8, 6, 6, 7]);
  assert.deepEqual(reatoresHangar, reatoresReaisMotor);

  // 2. PER_2_VORTICE_CORRENTEZA aplica penalidade real de sustentação (-40 kg na Opção A -> Touchdown; -20 kg na Blue Option B) e restaura pós-luta [MUT-O6-37]
  const criarEstadoPerigo = (idTemplateEvento) => {
    const base = structuredClone(
      criarEstadoCampanhaCompleta({ idArquitetura: 'CARCACA_ALFA', faseInicial: 'EVENTO', seedPartida: 'seed-0814-per' })
    );
    const noPerigo = { id: 'NO_PER_TESTE', tipoNo: 'PERIGO', idTemplateEvento, xMn: 30, yMn: 20, tPrazoHoras: null };
    base.mapaSetorial.noAtualId = noPerigo.id;
    base.mapaSetorial.nos = [noPerigo, ...base.mapaSetorial.nos.slice(1)];
    base.eventoAtual = { noId: noPerigo.id, tipoNo: 'PERIGO', idTemplateEvento, noMapa: noPerigo };
    return base;
  };

  const estVorticeA = criarEstadoPerigo('PER_2_VORTICE_CORRENTEZA');
  const resVorticeA = executarAcaoCampanhaCompleta(
    congelarProfundo(estVorticeA),
    { tipo: 'ESCOLHER_OPCAO_EVENTO', payload: { idEvento: 'PER_2_VORTICE_CORRENTEZA', opcao: 'A' } },
    { pularModalDesfechoEvento: true }
  );
  assert.equal(resVorticeA.ok, true);
  assert.equal(resVorticeA.estado.meta.faseJogo, 'COMBATE');
  assert.equal(
    resVorticeA.estado.naveJogador.sustentacaoAtualKg === 220 &&
      resVorticeA.estado.naveJogador.estadoFisico === '2_TOUCHDOWN',
    true,
    '[MUT-O6-37] PER_2_VORTICE_CORRENTEZA (Opção A) deve subtrair 40 kg da sustentação do Foil (260 -> 220 kg) e derrubar Carcaça Alfa (225 kg) em Touchdown'
  );

  let estVorticeBlue = criarEstadoPerigo('PER_2_VORTICE_CORRENTEZA');
  estVorticeBlue.economia = { sucata: 300, biomassa: 300, combustivel: 12, municao: 8 };
  estVorticeBlue.recursos = { ...estVorticeBlue.economia };
  estVorticeBlue = aplicarUpgradeNaveCampanha(congelarProfundo(estVorticeBlue), 'MASTRO_FOIL').estado;
  estVorticeBlue = aplicarUpgradeNaveCampanha(estVorticeBlue, 'MASTRO_FOIL').estado;
  const resVorticeB = executarAcaoCampanhaCompleta(
    estVorticeBlue,
    { tipo: 'ESCOLHER_OPCAO_EVENTO', payload: { idEvento: 'PER_2_VORTICE_CORRENTEZA', opcao: 'B' } },
    { pularModalDesfechoEvento: true }
  );
  assert.equal(resVorticeB.ok, true);
  assert.equal(resVorticeB.estado.naveJogador.penalidadeSustentacaoKg, 20);
  assert.equal(resVorticeB.estado.naveJogador.sustentacaoAtualKg, 320);

  // 3. PER_1_CHUVA_ACIDA causa dano ácido no Foil na Opção A e respeita neutralização de 30s + +2 munição pós-luta na Blue Option B
  const estAcidoA = criarEstadoPerigo('PER_1_CHUVA_ACIDA');
  const resAcidoA = executarAcaoCampanhaCompleta(
    congelarProfundo(estAcidoA),
    { tipo: 'ESCOLHER_OPCAO_EVENTO', payload: { idEvento: 'PER_1_CHUVA_ACIDA', opcao: 'A' } },
    { pularModalDesfechoEvento: true }
  );
  assert.equal(resAcidoA.estado.meta.perigoAmbientalId, 'PER_1_CHUVA_ACIDA');
  const clAcidoPacifista = structuredClone(resAcidoA.estado);
  clAcidoPacifista.alvoCombate.salasOuOrgaos = [];
  let estTickAcido = congelarProfundo(clAcidoPacifista);
  const hpAntesAcido = estTickAcido.naveJogador.hpCascoAtual;
  for (let i = 0; i < 15; i += 1) {
    estTickAcido = avancarTickPartidaEmTempoReal(estTickAcido, 1.0);
  }
  assert.equal(estTickAcido.naveJogador.hpCascoAtual, hpAntesAcido - 1);

  let estAcidoBlue = criarEstadoPerigo('PER_1_CHUVA_ACIDA');
  estAcidoBlue.economia = { sucata: 300, biomassa: 300, combustivel: 12, municao: 8 };
  estAcidoBlue.recursos = { ...estAcidoBlue.economia };
  estAcidoBlue = aplicarUpgradeNaveCampanha(congelarProfundo(estAcidoBlue), 'PLACAS_BLINDAGEM', {
    permitirForaDeLoja: true,
  }).estado;
  estAcidoBlue = aplicarUpgradeNaveCampanha(estAcidoBlue, 'PLACAS_BLINDAGEM', {
    permitirForaDeLoja: true,
  }).estado;
  const resAcidoB = executarAcaoCampanhaCompleta(
    estAcidoBlue,
    { tipo: 'ESCOLHER_OPCAO_EVENTO', payload: { idEvento: 'PER_1_CHUVA_ACIDA', opcao: 'B' } },
    { pularModalDesfechoEvento: true }
  );
  const clAcidoBluePacifista = structuredClone(resAcidoB.estado);
  clAcidoBluePacifista.alvoCombate.salasOuOrgaos = [];
  let estTickAcidoBlue = congelarProfundo(clAcidoBluePacifista);
  const hpAntesBlue = estTickAcidoBlue.naveJogador.hpCascoAtual;
  for (let i = 0; i < 20; i += 1) {
    estTickAcidoBlue = avancarTickPartidaEmTempoReal(estTickAcidoBlue, 1.0);
  }
  assert.equal(estTickAcidoBlue.naveJogador.hpCascoAtual, hpAntesBlue);
  const saqueComMunicaoBonus = aplicarRegrasSaquePosCombateCampanha(
    { sucata: 15, biomassa: 0, combustivel: 1, municao: 1 },
    resAcidoB.estado
  );
  assert.equal(saqueComMunicaoBonus.municao, 3);

  // 4. PER_3_AGUAS_TURVAS impõe NEGADO_SONAR na Opção A e libera VISIVEL na Blue Option B (Córtex Nv. 3+)
  const estTurvasA = criarEstadoPerigo('PER_3_AGUAS_TURVAS');
  const resTurvasA = executarAcaoCampanhaCompleta(
    congelarProfundo(estTurvasA),
    { tipo: 'ESCOLHER_OPCAO_EVENTO', payload: { idEvento: 'PER_3_AGUAS_TURVAS', opcao: 'A' } },
    { pularModalDesfechoEvento: true }
  );
  assert.equal(resTurvasA.estado.alvoCombate.canalVisibilidadeSonar, 'NEGADO_SONAR');
  assert.equal(inspecionarSalaAlvo(resTurvasA.estado, 1).canalPermissao, 'NEGADO_SONAR');

  let estTurvasBlue = criarEstadoPerigo('PER_3_AGUAS_TURVAS');
  estTurvasBlue.economia = { sucata: 300, biomassa: 300, combustivel: 12, municao: 8 };
  estTurvasBlue.recursos = { ...estTurvasBlue.economia };
  estTurvasBlue = aplicarUpgradeNaveCampanha(congelarProfundo(estTurvasBlue), 'CORTEX_NAVEGACAO').estado;
  estTurvasBlue = aplicarUpgradeNaveCampanha(estTurvasBlue, 'CORTEX_NAVEGACAO').estado;
  const resTurvasB = executarAcaoCampanhaCompleta(
    estTurvasBlue,
    { tipo: 'ESCOLHER_OPCAO_EVENTO', payload: { idEvento: 'PER_3_AGUAS_TURVAS', opcao: 'B' } },
    { pularModalDesfechoEvento: true }
  );
  assert.equal(inspecionarSalaAlvo(resTurvasB.estado, 1).canalPermissao, 'VISIVEL');

  // 5. Eventos com COMBATE_MONSTRO vs COMBATE_BARCO forçam a classe correta de inimigo
  for (let idxSeed = 0; idxSeed < 12; idxSeed += 1) {
    const estNinho = structuredClone(
      criarEstadoCampanhaCompleta({ faseInicial: 'EVENTO', seedPartida: `seed-mon-${idxSeed}` })
    );
    const noNinho = { id: 'NO_NINHO', tipoNo: 'SOS', idTemplateEvento: 'SOS_3_NINHO_SITIADO', xMn: 25, yMn: 20, tPrazoHoras: 99 };
    estNinho.mapaSetorial.noAtualId = noNinho.id;
    estNinho.mapaSetorial.nos = [noNinho, ...estNinho.mapaSetorial.nos.slice(1)];
    estNinho.eventoAtual = { noId: noNinho.id, tipoNo: 'SOS', idTemplateEvento: 'SOS_3_NINHO_SITIADO', noMapa: noNinho };
    const rNinho = executarAcaoCampanhaCompleta(
      congelarProfundo(estNinho),
      { tipo: 'ESCOLHER_OPCAO_EVENTO', payload: { idEvento: 'SOS_3_NINHO_SITIADO', opcao: 'A' } },
      { pularModalDesfechoEvento: true }
    );
    if (rNinho.estado.meta.faseJogo === 'COMBATE') {
      assert.equal(rNinho.estado.alvoCombate.classeAlvo, 'MONSTRO_MARINHO');
    }
  }

  // 6. Anti-farming Frota Corporativa (+1 bolha bônus, 0 Sucata / 1 Combustível) e SOS Expirado (Zona Morta floor(0.5 * Sucata)) [MUT-O6-38]
  const estMapaBase = criarEstadoCampanhaCompleta({ faseInicial: 'MAPA', setorNumero: 2, seedPartida: 'seed-0814-frota' });
  const barreiraPadraoS3 = gerarAlvoInimigoEscaladoSetor('seed-0814-frota', 3, 'NO_FROTA_1', {
    classeForcada: 'BARCO_HUMANO',
  }).barreiraBolhasMax;
  const estEntradaFrota = congelarProfundo(
    resolverEntradaNoMapaCampanha(estMapaBase, { id: 'NO_FROTA_1', tipoNo: 'COMBATE', engolidoCorporacao: true })
  );
  assert.equal(estEntradaFrota.alvoCombate.barreiraBolhasMax, barreiraPadraoS3 + 1);
  const clFrotaVitoria = structuredClone(estEntradaFrota);
  clFrotaVitoria.alvoCombate.hpCascoAtual = 0;
  const estPosSaqueFrota = avancarTickCampanhaCompleta(congelarProfundo(clFrotaVitoria), 0.25);
  assert.equal(
    estPosSaqueFrota.meta.saquePendente.sucata === 0 &&
      estPosSaqueFrota.meta.saquePendente.biomassa === 0 &&
      estPosSaqueFrota.meta.saquePendente.combustivel === 1,
    true,
    '[MUT-O6-38] Nó engolido pela Frota Corporativa deve impor saque anti-farming (0 Sucata, 0 Biomassa, 1 Combustível)'
  );
  assert.equal(estPosSaqueFrota.naveJogador.penalidadeSustentacaoKg, 0);

  const clMapaSosExpirado = structuredClone(estMapaBase);
  clMapaSosExpirado.mapaSetorial.relogioSetorHoras = 8.0;
  clMapaSosExpirado.mapaSetorial.frenteCorporacaoMn = 10.0;
  const estZonaMorta = congelarProfundo(
    resolverEntradaNoMapaCampanha(clMapaSosExpirado, {
      id: 'NO_SOS_EXP',
      tipoNo: 'SOS',
      idTemplateEvento: 'SOS_2_CAPSULA_AFUNDANDO',
      xMn: 45,
      tPrazoHoras: 4.5,
    })
  );
  assert.equal(estZonaMorta.meta.faseJogo, 'COMBATE');
  assert.equal(estZonaMorta.meta.modificadoresCombateAtivos.origemCombate, 'ZONA_MORTA_INDUSTRIALIZADA');
  const saqueZonaMorta = aplicarRegrasSaquePosCombateCampanha({ sucata: 25, biomassa: 10, combustivel: 2, municao: 1 }, estZonaMorta);
  assert.equal(saqueZonaMorta.sucata, 12);
  assert.equal(saqueZonaMorta.biomassa, 0);
  assert.equal(saqueZonaMorta.combustivel, 0);

  // 7. Não-repetição de templates SOS/EXPLORACAO entre setores consecutivos + Biomas S3 (-15% esquiva barco) e S5 (Fossa Abissal NEGADO_SONAR)
  const estSetor1 = anexarMapaSetorAoEstado(estMapaBase, 'seed-nao-repete-0814', 1);
  const estSetor2 = anexarMapaSetorAoEstado(estSetor1, 'seed-nao-repete-0814', 2);
  const setS1 = new Set([
    ...estSetor1.mapaSetorial.templatesSorteados.sos,
    ...estSetor1.mapaSetorial.templatesSorteados.exploracao,
  ]);
  const repetidosS2 = [
    ...estSetor2.mapaSetorial.templatesSorteados.sos,
    ...estSetor2.mapaSetorial.templatesSorteados.exploracao,
  ].filter((idT) => setS1.has(idT));
  assert.deepEqual(repetidosS2, []);

  const barcoS2 = gerarAlvoInimigoEscaladoSetor('seed-kelp', 2, 'NO_B', { arquetipoId: 'BARCO_2_CORVETA' });
  const barcoS3Kelp = gerarAlvoInimigoEscaladoSetor('seed-kelp', 3, 'NO_B', { arquetipoId: 'BARCO_2_CORVETA' });
  assert.equal(barcoS3Kelp.esquivaBasePct < barcoS2.esquivaBasePct, true);

  const estSetor5 = anexarMapaSetorAoEstado(estMapaBase, 'seed-fossa-s5', 5);
  assert.equal(estSetor5.meta.aguasTurvasAtivas, true);
  const estCombateS5 = congelarProfundo(
    resolverEntradaNoMapaCampanha(estSetor5, { id: 'NO_COMB_S5', tipoNo: 'COMBATE', xMn: 30 })
  );
  assert.equal(inspecionarSalaAlvo(estCombateS5, 1).canalPermissao, 'NEGADO_SONAR');

  // 8. Todos os 17 templates canônicos 4.5.A têm narrativa própria e Blue Option avaliada contra o kit real [MUT-O6-39]
  assert.equal(Object.keys(TABELA_NARRATIVA_17_EVENTOS_45A).length, 17);
  const titulosUnicos17 = new Set(Object.values(TABELA_NARRATIVA_17_EVENTOS_45A).map((v) => v.titulo));
  assert.equal(titulosUnicos17.size, 17);

  // Carcaça Alfa inicial tem 0 Blue Options elegíveis (Matriz 4.5.C) -> TODAS as 17 opções [B] devem nascer com bloqueada: true!
  const estAlfaEvento = criarEstadoCampanhaCompleta({
    idArquitetura: 'CARCACA_ALFA',
    faseInicial: 'EVENTO',
    seedPartida: 'seed-0814-17ev',
  });
  let blueBloqueadasAlfa = 0;
  for (const idTemplate17 of Object.keys(TABELA_NARRATIVA_17_EVENTOS_45A)) {
    const clEv = structuredClone(estAlfaEvento);
    const catEv = idTemplate17.startsWith('PER_')
      ? 'PERIGO'
      : idTemplate17.startsWith('EXP_')
        ? 'EXPLORACAO'
        : 'SOS';
    clEv.eventoAtual = { noId: 'NO_EV_17', tipoNo: catEv, idTemplateEvento: idTemplate17 };
    const resumoEv = construirEventoResumoCanonico45A(clEv);
    assert.equal(resumoEv.idEvento, idTemplate17);
    if (resumoEv.opcoes[1].bloqueada === true) {
      blueBloqueadasAlfa += 1;
    }
  }
  assert.equal(
    blueBloqueadasAlfa,
    17,
    '[MUT-O6-39] Carcaça Alfa inicial (0 Blue Options na Matriz 4.5.C) deve projetar bloqueada: true nas 17 opções [B] da tela EVENTO'
  );

  // Coerência narrativa EVENTO <-> EVENTO_DESFECHO em SOS_5_BALEIA_ENCALHADA + desbloqueio ao vivo após upgrade de Sifão Nv.4
  let estBaleia = structuredClone(estAlfaEvento);
  const noBaleia = { id: 'NO_BALEIA', tipoNo: 'SOS', idTemplateEvento: 'SOS_5_BALEIA_ENCALHADA', xMn: 30, yMn: 20, tPrazoHoras: 12 };
  estBaleia.mapaSetorial.noAtualId = noBaleia.id;
  estBaleia.mapaSetorial.nos = [noBaleia, ...estBaleia.mapaSetorial.nos.slice(1)];
  estBaleia.eventoAtual = { noId: noBaleia.id, tipoNo: 'SOS', idTemplateEvento: 'SOS_5_BALEIA_ENCALHADA', noMapa: noBaleia };
  estBaleia.economia = { sucata: 300, biomassa: 300, combustivel: 12, municao: 8 };
  estBaleia.recursos = { ...estBaleia.economia };
  const estBaleiaCong = congelarProfundo(estBaleia);
  const vmBaleiaAntes = projetarViewModelWireframe(estBaleiaCong);
  assert.equal(vmBaleiaAntes.eventoResumo.titulo.includes('BALEIA-OFICINA'), true);
  assert.equal(vmBaleiaAntes.eventoResumo.opcoes[1].bloqueada, true);
  let estBaleiaUp = aplicarUpgradeNaveCampanha(estBaleiaCong, 'SIFAO_PROPULSAO').estado;
  estBaleiaUp = aplicarUpgradeNaveCampanha(estBaleiaUp, 'SIFAO_PROPULSAO').estado;
  const vmBaleiaDepois = projetarViewModelWireframe(estBaleiaUp);
  assert.equal(vmBaleiaDepois.eventoResumo.opcoes[1].bloqueada, false);
  const resDesfechoBaleia = executarAcaoCampanhaCompleta(estBaleiaUp, {
    tipo: 'ESCOLHER_OPCAO_EVENTO',
    payload: { idEvento: 'SOS_5_BALEIA_ENCALHADA', opcao: 'B' },
  });
  assert.equal(resDesfechoBaleia.ok, true);
  const vmModalBaleia = projetarViewModelWireframe(resDesfechoBaleia.estado);
  assert.equal(vmModalBaleia.desfechoEventoResumo.titulo.includes('BALEIA-OFICINA'), true);

  // 9. Telemetria tática da Carta Hidrográfica (rotas c/ correntes, relógio, alcancavel) + revelaMapaSetorial (cartaRevelada)
  let estSonarEv = structuredClone(estAlfaEvento);
  estSonarEv.economia = { sucata: 300, biomassa: 300, combustivel: 12, municao: 8 };
  estSonarEv.recursos = { ...estSonarEv.economia };
  const noSonar = { id: 'NO_SONAR_EXP2', tipoNo: 'EXPLORACAO', idTemplateEvento: 'EXP_2_PLATAFORMA_FANTASMA', xMn: 22, yMn: 24, tPrazoHoras: null };
  estSonarEv.mapaSetorial.noAtualId = noSonar.id;
  estSonarEv.mapaSetorial.nos = [noSonar, ...estSonarEv.mapaSetorial.nos];
  estSonarEv.eventoAtual = { noId: noSonar.id, tipoNo: 'EXPLORACAO', idTemplateEvento: 'EXP_2_PLATAFORMA_FANTASMA', noMapa: noSonar };
  const telAntesRevelar = construirTelemetriaMapaSetorial(estSonarEv, 'MAPA');
  assert.equal(telAntesRevelar.cartaRevelada, false);
  assert.equal(
    telAntesRevelar.nos.some((n) => !n.ehAtual && !n.alcancavel && !n.visitado && n.inteligenciaRevelada === false),
    true
  );

  const estSonarUp = aplicarUpgradeNaveCampanha(congelarProfundo(estSonarEv), 'CORTEX_NAVEGACAO').estado;
  const resRevelar = executarAcaoCampanhaCompleta(
    estSonarUp,
    { tipo: 'ESCOLHER_OPCAO_EVENTO', payload: { idEvento: 'EXP_2_PLATAFORMA_FANTASMA', opcao: 'B' } },
    { pularModalDesfechoEvento: true }
  );
  assert.equal(resRevelar.ok, true);
  assert.equal(resRevelar.estado.mapaSetorial.cartaRevelada, true);
  const vmMapaRevelado = projetarViewModelWireframe(resRevelar.estado);
  assert.equal(vmMapaRevelado.mapaSetorialResumo.cartaRevelada, true);
  assert.equal(
    vmMapaRevelado.mapaSetorialResumo.nos.every((n) => n.inteligenciaRevelada === true && Boolean(n.subtipoCurto)),
    true
  );
  assert.equal(
    vmMapaRevelado.mapaSetorialResumo.rotas.some((r) => r.tipoCorrente === 'FAVORAVEL' || r.tipoCorrente === 'REVOLTO'),
    true
  );
  assert.equal(
    vmMapaRevelado.mapaSetorialResumo.rotas.every((r) => Number.isFinite(r.horasViagem) && r.horasViagem > 0),
    true
  );
  assert.equal(
    vmMapaRevelado.mapaSetorialResumo.nos
      .filter((n) => n.alcancavel)
      .every((n) => Number.isFinite(n.rotaAtiva?.horasViagem) && n.rotaAtiva.horasViagem > 0),
    true
  );

  // 10. Paridade 1:1 do Ghost Preview client-side (runtime-navegador.mjs <-> calcularGhostPreviewTermometro) [MUT-O6-41]
  const estGhostAlfa = criarEstadoCampanhaCompleta({
    faseInicial: 'COMBATE',
    idArquitetura: 'CARCACA_ALFA',
    setorNumero: 1,
    seedPartida: 'seed-ghost-client-alfa',
  });
  const vmGhostAlfa = projetarViewModelWireframe(estGhostAlfa);
  const vmGhostSifCliente = enriquecerGhostPreviewCliente(vmGhostAlfa, 'SISTEMA_SIF');
  assert.equal(
    vmGhostSifCliente.termometroSustentacao.ghostPreview.sustentacaoProjetadaKg,
    230,
    '[MUT-O6-41] Ghost Preview client-side em SISTEMA_SIF na Carcaça Alfa (225 kg / 260 kg) deve projetar 230 kg estável no Foil (1:1 com calcularGhostPreviewTermometro)'
  );
  assert.equal(vmGhostSifCliente.termometroSustentacao.ghostPreview.causariaQuedaNoMar, false);
  assert.equal(vmGhostSifCliente.termometroSustentacao.ghostPreview.rotuloFantasma, '[ESTÁVEL NO FOIL]');

  // Também valida o caminho de fallback sem mapaGhostPorHitbox (paridade numérica por câmara)
  const vmSemMapaSsot = {
    ...vmGhostAlfa,
    termometroSustentacao: { ...vmGhostAlfa.termometroSustentacao, mapaGhostPorHitbox: null },
  };
  const vmGhostSifFallback = enriquecerGhostPreviewCliente(vmSemMapaSsot, 'SISTEMA_SIF');
  assert.equal(vmGhostSifFallback.termometroSustentacao.ghostPreview.sustentacaoProjetadaKg, 230);
  assert.equal(vmGhostSifFallback.termometroSustentacao.ghostPreview.causariaQuedaNoMar, false);

  // Mergulho Tático em Touchdown com sobrepeso (285 kg > 260 kg) deve acusar [PESADO DEMAIS!] em vez de [EMERGIR -> FOIL]
  const clGhostPesado = structuredClone(estGhostAlfa);
  clGhostPesado.naveJogador.estadoFisico = '2_TOUCHDOWN';
  clGhostPesado.naveJogador.mergulhoTaticoAtivo = true;
  clGhostPesado.naveJogador.nivelBlindagem = 4; // +60 kg -> 285 kg > 260 kg
  const vmGhostPesado = projetarViewModelWireframe(congelarProfundo(clGhostPesado));
  const vmGhostMergulho = enriquecerGhostPreviewCliente(vmGhostPesado, 'BTN_MERGULHO_TATICO');
  assert.equal(vmGhostMergulho.termometroSustentacao.ghostPreview.sustentacaoProjetadaKg, 260);
  assert.equal(vmGhostMergulho.termometroSustentacao.ghostPreview.causariaQuedaNoMar, true);
  assert.equal(vmGhostMergulho.termometroSustentacao.ghostPreview.rotuloFantasma, '[PESADO DEMAIS!]');

  // Válvula externa de câmara já seca (0 kg) deve projetar 0 kg de perda de água
  const clGhostCamSeca = structuredClone(estGhostAlfa);
  const cam4Seca = clGhostCamSeca.naveJogador.camaras.find((c) => c.id === 4);
  cam4Seca.aguaKg = 0;
  const vmGhostCamSeca = projetarViewModelWireframe(congelarProfundo(clGhostCamSeca));
  const vmGhostValv4 = enriquecerGhostPreviewCliente(vmGhostCamSeca, 'VALVULA_CAMARA_4');
  assert.equal(
    vmGhostValv4.termometroSustentacao.ghostPreview.aguaProjetadaKg,
    vmGhostValv4.termometroSustentacao.aguaTotalKg
  );

  // 11. Corte tático opaco de BARCO_1_LANCHA (0 vazamento de marinheiro assado + Lei L3) e badge SOS na base do Mapa [MUT-O6-42]
  const assetsLancha = obterAssetsConceitoHiBit();
  const tabLancha = obterTabelasRasterUnificado();
  const clLanchaComTrip = structuredClone(estGhostAlfa);
  clLanchaComTrip.alvoCombate = gerarAlvoInimigoEscaladoSetor('seed-lancha-cutaway', 1, 'BARCO_1_LANCHA');
  const estLanchaComTrip = congelarProfundo(clLanchaComTrip);
  const vmLanchaComTrip = projetarViewModelWireframe(estLanchaComTrip);
  const hbLancha = obterMapaHitboxesNativo(vmLanchaComTrip);
  const rgbaLanchaComTrip = rasterizarQuadroRgba960x540(vmLanchaComTrip, { tempoSeg: 0.4 }, assetsLancha, hbLancha, tabLancha);

  const clLanchaVazia = structuredClone(clLanchaComTrip);
  clLanchaVazia.alvoCombate.tripulacao = [];
  for (const s of clLanchaVazia.alvoCombate.salasOuOrgaos) {
    s.tripulantes = [];
  }
  const vmLanchaVazia = projetarViewModelWireframe(congelarProfundo(clLanchaVazia));
  const rgbaLanchaVazia = rasterizarQuadroRgba960x540(vmLanchaVazia, { tempoSeg: 0.4 }, assetsLancha, hbLancha, tabLancha);

  const clLanchaTurva = structuredClone(clLanchaComTrip);
  clLanchaTurva.alvoCombate.canalVisibilidadeSonar = 'NEGADO_SONAR';
  const vmLanchaTurva = projetarViewModelWireframe(congelarProfundo(clLanchaTurva));
  const rgbaLanchaTurva = rasterizarQuadroRgba960x540(vmLanchaTurva, { tempoSeg: 0.4 }, assetsLancha, hbLancha, tabLancha);

  const hbCabineLancha = hbLancha.find((h) => h.tipo === 'SALA_ALVO' && /CABINE/i.test(String(h.metadados?.nomeSala ?? ''))) ??
    hbLancha.find((h) => h.idHitbox === 'SALA_ALVO_2');
  let diffCabineTripVsVazia = 0;
  let diffCabineTripVsTurva = 0;
  for (let py = hbCabineLancha.y + 12; py < hbCabineLancha.y + hbCabineLancha.altura - 2; py += 1) {
    for (let px = hbCabineLancha.x + 2; px < hbCabineLancha.x + hbCabineLancha.largura - 2; px += 1) {
      const idx = (py * 960 + px) * 4;
      if (
        rgbaLanchaComTrip[idx] !== rgbaLanchaVazia[idx] ||
        rgbaLanchaComTrip[idx + 1] !== rgbaLanchaVazia[idx + 1] ||
        rgbaLanchaComTrip[idx + 2] !== rgbaLanchaVazia[idx + 2]
      ) {
        diffCabineTripVsVazia += 1;
      }
      if (
        rgbaLanchaComTrip[idx] !== rgbaLanchaTurva[idx] ||
        rgbaLanchaComTrip[idx + 1] !== rgbaLanchaTurva[idx + 1] ||
        rgbaLanchaComTrip[idx + 2] !== rgbaLanchaTurva[idx + 2]
      ) {
        diffCabineTripVsTurva += 1;
      }
    }
  }
  assert.equal(
    diffCabineTripVsVazia >= 30 && diffCabineTripVsTurva >= 30,
    true,
    '[MUT-O6-42] BARCO_1_LANCHA deve desenhar corte tático opaco nas 4 salas (ocultando marinheiros assados e respeitando tripulação viva / Lei L3)'
  );

  // Nó SOS na fileira inferior do mapa (yMn = 59 -> hb.y >= 375) deve renderizar badge [SOS Xh] acima da boia sem ser suprimido
  const clMapaSosBase = structuredClone(estSonarUp);
  clMapaSosBase.meta.faseJogo = 'MAPA';
  clMapaSosBase.mapaSetorial.relogioSetorHoras = 2;
  const idxNoBase = clMapaSosBase.mapaSetorial.nos.findIndex((n) => n.id !== clMapaSosBase.mapaSetorial.noAtualId);
  clMapaSosBase.mapaSetorial.nos[idxNoBase] = {
    ...clMapaSosBase.mapaSetorial.nos[idxNoBase],
    tipoNo: 'SOS',
    xMn: 60,
    yMn: 59,
    tPrazoHoras: 7,
  };
  const vmMapaSosBase = projetarViewModelWireframe(congelarProfundo(clMapaSosBase));
  const hbMapaSosBase = obterMapaHitboxesNativo(vmMapaSosBase);
  const hbNoSosBase = hbMapaSosBase.find((h) => h.idHitbox === `NO_MAPA_${clMapaSosBase.mapaSetorial.nos[idxNoBase].id}`);
  assert.equal(hbNoSosBase.y + hbNoSosBase.altura + 14 >= 398, true);
  const rgbaMapaSosBase = rasterizarQuadroRgba960x540(vmMapaSosBase, { tempoSeg: 0.2 }, assetsLancha, hbMapaSosBase, tabLancha);
  let pxBadgeAcimaBoia = 0;
  for (let py = hbNoSosBase.y - 13; py <= hbNoSosBase.y - 2; py += 1) {
    for (let px = hbNoSosBase.x - 14; px <= hbNoSosBase.x + hbNoSosBase.largura + 14; px += 1) {
      const idx = (py * 960 + px) * 4;
      if (rgbaMapaSosBase[idx] > 200 && rgbaMapaSosBase[idx + 1] > 140 && rgbaMapaSosBase[idx + 2] < 80) {
        pxBadgeAcimaBoia += 1;
      }
    }
  }
  assert.equal(pxBadgeAcimaBoia >= 16, true);

  // 12. Draga Fase 1: zerar 'Casa de Máquinas e Bombas de Porão' (c/ acento) derruba esquiva a 0% + hover LOJA_VENDER_PORAO_0 [MUT-O6-43]
  const dragaF1Motor = structuredClone(criarEstadoChefeDraga(1));
  assert.equal(dragaF1Motor.esquivaBasePct, 20);
  const salaCasaMaqF1 = dragaF1Motor.salasOuOrgaos.find((s) => /M[AÁ]QUINAS/i.test(s.nome));
  salaCasaMaqF1.integridadeAtual = 0;
  recalcularSubsistemasAlvoInPlace(dragaF1Motor);
  assert.equal(
    dragaF1Motor.esquivaEfetivaPct,
    0,
    '[MUT-O6-43] Zerar a integridade da Casa de Máquinas (Sala 6) na Fase 1 da Draga deve derrubar a esquiva efetiva para 0%'
  );

  const clLojaHoverPorao = structuredClone(estGhostAlfa);
  clLojaHoverPorao.meta.faseJogo = 'LOJA';
  clLojaHoverPorao.naveJogador.poraoCarga = [
    { slotIndex: 0, item: { id: 'GLANDULA_BAIACU', tipo: 'ORGAO', nome: 'Glândula de Baiacu', pesoKg: 5 } },
    { slotIndex: 1, item: null },
    { slotIndex: 2, item: null },
    { slotIndex: 3, item: null },
  ];
  const vmLojaPorao = projetarViewModelWireframe(congelarProfundo(clLojaHoverPorao));
  const hbLojaPorao = obterMapaHitboxesNativo(vmLojaPorao);
  const rgbaLojaSemHov = rasterizarQuadroRgba960x540(vmLojaPorao, { tempoSeg: 0.2 }, assetsLancha, hbLojaPorao, tabLancha);
  const rgbaLojaHovP0 = rasterizarQuadroRgba960x540(
    vmLojaPorao,
    { tempoSeg: 0.2, hoverHitboxId: 'LOJA_VENDER_PORAO_0' },
    assetsLancha,
    hbLojaPorao,
    tabLancha
  );
  let diffRodapeLojaPorao = 0;
  for (let py = 404; py <= 423; py += 1) {
    for (let px = 160; px <= 460; px += 1) {
      const idx = (py * 960 + px) * 4;
      if (
        rgbaLojaSemHov[idx] !== rgbaLojaHovP0[idx] ||
        rgbaLojaSemHov[idx + 1] !== rgbaLojaHovP0[idx + 1] ||
        rgbaLojaSemHov[idx + 2] !== rgbaLojaHovP0[idx + 2]
      ) {
        diffRodapeLojaPorao += 1;
      }
    }
  }
  assert.equal(diffRodapeLojaPorao >= 40, true);

  console.log(
    '[N4] Portão 08.14 examinado: Hangar SSOT [7,8,6,6,7], 17 Eventos + Blue Options reais, Carta c/ correntes + cartaRevelada, Ghost 1:1, Corte Lancha, Draga F1 e Biomas S3/S5'
  );
});






