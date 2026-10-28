import AppKit
import Darwin
import Foundation
import WebKit

final class SteamworksFlatCApiBridge {
    private var dylibHandle: UnsafeMutableRawPointer?
    private var userStatsPtr: UnsafeMutableRawPointer?
    private var remoteStoragePtr: UnsafeMutableRawPointer?
    private var friendsPtr: UnsafeMutableRawPointer?

    private typealias FnInitFlat = @convention(c) (UnsafeMutablePointer<CChar>?) -> Int32
    private typealias FnInitLegacy = @convention(c) () -> Bool
    private typealias FnVoid = @convention(c) () -> Void
    private typealias FnAccessor = @convention(c) () -> UnsafeMutableRawPointer?
    private typealias FnSetAchievement = @convention(c) (UnsafeMutableRawPointer, UnsafePointer<CChar>) -> Bool
    private typealias FnStoreStats = @convention(c) (UnsafeMutableRawPointer) -> Bool
    private typealias FnFileWrite = @convention(c) (UnsafeMutableRawPointer, UnsafePointer<CChar>, UnsafeRawPointer, Int32) -> Bool
    private typealias FnSetRichPresence = @convention(c) (UnsafeMutableRawPointer, UnsafePointer<CChar>, UnsafePointer<CChar>) -> Bool

    private var fnRunCallbacks: FnVoid?
    private var fnShutdown: FnVoid?
    private var fnSetAchievement: FnSetAchievement?
    private var fnStoreStats: FnStoreStats?
    private var fnFileWrite: FnFileWrite?
    private var fnSetRichPresence: FnSetRichPresence?

    private(set) var sdkAtivo: Bool = false
    private(set) var caminhoDylibCarregada: String?
    private(set) var callbacksExecutados: Int = 0

    init(raizDepot: URL) {
        let execDir = URL(fileURLWithPath: CommandLine.arguments[0]).resolvingSymlinksInPath().deletingLastPathComponent()
        var candidatos: [String] = []
        if let envDylib = ProcessInfo.processInfo.environment["BIOFOIL_STEAM_API_DYLIB"], !envDylib.isEmpty {
            candidatos.append(envDylib)
        }
        candidatos.append(contentsOf: [
            execDir.appendingPathComponent("libsteam_api.dylib").path,
            execDir.deletingLastPathComponent().appendingPathComponent("Frameworks/libsteam_api.dylib").path,
            raizDepot.appendingPathComponent("libsteam_api.dylib").path,
            raizDepot.appendingPathComponent("steam-desktop/macos-native/libsteam_api.dylib").path,
            "libsteam_api.dylib",
        ])

        for cand in candidatos {
            if cand != "libsteam_api.dylib" && !FileManager.default.fileExists(atPath: cand) {
                continue
            }
            if let h = Darwin.dlopen(cand, RTLD_LAZY | RTLD_LOCAL) {
                dylibHandle = h
                caminhoDylibCarregada = cand
                break
            }
        }

        guard let handle = dylibHandle else { return }

        var inicializado = false
        if let symInitFlat = Darwin.dlsym(handle, "SteamAPI_InitFlat") {
            let initFlat = unsafeBitCast(symInitFlat, to: FnInitFlat.self)
            var errBuf = [CChar](repeating: 0, count: 1024)
            inicializado = (initFlat(&errBuf) == 0)
        } else if let symInit = Darwin.dlsym(handle, "SteamAPI_Init") {
            let initLegacy = unsafeBitCast(symInit, to: FnInitLegacy.self)
            inicializado = initLegacy()
        }

        guard inicializado else {
            Darwin.dlclose(handle)
            dylibHandle = nil
            caminhoDylibCarregada = nil
            return
        }

        sdkAtivo = true
        if let s = Darwin.dlsym(handle, "SteamAPI_RunCallbacks") {
            fnRunCallbacks = unsafeBitCast(s, to: FnVoid.self)
        }
        if let s = Darwin.dlsym(handle, "SteamAPI_Shutdown") {
            fnShutdown = unsafeBitCast(s, to: FnVoid.self)
        }

        for nomeSym in ["SteamAPI_SteamUserStats_v013", "SteamAPI_SteamUserStats_v012", "SteamUserStats"] {
            if let s = Darwin.dlsym(handle, nomeSym) {
                let acc = unsafeBitCast(s, to: FnAccessor.self)
                if let p = acc() {
                    userStatsPtr = p
                    break
                }
            }
        }
        for nomeSym in ["SteamAPI_SteamRemoteStorage_v016", "SteamAPI_SteamRemoteStorage_v014", "SteamRemoteStorage"] {
            if let s = Darwin.dlsym(handle, nomeSym) {
                let acc = unsafeBitCast(s, to: FnAccessor.self)
                if let p = acc() {
                    remoteStoragePtr = p
                    break
                }
            }
        }
        for nomeSym in ["SteamAPI_SteamFriends_v017", "SteamAPI_SteamFriends_v015", "SteamFriends"] {
            if let s = Darwin.dlsym(handle, nomeSym) {
                let acc = unsafeBitCast(s, to: FnAccessor.self)
                if let p = acc() {
                    friendsPtr = p
                    break
                }
            }
        }

        if let s = Darwin.dlsym(handle, "SteamAPI_ISteamUserStats_SetAchievement") {
            fnSetAchievement = unsafeBitCast(s, to: FnSetAchievement.self)
        }
        if let s = Darwin.dlsym(handle, "SteamAPI_ISteamUserStats_StoreStats") {
            fnStoreStats = unsafeBitCast(s, to: FnStoreStats.self)
        }
        if let s = Darwin.dlsym(handle, "SteamAPI_ISteamRemoteStorage_FileWrite") {
            fnFileWrite = unsafeBitCast(s, to: FnFileWrite.self)
        }
        if let s = Darwin.dlsym(handle, "SteamAPI_ISteamFriends_SetRichPresence") {
            fnSetRichPresence = unsafeBitCast(s, to: FnSetRichPresence.self)
        }
    }

