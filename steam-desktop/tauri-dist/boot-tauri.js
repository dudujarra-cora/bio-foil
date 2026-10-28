(async function bootTauriBiofoil() {
  const ipc = window.__TAURI_INTERNALS__ || window.__TAURI__;
  if (ipc && typeof ipc.invoke === 'function') {
    try {
      const urlMotor = await ipc.invoke('obter_url_motor_local');
      if (typeof urlMotor === 'string' && urlMotor.startsWith('http://127.0.0.1:')) {
        window.location.replace(urlMotor);
      }
    } catch (_err) {
      const el = document.getElementById('biofoil-tauri-status');
      if (el) {
        el.textContent = 'LOCAL LOOPBACK ENGINE OFFLINE — CHECK NODE SIDECAR';
      }
    }
  }
})();
