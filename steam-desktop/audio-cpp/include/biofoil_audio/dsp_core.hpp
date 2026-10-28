#pragma once

#include "biofoil_audio/types.hpp"
#include <array>
#include <cstdint>

namespace biofoil::audio {

// PRNG determinístico de 64 bits (SplitMix64) — zero uso de std::rand, 100% reproduzível em macOS e WASM
class DeterministicRng {
public:
    explicit constexpr DeterministicRng(uint64_t seed = 0xB10F011CAFEF00DULL) noexcept
        : state_(seed == 0 ? 0x9E3779B97F4A7C15ULL : seed) {}

    [[nodiscard]] uint64_t nextU64() noexcept;
    [[nodiscard]] double nextUniform01() noexcept;     // [0.0, 1.0)
    [[nodiscard]] double nextBipolar() noexcept;       // [-1.0, 1.0)
    [[nodiscard]] double nextGaussian() noexcept;      // N(0, 1) determinístico

private:
    uint64_t state_;
};

// Saturação analógica com Antiderivative Anti-Aliasing de 1ª ordem (ADAA)
class AdaaWaveshaper {
public:
    void reset() noexcept;
    [[nodiscard]] double processTanh(double x, double drive = 1.0) noexcept;
    [[nodiscard]] double processAsymTube(double x, double drive = 1.0, double asym = 0.22) noexcept;

    [[nodiscard]] static double antiderivativeTanh(double x) noexcept;

private:
    double xPrevTanh_ = 0.0;
    double fPrevTanh_ = 0.0;
    bool initializedTanh_ = false;
};

struct SvfOutputs {
    double lp = 0.0;
    double bp = 0.0;
    double hp = 0.0;
    double notch = 0.0;
};

// Filtro Zero-Delay Feedback (ZDF / TPT) de Vadim Zavalishin / Andrew Simper
class TptSvf {
public:
    void reset() noexcept;
    [[nodiscard]] SvfOutputs process(double input, double cutoffHz, double q, double sampleRate) noexcept;
    [[nodiscard]] double processBell(double input, double centerHz, double q, double gainDb, double sampleRate) noexcept;

private:
    double ic1eq_ = 0.0;
    double ic2eq_ = 0.0;
};

// Filtro Industrial K35 (estilo Korg MS-20): HPF ressonante + LPF ressonante com clipping ADAA na realimentação
class K35NonlinearFilter {
public:
    void reset() noexcept;
    [[nodiscard]] double process(double input, double hpfHz, double lpfHz, double resonance, double drive, double sampleRate) noexcept;

private:
    TptSvf hpfStage_{};
    TptSvf lpfStage_{};
    AdaaWaveshaper feedbackClipper_{};
    double lastFeedback_ = 0.0;
};

// Filtro Ladder 24 dB/oct Zero-Delay Feedback (para Subgrave Tech-House e 303 Acid)
class ZdfLadderFilter {
public:
    void reset() noexcept;
    [[nodiscard]] double process(double input, double cutoffHz, double resonance01, double drive, double sampleRate) noexcept;

private:
    std::array<double, 4> s_{{0.0, 0.0, 0.0, 0.0}};
    AdaaWaveshaper inputDrive_{};
};

// Crossover Linkwitz-Riley de 4ª ordem (24 dB/oct) coerente em fase — garante Subgrave 100% Mono abaixo de 140 Hz
class LinkwitzRiley4Stereo {
public:
    void reset() noexcept;
    [[nodiscard]] StereoFrame processMonoSubCrossover(StereoFrame in, double crossoverHz, double sampleRate) noexcept;

private:
    TptSvf lpL1_{}, lpL2_{}, hpL1_{}, hpL2_{};
    TptSvf lpR1_{}, lpR2_{}, hpR1_{}, hpR2_{};
};

// Oversampler 4x (48 kHz <-> 192 kHz) com filtro FIR simétrico Kaiser anti-imaging / anti-aliasing (>78 dB rejeição)
class Oversampler4x {
public:
    static constexpr size_t kFirTaps = 31;

    Oversampler4x() noexcept;
    void reset() noexcept;

