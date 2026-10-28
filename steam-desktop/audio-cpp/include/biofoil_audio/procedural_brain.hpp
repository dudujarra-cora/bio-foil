#pragma once

#include "biofoil_audio/dsp_core.hpp"
#include "biofoil_audio/types.hpp"
#include <array>
#include <cstdint>

namespace biofoil::audio {

enum class PhraseVariant : uint8_t {
    A1_Pocket = 0,
    A2_PocketGhost = 1,
    B1_SyncopatedCall = 2,
    C1_FilterTension = 3,
    D1_TacticalReloadFill = 4
};

// 3.1 Ritmos Euclidianos de Bjorklund E(k, n, rot) com canal explícito de erro
[[nodiscard]] Result<uint16_t> computeBjorklundMask(int pulses, int steps, int rotation = 0) noexcept;

// Contraponto Kick x Subgrave: proíbe ataques do subgrave nas cabeças ocupadas pelo Kick
[[nodiscard]] constexpr uint16_t applyKickAntiMasking(uint16_t subMask, uint16_t kickMask) noexcept {
    return static_cast<uint16_t>(subMask & static_cast<uint16_t>(~kickMask));
}

// Trava G1 Dub Techno: proíbe acordes dub nas cabeças {0, 4, 8, 12} (0x1111)
[[nodiscard]] constexpr uint16_t enforceDubOffbeatGuardrail(uint16_t chordMask) noexcept {
    const uint16_t cleaned = static_cast<uint16_t>(chordMask & static_cast<uint16_t>(~0x1111U));
    return (cleaned != 0U) ? cleaned : static_cast<uint16_t>(1U << 3U);
}

// 3.2 Registrador de Deslocamento Trancado (Turing Machine / Marbles)
struct ShiftStep {
    int8_t scaleDegreeOffset = 0; // Deslocamento modal (0 = tônica, 1 = 2ª modal, etc.)
    double velocity = 0.8;        // [0.0, 1.0]
};

class LockedShiftRegister {
public:
    explicit LockedShiftRegister(uint64_t seed = 0x51F7B10F011ULL) noexcept;

    void advanceBar(int barIndex, DeterministicRng& rng) noexcept;
    [[nodiscard]] const std::array<ShiftStep, 16>& steps() const noexcept { return steps_; }

private:
    std::array<ShiftStep, 16> steps_{};
};

// 3.3 Cadeia de Markov de 2ª Ordem Consciente da Frase de 8 Compassos (ciclo tático das armas)
class BarAwareMarkov2 {
public:
    [[nodiscard]] static PhraseVariant nextVariant(
        PhraseVariant prev2,
        PhraseVariant prev1,
        int barInEightBarPhrase,
        DeterministicRng& rng
    ) noexcept;
};

// 3.4 Quantização Modal por Bitmask de 12 bits + Voice-Leading de Custo Mínimo
[[nodiscard]] uint16_t modalScaleBitmask(ModalScale scale) noexcept;
[[nodiscard]] int modalRootMidiSub(ModalScale scale) noexcept; // G1=31 (49Hz), F#1=30 (46.25Hz), F1=29 (43.65Hz)
[[nodiscard]] Result<int> quantizeMidiToScale(int midiNote, ModalScale scale) noexcept;

[[nodiscard]] std::array<int, 4> solveMinimalVoiceLeading(
    const std::array<int, 4>& previousVoicingMidi,
    const std::array<int, 4>& targetPitchClasses
) noexcept;

// 3.5 Equação de Micro-Timing: Swing Não-Linear + Pocket Offset + Human Jitter (Kick travado em 0)
[[nodiscard]] Result<int64_t> computeStepSampleOffset(
    int barIndex,
    int stepInBar16,
    double bpm,
    double swingRatio,
    double pocketOffsetMs,
    double jitterStdMs,
    bool isKick,
    double sampleRate,
    DeterministicRng& rng
) noexcept;

// 3.6 AI Director Musical: Envelope Assimétrico (1.2s atk / 9.0s rel) + Schmitt Trigger (±0.08) + Trava 8 barras
class MusicalDirector {
public:
    void reset(GenreZone initialZone = GenreZone::G1_DubHydroChart) noexcept;

    [[nodiscard]] static double computeInstantTension(const TelemetrySnapshot& telemetry) noexcept;

    GenreZone updateOnBarBoundary(
        const TelemetrySnapshot& telemetry,
        double barDurationSeconds
    ) noexcept;

    [[nodiscard]] GenreZone currentZone() const noexcept { return activeZone_; }
    [[nodiscard]] double smoothedTension() const noexcept { return smoothedTension_; }
    [[nodiscard]] int barsInCurrentZone() const noexcept { return barsHeld_; }

private:
    GenreZone activeZone_ = GenreZone::G1_DubHydroChart;
    double smoothedTension_ = 0.15;
    int barsHeld_ = 0;
};

} // namespace biofoil::audio
