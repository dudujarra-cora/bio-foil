/*
 * Bio-Foil — Host Nativo Linux / SteamOS / Steam Deck (GTK3 + WebKit2GTK + WebKitUserContentManager IPC + dlopen("libsteam_api.so"))
 * Paridade 1:1 com BioFoilNativeHost.swift (`window.bioFoilSteamDesktop`).
 * Compilação: cc -O2 biofoil_linux_host.c $(pkg-config --cflags --libs gtk+-3.0 webkit2gtk-4.1) -ldl -o biofoil-linux-host
 */
#include <dlfcn.h>
#include <gtk/gtk.h>
#include <jsc/jsc.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>
#include <webkit2/webkit2.h>

typedef int32_t (*fn_steam_init_flat_t)(char *);
typedef void (*fn_steam_void_t)(void);
typedef void *(*fn_steam_iface_t)(void);
typedef bool (*fn_steam_set_ach_t)(void *, const char *);
typedef bool (*fn_steam_store_stats_t)(void *);
typedef bool (*fn_steam_file_write_t)(void *, const char *, const void *, int32_t);
typedef bool (*fn_steam_set_rp_t)(void *, const char *, const char *);

static void *g_steam_so = NULL;
static bool g_steam_sdk_ativo = false;
static fn_steam_void_t g_steam_run_callbacks = NULL;
static fn_steam_void_t g_steam_shutdown = NULL;
static void *g_user_stats_ptr = NULL;
static void *g_remote_storage_ptr = NULL;
static void *g_friends_ptr = NULL;
static fn_steam_set_ach_t g_fn_set_ach = NULL;
static fn_steam_store_stats_t g_fn_store_stats = NULL;
static fn_steam_file_write_t g_fn_file_write = NULL;
static fn_steam_set_rp_t g_fn_set_rp = NULL;
static char g_pasta_steam[1024] = {0};
static bool g_em_fullscreen = false;

static void garantir_diretorios_steam(void) {
    const char *env_dir = getenv("BIOFOIL_STEAM_DATA_DIR");
    if (env_dir != NULL && env_dir[0] != '\0') {
        snprintf(g_pasta_steam, sizeof(g_pasta_steam), "%s", env_dir);
    } else {
        const char *home = getenv("HOME");
        snprintf(g_pasta_steam, sizeof(g_pasta_steam), "%s/.biofoil-steam", (home && home[0]) ? home : "/tmp");
    }
    mkdir(g_pasta_steam, 0755);
    char sub_cloud[1152];
    snprintf(sub_cloud, sizeof(sub_cloud), "%s/steam_cloud", g_pasta_steam);
    mkdir(sub_cloud, 0755);
}

static void gravar_atomico_json(const char *relativo, const char *conteudo) {
    if (!relativo || !conteudo) return;
    char destino[1280];
    char temporario[1344];
    snprintf(destino, sizeof(destino), "%s/%s", g_pasta_steam, relativo);
    snprintf(temporario, sizeof(temporario), "%s.tmp.%d", destino, (int)getpid());
    FILE *fp = fopen(temporario, "wb");
    if (!fp) return;
    size_t tam = strlen(conteudo);
    fwrite(conteudo, 1, tam, fp);
    fwrite("\n", 1, 1, fp);
    fclose(fp);
    rename(temporario, destino);
}

static bool extrair_campo_json_str(const char *json, const char *chave, char *saida, size_t max_saida) {
    if (!json || !chave || !saida || max_saida == 0) return false;
    saida[0] = '\0';
    char padrao[128];
    snprintf(padrao, sizeof(padrao), "\"%s\"", chave);
    const char *pos = strstr(json, padrao);
    if (!pos) return false;
    pos += strlen(padrao);
    while (*pos == ' ' || *pos == '\t' || *pos == '\n' || *pos == '\r' || *pos == ':') pos++;
    if (*pos != '"') return false;
    pos++;
    size_t i = 0;
    while (*pos != '\0' && *pos != '"' && i + 1 < max_saida) {
        if (*pos == '\\' && *(pos + 1) != '\0') pos++;
        saida[i++] = *pos++;
    }
    saida[i] = '\0';
    return i > 0;
}

