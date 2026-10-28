/**
 * ONDA 6 — Fonte Única de Verdade (SSOT) da Geometria de Layout Nativo 960x540
 * Dono Único (Lei N5): src/onda6-ui/geometria-layout-960.mjs
 *
 * Responsabilidades:
 *  - Concentrar em um único módulo puro (0 imports Node.js, 100% compatível com Browser ES Modules e Node)
 *    todas as coordenadas retangulares de Hangar, Loja, Oficina, Modais (Saque / Desfecho de Evento),
 *    8 Câmaras da Bio-Nave e Cutaways de Alvos Inimigos (4/5/6 salas + Monstros + Chefe Draga);
 *  - Eliminar qualquer duplicação de coordenadas entre `hitboxes-layout.mjs`, `interpolador-60fps.mjs`,
 *    `renderizador-telas-campanha.mjs` e `renderizador-alvo-inimigo.mjs`.
 */

function clonarCongeladoRecursivoPuro(valor) {
  if (
    valor === null ||
    typeof valor !== 'object' ||
    (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(valor))
  ) {
    return valor;
  }
  if (Array.isArray(valor)) {
    const arr = new Array(valor.length);
    for (let i = 0; i < valor.length; i += 1) {
      arr[i] = clonarCongeladoRecursivoPuro(valor[i]);
    }
    return Object.freeze(arr);
  }
  const copia = {};
  const chaves = Object.keys(valor);
  for (let i = 0; i < chaves.length; i += 1) {
    const k = chaves[i];
    copia[k] = clonarCongeladoRecursivoPuro(valor[k]);
  }
  return Object.freeze(copia);
}

export function congelarProfundoClienteSeguro(obj) {
  return clonarCongeladoRecursivoPuro(obj);
}

export const COORDENADAS_GRADE_CAMARAS_16A = Object.freeze({
  1: Object.freeze({ coluna: 0, andar: 0 }),
  7: Object.freeze({ coluna: 1, andar: 0 }),
  2: Object.freeze({ coluna: 0, andar: 1 }),
  3: Object.freeze({ coluna: 1, andar: 1 }),
  4: Object.freeze({ coluna: 0, andar: 2 }),
  5: Object.freeze({ coluna: 1, andar: 2 }),
  6: Object.freeze({ coluna: 0, andar: 3 }),
  8: Object.freeze({ coluna: 1, andar: 3 }),
});

export function calcularLayoutPlacaCamaras960(ehTouchdown = false, ehMonstroAlvo = false) {
  if (ehTouchdown) {
    return Object.freeze({
      xEsq: 338,
      xDir: 438,
      larguraCam: 79,
      xValvEsq: 319,
      xValvDir: 520,
      toposY: Object.freeze([130, 178, 224, 272]),
      alturasY: Object.freeze([40, 38, 42, 40]),
    });
  }
  if (ehMonstroAlvo) {
    return Object.freeze({
      xEsq: 378,
      xDir: 466,
      larguraCam: 72,
      xValvEsq: 359,
      xValvDir: 541,
      toposY: Object.freeze([122, 164, 204, 246]),
      alturasY: Object.freeze([38, 36, 38, 40]),
    });
  }
  return Object.freeze({
    xEsq: 364,
    xDir: 462,
    larguraCam: 77,
    xValvEsq: 345,
    xValvDir: 542,
    toposY: Object.freeze([126, 172, 218, 264]),
    alturasY: Object.freeze([42, 42, 43, 44]),
  });
}

export function calcularRetanguloCardHangar960(indiceCard = 0, desalinhamentoPx = 0) {
  const idx = Math.max(0, Math.min(4, Number(indiceCard) || 0));
  return Object.freeze({
    x: 24 + idx * 184 + desalinhamentoPx,
    y: 108,
    largura: 176,
    altura: 272,
  });
}

export function calcularRetanguloCardLoja960(indiceOferta = 0, desalinhamentoPx = 0) {
  const idx = Math.max(0, Math.min(7, Number(indiceOferta) || 0));
  const col = idx % 4;
  const row = Math.floor(idx / 4);
  return Object.freeze({
    x: 162 + col * 198 + desalinhamentoPx,
    y: 125 + row * 138,
    largura: 192,
    altura: 132,
  });
}