    [[nodiscard]] std::array<double, 4> upsample(double x) noexcept;
    [[nodiscard]] double downsample(const std::array<double, 4>& overSamples) noexcept;

private:
    std::array<double, kFirTaps> coeffs_{};
    std::array<double, kFirTaps> upHist_{};
    std::array<double, kFirTaps> downHist_{};
    size_t upPos_ = 0;
    size_t downPos_ = 0;
};

// Alinhador de fase Kick x Subgrave por correlação cruzada discreta R_ks[tau]
[[nodiscard]] Result<int> findOptimalSubPhaseLagSamples(
    const std::vector<double>& kickMono,
    const std::vector<double>& subMono,
    int maxLagSamples = 32
);

[[nodiscard]] std::vector<double> applyCircularSampleShift(
    const std::vector<double>& buffer,
    int shiftSamples
);

// Dub Delay Ping-Pong com modelagem de fita (Wow/Flutter + Saturação ADAA + Filtro Bandpass no loop)
class ChowTapeDubDelay {
public:
    explicit ChowTapeDubDelay(uint32_t maxSampleRate = 48000);
    void reset() noexcept;
    [[nodiscard]] StereoFrame process(StereoFrame dryInput, double delaySeconds, double feedback, double wetMix, double sampleRate) noexcept;

private:
    std::vector<double> bufL_;
    std::vector<double> bufR_;
    size_t writePos_ = 0;
    double wowPhase_ = 0.0;
    double flutterPhase_ = 0.0;
    TptSvf fbHpL_{}, fbLpL_{}, fbHpR_{}, fbLpR_{};
    AdaaWaveshaper tapeL_{}, tapeR_{};
};

// Rede de Atraso Realimentada Ortogonal Hadamard 8x8 (FDN-8) para espaço abissal sem ressonância metálica
class HadamardFdn8Reverb {
public:
    explicit HadamardFdn8Reverb(uint32_t sampleRate = 48000);
    void reset() noexcept;
    [[nodiscard]] StereoFrame process(StereoFrame input, double decay, double dampCutoffHz, double wetMix, double gateGain, double sampleRate) noexcept;

private:
    std::array<std::vector<double>, 8> lines_{};
    std::array<size_t, 8> pos_{};
    std::array<TptSvf, 8> dampFilters_{};
    TptSvf preHpL_{}, preHpR_{};
    double modPhase_ = 0.0;
};

// Filtro Escada de Diodos TB-303 (18 dB/oct efetivo c/ acoplamento corte-ressonância + memória do capacitor C13 de Accent)
class Diode303Filter {
public:
    void reset() noexcept;
    void triggerNote(bool accent) noexcept;
    [[nodiscard]] double process(double input, double baseCutoffHz, double envMod, double resonance01, double drive, double sampleRate) noexcept;
    [[nodiscard]] double accentCharge() const noexcept { return c13Charge_; }

private:
    std::array<double, 4> s_{{0.0, 0.0, 0.0, 0.0}};
    double c13Charge_ = 0.0;
    bool currentAccent_ = false;
    AdaaWaveshaper diodeClipper_{};
};

// Deslocador Linear de Frequência de Bode/Hilbert (f'_k = k*f0 + shiftHz) para percussão metálica Blawan / Stef Mendesidis (G5)
class BodeFrequencyShifter {
public:
    void reset() noexcept;
    [[nodiscard]] StereoFrame process(StereoFrame input, double shiftHz, double wetMix, double sampleRate) noexcept;

private:
    struct Allpass1 {
        double x1 = 0.0;
        double y1 = 0.0;
        double process(double x, double coeff) noexcept {
            const double y = coeff * (x + y1) - x1;
            x1 = x;
            y1 = y;
            return y;
        }
        void reset() noexcept { x1 = 0.0; y1 = 0.0; }
    };
    std::array<Allpass1, 4> branchI_{};
    std::array<Allpass1, 4> branchQ_{};
    double oscPhase_ = 0.0;
};

// Gerador Contínuo de Hidrofone Abissal e Pressão Marítima (Porter Ricks Biokinetics / Basic Channel HydroNoise)
class HydroNoiseGenerator {
public:
    void reset() noexcept;
    [[nodiscard]] StereoFrame renderSample(double brightnessHz, double level, double sampleRate, DeterministicRng& rng) noexcept;

private:
    double b0_ = 0.0, b1_ = 0.0, b2_ = 0.0;
    double lfoPhase_ = 0.0;
    TptSvf lpL_{}, lpR_{}, hpL_{}, hpR_{};
};

[[nodiscard]] double midiNoteToHz(double midiNote) noexcept;

} // namespace biofoil::audio
