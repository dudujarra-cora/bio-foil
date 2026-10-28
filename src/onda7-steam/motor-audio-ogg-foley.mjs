/**
 * Bio-Foil — Edição Comercial Steam (Onda 7)
 * Módulo: Motor de Áudio Adaptativo `.ogg` (Vertical Remixing Explore <-> Combat)
 * + 16 Amostras de Foley Hidroacústico `.ogg` + Filtro Subaquático WebAudio de 400 Hz.
 * Isomórfico (Browser WebAudio + inspeção determinística em Node).
 */

export const FREQ_CORTE_SUPERFICIE_HZ = 20000;
export const FREQ_CORTE_TOUCHDOWN_CASCO_HZ = 7200;
export const FREQ_CORTE_PAUSA_TATICA_HZ = 950;
export const FREQ_CORTE_SUBMERSO_400HZ = 400;

export const MANIFESTO_TRILHAS_OGG_STEAM = Object.freeze({
  HANGAR: { id: 'HANGAR', arquivo: 'music_hangar_theme.ogg', url: '/assets/audio/music_hangar_theme.ogg', duracaoAlvoSeg: 80, loop: true },
  LOJA_RECIFE: { id: 'LOJA_RECIFE', arquivo: 'music_reef_forge_shop.ogg', url: '/assets/audio/music_reef_forge_shop.ogg', duracaoAlvoSeg: 67, loop: true },
  ZONA1_EXPLORE: { id: 'ZONA1_EXPLORE', arquivo: 'music_zone1_explore.ogg', url: '/assets/audio/music_zone1_explore.ogg', duracaoAlvoSeg: 71, loop: true },
  ZONA1_COMBAT: { id: 'ZONA1_COMBAT', arquivo: 'music_zone1_combat.ogg', url: '/assets/audio/music_zone1_combat.ogg', duracaoAlvoSeg: 71, loop: true },
  BIOMA_S2_EXPLORE: { id: 'BIOMA_S2_EXPLORE', arquivo: 'music_biome_s2_explore.ogg', url: '/assets/audio/music_biome_s2_explore.ogg', duracaoAlvoSeg: 75, loop: true },
  BIOMA_S2_COMBAT: { id: 'BIOMA_S2_COMBAT', arquivo: 'music_biome_s2_combat.ogg', url: '/assets/audio/music_biome_s2_combat.ogg', duracaoAlvoSeg: 75, loop: true },
  BIOMA_S3_EXPLORE: { id: 'BIOMA_S3_EXPLORE', arquivo: 'music_biome_s3_explore.ogg', url: '/assets/audio/music_biome_s3_explore.ogg', duracaoAlvoSeg: 69, loop: true },
  BIOMA_S3_COMBAT: { id: 'BIOMA_S3_COMBAT', arquivo: 'music_biome_s3_combat.ogg', url: '/assets/audio/music_biome_s3_combat.ogg', duracaoAlvoSeg: 69, loop: true },
  ZONA2_EXPLORE: { id: 'ZONA2_EXPLORE', arquivo: 'music_zone2_explore.ogg', url: '/assets/audio/music_zone2_explore.ogg', duracaoAlvoSeg: 67, loop: true },
  ZONA2_COMBAT: { id: 'ZONA2_COMBAT', arquivo: 'music_zone2_combat.ogg', url: '/assets/audio/music_zone2_combat.ogg', duracaoAlvoSeg: 67, loop: true },
  BIOMA_S5_EXPLORE: { id: 'BIOMA_S5_EXPLORE', arquivo: 'music_biome_s5_explore.ogg', url: '/assets/audio/music_biome_s5_explore.ogg', duracaoAlvoSeg: 65, loop: true },
  BIOMA_S5_COMBAT: { id: 'BIOMA_S5_COMBAT', arquivo: 'music_biome_s5_combat.ogg', url: '/assets/audio/music_biome_s5_combat.ogg', duracaoAlvoSeg: 65, loop: true },
  ZONA3_EXPLORE: { id: 'ZONA3_EXPLORE', arquivo: 'music_zone3_explore.ogg', url: '/assets/audio/music_zone3_explore.ogg', duracaoAlvoSeg: 62, loop: true },
  ZONA3_COMBAT: { id: 'ZONA3_COMBAT', arquivo: 'music_zone3_combat.ogg', url: '/assets/audio/music_zone3_combat.ogg', duracaoAlvoSeg: 62, loop: true },
  BIOMA_S7_EXPLORE: { id: 'BIOMA_S7_EXPLORE', arquivo: 'music_biome_s7_explore.ogg', url: '/assets/audio/music_biome_s7_explore.ogg', duracaoAlvoSeg: 60, loop: true },
  BIOMA_S7_COMBAT: { id: 'BIOMA_S7_COMBAT', arquivo: 'music_biome_s7_combat.ogg', url: '/assets/audio/music_biome_s7_combat.ogg', duracaoAlvoSeg: 60, loop: true },
  BIOMA_S8_EXPLORE: { id: 'BIOMA_S8_EXPLORE', arquivo: 'music_biome_s8_explore.ogg', url: '/assets/audio/music_biome_s8_explore.ogg', duracaoAlvoSeg: 58, loop: true },
  BIOMA_S8_COMBAT: { id: 'BIOMA_S8_COMBAT', arquivo: 'music_biome_s8_combat.ogg', url: '/assets/audio/music_biome_s8_combat.ogg', duracaoAlvoSeg: 58, loop: true },
  BOSS_DRAGA: { id: 'BOSS_DRAGA', arquivo: 'music_boss_dredge.ogg', url: '/assets/audio/music_boss_dredge.ogg', duracaoAlvoSeg: 85, loop: true },
  BOSS_DRAGA_FASE2: { id: 'BOSS_DRAGA_FASE2', arquivo: 'music_boss_dredge_p2.ogg', url: '/assets/audio/music_boss_dredge_p2.ogg', duracaoAlvoSeg: 81, loop: true },
  BOSS_DRAGA_FASE3: { id: 'BOSS_DRAGA_FASE3', arquivo: 'music_boss_dredge_p3.ogg', url: '/assets/audio/music_boss_dredge_p3.ogg', duracaoAlvoSeg: 77, loop: true },
  VITORIA: { id: 'VITORIA', arquivo: 'music_victory_fanfare.ogg', url: '/assets/audio/music_victory_fanfare.ogg', duracaoAlvoSeg: 22, loop: false },
  DERROTA: { id: 'DERROTA', arquivo: 'music_defeat_abyss.ogg', url: '/assets/audio/music_defeat_abyss.ogg', duracaoAlvoSeg: 27, loop: false },
  AMBIENCIA_HIDROFONE: { id: 'AMBIENCIA_HIDROFONE', arquivo: 'ambience_hydrophone_deep.ogg', url: '/assets/audio/ambience_hydrophone_deep.ogg', duracaoAlvoSeg: 64, loop: true },
  AMBIENCIA_SETOR_2: { id: 'AMBIENCIA_SETOR_2', arquivo: 'ambience_sector2_kelp.ogg', url: '/assets/audio/ambience_sector2_kelp.ogg', duracaoAlvoSeg: 64, loop: true },
  AMBIENCIA_SETOR_3: { id: 'AMBIENCIA_SETOR_3', arquivo: 'ambience_sector3_vents.ogg', url: '/assets/audio/ambience_sector3_vents.ogg', duracaoAlvoSeg: 64, loop: true },
  AMBIENCIA_SETOR_4: { id: 'AMBIENCIA_SETOR_4', arquivo: 'ambience_sector4_shipyard.ogg', url: '/assets/audio/ambience_sector4_shipyard.ogg', duracaoAlvoSeg: 64, loop: true },
  AMBIENCIA_SETOR_5: { id: 'AMBIENCIA_SETOR_5', arquivo: 'ambience_sector5_storm.ogg', url: '/assets/audio/ambience_sector5_storm.ogg', duracaoAlvoSeg: 64, loop: true },
  AMBIENCIA_SETOR_6: { id: 'AMBIENCIA_SETOR_6', arquivo: 'ambience_sector6_ice.ogg', url: '/assets/audio/ambience_sector6_ice.ogg', duracaoAlvoSeg: 64, loop: true },
  AMBIENCIA_SETOR_7: { id: 'AMBIENCIA_SETOR_7', arquivo: 'ambience_sector7_hive.ogg', url: '/assets/audio/ambience_sector7_hive.ogg', duracaoAlvoSeg: 64, loop: true },
  AMBIENCIA_SETOR_8: { id: 'AMBIENCIA_SETOR_8', arquivo: 'ambience_sector8_dredge.ogg', url: '/assets/audio/ambience_sector8_dredge.ogg', duracaoAlvoSeg: 64, loop: true },
});

