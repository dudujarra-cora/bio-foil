/**
 * Bio-Foil — Edição Comercial Steam (Onda 7)
 * Módulo: Renderizador RGBA Puro de Topologias Orgânicas A/B (Esfíncteres, Anteparas
 * Seladas e Bio-Dutos Curvos), Controles Steam do Hangar, Modal de Opções,
 * Galeria de 24 Conquistas e Spotlight Interativo do Tutorial.
 * 0 bytes diff entre Servidor Node e Browser HTML5 Canvas!
 */

import { resolverLayoutTopologiaNave, calcularRetangulosCamarasMoldadas960 } from './topologias-naves-ab.mjs';
import {
  obterConfiguracaoDificuldadeSteam,
  obterCatalogo24ConquistasSteam,
  criarConfiguracoesSteam,
  verificarLayoutTipoBDesbloqueado,
} from './dificuldades-conquistas-opcoes.mjs';
import { obterEtapaAtualTutorialSteam } from './tutorial-interativo.mjs';
import { tUi, normalizarIdiomaSteam } from './i18n-dicionario-ui.mjs';

function blendPx(buf, w, h, x, y, r, g, b, a = 255) {
  const ix = x | 0;
  const iy = y | 0;
  if (ix < 0 || iy < 0 || ix >= w || iy >= h || a <= 0) return;
  const i = (iy * w + ix) * 4;
  if (a >= 255) {
    buf[i] = r;
    buf[i + 1] = g;
    buf[i + 2] = b;
    buf[i + 3] = 255;
    return;
  }
  const inv = 255 - a;
  buf[i] = (r * a + buf[i] * inv + 127) >> 8;
  buf[i + 1] = (g * a + buf[i + 1] * inv + 127) >> 8;
  buf[i + 2] = (b * a + buf[i + 2] * inv + 127) >> 8;
  buf[i + 3] = 255;
}

function fillRectS(buf, w, h, S, x0, y0, rw, rh, cor) {
  const [r, g, b, a] = cor;
  const sx0 = Math.round(x0 * S);
  const sy0 = Math.round(y0 * S);
  const sx1 = Math.round((x0 + rw) * S);
  const sy1 = Math.round((y0 + rh) * S);
  for (let py = sy0; py < sy1; py += 1) {
    for (let px = sx0; px < sx1; px += 1) {
      blendPx(buf, w, h, px, py, r, g, b, a);
    }
  }
}

function strokeRectS(buf, w, h, S, x0, y0, rw, rh, cor, esp = 1) {
  fillRectS(buf, w, h, S, x0, y0, rw, esp, cor);
  fillRectS(buf, w, h, S, x0, y0 + rh - esp, rw, esp, cor);
  fillRectS(buf, w, h, S, x0, y0, esp, rh, cor);
  fillRectS(buf, w, h, S, x0 + rw - esp, y0, esp, rh, cor);
}

function lineS(buf, w, h, S, x0, y0, x1, y1, cor, esp = 1.5) {
  const [r, g, b, a] = cor;
  const sx0 = x0 * S;
  const sy0 = y0 * S;
  const sx1 = x1 * S;
  const sy1 = y1 * S;
  const passos = Math.max(1, Math.ceil(Math.hypot(sx1 - sx0, sy1 - sy0)));
  const rad = Math.max(0, Math.floor((esp * S) / 2));
  for (let i = 0; i <= passos; i += 1) {
    const t = i / passos;
    const cx = Math.round(sx0 + (sx1 - sx0) * t);
    const cy = Math.round(sy0 + (sy1 - sy0) * t);
    for (let dy = -rad; dy <= rad; dy += 1) {
      for (let dx = -rad; dx <= rad; dx += 1) {
        blendPx(buf, w, h, cx + dx, cy + dy, r, g, b, a);
      }
    }
  }
}

// Fonte 5x7 compacta para rótulos dos modais Steam (com acentuação pixel-art real PT-BR!)
const FONTE_5X7 = Object.freeze({
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 18, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 25, 21, 19, 17, 17, 17], O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4], U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 27, 17], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14], '2': [14, 17, 1, 6, 8, 16, 31],
  '3': [30, 1, 1, 14, 1, 1, 30], '4': [2, 6, 10, 18, 31, 2, 2], '5': [31, 16, 30, 1, 1, 17, 14],
  '6': [14, 16, 30, 17, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8], '8': [14, 17, 17, 14, 17, 17, 14],
  '9': [14, 17, 17, 15, 1, 1, 14],
  ':': [0, 4, 4, 0, 4, 4, 0], '-': [0, 0, 0, 31, 0, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0], '|': [4, 4, 4, 4, 4, 4, 4],
  '/': [1, 2, 2, 4, 8, 8, 16], '[': [14, 8, 8, 8, 8, 8, 14], ']': [14, 2, 2, 2, 2, 2, 14],
  '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '%': [25, 26, 2, 4, 8, 19, 19],
  '.': [0, 0, 0, 0, 0, 12, 12], ',': [0, 0, 0, 0, 4, 4, 8], '!': [4, 4, 4, 4, 4, 0, 4],
  '?': [14, 17, 1, 6, 4, 0, 4], '\'': [4, 4, 8, 0, 0, 0, 0],
  '_': [0, 0, 0, 0, 0, 0, 31], '&': [12, 18, 20, 8, 21, 18, 13],
  '>': [16, 8, 4, 2, 4, 8, 16], '<': [2, 4, 8, 16, 8, 4, 2],
});

const ACENTOS_5X7 = Object.freeze({
  Á: ['A', 'agudo'], À: ['A', 'grave'], Â: ['A', 'circ'], Ã: ['A', 'til'],
  É: ['E', 'agudo'], Ê: ['E', 'circ'],
  Í: ['I', 'agudo'],
  Ó: ['O', 'agudo'], Ô: ['O', 'circ'], Õ: ['O', 'til'],
  Ú: ['U', 'agudo'],
  Ç: ['C', 'cedil'],
});

const ORDEM_ATALHOS_MODAL_OPCOES = Object.freeze([
  'PAUSAR_TATICO',
  'MERGULHO_TATICO',
  'DRENAR_VALVULAS',
  'SALVA_MANUAL',
  'ARMA_SLOT_1',
  'ARMA_SLOT_2',
  'ARMA_SLOT_3',
  'ARMA_SLOT_4',
  'SALVAR_POSTOS',
  'RETORNAR_POSTOS',
  'SONDA_HACK',
  'PARASITA_NEURAL',
]);

function putBlocoEsc(buf, w, h, esc, px, py, r, g, b, a) {
  for (let sy = 0; sy < esc; sy += 1) {
    for (let sx = 0; sx < esc; sx += 1) {
      blendPx(buf, w, h, px + sx, py + sy, r, g, b, a);
    }
  }
}

function drawTxtS(buf, w, h, S, x960, y960, texto, cor, pitch = 6) {
  const upper = String(texto ?? '')
    .toUpperCase()
    .replace(/—/g, '-')
    .replace(/→/g, '>')
    .replace(/↔/g, '-');
  const [r, g, b, a] = cor;
  const esc = Math.max(1, Math.round(S));
  for (let i = 0; i < upper.length; i += 1) {
    const chOrig = upper[i];
    if (chOrig === ' ') continue;
    const ac = ACENTOS_5X7[chOrig] ?? null;
    const chBase = ac
      ? ac[0]
      : chOrig.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const glifo = FONTE_5X7[chBase];
    if (!glifo) continue;
    const ox = Math.round((x960 + i * pitch) * S);
    const oy = Math.round(y960 * S);
    for (let gy = 0; gy < 7; gy += 1) {
      const bits = glifo[gy];
      for (let gx = 0; gx < 5; gx += 1) {
        if ((bits >> (4 - gx)) & 1) {
          putBlocoEsc(buf, w, h, esc, ox + gx * esc, oy + gy * esc, r, g, b, a);
        }
      }
    }
    if (ac) {
      const tipo = ac[1];
      const cx = ox + 2 * esc;
      if (tipo === 'agudo') {
        putBlocoEsc(buf, w, h, esc, cx, oy - 2 * esc, r, g, b, a);
        putBlocoEsc(buf, w, h, esc, cx + esc, oy - 3 * esc, r, g, b, a);
      } else if (tipo === 'grave') {
        putBlocoEsc(buf, w, h, esc, cx - esc, oy - 3 * esc, r, g, b, a);
        putBlocoEsc(buf, w, h, esc, cx, oy - 2 * esc, r, g, b, a);
      } else if (tipo === 'circ') {
        putBlocoEsc(buf, w, h, esc, cx - esc, oy - 2 * esc, r, g, b, a);
        putBlocoEsc(buf, w, h, esc, cx, oy - 3 * esc, r, g, b, a);
        putBlocoEsc(buf, w, h, esc, cx + esc, oy - 2 * esc, r, g, b, a);
      } else if (tipo === 'til') {
        putBlocoEsc(buf, w, h, esc, cx - 2 * esc, oy - 2 * esc, r, g, b, a);
        putBlocoEsc(buf, w, h, esc, cx - esc, oy - 3 * esc, r, g, b, a);
        putBlocoEsc(buf, w, h, esc, cx, oy - 2 * esc, r, g, b, a);
        putBlocoEsc(buf, w, h, esc, cx + esc, oy - 3 * esc, r, g, b, a);
      } else if (tipo === 'cedil') {
        putBlocoEsc(buf, w, h, esc, cx, oy + 7 * esc, r, g, b, a);
        putBlocoEsc(buf, w, h, esc, cx, oy + 8 * esc, r, g, b, a);
        putBlocoEsc(buf, w, h, esc, cx - esc, oy + 8 * esc, r, g, b, a);
      }
    }
  }
}

