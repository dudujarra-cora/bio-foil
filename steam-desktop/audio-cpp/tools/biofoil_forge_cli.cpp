#include "biofoil_audio/loudness_mastering.hpp"
#include "biofoil_audio/voices_and_genres.hpp"
#include <chrono>
#include <cstdio>
#include <filesystem>
#include <string>
#include <vector>

namespace {

struct PilotSpec {
    std::string filename;
    std::string label;
    bool isTerminalClosedArc = false;
    bool isVictoryLydian = false;
    biofoil::audio::ForgeTrackConfig config{};
};

int renderSpecsToDirectory(const std::vector<PilotSpec>& specs, const std::string& outDir, bool quiet) {
    using namespace biofoil::audio;

    std::error_code ec{};
    std::filesystem::create_directories(outDir, ec);
    if (ec) {
        std::fprintf(stderr, "[ERRO] Falha ao criar diretorio de saida: %s\n", outDir.c_str());
        return 1;
    }

    if (!quiet) {
        std::printf("================================================================================================================\n");
        std::printf(" BIO-FOIL C++20 AUDIO FORGE — %zu TRILHAS (192 kHz -> 48 kHz / 24-bit WAV, ITU-R BS.1770-5 -16.00 LUFS)\n", specs.size());
        std::printf("================================================================================================================\n");
    }

    for (const auto& p : specs) {
        const auto t0 = std::chrono::steady_clock::now();

        const auto rawRes = p.isTerminalClosedArc
            ? renderTerminalClosedArcOffline(p.isVictoryLydian, p.config.seed, 48000U)
            : renderProceduralTrackOffline(p.config, 48000U);
        if (!rawRes.ok()) {
            std::fprintf(stderr, "[ERRO] Render falhou para %s (cod=%u)\n", p.filename.c_str(), static_cast<unsigned>(rawRes.error));
            return 2;
        }

        const auto masterRes = masterTrackClosedLoopBs1770(rawRes.value, -16.00, -1.02);
        if (!masterRes.ok()) {
            std::fprintf(stderr, "[ERRO] Masterizacao BS.1770-5 falhou para %s (cod=%u)\n", p.filename.c_str(), static_cast<unsigned>(masterRes.error));
            return 3;
        }

        const auto metricsRes = analyzeAudioMetrics(masterRes.value);
        if (!metricsRes.ok()) {
            std::fprintf(stderr, "[ERRO] Auditoria acustica falhou para %s\n", p.filename.c_str());
            return 4;
        }

        const std::string fullPath = (std::filesystem::path(outDir) / p.filename).string();
        const auto writeRes = writeWav24BitFile(fullPath, masterRes.value);
        if (!writeRes.ok()) {
            std::fprintf(stderr, "[ERRO] Escrita WAV falhou em %s\n", fullPath.c_str());
            return 5;
        }

        if (!quiet) {
            const auto t1 = std::chrono::steady_clock::now();
            const double elapsedSec = std::chrono::duration<double>(t1 - t0).count();
            const double audioDurSec = static_cast<double>(masterRes.value.numFrames()) / 48000.0;
            const double speedX = audioDurSec / std::max(1e-6, elapsedSec);
            const auto& m = metricsRes.value;

            std::printf("\n[OK] %s\n", p.label.c_str());
            std::printf("     Arquivo      : %s (%.2f MB, %.2f s)\n", fullPath.c_str(), static_cast<double>(writeRes.value) / (1024.0 * 1024.0), audioDurSec);
            std::printf("     Loudness     : %.2f LUFS  | True Peak: %.2f dBTP  | Crest Factor: %.2f dB\n",
                        m.integratedLufs, m.truePeakDbtp, m.crestFactorDb);
            std::printf("     Sub Mono <140: %.5f    | Seam/End Delta: %.6f  | Velocidade C++: %.1fx tempo real\n",
                        m.subMonoCorrelation, m.loopSeamDelta, speedX);
        }
    }

    if (!quiet) {
        std::printf("\n================================================================================================================\n");
    }
    return 0;
}

} // namespace