    func runCallbacks() {
        guard sdkAtivo, let fn = fnRunCallbacks else { return }
        fn()
        callbacksExecutados += 1
    }

    static let mapaAchParaSteamApiKey: [String: String] = [
        "ACH_CARCACA_1_FOIL_PURO": "STAT_ACH_CARCACA_1",
        "ACH_CARCACA_2_DRENAGEM_LAMPEJO": "STAT_ACH_CARCACA_2",
        "ACH_MANTA_1_BLACKOUT_TOTAL": "STAT_ACH_MANTA_1",
        "ACH_MANTA_2_SEM_ESCUDO_ATE_S5": "STAT_ACH_MANTA_2",
        "ACH_COURACA_1_ARIETE_PESADO": "STAT_ACH_COURACA_1",
        "ACH_COURACA_2_FORTALEZA_BLINDADA": "STAT_ACH_COURACA_2",
        "ACH_SOMBRA_1_FANTASMA_TERMAL": "STAT_ACH_SOMBRA_1",
        "ACH_SOMBRA_2_PREDADOR_CIRURGICO": "STAT_ACH_SOMBRA_2",
        "ACH_COLMEIA_1_QUATRO_ESPECIES": "STAT_ACH_COLMEIA_1",
        "ACH_COLMEIA_2_ABORDAGEM_OSMOTICA": "STAT_ACH_COLMEIA_2",
        "ACH_GLOBAL_PRIMEIRO_SALTO": "STAT_ACH_GLOBAL_1",
        "ACH_GLOBAL_CAPTURA_INTACTA": "STAT_ACH_GLOBAL_2",
        "ACH_GLOBAL_MERGULHO_EVASAO": "STAT_ACH_GLOBAL_3",
        "ACH_GLOBAL_BLUE_OPTION": "STAT_ACH_GLOBAL_4",
        "ACH_GLOBAL_QUEST_COMPLETA": "STAT_ACH_GLOBAL_5",
        "ACH_GLOBAL_ARSENAL_4_BOCAS": "STAT_ACH_GLOBAL_6",
        "ACH_GLOBAL_ENXERTO_TRIPLO": "STAT_ACH_GLOBAL_7",
        "ACH_GLOBAL_MESTRE_OFICINA": "STAT_ACH_GLOBAL_8",
        "ACH_GLOBAL_SETOR_5_PROFUNDO": "STAT_ACH_GLOBAL_9",
        "ACH_GLOBAL_MATADOR_LEVIATA": "STAT_ACH_GLOBAL_10",
        "ACH_GLOBAL_VITORIA_CARCACA": "STAT_ACH_GLOBAL_11",
        "ACH_GLOBAL_VITORIA_DIFICIL": "STAT_ACH_GLOBAL_12",
        "ACH_GLOBAL_FROTA_COMPLETA_AB": "STAT_ACH_GLOBAL_13",
        "ACH_GLOBAL_TUTORIAL_CONCLUIDO": "STAT_ACH_GLOBAL_14",
    ]

