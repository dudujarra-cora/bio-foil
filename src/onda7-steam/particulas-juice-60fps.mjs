/**
 * Bio-Foil — Edição Comercial Steam (Onda 7)
 * Módulo: Motor Determinístico de Partículas, Projéteis, Escudos e Inundação Viva a 60 FPS.
 * Opera diretamente sobre `Uint8ClampedArray` RGBA (`largura * altura * 4`),
 * garantindo `0 bytes diff` entre Servidor Node e Browser HTML5 Canvas!
 */

import { obterBocaDorsalLayout960 } from './topologias-naves-ab.mjs';

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function reducirShake(valor, reduzirMovimento) {
  if (reduzirMovimento) return 0;
  const n = Number(valor ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-6, Math.min(6, Math.round(n)));
}

function hashDet(sementeInt) {
  let x = (sementeInt | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

function blendPixelRgba(buf, largura, altura, x, y, r, g, b, a) {
  const ix = x | 0;
  const iy = y | 0;
  if (ix < 0 || iy < 0 || ix >= largura || iy >= altura || a <= 0) return;
  const idx = (iy * largura + ix) * 4;
  if (a >= 255) {
    buf[idx] = r;
    buf[idx + 1] = g;
    buf[idx + 2] = b;
    buf[idx + 3] = 255;
    return;
  }
  const invA = 255 - a;
  buf[idx] = (r * a + buf[idx] * invA + 127) >> 8;
  buf[idx + 1] = (g * a + buf[idx + 1] * invA + 127) >> 8;
  buf[idx + 2] = (b * a + buf[idx + 2] * invA + 127) >> 8;
  buf[idx + 3] = Math.min(255, buf[idx + 3] + ((a * (255 - buf[idx + 3]) + 127) >> 8));
}

function desenharDiscoRgba(buf, largura, altura, cx, cy, raio, cor) {
  const [r, g, b, a] = cor;
  const rInt = Math.ceil(raio);
  const r2 = raio * raio;
  for (let dy = -rInt; dy <= rInt; dy += 1) {
    for (let dx = -rInt; dx <= rInt; dx += 1) {
      const d2 = dx * dx + dy * dy;
      if (d2 <= r2) {
        const fator = d2 > r2 * 0.65 ? 0.6 : 1.0;
        blendPixelRgba(buf, largura, altura, Math.round(cx + dx), Math.round(cy + dy), r, g, b, Math.round(a * fator));
      }
    }
  }
}

function desenharAnelRgba(buf, largura, altura, cx, cy, raio, espessura, cor) {
  const [r, g, b, a] = cor;
  const rExt = raio + espessura * 0.5;
  const rInt = Math.max(0, raio - espessura * 0.5);
  const rExt2 = rExt * rExt;
  const rInt2 = rInt * rInt;
  const lim = Math.ceil(rExt);
  for (let dy = -lim; dy <= lim; dy += 1) {
    for (let dx = -lim; dx <= lim; dx += 1) {
      const d2 = dx * dx + dy * dy;
      if (d2 >= rInt2 && d2 <= rExt2) {
        blendPixelRgba(buf, largura, altura, Math.round(cx + dx), Math.round(cy + dy), r, g, b, a);
      }
    }
  }
}

function desenharLinhaRgba(buf, largura, altura, x0, y0, x1, y1, cor, espessura = 1) {
  const [r, g, b, a] = cor;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const passos = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
  const rEsp = Math.max(0, (espessura - 1) * 0.5);
  for (let i = 0; i <= passos; i += 1) {
    const t = i / passos;
    const px = x0 + dx * t;
    const py = y0 + dy * t;
    if (rEsp <= 0.25) {
      blendPixelRgba(buf, largura, altura, Math.round(px), Math.round(py), r, g, b, a);
    } else {
      desenharDiscoRgba(buf, largura, altura, px, py, rEsp + 0.5, cor);
    }
  }
}

// Micro-glifo 3x5 p/ badges balísticos rápidos (`MISS!`, `ESQUIVA!`, `ION!`)
const GLIFOS_3X5 = Object.freeze({
  A: [0b010, 0b101, 0b111, 0b101, 0b101],
  D: [0b110, 0b101, 0b101, 0b101, 0b110],
  E: [0b111, 0b100, 0b110, 0b100, 0b111],
  G: [0b011, 0b100, 0b101, 0b101, 0b011],
  I: [0b111, 0b010, 0b010, 0b010, 0b111],
  M: [0b101, 0b111, 0b101, 0b101, 0b101],
  N: [0b110, 0b101, 0b101, 0b101, 0b101],
  O: [0b010, 0b101, 0b101, 0b101, 0b010],
  Q: [0b010, 0b101, 0b101, 0b011, 0b001],
  S: [0b011, 0b100, 0b010, 0b001, 0b110],
  U: [0b101, 0b101, 0b101, 0b101, 0b111],
  V: [0b101, 0b101, 0b101, 0b101, 0b010],
  '!': [0b010, 0b010, 0b010, 0b000, 0b010],
});

function desenharSeloCurtoRgba(buf, largura, altura, x, y, texto, corFrente, escala = 2) {
  const str = String(texto ?? '').toUpperCase();
  const largTotal = str.length * 4 * escala + 4;
  const altTotal = 5 * escala + 4;
  for (let py = y - 2; py < y - 2 + altTotal; py += 1) {
    for (let px = x - 2; px < x - 2 + largTotal; px += 1) {
      blendPixelRgba(buf, largura, altura, px, py, 6, 14, 22, 196);
    }
  }
  const [r, g, b, a] = corFrente;
  for (let idx = 0; idx < str.length; idx += 1) {
    const glifo = GLIFOS_3X5[str[idx]];
    if (!glifo) continue;
    const ox = x + idx * 4 * escala;
    for (let gy = 0; gy < 5; gy += 1) {
      const linhaBits = glifo[gy];
      for (let gx = 0; gx < 3; gx += 1) {
        if ((linhaBits >> (2 - gx)) & 1) {
          for (let sy = 0; sy < escala; sy += 1) {
            for (let sx = 0; sx < escala; sx += 1) {
              blendPixelRgba(buf, largura, altura, ox + gx * escala + sx, y + gy * escala + sy, r, g, b, a);
            }
          }
        }
      }
    }
  }
}

/**
 * Calcula descritores determinísticos de partículas, projéteis, feixes, escudos e inundação
 * a partir do `viewModel` de combate atual.
 */
export function calcularEstadoJuiceCombate60Fps(viewModel, opcoes = {}) {
  const escala = Math.max(1, Number(opcoes.escala ?? 1));
  const idioma = opcoes.idioma === 'en-US' ? 'en-US' : 'pt-BR';
  const reduzirMovimento = Boolean(opcoes.reduzirMovimento ?? viewModel?.configuracoesSteam?.reduzirMovimento ?? false);
  const tempoSeg = Math.max(0, Number(viewModel?.tempoCombateSeg ?? viewModel?.relogioSeg ?? 0));
  const layoutId = viewModel?.layoutId ?? viewModel?.nave?.layoutId ?? 'CARCACA_ALFA_A';

  // 1. Domo de Barreira de Bolhas do Jogador
  const camadasBarreira = Math.max(
    0,
    Number(viewModel?.barreiraBolhas?.camadasAtuais ?? viewModel?.nave?.barreiraCamadas ?? 0)
  );
  const ehMonstroDomo = String(viewModel?.painelAlvo?.classeAlvo ?? '').includes('MONSTRO');
  const ehTdDomo = Boolean(
    viewModel?.emTouchdown ?? ((viewModel?.barraSuperior?.estadoFisico ?? '1_NO_FOIL') !== '1_NO_FOIL')
  );
  const deslocamentoVerticalPx = Number(opcoes.deslocamentoVerticalPx ?? 0);
  const shakeX = reducirShake(opcoes.shakeX, reduzirMovimento);
  const shakeY = reducirShake(opcoes.shakeY, reduzirMovimento);
  const retsDomo = Array.isArray(opcoes.retangulosCamaras960) ? opcoes.retangulosCamaras960 : [];
  const mapaCamaras960 = new Map();
  for (const r of retsDomo) {
    const idC = Number(r.camaraId ?? r.id);
    const rw = Number(r.largura ?? r.w ?? 77);
    const rh = Number(r.altura ?? r.h ?? 42);
    mapaCamaras960.set(idC, {
      x: r.x + shakeX,
      y: r.y + deslocamentoVerticalPx + shakeY,
      largura: rw,
      altura: rh,
      cx: Math.round(r.x + rw * 0.5) + shakeX,
      cy: Math.round(r.y + rh * 0.5) + deslocamentoVerticalPx + shakeY,
    });
  }
  const mapaSalasAlvo960 = new Map();
  for (const hb of opcoes.hitboxes ?? []) {
    if (hb?.tipo === 'SALA_ALVO' || String(hb?.idHitbox ?? '').startsWith('SALA_ALVO_')) {
      const idS = Number(hb.metadados?.salaId ?? String(hb.idHitbox ?? '').replace('SALA_ALVO_', ''));
      if (Number.isFinite(idS)) {
        mapaSalasAlvo960.set(idS, {
          x: hb.x,
          y: hb.y,
          largura: hb.largura,
          altura: hb.altura,
          cx: Math.round(hb.x + hb.largura * 0.5),
          cy: Math.round(hb.y + hb.altura * 0.5),
        });
      }
    }
  }
  const listaSalasAlvo = [...mapaSalasAlvo960.values()];
  const centroPadraoAlvo =
    listaSalasAlvo.length > 0
      ? {
          cx: Math.round(listaSalasAlvo.reduce((acc, s) => acc + s.cx, 0) / listaSalasAlvo.length),
          cy: Math.round(listaSalasAlvo.reduce((acc, s) => acc + s.cy, 0) / listaSalasAlvo.length),
        }
      : { cx: 742, cy: 238 };

  let centroDomo960;
  if (retsDomo.length >= 4) {
    const minXD = Math.min(...retsDomo.map((r) => r.x));
    const maxXD = Math.max(...retsDomo.map((r) => r.x + (r.largura ?? r.w ?? 77)));
    const minYD = Math.min(...retsDomo.map((r) => r.y));
    const maxYD = Math.max(...retsDomo.map((r) => r.y + (r.altura ?? r.h ?? 42)));
    centroDomo960 = {
      x: Math.round((minXD + maxXD) * 0.5) + shakeX,
      y: Math.round((minYD + maxYD) * 0.5) + deslocamentoVerticalPx + shakeY,
      rx: Math.max(126, Math.round((maxXD - minXD) * 0.5 + 34)),
      ry: Math.max(104, Math.round((maxYD - minYD) * 0.5 + 24)),
    };
  } else {
    centroDomo960 = ehTdDomo
      ? { x: 428 + shakeX, y: 222 + deslocamentoVerticalPx + shakeY, rx: 132, ry: 110 }
      : ehMonstroDomo
        ? { x: 458 + shakeX, y: 206 + deslocamentoVerticalPx + shakeY, rx: 126, ry: 104 }
        : { x: 452 + shakeX, y: 218 + deslocamentoVerticalPx + shakeY, rx: 132, ry: 110 };
  }

  // 2. Câmaras inundadas / com brechas / em drenagem
  const camarasHidraulicas = [];
  for (const cam of viewModel?.camaras ?? []) {
    const massaKg = Math.max(0, Number(cam.massaAguaKg ?? 0));
    const pctAgua = clamp(Number(cam.nivelAguaPct ?? (massaKg / 120) * 100), 0, 100);
    const brechas = Math.max(0, Number(cam.brechasCasco ?? cam.brechas ?? 0));
    const drenando = Boolean(cam.valvulaAberta || cam.drenandoAtivo);
    if (pctAgua > 1 || brechas > 0 || drenando) {
      camarasHidraulicas.push({
        camaraId: cam.id,
        pctAgua,
        massaKg,
        brechas,
        drenando,
        retangulo960: cam.retangulo960 ?? null,
      });
    }
  }

  // 3. Projéteis, Feixes, Íons e Eventos Balísticos Ativos
  const eventosBalisticos = [];
  const listaExplicita = viewModel?.projeteisAtivos ?? viewModel?.eventosBalisticosRecentes ?? [];
  const projsInterpolados60 = Array.isArray(opcoes.estadoVisual60Fps?.projeteisAtivos)
    ? opcoes.estadoVisual60Fps.projeteisAtivos.map((p, idxP) => {
        const chUp = String(p.chassiId ?? '').toUpperCase();
        const famInterp = p.ehFeixe
          ? 'FEIXE'
          : chUp.includes('ION') || chUp.includes('BIOELETRIC') || chUp.includes('ESTASE')
            ? 'ION'
            : chUp.includes('TORPEDO') || chUp.includes('MISSIL') || chUp.includes('MINA')
              ? 'TORPEDO'
              : chUp.includes('DISPERSOR') || chUp.includes('FLAK') || chUp.includes('ENXAME') || chUp.includes('METRALHADORA')
                ? 'FLAK'
                : 'PROJETIL';
        const wpUlt = Array.isArray(p.waypointsSalas) && p.waypointsSalas.length >= 2
          ? p.waypointsSalas[p.waypointsSalas.length - 1]
          : null;
        return {
          id: p.id ?? `EV60_${idxP}`,
          familia: famInterp,
          resultado: p.progresso0a1 >= 0.9 ? 'IMPACTO' : 'EM_VOO',
          origem: p.lado === 'INIMIGO' ? 'INIMIGO' : 'JOGADOR',
          slotIndice: Number(p.slotIndex ?? 0),
          xOrigem960: p.xOrigem,
          yOrigem960: p.yOrigem,
          xAlvo960: p.ehFeixe && Array.isArray(p.waypointsSalas) && p.waypointsSalas[0] ? p.waypointsSalas[0].x : p.xDestino,
          yAlvo960: p.ehFeixe && Array.isArray(p.waypointsSalas) && p.waypointsSalas[0] ? p.waypointsSalas[0].y : p.yDestino,
          xFimBeam960: wpUlt ? wpUlt.x : undefined,
          yFimBeam960: wpUlt ? wpUlt.y : undefined,
          progresso: p.progresso0a1,
        };
      })
    : [];
  const listaBruta = listaExplicita.length > 0 ? listaExplicita : projsInterpolados60;
  for (let i = 0; i < listaBruta.length; i += 1) {
    const ev = listaBruta[i];
    const origemJogador = ev.origem !== 'INIMIGO';
    const slotIdx = Number(ev.slotIndice ?? i % 4);
    const [bx, by] = obterBocaDorsalLayout960(layoutId, undefined, slotIdx);
    const dyBocaTd = ehTdDomo ? 96 : 0;
    const salaOrigInim = !origemJogador ? mapaSalasAlvo960.get(Number(ev.salaOrigemId)) : null;
    const xIni = origemJogador
      ? Number(ev.xOrigem960 ?? (bx + shakeX))
      : Number(salaOrigInim?.cx ?? ev.xOrigem960 ?? 688);
    const yIni = origemJogador
      ? Number(ev.yOrigem960 ?? (by + dyBocaTd + deslocamentoVerticalPx + shakeY))
      : Number(salaOrigInim?.cy ?? ev.yOrigem960 ?? 224 + (i % 3) * 26);

    const salasBeamEv = Array.isArray(ev.salasFeixe) ? ev.salasFeixe : [];
    const salaAlvoObj = origemJogador
      ? mapaSalasAlvo960.get(Number(ev.salaAlvoId ?? salasBeamEv[0]))
      : null;
    const salaBeamFimObj =
      origemJogador && salasBeamEv.length >= 2
        ? mapaSalasAlvo960.get(Number(salasBeamEv[salasBeamEv.length - 1]))
        : null;
    const camAlvoJogObj = !origemJogador ? mapaCamaras960.get(Number(ev.camaraId)) : null;
    const resUp = String(ev.resultado ?? 'EM_VOO').toUpperCase();

    let xFim;
    let yFim;
    let xFimSec;
    let yFimSec;
    if (origemJogador) {
      if (salaAlvoObj && salaBeamFimObj) {
        xFim = salaAlvoObj.cx;
        yFim = salaAlvoObj.cy;
        xFimSec = salaBeamFimObj.cx;
        yFimSec = salaBeamFimObj.cy;
      } else if (salaAlvoObj) {
        const ehBeamEv = String(ev.familia ?? '').toUpperCase().includes('FEIXE') || String(ev.familia ?? '').toUpperCase().includes('BEAM');
        xFim = ehBeamEv ? Math.max(salaAlvoObj.x + 6, salaAlvoObj.cx - 14) : salaAlvoObj.cx;
        yFim = salaAlvoObj.cy;
        xFimSec = ehBeamEv ? Math.min(salaAlvoObj.x + salaAlvoObj.largura - 6, salaAlvoObj.cx + 14) : salaAlvoObj.cx + 22;
        yFimSec = salaAlvoObj.cy;
      } else {
        xFim = Number(ev.xAlvo960 ?? (centroPadraoAlvo.cx + ((i % 3) - 1) * 22));
        yFim = Number(ev.yAlvo960 ?? (centroPadraoAlvo.cy + ((i % 3) - 1) * 18));
        xFimSec = Number(ev.xFimBeam960 ?? xFim + 32);
        yFimSec = Number(ev.yFimBeam960 ?? yFim + 12);
      }
    } else if (resUp === 'ESCUDO' && camadasBarreira > 0) {
      xFim = Math.round(centroDomo960.x + centroDomo960.rx * 0.9);
      yFim = Math.round(centroDomo960.y + ((i % 3) - 1) * 22);
      xFimSec = xFim;
      yFimSec = yFim;
    } else if (camAlvoJogObj) {
      xFim = camAlvoJogObj.cx;
      yFim = camAlvoJogObj.cy;
      xFimSec = xFim;
      yFimSec = yFim;
    } else {
      xFim = Number(ev.xAlvo960 ?? (centroDomo960.x + ((i % 3) - 1) * 24));
      yFim = Number(ev.yAlvo960 ?? (centroDomo960.y + ((i % 3) - 1) * 18));
      xFimSec = xFim;
      yFimSec = yFim;
    }

    const prog = clamp(Number(ev.progresso ?? ((tempoSeg * 1.65 + i * 0.27) % 1)), 0, 1);

    eventosBalisticos.push({
      id: ev.id ?? `BAL_${i}`,
      familia: String(ev.familia ?? 'PROJETIL').toUpperCase(),
      resultado: resUp, // EM_VOO | IMPACTO | ESCUDO | ESQUIVA | INTERCEPTADO
      origemJogador,
      xIni,
      yIni,
      xFim,
      yFim,
      progresso: prog,
      xFimSecundario: xFimSec,
      yFimSecundario: yFimSec,
    });
  }

  // Síntese automática a partir de armas disparando em tempo real caso `projeteisAtivos` não tenha sido populado explicitamente
  if (eventosBalisticos.length === 0 && Array.isArray(viewModel?.armasAtivas)) {
    for (let s = 0; s < viewModel.armasAtivas.length; s += 1) {
      const arma = viewModel.armasAtivas[s];
      const recargaPct = Number(arma?.progressoRecargaPct ?? arma?.cargaPct ?? 0);
      const disparandoRecente = Boolean(arma?.disparandoAgora) || (arma?.alvoSalaId != null && recargaPct >= 88);
      if (!disparandoRecente) continue;
      const [bxAuto, byAuto] = obterBocaDorsalLayout960(layoutId, undefined, s);
      const dyBocaAuto = ehTdDomo ? 96 : 0;
      const fam = String(arma?.familia ?? arma?.subtipo ?? 'PROJETIL').toUpperCase();
      const prog = clamp((recargaPct - 88) / 12, 0.08, 0.98);
      const trincaAuto = Array.isArray(arma?.trincaSalasBeam) ? arma.trincaSalasBeam : [];
      const salaAuto = mapaSalasAlvo960.get(Number(arma?.alvoSalaId ?? arma?.salaAlvoId ?? trincaAuto[0]));
      const salaAutoFim = trincaAuto.length >= 2 ? mapaSalasAlvo960.get(Number(trincaAuto[trincaAuto.length - 1])) : null;
      const xAlvoAuto = Number(arma?.xAlvo960 ?? salaAuto?.cx ?? centroPadraoAlvo.cx);
      const yAlvoAuto = Number(arma?.yAlvo960 ?? salaAuto?.cy ?? (centroPadraoAlvo.cy + ((s % 3) - 1) * 18));
      eventosBalisticos.push({
        id: `AUTO_W_${s}`,
        familia: fam,
        resultado: prog > 0.9 ? 'IMPACTO' : 'EM_VOO',
        origemJogador: true,
        xIni: bxAuto + shakeX,
        yIni: byAuto + dyBocaAuto + deslocamentoVerticalPx + shakeY,
        xFim: xAlvoAuto,
        yFim: yAlvoAuto,
        progresso: prog,
        xFimSecundario: Number(salaAutoFim?.cx ?? (xAlvoAuto + 28)),
        yFimSecundario: Number(salaAutoFim?.cy ?? yAlvoAuto),
      });
    }
  }

  return Object.freeze({
    escala,
    idioma,
    reduzirMovimento,
    tempoSeg,
    deslocamentoVerticalPx,
    camadasBarreira,
    centroDomo960: Object.freeze(centroDomo960),
    camarasHidraulicas: Object.freeze(camarasHidraulicas),
    eventosBalisticos: Object.freeze(eventosBalisticos),
  });
}

/**
 * Rasteriza inundação viva com crista senoidal (`slosh`), bolhas ascendentes,
 * gêiseres de brecha e spray de drenagem costeira dentro das câmaras da bio-nave!
 * Preserva 100% da nitidez dos sprites de tripulantes (o corpo d'água base já foi pintado atrás dos tripulantes).
 */
export function rasterizarInundacaoVivaCamarasRgba(buf, largura, altura, estadoJuice, retangulosCamaras960 = []) {
  const S = estadoJuice.escala;
  const t = estadoJuice.reduzirMovimento ? 0 : estadoJuice.tempoSeg;
  const deslY = Number(estadoJuice.deslocamentoVerticalPx ?? 0);
  const mapaRet = new Map();
  for (const r of retangulosCamaras960) {
    mapaRet.set(Number(r.camaraId ?? r.id), r);
  }

  let pixelsHidraulicos = 0;

  for (const cam of estadoJuice.camarasHidraulicas) {
    const ret = cam.retangulo960 ?? mapaRet.get(Number(cam.camaraId));
    if (!ret) continue;
    const x0 = Math.round((ret.x + 3) * S);
    const x1 = Math.round((ret.x + (ret.largura ?? ret.w) - 4) * S);
    const yTopoSala = Math.round((ret.y + deslY + 13) * S);
    const yPisoSala = Math.round((ret.y + deslY + (ret.altura ?? ret.h) - 3) * S);
    const altUtil = Math.max(4, yPisoSala - yTopoSala);

    // 1. Crista senoidal de superfície (`slosh`) e reflexo cáustico sem encobrir sprites de tripulantes!
    if (cam.pctAgua > 1) {
      const altAguaBase = Math.max(2 * S, Math.round((cam.pctAgua / 100) * altUtil));
      const ySuperficieBase = yPisoSala - altAguaBase;
      const ampOnda = estadoJuice.reduzirMovimento ? 0 : Math.min(2.0 * S, altAguaBase * 0.22);

      if (cam.pctAgua < 98) {
        for (let px = x0; px <= x1; px += 1) {
          const fase = (px / (9 * S)) + t * 5.2 + cam.camaraId * 1.3;
          const yCrista = Math.max(yTopoSala, Math.min(yPisoSala, Math.round(ySuperficieBase + Math.sin(fase) * ampOnda)));
          blendPixelRgba(buf, largura, altura, px, yCrista, 174, 244, 255, 196);
          pixelsHidraulicos += 1;
          if (yCrista + 1 <= yPisoSala) {
            blendPixelRgba(buf, largura, altura, px, yCrista + 1, 76, 206, 236, 118);
            pixelsHidraulicos += 1;
          }
          if (yCrista + 2 <= yPisoSala && ((px + Math.round(t * 12)) & 1) === 0) {
            blendPixelRgba(buf, largura, altura, px, yCrista + 2, 42, 162, 204, 72);
            pixelsHidraulicos += 1;
          }
        }
      } else {
        for (let px = x0; px <= x1; px += 2) {
          blendPixelRgba(buf, largura, altura, px, yTopoSala, 96, 224, 248, 92);
          pixelsHidraulicos += 1;
        }
      }

      // Reflexo cáustico sutil junto ao piso da câmara (abaixo dos tripulantes, 0 oclusão de sprites!)
      for (let px = x0; px <= x1; px += 1) {
        const caust = 0.5 + 0.5 * Math.sin(px * 0.28 - t * 4.4 + cam.camaraId);
        blendPixelRgba(buf, largura, altura, px, yPisoSala, 48, 178, 214, Math.round(38 + caust * 44));
        pixelsHidraulicos += 1;
        if (yPisoSala - 1 >= yTopoSala && (px & 1) === 0) {
          blendPixelRgba(buf, largura, altura, px, yPisoSala - 1, 34, 146, 188, Math.round(28 + caust * 30));
          pixelsHidraulicos += 1;
        }
      }

      // Bolhas ascendentes dentro da água
      const qtdBolhas = Math.min(8, 2 + Math.floor(cam.pctAgua / 16));
      for (let b = 0; b < qtdBolhas; b += 1) {
        const uX = hashDet(cam.camaraId * 97 + b * 31);
        const uVel = 0.55 + hashDet(cam.camaraId * 53 + b * 17) * 0.75;
        const ciclo = estadoJuice.reduzirMovimento ? (b / qtdBolhas) : ((t * uVel + b * 0.23) % 1);
        const bx = x0 + 4 * S + uX * Math.max(2, x1 - x0 - 8 * S);
        const by = yPisoSala - ciclo * Math.max(2, altAguaBase - 2 * S);
        if (by >= yTopoSala + S) {
          desenharAnelRgba(buf, largura, altura, bx, by, 1.5 * S, 0.9 * S, [200, 248, 255, 185]);
          pixelsHidraulicos += 4;
        }
      }
    }

    // 2. Gêiser pressurizado de brecha no casco!
    if (cam.brechas > 0) {
      for (let br = 0; br < Math.min(2, cam.brechas); br += 1) {
        const gx = x0 + Math.round((0.28 + br * 0.42) * (x1 - x0));
        const gy = yTopoSala + Math.round(0.35 * altUtil);
        desenharDiscoRgba(buf, largura, altura, gx, gy, 2.5 * S, [255, 92, 74, 220]);
        for (let j = 0; j < 7; j += 1) {
          const ang = -0.7 + (j / 6) * 1.4 + Math.sin(t * 9 + j) * 0.14;
          const comp = (6 + (j % 3) * 3.5) * S;
          desenharLinhaRgba(
            buf,
            largura,
            altura,
            gx,
            gy,
            gx + Math.cos(ang) * comp,
            gy + Math.sin(ang) * comp + 3 * S,
            [140, 232, 255, 205],
            Math.max(1, S)
          );
          pixelsHidraulicos += 6;
        }
      }
    }

    // 3. Pluma externa de válvula / brânquia drenando
    if (cam.drenando) {
      const vx = x0 + Math.round(0.5 * (x1 - x0));
      const vy = yPisoSala;
      for (let sp = -2; sp <= 2; sp += 1) {
        const osc = estadoJuice.reduzirMovimento ? 0 : Math.sin(t * 11 + sp) * 2 * S;
        desenharLinhaRgba(
          buf,
          largura,
          altura,
          vx + sp * 2 * S,
          vy,
          vx + sp * 4.5 * S + osc,
          vy + 8 * S,
          [98, 238, 224, 185],
          Math.max(1, S)
        );
        pixelsHidraulicos += 5;
      }
    }
  }

  return pixelsHidraulicos;
}

/**
 * Rasteriza o Domo Elíptico da Barreira de Bolhas + ondas de choque de absorção,
 * projéteis com wakes hidrodinâmicos, feixes térmicos/neurais, arcos iônicos,
 * estilhaços de impacto e fly-bys de `ESQUIVA! / MISS!`.
 */
export function rasterizarParticulasEJuiceRgba(buf, largura, altura, viewModel, opcoes = {}) {
  const estado = calcularEstadoJuiceCombate60Fps(viewModel, opcoes);
  const S = estado.escala;
  const t = estado.reduzirMovimento ? 0 : estado.tempoSeg;
  let pixelsJuice = 0;

  // 1. Inundação viva nas câmaras
  pixelsJuice += rasterizarInundacaoVivaCamarasRgba(
    buf,
    largura,
    altura,
    estado,
    opcoes.retangulosCamaras960 ?? viewModel?.camaras ?? []
  );

  // 2. Domo Elíptico da Barreira de Bolhas
  if (estado.camadasBarreira > 0) {
    const cx = estado.centroDomo960.x * S;
    const cy = estado.centroDomo960.y * S;
    const rx = estado.centroDomo960.rx * S;
    const ry = estado.centroDomo960.ry * S;
    const passos = Math.round(220 * S);
    const alphaBase = Math.min(205, 58 + estado.camadasBarreira * 34);
    for (let i = 0; i < passos; i += 1) {
      const ang = (i / passos) * Math.PI * 2;
      const ond = estado.reduzirMovimento ? 0 : Math.sin(ang * 6 + t * 3.5) * 1.4 * S;
      const px = cx + Math.cos(ang) * (rx + ond);
      const py = cy + Math.sin(ang) * (ry + ond * 0.6);
      desenharDiscoRgba(buf, largura, altura, px, py, 1.1 * S, [68, 230, 245, alphaBase]);
      if (estado.camadasBarreira >= 2 && i % 2 === 0) {
        const px2 = cx + Math.cos(ang) * (rx - 4 * S);
        const py2 = cy + Math.sin(ang) * (ry - 3 * S);
        blendPixelRgba(buf, largura, altura, Math.round(px2), Math.round(py2), 145, 250, 255, 115);
      }
      pixelsJuice += 2;
    }
  }

  // 3. Eventos Balísticos (Projéteis, Torpedos, Flak, Feixes, Íons, Bombas, Escudos, Esquivas)
  for (let idx = 0; idx < estado.eventosBalisticos.length; idx += 1) {
    const ev = estado.eventosBalisticos[idx];
    const x0 = ev.xIni * S;
    const y0 = ev.yIni * S;
    const x1 = ev.xFim * S;
    const y1 = ev.yFim * S;
    const p = ev.progresso;

    if (ev.familia.includes('FEIXE') || ev.familia.includes('BEAM')) {
      const xb = (ev.xFim + (ev.xFimSecundario - ev.xFim) * p) * S;
      const yb = (ev.yFim + (ev.yFimSecundario - ev.yFim) * p) * S;
      const ehBio = ev.familia.includes('BIO') || ev.familia.includes('NEURAL');
      const corExterna = ehBio ? [210, 62, 248, 175] : [255, 106, 38, 185];
      const corNucleo = ehBio ? [252, 198, 255, 245] : [255, 242, 178, 248];
      desenharLinhaRgba(buf, largura, altura, x0, y0, xb, yb, corExterna, 4 * S);
      desenharLinhaRgba(buf, largura, altura, x0, y0, xb, yb, corNucleo, 1.6 * S);
      // Cicatriz incandescente no alvo
      desenharLinhaRgba(buf, largura, altura, x1, y1, xb, yb, [255, 150, 52, 210], 2.2 * S);
      desenharDiscoRgba(buf, largura, altura, xb, yb, 4.5 * S, corNucleo);
      pixelsJuice += 40;
      continue;
    }

    if (ev.familia.includes('BOMBA')) {
      const rImp = (18 * (1 - p * 0.72) + 4) * S;
      desenharAnelRgba(buf, largura, altura, x1, y1, rImp, 2 * S, [92, 246, 196, 215]);
      desenharDiscoRgba(buf, largura, altura, x1, y1, 4 * p * S + S, [196, 255, 228, 225]);
      pixelsJuice += 24;
      continue;
    }

    // Posição interpolada do projétil (com desvio tangencial quando resultado === 'ESQUIVA')
    const desvioMiss = ev.resultado === 'ESQUIVA' ? Math.sin(p * Math.PI) * -28 * S : -Math.sin(p * Math.PI) * 10 * S;
    const px = x0 + (x1 - x0) * p;
    const py = y0 + (y1 - y0) * p + desvioMiss;
    const angVoo = Math.atan2(y1 - y0, x1 - x0);

    // Esteira hidrodinâmica em V (`wake`) + bolhas de cavitação
    const compWake = 18 * S;
    for (let w = 1; w <= 5; w += 1) {
      const frac = w / 5;
      const wx = px - Math.cos(angVoo) * compWake * frac;
      const wy = py - Math.sin(angVoo) * compWake * frac;
      const abertura = frac * 4.5 * S;
      desenharDiscoRgba(
        buf,
        largura,
        altura,
        wx + Math.sin(angVoo) * abertura,
        wy - Math.cos(angVoo) * abertura,
        1.1 * S,
        [156, 236, 255, Math.round(180 * (1 - frac))]
      );
      desenharDiscoRgba(
        buf,
        largura,
        altura,
        wx - Math.sin(angVoo) * abertura,
        wy + Math.cos(angVoo) * abertura,
        1.1 * S,
        [156, 236, 255, Math.round(180 * (1 - frac))]
      );
    }

    // Corpo do projétil conforme a família
    const ehIon = ev.familia.includes('ION');
    const ehTorpedo = ev.familia.includes('TORPEDO') || ev.familia.includes('MISSIL');
    const ehFlak = ev.familia.includes('FLAK') || ev.familia.includes('ESTILHAC');
    const corOgiva = ehIon
      ? [76, 198, 255, 245]
      : ehTorpedo
        ? [255, 196, 74, 248]
        : ehFlak
          ? [230, 210, 175, 240]
          : [130, 255, 198, 245];

    if (ehFlak) {
      for (let k = 0; k < 5; k += 1) {
        const ox = Math.cos(k * 1.25 + t * 6) * 5 * S;
        const oy = Math.sin(k * 1.25 + t * 6) * 4 * S;
        desenharDiscoRgba(buf, largura, altura, px + ox, py + oy, 1.8 * S, corOgiva);
      }
    } else {
      desenharDiscoRgba(buf, largura, altura, px, py, (ehTorpedo ? 3.4 : 2.6) * S, corOgiva);
      desenharDiscoRgba(buf, largura, altura, px, py, 1.3 * S, [255, 255, 255, 250]);
    }

    // Arcos elétricos para projétil iônico
    if (ehIon) {
      for (let a = 0; a < 3; a += 1) {
        const angA = a * 2.1 + t * 12;
        desenharLinhaRgba(
          buf,
          largura,
          altura,
          px,
          py,
          px + Math.cos(angA) * 7 * S,
          py + Math.sin(angA) * 7 * S,
          [148, 236, 255, 220],
          Math.max(1, S)
        );
      }
    }
    pixelsJuice += 28;

    // Efeitos de boca de arma (`muzzle flash`) no início do disparo e efeitos terminais na chegada real!
    if (p <= 0.28) {
      desenharDiscoRgba(buf, largura, altura, x0, y0, (3.2 - p * 6) * S, [255, 244, 184, 210]);
      pixelsJuice += 8;
    }

    if (ev.resultado === 'INTERCEPTADO') {
      const xDrone = (estado.centroDomo960.x + 56) * S;
      const yDrone = (estado.centroDomo960.y - 68) * S;
      const pInt = Math.min(p, 0.62);
      const ix = x0 + (x1 - x0) * pInt;
      const iy = y0 + (y1 - y0) * pInt;
      desenharLinhaRgba(buf, largura, altura, xDrone, yDrone, ix, iy, [96, 255, 224, 235], 1.8 * S);
      desenharAnelRgba(buf, largura, altura, ix, iy, (5 + p * 6) * S, 1.6 * S, [118, 255, 232, 225]);
      pixelsJuice += 24;
    } else if (
      (ev.resultado === 'ESCUDO' && p >= 0.65) ||
      (p > 0.78 && !ev.origemJogador && estado.camadasBarreira > 0 && ev.resultado !== 'ESQUIVA')
    ) {
      for (let r = 1; r <= 3; r += 1) {
        desenharAnelRgba(buf, largura, altura, px, py, (4 + r * 5 * p) * S, 1.4 * S, [92, 245, 255, 220 - r * 50]);
      }
      pixelsJuice += 18;
    } else if (ev.resultado === 'ESQUIVA' && p >= 0.45) {
      const txtMiss = estado.idioma === 'en-US' ? 'MISS!' : 'ESQUIVA!';
      const xMiss = ev.origemJogador ? Math.max(Math.round(628 * S), Math.round(px - 14 * S)) : Math.round(562 * S);
      const yMiss = ev.origemJogador ? Math.max(Math.round(172 * S), Math.round(py - 14 * S)) : Math.min(Math.round(104 * S), Math.round(py - 18 * S));
      desenharSeloCurtoRgba(buf, largura, altura, xMiss, yMiss, txtMiss, [255, 232, 98, 245], Math.max(1, S));
      pixelsJuice += 20;
    } else if ((ev.resultado === 'IMPACTO' && p >= 0.68) || p >= 0.9) {
      desenharAnelRgba(buf, largura, altura, x1, y1, (6 + p * 8) * S, 1.8 * S, ehIon ? [88, 214, 255, 220] : [255, 146, 58, 225]);
      for (let sp = 0; sp < 8; sp += 1) {
        const angS = (sp / 8) * Math.PI * 2 + idx * 0.4;
        const distS = (4 + (sp % 3) * 4) * S * p;
        desenharDiscoRgba(
          buf,
          largura,
          altura,
          x1 + Math.cos(angS) * distS,
          y1 + Math.sin(angS) * distS,
          1.3 * S,
          ehIon ? [150, 238, 255, 225] : [255, 212, 112, 230]
        );
      }
      pixelsJuice += 26;
    }
  }

  return Object.freeze({
    pixelsAlterados: pixelsJuice,
    estadoCalculado: estado,
  });
}
