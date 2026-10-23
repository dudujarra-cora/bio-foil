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

import { criarEstadoInicialPartida, congelarProfundo } from '../src/onda1-fisica/estado-inicial.mjs';
import { avancarTickFisicaHidraulica } from '../src/onda1-fisica/tick-hidraulica-foil.mjs';
import { criarAlvoSetor1Canonico } from '../src/onda3-inimigos/ia-barco-monstro.mjs';
import { inspecionarSalaAlvo } from '../src/onda2-combate/tick-tripulacao.mjs';
import {
  ORCAMENTO_LAYOUT_NATIVO_85C,
  projetarViewModelWireframe,
} from '../src/onda6-ui/presenter-wireframe.mjs';
import {
  ESQUEMA_15_COMANDOS_85A,
  despacharComandoUi,
} from '../src/onda6-ui/despacho-comandos.mjs';
import {
  CARCACAS_PERFIL_85B,
  criarPerfilInicial,
  atualizarPerfilComMetricasRun,
  gerenciarPersistenciaTransicao,
} from '../src/onda6-ui/persistencia-perfil.mjs';
import {
  CATALOGO_8_CUES_SONOROS_85C,
  avaliarCuesSonorosAtivos,
} from '../src/onda6-ui/cues-audio.mjs';

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
});
