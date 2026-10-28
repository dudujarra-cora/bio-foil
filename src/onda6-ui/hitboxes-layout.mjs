/**
 * ONDA 6 — Mapa Imutável de Hitboxes 960x540, Conversão de Coordenadas 16:9 e Ghost Preview do Termômetro
 * Dono Único (Lei N5): src/onda6-ui/hitboxes-layout.mjs
 *
 * Consome `geometria-layout-960.mjs` como Fonte Única de Verdade (SSOT) de retângulos, garantindo
 * 0 px de divergência entre hitboxes clicáveis, interpolação 60fps e rasterizadores RGBA/Canvas2D.
 */
import { clonarProfundoCongelado } from '../gdd-parser.mjs';
import {
  calcularPesoTotalNave,
  calcularSustentacaoFoil,
} from '../onda1-fisica/tick-hidraulica-foil.mjs';
import { CATALOGO_LOJA_56B } from '../onda5-catalogo-chefe/catalogo-naves-itens.mjs';
import {
  COORDENADAS_GRADE_CAMARAS_16A,
  calcularLayoutPlacaCamaras960,
  calcularRetanguloCardHangar960,
  calcularRetanguloCardLoja960,
  calcularRetanguloVendaPoraoLoja960,
  calcularGeometriaOficina960,
  calcularRetangulosModaisCampanha960,
  calcularRetangulosSalasAlvo960,
} from './geometria-layout-960.mjs';
import { calcularRetangulosCamarasMoldadas960 } from '../onda7-steam/topologias-naves-ab.mjs';
import { obterHitboxesModaisEControlesSteam } from '../onda7-steam/renderizador-modais-steam.mjs';

export { COORDENADAS_GRADE_CAMARAS_16A };

/**
 * Converte coordenadas de tela (ex.: 1920x1080 Full HD com upscale 2x ou janela com letterboxing 16:9)
 * para coordenadas inteiras na grade lógica nativa 960x540 (Seção 8.5.C).
 */
export function converterCoordenadaTelaParaNativa(
  clientX,
  clientY,
  retanguloCanvas = { left: 0, top: 0, width: 1920, height: 1080 }
) {
  const cx = Number(clientX);
  const cy = Number(clientY);
  const left = Number(retanguloCanvas?.left ?? 0);
  const top = Number(retanguloCanvas?.top ?? 0);
  const width = Number(retanguloCanvas?.width ?? 1920);
  const height = Number(retanguloCanvas?.height ?? 1080);

  if (
    !Number.isFinite(cx) ||
    !Number.isFinite(cy) ||
    !Number.isFinite(left) ||
    !Number.isFinite(top) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return clonarProfundoCongelado({
      dentroDoCanvas: false,
      xNativo: 0,
      yNativo: 0,
      escalaHorizontal: 0,
      escalaVertical: 0,
    });
  }

  const razaoAlvo = 960 / 540;
  const razaoAtual = width / height;
  let larguraUtil = width;
  let alturaUtil = height;
  let offsetX = 0;
  let offsetY = 0;

  if (razaoAtual > razaoAlvo + 1e-6) {
    larguraUtil = height * razaoAlvo;
    offsetX = (width - larguraUtil) / 2;
  } else if (razaoAtual < razaoAlvo - 1e-6) {
    alturaUtil = width / razaoAlvo;
    offsetY = (height - alturaUtil) / 2;
  }

  const relX = cx - left - offsetX;
  const relY = cy - top - offsetY;
  const dentroDoCanvas = relX >= 0 && relX < larguraUtil && relY >= 0 && relY < alturaUtil;
  const xNativo = Math.max(0, Math.min(959, Math.floor((relX / larguraUtil) * 960)));
  const yNativo = Math.max(0, Math.min(539, Math.floor((relY / alturaUtil) * 540)));

  return clonarProfundoCongelado({
    dentroDoCanvas,
    xNativo,
    yNativo,
    escalaHorizontal: Number((larguraUtil / 960).toFixed(4)),
    escalaVertical: Number((alturaUtil / 540).toFixed(4)),
  });
}

/**
 * Gera o mapa imutável de hitboxes na grade nativa 960x540 a partir do ViewModel,
 * 100% alinhado ao pixel (0 px de desvio) com as divisórias e placas de cena Hi-Bit.
 */