export const MANIFESTO_FOLEY_OGG_STEAM = Object.freeze({
  FOIL_DECOLAGEM: { id: 'FOIL_DECOLAGEM', arquivo: 'foley_foil_liftoff.ogg', url: '/assets/audio/foley_foil_liftoff.ogg', panPadrao: -0.35 },
  TOUCHDOWN_IMPACTO: { id: 'TOUCHDOWN_IMPACTO', arquivo: 'foley_touchdown_slam.ogg', url: '/assets/audio/foley_touchdown_slam.ogg', panPadrao: -0.38 },
  MERGULHO_400HZ: { id: 'MERGULHO_400HZ', arquivo: 'foley_tactical_dive_400hz.ogg', url: '/assets/audio/foley_tactical_dive_400hz.ogg', panPadrao: -0.32 },
  DRENO_VALVULA: { id: 'DRENO_VALVULA', arquivo: 'foley_valve_purge_water.ogg', url: '/assets/audio/foley_valve_purge_water.ogg', panPadrao: -0.4 },
  BRECHA_GEISER: { id: 'BRECHA_GEISER', arquivo: 'foley_hull_breach_geyser.ogg', url: '/assets/audio/foley_hull_breach_geyser.ogg', panPadrao: -0.42 },
  TIRO_ESPINHO: { id: 'TIRO_ESPINHO', arquivo: 'foley_chitin_spike_fire.ogg', url: '/assets/audio/foley_chitin_spike_fire.ogg', panPadrao: -0.4 },
  TIRO_TORPEDO: { id: 'TIRO_TORPEDO', arquivo: 'foley_torpedo_cavitation.ogg', url: '/assets/audio/foley_torpedo_cavitation.ogg', panPadrao: -0.36 },
  TIRO_FLAK: { id: 'TIRO_FLAK', arquivo: 'foley_flak_shrapnel_burst.ogg', url: '/assets/audio/foley_flak_shrapnel_burst.ogg', panPadrao: -0.38 },
  FEIXE_TERMICO: { id: 'FEIXE_TERMICO', arquivo: 'foley_thermal_beam_sweep.ogg', url: '/assets/audio/foley_thermal_beam_sweep.ogg', panPadrao: 0.18 },
  PULSO_IONICO: { id: 'PULSO_IONICO', arquivo: 'foley_ion_discharge.ogg', url: '/assets/audio/foley_ion_discharge.ogg', panPadrao: -0.34 },
  BOMBA_OSMOTICA: { id: 'BOMBA_OSMOTICA', arquivo: 'foley_osmotic_bomb_implode.ogg', url: '/assets/audio/foley_osmotic_bomb_implode.ogg', panPadrao: 0.44 },
  ESCUDO_BOLHA_ABSORCAO: { id: 'ESCUDO_BOLHA_ABSORCAO', arquivo: 'foley_bubble_shield_absorb.ogg', url: '/assets/audio/foley_bubble_shield_absorb.ogg', panPadrao: -0.38 },
  CASCO_IMPACTO_PESADO: { id: 'CASCO_IMPACTO_PESADO', arquivo: 'foley_hull_impact_heavy.ogg', url: '/assets/audio/foley_hull_impact_heavy.ogg', panPadrao: -0.42 },
  ESQUIVA_FLYBY: { id: 'ESQUIVA_FLYBY', arquivo: 'foley_evade_whoosh.ogg', url: '/assets/audio/foley_evade_whoosh.ogg', panPadrao: -0.42 },
  SONAR_PING: { id: 'SONAR_PING', arquivo: 'foley_sonar_ping_buoy.ogg', url: '/assets/audio/foley_sonar_ping_buoy.ogg', naoDiegeticoLimpo: true, panPadrao: 0.0 },
  CONQUISTA_STEAM: { id: 'CONQUISTA_STEAM', arquivo: 'foley_achievement_unlock.ogg', url: '/assets/audio/foley_achievement_unlock.ogg', naoDiegeticoLimpo: true, panPadrao: 0.0 },
  MORTEIRO_ACIDO: { id: 'MORTEIRO_ACIDO', arquivo: 'foley_acid_mortar_hiss.ogg', url: '/assets/audio/foley_acid_mortar_hiss.ogg', panPadrao: 0.36 },
  CRIO_ESTILHACO: { id: 'CRIO_ESTILHACO', arquivo: 'foley_cryo_lance_shatter.ogg', url: '/assets/audio/foley_cryo_lance_shatter.ogg', panPadrao: 0.38 },
  FEIXE_NEURO_BIO: { id: 'FEIXE_NEURO_BIO', arquivo: 'foley_neuro_beam_synapse.ogg', url: '/assets/audio/foley_neuro_beam_synapse.ogg', panPadrao: 0.22 },
  CADEIA_VULCAO: { id: 'CADEIA_VULCAO', arquivo: 'foley_chain_vulcan_spool.ogg', url: '/assets/audio/foley_chain_vulcan_spool.ogg', panPadrao: -0.4 },
  ESCLUSA_ABORDAGEM: { id: 'ESCLUSA_ABORDAGEM', arquivo: 'foley_boarding_pod_launch.ogg', url: '/assets/audio/foley_boarding_pod_launch.ogg', panPadrao: 0.25 },
  AGULHA_SONICA: { id: 'AGULHA_SONICA', arquivo: 'foley_sonic_needle_pierce.ogg', url: '/assets/audio/foley_sonic_needle_pierce.ogg', panPadrao: -0.38 },
  DISPARO_HIDRO_CARGA: { id: 'DISPARO_HIDRO_CARGA', arquivo: 'foley_hydro_charge_salvo.ogg', url: '/assets/audio/foley_hydro_charge_salvo.ogg', panPadrao: -0.4 },
  SONDA_HACK_ION: { id: 'SONDA_HACK_ION', arquivo: 'foley_hack_probe_ion.ogg', url: '/assets/audio/foley_hack_probe_ion.ogg', panPadrao: 0.34 },
  PARASITA_NEURAL_SINAPSE: { id: 'PARASITA_NEURAL_SINAPSE', arquivo: 'foley_mind_parasite_latch.ogg', url: '/assets/audio/foley_mind_parasite_latch.ogg', panPadrao: 0.42 },
  DRONE_DEFESA_LASER: { id: 'DRONE_DEFESA_LASER', arquivo: 'foley_defense_drone_zap.ogg', url: '/assets/audio/foley_defense_drone_zap.ogg', panPadrao: -0.22 },
});