    static func resolverSteamApiKey(_ idOuApiKey: String) -> String {
        if idOuApiKey.hasPrefix("STAT_ACH_") { return idOuApiKey }
        return mapaAchParaSteamApiKey[idOuApiKey] ?? ("STAT_" + idOuApiKey)
    }

    @discardableResult
    func setAchievement(_ apiKey: String) -> Bool {
        guard sdkAtivo, let ptr = userStatsPtr, let fnSet = fnSetAchievement else { return false }
        let chaveSteam = Self.resolverSteamApiKey(apiKey)
        let ok = chaveSteam.withCString { cStr in
            fnSet(ptr, cStr)
        }
        if let fnStore = fnStoreStats {
            _ = fnStore(ptr)
        }
        return ok
    }

    @discardableResult
    func writeCloudFile(name: String, content: String) -> Bool {
        guard sdkAtivo,
              let ptr = remoteStoragePtr,
              let fnWrite = fnFileWrite,
              let data = content.data(using: .utf8),
              !data.isEmpty else { return false }
        return name.withCString { cName in
            data.withUnsafeBytes { rawBuf in
                guard let base = rawBuf.baseAddress else { return false }
                return fnWrite(ptr, cName, base, Int32(data.count))
            }
        }
    }

    @discardableResult
    func setRichPresence(status: String) -> Bool {
        guard sdkAtivo, let ptr = friendsPtr, let fnRp = fnSetRichPresence else { return false }
        _ = "steam_display".withCString { k in
            "#StatusGeneric".withCString { v in fnRp(ptr, k, v) }
        }
        return "status".withCString { k in
            status.withCString { v in fnRp(ptr, k, v) }
        }
    }

    func shutdown() {
        if sdkAtivo, let fn = fnShutdown {
            fn()
        }
        sdkAtivo = false
        if let h = dylibHandle {
            Darwin.dlclose(h)
            dylibHandle = nil
        }
    }
}

final class BioFoilBridgeHandler: NSObject, WKScriptMessageHandler {
    weak var window: NSWindow?
    let pastaSteamDados: URL
    let steamworksSdk: SteamworksFlatCApiBridge

    init(pastaSteamDados: URL, steamworksSdk: SteamworksFlatCApiBridge) {
        self.pastaSteamDados = pastaSteamDados
        self.steamworksSdk = steamworksSdk
        super.init()
        try? FileManager.default.createDirectory(
            at: pastaSteamDados.appendingPathComponent("steam_cloud"),
            withIntermediateDirectories: true
        )
    }

    private func gravarAtomico(nomeRelativo: String, textoJson: String) {
        let destino = pastaSteamDados.appendingPathComponent(nomeRelativo)
        let pasta = destino.deletingLastPathComponent()
        try? FileManager.default.createDirectory(at: pasta, withIntermediateDirectories: true)
        let tmp = destino.appendingPathExtension("tmp.\(ProcessInfo.processInfo.processIdentifier)")
        if let data = (textoJson + "\n").data(using: .utf8) {
            try? data.write(to: tmp, options: .atomic)
            if FileManager.default.fileExists(atPath: destino.path) {
                _ = try? FileManager.default.replaceItemAt(destino, withItemAt: tmp)
            } else {
                try? FileManager.default.moveItem(at: tmp, to: destino)
            }
        }
    }

