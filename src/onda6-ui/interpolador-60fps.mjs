/**
 * ONDA 6 — Motor Puro de Interpolação Sub-Tick e Microinterações a 60 FPS + Geometria de Encaixe 960x540
 * Dono Único (Lei N5): src/onda6-ui/interpolador-60fps.mjs
 *
 * Responsabilidades:
 *  - Módulo 100% puro e isomórfico (0 imports Node.js, 0 structuredClone — roda nativamente em Browser ES Modules,
 *    em contextos `node:vm` restritos e em Node.js);
 *  - `GEOMETRIA_ENCAIXE_CAMARAS_960`: constantes canônicas de encaixe cirúrgico das 8 câmaras e 2 slots dorsais;
 *  - `interpolarEstadoVisual60Fps`: suavização Foil <-> Touchdown, nado contínuo por portais topológicos (esfíncteres,
 *    túneis branquiais e duto ventral em J 5<->6), projéteis/feixes, flashes, números flutuantes sem sobreposição,
 *    screen-shake direcional e tooltips quentes instantâneos (< 16ms).
 */
import {
  congelarProfundoClienteSeguro,
  COORDENADAS_GRADE_CAMARAS_16A,
  calcularLayoutPlacaCamaras960,
  calcularRetangulosSalasAlvo960,
} from './geometria-layout-960.mjs';

function construirHitboxesInterpolacaoFallback960(vm, opcoes = {}) {
  const faseJogo = vm?.faseJogo ?? 'COMBATE';
  const modalAtivo = vm?.modalCampanhaAtivo ?? null;
  if (faseJogo !== 'COMBATE' || modalAtivo) {
    return [];
  }
  const ehTouchdown = (vm?.barraSuperior?.estadoFisico ?? '1_NO_FOIL') !== '1_NO_FOIL';
  const classeAlvo = String(vm?.painelAlvo?.classeAlvo ?? '');
  const ehMonstroAlvo = classeAlvo.includes('MONSTRO');
  const layoutPlacaCamaras = calcularLayoutPlacaCamaras960(ehTouchdown, ehMonstroAlvo);
  const hitboxes = [];

  for (const cam of vm?.camaras ?? []) {
    const coordPadrao = COORDENADAS_GRADE_CAMARAS_16A[cam.id] ?? { coluna: 0, andar: 0 };
    const col = Number(cam.coluna ?? coordPadrao.coluna);
    const andar = Math.max(0, Math.min(3, Number(cam.andar ?? coordPadrao.andar)));
    hitboxes.push({
      idHitbox: `CAMARA_${cam.id}`,
      tipo: 'CAMARA_BIONAVE',
      x: col === 0 ? layoutPlacaCamaras.xEsq : layoutPlacaCamaras.xDir,
      y: layoutPlacaCamaras.toposY[andar],
      largura: layoutPlacaCamaras.larguraCam,
      altura: layoutPlacaCamaras.alturasY[andar],
      metadados: { camaraId: cam.id, coluna: col, andar },
    });
  }

  const salasAlvo = vm?.painelAlvo?.salasInspecionadas ?? [];
  if (vm?.painelAlvo?.presente !== false && salasAlvo.length > 0) {
    const retangulosAlvo = calcularRetangulosSalasAlvo960(salasAlvo, {
      ehMonstroAlvo,
      ehTouchdown,
      classeAlvo,
      modoVitrineBestiario: Boolean(opcoes.modoVitrineBestiario),
    });
    for (const r of retangulosAlvo) {
      hitboxes.push({
        idHitbox: `SALA_ALVO_${r.sala.salaId}`,
        tipo: 'SALA_ALVO',
        x: r.x,
        y: r.y,
        largura: r.largura,
        altura: r.altura,
        metadados: { salaId: r.sala.salaId },
      });
    }
  }
  return hitboxes;
}

/**
 * Geometria canônica de encaixe na grade nativa 960x540 (validada nas bancadas visuais de encaixe e vídeo):
 * - Coluna Esquerda (Câmaras 1, 2, 4, 6): X = 365..441 (76 px úteis)
 * - Coluna Direita (Câmaras 7, 3, 5, 8): X = 463..539 (76 px úteis)
 * - Válvula Esfinctérica Central: X = 441..463 (22 px entre colunas)
 * - Slots Dorsais de Armas: Slot 1 (X=392, Y=42, 92x38 px) e Slot 2 (X=438, Y=76, 104x42 px), sempre acima de Y=140.
 */
