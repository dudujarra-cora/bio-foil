/**
 * ONDA 6 — Renderizadores Puros das Telas e Modais de Campanha (Hangar, Fim de Run, Mapa, Loja, Evento, Saque, Desfecho e Oficina)
 * Dono Único (Lei N5): src/onda6-ui/renderizador-telas-campanha.mjs
 *
 * Responsabilidades:
 *  - Renderizar `INICIO` (Doca Simbiótica das 5 Bio-Naves) e `FIM_DE_RUN` (Vitória com naufrágio Hi-Bit real da Draga ou Permadeath);
 *  - Renderizar os viewports centrais não-combate (`MAPA` Carta Hidrográfica, `LOJA` Recife-Forja com estoque finito, venda direta do Porão e 2 botões de digestão, `EVENTO`);
 *  - Renderizar os modais táticos sobrepostos (`SAQUE` Pós-Combate, `EVENTO_DESFECHO` e `OFICINA` Bio-Mecânica de 10 Árvores + Porão de Carga + Abandonar Run).
 *
 * Nota de Paridade (0-Byte Diff): Módulo puro e isomórfico (0 imports Node.js, 0 structuredClone),
 * garantindo paridade 0-byte entre Servidor e Navegador.
 */
import {
  calcularRetanguloCardHangar960,
  calcularRetanguloVendaPoraoLoja960,
  calcularGeometriaOficina960,
  calcularRetangulosModaisCampanha960,
} from './geometria-layout-960.mjs';
import {
  resolverLayoutTopologiaNave,
  calcularRetangulosCamarasMoldadas960,
} from '../onda7-steam/topologias-naves-ab.mjs';
import { obterSiglaHudArma } from '../onda7-steam/i18n-dicionario-ui.mjs';

