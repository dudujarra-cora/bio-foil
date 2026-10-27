/**
 * ONDA 6 — Renderizador do Alvo Inimigo, Bestiário 5.7.A, Chefe Draga e Abordagem Tática (960x540 RGBA)
 * Dono Único (Lei N5): src/onda6-ui/renderizador-alvo-inimigo.mjs
 *
 * Responsabilidades:
 *  - Renderizar `CHEFE_DRAGA` (Fases 1, 2 e 3: holofote, chaminés, fornalha, broca, fervura, Domo Térmico e corte de salas);
 *  - Renderizar os 8 arquétipos distintos do Bestiário `5.7.A` (`BARCO_1..4` e `MONSTRO_1..4`) com sprites Hi-Bit dedicados,
 *    refração subaquática abaixo da linha d'água, colar de espuma viva, salas em corte tático translúcido e retículos bio-sonar;
 *  - Renderizar telegrafias GD-3 (Mina Magnética, Mira Mastro, Aperto de Quilha), trincas de Beam (`B1/B2/B3` ancorados no topo-direito)
 *    e tripulantes abordadores aliados (`BORDO_INIMIGO`) com indicador de travessia sala-a-sala (`→S#`).
 *  - Zero imports externos para serialização direta em `/cliente.js` (`0 bytes diff` Server <-> Browser).
 */