function drawTxtHeader2xS(buf, w, h, S, x960, y960, texto, corPrincipal, pitch = 11) {
  const upper = String(texto ?? '')
    .toUpperCase()
    .replace(/—/g, '-')
    .replace(/→/g, '>')
    .replace(/↔/g, '-');
  const [r, g, b, a] = corPrincipal;
  const rHi = Math.min(255, r + 34);
  const gHi = Math.min(255, g + 34);
  const bHi = Math.min(255, b + 28);
  const esc = Math.max(2, Math.round(S * 2));
  for (let i = 0; i < upper.length; i += 1) {
    const chOrig = upper[i];
    if (chOrig === ' ') continue;
    const ac = ACENTOS_5X7[chOrig] ?? null;
    const chBase = ac
      ? ac[0]
      : chOrig.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const glifo = FONTE_5X7[chBase];
    if (!glifo) continue;
    const ox = Math.round((x960 + i * pitch) * S);
    const oy = Math.round(y960 * S);
    for (let gy = 0; gy < 7; gy += 1) {
      const bits = glifo[gy];
      for (let gx = 0; gx < 5; gx += 1) {
        if ((bits >> (4 - gx)) & 1) {
          putBlocoEsc(buf, w, h, esc, ox + gx * esc + 1, oy + gy * esc + 1, 4, 10, 18, 225);
          if (gy <= 1) {
            putBlocoEsc(buf, w, h, esc, ox + gx * esc, oy + gy * esc, rHi, gHi, bHi, a);
          } else {
            putBlocoEsc(buf, w, h, esc, ox + gx * esc, oy + gy * esc, r, g, b, a);
          }
        }
      }
    }
    if (ac) {
      const cx = ox + 2 * esc;
      putBlocoEsc(buf, w, h, Math.max(1, esc >> 1), cx, oy - esc, rHi, gHi, bHi, a);
      putBlocoEsc(buf, w, h, Math.max(1, esc >> 1), cx + Math.max(1, esc >> 1), oy - Math.round(esc * 1.5), rHi, gHi, bHi, a);
    }
  }
}

/**
 * Retorna os hitboxes extras na grade 960x540 para os Controles do Hangar Steam,
 * Modal de Opções (incluindo 8 linhas clicáveis de rebind de teclas!), Galeria de Conquistas e Spotlight do Tutorial.
 */
export function obterHitboxesModaisEControlesSteam(viewModel) {
  if (!viewModel || typeof viewModel !== 'object') return Object.freeze([]);
  const fase = viewModel.faseJogo ?? 'COMBATE';
  const modalSteam = viewModel.modalSteamAtivo ?? null;
  const tutorial = viewModel.tutorialSteam ?? null;
  const hitboxes = [];

  if (modalSteam === 'OPCOES') {
    hitboxes.push(
      { idHitbox: 'STEAM_OPT_VOL_MASTER_MENOS', tipo: 'MODAL_STEAM', x: 460, y: 112, largura: 28, altura: 22, metadados: { acaoSteam: 'AJUSTAR_VOLUME', canal: 'volumeMaster', delta: -10 } },
      { idHitbox: 'STEAM_OPT_BARRA_VOL_MASTER', tipo: 'MODAL_STEAM', x: 496, y: 112, largura: 152, altura: 22, metadados: { acaoSteam: 'DEFINIR_VOLUME_DIRETO', canal: 'volumeMaster', barraX: 496, barraLargura: 152 } },
      { idHitbox: 'STEAM_OPT_VOL_MASTER_MAIS', tipo: 'MODAL_STEAM', x: 656, y: 112, largura: 28, altura: 22, metadados: { acaoSteam: 'AJUSTAR_VOLUME', canal: 'volumeMaster', delta: 10 } },
      { idHitbox: 'STEAM_OPT_VOL_MUSICA_MENOS', tipo: 'MODAL_STEAM', x: 460, y: 146, largura: 28, altura: 22, metadados: { acaoSteam: 'AJUSTAR_VOLUME', canal: 'volumeMusica', delta: -10 } },
      { idHitbox: 'STEAM_OPT_BARRA_VOL_MUSICA', tipo: 'MODAL_STEAM', x: 496, y: 146, largura: 152, altura: 22, metadados: { acaoSteam: 'DEFINIR_VOLUME_DIRETO', canal: 'volumeMusica', barraX: 496, barraLargura: 152 } },
      { idHitbox: 'STEAM_OPT_VOL_MUSICA_MAIS', tipo: 'MODAL_STEAM', x: 656, y: 146, largura: 28, altura: 22, metadados: { acaoSteam: 'AJUSTAR_VOLUME', canal: 'volumeMusica', delta: 10 } },
      { idHitbox: 'STEAM_OPT_VOL_SFX_MENOS', tipo: 'MODAL_STEAM', x: 460, y: 180, largura: 28, altura: 22, metadados: { acaoSteam: 'AJUSTAR_VOLUME', canal: 'volumeSfx', delta: -10 } },
      { idHitbox: 'STEAM_OPT_BARRA_VOL_SFX', tipo: 'MODAL_STEAM', x: 496, y: 180, largura: 152, altura: 22, metadados: { acaoSteam: 'DEFINIR_VOLUME_DIRETO', canal: 'volumeSfx', barraX: 496, barraLargura: 152 } },
      { idHitbox: 'STEAM_OPT_VOL_SFX_MAIS', tipo: 'MODAL_STEAM', x: 656, y: 180, largura: 28, altura: 22, metadados: { acaoSteam: 'AJUSTAR_VOLUME', canal: 'volumeSfx', delta: 10 } },
      { idHitbox: 'STEAM_OPT_TELA_CHEIA', tipo: 'MODAL_STEAM', x: 460, y: 218, largura: 140, altura: 24, metadados: { acaoSteam: 'ALTERNAR_TELA_CHEIA' } },
      { idHitbox: 'STEAM_OPT_ESCALA_PIXEL', tipo: 'MODAL_STEAM', x: 612, y: 218, largura: 176, altura: 24, metadados: { acaoSteam: 'CICLAR_ESCALA_PIXEL' } },
      { idHitbox: 'STEAM_OPT_SCREEN_SHAKE', tipo: 'MODAL_STEAM', x: 460, y: 252, largura: 140, altura: 24, metadados: { acaoSteam: 'ALTERNAR_SCREEN_SHAKE' } },
      { idHitbox: 'STEAM_OPT_REDUZIR_MOV', tipo: 'MODAL_STEAM', x: 612, y: 252, largura: 176, altura: 24, metadados: { acaoSteam: 'ALTERNAR_REDUZIR_MOVIMENTO' } },
      { idHitbox: 'STEAM_OPT_IDIOMA', tipo: 'MODAL_STEAM', x: 460, y: 286, largura: 328, altura: 24, metadados: { acaoSteam: 'ALTERNAR_IDIOMA' } }
    );
    for (let i = 0; i < ORDEM_ATALHOS_MODAL_OPCOES.length; i += 1) {
      const acaoId = ORDEM_ATALHOS_MODAL_OPCOES[i];
      const col = i % 3;
      const lin = Math.floor(i / 3);
      hitboxes.push({
        idHitbox: `STEAM_OPT_REBIND_${acaoId}`,
        tipo: 'MODAL_STEAM',
        x: 160 + col * 212,
        y: 346 + lin * 22,
        largura: 204,
        altura: 18,
        metadados: { acaoSteam: 'INICIAR_REMAPEAR_TECLA', acaoId },
      });
    }
    hitboxes.push(
      {
        idHitbox: 'STEAM_OPT_RESTAURAR_ATALHOS',
        tipo: 'MODAL_STEAM',
        x: 224,
        y: 446,
        largura: 244,
        altura: 30,
        metadados: { acaoSteam: 'RESTAURAR_PADROES_OPCOES' },
      },
      {
        idHitbox: 'STEAM_OPT_FECHAR',
        tipo: 'MODAL_STEAM',
        x: 484,
        y: 446,
        largura: 168,
        altura: 30,
        metadados: { acaoSteam: 'FECHAR_MODAL_STEAM' },
      }
    );
    return Object.freeze(hitboxes);
  }

  if (modalSteam === 'CONQUISTAS') {
    const listaAchHb = obterCatalogo24ConquistasSteam();
    for (let i = 0; i < listaAchHb.length; i += 1) {
      const col = i % 3;
      const lin = Math.floor(i / 3);
      hitboxes.push({
        idHitbox: `STEAM_CONQ_CARD_${i}`,
        tipo: 'MODAL_STEAM',
        x: 48 + col * 292,
        y: 66 + lin * 44,
        largura: 280,
        altura: 39,
        metadados: { acaoSteam: 'INSPECIONAR_CONQUISTA', conquistaId: listaAchHb[i].id, indice: i },
      });
    }
    hitboxes.push({
      idHitbox: 'STEAM_CONQ_FECHAR',
      tipo: 'MODAL_STEAM',
      x: 404,
      y: 472,
      largura: 152,
      altura: 28,
      metadados: { acaoSteam: 'FECHAR_MODAL_STEAM' },
    });
    return Object.freeze(hitboxes);
  }

  if (fase === 'INICIO') {
    hitboxes.push(
      { idHitbox: 'HANGAR_STEAM_IDIOMA', tipo: 'CONTROLE_CAMPANHA', x: 540, y: 10, largura: 104, altura: 22, metadados: { acaoSteam: 'ALTERNAR_IDIOMA' } },
      { idHitbox: 'HANGAR_STEAM_CONQUISTAS', tipo: 'CONTROLE_CAMPANHA', x: 652, y: 10, largura: 112, altura: 22, metadados: { acaoSteam: 'ABRIR_CONQUISTAS' } },
      { idHitbox: 'HANGAR_STEAM_OPCOES', tipo: 'CONTROLE_CAMPANHA', x: 772, y: 10, largura: 108, altura: 22, metadados: { acaoSteam: 'ABRIR_OPCOES' } },
      { idHitbox: 'HANGAR_STEAM_VARIANTE_AB', tipo: 'CONTROLE_CAMPANHA', x: 24, y: 444, largura: 102, altura: 42, metadados: { acaoSteam: 'ALTERNAR_VARIANTE_AB' } },
      { idHitbox: 'HANGAR_STEAM_DIFICULDADE', tipo: 'CONTROLE_CAMPANHA', x: 132, y: 444, largura: 104, altura: 42, metadados: { acaoSteam: 'CICLAR_DIFICULDADE' } },
      { idHitbox: 'HANGAR_STEAM_TUTORIAL', tipo: 'CONTROLE_CAMPANHA', x: 726, y: 444, largura: 210, altura: 42, metadados: { acaoSteam: 'INICIAR_TUTORIAL_GUIADO' } }
    );
  } else if (fase === 'COMBATE' && !viewModel.modalCampanhaAtivo && viewModel.edicaoComercialSteam) {
    hitboxes.push(
      { idHitbox: 'STEAM_BTN_SALVAR_POSTOS', tipo: 'CONTROLE_CAMPANHA', x: 158, y: 45, largura: 66, altura: 18, metadados: { acaoSteam: 'SALVAR_POSTOS_TRIPULACAO' } },
      { idHitbox: 'STEAM_BTN_RETORNAR_POSTOS', tipo: 'CONTROLE_CAMPANHA', x: 228, y: 45, largura: 68, altura: 18, metadados: { acaoSteam: 'RETORNAR_POSTOS_TRIPULACAO' } }
    );
    const subTat = viewModel.subsistemasTaticosSteam ?? {};
    if (subTat.sondaSabotagem) {
      hitboxes.push({
        idHitbox: 'STEAM_BTN_SONDA_HACK',
        tipo: 'CONTROLE_CAMPANHA',
        x: 300,
        y: 45,
        largura: 72,
        altura: 18,
        metadados: { acaoSteam: 'ACIONAR_SONDA_SABOTAGEM' },
      });
    }
    if (subTat.parasitaNeural) {
      hitboxes.push({
        idHitbox: 'STEAM_BTN_PARASITA_NEURAL',
        tipo: 'CONTROLE_CAMPANHA',
        x: 158,
        y: 66,
        largura: 78,
        altura: 18,
        metadados: { acaoSteam: 'ACIONAR_PARASITA_NEURAL' },
      });
    }
  }

  const etapaTut = obterEtapaAtualTutorialSteam(tutorial);
  if (etapaTut) {
    const cx = etapaTut.caixaCallout960.x;
    const cy = etapaTut.caixaCallout960.y;
    const cw = etapaTut.caixaCallout960.w;
    const ch = etapaTut.caixaCallout960.h;
    hitboxes.push(
      { idHitbox: 'TUTORIAL_BTN_AVANCAR', tipo: 'CONTROLE_TUTORIAL', x: cx + cw - 236, y: cy + ch - 28, largura: 118, altura: 22, metadados: { acaoSteam: 'TUTORIAL_AVANCAR' } },
      { idHitbox: 'TUTORIAL_BTN_PULAR', tipo: 'CONTROLE_TUTORIAL', x: cx + cw - 110, y: cy + ch - 28, largura: 100, altura: 22, metadados: { acaoSteam: 'TUTORIAL_PULAR' } }
    );
  }

  return Object.freeze(hitboxes);
}