static char *extrair_subobjeto_json_alocado(const char *json, const char *chave) {
    if (!json || !chave) return g_strdup("{}");
    char padrao[128];
    snprintf(padrao, sizeof(padrao), "\"%s\"", chave);
    const char *pos = strstr(json, padrao);
    if (!pos) return g_strdup("{}");
    pos += strlen(padrao);
    while (*pos == ' ' || *pos == '\t' || *pos == '\n' || *pos == '\r' || *pos == ':') pos++;
    if (*pos != '{' && *pos != '[') return g_strdup("{}");
    char ab = *pos;
    char fe = (ab == '{') ? '}' : ']';
    int niv = 0;
    bool em_str = false;
    const char *p = pos;
    while (*p != '\0') {
        if (*p == '"' && (p == pos || *(p - 1) != '\\')) em_str = !em_str;
        if (!em_str) {
            if (*p == ab) niv++;
            else if (*p == fe) {
                niv--;
                if (niv == 0) {
                    return g_strndup(pos, (gsize)(p - pos + 1));
                }
            }
        }
        p++;
    }
    return g_strdup("{}");
}

static const char *resolver_steam_api_key_c(const char *id_ou_key, char *buf_fallback, size_t tam_buf) {
    static const struct { const char *id; const char *key; } TABELA[24] = {
        { "ACH_CARCACA_1_FOIL_PURO", "STAT_ACH_CARCACA_1" },
        { "ACH_CARCACA_2_DRENAGEM_LAMPEJO", "STAT_ACH_CARCACA_2" },
        { "ACH_MANTA_1_BLACKOUT_TOTAL", "STAT_ACH_MANTA_1" },
        { "ACH_MANTA_2_SEM_ESCUDO_ATE_S5", "STAT_ACH_MANTA_2" },
        { "ACH_COURACA_1_ARIETE_PESADO", "STAT_ACH_COURACA_1" },
        { "ACH_COURACA_2_FORTALEZA_BLINDADA", "STAT_ACH_COURACA_2" },
        { "ACH_SOMBRA_1_FANTASMA_TERMAL", "STAT_ACH_SOMBRA_1" },
        { "ACH_SOMBRA_2_PREDADOR_CIRURGICO", "STAT_ACH_SOMBRA_2" },
        { "ACH_COLMEIA_1_QUATRO_ESPECIES", "STAT_ACH_COLMEIA_1" },
        { "ACH_COLMEIA_2_ABORDAGEM_OSMOTICA", "STAT_ACH_COLMEIA_2" },
        { "ACH_GLOBAL_PRIMEIRO_SALTO", "STAT_ACH_GLOBAL_1" },
        { "ACH_GLOBAL_CAPTURA_INTACTA", "STAT_ACH_GLOBAL_2" },
        { "ACH_GLOBAL_MERGULHO_EVASAO", "STAT_ACH_GLOBAL_3" },
        { "ACH_GLOBAL_BLUE_OPTION", "STAT_ACH_GLOBAL_4" },
        { "ACH_GLOBAL_QUEST_COMPLETA", "STAT_ACH_GLOBAL_5" },
        { "ACH_GLOBAL_ARSENAL_4_BOCAS", "STAT_ACH_GLOBAL_6" },
        { "ACH_GLOBAL_ENXERTO_TRIPLO", "STAT_ACH_GLOBAL_7" },
        { "ACH_GLOBAL_MESTRE_OFICINA", "STAT_ACH_GLOBAL_8" },
        { "ACH_GLOBAL_SETOR_5_PROFUNDO", "STAT_ACH_GLOBAL_9" },
        { "ACH_GLOBAL_MATADOR_LEVIATA", "STAT_ACH_GLOBAL_10" },
        { "ACH_GLOBAL_VITORIA_CARCACA", "STAT_ACH_GLOBAL_11" },
        { "ACH_GLOBAL_VITORIA_DIFICIL", "STAT_ACH_GLOBAL_12" },
        { "ACH_GLOBAL_FROTA_COMPLETA_AB", "STAT_ACH_GLOBAL_13" },
        { "ACH_GLOBAL_TUTORIAL_CONCLUIDO", "STAT_ACH_GLOBAL_14" },
    };
    if (!id_ou_key || !id_ou_key[0]) return "";
    if (strncmp(id_ou_key, "STAT_ACH_", 9) == 0) return id_ou_key;
    for (size_t i = 0; i < 24; i++) {
        if (strcmp(id_ou_key, TABELA[i].id) == 0) return TABELA[i].key;
    }
    snprintf(buf_fallback, tam_buf, "STAT_%s", id_ou_key);
    return buf_fallback;
}