    private func formatarRichPresence(ctx: [String: Any]) -> String {
        let fase = ((ctx["faseJogo"] as? String) ?? "INICIO").uppercased()
        let setor = max(1, min(8, (ctx["setorNumero"] as? Int) ?? 1))
        let layout = (ctx["layoutId"] as? String) ?? "CARCACA_ALFA_A"
        let dif = (ctx["dificuldade"] as? String) ?? "NORMAL"
        let en = ((ctx["idioma"] as? String) ?? "pt-BR") == "en-US"
        if fase == "INICIO" {
            return en ? "In Hangar — Preparing Bio-Craft" : "No Hangar — Preparando Bio-Nave"
        }
        if fase == "FIM_DE_RUN" {
            return en ? "Expedition Complete — Sector \(setor)/8" : "Expedição Encerrada — Setor \(setor)/8"
        }
        return en ? "Sector \(setor)/8 — \(layout) (\(dif))" : "Setor \(setor)/8 — \(layout) (\(dif))"
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let dict = message.body as? [String: Any],
              let op = dict["op"] as? String else { return }

        switch op {
        case "alternarTelaCheia":
            if let win = window {
                let atual = win.styleMask.contains(.fullScreen)
                let deseja = (dict["ativo"] as? Bool) ?? !atual
                if deseja != atual {
                    win.toggleFullScreen(nil)
                }
            }
        case "desbloquearConquista":
            if let idAch = dict["id"] as? String, !idAch.isEmpty {
                let arq = pastaSteamDados.appendingPathComponent("achievements.json")
                var lista: [String] = []
                if let d = try? Data(contentsOf: arq),
                   let arr = try? JSONSerialization.jsonObject(with: d) as? [String] {
                    lista = arr
                }
                if !lista.contains(idAch) {
                    lista.append(idAch)
                    if let out = try? JSONSerialization.data(withJSONObject: lista, options: [.prettyPrinted]),
                       let txt = String(data: out, encoding: .utf8) {
                        gravarAtomico(nomeRelativo: "achievements.json", textoJson: txt)
                    }
                }
                let chaveSdk = (dict["steamApiKey"] as? String).flatMap { !$0.isEmpty ? $0 : nil } ?? idAch
                _ = steamworksSdk.setAchievement(chaveSdk)
            }
        case "salvarConfiguracoes":
            if let cfg = dict["cfg"],
               JSONSerialization.isValidJSONObject(cfg),
               let out = try? JSONSerialization.data(withJSONObject: cfg, options: [.prettyPrinted]),
               let txt = String(data: out, encoding: .utf8) {
                gravarAtomico(nomeRelativo: "settings.json", textoJson: txt)
                gravarAtomico(nomeRelativo: "steam_cloud/settings.json", textoJson: txt)
                _ = steamworksSdk.writeCloudFile(name: "settings.json", content: txt)
            }
        case "salvarCloud":
            if let nome = dict["arquivo"] as? String,
               let dados = dict["dados"],
               JSONSerialization.isValidJSONObject(dados),
               let out = try? JSONSerialization.data(withJSONObject: dados, options: [.prettyPrinted]),
               let txt = String(data: out, encoding: .utf8) {
                let limpo = (nome as NSString).lastPathComponent
                gravarAtomico(nomeRelativo: "steam_cloud/\(limpo)", textoJson: txt)
                _ = steamworksSdk.writeCloudFile(name: limpo, content: txt)
            }
        case "atualizarRichPresence":
            if let ctx = dict["ctx"] as? [String: Any],
               JSONSerialization.isValidJSONObject(ctx),
               let out = try? JSONSerialization.data(withJSONObject: ctx, options: [.prettyPrinted]),
               let txt = String(data: out, encoding: .utf8) {
                gravarAtomico(nomeRelativo: "rich_presence.json", textoJson: txt)
                let statusFmt = formatarRichPresence(ctx: ctx)
                _ = steamworksSdk.setRichPresence(status: statusFmt)
            }
        default:
            break
        }
    }
}

