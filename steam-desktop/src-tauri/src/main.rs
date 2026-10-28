#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::io::Write;
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};
use std::thread;
use std::time::Duration;
use tauri::{Manager, RunEvent, State, WebviewUrl, WebviewWindowBuilder, Window};

struct EstadoSidecarMotor {
    url_local: String,
    processo: Option<Child>,
}

static CLIENTE_STEAMWORKS: OnceLock<Mutex<Option<steamworks::Client>>> = OnceLock::new();
static ENCERRAR_STEAMWORKS_PUMP: AtomicBool = AtomicBool::new(false);

const SCRIPT_PONTE_TAURI_STEAM: &str = r#"
(() => {
  const invocar = (cmd, args = {}) => {
    try {
      const fn = window.__TAURI_INTERNALS__?.invoke;
      if (typeof fn === 'function') return fn(cmd, args);
    } catch {}
    return Promise.resolve(false);
  };
  const formatarStatusRp = (ctx = {}) => {
    const f = String(ctx.faseJogo || 'INICIO').toUpperCase();
    const s = Math.max(1, Math.min(8, Number(ctx.setorNumero) || 1));
    const lay = String(ctx.layoutId || 'CARCACA_ALFA_A');
    const dif = String(ctx.dificuldade || 'NORMAL');
    const en = ctx.idioma === 'en-US';
    if (f === 'INICIO') return en ? 'In Hangar — Preparing Bio-Craft' : 'No Hangar — Preparando Bio-Nave';
    if (f === 'FIM_DE_RUN') return en ? `Expedition Complete — Sector ${s}/8` : `Expedição Encerrada — Setor ${s}/8`;
    return en ? `Sector ${s}/8 — ${lay} (${dif})` : `Setor ${s}/8 — ${lay} (${dif})`;
  };
  if (!window.bioFoilSteamDesktop) {
    Object.defineProperty(window, 'bioFoilSteamDesktop', {
      configurable: false,
      enumerable: true,
      writable: false,
      value: Object.freeze({
        hostNativo: 'TAURI_V2_STEAMWORKS',
        desbloquearConquista: (id, steamApiKey) => invocar('desbloquear_conquista_steam', {
          apiKey: String(id || ''),
          steamApiKey: steamApiKey ? String(steamApiKey) : null,
        }),
        alternarTelaCheia: (ativo) => invocar('alternar_tela_cheia', { ativo: Boolean(ativo) }),
        salvarConfiguracoes: (cfg) => invocar('salvar_configuracoes_steam', { cfgJson: JSON.stringify(cfg || {}) }),
        salvarCloud: (arquivo, dados) => invocar('salvar_cloud_steam', {
          arquivo: String(arquivo || 'save.json'),
          dadosJson: JSON.stringify(dados || {}),
        }),
        atualizarRichPresence: (ctx) => invocar('atualizar_rich_presence_steam', {
          status: formatarStatusRp(ctx || {}),
        }),
      }),
    });
  }
})();
"#;

fn pasta_dados_steam() -> PathBuf {
    if let Ok(custom) = std::env::var("BIOFOIL_STEAM_DATA_DIR") {
        if !custom.trim().is_empty() {
            return PathBuf::from(custom);
        }
    }
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| String::from("."));
    PathBuf::from(home).join(".biofoil-steam")
}

fn gravar_json_atomico(destino: &Path, conteudo: &str) -> Result<(), String> {
    if let Some(pai) = destino.parent() {
        fs::create_dir_all(pai).map_err(|e| e.to_string())?;
    }
    let tmp = destino.with_extension(format!("tmp.{}", std::process::id()));
    fs::write(&tmp, format!("{conteudo}\n")).map_err(|e| e.to_string())?;
    fs::rename(&tmp, destino).map_err(|e| e.to_string())
}