static void ao_receber_mensagem_js(WebKitUserContentManager *ucm, WebKitJavascriptResult *js_result, gpointer user_data) {
    (void)ucm;
    GtkWindow *win = GTK_WINDOW(user_data);
    JSCValue *val = webkit_javascript_result_get_js_value(js_result);
    if (!val) return;
    char *json = jsc_value_is_string(val) ? jsc_value_to_string(val) : jsc_value_to_json(val, 0);
    if (!json) return;

    char op[64] = {0};
    extrair_campo_json_str(json, "op", op, sizeof(op));

    if (strcmp(op, "alternarTelaCheia") == 0 && win != NULL) {
        bool deseja = (strstr(json, "\"ativo\":true") != NULL || strstr(json, "\"ativo\": true") != NULL);
        if (deseja && !g_em_fullscreen) {
            gtk_window_fullscreen(win);
            g_em_fullscreen = true;
        } else if (!deseja && g_em_fullscreen) {
            gtk_window_unfullscreen(win);
            g_em_fullscreen = false;
        }
    } else if (strcmp(op, "desbloquearConquista") == 0) {
        char id_ach[128] = {0};
        if (extrair_campo_json_str(json, "id", id_ach, sizeof(id_ach))) {
            char caminho_ach[1280];
            snprintf(caminho_ach, sizeof(caminho_ach), "%s/achievements.json", g_pasta_steam);
            gchar *conteudo_ant = NULL;
            gsize tam_ant = 0;
            if (!g_file_get_contents(caminho_ach, &conteudo_ant, &tam_ant, NULL) || !conteudo_ant) {
                conteudo_ant = g_strdup("[]");
            }
            char busca[160];
            snprintf(busca, sizeof(busca), "\"%s\"", id_ach);
            if (strstr(conteudo_ant, busca) == NULL) {
                g_strstrip(conteudo_ant);
                size_t l = strlen(conteudo_ant);
                GString *novo = g_string_new(NULL);
                if (l <= 2) {
                    g_string_printf(novo, "[\n  \"%s\"\n]", id_ach);
                } else {
                    if (conteudo_ant[l - 1] == ']') conteudo_ant[l - 1] = '\0';
                    g_strchomp(conteudo_ant);
                    g_string_printf(novo, "%s,\n  \"%s\"\n]", conteudo_ant, id_ach);
                }
                gravar_atomico_json("achievements.json", novo->str);
                g_string_free(novo, TRUE);
            }
            g_free(conteudo_ant);
            if (g_steam_sdk_ativo && g_user_stats_ptr && g_fn_set_ach) {
                char key_exp[128] = {0};
                char buf_fb[160] = {0};
                bool tem_exp = extrair_campo_json_str(json, "steamApiKey", key_exp, sizeof(key_exp));
                const char *chave_sdk = resolver_steam_api_key_c(tem_exp ? key_exp : id_ach, buf_fb, sizeof(buf_fb));
                g_fn_set_ach(g_user_stats_ptr, chave_sdk);
                if (g_fn_store_stats) g_fn_store_stats(g_user_stats_ptr);
            }
        }
    } else if (strcmp(op, "salvarConfiguracoes") == 0) {
        char *cfg_json = extrair_subobjeto_json_alocado(json, "cfg");
        gravar_atomico_json("settings.json", cfg_json);
        gravar_atomico_json("steam_cloud/settings.json", cfg_json);
        if (g_steam_sdk_ativo && g_remote_storage_ptr && g_fn_file_write) {
            g_fn_file_write(g_remote_storage_ptr, "settings.json", cfg_json, (int32_t)strlen(cfg_json));
        }
        g_free(cfg_json);
    } else if (strcmp(op, "salvarCloud") == 0) {
        char arquivo[128] = {0};
        if (extrair_campo_json_str(json, "arquivo", arquivo, sizeof(arquivo))) {
            const char *base = strrchr(arquivo, '/');
            const char *limpo = base ? (base + 1) : arquivo;
            char rel[256];
            snprintf(rel, sizeof(rel), "steam_cloud/%s", limpo);
            char *dados_json = extrair_subobjeto_json_alocado(json, "dados");
            gravar_atomico_json(rel, dados_json);
            if (g_steam_sdk_ativo && g_remote_storage_ptr && g_fn_file_write) {
                g_fn_file_write(g_remote_storage_ptr, limpo, dados_json, (int32_t)strlen(dados_json));
            }
            g_free(dados_json);
        }
    } else if (strcmp(op, "atualizarRichPresence") == 0) {
        char *ctx_json = extrair_subobjeto_json_alocado(json, "ctx");
        gravar_atomico_json("rich_presence.json", ctx_json);
        if (g_steam_sdk_ativo && g_friends_ptr && g_fn_set_rp) {
            char fase[32] = {0};
            char layout[64] = {0};
            char idioma[16] = {0};
            extrair_campo_json_str(ctx_json, "faseJogo", fase, sizeof(fase));
            extrair_campo_json_str(ctx_json, "layoutId", layout, sizeof(layout));
            extrair_campo_json_str(ctx_json, "idioma", idioma, sizeof(idioma));
            bool eh_en = (strcmp(idioma, "en-US") == 0);
            char status_fmt[192];
            if (strcmp(fase, "INICIO") == 0) {
                snprintf(status_fmt, sizeof(status_fmt), "%s", eh_en ? "In Hangar — Preparing Bio-Craft" : "No Hangar — Preparando Bio-Nave");
            } else {
                snprintf(status_fmt, sizeof(status_fmt), "%s — %s", eh_en ? "Active Expedition" : "Expedição Ativa", layout[0] ? layout : "CARCACA_ALFA_A");
            }
            g_fn_set_rp(g_friends_ptr, "steam_display", "#StatusGeneric");
            g_fn_set_rp(g_friends_ptr, "status", status_fmt);
        }
        g_free(ctx_json);
    }

    g_free(json);
}