export function calcularRetanguloVendaPoraoLoja960(indicePorao = 0, desalinhamentoPx = 0) {
  const idx = Math.max(0, Math.min(3, Number(indicePorao) || 0));
  return Object.freeze({
    x: 576 + idx * 93 + desalinhamentoPx,
    y: 403,
    largura: 89,
    altura: 21,
  });
}

export function calcularGeometriaOficina960(desalinhamentoPx = 0) {
  return Object.freeze({
    caixaExterna: Object.freeze({ x0: 156, y0: 44, x1: 954, y1: 424 }),
    btnAbandonarRun: Object.freeze({ x: 528 + desalinhamentoPx, y: 52, largura: 146, altura: 22 }),
    btnMoedaReator: Object.freeze({ x: 680 + desalinhamentoPx, y: 52, largura: 166, altura: 22 }),
    btnFechar: Object.freeze({ x: 852 + desalinhamentoPx, y: 52, largura: 92, altura: 22 }),
    arvoreUpgrade(idx) {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      return Object.freeze({
        x: 168 + col * 226 + desalinhamentoPx,
        y: 82 + row * 42,
        largura: 218,
        altura: 38,
      });
    },
    caixaSlotDorsal(k) {
      return Object.freeze({
        x: 168 + k * 112 + desalinhamentoPx,
        y: 306,
        largura: 108,
        altura: 46,
      });
    },
    btnArmaDesequipar(k) {
      return Object.freeze({
        x: 168 + k * 112 + desalinhamentoPx,
        y: 356,
        largura: 108,
        altura: 23,
      });
    },
    btnArmaRemoverOrgao(k) {
      return Object.freeze({
        x: 168 + k * 112 + desalinhamentoPx,
        y: 383,
        largura: 108,
        altura: 23,
      });
    },
    caixaSlotPorao(c) {
      const yBase = 84 + c * 82;
      return Object.freeze({
        x: 626 + desalinhamentoPx,
        y: yBase,
        largura: 318,
        altura: 74,
      });
    },
    btnPoraoEquipar(c) {
      const yBase = 84 + c * 82;
      return Object.freeze({
        x: 628 + desalinhamentoPx,
        y: yBase + 46,
        largura: 100,
        altura: 24,
      });
    },
    btnPoraoEnxertar(c) {
      const yBase = 84 + c * 82;
      return Object.freeze({
        x: 732 + desalinhamentoPx,
        y: yBase + 46,
        largura: 104,
        altura: 24,
      });
    },
    btnPoraoDescartarOuVender(c) {
      const yBase = 84 + c * 82;
      return Object.freeze({
        x: 840 + desalinhamentoPx,
        y: yBase + 46,
        largura: 102,
        altura: 24,
      });
    },
  });
}

export function calcularRetangulosModaisCampanha960(desalinhamentoPx = 0) {
  return Object.freeze({
    saqueCaixa: Object.freeze({ x0: 204, y0: 86, x1: 708, y1: 376 }),
    saqueBtnConfirmar: Object.freeze({ x: 326 + desalinhamentoPx, y: 326, largura: 260, altura: 34 }),
    desfechoEventoCaixa: Object.freeze({ x0: 214, y0: 94, x1: 704, y1: 368 }),
    desfechoEventoBtnConfirmar: Object.freeze({ x: 324 + desalinhamentoPx, y: 318, largura: 270, altura: 34 }),
  });
}

