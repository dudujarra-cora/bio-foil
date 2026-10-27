/**
 * ONDA 6 — Tradutor Determinístico de Eventos DOM (Teclado, Mouse e Hover) para Comandos Atômicos 8.5.A e Ações de Campanha
 * Dono Único (Lei N5): src/onda6-ui/tradutor-input-dom.mjs
 */
import { clonarProfundoCongelado } from '../gdd-parser.mjs';
import { enumerarTrincasBeam } from '../onda2-combate/tick-sistemas-armas.mjs';
import { CATALOGO_ARMAS_51 } from '../onda5-catalogo-chefe/catalogo-naves-itens.mjs';
import {
  converterCoordenadaTelaParaNativa,
  obterMapaHitboxesNativo,
  calcularGhostPreviewTermometro,
} from './hitboxes-layout.mjs';
import { resolverGrafoBeamAlvoInterno } from './tick-combate-tempo-real.mjs';
import { despacharComandoUi } from './despacho-comandos.mjs';

const CARCACAS_ATALHO_HANGAR = Object.freeze([
  'CARCACA_ALFA',
  'MANTA_VOLT',
  'COURACA_LIMIAR',
  'SOMBRA_ABISSAL',
  'COLMEIA_VIVA',
]);

export function construirTrincaBeamAssistidaDom(alvoCombate, salaClicadaId, salaAnteriorId = null) {
  const s1 = Number(salaClicadaId);
  const grafo = resolverGrafoBeamAlvoInterno(alvoCombate);
  const salasIds = new Set(
    Array.isArray(alvoCombate?.salasOuOrgaos) && alvoCombate.salasOuOrgaos.length > 0
      ? alvoCombate.salasOuOrgaos.map((s) => Number(s.id))
      : Object.keys(grafo).map((k) => Number(k))
  );
  if (!salasIds.has(s1)) return null;
  const todas = enumerarTrincasBeam(grafo).filter((t) => t.every((id) => salasIds.has(Number(id))));
  const sAnt = salaAnteriorId !== null && salaAnteriorId !== undefined ? Number(salaAnteriorId) : null;
  if (sAnt !== null && sAnt !== s1 && salasIds.has(sAnt)) {
    const encadeada = todas.find((t) => t[0] === sAnt && (t[1] === s1 || t[2] === s1));
    if (encadeada) return encadeada;
  }
  const iniciando = todas.filter((t) => t[0] === s1);
  return iniciando[0] ?? todas.find((t) => t.includes(s1)) ?? null;
}

function montarComandoAtalhoAbordagemDom(estado, contextoUi = {}) {
  const tripEm7 = (estado.naveJogador?.tripulacao ?? [])
    .filter((t) => t.localizacao === 'NAVE_JOGADOR' && t.camaraAtualId === 7 && Number(t.hpAtual ?? 0) > 0)
    .slice(0, 2)
    .map((t) => t.id);
  const salaAlvoPadrao =
    Number(contextoUi.salaAlvoAbordagemId ?? 0) > 0
      ? Number(contextoUi.salaAlvoAbordagemId)
      : Number(estado.alvoCombate?.salasOuOrgaos?.[0]?.id ?? 1);
  return {
    tipo: 'LANCAR_ABORDAGEM',
    payload: {
      tripulantesIds: tripEm7,
      salaAlvoId: salaAlvoPadrao,
    },
  };
}

/**
 * Traduz um evento DOM (teclado, hover ou clique de mouse no Canvas 16:9) num comando atômico da Seção 8.5.A
 * ou ação de interface (pausa tática / seleção / Ghost Preview / Campanha Completa) e opcionalmente despacha no motor real.
 */