export function renderizarTelaHangarOuFimDeRun(ctx) {
  const {
    W,
    H,
    rgba,
    viewModel,
    assets,
    hitboxes,
    f4Anim,
    tempoSeg,
    idHoverAtivo,
    idPressAtivo,
    faseJogo,
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
    NOMES_CARC,
    obterPerfilLimpo,
    putPx,
    fillRect,
    hLine,
    chanfradoBezel,
    panel,
    txt,
    segBar,
    lock,
    desenharPersonagemPose4F,
    desenharMiniaturaBioNaveHiBit,
  } = ctx;

  for (let py = 0; py < H; py += 1) {
    const my = assets.mapaPlay ? Math.min(assets.mapaPlay.altura - 1, Math.floor((py * assets.mapaPlay.altura) / H)) : 0;
    for (let px = 0; px < W; px += 1) {
      const dth = ((px + py) & 1) === 0 ? 1 : -1;
      let rB = 6;
      let gB = 13;
      let bB = 21;
      if (assets.mapaPlay && py > 42) {
        const mxBruto = Math.floor((px * assets.mapaPlay.largura) / W);
        const mx = Math.max(0, Math.min(assets.mapaPlay.largura - 1, mxBruto < 700 ? mxBruto : 699 - (mxBruto - 700)));
        const mOff = (my * assets.mapaPlay.largura + mx) * 4;
        rB = Math.max(5, Math.min(24, Math.round(assets.mapaPlay.rgba[mOff] * 0.72 + 3 + dth)));
        gB = Math.max(9, Math.min(38, Math.round(assets.mapaPlay.rgba[mOff + 1] * 0.75 + 5 + dth)));
        bB = Math.max(15, Math.min(54, Math.round(assets.mapaPlay.rgba[mOff + 2] * 0.82 + 8 + dth)));
      }
      const feixeCaustico = Math.sin(px * 0.014 - py * 0.008 + tempoSeg * 1.4);
      if (feixeCaustico > 0.78 && py > 42 && py < 438) {
        gB = Math.min(64, gB + 7);
        bB = Math.min(82, bB + 10);
      }
      putPx(px, py, [rB, gB, bB, 255]);
    }
  }
  for (let ip = 0; ip < 26; ip += 1) {
    const bxP = 18 + ((ip * 79 + Math.round(tempoSeg * 12)) % (W - 36));
    const byP = 48 + ((ip * 43 + H - Math.round(tempoSeg * 18) % 360) % 382);
    putPx(bxP, byP, ip % 3 === 0 ? CYAN : ip % 3 === 1 ? GREEN : [132, 86, 214, 210]);
  }

  panel(0, 0, W - 1, 42);
  const ehEnHangar = viewModel.configuracoesSteam?.idioma === 'en-US';
  const hbSomTopo =
    hitboxes.find((h) => h.idHitbox === 'BTN_ALTERNAR_AUDIO') ??
    (viewModel.modalSteamAtivo
      ? { idHitbox: 'BTN_ALTERNAR_AUDIO', x: 884, y: 10, largura: 68, altura: 22 }
      : null);
  if (hbSomTopo) {
    const hovSom = idHoverAtivo === hbSomTopo.idHitbox;
    const mudo = Boolean(viewModel.audioMutado);
    const rotSomTopo = mudo
      ? (ehEnHangar ? 'MUTED' : 'MUDO')
      : (ehEnHangar ? 'AUDIO ON' : 'SOM ON');
    const padXSom = hbSomTopo.largura >= 68
      ? Math.max(4, Math.floor((hbSomTopo.largura - (rotSomTopo.length * 7 - 1)) / 2))
      : 6;
    chanfradoBezel(
      hbSomTopo.x,
      hbSomTopo.y,
      hbSomTopo.x + hbSomTopo.largura - 1,
      hbSomTopo.y + hbSomTopo.altura - 1,
      mudo ? [38, 20, 18, 255] : [12, 38, 44, 255],
      hovSom ? YELLOW : mudo ? AMBER : CYAN,
      2
    );
    txt(hbSomTopo.x + padXSom, hbSomTopo.y + 7, rotSomTopo, hovSom ? YELLOW : mudo ? AMBER : GREEN, 7);
  }

  if (faseJogo === 'INICIO') {
    const hangar = viewModel.hangarResumo ?? {};
    const carcSel = hangar.idArquiteturaSelecionada ?? idCarcaca;
    const padraoNaves = [
      { id: 'CARCACA_ALFA', nome: 'CARCAÇA ALFA', papel: 'HIDRO-EQUILÍBRIO', hpMax: 30, reator: 7, pesoBaseKg: 115, armaInicial: 'ARPÃO + ACÚSTICO I', tripulacao: ['POLVO', 'ARRAIA', 'BAIACU'], desbloqueada: true, requisito: 'DISPONÍVEL DE FÁBRICA' },
      { id: 'MANTA_VOLT', nome: 'MANTA-VOLT', papel: 'PULSO BIO-ELÉTRICO', hpMax: 25, reator: 8, pesoBaseKg: 95, armaInicial: 'ACÚSTICO + ELETRO', tripulacao: ['ARRAIA', 'ARRAIA', 'POLVO'], desbloqueada: false, requisito: 'SETOR 4+ SEM DANO' },
      { id: 'COURACA_LIMIAR', nome: 'COURAÇA-LIMIAR', papel: 'ASSALTO & ABORDAGEM', hpMax: 30, reator: 6, pesoBaseKg: 110, armaInicial: 'ARPÃO DE CABO', tripulacao: ['CARANGUEJO', 'CARANGUEJO', 'BAIACU'], desbloqueada: false, requisito: 'ABATER TRIP. DE BARCO' },
      { id: 'SOMBRA_ABISSAL', nome: 'SOMBRA-ABISSAL', papel: 'FURTIVA & PLASMA', hpMax: 20, reator: 6, pesoBaseKg: 90, armaInicial: 'CORTADOR TÉRMICO', tripulacao: ['POLVO', 'CARANGUEJO'], desbloqueada: false, requisito: 'CHEGAR AO SETOR 5' },
      { id: 'COLMEIA_VIVA', nome: 'COLMEIA VIVA', papel: 'SIMBIOSE & ESPOROS', hpMax: 30, reator: 7, pesoBaseKg: 100, armaInicial: 'RAJADA II + ESPOROS', tripulacao: ['BAIACU', 'BAIACU', 'ARRAIA'], desbloqueada: false, requisito: 'EXTRAÇÃO CIRÚRGICA' },
    ];
    const navesLista = padraoNaves.map((pad, idx) => {
      const ext = hangar.naves?.[idx];
      return ext ? { ...pad, ...ext } : pad;
    });
    const idiomaTela = viewModel.configuracoesSteam?.idioma === 'en-US' ? 'en-US' : 'pt-BR';
    const desbloqCount = navesLista.filter((n) => n.desbloqueada).length;
    txt(
      12,
      8,
      idiomaTela === 'en-US'
        ? 'BIO-FOIL — SYMBIOTIC BIO-SHIP HANGAR'
        : 'BIO-FOIL — DOCA SIMBIÓTICA DE BIO-NAVES',
      CYAN,
      8
    );
    txt(
      12,
      24,
      idiomaTela === 'en-US'
        ? `8-SECTOR CAMPAIGN | PROFILE: ${hangar.totalRuns ?? 0} RUNS | ${hangar.totalVitorias ?? 0} WINS | ${desbloqCount}/5 SHIPS`
        : `CAMPANHA 8 SETORES | PERFIL: ${hangar.totalRuns ?? 0} RUNS | ${hangar.totalVitorias ?? 0} VITÓRIAS | ${desbloqCount}/5 BIO-NAVES`,
      AMBER,
      7
    );

    chanfradoBezel(24, 52, 935, 98, [8, 16, 25, 240], BORDER, 3, RIM);
    txt(
      36,
      60,
      idiomaTela === 'en-US'
        ? 'CHOOSE YOUR BIOLOGICAL HULL ARCHITECTURE TO CROSS ALL 8 SECTORS BEFORE THE DREDGE'
        : 'ESCOLHA A ARQUITETURA BIOLÓGICA PARA CRUZAR OS 8 SETORES ANTES DA DRAGA CONTINENTAL',
      TXT,
      7
    );
    txt(
      36,
      76,
      idiomaTela === 'en-US'
        ? 'EACH SPECIES HAS UNIQUE HYDRODYNAMICS, BIO-ELECTRIC HEART, ORGANS AND SYMBIOTIC CREW'
        : 'CADA ESPÉCIE TEM HIDRODINÂMICA, CORAÇÃO BIO-ELÉTRICO, ÓRGÃOS E TRIPULAÇÃO SIMBIÓTICA PRÓPRIOS',
      CYAN,
      7
    );

    navesLista.forEach((nv, idx) => {
      const hbN = hitboxes.find((h) => h.idHitbox === `HANGAR_NAVE_${nv.id}`) ?? calcularRetanguloCardHangar960(idx);
      const sel = carcSel === nv.id;
      const hov = idHoverAtivo === hbN.idHitbox;
      const dyP = idPressAtivo === hbN.idHitbox ? 1 : 0;
      const corBordaCard = hov ? YELLOW : sel ? CYAN : nv.desbloqueada ? GREEN : [56, 74, 88, 255];
      chanfradoBezel(
        hbN.x,
        hbN.y + dyP,
        hbN.x + hbN.largura - 1,
        hbN.y + hbN.altura - 1 + dyP,
        sel ? [12, 28, 40, 250] : nv.desbloqueada ? [9, 18, 27, 246] : [8, 13, 19, 242],
        corBordaCard,
        4,
        sel || hov ? TXT : RIM
      );
      const idiomaHang = viewModel.configuracoesSteam?.idioma === 'en-US' ? 'en-US' : 'pt-BR';
      const varHang = viewModel.hangarResumo?.varianteSelecionada === 'B' ? 'B' : 'A';
      const topoHang = resolverLayoutTopologiaNave(`${nv.id}_${varHang}`);
      const titCardHang = idiomaHang === 'en-US' ? topoHang.nomeCurtoCardEn : topoHang.nomeCurtoCardPt;
      const papelHang = idiomaHang === 'en-US' ? topoHang.papelCurtoEn : topoHang.papelCurtoPt;
      const armaCardHang = idiomaHang === 'en-US' ? topoHang.armaResumoCardEn : topoHang.armaResumoCardPt;

      fillRect(hbN.x + 4, hbN.y + 3 + dyP, hbN.x + hbN.largura - 5, hbN.y + 20 + dyP, sel ? [18, 52, 68, 235] : [13, 24, 34, 225]);
      txt(hbN.x + 8, hbN.y + 7 + dyP, `[${idx + 1}] ${titCardHang}`, sel ? YELLOW : nv.desbloqueada ? CYAN : DIM, 7);

      const tx0N = hbN.x + 8;
      const ty0N = hbN.y + 25 + dyP;
      const tx1N = hbN.x + hbN.largura - 9;
      const ty1N = hbN.y + 114 + dyP;
      chanfradoBezel(tx0N, ty0N, tx1N, ty1N, [6, 17, 26, 255], sel ? CYAN : BORDER, 3);
      fillRect(tx0N + 2, ty0N + 62, tx1N - 2, ty1N - 2, [14, 48, 64, 185]);
      hLine(tx0N + 2, tx1N - 2, ty0N + 62, CYAN, 1);
      const exibirMiniTopoSteam = Boolean(viewModel.edicaoComercialSteam || viewModel.hangarResumo?.varianteSelecionada);
      desenharMiniaturaBioNaveHiBit(
        tx0N + (exibirMiniTopoSteam ? 3 : 6),
        ty0N + 8,
        exibirMiniTopoSteam ? 112 : 148,
        66,
        nv.id,
        exibirMiniTopoSteam ? { variante: varHang } : null
      );
      if (exibirMiniTopoSteam) {
        const bx0M = tx1N - 41;
        const by0M = ty0N + 20;
        const bx1M = tx1N - 4;
        const by1M = ty1N - 4;
        const corDestTopo = varHang === 'B'
          ? [...(topoHang.corDestaqueCascoRgba ?? CYAN).slice(0, 3), 245]
          : (sel ? CYAN : [72, 186, 206, 235]);
        chanfradoBezel(bx0M, by0M, bx1M, by1M, [5, 13, 21, 238], varHang === 'B' ? corDestTopo : [32, 68, 86, 235], 2);
        const moldMini = calcularRetangulosCamarasMoldadas960({
          idArquitetura: nv.id,
          varianteLayout: varHang,
          ehTouchdown: false,
          ehMonstroAlvo: false,
        });
        const camsMini = Object.values(moldMini.camaras);
        const minXM = Math.min(...camsMini.map((c) => c.x));
        const maxXM = Math.max(...camsMini.map((c) => c.x + c.largura));
        const minYM = Math.min(...camsMini.map((c) => c.y));
        const maxYM = Math.max(...camsMini.map((c) => c.y + c.altura));
        const mapMiniX = (vx) => bx0M + 3 + Math.round(((vx - minXM) / Math.max(1, maxXM - minXM)) * (bx1M - bx0M - 6));
        const mapMiniY = (vy) => by0M + 3 + Math.round(((vy - minYM) / Math.max(1, maxYM - minYM)) * (by1M - by0M - 6));
        const centrosMini = new Map();
        for (const cm of camsMini) {
          const rx0 = mapMiniX(cm.x);
          const ry0 = mapMiniY(cm.y);
          const rx1 = Math.max(rx0 + 4, mapMiniX(cm.x + cm.largura) - 1);
          const ry1 = Math.max(ry0 + 4, mapMiniY(cm.y + cm.altura) - 1);
          fillRect(rx0, ry0, rx1, ry1, varHang === 'B' ? [18, 38, 48, 245] : [12, 30, 42, 245], corDestTopo);
          centrosMini.set(cm.camaraId, [Math.round((rx0 + rx1) * 0.5), Math.round((ry0 + ry1) * 0.5)]);
        }
        for (let ca = 1; ca <= 8; ca += 1) {
          const pA = centrosMini.get(ca);
          if (!pA) continue;
          for (const cb of topoHang.grafoAdjacencia[ca] ?? []) {
            if (cb <= ca) continue;
            const pB = centrosMini.get(cb);
            if (!pB) continue;
            const mxP = Math.round((pA[0] + pB[0]) * 0.5);
            const myP = Math.round((pA[1] + pB[1]) * 0.5);
            putPx(mxP, myP, varHang === 'B' ? YELLOW : GREEN);
          }
        }
      }
      const tipoBLibCard = varHang !== 'B' || (nv.desbloqueadaVarianteB ?? true);
      const desbloqEfetivaCard = Boolean(nv.desbloqueada && tipoBLibCard);
      if (!desbloqEfetivaCard) {
        fillRect(tx0N + 2, ty0N + 2, tx1N - 2, ty1N - 2, [5, 9, 14, 118]);
        lock(tx1N - 14, ty0N + 6, AMBER);
      } else if (sel) {
        chanfradoBezel(tx1N - 38, ty0N + 4, tx1N - 4, ty0N + 15, [12, 48, 36, 255], GREEN, 2);
        txt(tx1N - 34, ty0N + 7, idiomaHang === 'en-US' ? 'READY' : 'ATIVA', GREEN, 6);
      }

      txt(hbN.x + 8, hbN.y + 121 + dyP, papelHang, desbloqEfetivaCard ? AMBER : DIM, 6);
      hLine(hbN.x + 8, hbN.x + hbN.largura - 9, hbN.y + 132 + dyP, [26, 46, 60, 220], 1);

      txt(hbN.x + 8, hbN.y + 138 + dyP, `${idiomaHang === 'en-US' ? 'HULL' : 'CASCO'} ${nv.hpMax ?? 30}`, TXT, 6);
      segBar(hbN.x + 68, hbN.y + 138 + dyP, 10, Math.min(10, Math.max(1, Math.round(Number(nv.hpMax ?? 30) / 3))), 7, 6, 2, GREEN);
      txt(hbN.x + 8, hbN.y + 152 + dyP, `${idiomaHang === 'en-US' ? 'POWER' : 'REATOR'} ${nv.reator ?? 8}`, TXT, 6);
      segBar(hbN.x + 68, hbN.y + 152 + dyP, 10, Math.min(10, Number(nv.reator ?? 8)), 7, 6, 2, CYAN);
      txt(hbN.x + 8, hbN.y + 166 + dyP, `${idiomaHang === 'en-US' ? 'MASS' : 'MASSA'}: ${nv.pesoBaseKg ?? 115} kg`, AMBER, 6);
      txt(hbN.x + 8, hbN.y + 180 + dyP, `${idiomaHang === 'en-US' ? 'GUN' : 'ARMA'}: ${armaCardHang}`, TXT, 6);

      chanfradoBezel(hbN.x + 8, hbN.y + 194 + dyP, hbN.x + hbN.largura - 9, hbN.y + 236 + dyP, [6, 13, 20, 255], [24, 44, 58, 255], 2);
      const listaTrip = Array.isArray(nv.tripulacao) ? nv.tripulacao : ['POLVO', 'ARRAIA', 'BAIACU'];
      const espacoTrip = listaTrip.length >= 4 ? 35 : 38;
      const xIniTrip = listaTrip.length >= 4 ? 26 : 30;
      listaTrip.slice(0, 4).forEach((esp, idxT) => {
        const cxT = hbN.x + xIniTrip + idxT * espacoTrip;
        const cyT = hbN.y + 215 + dyP;
        desenharPersonagemPose4F(esp, (f4Anim + idxT) % 2, cxT, cyT, 28, 28, false, false);
      });

      const mapaBloqCurtoPt = {
        MANTA_VOLT: 'SETOR 4 (0 DANO CASCO)',
        COURACA_LIMIAR: 'VENCER EM TOUCHDOWN',
        SOMBRA_ABISSAL: 'ACUMULAR 500 BIOMASSA',
        COLMEIA_VIVA: 'DERROTAR DRAGA S8',
      };
      const mapaBloqCurtoEn = {
        MANTA_VOLT: 'SECTOR 4 (0 HULL DMG)',
        COURACA_LIMIAR: 'WIN IN TOUCHDOWN',
        SOMBRA_ABISSAL: 'COLLECT 500 BIOMASS',
        COLMEIA_VIVA: 'DEFEAT DREDGE S8',
      };
      const statusRod = !nv.desbloqueada
        ? ((idiomaHang === 'en-US' ? mapaBloqCurtoEn[nv.id] : mapaBloqCurtoPt[nv.id]) ?? 'BLOQUEADA')
        : !tipoBLibCard
          ? (idiomaHang === 'en-US' ? '[B] NEEDS SHIP ACHV' : '[B] EXIGE CONQUISTAS')
          : sel
            ? (idiomaHang === 'en-US' ? 'SELECTED TO LAUNCH' : 'SELECIONADA P/ ZARPAR')
            : (idiomaHang === 'en-US' ? 'CLICK TO SELECT' : 'CLIQUE P/ SELECIONAR');
      chanfradoBezel(
        hbN.x + 8,
        hbN.y + 242 + dyP,
        hbN.x + hbN.largura - 9,
        hbN.y + hbN.altura - 7 + dyP,
        desbloqEfetivaCard ? [12, 36, 30, 255] : [30, 16, 20, 255],
        desbloqEfetivaCard ? (sel ? CYAN : GREEN) : !nv.desbloqueada ? RED : AMBER,
        2
      );
      txt(hbN.x + 12, hbN.y + 250 + dyP, statusRod, desbloqEfetivaCard ? (sel ? YELLOW : GREEN) : AMBER, 6);
    });

    const naveAtivaObj = navesLista.find((n) => n.id === carcSel) ?? navesLista[0];
    const varSelHang = viewModel.hangarResumo?.varianteSelecionada === 'B' ? 'B' : 'A';
    const topoAtivaHang = resolverLayoutTopologiaNave(`${naveAtivaObj.id}_${varSelHang}`);
    const nomeSelEn = topoAtivaHang.nomeCurtoCardEn ?? naveAtivaObj.nome;
    const nomeSelPt = viewModel.edicaoComercialSteam
      ? (topoAtivaHang.nomeCurtoCardPt ?? naveAtivaObj.nome)
      : `[${naveAtivaObj.nome}]`;
    const avisoHangar = String(ctx.opcoes?.avisoToastTexto ?? viewModel.ultimoAvisoCampanha ?? '').trim();
    if (avisoHangar) {
      chanfradoBezel(24, 388, 935, 434, [38, 14, 18, 248], RED, 3, AMBER);
      txt(36, 396, `[!] ${avisoHangar}`.slice(0, 118), YELLOW, 7);
      txt(
        36,
        412,
        idiomaTela === 'en-US'
          ? `SELECTED HULL: ${nomeSelEn} — PRESS [1..5] TO SELECT OR [ENTER] TO LAUNCH`
          : `BIO-NAVE SELECIONADA: ${nomeSelPt} — PRESSIONE [1..5] P/ SELECIONAR OU [ENTER] P/ ZARPAR`,
        AMBER,
        7
      );
    } else {
      panel(24, 388, 935, 434);
      txt(
        36,
        396,
        idiomaTela === 'en-US'
          ? `DOCTRINE (${nomeSelEn}): ${(topoAtivaHang.doutrinaEn ?? 'REAL-TIME HYDROFOIL LIFT + BOARDING + BIOLOGICAL GRAFTS').toUpperCase()}`.slice(0, 118)
          : viewModel.edicaoComercialSteam
            ? `DOUTRINA (${nomeSelPt}): ${(topoAtivaHang.doutrinaPt ?? 'FOIL HIDROSTÁTICO EM TEMPO REAL + ABORDAGEM + ENXERTOS BIOLÓGICOS').toUpperCase()}`.slice(0, 118)
            : `DOUTRINA [${naveAtivaObj.nome}]: FOIL HIDROSTÁTICO EM TEMPO REAL + ABORDAGEM + ENXERTOS BIOLÓGICOS`,
        CYAN,
        7
      );
      txt(
        36,
        412,
        idiomaTela === 'en-US'
          ? `SEED: ${hangar.seedPartida ?? 'biofoil-run'} | [1..5] SELECT | [ENTER] NEW RUN | [C] CONTINUE | PERMADEATH`
          : `SEED: ${hangar.seedPartida ?? 'biofoil-run'} | [1..5] SELECIONAR | [ENTER] NOVA RUN | [C] CONTINUAR | PERMADEATH`,
        TXT,
        7
      );
    }

    const hbIni = hitboxes.find((h) => h.idHitbox === 'HANGAR_INICIAR_RUN');
    if (hbIni) {
      const hovI = idHoverAtivo === hbIni.idHitbox;
      chanfradoBezel(hbIni.x, hbIni.y, hbIni.x + hbIni.largura - 1, hbIni.y + hbIni.altura - 1, [14, 52, 36, 255], hovI ? YELLOW : GREEN, 4, TXT);
      txt(hbIni.x + 18, hbIni.y + 11, idiomaTela === 'en-US' ? '[ENTER] NEW CAMPAIGN' : '[ENTER] NOVA CAMPANHA', hovI ? YELLOW : GREEN, 8);
      txt(hbIni.x + 30, hbIni.y + 26, idiomaTela === 'en-US' ? 'SAIL SECTOR 1/8' : 'ZARPAR NO SETOR 1/8', TXT, 7);
    }
    const hbCont = hitboxes.find((h) => h.idHitbox === 'HANGAR_CONTINUAR_RUN');
    if (hbCont) {
      const temSave = Boolean(hangar.temRunSalvaDisponivel);
      const hovC = idHoverAtivo === hbCont.idHitbox;
      chanfradoBezel(
        hbCont.x,
        hbCont.y,
        hbCont.x + hbCont.largura - 1,
        hbCont.y + hbCont.altura - 1,
        temSave ? [14, 36, 54, 255] : [14, 20, 26, 255],
        hovC && temSave ? YELLOW : temSave ? CYAN : DIM,
        4,
        temSave ? TXT : RIM
      );
      txt(hbCont.x + 12, hbCont.y + 11, idiomaTela === 'en-US' ? '[C] CONTINUE SAVED RUN' : '[C] CONTINUAR RUN SALVA', temSave ? (hovC ? YELLOW : CYAN) : DIM, 8);
      txt(hbCont.x + 22, hbCont.y + 26, temSave ? (idiomaTela === 'en-US' ? 'RESUME EXPEDITION' : 'RETOMAR EXPEDIÇÃO ATIVA') : (idiomaTela === 'en-US' ? 'NO ACTIVE SAVED RUN' : 'NENHUMA RUN EM CURSO'), temSave ? TXT : DIM, 7);
    }
    txt(
      viewModel.edicaoComercialSteam ? 148 : 166,
      504,
      idiomaTela === 'en-US'
        ? 'CONTROLS: [1..5] SHIPS | [B] TYPE A/B | [F] DIFFICULTY | [T] TUTORIAL | [O] OPTIONS | [J] ACHV | [L] PT/EN'
        : viewModel.edicaoComercialSteam
          ? 'CONTROLES: [1..5] NAVES | [B] TIPO A/B | [F] DIFICULDADE | [T] TUTORIAL | [O] OPÇÕES | [J] TROFÉUS | [L] PT/EN'
          : 'CONTROLES: [1..5] NAVES | [C] RETOMAR | [M] MERGULHO | [D/V] DRENO | [G] ABORDAR | [A/X] SALVA | [ESPAÇO] PAUSA',
      DIM,
      6
    );
  } else {
    const fim = viewModel.fimDeRunResumo ?? {};
    const vitoria = Boolean(fim.vitoria ?? (Number(viewModel.barraSuperior?.hpCascoAtual ?? 0) > 0));
    txt(
      12,
      8,
      ehEnHangar
        ? (vitoria ? 'OCEANIC VICTORY — THE CONTINENTAL DREDGE HAS SUNK!' : 'HULL RUPTURED — PERMADEATH IN THE ABYSS')
        : (vitoria ? 'VITÓRIA OCEÂNICA — A DRAGA CONTINENTAL AFUNDOU!' : 'CASCO ROMPIDO — PERMADEATH NAS PROFUNDEZAS'),
      vitoria ? GREEN : RED,
      8
    );
    txt(
      12,
      24,
      ehEnHangar
        ? (vitoria
            ? 'THE SYMBIOTIC REEF SURVIVED ALL 3 PHASES OF THE INDUSTRIAL FORTRESS!'
            : 'EXPEDITION ENDED IN THE DEEP | GENETIC MEMORY RECORDED IN HANGAR')
        : (vitoria
            ? 'O RECIFE SIMBIÓTICO SOBREVIVEU ÀS 3 FASES DA FORTALEZA EXTRATIVISTA!'
            : 'EXPEDIÇÃO ENCERRADA NO ABISMO | MEMÓRIA GENÉTICA GRAVADA NO HANGAR'),
      vitoria ? CYAN : AMBER,
      7
    );

    chanfradoBezel(40, 52, 919, 226, vitoria ? [7, 24, 36, 250] : [20, 9, 15, 250], vitoria ? CYAN : RED, 4, TXT);
    fillRect(44, 152, 915, 222, vitoria ? [12, 54, 72, 220] : [18, 26, 38, 236]);
    hLine(44, 915, 152, vitoria ? CYAN : AMBER, 2);
    const varFim = String(viewModel.layoutId ?? '').endsWith('_B') ? 'B' : 'A';
    if (vitoria) {
      desenharMiniaturaBioNaveHiBit(88, 76, 196, 86, idCarcaca, viewModel.edicaoComercialSteam ? { variante: varFim } : null);
    }

    if (vitoria) {
      // Naufrágio Hi-Bit real da Draga Continental (amostrando texels industriais de assets.dragaPlay inclinados e semi-submersos sob y=152!)
      const dragaSrc = assets.dragaPlay;
      const perfilDraga = dragaSrc ? obterPerfilLimpo(dragaSrc) : null;
      const xW0 = 602;
      const xW1 = 906;
      const yW0 = 60;
      const yW1 = 218;
      const cxW = 758;
      const cyW = 148;
      const cosTilt = 0.978;
      const sinTilt = 0.208; // proa esquerda afundando mais fundo sob a linha d'água!

      if (dragaSrc && perfilDraga) {
        for (let wy = yW0; wy <= yW1; wy += 1) {
          const dyRel = wy - cyW;
          const submerso = wy > 152;
          for (let wx = xW0; wx <= xW1; wx += 1) {
            const dxRel = wx - cxW;
            // Fenda geotérmica irregular partida ao meio na cidadela/fornalha
            const distFenda = Math.abs((wx - 744) + Math.round((wy - 140) * 0.45 + Math.sin(wy * 0.35) * 2));
            if (distFenda <= 1 && wy >= 96 && wy <= 198) {
              putPx(wx, wy, submerso ? AMBER : ((wx + wy) & 1) === 0 ? YELLOW : RED);
              continue;
            }
            const uDr = Math.round(236 + (dxRel * cosTilt + dyRel * sinTilt) * 1.12);
            const vDr = Math.round(256 + (-dxRel * sinTilt + dyRel * cosTilt) * 1.24);
            if (uDr < 52 || uDr >= dragaSrc.largura - 2 || vDr < 78 || vDr >= dragaSrc.altura - 2) continue;
            const pDr = (vDr * dragaSrc.largura + uDr) * 4;
            const rD = dragaSrc.rgba[pDr];
            const gD = dragaSrc.rgba[pDr + 1];
            const bD = dragaSrc.rgba[pDr + 2];
            const pR = perfilDraga[vDr * 3];
            const pG = perfilDraga[vDr * 3 + 1];
            const pB = perfilDraga[vDr * 3 + 2];
            const distBg = Math.abs(rD - pR) + Math.abs(gD - pG) + Math.abs(bD - pB);
            const ehEspumaPlaca = Math.abs(vDr - 292) <= 7 && gD > 138 && bD > 150;
            const ehCeuMarPlaca = distBg < 32 && rD < 38 && bD >= gD - 3 && gD >= rD + 6;
            if (ehEspumaPlaca || ehCeuMarPlaca) continue;

            if (submerso) {
              const prof = Math.min(1, (wy - 152) / 68);
              const dthS = ((wx + wy) & 1) === 0 ? 2 : -2;
              const rr = Math.max(8, Math.round(rD * (0.52 - prof * 0.18) + 8 + dthS));
              const gg = Math.max(24, Math.round(gD * (0.64 - prof * 0.16) + 26 + dthS));
              const bb = Math.max(38, Math.round(bD * (0.72 - prof * 0.14) + 38 + dthS));
              putPx(wx, wy, [rr, gg, bb, 255]);
            } else {
              putPx(wx, wy, [rD, gD, bD, 255]);
            }
          }
        }
      } else {
        for (let dyW = 0; dyW < 58; dyW += 1) {
          const wy = 114 + dyW;
          const inclinacao = Math.round((dyW - 24) * 0.35);
          const wx0 = 624 + inclinacao + (dyW < 14 ? (14 - dyW) * 2 : 0);
          const wx1 = 868 + inclinacao - (dyW > 42 ? (dyW - 42) * 3 : 0);
          const submerso = wy > 152;
          for (let wx = wx0; wx <= wx1; wx += 1) {
            const dthW = ((wx + wy) & 1) === 0 ? 0 : 6;
            putPx(wx, wy, submerso ? [16 + dthW, 46 + dthW, 60 + dthW, 255] : [44 + dthW, 50 + dthW, 58 + dthW, 255]);
          }
        }
      }

      // Plumas circulares dithered de fumaça vulcânica e fagulhas pixel-art subindo das chaminés partidas
      for (let pf = 0; pf < 12; pf += 1) {
        const cxSm = 688 + pf * 15 + Math.round(Math.sin(tempoSeg * 2.6 + pf) * 3);
        const cySm = 66 + ((pf * 9) % 26);
        const rSm = 4 + (pf % 3);
        for (let oyS = -rSm; oyS <= rSm; oyS += 1) {
          for (let oxS = -rSm; oxS <= rSm; oxS += 1) {
            const d2 = oxS * oxS + oyS * oyS;
            if (d2 <= rSm * rSm && (d2 <= (rSm - 1) * (rSm - 1) || ((oxS + oyS + pf) & 1) === 0)) {
              const brasa = d2 <= 2 && pf % 3 === 0;
              putPx(cxSm + oxS, cySm + oyS, brasa ? AMBER : ((oxS + oyS) & 1) === 0 ? [34, 38, 46, 225] : [20, 24, 32, 215]);
            }
          }
        }
        if (pf < 7) {
          putPx(684 + pf * 18, 92 - (pf % 4) * 4, pf % 2 === 0 ? YELLOW : RED);
        }
      }
      // Colar denso de espuma branca/ciana quebrando sobre o casco inclinado da Draga submergindo em y=152
      for (let sxF = 594; sxF <= 904; sxF += 1) {
        const crista = Math.round(Math.sin(sxF * 0.16 + tempoSeg * 4.2) * 1.8);
        putPx(sxF, 151 + crista, (sxF & 1) === 0 ? TXT : CYAN);
        putPx(sxF, 152 + crista, (sxF % 3) === 0 ? TXT : CYAN);
        if ((sxF & 1) === 0) putPx(sxF, 153 + crista, [42, 138, 166, 255]);
      }

      // Selo de vitória posicionado no centro-inferior (x=298..592) para deixar 100% do naufrágio da Draga visível!
      chanfradoBezel(298, 180, 594, 216, [8, 26, 34, 244], GREEN, 3, TXT);
      txt(310, 186, ehEnHangar ? 'DREDGE PHASE 3 SUNK IN THE ABYSS!' : 'DRAGA FASE 3 DESTRUÍDA NO ABISMO!', YELLOW, 7);
      txt(310, 201, ehEnHangar ? 'OCEAN FREED FROM INDUSTRIAL BOIL' : 'OCEANO LIVRE DA FERVURA INDUSTRIAL', GREEN, 6);
    } else {
      desenharMiniaturaBioNaveHiBit(92, 138, 192, 82, idCarcaca, viewModel.edicaoComercialSteam ? { variante: varFim } : null);
      for (let wy = 140; wy <= 218; wy += 1) {
        const fendaX = 188 + Math.round((wy - 175) * 0.28 + Math.sin(wy * 0.4) * 2);
        for (let wx = 44; wx <= 915; wx += 1) {
          if (wx >= 86 && wx <= 294 && Math.abs(wx - fendaX) <= 2) {
            putPx(wx, wy, Math.abs(wx - fendaX) === 0 ? [12, 18, 28, 255] : ((wx + wy) & 1) === 0 ? RED : AMBER);
          } else if (wy > 152) {
            const pSub = (wy * W + wx) * 4;
            rgba[pSub] = Math.round(rgba[pSub] * 0.56 + 10);
            rgba[pSub + 1] = Math.round(rgba[pSub + 1] * 0.62 + 22);
            rgba[pSub + 2] = Math.round(rgba[pSub + 2] * 0.72 + 36);
          }
        }
      }
      for (let sxF = 44; sxF <= 915; sxF += 1) {
        const cr = Math.round(Math.sin(sxF * 0.15 + tempoSeg * 3.6) * 1.4);
        putPx(sxF, 151 + cr, (sxF % 3) === 0 ? AMBER : CYAN);
        putPx(sxF, 152 + cr, (sxF & 1) === 0 ? TXT : AMBER);
      }
      for (const [fxS, fyS, fwS] of [[104, 149, 10], [148, 151, 8], [228, 150, 11], [270, 152, 7]]) {
        fillRect(fxS, fyS, fxS + fwS, fyS + 3, [64, 34, 42, 255]);
        hLine(fxS + 1, fxS + fwS - 1, fyS, AMBER, 1);
      }
      for (let pb = 0; pb < 18; pb += 1) {
        const bxP = 166 + ((pb * 13) % 52) + Math.round(Math.sin(tempoSeg * 3 + pb) * 2);
        const byP = 68 + ((pb * 11) % 80);
        const rB = pb % 4 === 0 ? 2 : 1;
        fillRect(bxP, byP, bxP + rB, byP + rB, pb % 5 === 0 ? RED : pb % 2 === 0 ? CYAN : TXT);
      }
      chanfradoBezel(468, 86, 902, 142, [48, 12, 18, 248], RED, 3, AMBER);
      txt(484, 96, ehEnHangar ? 'SHIPWRECK — PERMADEATH CONFIRMED' : 'NAUFRÁGIO — PERMADEATH CONFIRMADO', RED, 8);
      txt(484, 118, String(fim.motivoEncerramento ?? (ehEnHangar ? 'HULL SPLIT IN THE DEEP' : 'CASCO PARTIDO NAS PROFUNDEZAS')).slice(0, 56), YELLOW, 7);
    }

    panel(40, 236, 919, 424, ehEnHangar ? 'EXPEDITION HYDROSTATIC REPORT' : 'RELATÓRIO HIDROSTÁTICO DA EXPEDIÇÃO');
    const metricasFim = ehEnHangar
      ? [
          [`SECTOR REACHED: ${fim.setorAlcancado ?? viewModel.setorAtual ?? 1}/8`, CYAN],
          [`COMBAT VICTORIES: ${fim.vitoriasCombate ?? 0}`, GREEN],
          [`INTACT CAPTURES: ${fim.capturasIntactas ?? 0}`, AMBER],
          [`SURGICAL GRAFTS: ${fim.extracoesCirurgicas ?? 0}`, [188, 118, 255, 255]],
          [`SCRAP SALVAGED: ${fim.sucataColetada ?? viewModel.barraSuperior?.recursos?.sucata ?? 0}`, TXT],
          [`BIOMASS CULTURED: ${fim.biomassaColetada ?? viewModel.barraSuperior?.recursos?.biomassa ?? 0}`, CYAN],
        ]
      : [
          [`SETOR ALCANÇADO: ${fim.setorAlcancado ?? viewModel.setorAtual ?? 1}/8`, CYAN],
          [`VITÓRIAS EM COMBATE: ${fim.vitoriasCombate ?? 0}`, GREEN],
          [`CAPTURAS INTACTAS: ${fim.capturasIntactas ?? 0}`, AMBER],
          [`EXTRAÇÕES CIRÚRGICAS: ${fim.extracoesCirurgicas ?? 0}`, [188, 118, 255, 255]],
          [`SUCATA RECOLHIDA: ${fim.sucataColetada ?? viewModel.barraSuperior?.recursos?.sucata ?? 0}`, TXT],
          [`BIOMASSA CULTIVADA: ${fim.biomassaColetada ?? viewModel.barraSuperior?.recursos?.biomassa ?? 0}`, CYAN],
        ];
    metricasFim.forEach(([rotM, corM], idxM) => {
      const colM = idxM % 2;
      const rowM = Math.floor(idxM / 2);
      const mx0 = 58 + colM * 424;
      const my0 = 264 + rowM * 36;
      chanfradoBezel(mx0, my0, mx0 + 404, my0 + 28, [8, 18, 28, 255], corM, 2);
      txt(mx0 + 12, my0 + 10, rotM, corM, 7);
    });

    const novosDesbloq = Array.isArray(fim.novosDesbloqueios) ? fim.novosDesbloqueios : [];
    const nomesDesbloq = novosDesbloq.map((id) => {
      const sId = String(id);
      const idTopo = sId.endsWith('_A') || sId.endsWith('_B') ? sId : `${sId}_A`;
      const topo = resolverLayoutTopologiaNave(idTopo);
      const bateuTopo = Boolean(topo && (topo.idLayout === idTopo || topo.layoutId === idTopo || topo.id === idTopo));
      if (ehEnHangar) return bateuTopo ? (topo.nomeCurtoCardEn ?? sId.replace(/_/g, ' ')) : sId.replace(/_/g, ' ');
      return NOMES_CARC?.[sId] ?? (bateuTopo ? topo.nomeCurtoCardPt : null) ?? sId.replace(/_/g, ' ');
    });
    chanfradoBezel(58, 378, 901, 414, novosDesbloq.length > 0 ? [12, 44, 32, 255] : [10, 18, 26, 255], novosDesbloq.length > 0 ? YELLOW : BORDER, 2);
    txt(
      72,
      392,
      novosDesbloq.length > 0
        ? (ehEnHangar
            ? `NEW BIO-SHIP(S) UNLOCKED IN HANGAR: ${nomesDesbloq.join(', ')}!`
            : `NOVA(S) BIO-NAVE(S) DESBLOQUEADA(S) NO HANGAR: ${nomesDesbloq.join(', ')}!`)
        : (ehEnHangar
            ? 'GENETIC MEMORY RECORDED IN HANGAR ARCHIVE — READY FOR NEW EXPEDITION'
            : 'MEMÓRIA GENÉTICA GRAVADA NO ARQUIVO DO HANGAR — PRONTO PARA NOVA EXPEDIÇÃO'),
      novosDesbloq.length > 0 ? YELLOW : CYAN,
      7
    );

    const hbNova = hitboxes.find((h) => h.idHitbox === 'FIM_NOVA_RUN');
    if (hbNova) {
      const hovN = idHoverAtivo === hbNova.idHitbox;
      chanfradoBezel(hbNova.x, hbNova.y, hbNova.x + hbNova.largura - 1, hbNova.y + hbNova.altura - 1, [14, 52, 36, 255], hovN ? YELLOW : GREEN, 4, TXT);
      txt(hbNova.x + 22, hbNova.y + 11, ehEnHangar ? '[ENTER] NEW RUN' : '[ENTER] NOVA RUN', hovN ? YELLOW : GREEN, 8);
      txt(hbNova.x + 26, hbNova.y + 26, ehEnHangar ? 'SAME ARCHITECTURE' : 'MESMA ARQUITETURA', TXT, 7);
    }
    const hbVoltar = hitboxes.find((h) => h.idHitbox === 'FIM_VOLTAR_HANGAR');
    if (hbVoltar) {
      const hovV = idHoverAtivo === hbVoltar.idHitbox;
      chanfradoBezel(hbVoltar.x, hbVoltar.y, hbVoltar.x + hbVoltar.largura - 1, hbVoltar.y + hbVoltar.altura - 1, [14, 34, 50, 255], hovV ? YELLOW : CYAN, 4, TXT);
      txt(hbVoltar.x + 18, hbVoltar.y + 11, '[ESC] BIO-HANGAR', hovV ? YELLOW : CYAN, 8);
      txt(hbVoltar.x + 24, hbVoltar.y + 26, ehEnHangar ? 'SWITCH BIO-SHIP' : 'TROCAR DE BIO-NAVE', TXT, 7);
    }
  }
  return rgba;
}

