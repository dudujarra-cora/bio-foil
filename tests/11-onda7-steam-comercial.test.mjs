import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  obterCatalogoLayoutsNavesSteam,
  resolverLayoutNaveSteam,
  resolverLayoutTopologiaNave,
  obterBocaDorsalLayout960,
  obterLimitesPorSalaLayout,
  calcularRetangulosCamarasMoldadas960,
  calcularCaminhoBfsTopologiaNave,
} from '../src/onda7-steam/topologias-naves-ab.mjs';
import {
  obterCatalogo24ArmasSteam,
  obterCatalogo16OrgaosSteam,
  resolverArmaCatalogoUnificado,
  resolverOrgaoCatalogoUnificado,
  calcularModificadoresPassivosOrgaosSteam,
  obterCatalogoSubsistemasTaticosSteam,
  registrarXpTripulanteSteam,
  sortearVitrineLojaSteam,
  aplicarKitLayoutEDificuldadeSteamNaRun,
} from '../src/onda7-steam/catalogo-armas-orgaos-ae.mjs';
import { obterEventosAeSetores1a4 } from '../src/onda7-steam/eventos-ae-setores-1a4.mjs';
import {
  obterEventosAeSetores5a8,
  obterCatalogo100EventosSteam,
  resolverTemplateEventoUnificado,
  avaliarElegibilidadeBlueOptionSteam,
  sortearEventoCampanhaSteamSemRepeticao,
  plantarBoiaQuestNoSetor,
  resolverVisitaNoMapaSteam,
} from '../src/onda7-steam/eventos-ae-setores-5a8.mjs';
import {
  obterConfiguracaoDificuldadeSteam,
  ciclarDificuldadeSteam,
  escalarInimigoPorDificuldade,
  selecionarAlvoInimigoInteligente,
  obterCatalogo24ConquistasSteam,
  avaliarConquistasSteam,
  verificarLayoutTipoBDesbloqueado,
  criarConfiguracoesSteam,
  atualizarConfiguracoesSteam,
  reatribuirAtalhoTecladoSteam,
  aplicarAcaoMetaSteamNoEstado,
} from '../src/onda7-steam/dificuldades-conquistas-opcoes.mjs';
import {
  obterEtapasTutorialSteam,
  criarEstadoTutorialSteam,
  obterEtapaAtualTutorialSteam,
  pularTutorialSteam,
  avancarPassoTutorialSteam,
  registrarAcaoNoTutorialSteam,
} from '../src/onda7-steam/tutorial-interativo.mjs';
import {
  normalizarIdiomaSteam,
  tUi,
  obterSiglaHudArma,
  obterRotuloCurtoCamara,
  obterRotuloCurtoSalaInimiga,
  traduzirEventoSteam,
  auditarZeroTruncamentoViewModel,
} from '../src/onda7-steam/i18n-dicionario-ui.mjs';
import {
  FREQ_CORTE_PAUSA_TATICA_HZ,
  obterListaCompletaArquivosOggSteam,
  calcularMixagemAdaptativaSteam,
  resolverAmostraFoleyPorEvento,
  resolverChaveFoleyEventoVisual,
  resolverPanEstereoEventoVisual,
  criarMotorAudioOggFoleySteam,
} from '../src/onda7-steam/motor-audio-ogg-foley.mjs';
import {
  calcularEstadoJuiceCombate60Fps,
  rasterizarInundacaoVivaCamarasRgba,
  rasterizarParticulasEJuiceRgba,
} from '../src/onda7-steam/particulas-juice-60fps.mjs';
import {
  obterHitboxesModaisEControlesSteam,
  rasterizarTopologiaConectoresNaveRgba,
  rasterizarBarraControlesHangarSteamRgba,
  rasterizarModalOpcoesSteamRgba,
  rasterizarModalConquistasSteamRgba,
  rasterizarOverlayTutorialSteamRgba,
  rasterizarPopupConquistaSteamRgba,
  rasterizarPilulasTaticasCombateSteamRgba,
  rasterizarCamadasComerciaisSteamRgba,
} from '../src/onda7-steam/renderizador-modais-steam.mjs';
import {
  calcularViewportDisplaySteam,
  traduzirEstadoGamepadSteamDeck,
  encontrarHitboxSnapDirecionalGamepad,
  criarRuntimeLocalSteamCliente,
} from '../src/onda7-steam/runtime-local-steam-cliente.mjs';
import {
  STEAM_APP_ID_PADRAO,
  detectarAmbienteSteamDeck,
  formatarRichPresenceSteam,
  inicializarSteamworksHost,
  compilarHostNativoMacOsBioFoil,
  resolverHostDesktopNativoMultiplataforma,
  empacotarDepotSteamAutocontido,
} from '../src/onda7-steam/steamworks-desktop-host.mjs';
import { gerarAssetsAudioOggSteam } from '../scripts/gerar-assets-audio-ogg.mjs';
import {
  construirConfiguracaoJanelaDesktopSteam,
  iniciarAplicacaoElectronSteam,
} from '../steam-desktop/electron-main.mjs';
import { criarPonteSeguraPreloadSteam } from '../steam-desktop/electron-preload.mjs';

import { criarEstadoInicialPartida, congelarProfundo } from '../src/onda1-fisica/estado-inicial.mjs';
import { calcularSustentacaoFoil, avancarTickFisicaHidraulica } from '../src/onda1-fisica/tick-hidraulica-foil.mjs';
import {
  calcularTempoRecargaEfetivoArma,
  calcularEsquivaEfetivaNave,
  calcularTempoRegenBarreiraSeg,
  validarCaminhoBeamAdjacente,
  avancarTickSistemasEArmas,
} from '../src/onda2-combate/tick-sistemas-armas.mjs';
import { avancarTickTripulacao } from '../src/onda2-combate/tick-tripulacao.mjs';
import { criarAlvoSetor1Canonico } from '../src/onda3-inimigos/ia-barco-monstro.mjs';
import { resolverImpactoNoAlvo } from '../src/onda3-inimigos/abordagem-vitoria.mjs';
import { avancarTickPartidaEmTempoReal } from '../src/onda6-ui/despacho-comandos.mjs';
import { equiparArsenalModularInimigoSteam, anexarMapaSetorAoEstado } from '../src/onda6-ui/encontros-eventos-campanha.mjs';
import { obterMapaHitboxesNativo, calcularGhostPreviewTermometro } from '../src/onda6-ui/hitboxes-layout.mjs';
import { interpolarEstadoVisual60Fps } from '../src/onda6-ui/interpolador-60fps.mjs';
import { formatarMensagemRejeicaoUi, enriquecerGhostPreviewCliente } from '../src/onda6-ui/runtime-navegador.mjs';
import { projetarViewModelWireframe } from '../src/onda6-ui/presenter-wireframe.mjs';
import { rasterizarQuadroRgba960x540 } from '../src/onda6-ui/renderizador-canvas.mjs';
import {
  obterAssetsConceitoHiBit,
  obterTabelasRasterUnificado,
} from '../src/onda6-ui/assets-hibit.mjs';
import {
  gerarCodigoJsClienteBiofoil,
  iniciarServidorClienteWebBiofoil,
} from '../src/onda6-ui/cliente-web.mjs';
import { verificarRegraTestesParaTudo } from '../src/gdd-parser.mjs';

const DIRETORIO_RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function contarPixelsDiferentes(bufA, bufB) {
  let diff = 0;
  for (let i = 0; i < bufA.length; i += 4) {
    if (
      bufA[i] !== bufB[i] ||
      bufA[i + 1] !== bufB[i + 1] ||
      bufA[i + 2] !== bufB[i + 2] ||
      bufA[i + 3] !== bufB[i + 3]
    ) {
      diff += 1;
    }
  }
  return diff;
}

test('[PORTÃO 10.1 | Pilar 1 Steam >= 9.0/10] 10 Topologias A/B Moldadas, 0 Colisão AABB, Partículas/Juice 60 FPS e Paridade 0-Byte Server<->Browser', () => {
  const layouts = obterCatalogoLayoutsNavesSteam();
  assert.equal(layouts.length, 10, 'Devem existir exatamente 10 layouts (5 espécies x Variantes A e B)');
  assert.equal(Object.isFrozen(layouts), true);

  let permutacoesVerificadas = 0;
  let paresBfsConectados = 0;

  for (const lay of layouts) {
    const porPar = resolverLayoutNaveSteam(lay.idArquitetura, lay.variante);
    const porIdUnico = resolverLayoutTopologiaNave(lay.idLayout);
    assert.equal(porPar.idLayout, lay.idLayout);
    assert.equal(porIdUnico.idLayout, lay.idLayout);
    assert.ok(lay.slotsArmasAtivos >= 2 && lay.slotsArmasAtivos <= 4);

    for (let s = 0; s < 4; s += 1) {
      const [bx, by] = obterBocaDorsalLayout960(lay.idLayout, lay.variante, s, { ehTouchdown: false });
      assert.ok(bx >= 300 && bx <= 620 && by >= 40 && by <= 160);
    }

    // Conectividade BFS completa e simetria entre todas as 8 câmaras
    for (let orig = 1; orig <= 8; orig += 1) {
      for (let dest = 1; dest <= 8; dest += 1) {
        const rota = calcularCaminhoBfsTopologiaNave(lay.grafoAdjacencia, orig, dest);
        assert.ok(Array.isArray(rota) && rota.length >= 1, `Câmara ${orig}->${dest} desconectada em ${lay.idLayout}`);
        assert.equal(rota[0], orig);
        assert.equal(rota[rota.length - 1], dest);
        paresBfsConectados += 1;
      }
    }

    // 0 sobreposição AABB em todas as 4 permutações físicas
    for (const ehTouchdown of [false, true]) {
      for (const ehMonstroAlvo of [false, true]) {
        const moldado = calcularRetangulosCamarasMoldadas960({
          idArquitetura: lay.idArquitetura,
          varianteLayout: lay.variante,
          ehTouchdown,
          ehMonstroAlvo,
        });
        const rets = Object.values(moldado.camaras);
        assert.equal(rets.length, 8);
        for (let i = 0; i < rets.length; i += 1) {
          assert.ok(rets[i].largura >= 68 && rets[i].altura >= 33);
          for (let j = i + 1; j < rets.length; j += 1) {
            const a = rets[i];
            const b = rets[j];
            const colide = a.x < b.x + b.largura && a.x + a.largura > b.x && a.y < b.y + b.altura && a.y + a.altura > b.y;
            assert.equal(colide, false, `Colisão AABB entre C${a.camaraId} e C${b.camaraId} em ${lay.idLayout}`);
          }
        }
        permutacoesVerificadas += 1;
      }
    }
  }

  // Motor de Partículas, Projéteis, Escudo de Bolhas, Esquiva e Inundação Viva a 60 FPS
  const vmJuice = {
    faseJogo: 'COMBATE',
    layoutId: 'MANTA_VOLT_B',
    tempoCombateSeg: 1.35,
    barreiraBolhas: { camadasAtuais: 3 },
    camaras: [
      { id: 1, massaAguaKg: 75, nivelAguaPct: 62, brechasCasco: 1, valvulaAberta: true, retangulo960: { x: 356, y: 126, largura: 80, altura: 42 } },
      { id: 4, massaAguaKg: 40, nivelAguaPct: 35, brechasCasco: 0, valvulaAberta: false, retangulo960: { x: 356, y: 218, largura: 80, altura: 42 } },
    ],
    projeteisAtivos: [
      { id: 'P1', familia: 'PROJETIL_ESPINHO', resultado: 'IMPACTO', origem: 'JOGADOR', slotIndice: 0, progresso: 0.92 },
      { id: 'P2', familia: 'FEIXE_NEURAL_BIO', resultado: 'EM_VOO', origem: 'JOGADOR', slotIndice: 1, progresso: 0.65 },
      { id: 'P3', familia: 'PULSO_IONICO', resultado: 'ESCUDO', origem: 'INIMIGO', xOrigem960: 710, yOrigem960: 180, xAlvo960: 410, yAlvo960: 210, progresso: 0.85 },
      { id: 'P4', familia: 'TORPEDO_ABISSAL', resultado: 'ESQUIVA', origem: 'INIMIGO', xOrigem960: 720, yOrigem960: 220, xAlvo960: 390, yAlvo960: 195, progresso: 0.55 },
      { id: 'P5', familia: 'BOMBA_OSMOTICA', resultado: 'IMPACTO', origem: 'JOGADOR', slotIndice: 2, progresso: 0.7 },
      { id: 'P6', familia: 'FLAK_MK2', resultado: 'EM_VOO', origem: 'JOGADOR', slotIndice: 3, progresso: 0.45 },
    ],
  };

  const estJuice = calcularEstadoJuiceCombate60Fps(vmJuice, { escala: 1, idioma: 'en-US' });
  assert.equal(estJuice.camadasBarreira, 3);
  assert.equal(estJuice.camarasHidraulicas.length, 2);
  assert.equal(estJuice.eventosBalisticos.length, 6);

  const bufInund = new Uint8ClampedArray(960 * 540 * 4);
  const pxHid = rasterizarInundacaoVivaCamarasRgba(bufInund, 960, 540, estJuice, []);
  assert.ok(pxHid > 500, 'Inundação viva + gêiser + válvula devem alterar pixels reais nas câmaras');

  const bufJuice = new Uint8ClampedArray(960 * 540 * 4);
  const resJuice = rasterizarParticulasEJuiceRgba(bufJuice, 960, 540, vmJuice, { escala: 1, idioma: 'en-US' });
  assert.ok(resJuice.pixelsAlterados > 900);

  // Renderizadores Modais Steam + Paridade 0-Byte Server <-> Browser Sandbox
  const bufModais = new Uint8ClampedArray(960 * 540 * 4);
  rasterizarTopologiaConectoresNaveRgba(bufModais, 960, 540, { layoutId: 'MANTA_VOLT_B', barraSuperior: { estadoFisico: '1_NO_FOIL' } });
  rasterizarBarraControlesHangarSteamRgba(bufModais, 960, 540, { faseJogo: 'INICIO', hangarResumo: { varianteSelecionada: 'B', dificuldadeSelecionada: 'DIFICIL' }, conquistasDesbloqueadas: ['ACH_MANTA_1_BLACKOUT_TOTAL'] });
  rasterizarModalOpcoesSteamRgba(bufModais, 960, 540, { configuracoesSteam: criarConfiguracoesSteam({ idioma: 'en-US' }) });
  rasterizarModalConquistasSteamRgba(bufModais, 960, 540, { conquistasDesbloqueadas: ['ACH_GLOBAL_PRIMEIRO_SALTO'] });
  const desenhouTut = rasterizarOverlayTutorialSteamRgba(bufModais, 960, 540, criarEstadoTutorialSteam(true), { idioma: 'pt-BR' });
  assert.equal(desenhouTut, true);

  const codigoClienteJs = gerarCodigoJsClienteBiofoil();
  const iniFn = codigoClienteJs.indexOf('function criarContextoPrimitivasRgba960x540');
  const fimFn = codigoClienteJs.indexOf('let estadoCliente = JSON.parse');
  const fnClienteSandbox = vm.runInNewContext(
    `(function() {\n"use strict";\n${codigoClienteJs.slice(iniFn, fimFn)}\nreturn rasterizarQuadroRgba960x540;\n})()`,
    { Math, Number, String, Boolean, Array, Object, Set, Map, WeakMap, Uint8Array, Uint8ClampedArray, Int16Array, Int32Array, Float64Array }
  );

  const assetsHiBit = obterAssetsConceitoHiBit();
  const tabelasRaster = obterTabelasRasterUnificado();
  const estCombateBase = {
    ...criarEstadoInicialPartida('seed-steam-paridade', 'MANTA_VOLT'),
    alvoCombate: criarAlvoSetor1Canonico('BARCO_HUMANO'),
  };
  const vmCombateSteam = {
    ...projetarViewModelWireframe(estCombateBase),
    edicaoComercialSteam: true,
    layoutId: 'MANTA_VOLT_B',
    configuracoesSteam: criarConfiguracoesSteam({ idioma: 'en-US' }),
    tutorialSteam: criarEstadoTutorialSteam(true),
    projeteisAtivos: vmJuice.projeteisAtivos,
  };
  const hbsSteam = obterMapaHitboxesNativo(vmCombateSteam);
  assert.ok(hbsSteam.some((h) => h.idHitbox === 'TUTORIAL_BTN_AVANCAR'));

  // Zero colisão AABB no Hangar Steam com todos os novos botões (Idioma, Conquistas, Opções, Tipo A/B, Dificuldade, Tutorial)
  const estHangarBase = criarEstadoInicialPartida({ seedPartida: 'hangar-steam', idArquitetura: 'CARCACA_ALFA', faseJogo: 'INICIO' });
  const vmHangarSteam = {
    ...projetarViewModelWireframe(estHangarBase),
    edicaoComercialSteam: true,
    configuracoesSteam: criarConfiguracoesSteam({ idioma: 'pt-BR' }),
  };
  const hbsHangarSteam = obterMapaHitboxesNativo(vmHangarSteam);
  const hbsModalOpcoes = obterHitboxesModaisEControlesSteam({ modalSteamAtivo: 'OPCOES' });
  assert.equal(hbsModalOpcoes.length, 28, 'Modal OPCOES deve expor 16 controles + 12 células STEAM_OPT_REBIND_* (grade 3x4 incluindo Z/Y/H/N)');
  assert.ok(hbsModalOpcoes.some((h) => h.idHitbox === 'STEAM_OPT_REBIND_MERGULHO_TATICO'));
  assert.ok(hbsModalOpcoes.some((h) => h.idHitbox === 'STEAM_OPT_REBIND_SONDA_HACK'));
  assert.ok(hbsModalOpcoes.some((h) => h.idHitbox === 'STEAM_OPT_REBIND_PARASITA_NEURAL'));
  assert.ok(hbsModalOpcoes.some((h) => h.idHitbox === 'STEAM_OPT_BARRA_VOL_MASTER'));
  assert.ok(hbsModalOpcoes.some((h) => h.idHitbox === 'STEAM_OPT_RESTAURAR_ATALHOS'));

  const bufPopupAch = new Uint8ClampedArray(960 * 540 * 4);
  const desenhouPopupAch = rasterizarPopupConquistaSteamRgba(bufPopupAch, 960, 540, {
    configuracoesSteam: criarConfiguracoesSteam({ idioma: 'en-US' }),
    popupConquistaRecente: { idConquista: 'ACH_GLOBAL_PRIMEIRO_SALTO', restanteSeg: 3.2 },
  });
  assert.equal(desenhouPopupAch, true, 'Popup dourado de conquista Steam deve renderizar quando restanteSeg > 0');
  assert.equal(
    rasterizarPopupConquistaSteamRgba(bufPopupAch, 960, 540, { popupConquistaRecente: null }),
    false
  );
  for (let i = 0; i < hbsHangarSteam.length; i += 1) {
    for (let j = i + 1; j < hbsHangarSteam.length; j += 1) {
      const a = hbsHangarSteam[i];
      const b = hbsHangarSteam[j];
      const col = a.x < b.x + b.largura && a.x + a.largura > b.x && a.y < b.y + b.altura && a.y + a.altura > b.y;
      assert.equal(col, false, `Hitboxes do Hangar Steam colidiram: ${a.idHitbox} vs ${b.idHitbox}`);
    }
  }

  // Paridade 0-Byte Server <-> Browser Sandbox sobre cena completa Steam (Topologia B + Juice + Tutorial EN-US)
  const rgbaServer = rasterizarQuadroRgba960x540(vmCombateSteam, { tempoSeg: 1.25 }, assetsHiBit, hbsSteam, tabelasRaster);
  const rgbaBrowser = fnClienteSandbox(vmCombateSteam, { tempoSeg: 1.25 }, assetsHiBit, hbsSteam, tabelasRaster);
  assert.equal(contarPixelsDiferentes(rgbaServer, rgbaBrowser), 0, 'Paridade Server<->Browser deve ser 0 pixels diferentes');

  // E que Manta Volt B produz pixels diferentes da Carcaça Alfa A!
  const vmAlfaA = { ...vmCombateSteam, layoutId: 'CARCACA_ALFA_A' };
  const rgbaAlfaA = rasterizarQuadroRgba960x540(vmAlfaA, { tempoSeg: 1.25 }, assetsHiBit, obterMapaHitboxesNativo(vmAlfaA), tabelasRaster);
  assert.ok(contarPixelsDiferentes(rgbaServer, rgbaAlfaA) > 400, 'Layouts distintos devem produzir geometria visual real diferente');

  rasterizarCamadasComerciaisSteamRgba(new Uint8ClampedArray(960 * 540 * 4), 960, 540, { faseJogo: 'INICIO', modalSteamAtivo: 'OPCOES' });

  // Inspeção de 24 cartões de conquistas + Interpolação 60 FPS Topologia Tipo B (4 bocas dorsais + duto 1->6) + Screen Shake OFF
  const hbsModalConq = obterHitboxesModaisEControlesSteam({ modalSteamAtivo: 'CONQUISTAS' });
  assert.equal(hbsModalConq.length, 25, 'Modal CONQUISTAS deve expor 24 cartões STEAM_CONQ_CARD_0..23 + botão fechar');
  assert.equal(hbsModalConq[0].idHitbox, 'STEAM_CONQ_CARD_0');
  assert.equal(hbsModalConq[23].idHitbox, 'STEAM_CONQ_CARD_23');

  const vmMantaBEvento = {
    ...vmCombateSteam,
    layoutId: 'MANTA_VOLT_B',
    eventosVisuaisUltimoTick: [
      { idEvento: 1, tipo: 'DISPARO_JOGADOR', slotIndex: 3, salaAlvoId: 1, chassiId: 'VULCAO_HIDROTERMAL_CADEIA', acertou: true },
    ],
  };
  const quadInterpB = interpolarEstadoVisual60Fps(null, vmMantaBEvento, 1 / 60, { hitboxes: hbsSteam });
  assert.equal(quadInterpB.projeteisAtivos.length, 1);
  const [bocaSlot3X] = obterBocaDorsalLayout960('MANTA_VOLT_B', undefined, 3);
  assert.equal(quadInterpB.projeteisAtivos[0].xOrigem, bocaSlot3X, 'Interpolador 60 FPS deve usar a boca dorsal real do slot 3');

  console.log(`[N4] Pilar 1 Arte/Juice verificado: ${layouts.length} topologias A/B, ${permutacoesVerificadas} permutações AABB 0-colisão, ${paresBfsConectados} rotas BFS, 0px diff Server<->Browser`);
});

