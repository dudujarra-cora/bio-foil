/**
 * ONDA 7 (STEAM EDITION) — Arsenal Expandido de 24 Armas Dorsais e 16 Órgãos/Implantes Simbióticos (AE)
 * Dono Único (Lei N5): src/onda7-steam/catalogo-armas-orgaos-ae.mjs
 *
 * Responsabilidades:
 *  - Módulo 100% puro e isomórfico (0 imports Node.js, 0 structuredClone — paridade 0-byte Servidor <-> Navegador);
 *  - Expandir o arsenal de 7 para 24 armas com mecânicas reais distintas (Chain/Cadeia, Charge/Carga Múltipla,
 *    Pulso Iônico puro, Lança Térmica Focal 4 dano, Feixe Bio-Neurotóxico cirúrgico, Cortador de Casco, Flak Mk.II,
 *    Torpedo Crio-Termal, Bomba de Sifão Osmótico, Morteiro Ácido Corrosivo);
 *  - Expandir os órgãos simbióticos de 6 para 16 (+5 kg cada), combinando modificadores de disparo em soquete e
 *    efeitos passivos de bio-implante (Sinapse Pré-Ignição, Aleta Foil +28kg, Osmose Reversa, Enzima +20% Saque,
 *    Vesícula Hiperbárica, Sanguessuga de Abordagem, Crista Refratora, Reciclador de Munição, Olho Sonar, Medula Coral);
 *  - Prover matrizes de pixels 16x10 / 12x12 Hi-Bit dedicadas e gerador determinístico de ofertas da Loja Recife-Forja AE.
 */
import {
  CATALOGO_ARMAS_51,
  CATALOGO_ORGAOS_52,
  CATALOGO_LOJA_56B,
  PESO_ORGAO_ENXERTADO_KG,
} from '../onda5-catalogo-chefe/catalogo-naves-itens.mjs';
import { streamLojaEstoque } from '../onda1-fisica/hash32-streams.mjs';
import { resolverLayoutNaveSteam, obterLimitesPorSalaLayout } from './topologias-naves-ab.mjs';
import {
  obterConfiguracaoDificuldadeSteam,
  criarConfiguracoesSteam,
} from './dificuldades-conquistas-opcoes.mjs';

function congelarPuro(valor) {
  if (valor === null || typeof valor !== 'object' || (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(valor))) {
    return valor;
  }
  if (Array.isArray(valor)) {
    return Object.freeze(valor.map(congelarPuro));
  }
  const out = {};
  for (const k of Object.keys(valor)) {
    out[k] = congelarPuro(valor[k]);
  }
  return Object.freeze(out);
}

const METADADOS_BASE_ARMAS = Object.freeze({
  EMISSOR_ACUSTICO_I: {
    nomeEn: '1. Acoustic Emitter I',
    siglaHudPt: 'ACÚST I',
    siglaHudEn: 'ACOUS I',
    cardPt: 'EMISSOR ACÚSTICO I',
    cardEn: 'ACOUSTIC EMITTER I',
    resumoPt: '1 EN | 1x1 DANO | 9s',
    resumoEn: '1 EN | 1x1 DMG | 9s',
    familiaVisual: 'ACUSTICO',
  },
  RAJADA_HIDROPNEUMATICA_II: {
    nomeEn: '2. Hydropneumatic Burst II',
    siglaHudPt: 'RAJAD 2',
    siglaHudEn: 'BURST 2',
    cardPt: 'RAJADA HIDRO II',
    cardEn: 'HYDRO BURST II',
    resumoPt: '2 EN | 3x1 DANO | 12s',
    resumoEn: '2 EN | 3x1 DMG | 12s',
    familiaVisual: 'RAJADA',
  },
  CANHAO_ARPAO_CABO: {
    nomeEn: '3. Tethered Harpoon Cannon',
    siglaHudPt: 'ARPÃO',
    siglaHudEn: 'HARPOON',
    cardPt: 'CANHÃO ARPÃO CABO',
    cardEn: 'TETHER HARPOON',
    resumoPt: '2 EN | 100% BRECHA',
    resumoEn: '2 EN | 100% BREACH',
    familiaVisual: 'ARPAO',
  },
  DISPERSOR_ESTILHACOS: {
    nomeEn: '4. Shrapnel Flak Scatterer',
    siglaHudPt: 'FLAK I',
    siglaHudEn: 'FLAK I',
    cardPt: 'FLAK ESTILHAÇOS I',
    cardEn: 'SHRAPNEL FLAK I',
    resumoPt: '2 EN | 3 FLAK | 10s',
    resumoEn: '2 EN | 3 FLAK | 10s',
    familiaVisual: 'FLAK',
  },
  CORTADOR_TERMICO_PLASMA: {
    nomeEn: '5. Plasma Thermal Cutter',
    siglaHudPt: 'PLASMA',
    siglaHudEn: 'PLASMA',
    cardPt: 'CORTADOR PLASMA',
    cardEn: 'PLASMA CUTTER BEAM',
    resumoPt: 'FEIXE 3 SALAS | 14s',
    resumoEn: 'BEAM 3 ROOMS x2 | 14s',
    familiaVisual: 'FEIXE_PLASMA',
  },
  LANCADOR_TORPEDO_ABISSAL: {
    nomeEn: '6. Abyssal Torpedo Launcher',
    siglaHudPt: 'TORPEDO',
    siglaHudEn: 'TORPEDO',
    cardPt: 'TORPEDO ABISSAL',
    cardEn: 'ABYSSAL TORPEDO',
    resumoPt: '3 DANO QUILHA | 1 MUN',
    resumoEn: '3 SUB DMG | 1 AMMO',
    familiaVisual: 'TORPEDO',
  },
  MORTEIRO_ESPOROS: {
    nomeEn: '7. Spore Bio-Mortar',
    siglaHudPt: 'ESPOROS',
    siglaHudEn: 'SPORES',
    cardPt: 'MORTEIRO ESPOROS',
    cardEn: 'SPORE BIO-MORTAR',
    resumoPt: '2 DANO SIST | 1 MUN',
    resumoEn: '2 SYS DMG | 1 AMMO',
    familiaVisual: 'BOMBA_BIO',
  },
});

