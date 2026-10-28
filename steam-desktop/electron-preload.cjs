/**
 * Bio-Foil — Sandboxed CommonJS Preload (`contextIsolation: true`, `sandbox: true`)
 * Exposes ONLY explicit, type-checked IPC channels on `window.bioFoilSteamDesktop`.
 */
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

function criarPonteSeguraPreloadSteamCjs(ipc) {
  return Object.freeze({
    plataforma: 'STEAM_DESKTOP',
    desbloquearConquista: (idAch, steamApiKey) =>
      ipc.invoke(
        'biofoil:desbloquearConquista',
        String(idAch ?? ''),
        ...(steamApiKey ? [String(steamApiKey)] : [])
      ),
    salvarConfiguracoes: (cfg) => ipc.invoke('biofoil:salvarConfiguracoes', cfg && typeof cfg === 'object' ? cfg : {}),
    salvarCloud: (nomeArq, dados) =>
      ipc.invoke('biofoil:salvarCloud', String(nomeArq ?? ''), dados && typeof dados === 'object' ? dados : {}),
    atualizarRichPresence: (ctx) => ipc.invoke('biofoil:atualizarRichPresence', ctx && typeof ctx === 'object' ? ctx : {}),
    obterDiagnosticoSteam: () => ipc.invoke('biofoil:diagnosticoSteam'),
    alternarTelaCheia: (flag) => ipc.invoke('biofoil:alternarTelaCheia', flag === undefined ? undefined : Boolean(flag)),
    executarComandoMotor: (eventoInput, contextoUi) =>
      ipc.invoke(
        'biofoil:executarComandoMotor',
        eventoInput && typeof eventoInput === 'object' ? eventoInput : {},
        contextoUi && typeof contextoUi === 'object' ? contextoUi : {}
      ),
    avancarTickMotor: (dtSeg, pausaTaticaAtiva) =>
      ipc.invoke('biofoil:avancarTickMotor', Number(dtSeg ?? 0.25), Boolean(pausaTaticaAtiva)),
  });
}

contextBridge.exposeInMainWorld('bioFoilSteamDesktop', criarPonteSeguraPreloadSteamCjs(ipcRenderer));