export function renderizarAlvoInimigoESalasCombate(ctx, paramsAlvo) {
  const {
    W,
    rgba,
    viewModel,
    opcoes,
    assets,
    hitboxes,
    f4Anim,
    tempoSeg,
    idHoverAtivo,
    idPressAtivo,
    ehTouchdown,
    ehMonstroAlvo,
    ehChefeDraga,
    TXT,
    DIM,
    GREEN,
    CYAN,
    AMBER,
    RED,
    YELLOW,
    VIOLET,
    NOMES_SALAS,
    SPRITES_HB,
    VARIANTES_57A,
    amostrarCeuMar,
    putPx,
    fillRect,
    hLine,
    lineSeg,
    blitMatrizToken,
    txt,
    chanfradoBezel,
    desenharPersonagemPose4F,
    segBar,
    blitIconeHiBit,
  } = ctx;

  const { placaEsq, perfilEsq, yLinhaDaguaCena, obterBocaDorsalRender } = paramsAlvo;

  const hbSalasAlvo = hitboxes.filter((h) => h.tipo === 'SALA_ALVO');
  const salasMiradas = new Set(
    (viewModel.caixaArmas ?? [])
      .filter((s) => s.ocupado && s.salaAlvoId !== null && s.salaAlvoId !== undefined)
      .map((s) => s.salaAlvoId)
  );
  const salasEmBeam = new Set(
    (viewModel.caixaArmas ?? []).flatMap((s) =>
      s.ocupado && Array.isArray(s.trincaSalasBeam) && s.trincaSalasBeam.length >= 2
        ? s.trincaSalasBeam.map((idS) => Number(idS))
        : []
    )
  );
  const modoVitrine = Boolean(opcoes.modoVitrineBestiario);
  const tuboAbInstalado = Boolean(viewModel.resumoAbordagem?.tuboInstalado) && !modoVitrine;
  const salaAlvoAbId = tuboAbInstalado
    ? Number(opcoes.salaAlvoAbordagemId ?? viewModel.resumoAbordagem?.salaAlvoPadraoId ?? 1)
    : null;
  const contragolpe = viewModel.painelAlvo?.telemetriaContragolpe ?? {};
  const f4AlvoAnim = Math.floor(tempoSeg * 5.5) & 3;

  const idArqBruto = String(
    viewModel.painelAlvo?.arquetipoAlvoId ?? viewModel.painelAlvo?.arquetipoId ?? viewModel.arquetipoAlvoId ?? ''
  ).toUpperCase();
  const nomeAlvUp = String(viewModel.painelAlvo?.nomeAlvo ?? '').toUpperCase();
  const varPre = ehChefeDraga
    ? null
    : (VARIANTES_57A[idArqBruto] ?? (
        ehMonstroAlvo
          ? (nomeAlvUp.includes('ENGUIA') || nomeAlvUp.includes('VOLT')
              ? VARIANTES_57A.MONSTRO_2_ENGUIA
              : nomeAlvUp.includes('CARANGUEJO') || nomeAlvUp.includes('TRINCH')
                ? VARIANTES_57A.MONSTRO_3_CARANGUEJO
                : nomeAlvUp.includes('HIDRA') || nomeAlvUp.includes('ESPORO')
                  ? VARIANTES_57A.MONSTRO_4_HIDRA
                  : VARIANTES_57A.MONSTRO_1_TEUTHIS)
          : (nomeAlvUp.includes('SUBMARINO')
              ? VARIANTES_57A.BARCO_4_SUBMARINO
              : nomeAlvUp.includes('ARRAST')
                ? VARIANTES_57A.BARCO_3_ARRASTAO
                : nomeAlvUp.includes('CORVETA')
                  ? VARIANTES_57A.BARCO_2_CORVETA
                  : VARIANTES_57A.BARCO_1_LANCHA)
      ));
  const idArqResolvido = varPre?.idArquetipo ?? idArqBruto;
  const sprBestiario = !ehChefeDraga && idArqResolvido ? (assets.bestiario57a?.[idArqResolvido] ?? null) : null;

  if (ehChefeDraga && viewModel.painelAlvo?.presente) {
    const yAguaDraga = ehTouchdown ? 244 : 332;
    const dyDragaTd = ehTouchdown ? -88 : 0;
    const oscHolofote = Math.round(Math.sin(tempoSeg * 2.2) * 10);
    for (let hy = 192 + dyDragaTd; hy <= yAguaDraga - 4; hy += 3) {
      const progH = (hy - (192 + dyDragaTd)) / Math.max(1, yAguaDraga - (192 + dyDragaTd));
      const xEsqH = Math.round(852 - progH * (234 + oscHolofote));
      const xDirH = Math.round(852 - progH * (194 + oscHolofote));
      for (let hx = xEsqH; hx <= xDirH; hx += 3) {
        if (hx >= 580 && hy >= 124 && ((hx + hy) & 1) === 0) putPx(hx, hy, [255, 224, 51, 28]);
      }
    }
    for (const cxCh of [784, 814, 844]) {
      for (let ef = 0; ef < 4; ef += 1) {
        const pyE = 166 + dyDragaTd - (((ef * 7) + Math.round(tempoSeg * 22)) % 24);
        const pxE = cxCh + Math.round(Math.sin(tempoSeg * 4 + ef * 1.7) * 4);
        if (pyE >= 126) putPx(pxE, pyE, ef % 2 === 0 ? AMBER : YELLOW);
      }
    }
    for (let fx = 824; fx <= 852; fx += 5) {
      if (((fx + Math.round(tempoSeg * 14)) % 10) < 5) {
        const fy = 351 + dyDragaTd + (fx % 3);
        if (fy >= 44 && fy < 426) putPx(fx, fy, ((fx >> 1) & 1) === 0 ? YELLOW : AMBER);
      }
    }
    for (let pl = -12; pl <= 12; pl += 6) {
      const pyPl = 423 + dyDragaTd - (Math.abs(pl + Math.round(tempoSeg * 18)) % 6);
      if (pyPl >= 44 && pyPl < 427) {
        putPx(880 + pl, pyPl, Math.abs(pl) % 12 === 0 ? AMBER : CYAN);
      }
    }
    if ((viewModel.painelAlvo.fervuraAtivaSeg ?? 0) > 0 || (viewModel.painelAlvo.alarmeFervuraAtivoSeg ?? 0) > 0) {
      hLine(618, 956, yAguaDraga - 2, RED, 2);
      for (let bf = 626; bf <= 948; bf += 14) {
        const yBolhaF = yAguaDraga - 4 - ((bf + Math.round(tempoSeg * 20)) % 12);
        if (yBolhaF >= 124) fillRect(bf, yBolhaF, bf + 2, yBolhaF + 2, bf % 28 === 0 ? TXT : YELLOW);
      }
    }
    if ((viewModel.painelAlvo.blindagemTermicaExternaPts ?? 0) > 0) {
      const yIniDomo = Math.max(128, 146 + dyDragaTd);
      const yFimDomo = Math.min(422, 418 + dyDragaTd);
      let prevXDomo = null;
      let prevYDomo = null;
      for (let pyDomo = yIniDomo; pyDomo <= yFimDomo; pyDomo += 1) {
        const distPonta = Math.min(pyDomo - yIniDomo, yFimDomo - pyDomo);
        const progD = (pyDomo - yIniDomo) / Math.max(1, yFimDomo - yIniDomo);
        const uNormD = progD * 2 - 1;
        const xDomo = Math.round(594 + uNormD * uNormD * 80);
        if (prevXDomo !== null && Math.abs(xDomo - prevXDomo) > 1) {
          lineSeg(prevXDomo, prevYDomo, xDomo, pyDomo, distPonta < 10 ? RED : AMBER, false);
        }
        prevXDomo = xDomo;
        prevYDomo = pyDomo;
        if (distPonta < 6 && ((pyDomo + Math.round(tempoSeg * 12)) & 1) === 1) continue;
        for (let dxH = 2; dxH <= 7; dxH += 1) {
          if (((xDomo + dxH + pyDomo) % (dxH <= 4 ? 2 : 4)) === 0 && distPonta >= 10) {
            putPx(xDomo + dxH, pyDomo, dxH <= 4 ? [220, 88, 24, 128] : [164, 38, 22, 85]);
          }
        }
        putPx(xDomo - 2, pyDomo, [176, 44, 20, 175]);
        putPx(xDomo - 1, pyDomo, AMBER);
        putPx(xDomo, pyDomo, ((pyDomo + Math.round(tempoSeg * 18)) % 5) === 0 ? TXT : YELLOW);
        putPx(xDomo + 1, pyDomo, RED);
        if (distPonta >= 16 && ((pyDomo - yIniDomo) % 28) === 0) {
          chanfradoBezel(xDomo - 2, pyDomo - 2, xDomo + 2, pyDomo + 2, YELLOW, RED, 1);
          putPx(xDomo, pyDomo, TXT);
        }
      }
      if (yAguaDraga >= yIniDomo && yAguaDraga <= yFimDomo) {
        const progAg = (yAguaDraga - yIniDomo) / Math.max(1, yFimDomo - yIniDomo);
        const uAg = progAg * 2 - 1;
        const xDomoAgua = Math.round(594 + uAg * uAg * 80);
        for (const dxVap of [-5, -2, 1, 4, 7]) {
          fillRect(xDomoAgua + dxVap, yAguaDraga - 3, xDomoAgua + dxVap + 1, yAguaDraga - 1, dxVap % 2 === 0 ? TXT : YELLOW);
        }
      }
    }

    if (!modoVitrine) {
      for (const hbSala of hbSalasAlvo) {
        if (!salasMiradas.has(hbSala.metadados.salaId)) continue;
        const slotMir = (viewModel.caixaArmas ?? []).findIndex((s) => s.ocupado && s.salaAlvoId === hbSala.metadados.salaId);
        const [mxOrig, myOrig] = obterBocaDorsalRender(slotMir === 1 ? 1 : 0);
        const xAncSala = hbSala.x - 1;
        const yAncSala = hbSala.y + Math.round(hbSala.altura * 0.5);
        lineSeg(mxOrig, myOrig, xAncSala, yAncSala, CYAN, true);
        chanfradoBezel(xAncSala - 2, yAncSala - 2, xAncSala + 1, yAncSala + 2, null, RED, 1);
      }
    }

    for (const hbSala of hbSalasAlvo) {
      const infoSala = viewModel.painelAlvo.salasInspecionadas.find((s) => s.salaId === hbSala.metadados.salaId);
      const mirada = salasMiradas.has(hbSala.metadados.salaId);
      const hovS = idHoverAtivo === hbSala.idHitbox;
      const dyPS = idPressAtivo === hbSala.idHitbox ? 1 : 0;
      const fundoSala = hbSala.metadados.submersa ? [8, 24, 34, 188] : [10, 16, 22, 188];
      chanfradoBezel(
        hbSala.x,
        hbSala.y + dyPS,
        hbSala.x + hbSala.largura - 1,
        hbSala.y + hbSala.altura - 1 + dyPS,
        fundoSala,
        hovS ? YELLOW : mirada ? RED : CYAN,
        3,
        [32, 66, 86, 210]
      );
      fillRect(hbSala.x + 3, hbSala.y + 2 + dyPS, hbSala.x + hbSala.largura - 4, hbSala.y + 12 + dyPS, [10, 20, 30, 178]);
      hLine(hbSala.x + 2, hbSala.x + hbSala.largura - 3, hbSala.y + 13 + dyPS, [38, 66, 84, 175], 1);

      const chaveSala = String(infoSala?.nomeSala ?? '');
      let rotCan = NOMES_SALAS[chaveSala] ?? chaveSala.replace(/_/g, ' ');
      const numIdDr = Number(hbSala.metadados.salaId);
      const reservadoBeam = (salasEmBeam.has(numIdDr) ? 18 : 0) + (salaAlvoAbId === numIdDr ? 19 : 0);
      const pitchSala = rotCan.length * 7 > hbSala.largura - 7 - reservadoBeam ? 6 : 7;
      const maxChars = Math.max(4, Math.floor((hbSala.largura - 6 - reservadoBeam) / pitchSala));
      if (rotCan.length > maxChars) {
        if (/M[ÍI]SSEIS/i.test(rotCan)) rotCan = maxChars >= 10 ? 'MÍSSEIS T.' : 'MÍSSEIS';
        else if (/ARP[ÃA]O/i.test(rotCan)) rotCan = maxChars >= 8 ? 'ARPÃO 3X' : 'ARPÃO';
        else if (/REDE/i.test(rotCan)) rotCan = maxChars >= 9 ? 'REDE MAG.' : 'REDE';
        else if (/PLASMA/i.test(rotCan)) rotCan = 'PLASMA';
        else if (/DRONES/i.test(rotCan)) rotCan = 'DRONES';
        else if (/ESCUDO/i.test(rotCan)) rotCan = maxChars >= 9 ? 'ESCUDO 4X' : 'ESCUDO';
        else if (/BROCA/i.test(rotCan)) rotCan = maxChars >= 10 ? 'BROCA ABI.' : 'BROCA';
        else if (/N[ÚU]CLEO|PONTE|COMANDO/i.test(rotCan)) rotCan = maxChars >= 10 ? 'NÚCLEO CMD' : 'PONTE';
        else if (/REATOR|M[ÁA]QUINAS/i.test(rotCan)) rotCan = 'MOTOR';
      }
      txt(hbSala.x + 4, hbSala.y + 4 + dyPS, rotCan.slice(0, maxChars), hovS ? YELLOW : TXT, pitchSala);
      if (infoSala) {
        const intAtu = Math.max(0, Number(infoSala.integridade ?? 0));
        const intMax = Math.max(1, Number(infoSala.integridadeMax ?? 2));
        segBar(hbSala.x + 4, hbSala.y + 16 + dyPS, intMax, intAtu, 6, 5, 2, intAtu > 0 ? GREEN : RED);
        if (infoSala.canalPermissao === 'VISIVEL') {
          const qtdT = Number(infoSala.contagemTripulantes ?? 0);
          const espTripDraga = hbSala.metadados.submersa ? 'MERGULHADOR' : 'MARINHEIRO';
          const spTripDraga = hbSala.metadados.submersa
            ? (assets.iconesHiBit?.MERGULHADOR ?? assets.iconesHiBit?.MARINHEIRO)
            : assets.iconesHiBit?.MARINHEIRO;
          for (let it = 0; it < Math.min(2, qtdT); it += 1) {
            const cxSp = hbSala.x + hbSala.largura - 12 - it * 18;
            const cySp = hbSala.y + 28 + dyPS;
            if (!desenharPersonagemPose4F(espTripDraga, (f4AlvoAnim + it) % 4, cxSp, cySp, 18, 20, true, false)) {
              if (spTripDraga) {
                blitIconeHiBit(spTripDraga, cxSp - 8, cySp - 10, false);
              } else {
                blitMatrizToken(SPRITES_HB.MARINHEIRO, cxSp - 5, cySp - 6, 1, 1);
              }
            }
          }
          const rotTrp = hbSala.largura < 76 ? `${qtdT}T` : `${qtdT} TRP`;
          txt(hbSala.x + 4, hbSala.y + 28 + dyPS, rotTrp, AMBER, 6);
        } else {
          const rotVis = infoSala.canalPermissao === 'OCULTO_TURVO' ? 'TURVO' : 'CEGO';
          txt(hbSala.x + 4, hbSala.y + 28 + dyPS, rotVis.slice(0, maxChars), DIM, 6);
        }
      }
    }
  } else {
    // 1) Se há sprite Hi-Bit dedicado para o arquétipo do Bestiário 5.7.A (`BARCO_2..4` ou `MONSTRO_2..4`),
    // limpa a Lancha/Teuthis assada na direita sem costuras e projeta o casco/anatomia exclusiva sobre a linha d'água!
    if (sprBestiario && viewModel.painelAlvo?.presente) {
      const xLimpezaIni = ehMonstroAlvo ? 604 : 656;
      const xFeatherFim = xLimpezaIni + 24;
      for (let syL = 42; syL <= 425; syL += 1) {
        const pyPlL = Math.max(0, Math.min(placaEsq.altura - 1, syL - 40));
        for (let sxL = xLimpezaIni; sxL <= 958; sxL += 1) {
          const [cR, cG, cB] = amostrarCeuMar(perfilEsq, pyPlL, sxL, syL);
          const peso = sxL < xFeatherFim ? (sxL - xLimpezaIni) / 24 : 1;
          const idxP = (syL * W + sxL) * 4;
          if (peso < 0.999) {
            putPx(sxL, syL, [
              Math.round(rgba[idxP] * (1 - peso) + cR * peso),
              Math.round(rgba[idxP + 1] * (1 - peso) + cG * peso),
              Math.round(rgba[idxP + 2] * (1 - peso) + cB * peso),
              255,
            ]);
          } else {
            putPx(sxL, syL, [cR, cG, cB, 255]);
          }
        }
      }
      // Restaura a linha d'água viva contínua na metade direita antes de assentar o novo navio/monstro
      for (let sxO = xLimpezaIni + 4; sxO <= 956; sxO += 1) {
        const yOndaD = yLinhaDaguaCena + Math.round(Math.sin(sxO * 0.08 + tempoSeg * 3.8) * 1.1);
        putPx(sxO, yOndaD, (sxO % 3) === 0 ? CYAN : TXT);
        putPx(sxO, yOndaD + 1, (sxO & 1) === 0 ? [58, 176, 204, 255] : CYAN);
        if ((sxO & 1) === 0) putPx(sxO, yOndaD + 2, [34, 114, 140, 255]);
      }

      const xDstSpr = ehMonstroAlvo
        ? (modoVitrine ? 746 : 722)
        : idArqResolvido === 'BARCO_2_CORVETA'
          ? 702
          : 700;
      const yDstSpr = ehMonstroAlvo
        ? (ehTouchdown ? Math.max(122, yLinhaDaguaCena - 98) : yLinhaDaguaCena - 134)
        : idArqResolvido === 'BARCO_4_SUBMARINO'
          ? yLinhaDaguaCena - 52
          : idArqResolvido === 'BARCO_3_ARRASTAO'
            ? yLinhaDaguaCena - 88
            : yLinhaDaguaCena - 82;

      let xColarMin = 999;
      let xColarMax = -1;
      for (let pyS = 0; pyS < sprBestiario.altura; pyS += 1) {
        const syD = yDstSpr + pyS;
        if (syD < 43 || syD > 425) continue;
        const submersoPx = syD > yLinhaDaguaCena;
        for (let pxS = 0; pxS < sprBestiario.largura; pxS += 1) {
          const sxD = xDstSpr + pxS;
          if (sxD < 608 || sxD > 957) continue;
          const offS = (pyS * sprBestiario.largura + pxS) * 4;
          const aS = sprBestiario.rgba[offS + 3];
          if (aS < 120) {
            const temVizOpaco =
              (pxS > 0 && sprBestiario.rgba[offS - 1] >= 120) ||
              (pxS + 1 < sprBestiario.largura && sprBestiario.rgba[offS + 7] >= 120) ||
              (pyS > 0 && sprBestiario.rgba[((pyS - 1) * sprBestiario.largura + pxS) * 4 + 3] >= 120) ||
              (pyS + 1 < sprBestiario.altura && sprBestiario.rgba[((pyS + 1) * sprBestiario.largura + pxS) * 4 + 3] >= 120);
            if (temVizOpaco) {
              putPx(sxD, syD, submersoPx ? [6, 20, 28, 225] : [7, 12, 18, 255]);
            }
            continue;
          }
          let rP = sprBestiario.rgba[offS];
          let gP = sprBestiario.rgba[offS + 1];
          let bP = sprBestiario.rgba[offS + 2];
          if (Math.abs(syD - yLinhaDaguaCena) <= 2) {
            if (sxD < xColarMin) xColarMin = sxD;
            if (sxD > xColarMax) xColarMax = sxD;
          }
          if (submersoPx) {
            const prof = Math.min(1, (syD - yLinhaDaguaCena) / 76);
            const fAgua = 0.34 + prof * 0.18;
            rP = Math.round(rP * (1 - fAgua) + 10 * fAgua);
            gP = Math.round(gP * (1 - fAgua) + 58 * fAgua);
            bP = Math.round(bP * (1 - fAgua) + 78 * fAgua);
          }
          putPx(sxD, syD, [rP, gP, bP, 255]);
        }
      }
      // Colar vivo de espuma branca/ciana quebrando contra o casco/corpo na linha d'água
      if (xColarMax >= xColarMin) {
        for (let sxC = Math.max(612, xColarMin - 6); sxC <= Math.min(956, xColarMax + 6); sxC += 1) {
          const yEsp = yLinhaDaguaCena + Math.round(Math.sin(sxC * 0.14 + tempoSeg * 5.2) * 1.0);
          putPx(sxC, yEsp - 1, (sxC % 3) === 0 ? CYAN : TXT);
          putPx(sxC, yEsp, (sxC & 1) === 0 ? TXT : CYAN);
          if ((sxC & 1) === 0) putPx(sxC, yEsp + 1, [48, 152, 180, 235]);
        }
      }
    }

    // 2) Telegrafias GD-3 (Mina Magnética Hi-Bit / Mira Mastro / Aperto de Quilha)
    if ((contragolpe.minaMagneticaAtivaSeg ?? 0) > 0) {
      const xm = 636;
      const ym = yLinhaDaguaCena - 2 + Math.round(Math.sin(tempoSeg * 6) * 1.5);
      const spMina = assets.iconesHiBit?.MINA_MAGNETICA;
      if (spMina) {
        blitIconeHiBit(spMina, xm - Math.floor(spMina.largura / 2), ym - Math.floor(spMina.altura / 2), false);
        if ((Math.floor(tempoSeg * 8) & 1) === 0) {
          fillRect(xm - 2, ym - 2, xm + 1, ym + 1, YELLOW);
        }
      } else {
        chanfradoBezel(xm - 6, ym - 6, xm + 6, ym + 6, [44, 54, 64, 255], RED, 2);
        lineSeg(xm - 9, ym, xm + 9, ym, AMBER, false);
        lineSeg(xm, ym - 9, xm, ym + 9, AMBER, false);
        fillRect(xm - 2, ym - 2, xm + 2, ym + 2, ((Math.floor(tempoSeg * 8) & 1) === 0) ? RED : YELLOW);
      }
      chanfradoBezel(580, ym - 28, 700, ym - 15, [64, 8, 14, 244], RED, 2, AMBER);
      txt(584, ym - 24, `MINA ${contragolpe.minaMagneticaAtivaSeg.toFixed(1)}s! FOIL!`, YELLOW, 6);
    }

    if (ehMonstroAlvo && !modoVitrine) {
      const dyMiraM = ehTouchdown ? -96 : 0;
      lineSeg(758, 303 + dyMiraM, 604, 309 + Math.round(dyMiraM * 0.5), RED, true);
      lineSeg(604, 309 + Math.round(dyMiraM * 0.5), 454, ehTouchdown ? 248 : 324, RED, true);
      chanfradoBezel(451, (ehTouchdown ? 248 : 324) - 3, 457, (ehTouchdown ? 248 : 324) + 3, null, YELLOW, 1);
      chanfradoBezel(504, 292 + Math.round(dyMiraM * 0.5), 604, 305 + Math.round(dyMiraM * 0.5), [52, 8, 14, 244], RED, 2, AMBER);
      txt(508, 295 + Math.round(dyMiraM * 0.5), 'MIRANDO: MASTRO', YELLOW, 6);
    }

    if ((contragolpe.apertoQuilhaSeg ?? 0) > 0) {
      const yIniTent = Math.max(296, yLinhaDaguaCena - 38);
      const yFimTent = Math.min(386, yLinhaDaguaCena + 24);
      for (let ty = yIniTent; ty <= yFimTent; ty += 1) {
        const progT = (ty - yIniTent) / Math.max(1, yFimTent - yIniTent);
        const rMusc = Math.max(1, Math.round(1.3 + progT * 3.2));
        const faseT = (ty - yIniTent) * 0.19 + tempoSeg * 4.5;
        const xT1 = 448 + Math.round(Math.sin(faseT) * (5 + 4 * progT) + Math.sin(faseT * 1.9 + 0.7) * 2);
        const xT2 = 451 - Math.round(Math.sin(faseT + 1.4) * (4.5 + 3.5 * progT) - Math.cos(faseT * 1.7) * 1.5);
        putPx(xT2 - rMusc - 1, ty, [9, 8, 16, 255]);
        putPx(xT2 + rMusc + 1, ty, [9, 8, 16, 255]);
        for (let dx2 = -rMusc; dx2 <= rMusc; dx2 += 1) {
          const rel2 = dx2 / Math.max(1, rMusc);
          const c2 =
            rel2 < -0.45
              ? [48, 16, 44, 255]
              : rel2 < 0.25
                ? (((xT2 + dx2 + ty) & 1) === 0 ? [128, 38, 76, 255] : [102, 28, 64, 255])
                : [66, 18, 48, 255];
          putPx(xT2 + dx2, ty, c2);
        }
        putPx(xT1 - rMusc - 1, ty, [9, 8, 16, 255]);
        putPx(xT1 + rMusc + 1, ty, [9, 8, 16, 255]);
        for (let dx1 = -rMusc; dx1 <= rMusc; dx1 += 1) {
          const rel1 = dx1 / Math.max(1, rMusc);
          const c1 =
            rel1 < -0.5
              ? [42, 16, 56, 255]
              : rel1 < -0.05
                ? [88, 32, 96, 255]
                : rel1 < 0.45
                  ? (((xT1 + dx1 + ty) & 1) === 0 ? [156, 60, 138, 255] : [124, 44, 116, 255])
                  : rel1 < 0.8
                    ? [186, 90, 162, 255]
                    : [62, 24, 76, 255];
          putPx(xT1 + dx1, ty, c1);
        }
        if (rMusc >= 2 && (ty % 7) === 3) {
          fillRect(xT1 + rMusc - 1, ty - 1, xT1 + rMusc, ty, CYAN);
          putPx(xT1 + rMusc - 1, ty, [20, 72, 92, 255]);
        }
      }
      for (let sxSp = 434; sxSp <= 466; sxSp += 1) {
        const distSp = Math.abs(sxSp - 450);
        if (distSp <= 11 || (sxSp & 1) === 0) {
          putPx(sxSp, yLinhaDaguaCena - 1, (sxSp % 3) === 0 ? CYAN : TXT);
          putPx(sxSp, yLinhaDaguaCena, (sxSp & 1) === 0 ? TXT : CYAN);
        }
        if (distSp <= 15) {
          putPx(sxSp, yLinhaDaguaCena + 1, distSp <= 9 ? CYAN : [44, 138, 166, 255]);
        }
      }
      const yPillQuilha = Math.min(372, yLinhaDaguaCena + 24);
      chanfradoBezel(468, yPillQuilha, 594, yPillQuilha + 13, [44, 12, 58, 244], AMBER, 2, CYAN);
      txt(473, yPillQuilha + 4, 'APERTO QUILHA +40kg!', YELLOW, 6);
    }

    const dyAncMonstro = ehTouchdown ? -96 : 0;
    const dxAncVit = modoVitrine ? 24 : 0;
    const ancorasBaseMonstro = {
      MONSTRO_2_ENGUIA: {
        1: [818 + dxAncVit, 248 + dyAncMonstro],
        2: [804 + dxAncVit, 294 + dyAncMonstro],
        3: [838 + dxAncVit, 340 + dyAncMonstro],
        4: [856 + dxAncVit, 380 + dyAncMonstro],
      },
      MONSTRO_3_CARANGUEJO: {
        1: [812 + dxAncVit, 242 + dyAncMonstro],
        2: [806 + dxAncVit, 276 + dyAncMonstro],
        3: [838 + dxAncVit, 304 + dyAncMonstro],
        4: [818 + dxAncVit, 330 + dyAncMonstro],
      },
      MONSTRO_4_HIDRA: {
        1: [814 + dxAncVit, 248 + dyAncMonstro],
        2: [822 + dxAncVit, 296 + dyAncMonstro],
        3: [834 + dxAncVit, 342 + dyAncMonstro],
        4: [844 + dxAncVit, 382 + dyAncMonstro],
      },
    }[idArqResolvido] ?? {
      1: [764 + dxAncVit, 246 + dyAncMonstro],
      2: [768 + dxAncVit, 295 + dyAncMonstro],
      3: [774 + dxAncVit, 343 + dyAncMonstro],
      4: [786 + dxAncVit, 386 + dyAncMonstro],
    };

    const yDstSprAnc = ehMonstroAlvo
      ? (ehTouchdown ? Math.max(122, yLinhaDaguaCena - 98) : yLinhaDaguaCena - 134)
      : 0;
    const xDstSprAnc = ehMonstroAlvo ? (modoVitrine ? 746 : 722) : 700;
    const ancorasPorMonstro = {};
    for (const idK of [1, 2, 3, 4]) {
      const [axBase, ayBase] = ancorasBaseMonstro[idK];
      let axFinal = axBase;
      let ayFinal = ayBase;
      const minAyMonotonico = idK > 1 ? ancorasPorMonstro[idK - 1][1] + 16 : 180;
      if (ehMonstroAlvo && sprBestiario) {
        let achou = false;
        for (let dyUp = 0; dyUp <= 32 && !achou; dyUp += 4) {
          const ayCand = Math.max(minAyMonotonico, ayBase - dyUp);
          const pyS = Math.max(0, Math.min(sprBestiario.altura - 1, ayCand - yDstSprAnc));
          for (let rScan = 0; rScan <= 64 && !achou; rScan += 2) {
            for (const sgn of rScan === 0 ? [1] : [-1, 1]) {
              const sxCand = axBase + sgn * rScan;
              const pxS = sxCand - xDstSprAnc;
              if (pxS < 4 || pxS >= sprBestiario.largura - 4) continue;
              const offA = (pyS * sprBestiario.largura + pxS) * 4 + 3;
              const offIn = (pyS * sprBestiario.largura + Math.min(sprBestiario.largura - 1, pxS + 3)) * 4 + 3;
              if (sprBestiario.rgba[offA] >= 145 && sprBestiario.rgba[offIn] >= 145) {
                axFinal = Math.min(946, sxCand + 2);
                ayFinal = ayCand;
                achou = true;
                break;
              }
            }
          }
        }
      }
      ancorasPorMonstro[idK] = [axFinal, ayFinal];
    }

    const titulosPorMonstro = {
      MONSTRO_2_ENGUIA: { 1: 'CRISTA VOLT', 2: 'PRESAS VOLT', 3: 'NADADEIRAS', 4: 'GÂNGLIO VOLT' },
      MONSTRO_3_CARANGUEJO: { 1: 'GARRA MAIOR', 2: 'PINÇA DURA', 3: 'PATAS MOTOR', 4: 'GÂNGLIO REAL' },
      MONSTRO_4_HIDRA: { 1: 'TRÊS BOCAS', 2: 'RAIZ TÉRMICA', 3: 'BOLSA ESPORO', 4: 'GÂNGLIO BASE' },
    }[idArqResolvido] ?? {
      1: 'TENTÁCULOS',
      2: 'BICO CÓRNEO',
      3: 'SIFÃO MOTOR',
      4: 'GÂNGLIO VIVO',
    };

    for (const hbSala of hbSalasAlvo) {
      const infoSala = viewModel.painelAlvo?.salasInspecionadas?.find((s) => s.salaId === hbSala.metadados.salaId);
      const mirada = salasMiradas.has(hbSala.metadados.salaId);
      const hovS = idHoverAtivo === hbSala.idHitbox;
      const dyPS = idPressAtivo === hbSala.idHitbox ? 1 : 0;

      const desenharCorteSalaBarco = !ehMonstroAlvo && (Boolean(sprBestiario) || opcoes.omitirCorteLanchaMutacao !== true);
      if (desenharCorteSalaBarco) {
        // Salas em corte tático: translúcido leve para Corveta/Arrastão/Submarino (sprites limpos) e
        // interior naval opaco para BARCO_1_LANCHA (oculta 100% dos marinheiros/textos assados em f1Play/f2Play)!
        const bgCorte = sprBestiario
          ? (hbSala.metadados.submersa ? [7, 22, 32, 86] : [9, 16, 24, 82])
          : (hbSala.metadados.submersa ? [8, 24, 34, 255] : [11, 18, 26, 255]);
        chanfradoBezel(
          hbSala.x,
          hbSala.y + dyPS,
          hbSala.x + hbSala.largura - 1,
          hbSala.y + hbSala.altura - 1 + dyPS,
          bgCorte,
          hovS ? YELLOW : mirada ? RED : [56, 136, 164, 225],
          2,
          [32, 74, 96, 185]
        );
        if (!sprBestiario) {
          hLine(hbSala.x + 3, hbSala.x + hbSala.largura - 4, hbSala.y + hbSala.altura - 4 + dyPS, [24, 46, 60, 225], 1);
        }
        fillRect(hbSala.x + 2, hbSala.y + 2 + dyPS, hbSala.x + hbSala.largura - 3, hbSala.y + 11 + dyPS, sprBestiario ? [7, 15, 23, 212] : [7, 15, 23, 235]);
        const chaveS = String(infoSala?.nomeSala ?? '');
        let rotSala = NOMES_SALAS[chaveS] ?? chaveS.replace(/_/g, ' ');
        const numIdS = Number(hbSala.metadados.salaId);
        const reservadoBeamS = (salasEmBeam.has(numIdS) ? 17 : 0) + (salaAlvoAbId === numIdS ? 18 : 0);
        const maxChS = Math.max(4, Math.floor((hbSala.largura - 10 - reservadoBeamS) / 6));
        if (rotSala.length > maxChS) {
          if (/GUINDASTE/i.test(rotSala)) rotSala = maxChS >= 6 ? 'GUIND.' : 'GRUA';
          else if (/TORPEDO/i.test(rotSala)) rotSala = maxChS >= 5 ? 'TORP.' : 'TRP';
          else if (/TORRETA/i.test(rotSala)) rotSala = maxChS >= 5 ? 'TORR.' : 'TRT';
          else if (/CABINE/i.test(rotSala)) rotSala = 'CAB.';
          else if (/ESCUDO/i.test(rotSala)) rotSala = 'ESC.';
        }
        txt(hbSala.x + 4, hbSala.y + 3 + dyPS, rotSala.slice(0, maxChS), hovS ? YELLOW : TXT, 6);
        if (infoSala) {
          const intAtu = Math.max(0, Number(infoSala.integridade ?? 0));
          const intMax = Math.max(1, Number(infoSala.integridadeMax ?? 2));
          segBar(hbSala.x + 4, hbSala.y + 14 + dyPS, intMax, intAtu, 5, 4, 2, intAtu > 0 ? GREEN : RED);
          if (infoSala.canalPermissao === 'VISIVEL') {
            const qtdT = Number(infoSala.contagemTripulantes ?? 0);
            const espHum = hbSala.metadados.submersa && (idArqResolvido === 'BARCO_3_ARRASTAO' || idArqResolvido === 'BARCO_4_SUBMARINO')
              ? 'MERGULHADOR'
              : 'MARINHEIRO';
            for (let it = 0; it < Math.min(2, qtdT); it += 1) {
              const cxSp = hbSala.x + hbSala.largura - 11 - it * 16;
              const cySp = hbSala.y + hbSala.altura - 12 + dyPS;
              if (!desenharPersonagemPose4F(espHum, (f4AlvoAnim + it) % 4, cxSp, cySp, 16, 18, true, false)) {
                blitMatrizToken(SPRITES_HB.MARINHEIRO, cxSp - 5, cySp - 6, 1, 1);
              }
            }
            if (qtdT === 0) {
              txt(hbSala.x + 4, hbSala.y + hbSala.altura - 10 + dyPS, 'VAZIA', DIM, 6);
            }
          } else {
            const rotL3 = infoSala.canalPermissao === 'OCULTO_TURVO' ? 'TURVO' : 'CEGO';
            txt(hbSala.x + 4, hbSala.y + hbSala.altura - 10 + dyPS, rotL3, DIM, 6);
          }
        }
      }

      if (infoSala && Number(infoSala.aguaKg ?? 0) > 5 && !ehMonstroAlvo) {
        const altAguaAlvo = Math.min(hbSala.altura - 6, Math.round((Number(infoSala.aguaKg) / 50) * (hbSala.altura - 6)));
        if (altAguaAlvo > 2) {
          const yTopoAlvo = hbSala.y + hbSala.altura - 2 - altAguaAlvo;
          fillRect(hbSala.x + 2, yTopoAlvo, hbSala.x + hbSala.largura - 3, hbSala.y + hbSala.altura - 3, [22, 86, 112, 132]);
          hLine(hbSala.x + 2, hbSala.x + hbSala.largura - 3, yTopoAlvo, [79, 242, 255, 165], 1);
        }
      }

      if (ehMonstroAlvo) {
        const idOrg = hbSala.metadados.salaId;
        const xBox0 = modoVitrine ? hbSala.x : hbSala.x - 12;
        const xBox1 = hbSala.x + hbSala.largura - 1;
        const yBox0 = hbSala.y;
        const yBox1 = hbSala.y + hbSala.altura - 1;
        const ancOrg = ancorasPorMonstro[idOrg] ?? [hbSala.x + hbSala.largura + 48, Math.round((yBox0 + yBox1) / 2)];
        const cyBox = Math.round((yBox0 + yBox1) / 2);
        const xAncOrg = modoVitrine ? Math.max(xBox1 + 6, ancOrg[0]) : ancOrg[0];
        lineSeg(xBox1 + 1, cyBox, xAncOrg, ancOrg[1], mirada ? RED : hovS ? YELLOW : [62, 148, 174, 220], false);
        chanfradoBezel(xAncOrg - 3, ancOrg[1] - 3, xAncOrg + 3, ancOrg[1] + 3, [8, 16, 24, 240], mirada ? RED : CYAN, 1);
        putPx(xAncOrg, ancOrg[1], mirada ? YELLOW : TXT);

        const corSeloF3 = yBox0 >= yLinhaDaguaCena ? [8, 30, 42, 232] : [8, 15, 22, 232];
        fillRect(xBox0, yBox0, xBox1, yBox1, corSeloF3);
        chanfradoBezel(
          xBox0,
          yBox0,
          xBox1,
          yBox1,
          [7, 17, 25, modoVitrine ? 196 : 236],
          hovS ? YELLOW : mirada ? RED : CYAN,
          3,
          [36, 86, 108, 225]
        );
        fillRect(xBox0 + 3, yBox0 + 2, xBox1 - 3, yBox0 + 12, [13, 26, 38, 195]);
        hLine(xBox0 + 2, xBox1 - 2, yBox0 + 13, [34, 60, 78, 185], 1);

        const chaveOrg = String(infoSala?.nomeSala ?? '');
        const ehOrgaoPadrao = /^(TENTACULOS|BICO_QUITINOSO|SIFAO_MUSCULAR|GANGLIO_CENTRAL|)$/i.test(chaveOrg);
        const rotOrgao = ehOrgaoPadrao
          ? (titulosPorMonstro[idOrg] ?? 'ÓRGÃO')
          : (NOMES_SALAS[chaveOrg] ?? chaveOrg.replace(/_/g, ' '));
        const maxChOrg = modoVitrine ? 12 : 15;
        txt(xBox0 + 4, yBox0 + 4, rotOrgao.slice(0, maxChOrg), hovS ? YELLOW : TXT, 6);

        const intOrg = Math.max(0, Number(infoSala?.integridade ?? (idOrg === 4 ? 3 : 2)));
        const maxOrg = Math.max(1, Number(infoSala?.integridadeMax ?? (idOrg === 4 ? 3 : 2)));
        if (idOrg === 3) {
          const esqM = Number(viewModel.painelAlvo?.esquivaPct ?? 20);
          txt(xBox0 + 4, yBox0 + 17, intOrg > 0 ? `ESQUIVA ${esqM}%` : 'SIFÃO ROTO', intOrg > 0 ? CYAN : RED, 6);
        } else if (idOrg === 4) {
          const largDispG = modoVitrine ? 38 : 52;
          segBar(xBox0 + 4, yBox0 + 17, maxOrg, Math.min(maxOrg, intOrg), Math.min(11, Math.max(5, Math.floor(largDispG / maxOrg))), 7, 2, intOrg > 0 ? GREEN : RED);
          txt(xBox1 - 21, yBox0 + 17, `${intOrg}/${maxOrg}`, GREEN, 6);
        } else {
          segBar(xBox0 + 4, yBox0 + 17, maxOrg, intOrg, modoVitrine ? 6 : 9, 7, 2, intOrg > 0 ? GREEN : RED);
          const tagSub = idOrg === 1 ? '8s' : (modoVitrine ? '→MST' : '→MASTRO');
          txt(xBox1 - tagSub.length * 6 - 3, yBox0 + 17, tagSub, idOrg === 1 ? AMBER : RED, 6);
        }

        if ((contragolpe.escudoQuitinaGanglioPts ?? 0) > 0 && idOrg === 4) {
          chanfradoBezel(xBox0 - 2, yBox0 - 2, xBox1 + 2, yBox1 + 2, null, AMBER, 3);
          chanfradoBezel(xBox1 + 5, yBox0 + 3, xBox1 + 57, yBox0 + 15, [58, 30, 8, 246], AMBER, 2, YELLOW);
          txt(xBox1 + 8, yBox0 + 6, 'QUITINA!', YELLOW, 6);
        }
      } else if (hovS && !sprBestiario) {
        chanfradoBezel(hbSala.x - 1, hbSala.y - 1, hbSala.x + hbSala.largura, hbSala.y + hbSala.altura, null, YELLOW, 2);
      }

      if (mirada && !modoVitrine) {
        if (!ehMonstroAlvo && !sprBestiario) {
          chanfradoBezel(hbSala.x, hbSala.y, hbSala.x + hbSala.largura - 1, hbSala.y + hbSala.altura - 1, null, RED, 2);
        }
        const slotMir = (viewModel.caixaArmas ?? []).findIndex((s) => s.ocupado && s.salaAlvoId === hbSala.metadados.salaId);
        const [mxOrig, myOrig] = obterBocaDorsalRender(slotMir === 1 ? 1 : 0);
        const ancMiraMonstro = ancorasPorMonstro[hbSala.metadados.salaId];
        const txMira = ehMonstroAlvo
          ? (ancMiraMonstro ? ancMiraMonstro[0] : hbSala.x + hbSala.largura + 48)
          : hbSala.x + Math.round(hbSala.largura * 0.62);
        const tyMira = ehMonstroAlvo
          ? (ancMiraMonstro ? ancMiraMonstro[1] : Math.round(hbSala.y + hbSala.altura * 0.52))
          : hbSala.y + hbSala.altura - 10;
        lineSeg(mxOrig, myOrig, txMira, tyMira, CYAN, true);
        chanfradoBezel(txMira - 3, tyMira - 3, txMira + 3, tyMira + 3, null, RED, 1);
      }
    }
  }

  // 3) Detalhes dinâmicos por arquétipo (holofotes/ocelos vivos na Lancha/Teuthis + banners de fase da Draga)
  if (viewModel.painelAlvo?.presente) {
    if (!ehChefeDraga && !sprBestiario && varPre) {
      const dyVar = ehTouchdown ? -110 : 0;
      const cPri = [...varPre.corDestaqueRgb, 255];
      const cCasco = [...varPre.tintCascoRgb, 255];
      if (varPre.superestrutura === 'MASTRO_RADAR_LEVE') {
        lineSeg(846, 260 + dyVar, 846, 294 + dyVar, cCasco, false);
        lineSeg(842, 294 + dyVar, 846, 264 + dyVar, [64, 88, 102, 255], false);
        hLine(838, 854, 260 + dyVar, cPri, 2);
        putPx(846, 256 + dyVar, ((Math.floor(tempoSeg * 6) & 1) === 0) ? cPri : TXT);
        hLine(708, 738, 326 + dyVar, cPri, 1);
      } else if (varPre.morfologia === 'MANTO_BICO_TENTACULOS') {
        for (const [oxT, oyT, rOc] of [[812, 224, 3], [838, 238, 2], [862, 228, 3], [826, 258, 2]]) {
          for (let dyO = -rOc; dyO <= rOc; dyO += 1) {
            for (let dxO = -rOc; dxO <= rOc; dxO += 1) {
              if (dxO * dxO + dyO * dyO <= rOc * rOc) {
                putPx(oxT + dxO, oyT + dyVar + dyO, (dxO === 0 && dyO === 0) ? TXT : Math.abs(dxO) + Math.abs(dyO) <= 1 ? cPri : VIOLET);
              }
            }
          }
        }
      }
    } else if (ehChefeDraga) {
      const faseDragaVis = Number(viewModel.painelAlvo?.faseChefe ?? 1);
      const dyDrV = ehTouchdown ? -88 : 0;
      if (faseDragaVis === 2) {
        chanfradoBezel(642, 204 + dyDrV, 728, 224 + dyDrV, [48, 22, 12, 236], AMBER, 2, YELLOW);
        txt(647, 211 + dyDrV, 'DRONES + FERVURA', YELLOW, 6);
      } else if (faseDragaVis >= 3) {
        chanfradoBezel(636, 204 + dyDrV, 742, 224 + dyDrV, [58, 12, 18, 242], RED, 2, YELLOW);
        txt(641, 211 + dyDrV, 'SURGE GEOTÉRMICO!', YELLOW, 6);
      }
    }

    // 4) Prévia da Trinca Ortogonal de Feixe (`CORTADOR_TERMICO_PLASMA`):
    // Badges `B1/B2/B3` ancorados no canto superior-direito de cada sala (ZERO colisão com tripulação/abordadores!)
    for (const slotB of viewModel.caixaArmas ?? []) {
      if (!slotB.ocupado || !Array.isArray(slotB.trincaSalasBeam) || slotB.trincaSalasBeam.length < 2) continue;
      const ptsBeam = slotB.trincaSalasBeam
        .map((idS) => hbSalasAlvo.find((h) => Number(h.metadados.salaId) === Number(idS)))
        .filter(Boolean);
      for (let ib = 0; ib + 1 < ptsBeam.length; ib += 1) {
        const hA = ptsBeam[ib];
        const hB = ptsBeam[ib + 1];
        const ax = hA.x + Math.floor(hA.largura * 0.52);
        const ay = hA.y + Math.floor(hA.altura * 0.56);
        const bx = hB.x + Math.floor(hB.largura * 0.52);
        const by = hB.y + Math.floor(hB.altura * 0.56);
        lineSeg(ax, ay, bx, by, RED, false);
        lineSeg(ax, ay + 1, bx, by + 1, YELLOW, true);
      }
      for (let ib = 0; ib < ptsBeam.length; ib += 1) {
        const hA = ptsBeam[ib];
        const bx0 = hA.x + hA.largura - 16;
        const by0 = hA.y + 2;
        chanfradoBezel(bx0, by0, bx0 + 14, by0 + 9, [58, 12, 18, 246], YELLOW, 1);
        txt(bx0 + 2, by0 + 2, `B${ib + 1}`, TXT, 6);
      }
    }

    // 5) Retículo de Alvo da Cápsula `[G]` + Tripulantes Aliados Abordadores (`BORDO_INIMIGO`) + badge de travessia (`→S#`)!
    const abordoLista = viewModel.tripulacaoAbordagemAliada ?? [];
    const tripSelBordo = abordoLista.some((t) => t.id === (opcoes.tripulanteSelecionadoId ?? null));
    for (const hbSala of hbSalasAlvo) {
      const idSalaNum = Number(hbSala.metadados.salaId);
      if (salaAlvoAbId === idSalaNum && !ehMonstroAlvo) {
        const compactAb = hbSala.largura <= 76;
        const wAb = compactAb ? 10 : 15;
        const dxBeam = salasEmBeam.has(idSalaNum) ? -17 : 0;
        const gx0 = hbSala.x + hbSala.largura - (wAb + 3) + dxBeam;
        const gy0 = hbSala.y + 2;
        chanfradoBezel(gx0, gy0, gx0 + wAb, gy0 + 9, [10, 38, 46, 238], CYAN, 1);
        txt(gx0 + (compactAb ? 3 : 2), gy0 + 2, 'G', Boolean(viewModel.resumoAbordagem?.tuboPronto) ? GREEN : CYAN, 6);
        if (!compactAb) putPx(gx0 + 11, gy0 + 5, YELLOW);
      }
      if (tripSelBordo) {
        fillRect(hbSala.x + 1, hbSala.y + 1, hbSala.x + 5, hbSala.y + 2, GREEN);
        fillRect(hbSala.x + 1, hbSala.y + 1, hbSala.x + 2, hbSala.y + 5, GREEN);
      }
      const aliadosAqui = abordoLista.filter(
        (t) => Number(t.salaInimigaId ?? t.salaAlvoId ?? 1) === idSalaNum
      );
      if (aliadosAqui.length === 0) continue;
      chanfradoBezel(hbSala.x, hbSala.y, hbSala.x + hbSala.largura - 1, hbSala.y + hbSala.altura - 1, [38, 22, 12, 84], AMBER, 2, YELLOW);
      const infoSalaAb = viewModel.painelAlvo.salasInspecionadas?.find((s) => s.salaId === hbSala.metadados.salaId);
      const temDefensores = Number(infoSalaAb?.contagemTripulantes ?? 1) > 0;
      const salaSecaInimiga = !hbSala.metadados.submersa && Number(infoSalaAb?.aguaKg ?? 0) <= 0.1;
      aliadosAqui.slice(0, 2).forEach((trAb, idxAb) => {
        const cxAb = hbSala.x + 13 + idxAb * 19;
        const cyAb = hbSala.y + Math.max(15, hbSala.altura - 12);
        desenharPersonagemPose4F(
          trAb.especie ?? 'CARANGUEJO',
          trAb.emTravessia ? (f4Anim % 2) : temDefensores ? (2 + (f4Anim % 2)) : (f4Anim % 2),
          cxAb,
          cyAb,
          20,
          20,
          false,
          Boolean(salaSecaInimiga && trAb.especie !== 'CARANGUEJO')
        );
        if (trAb.emTravessia && trAb.proximaSalaInimigaId) {
          const progHop = Math.max(0, Math.min(1, Number(trAb.progressoTravessia0a1 ?? 0)));
          const lxH = Math.max(hbSala.x + 2, cxAb - 8);
          fillRect(lxH, hbSala.y + hbSala.altura - 4, lxH + 15, hbSala.y + hbSala.altura - 3, [14, 28, 38, 230]);
          fillRect(lxH, hbSala.y + hbSala.altura - 4, lxH + Math.round(15 * progHop), hbSala.y + hbSala.altura - 3, CYAN);
          if (idxAb === 0) {
            const lxTag = hbSala.x + 3;
            const lyTag = hbSala.y + hbSala.altura - 13;
            fillRect(lxTag - 1, lyTag - 1, lxTag + 18, lyTag + 6, [8, 18, 26, 226]);
            txt(lxTag, lyTag, `→S${trAb.proximaSalaInimigaId}`, YELLOW, 6);
          }
        } else if (temDefensores && (f4Anim & 1) === 0) {
          lineSeg(cxAb + 5, cyAb - 4, cxAb + 11, cyAb + 2, YELLOW, false);
        } else if (!temDefensores && Number(infoSalaAb?.integridade ?? 0) > 0) {
          hLine(hbSala.x + 4, hbSala.x + Math.min(hbSala.largura - 5, 28), hbSala.y + hbSala.altura - 3, CYAN, 2);
        }
        if (salaSecaInimiga && trAb.especie !== 'CARANGUEJO') {
          putPx(cxAb, cyAb - 9, RED);
        }
      });
    }
  }
}