export const ARMAS_EXPANSAO_AE_17 = congelarPuro([
  {
    id: 'AGULHA_SONICA_RAPIDA',
    ordem: 8,
    edicao: 'STEAM_AE',
    nome: '8. Agulha Sônica Rápida',
    nomeEn: '8. Rapid Sonic Needle',
    siglaHudPt: 'AGULHA',
    siglaHudEn: 'NEEDLE',
    cardPt: 'AGULHA SÔNICA',
    cardEn: 'SONIC NEEDLE',
    resumoPt: '1 EN | 1 DANO | 5,5s',
    resumoEn: '1 EN | 1 DMG | 5.5s',
    familiaVisual: 'ACUSTICO',
    energia: 1,
    pesoKg: 8,
    recargaSeg: 5.5,
    municao: 0,
    soquetes: 1,
    projeteis: 1,
    danoCasco: 1,
    danoSistema: 1,
    danoIonico: 0,
    ignoraBarreira: false,
    ehFeixe: false,
    exigeSalaSubmersa: false,
    chanceFuroPct: 0,
    precoCompra: 42,
    valorVenda: 21,
  },
  {
    id: 'EMISSOR_RESSONANTE_CADEIA',
    ordem: 9,
    edicao: 'STEAM_AE',
    nome: '9. Emissor Ressonante em Cadeia',
    nomeEn: '9. Chain Resonance Emitter',
    siglaHudPt: 'CADEIA',
    siglaHudEn: 'CHAIN',
    cardPt: 'EMISSOR CADEIA',
    cardEn: 'CHAIN EMITTER',
    resumoPt: 'CADEIA 13s->5s (2x1)',
    resumoEn: 'CHAIN 13s->5s (2x1)',
    familiaVisual: 'CADEIA',
    mecanicaEspecial: 'CADEIA_RECARGA',
    reducaoRecargaPorSalvaSeg: 2.0,
    pisoRecargaSeg: 5.0,
    energia: 2,
    pesoKg: 16,
    recargaSeg: 13,
    municao: 0,
    soquetes: 1,
    projeteis: 2,
    danoCasco: 1,
    danoSistema: 1,
    danoIonico: 0,
    ignoraBarreira: false,
    ehFeixe: false,
    exigeSalaSubmersa: false,
    chanceFuroPct: 0,
    precoCompra: 68,
    valorVenda: 34,
  },
  {
    id: 'VULCAO_HIDROTERMAL_CADEIA',
    ordem: 10,
    edicao: 'STEAM_AE',
    nome: '10. Vulcão Hidrotermal Sequencial',
    nomeEn: '10. Hydrothermal Chain Vulcan',
    siglaHudPt: 'VULCÃO',
    siglaHudEn: 'VULCAN',
    cardPt: 'VULCÃO HIDROTERMAL',
    cardEn: 'HYDRO VULCAN',
    resumoPt: '4 EN | ATÉ 3,0s CAD!',
    resumoEn: '4 EN | RAMPS TO 3.0s!',
    familiaVisual: 'CADEIA',
    mecanicaEspecial: 'CADEIA_RECARGA',
    reducaoRecargaPorSalvaSeg: 2.5,
    pisoRecargaSeg: 3.0,
    energia: 4,
    pesoKg: 30,
    recargaSeg: 15.5,
    municao: 0,
    soquetes: 1,
    projeteis: 1,
    danoCasco: 1,
    danoSistema: 1,
    danoIonico: 0,
    ignoraBarreira: false,
    ehFeixe: false,
    exigeSalaSubmersa: false,
    chanceFuroPct: 15,
    precoCompra: 95,
    valorVenda: 47,
  },
  {
    id: 'BATERIA_CARGA_HIDRAULICA',
    ordem: 11,
    edicao: 'STEAM_AE',
    nome: '11. Bateria de Carga Hidráulica',
    nomeEn: '11. Hydraulic Charge Battery',
    siglaHudPt: 'CARGA 3',
    siglaHudEn: 'CHARG 3',
    cardPt: 'BATERIA DE CARGA',
    cardEn: 'CHARGE BATTERY',
    resumoPt: 'ESTOCA 3 TIROS (6s)',
    resumoEn: 'STORES 3 SHOTS (6s)',
    familiaVisual: 'CARGA',
    mecanicaEspecial: 'CARGA_ESTOQUE',
    cargasMaximas: 3,
    energia: 2,
    pesoKg: 19,
    recargaSeg: 6.0,
    municao: 0,
    soquetes: 1,
    projeteis: 1,
    danoCasco: 1,
    danoSistema: 1,
    danoIonico: 0,
    ignoraBarreira: false,
    ehFeixe: false,
    exigeSalaSubmersa: false,
    chanceFuroPct: 0,
    precoCompra: 64,
    valorVenda: 32,
  },
  {
    id: 'TORPEDO_CARGA_DUPLA',
    ordem: 12,
    edicao: 'STEAM_AE',
    nome: '12. Lançador Duplo de Torpedo de Carga',
    nomeEn: '12. Twin-Cell Charge Torpedo',
    siglaHudPt: 'TORP C2',
    siglaHudEn: 'TORP C2',
    cardPt: 'TORPEDO DE CARGA',
    cardEn: 'CHARGE TORPEDO',
    resumoPt: 'ESTOCA 2 TORP | 1 MUN',
    resumoEn: '2 CHG TORP | 1 AMMO',
    familiaVisual: 'TORPEDO',
    mecanicaEspecial: 'CARGA_ESTOQUE',
    cargasMaximas: 2,
    energia: 2,
    pesoKg: 24,
    recargaSeg: 8.5,
    municao: 1,
    soquetes: 1,
    projeteis: 1,
    danoCasco: 2,
    danoSistema: 2,
    danoIonico: 0,
    ignoraBarreira: true,
    ehFeixe: false,
    exigeSalaSubmersa: true,
    chanceFuroPct: 80,
    precoCompra: 74,
    valorVenda: 37,
  },
  {
    id: 'CANHAO_PULSO_BIOELETRICO_I',
    ordem: 13,
    edicao: 'STEAM_AE',
    nome: '13. Canhão de Pulso Bio-Elétrico I',
    nomeEn: '13. Bio-Electric Ion Pulse I',
    siglaHudPt: 'ÍON I',
    siglaHudEn: 'ION I',
    cardPt: 'PULSO BIO-ÍON I',
    cardEn: 'BIO-ION PULSE I',
    resumoPt: '1 EN | 1 ÍON POR 6s',
    resumoEn: '1 EN | 1 ION FOR 6s',
    familiaVisual: 'ION',
    mecanicaEspecial: 'PULSO_IONICO',
    energia: 1,
    pesoKg: 9,
    recargaSeg: 7.5,
    municao: 0,
    soquetes: 2,
    projeteis: 1,
    danoCasco: 0,
    danoSistema: 0,
    danoIonico: 1,
    duracaoIonSeg: 6.0,
    ignoraBarreira: false,
    ehFeixe: false,
    exigeSalaSubmersa: false,
    chanceFuroPct: 0,
    precoCompra: 40,
    valorVenda: 20,
  },
  {
    id: 'BOMBARDEIRO_IONICO_PESADO',
    ordem: 14,
    edicao: 'STEAM_AE',
    nome: '14. Bombardeiro Iônico Abissal II',
    nomeEn: '14. Heavy Ion Surge Cannon II',
    siglaHudPt: 'ÍON II',
    siglaHudEn: 'ION II',
    cardPt: 'SURTO IÔNICO II',
    cardEn: 'HEAVY ION SURGE II',
    resumoPt: '2 EN | 2 ÍON POR 10s',
    resumoEn: '2 EN | 2 ION FOR 10s',
    familiaVisual: 'ION',
    mecanicaEspecial: 'PULSO_IONICO',
    energia: 2,
    pesoKg: 18,
    recargaSeg: 11.5,
    municao: 0,
    soquetes: 1,
    projeteis: 1,
    danoCasco: 0,
    danoSistema: 0,
    danoIonico: 2,
    duracaoIonSeg: 10.0,
    ignoraBarreira: false,
    ehFeixe: false,
    exigeSalaSubmersa: false,
    chanceFuroPct: 0,
    precoCompra: 66,
    valorVenda: 33,
  },
  {
    id: 'DISPARADOR_ESPINHOS_QUILHA',
    ordem: 15,
    edicao: 'STEAM_AE',
    nome: '15. Disparador de Espinhos de Quilha',
    nomeEn: '15. Keel Chitin Spike Launcher',
    siglaHudPt: 'ESPINHO',
    siglaHudEn: 'SPIKES',
    cardPt: 'ESPINHOS DE QUILHA',
    cardEn: 'KEEL SPIKE GUN',
    resumoPt: '1 EN | 2x1 60% FURO',
    resumoEn: '1 EN | 2x1 60% BREACH',
    familiaVisual: 'ARPAO',
    energia: 1,
    pesoKg: 11,
    recargaSeg: 10.0,
    municao: 0,
    soquetes: 1,
    projeteis: 2,
    danoCasco: 1,
    danoSistema: 1,
    danoIonico: 0,
    ignoraBarreira: false,
    ehFeixe: false,
    exigeSalaSubmersa: false,
    chanceFuroPct: 60,
    precoCompra: 48,
    valorVenda: 24,
  },
  {
    id: 'CANHAO_PRESSAO_HIDRO',
    ordem: 16,
    edicao: 'STEAM_AE',
    nome: '16. Canhão de Concussão Hidrostática',
    nomeEn: '16. Hydro-Concussion Slug Cannon',
    siglaHudPt: 'HIDRO 2',
    siglaHudEn: 'HYDRO 2',
    cardPt: 'HIDRO-CONCUSSÃO',
    cardEn: 'HYDRO-SLUG CANNON',
    resumoPt: '1 EN | 2 DANO + STUN',
    resumoEn: '1 EN | 2 DMG + STUN',
    familiaVisual: 'RAJADA',
    atordoamentoAlvoSeg: 3.0,
    energia: 1,
    pesoKg: 14,
    recargaSeg: 9.5,
    municao: 0,
    soquetes: 2,
    projeteis: 1,
    danoCasco: 2,
    danoSistema: 2,
    danoIonico: 0,
    ignoraBarreira: false,
    ehFeixe: false,
    exigeSalaSubmersa: false,
    chanceFuroPct: 30,
    precoCompra: 54,
    valorVenda: 27,
  },
  {
    id: 'RAJADA_HIDROPNEUMATICA_III',
    ordem: 17,
    edicao: 'STEAM_AE',
    nome: '17. Rajada Hidropneumática Mk.III',
    nomeEn: '17. Hydropneumatic Burst Mk.III',
    siglaHudPt: 'RAJAD 3',
    siglaHudEn: 'BURST 3',
    cardPt: 'RAJADA HIDRO III',
    cardEn: 'HYDRO BURST III',
    resumoPt: '3 EN | 5x1 DANO | 15s',
    resumoEn: '3 EN | 5x1 DMG | 15s',
    familiaVisual: 'RAJADA',
    energia: 3,
    pesoKg: 26,
    recargaSeg: 15.0,
    municao: 0,
    soquetes: 1,
    projeteis: 5,
    danoCasco: 1,
    danoSistema: 1,
    danoIonico: 0,
    ignoraBarreira: false,
    ehFeixe: false,
    exigeSalaSubmersa: false,
    chanceFuroPct: 0,
    precoCompra: 88,
    valorVenda: 44,
  },
  {
    id: 'DISPERSOR_ABISSAL_MK2',
    ordem: 18,
    edicao: 'STEAM_AE',
    nome: '18. Dispersor de Estilhaços Abissal Mk.II',
    nomeEn: '18. Abyssal Shrapnel Flak Mk.II',
    siglaHudPt: 'FLAK II',
    siglaHudEn: 'FLAK II',
    cardPt: 'FLAK ABISSAL MK.II',
    cardEn: 'ABYSSAL FLAK MK.II',
    resumoPt: '3 EN | 6 FLAK | 16s',
    resumoEn: '3 EN | 6 FLAK | 16s',
    familiaVisual: 'FLAK',
    energia: 3,
    pesoKg: 32,
    recargaSeg: 16.0,
    municao: 0,
    soquetes: 1,
    projeteis: 6,
    danoCasco: 1,
    danoSistema: 1,
    danoIonico: 0,
    ignoraBarreira: false,
    ehFeixe: false,
    exigeSalaSubmersa: false,
    chanceFuroPct: 25,
    precoCompra: 86,
    valorVenda: 43,
  },
  {
    id: 'LANCA_TERMICA_FOCAL',
    ordem: 19,
    edicao: 'STEAM_AE',
    nome: '19. Lança Térmica Focal (Glaive)',
    nomeEn: '19. Focal Thermal Lance (Glaive)',
    siglaHudPt: 'LANÇA 4',
    siglaHudEn: 'LANCE 4',
    cardPt: 'LANÇA TÉRMICA IV',
    cardEn: 'FOCAL GLAIVE BEAM',
    resumoPt: '3 EN | FEIXE 4 DANO!',
    resumoEn: '3 EN | 4 DMG GLAIVE!',
    familiaVisual: 'FEIXE_GLAIVE',
    energia: 3,
    pesoKg: 27,
    recargaSeg: 16.5,
    municao: 0,
    soquetes: 1,
    projeteis: 1,
    danoCasco: 4,
    danoSistema: 4,
    danoIonico: 0,
    ignoraBarreira: false,
    ehFeixe: true,
    exigeSalaSubmersa: false,
    chanceFuroPct: 0,
    precoCompra: 92,
    valorVenda: 46,
  },
  {
    id: 'FEIXE_NEUROTOXICO_BIO',
    ordem: 20,
    edicao: 'STEAM_AE',
    nome: '20. Feixe Bio-Neurotóxico Cirúrgico',
    nomeEn: '20. Surgical Anti-Bio Neuro-Beam',
    siglaHudPt: 'BIOFEIX',
    siglaHudEn: 'BIOBEAM',
    cardPt: 'FEIXE NEUROTÓXICO',
    cardEn: 'ANTI-BIO BEAM',
    resumoPt: '0 CASCO | 45 BIO-DANO',
    resumoEn: '0 HULL | 45 BIO-DMG',
    familiaVisual: 'FEIXE_BIO',
    mecanicaEspecial: 'ANTI_BIO_CIRURGICO',
    danoTripulacaoDireto: 45,
    energia: 2,
    pesoKg: 16,
    recargaSeg: 13.0,
    municao: 0,
    soquetes: 2,
    projeteis: 2,
    danoCasco: 0,
    danoSistema: 0,
    danoIonico: 0,
    ignoraBarreira: false,
    ehFeixe: true,
    exigeSalaSubmersa: false,
    chanceFuroPct: 0,
    precoCompra: 62,
    valorVenda: 31,
  },
  {
    id: 'CORTADOR_CASCO_ABISSAL',
    ordem: 21,
    edicao: 'STEAM_AE',
    nome: '21. Cortador Hidráulico de Casco',
    nomeEn: '21. Hull-Ripper Thermal Beam',
    siglaHudPt: 'CORTA C',
    siglaHudEn: 'HULLBM',
    cardPt: 'CORTADOR DE CASCO',
    cardEn: 'HULL-RIPPER BEAM',
    resumoPt: 'FEIXE 2 SALAS +FURO',
    resumoEn: '2-ROOM BEAM +BREACH',
    familiaVisual: 'FEIXE_PLASMA',
    bonusDanoCascoPuro: 1,
    energia: 2,
    pesoKg: 21,
    recargaSeg: 13.5,
    municao: 0,
    soquetes: 1,
    projeteis: 2,
    danoCasco: 2,
    danoSistema: 1,
    danoIonico: 0,
    ignoraBarreira: false,
    ehFeixe: true,
    exigeSalaSubmersa: false,
    chanceFuroPct: 45,
    precoCompra: 72,
    valorVenda: 36,
  },
  {
    id: 'TORPEDO_CRIO_TERMAL',
    ordem: 22,
    edicao: 'STEAM_AE',
    nome: '22. Torpedo Crio-Termal de Estase',
    nomeEn: '22. Cryo-Thermal Stasis Torpedo',
    siglaHudPt: 'CRIOTRP',
    siglaHudEn: 'CRYOTRP',
    cardPt: 'CRIO-TORPEDO',
    cardEn: 'CRYO TORPEDO',
    resumoPt: '2 DANO + CONGELA 8s',
    resumoEn: '2 DMG + 8s FREEZE',
    familiaVisual: 'TORPEDO_CRIO',
    mecanicaEspecial: 'ESTASE_CRIO',
    atordoamentoAlvoSeg: 8.0,
    energia: 2,
    pesoKg: 23,
    recargaSeg: 12.5,
    municao: 1,
    soquetes: 1,
    projeteis: 1,
    danoCasco: 2,
    danoSistema: 2,
    danoIonico: 1,
    duracaoIonSeg: 6.0,
    ignoraBarreira: true,
    ehFeixe: false,
    exigeSalaSubmersa: true,
    chanceFuroPct: 100,
    precoCompra: 76,
    valorVenda: 38,
  },
  {
    id: 'BOMBA_SIFAO_OSMOTICO',
    ordem: 23,
    edicao: 'STEAM_AE',
    nome: '23. Bomba de Sifão Osmótico',
    nomeEn: '23. Osmotic Siphon Teleport Bomb',
    siglaHudPt: 'B.SIFÃO',
    siglaHudEn: 'OSMOTIC',
    cardPt: 'BOMBA DE SIFÃO',
    cardEn: 'OSMOTIC BOMB',
    resumoPt: '1 SIST +1 ÍON +CURA',
    resumoEn: '1 SYS +1 ION +HEAL',
    familiaVisual: 'BOMBA_OSMOTICA',
    mecanicaEspecial: 'SIFAO_OSMOTICO',
    curaAliadosAbordagemHp: 28,
    energia: 1,
    pesoKg: 11,
    recargaSeg: 10.5,
    municao: 1,
    soquetes: 2,
    projeteis: 1,
    danoCasco: 0,
    danoSistema: 1,
    danoIonico: 1,
    duracaoIonSeg: 6.0,
    ignoraBarreira: true,
    ehFeixe: false,
    exigeSalaSubmersa: false,
    chanceFuroPct: 0,
    precoCompra: 52,
    valorVenda: 26,
  },
  {
    id: 'MORTEIRO_ACIDO_CORROSIVO',
    ordem: 24,
    edicao: 'STEAM_AE',
    nome: '24. Morteiro de Ácido Abissal',
    nomeEn: '24. Abyssal Corrosive Acid Mortar',
    siglaHudPt: 'M.ÁCIDO',
    siglaHudEn: 'MORTAR',
    cardPt: 'MORTEIRO ÁCIDO',
    cardEn: 'CORROSIVE MORTAR',
    resumoPt: '3 SIST + ÁCIDO 6s',
    resumoEn: '3 SYS + 6s ACID DOT',
    familiaVisual: 'BOMBA_BIO',
    mecanicaEspecial: 'CORROSAO_ACIDA',
    duracaoAcidoSeg: 6.0,
    energia: 2,
    pesoKg: 17,
    recargaSeg: 12.0,
    municao: 1,
    soquetes: 1,
    projeteis: 1,
    danoCasco: 1,
    danoSistema: 3,
    danoIonico: 0,
    ignoraBarreira: true,
    ehFeixe: false,
    exigeSalaSubmersa: false,
    chanceFuroPct: 100,
    precoCompra: 64,
    valorVenda: 32,
  },
]);