test('[PORTÃO 10.2 | Pilar 2 Steam >= 9.0/10] 57 Trilhas (incl. Loja Recife-Forja), 8 Ambiências de Bioma & Foley .OGG Vorbis Reais Estéreo 44.1 kHz (S1..S8 + 3 Fases Draga + Pausa 950 Hz + Mergulho 400 Hz)', async () => {
  const arquivosOgg = obterListaCompletaArquivosOggSteam();
  assert.equal(arquivosOgg.length, 57, 'Devem existir 31 trilhas/ambiências (23 músicas incl. Loja + 8 biomas S1..S8) + 26 foleys = 57 arquivos .ogg');

  const pastaAudio = path.join(DIRETORIO_RAIZ, 'assets', 'audio');
  let bytesTotaisOgg = 0;
  for (const nome of arquivosOgg) {
    const p = path.join(pastaAudio, nome);
    assert.equal(fs.existsSync(p), true, `Arquivo .ogg ausente: ${nome}`);
    const st = fs.statSync(p);
    assert.ok(st.size >= 4000, `Arquivo .ogg suspeitamente pequeno (${st.size}B): ${nome}`);
    const cabecalho = fs.readFileSync(p).subarray(0, 4).toString('ascii');
    assert.equal(cabecalho, 'OggS', `Assinatura mágica OggS inválida em ${nome}`);
    bytesTotaisOgg += st.size;
  }

  // Validação real ffprobe de Ogg Vorbis 44.1 kHz estéreo e duração de trilha multi-seção (>= 60s)
  if (fs.existsSync('/opt/homebrew/bin/ffprobe')) {
    const probe = spawnSync(
      '/opt/homebrew/bin/ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-show_entries', 'stream=codec_name,sample_rate,channels', '-of', 'json', path.join(pastaAudio, 'music_zone1_explore.ogg')],
      { encoding: 'utf8' }
    );
    assert.equal(probe.status, 0);
    const meta = JSON.parse(probe.stdout);
    assert.equal(meta.streams[0].codec_name, 'vorbis');
    assert.equal(Number(meta.streams[0].sample_rate), 44100);
    assert.equal(meta.streams[0].channels, 2);
    assert.ok(Number(meta.format.duration) >= 60);
  }

  const mixLojaRecife = calcularMixagemAdaptativaSteam({ faseJogo: 'LOJA', setorNumero: 4 });
  assert.equal(mixLojaRecife.trilhaExploreId, 'LOJA_RECIFE', 'Fase LOJA deve tocar o tema dedicado music_reef_forge_shop.ogg');
  assert.equal(mixLojaRecife.trilhaCombatId, null);

  // Teste direto do sintetizador/codificador DSP `gerarAssetsAudioOggSteam` em pasta isolada
  const dirTmpOgg = fs.mkdtempSync(path.join(os.tmpdir(), 'biofoil-ogg-test-'));
  try {
    const relGeracao = gerarAssetsAudioOggSteam(dirTmpOgg, { escalaDuracao: 0.015 });
    assert.equal(relGeracao.totalArquivos, 57);
    assert.equal(fs.existsSync(path.join(dirTmpOgg, 'music_reef_forge_shop.ogg')), true);
    assert.equal(fs.existsSync(path.join(dirTmpOgg, 'music_boss_dredge_p3.ogg')), true);
    assert.equal(fs.existsSync(path.join(dirTmpOgg, 'ambience_sector5_storm.ogg')), true);
    assert.equal(fs.existsSync(path.join(dirTmpOgg, 'ambience_sector8_dredge.ogg')), true);
    assert.equal(fs.existsSync(path.join(dirTmpOgg, 'foley_hack_probe_ion.ogg')), true);
    assert.equal(fs.existsSync(path.join(dirTmpOgg, 'foley_sonic_needle_pierce.ogg')), true);
    assert.equal(fs.existsSync(path.join(dirTmpOgg, 'foley_boarding_pod_launch.ogg')), true);
  } finally {
    fs.rmSync(dirTmpOgg, { recursive: true, force: true });
  }

  // Crossfade de igual potência Explore <-> Combat para todos os 8 setores (S1..S8) e 3 fases da Draga!
  const mapaEsperadoSetor = {
    1: 'ZONA1',
    2: 'BIOMA_S2',
    3: 'BIOMA_S3',
    4: 'ZONA2',
    5: 'BIOMA_S5',
    6: 'ZONA3',
    7: 'BIOMA_S7',
    8: 'BIOMA_S8',
  };
  for (let s = 1; s <= 8; s += 1) {
    const mixSetor = calcularMixagemAdaptativaSteam({ faseJogo: 'MAPA', setorNumero: s, submerso400Hz: false }, { volumeMaster: 100, volumeMusica: 80, volumeSfx: 90 });
    assert.equal(mixSetor.trilhaExploreId, `${mapaEsperadoSetor[s]}_EXPLORE`);
    assert.equal(mixSetor.trilhaCombatId, `${mapaEsperadoSetor[s]}_COMBAT`);
  }
  const mapaEsperadoDraga = { 1: 'BOSS_DRAGA', 2: 'BOSS_DRAGA_FASE2', 3: 'BOSS_DRAGA_FASE3' };
  for (const fDraga of [1, 2, 3]) {
    const mixBoss = calcularMixagemAdaptativaSteam({ faseJogo: 'COMBATE', setorNumero: 8, ehBossDraga: true, faseChefe: fDraga }, { volumeMaster: 100, volumeMusica: 80, volumeSfx: 90 });
    assert.equal(mixBoss.trilhaExploreId, mapaEsperadoDraga[fDraga]);
  }
  const mixCalmo = calcularMixagemAdaptativaSteam({ faseJogo: 'MAPA', setorNumero: 4, submerso400Hz: false }, { volumeMaster: 100, volumeMusica: 80, volumeSfx: 90 });
  assert.equal(mixCalmo.ganhoStemExplore, 1);
  assert.equal(mixCalmo.ganhoStemCombat, 0);
  assert.equal(mixCalmo.frequenciaFiltroHz, 20000);

  const mixTouchdownSuperficie = calcularMixagemAdaptativaSteam(
    { faseJogo: 'COMBATE', setorNumero: 4, emCombateHostil: true, submerso400Hz: false, emTouchdownCasco: true },
    { volumeMaster: 100, volumeMusica: 80, volumeSfx: 90 }
  );
  assert.equal(mixTouchdownSuperficie.frequenciaFiltroHz, 7200);

  const mixMergulhoCombate = calcularMixagemAdaptativaSteam({ faseJogo: 'COMBATE', setorNumero: 4, emCombateHostil: true, submerso400Hz: true }, { volumeMaster: 100, volumeMusica: 80, volumeSfx: 90 });
  assert.equal(mixMergulhoCombate.ganhoStemExplore, 0);
  assert.equal(mixMergulhoCombate.ganhoStemCombat, 1);
  assert.equal(mixMergulhoCombate.frequenciaFiltroHz, 400);
  assert.equal(mixMergulhoCombate.fatorQ, 2.6);

  assert.equal(resolverAmostraFoleyPorEvento('FEIXE_NEURAL').id, 'FEIXE_NEURO_BIO');
  assert.equal(resolverAmostraFoleyPorEvento('FEIXE_TERMICO').id, 'FEIXE_TERMICO');
  assert.equal(resolverAmostraFoleyPorEvento('PULSO_IONICO').id, 'PULSO_IONICO');
  assert.equal(resolverAmostraFoleyPorEvento('MERGULHO_400HZ').id, 'MERGULHO_400HZ');
  assert.equal(resolverAmostraFoleyPorEvento('ESQUIVA_MISS').id, 'ESQUIVA_FLYBY');
  assert.equal(resolverAmostraFoleyPorEvento('ESCLUSA_ABORDAGEM').id, 'ESCLUSA_ABORDAGEM');

  // Todas as 24 armas do catálogo + 'BARREIRA' + deflexão + agulha sônica + carga hidráulica cobrem 23/23 foleys .ogg!
  for (const arma of obterCatalogo24ArmasSteam()) {
    const chDisparo = resolverChaveFoleyEventoVisual({ tipo: 'DISPARO_JOGADOR', chassiId: arma.id, acertou: true });
    assert.ok(resolverAmostraFoleyPorEvento(chDisparo), `Arma ${arma.id} sem foley mapeado (${chDisparo})`);
  }
  assert.equal(
    resolverAmostraFoleyPorEvento(resolverChaveFoleyEventoVisual({ tipo: 'DISPARO_JOGADOR', chassiId: 'AGULHA_HIDRO_SONICA', acertou: true })).id,
    'AGULHA_SONICA'
  );
  assert.equal(
    resolverAmostraFoleyPorEvento(resolverChaveFoleyEventoVisual({ tipo: 'DISPARO_JOGADOR', chassiId: 'BATERIA_CARGA_HIDRAULICA', acertou: true })).id,
    'DISPARO_HIDRO_CARGA'
  );
  assert.equal(
    resolverAmostraFoleyPorEvento(resolverChaveFoleyEventoVisual({ tipo: 'DISPARO_JOGADOR', chassiId: 'DISPARADOR_ESPINHOS_QUILHA', acertou: true })).id,
    'TIRO_FLAK'
  );
  assert.equal(
    resolverAmostraFoleyPorEvento(resolverChaveFoleyEventoVisual({ tipo: 'DISPARO_JOGADOR', chassiId: 'MORTEIRO_ACIDO_CORROSIVO', acertou: true })).id,
    'MORTEIRO_ACIDO'
  );
  assert.equal(
    resolverAmostraFoleyPorEvento(resolverChaveFoleyEventoVisual({ tipo: 'DISPARO_JOGADOR', chassiId: 'TORPEDO_CRIO_TERMAL', acertou: true })).id,
    'CRIO_ESTILHACO'
  );
  assert.equal(
    resolverAmostraFoleyPorEvento(resolverChaveFoleyEventoVisual({ tipo: 'DISPARO_JOGADOR', chassiId: 'VULCAO_HIDROTERMAL_CADEIA', acertou: true })).id,
    'CADEIA_VULCAO'
  );
  assert.equal(
    resolverAmostraFoleyPorEvento(resolverChaveFoleyEventoVisual({ tipo: 'DISPARO_INIMIGO', acertou: true, absorvidoPor: 'BARREIRA' })).id,
    'ESCUDO_BOLHA_ABSORCAO'
  );
  assert.equal(
    resolverAmostraFoleyPorEvento(resolverChaveFoleyEventoVisual({ tipo: 'ESQUIVA_JOGADOR' })).id,
    'ESQUIVA_FLYBY'
  );
  assert.equal(
    resolverAmostraFoleyPorEvento(resolverChaveFoleyEventoVisual({ tipo: 'BREACH_CASCO' })).id,
    'BRECHA_GEISER'
  );
  assert.ok(resolverPanEstereoEventoVisual({ tipo: 'IMPACTO_JOGADOR' }) < 0, 'Impactos na bionave devem soar à esquerda (< 0)');
  assert.ok(resolverPanEstereoEventoVisual({ tipo: 'IMPACTO_ALVO' }) > 0, 'Impactos no alvo inimigo devem soar à direita (> 0)');

  const foleys23Cobertos = new Set([
    'DISPARADOR_DE_BOLHAS_CAVITANTES', 'FEIXE_TERMICO', 'FEIXE_NEURO_BIO', 'TORPEDO_ABISSAL', 'PULSO_IONICO',
    'ESTILHACO_FLAK', 'BOMBA_OSMOTICA', 'MORTEIRO_ACIDO', 'CRIO_ESTILHACO', 'CADEIA_VULCAO', 'AGULHA_SONICA',
    'DISPARO_HIDRO_CARGA', 'ESCLUSA_ABORDAGEM', 'IMPACTO_CASCO', 'ESCUDO_BOLHA_ABSORCAO', 'BRECHA_GEISER',
    'DRENO_VALVULA', 'FOIL_DECOLAGEM', 'MERGULHO_400HZ', 'TOUCHDOWN_IMPACTO', 'SONAR_PING', 'CONQUISTA_STEAM', 'ESQUIVA_MISS',
  ].map((ch) => resolverAmostraFoleyPorEvento(ch)?.id));
  assert.equal(foleys23Cobertos.size, 23, 'Todos os 23 foleys .ogg devem ser alcançáveis por eventos reais do jogo');

  const motor = criarMotorAudioOggFoleySteam();
  motor.atualizarEstadoJogo({ faseJogo: 'COMBATE', setorNumero: 8, encontroChefe: true, faseChefe: 2, submerso400Hz: true }, { volumeMaster: 90, volumeMusica: 80, volumeSfx: 70 });
  await motor.dispararFoley('TORPEDO_ABISSAL', 0.95, { pan: 0.42 });
  const resCliqueUi = motor.dispararCliqueUiCurto(0.32);
  assert.equal(typeof resCliqueUi, 'boolean');
  const inst = motor.obterEstadoInstantaneo();
  assert.equal(inst.totalCliquesUiDisparados, 1);
  assert.equal(inst.mixagemAtual.trilhaExploreId, 'BOSS_DRAGA_FASE2');
  assert.equal(inst.mixagemAtual.frequenciaFiltroHz, 400);
  assert.equal(inst.mixagemAtual.ganhoCanalMusicaPuro, 0.8);
  assert.equal(inst.mixagemAtual.ganhoCanalSfxPuro, 0.7);
  assert.equal(inst.ultimoFoley.id, 'TIRO_TORPEDO');
  assert.equal(inst.ultimoFoley.panEstereo, 0.42);
  assert.equal(inst.ultimoFoley.frequenciaFiltroNoDisparoHz, 400);
  assert.equal(inst.ultimoFoley.bypassFiltroSubmersao, false);
  await motor.dispararFoley('CONQUISTA_STEAM', 1.0);
  assert.equal(motor.obterEstadoInstantaneo().ultimoFoley.bypassFiltroSubmersao, true);
  assert.equal(motor.obterEstadoInstantaneo().ultimoFoley.frequenciaFiltroNoDisparoHz, 20000);
  await motor.dispararFoley('TOUCHDOWN_IMPACTO', 1.0);
  assert.equal(motor.obterEstadoInstantaneo().ultimoFoley.duckingMusicaAplicado, true);

  // Rota HTTP loopback servindo `.ogg` real com Content-Type `audio/ogg`
  const srv = await iniciarServidorClienteWebBiofoil({ porta: 0, host: '127.0.0.1' });
  try {
    const rOgg = await fetch(`${srv.url}/assets/audio/foley_sonar_ping_buoy.ogg`);
    assert.equal(rOgg.status, 200);
    assert.equal(rOgg.headers.get('content-type'), 'audio/ogg');
    const bytesHttp = new Uint8Array(await rOgg.arrayBuffer());
    assert.equal(Buffer.from(bytesHttp.subarray(0, 4)).toString('ascii'), 'OggS');
  } finally {
    await srv.fechar();
  }

  console.log(`[N4] Pilar 2 Áudio .OGG verificado: ${arquivosOgg.length} arquivos reais (${bytesTotaisOgg} bytes), filtro 400Hz e rota HTTP audio/ogg validados`);
});