fn resolver_steam_app_id() -> u32 {
    if let Ok(env_id) = std::env::var("BIOFOIL_STEAM_APP_ID") {
        if let Ok(parsed) = env_id.trim().parse::<u32>() {
            return parsed;
        }
    }
    if let Ok(txt) = std::fs::read_to_string("steam_appid.txt") {
        if let Ok(parsed) = txt.trim().parse::<u32>() {
            return parsed;
        }
    }
    2894510
}

fn obter_ou_iniciar_steamworks() -> &'static Mutex<Option<steamworks::Client>> {
    CLIENTE_STEAMWORKS.get_or_init(|| {
        let app_id = resolver_steam_app_id();
        let init_res = steamworks::Client::init_app(app_id).or_else(|_| steamworks::Client::init());
        match init_res {
            Ok((client, single)) => {
                thread::spawn(move || {
                    while !ENCERRAR_STEAMWORKS_PUMP.load(Ordering::Relaxed) {
                        single.run_callbacks();
                        thread::sleep(Duration::from_millis(50));
                    }
                });
                Mutex::new(Some(client))
            }
            Err(_) => Mutex::new(None),
        }
    })
}

#[tauri::command]
fn obter_url_motor_local(estado: State<'_, Mutex<EstadoSidecarMotor>>) -> String {
    estado
        .lock()
        .map(|g| g.url_local.clone())
        .unwrap_or_else(|_| String::from("http://127.0.0.1:4173"))
}

fn resolver_steam_api_key_tauri(id_ou_key: &str) -> String {
    if id_ou_key.starts_with("STAT_ACH_") {
        return id_ou_key.to_string();
    }
    match id_ou_key {
        "ACH_CARCACA_1_FOIL_PURO" => "STAT_ACH_CARCACA_1",
        "ACH_CARCACA_2_DRENAGEM_LAMPEJO" => "STAT_ACH_CARCACA_2",
        "ACH_MANTA_1_BLACKOUT_TOTAL" => "STAT_ACH_MANTA_1",
        "ACH_MANTA_2_SEM_ESCUDO_ATE_S5" => "STAT_ACH_MANTA_2",
        "ACH_COURACA_1_ARIETE_PESADO" => "STAT_ACH_COURACA_1",
        "ACH_COURACA_2_FORTALEZA_BLINDADA" => "STAT_ACH_COURACA_2",
        "ACH_SOMBRA_1_FANTASMA_TERMAL" => "STAT_ACH_SOMBRA_1",
        "ACH_SOMBRA_2_PREDADOR_CIRURGICO" => "STAT_ACH_SOMBRA_2",
        "ACH_COLMEIA_1_QUATRO_ESPECIES" => "STAT_ACH_COLMEIA_1",
        "ACH_COLMEIA_2_ABORDAGEM_OSMOTICA" => "STAT_ACH_COLMEIA_2",
        "ACH_GLOBAL_PRIMEIRO_SALTO" => "STAT_ACH_GLOBAL_1",
        "ACH_GLOBAL_CAPTURA_INTACTA" => "STAT_ACH_GLOBAL_2",
        "ACH_GLOBAL_MERGULHO_EVASAO" => "STAT_ACH_GLOBAL_3",
        "ACH_GLOBAL_BLUE_OPTION" => "STAT_ACH_GLOBAL_4",
        "ACH_GLOBAL_QUEST_COMPLETA" => "STAT_ACH_GLOBAL_5",
        "ACH_GLOBAL_ARSENAL_4_BOCAS" => "STAT_ACH_GLOBAL_6",
        "ACH_GLOBAL_ENXERTO_TRIPLO" => "STAT_ACH_GLOBAL_7",
        "ACH_GLOBAL_MESTRE_OFICINA" => "STAT_ACH_GLOBAL_8",
        "ACH_GLOBAL_SETOR_5_PROFUNDO" => "STAT_ACH_GLOBAL_9",
        "ACH_GLOBAL_MATADOR_LEVIATA" => "STAT_ACH_GLOBAL_10",
        "ACH_GLOBAL_VITORIA_CARCACA" => "STAT_ACH_GLOBAL_11",
        "ACH_GLOBAL_VITORIA_DIFICIL" => "STAT_ACH_GLOBAL_12",
        "ACH_GLOBAL_FROTA_COMPLETA_AB" => "STAT_ACH_GLOBAL_13",
        "ACH_GLOBAL_TUTORIAL_CONCLUIDO" => "STAT_ACH_GLOBAL_14",
        other => return format!("STAT_{other}"),
    }
    .to_string()
}