export const CATALOGO_24_ARMAS_STEAM = congelarPuro([
  ...CATALOGO_ARMAS_51.map((a) => ({
    ...a,
    edicao: 'CLASSICO_GDD',
    danoIonico: 0,
    ...(METADADOS_BASE_ARMAS[a.id] ?? {}),
  })),
  ...ARMAS_EXPANSAO_AE_17,
]);

const METADADOS_BASE_ORGAOS = Object.freeze({
  GLANDULA_BAIACU: {
    nomeEn: '1. Puffer Neurotoxin Gland',
    cardPt: 'GLÂNDULA DE BAIACU',
    cardEn: 'PUFFER TOXIN GLAND',
    resumoPt: 'VENENO 6/s POR 10s',
    resumoEn: 'POISON 6/s FOR 10s',
    passivoCurtoPt: 'ENXERTO: NEUROTOXINA',
    passivoCurtoEn: 'SOCKET: NEUROTOXIN',
  },
  ELETRO_PLACA_ARRAIA: {
    nomeEn: '2. Electric Ray Ion Plate',
    cardPt: 'ELETRO-PLACA VIVA',
    cardEn: 'RAY ELECTRO-PLATE',
    resumoPt: 'IONIZA 1 BARRA (6s)',
    resumoEn: 'IONIZES 1 BAR (6s)',
    passivoCurtoPt: 'ENXERTO: CHOQUE ÍON',
    passivoCurtoEn: 'SOCKET: ION SHOCK',
  },
  BEXIGA_ALTA_PRESSAO: {
    nomeEn: '3. High-Pressure Swim Bladder',
    cardPt: 'BEXIGA DE PRESSÃO',
    cardEn: 'PRESSURE BLADDER',
    resumoPt: '+15kg H2O + ATORDOA',
    resumoEn: '+15kg FLOOD + 2s STUN',
    passivoCurtoPt: 'ENXERTO: CONCUSSÃO',
    passivoCurtoEn: 'SOCKET: HYDRO STUN',
  },
  BOLSA_TINTA_ABISSAL: {
    nomeEn: '4. Abyssal Ink Blindness Sac',
    cardPt: 'BOLSA DE TINTA',
    cardEn: 'ABYSSAL INK SAC',
    resumoPt: 'CEGA ALVO -40% PREC',
    resumoEn: 'BLINDS -40% ACC (8s)',
    passivoCurtoPt: 'ENXERTO: NÉVOA CEGA',
    passivoCurtoEn: 'SOCKET: BLINDING INK',
  },
  DENTE_LEVIATA: {
    nomeEn: '5. Serrated Leviathan Fang',
    cardPt: 'DENTE DE LEVIATÃ',
    cardEn: 'LEVIATHAN FANG',
    resumoPt: '+1 DANO S/ BARREIRA',
    resumoEn: '+1 SYS DMG UNSHIELDED',
    passivoCurtoPt: 'ENXERTO: PERFURAÇÃO',
    passivoCurtoEn: 'SOCKET: ARMOR PIERCE',
  },
  GLANDULA_TERMOFILICA: {
    nomeEn: '6. Thermophilic Boil Gland',
    cardPt: 'BULBO TERMOFÍLICO',
    cardEn: 'THERMOPHILIC GLAND',
    resumoPt: 'FERVE SALA 4 HP/s',
    resumoEn: 'BOILS ROOM 4/s +STEAM',
    passivoCurtoPt: 'ENXERTO: FERVURA',
    passivoCurtoEn: 'SOCKET: THERMAL BOIL',
  },
});