export function calcularRetangulosSalasAlvo960(salasAlvo = [], opcoes = {}) {
  const ehMonstroAlvo = Boolean(opcoes.ehMonstroAlvo);
  const ehTouchdown = Boolean(opcoes.ehTouchdown);
  const classeAlvo = String(opcoes.classeAlvo ?? '');
  const desalinhamentoPx = Number(opcoes.desalinhamentoPx ?? 0);
  const lista = Array.isArray(salasAlvo) ? salasAlvo : [];

  if (ehMonstroAlvo) {
    const dyMonstroTd = ehTouchdown ? -108 : 0;
    const dyMonstroMultiTd = ehTouchdown ? -60 : 0;
    const modoVitrine = Boolean(opcoes.modoVitrineBestiario);
    const idArqMon = String(opcoes.arquetipoAlvoId ?? '').toUpperCase();
    if (!modoVitrine && lista.length === 5 && idArqMon.includes('ENGUIA')) {
      const caixasEnguia = [
        { x: 626, y: 214 + dyMonstroMultiTd, w: 68, h: 36 },
        { x: 700, y: 254 + dyMonstroMultiTd, w: 68, h: 36 },
        { x: 626, y: 296 + dyMonstroMultiTd, w: 68, h: 36 },
        { x: 700, y: 338 + dyMonstroMultiTd, w: 68, h: 36 },
        { x: 632, y: 382 + dyMonstroMultiTd, w: 74, h: 38 },
      ];
      return lista.map((sala, idx) => {
        const cx = caixasEnguia[idx] ?? { x: 632, y: 214 + dyMonstroMultiTd + idx * 42, w: 68, h: 36 };
        return { sala, x: cx.x + desalinhamentoPx, y: cx.y, largura: cx.w, altura: cx.h };
      });
    }
    if (!modoVitrine && lista.length === 5) {
      const caixasCaranguejo = [
        { x: 624, y: 222 + dyMonstroMultiTd, w: 72, h: 42 },
        { x: 702, y: 222 + dyMonstroMultiTd, w: 72, h: 42 },
        { x: 624, y: 276 + dyMonstroMultiTd, w: 72, h: 42 },
        { x: 702, y: 276 + dyMonstroMultiTd, w: 72, h: 42 },
        { x: 658, y: 332 + dyMonstroMultiTd, w: 80, h: 44 },
      ];
      return lista.map((sala, idx) => {
        const cx = caixasCaranguejo[idx] ?? { x: 626, y: 222 + dyMonstroMultiTd + idx * 46, w: 72, h: 40 };
        return { sala, x: cx.x + desalinhamentoPx, y: cx.y, largura: cx.w, altura: cx.h };
      });
    }
    if (!modoVitrine && lista.length >= 6) {
      const caixasHidra = [
        { x: 624, y: 216 + dyMonstroMultiTd, w: 72, h: 40 },
        { x: 702, y: 216 + dyMonstroMultiTd, w: 72, h: 40 },
        { x: 624, y: 268 + dyMonstroMultiTd, w: 72, h: 40 },
        { x: 702, y: 268 + dyMonstroMultiTd, w: 72, h: 40 },
        { x: 624, y: 320 + dyMonstroMultiTd, w: 72, h: 40 },
        { x: 702, y: 320 + dyMonstroMultiTd, w: 72, h: 42 },
      ];
      return lista.map((sala, idx) => {
        const cx = caixasHidra[idx] ?? { x: 624 + (idx % 2) * 78, y: 216 + dyMonstroMultiTd + Math.floor(idx / 2) * 52, w: 72, h: 40 };
        return { sala, x: cx.x + desalinhamentoPx, y: cx.y, largura: cx.w, altura: cx.h };
      });
    }
    const caixasOrgaos = modoVitrine
      ? [
          { x: 713, y: 222 + dyMonstroTd, w: 82, h: 42 },
          { x: 713, y: 274 + dyMonstroTd, w: 82, h: 38 },
          { x: 713, y: 322 + dyMonstroTd, w: 82, h: 38 },
          { x: 713, y: 370 + dyMonstroTd, w: 82, h: 38 },
        ]
      : [
          { x: 628, y: 220 + dyMonstroTd, w: 80, h: 48 },
          { x: 628, y: 283 + dyMonstroTd, w: 79, h: 40 },
          { x: 628, y: 338 + dyMonstroTd, w: 79, h: 40 },
          { x: 627, y: 384 + dyMonstroTd, w: 80, h: 40 },
        ];
    return lista.map((sala, idx) => {
      const cx = caixasOrgaos[idx] ?? { x: modoVitrine ? 716 : 630, y: 220 + dyMonstroTd + idx * 50, w: 74, h: 38 };
      return {
        sala,
        x: cx.x + desalinhamentoPx,
        y: cx.y,
        largura: cx.w,
        altura: cx.h,
      };
    });
  }

  if (classeAlvo === 'CHEFE_DRAGA' || lista.length > 4) {
    const dyDragaTd = ehTouchdown ? -88 : 0;
    const secas = lista.filter((s) => !s.submersa);
    const submersas = lista.filter((s) => s.submersa);
    return lista.map((sala) => {
      const fila = sala.submersa ? submersas : secas;
      const idxFila = Math.max(0, fila.findIndex((x) => (x.salaId ?? x.id) === (sala.salaId ?? sala.id)));
      let xSala;
      let larguraSala;
      let ySala;
      let alturaSala;
      if (classeAlvo === 'CHEFE_DRAGA') {
        if (!sala.submersa) {
          const passoSeca = Math.floor(276 / Math.max(1, secas.length));
          larguraSala = Math.min(88, passoSeca - 4);
          xSala = 680 + idxFila * passoSeca;
          ySala = 276 + dyDragaTd;
          alturaSala = 46;
        } else if (submersas.length === 2) {
          xSala = idxFila === 0 ? 706 : 862;
          larguraSala = idxFila === 0 ? 104 : 92;
          ySala = 338 + dyDragaTd;
          alturaSala = 42;
        } else {
          const passoSub = Math.floor(264 / Math.max(1, submersas.length));
          larguraSala = Math.min(84, passoSub - 4);
          xSala = 692 + idxFila * passoSub;
          ySala = 338 + dyDragaTd;
          alturaSala = 42;
        }
      } else if (!sala.submersa) {
        // Barcos 5/6 salas (Corveta, Arrastão, Submarino): corte translúcido compacto (altura 36)
        // deixando superestrutura, mastro, ponte, proa, popa e quilha em destaque!
        const passoSeca = Math.floor(222 / Math.max(1, secas.length));
        larguraSala = Math.min(70, passoSeca - 4);
        xSala = 716 + idxFila * passoSeca;
        ySala = 288 + dyDragaTd;
        alturaSala = 36;
      } else if (submersas.length === 2) {
        xSala = idxFila === 0 ? 722 : 848;
        larguraSala = idxFila === 0 ? 88 : 82;
        ySala = 336 + dyDragaTd;
        alturaSala = 36;
      } else {
        const passoSub = Math.floor(222 / Math.max(1, submersas.length));
        larguraSala = Math.min(70, passoSub - 4);
        xSala = 716 + idxFila * passoSub;
        ySala = 336 + dyDragaTd;
        alturaSala = 36;
      }
      return {
        sala,
        x: xSala + desalinhamentoPx,
        y: ySala,
        largura: larguraSala,
        altura: alturaSala,
      };
    });
  }

  const ocupados = new Set();
  return lista.map((sala, idx) => {
    const nome = String(sala.nomeSala ?? sala.nome ?? '');
    let linArt = sala.submersa ? 1 : 0;
    let colArt = /CABINE|COMANDO|PONTE|MOTOR|MAQUINAS|PROPULSAO/i.test(nome) ? 1 : 0;
    if (ocupados.has(`${colArt},${linArt}`)) {
      colArt = 1 - colArt;
      if (ocupados.has(`${colArt},${linArt}`)) {
        linArt = Math.floor(idx / 2);
        colArt = idx % 2;
      }
    }
    ocupados.add(`${colArt},${linArt}`);
    const geomX = ehTouchdown
      ? (colArt === 0 ? { x: 726, w: 58 } : { x: 788, w: 62 })
      : (colArt === 0 ? { x: 736, w: 58 } : { x: 798, w: 62 });
    const geomY = ehTouchdown
      ? (linArt === 0 ? { y: 165, h: 49 } : { y: 222, h: 36 })
      : (linArt === 0 ? { y: 305, h: 49 } : { y: 362, h: 36 });
    return {
      sala,
      x: geomX.x + desalinhamentoPx,
      y: geomY.y,
      largura: geomX.w,
      altura: geomY.h,
    };
  });
}