export function traduzirInputDomParaComandoUi(eventoInput, estado, viewModel, contextoUi = {}) {
  const tipoEvento = eventoInput?.tipoEvento ?? 'CLICK';
  const todasAbertas = (estado.naveJogador?.camaras ?? []).every((c) => c.valvulaExternaAberta);
  const faseAtual = estado.meta?.faseJogo ?? viewModel?.faseJogo ?? 'COMBATE';
  const modalAtivo = estado.meta?.modalCampanhaAtivo ?? viewModel?.modalCampanhaAtivo ?? null;

  if (tipoEvento === 'KEYDOWN') {
    const code = String(eventoInput.code ?? '');

    if (code === 'KeyK') {
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: 'ACAO_CAMPANHA',
        acaoCampanhaUi: { tipoAcao: 'ALTERNAR_AUDIO_MUDO', payload: {} },
        comandoMotor: null,
        resultadoMotor: null,
      });
    }

    if (modalAtivo === 'SAQUE') {
      if (code === 'Enter' || code === 'Space') {
        return clonarProfundoCongelado({
          reconhecido: true,
          acaoLocalUi: 'ACAO_CAMPANHA',
          acaoCampanhaUi: { tipoAcao: 'CONFIRMAR_SAQUE_POS_COMBATE', payload: {} },
          comandoMotor: null,
          resultadoMotor: null,
        });
      }
      return clonarProfundoCongelado({
        reconhecido: false,
        acaoLocalUi: null,
        comandoMotor: null,
        resultadoMotor: null,
      });
    }

    if (modalAtivo === 'EVENTO_DESFECHO') {
      if (code === 'Enter' || code === 'Space' || code === 'Escape') {
        return clonarProfundoCongelado({
          reconhecido: true,
          acaoLocalUi: 'ACAO_CAMPANHA',
          acaoCampanhaUi: { tipoAcao: 'CONFIRMAR_DESFECHO_EVENTO', payload: {} },
          comandoMotor: null,
          resultadoMotor: null,
        });
      }
      return clonarProfundoCongelado({
        reconhecido: false,
        acaoLocalUi: null,
        comandoMotor: null,
        resultadoMotor: null,
      });
    }

    if (modalAtivo === 'OFICINA') {
      if (code === 'Escape' || code === 'KeyU') {
        return clonarProfundoCongelado({
          reconhecido: true,
          acaoLocalUi: 'ACAO_CAMPANHA',
          acaoCampanhaUi: { tipoAcao: 'ABRIR_FECHAR_OFICINA', payload: { aberto: false } },
          comandoMotor: null,
          resultadoMotor: null,
        });
      }
      if (code === 'KeyR') {
        return clonarProfundoCongelado({
          reconhecido: true,
          acaoLocalUi: 'ACAO_CAMPANHA',
          acaoCampanhaUi: { tipoAcao: 'ALTERNAR_MOEDA_REATOR', payload: {} },
          comandoMotor: null,
          resultadoMotor: null,
        });
      }
      return clonarProfundoCongelado({
        reconhecido: false,
        acaoLocalUi: null,
        comandoMotor: null,
        resultadoMotor: null,
      });
    }

    if (code === 'Enter') {
      if (faseAtual === 'INICIO' || faseAtual === 'FIM_DE_RUN') {
        return clonarProfundoCongelado({
          reconhecido: true,
          acaoLocalUi: 'ACAO_CAMPANHA',
          acaoCampanhaUi: { tipoAcao: 'INICIAR_NOVA_RUN', payload: {} },
          comandoMotor: null,
          resultadoMotor: null,
        });
      }
    }

    if ((code === 'Escape' || code === 'KeyH') && faseAtual === 'FIM_DE_RUN') {
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: 'ACAO_CAMPANHA',
        acaoCampanhaUi: { tipoAcao: 'VOLTAR_AO_HANGAR', payload: {} },
        comandoMotor: null,
        resultadoMotor: null,
      });
    }

    // No Hangar (INICIO), Digit1..Digit5 selecionam as 5 bio-naves prometidas no rodapé!
    if (faseAtual === 'INICIO') {
      const mHangar = code.match(/^Digit([1-5])$/);
      if (mHangar) {
        const idxNave = Number(mHangar[1]) - 1;
        return clonarProfundoCongelado({
          reconhecido: true,
          acaoLocalUi: 'ACAO_CAMPANHA',
          acaoCampanhaUi: {
            tipoAcao: 'SELECIONAR_CARCACA_HANGAR',
            payload: { idArquitetura: CARCACAS_ATALHO_HANGAR[idxNave] },
          },
          comandoMotor: null,
          resultadoMotor: null,
        });
      }
      if (code === 'KeyC') {
        return clonarProfundoCongelado({
          reconhecido: true,
          acaoLocalUi: 'ACAO_CAMPANHA',
          acaoCampanhaUi: { tipoAcao: 'CONTINUAR_RUN_SALVA', payload: {} },
          comandoMotor: null,
          resultadoMotor: null,
        });
      }
      return clonarProfundoCongelado({
        reconhecido: false,
        acaoLocalUi: null,
        comandoMotor: null,
        resultadoMotor: null,
      });
    }

    if (faseAtual === 'FIM_DE_RUN') {
      return clonarProfundoCongelado({
        reconhecido: false,
        acaoLocalUi: null,
        comandoMotor: null,
        resultadoMotor: null,
      });
    }

    if (code === 'KeyU' && (faseAtual === 'MAPA' || faseAtual === 'LOJA' || faseAtual === 'EVENTO')) {
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: 'ACAO_CAMPANHA',
        acaoCampanhaUi: { tipoAcao: 'ABRIR_FECHAR_OFICINA', payload: {} },
        comandoMotor: null,
        resultadoMotor: null,
      });
    }

    if (code === 'Space') {
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: 'ALTERNAR_PAUSA_TATICA',
        pausaTaticaAtiva: !contextoUi.pausaTaticaAtiva,
        comandoMotor: null,
        resultadoMotor: null,
      });
    }

    if (faseAtual === 'EVENTO' && !modalAtivo && (code === 'KeyA' || code === 'KeyB' || code === 'KeyC')) {
      const opcao = code.replace('Key', '');
      const comandoMotor = {
        tipo: 'ESCOLHER_OPCAO_EVENTO',
        payload: {
          opcao,
          idEvento: viewModel?.eventoResumo?.idEvento ?? 'SOS_01',
          categoriaEvento: viewModel?.eventoResumo?.categoria ?? 'SOS',
        },
      };
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: null,
        comandoMotor,
        resultadoMotor: despacharComandoUi(estado, comandoMotor),
      });
    }

    if (faseAtual === 'COMBATE' && code === 'KeyA') {
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: 'ACAO_CAMPANHA',
        acaoCampanhaUi: { tipoAcao: 'ALTERNAR_MODO_DISPARO_ARMA', payload: { slotIndex: 'TODOS' } },
        comandoMotor: null,
        resultadoMotor: null,
      });
    }
    if (faseAtual === 'COMBATE' && code === 'KeyX') {
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: 'ACAO_CAMPANHA',
        acaoCampanhaUi: { tipoAcao: 'DISPARAR_SALVA_MANUAL', payload: { slotIndex: 'TODOS' } },
        comandoMotor: null,
        resultadoMotor: null,
      });
    }
    if (faseAtual === 'COMBATE' && code === 'KeyG') {
      const comandoMotor = montarComandoAtalhoAbordagemDom(estado, contextoUi);
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: null,
        comandoMotor,
        resultadoMotor: despacharComandoUi(estado, comandoMotor),
      });
    }
    if (code === 'KeyD') {
      const comandoMotor = { tipo: 'DRENAR_TUDO', payload: { modoSeguro: true } };
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: null,
        comandoMotor,
        resultadoMotor: despacharComandoUi(estado, comandoMotor),
      });
    }
    if (code === 'KeyB') {
      const camBrq = (estado.naveJogador?.camaras ?? []).find((c) => c.id === 3);
      const barrasLivres = Number(estado.naveJogador?.reator?.barrasDisponiveis ?? 0);
      const brqAloc = Number(camBrq?.barrasEnergiaAlocada ?? camBrq?.energiaAlocada ?? 0);
      const brqInt = Number(camBrq?.barrasIntegridade ?? camBrq?.integridade ?? 1);
      if (eventoInput.shiftKey === true && brqAloc > 0) {
        const comandoMotor = { tipo: 'ALOCAR_ENERGIA', payload: { camaraId: 3, deltaBarras: -1 } };
        return clonarProfundoCongelado({
          reconhecido: true,
          acaoLocalUi: null,
          comandoMotor,
          resultadoMotor: despacharComandoUi(estado, comandoMotor),
        });
      }
      if (barrasLivres === 0 && brqAloc < brqInt) {
        const doadora = [8, 7, 4, 1, 5]
          .map((idC) => (estado.naveJogador?.camaras ?? []).find((c) => c.id === idC))
          .find((c) => c && Number(c.barrasEnergiaAlocada ?? c.energiaAlocada ?? 0) >= 1);
        if (doadora) {
          const passo1 = despacharComandoUi(estado, {
            tipo: 'ALOCAR_ENERGIA',
            payload: { camaraId: doadora.id, deltaBarras: -1 },
          });
          const comandoMotor = { tipo: 'ALOCAR_ENERGIA', payload: { camaraId: 3, deltaBarras: 1 } };
          const passo2 = passo1.aceito ? despacharComandoUi(passo1.estado, comandoMotor) : passo1;
          return clonarProfundoCongelado({
            reconhecido: true,
            acaoLocalUi: null,
            comandoMotor,
            resultadoMotor: passo2,
          });
        }
      }
      const comandoMotor = { tipo: 'ALOCAR_ENERGIA', payload: { camaraId: 3, deltaBarras: 1 } };
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: null,
        comandoMotor,
        resultadoMotor: despacharComandoUi(estado, comandoMotor),
      });
    }
    if (code === 'KeyV') {
      const comandoMotor = { tipo: 'DRENAR_TUDO', payload: { abrirTodas: !todasAbertas } };
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: null,
        comandoMotor,
        resultadoMotor: despacharComandoUi(estado, comandoMotor),
      });
    }
    if (code === 'KeyM') {
      const recolher = estado.naveJogador?.estadoFisico === '1_NO_FOIL';
      const comandoMotor = { tipo: 'MERGULHO_TATICO', payload: { recolherFoil: recolher } };
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: null,
        comandoMotor,
        resultadoMotor: despacharComandoUi(estado, comandoMotor),
      });
    }
    if (code === 'KeyF') {
      const comandoMotor = { tipo: 'SALTO_FUGA', payload: {} };
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: null,
        comandoMotor,
        resultadoMotor: despacharComandoUi(estado, comandoMotor),
      });
    }
    if (code === 'KeyP') {
      const tripulacaoViva = (estado.naveJogador?.tripulacao ?? []).filter(
        (t) => t.localizacao === 'NAVE_JOGADOR' && t.hpAtual > 0 && t.especie === 'BAIACU'
      );
      const baiacuAlvo =
        tripulacaoViva.find((t) => t.id === contextoUi.tripulanteSelecionadoId) ?? tripulacaoViva[0] ?? null;
      const comandoMotor = {
        tipo: 'ATIVAR_BAIACU',
        payload: {
          tripulanteId: baiacuAlvo?.id ?? 'trip-baiacu-1',
          inflado: !(baiacuAlvo?.inflado),
        },
      };
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: null,
        comandoMotor,
        resultadoMotor: despacharComandoUi(estado, comandoMotor),
      });
    }
    if (code === 'KeyE') {
      const comandoMotor = { tipo: 'ATIVAR_PULSO_ENZIMAS', payload: {} };
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: null,
        comandoMotor,
        resultadoMotor: despacharComandoUi(estado, comandoMotor),
      });
    }
    if (code === 'KeyT') {
      const comandoMotor = { tipo: 'ATIVAR_TINTA_FURTIVA', payload: {} };
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: null,
        comandoMotor,
        resultadoMotor: despacharComandoUi(estado, comandoMotor),
      });
    }
    const mDigito = code.match(/^Digit([1-4])$/);
    if (mDigito && faseAtual !== 'EVENTO') {
      const slotIndex = Number(mDigito[1]) - 1;
      return clonarProfundoCongelado({
        reconhecido: true,
        acaoLocalUi: 'SELECIONAR_SLOT_ARMA',
        slotArmaSelecionado: slotIndex,
        modoOrdemAbordagem: false,
        comandoMotor: null,
        resultadoMotor: null,
      });
    }
    return clonarProfundoCongelado({
      reconhecido: false,
      acaoLocalUi: null,
      comandoMotor: null,
      resultadoMotor: null,
    });
  }

  const coord = converterCoordenadaTelaParaNativa(
    eventoInput?.clientX ?? 0,
    eventoInput?.clientY ?? 0,
    eventoInput?.retanguloCanvas
  );
  if (!coord.dentroDoCanvas) {
    return clonarProfundoCongelado({
      reconhecido: false,
      foraDoCanvas: true,
      coordenadaNativa: coord,
      comandoMotor: null,
      resultadoMotor: null,
    });
  }

  const hitboxes = obterMapaHitboxesNativo(viewModel);
  const hb = hitboxes.find(
    (h) =>
      coord.xNativo >= h.x &&
      coord.xNativo < h.x + h.largura &&
      coord.yNativo >= h.y &&
      coord.yNativo < h.y + h.altura
  );

  if (tipoEvento === 'MOUSEMOVE') {
    const ghostPreview = calcularGhostPreviewTermometro(estado, hb?.idHitbox ?? null);
    return clonarProfundoCongelado({
      reconhecido: Boolean(hb),
      foraDoCanvas: false,
      hitboxAtingida: hb?.idHitbox ?? null,
      acaoLocalUi: 'ATUALIZAR_GHOST_PREVIEW',
      ghostPreview,
      coordenadaNativa: coord,
      comandoMotor: null,
      resultadoMotor: null,
    });
  }

  if (!hb) {
    return clonarProfundoCongelado({
      reconhecido: false,
      foraDoCanvas: false,
      coordenadaNativa: coord,
      comandoMotor: null,
      resultadoMotor: null,
    });
  }

  const botaoMouse = eventoInput.botaoMouse ?? eventoInput.button ?? 0;
  let comandoMotor = null;

  if (hb.tipo === 'CONTROLE_CAMPANHA') {
    if (hb.metadados?.acaoCampanha === 'ATALHO_ABORDAGEM_UI') {
      comandoMotor = montarComandoAtalhoAbordagemDom(estado, contextoUi);
      return clonarProfundoCongelado({
        reconhecido: true,
        hitboxAtingida: hb.idHitbox,
        acaoLocalUi: null,
        coordenadaNativa: coord,
        comandoMotor,
        resultadoMotor: despacharComandoUi(estado, comandoMotor),
      });
    }

    // Na Loja (Recife-Forja), o botão de Porão na Oficina VENDE o item por Sucata/Biomassa (Shift+Clique descarta se desejado)
    if (
      hb.metadados?.acaoCampanha === 'DESCARTAR_ITEM_PORAO' &&
      faseAtual === 'LOJA' &&
      eventoInput.shiftKey !== true &&
      hb.metadados.itemId &&
      Number(hb.metadados.valorVenda ?? 0) > 0
    ) {
      comandoMotor = {
        tipo: 'COMPRAR_OU_VENDER_LOJA',
        payload: {
          itemOuSistemaId: hb.metadados.itemId,
          operacao: 'VENDER',
          indicePorao: hb.metadados.indicePorao,
        },
      };
      return clonarProfundoCongelado({
        reconhecido: true,
        hitboxAtingida: hb.idHitbox,
        acaoLocalUi: null,
        coordenadaNativa: coord,
        comandoMotor,
        resultadoMotor: despacharComandoUi(estado, comandoMotor),
      });
    }

    // Na Loja, clique direito (ou Shift+Clique) em GUARDAR ARMA vende a arma dorsal equipada direto na Forja (preservando órgãos!)
    if (
      hb.metadados?.acaoCampanha === 'DESEQUIPAR_ARMA_PARA_PORAO' &&
      faseAtual === 'LOJA' &&
      (botaoMouse === 2 || eventoInput.shiftKey === true) &&
      hb.metadados.chassiId
    ) {
      comandoMotor = {
        tipo: 'COMPRAR_OU_VENDER_LOJA',
        payload: {
          itemOuSistemaId: hb.metadados.chassiId,
          operacao: 'VENDER',
          slotArmaIndex: hb.metadados.slotArmaIndex,
        },
      };
      return clonarProfundoCongelado({
        reconhecido: true,
        hitboxAtingida: hb.idHitbox,
        acaoLocalUi: null,
        coordenadaNativa: coord,
        comandoMotor,
        resultadoMotor: despacharComandoUi(estado, comandoMotor),
      });
    }

    return clonarProfundoCongelado({
      reconhecido: true,
      hitboxAtingida: hb.idHitbox,
      acaoLocalUi: 'ACAO_CAMPANHA',
      acaoCampanhaUi: {
        tipoAcao: hb.metadados.acaoCampanha,
        payload: {
          ...hb.metadados,
          slotArmaIndex: hb.metadados.slotArmaIndex ?? Number(contextoUi.slotArmaSelecionado ?? 0),
        },
      },
      coordenadaNativa: coord,
      comandoMotor: null,
      resultadoMotor: null,
    });
  }

  if (hb.idHitbox === 'BTN_DRENAR_SEGURO') {
    comandoMotor = { tipo: 'DRENAR_TUDO', payload: { modoSeguro: true } };
  } else if (hb.idHitbox === 'BTN_DRENAR_TUDO') {
    comandoMotor = { tipo: 'DRENAR_TUDO', payload: { abrirTodas: !todasAbertas } };
  } else if (hb.idHitbox === 'BTN_MERGULHO_TATICO') {
    const recolher = estado.naveJogador?.estadoFisico === '1_NO_FOIL';
    comandoMotor = { tipo: 'MERGULHO_TATICO', payload: { recolherFoil: recolher } };
  } else if (hb.tipo === 'ACAO_LOJA') {
    if (hb.idHitbox === 'LOJA_DIGESTAO_SUC_BIO') {
      const moedaOrigem = botaoMouse === 2 || eventoInput.shiftKey === true ? 'BIOMASSA' : 'SUCATA';
      comandoMotor = {
        tipo: 'COMPRAR_OU_VENDER_LOJA',
        payload: { itemOuSistemaId: 'DIGESTAO_ENZIMATICA', operacao: 'DIGESTAO_ENZIMATICA', moedaOrigem },
      };
    } else if (hb.idHitbox === 'LOJA_DIGESTAO_BIO_SUC') {
      comandoMotor = {
        tipo: 'COMPRAR_OU_VENDER_LOJA',
        payload: { itemOuSistemaId: 'DIGESTAO_ENZIMATICA', operacao: 'DIGESTAO_ENZIMATICA', moedaOrigem: 'BIOMASSA' },
      };
    } else {
      comandoMotor = {
        tipo: 'COMPRAR_OU_VENDER_LOJA',
        payload: {
          itemOuSistemaId: hb.metadados.itemId,
          operacao: hb.metadados.operacao,
          ...(hb.metadados.indicePorao !== undefined ? { indicePorao: hb.metadados.indicePorao } : {}),
        },
      };
    }
  } else if (hb.tipo === 'ITEM_LOJA') {
    const operacao = botaoMouse === 2 || eventoInput.shiftKey === true ? 'VENDER' : 'COMPRAR';
    comandoMotor = {
      tipo: 'COMPRAR_OU_VENDER_LOJA',
      payload: { itemOuSistemaId: hb.metadados.itemId, operacao },
    };
  } else if (hb.tipo === 'OPCAO_EVENTO') {
    comandoMotor = {
      tipo: 'ESCOLHER_OPCAO_EVENTO',
      payload: {
        opcao: hb.metadados.opcao,
        idEvento: hb.metadados.idEvento,
        categoriaEvento: hb.metadados.categoriaEvento,
      },
    };
  } else if (hb.tipo === 'VALVULA_EXTERNA') {
    comandoMotor = {
      tipo: 'ALTERNAR_VALVULA',
      payload: { camaraId: hb.metadados.camaraId, aberta: !hb.metadados.abertaAtual },
    };
  } else if (hb.tipo === 'SISTEMA_RODAPE') {
    const deltaBarras = botaoMouse === 2 || eventoInput.shiftKey === true ? -1 : 1;
    comandoMotor = {
      tipo: 'ALOCAR_ENERGIA',
      payload: { camaraId: hb.metadados.camaraId, deltaBarras },
    };
  } else if (hb.tipo === 'CARD_TRIPULANTE') {
    if ((botaoMouse === 2 || eventoInput.shiftKey === true) && hb.metadados.especie === 'BAIACU' && hb.metadados.localizacao !== 'BORDO_INIMIGO') {
      comandoMotor = {
        tipo: 'ATIVAR_BAIACU',
        payload: { tripulanteId: hb.metadados.tripulanteId, inflado: !hb.metadados.inflado },
      };
    } else {
      return clonarProfundoCongelado({
        reconhecido: true,
        hitboxAtingida: hb.idHitbox,
        acaoLocalUi: 'SELECIONAR_TRIPULANTE',
        tripulanteSelecionadoId: hb.metadados.tripulanteId,
        modoOrdemAbordagem: hb.metadados.localizacao === 'BORDO_INIMIGO',
        coordenadaNativa: coord,
        comandoMotor: null,
        resultadoMotor: null,
      });
    }
  } else if (hb.tipo === 'CAMARA_BIONAVE') {
    const tripulanteSelecionadoId =
      contextoUi.tripulanteSelecionadoId ?? estado.naveJogador?.tripulacao?.[0]?.id ?? 'trip-polvo-1';
    const tripObj = (estado.naveJogador?.tripulacao ?? []).find((t) => t.id === tripulanteSelecionadoId);
    comandoMotor = {
      tipo: 'MOVER_TRIPULANTE',
      payload: {
        tripulanteId: tripulanteSelecionadoId,
        camaraDestinoId: hb.metadados.camaraId,
        ...(eventoInput.shiftKey === true ? { acopladoBulbo: !(tripObj?.acopladoBulbo) } : {}),
      },
    };
  } else if (hb.tipo === 'SALA_ALVO') {
    const tripSelecionado = (estado.naveJogador?.tripulacao ?? []).find(
      (t) => t.id === contextoUi.tripulanteSelecionadoId && t.localizacao === 'BORDO_INIMIGO' && Number(t.hpAtual ?? 0) > 0
    );
    if (tripSelecionado && (contextoUi.modoOrdemAbordagem === true || botaoMouse === 2)) {
      return clonarProfundoCongelado({
        reconhecido: true,
        hitboxAtingida: hb.idHitbox,
        acaoLocalUi: 'ACAO_CAMPANHA',
        acaoCampanhaUi: {
          tipoAcao: 'MOVER_ABORDO_INIMIGO',
          payload: {
            tripulanteId: tripSelecionado.id,
            salaInimigaDestinoId: hb.metadados.salaId,
          },
        },
        coordenadaNativa: coord,
        comandoMotor: null,
        resultadoMotor: null,
      });
    }

    // Clique direito (sem aliado a bordo selecionado) marca explicitamente a sala alvo da cápsula do Tubo Pressurizado [G]!
    if (botaoMouse === 2) {
      return clonarProfundoCongelado({
        reconhecido: true,
        hitboxAtingida: hb.idHitbox,
        acaoLocalUi: 'SELECIONAR_SALA_ABORDAGEM',
        salaAlvoAbordagemId: hb.metadados.salaId,
        coordenadaNativa: coord,
        comandoMotor: null,
        resultadoMotor: null,
      });
    }

    const slotIndex = Number(contextoUi.slotArmaSelecionado ?? 0);
    const slotObj = estado.naveJogador?.armasAtivas?.[slotIndex];
    const armaSel = slotObj?.arma !== undefined ? slotObj.arma : slotObj;
    const chassiSel = armaSel?.chassiId ?? armaSel?.id ?? null;
    const specSel = CATALOGO_ARMAS_51.find((a) => a.id === chassiSel) ?? null;
    let trincaUsada = Array.isArray(contextoUi.trincaSalasBeam) ? contextoUi.trincaSalasBeam : null;
    if (!trincaUsada && (chassiSel === 'CORTADOR_TERMICO_PLASMA' || specSel?.ehFeixe)) {
      trincaUsada = construirTrincaBeamAssistidaDom(
        estado.alvoCombate,
        hb.metadados.salaId,
        contextoUi.ultimaSalaBeamClicadaId ?? null
      );
    }
    comandoMotor = {
      tipo: 'MIRAR_ARMA',
      payload: {
        slotIndex,
        salaAlvoId: trincaUsada ? trincaUsada[0] : hb.metadados.salaId,
        ...(trincaUsada ? { trincaSalasBeam: trincaUsada } : {}),
      },
    };
    return clonarProfundoCongelado({
      reconhecido: true,
      hitboxAtingida: hb.idHitbox,
      acaoLocalUi: null,
      salaAlvoAbordagemId: hb.metadados.salaId,
      ultimaSalaBeamClicadaId: hb.metadados.salaId,
      trincaSalasBeamCalculada: trincaUsada,
      coordenadaNativa: coord,
      comandoMotor,
      resultadoMotor: despacharComandoUi(estado, comandoMotor),
    });
  } else if (hb.tipo === 'NO_MAPA') {
    comandoMotor = {
      tipo: 'VIAJAR_NO_MAPA',
      payload: {
        idNoDestino: hb.metadados.noDestinoId,
        noDestinoId: hb.metadados.noDestinoId,
      },
    };
  } else {
    if (botaoMouse === 2 && hb.metadados?.ocupado) {
      return clonarProfundoCongelado({
        reconhecido: true,
        hitboxAtingida: hb.idHitbox,
        acaoLocalUi: 'ACAO_CAMPANHA',
        acaoCampanhaUi: {
          tipoAcao: 'ALTERNAR_MODO_DISPARO_ARMA',
          payload: { slotIndex: hb.metadados.slotIndex },
        },
        slotArmaSelecionado: hb.metadados.slotIndex,
        coordenadaNativa: coord,
        comandoMotor: null,
        resultadoMotor: null,
      });
    }
    return clonarProfundoCongelado({
      reconhecido: true,
      hitboxAtingida: hb.idHitbox,
      acaoLocalUi: 'SELECIONAR_SLOT_ARMA',
      slotArmaSelecionado: hb.metadados.slotIndex,
      modoOrdemAbordagem: false,
      coordenadaNativa: coord,
      comandoMotor: null,
      resultadoMotor: null,
    });
  }

  return clonarProfundoCongelado({
    reconhecido: true,
    hitboxAtingida: hb.idHitbox,
    acaoLocalUi: null,
    coordenadaNativa: coord,
    comandoMotor,
    resultadoMotor: despacharComandoUi(estado, comandoMotor),
  });
}
