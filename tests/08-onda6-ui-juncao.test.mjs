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
import { CONSTANTES_SISTEMAS_ARMAS } from '../src/onda2-combate/tick-sistemas-armas.mjs';
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
  obterQuadroAnimacaoEntidade,
  calcularEncaixeCamaraBioNave,
  calcularEncaixeDorsalArma,
  renderizarQuadroAnimadoCenaBiofoil,
  rasterizarSpriteRgba,
  exportarAtlasHiBitsPngBuffer,
  exportarPacoteAssets60Fps,
  interpolarEstadoVisual60Fps,
  rasterizarQuadroRgba960x540,
  renderizarViewModelNoCanvas2d,
  renderizarCenaCanvasParaPngBuffer,
  escaparHtmlSeguro,
  gerarCodigoJsClienteBiofoil,
  gerarHtmlClienteJogavelBiofoil,
  iniciarServidorClienteWebBiofoil,
} from '../src/onda6-ui/presenter-wireframe.mjs';
import {
  ESQUEMA_15_COMANDOS_85A,
  COORDENADAS_GRADE_CAMARAS_16A,
  despacharComandoUi,
  converterCoordenadaTelaParaNativa,
  obterMapaHitboxesNativo,
  calcularGhostPreviewTermometro,
  traduzirInputDomParaComandoUi,
  avancarTickPartidaEmTempoReal,
} from '../src/onda6-ui/despacho-comandos.mjs';
import {
  CARCACAS_PERFIL_85B,
  criarPerfilInicial,
  atualizarPerfilComMetricasRun,
  gerenciarPersistenciaTransicao,
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
  assert.equal(CADEIA_CANONICA_GDD.length, 9);
  assert.equal(CADEIA_CANONICA_TESTES.length, 9);
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
  assert.equal(pacote60.versao, 'STEAM_60FPS_V3');
  assert.equal(Object.keys(pacote60.placas).length, 7, '[N4] Examinadas: 7 placas cênicas Hi-Bit base64 (F1, F2, F3, F4, Draga, Evento, Mapa)');
  assert.equal(Object.keys(pacote60.retratos).length, 4, '[N4] Examinados: 4 retratos orgânicos Hi-Bit base64');
  assert.equal(Object.keys(pacote60.iconesHiBit).length, 22, '[N4] Examinados: 22 sprites/ícones Hi-Bit base64 (7 armas + 6 órgãos + 3 invasores + 6 extras)');

  const srv60 = await iniciarServidorClienteWebBiofoil({ porta: 0, seedInicial: 'seed-60fps-http' });
  try {
    const respAssets = await fetch(`${srv60.url}/api/assets-60fps`);
    assert.equal(respAssets.status, 200);
    const jsonAssets = await respAssets.json();
    assert.equal(jsonAssets.versao, 'STEAM_60FPS_V3');
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
    return { largura: dec.largura, altura: dec.altura, rgba: new Uint8ClampedArray(dec.rgba) };
  };
  const iconesDecodificadosCli = {};
  for (const [kIcone, uriIcone] of Object.entries(pacote60.iconesHiBit)) {
    iconesDecodificadosCli[kIcone] = decodificarDataUri(uriIcone);
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
    iconesHiBit: Object.freeze(iconesDecodificadosCli),
  });
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

  // Executa a exata função rasterizarQuadroRgba960x540 extraída de /cliente.js num sandbox isolado
  const iniFnRaster = codigoClienteJs.indexOf('function rasterizarQuadroRgba960x540');
  const fimFnRaster = codigoClienteJs.indexOf('let estadoCliente = JSON.parse');
  assert.equal(iniFnRaster > 0 && fimFnRaster > iniFnRaster, true);
  const fnRasterExtraidaCliente = new Function(
    `"use strict";\n${codigoClienteJs.slice(iniFnRaster, fimFnRaster)}\nreturn rasterizarQuadroRgba960x540;`
  )();

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
  assert.equal(resEvKeyB.resultadoMotor?.aceito, true);

  console.log(
    `[N4] Portão 08.7 examinado: ${telas7.length} telas com 0 bytes diff (${bytesComparados} bytes RGBA), ${totalHitboxesZeroColisao9} hitboxes 0 colisão, GD-1/GD-2/GD-3 e 60 FPS validados`
  );
});



