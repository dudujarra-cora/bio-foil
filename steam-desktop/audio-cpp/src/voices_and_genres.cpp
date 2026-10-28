#include "biofoil_audio/voices_and_genres.hpp"
#include <algorithm>
#include <cmath>
#include <numbers>

namespace biofoil::audio {

namespace {
constexpr double kPi = std::numbers::pi;
constexpr double kTwoPi = 2.0 * std::numbers::pi;

double polyBlep(double t, double dt) noexcept {
    if (t < dt) {
        const double x = t / dt;
        return x + x - x * x - 1.0;
    }
    if (t > 1.0 - dt) {
        const double x = (t - 1.0) / dt;
        return x * x + x + x + 1.0;
    }
    return 0.0;
}

int scaleDegreeToSemitones(ModalScale scale, int degree) noexcept {
    constexpr std::array<int, 7> kDorian{{0, 2, 3, 5, 7, 9, 10}};
    constexpr std::array<int, 7> kPhrygian{{0, 1, 3, 5, 7, 8, 10}};
    constexpr std::array<int, 7> kLocrian{{0, 1, 3, 5, 6, 8, 10}};
    constexpr std::array<int, 7> kLydian{{0, 2, 4, 6, 7, 9, 11}};
    const int oct = (degree >= 0) ? (degree / 7) : ((degree - 6) / 7);
    const int idx = ((degree % 7) + 7) % 7;
    switch (scale) {
        case ModalScale::G_Dorian:    return oct * 12 + kDorian[static_cast<size_t>(idx)];
        case ModalScale::Fs_Phrygian:
        case ModalScale::F_Phrygian:  return oct * 12 + kPhrygian[static_cast<size_t>(idx)];
        case ModalScale::F_Locrian:   return oct * 12 + kLocrian[static_cast<size_t>(idx)];
        case ModalScale::G_Lydian:    return oct * 12 + kLydian[static_cast<size_t>(idx)];
    }
    return 0;
}
} // namespace

GenreRecipe getGenreRecipe(GenreZone zone) noexcept {
    switch (zone) {
        case GenreZone::G0_AbyssalAmbient:
            return GenreRecipe{zone, 90.0, 0.550, ModalScale::G_Dorian, 0.280, 0.08, 0.0, 0.0, -12.0, true, false, false};
        case GenreZone::G1_DubHydroChart:
            return GenreRecipe{zone, 110.0, 0.560, ModalScale::G_Dorian, 0.245, 0.16, 0.0, 0.0, -12.0, true, false, false};
        case GenreZone::G2_SlowIndustrial:
            return GenreRecipe{zone, 110.0, 0.570, ModalScale::Fs_Phrygian, 0.185, 0.42, 7.0, 0.0, -12.0, false, true, false};
        case GenreZone::G3_BioMysticGroove:
            // Volume 10 Tabela 10.1.A: G_DORICO (49.00 Hz) + Kick Decay <= 0.30 * T_beat (0.142s cravado!)
            return GenreRecipe{zone, 125.0, 0.575, ModalScale::G_Dorian, 0.142, 0.26, 0.0, 0.0, -12.0, false, false, false};
        case GenreZone::G4_AcidDriving:
            return GenreRecipe{zone, 128.0, 0.555, ModalScale::Fs_Phrygian, 0.168, 0.32, 0.0, -1.0, -12.0, false, false, false};
        case GenreZone::G5_HardgrooveCrisis:
            return GenreRecipe{zone, 137.0, 0.560, ModalScale::F_Locrian, 0.152, 0.46, 0.0, -2.0, -12.0, false, true, true};
    }
    return GenreRecipe{};
}

void AnalogKickVoice::reset() noexcept {
    active_ = false;
    envTimeSec_ = 0.0;
    phaseRad_ = 0.0;
    clickFilter_.reset();
    oversampler_.reset();
    driveShaper_.reset();
}

void AnalogKickVoice::trigger(double rootFreqHz, const GenreRecipe& recipe, double velocity) noexcept {
    active_ = true;
    envTimeSec_ = 0.0;
    phaseRad_ = 0.0; // Phase Reset estrito em 0.0 rad!
    rootHz_ = std::clamp(rootFreqHz, 36.0, 65.0);

    const double beatSec = 60.0 / std::max(60.0, recipe.bpm);
    // Trava C++ de G3 Bio-Mystic: Kick nunca ultrapassa 30% do tempo da batida para abrir pocket ao subgrave sincopado
    if (recipe.zone == GenreZone::G3_BioMysticGroove) {
        decaySec_ = std::min(recipe.kickDecaySec, 0.30 * beatSec);
    } else {
        decaySec_ = recipe.kickDecaySec;
    }
    clickLevel_ = recipe.kickClickLevel;
    velocity_ = std::clamp(velocity, 0.1, 1.2);
    industrialClick_ = (recipe.zone == GenreZone::G2_SlowIndustrial || recipe.zone == GenreZone::G5_HardgrooveCrisis);
}

double AnalogKickVoice::renderSample(double sampleRate) noexcept {
    if (!active_) {
        return 0.0;
    }
    if (envTimeSec_ > decaySec_ * 2.1) {
        active_ = false;
        return 0.0;
    }

    // Envelope de altura de 3 estágios (ataque 909/Jomox -> peito -> fundamental modal exata)
    double instHz = rootHz_;
    if (envTimeSec_ < 0.0038) {
        const double k = envTimeSec_ / 0.0038;
        instHz = 395.0 + (142.0 - 395.0) * k;
    } else if (envTimeSec_ < 0.032) {
        const double k = (envTimeSec_ - 0.0038) / (0.032 - 0.0038);
        instHz = rootHz_ + (142.0 - rootHz_) * std::exp(-4.8 * k);
    }

    // Envelope de amplitude com platô inicial curto (14ms) + queda exponencial limpa
    double ampEnv = 1.0;
    if (envTimeSec_ > 0.012) {
        const double rel = (envTimeSec_ - 0.012) / std::max(0.030, decaySec_);
        ampEnv = std::exp(-3.4 * rel);
    }

    const double body = std::sin(phaseRad_) + 0.16 * std::sin(2.0 * phaseRad_) * std::exp(-envTimeSec_ * 45.0);
    phaseRad_ += kTwoPi * instHz / sampleRate;
    if (phaseRad_ > kTwoPi) {
        phaseRad_ -= kTwoPi;
    }

    // Clique transiente de madeira/couro (G1/G3) ou pistão metálico (G2/G5)
    double click = 0.0;
    if (envTimeSec_ < 0.0055) {
        const double cEnv = std::exp(-envTimeSec_ * 720.0);
        const double rawClick = std::sin(envTimeSec_ * (industrialClick_ ? 19500.0 : 11200.0));
        const double clickFreq = industrialClick_ ? 3100.0 : 1850.0;
        click = clickFilter_.process(rawClick * cEnv, clickFreq, 1.4, sampleRate).bp * clickLevel_;
    }

    const double rawSample = (body * ampEnv + click) * velocity_;

    // Saturação analógica em 4x Oversampling (192 kHz) com ADAA
    auto up = oversampler_.upsample(rawSample);
    const double drive = industrialClick_ ? 1.65 : 1.28;
    for (double& s : up) {
        s = driveShaper_.processAsymTube(s, drive, 0.14);
    }
    envTimeSec_ += 1.0 / sampleRate;
    return oversampler_.downsample(up);
}

void BassAndRiffVoice::reset() noexcept {
    active_ = false;
    noteTimeSec_ = 0.0;
    subPhase_ = 0.0;
    fifthPhase_ = 0.0;
    sawPhase1_ = 0.0;
    sawPhase2_ = 0.25;
    accent_ = false;
    rumbleSubGuardrailActive_ = false;
    oversampler_.reset();
    ladderFilter_.reset();
    diode303Filter_.reset();
    k35Filter_.reset();
    rumbleGuardrailHpf_.reset();
}

void BassAndRiffVoice::triggerNote(double targetFreqHz, double durationSec, double velocity, bool slide, const GenreRecipe& recipe, bool accent) noexcept {
    active_ = true;
    noteTimeSec_ = 0.0;
    noteDurSec_ = std::max(0.05, durationSec);
    targetHz_ = std::clamp(targetFreqHz, 32.0, 440.0);
    if (!slide && recipe.zone != GenreZone::G0_AbyssalAmbient) {
        currentHz_ = targetHz_;
        subPhase_ = 0.0; // Phase reset 0.0 rad nos ataques secos!
    } else if (currentHz_ < 20.0) {
        currentHz_ = targetHz_;
    }
    velocity_ = std::clamp(velocity, 0.1, 1.0);
    slide_ = slide;
    accent_ = accent;
    zone_ = recipe.zone;
    if (zone_ == GenreZone::G4_AcidDriving) {
        diode303Filter_.triggerNote(accent);
    }
    // Trava C++ de G5 Hardgroove: quando Techno Rumble está ativo, silencia/filtra subgrave melódico abaixo de 175 Hz!
    rumbleSubGuardrailActive_ = recipe.enableTechnoRumble;
}

double BassAndRiffVoice::renderSample(double kickSidechainEnv, double sampleRate) noexcept {
    if (!active_ || noteTimeSec_ > noteDurSec_ + 0.18) {
        active_ = false;
        return 0.0;
    }

    // G0 Ambient Dub: Drone respiratório de subgrave + 5ª justa com ataque lento (>= 360 ms, zero clique percussivo!)
    if (zone_ == GenreZone::G0_AbyssalAmbient) {
        const double alpha = 1.0 - std::exp(-1.0 / (0.140 * sampleRate));
        currentHz_ += alpha * (targetHz_ - currentHz_);
        const double atk = std::min(1.0, noteTimeSec_ / 0.360);
        const double rel = (noteTimeSec_ < noteDurSec_)
            ? 1.0
            : std::exp(-8.5 * (noteTimeSec_ - noteDurSec_));
        const double breath = 0.86 + 0.14 * std::sin(kTwoPi * 0.12 * noteTimeSec_);
        subPhase_ += currentHz_ / sampleRate;
        if (subPhase_ >= 1.0) subPhase_ -= 1.0;
        fifthPhase_ += (currentHz_ * 1.4983) / sampleRate;
        if (fifthPhase_ >= 1.0) fifthPhase_ -= 1.0;
        const double drone = (0.76 * std::sin(kTwoPi * subPhase_) + 0.24 * std::sin(kTwoPi * fifthPhase_)) * atk * rel * breath * velocity_ * 0.72;
        noteTimeSec_ += 1.0 / sampleRate;
        return drone;
    }

    // Portamento: 60.0 ms RC constante da TB-303 em G4 Acid, 42 ms em G2 Industrial, 24 ms em G3
    const double glideTau = (zone_ == GenreZone::G4_AcidDriving)
        ? 0.060
        : ((zone_ == GenreZone::G2_SlowIndustrial) ? 0.042 : 0.024);
    if (slide_ || zone_ == GenreZone::G2_SlowIndustrial) {
        const double alpha = 1.0 - std::exp(-1.0 / (glideTau * sampleRate));
        currentHz_ += alpha * (targetHz_ - currentHz_);
    } else {
        currentHz_ = targetHz_;
    }

    // Envelope VCA com ataque de 2.8 ms livre de clique e queda elástica (encurtada no Accent da 303!)
    const double atk = std::min(1.0, noteTimeSec_ / 0.0028);
    const double decayRate = (zone_ == GenreZone::G4_AcidDriving && accent_) ? 2.4 : 1.8;
    const double rel = (noteTimeSec_ < noteDurSec_)
        ? std::exp(-decayRate * (noteTimeSec_ / noteDurSec_))
        : std::exp(-48.0 * (noteTimeSec_ - noteDurSec_));
    const double ampEnv = atk * rel * velocity_ * ((zone_ == GenreZone::G4_AcidDriving && accent_) ? 1.18 : 1.0);

    // Oscilador fundamental puro em fase + Dente-de-serra PolyBLEP para harmônicos superiores
    const double dt1 = currentHz_ / sampleRate;
    const double subSine = std::sin(kTwoPi * subPhase_);
    subPhase_ += dt1;
    if (subPhase_ >= 1.0) subPhase_ -= 1.0;

    const double upperHz = (zone_ == GenreZone::G2_SlowIndustrial || rumbleSubGuardrailActive_) ? (currentHz_ * 2.0) : currentHz_;
    const double dtSaw = upperHz / sampleRate;
    double saw1 = 2.0 * sawPhase1_ - 1.0 - polyBlep(sawPhase1_, dtSaw);
    double saw2 = 2.0 * sawPhase2_ - 1.0 - polyBlep(sawPhase2_, dtSaw * 1.004);
    sawPhase1_ += dtSaw;
    if (sawPhase1_ >= 1.0) sawPhase1_ -= 1.0;
    sawPhase2_ += dtSaw * 1.004;
    if (sawPhase2_ >= 1.0) sawPhase2_ -= 1.0;

    const double envDecay = (zone_ == GenreZone::G4_AcidDriving)
        ? (accent_ ? 19.5 : 12.0)
        : 11.5;
    const double filterEnv = std::exp(-noteTimeSec_ * envDecay);

    // Processamento não-linear do filtro em 4x Oversampling (192 kHz)
    auto upSaw = oversampler_.upsample(0.55 * (saw1 + saw2));
    const double overSr = sampleRate * 4.0;
    for (double& s : upSaw) {
        if (zone_ == GenreZone::G2_SlowIndustrial) {
            // Gesaffelstein MS-20 K35: médio-grave rasgado e ameaçador
            const double lpfCutoff = 340.0 + 1550.0 * filterEnv * velocity_;
            s = k35Filter_.process(s, 92.0, lpfCutoff, 0.66, 2.05, overSr);
        } else if (zone_ == GenreZone::G4_AcidDriving) {
            // Plastikman Consumed TB-303 Diode Ladder (18 dB/oct + acumulador C13 de Accent submerso)
            const double envMod = (accent_ ? 1450.0 : 560.0) * filterEnv * velocity_;
            s = diode303Filter_.process(s, 185.0, envMod, 0.78, accent_ ? 2.15 : 1.55, overSr);
        } else {
            // G1 / G3 Bio-Mystic: envelope ZDF emborrachado e articulado de Tech-House subterrâneo (Maceo Plex / Jaar)
            const double grooveCutoff = 115.0 + 480.0 * filterEnv * velocity_;
            s = ladderFilter_.process(s, grooveCutoff, 0.42, 1.50, overSr);
        }
    }
    double shapedHarmonics = oversampler_.downsample(upSaw);

    double combined = 0.0;
    if (rumbleSubGuardrailActive_) {
        // Em G5 Hardgroove, o subgrave (<175 Hz) pertence exclusivamente ao Techno Rumble!
        combined = rumbleGuardrailHpf_.process(shapedHarmonics, 185.0, 0.90, sampleRate).hp * 0.48;
    } else if (zone_ == GenreZone::G2_SlowIndustrial) {
        combined = 0.58 * subSine + 0.62 * shapedHarmonics;
    } else if (zone_ == GenreZone::G4_AcidDriving) {
        combined = 0.46 * subSine + 0.76 * shapedHarmonics;
    } else {
        combined = 0.78 * subSine + 0.56 * shapedHarmonics;
    }

    // Sidechain ducking rápido contra o ataque do Kick
    const double duckGain = std::clamp(1.0 - 0.82 * kickSidechainEnv, 0.12, 1.0);
    noteTimeSec_ += 1.0 / sampleRate;
    return combined * ampEnv * duckGain;
}

void FormantBioLeadVoice::reset() noexcept {
    active_ = false;
    timeSec_ = 0.0;
    phase_ = 0.0;
    vibPhase_ = 0.0;
    for (auto& f : formantsL_) f.reset();
    for (auto& f : formantsR_) f.reset();
}

void FormantBioLeadVoice::triggerPhraseNote(double freqHz, double durationSec, double vowelMorph01, double velocity) noexcept {
    targetHz_ = std::clamp(freqHz, 80.0, 1200.0);
    if (!active_) {
        currentHz_ = targetHz_;
    }
    active_ = true;
    timeSec_ = 0.0;
    durSec_ = std::max(0.10, durationSec);
    vowelMorph_ = std::clamp(vowelMorph01, 0.0, 1.0);
    velocity_ = std::clamp(velocity, 0.05, 1.0);
}

StereoFrame FormantBioLeadVoice::renderSample(double sampleRate) noexcept {
    if (!active_ || timeSec_ > durSec_ + 0.30) {
        active_ = false;
        return StereoFrame{0.0, 0.0};
    }

    const double glideAlpha = 1.0 - std::exp(-1.0 / (0.055 * sampleRate));
    currentHz_ += glideAlpha * (targetHz_ - currentHz_);

    vibPhase_ += kTwoPi * 4.9 / sampleRate;
    if (vibPhase_ > kTwoPi) vibPhase_ -= kTwoPi;
    const double vib = 1.0 + 0.0055 * std::sin(vibPhase_) * std::min(1.0, timeSec_ / 0.18);

    const double dt = (currentHz_ * vib) / sampleRate;
    // Fonte glotal assimétrica rica em harmônicos suaves (dente-de-serra + pulso arredondado)
    const double saw = 2.0 * phase_ - 1.0 - polyBlep(phase_, dt);
    const double pulse = (phase_ < 0.36 ? 1.0 : -1.0) + polyBlep(phase_, dt) - polyBlep(std::fmod(phase_ + 0.64, 1.0), dt);
    phase_ += dt;
    if (phase_ >= 1.0) phase_ -= 1.0;
    const double glottal = 0.58 * saw + 0.42 * pulse;

    const double atk = std::min(1.0, timeSec_ / 0.045);
    const double rel = (timeSec_ < durSec_)
        ? std::exp(-0.85 * (timeSec_ / durSec_))
        : std::exp(-11.0 * (timeSec_ - durSec_));
    const double env = atk * rel * velocity_;

    // Morfagem contínua entre 3 formantes biológicos marinhos ([u] profundo -> [o] cavernoso -> [a]/[e] bioluminescente)
    const double m = std::clamp(vowelMorph_ + 0.22 * std::sin(kTwoPi * 0.65 * timeSec_), 0.0, 1.0);
    const std::array<double, 3> fHz{{
        290.0 + 390.0 * m,
        780.0 + 1080.0 * m,
        2150.0 + 680.0 * m
    }};
    constexpr std::array<double, 3> fQs{{4.8, 5.6, 6.2}};
    constexpr std::array<double, 3> fGains{{0.62, 0.40, 0.18}};

    double outL = 0.0;
    double outR = 0.0;
    for (size_t i = 0; i < 3; ++i) {
        outL += formantsL_[i].process(glottal, fHz[i] * 0.992, fQs[i], sampleRate).bp * fGains[i];
        outR += formantsR_[i].process(glottal, fHz[i] * 1.008, fQs[i], sampleRate).bp * fGains[i];
    }

    timeSec_ += 1.0 / sampleRate;
    return StereoFrame{outL * env * 0.24, outR * env * 0.24};
}

TechnoRumbleProcessor::TechnoRumbleProcessor(uint32_t maxSampleRate) {
    preDelayBuf_.assign(static_cast<size_t>(maxSampleRate / 2U), 0.0);
    constexpr std::array<size_t, 4> kApLens{{347, 521, 769, 1031}};
    for (size_t i = 0; i < 4; ++i) {
        allpassBufs_[i].assign(kApLens[i], 0.0);
        apPos_[i] = 0;
    }
}

void TechnoRumbleProcessor::reset() noexcept {
    std::fill(preDelayBuf_.begin(), preDelayBuf_.end(), 0.0);
    writePos_ = 0;
    for (size_t i = 0; i < 4; ++i) {
        std::fill(allpassBufs_[i].begin(), allpassBufs_[i].end(), 0.0);
        apPos_[i] = 0;
    }
    rumbleDrive_.reset();
    lowpass105_.reset();
    subCleanupHpf_.reset();
}

double TechnoRumbleProcessor::process(double dryKickSample, double kickEnv, double bpm, double sampleRate) noexcept {
    const size_t cap = preDelayBuf_.size();
    const size_t delay16th = std::clamp<size_t>(
        static_cast<size_t>((60.0 / (std::max(80.0, bpm) * 4.0)) * sampleRate),
        64U,
        cap - 4U
    );

    preDelayBuf_[writePos_] = dryKickSample;
    const size_t readPos = (writePos_ + cap - delay16th) % cap;
    writePos_ = (writePos_ + 1) % cap;

    double sig = preDelayBuf_[readPos];
    // Difusão em cascata de 4 estágios allpass para transformar o ataque do kick em caverna subgrave contínua
    for (size_t i = 0; i < 4; ++i) {
        auto& buf = allpassBufs_[i];
        const size_t p = apPos_[i];
        const double delayed = buf[p];
        const double g = 0.62;
        const double inVal = sig + delayed * g;
        buf[p] = inVal;
        sig = delayed - inVal * g;
        apPos_[i] = (p + 1) % buf.size();
    }

    const double driven = rumbleDrive_.processAsymTube(sig * 2.8, 2.45, 0.22);
    const double subWall = lowpass105_.process(driven, 104.0, 0.28, 1.35, sampleRate);
    const double cleanSub = subCleanupHpf_.process(subWall, 34.0, 0.707, sampleRate).hp;

    // Bombeamento hipnótico no contratempo (sidechain do Kick seco)
    const double pump = std::clamp(1.0 - 0.92 * kickEnv, 0.06, 1.0);
    return cleanSub * pump * 1.12;
}

void PercussionMatrixVoice::reset() noexcept {
    hatTime_ = 10.0;
    clangTime_ = 10.0;
    snareTime_ = 10.0;
    suckTime_ = 10.0;
    hatHpf_.reset(); hatBpf_.reset(); clangBpf_.reset();
    snareNoiseBpf_.reset(); suckBpf_.reset(); snareClipper_.reset();
}

void PercussionMatrixVoice::triggerHat(bool openHat, double velocity, bool metallicClang) noexcept {
    if (metallicClang) {
        clangTime_ = 0.0;
        clangVel_ = std::clamp(velocity, 0.05, 1.0);
        clangPhaseA_ = 0.0;
        clangPhaseB_ = 0.0;
        return;
    }
    hatTime_ = 0.0;
    hatDecay_ = openHat ? 0.145 : 0.032;
    hatVel_ = std::clamp(velocity, 0.05, 1.0);
}

void PercussionMatrixVoice::triggerIndustrialSnare(double velocity) noexcept {
    snareTime_ = 0.0;
    snareVel_ = std::clamp(velocity, 0.05, 1.0);
    snarePhase1_ = 0.0;
    snarePhase2_ = 0.0;
}

void PercussionMatrixVoice::triggerPreShiftedSuck(double durationSec, double velocity) noexcept {
    suckTime_ = 0.0;
    suckDur_ = std::clamp(durationSec, 0.010, 2.500);
    suckVel_ = std::clamp(velocity, 0.05, 1.0);
}

StereoFrame PercussionMatrixVoice::renderSample(double sampleRate, DeterministicRng& rng) noexcept {
    double outL = 0.0;
    double outR = 0.0;

    // 1a. Matriz Metálica 6-Osciladores Inarmônicos (909 Closed/Open Hats independentes!)
    if (hatTime_ < hatDecay_ * 4.0) {
        constexpr std::array<double, 6> kMetalHz{{312.4, 463.8, 563.1, 796.3, 822.9, 1218.5}};
        double metalSum = 0.0;
        for (size_t i = 0; i < 6; ++i) {
            metalPhases_[i] += kMetalHz[i] / sampleRate;
            if (metalPhases_[i] >= 1.0) metalPhases_[i] -= 1.0;
            metalSum += (metalPhases_[i] < 0.5) ? 1.0 : -1.0;
        }
        const double airNoise = rng.nextBipolar();
        const double env = std::exp(-hatTime_ / hatDecay_) * hatVel_;
        const double crisp = hatHpf_.process(metalSum * 0.12 + airNoise * 0.68, 6800.0, 0.95, sampleRate).hp;
        const double body = hatBpf_.process(metalSum * 0.14, 8900.0, 1.8, sampleRate).bp;
        const double sig = (crisp + body) * env * 0.36;
        outL += sig * 0.92;
        outR += sig * 1.06;
        hatTime_ += 1.0 / sampleRate;
    }

    // 1b. Percussão Polimétrica Industrial Tom/Anvil Escuro de Hardgroove (Stef Mendesidis / Blawan: 340-880 Hz encaixado no groove!)
    if (clangTime_ < 0.16) {
        const double pDrop = 1.0 + 0.55 * std::exp(-clangTime_ * 95.0);
        clangPhaseA_ += (233.08 * pDrop) / sampleRate; // Sib3 / Lócrio escuro
        clangPhaseB_ += (358.40 * pDrop) / sampleRate; // Razão inarmônica de bigorna submarina (1 : 1.537)
        if (clangPhaseA_ >= 1.0) clangPhaseA_ -= 1.0;
        if (clangPhaseB_ >= 1.0) clangPhaseB_ -= 1.0;

        const double fmAnvil = std::sin(kTwoPi * clangPhaseA_ + 1.35 * std::sin(kTwoPi * clangPhaseB_) * std::exp(-clangTime_ * 42.0));
        const double env = std::exp(-clangTime_ * 28.0) * clangVel_;
        const double shaped = clangBpf_.process(fmAnvil, 620.0, 1.45, sampleRate).bp * env * 0.24;
        outL += shaped * 0.78;
        outR += shaped * 1.12;
        clangTime_ += 1.0 / sampleRate;
    }

    // 2. Caixa / Pistão Hidráulico Industrial (G2 / G5)
    if (snareTime_ < 0.28) {
        const double pitchDrop = 1.0 + 1.4 * std::exp(-snareTime_ * 140.0);
        snarePhase1_ += (184.0 * pitchDrop) / sampleRate;
        snarePhase2_ += (328.0 * pitchDrop) / sampleRate;
        if (snarePhase1_ >= 1.0) snarePhase1_ -= 1.0;
        if (snarePhase2_ >= 1.0) snarePhase2_ -= 1.0;

        const double bodyEnv = std::exp(-snareTime_ * 26.0);
        const double noiseEnv = std::exp(-snareTime_ * 17.5);
        const double body = (std::sin(kTwoPi * snarePhase1_) + 0.55 * std::sin(kTwoPi * snarePhase2_)) * bodyEnv;
        const double rattle = snareNoiseBpf_.process(rng.nextBipolar(), 2350.0, 1.15, sampleRate).bp * noiseEnv;
        const double hit = snareClipper_.processAsymTube((body * 0.65 + rattle * 0.95) * snareVel_, 1.75, 0.20) * 0.55;
        outL += hit;
        outR += hit * 0.98;
        snareTime_ += 1.0 / sampleRate;
    }

    // 3. Pre-Shifted Foley Suck (-12 ms a -45 ms crescendo exponencial que deságua na batida!)
    if (suckTime_ < suckDur_) {
        const double progress = suckTime_ / suckDur_; // 0.0 -> 1.0
        const double riseEnv = progress * progress * progress * suckVel_;
        const double sweepHz = 650.0 + 3200.0 * progress;
        const double droplet = suckBpf_.process(rng.nextBipolar(), sweepHz, 3.8, sampleRate).bp * riseEnv * 0.52;
        outL += droplet * 0.82;
        outR += droplet * 1.15;
        suckTime_ += 1.0 / sampleRate;
    }

    return StereoFrame{outL, outR};
}

void ModalRingsResonatorVoice::reset() noexcept {
    for (auto& f : modeFilters_) {
        f.reset();
    }
    exciterTime_ = 10.0;
    isSonarPing_ = false;
}

void ModalRingsResonatorVoice::exciteOrganicShell(double fundamentalHz, double brightness01, double damping01, double velocity) noexcept {
    isSonarPing_ = false;
    exciterTime_ = 0.0;
    exciterDur_ = 0.0055;
    exciterAmp_ = std::clamp(velocity, 0.05, 1.0);

    // Razões modais dispersivas de madeira molhada / carapaça quitinosa (inspirado em Mutable Rings)
    constexpr std::array<double, kNumModes> kShellRatios{{
        1.000, 1.502, 1.996, 2.642, 3.011, 3.765, 4.241, 4.988,
        5.612, 6.320, 7.105, 7.890, 8.650, 9.420, 10.31, 11.24
    }};
    const double baseQ = 14.0 + 34.0 * std::clamp(damping01, 0.0, 1.0);
    for (size_t m = 0; m < kNumModes; ++m) {
        modeFreqs_[m] = std::clamp(fundamentalHz * kShellRatios[m], 90.0, 14500.0);
        modeQs_[m] = baseQ * (1.0 - 0.032 * static_cast<double>(m));
        const double tilt = std::pow(static_cast<double>(m + 1), -1.15 + 0.55 * std::clamp(brightness01, 0.0, 1.0));
        modeGains_[m] = tilt * 0.24;
    }
}

void ModalRingsResonatorVoice::triggerTransdiegeticSonar(double modalRootHz, double intensity01) noexcept {
    isSonarPing_ = true;
    exciterTime_ = 0.0;
    exciterDur_ = 0.022;
    exciterAmp_ = std::clamp(intensity01, 0.05, 1.0);
    sonarPhase_ = 0.0;
    sonarFreq_ = std::clamp(modalRootHz * 8.0, 280.0, 1600.0); // Oitava cristalina do sonar submarino

    // Harmônicos puros de casco metálico + 5ª justa e oitava para ressoar afinado com a música
    constexpr std::array<double, kNumModes> kSonarRatios{{
        1.000, 1.498, 2.000, 2.997, 3.003, 4.000, 4.495, 5.002,
        6.000, 7.010, 8.000, 9.020, 10.00, 11.04, 12.00, 13.50
    }};
    for (size_t m = 0; m < kNumModes; ++m) {
        modeFreqs_[m] = std::clamp(sonarFreq_ * 0.5 * kSonarRatios[m], 160.0, 15000.0);
        modeQs_[m] = 23.0 - 0.8 * static_cast<double>(m);
        modeGains_[m] = std::pow(static_cast<double>(m + 1), -1.35) * 0.22;
    }
}

StereoFrame ModalRingsResonatorVoice::renderSample(double sampleRate) noexcept {
    double exciter = 0.0;
    if (exciterTime_ < exciterDur_) {
        const double win = std::sin(kPi * (exciterTime_ / exciterDur_));
        if (isSonarPing_) {
            sonarPhase_ += kTwoPi * sonarFreq_ / sampleRate;
            exciter = std::sin(sonarPhase_) * win * exciterAmp_ * 0.45;
        } else {
            // Impulso curto amortecido de marimba/gota
            exciter = std::sin(kTwoPi * 620.0 * exciterTime_) * std::exp(-exciterTime_ * 480.0) * win * exciterAmp_;
        }
        exciterTime_ += 1.0 / sampleRate;
    }

    double sumEvenL = 0.0;
    double sumOddR = 0.0;
    for (size_t m = 0; m < kNumModes; ++m) {
        const double modeOut = modeFilters_[m].process(exciter, modeFreqs_[m], modeQs_[m], sampleRate).bp * modeGains_[m];
        // Igual ao hardware Mutable Instruments Rings: modos pares na esquerda, ímpares na direita!
        if ((m & 1U) == 0U) {
            sumEvenL += modeOut;
        } else {
            sumOddR += modeOut;
        }
    }

    return StereoFrame{
        sumEvenL * 0.82 + sumOddR * 0.24,
        sumOddR * 0.82 + sumEvenL * 0.24
    };
}

void HarmonicWorldVoice::reset() noexcept {
    chordTime_ = 10.0;
    chordAttackSec_ = 0.006;
    motifTime_ = 10.0;
    chordFilterL_.reset(); chordFilterR_.reset();
    padFilterL_.reset(); padFilterR_.reset();
    motifK35_.reset(); motifWarmLp_.reset();
}

void HarmonicWorldVoice::triggerDubChord(const std::array<int, 4>& midiVoicing, double durationSec, double velocity, double attackSec) noexcept {
    for (size_t i = 0; i < 4; ++i) {
        chordFreqs_[i] = midiNoteToHz(static_cast<double>(midiVoicing[i]));
    }
    chordTime_ = 0.0;
    chordDur_ = std::max(0.08, durationSec);
    chordAttackSec_ = std::clamp(attackSec, 0.002, 2.500);
    chordVel_ = std::clamp(velocity, 0.05, 1.0);
}

void HarmonicWorldVoice::triggerLeitmotifNote(int midiNote, double durationSec, double velocity, GenreZone zone) noexcept {
    motifTargetHz_ = midiNoteToHz(static_cast<double>(midiNote));
    if (motifTime_ > motifDur_) {
        motifHz_ = motifTargetHz_;
    }
    motifTime_ = 0.0;
    motifDur_ = std::max(0.12, durationSec);
    motifVel_ = std::clamp(velocity, 0.05, 1.0);
    motifZone_ = zone;
}

void HarmonicWorldVoice::setPadRootMidi(int rootMidi, ModalScale scale) noexcept {
    padBaseHz_ = midiNoteToHz(static_cast<double>(rootMidi + 24)); // Oitava 3 limpa acima do subgrave
    padFifthHz_ = midiNoteToHz(static_cast<double>(rootMidi + 24 + ((scale == ModalScale::F_Locrian) ? 6 : 7)));
    const int thirdOffset = (scale == ModalScale::G_Lydian) ? 4 : 3;
    padMinorThirdHz_ = midiNoteToHz(static_cast<double>(rootMidi + 24 + thirdOffset));
}

StereoFrame HarmonicWorldVoice::renderChordAndPad(double kickSidechainEnv, double sampleRate) noexcept {
    // 1. Pad Abissal Bioluminescente Contínuo (cola submersa discreta com bombeamento de sidechain suave)
    padLfoPhase_ += kTwoPi * 0.09 / sampleRate;
    if (padLfoPhase_ > kTwoPi) padLfoPhase_ -= kTwoPi;

    const std::array<double, 6> padFreqs{{
        padBaseHz_ * 0.997, padBaseHz_ * 1.003,
        padMinorThirdHz_ * 0.996, padMinorThirdHz_ * 1.004,
        padFifthHz_ * 0.998, padFifthHz_ * 1.002
    }};
    double padL = 0.0;
    double padR = 0.0;
    for (size_t i = 0; i < 6; ++i) {
        const double dt = padFreqs[i] / sampleRate;
        const double s = 2.0 * padPhases_[i] - 1.0 - polyBlep(padPhases_[i], dt);
        padPhases_[i] += dt;
        if (padPhases_[i] >= 1.0) padPhases_[i] -= 1.0;
        if ((i & 1U) == 0U) padL += s; else padR += s;
    }
    const double padDuck = std::clamp(1.0 - 0.62 * kickSidechainEnv, 0.25, 1.0);
    const double padCut = 310.0 + 130.0 * std::sin(padLfoPhase_);
    const double filtPadL = padFilterL_.process(padL * 0.024 * padDuck, padCut, 0.80, sampleRate).lp;
    const double filtPadR = padFilterR_.process(padR * 0.024 * padDuck, padCut * 1.05, 0.80, sampleRate).lp;

    // 2. Dub Chord Stab m9 (ataque rápido 6ms) OU Swell Analógico OB-Xd (ataque lento >= 350ms em G0 / T1)
    double stabL = 0.0;
    double stabR = 0.0;
    const bool isSlowSwell = (chordAttackSec_ > 0.05);
    const double maxLife = chordAttackSec_ + chordDur_ * 2.2;
    if (chordTime_ < maxLife) {
        const double atk = std::min(1.0, chordTime_ / chordAttackSec_);
        const double decay = isSlowSwell
            ? std::exp(-std::max(0.0, chordTime_ - chordAttackSec_) / (chordDur_ * 0.78))
            : std::exp(-chordTime_ / (chordDur_ * 0.48));
        const double env = atk * decay * chordVel_;
        constexpr std::array<double, 3> kDetunes{{0.9945, 1.0000, 1.0055}};

        for (size_t v = 0; v < 4; ++v) {
            for (size_t d = 0; d < 3; ++d) {
                const double dt = (chordFreqs_[v] * kDetunes[d]) / sampleRate;
                const double osc = 2.0 * chordPhases_[v][d] - 1.0 - polyBlep(chordPhases_[v][d], dt);
                chordPhases_[v][d] += dt;
                if (chordPhases_[v][d] >= 1.0) chordPhases_[v][d] -= 1.0;
                if (((v + d) & 1U) == 0U) stabL += osc; else stabR += osc;
            }
        }
        const double stabCut = isSlowSwell
            ? (320.0 + 1550.0 * env * chordVel_)
            : (360.0 + 1950.0 * std::exp(-chordTime_ * 10.5) * chordVel_);
        const double stabQ = isSlowSwell ? 1.05 : 1.55;
        const double gainScale = isSlowSwell ? 0.068 : 0.082;
        stabL = chordFilterL_.process(stabL * gainScale * env, stabCut, stabQ, sampleRate).lp;
        stabR = chordFilterR_.process(stabR * gainScale * env, stabCut * 1.04, stabQ, sampleRate).lp;
        chordTime_ += 1.0 / sampleRate;
    }

    return StereoFrame{filtPadL + stabL, filtPadR + stabR};
}

StereoFrame HarmonicWorldVoice::renderLeitmotif(double sampleRate) noexcept {
    if (motifTime_ >= motifDur_ + 0.24) {
        return StereoFrame{0.0, 0.0};
    }
    const double glideAlpha = 1.0 - std::exp(-1.0 / (0.045 * sampleRate));
    motifHz_ += glideAlpha * (motifTargetHz_ - motifHz_);

    motifVibPhase_ += kTwoPi * 4.6 / sampleRate;
    if (motifVibPhase_ > kTwoPi) motifVibPhase_ -= kTwoPi;
    const double vib = 1.0 + 0.0042 * std::sin(motifVibPhase_) * std::min(1.0, motifTime_ / 0.22);

    // Swell cinematográfico expressivo (55 ms) de trompa/cello submarino escuro — zero timbre de sino agudo!
    const double atk = std::min(1.0, motifTime_ / 0.055);
    const double rel = (motifTime_ < motifDur_)
        ? std::exp(-0.95 * (motifTime_ / motifDur_))
        : std::exp(-14.0 * (motifTime_ - motifDur_));
    const double env = atk * rel * motifVel_;

    double sig = 0.0;
    if (motifZone_ == GenreZone::G2_SlowIndustrial || motifZone_ == GenreZone::G5_HardgrooveCrisis) {
        // Metamorfose Industrial: trompa analógica rasgada em K35 MS-20
        const double dt = (motifHz_ * vib) / sampleRate;
        const double saw = 2.0 * motifPhaseCar_ - 1.0 - polyBlep(motifPhaseCar_, dt);
        motifPhaseCar_ += dt;
        if (motifPhaseCar_ >= 1.0) motifPhaseCar_ -= 1.0;
        sig = motifK35_.process(saw, 140.0, 520.0 + 980.0 * env, 0.48, 1.55, sampleRate) * env * 0.19;
    } else {
        // Metamorfose Biológica Mística / Lídia: cello/horn FM orgânico (razão 1:1 com filtro ZDF quente)
        motifPhaseMod_ += kTwoPi * (motifHz_ * 1.002 * vib) / sampleRate;
        if (motifPhaseMod_ > kTwoPi) motifPhaseMod_ -= kTwoPi;
        const double modIdx = (0.35 + 0.85 * env) * motifVel_;
        motifPhaseCar_ += kTwoPi * (motifHz_ * vib) / sampleRate;
        if (motifPhaseCar_ > kTwoPi) motifPhaseCar_ -= kTwoPi;
        const double fm = std::sin(motifPhaseCar_ + modIdx * std::sin(motifPhaseMod_));
        sig = motifWarmLp_.process(fm, 640.0 + 620.0 * env, 1.05, sampleRate).lp * env * 0.18;
    }

    motifTime_ += 1.0 / sampleRate;
    return StereoFrame{sig * 0.88, sig * 1.08};
}

void RealtimeWorkletBus::init(double sampleRate) noexcept {
    sampleRate_ = std::max(8000.0, sampleRate);
    telemetry_ = TelemetrySnapshot{};
    director_.reset(GenreZone::G1_DubHydroChart);
    liveSonar_.reset();
    spoolProgress01_ = 1.0;
    dynamicProfile_ = DynamicProfile::Estudio_Minus23Lufs;
    monoOut_ = false;
    antiTinnitus_ = false;
    targetCutoffHz_ = 20000.0;
    smoothedCutoffHz_ = 20000.0;
    currentDuckDb_ = 0.0;
    salvoHoldSec_ = 0.0;
    samplesSinceBar_ = 0;
    hydroFilterL_.reset(); hydroFilterR_.reset();
    surgicalDuckL_.reset(); surgicalDuckR_.reset();
    profileHpfL_.reset(); profileHpfR_.reset();
    deckSubExtractL_.reset(); deckSubExtractR_.reset();
    deckHarmonicExciterL_.reset(); deckHarmonicExciterR_.reset();
    profileLimiterL_.reset(); profileLimiterR_.reset();
    tinnitusNotch4kL_.reset(); tinnitusNotch4kR_.reset();
    tinnitusShelf8kL_.reset(); tinnitusShelf8kR_.reset();
    monoSubCrossover_.reset();
}

void RealtimeWorkletBus::updateTargetCutoffFromFoil() noexcept {
    switch (telemetry_.foilState) {
        case FoilState::NoFoil_20kHz:
            targetCutoffHz_ = 20000.0;
            break;
        case FoilState::Touchdown_7200Hz:
            targetCutoffHz_ = 7200.0;
            break;
        case FoilState::TacticalDive_400Hz:
            targetCutoffHz_ = 400.0;
            break;
        case FoilState::SpoolUp_Sweep:
            // Varredura exponencial canônica 3_SPOOL_UP: 400 Hz -> 20.000 Hz (razão 50x)
            targetCutoffHz_ = 400.0 * std::pow(50.0, std::clamp(spoolProgress01_, 0.0, 1.0));
            break;
        case FoilState::TacticalPause_900Hz:
            targetCutoffHz_ = 900.0;
            break;
    }
}

void RealtimeWorkletBus::pushTelemetry(const TelemetrySnapshot& snapshot) noexcept {
    telemetry_ = snapshot;
    updateTargetCutoffFromFoil();
    if (telemetry_.weaponSalvoTriggered) {
        salvoHoldSec_ = 0.045; // Segura o corte cirúrgico durante o impacto inicial da salva
    }
}

void RealtimeWorkletBus::setSpoolProgress(double progress01) noexcept {
    spoolProgress01_ = std::clamp(progress01, 0.0, 1.0);
    updateTargetCutoffFromFoil();
}

void RealtimeWorkletBus::setAcousticPreferences(DynamicProfile profile, bool monoOut, bool antiTinnitus) noexcept {
    dynamicProfile_ = profile;
    monoOut_ = monoOut;
    antiTinnitus_ = antiTinnitus;
}

double RealtimeWorkletBus::currentBusCutoffHz(uint8_t busIndex) const noexcept {
    // Tabela 10.6.A: Oclusão Hidrodinâmica Seletiva por Barramento (BUS_0..BUS_5)
    // BUS_0 (Alertas Sobrevivência) e BUS_4 (UI Tática) nunca sofrem abafamento subaquático (20.000 Hz)
    if (busIndex == 0U || busIndex == 4U) {
        return 20000.0;
    }
    const FoilState st = telemetry_.foilState;
    if (st == FoilState::NoFoil_20kHz) {
        if (busIndex == 3U) return 18000.0;
        if (busIndex == 5U) return 16000.0;
        return 20000.0;
    }
    if (st == FoilState::TacticalDive_400Hz) {
        if (busIndex == 1U) return 400.0;   // Armas Exteriores abafadas sob a linha d'água
        if (busIndex == 2U) return 14000.0; // Cabine Interna audível através do casco pressurizado!
        if (busIndex == 3U) return 380.0;   // Hidrofólio/Ambiente submerso
        return 420.0;                       // BUS_5 Música Procedimental submersa
    }
    if (st == FoilState::SpoolUp_Sweep) {
        const double p = std::clamp(spoolProgress01_, 0.0, 1.0);
        if (busIndex == 1U) return 400.0 * std::pow(20000.0 / 400.0, p);
        if (busIndex == 2U) return 14000.0 * std::pow(20000.0 / 14000.0, p);
        if (busIndex == 3U) return 380.0 * std::pow(18000.0 / 380.0, p);
        return 420.0 * std::pow(16000.0 / 420.0, p);
    }
    if (st == FoilState::TacticalPause_900Hz) {
        if (busIndex == 2U) return 12000.0;
        return 900.0;
    }
    // Touchdown_7200Hz / 4_FURTIVO_AR
    if (busIndex == 2U) return 16000.0;
    return 7200.0;
}

void RealtimeWorkletBus::triggerSonarPing(double intensity01) noexcept {
    const GenreRecipe recipe = getGenreRecipe(director_.currentZone());
    const double rootHz = midiNoteToHz(static_cast<double>(modalRootMidiSub(recipe.scale)));
    liveSonar_.triggerTransdiegeticSonar(rootHz, intensity01);
}

StereoFrame RealtimeWorkletBus::processSample(StereoFrame stemInput) noexcept {
    const GenreRecipe recipe = getGenreRecipe(director_.currentZone());
    const double barSec = (60.0 / recipe.bpm) * 4.0;
    const size_t barSamples = static_cast<size_t>(barSec * sampleRate_);
    if (++samplesSinceBar_ >= std::max<size_t>(1, barSamples)) {
        samplesSinceBar_ = 0;
        (void)director_.updateOnBarBoundary(telemetry_, barSec);
    }

    // 1. Suavização exponencial para o filtro hidrodinâmico ZDF (20k / 7.2k / 900 / 400 Hz + Spool-Up)
    const double hydroAlpha = 1.0 - std::exp(-1.0 / (0.065 * sampleRate_));
    smoothedCutoffHz_ += hydroAlpha * (targetCutoffHz_ - smoothedCutoffHz_);
    const double hydroQ = (smoothedCutoffHz_ < 900.0) ? 1.15 : 0.707; // Ressonância submersa quente aos 400 Hz

    double procL = stemInput.left;
    double procR = stemInput.right;
    if (smoothedCutoffHz_ < 19500.0) {
        procL = hydroFilterL_.process(procL, smoothedCutoffHz_, hydroQ, sampleRate_).lp;
        procR = hydroFilterR_.process(procR, smoothedCutoffHz_, hydroQ, sampleRate_).lp;
    } else {
        (void)hydroFilterL_.process(procL, 20000.0, 0.707, sampleRate_);
        (void)hydroFilterR_.process(procR, 20000.0, 0.707, sampleRate_);
    }

    // 2. Ducking Dinâmico Cirúrgico (250-2500 Hz centrado em 950 Hz, -6.5 dB, ataque 2ms / retorno 135ms)
    const double desiredDuckDb = (salvoHoldSec_ > 0.0) ? -6.5 : 0.0;
    if (salvoHoldSec_ > 0.0) {
        salvoHoldSec_ = std::max(0.0, salvoHoldSec_ - (1.0 / sampleRate_));
    }
    const double duckTau = (desiredDuckDb < currentDuckDb_) ? 0.002 : 0.135;
    const double duckAlpha = 1.0 - std::exp(-1.0 / (duckTau * sampleRate_));
    currentDuckDb_ += duckAlpha * (desiredDuckDb - currentDuckDb_);

    procL = surgicalDuckL_.processBell(procL, 950.0, 0.85, currentDuckDb_, sampleRate_);
    procR = surgicalDuckR_.processBell(procR, 950.0, 0.85, currentDuckDb_, sampleRate_);

    // 3. Soma o Sonar Modal Transdiegético em tempo real (sempre afinado à tônica modal ativa)
    const StereoFrame sonar = liveSonar_.renderSample(sampleRate_);
    procL += sonar.left;
    procR += sonar.right;

    // 4. Perfis Acústicos Dinâmicos (LAC_12 / LAC_13: ESTUDIO, STEAM_DECK, NOTURNO)
    if (dynamicProfile_ == DynamicProfile::SteamDeck_Minus18Lufs) {
        // Extrai subgrave (< 125 Hz), gera harmônicos psicoacústicos 2x/3x (missing fundamental) e limpa < 85 Hz!
        const double subBandL = deckSubExtractL_.process(procL, 125.0, 0.707, sampleRate_).lp;
        const double subBandR = deckSubExtractR_.process(procR, 125.0, 0.707, sampleRate_).lp;
        const double harmL = deckHarmonicExciterL_.processAsymTube(subBandL * 2.4, 2.2, 0.34) - subBandL * 0.85;
        const double harmR = deckHarmonicExciterR_.processAsymTube(subBandR * 2.4, 2.2, 0.34) - subBandR * 0.85;
        procL = profileHpfL_.process(procL + harmL * 0.65, 85.0, 0.707, sampleRate_).hp;
        procR = profileHpfR_.process(procR + harmR * 0.65, 85.0, 0.707, sampleRate_).hp;
        procL = profileLimiterL_.processTanh(procL * 1.28, 1.15);
        procR = profileLimiterR_.processTanh(procR * 1.28, 1.15);
    } else if (dynamicProfile_ == DynamicProfile::Noturno_Minus24Lufs) {
        // HPF 65 Hz anti-vibração estrutural noturna + teto de compressão macio
        procL = profileHpfL_.process(procL, 65.0, 0.707, sampleRate_).hp;
        procR = profileHpfR_.process(procR, 65.0, 0.707, sampleRate_).hp;
        procL = profileLimiterL_.processTanh(procL * 0.82, 1.35) * 0.88;
        procR = profileLimiterR_.processTanh(procR * 0.82, 1.35) * 0.88;
    } else {
        procL = profileHpfL_.process(procL, 20.0, 0.707, sampleRate_).hp;
        procR = profileHpfR_.process(procR, 20.0, 0.707, sampleRate_).hp;
    }

    // 5. Modo Conforto Auditivo Anti-Tinnitus (LAC_16: atenuação cirúrgica estreita > 3200 Hz)
    if (antiTinnitus_) {
        procL = tinnitusNotch4kL_.processBell(procL, 4200.0, 5.5, -11.5, sampleRate_);
        procR = tinnitusNotch4kR_.processBell(procR, 4200.0, 5.5, -11.5, sampleRate_);
        procL = tinnitusShelf8kL_.processBell(procL, 7600.0, 1.8, -6.0, sampleRate_);
        procR = tinnitusShelf8kR_.processBell(procR, 7600.0, 1.8, -6.0, sampleRate_);
    }

    // 6. Saída Mono de Acessibilidade (LAC_16) ou Crossover Subgrave LR4 (< 140 Hz) 100% Mono coerente em fase
    if (monoOut_) {
        const double mono = 0.5 * (procL + procR);
        return StereoFrame{mono, mono};
    }
    return monoSubCrossover_.processMonoSubCrossover(StereoFrame{procL, procR}, 140.0, sampleRate_);
}

void RealtimeWorkletBus::processInterleavedBlock(const float* inInterleavedLR, float* outInterleavedLR, size_t numFrames) noexcept {
    if (outInterleavedLR == nullptr) {
        return;
    }
    for (size_t i = 0; i < numFrames; ++i) {
        const StereoFrame inFrame = (inInterleavedLR != nullptr)
            ? StereoFrame{static_cast<double>(inInterleavedLR[2 * i]), static_cast<double>(inInterleavedLR[2 * i + 1])}
            : StereoFrame{0.0, 0.0};
        const StereoFrame outFrame = processSample(inFrame);
        outInterleavedLR[2 * i] = static_cast<float>(outFrame.left);
        outInterleavedLR[2 * i + 1] = static_cast<float>(outFrame.right);
    }
}

Result<StereoBuffer> renderProceduralTrackOffline(
    const ForgeTrackConfig& config,
    uint32_t sampleRate
) {
    if (config.totalBars < 2 || config.totalBars > 128 || sampleRate < 22050) {
        return Result<StereoBuffer>::failure(ErrorCode::InvalidParameter);
    }

    // Pré-calcula a linha do tempo de barras (suporta tanto loop de BPM fixo quanto escalada G2 110 -> G5 137 BPM!)
    struct BarPlan {
        GenreRecipe recipe{};
        size_t startFrame = 0;
        size_t lengthFrames = 0;
        PhraseVariant variant = PhraseVariant::A1_Pocket;
    };

    DeterministicRng rng(config.seed);
    std::vector<BarPlan> bars(static_cast<size_t>(config.totalBars));
    PhraseVariant prev2 = PhraseVariant::A1_Pocket;
    PhraseVariant prev1 = PhraseVariant::A1_Pocket;
    size_t cursorFrame = 0;

    for (int b = 0; b < config.totalBars; ++b) {
        const bool escalated = (config.escalationStartBar >= 0 && b >= config.escalationStartBar);
        const GenreZone zone = escalated ? config.escalationZone : config.primaryZone;
        const GenreRecipe recipe = getGenreRecipe(zone);
        const size_t barLen = static_cast<size_t>(std::llround((60.0 / recipe.bpm) * 4.0 * static_cast<double>(sampleRate)));
        const PhraseVariant var = BarAwareMarkov2::nextVariant(prev2, prev1, b % 8, rng);
        prev2 = prev1;
        prev1 = var;
        bars[static_cast<size_t>(b)] = BarPlan{recipe, cursorFrame, barLen, var};
        cursorFrame += barLen;
    }

    // Second-Pass Tail Bounce: renderiza 1 compasso de pré-aquecimento antes da barra 0 quando o BPM é constante
    // para cravar Loop Seam Delta < 0.001 com caudas de Dub Delay e Reverb FDN-8!
    const bool seamlessLoopMode = (config.escalationStartBar < 0);
    const size_t warmupFrames = seamlessLoopMode ? bars[0].lengthFrames : 0;
    const size_t totalRenderFrames = warmupFrames + cursorFrame;

    // Agenda eventos discretos na grade de micro-timing (com Swing + Pocket Offset)
    // Tipos: 1=Kick, 2=Bass/303/SubDrone, 3=ClosedHat, 4=OpenHat, 5=Clang/Anvil, 6=Snare,
    //        7=Suck, 8=Shell/Drop, 9=DubChord/OBXdSwell, 10=Motif, 11=FormantBioLead, 12=SonarPing
    struct ScheduledEvent {
        size_t frame = 0;
        uint8_t type = 0;
        double param1 = 0.0;
        double param2 = 0.0;
        double param3 = 0.0;
        double velocity = 0.8;
        bool flag = false;
        bool accent = false;
        GenreRecipe recipe{};
    };
    std::vector<ScheduledEvent> events;
    events.reserve(static_cast<size_t>(config.totalBars) * 48U);

    LockedShiftRegister shiftReg(config.seed ^ 0xA5A5A5A5ULL);
    std::array<int, 4> currentChordVoicing{{55, 58, 62, 65}}; // Gm7 escuro inicial

    const int startBarIdx = seamlessLoopMode ? -1 : 0;
    for (int b = startBarIdx; b < config.totalBars; ++b) {
        const int logicalBar = (b < 0) ? (config.totalBars - 1) : b;
        const BarPlan plan = (b < 0)
            ? BarPlan{bars.back().recipe, 0, warmupFrames, bars.back().variant}
            : BarPlan{bars[static_cast<size_t>(b)].recipe, warmupFrames + bars[static_cast<size_t>(b)].startFrame, bars[static_cast<size_t>(b)].lengthFrames, bars[static_cast<size_t>(b)].variant};

        if (b >= 0) {
            shiftReg.advanceBar(b, rng);
        }

        const GenreRecipe& rec = plan.recipe;
        const int rootSubMidi = modalRootMidiSub(rec.scale);
        const double stepDurSec = (60.0 / rec.bpm) / 4.0;
        const double barDurSec = stepDurSec * 16.0;
        const bool isFillBar = (plan.variant == PhraseVariant::D1_TacticalReloadFill) && (rec.zone != GenreZone::G0_AbyssalAmbient);
        const bool isPreEscalationRiser = (config.escalationStartBar > 0 && b == config.escalationStartBar - 1);

        // --- ZONA G0: AMBIENT DUB ABISSAL (90 BPM, Zero Kick, Drone 360ms, Swell OB-Xd, Gotas/Sonar de Poisson) ---
        if (rec.zone == GenreZone::G0_AbyssalAmbient) {
            if ((logicalBar % 2) == 0) {
                const int droneDeg = ((logicalBar % 8) >= 6) ? 3 : 0;
                const int droneMidi = quantizeMidiToScale(rootSubMidi + scaleDegreeToSemitones(rec.scale, droneDeg), rec.scale).value;
                events.push_back(ScheduledEvent{
                    plan.startFrame, 2,
                    midiNoteToHz(static_cast<double>(droneMidi)), barDurSec * 1.85, 0.0,
                    0.82, true, false, rec
                });

                const int chordShift = ((logicalBar % 4) >= 2) ? 5 : 0; // Gm9 <-> Cm9/Fmaj Dórico
                const int rPc = (rootSubMidi + chordShift) % 12;
                const std::array<int, 4> targetPcs{{rPc, (rPc + 3) % 12, (rPc + 7) % 12, (rPc + 10) % 12}};
                currentChordVoicing = solveMinimalVoiceLeading(currentChordVoicing, targetPcs);
                const size_t swellOffset = std::min(totalRenderFrames - 1, plan.startFrame + static_cast<size_t>(0.35 * sampleRate));
                events.push_back(ScheduledEvent{
                    swellOffset, 9,
                    static_cast<double>(currentChordVoicing[0]),
                    static_cast<double>(currentChordVoicing[1] | (currentChordVoicing[2] << 8) | (currentChordVoicing[3] << 16)),
                    0.42, // attackSec = 420 ms!
                    0.72, false, false, rec
                });
            }

            // Processo de Poisson determinístico por barra lógica (garante que b=-1 repita exatamente a última barra!)
            DeterministicRng barPoissonRng(config.seed ^ (static_cast<uint64_t>(logicalBar + 17) * 0x9E3779B97F4A7C15ULL));
            double tCursorSec = 0.14;
            constexpr double kLambdaPerSec = 2.25;
            while (tCursorSec < barDurSec - 0.18) {
                const double u = std::clamp(barPoissonRng.nextUniform01(), 1e-6, 0.999999);
                const double dt = std::max(0.30, -std::log(u) / kLambdaPerSec);
                tCursorSec += dt;
                if (tCursorSec >= barDurSec - 0.16) break;

                const size_t dropFrame = std::min(totalRenderFrames - 1, plan.startFrame + static_cast<size_t>(tCursorSec * sampleRate));
                if (barPoissonRng.nextUniform01() < 0.28) {
                    events.push_back(ScheduledEvent{
                        dropFrame, 12,
                        midiNoteToHz(static_cast<double>(rootSubMidi)), 0.0, 0.0,
                        0.58 + 0.24 * barPoissonRng.nextUniform01(), false, false, rec
                    });
                } else {
                    constexpr std::array<int, 6> kDropDegrees{{0, 1, 2, 4, 5, 7}}; // inclui 6ª maior Dórica (grau 5 = Mi natural!)
                    const int deg = kDropDegrees[static_cast<size_t>(barPoissonRng.nextU64() % kDropDegrees.size())];
                    const int octShift = (barPoissonRng.nextUniform01() < 0.5) ? 24 : 36;
                    const int dropMidi = quantizeMidiToScale(rootSubMidi + octShift + scaleDegreeToSemitones(rec.scale, deg), rec.scale).value;
                    events.push_back(ScheduledEvent{
                        dropFrame, 8,
                        midiNoteToHz(static_cast<double>(dropMidi)), 0.72, 0.86,
                        0.46 + 0.30 * barPoissonRng.nextUniform01(), false, false, rec
                    });
                }
            }

            if ((logicalBar % 8) == 4 || (logicalBar % 8) == 6) {
                const int deg = ((logicalBar % 8) == 4) ? 0 : 5;
                const int motifMidi = quantizeMidiToScale(rootSubMidi + 24 + scaleDegreeToSemitones(rec.scale, deg), rec.scale).value;
                const size_t fIdx = std::min(totalRenderFrames - 1, plan.startFrame + static_cast<size_t>(0.65 * sampleRate));
                events.push_back(ScheduledEvent{
                    fIdx, 10, static_cast<double>(motifMidi), barDurSec * 0.85, 0.0, 0.62, false, false, rec
                });
            }
            continue;
        }

        // --- ZONAS RÍTMICAS G1..G5 ---
        const uint16_t kickMask = isFillBar ? 0x0111U : computeBjorklundMask(4, 16, 0).value;

        uint16_t rawBassMask = 0U;
        if (rec.zone == GenreZone::G1_DubHydroChart) {
            rawBassMask = computeBjorklundMask(3, 16, 2).value;
        } else if (rec.zone == GenreZone::G2_SlowIndustrial) {
            rawBassMask = 0xEFEFU; // Riff motorik de semicolcheias/colcheias Gesaffelstein
        } else if (rec.zone == GenreZone::G3_BioMysticGroove) {
            rawBassMask = static_cast<uint16_t>(computeBjorklundMask(5, 16, 1).value | 0x4444U);
        } else if (rec.zone == GenreZone::G4_AcidDriving) {
            rawBassMask = 0xEFEFU; // Polimetria 303 respirando em 14/16 pulsos por barra
        } else if (rec.zone == GenreZone::G5_HardgrooveCrisis) {
            rawBassMask = computeBjorklundMask(5, 16, 2).value;
        }
        const uint16_t bassMask = (rec.zone == GenreZone::G2_SlowIndustrial || rec.zone == GenreZone::G4_AcidDriving)
            ? rawBassMask
            : applyKickAntiMasking(rawBassMask, kickMask);

        const uint16_t shellDubMask = computeBjorklundMask(5, 16, 3).value;
        const uint16_t clangMaskA = computeBjorklundMask(7, 16, 1).value;
        const uint16_t clangMaskB = computeBjorklundMask(9, 16, 3).value;
        const uint16_t dubChordMask = enforceDubOffbeatGuardrail(
            (plan.variant == PhraseVariant::B1_SyncopatedCall) ? static_cast<uint16_t>((1U << 3U) | (1U << 11U)) : static_cast<uint16_t>(1U << 6U)
        );

        for (int s = 0; s < 16; ++s) {
            auto toGlobalFrame = [&](double pocketMs, double jitterMs, bool isKick) -> size_t {
                const auto localRes = computeStepSampleOffset(0, s, rec.bpm, rec.swingRatio, pocketMs, jitterMs, isKick, static_cast<double>(sampleRate), rng);
                const ptrdiff_t rawIdx = static_cast<ptrdiff_t>(plan.startFrame) + static_cast<ptrdiff_t>(localRes.value);
                return static_cast<size_t>(std::clamp<ptrdiff_t>(rawIdx, 0, static_cast<ptrdiff_t>(totalRenderFrames - 1)));
            };

            const int phraseStep = (logicalBar % 8) * 16 + s;

            // 1. Kick (sempre cravado, zero jitter)
            if (((kickMask >> s) & 1U) != 0U && !isPreEscalationRiser) {
                events.push_back(ScheduledEvent{
                    toGlobalFrame(0.0, 0.0, true), 1,
                    midiNoteToHz(static_cast<double>(rootSubMidi)), 0.0, 0.0, 0.96, false, false, rec
                });
            }

            // 2. Subgrave sincopado (G1/G3) / Riff Industrial K35 (G2) / Polimetria Acid 303 5x7 (G4) / Stab HPF (G5)
            if (((bassMask >> s) & 1U) != 0U && !(isFillBar && s >= 12)) {
                const auto& st = shiftReg.steps()[static_cast<size_t>(s)];
                int degree = st.scaleDegreeOffset;
                bool slide = (s % 4 == 3);
                bool accent = false;
                double vel = st.velocity;

                if (rec.zone == GenreZone::G2_SlowIndustrial) {
                    constexpr std::array<int, 16> kIndRiff{{0, 0, 7, 0, 1, 0, 0, 4, 0, 0, 7, 0, 1, 3, 1, 0}};
                    degree = kIndRiff[static_cast<size_t>(s)];
                    slide = ((s & 1) == 1);
                } else if (rec.zone == GenreZone::G4_AcidDriving) {
                    // Polimetria Plastikman 5/16 (alturas em F# Frígio c/ b2=Sol natural e oitava) x 7/16 (Accent + Slide RC 60ms!)
                    constexpr std::array<int, 5> kAcidDegrees{{0, 1, 0, 7, 4}};
                    constexpr std::array<bool, 7> kAcidAccents{{true, true, false, true, false, false, true}};
                    constexpr std::array<bool, 7> kAcidSlides{{false, true, false, false, true, false, true}};
                    degree = kAcidDegrees[static_cast<size_t>(phraseStep % 5)];
                    if ((logicalBar % 4) == 3 && (s >= 10)) {
                        degree += 1;
                    }
                    accent = kAcidAccents[static_cast<size_t>(phraseStep % 7)];
                    slide = kAcidSlides[static_cast<size_t>(phraseStep % 7)];
                    vel = accent ? 0.96 : 0.72;
                }

                const int rawMidi = rootSubMidi + scaleDegreeToSemitones(rec.scale, degree);
                const int quantMidi = quantizeMidiToScale(rawMidi, rec.scale).value;
                events.push_back(ScheduledEvent{
                    toGlobalFrame(0.0, 0.35, false), 2,
                    midiNoteToHz(static_cast<double>(quantMidi)), stepDurSec * (slide ? 1.38 : 0.90), 0.0,
                    vel, slide, accent, rec
                });
            }

            // 3. Hi-Hats abertos no contratempo (& = passos 2, 6, 10, 14) + Ghost Shakers nas semicolcheias
            if ((s % 4) == 2) {
                const double openVel = (rec.zone == GenreZone::G1_DubHydroChart) ? 0.36
                    : ((rec.zone == GenreZone::G4_AcidDriving) ? 0.48 : 0.64);
                events.push_back(ScheduledEvent{
                    toGlobalFrame(rec.hatPocketMs, 0.55, false), 4,
                    0.0, 0.0, 0.0, openVel, true, false, rec
                });
            } else if (rec.zone != GenreZone::G1_DubHydroChart || (s % 2 == 1)) {
                const double ghostVel = ((s & 1) != 0) ? 0.30 : 0.20;
                events.push_back(ScheduledEvent{
                    toGlobalFrame(rec.hatPocketMs, 0.65, false), 3,
                    0.0, 0.0, 0.0, ghostVel, false, false, rec
                });
            }

            // 4. Anéis metálicos / Bigorna FM polimétrica em G5 Hardgroove (E(7,16) x E(9,16))
            if (rec.zone == GenreZone::G5_HardgrooveCrisis && ((((clangMaskA ^ clangMaskB) >> s) & 1U) != 0U)) {
                events.push_back(ScheduledEvent{
                    toGlobalFrame(-1.5, 0.5, false), 5, 0.0, 0.0, 0.0, 0.58, true, false, rec
                });
            }

            // 5. Caixa Industrial (+7 ms atrasada em G2) ou Pre-Shifted Foley Suck (-28ms em G3/G1) nos tempos 2 e 4 (s=4, 12)
            if (s == 4 || s == 12) {
                if (rec.zone == GenreZone::G2_SlowIndustrial || rec.zone == GenreZone::G5_HardgrooveCrisis) {
                    events.push_back(ScheduledEvent{
                        toGlobalFrame(rec.snarePocketMs, 0.4, false), 6,
                        0.0, 0.0, 0.0, 0.85, false, false, rec
                    });
                }
                if (rec.zone == GenreZone::G3_BioMysticGroove || rec.zone == GenreZone::G1_DubHydroChart) {
                    events.push_back(ScheduledEvent{
                        toGlobalFrame(-28.0, 0.0, false), 7,
                        0.028, 0.0, 0.0, 0.74, false, false, rec
                    });
                }
            }

            // 6. Percussão Modal Orgânica (Mutable Rings: polimetria 6/16 em G3 Bio-Mystic, E(5,16) em G1)
            const bool triggerShell = (rec.zone == GenreZone::G3_BioMysticGroove)
                ? ((phraseStep % 6 == 0) || (phraseStep % 6 == 3) || (phraseStep % 6 == 4 && (s & 1) == 1))
                : (rec.zone == GenreZone::G1_DubHydroChart && (((shellDubMask >> s) & 1U) != 0U));
            if (triggerShell) {
                constexpr std::array<int, 6> kDorianShellDeg{{0, 2, 4, 5, 7, 9}};
                const int deg = kDorianShellDeg[static_cast<size_t>((phraseStep / 2) % kDorianShellDeg.size())];
                const int shellMidi = quantizeMidiToScale(rootSubMidi + 24 + scaleDegreeToSemitones(rec.scale, deg), rec.scale).value;
                events.push_back(ScheduledEvent{
                    toGlobalFrame(0.0, 0.5, false), 8,
                    midiNoteToHz(static_cast<double>(shellMidi)), 0.56, 0.70, 0.60, false, false, rec
                });
            }

            // 7. Acordes Dub Techno m9 (com Voice-Leading de custo mínimo e trava anti-cabeça!)
            if ((rec.zone == GenreZone::G1_DubHydroChart || rec.zone == GenreZone::G3_BioMysticGroove) && (((dubChordMask >> s) & 1U) != 0U)) {
                const int chordShift = ((logicalBar % 4) >= 2) ? 5 : 0; // Gm9 <-> Cm9 em Sol Dórico
                const int rPc = (rootSubMidi + chordShift) % 12;
                const std::array<int, 4> targetPcs{{rPc, (rPc + 3) % 12, (rPc + 7) % 12, (rPc + 10) % 12}};
                currentChordVoicing = solveMinimalVoiceLeading(currentChordVoicing, targetPcs);
                events.push_back(ScheduledEvent{
                    toGlobalFrame(0.0, 0.4, false), 9,
                    static_cast<double>(currentChordVoicing[0]),
                    static_cast<double>(currentChordVoicing[1] | (currentChordVoicing[2] << 8) | (currentChordVoicing[3] << 16)),
                    0.006,
                    (rec.zone == GenreZone::G1_DubHydroChart) ? 0.84 : 0.54, false, false, rec
                });
            }
        }

        // 8. Voz Bio-Orgânica de 3 Formantes (G3 Bio-Mystic Groove — fraseado hipnótico sem fala humana, LEI_SFX_3)
        if (rec.zone == GenreZone::G3_BioMysticGroove && ((logicalBar % 2) == 1)) {
            constexpr std::array<int, 4> kFormantDegrees{{4, 5, 2, 0}}; // D4 -> E4 (6ª Dórica!) -> Bb3 -> G3
            const int fIdxDeg = (logicalBar / 2) % 4;
            const int fMidi = quantizeMidiToScale(rootSubMidi + 24 + scaleDegreeToSemitones(rec.scale, kFormantDegrees[static_cast<size_t>(fIdxDeg)]), rec.scale).value;
            const auto offRes = computeStepSampleOffset(0, 3, rec.bpm, rec.swingRatio, 0.0, 0.4, false, static_cast<double>(sampleRate), rng);
            const size_t framePos = std::min(totalRenderFrames - 1, plan.startFrame + static_cast<size_t>(offRes.value));
            const double vowelMorph = 0.20 + 0.22 * static_cast<double>(fIdxDeg);
            events.push_back(ScheduledEvent{
                framePos, 11, midiNoteToHz(static_cast<double>(fMidi)), stepDurSec * 9.5, vowelMorph,
                0.76, false, false, rec
            });
        }

        // 9. Leitmotif Metamórfico de 4 Notas do BIO-FOIL (registro de violoncelo/trompa submarina: root + 24 semitons)
        if ((logicalBar % 8) >= 4) {
            const int motifIdx = logicalBar % 4;
            constexpr std::array<int, 4> kMotifDegrees{{0, 4, 5, 1}};
            const int deg = kMotifDegrees[static_cast<size_t>(motifIdx)];
            const int motifMidi = quantizeMidiToScale(rootSubMidi + 24 + scaleDegreeToSemitones(rec.scale, deg), rec.scale).value;
            const size_t motifStep = (motifIdx % 2 == 0) ? 2U : 6U;
            const auto offRes = computeStepSampleOffset(0, static_cast<int>(motifStep), rec.bpm, rec.swingRatio, 0.0, 0.3, false, static_cast<double>(sampleRate), rng);
            const size_t fIdx = std::min(totalRenderFrames - 1, plan.startFrame + static_cast<size_t>(offRes.value));
            events.push_back(ScheduledEvent{
                fIdx, 10, static_cast<double>(motifMidi), stepDurSec * 6.0, 0.0, 0.68, false, false, rec
            });
        }

        // 10. Riser Hidráulico de Fervura Oceânica antes da escalada G2 -> G5
        if (isPreEscalationRiser) {
            events.push_back(ScheduledEvent{
                plan.startFrame, 7, (60.0 / rec.bpm) * 3.2, 0.0, 0.0, 0.95, true, false, rec
            });
        }
    }

    std::sort(events.begin(), events.end(), [](const ScheduledEvent& a, const ScheduledEvent& b) {
        return a.frame < b.frame;
    });

    // Instancia vozes C++20 e barramentos espaciais
    AnalogKickVoice kick{};
    BassAndRiffVoice bass{};
    FormantBioLeadVoice formantLead{};
    TechnoRumbleProcessor rumble(sampleRate);
    PercussionMatrixVoice perc{};
    ModalRingsResonatorVoice rings{};
    HarmonicWorldVoice world{};
    BodeFrequencyShifter bodeShifter{};
    HydroNoiseGenerator hydroNoise{};
    TptSvf bassHighSendHpf{};
    K35NonlinearFilter sirenK35{};
    ChowTapeDubDelay dubDelay(sampleRate);
    HadamardFdn8Reverb abyssReverb(sampleRate);
    RealtimeWorkletBus rtBus{};
    rtBus.init(static_cast<double>(sampleRate));

    std::vector<double> rawKickMono(totalRenderFrames, 0.0);
    std::vector<double> rawSubMono(totalRenderFrames, 0.0);
    std::vector<double> midHighL(totalRenderFrames, 0.0);
    std::vector<double> midHighR(totalRenderFrames, 0.0);

    size_t evCursor = 0;
    size_t activeBarCursor = 0;
    double kickEnvFollower = 0.0;
    double sirenPhaseF = 0.0;
    double sirenPhaseCb = 0.25;

    for (size_t f = 0; f < totalRenderFrames; ++f) {
        GenreRecipe activeRec = bars[0].recipe;
        int activeLogicalBar = 0;
        if (f >= warmupFrames) {
            const size_t relF = f - warmupFrames;
            while (activeBarCursor + 1 < bars.size() && relF >= bars[activeBarCursor + 1].startFrame) {
                ++activeBarCursor;
            }
            activeRec = bars[activeBarCursor].recipe;
            activeLogicalBar = static_cast<int>(activeBarCursor);
        } else {
            activeRec = bars.back().recipe;
            activeLogicalBar = config.totalBars - 1;
        }
        world.setPadRootMidi(modalRootMidiSub(activeRec.scale), activeRec.scale);

        while (evCursor < events.size() && events[evCursor].frame == f) {
            const auto& ev = events[evCursor];
            switch (ev.type) {
                case 1: kick.trigger(ev.param1, ev.recipe, ev.velocity); break;
                case 2: bass.triggerNote(ev.param1, ev.param2, ev.velocity, ev.flag, ev.recipe, ev.accent); break;
                case 3: perc.triggerHat(false, ev.velocity, false); break;
                case 4: perc.triggerHat(true, ev.velocity, false); break;
                case 5: perc.triggerHat(true, ev.velocity, true); break;
                case 6: perc.triggerIndustrialSnare(ev.velocity); break;
                case 7: perc.triggerPreShiftedSuck(ev.param1, ev.velocity); break;
                case 8: rings.exciteOrganicShell(ev.param1, ev.param2, ev.param3 > 0.0 ? ev.param3 : 0.68, ev.velocity); break;
                case 9: {
                    const int packed = static_cast<int>(ev.param2);
                    const std::array<int, 4> voicing{{
                        static_cast<int>(ev.param1),
                        packed & 0xFF,
                        (packed >> 8) & 0xFF,
                        (packed >> 16) & 0xFF
                    }};
                    const double atkSec = (ev.param3 > 0.0) ? ev.param3 : 0.006;
                    const double durSec = (atkSec > 0.05) ? 2.60 : 0.36;
                    world.triggerDubChord(voicing, durSec, ev.velocity, atkSec);
                    break;
                }
                case 10:
                    world.triggerLeitmotifNote(static_cast<int>(ev.param1), ev.param2, ev.velocity, ev.recipe.zone);
                    break;
                case 11:
                    formantLead.triggerPhraseNote(ev.param1, ev.param2, ev.param3, ev.velocity);
                    break;
                case 12:
                    rings.triggerTransdiegeticSonar(ev.param1, ev.velocity);
                    break;
                default: break;
            }
            ++evCursor;
        }

        const double sr = static_cast<double>(sampleRate);
        const double kSample = kick.renderSample(sr);
        const double absK = std::abs(kSample);
        if (absK > kickEnvFollower) {
            kickEnvFollower = absK;
        } else {
            kickEnvFollower *= std::exp(-1.0 / (0.085 * sr));
        }

        const double bSample = bass.renderSample(kickEnvFollower, sr);
        const double rSample = activeRec.enableTechnoRumble
            ? rumble.process(kSample, kickEnvFollower, activeRec.bpm, sr)
            : 0.0;

        rawKickMono[f] = kSample;
        rawSubMono[f] = bSample + rSample;

        StereoFrame pFrame = perc.renderSample(sr, rng);
        // Em G5 Industrial Hardgroove, desloca linearmente a percussão metálica em +18.0 Hz via BodeFrequencyShifter (Blawan / Stef Mendesidis)!
        if (activeRec.zone == GenreZone::G5_HardgrooveCrisis) {
            pFrame = bodeShifter.process(pFrame, 18.0, 0.44, sr);
        }

        const StereoFrame mFrame = rings.renderSample(sr);
        const StereoFrame wFrame = world.renderChordAndPad(kickEnvFollower, sr);
        const StereoFrame lFrame = world.renderLeitmotif(sr);
        const StereoFrame vFrame = formantLead.renderSample(sr);

        // Textura contínua de Hidrofone Abissal (HydroNoise) em G0, G1 e sutilmente em G4
        StereoFrame hFrame{0.0, 0.0};
        if (activeRec.zone == GenreZone::G0_AbyssalAmbient) {
            hFrame = hydroNoise.renderSample(1150.0, 0.052, sr, rng);
        } else if (activeRec.zone == GenreZone::G1_DubHydroChart) {
            hFrame = hydroNoise.renderSample(1750.0, 0.032, sr, rng);
        } else if (activeRec.zone == GenreZone::G4_AcidDriving) {
            hFrame = hydroNoise.renderSample(1400.0, 0.018, sr, rng);
        }

        // Sirene de Trítono da Fervura Oceânica (F3 174.61 Hz + Cb4 246.94 Hz) no clímax de G5 (compassos 13..15 = índices 12..14)
        StereoFrame sirenFrame{0.0, 0.0};
        if (activeRec.zone == GenreZone::G5_HardgrooveCrisis && config.totalBars >= 16 &&
            activeLogicalBar >= (config.totalBars - 4) && activeLogicalBar < (config.totalBars - 1)) {
            const size_t startClimax = bars[static_cast<size_t>(config.totalBars - 4)].startFrame;
            const size_t endClimax = bars[static_cast<size_t>(config.totalBars - 1)].startFrame;
            const size_t relClimax = (f >= warmupFrames + startClimax) ? (f - warmupFrames - startClimax) : 0U;
            const double span = static_cast<double>(std::max<size_t>(1U, endClimax - startClimax));
            const double prog = std::clamp(static_cast<double>(relClimax) / span, 0.0, 1.0);
            const double fadeOut = (prog > 0.88) ? ((1.0 - prog) / 0.12) : 1.0;
            const double sirenEnv = std::pow(prog, 1.35) * fadeOut;
            const double boilBend = 1.0 + 0.018 * std::sin(kTwoPi * 1.75 * prog * 6.0);
            const double dtF = (174.614 * boilBend) / sr;
            const double dtCb = (246.942 * boilBend) / sr;
            const double sF = 2.0 * sirenPhaseF - 1.0 - polyBlep(sirenPhaseF, dtF);
            const double sCb = 2.0 * sirenPhaseCb - 1.0 - polyBlep(sirenPhaseCb, dtCb);
            sirenPhaseF += dtF; if (sirenPhaseF >= 1.0) sirenPhaseF -= 1.0;
            sirenPhaseCb += dtCb; if (sirenPhaseCb >= 1.0) sirenPhaseCb -= 1.0;
            const double rawTritone = sirenK35.process(0.5 * (sF + sCb), 165.0, 680.0 + 1650.0 * prog, 0.58, 1.85, sr) * sirenEnv * 0.16;
            const double pump = std::clamp(1.0 - 0.70 * kickEnvFollower, 0.25, 1.0);
            sirenFrame = StereoFrame{rawTritone * pump * 0.90, rawTritone * pump * 1.08};
        }

        // Send estéreo dos harmônicos agudos (>250 Hz) do riff K35 (G2) e da TB-303 (G4) para o espaço escuro
        double bassHighSend = 0.0;
        if (activeRec.zone == GenreZone::G2_SlowIndustrial || activeRec.zone == GenreZone::G4_AcidDriving) {
            bassHighSend = bassHighSendHpf.process(bSample, 250.0, 0.707, sr).hp * 0.24;
        }

        // Delay Dub 3/16 nos acordes, anéis orgânicos, formantes, leitmotif e squelch ácido
        const double dotted8thSec = (60.0 / activeRec.bpm) * 0.75;
        const StereoFrame delayBusIn{
            wFrame.left + mFrame.left * 0.58 + lFrame.left * 0.45 + vFrame.left * 0.52 + bassHighSend + sirenFrame.left * 0.40,
            wFrame.right + mFrame.right * 0.58 + lFrame.right * 0.45 + vFrame.right * 0.52 + bassHighSend + sirenFrame.right * 0.40
        };
        const bool deepDub = (activeRec.zone == GenreZone::G1_DubHydroChart || activeRec.zone == GenreZone::G0_AbyssalAmbient);
        const StereoFrame delayed = dubDelay.process(
            delayBusIn,
            dotted8thSec,
            deepDub ? 0.72 : 0.46,
            deepDub ? 0.48 : 0.28,
            sr
        );

        // Gate sincronizado de reverb em G2/G5: corta 90 ms antes de cada nova batida (vácuo hidráulico Gesaffelstein!)
        double reverbGate = 1.0;
        if (activeRec.enableGatedReverb) {
            const double beatSamples = (60.0 / activeRec.bpm) * sr;
            const double posInBeat = std::fmod(static_cast<double>(f), beatSamples);
            const double gateCutStart = std::max(0.0, beatSamples - 0.090 * sr);
            if (posInBeat >= gateCutStart) {
                reverbGate = 0.06;
            }
        }

        const StereoFrame revIn{
            delayed.left + pFrame.left * 0.35 + hFrame.left * 0.65,
            delayed.right + pFrame.right * 0.35 + hFrame.right * 0.65
        };
        const double revDecay = (activeRec.zone == GenreZone::G0_AbyssalAmbient) ? 0.90
            : ((activeRec.zone == GenreZone::G1_DubHydroChart) ? 0.84 : 0.68);
        const double revWet = (activeRec.zone == GenreZone::G0_AbyssalAmbient) ? 0.46
            : ((activeRec.zone == GenreZone::G1_DubHydroChart) ? 0.36 : 0.20);
        const StereoFrame spaceOut = abyssReverb.process(
            revIn,
            revDecay,
            deepDub ? 2350.0 : 3100.0,
            revWet,
            reverbGate,
            sr
        );

        midHighL[f] = spaceOut.left + pFrame.left * 0.75 + vFrame.left * 0.68 + hFrame.left * 0.55 + sirenFrame.left * 0.75;
        midHighR[f] = spaceOut.right + pFrame.right * 0.75 + vFrame.right * 0.68 + hFrame.right * 0.55 + sirenFrame.right * 0.75;
    }

    // Alinhamento automático de fase Kick x Subgrave por correlação cruzada discreta (exceto em G0 onde não há Kick)!
    const bool hasKick = (config.primaryZone != GenreZone::G0_AbyssalAmbient);
    const auto lagRes = hasKick ? findOptimalSubPhaseLagSamples(rawKickMono, rawSubMono, 24) : Result<int>::success(0);
    const std::vector<double> alignedSub = (hasKick && lagRes.ok())
        ? applyCircularSampleShift(rawSubMono, lagRes.value)
        : rawSubMono;

    std::vector<double> fullBusL(totalRenderFrames, 0.0);
    std::vector<double> fullBusR(totalRenderFrames, 0.0);

    for (size_t f = 0; f < totalRenderFrames; ++f) {
        TelemetrySnapshot tele{};
        tele.enemyArchetype = (config.primaryZone == GenreZone::G1_DubHydroChart || config.primaryZone == GenreZone::G0_AbyssalAmbient) ? 0 : 2;
        if (f >= warmupFrames) {
            const size_t i = f - warmupFrames;
            const int currentBar = static_cast<int>((static_cast<double>(i) / static_cast<double>(cursorFrame)) * config.totalBars);
            if (config.simulateHydroDiveBars9To12 && currentBar >= 8 && currentBar < 12) {
                tele.foilState = FoilState::TacticalDive_400Hz;
            } else if (config.simulateHydroDiveBars9To12 && currentBar == 12 && (i % sampleRate) < (sampleRate / 2)) {
                tele.foilState = FoilState::Touchdown_7200Hz;
            } else {
                tele.foilState = FoilState::NoFoil_20kHz;
            }
            if (config.simulateWeaponDucking && (i > sampleRate * 4U) && ((i % (sampleRate * 9U)) == 0U)) {
                tele.weaponSalvoTriggered = true;
            }
            if (config.includeTransdiegeticSonar && ((i % (bars[0].lengthFrames * 2U)) == (bars[0].lengthFrames / 4U))) {
                rtBus.triggerSonarPing(0.68);
            }
        }
        rtBus.pushTelemetry(tele);

        const double monoFoundation = rawKickMono[f] * 0.88 + alignedSub[f] * 0.76;
        const StereoFrame mixedIn{
            monoFoundation + midHighL[f],
            monoFoundation + midHighR[f]
        };
        const StereoFrame busOut = rtBus.processSample(mixedIn);
        fullBusL[f] = busOut.left;
        fullBusR[f] = busOut.right;
    }

    StereoBuffer output{};
    output.resize(cursorFrame, sampleRate);
    for (size_t i = 0; i < cursorFrame; ++i) {
        output.left[i] = fullBusL[warmupFrames + i];
        output.right[i] = fullBusR[warmupFrames + i];
    }

    if (seamlessLoopMode && warmupFrames >= 512 && output.numFrames() >= 512) {
        constexpr size_t kSeamSamples = 256;
        for (size_t s = 0; s < kSeamSamples; ++s) {
            const double alpha = static_cast<double>(s + 1U) / static_cast<double>(kSeamSamples);
            const size_t tailIdx = output.numFrames() - kSeamSamples + s;
            const size_t preIdx = warmupFrames - kSeamSamples + s;
            output.left[tailIdx] = output.left[tailIdx] * (1.0 - alpha) + fullBusL[preIdx] * alpha;
            output.right[tailIdx] = output.right[tailIdx] * (1.0 - alpha) + fullBusR[preIdx] * alpha;
        }
    }
    if (output.numFrames() >= 64U) {
        constexpr size_t kEdgeSamples = 24;
        const size_t n = output.numFrames();
        for (size_t e = 0; e < kEdgeSamples; ++e) {
            const double theta = (0.5 * kPi * static_cast<double>(e)) / static_cast<double>(kEdgeSamples);
            const double fadeGain = std::sin(theta) * std::sin(theta);
            output.left[e] *= fadeGain;
            output.right[e] *= fadeGain;
            output.left[n - 1U - e] *= fadeGain;
            output.right[n - 1U - e] *= fadeGain;
        }
    }

    return Result<StereoBuffer>::success(std::move(output));
}

Result<StereoBuffer> renderTerminalClosedArcOffline(
    bool isVictoryLydian,
    uint64_t seed,
    uint32_t sampleRate
) {
    if (sampleRate < 22050U) {
        return Result<StereoBuffer>::failure(ErrorCode::InvalidSampleRate);
    }

    const double sr = static_cast<double>(sampleRate);
    DeterministicRng rng(seed);

    if (isVictoryLydian) {
        // ============================================================================================================
        // T1 — EPÍLOGO DE VITÓRIA: SUPERFÍCIE SOLAR (EVT_AUD_11 TR_7B_VITORIA_FINAL — 84 BPM, G_LIDIO 49.00 Hz, ~34.3s)
        // Arco Linear Fechado (Sem Loop):
        //   Comp. 1-2 (0.0s..5.7s)  : Emergência F1 (43.65 Hz) -> G1 (49.00 Hz) + abertura ZDF 380 Hz -> 20 kHz
        //   Comp. 3-8 (5.7s..22.9s) : Gmaj7(#11) -> Dadd9/F# -> Em9 -> Cmaj7(#11) (OB-Xd swells + Harpa Lídia #4 C# + Trompa/Formante)
        //   Comp. 9-12 (22.9s..34.3s): Resolução solar Gmaj9(#11) + Fade de horizonte de ~6.8s até 0.000000
        // ============================================================================================================
        constexpr double kBpm = 84.0;
        const double beatSec = 60.0 / kBpm;
        const double barSec = beatSec * 4.0;
        constexpr int kBars = 12;
        const size_t totalFrames = static_cast<size_t>(std::llround(barSec * static_cast<double>(kBars) * sr));

        GenreRecipe lydianDroneRec = getGenreRecipe(GenreZone::G0_AbyssalAmbient);
        lydianDroneRec.bpm = kBpm;
        lydianDroneRec.scale = ModalScale::G_Lydian;

        GenreRecipe gentlePulseRec = getGenreRecipe(GenreZone::G1_DubHydroChart);
        gentlePulseRec.bpm = kBpm;
        gentlePulseRec.scale = ModalScale::G_Lydian;
        gentlePulseRec.kickDecaySec = 0.220;
        gentlePulseRec.kickClickLevel = 0.09;

        AnalogKickVoice warmPulse{};
        BassAndRiffVoice subDrone{};
        HarmonicWorldVoice world{};
        FormantBioLeadVoice bioChoir{};
        ModalRingsResonatorVoice lydianHarp{};
        HydroNoiseGenerator oceanAir{};
        ChowTapeDubDelay dubDelay(sampleRate);
        HadamardFdn8Reverb solarReverb(sampleRate);
        TptSvf emergeLpL{}, emergeLpR{};
        LinkwitzRiley4Stereo monoSub{};

        world.setPadRootMidi(31, ModalScale::G_Lydian);

        struct ArcEv {
            size_t frame = 0;
            uint8_t type = 0; // 1=Sub, 2=ChordSwell, 3=HarpNote, 4=HornMotif, 5=BioChoir, 6=WarmPulse
            double p1 = 0.0;
            double p2 = 0.0;
            double p3 = 0.0;
            double vel = 0.8;
            std::array<int, 4> chord{{55, 59, 62, 66}};
        };
        std::vector<ArcEv> evs;

        auto secToFrame = [&](double tSec) -> size_t {
            return static_cast<size_t>(std::clamp<ptrdiff_t>(
                static_cast<ptrdiff_t>(std::llround(tSec * sr)),
                0,
                static_cast<ptrdiff_t>(totalFrames - 1U)
            ));
        };

        // 1. Emergência Harmônica Subgrave: F1 (29 = Lócrio vencido) na barra 0 -> G1 (31 = Sol Lídio!) na barra 1
        evs.push_back(ArcEv{secToFrame(0.02), 1, midiNoteToHz(29.0), barSec * 1.05, 0.0, 0.82, {}});
        evs.push_back(ArcEv{secToFrame(barSec * 1.0), 1, midiNoteToHz(31.0), barSec * 1.95, 0.0, 0.88, {}});

        const std::array<std::array<int, 4>, 4> kLydianChords{{
            {{55, 59, 62, 66}}, // Gmaj7 (G3, B3, D4, F#4)
            {{54, 57, 62, 64}}, // Dadd9/F# (F#3, A3, D4, E4)
            {{52, 59, 62, 66}}, // Em9 (E3, B3, D4, F#4)
            {{48, 55, 59, 66}}  // Cmaj7(#11) (C3, G3, B3, F#4 — #11 puro!)
        }};
        const std::array<int, 4> kSubRoots{{31, 30, 28, 36}};

        for (int b = 2; b <= 8; ++b) {
            const double tBar = static_cast<double>(b) * barSec;
            const std::array<int, 4> ch = (b == 8)
                ? std::array<int, 4>{{55, 59, 61, 66}} // Gmaj7(#11) final radiante com C#4 (#4 Lídio!)
                : kLydianChords[static_cast<size_t>((b - 2) % 4)];
            const int subMidi = (b == 8) ? 31 : kSubRoots[static_cast<size_t>((b - 2) % 4)];
            const double durFactor = (b == 8) ? 2.6 : 1.05;

            evs.push_back(ArcEv{secToFrame(tBar), 1, midiNoteToHz(static_cast<double>(subMidi)), barSec * durFactor, 0.0, 0.86, {}});
            evs.push_back(ArcEv{secToFrame(tBar + 0.05), 2, barSec * durFactor, 0.38, 0.0, (b == 8) ? 0.88 : 0.78, ch});

            if (b < 8) {
                evs.push_back(ArcEv{secToFrame(tBar), 6, midiNoteToHz(static_cast<double>(subMidi)), 0.0, 0.0, 0.56, {}});
            }

            constexpr std::array<int, 8> kLydianArpMidi{{67, 69, 71, 73, 74, 78, 79, 73}}; // 73 = C#5 (#4 Lídio!)
            for (int step = 0; step < 8; ++step) {
                if (b == 8 && step > 4) break;
                const double tNote = tBar + static_cast<double>(step) * (beatSec * 0.5);
                const int arpMidi = kLydianArpMidi[static_cast<size_t>((step + b) % 8)];
                evs.push_back(ArcEv{secToFrame(tNote), 3, midiNoteToHz(static_cast<double>(arpMidi)), 0.78, 0.88, 0.54, {}});
            }
        }

        // Leitmotif Ascendente Invertido da Vitória (G3 -> B3 -> C#4 -> D4 -> F#4 -> G4)
        constexpr std::array<int, 6> kVictoryMelody{{55, 59, 61, 62, 66, 67}};
        const std::array<double, 6> kMelodyStartBars{{2.25, 3.25, 4.25, 5.25, 6.50, 8.05}};
        const std::array<double, 6> kMelodyDurBars{{0.85, 0.85, 0.85, 1.10, 1.35, 2.30}};
        for (size_t m = 0; m < 6; ++m) {
            const double tStart = kMelodyStartBars[m] * barSec;
            const double dur = kMelodyDurBars[m] * barSec;
            evs.push_back(ArcEv{secToFrame(tStart), 4, static_cast<double>(kVictoryMelody[m]), dur, 0.0, 0.80, {}});
            evs.push_back(ArcEv{secToFrame(tStart + 0.08), 5, midiNoteToHz(static_cast<double>(kVictoryMelody[m] + 12)), dur * 0.92, 0.55 + 0.07 * static_cast<double>(m), 0.62, {}});
        }

        std::sort(evs.begin(), evs.end(), [](const ArcEv& a, const ArcEv& b) { return a.frame < b.frame; });

        StereoBuffer out{};
        out.resize(totalFrames, sampleRate);
        size_t cur = 0;

        for (size_t f = 0; f < totalFrames; ++f) {
            while (cur < evs.size() && evs[cur].frame == f) {
                const auto& e = evs[cur];
                switch (e.type) {
                    case 1: subDrone.triggerNote(e.p1, e.p2, e.vel, true, lydianDroneRec, false); break;
                    case 2: world.triggerDubChord(e.chord, e.p1, e.vel, e.p2); break;
                    case 3: lydianHarp.exciteOrganicShell(e.p1, e.p2, e.p3, e.vel); break;
                    case 4: world.triggerLeitmotifNote(static_cast<int>(e.p1), e.p2, e.vel, GenreZone::G3_BioMysticGroove); break;
                    case 5: bioChoir.triggerPhraseNote(e.p1, e.p2, e.p3, e.vel); break;
                    case 6: warmPulse.trigger(e.p1, gentlePulseRec, e.vel); break;
                    default: break;
                }
                ++cur;
            }

            const double tSec = static_cast<double>(f) / sr;
            const double kS = warmPulse.renderSample(sr);
            const double subS = subDrone.renderSample(std::abs(kS) * 0.5, sr);
            const StereoFrame padCh = world.renderChordAndPad(std::abs(kS) * 0.35, sr);
            const StereoFrame horn = world.renderLeitmotif(sr);
            const StereoFrame choir = bioChoir.renderSample(sr);
            const StereoFrame harp = lydianHarp.renderSample(sr);
            const StereoFrame breeze = oceanAir.renderSample(2400.0, 0.020, sr, rng);

            const StereoFrame delIn{
                padCh.left + harp.left * 0.68 + horn.left * 0.50 + choir.left * 0.48,
                padCh.right + harp.right * 0.68 + horn.right * 0.50 + choir.right * 0.48
            };
            const StereoFrame delOut = dubDelay.process(delIn, beatSec * 0.75, 0.56, 0.38, sr);
            const StereoFrame revOut = solarReverb.process(
                StereoFrame{delOut.left + breeze.left * 0.5, delOut.right + breeze.right * 0.5},
                0.90, 4200.0, 0.44, 1.0, sr
            );

            const double emergeProg = std::clamp(tSec / 6.2, 0.0, 1.0);
            const double emergeCutoff = 380.0 * std::pow(20000.0 / 380.0, emergeProg);

            double mixL = kS * 0.62 + subS * 0.78 + revOut.left + horn.left * 0.55 + choir.left * 0.45 + breeze.left * 0.30;
            double mixR = kS * 0.62 + subS * 0.78 + revOut.right + horn.right * 0.55 + choir.right * 0.45 + breeze.right * 0.30;

            if (emergeCutoff < 19500.0) {
                mixL = emergeLpL.process(mixL, emergeCutoff, 0.82, sr).lp;
                mixR = emergeLpR.process(mixR, emergeCutoff, 0.82, sr).lp;
            }

            double masterEnv = std::min(1.0, tSec / 0.080);
            const double totalDurSec = static_cast<double>(totalFrames) / sr;
            constexpr double kFadeOutSec = 6.8;
            if (tSec > totalDurSec - kFadeOutSec) {
                const double rem = std::clamp((totalDurSec - tSec) / kFadeOutSec, 0.0, 1.0);
                masterEnv *= (rem * rem) * (3.0 - 2.0 * rem);
            }

            const StereoFrame finalFrame = monoSub.processMonoSubCrossover(StereoFrame{mixL * masterEnv, mixR * masterEnv}, 140.0, sr);
            out.left[f] = finalFrame.left;
            out.right[f] = finalFrame.right;
        }
        out.left.front() = 0.0; out.right.front() = 0.0;
        out.left.back() = 0.0;  out.right.back() = 0.0;
        return Result<StereoBuffer>::success(std::move(out));
    }

    // ============================================================================================================
    // T2 — ELEGIA DE PERMADEATH: AFUNDAMENTO ABISSAL (EVT_AUD_11 TR_7A/7C — 54 -> 0 BPM, F_FRIGIO 43.65 Hz, 32.0s)
    // ============================================================================================================
    constexpr double kTotalSec = 32.0;
    const size_t totalFrames = static_cast<size_t>(std::llround(kTotalSec * sr));

    GenreRecipe phrygianDroneRec = getGenreRecipe(GenreZone::G0_AbyssalAmbient);
    phrygianDroneRec.bpm = 54.0;
    phrygianDroneRec.scale = ModalScale::F_Phrygian;

    BassAndRiffVoice subDrone{};
    HarmonicWorldVoice world{};
    HydroNoiseGenerator trenchPressure{};
    ChowTapeDubDelay tapeDisintegrator(sampleRate);
    HadamardFdn8Reverb abyssReverb(sampleRate);
    TptSvf sinkLpL{}, sinkLpR{};
    LinkwitzRiley4Stereo monoSub{};

    world.setPadRootMidi(29, ModalScale::F_Phrygian);

    constexpr std::array<double, 7> kBesselRatios{{0.500, 1.000, 2.081, 3.414, 3.893, 5.136, 6.723}};
    constexpr std::array<double, 7> kBesselDecays{{5.8,   4.9,   3.4,   2.5,   2.1,   1.4,   0.95}};
    constexpr std::array<double, 7> kBesselGains {{0.42,  0.50,  0.30,  0.20,  0.15,  0.09,  0.05}};
    std::array<double, 7> bellPhases{{0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6}};
    double bellTime = 100.0;
    double bellAmp = 0.0;
    const std::array<double, 3> kBellStrikesSec{{0.35, 7.20, 14.80}};
    size_t nextBellIdx = 0;

    // Batimentos cardíacos desacelerando (56 -> 32 BPM), PULANDO 1 batida aos ~12.4s e parando (0 BPM) após 17.95s!
    const std::array<double, 9> kHeartBeatsSec{{0.85, 2.00, 3.30, 4.75, 6.38, 8.20, 10.22, 14.82, 17.95}};
    size_t nextHeartIdx = 0;
    double heartTime = 100.0;
    double heartVel = 0.0;
    double heartPhase = 0.0;

    struct MotifNote { double tSec; int midi; double durSec; double vel; };
    const std::array<MotifNote, 8> kDisintegrationNotes{{
        {1.40,  53, 2.1, 0.78},
        {3.70,  54, 2.2, 0.82}, // Gb3 (b2 Frígio!)
        {6.10,  60, 2.3, 0.74},
        {8.60,  53, 2.6, 0.70},
        {12.60, 53, 2.5, 0.60},
        {15.40, 54, 2.7, 0.56},
        {18.40, 60, 2.9, 0.48},
        {21.50, 53, 4.2, 0.42}
    }};
    size_t nextMotifIdx = 0;

    StereoBuffer out{};
    out.resize(totalFrames, sampleRate);

    for (size_t f = 0; f < totalFrames; ++f) {
        const double tSec = static_cast<double>(f) / sr;

        if (f == 800U || f == static_cast<size_t>(8.0 * sr) || f == static_cast<size_t>(16.0 * sr)) {
            subDrone.triggerNote(midiNoteToHz(29.0), 8.5, 0.78, true, phrygianDroneRec, false);
            world.triggerDubChord({{53, 56, 60, 61}}, 6.5, 0.52, 0.85);
        }

        if (nextBellIdx < kBellStrikesSec.size() && tSec >= kBellStrikesSec[nextBellIdx]) {
            bellTime = 0.0;
            bellAmp = (nextBellIdx == 2) ? 0.58 : 0.72;
            ++nextBellIdx;
        }
        if (nextHeartIdx < kHeartBeatsSec.size() && tSec >= kHeartBeatsSec[nextHeartIdx]) {
            heartTime = 0.0;
            heartVel = (nextHeartIdx >= 7) ? 0.56 : 0.84;
            heartPhase = 0.0;
            ++nextHeartIdx;
        }
        if (nextMotifIdx < kDisintegrationNotes.size() && tSec >= kDisintegrationNotes[nextMotifIdx].tSec) {
            const auto& mn = kDisintegrationNotes[nextMotifIdx];
            world.triggerLeitmotifNote(mn.midi, mn.durSec, mn.vel, GenreZone::G1_DubHydroChart);
            ++nextMotifIdx;
        }

        double bellL = 0.0;
        double bellR = 0.0;
        if (bellTime < 9.0) {
            const double atk = std::min(1.0, bellTime / 0.005);
            constexpr double kBellBaseHz = 87.307; // F2
            for (size_t m = 0; m < 7; ++m) {
                const double freq = kBellBaseHz * kBesselRatios[m];
                bellPhases[m] += kTwoPi * freq / sr;
                if (bellPhases[m] > kTwoPi) bellPhases[m] -= kTwoPi;
                const double modeSig = std::sin(bellPhases[m]) * std::exp(-bellTime / kBesselDecays[m]) * kBesselGains[m] * atk * bellAmp * 0.34;
                if ((m & 1U) == 0U) { bellL += modeSig; bellR += modeSig * 0.65; }
                else                { bellR += modeSig; bellL += modeSig * 0.65; }
            }
            bellTime += 1.0 / sr;
        }

        double heartMono = 0.0;
        if (heartTime < 0.65) {
            if (heartTime < 0.22) {
                const double fLub = 41.0 + 36.0 * std::exp(-heartTime * 38.0);
                heartPhase += kTwoPi * fLub / sr;
                const double envLub = std::sin(kPi * std::min(1.0, heartTime / 0.016)) * std::exp(-heartTime * 16.5);
                heartMono += std::tanh(std::sin(heartPhase) * 1.45) * envLub * heartVel * 0.68;
            }
            if (heartTime >= 0.245) {
                const double dtDub = heartTime - 0.245;
                const double fDub = 43.65 + 44.0 * std::exp(-dtDub * 44.0);
                heartPhase += kTwoPi * fDub / sr;
                const double envDub = std::sin(kPi * std::min(1.0, dtDub / 0.014)) * std::exp(-dtDub * 19.5);
                heartMono += std::tanh(std::sin(heartPhase) * 1.35) * envDub * heartVel * 0.50;
            }
            heartTime += 1.0 / sr;
        }

        const double subS = subDrone.renderSample(std::abs(heartMono) * 0.4, sr);
        const StereoFrame padS = world.renderChordAndPad(0.0, sr);
        const StereoFrame celloMotif = world.renderLeitmotif(sr);
        const StereoFrame pressure = trenchPressure.renderSample(920.0, 0.042, sr, rng);

        const StereoFrame tapeIn{
            celloMotif.left * 0.85 + bellL * 0.72 + padS.left * 0.75,
            celloMotif.right * 0.85 + bellR * 0.72 + padS.right * 0.75
        };
        const StereoFrame tapeOut = tapeDisintegrator.process(tapeIn, 1.11, 0.80, 0.56, sr);
        const StereoFrame abyssOut = abyssReverb.process(
            StereoFrame{tapeOut.left + pressure.left * 0.6, tapeOut.right + pressure.right * 0.6},
            0.91, 1950.0, 0.48, 1.0, sr
        );

        // Afundamento Abissal Exponencial do Filtro ZDF: 12.000 Hz (t=0s) -> 180 Hz (t=32s)!
        const double sinkProg = std::clamp(tSec / kTotalSec, 0.0, 1.0);
        const double sinkCutoffHz = 12000.0 * std::pow(180.0 / 12000.0, sinkProg);

        double mixL = heartMono + subS * 0.72 + bellL * 0.65 + celloMotif.left * 0.45 + abyssOut.left + pressure.left * 0.35;
        double mixR = heartMono + subS * 0.72 + bellR * 0.65 + celloMotif.right * 0.45 + abyssOut.right + pressure.right * 0.35;

        mixL = sinkLpL.process(mixL, sinkCutoffHz, 0.92, sr).lp;
        mixR = sinkLpR.process(mixR, sinkCutoffHz, 0.92, sr).lp;

        double masterEnv = std::min(1.0, tSec / 0.060);
        constexpr double kFadeOutSec = 5.8;
        if (tSec > kTotalSec - kFadeOutSec) {
            const double rem = std::clamp((kTotalSec - tSec) / kFadeOutSec, 0.0, 1.0);
            masterEnv *= (rem * rem) * (3.0 - 2.0 * rem);
        }

        const StereoFrame finalFrame = monoSub.processMonoSubCrossover(StereoFrame{mixL * masterEnv, mixR * masterEnv}, 140.0, sr);
        out.left[f] = finalFrame.left;
        out.right[f] = finalFrame.right;
    }

    out.left.front() = 0.0; out.right.front() = 0.0;
    out.left.back() = 0.0;  out.right.back() = 0.0;
    return Result<StereoBuffer>::success(std::move(out));
}

} // namespace biofoil::audio