/**
 * Renderiza os esfíncteres orgânicos reais (`grafoAdjacencia`), anteparas seladas
 * onde câmaras vizinhas não se comunicam, e bio-dutos curvos (`dutosEspeciais`)!
 */
export function rasterizarTopologiaConectoresNaveRgba(buf, largura, altura, viewModel, opcoes = {}) {
  const S = Math.max(1, Number(opcoes.escala ?? 1));
  const layoutId = viewModel?.layoutId ?? viewModel?.nave?.layoutId ?? 'CARCACA_ALFA_A';
  const ehTouchdown = (viewModel?.barraSuperior?.estadoFisico ?? '1_NO_FOIL') !== '1_NO_FOIL';
  const ehMonstroAlvo = String(viewModel?.painelAlvo?.classeAlvo ?? '').includes('MONSTRO');
  const layout = resolverLayoutTopologiaNave(layoutId);
  const usarGradeClassica2x4 =
    !viewModel?.edicaoComercialSteam && (!viewModel?.layoutId || viewModel?.layoutId === 'CARCACA_ALFA_A');
  const moldado = calcularRetangulosCamarasMoldadas960({
    idArquitetura: layout.idArquitetura,
    varianteLayout: layout.variante,
    ehTouchdown,
    ehMonstroAlvo,
    modoClassico2x4: usarGradeClassica2x4,
  });
  const deslY = Number(opcoes.deslocamentoVerticalPx ?? 0);
  const rets = Object.values(moldado.camaras).map((r) => (deslY !== 0 ? { ...r, y: r.y + deslY } : r));
  const mapaR = new Map(rets.map((r) => [r.camaraId, r]));

  // Membrana Quitino-Orgânica de Corte Anatômico (Edição Comercial Steam):
  // envolve o perímetro externo das 8 câmaras moldadas com costelas bio-estruturais e vasos bioluminescentes
  if (viewModel?.edicaoComercialSteam === true && rets.length >= 4) {
    const paletaMembrana = {
      CARCACA_ALFA: { base: [42, 24, 30, 210], borda: [98, 56, 62, 232], bio: [78, 224, 242, 215] },
      MANTA_VOLT: { base: [20, 36, 54, 212], borda: [52, 108, 148, 236], bio: [108, 244, 255, 225] },
      COURACA_LIMIAR: { base: [48, 32, 22, 218], borda: [132, 88, 48, 240], bio: [248, 178, 66, 220] },
      SOMBRA_ABISSAL: { base: [28, 20, 44, 215], borda: [84, 52, 128, 236], bio: [204, 118, 255, 220] },
      COLMEIA_VIVA: { base: [22, 42, 30, 215], borda: [58, 122, 78, 236], bio: [104, 244, 148, 220] },
    }[layout.idArquitetura] ?? { base: [34, 26, 32, 208], borda: [88, 64, 72, 230], bio: [78, 224, 242, 215] };

    for (const r of rets) {
      if (r.coluna === 0) {
        fillRectS(buf, largura, altura, S, r.x - 4, r.y + 3, 4, r.altura - 6, paletaMembrana.base);
        lineS(buf, largura, altura, S, r.x - 4, r.y + 4, r.x - 4, r.y + r.altura - 4, paletaMembrana.borda, 1);
      } else {
        fillRectS(buf, largura, altura, S, r.x + r.largura, r.y + 3, 4, r.altura - 6, paletaMembrana.base);
        lineS(buf, largura, altura, S, r.x + r.largura + 3, r.y + 4, r.x + r.largura + 3, r.y + r.altura - 4, paletaMembrana.borda, 1);
      }
      if (r.andar === 0) {
        fillRectS(buf, largura, altura, S, r.x + 4, r.y - 4, r.largura - 8, 4, paletaMembrana.base);
        lineS(buf, largura, altura, S, r.x + 5, r.y - 4, r.x + r.largura - 5, r.y - 4, paletaMembrana.borda, 1);
        fillRectS(buf, largura, altura, S, r.x + Math.round(r.largura * 0.5) - 3, r.y - 3, 6, 2, paletaMembrana.bio);
      }
      if (r.andar === 3) {
        fillRectS(buf, largura, altura, S, r.x + 4, r.y + r.altura, r.largura - 8, 4, paletaMembrana.base);
        lineS(buf, largura, altura, S, r.x + 5, r.y + r.altura + 3, r.x + r.largura - 5, r.y + r.altura + 3, paletaMembrana.borda, 1);
      }
    }
    // Tecido medular na espinha central entre as duas colunas de câmaras
    const minYEsp = Math.min(...rets.map((r) => r.y)) + 4;
    const maxYEsp = Math.max(...rets.map((r) => r.y + r.altura)) - 4;
    const xEsp0 = Math.max(...rets.filter((r) => r.coluna === 0).map((r) => r.x + r.largura));
    const xEsp1 = Math.min(...rets.filter((r) => r.coluna === 1).map((r) => r.x));
    if (xEsp1 - xEsp0 >= 6) {
      fillRectS(buf, largura, altura, S, xEsp0 + 1, minYEsp, xEsp1 - xEsp0 - 2, maxYEsp - minYEsp, [12, 24, 34, 158]);
      for (let ry = minYEsp + 8; ry < maxYEsp - 4; ry += 14) {
        lineS(buf, largura, altura, S, xEsp0 + 2, ry, xEsp1 - 2, ry, paletaMembrana.borda, 1);
      }
    }
  }

  // Matiz cromático sutil nas bordas quando Variante Tipo B está ativa
  if (layout.variante === 'B') {
    const [tr, tg, tb] = layout.corDestaqueCascoRgba ?? [96, 232, 248, 255];
    for (const r of rets) {
      strokeRectS(buf, largura, altura, S, r.x, r.y, r.largura, r.altura, [tr, tg, tb, 145], 1.5);
    }
  }

  // Canal espinhal central livre entre Coluna 0 e Coluna 1 (nunca cruza o interior das salas!)
  const maxDirCol0 = Math.max(...rets.filter((r) => r.coluna === 0).map((r) => r.x + r.largura));
  const minEsqCol1 = Math.min(...rets.filter((r) => r.coluna === 1).map((r) => r.x));
  const xEspinhaCentral = (maxDirCol0 + minEsqCol1) * 0.5;
  let indiceDutoEspinha = 0;

  // Esfíncteres orgânicos reais (borda-a-borda) e Bio-Dutos Peristálticos no canal espinhal
  for (let a = 1; a <= 8; a += 1) {
    const vizinhos = layout.grafoAdjacencia[a] ?? [];
    const rA = mapaR.get(a);
    if (!rA) continue;

    for (const b of vizinhos) {
      if (b <= a) continue;
      const rB = mapaR.get(b);
      if (!rB) continue;

      const ehDutoEspecial = (layout.dutosEspeciais ?? []).some((d) => {
        const d1 = Array.isArray(d) ? d[0] : d.de;
        const d2 = Array.isArray(d) ? d[1] : d.para;
        return (d1 === a && d2 === b) || (d1 === b && d2 === a);
      });
      const adjHorizontal = rA.andar === rB.andar && rA.coluna !== rB.coluna;
      const adjVertical = rA.coluna === rB.coluna && Math.abs(rA.andar - rB.andar) === 1;

      if (!ehDutoEspecial && adjHorizontal) {
        const rEsq = rA.coluna === 0 ? rA : rB;
        const rDir = rA.coluna === 0 ? rB : rA;
        const x0 = rEsq.x + rEsq.largura;
        const x1 = rDir.x;
        const ySob0 = Math.max(rEsq.y + 12, rDir.y + 12);
        const ySob1 = Math.min(rEsq.y + rEsq.altura - 4, rDir.y + rDir.altura - 4);
        const py = ySob1 > ySob0 ? (ySob0 + ySob1) * 0.5 : (rEsq.y + rEsq.altura * 0.58);
        const pmx = (x0 + x1) * 0.5;
        lineS(buf, largura, altura, S, x0, py, x1, py, [62, 208, 232, 210], 2);
        fillRectS(buf, largura, altura, S, pmx - 4, py - 3, 8, 6, [18, 62, 82, 240]);
        strokeRectS(buf, largura, altura, S, pmx - 4, py - 3, 8, 6, [104, 248, 228, 245], 1);
      } else if (!ehDutoEspecial && adjVertical) {
        const rSup = rA.andar < rB.andar ? rA : rB;
        const rInf = rA.andar < rB.andar ? rB : rA;
        const y0 = rSup.y + rSup.altura;
        const y1 = rInf.y;
        const xSob0 = Math.max(rSup.x + 10, rInf.x + 10);
        const xSob1 = Math.min(rSup.x + rSup.largura - 10, rInf.x + rInf.largura - 10);
        const px = xSob1 > xSob0 ? (xSob0 + xSob1) * 0.5 : (rSup.x + rSup.largura * 0.5);
        const pmy = (y0 + y1) * 0.5;
        lineS(buf, largura, altura, S, px, y0, px, y1, [62, 208, 232, 210], 2);
        fillRectS(buf, largura, altura, S, px - 4, pmy - 2, 8, 5, [18, 62, 82, 240]);
        strokeRectS(buf, largura, altura, S, px - 4, pmy - 2, 8, 5, [104, 248, 228, 245], 1);
      } else {
        // Bio-duto peristáltico roteado em trilhas dedicadas do canal espinhal (esquerda/centro/direita, sem cruzar salas nem anteparas!)
        const pxA = rA.coluna === 0 ? rA.x + rA.largura : rA.x;
        const pyA = rA.y + Math.round(rA.altura * 0.74);
        const pxB = rB.coluna === 0 ? rB.x + rB.largura : rB.x;
        const pyB = rB.y + Math.round(rB.altura * 0.74);
        let xDuto = xEspinhaCentral;
        if (rA.coluna === 0 && rB.coluna === 0) {
          xDuto = Math.min(xEspinhaCentral - 2, maxDirCol0 + 4);
        } else if (rA.coluna === 1 && rB.coluna === 1) {
          xDuto = Math.max(xEspinhaCentral + 2, minEsqCol1 - 4);
        } else {
          const desvioFaixa = (indiceDutoEspinha % 2 === 0 ? -1.5 : 1.5);
          indiceDutoEspinha += 1;
          xDuto = Math.max(maxDirCol0 + 4, Math.min(minEsqCol1 - 4, xEspinhaCentral + desvioFaixa));
        }
        const corDuto = [78, 248, 214, 228];
        lineS(buf, largura, altura, S, pxA, pyA, xDuto, pyA, corDuto, 2);
        lineS(buf, largura, altura, S, xDuto, pyA, xDuto, pyB, corDuto, 2);
        lineS(buf, largura, altura, S, xDuto, pyB, pxB, pyB, corDuto, 2);
        fillRectS(buf, largura, altura, S, pxA - 2, pyA - 2, 5, 5, [22, 86, 92, 245]);
        strokeRectS(buf, largura, altura, S, pxA - 2, pyA - 2, 5, 5, [142, 255, 228, 250], 1);
        fillRectS(buf, largura, altura, S, pxB - 2, pyB - 2, 5, 5, [22, 86, 92, 245]);
        strokeRectS(buf, largura, altura, S, pxB - 2, pyB - 2, 5, 5, [142, 255, 228, 250], 1);
      }
    }
  }

  // Anteparas seladas calcificadas nas paredes internas onde NÃO há porta em `grafoAdjacencia` (0 colisão com dutos espinhais!)
  const paresGradeOrtogonais = [
    [1, 7], [2, 3], [4, 5], [6, 8],
    [1, 2], [2, 4], [4, 6],
    [7, 3], [3, 5], [5, 8],
  ];
  for (const [a, b] of paresGradeOrtogonais) {
    if ((layout.grafoAdjacencia[a] ?? []).includes(b)) continue;
    const rA = mapaR.get(a);
    const rB = mapaR.get(b);
    if (!rA || !rB) continue;
    if (rA.andar === rB.andar) {
      const rEsq = rA.coluna === 0 ? rA : rB;
      const rDir = rA.coluna === 0 ? rB : rA;
      const yEsq = rEsq.y + Math.round(rEsq.altura * 0.38);
      const yDir = rDir.y + Math.round(rDir.altura * 0.38);
      fillRectS(buf, largura, altura, S, rEsq.x + rEsq.largura - 1, yEsq - 4, 4, 8, [96, 26, 26, 244]);
      strokeRectS(buf, largura, altura, S, rEsq.x + rEsq.largura - 1, yEsq - 4, 4, 8, [252, 114, 82, 248], 1);
      fillRectS(buf, largura, altura, S, rDir.x - 3, yDir - 4, 4, 8, [96, 26, 26, 244]);
      strokeRectS(buf, largura, altura, S, rDir.x - 3, yDir - 4, 4, 8, [252, 114, 82, 248], 1);
    } else {
      const rSup = rA.andar < rB.andar ? rA : rB;
      const rInf = rA.andar < rB.andar ? rB : rA;
      const mx = (Math.max(rSup.x, rInf.x) + Math.min(rSup.x + rSup.largura, rInf.x + rInf.largura)) * 0.5;
      const my = (rSup.y + rSup.altura + rInf.y) * 0.5;
      fillRectS(buf, largura, altura, S, mx - 5, my - 2, 10, 5, [82, 24, 24, 238]);
      strokeRectS(buf, largura, altura, S, mx - 5, my - 2, 10, 5, [248, 108, 76, 245], 1);
    }
  }
}