export const GEOMETRIA_ENCAIXE_CAMARAS_960 = congelarProfundoClienteSeguro({
  RESOLUCAO_NATIVA: { larguraPx: 960, alturaPx: 540 },
  VALVULA_CENTRAL_X0: 441,
  VALVULA_CENTRAL_X1: 463,
  DIMENSOES_SLOTS_CAMARA: {
    larguraSlotUnicoPx: 44,
    alturaSlotUnicoPx: 28,
    larguraSlotDuploPx: 36,
    alturaSlotDuploPx: 26,
    alturaMaxAndar4Px: 22,
  },
  CAMARAS: {
    1: { camaraId: 1, rotulo: '1 ARTILHARIA', coluna: 'ESQUERDA', andar: 1, x0: 365, y0: 140, x1: 441, y1: 170, larguraUtilPx: 76, alturaUtilPx: 30 },
    7: { camaraId: 7, rotulo: '7 ENXERTO A', coluna: 'DIREITA', andar: 1, x0: 463, y0: 140, x1: 539, y1: 170, larguraUtilPx: 76, alturaUtilPx: 30 },
    2: { camaraId: 2, rotulo: '2 CÓRTEX', coluna: 'ESQUERDA', andar: 2, x0: 365, y0: 187, x1: 441, y1: 217, larguraUtilPx: 76, alturaUtilPx: 30 },
    3: { camaraId: 3, rotulo: '3 BRANQUIAL', coluna: 'DIREITA', andar: 2, x0: 463, y0: 187, x1: 539, y1: 217, larguraUtilPx: 76, alturaUtilPx: 30 },
    4: { camaraId: 4, rotulo: '4 BARREIRA', coluna: 'ESQUERDA', andar: 3, x0: 365, y0: 233, x1: 441, y1: 263, larguraUtilPx: 76, alturaUtilPx: 30 },
    5: { camaraId: 5, rotulo: '5 SIFÃO', coluna: 'DIREITA', andar: 3, x0: 463, y0: 233, x1: 539, y1: 263, larguraUtilPx: 76, alturaUtilPx: 30 },
    6: { camaraId: 6, rotulo: '6 POÇO DA QUILHA', coluna: 'ESQUERDA', andar: 4, x0: 365, y0: 286, x1: 441, y1: 310, larguraUtilPx: 76, alturaUtilPx: 24 },
    8: { camaraId: 8, rotulo: '8 ENXERTO B', coluna: 'DIREITA', andar: 4, x0: 463, y0: 281, x1: 539, y1: 310, larguraUtilPx: 76, alturaUtilPx: 29 },
  },
  SLOTS_DORSAIS: [
    { slotIndex: 0, id: 'SLOT_DORSAL_1', x: 392, y: 42, larguraPx: 92, alturaPx: 38, recuoDisparoPx: -4 },
    { slotIndex: 1, id: 'SLOT_DORSAL_2', x: 438, y: 76, larguraPx: 104, alturaPx: 42, recuoDisparoPx: -4 },
  ],
});

/**
 * Motor Puro de Interpolação Sub-Tick e Microinterações a 60 FPS (dtFrameSeg ~= 0.01667s):
 * - Suaviza transição vertical Foil <-> Touchdown (spring/exponential ease-out sem overshoot desconexo);
 * - Interpola nado contínuo da tripulação entre câmaras;
 * - Avança projéteis voadores, cabos de arpão, feixes de plasma varrendo waypoints, flashes de impacto (140ms), números flutuantes sem sobreposição e screen-shake direcional;
 * - Gerencia estado instantâneo (< 16ms) de hover, active-press (-1px/+1px) e janela quente de tooltips (padrão Emil Kowalski).
 */
