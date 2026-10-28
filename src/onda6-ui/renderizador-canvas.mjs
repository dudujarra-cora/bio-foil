/**
 * ONDA 6 — Motor Unificado de Rasterização Hi-Bit 960x540 (Server & Browser 0-Byte Diff)
 * Dono Único (Lei N5): src/onda6-ui/renderizador-canvas.mjs
 *
 * Responsabilidades:
 *  - Orquestrar o quadro `960x540` RGBA determinístico para todas as fases (`INICIO`, `MAPA`, `LOJA`, `EVENTO`, `COMBATE`, `FIM_DE_RUN`)
 *    delegando telas/modais de campanha (`./renderizador-telas-campanha.mjs`), bestiário/chefe (`./renderizador-alvo-inimigo.mjs`)
 *    e primitivas puras (`./primitivas-raster-rgba.mjs`) sem ciclos de importação (`LOAD_1M < 20`, Lei N5).
 */
import { criarContextoPrimitivasRgba960x540 } from './primitivas-raster-rgba.mjs';
import { calcularLayoutPlacaCamaras960 } from './geometria-layout-960.mjs';
import {
  renderizarTelaHangarOuFimDeRun,
  renderizarViewportCampanhaNaoCombate,
  renderizarModalSaqueOverlay,
  renderizarModalOficinaOverlay,
  renderizarModalDesfechoEventoOverlay,
} from './renderizador-telas-campanha.mjs';
import {
  prepararFundoAtmosfericoCombate,
  renderizarSobrecomposicaoCombate60Fps,
} from './renderizador-alvo-inimigo.mjs';
import {
  renderizarHudSuperiorTermometroERodape,
  renderizarTooltipContextualEAvisoToast,
} from './renderizador-hud-tooltips.mjs';
import { rasterizarParticulasEJuiceRgba } from '../onda7-steam/particulas-juice-60fps.mjs';
import { rasterizarCamadasComerciaisSteamRgba } from '../onda7-steam/renderizador-modais-steam.mjs';
import { obterRotuloCurtoCamara } from '../onda7-steam/i18n-dicionario-ui.mjs';