export function prepararFundoAtmosfericoCombate(ctx, cachesFrame) {
  const {
    W,
    rgba,
    viewModel,
    assets,
    ev60,
    ehTouchdown,
    ehMonstroAlvo,
    ehChefeDraga,
    BORDER,
    TXT,
    CYAN,
    obterPerfilLimpo,
    amostrarCeuMar,
    putPx,
    fillRect,
    txt,
  } = ctx;

  const placaEsq = ehTouchdown ? assets.f2Play : ehMonstroAlvo ? assets.f3Play : assets.f1Play;
  const perfilEsq = obterPerfilLimpo(placaEsq);
  const perfilF3 = ehTouchdown && ehMonstroAlvo ? obterPerfilLimpo(assets.f3Play) : null;
  const alvoDeslCasco = Number(viewModel.geometria?.deslocamentoVerticalAtualPx ?? (ehTouchdown ? 105 : 0));
  const deslSubTick = ev60 && Number.isFinite(Number(ev60.deslocamentoCascoPx))
    ? Math.round((Number(ev60.deslocamentoCascoPx) - alvoDeslCasco) * 0.24)
    : 0;

  const idArqCena = String(
    viewModel.painelAlvo?.arquetipoAlvoId ?? viewModel.painelAlvo?.arquetipoId ?? viewModel.arquetipoAlvoId ?? ''
  ).toUpperCase();
  const nomeAlvoCenaUp = String(viewModel.painelAlvo?.nomeAlvo ?? '').toUpperCase();
  const chaveBestiarioCena = ehChefeDraga
    ? ''
    : assets.bestiario57a?.[idArqCena]
      ? idArqCena
      : ehMonstroAlvo
        ? nomeAlvoCenaUp.includes('ENGUIA') || nomeAlvoCenaUp.includes('VOLT')
          ? 'MONSTRO_2_ENGUIA'
          : nomeAlvoCenaUp.includes('CARANGUEJO') || nomeAlvoCenaUp.includes('TRINCH')
            ? 'MONSTRO_3_CARANGUEJO'
            : nomeAlvoCenaUp.includes('HIDRA') || nomeAlvoCenaUp.includes('ESPORO')
              ? 'MONSTRO_4_HIDRA'
              : ''
        : nomeAlvoCenaUp.includes('SUBMARINO')
          ? 'BARCO_4_SUBMARINO'
          : nomeAlvoCenaUp.includes('ARRAST')
            ? 'BARCO_3_ARRASTAO'
            : nomeAlvoCenaUp.includes('CORVETA')
              ? 'BARCO_2_CORVETA'
              : '';
  const usaSpriteBestiarioCena = Boolean(chaveBestiarioCena && assets.bestiario57a?.[chaveBestiarioCena]);

  for (let py = 0; py < placaEsq.altura; py += 1) {
    const sy = 40 + py;
    for (let px = 0; px < placaEsq.largura; px += 1) {
      const sx = 150 + px;
      let r;
      let g;
      let b;
      if (ehChefeDraga && assets.dragaPlay && px >= 410) {
        const pxD = Math.min(assets.dragaPlay.largura - 1, px - 410);
        const pyD = ehTouchdown ? py + 88 : py;
        let rD;
        let gD;
        let bD;
        if (pyD >= assets.dragaPlay.altura) {
          [rD, gD, bD] = amostrarCeuMar(perfilEsq, py, sx, sy);
        } else {
          const srcD = (pyD * assets.dragaPlay.largura + pxD) * 4;
          rD = assets.dragaPlay.rgba[srcD];
          gD = assets.dragaPlay.rgba[srcD + 1];
          bD = assets.dragaPlay.rgba[srcD + 2];
        }
        if (px < 454) {
          const pesoD = (px - 410) / 44;
          const [cR, cG, cB] = sx >= 554
            ? amostrarCeuMar(perfilEsq, py, sx, sy)
            : [
                placaEsq.rgba[(py * placaEsq.largura + px) * 4],
                placaEsq.rgba[(py * placaEsq.largura + px) * 4 + 1],
                placaEsq.rgba[(py * placaEsq.largura + px) * 4 + 2],
              ];
          r = Math.round(cR * (1 - pesoD) + rD * pesoD);
          g = Math.round(cG * (1 - pesoD) + gD * pesoD);
          b = Math.round(cB * (1 - pesoD) + bD * pesoD);
        } else {
          r = rD;
          g = gD;
          b = bD;
        }
      } else if ((ehChefeDraga && px >= 448) || (!ehChefeDraga && sx >= 712 && sy <= 136)) {
        [r, g, b] = amostrarCeuMar(perfilEsq, py, sx, sy);
      } else if (ehChefeDraga && px >= 416) {
        const pesoDraga = (px - 416) / 32;
        const [cR, cG, cB] = amostrarCeuMar(perfilEsq, py, sx, sy);
        const srcB = (py * placaEsq.largura + px) * 4;
        r = Math.round(placaEsq.rgba[srcB] * (1 - pesoDraga) + cR * pesoDraga);
        g = Math.round(placaEsq.rgba[srcB + 1] * (1 - pesoDraga) + cG * pesoDraga);
        b = Math.round(placaEsq.rgba[srcB + 2] * (1 - pesoDraga) + cB * pesoDraga);
      } else if (ehTouchdown && ehMonstroAlvo && px >= 456) {
        const pyF3 = Math.min(assets.f3Play.altura - 1, py + 108);
        const srcM = (pyF3 * assets.f3Play.largura + px) * 4;
        let rM = assets.f3Play.rgba[srcM];
        let gM = assets.f3Play.rgba[srcM + 1];
        let bM = assets.f3Play.rgba[srcM + 2];
        if (pyF3 < 160 && px < 620 && gM > 155 && bM > 170) {
          [rM, gM, bM] = amostrarCeuMar(perfilF3, pyF3, sx, sy);
        }
        if (px < 470) {
          const pesoM = (px - 456) / 14;
          const srcE = (py * placaEsq.largura + px) * 4;
          r = Math.round(placaEsq.rgba[srcE] * (1 - pesoM) + rM * pesoM);
          g = Math.round(placaEsq.rgba[srcE + 1] * (1 - pesoM) + gM * pesoM);
          b = Math.round(placaEsq.rgba[srcE + 2] * (1 - pesoM) + bM * pesoM);
        } else {
          r = rM;
          g = gM;
          b = bM;
        }
      } else {
        const src = (py * placaEsq.largura + px) * 4;
        r = placaEsq.rgba[src];
        g = placaEsq.rgba[src + 1];
        b = placaEsq.rgba[src + 2];
      }
      const dst = (sy * W + sx) * 4;
      rgba[dst] = r;
      rgba[dst + 1] = g;
      rgba[dst + 2] = b;
      rgba[dst + 3] = 255;
    }
  }

  let snapInpaint = cachesFrame.snapInpaint;
  if (!snapInpaint || snapInpaint.length !== rgba.length) {
    snapInpaint = new Uint8ClampedArray(rgba.length);
    cachesFrame.snapInpaint = snapInpaint;
  }
  snapInpaint.set(rgba);
  const inpaintVizinhoLimpo = (sx, sy, pyPlaca) => {
    if (sx >= 612 && sy <= 316 && !ehMonstroAlvo) {
      return amostrarCeuMar(perfilEsq, pyPlaca, sx, sy);
    }
    for (const [dxN, dyN] of [[9, 0], [-9, 0], [0, -8], [0, 8], [14, -9], [-14, -9]]) {
      const nx = sx + dxN;
      const ny = sy + dyN;
      if (nx < 154 || nx >= W - 4 || ny < 42 || ny >= 426) continue;
      const ni = (ny * W + nx) * 4;
      const nr = snapInpaint[ni];
      const ng = snapInpaint[ni + 1];
      const nb = snapInpaint[ni + 2];
      const ehNeonCiano = ng > 145 && nb > 165 && nr < 105 && nb - nr > 55;
      const ehNeonVerm =
        (nr > 145 && ng < 110 && nr - ng > 35) ||
        (ehMonstroAlvo && ny >= 310 && ny <= 326 && nr > 92 && nr - ng > 22 && nr - nb > 24);
      const ehBordaEscuraOuBranco = (nr < 16 && ng < 24 && nb < 32) || (nr > 155 && ng > 155 && nb > 155);
      if (!ehNeonCiano && !ehNeonVerm && !ehBordaEscuraOuBranco) {
        return [nr, ng, nb];
      }
    }
    return amostrarCeuMar(perfilEsq, pyPlaca, sx, sy);
  };

  if (!ehTouchdown) {
    const maxSxInpaint = ehChefeDraga && assets.dragaPlay ? 565 : 868;
    for (let sy = 44; sy <= 386; sy += 1) {
      const pyPlaca = sy - 40;
      for (let sx = 470; sx <= maxSxInpaint; sx += 1) {
        const naFaixaMirandoMastro = ehMonstroAlvo && sx >= 470 && sx <= 627 && sy >= 294 && sy <= 324;
        const naFaixaBicoVermelho = ehMonstroAlvo && sx >= 705 && sx <= 792 && sy >= 308 && sy <= 327;
        if (!naFaixaMirandoMastro && !naFaixaBicoVermelho) {
          if (sx <= 604 && sy >= 114 && sy <= 320 && !(!ehMonstroAlvo && sx >= 534 && sy >= 222 && sy <= 262)) continue;
          if (ehMonstroAlvo && sx >= 772 && sy >= 232) continue;
          if (ehMonstroAlvo && sx >= 624 && sx <= 708 && sy >= 216) continue;
        }
        const idxPx = (sy * W + sx) * 4;
        const rr = snapInpaint[idxPx];
        const gg = snapInpaint[idxPx + 1];
        const bb = snapInpaint[idxPx + 2];
        const ehArcoCiano =
          sx <= 548 && sy <= 114
            ? gg > 170 && bb > 190 && rr < 95 && bb - rr > 95
            : (sy <= 328 && gg > 142 && bb > 160 && rr < 102 && bb - rr > 60) ||
              (sy > 328 && sx >= 740 && sx <= 850 && gg > 195 && bb > 215 && rr < 95);
        const ehArcoVermelho = rr > 145 && gg < 108 && bb < 108 && rr - gg > 42 && !(sx >= 716 && sy <= 138);
        const ehTracoEscuroBico =
          naFaixaBicoVermelho &&
          ((rr > 68 && rr >= gg + 12) || (sx <= 770 && sy >= 312 && sy <= 324 && rr < 26 && gg < 36 && bb < 46));
        const ehTextoClaroMastro =
          naFaixaMirandoMastro && (rr > 118 || gg > 128 || bb > 138 || (rr < 18 && gg < 24 && sx >= 505));
        const ehTextoFlutuanteF1 =
          !ehMonstroAlvo && sx >= 594 && sx <= 654 && sy >= 234 && sy >= 234 && sy <= 266 && (rr > 120 || gg > 120 || (rr < 16 && gg < 22));
        const ehTypoTorretaF1 = !ehMonstroAlvo && !ehChefeDraga && sx >= 732 && sx <= 800 && sy >= 303 && sy <= 322;
        if (ehTypoTorretaF1 || ehTracoEscuroBico) {
          const pyLimpo = ehTypoTorretaF1 ? Math.min(pyPlaca, 248) : pyPlaca;
          const syLimpo = ehTypoTorretaF1 ? Math.min(sy, 288) : sy;
          const [cR, cG, cB] = amostrarCeuMar(perfilEsq, pyLimpo, sx, syLimpo);
          rgba[idxPx] = cR;
          rgba[idxPx + 1] = cG;
          rgba[idxPx + 2] = cB;
        } else if (ehArcoCiano || ehArcoVermelho || ehTextoClaroMastro || ehTextoFlutuanteF1) {
          const [cR, cG, cB] = inpaintVizinhoLimpo(sx, sy, pyPlaca);
          rgba[idxPx] = cR;
          rgba[idxPx + 1] = cG;
          rgba[idxPx + 2] = cB;
        }
      }
    }
    if (!ehMonstroAlvo && !ehChefeDraga && !usaSpriteBestiarioCena) {
      fillRect(736, 307, 783, 319, [8, 15, 22, 238], BORDER);
      txt(739, 310, 'TORRETA', TXT, 6);
    }
  } else {
    for (let sy = 222; sy <= 294; sy += 1) {
      const pyPlaca = Math.max(0, Math.min(placaEsq.altura - 1, sy - 40));
      const pyF1 = Math.max(0, Math.min(assets.f1Play.altura - 1, sy + 14 - 40));
      const maxSxCurva = Math.round(574 - Math.max(0, sy - 226) * 0.45 - Math.pow(Math.max(0, sy - 248) / 6.5, 2) * 4);
      for (let sx = 536; sx <= 610; sx += 1) {
        const idxDst = (sy * W + sx) * 4;
        const pxMarLimpo = Math.min(placaEsq.largura - 1, 616 + ((sx * 5 + sy * 3) % 14) - 150);
        const srcMar = (pyPlaca * placaEsq.largura + pxMarLimpo) * 4;
        let marR = placaEsq.rgba[srcMar];
        let marG = placaEsq.rgba[srcMar + 1];
        let marB = placaEsq.rgba[srcMar + 2];
        if ((marR > 92 && marR - marG > 22) || (marG > 135 && marB > 150)) {
          [marR, marG, marB] = amostrarCeuMar(perfilEsq, pyPlaca, sx, sy);
        }

        const pxF1 = Math.max(0, Math.min(assets.f1Play.largura - 1, sx + 22 - 150));
        const srcF1 = (pyF1 * assets.f1Play.largura + pxF1) * 4;
        const rF1 = assets.f1Play.rgba[srcF1];
        const gF1 = assets.f1Play.rgba[srcF1 + 1];
        const bF1 = assets.f1Play.rgba[srcF1 + 2];
        const ehPixelCascoF1 =
          sy >= 223 &&
          sy <= 268 &&
          sx <= maxSxCurva &&
          sx + 22 <= 604 &&
          !(rF1 > 140 && gF1 < 110) &&
          !(rF1 < 22 && gF1 < 48 && bF1 < 64 && bF1 >= gF1);
        if (ehPixelCascoF1) {
          if (sx === maxSxCurva || sy === 268) {
            rgba[idxDst] = 7;
            rgba[idxDst + 1] = 19;
            rgba[idxDst + 2] = 27;
          } else if (sx === maxSxCurva - 1 || sy === 267) {
            const dthS = ((sx + sy) & 1) === 0 ? 0 : 6;
            rgba[idxDst] = 16 + dthS;
            rgba[idxDst + 1] = 52 + dthS;
            rgba[idxDst + 2] = 66 + dthS;
          } else if (sy <= 225 && ((sx + sy) & 1) === 1) {
            rgba[idxDst] = marR;
            rgba[idxDst + 1] = marG;
            rgba[idxDst + 2] = marB;
          } else {
            rgba[idxDst] = Math.round(rF1 * 0.48 + 6);
            rgba[idxDst + 1] = Math.round(gF1 * 0.68 + 24);
            rgba[idxDst + 2] = Math.round(bF1 * 0.74 + 34);
          }
        } else if (sx >= 546) {
          const pesoMar = sx <= 600 ? 1 : (611 - sx) / 11;
          rgba[idxDst] = Math.round(snapInpaint[idxDst] * (1 - pesoMar) + marR * pesoMar);
          rgba[idxDst + 1] = Math.round(snapInpaint[idxDst + 1] * (1 - pesoMar) + marG * pesoMar);
          rgba[idxDst + 2] = Math.round(snapInpaint[idxDst + 2] * (1 - pesoMar) + marB * pesoMar);
        }
      }
    }
    const cascoIntactoTd =
      Number(viewModel.barraSuperior?.hpCascoAtual ?? 30) >= Number(viewModel.barraSuperior?.hpCascoMax ?? 30);
    const cam6SemBrechaTd = !(viewModel.camaras ?? []).some((c) => c.id === 6 && c.brechaAtiva);
    if (cascoIntactoTd && cam6SemBrechaTd) {
      for (let syK = 330; syK <= 408; syK += 1) {
        const pyPlacaK = Math.max(0, Math.min(placaEsq.altura - 1, syK - 40));
        for (let sxK = 350; sxK <= 476; sxK += 1) {
          const pK = (syK * W + sxK) * 4;
          const rK = rgba[pK];
          const gK = rgba[pK + 1];
          const bK = rgba[pK + 2];
          const ehAguaNaturalTd = bK >= rK + 18 && gK >= rK + 12 && rK <= 42;
          if (!ehAguaNaturalTd) {
            const [mR, mG, mB] = amostrarCeuMar(perfilEsq, pyPlacaK, sxK, syK);
            putPx(sxK, syK, [mR, mG, mB, 255]);
          }
        }
      }
      for (let syM2 = 344; syM2 <= 406; syM2 += 1) {
        putPx(447, syM2, [7, 18, 26, 255]);
        putPx(448, syM2, [48, 118, 140, 255]);
        putPx(449, syM2, [34, 88, 108, 255]);
        putPx(450, syM2, [24, 68, 86, 255]);
        putPx(451, syM2, [16, 48, 64, 255]);
        putPx(452, syM2, [7, 18, 26, 255]);
      }
      for (const [bxT, byT, rT] of [
        [432, 374, 2], [440, 382, 1], [457, 376, 2], [464, 385, 1],
        [426, 388, 1], [456, 392, 1], [444, 395, 1],
      ]) {
        fillRect(bxT, byT, bxT + rT, byT + rT, (bxT & 1) === 0 ? CYAN : TXT);
      }
    }
  }

  return { placaEsq, perfilEsq, deslSubTick };
}