export const ORGAOS_EXPANSAO_AE_10 = congelarPuro([
  {
    id: 'SINAPSE_PRE_IGNICAO',
    ordem: 7,
    edicao: 'STEAM_AE',
    categoriaEnxerto: 'CASCO_PASSIVO',
    nome: '7. Sinapse de Pré-Ignição Neural',
    nomeEn: '7. Neural Pre-Igniter Synapse',
    cardPt: 'SINAPSE PRÉ-CARGA',
    cardEn: 'NEURAL PRE-IGNITER',
    resumoPt: '85% PRÉ-CARGA ARMAS!',
    resumoEn: '85% WEAPON PRE-CHG!',
    passivoCurtoPt: 'PORÃO: PRÉ-CARGA 85%',
    passivoCurtoEn: 'HOLD: 85% PRE-CHARGE',
    pesoKg: PESO_ORGAO_ENXERTADO_KG,
    penalidadeRecargaSeg: 0,
    preIgnicaoCombatePct: 0.85,
    precoCompra: 85,
    valorVenda: 42,
  },
  {
    id: 'ALETA_ESTABILIZADORA_FOIL',
    ordem: 8,
    edicao: 'STEAM_AE',
    categoriaEnxerto: 'CASCO_PASSIVO',
    nome: '8. Aleta Estabilizadora de Hidro-Foil',
    nomeEn: '8. Hydrofoil Stabilizer Fin',
    cardPt: 'ALETA HIDRO-FOIL',
    cardEn: 'FOIL STABILIZER',
    resumoPt: '+28 kg LIMITE FOIL',
    resumoEn: '+28 kg HYDROFOIL LIFT',
    passivoCurtoPt: 'PORÃO: +28kg LIMITE',
    passivoCurtoEn: 'HOLD: +28kg LIFT',
    pesoKg: PESO_ORGAO_ENXERTADO_KG,
    penalidadeRecargaSeg: 0,
    bonusSustentacaoFoilKg: 28,
    precoCompra: 52,
    valorVenda: 26,
  },
  {
    id: 'BRANQUIA_OSMOSE_REVERSA',
    ordem: 9,
    edicao: 'STEAM_AE',
    categoriaEnxerto: 'CASCO_PASSIVO',
    nome: '9. Brânquia de Osmose Reversa',
    nomeEn: '9. Reverse Osmosis Symbiotic Gill',
    cardPt: 'BRÂNQUIA OSMÓTICA',
    cardEn: 'OSMOSIS BIO-GILL',
    resumoPt: '+2,5 HP/s NA ÁGUA',
    resumoEn: '+2.5 HP/s IN WATER',
    passivoCurtoPt: 'PORÃO: CURA HIDRÁULICA',
    passivoCurtoEn: 'HOLD: FLOODED REGEN',
    pesoKg: PESO_ORGAO_ENXERTADO_KG,
    penalidadeRecargaSeg: 0,
    curaTripulacaoAlagadaHpSeg: 2.5,
    precoCompra: 56,
    valorVenda: 28,
  },
  {
    id: 'ENZIMA_DIGESTORA_SUCATA',
    ordem: 10,
    edicao: 'STEAM_AE',
    categoriaEnxerto: 'CASCO_PASSIVO',
    nome: '10. Enzima Digestora de Sucata',
    nomeEn: '10. Scrap-Digesting Bio-Enzyme',
    cardPt: 'ENZIMA DE SUCATA',
    cardEn: 'SCRAP BIO-ENZYME',
    resumoPt: '+20% SUCATA & BIO!',
    resumoEn: '+20% SCRAP & BIOMASS!',
    passivoCurtoPt: 'PORÃO: +20% SAQUE',
    passivoCurtoEn: 'HOLD: +20% SALVAGE',
    pesoKg: PESO_ORGAO_ENXERTADO_KG,
    penalidadeRecargaSeg: 0,
    multiplicadorSaqueBonus: 0.20,
    precoCompra: 50,
    valorVenda: 25,
  },
  {
    id: 'VESICULA_HIPERBARICA',
    ordem: 11,
    edicao: 'STEAM_AE',
    categoriaEnxerto: 'CASCO_PASSIVO',
    nome: '11. Vesícula Hiperbárica de Emergência',
    nomeEn: '11. Hyperbaric Spool-Up Vesicle',
    cardPt: 'BOLSA HIPERBÁRICA',
    cardEn: 'HYPERBARIC VESICLE',
    resumoPt: '-40% SPOOL/ROMBO +8EV',
    resumoEn: '-40% SPOOL/LEAK +8EV',
    passivoCurtoPt: 'PORÃO: SPOOL +8% EV',
    passivoCurtoEn: 'HOLD: SPOOL +8% EV',
    pesoKg: PESO_ORGAO_ENXERTADO_KG,
    penalidadeRecargaSeg: 0,
    reducaoSpoolUpPct: 0.40,
    bonusEsquivaFoilPct: 8,
    precoCompra: 48,
    valorVenda: 24,
  },
  {
    id: 'BOLSA_SIMBIONTE_SANGUESSUGA',
    ordem: 12,
    edicao: 'STEAM_AE',
    categoriaEnxerto: 'CASCO_PASSIVO',
    nome: '12. Bolsa de Simbionte Sanguessuga',
    nomeEn: '12. Leech Boarding Symbiont Sac',
    cardPt: 'BOLSA SANGUESSUGA',
    cardEn: 'LEECH SYMBIONT SAC',
    resumoPt: 'BORDO DRENA +4 HP/s',
    resumoEn: 'BOARDERS +4 HP/s',
    passivoCurtoPt: 'PORÃO: VAMPIRISMO',
    passivoCurtoEn: 'HOLD: BOARDER LEECH',
    pesoKg: PESO_ORGAO_ENXERTADO_KG,
    penalidadeRecargaSeg: 0,
    vampirismoAbordagemHpSeg: 4.0,
    venenoHpPorSeg: 4,
    duracaoVenenoSeg: 6,
    precoCompra: 54,
    valorVenda: 27,
  },
  {
    id: 'CRISTA_REFRACAO_ACUSTICA',
    ordem: 13,
    edicao: 'STEAM_AE',
    categoriaEnxerto: 'CASCO_PASSIVO',
    nome: '13. Crista Quitina de Refração Acústica',
    nomeEn: '13. Chitin Acoustic Plating Crest',
    cardPt: 'CRISTA DE QUITINA',
    cardEn: 'CHITIN ARMOR CREST',
    resumoPt: '20% DEFLEXÃO CASCO',
    resumoEn: '20% HULL DEFLECT',
    passivoCurtoPt: 'PORÃO: 20% DEFLEXÃO',
    passivoCurtoEn: 'HOLD: 20% DEFLECT',
    pesoKg: PESO_ORGAO_ENXERTADO_KG,
    penalidadeRecargaSeg: 0,
    chanceDefletirCascoPct: 20,
    precoCompra: 58,
    valorVenda: 29,
  },
  {
    id: 'GANGLIO_RECICLADOR_MUNICAO',
    ordem: 14,
    edicao: 'STEAM_AE',
    categoriaEnxerto: 'CASCO_PASSIVO',
    nome: '14. Gânglio Sintetizador de Munição',
    nomeEn: '14. Bio-Ammo Replicator Ganglion',
    cardPt: 'GÂNGLIO DE MUNIÇÃO',
    cardEn: 'AMMO REPLICATOR',
    resumoPt: '35% CHANCE 0 MUNIÇÃO!',
    resumoEn: '35% FREE AMMO SHOT!',
    passivoCurtoPt: 'PORÃO: 35% 0 MUNIÇÃO',
    passivoCurtoEn: 'HOLD: 35% AMMO SAVE',
    pesoKg: PESO_ORGAO_ENXERTADO_KG,
    penalidadeRecargaSeg: 0,
    chanceEconomizarMunicaoPct: 35,
    precoCompra: 55,
    valorVenda: 27,
  },
  {
    id: 'OLHO_SONAR_ABISSAL',
    ordem: 15,
    edicao: 'STEAM_AE',
    categoriaEnxerto: 'CASCO_PASSIVO',
    nome: '15. Olho Composto de Sonar Abissal',
    nomeEn: '15. Abyssal Long-Range Sonar Eye',
    cardPt: 'OLHO SONAR ABISSAL',
    cardEn: 'ABYSSAL SONAR EYE',
    resumoPt: 'MAPA +10% PRECISÃO',
    resumoEn: 'MAP +10% ACCURACY',
    passivoCurtoPt: 'PORÃO: SONAR SETORIAL',
    passivoCurtoEn: 'HOLD: SECTOR SONAR',
    pesoKg: PESO_ORGAO_ENXERTADO_KG,
    penalidadeRecargaSeg: 0,
    revelaNosAdjacentesMapa: true,
    bonusPrecisaoArmasPct: 10,
    precoCompra: 46,
    valorVenda: 23,
  },
  {
    id: 'MEDULA_REGENERATIVA_CORAL',
    ordem: 16,
    edicao: 'STEAM_AE',
    categoriaEnxerto: 'CASCO_PASSIVO',
    nome: '16. Medula Regenerativa de Coral',
    nomeEn: '16. Coral Regenerative Hull Marrow',
    cardPt: 'MEDULA DE CORAL',
    cardEn: 'CORAL HULL MARROW',
    resumoPt: '+2 HP CASCO / SALTO!',
    resumoEn: '+2 HULL HP / JUMP!',
    passivoCurtoPt: 'PORÃO: +2 HP / SALTO',
    passivoCurtoEn: 'HOLD: +2 HP / JUMP',
    pesoKg: PESO_ORGAO_ENXERTADO_KG,
    penalidadeRecargaSeg: 0,
    reparaCascoPorSaltoHp: 2,
    precoCompra: 60,
    valorVenda: 30,
  },
]);

