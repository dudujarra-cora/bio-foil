/**
 * ONDA 6 — Vitrine Técnica Steam 4-Frames (Tripulação/Invasores, Armas/Órgãos/Bio-Sistemas e Travessia 60 FPS)
 * Dono Único (Lei N5): src/onda6-ui/vitrine-spreads.mjs
 *
 * Responsabilidades:
 *  - Exportar as 3 pranchas de animação 4-frames e travessia tática 60 FPS (`exportarSpreadAnimacaoSteamPngBufferComHooks`)
 *    em resolução nativa `960x540` escalada por inteiro (`x2 -> 1920x1080` PNG sem perdas).
 */
import { clonarProfundoCongelado } from '../gdd-parser.mjs';
import {
  criarEstadoInicialPartida,
  HP_MAX_POR_ESPECIE,
} from '../onda1-fisica/estado-inicial.mjs';
import {
  calcularRotaTaticaSobrevivencia,
  FICHAS_ESPECIES_TRIPULACAO,
  CONSTANTES_TRIPULACAO,
} from '../onda2-combate/tick-tripulacao.mjs';
import { CONSTANTES_IA_INIMIGOS } from '../onda3-inimigos/ia-barco-monstro.mjs';
import { CATALOGO_ARMAS_51 } from '../onda5-catalogo-chefe/catalogo-naves-itens.mjs';
import { obterMapaHitboxesNativo } from './despacho-comandos.mjs';
import {
  GLIFOS_PRESS_START_8PX,
  GLIFOS_COMPACTOS_5X7,
  GLIFOS_NITIDOS_6X7,
  MAPA_ACENTOS_HUD,
  MASCARA_SOQUETE_8X8,
  MASCARA_CADEADO_8X10,
  obterAssetsConceitoHiBit,
  obterTabelasRasterUnificado,
  escalarNearestRgba,
  codificarBufferRgbaParaPng,
} from './assets-hibit.mjs';
import { rasterizarQuadroRgba960x540 } from './renderizador-canvas.mjs';

const TIPOS_SPREAD_ANIMACAO_STEAM = Object.freeze([
  'TRIPULACAO_INVASORES_4FRAMES',
  'ARMAS_ORGAOS_SISTEMAS_4FRAMES',
  'TRAVESSIA_PORTAIS_60FPS',
]);

/**
 * Exporta as 3 Pranchas Steam-Tier de Animação 4-Frames, Órgãos Puros e Travessia Tática 60 FPS (960x540 -> 1920x1080 x2 lossless PNG):
 *  - `'TRIPULACAO_INVASORES_4FRAMES'` (Prancha 8): 7 personagens × 4 poses Hi-Bit de estúdio (1x + 2x) + corte anatômico 2x4 ao vivo;
 *  - `'ARMAS_ORGAOS_SISTEMAS_4FRAMES'` (Prancha 9): 7 armas dorsais (recuo -4px + tendões + clarão pixel-art), 6 órgãos biológicos puros (zero anéis metálicos) e 4 bio-sistemas vitais;
 *  - `'TRAVESSIA_PORTAIS_60FPS'` (Prancha 10): 8 painéis 1:1 (x2 -> 1080p) provando travessia pelo Duto Ventral 5↔6, sobrevivência 0kg vs desvio alagado e interceptação hostil vs escolta de fixação.
 */