final class BioFoilAppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var bridge: BioFoilBridgeHandler!
    var steamworksSdk: SteamworksFlatCApiBridge!
    var callbackTimer: Timer?
    var motorProcess: Process?

    static func descobrirRaizDepotEstatico() -> URL {
        if let envRoot = ProcessInfo.processInfo.environment["BIOFOIL_ROOT_DIR"], !envRoot.isEmpty {
            return URL(fileURLWithPath: envRoot)
        }
        let execUrl = URL(fileURLWithPath: CommandLine.arguments[0]).resolvingSymlinksInPath()
        let candidatoDepot = execUrl
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
        if FileManager.default.fileExists(atPath: candidatoDepot.appendingPathComponent("scripts/jogar-biofoil.mjs").path) {
            return candidatoDepot
        }
        return URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
    }

    private func descobrirRaizDepot() -> URL {
        return Self.descobrirRaizDepotEstatico()
    }

    private func alocarPortaLivre() -> Int {
        let sock = Darwin.socket(AF_INET, SOCK_STREAM, 0)
        guard sock >= 0 else { return 4173 }
        defer { Darwin.close(sock) }
        var addr = sockaddr_in()
        addr.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
        addr.sin_family = sa_family_t(AF_INET)
        addr.sin_port = in_port_t(0).bigEndian
        addr.sin_addr = in_addr(s_addr: inet_addr("127.0.0.1"))
        let bindRes = withUnsafePointer(to: &addr) {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                Darwin.bind(sock, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
            }
        }
        guard bindRes == 0 else { return 4173 }
        var len = socklen_t(MemoryLayout<sockaddr_in>.size)
        let nameRes = withUnsafeMutablePointer(to: &addr) {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                Darwin.getsockname(sock, $0, &len)
            }
        }
        guard nameRes == 0 else { return 4173 }
        return Int(UInt16(bigEndian: addr.sin_port))
    }

    private func aguardarServidorPronto(porta: Int) {
        for _ in 0..<80 {
            let sock = Darwin.socket(AF_INET, SOCK_STREAM, 0)
            if sock >= 0 {
                var addr = sockaddr_in()
                addr.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
                addr.sin_family = sa_family_t(AF_INET)
                addr.sin_port = in_port_t(UInt16(porta)).bigEndian
                addr.sin_addr = in_addr(s_addr: inet_addr("127.0.0.1"))
                let ok = withUnsafePointer(to: &addr) {
                    $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                        Darwin.connect(sock, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
                    }
                }
                Darwin.close(sock)
                if ok == 0 { return }
            }
            Thread.sleep(forTimeInterval: 0.05)
        }
    }

    private func resolverOuIniciarUrlMotor() -> String {
        if let urlEnv = ProcessInfo.processInfo.environment["BIOFOIL_ENGINE_URL"], !urlEnv.isEmpty {
            return urlEnv
        }
        let raiz = descobrirRaizDepot()
        let porta = alocarPortaLivre()
        let candidatosNode = [
            raiz.appendingPathComponent("runtime/node/bin/node").path,
            "/opt/homebrew/bin/node",
            "/usr/local/bin/node",
        ]
        let binNode = candidatosNode.first(where: { FileManager.default.isExecutableFile(atPath: $0) }) ?? "/usr/bin/env"
        let proc = Process()
        if binNode == "/usr/bin/env" {
            proc.executableURL = URL(fileURLWithPath: "/usr/bin/env")
            proc.arguments = ["node", "scripts/jogar-biofoil.mjs", "--porta=\(porta)", "--sem-navegador"]
        } else {
            proc.executableURL = URL(fileURLWithPath: binNode)
            proc.arguments = ["scripts/jogar-biofoil.mjs", "--porta=\(porta)", "--sem-navegador"]
        }
        proc.currentDirectoryURL = raiz
        proc.standardInput = FileHandle.nullDevice
        try? proc.run()
        motorProcess = proc
        aguardarServidorPronto(porta: porta)
        return "http://127.0.0.1:\(porta)"
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        let raiz = descobrirRaizDepot()
        steamworksSdk = SteamworksFlatCApiBridge(raizDepot: raiz)
        callbackTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
            self?.steamworksSdk?.runCallbacks()
        }

        let urlMotor = resolverOuIniciarUrlMotor()
        let pastaSteam: URL
        if let envDados = ProcessInfo.processInfo.environment["BIOFOIL_STEAM_DATA_DIR"], !envDados.isEmpty {
            pastaSteam = URL(fileURLWithPath: envDados)
        } else {
            pastaSteam = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".biofoil-steam")
        }
        bridge = BioFoilBridgeHandler(pastaSteamDados: pastaSteam, steamworksSdk: steamworksSdk)

        let configWk = WKWebViewConfiguration()
        let contentController = WKUserContentController()
        contentController.add(bridge, name: "biofoilHost")

        let sdkAtivoJs = steamworksSdk.sdkAtivo ? "true" : "false"
        let jsPonte = """
        (() => {
          const post = (payload) => {
            try {
              window.webkit?.messageHandlers?.biofoilHost?.postMessage(payload);
            } catch {}
            return Promise.resolve({ ok: true });
          };
          Object.defineProperty(window, 'bioFoilSteamDesktop', {
            configurable: false,
            enumerable: true,
            writable: false,
            value: Object.freeze({
              hostNativo: 'MACOS_WKWEBVIEW_APP',
              steamworksCapiAtivo: \(sdkAtivoJs),
              desbloquearConquista: (id, steamApiKey) => post({ op: 'desbloquearConquista', id: String(id || ''), ...(steamApiKey ? { steamApiKey: String(steamApiKey) } : {}) }),
              salvarConfiguracoes: (cfg) => post({ op: 'salvarConfiguracoes', cfg: cfg || {} }),
              salvarCloud: (arquivo, dados) => post({ op: 'salvarCloud', arquivo: String(arquivo || ''), dados: dados || {} }),
              atualizarRichPresence: (ctx) => post({ op: 'atualizarRichPresence', ctx: ctx || {} }),
              alternarTelaCheia: (ativo) => post({ op: 'alternarTelaCheia', ativo: Boolean(ativo) }),
            }),
          });
        })();
        """
        let userScript = WKUserScript(source: jsPonte, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        contentController.addUserScript(userScript)
        configWk.userContentController = contentController

        let ehSteamDeck = ProcessInfo.processInfo.environment["SteamDeck"] == "1"
        let larg: CGFloat = ehSteamDeck ? 1280 : 1600
        let alt: CGFloat = ehSteamDeck ? 800 : 900
        let rect = NSRect(x: 0, y: 0, width: larg, height: alt)

        window = NSWindow(
            contentRect: rect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "BIO-FOIL — Tactical Hydrofoil Roguelike"
        window.backgroundColor = NSColor(calibratedRed: 0.016, green: 0.039, blue: 0.063, alpha: 1.0)
        window.contentMinSize = NSSize(width: 960, height: 540)
        window.collectionBehavior = [.fullScreenPrimary]
        window.center()
        window.delegate = self
        bridge.window = window

        webView = WKWebView(frame: rect, configuration: configWk)
        webView.autoresizingMask = [.width, .height]
        webView.setValue(false, forKey: "drawsBackground")
        window.contentView = webView

        if let parsed = URL(string: urlMotor) {
            webView.load(URLRequest(url: parsed))
        }

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        if ehSteamDeck {
            window.toggleFullScreen(nil)
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }

    func applicationWillTerminate(_ notification: Notification) {
        callbackTimer?.invalidate()
        callbackTimer = nil
        steamworksSdk?.shutdown()
        if let proc = motorProcess, proc.isRunning {
            proc.terminate()
            proc.waitUntilExit()
        }
    }
}

if CommandLine.arguments.contains("--self-test-steamworks") {
    let raiz = BioFoilAppDelegate.descobrirRaizDepotEstatico()
    let ponte = SteamworksFlatCApiBridge(raizDepot: raiz)
    let achOk = ponte.setAchievement("ACH_CARCACA_1_FOIL_PURO")
    let cloudOk = ponte.writeCloudFile(name: "profile.json", content: "{\"carcacasDesbloqueadas\":{\"CARCACA_ALFA\":true}}")
    let rpOk = ponte.setRichPresence(status: "Setor 4/8 — MANTA_VOLT_B (DIFICIL)")
    ponte.runCallbacks()
    let cbCount = ponte.callbacksExecutados
    let ativoAntesShutdown = ponte.sdkAtivo
    ponte.shutdown()
    let relatorio: [String: Any] = [
        "sdkAtivo": ativoAntesShutdown,
        "conquistaGravadaSdk": achOk,
        "cloudGravadoSdk": cloudOk,
        "richPresenceGravadoSdk": rpOk,
        "callbacksExecutados": cbCount,
    ]
    if let json = try? JSONSerialization.data(withJSONObject: relatorio, options: []),
       let txt = String(data: json, encoding: .utf8) {
        print(txt)
    }
    Darwin.exit(0)
}

let app = NSApplication.shared
app.setActivationPolicy(.regular)
let delegate = BioFoilAppDelegate()
app.delegate = delegate
app.run()