export function rasterizarBarraControlesHangarSteamRgba(buf, largura, altura, viewModel, opcoes = {}) {
  const S = Math.max(1, Number(opcoes.escala ?? 1));
  const idioma = normalizarIdiomaSteam(opcoes.idioma ?? viewModel?.configuracoesSteam?.idioma);
  const variante = viewModel?.hangarResumo?.varianteSelecionada === 'B' ? 'B' : 'A';
  const difCfg = obterConfiguracaoDificuldadeSteam(viewModel?.hangarResumo?.dificuldadeSelecionada ?? 'NORMAL');
  const qtdConq = (viewModel?.conquistasDesbloqueadas ?? []).length;
  const arqId = viewModel?.hangarResumo?.arquiteturaSelecionadaId ?? 'CARCACA_ALFA';
  const tipoBLiberado = verificarLayoutTipoBDesbloqueado(`${arqId}_B`, {
    conquistasDesbloqueadas: viewModel?.conquistasDesbloqueadas ?? [],
    layoutsDesbloqueados: viewModel?.layoutsTipoBDesbloqueados ?? [],
  });

  // Botões superiores (Idioma, Conquistas, Opções)
  const botoesTopo = [
    { x: 540, y: 10, w: 104, h: 22, txt: idioma === 'en-US' ? 'EN-US [L]' : 'PT-BR [L]', cor: [84, 226, 255, 240] },
    { x: 652, y: 10, w: 112, h: 22, txt: `${idioma === 'en-US' ? 'ACHV' : 'TROF'} ${qtdConq}/24 [J]`, cor: [255, 214, 92, 240] },
    { x: 772, y: 10, w: 108, h: 22, txt: idioma === 'en-US' ? 'OPTIONS [O]' : 'OPÇÕES [O]', cor: [152, 242, 198, 240] },
  ];
  for (const bt of botoesTopo) {
    fillRectS(buf, largura, altura, S, bt.x, bt.y, bt.w, bt.h, [10, 24, 36, 235]);
    strokeRectS(buf, largura, altura, S, bt.x, bt.y, bt.w, bt.h, bt.cor, 1);
    drawTxtS(buf, largura, altura, S, bt.x + 8, bt.y + 7, bt.txt, bt.cor, 6);
  }

  // Botão Inferior Esquerdo 1: Variante Topológica [A/B]
  const corVar = variante === 'B'
    ? (tipoBLiberado ? [255, 196, 82, 245] : [232, 92, 82, 235])
    : [84, 236, 212, 245];
  fillRectS(buf, largura, altura, S, 24, 444, 102, 42, [10, 22, 34, 238]);
  strokeRectS(buf, largura, altura, S, 24, 444, 102, 42, corVar, 1.5);
  drawTxtS(buf, largura, altura, S, 32, 452, `${idioma === 'en-US' ? 'TYPE' : 'TIPO'} ${variante} [B]`, corVar, 6);
  drawTxtS(
    buf,
    largura,
    altura,
    S,
    32,
    468,
    variante === 'B' && !tipoBLiberado ? (idioma === 'en-US' ? 'LOCKED' : 'BLOQUEADO') : (idioma === 'en-US' ? 'TOPOLOGY' : 'TOPOLOGIA'),
    [192, 222, 238, 230],
    6
  );

  // Botão Inferior Esquerdo 2: Dificuldade [F]
  const corDif = difCfg.id === 'DIFICIL' ? [255, 108, 92, 245] : difCfg.id === 'FACIL' ? [116, 244, 156, 245] : [96, 222, 255, 245];
  fillRectS(buf, largura, altura, S, 132, 444, 104, 42, [10, 22, 34, 238]);
  strokeRectS(buf, largura, altura, S, 132, 444, 104, 42, corDif, 1.5);
  drawTxtS(buf, largura, altura, S, 140, 452, idioma === 'en-US' ? 'DIFF [F]' : 'DIFIC [F]', [190, 218, 234, 230], 6);
  drawTxtS(buf, largura, altura, S, 140, 468, idioma === 'en-US' ? difCfg.curtoEn : difCfg.curtoPt, corDif, 6);

  // Botão Inferior Direito: Tutorial Guiado [T]
  fillRectS(buf, largura, altura, S, 726, 444, 210, 42, [12, 32, 42, 240]);
  strokeRectS(buf, largura, altura, S, 726, 444, 210, 42, [112, 248, 206, 245], 1.5);
  drawTxtS(buf, largura, altura, S, 740, 452, idioma === 'en-US' ? 'GUIDED TUTORIAL [T]' : 'TUTORIAL GUIADO [T]', [112, 248, 206, 248], 6);
  drawTxtS(buf, largura, altura, S, 740, 468, idioma === 'en-US' ? '6 HANDS-ON LESSONS' : '6 LIÇÕES PRÁTICAS', [200, 232, 240, 230], 6);
}

