#pragma once

#include <array>
#include <cstddef>
#include <cstdint>
#include <vector>

namespace biofoil::audio {

enum class ErrorCode : uint8_t {
    Ok = 0,
    InvalidParameter = 1,
    EmptyBuffer = 2,
    InvalidSampleRate = 3,
    InvalidScaleMask = 4,
    IoWriteFailure = 5,
    ConvergenceFailure = 6
};

template <typename T>
struct Result {
    T value{};
    ErrorCode error = ErrorCode::Ok;

    [[nodiscard]] constexpr bool ok() const noexcept {
        return error == ErrorCode::Ok;
    }

    static constexpr Result<T> success(T val) noexcept {
        return Result<T>{val, ErrorCode::Ok};
    }

    static constexpr Result<T> failure(ErrorCode err) noexcept {
        return Result<T>{T{}, err};
    }
};

enum class GenreZone : uint8_t {
    G0_AbyssalAmbient = 0,   // 90 BPM  — Hangar, Eventos Místicos, Vitória
    G1_DubHydroChart = 1,    // 110 BPM — Carta Hidrográfica, Oficina, Recife-Forja
    G2_SlowIndustrial = 2,   // 110 BPM — Barcos Corporativos S1-S4 (Gesaffelstein)
    G3_BioMysticGroove = 3,  // 125 BPM — Bionaves / Monstros / Voo no Foil (Maceo / Jaar)
    G4_AcidDriving = 4,      // 128 BPM — Usina Termoquímica S6 / Sargaços S7 / Draga F1-F2
    G5_HardgrooveCrisis = 5  // 137 BPM — Quase-Morte (<25% Casco / Cavitação) / Draga F3
};

enum class StemBus : uint8_t {
    V1_Foundation = 0,  // Kick + Sub (30-140 Hz 100% Mono LR4, fase alinhada)
    V2_Traction = 1,    // Hats metálicos 6-osc, Ghost Shakers, Clangs
    V3_WorldColor = 2,  // Dub Chords m9, Pads Granulares, K35 / 303 Riffs
    V4_Leitmotif = 3,   // Motivo metamórfico de 4 notas do BIO-FOIL
    V5_Transition = 4   // Risers hidráulicos, Suck -12ms, Sub-Drops
};

enum class ModalScale : uint8_t {
    G_Dorian = 0,     // Setores 1..3: G  A  Bb C  D  E  F  (root MIDI 31 = 49.00 Hz)
    Fs_Phrygian = 1,  // Setores 4..6: F# G  A  B  C# D  E  (root MIDI 30 = 46.25 Hz)
    F_Locrian = 2,    // Setores 7..8: F  Gb Ab Bb Cb Db Eb (root MIDI 29 = 43.65 Hz)
    G_Lydian = 3,     // T1 Vitória:   G  A  B  C# D  E  F# (root MIDI 31 = 49.00 Hz)
    F_Phrygian = 4    // T2 Elegia:    F  Gb Ab Bb C  Db Eb (root MIDI 29 = 43.65 Hz)
};

enum class FoilState : uint8_t {
    NoFoil_20kHz = 1,          // 1_NO_FOIL: Voo limpo no hidrofólio (LPF 20.000 Hz)
    Touchdown_7200Hz = 2,      // 4_FURTIVO_AR: Casco rasante / furtivo aéreo (LPF 7.200 Hz)
    TacticalDive_400Hz = 3,    // 2_TOUCHDOWN / 5_FURTIVO_AGUA: Submerso (LPF ZDF 400 Hz)
    SpoolUp_Sweep = 4,         // 3_SPOOL_UP: Varredura exponencial 400 -> 20.000 Hz
    TacticalPause_900Hz = 5    // PAUSA_TATICA: Oclusão tática 900 Hz
};

enum class DynamicProfile : uint8_t {
    Estudio_Minus23Lufs = 0,   // Referência de estúdio (-23 LUFS, HPF 20 Hz)
    SteamDeck_Minus18Lufs = 1, // Portátil (-18 LUFS, excitador psicoacústico 2x/3x no subgrave)
    Noturno_Minus24Lufs = 2    // Noturno (-24 LUFS, HPF 65 Hz anti-parede + teto macio)
};

struct TelemetrySnapshot {
    float hullIntegrityPct = 1.0f;     // [0.0, 1.0]
    float floodedWaterKg = 0.0f;       // >= 0.0 kg
    float cavitationMarginKg = 100.0f; // Peso restante até cavitação (< 62.5 kg alerta)
    FoilState foilState = FoilState::NoFoil_20kHz;
    uint8_t enemyArchetype = 0;        // 0 = Mapa/Nenhum, 1 = Barco Corp, 2 = Monstro Bio, 3 = Draga
    uint8_t bossPhase = 0;             // 0, 1, 2, 3
    bool oceanBoilWarning = false;     // Alerta de fervura oceânica (janela de 4s)
    bool weaponSalvoTriggered = false; // Disparo de salva (ativa ducking dinâmico 250-2500 Hz)
};

struct StereoFrame {
    double left = 0.0;
    double right = 0.0;
};

struct StereoBuffer {
    uint32_t sampleRate = 48000;
    std::vector<double> left;
    std::vector<double> right;

    [[nodiscard]] size_t numFrames() const noexcept {
        return left.size();
    }

    void resize(size_t frames, uint32_t sr = 48000) {
        sampleRate = sr;
        left.assign(frames, 0.0);
        right.assign(frames, 0.0);
    }
};

struct AudioMetrics {
    double integratedLufs = -70.0;
    double truePeakDbtp = -120.0;
    double subMonoCorrelation = 1.0;
    double crestFactorDb = 0.0;
    double loopSeamDelta = 0.0;
};

} // namespace biofoil::audio