export function rasterizarQuadroRgba960x540(viewModel, opcoes = {}, assets, hitboxes, tabelas) {
  const cachesFrame = rasterizarQuadroRgba960x540._caches || (rasterizarQuadroRgba960x540._caches = {});
  const ctx = criarContextoPrimitivasRgba960x540(viewModel, opcoes, assets, hitboxes, tabelas, cachesFrame);
  const {
    W,
    H,
    rgba,
    f4Anim,
    disparandoDorsal,
    tempoSeg,
    ev60,
    idHoverAtivo,
    idPressAtivo,
    faseJogo,
    estadoFisico,
    ehTouchdown,
    ehMonstroAlvo,
    ehChefeDraga,
    idCarcaca,
    BORDER,
    RIM,
    TXT,
    DIM,
    GREEN,
    CYAN,
    AMBER,
    RED,
    YELLOW,
    VIOLET,
    PIP_OFF,
    SLOT_BG,
    RECORTES_F4,
    NOMES_CARC,
    NOMES_SALAS,
    NOMES_ARMAS,
    SIGLAS_ESP,
    SPRITES_HB,
    ATLAS_4F,
    obterPerfilLimpo,
    amostrarCeuMar,
    obterMascaraF4,
    putPx,
    fillRect,
    hLine,
    lineSeg,
    blitMatrizToken,
    txt,
    chanfradoBezel,
    panel,
    desenharPersonagemPose4F,
    segBar,
    desenharTuboEnergiaHiBit,
    desenharBulboNeuralHiBit,
    socket,
    bolhaBarreira,
    lock,
    blitIconeHiBit,
    heartOrgan,
    aplicarPinturaFaccaoTipoB,
    desenharRetratoRecortadoHiBit,
    desenharIconeSis12,
  } = ctx;

  if (faseJogo === "INICIO" || faseJogo === "FIM_DE_RUN") {
    renderizarTelaHangarOuFimDeRun(ctx);
    if (viewModel.edicaoComercialSteam || viewModel.modalSteamAtivo || viewModel.tutorialSteam?.ativo) {
      rasterizarCamadasComerciaisSteamRgba(rgba, W, H, viewModel, {
        escala: 1,
        idioma: viewModel.configuracoesSteam?.idioma ?? opcoes.idioma ?? "pt-BR",
        hoverHitboxId: idHoverAtivo,
        cursorGamepad960: opcoes.cursorGamepad960 ?? null,
      });
    }
    return rgba;
  }

  let deslSubTickCombate = 0;
  if (faseJogo === "MAPA" || faseJogo === "LOJA" || faseJogo === "EVENTO") {
    renderizarViewportCampanhaNaoCombate(ctx);
  } else {
    const { placaEsq, perfilEsq, deslSubTick } = prepararFundoAtmosfericoCombate(ctx, cachesFrame);
    deslSubTickCombate = deslSubTick;

    const hbCamaras = hitboxes.filter((h) => h.tipo === "CAMARA_BIONAVE");
    const hbValvulas = hitboxes.filter((h) => h.tipo === "VALVULA_EXTERNA");
    const specF4 = RECORTES_F4[idCarcaca];
    const usarEspinhaClassicaOnda6 =
      !viewModel.edicaoComercialSteam && (!viewModel.layoutId || viewModel.layoutId === 'CARCACA_ALFA_A');
    const usarSilhuetaMoldadaSteam = Boolean(viewModel.edicaoComercialSteam || viewModel.layoutId);
    const ehVarianteCascoB = String(viewModel.layoutId ?? '').endsWith('_B');

    const deslCascoAlfa = (!usarEspinhaClassicaOnda6 && ehTouchdown) ? (deslSubTick + 102) : deslSubTick;
    if (!specF4 && deslCascoAlfa === 0 && ehVarianteCascoB && aplicarPinturaFaccaoTipoB && hbCamaras.length > 0) {
      for (let sy = 44; sy <= 326; sy += 1) {
        for (let sx = 176; sx <= 646; sx += 1) {
          const pI = (sy * W + sx) * 4;
          const rA = rgba[pI];
          const gA = rgba[pI + 1];
          const bA = rgba[pI + 2];
          if (rA < 10 && gA < 16 && bA < 22) continue;
          const ehQuitinaAlfa = rA > bA + 5 || (rA > 34 && rA >= gA - 3 && bA < gA + 6);
          if (ehQuitinaAlfa) {
            const [nr, ng, nb] = aplicarPinturaFaccaoTipoB(idCarcaca, rA, gA, bA);
            putPx(sx, sy, [nr, ng, nb, 255]);
          }
        }
      }
    }
    if (!specF4 && estadoFisico === "3_SPOOL_UP" && deslCascoAlfa === 0 && hbCamaras.length > 0) {
      const yAguaSp = 219;
      const minXSp = Math.min(...hbCamaras.map((h) => h.x));
      const maxXSp = Math.max(...hbCamaras.map((h) => h.x + h.largura));
      for (let sy = 132; sy <= yAguaSp + 6; sy += 1) {
        const pyPlaca = sy - 40;
        for (let sx = 166; sx <= 666; sx += 1) {
          if (sx >= minXSp - 1 && sx <= maxXSp + 1 && sy >= 130) continue;
          const pI = (sy * W + sx) * 4;
          const rS = rgba[pI];
          const gS = rgba[pI + 1];
          const bS = rgba[pI + 2];
          if ((bS >= rS + 4 && bS > 88) || (gS > 106 && bS > 116 && bS >= rS - 6) || sx < 268 || sx > 548) {
            const [cR, cG, cB] = amostrarCeuMar(perfilEsq, pyPlaca, sx, sy);
            putPx(sx, sy, [cR, cG, cB, 255]);
          }
        }
      }
      for (let sxW = 166; sxW <= 666; sxW += 1) {
        if (sxW >= 292 && sxW <= 538) continue;
        const distP = sxW < 292 ? (292 - sxW) : (sxW - 538);
        const yOndaSp = yAguaSp + Math.round(Math.sin(sxW * 0.09 + tempoSeg * 5) * 1.2);
        const altSp = distP < 36 ? Math.max(1, Math.round((36 - distP) / 7)) : 1;
        for (let dyE = -altSp; dyE <= 2; dyE += 1) {
          if (dyE < -1 && ((sxW + dyE) & 1) === 1) continue;
          putPx(sxW, yOndaSp + dyE, dyE <= 0 ? ((sxW + dyE) % 3 === 0 ? CYAN : TXT) : [44, 138, 166, 255]);
        }
      }
    }

    if (!specF4 && deslCascoAlfa !== 0 && hbCamaras.length > 0) {
      const yAguaSub = ehTouchdown ? 219 : ehMonstroAlvo ? 336 : 332;
      let snapCenaLimpa = cachesFrame.snapCenaLimpa;
      if (!snapCenaLimpa || snapCenaLimpa.length !== rgba.length) {
        snapCenaLimpa = new Uint8ClampedArray(rgba.length);
        cachesFrame.snapCenaLimpa = snapCenaLimpa;
      }
      snapCenaLimpa.set(rgba);
      const gradeRefSub = (!usarEspinhaClassicaOnda6 && ehTouchdown)
        ? calcularLayoutPlacaCamaras960(true, ehMonstroAlvo)
        : null;
      const minCamXSub = gradeRefSub ? gradeRefSub.xEsq : Math.min(...hbCamaras.map((h) => h.x));
      const maxCamXSub = gradeRefSub ? (gradeRefSub.xDir + gradeRefSub.larguraCam) : Math.max(...hbCamaras.map((h) => h.x + h.largura));
      const minCamYOrig = gradeRefSub ? gradeRefSub.toposY[0] : Math.min(...hbCamaras.map((h) => h.y));
      const maxCamYOrig = gradeRefSub ? (gradeRefSub.toposY[3] + gradeRefSub.alturasY[3]) : Math.max(...hbCamaras.map((h) => h.y + h.altura));
      const meioCamXSub = Math.round((minCamXSub + maxCamXSub) / 2);
      const colEsqMaxX = hbCamaras
        .filter((h) => h.x + h.largura / 2 < meioCamXSub)
        .reduce((m, h) => Math.max(m, h.x + h.largura), minCamXSub);
      const colDirMinX = hbCamaras
        .filter((h) => h.x + h.largura / 2 >= meioCamXSub)
        .reduce((m, h) => Math.min(m, h.x), maxCamXSub);

      const x0Sub = 166;
      const x1Sub = ehTouchdown ? 666 : 598;
      const y0Sub = 42;
      const yMaxSub = (!usarEspinhaClassicaOnda6 && ehTouchdown) ? 426 : (ehTouchdown ? 332 : 324);
      const wSub = x1Sub - x0Sub + 1;
      const hSub = yMaxSub - y0Sub + 1;
      const fundoSub = new Uint8Array(wSub * hSub);
      const filaSub = new Int32Array(wSub * hSub);
      let qs0 = 0;
      let qs1 = 0;
      const podeSerFundoSub = (sx, sy) => {
        if (sx >= minCamXSub - 1 && sx <= maxCamXSub + 1 && sy >= minCamYOrig - 1 && sy <= maxCamYOrig + 1) {
          return false;
        }
        if (ehTouchdown && (sx < minCamXSub - 2 || sx > maxCamXSub + 2) && sy >= 132 && sy <= yAguaSub + 28) {
          const pE = (sy * W + sx) * 4;
          const rE = snapCenaLimpa[pE];
          const gE = snapCenaLimpa[pE + 1];
          const bE = snapCenaLimpa[pE + 2];
          if (bE >= rE + 4 || (bE >= rE - 4 && gE > 84) || sx < 268 || sx > 548) return true;
        }
        const p = (sy * W + sx) * 4;
        const r = snapCenaLimpa[p];
        const g = snapCenaLimpa[p + 1];
        const b = snapCenaLimpa[p + 2];
        if (r < 9 && g < 15 && b < 21) return false;
        return (b >= g - 5 && g >= r + 4 && b >= r + 8 && r < 46 && g < 108 && b < 128) || (g > 140 && b > 155 && b >= r - 6);
      };
      const semSub = (lx, ly) => {
        const mi = ly * wSub + lx;
        if (fundoSub[mi] || !podeSerFundoSub(x0Sub + lx, y0Sub + ly)) return;
        fundoSub[mi] = 1;
        filaSub[qs1++] = mi;
      };
      for (let lx = 0; lx < wSub; lx += 1) { semSub(lx, 0); semSub(lx, hSub - 1); }
      for (let ly = 0; ly < hSub; ly += 1) { semSub(0, ly); semSub(wSub - 1, ly); }
      while (qs0 < qs1) {
        const curS = filaSub[qs0++];
        const cxS = curS % wSub;
        const cyS = (curS - cxS) / wSub;
        if (cxS > 0) semSub(cxS - 1, cyS);
        if (cxS + 1 < wSub) semSub(cxS + 1, cyS);
        if (cyS > 0) semSub(cxS, cyS - 1);
        if (cyS + 1 < hSub) semSub(cxS, cyS + 1);
      }

      for (let sy = y0Sub; sy <= yMaxSub; sy += 1) {
        const pyPlaca = sy - 40;
        const ly = sy - y0Sub;
        for (let sx = x0Sub; sx <= x1Sub; sx += 1) {
          if (!ehTouchdown && sy > 308 && sx >= 436 && sx <= 466) continue;
          const ehFundo = fundoSub[ly * wSub + (sx - x0Sub)] === 1;
          let limparSprayAlto = false;
          if (ehTouchdown && ehFundo && sy >= 132 && sy <= yAguaSub + 6 && (sx < minCamXSub - 1 || sx > maxCamXSub + 1)) {
            const pS = (sy * W + sx) * 4;
            if ((snapCenaLimpa[pS + 2] >= snapCenaLimpa[pS] + 4 && snapCenaLimpa[pS + 2] > 86) || snapCenaLimpa[pS + 1] > 104 || sx < 268 || sx > 548) {
              limparSprayAlto = true;
            }
          }
          if (!ehFundo || limparSprayAlto) {
            const [cR, cG, cB] = amostrarCeuMar(perfilEsq, pyPlaca, sx, sy);
            putPx(sx, sy, [cR, cG, cB, 255]);
          }
        }
      }
      let xParedeEsqSub = minCamXSub;
      let xParedeDirSub = maxCamXSub;
      for (let sy = y0Sub; sy <= yMaxSub; sy += 1) {
        const syOrig = sy - deslCascoAlfa;
        if (syOrig < y0Sub || syOrig > yMaxSub) continue;
        const lyOrig = syOrig - y0Sub;
        for (let sx = x0Sub; sx <= x1Sub; sx += 1) {
          if (fundoSub[lyOrig * wSub + (sx - x0Sub)]) continue;
          if (Math.abs(sy - yAguaSub) <= 3) {
            if (sx < xParedeEsqSub) xParedeEsqSub = sx;
            if (sx > xParedeDirSub) xParedeDirSub = sx;
          }
          const sIdx = (syOrig * W + sx) * 4;
          let rO = snapCenaLimpa[sIdx];
          let gO = snapCenaLimpa[sIdx + 1];
          let bO = snapCenaLimpa[sIdx + 2];
          if (ehTouchdown && syOrig >= 198 && syOrig <= yAguaSub + 9 && ((bO >= rO - 4 && gO > 84) || (rO > 135 && gO > 148 && bO > 152))) {
            if (sx >= colEsqMaxX && sx < colDirMinX) {
              rO = 16; gO = 26; bO = 36;
            } else {
              let achouCascoLimpo = false;
              for (let dyRef = 10; dyRef <= 56; dyRef += 3) {
                const syRef = syOrig - dyRef;
                if (syRef < y0Sub) break;
                if (fundoSub[(syRef - y0Sub) * wSub + (sx - x0Sub)]) continue;
                const refIdx = (syRef * W + sx) * 4;
                const rr = snapCenaLimpa[refIdx];
                const gg = snapCenaLimpa[refIdx + 1];
                const bb = snapCenaLimpa[refIdx + 2];
                if (!((bb >= rr - 4 && gg > 84) || (rr > 135 && gg > 148 && bb > 152))) {
                  rO = rr; gO = gg; bO = bb;
                  achouCascoLimpo = true;
                  break;
                }
              }
              if (!achouCascoLimpo) continue;
            }
          }
          if (ehVarianteCascoB && aplicarPinturaFaccaoTipoB) {
            [rO, gO, bO] = aplicarPinturaFaccaoTipoB(idCarcaca, rO, gO, bO);
          }
          if (sy >= yAguaSub && syOrig < yAguaSub) {
            putPx(sx, sy, [Math.round(rO * 0.56 + 5), Math.round(gO * 0.68 + 18), Math.round(bO * 0.74 + 26), 255]);
          } else if (sy < yAguaSub && syOrig >= yAguaSub && !(sx >= minCamXSub - 2 && sx <= maxCamXSub + 2)) {
            putPx(sx, sy, [
              Math.min(255, Math.round(rO * 1.28 + 10)),
              Math.min(255, Math.round(gO * 1.02 + 4)),
              Math.max(0, Math.round(bO * 0.88)),
              255,
            ]);
          } else {
            putPx(sx, sy, [rO, gO, bO, 255]);
          }
        }
      }
      const xOndaIni = ehTouchdown ? 166 : 426;
      const xOndaFim = ehTouchdown ? 666 : 476;
      for (let sxW = xOndaIni; sxW <= xOndaFim; sxW += 1) {
        const noPocoCentral = ehTouchdown && sxW >= colEsqMaxX + 1 && sxW <= colDirMinX - 2;
        if (ehTouchdown && !noPocoCentral && sxW >= xParedeEsqSub + 4 && sxW <= xParedeDirSub - 4) continue;
        const yOndaT = yAguaSub + Math.round(Math.sin(sxW * 0.09 + tempoSeg * 4) * 1.1);
        if (noPocoCentral) {
          putPx(sxW, yOndaT, (sxW & 1) === 0 ? CYAN : TXT);
          putPx(sxW, yOndaT + 1, [44, 138, 166, 255]);
          continue;
        }
        const distParede = sxW <= xParedeEsqSub + 4 ? Math.max(0, xParedeEsqSub + 4 - sxW) : Math.max(0, sxW - (xParedeDirSub - 4));
        if (ehTouchdown && distParede < 36) {
          const altEsp = Math.max(1, Math.round((36 - distParede) / 6));
          for (let dyE = -altEsp; dyE <= 2; dyE += 1) {
            if (dyE < -2 && ((sxW + dyE) & 1) === 1) continue;
            putPx(sxW, yOndaT + dyE, dyE <= 0 ? ((sxW + dyE) % 3 === 0 ? CYAN : TXT) : [44, 138, 166, 255]);
          }
        } else {
          putPx(sxW, yOndaT, (sxW % 4) === 0 ? CYAN : TXT);
          putPx(sxW, yOndaT + 1, (sxW & 1) === 0 ? TXT : CYAN);
          if ((sxW % 3) === 0) putPx(sxW, yOndaT + 2, [44, 138, 166, 255]);
        }
      }
    }

    // Projeção orgânica Hi-Bit C0 das outras 4 carcaças de F4 (mapeamento vertical C0 contínuo sem corte reto de coroa em Y=42!)
    if (specF4 && hbCamaras.length > 0 && assets.f4Ships) {
      const [sx0, sy0, sw, sh] = specF4.casco;
      const [bx0, by0, bw, bh] = specF4.bloco;
      const maskF4 = obterMascaraF4(idCarcaca);
      const minCamX = Math.min(...hbCamaras.map((h) => h.x));
      const maxCamX = Math.max(...hbCamaras.map((h) => h.x + h.largura));
      const minCamY = Math.min(...hbCamaras.map((h) => h.y)) + deslSubTick;
      const maxCamY = Math.max(...hbCamaras.map((h) => h.y + h.altura)) + deslSubTick;
      const largBlocoCena = maxCamX - minCamX;
      const altBlocoCena = maxCamY - minCamY;

      const yLimiteLimpeza = (ehTouchdown && usarSilhuetaMoldadaSteam) ? 426 : (ehTouchdown ? 218 : ehMonstroAlvo ? 335 : 331);
      const xIniLimpeza = 196;
      const xFimLimpeza = ehChefeDraga ? 604 : 636;
      for (let sy = 42; sy <= yLimiteLimpeza; sy += 1) {
        const pyPlaca = Math.max(0, Math.min(placaEsq.altura - 1, sy - 40));
        for (let sx = xIniLimpeza; sx <= xFimLimpeza; sx += 1) {
          const naFaixaMastro = sx >= 420 && sx <= 480;
          const yMaxLoc = (!ehTouchdown && !naFaixaMastro) ? 327 : yLimiteLimpeza;
          if (sy > yMaxLoc) continue;
          const [cR, cG, cB] = amostrarCeuMar(perfilEsq, pyPlaca, sx, sy);
          let pesoLimpo = 1.0;
          if (sx < xIniLimpeza + 36) {
            pesoLimpo = Math.min(pesoLimpo, (sx - xIniLimpeza) / 36);
          }
          if (sx > xFimLimpeza - 36) {
            pesoLimpo = Math.min(pesoLimpo, (xFimLimpeza + 1 - sx) / 36);
          }
          if (!ehTouchdown && !naFaixaMastro && sy > yMaxLoc - 8) {
            pesoLimpo = Math.min(pesoLimpo, (yMaxLoc + 1 - sy) / 8);
          }
          if (pesoLimpo < 0.999) {
            const idxAt = (sy * W + sx) * 4;
            putPx(sx, sy, [
              Math.round(rgba[idxAt] * (1 - pesoLimpo) + cR * pesoLimpo),
              Math.round(rgba[idxAt + 1] * (1 - pesoLimpo) + cG * pesoLimpo),
              Math.round(rgba[idxAt + 2] * (1 - pesoLimpo) + cB * pesoLimpo),
              255,
            ]);
          } else {
            putPx(sx, sy, [cR, cG, cB, 255]);
          }
        }
      }
      if (!ehTouchdown) {
        const yAguaMastro = ehMonstroAlvo ? 336 : 332;
        const xCentroMastro = 450;
        for (let syM = maxCamY - 1; syM <= yAguaMastro + 2; syM += 1) {
          const distTopoM = Math.max(0, syM - maxCamY);
          const meiaLargM = distTopoM < 5 ? 7 - distTopoM : 3;
          for (let dxM = -meiaLargM - 1; dxM <= meiaLargM + 1; dxM += 1) {
            const sxM = xCentroMastro + dxM;
            if (Math.abs(dxM) === meiaLargM + 1) {
              putPx(sxM, syM, [8, 14, 20, 255]);
            } else if (dxM <= -meiaLargM + 1) {
              putPx(sxM, syM, [104, 74, 70, 255]);
            } else if (dxM === 0) {
              putPx(sxM, syM, ((sxM + syM) & 1) === 0 ? [74, 54, 56, 255] : [60, 44, 48, 255]);
            } else {
              putPx(sxM, syM, dxM >= meiaLargM - 1 ? [28, 36, 46, 255] : [44, 38, 46, 255]);
            }
          }
        }
        for (let dxF = -22; dxF <= 22; dxF += 1) {
          const sxF = xCentroMastro + dxF;
          const distF = Math.abs(dxF);
          if (distF <= 10) {
            putPx(sxF, yAguaMastro - 1, (sxF & 1) === 0 ? TXT : CYAN);
          }
          if (distF <= 18) {
            putPx(sxF, yAguaMastro, (sxF % 3) === 0 ? CYAN : TXT);
          }
          if (distF <= 22 && (distF <= 14 || (sxF & 1) === 0)) {
            putPx(sxF, yAguaMastro + 1, distF <= 12 ? CYAN : [44, 138, 166, 255]);
          }
        }
      }

      const escCascoY = altBlocoCena / bh;
      const overhangEsqF4 = Math.max(1, bx0 - sx0);
      const overhangDirF4 = Math.max(1, (sx0 + sw) - (bx0 + bw));
      const largEsqDst = Math.min(194, Math.round(overhangEsqF4 * 1.95));
      const maxLargDir = ehChefeDraga ? 48 : ehMonstroAlvo ? 60 : 72;
      const largDirDst = Math.min(maxLargDir, Math.round(overhangDirF4 * 0.95));
      const destX0 = Math.max(156, minCamX - largEsqDst);
      const destX1 = maxCamX + largDirDst;
      const destY0Ideal = Math.round(minCamY - (by0 - sy0) * escCascoY);
      const destY0 = Math.max(43, destY0Ideal);
      const yCoroaIni = destY0 + 1;
      const fyMaxUtil = Math.min(sy0 + sh - 1, by0 + bh + 5);
      const destY1 = Math.min(yLimiteLimpeza, Math.round(minCamY + (fyMaxUtil - by0) * escCascoY));
      const wCascoDst = Math.max(1, destX1 - destX0 + 1);
      const hCascoDst = Math.max(1, destY1 - destY0 + 1);
      const opacosCasco = new Uint8Array(wCascoDst * hCascoDst);
      const rgbCasco = new Uint8Array(wCascoDst * hCascoDst * 3);
      const rgbBrutoCasco = new Uint8Array(wCascoDst * hCascoDst * 3);

      const texelSolidoF4 = (fxT, fyT) => {
        const cxT = Math.min(sx0 + sw - 1, Math.max(sx0, fxT));
        const cyT = Math.min(sy0 + sh - 1, Math.max(sy0, fyT));
        if (cyT > fyMaxUtil) return false;
        if (cxT >= bx0 + 2 && cxT <= bx0 + bw - 2 && cyT >= by0 + 2 && cyT <= by0 + bh - 2) return true;
        if (maskF4 && maskF4[(cyT - sy0) * sw + (cxT - sx0)]) return false;
        const sT = (cyT * assets.f4Ships.largura + cxT) * 4;
        const rT = assets.f4Ships.rgba[sT];
        const gT = assets.f4Ships.rgba[sT + 1];
        const bT = assets.f4Ships.rgba[sT + 2];
        if (cyT > by0 + bh + 1 && gT > 125 && bT > 140 && rT < 95) return false;
        return true;
      };

      for (let dy = destY0; dy <= destY1; dy += 1) {
        if (dy < yCoroaIni) continue;
        const fyReal = dy < minCamY
          ? sy0 + ((dy - yCoroaIni) / Math.max(1, minCamY - yCoroaIni)) * (by0 - sy0)
          : by0 + (dy - minCamY) / escCascoY;
        if (fyReal > fyMaxUtil + 0.4) continue;
        const fyClamped = Math.min(assets.f4Ships.altura - 1, Math.max(sy0, fyReal));
        const fy0 = Math.floor(fyClamped);
        const fy1 = Math.min(sy0 + sh - 1, fy0 + 1);
        const wy = fyClamped - fy0;
        const fyNear = wy < 0.5 ? fy0 : fy1;
        const oy = dy - destY0;
        for (let dx = destX0; dx <= destX1; dx += 1) {
          let fxReal;
          if (dx < minCamX) {
            fxReal = bx0 - ((minCamX - dx) / Math.max(1, largEsqDst)) * overhangEsqF4;
          } else if (dx <= maxCamX) {
            fxReal = bx0 + ((dx - minCamX) / Math.max(1, largBlocoCena)) * bw;
          } else {
            fxReal = (bx0 + bw) + ((dx - maxCamX) / Math.max(1, largDirDst)) * overhangDirF4;
          }
          const fxClamped = Math.min(sx0 + sw - 1, Math.max(sx0, fxReal));
          const fx0 = Math.floor(fxClamped);
          const fx1 = Math.min(sx0 + sw - 1, fx0 + 1);
          const wx = fxClamped - fx0;
          const fxNear = wx < 0.5 ? fx0 : fx1;

          const s00 = texelSolidoF4(fx0, fy0);
          const s10 = texelSolidoF4(fx1, fy0);
          const s01 = texelSolidoF4(fx0, fy1);
          const s11 = texelSolidoF4(fx1, fy1);
          const cobSolida =
            (s00 ? (1 - wx) * (1 - wy) : 0) +
            (s10 ? wx * (1 - wy) : 0) +
            (s01 ? (1 - wx) * wy : 0) +
            (s11 ? wx * wy : 0);

          let fxCor = fxNear;
          let fyCor = fyNear;
          if (!texelSolidoF4(fxCor, fyCor)) {
            if (s00) { fxCor = fx0; fyCor = fy0; }
            else if (s10) { fxCor = fx1; fyCor = fy0; }
            else if (s01) { fxCor = fx0; fyCor = fy1; }
            else if (s11) { fxCor = fx1; fyCor = fy1; }
          }
          const srcF4 = (fyCor * assets.f4Ships.largura + fxCor) * 4;
          let r = assets.f4Ships.rgba[srcF4];
          let g = assets.f4Ships.rgba[srcF4 + 1];
          let b = assets.f4Ships.rgba[srcF4 + 2];
          if (dx > maxCamX && dy <= minCamY + 32 && r > 165 && g > 170 && b > 170) {
            r = 112;
            g = 92;
            b = 74;
          }
          const idxC = oy * wCascoDst + (dx - destX0);
          rgbBrutoCasco[idxC * 3] = r;
          rgbBrutoCasco[idxC * 3 + 1] = g;
          rgbBrutoCasco[idxC * 3 + 2] = b;

          if (dx >= minCamX + 2 && dx <= maxCamX - 2 && dy >= minCamY + 2 && dy <= maxCamY - 2) {
            opacosCasco[idxC] = 3;
            continue;
          }
          if (dy >= maxCamY && dx >= minCamX - 4 && dx <= maxCamX + 6) continue;
          if (cobSolida < 0.48) continue;
          if (
            ((dx >= minCamX - 20 && dx < minCamX) || (dx > maxCamX && dx <= maxCamX + 18)) &&
            dy >= minCamY + 2 &&
            dy <= maxCamY - 2 &&
            r < 68 &&
            g < 74 &&
            b < 84 &&
            Math.abs(r - b) < 24
          ) {
            continue;
          }
          if (idCarcaca === "COURACA_LIMIAR" && dx > maxCamX + 12) {
            const relYBow = (dy - minCamY) / Math.max(1, maxCamY - minCamY);
            const alcanceBow = Math.round(14 + Math.sin(Math.min(1, Math.max(0, relYBow)) * Math.PI) * 26);
            if (dx > maxCamX + alcanceBow) continue;
          }
          opacosCasco[idxC] = 1;
          rgbCasco[idxC * 3] = r;
          rgbCasco[idxC * 3 + 1] = g;
          rgbCasco[idxC * 3 + 2] = b;
        }
      }

      const extCasco = new Uint8Array(wCascoDst * hCascoDst);
      const filaExtC = new Int32Array(wCascoDst * hCascoDst);
      let qec0 = 0;
      let qec1 = 0;
      const empExtC = (oxE, oyE) => {
        const iEC = oyE * wCascoDst + oxE;
        if (opacosCasco[iEC] || extCasco[iEC]) return;
        extCasco[iEC] = 1;
        filaExtC[qec1++] = iEC;
      };
      for (let ox = 0; ox < wCascoDst; ox += 1) { empExtC(ox, 0); empExtC(ox, hCascoDst - 1); }
      for (let oy = 0; oy < hCascoDst; oy += 1) { empExtC(0, oy); empExtC(wCascoDst - 1, oy); }
      while (qec0 < qec1) {
        const curEC = filaExtC[qec0++];
        const cxEC = curEC % wCascoDst;
        const cyEC = (curEC - cxEC) / wCascoDst;
        if (cxEC > 0) empExtC(cxEC - 1, cyEC);
        if (cxEC + 1 < wCascoDst) empExtC(cxEC + 1, cyEC);
        if (cyEC > 0) empExtC(cxEC, cyEC - 1);
        if (cyEC + 1 < hCascoDst) empExtC(cxEC, cyEC + 1);
      }
      for (let oy = 0; oy < hCascoDst; oy += 1) {
        for (let ox = 0; ox < wCascoDst; ox += 1) {
          const iC = oy * wCascoDst + ox;
          if (!opacosCasco[iC] && !extCasco[iC]) {
            opacosCasco[iC] = 2;
            rgbCasco[iC * 3] = rgbBrutoCasco[iC * 3];
            rgbCasco[iC * 3 + 1] = rgbBrutoCasco[iC * 3 + 1];
            rgbCasco[iC * 3 + 2] = rgbBrutoCasco[iC * 3 + 2];
          }
        }
      }
      for (let passPoda = 0; passPoda < 2; passPoda += 1) {
        const removerPoda = [];
        for (let oy = 1; oy < hCascoDst - 1; oy += 1) {
          for (let ox = 1; ox < wCascoDst - 1; ox += 1) {
            const iC = oy * wCascoDst + ox;
            if (opacosCasco[iC] !== 1 && opacosCasco[iC] !== 2) continue;
            const eL = opacosCasco[iC - 1] > 0 ? 1 : 0;
            const eR = opacosCasco[iC + 1] > 0 ? 1 : 0;
            const eU = opacosCasco[iC - wCascoDst] > 0 ? 1 : 0;
            const eD = opacosCasco[iC + wCascoDst] > 0 ? 1 : 0;
            let largH = 1;
            for (let k = 1; k <= 3 && ox - k >= 0 && opacosCasco[iC - k] > 0; k += 1) largH += 1;
            for (let k = 1; k <= 3 && ox + k < wCascoDst && opacosCasco[iC + k] > 0; k += 1) largH += 1;
            let altV = 1;
            for (let k = 1; k <= 3 && oy - k >= 0 && opacosCasco[iC - k * wCascoDst] > 0; k += 1) altV += 1;
            for (let k = 1; k <= 3 && oy + k < hCascoDst && opacosCasco[iC + k * wCascoDst] > 0; k += 1) altV += 1;
            if ((eL + eR + eU + eD) <= 1 || (largH <= 3 && altV >= 6) || (altV <= 2 && largH <= 5)) {
              removerPoda.push(iC);
            }
          }
        }
        for (const rIdx of removerPoda) opacosCasco[rIdx] = 0;
      }
      const conexoCasco = new Uint8Array(wCascoDst * hCascoDst);
      const filaConC = new Int32Array(wCascoDst * hCascoDst);
      let qcc0 = 0;
      let qcc1 = 0;
      for (let iSeed = 0; iSeed < opacosCasco.length; iSeed += 1) {
        if (opacosCasco[iSeed] === 3) {
          conexoCasco[iSeed] = 1;
          filaConC[qcc1++] = iSeed;
        }
      }
      while (qcc0 < qcc1) {
        const curCC = filaConC[qcc0++];
        const cxCC = curCC % wCascoDst;
        const cyCC = (curCC - cxCC) / wCascoDst;
        for (const [dxC, dyC] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nxC = cxCC + dxC;
          const nyC = cyCC + dyC;
          if (nxC < 0 || nxC >= wCascoDst || nyC < 0 || nyC >= hCascoDst) continue;
          const niC = nyC * wCascoDst + nxC;
          if (opacosCasco[niC] > 0 && !conexoCasco[niC]) {
            conexoCasco[niC] = 1;
            filaConC[qcc1++] = niC;
          }
        }
      }
      for (let iClean = 0; iClean < opacosCasco.length; iClean += 1) {
        if (opacosCasco[iClean] > 0 && !conexoCasco[iClean]) opacosCasco[iClean] = 0;
      }

      const camsOrdenadasY = [...hbCamaras].sort((a, b) => (a.y - b.y) || (a.x - b.x));
      const ancorasAndares = [];
      for (let idxPar = 0; idxPar < camsOrdenadasY.length; idxPar += 2) {
        const c0 = camsOrdenadasY[idxPar];
        const c1 = camsOrdenadasY[idxPar + 1] ?? c0;
        const y0 = c0.y + deslSubTick + c0.altura * 0.5;
        const y1 = c1.y + deslSubTick + c1.altura * 0.5;
        ancorasAndares.push({
          yMid: (y0 + y1) * 0.5,
          xMin: Math.min(c0.x, c1.x),
          xMax: Math.max(c0.x + c0.largura, c1.x + c1.largura),
        });
      }
      const obterLimitesXCamarasLinha = (syLinha) => {
        if (!usarSilhuetaMoldadaSteam || ancorasAndares.length === 0) {
          return [minCamX, maxCamX];
        }
        let xMinI = ancorasAndares[0].xMin;
        let xMaxI = ancorasAndares[0].xMax;
        const ultimo = ancorasAndares[ancorasAndares.length - 1];
        if (syLinha <= ancorasAndares[0].yMid) {
          const afunilProa = Math.max(0, (ancorasAndares[0].yMid - syLinha - 16) * 0.45);
          xMinI = ancorasAndares[0].xMin + afunilProa;
          xMaxI = ancorasAndares[0].xMax - afunilProa;
        } else if (syLinha >= ultimo.yMid) {
          const afunilPopa = Math.max(0, (syLinha - ultimo.yMid - 16) * 0.55);
          xMinI = ultimo.xMin + afunilPopa;
          xMaxI = ultimo.xMax - afunilPopa;
        } else {
          for (let ia = 0; ia < ancorasAndares.length - 1; ia += 1) {
            const a0 = ancorasAndares[ia];
            const a1 = ancorasAndares[ia + 1];
            if (syLinha >= a0.yMid && syLinha <= a1.yMid) {
              const tLin = (syLinha - a0.yMid) / Math.max(1, a1.yMid - a0.yMid);
              const tSuave = 0.5 - 0.5 * Math.cos(tLin * Math.PI);
              xMinI = a0.xMin + (a1.xMin - a0.xMin) * tSuave;
              xMaxI = a0.xMax + (a1.xMax - a0.xMax) * tSuave;
              break;
            }
          }
        }
        for (let ic = 0; ic < hbCamaras.length; ic += 1) {
          const hc = hbCamaras[ic];
          const hy0 = hc.y + deslSubTick;
          const hy1 = hy0 + hc.altura;
          if (syLinha >= hy0 - 1 && syLinha <= hy1 + 1) {
            if (hc.x < xMinI) xMinI = hc.x;
            if (hc.x + hc.largura > xMaxI) xMaxI = hc.x + hc.largura;
          }
        }
        return [Math.round(xMinI), Math.round(xMaxI)];
      };

      for (let oy = 0; oy < hCascoDst; oy += 1) {
        for (let ox = 0; ox < wCascoDst; ox += 1) {
          const iC = oy * wCascoDst + ox;
          const sx = destX0 + ox;
          const sy = destY0 + oy;
          const [limX0Casco, limX1Casco] = obterLimitesXCamarasLinha(sy);
          if (opacosCasco[iC] === 1 || opacosCasco[iC] === 2) {
            let cr = rgbCasco[iC * 3];
            let cg = rgbCasco[iC * 3 + 1];
            let cb = rgbCasco[iC * 3 + 2];
            if (ehVarianteCascoB && aplicarPinturaFaccaoTipoB) {
              [cr, cg, cb] = aplicarPinturaFaccaoTipoB(idCarcaca, cr, cg, cb);
            }
            if (ehTouchdown && usarSilhuetaMoldadaSteam && sy >= 220) {
              cr = Math.round(cr * 0.62 + 6);
              cg = Math.round(cg * 0.74 + 18);
              cb = Math.round(cb * 0.82 + 28);
            }
            putPx(sx, sy, [cr, cg, cb, 255]);
          } else if (
            opacosCasco[iC] === 0 &&
            !(sx >= limX0Casco - 1 && sx <= limX1Casco + 1 && sy >= minCamY - 1 && sy <= maxCamY + 1) &&
            ((oy > 0 && opacosCasco[iC - wCascoDst] >= 1 && opacosCasco[iC - wCascoDst] <= 2) ||
              (oy + 1 < hCascoDst && opacosCasco[iC + wCascoDst] >= 1 && opacosCasco[iC + wCascoDst] <= 2) ||
              (ox > 0 && opacosCasco[iC - 1] >= 1 && opacosCasco[iC - 1] <= 2) ||
              (ox + 1 < wCascoDst && opacosCasco[iC + 1] >= 1 && opacosCasco[iC + 1] <= 2))
          ) {
            putPx(sx, sy, [8, 14, 20, 255]);
          }
        }
      }

      const palBainhaBase = {
        MANTA_VOLT: { casca: [36, 58, 82], sombra: [20, 34, 52], crista: [64, 152, 184] },
        COURACA_LIMIAR: { casca: [96, 64, 40], sombra: [52, 36, 28], crista: [168, 114, 56] },
        SOMBRA_ABISSAL: { casca: [46, 34, 68], sombra: [24, 20, 40], crista: [118, 68, 176] },
        COLMEIA_VIVA: { casca: [44, 72, 50], sombra: [24, 42, 34], crista: [72, 178, 102] },
      }[idCarcaca] ?? { casca: [58, 44, 48], sombra: [32, 24, 30], crista: [88, 64, 68] };
      const palBainhaF4 = (ehVarianteCascoB && aplicarPinturaFaccaoTipoB)
        ? {
            casca: aplicarPinturaFaccaoTipoB(idCarcaca, palBainhaBase.casca[0], palBainhaBase.casca[1], palBainhaBase.casca[2]),
            sombra: aplicarPinturaFaccaoTipoB(idCarcaca, palBainhaBase.sombra[0], palBainhaBase.sombra[1], palBainhaBase.sombra[2]),
            crista: aplicarPinturaFaccaoTipoB(idCarcaca, palBainhaBase.crista[0], palBainhaBase.crista[1], palBainhaBase.crista[2]),
          }
        : palBainhaBase;

      let xB0Ant = null;
      let xB1Ant = null;
      for (let syB = minCamY - 5; syB <= maxCamY + 7; syB += 1) {
        const [rowMinX, rowMaxX] = obterLimitesXCamarasLinha(syB);
        const relYB = (syB - (minCamY - 5)) / Math.max(1, (maxCamY + 7) - (minCamY - 5));
        const arcoLat = Math.round(Math.sin(Math.min(1, Math.max(0, relYB)) * Math.PI) * (usarSilhuetaMoldadaSteam ? 4 : 5));
        const basePad = usarSilhuetaMoldadaSteam ? 7 : 11;
        const padLat = (syB > maxCamY ? Math.max(2, (usarSilhuetaMoldadaSteam ? 8 : 10) - (syB - maxCamY) * 2) : basePad + arcoLat);
        const xB0 = rowMinX - padLat;
        const xB1 = rowMaxX + padLat;
        for (let sxB = xB0; sxB <= xB1; sxB += 1) {
          if (sxB >= rowMinX && sxB < rowMaxX && syB >= minCamY && syB < maxCamY) continue;
          const passoDegrauEsq = xB0Ant !== null && sxB <= Math.max(xB0, xB0Ant);
          const passoDegrauDir = xB1Ant !== null && sxB >= Math.min(xB1, xB1Ant);
          const naBordaExtB =
            sxB === xB0 ||
            sxB === xB1 ||
            syB === minCamY - 5 ||
            syB === maxCamY + 7 ||
            (usarSilhuetaMoldadaSteam && (passoDegrauEsq || passoDegrauDir));
          const oxB = sxB - destX0;
          const oyB = syB - destY0;
          const jaTemAsa =
            oxB >= 0 && oxB < wCascoDst && oyB >= 0 && oyB < hCascoDst &&
            (opacosCasco[oyB * wCascoDst + oxB] === 1 || opacosCasco[oyB * wCascoDst + oxB] === 2);
          if (jaTemAsa) continue;
          if (naBordaExtB) {
            putPx(sxB, syB, [8, 14, 20, 255]);
          } else {
            const distBordaB = Math.min(sxB - xB0, xB1 - sxB, syB - (minCamY - 5), (maxCamY + 7) - syB);
            const dthB = ((sxB + syB) & 1) === 0 ? 0 : 5;
            const ehNervuraB = ((syB - minCamY) % 14) === 0;
            const cBaseB = distBordaB === 1 ? palBainhaF4.crista : ehNervuraB ? palBainhaF4.sombra : palBainhaF4.casca;
            let brR = Math.min(255, cBaseB[0] + dthB);
            let brG = Math.min(255, cBaseB[1] + dthB);
            let brB = Math.min(255, cBaseB[2] + dthB);
            if (ehTouchdown && usarSilhuetaMoldadaSteam && syB >= 220) {
              brR = Math.round(brR * 0.65 + 6);
              brG = Math.round(brG * 0.76 + 16);
              brB = Math.round(brB * 0.84 + 26);
            }
            putPx(sxB, syB, [brR, brG, brB, 255]);
          }
        }
        xB0Ant = xB0;
        xB1Ant = xB1;
      }

      if (idCarcaca === "COURACA_LIMIAR") {
        const yCentroTubo = Math.round((minCamY + maxCamY) / 2);
        const [, rowMaxCentro] = obterLimitesXCamarasLinha(yCentroTubo);
        const xIniTubo = rowMaxCentro + (usarSilhuetaMoldadaSteam ? 8 : 10);
        const xFimTubo = xIniTubo + 32;
        for (let dyT = -11; dyT <= 11; dyT += 1) {
          const absDy = Math.abs(dyT);
          const compLinha = absDy <= 6 ? 32 : absDy <= 9 ? 26 - (absDy - 6) * 2 : 16;
          for (let dxT = 0; dxT <= compLinha; dxT += 1) {
            const pxT = xIniTubo + dxT;
            const pyT = yCentroTubo + dyT;
            const naBordaT = absDy === 11 || dxT === compLinha || (absDy >= 7 && dxT >= compLinha - 1);
            if (naBordaT) {
              putPx(pxT, pyT, [8, 14, 20, 255]);
            } else if (dxT >= compLinha - 5 && absDy <= 5) {
              putPx(pxT, pyT, absDy <= 2 ? [14, 32, 44, 255] : ((pxT + pyT) & 1) === 0 ? CYAN : AMBER);
            } else if ((dxT % 7) === 4 && absDy <= 8) {
              putPx(pxT, pyT, [182, 122, 48, 255]);
            } else {
              let cTubo = dyT < -3 ? [126, 86, 52] : dyT <= 3 ? [88, 58, 38] : [52, 36, 28];
              if (ehVarianteCascoB && aplicarPinturaFaccaoTipoB) {
                cTubo = aplicarPinturaFaccaoTipoB(idCarcaca, cTubo[0], cTubo[1], cTubo[2]);
              }
              if (ehTouchdown && usarSilhuetaMoldadaSteam && pyT >= 220) {
                cTubo = [Math.round(cTubo[0] * 0.65 + 6), Math.round(cTubo[1] * 0.76 + 16), Math.round(cTubo[2] * 0.84 + 26)];
              }
              putPx(pxT, pyT, [cTubo[0], cTubo[1], cTubo[2], 255]);
            }
          }
        }
        lineSeg(xFimTubo - 2, yCentroTubo - 7, xFimTubo + 6, yCentroTubo - 4, AMBER, false);
        lineSeg(xFimTubo - 2, yCentroTubo + 7, xFimTubo + 6, yCentroTubo + 4, AMBER, false);
      }

      for (let sy = minCamY; sy < maxCamY; sy += 1) {
        const [vaoX0, vaoX1] = obterLimitesXCamarasLinha(sy);
        for (let sx = vaoX0; sx < vaoX1; sx += 1) {
          const dentroCam = hbCamaras.some(
            (hc) => sx >= hc.x && sx < hc.x + hc.largura && sy >= hc.y + deslSubTick && sy < hc.y + hc.altura + deslSubTick
          );
          if (dentroCam) continue;
          const dthVao = ((sx + sy) & 1) === 0 ? 0 : 4;
          let vr = palBainhaF4.sombra[0] + dthVao;
          let vg = palBainhaF4.sombra[1] + dthVao;
          let vb = palBainhaF4.sombra[2] + dthVao;
          if (ehTouchdown && usarSilhuetaMoldadaSteam && sy >= 220) {
            vr = Math.round(vr * 0.65 + 6);
            vg = Math.round(vg * 0.76 + 16);
            vb = Math.round(vb * 0.84 + 26);
          }
          putPx(sx, sy, [vr, vg, vb, 255]);
        }
      }
      if (ehTouchdown && usarSilhuetaMoldadaSteam) {
        const yAguaTdF4 = 219;
        for (let sxW4 = 186; sxW4 <= (ehChefeDraga ? 602 : 634); sxW4 += 1) {
          const yOnda4 = yAguaTdF4 + Math.round(Math.sin(sxW4 * 0.09 + tempoSeg * 4.2) * 1.1);
          const ox4 = sxW4 - destX0;
          const oy4 = yOnda4 - destY0;
          const tocaCascoF4 =
            ox4 >= 0 && ox4 < wCascoDst && oy4 >= 0 && oy4 < hCascoDst &&
            (opacosCasco[oy4 * wCascoDst + ox4] === 1 || opacosCasco[oy4 * wCascoDst + ox4] === 2);
          if (tocaCascoF4) {
            putPx(sxW4, yOnda4 - 1, (sxW4 % 3) === 0 ? TXT : CYAN);
            putPx(sxW4, yOnda4, (sxW4 & 1) === 0 ? TXT : CYAN);
            putPx(sxW4, yOnda4 + 1, [48, 152, 180, 235]);
          } else {
            putPx(sxW4, yOnda4, (sxW4 % 4) === 0 ? CYAN : TXT);
            putPx(sxW4, yOnda4 + 1, (sxW4 & 1) === 0 ? TXT : CYAN);
            if ((sxW4 % 3) === 0) putPx(sxW4, yOnda4 + 2, [44, 138, 166, 255]);
          }
        }
      }
      if (idCarcaca === "COURACA_LIMIAR") {
        const yAsa = ehTouchdown ? 388 : ehMonstroAlvo ? 384 : 396;
        const cxAsa = 452;
        const meiaAsa = 90;
        for (let dxA = -meiaAsa; dxA <= meiaAsa; dxA += 1) {
          const fracA = Math.abs(dxA) / meiaAsa;
          const curvY = fracA > 0.72 ? 2 : fracA > 0.42 ? 1 : 0;
          const espAsa = fracA > 0.85 ? 2 : fracA > 0.6 ? 3 : fracA > 0.3 ? 4 : 5;
          const sxA = cxAsa + dxA;
          const yTopA = yAsa + curvY;
          putPx(sxA, yTopA - 1, [7, 18, 25, 255]);
          putPx(sxA, yTopA, fracA < 0.78 ? [62, 138, 158, 255] : [38, 96, 116, 255]);
          for (let dyA = 1; dyA < espAsa; dyA += 1) {
            const ehSombra = dyA === espAsa - 1;
            const dthA = ((sxA + yTopA + dyA) & 1) === 0;
            putPx(
              sxA,
              yTopA + dyA,
              ehSombra
                ? (dthA ? [18, 48, 62, 255] : [14, 38, 50, 255])
                : (dthA ? [32, 82, 100, 255] : [24, 64, 80, 255])
            );
          }
          putPx(sxA, yTopA + espAsa, [7, 18, 25, 255]);
        }
      }
    }

    const desenharAliadoAnimado = (tr, cx, cy, altMax, largMax, reparando, emCombateSala, camSeca, pos60 = null) => {
      const posePadrao =
        tr.especie === "BAIACU"
          ? (tr.inflado ? 3 : (f4Anim % 2))
          : tr.especie === "POLVO"
            ? (reparando ? (f4Anim % 2 === 0 ? 2 : 0) : emCombateSala ? 3 : (f4Anim % 2))
            : tr.especie === "CARANGUEJO"
              ? (emCombateSala ? (f4Anim % 2 === 0 ? 3 : 2) : (f4Anim === 3 ? 2 : f4Anim % 2))
              : (emCombateSala ? 3 : (f4Anim % 4));
      const poseIdx = Number.isInteger(pos60?.poseIndice4F) ? pos60.poseIndice4F : posePadrao;
      const espelhar = Boolean(pos60?.espelharX);
      const dyBob = tr.inflado || camSeca ? 0 : ((f4Anim + (tr.id?.charCodeAt(5) ?? 0)) % 2 === 1 ? -1 : 0);
      const achatarSeco = Boolean(camSeca && tr.especie !== "BAIACU" && tr.especie !== "CARANGUEJO");
      const okPose = desenharPersonagemPose4F(
        tr.especie,
        poseIdx,
        cx,
        cy + dyBob,
        Math.min(34, largMax + 4),
        Math.min(25, altMax + 3),
        espelhar,
        achatarSeco
      );
      if (!okPose) {
        const ret = assets.retratos?.[tr.especie];
        if (ret) {
          const altAlvo = Math.min(23, altMax);
          const largAlvo = Math.min(largMax, 29);
          const xIni = Math.round(cx - largAlvo / 2);
          const yIni = Math.round(cy - altAlvo / 2) + dyBob;
          const u0 = tr.especie === "BAIACU" && tr.inflado ? 0.36 : 0.0;
          const v0 = tr.especie === "BAIACU" && tr.inflado ? 0.28 : 0.0;
          const uSpan = tr.especie === "BAIACU" && tr.inflado ? 0.62 : 1.0;
          const vSpan = tr.especie === "BAIACU" && tr.inflado ? 0.68 : 1.0;
          desenharRetratoRecortadoHiBit(ret, xIni, yIni, largAlvo, altAlvo, u0, v0, uSpan, vSpan);
        } else {
          const matAliado = ATLAS_4F[tr.especie]?.quadros?.[f4Anim]?.matrizPixels ?? SPRITES_HB[tr.especie];
          blitMatrizToken(matAliado, Math.round(cx - 10), Math.round(cy - 9) + dyBob, 2, altMax < 24 ? 1 : 2);
        }
      }
      if (reparando && tr.especie === "POLVO") {
        const sxF = Math.round(cx + (espelhar ? -9 : 9));
        const syF = Math.round(cy - 4 + (f4Anim % 2));
        putPx(sxF, syF, TXT);
        putPx(sxF + 1, syF - 1, YELLOW);
        putPx(sxF - 1, syF + 1, CYAN);
        if ((f4Anim & 1) === 0) putPx(sxF + 2, syF + 1, AMBER);
      } else if (tr.especie === "ARRAIA" && poseIdx === 3) {
        const sxE = Math.round(cx);
        const syE = Math.round(cy - 6);
        putPx(sxE - 6, syE, YELLOW);
        putPx(sxE + 6, syE + 1, CYAN);
        putPx(sxE, syE - 2, TXT);
      }
      if (camSeca && tr.especie !== "CARANGUEJO") {
        const gx = Math.round(cx);
        const gy = Math.round(cy - Math.min(11, Math.floor(altMax / 2)));
        putPx(gx, gy - 2, RED);
        fillRect(gx - 1, gy - 1, gx + 1, gy, (f4Anim & 1) === 0 ? RED : AMBER);
      }
    };

    const desenharInvasorAnimado = (inv, cx, cy, altMax, largMax, emCombateSala, pos60 = null) => {
      const posePadrao = emCombateSala ? (2 + (f4Anim % 2)) : (f4Anim % 2);
      const poseIdx = Number.isInteger(pos60?.poseIndice4F) ? pos60.poseIndice4F : posePadrao;
      const espelhar = pos60?.espelharX !== undefined ? Boolean(pos60.espelharX) : false;
      const dyInv = (f4Anim + (inv.id?.charCodeAt(4) ?? 0)) % 2 ? -1 : 0;
      const okPose = desenharPersonagemPose4F(
        inv.especie ?? "MARINHEIRO",
        poseIdx,
        cx,
        cy + dyInv,
        Math.min(32, largMax + 4),
        Math.min(24, altMax + 3),
        espelhar,
        false
      );
      if (!okPose) {
        const spInv = assets.iconesHiBit?.[inv.especie] ?? assets.iconesHiBit?.MARINHEIRO;
        if (spInv) {
          blitIconeHiBit(spInv, Math.round(cx - spInv.largura / 2), Math.round(cy - spInv.altura / 2) + dyInv, false);
        } else {
          const matInv = ATLAS_4F[inv.especie]?.quadros?.[f4Anim]?.matrizPixels ?? SPRITES_HB.MARINHEIRO;
          blitMatrizToken(matInv, Math.round(cx - 8), Math.round(cy - 8) + dyInv, 2, altMax < 26 ? 1 : 2);
        }
      }
    };

    const hbCamPorId = new Map(hbCamaras.map((h) => [h.metadados.camaraId, h]));
    const sysBrqCena = (viewModel.caixaSistemas ?? []).find((s) => (s.id ?? s.sistemaId) === "BOMBA_BRANQUIAL");
    const brqLigadoCena = Number(sysBrqCena?.barrasEnergiaAlocada ?? 0) >= 1;

    if (usarEspinhaClassicaOnda6 && hbCamPorId.has(1) && hbCamPorId.has(7) && hbCamPorId.has(6) && hbCamPorId.has(8)) {
      const hb1 = hbCamPorId.get(1);
      const hb7 = hbCamPorId.get(7);
      const hb6 = hbCamPorId.get(6);
      const hb8 = hbCamPorId.get(8);
      const xSp0 = hb1.x + hb1.largura;
      const xSp1 = hb7.x - 1;
      const cxSp = Math.round((xSp0 + xSp1) / 2);
      const ySp0 = Math.min(hb1.y, hb7.y) + deslSubTick + 2;
      const ySp1 = Math.max(hb6.y + hb6.altura - 1, hb8.y + hb8.altura - 1) + deslSubTick - 2;

      if (xSp1 >= xSp0) {
        for (let pyS = ySp0; pyS <= ySp1; pyS += 1) {
          const ehAnelVertebral = ((pyS - ySp0) % 9) === 0;
          for (let pxS = xSp0; pxS <= xSp1; pxS += 1) {
            const distC = Math.abs(pxS - cxSp);
            if (pxS === xSp0 || pxS === xSp1) {
              putPx(pxS, pyS, [9, 15, 22, 255]);
            } else if (ehAnelVertebral) {
              putPx(pxS, pyS, distC <= 3 ? [72, 46, 48, 255] : [30, 22, 28, 255]);
            } else if (distC <= 2) {
              putPx(pxS, pyS, ((pxS + pyS) & 1) === 0 ? [56, 36, 40, 255] : [46, 30, 36, 255]);
            } else {
              putPx(pxS, pyS, [32, 22, 28, 255]);
            }
          }
        }
      }

      for (const [idSup, idInf] of [[1, 2], [2, 4], [4, 6], [7, 3], [3, 5], [5, 8]]) {
        const hSup = hbCamPorId.get(idSup);
        const hInf = hbCamPorId.get(idInf);
        if (!hSup || !hInf) continue;
        const yr0 = hSup.y + hSup.altura + deslSubTick;
        const yr1 = hInf.y - 1 + deslSubTick;
        const xr0 = hInf.x + 2;
        const xr1 = hInf.x + hInf.largura - 3;
        for (let pyR = yr0; pyR <= yr1; pyR += 1) {
          const ehCrista = pyR === yr0 + 1;
          const ehSutura = pyR === yr0 || pyR === yr1;
          for (let pxR = xr0; pxR <= xr1; pxR += 1) {
            if (ehSutura) {
              putPx(pxR, pyR, [9, 15, 22, 255]);
            } else if (ehCrista) {
              putPx(pxR, pyR, ((pxR + pyR) & 1) === 0 ? [68, 44, 46, 255] : [54, 34, 38, 255]);
            } else {
              putPx(pxR, pyR, [38, 26, 32, 255]);
            }
          }
        }
      }
    } else if (!specF4 && hbCamaras.length > 0) {
      // Na Edição Steam, CARCACA_ALFA_A/B usa câmaras moldadas assimétricas; mascara o wireframe 2x4 legado assado em f1Play/f2Touchdown
      const gradeLegado = calcularLayoutPlacaCamaras960(ehTouchdown, ehMonstroAlvo);
      const gx0 = gradeLegado.xEsq - 2;
      const gx1 = gradeLegado.xDir + gradeLegado.larguraCam + 1;
      const gy0 = gradeLegado.toposY[0] - 2 + deslCascoAlfa;
      const gy1 = gradeLegado.toposY[3] + gradeLegado.alturasY[3] + 1 + deslCascoAlfa;
      const cxMeioAlfa = Math.round((gx0 + gx1) * 0.5);
      for (let pyM = gy0; pyM <= gy1; pyM += 1) {
        if (pyM < 42 || pyM > 426) continue;
        const ehNervuraM = ((pyM - gy0) % 11) === 0;
        const naBordaY = pyM === gy0 || pyM === gy1;
        for (let pxM = gx0; pxM <= gx1; pxM += 1) {
          const naBordaX = pxM === gx0 || pxM === gx1;
          if (naBordaX || naBordaY) {
            putPx(pxM, pyM, [9, 15, 22, 255]);
          } else {
            const distC = Math.abs(pxM - cxMeioAlfa);
            const dthM = ((pxM + pyM) & 1) === 0 ? 0 : 4;
            const baseM = distC <= 5
              ? (ehNervuraM ? [74, 46, 48] : [54, 34, 38])
              : ehNervuraM
                ? [64, 40, 44]
                : [42, 26, 32];
            let mr = baseM[0] + dthM;
            let mg = baseM[1] + dthM;
            let mb = baseM[2] + dthM;
            if (ehVarianteCascoB && aplicarPinturaFaccaoTipoB) {
              [mr, mg, mb] = aplicarPinturaFaccaoTipoB(idCarcaca, mr, mg, mb);
            }
            if (ehTouchdown && pyM >= 220) {
              mr = Math.round(mr * 0.62 + 6);
              mg = Math.round(mg * 0.74 + 18);
              mb = Math.round(mb * 0.82 + 28);
            }
            putPx(pxM, pyM, [mr, mg, mb, 255]);
          }
        }
      }
      for (let andarL = 0; andarL < 4; andarL += 1) {
        const yMeioAndar = gradeLegado.toposY[andarL] + Math.floor(gradeLegado.alturasY[andarL] / 2) + deslCascoAlfa;
        for (const xV0 of [gradeLegado.xValvEsq - 1, gradeLegado.xValvDir - 1]) {
          for (let pyV = yMeioAndar - 10; pyV <= yMeioAndar + 10; pyV += 1) {
            if (pyV < 42 || pyV > 426) continue;
            for (let pxV = xV0; pxV <= xV0 + 18; pxV += 1) {
              const dthV = ((pxV + pyV) & 1) === 0 ? 0 : 5;
              let vr = 52 + dthV;
              let vg = 32 + dthV;
              let vb = 36 + dthV;
              if (ehVarianteCascoB && aplicarPinturaFaccaoTipoB) {
                [vr, vg, vb] = aplicarPinturaFaccaoTipoB(idCarcaca, vr, vg, vb);
              }
              if (ehTouchdown && pyV >= 220) {
                vr = Math.round(vr * 0.62 + 6);
                vg = Math.round(vg * 0.74 + 18);
                vb = Math.round(vb * 0.82 + 28);
              }
              putPx(pxV, pyV, [vr, vg, vb, 255]);
            }
          }
        }
      }
    }

    const nadadoresSubTick = [];
    const invasoresSubTick = [];
    for (const cam of viewModel.camaras ?? []) {
      const hbCam = hbCamaras.find((h) => h.metadados.camaraId === cam.id);
      if (!hbCam) continue;
      const yTopoCam = hbCam.y + deslSubTick;
      const yBaseCam = hbCam.y + hbCam.altura - 1 + deslSubTick;
      const ix0 = hbCam.x + 3;
      const ix1 = hbCam.x + hbCam.largura - 4;
      const alturaCabecalho = 12;
      const iy0 = hbCam.y + alturaCabecalho + deslSubTick;
      const iy1 = hbCam.y + hbCam.altura - 3 + deslSubTick;
      const altInt = Math.max(1, iy1 - iy0 + 1);
      const fracAgua = Math.max(0, Math.min(1, Number(cam.nivelAguaPct ?? 100) / 100));
      const linhaNivelAguaY = iy1 - Math.round(fracAgua * (yBaseCam - 2 - (yTopoCam + 3))) + 1;
      const camSeca = Number(cam.aguaKg ?? 12.5) <= 0.01 || fracAgua <= 0.02;
      const corSeco = [12, 20, 28, 255];
      const corAgua = cam.oxigenioPct < 20 ? [68, 34, 96, 255] : [24, 68, 86, 255];
      const corAguaBorda = cam.oxigenioPct < 20 ? VIOLET : CYAN;

      const altTotCam = yBaseCam - yTopoCam;
      const emReflexoVerde = cam.id === 3 && brqLigadoCena && (viewModel.telemetriaBioReflexo?.alertaReflexoBranquialSeg ?? 0) > 0;
      const emHoverCam = idHoverAtivo === hbCam.idHitbox;
      const corAnelQuitina = emHoverCam
        ? YELLOW
        : cam.brechaAtiva
          ? RED
          : cam.curtoCircuitoAtivo
            ? YELLOW
            : emReflexoVerde
              ? GREEN
              : [64, 44, 48, 255];
      const corAnelSombra = emHoverCam || cam.brechaAtiva || cam.curtoCircuitoAtivo || emReflexoVerde
        ? corAnelQuitina
        : [36, 26, 32, 255];

      for (let dyC = 0; dyC <= altTotCam; dyC += 1) {
        const py = yTopoCam + dyC;
        const distV = Math.min(dyC, altTotCam - dyC);
        const recExt = distV === 0 ? 3 : distV === 1 ? 2 : distV === 2 ? 1 : 0;
        const lx0 = hbCam.x + recExt;
        const lx1 = hbCam.x + hbCam.largura - 1 - recExt;
        for (let px = lx0; px <= lx1; px += 1) {
          const distH = Math.min(px - lx0, lx1 - px);
          if (dyC === 0 || dyC === altTotCam || distH === 0) {
            putPx(px, py, [7, 12, 18, 255]);
          } else if (dyC === 1 || dyC === altTotCam - 1 || distH === 1) {
            putPx(px, py, dyC <= Math.floor(altTotCam * 0.45) ? corAnelQuitina : corAnelSombra);
          } else {
            const elevMenisco = (px <= lx0 + 4 || px >= lx1 - 4) ? -1 : 0;
            const ondSup = fracAgua > 0.04 && fracAgua < 0.98
              ? Math.round(Math.sin(px * 0.24 + tempoSeg * 5.4 + cam.id) * 0.6)
              : 0;
            const ySupLocal = linhaNivelAguaY + elevMenisco + ondSup;
            if (py < ySupLocal || fracAgua <= 0.01) {
              const ehEstriaSeca = ((px - hbCam.x) % 13) === 0 && ((py + px) & 1) === 0;
              putPx(px, py, ehEstriaSeca ? [18, 28, 38, 255] : corSeco);
            } else if (py === ySupLocal && fracAgua < 0.99) {
              putPx(px, py, (px & 1) === 0 ? corAguaBorda : [62, 168, 196, 255]);
            } else {
              const dither = ((px + py) & 1) === 0 ? 0 : -5;
              putPx(px, py, [corAgua[0] + dither, corAgua[1] + dither, corAgua[2] + dither, 255]);
            }
          }
        }
      }

      const corBioCam = {
        CARCACA_ALFA: [46, 134, 152, 135],
        MANTA_VOLT: [72, 198, 232, 145],
        COURACA_LIMIAR: [204, 138, 48, 140],
        SOMBRA_ABISSAL: [142, 78, 206, 145],
        COLMEIA_VIVA: [74, 204, 116, 145],
      }[idCarcaca] ?? [46, 134, 152, 135];
      for (const dxCost of [6, Math.floor(hbCam.largura / 2), hbCam.largura - 7]) {
        putPx(hbCam.x + dxCost, iy0 + 1, [76, 48, 50, 210]);
        putPx(hbCam.x + dxCost, iy1 - 1, [48, 30, 34, 210]);
      }
      putPx(ix0 + 1, iy0 + 2, corBioCam);
      putPx(ix1 - 1, iy0 + 2, corBioCam);
      putPx(ix0 + 1, iy1 - 2, corBioCam);
      putPx(ix1 - 1, iy1 - 2, corBioCam);
      if (usarSilhuetaMoldadaSteam) {
        const yPisoSub = iy1 - 1;
        if (cam.id === 1) {
          for (let sxA = ix0 + 4; sxA <= ix1 - 4; sxA += 6) {
            putPx(sxA, yPisoSub, [196, 118, 42, 165]);
            putPx(sxA + 1, yPisoSub, [96, 58, 34, 150]);
          }
        } else if (cam.id === 2) {
          for (let sxC = ix0 + 5; sxC <= ix1 - 5; sxC += 8) {
            putPx(sxC, yPisoSub, [64, 198, 224, 155]);
            putPx(sxC, iy0 + 2, [44, 136, 164, 130]);
          }
        } else if (cam.id === 3) {
          for (let dyG = 3; dyG <= Math.min(altInt - 3, 12); dyG += 3) {
            putPx(ix0 + 2, iy0 + dyG, [66, 206, 174, 155]);
            putPx(ix1 - 2, iy0 + dyG, [66, 206, 174, 155]);
          }
        } else if (cam.id === 4) {
          for (let sxB = ix0 + 6; sxB <= ix1 - 6; sxB += 7) {
            putPx(sxB, yPisoSub, [72, 224, 146, 155]);
          }
        } else if (cam.id === 5) {
          for (let sxS = ix0 + 4; sxS <= ix1 - 4; sxS += 5) {
            putPx(sxS, yPisoSub, (sxS & 1) === 0 ? [58, 178, 208, 160] : [188, 118, 44, 155]);
          }
        } else if (cam.id === 6) {
          for (let sxK = ix0 + 3; sxK <= ix1 - 3; sxK += 4) {
            putPx(sxK, yPisoSub, [92, 62, 54, 175]);
          }
        }
      }
      const nvBlind = Math.max(0, Number(viewModel.nivelBlindagem ?? 0));
      if (nvBlind > 0) {
        const xBlind = cam.coluna === 0 ? hbCam.x - 2 : hbCam.x + hbCam.largura + 1;
        for (let bly = yTopoCam + 4; bly <= yBaseCam - 4; bly += 3) {
          putPx(xBlind, bly, nvBlind >= 2 ? YELLOW : AMBER);
          putPx(xBlind, bly + 1, [92, 66, 36, 255]);
        }
      }

      if (!camSeca && brqLigadoCena && fracAgua > 0.3) {
        for (let ib = 0; ib < 2; ib += 1) {
          const bxO = ix0 + 8 + ((cam.id * 19 + ib * 31) % Math.max(8, ix1 - ix0 - 14));
          const byO = iy1 - 2 - (((Math.round(tempoSeg * 14) + cam.id * 5 + ib * 7)) % Math.max(4, Math.min(altInt - 2, iy1 - linhaNivelAguaY + 1)));
          if (byO > linhaNivelAguaY && byO <= iy1) {
            putPx(bxO, byO, ib === 0 ? CYAN : [94, 242, 196, 200]);
          }
        }
      }

      for (let pyH = yTopoCam + 2; pyH <= iy0 - 1; pyH += 1) {
        const tFade = (pyH - (yTopoCam + 2)) / Math.max(1, (iy0 - 1) - (yTopoCam + 2));
        const alphaVelo = Math.round(182 * (1 - tFade * 0.55));
        const distVH = pyH - yTopoCam;
        const recH = distVH === 2 ? 2 : 1;
        for (let pxH = hbCam.x + 1 + recH; pxH <= hbCam.x + hbCam.largura - 2 - recH; pxH += 1) {
          putPx(pxH, pyH, [7, 13, 20, alphaVelo]);
        }
      }
      const mapRotCam = {
        1: "ARTILHARIA",
        2: "CÓRTEX",
        3: "BRANQUIAL",
        4: "BARREIRA",
        5: "SIFÃO",
        6: "POÇO QUILHA",
        7: "ENXERTO A",
        8: "ENXERTO B",
      };
      const idiomaCamBase = viewModel.configuracoesSteam?.idioma ?? opcoes.idioma ?? "pt-BR";
      const usarRotuloCurtoSteam = Boolean(viewModel.edicaoComercialSteam || idiomaCamBase === "en-US");
      const subInstaladoCam = Number(cam.barrasNivelMax ?? 0) > 0;
      const rotuloTopoCam = usarRotuloCurtoSteam
        ? (cam.id === 7 && subInstaladoCam
            ? (idiomaCamBase === "en-US" ? "BOARDING" : "ESCLUSA")
            : cam.id === 8 && subInstaladoCam
              ? (idiomaCamBase === "en-US" ? "CLOAKING" : "FURTIVA")
              : obterRotuloCurtoCamara(cam.id, idiomaCamBase))
        : (mapRotCam[cam.id] ?? "CÂMARA");
      txt(hbCam.x + 4, yTopoCam + 3, String(cam.id), CYAN, 6);
      txt(hbCam.x + 12, yTopoCam + 3, rotuloTopoCam, TXT, 6);

      const aliadosSala = cam.tripulantesPresentes ?? [];
      const invasoresSala = cam.invasoresPresentes ?? [];
      const emCombateSala = aliadosSala.length > 0 && invasoresSala.length > 0;
      const estacionarios = [];
      for (const tr of aliadosSala) {
        const pos60 = ev60?.posicoesTripulantes?.[tr.id];
        if (pos60?.nadando) {
          nadadoresSubTick.push({
            tr,
            pos60,
            reparando: false,
            camSeca: Boolean(pos60.rastejandoNoSeco || camSeca),
          });
        } else {
          estacionarios.push({ tipo: "ALIADO", dados: tr, pos60 });
        }
      }
      for (const inv of invasoresSala) {
        const posInv60 = ev60?.posicoesInvasores?.[inv.id];
        if (posInv60?.nadando) {
          invasoresSubTick.push({ inv, pos60: posInv60 });
        } else {
          estacionarios.push({ tipo: "INVASOR", dados: inv, pos60: posInv60 });
        }
      }
      const maxOcupantesSala = viewModel.edicaoComercialSteam
        ? Math.max(2, Math.min(4, Number(viewModel.limitesPorSala?.[cam.id] ?? 2)))
        : 2;
      const ocupantes = estacionarios.slice(0, maxOcupantesSala);
      const idsSelEsquadrao = Array.isArray(opcoes.tripulantesSelecionadosIds) ? opcoes.tripulantesSelecionadosIds : [];

      if (ocupantes.length === 0 && aliadosSala.length === 0 && invasoresSala.length === 0) {
        desenharBulboNeuralHiBit(
          ix0 + Math.floor((ix1 - ix0 - 15) / 2),
          iy0 + Math.max(0, Math.floor((altInt - 13) / 2))
        );
      } else {
        ocupantes.forEach((oc, slotIdx) => {
          const largUtilCam = ix1 - ix0 + 1;
          const grade2x2 = ocupantes.length > 2;
          const gradeCompactaHoriz =
            Boolean(viewModel.edicaoComercialSteam) && grade2x2 && altInt <= 44 && largUtilCam >= 54;
          const colSlot = gradeCompactaHoriz ? slotIdx : grade2x2 ? (slotIdx & 1) : slotIdx;
          const linSlot = gradeCompactaHoriz ? 0 : grade2x2 ? (slotIdx >> 1) : 0;
          const largSlot = gradeCompactaHoriz
            ? Math.max(12, Math.floor((largUtilCam - 2) / ocupantes.length))
            : ocupantes.length === 1
              ? Math.min(36, largUtilCam - 4)
              : Math.floor((largUtilCam - 4) / 2);
          const xSlot = gradeCompactaHoriz
            ? ix0 + 1 + colSlot * largSlot
            : ocupantes.length === 1
              ? ix0 + Math.floor((largUtilCam - largSlot) / 2)
              : ix0 + 1 + colSlot * (largSlot + 2);
          const yCentroGrade = gradeCompactaHoriz
            ? iy0 + Math.round(altInt * ((slotIdx & 1) === 0 ? 0.42 : 0.60))
            : grade2x2
              ? iy0 + (linSlot === 0 ? Math.max(8, Math.floor(altInt * 0.29)) : Math.min(altInt - 7, Math.floor(altInt * 0.74)))
              : iy0 + altInt / 2;
          const altSlotRender = gradeCompactaHoriz
            ? Math.max(13, Math.min(18, altInt - 6))
            : grade2x2
              ? Math.max(16, Math.floor(altInt * 0.56))
              : altInt;
          if (oc.tipo === "ALIADO") {
            const tr = oc.dados;
            const pos60 = oc.pos60;
            const cxTr = ocupantes.length === 1 && pos60 ? pos60.x : xSlot + largSlot / 2;
            const cyTr = ocupantes.length === 1 && pos60 ? pos60.y + deslSubTick : yCentroGrade;
            desenharAliadoAnimado(
              tr,
              cxTr,
              cyTr,
              altSlotRender,
              largSlot,
              Boolean(!emCombateSala && (cam.brechaAtiva || cam.barrasIntegridade < cam.barrasNivelMax)),
              emCombateSala,
              camSeca,
              pos60
            );
            if (viewModel.edicaoComercialSteam) {
              const nvM = Math.max(0, Math.min(2, Number(tr.nivelMaestria ?? 0)));
              if (nvM > 0) {
                const sxM = Math.round(cxTr) + 6;
                const syM = Math.max(iy0 + 2, Math.round(cyTr) - 8);
                for (let st = 0; st < nvM; st += 1) {
                  const pxSt = sxM - st * 6;
                  fillRect(pxSt - 2, syM - 2, pxSt + 2, syM + 2, [10, 14, 20, 236]);
                  putPx(pxSt, syM - 2, [255, 224, 72, 255]);
                  hLine(pxSt - 2, pxSt + 2, syM - 1, [255, 214, 52, 255], 1);
                  hLine(pxSt - 1, pxSt + 1, syM, [255, 232, 112, 255], 1);
                  putPx(pxSt, syM - 1, [255, 250, 192, 255]);
                  putPx(pxSt - 1, syM + 1, [242, 174, 34, 255]);
                  putPx(pxSt + 1, syM + 1, [242, 174, 34, 255]);
                }
              }
              if (idsSelEsquadrao.length > 1 && idsSelEsquadrao.includes(tr.id)) {
                const bxS = Math.round(cxTr);
                const byS = Math.round(cyTr);
                hLine(bxS - 7, bxS - 4, byS - 8, CYAN, 1);
                hLine(bxS + 4, bxS + 7, byS + 7, CYAN, 1);
              }
            }
          } else {
            const inv = oc.dados;
            const cxInv = ocupantes.length === 1 && oc.pos60 ? oc.pos60.x : xSlot + largSlot / 2;
            const cyInv = ocupantes.length === 1 && oc.pos60 ? oc.pos60.y + deslSubTick : yCentroGrade;
            desenharInvasorAnimado(inv, cxInv, cyInv, altSlotRender, largSlot, emCombateSala, oc.pos60);
          }
        });
        if (emCombateSala) {
          const mxC = Math.round((ix0 + ix1) / 2);
          const myC = Math.round(iy0 + altInt / 2);
          if ((f4Anim & 1) === 0) {
            lineSeg(mxC - 3, myC - 3, mxC + 3, myC + 3, YELLOW, false);
            putPx(mxC, myC, TXT);
          } else {
            lineSeg(mxC - 3, myC + 3, mxC + 3, myC - 3, AMBER, false);
            putPx(mxC, myC, RED);
          }
        }
      }

      if (cam.aguaKg > 0 && cam.oxigenioPct < 55) {
        hLine(ix0 + 2, ix1 - 2, iy1, VIOLET, 1);
      }
      if (cam.brechaAtiva) {
        const xRombo = cam.coluna === 0 ? hbCam.x : hbCam.x + hbCam.largura - 3;
        fillRect(xRombo, iy0 + 2, xRombo + 2, Math.min(iy1, iy0 + 11), RED);
        putPx(xRombo + 1, iy0 + 6, YELLOW);
      }

      const hbValv = hbValvulas.find((v) => v.metadados.camaraId === cam.id);
      if (hbValv) {
        const dyPv = (idPressAtivo === hbValv.idHitbox ? 1 : 0) + deslSubTick;
        const hovV = idHoverAtivo === hbValv.idHitbox;
        const ehEsqV = cam.coluna === 0;
        const vx0V = hbValv.x;
        const vx1V = hbValv.x + hbValv.largura - 1;
        const vy0V = hbValv.y + dyPv;
        const vy1V = hbValv.y + hbValv.altura - 1 + deslSubTick;
        const altV = vy1V - vy0V;
        const corLabio = hovV ? YELLOW : cam.iconeCadeadoVisivel ? AMBER : cam.valvulaExternaAberta ? GREEN : [196, 108, 32, 255];
        for (let rV = 0; rV <= altV; rV += 1) {
          const dBordaV = Math.min(rV, altV - rV);
          const afunilaExt = dBordaV === 0 ? 3 : dBordaV === 1 ? 2 : dBordaV === 2 ? 1 : 0;
          const xIniLinha = ehEsqV ? vx0V + afunilaExt : vx0V;
          const xFimLinha = ehEsqV ? vx1V : vx1V - afunilaExt;
          for (let pxV = xIniLinha; pxV <= xFimLinha; pxV += 1) {
            const naCasca = rV === 0 || rV === altV || pxV === xIniLinha || pxV === xFimLinha;
            if (naCasca) {
              putPx(pxV, vy0V + rV, hovV ? YELLOW : [7, 12, 18, 255]);
            } else if (rV === 1 || rV === altV - 1 || pxV === xIniLinha + 1 || pxV === xFimLinha - 1) {
              putPx(pxV, vy0V + rV, rV <= 2 ? [84, 52, 48, 255] : [48, 30, 34, 255]);
            } else {
              putPx(pxV, vy0V + rV, [14, 22, 30, 255]);
            }
          }
        }
        if (cam.iconeCadeadoVisivel) {
          lock(vx0V + 4, vy0V + 5, AMBER);
        } else if (cam.valvulaExternaAberta) {
          const cyEsp = Math.round((vy0V + vy1V) / 2);
          fillRect(vx0V + 3, cyEsp - 3, vx1V - 3, cyEsp + 3, [20, 96, 84, 255], GREEN);
          hLine(vx0V + 4, vx1V - 4, cyEsp, CYAN, 1);
          const dirJato = ehEsqV ? -1 : 1;
          const xBocaJato = ehEsqV ? vx0V - 1 : vx1V + 1;
          for (let j = 0; j < 3; j += 1) {
            const distJ = 1 + ((Math.round(tempoSeg * 24) + j * 3 + cam.id) % 7);
            putPx(xBocaJato + dirJato * distJ, cyEsp + (j - 1) * 2, j === 1 ? TXT : CYAN);
          }
        } else {
          const cyEsp = Math.round((vy0V + vy1V) / 2);
          hLine(vx0V + 3, vx1V - 3, cyEsp - 1, corLabio, 1);
          hLine(vx0V + 3, vx1V - 3, cyEsp, [16, 12, 18, 255], 1);
          hLine(vx0V + 3, vx1V - 3, cyEsp + 1, [142, 68, 24, 255], 1);
        }
      }
    }

    if (usarEspinhaClassicaOnda6 && hbCamPorId.has(1) && hbCamPorId.has(7) && hbCamPorId.has(6) && hbCamPorId.has(8)) {
      for (const [idE, idD] of [[1, 7], [2, 3], [4, 5], [6, 8]]) {
        const hE = hbCamPorId.get(idE);
        const hD = hbCamPorId.get(idD);
        if (!hE || !hD) continue;
        const chaveB = `${Math.min(idE, idD)}-${Math.max(idE, idD)}`;
        const dilB = Math.max(0, Math.min(1, Number(ev60?.portaisDilatados?.[chaveB] ?? 0)));
        const xp0 = hE.x + hE.largura - 2;
        const xp1 = hD.x + 1;
        const cyP = Math.round(((hE.y + 11 + Math.floor((hE.altura - 13) / 2)) + (hD.y + 11 + Math.floor((hD.altura - 13) / 2))) / 2) + deslSubTick;
        const rLum = 1 + Math.round(dilB * 3);
        hLine(xp0, xp1, cyP - rLum - 2, [7, 12, 18, 255], 1);
        hLine(xp0, xp1, cyP - rLum - 1, dilB > 0.15 ? YELLOW : [214, 118, 28, 255], 1);
        for (let dyL = -rLum; dyL <= rLum; dyL += 1) {
          const corFluxo = dilB > 0.2
            ? (dyL === 0 ? TXT : CYAN)
            : (dyL === 0 ? [58, 178, 204, 255] : [22, 74, 94, 255]);
          hLine(xp0 - 1, xp1 + 1, cyP + dyL, corFluxo, 1);
        }
        hLine(xp0, xp1, cyP + rLum + 1, dilB > 0.15 ? AMBER : [152, 62, 26, 255], 1);
        hLine(xp0, xp1, cyP + rLum + 2, [7, 12, 18, 255], 1);
      }

      for (const [idS, idI] of [[1, 2], [2, 4], [4, 6], [7, 3], [3, 5], [5, 8]]) {
        const hS = hbCamPorId.get(idS);
        const hI = hbCamPorId.get(idI);
        if (!hS || !hI) continue;
        const chaveV = `${Math.min(idS, idI)}-${Math.max(idS, idI)}`;
        const dilV = Math.max(0, Math.min(1, Number(ev60?.portaisDilatados?.[chaveV] ?? 0)));
        const cxV = hI.x + Math.floor(hI.largura / 2);
        const yv0 = hS.y + hS.altura - 2 + deslSubTick;
        const yv1 = hI.y + 1 + deslSubTick;
        const rLumV = 2 + Math.round(dilV * 4);
        for (let pyV = yv0; pyV <= yv1; pyV += 1) {
          putPx(cxV - rLumV - 2, pyV, [7, 12, 18, 255]);
          putPx(cxV - rLumV - 1, pyV, dilV > 0.15 ? YELLOW : [218, 122, 26, 255]);
          for (let dxL = -rLumV; dxL <= rLumV; dxL += 1) {
            const cLum = dilV > 0.2
              ? (Math.abs(dxL) <= 1 ? TXT : CYAN)
              : (dxL === 0 ? [58, 178, 204, 255] : [22, 74, 94, 255]);
            putPx(cxV + dxL, pyV, cLum);
          }
          putPx(cxV + rLumV + 1, pyV, dilV > 0.15 ? AMBER : [152, 62, 26, 255]);
          putPx(cxV + rLumV + 2, pyV, [7, 12, 18, 255]);
        }
      }

      const h5 = hbCamPorId.get(5);
      const h6 = hbCamPorId.get(6);
      if (h5 && h6) {
        const dil56 = Math.max(0, Math.min(1, Number(ev60?.portaisDilatados?.["5-6"] ?? 0)));
        const xBoca6 = h6.x + Math.floor(h6.largura * 0.56) + 8;
        const yBase6 = h6.y + h6.altura - 1 + deslSubTick;
        const xEsp = Math.round((h6.x + h6.largura + h5.x) / 2);
        const yOrif5 = h5.y + h5.altura - 6 + deslSubTick;
        const nosDuto = [
          [xBoca6, yBase6 - 1],
          [xBoca6 + 2, yBase6 + 4],
          [Math.round((xBoca6 + xEsp) / 2), yBase6 + 8],
          [xEsp, yBase6 + 3],
          [xEsp, h6.y + 8 + deslSubTick],
          [xEsp, yOrif5],
          [h5.x + 2, yOrif5],
        ];
        const rTubo = dil56 > 0.2 ? 3 : 2;
        const amostrarDuto = (uGlobal) => {
          const nSeg = nosDuto.length - 1;
          const pF = Math.max(0, Math.min(nSeg - 1e-6, uGlobal * nSeg));
          const idxS = Math.floor(pF);
          const fS = pF - idxS;
          return [
            Math.round(nosDuto[idxS][0] + (nosDuto[idxS + 1][0] - nosDuto[idxS][0]) * fS),
            Math.round(nosDuto[idxS][1] + (nosDuto[idxS + 1][1] - nosDuto[idxS][1]) * fS),
          ];
        };
        for (let s = 0; s <= 44; s += 1) {
          const [dxD, dyD] = amostrarDuto(s / 44);
          const ehAnel = (s % 5) === 0;
          for (let oyD = -rTubo - 1; oyD <= rTubo + 1; oyD += 1) {
            for (let oxD = -rTubo - 1; oxD <= rTubo + 1; oxD += 1) {
              const distM = Math.hypot(oxD, oyD);
              if (distM <= rTubo + 1.1 && distM > rTubo - 0.2) {
                putPx(dxD + oxD, dyD + oyD, ehAnel ? [112, 62, 48, 255] : [8, 14, 20, 255]);
              }
            }
          }
        }
        for (let s = 0; s <= 44; s += 1) {
          const uD = s / 44;
          const [dxD, dyD] = amostrarDuto(uD);
          for (let oyD = -rTubo + 1; oyD <= rTubo - 1; oyD += 1) {
            for (let oxD = -rTubo + 1; oxD <= rTubo - 1; oxD += 1) {
              if (Math.hypot(oxD, oyD) <= rTubo - 0.3) {
                putPx(dxD + oxD, dyD + oyD, dil56 > 0.15 ? CYAN : [30, 114, 142, 255]);
              }
            }
          }
          if (dil56 > 0.15) putPx(dxD, dyD, TXT);
        }
        for (let kb = 0; kb < 3; kb += 1) {
          const uBolus = ((tempoSeg * 0.95 + kb * 0.33) % 1);
          const [bxD, byD] = amostrarDuto(uBolus);
          fillRect(bxD - 1, byD - 1, bxD + 1, byD + 1, dil56 > 0.1 ? TXT : CYAN);
        }
        for (let sP = 2; sP <= 42; sP += 2) {
          const uP = sP / 44;
          const [vxP, vyP] = amostrarDuto(uP);
          const ondaPeristaltica = Math.sin(uP * 10 - tempoSeg * 5.2);
          if (ondaPeristaltica > 0.25) {
            putPx(vxP - rTubo - 2, vyP, [146, 52, 64, 215]);
            putPx(vxP + rTubo + 2, vyP, [146, 52, 64, 215]);
          }
          if ((sP % 8) === 0) {
            putPx(vxP, vyP + rTubo + 2, ondaPeristaltica > 0 ? CYAN : [72, 42, 54, 220]);
          }
        }
        chanfradoBezel(xBoca6 - 4, yBase6 - 2, xBoca6 + 4, yBase6 + 2, [28, 118, 146, 255], dil56 > 0.15 ? YELLOW : AMBER, 1);
        chanfradoBezel(h5.x - 2, yOrif5 - 3, h5.x + 3, yOrif5 + 3, [28, 118, 146, 255], dil56 > 0.15 ? YELLOW : AMBER, 1);
      }
    }

    for (const nad of nadadoresSubTick) {
      const noTubo56 = Boolean(nad.pos60.noTuboVentral);
      const dxRastro = nad.pos60.espelharX ? 1 : -1;
      for (let b = 1; b <= (noTubo56 ? 2 : 3); b += 1) {
        const corRastro = nad.camSeca ? [168, 128, 76, 210] : (b === 1 ? TXT : CYAN);
        fillRect(
          nad.pos60.x + (noTubo56 ? 0 : dxRastro * (8 + b * 4)),
          nad.pos60.y + deslSubTick + (noTubo56 ? b * 4 : ((b % 2 === 0) ? -2 : 2)),
          nad.pos60.x + (noTubo56 ? 1 : dxRastro * (8 + b * 4) + 1),
          nad.pos60.y + deslSubTick + (noTubo56 ? b * 4 + 1 : ((b % 2 === 0) ? -1 : 3)),
          corRastro
        );
      }
      if (noTubo56) {
        for (const [hxD, hyD] of [[-7, 0], [7, 0], [0, -7], [0, 7]]) {
          putPx(nad.pos60.x + hxD, nad.pos60.y + deslSubTick + hyD, CYAN);
        }
      }
      desenharAliadoAnimado(
        nad.tr,
        nad.pos60.x,
        nad.pos60.y + deslSubTick,
        noTubo56 ? 18 : 22,
        noTubo56 ? 20 : 28,
        false,
        false,
        nad.camSeca,
        nad.pos60
      );
    }
    for (const invMov of invasoresSubTick) {
      const dxRastroI = invMov.pos60.espelharX ? 1 : -1;
      for (let b = 1; b <= 2; b += 1) {
        fillRect(
          invMov.pos60.x + dxRastroI * (9 + b * 5),
          invMov.pos60.y + deslSubTick + (b === 1 ? -2 : 2),
          invMov.pos60.x + dxRastroI * (9 + b * 5) + 1,
          invMov.pos60.y + deslSubTick + (b === 1 ? -1 : 3),
          b === 1 ? YELLOW : RED
        );
      }
      desenharInvasorAnimado(invMov.inv, invMov.pos60.x, invMov.pos60.y + deslSubTick, 22, 26, false, invMov.pos60);
    }

    const idiomaCam = viewModel.configuracoesSteam?.idioma ?? opcoes.idioma ?? 'pt-BR';
    const usarRotuloCurtoFinal = Boolean(viewModel.edicaoComercialSteam || idiomaCam === 'en-US');
    const mapRotCamFinal = {
      1: 'ARTILHARIA',
      2: 'CÓRTEX',
      3: 'BRANQUIAL',
      4: 'BARREIRA',
      5: 'SIFÃO',
      6: 'POÇO QUILHA',
      7: 'ENXERTO A',
      8: 'ENXERTO B',
    };
    for (const camF of viewModel.camaras ?? []) {
      const hbCF = hbCamaras.find((h) => h.metadados.camaraId === camF.id);
      if (!hbCF) continue;
      const yTopF = hbCF.y + deslSubTick;
      for (let pyHF = yTopF + 2; pyHF <= yTopF + 11; pyHF += 1) {
        const distVHF = pyHF - yTopF;
        const recHF = distVHF === 2 ? 2 : 1;
        const alphaHF = pyHF <= yTopF + 9 ? 236 : 168;
        for (let pxHF = hbCF.x + 1 + recHF; pxHF <= hbCF.x + hbCF.largura - 2 - recHF; pxHF += 1) {
          putPx(pxHF, pyHF, [7, 13, 20, alphaHF]);
        }
      }
      const subInstFinal = Number(camF.barrasNivelMax ?? 0) > 0;
      const rotuloFinalCam = usarRotuloCurtoFinal
        ? (camF.id === 7 && subInstFinal
            ? (idiomaCam === 'en-US' ? 'BOARDING' : 'ESCLUSA')
            : camF.id === 8 && subInstFinal
              ? (idiomaCam === 'en-US' ? 'CLOAKING' : 'FURTIVA')
              : obterRotuloCurtoCamara(camF.id, idiomaCam))
        : (mapRotCamFinal[camF.id] ?? 'CÂMARA');
      txt(hbCF.x + 4, yTopF + 3, String(camF.id), CYAN, 6);
      txt(hbCF.x + 12, yTopF + 3, rotuloFinalCam, TXT, 6);
    }

    const yLinhaDaguaCena = ehTouchdown ? 219 : ehMonstroAlvo ? 336 : 332;
    const faseOndaPx = Math.round(tempoSeg * 48);
    if (Math.abs(deslSubTick) >= 2) {
      for (let spT = -64; spT <= 64; spT += 6) {
        const hPluma = 4 + (Math.abs(spT * 7) % 10);
        lineSeg(450 + spT, yLinhaDaguaCena, 450 + spT + (spT < 0 ? -4 : 4), yLinhaDaguaCena - hPluma, spT % 12 === 0 ? TXT : CYAN, false);
      }
    }
    if (tempoSeg > 0) {
      for (let iChuva = 0; iChuva < 28; iChuva += 1) {
        const rx = 160 + ((iChuva * 73 + faseOndaPx * 2) % 784);
        const ry = 46 + ((iChuva * 41 + faseOndaPx * 3) % Math.max(24, yLinhaDaguaCena - 58));
        if (ry + 5 < yLinhaDaguaCena - 4 && !(rx >= 618 && ry <= 140)) {
          lineSeg(rx, ry, rx - 3, ry + 5, [110, 152, 176, 135], false);
        }
      }
      if (!ehTouchdown) {
        for (let sp = 0; sp < 8; sp += 1) {
          const angSp = (sp / 8) * Math.PI + (tempoSeg * 7);
          const dxSp = Math.round(Math.cos(angSp) * (8 + (sp % 4) * 5));
          const dySp = Math.abs(Math.round(Math.sin(angSp) * 6));
          putPx(446 + dxSp, yLinhaDaguaCena - 2 - dySp, sp % 2 === 0 ? CYAN : TXT);
        }
      }
      for (let ic = 0; ic < 16; ic += 1) {
        const cxC = 168 + ((ic * 97 + Math.round(tempoSeg * 22)) % 770);
        const cyC = yLinhaDaguaCena + 14 + ((ic * 29) % Math.max(16, 418 - yLinhaDaguaCena));
        if (cyC < 424) hLine(cxC, cxC + 6, cyC, [48, 128, 154, 110], 1);
      }
    }

    if (viewModel.termometroSustentacao?.emCavitacao) {
      const yAsaCav = ehTouchdown ? 388 : ehMonstroAlvo ? 384 : 396;
      for (let bc = 0; bc < 10; bc += 1) {
        const bxC = 408 + ((bc * 17 + Math.round(tempoSeg * 35)) % 92);
        const byC = yAsaCav - 6 + ((bc * 7 + Math.round(tempoSeg * 24)) % 14);
        fillRect(bxC, byC, bxC + 2, byC + 2, bc % 2 === 0 ? AMBER : TXT);
      }
    }

    if ((viewModel.telemetriaBioReflexo?.furtividadeAtivaSeg ?? 0) > 0) {
      for (let ny = 118; ny <= 312; ny += 3) {
        for (let nx = 324; nx <= 566; nx += 3) {
          if (((nx + ny + Math.round(tempoSeg * 12)) % 5) === 0) {
            putPx(nx, ny, [91, 42, 134, 155]);
          }
        }
      }
    }

    renderizarSobrecomposicaoCombate60Fps(ctx, {
      placaEsq,
      perfilEsq,
      yLinhaDaguaCena,
      deslSubTick,
      brqLigadoCena,
    });
  }

  renderizarHudSuperiorTermometroERodape(ctx);

  // Modais Táticos de Campanha Completa sobre o Viewport Central (SAQUE, OFICINA & EVENTO_DESFECHO)
  const modalAtivoRender = viewModel.modalCampanhaAtivo ?? null;
  if (faseJogo === "COMBATE" && !modalAtivoRender && !viewModel.modalSteamAtivo) {
    const hbCamsJuice = (hitboxes ?? []).filter((h) => h.tipo === "CAMARA_BIONAVE").map((h) => ({
      camaraId: h.metadados.camaraId,
      x: h.x,
      y: h.y,
      largura: h.largura,
      altura: h.altura,
    }));
    const idiomaJuice = viewModel.configuracoesSteam?.idioma ?? opcoes.idioma ?? "pt-BR";
    const shDesat =
      viewModel?.configuracoesSteam?.screenShakeAtivo === false ||
      viewModel?.configuracoesSteam?.reduzirMovimento === true;
    const shXJ = shDesat ? 0 : Math.max(-6, Math.min(6, Math.round(Number(ev60?.shakeX ?? 0))));
    const shYJ = shDesat ? 0 : Math.max(-5, Math.min(5, Math.round(Number(ev60?.shakeY ?? 0))));
    rasterizarParticulasEJuiceRgba(rgba, W, H, viewModel, {
      escala: 1,
      idioma: idiomaJuice,
      reduzirMovimento: Boolean(viewModel.configuracoesSteam?.reduzirMovimento ?? opcoes.reduzirMovimento ?? false),
      retangulosCamaras960: hbCamsJuice,
      hitboxes,
      shakeX: shXJ,
      shakeY: shYJ,
      deslocamentoVerticalPx: deslSubTickCombate,
      estadoVisual60Fps: opcoes.estadoVisual60Fps ?? null,
    });
    if (viewModel.edicaoComercialSteam || idiomaJuice === "en-US") {
      for (const camZ of viewModel.camaras ?? []) {
        const hbCZ = hbCamsJuice.find((h) => h.camaraId === camZ.id);
        if (!hbCZ) continue;
        const xTopZ = hbCZ.x + shXJ;
        const yTopZ = hbCZ.y + deslSubTickCombate + shYJ;
        for (let pyZ = yTopZ + 2; pyZ <= yTopZ + 10; pyZ += 1) {
          const recZ = (pyZ - yTopZ) === 2 ? 2 : 1;
          for (let pxZ = xTopZ + 1 + recZ; pxZ <= xTopZ + hbCZ.largura - 2 - recZ; pxZ += 1) {
            putPx(pxZ, pyZ, [7, 13, 20, 232]);
          }
        }
        const subInstZ = Number(camZ.barrasNivelMax ?? 0) > 0;
        const rotCamZ =
          camZ.id === 7 && subInstZ
            ? (idiomaJuice === "en-US" ? "BOARDING" : "ESCLUSA")
            : camZ.id === 8 && subInstZ
              ? (idiomaJuice === "en-US" ? "CLOAKING" : "FURTIVA")
              : obterRotuloCurtoCamara(camZ.id, idiomaJuice);
        txt(xTopZ + 4, yTopZ + 3, String(camZ.id), CYAN, 6);
        txt(xTopZ + 12, yTopZ + 3, rotCamZ, TXT, 6);
      }
    }
  }
  if (modalAtivoRender === "SAQUE") {
    renderizarModalSaqueOverlay(ctx);
  } else if (modalAtivoRender === "OFICINA") {
    renderizarModalOficinaOverlay(ctx);
  } else if (modalAtivoRender === "EVENTO_DESFECHO") {
    renderizarModalDesfechoEventoOverlay(ctx);
  }

  if (viewModel.edicaoComercialSteam || viewModel.layoutId || viewModel.modalSteamAtivo || viewModel.tutorialSteam?.ativo) {
    rasterizarCamadasComerciaisSteamRgba(rgba, W, H, viewModel, {
      escala: 1,
      idioma: viewModel.configuracoesSteam?.idioma ?? opcoes.idioma ?? "pt-BR",
      hoverHitboxId: idHoverAtivo,
      deslocamentoVerticalPx: faseJogo === "COMBATE" ? deslSubTickCombate : 0,
      cursorGamepad960: opcoes.cursorGamepad960 ?? null,
    });
  }

  renderizarTooltipContextualEAvisoToast(ctx);

  return rgba;
}