export function rasterizarModalOpcoesSteamRgba(buf, largura, altura, viewModel, opcoes = {}) {
  const S = Math.max(1, Number(opcoes.escala ?? 1));
  const cfg = criarConfiguracoesSteam(viewModel?.configuracoesSteam ?? {});
  const idioma = normalizarIdiomaSteam(cfg.idioma);

  fillRectS(buf, largura, altura, S, 0, 0, 960, 540, [4, 10, 16, 198]);
  fillRectS(buf, largura, altura, S, 136, 54, 688, 432, [10, 22, 34, 248]);
  strokeRectS(buf, largura, altura, S, 136, 54, 688, 432, [82, 228, 248, 245], 2);
  strokeRectS(buf, largura, altura, S, 142, 60, 676, 420, [34, 82, 108, 220], 1);

  drawTxtHeader2xS(
    buf,
    largura,
    altura,
    S,
    162,
    68,
    idioma === 'en-US' ? 'OPTIONS & CONTROLS' : 'OPÇÕES & CONTROLES',
    [255, 224, 104, 252],
    11
  );
  drawTxtS(
    buf,
    largura,
    altura,
    S,
    588,
    74,
    idioma === 'en-US' ? 'STEAM 1.0 EDITION' : 'EDIÇÃO STEAM 1.0',
    [108, 236, 250, 235],
    6
  );

  const sliders = [
    { y: 112, rotulo: tUi(idioma, 'OPCOES_VOL_MASTER'), valor: cfg.volumeMaster },
    { y: 146, rotulo: tUi(idioma, 'OPCOES_VOL_MUSICA'), valor: cfg.volumeMusica },
    { y: 180, rotulo: tUi(idioma, 'OPCOES_VOL_SFX'), valor: cfg.volumeSfx },
  ];
  for (const sl of sliders) {
    drawTxtS(buf, largura, altura, S, 164, sl.y + 6, sl.rotulo, [216, 240, 250, 245], 6);
    fillRectS(buf, largura, altura, S, 460, sl.y, 28, 22, [20, 44, 64, 240]);
    strokeRectS(buf, largura, altura, S, 460, sl.y, 28, 22, [88, 214, 242, 230], 1);
    drawTxtS(buf, largura, altura, S, 471, sl.y + 7, '-', [255, 255, 255, 245], 6);

    fillRectS(buf, largura, altura, S, 496, sl.y + 4, 152, 14, [16, 32, 46, 245]);
    strokeRectS(buf, largura, altura, S, 496, sl.y + 4, 152, 14, [52, 118, 146, 220], 1);
    const wBarra = Math.round((sl.valor / 100) * 148);
    fillRectS(buf, largura, altura, S, 498, sl.y + 6, wBarra, 10, [82, 238, 204, 245]);
    const xPino = Math.max(497, Math.min(643, 498 + wBarra - 2));
    fillRectS(buf, largura, altura, S, xPino, sl.y + 3, 4, 16, [255, 234, 128, 250]);

    fillRectS(buf, largura, altura, S, 656, sl.y, 28, 22, [20, 44, 64, 240]);
    strokeRectS(buf, largura, altura, S, 656, sl.y, 28, 22, [88, 214, 242, 230], 1);
    drawTxtS(buf, largura, altura, S, 667, sl.y + 7, '+', [255, 255, 255, 245], 6);
    drawTxtS(buf, largura, altura, S, 696, sl.y + 6, `${sl.valor}%`, [255, 226, 118, 245], 6);
  }

  // Toggles de Vídeo, Acessibilidade e Idioma
  const enOpt = idioma === 'en-US';
  drawTxtS(buf, largura, altura, S, 164, 224, tUi(idioma, 'OPCOES_TELA_CHEIA'), [216, 240, 250, 245], 6);
  fillRectS(buf, largura, altura, S, 460, 218, 140, 24, [18, 38, 56, 245]);
  strokeRectS(buf, largura, altura, S, 460, 218, 140, 24, [88, 224, 248, 235], 1);
  drawTxtS(
    buf,
    largura,
    altura,
    S,
    472,
    226,
    enOpt ? (cfg.telaCheia ? 'FULLSCREEN: ON' : 'FULLSCREEN: OFF') : (cfg.telaCheia ? 'TELA CHEIA: ON' : 'TELA CHEIA: OFF'),
    [132, 248, 206, 245],
    6
  );

  fillRectS(buf, largura, altura, S, 612, 218, 176, 24, [18, 38, 56, 245]);
  strokeRectS(buf, largura, altura, S, 612, 218, 176, 24, [88, 224, 248, 235], 1);
  drawTxtS(buf, largura, altura, S, 624, 226, `${enOpt ? 'SCALE' : 'ESCALA'}: ${cfg.escalaPixel}`, [255, 224, 112, 245], 6);

  drawTxtS(buf, largura, altura, S, 164, 258, tUi(idioma, 'OPCOES_SHAKE'), [216, 240, 250, 245], 6);
  fillRectS(buf, largura, altura, S, 460, 252, 140, 24, [18, 38, 56, 245]);
  strokeRectS(buf, largura, altura, S, 460, 252, 140, 24, [88, 224, 248, 235], 1);
  drawTxtS(
    buf,
    largura,
    altura,
    S,
    472,
    260,
    enOpt ? (cfg.screenShakeAtivo ? 'SHAKE: ON' : 'SHAKE: OFF') : (cfg.screenShakeAtivo ? 'TREMOR: ON' : 'TREMOR: OFF'),
    [132, 248, 206, 245],
    6
  );

  fillRectS(buf, largura, altura, S, 612, 252, 176, 24, [18, 38, 56, 245]);
  strokeRectS(buf, largura, altura, S, 612, 252, 176, 24, [88, 224, 248, 235], 1);
  drawTxtS(
    buf,
    largura,
    altura,
    S,
    624,
    260,
    enOpt
      ? (cfg.reduzirMovimento ? 'MOTION: REDUCED' : 'MOTION: FULL 60FPS')
      : (cfg.reduzirMovimento ? 'PARTÍCULAS: LEVE' : 'PARTÍCULAS: 60FPS'),
    [216, 240, 250, 245],
    6
  );

  drawTxtS(buf, largura, altura, S, 164, 292, tUi(idioma, 'OPCOES_IDIOMA'), [216, 240, 250, 245], 6);
  fillRectS(buf, largura, altura, S, 460, 286, 328, 24, [20, 46, 66, 245]);
  strokeRectS(buf, largura, altura, S, 460, 286, 328, 24, [255, 214, 96, 245], 1);
  drawTxtS(buf, largura, altura, S, 474, 294, enOpt ? 'ENGLISH (EN-US) - CLICK TO SWITCH' : 'PORTUGUÊS (PT-BR) - CLIQUE P/ TROCAR', [255, 224, 112, 248], 6);

  // Resumo dos Atalhos Customizáveis clicáveis com nomes humanos limpos
  const rotulosAcao = enOpt
    ? {
        PAUSAR_TATICO: 'PAUSE',
        MERGULHO_TATICO: '400HZ DIVE',
        DRENAR_VALVULAS: 'SAFE DRAIN',
        SALVA_MANUAL: 'VOLLEY',
        ARMA_SLOT_1: 'WEAPON 1',
        ARMA_SLOT_2: 'WEAPON 2',
        ARMA_SLOT_3: 'WEAPON 3',
        ARMA_SLOT_4: 'WEAPON 4',
        SALVAR_POSTOS: 'SAVE STAT.',
        RETORNAR_POSTOS: 'TO STATIONS',
        SONDA_HACK: 'HACK PROBE',
        PARASITA_NEURAL: 'NEURO SPORE',
        ALTERNAR_IDIOMA: 'LANGUAGE',
        ABRIR_OPCOES: 'OPTIONS',
        ABRIR_CONQUISTAS: 'ACHIEVEMENTS',
      }
    : {
        PAUSAR_TATICO: 'PAUSA TÁTICA',
        MERGULHO_TATICO: 'MERGULHO',
        DRENAR_VALVULAS: 'DRENO SEG.',
        SALVA_MANUAL: 'SALVA MAN.',
        ARMA_SLOT_1: 'ARMA 1',
        ARMA_SLOT_2: 'ARMA 2',
        ARMA_SLOT_3: 'ARMA 3',
        ARMA_SLOT_4: 'ARMA 4',
        SALVAR_POSTOS: 'SALV. POSTO',
        RETORNAR_POSTOS: 'IR POSTOS',
        SONDA_HACK: 'SONDA HACK',
        PARASITA_NEURAL: 'NEURO ESP.',
        ALTERNAR_IDIOMA: 'TROCAR IDIOMA',
        ABRIR_OPCOES: 'MENU OPÇÕES',
        ABRIR_CONQUISTAS: 'CONQUISTAS',
      };
  const formatarTeclaCurta = (cod) => {
    const s = String(cod ?? '').trim();
    if (s === 'Space') return enOpt ? 'SPC' : 'ESP';
    if (s.startsWith('Key')) return s.slice(3).toUpperCase();
    if (s.startsWith('Digit')) return s.slice(5);
    return s.toUpperCase().slice(0, 5);
  };
  const cabAtalhos = enOpt
    ? 'HOTKEYS — CLICK ANY CELL TO REBIND (12 TACTICAL BINDINGS)'
    : 'ATALHOS DE TECLADO — CLIQUE NUMA CÉLULA P/ REMAPEAR (12 AÇÕES)';
  drawTxtS(buf, largura, altura, S, 160, 326, cabAtalhos, [126, 236, 255, 245], 6);
  const rebindAtivo = viewModel?.aguardandoRebindAcao ?? null;
  for (let i = 0; i < ORDEM_ATALHOS_MODAL_OPCOES.length; i += 1) {
    const acao = ORDEM_ATALHOS_MODAL_OPCOES[i];
    const cod = cfg.atalhosTeclado[acao] ?? '';
    const col = i % 3;
    const lin = Math.floor(i / 3);
    const kx = 160 + col * 212;
    const ky = 346 + lin * 22;
    const escutando = rebindAtivo === acao;
    fillRectS(buf, largura, altura, S, kx, ky, 204, 18, escutando ? [54, 42, 16, 248] : [14, 30, 44, 235]);
    strokeRectS(buf, largura, altura, S, kx, ky, 204, 18, escutando ? [255, 224, 96, 250] : [42, 86, 114, 210], 1);
    const nomeHum = rotulosAcao[acao] ?? acao;
    const valTxt = escutando
      ? (enOpt ? '[PRESS KEY]' : '[NOVA TECLA]')
      : `[${formatarTeclaCurta(cod)}]`;
    drawTxtS(
      buf,
      largura,
      altura,
      S,
      kx + 6,
      ky + 5,
      `${nomeHum}: ${valTxt}`.slice(0, 32),
      escutando ? [255, 232, 112, 250] : [204, 234, 246, 242],
      6
    );
  }

  fillRectS(buf, largura, altura, S, 224, 446, 244, 30, [36, 30, 18, 246]);
  strokeRectS(buf, largura, altura, S, 224, 446, 244, 30, [255, 204, 92, 245], 1.5);
  drawTxtS(
    buf,
    largura,
    altura,
    S,
    244,
    457,
    enOpt ? 'RESTORE DEFAULTS' : 'RESTAURAR PADRÕES',
    [255, 226, 118, 250],
    6
  );

  fillRectS(buf, largura, altura, S, 484, 446, 168, 30, [24, 58, 76, 248]);
  strokeRectS(buf, largura, altura, S, 484, 446, 168, 30, [112, 248, 206, 248], 1.5);
  drawTxtS(buf, largura, altura, S, 518, 457, tUi(idioma, 'OPCOES_FECHAR'), [255, 255, 255, 250], 6);
}

