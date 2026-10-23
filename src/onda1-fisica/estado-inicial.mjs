/**
 * [Onda 1] Fábrica imutável do GameState e das 8 câmaras (Seção 8.1 do Vol. 08 e Seção 5.4 / 5.4.A do Vol. 05).
 * Cumpre estritamente a Lei L2 (Object.freeze recursivo em toda leitura/criação).
 */

export function congelarProfundo(valor) {
  if (valor === null || typeof valor !== 'object') return valor;
  if (Array.isArray(valor)) {
    for (const item of valor) congelarProfundo(item);
    return Object.freeze(valor);
  }
  for (const chave of Object.keys(valor)) {
    congelarProfundo(valor[chave]);
  }
  return Object.freeze(valor);
}

export function clonarCongelado(valor) {
  return congelarProfundo(structuredClone(valor));
}

export const CATALOGO_ARMAS_BASE_PESO = Object.freeze({
  EMISSOR_ACUSTICO_I: { chassiId: 'EMISSOR_ACUSTICO_I', pesoBaseKg: 10.0, energiaCusto: 1, tempoRecargaBaseSeg: 9.0, municaoCusto: 0, soquetesMax: 1 },
  EMISSOR_RAJADA_ACUSTICA_II: { chassiId: 'EMISSOR_RAJADA_ACUSTICA_II', pesoBaseKg: 18.0, energiaCusto: 2, tempoRecargaBaseSeg: 12.0, municaoCusto: 0, soquetesMax: 1 },
  CANHAO_ARPAO_CABO: { chassiId: 'CANHAO_ARPAO_CABO', pesoBaseKg: 15.0, energiaCusto: 2, tempoRecargaBaseSeg: 11.0, municaoCusto: 0, soquetesMax: 2 },
  DISPARADOR_ESTILHACOS_QUITINA: { chassiId: 'DISPARADOR_ESTILHACOS_QUITINA', pesoBaseKg: 22.0, energiaCusto: 2, tempoRecargaBaseSeg: 10.0, municaoCusto: 0, soquetesMax: 1 },
  CORTADOR_TERMICO_PLASMA: { chassiId: 'CORTADOR_TERMICO_PLASMA', pesoBaseKg: 25.0, energiaCusto: 2, tempoRecargaBaseSeg: 14.0, municaoCusto: 0, soquetesMax: 1 },
  LANCADOR_TORPEDO_ABISSAL: { chassiId: 'LANCADOR_TORPEDO_ABISSAL', pesoBaseKg: 28.0, energiaCusto: 2, tempoRecargaBaseSeg: 13.0, municaoCusto: 1, soquetesMax: 2 },
  MORTEIRO_ESPOROS_ACIDOS: { chassiId: 'MORTEIRO_ESPOROS_ACIDOS', pesoBaseKg: 12.0, energiaCusto: 1, tempoRecargaBaseSeg: 10.0, municaoCusto: 1, soquetesMax: 2 },
});

export const HP_MAX_POR_ESPECIE = Object.freeze({
  POLVO: 80,
  ARRAIA: 70,
  BAIACU: 150,
  CARANGUEJO: 110,
});