export function renderizarViewportCampanhaNaoCombate(ctx) {
  const {
    W,
    rgba,
    viewModel,
    assets,
    hitboxes,
    f4Anim,
    tempoSeg,
    idHoverAtivo,
    idPressAtivo,
    faseJogo,
    idCarcaca,
    BORDER,
    TXT,
    DIM,
    GREEN,
    CYAN,
    AMBER,
    RED,
    YELLOW,
    VIOLET,
    SPRITES_HB,
    SPRITES_INSUMOS,
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
    desenharNodoBoiaMapaHiBit,
    socket,
    blitIconeHiBit,
    heartOrgan,
    desenharMiniaturaBioNaveHiBit,
    desenharRetratoRecortadoHiBit,
  } = ctx;

  const ehEnVp = viewModel.configuracoesSteam?.idioma === 'en-US';
  if (faseJogo === 'MAPA') {
    const mapa = viewModel.mapaSetorialResumo;
    const setorNum = mapa?.setorNumero ?? 1;
    fillRect(150, 40, 959, 429, [6, 12, 18, 255], BORDER);
    if (assets.mapaPlay) {
      for (let py = 0; py < assets.mapaPlay.altura; py += 1) {
        const sy = 66 + py;
        if (sy > 399) break;
        const srcRow = py * assets.mapaPlay.largura;
        let dst = (sy * W + 152) * 4;
        for (let px = 0; px < assets.mapaPlay.largura; px += 1) {
          if (152 + px > 957) break;
          const sIdx = (srcRow + px) * 4;
          rgba[dst] = assets.mapaPlay.rgba[sIdx];
          rgba[dst + 1] = assets.mapaPlay.rgba[sIdx + 1];
          rgba[dst + 2] = assets.mapaPlay.rgba[sIdx + 2];
          rgba[dst + 3] = 255;
          dst += 4;
        }
      }
    }
    panel(152, 42, 957, 64);
    const relogioMapaH = Number(mapa?.relogioSetorHoras ?? 0).toFixed(1);
    txt(158, 49, `${ehEnVp ? 'SECTOR' : 'SETOR'} ${setorNum}/8 T:${relogioMapaH}h`, relogioMapaH !== '0.0' ? AMBER : CYAN, 7);
    const itensLegenda = ehEnVp
      ? [
          [304, RED, 'COMB'],
          [356, VIOLET, 'SHOP'],
          [406, AMBER, 'SOS'],
          [450, GREEN, 'EXPL'],
          [502, GREEN, 'FAV'],
          [548, AMBER, 'CHOP'],
          [594, CYAN, 'SHIP'],
        ]
      : [
          [304, RED, 'COMB'],
          [356, VIOLET, 'LOJA'],
          [406, AMBER, 'SOS'],
          [450, GREEN, 'EXPL'],
          [502, GREEN, 'FAV'],
          [548, AMBER, 'REV'],
          [594, CYAN, 'NAVE'],
        ];
    for (const [lx, corL, rotL] of itensLegenda) {
      fillRect(lx, 49, lx + 8, 57, [8, 16, 22, 255], corL);
      fillRect(lx + 2, 51, lx + 6, 55, corL);
      putPx(lx + 2, 51, TXT);
      txt(lx + 10, 49, rotL, TXT, 6);
    }
    if (mapa) {
      const seloDirTxt = mapa.cartaRevelada
        ? (ehEnVp ? 'SONAR CHART+' : 'SONAR SETOR+')
        : mapa.emModoDeriva
          ? (ehEnVp ? 'DRIFT 2.0x!' : 'DERIVA 2.0x!')
          : `V:${Number(mapa.velocidadeCruzeiroMnH ?? 12).toFixed(1)}${ehEnVp ? 'NM/h' : 'MN/h'}`;
      const seloDirCor = mapa.cartaRevelada ? GREEN : mapa.emModoDeriva ? RED : CYAN;
      chanfradoBezel(838, 46, 953, 61, [10, 22, 32, 245], seloDirCor, 2);
      txt(844, 50, seloDirTxt.slice(0, 15), seloDirCor, 6);
    }
    const hbOficMapa = hitboxes.find((h) => h.idHitbox === 'BTN_ABRIR_OFICINA');
    if (hbOficMapa) {
      const hovOf = idHoverAtivo === hbOficMapa.idHitbox;
      const dyOf = idPressAtivo === hbOficMapa.idHitbox ? 1 : 0;
      chanfradoBezel(hbOficMapa.x, hbOficMapa.y + dyOf, hbOficMapa.x + hbOficMapa.largura - 1, hbOficMapa.y + hbOficMapa.altura - 1 + dyOf, [16, 38, 50, 255], hovOf ? YELLOW : AMBER, 3, TXT);
      txt(hbOficMapa.x + 8, hbOficMapa.y + 7 + dyOf, ehEnVp ? '[U] WORKSHOP/CARGO' : '[U] OFICINA/CARGA', YELLOW, 7);
    }

    for (let gx = 210; gx < 866; gx += 72) {
      lineSeg(gx, 66, gx, 399, [22, 50, 68, 120], true);
    }
    for (let gy = 114; gy < 399; gy += 68) {
      lineSeg(156, gy, gy < 160 ? 866 : 952, gy, [22, 50, 68, 120], true);
    }

    if (mapa) {
      const frenteMn = Number(mapa.frenteCorporativaX ?? -18);
      const xFrenteBase = Math.max(156, Math.min(938, Math.round(170 + (Math.max(-12, frenteMn) / 120) * 656)));
      for (let pyF = 66; pyF <= 399; pyF += 1) {
        const dyRel = (pyF - 233) / 167;
        const curvaSonar = Math.round(Math.cos(dyRel * 1.42) * 14 - 8 + Math.sin(pyF * 0.045 + tempoSeg * 2.4) * 1.4);
        const limX = Math.max(156, Math.min(948, xFrenteBase + curvaSonar));
        for (let pxF = 152; pxF <= limX; pxF += 1) {
          const distFr = limX - pxF;
          if (distFr <= 1) {
            putPx(pxF, pyF, distFr === 0 ? RED : ((pyF % 6) < 2 ? AMBER : RED));
          } else if (distFr <= 7) {
            if (((pxF + pyF) & 1) === 0) putPx(pxF, pyF, [196, 28, 42, 210]);
          } else if (distFr <= 26) {
            if (((pxF + pyF) & 1) === 0 && ((pxF ^ pyF) & 2) === 0) putPx(pxF, pyF, [138, 20, 32, 165]);
          } else if ((pxF & 1) === 0 && ((pyF + (pxF >> 1)) & 3) === 0) {
            putPx(pxF, pyF, [92, 14, 24, 130]);
          }
        }
      }
      chanfradoBezel(156, 70, 248, 82, [10, 14, 21, 244], RED, 2);
      txt(160, 73, ehEnVp ? 'DREDGE FRONT' : 'FRENTE DRAGA', RED, 7);

      const hbNosPorId = new Map(
        hitboxes.filter((h) => h.tipo === 'NO_MAPA').map((h) => [h.metadados.noDestinoId, h])
      );
      const noAtualObj = (mapa.nos ?? []).find((n) => n.id === mapa.noAtualId) ?? null;
      const saidasAtuais = new Set(noAtualObj?.rotasSaida ?? []);
      const hbAtual = noAtualObj ? hbNosPorId.get(noAtualObj.id) : null;

      if (hbAtual) {
        const sx0 = hbAtual.x + 10;
        const sy0 = hbAtual.y + 10;
        const pulsoR = 24 + Math.round(((tempoSeg * 28) % 52));
        for (const rSonar of [36, 70, pulsoR]) {
          for (let ang = 0; ang < 360; ang += 5) {
            if (rSonar !== pulsoR && (ang % 15 === 0)) continue;
            const rad = (ang * Math.PI) / 180;
            const pxS = Math.round(sx0 + Math.cos(rad) * rSonar);
            const pyS = Math.round(sy0 + Math.sin(rad) * rSonar);
            if (pxS > 154 && pxS < 954 && pyS > 66 && pyS < 400) {
              putPx(pxS, pyS, rSonar === pulsoR ? [79, 242, 255, 165] : [36, 78, 98, 150]);
            }
          }
        }
      }

      const rotasIdx = new Map((mapa.rotas ?? []).map((r) => [`${r.origemId}->${r.destinoId}`, r]));
      for (const noOrig of mapa.nos ?? []) {
        const hbO = hbNosPorId.get(noOrig.id);
        if (!hbO) continue;
        for (const idDest of noOrig.rotasSaida ?? []) {
          const hbD = hbNosPorId.get(idDest);
          if (!hbD) continue;
          const rInfo = rotasIdx.get(`${noOrig.id}->${idDest}`);
          const tCorr = rInfo?.tipoCorrente ?? 'NORMAL';
          const ehRotaAtiva = noOrig.id === mapa.noAtualId;
          const ehHoverDest = idHoverAtivo === hbD.idHitbox && ehRotaAtiva;
          const corAtiva = tCorr === 'FAVORAVEL' ? GREEN : tCorr === 'REVOLTO' ? AMBER : CYAN;
          const corInativa = tCorr === 'FAVORAVEL' ? [36, 118, 78, 225] : tCorr === 'REVOLTO' ? [128, 82, 34, 225] : [44, 78, 96, 220];
          const x1 = hbO.x + 10; const y1 = hbO.y + 10; const x2 = hbD.x + 10; const y2 = hbD.y + 10;
          lineSeg(x1, y1, x2, y2, ehHoverDest ? YELLOW : ehRotaAtiva ? corAtiva : corInativa, !ehRotaAtiva);
          if (ehRotaAtiva) {
            const tChev = 0.35 + (((tempoSeg * 0.8) % 1) * 0.35);
            const mx = Math.round(x1 + (x2 - x1) * tChev);
            const my = Math.round(y1 + (y2 - y1) * tChev);
            chanfradoBezel(mx - 3, my - 3, mx + 3, my + 3, [8, 16, 22, 255], tCorr === 'FAVORAVEL' ? GREEN : tCorr === 'REVOLTO' ? AMBER : YELLOW, 2);
            putPx(mx, my, TXT);
          }
        }
      }

      for (const no of mapa.nos ?? []) {
        const hb = hbNosPorId.get(no.id);
        if (!hb) continue;
        const ehAtual = no.id === mapa.noAtualId;
        const ehAlcancavel = saidasAtuais.has(no.id);
        const emHover = idHoverAtivo === hb.idHitbox;
        const dyP = idPressAtivo === hb.idHitbox ? 1 : 0;
        const ehQuestViva = Boolean(no.ehQuestAtiva && !no.visitado);
        const corBorda = ehAtual ? CYAN : emHover ? YELLOW : (no.engolidoCorporacao || no.sosExpirado || no.tipo === 'CHEFE' || no.tipo === 'SAIDA') ? RED : ehQuestViva ? [76, 250, 198, 255] : no.tipo === 'LOJA' ? VIOLET : no.tipo === 'SOS' ? AMBER : ehAlcancavel ? GREEN : DIM;
        const cxN = hb.x + 10;
        if (ehAtual) {
          const lateralMini = hb.y < 102 || hb.y > 364;
          const xMiniN = lateralMini ? (hb.x >= 220 ? hb.x - 56 : hb.x + 22) : Math.max(156, hb.x - 17);
          const yMiniN = lateralMini ? Math.max(70, Math.min(372, hb.y - 3)) : hb.y - 30;
          desenharMiniaturaBioNaveHiBit(xMiniN, yMiniN, 54, 26);
        }
        desenharNodoBoiaMapaHiBit(hb.x, hb.y + dyP, hb.largura, hb.altura, ehAtual ? 'ATUAL' : (no.tipo === 'CHEFE' ? 'SAIDA' : no.tipo), corBorda, ehAtual ? [14, 58, 76, 255] : ehQuestViva ? [10, 48, 42, 255] : no.visitado ? [10, 18, 24, 255] : [14, 28, 38, 255], ehAlcancavel || emHover || ehQuestViva);
        const mostrarTagNo = !emHover && (ehAtual || ehAlcancavel || ehQuestViva || no.engolidoCorporacao || no.tipo === 'SOS' || no.tipo === 'LOJA' || no.tipo === 'SAIDA' || no.tipo === 'CHEFE' || (mapa.cartaRevelada && !no.visitado));
        if (mostrarTagNo) {
          const rotNo = ehAtual
            ? (ehEnVp ? 'HERE' : 'ATUAL')
            : no.engolidoCorporacao
              ? 'CORP!'
              : no.sosExpirado
                ? (ehEnVp ? 'DEADZN' : 'ZMORTA')
                : ehQuestViva
                  ? '[QUEST]'
                  : no.tipo === 'SOS' && no.horasRestantesSos != null
                    ? `SOS ${Math.max(0, Math.round(no.horasRestantesSos))}h`
                    : no.tipo === 'LOJA'
                      ? (ehEnVp ? 'SHOP' : 'LOJA')
                      : (no.tipo === 'SAIDA' || no.tipo === 'CHEFE')
                        ? (ehEnVp ? 'EXIT' : 'SAÍDA')
                        : ((ehAlcancavel || mapa.cartaRevelada) && (no.tagMapa || no.subtipoCurto))
                          ? String(no.tagMapa ?? no.subtipoCurto).slice(0, 7)
                          : ehAlcancavel
                            ? (ehEnVp ? 'JUMP' : 'SALTO')
                            : '';
          if (rotNo) {
            const wTag = rotNo.length * 6 + 6;
            const txNo = Math.max(156, Math.min(950 - wTag, cxN - Math.floor(wTag / 2)));
            const tyNo = (hb.y + hb.altura + 14 < 398 ? hb.y + hb.altura + 3 : hb.y - 13) + dyP;
            chanfradoBezel(txNo, tyNo, txNo + wTag, tyNo + 11, [6, 12, 18, 248], corBorda, 2);
            txt(txNo + 3, tyNo + 3, rotNo, ehAtual ? CYAN : (no.engolidoCorporacao || no.sosExpirado) ? RED : ehQuestViva ? [110, 255, 208, 255] : ehAlcancavel ? GREEN : TXT, 6);
          }
        }
      }

      panel(152, 402, 957, 427);
      const noHoverObj = (mapa.nos ?? []).find((n) => `NO_MAPA_${n.id}` === idHoverAtivo);
      const noFoco = noHoverObj ?? (mapa.nos ?? []).find((n) => saidasAtuais.has(n.id)) ?? noAtualObj;
      if (noFoco) {
        const alc = saidasAtuais.has(noFoco.id);
        const nomeBoia = String(noFoco.id).replace(/^NO_/, ehEnVp ? 'BUOY ' : 'BOIA ').replace(/_/g, '-');
        const rF = noFoco.rotaAtiva ?? null;
        const txtRotaF = rF
          ? `${rF.tipoCorrente === 'FAVORAVEL' ? 'FAV 0.75x' : rF.tipoCorrente === 'REVOLTO' ? (ehEnVp ? 'CHOP 1.35x' : 'REV 1.35x') : 'NORM 1.0x'} (${rF.horasViagem}h)`
          : '';
        const custoCmbTxt = mapa.emModoDeriva
          ? (ehEnVp ? 'DRIFT 2x!' : 'DERIVA 2x!')
          : `-${mapa.custoCombustivelSalto ?? 1} ${ehEnVp ? 'FUEL' : 'CMB'}`;
        const tipoNoEn = noFoco.tipo === 'LOJA' ? 'SHOP' : noFoco.tipo === 'SAIDA' ? 'EXIT' : noFoco.tipo === 'COMBATE' ? 'COMBAT' : noFoco.tipo === 'EVENTO' ? 'EVENT' : noFoco.tipo;
        const tagIntelF = noFoco.engolidoCorporacao
          ? (ehEnVp ? 'CORP FLEET (0 LOOT, +1 SHIELD)' : 'FROTA CORP (0 SAQUE, +1 ESCUDO)')
          : noFoco.sosExpirado
            ? (ehEnVp ? 'DEAD ZONE (-50% SCRAP)' : 'ZONA MORTA (-50% SUCATA)')
            : (noFoco.ehQuestAtiva && !noFoco.visitado)
              ? (ehEnVp ? 'QUEST OBJECTIVE' : 'MISSÃO QUEST')
              : (noFoco.inteligenciaRevelada && noFoco.subtipoCurto)
                ? noFoco.subtipoCurto
                : (ehEnVp ? tipoNoEn : noFoco.tipo);
        const rodapeMapaTxt = alc
          ? (ehEnVp
              ? `${nomeBoia} [${tagIntelF}] — ${txtRotaF} | [L-CLICK] JUMP (${custoCmbTxt}${rF?.expiraSosNoSalto ? ', SOS EXPIRES!' : rF?.engolidoNoSalto ? ', DREDGE CATCHES!' : ''})`
              : `${nomeBoia} [${tagIntelF}] — ${txtRotaF} | [ESQ] SALTAR (${custoCmbTxt}${rF?.expiraSosNoSalto ? ', SOS EXPIRA!' : rF?.engolidoNoSalto ? ', DRAGA ALCANÇA!' : ''})`)
          : noFoco.id === mapa.noAtualId
            ? (ehEnVp
                ? `${nomeBoia} — CURRENT BIO-SHIP POSITION | PICK A LINKED BUOY TO JUMP`
                : `${nomeBoia} — POSIÇÃO ATUAL DA BIO-NAVE | ESCOLHA UMA BOIA CONECTADA`)
            : (ehEnVp
                ? `${nomeBoia} [${tagIntelF}] — OUT OF DIRECT RANGE ON THIS JUMP`
                : `${nomeBoia} [${tagIntelF}] — FORA DE ALCANCE DIRETO NESTE SALTO`);
        txt(160, 411, rodapeMapaTxt.slice(0, 112), (noFoco.engolidoCorporacao || noFoco.sosExpirado) ? RED : alc ? GREEN : CYAN, 7);
      }
    }
  } else if (faseJogo === 'LOJA') {
    for (let py = 40; py <= 429; py += 1) {
      const my = Math.min((assets.mapaPlay?.altura ?? 1) - 1, Math.max(0, Math.floor(((py - 40) * 334) / 390)));
      let dst = (py * W + 150) * 4;
      for (let px = 150; px <= 959; px += 1) {
        const dither = ((px + py) & 1) === 0 ? 1 : -1;
        if (assets.mapaPlay) {
          const dxMapa = px - 150;
          const mxBruto = dxMapa < 700 ? dxMapa : 699 - (dxMapa - 700);
          const mx = Math.max(0, Math.min(assets.mapaPlay.largura - 1, mxBruto));
          const mIdx = (my * assets.mapaPlay.largura + mx) * 4;
          rgba[dst] = Math.max(6, Math.min(28, Math.round(assets.mapaPlay.rgba[mIdx] * 0.8 + 5 + dither)));
          rgba[dst + 1] = Math.max(10, Math.min(40, Math.round(assets.mapaPlay.rgba[mIdx + 1] * 0.72 + 4 + dither)));
          rgba[dst + 2] = Math.max(16, Math.min(54, Math.round(assets.mapaPlay.rgba[mIdx + 2] * 0.78 + 8 + dither)));
        } else {
          const brilho = Math.sin(px * 0.019 + py * 0.028) * 3;
          rgba[dst] = Math.max(6, Math.min(24, Math.round(11 + brilho + dither)));
          rgba[dst + 1] = Math.max(11, Math.min(36, Math.round(18 + (430 - py) * 0.02 + dither)));
          rgba[dst + 2] = Math.max(18, Math.min(52, Math.round(28 + (430 - py) * 0.035 + dither)));
        }
        rgba[dst + 3] = 255;
        dst += 4;
      }
    }
    fillRect(150, 40, 959, 429, null, BORDER);

    panel(156, 43, 953, 90);
    for (let sxC = 238; sxC <= 896; sxC += 24) {
      fillRect(sxC, 45, sxC + 4, 47, sxC % 48 === 0 ? VIOLET : [20, 52, 66, 255]);
    }
    if (!blitIconeHiBit(assets.iconesHiBit?.RECIFE_FORJA, 165, 46, true)) {
      desenharMiniaturaBioNaveHiBit(166, 51, 68, 36);
    }
    if (!blitIconeHiBit(assets.iconesHiBit?.BULBO_DIGESTOR, 905, 47, true)) {
      heartOrgan(906, 52);
    }
    const loja = viewModel.lojaResumo ?? { nomeDoca: ehEnVp ? 'SYMBIOTIC FORGE-REEF' : 'RECIFE-FORJA SIMBIÓTICO', precoReparo1Hp: 2, ofertas: [] };
    txt(242, 54, loja.nomeDoca, CYAN);
    txt(242, 70, ehEnVp ? 'LIVING GRAFTS, SALVAGED WEAPONS, FINITE STOCK & 2:1 DIGESTION' : 'ENXERTOS VIVOS, CHASSIS RECUPERADOS, ESTOQUE FINITO E DIGESTÃO 2:1', AMBER, 7);

    const recLoja = viewModel.barraSuperior?.recursos ?? { sucata: 0, biomassa: 0 };
    const hbReparo = hitboxes.find((h) => h.idHitbox === 'LOJA_REPARAR_CASCO');
    if (hbReparo) {
      const dyP = idPressAtivo === hbReparo.idHitbox ? 1 : 0;
      const hov = idHoverAtivo === hbReparo.idHitbox;
      chanfradoBezel(hbReparo.x, hbReparo.y + dyP, hbReparo.x + hbReparo.largura - 1, hbReparo.y + hbReparo.altura - 1, [14, 38, 28, 255], hov ? YELLOW : GREEN, 3);
      txt(hbReparo.x + 8, hbReparo.y + 9 + dyP, ehEnVp ? `REPAIR +1 HP (${loja.precoReparo1Hp} SCR)` : `REPARAR +1 HP (${loja.precoReparo1Hp} SUC)`, hov ? YELLOW : GREEN, 7);
    }
    const hbDigSucBio = hitboxes.find((h) => h.idHitbox === 'LOJA_DIGESTAO_SUC_BIO');
    if (hbDigSucBio) {
      const dyP = idPressAtivo === hbDigSucBio.idHitbox ? 1 : 0;
      const hov = idHoverAtivo === hbDigSucBio.idHitbox;
      const podeSuc = Number(recLoja.sucata ?? 0) >= 2;
      chanfradoBezel(
        hbDigSucBio.x,
        hbDigSucBio.y + dyP,
        hbDigSucBio.x + hbDigSucBio.largura - 1,
        hbDigSucBio.y + hbDigSucBio.altura - 1,
        podeSuc ? [34, 20, 48, 255] : [18, 20, 28, 255],
        hov ? YELLOW : podeSuc ? VIOLET : DIM,
        3
      );
      const usaBotoesSeparados = Boolean(hitboxes.find((h) => h.idHitbox === 'LOJA_DIGESTAO_BIO_SUC'));
      const rotSucBio = usaBotoesSeparados
        ? (ehEnVp ? '2 SCR → 1 BIO' : '2 SUC → 1 BIO')
        : (ehEnVp ? 'DIGEST 2:1 (SCR ↔ BIO)' : 'DIGESTÃO 2:1 (SUC ↔ BIO)');
      txt(hbDigSucBio.x + 8, hbDigSucBio.y + 9 + dyP, rotSucBio, hov ? YELLOW : podeSuc ? CYAN : DIM, 7);
    }
    const hbDigBioSuc = hitboxes.find((h) => h.idHitbox === 'LOJA_DIGESTAO_BIO_SUC');
    if (hbDigBioSuc) {
      const dyP = idPressAtivo === hbDigBioSuc.idHitbox ? 1 : 0;
      const hov = idHoverAtivo === hbDigBioSuc.idHitbox;
      const podeBio = Number(recLoja.biomassa ?? 0) >= 2;
      chanfradoBezel(
        hbDigBioSuc.x,
        hbDigBioSuc.y + dyP,
        hbDigBioSuc.x + hbDigBioSuc.largura - 1,
        hbDigBioSuc.y + hbDigBioSuc.altura - 1,
        podeBio ? [16, 36, 44, 255] : [18, 20, 28, 255],
        hov ? YELLOW : podeBio ? CYAN : DIM,
        3
      );
      txt(hbDigBioSuc.x + 8, hbDigBioSuc.y + 9 + dyP, ehEnVp ? '2 BIO → 1 SCR' : '2 BIO → 1 SUC', hov ? YELLOW : podeBio ? GREEN : DIM, 7);
    }
    const hbOficLoja = hitboxes.find((h) => h.idHitbox === 'BTN_ABRIR_OFICINA');
    if (hbOficLoja) {
      const dyP = idPressAtivo === hbOficLoja.idHitbox ? 1 : 0;
      const hov = idHoverAtivo === hbOficLoja.idHitbox;
      chanfradoBezel(hbOficLoja.x, hbOficLoja.y + dyP, hbOficLoja.x + hbOficLoja.largura - 1, hbOficLoja.y + hbOficLoja.altura - 1, [24, 34, 18, 255], hov ? YELLOW : AMBER, 3);
      txt(hbOficLoja.x + 10, hbOficLoja.y + 9 + dyP, ehEnVp ? '[U] WORKSHOP' : '[U] OFICINA', YELLOW, 7);
    }
    const hbSairLoja = hitboxes.find((h) => h.idHitbox === 'BTN_SAIR_LOJA');
    if (hbSairLoja) {
      const dyP = idPressAtivo === hbSairLoja.idHitbox ? 1 : 0;
      const hov = idHoverAtivo === hbSairLoja.idHitbox;
      chanfradoBezel(hbSairLoja.x, hbSairLoja.y + dyP, hbSairLoja.x + hbSairLoja.largura - 1, hbSairLoja.y + hbSairLoja.altura - 1, [16, 36, 50, 255], hov ? YELLOW : CYAN, 3);
      txt(hbSairLoja.x + 12, hbSairLoja.y + 9 + dyP, ehEnVp ? 'UNDOCK → CHART' : 'ZARPAR → CARTA', hov ? YELLOW : TXT, 7);
    }

    const hbItensLoja = hitboxes.filter((h) => h.tipo === 'ITEM_LOJA');
    (loja.ofertas ?? []).slice(0, 8).forEach((item, idx) => {
      const hb = hbItensLoja[idx];
      if (!hb) return;
      const hov = idHoverAtivo === hb.idHitbox;
      const dyP = idPressAtivo === hb.idHitbox ? 1 : 0;
      const esgotado = Boolean(item.esgotado) || Number(item.estoqueRestante ?? 1) <= 0;
      const estq = Math.max(0, Number(item.estoqueRestante ?? 1));
      const saldoMoeda = item.moeda === 'BIOMASSA' ? Number(recLoja.biomassa ?? 0) : Number(recLoja.sucata ?? 0);
      const podeComprar = !esgotado && saldoMoeda >= item.preco;
      const corCat =
        item.categoria === 'ARMA'
          ? AMBER
          : item.categoria === 'ORGAO'
            ? VIOLET
            : item.categoria === 'TRIPULANTE'
              ? GREEN
              : item.categoria === 'SUBSISTEMA'
                ? [92, 224, 255, 255]
                : CYAN;
      chanfradoBezel(
        hb.x,
        hb.y + dyP,
        hb.x + hb.largura - 1,
        hb.y + hb.altura - 1,
        esgotado ? [9, 13, 18, 255] : hov ? [15, 28, 38, 255] : [10, 18, 26, 255],
        hov ? YELLOW : esgotado ? [48, 60, 72, 255] : corCat,
        3
      );
      fillRect(hb.x + 3, hb.y + 2 + dyP, hb.x + hb.largura - 4, hb.y + 16 + dyP, esgotado ? [14, 18, 24, 220] : [18, 30, 42, 220]);
      const rotCatLoja = ehEnVp
        ? (item.categoria === 'ARMA'
            ? 'WEAPON'
            : item.categoria === 'ORGAO'
              ? 'ORGAN'
              : item.categoria === 'TRIPULANTE'
                ? 'CREW'
                : item.categoria === 'SUBSISTEMA'
                  ? 'SUBSYSTEM'
                  : 'SUPPLY')
        : (item.categoria === 'ORGAO' ? 'ÓRGÃO' : item.categoria);
      const corRotCatLoja = esgotado ? DIM : item.categoria === 'ORGAO' ? [210, 166, 255, 255] : corCat;
      txt(hb.x + 6, hb.y + 5 + dyP, rotCatLoja.slice(0, 10), hov ? YELLOW : corRotCatLoja, 7);
      const tagDirTopo = esgotado ? (ehEnVp ? '0 LEFT' : '0 ESTQ') : item.pesoKg > 0 ? `+${item.pesoKg}kg` : estq > 1 ? `x${estq}` : '';
      if (tagDirTopo) {
        txt(hb.x + hb.largura - 6 - tagDirTopo.length * 7, hb.y + 5 + dyP, tagDirTopo, esgotado ? DIM : item.pesoKg > 0 ? AMBER : CYAN, 7);
      }

      const vx0 = hb.x + 8;
      const vy0 = hb.y + 21 + dyP;
      const vx1 = hb.x + hb.largura - 9;
      const vy1 = hb.y + 75 + dyP;
      chanfradoBezel(vx0, vy0, vx1, vy1, [6, 11, 17, 255], hov ? CYAN : BORDER, 2);
      const xmDiv = hb.x + 92;
      lineSeg(xmDiv, vy0 + 4, xmDiv, vy1 - 5, [22, 38, 48, 255], true);
      hLine(vx0 + 12, xmDiv - 10, vy1 - 3, esgotado ? DIM : corCat, 1);
      hLine(vx0 + 22, xmDiv - 20, vy1 - 2, esgotado ? BORDER : CYAN, 1);

      const chaveRetLoja = item.chaveSprite === 'BAIACU_NORMAL' ? 'BAIACU' : item.chaveSprite;
      const retLoja = item.categoria === 'TRIPULANTE' ? assets.retratos?.[chaveRetLoja] : null;
      const iconeLoja = assets.iconesHiBit?.[item.chaveSprite] ?? null;
      if (item.categoria === 'TRIPULANTE' && desenharPersonagemPose4F(chaveRetLoja, f4Anim % 2, vx0 + 42, vy0 + 26, 62, 44, false, false)) {
        // Pose 4F limpa renderizada
      } else if (retLoja) {
        const altRet = 44;
        const largRet = 58;
        const rx0 = vx0 + Math.floor((84 - largRet) / 2);
        const ry0 = vy0 + 4;
        desenharRetratoRecortadoHiBit(retLoja, rx0, ry0, largRet, altRet);
      } else if (iconeLoja) {
        const rxI = vx0 + Math.max(2, Math.floor((84 - iconeLoja.largura) / 2));
        const ryI = vy0 + Math.max(2, Math.floor((51 - iconeLoja.altura) / 2));
        blitIconeHiBit(iconeLoja, rxI, ryI, true);
      } else {
        const matSpr = SPRITES_INSUMOS[item.chaveSprite] ?? SPRITES_HB[item.chaveSprite] ?? SPRITES_HB.BULBO_NEURAL;
        const colsS = matSpr[0]?.length ?? 12;
        const rowsS = matSpr.length;
        const escS = colsS * 3 <= 76 && rowsS * 3 <= (vy1 - vy0 - 8) ? 3 : 2;
        const largSpr = colsS * escS;
        const altSpr = rowsS * escS;
        blitMatrizToken(
          matSpr,
          vx0 + Math.max(4, Math.floor((84 - largSpr) / 2)),
          vy0 + Math.max(2, Math.floor((vy1 - vy0 - 4 - altSpr) / 2)),
          escS,
          escS,
          true
        );
      }
      if (esgotado) {
        fillRect(vx0 + 2, vy0 + 2, xmDiv - 2, vy1 - 2, [6, 10, 15, 138]);
      }

      const sxChip = xmDiv + 6;
      const resTxt = String(item.resumoCurto ?? '');
      if (item.categoria === 'ARMA') {
        const mEne = /(\d+)\s*(?:ENE|PWR)/i.exec(resTxt);
        const eneArma = mEne ? Number(mEne[1]) : (item.pesoKg >= 15 ? 2 : 1);
        const soqArma = /ARPAO|TORPEDO|MORTEIRO|DUPLA|BOMBA|ACIDO/i.test(String(item.id)) ? 2 : 1;
        txt(sxChip, vy0 + 6, ehEnVp ? 'POWER' : 'ENERGIA', DIM, 6);
        segBar(sxChip + 48, vy0 + 6, 3, eneArma, 5, 7, 2, GREEN);
        txt(sxChip, vy0 + 20, ehEnVp ? 'SOCKETS' : 'SOQUETES', DIM, 6);
        for (let isq = 0; isq < soqArma; isq += 1) {
          socket(sxChip + 53 + isq * 11, vy0 + 19, false);
        }
        chanfradoBezel(sxChip, vy0 + 34, vx1 - 5, vy0 + 49, [14, 24, 32, 255], BORDER, 2);
        txt(sxChip + 4, vy0 + 39, `${ehEnVp ? 'MASS' : 'PESO'} +${item.pesoKg}kg`, AMBER, 6);
      } else if (item.categoria === 'ORGAO') {
        const ehPassivoLoja = Boolean(item.ehPassivoPorao);
        if (ehPassivoLoja) {
          txt(sxChip, vy0 + 6, ehEnVp ? 'IMPLANT' : 'IMPLANTE', GREEN, 6);
          chanfradoBezel(vx1 - 17, vy0 + 5, vx1 - 9, vy0 + 13, [12, 44, 34, 255], GREEN, 2);
          putPx(vx1 - 13, vy0 + 9, YELLOW);
          txt(sxChip, vy0 + 20, `${ehEnVp ? 'MASS' : 'PESO'} +${item.pesoKg || 5}kg`, AMBER, 6);
          chanfradoBezel(sxChip, vy0 + 34, vx1 - 5, vy0 + 49, [10, 34, 28, 255], GREEN, 2);
          txt(sxChip + 3, vy0 + 39, ehEnVp ? 'HOLD PASSIVE' : 'PORÃO PASSIVO', GREEN, 6);
        } else {
          txt(sxChip, vy0 + 6, ehEnVp ? 'GRAFT' : 'ENXERTO', [210, 166, 255, 255], 6);
          socket(vx1 - 16, vy0 + 5, true);
          txt(sxChip, vy0 + 20, `${ehEnVp ? 'MASS' : 'PESO'} +${item.pesoKg || 5}kg`, AMBER, 6);
          chanfradoBezel(sxChip, vy0 + 34, vx1 - 5, vy0 + 49, [22, 14, 34, 255], VIOLET, 2);
          txt(sxChip + 3, vy0 + 39, ehEnVp ? 'BIO-SOCKET' : 'BIO-SOQUETE', CYAN, 6);
        }
      } else if (item.categoria === 'TRIPULANTE') {
        const hpL = /150/.test(resTxt) ? 150 : /110/.test(resTxt) ? 110 : /70/.test(resTxt) ? 70 : 80;
        txt(sxChip, vy0 + 6, `HP ${hpL}`, GREEN, 6);
        segBar(sxChip, vy0 + 18, 6, Math.max(2, Math.round((hpL / 150) * 6)), 9, 6, 2, GREEN);
        chanfradoBezel(sxChip, vy0 + 34, vx1 - 5, vy0 + 49, [12, 30, 26, 255], GREEN, 2);
        const espTag = ehEnVp
          ? (/BAIACU/i.test(String(item.id)) ? 'SEALS BREACH' : /POLVO/i.test(String(item.id)) ? '2X REPAIR' : /ARRAIA/i.test(String(item.id)) ? '+1 POWER' : '15DPS CLAW')
          : (/BAIACU/i.test(String(item.id)) ? 'SELA BRECHA' : /POLVO/i.test(String(item.id)) ? 'REPARO 2X' : /ARRAIA/i.test(String(item.id)) ? '+1 ENERGIA' : 'GARRA 15DPS');
        txt(sxChip + 3, vy0 + 39, espTag, CYAN, 6);
      } else if (item.categoria === 'SUBSISTEMA') {
        const ehAtivoTatico = /SONDA|PARASITA|DRONE/i.test(String(item.id));
        txt(sxChip, vy0 + 6, ehEnVp ? (ehAtivoTatico ? 'TACTICAL' : 'CHAMBER') : (ehAtivoTatico ? 'TÁTICO' : 'CÂMARA'), CYAN, 6);
        segBar(sxChip, vy0 + 19, 3, 3, 14, 6, 3, ehAtivoTatico ? VIOLET : CYAN);
        chanfradoBezel(sxChip, vy0 + 34, vx1 - 5, vy0 + 49, [12, 28, 38, 255], CYAN, 2);
        txt(sxChip + 3, vy0 + 39, ehEnVp ? 'SHIP MODULE' : 'MÓDULO NAVE', GREEN, 6);
      } else {
        const ehCmb = /COMBUST|FUEL/i.test(String(item.id) + resTxt);
        txt(sxChip, vy0 + 6, ehEnVp ? (ehCmb ? 'THRUST' : 'MAGAZINE') : (ehCmb ? 'PROPULSÃO' : 'PAIOL'), CYAN, 6);
        segBar(sxChip, vy0 + 19, 4, 4, 12, 6, 3, ehCmb ? AMBER : CYAN);
        chanfradoBezel(sxChip, vy0 + 34, vx1 - 5, vy0 + 49, [12, 26, 36, 255], CYAN, 2);
        txt(sxChip + 3, vy0 + 39, ehEnVp ? (ehCmb ? '+1 JUMP' : '+1 AMMO') : (ehCmb ? '+1 SALTO' : '+1 MUNIÇÃO'), TXT, 6);
      }

      txt(hb.x + 6, hb.y + 80 + dyP, String(item.nomeCurto), esgotado ? DIM : TXT, 7);
      txt(hb.x + 6, hb.y + 93 + dyP, String(item.resumoCurto).slice(0, 25), DIM, 7);

      chanfradoBezel(
        hb.x + 6,
        hb.y + 106 + dyP,
        hb.x + hb.largura - 7,
        hb.y + hb.altura - 5,
        esgotado ? [26, 20, 18, 255] : podeComprar ? [14, 42, 32, 255] : [22, 26, 30, 255],
        esgotado ? AMBER : hov && podeComprar ? YELLOW : podeComprar ? GREEN : DIM,
        2
      );
      if (esgotado) {
        txt(hb.x + 12, hb.y + 112 + dyP, ehEnVp ? '[SOLD OUT — R-CLK SELL]' : '[ESGOTADO — DIR VENDE]', AMBER, 7);
      } else {
        const siglaM = item.moeda === 'BIOMASSA' ? 'BIO' : (ehEnVp ? 'SCR' : 'SUC');
        const sufixoEstq = estq > 1 ? ` (${estq})` : '';
        txt(
          hb.x + 10,
          hb.y + 112 + dyP,
          `${ehEnVp ? 'BUY' : 'COMPRAR'}: ${item.preco} ${siglaM}${sufixoEstq}`.slice(0, 24),
          podeComprar ? (item.moeda === 'BIOMASSA' ? CYAN : GREEN) : DIM,
          7
        );
      }
    });

    panel(156, 400, 953, 427);
    const poraoLoja = viewModel.oficinaResumo?.porao ?? [null, null, null, null];
    for (let c = 0; c < 4; c += 1) {
      const hbVp =
        hitboxes.find((h) => h.idHitbox === `LOJA_VENDER_PORAO_${c}`) ??
        calcularRetanguloVendaPoraoLoja960(c);
      const itemVp = poraoLoja[c];
      const ocupVp = Boolean(itemVp && (itemVp.ocupado || itemVp.id));
      const hovVp = idHoverAtivo === `LOJA_VENDER_PORAO_${c}`;
      const dyVp = idPressAtivo === `LOJA_VENDER_PORAO_${c}` ? 1 : 0;
      const siglaVp = itemVp?.moedaVenda === 'BIOMASSA' ? 'B' : 'S';
      const corVp = itemVp?.moedaVenda === 'BIOMASSA' ? CYAN : GREEN;
      chanfradoBezel(
        hbVp.x,
        hbVp.y + dyVp,
        hbVp.x + hbVp.largura - 1,
        hbVp.y + hbVp.altura - 1,
        ocupVp ? (hovVp ? [18, 48, 36, 255] : [12, 34, 28, 255]) : [10, 16, 22, 240],
        hovVp && ocupVp ? YELLOW : ocupVp ? corVp : [34, 48, 60, 255],
        2
      );
      const rotVp = ocupVp
        ? `${ehEnVp ? 'SELL' : 'VEND'} P${c + 1} +${itemVp.valorVenda ?? 5}${siglaVp}`
        : `P${c + 1}: ${ehEnVp ? 'EMPTY' : 'VAZIO'}`;
      txt(hbVp.x + 5, hbVp.y + 7 + dyVp, rotVp.slice(0, 13), ocupVp ? (hovVp ? YELLOW : corVp) : DIM, 6);
    }

    const hbHovLoja = hitboxes.find((h) => h.idHitbox === idHoverAtivo);
    if (hbHovLoja?.tipo === 'ITEM_LOJA') {
      const idxItem = hbItensLoja.findIndex((h) => h.idHitbox === hbHovLoja.idHitbox);
      const itemFoco = (loja.ofertas ?? [])[idxItem] ?? hbHovLoja.metadados;
      const siglaM = itemFoco.moeda === 'BIOMASSA' ? 'BIO' : (ehEnVp ? 'SCR' : 'SUC');
      const esgFoco = Boolean(itemFoco.esgotado) || Number(itemFoco.estoqueRestante ?? 1) <= 0;
      txt(162, 405, `${ehEnVp ? 'INSPECT' : 'INSPEÇÃO'}: ${itemFoco.nomeCurto} (${itemFoco.resumoCurto})`.slice(0, 66), YELLOW, 6);
      txt(
        162,
        416,
        (esgFoco
          ? (ehEnVp
              ? `SOLD OUT | [R-CLICK] SELL FROM INVENTORY (+${hbHovLoja.metadados?.valorVenda ?? 5} ${siglaM})`
              : `ESGOTADO | [DIR] VENDER DO INVENTÁRIO (+${hbHovLoja.metadados?.valorVenda ?? 5} ${siglaM})`)
          : (ehEnVp
              ? `[L-CLICK] BUY ${itemFoco.preco} ${siglaM} (STK:${itemFoco.estoqueRestante ?? 1}) | [R-CLICK] SELL (+${hbHovLoja.metadados?.valorVenda ?? 5} ${siglaM})`
              : `[ESQ] COMPRAR ${itemFoco.preco} ${siglaM} (ESTQ:${itemFoco.estoqueRestante ?? 1}) | [DIR] VENDER (+${hbHovLoja.metadados?.valorVenda ?? 5} ${siglaM})`)
        ).slice(0, 66),
        esgFoco ? AMBER : TXT,
        6
      );
    } else if (hbHovLoja?.tipo === 'BOTAO_LOJA_PORAO' || String(hbHovLoja?.idHitbox ?? '').startsWith('LOJA_VENDER_PORAO_')) {
      const idxP = Number(hbHovLoja.metadados?.indicePorao ?? 0);
      const itemPFoco = poraoLoja[idxP];
      if (itemPFoco) {
        txt(162, 405, `${ehEnVp ? 'HOLD' : 'PORÃO'} #${idxP + 1}: ${String(itemPFoco.nome).toUpperCase()} (${itemPFoco.pesoKg ?? 5} kg)`.slice(0, 66), YELLOW, 6);
        txt(162, 416, (ehEnVp ? `[L-CLICK] SELL IMMEDIATELY FOR +${itemPFoco.valorVenda ?? 5} ${itemPFoco.moedaVenda === 'BIOMASSA' ? 'BIOMASS' : 'SCRAP'}` : `[CLIQUE ESQ] VENDER IMEDIATAMENTE POR +${itemPFoco.valorVenda ?? 5} ${itemPFoco.moedaVenda ?? 'SUCATA'}`).slice(0, 66), GREEN, 6);
      } else {
        txt(162, 405, ehEnVp ? `CARGO HOLD #${idxP + 1} EMPTY (0 kg)` : `PORÃO #${idxP + 1} VAZIO (0 kg)`, DIM, 6);
        txt(162, 416, ehEnVp ? 'OPEN [U] WORKSHOP TO MOVE EQUIPPED WEAPONS/ORGANS TO HOLD' : 'ABRA [U] OFICINA P/ MOVER ARMAS OU ÓRGÃOS EQUIPADOS AO PORÃO', CYAN, 6);
      }
    } else if (idHoverAtivo === 'LOJA_DIGESTAO_SUC_BIO') {
      txt(162, 405, ehEnVp ? 'ENZYMATIC DIGESTION: 2 SCRAP → +1 BIOMASS' : 'DIGESTÃO ENZIMÁTICA: 2 SUCATA → +1 BIOMASSA', YELLOW, 6);
      txt(162, 416, ehEnVp ? '[L-CLICK] FEEDS THE DOCK DIGESTOR BULB (2:1 RATE)' : '[CLIQUE ESQ] ALIMENTA O BULBO DIGESTOR DA DOCA (TAXA 2:1)', CYAN, 6);
    } else if (idHoverAtivo === 'LOJA_DIGESTAO_BIO_SUC') {
      txt(162, 405, ehEnVp ? 'SYMBIOTIC CALCIFICATION: 2 BIOMASS → +1 SCRAP' : 'CALCIFICAÇÃO SIMBIÓTICA: 2 BIOMASSA → +1 SUCATA', YELLOW, 6);
      txt(162, 416, ehEnVp ? '[L-CLICK] SYNTHESIZES METALLIC CHITIN AT DOCK (2:1 RATE)' : '[CLIQUE ESQ] SINTETIZA QUITINA METÁLICA NA DOCA (TAXA 2:1)', GREEN, 6);
    } else if (idHoverAtivo === 'LOJA_REPARAR_CASCO') {
      txt(162, 405, ehEnVp ? `CHITIN REPAIR (+1 HP FOR ${loja.precoReparo1Hp} SCRAP)` : `REPARO DE QUITINA (+1 HP POR ${loja.precoReparo1Hp} SUCATA)`, GREEN, 6);
      txt(162, 416, ehEnVp ? '[L-CLICK] RESTORES HULL INTEGRITY BEFORE UNDOCKING' : '[CLIQUE ESQ] RESTAURA INTEGRIDADE DO CASCO ANTES DE ZARPAR', TXT, 6);
    } else if (idHoverAtivo === 'BTN_SAIR_LOJA') {
      txt(162, 405, ehEnVp ? 'UNDOCK FROM FORGE-REEF AND RETURN TO ABYSSAL CHART' : 'DESATRACAR DO RECIFE-FORJA E RETORNAR À CARTA ABISSAL', CYAN, 6);
      txt(162, 416, ehEnVp ? '[L-CLICK] CONTINUE COURSE IN CURRENT SECTOR' : '[CLIQUE ESQ] PROSSEGUIR ROTA NO SETOR ATUAL', TXT, 6);
    } else {
      txt(162, 405, ehEnVp ? '[L-CLICK] BUY | [R-CLICK] SELL FROM HOLD/EQUIPPED' : '[ESQ] COMPRAR | [DIR] VENDER DO PORÃO/EQUIPADO', TXT, 6);
      txt(162, 416, ehEnVp ? 'OR CLICK [SELL P1..P4] ON THE RIGHT TO LIQUIDATE CARGO →' : 'OU CLIQUE EM [VEND P1..P4] À DIREITA P/ LIQUIDAR CARGA →', CYAN, 6);
    }
  } else if (faseJogo === 'EVENTO') {
    fillRect(150, 40, 959, 429, [7, 16, 24, 255], BORDER);
    const ev = viewModel.eventoResumo ?? {
      titulo: 'SINAL HIDROACÚSTICO DE EMERGÊNCIA',
      categoria: 'SOS',
      narrativaLinhas: ['CÁPSULA DE PESQUISA À DERIVA NO TEMPORAL.'],
      opcoes: [],
    };

    const vx0 = 168;
    const vy0 = 46;
    const vx1 = 942;
    const vy1 = 164;
    const yAguaEv = 128;
    const ehSosEv = ev.categoria !== 'PERIGO' && ev.categoria !== 'EXPLORACAO';
    const idEv = String(ev.idEvento ?? '');
    const usarBoiaNativaEv = !idEv || idEv === 'SOS_2_CAPSULA_AFUNDANDO' || idEv === 'SOS_6_MERGULHADOR_ISOLADO' || idEv === 'SOS_8_FAROL_SUBMERSO';
    if (assets.eventoPlay) {
      for (let py = 0; py < assets.eventoPlay.altura; py += 1) {
        const sy = vy0 + py;
        if (sy > vy1) break;
        const rowOff = py * assets.eventoPlay.largura;
        for (let px = 0; px < assets.eventoPlay.largura; px += 1) {
          const sx = vx0 + px;
          if (sx > vx1) break;
          const pxSrc = !usarBoiaNativaEv && px >= 540 ? Math.max(0, 1080 - px) : px;
          const sIdx = (rowOff + pxSrc) * 4;
          putPx(sx, sy, [assets.eventoPlay.rgba[sIdx], assets.eventoPlay.rgba[sIdx + 1], assets.eventoPlay.rgba[sIdx + 2], 255]);
        }
      }
    }
    const corChuvaEv = idEv === 'PER_1_CHUVA_ACIDA' ? [146, 236, 78, 185] : [112, 158, 182, 115];
    for (let ir = 0; ir < (idEv === 'PER_1_CHUVA_ACIDA' ? 30 : 18); ir += 1) {
      const rx = vx0 + 12 + ((ir * 71 + Math.round(tempoSeg * 110)) % (vx1 - vx0 - 24));
      const ry = vy0 + 4 + ((ir * 29 + Math.round(tempoSeg * 170)) % (yAguaEv - vy0 - 14));
      if (!(usarBoiaNativaEv && rx >= 748 && rx <= 858 && ry >= 52)) lineSeg(rx, ry, rx - 3, ry + 5, corChuvaEv, false);
    }

    const meiaAsaEv = idCarcaca === 'COURACA_LIMIAR' ? 40 : 26;
    const infoCascoEv = desenharMiniaturaBioNaveHiBit(208, 57, 144, 62);
    const xQuilhaEv = infoCascoEv ? infoCascoEv.xCentroCorpoCanvas : 286;
    const yBaseVentralEv = infoCascoEv ? infoCascoEv.buscarBaseVentralCanvas(xQuilhaEv) : 112;
    const palRaizEv = infoCascoEv?.paletaCascoMini ?? { dorso: [92, 46, 48], meio: [66, 44, 50], quilha: [20, 34, 46] };
    const yIniRaizEv = Math.max(92, yBaseVentralEv - 3);
    for (let syQ = yIniRaizEv; syQ <= 147; syQ += 1) {
      const distRaiz = syQ - yIniRaizEv;
      const alargRaiz = distRaiz < 7 ? Math.round((7 - distRaiz) * 1.1) : 0;
      if (syQ < yAguaEv) {
        putPx(xQuilhaEv - 3 - alargRaiz, syQ, [8, 14, 20, 255]);
        for (let dxQ = -2 - alargRaiz; dxQ <= 1 + alargRaiz; dxQ += 1) {
          const corRaiz = dxQ < -1 ? [...palRaizEv.dorso, 255] : dxQ <= 0 ? [...palRaizEv.meio, 255] : [...palRaizEv.quilha, 255];
          putPx(xQuilhaEv + dxQ, syQ, corRaiz);
        }
        putPx(xQuilhaEv + 2 + alargRaiz, syQ, [8, 14, 20, 255]);
      } else {
        putPx(xQuilhaEv - 3, syQ, [6, 16, 24, 255]);
        putPx(xQuilhaEv - 2, syQ, [52, 122, 144, 255]);
        putPx(xQuilhaEv - 1, syQ, [32, 82, 100, 255]);
        putPx(xQuilhaEv, syQ, [24, 64, 80, 255]);
        putPx(xQuilhaEv + 1, syQ, [16, 44, 58, 255]);
        putPx(xQuilhaEv + 2, syQ, [6, 16, 24, 255]);
      }
    }
    for (let dxA = -meiaAsaEv; dxA <= meiaAsaEv; dxA += 1) {
      const fracA = Math.abs(dxA) / meiaAsaEv;
      const espA = fracA > 0.78 ? 1 : fracA > 0.45 ? 2 : 3;
      const yTopoA = 146 + (fracA > 0.65 ? 1 : 0);
      const sxA = xQuilhaEv + dxA;
      putPx(sxA, yTopoA - 1, [6, 16, 24, 255]);
      putPx(sxA, yTopoA, fracA < 0.7 ? [58, 132, 154, 255] : [36, 92, 112, 255]);
      if (espA >= 2) putPx(sxA, yTopoA + 1, ((sxA + yTopoA) & 1) === 0 ? [30, 78, 96, 255] : [20, 56, 72, 255]);
      if (espA >= 3) putPx(sxA, yTopoA + 2, [16, 46, 60, 255]);
      putPx(sxA, yTopoA + espA, [6, 16, 24, 255]);
    }
    for (let sxF = xQuilhaEv - 18; sxF <= xQuilhaEv + 20; sxF += 1) {
      const distQ = Math.abs(sxF - xQuilhaEv);
      const yCr = yAguaEv - (distQ <= 5 ? 1 : 0) + Math.round(Math.sin(sxF * 0.35 + tempoSeg * 5) * 0.7);
      if (distQ <= 14) {
        putPx(sxF, yCr, distQ <= 6 || (sxF & 1) === 0 ? TXT : CYAN);
        putPx(sxF, yCr + 1, (sxF & 1) === 0 ? CYAN : [44, 138, 166, 255]);
      } else if ((sxF & 1) === 0) putPx(sxF, yCr + 1, CYAN);
    }
    for (let spE = 0; spE < 6; spE += 1) {
      const angE = (spE / 6) * Math.PI + tempoSeg * 6;
      putPx(xQuilhaEv + Math.round(Math.cos(angE) * (6 + (spE % 3) * 4)), yAguaEv - 2 - Math.abs(Math.round(Math.sin(angE) * 4)), spE % 2 === 0 ? TXT : CYAN);
    }

    if (idEv === 'SOS_5_BALEIA_ENCALHADA') {
      for (let sxB = 730; sxB <= 848; sxB += 1) {
        const uB = (sxB - 730) / 118;
        const yTopB = Math.round(126 - Math.sin(Math.pow(uB, 0.78) * Math.PI) * 40 - (uB > 0.86 ? (uB - 0.86) * 58 : 0));
        const yBotB = Math.min(148, Math.round(138 + Math.sin(uB * Math.PI) * 8));
        for (let syB = yTopB; syB <= yBotB; syB += 1) {
          const ehBorda = syB === yTopB || syB === yBotB || sxB === 730 || sxB === 848;
          const subB = syB > yAguaEv;
          const gomo = ((sxB + Math.round((syB - yTopB) * 0.4)) % 11) === 0;
          const corBaleia = ehBorda ? [7, 13, 19, 255] : subB ? [18, 52, 68, 240] : syB < yTopB + 6 ? (((sxB + syB) & 1) === 0 ? [112, 98, 92, 255] : [92, 78, 76, 255]) : gomo ? [34, 48, 58, 255] : syB < 114 ? [68, 56, 62, 255] : [42, 54, 66, 255];
          putPx(sxB, syB, corBaleia);
        }
      }
      fillRect(743, 114, 746, 116, CYAN);
      putPx(744, 115, TXT);
      for (const [vxB, vyB] of [[768, 98], [786, 96], [804, 100]]) {
        chanfradoBezel(vxB - 4, vyB - 2, vxB + 4, vyB + 3, [12, 46, 58, 255], CYAN, 1);
        putPx(vxB, vyB, GREEN);
      }
      for (let spB = 0; spB < 10; spB += 1) putPx(756 + Math.round(Math.sin(spB * 1.7 + tempoSeg * 5) * (1 + spB * 0.4)), 86 - spB * 2, spB % 2 === 0 ? TXT : CYAN);
      for (const [bxR, topR, wBaseR] of [[724, 90, 11], [852, 82, 13]]) {
        for (let ryR = topR; ryR <= 156; ryR += 1) {
          const degR = Math.round(Math.sin(ryR * 0.37 + bxR) * 1.6);
          const hwR = Math.max(2, Math.min(wBaseR, 2 + Math.floor((ryR - topR) * 0.16) + (ryR % 7 === 0 ? 1 : 0)));
          for (let dxR = -hwR; dxR <= hwR; dxR += 1) {
            const cR = Math.abs(dxR) === hwR || ryR === topR ? [7, 12, 18, 255] : ryR > yAguaEv ? [14, 34, 46, 235] : dxR < -1 ? [62, 78, 92, 255] : dxR <= 2 ? [36, 46, 58, 255] : [20, 28, 36, 255];
            putPx(bxR + degR + dxR, ryR, cR);
          }
        }
      }
      for (let sxS = 710; sxS <= 868; sxS += 1) {
        const ySp = yAguaEv + Math.round(Math.sin(sxS * 0.24 + tempoSeg * 5) * 1.1);
        putPx(sxS, ySp, (sxS % 3) === 0 ? CYAN : TXT);
        if ((sxS & 1) === 0) putPx(sxS, ySp + 1, CYAN);
      }
    } else if (idEv === 'PER_2_VORTICE_CORRENTEZA') {
      for (let dyV = 0; dyV <= 28; dyV += 1) {
        const hwV = Math.max(3, Math.round(58 * Math.pow(1 - dyV / 30, 1.35)));
        const cFundoV = dyV < 5 ? [6, 20, 30, 245] : dyV < 14 ? [4, 12, 20, 252] : [3, 8, 14, 255];
        hLine(792 - hwV, 792 + hwV, yAguaEv + dyV, cFundoV, 1);
      }
      for (let an = 0; an < 5; an += 1) {
        const rxV = 62 - an * 11;
        const ryV = Math.max(2, 6 - an);
        const yCentroV = yAguaEv + 2 + an * 4;
        for (let st = 0; st < 96; st += 1) {
          if ((st + an * 7) % 16 >= 12) continue;
          const thV = (st / 96) * Math.PI * 2 + tempoSeg * (2.6 + an * 0.5);
          const pxV = 792 + Math.round(Math.cos(thV) * rxV);
          const pyV = yCentroV + Math.round(Math.sin(thV) * ryV);
          if (pyV >= yAguaEv - 1 && pyV <= vy1 - 2) putPx(pxV, pyV, an === 0 && (st & 1) === 0 ? TXT : an < 3 ? CYAN : [38, 124, 152, 255]);
        }
      }
      lineSeg(xQuilhaEv + meiaAsaEv + 4, 147, 742, 136, [79, 242, 255, 165], true);
    } else if (idEv === 'PER_1_CHUVA_ACIDA') {
      fillRect(676, 50, 916, 68, [34, 52, 28, 145]);
      for (let ia = 0; ia < 14; ia += 1) {
        const ax = 682 + ((ia * 19 + Math.round(tempoSeg * 24)) % 226);
        fillRect(ax - 2, yAguaEv - 1, ax + 2, yAguaEv, ia % 2 === 0 ? GREEN : AMBER);
        putPx(ax, yAguaEv - 4 - ((ia * 5 + Math.round(tempoSeg * 18)) % 9), GREEN);
      }
    } else if (idEv === 'PER_3_AGUAS_TURVAS') {
      for (let ny = 96; ny <= 161; ny += 3) fillRect(692 + ((ny * 7) % 18), ny, 932, ny + 2, ny < yAguaEv ? [14, 24, 34, 175] : [8, 14, 22, 225]);
      const spMinaEv = assets.iconesHiBit?.MINA_MAGNETICA;
      if (spMinaEv) blitIconeHiBit(spMinaEv, 766, yAguaEv - 12, false);
      fillRect(838, 144, 840, 145, RED);
      fillRect(846, 144, 848, 145, RED);
    } else if (idEv === 'SOS_1_PESQUEIRO_SIMBIOTICO' || idEv === 'SOS_4_COMBOIO_ENCALHADO' || idEv === 'EXP_1_NAUFRAGIO_ANTIGO') {
      const spNavEv = idEv === 'SOS_4_COMBOIO_ENCALHADO' ? assets.bestiario57a?.BARCO_2_CORVETA : assets.bestiario57a?.BARCO_3_ARRASTAO;
      if (spNavEv) desenharRetratoRecortadoHiBit(spNavEv, 730, 86, 134, 52);
      hLine(724, 868, yAguaEv, TXT, 1);
      if (idEv === 'SOS_1_PESQUEIRO_SIMBIOTICO') lineSeg(754, 118, 824, 152, CYAN, true);
      if (idEv === 'SOS_4_COMBOIO_ENCALHADO') fillRect(794, 80, 799, 85, Math.sin(tempoSeg * 7) > 0 ? YELLOW : AMBER);
    } else if (idEv === 'EXP_2_PLATAFORMA_FANTASMA' || idEv === 'EXP_4_DESTROCOS_DRONE') {
      if (idEv === 'EXP_2_PLATAFORMA_FANTASMA') {
        fillRect(784, 72, 798, 152, [24, 38, 48, 255], [7, 12, 18, 255]);
        for (let rS = 14; rS <= 38; rS += 12) chanfradoBezel(791 - rS, 76 - Math.floor(rS / 2), 791 + rS, 76 + Math.floor(rS / 2), null, CYAN, 2);
      } else {
        chanfradoBezel(758, 116, 826, 136, [28, 38, 48, 255], CYAN, 2, AMBER);
        lineSeg(772, 114, 784, 102, YELLOW, false);
      }
      hLine(746, 838, yAguaEv, TXT, 1);
    } else if (idEv === 'EXP_5_FONTE_HIDROTERMAL') {
      for (let vyF = 114; vyF <= 161; vyF += 1) {
        const hwF = 6 + Math.floor((vyF - 114) * 0.22);
        fillRect(790 - hwF, vyF, 790 + hwF, vyF, [26, 30, 38, 255], [8, 12, 18, 255]);
      }
      for (let ib = 0; ib < 12; ib += 1) {
        putPx(784 + ((ib * 7) % 13), 112 - ((ib * 9 + Math.round(tempoSeg * 22)) % 36), ib % 2 === 0 ? AMBER : CYAN);
      }
      hLine(766, 814, yAguaEv, AMBER, 1);
    } else if (!usarBoiaNativaEv) {
      const spRecifeEv = assets.iconesHiBit?.RECIFE_FORJA;
      if (spRecifeEv) blitIconeHiBit(spRecifeEv, 766, yAguaEv - 20, false);
      hLine(748, 828, yAguaEv, idEv === 'SOS_7_BALSA_TOXICA' ? GREEN : CYAN, 1);
      if (idEv === 'EXP_6_CORAL_NEGRO') lineSeg(756, 126, 764, 98, VIOLET, false);
    }

    const ehEnEv = viewModel.configuracoesSteam?.idioma === 'en-US';
    const seloEvTxt = String(ev.seloCenarioCurto ?? (ehSosEv ? (ehEnEv ? 'SOS SIGNAL' : 'SINAL SOS') : ev.categoria === 'PERIGO' ? (ehEnEv ? 'HAZARD ZONE' : 'ZONA HOSTIL') : (ehEnEv ? 'EXPLORATION' : 'EXPLORAÇÃO'))).slice(0, 14);
    const wSeloEv = Math.max(88, seloEvTxt.length * 7 + 12);
    const x0SeloEv = 934 - wSeloEv;
    if (ehSosEv) {
      if (usarBoiaNativaEv) {
        const luzSos = Math.sin(tempoSeg * 6) > 0;
        fillRect(801, 56, 807, 61, luzSos ? YELLOW : AMBER);
        putPx(804, 58, TXT);
      }
      chanfradoBezel(x0SeloEv, 56, 934, 70, [8, 18, 28, 226], AMBER, 2);
      txt(x0SeloEv + 5, 60, seloEvTxt, AMBER, 7);
    } else if (ev.categoria === 'PERIGO') {
      chanfradoBezel(x0SeloEv, 56, 934, 70, [34, 10, 16, 232], RED, 2);
      txt(x0SeloEv + 5, 60, seloEvTxt, RED, 7);
    } else {
      chanfradoBezel(x0SeloEv, 56, 934, 70, [8, 28, 24, 232], GREEN, 2);
      txt(x0SeloEv + 5, 60, seloEvTxt, GREEN, 7);
    }
    chanfradoBezel(vx0, vy0, vx1, vy1, null, BORDER, 3, [44, 78, 98, 200]);

    panel(168, 170, 942, 238);
    const corBadgeEv = ev.categoria === 'PERIGO' ? RED : ev.categoria === 'EXPLORACAO' ? GREEN : AMBER;
    chanfradoBezel(178, 178, 250, 192, [14, 24, 34, 255], corBadgeEv, 2);
    const catEvBadge = ehEnEv
      ? (ev.categoria === 'PERIGO' ? 'HAZARD' : ev.categoria === 'EXPLORACAO' ? 'EXPLORE' : ev.categoria)
      : ev.categoria;
    txt(183, 182, catEvBadge, corBadgeEv, 7);
    txt(258, 181, String(ev.titulo ?? '').slice(0, 66), CYAN, 8);
    const hbOfEv = hitboxes.find((h) => h.idHitbox === 'BTN_ABRIR_OFICINA');
    if (hbOfEv) {
      const hovOfEv = idHoverAtivo === hbOfEv.idHitbox;
      chanfradoBezel(hbOfEv.x, hbOfEv.y, hbOfEv.x + hbOfEv.largura - 1, hbOfEv.y + hbOfEv.altura - 1, [14, 34, 48, 250], hovOfEv ? YELLOW : CYAN, 2, TXT);
      txt(hbOfEv.x + 12, hbOfEv.y + 6, ehEnEv ? '[U] WORKSHOP' : '[U] BIO-OFICINA', hovOfEv ? YELLOW : CYAN, 7);
    }
    (ev.narrativaLinhas ?? []).slice(0, 3).forEach((lin, i) => {
      txt(178, 199 + i * 12, String(lin).slice(0, 104), TXT, 7);
    });

    const hbOps = hitboxes.filter((h) => h.tipo === 'OPCAO_EVENTO');
    (ev.opcoes ?? []).slice(0, 3).forEach((op, idx) => {
      const hb = hbOps[idx];
      if (!hb) return;
      const hov = idHoverAtivo === hb.idHitbox;
      const dyP = idPressAtivo === hb.idHitbox ? 1 : 0;
      const corB = op.bloqueada ? RED : hov ? YELLOW : op.azul ? CYAN : BORDER;
      const corBg = op.bloqueada ? [24, 12, 16, 255] : op.azul ? (hov ? [16, 46, 60, 255] : [10, 32, 44, 255]) : (hov ? [18, 30, 40, 255] : [10, 18, 26, 255]);
      chanfradoBezel(hb.x, hb.y + dyP, hb.x + hb.largura - 1, hb.y + hb.altura - 1, corBg, corB, 3);
      let xTxtOp = hb.x + 12;
      if (op.azul) {
        if (viewModel.edicaoComercialSteam) {
          const reqBruto = `${JSON.stringify(ev.requisitoBlueOption ?? '')} ${op.rotulo ?? ''} ${op.detalhe ?? ''}`.toUpperCase();
          const especieReq = /\bARRAIA\b|\bRAY\b/.test(reqBruto)
            ? 'ARRAIA'
            : /\bBAIACU\b|\bPUFFER\b/.test(reqBruto)
              ? 'BAIACU'
              : /\bCARANGUEJO\b|\bCRAB\b/.test(reqBruto)
                ? 'CARANGUEJO'
                : /\bPOLVO\b|\bOCTOPUS\b/.test(reqBruto)
                  ? 'POLVO'
                  : null;
          if (especieReq) {
            const retEsp = assets.retratos?.[especieReq];
            if (!desenharPersonagemPose4F(especieReq, f4Anim % 2, hb.x + 28, hb.y + 22 + dyP, 36, 32, false, false)) {
              if (retEsp) desenharRetratoRecortadoHiBit(retEsp, hb.x + 10, hb.y + 6 + dyP, 36, 31);
              else blitMatrizToken(SPRITES_HB.BULBO_NEURAL, hb.x + 12, hb.y + 10 + dyP, 2, 2);
            }
          } else {
            const matEquip = /FURTIV|TINTA|CLOAK|INK/.test(reqBruto)
              ? (SPRITES_HB.BOLSA_TINTA_CEGANTE ?? SPRITES_HB.BULBO_NEURAL)
              : /ELETRO|ION|VOLT|REATOR|REACTOR/.test(reqBruto)
                ? (SPRITES_HB.ELETRO_PLACA_ARRAIA ?? SPRITES_HB.CORACAO_BIO_ELETRICO ?? SPRITES_HB.BULBO_NEURAL)
                : /CORTADOR|TERM|BEAM|PLASMA|FORJA/.test(reqBruto)
                  ? (SPRITES_HB.CORTADOR_TERMICO_PLASMA ?? SPRITES_HB.GLANDULA_TERMOFILICA ?? SPRITES_HB.BULBO_NEURAL)
                  : /ARPAO|ARPÃO|HARPOON|TORPEDO|DENTE|LEVIAT/.test(reqBruto)
                    ? (SPRITES_HB.CANHAO_ARPAO_CABO ?? SPRITES_HB.DENTE_LEVIATA_SERRILHADO ?? SPRITES_HB.BULBO_NEURAL)
                    : /TUBO|ABORD|BOARD|VALVULA|VÁLVULA/.test(reqBruto)
                      ? (SPRITES_HB.VALVULA_ESFINCTER ?? SPRITES_HB.BULBO_NEURAL)
                      : /BRANQUIA|BRÂNQUIA|PRESSAO|PRESSÃO|GILL|FOIL|MASTRO|BARREIRA|SHIELD/.test(reqBruto)
                        ? (SPRITES_HB.BEXIGA_PRESSAO_ABISSAL ?? SPRITES_HB.CORACAO_BIO_ELETRICO ?? SPRITES_HB.BULBO_NEURAL)
                        : SPRITES_HB.BULBO_NEURAL;
            chanfradoBezel(hb.x + 10, hb.y + 6 + dyP, hb.x + 45, hb.y + 34 + dyP, [8, 28, 38, 250], op.bloqueada ? RED : CYAN, 2);
            const altMat = Array.isArray(matEquip) ? matEquip.length : 12;
            const largMat = Array.isArray(matEquip?.[0]) ? matEquip[0].length : 12;
            const escSpr = largMat > 16 || altMat > 14 ? 1 : 2;
            const sxEq = hb.x + 28 - Math.floor((largMat * escSpr) / 2);
            const syEq = hb.y + 20 + dyP - Math.floor((altMat * escSpr) / 2);
            blitMatrizToken(matEquip, sxEq, syEq, escSpr, escSpr);
          }
        } else {
          const retAz = assets.retratos?.POLVO;
          if (!desenharPersonagemPose4F('POLVO', f4Anim % 2, hb.x + 28, hb.y + 22 + dyP, 36, 32, false, false)) {
            if (retAz) desenharRetratoRecortadoHiBit(retAz, hb.x + 10, hb.y + 6 + dyP, 36, 31);
            else blitMatrizToken(SPRITES_HB.BULBO_NEURAL, hb.x + 12, hb.y + 10 + dyP, 2, 2);
          }
        }
        chanfradoBezel(hb.x + 52, hb.y + 6 + dyP, hb.x + 138, hb.y + 20 + dyP, op.bloqueada ? [38, 12, 18, 255] : [14, 58, 76, 255], op.bloqueada ? RED : CYAN, 2);
        txt(hb.x + 57, hb.y + 10 + dyP, op.bloqueada ? (ehEnEv ? 'BLUE LOCKED' : 'AZUL BLOQ.') : (ehEnEv ? 'BLUE OPTION' : 'OPÇÃO AZUL'), op.bloqueada ? RED : CYAN, 7);
        xTxtOp = hb.x + 146;
      }
      const maxRot = op.azul ? 76 : 94;
      const maxDet = op.azul ? 86 : 104;
      txt(xTxtOp, hb.y + 8 + dyP, String(op.rotulo).slice(0, maxRot), op.bloqueada ? RED : hov ? YELLOW : op.azul ? CYAN : TXT, 8);
      txt(xTxtOp, hb.y + 25 + dyP, String(op.detalhe).slice(0, maxDet), op.bloqueada ? AMBER : op.azul ? GREEN : AMBER, 7);
    });

    panel(168, 392, 942, 424);
    const hbHovEv = hitboxes.find((h) => h.idHitbox === idHoverAtivo && h.tipo === 'OPCAO_EVENTO');
    if (hbHovEv) {
      const mE = hbHovEv.metadados;
      const codOp = mE.opcao ?? mE.codigoOpcao ?? 'A';
      txt(178, 398, `${ehEnEv ? 'PREVIEW' : 'PRÉVIA'} [${codOp}]: ${String(mE.detalhe || mE.rotulo).slice(0, 96)}`, mE.azul ? (mE.bloqueada ? RED : CYAN) : YELLOW, 7);
      txt(178, 411, mE.bloqueada ? (ehEnEv ? 'MISSING REQUIREMENT — OPEN [U] WORKSHOP OR PICK [A]/[C]' : 'REQUISITO AUSENTE NA BIO-NAVE — ABRA [U] BIO-OFICINA OU ESCOLHA [A]/[C]') : (ehEnEv ? '[LEFT CLICK] EXECUTE DECISION IMMEDIATELY' : '[CLIQUE ESQ] EXECUTAR DECISÃO IMEDIATAMENTE'), mE.bloqueada ? RED : GREEN, 7);
    } else {
      txt(178, 404, ev.blueOptionDisponivel ? (ehEnEv ? '[B] BLUE OPTION UNLOCKED ON YOUR BIO-SHIP! CHOOSE [A], [B] OR [C]' : '[B] OPÇÃO AZUL DESBLOQUEADA NA SUA BIO-NAVE! ESCOLHA [A], [B] OU [C]') : (ehEnEv ? 'OPTION [B] REQUIRES SPECIAL GEAR (OR EQUIP IN [U] WORKSHOP)' : 'OPÇÃO [B] EXIGE EQUIPAMENTO ESPECÍFICO (OU EQUIPE EM [U] BIO-OFICINA)'), ev.blueOptionDisponivel ? GREEN : CYAN, 7);
    }
  }
}

