/**
 * [Onda 3] Abordagem (Tubo Pressurizado / Modo Parasita), Resolução de Impacto no Alvo e as 3 Condições de Vitória.
 * Implementa as regras das Seções 1.4, 3.1..3.4, 5.1, 5.2, 5.6.C e 8.4 (Junção N1 Onda 2 <-> Onda 3).
 */

import { congelarProfundo } from '../onda1-fisica/estado-inicial.mjs';
import { CONSTANTES_SISTEMAS_ARMAS } from '../onda2-combate/tick-sistemas-armas.mjs';

export const CURVA_SAQUE_SETORIAL_56C = Object.freeze({
  1: Object.freeze({ barcoBrutoSucata: 12, barcoCapturaSucata: 25, monstroBrutoBio: 15, monstroBrutoBiomassa: 15, monstroExtracaoBio: 25, monstroCirurgicoBiomassa: 25, monstroExtracaoSucata: 5, combPadrao: 2, combCaptura: 3, munPadrao: 1, munCaptura: 2 }),
  2: Object.freeze({ barcoBrutoSucata: 16, barcoCapturaSucata: 33, monstroBrutoBio: 19, monstroBrutoBiomassa: 19, monstroExtracaoBio: 33, monstroCirurgicoBiomassa: 33, monstroExtracaoSucata: 6, combPadrao: 2, combCaptura: 3, munPadrao: 1, munCaptura: 2 }),
  3: Object.freeze({ barcoBrutoSucata: 20, barcoCapturaSucata: 41, monstroBrutoBio: 23, monstroBrutoBiomassa: 23, monstroExtracaoBio: 41, monstroCirurgicoBiomassa: 41, monstroExtracaoSucata: 8, combPadrao: 2, combCaptura: 3, munPadrao: 1, munCaptura: 2 }),
  4: Object.freeze({ barcoBrutoSucata: 24, barcoCapturaSucata: 49, monstroBrutoBio: 27, monstroBrutoBiomassa: 27, monstroExtracaoBio: 49, monstroCirurgicoBiomassa: 49, monstroExtracaoSucata: 10, combPadrao: 2, combCaptura: 3, munPadrao: 1, munCaptura: 2 }),
  5: Object.freeze({ barcoBrutoSucata: 28, barcoCapturaSucata: 57, monstroBrutoBio: 31, monstroBrutoBiomassa: 31, monstroExtracaoBio: 57, monstroCirurgicoBiomassa: 57, monstroExtracaoSucata: 12, combPadrao: 2, combCaptura: 3, munPadrao: 1, munCaptura: 2 }),
  6: Object.freeze({ barcoBrutoSucata: 32, barcoCapturaSucata: 65, monstroBrutoBio: 35, monstroBrutoBiomassa: 35, monstroExtracaoBio: 65, monstroCirurgicoBiomassa: 65, monstroExtracaoSucata: 15, combPadrao: 2, combCaptura: 3, munPadrao: 1, munCaptura: 2 }),
  7: Object.freeze({ barcoBrutoSucata: 36, barcoCapturaSucata: 73, monstroBrutoBio: 39, monstroBrutoBiomassa: 39, monstroExtracaoBio: 73, monstroCirurgicoBiomassa: 73, monstroExtracaoSucata: 18, combPadrao: 2, combCaptura: 3, munPadrao: 1, munCaptura: 2 }),
  8: Object.freeze({ barcoBrutoSucata: 40, barcoCapturaSucata: 81, monstroBrutoBio: 43, monstroBrutoBiomassa: 43, monstroExtracaoBio: 81, monstroCirurgicoBiomassa: 81, monstroExtracaoSucata: 0, combPadrao: 0, combCaptura: 0, munPadrao: 0, munCaptura: 0 }),
});