test('[PORTÃO 10.3 | Pilar 3 Steam >= 9.0/10] 100 Eventos Únicos (8 Cadeias [QUEST]), Não-Repetição em Run Completa, 24 Armas e 16 Órgãos', () => {
  const ev1a4 = obterEventosAeSetores1a4();
  const ev5a8 = obterEventosAeSetores5a8();
  const cat100 = obterCatalogo100EventosSteam();
  assert.equal(ev1a4.length, 38);
  assert.equal(ev5a8.length, 45);
  assert.equal(cat100.length, 100, 'Catálogo unificado Steam deve ter exatamente 100 eventos únicos');

  const idsUnicos = new Set(cat100.map((e) => e.id));
  assert.equal(idsUnicos.size, 100);
  const quests = cat100.filter((e) => e.ehEventoQuest);
  assert.equal(quests.length, 8, 'Devem existir 8 eventos [QUEST] multi-estágio (1 por setor S1..S8)');

  // Sorteio sem repetição ao longo de 48 boias numa campanha inteira de 8 setores
  const usadosNaRun = [];
  for (let s = 1; s <= 8; s += 1) {
    for (let b = 0; b < 6; b += 1) {
      const cat = b % 3 === 0 ? 'SOS' : b % 3 === 1 ? 'EXPLORACAO' : 'PERIGO';
      const sorteado = sortearEventoCampanhaSteamSemRepeticao('SEED-RUN-LONGA-2026', s, cat, usadosNaRun, b);
      assert.equal(usadosNaRun.includes(sorteado.id), false, `Evento repetido na mesma run: ${sorteado.id}`);
      usadosNaRun.push(sorteado.id);
    }
  }
  assert.equal(usadosNaRun.length, 48);

  // Plantio de marcador [QUEST] em boia futura + Resolução Blue Option
  const tplS1QuestOrigem = resolverTemplateEventoUnificado('AE_S1_SOS_BALSA_PESCADORES');
  assert.ok(tplS1QuestOrigem);
  const naveRica = {
    reatorBarrasCompradas: 12,
    tripulacao: [
      { especie: 'POLVO', hpAtual: 100 },
      { especie: 'ARRAIA', hpAtual: 80 },
      { especie: 'BAIACU', hpAtual: 90 },
      { especie: 'CARANGUEJO', hpAtual: 120 },
    ],
    armasAtivas: [{ chassiId: 'CORTADOR_TERMICO_PLASMA', orgaosEnxertados: ['SINAPSE_PRE_IGNICAO', 'OLHO_SONAR_ABISSAL'] }],
    poraoCarga: [{ id: 'BRANQUIA_OSMOSE_REVERSA' }],
    sistemas: { 'Bomba Branquial': 3, 'Córtex de Navegação': 3 },
  };
  assert.equal(avaliarElegibilidadeBlueOptionSteam(tplS1QuestOrigem, naveRica), true);

  const resVisitaBlue = resolverVisitaNoMapaSteam({
    seedPartida: 'SEED-QUEST-1',
    setorNumero: 1,
    relogioSetorHoras: 2,
    noMapa: { id: 'NO_2', tipoNo: 'SOS', xMn: 30, idTemplateEvento: 'AE_S1_SOS_BALSA_PESCADORES' },
    kitOuNave: naveRica,
    opcaoEscolhida: 'B',
  });
  assert.equal(resVisitaBlue.aceito, true);
  assert.equal(resVisitaBlue.resultadoEscolha, 'SUCESSO_CRITICO_BLUE_OPTION');
  assert.equal(resVisitaBlue.plantaQuestId, 'AE_Q1_ESCONDERIJO_COSTEIRO');

  const mapaComQuest = plantarBoiaQuestNoSetor(
    {
      noAtualId: 'NO_2',
      nos: [
        { id: 'NO_2', tipoNo: 'SOS', visitado: true, xMn: 30, yMn: 20 },
        { id: 'NO_5', tipoNo: 'EXPLORACAO', visitado: false, xMn: 66, yMn: 28 },
      ],
    },
    resVisitaBlue.plantaQuestId
  );
  assert.equal(mapaComQuest.nos[1].ehQuestAtiva, true);
  assert.equal(mapaComQuest.nos[1].idTemplateEvento, 'AE_Q1_ESCONDERIJO_COSTEIRO');

  // Spillover de Quest quando todas as boias não-saída já foram visitadas -> planta automaticamente no próximo setor!
  const mapaLotadoSpill = plantarBoiaQuestNoSetor(
    {
      noAtualId: 'NO_FIM_1',
      nos: [
        { id: 'NO_FIM_1', tipoNo: 'SOS', visitado: true, xMn: 80, yMn: 20 },
        { id: 'NO_SAIDA', tipoNo: 'SAIDA', ehSaida: true, visitado: false, xMn: 100, yMn: 25 },
      ],
    },
    'AE_Q1_ESCONDERIJO_COSTEIRO'
  );
  assert.equal(mapaLotadoSpill.questPendenteProximoSetor, 'AE_Q1_ESCONDERIJO_COSTEIRO');
  const estBaseSpill = criarEstadoInicialPartida('seed-quest-spill', 'CARCACA_ALFA');
  const estProxSetor = anexarMapaSetorAoEstado(
    {
      ...estBaseSpill,
      meta: { ...estBaseSpill.meta, edicaoComercialSteam: true },
      mapaSetorial: mapaLotadoSpill,
    },
    'seed-quest-spill',
    2
  );
  assert.equal(
    estProxSetor.mapaSetorial.nos.some((n) => n.ehQuestAtiva && n.idTemplateEvento === 'AE_Q1_ESCONDERIJO_COSTEIRO'),
    true,
    'Quest spillover deve plantar automaticamente uma boia [QUEST] ao entrar no próximo setor'
  );

  // Limites reais de ocupação por sala (1x1 = 1, 1x2 = 2, 2x2 = 4) + Arsenal Modular Inimigo Visível
  const limAlfaA = obterLimitesPorSalaLayout('CARCACA_ALFA_A');
  assert.equal(limAlfaA[8], 1, 'Câmara 8 (1x1) deve ter limite estrito de 1 tripulante');
  assert.equal(limAlfaA[3], 4, 'Câmara 3 (2x2) deve suportar até 4 tripulantes');
  const inimigoEquipadoSteam = equiparArsenalModularInimigoSteam(
    criarAlvoSetor1Canonico('BARCO_HUMANO'),
    'seed-arsenal-inimigo',
    5,
    'NO_TESTE_5'
  );
  assert.equal(inimigoEquipadoSteam.armasEquipadasInimigo.length, 2, 'Barco humano Steam deve carregar 2 armas modulares visíveis');
  assert.ok(inimigoEquipadoSteam.armasEquipadasInimigo[0].chassiId);

  // 24 Armas + 16 Órgãos + Modificadores Passivos + Vitrine de Loja
  const armas24 = obterCatalogo24ArmasSteam();
  const orgaos16 = obterCatalogo16OrgaosSteam();
  assert.equal(armas24.length, 24);
  assert.equal(orgaos16.length, 16);
  assert.equal(resolverArmaCatalogoUnificado('VULCAO_HIDROTERMAL_CADEIA').id, 'VULCAO_HIDROTERMAL_CADEIA');
  assert.equal(resolverOrgaoCatalogoUnificado('SINAPSE_PRE_IGNICAO').id, 'SINAPSE_PRE_IGNICAO');

  const modsOrgaos = calcularModificadoresPassivosOrgaosSteam([
    'SINAPSE_PRE_IGNICAO',
    'ALETA_ESTABILIZADORA_FOIL',
    'ENZIMA_DIGESTORA_SUCATA',
    'MEDULA_REGENERATIVA_CORAL',
  ]);
  assert.equal(modsOrgaos.preIgnicaoCombatePct, 0.85);
  assert.equal(modsOrgaos.bonusSustentacaoFoilKg, 28);
  assert.equal(modsOrgaos.multiplicadorSaqueBonus, 0.2);
  assert.equal(modsOrgaos.reparaCascoPorSaltoHp, 2);

  const vitrine = sortearVitrineLojaSteam('SEED-LOJA-AE', 5);
  assert.equal(vitrine.length, 8);
  assert.equal(vitrine[0].estoqueInicial >= 5 && vitrine[0].estoqueInicial <= 8, true);
  assert.equal(vitrine[1].estoqueInicial >= 4 && vitrine[1].estoqueInicial <= 7, true);
  const idsArmasSeeds = new Set(
    ['SEED-A', 'SEED-B', 'SEED-C', 'SEED-D', 'SEED-E'].map((sd) => sortearVitrineLojaSteam(sd, 5)[2].id)
  );
  assert.equal(idsArmasSeeds.size >= 2, true, 'Vitrine de loja Steam deve variar ofertas genuinamente por seed');

  // Validação direta da física e simulação real das Armas AE e Órgãos AE (Zero decorativo!)
  const grafoBeamTeste = Object.freeze({ 1: [2, 4], 2: [1, 3], 3: [2], 4: [1] });
  assert.equal(validarCaminhoBeamAdjacente([1], grafoBeamTeste, 1), true);
  assert.equal(validarCaminhoBeamAdjacente([1, 2], grafoBeamTeste, 2), true);
  assert.equal(validarCaminhoBeamAdjacente([2, 3], grafoBeamTeste, 2), true);
  assert.equal(validarCaminhoBeamAdjacente([3, 4], grafoBeamTeste, 2), false, 'Salas não adjacentes devem ser rejeitadas em beam de 2 salas');
  assert.equal(validarCaminhoBeamAdjacente([1, 2, 3], grafoBeamTeste, 3), true);

  // ALETA_ESTABILIZADORA_FOIL (+28kg de sustentação real no foil) e VESICULA_HIPERBARICA (-40% vazamento/alagamento por rombo)
  const estFisicaBase = criarEstadoInicialPartida('seed-orgaos-ae', 'CARCACA_ALFA');
  const sustSemAleta = calcularSustentacaoFoil(estFisicaBase.naveJogador);
  const naveComAleta = congelarProfundo({
    ...estFisicaBase.naveJogador,
    poraoCarga: [{ id: 'ALETA_ESTABILIZADORA_FOIL', categoria: 'ORGAO' }],
  });
  const sustComAleta = calcularSustentacaoFoil(naveComAleta);
  assert.equal(sustComAleta - sustSemAleta, 28, 'ALETA_ESTABILIZADORA_FOIL deve somar +28kg reais na sustentação');

  const camarasComRombo = estFisicaBase.naveJogador.camaras.map((c) =>
    c.id === 1 ? { ...c, rombosCasco: 1, brechaAtiva: true, aguaKg: 12.5, alagamentoPesadoKg: 0 } : c
  );
  const pesadoSemVesicula = avancarTickFisicaHidraulica(
    congelarProfundo({
      ...estFisicaBase,
      naveJogador: { ...estFisicaBase.naveJogador, estadoFisico: '2_TOUCHDOWN', mergulhoTaticoAtivo: true, camaras: camarasComRombo },
    }),
    1.0
  ).naveJogador.camaras.find((c) => c.id === 1).alagamentoPesadoKg;
  const pesadoComVesicula = avancarTickFisicaHidraulica(
    congelarProfundo({
      ...estFisicaBase,
      naveJogador: {
        ...estFisicaBase.naveJogador,
        estadoFisico: '2_TOUCHDOWN',
        mergulhoTaticoAtivo: true,
        camaras: camarasComRombo,
        poraoCarga: [{ id: 'VESICULA_HIPERBARICA', categoria: 'ORGAO' }],
      },
    }),
    1.0
  ).naveJogador.camaras.find((c) => c.id === 1).alagamentoPesadoKg;
  assert.equal(pesadoSemVesicula, 5);
  assert.equal(pesadoComVesicula, 3, 'VESICULA_HIPERBARICA deve reduzir em 40% (5kg -> 3kg/s) a sobrecarga hidrostática de rombos');

  // CARGA_ESTOQUE (acumula múltiplas cargas em MAN) e CADEIA_RECARGA (reduz cooldown a cada disparo)
  const estArmaAe = congelarProfundo({
    ...estFisicaBase,
    alvoCombate: criarAlvoSetor1Canonico('BARCO_HUMANO'),
    naveJogador: {
      ...estFisicaBase.naveJogador,
      modoSalvaGlobal: 'MANUAL',
      camaras: estFisicaBase.naveJogador.camaras.map((c) =>
        c.id === 1 ? { ...c, barrasIntegridade: 6, barrasEnergiaAlocada: 6 } : c
      ),
      armasAtivas: [
        {
          slotIndex: 0,
          arma: {
            chassiId: 'BATERIA_CARGA_HIDRAULICA',
            energiaCusto: 2,
            energiaAlocada: 2,
            tempoRecargaBaseSeg: 6.0,
            progressoRecargaSeg: 0,
            cargasMaximas: 3,
            cargasEstocadas: 0,
            modoDisparoManual: true,
            salaAlvoId: 1,
            orgaosEnxertados: [],
          },
        },
        {
          slotIndex: 1,
          arma: {
            chassiId: 'VULCAO_HIDROTERMAL_CADEIA',
            energiaCusto: 4,
            energiaAlocada: 4,
            tempoRecargaBaseSeg: 15.5,
            progressoRecargaSeg: 15.5,
            modoDisparoManual: false,
            salaAlvoId: 1,
            orgaosEnxertados: [],
          },
        },
      ],
    },
  });
  const apos13s = avancarTickSistemasEArmas(estArmaAe, 13.0);
  assert.ok(apos13s.naveJogador.armasAtivas[0].arma.cargasEstocadas >= 2, 'BATERIA_CARGA_HIDRAULICA deve estocar >= 2 cargas após 13s em modo manual');
  const aposDisparoVulcao = avancarTickPartidaEmTempoReal(estArmaAe, 0.25);
  assert.equal(
    aposDisparoVulcao.naveJogador.armasAtivas[1].arma.tempoRecargaBaseSeg,
    13.0,
    'VULCAO_HIDROTERMAL_CADEIA deve acelerar o cooldown de 15.5s para 13.0s no 1o ciclo de CADEIA_RECARGA'
  );

  // ALETA_ESTABILIZADORA_FOIL em `avancarTickPartidaEmTempoReal` deve somar exatamente +28 kg (sem duplicar +56 kg!)
  const tickSemAleta = avancarTickPartidaEmTempoReal(estFisicaBase, 0.25);
  const tickComAleta = avancarTickPartidaEmTempoReal(
    congelarProfundo({ ...estFisicaBase, naveJogador: naveComAleta }),
    0.25
  );
  assert.equal(
    tickComAleta.naveJogador.sustentacaoAtualKg - tickSemAleta.naveJogador.sustentacaoAtualKg,
    28,
    'ALETA_ESTABILIZADORA_FOIL em combate real deve somar exatamente +28 kg (nunca +56 kg)'
  );

  // MORTEIRO_ACIDO_CORROSIVO: aplica CORROSAO_ACIDA real de 6s que corrói sistema e tripulação inimiga ao longo do tempo
  const estAcido = congelarProfundo({
    ...estFisicaBase,
    seedPartida: 'seed-morteiro-acido-hit',
    alvoCombate: {
      ...criarAlvoSetor1Canonico('BARCO_HUMANO'),
      esquivaBasePct: 0,
      esquivaEfetivaPct: 0,
      barreiraBolhasAtual: 0,
      camadasBarreiraAtivas: 0,
      salasOuOrgaos: criarAlvoSetor1Canonico('BARCO_HUMANO').salasOuOrgaos.map((s) =>
        s.id === 1 ? { ...s, integridadeAtual: 5, integridadeMax: 5 } : s
      ),
    },
    naveJogador: {
      ...estFisicaBase.naveJogador,
      camaras: estFisicaBase.naveJogador.camaras.map((c) =>
        c.id === 1 ? { ...c, barrasIntegridade: 4, barrasEnergiaAlocada: 4 } : c
      ),
      armasAtivas: [
        {
          slotIndex: 0,
          arma: {
            chassiId: 'MORTEIRO_ACIDO_CORROSIVO',
            energiaCusto: 3,
            energiaAlocada: 3,
            tempoRecargaBaseSeg: 14.0,
            progressoRecargaSeg: 14.0,
            modoDisparoManual: false,
            salaAlvoId: 1,
            orgaosEnxertados: [],
          },
        },
      ],
    },
  });
  let posAcido = avancarTickPartidaEmTempoReal(estAcido, 0.25);
  const salaCorroida0 = posAcido.alvoCombate.salasOuOrgaos.find((s) => s.id === 1);
  assert.ok(salaCorroida0.corrosaoAcidaSeg > 5.0, 'MORTEIRO_ACIDO_CORROSIVO deve aplicar CORROSAO_ACIDA de 6s na sala atingida');
  const sistAntesDot = salaCorroida0.integridadeAtual;
  for (let i = 0; i < 10; i += 1) {
    posAcido = avancarTickPartidaEmTempoReal(posAcido, 0.25);
  }
  const salaCorroidaDepois = posAcido.alvoCombate.salasOuOrgaos.find((s) => s.id === 1);
  assert.ok(salaCorroidaDepois.integridadeAtual < sistAntesDot, 'CORROSAO_ACIDA deve corroer integridade de sistema ao longo de 2.5s');

  console.log(`[N4] Pilar 3 Conteúdo verificado: ${cat100.length} eventos (${quests.length} quests), ${usadosNaRun.length} saltos 0-repetição, ${armas24.length} armas, ${orgaos16.length} órgãos`);
});