export const CATALOGO_16_ORGAOS_STEAM = congelarPuro([
  ...CATALOGO_ORGAOS_52.map((o) => ({
    ...o,
    edicao: 'CLASSICO_GDD',
    categoriaEnxerto: 'SOQUETE_ARMA',
    ...(METADADOS_BASE_ORGAOS[o.id] ?? {}),
  })),
  ...ORGAOS_EXPANSAO_AE_10,
]);

export function obterCatalogo24ArmasSteam() {
  return CATALOGO_24_ARMAS_STEAM;
}

export function obterCatalogo16OrgaosSteam() {
  return CATALOGO_16_ORGAOS_STEAM;
}

export function resolverArmaCatalogoUnificado(chassiId) {
  const id = String(chassiId ?? '').trim().toUpperCase();
  return CATALOGO_24_ARMAS_STEAM.find((a) => a.id === id) ?? null;
}

const ALIASES_ORGAOS_LEGADO = Object.freeze({
  GLANDULA_DE_TERMO_RESISTENCIA: 'GLANDULA_TERMOFILICA',
  GLANDULA_TERMO_RESISTENCIA: 'GLANDULA_TERMOFILICA',
  BEXIGA_PRESSAO_ABISSAL: 'BEXIGA_ALTA_PRESSAO',
  BEXIGA_DE_CONTROLE_DE_PRESSAO: 'BEXIGA_ALTA_PRESSAO',
  BOLSA_TINTA_CEGANTE: 'BOLSA_TINTA_ABISSAL',
  BOLSA_DE_TINTA_ABISSAL: 'BOLSA_TINTA_ABISSAL',
  DENTE_LEVIATA_SERRILHADO: 'DENTE_LEVIATA',
});

export function resolverOrgaoCatalogoUnificado(orgaoId) {
  const bruto = String(orgaoId ?? '').trim().toUpperCase();
  const id = ALIASES_ORGAOS_LEGADO[bruto] ?? bruto;
  return CATALOGO_16_ORGAOS_STEAM.find((o) => o.id === id) ?? null;
}

/**
 * Calcula todos os bônus passivos acumulados pelos órgãos AE presentes no Porão ou enxertados nas armas.
 */
export function calcularModificadoresPassivosOrgaosSteam(naveJogador) {
  if (!naveJogador || typeof naveJogador !== 'object') {
    return congelarPuro({
      preIgnicaoCombatePct: 0,
      bonusSustentacaoFoilKg: 0,
      curaTripulacaoAlagadaHpSeg: 0,
      multiplicadorSaqueBonus: 0,
      reducaoSpoolUpPct: 0,
      bonusEsquivaFoilPct: 0,
      vampirismoAbordagemHpSeg: 0,
      chanceDefletirCascoPct: 0,
      chanceEconomizarMunicaoPct: 0,
      revelaNosAdjacentesMapa: false,
      bonusPrecisaoArmasPct: 0,
      reparaCascoPorSaltoHp: 0,
      idsOrgaosAtivos: [],
    });
  }

  const idsColetados = [];
  if (Array.isArray(naveJogador)) {
    for (const item of naveJogador) {
      const id = typeof item === 'string' ? item : item?.id;
      const spec = id ? resolverOrgaoCatalogoUnificado(id) : null;
      if (spec && spec.categoriaEnxerto === 'CASCO_PASSIVO') idsColetados.push(spec.id);
    }
  } else {
    for (const entrada of [
      ...(naveJogador.porao ?? []),
      ...(naveJogador.poraoCarga ?? []),
      ...(naveJogador.implantesPassivos ?? []),
    ]) {
      const itemP = entrada && typeof entrada === 'object' && 'item' in entrada ? entrada.item : entrada;
      const idP = typeof itemP === 'string' ? itemP : itemP?.id;
      const specP = idP ? resolverOrgaoCatalogoUnificado(idP) : null;
      if (specP && specP.categoriaEnxerto === 'CASCO_PASSIVO') {
        idsColetados.push(specP.id);
      }
    }
  }

  let preIgnicaoCombatePct = 0;
  let bonusSustentacaoFoilKg = 0;
  let curaTripulacaoAlagadaHpSeg = 0;
  let multiplicadorSaqueBonus = 0;
  let reducaoSpoolUpPct = 0;
  let bonusEsquivaFoilPct = 0;
  let vampirismoAbordagemHpSeg = 0;
  let chanceDefletirCascoPct = 0;
  let chanceEconomizarMunicaoPct = 0;
  let revelaNosAdjacentesMapa = false;
  let bonusPrecisaoArmasPct = 0;
  let reparaCascoPorSaltoHp = 0;

  for (const idOrg of idsColetados) {
    const def = resolverOrgaoCatalogoUnificado(idOrg);
    if (!def) continue;
    preIgnicaoCombatePct = Math.max(preIgnicaoCombatePct, Number(def.preIgnicaoCombatePct ?? 0));
    bonusSustentacaoFoilKg += Number(def.bonusSustentacaoFoilKg ?? 0);
    curaTripulacaoAlagadaHpSeg += Number(def.curaTripulacaoAlagadaHpSeg ?? 0);
    multiplicadorSaqueBonus += Number(def.multiplicadorSaqueBonus ?? 0);
    reducaoSpoolUpPct = Math.min(0.65, reducaoSpoolUpPct + Number(def.reducaoSpoolUpPct ?? 0));
    bonusEsquivaFoilPct += Number(def.bonusEsquivaFoilPct ?? 0);
    vampirismoAbordagemHpSeg += Number(def.vampirismoAbordagemHpSeg ?? 0);
    chanceDefletirCascoPct = Math.min(45, chanceDefletirCascoPct + Number(def.chanceDefletirCascoPct ?? 0));
    chanceEconomizarMunicaoPct = Math.min(70, chanceEconomizarMunicaoPct + Number(def.chanceEconomizarMunicaoPct ?? 0));
    if (def.revelaNosAdjacentesMapa) revelaNosAdjacentesMapa = true;
    bonusPrecisaoArmasPct += Number(def.bonusPrecisaoArmasPct ?? 0);
    reparaCascoPorSaltoHp += Number(def.reparaCascoPorSaltoHp ?? 0);
  }

  return congelarPuro({
    preIgnicaoCombatePct,
    bonusSustentacaoFoilKg,
    curaTripulacaoAlagadaHpSeg,
    multiplicadorSaqueBonus,
    reducaoSpoolUpPct,
    bonusEsquivaFoilPct,
    vampirismoAbordagemHpSeg,
    chanceDefletirCascoPct,
    chanceEconomizarMunicaoPct,
    revelaNosAdjacentesMapa,
    bonusPrecisaoArmasPct,
    reparaCascoPorSaltoHp,
    idsOrgaosAtivos: idsColetados,
  });
}

/**
 * Subsistemas Táticos Compráveis estilo *FTL: Advanced Edition* (Hacking, Mind Control, Defense Drone + Tubo/Tinta):
 * Transformam a arquitetura tática de meio de run sem pesar no hidrofólio (`pesoKg: 0`).
 */
