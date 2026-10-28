// Bio-Foil — Host Nativo Windows Desktop (Edge WebView2 / Edge Chromium App-Mode + Loopback IPC + Steamworks Flat C-API P/Invoke)
// Zero dependência do legado IE/Trident (System.Windows.Forms.WebBrowser removido integralmente).
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;

internal static class SteamworksWin64FlatApi
{
    [DllImport("steam_api64.dll", CallingConvention = CallingConvention.Cdecl)]
    internal static extern int SteamAPI_InitFlat(StringBuilder errMsg);

    [DllImport("steam_api64.dll", CallingConvention = CallingConvention.Cdecl)]
    internal static extern void SteamAPI_RunCallbacks();

    [DllImport("steam_api64.dll", CallingConvention = CallingConvention.Cdecl)]
    internal static extern void SteamAPI_Shutdown();

    [DllImport("steam_api64.dll", CallingConvention = CallingConvention.Cdecl)]
    internal static extern IntPtr SteamAPI_SteamUserStats_v013();

    [DllImport("steam_api64.dll", CallingConvention = CallingConvention.Cdecl)]
    [return: MarshalAs(UnmanagedType.I1)]
    internal static extern bool SteamAPI_ISteamUserStats_SetAchievement(IntPtr instance, [MarshalAs(UnmanagedType.LPStr)] string pchName);

    [DllImport("steam_api64.dll", CallingConvention = CallingConvention.Cdecl)]
    [return: MarshalAs(UnmanagedType.I1)]
    internal static extern bool SteamAPI_ISteamUserStats_StoreStats(IntPtr instance);

    [DllImport("steam_api64.dll", CallingConvention = CallingConvention.Cdecl)]
    internal static extern IntPtr SteamAPI_SteamRemoteStorage_v016();

    [DllImport("steam_api64.dll", CallingConvention = CallingConvention.Cdecl)]
    [return: MarshalAs(UnmanagedType.I1)]
    internal static extern bool SteamAPI_ISteamRemoteStorage_FileWrite(IntPtr instance, [MarshalAs(UnmanagedType.LPStr)] string pchFile, byte[] pvData, int cubData);

    [DllImport("steam_api64.dll", CallingConvention = CallingConvention.Cdecl)]
    internal static extern IntPtr SteamAPI_SteamFriends_v017();

    [DllImport("steam_api64.dll", CallingConvention = CallingConvention.Cdecl)]
    [return: MarshalAs(UnmanagedType.I1)]
    internal static extern bool SteamAPI_ISteamFriends_SetRichPresence(IntPtr instance, [MarshalAs(UnmanagedType.LPStr)] string pchKey, [MarshalAs(UnmanagedType.LPStr)] string pchValue);
}

internal sealed class BioFoilSteamBridgeWin
{
    private readonly string _pastaSteamDados;
    private IntPtr _userStatsPtr = IntPtr.Zero;
    private IntPtr _remoteStoragePtr = IntPtr.Zero;
    private IntPtr _friendsPtr = IntPtr.Zero;
    internal bool SdkAtivo { get; private set; }
    internal Action<bool> AoAlternarTelaCheia;

    internal BioFoilSteamBridgeWin(string pastaSteamDados)
    {
        _pastaSteamDados = pastaSteamDados;
        Directory.CreateDirectory(Path.Combine(_pastaSteamDados, "steam_cloud"));
        try
        {
            var sb = new StringBuilder(1024);
            SdkAtivo = SteamworksWin64FlatApi.SteamAPI_InitFlat(sb) == 0;
            if (SdkAtivo)
            {
                try { _userStatsPtr = SteamworksWin64FlatApi.SteamAPI_SteamUserStats_v013(); } catch { _userStatsPtr = IntPtr.Zero; }
                try { _remoteStoragePtr = SteamworksWin64FlatApi.SteamAPI_SteamRemoteStorage_v016(); } catch { _remoteStoragePtr = IntPtr.Zero; }
                try { _friendsPtr = SteamworksWin64FlatApi.SteamAPI_SteamFriends_v017(); } catch { _friendsPtr = IntPtr.Zero; }
            }
        }
        catch
        {
            SdkAtivo = false;
        }
    }