export const ARQUITETURAS_INICIAIS = Object.freeze({
  CARCACA_ALFA: {
    idArquitetura: 'CARCACA_ALFA',
    hpCascoMax: 30,
    pesoChassiKg: 100.0,
    bonusSustentacaoMastroKg: 0.0,
    reatorCompradoInicial: 6,
    sistemasNivelMax: { 1: 3, 2: 1, 3: 1, 4: 2, 5: 2, 6: 4, 7: 0, 8: 0 },
    energiaInicialAlocada: { 1: 3, 2: 0, 3: 0, 4: 2, 5: 2, 6: 0, 7: 0, 8: 0 },
    subsistemasEnxertados: { 7: null, 8: null },
    armasIniciais: ['CANHAO_ARPAO_CABO', 'EMISSOR_ACUSTICO_I'],
    orgaosIniciaisPorSlot: { 0: [], 1: [] },
    tripulacaoInicial: [
      { id: 'trip-polvo-1', especie: 'POLVO', camaraAtualId: 2, acopladoBulbo: true },
      { id: 'trip-arraia-1', especie: 'ARRAIA', camaraAtualId: 4, acopladoBulbo: true },
      { id: 'trip-baiacu-1', especie: 'BAIACU', camaraAtualId: 5, acopladoBulbo: true },
    ],
  },
  MANTA_VOLT: {
    idArquitetura: 'MANTA_VOLT',
    hpCascoMax: 30,
    pesoChassiKg: 70.0,
    bonusSustentacaoMastroKg: 0.0,
    reatorCompradoInicial: 6,
    sistemasNivelMax: { 1: 3, 2: 1, 3: 1, 4: 2, 5: 2, 6: 4, 7: 0, 8: 0 },
    energiaInicialAlocada: { 1: 2, 2: 0, 3: 1, 4: 2, 5: 2, 6: 0, 7: 0, 8: 0 },
    subsistemasEnxertados: { 7: null, 8: null },
    armasIniciais: ['EMISSOR_ACUSTICO_I', 'EMISSOR_ACUSTICO_I'],
    orgaosIniciaisPorSlot: { 0: ['ELETRO_PLACA_ARRAIA'], 1: [] },
    tripulacaoInicial: [
      { id: 'trip-polvo-1', especie: 'POLVO', camaraAtualId: 2, acopladoBulbo: true },
      { id: 'trip-arraia-1', especie: 'ARRAIA', camaraAtualId: 4, acopladoBulbo: true },
      { id: 'trip-arraia-2', especie: 'ARRAIA', camaraAtualId: 5, acopladoBulbo: true },
    ],
  },
  COURACA_LIMIAR: {
    idArquitetura: 'COURACA_LIMIAR',
    hpCascoMax: 30,
    pesoChassiKg: 100.0,
    bonusSustentacaoMastroKg: 0.0,
    reatorCompradoInicial: 6,
    sistemasNivelMax: { 1: 3, 2: 1, 3: 1, 4: 0, 5: 2, 6: 5, 7: 2, 8: 0 },
    energiaInicialAlocada: { 1: 2, 2: 0, 3: 0, 4: 0, 5: 2, 6: 0, 7: 2, 8: 0 },
    subsistemasEnxertados: { 7: 'TUBO_PRESSURIZADO_ABORDAGEM', 8: null },
    armasIniciais: ['EMISSOR_ACUSTICO_I', 'CANHAO_ARPAO_CABO'],
    orgaosIniciaisPorSlot: { 0: [], 1: [] },
    tripulacaoInicial: [
      { id: 'trip-caranguejo-1', especie: 'CARANGUEJO', camaraAtualId: 7, acopladoBulbo: true },
      { id: 'trip-caranguejo-2', especie: 'CARANGUEJO', camaraAtualId: 2, acopladoBulbo: true },
      { id: 'trip-baiacu-1', especie: 'BAIACU', camaraAtualId: 5, acopladoBulbo: true },
    ],
  },
  SOMBRA_ABISSAL: {
    idArquitetura: 'SOMBRA_ABISSAL',
    hpCascoMax: 20,
    pesoChassiKg: 90.0,
    bonusSustentacaoMastroKg: 0.0,
    reatorCompradoInicial: 6,
    sistemasNivelMax: { 1: 3, 2: 1, 3: 1, 4: 0, 5: 2, 6: 4, 7: 0, 8: 1 },
    energiaInicialAlocada: { 1: 3, 2: 0, 3: 0, 4: 0, 5: 2, 6: 0, 7: 0, 8: 1 },
    subsistemasEnxertados: { 7: null, 8: 'GLANDULA_TINTA_FURTIVA' },
    armasIniciais: ['CANHAO_ARPAO_CABO', 'EMISSOR_ACUSTICO_I'],
    orgaosIniciaisPorSlot: { 0: ['GLANDULA_VENENO_BAIACU'], 1: [] },
    tripulacaoInicial: [
      { id: 'trip-polvo-1', especie: 'POLVO', camaraAtualId: 2, acopladoBulbo: true },
      { id: 'trip-caranguejo-1', especie: 'CARANGUEJO', camaraAtualId: 5, acopladoBulbo: true },
    ],
  },
  COLMEIA_VIVA: {
    idArquitetura: 'COLMEIA_VIVA',
    hpCascoMax: 30,
    pesoChassiKg: 100.0,
    bonusSustentacaoMastroKg: 0.0,
    reatorCompradoInicial: 6,
    sistemasNivelMax: { 1: 3, 2: 1, 3: 2, 4: 2, 5: 2, 6: 4, 7: 0, 8: 0 },
    energiaInicialAlocada: { 1: 3, 2: 0, 3: 0, 4: 2, 5: 2, 6: 0, 7: 0, 8: 0 },
    subsistemasEnxertados: { 7: null, 8: null },
    armasIniciais: ['EMISSOR_RAJADA_ACUSTICA_II', 'MORTEIRO_ESPOROS_ACIDOS'],
    orgaosIniciaisPorSlot: { 0: [], 1: [] },
    tripulacaoInicial: [
      { id: 'trip-baiacu-1', especie: 'BAIACU', camaraAtualId: 2, acopladoBulbo: true },
      { id: 'trip-baiacu-2', especie: 'BAIACU', camaraAtualId: 5, acopladoBulbo: true },
      { id: 'trip-arraia-1', especie: 'ARRAIA', camaraAtualId: 4, acopladoBulbo: true },
    ],
  },
});