export const CATALOGO_SUBSISTEMAS_TATICO_STEAM = congelarPuro([
  {
    id: 'SUBSISTEMA_SONDA_SABOTAGEM',
    categoria: 'SUBSISTEMA',
    moeda: 'SUCATA',
    preco: 70,
    precoCompra: 70,
    valorVenda: 0,
    pesoKg: 0,
    edicao: 'STEAM_AE',
    teclaAtalho: 'H',
    nomeCurtoPt: 'SONDA HACK [H]',
    nomeCurtoEn: 'HACK PROBE [H]',
    resumoCurtoPt: '-2 ESCUDO + ION 7S (1M)',
    resumoCurtoEn: '-2 SHLD + 7S ION (1M)',
  },
  {
    id: 'SUBSISTEMA_PARASITA_NEURAL',
    categoria: 'SUBSISTEMA',
    moeda: 'BIOMASSA',
    preco: 65,
    precoCompra: 65,
    valorVenda: 0,
    pesoKg: 0,
    edicao: 'STEAM_AE',
    teclaAtalho: 'N',
    nomeCurtoPt: 'ESPORO NEURAL [N]',
    nomeCurtoEn: 'NEURO SPORE [N]',
    resumoCurtoPt: 'DOMINA INIMIGO 8S',
    resumoCurtoEn: 'MIND CTRL 8S',
  },
  {
    id: 'SUBSISTEMA_DRONE_DEFESA',
    categoria: 'SUBSISTEMA',
    moeda: 'SUCATA',
    preco: 75,
    precoCompra: 75,
    valorVenda: 0,
    pesoKg: 0,
    edicao: 'STEAM_AE',
    teclaAtalho: null,
    nomeCurtoPt: 'DRONE DEFESA MK1',
    nomeCurtoEn: 'DEFENSE DRONE I',
    resumoCurtoPt: 'ABATE TORPEDO/MINA 9S',
    resumoCurtoEn: 'INTERCEPTS TORP/9S',
  },
  {
    id: 'SUBSISTEMA_DRONE_REPARO',
    categoria: 'SUBSISTEMA',
    moeda: 'SUCATA',
    preco: 65,
    precoCompra: 65,
    valorVenda: 0,
    pesoKg: 0,
    edicao: 'STEAM_AE',
    teclaAtalho: null,
    nomeCurtoPt: 'DRONE REPARO MK1',
    nomeCurtoEn: 'HULL REPAIR DRONE',
    resumoCurtoPt: '+1 CASCO A CADA 12S',
    resumoCurtoEn: '+1 HULL EVERY 12S',
  },
  {
    id: 'SUBSISTEMA_DRONE_ATAQUE',
    categoria: 'SUBSISTEMA',
    moeda: 'SUCATA',
    preco: 80,
    precoCompra: 80,
    valorVenda: 0,
    pesoKg: 0,
    edicao: 'STEAM_AE',
    teclaAtalho: null,
    nomeCurtoPt: 'DRONE ASSALTO MK1',
    nomeCurtoEn: 'COMBAT DRONE I',
    resumoCurtoPt: 'PULSO AUTO 1 DANO/8.5S',
    resumoCurtoEn: 'AUTO-SHOT 1 DMG/8.5S',
  },
  {
    id: 'SUBSISTEMA_TUBO_PRESSURIZADO',
    categoria: 'SUBSISTEMA',
    moeda: 'BIOMASSA',
    preco: 60,
    precoCompra: 60,
    valorVenda: 0,
    pesoKg: 0,
    edicao: 'STEAM_AE',
    camaraAlvoInstalacao: 7,
    nomeCurtoPt: 'TUBO ABORDAGEM',
    nomeCurtoEn: 'BOARDING LOCK',
    resumoCurtoPt: 'INSTALA C7 ABORDAGEM',
    resumoCurtoEn: 'INSTALLS C7 BOARDING',
  },
  {
    id: 'SUBSISTEMA_TINTA_FURTIVA',
    categoria: 'SUBSISTEMA',
    moeda: 'BIOMASSA',
    preco: 75,
    precoCompra: 75,
    valorVenda: 0,
    pesoKg: 0,
    edicao: 'STEAM_AE',
    camaraAlvoInstalacao: 8,
    nomeCurtoPt: 'GLÂNDULA FURTIVA',
    nomeCurtoEn: 'CLOAKING GLAND',
    resumoCurtoPt: 'INSTALA C8 +60% ESQ',
    resumoCurtoEn: 'INSTALLS C8 +60% EVD',
  },
]);

export function obterCatalogoSubsistemasTaticosSteam() {
  return CATALOGO_SUBSISTEMAS_TATICO_STEAM;
}

/**
 * Registra XP de maestria (`pilotagem`, `armas`, `barreira`, `reparo`, `combate`) em um tripulante aliado
 * de forma pura e determinística (`0` -> `★` Veterano c/ 3 ações -> `★★` Elite c/ 8 ações).
 */
export function registrarXpTripulanteSteam(tripulante, disciplina = 'pilotagem', pontos = 1) {
  if (!tripulante || typeof tripulante !== 'object') return tripulante;
  const xpAnt = tripulante.xpMaestria ?? {};
  const xpNovo = {
    pilotagem: Number(xpAnt.pilotagem ?? 0),
    armas: Number(xpAnt.armas ?? 0),
    barreira: Number(xpAnt.barreira ?? 0),
    reparo: Number(xpAnt.reparo ?? 0),
    combate: Number(xpAnt.combate ?? 0),
  };
  const chave = Object.prototype.hasOwnProperty.call(xpNovo, disciplina) ? disciplina : 'pilotagem';
  xpNovo[chave] += Math.max(0, Number(pontos) || 0);
  const ordenadas = Object.entries(xpNovo).sort((a, b) => b[1] - a[1]);
  const maxXp = Number(ordenadas[0]?.[1] ?? 0);
  const nvCalculado = maxXp >= 8 ? 2 : maxXp >= 3 ? 1 : 0;
  const nivelMaestria = Math.max(Number(tripulante.nivelMaestria ?? 0), nvCalculado);
  return congelarPuro({
    ...tripulante,
    xpMaestria: xpNovo,
    nivelMaestria,
    disciplinaMaestria: ordenadas[0]?.[0] ?? chave,
  });
}

/**
 * Catálogo completo da Loja Recife-Forja na Edição Steam (Base + 17 Armas AE + 10 Órgãos AE + 5 Subsistemas Táticos)
 * e gerador determinístico de vitrine de 8 ofertas balanceadas por setor (combustível, munição, armas, órgãos, subsistema e tripulação).
 */
export const CATALOGO_LOJA_STEAM_COMPLETO = congelarPuro([
  ...CATALOGO_LOJA_56B,
  ...ARMAS_EXPANSAO_AE_17.map((a) => ({
    id: a.id,
    categoria: 'ARMA',
    moeda: 'SUCATA',
    preco: a.precoCompra,
    valorVenda: a.valorVenda,
    pesoKg: a.pesoKg,
    edicao: 'STEAM_AE',
    nomeCurtoPt: a.cardPt,
    nomeCurtoEn: a.cardEn,
    resumoCurtoPt: a.resumoPt,
    resumoCurtoEn: a.resumoEn,
  })),
  ...ORGAOS_EXPANSAO_AE_10.map((o) => ({
    id: o.id,
    categoria: 'ORGAO',
    moeda: 'BIOMASSA',
    preco: o.precoCompra,
    valorVenda: o.valorVenda,
    pesoKg: o.pesoKg,
    edicao: 'STEAM_AE',
    nomeCurtoPt: o.cardPt,
    nomeCurtoEn: o.cardEn,
    resumoCurtoPt: o.resumoPt,
    resumoCurtoEn: o.resumoEn,
  })),
  ...CATALOGO_SUBSISTEMAS_TATICO_STEAM,
]);