const RESUMO_REQ_CONQUISTA = Object.freeze({
  ACH_CARCACA_1_FOIL_PURO: { pt: 'ALFA: VENCER SEM TOUCHDOWN (+B)', en: 'ALPHA: WIN WITH 0 TOUCHDOWNS (+B)' },
  ACH_CARCACA_2_DRENAGEM_LAMPEJO: { pt: 'ALFA: DRENAR >80KG NUMA LUTA (+B)', en: 'ALPHA: DRAIN >80KG IN 1 FIGHT (+B)' },
  ACH_MANTA_1_BLACKOUT_TOTAL: { pt: 'MANTA: IONIZAR 2+ SISTEMAS (+B)', en: 'MANTA: IONIZE 2+ SYSTEMS (+B)' },
  ACH_MANTA_2_SEM_ESCUDO_ATE_S5: { pt: 'MANTA: SETOR 5 C/ CASCO >70% (+B)', en: 'MANTA: SECTOR 5 AT >70% HULL (+B)' },
  ACH_COURACA_1_ARIETE_PESADO: { pt: 'COURAÇA: VENCER EM TD S/ BAIXA (+B)', en: 'SHELL: WIN IN TD, 0 DEATHS (+B)' },
  ACH_COURACA_2_FORTALEZA_BLINDADA: { pt: 'COURAÇA: DEFLETIR/ABS 5+ TIROS (+B)', en: 'SHELL: ABSORB/DEFLECT 5+ SHOTS (+B)' },
  ACH_SOMBRA_1_FANTASMA_TERMAL: { pt: 'SOMBRA: FEIXE SOB TINTA ATIVA (+B)', en: 'SHADOW: BEAM UNDER INK CLOAK (+B)' },
  ACH_SOMBRA_2_PREDADOR_CIRURGICO: { pt: 'SOMBRA: LUTA C/ 0 DANO CASCO (+B)', en: 'SHADOW: WIN TAKING 0 HULL DMG (+B)' },
  ACH_COLMEIA_1_QUATRO_ESPECIES: { pt: 'COLMEIA: 4 ESPÉCIES VIVAS (+B)', en: 'HIVE: 4 SPECIES ALIVE ABOARD (+B)' },
  ACH_COLMEIA_2_ABORDAGEM_OSMOTICA: { pt: 'COLMEIA: CAPTURA INTACTA (+B)', en: 'HIVE: INTACT CAPTURE VICTORY (+B)' },
  ACH_GLOBAL_PRIMEIRO_SALTO: { pt: 'FAZER 1 SALTO NA CARTA', en: 'FIRST JUMP ON SECTOR CHART' },
  ACH_GLOBAL_CAPTURA_INTACTA: { pt: 'VENCER POR CAPTURA INTACTA (+40%)', en: 'WIN VIA INTACT CAPTURE (+40%)' },
  ACH_GLOBAL_MERGULHO_EVASAO: { pt: 'MERGULHAR 400HZ SOB FOGO E SUBIR', en: '400HZ DIVE UNDER FIRE & RE-FOIL' },
  ACH_GLOBAL_BLUE_OPTION: { pt: 'USAR 3+ OPÇÕES AZUIS NA RUN', en: 'RESOLVE 3+ BLUE OPTIONS IN RUN' },
  ACH_GLOBAL_QUEST_COMPLETA: { pt: 'CONCLUIR MISSÃO [QUEST] NO MAPA', en: 'COMPLETE A [QUEST] CHAIN NODE' },
  ACH_GLOBAL_ARSENAL_4_BOCAS: { pt: 'EQUIPAR 4 ARMAS NA ESPINHA', en: 'EQUIP 4 ACTIVE DORSAL WEAPONS' },
  ACH_GLOBAL_ENXERTO_TRIPLO: { pt: 'PORTAR 3+ ÓRGÃOS SIMBIÓTICOS', en: 'CARRY 3+ SYMBIOTIC ORGANS' },
  ACH_GLOBAL_MESTRE_OFICINA: { pt: 'EVOLUIR 1 SISTEMA AO NÍVEL MÁX', en: 'UPGRADE ANY SYSTEM TO MAX LVL' },
  ACH_GLOBAL_SETOR_5_PROFUNDO: { pt: 'CHEGAR AO SETOR 5 (FOSSA BIO)', en: 'REACH SECTOR 5 (BIO TRENCH)' },
  ACH_GLOBAL_MATADOR_LEVIATA: { pt: 'ABATER LEVIATÃ NOS SETORES 5-8', en: 'SLAY LEVIATHAN IN SECTORS 5-8' },
  ACH_GLOBAL_VITORIA_CARCACA: { pt: 'AFUNDAR AS 3 FASES DA DRAGA S8', en: 'DESTROY ALL 3 DREDGE PHASES S8' },
  ACH_GLOBAL_VITORIA_DIFICIL: { pt: 'VENCER CAMPANHA NO DIFÍCIL', en: 'WIN CAMPAIGN ON HARD MODE' },
  ACH_GLOBAL_FROTA_COMPLETA_AB: { pt: 'LIBERAR TODAS AS 5 NAVES TIPO B', en: 'UNLOCK ALL 5 TYPE-B HULLS' },
  ACH_GLOBAL_TUTORIAL_CONCLUIDO: { pt: 'CONCLUIR AS 6 LIÇÕES DO TUTORIAL', en: 'COMPLETE ALL 6 TUTORIAL STEPS' },
});

export function rasterizarModalConquistasSteamRgba(buf, largura, altura, viewModel, opcoes = {}) {
  const S = Math.max(1, Number(opcoes.escala ?? 1));
  const idioma = normalizarIdiomaSteam(opcoes.idioma ?? viewModel?.configuracoesSteam?.idioma);
  const desbloq = new Set(viewModel?.conquistasDesbloqueadas ?? []);
  const lista = obterCatalogo24ConquistasSteam();
  const hoverId = String(opcoes.hoverHitboxId ?? viewModel?.idHitboxHover ?? '');
  const idxHover = hoverId.startsWith('STEAM_CONQ_CARD_') ? Number(hoverId.slice('STEAM_CONQ_CARD_'.length)) : -1;

  fillRectS(buf, largura, altura, S, 0, 0, 960, 540, [4, 10, 16, 208]);
  fillRectS(buf, largura, altura, S, 36, 28, 888, 484, [10, 22, 34, 248]);
  strokeRectS(buf, largura, altura, S, 36, 28, 888, 484, [255, 214, 92, 245], 2);
  strokeRectS(buf, largura, altura, S, 41, 33, 878, 474, [38, 84, 110, 215], 1);

  drawTxtHeader2xS(
    buf,
    largura,
    altura,
    S,
    50,
    38,
    `${tUi(idioma, 'CONQUISTAS_TITULO')} (${desbloq.size}/24)`,
    [255, 224, 108, 250],
    10
  );
  drawTxtS(
    buf,
    largura,
    altura,
    S,
    676,
    43,
    idioma === 'en-US' ? 'HOVER CARD FOR FULL DETAIL' : 'PASSE O MOUSE P/ DETALHES',
    [136, 218, 242, 235],
    6
  );

  for (let i = 0; i < lista.length; i += 1) {
    const ach = lista[i];
    const col = i % 3;
    const lin = Math.floor(i / 3);
    const cx = 48 + col * 292;
    const cy = 66 + lin * 44;
    const ok = desbloq.has(ach.id);
    const emHover = idxHover === i;
    fillRectS(
      buf,
      largura,
      altura,
      S,
      cx,
      cy,
      280,
      39,
      emHover ? [24, 52, 66, 248] : ok ? [16, 46, 44, 244] : [13, 24, 34, 240]
    );
    strokeRectS(
      buf,
      largura,
      altura,
      S,
      cx,
      cy,
      280,
      39,
      emHover ? [255, 232, 108, 252] : ok ? [108, 248, 196, 245] : [52, 82, 102, 210],
      emHover ? 1.5 : 1
    );
    const tit = idioma === 'en-US' ? ach.tituloEn : ach.tituloPt;
    const cabCard = `[${ach.iconeCurto}] ${tit}`;
    drawTxtS(
      buf,
      largura,
      altura,
      S,
      cx + 6,
      cy + 6,
      cabCard,
      ok ? [132, 252, 208, 250] : [206, 228, 242, 240],
      6
    );
    const seloDir = ok ? '[OK]' : ach.desbloqueiaLayoutId ? '[+B]' : '[--]';
    drawTxtS(
      buf,
      largura,
      altura,
      S,
      cx + 280 - seloDir.length * 6 - 5,
      cy + 6,
      seloDir,
      ok ? [255, 226, 104, 250] : ach.desbloqueiaLayoutId ? [116, 224, 248, 235] : [108, 138, 158, 215],
      6
    );
    const reqCurto = RESUMO_REQ_CONQUISTA[ach.id];
    const linReq = reqCurto
      ? (idioma === 'en-US' ? reqCurto.en : reqCurto.pt)
      : (idioma === 'en-US' ? ach.descEn : ach.descPt).slice(0, 44).toUpperCase();
    drawTxtS(
      buf,
      largura,
      altura,
      S,
      cx + 6,
      cy + 22,
      linReq,
      ok ? [255, 224, 118, 245] : [138, 174, 196, 232],
      6
    );
  }

  const achFoco =
    (idxHover >= 0 && lista[idxHover]) ||
    lista.find((a) => a.id === viewModel?.conquistaInspecionadaId) ||
    lista.find((a) => !desbloq.has(a.id)) ||
    lista[0];
  if (achFoco) {
    const okFoco = desbloq.has(achFoco.id);
    fillRectS(buf, largura, altura, S, 48, 422, 864, 42, [8, 18, 28, 248]);
    strokeRectS(buf, largura, altura, S, 48, 422, 864, 42, okFoco ? [108, 248, 196, 245] : [86, 214, 246, 235], 1);
    const titFoco = idioma === 'en-US' ? achFoco.tituloEn : achFoco.tituloPt;
    const descFoco = (idioma === 'en-US' ? achFoco.descEn : achFoco.descPt).toUpperCase();
    const layRecB = achFoco.desbloqueiaLayoutId ? resolverLayoutTopologiaNave(achFoco.desbloqueiaLayoutId) : null;
    const nomeLayRecB = layRecB
      ? (idioma === 'en-US' ? layRecB.nomeCurtoCardEn : layRecB.nomeCurtoCardPt)
      : String(achFoco.desbloqueiaLayoutId ?? '').replace(/_/g, ' ');
    const recB = achFoco.desbloqueiaLayoutId
      ? (idioma === 'en-US' ? ` | UNLOCKS ${nomeLayRecB}` : ` | LIBERA ${nomeLayRecB}`)
      : '';
    const stFoco = okFoco ? tUi(idioma, 'CONQUISTAS_DESBLOQ') : tUi(idioma, 'CONQUISTAS_BLOQ');
    drawTxtS(
      buf,
      largura,
      altura,
      S,
      58,
      430,
      `[${achFoco.iconeCurto}] ${titFoco} — ${stFoco}${recB}`,
      okFoco ? [132, 252, 208, 250] : [255, 224, 108, 250],
      6
    );
    drawTxtS(buf, largura, altura, S, 58, 446, descFoco, [214, 238, 248, 245], 6);
  }

  fillRectS(buf, largura, altura, S, 404, 472, 152, 28, [24, 58, 76, 248]);
  strokeRectS(buf, largura, altura, S, 404, 472, 152, 28, [255, 214, 92, 248], 1.5);
  drawTxtS(buf, largura, altura, S, 434, 482, tUi(idioma, 'OPCOES_FECHAR'), [255, 255, 255, 250], 6);
}