export function obterListaCompletaArquivosOggSteam() {
  return Object.freeze([
    ...Object.values(MANIFESTO_TRILHAS_OGG_STEAM).map((t) => t.arquivo),
    ...Object.values(MANIFESTO_FOLEY_OGG_STEAM).map((f) => f.arquivo),
  ]);
}

/**
 * Calcula matematicamente quais trilhas ativas, ganhos de crossfade de igual potência
 * e frequência de corte (`20000 Hz` vs `400 Hz`) devem vigorar para o estado atual do jogo!
 */
export function calcularMixagemAdaptativaSteam(contextoJogo = {}, configuracoes = {}) {
  const fase = String(contextoJogo.faseJogo ?? 'COMBATE').toUpperCase();
  const setor = Math.max(1, Math.min(8, Number(contextoJogo.setorNumero ?? 1)));
  const emCombateHostil = Boolean(contextoJogo.emCombateHostil ?? (fase === 'COMBATE' && !contextoJogo.combateEncerrado));
  const ehBossDraga = Boolean(contextoJogo.ehBossDraga ?? (setor === 8 && contextoJogo.encontroChefe));
  const faseChefe = Math.max(1, Math.min(3, Number(contextoJogo.faseChefe ?? 1)));
  const submerso = Boolean(contextoJogo.submerso400Hz ?? contextoJogo.emMergulhoTatico ?? false);
  const pausaTatica = Boolean(contextoJogo.pausaTaticaAtiva ?? false);
  const emTouchdownCasco = !submerso && Boolean(contextoJogo.emTouchdownCasco ?? false);

  const mudo = Boolean(configuracoes.mudoTotal ?? false);
  const gMaster = mudo ? 0 : Math.max(0, Math.min(1, Number(configuracoes.volumeMaster ?? 85) / 100));
  const atenuacaoPausa = pausaTatica ? 0.72 : 1.0;
  const gMusica = Math.max(0, Math.min(1, (Number(configuracoes.volumeMusica ?? 75) / 100) * atenuacaoPausa));
  const gSfx = Math.max(0, Math.min(1, Number(configuracoes.volumeSfx ?? 90) / 100));

  const mapaParBiomaSetor = {
    1: 'ZONA1',
    2: 'BIOMA_S2',
    3: 'BIOMA_S3',
    4: 'ZONA2',
    5: 'BIOMA_S5',
    6: 'ZONA3',
    7: 'BIOMA_S7',
    8: 'BIOMA_S8',
  };
  const parZona = mapaParBiomaSetor[setor] ?? 'ZONA1';

  let trilhaExploreId = `${parZona}_EXPLORE`;
  let trilhaCombatId = `${parZona}_COMBAT`;
  let mixCombate01 = emCombateHostil ? 1.0 : 0.0;

  if (fase === 'INICIO') {
    trilhaExploreId = 'HANGAR';
    trilhaCombatId = null;
    mixCombate01 = 0;
  } else if (fase === 'LOJA') {
    trilhaExploreId = 'LOJA_RECIFE';
    trilhaCombatId = null;
    mixCombate01 = 0;
  } else if (fase === 'FIM_DE_RUN') {
    trilhaExploreId = contextoJogo.vitoriaCampanha ? 'VITORIA' : 'DERROTA';
    trilhaCombatId = null;
    mixCombate01 = 0;
  } else if (ehBossDraga && emCombateHostil) {
    trilhaExploreId = faseChefe >= 3 ? 'BOSS_DRAGA_FASE3' : faseChefe === 2 ? 'BOSS_DRAGA_FASE2' : 'BOSS_DRAGA';
    trilhaCombatId = null;
    mixCombate01 = 0;
  }

  // Crossfade de Igual Potência: cos(θ)^2 + sin(θ)^2 === 1
  const ang = mixCombate01 * (Math.PI * 0.5);
  const ganhoStemExplore = trilhaCombatId ? Number(Math.cos(ang).toFixed(4)) : 1.0;
  const ganhoStemCombat = trilhaCombatId ? Number(Math.sin(ang).toFixed(4)) : 0.0;

  const frequenciaFiltroHz = submerso
    ? FREQ_CORTE_SUBMERSO_400HZ
    : pausaTatica
      ? FREQ_CORTE_PAUSA_TATICA_HZ
      : emTouchdownCasco
        ? FREQ_CORTE_TOUCHDOWN_CASCO_HZ
        : FREQ_CORTE_SUPERFICIE_HZ;
  const fatorQ = submerso ? 2.6 : pausaTatica ? 1.65 : emTouchdownCasco ? 0.95 : 0.707;
  const ambienciaAtiva = fase !== 'INICIO';
  const ambienciaTrilhaId = !ambienciaAtiva
    ? null
    : setor === 1
      ? 'AMBIENCIA_HIDROFONE'
      : `AMBIENCIA_SETOR_${setor}`;

  return Object.freeze({
    trilhaExploreId,
    trilhaCombatId,
    faseChefeAtiva: ehBossDraga && emCombateHostil ? faseChefe : 0,
    mixCombate01,
    ganhoStemExplore,
    ganhoStemCombat,
    ambienciaHidrofoneAtiva: ambienciaAtiva,
    ambienciaTrilhaId,
    ganhoMasterEfetivo: Number(gMaster.toFixed(4)),
    ganhoMusicaEfetivo: Number((gMaster * gMusica).toFixed(4)),
    ganhoSfxEfetivo: Number((gMaster * gSfx).toFixed(4)),
    ganhoCanalMusicaPuro: Number(gMusica.toFixed(4)),
    ganhoCanalSfxPuro: Number(gSfx.toFixed(4)),
    submerso400Hz: submerso,
    pausaTaticaAtiva: pausaTatica,
    emTouchdownCasco,
    frequenciaFiltroHz,
    fatorQ,
  });
}