static gboolean bombear_steamworks_cb(gpointer user_data) {
    (void)user_data;
    if (g_steam_run_callbacks != NULL) {
        g_steam_run_callbacks();
    }
    return G_SOURCE_CONTINUE;
}

static void ao_fechar_janela(GtkWidget *widget, gpointer data) {
    (void)widget;
    (void)data;
    g_steam_sdk_ativo = false;
    if (g_steam_shutdown != NULL) {
        g_steam_shutdown();
        g_steam_shutdown = NULL;
    }
    if (g_steam_so != NULL) {
        dlclose(g_steam_so);
        g_steam_so = NULL;
    }
    gtk_main_quit();
}

int main(int argc, char **argv) {
    gtk_init(&argc, &argv);
    garantir_diretorios_steam();

    const char *so_env = getenv("BIOFOIL_STEAM_API_SO");
    g_steam_so = dlopen(so_env && so_env[0] ? so_env : "libsteam_api.so", RTLD_LAZY | RTLD_LOCAL);
    if (g_steam_so != NULL) {
        fn_steam_init_flat_t fn_init = (fn_steam_init_flat_t)dlsym(g_steam_so, "SteamAPI_InitFlat");
        char err[1024] = {0};
        if (fn_init != NULL && fn_init(err) == 0) {
            g_steam_sdk_ativo = true;
            g_steam_run_callbacks = (fn_steam_void_t)dlsym(g_steam_so, "SteamAPI_RunCallbacks");
            g_steam_shutdown = (fn_steam_void_t)dlsym(g_steam_so, "SteamAPI_Shutdown");

            fn_steam_iface_t fn_us = (fn_steam_iface_t)dlsym(g_steam_so, "SteamAPI_SteamUserStats_v013");
            if (!fn_us) fn_us = (fn_steam_iface_t)dlsym(g_steam_so, "SteamAPI_SteamUserStats_v012");
            if (fn_us) g_user_stats_ptr = fn_us();

            fn_steam_iface_t fn_rs = (fn_steam_iface_t)dlsym(g_steam_so, "SteamAPI_SteamRemoteStorage_v016");
            if (!fn_rs) fn_rs = (fn_steam_iface_t)dlsym(g_steam_so, "SteamAPI_SteamRemoteStorage_v014");
            if (fn_rs) g_remote_storage_ptr = fn_rs();

            fn_steam_iface_t fn_fr = (fn_steam_iface_t)dlsym(g_steam_so, "SteamAPI_SteamFriends_v017");
            if (!fn_fr) fn_fr = (fn_steam_iface_t)dlsym(g_steam_so, "SteamAPI_SteamFriends_v015");
            if (fn_fr) g_friends_ptr = fn_fr();

            g_fn_set_ach = (fn_steam_set_ach_t)dlsym(g_steam_so, "SteamAPI_ISteamUserStats_SetAchievement");
            g_fn_store_stats = (fn_steam_store_stats_t)dlsym(g_steam_so, "SteamAPI_ISteamUserStats_StoreStats");
            g_fn_file_write = (fn_steam_file_write_t)dlsym(g_steam_so, "SteamAPI_ISteamRemoteStorage_FileWrite");
            g_fn_set_rp = (fn_steam_set_rp_t)dlsym(g_steam_so, "SteamAPI_ISteamFriends_SetRichPresence");

            g_timeout_add(50, bombear_steamworks_cb, NULL);
        } else {
            dlclose(g_steam_so);
            g_steam_so = NULL;
        }
    }

    const char *url = getenv("BIOFOIL_ENGINE_URL");
    if (url == NULL || url[0] == '\0') {
        url = (argc > 1) ? argv[1] : "http://127.0.0.1:4173";
    }
    const char *steam_deck = getenv("SteamDeck");
    bool eh_deck = (steam_deck != NULL && strcmp(steam_deck, "1") == 0);

    GtkWidget *win = gtk_window_new(GTK_WINDOW_TOPLEVEL);
    gtk_window_set_title(GTK_WINDOW(win), "BIO-FOIL — Tactical Hydrofoil Roguelike");
    gtk_window_set_default_size(GTK_WINDOW(win), eh_deck ? 1280 : 1600, eh_deck ? 800 : 900);
    if (eh_deck) {
        gtk_window_fullscreen(GTK_WINDOW(win));
        g_em_fullscreen = true;
    }
    g_signal_connect(win, "destroy", G_CALLBACK(ao_fechar_janela), NULL);

    WebKitUserContentManager *ucm = webkit_user_content_manager_new();
    g_signal_connect(ucm, "script-message-received::biofoilHost", G_CALLBACK(ao_receber_mensagem_js), win);
    webkit_user_content_manager_register_script_message_handler(ucm, "biofoilHost");

    char js_ponte[1792];
    snprintf(
        js_ponte,
        sizeof(js_ponte),
        "(() => {"
        "  const post = (payload) => {"
        "    try { window.webkit.messageHandlers.biofoilHost.postMessage(JSON.stringify(payload)); } catch {}"
        "    return Promise.resolve({ ok: true });"
        "  };"
        "  Object.defineProperty(window, 'bioFoilSteamDesktop', {"
        "    configurable: false, enumerable: true, writable: false,"
        "    value: Object.freeze({"
        "      hostNativo: 'LINUX_WEBKIT2GTK_NATIVO',"
        "      steamworksCapiAtivo: %s,"
        "      desbloquearConquista: (id, steamApiKey) => post({ op: 'desbloquearConquista', id: String(id || ''), ...(steamApiKey ? { steamApiKey: String(steamApiKey) } : {}) }),"
        "      salvarConfiguracoes: (cfg) => post({ op: 'salvarConfiguracoes', cfg: cfg || {} }),"
        "      salvarCloud: (arquivo, dados) => post({ op: 'salvarCloud', arquivo: String(arquivo || ''), dados: dados || {} }),"
        "      atualizarRichPresence: (ctx) => post({ op: 'atualizarRichPresence', ctx: ctx || {} }),"
        "      alternarTelaCheia: (ativo) => post({ op: 'alternarTelaCheia', ativo: Boolean(ativo) }),"
        "    }),"
        "  });"
        "})();",
        g_steam_sdk_ativo ? "true" : "false"
    );
    WebKitUserScript *script = webkit_user_script_new(
        js_ponte,
        WEBKIT_USER_SCRIPT_INJECT_AT_DOCUMENT_START,
        WEBKIT_USER_SCRIPT_INJECT_TOP_FRAME,
        NULL,
        NULL
    );
    webkit_user_content_manager_add_script(ucm, script);
    webkit_user_script_unref(script);

    WebKitWebView *webview = WEBKIT_WEB_VIEW(webkit_web_view_new_with_user_content_manager(ucm));
    gtk_container_add(GTK_CONTAINER(win), GTK_WIDGET(webview));
    webkit_web_view_load_uri(webview, url);

    gtk_widget_show_all(win);
    gtk_main();
    g_object_unref(ucm);
    return 0;
}
