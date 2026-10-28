#pragma once

#include "biofoil_audio/dsp_core.hpp"
#include "biofoil_audio/procedural_brain.hpp"
#include "biofoil_audio/types.hpp"
#include <array>

namespace biofoil::audio {

struct GenreRecipe {
    GenreZone zone = GenreZone::G3_BioMysticGroove;
    double bpm = 125.0;
    double swingRatio = 0.575;
    ModalScale scale = ModalScale::Fs_Phrygian;
    double kickDecaySec = 0.142;
    double kickClickLevel = 0.25;
    double snarePocketMs = 0.0;
    double hatPocketMs = 0.0;
    double foleyPreShiftMs = -12.0;
    bool forbidDownbeatChords = false;
    bool enableGatedReverb = false;
    bool enableTechnoRumble = false;
};

[[nodiscard]] GenreRecipe getGenreRecipe(GenreZone zone) noexcept;

// Bumbo analógico multi-estágio (fase travada em 0.0 rad + oversampling 4x ADAA + trava de decay G3)
class AnalogKickVoice {
public:
    void reset() noexcept;
    void trigger(double rootFreqHz, const GenreRecipe& recipe, double velocity = 1.0) noexcept;
    [[nodiscard]] double renderSample(double sampleRate) noexcept;
    [[nodiscard]] bool isActive() const noexcept { return active_; }
    [[nodiscard]] double lastEffectiveDecaySec() const noexcept { return decaySec_; }

private:
    bool active_ = false;
    double envTimeSec_ = 0.0;
    double phaseRad_ = 0.0;
    double rootHz_ = 46.25;
    double decaySec_ = 0.145;
    double clickLevel_ = 0.25;
    double velocity_ = 1.0;
    bool industrialClick_ = false;
    TptSvf clickFilter_{};
    Oversampler4x oversampler_{};
    AdaaWaveshaper driveShaper_{};
};

// Subgrave sincopado (G1/G3) + Riff Industrial K35 (G2) + Acid 303 Diode Ladder (G4) + Stab HPF 175Hz anti-rumble (G5) + Sub Swell (G0)
class BassAndRiffVoice {
public:
    void reset() noexcept;
    void triggerNote(double targetFreqHz, double durationSec, double velocity, bool slide, const GenreRecipe& recipe, bool accent = false) noexcept;
    [[nodiscard]] double renderSample(double kickSidechainEnv, double sampleRate) noexcept;
    [[nodiscard]] bool isSubMutedByRumbleGuardrail() const noexcept { return rumbleSubGuardrailActive_; }

private:
    bool active_ = false;
    double noteTimeSec_ = 0.0;
    double noteDurSec_ = 0.20;
    double currentHz_ = 46.25;
    double targetHz_ = 46.25;
    double subPhase_ = 0.0;
    double fifthPhase_ = 0.0;
    double sawPhase1_ = 0.0;
    double sawPhase2_ = 0.25;
    double velocity_ = 0.85;
    bool slide_ = false;
    bool accent_ = false;
    bool rumbleSubGuardrailActive_ = false;
    GenreZone zone_ = GenreZone::G3_BioMysticGroove;

    Oversampler4x oversampler_{};
    ZdfLadderFilter ladderFilter_{};
    Diode303Filter diode303Filter_{};
    K35NonlinearFilter k35Filter_{};
    TptSvf rumbleGuardrailHpf_{};
};

// Voz Bio-Orgânica de 3 Formantes Paralelos (F1, F2, F3) sem fala humana (LEI_SFX_3 — G3 Bio-Mystic Groove)
class FormantBioLeadVoice {
public:
    void reset() noexcept;
    void triggerPhraseNote(double freqHz, double durationSec, double vowelMorph01, double velocity) noexcept;
    [[nodiscard]] StereoFrame renderSample(double sampleRate) noexcept;

private:
    bool active_ = false;
    double timeSec_ = 0.0;
    double durSec_ = 0.5;
    double currentHz_ = 196.0;
    double targetHz_ = 196.0;
    double phase_ = 0.0;
    double vibPhase_ = 0.0;
    double vowelMorph_ = 0.3;
    double velocity_ = 0.7;
    std::array<TptSvf, 3> formantsL_{};
    std::array<TptSvf, 3> formantsR_{};
};

// Techno Rumble contínuo para Z5 Hardgroove (137 BPM): Kick -> Pre-Delay 1/16 -> Difusor -> ADAA -> LPF 105 Hz -> Ducking
class TechnoRumbleProcessor {
public:
    explicit TechnoRumbleProcessor(uint32_t maxSampleRate = 48000);
    void reset() noexcept;
    [[nodiscard]] double process(double dryKickSample, double kickEnv, double bpm, double sampleRate) noexcept;

private:
    std::vector<double> preDelayBuf_;
    size_t writePos_ = 0;
    std::array<std::vector<double>, 4> allpassBufs_{};
    std::array<size_t, 4> apPos_{};
    AdaaWaveshaper rumbleDrive_{};
    ZdfLadderFilter lowpass105_{};
    TptSvf subCleanupHpf_{};
};

// Matriz metálica inarmônica de 6 osciladores (909/Techno Hats + Clangs) + Caixa Hidráulica Industrial + Suck -12ms
class PercussionMatrixVoice {
public:
    void reset() noexcept;
    void triggerHat(bool openHat, double velocity, bool metallicClang = false) noexcept;
    void triggerIndustrialSnare(double velocity) noexcept;
    void triggerPreShiftedSuck(double durationSec, double velocity) noexcept;