/**
 * Seleciona a amostra `.ogg` de foley hidroacústico correspondente a uma família de arma, `chassiId` real ou evento físico.
 */
export function resolverAmostraFoleyPorEvento(tipoEventoOuFamiliaArma) {
  const ch = String(tipoEventoOuFamiliaArma ?? '').toUpperCase();
  if (Object.prototype.hasOwnProperty.call(MANIFESTO_FOLEY_OGG_STEAM, ch)) {
    return MANIFESTO_FOLEY_OGG_STEAM[ch];
  }
  if (ch.includes('SONDA_SABOTAGEM') || ch.includes('SONDA_HACK')) return MANIFESTO_FOLEY_OGG_STEAM.SONDA_HACK_ION;
  if (ch.includes('PARASITA_NEURAL')) return MANIFESTO_FOLEY_OGG_STEAM.PARASITA_NEURAL_SINAPSE;
  if (ch.includes('DRONE_DEFESA') || ch.includes('INTERCEPTACAO_DRONE')) return MANIFESTO_FOLEY_OGG_STEAM.DRONE_DEFESA_LASER;
  if (ch.includes('AGULHA') || ch.includes('DISPARO_ACUSTICO') || ch.includes('EMISSOR_ACUSTICO')) return MANIFESTO_FOLEY_OGG_STEAM.AGULHA_SONICA;
  if (ch.includes('BATERIA_CARGA') || ch.includes('DISPARO_HIDRO')) return MANIFESTO_FOLEY_OGG_STEAM.DISPARO_HIDRO_CARGA;
  if (ch.includes('ESPINHOS')) return MANIFESTO_FOLEY_OGG_STEAM.TIRO_FLAK;
  if (ch.includes('VULCAO') || ch.includes('CADEIA_HIDRO')) return MANIFESTO_FOLEY_OGG_STEAM.CADEIA_VULCAO;
  if (ch.includes('DISPARADOR') || ch.includes('CAVIT') || ch === 'TIRO_ESPINHO') return MANIFESTO_FOLEY_OGG_STEAM.TIRO_ESPINHO;
  if (ch.includes('NEUROTOXIC') || ch.includes('FEIXE_NEURAL') || (ch.includes('FEIXE') && ch.includes('BIO'))) return MANIFESTO_FOLEY_OGG_STEAM.FEIXE_NEURO_BIO;
  if (ch.includes('FEIXE') || ch.includes('BEAM') || ch.includes('LANCA') || ch.includes('CORTADOR')) return MANIFESTO_FOLEY_OGG_STEAM.FEIXE_TERMICO;
  if (ch.includes('ION') || ch.includes('BIOELETRIC') || ch.includes('RESSONANTE')) return MANIFESTO_FOLEY_OGG_STEAM.PULSO_IONICO;
  if (ch.includes('CRIO')) return MANIFESTO_FOLEY_OGG_STEAM.CRIO_ESTILHACO;
  if (ch.includes('FLAK') || ch.includes('ESTILHAC') || ch.includes('DISPERSOR')) return MANIFESTO_FOLEY_OGG_STEAM.TIRO_FLAK;
  if (ch.includes('TORPEDO') || ch.includes('MISSIL') || ch.includes('ARPAO')) return MANIFESTO_FOLEY_OGG_STEAM.TIRO_TORPEDO;
  if (ch.includes('ACIDO') || ch.includes('ESPORO')) return MANIFESTO_FOLEY_OGG_STEAM.MORTEIRO_ACIDO;
  if (ch.includes('BOMBA') || ch.includes('MORTEIRO') || ch.includes('SIFAO_OSMOTICO')) return MANIFESTO_FOLEY_OGG_STEAM.BOMBA_OSMOTICA;
  if (ch.includes('ABORDAGEM') || ch.includes('ESCLUSA') || ch.includes('TUBO_PRESSURIZADO')) return MANIFESTO_FOLEY_OGG_STEAM.ESCLUSA_ABORDAGEM;
  if (ch.includes('MERGULHO') || ch.includes('400')) return MANIFESTO_FOLEY_OGG_STEAM.MERGULHO_400HZ;
  if (ch.includes('DREN') || ch.includes('VALVULA')) return MANIFESTO_FOLEY_OGG_STEAM.DRENO_VALVULA;
  if (ch.includes('BRECHA') || ch.includes('BREACH') || ch.includes('ROMBO') || ch.includes('GEISER')) return MANIFESTO_FOLEY_OGG_STEAM.BRECHA_GEISER;
  if (ch.includes('TOUCHDOWN')) return MANIFESTO_FOLEY_OGG_STEAM.TOUCHDOWN_IMPACTO;
  if (ch.includes('DECOLAGEM') || ch.includes('FOIL') || ch.includes('SPOOL')) return MANIFESTO_FOLEY_OGG_STEAM.FOIL_DECOLAGEM;
  if (ch.includes('ESCUDO') || ch.includes('BOLHA') || ch.includes('BARREIRA')) return MANIFESTO_FOLEY_OGG_STEAM.ESCUDO_BOLHA_ABSORCAO;
  if (ch.includes('ESQUIVA') || ch.includes('MISS') || ch.includes('EVADIDA')) return MANIFESTO_FOLEY_OGG_STEAM.ESQUIVA_FLYBY;
  if (ch.includes('SONAR') || ch.includes('SALTO')) return MANIFESTO_FOLEY_OGG_STEAM.SONAR_PING;
  if (ch.includes('CONQUISTA') || ch.includes('QUEST')) return MANIFESTO_FOLEY_OGG_STEAM.CONQUISTA_STEAM;
  if (ch.includes('IMPACTO') || ch.includes('CASCO') || ch.includes('CARAPACA') || ch.includes('BLINDAGEM') || ch.includes('SURGE') || ch.includes('MINA') || ch.includes('PRESSAO_HIDRO')) return MANIFESTO_FOLEY_OGG_STEAM.CASCO_IMPACTO_PESADO;
  return MANIFESTO_FOLEY_OGG_STEAM.TIRO_ESPINHO;
}

