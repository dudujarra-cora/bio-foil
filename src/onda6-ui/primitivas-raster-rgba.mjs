/**
 * ONDA 6 — Primitivas Puras de Rasterização RGBA Hi-Bit 960x540 (Server & Browser 0-Byte Diff)
 * Dono Único (Lei N5): src/onda6-ui/primitivas-raster-rgba.mjs
 *
 * Responsabilidades:
 *  - Instanciar o framebuffer `960x540` (`Uint8ClampedArray`) e todas as primitivas determinísticas
 *    (`putPx`, `fillRect`, `hLine`, `lineSeg`, `chanfradoBezel`, `panel`, `txt`, `segBar`, `desenharPersonagemPose4F`,
 *    `desenharMiniaturaBioNaveHiBit`, `desenharRetratoRecortadoHiBit`, `obterPerfilLimpo`, `amostrarCeuMar`, `obterMascaraF4`)
 *    em função 100% autocontida para paridade idêntica entre Node.js e `/cliente.js`.
 */

export function criarContextoPrimitivasRgba960x540(viewModel, opcoes, assets, hitboxes, tabelas, cachesFrame) {
  const opSafe = opcoes ?? {};
  const tabSafe = tabelas ?? {};
  const assetsSafe = assets ?? {};
  const hbSafe = Array.isArray(hitboxes) ? hitboxes : [];
  const vmSafe = viewModel ?? {};

  const f4Anim = Number.isInteger(opSafe.cicloSpriteF4) && opSafe.cicloSpriteF4 >= 0 ? opSafe.cicloSpriteF4 % 4 : 0;
  const disparandoDorsal = Boolean(opSafe.disparandoDorsal);
  const tempoSeg = Number.isFinite(Number(opSafe.tempoSeg))
    ? Number(opSafe.tempoSeg)
    : Number(opSafe.estadoVisual60Fps?.tempoAcumuladoSeg ?? 0);
  const ev60 = opSafe.estadoVisual60Fps ?? null;
  const idHoverAtivo =
    opSafe.hoverHitboxId ?? opSafe.idHitboxHover ?? ev60?.hoverHitboxId ?? vmSafe.idHitboxHover ?? null;
  const idPressAtivo = opSafe.pressHitboxId ?? ev60?.pressHitboxId ?? null;
  const W = 960;
  const H = 540;
  const rgba = new Uint8ClampedArray(W * H * 4);

  const GLIFOS = tabSafe.glifos8px ?? {};
  const GLIFOS_5X7 = tabSafe.glifos5x7 ?? GLIFOS;
  const GLIFOS_6X7 = tabSafe.glifos6x7 ?? GLIFOS;
  const ACENTOS = tabSafe.mapaAcentos ?? {};
  const M_SOQUETE = tabSafe.mascaraSoquete ?? [];
  const M_BOLHA = tabSafe.mascaraBolha ?? [];
  const M_CADEADO = tabSafe.mascaraCadeado ?? [];
  const M_CORACAO = tabSafe.mascaraCoracao ?? [];
  const RECORTES_F4 = tabSafe.recortesF4 ?? {};
  const NOMES_CARC = tabSafe.nomesCarcacas ?? {};
  const NOMES_SALAS = tabSafe.nomesSalasAlvo ?? {};
  const NOMES_ARMAS = tabSafe.nomesArmasHud ?? {};
  const SIGLAS_ESP = tabSafe.siglasEspecieHud ?? {};
  const SPRITES_HB = tabSafe.spritesHiBit ?? {};
  const SPRITES_INSUMOS = tabSafe.spritesInsumosLoja ?? {};
  const ATLAS_4F = tabSafe.atlasAnimacao4Frames ?? {};
  const ICONES_SIS_12 = tabSafe.iconesSistemas12x12 ?? {
    ESC: ['...######...','..#CCCCCC#..','.#CCWWWWCC#.','#CCW....WCC#','#CW..VV..WC#','#CW.VVVV.WC#','#CW.VVVV.WC#','#CCW.VV.WCC#','.#CCWWWWCC#.','..#CCCCCC#..','...######...','............'],
    SIF: ['....#####...','...#HHHHH#..','..#HHCCCHH#.','.#HHCWWWCCH#','#OOCCWWWCCH#','#LLOOOOOHHH#','#OOCCWWWCCH#','.#HHCWWWCCH#','..#HHCCCHH#.','...#HHHHH#..','....#####...','............'],
    BRQ: ['..###..###..','.#EEE##EEE#.','#EECCEECCEE#','#EC..EC..CE#','#EECCEECCEE#','.#EEE##EEE#.','..#EECCEE#..','.#ECCWWCCE#.','.#ECWWWWCE#.','..#ECCECE#..','...######...','............'],
    ART: ['......#####.','.....#HHHHW#','..###HHHHWW#','.#MMHHHHHH#.','#MMMOOOOO#..','#MMHHHHHH###','.#MM#HHHHWW#','..##.#HHHH#.','....#MMMMM#.','...#MM##MM#.','...###..###.','............'],
    CTX: ['...######...','.##CCCCCC##.','#CCWWWWWWCC#','#CWVVLLVVWC#','#CWVLLLLVWC#','#CWVLLLLVWC#','#CWVVLLVVWC#','#CCWWWWWWCC#','.##CCCCCC##.','...##CC##...','....####....','............'],
    MST: ['.....###....','....#OOO#...','....#OWO#...','....#OOO#...','....#OOO#...','....#OOO#...','.####OOO####','#CCCCOOOCC#.','#CWWWWWWWC#.','.##########.','............','............'],
    TUB: ['..########..','.#HHHHHHHH#.','#HHMMMMMMHH#','#HMWWWWWWMH#','#HMOOOOOOMH#','#HMOOOOOOMH#','#HHMMMMMMHH#','.#HHHHHHHH#.','..#MM##MM#..','.#MM#..#MM#.','.###....###.','............'],
    TNT: ['....####....','...#VVVV#...','..#VVCCVV#..','.#VVCWWCVV#.','#VVVVCCVVVV#','#VVVVVVVVVV#','#VVVCCCCVVV#','.#VVVVVVVV#.','..#VV##VV#..','.#VV#..#VV#.','..##....##..','............'],
  };
  const VARIANTES_57A = tabSafe.variantesInimigos57A ?? {
    BARCO_1_LANCHA: { idArquetipo: 'BARCO_1_LANCHA', tintCascoRgb: [118, 146, 158], corDestaqueRgb: [79, 242, 255], corSecundariaRgb: [245, 158, 11], superestrutura: 'MASTRO_RADAR_LEVE' },
    BARCO_2_CORVETA: { idArquetipo: 'BARCO_2_CORVETA', tintCascoRgb: [86, 128, 168], corDestaqueRgb: [255, 224, 51], corSecundariaRgb: [79, 242, 255], superestrutura: 'PONTE_BLINDADA_DUPLA_TORRETA' },
    BARCO_3_ARRASTAO: { idArquetipo: 'BARCO_3_ARRASTAO', tintCascoRgb: [156, 108, 72], corDestaqueRgb: [245, 158, 11], corSecundariaRgb: [255, 42, 56], superestrutura: 'PORTICO_GUINDASTE_POPA' },
    BARCO_4_SUBMARINO: { idArquetipo: 'BARCO_4_SUBMARINO', tintCascoRgb: [62, 82, 98], corDestaqueRgb: [255, 42, 56], corSecundariaRgb: [57, 230, 98], superestrutura: 'VELA_PERISCOPIO_SUBMERSO' },
    MONSTRO_1_TEUTHIS: { idArquetipo: 'MONSTRO_1_TEUTHIS', tintCascoRgb: [152, 68, 118], corDestaqueRgb: [79, 242, 255], corSecundariaRgb: [255, 42, 56], morfologia: 'MANTO_BICO_TENTACULOS' },
    MONSTRO_2_ENGUIA: { idArquetipo: 'MONSTRO_2_ENGUIA', tintCascoRgb: [68, 116, 184], corDestaqueRgb: [255, 224, 51], corSecundariaRgb: [79, 242, 255], morfologia: 'CRISTA_ARCOS_VOLTAICOS' },
    MONSTRO_3_CARANGUEJO: { idArquetipo: 'MONSTRO_3_CARANGUEJO', tintCascoRgb: [178, 98, 56], corDestaqueRgb: [245, 158, 11], corSecundariaRgb: [255, 224, 51], morfologia: 'CARAPACA_ESPINHOSA_PINCAS' },
    MONSTRO_4_HIDRA: { idArquetipo: 'MONSTRO_4_HIDRA', tintCascoRgb: [64, 158, 102], corDestaqueRgb: [57, 230, 98], corSecundariaRgb: [188, 72, 224], morfologia: 'COROAS_POLIPOS_ESPOROS' },
  };

  const BG = [6, 10, 15, 255];
  const PANEL = [8, 13, 19, 255];
  const BORDER = [30, 45, 56, 255];
  const RIM = [56, 86, 104, 255];
  const TXT = [214, 232, 240, 255];
  const DIM = [110, 130, 140, 255];
  const GREEN = [57, 230, 98, 255];
  const CYAN = [79, 242, 255, 255];
  const AMBER = [245, 158, 11, 255];
  const RED = [255, 42, 56, 255];
  const YELLOW = [255, 224, 51, 255];
  const VIOLET = [91, 42, 134, 255];
  const PIP_OFF = [40, 52, 60, 255];
  const SLOT_BG = [12, 20, 26, 255];

  const MAPA_RGBA_SPRITES = {
    ...(tabSafe.paletaSprites ?? tabSafe.paletaRgba ?? {}),
    Y: YELLOW,
    G: GREEN,
    R: RED,
  };

  const cStore = cachesFrame ?? (criarContextoPrimitivasRgba960x540._caches || (criarContextoPrimitivasRgba960x540._caches = {}));
  const wmPerfil = cStore.wmPerfil || (cStore.wmPerfil = new WeakMap());
  const wmMascF4 = cStore.wmMascF4 || (cStore.wmMascF4 = new WeakMap());
  const wmMiniAlfa = cStore.wmMiniAlfa || (cStore.wmMiniAlfa = new WeakMap());

  const obterPerfilLimpo = (placa) => {
    if (!placa) return null;
    const emCache = wmPerfil.get(placa);
    if (emCache) return emCache;
    const hP = placa.altura;
    const wP = placa.largura;
    const cru = new Int16Array(hP * 3);
    const cols = [5, 10, 15, 20, 25];
    const rs = [0, 0, 0, 0, 0];
    const gs = [0, 0, 0, 0, 0];
    const bs = [0, 0, 0, 0, 0];
    for (let y = 0; y < hP; y += 1) {
      for (let k = 0; k < 5; k += 1) {
        const idx = (y * wP + cols[k]) * 4;
        rs[k] = placa.rgba[idx];
        gs[k] = placa.rgba[idx + 1];
        bs[k] = placa.rgba[idx + 2];
      }
      rs.sort((a, b) => a - b);
      gs.sort((a, b) => a - b);
      bs.sort((a, b) => a - b);
      cru[y * 3] = rs[2];
      cru[y * 3 + 1] = gs[2];
      cru[y * 3 + 2] = bs[2];
    }
    const buf = new Int16Array(hP * 3);
    for (let y = 0; y < hP; y += 1) {
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let cnt = 0;
      for (let dy = -4; dy <= 4; dy += 1) {
        const yy = Math.max(0, Math.min(hP - 1, y + dy));
        sr += cru[yy * 3];
        sg += cru[yy * 3 + 1];
        sb += cru[yy * 3 + 2];
        cnt += 1;
      }
      buf[y * 3] = Math.round(sr / cnt);
      buf[y * 3 + 1] = Math.round(sg / cnt);
      buf[y * 3 + 2] = Math.round(sb / cnt);
    }
    wmPerfil.set(placa, buf);
    return buf;
  };

  const amostrarCeuMar = (perfil, py, sx, sy) => {
    if (!perfil) return [8, 20, 30];
    const yC = Math.max(0, Math.min((perfil.length / 3) - 1, py));
    const ond = Math.round(Math.sin(sx * 0.015 + sy * 0.031) * 2);
    const dith = ((sx + sy) & 1) === 0 ? 1 : -1;
    const delta = ond + dith;
    return [
      Math.max(2, Math.min(250, perfil[yC * 3] + delta)),
      Math.max(4, Math.min(250, perfil[yC * 3 + 1] + delta)),
      Math.max(8, Math.min(252, perfil[yC * 3 + 2] + delta)),
    ];
  };

  const obterMascaraF4 = (idCarc) => {
    const spec = RECORTES_F4[idCarc];
    const f4 = assetsSafe.f4Ships;
    if (!spec || !f4) return null;
    let mapaRecortes = wmMascF4.get(f4);
    if (!mapaRecortes) {
      mapaRecortes = {};
      wmMascF4.set(f4, mapaRecortes);
    }
    if (mapaRecortes[idCarc]) return mapaRecortes[idCarc];
    const [sx, sy, sw, sh] = spec.casco;
    const [bx, by, bw, bh] = spec.bloco;
    const mask = new Uint8Array(sw * sh);
    const fila = new Int32Array(sw * sh);
    let ini = 0;
    let fim = 0;
    const ehFundoCeuMarF4 = (r, g, b, yLocal) => {
      if (r < 10 && g < 16 && b < 22) return false;
      if (yLocal >= (by - sy + bh - 2) && g > 105 && b > 120 && r < 90) return true;
      return r < 24 && g >= r + 8 && (b - g) >= 5 && (b - g) <= 16 && g < 92 && b < 108;
    };
    const tentarSemente = (x, y) => {
      const mIdx = y * sw + x;
      if (mask[mIdx]) return;
      const p = ((sy + y) * f4.largura + (sx + x)) * 4;
      const r = f4.rgba[p];
      const g = f4.rgba[p + 1];
      const b = f4.rgba[p + 2];
      if (ehFundoCeuMarF4(r, g, b, y)) {
        mask[mIdx] = 1;
        fila[fim++] = mIdx;
      }
    };
    for (let x = 0; x < sw; x += 1) {
      tentarSemente(x, 0);
      tentarSemente(x, sh - 1);
    }
    for (let y = 0; y < sh; y += 1) {
      tentarSemente(0, y);
      tentarSemente(sw - 1, y);
    }
    while (ini < fim) {
      const cur = fila[ini++];
      const cx = cur % sw;
      const cy = (cur - cx) / sw;
      if (cx > 0) tentarSemente(cx - 1, cy);
      if (cx + 1 < sw) tentarSemente(cx + 1, cy);
      if (cy > 0) tentarSemente(cx, cy - 1);
      if (cy + 1 < sh) tentarSemente(cx, cy + 1);
    }
    const conexo = new Uint8Array(sw * sh);
    let iniC = 0;
    let fimC = 0;
    const semX0 = Math.max(0, bx - sx - 8);
    const semX1 = Math.min(sw - 1, bx - sx + bw + 8);
    const semY0 = Math.max(0, by - sy - 8);
    const semY1 = Math.min(sh - 1, by - sy + bh + 6);
    for (let y = semY0; y <= semY1; y += 1) {
      for (let x = semX0; x <= semX1; x += 1) {
        const mi = y * sw + x;
        if (!mask[mi] && !conexo[mi]) {
          conexo[mi] = 1;
          fila[fimC++] = mi;
        }
      }
    }
    while (iniC < fimC) {
      const cur = fila[iniC++];
      const cx = cur % sw;
      const cy = (cur - cx) / sw;
      for (let dyN = -2; dyN <= 2; dyN += 1) {
        const ny = cy + dyN;
        if (ny < 0 || ny >= sh) continue;
        for (let dxN = -2; dxN <= 2; dxN += 1) {
          const nx = cx + dxN;
          if (nx < 0 || nx >= sw) continue;
          const nIdx = ny * sw + nx;
          if (!mask[nIdx] && !conexo[nIdx]) {
            conexo[nIdx] = 1;
            fila[fimC++] = nIdx;
          }
        }
      }
    }
    for (let i = 0; i < sw * sh; i += 1) {
      if (!conexo[i]) mask[i] = 1;
    }
    for (let pass = 0; pass < 3; pass += 1) {
      const snapMask = new Uint8Array(mask);
      for (let y = 1; y < sh - 1; y += 1) {
        for (let x = 1; x < sw - 1; x += 1) {
          const mi = y * sw + x;
          if (snapMask[mi]) continue;
          let vizOpacos = 0;
          let tocaFundoInf = false;
          for (let dyS = -1; dyS <= 1; dyS += 1) {
            for (let dxS = -1; dxS <= 1; dxS += 1) {
              if (dxS === 0 && dyS === 0) continue;
              if (!snapMask[(y + dyS) * sw + (x + dxS)]) {
                vizOpacos += 1;
              } else if (dyS >= 0) {
                tocaFundoInf = true;
              }
            }
          }
          const pS = ((sy + y) * f4.largura + (sx + x)) * 4;
          const rS = f4.rgba[pS];
          const gS = f4.rgba[pS + 1];
          const bS = f4.rgba[pS + 2];
          if (vizOpacos <= 2 && rS + gS + bS < 96) {
            mask[mi] = 1;
          } else if (
            vizOpacos <= 3 &&
            tocaFundoInf &&
            (x < (bx - sx) - 6 || x > (bx - sx + bw) + 4) &&
            ((rS > 120 && gS > 105 && rS >= bS + 16) || (rS > 155 && gS > 155 && bS > 135))
          ) {
            mask[mi] = 1;
          } else if (
            vizOpacos <= 4 &&
            tocaFundoInf &&
            (x >= (bx - sx) - 14 && x < (bx - sx) || x > (bx - sx + bw) && x <= (bx - sx + bw) + 14) &&
            rS < 64 && gS < 70 && bS < 80 && Math.abs(rS - bS) < 22
          ) {
            mask[mi] = 1;
          }
        }
      }
    }
    mapaRecortes[idCarc] = mask;
    return mask;
  };

  const putPx = (x, y, c) => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || xi >= W || yi < 0 || yi >= H) return;
    const idx = (yi * W + xi) * 4;
    const a = c[3] ?? 255;
    if (a <= 0) return;
    if (a >= 255) {
      rgba[idx] = c[0];
      rgba[idx + 1] = c[1];
      rgba[idx + 2] = c[2];
      rgba[idx + 3] = 255;
    } else {
      const inv = 255 - a;
      rgba[idx] = (c[0] * a + rgba[idx] * inv + 127) >> 8;
      rgba[idx + 1] = (c[1] * a + rgba[idx + 1] * inv + 127) >> 8;
      rgba[idx + 2] = (c[2] * a + rgba[idx + 2] * inv + 127) >> 8;
      rgba[idx + 3] = 255;
    }
  };

  const fillRect = (x0, y0, x1, y1, fill, outline = null) => {
    const xa = Math.round(x0);
    const ya = Math.round(y0);
    const xb = Math.round(x1);
    const yb = Math.round(y1);
    if (fill) {
      const yaC = Math.max(0, ya);
      const ybC = Math.min(H - 1, yb);
      const xaC = Math.max(0, xa);
      const xbC = Math.min(W - 1, xb);
      const a = fill[3] ?? 255;
      if (a >= 255) {
        for (let y = yaC; y <= ybC; y += 1) {
          let idx = (y * W + xaC) * 4;
          for (let x = xaC; x <= xbC; x += 1) {
            rgba[idx] = fill[0];
            rgba[idx + 1] = fill[1];
            rgba[idx + 2] = fill[2];
            rgba[idx + 3] = 255;
            idx += 4;
          }
        }
      } else if (a > 0) {
        for (let y = yaC; y <= ybC; y += 1) {
          for (let x = xaC; x <= xbC; x += 1) {
            putPx(x, y, fill);
          }
        }
      }
    }
    if (outline) {
      for (let x = xa; x <= xb; x += 1) {
        putPx(x, ya, outline);
        putPx(x, yb, outline);
      }
      for (let y = ya; y <= yb; y += 1) {
        putPx(xa, y, outline);
        putPx(xb, y, outline);
      }
    }
  };

  const hLine = (x0, x1, y, c, width = 1) => {
    for (let dy = 0; dy < width; dy += 1) {
      for (let x = Math.round(x0); x <= Math.round(x1); x += 1) {
        putPx(x, Math.round(y) + dy, c);
      }
    }
  };

  const lineSeg = (x0, y0, x1, y1, c, pontilhado = false) => {
    const xa = Math.round(x0);
    const ya = Math.round(y0);
    const xb = Math.round(x1);
    const yb = Math.round(y1);
    const passos = Math.max(1, Math.hypot(xb - xa, yb - ya));
    for (let s = 0; s <= passos; s += 1) {
      if (pontilhado && (s % 5 >= 3)) continue;
      const t = s / passos;
      putPx(xa + (xb - xa) * t, ya + (yb - ya) * t, c);
    }
  };

  const blitMatrizToken = (matriz, x0, y0, escX = 1, escY = escX, sombra = false) => {
    if (!Array.isArray(matriz)) return;
    if (sombra) {
      for (let ry = 0; ry < matriz.length; ry += 1) {
        const lin = matriz[ry];
        for (let rx = 0; rx < lin.length; rx += 1) {
          if (lin[rx] === '.') continue;
          for (let sy = 0; sy < escY; sy += 1) {
            for (let sx = 0; sx < escX; sx += 1) {
              putPx(x0 + rx * escX + sx + 2, y0 + ry * escY + sy + 2, [4, 8, 12, 175]);
            }
          }
        }
      }
    }
    for (let ry = 0; ry < matriz.length; ry += 1) {
      const lin = matriz[ry];
      for (let rx = 0; rx < lin.length; rx += 1) {
        const ch = lin[rx];
        if (ch === '.') continue;
        const cor = MAPA_RGBA_SPRITES[ch];
        if (!cor) continue;
        for (let sy = 0; sy < escY; sy += 1) {
          for (let sx = 0; sx < escX; sx += 1) {
            const boost = escX >= 3 && sx === 0 && sy === 0 && ch !== '#' ? 16 : 0;
            putPx(
              x0 + rx * escX + sx,
              y0 + ry * escY + sy,
              boost ? [Math.min(255, cor[0] + boost), Math.min(255, cor[1] + boost), Math.min(255, cor[2] + boost), 255] : cor
            );
          }
        }
      }
    }
  };

  const desenharGlifoFonte = (mapaGlifos, x0, y0, ch, cor) => {
    const linhas = mapaGlifos[ch] ?? GLIFOS[ch];
    if (!linhas) return;
    for (let ry = 0; ry < 8; ry += 1) {
      const mask = linhas[ry];
      for (let rx = 0; rx < 8; rx += 1) {
        if ((mask >> rx) & 1) {
          putPx(x0 + rx, y0 + ry, cor);
        }
      }
    }
  };

  const txt = (x0, y0, texto, cor, pitch = 8) => {
    let x = Math.round(x0);
    const y = Math.round(y0);
    const str = String(texto ?? '');
    const mapaFonte = pitch <= 6 ? GLIFOS_5X7 : pitch === 7 ? GLIFOS_6X7 : GLIFOS;
    const dxCentroAc = pitch <= 6 ? 2 : pitch === 7 ? 3 : 4;
    for (let i = 0; i < str.length; i += 1) {
      const ch = str[i];
      const acDireto = ACENTOS[ch];
      const acUpper = !acDireto ? ACENTOS[ch.toUpperCase()] : null;
      const ac = acDireto ?? (acUpper ? [acUpper[0].toLowerCase(), acUpper[1]] : null);
      if (ac) {
        const [base, tipo] = ac;
        desenharGlifoFonte(mapaFonte, x, y, base, cor);
        const cx = x + dxCentroAc;
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
        desenharGlifoFonte(mapaFonte, x, y, ch, cor);
      }
      x += pitch;
    }
  };

  const chanfradoBezel = (x0, y0, x1, y1, bgCor, bordaCor, chanfro = 2, biselTopo = null) => {
    const xa = Math.round(x0);
    const ya = Math.round(y0);
    const xb = Math.round(x1);
    const yb = Math.round(y1);
    if (xb <= xa || yb <= ya) return;
    const alt = yb - ya;
    const larg = xb - xa;
    const ch = Math.max(0, Math.min(chanfro, Math.floor(Math.min(larg, alt) / 3)));
    for (let dy = 0; dy <= alt; dy += 1) {
      const distV = Math.min(dy, alt - dy);
      const rec = distV < ch ? (ch - distV) : 0;
      const lx0 = xa + rec;
      const lx1 = xb - rec;
      if (bgCor && lx1 >= lx0) {
        for (let px = lx0; px <= lx1; px += 1) {
          putPx(px, ya + dy, bgCor);
        }
      }
      if (bordaCor && lx1 >= lx0) {
        if (dy === 0 || dy === alt) {
          for (let px = lx0; px <= lx1; px += 1) {
            putPx(px, ya + dy, bordaCor);
          }
        } else {
          putPx(lx0, ya + dy, bordaCor);
          putPx(lx1, ya + dy, bordaCor);
          if (distV < ch) {
            putPx(lx0 + 1, ya + dy, bordaCor);
            putPx(lx1 - 1, ya + dy, bordaCor);
          }
        }
      }
    }
    if (bordaCor && larg >= 10 && alt >= 8) {
      const hi = biselTopo ?? [
        Math.min(255, bordaCor[0] + 44),
        Math.min(255, bordaCor[1] + 44),
        Math.min(255, bordaCor[2] + 44),
        148,
      ];
      hLine(xa + ch + 1, xb - ch - 1, ya + 1, hi, 1);
      hLine(xa + ch + 1, xb - ch - 1, yb - 1, [4, 8, 13, 195], 1);
      if (larg >= 32 && alt >= 18 && ch >= 2) {
        const reb = [Math.min(255, bordaCor[0] + 28), Math.min(255, bordaCor[1] + 28), Math.min(255, bordaCor[2] + 28), 210];
        putPx(xa + ch + 1, ya + 2, reb);
        putPx(xb - ch - 1, ya + 2, reb);
        putPx(xa + ch + 1, yb - 2, [18, 30, 40, 220]);
        putPx(xb - ch - 1, yb - 2, [18, 30, 40, 220]);
      }
    }
  };

  const panel = (x0, y0, x1, y1, titulo = null) => {
    const ancoradoBorda = x0 <= 1 || y0 <= 1 || x1 >= W - 2 || y1 >= H - 2;
    if (ancoradoBorda) {
      fillRect(x0, y0, x1, y1, PANEL, BORDER);
      chanfradoBezel(x0 + 2, y0 + 2, x1 - 2, y1 - 2, [10, 16, 23, 255], [26, 42, 54, 255], 3, RIM);
    } else {
      chanfradoBezel(x0, y0, x1, y1, [8, 14, 21, 244], BORDER, 3, RIM);
    }
    if (titulo) {
      txt(x0 + 6, y0 + 6, titulo, DIM);
    }
  };

  const desenharPersonagemPose4F = (especie, poseIdx, cx, cy, largMax, altMax, espelharX = false, achatarSeco = false) => {
    const listaPoses = assetsSafe.poses4Frames?.[especie];
    const spr = Array.isArray(listaPoses) ? (listaPoses[((poseIdx % 4) + 4) % 4] ?? listaPoses[0]) : null;
    if (!spr || !spr.rgba || !spr.largura || !spr.altura) return false;
    let cacheBbox = cStore.cacheBboxPoses4F;
    if (!cacheBbox) {
      cacheBbox = new WeakMap();
      cStore.cacheBboxPoses4F = cacheBbox;
    }
    let bbox = cacheBbox.get(spr);
    if (!bbox) {
      let bx0 = spr.largura;
      let by0 = spr.altura;
      let bx1 = -1;
      let by1 = -1;
      for (let sy = 0; sy < spr.altura; sy += 1) {
        const rOff = sy * spr.largura;
        for (let sx = 0; sx < spr.largura; sx += 1) {
          if (spr.rgba[(rOff + sx) * 4 + 3] >= 120) {
            if (sx < bx0) bx0 = sx;
            if (sx > bx1) bx1 = sx;
            if (sy < by0) by0 = sy;
            if (sy > by1) by1 = sy;
          }
        }
      }
      bbox = bx1 >= bx0 ? [bx0, by0, bx1 - bx0 + 1, by1 - by0 + 1] : [0, 0, spr.largura, spr.altura];
      cacheBbox.set(spr, bbox);
    }
    const [bx0, by0, bw, bh] = bbox;
    const escBase = Math.min(Math.max(8, largMax - 2) / bw, Math.max(8, altMax - 2) / bh);
    const wDst = Math.max(8, Math.min(largMax, Math.round(bw * escBase * (achatarSeco ? 1.08 : 1.0))));
    const hDst = Math.max(7, Math.min(altMax, Math.round(bh * escBase * (achatarSeco ? 0.84 : 1.0))));
    const ox = Math.round(cx - wDst / 2);
    const oy = Math.round(cy - hDst / 2) + (achatarSeco ? 2 : 0);
    const opacosP = new Uint8Array(wDst * hDst);
    const coresP = new Uint8Array(wDst * hDst * 3);
    for (let dy = 0; dy < hDst; dy += 1) {
      const sy0 = by0 + Math.floor((dy * bh) / hDst);
      const sy1 = by0 + Math.max(0, Math.min(bh - 1, Math.floor(((dy + 1) * bh - 0.01) / hDst)));
      for (let dx = 0; dx < wDst; dx += 1) {
        const dxSrc = espelharX ? (wDst - 1 - dx) : dx;
        const sx0 = bx0 + Math.floor((dxSrc * bw) / wDst);
        const sx1 = bx0 + Math.max(0, Math.min(bw - 1, Math.floor(((dxSrc + 1) * bw - 0.01) / wDst)));
        let sr = 0;
        let sg = 0;
        let sb = 0;
        let nOp = 0;
        let tot = 0;
        for (let sy = sy0; sy <= sy1; sy += 1) {
          const rOff = sy * spr.largura;
          for (let sx = sx0; sx <= sx1; sx += 1) {
            tot += 1;
            const p = (rOff + sx) * 4;
            if (spr.rgba[p + 3] < 120) continue;
            const r = spr.rgba[p];
            const g = spr.rgba[p + 1];
            const b = spr.rgba[p + 2];
            if (r <= 10 && g <= 15 && b <= 22 && nOp > 0) continue;
            sr += r;
            sg += g;
            sb += b;
            nOp += 1;
          }
        }
        if (nOp > 0 && nOp * 5 >= tot * 2) {
          const iO = dy * wDst + dx;
          opacosP[iO] = 1;
          coresP[iO * 3] = Math.round(sr / nOp);
          coresP[iO * 3 + 1] = Math.round(sg / nOp);
          coresP[iO * 3 + 2] = Math.round(sb / nOp);
        }
      }
    }
    const ySombra = oy + hDst - 1;
    hLine(ox + 3, ox + wDst - 4, ySombra + 1, [4, 8, 13, 125], 1);
    for (let dy = 0; dy < hDst; dy += 1) {
      for (let dx = 0; dx < wDst; dx += 1) {
        const iO = dy * wDst + dx;
        if (opacosP[iO]) {
          putPx(ox + dx, oy + dy, [coresP[iO * 3], coresP[iO * 3 + 1], coresP[iO * 3 + 2], 255]);
        } else if (
          (dy > 0 && opacosP[(dy - 1) * wDst + dx]) ||
          (dy + 1 < hDst && opacosP[(dy + 1) * wDst + dx]) ||
          (dx > 0 && opacosP[dy * wDst + dx - 1]) ||
          (dx + 1 < wDst && opacosP[dy * wDst + dx + 1])
        ) {
          putPx(ox + dx, oy + dy, [7, 12, 18, 255]);
        }
      }
    }
    return true;
  };

  const segBar = (x, y, n, filled, w = 3, h = 8, gap = 1, color = GREEN) => {
    for (let i = 0; i < n; i += 1) {
      const ativo = i < filled;
      const c = ativo ? color : [22, 32, 40, 255];
      const bx0 = x + i * (w + gap);
      const bx1 = bx0 + w - 1;
      fillRect(bx0, y, bx1, y + h - 1, c);
      if (h >= 5 && w >= 2) {
        const hi = ativo
          ? [Math.min(255, c[0] + 54), Math.min(255, c[1] + 54), Math.min(255, c[2] + 54), 255]
          : [38, 54, 66, 255];
        const sh = ativo
          ? [Math.max(0, Math.round(c[0] * 0.56)), Math.max(0, Math.round(c[1] * 0.56)), Math.max(0, Math.round(c[2] * 0.56)), 255]
          : [12, 18, 24, 255];
        hLine(bx0, bx1, y, hi, 1);
        hLine(bx0, bx1, y + h - 1, sh, 1);
      }
    }
  };

  const desenharTuboEnergiaHiBit = (x0, y0, x1, y1, ativo) => {
    fillRect(x0, y0, x1, y1, ativo ? [22, 134, 68, 255] : [11, 19, 26, 255], [18, 32, 42, 255]);
    hLine(x0 + 1, x1 - 1, y0, RIM, 1);
    hLine(x0 + 1, x1 - 1, y1, [8, 14, 20, 255], 1);
    const altIntTubo = Math.max(1, y1 - y0 - 1);
    for (let py = y0 + 1; py <= y1 - 1; py += 1) {
      const t = (py - (y0 + 1)) / altIntTubo;
      const ehMenisco = ((py - y0) % 7) === 0;
      for (let px = x0 + 1; px <= x1 - 1; px += 1) {
        if (ativo) {
          if (px === x0 + 1) {
            putPx(px, py, t < 0.35 ? [210, 255, 242, 255] : [132, 252, 178, 255]);
          } else if (px === x1 - 1) {
            putPx(px, py, [16, 96, 44, 255]);
          } else if (ehMenisco) {
            putPx(px, py, [28, 128, 66, 255]);
          } else if (t < 0.28) {
            putPx(px, py, ((px + py) & 1) === 0 ? [88, 246, 232, 255] : [64, 236, 148, 255]);
          } else if (t < 0.72) {
            putPx(px, py, [57, 230, 98, 255]);
          } else {
            putPx(px, py, ((px + py) & 1) === 0 ? [38, 184, 78, 255] : [28, 148, 62, 255]);
          }
        } else if (px === x0 + 1) {
          putPx(px, py, [26, 42, 54, 255]);
        } else if (px === x1 - 1) {
          putPx(px, py, [7, 12, 17, 255]);
        } else if (ehMenisco) {
          putPx(px, py, [18, 30, 38, 255]);
        }
      }
    }
  };

  const GRADE_BULBO_NEURAL_16X14 = [
    '....########....',
    '..##vVVttVVv##..',
    '.#vVVtcCCCctVv#.',
    '.#VtcCCWWWCCctV#',
    '#vVcCCWWWWWCCcv#',
    '#VtCCWWCCCWWCCt#',
    '#VtCCCCcCcCCCCt#',
    '.#VtcCCcccCCctV#',
    '.#vVVtcccccTVv#.',
    '..##vVtt#ttVv##.',
    '...#t#.#t#.#t#..',
    '..#t#..#t#..#t#.',
    '..##...#c#...##.',
    '........#.......',
  ];
  const PAL_BULBO_NEURAL = {
    '#': [7, 13, 19, 255],
    v: [48, 22, 74, 255],
    V: [92, 44, 134, 255],
    t: [24, 92, 116, 255],
    T: [34, 124, 152, 255],
    c: [46, 178, 206, 255],
    C: [84, 242, 255, 255],
    W: [232, 254, 255, 255],
  };
  const desenharBulboNeuralHiBit = (x0, y0) => {
    const ox = Math.round(x0);
    const oy = Math.round(y0);
    for (let ry = 0; ry < GRADE_BULBO_NEURAL_16X14.length; ry += 1) {
      const lin = GRADE_BULBO_NEURAL_16X14[ry];
      for (let rx = 0; rx < lin.length; rx += 1) {
        const c = PAL_BULBO_NEURAL[lin[rx]];
        if (c) putPx(ox + rx, oy + ry, c);
      }
    }
  };

  const GRADES_BOIAS_11X11 = {
    ATUAL: ['.....C.....','....CWC....','...CCWCC...','..CCWWWCC..','.CCCWWWCCC.','CWWWWWWWWWC','.CCCWWWCCC.','..CCcCcCC..','...cc.cc...','....c.c....','...........'],
    COMBATE: ['.....R.....','..r..R..Y..','.r...R.YYY.','....rRYRY..','...r.YYY...','RRRRRYRRRRR','...Y.Rr....','..YRYR.r...','.YYY.R...r.','..Y..R..r..','.....R.....'],
    LOJA: ['...VVcVV...','..VCCWCCV..','.VVCcccCVV.','..bbbbbbb..','.bBBBBBBBb.','..bbBBBBB..','...bBBBb...','..bbBBBbb..','.bBBBBBBBb.','.bbbbbbbbb.','...........'],
    SOS: ['Y....W....Y','.Y...A...Y.','..Y.AAA.Y..','...AAWAA...','.WAAWWWAAW.','..AAWWWAA..','...cAAAc...','..ccAAAcc..','.cccbbbccc.','..bbbbbbb..','...........'],
    EXPLORACAO: ['.....G.....','....GCG....','...GCWCG...','..GCcWcCG..','.GCcWWWcCG.','GCWWWWWWWCG','.GCcWWWcCG.','..GCcWcCG..','...GCWCG...','....GCG....','.....G.....'],
    SAIDA: ['..RRRRRRR..','.RrrrrrrrR.','RrYYYYYYYrR','RrY##r##YrR','RrY##W##YrR','RrYYYYYYYrR','.RrrY#YrrR.','..RrY#YrR..','..RRRRRRR..','...R.R.R...','...........'],
  };
  const desenharNodoBoiaMapaHiBit = (x0, y0, larg, alt, tipoChave, corBorda, fundoBase, alcancavel) => {
    fillRect(x0 - 2, y0 - 2, x0 + larg + 1, y0 + alt + 1, [5, 11, 17, 215]);
    fillRect(x0 + 1, y0 + 1, x0 + larg - 2, y0 + alt - 2, fundoBase);
    hLine(x0 + 2, x0 + larg - 3, y0, corBorda, 1);
    hLine(x0 + 2, x0 + larg - 3, y0 + alt - 1, corBorda, 1);
    for (let py = y0 + 2; py <= y0 + alt - 3; py += 1) {
      putPx(x0, py, corBorda);
      putPx(x0 + larg - 1, py, corBorda);
      putPx(x0 + 1, py, [28, 48, 62, 255]);
      putPx(x0 + larg - 2, py, [7, 13, 19, 255]);
    }
    putPx(x0 + 1, y0 + 1, corBorda);
    putPx(x0 + larg - 2, y0 + 1, corBorda);
    putPx(x0 + 1, y0 + alt - 2, corBorda);
    putPx(x0 + larg - 2, y0 + alt - 2, corBorda);
    hLine(x0 + 2, x0 + larg - 3, y0 + 1, [Math.min(255, corBorda[0] + 45), Math.min(255, corBorda[1] + 45), Math.min(255, corBorda[2] + 45), 180], 1);

    const gradeB = GRADES_BOIAS_11X11[tipoChave] ?? GRADES_BOIAS_11X11.COMBATE;
    const palBoia = {
      '#': [8, 12, 18, 255],
      W: TXT,
      C: CYAN,
      c: [32, 132, 158, 255],
      R: alcancavel || tipoChave === 'SAIDA' ? RED : [156, 52, 62, 255],
      r: [112, 24, 34, 255],
      Y: alcancavel || tipoChave !== 'COMBATE' ? YELLOW : [168, 148, 68, 255],
      A: AMBER,
      G: alcancavel ? GREEN : [54, 156, 118, 255],
      V: [158, 86, 224, 255],
      B: [228, 178, 76, 255],
      b: [134, 92, 36, 255],
    };
    const ix0 = x0 + Math.floor((larg - 11) / 2);
    const iy0 = y0 + Math.floor((alt - 11) / 2);
    for (let ry = 0; ry < 11; ry += 1) {
      const lin = gradeB[ry];
      for (let rx = 0; rx < 11; rx += 1) {
        const cp = palBoia[lin[rx]];
        if (cp) putPx(ix0 + rx, iy0 + ry, cp);
      }
    }
  };

  const socket = (x, y, preenchido = false) => {
    for (let ry = 0; ry < M_SOQUETE.length; ry += 1) {
      const row = M_SOQUETE[ry];
      for (let rx = 0; rx < 8; rx += 1) {
        const ch = row[rx];
        if (ch === '#') putPx(x + rx, y + ry, preenchido ? GREEN : CYAN);
        else if (ch === '@') putPx(x + rx, y + ry, preenchido ? VIOLET : [10, 20, 26, 255]);
      }
    }
  };

  const bolhaBarreira = (x, y, ativa) => {
    for (let ry = 0; ry < M_BOLHA.length; ry += 1) {
      const row = M_BOLHA[ry];
      for (let rx = 0; rx < 10; rx += 1) {
        const ch = row[rx];
        if (ch === '#') putPx(x + rx, y + ry, ativa ? TXT : DIM);
        else if (ch === '@' && ativa) putPx(x + rx, y + ry, CYAN);
      }
    }
  };

  const lock = (x, y, cor = RED) => {
    for (let ry = 0; ry < M_CADEADO.length; ry += 1) {
      const row = M_CADEADO[ry];
      for (let rx = 0; rx < 8; rx += 1) {
        if (row[rx] === '#') putPx(x + rx, y + ry, cor);
      }
    }
  };

  const blitIconeHiBit = (spr, x0, y0, sombra = false) => {
    if (!spr || !spr.rgba || !spr.largura || !spr.altura) return false;
    const ox = Math.round(x0);
    const oy = Math.round(y0);
    if (sombra) {
      for (let ry = 0; ry < spr.altura; ry += 1) {
        const rowOff = ry * spr.largura;
        for (let rx = 0; rx < spr.largura; rx += 1) {
          if (spr.rgba[(rowOff + rx) * 4 + 3] >= 128) {
            putPx(ox + rx + 2, oy + ry + 2, [4, 8, 12, 165]);
          }
        }
      }
    }
    for (let ry = 0; ry < spr.altura; ry += 1) {
      const rowOff = ry * spr.largura;
      for (let rx = 0; rx < spr.largura; rx += 1) {
        const sIdx = (rowOff + rx) * 4;
        if (spr.rgba[sIdx + 3] >= 128) {
          putPx(ox + rx, oy + ry, [spr.rgba[sIdx], spr.rgba[sIdx + 1], spr.rgba[sIdx + 2], 255]);
        }
      }
    }
    return true;
  };

  const heartOrgan = (x, y) => {
    if (blitIconeHiBit(assetsSafe.iconesHiBit?.CORACAO_BIO_ELETRICO, x - 6, y - 4, true)) {
      return;
    }
    const ox = x - 3;
    const oy = y - 2;
    const coresCoracao = {
      V: VIOLET,
      C: CYAN,
      R: [168, 24, 36, 255],
      Y: YELLOW,
    };
    for (let ry = 0; ry < M_CORACAO.length; ry += 1) {
      const row = M_CORACAO[ry];
      for (let rx = 0; rx < row.length; rx += 1) {
        const c = coresCoracao[row[rx]];
        if (c) putPx(ox + rx, oy + ry, c);
      }
    }
  };

  const desenharMiniaturaBioNaveHiBit = (destX, destY, largDst, altDst, carcacaOverride = null) => {
    const idC = String(carcacaOverride ?? vmSafe.idCarcaca ?? vmSafe.idArquitetura ?? 'CARCACA_ALFA');
    const spec = RECORTES_F4[idC];
    const opacosGrid = new Uint8Array(largDst * altDst);
    const rgbBruto = new Uint8Array(largDst * altDst * 3);
    const rgbOpaco = new Uint8Array(largDst * altDst * 3);
    let jx0 = Math.round(largDst * 0.42);
    let jx1 = Math.round(largDst * 0.77);
    let jy0 = Math.round(altDst * 0.34);
    let jy1 = Math.round(altDst * 0.92);
    if (spec && assetsSafe.f4Ships) {
      const [sx, sy, sw, sh] = spec.casco;
      const [bx, by, bw, bh] = spec.bloco;
      const mask = obterMascaraF4(idC);
      const shUtil = Math.min(sh, (by - sy) + bh + 6);
      jx0 = Math.round(((bx - sx) / sw) * largDst);
      jx1 = Math.round(((bx - sx + bw) / sw) * largDst);
      jy0 = Math.round(((by - sy) / shUtil) * altDst);
      jy1 = Math.round(((by - sy + bh) / shUtil) * altDst);
      for (let dy = 0; dy < altDst; dy += 1) {
        const fy0 = Math.min(shUtil - 1, Math.floor((dy * shUtil) / altDst));
        const fy1 = Math.min(shUtil - 1, Math.floor(((dy + 1) * shUtil - 1) / altDst));
        for (let dx = 0; dx < largDst; dx += 1) {
          const fx0 = Math.min(sw - 1, Math.floor((dx * sw) / largDst));
          const fx1 = Math.min(sw - 1, Math.floor(((dx + 1) * sw - 1) / largDst));
          let sr = 0; let sg = 0; let sb = 0; let nOp = 0; let tot = 0;
          let ar = 0; let ag = 0; let ab = 0;
          for (let fy = fy0; fy <= fy1; fy += 1) {
            for (let fx = fx0; fx <= fx1; fx += 1) {
              tot += 1;
              const pxF4 = sx + fx;
              const pyF4 = sy + fy;
              const p = (pyF4 * assetsSafe.f4Ships.largura + pxF4) * 4;
              const r = assetsSafe.f4Ships.rgba[p];
              const g = assetsSafe.f4Ships.rgba[p + 1];
              const b = assetsSafe.f4Ships.rgba[p + 2];
              ar += r; ag += g; ab += b;
              const noBlocoCore = pxF4 >= bx + 2 && pxF4 <= bx + bw - 2 && pyF4 >= by + 2 && pyF4 <= by + bh - 2;
              if (!noBlocoCore && mask && mask[fy * sw + fx]) continue;
              sr += r; sg += g; sb += b; nOp += 1;
            }
          }
          const idxM = dy * largDst + dx;
          rgbBruto[idxM * 3] = Math.round(ar / Math.max(1, tot));
          rgbBruto[idxM * 3 + 1] = Math.round(ag / Math.max(1, tot));
          rgbBruto[idxM * 3 + 2] = Math.round(ab / Math.max(1, tot));
          if (nOp * 2 >= tot && nOp > 0) {
            opacosGrid[idxM] = 1;
            rgbOpaco[idxM * 3] = Math.round(sr / nOp);
            rgbOpaco[idxM * 3 + 1] = Math.round(sg / nOp);
            rgbOpaco[idxM * 3 + 2] = Math.round(sb / nOp);
          }
        }
      }
    } else if (assetsSafe.f1Play) {
      const sx = 44;
      const sy = 2;
      const sw = 456;
      const sh = 258;
      jx0 = Math.round(((202 - sx) / sw) * largDst);
      jx1 = Math.round(((202 - sx + 187) / sw) * largDst);
      jy0 = Math.round(((86 - sy) / sh) * altDst);
      jy1 = Math.round(((86 - sy + 181) / sh) * altDst);
      let maskAlfa = wmMiniAlfa.get(assetsSafe.f1Play);
      if (!maskAlfa) {
        const perfilF1 = obterPerfilLimpo(assetsSafe.f1Play);
        maskAlfa = new Uint8Array(sw * sh);
        const filaA = new Int32Array(sw * sh);
        let qa0 = 0;
        let qa1 = 0;
        const semA = (ax, ay) => {
          const mi = ay * sw + ax;
          if (maskAlfa[mi]) return;
          const pxSrc = sx + ax;
          const pySrc = sy + ay;
          const p = (pySrc * assetsSafe.f1Play.largura + pxSrc) * 4;
          const r = assetsSafe.f1Play.rgba[p];
          const g = assetsSafe.f1Play.rgba[p + 1];
          const b = assetsSafe.f1Play.rgba[p + 2];
          if (r < 14 && g < 22 && b < 30) return;
          const pR = perfilF1[pySrc * 3];
          const pG = perfilF1[pySrc * 3 + 1];
          const pB = perfilF1[pySrc * 3 + 2];
          const distPerfil = Math.abs(r - pR) + Math.abs(g - pG) + Math.abs(b - pB);
          const ehChuvaCeu = distPerfil <= 42 && r < 42 && b >= g - 2 && g >= r + 8;
          const ehArcoLegadoF1 =
            (pxSrc >= 338 && pySrc <= 74 && g > 165 && b > 185 && r < 95) ||
            (pxSrc >= 388 && r > 140 && g < 110 && (r - g) > 35);
          const ehEspumaBaseF1 = pySrc >= 273 && (pxSrc < 284 || pxSrc > 320) && g > 155 && b > 170;
          if (distPerfil > 22 && !ehChuvaCeu && !ehArcoLegadoF1 && !ehEspumaBaseF1) return;
          maskAlfa[mi] = 1;
          filaA[qa1++] = mi;
        };
        for (let ax = 0; ax < sw; ax += 1) { semA(ax, 0); semA(ax, sh - 1); }
        for (let ay = 0; ay < sh; ay += 1) { semA(0, ay); semA(sw - 1, ay); }
        while (qa0 < qa1) {
          const curA = filaA[qa0++];
          const cAx = curA % sw;
          const cAy = (curA - cAx) / sw;
          if (cAx > 0) semA(cAx - 1, cAy);
          if (cAx + 1 < sw) semA(cAx + 1, cAy);
          if (cAy > 0) semA(cAx, cAy - 1);
          if (cAy + 1 < sh) semA(cAx, cAy + 1);
        }
        wmMiniAlfa.set(assetsSafe.f1Play, maskAlfa);
      }
      for (let dy = 0; dy < altDst; dy += 1) {
        const fy0 = Math.min(sh - 1, Math.floor((dy * sh) / altDst));
        const fy1 = Math.min(sh - 1, Math.floor(((dy + 1) * sh - 1) / altDst));
        for (let dx = 0; dx < largDst; dx += 1) {
          const fx0 = Math.min(sw - 1, Math.floor((dx * sw) / largDst));
          const fx1 = Math.min(sw - 1, Math.floor(((dx + 1) * sw - 1) / largDst));
          let sr = 0; let sg = 0; let sb = 0; let nOp = 0; let tot = 0;
          let ar = 0; let ag = 0; let ab = 0;
          for (let fy = fy0; fy <= fy1; fy += 1) {
            for (let fx = fx0; fx <= fx1; fx += 1) {
              tot += 1;
              const p = ((sy + fy) * assetsSafe.f1Play.largura + (sx + fx)) * 4;
              const r = assetsSafe.f1Play.rgba[p];
              const g = assetsSafe.f1Play.rgba[p + 1];
              const b = assetsSafe.f1Play.rgba[p + 2];
              ar += r; ag += g; ab += b;
              if (maskAlfa[fy * sw + fx]) continue;
              sr += r; sg += g; sb += b; nOp += 1;
            }
          }
          const idxM = dy * largDst + dx;
          rgbBruto[idxM * 3] = Math.round(ar / Math.max(1, tot));
          rgbBruto[idxM * 3 + 1] = Math.round(ag / Math.max(1, tot));
          rgbBruto[idxM * 3 + 2] = Math.round(ab / Math.max(1, tot));
          if (nOp * 2 >= tot && nOp > 0) {
            opacosGrid[idxM] = 1;
            rgbOpaco[idxM * 3] = Math.round(sr / nOp);
            rgbOpaco[idxM * 3 + 1] = Math.round(sg / nOp);
            rgbOpaco[idxM * 3 + 2] = Math.round(sb / nOp);
          }
        }
      }
    }
    const compPrin = new Uint8Array(largDst * altDst);
    const filaComp = new Int32Array(largDst * altDst);
    let qc0 = 0;
    let qc1 = 0;
    const cxAnc = Math.max(1, Math.min(largDst - 2, Math.round((jx0 + jx1) / 2)));
    const cyAnc = Math.max(1, Math.min(altDst - 2, Math.round((jy0 + jy1) / 2)));
    for (let ay = Math.max(0, cyAnc - 6); ay <= Math.min(altDst - 1, cyAnc + 6); ay += 1) {
      for (let ax = Math.max(0, cxAnc - 8); ax <= Math.min(largDst - 1, cxAnc + 8); ax += 1) {
        const mi = ay * largDst + ax;
        if (opacosGrid[mi] && !compPrin[mi]) {
          compPrin[mi] = 1;
          filaComp[qc1++] = mi;
        }
      }
    }
    while (qc0 < qc1) {
      const curC = filaComp[qc0++];
      const xC = curC % largDst;
      const yC = (curC - xC) / largDst;
      for (let dyN = -1; dyN <= 1; dyN += 1) {
        const ny = yC + dyN;
        if (ny < 0 || ny >= altDst) continue;
        for (let dxN = -1; dxN <= 1; dxN += 1) {
          const nx = xC + dxN;
          if (nx < 0 || nx >= largDst) continue;
          const ni = ny * largDst + nx;
          if (opacosGrid[ni] && !compPrin[ni]) {
            compPrin[ni] = 1;
            filaComp[qc1++] = ni;
          }
        }
      }
    }
    if (qc1 > 16) {
      for (let i = 0; i < opacosGrid.length; i += 1) {
        if (!compPrin[i]) opacosGrid[i] = 0;
      }
    }
    const extLivre = new Uint8Array(largDst * altDst);
    const filaExt = new Int32Array(largDst * altDst);
    let q0 = 0;
    let q1 = 0;
    const empExt = (xE, yE) => {
      const iE = yE * largDst + xE;
      if (opacosGrid[iE] || extLivre[iE]) return;
      extLivre[iE] = 1;
      filaExt[q1++] = iE;
    };
    for (let dx = 0; dx < largDst; dx += 1) { empExt(dx, 0); empExt(dx, altDst - 1); }
    for (let dy = 0; dy < altDst; dy += 1) { empExt(0, dy); empExt(largDst - 1, dy); }
    while (q0 < q1) {
      const curE = filaExt[q0++];
      const cxE = curE % largDst;
      const cyE = (curE - cxE) / largDst;
      if (cxE > 0) empExt(cxE - 1, cyE);
      if (cxE + 1 < largDst) empExt(cxE + 1, cyE);
      if (cyE > 0) empExt(cxE, cyE - 1);
      if (cyE + 1 < altDst) empExt(cxE, cyE + 1);
    }
    for (let dy = 0; dy < altDst; dy += 1) {
      for (let dx = 0; dx < largDst; dx += 1) {
        const idxM = dy * largDst + dx;
        if (!opacosGrid[idxM] && !extLivre[idxM]) {
          opacosGrid[idxM] = 1;
          rgbOpaco[idxM * 3] = rgbBruto[idxM * 3];
          rgbOpaco[idxM * 3 + 1] = rgbBruto[idxM * 3 + 1];
          rgbOpaco[idxM * 3 + 2] = rgbBruto[idxM * 3 + 2];
        }
      }
    }
    const paletaCascoMini = {
      CARCACA_ALFA: { dorso: [92, 46, 48], meio: [66, 44, 50], ventre: [36, 46, 58], quilha: [20, 34, 46], bioluz: [44, 134, 154] },
      MANTA_VOLT: { dorso: [44, 68, 92], meio: [34, 54, 76], ventre: [24, 42, 62], quilha: [16, 30, 46], bioluz: [72, 198, 224] },
      COURACA_LIMIAR: { dorso: [112, 74, 44], meio: [84, 56, 38], ventre: [54, 40, 34], quilha: [32, 26, 28], bioluz: [218, 148, 42] },
      SOMBRA_ABISSAL: { dorso: [54, 38, 76], meio: [38, 30, 58], ventre: [24, 24, 44], quilha: [14, 18, 32], bioluz: [132, 76, 196] },
      COLMEIA_VIVA: { dorso: [52, 84, 56], meio: [40, 66, 48], ventre: [26, 48, 42], quilha: [16, 32, 30], bioluz: [74, 214, 118] },
    }[idC] ?? { dorso: [92, 46, 48], meio: [66, 44, 50], ventre: [36, 46, 58], quilha: [20, 34, 46], bioluz: [44, 134, 154] };

    if (largDst >= 80 && jx1 - jx0 >= 10 && jy1 - jy0 >= 10) {
      const acharBaseColuna = (dxIniB, dxFimB) => {
        let melhorY = 0;
        for (let dxB = Math.max(1, dxIniB); dxB <= Math.min(largDst - 2, dxFimB); dxB += 1) {
          for (let dyB = altDst - 2; dyB >= jy0; dyB -= 1) {
            if (opacosGrid[dyB * largDst + dxB]) {
              if (dyB > melhorY) melhorY = dyB;
              break;
            }
          }
        }
        return melhorY > jy0 + 8 ? melhorY : Math.min(altDst - 4, jy1 - 4);
      };
      const yVentreEsq = acharBaseColuna(jx0 - 11, jx0 - 7);
      const yVentreDir = acharBaseColuna(jx1 + 7, jx1 + 11);
      const yIniPonte = Math.max(4, jy0 + 2);
      const xIniEsc = Math.max(2, jx0 - 6);
      const xFimEsc = Math.min(largDst - 3, jx1 + 6);
      for (let dx = xIniEsc; dx <= xFimEsc; dx += 1) {
        const tV = (dx - xIniEsc) / Math.max(1, xFimEsc - xIniEsc);
        const yVentreCurvo = Math.min(
          altDst - 3,
          Math.round(yVentreEsq * (1 - tV) + yVentreDir * tV + 4 * Math.sin(tV * Math.PI))
        );
        if (dx >= jx0 && dx <= jx1) {
          for (let dy = yIniPonte; dy <= yVentreCurvo; dy += 1) {
            const idxC = dy * largDst + dx;
            if (!opacosGrid[idxC]) {
              opacosGrid[idxC] = 1;
              extLivre[idxC] = 0;
              rgbOpaco[idxC * 3] = paletaCascoMini.meio[0];
              rgbOpaco[idxC * 3 + 1] = paletaCascoMini.meio[1];
              rgbOpaco[idxC * 3 + 2] = paletaCascoMini.meio[2];
            }
          }
        }
        if (spec) {
          for (let dy = yVentreCurvo + 1; dy < altDst; dy += 1) {
            const idxR = dy * largDst + dx;
            opacosGrid[idxR] = 0;
            extLivre[idxR] = 1;
          }
        }
      }
    }
    for (let dy = 0; dy < altDst; dy += 1) {
      for (let dx = 0; dx < largDst; dx += 1) {
        const idxM = dy * largDst + dx;
        if (opacosGrid[idxM]) {
          putPx(destX + dx, destY + dy, [rgbOpaco[idxM * 3], rgbOpaco[idxM * 3 + 1], rgbOpaco[idxM * 3 + 2], 255]);
        }
      }
    }
    if (largDst >= 80 && jx1 - jx0 >= 10 && jy1 - jy0 >= 10) {
      const xIniC = Math.max(2, jx0 - 4);
      const xFimC = Math.min(largDst - 3, jx1 + 4);
      const yIniC = Math.max(2, jy0 - 3);
      const yFimC = Math.min(altDst - 2, jy1 + 2);
      const wJ = Math.max(1, xFimC - xIniC);
      const hJ = Math.max(1, yFimC - yIniC);
      const bayer4 = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5],
      ];
      for (let dy = yIniC; dy <= yFimC; dy += 1) {
        const vFrac = (dy - yIniC) / hJ;
        const vNorm = vFrac * 2 - 1;
        for (let dx = xIniC; dx <= xFimC; dx += 1) {
          const idxM = dy * largDst + dx;
          if (!opacosGrid[idxM] || extLivre[idxM]) continue;
          const distEsq = dx - xIniC;
          const distDir = xFimC - dx;
          const distTop = dy - yIniC;
          const distBot = yFimC - dy;
          const menorMargem = Math.min(distEsq, distDir, distTop, distBot);
          const largFeather = 6;
          const limiarBayer = bayer4[dy & 3][dx & 3] / 16;
          if (menorMargem < largFeather && (menorMargem / largFeather) < limiarBayer) {
            continue;
          }
          const uFrac = (dx - xIniC) / wJ;
          const dthC = ((dx + dy) & 1) === 0 ? 0 : 6;
          const baseCor =
            vNorm < -0.42
              ? paletaCascoMini.dorso
              : vNorm < 0.12
                ? paletaCascoMini.meio
                : vNorm < 0.60
                  ? paletaCascoMini.ventre
                  : paletaCascoMini.quilha;
          let cr = baseCor[0] + dthC;
          let cg = baseCor[1] + (dthC >> 1);
          let cb = baseCor[2] + (dthC >> 1);
          const faseGomo = (dx - xIniC) + Math.round(vNorm * vNorm * 8 - uFrac * 3);
          const modGomo = ((faseGomo % 12) + 12) % 12;
          if (modGomo === 0) {
            cr = Math.max(10, paletaCascoMini.quilha[0] - 4);
            cg = Math.max(14, paletaCascoMini.quilha[1] - 4);
            cb = Math.max(20, paletaCascoMini.quilha[2] - 4);
          } else if (modGomo === 1 && vNorm > -0.55 && vNorm < 0.68) {
            cr = Math.min(255, baseCor[0] + 9);
            cg = Math.min(255, baseCor[1] + 10);
            cb = Math.min(255, baseCor[2] + 12);
          }
          putPx(destX + dx, destY + dy, [cr, cg, cb, 255]);
        }
      }
      for (const [fxV, fyV] of [[0.26, 0.44], [0.52, 0.46], [0.76, 0.48]]) {
        const vxP = Math.round(jx0 + fxV * (jx1 - jx0));
        const vyP = Math.round(jy0 + fyV * (jy1 - jy0));
        if (opacosGrid[vyP * largDst + vxP]) {
          fillRect(destX + vxP - 2, destY + vyP - 1, destX + vxP + 2, destY + vyP + 1, paletaCascoMini.quilha, [10, 16, 22, 255]);
          putPx(destX + vxP - 1, destY + vyP, [...paletaCascoMini.bioluz, 255]);
          putPx(destX + vxP, destY + vyP, CYAN);
          putPx(destX + vxP + 1, destY + vyP, TXT);
        }
      }
    } else if (largDst < 80) {
      for (let dy = Math.max(1, jy0 - 1); dy <= Math.min(altDst - 2, jy1 + 1); dy += 1) {
        const vNormM = (dy - jy0) / Math.max(1, jy1 - jy0);
        for (let dx = Math.max(1, jx0 - 1); dx <= Math.min(largDst - 2, jx1 + 1); dx += 1) {
          const idxM = dy * largDst + dx;
          if (!opacosGrid[idxM] || extLivre[idxM]) continue;
          const rO = rgbOpaco[idxM * 3];
          const gO = rgbOpaco[idxM * 3 + 1];
          const bO = rgbOpaco[idxM * 3 + 2];
          const ehGradeOuTexto =
            (rO > 98 && gO > 98 && bO > 98) ||
            (gO > 86 && bO > 92 && rO < 92) ||
            (gO > 98 && rO < 78) ||
            (rO < 18 && gO < 24 && bO < 32);
          if (ehGradeOuTexto) {
            const dthM = ((dx + dy) & 1) === 0 ? 0 : 5;
            const cM = vNormM < 0.45 ? paletaCascoMini.dorso : paletaCascoMini.ventre;
            putPx(destX + dx, destY + dy, [cM[0] + dthM, cM[1] + dthM, cM[2] + dthM, 255]);
          }
        }
      }
    }
    for (let dy = 1; dy < altDst - 1; dy += 1) {
      for (let dx = 1; dx < largDst - 1; dx += 1) {
        if (!opacosGrid[dy * largDst + dx]) continue;
        if (
          extLivre[(dy - 1) * largDst + dx] ||
          extLivre[(dy + 1) * largDst + dx] ||
          extLivre[dy * largDst + dx - 1] ||
          extLivre[dy * largDst + dx + 1]
        ) {
          putPx(destX + dx, destY + dy, [8, 14, 20, 255]);
        }
      }
    }
    const buscarBaseVentralCanvas = (xCanvas) => {
      const dxR = Math.max(2, Math.min(largDst - 3, Math.round(xCanvas - destX)));
      for (let dy = altDst - 1; dy >= 0; dy -= 1) {
        if (opacosGrid[dy * largDst + dxR] || opacosGrid[dy * largDst + dxR - 1] || opacosGrid[dy * largDst + dxR + 1]) {
          return destY + dy;
        }
      }
      return destY + Math.min(altDst - 2, jy1);
    };
    const xCentroCorpoCanvas = destX + Math.round((jx0 + jx1) / 2);
    return { buscarBaseVentralCanvas, paletaCascoMini, xCentroCorpoCanvas };
  };

  const desenharRetratoRecortadoHiBit = (ret, destX, destY, largDst, altDst, u0 = 0, v0 = 0, uSpan = 1, vSpan = 1) => {
    if (!ret) return false;
    let cacheRet = cStore.cacheRetratosFundo;
    if (!cacheRet) {
      cacheRet = new WeakMap();
      cStore.cacheRetratosFundo = cacheRet;
    }
    let maskBg = cacheRet.get(ret);
    if (!maskBg) {
      const rw = ret.largura;
      const rh = ret.altura;
      maskBg = new Uint8Array(rw * rh);
      const filaR = new Int32Array(rw * rh);
      let qr0 = 0;
      let qr1 = 0;
      const semR = (rx, ry) => {
        const mi = ry * rw + rx;
        if (maskBg[mi]) return;
        const p = mi * 4;
        const r = ret.rgba[p];
        const g = ret.rgba[p + 1];
        const b = ret.rgba[p + 2];
        const ehFundoCard = r < 34 && g < 48 && b < 64 && b >= g - 3 && b >= r;
        if (!ehFundoCard) return;
        maskBg[mi] = 1;
        filaR[qr1++] = mi;
      };
      for (let rx = 0; rx < rw; rx += 1) { semR(rx, 0); semR(rx, rh - 1); }
      for (let ry = 0; ry < rh; ry += 1) { semR(0, ry); semR(rw - 1, ry); }
      while (qr0 < qr1) {
        const curR = filaR[qr0++];
        const cxR = curR % rw;
        const cyR = (curR - cxR) / rw;
        if (cxR > 0) semR(cxR - 1, cyR);
        if (cxR + 1 < rw) semR(cxR + 1, cyR);
        if (cyR > 0) semR(cxR, cyR - 1);
        if (cyR + 1 < rh) semR(cxR, cyR + 1);
      }
      cacheRet.set(ret, maskBg);
    }
    const opacosR = new Uint8Array(largDst * altDst);
    const coresR = new Uint8Array(largDst * altDst * 3);
    for (let dy = 0; dy < altDst; dy += 1) {
      const sy0R = Math.min(ret.altura - 1, Math.max(0, Math.floor((v0 + (dy / altDst) * vSpan) * ret.altura)));
      const sy1R = Math.min(ret.altura - 1, Math.max(sy0R, Math.floor((v0 + ((dy + 1) / altDst) * vSpan) * ret.altura - 0.01)));
      for (let dx = 0; dx < largDst; dx += 1) {
        const sx0R = Math.min(ret.largura - 1, Math.max(0, Math.floor((u0 + (dx / largDst) * uSpan) * ret.largura)));
        const sx1R = Math.min(ret.largura - 1, Math.max(sx0R, Math.floor((u0 + ((dx + 1) / largDst) * uSpan) * ret.largura - 0.01)));
        let sr = 0; let sg = 0; let sb = 0; let nOp = 0; let tot = 0;
        for (let syR = sy0R; syR <= sy1R; syR += 1) {
          for (let sxR = sx0R; sxR <= sx1R; sxR += 1) {
            tot += 1;
            const mi = syR * ret.largura + sxR;
            if (maskBg[mi]) continue;
            const p = mi * 4;
            sr += ret.rgba[p];
            sg += ret.rgba[p + 1];
            sb += ret.rgba[p + 2];
            nOp += 1;
          }
        }
        if (nOp * 2 >= tot && nOp > 0) {
          const idxO = dy * largDst + dx;
          opacosR[idxO] = 1;
          coresR[idxO * 3] = Math.round(sr / nOp);
          coresR[idxO * 3 + 1] = Math.round(sg / nOp);
          coresR[idxO * 3 + 2] = Math.round(sb / nOp);
        }
      }
    }
    for (let dy = 0; dy < altDst; dy += 1) {
      for (let dx = 0; dx < largDst; dx += 1) {
        const idxO = dy * largDst + dx;
        if (opacosR[idxO]) {
          putPx(destX + dx, destY + dy, [coresR[idxO * 3], coresR[idxO * 3 + 1], coresR[idxO * 3 + 2], 255]);
        } else if (
          (dy > 0 && opacosR[(dy - 1) * largDst + dx]) ||
          (dy + 1 < altDst && opacosR[(dy + 1) * largDst + dx]) ||
          (dx > 0 && opacosR[dy * largDst + dx - 1]) ||
          (dx + 1 < largDst && opacosR[dy * largDst + dx + 1])
        ) {
          putPx(destX + dx, destY + dy, [7, 13, 19, 255]);
        }
      }
    }
    return true;
  };

  fillRect(0, 0, W - 1, H - 1, BG);
  const faseJogo = vmSafe.faseJogo ?? 'COMBATE';
  const estadoFisico = vmSafe.barraSuperior?.estadoFisico ?? '1_NO_FOIL';
  const ehTouchdown = estadoFisico !== '1_NO_FOIL';
  const classeAlvo = String(vmSafe.painelAlvo?.classeAlvo ?? '');
  const ehMonstroAlvo = classeAlvo.includes('MONSTRO');
  const ehChefeDraga = classeAlvo === 'CHEFE_DRAGA' || Number(vmSafe.painelAlvo?.faseChefe ?? 0) >= 1;
  const dyCena = !ehTouchdown && ehMonstroAlvo ? -12 : 0;
  const idCarcaca = String(vmSafe.idCarcaca ?? vmSafe.idArquitetura ?? 'CARCACA_ALFA');

  const desenharIconeSis12 = (sigla, ix0, iy0, desativado = false) => {
    const mat12 = ICONES_SIS_12[sigla];
    if (!Array.isArray(mat12)) return;
    const pal12 = {
      '#': [7, 12, 18, 255],
      C: CYAN,
      E: GREEN,
      O: AMBER,
      M: RED,
      V: [158, 86, 224, 255],
      L: YELLOW,
      W: TXT,
      H: [138, 162, 178, 255],
    };
    for (let ry = 0; ry < mat12.length; ry += 1) {
      const lin = mat12[ry];
      for (let rx = 0; rx < lin.length; rx += 1) {
        const ch = lin[rx];
        if (ch === '.') continue;
        const cBase = pal12[ch];
        if (!cBase) continue;
        if (desativado && ch !== '#') {
          const lum = Math.round((cBase[0] + cBase[1] + cBase[2]) * 0.22);
          putPx(ix0 + rx, iy0 + ry, [lum, lum + 6, lum + 12, 255]);
        } else {
          putPx(ix0 + rx, iy0 + ry, cBase);
        }
      }
    }
  };

  return {
    W,
    H,
    rgba,
    viewModel: vmSafe,
    opcoes: opSafe,
    assets: assetsSafe,
    hitboxes: hbSafe,
    tabelas: tabSafe,
    cachesFrame: cStore,
    f4Anim,
    disparandoDorsal,
    tempoSeg,
    ev60,
    idHoverAtivo,
    idPressAtivo,
    faseJogo,
    estadoFisico,
    ehTouchdown,
    classeAlvo,
    ehMonstroAlvo,
    ehChefeDraga,
    dyCena,
    idCarcaca,
    BG,
    PANEL,
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
    SPRITES_INSUMOS,
    ATLAS_4F,
    VARIANTES_57A,
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
    desenharNodoBoiaMapaHiBit,
    socket,
    bolhaBarreira,
    lock,
    blitIconeHiBit,
    heartOrgan,
    desenharMiniaturaBioNaveHiBit,
    desenharRetratoRecortadoHiBit,
    desenharIconeSis12,
  };
}
