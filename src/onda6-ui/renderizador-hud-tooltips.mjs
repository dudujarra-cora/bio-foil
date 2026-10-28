/**
 * ONDA 6 — Renderizador Puro da Barra Superior, Termômetro Hidrostático, Painel do Alvo, Rodapé, Tooltips e Avisos (960x540)
 * Dono Único (Lei N5): src/onda6-ui/renderizador-hud-tooltips.mjs
 *
 * Responsabilidades:
 *  - Renderizar Barra Superior (`Y=0..39`), Termômetro Hidrostático Esquerdo com Ghost Preview (`X=0..150, Y=40..429`),
 *    Painel Superior Direito do Alvo (`COMBATE`, incluindo telemetria explícita `[SONAR ATIVO]` / `[SONAR OFF]`),
 *    Emblema Diegético de Pausa Tática e Barra Inferior de Sistemas/Armas/Tripulação (`Y=430..539`);
 *  - Renderizar Banner Toast de Aviso/Rejeição (`avisoToastTexto` / avisos críticos) e Tooltip Contextual Origin-Aware;
 *  - Zero imports Node.js e zero `structuredClone` para paridade 0-byte entre Servidor e Navegador.
 */

import { obterSiglaHudArma } from '../onda7-steam/i18n-dicionario-ui.mjs';

function rotuloTeclaCurtaHud(codigoBruto, padrao) {
  if (!codigoBruto || typeof codigoBruto !== 'string') return padrao;
  const c = codigoBruto.trim();
  if (!c) return padrao;
  if (c === 'Space') return 'SPC';
  if (c.startsWith('Key') && c.length === 4) return c.slice(3).toUpperCase();
  if (c.startsWith('Digit') && c.length === 6) return c.slice(5);
  return c.slice(0, 3).toUpperCase();
}