    [[nodiscard]] StereoFrame renderSample(double sampleRate, DeterministicRng& rng) noexcept;

private:
    std::array<double, 6> metalPhases_{{0.0, 0.11, 0.23, 0.37, 0.53, 0.71}};
    double hatTime_ = 10.0;
    double hatDecay_ = 0.045;
    double hatVel_ = 0.0;

    double clangTime_ = 10.0;
    double clangVel_ = 0.0;
    double clangPhaseA_ = 0.0;
    double clangPhaseB_ = 0.0;

    double snareTime_ = 10.0;
    double snareVel_ = 0.0;
    double snarePhase1_ = 0.0;
    double snarePhase2_ = 0.0;

    double suckTime_ = 10.0;
    double suckDur_ = 0.012;
    double suckVel_ = 0.0;

    TptSvf hatHpf_{}, hatBpf_{}, clangBpf_{};
    TptSvf snareNoiseBpf_{};
    TptSvf suckBpf_{};
    AdaaWaveshaper snareClipper_{};
};

// Banco Modal Estereofônico de 16 Ressonadores SVF (estilo Mutable Instruments Rings)
// Usado tanto para percussão orgânica de casco/carapaça molhada quanto para Sonar Transdiegético em tempo real!
class ModalRingsResonatorVoice {
public:
    static constexpr size_t kNumModes = 16;

    void reset() noexcept;
    void exciteOrganicShell(double fundamentalHz, double brightness01, double damping01, double velocity) noexcept;
    void triggerTransdiegeticSonar(double modalRootHz, double intensity01) noexcept;
    [[nodiscard]] StereoFrame renderSample(double sampleRate) noexcept;

private:
    std::array<TptSvf, kNumModes> modeFilters_{};
    std::array<double, kNumModes> modeFreqs_{};
    std::array<double, kNumModes> modeQs_{};
    std::array<double, kNumModes> modeGains_{};
    double exciterTime_ = 10.0;
    double exciterDur_ = 0.008;
    double exciterAmp_ = 0.0;
    bool isSonarPing_ = false;
    double sonarPhase_ = 0.0;
    double sonarFreq_ = 392.0;
};

// Acordes Dub Techno m9 (com voice-leading mínimo) + Pad Bioluminescente Contínuo + Leitmotif de 4 Notas
class HarmonicWorldVoice {
public:
    void reset() noexcept;
    void triggerDubChord(const std::array<int, 4>& midiVoicing, double durationSec, double velocity, double attackSec = 0.006) noexcept;
    void triggerLeitmotifNote(int midiNote, double durationSec, double velocity, GenreZone zone) noexcept;
    void setPadRootMidi(int rootMidi, ModalScale scale) noexcept;

    [[nodiscard]] StereoFrame renderChordAndPad(double kickSidechainEnv, double sampleRate) noexcept;
    [[nodiscard]] StereoFrame renderLeitmotif(double sampleRate) noexcept;

private:
    std::array<double, 4> chordFreqs_{{196.0, 233.08, 293.66, 349.23}};
    std::array<std::array<double, 3>, 4> chordPhases_{};
    double chordTime_ = 10.0;
    double chordDur_ = 0.32;
    double chordAttackSec_ = 0.006;
    double chordVel_ = 0.0;
    TptSvf chordFilterL_{}, chordFilterR_{};

    double padBaseHz_ = 98.0;
    double padFifthHz_ = 146.83;
    double padMinorThirdHz_ = 116.54;
    std::array<double, 6> padPhases_{{0.0, 0.17, 0.34, 0.51, 0.68, 0.85}};
    double padLfoPhase_ = 0.0;
    TptSvf padFilterL_{}, padFilterR_{};