int main(int argc, char** argv) {
    using namespace biofoil::audio;

    if (argc >= 3 && std::string(argv[1]) == "--steam-tracks") {
        const std::string outDir = std::string(argv[2]);
        const std::vector<PilotSpec> steamSpecs = {
            PilotSpec{"HANGAR.wav", "HANGAR (G0 Abyssal Ambient 90 BPM)", false, false,
                      ForgeTrackConfig{GenreZone::G0_AbyssalAmbient, GenreZone::G0_AbyssalAmbient, 26, -1, false, false, false, 0xB10F0001ULL}},
            PilotSpec{"LOJA_RECIFE.wav", "LOJA_RECIFE (G1 Dub Hydro Chart 110 BPM)", false, false,
                      ForgeTrackConfig{GenreZone::G1_DubHydroChart, GenreZone::G1_DubHydroChart, 30, -1, false, false, true, 0xB10F0002ULL}},
            PilotSpec{"ZONA1_EXPLORE.wav", "ZONA1_EXPLORE (G1 Dub Hydro Chart 110 BPM)", false, false,
                      ForgeTrackConfig{GenreZone::G1_DubHydroChart, GenreZone::G1_DubHydroChart, 30, -1, false, false, true, 0xB10F0101ULL}},
            PilotSpec{"ZONA1_COMBAT.wav", "ZONA1_COMBAT (G2 Slow Industrial 110 BPM)", false, false,
                      ForgeTrackConfig{GenreZone::G2_SlowIndustrial, GenreZone::G2_SlowIndustrial, 30, -1, false, true, false, 0xB10F0102ULL}},
            PilotSpec{"BIOMA_S2_EXPLORE.wav", "BIOMA_S2_EXPLORE (G1 Dub Hydro Chart 110 BPM)", false, false,
                      ForgeTrackConfig{GenreZone::G1_DubHydroChart, GenreZone::G1_DubHydroChart, 30, -1, false, false, false, 0xB10F0201ULL}},
            PilotSpec{"BIOMA_S2_COMBAT.wav", "BIOMA_S2_COMBAT (G3 Bio-Mystic Groove 125 BPM)", false, false,
                      ForgeTrackConfig{GenreZone::G3_BioMysticGroove, GenreZone::G3_BioMysticGroove, 34, -1, false, false, false, 0xB10F0202ULL}},
            PilotSpec{"BIOMA_S3_EXPLORE.wav", "BIOMA_S3_EXPLORE (G0 Abyssal Ambient 90 BPM)", false, false,
                      ForgeTrackConfig{GenreZone::G0_AbyssalAmbient, GenreZone::G0_AbyssalAmbient, 26, -1, false, false, true, 0xB10F0301ULL}},
            PilotSpec{"BIOMA_S3_COMBAT.wav", "BIOMA_S3_COMBAT (G3 Bio-Mystic Groove 125 BPM)", false, false,
                      ForgeTrackConfig{GenreZone::G3_BioMysticGroove, GenreZone::G3_BioMysticGroove, 34, -1, false, false, true, 0xB10F0302ULL}},
            PilotSpec{"ZONA2_EXPLORE.wav", "ZONA2_EXPLORE (G1 Dub Hydro Chart 110 BPM)", false, false,
                      ForgeTrackConfig{GenreZone::G1_DubHydroChart, GenreZone::G1_DubHydroChart, 30, -1, false, false, false, 0xB10F0401ULL}},
            PilotSpec{"ZONA2_COMBAT.wav", "ZONA2_COMBAT (G2 Slow Industrial 110 BPM)", false, false,
                      ForgeTrackConfig{GenreZone::G2_SlowIndustrial, GenreZone::G2_SlowIndustrial, 30, -1, false, true, false, 0xB10F0402ULL}},
            PilotSpec{"BIOMA_S5_EXPLORE.wav", "BIOMA_S5_EXPLORE (G3 Bio-Mystic Groove 125 BPM)", false, false,
                      ForgeTrackConfig{GenreZone::G3_BioMysticGroove, GenreZone::G3_BioMysticGroove, 34, -1, false, false, false, 0xB10F0501ULL}},
            PilotSpec{"BIOMA_S5_COMBAT.wav", "BIOMA_S5_COMBAT (G4 Acid Driving 128 BPM)", false, false,
                      ForgeTrackConfig{GenreZone::G4_AcidDriving, GenreZone::G4_AcidDriving, 34, -1, false, false, false, 0xB10F0502ULL}},
            PilotSpec{"ZONA3_EXPLORE.wav", "ZONA3_EXPLORE (G4 Acid Driving 128 BPM)", false, false,
                      ForgeTrackConfig{GenreZone::G4_AcidDriving, GenreZone::G4_AcidDriving, 34, -1, false, false, false, 0xB10F0601ULL}},
            PilotSpec{"ZONA3_COMBAT.wav", "ZONA3_COMBAT (G4 Acid Driving 128 BPM)", false, false,
                      ForgeTrackConfig{GenreZone::G4_AcidDriving, GenreZone::G4_AcidDriving, 34, -1, false, true, true, 0xB10F0602ULL}},
            PilotSpec{"BIOMA_S7_EXPLORE.wav", "BIOMA_S7_EXPLORE (G0 Abyssal Ambient 90 BPM)", false, false,
                      ForgeTrackConfig{GenreZone::G0_AbyssalAmbient, GenreZone::G0_AbyssalAmbient, 26, -1, false, false, false, 0xB10F0701ULL}},
            PilotSpec{"BIOMA_S7_COMBAT.wav", "BIOMA_S7_COMBAT (G3 Bio-Mystic Groove 125 BPM)", false, false,
                      ForgeTrackConfig{GenreZone::G3_BioMysticGroove, GenreZone::G3_BioMysticGroove, 34, -1, true, false, false, 0xB10F0702ULL}},
            PilotSpec{"BIOMA_S8_EXPLORE.wav", "BIOMA_S8_EXPLORE (G4 Acid Driving 128 BPM)", false, false,
                      ForgeTrackConfig{GenreZone::G4_AcidDriving, GenreZone::G4_AcidDriving, 34, -1, false, false, false, 0xB10F0801ULL}},
            PilotSpec{"BIOMA_S8_COMBAT.wav", "BIOMA_S8_COMBAT (G5 Hardgroove Crisis 137 BPM)", false, false,
                      ForgeTrackConfig{GenreZone::G5_HardgrooveCrisis, GenreZone::G5_HardgrooveCrisis, 36, -1, false, true, false, 0xB10F0802ULL}},
            PilotSpec{"BOSS_DRAGA.wav", "BOSS_DRAGA (G4 Acid Driving 128 BPM)", false, false,
                      ForgeTrackConfig{GenreZone::G4_AcidDriving, GenreZone::G4_AcidDriving, 36, -1, false, true, false, 0xB10FB001ULL}},
            PilotSpec{"BOSS_DRAGA_FASE2.wav", "BOSS_DRAGA_FASE2 (G4 -> G5 Escalation)", false, false,
                      ForgeTrackConfig{GenreZone::G4_AcidDriving, GenreZone::G5_HardgrooveCrisis, 36, 18, false, true, false, 0xB10FB002ULL}},
            PilotSpec{"BOSS_DRAGA_FASE3.wav", "BOSS_DRAGA_FASE3 (G5 Hardgroove Crisis 137 BPM)", false, false,
                      ForgeTrackConfig{GenreZone::G5_HardgrooveCrisis, GenreZone::G5_HardgrooveCrisis, 38, -1, false, true, false, 0xB10FB003ULL}},
            PilotSpec{"VITORIA.wav", "VITORIA (T1 Epilogo Lidio 84 BPM)", true, true,
                      ForgeTrackConfig{GenreZone::G0_AbyssalAmbient, GenreZone::G0_AbyssalAmbient, 12, -1, false, false, false, 0xB10F7171ULL}},
            PilotSpec{"DERROTA.wav", "DERROTA (T2 Elegia Permadeath 54->0 BPM)", true, false,
                      ForgeTrackConfig{GenreZone::G0_AbyssalAmbient, GenreZone::G0_AbyssalAmbient, 12, -1, false, false, false, 0xB10F7272ULL}}
        };
        return renderSpecsToDirectory(steamSpecs, outDir, true);
    }

    const std::string outDir = (argc > 1) ? std::string(argv[1]) : std::string(".");
    const std::vector<PilotSpec> pilots = {
        PilotSpec{
            "piloto_g0_ambient_dub_90bpm.wav",
            "G0 — Ambient Dub Abissal (90 BPM, G Dorico 49.00 Hz, Zero Kick + Drone 360ms + OB-Xd Swells + Poisson Sonar/Drops + HydroNoise)",
            false, false,
            ForgeTrackConfig{GenreZone::G0_AbyssalAmbient, GenreZone::G0_AbyssalAmbient, 12, -1, false, false, false, 0xB10F0110000ULL}
        },
        PilotSpec{
            "piloto_g1_dub_techno_110bpm.wav",
            "G1 — Dub Techno da Carta Hidrografica (110 BPM, G Dorico 49.00 Hz, Stabs Gm9<->Cm9 Offbeat + ChowTape 3/16 fb=0.72 + Sonar Modal)",
            false, false,
            ForgeTrackConfig{GenreZone::G1_DubHydroChart, GenreZone::G1_DubHydroChart, 16, -1, false, false, true, 0xB10F0111009ULL}
        },
        PilotSpec{
            "piloto_g2_slow_industrial_110bpm.wav",
            "G2 — Slow Industrial / EBM Escuro (110 BPM, F# Frigio 46.25 Hz, Riff MS-20 K35 + Caixa Hidraulica +7.0ms + Gate Reverb 90ms)",
            false, false,
            ForgeTrackConfig{GenreZone::G2_SlowIndustrial, GenreZone::G2_SlowIndustrial, 16, -1, false, true, false, 0xB10F0112002ULL}
        },
        PilotSpec{
            "piloto_g3_bio_mystic_125bpm.wav",
            "G3 — Bio-Mystic Groove / Organic Deep Tech (125 BPM, G Dorico 49.00 Hz, Kick 142ms + Voz 3 Formantes + Rings 6/16 + Suck -28ms + Mergulho 400Hz B9-B12)",
            false, false,
            ForgeTrackConfig{GenreZone::G3_BioMysticGroove, GenreZone::G3_BioMysticGroove, 16, -1, true, false, false, 0xB10F0113003ULL}
        },
        PilotSpec{
            "piloto_g4_acid_driving_128bpm.wav",
            "G4 — Acid Driving Submarino / Plastikman Minimal (128 BPM, F# Frigio 46.25 Hz, Diode303 18dB/oct + Slide RC 60ms + Memoria C13 + Polimetria 5x7)",
            false, false,
            ForgeTrackConfig{GenreZone::G4_AcidDriving, GenreZone::G4_AcidDriving, 16, -1, false, false, false, 0xB10F0114004ULL}
        },
        PilotSpec{
            "piloto_g5_industrial_hardgroove_137bpm.wav",
            "G5 — Industrial Hardgroove / Draga F3 (137 BPM, F Locrio 43.65 Hz, Techno Rumble <=104Hz + Bigorna FM E(7,16)xE(9,16) Bode +18Hz + Sirene Tritono B13-B15)",
            false, false,
            ForgeTrackConfig{GenreZone::G5_HardgrooveCrisis, GenreZone::G5_HardgrooveCrisis, 16, -1, false, true, false, 0xB10F0115005ULL}
        },
        PilotSpec{
            "piloto_t1_epilogo_vitoria_84bpm.wav",
            "T1 — Epilogo de Vitoria: Superficie Solar (84 BPM, G Lidio 49.00 Hz, Emergencia F1->G1 + Gmaj7(#11) + Harpa Lidia #4 + Fade 0.000000)",
            true, true,
            ForgeTrackConfig{GenreZone::G0_AbyssalAmbient, GenreZone::G0_AbyssalAmbient, 12, -1, false, false, false, 0xB10F0117001ULL}
        },
        PilotSpec{
            "piloto_t2_elegia_permadeath_54bpm.wav",
            "T2 — Elegia de Permadeath: Afundamento Abissal (54 -> 0 BPM, F Frigio 43.65 Hz, Sino Bessel + Coracao Pulando 1 Batida + Basinski Loop 12kHz->180Hz)",
            true, false,
            ForgeTrackConfig{GenreZone::G0_AbyssalAmbient, GenreZone::G0_AbyssalAmbient, 12, -1, false, false, false, 0xB10F0117002ULL}
        }
    };
    return renderSpecsToDirectory(pilots, outDir, false);
}