#[tauri::command]
fn desbloquear_conquista_steam(api_key: String, steam_api_key: Option<String>) -> Result<bool, String> {
    let id_limpo = api_key.trim();
    if id_limpo.is_empty() {
        return Ok(false);
    }
    let base = pasta_dados_steam();
    let arq_ach = base.join("achievements.json");
    let mut atual = fs::read_to_string(&arq_ach).unwrap_or_else(|_| String::from("[]"));
    let marcador = format!("{id_limpo:?}");
    if !atual.contains(&marcador) {
        let trim = atual.trim();
        atual = if trim.is_empty() || trim == "[]" {
            format!("[\n  {marcador}\n]")
        } else {
            let sem_fecho = trim.trim_end_matches(']').trim_end();
            format!("{sem_fecho},\n  {marcador}\n]")
        };
        let _ = gravar_json_atomico(&arq_ach, &atual);
    }

    let chave_sdk = steam_api_key
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .map(resolver_steam_api_key_tauri)
        .unwrap_or_else(|| resolver_steam_api_key_tauri(id_limpo));

    if let Ok(guard) = obter_ou_iniciar_steamworks().lock() {
        if let Some(ref client) = *guard {
            let user_stats = client.user_stats();
            let ach = user_stats.achievement(&chave_sdk);
            let _ = ach.set();
            let _ = user_stats.store_stats();
            return Ok(true);
        }
    }
    Ok(true)
}

#[tauri::command]
fn salvar_configuracoes_steam(cfg_json: String) -> Result<bool, String> {
    let base = pasta_dados_steam();
    let _ = gravar_json_atomico(&base.join("settings.json"), &cfg_json);
    let _ = gravar_json_atomico(&base.join("steam_cloud").join("settings.json"), &cfg_json);
    if let Ok(guard) = obter_ou_iniciar_steamworks().lock() {
        if let Some(ref client) = *guard {
            let remote = client.remote_storage();
            let mut writer = remote.file("settings.json").write();
            let _ = writer.write_all(cfg_json.as_bytes());
            return Ok(true);
        }
    }
    Ok(false)
}

#[tauri::command]
fn salvar_cloud_steam(arquivo: String, dados_json: String) -> Result<bool, String> {
    let nome_seguro = Path::new(&arquivo)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("save.json")
        .to_string();
    let base = pasta_dados_steam();
    let _ = gravar_json_atomico(&base.join("steam_cloud").join(&nome_seguro), &dados_json);
    if let Ok(guard) = obter_ou_iniciar_steamworks().lock() {
        if let Some(ref client) = *guard {
            let remote = client.remote_storage();
            let mut writer = remote.file(&nome_seguro).write();
            let _ = writer.write_all(dados_json.as_bytes());
            return Ok(true);
        }
    }
    Ok(false)
}

#[tauri::command]
fn atualizar_rich_presence_steam(status: String) -> Result<bool, String> {
    let base = pasta_dados_steam();
    let json_rp = format!("{{\"status\":{:?}}}", status);
    let _ = gravar_json_atomico(&base.join("rich_presence.json"), &json_rp);
    if let Ok(guard) = obter_ou_iniciar_steamworks().lock() {
        if let Some(ref client) = *guard {
            let friends = client.friends();
            friends.set_rich_presence("steam_display", Some("#StatusGeneric"));
            friends.set_rich_presence("status", Some(&status));
            return Ok(true);
        }
    }
    Ok(false)
}

