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