test('[PORTÃO 10.4 | Pilar 4 Steam >= 9.0/10] i18n PT-BR/EN-US c/ Zero Truncamento, Tutorial 6 Etapas, 3 Dificuldades, 24 Conquistas, Runtime 0ms, Steamworks & Regra Testes-Para-Tudo', async () => {
  // 1. i18n completo + Gate Estrito de Zero Truncamento
  assert.equal(normalizarIdiomaSteam('en'), 'en-US');
  assert.equal(normalizarIdiomaSteam('pt-BR'), 'pt-BR');
  assert.equal(tUi('en-US', 'FOIL_MERGULHO'), '400 HZ DIVE!');
  assert.equal(tUi('pt-BR', 'FOIL_MERGULHO'), 'MERGULHO 400 HZ!');
  assert.equal(tUi('pt-BR', 'BTN_MERGULHO_TATICO'), 'MERGULHO [M]');
  assert.equal(tUi('en-US', 'BTN_MERGULHO_TATICO'), 'TACTICAL DIVE [M]');
  assert.equal(tUi('pt-BR', 'BTN_DRENAR_VALVULAS'), 'DRENAR [D]');
  assert.equal(tUi('en-US', 'BTN_DRENAR_VALVULAS'), 'PURGE [D]');
  assert.equal(obterSiglaHudArma('VULCAO_HIDROTERMAL_CADEIA', 'en-US'), 'VULCAN');
  assert.equal(obterRotuloCurtoCamara(6, 'pt-BR'), 'QUILHA');
  assert.equal(obterRotuloCurtoCamara(6, 'en-US'), 'KEEL');
  assert.equal(obterRotuloCurtoSalaInimiga('PONTE_DE_COMANDO', 'en-US'), 'BRIDGE');

  const todosEventos = obterCatalogo100EventosSteam();
  for (const ev of todosEventos) {
    const pt = traduzirEventoSteam(ev, 'pt-BR');
    const en = traduzirEventoSteam(ev, 'en-US');
    assert.ok(pt.titulo.length > 5 && en.titulo.length > 5);
    assert.equal(pt.opcoes.length, 3);
    assert.equal(en.opcoes.length, 3);
  }

  const auditCat = auditarZeroTruncamentoViewModel({
    armas: obterCatalogo24ArmasSteam(),
    orgaos: obterCatalogo16OrgaosSteam(),
    eventos: todosEventos,
    conquistas: obterCatalogo24ConquistasSteam(),
    layouts: obterCatalogoLayoutsNavesSteam(),
  });
  assert.equal(auditCat.aprovado, true, `Violações de truncamento detectadas: ${JSON.stringify(auditCat.violacoes)}`);

  // 2. 3 Dificuldades + IA Inteligente + 24 Conquistas + Keybind Swap
  assert.equal(ciclarDificuldadeSteam('NORMAL', 1), 'DIFICIL');
  assert.equal(ciclarDificuldadeSteam('DIFICIL', 1), 'FACIL');
  assert.equal(obterConfiguracaoDificuldadeSteam('DIFICIL').multiplicadorPontuacao, 1.35);

  const inimigoBase = { hpCascoAtual: 20, hpCascoMax: 20, camadasBarreiraMax: 2, camadasBarreiraAtuais: 2, evasaoBasePct: 15 };
  const inimigoFacil = escalarInimigoPorDificuldade(inimigoBase, 'FACIL', 3);
  const inimigoDificil = escalarInimigoPorDificuldade(inimigoBase, 'DIFICIL', 6);
  assert.equal(inimigoFacil.hpCascoMax, 17);
  assert.equal(inimigoFacil.camadasBarreiraMax, 1);
  assert.equal(inimigoDificil.hpCascoMax, 24);
  assert.equal(inimigoDificil.camadasBarreiraMax, 3);

  // Escalonamento e IA Difícil acoplados aos objetos REAIS da Onda 1..3 (Lei L1: Zero shape sintético apenas!)
  const barcoRealBase = congelarProfundo({
    ...criarAlvoSetor1Canonico('BARCO_HUMANO'),
    barreiraBolhasMax: 2,
    tetoBolhasBarreira: 2,
    barreiraBolhasAtual: 2,
    camadasBarreiraAtivas: 2,
    esquivaBasePct: 15,
    esquivaEfetivaPct: 15,
  });
  const barcoRealFacil = escalarInimigoPorDificuldade(barcoRealBase, 'FACIL', 3);
  const barcoRealDificil = escalarInimigoPorDificuldade(barcoRealBase, 'DIFICIL', 6);
  assert.ok(barcoRealFacil.hpCascoMax < barcoRealBase.hpCascoMax);
  assert.equal(barcoRealFacil.barreiraBolhasMax, 1);
  assert.equal(barcoRealFacil.camadasBarreiraAtivas, 1);
  assert.ok(barcoRealDificil.hpCascoMax > barcoRealBase.hpCascoMax);
  assert.equal(barcoRealDificil.barreiraBolhasMax, 3);
  assert.equal(barcoRealDificil.camadasBarreiraAtivas, 3);
  assert.equal(barcoRealDificil.esquivaBasePct, 20);

  const naveRealBarreira = congelarProfundo({
    ...criarEstadoInicialPartida('seed-ia-real', 'CARCACA_ALFA').naveJogador,
    barreiraBolhasAtual: 2,
    camadasBarreiraAtivas: 2,
  });
  assert.equal(
    selecionarAlvoInimigoInteligente(naveRealBarreira, [1, 2, 3, 4, 5, 6, 7, 8], 0),
    4,
    'IA Difícil deve priorizar Câmara 4 (Glândula de Bolhas) na bionave real quando há barreira ativa'
  );
  const naveRealAlagada = congelarProfundo({
    ...criarEstadoInicialPartida('seed-ia-alagada', 'CARCACA_ALFA').naveJogador,
    barreiraBolhasAtual: 0,
    camadasBarreiraAtivas: 0,
    camaras: criarEstadoInicialPartida('seed-ia-alagada', 'CARCACA_ALFA').naveJogador.camaras.map((c) =>
      c.id === 3 ? { ...c, aguaKg: 28, alagamentoPesadoKg: 10 } : c
    ),
  });
  assert.equal(
    selecionarAlvoInimigoInteligente(naveRealAlagada, [1, 2, 3, 4, 5, 6, 7, 8], 0),
    3,
    'IA Difícil deve priorizar Câmara 3 (Bomba Branquial) quando a bionave sofre alagamento pesado'
  );

  const conq24 = obterCatalogo24ConquistasSteam();
  assert.equal(conq24.length, 24);
  assert.equal(verificarLayoutTipoBDesbloqueado('MANTA_VOLT_B', { conquistasDesbloqueadas: [] }), false);
  const avalConq1 = avaliarConquistasSteam({ especieNave: 'MANTA_VOLT', sistemasInimigosIonizadosSimultaneos: 2, saltosRealizados: 1 }, []);
  assert.equal(avalConq1.novosDesbloqueados.includes('ACH_MANTA_1_BLACKOUT_TOTAL'), true);
  assert.equal(
    verificarLayoutTipoBDesbloqueado('MANTA_VOLT_B', { conquistasDesbloqueadas: avalConq1.todosDesbloqueados }),
    false,
    'Desbloqueio Tipo B deve exigir 2/2 conquistas da espécie (nunca apenas 1/2)'
  );
  const avalConq2 = avaliarConquistasSteam(
    { especieNave: 'MANTA_VOLT', setorAtual: 5, pctCascoAtual: 80 },
    avalConq1.todosDesbloqueados
  );
  assert.equal(avalConq2.novosDesbloqueados.includes('ACH_MANTA_2_SEM_ESCUDO_ATE_S5'), true);
  assert.equal(
    verificarLayoutTipoBDesbloqueado('MANTA_VOLT_B', { conquistasDesbloqueadas: avalConq2.todosDesbloqueados }),
    true,
    'Com 2/2 conquistas da espécie concluídas, MANTA_VOLT_B deve ser desbloqueada'
  );

  const cfg0 = criarConfiguracoesSteam();
  const cfg1 = atualizarConfiguracoesSteam(cfg0, { volumeMusica: 55, idioma: 'en-US' });
  const cfgSwap = reatribuirAtalhoTecladoSteam(cfg1, 'MERGULHO_TATICO', 'Space');
  assert.equal(cfgSwap.atalhosTeclado.MERGULHO_TATICO, 'Space');
  assert.equal(cfgSwap.atalhosTeclado.PAUSAR_TATICO, 'KeyM', 'Swap deve trocar automaticamente a tecla em conflito');

  // 3. Tutorial Interativo de 6 Etapas
  const etapasTut = obterEtapasTutorialSteam();
  assert.equal(etapasTut.length, 6);
  let estTut = criarEstadoTutorialSteam(true);
  assert.equal(obterEtapaAtualTutorialSteam(estTut).id, 'ETAPA_1_FOIL_TERMOMETRO');
  estTut = registrarAcaoNoTutorialSteam(estTut, 'PAUSAR_ALTERNAR');
  assert.equal(obterEtapaAtualTutorialSteam(estTut).id, 'ETAPA_2_DRENO_VALVULA');
  estTut = registrarAcaoNoTutorialSteam(estTut, 'DRENAR_VALVULAS');
  estTut = registrarAcaoNoTutorialSteam(estTut, 'MERGULHO_TATICO');
  estTut = registrarAcaoNoTutorialSteam(estTut, 'DEFINIR_ALVO_ARMA');
  estTut = registrarAcaoNoTutorialSteam(estTut, 'MOVER_TRIPULANTE');
  estTut = avancarPassoTutorialSteam(estTut);
  assert.equal(estTut.concluido, true);
  assert.equal(pularTutorialSteam(criarEstadoTutorialSteam(true)).pulado, true);

  // 4. Runtime Local 0ms + Steam Deck 1280x800 + Gamepad + Steamworks Desktop Host + Electron/Tauri Wrapper
  const vpDeck = calcularViewportDisplaySteam(1280, 800, 'AUTO');
  assert.equal(vpDeck.ehSteamDeck16x10, true);
  assert.equal(vpDeck.larguraCssPx, 1280);
  assert.equal(vpDeck.alturaCssPx, 720);
  assert.equal(vpDeck.offsetY, 40);

  const gpLido = traduzirEstadoGamepadSteamDeck(
    {
      buttons: [{ pressed: false }, { pressed: false }, { pressed: true }, {}, {}, {}, {}, { pressed: true }],
      axes: [0.65, -0.45, 0, 0],
    },
    [false, false, false, false, false, false, false, false],
    1 / 60
  );
  assert.equal(gpLido.comandos[0].tipo, 'ACIONAR_MERGULHO_TATICO');
  assert.equal(gpLido.comandos[1].tipo, 'GAMEPAD_CLIQUE_PRIMARIO');
  assert.equal(gpLido.deltaCursor960.moveu, true);
  assert.ok(gpLido.deltaCursor960.dx > 0 && gpLido.deltaCursor960.dy < 0);

  const snapDpad = encontrarHitboxSnapDirecionalGamepad(
    { x: 100, y: 200 },
    [
      { idHitbox: 'BTN_ESQ', x: 20, y: 190, largura: 40, altura: 20 },
      { idHitbox: 'BTN_DIR_PROX', x: 180, y: 192, largura: 40, altura: 20 },
      { idHitbox: 'BTN_DIR_LONGE', x: 420, y: 192, largura: 40, altura: 20 },
    ],
    { dx: 1, dy: 0 }
  );
  assert.equal(snapDpad.idHitbox, 'BTN_DIR_PROX');
  assert.equal(snapDpad.x, 200);

  const rtLocal = criarRuntimeLocalSteamCliente({
    estadoPartidaInicial: { faseJogo: 'COMBATE', setorAtual: 2, contadorTicks: 0 },
    adaptadorSimulacao: {
      avancarTick: (est) => ({ ...est, contadorTicks: (est.contadorTicks ?? 0) + 1 }),
      despacharComando: (est, cmd) => ({ estadoPartida: { ...est, ultimoCmd: cmd.tipo }, eventoAudioFoley: 'SONAR_PING' }),
    },
  });
  rtLocal.executarAcaoMetaSteam('INICIAR_TUTORIAL_GUIADO');
  const snapTick = rtLocal.avancarTickLocal(0.25, false);
  assert.equal(snapTick.modoExecucao, 'LOCAL_MEMORIA_0MS');
  assert.equal(snapTick.ticksLocaisExecutados, 1);
  assert.ok(snapTick.latenciaUltimoTickMs < 15, 'Tick local em memória não depende de HTTP');
  rtLocal.despacharComandoLocal({ tipo: 'PAUSAR_ALTERNAR' });
  rtLocal.processarFrameGamepad([{ buttons: [{ pressed: true }] }]);

  // Steamworks Host + Electron + Tauri
  assert.equal(detectarAmbienteSteamDeck({ SteamDeck: '1' }).ehSteamDeck, true);
  assert.equal(formatarRichPresenceSteam({ faseJogo: 'COMBATE', setorNumero: 5, layoutId: 'MANTA_VOLT_B', dificuldade: 'DIFICIL', idioma: 'en-US' }), 'Sector 5/8 — MANTA_VOLT_B (DIFICIL)');

  const dirSteamTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'biofoil-steamhost-'));
  try {
    const host = await inicializarSteamworksHost({ pastaDados: dirSteamTmp, tentarCarregarNativo: false });
    const rAch = host.desbloquearConquista('ACH_GLOBAL_PRIMEIRO_SALTO');
    assert.equal(rAch.ok, true);
    assert.equal(rAch.recemDesbloqueada, true);
    host.salvarArquivoCloud('profile.json', { carcacas: 5 });
    assert.deepEqual(host.lerArquivoCloud('profile.json'), { carcacas: 5 });
    host.removerArquivoCloud('run_save.json');
    host.salvarConfiguracoes({ idioma: 'en-US', volumeMaster: 70 });
    host.atualizarRichPresence({ faseJogo: 'MAPA', setorNumero: 3, idioma: 'pt-BR' });
    assert.equal(host.obterDiagnosticoHost().totalConquistasDesbloqueadas, 1);

    const cfgJanela = await construirConfiguracaoJanelaDesktopSteam({ SteamDeck: '1' }, { width: 1280, height: 800 });
    assert.equal(cfgJanela.width, 1280);
    assert.equal(cfgJanela.height, 800);
    assert.equal(cfgJanela.webPreferences.contextIsolation, true);
    assert.equal(cfgJanela.webPreferences.sandbox, true);

    const appHeadless = await iniciarAplicacaoElectronSteam(null, {
      opcoesServidor: { diretorioDados: dirSteamTmp, persistirEmDisco: true },
      opcoesSteamworks: { pastaDados: dirSteamTmp, tentarCarregarNativo: false },
    });
    try {
      assert.equal(appHeadless.modoHeadlessVerificacao, true);
      const resCmdIpc = appHeadless.executarComandoMotor({ tipoEvento: 'KEYDOWN', code: 'Enter' }, {});
      assert.equal(resCmdIpc.viewModel.faseJogo, 'MAPA');
      const resTickIpc = appHeadless.avancarTickMotor(0.25, false);
      assert.equal(resTickIpc.viewModel.faseJogo, 'MAPA');
      assert.ok(appHeadless.hostSteam.lerArquivoCloud('profile.json'), 'IPC direto Electron deve sincronizar profile.json com Steam Cloud');
      assert.ok(appHeadless.hostSteam.lerArquivoCloud('run_save.json'), 'IPC direto Electron deve sincronizar run_save.json com Steam Cloud');
    } finally {
      await appHeadless.encerrar();
    }

    const dirDepotOut = path.join(dirSteamTmp, 'depot-stage-test');
    assert.equal(STEAM_APP_ID_PADRAO, 2894510);
    assert.equal(fs.readFileSync(path.join(DIRETORIO_RAIZ, 'steam-desktop', 'steam_appid.txt'), 'utf8').trim(), '2894510');
    const relDepot = empacotarDepotSteamAutocontido({
      diretorioRaiz: DIRETORIO_RAIZ,
      diretorioSaida: dirDepotOut,
      incluirRuntimeNode: true,
    });
    assert.equal(relDepot.ok, true);
    assert.equal(relDepot.appId, 2894510);
    assert.equal(relDepot.possuiBinarioExecutavelAutocontido, true);
    const binDepotNodeAbs = path.join(dirDepotOut, relDepot.caminhoBinarioRuntime);
    assert.equal(fs.existsSync(binDepotNodeAbs), true);
    assert.notEqual(
      fs.statSync(binDepotNodeAbs).ino,
      fs.statSync(fs.realpathSync(process.execPath)).ino,
      'Binário Node do depot deve ser cópia isolada (nunca hardlink APFS sobre process.execPath)'
    );
    const dirHostNodeLib = path.resolve(path.dirname(fs.realpathSync(process.execPath)), '..', 'lib');
    if (fs.existsSync(dirHostNodeLib) && fs.readdirSync(dirHostNodeLib).some((n) => /^libnode\b/.test(n))) {
      assert.equal(
        fs.existsSync(path.join(dirDepotOut, 'runtime', 'node', 'lib')) &&
          fs.readdirSync(path.join(dirDepotOut, 'runtime', 'node', 'lib')).some((n) => /^libnode\b/.test(n)),
        true,
        'Depot Steam deve copiar libnode adjacente para runtime/node/lib resolver @rpath autonomamente'
      );
    }
    const execDepotNode = spawnSync(binDepotNodeAbs, ['-e', 'process.stdout.write("DEPOT_NODE_OK")'], { encoding: 'utf8' });
    assert.equal(execDepotNode.status, 0, 'Binário Node do depot deve executar autonomamente com @rpath/libnode resolvido');
    assert.equal(execDepotNode.stdout, 'DEPOT_NODE_OK');
    assert.equal(fs.existsSync(path.join(dirDepotOut, 'src', 'onda7-steam', 'steamworks-desktop-host.mjs')), true);
    assert.equal(fs.existsSync(path.join(dirDepotOut, 'assets', 'audio', 'music_zone1_explore.ogg')), true);
    assert.equal(fs.existsSync(path.join(dirDepotOut, 'tests')), false, 'Depot stage não pode incluir tests/');
    assert.equal(fs.existsSync(path.join(dirDepotOut, 'padrao')), false, 'Depot stage não pode incluir padrao/');
    if (process.platform === 'darwin' && fs.existsSync('/usr/bin/swiftc')) {
      const resMacDireto = compilarHostNativoMacOsBioFoil({ pastaSaida: dirDepotOut });
      assert.equal(resMacDireto.ok, true);
      assert.equal(relDepot.possuiAppNativoMacOs, true);
      assert.equal(fs.existsSync(path.join(dirDepotOut, 'BioFoil.app', 'Contents', 'MacOS', 'BioFoil')), true);
    }

    // Validação E2E das rotas de simulação 0ms do navegador (`/src/...`, `/api/estado-completo`, `/api/sincronizar`)
    const srv0ms = await iniciarServidorClienteWebBiofoil({
      porta: 0,
      host: '127.0.0.1',
      modoCampanhaCompleta: true,
      estadoInicial: criarEstadoInicialPartida({ seedPartida: 'srv-0ms', idArquitetura: 'CARCACA_ALFA', faseJogo: 'COMBATE' }),
    });
    try {
      const rModCamp = await fetch(`${srv0ms.url}/src/onda6-ui/campanha-completa.mjs`);
      assert.equal(rModCamp.status, 200);
      const rModGdd = await fetch(`${srv0ms.url}/src/gdd-parser.mjs`);
      assert.equal(rModGdd.status, 200);
      const txtModGdd = await rModGdd.text();
      assert.equal(txtModGdd.includes('node:fs'), false, 'Shim browser de gdd-parser.mjs não pode importar node:fs');
      const rEstComp = await fetch(`${srv0ms.url}/api/estado-completo`);
      assert.equal(rEstComp.status, 200);
      const jsonEstComp = await rEstComp.json();
      assert.ok(jsonEstComp.estado?.naveJogador);
      const novoEstSinc = { ...jsonEstComp.estado, meta: { ...jsonEstComp.estado.meta, ultimoAvisoCampanha: 'SYNC_0MS_OK' } };
      const rSinc = await fetch(`${srv0ms.url}/api/sincronizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: novoEstSinc }),
      });
      assert.equal(rSinc.status, 200);
      assert.equal(srv0ms.obterEstadoAtualDireto().meta.ultimoAvisoCampanha, 'SYNC_0MS_OK');
    } finally {
      await srv0ms.fechar();
    }

    const pontePreload = criarPonteSeguraPreloadSteam({ invoke: (ch, arg) => `${ch}:${JSON.stringify(arg)}` });
    assert.equal(pontePreload.desbloquearConquista('ACH_1'), 'biofoil:desbloquearConquista:"ACH_1"');
    assert.equal(pontePreload.executarComandoMotor({ tipoAcao: 'PAUSAR' }), 'biofoil:executarComandoMotor:{"tipoAcao":"PAUSAR"}');
    assert.equal(pontePreload.avancarTickMotor(0.25), 'biofoil:avancarTickMotor:0.25');
  } finally {
    fs.rmSync(dirSteamTmp, { recursive: true, force: true });
  }

  assert.equal(fs.existsSync(path.join(DIRETORIO_RAIZ, 'steam-desktop', 'tauri.conf.json')), true);
  assert.equal(fs.existsSync(path.join(DIRETORIO_RAIZ, 'steam-desktop', 'src-tauri', 'Cargo.toml')), true);
  assert.equal(fs.existsSync(path.join(DIRETORIO_RAIZ, 'steam-desktop', 'src-tauri', 'src', 'main.rs')), true);
  assert.equal(fs.existsSync(path.join(DIRETORIO_RAIZ, 'steam-desktop', 'electron-preload.cjs')), true);
  assert.equal(fs.existsSync(path.join(DIRETORIO_RAIZ, 'steam-desktop', 'steam_input_manifest.vdf')), true);
  assert.equal(fs.existsSync(path.join(DIRETORIO_RAIZ, 'steam-desktop', 'steam_appid.txt')), true);
  assert.equal(fs.existsSync(path.join(DIRETORIO_RAIZ, 'steam-desktop', 'steam_app_build.vdf')), true);
  const vdfDepotTxt = fs.readFileSync(path.join(DIRETORIO_RAIZ, 'steam-desktop', 'steam_app_build.vdf'), 'utf8');
  assert.ok(vdfDepotTxt.includes('"tests/*"') && vdfDepotTxt.includes('"padrao/*"'), 'Depot VDF deve excluir tests/* e padrao/*');

  // 5. Integração Fim-a-Fim no Motor Real de Jogo (Hangar Tipo B + Difícil + Campanha 100 Eventos + Armas AE + Tutorial + BFS Topológico)
  const {
    criarEstadoCampanhaCompleta,
    executarAcaoCampanhaCompleta,
    avancarTickCampanhaCompleta,
    sincronizarProgressoTutorialSteamNoEstado,
  } = await import('../src/onda6-ui/campanha-completa.mjs');
  const { projetarViewModelWireframe } = await import('../src/onda6-ui/presenter-wireframe.mjs');
  const { traduzirInputDomParaComandoUi } = await import('../src/onda6-ui/tradutor-input-dom.mjs');
  const { despacharComandoUi } = await import('../src/onda6-ui/despacho-comandos.mjs');
  const { calcularRotaCamarasBionave, avancarTickTripulacao } = await import('../src/onda2-combate/tick-tripulacao.mjs');

  let campSteam = criarEstadoCampanhaCompleta({
    persistirEmDisco: false,
    seedPartida: 'steam-live-e2e-2026',
    edicaoComercialSteam: true,
    perfilInicial: {
      carcacasDesbloqueadas: { CARCACA_ALFA: true, MANTA_VOLT: true, COURACA_LIMIAR: true, SOMBRA_ABISSAL: true, COLMEIA_VIVA: true },
      conquistasSteam: ['ACH_MANTA_1_BLACKOUT_TOTAL', 'ACH_MANTA_2_VELOCIDADE_LUZ'],
      layoutsTipoBDesbloqueados: ['MANTA_VOLT_B'],
    },
  });
  assert.equal(campSteam.meta.edicaoComercialSteam, true);

  const metaDireta = aplicarAcaoMetaSteamNoEstado(campSteam, 'ALTERNAR_IDIOMA', {});
  assert.equal(metaDireta.ok, true);
  assert.equal(metaDireta.estado.meta.configuracoesSteam.idioma, 'en-US');

  // Selecionar MANTA_VOLT, ativar Tipo B e Dificuldade DIFÍCIL pelo tradutor DOM / campanha real
  campSteam = executarAcaoCampanhaCompleta(campSteam, {
    tipoAcao: 'SELECIONAR_CARCACA_HANGAR',
    payload: { idArquitetura: 'MANTA_VOLT' },
  }, { persistirEmDisco: false }).estado;

  const vmHangarPt = projetarViewModelWireframe(campSteam);
  const tradKeyB = traduzirInputDomParaComandoUi({ tipoEvento: 'KEYDOWN', code: 'KeyB' }, campSteam, vmHangarPt, {});
  assert.equal(tradKeyB.reconhecido, true);
  campSteam = executarAcaoCampanhaCompleta(campSteam, tradKeyB.acaoCampanhaUi, { persistirEmDisco: false }).estado;
  assert.equal(campSteam.meta.varianteHangar, 'B');

  const tradKeyF = traduzirInputDomParaComandoUi({ tipoEvento: 'KEYDOWN', code: 'KeyF' }, campSteam, projetarViewModelWireframe(campSteam), {});
  campSteam = executarAcaoCampanhaCompleta(campSteam, tradKeyF.acaoCampanhaUi, { persistirEmDisco: false }).estado;
  assert.equal(campSteam.meta.dificuldade, 'DIFICIL');

  // Zarpar na campanha real em MANTA_VOLT_B Difícil
  const resZarpar = executarAcaoCampanhaCompleta(campSteam, { tipoAcao: 'INICIAR_NOVA_RUN', payload: {} }, { persistirEmDisco: false });
  assert.equal(resZarpar.ok, true);
  campSteam = resZarpar.estado;
  assert.equal(campSteam.naveJogador.layoutId, 'MANTA_VOLT_B');
  assert.equal(campSteam.economia.sucata, 0);
  assert.equal(campSteam.naveJogador.slotsArmasMax, 4);
  assert.equal(campSteam.naveJogador.armasAtivas[0].arma.chassiId, 'CANHAO_PULSO_BIOELETRICO_I');
  // Duto de asa exclusivo de MANTA_VOLT_B conecta Câmara 1 direto à Câmara 6 em 1 salto ([1, 6])!
  const rotaDutoAsa = calcularRotaCamarasBionave(1, 6, campSteam.naveJogador.grafoAdjacencia);
  assert.deepEqual(rotaDutoAsa, { saltos: 1, rota: [1, 6] });

  // Abordadores inimigos devem obedecer as anteparas seladas de MANTA_VOLT_B (asas divididas: C7<->C1 é selada, então C7->C1 contorna pelo grafo real!)
  const rotaSeladaMantaB = calcularRotaCamarasBionave(7, 1, campSteam.naveJogador.grafoAdjacencia);
  assert.ok(rotaSeladaMantaB.saltos > 1, 'Antepara selada C7<->C1 em MANTA_VOLT_B deve impedir travessia direta');
  const estInvasorMantaB = congelarProfundo({
    ...campSteam,
    meta: { ...campSteam.meta, faseJogo: 'COMBATE' },
    naveJogador: {
      ...campSteam.naveJogador,
      camaras: campSteam.naveJogador.camaras.map((c) =>
        c.id === 1 ? { ...c, barrasIntegridade: 3, barrasEnergiaAlocada: 2 } : { ...c, barrasIntegridade: 0, barrasEnergiaAlocada: 0 }
      ),
      invasoresInimigos: [
        { id: 'inv-manta-b-1', tipo: 'MERGULHADOR', hpAtual: 80, hpMax: 80, camaraAtualId: 7, camaraDestinoId: null, progressoTravessiaSeg: 0 },
      ],
    },
  });
  const posTickInvB = avancarTickTripulacao(estInvasorMantaB, 0.25);
  assert.notEqual(
    posTickInvB.naveJogador.invasoresInimigos[0].proximaCamaraId,
    1,
    'Invasor na C7 de MANTA_VOLT_B não pode atravessar a antepara selada direto para C1'
  );

  // Limite estrito de sala 1x1 em combate/mapa (rejeita 2o tripulante na mesma sala 1x1!)
  const cam1x1Id = Number(Object.entries(campSteam.naveJogador.limitesPorSala).find(([, lim]) => lim === 1)[0]);
  const estDoisNa1x1 = congelarProfundo({
    ...campSteam,
    naveJogador: {
      ...campSteam.naveJogador,
      tripulacao: campSteam.naveJogador.tripulacao.map((t, idx) =>
        idx === 0 ? { ...t, camaraAtualId: cam1x1Id, camaraDestinoId: null } : t
      ),
    },
  });
  const resMoverLotada = despacharComandoUi(estDoisNa1x1, {
    tipo: 'MOVER_TRIPULANTE',
    payload: { tripulanteId: estDoisNa1x1.naveJogador.tripulacao[1].id, camaraDestinoId: cam1x1Id },
  });
  assert.equal(resMoverLotada.aceito, false);
  assert.equal(resMoverLotada.marcadorRejeicao, 'PRECONDICAO_NAO_ATENDIDA');

  // Oferta de Rendição Inimiga em Combate (`<= 28%` HP) + Aceite com `[R]` (`ACEITAR_RENDICAO_INIMIGA`)
  let estRendicao = criarEstadoCampanhaCompleta({
    persistirEmDisco: false,
    seedPartida: 'seed-rendicao-r-01',
    faseInicial: 'COMBATE',
    edicaoComercialSteam: true,
  });
  estRendicao = congelarProfundo({
    ...estRendicao,
    alvoCombate: {
      ...estRendicao.alvoCombate,
      classeAlvo: 'BARCO_HUMANO',
      hpCascoMax: 20,
      hpCascoAtual: 4,
    },
  });
  estRendicao = avancarTickCampanhaCompleta(estRendicao, 0.25, { persistirEmDisco: false });
  assert.ok(estRendicao.alvoCombate.ofertaRendicaoAtiva, 'Barco humano com <=28% casco deve emitir oferta de rendição');
  const tradKeyRRend = traduzirInputDomParaComandoUi(
    { tipoEvento: 'KEYDOWN', code: 'KeyR' },
    estRendicao,
    projetarViewModelWireframe(estRendicao),
    {}
  );
  assert.equal(tradKeyRRend.acaoCampanhaUi.tipoAcao, 'ACEITAR_RENDICAO_INIMIGA');
  const resAceitarRend = executarAcaoCampanhaCompleta(estRendicao, tradKeyRRend.acaoCampanhaUi, { persistirEmDisco: false });
  assert.equal(resAceitarRend.ok, true);
  assert.equal(resAceitarRend.estado.meta.modalCampanhaAtivo, 'SAQUE');
  assert.equal(resAceitarRend.estado.meta.saquePendente.modalidade, 'RENDICAO_NEGOCIADA');

  // Teste direto de `aplicarKitLayoutEDificuldadeSteamNaRun` também em COURACA_LIMIAR_B Fácil
  const runFacilDireta = aplicarKitLayoutEDificuldadeSteamNaRun(campSteam, {
    idArquitetura: 'COURACA_LIMIAR',
    variante: 'B',
    dificuldade: 'FACIL',
  });
  assert.equal(runFacilDireta.naveJogador.layoutId, 'COURACA_LIMIAR_B');
  assert.equal(runFacilDireta.economia.sucata, 35);

  // Tutorial Guiado ao vivo direto do Hangar -> Combate com avanço automático de lição ao despachar comandos reais!
  let campTut = criarEstadoCampanhaCompleta({ persistirEmDisco: false, seedPartida: 'tut-live-01', edicaoComercialSteam: true });
  campTut = executarAcaoCampanhaCompleta(campTut, {
    tipoAcao: 'EXECUTAR_ACAO_STEAM',
    payload: { acaoSteam: 'INICIAR_TUTORIAL_GUIADO' },
  }, { persistirEmDisco: false }).estado;
  assert.equal(campTut.meta.faseJogo, 'COMBATE');
  assert.equal(campTut.meta.tutorialSteam.ativo, true);
  assert.equal(campTut.meta.tutorialSteam.etapaIndice, 0);
  // Avança Lição 1 (Pausa Tática) -> Lição 2 (Dreno) -> Lição 3 (Mergulho 400Hz) -> Lição 4 (Mira) -> Lição 5 (Tripulação) -> Lição 6 (Captura +40%) -> Concluído + Conquista!
  campTut = sincronizarProgressoTutorialSteamNoEstado(campTut, 'ALTERNAR_PAUSA_TATICA', { persistirEmDisco: false });
  assert.equal(campTut.meta.tutorialSteam.etapaIndice, 1);
  campTut = executarAcaoCampanhaCompleta(campTut, { comandoMotor: { tipo: 'DRENAR_TUDO', payload: { modoSeguro: true } } }, { persistirEmDisco: false }).estado;
  assert.equal(campTut.meta.tutorialSteam.etapaIndice, 2);
  campTut = executarAcaoCampanhaCompleta(campTut, { comandoMotor: { tipo: 'MERGULHO_TATICO', payload: { recolherFoil: true } } }, { persistirEmDisco: false }).estado;
  assert.equal(campTut.meta.tutorialSteam.etapaIndice, 3);
  // Retoma Foil para continuar combate normal
  campTut = executarAcaoCampanhaCompleta(campTut, { comandoMotor: { tipo: 'MERGULHO_TATICO', payload: { recolherFoil: false } } }, { persistirEmDisco: false }).estado;
  const salaAlvoTut = campTut.alvoCombate.salasOuOrgaos[0].id;
  campTut = executarAcaoCampanhaCompleta(campTut, { comandoMotor: { tipo: 'MIRAR_ARMA', payload: { slotIndex: 0, salaAlvoId: salaAlvoTut } } }, { persistirEmDisco: false }).estado;
  assert.equal(campTut.meta.tutorialSteam.etapaIndice, 4);
  const tripIdTut = campTut.naveJogador.tripulacao[0].id;
  campTut = executarAcaoCampanhaCompleta(campTut, { comandoMotor: { tipo: 'MOVER_TRIPULANTE', payload: { tripulanteId: tripIdTut, camaraDestinoId: 4 } } }, { persistirEmDisco: false }).estado;
  assert.equal(campTut.meta.tutorialSteam.etapaIndice, 5);
  assert.ok(campTut.meta.tutorialSteam.etapaAtual.seloEn.includes('+40%'));
  campTut = sincronizarProgressoTutorialSteamNoEstado(campTut, 'CONFIRMAR_SAQUE_POS_COMBATE', { persistirEmDisco: false });
  assert.equal(campTut.meta.tutorialSteam.concluido, true);
  assert.ok(campTut.meta.conquistasDesbloqueadas.includes('ACH_GLOBAL_TUTORIAL_CONCLUIDO'));

  // Mirar arma AE em combate real e rodar ticks p/ capturar `projeteisAtivos` em voo a 60 FPS!
  const salaAlvo1 = campTut.alvoCombate.salasOuOrgaos[0].id;
  campTut = despacharComandoUi(campTut, { tipo: 'MIRAR_ARMA', payload: { slotIndex: 0, salaAlvoId: salaAlvo1 } }).estado;
  let vmCombateLive = projetarViewModelWireframe(campTut);
  let totalFramesComProjeteis = 0;
  for (let tk = 0; tk < 48; tk += 1) {
    campTut = avancarTickCampanhaCompleta(campTut, 0.25, { persistirEmDisco: false });
    const vmTk = projetarViewModelWireframe(campTut);
    if (vmTk.projeteisAtivos.length > 0) {
      totalFramesComProjeteis += 1;
      vmCombateLive = vmTk;
    }
  }
  assert.equal(vmCombateLive.edicaoComercialSteam, true);
  assert.ok(totalFramesComProjeteis >= 3 && vmCombateLive.projeteisAtivos.length >= 1, 'Combate real deve alimentar projeteisAtivos no ViewModel');

  // Rebind interativo E2E no modal OPCOES (`INICIAR_REMAPEAR_TECLA` -> `KEYDOWN KeyQ` -> `KeyQ` aciona Mergulho Tático!)
  campTut = executarAcaoCampanhaCompleta(campTut, {
    tipoAcao: 'EXECUTAR_ACAO_STEAM',
    payload: { acaoSteam: 'ABRIR_OPCOES' },
  }, { persistirEmDisco: false }).estado;
  assert.equal(campTut.meta.modalSteamAtivo, 'OPCOES');
  campTut = executarAcaoCampanhaCompleta(campTut, {
    tipoAcao: 'EXECUTAR_ACAO_STEAM',
    payload: { acaoSteam: 'INICIAR_REMAPEAR_TECLA', acaoId: 'MERGULHO_TATICO' },
  }, { persistirEmDisco: false }).estado;
  assert.equal(campTut.meta.aguardandoRebindAcao, 'MERGULHO_TATICO');
  const tradRebindKeyQ = traduzirInputDomParaComandoUi(
    { tipoEvento: 'KEYDOWN', code: 'KeyQ' },
    campTut,
    projetarViewModelWireframe(campTut),
    {}
  );
  assert.equal(tradRebindKeyQ.acaoCampanhaUi.payload.acaoSteam, 'REATRIBUIR_TECLA');
  assert.equal(tradRebindKeyQ.acaoCampanhaUi.payload.novaTeclaCodigo, 'KeyQ');
  campTut = executarAcaoCampanhaCompleta(campTut, tradRebindKeyQ.acaoCampanhaUi, { persistirEmDisco: false }).estado;
  assert.equal(campTut.meta.configuracoesSteam.atalhosTeclado.MERGULHO_TATICO, 'KeyQ');
  assert.equal(campTut.meta.aguardandoRebindAcao, null);

  // Clique direto na barra de volume Master (`STEAM_OPT_BARRA_VOL_MASTER`) e botão Restaurar Padrões (`STEAM_OPT_RESTAURAR_ATALHOS`)
  const vmOpcoesAtivo = projetarViewModelWireframe(campTut);
  const tradCliqueBarraVol = traduzirInputDomParaComandoUi(
    {
      tipoEvento: 'CLICK',
      botaoMouse: 0,
      clientX: 572,
      clientY: 120,
      retanguloCanvas: { left: 0, top: 0, width: 960, height: 540 },
    },
    campTut,
    vmOpcoesAtivo,
    {}
  );
  assert.equal(tradCliqueBarraVol.acaoCampanhaUi.payload.acaoSteam, 'DEFINIR_VOLUME_DIRETO');
  campTut = executarAcaoCampanhaCompleta(campTut, tradCliqueBarraVol.acaoCampanhaUi, { persistirEmDisco: false }).estado;
  assert.equal(campTut.meta.configuracoesSteam.volumeMaster, 50, 'Clique no meio da barra (x=572 em 496..648) deve definir volume em 50%');

  const tradRestaurarPadroes = traduzirInputDomParaComandoUi(
    {
      tipoEvento: 'CLICK',
      botaoMouse: 0,
      clientX: 300,
      clientY: 460,
      retanguloCanvas: { left: 0, top: 0, width: 960, height: 540 },
    },
    campTut,
    projetarViewModelWireframe(campTut),
    {}
  );
  assert.equal(tradRestaurarPadroes.acaoCampanhaUi.payload.acaoSteam, 'RESTAURAR_PADROES_OPCOES');
  const posRestaurado = executarAcaoCampanhaCompleta(campTut, tradRestaurarPadroes.acaoCampanhaUi, { persistirEmDisco: false }).estado;
  assert.equal(posRestaurado.meta.configuracoesSteam.atalhosTeclado.MERGULHO_TATICO, 'KeyM');
  assert.equal(posRestaurado.meta.configuracoesSteam.volumeMaster, 85);
  assert.equal(posRestaurado.meta.configuracoesSteam.volumeMusica, 75);
  assert.equal(posRestaurado.meta.configuracoesSteam.volumeSfx, 90);

  campTut = executarAcaoCampanhaCompleta(campTut, {
    tipoAcao: 'EXECUTAR_ACAO_STEAM',
    payload: { acaoSteam: 'FECHAR_MODAL_STEAM' },
  }, { persistirEmDisco: false }).estado;
  const tradMergulhoKeyQ = traduzirInputDomParaComandoUi(
    { tipoEvento: 'KEYDOWN', code: 'KeyQ' },
    campTut,
    projetarViewModelWireframe(campTut),
    {}
  );
  assert.equal(tradMergulhoKeyQ.comandoMotor.tipo, 'MERGULHO_TATICO', 'Tecla customizada KeyQ deve acionar MERGULHO_TATICO');

  // Localização en-US de rejeições, Ghost Preview Server<->Browser e persistência em disco (`profile.json`)
  assert.equal(
    formatarMensagemRejeicaoUi('ENERGIA_INSUFICIENTE', '', { idioma: 'en-US' }),
    'NO RESERVE POWER IN BIO-ELECTRIC HEART'
  );
  const campTutEn = aplicarAcaoMetaSteamNoEstado(campTut, 'ALTERNAR_IDIOMA', {}).estado;
  const ghostSrvEn = calcularGhostPreviewTermometro(campTutEn, 'BTN_DRENAR_SEGURO');
  const vmEnSemMapa = {
    ...projetarViewModelWireframe(campTutEn),
    termometroSustentacao: { ...projetarViewModelWireframe(campTutEn).termometroSustentacao, mapaGhostPorHitbox: null },
  };
  const ghostCliEn = enriquecerGhostPreviewCliente(vmEnSemMapa, 'BTN_DRENAR_SEGURO').termometroSustentacao.ghostPreview;
  assert.equal(ghostSrvEn.rotuloFantasma, '[SAFE >=63kg]');
  assert.equal(ghostCliEn.rotuloFantasma, '[SAFE >=63kg]');

  // Persistência em `profile.json` de conquistas, layouts Tipo B e idioma entre sessões
  const dirSaveTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'biofoil-save-persist-'));
  try {
    let sessao1 = criarEstadoCampanhaCompleta({ persistirEmDisco: true, diretorioDados: dirSaveTmp, edicaoComercialSteam: true });
    sessao1 = executarAcaoCampanhaCompleta(sessao1, {
      tipoAcao: 'EXECUTAR_ACAO_STEAM',
      payload: { acaoSteam: 'ALTERNAR_IDIOMA' },
    }, { persistirEmDisco: true, diretorioDados: dirSaveTmp }).estado;
    sessao1 = executarAcaoCampanhaCompleta(sessao1, {
      tipoAcao: 'INICIAR_NOVA_RUN',
      payload: {},
    }, { persistirEmDisco: true, diretorioDados: dirSaveTmp }).estado;
    const vizinho1 = projetarViewModelWireframe(sessao1).mapaSetorialResumo.nos.find((n) => n.alcancavel).id;
    sessao1 = executarAcaoCampanhaCompleta(sessao1, {
      comandoMotor: { tipo: 'VIAJAR_NO_MAPA', payload: { idNoDestino: vizinho1, noDestinoId: vizinho1 } },
    }, { persistirEmDisco: true, diretorioDados: dirSaveTmp }).estado;
    assert.ok(sessao1.meta.conquistasDesbloqueadas.includes('ACH_GLOBAL_PRIMEIRO_SALTO'));

    const sessao2 = criarEstadoCampanhaCompleta({ persistirEmDisco: true, diretorioDados: dirSaveTmp, edicaoComercialSteam: true });
    assert.equal(sessao2.meta.configuracoesSteam.idioma, 'en-US', 'Idioma salvo deve recarregar de profile.json');
    assert.ok(
      sessao2.meta.conquistasDesbloqueadas.includes('ACH_GLOBAL_PRIMEIRO_SALTO'),
      'Conquista desbloqueada em salto deve recarregar de profile.json'
    );
  } finally {
    fs.rmSync(dirSaveTmp, { recursive: true, force: true });
  }

  // Atalho [J] abre/fecha Conquistas sem colidir com [K] Mute + Inspeção de cartão + MEDULA (+2 HP salto) + OLHO_SONAR_ABISSAL
  const tradKeyJ = traduzirInputDomParaComandoUi({ tipoEvento: 'KEYDOWN', code: 'KeyJ' }, campTut, projetarViewModelWireframe(campTut), {});
  assert.equal(tradKeyJ.acaoCampanhaUi.payload.acaoSteam, 'ABRIR_CONQUISTAS');
  campTut = executarAcaoCampanhaCompleta(campTut, tradKeyJ.acaoCampanhaUi, { persistirEmDisco: false }).estado;
  assert.equal(campTut.meta.modalSteamAtivo, 'CONQUISTAS');
  campTut = executarAcaoCampanhaCompleta(campTut, {
    tipoAcao: 'EXECUTAR_ACAO_STEAM',
    payload: { acaoSteam: 'INSPECIONAR_CONQUISTA', conquistaId: 'ACH_SOMBRA_2_PREDADOR_CIRURGICO' },
  }, { persistirEmDisco: false }).estado;
  assert.equal(campTut.meta.conquistaInspecionadaId, 'ACH_SOMBRA_2_PREDADOR_CIRURGICO');
  const tradKeyJFechar = traduzirInputDomParaComandoUi({ tipoEvento: 'KEYDOWN', code: 'KeyJ' }, campTut, projetarViewModelWireframe(campTut), {});
  campTut = executarAcaoCampanhaCompleta(campTut, tradKeyJFechar.acaoCampanhaUi, { persistirEmDisco: false }).estado;
  assert.equal(campTut.meta.modalSteamAtivo, null);

  // MEDULA_REGENERATIVA_CORAL (+2 HP a cada salto no mapa) + OLHO_SONAR_ABISSAL (revela carta imediatamente)
  let campOrgaosMapa = criarEstadoCampanhaCompleta({ persistirEmDisco: false, seedPartida: 'medula-sonar-01', edicaoComercialSteam: true });
  campOrgaosMapa = executarAcaoCampanhaCompleta(campOrgaosMapa, { tipoAcao: 'INICIAR_NOVA_RUN', payload: {} }, { persistirEmDisco: false }).estado;
  campOrgaosMapa = congelarProfundo({
    ...campOrgaosMapa,
    naveJogador: {
      ...campOrgaosMapa.naveJogador,
      hpCascoAtual: 20,
      hpCascoMax: 30,
      poraoCarga: [{ id: 'MEDULA_REGENERATIVA_CORAL', categoria: 'ORGAO' }],
    },
  });
  const vizSaltoMedula = projetarViewModelWireframe(campOrgaosMapa).mapaSetorialResumo.nos.find((n) => n.alcancavel).id;
  campOrgaosMapa = executarAcaoCampanhaCompleta(campOrgaosMapa, {
    comandoMotor: { tipo: 'VIAJAR_NO_MAPA', payload: { idNoDestino: vizSaltoMedula, noDestinoId: vizSaltoMedula } },
  }, { persistirEmDisco: false }).estado;
  assert.ok(campOrgaosMapa.naveJogador.hpCascoAtual >= 22, 'MEDULA_REGENERATIVA_CORAL deve regenerar +2 HP de casco ao saltar no mapa');

  // Todas as 24 conquistas e 5 variantes Tipo B são alcançáveis acumulando telemetria real nas 5 espécies!
  const telemetriaBaseGlobal = {
    setorAtual: 5,
    dificuldade: 'DIFICIL',
    saltosRealizados: 5,
    capturaIntactaRealizada: true,
    esquivouEmMergulhoTatico: true,
    blueOptionsResolvidasNaRun: 3,
    questsConcluidasNaRun: 1,
    armasAtivasSimultaneas: 4,
    orgaosAtivosSimultaneos: 3,
    sistemaNoNivelMaximo: true,
    leviataDerrotado: true,
    vitoriaCampanhaDraga: true,
    tutorialConcluido: true,
    vitoriaCombateSemTouchdown: true,
    aguaDrenadaNaLutaKg: 85,
    sistemasInimigosIonizadosSimultaneos: 3,
    pctCascoAtual: 80,
    vitoriaEmTouchdownSemMortes: true,
    impactosAbsorvidosOuDefletidosNaLuta: 6,
    feixeDisparadoSobTintaFurtiva: true,
    vitoriaCombateZeroDanoCasco: true,
    especiesDistintasVivasABordo: 4,
  };
  let acumConquistas24 = [];
  for (const espId of ['CARCACA_ALFA', 'MANTA_VOLT', 'COURACA_LIMIAR', 'SOMBRA_ABISSAL', 'COLMEIA_VIVA']) {
    acumConquistas24 = avaliarConquistasSteam({ ...telemetriaBaseGlobal, especieNave: espId }, acumConquistas24).todosDesbloqueados;
  }
  assert.equal(acumConquistas24.length, 24, 'Todas as 24 conquistas Steam devem desbloquear com telemetria real das 5 espécies');
  for (const idTipoB of ['CARCACA_ALFA_B', 'MANTA_VOLT_B', 'COURACA_LIMIAR_B', 'SOMBRA_ABISSAL_B', 'COLMEIA_VIVA_B']) {
    assert.equal(verificarLayoutTipoBDesbloqueado(idTipoB, { conquistasDesbloqueadas: acumConquistas24 }), true);
  }

  // 6. Simetrias de Simulação R5: Decaimento Íon Modular Inimigo, Estase Crio Aliada, Vesícula +8% Exato, Saque Pacífica AE e Resgate 1x1
  const { calcularEsquivaEfetivaNave } = await import('../src/onda2-combate/tick-sistemas-armas.mjs');
  const { avancarTickPartidaEmTempoReal } = await import('../src/onda6-ui/tick-combate-tempo-real.mjs');
  const { transicionarFaseChefeDraga, criarEstadoChefeDraga } = await import('../src/onda5-catalogo-chefe/chefe-draga.mjs');

  // 6A. VESICULA_HIPERBARICA soma exatamente +8% (nunca +16% duplicado) tanto no HUD quanto no rolamento real de disparo inimigo
  const baseFoilEsq = criarEstadoInicialPartida({ seedPartida: 'vesicula-exata-8', idArquitetura: 'CARCACA_ALFA', faseJogo: 'COMBATE' });
  const esqSemVesicula = calcularEsquivaEfetivaNave(baseFoilEsq.naveJogador);
  const comVesicula = congelarProfundo({
    ...baseFoilEsq,
    meta: { ...baseFoilEsq.meta, edicaoComercialSteam: true },
    naveJogador: {
      ...baseFoilEsq.naveJogador,
      poraoCarga: [{ slotIndex: 0, item: { id: 'VESICULA_HIPERBARICA', tipo: 'ORGAO', pesoKg: 5 } }],
    },
  });
  assert.equal(calcularEsquivaEfetivaNave(comVesicula.naveJogador), esqSemVesicula + 8, 'VESICULA_HIPERBARICA deve somar exatamente +8%');

  // 6B. Íon modular inimigo (`danoIonico: 1`, `duracaoIonSeg: 5.0`) seta `tempoParalisiaIonSeg` e expira após 5.0s (20 ticks)
  let combIonInim = criarEstadoCampanhaCompleta({ persistirEmDisco: false, seedPartida: 'ion-inim-expira', edicaoComercialSteam: true });
  combIonInim = executarAcaoCampanhaCompleta(combIonInim, { tipoAcao: 'INICIAR_NOVA_RUN', payload: {} }, { persistirEmDisco: false }).estado;
  combIonInim = congelarProfundo({
    ...combIonInim,
    meta: { ...combIonInim.meta, faseJogo: 'COMBATE', edicaoComercialSteam: true, dificuldade: 'DIFICIL' },
    naveJogador: {
      ...combIonInim.naveJogador,
      estadoFisico: '2_TOUCHDOWN',
      camadasBarreiraAtivas: 0,
      camaras: combIonInim.naveJogador.camaras.map((c) =>
        c.id === 4 ? { ...c, barrasEnergiaAlocada: 0, energiaAlocada: 0 } : c
      ),
    },
    alvoCombate: {
      ativo: true,
      classeAlvo: 'BARCO_HUMANO',
      nome: 'Corveta Ionica Teste',
      hpCascoAtual: 12,
      hpCascoMax: 12,
      setorNumero: 2,
      progressoAtaquePrimarioSeg: 9.6,
      progressoAtaqueSecundarioSeg: 0,
      armasEquipadasInimigo: [
        { id: 'CANHAO_PULSO_BIOELETRICO_I', danoIonico: 1, duracaoIonSeg: 5.0, familiaVisual: 'ION' },
      ],
      tripulacaoInimiga: [{ id: 'h-ion-1', especie: 'MARINHEIRO', hpAtual: 100, salaAtualId: 2 }],
      salasOuOrgaos: [
        { id: 1, nome: 'PONTE', integridadeAtual: 2, integridadeMax: 2, tripulantes: [] },
        { id: 2, nome: 'TORRETA', integridadeAtual: 2, integridadeMax: 2, tripulantes: [{ id: 'h-ion-1', hpAtual: 100 }] },
      ],
    },
  });
  combIonInim = avancarTickPartidaEmTempoReal(combIonInim, 0.25);
  const camIonizada = combIonInim.naveJogador.camaras.find((c) => Number(c.danoIonizado ?? 0) > 0);
  assert.ok(camIonizada, 'Disparo iônico inimigo sem barreira/esquiva deve ionizar uma câmara do jogador');
  assert.ok(camIonizada.tempoParalisiaIonSeg > 0, 'Câmara ionizada pelo inimigo deve receber tempoParalisiaIonSeg > 0');
  let combPosDecaimento = congelarProfundo({
    ...combIonInim,
    alvoCombate: { ...combIonInim.alvoCombate, ativo: false, hpCascoAtual: 0 },
  });
  for (let i = 0; i < 22; i += 1) {
    combPosDecaimento = avancarTickPartidaEmTempoReal(combPosDecaimento, 0.25);
  }
  const camApos5s = combPosDecaimento.naveJogador.camaras.find((c) => c.id === camIonizada.id);
  assert.equal(camApos5s.danoIonizado, 0, 'Ionização inimiga deve expirar para 0 após decair tempoParalisiaIonSeg');
  assert.equal(camApos5s.barrasIonizadas, 0, 'barrasIonizadas deve voltar a 0 junto com danoIonizado');

  // 6C. Estase Crio (`atordoadoSeg = 4.0`) congela nado, reparo, acoplamento de estação e DPS corpo-a-corpo, e recupera em 4.0s
  const estBaseStun = criarEstadoInicialPartida({ seedPartida: 'crio-stun-aliado', idArquitetura: 'CARCACA_ALFA', faseJogo: 'COMBATE' });
  let estCrio = congelarProfundo({
    ...estBaseStun,
    naveJogador: {
      ...estBaseStun.naveJogador,
      camaras: estBaseStun.naveJogador.camaras.map((c) =>
        c.id === 2 ? { ...c, barrasIntegridade: 0, integridade: 0, nivelMaxBarras: 1, progressoReparoSistemaSeg: 0 } : c
      ),
      tripulacao: estBaseStun.naveJogador.tripulacao.map((t, idx) =>
        idx === 0
          ? { ...t, camaraAtualId: 2, camaraDestinoId: 4, progressoNadoSeg: 0, acopladoBulbo: false, atordoadoSeg: 1.0 }
          : t
      ),
    },
  });
  estCrio = avancarTickTripulacao(estCrio, 0.25);
  assert.equal(estCrio.naveJogador.tripulacao[0].atordoadoSeg, 0.75, 'atordoadoSeg deve decair em dtSeg');
  assert.equal(estCrio.naveJogador.tripulacao[0].progressoNadoSeg, 0, 'Tripulante em estase crio não pode nadar');
  for (let k = 0; k < 3; k += 1) {
    estCrio = avancarTickTripulacao(estCrio, 0.25);
  }
  assert.equal(estCrio.naveJogador.tripulacao[0].atordoadoSeg, 0, 'Após 1.0s (4 ticks), atordoadoSeg deve zerar');
  estCrio = avancarTickTripulacao(estCrio, 0.25);
  assert.ok(estCrio.naveJogador.tripulacao[0].progressoNadoSeg > 0, 'Após fim da estase crio, o tripulante volta a nadar normalmente');

  // 6D. ENZIMA_DIGESTORA_SUCATA (+20%) + dificuldade FACIL (1.25x) escalam sucata pacífica em ESCOLHER_OPCAO_EVENTO Steam (mantendo 12 exato fora do Steam)
  const baseEvPacifica = {
    ...criarEstadoInicialPartida({ seedPartida: 'ev-pacifica-enzima', idArquitetura: 'CARCACA_ALFA', faseJogo: 'EVENTO' }),
    economia: { sucata: 10, biomassa: 0, combustivel: 10, municao: 5 },
    eventoAtual: { id: 'NO_EV_AE', idTemplateEvento: 'EXP_4_CEMITERIO_DRONES', tipoNo: 'EXPLORACAO', estadoTemporalNo: 'INTACTO' },
    naveJogador: {
      ...estBaseStun.naveJogador,
      poraoCarga: [{ slotIndex: 0, item: { id: 'ENZIMA_DIGESTORA_SUCATA', tipo: 'ORGAO', pesoKg: 5 } }],
    },
  };
  const resEvClassico = despacharComandoUi(
    congelarProfundo({ ...baseEvPacifica, meta: { seedPartida: 'ev-pacifica-enzima', faseJogo: 'EVENTO', edicaoComercialSteam: false, dificuldade: 'FACIL' } }),
    { tipo: 'ESCOLHER_OPCAO_EVENTO', payload: { idEvento: 'EXP_4_CEMITERIO_DRONES', opcao: 'A' } }
  );
  assert.equal(resEvClassico.aceito, true);
  assert.equal(resEvClassico.estado.economia.sucata - 10, 12, 'Modo clássico Onda 4/6 deve preservar 12 exato de Sucata_bruta(S1)');

  const resEvEscalada = despacharComandoUi(
    congelarProfundo({ ...baseEvPacifica, meta: { seedPartida: 'ev-pacifica-enzima', faseJogo: 'EVENTO', edicaoComercialSteam: true, dificuldade: 'FACIL' } }),
    { tipo: 'ESCOLHER_OPCAO_EVENTO', payload: { idEvento: 'EXP_4_CEMITERIO_DRONES', opcao: 'A' } }
  );
  assert.equal(resEvEscalada.aceito, true);
  assert.equal(
    resEvEscalada.estado.economia.sucata - 10,
    18,
    'Sucata pacífica (12) deve escalar por 1.25 * 1.20 = 18 na Edição Comercial Steam'
  );

  // 6E. Resgate pós-combate / transição de fase respeita `limitesPorSala` (Câmara 7 `1x1` em COLMEIA_VIVA_A divide 2 abordadores em C7 e C3)
  let campColmeiaA = criarEstadoCampanhaCompleta({
    persistirEmDisco: false,
    seedPartida: 'colmeia-a-resgate-1x1',
    edicaoComercialSteam: true,
    perfilInicial: {
      carcacasDesbloqueadas: { CARCACA_ALFA: true, COLMEIA_VIVA: true },
    },
  });
  campColmeiaA = executarAcaoCampanhaCompleta(campColmeiaA, {
    tipoAcao: 'SELECIONAR_CARCACA_HANGAR',
    payload: { idArquitetura: 'COLMEIA_VIVA' },
  }, { persistirEmDisco: false }).estado;
  campColmeiaA = executarAcaoCampanhaCompleta(campColmeiaA, { tipoAcao: 'INICIAR_NOVA_RUN', payload: {} }, { persistirEmDisco: false }).estado;
  assert.equal(campColmeiaA.naveJogador.limitesPorSala[7], 1, 'COLMEIA_VIVA_A tem Câmara 7 compacta 1x1 (limite 1)');

  const estRendColmeiaA = congelarProfundo({
    ...campColmeiaA,
    meta: { ...campColmeiaA.meta, faseJogo: 'COMBATE' },
    naveJogador: {
      ...campColmeiaA.naveJogador,
      tripulacao: campColmeiaA.naveJogador.tripulacao.map((t, i) =>
        i < 2
          ? { ...t, localizacao: 'BORDO_INIMIGO', camaraAtualId: 7, salaInimigaId: 1 }
          : { ...t, localizacao: 'NAVE_JOGADOR', camaraAtualId: 5 }
      ),
    },
    alvoCombate: {
      ativo: true,
      classeAlvo: 'BARCO_HUMANO',
      hpCascoAtual: 2,
      hpCascoMax: 10,
      ofertaRendicaoAtiva: { sucata: 15, biomassa: 0, combustivel: 2, municao: 1 },
    },
  });
  const posRendColmeiaA = executarAcaoCampanhaCompleta(
    estRendColmeiaA,
    { tipoAcao: 'ACEITAR_RENDICAO_INIMIGA', payload: {} },
    { persistirEmDisco: false }
  ).estado;
  const naCam7PosRend = posRendColmeiaA.naveJogador.tripulacao.filter((t) => t.camaraAtualId === 7).length;
  const naCam3PosRend = posRendColmeiaA.naveJogador.tripulacao.filter((t) => t.camaraAtualId === 3).length;
  assert.equal(naCam7PosRend, 1, 'Apenas 1 abordador pode retornar à Câmara 7 (limite 1x1)');
  assert.equal(naCam3PosRend, 1, 'O segundo abordador deve retornar à Câmara 3 adjacente sem estourar lotação');

  const estDragaColmeiaA = congelarProfundo({
    ...estRendColmeiaA,
    alvoCombate: criarEstadoChefeDraga(1),
  });
  const posTransDragaB = transicionarFaseChefeDraga(estDragaColmeiaA);
  assert.equal(posTransDragaB.naveJogador.tripulacao.filter((t) => t.camaraAtualId === 7).length, 1);
  assert.equal(posTransDragaB.naveJogador.tripulacao.filter((t) => t.camaraAtualId === 3).length, 1);

  // Regra #7 Global: 100% dos arquivos e funções exportadas testados diretamente!
  const relRegra7 = verificarRegraTestesParaTudo(DIRETORIO_RAIZ);
  assert.equal(relRegra7.arquivosCodigoExaminados, 57);
  assert.ok(relRegra7.totalFuncoesExportadasExaminadas >= 316);

  console.log(`[N4] Pilar 4 Produto Steam verificado: 100 eventos PT/EN 0-truncamento, 24 conquistas, 6 lições tutorial, E2E live MANTA_VOLT_B e ${relRegra7.totalFuncoesExportadasExaminadas} funções cobertas`);
});

test('[PORTÃO 10.6 | R7 Steam 1.0 Sem Bypass >= 9.0/10] Maestria ★/★★, Subsistemas [H/N/Drone], Postos [Z/Y], Esquadrão Shift+Click, Pausa 950 Hz, 8 Biomas .OGG e FFI Nativo libsteam_api.dylib', async () => {
  const { criarEstadoCampanhaCompleta, executarAcaoCampanhaCompleta, avancarTickCampanhaCompleta } = await import('../src/onda6-ui/campanha-completa.mjs');
  const { traduzirInputDomParaComandoUi } = await import('../src/onda6-ui/tradutor-input-dom.mjs');
  const { despacharComandoUi } = await import('../src/onda6-ui/despacho-comandos.mjs');

  // 1. Catálogo de 7 Subsistemas Táticos Steam (incl. 3 Drones: Defesa, Reparo e Assalto) + Compra na Loja + Estoque Dinâmico (6..9)
  const catSubs = obterCatalogoSubsistemasTaticosSteam();
  assert.equal(catSubs.length, 7);
  assert.equal(Object.isFrozen(catSubs), true);
  assert.ok(catSubs.some((s) => s.id === 'SUBSISTEMA_SONDA_SABOTAGEM'));
  assert.ok(catSubs.some((s) => s.id === 'SUBSISTEMA_PARASITA_NEURAL'));
  assert.ok(catSubs.some((s) => s.id === 'SUBSISTEMA_DRONE_DEFESA'));
  assert.ok(catSubs.some((s) => s.id === 'SUBSISTEMA_DRONE_REPARO'));
  assert.ok(catSubs.some((s) => s.id === 'SUBSISTEMA_DRONE_ATAQUE'));

  let estLojaSub = congelarProfundo({
    ...criarEstadoInicialPartida({ seedPartida: 'loja-subs-r7', idArquitetura: 'CARCACA_ALFA', faseJogo: 'LOJA' }),
    meta: { seedPartida: 'loja-subs-r7', faseJogo: 'LOJA', edicaoComercialSteam: true, dificuldade: 'NORMAL' },
    economia: { sucata: 600, biomassa: 200 },
    recursos: { sucata: 600, biomassa: 200 },
    lojaAtual: {
      ofertasSteam: [{ id: 'INSUMO_COMBUSTIVEL', estoqueInicial: 8 }],
      contagemInsumosComprados: { INSUMO_COMBUSTIVEL: 5 },
    },
  });
  const compComb6 = despacharComandoUi(estLojaSub, {
    tipo: 'COMPRAR_OU_VENDER_LOJA',
    payload: { itemOuSistemaId: 'INSUMO_COMBUSTIVEL', operacao: 'COMPRAR' },
  });
  assert.equal(compComb6.aceito, true, 'Na Edição Steam o estoque dinâmico 8 da loja deve permitir comprar a 6ª unidade');
  estLojaSub = compComb6.estado;
  assert.equal(estLojaSub.lojaAtual.contagemInsumosComprados.INSUMO_COMBUSTIVEL, 6);
  const compComb7 = despacharComandoUi(estLojaSub, {
    tipo: 'COMPRAR_OU_VENDER_LOJA',
    payload: { itemOuSistemaId: 'INSUMO_COMBUSTIVEL', operacao: 'COMPRAR' },
  });
  const compComb8 = despacharComandoUi(compComb7.estado, {
    tipo: 'COMPRAR_OU_VENDER_LOJA',
    payload: { itemOuSistemaId: 'INSUMO_COMBUSTIVEL', operacao: 'COMPRAR' },
  });
  assert.equal(compComb8.aceito, true);
  const compComb9 = despacharComandoUi(compComb8.estado, {
    tipo: 'COMPRAR_OU_VENDER_LOJA',
    payload: { itemOuSistemaId: 'INSUMO_COMBUSTIVEL', operacao: 'COMPRAR' },
  });
  assert.equal(compComb9.aceito, false, 'A 9ª compra acima do estoqueInicial 8 deve ser rejeitada');
  estLojaSub = compComb8.estado;
  for (const idSub of [
    'SUBSISTEMA_SONDA_SABOTAGEM',
    'SUBSISTEMA_PARASITA_NEURAL',
    'SUBSISTEMA_DRONE_DEFESA',
    'SUBSISTEMA_DRONE_REPARO',
    'SUBSISTEMA_DRONE_ATAQUE',
  ]) {
    const resSub = despacharComandoUi(estLojaSub, {
      tipo: 'COMPRAR_OU_VENDER_LOJA',
      payload: { itemOuSistemaId: idSub, operacao: 'COMPRAR' },
    });
    assert.equal(resSub.aceito, true, `Compra de ${idSub} deve ser aceita na Loja Steam`);
    estLojaSub = resSub.estado;
  }
  assert.equal(estLojaSub.naveJogador.subsistemasTaticosSteam.sondaSabotagem, true);
  assert.equal(estLojaSub.naveJogador.subsistemasTaticosSteam.parasitaNeural, true);
  assert.equal(estLojaSub.naveJogador.subsistemasTaticosSteam.droneDefesa, true);
  assert.equal(estLojaSub.naveJogador.subsistemasTaticosSteam.droneReparo, true);
  assert.equal(estLojaSub.naveJogador.subsistemasTaticosSteam.droneAtaque, true);

  // 2. Maestria Real de Tripulação (`0 -> ★ -> ★★`): Esquiva (+3/+5%), Recarga (-5/-10%), Barreira (-0.12/-0.24s) e Reparo (+30%)
  let tripBase = congelarProfundo({ id: 't-vet', especie: 'POLVO', camaraAtualId: 4, acopladoBulbo: true, hpAtual: 100, localizacao: 'NAVE_JOGADOR' });
  const tripVet1 = registrarXpTripulanteSteam(tripBase, 'pilotagem', 3);
  assert.equal(tripVet1.nivelMaestria, 1);
  const tripElite2 = registrarXpTripulanteSteam(tripVet1, 'pilotagem', 5);
  assert.equal(tripElite2.nivelMaestria, 2);

  const baseCombate = criarEstadoInicialPartida({ seedPartida: 'maestria-r7', idArquitetura: 'CARCACA_ALFA' });
  const tripulacaoPostosCanonica = [
    { id: 't-piloto', especie: 'ARRAIA', hpAtual: 70, hpMax: 70, camaraAtualId: 2, camaraDestinoId: null, acopladoBulbo: true, inflado: false, atordoadoSeg: 0, localizacao: 'NAVE_JOGADOR', nivelMaestria: 0 },
    { id: 't-barreira', especie: 'POLVO', hpAtual: 80, hpMax: 80, camaraAtualId: 4, camaraDestinoId: null, acopladoBulbo: true, inflado: false, atordoadoSeg: 0, localizacao: 'NAVE_JOGADOR', nivelMaestria: 0 },
    { id: 't-sifao', especie: 'CARANGUEJO', hpAtual: 110, hpMax: 110, camaraAtualId: 5, camaraDestinoId: null, acopladoBulbo: true, inflado: false, atordoadoSeg: 0, localizacao: 'NAVE_JOGADOR', nivelMaestria: 0 },
  ];
  const naveSemXp = congelarProfundo({
    ...baseCombate.naveJogador,
    estadoFisico: '1_NO_FOIL',
    tripulacao: tripulacaoPostosCanonica,
  });
  const naveElite = congelarProfundo({
    ...naveSemXp,
    tripulacao: tripulacaoPostosCanonica.map((t) => ({ ...t, nivelMaestria: 2 })),
  });
  assert.equal(
    calcularEsquivaEfetivaNave(naveElite) - calcularEsquivaEfetivaNave(naveSemXp),
    10,
    'Piloto Elite ★★ (C2: +5%) + Operador Sifão Elite ★★ (C5: +5%) devem conceder exatamente +10% de esquiva'
  );
  assert.equal(
    calcularTempoRecargaEfetivoArma({
      tempoChassiSeg: 10,
      especieOperadorArtilharia: 'ARRAIA',
      nivelMaestriaOperadorArtilharia: 2,
      estadoFisico: '1_NO_FOIL',
    }),
    8,
    'Artilheiro Elite ★★ (Arraia -10% + Maestria ★★ -10% aditivo) deve reduzir recarga de 10s para 8.0s'
  );
  assert.ok(
    calcularTempoRegenBarreiraSeg(naveSemXp) - calcularTempoRegenBarreiraSeg(naveElite) >= 0.23,
    'Operador Elite ★★ na Câmara 4 deve acelerar regeneração da barreira em 0.24s'
  );
  const estReparoSemXp = congelarProfundo({
    ...baseCombate,
    naveJogador: {
      ...naveSemXp,
      camaras: naveSemXp.camaras.map((c) => (c.id === 1 ? { ...c, barrasIntegridade: 1, nivelMaxBarras: 3, aguaKg: 50, progressoReparoSistemaSeg: 0 } : c)),
      tripulacao: [{ id: 'polvo-novato', especie: 'POLVO', hpAtual: 80, hpMax: 80, camaraAtualId: 1, camaraDestinoId: null, acopladoBulbo: false, inflado: false, atordoadoSeg: 0, localizacao: 'NAVE_JOGADOR', nivelMaestria: 0 }],
    },
  });
  const estReparoElite = congelarProfundo({
    ...estReparoSemXp,
    naveJogador: {
      ...estReparoSemXp.naveJogador,
      tripulacao: [{ ...estReparoSemXp.naveJogador.tripulacao[0], id: 'polvo-elite', nivelMaestria: 2 }],
    },
  });
  assert.equal(
    avancarTickTripulacao(estReparoSemXp, 5.0).naveJogador.camaras.find((c) => c.id === 1).barrasIntegridade,
    1,
    'Polvo novato (2.0x * 5.0s = 10.0 < 12.0s) ainda não conclui o reparo em 5.0s'
  );
  assert.equal(
    avancarTickTripulacao(estReparoElite, 5.0).naveJogador.camaras.find((c) => c.id === 1).barrasIntegridade,
    2,
    'Polvo Elite ★★ (+30% maestria sobre 2.0x Polvo -> 2.60x * 5.0s = 13.0 >= 12.0s) repara 1 barra inteira em 5.0s!'
  );

  // 3. Postos de Batalha [Z]/[Y], Sonda de Sabotagem [H], Parasita Neural [N], Drone de Defesa e Pílulas Táticas RGBA
  let campTat = criarEstadoCampanhaCompleta({ persistirEmDisco: false, seedPartida: 'tat-r7', edicaoComercialSteam: true });
  campTat = executarAcaoCampanhaCompleta(campTat, { tipoAcao: 'INICIAR_NOVA_RUN', payload: {} }, { persistirEmDisco: false }).estado;
  const alvoHumano = equiparArsenalModularInimigoSteam(criarAlvoSetor1Canonico('BARCO_HUMANO'), 'tat-r7', 3, 'NO_TAT_3');
  const salaAlvoHack = alvoHumano.salasOuOrgaos[0].id;
  campTat = congelarProfundo({
    ...campTat,
    meta: { ...campTat.meta, faseJogo: 'COMBATE', edicaoComercialSteam: true },
    economia: { ...campTat.economia, municao: 6 },
    recursos: { ...campTat.recursos, municao: 6 },
    naveJogador: {
      ...campTat.naveJogador,
      subsistemasTaticosSteam: {
        sondaSabotagem: true,
        parasitaNeural: true,
        droneDefesa: true,
        recargaSondaSeg: 0,
        sondaAtivaSeg: 0,
        recargaNeuralSeg: 0,
        recargaDroneDefesaSeg: 0,
      },
    },
    alvoCombate: {
      ...alvoHumano,
      camadasBarreiraAtivas: 2,
      barreiraBolhasAtual: 2,
      barreiraBolhasMax: 2,
      salasOuOrgaos: alvoHumano.salasOuOrgaos.map((s, idx) =>
        idx === 0
          ? {
              ...s,
              integridade: 3,
              integridadeAtual: 3,
              integridadeMax: 3,
              tripulantes: [
                { id: 'inim-1', salaAtualId: salaAlvoHack, hpAtual: 100, hpMax: 100 },
                { id: 'inim-2', salaAtualId: salaAlvoHack, hpAtual: 100, hpMax: 100 },
              ],
            }
          : s
      ),
      tripulacaoInimiga: [
        { id: 'inim-1', salaAtualId: salaAlvoHack, hpAtual: 100, hpMax: 100 },
        { id: 'inim-2', salaAtualId: salaAlvoHack, hpAtual: 100, hpMax: 100 },
      ],
    },
  });

  // Renderização direta das pílulas táticas (`rasterizarPilulasTaticasCombateSteamRgba`) e hitboxes sem colisão
  const vmTat = projetarViewModelWireframe(campTat);
  const hbsTat = obterMapaHitboxesNativo(vmTat);
  assert.ok(hbsTat.some((h) => h.idHitbox === 'STEAM_BTN_SALVAR_POSTOS'));
  assert.ok(hbsTat.some((h) => h.idHitbox === 'STEAM_BTN_RETORNAR_POSTOS'));
  assert.ok(hbsTat.some((h) => h.idHitbox === 'STEAM_BTN_SONDA_HACK'));
  assert.ok(hbsTat.some((h) => h.idHitbox === 'STEAM_BTN_PARASITA_NEURAL'));
  const bufPilulas = new Uint8ClampedArray(960 * 540 * 4);
  rasterizarPilulasTaticasCombateSteamRgba(bufPilulas, 960, 540, vmTat, { idioma: 'pt-BR', hoverHitboxId: 'STEAM_BTN_SONDA_HACK' });
  let pixelsPilulas = 0;
  for (let i = 3; i < bufPilulas.length; i += 4) {
    if (bufPilulas[i] > 0) pixelsPilulas += 1;
  }
  assert.ok(pixelsPilulas >= 600, 'Pílulas táticas [Z/Y/H/N/DRONE] devem desenhar geometria visível na zona 158..372, 45..84');

  // Salvar postos [Z], deslocar tripulante e retornar [Y]
  const tradZ = traduzirInputDomParaComandoUi({ tipoEvento: 'KEYDOWN', code: 'KeyZ' }, campTat, vmTat, {});
  assert.equal(tradZ.acaoCampanhaUi?.payload?.acaoSteam, 'SALVAR_POSTOS_TRIPULACAO');
  campTat = executarAcaoCampanhaCompleta(campTat, tradZ.acaoCampanhaUi, { persistirEmDisco: false }).estado;
  const idTrip0 = campTat.naveJogador.tripulacao[0].id;
  const camOrig0 = campTat.naveJogador.tripulacao[0].camaraAtualId;
  const camOutra = camOrig0 === 1 ? 5 : 1;
  campTat = despacharComandoUi(campTat, { tipo: 'MOVER_TRIPULANTE', payload: { tripulanteId: idTrip0, camaraDestinoId: camOutra } }).estado;
  assert.equal(campTat.naveJogador.tripulacao[0].camaraDestinoId, camOutra);
  // Avança nado até chegar em camOutra ou cancela em trânsito com [Y]
  campTat = avancarTickPartidaEmTempoReal(campTat, 6.0);
  const tradY = traduzirInputDomParaComandoUi({ tipoEvento: 'KEYDOWN', code: 'KeyY' }, campTat, projetarViewModelWireframe(campTat), {});
  campTat = executarAcaoCampanhaCompleta(campTat, tradY.acaoCampanhaUi, { persistirEmDisco: false }).estado;
  assert.equal(campTat.naveJogador.tripulacao[0].camaraDestinoId, camOrig0, '[Y] deve ordenar retorno imediato ao posto salvo');

  // Sonda de Sabotagem [H] e Parasita Neural [N]
  campTat = congelarProfundo({
    ...campTat,
    alvoCombate: {
      ...campTat.alvoCombate,
      camadasBarreiraAtivas: 2,
      barreiraBolhasAtual: 2,
    },
  });
  const tradH = traduzirInputDomParaComandoUi({ tipoEvento: 'KEYDOWN', code: 'KeyH' }, campTat, projetarViewModelWireframe(campTat), { salaAlvoAbordagemId: salaAlvoHack });
  const resHack = executarAcaoCampanhaCompleta(campTat, tradH.acaoCampanhaUi, { persistirEmDisco: false });
  assert.equal(resHack.ok, true);
  campTat = resHack.estado;
  assert.equal(campTat.alvoCombate.camadasBarreiraAtivas, 0, 'Sonda Hack [H] deve derrubar até 2 camadas de escudo inimigo');
  assert.equal(campTat.alvoCombate.salasOuOrgaos[0].paralisiaIonSeg, 7, 'Sonda Hack [H] deve ionizar a sala inimiga por 7s');

  const tradN = traduzirInputDomParaComandoUi({ tipoEvento: 'KEYDOWN', code: 'KeyN' }, campTat, projetarViewModelWireframe(campTat), { salaAlvoAbordagemId: salaAlvoHack });
  const resNeuro = executarAcaoCampanhaCompleta(campTat, tradN.acaoCampanhaUi, { persistirEmDisco: false });
  assert.equal(resNeuro.ok, true);
  campTat = resNeuro.estado;
  assert.ok(campTat.alvoCombate.tripulacaoInimiga.some((t) => Number(t.controleNeuralSeg ?? 0) >= 8));
  const hpSomaAntesNeuro = campTat.alvoCombate.tripulacaoInimiga.reduce((s, t) => s + Number(t.hpAtual ?? 0), 0);
  campTat = avancarTickPartidaEmTempoReal(campTat, 1.0);
  const hpSomaPosNeuro = campTat.alvoCombate.tripulacaoInimiga.reduce((s, t) => s + Number(t.hpAtual ?? 0), 0);
  assert.ok(
    hpSomaPosNeuro < hpSomaAntesNeuro,
    'Tripulante inimigo sob Controle Neural [N] deve atacar colegas na mesma sala'
  );

  // 4. Arma Iônica Pura Inimiga (0 dano casco / 0 dano permanente) + Interceptação Automática do Drone de Defesa
  const estIonEDrone = congelarProfundo({
    ...campTat,
    naveJogador: {
      ...campTat.naveJogador,
      hpCascoAtual: 28,
      estadoFisico: '2_TOUCHDOWN',
      camadasBarreiraAtivas: 0,
      subsistemasTaticosSteam: { ...campTat.naveJogador.subsistemasTaticosSteam, droneDefesa: true, recargaDroneDefesaSeg: 0 },
    },
    alvoCombate: {
      ...campTat.alvoCombate,
      salasOuOrgaos: campTat.alvoCombate.salasOuOrgaos.map((s) => ({
        ...s,
        integridade: 2,
        integridadeAtual: 2,
        paralisiaIonSeg: 0,
        danoIonizado: 0,
        cegoTintaSeg: 0,
      })),
      progressoAtaquePrimarioSeg: 20.0,
      progressoAtaqueSecundarioSeg: 20.0,
      armasEquipadasInimigo: [
        {
          id: 'CANHAO_IONICO_PESADO',
          familiaVisual: 'ION',
          danoCasco: 0,
          danoSistema: 0,
          danoIonico: 2,
          duracaoIonSeg: 5.0,
          ignoraEscudo: false,
        },
        {
          id: 'LANCA_TORPEDO_PESADO',
          familiaVisual: 'TORPEDO',
          danoCasco: 3,
          danoSistema: 2,
          danoIonico: 0,
          ignoraEscudo: true,
        },
      ],
    },
  });
  const posIonEDrone = avancarTickPartidaEmTempoReal(estIonEDrone, 0.25);
  assert.equal(
    posIonEDrone.naveJogador.hpCascoAtual,
    28,
    'Canhão Iônico Puro (0 dano casco) + Torpedo interceptado pelo Drone de Defesa devem resultar em 0 dano ao casco!'
  );
  assert.ok(
    posIonEDrone.naveJogador.camaras.some((c) => Number(c.danoIonizado ?? 0) >= 2),
    'Canhão Iônico Puro inimigo deve aplicar 2 barras de dano iônico sem causar dano permanente de casco'
  );
  const eventosIonDrone = posIonEDrone.eventosVisuaisUltimoTick ?? posIonEDrone.meta?.eventosVisuaisUltimoTick ?? [];
  assert.ok(
    eventosIonDrone.some((e) => e.tipo === 'INTERCEPTACAO_DRONE_DEFESA'),
    'Drone de Defesa deve emitir evento visual/foley INTERCEPTACAO_DRONE_DEFESA ao abater torpedo'
  );

  // 5. Seleção de Esquadrão `Shift+Click` e Movimento Simultâneo (`tripulanteIds`)
  const hbsSquad = obterMapaHitboxesNativo(projetarViewModelWireframe(campTat));
  const hbCards = hbsSquad.filter((h) => h.tipo === 'CARD_TRIPULANTE');
  const hbCard0 = hbCards[0];
  const hbCard1 = hbCards[1];
  const hbCamDest = hbsSquad.find((h) => h.tipo === 'CAMARA_BIONAVE' && h.metadados.camaraId === 6);
  const vmSquad = projetarViewModelWireframe(campTat);
  const sel0 = traduzirInputDomParaComandoUi(
    { tipoEvento: 'CLICK', botaoMouse: 0, shiftKey: false, clientX: hbCard0.x + 8, clientY: hbCard0.y + 8, retanguloCanvas: { left: 0, top: 0, width: 960, height: 540 } },
    campTat,
    vmSquad,
    {}
  );
  const selSquad = traduzirInputDomParaComandoUi(
    { tipoEvento: 'CLICK', botaoMouse: 0, shiftKey: true, clientX: hbCard1.x + 8, clientY: hbCard1.y + 8, retanguloCanvas: { left: 0, top: 0, width: 960, height: 540 } },
    campTat,
    vmSquad,
    { tripulanteSelecionadoId: sel0.tripulanteSelecionadoId, tripulantesSelecionadosIds: sel0.tripulantesSelecionadosIds }
  );
  assert.equal(selSquad.tripulantesSelecionadosIds.length, 2, 'Shift+Clique em CARD_TRIPULANTE[1] deve formar esquadrão de 2 tripulantes');
  const movSquad = traduzirInputDomParaComandoUi(
    { tipoEvento: 'CLICK', botaoMouse: 0, shiftKey: false, clientX: hbCamDest.x + 20, clientY: hbCamDest.y + 20, retanguloCanvas: { left: 0, top: 0, width: 960, height: 540 } },
    campTat,
    vmSquad,
    { tripulanteSelecionadoId: selSquad.tripulanteSelecionadoId, tripulantesSelecionadosIds: selSquad.tripulantesSelecionadosIds }
  );
  assert.equal(movSquad.comandoMotor?.payload?.tripulanteIds?.length, 2);
  assert.equal(movSquad.resultadoMotor?.aceito, true);

  // 6. Áudio: Pausa Tática `950 Hz` (`FREQ_CORTE_PAUSA_TATICA_HZ`) + 8 Biomas de Hidrofone (`AMBIENCIA_HIDROFONE` + `AMBIENCIA_SETOR_2..8`)
  const mixPausa = calcularMixagemAdaptativaSteam(
    { faseJogo: 'COMBATE', setorNumero: 5, emCombateHostil: true, pausaTaticaAtiva: true, submerso400Hz: false },
    { volumeMaster: 100, volumeMusica: 80, volumeSfx: 90 }
  );
  assert.equal(mixPausa.frequenciaFiltroHz, FREQ_CORTE_PAUSA_TATICA_HZ);
  assert.equal(mixPausa.frequenciaFiltroHz, 950);
  assert.equal(mixPausa.ambienciaTrilhaId, 'AMBIENCIA_SETOR_5');
  const ambienciasDistintas = new Set();
  for (let s = 1; s <= 8; s += 1) {
    const mAmb = calcularMixagemAdaptativaSteam({ faseJogo: 'MAPA', setorNumero: s }, {});
    ambienciasDistintas.add(mAmb.ambienciaTrilhaId);
  }
  assert.equal(ambienciasDistintas.size, 8, 'Cada um dos 8 setores (S1..S8) deve ativar sua própria ambiência hidroacústica .ogg');
  assert.equal(resolverChaveFoleyEventoVisual({ tipo: 'INTERCEPTACAO_DRONE_DEFESA' }), 'DRONE_DEFESA_LASER');
  assert.equal(resolverAmostraFoleyPorEvento('SONDA_HACK_ION').arquivo, 'foley_hack_probe_ion.ogg');

  // 7. Host Desktop Multiplataforma + FFI C-API Real (`dlopen`/`dlsym` sobre `libsteam_api.dylib` compilado com `clang`)
  const dirHostTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'biofoil-r7-capi-'));
  try {
    const hostLinDiag = resolverHostDesktopNativoMultiplataforma({ plataforma: 'freebsd-inexistente', pastaCache: dirHostTmp });
    assert.equal(hostLinDiag.ok, false);
    assert.equal(hostLinDiag.fontesDisponiveis.macosSwift, true);
    assert.equal(hostLinDiag.fontesDisponiveis.windowsCSharp, true);
    assert.equal(hostLinDiag.fontesDisponiveis.linuxWebKitGtkC, true);
    assert.equal(hostLinDiag.fontesDisponiveis.tauriRust, true);

    // Auditoria estrita dos hosts nativos Windows C# (zero Trident WebBrowser; IPC Steamworks vivo) e Linux C (WebKitUserContentManager IPC 1:1)
    const srcWinCs = fs.readFileSync(path.join(DIRETORIO_RAIZ, 'steam-desktop', 'windows-native', 'BioFoilWindowsHost.cs'), 'utf8');
    assert.equal(/\bnew\s+WebBrowser\b/.test(srcWinCs), false, 'BioFoilWindowsHost.cs jamais deve instanciar o legado IE/Trident System.Windows.Forms.WebBrowser');
    assert.equal(srcWinCs.includes('LoopbackSteamIpcServer'), true);
    assert.equal(srcWinCs.includes('SteamworksWin64FlatApi.SteamAPI_ISteamUserStats_SetAchievement('), true);
    assert.equal(srcWinCs.includes('SteamworksWin64FlatApi.SteamAPI_ISteamRemoteStorage_FileWrite('), true);
    assert.equal(srcWinCs.includes('SteamworksWin64FlatApi.SteamAPI_ISteamFriends_SetRichPresence('), true);

    const srcLinC = fs.readFileSync(path.join(DIRETORIO_RAIZ, 'steam-desktop', 'linux-native', 'biofoil_linux_host.c'), 'utf8');
    assert.equal(srcLinC.includes('webkit_user_content_manager_register_script_message_handler'), true);
    assert.equal(srcLinC.includes('bioFoilSteamDesktop'), true);
    assert.equal(srcLinC.includes('SteamAPI_ISteamUserStats_SetAchievement'), true);
    assert.equal(srcLinC.includes('SteamAPI_ISteamRemoteStorage_FileWrite'), true);
    assert.equal(srcLinC.includes('SteamAPI_ISteamFriends_SetRichPresence'), true);

    // 8. CORTADOR_CASCO_ABISSAL (Hull Beam) causa 2x dano ao casco em salas estruturais (`CABINE`) + Mapa EN sem "VESSEL: VESSEL"
    const estHullBeam = criarEstadoCampanhaCompleta({
      faseInicial: 'COMBATE',
      seedPartida: 'seed-hull-beam-r8',
      edicaoComercialSteam: true,
      configuracoesSteam: { idioma: 'en-US' },
    });
    assert.equal(
      String(estHullBeam.meta?.ultimoAvisoCampanha ?? '').startsWith('HOSTILE CONTACT: '),
      true
    );
    assert.equal(
      /Lancha|Corveta|Arrastão|Submarino|Teuthis|Enguia|Caranguejo|Hidra/i.test(String(estHullBeam.meta?.ultimoAvisoCampanha ?? '')),
      false,
      'Aviso de entrada em combate em en-US não deve vazar nome de arquétipo em português'
    );
    const estMapaEn = criarEstadoCampanhaCompleta({
      faseInicial: 'MAPA',
      seedPartida: 'seed-mapa-en-r8',
      edicaoComercialSteam: true,
      configuracoesSteam: { idioma: 'en-US' },
    });
    const vmMapaEn = projetarViewModelWireframe(estMapaEn);
    for (const noVm of vmMapaEn.mapaSetorial?.nos ?? []) {
      const detIntel = String(noVm.detalheInteligencia ?? '');
      assert.equal(detIntel.includes('VESSEL: VESSEL'), false, `Intel redundante VESSEL: VESSEL em ${noVm.id}`);
      assert.equal(detIntel.includes('BEAST: BEAST'), false, `Intel redundante BEAST: BEAST em ${noVm.id}`);
    }
    const baseAlvoHull = congelarProfundo({
      ...estHullBeam,
      alvoCombate: {
        ...estHullBeam.alvoCombate,
        camadasBarreiraAtivas: 0,
        barreiraBolhasAtual: 0,
        hpCascoAtual: 20,
        salasOuOrgaos: [
          { id: 1, nome: 'CABINE', integridadeAtual: 2, integridadeMax: 2, tripulantes: [] },
          { id: 2, nome: 'MOTOR', integridadeAtual: 2, integridadeMax: 2, tripulantes: [] },
          { id: 3, nome: 'MOTOR', integridadeAtual: 0, integridadeMax: 2, tripulantes: [] },
        ],
      },
    });
    const posCabine = resolverImpactoNoAlvo(
      baseAlvoHull,
      congelarProfundo({
        tipo: 'DISPARO_ARMA',
        salaAlvoId: 1,
        chassiId: 'CORTADOR_CASCO_ABISSAL',
        danoCasco: 1,
        danoSistema: 1,
        bonusDanoCascoPuro: 1,
        municaoCusto: 0,
      })
    );
    assert.equal(posCabine.alvoCombate.hpCascoAtual, 18, 'Hull Beam deve causar 2x dano ao casco (2) em sala estrutural CABINE');
    const posMotorIntacto = resolverImpactoNoAlvo(
      baseAlvoHull,
      congelarProfundo({
        tipo: 'DISPARO_ARMA',
        salaAlvoId: 2,
        chassiId: 'CORTADOR_CASCO_ABISSAL',
        danoCasco: 1,
        danoSistema: 1,
        bonusDanoCascoPuro: 1,
        municaoCusto: 0,
      })
    );
    assert.equal(posMotorIntacto.alvoCombate.hpCascoAtual, 19, 'Hull Beam deve causar 1 dano base ao casco em sistema MOTOR ativo');
    const posMotorDestruido = resolverImpactoNoAlvo(
      baseAlvoHull,
      congelarProfundo({
        tipo: 'DISPARO_ARMA',
        salaAlvoId: 3,
        chassiId: 'CORTADOR_CASCO_ABISSAL',
        danoCasco: 1,
        danoSistema: 1,
        bonusDanoCascoPuro: 1,
        municaoCusto: 0,
      })
    );
    assert.equal(posMotorDestruido.alvoCombate.hpCascoAtual, 18, 'Hull Beam deve causar 2x dano ao casco (2) em sala já esvaziada a 0 barras');

    if (process.platform === 'darwin' && fs.existsSync('/usr/bin/swiftc') && fs.existsSync('/usr/bin/clang')) {
      const hostMac = resolverHostDesktopNativoMultiplataforma({ plataforma: 'darwin', pastaCache: dirHostTmp });
      assert.equal(hostMac.ok, true);
      assert.equal(hostMac.tipoHost, 'JANELA_NATIVA_MACOS_APP');

      const cSrc = path.join(dirHostTmp, 'mock_steam_api.c');
      const dylib = path.join(dirHostTmp, 'libsteam_api.dylib');
      fs.writeFileSync(
        cSrc,
        [
          '#include <stdint.h>',
          '#include <stdbool.h>',
          '#include <string.h>',
          'static int g_stats = 1, g_storage = 2, g_friends = 3;',
          'int32_t SteamAPI_InitFlat(char *err) { return 0; }',
          'void SteamAPI_RunCallbacks(void) {}',
          'void SteamAPI_Shutdown(void) {}',
          'void* SteamAPI_SteamUserStats_v013(void) { return &g_stats; }',
          'void* SteamAPI_SteamRemoteStorage_v016(void) { return &g_storage; }',
          'void* SteamAPI_SteamFriends_v017(void) { return &g_friends; }',
          'bool SteamAPI_ISteamUserStats_SetAchievement(void *s, const char *n) { return s == &g_stats && strcmp(n, "STAT_ACH_CARCACA_1") == 0; }',
          'bool SteamAPI_ISteamUserStats_StoreStats(void *s) { return s == &g_stats; }',
          'bool SteamAPI_ISteamRemoteStorage_FileWrite(void *s, const char *f, const void *d, int32_t n) { return s == &g_storage && n > 0; }',
          'bool SteamAPI_ISteamFriends_SetRichPresence(void *s, const char *k, const char *v) { return s == &g_friends && strlen(v) > 0; }',
        ].join('\n'),
        'utf8'
      );
      const compClang = spawnSync('/usr/bin/clang', ['-dynamiclib', cSrc, '-o', dylib], { encoding: 'utf8' });
      assert.equal(compClang.status, 0, `Falha ao compilar dylib de teste C-API: ${compClang.stderr}`);

      const execSelfTest = spawnSync(hostMac.caminhoExecutavel, ['--self-test-steamworks'], {
        encoding: 'utf8',
        env: { ...process.env, BIOFOIL_STEAM_API_DYLIB: dylib },
      });
      assert.equal(execSelfTest.status, 0);
      const relCapi = JSON.parse(execSelfTest.stdout.trim());
      assert.equal(relCapi.sdkAtivo, true);
      assert.equal(relCapi.conquistaGravadaSdk, true);
      assert.equal(relCapi.cloudGravadoSdk, true);
      assert.equal(relCapi.richPresenceGravadoSdk, true);
      assert.equal(relCapi.callbacksExecutados, 1);
    }
  } finally {
    fs.rmSync(dirHostTmp, { recursive: true, force: true });
  }

  // 7. Regressão R9: VOLTAR_AO_HANGAR & ABANDONAR_EXPEDICAO preservam Edição Steam + idioma EN + Hangar EN ViewModel
  let runEnSteam = criarEstadoCampanhaCompleta({
    seedPartida: 'r9-hangar-preserve',
    idArquitetura: 'COURACA_LIMIAR',
    variante: 'A',
    dificuldade: 'DIFICIL',
    faseInicial: 'MAPA',
    edicaoComercialSteam: true,
    persistirEmDisco: false,
    configuracoesSteam: { idioma: 'en-US', reduzirMovimento: true, volumeMusica: 72 },
  });
  runEnSteam = congelarProfundo({
    ...runEnSteam,
    meta: {
      ...runEnSteam.meta,
      conquistasDesbloqueadas: ['ACH_GLOBAL_PRIMEIRO_SALTO'],
      layoutsTipoBDesbloqueados: ['CARCACA_ALFA_B'],
    },
  });
  const resAbandonar = executarAcaoCampanhaCompleta(
    runEnSteam,
    { tipoAcao: 'ABANDONAR_EXPEDICAO' },
    { persistirEmDisco: false }
  );
  assert.equal(resAbandonar.ok, true);
  assert.equal(resAbandonar.estado.meta.edicaoComercialSteam, true, 'ABANDONAR_EXPEDICAO deve preservar edicaoComercialSteam');
  assert.equal(resAbandonar.estado.meta.configuracoesSteam.idioma, 'en-US', 'ABANDONAR_EXPEDICAO deve preservar idioma en-US');

  const resVoltarHangar = executarAcaoCampanhaCompleta(
    resAbandonar.estado,
    { tipoAcao: 'VOLTAR_AO_HANGAR' },
    { persistirEmDisco: false }
  );
  assert.equal(resVoltarHangar.ok, true);
  assert.equal(resVoltarHangar.estado.meta.edicaoComercialSteam, true, 'VOLTAR_AO_HANGAR deve preservar edicaoComercialSteam');
  assert.equal(resVoltarHangar.estado.meta.dificuldade, 'DIFICIL', 'VOLTAR_AO_HANGAR deve preservar dificuldade');
  assert.equal(resVoltarHangar.estado.meta.configuracoesSteam.idioma, 'en-US', 'VOLTAR_AO_HANGAR deve preservar idioma en-US');
  assert.equal(resVoltarHangar.estado.meta.configuracoesSteam.reduzirMovimento, true);
  assert.equal(resVoltarHangar.estado.meta.configuracoesSteam.volumeMusica, 72);
  assert.ok(resVoltarHangar.estado.meta.conquistasDesbloqueadas.includes('ACH_GLOBAL_PRIMEIRO_SALTO'));
  assert.ok(resVoltarHangar.estado.meta.layoutsTipoBDesbloqueados.includes('CARCACA_ALFA_B'));
  const vmHangarEnR9 = projetarViewModelWireframe(resVoltarHangar.estado);
  assert.equal(vmHangarEnR9.edicaoComercialSteam, true);
  assert.equal(vmHangarEnR9.hangarResumo.naves[0].papel, 'HYDROFOIL BALANCE');
  assert.equal(vmHangarEnR9.hangarResumo.naves[0].requisito, 'UNLOCKED');

  // 8. Regressão R9: Drones Autônomos (Reparo +1 Casco e Assalto 1 Dano), Sincronia Visual IA Difícil e Morte em Touchdown
  let estDronesComb = criarEstadoCampanhaCompleta({
    seedPartida: 'r9-drones-ia-sync',
    idArquitetura: 'COURACA_LIMIAR',
    variante: 'A',
    dificuldade: 'DIFICIL',
    faseInicial: 'COMBATE',
    edicaoComercialSteam: true,
    persistirEmDisco: false,
  });
  estDronesComb = congelarProfundo({
    ...estDronesComb,
    naveJogador: {
      ...estDronesComb.naveJogador,
      hpCascoAtual: 22,
      hpCascoMax: 30,
      camadasBarreiraAtivas: 0,
      estadoFisico: '2_TOUCHDOWN',
      subsistemasTaticosSteam: {
        ...estDronesComb.naveJogador.subsistemasTaticosSteam,
        droneReparo: true,
        droneAtaque: true,
        recargaDroneReparoSeg: 0,
        recargaDroneAtaqueSeg: 0,
      },
    },
    alvoCombate: {
      ...estDronesComb.alvoCombate,
      hpCascoAtual: 14,
      camadasBarreiraAtivas: 0,
      progressoAtaquePrimarioSeg: 99,
    },
  });
  const posTickDrones = avancarTickPartidaEmTempoReal(estDronesComb, 0.25);
  assert.ok(posTickDrones.naveJogador.hpCascoAtual >= 23 || posTickDrones.naveJogador.subsistemasTaticosSteam.recargaDroneReparoSeg > 11, 'Drone de Reparo deve curar +1 casco e entrar em recarga de 12s');
  assert.equal(posTickDrones.alvoCombate.hpCascoAtual, 13, 'Drone de Assalto deve disparar pulso autônomo de 1 dano no casco inimigo');
  assert.ok(posTickDrones.naveJogador.subsistemasTaticosSteam.recargaDroneAtaqueSeg > 8, 'Drone de Assalto deve entrar em recarga de 8.5s');
  const evDispInim = (posTickDrones.meta.eventosVisuaisUltimoTick ?? []).find((e) => e.tipo === 'DISPARO_INIMIGO' && e.subtipo === 'PRIMARIO');
  const evImpJog = (posTickDrones.meta.eventosVisuaisUltimoTick ?? []).find((e) => e.tipo === 'IMPACTO_JOGADOR' || e.tipo === 'DEFLEXAO_BLINDAGEM_JOGADOR');
  assert.ok(evDispInim && evImpJog, 'Inimigo em DIFICIL deve emitir DISPARO_INIMIGO e IMPACTO_JOGADOR');
  assert.equal(evDispInim.camaraAlvoId, evImpJog.camaraId, 'Projétil visual da IA Difícil deve atingir exatamente a mesma câmara danificada');

  // Testa que morte de tripulante no meio da luta bloqueia ACH_COURACA_1_ARIETE_PESADO mesmo vencendo em Touchdown com 2 vivos
  let estMorteTrip = congelarProfundo({
    ...estDronesComb,
    meta: { ...estDronesComb.meta, conquistasDesbloqueadas: [], tripulacaoVivosInicioLutaCount: 3 },
  });
  const tripComMorte = estMorteTrip.naveJogador.tripulacao.map((t, idx) => (idx === 0 ? { ...t, hpAtual: 0.1 } : t));
  estMorteTrip = congelarProfundo({
    ...estMorteTrip,
    naveJogador: {
      ...estMorteTrip.naveJogador,
      tripulacao: tripComMorte,
      camaras: estMorteTrip.naveJogador.camaras.map((c) => (c.id === tripComMorte[0].camaraAtualId ? { ...c, aguaKg: 0, oxigenioDissolvidoPct: 0 } : c)),
    },
  });
  // Simula morte explícita entre início e fim do tick
  const estComBaixa = avancarTickPartidaEmTempoReal(
    congelarProfundo({
      ...estMorteTrip,
      naveJogador: {
        ...estMorteTrip.naveJogador,
        tripulacao: estMorteTrip.naveJogador.tripulacao.map((t, idx) => (idx === 0 ? { ...t, hpAtual: 1 } : t)),
      },
    }),
    0.25
  );
  const estVitoriaComBaixa = congelarProfundo({
    ...estComBaixa,
    naveJogador: {
      ...estComBaixa.naveJogador,
      estadoFisico: '2_TOUCHDOWN',
      tripulacao: estComBaixa.naveJogador.tripulacao.map((t, idx) => (idx === 0 ? { ...t, hpAtual: 0 } : t)),
    },
    alvoCombate: {
      ...estComBaixa.alvoCombate,
      ativo: false,
      hpCascoAtual: 0,
      vitoriaObtida: 'DESTRUICAO_CASCO',
    },
  });
  const estPosVitBaixa = avancarTickCampanhaCompleta(
    estVitoriaComBaixa,
    0.25,
    { persistirEmDisco: false }
  );
  assert.equal(
    (estPosVitBaixa.meta.conquistasDesbloqueadas ?? []).includes('ACH_COURACA_1_ARIETE_PESADO'),
    false,
    'ACH_COURACA_1_ARIETE_PESADO jamais deve disparar quando houve morte de tripulante na luta (vivosFim 2 < vivosInicio 3)'
  );

  // 9. Regressão R9: Rota same-origin `/api/steam-ipc` + CSP loopback p/ Windows Edge/WebView2
  const httpNode = await import('node:http');
  let ultimoBodyIpcRecebido = null;
  const srvIpcMock = httpNode.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      ultimoBodyIpcRecebido = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, recebido: ultimoBodyIpcRecebido.steamApiKey }));
    });
  });
  await new Promise((r) => srvIpcMock.listen(0, '127.0.0.1', r));
  const portaMockIpc = srvIpcMock.address().port;
  const srvJogoIpc = await iniciarServidorClienteWebBiofoil({
    porta: 0,
    host: '127.0.0.1',
    estadoInicial: runEnSteam,
    modoCampanhaCompleta: true,
    persistirEmDisco: false,
  });
  try {
    const respRaizIpc = await fetch(srvJogoIpc.url);
    const cspIpc = String(respRaizIpc.headers.get('content-security-policy') ?? '');
    assert.ok(cspIpc.includes('http://127.0.0.1:*'), 'CSP deve permitir loopback http://127.0.0.1:* para IPC desktop');
    const respProxyIpc = await fetch(`${srvJogoIpc.url}/api/steam-ipc?port=${portaMockIpc}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'desbloquearConquista', id: 'ACH_CARCACA_1_FOIL_PURO', steamApiKey: 'STAT_ACH_CARCACA_1' }),
    });
    assert.equal(respProxyIpc.status, 200);
    const jsonProxyIpc = await respProxyIpc.json();
    assert.equal(jsonProxyIpc.ok, true);
    assert.equal(jsonProxyIpc.recebido, 'STAT_ACH_CARCACA_1');
    assert.equal(ultimoBodyIpcRecebido?.id, 'ACH_CARCACA_1_FOIL_PURO');
  } finally {
    await srvJogoIpc.fechar();
    await new Promise((r) => srvIpcMock.close(r));
  }

  // 10. Regressão Pós-R9: Rajada dupla inimiga (Setor 5) c/ 1 bolha de barreira gera 2 projéteis escalonados ['ESCUDO', 'IMPACTO']
  let estRajadaS5 = criarEstadoCampanhaCompleta({
    persistirEmDisco: false,
    seedPartida: 'rajada-s5-escudo-impacto',
    edicaoComercialSteam: true,
    dificuldade: 'DIFICIL',
    idArquitetura: 'MANTA_VOLT',
    variante: 'B',
    faseInicial: 'COMBATE',
  });
  estRajadaS5 = congelarProfundo({
    ...estRajadaS5,
    meta: { ...estRajadaS5.meta, setorAtual: 5, projeteisAtivos: [] },
    mapaSetorial: { ...(estRajadaS5.mapaSetorial ?? {}), setorNumero: 5 },
    naveJogador: {
      ...estRajadaS5.naveJogador,
      estadoFisico: '1_NO_FOIL',
      evasaoTotalPct: 0,
      camadasBarreiraAtivas: 1,
      progressoRegenBarreiraSeg: 0,
      camaras: estRajadaS5.naveJogador.camaras.map((c) =>
        c.id === 5
          ? { ...c, barrasEnergiaAlocada: 0, energiaAlocada: 0 }
          : c.id === 4
            ? { ...c, barrasIntegridade: Math.max(2, c.barrasIntegridade), barrasEnergiaAlocada: 2, energiaAlocada: 2 }
            : c
      ),
      tripulacao: estRajadaS5.naveJogador.tripulacao.map((t) =>
        t.camaraAtualId === 5 || t.camaraAtualId === 2 ? { ...t, acopladoBulbo: false } : t
      ),
    },
    alvoCombate: {
      ...estRajadaS5.alvoCombate,
      classeAlvo: 'BARCO_HUMANO',
      classeInimigo: 'BARCO_HUMANO',
      armasEquipadasInimigo: [],
      setorNumero: 5,
      progressoAtaquePrimarioSeg: 99,
      progressoAtaqueSecundarioSeg: 0,
    },
  });
  const posRajadaS5 = avancarTickPartidaEmTempoReal(estRajadaS5, 0.25);
  const projsInimigosRajada = (posRajadaS5.meta.projeteisAtivos ?? []).filter((p) => p.origem === 'INIMIGO');
  assert.equal(projsInimigosRajada.length, 2, 'Rajada dupla inimiga no Setor 5 deve emitir 2 projéteis visuais escalonados');
  assert.deepEqual(
    projsInimigosRajada.map((p) => p.resultado),
    ['ESCUDO', 'IMPACTO'],
    '1º tiro absorvido pela última bolha deve ser ESCUDO e 2º tiro que penetra casco deve ser IMPACTO'
  );
  assert.ok(projsInimigosRajada[0].progresso > projsInimigosRajada[1].progresso, 'Projéteis da rajada devem ter progresso escalonado');

  console.log(`[N4] Portão 10.6 R9 verificado: ${catSubs.length} subsistemas táticos (3 drones), ${ambienciasDistintas.size} biomas .ogg, Pausa 950 Hz, Maestria ★★, rajada dupla escalonada, IPC same-origin e FFI C-API Mach-O STAT_ACH real`);
});