const DEFINICAO_CAMARAS = Object.freeze([
  { id: 1, nome: 'ARTILHARIA_DORSAL', tipoSlot: 'SISTEMA_BASE' },
  { id: 2, nome: 'CORTEX_NAVEGACAO', tipoSlot: 'SISTEMA_BASE' },
  { id: 3, nome: 'BOMBA_BRANQUIAL', tipoSlot: 'SISTEMA_BASE' },
  { id: 4, nome: 'GLANDULA_BARREIRA', tipoSlot: 'SISTEMA_BASE' },
  { id: 5, nome: 'SIFAO_PROPULSAO', tipoSlot: 'SISTEMA_BASE' },
  { id: 6, nome: 'POCO_DA_QUILHA_MASTRO', tipoSlot: 'SISTEMA_BASE' },
  { id: 7, nome: 'CAMARA_ENXERTO_A', tipoSlot: 'SUBSISTEMA_ENXERTO' },
  { id: 8, nome: 'CAMARA_ENXERTO_B', tipoSlot: 'SUBSISTEMA_ENXERTO' },
]);

export function criarCamarasIniciais(idArquitetura = 'CARCACA_ALFA') {
  const arq = ARQUITETURAS_INICIAIS[idArquitetura] ?? ARQUITETURAS_INICIAIS.CARCACA_ALFA;
  const camaras = DEFINICAO_CAMARAS.map((def) => {
    const nivelMaxBarras = arq.sistemasNivelMax[def.id] ?? 0;
    const barrasEnergiaAlocada = arq.energiaInicialAlocada[def.id] ?? 0;
    return {
      id: def.id,
      nome: def.nome,
      tipoSlot: def.tipoSlot,
      subsistemaInstalado: arq.subsistemasEnxertados[def.id] ?? null,
      nivelMaxBarras,
      barrasIntegridade: nivelMaxBarras,
      barrasEnergiaAlocada,
      aguaKg: 12.5,
      alagamentoPesadoKg: 0.0,
      oxigenioPct: 100.0,
      rombosCasco: 0,
      progressoReparoRomboSeg: 0.0,
      progressoReparoSistemaSeg: 0.0,
      valvulaExternaAberta: false,
      curtoCircuitoAtivo: false,
      progressoExtincaoSecoSeg: 0.0,
      progressoDanoCurtoSeg: 0.0,
      progressoReparoCurtoSeg: 0.0,
      tempoParalisiaIonSeg: 0.0,
      isolamentoResidualChoqueSeg: 0.0,
      baiacuInfladoId: null,
    };
  });
  return congelarProfundo(camaras);
}