/**
 * Junção N1 Onda 2 <-> Onda 3: resolve o impacto de um disparo de arma, cápsula do Tubo Pressurizado
 * ou Sabotagem Interna sobre uma sala/órgão do alvo inimigo.
 *
 * Regras críticas validadas por mutação:
 * - MUT-O3-01: Arma sem munição (municaoCusto === 0) NUNCA atravessa Barreira ativa (consome 1 bolha e causa 0 dano).
 * - MUT-O3-02: Se o casco inimigo zerar por SABOTAGEM_INTERNA, ocorre Naufrágio Controlado e os animais aliados a bordo sobrevivem.
 *              Se zerar por DISPARO_EXTERNO, a explosão do casco mata os animais aliados ainda a bordo.
 * - Falha Encontrada 2 (Vol. 03): furo em sala superior seca de barco humano não inunda com água do mar (só inunda se submersa
 *   ou se a arma tiver BEXIGA_PRESSAO / TUBO_PRESSURIZADO que injeta +15 kg).
 */
export function resolverImpactoNoAlvo(estado, evento) {
  if (!Object.isFrozen(estado)) {
    throw new Error('[Lei L2] resolverImpactoNoAlvo exige estado de entrada congelado (Object.freeze)');
  }
  const proximo = structuredClone(estado);
  const alvo = proximo.alvoCombate;
  if (!alvo || alvo.ativo === false) return congelarProfundo(proximo);
  alvo.classeAlvo = alvo.classeAlvo ?? alvo.classeInimigo ?? 'BARCO_HUMANO';
  alvo.classeInimigo = alvo.classeAlvo;
  alvo.camadasBarreiraAtivas = Number(alvo.camadasBarreiraAtivas ?? alvo.barreiraBolhasAtual ?? 0);
  alvo.barreiraBolhasAtual = alvo.camadasBarreiraAtivas;

  const tipoEvento = evento.tipo ?? 'DISPARO_ARMA';
  const sala = alvo.salasOuOrgaos.find((s) => s.id === evento.salaAlvoId);
  if (!sala) {
    throw new Error(`[resolverImpactoNoAlvo] Sala alvo inexistente: ${evento.salaAlvoId}`);
  }
  sala.integridadeAtual = sala.integridadeAtual ?? sala.integridade ?? sala.integridadeMax ?? sala.barrasMax ?? 1;
  sala.integridade = sala.integridadeAtual;

  // 1. Blindagem Térmica Externa da Fase 3 (10 pts): bloqueia tudo até zerar
  if (Number(alvo.blindagemTermicaExternaPts ?? 0) > 0) {
    if (tipoEvento === 'CAPSULA_TUBO_PRESSURIZADO') {
      proximo.logDeterministico.push({
        tick: proximo.meta.tickAtual,
        tipo: 'ABORDAGEM_BLOQUEADA_BLINDAGEM_TERMICA',
      });
      return congelarProfundo(proximo);
    }
    const ptsAbsorvidos = evento.ehBeam ? 2 * (evento.salasCortadas ?? 3) : Number(evento.danoCasco ?? 1);
    alvo.blindagemTermicaExternaPts = Math.max(0, alvo.blindagemTermicaExternaPts - ptsAbsorvidos);
    return congelarProfundo(proximo);
  }

  // 2. Cápsula do Tubo Pressurizado de Abordagem (atravessa Barreira comum)
  if (tipoEvento === 'CAPSULA_TUBO_PRESSURIZADO') {
    const ids = evento.tripulantesIds ?? [];
    for (const idTrip of ids) {
      const t = proximo.naveJogador.tripulacao.find((x) => x.id === idTrip);
      if (t && t.hpAtual > 0 && t.localizacao === 'NAVE_JOGADOR') {
        t.localizacao = 'BORDO_INIMIGO';
        t.salaInimigaId = sala.id;
        t.modoParasita = alvo.classeAlvo === 'MONSTRO_MARINHO';
        t.acopladoBulbo = false;
      }
    }
    if (alvo.classeAlvo === 'BARCO_HUMANO') {
      sala.aguaKg = Math.min(27.5, (sala.aguaKg ?? 0.0) + 15.0);
    }
    return congelarProfundo(proximo);
  }

  // 3. Sabotagem Interna por animal invasor a bordo (quebra barra de sistema e causa 1 dano estrutural sem explodir a nave)
  if (tipoEvento === 'SABOTAGEM_INTERNA') {
    if (sala.integridadeAtual > 0) {
      sala.integridadeAtual -= 1;
      sala.integridade = sala.integridadeAtual;
      alvo.hpCascoAtual = Math.max(0, alvo.hpCascoAtual - 1);
      alvo.ultimoDanoFonte = 'SABOTAGEM_INTERNA';
    }
    return congelarProfundo(proximo);
  }

  // 4. Disparo de Arma Externa: verifica Barreira (MUT-O3-01)
  const consomeMunicao = Number(evento.municaoCusto ?? 0) > 0;
  if (!consomeMunicao && Number(alvo.camadasBarreiraAtivas ?? 0) > 0) {
    alvo.camadasBarreiraAtivas -= 1;
    alvo.barreiraBolhasAtual = alvo.camadasBarreiraAtivas;
    proximo.logDeterministico.push({
      tick: proximo.meta.tickAtual,
      tipo: 'DISPARO_BLOQUEADO_BARREIRA',
      chassiId: evento.chassiId ?? 'ARMA_SEM_MUNICAO',
    });
    return congelarProfundo(proximo);
  }

  // Aplica dano de casco, dano de sistema e dano antipessoal (15 HP por ponto de dano de sistema)
  const orgaos = evento.orgaosEnxertados ?? [];
  const temGlandulaBaiacu = orgaos.includes('GLANDULA_BAIACU') || orgaos.includes('GLANDULA_VENENO_BAIACU');
  const temDenteLeviata = orgaos.includes('DENTE_LEVIATA') || orgaos.includes('DENTE_SERRILHADO_LEVIATA');
  const danoCascoBruto = Number(evento.danoCasco ?? 1);
  const danoCasco = Math.max(0, danoCascoBruto - (temGlandulaBaiacu ? 1 : 0));
  const bonusSistemaSemEscudo = temDenteLeviata && Number(alvo.camadasBarreiraAtivas ?? 0) === 0 ? 1 : 0;
  const danoSistema = Number(evento.danoSistema ?? danoCascoBruto) + bonusSistemaSemEscudo;
  alvo.hpCascoAtual = Math.max(0, alvo.hpCascoAtual - danoCasco);
  alvo.ultimoDanoFonte = 'DISPARO_EXTERNO';
  sala.integridadeAtual = Math.max(0, sala.integridadeAtual - danoSistema);
  sala.integridade = sala.integridadeAtual;

  const danoAntipessoal = danoSistema * CONSTANTES_SISTEMAS_ARMAS.DANO_ANTIPESSOAL_POR_PONTO_SISTEMA_HP;
  if (danoAntipessoal > 0) {
    for (const t of sala.tripulantes ?? []) {
      if (t.hpAtual > 0) {
        t.hpAtual = Math.max(0, t.hpAtual - danoAntipessoal);
      }
    }
  }

  // Rombo e inundação (Falha Encontrada 2: sala superior só inunda se tiver BEXIGA_PRESSAO; sala submersa abre rombo submerso)
  if (orgaos.includes('BEXIGA_ALTA_PRESSAO')) {
    if (alvo.classeAlvo === 'BARCO_HUMANO') {
      sala.aguaKg = Math.min(27.5, (sala.aguaKg ?? 0.0) + 15.0);
    } else {
      alvo.reducaoEsquivaBexigaSeg = 5.0;
      alvo.penalidadeEsquivaBexigaSeg = 5.0;
      alvo.esquivaEfetivaPct = Math.max(0, Number(alvo.esquivaBasePct ?? 20) - 15);
    }
    for (const t of sala.tripulantes ?? []) {
      if (t.hpAtual > 0) t.atordoadoSeg = 2.0;
    }
  }
  if (evento.abreRombo && sala.submersa && alvo.classeAlvo === 'BARCO_HUMANO') {
    sala.rombosSubmersos = (sala.rombosSubmersos ?? 0) + 1;
  }

  // Órgãos de enxerto: Eletro-Placa (respeita Isolamento Residual de 5s!), Bolsa de Tinta, Glândula de Baiacu e Termofílica
  if (orgaos.includes('ELETRO_PLACA_ARRAIA') && Number(sala.isolamentoResidualChoqueSeg ?? 0) === 0) {
    sala.paralisiaIonSeg = 6.0;
    sala.tempoRestanteIonSeg = 6.0;
  }
  if (orgaos.includes('BOLSA_TINTA_ABISSAL')) {
    sala.cegoTintaSeg = 8.0;
    sala.cegueiraTintaSeg = 8.0;
  }
  if (temGlandulaBaiacu) {
    sala.venenoToxinaSeg = 10.0;
    for (const t of sala.tripulantes ?? []) {
      if (t.hpAtual > 0) t.venenoToxinaSeg = 10.0;
    }
  }
  if (orgaos.includes('GLANDULA_TERMOFILICA')) {
    sala.fervuraTermofilicaSeg = 8.0;
  }

  if (Array.isArray(alvo.tripulacaoInimiga)) {
    const porId = new Map();
    for (const s of alvo.salasOuOrgaos ?? []) {
      for (const t of s.tripulantes ?? []) porId.set(t.id, t);
    }
    alvo.tripulacaoInimiga = alvo.tripulacaoInimiga.map((h) =>
      porId.has(h.id) ? { ...h, hpAtual: porId.get(h.id).hpAtual } : h
    );
  }

  // MUT-O3-02: Se um DISPARO_EXTERNO zerou o casco inimigo, a explosão mata animais aliados que ainda estavam a bordo!
  if (alvo.hpCascoAtual === 0 && alvo.ultimoDanoFonte === 'DISPARO_EXTERNO') {
    for (const ali of proximo.naveJogador.tripulacao) {
      if (ali.localizacao === 'BORDO_INIMIGO') {
        ali.hpAtual = 0;
      }
    }
  }

  return congelarProfundo(proximo);
}