export function sortearVitrineLojaSteam(seedPartida, setorNumero, noIndice = 0, naveJogador = null) {
  const seedStr = String(seedPartida || 'SEED_STEAM_AE');
  const s = Math.max(1, Math.min(8, Number(setorNumero) || 1));
  const poolArmas = CATALOGO_24_ARMAS_STEAM.filter((a) => (s <= 2 ? a.precoCompra <= 76 : true));
  const poolOrgaos = CATALOGO_16_ORGAOS_STEAM;
  const poolTrip = CATALOGO_LOJA_56B.filter((i) => i.categoria === 'TRIPULANTE');
  const subsAtuais = naveJogador?.subsistemasTaticosSteam ?? {};
  const cam7Inst = Number(naveJogador?.camaras?.find((c) => c.id === 7)?.nivelMaxBarras ?? 0) > 0;
  const cam8Inst = Number(naveJogador?.camaras?.find((c) => c.id === 8)?.nivelMaxBarras ?? 0) > 0;
  const poolSubsCandidatos = CATALOGO_SUBSISTEMAS_TATICO_STEAM.filter((sub) => {
    if (sub.id === 'SUBSISTEMA_SONDA_SABOTAGEM' && subsAtuais.sondaSabotagem) return false;
    if (sub.id === 'SUBSISTEMA_PARASITA_NEURAL' && subsAtuais.parasitaNeural) return false;
    if (sub.id === 'SUBSISTEMA_DRONE_DEFESA' && subsAtuais.droneDefesa) return false;
    if (sub.id === 'SUBSISTEMA_DRONE_REPARO' && subsAtuais.droneReparo) return false;
    if (sub.id === 'SUBSISTEMA_DRONE_ATAQUE' && subsAtuais.droneAtaque) return false;
    if (sub.id === 'SUBSISTEMA_TUBO_PRESSURIZADO' && naveJogador && cam7Inst) return false;
    if (sub.id === 'SUBSISTEMA_TINTA_FURTIVA' && naveJogador && cam8Inst) return false;
    return true;
  });

  const sortearSemRepetir = (lista, qtd, salBase) => {
    const copia = [...lista];
    const escolhidos = [];
    for (let k = 0; k < qtd && copia.length > 0; k += 1) {
      const u = streamLojaEstoque(seedStr, s * 100 + noIndice * 13, salBase + k) >>> 0;
      const idx = u % copia.length;
      escolhidos.push(copia.splice(idx, 1)[0]);
    }
    return escolhidos;
  };

  const usarSlotSubsistema = poolSubsCandidatos.length > 0;
  const armas = sortearSemRepetir(poolArmas, usarSlotSubsistema ? 2 : 3, 10).map((a) => ({
    id: a.id,
    categoria: 'ARMA',
    moeda: 'SUCATA',
    preco: a.precoCompra,
    valorVenda: a.valorVenda,
    pesoKg: a.pesoKg,
    estoqueInicial: 1,
    estoqueRestante: 1,
    estoqueMax: 1,
  }));
  const orgaos = sortearSemRepetir(poolOrgaos, 2, 30).map((o) => ({
    id: o.id,
    categoria: 'ORGAO',
    moeda: 'BIOMASSA',
    preco: o.precoCompra,
    valorVenda: o.valorVenda,
    pesoKg: o.pesoKg,
    estoqueInicial: 1,
    estoqueRestante: 1,
    estoqueMax: 1,
  }));
  const subsistemaOferta = usarSlotSubsistema
    ? sortearSemRepetir(poolSubsCandidatos, 1, 44).map((sub) => ({
        ...sub,
        estoqueInicial: 1,
        estoqueRestante: 1,
        estoqueMax: 1,
      }))
    : [];
  const extras = sortearSemRepetir(poolTrip, 1, 50).map((e) => ({
    ...e,
    estoqueInicial: 1,
    estoqueRestante: 1,
    estoqueMax: 1,
  }));

  const estComb = 5 + ((streamLojaEstoque(seedStr, s, 71) >>> 0) % 4);
  const estMun = 4 + ((streamLojaEstoque(seedStr, s, 72) >>> 0) % 4);
  const suprimentos = [
    {
      id: 'COMBUSTIVEL_1UN',
      categoria: 'SUPRIMENTO',
      moeda: 'SUCATA',
      preco: 3,
      valorVenda: 1,
      pesoKg: 0,
      estoqueInicial: estComb,
      estoqueRestante: estComb,
      estoqueMax: estComb,
    },
    {
      id: 'MUNICAO_1UN',
      categoria: 'SUPRIMENTO',
      moeda: 'SUCATA',
      preco: 4,
      valorVenda: 2,
      pesoKg: 0,
      estoqueInicial: estMun,
      estoqueRestante: estMun,
      estoqueMax: estMun,
    },
  ];

  return congelarPuro([...suprimentos, ...armas, ...orgaos, ...subsistemaOferta, ...extras]);
}

const HP_PADRAO_POR_ESPECIE_AE = Object.freeze({
  POLVO: 80,
  ARRAIA: 70,
  BAIACU: 150,
  CARANGUEJO: 110,
});

const MAPA_SISTEMA_CAMARA_AE = Object.freeze({
  ARTILHARIA_DORSAL: 1,
  CORTEX_NAVEGACAO: 2,
  BOMBA_BRANQUIAL: 3,
  GLANDULA_BARREIRA: 4,
  SIFAO_PROPULSAO: 5,
  MASTRO_FOIL: 6,
  TUBO_PRESSURIZADO: 7,
  GLANDULA_TINTA_FURTIVA: 8,
});

/**
 * Aplica de forma pura o Layout A/B selecionado (`grafoAdjacencia`, `slotsArmasAtivos`, `kitVariante` com as
 * 24 armas e 16 órgãos) e a Dificuldade (`FACIL`, `NORMAL`, `DIFICIL`) ao iniciar uma nova expedição Steam.
 */