/**
 * Extrai a chave semântica exata de foley a partir de um objeto real de `eventosVisuaisUltimoTick`
 * emitido pelo motor de combate (`tick-combate-tempo-real.mjs`), preservando `chassiId` e subtipos!
 */
export function resolverChaveFoleyEventoVisual(ev) {
  if (!ev || typeof ev !== 'object') return 'IMPACTO';
  const tipo = String(ev.tipo ?? '').toUpperCase();
  if (tipo === 'DISPARO_JOGADOR' || tipo === 'FEIXE_JOGADOR') {
    return String(ev.chassiId || ev.armaId || ev.familia || ev.familiaVisual || tipo);
  }
  if (tipo === 'DISPARO_INIMIGO') {
    if (ev.acertou === false) return 'ESQUIVA_FLYBY';
    const abs = String(ev.absorvidoPor ?? '').toUpperCase();
    if (abs.includes('BARREIRA') || abs.includes('ESCUDO')) return 'ESCUDO_BOLHA_ABSORCAO';
    if (ev.defletido === true) return 'CASCO_IMPACTO_PESADO';
    if (ev.armaInimigaId) return String(ev.armaInimigaId);
    const sub = String(ev.subtipo ?? '').toUpperCase();
    if (sub.includes('TORPEDO') || sub.includes('BICO')) return 'TIRO_TORPEDO';
    if (sub.includes('LASER')) return 'FEIXE_TERMICO';
    return 'TIRO_ESPINHO';
  }
  if (tipo === 'IMPACTO_ALVO') {
    if (String(ev.resultadoBalistico ?? '').toUpperCase() === 'ESCUDO') return 'ESCUDO_BOLHA_ABSORCAO';
    return 'CASCO_IMPACTO_PESADO';
  }
  if (tipo === 'SONDA_SABOTAGEM_LANCADA') return 'SONDA_HACK_ION';
  if (tipo === 'PARASITA_NEURAL_ATIVADO') return 'PARASITA_NEURAL_SINAPSE';
  if (tipo === 'INTERCEPTACAO_DRONE_DEFESA') return 'DRONE_DEFESA_LASER';
  if (tipo.includes('BARREIRA') || tipo.includes('ESCUDO')) return 'ESCUDO_BOLHA_ABSORCAO';
  if (tipo.includes('ESQUIVA') || tipo === 'MINA_EVADIDA') return 'ESQUIVA_FLYBY';
  if (tipo === 'CORTE_DRENO_SEGURO') return 'DRENO_VALVULA';
  const txtUp = String(ev.texto ?? '').toUpperCase();
  if (tipo === 'IMPACTO_JOGADOR' && (ev.abriuBrecha === true || txtUp.includes('BRECHA') || txtUp.includes('BREACH'))) {
    return 'BRECHA_GEISER';
  }
  return String(ev.chassiId || ev.armaId || ev.familia || tipo || 'IMPACTO');
}