export function renderizarModalSaqueOverlay(ctx) {
  const { viewModel, assets, hitboxes, idHoverAtivo, BORDER, TXT, DIM, GREEN, CYAN, AMBER, YELLOW, SPRITES_INSUMOS, SPRITES_HB, fillRect, chanfradoBezel, txt, blitIconeHiBit, blitMatrizToken } = ctx;
  const ehEnSq = viewModel.configuracoesSteam?.idioma === 'en-US';

  fillRect(152, 41, 957, 428, [4, 9, 14, 188]);
  const sq = viewModel.saqueResumo ?? {};
  chanfradoBezel(204, 86, 708, 376, [8, 17, 26, 252], CYAN, 4, TXT);
  fillRect(210, 92, 702, 122, [14, 38, 52, 235]);
  const modVit = String(sq.modalidadeVitoria ?? 'DESTRUICAO_BRUTA');
  const titMod = ehEnSq
    ? (modVit === 'CAPTURA_INTACTA'
        ? 'VICTORY: INTACT VESSEL CAPTURE (+50% SCRAP!)'
        : modVit === 'EXTRACAO_CIRURGICA'
          ? 'VICTORY: SURGICAL SYMBIOTIC GRAFT (+PURE ORGAN!)'
          : modVit === 'RENDICAO_NEGOCIADA'
            ? 'CEASE-FIRE: ENEMY SURRENDER TRIBUTE ACCEPTED!'
            : 'COMBAT VICTORY: TARGET HULL DESTROYED')
    : (modVit === 'CAPTURA_INTACTA'
        ? 'VITÓRIA: CAPTURA INTACTA DE EMBARCAÇÃO (+50% SUCATA!)'
        : modVit === 'EXTRACAO_CIRURGICA'
          ? 'VITÓRIA: EXTRAÇÃO CIRÚRGICA SIMBIÓTICA (+ÓRGÃO PURO!)'
          : modVit === 'RENDICAO_NEGOCIADA'
            ? 'CESSAR-FOGO: TRIBUTO DE RENDIÇÃO INIMIGA ACEITO!'
            : 'VITÓRIA EM COMBATE: DESTRUIÇÃO BRUTA DO ALVO');
  txt(
    220,
    102,
    titMod.slice(0, 66),
    modVit === 'CAPTURA_INTACTA' || modVit === 'RENDICAO_NEGOCIADA' ? YELLOW : modVit === 'EXTRACAO_CIRURGICA' ? GREEN : CYAN,
    7
  );

  const ganhos = ehEnSq
    ? [['+SCRAP', Number(sq.sucataGanha ?? 0), GREEN], ['+BIOMASS', Number(sq.biomassaGanha ?? 0), CYAN], ['+FUEL', Number(sq.combustivelGanho ?? 0), AMBER], ['+AMMO', Number(sq.municaoGanha ?? 0), TXT]]
    : [['+SUCATA', Number(sq.sucataGanha ?? 0), GREEN], ['+BIOMASSA', Number(sq.biomassaGanha ?? 0), CYAN], ['+COMBUST.', Number(sq.combustivelGanho ?? 0), AMBER], ['+MUNIÇÃO', Number(sq.municaoGanha ?? 0), TXT]];
  ganhos.forEach(([rotG, valG, corG], idxG) => {
    const gx0 = 222 + idxG * 118;
    chanfradoBezel(gx0, 136, gx0 + 110, 196, [6, 13, 20, 255], valG > 0 ? corG : BORDER, 3);
    txt(gx0 + 10, 146, rotG, DIM, 7);
    txt(gx0 + 18, 168, `+${valG}`, valG > 0 ? corG : DIM, 8);
  });

  chanfradoBezel(222, 208, 690, 272, [6, 14, 22, 255], sq.itemDropado ? YELLOW : BORDER, 3);
  if (sq.itemDropado) {
    const idDrop = String(sq.itemDropado.id ?? '');
    const matAeDrop = SPRITES_INSUMOS?.[idDrop] ?? SPRITES_HB?.[idDrop] ?? null;
    const icDrop = assets.iconesHiBit?.[idDrop] ?? (!matAeDrop ? assets.iconesHiBit?.GLANDULA_BAIACU : null);
    if (icDrop) {
      blitIconeHiBit(icDrop, 238, 218, true);
    } else if (matAeDrop && blitMatrizToken) {
      blitMatrizToken(matAeDrop, 236, 220, 2, 2, true);
    }
    const nomeLimpoDrop = String(sq.itemDropado.nome ?? idDrop).replace(/\s*\([^)]*\)\s*$/g, '').toUpperCase();
    txt(298, 220, `${ehEnSq ? 'STORED IN HOLD' : 'CAPTURADO NO PORÃO'}: ${nomeLimpoDrop}`.slice(0, 52), YELLOW, 7);
    txt(
      298,
      240,
      ehEnSq
        ? `REAL HOLD MASS: +${Number(sq.itemDropado.pesoKg ?? 5)} kg — EQUIP OR JETTISON IN [U] WORKSHOP`
        : `MASSA REAL NO PORÃO: +${Number(sq.itemDropado.pesoKg ?? 5)} kg — EQUIPE OU EJETE EM [U] OFICINA`,
      GREEN,
      6
    );
  } else {
    txt(238, 226, ehEnSq ? 'NO EXTRA WEAPON CHASSIS OR ORGAN RECOVERED' : 'NENHUM CHASSI OU ÓRGÃO EXTRA RECOLHIDO NESTE ENCONTRO', DIM, 7);
    txt(238, 244, ehEnSq ? 'TIP: BOARD CREW OR DESTROY MONSTER GANGLION FOR DROPS!' : 'DICA: ABORDE TRIPULAÇÃO HUMANA OU DESTRUA GÂNGLIO MONSTRO P/ DROPS!', CYAN, 6);
  }

  if (Number(sq.abordadoresResgatados ?? 0) > 0) {
    txt(
      224,
      286,
      ehEnSq
        ? `BOARDING TEAM RECOVERED SAFELY ABOARD: ${sq.abordadoresResgatados} CREWMEMBER(S)`
        : `EQUIPE DE ABORDAGEM RECOLHIDA A BORDO COM SEGURANÇA: ${sq.abordadoresResgatados} TRIPULANTE(S)`,
      GREEN,
      6
    );
  } else {
    txt(
      224,
      286,
      ehEnSq
        ? 'HYDROSTATIC INTEGRITY STABILIZED — READY TO RESUME COURSE'
        : 'INTEGRIDADE HIDROSTÁTICA ESTABILIZADA — PRONTO PARA RETOMAR NAVEGAÇÃO',
      TXT,
      6
    );
  }

  const hbConfSq = hitboxes.find((h) => h.idHitbox === 'SAQUE_CONFIRMAR');
  if (hbConfSq) {
    const hovSq = idHoverAtivo === hbConfSq.idHitbox;
    chanfradoBezel(hbConfSq.x, hbConfSq.y, hbConfSq.x + hbConfSq.largura - 1, hbConfSq.y + hbConfSq.altura - 1, [14, 50, 36, 255], hovSq ? YELLOW : GREEN, 3, TXT);
    txt(hbConfSq.x + 18, hbConfSq.y + 12, ehEnSq ? '[ENTER] COLLECT & SAIL' : '[ENTER] RECOLHER & ZARPAR', hovSq ? YELLOW : GREEN, 7);
  }
}