export function obterMapaHitboxesNativo(viewModel, opcoesDebug = {}) {
  if (!viewModel || typeof viewModel !== 'object') return Object.freeze([]);
  const desalinhamentoMutacao = opcoesDebug.desalinharHitboxesCenaMutacao === true ? 48 : 0;
  const faseJogo = viewModel.faseJogo ?? 'COMBATE';
  const modalAtivo = viewModel.modalCampanhaAtivo ?? null;
  const ehTouchdown = (viewModel.barraSuperior?.estadoFisico ?? '1_NO_FOIL') !== '1_NO_FOIL';
  const classeAlvo = String(viewModel.painelAlvo?.classeAlvo ?? '');
  const ehMonstroAlvo = classeAlvo.includes('MONSTRO');
  const hitboxes = [];

  if (viewModel.modalSteamAtivo === 'OPCOES' || viewModel.modalSteamAtivo === 'CONQUISTAS') {
    return clonarProfundoCongelado(obterHitboxesModaisEControlesSteam(viewModel));
  }

  const usarBotaoAudioSteam = Boolean(viewModel.edicaoComercialSteam || viewModel.configuracoesSteam);

  if (faseJogo === 'INICIO') {
    hitboxes.push({
      idHitbox: 'BTN_ALTERNAR_AUDIO',
      tipo: 'CONTROLE_CAMPANHA',
      x: (usarBotaoAudioSteam ? 884 : 888) + desalinhamentoMutacao,
      y: 10,
      largura: usarBotaoAudioSteam ? 68 : 60,
      altura: 22,
      metadados: { acaoCampanha: 'ALTERNAR_AUDIO_MUDO' },
    });
    const listaNaves = Array.isArray(viewModel.hangarResumo?.naves) && viewModel.hangarResumo.naves.length === 5
      ? viewModel.hangarResumo.naves
      : [
          { id: 'CARCACA_ALFA', desbloqueada: true },
          { id: 'MANTA_VOLT', desbloqueada: false },
          { id: 'COURACA_LIMIAR', desbloqueada: false },
          { id: 'SOMBRA_ABISSAL', desbloqueada: false },
          { id: 'COLMEIA_VIVA', desbloqueada: false },
        ];
    listaNaves.forEach((n, idx) => {
      const retCard = calcularRetanguloCardHangar960(idx, desalinhamentoMutacao);
      hitboxes.push({
        idHitbox: `HANGAR_NAVE_${n.id}`,
        tipo: 'CONTROLE_CAMPANHA',
        x: retCard.x,
        y: retCard.y,
        largura: retCard.largura,
        altura: retCard.altura,
        metadados: {
          acaoCampanha: 'SELECIONAR_CARCACA_HANGAR',
          idArquitetura: n.id,
          desbloqueada: Boolean(n.desbloqueada),
        },
      });
    });
    hitboxes.push({
      idHitbox: 'HANGAR_INICIAR_RUN',
      tipo: 'CONTROLE_CAMPANHA',
      x: 244 + desalinhamentoMutacao,
      y: 444,
      largura: 228,
      altura: 42,
      metadados: { acaoCampanha: 'INICIAR_NOVA_RUN' },
    });
    hitboxes.push({
      idHitbox: 'HANGAR_CONTINUAR_RUN',
      tipo: 'CONTROLE_CAMPANHA',
      x: 488 + desalinhamentoMutacao,
      y: 444,
      largura: 228,
      altura: 42,
      metadados: {
        acaoCampanha: 'CONTINUAR_RUN_SALVA',
        disponivel: Boolean(viewModel.hangarResumo?.temRunSalvaDisponivel),
      },
    });
    if (viewModel.edicaoComercialSteam || viewModel.configuracoesSteam) {
      hitboxes.push(...obterHitboxesModaisEControlesSteam(viewModel));
    }
    return clonarProfundoCongelado(hitboxes);
  }

  if (faseJogo === 'FIM_DE_RUN') {
    hitboxes.push({
      idHitbox: 'BTN_ALTERNAR_AUDIO',
      tipo: 'CONTROLE_CAMPANHA',
      x: (usarBotaoAudioSteam ? 884 : 888) + desalinhamentoMutacao,
      y: 10,
      largura: usarBotaoAudioSteam ? 68 : 60,
      altura: 22,
      metadados: { acaoCampanha: 'ALTERNAR_AUDIO_MUDO' },
    });
    hitboxes.push({
      idHitbox: 'FIM_NOVA_RUN',
      tipo: 'CONTROLE_CAMPANHA',
      x: 244 + desalinhamentoMutacao,
      y: 442,
      largura: 228,
      altura: 42,
      metadados: { acaoCampanha: 'INICIAR_NOVA_RUN' },
    });
    hitboxes.push({
      idHitbox: 'FIM_VOLTAR_HANGAR',
      tipo: 'CONTROLE_CAMPANHA',
      x: 488 + desalinhamentoMutacao,
      y: 442,
      largura: 228,
      altura: 42,
      metadados: { acaoCampanha: 'VOLTAR_AO_HANGAR' },
    });
    return clonarProfundoCongelado(hitboxes);
  }

  hitboxes.push({
    idHitbox: 'BTN_ALTERNAR_AUDIO',
    tipo: 'CONTROLE_CAMPANHA',
    x: 516 + desalinhamentoMutacao,
    y: 5,
    largura: 58,
    altura: 15,
    metadados: { acaoCampanha: 'ALTERNAR_AUDIO_MUDO', audioMutado: Boolean(viewModel.audioMutado) },
  });

  hitboxes.push({
    idHitbox: 'BTN_MERGULHO_TATICO',
    tipo: 'BOTAO_TERMOMETRO',
    x: 6 + desalinhamentoMutacao,
    y: 344,
    largura: 138,
    altura: 26,
    metadados: { acao: 'MERGULHO_TATICO', ativoAtual: Boolean(viewModel.termometroSustentacao?.botaoMergulhoTatico?.ativo) },
  });

  hitboxes.push({
    idHitbox: 'BTN_DRENAR_SEGURO',
    tipo: 'BOTAO_TERMOMETRO',
    x: 6 + desalinhamentoMutacao,
    y: 373,
    largura: 138,
    altura: 24,
    metadados: {
      acao: 'DRENAR_SEGURO',
      travadoTouchdown: Boolean(viewModel.termometroSustentacao?.botaoDrenarTudo?.travadoTouchdown),
      limiarCavitacaoKg: 62.5,
    },
  });

  hitboxes.push({
    idHitbox: 'BTN_DRENAR_TUDO',
    tipo: 'BOTAO_TERMOMETRO',
    x: 6 + desalinhamentoMutacao,
    y: 400,
    largura: 138,
    altura: 24,
    metadados: { acao: 'DRENAR_TUDO', travadoTouchdown: Boolean(viewModel.termometroSustentacao?.botaoDrenarTudo?.travadoTouchdown) },
  });

  const layoutPlacaCamaras = calcularLayoutPlacaCamaras960(ehTouchdown, ehMonstroAlvo);

  if (faseJogo === 'COMBATE' && !modalAtivo) {
    hitboxes.push({
      idHitbox: 'BTN_LANCAR_ABORDAGEM',
      tipo: 'CONTROLE_CAMPANHA',
      x: 162 + desalinhamentoMutacao,
      y: 46,
      largura: 108,
      altura: 20,
      metadados: {
        acaoCampanha: 'ATALHO_ABORDAGEM_UI',
        tuboPronto: Boolean(viewModel.resumoAbordagem?.tuboPronto),
      },
    });
    hitboxes.push({
      idHitbox: 'BTN_MODO_DISPARO',
      tipo: 'CONTROLE_CAMPANHA',
      x: 568 + desalinhamentoMutacao,
      y: 432,
      largura: 78,
      altura: 14,
      metadados: {
        acaoCampanha: 'ALTERNAR_MODO_DISPARO_ARMA',
        modoSalvaGlobal: viewModel.modoSalvaGlobal ?? 'AUTOMATICO',
      },
    });
    hitboxes.push({
      idHitbox: 'BTN_DISPARAR_SALVA',
      tipo: 'CONTROLE_CAMPANHA',
      x: 650 + desalinhamentoMutacao,
      y: 432,
      largura: 78,
      altura: 14,
      metadados: {
        acaoCampanha: 'DISPARAR_SALVA_MANUAL',
      },
    });

    const usarTopologiaMoldadaSteam = Boolean(
      viewModel.edicaoComercialSteam || (viewModel.layoutId && viewModel.layoutId !== 'CARCACA_ALFA_A')
    );
    const idLayoutMoldadoHb =
      viewModel.layoutId ?? `${viewModel.idCarcaca ?? viewModel.idArquitetura ?? 'CARCACA_ALFA'}_A`;
    const mapaMoldadoPorId = usarTopologiaMoldadaSteam
      ? new Map(
          Object.values(
            calcularRetangulosCamarasMoldadas960({
              idArquitetura: idLayoutMoldadoHb,
              ehTouchdown,
              ehMonstroAlvo,
            }).camaras
          ).map((r) => [r.camaraId, { ...r, xValvula: r.valvulaExterna.x, yValvula: r.valvulaExterna.y }])
        )
      : null;

    for (const cam of viewModel.camaras ?? []) {
      const retMoldado = mapaMoldadoPorId ? mapaMoldadoPorId.get(cam.id) : null;
      const coordPadrao = COORDENADAS_GRADE_CAMARAS_16A[cam.id] ?? { coluna: 0, andar: 0 };
      const col = retMoldado ? retMoldado.coluna : Number(cam.coluna ?? coordPadrao.coluna);
      const andar = retMoldado ? retMoldado.andar : Math.max(0, Math.min(3, Number(cam.andar ?? coordPadrao.andar)));
      const xCam = (retMoldado ? retMoldado.x : (col === 0 ? layoutPlacaCamaras.xEsq : layoutPlacaCamaras.xDir)) + desalinhamentoMutacao;
      const yCam = retMoldado ? retMoldado.y : layoutPlacaCamaras.toposY[andar];
      const larguraCam = retMoldado ? retMoldado.largura : layoutPlacaCamaras.larguraCam;
      const alturaCam = retMoldado ? retMoldado.altura : layoutPlacaCamaras.alturasY[andar];
      const xValvula = (retMoldado ? retMoldado.xValvula : (col === 0 ? layoutPlacaCamaras.xValvEsq : layoutPlacaCamaras.xValvDir)) + desalinhamentoMutacao;
      const yValvula = retMoldado ? retMoldado.yValvula : yCam + Math.floor((alturaCam - 20) / 2);

      hitboxes.push({
        idHitbox: `VALVULA_CAMARA_${cam.id}`,
        tipo: 'VALVULA_EXTERNA',
        x: xValvula,
        y: yValvula,
        largura: 16,
        altura: 20,
        metadados: {
          camaraId: cam.id,
          abertaAtual: Boolean(cam.valvulaExternaAberta),
          travadoTouchdown: Boolean(cam.botaoValvulaDesabilitado),
        },
      });

      hitboxes.push({
        idHitbox: `CAMARA_${cam.id}`,
        tipo: 'CAMARA_BIONAVE',
        x: xCam,
        y: yCam,
        largura: larguraCam,
        altura: alturaCam,
        metadados: {
          camaraId: cam.id,
          nome: cam.nome,
          coluna: col,
          andar,
        },
      });
    }
  }

  (viewModel.caixaSistemas ?? []).forEach((sys, idx) => {
    hitboxes.push({
      idHitbox: `SISTEMA_${sys.sigla}`,
      tipo: 'SISTEMA_RODAPE',
      x: 205 + idx * 36 + desalinhamentoMutacao,
      y: 448,
      largura: 32,
      altura: 80,
      metadados: {
        idSistema: sys.id,
        sigla: sys.sigla,
        camaraId: sys.camaraId,
      },
    });
  });

  (viewModel.caixaArmas ?? []).forEach((slot, idx) => {
    hitboxes.push({
      idHitbox: `ARMA_SLOT_${idx}`,
      tipo: 'SLOT_ARMA',
      x: 502 + idx * 58 + desalinhamentoMutacao,
      y: 448,
      largura: 55,
      altura: 80,
      metadados: {
        slotIndex: idx,
        ocupado: Boolean(slot.ocupado),
        chassiId: slot.chassiId,
      },
    });
  });

  const tripulantesUnicos = [];
  for (const cam of viewModel.camaras ?? []) {
    for (const t of cam.tripulantesPresentes ?? []) {
      tripulantesUnicos.push({ ...t, camaraId: cam.id, localizacao: 'NAVE_JOGADOR' });
    }
  }
  for (const tb of viewModel.tripulacaoAbordagemAliada ?? []) {
    if (!tripulantesUnicos.some((x) => x.id === tb.id)) {
      tripulantesUnicos.push({
        ...tb,
        camaraId: null,
        localizacao: 'BORDO_INIMIGO',
      });
    }
  }
  const nCards = Math.max(1, tripulantesUnicos.length);
  const passoCard = nCards <= 3 ? 71 : Math.floor(216 / nCards);
  const larguraCard = passoCard - 3;
  tripulantesUnicos.forEach((trip, idx) => {
    hitboxes.push({
      idHitbox: `TRIPULANTE_CARD_${trip.id}`,
      tipo: 'CARD_TRIPULANTE',
      x: 742 + idx * passoCard + desalinhamentoMutacao,
      y: 448,
      largura: larguraCard,
      altura: 80,
      metadados: {
        tripulanteId: trip.id,
        especie: trip.especie,
        camaraId: trip.camaraId,
        salaInimigaId: trip.salaInimigaId ?? null,
        localizacao: trip.localizacao ?? 'NAVE_JOGADOR',
        aBordoInimigo: (trip.localizacao ?? 'NAVE_JOGADOR') === 'BORDO_INIMIGO',
        hpAtual: trip.hpAtual,
        hpMax: trip.hpMax,
        inflado: Boolean(trip.inflado),
        nivelMaestria: Number(trip.nivelMaestria ?? 0),
      },
    });
  });

  const retModais = calcularRetangulosModaisCampanha960(desalinhamentoMutacao);

  if (modalAtivo === 'SAQUE') {
    hitboxes.push({
      idHitbox: 'SAQUE_CONFIRMAR',
      tipo: 'CONTROLE_CAMPANHA',
      x: retModais.saqueBtnConfirmar.x,
      y: retModais.saqueBtnConfirmar.y,
      largura: retModais.saqueBtnConfirmar.largura,
      altura: retModais.saqueBtnConfirmar.altura,
      metadados: { acaoCampanha: 'CONFIRMAR_SAQUE_POS_COMBATE' },
    });
    return clonarProfundoCongelado(hitboxes);
  }

  if (modalAtivo === 'EVENTO_DESFECHO') {
    hitboxes.push({
      idHitbox: 'EVENTO_DESFECHO_CONFIRMAR',
      tipo: 'CONTROLE_CAMPANHA',
      x: retModais.desfechoEventoBtnConfirmar.x,
      y: retModais.desfechoEventoBtnConfirmar.y,
      largura: retModais.desfechoEventoBtnConfirmar.largura,
      altura: retModais.desfechoEventoBtnConfirmar.altura,
      metadados: { acaoCampanha: 'CONFIRMAR_DESFECHO_EVENTO' },
    });
    return clonarProfundoCongelado(hitboxes);
  }

  if (modalAtivo === 'OFICINA') {
    const geomOf = calcularGeometriaOficina960(desalinhamentoMutacao);
    hitboxes.push({
      idHitbox: 'OFICINA_ABANDONAR_RUN',
      tipo: 'CONTROLE_CAMPANHA',
      x: geomOf.btnAbandonarRun.x,
      y: geomOf.btnAbandonarRun.y,
      largura: geomOf.btnAbandonarRun.largura,
      altura: geomOf.btnAbandonarRun.altura,
      metadados: {
        acaoCampanha: 'ABANDONAR_EXPEDICAO',
        confirmacaoPendente: Boolean(viewModel.oficinaResumo?.confirmarAbandonoPendente),
      },
    });
    hitboxes.push({
      idHitbox: 'OFICINA_MOEDA_REATOR',
      tipo: 'CONTROLE_CAMPANHA',
      x: geomOf.btnMoedaReator.x,
      y: geomOf.btnMoedaReator.y,
      largura: geomOf.btnMoedaReator.largura,
      altura: geomOf.btnMoedaReator.altura,
      metadados: { acaoCampanha: 'ALTERNAR_MOEDA_REATOR' },
    });
    hitboxes.push({
      idHitbox: 'OFICINA_FECHAR',
      tipo: 'CONTROLE_CAMPANHA',
      x: geomOf.btnFechar.x,
      y: geomOf.btnFechar.y,
      largura: geomOf.btnFechar.largura,
      altura: geomOf.btnFechar.altura,
      metadados: { acaoCampanha: 'ABRIR_FECHAR_OFICINA', aberto: false },
    });
    const arvoresOficina = viewModel.oficinaResumo?.arvores ?? [
      { idArvore: 'MASTRO_FOIL' },
      { idArvore: 'ARTILHARIA_DORSAL' },
      { idArvore: 'PLACAS_BLINDAGEM' },
      { idArvore: 'GLANDULA_BARREIRA' },
      { idArvore: 'SIFAO_PROPULSAO' },
      { idArvore: 'BOMBA_BRANQUIAL' },
      { idArvore: 'CORTEX_NAVEGACAO' },
      { idArvore: 'TUBO_PRESSURIZADO' },
      { idArvore: 'GLANDULA_TINTA_FURTIVA' },
      { idArvore: 'CORACAO_BIO_ELETRICO' },
    ];
    arvoresOficina.slice(0, 10).forEach((arv, idx) => {
      const retArv = geomOf.arvoreUpgrade(idx);
      hitboxes.push({
        idHitbox: `OFICINA_UPGRADE_${arv.idArvore}`,
        tipo: 'CONTROLE_CAMPANHA',
        x: retArv.x,
        y: retArv.y,
        largura: retArv.largura,
        altura: retArv.altura,
        metadados: {
          acaoCampanha: 'COMPRAR_UPGRADE_OFICINA',
          idArvore: arv.idArvore,
        },
      });
    });
    for (let k = 0; k < 4; k += 1) {
      const retDes = geomOf.btnArmaDesequipar(k);
      const retRem = geomOf.btnArmaRemoverOrgao(k);
      const slotVm = viewModel.caixaArmas?.[k] ?? null;
      hitboxes.push({
        idHitbox: `OFICINA_ARMA_DESEQUIPAR_${k}`,
        tipo: 'CONTROLE_CAMPANHA',
        x: retDes.x,
        y: retDes.y,
        largura: retDes.largura,
        altura: retDes.altura,
        metadados: {
          acaoCampanha: 'DESEQUIPAR_ARMA_PARA_PORAO',
          slotArmaIndex: k,
          emLoja: faseJogo === 'LOJA',
          chassiId: slotVm?.chassiId ?? null,
          ocupado: Boolean(slotVm?.ocupado),
        },
      });
      hitboxes.push({
        idHitbox: `OFICINA_ARMA_REMOVER_ORGAO_${k}`,
        tipo: 'CONTROLE_CAMPANHA',
        x: retRem.x,
        y: retRem.y,
        largura: retRem.largura,
        altura: retRem.altura,
        metadados: { acaoCampanha: 'REMOVER_ORGAO_PARA_PORAO', slotArmaIndex: k },
      });
    }
    for (let c = 0; c < 4; c += 1) {
      const retEq = geomOf.btnPoraoEquipar(c);
      const retEnx = geomOf.btnPoraoEnxertar(c);
      const retDesc = geomOf.btnPoraoDescartarOuVender(c);
      const itemPoraoVm = viewModel.oficinaResumo?.porao?.[c] ?? null;
      hitboxes.push({
        idHitbox: `OFICINA_PORAO_EQUIPAR_${c}`,
        tipo: 'CONTROLE_CAMPANHA',
        x: retEq.x,
        y: retEq.y,
        largura: retEq.largura,
        altura: retEq.altura,
        metadados: { acaoCampanha: 'EQUIPAR_ARMA_PORAO', indicePorao: c },
      });
      hitboxes.push({
        idHitbox: `OFICINA_PORAO_ENXERTAR_${c}`,
        tipo: 'CONTROLE_CAMPANHA',
        x: retEnx.x,
        y: retEnx.y,
        largura: retEnx.largura,
        altura: retEnx.altura,
        metadados: { acaoCampanha: 'ENXERTAR_ORGAO_PORAO', indicePorao: c },
      });
      hitboxes.push({
        idHitbox: `OFICINA_PORAO_DESCARTAR_${c}`,
        tipo: 'CONTROLE_CAMPANHA',
        x: retDesc.x,
        y: retDesc.y,
        largura: retDesc.largura,
        altura: retDesc.altura,
        metadados: {
          acaoCampanha: 'DESCARTAR_ITEM_PORAO',
          indicePorao: c,
          emLoja: faseJogo === 'LOJA',
          itemId: itemPoraoVm?.id ?? null,
          ocupado: Boolean(itemPoraoVm?.ocupado),
          valorVenda: Number(itemPoraoVm?.valorVenda ?? 0),
          moedaVenda: itemPoraoVm?.moedaVenda ?? 'SUCATA',
        },
      });
    }
    return clonarProfundoCongelado(hitboxes);
  }

  const salasAlvo = viewModel.painelAlvo?.salasInspecionadas ?? [];
  if (faseJogo === 'COMBATE' && viewModel.painelAlvo?.presente !== false && salasAlvo.length > 0) {
    const retangulosAlvo = calcularRetangulosSalasAlvo960(salasAlvo, {
      ehMonstroAlvo,
      ehTouchdown,
      classeAlvo,
      arquetipoAlvoId: viewModel.painelAlvo?.arquetipoAlvoId ?? viewModel.painelAlvo?.arquetipoId ?? '',
      desalinhamentoPx: desalinhamentoMutacao,
      modoVitrineBestiario: Boolean(opcoesDebug.modoVitrineBestiario),
    });
    for (const r of retangulosAlvo) {
      const sala = r.sala;
      hitboxes.push({
        idHitbox: `SALA_ALVO_${sala.salaId}`,
        tipo: 'SALA_ALVO',
        x: r.x,
        y: r.y,
        largura: r.largura,
        altura: r.altura,
        metadados: {
          salaId: sala.salaId,
          nomeSala: sala.nomeSala,
          integridade: Number(sala.integridade ?? sala.barrasIntegridade ?? 1),
          integridadeMax: Number(sala.integridadeMax ?? sala.barrasMax ?? 1),
          submersa: Boolean(sala.submersa),
          canalPermissao: sala.canalPermissao,
          marcadorExplicito: sala.marcadorExplicito,
        },
      });
    }
    if (viewModel.painelAlvo?.ofertaRendicaoAtiva) {
      const temArmasInim = Boolean(viewModel.edicaoComercialSteam && (viewModel.painelAlvo?.armasInimigas ?? []).length > 0);
      hitboxes.push({
        idHitbox: 'BTN_ACEITAR_RENDICAO_INIMIGA',
        tipo: 'CONTROLE_CAMPANHA',
        x: 716 + desalinhamentoMutacao,
        y: temArmasInim ? 148 : 136,
        largura: 240,
        altura: 20,
        metadados: { acaoCampanha: 'ACEITAR_RENDICAO_INIMIGA' },
      });
    }
  } else if (viewModel.faseJogo === 'MAPA') {
    hitboxes.push({
      idHitbox: 'BTN_ABRIR_OFICINA',
      tipo: 'CONTROLE_CAMPANHA',
      x: 700 + desalinhamentoMutacao,
      y: 46,
      largura: 132,
      altura: 22,
      metadados: { acaoCampanha: 'ABRIR_FECHAR_OFICINA', aberto: true },
    });
    if (Array.isArray(viewModel.mapaSetorialResumo?.nos)) {
      const noAtualIdMapa = viewModel.mapaSetorialResumo.noAtualId ?? '';
      for (const no of viewModel.mapaSetorialResumo.nos) {
        const xNo = Math.round(186 + (Number(no.xMn ?? 0) / 120) * 736) - 10 + desalinhamentoMutacao;
        const yNo = Math.round(84 + (Number(no.yMn ?? 30) / 60) * 310) - 10;
        hitboxes.push({
          idHitbox: `NO_MAPA_${no.id}`,
          tipo: 'NO_MAPA',
          x: xNo,
          y: yNo,
          largura: 20,
          altura: 20,
          metadados: {
            noDestinoId: no.id,
            tipoNo: no.tipo,
            ehAtual: Boolean(no.ehAtual ?? no.id === noAtualIdMapa),
            visitado: Boolean(no.visitado),
            alcancavel: Boolean(no.alcancavel),
            tPrazoHoras: no.tPrazoHoras ?? null,
            sosExpirado: Boolean(no.sosExpirado),
            horasRestantesSos: no.horasRestantesSos ?? null,
            engolidoCorporacao: Boolean(no.engolidoCorporacao),
            rotaAtiva: no.rotaAtiva ?? null,
            inteligenciaRevelada: Boolean(no.inteligenciaRevelada),
            subtipoCurto: no.subtipoCurto ?? null,
            detalheInteligencia: no.detalheInteligencia ?? null,
          },
        });
      }
    }
  } else if (viewModel.faseJogo === 'LOJA') {
    hitboxes.push({
      idHitbox: 'LOJA_REPARAR_CASCO',
      tipo: 'ACAO_LOJA',
      x: 162 + desalinhamentoMutacao,
      y: 94,
      largura: 224,
      altura: 26,
      metadados: { itemId: 'REPARO_CASCO_1HP', operacao: 'COMPRAR' },
    });
    hitboxes.push({
      idHitbox: 'LOJA_DIGESTAO_SUC_BIO',
      tipo: 'ACAO_LOJA',
      x: 394 + desalinhamentoMutacao,
      y: 94,
      largura: 120,
      altura: 26,
      metadados: { itemId: 'DIGESTAO_ENZIMATICA', operacao: 'DIGESTAO_ENZIMATICA', moedaOrigem: 'SUCATA' },
    });
    hitboxes.push({
      idHitbox: 'LOJA_DIGESTAO_BIO_SUC',
      tipo: 'ACAO_LOJA',
      x: 518 + desalinhamentoMutacao,
      y: 94,
      largura: 120,
      altura: 26,
      metadados: { itemId: 'DIGESTAO_ENZIMATICA', operacao: 'DIGESTAO_ENZIMATICA', moedaOrigem: 'BIOMASSA' },
    });
    hitboxes.push({
      idHitbox: 'BTN_ABRIR_OFICINA',
      tipo: 'CONTROLE_CAMPANHA',
      x: 644 + desalinhamentoMutacao,
      y: 94,
      largura: 106,
      altura: 26,
      metadados: { acaoCampanha: 'ABRIR_FECHAR_OFICINA', aberto: true },
    });
    hitboxes.push({
      idHitbox: 'BTN_SAIR_LOJA',
      tipo: 'ACAO_LOJA',
      x: 756 + desalinhamentoMutacao,
      y: 94,
      largura: 190,
      altura: 26,
      metadados: { itemId: 'SAIR_DA_LOJA', operacao: 'SAIR_DA_LOJA' },
    });
    const ofertasLoja =
      Array.isArray(viewModel.lojaResumo?.ofertas) && viewModel.lojaResumo.ofertas.length > 0
        ? viewModel.lojaResumo.ofertas
        : CATALOGO_LOJA_56B.filter((i) => i.categoria !== 'REPARO').slice(0, 8);
    ofertasLoja.slice(0, 8).forEach((item, idx) => {
      const retLoja = calcularRetanguloCardLoja960(idx, desalinhamentoMutacao);
      hitboxes.push({
        idHitbox: `LOJA_ITEM_${item.id}`,
        tipo: 'ITEM_LOJA',
        x: retLoja.x,
        y: retLoja.y,
        largura: retLoja.largura,
        altura: retLoja.altura,
        metadados: {
          itemId: item.id,
          nomeCurto: item.nomeCurto ?? item.nome ?? item.id,
          resumoCurto: item.resumoCurto ?? '',
          categoria: item.categoria,
          preco: Number(item.preco ?? item.precoCompra ?? 10),
          valorVenda: Number(item.valorVenda ?? 0),
          pesoKg: Number(item.pesoKg ?? 0),
          moeda: item.moeda ?? 'SUCATA',
        },
      });
    });
    // Botões rápidos de venda de itens arbitrários do Porão na Loja (y = 403..424, zero sobreposição AABB)
    for (let c = 0; c < 4; c += 1) {
      const slotPorao = viewModel.oficinaResumo?.porao?.[c] ?? null;
      if (slotPorao?.ocupado && slotPorao.id && Number(slotPorao.valorVenda ?? 0) > 0) {
        const retVenda = calcularRetanguloVendaPoraoLoja960(c, desalinhamentoMutacao);
        hitboxes.push({
          idHitbox: `LOJA_VENDER_PORAO_${c}`,
          tipo: 'ACAO_LOJA',
          x: retVenda.x,
          y: retVenda.y,
          largura: retVenda.largura,
          altura: retVenda.altura,
          metadados: {
            itemId: slotPorao.id,
            nomeCurto: slotPorao.nome ?? slotPorao.id,
            operacao: 'VENDER',
            indicePorao: c,
            valorVenda: Number(slotPorao.valorVenda),
            moeda: slotPorao.moedaVenda ?? 'SUCATA',
          },
        });
      }
    }
  } else if (viewModel.faseJogo === 'EVENTO') {
    hitboxes.push({
      idHitbox: 'BTN_ABRIR_OFICINA',
      tipo: 'CONTROLE_CAMPANHA',
      x: 804 + desalinhamentoMutacao,
      y: 175,
      largura: 130,
      altura: 18,
      metadados: { acaoCampanha: 'ABRIR_FECHAR_OFICINA', aberto: true },
    });
    const opcoesEv =
      Array.isArray(viewModel.eventoResumo?.opcoes) && viewModel.eventoResumo.opcoes.length > 0
        ? viewModel.eventoResumo.opcoes
        : [
            { codigo: 'A', rotulo: '[A] ABORDAGEM PADRÃO', detalhe: '' },
            { codigo: 'B', rotulo: '[B] OPÇÃO SIMBIÓTICA (AZUL)', detalhe: '', azul: true },
            { codigo: 'C', rotulo: '[C] RECUAR COM CAUTELA', detalhe: '' },
          ];
    opcoesEv.slice(0, 3).forEach((op, idx) => {
      hitboxes.push({
        idHitbox: `EVENTO_OPCAO_${op.codigo}`,
        tipo: 'OPCAO_EVENTO',
        x: 168 + desalinhamentoMutacao,
        y: 242 + idx * 50,
        largura: 774,
        altura: 44,
        metadados: {
          opcao: op.codigo,
          rotulo: op.rotulo ?? `[${op.codigo}]`,
          detalhe: op.detalhe ?? '',
          azul: Boolean(op.azul),
          bloqueada: Boolean(op.bloqueada),
          idEvento: viewModel.eventoResumo?.idEvento ?? 'SOS_01',
          categoriaEvento: viewModel.eventoResumo?.categoria ?? 'SOS',
        },
      });
    });
  }

  if (
    viewModel.tutorialSteam?.ativo ||
    (viewModel.edicaoComercialSteam && faseJogo === 'COMBATE' && !modalAtivo)
  ) {
    hitboxes.unshift(...obterHitboxesModaisEControlesSteam(viewModel));
  }

  return clonarProfundoCongelado(hitboxes);
}