/**
 * Regra de Via Única do Tubo Pressurizado (MUT-O3-03):
 * - Tentar recolher animal invasor durante COMBATE ativo é proibido.
 * - Se o jogador executar SALTO_FUGA, todos os animais com localizacao === 'BORDO_INIMIGO' são perdidos.
 */
export function tentarRecolherAbordagemEmCombate(estado) {
  if (!Object.isFrozen(estado)) {
    throw new Error('[Lei L2] tentarRecolherAbordagemEmCombate exige estado congelado');
  }
  if (estado.meta.faseJogo === 'COMBATE' && estado.alvoCombate?.ativo) {
    const copia = structuredClone(estado);
    copia.logDeterministico.push({
      tick: estado.meta.tickAtual,
      tipo: 'RECOLHIMENTO_NEGADO_VIA_UNICA',
      motivo: 'TUBO_PRESSURIZADO_VIA_UNICA_ATE_ATRACAR',
    });
    return congelarProfundo(copia);
  }
  return estado;
}

export function executarFugaAbandonandoAbordagem(estado) {
  if (!Object.isFrozen(estado)) {
    throw new Error('[Lei L2] executarFugaAbandonandoAbordagem exige estado congelado');
  }
  const proximo = structuredClone(estado);
  proximo.naveJogador.tripulacao = proximo.naveJogador.tripulacao.filter(
    (t) => t.localizacao !== 'BORDO_INIMIGO'
  );
  proximo.alvoCombate.ativo = false;
  proximo.meta.faseJogo = 'MAPA';
  return congelarProfundo(proximo);
}