export function interpolarEstadoVisual60Fps(estadoVisualAnterior, viewModelAlvo, dtFrameSeg = 1 / 60, opcoes = {}) {
  const vm = viewModelAlvo ?? {};
  const reduzirMovimento = Boolean(opcoes.reduzirMovimento);
  const congelarInterpolacaoMutacao = opcoes.congelarInterpolacaoMutacao === true;
  const dt = congelarInterpolacaoMutacao
    ? 0
    : Math.max(0.001, Math.min(0.1, Number.isFinite(Number(dtFrameSeg)) ? Number(dtFrameSeg) : 1 / 60));

  const ant = estadoVisualAnterior && typeof estadoVisualAnterior === 'object'
    ? estadoVisualAnterior
    : {
        tempoAcumuladoSeg: 0,
        quadrosRenderizados: 0,
        deslocamentoCascoPx: Number(vm.geometria?.deslocamentoVerticalAtualPx ?? 0),
        ultimoIdEventoProcessado: 0,
        intensidadeShake: 0,
        shakeX: 0,
        shakeY: 0,
        posicoesTripulantes: {},
        posicoesInvasores: {},
        portaisDilatados: {},
        projeteisAtivos: [],
        flashesSalas: [],
        textosFlutuantes: [],
        hoverHitboxId: null,
        pressHitboxId: null,
        progressoHover0a1: 0,
        tooltipAberto: false,
        tempoHoverAtualSeg: 0,
        tooltipQuenteAteSeg: 0,
      };

  const tempoAcumuladoSeg = Math.round((Number(ant.tempoAcumuladoSeg ?? 0) + dt) * 100000) / 100000;
  const quadrosRenderizados = Number(ant.quadrosRenderizados ?? 0) + (dt > 0 ? 1 : 0);
  const fpsEstimado = dt > 0 ? Math.round(1 / dt) : 0;

  // 1. Transição suave Foil <-> Touchdown (ease-out exponencial 1 - exp(-11 * dt))
  const alvoDeslocamentoPx = Number(vm.geometria?.deslocamentoVerticalAtualPx ?? 0);
  const fatorCasco = reduzirMovimento ? 1 : 1 - Math.exp(-11 * dt);
  const deslocBruto = Number(ant.deslocamentoCascoPx ?? alvoDeslocamentoPx) +
    (alvoDeslocamentoPx - Number(ant.deslocamentoCascoPx ?? alvoDeslocamentoPx)) * fatorCasco;
  const deslocamentoCascoPx =
    Math.abs(alvoDeslocamentoPx - deslocBruto) < 0.25
      ? alvoDeslocamentoPx
      : Math.round(deslocBruto * 100) / 100;

  // 2. Hitboxes atuais (aceita opcoes.hitboxes no cliente 60 FPS ou calcula via SSOT pura de geometria)
  const hitboxes = Array.isArray(opcoes.hitboxes)
    ? opcoes.hitboxes
    : construirHitboxesInterpolacaoFallback960(vm, opcoes);
  const hbCamarasMap = new Map(
    hitboxes.filter((h) => h.tipo === 'CAMARA_BIONAVE').map((h) => [h.metadados.camaraId, h])
  );
  const hbSalasAlvoMap = new Map(
    hitboxes.filter((h) => h.tipo === 'SALA_ALVO').map((h) => [h.metadados.salaId, h])
  );

  // 3. Travessia Orgânica por Waypoints de Portais Topológicos (Esfíncteres Verticais + Túneis Branquiais + Duto Ventral 5<->6) + Poses 4-Frames Contextuais
  const desativarWaypointsMutacao = opcoes.desativarWaypointsPortal60FpsMutacao === true;
  const VIZINHOS_TOPO_INLINE = {
    1: [2, 7],
    7: [3, 1],
    2: [1, 4, 3],
    3: [7, 5, 2],
    4: [2, 6, 5],
    5: [3, 8, 4, 6],
    6: [4, 8, 5],
    8: [5, 6],
  };
  const resolverPrimeiroSaltoInline = (idOrig, idDest) => {
    if (!idOrig || !idDest || idOrig === idDest) return null;
    if ((VIZINHOS_TOPO_INLINE[idOrig] || []).includes(idDest)) return idDest;
    const fila = [[idOrig]];
    const vis = new Set([idOrig]);
    while (fila.length > 0) {
      const camPath = fila.shift();
      const ult = camPath[camPath.length - 1];
      for (const vz of VIZINHOS_TOPO_INLINE[ult] || []) {
        if (vz === idDest) return camPath[1] ?? vz;
        if (!vis.has(vz)) {
          vis.add(vz);
          fila.push([...camPath, vz]);
        }
      }
    }
    return idDest;
  };
  const pontoNoCaminhoPortal = (hbOrig, hbProx, idOrig, idProx, t01) => {
    const ox = hbOrig.x + Math.floor(hbOrig.largura / 2);
    const oy = hbOrig.y + 11 + Math.floor((hbOrig.altura - 13) / 2);
    const dx = hbProx.x + Math.floor(hbProx.largura / 2);
    const dy = hbProx.y + 11 + Math.floor((hbProx.altura - 13) / 2);
    const t = Math.max(0, Math.min(1, t01));
    const menor = Math.min(idOrig, idProx);
    const maior = Math.max(idOrig, idProx);
    const chavePortal = `${menor}-${maior}`;
    if (desativarWaypointsMutacao) {
      return {
        x: ox + (dx - ox) * t,
        y: oy + (dy - oy) * t,
        chavePortal,
        ehDutoVentral: false,
      };
    }
    // Caso 1: Duto Hidráulico Ventral em sifão curvo J (6 <-> calha ventral do Piso 4 <-> coluna vertebral central <-> 5 SIFÃO, sem cruzar a câmara 8!)
    if (menor === 5 && maior === 6) {
      const hb6 = idOrig === 6 ? hbOrig : hbProx;
      const hb5 = idOrig === 5 ? hbOrig : hbProx;
      const x6 = hb6.x + Math.floor(hb6.largura * 0.52);
      const y6 = hb6.y + 12 + Math.floor((hb6.altura - 14) / 2);
      const x5 = hb5.x + Math.floor(hb5.largura * 0.48);
      const y5 = hb5.y + 12 + Math.floor((hb5.altura - 14) / 2);
      const xBoca6 = hb6.x + Math.floor(hb6.largura * 0.56) + 8;
      const yBase6 = hb6.y + hb6.altura - 1;
      const xEspinha = Math.round((hb6.x + hb6.largura + hb5.x) / 2);
      const yOrificio5 = hb5.y + hb5.altura - 6;
      const pts6Para5 = [
        [x6, y6],
        [xBoca6, yBase6 - 1],
        [xBoca6 + 2, yBase6 + 4],
        [Math.round((xBoca6 + xEspinha) / 2), yBase6 + 8],
        [xEspinha, yBase6 + 3],
        [xEspinha, hb6.y + 8],
        [xEspinha, yOrificio5],
        [hb5.x + 4, yOrificio5],
        [x5, y5],
      ];
      const pts = idOrig === 6 ? pts6Para5 : [...pts6Para5].reverse();
      const segs = pts.length - 1;
      const posSeg = Math.min(segs - 1e-6, t * segs);
      const iSeg = Math.floor(posSeg);
      const uSeg = posSeg - iSeg;
      const pA = pts[iSeg];
      const pB = pts[iSeg + 1];
      return {
        x: pA[0] + (pB[0] - pA[0]) * uSeg,
        y: pA[1] + (pB[1] - pA[1]) * uSeg,
        chavePortal,
        ehDutoVentral: true,
        noTuboVentral: t >= 0.14 && t <= 0.86,
      };
    }
    // Caso 2: Túnel Branquial Horizontal na espinha dorsal central (1<->7, 2<->3, 4<->5, 6<->8)
    const mesmaColuna = Math.abs(ox - dx) < 24;
    if (!mesmaColuna) {
      const hbEsq = ox < dx ? hbOrig : hbProx;
      const hbDir = ox < dx ? hbProx : hbOrig;
      const xPonte = (hbEsq.x + hbEsq.largura + hbDir.x) / 2;
      const yPonte = (oy + dy) / 2;
      if (t <= 0.5) {
        const u = t / 0.5;
        return { x: ox + (xPonte - ox) * u, y: oy + (yPonte - oy) * u, chavePortal, ehDutoVentral: false };
      }
      const u = (t - 0.5) / 0.5;
      return { x: xPonte + (dx - xPonte) * u, y: yPonte + (dy - yPonte) * u, chavePortal, ehDutoVentral: false };
    }
    // Caso 3: Esfíncter Vertical entre andares (1<->2, 2<->4, 4<->6, 7<->3, 3<->5, 5<->8)
    const cxCol = (ox + dx) / 2;
    const yEsfincter = oy < dy
      ? (hbOrig.y + hbOrig.altura + hbProx.y) / 2
      : (hbProx.y + hbProx.altura + hbOrig.y) / 2;
    if (t <= 0.5) {
      const u = t / 0.5;
      return { x: ox + (cxCol - ox) * u, y: oy + (yEsfincter - oy) * u, chavePortal, ehDutoVentral: false };
    }
    const u = (t - 0.5) / 0.5;
    return { x: cxCol + (dx - cxCol) * u, y: yEsfincter + (dy - yEsfincter) * u, chavePortal, ehDutoVentral: false };
  };

  const alvosDilatacao = {};
  const marcarDilatacaoPortal = (chave, valor) => {
    if (!chave) return;
    alvosDilatacao[chave] = Math.max(Number(alvosDilatacao[chave] ?? 0), Math.max(0, Math.min(1, valor)));
  };

  const resolverPose4FramesAliado = (tr, nadando, camAguaKg) => {
    const esp = tr.especie;
    const noSeco = Number(camAguaKg ?? 12.5) <= 0 && esp !== 'CARANGUEJO';
    const freq = noSeco ? 3.2 : 6.0;
    const fase = Math.floor(tempoAcumuladoSeg * freq + (tr.id ? tr.id.charCodeAt(tr.id.length - 1) * 0.3 : 0));
    if (esp === 'BAIACU') {
      if (tr.inflado) return 3;
      if (tr.emCombate) return (fase & 1) === 0 ? 2 : 3;
      if (nadando) return (fase & 1) === 0 ? 1 : 0;
      return 0;
    }
    if (esp === 'POLVO') {
      if (tr.emCombate) return (fase & 1) === 0 ? 3 : 0;
      if (nadando) return (fase & 1) === 0 ? 1 : (noSeco ? 2 : 0);
      if (tr.reparando) return (fase % 3) === 0 ? 0 : 2;
      return 0;
    }
    if (esp === 'ARRAIA') {
      if (tr.emCombate) return (fase % 3) === 0 ? 1 : 3;
      if (nadando) return [1, 0, 2, 0][fase & 3];
      if (tr.acopladoBulbo && (Math.floor(tempoAcumuladoSeg * 2.5) % 5) === 4) return 3;
      return 0;
    }
    // CARANGUEJO
    if (tr.emCombate) return (fase & 1) === 0 ? 2 : 3;
    if (nadando) return (fase & 1) === 0 ? 1 : 0;
    return 0;
  };

  const resolverPose4FramesInvasor = (inv, nadando) => {
    const fase = Math.floor(tempoAcumuladoSeg * 5.5 + (inv.id ? inv.id.charCodeAt(inv.id.length - 1) * 0.4 : 0));
    if (inv.emCombate || inv.sabotando) {
      return (fase & 1) === 0 ? 2 : 3;
    }
    if (nadando) {
      return (fase & 1) === 0 ? 1 : 0;
    }
    return 0;
  };

  const posicoesTripulantes = {};
  const posicoesInvasores = {};
  const fatorNado = reduzirMovimento ? 1 : 1 - Math.exp(-12.0 * dt);
  for (const cam of vm.camaras ?? []) {
    const hbCam = hbCamarasMap.get(cam.id);
    const baseX = hbCam ? hbCam.x + Math.floor(hbCam.largura / 2) : 400 + cam.coluna * 96;
    const baseY = hbCam ? hbCam.y + 11 + Math.floor((hbCam.altura - 13) / 2) : 148 + cam.andar * 46;
    const temInvasorNaSala = (cam.invasoresPresentes ?? []).length > 0;

    (cam.tripulantesPresentes ?? []).forEach((tr, idxSlot) => {
      const qtdEstac = (cam.tripulantesPresentes?.length ?? 0) + (cam.invasoresPresentes?.length ?? 0);
      const offsetSlot = temInvasorNaSala
        ? -13 + idxSlot * 8
        : qtdEstac > 1
          ? (idxSlot === 0 ? -14 : 14)
          : 0;
      let alvoX = baseX + offsetSlot;
      let alvoY = baseY;
      const posAnt = ant.posicoesTripulantes?.[tr.id];
      let progNado01 = 0;
      let chavePortalAtivo = null;
      let noDutoVentral = false;
      const proxId = tr.proximaCamaraId ?? resolverPrimeiroSaltoInline(cam.id, tr.camaraDestinoId);

      if (tr.ultimoPortalAtravessado) {
        marcarDilatacaoPortal(tr.ultimoPortalAtravessado, 0.35);
      }

      if (proxId && hbCam && hbCamarasMap.has(proxId)) {
        const hbProx = hbCamarasMap.get(proxId);
        const VEL_ESP_INLINE = { POLVO: 1.2, ARRAIA: 1.0, BAIACU: 0.75, CARANGUEJO: 1.0 };
        const velBaseEsp = VEL_ESP_INLINE[tr.especie] ?? 1.0;
        const multSecoEsp = Number(cam.aguaKg ?? 12.5) <= 0 && tr.especie !== 'CARANGUEJO' ? 0.5 : 1.0;
        const durSaltoEst = 1.5 / (velBaseEsp * multSecoEsp);
        const progServ01 = Number(tr.progressoSalto0a1 ?? 0) > 0
          ? Math.max(0, Math.min(1, Number(tr.progressoSalto0a1)))
          : Math.max(0, Math.min(1, Number(tr.progressoNadoSeg ?? 0) / durSaltoEst));
        const mesmoSalto = posAnt && posAnt.camaraId === cam.id && posAnt.proximaCamaraId === proxId;
        const progExtrap01 = mesmoSalto
          ? Math.min(0.97, Math.max(progServ01, Number(posAnt.progNado01 ?? progServ01) + dt / durSaltoEst))
          : progServ01;
        progNado01 = reduzirMovimento ? progServ01 : progExtrap01;
        const pt = pontoNoCaminhoPortal(hbCam, hbProx, cam.id, proxId, progNado01);
        alvoX = pt.x;
        alvoY = pt.y;
        chavePortalAtivo = pt.chavePortal;
        noDutoVentral = pt.ehDutoVentral;
        const abertura = Math.sin(Math.PI * Math.max(0.08, Math.min(0.95, progNado01)));
        marcarDilatacaoPortal(chavePortalAtivo, abertura);
      }

      const distTransicaoTr = posAnt ? Math.hypot(alvoX - posAnt.x, alvoY - posAnt.y) : 999;
      const usarSnapDiretoTr = !posAnt || reduzirMovimento || distTransicaoTr > 56;
      const novoX = usarSnapDiretoTr ? alvoX : posAnt.x + (alvoX - posAnt.x) * fatorNado;
      const novoY = usarSnapDiretoTr ? alvoY : posAnt.y + (alvoY - posAnt.y) * fatorNado;
      const distAlvo = Math.hypot(alvoX - novoX, alvoY - novoY);
      const nadando = distAlvo > 1.2 || Boolean(proxId);
      const espelharX = nadando
        ? (alvoX < novoX - 0.35 ? true : alvoX > novoX + 0.35 ? false : Boolean(posAnt?.espelharX))
        : temInvasorNaSala
          ? false
          : Boolean(posAnt?.espelharX);
      const poseIndice4F = resolverPose4FramesAliado(tr, nadando, cam.aguaKg);

      posicoesTripulantes[tr.id] = {
        x: Math.round(novoX * 100) / 100,
        y: Math.round(novoY * 100) / 100,
        alvoX: Math.round(alvoX * 100) / 100,
        alvoY: Math.round(alvoY * 100) / 100,
        camaraId: cam.id,
        camaraDestinoId: tr.camaraDestinoId ?? null,
        proximaCamaraId: proxId ?? null,
        portalAtivo: chavePortalAtivo,
        noDutoVentral,
        progNado01: Math.round(progNado01 * 1000) / 1000,
        especie: tr.especie,
        inflado: Boolean(tr.inflado),
        nadando,
        rastejandoNoSeco: Boolean(tr.rastejandoNoSeco),
        reparando: Boolean(tr.reparando),
        emCombate: Boolean(tr.emCombate),
        interceptadoPorInvasor: Boolean(tr.interceptadoPorInvasor),
        espelharX,
        poseIndice4F,
      };
    });

    (cam.invasoresPresentes ?? []).forEach((inv, idxInv) => {
      const temAliadoDefendendo = (cam.tripulantesPresentes ?? []).length > 0;
      const offsetInv = temAliadoDefendendo ? 13 - idxInv * 8 : (cam.invasoresPresentes.length > 1 ? (idxInv === 0 ? -12 : 12) : 0);
      let alvoX = baseX + offsetInv;
      let alvoY = baseY;
      const posAnt = ant.posicoesInvasores?.[inv.id];
      let progMarcha01 = 0;
      let chavePortalInv = null;
      let noDutoVentral = false;
      const proxInvId = inv.proximaCamaraId ?? resolverPrimeiroSaltoInline(cam.id, inv.camaraDestinoId);

      if (proxInvId && hbCam && hbCamarasMap.has(proxInvId)) {
        const hbProx = hbCamarasMap.get(proxInvId);
        const multAguaInv = (inv.especie ?? 'MARINHEIRO') === 'MARINHEIRO' && Number(cam.aguaKg ?? 12.5) > 0 ? 0.7 : 1.0;
        const durInv = 1.5 / multAguaInv;
        const progServ01 = Number(inv.progressoSalto0a1 ?? 0) > 0
          ? Math.max(0, Math.min(1, Number(inv.progressoSalto0a1)))
          : Math.max(0, Math.min(1, Number(inv.progressoMarchaSeg ?? 0) / durInv));
        const mesmoSalto = posAnt && posAnt.camaraId === cam.id && posAnt.proximaCamaraId === proxInvId;
        const progExtrap01 = mesmoSalto
          ? Math.min(0.97, Math.max(progServ01, Number(posAnt.progMarcha01 ?? progServ01) + dt / durInv))
          : progServ01;
        progMarcha01 = reduzirMovimento ? progServ01 : progExtrap01;
        const pt = pontoNoCaminhoPortal(hbCam, hbProx, cam.id, proxInvId, progMarcha01);
        alvoX = pt.x;
        alvoY = pt.y;
        chavePortalInv = pt.chavePortal;
        noDutoVentral = pt.ehDutoVentral;
        marcarDilatacaoPortal(chavePortalInv, Math.sin(Math.PI * Math.max(0.08, Math.min(0.95, progMarcha01))));
      }

      const distTransicaoInv = posAnt ? Math.hypot(alvoX - posAnt.x, alvoY - posAnt.y) : 999;
      const usarSnapDiretoInv = !posAnt || reduzirMovimento || distTransicaoInv > 56;
      const novoX = usarSnapDiretoInv ? alvoX : posAnt.x + (alvoX - posAnt.x) * fatorNado;
      const novoY = usarSnapDiretoInv ? alvoY : posAnt.y + (alvoY - posAnt.y) * fatorNado;
      const distAlvo = Math.hypot(alvoX - novoX, alvoY - novoY);
      const nadando = distAlvo > 1.2 || Boolean(proxInvId);
      const espelharX = nadando
        ? (alvoX < novoX - 0.35 ? true : alvoX > novoX + 0.35 ? false : Boolean(posAnt?.espelharX))
        : temAliadoDefendendo
          ? true
          : false;
      const poseIndice4F = resolverPose4FramesInvasor(inv, nadando);

      posicoesInvasores[inv.id] = {
        x: Math.round(novoX * 100) / 100,
        y: Math.round(novoY * 100) / 100,
        alvoX: Math.round(alvoX * 100) / 100,
        alvoY: Math.round(alvoY * 100) / 100,
        camaraId: cam.id,
        proximaCamaraId: proxInvId ?? null,
        portalAtivo: chavePortalInv,
        noDutoVentral,
        progMarcha01: Math.round(progMarcha01 * 1000) / 1000,
        especie: inv.especie ?? 'MARINHEIRO',
        nadando,
        emCombate: Boolean(inv.emCombate),
        sabotando: Boolean(inv.sabotando),
        espelharX,
        poseIndice4F,
      };
    });
  }

  const portaisDilatados = {};
  const todasChavesPortal = ['1-2', '2-4', '4-6', '3-7', '3-5', '5-8', '1-7', '2-3', '4-5', '6-8', '5-6'];
  const fatorPortal = reduzirMovimento ? 1 : 1 - Math.exp(-10 * dt);
  for (const chP of todasChavesPortal) {
    const antVal = Number(ant.portaisDilatados?.[chP] ?? 0);
    const alvoVal = Number(alvosDilatacao[chP] ?? 0);
    const novoVal = antVal + (alvoVal - antVal) * fatorPortal;
    portaisDilatados[chP] = novoVal < 0.02 ? 0 : Math.round(novoVal * 1000) / 1000;
  }

  // 4. Ingestão de novos eventos visuais do motor e avanço a 60 FPS de projéteis, feixes, flashes, textos e shake
  let ultimoIdEventoProcessado = Number(ant.ultimoIdEventoProcessado ?? 0);
  let intensidadeShake = Math.max(0, Number(ant.intensidadeShake ?? 0) * Math.exp(-9 * dt));
  const projeteisAtivos = [];
  const flashesSalas = [];
  const textosFlutuantes = [];

  for (const p of ant.projeteisAtivos ?? []) {
    const novoProg = Number(p.progresso0a1 ?? 0) + dt / Math.max(0.08, Number(p.duracaoSeg ?? 0.28));
    if (novoProg < 1) {
      let xDestAtual = p.xDestino;
      let yDestAtual = p.yDestino;
      if (p.ehFeixe && Array.isArray(p.waypointsSalas) && p.waypointsSalas.length >= 2) {
        const segTotal = p.waypointsSalas.length - 1;
        const posSeg = Math.min(segTotal - 0.0001, Math.max(0, novoProg * segTotal));
        const idxSeg = Math.floor(posSeg);
        const fracSeg = posSeg - idxSeg;
        const wpA = p.waypointsSalas[idxSeg];
        const wpB = p.waypointsSalas[idxSeg + 1];
        xDestAtual = wpA.x + (wpB.x - wpA.x) * fracSeg;
        yDestAtual = wpA.y + (wpB.y - wpA.y) * fracSeg;
      }
      projeteisAtivos.push({
        ...p,
        progresso0a1: Math.round(novoProg * 1000) / 1000,
        xAtual: Math.round((p.ehFeixe ? xDestAtual : p.xOrigem + (p.xDestino - p.xOrigem) * novoProg) * 10) / 10,
        yAtual: Math.round((p.ehFeixe ? yDestAtual : p.yOrigem + (p.yDestino - p.yOrigem) * novoProg) * 10) / 10,
      });
    }
  }
  for (const fl of ant.flashesSalas ?? []) {
    const rest = Math.round((Number(fl.restanteSeg ?? 0) - dt) * 1000) / 1000;
    if (rest > 0) flashesSalas.push({ ...fl, restanteSeg: rest });
  }
  for (const tf of ant.textosFlutuantes ?? []) {
    const rest = Math.round((Number(tf.restanteSeg ?? 0) - dt) * 1000) / 1000;
    if (rest > 0) {
      textosFlutuantes.push({
        ...tf,
        restanteSeg: rest,
        y: Math.max(46, Math.round((Number(tf.y) - 18 * dt) * 10) / 10),
      });
    }
  }

  const empurrarTextoSemColisao = (novoTf) => {
    const txtStr = String(novoTf.texto ?? '');
    const largPx = txtStr.length * 7 + 8;
    let x = Math.max(162, Math.min(950 - largPx, Math.round(novoTf.x)));
    let y = Math.max(48, Math.min(410, Math.round(novoTf.y)));
    for (let tent = 0; tent < 5; tent += 1) {
      const colide = textosFlutuantes.some(
        (ex) => Math.abs(ex.y - y) < 14 && x < ex.x + ex.texto.length * 7 + 10 && x + largPx > ex.x - 4
      );
      if (!colide) break;
      y = Math.max(48, y - 15);
    }
    textosFlutuantes.push({ ...novoTf, texto: txtStr, x, y });
  };

  const classeAlvoCena = String(vm.painelAlvo?.classeAlvo ?? '');
  const ehMonstroCena = classeAlvoCena.includes('MONSTRO');
  const ehChefeCena = classeAlvoCena === 'CHEFE_DRAGA' || Number(vm.painelAlvo?.faseChefe ?? 0) >= 1;
  const idCarcCena = String(vm.idCarcaca ?? vm.idArquitetura ?? 'CARCACA_ALFA');
  const obterBocaDorsalCena = (slotIdx) => {
    const ehTdBoca = alvoDeslocamentoPx > 10;
    const dyBase = ehTdBoca ? 10 : ehMonstroCena ? -12 : 0;
    const dxTd = ehTdBoca ? -24 : 0;
    const tabBocas = {
      CARCACA_ALFA: [[569, 95], [482, 58]],
      MANTA_VOLT: [[540, 100], [474, 74]],
      COURACA_LIMIAR: [[494, 86], [557, 120]],
      SOMBRA_ABISSAL: [[558, 108], [485, 85]],
      COLMEIA_VIVA: [[568, 100], [472, 58]],
    };
    const par = tabBocas[idCarcCena] ?? tabBocas.CARCACA_ALFA;
    const [bx, by] = par[slotIdx === 1 ? 1 : 0];
    return [bx + dxTd, by + dyBase];
  };
  const ancorasOrgaosMonstro = {
    1: [754, 244],
    2: [758, 303],
    3: [760, 358],
    4: [770, 398],
  };
  const novosEventos = (vm.eventosVisuaisUltimoTick ?? []).filter(
    (ev) => Number(ev.idEvento ?? 0) > ultimoIdEventoProcessado
  );
  for (const ev of novosEventos) {
    ultimoIdEventoProcessado = Math.max(ultimoIdEventoProcessado, Number(ev.idEvento ?? 0));
    const hbAlvo = hbSalasAlvoMap.get(ev.salaAlvoId ?? ev.salasFeixe?.[0]) ?? hitboxes.find((h) => h.tipo === 'SALA_ALVO');
    const ancMonstro = hbAlvo ? ancorasOrgaosMonstro[hbAlvo.metadados?.salaId] : null;
    const destAlvoX = hbAlvo
      ? (ehMonstroCena ? (ancMonstro ? ancMonstro[0] : hbAlvo.x + hbAlvo.largura - 8) : ehChefeCena ? hbAlvo.x - 1 : Math.round(hbAlvo.x + hbAlvo.largura * 0.62))
      : 760;
    const destAlvoY = hbAlvo
      ? (ehMonstroCena ? (ancMonstro ? ancMonstro[1] : Math.round(hbAlvo.y + hbAlvo.altura * 0.56)) : ehChefeCena ? hbAlvo.y + Math.round(hbAlvo.altura * 0.5) : hbAlvo.y + hbAlvo.altura - 10)
      : 300;
    const slotRealEv = Number.isInteger(ev.slotIndex)
      ? ev.slotIndex
      : Math.max(0, (vm.caixaArmas ?? []).findIndex((s) => s.ocupado && (s.chassiId === ev.chassiId || s.salaAlvoId === ev.salaAlvoId)));
    const [origArmaX, origArmaY] = obterBocaDorsalCena(slotRealEv);

    if (ev.tipo === 'DISPARO_JOGADOR' || ev.tipo === 'FEIXE_JOGADOR') {
      const waypointsSalas = ev.tipo === 'FEIXE_JOGADOR' && Array.isArray(ev.salasFeixe)
        ? ev.salasFeixe
            .map((idS) => hbSalasAlvoMap.get(idS))
            .filter(Boolean)
            .map((h) => {
              const ancW = ancorasOrgaosMonstro[h.metadados?.salaId];
              return {
                x: ehMonstroCena ? (ancW ? ancW[0] : h.x + h.largura - 8) : Math.round(h.x + h.largura * 0.62),
                y: ehMonstroCena ? (ancW ? ancW[1] : Math.round(h.y + h.altura * 0.52)) : h.y + h.altura - 10,
              };
            })
        : [];
      if (ev.tipo === 'FEIXE_JOGADOR' && waypointsSalas.length === 1) {
        if (ehMonstroCena) {
          waypointsSalas.unshift({ x: waypointsSalas[0].x - 14, y: waypointsSalas[0].y - 6 });
        } else {
          waypointsSalas.unshift({ x: waypointsSalas[0].x - 16, y: waypointsSalas[0].y - 8 });
          waypointsSalas.push({ x: waypointsSalas[0].x + 16, y: waypointsSalas[0].y + 8 });
        }
      }
      projeteisAtivos.push({
        id: `proj-${ev.idEvento}`,
        lado: 'JOGADOR',
        slotIndex: slotRealEv,
        chassiId: ev.chassiId ?? 'CANHAO_ARPAO_CABO',
        ehFeixe: ev.tipo === 'FEIXE_JOGADOR',
        waypointsSalas,
        xOrigem: origArmaX,
        yOrigem: origArmaY,
        xDestino: destAlvoX,
        yDestino: destAlvoY,
        xAtual: ev.tipo === 'FEIXE_JOGADOR' && waypointsSalas[0] ? waypointsSalas[0].x : origArmaX,
        yAtual: ev.tipo === 'FEIXE_JOGADOR' && waypointsSalas[0] ? waypointsSalas[0].y : origArmaY,
        progresso0a1: 0,
        duracaoSeg: ev.tipo === 'FEIXE_JOGADOR' ? 0.42 : 0.28,
      });
    } else if (ev.tipo === 'DISPARO_INIMIGO') {
      const hbCamJog = hbCamarasMap.get(5) ?? [...hbCamarasMap.values()][0];
      const origInimX = ehMonstroCena ? 746 : 728;
      const origInimY = ev.subtipo === 'TORPEDO_OU_BICO' ? (ehMonstroCena ? 302 : 374) : 318;
      projeteisAtivos.push({
        id: `proj-inim-${ev.idEvento}`,
        lado: 'INIMIGO',
        chassiId: ev.subtipo === 'TORPEDO_OU_BICO' ? 'LANCADOR_TORPEDO_ABISSAL' : 'RAJADA_INIMIGA',
        ehFeixe: false,
        waypointsSalas: [],
        xOrigem: origInimX,
        yOrigem: origInimY,
        xDestino: hbCamJog ? hbCamJog.x + hbCamJog.largura / 2 : 460,
        yDestino: hbCamJog ? hbCamJog.y + hbCamJog.altura / 2 : 230,
        xAtual: origInimX,
        yAtual: origInimY,
        progresso0a1: 0,
        duracaoSeg: 0.32,
      });
    } else if (ev.tipo === 'IMPACTO_ALVO' || ev.tipo === 'IMPACTO_BLINDAGEM' || ev.tipo === 'IMPACTO_CARAPACA' || ev.tipo === 'QUEBRA_CARAPACA' || ev.tipo === 'ESQUIVA_ALVO') {
      if (hbAlvo && ev.tipo !== 'ESQUIVA_ALVO') {
        flashesSalas.push({
          alvo: `SALA_ALVO_${hbAlvo.metadados.salaId}`,
          x: hbAlvo.x,
          y: hbAlvo.y,
          largura: hbAlvo.largura,
          altura: hbAlvo.altura,
          cor: ev.tipo === 'IMPACTO_ALVO' ? 'RED' : 'CYAN',
          restanteSeg: 0.14,
        });
      }
      if (!reduzirMovimento && ev.tipo === 'IMPACTO_ALVO') {
        intensidadeShake = Math.min(4.5, intensidadeShake + 1.8);
      }
      const textoImp = String(ev.texto ?? '-1');
      const xImpAlvo = hbAlvo
        ? (ehMonstroCena
            ? Math.max(468, hbAlvo.x - textoImp.length * 7 - 26)
            : ehChefeCena && hbAlvo.y < 300
              ? 488
              : hbAlvo.x + 2)
        : destAlvoX - 18;
      const yImpAlvo = hbAlvo
        ? (ehMonstroCena
            ? hbAlvo.y + 8
            : ehChefeCena && hbAlvo.y < 300
              ? 362
              : hbAlvo.y - 13)
        : destAlvoY - 14;
      empurrarTextoSemColisao({
        texto: textoImp,
        x: xImpAlvo,
        y: yImpAlvo,
        cor: ev.tipo === 'ESQUIVA_ALVO' ? 'CYAN' : ev.tipo === 'IMPACTO_ALVO' ? 'YELLOW' : 'AMBER',
        restanteSeg: 0.85,
      });
    } else if (ev.tipo === 'IMPACTO_JOGADOR' || ev.tipo === 'BLOQUEIO_BARREIRA_JOGADOR') {
      const hbCam = hbCamarasMap.get(ev.camaraId ?? 5) ?? [...hbCamarasMap.values()][0];
      if (hbCam && ev.tipo === 'IMPACTO_JOGADOR') {
        flashesSalas.push({
          alvo: `CAMARA_${hbCam.metadados.camaraId}`,
          x: hbCam.x,
          y: hbCam.y,
          largura: hbCam.largura,
          altura: hbCam.altura,
          cor: 'RED',
          restanteSeg: 0.16,
        });
        if (!reduzirMovimento) {
          intensidadeShake = Math.min(6.0, intensidadeShake + 3.2);
        }
      }
      empurrarTextoSemColisao({
        texto: String(ev.texto ?? '-1'),
        x: hbCam ? hbCam.x + 6 : 440,
        y: hbCam ? hbCam.y - 13 : 180,
        cor: ev.tipo === 'BLOQUEIO_BARREIRA_JOGADOR' ? 'CYAN' : 'RED',
        restanteSeg: 0.90,
      });
    } else if (ev.texto && ev.tipo !== 'REFLEXO_BRANQUIAL') {
      empurrarTextoSemColisao({
        texto: String(ev.texto),
        x: ev.tipo === 'CORTE_DRENO_SEGURO' ? 364 : 604,
        y: ev.tipo === 'CORTE_DRENO_SEGURO' ? 92 : 146,
        cor: 'AMBER',
        restanteSeg: 1.10,
      });
    }
  }

  const angShake = tempoAcumuladoSeg * 47;
  const shakeX = reduzirMovimento || intensidadeShake < 0.15 ? 0 : Math.round(Math.cos(angShake) * intensidadeShake);
  const shakeY = reduzirMovimento || intensidadeShake < 0.15 ? 0 : Math.round(Math.sin(angShake * 1.3) * intensidadeShake);

  // 5. Microinteração < 16ms de Hover / Active-Press / Instant Warm Tooltip (Emil Kowalski)
  const hoverHitboxId = opcoes.hoverHitboxId !== undefined ? opcoes.hoverHitboxId : (vm.idHitboxHover ?? ant.hoverHitboxId ?? null);
  const pressHitboxId = opcoes.pressHitboxId !== undefined ? opcoes.pressHitboxId : null;
  const mudouHover = hoverHitboxId !== ant.hoverHitboxId;
  const progressoHover0a1 = hoverHitboxId
    ? (mudouHover ? Math.min(1, dt / 0.12) : Math.min(1, Number(ant.progressoHover0a1 ?? 0) + dt / 0.12))
    : 0;
  const tempoHoverAtualSeg = hoverHitboxId ? (mudouHover ? dt : Number(ant.tempoHoverAtualSeg ?? 0) + dt) : 0;
  const janelaQuente = tempoAcumuladoSeg <= Number(ant.tooltipQuenteAteSeg ?? 0);
  const tooltipAberto = Boolean(hoverHitboxId) && (janelaQuente || tempoHoverAtualSeg >= 0.18);
  const tooltipQuenteAteSeg = tooltipAberto ? tempoAcumuladoSeg + 0.45 : Number(ant.tooltipQuenteAteSeg ?? 0);

  return congelarProfundoClienteSeguro({
    tempoAcumuladoSeg,
    quadrosRenderizados,
    fpsEstimado,
    reduzirMovimento,
    deslocamentoCascoPx,
    ultimoIdEventoProcessado,
    intensidadeShake: Math.round(intensidadeShake * 1000) / 1000,
    shakeX,
    shakeY,
    posicoesTripulantes,
    posicoesInvasores,
    portaisDilatados,
    projeteisAtivos: projeteisAtivos.slice(-16),
    flashesSalas: flashesSalas.slice(-12),
    textosFlutuantes: textosFlutuantes.slice(-10),
    hoverHitboxId,
    pressHitboxId,
    progressoHover0a1: Math.round(progressoHover0a1 * 1000) / 1000,
    tooltipAberto,
    tempoHoverAtualSeg: Math.round(tempoHoverAtualSeg * 1000) / 1000,
    tooltipQuenteAteSeg: Math.round(tooltipQuenteAteSeg * 1000) / 1000,
  });
}