/**
 * Calcula o posicionamento estéreo espacial (`-1.0` esquerda [Bionave Jogador] .. `+1.0` direita [Alvo Inimigo])
 * para eventos visuais e amostras de foley em combate naval lateral.
 */
export function resolverPanEstereoEventoVisual(ev, amostra = null) {
  if (ev && typeof ev === 'object') {
    if (Number.isFinite(Number(ev.pan))) {
      return Math.max(-1, Math.min(1, Number(ev.pan)));
    }
    const tipo = String(ev.tipo ?? '').toUpperCase();
    if (tipo === 'IMPACTO_ALVO' || tipo === 'DISPARO_INIMIGO' || tipo === 'CARAPACA_REFLEXA_ATIVADA' || tipo === 'SOBRECARGA_DRAGA' || tipo === 'POWER_SURGE_DRAGA' || tipo === 'MINA_MAGNETICA_LANCADA') {
      if (tipo === 'DISPARO_INIMIGO' && ev.acertou === false) return -0.42;
      return 0.48;
    }
    if (tipo === 'DISPARO_JOGADOR' || tipo === 'IMPACTO_JOGADOR' || tipo === 'BLOQUEIO_BARREIRA_JOGADOR' || tipo === 'DEFLEXAO_BLINDAGEM_JOGADOR' || tipo === 'ESQUIVA_JOGADOR' || tipo === 'CORTE_DRENO_SEGURO' || tipo === 'REFLEXO_BRANQUIAL' || tipo === 'MINA_EVADIDA') {
      return -0.42;
    }
    if (tipo === 'FEIXE_JOGADOR') {
      return 0.22;
    }
  }
  return Number.isFinite(Number(amostra?.panPadrao)) ? Number(amostra.panPadrao) : 0.0;
}

const FOLEYS_IMPACTO_DUCKING = new Set([
  'TOUCHDOWN_IMPACTO',
  'CASCO_IMPACTO_PESADO',
  'BRECHA_GEISER',
  'BOMBA_OSMOTICA',
]);

/**
 * Instancia o controlador completo de Áudio `.ogg` + Foley + Filtro 400 Hz.
 * Em Browser usa `AudioContext` + `fetch`/`decodeAudioData` sobre `/assets/audio/*.ogg`;
 * em Node / Headless mantém estado determinístico completo para auditoria e testes!
 */