/**
 * Calcula a Pré-Visualização Fantasma (Ghost Preview — Seção 2.1 + GD-2 Limiar de Cavitação 62.5 kg) no Termômetro Vertical
 * ao passar o mouse sobre válvulas externas, botão Dreno Seguro, botão Drenar Tudo ou barra de energia do Sifão.
 */
export function calcularGhostPreviewTermometro(estado, idHitboxHover = null, opcoesDebug = {}) {
  const nave = estado.naveJogador;
  const ehTouchdown = nave.estadoFisico !== '1_NO_FOIL';
  const pesoAtualKg = calcularPesoTotalNave(nave);
  const sustentacaoAtualKg = calcularSustentacaoFoil(nave);
  const aguaAtualKg =
    Math.round((nave.camaras ?? []).reduce((acc, c) => acc + Number(c.aguaKg ?? 0), 0) * 100) / 100;

  const ehValvulaHover = typeof idHitboxHover === 'string' && idHitboxHover.startsWith('VALVULA_CAMARA_');
  const ehHitboxGhost =
    idHitboxHover === 'SISTEMA_SIF' ||
    idHitboxHover === 'BTN_MERGULHO_TATICO' ||
    idHitboxHover === 'BTN_DRENAR_TUDO' ||
    idHitboxHover === 'BTN_DRENAR_SEGURO' ||
    ehValvulaHover;

  if (!ehHitboxGhost) {
    return clonarProfundoCongelado({
      ativo: false,
      alvoHover: null,
      aguaAtualKg,
      aguaProjetadaKg: aguaAtualKg,
      entrariaEmCavitacao: aguaAtualKg < 62.5,
      perdaSustentacaoCavitacaoKg: aguaAtualKg < 62.5 ? Math.round((62.5 - aguaAtualKg) * 2 * 100) / 100 : 0,
      pesoProjetadoKg: pesoAtualKg,
      sustentacaoProjetadaKg: sustentacaoAtualKg,
      causariaQuedaNoMar: false,
      travadoHidrostatico: false,
      rotuloFantasma: null,
    });
  }

  const ehEnGhost = estado?.meta?.configuracoesSteam?.idioma === 'en-US';
  const travadoHidrostatico =
    ehTouchdown &&
    (idHitboxHover === 'BTN_DRENAR_SEGURO' || idHitboxHover === 'BTN_DRENAR_TUDO' || ehValvulaHover);

  if (travadoHidrostatico) {
    return clonarProfundoCongelado({
      ativo: true,
      alvoHover: idHitboxHover,
      aguaAtualKg,
      aguaProjetadaKg: aguaAtualKg,
      entrariaEmCavitacao: aguaAtualKg < 62.5,
      perdaSustentacaoCavitacaoKg: aguaAtualKg < 62.5 ? Math.round((62.5 - aguaAtualKg) * 2 * 100) / 100 : 0,
      pesoProjetadoKg: Math.round(pesoAtualKg * 100) / 100,
      sustentacaoProjetadaKg: Math.round(sustentacaoAtualKg * 100) / 100,
      causariaQuedaNoMar: false,
      travadoHidrostatico: true,
      rotuloFantasma: ehEnGhost ? '[HYDROSTATIC LOCK]' : '[TRAVA HIDROSTÁTICA]',
    });
  }

  if (idHitboxHover === 'BTN_MERGULHO_TATICO') {
    const naveFoilSim = {
      ...nave,
      mergulhoTaticoAtivo: !ehTouchdown,
      estadoFisico: ehTouchdown ? '1_NO_FOIL' : '2_TOUCHDOWN',
    };
    const sustProjM = calcularSustentacaoFoil(naveFoilSim);
    const quedaM = !ehTouchdown || pesoAtualKg > sustProjM;
    return clonarProfundoCongelado({
      ativo: true,
      alvoHover: idHitboxHover,
      aguaAtualKg,
      aguaProjetadaKg: aguaAtualKg,
      entrariaEmCavitacao: aguaAtualKg < 62.5,
      perdaSustentacaoCavitacaoKg: aguaAtualKg < 62.5 ? Math.round((62.5 - aguaAtualKg) * 2 * 100) / 100 : 0,
      pesoProjetadoKg: Math.round(pesoAtualKg * 100) / 100,
      sustentacaoProjetadaKg: Math.round(sustProjM * 100) / 100,
      causariaQuedaNoMar: quedaM,
      travadoHidrostatico: false,
      rotuloFantasma: ehTouchdown
        ? (pesoAtualKg <= sustProjM
            ? (ehEnGhost ? '[SURFACE -> FOIL]' : '[EMERGIR -> FOIL]')
            : (ehEnGhost ? '[TOO HEAVY!]' : '[PESADO DEMAIS!]'))
        : (ehEnGhost ? '[DIVE -> SEA]' : '[MERGULHO -> MAR]'),
    });
  }

  let naveSimulada = nave;
  if (idHitboxHover === 'SISTEMA_SIF') {
    const camSif = nave.camaras.find((c) => c.id === 5);
    const barraAtu = Number(camSif?.barrasEnergiaAlocada ?? camSif?.energiaAlocada ?? 0);
    const novaBarra = Math.max(0, barraAtu - 1);
    naveSimulada = {
      ...nave,
      camaras: nave.camaras.map((c) =>
        c.id === 5 ? { ...c, barrasEnergiaAlocada: novaBarra, energiaAlocada: novaBarra } : c
      ),
    };
  } else if (idHitboxHover === 'BTN_DRENAR_SEGURO') {
    let excedente = Math.max(0, aguaAtualKg - 62.5);
    const camComTripSecoVuln = new Set(
      (nave.tripulacao ?? [])
        .filter((t) => t.localizacao === 'NAVE_JOGADOR' && t.hpAtual > 0 && t.especie !== 'CARANGUEJO')
        .map((t) => t.camaraAtualId)
    );
    const prioridadeIds = [
      ...nave.camaras.filter((c) => !camComTripSecoVuln.has(c.id)).map((c) => c.id),
      ...nave.camaras.filter((c) => camComTripSecoVuln.has(c.id)).map((c) => c.id),
    ];
    const mapaReducao = new Map();
    for (const idC of prioridadeIds) {
      if (excedente <= 0) break;
      const camRef = nave.camaras.find((c) => c.id === idC);
      const disp = Number(camRef?.aguaKg ?? 0);
      const drena = Math.min(disp, excedente);
      mapaReducao.set(idC, drena);
      excedente = Math.round((excedente - drena) * 100) / 100;
    }
    naveSimulada = {
      ...nave,
      camaras: nave.camaras.map((c) => ({
        ...c,
        aguaKg: Math.max(0, Math.round((Number(c.aguaKg ?? 0) - (mapaReducao.get(c.id) ?? 0)) * 100) / 100),
      })),
    };
  } else if (idHitboxHover === 'BTN_DRENAR_TUDO') {
    naveSimulada = {
      ...nave,
      camaras: nave.camaras.map((c) => ({ ...c, aguaKg: 0.0 })),
    };
  } else {
    const idCam = Number(idHitboxHover.replace('VALVULA_CAMARA_', ''));
    naveSimulada = {
      ...nave,
      camaras: nave.camaras.map((c) => (c.id === idCam ? { ...c, aguaKg: 0.0 } : c)),
    };
  }

  const aguaProjetadaKg =
    Math.round((naveSimulada.camaras ?? []).reduce((acc, c) => acc + Number(c.aguaKg ?? 0), 0) * 100) / 100;
  const entrariaEmCavitacao =
    opcoesDebug.ocultarAlertaCavitacaoGhostMutacao === true ? false : aguaProjetadaKg < 62.5;
  const perdaSustentacaoCavitacaoKg = entrariaEmCavitacao
    ? Math.round((62.5 - aguaProjetadaKg) * 2 * 100) / 100
    : 0;
  const pesoProjetadoKg = calcularPesoTotalNave(naveSimulada);
  const sustentacaoProjetadaKg = calcularSustentacaoFoil(naveSimulada);
  const causariaQuedaNoMar = !ehTouchdown && pesoProjetadoKg > sustentacaoProjetadaKg;

  const rotuloFantasma = ehEnGhost
    ? (ehTouchdown
        ? '[IN TOUCHDOWN]'
        : causariaQuedaNoMar && entrariaEmCavitacao
          ? '[CAVITATION -> DROP]'
          : entrariaEmCavitacao
            ? `[CAVITATION -${Math.round(perdaSustentacaoCavitacaoKg)}kg]`
            : causariaQuedaNoMar
              ? '[DROP TO SEA]'
              : idHitboxHover === 'BTN_DRENAR_SEGURO'
                ? '[SAFE >=63kg]'
                : '[STABLE ON FOIL]')
    : (ehTouchdown
        ? '[EM TOUCHDOWN]'
        : causariaQuedaNoMar && entrariaEmCavitacao
          ? '[CAVITAÇÃO -> QUEDA]'
          : entrariaEmCavitacao
            ? `[CAVITAÇÃO -${Math.round(perdaSustentacaoCavitacaoKg)}kg]`
            : causariaQuedaNoMar
              ? '[QUEDA NO MAR]'
              : idHitboxHover === 'BTN_DRENAR_SEGURO'
                ? '[SEGURO >=63kg]'
                : '[ESTÁVEL NO FOIL]');

  return clonarProfundoCongelado({
    ativo: true,
    alvoHover: idHitboxHover,
    aguaAtualKg,
    aguaProjetadaKg,
    entrariaEmCavitacao,
    perdaSustentacaoCavitacaoKg,
    pesoProjetadoKg: Math.round(pesoProjetadoKg * 100) / 100,
    sustentacaoProjetadaKg: Math.round(sustentacaoProjetadaKg * 100) / 100,
    causariaQuedaNoMar,
    travadoHidrostatico: false,
    rotuloFantasma,
  });
}