export function renderizarHudSuperiorTermometroERodape(ctx) {
  const {
    W,
    H,
    viewModel,
    opcoes,
    assets,
    hitboxes,
    tempoSeg,
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
    NOMES_CARC,
    NOMES_ARMAS,
    SIGLAS_ESP,
    putPx,
    fillRect,
    hLine,
    txt,
    chanfradoBezel,
    panel,
    desenharPersonagemPose4F,
    segBar,
    desenharTuboEnergiaHiBit,
    socket,
    bolhaBarreira,
    lock,
    heartOrgan,
    desenharRetratoRecortadoHiBit,
    desenharIconeSis12,
  } = ctx;

  // 2. Barra Superior (X=0..959, Y=0..39)
  const ehEnHud = viewModel.configuracoesSteam?.idioma === 'en-US';
  const cascoAtual = Math.max(0, Number(viewModel.barraSuperior.hpCascoAtual ?? 0));
  const cascoMax = Math.max(1, Number(viewModel.barraSuperior.hpCascoMax ?? 30));
  const rec = viewModel.barraSuperior.recursos ?? { sucata: 0, biomassa: 0, combustivel: 0, municao: 0 };
  const saltoPct = Math.max(0, Math.min(100, Math.round(Number(viewModel.barraSuperior.cargaSaltoPct ?? 0))));
  const saltoTexto = ehTouchdown ? `${saltoPct}% (${ehEnHud ? 'x0.5' : 'x0,5'})` : `${saltoPct}%`;

  panel(0, 0, W - 1, 39);
  txt(6, 6, `${ehEnHud ? 'HULL' : 'CASCO'} ${cascoAtual}/${cascoMax}`, TXT);
  const wPipCasco = cascoMax <= 28 ? 3 : cascoMax <= 39 ? 2 : 1;
  segBar(104, 6, cascoMax, cascoAtual, wPipCasco, 8, 1, cascoAtual <= 8 ? RED : GREEN);
  txt(226, 6, ehEnHud ? 'BARRIER' : 'BARREIRA', TXT);
  const bolhasAtivas = Math.max(0, Number(viewModel.barraSuperior.barreiraBolhas ?? 0));
  for (let b = 0; b < Math.max(1, Math.min(4, bolhasAtivas || 1)); b += 1) {
    bolhaBarreira(294 + b * 12, 5, b < bolhasAtivas);
  }
  txt(436, 6, 'BIO-FOIL', CYAN);
  const hbAudioHud = hitboxes.find((h) => h.idHitbox === 'BTN_ALTERNAR_AUDIO');
  if (hbAudioHud) {
    const hovAu = idHoverAtivo === hbAudioHud.idHitbox;
    const mudoAu = Boolean(viewModel.audioMutado);
    chanfradoBezel(
      hbAudioHud.x,
      hbAudioHud.y,
      hbAudioHud.x + hbAudioHud.largura - 1,
      hbAudioHud.y + hbAudioHud.altura - 1,
      mudoAu ? [34, 18, 18, 255] : [10, 32, 38, 255],
      hovAu ? YELLOW : mudoAu ? AMBER : CYAN,
      2
    );
    txt(
      hbAudioHud.x + 5,
      hbAudioHud.y + 4,
      mudoAu ? (ehEnHud ? 'MUTED' : 'MUDO') : (ehEnHud ? 'AUDIO ON' : 'SOM ON'),
      hovAu ? YELLOW : mudoAu ? AMBER : GREEN,
      6
    );
  }
  const eco = ehEnHud
    ? `SCR ${rec.sucata} BIO ${rec.biomassa} FUE ${rec.combustivel} AMM ${rec.municao}`
    : `SUC ${rec.sucata} BIO ${rec.biomassa} CMB ${rec.combustivel} MUN ${rec.municao}`;
  txt(W - 6 - eco.length * 8, 6, eco, TXT);

  const rotEstadoTopo = ehEnHud
    ? (estadoFisico === '3_SPOOL_UP'
        ? 'SPOOL-UP - EVASION 0%'
        : ehTouchdown
          ? 'TOUCHDOWN - EVASION 0%'
          : `ON FOIL - EVASION ${viewModel.barraSuperior.esquivaEfetivaPct}%`)
    : (estadoFisico === '3_SPOOL_UP'
        ? 'SPOOL-UP - ESQUIVA 0%'
        : ehTouchdown
          ? 'TOUCHDOWN - ESQUIVA 0%'
          : `NO FOIL - ESQUIVA ${viewModel.barraSuperior.esquivaEfetivaPct}%`);
  txt(6, 24, rotEstadoTopo, estadoFisico === '3_SPOOL_UP' ? AMBER : ehTouchdown ? RED : GREEN);

  if (ehTouchdown) {
    txt(238, 24, ehEnHud ? 'RELOAD -25%' : 'RECARGA -25%', CYAN);
  } else if ((viewModel.painelAlvo?.alarmeFervuraAtivoSeg ?? 0) > 0) {
    txt(238, 24, `${ehEnHud ? 'BOIL ALARM' : 'ALARME FERVURA'} ${viewModel.painelAlvo.alarmeFervuraAtivoSeg.toFixed(1)}s`, RED);
  } else if ((viewModel.painelAlvo?.fervuraAtivaSeg ?? 0) > 0) {
    txt(238, 24, ehEnHud ? 'BOILING SEA!' : 'MAR EM FERVURA!', RED);
  } else {
    const mapaCarcEn = {
      CARCACA_ALFA: 'ALPHA HULL',
      MANTA_VOLT: 'MANTA-VOLT',
      COURACA_LIMIAR: 'THRESHOLD HULL',
      SOMBRA_ABISSAL: 'ABYSSAL SHADOW',
      COLMEIA_VIVA: 'LIVING HIVE',
    };
    const nomeCarcacaTopo = ehEnHud
      ? (mapaCarcEn[idCarcaca] ?? idCarcaca.replace(/_/g, ' '))
      : (NOMES_CARC[idCarcaca] ?? idCarcaca.replace(/_/g, ' '));
    txt(238, 24, nomeCarcacaTopo.slice(0, 20), DIM);
  }

  const rotSalto = `${ehEnHud ? 'JUMP' : 'SALTO'} ${saltoTexto}`;
  txt(W - 6 - 64 - 6 - rotSalto.length * 8, 24, rotSalto, TXT);
  segBar(W - 6 - 64, 24, 16, Math.round((16 * saltoPct) / 100), 3, 8, 1, AMBER);

  // 3. Termômetro Hidrostático Esquerdo (X=0..150, Y=40..429)
  panel(0, 40, 150, 429, ehEnHud ? 'HYDRO-LIFT' : 'SUSTENTAÇÃO');
  const topY = 74;
  const botY = 318;
  const tx = 42;
  const limiteKg = Math.round(Number(viewModel.termometroSustentacao.sustentacaoAtualKg ?? 0));
  const pesoKg = Math.round(Number(viewModel.termometroSustentacao.pesoTotalKg ?? 0));
  const aguaKgTerm = Math.round(Number(viewModel.termometroSustentacao.aguaTotalKg ?? 100));
  const emCavitTerm = Boolean(viewModel.termometroSustentacao.emCavitacao);
  const maxRefGhost =
    opcoes.exibirGhostPreview === true && viewModel.termometroSustentacao.ghostPreview?.ativo
      ? Math.max(
          Number(viewModel.termometroSustentacao.ghostPreview.sustentacaoProjetadaKg ?? 0),
          Number(viewModel.termometroSustentacao.ghostPreview.pesoProjetadoKg ?? 0)
        )
      : 0;
  const topoEscalaKg = Math.max(300, Math.ceil(Math.max(limiteKg, pesoKg, maxRefGhost) / 50) * 50);
  const spanEscalaKg = Math.max(200, topoEscalaKg - 100);
  const ky = (kg) => {
    const kgClamped = Math.max(80, Math.min(topoEscalaKg + 20, Number(kg) || 0));
    return Math.max(topY, Math.min(botY, Math.round(topY + ((topoEscalaKg - kgClamped) * (botY - topY)) / spanEscalaKg)));
  };

  for (let gyT = topY; gyT <= botY; gyT += 1) {
    putPx(tx, gyT, [32, 62, 78, 255]);
    putPx(tx + 12, gyT, [20, 38, 50, 255]);
    for (let dxT = 1; dxT <= 11; dxT += 1) {
      const cVidro = dxT <= 2 ? [18, 32, 42, 255] : dxT <= 8 ? [11, 20, 27, 255] : [6, 12, 17, 255];
      putPx(tx + dxT, gyT, cVidro);
    }
  }
  for (let idxSub = 0; idxSub < 4; idxSub += 1) {
    const kgSub = topoEscalaKg - ((idxSub + 0.5) * spanEscalaKg) / 4;
    const ySub = ky(kgSub);
    hLine(tx + 8, tx + 11, ySub, [24, 44, 56, 190], 1);
  }
  for (let idxEsc = 0; idxEsc < 5; idxEsc += 1) {
    const kgEsc = Math.round(topoEscalaKg - (idxEsc * spanEscalaKg) / 4);
    const yEsc = ky(kgEsc);
    hLine(tx - 4, tx - 1, yEsc, DIM, 1);
    hLine(tx + 7, tx + 11, yEsc, [38, 68, 86, 210], 1);
    txt(4, yEsc - 3, String(kgEsc), DIM);
  }
  const py = ky(pesoKg);
  const ly = ky(limiteKg);
  if (py < botY) {
    const emSobrepesoCol = pesoKg > limiteKg;
    for (let fyT = py; fyT <= botY - 1; fyT += 1) {
      for (let dxT = 1; dxT <= 11; dxT += 1) {
        let cFluido;
        if (emSobrepesoCol) {
          cFluido = dxT <= 3 ? [255, 108, 114, 255] : dxT <= 8 ? RED : [138, 18, 30, 255];
        } else {
          cFluido = dxT <= 3 ? [255, 208, 88, 255] : dxT <= 8 ? AMBER : [156, 88, 10, 255];
        }
        putPx(tx + dxT, fyT, cFluido);
      }
    }
    if (py > topY + 1) {
      putPx(tx + 1, py - 1, emSobrepesoCol ? RED : AMBER);
      putPx(tx + 2, py - 1, emSobrepesoCol ? [255, 132, 136, 220] : [255, 224, 96, 220]);
      putPx(tx + 10, py - 1, emSobrepesoCol ? [196, 30, 44, 220] : [196, 118, 14, 220]);
      putPx(tx + 11, py - 1, emSobrepesoCol ? [156, 22, 34, 255] : [164, 94, 12, 255]);
    }
    hLine(tx + 2, tx + 10, py, emSobrepesoCol ? YELLOW : [255, 238, 152, 255], 1);
    const altColFluido = botY - 2 - (py + 2);
    if (altColFluido >= 8) {
      for (let mb = 0; mb < 3; mb += 1) {
        const yBol = botY - 3 - ((Math.round(tempoSeg * 18) + mb * 19) % altColFluido);
        const xBol = tx + 4 + ((mb * 3 + Math.round(tempoSeg * 5)) % 5);
        putPx(xBol, yBol, [255, 248, 210, 210]);
      }
    }
  }
  for (let gyS = topY + 2; gyS <= botY - 2; gyS += 1) {
    putPx(tx + 2, gyS, [214, 250, 255, 92]);
  }
  chanfradoBezel(tx - 2, topY - 5, tx + 14, topY, [48, 38, 26, 255], [168, 126, 54, 255], 1, [224, 182, 92, 255]);
  putPx(tx + 1, topY - 3, YELLOW);
  putPx(tx + 11, topY - 3, AMBER);
  chanfradoBezel(tx - 2, botY, tx + 14, botY + 4, [42, 32, 22, 255], [152, 112, 48, 255], 1, [202, 158, 76, 255]);
  putPx(tx + 1, botY + 2, YELLOW);
  putPx(tx + 11, botY + 2, AMBER);

  chanfradoBezel(tx - 3, ly - 1, tx + 15, ly + 1, [12, 44, 56, 240], CYAN, 1, TXT);

  if (opcoes.exibirGhostPreview === true && viewModel.termometroSustentacao.ghostPreview?.ativo) {
    const gp = viewModel.termometroSustentacao.ghostPreview;
    const gyLim = ky(gp.sustentacaoProjetadaKg);
    const gyPeso = ky(gp.pesoProjetadoKg);
    const alertaVermelhoGp = Boolean(gp.travadoHidrostatico || gp.causariaQuedaNoMar || gp.entrariaEmCavitacao);
    const corGpLim = gp.travadoHidrostatico || gp.entrariaEmCavitacao ? RED : YELLOW;
    const yDeltaL0 = Math.min(ly, gyLim);
    const yDeltaL1 = Math.max(ly, gyLim);
    for (let yd = yDeltaL0; yd <= yDeltaL1; yd += 1) {
      for (let xd = tx + 2; xd <= tx + 10; xd += 1) {
        if (((xd + yd) & 1) === 0) {
          putPx(xd, yd, corGpLim);
        } else if (yd >= py) {
          putPx(xd, yd, [22, 30, 38, 255]);
        }
      }
    }
    const yDeltaP0 = Math.min(py, gyPeso);
    const yDeltaP1 = Math.max(py, gyPeso);
    for (let yd = yDeltaP0; yd <= yDeltaP1; yd += 1) {
      for (let xd = tx + 5; xd <= tx + 10; xd += 1) {
        if (((xd + yd) % 3) === 0) putPx(xd, yd, CYAN);
      }
    }
    hLine(tx - 3, tx + 15, gyLim - 1, [6, 10, 15, 255], 4);
    hLine(tx - 3, tx + 15, gyPeso - 1, [6, 10, 15, 255], 3);
    for (let gx = tx - 3; gx <= tx + 15; gx += 1) {
      if ((gx % 3) !== 2) {
        putPx(gx, gyLim, corGpLim);
        putPx(gx, gyLim + 1, corGpLim);
      }
      if ((gx & 1) === 0) {
        putPx(gx, gyPeso, TXT);
      }
    }
    for (let dyA = -4; dyA <= 4; dyA += 1) {
      const largTri = 4 - Math.abs(dyA);
      hLine(tx - 4 - largTri - 1, tx - 2, gyLim + dyA, [6, 10, 15, 255], 1);
      if (largTri > 0) hLine(tx - 3 - largTri, tx - 3, gyLim + dyA, corGpLim, 1);
      hLine(tx + 14, tx + 16 + largTri + 1, gyPeso + dyA, [6, 10, 15, 255], 1);
      if (largTri > 0) hLine(tx + 15, tx + 15 + largTri, gyPeso + dyA, TXT, 1);
    }
    if (gp.rotuloFantasma) {
      txt(6, 56, String(gp.rotuloFantasma).slice(0, 20), alertaVermelhoGp ? RED : YELLOW, 7);
    }
  }

  let yRotLim = Math.max(76, Math.min(262, ly - 4));
  let yRotPeso = Math.max(76, Math.min(262, py - 4));
  if (Math.abs(yRotPeso - yRotLim) < 22) {
    if (pesoKg >= limiteKg) {
      yRotPeso = Math.max(76, yRotLim - 22);
      if (Math.abs(yRotPeso - yRotLim) < 22) yRotLim = Math.min(264, yRotPeso + 22);
    } else {
      yRotPeso = Math.min(264, yRotLim + 22);
      if (Math.abs(yRotPeso - yRotLim) < 22) yRotLim = Math.max(76, yRotPeso - 22);
    }
  }
  txt(60, yRotLim, `${limiteKg} kg`, CYAN);
  txt(60, yRotLim + 9, ehEnHud ? 'LIMIT' : 'LIMITE', CYAN);
  txt(60, yRotPeso, `${pesoKg} kg`, AMBER);
  txt(60, yRotPeso + 9, ehEnHud ? 'MASS' : 'PESO', AMBER);

  if (estadoFisico === '3_SPOOL_UP') {
    chanfradoBezel(60, 290, 145, 304, [52, 34, 8, 255], AMBER, 2, YELLOW);
    txt(64, 294, 'SPOOL-UP!', AMBER, 7);
  } else if (ehTouchdown || viewModel.termometroSustentacao.alertaTouchdownAtivo) {
    chanfradoBezel(60, 290, 145, 304, [70, 8, 14, 255], RED, 2, AMBER);
    txt(64, 294, 'TOUCHDOWN', RED, 7);
  }
  chanfradoBezel(6, 323, 144, 339, emCavitTerm ? [64, 16, 12, 255] : [10, 24, 32, 255], emCavitTerm ? RED : BORDER, 2, RIM);
  txt(
    10,
    328,
    emCavitTerm ? `CAVIT! H2O:${aguaKgTerm}kg` : `H2O:${aguaKgTerm}kg (MIN 63)`,
    emCavitTerm ? RED : GREEN,
    7
  );

  const atalhosHud = viewModel.configuracoesSteam?.atalhosTeclado ?? null;
  const tkMergulho = rotuloTeclaCurtaHud(atalhosHud?.MERGULHO_TATICO, 'M');
  const tkDreno = rotuloTeclaCurtaHud(atalhosHud?.DRENAR_VALVULAS, 'D');
  const tkSalva = rotuloTeclaCurtaHud(atalhosHud?.SALVA_MANUAL, 'X');

  const hbMergulho = hitboxes.find((h) => h.idHitbox === 'BTN_MERGULHO_TATICO');
  if (hbMergulho) {
    const dyP = idPressAtivo === hbMergulho.idHitbox ? 1 : 0;
    const hov = idHoverAtivo === hbMergulho.idHitbox;
    chanfradoBezel(
      hbMergulho.x,
      hbMergulho.y + dyP,
      hbMergulho.x + hbMergulho.largura - 1,
      hbMergulho.y + hbMergulho.altura - 1,
      ehTouchdown ? [18, 40, 52, 255] : SLOT_BG,
      hov ? YELLOW : ehTouchdown ? CYAN : RIM,
      3,
      hov ? TXT : [48, 86, 108, 255]
    );
    txt(hbMergulho.x + 6, hbMergulho.y + 5 + dyP, ehTouchdown ? (ehEnHud ? `[${tkMergulho}] SURFACE` : `[${tkMergulho}] EMERGIR`) : (ehEnHud ? `[${tkMergulho}] TACTICAL` : `[${tkMergulho}] MERGULHO`), TXT, 7);
    txt(hbMergulho.x + 6, hbMergulho.y + 15 + dyP, ehTouchdown ? (ehEnHud ? 'TO FOIL' : 'AO FOIL') : (ehEnHud ? 'SEA DIVE' : 'TÁTICO'), ehTouchdown ? CYAN : AMBER, 7);
  }

  const hbDrenoSeguro = hitboxes.find((h) => h.idHitbox === 'BTN_DRENAR_SEGURO');
  if (hbDrenoSeguro) {
    const dyP = idPressAtivo === hbDrenoSeguro.idHitbox ? 1 : 0;
    const hov = idHoverAtivo === hbDrenoSeguro.idHitbox;
    const desab = ehTouchdown || aguaKgTerm <= 63;
    chanfradoBezel(
      hbDrenoSeguro.x,
      hbDrenoSeguro.y + dyP,
      hbDrenoSeguro.x + hbDrenoSeguro.largura - 1,
      hbDrenoSeguro.y + hbDrenoSeguro.altura - 1,
      viewModel.termometroSustentacao.drenoSeguroAtivo ? [12, 44, 32, 255] : SLOT_BG,
      hov ? YELLOW : ehTouchdown ? RED : GREEN,
      3,
      hov ? TXT : [44, 96, 68, 255]
    );
    txt(hbDrenoSeguro.x + 6, hbDrenoSeguro.y + 4 + dyP, ehEnHud ? `[${tkDreno}] SAFE DRAIN` : `[${tkDreno}] DRENO SEGURO`, desab ? DIM : GREEN, 7);
    txt(hbDrenoSeguro.x + 6, hbDrenoSeguro.y + 14 + dyP, ehEnHud ? 'STOPS AT 63 kg' : 'CORTA EM 63 kg', desab ? DIM : CYAN, 7);
    if (ehTouchdown) {
      lock(hbDrenoSeguro.x + hbDrenoSeguro.largura - 12, hbDrenoSeguro.y + 7 + dyP, AMBER);
    }
  }

  const hbDrenar = hitboxes.find((h) => h.idHitbox === 'BTN_DRENAR_TUDO');
  if (hbDrenar) {
    const dyP = idPressAtivo === hbDrenar.idHitbox ? 1 : 0;
    const hov = idHoverAtivo === hbDrenar.idHitbox;
    chanfradoBezel(
      hbDrenar.x,
      hbDrenar.y + dyP,
      hbDrenar.x + hbDrenar.largura - 1,
      hbDrenar.y + hbDrenar.altura - 1,
      SLOT_BG,
      hov ? YELLOW : ehTouchdown ? RED : RIM,
      3,
      hov ? TXT : [48, 72, 90, 255]
    );
    txt(hbDrenar.x + 6, hbDrenar.y + 4 + dyP, ehEnHud ? '[V] PURGE ALL' : '[V] DRENAR TUDO', ehTouchdown ? DIM : TXT, 7);
    txt(hbDrenar.x + 6, hbDrenar.y + 14 + dyP, ehEnHud ? 'CAVITATION RISK' : 'RISCO CAVITAÇÃO', ehTouchdown ? DIM : AMBER, 7);
    if (ehTouchdown) {
      lock(hbDrenar.x + hbDrenar.largura - 12, hbDrenar.y + 7 + dyP, AMBER);
    }
  }

  // 4. Painel Superior Direito do Alvo (em COMBATE)
  if (faseJogo === 'COMBATE' && viewModel.painelAlvo?.presente) {
    const armasInimHud = Array.isArray(viewModel.painelAlvo.armasInimigas) ? viewModel.painelAlvo.armasInimigas : [];
    const temArmasInimHud = Boolean(viewModel.edicaoComercialSteam && armasInimHud.length > 0 && !ehChefeDraga);
    const caixaInimigo = ehChefeDraga ? [620, 44, 956, 118] : [716, 44, 956, temArmasInimHud ? 145 : 132];
    const [ex0, ey0, ex1, ey1] = caixaInimigo;
    const maxCharsNome = Math.floor((ex1 - ex0 - 12) / 8);
    const nomeAlvoCru = String(viewModel.painelAlvo.nomeAlvo ?? (ehMonstroAlvo ? 'TEUTHIS COURAÇADA' : 'LANCHA PATRULHEIRA'))
      .toUpperCase()
      .replace(/_S\d+$/i, '')
      .replace(/_/g, ' ')
      .replace(/\bCOURACADA\b/g, 'COURAÇADA');
    const mapaInimEn = {
      'LANCHA PATRULHEIRA': 'PATROL CUTTER',
      'CORVETA DE SONAR': 'SONAR CORVETTE',
      'CORVETA DE INTERCEPTACAO': 'INTERCEPTOR CORVETTE',
      'CORVETA DE INTERCEPTAÇÃO': 'INTERCEPTOR CORVETTE',
      'ARRASTAO BLINDADO': 'ARMORED TRAWLER',
      'ARRASTÃO BLINDADO': 'ARMORED TRAWLER',
      'ARRASTAO CORPORATIVO': 'CORPORATE TRAWLER',
      'ARRASTÃO CORPORATIVO': 'CORPORATE TRAWLER',
      'SUBMARINO TERMICO DE ASSALTO': 'THERMAL ASSAULT SUB',
      'SUBMARINO TÉRMICO DE ASSALTO': 'THERMAL ASSAULT SUB',
      'SUBMARINO DE ASSALTO': 'ASSAULT SUBMARINE',
      'TEUTHIS COURACADA': 'ARMORED TEUTHIS',
      'TEUTHIS COURAÇADA': 'ARMORED TEUTHIS',
      'TEUTHIS COURACADA MUTANTE': 'ARMORED TEUTHIS MUTANT',
      'TEUTHIS COURAÇADA MUTANTE': 'ARMORED TEUTHIS MUTANT',
      'ENGUIA ELETRICA ABISSAL': 'ABYSSAL ELECTRIC EEL',
      'ENGUIA ELÉTRICA ABISSAL': 'ABYSSAL ELECTRIC EEL',
      'ENGUIA BIO-VOLT': 'BIO-VOLT EEL',
      'CARANGUEJO-TITA DE TRINCHEIRA': 'TITAN TRENCH CRAB',
      'CARANGUEJO-TITÃ DE TRINCHEIRA': 'TITAN TRENCH CRAB',
      'CARANGUEJO DE TRINCHEIRA': 'TRENCH CRAB',
      'HIDRA TERMOFILICA DE CRATERA': 'CRATER THERMO-HYDRA',
      'HIDRA TERMOFÍLICA DE CRATERA': 'CRATER THERMO-HYDRA',
      'HIDRA DE ESPOROS': 'SPORE HYDRA',
    };
    const traduzirNomeInimEn = (cru) => {
      if (mapaInimEn[cru]) return mapaInimEn[cru];
      return cru
        .replace(/TEUTHIS COURA[CÇ]ADA/g, 'ARMORED TEUTHIS')
        .replace(/ENGUIA BIO-VOLT/g, 'BIO-VOLT EEL')
        .replace(/CARANGUEJO DE TRINCHEIRA/g, 'TRENCH CRAB')
        .replace(/HIDRA DE ESPOROS/g, 'SPORE HYDRA')
        .replace(/LANCHA PATRULHEIRA/g, 'PATROL CUTTER')
        .replace(/CORVETA DE INTERCEPTA[CÇ][AÃ]O/g, 'INTERCEPTOR CORVETTE')
        .replace(/ARRAST[AÃ]O CORPORATIVO/g, 'CORPORATE TRAWLER')
        .replace(/SUBMARINO DE ASSALTO/g, 'ASSAULT SUBMARINE')
        .replace(/\bMUTANTE\b/g, 'MUTANT')
        .replace(/\bPESADO\b|\bPESADA\b/g, 'HEAVY')
        .replace(/\bELITE\b/g, 'ELITE');
    };
    const nomeBruto = ehChefeDraga
      ? (ehEnHud ? `CONTINENTAL DREDGE F${viewModel.painelAlvo.faseChefe ?? 1}` : `DRAGA CONTINENTAL F${viewModel.painelAlvo.faseChefe ?? 1}`)
      : (ehEnHud ? traduzirNomeInimEn(nomeAlvoCru) : nomeAlvoCru);
    const passoFonteNome = nomeBruto.length > maxCharsNome ? 7 : 8;
    const maxCharsEfetivo = Math.floor((ex1 - ex0 - 12) / passoFonteNome);
    const nomeInimigo = nomeBruto.slice(0, maxCharsEfetivo);
    const hpInimigoMax = Math.max(1, Number(viewModel.painelAlvo.hpCascoMax ?? 8));
    const hpInimigoAtual = Math.max(0, Number(viewModel.painelAlvo.hpCascoAtual ?? 0));

    panel(ex0, ey0, ex1, ey1);
    txt(ex0 + 6, ey0 + 6, nomeInimigo, RED, passoFonteNome);
    const rotCascoAlvo = `${ehEnHud ? 'HULL' : 'CASCO'} ${hpInimigoAtual}/${hpInimigoMax}`;
    txt(ex0 + 6, ey0 + 20, rotCascoAlvo, TXT);

    const xBarraAlvo = ex0 + 6 + rotCascoAlvo.length * 8 + 6;
    const largDispBarra = Math.max(24, ex1 - 6 - xBarraAlvo);
    let wSegAlvo;
    let gapSegAlvo;
    if (opcoes.estourarBarraChefeMutacao === true) {
      wSegAlvo = 9;
      gapSegAlvo = 2;
    } else {
      const passoSeg = Math.max(2, Math.min(10, Math.floor(largDispBarra / hpInimigoMax)));
      gapSegAlvo = passoSeg >= 5 ? 2 : 1;
      wSegAlvo = Math.max(1, passoSeg - gapSegAlvo);
    }
    segBar(xBarraAlvo, ey0 + 20, hpInimigoMax, hpInimigoAtual, wSegAlvo, 8, gapSegAlvo, RED);

    const barreiraAlvo = Number(viewModel.painelAlvo.barreiraBolhas ?? 0);
    const esquivaAlvo = Number(viewModel.painelAlvo.esquivaPct ?? 0);
    const idArqHud = String(viewModel.painelAlvo.arquetipoAlvoId ?? viewModel.painelAlvo.arquetipoId ?? '').toUpperCase();
    const totalSalasHud = (viewModel.painelAlvo.salasInspecionadas ?? []).length;
    const temSalaSonarHud = Boolean(
      viewModel.painelAlvo.temSalaSonar ||
        (viewModel.painelAlvo.salasInspecionadas ?? []).some((s) => /SONAR/i.test(s.nomeSala ?? ''))
    );
    const sonarAtivoAlvo = Boolean(viewModel.painelAlvo.sonarMilitarAtivo);
    const linhasInimigo = [];
    linhasInimigo.push(
      ehEnHud
        ? `BUBBLES: ${barreiraAlvo > 0 ? barreiraAlvo : 0} | EVADE: ${esquivaAlvo}%`
        : (barreiraAlvo > 0 ? `BOLHAS: ${barreiraAlvo} | ESQUIVA: ${esquivaAlvo}%` : `BOLHAS: 0 | ESQUIVA: ${esquivaAlvo}%`)
    );
    if (ehChefeDraga) {
      if ((viewModel.painelAlvo.blindagemTermicaExternaPts ?? 0) > 0) {
        linhasInimigo.push(`${ehEnHud ? 'THERMAL DOME' : 'BLINDAGEM TÉRMICA'}: ${viewModel.painelAlvo.blindagemTermicaExternaPts} PTS`);
      }
      if ((viewModel.painelAlvo.alarmeFervuraAtivoSeg ?? 0) > 0) {
        linhasInimigo.push(`${ehEnHud ? 'BOIL ALARM' : 'ALARME FERVURA'}: ${viewModel.painelAlvo.alarmeFervuraAtivoSeg.toFixed(1)}s`);
      } else if ((viewModel.painelAlvo.fervuraAtivaSeg ?? 0) > 0) {
        linhasInimigo.push(`${ehEnHud ? 'BOIL ACTIVE' : 'FERVURA ATIVA'}: ${viewModel.painelAlvo.fervuraAtivaSeg.toFixed(1)}s`);
      } else if (temSalaSonarHud) {
        linhasInimigo.push(
          ehEnHud
            ? `ROOMS: ${totalSalasHud} | ${sonarAtivoAlvo ? '[SONAR ON]' : '[SONAR OFF]'}`
            : `SALAS: ${totalSalasHud} | ${sonarAtivoAlvo ? '[SONAR ATIVO]' : '[SONAR OFF]'}`
        );
      } else {
        linhasInimigo.push(ehEnHud ? `ACTIVE ROOMS: ${totalSalasHud}` : `SALAS ATIVAS: ${totalSalasHud}`);
      }
    } else if (ehMonstroAlvo) {
      const ganglio = viewModel.painelAlvo.salasInspecionadas.find((s) => /GANGLIO/i.test(s.nomeSala));
      const intG = ganglio?.integridade ?? 3;
      const maxG = ganglio?.integridadeMax ?? 3;
      linhasInimigo.push([`${ehEnHud ? 'GANGLION' : 'GÂNGLIO'}: ${intG}/${maxG}`, intG]);
      const linArmaM = ehEnHud
        ? (idArqHud === 'MONSTRO_2_ENGUIA' ? 'VOLT -> MAST | TAIL 8s' :
           idArqHud === 'MONSTRO_3_CARANGUEJO' ? 'CLAW -> MAST | GRIP 8s' :
           idArqHud === 'MONSTRO_4_HIDRA' ? 'SPORES -> MAST | ROOT 8s' :
           'BEAK -> MAST | TENT. 8s')
        : (idArqHud === 'MONSTRO_2_ENGUIA' ? 'VOLT → MASTRO | CAUDA 8s' :
           idArqHud === 'MONSTRO_3_CARANGUEJO' ? 'PINÇA → MASTRO | GARRA 8s' :
           idArqHud === 'MONSTRO_4_HIDRA' ? 'ESPOROS → MASTRO | RAIZ 8s' :
           'BICO → MASTRO | TENT. 8s');
      linhasInimigo.push(linArmaM);
    } else {
      const linArmaB = ehEnHud
        ? (temSalaSonarHud
            ? `${totalSalasHud} ROOMS | ${sonarAtivoAlvo ? '[SONAR ON]' : '[SONAR OFF]'}`
            : idArqHud === 'BARCO_3_ARRASTAO'
              ? `${totalSalasHud} ROOMS | SHIELD + TORPEDO`
              : `${totalSalasHud} ROOMS | TURRET + TORPEDO`)
        : (temSalaSonarHud
            ? `${totalSalasHud} SALAS | ${sonarAtivoAlvo ? '[SONAR ATIVO]' : '[SONAR OFF]'}`
            : idArqHud === 'BARCO_3_ARRASTAO'
              ? `${totalSalasHud} SALAS | ESCUDO + TORPEDO`
              : `${totalSalasHud} SALAS | TORRETA + TORPEDO`);
      linhasInimigo.push(linArmaB);
      if (temArmasInimHud) {
        const rotArmasInim = armasInimHud
          .map((a) => String(a.nome ?? a.id ?? '').replace(/^\d+\.\s*/, '').toUpperCase().slice(0, 15))
          .join(' + ');
        linhasInimigo.push(`${ehEnHud ? 'WPN' : 'ARM'}: ${rotArmasInim}`);
      }
    }

    const maxCharsLinInim = Math.floor((ex1 - ex0 - 12) / 6);
    let lyInimigo = ehChefeDraga ? ey0 + 32 : ey0 + 35;
    for (const lin of linhasInimigo) {
      if (lyInimigo + 8 > ey1 - 2) break;
      if (Array.isArray(lin)) {
        const [rotLin, barrasLin] = lin;
        txt(ex0 + 6, lyInimigo, rotLin.slice(0, maxCharsNome), AMBER);
        const bx = ex0 + 6 + rotLin.length * 8 + 4;
        for (let bi = 0; bi < barrasLin; bi += 1) {
          if (bx + bi * 6 + 3 < ex1 - 4) {
            fillRect(bx + bi * 6, lyInimigo, bx + bi * 6 + 3, lyInimigo + 6, GREEN);
          }
        }
      } else {
        const strLin = String(lin);
        const ehLinArmasMod = strLin.startsWith('ARM:') || strLin.startsWith('WPN:');
        const corLin = ehLinArmasMod
          ? YELLOW
          : (strLin.includes('[SONAR ATIVO]') || strLin.includes('[SONAR ON]'))
            ? CYAN
            : strLin.includes('[SONAR OFF]')
              ? DIM
              : AMBER;
        if (ehLinArmasMod) {
          txt(ex0 + 6, lyInimigo + 1, strLin.slice(0, maxCharsLinInim), corLin, 6);
        } else {
          txt(ex0 + 6, lyInimigo, strLin.slice(0, maxCharsNome), corLin);
        }
      }
      lyInimigo += 12;
    }

    const ofRend = viewModel.painelAlvo.ofertaRendicaoAtiva;
    if (ofRend && !ehChefeDraga) {
      const hbRend = hitboxes.find((h) => h.idHitbox === 'BTN_ACEITAR_RENDICAO_INIMIGA');
      const rx0 = hbRend ? hbRend.x : 716;
      const ry0 = hbRend ? hbRend.y : (temArmasInimHud ? 148 : 136);
      const rx1 = hbRend ? hbRend.x + hbRend.largura - 1 : 955;
      const ry1 = hbRend ? hbRend.y + hbRend.altura - 1 : ry0 + 19;
      const hovRend = idHoverAtivo === 'BTN_ACEITAR_RENDICAO_INIMIGA';
      chanfradoBezel(rx0, ry0, rx1, ry1, [12, 42, 28, 246], hovRend ? YELLOW : GREEN, 2, TXT);
      const rotRend = ehEnHud
        ? `[R] SURRENDER (+${ofRend.sucata}S +${ofRend.combustivel}F +${ofRend.municao}A)`
        : `[R] RENDIÇÃO (+${ofRend.sucata}S +${ofRend.combustivel}C +${ofRend.municao}M)`;
      txt(rx0 + 6, ry0 + 6, rotRend.slice(0, 38), hovRend ? YELLOW : GREEN, 6);
    }
  }

  // 4B. Emblema Diegético de Pausa Tática
  const pausaTaticaAtiva = Boolean(opcoes.pausaTaticaAtiva ?? viewModel.pausaTaticaAtiva);
  if (pausaTaticaAtiva) {
    const pxPausa = ehChefeDraga ? 376 : 446;
    chanfradoBezel(pxPausa, 43, pxPausa + 238, 59, [8, 22, 30, 244], YELLOW, 3, TXT);
    txt(pxPausa + 10, 48, ehEnHud ? 'TACTICAL PAUSE — QUEUE ORDERS' : 'PAUSA TÁTICA — ORDENS EM FILA', YELLOW, 7);
    fillRect(152, 41, 158, 43, YELLOW);
    fillRect(152, 41, 154, 47, YELLOW);
    fillRect(951, 41, 957, 43, YELLOW);
    fillRect(955, 41, 957, 47, YELLOW);
    fillRect(152, 426, 158, 428, YELLOW);
    fillRect(152, 422, 154, 428, YELLOW);
    fillRect(951, 426, 957, 428, YELLOW);
    fillRect(955, 422, 957, 428, YELLOW);
  }

  // 5. Barra Inferior (Y=430..539)
  const y0 = 430;
  const energiaTotal = Math.max(1, Number(viewModel.reatorCoracaoBioEletrico.barrasTotais ?? 7));
  const livres = Math.max(0, Number(viewModel.reatorCoracaoBioEletrico.barrasLivres ?? 0));
  const energiaUsada = Math.max(0, energiaTotal - livres);
  const slotArmaSel = Number.isInteger(opcoes.slotArmaSelecionado) ? opcoes.slotArmaSelecionado : 0;
  const tripSelId = opcoes.tripulanteSelecionadoId ?? null;

  panel(0, y0, 198, H - 1, ehEnHud ? 'BIO-ELECTRIC HEART' : 'CORAÇÃO BIO-ELÉTRICO');
  const pulsoSistole = Math.sin(tempoSeg * 5.2);
  const dyHeart = pulsoSistole > 0.65 ? -1 : 0;
  heartOrgan(10, y0 + 30 + dyHeart);
  if (energiaUsada > 0 && pulsoSistole > 0.4) {
    putPx(8, y0 + 34, YELLOW);
    putPx(44, y0 + 42, CYAN);
    putPx(26, y0 + 25, YELLOW);
  }
  if (energiaTotal <= 10) {
    const passoB = energiaTotal <= 8 ? 16 : 14;
    const largB = passoB - 4;
    for (let i = 0; i < energiaTotal; i += 1) {
      desenharTuboEnergiaHiBit(50 + i * passoB, y0 + 26, 50 + i * passoB + largB - 1, y0 + 68, i < livres);
    }
  } else {
    const cols = Math.ceil(energiaTotal / 2);
    const passoB = Math.max(10, Math.floor(142 / cols));
    const largB = Math.max(6, passoB - 3);
    for (let i = 0; i < energiaTotal; i += 1) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const by0 = y0 + 24 + row * 23;
      desenharTuboEnergiaHiBit(50 + col * passoB, by0, 50 + col * passoB + largB - 1, by0 + 19, i < livres);
    }
  }
  txt(50, y0 + 82, `${livres}/${energiaTotal} ${ehEnHud ? 'FREE' : 'LIVRES'}`, TXT);

  panel(200, y0, 495, H - 1, ehEnHud ? 'SYSTEMS' : 'SISTEMAS');
  const hbSistemas = hitboxes.filter((h) => h.tipo === 'SISTEMA_RODAPE');
  (viewModel.caixaSistemas ?? []).forEach((sys, i) => {
    const hb = hbSistemas[i];
    if (!hb) return;
    const bloqueado = !sys.instalado;
    const danificado = !bloqueado && sys.barrasIntegridade < sys.barrasNivelMax;
    const ionizado = !bloqueado && Number(sys.barrasIonizadas ?? 0) > 0;
    const hov = idHoverAtivo === hb.idHitbox;
    const dyP = idPressAtivo === hb.idHitbox ? 1 : 0;
    const idSys = sys.id ?? sys.sistemaId;
    const brqReflexo =
      idSys === 'BOMBA_BRANQUIAL' &&
      Number(sys.barrasEnergiaAlocada ?? 0) >= 1 &&
      (Boolean(viewModel.telemetriaBioReflexo?.reflexoRecenteAtivo) ||
        Number(viewModel.telemetriaBioReflexo?.alertaReflexoBranquialSeg ?? 0) > 0);
    chanfradoBezel(
      hb.x,
      hb.y + dyP,
      hb.x + hb.largura - 1,
      hb.y + hb.altura - 1,
      brqReflexo ? [12, 42, 32, 255] : hov ? [18, 32, 42, 255] : SLOT_BG,
      hov ? YELLOW : brqReflexo ? GREEN : danificado ? RED : ionizado ? CYAN : RIM,
      2,
      hov ? TXT : [42, 68, 86, 255]
    );
    const siglaPt = String(sys.sigla).slice(0, 3);
    const mapaSiglaSisEn = { ESC: 'SHD', SIF: 'SIP', BRQ: 'GIL', ART: 'WPN', CTX: 'CTX', MST: 'MST', TUB: 'BRD', TNT: 'CLK' };
    const siglaExib = ehEnHud ? (mapaSiglaSisEn[siglaPt] ?? siglaPt) : siglaPt;
    txt(hb.x + 5, hb.y + 4 + dyP, siglaExib, hov ? YELLOW : brqReflexo ? GREEN : bloqueado ? DIM : TXT, 7);
    desenharIconeSis12(siglaPt, hb.x + 10, hb.y + 14 + dyP, bloqueado);
    if (bloqueado) {
      lock(hb.x + 12, hb.y + 28 + dyP, DIM);
      txt(hb.x + 5, hb.y + 66 + dyP, ehEnHud ? 'LCK' : 'BLQ', DIM, 7);
    } else {
      const tot = Math.min(8, Math.max(0, Number(sys.barrasNivelMax ?? 0)));
      const on = Math.max(0, Number(sys.barrasEnergiaAlocada ?? 0));
      const integ = Math.max(0, Number(sys.barrasIntegridade ?? tot));
      for (let b = 0; b < tot; b += 1) {
        const pyPip = hb.y + 56 - b * 5 + dyP;
        const corPip = b < on ? (ionizado ? CYAN : GREEN) : b < integ ? PIP_OFF : RED;
        fillRect(hb.x + 5, pyPip, hb.x + hb.largura - 6, pyPip + 3, corPip);
        if (b < on) {
          hLine(hb.x + 5, hb.x + hb.largura - 6, pyPip, ionizado ? TXT : [142, 255, 168, 255], 1);
          hLine(hb.x + 5, hb.x + hb.largura - 6, pyPip + 3, [22, 128, 52, 255], 1);
        }
      }
      txt(hb.x + 5, hb.y + 66 + dyP, `${on}/${integ}`, danificado ? RED : brqReflexo ? GREEN : TXT, 7);
    }
  });

  panel(497, y0, 735, H - 1, ehEnHud ? 'WEAPONS' : 'ARMAS');
  const modoSalvaGlobal = String(viewModel.modoSalvaGlobal ?? 'AUTOMATICO');
  const ocupadosArmasHud = (viewModel.caixaArmas ?? []).filter((s) => s.ocupado);
  const algumaSlotManHud = ocupadosArmasHud.some((s) => s.modoDisparo === 'MANUAL');
  const todasSlotsManHud = ocupadosArmasHud.length > 0 && ocupadosArmasHud.every((s) => s.modoDisparo === 'MANUAL');
  const ehMistoHud = algumaSlotManHud && !todasSlotsManHud;
  const hbModoDisp = hitboxes.find((h) => h.idHitbox === 'BTN_MODO_DISPARO');
  if (hbModoDisp) {
    const hovMd = idHoverAtivo === hbModoDisp.idHitbox;
    const ehMan = todasSlotsManHud || (!ocupadosArmasHud.length && modoSalvaGlobal === 'MANUAL');
    chanfradoBezel(
      hbModoDisp.x,
      hbModoDisp.y,
      hbModoDisp.x + hbModoDisp.largura - 1,
      hbModoDisp.y + hbModoDisp.altura - 1,
      ehMan ? [44, 28, 10, 255] : ehMistoHud ? [16, 32, 42, 255] : [12, 34, 28, 255],
      hovMd ? YELLOW : ehMan ? AMBER : ehMistoHud ? CYAN : GREEN,
      2
    );
    const rotBtnModo = ehMan ? '[A] MANUAL' : ehMistoHud ? (ehEnHud ? '[A] MIXED' : '[A] MISTO') : '[A] AUTO';
    txt(hbModoDisp.x + 4, hbModoDisp.y + 4, rotBtnModo, hovMd ? YELLOW : ehMan ? YELLOW : ehMistoHud ? CYAN : GREEN, 6);
  }
  const hbSalva = hitboxes.find((h) => h.idHitbox === 'BTN_DISPARAR_SALVA');
  if (hbSalva) {
    const hovSv = idHoverAtivo === hbSalva.idHitbox;
    const algumaPronta = (viewModel.caixaArmas ?? []).some(
      (s) =>
        s.ocupado &&
        s.modoDisparo === 'MANUAL' &&
        s.energizada !== false &&
        Number(s.progressoRecargaSeg ?? 0) >= Math.max(0.1, Number(s.tempoRecargaBaseSeg ?? 9))
    );
    chanfradoBezel(
      hbSalva.x,
      hbSalva.y,
      hbSalva.x + hbSalva.largura - 1,
      hbSalva.y + hbSalva.altura - 1,
      algumaPronta ? [48, 22, 14, 255] : [14, 22, 28, 255],
      hovSv ? YELLOW : algumaPronta ? RED : RIM,
      2
    );
    txt(hbSalva.x + 5, hbSalva.y + 4, ehEnHud ? `[${tkSalva}] VOLLEY!` : `[${tkSalva}] SALVA!`, hovSv || algumaPronta ? YELLOW : DIM, 6);
  }
  const hbArmas = hitboxes.filter((h) => h.tipo === 'SLOT_ARMA');
  (viewModel.caixaArmas ?? []).forEach((slot, i) => {
    const hb = hbArmas[i];
    if (!hb) return;
    const temAlvo =
      slot.ocupado &&
      ((slot.salaAlvoId !== null && slot.salaAlvoId !== undefined) ||
        (Array.isArray(slot.trincaSalasBeam) && slot.trincaSalasBeam.length > 0));
    const hov = idHoverAtivo === hb.idHitbox;
    const sel = slot.ocupado && slotArmaSel === i;
    const dyP = idPressAtivo === hb.idHitbox ? 1 : 0;
    const ehSlotMan = slot.modoDisparo !== undefined ? slot.modoDisparo === 'MANUAL' : modoSalvaGlobal === 'MANUAL';
    const eneCusto = Math.max(1, Number(slot.energiaCusto ?? 1));
    const eneAloc = Math.max(0, Number(slot.energiaAlocada !== undefined ? slot.energiaAlocada : eneCusto));
    const armaLigada = eneAloc >= eneCusto;
    chanfradoBezel(
      hb.x,
      hb.y + dyP,
      hb.x + hb.largura - 1,
      hb.y + hb.altura - 1,
      hov ? [18, 32, 42, 255] : sel ? [14, 28, 36, 255] : SLOT_BG,
      hov ? YELLOW : sel ? CYAN : !armaLigada && slot.ocupado ? BORDER : temAlvo ? GREEN : RIM,
      2,
      hov || sel ? TXT : [42, 68, 86, 255]
    );
    const tkSlotArma = rotuloTeclaCurtaHud(atalhosHud?.[`ARMA_SLOT_${i + 1}`], String(i + 1));
    txt(hb.x + 3, hb.y + 4 + dyP, `[${tkSlotArma}]`, hov || sel ? YELLOW : temAlvo && armaLigada ? CYAN : DIM, 7);
    if (!slot.ocupado) {
      txt(hb.x + 10, hb.y + 36 + dyP, ehEnHud ? 'EMPTY' : 'VAZIO', DIM, 7);
      return;
    }
    txt(hb.x + hb.largura - 21, hb.y + 4 + dyP, ehSlotMan ? 'MAN' : 'AUT', ehSlotMan ? AMBER : armaLigada ? GREEN : DIM, 6);
    const siglaHud = obterSiglaHudArma(slot.chassiId, viewModel.configuracoesSteam?.idioma);
    const nomeArma = siglaHud ?? NOMES_ARMAS[slot.chassiId] ?? String(slot.chassiId);
    txt(hb.x + 3, hb.y + 16 + dyP, nomeArma, sel ? CYAN : armaLigada ? TXT : DIM, 7);

    for (let e = 0; e < Math.min(4, eneCusto); e += 1) {
      const pipLigado = e < eneAloc;
      fillRect(hb.x + 3 + e * 8, hb.y + 29 + dyP, hb.x + 8 + e * 8, hb.y + 33 + dyP, pipLigado ? GREEN : PIP_OFF);
      if (pipLigado) {
        hLine(hb.x + 3 + e * 8, hb.x + 8 + e * 8, hb.y + 29 + dyP, [142, 255, 168, 255], 1);
      }
    }
    const tBase = Math.max(0.1, Number(slot.tempoRecargaBaseSeg ?? 9));
    const fracRec = armaLigada ? Math.max(0, Math.min(1, Number(slot.progressoRecargaSeg ?? 0) / tBase)) : 0;
    chanfradoBezel(hb.x + 3, hb.y + 38 + dyP, hb.x + hb.largura - 4, hb.y + 43 + dyP, [20, 30, 38, 255], BORDER, 1);
    const largRec = Math.round((hb.largura - 9) * fracRec);
    if (largRec > 0) {
      const corPronta = fracRec >= 1 || Number(slot.cargasEstocadas ?? 0) > 0 ? (Math.sin(tempoSeg * 8) > 0 ? YELLOW : GREEN) : CYAN;
      fillRect(hb.x + 4, hb.y + 39 + dyP, hb.x + 3 + largRec, hb.y + 42 + dyP, corPronta);
    }

    const enxertados = slot.orgaosEnxertados ?? [];
    const nSoquetes = Math.min(3, Number(slot.soquetesMax ?? 0));
    for (let s = 0; s < nSoquetes; s += 1) {
      socket(hb.x + 4 + s * 11, hb.y + 49 + dyP, Boolean(enxertados[s]));
    }
    const cargasMaxSlot = Number(slot.cargasMaximas ?? 0);
    const cargasEstSlot = Math.max(0, Number(slot.cargasEstocadas ?? 0));
    const mecSlot = String(slot.mecanicaEspecial ?? '');
    if (cargasMaxSlot > 1) {
      const xCargasIni = hb.x + hb.largura - 4 - cargasMaxSlot * 6;
      for (let cg = 0; cg < Math.min(4, cargasMaxSlot); cg += 1) {
        const cheia = cg < cargasEstSlot;
        fillRect(xCargasIni + cg * 6, hb.y + 50 + dyP, xCargasIni + cg * 6 + 4, hb.y + 55 + dyP, cheia ? YELLOW : PIP_OFF);
      }
    } else if (mecSlot.startsWith('CADEIA')) {
      const estCad = Math.max(0, Number(slot.estagioCadeiaAtual ?? 0));
      txt(hb.x + hb.largura - 19, hb.y + 49 + dyP, `C+${estCad}`, estCad > 0 ? YELLOW : CYAN, 6);
    }
    const emHoldManual = armaLigada && ehSlotMan && fracRec >= 1;
    const alvoTxt =
      Array.isArray(slot.trincaSalasBeam) && slot.trincaSalasBeam.length >= 2
        ? `${ehEnHud ? 'BEAM' : 'FEIXE'}${slot.trincaSalasBeam.length}`
        : `${ehEnHud ? 'TGT' : 'ALV'}:${slot.salaAlvoId}`;
    const rotAlvo = !armaLigada
      ? (ehEnHud ? 'NO PWR' : 'SEM ENE')
      : emHoldManual
        ? (ehEnHud ? 'HOLD!' : 'RETIDA!')
        : temAlvo
          ? alvoTxt
          : fracRec >= 1
            ? (ehEnHud ? 'READY!' : 'PRONTA!')
            : (ehEnHud ? 'NO AIM' : 'S/MIRA');
    txt(
      hb.x + 3,
      hb.y + 66 + dyP,
      rotAlvo.slice(0, 7),
      !armaLigada ? RED : emHoldManual ? YELLOW : temAlvo ? AMBER : fracRec >= 1 ? YELLOW : DIM,
      7
    );
  });

  panel(737, y0, W - 1, H - 1, ehEnHud ? 'CREW' : 'TRIPULAÇÃO');
  const hbCards = hitboxes.filter((h) => h.tipo === 'CARD_TRIPULANTE');
  const idsSelEsquadraoHud = Array.isArray(opcoes.tripulantesSelecionadosIds) ? opcoes.tripulantesSelecionadosIds : [];
  hbCards.forEach((hb) => {
    const { tripulanteId, especie, hpAtual, hpMax, inflado, nivelMaestria } = hb.metadados;
    const hov = idHoverAtivo === hb.idHitbox;
    const sel = Boolean((tripSelId && tripSelId === tripulanteId) || idsSelEsquadraoHud.includes(tripulanteId));
    const dyP = idPressAtivo === hb.idHitbox ? 1 : 0;
    chanfradoBezel(
      hb.x,
      hb.y + dyP,
      hb.x + hb.largura - 1,
      hb.y + hb.altura - 1,
      hov ? [18, 32, 42, 255] : SLOT_BG,
      hov ? YELLOW : sel ? CYAN : inflado ? AMBER : RIM,
      2,
      hov || sel ? TXT : [42, 68, 86, 255]
    );
    chanfradoBezel(hb.x + 2, hb.y + 3 + dyP, hb.x + hb.largura - 3, hb.y + 50 + dyP, [7, 14, 21, 255], sel ? CYAN : BORDER, 2);
    const cxCard = hb.x + Math.floor(hb.largura / 2);
    const cyCard = hb.y + 27 + dyP;
    const poseCardIdx = especie === 'BAIACU' && inflado ? 3 : 0;
    if (!desenharPersonagemPose4F(especie, poseCardIdx, cxCard, cyCard, Math.min(44, hb.largura - 8), 42, false, false)) {
      const ret = assets.retratos[especie] ?? assets.retratos.POLVO;
      const largRet = Math.max(12, hb.largura - 6);
      desenharRetratoRecortadoHiBit(ret, hb.x + 3, hb.y + 4 + dyP, largRet, 45);
    }
    if (viewModel.edicaoComercialSteam && Number(nivelMaestria ?? 0) > 0) {
      const nvCard = Math.min(2, Number(nivelMaestria));
      for (let st = 0; st < nvCard; st += 1) {
        const pxSt = hb.x + hb.largura - 7 - st * 7;
        const pySt = hb.y + 8 + dyP;
        fillRect(pxSt - 2, pySt - 2, pxSt + 2, pySt + 2, [10, 14, 20, 242]);
        putPx(pxSt, pySt - 2, YELLOW);
        hLine(pxSt - 2, pxSt + 2, pySt - 1, [255, 214, 52, 255], 1);
        hLine(pxSt - 1, pxSt + 1, pySt, [255, 232, 112, 255], 1);
        putPx(pxSt, pySt - 1, TXT);
        putPx(pxSt - 1, pySt + 1, AMBER);
        putPx(pxSt + 1, pySt + 1, AMBER);
      }
    }
    const fracHp = Math.max(0, Math.min(1, Number(hpAtual) / Math.max(1, Number(hpMax))));
    const corHp = fracHp < 0.5 ? RED : fracHp < 1 ? AMBER : GREEN;
    chanfradoBezel(hb.x + 2, hb.y + 54 + dyP, hb.x + hb.largura - 3, hb.y + 59 + dyP, PIP_OFF, null, 1);
    const largHp = Math.round((hb.largura - 5) * fracHp);
    if (largHp > 0) {
      fillRect(hb.x + 3, hb.y + 54 + dyP, hb.x + 1 + largHp, hb.y + 59 + dyP, corHp);
      hLine(hb.x + 3, hb.x + 1 + largHp, hb.y + 54 + dyP, [156, 255, 178, 255], 1);
    }
    const maxCh = Math.max(3, Math.floor((hb.largura - 4) / 7));
    const mapaEspEn = { POLVO: 'OCT', ARRAIA: 'RAY', BAIACU: 'PUF', CARANGUEJO: 'CRB' };
    const siglaEsp = ehEnHud
      ? (mapaEspEn[especie] ?? String(especie).slice(0, 3))
      : (SIGLAS_ESP[especie] ?? String(especie).slice(0, 3));
    if (hb.metadados.localizacao === 'BORDO_INIMIGO') {
      chanfradoBezel(hb.x + 3, hb.y + 4 + dyP, hb.x + hb.largura - 4, hb.y + 14 + dyP, [54, 14, 20, 240], AMBER, 1);
      txt(hb.x + 5, hb.y + 6 + dyP, `${ehEnHud ? 'BOARD S' : 'BORDO S'}${hb.metadados.salaInimigaId ?? 1}`.slice(0, Math.floor((hb.largura - 8) / 6)), YELLOW, 6);
    }
    const rotCard = hb.largura >= 52 ? `${siglaEsp} ${hpAtual}` : String(hpAtual);
    txt(hb.x + 3, hb.y + 66 + dyP, rotCard.slice(0, maxCh), sel ? CYAN : corHp, 7);
  });
}