export function criarMotorAudioOggFoleySteam(opcoes = {}) {
  const baseUrl = String(opcoes.baseUrl ?? '/assets/audio').replace(/\/$/, '');
  const buffersDecodificados = new Map();
  const historicoFoleyDisparados = [];
  let totalCliquesUiDisparados = 0;
  let ctxAudio = null;
  let filtroSubmersao = null;
  let ganhoMasterNode = null;
  let ganhoMusicaNode = null;
  let ganhoSfxNode = null;
  let ganhoUiLimpoNode = null;
  let fontesMusicaAtivas = {
    exploreKey: null,
    combatKey: null,
    exploreGain: null,
    combatGain: null,
    exploreSrc: null,
    combatSrc: null,
    ambKey: null,
    ambSrc: null,
    ambGain: null,
  };
  let ultimaMixagem = calcularMixagemAdaptativaSteam({}, opcoes.configuracoesIniciais ?? {});

  function garantirGrafoWebAudio() {
    if (ctxAudio) return ctxAudio;
    const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext ?? null;
    if (!Ctor) return null;
    ctxAudio = new Ctor();
    filtroSubmersao = ctxAudio.createBiquadFilter();
    filtroSubmersao.type = 'lowpass';
    filtroSubmersao.frequency.value = ultimaMixagem.frequenciaFiltroHz;
    filtroSubmersao.Q.value = ultimaMixagem.fatorQ;

    ganhoMasterNode = ctxAudio.createGain();
    ganhoMusicaNode = ctxAudio.createGain();
    ganhoSfxNode = ctxAudio.createGain();
    ganhoUiLimpoNode = ctxAudio.createGain();
    ganhoMasterNode.gain.value = ultimaMixagem.ganhoMasterEfetivo;
    ganhoMusicaNode.gain.value = ultimaMixagem.ganhoCanalMusicaPuro;
    ganhoSfxNode.gain.value = ultimaMixagem.ganhoCanalSfxPuro;
    ganhoUiLimpoNode.gain.value = ultimaMixagem.ganhoCanalSfxPuro;

    ganhoMusicaNode.connect(filtroSubmersao);
    ganhoSfxNode.connect(filtroSubmersao);
    ganhoUiLimpoNode.connect(ganhoMasterNode);
    filtroSubmersao.connect(ganhoMasterNode);
    ganhoMasterNode.connect(ctxAudio.destination);
    return ctxAudio;
  }

  async function carregarBufferOgg(nomeArquivo) {
    if (buffersDecodificados.has(nomeArquivo)) {
      return buffersDecodificados.get(nomeArquivo);
    }
    const ctx = garantirGrafoWebAudio();
    if (!ctx || typeof globalThis.fetch !== 'function') return null;
    try {
      const resp = await globalThis.fetch(`${baseUrl}/${nomeArquivo}`);
      if (!resp.ok) return null;
      const arr = await resp.arrayBuffer();
      const audioBuf = await ctx.decodeAudioData(arr);
      buffersDecodificados.set(nomeArquivo, audioBuf);
      return audioBuf;
    } catch {
      return null;
    }
  }

  let seqSincroniaMusical = 0;

  async function sincronizarStemsMusicais(mix) {
    const ctx = garantirGrafoWebAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch { /* aguarda gesto do usuário */ }
    }

    const mudouPar = fontesMusicaAtivas.exploreKey !== mix.trilhaExploreId || fontesMusicaAtivas.combatKey !== mix.trilhaCombatId;
    if (mudouPar) {
      seqSincroniaMusical += 1;
      const meuTokenSeq = seqSincroniaMusical;
      for (const k of ['exploreSrc', 'combatSrc']) {
        if (fontesMusicaAtivas[k]) {
          try { fontesMusicaAtivas[k].stop(); } catch { /* noop */ }
          fontesMusicaAtivas[k] = null;
        }
      }
      fontesMusicaAtivas.exploreGain = null;
      fontesMusicaAtivas.combatGain = null;
      fontesMusicaAtivas.exploreKey = mix.trilhaExploreId;
      fontesMusicaAtivas.combatKey = mix.trilhaCombatId;

      const metaExp = MANIFESTO_TRILHAS_OGG_STEAM[mix.trilhaExploreId] ?? null;
      const metaCmb = mix.trilhaCombatId ? (MANIFESTO_TRILHAS_OGG_STEAM[mix.trilhaCombatId] ?? null) : null;

      // Decodifica ambos os stems em paralelo e agenda `start(tInicioComum)` com alinhamento sample-accurate e guarda monotônica!
      const [bufExp, bufCmb] = await Promise.all([
        metaExp ? carregarBufferOgg(metaExp.arquivo) : Promise.resolve(null),
        metaCmb ? carregarBufferOgg(metaCmb.arquivo) : Promise.resolve(null),
      ]);

      if (
        meuTokenSeq === seqSincroniaMusical &&
        fontesMusicaAtivas.exploreKey === mix.trilhaExploreId &&
        fontesMusicaAtivas.combatKey === mix.trilhaCombatId
      ) {
        const tInicioComum = ctx.currentTime + 0.025;
        if (bufExp && metaExp) {
          const src = ctx.createBufferSource();
          const gn = ctx.createGain();
          src.buffer = bufExp;
          src.loop = metaExp.loop;
          gn.gain.value = ultimaMixagem.ganhoStemExplore;
          src.connect(gn);
          gn.connect(ganhoMusicaNode);
          src.start(tInicioComum);
          fontesMusicaAtivas.exploreSrc = src;
          fontesMusicaAtivas.exploreGain = gn;
        }
        if (bufCmb && metaCmb) {
          const src = ctx.createBufferSource();
          const gn = ctx.createGain();
          src.buffer = bufCmb;
          src.loop = metaCmb.loop;
          gn.gain.value = ultimaMixagem.ganhoStemCombat;
          src.connect(gn);
          gn.connect(ganhoMusicaNode);
          src.start(tInicioComum);
          fontesMusicaAtivas.combatSrc = src;
          fontesMusicaAtivas.combatGain = gn;
        }
      }
    }

    const agora = ctx.currentTime;
    if (fontesMusicaAtivas.exploreGain) {
      fontesMusicaAtivas.exploreGain.gain.setTargetAtTime(mix.ganhoStemExplore, agora, 0.28);
    }
    if (fontesMusicaAtivas.combatGain) {
      fontesMusicaAtivas.combatGain.gain.setTargetAtTime(mix.ganhoStemCombat, agora, 0.28);
    }
    if (ganhoMasterNode) ganhoMasterNode.gain.setTargetAtTime(mix.ganhoMasterEfetivo, agora, 0.08);
    if (ganhoMusicaNode) ganhoMusicaNode.gain.setTargetAtTime(mix.ganhoCanalMusicaPuro, agora, 0.08);
    if (ganhoSfxNode) ganhoSfxNode.gain.setTargetAtTime(mix.ganhoCanalSfxPuro, agora, 0.08);
    if (ganhoUiLimpoNode) ganhoUiLimpoNode.gain.setTargetAtTime(mix.ganhoCanalSfxPuro, agora, 0.08);
    if (filtroSubmersao) {
      filtroSubmersao.frequency.setTargetAtTime(mix.frequenciaFiltroHz, agora, 0.14);
      filtroSubmersao.Q.setTargetAtTime(mix.fatorQ, agora, 0.14);
    }

    const chaveAmbDesejada = mix.ambienciaHidrofoneAtiva ? (mix.ambienciaTrilhaId ?? 'AMBIENCIA_HIDROFONE') : null;
    if (chaveAmbDesejada && fontesMusicaAtivas.ambKey !== chaveAmbDesejada) {
      if (fontesMusicaAtivas.ambSrc) {
        const srcAntiga = fontesMusicaAtivas.ambSrc;
        const gnAntiga = fontesMusicaAtivas.ambGain;
        fontesMusicaAtivas.ambSrc = null;
        fontesMusicaAtivas.ambGain = null;
        try {
          if (gnAntiga) gnAntiga.gain.setTargetAtTime(0, agora, 0.08);
          srcAntiga.stop(agora + 0.22);
        } catch {
          try { srcAntiga.stop(); } catch { /* noop */ }
        }
      }
      fontesMusicaAtivas.ambKey = chaveAmbDesejada;
      const metaAmb = MANIFESTO_TRILHAS_OGG_STEAM[chaveAmbDesejada] ?? MANIFESTO_TRILHAS_OGG_STEAM.AMBIENCIA_HIDROFONE;
      const bufAmb = await carregarBufferOgg(metaAmb.arquivo);
      if (bufAmb && ultimaMixagem.ambienciaHidrofoneAtiva && fontesMusicaAtivas.ambKey === chaveAmbDesejada && !fontesMusicaAtivas.ambSrc) {
        const srcA = ctx.createBufferSource();
        const gnA = ctx.createGain();
        srcA.buffer = bufAmb;
        srcA.loop = true;
        gnA.gain.value = 0.01;
        srcA.connect(gnA);
        gnA.connect(ganhoSfxNode);
        srcA.start(0);
        gnA.gain.setTargetAtTime(0.26, ctx.currentTime, 0.25);
        fontesMusicaAtivas.ambSrc = srcA;
        fontesMusicaAtivas.ambGain = gnA;
      }
    } else if (!chaveAmbDesejada && fontesMusicaAtivas.ambSrc) {
      const srcAntiga = fontesMusicaAtivas.ambSrc;
      const gnAntiga = fontesMusicaAtivas.ambGain;
      fontesMusicaAtivas.ambSrc = null;
      fontesMusicaAtivas.ambGain = null;
      fontesMusicaAtivas.ambKey = null;
      try {
        if (gnAntiga) gnAntiga.gain.setTargetAtTime(0, agora, 0.06);
        srcAntiga.stop(agora + 0.18);
      } catch {
        try { srcAntiga.stop(); } catch { /* noop */ }
      }
    }
  }

  function atualizarEstadoJogo(contextoJogo = {}, configuracoes = {}) {
    ultimaMixagem = calcularMixagemAdaptativaSteam(contextoJogo, configuracoes);
    void sincronizarStemsMusicais(ultimaMixagem);
    return ultimaMixagem;
  }

  async function dispararFoley(tipoEventoOuFamiliaArma, ganhoRelativo = 1.0, opcoesEspaciais = {}) {
    const amostra = resolverAmostraFoleyPorEvento(tipoEventoOuFamiliaArma);
    const aplicaDucking = FOLEYS_IMPACTO_DUCKING.has(amostra.id);
    const bypassFiltroSubmersao = Boolean(amostra.naoDiegeticoLimpo);
    const panBruto = Number.isFinite(Number(opcoesEspaciais?.pan))
      ? Number(opcoesEspaciais.pan)
      : Number(amostra.panPadrao ?? 0);
    const panEstereo = bypassFiltroSubmersao ? 0.0 : Math.max(-1, Math.min(1, Number(panBruto.toFixed(3))));
    historicoFoleyDisparados.push({
      id: amostra.id,
      arquivo: amostra.arquivo,
      ganhoRelativo: Math.max(0.05, Math.min(1.5, Number(ganhoRelativo) || 1)),
      panEstereo,
      frequenciaFiltroNoDisparoHz: bypassFiltroSubmersao ? FREQ_CORTE_SUPERFICIE_HZ : ultimaMixagem.frequenciaFiltroHz,
      bypassFiltroSubmersao,
      duckingMusicaAplicado: aplicaDucking,
    });
    if (historicoFoleyDisparados.length > 64) {
      historicoFoleyDisparados.shift();
    }
    const ctx = garantirGrafoWebAudio();
    if (!ctx || ultimaMixagem.ganhoSfxEfetivo <= 0) return amostra;
    if (aplicaDucking && ganhoMusicaNode) {
      const tDuck = ctx.currentTime;
      const baseMus = ultimaMixagem.ganhoCanalMusicaPuro;
      ganhoMusicaNode.gain.setTargetAtTime(baseMus * 0.72, tDuck, 0.035);
      ganhoMusicaNode.gain.setTargetAtTime(baseMus, tDuck + 0.16, 0.22);
    }
    const buf = await carregarBufferOgg(amostra.arquivo);
    if (buf) {
      const src = ctx.createBufferSource();
      const gn = ctx.createGain();
      src.buffer = buf;
      gn.gain.value = Math.max(0.05, Math.min(1.2, Number(ganhoRelativo) || 1));
      src.connect(gn);
      const busDestino = bypassFiltroSubmersao && ganhoUiLimpoNode ? ganhoUiLimpoNode : ganhoSfxNode;
      if (Math.abs(panEstereo) > 0.001 && typeof ctx.createStereoPanner === 'function') {
        const panner = ctx.createStereoPanner();
        panner.pan.value = panEstereo;
        gn.connect(panner);
        panner.connect(busDestino);
      } else {
        gn.connect(busDestino);
      }
      src.start(0);
    }
    return amostra;
  }

  function dispararCliqueUiCurto(ganhoRelativo = 0.32) {
    totalCliquesUiDisparados += 1;
    const ctx = garantirGrafoWebAudio();
    if (!ctx || ultimaMixagem.ganhoSfxEfetivo <= 0) return false;
    if (ctx.state === 'suspended') {
      try { void ctx.resume(); } catch { /* noop */ }
    }
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gn = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(980, t0);
    osc.frequency.exponentialRampToValueAtTime(360, t0 + 0.032);
    const pico = Math.max(0.04, Math.min(0.6, Number(ganhoRelativo) || 0.32));
    gn.gain.setValueAtTime(pico, t0);
    gn.gain.exponentialRampToValueAtTime(0.001, t0 + 0.034);
    osc.connect(gn);
    gn.connect(ganhoUiLimpoNode ?? ganhoSfxNode);
    osc.start(t0);
    osc.stop(t0 + 0.036);
    return true;
  }

  function obterEstadoInstantaneo() {
    return Object.freeze({
      mixagemAtual: ultimaMixagem,
      totalFoleyDisparados: historicoFoleyDisparados.length,
      totalCliquesUiDisparados,
      ultimoFoley: historicoFoleyDisparados[historicoFoleyDisparados.length - 1] ?? null,
      buffersCarregados: buffersDecodificados.size,
    });
  }

  return Object.freeze({
    atualizarEstadoJogo,
    dispararFoley,
    dispararCliqueUiCurto,
    obterEstadoInstantaneo,
  });
}