    internal void PumpCallbacks()
    {
        if (!SdkAtivo) return;
        try { SteamworksWin64FlatApi.SteamAPI_RunCallbacks(); } catch { }
    }

    internal void Shutdown()
    {
        if (!SdkAtivo) return;
        SdkAtivo = false;
        try { SteamworksWin64FlatApi.SteamAPI_Shutdown(); } catch { }
    }

    private void GravarAtomico(string nomeRelativo, string conteudoJson)
    {
        string destino = Path.Combine(_pastaSteamDados, nomeRelativo);
        string dir = Path.GetDirectoryName(destino);
        if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
        string tmp = destino + ".tmp." + Process.GetCurrentProcess().Id;
        File.WriteAllText(tmp, conteudoJson + "\n", new UTF8Encoding(false));
        if (File.Exists(destino)) File.Delete(destino);
        File.Move(tmp, destino);
    }

    private bool EscreverSteamCloud(string nomeArquivo, string conteudoJson)
    {
        if (!SdkAtivo || _remoteStoragePtr == IntPtr.Zero || string.IsNullOrEmpty(nomeArquivo)) return false;
        byte[] bytes = Encoding.UTF8.GetBytes(conteudoJson);
        if (bytes.Length == 0) return false;
        try
        {
            return SteamworksWin64FlatApi.SteamAPI_ISteamRemoteStorage_FileWrite(_remoteStoragePtr, nomeArquivo, bytes, bytes.Length);
        }
        catch
        {
            return false;
        }
    }

    private static string ExtrairCampoString(string json, string chave)
    {
        var m = Regex.Match(json ?? "", "\"" + Regex.Escape(chave) + "\"\\s*:\\s*\"([^\"]*)\"");
        return m.Success ? m.Groups[1].Value : "";
    }

    private static string ExtrairSubObjetoJson(string json, string chave)
    {
        if (string.IsNullOrEmpty(json)) return "{}";
        var m = Regex.Match(json, "\"" + Regex.Escape(chave) + "\"\\s*:\\s*");
        if (!m.Success) return "{}";
        int idx = m.Index + m.Length;
        if (idx >= json.Length || (json[idx] != '{' && json[idx] != '[')) return "{}";
        char ab = json[idx];
        char fe = ab == '{' ? '}' : ']';
        int niv = 0;
        bool emStr = false;
        for (int i = idx; i < json.Length; i++)
        {
            char c = json[i];
            if (c == '"' && (i == 0 || json[i - 1] != '\\')) emStr = !emStr;
            if (emStr) continue;
            if (c == ab) niv++;
            else if (c == fe)
            {
                niv--;
                if (niv == 0) return json.Substring(idx, i - idx + 1);
            }
        }
        return "{}";
    }