/**
 * Junção N1 Onda 2 <-> Onda 3: avalia as 3 Condições de Vitória (DESTRUICAO_BRUTA, CAPTURA_INTACTA, EXTRACAO_CIRURGICA),
 * calcula a recompensa exata pela Tabela 5.6.C e executa o Atracar resgatando os animais vivos a bordo (inclusive em Naufrágio Controlado).
 */
export function avaliarCondicaoDeVitoria(estado) {
  if (!Object.isFrozen(estado)) {
    throw new Error('[Lei L2] avaliarCondicaoDeVitoria exige estado de entrada congelado (Object.freeze)');
  }
  const alvo = estado.alvoCombate;
  if (!alvo || alvo.ativo === false) {
    return congelarProfundo({ encerrado: false, modalidade: null, recompensa: null, animaisResgatadosIds: [] });
  }
  const classeAlvo = alvo.classeAlvo ?? alvo.classeInimigo ?? 'BARCO_HUMANO';

  const setor = Math.min(8, Math.max(1, Number(alvo.setorNumero ?? estado.mapaSetorial?.setorNumero ?? 1)));
  const linhaSaque = CURVA_SAQUE_SETORIAL_56C[setor];

  let modalidade = null;
  if (alvo.hpCascoAtual <= 0) {
    modalidade = 'DESTRUICAO_BRUTA';
  } else if (classeAlvo === 'BARCO_HUMANO') {
    const listaTripulantes = alvo.tripulacaoInimiga
      ?? (alvo.salasOuOrgaos ?? []).flatMap((s) => s.tripulantes ?? []);
    const humanosVivos = listaTripulantes.filter((t) => t.hpAtual > 0).length;
    if (humanosVivos === 0) {
      modalidade = 'CAPTURA_INTACTA';
    }
  } else if (classeAlvo === 'MONSTRO_MARINHO') {
    const ganglio = (alvo.salasOuOrgaos ?? []).find((s) => /GANGLIO/i.test(s.nome));
    if (ganglio && (ganglio.integridadeAtual ?? ganglio.integridade ?? 1) <= 0 && alvo.hpCascoAtual > 0) {
      modalidade = 'EXTRACAO_CIRURGICA';
    }
  }

  if (!modalidade) {
    return congelarProfundo({ encerrado: false, modalidade: null, recompensa: null, animaisResgatadosIds: [] });
  }

  let recompensa;
  if (classeAlvo === 'BARCO_HUMANO') {
    if (modalidade === 'CAPTURA_INTACTA') {
      recompensa = {
        sucata: linhaSaque.barcoCapturaSucata,
        biomassa: 0,
        combustivel: linhaSaque.combCaptura,
        municao: linhaSaque.munCaptura,
        orgaoExtraido: null,
      };
    } else {
      recompensa = {
        sucata: linhaSaque.barcoBrutoSucata,
        biomassa: 0,
        combustivel: linhaSaque.combPadrao,
        municao: linhaSaque.munPadrao,
        orgaoExtraido: null,
      };
    }
  } else {
    if (modalidade === 'EXTRACAO_CIRURGICA') {
      recompensa = {
        sucata: linhaSaque.monstroExtracaoSucata,
        biomassa: linhaSaque.monstroExtracaoBio,
        combustivel: linhaSaque.combPadrao,
        municao: linhaSaque.munPadrao,
        orgaoExtraido: 'ORGAO_INTACTO_GARANTIDO',
      };
    } else {
      recompensa = {
        sucata: 0,
        biomassa: linhaSaque.monstroBrutoBio,
        combustivel: linhaSaque.combPadrao,
        municao: linhaSaque.munPadrao,
        orgaoExtraido: null,
      };
    }
  }

  // No Atracar (vitória ou Naufrágio Controlado por Sabotagem Interna), os animais vivos a bordo retornam à nave
  const animaisResgatadosIds = estado.naveJogador.tripulacao
    .filter((t) => t.localizacao === 'BORDO_INIMIGO' && t.hpAtual > 0)
    .map((t) => t.id);

  return congelarProfundo({
    encerrado: true,
    modalidade,
    recompensa,
    animaisResgatadosIds,
  });
}