    double motifHz_ = 293.66;
    double motifTargetHz_ = 293.66;
    double motifPhaseCar_ = 0.0;
    double motifPhaseMod_ = 0.0;
    double motifVibPhase_ = 0.0;
    double motifTime_ = 10.0;
    double motifDur_ = 0.45;
    double motifVel_ = 0.0;
    GenreZone motifZone_ = GenreZone::G3_BioMysticGroove;
    K35NonlinearFilter motifK35_{};
    TptSvf motifWarmLp_{};
};

// Motor em Tempo Real Lock-Free (C++20 / WASM AudioWorklet):
// Aplica Oclusão Hidrodinâmica ZDF (20k / 7.2k / 900 / 400 Hz + Spool-Up Exponencial + Split 6 Barramentos),
// Ducking Dinâmico Cirúrgico (950 Hz, -6.5 dB), Perfis Acústicos (Estúdio/Steam Deck/Noturno), Mono e Anti-Tinnitus!
class RealtimeWorkletBus {
public:
    void init(double sampleRate = 48000.0) noexcept;
    void pushTelemetry(const TelemetrySnapshot& snapshot) noexcept;
    void setSpoolProgress(double progress01) noexcept;
    void setAcousticPreferences(DynamicProfile profile, bool monoOut, bool antiTinnitus) noexcept;
    void triggerSonarPing(double intensity01 = 0.75) noexcept;

    [[nodiscard]] StereoFrame processSample(StereoFrame stemInput) noexcept;
    void processInterleavedBlock(const float* inInterleavedLR, float* outInterleavedLR, size_t numFrames) noexcept;

    [[nodiscard]] GenreZone activeZone() const noexcept { return director_.currentZone(); }
    [[nodiscard]] double currentHydroCutoffHz() const noexcept { return smoothedCutoffHz_; }
    [[nodiscard]] double currentBusCutoffHz(uint8_t busIndex) const noexcept;
    [[nodiscard]] double currentDuckingDb() const noexcept { return currentDuckDb_; }
    [[nodiscard]] DynamicProfile currentDynamicProfile() const noexcept { return dynamicProfile_; }
    [[nodiscard]] bool isMonoOut() const noexcept { return monoOut_; }
    [[nodiscard]] bool isAntiTinnitus() const noexcept { return antiTinnitus_; }

private:
    void updateTargetCutoffFromFoil() noexcept;

    double sampleRate_ = 48000.0;
    TelemetrySnapshot telemetry_{};
    MusicalDirector director_{};
    ModalRingsResonatorVoice liveSonar_{};

    double spoolProgress01_ = 1.0;
    DynamicProfile dynamicProfile_ = DynamicProfile::Estudio_Minus23Lufs;
    bool monoOut_ = false;
    bool antiTinnitus_ = false;

    double targetCutoffHz_ = 20000.0;
    double smoothedCutoffHz_ = 20000.0;
    double currentDuckDb_ = 0.0;
    double salvoHoldSec_ = 0.0;
    size_t samplesSinceBar_ = 0;

    TptSvf hydroFilterL_{}, hydroFilterR_{};
    TptSvf surgicalDuckL_{}, surgicalDuckR_{};
    TptSvf profileHpfL_{}, profileHpfR_{};
    TptSvf deckSubExtractL_{}, deckSubExtractR_{};
    AdaaWaveshaper deckHarmonicExciterL_{}, deckHarmonicExciterR_{};
    AdaaWaveshaper profileLimiterL_{}, profileLimiterR_{};
    TptSvf tinnitusNotch4kL_{}, tinnitusNotch4kR_{};
    TptSvf tinnitusShelf8kL_{}, tinnitusShelf8kR_{};
    LinkwitzRiley4Stereo monoSubCrossover_{};
};

// Renderizador Completo de Estúdio (192 kHz interno -> 48 kHz, Second-Pass Seamless Loop)
struct ForgeTrackConfig {
    GenreZone primaryZone = GenreZone::G3_BioMysticGroove;
    GenreZone escalationZone = GenreZone::G3_BioMysticGroove;
    int totalBars = 16;
    int escalationStartBar = -1;       // Se >= 0, faz transição procedural (ex: G2 -> G5)
    bool simulateHydroDiveBars9To12 = false;
    bool simulateWeaponDucking = false;
    bool includeTransdiegeticSonar = false;
    uint64_t seed = 0xB10F0112026ULL;
};

[[nodiscard]] Result<StereoBuffer> renderProceduralTrackOffline(
    const ForgeTrackConfig& config,
    uint32_t sampleRate = 48000
);

// Renderizador Linear de Arco Fechado (EVT_AUD_11: T1 Vitória Lídia 84 BPM vs T2 Elegia Permadeath 54->0 BPM, sem loop)
[[nodiscard]] Result<StereoBuffer> renderTerminalClosedArcOffline(
    bool isVictoryLydian,
    uint64_t seed = 0xB10F011E7DULL,
    uint32_t sampleRate = 48000
);

} // namespace biofoil::audio
