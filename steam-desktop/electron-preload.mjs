/**
 * Bio-Foil — Preload Seguro (`contextIsolation: true`, `sandbox: true`)
 * Expõe apenas os canais IPC explícitos em `window.bioFoilSteamDesktop`.
 */

export function criarPonteSeguraPreloadSteam(ipcRendererLike) {
  return Object.freeze({
    plataforma: 'STEAM_DESKTOP',
    desbloquearConquista: (idAch, steamApiKey) =>
      ipcRendererLike.invoke(
        'biofoil:desbloquearConquista',
        String(idAch ?? ''),
        ...(steamApiKey ? [String(steamApiKey)] : [])
      ),
    salvarConfiguracoes: (cfg) => ipcRendererLike.invoke('biofoil:salvarConfiguracoes', cfg ?? {}),
    salvarCloud: (nomeArq, dados) => ipcRendererLike.invoke('biofoil:salvarCloud', String(nomeArq ?? ''), dados ?? {}),
    atualizarRichPresence: (ctx) => ipcRendererLike.invoke('biofoil:atualizarRichPresence', ctx ?? {}),
    obterDiagnosticoSteam: () => ipcRendererLike.invoke('biofoil:diagnosticoSteam'),
    alternarTelaCheia: (flag) => ipcRendererLike.invoke('biofoil:alternarTelaCheia', flag),
    executarComandoMotor: (eventoInput, contextoUi) =>
      ipcRendererLike.invoke('biofoil:executarComandoMotor', eventoInput ?? {}, contextoUi ?? {}),
    avancarTickMotor: (dtSeg, pausaTaticaAtiva) =>
      ipcRendererLike.invoke('biofoil:avancarTickMotor', Number(dtSeg ?? 0.25), Boolean(pausaTaticaAtiva)),
  });
}

if (typeof process !== 'undefined' && process.versions?.electron) {
  import('electron').then(({ contextBridge, ipcRenderer }) => {
    contextBridge.exposeInMainWorld('bioFoilSteamDesktop', criarPonteSeguraPreloadSteam(ipcRenderer));
  }).catch(() => {});
}