    private static readonly System.Collections.Generic.Dictionary<string, string> MapaAchSteamApiKey =
        new System.Collections.Generic.Dictionary<string, string>(StringComparer.Ordinal)
        {
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

    private static string ResolverSteamApiKey(string idOuApiKey)
    {
        if (string.IsNullOrEmpty(idOuApiKey)) return "";
        if (idOuApiKey.StartsWith("STAT_ACH_", StringComparison.Ordinal)) return idOuApiKey;
        string mapeada;
        return MapaAchSteamApiKey.TryGetValue(idOuApiKey, out mapeada) ? mapeada : ("STAT_" + idOuApiKey);
    }

    internal void ProcessarMensagemJson(string json)
    {
        string op = ExtrairCampoString(json, "op");
        if (op == "alternarTelaCheia")
        {
            bool ativo = Regex.IsMatch(json ?? "", "\"ativo\"\\s*:\\s*true", RegexOptions.IgnoreCase);
            AoAlternarTelaCheia?.Invoke(ativo);
        }
        else if (op == "desbloquearConquista")
        {
            string idAch = ExtrairCampoString(json, "id");
            string apiKeyExp = ExtrairCampoString(json, "steamApiKey");
            if (!string.IsNullOrEmpty(idAch))
            {
                string arq = Path.Combine(_pastaSteamDados, "achievements.json");
                string atual = File.Exists(arq) ? File.ReadAllText(arq, Encoding.UTF8) : "[]";
                if (!atual.Contains("\"" + idAch + "\""))
                {
                    string limpo = atual.Trim();
                    string novo = (limpo == "[]" || string.IsNullOrEmpty(limpo))
                        ? "[\n  \"" + idAch + "\"\n]"
                        : limpo.TrimEnd(']').TrimEnd() + ",\n  \"" + idAch + "\"\n]";
                    GravarAtomico("achievements.json", novo);
                }
                if (SdkAtivo && _userStatsPtr != IntPtr.Zero)
                {
                    try
                    {
                        string chaveSteam = !string.IsNullOrEmpty(apiKeyExp) ? ResolverSteamApiKey(apiKeyExp) : ResolverSteamApiKey(idAch);
                        SteamworksWin64FlatApi.SteamAPI_ISteamUserStats_SetAchievement(_userStatsPtr, chaveSteam);
                        SteamworksWin64FlatApi.SteamAPI_ISteamUserStats_StoreStats(_userStatsPtr);
                    }
                    catch { }
                }
            }
        }
        else if (op == "salvarConfiguracoes")
        {
            string cfgJson = ExtrairSubObjetoJson(json, "cfg");
            GravarAtomico("settings.json", cfgJson);
            GravarAtomico(Path.Combine("steam_cloud", "settings.json"), cfgJson);
            EscreverSteamCloud("settings.json", cfgJson);
        }
        else if (op == "salvarCloud")
        {
            string nome = Path.GetFileName(ExtrairCampoString(json, "arquivo"));
            if (!string.IsNullOrEmpty(nome))
            {
                string dadosJson = ExtrairSubObjetoJson(json, "dados");
                GravarAtomico(Path.Combine("steam_cloud", nome), dadosJson);
                EscreverSteamCloud(nome, dadosJson);
            }
        }
        else if (op == "atualizarRichPresence")
        {
            string ctxJson = ExtrairSubObjetoJson(json, "ctx");
            GravarAtomico("rich_presence.json", ctxJson);
            string fase = ExtrairCampoString(ctxJson, "faseJogo").ToUpperInvariant();
            string layout = ExtrairCampoString(ctxJson, "layoutId");
            if (string.IsNullOrEmpty(layout)) layout = "CARCACA_ALFA_A";
            string dif = ExtrairCampoString(ctxJson, "dificuldade");
            if (string.IsNullOrEmpty(dif)) dif = "NORMAL";
            bool en = ExtrairCampoString(ctxJson, "idioma") == "en-US";
            var mSetor = Regex.Match(ctxJson, "\"setorNumero\"\\s*:\\s*(\\d+)");
            int setor = mSetor.Success ? Math.Max(1, Math.Min(8, int.Parse(mSetor.Groups[1].Value))) : 1;
            string statusFmt = fase == "INICIO"
                ? (en ? "In Hangar — Preparing Bio-Craft" : "No Hangar — Preparando Bio-Nave")
                : fase == "FIM_DE_RUN"
                    ? (en ? $"Expedition Complete — Sector {setor}/8" : $"Expedição Encerrada — Setor {setor}/8")
                    : (en ? $"Sector {setor}/8 — {layout} ({dif})" : $"Setor {setor}/8 — {layout} ({dif})");
            if (SdkAtivo && _friendsPtr != IntPtr.Zero)
            {
                try
                {
                    SteamworksWin64FlatApi.SteamAPI_ISteamFriends_SetRichPresence(_friendsPtr, "steam_display", "#StatusGeneric");
                    SteamworksWin64FlatApi.SteamAPI_ISteamFriends_SetRichPresence(_friendsPtr, "status", statusFmt);
                }
                catch { }
            }
        }
    }
}

internal sealed class LoopbackSteamIpcServer : IDisposable
{
    private readonly TcpListener _listener;
    private readonly BioFoilSteamBridgeWin _bridge;
    private volatile bool _rodando = true;
    internal int Porta { get; }