export function renderizarModalOficinaOverlay(ctx) {
  const { viewModel, opcoes, hitboxes, tempoSeg, idHoverAtivo, faseJogo, BORDER, RIM, TXT, DIM, GREEN, CYAN, AMBER, RED, YELLOW, VIOLET, NOMES_ARMAS, fillRect, chanfradoBezel, txt, segBar } = ctx;
  const ehEnOf = viewModel.configuracoesSteam?.idioma === 'en-US';

  const geomOf = calcularGeometriaOficina960();
  const cxExt = geomOf.caixaExterna;
  fillRect(152, 41, 957, 428, [5, 11, 17, 248]);
  chanfradoBezel(cxExt.x0, cxExt.y0, cxExt.x1, cxExt.y1, [8, 15, 23, 252], CYAN, 3, RIM);
  const ofic = viewModel.oficinaResumo ?? {};
  const moedaReator = ofic.moedaReator ?? 'SUCATA';
  const sucSaldo = Number(viewModel.barraSuperior?.recursos?.sucata ?? 0);
  const bioSaldo = Number(viewModel.barraSuperior?.recursos?.biomassa ?? 0);
  const emLoja = faseJogo === 'LOJA';

  txt(166, 56, ehEnOf ? 'BIO-WORKSHOP — 10 UPGRADE TREES & CARGO HOLD' : 'OFICINA BIO-MECÂNICA — 10 ÁRVORES & PORÃO', CYAN, 6);
  const hbAbandonar = hitboxes.find((h) => h.idHitbox === 'OFICINA_ABANDONAR_RUN') ?? geomOf.btnAbandonarRun;
  if (hbAbandonar) {
    const hovAb = idHoverAtivo === 'OFICINA_ABANDONAR_RUN';
    const pendAb = Boolean(ofic.confirmarAbandonoPendente);
    const piscaAb = pendAb && Math.sin(tempoSeg * 9) > 0;
    chanfradoBezel(hbAbandonar.x, hbAbandonar.y, hbAbandonar.x + hbAbandonar.largura - 1, hbAbandonar.y + hbAbandonar.altura - 1, pendAb ? [62, 12, 18, 255] : [30, 14, 18, 255], hovAb || piscaAb ? YELLOW : pendAb ? RED : AMBER, 2);
    txt(hbAbandonar.x + 6, hbAbandonar.y + 7, pendAb ? (ehEnOf ? '[!] CONFIRM END!' : '[!] CONFIRMAR FIM!') : (ehEnOf ? 'ABANDON RUN' : 'ABANDONAR EXPED.'), pendAb || hovAb ? YELLOW : AMBER, 6);
  }
  const hbMoedaR = hitboxes.find((h) => h.idHitbox === 'OFICINA_MOEDA_REATOR');
  if (hbMoedaR) {
    const hovMR = idHoverAtivo === hbMoedaR.idHitbox;
    chanfradoBezel(hbMoedaR.x, hbMoedaR.y, hbMoedaR.x + hbMoedaR.largura - 1, hbMoedaR.y + hbMoedaR.altura - 1, [16, 30, 42, 255], hovMR ? YELLOW : VIOLET, 2);
    txt(
      hbMoedaR.x + 6,
      hbMoedaR.y + 7,
      ehEnOf
        ? `REACTOR: ${moedaReator === 'BIOMASSA' ? 'BIOMASS' : 'SCRAP'}`
        : `REATOR: ${moedaReator === 'BIOMASSA' ? 'BIOMASSA' : 'SUCATA'}`,
      hovMR ? YELLOW : CYAN,
      6
    );
  }
  const hbFecharOf = hitboxes.find((h) => h.idHitbox === 'OFICINA_FECHAR');
  if (hbFecharOf) {
    const hovFO = idHoverAtivo === hbFecharOf.idHitbox;
    chanfradoBezel(hbFecharOf.x, hbFecharOf.y, hbFecharOf.x + hbFecharOf.largura - 1, hbFecharOf.y + hbFecharOf.altura - 1, [38, 18, 22, 255], hovFO ? YELLOW : RED, 2);
    txt(hbFecharOf.x + 8, hbFecharOf.y + 7, ehEnOf ? '[ESC] CLOSE' : '[ESC] FECHAR', hovFO ? YELLOW : TXT, 6);
  }

  const arvoresLista = ofic.arvores ?? [];
  arvoresLista.slice(0, 10).forEach((arv) => {
    const hbU = hitboxes.find((h) => h.idHitbox === `OFICINA_UPGRADE_${arv.idArvore}`);
    if (!hbU) return;
    const hovU = idHoverAtivo === hbU.idHitbox;
    const noMax = Boolean(arv.noMaximo);
    const pode = Boolean(arv.podeComprar);
    const corB = hovU ? YELLOW : noMax ? AMBER : pode ? GREEN : [44, 62, 76, 255];
    chanfradoBezel(hbU.x, hbU.y, hbU.x + hbU.largura - 1, hbU.y + hbU.altura - 1, hovU ? [14, 28, 38, 255] : [8, 16, 24, 255], corB, 2);
    txt(hbU.x + 5, hbU.y + 5, String(arv.nomeCurto ?? arv.idArvore).slice(0, 19), hovU ? YELLOW : TXT, 6);
    const nvAt = Number(arv.nivelAtual ?? 0);
    const nvMx = Math.max(1, Number(arv.nivelMax ?? 4));
    const nPipsU = Math.min(8, nvMx);
    const nFillU = Math.min(nPipsU, Math.round((nvAt / nvMx) * nPipsU));
    segBar(hbU.x + 132, hbU.y + 5, nPipsU, nFillU, Math.max(4, Math.floor(72 / nPipsU) - 2), 6, 2, noMax ? AMBER : GREEN);
    const siglaArvM = arv.moeda === 'BIOMASSA' ? 'BIO' : (ehEnOf ? 'SCR' : 'SUC');
    const txtCusto = noMax
      ? (ehEnOf ? `MAX LV.${nvAt}` : `MÁX NV.${nvAt}`)
      : `${ehEnOf ? 'LV' : 'NV'}.${nvAt}->${nvAt + 1}: ${arv.custoProximo} ${siglaArvM}`;
    txt(hbU.x + 5, hbU.y + 21, txtCusto.slice(0, 22), noMax ? AMBER : pode ? (arv.moeda === 'BIOMASSA' ? CYAN : GREEN) : DIM, 6);
    if (arv.detalheCurto) {
      txt(hbU.x + 132, hbU.y + 21, String(arv.detalheCurto).slice(0, 13), AMBER, 6);
    }
  });

  txt(168, 294, ehEnOf ? 'ACTIVE DORSAL SLOTS (STORE CHASSIS OR EXTRACT ORGAN TO HOLD):' : 'SLOTS DORSAIS ATIVOS (GUARDAR CHASSI OU EXTRAIR ÓRGÃO PARA O PORÃO):', AMBER, 6);
  for (let k = 0; k < 4; k += 1) {
    const slotA = viewModel.caixaArmas?.[k] ?? { ocupado: false };
    const cxD = geomOf.caixaSlotDorsal(k);
    chanfradoBezel(
      cxD.x,
      cxD.y,
      cxD.x + cxD.largura - 1,
      cxD.y + cxD.altura - 1,
      [6, 13, 20, 255],
      slotA.ocupado ? CYAN : BORDER,
      2
    );
    const siglaHudOf = slotA.ocupado
      ? obterSiglaHudArma(slotA.chassiId, viewModel.configuracoesSteam?.idioma)
      : null;
    const nmA = slotA.ocupado
      ? (siglaHudOf ?? NOMES_ARMAS[slotA.chassiId] ?? String(slotA.chassiId))
      : (ehEnOf ? 'EMPTY SLOT' : 'SLOT VAZIO');
    txt(cxD.x + 4, cxD.y + 7, `[${k + 1}] ${nmA}`, slotA.ocupado ? TXT : DIM, 6);
    const nOrgA = (slotA.orgaosEnxertados ?? []).length;
    txt(cxD.x + 4, cxD.y + 23, slotA.ocupado ? `${ehEnOf ? 'ORGANS' : 'ÓRGÃOS'}: ${nOrgA}/${slotA.soquetesMax ?? 0}` : '0 kg', nOrgA > 0 ? GREEN : DIM, 6);

    const hbDes = hitboxes.find((h) => h.idHitbox === `OFICINA_ARMA_DESEQUIPAR_${k}`);
    if (hbDes) {
      const hovD = idHoverAtivo === hbDes.idHitbox;
      chanfradoBezel(hbDes.x, hbDes.y, hbDes.x + hbDes.largura - 1, hbDes.y + hbDes.altura - 1, [12, 24, 34, 255], hovD ? YELLOW : slotA.ocupado ? CYAN : DIM, 2);
      txt(hbDes.x + 6, hbDes.y + 8, ehEnOf ? '→ HOLD' : '→ PORÃO', slotA.ocupado ? (hovD ? YELLOW : CYAN) : DIM, 6);
    }
    const hbRemO = hitboxes.find((h) => h.idHitbox === `OFICINA_ARMA_REMOVER_ORGAO_${k}`);
    if (hbRemO) {
      const hovRO = idHoverAtivo === hbRemO.idHitbox;
      chanfradoBezel(hbRemO.x, hbRemO.y, hbRemO.x + hbRemO.largura - 1, hbRemO.y + hbRemO.altura - 1, [22, 16, 32, 255], hovRO ? YELLOW : nOrgA > 0 ? VIOLET : DIM, 2);
      txt(hbRemO.x + 6, hbRemO.y + 8, ehEnOf ? '-1 ORGAN' : '-1 ÓRGÃO', nOrgA > 0 ? (hovRO ? YELLOW : TXT) : DIM, 6);
    }
  }

  chanfradoBezel(620, 80, 948, 412, [6, 13, 20, 255], BORDER, 3);
  const poraoSlots = ofic.porao ?? [null, null, null, null];
  for (let c = 0; c < 4; c += 1) {
    const cxP = geomOf.caixaSlotPorao(c);
    const yBase = cxP.y;
    const itemP = poraoSlots[c];
    chanfradoBezel(cxP.x, yBase, cxP.x + cxP.largura - 1, yBase + cxP.altura, [10, 19, 28, 255], itemP ? AMBER : [28, 44, 56, 255], 2);
    txt(632, yBase + 6, `${ehEnOf ? 'HOLD' : 'PORÃO'} #${c + 1}:`, CYAN, 6);
    if (itemP) {
      const ehArmaP = itemP.tipo === 'ARMA';
      const ehPassivoP = Boolean(itemP.ehPassivoPorao);
      const tipoItemP = ehEnOf
        ? (ehArmaP ? 'WEAPON' : ehPassivoP ? 'PASSIVE' : 'ORGAN')
        : (ehPassivoP ? 'PASSIVO' : itemP.tipo);
      txt(692, yBase + 6, String(itemP.nome ?? itemP.id).slice(0, 26), YELLOW, 6);
      txt(
        632,
        yBase + 22,
        ehPassivoP
          ? (ehEnOf
              ? `${tipoItemP} | MASS: +${itemP.pesoKg ?? 5}kg | ACTIVE IN HOLD`
              : `${tipoItemP} | MASSA: +${itemP.pesoKg ?? 5}kg | ATIVO NO PORÃO`)
          : ehEnOf
            ? `${tipoItemP} | REAL MASS: +${itemP.pesoKg ?? 5}kg | SLOT #${(opcoes.slotArmaSelecionado ?? 0) + 1}`
            : `${itemP.tipo} | MASSA REAL: +${itemP.pesoKg ?? 5}kg | SLOT #${(opcoes.slotArmaSelecionado ?? 0) + 1}`,
        ehPassivoP ? GREEN : TXT,
        6
      );
      const hbEq = hitboxes.find((h) => h.idHitbox === `OFICINA_PORAO_EQUIPAR_${c}`);
      if (hbEq) {
        const hovE = idHoverAtivo === hbEq.idHitbox;
        chanfradoBezel(hbEq.x, hbEq.y, hbEq.x + hbEq.largura - 1, hbEq.y + hbEq.altura - 1, [12, 38, 28, 255], hovE ? YELLOW : ehArmaP ? GREEN : DIM, 2);
        txt(hbEq.x + 8, hbEq.y + 8, ehEnOf ? 'EQUIP WEAPON' : 'EQUIPAR ARMA', ehArmaP ? (hovE ? YELLOW : GREEN) : DIM, 6);
      }
      const hbEnx = hitboxes.find((h) => h.idHitbox === `OFICINA_PORAO_ENXERTAR_${c}`);
      if (hbEnx) {
        const hovX = idHoverAtivo === hbEnx.idHitbox;
        const ehOrgP = itemP.tipo === 'ORGAO' && !ehPassivoP;
        if (ehPassivoP) {
          chanfradoBezel(hbEnx.x, hbEnx.y, hbEnx.x + hbEnx.largura - 1, hbEnx.y + hbEnx.altura - 1, [10, 34, 28, 255], hovX ? YELLOW : GREEN, 2);
          txt(hbEnx.x + 6, hbEnx.y + 8, ehEnOf ? 'PASSIVE ON' : 'PASSIVO ON', hovX ? YELLOW : GREEN, 6);
        } else {
          chanfradoBezel(hbEnx.x, hbEnx.y, hbEnx.x + hbEnx.largura - 1, hbEnx.y + hbEnx.altura - 1, [26, 16, 38, 255], hovX ? YELLOW : ehOrgP ? VIOLET : DIM, 2);
          txt(hbEnx.x + 6, hbEnx.y + 8, `${ehEnOf ? 'GRAFT' : 'ENXERTAR'} [${(opcoes.slotArmaSelecionado ?? 0) + 1}]`, ehOrgP ? (hovX ? YELLOW : CYAN) : DIM, 6);
        }
      }
      const hbDesc = hitboxes.find((h) => h.idHitbox === `OFICINA_PORAO_DESCARTAR_${c}`);
      if (hbDesc) {
        const hovK = idHoverAtivo === hbDesc.idHitbox;
        if (emLoja) {
          const siglaVP = itemP.moedaVenda === 'BIOMASSA' ? 'BIO' : (ehEnOf ? 'SCR' : 'SUC');
          const corVP = itemP.moedaVenda === 'BIOMASSA' ? CYAN : GREEN;
          chanfradoBezel(hbDesc.x, hbDesc.y, hbDesc.x + hbDesc.largura - 1, hbDesc.y + hbDesc.altura - 1, [12, 42, 30, 255], hovK ? YELLOW : corVP, 2);
          txt(hbDesc.x + 6, hbDesc.y + 8, `${ehEnOf ? 'SELL' : 'VENDER'} +${itemP.valorVenda ?? 5} ${siglaVP}`.slice(0, 15), hovK ? YELLOW : corVP, 6);
        } else {
          chanfradoBezel(hbDesc.x, hbDesc.y, hbDesc.x + hbDesc.largura - 1, hbDesc.y + hbDesc.altura - 1, [38, 14, 18, 255], hovK ? YELLOW : RED, 2);
          txt(hbDesc.x + 12, hbDesc.y + 8, ehEnOf ? 'JETTISON' : 'EJETAR MAR', hovK ? YELLOW : RED, 6);
        }
      }
    } else {
      txt(692, yBase + 6, ehEnOf ? 'EMPTY BAY (0 kg)' : 'COMPARTIMENTO LIVRE (0 kg)', DIM, 6);
      txt(632, yBase + 24, ehEnOf ? 'BUY AT FORGE-REEF OR CAPTURE IN COMBAT TO STORE' : 'COMPRE NA LOJA OU CAPTURE EM COMBATE PARA ARMAZENAR', DIM, 6);
    }
  }
  txt(
    168,
    413,
    ehEnOf
      ? `BALANCE: ${sucSaldo} SCRAP | ${bioSaldo} BIOMASS — SELECT WEAPON [1..4] AT BOTTOM BEFORE GRAFTING`
      : `SALDO ATUAL: ${sucSaldo} SUCATA | ${bioSaldo} BIOMASSA — SELECIONE ARMA [1..4] NO RODAPÉ ANTES DE ENXERTAR ÓRGÃO`,
    GREEN,
    6
  );
}