export function exportarSpreadAnimacaoSteamPngBufferComHooks(tipoSpread, opcoes = {}, hooks = {}) {
  const projetarFn = hooks.projetarViewModelWireframe;
  const interpolarFn = hooks.interpolarEstadoVisual60Fps;
  if (typeof tipoSpread !== 'string' || !TIPOS_SPREAD_ANIMACAO_STEAM.includes(tipoSpread)) {
    return clonarProfundoCongelado({
      ok: false,
      codigoErro: 'TIPO_SPREAD_INVALIDO',
      tiposAceitos: TIPOS_SPREAD_ANIMACAO_STEAM,
    });
  }

  const escala = Math.max(1, Math.min(2, Math.floor(Number(opcoes.escalaInteira ?? 2) || 2)));
  const W = 960;
  const H = 540;
  const rgba = new Uint8ClampedArray(W * H * 4);
  const assets = obterAssetsConceitoHiBit();
  const tabUnif = obterTabelasRasterUnificado();

  const BG = [6, 10, 15, 255];
  const PANEL_BG = [9, 16, 24, 248];
  const CELL_BG = [6, 13, 20, 255];
  const BORDER = [30, 52, 68, 255];
  const RIM = [92, 136, 158, 255];
  const TXT = [226, 242, 250, 255];
  const DIM = [132, 164, 184, 255];
  const CYAN = [79, 242, 255, 255];
  const GREEN = [57, 230, 98, 255];
  const AMBER = [245, 158, 11, 255];
  const RED = [255, 42, 56, 255];
  const VIOLET = [148, 76, 212, 255];
  const YELLOW = [255, 224, 51, 255];

  for (let py = 0; py < H; py += 1) {
    for (let px = 0; px < W; px += 1) {
      const idx = (py * W + px) * 4;
      const dth = ((px + py) & 1) === 0 ? 0 : 2;
      rgba[idx] = BG[0] + dth;
      rgba[idx + 1] = BG[1] + Math.floor(py / 90) + dth;
      rgba[idx + 2] = BG[2] + Math.floor(py / 65) + dth;
      rgba[idx + 3] = 255;
    }
  }

  const putPx = (x, y, c) => {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= W || iy < 0 || iy >= H || !c) return;
    const idx = (iy * W + ix) * 4;
    const a = (c[3] ?? 255) / 255;
    if (a >= 0.999) {
      rgba[idx] = c[0];
      rgba[idx + 1] = c[1];
      rgba[idx + 2] = c[2];
      rgba[idx + 3] = 255;
    } else if (a > 0.001) {
      const inv = 1 - a;
      rgba[idx] = Math.round(c[0] * a + rgba[idx] * inv);
      rgba[idx + 1] = Math.round(c[1] * a + rgba[idx + 1] * inv);
      rgba[idx + 2] = Math.round(c[2] * a + rgba[idx + 2] * inv);
      rgba[idx + 3] = 255;
    }
  };

  const hLine = (x0, x1, y, c, esp = 1) => {
    const xa = Math.min(x0, x1);
    const xb = Math.max(x0, x1);
    for (let dy = 0; dy < esp; dy += 1) {
      for (let px = xa; px <= xb; px += 1) putPx(px, y + dy, c);
    }
  };

  const fillRect = (x0, y0, x1, y1, bgCor, bordaCor = null) => {
    const xa = Math.round(Math.min(x0, x1));
    const xb = Math.round(Math.max(x0, x1));
    const ya = Math.round(Math.min(y0, y1));
    const yb = Math.round(Math.max(y0, y1));
    if (bgCor) {
      for (let py = ya; py <= yb; py += 1) {
        for (let px = xa; px <= xb; px += 1) putPx(px, py, bgCor);
      }
    }
    if (bordaCor) {
      for (let px = xa; px <= xb; px += 1) {
        putPx(px, ya, bordaCor);
        putPx(px, yb, bordaCor);
      }
      for (let py = ya; py <= yb; py += 1) {
        putPx(xa, py, bordaCor);
        putPx(xb, py, bordaCor);
      }
    }
  };

  const lineSeg = (x0, y0, x1, y1, c, pontilhado = false) => {
    const passos = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
    for (let s = 0; s <= passos; s += 1) {
      if (pontilhado && (s % 4 >= 2)) continue;
      const t = s / passos;
      putPx(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, c);
    }
  };

  const chanfrado = (x0, y0, x1, y1, bgCor, bordaCor, ch = 2, biselTopo = null) => {
    const xa = Math.round(x0);
    const ya = Math.round(y0);
    const xb = Math.round(x1);
    const yb = Math.round(y1);
    if (xb <= xa || yb <= ya) return;
    const alt = yb - ya;
    const larg = xb - xa;
    const cLim = Math.max(0, Math.min(ch, Math.floor(Math.min(larg, alt) / 3)));
    for (let dy = 0; dy <= alt; dy += 1) {
      const distV = Math.min(dy, alt - dy);
      const rec = distV < cLim ? (cLim - distV) : 0;
      const lx0 = xa + rec;
      const lx1 = xb - rec;
      if (bgCor && lx1 >= lx0) {
        for (let px = lx0; px <= lx1; px += 1) putPx(px, ya + dy, bgCor);
      }
      if (bordaCor && lx1 >= lx0) {
        if (dy === 0 || dy === alt) {
          for (let px = lx0; px <= lx1; px += 1) putPx(px, ya + dy, bordaCor);
        } else {
          putPx(lx0, ya + dy, bordaCor);
          putPx(lx1, ya + dy, bordaCor);
          if (distV < cLim) {
            putPx(lx0 + 1, ya + dy, bordaCor);
            putPx(lx1 - 1, ya + dy, bordaCor);
          }
        }
      }
    }
    if (biselTopo && xb - xa > cLim * 2 + 2) {
      hLine(xa + cLim + 1, xb - cLim - 1, ya + 1, biselTopo, 1);
    }
  };

  const desenharGlifo = (mapaF, gx, gy, ch, cor) => {
    const g = mapaF[ch] ?? GLIFOS_PRESS_START_8PX[ch];
    if (!g) return;
    for (let ry = 0; ry < 8; ry += 1) {
      const mask = g[ry];
      for (let rx = 0; rx < 8; rx += 1) {
        if ((mask >> rx) & 1) putPx(gx + rx, gy + ry, cor);
      }
    }
  };

  const txt = (x0, y, str, cor = TXT, pitch = 7) => {
    const s = String(str ?? '').toUpperCase();
    const mapaFonte = pitch <= 6 ? GLIFOS_COMPACTOS_5X7 : pitch === 7 ? GLIFOS_NITIDOS_6X7 : GLIFOS_PRESS_START_8PX;
    const dxAc = pitch <= 6 ? 2 : pitch === 7 ? 2 : 3;
    let x = x0;
    for (const ch of s) {
      if (ch === ' ') {
        x += pitch;
        continue;
      }
      const ac = MAPA_ACENTOS_HUD[ch];
      if (ac) {
        const [base, tipo] = ac;
        desenharGlifo(mapaFonte, x, y, base, cor);
        const cx = x + dxAc;
        if (tipo === 'agudo') {
          putPx(cx, y - 2, cor);
          putPx(cx + 1, y - 3, cor);
        } else if (tipo === 'grave') {
          putPx(cx - 1, y - 3, cor);
          putPx(cx, y - 2, cor);
        } else if (tipo === 'circ') {
          putPx(cx - 1, y - 2, cor);
          putPx(cx, y - 3, cor);
          putPx(cx + 1, y - 2, cor);
        } else if (tipo === 'til') {
          if (pitch <= 6) {
            putPx(cx - 2, y - 2, cor);
            putPx(cx - 1, y - 3, cor);
            putPx(cx, y - 2, cor);
            putPx(cx + 1, y - 3, cor);
          } else {
            putPx(cx - 2, y - 2, cor);
            putPx(cx - 1, y - 3, cor);
            putPx(cx, y - 2, cor);
            putPx(cx + 1, y - 2, cor);
            putPx(cx + 2, y - 3, cor);
          }
        } else if (tipo === 'cedil') {
          putPx(cx, y + 7, cor);
          putPx(cx, y + 8, cor);
          putPx(cx - 1, y + 8, cor);
        }
      } else {
        desenharGlifo(mapaFonte, x, y, ch, cor);
      }
      x += pitch;
    }
  };

  const desenharSoquete = (sx, sy, enxertado = false) => {
    for (let ry = 0; ry < MASCARA_SOQUETE_8X8.length; ry += 1) {
      const lin = MASCARA_SOQUETE_8X8[ry];
      for (let rx = 0; rx < lin.length; rx += 1) {
        if (lin[rx] === '#') putPx(sx + rx, sy + ry, [8, 14, 20, 255]);
        else if (lin[rx] === '@') putPx(sx + rx, sy + ry, enxertado ? GREEN : [34, 58, 74, 255]);
      }
    }
  };

  const blitRgbaEscaladoContornado = (spr, cx, cy, largMax, altMax, escW = 1.0, escH = 1.0, espelharX = false) => {
    if (!spr || !spr.rgba || !spr.largura || !spr.altura) return;
    let bx0 = spr.largura;
    let by0 = spr.altura;
    let bx1 = -1;
    let by1 = -1;
    for (let sy = 0; sy < spr.altura; sy += 1) {
      for (let sx = 0; sx < spr.largura; sx += 1) {
        if (spr.rgba[(sy * spr.largura + sx) * 4 + 3] >= 120) {
          if (sx < bx0) bx0 = sx;
          if (sx > bx1) bx1 = sx;
          if (sy < by0) by0 = sy;
          if (sy > by1) by1 = sy;
        }
      }
    }
    if (bx1 < bx0) return;
    const bw = bx1 - bx0 + 1;
    const bh = by1 - by0 + 1;
    const escFit = Math.min((largMax - 2) / bw, (altMax - 2) / bh);
    const wDst = Math.max(6, Math.min(largMax, Math.round(bw * escFit * escW)));
    const hDst = Math.max(6, Math.min(altMax, Math.round(bh * escFit * escH)));
    const ox = Math.round(cx - wDst / 2);
    const oy = Math.round(cy - hDst / 2);
    const opacos = new Uint8Array(wDst * hDst);
    const cores = new Uint8Array(wDst * hDst * 3);
    for (let dy = 0; dy < hDst; dy += 1) {
      const sy0 = by0 + Math.floor((dy * bh) / hDst);
      const sy1 = by0 + Math.max(0, Math.min(bh - 1, Math.floor(((dy + 1) * bh - 0.01) / hDst)));
      for (let dx = 0; dx < wDst; dx += 1) {
        const dxS = espelharX ? (wDst - 1 - dx) : dx;
        const sx0 = bx0 + Math.floor((dxS * bw) / wDst);
        const sx1 = bx0 + Math.max(0, Math.min(bw - 1, Math.floor(((dxS + 1) * bw - 0.01) / wDst)));
        let sr = 0;
        let sg = 0;
        let sb = 0;
        let nOp = 0;
        let tot = 0;
        for (let sy = sy0; sy <= sy1; sy += 1) {
          for (let sx = sx0; sx <= sx1; sx += 1) {
            tot += 1;
            const p = (sy * spr.largura + sx) * 4;
            if (spr.rgba[p + 3] < 120) continue;
            if (spr.rgba[p] <= 10 && spr.rgba[p + 1] <= 15 && spr.rgba[p + 2] <= 22 && nOp > 0) continue;
            sr += spr.rgba[p];
            sg += spr.rgba[p + 1];
            sb += spr.rgba[p + 2];
            nOp += 1;
          }
        }
        if (nOp > 0 && nOp * 5 >= tot * 2) {
          const iO = dy * wDst + dx;
          opacos[iO] = 1;
          cores[iO * 3] = Math.round(sr / nOp);
          cores[iO * 3 + 1] = Math.round(sg / nOp);
          cores[iO * 3 + 2] = Math.round(sb / nOp);
        }
      }
    }
    hLine(ox + 3, ox + wDst - 4, oy + hDst, [4, 8, 13, 130], 1);
    for (let dy = 0; dy < hDst; dy += 1) {
      for (let dx = 0; dx < wDst; dx += 1) {
        const iO = dy * wDst + dx;
        if (opacos[iO]) {
          putPx(ox + dx, oy + dy, [cores[iO * 3], cores[iO * 3 + 1], cores[iO * 3 + 2], 255]);
        } else if (
          (dy > 0 && opacos[(dy - 1) * wDst + dx]) ||
          (dy + 1 < hDst && opacos[(dy + 1) * wDst + dx]) ||
          (dx > 0 && opacos[dy * wDst + dx - 1]) ||
          (dx + 1 < wDst && opacos[dy * wDst + dx + 1])
        ) {
          putPx(ox + dx, oy + dy, [7, 12, 18, 255]);
        }
      }
    }
  };

  const recortarBlocoCena960 = (rgbaCena, xSrc, ySrc, wCrop, hCrop, xDst, yDst) => {
    for (let dy = 0; dy < hCrop; dy += 1) {
      const sy = ySrc + dy;
      const ty = yDst + dy;
      if (sy < 0 || sy >= H || ty < 0 || ty >= H) continue;
      for (let dx = 0; dx < wCrop; dx += 1) {
        const sx = xSrc + dx;
        const tx = xDst + dx;
        if (sx < 0 || sx >= W || tx < 0 || tx >= W) continue;
        const sOff = (sy * W + sx) * 4;
        const dOff = (ty * W + tx) * 4;
        rgba[dOff] = rgbaCena[sOff];
        rgba[dOff + 1] = rgbaCena[sOff + 1];
        rgba[dOff + 2] = rgbaCena[sOff + 2];
        rgba[dOff + 3] = 255;
      }
    }
  };

  const blitOrgaoFisiologico4Frames = (spr, cx, cy, largMax, altMax, estagioIdx, corDestaque) => {
    if (!spr || !spr.rgba || !spr.largura || !spr.altura) return;
    let bx0 = spr.largura;
    let by0 = spr.altura;
    let bx1 = -1;
    let by1 = -1;
    for (let sy = 0; sy < spr.altura; sy += 1) {
      for (let sx = 0; sx < spr.largura; sx += 1) {
        if (spr.rgba[(sy * spr.largura + sx) * 4 + 3] >= 120) {
          if (sx < bx0) bx0 = sx;
          if (sx > bx1) bx1 = sx;
          if (sy < by0) by0 = sy;
          if (sy > by1) by1 = sy;
        }
      }
    }
    if (bx1 < bx0) return;
    const bw = bx1 - bx0 + 1;
    const bh = by1 - by0 + 1;
    const escBase = Math.min((largMax - 4) / bw, (altMax - 4) / bh);
    const multAlt = estagioIdx === 0 ? 0.90 : estagioIdx === 1 ? 1.04 : estagioIdx === 2 ? 1.15 : 1.03;
    const hDst = Math.max(8, Math.min(altMax, Math.round(bh * escBase * multAlt)));
    const wCanvas = largMax + 6;
    const oy = Math.round(cy - hDst / 2);
    const ox = Math.round(cx - wCanvas / 2);
    const opacos = new Uint8Array(wCanvas * hDst);
    const cores = new Uint8Array(wCanvas * hDst * 3);

    for (let dy = 0; dy < hDst; dy += 1) {
      const vNorm = dy / Math.max(1, hDst - 1);
      let fatorLargLinha = 1.0;
      let shiftLinhaX = 0;
      if (estagioIdx === 0) {
        fatorLargLinha = 0.90 + 0.08 * Math.sin(vNorm * Math.PI);
      } else if (estagioIdx === 1) {
        fatorLargLinha = 1.02 + 0.14 * Math.sin(vNorm * Math.PI);
      } else if (estagioIdx === 2) {
        fatorLargLinha = vNorm > 0.52 ? 0.76 : 1.16 * (1 - 0.12 * vNorm);
        shiftLinhaX = vNorm < 0.45 ? 1 : 0;
      } else {
        fatorLargLinha = vNorm < 0.42 ? 1.12 : 0.88;
        shiftLinhaX = vNorm < 0.5 ? 2 : 0;
      }
      const wRow = Math.max(6, Math.min(wCanvas - 4, Math.round(bw * escBase * fatorLargLinha)));
      const xIniRow = Math.round((wCanvas - wRow) / 2) + shiftLinhaX;
      const sy0 = by0 + Math.floor((dy * bh) / hDst);
      const sy1 = by0 + Math.max(0, Math.min(bh - 1, Math.floor(((dy + 1) * bh - 0.01) / hDst)));

      for (let rx = 0; rx < wRow; rx += 1) {
        const dx = xIniRow + rx;
        if (dx < 1 || dx >= wCanvas - 1) continue;
        const sx0 = bx0 + Math.floor((rx * bw) / wRow);
        const sx1 = bx0 + Math.max(0, Math.min(bw - 1, Math.floor(((rx + 1) * bw - 0.01) / wRow)));
        let sr = 0;
        let sg = 0;
        let sb = 0;
        let nOp = 0;
        let tot = 0;
        for (let sy = sy0; sy <= sy1; sy += 1) {
          for (let sx = sx0; sx <= sx1; sx += 1) {
            tot += 1;
            const p = (sy * spr.largura + sx) * 4;
            if (spr.rgba[p + 3] < 120) continue;
            if (spr.rgba[p] <= 10 && spr.rgba[p + 1] <= 15 && spr.rgba[p + 2] <= 22 && nOp > 0) continue;
            sr += spr.rgba[p];
            sg += spr.rgba[p + 1];
            sb += spr.rgba[p + 2];
            nOp += 1;
          }
        }
        if (nOp > 0 && nOp * 5 >= tot * 2) {
          let rMed = Math.round(sr / nOp);
          let gMed = Math.round(sg / nOp);
          let bMed = Math.round(sb / nOp);
          if (estagioIdx >= 2 && rMed + gMed + bMed > 110 && (dx + dy + estagioIdx) % 2 === 0) {
            const ganho = estagioIdx === 3 ? 0.42 : 0.28;
            rMed = Math.min(255, Math.round(rMed * (1 - ganho) + corDestaque[0] * ganho));
            gMed = Math.min(255, Math.round(gMed * (1 - ganho) + corDestaque[1] * ganho));
            bMed = Math.min(255, Math.round(bMed * (1 - ganho) + corDestaque[2] * ganho));
          }
          const iO = dy * wCanvas + dx;
          opacos[iO] = 1;
          cores[iO * 3] = rMed;
          cores[iO * 3 + 1] = gMed;
          cores[iO * 3 + 2] = bMed;
        }
      }
    }

    for (let dy = 0; dy < hDst; dy += 1) {
      for (let dx = 0; dx < wCanvas; dx += 1) {
        const iO = dy * wCanvas + dx;
        if (opacos[iO]) {
          putPx(ox + dx, oy + dy, [cores[iO * 3], cores[iO * 3 + 1], cores[iO * 3 + 2], 255]);
        } else if (
          (dy > 0 && opacos[(dy - 1) * wCanvas + dx]) ||
          (dy + 1 < hDst && opacos[(dy + 1) * wCanvas + dx]) ||
          (dx > 0 && opacos[dy * wCanvas + dx - 1]) ||
          (dx + 1 < wCanvas && opacos[dy * wCanvas + dx + 1])
        ) {
          putPx(ox + dx, oy + dy, [7, 12, 18, 255]);
        }
      }
    }
  };

  if (tipoSpread === 'TRIPULACAO_INVASORES_4FRAMES') {
    chanfrado(0, 0, W - 1, 29, [8, 15, 23, 255], BORDER, 0, RIM);
    chanfrado(3, 3, W - 4, 26, null, [22, 42, 56, 200], 2);
    txt(10, 10, 'VITRINE STEAM 4-FRAMES: TRIPULAÇÃO SIMBIÓTICA & INVASORES', CYAN, 7);
    chanfrado(642, 5, 952, 24, [10, 24, 34, 255], AMBER, 2, YELLOW);
    txt(650, 11, '28 POSES HI-BIT | ESCALA 1x + 2x | 60 FPS', YELLOW, 7);

    const multSecoCurto = Number(CONSTANTES_TRIPULACAO.PENALIDADE_VEL_SECO_AQUATICO_MULT ?? 0.5).toFixed(1);
    const multSecoTxt = Number(CONSTANTES_TRIPULACAO.PENALIDADE_VEL_SECO_AQUATICO_MULT ?? 0.5).toFixed(2);
    const danoAsfixiaTxt = Math.round(Number(CONSTANTES_TRIPULACAO.DANO_ASFIXIA_SECA_OU_HIPOXIA_HP_S ?? 8));
    const PERSONAGENS_SPREAD = [
      {
        especie: 'POLVO',
        papel: 'ENGENHEIRO',
        stat1: `HP ${HP_MAX_POR_ESPECIE.POLVO} | ${FICHAS_ESPECIES_TRIPULACAO.POLVO.dpsCorpoACorpo} DPS`,
        stat2: `SECO: ${multSecoCurto}x -${danoAsfixiaTxt}/s`,
        cor: CYAN,
        invasor: false,
        poses: ['IDLE + BULBO', 'NADO HIDRÁULICO', 'REPARO FAÍSCAS', 'ATAQUE TENTÁCULO'],
      },
      {
        especie: 'ARRAIA',
        papel: 'BIO-ELÉTRICA',
        stat1: `HP ${HP_MAX_POR_ESPECIE.ARRAIA} | +1 ENE`,
        stat2: `SECO: ${multSecoCurto}x -${danoAsfixiaTxt}/s`,
        cor: YELLOW,
        invasor: false,
        poses: ['PAIRAR CALMO', 'ASA ASCENDENTE', 'ASA DESCENDENTE', 'DESCARGA +1 ENE'],
      },
      {
        especie: 'BAIACU',
        papel: 'SELO DE BRECHA',
        stat1: `HP ${HP_MAX_POR_ESPECIE.BAIACU} | ${FICHAS_ESPECIES_TRIPULACAO.BAIACU.dpsCorpoACorpo} DPS`,
        stat2: `SECO: ${multSecoCurto}x -${danoAsfixiaTxt}/s`,
        cor: GREEN,
        invasor: false,
        poses: ['COMPACTO CALMO', 'NADO CAUDAL', 'INFLANDO CORPO', 'ESFERA ESPINHOS'],
      },
      {
        especie: 'CARANGUEJO',
        papel: 'GUARDA PESADA',
        stat1: `HP ${HP_MAX_POR_ESPECIE.CARANGUEJO} | ${FICHAS_ESPECIES_TRIPULACAO.CARANGUEJO.dpsCorpoACorpo} DPS`,
        stat2: 'ANFÍBIO: 1.0x',
        cor: AMBER,
        invasor: false,
        poses: ['GUARDA PESADA', 'MARCHA QUITINA', 'PINÇA ARMADA', 'GOLPE ESMAGADOR'],
      },
      {
        especie: 'MARINHEIRO',
        papel: 'ABORDADOR NAVAL',
        stat1: `HP ${CONSTANTES_IA_INIMIGOS.HP_MARINHEIRO_HUMANO} | ${CONSTANTES_IA_INIMIGOS.DPS_MARINHEIRO_HUMANO} DPS`,
        stat2: `AFOGA H2O -${Math.round(CONSTANTES_IA_INIMIGOS.TAXA_AFOGAMENTO_HUMANO_HP_S)}/s`,
        cor: RED,
        invasor: true,
        poses: ['GUARDA RIFLE', 'AVANÇO TÁTICO', 'MIRA PONTEIRA', 'DISPARO ARPÃO'],
      },
      {
        especie: 'MERGULHADOR',
        papel: 'CORTE PESADO',
        stat1: `HP ${CONSTANTES_IA_INIMIGOS.HP_MERGULHADOR_ASSALTO} | ${CONSTANTES_IA_INIMIGOS.DPS_MERGULHADOR_ASSALTO} DPS`,
        stat2: 'SCUBA IMUNE H2O',
        cor: [255, 118, 56, 255],
        invasor: true,
        poses: ['POSTURA COBRE', 'PROPULSÃO PESADA', 'ARCO PILOTO', 'CORTE PLASMA'],
      },
      {
        especie: 'PARASITA',
        papel: 'SANGUESSUGA',
        stat1: `HP ${CONSTANTES_IA_INIMIGOS.HP_PARASITA_ABISSAL} | ${CONSTANTES_IA_INIMIGOS.DPS_PARASITA_ABISSAL} DPS`,
        stat2: 'ANFÍBIO ABISSAL',
        cor: VIOLET,
        invasor: true,
        poses: ['ENROLADO EM S', 'ONDULAÇÃO RÁPIDA', 'MANDÍBULA ABERTA', 'BOTE VAMPÍRICO'],
      },
    ];

    PERSONAGENS_SPREAD.forEach((p, idx) => {
      const ry0 = 34 + idx * 71;
      const ry1 = ry0 + 68;
      chanfrado(
        8,
        ry0,
        658,
        ry1,
        PANEL_BG,
        p.invasor ? [126, 40, 54, 255] : BORDER,
        3,
        p.invasor ? RED : RIM
      );
      chanfrado(12, ry0 + 4, 149, ry1 - 4, CELL_BG, p.cor, 2);
      txt(16, ry0 + 8, p.especie.slice(0, 11), p.cor, 7);
      txt(16, ry0 + 21, p.papel.slice(0, 15), TXT, 6);
      txt(16, ry0 + 33, p.stat1.slice(0, 16), GREEN, 6);
      txt(16, ry0 + 46, p.stat2.slice(0, 16), p.invasor ? RED : AMBER, 6);

      chanfrado(114, ry0 + 18, 145, ry0 + 58, [9, 28, 38, 255], [32, 74, 94, 255], 2);
      hLine(116, 143, ry0 + 28, [79, 242, 255, 165], 1);
      txt(119, ry0 + 8, '1x', DIM, 6);
      const spr1x = assets.poses4Frames?.[p.especie]?.[0];
      blitRgbaEscaladoContornado(spr1x, 129, ry0 + 40, 22, 26, 1, 1, p.invasor);

      for (let f = 0; f < 4; f += 1) {
        const cx0 = 154 + f * 125;
        const cx1 = cx0 + 121;
        chanfrado(
          cx0,
          ry0 + 4,
          cx1,
          ry1 - 4,
          CELL_BG,
          f === 3 ? p.cor : [28, 52, 68, 255],
          2,
          f === 3 ? YELLOW : [36, 68, 88, 255]
        );
        fillRect(cx0 + 3, ry0 + 38, cx1 - 3, ry1 - 16, [9, 28, 38, 110]);
        hLine(cx0 + 5, cx1 - 5, ry1 - 16, [30, 86, 108, 195], 1);
        txt(cx0 + 4, ry0 + 7, `F${f}`, f === 3 ? YELLOW : CYAN, 6);
        txt(cx1 - 15, ry0 + 7, '2x', DIM, 6);
        const sprPose = assets.poses4Frames?.[p.especie]?.[f];
        blitRgbaEscaladoContornado(sprPose, cx0 + 60, ry0 + 31, 60, 42, 1, 1, false);
        txt(cx0 + 4, ry1 - 13, p.poses[f].slice(0, 19), f === 3 ? YELLOW : TXT, 6);
      }
    });

    chanfrado(664, 34, 952, 529, PANEL_BG, BORDER, 3, RIM);
    txt(672, 41, 'GRADE ORGÂNICA 2x4 AO VIVO', CYAN, 7);
    txt(672, 53, 'ANATOMIA HIDRÁULICA EM ESCALA 1:1', AMBER, 6);

    const estBase8 = structuredClone(
      criarEstadoInicialPartida({
        seedPartida: 'spread8-grade-organica-viva',
        idArquitetura: 'CARCACA_ALFA',
        faseJogo: 'COMBATE',
        classeAlvoInicial: 'BARCO_HUMANO',
      })
    );
    const cam1 = estBase8.naveJogador.camaras.find((c) => c.id === 1);
    if (cam1) {
      cam1.aguaKg = 0;
      cam1.oxigenioPct = 14;
      cam1.valvulaExternaAberta = true;
    }
    const cam3 = estBase8.naveJogador.camaras.find((c) => c.id === 3);
    if (cam3) {
      cam3.brechaAtiva = true;
      cam3.aguaKg = 9.5;
    }
    estBase8.naveJogador.tripulacao = [
      { id: 'sp8-polvo-seco', especie: 'POLVO', hpAtual: 66, hpMax: HP_MAX_POR_ESPECIE.POLVO, camaraAtualId: 1, localizacao: 'NAVE_JOGADOR', acopladoBulbo: false, inflado: false },
      { id: 'sp8-arraia-ponte', especie: 'ARRAIA', hpAtual: HP_MAX_POR_ESPECIE.ARRAIA, hpMax: HP_MAX_POR_ESPECIE.ARRAIA, camaraAtualId: 2, camaraDestinoId: 3, proximaCamaraId: 3, progressoSalto0a1: 0.48, localizacao: 'NAVE_JOGADOR' },
      { id: 'sp8-baiacu-selo', especie: 'BAIACU', hpAtual: HP_MAX_POR_ESPECIE.BAIACU, hpMax: HP_MAX_POR_ESPECIE.BAIACU, camaraAtualId: 3, localizacao: 'NAVE_JOGADOR', inflado: true },
      { id: 'sp8-caranguejo-pin', especie: 'CARANGUEJO', hpAtual: 104, hpMax: HP_MAX_POR_ESPECIE.CARANGUEJO, camaraAtualId: 4, localizacao: 'NAVE_JOGADOR', acopladoBulbo: false },
      { id: 'sp8-polvo-duto', especie: 'POLVO', hpAtual: HP_MAX_POR_ESPECIE.POLVO, hpMax: HP_MAX_POR_ESPECIE.POLVO, camaraAtualId: 6, camaraDestinoId: 5, proximaCamaraId: 5, progressoSalto0a1: 0.52, localizacao: 'NAVE_JOGADOR' },
    ];
    estBase8.naveJogador.invasoresInimigos = [
      { id: 'sp8-merg-1', especie: 'MERGULHADOR', hpAtual: 84, hpMax: CONSTANTES_IA_INIMIGOS.HP_MERGULHADOR_ASSALTO, camaraAtualId: 4, imuneAfogamento: true },
    ];
    const vm8 = projetarFn(clonarProfundoCongelado(estBase8));
    const hb8 = obterMapaHitboxesNativo(vm8);
    let ev8 = null;
    for (let q = 0; q < 8; q += 1) {
      ev8 = interpolarFn(ev8, vm8, 1 / 60, { hitboxes: hb8 });
    }
    const cena8Rgba = rasterizarQuadroRgba960x540(vm8, { estadoVisual60Fps: ev8 }, assets, hb8, tabUnif);
    chanfrado(672, 66, 944, 314, [5, 11, 17, 255], CYAN, 3, TXT);
    recortarBlocoCena960(cena8Rgba, 322, 106, 248, 222, 684, 79);

    const legendas8 = [
      ['11 PORTAIS TOPOLÓGICOS VIVOS', '6 ESFÍNCTERES + 4 PONTES + DUTO', CYAN],
      ['DUTO HIDRÁULICO VENTRAL 5 <-> 6', 'SIFÃO EM J SOB PISO 4 + ESPINHA', YELLOW],
      ['SOBREVIVÊNCIA SECA (0 kg H2O)', `CÂM. 1: RASTEJO ${multSecoTxt}x E -${danoAsfixiaTxt} HP/s`, RED],
      ['COMBATE & SELO VIVO EM CÂMARA', 'BAIACU VEDA CÂM.3 | CAR FIXA CÂM.4', GREEN],
    ];
    legendas8.forEach(([t1, t2, cL], idxL) => {
      const ly0 = 322 + idxL * 50;
      chanfrado(672, ly0, 944, ly0 + 44, CELL_BG, cL, 2);
      txt(679, ly0 + 8, t1, cL, 6);
      txt(679, ly0 + 24, t2, TXT, 6);
    });
  } else if (tipoSpread === 'ARMAS_ORGAOS_SISTEMAS_4FRAMES') {
    chanfrado(0, 0, W - 1, 29, [8, 15, 23, 255], BORDER, 0, RIM);
    chanfrado(3, 3, W - 4, 26, null, [22, 42, 56, 200], 2);
    txt(10, 10, 'VITRINE STEAM 4-FRAMES: ARMAS DORSAIS, ÓRGÃOS PUROS & BIO-SISTEMAS', CYAN, 7);
    chanfrado(664, 5, 952, 24, [10, 24, 34, 255], GREEN, 2, YELLOW);
    txt(672, 11, 'ZERO ANÉIS METÁLICOS | RECUO -4px', YELLOW, 7);

    const mapaArmas = new Map(CATALOGO_ARMAS_51.map((a) => [a.id, a]));
    const fmtSpecArma = (idArma) => {
      const a = mapaArmas.get(idArma);
      if (!a) return '1E | 9s | 10kg';
      return `${a.energia}E | ${a.recargaSeg}s | ${a.pesoKg}kg`;
    };
    const soqArma = (idArma, fb) => mapaArmas.get(idArma)?.soquetes ?? fb;

    const ARMAS_SPREAD = [
      { id: 'EMISSOR_ACUSTICO_I', nome: 'ACÚSTICO I', spec: fmtSpecArma('EMISSOR_ACUSTICO_I'), soq: soqArma('EMISSOR_ACUSTICO_I', 1), cor: CYAN, tipoFlash: 'ONDA', bocaDx: 25, bocaDy: -1 },
      { id: 'RAJADA_HIDROPNEUMATICA_II', nome: 'RAJADA II', spec: fmtSpecArma('RAJADA_HIDROPNEUMATICA_II'), soq: soqArma('RAJADA_HIDROPNEUMATICA_II', 1), cor: CYAN, tipoFlash: 'VIROTE', bocaDx: 25, bocaDy: -1 },
      { id: 'CANHAO_ARPAO_CABO', nome: 'ARPÃO DE CABO', spec: fmtSpecArma('CANHAO_ARPAO_CABO'), soq: soqArma('CANHAO_ARPAO_CABO', 2), cor: AMBER, tipoFlash: 'ARPAO', bocaDx: 26, bocaDy: -1 },
      { id: 'DISPERSOR_ESTILHACOS', nome: 'ESTILHAÇOS', spec: fmtSpecArma('DISPERSOR_ESTILHACOS'), soq: soqArma('DISPERSOR_ESTILHACOS', 1), cor: YELLOW, tipoFlash: 'ESTILH', bocaDx: 24, bocaDy: -2 },
      { id: 'CORTADOR_TERMICO_PLASMA', nome: 'CORTADOR PLASMA', spec: fmtSpecArma('CORTADOR_TERMICO_PLASMA'), soq: soqArma('CORTADOR_TERMICO_PLASMA', 1), cor: RED, tipoFlash: 'FEIXE', bocaDx: 25, bocaDy: -1 },
      { id: 'LANCADOR_TORPEDO_ABISSAL', nome: 'TORPEDO ABISSAL', spec: fmtSpecArma('LANCADOR_TORPEDO_ABISSAL'), soq: soqArma('LANCADOR_TORPEDO_ABISSAL', 2), cor: GREEN, tipoFlash: 'TORPEDO', bocaDx: 26, bocaDy: 0 },
      { id: 'MORTEIRO_ESPOROS', nome: 'MORTEIRO ESPORO', spec: fmtSpecArma('MORTEIRO_ESPOROS'), soq: soqArma('MORTEIRO_ESPOROS', 2), cor: VIOLET, tipoFlash: 'ESPORO', bocaDx: 9, bocaDy: -11 },
    ];

    ARMAS_SPREAD.forEach((ar, idx) => {
      const ry0 = 34 + idx * 71;
      const ry1 = ry0 + 68;
      chanfrado(8, ry0, 484, ry1, PANEL_BG, BORDER, 3, RIM);
      chanfrado(12, ry0 + 4, 122, ry1 - 4, CELL_BG, ar.cor, 2);
      txt(15, ry0 + 8, ar.nome, ar.cor, 6);
      txt(15, ry0 + 22, ar.spec, TXT, 6);
      txt(15, ry0 + 35, `SOQ: ${ar.soq} | -4px`, AMBER, 6);
      for (let s = 0; s < ar.soq; s += 1) {
        desenharSoquete(15 + s * 12, ry0 + 46, true);
      }

      const rotEstagios = ['REPOUSO', 'CARGA 50%', 'PRONTA!', 'RECUO -4px'];
      const sprArma = assets.iconesHiBit?.[ar.id];
      for (let f = 0; f < 4; f += 1) {
        const cx0 = 126 + f * 89;
        const cx1 = cx0 + 85;
        chanfrado(
          cx0,
          ry0 + 4,
          cx1,
          ry1 - 4,
          CELL_BG,
          f === 3 ? ar.cor : [26, 50, 66, 255],
          2,
          f === 3 ? YELLOW : [36, 66, 84, 255]
        );
        const dxRecuo = f === 3 ? -4 : f === 2 ? 1 : 0;
        const armaCx = cx0 + 38 + dxRecuo;
        const armaCy = ry0 + 29;
        chanfrado(cx0 + 6, ry0 + 42, cx1 - 8, ry0 + 50, [52, 26, 24, 255], [108, 52, 40, 255], 2);
        hLine(cx0 + 10, cx1 - 12, ry0 + 43, [146, 74, 52, 255], 1);
        blitRgbaEscaladoContornado(sprArma, armaCx, armaCy, 50, 26, 1, 1, false);
        for (const [baseOff, garraOff, altGarra] of [[-16, -13, 35], [-7, -5, 34], [3, 5, 34], [12, 10, 36]]) {
          const bxT = cx0 + 38 + baseOff;
          const gxT = armaCx + garraOff;
          lineSeg(bxT, ry0 + 44, gxT, ry0 + altGarra, [198, 34, 48, 255], false);
          lineSeg(bxT + 1, ry0 + 44, gxT + 1, ry0 + altGarra + 1, [124, 20, 32, 255], false);
          putPx(gxT, ry0 + altGarra, RED);
        }

        const bxBoca = armaCx + ar.bocaDx;
        const byBoca = armaCy + ar.bocaDy;
        if (f === 1) {
          fillRect(bxBoca - 1, byBoca - 1, bxBoca + 1, byBoca + 1, ar.cor);
          putPx(bxBoca, byBoca, TXT);
        } else if (f === 2) {
          for (const [ox, oy, cP] of [[-2, 0, ar.cor], [2, 0, ar.cor], [0, -2, YELLOW], [0, 2, YELLOW], [-1, -1, ar.cor], [1, 1, ar.cor], [0, 0, TXT]]) {
            putPx(bxBoca + ox, byBoca + oy, cP);
          }
        } else if (f === 3) {
          if (ar.tipoFlash === 'ESPORO') {
            for (const [ox, oy, cP] of [[-2, 0, VIOLET], [2, 0, GREEN], [0, -2, TXT], [-1, -1, GREEN], [1, -1, YELLOW], [0, 0, TXT]]) {
              putPx(bxBoca + ox, byBoca + oy, cP);
            }
            const arcoEsporos = [
              [4, -3, GREEN],
              [9, -5, VIOLET],
              [15, -5, GREEN],
              [21, -2, GREEN],
            ];
            arcoEsporos.forEach(([ax, ay, cArc], idxA) => {
              putPx(bxBoca + ax, byBoca + ay, cArc);
              if (idxA === 3) {
                fillRect(bxBoca + ax - 1, byBoca + ay - 1, bxBoca + ax + 2, byBoca + ay + 2, GREEN);
                putPx(bxBoca + ax - 2, byBoca + ay, VIOLET);
                putPx(bxBoca + ax + 3, byBoca + ay, VIOLET);
                putPx(bxBoca + ax, byBoca + ay, TXT);
              } else {
                putPx(bxBoca + ax + 1, byBoca + ay - 1, TXT);
              }
            });
          } else {
            fillRect(bxBoca - 1, byBoca - 2, bxBoca + 3, byBoca + 2, YELLOW);
            fillRect(bxBoca, byBoca - 1, bxBoca + 4, byBoca + 1, TXT);
            putPx(bxBoca + 1, byBoca - 4, ar.cor);
            putPx(bxBoca + 1, byBoca + 4, ar.cor);
            if (ar.tipoFlash === 'ONDA') {
              for (let dyW = -4; dyW <= 4; dyW += 1) {
                putPx(bxBoca + 8 + (Math.abs(dyW) <= 2 ? 1 : 0), byBoca + dyW, CYAN);
                if (Math.abs(dyW) <= 5) putPx(bxBoca + 13 + (Math.abs(dyW) <= 2 ? 1 : 0), byBoca + dyW, TXT);
              }
            } else if (ar.tipoFlash === 'ARPAO') {
              lineSeg(bxBoca + 2, byBoca, bxBoca + 14, byBoca, [186, 208, 222, 255], true);
              hLine(bxBoca + 12, bxBoca + 17, byBoca, TXT, 1);
              putPx(bxBoca + 15, byBoca - 2, RED);
              putPx(bxBoca + 15, byBoca + 2, RED);
              putPx(bxBoca + 18, byBoca, YELLOW);
            } else if (ar.tipoFlash === 'FEIXE') {
              hLine(bxBoca + 4, cx1 - 3, byBoca - 1, RED, 3);
              hLine(bxBoca + 4, cx1 - 3, byBoca, YELLOW, 1);
            } else if (ar.tipoFlash === 'ESTILH') {
              for (const [dxE, dyE] of [[9, -4], [12, 0], [9, 4], [15, -2], [15, 3]]) {
                fillRect(bxBoca + dxE, byBoca + dyE, bxBoca + dxE + 2, byBoca + dyE + 1, YELLOW);
                putPx(bxBoca + dxE + 1, byBoca + dyE, TXT);
              }
            } else if (ar.tipoFlash === 'TORPEDO') {
              fillRect(bxBoca + 8, byBoca - 1, bxBoca + 16, byBoca + 1, GREEN);
              hLine(bxBoca + 10, bxBoca + 17, byBoca, TXT, 1);
              putPx(bxBoca + 7, byBoca - 2, CYAN);
              putPx(bxBoca + 7, byBoca + 2, CYAN);
            } else {
              hLine(bxBoca + 6, bxBoca + 13, byBoca - 2, CYAN, 1);
              hLine(bxBoca + 9, bxBoca + 17, byBoca + 1, TXT, 1);
              putPx(bxBoca + 14, byBoca - 2, TXT);
            }
          }
        }
        txt(cx0 + 3, ry0 + 7, `F${f}`, f === 3 ? YELLOW : CYAN, 6);
        txt(cx0 + 4, ry1 - 13, rotEstagios[f], f === 3 ? YELLOW : TXT, 6);
      }
    });

    chanfrado(490, 34, 952, 325, PANEL_BG, BORDER, 3, RIM);
    txt(498, 40, '6 ÓRGÃOS BIOLÓGICOS PUROS (+5 kg — DIÁSTOLE / SÍSTOLE / SECREÇÃO)', GREEN, 6);

    const ORGAOS_SPREAD = [
      { id: 'GLANDULA_BAIACU', nome: 'GLÂNDULA BAIACU', sub: '5kg | VENENO 6/s', cor: GREEN },
      { id: 'ELETRO_PLACA_ARRAIA', nome: 'ELETRO-PLACA', sub: '5kg | ÍON 1 BAR', cor: YELLOW },
      { id: 'BEXIGA_PRESSAO_ABISSAL', nome: 'BEXIGA PRESSÃO', sub: '5kg | +15kg H2O', cor: CYAN },
      { id: 'BOLSA_TINTA_CEGANTE', nome: 'BOLSA DE TINTA', sub: '5kg | -40% MIRA', cor: VIOLET },
      { id: 'DENTE_LEVIATA_SERRILHADO', nome: 'DENTE LEVIATÃ', sub: '5kg | +1 SISTEMA', cor: RED },
      { id: 'GLANDULA_TERMOFILICA', nome: 'GLÂNDULA TERMO', sub: '5kg | FERVURA 5/s', cor: AMBER },
    ];
    const estagiosOrg = [
      { rot: 'F0 DIÁSTOLE', dy: 2 },
      { rot: 'F1 TURGOR', dy: 0 },
      { rot: 'F2 SÍSTOLE', dy: -1 },
      { rot: 'F3 SECREÇÃO', dy: -1 },
    ];
    ORGAOS_SPREAD.forEach((org, j) => {
      const oy0 = 52 + j * 45;
      const oy1 = oy0 + 42;
      chanfrado(494, oy0, 603, oy1, CELL_BG, org.cor, 2);
      txt(497, oy0 + 8, org.nome, org.cor, 6);
      txt(497, oy0 + 23, org.sub, TXT, 6);
      const sprOrg = assets.iconesHiBit?.[org.id];
      for (let f = 0; f < 4; f += 1) {
        const cx0 = 606 + f * 86;
        const cx1 = cx0 + 82;
        const stO = estagiosOrg[f];
        const mxO = cx0 + 36;
        const myO = oy0 + 16 + stO.dy;
        chanfrado(
          cx0,
          oy0,
          cx1,
          oy1,
          f === 3 ? [14, 28, 38, 255] : CELL_BG,
          f === 3 ? org.cor : f === 2 ? AMBER : [26, 48, 62, 255],
          2,
          f === 3 ? TXT : null
        );
        for (const [rxB, rxM] of [[-14, -7], [-5, -3], [5, 3], [14, 7]]) {
          lineSeg(mxO + rxB, oy0 + 29, mxO + rxM, myO + 6, f >= 2 ? [176, 42, 58, 255] : [112, 36, 48, 255], false);
        }
        blitOrgaoFisiologico4Frames(sprOrg, mxO, myO, 30, 25, f, org.cor);
        if (f === 1) {
          for (const [pxT, pyT] of [[-13, -5], [13, -4], [-11, 4], [12, 3]]) {
            putPx(mxO + pxT, myO + pyT, org.cor);
          }
        } else if (f === 2) {
          for (const [pxS, pyS, cS] of [[13, -3, org.cor], [14, -2, TXT], [13, -1, org.cor], [15, -4, org.cor], [-13, 2, AMBER]]) {
            putPx(mxO + pxS, myO + pyS, cS);
          }
        } else if (f === 3) {
          if (org.id === 'ELETRO_PLACA_ARRAIA') {
            lineSeg(mxO + 12, myO - 3, mxO + 20, myO - 8, YELLOW, false);
            lineSeg(mxO + 20, myO - 8, mxO + 28, myO - 5, TXT, false);
            lineSeg(mxO + 12, myO + 1, mxO + 21, myO + 5, CYAN, false);
            lineSeg(mxO + 21, myO + 5, mxO + 29, myO + 2, YELLOW, false);
            for (const [sxE, syE] of [[16, -2], [24, -1], [27, -7], [26, 5]]) putPx(mxO + sxE, myO + syE, TXT);
          } else if (org.id === 'BOLSA_TINTA_CEGANTE') {
            for (let dyI = -7; dyI <= 5; dyI += 1) {
              for (let dxI = 11; dxI <= 29; dxI += 1) {
                const distNuv = Math.hypot((dxI - 20) * 0.78, dyI + 1);
                if (distNuv <= 6.2 && (distNuv <= 4.3 || (dxI + dyI) % 2 === 0)) {
                  const corNuv = distNuv < 2.6 ? [22, 10, 38, 255] : distNuv < 4.5 ? [58, 24, 92, 255] : VIOLET;
                  putPx(mxO + dxI, myO + dyI, corNuv);
                }
              }
            }
            for (const [gxI, gyI] of [[13, -6], [28, -5], [30, 1], [25, 5]]) putPx(mxO + gxI, myO + gyI, VIOLET);
          } else if (org.id === 'DENTE_LEVIATA_SERRILHADO') {
            lineSeg(mxO + 12, myO + 5, mxO + 27, myO - 8, RED, false);
            lineSeg(mxO + 13, myO + 5, mxO + 28, myO - 7, TXT, false);
            for (const [gxD, gyD, cD] of [[18, -5, RED], [22, 2, RED], [25, -2, AMBER], [29, -5, RED], [20, 4, RED]]) {
              putPx(mxO + gxD, myO + gyD, cD);
            }
          } else if (org.id === 'GLANDULA_TERMOFILICA') {
            for (let dyT = -6; dyT <= 4; dyT += 1) {
              for (let dxT = 12; dxT <= 28; dxT += 1) {
                const dTerm = Math.hypot((dxT - 19) * 0.75, dyT + 1 + (dxT - 12) * 0.12);
                if (dTerm <= 5.4 && (dTerm <= 3.6 || (dxT + dyT) % 2 === 0)) {
                  const cTerm = dTerm < 2.2 ? TXT : dTerm < 3.8 ? YELLOW : (dxT + dyT) % 2 === 0 ? AMBER : RED;
                  putPx(mxO + dxT, myO + dyT, cTerm);
                }
              }
            }
            for (const [bxF, byF] of [[26, -6], [29, -3], [24, 4]]) putPx(mxO + bxF, myO + byF, YELLOW);
          } else if (org.id === 'BEXIGA_PRESSAO_ABISSAL') {
            hLine(mxO + 12, mxO + 26, myO - 1, CYAN, 2);
            hLine(mxO + 13, mxO + 23, myO - 1, TXT, 1);
            for (const [bxP, byP, cP] of [[16, -4, CYAN], [21, -5, TXT], [25, -4, CYAN], [28, -2, TXT], [27, 2, CYAN], [22, 3, CYAN], [30, -4, CYAN]]) {
              putPx(mxO + bxP, myO + byP, cP);
            }
          } else {
            for (let dyB = -5; dyB <= 4; dyB += 1) {
              for (let dxB = 12; dxB <= 27; dxB += 1) {
                const dTox = Math.hypot((dxB - 19) * 0.8, dyB + 0.5);
                if (dTox <= 5.0 && (dTox <= 3.3 || (dxB + dyB) % 2 === 0)) {
                  putPx(mxO + dxB, myO + dyB, dTox < 2.2 ? YELLOW : dTox < 3.6 ? GREEN : [28, 118, 64, 255]);
                }
              }
            }
            lineSeg(mxO + 19, myO - 6, mxO + 24, myO - 9, TXT, false);
            lineSeg(mxO + 20, myO + 4, mxO + 25, myO + 7, YELLOW, false);
            putPx(mxO + 28, myO - 2, GREEN);
          }
        }
        txt(cx0 + 4, oy1 - 10, stO.rot, f === 3 ? YELLOW : f === 2 ? AMBER : TXT, 6);
      }
    });

    chanfrado(490, 331, 952, 529, PANEL_BG, BORDER, 3, RIM);
    txt(498, 337, '4 BIO-SISTEMAS VITAIS (REATOR MARINHO, ESFÍNCTER, BULBO & ESPIRÁCULO)', CYAN, 6);

    const SISTEMAS_VITAIS = [
      { tipo: 'CORACAO', nome: 'CORAÇÃO BIO-EL.', sub: 'REATOR R6', cor: VIOLET, tags: ['F0 DIÁSTOLE', 'F1 CARGA', 'F2 SÍSTOLE', 'F3 PULSO'] },
      { tipo: 'ESFINCTER', nome: 'ESFÍNCTER INT.', sub: 'PORTAL SALAS', cor: AMBER, tags: ['F0 SELADO', 'F1 ABRINDO', 'F2 DILATADO', 'F3 FLUXO'] },
      { tipo: 'BULBO', nome: 'BULBO NEURAL', sub: 'SINAPSE +10%', cor: CYAN, tags: ['F0 LATENTE', 'F1 SINAPSE', 'F2 ACOPLADO', 'F3 CÓRTEX'] },
      { tipo: 'ESPIRACULO', nome: 'ESPIRÁCULO EXT.', sub: 'ESCOTILHA H2O', cor: GREEN, tags: ['F0 ESTANQUE', 'F1 DRENO', 'F2 ADMISSÃO', 'F3 TRAVADO'] },
    ];
    SISTEMAS_VITAIS.forEach((sv, k) => {
      const sy0 = 350 + k * 44;
      const sy1 = sy0 + 41;
      chanfrado(494, sy0, 603, sy1, CELL_BG, sv.cor, 2);
      txt(497, sy0 + 8, sv.nome, sv.cor, 6);
      txt(497, sy0 + 23, sv.sub, TXT, 6);

      for (let f = 0; f < 4; f += 1) {
        const cx0 = 606 + f * 86;
        const cx1 = cx0 + 82;
        const mx = cx0 + 41;
        const my = sy0 + 16;
        chanfrado(cx0, sy0, cx1, sy1, CELL_BG, f === 3 ? sv.cor : [26, 48, 62, 255], 2);
        if (sv.tipo === 'CORACAO') {
          blitOrgaoFisiologico4Frames(assets.iconesHiBit?.CORACAO_BIO_ELETRICO, mx - 6, my + (f === 2 ? -1 : 0), 28, 24, f, CYAN);
          chanfrado(mx + 14, sy0 + 5, mx + 22, sy0 + 27, [12, 26, 36, 255], f >= 1 ? GREEN : BORDER, 1);
          if (f >= 1) fillRect(mx + 16, sy0 + 26 - f * 6, mx + 20, sy0 + 25, f === 3 ? CYAN : GREEN);
          if (f >= 2) {
            lineSeg(mx - 18, my - 4, mx - 23, my - 8, YELLOW, false);
            lineSeg(mx + 7, my - 5, mx + 12, my - 9, CYAN, false);
          }
        } else if (sv.tipo === 'ESFINCTER') {
          const rAb = f === 0 ? 0 : f === 1 ? 2 : f === 2 ? 5 : 6;
          for (let dxE = -28; dxE <= 28; dxE += 1) {
            const xE = mx + dxE;
            if (Math.abs(dxE) > 13) {
              const espCost = Math.abs(dxE) > 22 ? 2 : 3;
              for (let kC = 0; kC < espCost; kC += 1) {
                const cCost = kC === 0 ? [92, 54, 48, 255] : [58, 34, 34, 255];
                putPx(xE, my - rAb - 3 - kC, cCost);
                putPx(xE, my + rAb + 3 + kC, cCost);
              }
              continue;
            }
            const arco = Math.cos((dxE / 14) * (Math.PI / 2));
            const abLoc = rAb === 0 ? 0 : Math.max(1, Math.round(rAb * arco));
            const espLabio = Math.abs(dxE) >= 11 ? 2 : 3;
            const estria = (Math.abs(dxE) % 3) === 1;
            const yLabSup = my - abLoc;
            const yLabInf = my + abLoc;
            putPx(xE, yLabSup - espLabio - 1, [8, 14, 20, 255]);
            putPx(xE, yLabInf + espLabio + 1, [8, 14, 20, 255]);
            for (let kl = 0; kl < espLabio; kl += 1) {
              const cSup = kl === 0 ? (estria ? [232, 146, 48, 255] : [206, 114, 28, 255]) : [142, 64, 26, 255];
              const cInf = kl === 0 ? (estria ? [196, 102, 34, 255] : [168, 76, 28, 255]) : [116, 48, 24, 255];
              putPx(xE, yLabSup - 1 - kl, cSup);
              putPx(xE, yLabInf + 1 + kl, cInf);
            }
            if (rAb === 0) {
              putPx(xE, my, estria ? [96, 42, 24, 255] : [12, 10, 16, 255]);
            } else {
              for (let yl = yLabSup; yl <= yLabInf; yl += 1) {
                const dthL = ((xE + yl) & 1) === 0;
                const corLum =
                  f === 1
                    ? (dthL ? [24, 88, 110, 255] : [16, 62, 80, 255])
                    : f === 2
                      ? (dthL ? CYAN : [36, 138, 168, 255])
                      : (Math.abs(yl - my) <= 1 && ((xE + f) % 3 !== 0) ? TXT : dthL ? CYAN : [46, 162, 192, 255]);
                putPx(xE, yl, corLum);
              }
            }
          }
          if (f === 3) {
            for (const [jxF, jyF] of [[-18, -1], [-15, 1], [15, -1], [18, 1], [-21, 0], [21, 0]]) {
              putPx(mx + jxF, my + jyF, (jxF & 1) === 0 ? TXT : CYAN);
            }
          }
        } else if (sv.tipo === 'BULBO') {
          const rBx = f === 0 ? 6 : f === 1 ? 7 : 8;
          const rBy = f === 0 ? 5 : f === 1 ? 6 : 7;
          for (const [idxN, dxN] of [[-10, -4, 4, 10]].flat().entries()) {
            const raizAtiva = f >= 2 || (f === 1 && (idxN === 1 || idxN === 2));
            lineSeg(
              mx + dxN,
              my + 10,
              mx + Math.sign(dxN) * 3,
              my + 2,
              f === 3 ? YELLOW : raizAtiva ? CYAN : [32, 48, 60, 255],
              false
            );
          }
          for (let dyB = -rBy - 1; dyB <= rBy + 1; dyB += 1) {
            for (let dxB = -rBx - 1; dxB <= rBx + 1; dxB += 1) {
              const dNorm = (dxB * dxB) / ((rBx + 0.4) * (rBx + 0.4)) + (dyB * dyB) / ((rBy + 0.4) * (rBy + 0.4));
              if (dNorm > 1.22) continue;
              if (dNorm > 0.90) {
                putPx(mx + dxB, my - 2 + dyB, [8, 14, 20, 255]);
              } else if (dNorm < 0.26) {
                const corNuc =
                  f === 0
                    ? (dxB === -1 && dyB === -1 ? [42, 68, 82, 255] : [16, 26, 36, 255])
                    : f === 1
                      ? (dxB + dyB <= 0 ? GREEN : [24, 148, 92, 255])
                      : f === 2
                        ? (dxB === 0 && dyB === 0 ? TXT : YELLOW)
                        : TXT;
                putPx(mx + dxB, my - 2 + dyB, corNuc);
              } else {
                const dthB = ((dxB + dyB) & 1) === 0;
                const corMemb =
                  f === 0
                    ? (dthB ? [28, 42, 56, 255] : [20, 32, 44, 255])
                    : f === 1
                      ? (dthB ? [34, 118, 144, 255] : [22, 86, 108, 255])
                      : f === 2
                        ? (dthB ? CYAN : [42, 166, 196, 255])
                        : (dNorm < 0.52 ? YELLOW : dthB ? CYAN : TXT);
                putPx(mx + dxB, my - 2 + dyB, corMemb);
              }
            }
          }
          if (f === 3) {
            lineSeg(mx - 9, my - 5, mx - 15, my - 8, YELLOW, false);
            lineSeg(mx + 9, my - 5, mx + 15, my - 8, YELLOW, false);
            lineSeg(mx - 9, my + 1, mx - 14, my + 4, CYAN, false);
            lineSeg(mx + 9, my + 1, mx + 14, my + 4, CYAN, false);
            putPx(mx, my - 11, TXT);
          }
        } else {
          chanfrado(mx - 9, my - 8, mx + 9, my + 8, [34, 24, 28, 255], f === 3 ? RED : f >= 1 ? CYAN : AMBER, 3);
          if (f === 0) {
            hLine(mx - 5, mx + 5, my - 1, AMBER, 1);
            hLine(mx - 5, mx + 5, my, [12, 10, 16, 255], 1);
            hLine(mx - 5, mx + 5, my + 1, [142, 68, 24, 255], 1);
          } else if (f === 1 || f === 2) {
            chanfrado(mx - 5, my - 4, mx + 5, my + 4, [12, 56, 74, 255], CYAN, 2);
            const dirJ = f === 1 ? -1 : 1;
            hLine(mx - 4, mx + 4, my, TXT, 1);
            lineSeg(mx + dirJ * 10, my - 2, mx + dirJ * 18, my - 4, CYAN, false);
            lineSeg(mx + dirJ * 10, my + 2, mx + dirJ * 18, my + 4, f === 2 ? AMBER : TXT, false);
          } else {
            for (let ryL = 0; ryL < MASCARA_CADEADO_8X10.length; ryL += 1) {
              const linL = MASCARA_CADEADO_8X10[ryL];
              for (let rxL = 0; rxL < linL.length; rxL += 1) {
                if (linL[rxL] === '#') putPx(mx - 4 + rxL, my - 5 + ryL, AMBER);
              }
            }
          }
        }
        txt(cx0 + 4, sy1 - 10, sv.tags[f], f === 3 ? YELLOW : TXT, 6);
      }
    });
  } else {
    chanfrado(0, 0, W - 1, 29, [8, 15, 23, 255], BORDER, 0, RIM);
    chanfrado(3, 3, W - 4, 26, null, [22, 42, 56, 200], 2);
    txt(10, 10, 'PROVA 60 FPS: PORTAIS ORGÂNICOS, SOBREVIVÊNCIA (0 kg) & ESTRATÉGIA', CYAN, 7);
    chanfrado(664, 5, 952, 24, [10, 24, 34, 255], AMBER, 2, YELLOW);
    txt(672, 11, 'DUTO 5<->6 | ROTA SECA vs FIXAÇÃO', YELLOW, 7);

    const estBase10 = criarEstadoInicialPartida({
      seedPartida: 'spread10-travessia-sobrevivencia-estrategia',
      idArquitetura: 'CARCACA_ALFA',
      faseJogo: 'COMBATE',
      classeAlvoInicial: 'BARCO_HUMANO',
    });

    const montarQuadroRecorte = (mutarEstadoFn, nSteps60 = 6) => {
      const clone = structuredClone(estBase10);
      mutarEstadoFn(clone);
      const cong = clonarProfundoCongelado(clone);
      const vmP = projetarFn(cong);
      const hbP = obterMapaHitboxesNativo(vmP);
      let evP = null;
      for (let q = 0; q < nSteps60; q += 1) {
        evP = interpolarFn(evP, vmP, 1 / 60, { hitboxes: hbP });
      }
      return rasterizarQuadroRgba960x540(vmP, { estadoVisual60Fps: evP }, assets, hbP, tabUnif);
    };

    const cloneRotaSeca = structuredClone(estBase10);
    const cam3Seca = cloneRotaSeca.naveJogador.camaras.find((c) => c.id === 3);
    if (cam3Seca) {
      cam3Seca.aguaKg = 0;
      cam3Seca.oxigenioPct = 10;
    }
    const rotaInteligente = calcularRotaTaticaSobrevivencia(cloneRotaSeca.naveJogador, 7, 5, 'POLVO');
    const textoRotaDesvio = Array.isArray(rotaInteligente.rota)
      ? rotaInteligente.rota.join('->')
      : '7->1->2->4->5';
    const multSecoP5 = Number(CONSTANTES_TRIPULACAO.PENALIDADE_VEL_SECO_AQUATICO_MULT ?? 0.5).toFixed(2);
    const danoSecoP5 = Math.round(Number(CONSTANTES_TRIPULACAO.DANO_ASFIXIA_SECA_OU_HIPOXIA_HP_S ?? 8));

    const PAINEIS_8 = [
      {
        titulo: 'P1 [0.08s] SAÍDA 6 POÇO',
        rodape: 'PORTAL 5-6 ABRE BOCA VENTRAL',
        cor: CYAN,
        buf: montarQuadroRecorte((st) => {
          st.naveJogador.tripulacao = [
            { id: 'p-duto', especie: 'POLVO', hpAtual: HP_MAX_POR_ESPECIE.POLVO, hpMax: HP_MAX_POR_ESPECIE.POLVO, camaraAtualId: 6, camaraDestinoId: 5, proximaCamaraId: 5, progressoSalto0a1: 0.14, localizacao: 'NAVE_JOGADOR' },
            { id: 'a-ponte', especie: 'ARRAIA', hpAtual: HP_MAX_POR_ESPECIE.ARRAIA, hpMax: HP_MAX_POR_ESPECIE.ARRAIA, camaraAtualId: 2, camaraDestinoId: 3, proximaCamaraId: 3, progressoSalto0a1: 0.25, localizacao: 'NAVE_JOGADOR' },
          ];
        }, 4),
      },
      {
        titulo: 'P2 [0.42s] CURVA SOB PISO 4',
        rodape: 'SIFÃO EM J (NÃO CRUZA 8 ENB!)',
        cor: YELLOW,
        buf: montarQuadroRecorte((st) => {
          st.naveJogador.tripulacao = [
            { id: 'p-duto', especie: 'POLVO', hpAtual: HP_MAX_POR_ESPECIE.POLVO, hpMax: HP_MAX_POR_ESPECIE.POLVO, camaraAtualId: 6, camaraDestinoId: 5, proximaCamaraId: 5, progressoSalto0a1: 0.38, localizacao: 'NAVE_JOGADOR' },
            { id: 'a-ponte', especie: 'ARRAIA', hpAtual: HP_MAX_POR_ESPECIE.ARRAIA, hpMax: HP_MAX_POR_ESPECIE.ARRAIA, camaraAtualId: 2, camaraDestinoId: 3, proximaCamaraId: 3, progressoSalto0a1: 0.55, localizacao: 'NAVE_JOGADOR' },
          ];
        }, 8),
      },
      {
        titulo: 'P3 [0.76s] SUBIDA ESPINHA',
        rodape: 'COLUNA CENTRAL -> ORIFÍCIO 5',
        cor: CYAN,
        buf: montarQuadroRecorte((st) => {
          st.naveJogador.tripulacao = [
            { id: 'p-duto', especie: 'POLVO', hpAtual: HP_MAX_POR_ESPECIE.POLVO, hpMax: HP_MAX_POR_ESPECIE.POLVO, camaraAtualId: 6, camaraDestinoId: 5, proximaCamaraId: 5, progressoSalto0a1: 0.72, localizacao: 'NAVE_JOGADOR' },
            { id: 'a-ponte', especie: 'ARRAIA', hpAtual: HP_MAX_POR_ESPECIE.ARRAIA, hpMax: HP_MAX_POR_ESPECIE.ARRAIA, camaraAtualId: 3, camaraDestinoId: 5, proximaCamaraId: 5, progressoSalto0a1: 0.35, localizacao: 'NAVE_JOGADOR' },
          ];
        }, 12),
      },
      {
        titulo: 'P4 [1.10s] CHEGADA 5 SIFÃO',
        rodape: 'ACOPLA BULBO (+10% ESQUIVA)',
        cor: GREEN,
        buf: montarQuadroRecorte((st) => {
          st.naveJogador.tripulacao = [
            { id: 'p-duto', especie: 'POLVO', hpAtual: HP_MAX_POR_ESPECIE.POLVO, hpMax: HP_MAX_POR_ESPECIE.POLVO, camaraAtualId: 5, acopladoBulbo: true, localizacao: 'NAVE_JOGADOR' },
            { id: 'a-ponte', especie: 'ARRAIA', hpAtual: HP_MAX_POR_ESPECIE.ARRAIA, hpMax: HP_MAX_POR_ESPECIE.ARRAIA, camaraAtualId: 3, acopladoBulbo: true, localizacao: 'NAVE_JOGADOR' },
          ];
        }, 16),
      },
      {
        titulo: 'P5 RISCO: CÂM. 3 SECA (0 kg)',
        rodape: `RASTEJO ${multSecoP5}x + ASFIXIA -${danoSecoP5}/s!`,
        cor: RED,
        buf: montarQuadroRecorte((st) => {
          const c3 = st.naveJogador.camaras.find((c) => c.id === 3);
          if (c3) {
            c3.aguaKg = 0;
            c3.oxigenioPct = 10;
            c3.valvulaExternaAberta = true;
          }
          st.naveJogador.tripulacao = [
            { id: 'p-seco', especie: 'POLVO', hpAtual: 62, hpMax: HP_MAX_POR_ESPECIE.POLVO, camaraAtualId: 3, camaraDestinoId: 5, proximaCamaraId: 5, progressoSalto0a1: 0.06, localizacao: 'NAVE_JOGADOR' },
          ];
        }, 4),
      },
      {
        titulo: 'P6 DESVIO AUTOMÁTICO H2O',
        rodape: `ROTA ${textoRotaDesvio} (0 DANO)`,
        cor: GREEN,
        buf: montarQuadroRecorte((st) => {
          const c3 = st.naveJogador.camaras.find((c) => c.id === 3);
          if (c3) {
            c3.aguaKg = 0;
            c3.oxigenioPct = 10;
            c3.valvulaExternaAberta = true;
          }
          st.naveJogador.tripulacao = [
            { id: 'p-desvio', especie: 'POLVO', hpAtual: HP_MAX_POR_ESPECIE.POLVO, hpMax: HP_MAX_POR_ESPECIE.POLVO, camaraAtualId: 2, camaraDestinoId: 5, proximaCamaraId: 4, rotaAtiva: rotaInteligente.rota, progressoSalto0a1: 0.52, localizacao: 'NAVE_JOGADOR' },
          ];
        }, 10),
      },
      {
        titulo: 'P7 INTERCEPTAÇÃO HOSTIL',
        rodape: 'INVASOR TRAVA ROTA EM 4 BAR!',
        cor: RED,
        buf: montarQuadroRecorte((st) => {
          st.naveJogador.tripulacao = [
            { id: 'a-trava', especie: 'ARRAIA', hpAtual: 56, hpMax: HP_MAX_POR_ESPECIE.ARRAIA, camaraAtualId: 4, interceptadoPorInvasor: true, localizacao: 'NAVE_JOGADOR' },
          ];
          st.naveJogador.invasoresInimigos = [
            { id: 'inv-mar-4', especie: 'MARINHEIRO', hpAtual: 76, hpMax: CONSTANTES_IA_INIMIGOS.HP_MARINHEIRO_HUMANO, camaraAtualId: 4 },
          ];
        }, 10),
      },
      {
        titulo: 'P8 ESTRATÉGIA DE ESCOLTA',
        rodape: 'CAR FIXA 1x1 -> ARRAIA NADA!',
        cor: YELLOW,
        buf: montarQuadroRecorte((st) => {
          st.naveJogador.tripulacao = [
            { id: 'c-pin', especie: 'CARANGUEJO', hpAtual: 104, hpMax: HP_MAX_POR_ESPECIE.CARANGUEJO, camaraAtualId: 4, localizacao: 'NAVE_JOGADOR' },
            { id: 'a-livre', especie: 'ARRAIA', hpAtual: HP_MAX_POR_ESPECIE.ARRAIA, hpMax: HP_MAX_POR_ESPECIE.ARRAIA, camaraAtualId: 4, camaraDestinoId: 6, proximaCamaraId: 6, progressoSalto0a1: 0.42, localizacao: 'NAVE_JOGADOR' },
          ];
          st.naveJogador.invasoresInimigos = [
            { id: 'inv-mar-4', especie: 'MARINHEIRO', hpAtual: 54, hpMax: CONSTANTES_IA_INIMIGOS.HP_MARINHEIRO_HUMANO, camaraAtualId: 4 },
          ];
        }, 8),
      },
    ];

    PAINEIS_8.forEach((pn, idxP) => {
      const col = idxP % 4;
      const row = Math.floor(idxP / 4);
      const px0 = 6 + col * 238;
      const py0 = 33 + row * 252;
      const px1 = px0 + 234;
      const py1 = py0 + 248;
      chanfrado(px0, py0, px1, py1, PANEL_BG, pn.cor, 3, TXT);
      chanfrado(px0 + 3, py0 + 3, px1 - 3, py0 + 18, CELL_BG, [28, 52, 68, 255], 2);
      txt(px0 + 7, py0 + 7, pn.titulo.slice(0, 36), pn.cor, 6);
      recortarBlocoCena960(pn.buf, 332, 114, 228, 210, px0 + 3, py0 + 21);
      chanfrado(px0 + 3, py1 - 16, px1 - 3, py1 - 3, CELL_BG, [28, 52, 68, 255], 2);
      txt(px0 + 7, py1 - 13, pn.rodape.slice(0, 36), TXT, 6);
    });
  }

  const finalImg = escalarNearestRgba(W, H, Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength), escala);
  const pngBuffer = codificarBufferRgbaParaPng(finalImg.largura, finalImg.altura, finalImg.rgba);
  return Object.freeze({
    ok: true,
    tipoSpread,
    larguraPx: finalImg.largura,
    alturaPx: finalImg.altura,
    escalaInteira: escala,
    pngBuffer,
  });
}