    internal LoopbackSteamIpcServer(BioFoilSteamBridgeWin bridge)
    {
        _bridge = bridge;
        _listener = new TcpListener(IPAddress.Loopback, 0);
        _listener.Start();
        Porta = ((IPEndPoint)_listener.LocalEndpoint).Port;
        var thr = new Thread(LoopAceite) { IsBackground = true, Name = "BioFoilSteamIpcLoop" };
        thr.Start();
    }

    private void LoopAceite()
    {
        while (_rodando)
        {
            try
            {
                TcpClient cli = _listener.AcceptTcpClient();
                ThreadPool.QueueUserWorkItem(_ => AtenderCliente(cli));
            }
            catch
            {
                if (!_rodando) break;
            }
        }
    }

    private void AtenderCliente(TcpClient cli)
    {
        using (cli)
        using (NetworkStream ns = cli.GetStream())
        {
            ns.ReadTimeout = 2000;
            ns.WriteTimeout = 2000;
            byte[] buf = new byte[65536];
            int lidos = ns.Read(buf, 0, buf.Length);
            if (lidos <= 0) return;
            string req = Encoding.UTF8.GetString(buf, 0, lidos);
            int idxSep = req.IndexOf("\r\n\r\n", StringComparison.Ordinal);
            string body = idxSep >= 0 ? req.Substring(idxSep + 4) : "";
            if (!req.StartsWith("OPTIONS ", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(body))
            {
                _bridge.ProcessarMensagemJson(body);
            }
            string respJson = "{\"ok\":true,\"steamworksCapiAtivo\":" + (_bridge.SdkAtivo ? "true" : "false") + "}";
            byte[] respBody = Encoding.UTF8.GetBytes(respJson);
            string headers =
                "HTTP/1.1 200 OK\r\n" +
                "Content-Type: application/json; charset=utf-8\r\n" +
                "Access-Control-Allow-Origin: *\r\n" +
                "Access-Control-Allow-Methods: POST, OPTIONS\r\n" +
                "Access-Control-Allow-Headers: Content-Type, Access-Control-Request-Private-Network\r\n" +
                "Access-Control-Allow-Private-Network: true\r\n" +
                "Content-Length: " + respBody.Length + "\r\n" +
                "Connection: close\r\n\r\n";
            byte[] respHead = Encoding.ASCII.GetBytes(headers);
            ns.Write(respHead, 0, respHead.Length);
            ns.Write(respBody, 0, respBody.Length);
        }
    }

    public void Dispose()
    {
        _rodando = false;
        try { _listener.Stop(); } catch { }
    }
}

public static class BioFoilWindowsHostProgram
{
    private static string LocalizarEdgeChromium()
    {
        string[] raizes = new[]
        {
            Environment.GetEnvironmentVariable("ProgramFiles(x86)"),
            Environment.GetEnvironmentVariable("ProgramFiles"),
            Environment.GetEnvironmentVariable("LocalAppData"),
        };
        foreach (string r in raizes)
        {
            if (string.IsNullOrEmpty(r)) continue;
            string cand = Path.Combine(r, "Microsoft", "Edge", "Application", "msedge.exe");
            if (File.Exists(cand)) return cand;
        }
        return null;
    }

    private static Control TentarCriarWebView2Embutido(string urlComIpc)
    {
        try
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string dllForms = Path.Combine(baseDir, "Microsoft.Web.WebView2.WinForms.dll");
            if (!File.Exists(dllForms)) return null;
            Assembly asmForms = Assembly.LoadFrom(dllForms);
            Type tipoWv2 = asmForms.GetType("Microsoft.Web.WebView2.WinForms.WebView2");
            if (tipoWv2 == null) return null;
            var ctrl = (Control)Activator.CreateInstance(tipoWv2);
            ctrl.Dock = DockStyle.Fill;
            PropertyInfo propSource = tipoWv2.GetProperty("Source");
            propSource?.SetValue(ctrl, new Uri(urlComIpc), null);
            return ctrl;
        }
        catch
        {
            return null;
        }
    }