export function rasterizarOverlayTutorialSteamRgba(buf, largura, altura, estadoTutorial, opcoes = {}) {
  const etapa = obterEtapaAtualTutorialSteam(estadoTutorial);
  if (!etapa) return false;
  const S = Math.max(1, Number(opcoes.escala ?? 1));
  const idioma = normalizarIdiomaSteam(opcoes.idioma);
  const sp = etapa.spotlight960;

  // Escurece ao redor preservando nitidez 100% dentro do retângulo de spotlight!
  fillRectS(buf, largura, altura, S, 0, 0, 960, sp.y, [4, 10, 18, 148]);
  fillRectS(buf, largura, altura, S, 0, sp.y + sp.h, 960, 540 - (sp.y + sp.h), [4, 10, 18, 148]);
  fillRectS(buf, largura, altura, S, 0, sp.y, sp.x, sp.h, [4, 10, 18, 148]);
  fillRectS(buf, largura, altura, S, sp.x + sp.w, sp.y, 960 - (sp.x + sp.w), sp.h, [4, 10, 18, 148]);

  strokeRectS(buf, largura, altura, S, sp.x - 2, sp.y - 2, sp.w + 4, sp.h + 4, [255, 226, 98, 250], 2);

  const cx = etapa.caixaCallout960.x;
  const cy = etapa.caixaCallout960.y;
  const cw = etapa.caixaCallout960.w;
  const ch = etapa.caixaCallout960.h;
  fillRectS(buf, largura, altura, S, cx, cy, cw, ch, [8, 22, 34, 248]);
  strokeRectS(buf, largura, altura, S, cx, cy, cw, ch, [92, 244, 214, 248], 2);

  drawTxtS(buf, largura, altura, S, cx + 12, cy + 8, idioma === 'en-US' ? etapa.seloEn : etapa.seloPt, [255, 224, 102, 250], 6);
  drawTxtS(buf, largura, altura, S, cx + 12, cy + 23, idioma === 'en-US' ? etapa.tituloEn : etapa.tituloPt, [120, 248, 222, 250], 6);

  const linhas = idioma === 'en-US' ? etapa.linhasEn : etapa.linhasPt;
  for (let i = 0; i < linhas.length; i += 1) {
    drawTxtS(buf, largura, altura, S, cx + 12, cy + 40 + i * 13, linhas[i], [224, 242, 252, 246], 6);
  }

  fillRectS(buf, largura, altura, S, cx + cw - 236, cy + ch - 28, 118, 22, [20, 66, 74, 248]);
  strokeRectS(buf, largura, altura, S, cx + cw - 236, cy + ch - 28, 118, 22, [112, 248, 206, 248], 1);
  drawTxtS(buf, largura, altura, S, cx + cw - 226, cy + ch - 21, idioma === 'en-US' ? 'NEXT STEP >' : 'AVANÇAR >', [255, 255, 255, 250], 6);

  fillRectS(buf, largura, altura, S, cx + cw - 110, cy + ch - 28, 100, 22, [46, 26, 32, 245]);
  strokeRectS(buf, largura, altura, S, cx + cw - 110, cy + ch - 28, 100, 22, [242, 118, 108, 240], 1);
  drawTxtS(buf, largura, altura, S, cx + cw - 98, cy + ch - 21, idioma === 'en-US' ? 'SKIP [ESC]' : 'PULAR [ESC]', [255, 214, 210, 248], 6);

  return true;
}

/**
 * Renderiza o badge dourado estilo Steam Overlay no canto inferior direito quando
 * uma nova conquista Steam é desbloqueada em tempo real (`viewModel.popupConquistaRecente`).
 */
export function rasterizarPopupConquistaSteamRgba(buf, largura, altura, viewModel, opcoes = {}) {
  const popBruto = viewModel?.popupConquistaRecente;
  const pop = typeof popBruto === 'string' ? { idConquista: popBruto, restanteSeg: 4.0 } : popBruto;
  if (!pop || !(Number(pop.restanteSeg ?? 0) > 0)) return false;
  const lista = obterCatalogo24ConquistasSteam();
  const ach = lista.find((a) => a.id === (pop.idConquista ?? pop.id)) ?? lista[0];
  if (!ach) return false;

  const S = Math.max(1, Number(opcoes.escala ?? 1));
  const idioma = normalizarIdiomaSteam(opcoes.idioma ?? viewModel?.configuracoesSteam?.idioma);
  const rest = Number(pop.restanteSeg ?? 0);
  const deslSlide = rest < 0.35 ? Math.round((1 - rest / 0.35) * 48) : 0;
  const px = 640;
  const py = Math.min(536, 493 + deslSlide);
  const pw = 308;
  const ph = 42;

  fillRectS(buf, largura, altura, S, px, py, pw, ph, [8, 20, 32, 248]);
  strokeRectS(buf, largura, altura, S, px, py, pw, ph, [255, 214, 84, 252], 2);
  strokeRectS(buf, largura, altura, S, px + 3, py + 3, pw - 6, ph - 6, [116, 92, 32, 220], 1);

  // Medalha dourada pixel-art à esquerda
  fillRectS(buf, largura, altura, S, px + 8, py + 8, 28, 28, [46, 36, 12, 248]);
  strokeRectS(buf, largura, altura, S, px + 8, py + 8, 28, 28, [255, 224, 96, 252], 1.5);
  drawTxtS(buf, largura, altura, S, px + 13, py + 18, ach.iconeCurto.slice(0, 3), [255, 236, 124, 255], 6);

  const cab = idioma === 'en-US' ? 'ACHIEVEMENT UNLOCKED!' : 'CONQUISTA DESBLOQUEADA!';
  const tit = (idioma === 'en-US' ? ach.tituloEn : ach.tituloPt).slice(0, 42);
  drawTxtS(buf, largura, altura, S, px + 44, py + 10, cab, [255, 222, 98, 255], 6);
  drawTxtS(buf, largura, altura, S, px + 44, py + 25, tit, [128, 252, 212, 255], 6);
  return true;
}

/**
 * Renderiza as pílulas táticas de combate da Edição Steam 1.0 na zona livre (158..372, 45..84):
 * - `[Z] SALV.` / `[Y] POSTO` (Postos de Batalha da Tripulação)
 * - `[H] HACK` (Sonda de Sabotagem Iônica)
 * - `[N] NEURO` (Parasita Neural)
 * - `DRONE ON` (Drone de Defesa Anti-Torpedo)
 */