export function aplicarKitLayoutEDificuldadeSteamNaRun(estadoBase, opcoes = {}) {
  if (!estadoBase || typeof estadoBase !== 'object') return estadoBase;
  const arq = opcoes.idArquitetura ?? estadoBase.naveJogador?.idArquitetura ?? 'CARCACA_ALFA';
  const variante = opcoes.variante === 'B' ? 'B' : 'A';
  const layout = resolverLayoutNaveSteam(arq, variante);
  const cfgDif = obterConfiguracaoDificuldadeSteam(opcoes.dificuldade ?? estadoBase.meta?.dificuldade ?? 'NORMAL');
  const cfgSteam = criarConfiguracoesSteam(opcoes.configuracoesSteam ?? estadoBase.meta?.configuracoesSteam ?? { dificuldadePadrao: cfgDif.id });

  const naveAnt = estadoBase.naveJogador ?? {};
  const kit = layout.kitVariante ?? {};
  let camaras = (naveAnt.camaras ?? []).map((c) => ({ ...c }));

  if (variante === 'B') {
    for (const [chaveSis, nvMin] of Object.entries(kit.sistemasExtrasNivel ?? {})) {
      const idCam = MAPA_SISTEMA_CAMARA_AE[chaveSis];
      const alvoNv = Number(nvMin ?? 0);
      camaras = camaras.map((c) =>
        c.id === idCam && alvoNv > Number(c.nivelMaxBarras ?? c.barrasIntegridadeMax ?? c.barrasIntegridade ?? 0)
          ? {
              ...c,
              instalado: true,
              nivelMaxBarras: alvoNv,
              nivelMax: alvoNv,
              barrasNivelMax: alvoNv,
              barrasIntegridadeMax: alvoNv,
              integridadeMax: alvoNv,
              barrasIntegridade: alvoNv,
              integridade: alvoNv,
            }
          : c
      );
    }
  }

  // Monta slots dorsais (até 4, respeitando `slotsArmasAtivos` e equipando o kit da Variante B quando aplicável)
  const armasKitIds = variante === 'B' && Array.isArray(kit.armasIniciais) ? kit.armasIniciais : null;
  let armasAtivas = (naveAnt.armasAtivas ?? []).map((s, idx) => ({ ...s, slotIndex: idx }));
  while (armasAtivas.length < 4) {
    armasAtivas.push({ slotIndex: armasAtivas.length, arma: null });
  }
  if (armasKitIds) {
    const somaEnergiaKit = armasKitIds
      .slice(0, layout.slotsArmasAtivos)
      .reduce((acc, idArma) => acc + Number(resolverArmaCatalogoUnificado(idArma)?.energia ?? 0), 0);
    camaras = camaras.map((c) => {
      if (c.id !== 1) return c;
      const nvArt = Math.max(Number(c.nivelMaxBarras ?? c.barrasIntegridadeMax ?? c.barrasIntegridade ?? 2), somaEnergiaKit);
      return {
        ...c,
        instalado: true,
        nivelMaxBarras: nvArt,
        nivelMax: nvArt,
        barrasNivelMax: nvArt,
        barrasIntegridadeMax: nvArt,
        integridadeMax: nvArt,
        barrasIntegridade: nvArt,
        integridade: nvArt,
      };
    });
    let energiaArtDisp = Number(camaras.find((c) => c.id === 1)?.barrasIntegridade ?? 2);
    armasAtivas = [0, 1, 2, 3].map((slotIndex) => {
      const idArma = slotIndex < layout.slotsArmasAtivos ? armasKitIds[slotIndex] : null;
      const spec = idArma ? resolverArmaCatalogoUnificado(idArma) : null;
      if (!spec) return { slotIndex, arma: null };
      const custoE = Number(spec.energia ?? 1);
      const energizada = energiaArtDisp >= custoE;
      if (energizada) energiaArtDisp -= custoE;
      return {
        slotIndex,
        arma: {
          idArma: spec.id,
          chassiId: spec.id,
          nome: spec.nome,
          energiaCusto: custoE,
          energiaAlocada: energizada ? custoE : 0,
          pesoBaseKg: Number(spec.pesoKg ?? 10),
          tempoRecargaBaseSeg: Number(spec.recargaSeg ?? 10),
          progressoRecargaSeg: 0,
          municaoCusto: Number(spec.municao ?? 0),
          soquetesMax: Number(spec.soquetes ?? 1),
          orgaosEnxertados: [],
          salaAlvoId: null,
          trincaSalasBeam: null,
          danoCasco: Number(spec.danoCasco ?? 1),
          danoSistema: Number(spec.danoSistema ?? 1),
          danoIonico: Number(spec.danoIonico ?? 0),
          duracaoIonSeg: Number(spec.duracaoIonSeg ?? 0),
          chanceFuroPct: Number(spec.chanceFuroPct ?? 0),
          ehFeixe: Boolean(spec.ehFeixe),
          projeteis: Number(spec.projeteis ?? 1),
          cargasMaximas: Number(spec.cargasMaximas ?? 1),
          cargasEstocadas: 0,
          mecanicaEspecial: spec.mecanicaEspecial ?? null,
          bonusDanoCascoPuro: Number(spec.bonusDanoCascoPuro ?? 0),
          danoTripulacaoDireto: Number(spec.danoTripulacaoDireto ?? 0),
          atordoamentoAlvoSeg: Number(spec.atordoamentoAlvoSeg ?? 0),
        },
      };
    });
    const somaEnergiaArmas = armasAtivas.reduce((acc, s) => acc + Number(s.arma?.energiaAlocada ?? 0), 0);
    camaras = camaras.map((c) => (c.id === 1 ? { ...c, barrasEnergiaAlocada: somaEnergiaArmas } : c));
  }

  let poraoCarga = (naveAnt.poraoCarga ?? []).map((s, idx) => ({ ...s, slotIndex: idx }));
  while (poraoCarga.length < 4) poraoCarga.push({ slotIndex: poraoCarga.length, item: null });
  if (variante === 'B' && Array.isArray(kit.orgaosIniciaisPorao)) {
    poraoCarga = [0, 1, 2, 3].map((slotIndex) => {
      const idOrg = kit.orgaosIniciaisPorao[slotIndex] ?? null;
      const specOrg = idOrg ? resolverOrgaoCatalogoUnificado(idOrg) : null;
      return {
        slotIndex,
        item: specOrg ? { id: specOrg.id, nome: specOrg.nome, tipo: 'ORGAO', pesoKg: Number(specOrg.pesoKg ?? 5) } : null,
      };
    });
  }

  let tripulacao = (naveAnt.tripulacao ?? []).map((t) => ({
    ...t,
    xpMaestria: t.xpMaestria ?? { pilotagem: 0, armas: 0, barreira: 0, reparo: 0, combate: 0 },
    nivelMaestria: Number(t.nivelMaestria ?? 0),
  }));
  if (variante === 'B' && Array.isArray(kit.tripulacaoInicial) && kit.tripulacaoInicial.length > 0) {
    const camarasIniciais = [2, 1, 5, 4];
    tripulacao = kit.tripulacaoInicial.map((esp, idx) => {
      const hp = HP_PADRAO_POR_ESPECIE_AE[esp] ?? 90;
      const camId = camarasIniciais[idx % camarasIniciais.length];
      return {
        id: `trip-${esp.toLowerCase()}-${idx + 1}`,
        especie: esp,
        hpAtual: hp,
        hpMax: hp,
        camaraAtualId: camId,
        camaraDestinoId: null,
        progressoNadoSeg: 0,
        acopladoBulbo: true,
        inflado: false,
        atordoadoSeg: 0,
        localizacao: 'NAVE_JOGADOR',
        xpMaestria: { pilotagem: 0, armas: 0, barreira: 0, reparo: 0, combate: 0 },
        nivelMaestria: 0,
      };
    });
  }
  const postosSalvosTripulacao = Object.fromEntries(
    tripulacao.map((t) => [t.id, Number(t.camaraAtualId ?? 2)])
  );
  const subsistemasTaticosSteam = {
    sondaSabotagem: false,
    parasitaNeural: false,
    droneDefesa: false,
    droneReparo: false,
    droneAtaque: false,
    recargaSondaSeg: 0,
    sondaAtivaSeg: 0,
    recargaNeuralSeg: 0,
    recargaDroneDefesaSeg: 0,
    recargaDroneReparoSeg: 0,
    recargaDroneAtaqueSeg: 0,
    ...(naveAnt.subsistemasTaticosSteam ?? {}),
  };

  const barrasCompradasKit =
    variante === 'B' && Number.isFinite(Number(kit.reatorBarrasCompradas))
      ? Number(kit.reatorBarrasCompradas)
      : Number(naveAnt.reator?.barrasCompradas ?? 7);
  const bonusArraia = tripulacao.filter((t) => t.especie === 'ARRAIA' && t.hpAtual > 0).length;
  const alocadaTotal = camaras.reduce((acc, c) => acc + Number(c.barrasEnergiaAlocada ?? 0), 0);
  const barrasCompradas = Math.max(barrasCompradasKit, Math.max(0, alocadaTotal - bonusArraia));
  const barrasTotais = barrasCompradas + bonusArraia;
  const barrasDisponiveis = Math.max(0, barrasTotais - alocadaTotal);

  // Recalcula massa e sustentação puras sem ciclo de import com onda1-fisica
  const aguaNormalTotalKg = camaras.reduce((acc, c) => acc + Number(c.aguaKg ?? 12.5), 0);
  const alagPesadoTotalKg = camaras.reduce((acc, c) => acc + Number(c.alagamentoPesadoKg ?? 0), 0);
  const pesoArmasKg = armasAtivas.reduce((acc, s) => {
    const arma = s?.arma;
    if (!arma) return acc;
    return acc + Number(arma.pesoBaseKg ?? arma.pesoKg ?? 0) + (arma.orgaosEnxertados?.length ?? 0) * PESO_ORGAO_ENXERTADO_KG;
  }, 0);
  const pesoPoraoKg = poraoCarga.reduce((acc, s) => acc + Number(s?.item?.pesoKg ?? 0), 0);
  const pesoTotalRecalcKg =
    Math.round(
      (Number(naveAnt.pesoChassiKg ?? 100) +
        aguaNormalTotalKg +
        alagPesadoTotalKg +
        pesoArmasKg +
        pesoPoraoKg +
        Number(naveAnt.nivelBlindagem ?? 0) * 15.0 +
        Number(naveAnt.pesoVirtualArrastoKg ?? 0)) *
        10000
    ) / 10000;
  const patamaresMastro = [0, 50, 100, 150, 200, 240, 280, 330];
  const camSifaoRec = camaras.find((c) => c.id === 5);
  const camMastroRec = camaras.find((c) => c.id === 6);
  const barrasSifaoRec = Math.max(0, Number(camSifaoRec?.barrasEnergiaAlocada ?? 0) - Number(camSifaoRec?.danoIonizado ?? 0));
  const barrasMastroRec = Math.max(0, Math.min(7, Number(camMastroRec?.barrasIntegridade ?? camMastroRec?.integridade ?? 0)));
  const aletasPorao = poraoCarga.filter((s) => s?.item?.id === 'ALETA_ESTABILIZADORA_FOIL').length;
  const penCavRec = aguaNormalTotalKg >= 62.5 ? 0 : (62.5 - aguaNormalTotalKg) * 2.0;
  const sustentacaoRecalcKg =
    barrasSifaoRec === 0 || barrasMastroRec === 0 || naveAnt.mergulhoTaticoAtivo
      ? 0
      : Math.max(
          0,
          Math.round(
            (patamaresMastro[barrasMastroRec] +
              Number(naveAnt.bonusSustentacaoMastroKg ?? 0) +
              aletasPorao * 28.0 +
              barrasSifaoRec * 30.0 -
              penCavRec -
              Number(naveAnt.penalidadeSustentacaoKg ?? 0)) *
              10000
          ) / 10000
        );

  const carteiraBase = estadoBase.economia ?? estadoBase.recursos ?? { sucata: 20, biomassa: 15, combustivel: 12, municao: 8 };
  const novaCarteira = {
    sucata: Number(cfgDif.sucataInicial ?? carteiraBase.sucata),
    biomassa: Number(carteiraBase.biomassa ?? 15),
    combustivel: Number(cfgDif.combustivelInicial ?? carteiraBase.combustivel),
    municao: Math.max(0, Number(carteiraBase.municao ?? 8) + Number(cfgDif.bonusMunicaoInicial ?? 0)),
  };

  return congelarPuro({
    ...estadoBase,
    economia: novaCarteira,
    recursos: novaCarteira,
    naveJogador: {
      ...naveAnt,
      layoutId: layout.idLayout,
      varianteLayout: layout.variante,
      slotsArmasMax: layout.slotsArmasAtivos,
      grafoAdjacencia: layout.grafoAdjacencia,
      dutosEspeciais: layout.dutosEspeciais,
      limitesPorSala: obterLimitesPorSalaLayout(layout.idLayout, layout.variante),
      hpCascoMax: Number(kit.hpCascoMax ?? naveAnt.hpCascoMax ?? 30),
      hpCascoAtual: Number(kit.hpCascoMax ?? naveAnt.hpCascoAtual ?? 30),
      pesoTotalKg: pesoTotalRecalcKg,
      sustentacaoAtualKg: sustentacaoRecalcKg,
      estadoFisico:
        (naveAnt.estadoFisico ?? '1_NO_FOIL') === '1_NO_FOIL' && pesoTotalRecalcKg > sustentacaoRecalcKg
          ? '2_TOUCHDOWN'
          : (naveAnt.estadoFisico ?? '1_NO_FOIL'),
      camaras,
      armasAtivas,
      poraoCarga,
      tripulacao,
      postosSalvosTripulacao,
      subsistemasTaticosSteam,
      reator: {
        ...(naveAnt.reator ?? {}),
        barrasCompradas,
        barrasBonusArraia: bonusArraia,
        barrasTotais,
        barrasDisponiveis,
      },
    },
    meta: {
      ...(estadoBase.meta ?? {}),
      edicaoComercialSteam: true,
      layoutId: layout.idLayout,
      varianteHangar: layout.variante,
      dificuldade: cfgDif.id,
      configuracoesSteam: cfgSteam,
      eventosUsadosNaRun: Array.isArray(estadoBase.meta?.eventosUsadosNaRun) ? estadoBase.meta.eventosUsadosNaRun : [],
    },
  });
}