export function renderizarTooltipContextualEAvisoToast(ctx) {
  const {
    W,
    viewModel,
    opcoes,
    hitboxes,
    ev60,
    idHoverAtivo,
    faseJogo,
    ehTouchdown,
    ehChefeDraga,
    TXT,
    CYAN,
    AMBER,
    RED,
    YELLOW,
    NOMES_SALAS,
    NOMES_ARMAS,
    lineSeg,
    txt,
    chanfradoBezel,
  } = ctx;

  const modalAtivoRender = viewModel.modalCampanhaAtivo ?? null;
  const pausaTaticaAtiva = Boolean(opcoes.pausaTaticaAtiva ?? viewModel.pausaTaticaAtiva);

  // Banner Toast de Aviso / Rejeição Tática (ex.: Trava Hidrostática, Tubo sem Energia, Saldo Insuficiente, Confirmação)
  const avisoCamp = typeof viewModel.ultimoAvisoCampanha === 'string' ? viewModel.ultimoAvisoCampanha : '';
  const avisoCriticoCamp =
    /^(CARCAÇA BLOQUEADA|VARIANTE|LAYOUT|CLIQUE NOVAMENTE|CLICK AGAIN|EXPEDIÇÃO ABANDONADA|RUN ABANDONED|FALHA|FAILED|REQUISITO|LOCKED|SEM SALDO|INSUFFICIENT|PORÃO LOTADO|HOLD FULL|IMPLANTE PASSIVO|PASSIVE IMPLANT|SEM MUNIÇÃO|NO AMMO)/i.test(avisoCamp)
      ? avisoCamp
      : '';
  const textoToastCru = String(opcoes.avisoToastTexto ?? '').trim() || avisoCriticoCamp;
  if (textoToastCru) {
    const rotToast = `[!] ${textoToastCru}`.slice(0, 62);
    const largToast = Math.min(480, Math.max(196, rotToast.length * 7 + 16));
    const yToast =
      modalAtivoRender === 'OFICINA'
        ? 21
        : faseJogo === 'LOJA'
          ? 93
          : pausaTaticaAtiva
            ? 62
            : 44;
    const xCentroToast = modalAtivoRender === 'OFICINA' ? 458 : ehChefeDraga ? 488 : 548;
    const x0Toast = Math.max(158, Math.min(W - largToast - 8, Math.round(xCentroToast - largToast / 2)));
    chanfradoBezel(x0Toast, yToast, x0Toast + largToast, yToast + 15, [48, 14, 18, 248], RED, 2, AMBER);
    txt(x0Toast + 8, yToast + 4, rotToast, YELLOW, 7);
  }

  // Tooltip Contextual Origin-Aware
  const modoSalvaGlobal = String(viewModel.modoSalvaGlobal ?? 'AUTOMATICO');
  const deveMostrarTooltip =
    faseJogo !== 'LOJA' &&
    faseJogo !== 'EVENTO' &&
    Boolean(idHoverAtivo) &&
    (opcoes.exibirTooltipHover === true || Boolean(ev60?.tooltipAberto));
  if (!deveMostrarTooltip) {
    return;
  }

  const hbHov = hitboxes.find((h) => h.idHitbox === idHoverAtivo);
  if (!hbHov) {
    return;
  }

  const ehEnTip = viewModel.configuracoesSteam?.idioma === 'en-US';
  const atalhosTip = viewModel.configuracoesSteam?.atalhosTeclado ?? null;
  const tkTipM = rotuloTeclaCurtaHud(atalhosTip?.MERGULHO_TATICO, 'M');
  const tkTipD = rotuloTeclaCurtaHud(atalhosTip?.DRENAR_VALVULAS, 'D');
  let lin1 = hbHov.idHitbox.replace(/_/g, ' ');
  let lin2 = ehEnTip ? 'CLICK TO INTERACT' : 'CLIQUE PARA INTERAGIR';
  if (hbHov.tipo === 'CAMARA_BIONAVE') {
    const cam = (viewModel.camaras ?? []).find((c) => c.id === hbHov.metadados.camaraId);
    const h2oPct = Math.round(Number(cam?.nivelAguaPct ?? cam?.aguaPct ?? 0));
    const o2Pct = Math.round(Number(cam?.oxigenioPct ?? 100));
    lin1 = ehEnTip
      ? `CHAMBER ${hbHov.metadados.camaraId} — H2O ${h2oPct}% | O2 ${o2Pct}%`
      : `CÂMARA ${hbHov.metadados.camaraId} — H2O ${h2oPct}% | O2 ${o2Pct}%`;
    lin2 = ehEnTip ? '[LMB] MOVE CREW | [SHIFT+LMB] BULB' : '[ESQ] MOVER TRIP. | [SHIFT+ESQ] BULBO';
  } else if (hbHov.tipo === 'VALVULA_EXTERNA') {
    const stValv = hbHov.metadados.travadoTouchdown || ehTouchdown
      ? (ehEnTip ? 'LOCKED' : 'TRAVADA')
      : hbHov.metadados.abertaAtual
        ? (ehEnTip ? 'OPEN' : 'ABERTA')
        : (ehEnTip ? 'SEALED' : 'ESTANQUE');
    lin1 = ehEnTip
      ? `HATCH CHM. ${hbHov.metadados.camaraId} [${stValv}]`
      : `ESCOTILHA CÂM. ${hbHov.metadados.camaraId} [${stValv}]`;
    lin2 = ehTouchdown
      ? (ehEnTip ? `HYDROSTATIC LOCK — PRESS [${tkTipM}] SURFACE` : `TRAVA HIDROSTÁTICA — USE [${tkTipM}] EMERGIR`)
      : (ehEnTip ? '[LMB] TOGGLE HYDRAULIC DRAIN' : '[ESQ] ALTERNAR DRENO HIDRÁULICO');
  } else if (hbHov.idHitbox === 'BTN_DRENAR_SEGURO') {
    lin1 = ehEnTip ? `[${tkTipD}] SAFE DRAIN (STOPS AT 62.5kg)` : `[${tkTipD}] DRENO SEGURO (CORTA 62.5kg)`;
    lin2 = ehTouchdown
      ? (ehEnTip ? `HYDROSTATIC LOCK — PRESS [${tkTipM}] SURFACE` : `TRAVA HIDROSTÁTICA — USE [${tkTipM}] EMERGIR`)
      : (ehEnTip ? 'DUMPS BALLAST WITHOUT CAVITATION' : 'DESCARREGA LASTRO SEM CAVITAÇÃO');
  } else if (hbHov.idHitbox === 'BTN_DRENAR_TUDO') {
    lin1 = ehEnTip ? '[V] PURGE ALL (EMPTIES 100%)' : '[V] DRENAR TUDO (ESVAZIA 100%)';
    lin2 = ehTouchdown
      ? (ehEnTip ? `HYDROSTATIC LOCK — PRESS [${tkTipM}] SURFACE` : `TRAVA HIDROSTÁTICA — USE [${tkTipM}] EMERGIR`)
      : (ehEnTip ? 'WARNING: <62.5kg CAUSES CAVITATION!' : 'RISCO: <62.5kg CAUSA CAVITAÇÃO!');
  } else if (hbHov.idHitbox === 'BTN_MERGULHO_TATICO') {
    const esqFoilAlvo = Math.max(25, Number(viewModel.barraSuperior?.esquivaEfetivaPct || 25));
    lin1 = ehTouchdown
      ? (ehEnTip ? `[${tkTipM}] SURFACE TO FOIL (SPOOL-UP)` : `[${tkTipM}] EMERGIR AO FOIL (SPOOL-UP)`)
      : (ehEnTip ? `[${tkTipM}] TACTICAL DIVE TO SEA` : `[${tkTipM}] MERGULHO TÁTICO AO MAR`);
    lin2 = ehTouchdown
      ? (ehEnTip ? `RESTORES FOIL EVASION (${esqFoilAlvo}%)!` : `RECUPERA ESQUIVA NO FOIL (${esqFoilAlvo}%)!`)
      : (ehEnTip ? '0% EVASION | -25% WEAPON RELOAD' : 'ESQUIVA 0% | RECARGA ARMA -25%');
  } else if (hbHov.tipo === 'SISTEMA_RODAPE') {
    const idCruSys = String(hbHov.metadados.idSistema ?? hbHov.metadados.sistemaId ?? '');
    const mapSysEn = {
      GLANDULA_BARREIRA: 'SHD — BUBBLE SHIELD',
      SIFAO_PROPULSAO: 'SIP — SIPHON THRUST',
      BOMBA_BRANQUIAL: 'GIL — GILL PUMP',
      ARTILHARIA_DORSAL: 'WPN — DORSAL WEAPONS',
      CORTEX_NAVEGACAO: 'CTX — SONAR CORTEX',
      MASTRO_FOIL: 'MST — HYDROFOIL MAST',
      TUBO_PRESSURIZADO: 'BRD — BOARDING LOCK',
      GLANDULA_TINTA_FURTIVA: 'CLK — CLOAKING INK',
    };
    const mapSysPt = {
      GLANDULA_BARREIRA: 'ESC — GLÂNDULA DE BARREIRA',
      SIFAO_PROPULSAO: 'SIF — SIFÃO PROPULSOR',
      BOMBA_BRANQUIAL: 'BRQ — BOMBA BRANQUIAL',
      ARTILHARIA_DORSAL: 'ART — ARTILHARIA DORSAL',
      CORTEX_NAVEGACAO: 'CTX — CÓRTEX DE SONAR',
      MASTRO_FOIL: 'MST — MASTRO HIDROFÓLIO',
      TUBO_PRESSURIZADO: 'TUB — ESCLUSA DE ABORDAGEM',
      GLANDULA_TINTA_FURTIVA: 'TNT — TINTA FURTIVA',
    };
    lin1 = ehEnTip
      ? `SYSTEM ${mapSysEn[idCruSys] ?? `${hbHov.metadados.sigla} (${idCruSys.replace(/_/g, ' ')})`}`
      : `SISTEMA ${mapSysPt[idCruSys] ?? `${hbHov.metadados.sigla} (${idCruSys.replace(/_/g, ' ')})`}`;
    lin2 = ehEnTip ? '[LMB] +1 POWER | [RMB] -1 POWER' : '[ESQ] +1 ENERGIA | [DIR] -1 ENERGIA';
  } else if (hbHov.tipo === 'SLOT_ARMA') {
    const idxSlotTip = Number(hbHov.metadados.slotIndex ?? 0);
    const slotVmTip = viewModel.caixaArmas?.[idxSlotTip] ?? null;
    const tkSlotTip = rotuloTeclaCurtaHud(atalhosTip?.[`ARMA_SLOT_${idxSlotTip + 1}`], String(idxSlotTip + 1));
    const chId = hbHov.metadados.chassiId;
    const siglaTip = chId ? obterSiglaHudArma(chId, viewModel.configuracoesSteam?.idioma) : null;
    const nomeCh = chId
      ? (ehEnTip ? (siglaTip ?? String(chId).replace(/_/g, ' ')) : (NOMES_ARMAS[chId] ?? siglaTip ?? String(chId).replace(/_/g, ' ')))
      : (ehEnTip ? 'EMPTY SLOT' : 'SLOT VAZIO');
    const sufixoMecTip = Number(slotVmTip?.cargasMaximas ?? 0) > 1
      ? (ehEnTip ? ` | CHG ${slotVmTip.cargasEstocadas ?? 0}/${slotVmTip.cargasMaximas}` : ` | CARGAS ${slotVmTip.cargasEstocadas ?? 0}/${slotVmTip.cargasMaximas}`)
      : String(slotVmTip?.mecanicaEspecial ?? '').startsWith('CADEIA')
        ? (ehEnTip ? ` | CHAIN +${slotVmTip.estagioCadeiaAtual ?? 0}` : ` | CADEIA +${slotVmTip.estagioCadeiaAtual ?? 0}`)
        : '';
    lin1 = ehEnTip ? `WEAPON [${tkSlotTip}] — ${nomeCh}${sufixoMecTip}` : `ARMA [${tkSlotTip}] — ${nomeCh}${sufixoMecTip}`;
    lin2 = ehEnTip ? '[LMB] SELECT | [RMB] MAN/AUT MODE' : '[ESQ] SELECIONAR | [DIR] MODO MAN/AUT';
  } else if (hbHov.tipo === 'CARD_TRIPULANTE') {
    const mapEspTipEn = { POLVO: 'OCTOPUS', ARRAIA: 'ELECTRIC RAY', BAIACU: 'SPINY PUFFER', CARANGUEJO: 'AMPHIB CRAB' };
    const espNomeTip = ehEnTip ? (mapEspTipEn[hbHov.metadados.especie] ?? hbHov.metadados.especie) : hbHov.metadados.especie;
    lin1 = `${espNomeTip} — HP ${hbHov.metadados.hpAtual}/${hbHov.metadados.hpMax}`;
    lin2 = hbHov.metadados.localizacao === 'BORDO_INIMIGO'
      ? (ehEnTip ? 'BOARDING! CLICK ENEMY ROOM TO MOVE' : 'A BORDO! CLIQUE NUMA SALA INIMIGA P/ MOVER')
      : (ehEnTip ? '[P] PUFF | [E] ENZYME | [G] BOARD | [B] GILL' : '[P] BAIACU | [E] ENZIMA | [G] ABORDAR | [B] BRQ');
  } else if (hbHov.tipo === 'SALA_ALVO') {
    const mapSalaTipEn = {
      CABINE_COMANDO: 'COMMAND BRIDGE',
      PONTE_DE_COMANDO: 'COMMAND BRIDGE',
      TORRETA_LEVE: 'LIGHT TURRET',
      TORRETA_DUPLA: 'TWIN TURRET',
      CONVES_DE_ARTILHARIA: 'GUN DECK',
      GERADOR_ESCUDO: 'SHIELD GENERATOR',
      GERADOR_DE_ESCUDO: 'SHIELD GENERATOR',
      SONAR_MILITAR: 'MILITARY SONAR',
      GUINDASTE_MAGNETICO: 'MAGNETIC CRANE',
      TUBO_TORPEDO: 'TORPEDO TUBE',
      PAIOL_DE_MUNICAO: 'AMMO MAGAZINE',
      SALA_DE_MAQUINAS: 'ENGINE ROOM',
      TENTACULOS: 'TENTACLES',
      BICO_QUITINOSO: 'CHITIN BEAK',
      SIFAO_MUSCULAR: 'SIPHON JET',
      GANGLIO_CENTRAL: 'CORE GANGLION',
      NUCLEO_COMANDO_DRAGA: 'DREDGE CMD CORE',
      TORRE_ARTILHARIA_PESADA: 'HEAVY ARTILLERY',
      BATERIA_MISSEIS_TERMICOS: 'THERMAL MISSILES',
      CALDEIRA_FERVURA_GEOTERMICA: 'GEOTHERMAL BOILER',
      BROCA_ABISSAL: 'ABYSSAL DRILL',
      PROPULSAO_LAGARTA: 'CRAWLER DRIVE',
      'PONTE DE COMANDO BLINDADA': 'ARMORED BRIDGE',
      'TORRE DO CANHÃO DE ARPÃO TRIPLO': 'TRIPLE HARPOON',
      'TORRE DO LANÇADOR DE MÍSSEIS TÉRMICOS': 'THERMAL MISSILES',
      'TORRE DO GERADOR DE REDE MAGNÉTICA': 'MAGNETIC NET',
      'GERADOR DE ESCUDO ACÚSTICO TRIPLO': 'TRIPLE ACOUSTIC SHIELD',
      'CASA DE MÁQUINAS E BOMBAS DE PORÃO': 'ENGINE & BILGE PUMPS',
      'PONTE DE COMANDO CENTRAL': 'CENTRAL BRIDGE',
      'BATERIA DE CANHÃO DE ARPÃO TRIPLO': 'TRIPLE HARPOON',
      'CORTADOR INDUSTRIAL A PLASMA PESADO': 'HEAVY PLASMA CUTTER',
      'HANGAR DE CONTROLE DE DRONES E SONAR MILITAR': 'DRONES & SONAR BAY',
      'REATOR HIDRÁULICO E BOMBAS SUBMERSAS': 'HYDRAULIC REACTOR',
      'NÚCLEO DE COMANDO AUTÔNOMO': 'AUTONOMOUS CORE',
      'BATERIA DE ARPÃO TRIPLO DE ALTA PRESSÃO': 'HIGH-PRESSURE HARPOON',
      'LANÇADOR DE MÍSSEIS TÉRMICOS PESADOS': 'HEAVY THERMAL MISSILES',
      'GERADOR DE ESCUDO QUÁDRUPLO E BLINDAGEM TÉRMICA': 'QUAD THERMAL SHIELD',
      'BROCA GEOTÉRMICA E PROPULSÃO ABISSAL': 'GEOTHERMAL DRILL',
    };
    const chaveSalaTip = String(hbHov.metadados.nomeSala ?? '');
    const nomeLimpoSala = ehEnTip
      ? (mapSalaTipEn[chaveSalaTip.toUpperCase()] ?? chaveSalaTip.replace(/_/g, ' '))
      : (NOMES_SALAS[hbHov.metadados.nomeSala] ?? chaveSalaTip.replace(/_/g, ' '));
    const intS = hbHov.metadados.integridade ?? 1;
    const maxS = hbHov.metadados.integridadeMax ?? intS;
    lin1 = ehEnTip ? `TARGET: ${nomeLimpoSala} [INT ${intS}/${maxS}]` : `ALVO: ${nomeLimpoSala} [INT ${intS}/${maxS}]`;
    lin2 = ehEnTip ? '[LMB] AIM / BEAM | [RMB] BOARD TARGET' : '[ESQ] MIRAR / BEAM | [DIR] ALVO/MOVER BORDO';
  } else if (hbHov.idHitbox === 'BTN_LANCAR_ABORDAGEM') {
    const resAb = viewModel.resumoAbordagem ?? {};
    const sAlvoAb = opcoes.salaAlvoAbordagemId ?? resAb.salaAlvoPadraoId ?? 1;
    lin1 = ehEnTip ? `[G] BOARDING POD -> ROOM S${sAlvoAb}` : `[G] CÁPSULA DE ABORDAGEM → SALA S${sAlvoAb}`;
    lin2 = ehEnTip ? '[RMB] ON ENEMY ROOM SETS POD TARGET' : '[DIR] NUMA SALA INIMIGA MUDA ALVO DA CÁPSULA';
  } else if (hbHov.idHitbox === 'BTN_MODO_DISPARO') {
    const modoEn = modoSalvaGlobal === 'MANUAL' ? 'MANUAL' : 'AUTO';
    lin1 = ehEnTip ? `[A] VOLLEY MODE: ${modoEn}` : `[A] MODO DE SALVA: ${modoSalvaGlobal}`;
    lin2 = ehEnTip ? 'TOGGLES AUTO-FIRE vs MANUAL HOLD' : 'ALTERNA DISPARO AUTOMÁTICO vs RETENÇÃO MANUAL';
  } else if (hbHov.idHitbox === 'BTN_DISPARAR_SALVA') {
    lin1 = ehEnTip ? '[X] FIRE SYNCHRONIZED VOLLEY!' : '[X] DISPARAR SALVA SINCRONIZADA!';
    lin2 = ehEnTip ? 'RELEASES ALL CHARGED MANUAL WEAPONS' : 'LIBERA TODAS AS ARMAS CARREGADAS SIMULTANEAMENTE';
  } else if (hbHov.idHitbox === 'BTN_ABRIR_OFICINA') {
    lin1 = ehEnTip ? '[U] BIO-WORKSHOP & CARGO HOLD' : '[U] OFICINA BIO-MECÂNICA & PORÃO DE CARGA';
    lin2 = ehEnTip ? '10 UPGRADE TREES, WEAPONS & ORGANS' : '10 ÁRVORES DE UPGRADE, ARMAS DORSAIS E ÓRGÃOS';
  } else if (hbHov.idHitbox === 'OFICINA_ABANDONAR_RUN') {
    lin1 = ehEnTip ? 'ABANDON CURRENT RUN (2-STEP CONFIRM)' : 'ABANDONAR EXPEDIÇÃO ATUAL (2 ETAPAS)';
    lin2 = ehEnTip ? 'ENDS EXPEDITION & RETURNS TO HANGAR' : 'ENCERRA A RUN E RETORNA AO HANGAR DE BIO-NAVES';
  } else if (hbHov.idHitbox === 'EVENTO_DESFECHO_CONFIRMAR') {
    lin1 = ehEnTip ? '[ENTER] CONFIRM ENCOUNTER LOG' : '[ENTER] CONFIRMAR RELATÓRIO DO ENCONTRO';
    lin2 = ehEnTip ? 'CLOSES REPORT & RETURNS TO CHART' : 'FECHA O DIÁRIO DE BORDO E RETOMA A CARTA ABISSAL';
  } else if (hbHov.idHitbox === 'BTN_ALTERNAR_AUDIO') {
    lin1 = ehEnTip
      ? (viewModel.audioMutado ? 'AUDIO: MUTED [K]' : 'AUDIO: HYDRO-SYNTH ACTIVE [K]')
      : (viewModel.audioMutado ? 'ÁUDIO MARÍTIMO: SILENCIADO [K]' : 'ÁUDIO MARÍTIMO: SINTETIZADOR ATIVO [K]');
    lin2 = ehEnTip ? '[LMB] OR [K] TOGGLE MUSIC + FOLEY SFX' : '[ESQ] OU [K] ALTERNAR PAISAGEM + TRILHA + SFX';
  } else if (hbHov.tipo === 'NO_MAPA') {
    const mN = hbHov.metadados ?? {};
    const nomeBoiaTip = String(mN.noDestinoId ?? '')
      .replace(/^NO_/, ehEnTip ? 'BUOY ' : 'BOIA ')
      .replace(/_/g, '-');
    const mapTipoNoEn = { ENTRADA: 'ENTRY', COMBATE: 'COMBAT', LOJA: 'SHOP', SOS: 'SOS', EXPLORACAO: 'EXPLORE', PERIGO: 'HAZARD', SAIDA: 'EXIT' };
    const brutoTipoTip = String(mN.tipoNo ?? mN.tipo ?? 'ROTA');
    const tipoNoTip = ehEnTip ? (mapTipoNoEn[brutoTipoTip] ?? brutoTipoTip.replace(/_/g, ' ')) : brutoTipoTip.replace(/_/g, ' ');
    const tagEstado = mN.engolidoCorporacao
      ? (ehEnTip ? ' — CORP FLEET (0 LOOT)' : ' — FROTA CORP (0 SAQUE)')
      : mN.sosExpirado
        ? (ehEnTip ? ' — DEAD ZONE (-50% SCR)' : ' — ZONA MORTA (-50% SUC)')
        : mN.inteligenciaRevelada && mN.subtipoCurto
          ? ` — ${mN.subtipoCurto}`
          : '';
    lin1 = `${nomeBoiaTip} [${tipoNoTip}]${tagEstado}`.slice(0, 48);
    if (mN.ehAtual) {
      lin2 = ehEnTip ? 'CURRENT BIO-CRAFT POSITION' : 'POSIÇÃO ATUAL DA BIO-NAVE NESTA CARTA';
    } else if (mN.alcancavel) {
      const rAt = mN.rotaAtiva ?? {};
      const txtCorr =
        rAt.tipoCorrente === 'FAVORAVEL'
          ? 'FAV 0.75x'
          : rAt.tipoCorrente === 'REVOLTO'
            ? (ehEnTip ? 'ROUGH 1.35x' : 'REVOLTO 1.35x')
            : 'NORMAL 1.0x';
      const txtH = rAt.horasViagem !== undefined ? `${rAt.horasViagem}h` : '2.0h';
      const alertaExtra = rAt.engolidoNoSalto
        ? (ehEnTip ? ' | FLEET CATCHES!' : ' | DRAGA ALCANÇA!')
        : rAt.expiraSosNoSalto
          ? (ehEnTip ? ' | SOS EXPIRES!' : ' | SOS EXPIRA!')
          : mN.horasRestantesSos !== null && !mN.sosExpirado
            ? (ehEnTip ? ` | LIMIT ${mN.horasRestantesSos}h` : ` | PRAZO ${mN.horasRestantesSos}h`)
            : '';
      lin2 = `${ehEnTip ? '[LMB] JUMP' : '[ESQ] SALTAR'} (${txtCorr}, ${txtH})${alertaExtra}`.slice(0, 48);
    } else {
      lin2 = (
        mN.inteligenciaRevelada && mN.detalheInteligencia
          ? `${ehEnTip ? 'OUT OF RANGE' : 'FORA DE ALCANCE'} | ${mN.detalheInteligencia}`
          : (ehEnTip ? 'OUT OF DIRECT RANGE — NO ACTIVE LANE' : 'FORA DE ALCANCE DIRETO — SEM ROTA ATUAL')
      ).slice(0, 48);
    }
  }

  const largTip = Math.min(360, Math.max(lin1.length, lin2.length) * 7 + 14);
  const altTip = 28;
  let tx0 = Math.max(158, Math.min(W - largTip - 8, hbHov.x));
  let ty0 = hbHov.y >= 420 ? hbHov.y - altTip - 6 : hbHov.y + hbHov.altura + 6;

  if (hbHov.tipo === 'BOTAO_TERMOMETRO') {
    tx0 = 158;
    ty0 = Math.max(44, Math.min(394, hbHov.y - 4));
    lineSeg(151, hbHov.y + Math.floor(hbHov.altura / 2), tx0 - 1, ty0 + 14, YELLOW, false);
  } else if (hbHov.tipo === 'SALA_ALVO') {
    const minSalaY = Math.min(
      ...hitboxes.filter((h) => h.tipo === 'SALA_ALVO').map((h) => h.y)
    );
    if (ehChefeDraga) {
      tx0 = 156;
      ty0 = 44;
      lineSeg(tx0 + largTip + 1, ty0 + 14, hbHov.x - 2, hbHov.y + Math.floor(hbHov.altura / 2), YELLOW, true);
    } else if (minSalaY >= 176) {
      tx0 = Math.max(564, Math.min(W - largTip - 6, hbHov.x));
      ty0 = 144;
      const xAncS = Math.min(tx0 + largTip - 8, Math.max(tx0 + 8, hbHov.x + Math.floor(hbHov.largura / 2)));
      lineSeg(xAncS, ty0 + altTip + 1, hbHov.x + Math.floor(hbHov.largura / 2), hbHov.y - 1, YELLOW, true);
    } else {
      tx0 = Math.max(158, hbHov.x - largTip - 8);
      ty0 = Math.max(44, Math.min(394, hbHov.y));
      lineSeg(tx0 + largTip + 1, ty0 + 14, hbHov.x - 1, hbHov.y + Math.floor(hbHov.altura / 2), YELLOW, true);
    }
  } else if (hbHov.tipo === 'NO_MAPA') {
    const nosMapaHbs = hitboxes.filter((h) => h.tipo === 'NO_MAPA');
    const noAtualIdTip = viewModel.mapaSetorialResumo?.noAtualId ?? '';
    const cxPertoDir = Math.max(224, Math.min(W - largTip - 12, hbHov.x + hbHov.largura + 14));
    const cxPertoEsq = Math.max(224, Math.min(W - largTip - 12, hbHov.x - 12));
    const candidatosNo = [
      [cxPertoDir, hbHov.y - 4],
      [cxPertoEsq, hbHov.y - altTip - 10],
      [cxPertoEsq, hbHov.y + hbHov.altura + 18],
    ];
    const gradeCandidatos = [];
    for (const cxVar of [cxPertoDir, 224, 344, 520]) {
      if (cxVar + largTip > W - 12) continue;
      for (let cyVar = 104; cyVar <= 368; cyVar += 2) {
        gradeCandidatos.push([cxVar, cyVar]);
      }
    }
    gradeCandidatos.sort(
      (a, b) =>
        Math.abs(a[1] - hbHov.y) + Math.abs(a[0] - cxPertoDir) * 0.35 -
        (Math.abs(b[1] - hbHov.y) + Math.abs(b[0] - cxPertoDir) * 0.35)
    );
    for (const parG of gradeCandidatos) candidatosNo.push(parG);

    tx0 = candidatosNo[0][0];
    ty0 = candidatosNo[0][1];
    for (const [cxTip, cyTip] of candidatosNo) {
      if (cyTip < 70 || cyTip + altTip > 398) continue;
      if (cxTip < 254 && cyTip < 88) continue;
      if (cxTip + largTip > 832 && cyTip < 166) continue;
      const bateEmNo = nosMapaHbs.some((n) => {
        const ehAt = Boolean(n.metadados?.ehAtual) || n.metadados?.noDestinoId === noAtualIdTip || n.metadados?.noId === noAtualIdTip;
        const yTopoN = ehAt ? n.y - 31 : (n.y + n.altura + 14 >= 398 ? n.y - 14 : n.y - 3);
        const yBaseN = n.y + n.altura + 16;
        return (
          cxTip < n.x + n.largura + 12 &&
          cxTip + largTip > n.x - 12 &&
          cyTip < yBaseN &&
          cyTip + altTip > yTopoN
        );
      });
      if (!bateEmNo) {
        tx0 = cxTip;
        ty0 = cyTip;
        break;
      }
    }
    const xAncNo = hbHov.x + Math.floor(hbHov.largura / 2);
    const yAncNo = hbHov.y + Math.floor(hbHov.altura / 2);
    const xAncTip = tx0 > xAncNo ? tx0 - 1 : Math.min(tx0 + largTip - 10, Math.max(tx0 + 10, xAncNo));
    const yAncTip = tx0 > xAncNo ? ty0 + 14 : (ty0 < yAncNo ? ty0 + altTip + 1 : ty0 - 1);
    lineSeg(xAncTip, yAncTip, xAncNo, yAncNo, YELLOW, true);
  } else if (hbHov.tipo === 'CAMARA_BIONAVE' || hbHov.tipo === 'VALVULA_EXTERNA') {
    tx0 = 156;
    ty0 = 44;
    const dySubTip = ev60 ? Math.round((Number(ev60.deslocamentoCascoPx ?? (ehTouchdown ? 100 : 0)) - (ehTouchdown ? 100 : 0)) * 0.24) : 0;
    const xAncora = Math.min(tx0 + largTip - 8, Math.max(tx0 + 10, hbHov.x));
    lineSeg(xAncora, ty0 + altTip + 1, hbHov.x + Math.floor(hbHov.largura / 2), hbHov.y + dySubTip, YELLOW, true);
  } else if (ty0 + altTip > 426) {
    ty0 = Math.max(44, hbHov.y - altTip - 6);
  }

  chanfradoBezel(tx0, ty0, tx0 + largTip, ty0 + altTip, [6, 12, 18, 250], YELLOW, 3, CYAN);
  txt(tx0 + 6, ty0 + 5, lin1.slice(0, 50), YELLOW, 7);
  txt(tx0 + 6, ty0 + 16, lin2.slice(0, 50), TXT, 7);
}