export function renderizarModalDesfechoEventoOverlay(ctx) {
  const { viewModel, hitboxes, idHoverAtivo, BORDER, TXT, DIM, GREEN, CYAN, AMBER, RED, YELLOW, fillRect, chanfradoBezel, txt } = ctx;
  const ehEnDf = viewModel.configuracoesSteam?.idioma === 'en-US';
  const rects = calcularRetangulosModaisCampanha960();
  const cx = rects.desfechoEventoCaixa;
  fillRect(152, 41, 957, 428, [4, 9, 14, 192]);
  const df = viewModel.desfechoEventoResumo ?? {
    opcaoEscolhida: 'A', titulo: ehEnDf ? 'MARITIME ENCOUNTER REPORT' : 'RELATÓRIO DO ENCONTRO MARÍTIMO', deltaSucata: 0, deltaBiomassa: 0,
    deltaHpCasco: 0, deltaCombustivel: 0, deltaMunicao: 0, iniciouCombate: false, proximaFase: 'MAPA',
  };
  const corBordaMod = df.iniciouCombate ? RED : df.deltaHpCasco < 0 ? AMBER : CYAN;
  chanfradoBezel(cx.x0, cx.y0, cx.x1, cx.y1, [8, 17, 26, 252], corBordaMod, 4, TXT);
  fillRect(cx.x0 + 6, cx.y0 + 6, cx.x1 - 6, cx.y0 + 36, df.iniciouCombate ? [44, 14, 20, 235] : [14, 38, 52, 235]);
  txt(cx.x0 + 16, cx.y0 + 16, String(df.titulo).slice(0, 64), df.iniciouCombate ? YELLOW : CYAN, 7);

  const deltas = ehEnDf
    ? [
        ['HULL', Number(df.deltaHpCasco ?? 0), GREEN],
        ['SCRAP', Number(df.deltaSucata ?? 0), GREEN],
        ['BIOMASS', Number(df.deltaBiomassa ?? 0), CYAN],
        ['FUEL', Number(df.deltaCombustivel ?? 0), AMBER],
        ['AMMO', Number(df.deltaMunicao ?? 0), TXT],
      ]
    : [
        ['CASCO', Number(df.deltaHpCasco ?? 0), GREEN],
        ['SUCATA', Number(df.deltaSucata ?? 0), GREEN],
        ['BIOMASSA', Number(df.deltaBiomassa ?? 0), CYAN],
        ['COMBUST.', Number(df.deltaCombustivel ?? 0), AMBER],
        ['MUNIÇÃO', Number(df.deltaMunicao ?? 0), TXT],
      ];
  deltas.forEach(([rotD, valD, corPos], idxD) => {
    const gx0 = cx.x0 + 16 + idxD * 92;
    const corChip = valD > 0 ? corPos : valD < 0 ? RED : BORDER;
    chanfradoBezel(gx0, cx.y0 + 50, gx0 + 86, cx.y0 + 108, [6, 13, 20, 255], corChip, 3);
    txt(gx0 + 8, cx.y0 + 60, rotD, DIM, 6);
    txt(gx0 + 16, cx.y0 + 82, valD > 0 ? `+${valD}` : `${valD}`, valD > 0 ? corPos : valD < 0 ? RED : DIM, 8);
  });

  chanfradoBezel(cx.x0 + 16, cx.y0 + 122, cx.x1 - 16, cx.y0 + 198, [6, 14, 22, 255], BORDER, 2);
  const msgPrincipal = String(df.narrativaPrincipal ?? '').trim() || (
    ehEnDf
      ? (df.iniciouCombate
          ? 'HOSTILE SIGNATURE CONFIRMED — ENGAGING COMBAT STANCE ON HYDROFOIL!'
          : df.deltaHpCasco < 0
            ? 'STRUCTURAL IMPACT ABSORBED BY CHITIN DURING MANEUVER.'
            : df.deltaSucata > 0 || df.deltaBiomassa > 0 || df.deltaHpCasco > 0
              ? 'SUPPLIES SALVAGED AND STABILIZED IN BIO-SHIP RESERVOIRS.'
              : 'HYDROACOUSTIC COURSE MAINTAINED WITHOUT CARGO OR HULL CHANGES.')
      : (df.iniciouCombate
          ? 'ASSINATURA HOSTIL CONFIRMADA — ENGATANDO POSIÇÃO DE COMBATE NO HIDROFÓLIO!'
          : df.deltaHpCasco < 0
            ? 'IMPACTO ESTRUTURAL ABSORVIDO PELA QUITINA DURANTE A MANOBRA.'
            : df.deltaSucata > 0 || df.deltaBiomassa > 0 || df.deltaHpCasco > 0
              ? 'SUPRIMENTOS RECOLHIDOS E ESTABILIZADOS NOS RESERVATÓRIOS DA BIO-NAVE.'
              : 'TRAJETÓRIA HIDROACÚSTICA MANTIDA SEM ALTERAÇÕES DE CARGA OU INTEGRIDADE.')
  );
  txt(cx.x0 + 26, cx.y0 + 134, msgPrincipal.slice(0, 74), df.iniciouCombate ? YELLOW : TXT, 6);
  const bonusEvTxt = String(df.bonusEspecialTexto ?? '').trim();
  if (bonusEvTxt) {
    chanfradoBezel(cx.x0 + 24, cx.y0 + 150, cx.x1 - 24, cx.y0 + 166, [12, 42, 34, 248], GREEN, 2);
    txt(cx.x0 + 32, cx.y0 + 155, `${ehEnDf ? 'REWARD' : 'RECOMPENSA'}: ${bonusEvTxt}`.slice(0, 68), YELLOW, 6);
  }
  const msgTrans = ehEnDf
    ? (df.iniciouCombate
        ? 'NEXT TRANSITION: [REAL-TIME COMBAT] — CHECK REACTOR POWER & EVADE!'
        : 'NEXT TRANSITION: [SECTOR CHART] — SELECT YOUR NEXT JUMP BUOY.')
    : (df.iniciouCombate
        ? 'PRÓXIMA TRANSIÇÃO: [COMBATE EM TEMPO REAL] — VERIFIQUE ENERGIA E ESQUIVA!'
        : 'PRÓXIMA TRANSIÇÃO: [CARTA HIDROGRÁFICA] — SELECIONE A PRÓXIMA BOIA DE SALTO.');
  txt(cx.x0 + 26, cx.y0 + 174, msgTrans, df.iniciouCombate ? AMBER : GREEN, 6);

  const hbConfEv = hitboxes.find((h) => h.idHitbox === 'EVENTO_DESFECHO_CONFIRMAR') ?? rects.desfechoEventoBtnConfirmar;
  const hovEv = idHoverAtivo === 'EVENTO_DESFECHO_CONFIRMAR';
  chanfradoBezel(hbConfEv.x, hbConfEv.y, hbConfEv.x + hbConfEv.largura - 1, hbConfEv.y + hbConfEv.altura - 1, df.iniciouCombate ? [48, 16, 20, 255] : [14, 50, 36, 255], hovEv ? YELLOW : df.iniciouCombate ? RED : GREEN, 3, TXT);
  txt(hbConfEv.x + 18, hbConfEv.y + 12, ehEnDf ? (df.iniciouCombate ? '[ENTER] ENGAGE IN COMBAT!' : '[ENTER] CONTINUE COURSE') : (df.iniciouCombate ? '[ENTER] ENGAJAR EM COMBATE!' : '[ENTER] CONTINUAR ROTA'), hovEv ? YELLOW : df.iniciouCombate ? YELLOW : GREEN, 7);
}