#[tauri::command]
fn alternar_tela_cheia(window: Window, ativo: Option<bool>) -> Result<bool, String> {
    let atual = window.is_fullscreen().map_err(|e| e.to_string())?;
    let alvo = ativo.unwrap_or(!atual);
    window.set_fullscreen(alvo).map_err(|e| e.to_string())?;
    Ok(alvo)
}

fn alocar_porta_livre() -> u16 {
    TcpListener::bind("127.0.0.1:0")
        .and_then(|s| s.local_addr())
        .map(|a| a.port())
        .unwrap_or(4173)
}

fn resolver_binario_node() -> PathBuf {
    let candidatos = [
        PathBuf::from("runtime/node/bin/node"),
        PathBuf::from("runtime/node/node.exe"),
        PathBuf::from("../runtime/node/bin/node"),
    ];
    for c in candidatos {
        if c.exists() {
            return c;
        }
    }
    PathBuf::from("node")
}

fn aguardar_motor_http_pronto(porta: u16) {
    let addr = SocketAddr::from(([127, 0, 0, 1], porta));
    for _ in 0..80 {
        if TcpStream::connect_timeout(&addr, Duration::from_millis(50)).is_ok() {
            return;
        }
        thread::sleep(Duration::from_millis(50));
    }
}

fn iniciar_sidecar_biofoil() -> (String, Option<Child>) {
    let porta = alocar_porta_livre();
    let arg_porta = format!("--porta={porta}");
    let bin_node = resolver_binario_node();
    let filho = Command::new(bin_node)
        .args(["scripts/jogar-biofoil.mjs", &arg_porta, "--sem-navegador"])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .ok();
    if filho.is_some() {
        aguardar_motor_http_pronto(porta);
    }
    (format!("http://127.0.0.1:{porta}"), filho)
}

fn main() {
    let _ = obter_ou_iniciar_steamworks();
    let (url_local, proc_filho) = iniciar_sidecar_biofoil();
    let url_para_setup = url_local.clone();
    let app = tauri::Builder::default()
        .on_page_load(|webview, _payload| {
            let _ = webview.eval(SCRIPT_PONTE_TAURI_STEAM);
        })
        .manage(Mutex::new(EstadoSidecarMotor {
            url_local,
            processo: proc_filho,
        }))
        .setup(move |app| {
            if let Some(win) = app.get_webview_window("main") {
                if std::env::var("SteamDeck").unwrap_or_default() == "1" {
                    let _ = win.set_fullscreen(true);
                }
                let _ = win.eval(SCRIPT_PONTE_TAURI_STEAM);
                if let Ok(parsed) = url_para_setup.parse() {
                    let _ = win.navigate(parsed);
                }
            } else if let Ok(parsed) = url_para_setup.parse() {
                let _ = WebviewWindowBuilder::new(app, "main", WebviewUrl::External(parsed))
                    .title("BIO-FOIL — Tactical Hydrofoil Roguelike")
                    .inner_size(1600.0, 900.0)
                    .min_inner_size(960.0, 540.0)
                    .initialization_script(SCRIPT_PONTE_TAURI_STEAM)
                    .build();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            obter_url_motor_local,
            desbloquear_conquista_steam,
            salvar_configuracoes_steam,
            salvar_cloud_steam,
            atualizar_rich_presence_steam,
            alternar_tela_cheia
        ])
        .build(tauri::generate_context!())
        .expect("falha ao construir host Tauri v2 do Bio-Foil");

    app.run(|app_handle, event| {
        if matches!(event, RunEvent::Exit) {
            ENCERRAR_STEAMWORKS_PUMP.store(true, Ordering::Relaxed);
            if let Some(estado) = app_handle.try_state::<Mutex<EstadoSidecarMotor>>() {
                if let Ok(mut guard) = estado.lock() {
                    if let Some(mut child) = guard.processo.take() {
                        let _ = child.kill();
                        let _ = child.wait();
                    }
                }
            }
        }
    });
}