/**
 * Cria uma instância imutável e completa do GameState (Seção 8.1 do Vol. 08).
 */
export function criarEstadoInicialPartida(arg1 = {}, arg2 = 'CARCACA_ALFA') {
  const opcoes =
    typeof arg1 === 'string'
      ? { seedPartida: arg1, idArquitetura: arg2 }
      : arg1 ?? {};
  const {
    idArquitetura = 'CARCACA_ALFA',
    seedPartida = 'biofoil-setor1-0001',
    faseJogo = 'COMBATE',
    setorNumero = 1,
    biomaId = 'SETOR_1_ATOIS_RASOS',
  } = opcoes;
  const arq = ARQUITETURAS_INICIAIS[idArquitetura];
  if (!arq) {
    throw new Error(`[criarEstadoInicialPartida] Arquitetura desconhecida: "${idArquitetura}"`);
  }

  const camaras = criarCamarasIniciais(idArquitetura);
  const armasAtivas = [0, 1, 2, 3].map((slotIndex) => {
    const chassiId = arq.armasIniciais[slotIndex] ?? null;
    if (!chassiId) return { slotIndex, arma: null };
    const spec = CATALOGO_ARMAS_BASE_PESO[chassiId];
    return {
      slotIndex,
      arma: {
        chassiId: spec.chassiId,
        pesoBaseKg: spec.pesoBaseKg,
        energiaCusto: spec.energiaCusto,
        energiaAlocada: spec.energiaCusto,
        tempoRecargaBaseSeg: spec.tempoRecargaBaseSeg,
        progressoRecargaSeg: 0.0,
        municaoCusto: spec.municaoCusto,
        soquetesMax: spec.soquetesMax,
        orgaosEnxertados: [...(arq.orgaosIniciaisPorSlot[slotIndex] ?? [])],
        salaAlvoId: null,
        trincaSalasBeam: null,
      },
    };
  });

  const tripulacao = arq.tripulacaoInicial.map((t) => ({
    id: t.id,
    especie: t.especie,
    hpAtual: HP_MAX_POR_ESPECIE[t.especie],
    hpMax: HP_MAX_POR_ESPECIE[t.especie],
    camaraAtualId: t.camaraAtualId,
    camaraDestinoId: null,
    progressoNadoSeg: 0.0,
    acopladoBulbo: t.acopladoBulbo,
    inflado: false,
    atordoadoSeg: 0.0,
    localizacao: 'NAVE_JOGADOR',
  }));

  const barrasBonusArraias = tripulacao.filter((t) => t.especie === 'ARRAIA').length;
  const barrasDisponiveis = arq.reatorCompradoInicial + barrasBonusArraias;

  const estado = {
    meta: {
      versaoContrato: '1.0.0',
      seedPartida,
      tickAtual: 0,
      tempoCombateSeg: 0.0,
      faseJogo,
    },
    economia: {
      sucata: 30,
      biomassa: 15,
      combustivel: 12,
      municao: 8,
    },
    naveJogador: {
      idArquitetura: arq.idArquitetura,
      hpCascoAtual: arq.hpCascoMax,
      hpCascoMax: arq.hpCascoMax,
      pesoChassiKg: arq.pesoChassiKg,
      bonusSustentacaoMastroKg: arq.bonusSustentacaoMastroKg,
      nivelBlindagem: 0,
      reator: {
        barrasCompradas: arq.reatorCompradoInicial,
        barrasBonusArraias,
        barrasDisponiveis,
      },
      estadoFisico: '1_NO_FOIL',
      mergulhoTaticoAtivo: false,
      tempoSpoolUpExigidoSeg: 3.0,
      progressoSpoolUpSeg: 0.0,
      tempoTouchdownContinuoSeg: 0.0,
      regeneracoesColmeiaNestaLuta: 0,
      pesoVirtualArrastoKg: 0.0,
      progressoFugaSeg: 0.0,
      pulsoEnzimasAtivoSeg: 0.0,
      recargaPulsoEnzimasSeg: 0.0,
      furtividadeAtivaSeg: 0.0,
      recargaFurtividadeSeg: 0.0,
      camadasBarreiraAtivas: arq.sistemasNivelMax[4] >= 2 ? 1 : 0,
      progressoRegenBarreiraSeg: 0.0,
      recargaTuboAbordagemSeg: 0.0,
      camaras,
      armasAtivas,
      poraoCarga: [
        { slotIndex: 0, item: null },
        { slotIndex: 1, item: null },
        { slotIndex: 2, item: null },
        { slotIndex: 3, item: null },
      ],
      tripulacao,
    },
    alvoCombate: {
      ativo: true,
      classeAlvo: 'BARCO_HUMANO',
      idInimigo: 'LANCHA_PATRULHEIRA_S1',
      hpCascoAtual: 8,
      hpCascoMax: 8,
      esquivaBasePct: 10,
      camadasBarreiraAtivas: 0,
      faseChefe: null,
      blindagemTermicaExternaPts: 0,
      timerSurgeSeg: 0.0,
      alarmeFervuraAtivoSeg: 0.0,
      fervuraAtivaSeg: 0.0,
      iaBackupAtiva: false,
      canalVisibilidadeSonar: 'VISIVEL',
      salasOuOrgaos: [
        { id: 1, nome: 'CABINE_COMANDO', submersa: false, integridadeMax: 1, integridadeAtual: 1, aguaKg: 0.0, bombaPoraoAtiva: false, cegoTintaSeg: 0.0, paralisiaIonSeg: 0.0, isolamentoResidualChoqueSeg: 0.0, tripulantes: [{ id: 'mar-1', especie: 'MARINHEIRO', hpAtual: 100, hpMax: 100 }] },
        { id: 2, nome: 'TORRETA_CONVES', submersa: false, integridadeMax: 2, integridadeAtual: 2, aguaKg: 0.0, bombaPoraoAtiva: false, cegoTintaSeg: 0.0, paralisiaIonSeg: 0.0, isolamentoResidualChoqueSeg: 0.0, tripulantes: [] },
        { id: 3, nome: 'CASA_DE_MAQUINAS_MOTOR', submersa: true, integridadeMax: 2, integridadeAtual: 2, aguaKg: 0.0, bombaPoraoAtiva: true, cegoTintaSeg: 0.0, paralisiaIonSeg: 0.0, isolamentoResidualChoqueSeg: 0.0, tripulantes: [{ id: 'mar-2', especie: 'MARINHEIRO', hpAtual: 100, hpMax: 100 }] },
        { id: 4, nome: 'TUBO_DE_TORPEDO', submersa: true, integridadeMax: 1, integridadeAtual: 1, aguaKg: 0.0, bombaPoraoAtiva: false, cegoTintaSeg: 0.0, paralisiaIonSeg: 0.0, isolamentoResidualChoqueSeg: 0.0, tripulantes: [] },
      ],
    },
    projeteisEmVoo: [],
    mapaSetorial: {
      setorNumero,
      biomaId,
      relogioHoras: 0.0,
      frenteCorporacaoMn: 0.0,
      noAtualId: 'NO_0_ENTRADA',
      nos: [],
      rotas: [],
    },
    telemetriaN4: {
      ultimoTickCamarasExaminadas: 8,
      ultimoTickTripulantesExaminados: tripulacao.length,
      ultimoTickSalasInimigasExaminadas: 4,
    },
    logDeterministico: [],
  };

  return congelarProfundo(estado);
}