    [STAThread]
    public static int Main(string[] args)
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        string urlBase = Environment.GetEnvironmentVariable("BIOFOIL_ENGINE_URL");
        if (string.IsNullOrEmpty(urlBase))
        {
            urlBase = args.Length > 0 ? args[0] : "http://127.0.0.1:4173";
        }
        string pastaSteam = Environment.GetEnvironmentVariable("BIOFOIL_STEAM_DATA_DIR");
        if (string.IsNullOrEmpty(pastaSteam))
        {
            pastaSteam = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".biofoil-steam");
        }
        bool ehDeck = Environment.GetEnvironmentVariable("SteamDeck") == "1";

        var bridge = new BioFoilSteamBridgeWin(pastaSteam);
        using (var ipc = new LoopbackSteamIpcServer(bridge))
        {
            string sep = urlBase.Contains("?") ? "&" : "?";
            string urlFinal = $"{urlBase}{sep}steam_ipc_port={ipc.Porta}&steam_capi={(bridge.SdkAtivo ? "1" : "0")}";

            // 1. Tenta WebView2 embutido em WinForms caso Microsoft.Web.WebView2.WinForms.dll esteja presente
            Control wv2 = TentarCriarWebView2Embutido(urlFinal);
            if (wv2 != null)
            {
                using (var form = new Form
                {
                    Text = "BIO-FOIL — Tactical Hydrofoil Roguelike",
                    ClientSize = new Size(ehDeck ? 1280 : 1600, ehDeck ? 800 : 900),
                    MinimumSize = new Size(960, 540),
                    BackColor = Color.FromArgb(4, 10, 16),
                    StartPosition = FormStartPosition.CenterScreen,
                    WindowState = ehDeck ? FormWindowState.Maximized : FormWindowState.Normal,
                })
                using (var pump = new System.Windows.Forms.Timer { Interval = 50 })
                {
                    bridge.AoAlternarTelaCheia = (ativo) =>
                    {
                        if (form.InvokeRequired) form.BeginInvoke(new Action(() => AlternarFullscreenWinForms(form, ativo)));
                        else AlternarFullscreenWinForms(form, ativo);
                    };
                    pump.Tick += (_, __) => bridge.PumpCallbacks();
                    pump.Start();
                    form.Controls.Add(wv2);
                    Application.Run(form);
                    pump.Stop();
                }
                bridge.Shutdown();
                return 0;
            }

            // 2. Fallback Chromium moderno sem DLL externa: Microsoft Edge Chromium (msedge.exe --app=...) nativo do Windows 10/11
            string edgeExe = LocalizarEdgeChromium();
            if (!string.IsNullOrEmpty(edgeExe))
            {
                string perfilEdge = Path.Combine(pastaSteam, "webview2_edge_app_profile");
                Directory.CreateDirectory(perfilEdge);
                string tamArg = ehDeck ? "--window-size=1280,800 --start-fullscreen" : "--window-size=1600,900";
                var psi = new ProcessStartInfo
                {
                    FileName = edgeExe,
                    Arguments = $"--app=\"{urlFinal}\" --new-window --no-first-run --no-default-browser-check --user-data-dir=\"{perfilEdge}\" {tamArg}",
                    UseShellExecute = false,
                };
                using (Process procEdge = Process.Start(psi))
                {
                    while (procEdge != null && !procEdge.HasExited)
                    {
                        bridge.PumpCallbacks();
                        Thread.Sleep(50);
                    }
                }
                bridge.Shutdown();
                return 0;
            }

            bridge.Shutdown();
            return 2;
        }
    }

    private static void AlternarFullscreenWinForms(Form form, bool ativo)
    {
        if (ativo)
        {
            form.FormBorderStyle = FormBorderStyle.None;
            form.WindowState = FormWindowState.Maximized;
        }
        else
        {
            form.FormBorderStyle = FormBorderStyle.Sizable;
            form.WindowState = FormWindowState.Normal;
        }
    }
}