export function rasterizarPilulasTaticasCombateSteamRgba(buf, largura, altura, viewModel, opcoes = {}) {
  const S = Math.max(1, Number(opcoes.escala ?? 1));
  const cfg = criarConfiguracoesSteam(viewModel?.configuracoesSteam ?? {});
  const idioma = normalizarIdiomaSteam(opcoes.idioma ?? cfg.idioma);
  const en = idioma === 'en-US';
  const hoverId = String(opcoes.hoverHitboxId ?? viewModel?.idHitboxHover ?? '');
  const formatarTeclaPila = (cod, fb) => {
    const s = String(cod ?? fb ?? '').trim();
    if (s === 'Space') return en ? 'SP' : 'ES';
    if (s.startsWith('Key')) return s.slice(3, 5).toUpperCase();
    if (s.startsWith('Digit')) return s.slice(5, 6);
    return s.toUpperCase().slice(0, 2) || fb;
  };
  const kZ = formatarTeclaPila(cfg.atalhosTeclado.SALVAR_POSTOS, 'Z');
  const kY = formatarTeclaPila(cfg.atalhosTeclado.RETORNAR_POSTOS, 'Y');
  const kH = formatarTeclaPila(cfg.atalhosTeclado.SONDA_HACK, 'H');
  const kN = formatarTeclaPila(cfg.atalhosTeclado.PARASITA_NEURAL, 'N');
  const temPostos = Object.keys(viewModel?.postosSalvosTripulacao ?? {}).length > 0;

  const desenharPilula = (x, y, w, h, idHb, rotulo, corBorda, corTxt, fracRecarga = 0) => {
    const hov = hoverId === idHb;
    fillRectS(buf, largura, altura, S, x, y, w, h, hov ? [22, 48, 64, 246] : [9, 21, 32, 238]);
    if (fracRecarga > 0 && fracRecarga < 1) {
      const wProg = Math.max(2, Math.round((w - 4) * (1 - fracRecarga)));
      fillRectS(buf, largura, altura, S, x + 2, y + h - 4, wProg, 2, [76, 198, 224, 190]);
    }
    strokeRectS(
      buf,
      largura,
      altura,
      S,
      x,
      y,
      w,
      h,
      hov ? [255, 232, 108, 252] : corBorda,
      hov ? 1.5 : 1
    );
    drawTxtS(buf, largura, altura, S, x + 5, y + 5, rotulo, hov ? [255, 248, 210, 255] : corTxt, 6);
  };

  desenharPilula(
    158,
    45,
    66,
    18,
    'STEAM_BTN_SALVAR_POSTOS',
    `[${kZ}] ${en ? 'SAVE' : 'SALV.'}`,
    temPostos ? [104, 238, 196, 235] : [64, 148, 178, 215],
    [212, 242, 250, 245]
  );
  desenharPilula(
    228,
    45,
    68,
    18,
    'STEAM_BTN_RETORNAR_POSTOS',
    `[${kY}] ${en ? 'POSTS' : 'POSTO'}`,
    temPostos ? [255, 218, 98, 242] : [64, 132, 158, 195],
    temPostos ? [255, 236, 144, 250] : [164, 196, 212, 225]
  );

  const subTat = viewModel?.subsistemasTaticosSteam ?? {};
  if (subTat.sondaSabotagem) {
    const cd = Math.max(0, Number(subTat.recargaSondaSeg ?? 0));
    const pronto = cd <= 0.05;
    desenharPilula(
      300,
      45,
      72,
      18,
      'STEAM_BTN_SONDA_HACK',
      pronto ? `[${kH}] HACK` : `[${kH}] ${Math.ceil(cd)}S`,
      pronto ? [92, 238, 255, 248] : [62, 108, 132, 215],
      pronto ? [146, 248, 255, 252] : [156, 194, 212, 230],
      pronto ? 0 : Math.min(1, cd / 16)
    );
  }
  if (subTat.parasitaNeural) {
    const cd = Math.max(0, Number(subTat.recargaNeuralSeg ?? subTat.recargaParasitaSeg ?? 0));
    const pronto = cd <= 0.05;
    desenharPilula(
      158,
      66,
      78,
      18,
      'STEAM_BTN_PARASITA_NEURAL',
      pronto ? `[${kN}] NEURO` : `[${kN}] ${Math.ceil(cd)}S`,
      pronto ? [226, 128, 255, 248] : [108, 74, 132, 215],
      pronto ? [242, 184, 255, 252] : [188, 158, 206, 230],
      pronto ? 0 : Math.min(1, cd / 18)
    );
  }
  let xCursorDrone = subTat.parasitaNeural ? 240 : 158;
  if (subTat.droneDefesa) {
    const cd = Math.max(0, Number(subTat.recargaDroneDefesaSeg ?? subTat.recargaDroneSeg ?? 0));
    const pronto = cd <= 0.05;
    desenharPilula(
      xCursorDrone,
      66,
      82,
      18,
      '',
      pronto ? (en ? 'DEF DRN' : 'DRN DEF') : `DEF ${Math.ceil(cd)}S`,
      pronto ? [98, 248, 188, 245] : [214, 162, 68, 220],
      pronto ? [144, 255, 212, 250] : [244, 208, 128, 238],
      pronto ? 0 : Math.min(1, cd / 9)
    );
    xCursorDrone += 86;
  }
  if (subTat.droneReparo) {
    const cdRep = Math.max(0, Number(subTat.recargaDroneReparoSeg ?? 0));
    const prontoRep = cdRep <= 0.05;
    desenharPilula(
      xCursorDrone,
      66,
      82,
      18,
      '',
      prontoRep ? (en ? 'REP DRN' : 'DRN REP') : `REP ${Math.ceil(cdRep)}S`,
      prontoRep ? [116, 232, 255, 245] : [92, 146, 178, 220],
      prontoRep ? [184, 246, 255, 250] : [164, 212, 236, 235],
      prontoRep ? 0 : Math.min(1, cdRep / 12)
    );
    xCursorDrone += 86;
  }
  if (subTat.droneAtaque) {
    const cdAtk = Math.max(0, Number(subTat.recargaDroneAtaqueSeg ?? 0));
    const prontoAtk = cdAtk <= 0.05;
    desenharPilula(
      xCursorDrone,
      66,
      82,
      18,
      '',
      prontoAtk ? (en ? 'ATK DRN' : 'DRN ATK') : `ATK ${Math.ceil(cdAtk)}S`,
      prontoAtk ? [255, 138, 96, 245] : [168, 94, 72, 220],
      prontoAtk ? [255, 198, 158, 250] : [224, 158, 136, 235],
      prontoAtk ? 0 : Math.min(1, cdAtk / 8.5)
    );
  }
}

/**
 * Ponto único de composição das camadas visuais da Edição Comercial Steam sobre o buffer RGBA!
 */
export function rasterizarCamadasComerciaisSteamRgba(buf, largura, altura, viewModel, opcoes = {}) {
  if (!viewModel || typeof viewModel !== 'object') return;
  const fase = viewModel.faseJogo ?? 'COMBATE';

  if (fase === 'COMBATE' && !viewModel.modalCampanhaAtivo) {
    rasterizarTopologiaConectoresNaveRgba(buf, largura, altura, viewModel, opcoes);
    if (viewModel.edicaoComercialSteam) {
      rasterizarPilulasTaticasCombateSteamRgba(buf, largura, altura, viewModel, opcoes);
    }
  }
  if (fase === 'INICIO') {
    rasterizarBarraControlesHangarSteamRgba(buf, largura, altura, viewModel, opcoes);
  }
  if (viewModel.tutorialSteam?.ativo) {
    rasterizarOverlayTutorialSteamRgba(buf, largura, altura, viewModel.tutorialSteam, opcoes);
  }
  if (viewModel.modalSteamAtivo === 'OPCOES') {
    rasterizarModalOpcoesSteamRgba(buf, largura, altura, viewModel, opcoes);
  } else if (viewModel.modalSteamAtivo === 'CONQUISTAS') {
    rasterizarModalConquistasSteamRgba(buf, largura, altura, viewModel, opcoes);
  }
  rasterizarPopupConquistaSteamRgba(buf, largura, altura, viewModel, opcoes);

  const curGp = opcoes.cursorGamepad960;
  if (curGp && curGp.ativo) {
    const S = Math.max(1, Number(opcoes.escala ?? 1));
    const idioma = normalizarIdiomaSteam(opcoes.idioma ?? viewModel?.configuracoesSteam?.idioma);
    const gx = Math.max(4, Math.min(955, Math.round(Number(curGp.x ?? 480))));
    const gy = Math.max(4, Math.min(535, Math.round(Number(curGp.y ?? 270))));
    const corAnel = opcoes.hoverHitboxId ? [255, 228, 96, 250] : [96, 246, 224, 245];
    strokeRectS(buf, largura, altura, S, gx - 5, gy - 5, 11, 11, [6, 16, 24, 235], 1);
    strokeRectS(buf, largura, altura, S, gx - 4, gy - 4, 9, 9, corAnel, 1);
    fillRectS(buf, largura, altura, S, gx - 8, gy, 3, 1, corAnel);
    fillRectS(buf, largura, altura, S, gx + 6, gy, 3, 1, corAnel);
    fillRectS(buf, largura, altura, S, gx, gy - 8, 1, 3, corAnel);
    fillRectS(buf, largura, altura, S, gx, gy + 6, 1, 3, corAnel);
    fillRectS(buf, largura, altura, S, gx, gy, 1, 1, [255, 255, 255, 255]);

    // Glifos coloridos de controle estilo Steam Deck posicionados em faixa livre sem sobrepor sistemas
    const ehTelaMenu = fase === 'INICIO' || fase === 'FIM_DE_RUN';
    const bx = ehTelaMenu ? 281 : 356;
    const by = fase === 'INICIO' ? 500 : (fase === 'FIM_DE_RUN' ? 519 : 19);
    const bw = 398;
    fillRectS(buf, largura, altura, S, bx, by, bw, 16, [6, 16, 26, 238]);
    strokeRectS(buf, largura, altura, S, bx, by, bw, 16, [64, 188, 214, 215], 1);
    const glifos = idioma === 'en-US'
      ? [
          { dx: 6, bg: [36, 148, 72, 245], btn: 'A', txt: 'OK' },
          { dx: 58, bg: [186, 52, 48, 245], btn: 'B', txt: 'PAUSE' },
          { dx: 132, bg: [42, 118, 212, 245], btn: 'X', txt: 'DIVE' },
          { dx: 198, bg: [198, 142, 32, 245], btn: 'Y', txt: 'DRAIN' },
          { dx: 272, bg: [48, 86, 112, 245], btn: 'LB/RB', txt: 'WEAPON' },
        ]
      : [
          { dx: 6, bg: [36, 148, 72, 245], btn: 'A', txt: 'OK' },
          { dx: 58, bg: [186, 52, 48, 245], btn: 'B', txt: 'PAUSA' },
          { dx: 132, bg: [42, 118, 212, 245], btn: 'X', txt: 'FOIL' },
          { dx: 198, bg: [198, 142, 32, 245], btn: 'Y', txt: 'DRENO' },
          { dx: 272, bg: [48, 86, 112, 245], btn: 'LB/RB', txt: 'ARMA' },
        ];
    for (const g of glifos) {
      const wBtn = g.btn.length * 6 + 6;
      fillRectS(buf, largura, altura, S, bx + g.dx, by + 2, wBtn, 13, g.bg);
      drawTxtS(buf, largura, altura, S, bx + g.dx + 3, by + 5, g.btn, [255, 255, 255, 255], 6);
      drawTxtS(buf, largura, altura, S, bx + g.dx + wBtn + 4, by + 5, g.txt, [214, 238, 248, 245], 6);
    }
  }
}