export function renderizarSobrecomposicaoCombate60Fps(ctx, paramsCombate) {
  const {
    W,
    rgba,
    viewModel,
    opcoes,
    hitboxes,
    disparandoDorsal,
    ev60,
    idHoverAtivo,
    idPressAtivo,
    ehTouchdown,
    ehMonstroAlvo,
    ehChefeDraga,
    idCarcaca,
    RIM,
    TXT,
    DIM,
    GREEN,
    CYAN,
    AMBER,
    RED,
    YELLOW,
    VIOLET,
    putPx,
    fillRect,
    hLine,
    lineSeg,
    txt,
    chanfradoBezel,
  } = ctx;
  const { placaEsq, perfilEsq, yLinhaDaguaCena, deslSubTick, brqLigadoCena } = paramsCombate;

  const tipNoCantoSupEsq =
    Boolean(opcoes.exibirTooltipHover) &&
    Boolean(idHoverAtivo) &&
    (String(idHoverAtivo).startsWith('CAMARA_') || String(idHoverAtivo).startsWith('VALVULA_') || ehChefeDraga);
  const hbAbordar = hitboxes.find((h) => h.idHitbox === 'BTN_LANCAR_ABORDAGEM');
  if (hbAbordar) {
    const hovAb = idHoverAtivo === hbAbordar.idHitbox;
    const dyAb = idPressAtivo === hbAbordar.idHitbox ? 1 : 0;
    const resAb = viewModel.resumoAbordagem ?? {};
    const prontoAb = Boolean(resAb.tuboPronto);
    const recAb = Number(resAb.recargaRestanteSeg ?? 0);
    const nBordo = (viewModel.tripulacaoAbordagemAliada ?? []).length;
    const salaAlvoAb = Number(opcoes.salaAlvoAbordagemId ?? resAb.salaAlvoPadraoId ?? 1);
    const stCurtoAb = String(resAb.statusCurto ?? '');
    const semEnergiaAb = resAb.tuboInstalado && (Number(resAb.energiaEfetivaTubo ?? 1) < 1 || stCurtoAb === '0 ENERGIA');
    const domoAtivoAb = stCurtoAb === 'BLINDAGEM';
    const corBordaAb = hovAb
      ? YELLOW
      : prontoAb
        ? GREEN
        : domoAtivoAb
          ? RED
          : recAb > 0.05 || semEnergiaAb
            ? AMBER
            : nBordo > 0
              ? CYAN
              : DIM;
    chanfradoBezel(
      hbAbordar.x,
      hbAbordar.y + dyAb,
      hbAbordar.x + hbAbordar.largura - 1,
      hbAbordar.y + hbAbordar.altura - 1 + dyAb,
      prontoAb ? [12, 40, 30, 244] : [10, 18, 26, 238],
      corBordaAb,
      2,
      prontoAb ? TXT : RIM
    );
    const rotAb =
      resAb.tuboInstalado === false || stCurtoAb === 'S/ TUBO'
        ? '[G] S/ TUBO'
        : domoAtivoAb
          ? '[G] DOMO ATIVO'
          : semEnergiaAb
            ? '[G] TUBO 0 ENE'
            : recAb > 0.05
              ? `[G] TUBO ${recAb.toFixed(0)}s`
              : prontoAb
                ? `[G] ABORDAR S${salaAlvoAb}`
                : nBordo > 0
                  ? `[G] BORDO (${nBordo})`
                  : '[G] C7 VAZIA';
    txt(
      hbAbordar.x + 5,
      hbAbordar.y + 7 + dyAb,
      rotAb.slice(0, 16),
      hovAb ? YELLOW : prontoAb ? GREEN : domoAtivoAb ? RED : recAb > 0.05 || semEnergiaAb ? AMBER : nBordo > 0 ? CYAN : DIM,
      6
    );
  }
  const yBanHip = tipNoCantoSupEsq ? 78 : hbAbordar ? 70 : 44;
  if ((viewModel.telemetriaBioReflexo?.alertaReflexoBranquialSeg ?? 0) > 0) {
    if (brqLigadoCena) {
      chanfradoBezel(162, yBanHip, 368, yBanHip + 14, [10, 40, 26, 244], GREEN, 2, [110, 255, 152, 255]);
      txt(168, yBanHip + 4, 'REFLEXO BRANQUIAL: +1 BRQ AUTO!', GREEN, 6);
    } else {
      chanfradoBezel(162, yBanHip, 356, yBanHip + 14, [56, 14, 20, 244], RED, 2, AMBER);
      txt(168, yBanHip + 4, 'HIPÓXIA! ENERGIZE [B] BRQ!', YELLOW, 6);
    }
  } else if (viewModel.telemetriaBioReflexo?.alertaPreHipoxia) {
    chanfradoBezel(162, yBanHip, 368, yBanHip + 14, [44, 14, 58, 242], VIOLET, 2, CYAN);
    txt(168, yBanHip + 4, `O2 BAIXO (${Math.round(viewModel.telemetriaBioReflexo.menorOxigenioOcupadoPct)}%) — APERTE [B]!`, YELLOW, 6);
  }

  const obterBocaDorsalRender = (slotIdx) => {
    const dyBaseBoca = ehTouchdown ? 10 : ehMonstroAlvo ? -12 : 0;
    const dxTdBoca = ehTouchdown ? -24 : 0;
    const tabBocasRender = {
      CARCACA_ALFA: [[569, 95], [482, 58]],
      MANTA_VOLT: [[540, 100], [474, 74]],
      COURACA_LIMIAR: [[494, 86], [557, 120]],
      SOMBRA_ABISSAL: [[558, 108], [485, 85]],
      COLMEIA_VIVA: [[568, 100], [472, 58]],
    };
    const parBocas = tabBocasRender[idCarcaca] ?? tabBocasRender.CARCACA_ALFA;
    const [bxD, byD] = parBocas[slotIdx === 1 ? 1 : 0];
    return [bxD + dxTdBoca, byD + dyBaseBoca + deslSubTick];
  };
  const [boca0X, boca0Y] = obterBocaDorsalRender(0);
  const [boca1X, boca1Y] = obterBocaDorsalRender(1);
  const projsRecentesJog = (ev60?.projeteisAtivos ?? []).filter((p) => p.lado === 'JOGADOR' && p.progresso0a1 < 0.25);
  if (disparandoDorsal || projsRecentesJog.some((p) => (p.slotIndex ?? 0) === 0)) {
    fillRect(boca0X - 3, boca0Y - 3, boca0X + 7, boca0Y + 3, CYAN);
    fillRect(boca0X, boca0Y - 1, boca0X + 9, boca0Y + 1, YELLOW);
    putPx(boca0X + 10, boca0Y, TXT);
  }
  if (disparandoDorsal || projsRecentesJog.some((p) => p.slotIndex === 1)) {
    fillRect(boca1X - 3, boca1Y - 3, boca1X + 7, boca1Y + 3, YELLOW);
    fillRect(boca1X, boca1Y - 1, boca1X + 9, boca1Y + 1, TXT);
  }

  renderizarAlvoInimigoESalasCombate(ctx, {
    placaEsq,
    perfilEsq,
    yLinhaDaguaCena,
    obterBocaDorsalRender,
  });

  if (ev60) {
    for (const fl of ev60.flashesSalas ?? []) {
      chanfradoBezel(fl.x, fl.y, fl.x + fl.largura - 1, fl.y + fl.altura - 1, fl.cor === 'RED' ? [255, 42, 56, 115] : [79, 242, 255, 115], TXT, 3);
    }
    for (const proj of ev60.projeteisAtivos ?? []) {
      const [origProjX, origProjY] =
        proj.lado === 'JOGADOR' ? obterBocaDorsalRender(proj.slotIndex ?? 0) : [proj.xOrigem, proj.yOrigem];
      if (proj.ehFeixe) {
        const fxFim = proj.xAtual ?? proj.xDestino;
        const fyFim = proj.yAtual ?? proj.yDestino;
        if (Array.isArray(proj.waypointsSalas) && proj.waypointsSalas.length >= 2) {
          const wp0 = proj.waypointsSalas[0];
          lineSeg(wp0.x - 1, wp0.y, fxFim - 1, fyFim, RED, false);
          lineSeg(wp0.x + 1, wp0.y, fxFim + 1, fyFim, RED, false);
          lineSeg(wp0.x, wp0.y, fxFim, fyFim, AMBER, false);
          lineSeg(wp0.x, wp0.y, fxFim, fyFim, YELLOW, true);
          chanfradoBezel(wp0.x - 2, wp0.y - 2, wp0.x + 2, wp0.y + 2, AMBER, RED, 1);
          putPx(wp0.x, wp0.y, TXT);
        } else {
          lineSeg(fxFim - 10, fyFim - 3, fxFim, fyFim, RED, false);
        }
        lineSeg(origProjX, origProjY, fxFim, fyFim, AMBER, false);
        lineSeg(origProjX, origProjY + 1, fxFim, fyFim + 1, YELLOW, false);
        lineSeg(origProjX, origProjY - 1, fxFim, fyFim - 1, RED, false);
        chanfradoBezel(fxFim - 3, fyFim - 3, fxFim + 3, fyFim + 3, YELLOW, RED, 1);
      } else if (String(proj.chassiId).includes('ARPAO')) {
        lineSeg(origProjX, origProjY, proj.xAtual, proj.yAtual, [176, 198, 212, 255], true);
        chanfradoBezel(proj.xAtual - 5, proj.yAtual - 2, proj.xAtual + 4, proj.yAtual + 2, TXT, RED, 1);
        lineSeg(proj.xAtual + 4, proj.yAtual, proj.xAtual + 7, proj.yAtual, YELLOW, false);
      } else if (String(proj.chassiId).includes('ACUSTICO')) {
        for (const rAc of [4, 7]) {
          chanfradoBezel(proj.xAtual - rAc, proj.yAtual - rAc, proj.xAtual + rAc, proj.yAtual + rAc, null, CYAN, 2);
        }
      } else if (String(proj.chassiId).includes('ESPOROS')) {
        chanfradoBezel(proj.xAtual - 3, proj.yAtual - 3, proj.xAtual + 3, proj.yAtual + 3, GREEN, VIOLET, 1);
      } else if (proj.lado === 'INIMIGO') {
        const pxI = Math.round(proj.xAtual);
        const pyI = Math.round(proj.yAtual);
        hLine(pxI + 2, pxI + 10, pyI, AMBER, 1);
        hLine(pxI - 3, pxI + 3, pyI - 1, RED, 3);
        hLine(pxI - 5, pxI + 1, pyI, YELLOW, 1);
        putPx(pxI - 6, pyI, TXT);
        putPx(pxI + 2, pyI - 2, RED);
        putPx(pxI + 2, pyI + 2, RED);
      } else {
        const pxJ = Math.round(proj.xAtual);
        const pyJ = Math.round(proj.yAtual);
        hLine(pxJ - 9, pxJ - 2, pyJ, CYAN, 1);
        hLine(pxJ - 3, pxJ + 3, pyJ - 1, YELLOW, 3);
        putPx(pxJ + 4, pyJ, TXT);
      }
    }
    for (const tf of ev60.textosFlutuantes ?? []) {
      const corTf = tf.cor === 'RED' ? RED : tf.cor === 'GREEN' ? GREEN : tf.cor === 'CYAN' ? CYAN : tf.cor === 'AMBER' ? AMBER : YELLOW;
      chanfradoBezel(tf.x - 4, tf.y - 5, tf.x + tf.texto.length * 7 + 4, tf.y + 9, [6, 11, 17, 242], corTf, 2);
      txt(tf.x, tf.y, tf.texto, corTf, 7);
    }

    const shX = Math.max(-6, Math.min(6, Math.round(Number(ev60.shakeX ?? 0))));
    const shY = Math.max(-5, Math.min(5, Math.round(Number(ev60.shakeY ?? 0))));
    if (shX !== 0 || shY !== 0) {
      const wVp = 808;
      const hVp = 388;
      const copiaVp = new Uint8ClampedArray(wVp * hVp * 4);
      for (let vy = 0; vy < hVp; vy += 1) {
        const sOff = ((41 + vy) * W + 151) * 4;
        copiaVp.set(rgba.subarray(sOff, sOff + wVp * 4), vy * wVp * 4);
      }
      for (let vy = 0; vy < hVp; vy += 1) {
        const syOrig = Math.max(0, Math.min(hVp - 1, vy - shY));
        for (let vx = 0; vx < wVp; vx += 1) {
          const sxOrig = Math.max(0, Math.min(wVp - 1, vx - shX));
          const sIdx = (syOrig * wVp + sxOrig) * 4;
          const dIdx = ((41 + vy) * W + (151 + vx)) * 4;
          rgba[dIdx] = copiaVp[sIdx];
          rgba[dIdx + 1] = copiaVp[sIdx + 1];
          rgba[dIdx + 2] = copiaVp[sIdx + 2];
        }
      }
    }
  }
}
