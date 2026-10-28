#include "biofoil_audio/procedural_brain.hpp"
#include <algorithm>
#include <cmath>
#include <cstdlib>

namespace biofoil::audio {

Result<uint16_t> computeBjorklundMask(int pulses, int steps, int rotation) noexcept {
    if (steps < 1 || steps > 16 || pulses < 0 || pulses > steps) {
        return Result<uint16_t>::failure(ErrorCode::InvalidParameter);
    }
    if (pulses == 0) {
        return Result<uint16_t>::success(0U);
    }
    uint16_t raw = 0U;
    for (int i = 0; i < steps; ++i) {
        if (((i * pulses) % steps) < pulses) {
            const int rotated = ((i + rotation) % steps + steps) % steps;
            raw = static_cast<uint16_t>(raw | static_cast<uint16_t>(1U << rotated));
        }
    }
    return Result<uint16_t>::success(raw);
}

LockedShiftRegister::LockedShiftRegister(uint64_t seed) noexcept {
    DeterministicRng initRng(seed);
    constexpr std::array<int8_t, 7> kDegrees{{0, 0, 1, 3, 4, 5, 1}};
    for (size_t i = 0; i < 16; ++i) {
        const size_t pick = static_cast<size_t>(initRng.nextU64() % kDegrees.size());
        steps_[i].scaleDegreeOffset = kDegrees[pick];
        steps_[i].velocity = 0.68 + 0.30 * initRng.nextUniform01();
    }
    steps_[0] = ShiftStep{0, 0.95};
}

void LockedShiftRegister::advanceBar(int barIndex, DeterministicRng& rng) noexcept {
    if (barIndex < 0) {
        return;
    }
    // Compassos 0, 1, 2 da quadra: p = 0.00 (100% trancado para hipnose de groove)
    const int barInQuad = barIndex % 4;
    const bool isMacroEvolution = (barIndex > 0) && ((barIndex % 16) == 0);
    double entropy = 0.0;
    size_t startStep = 10;

    if (isMacroEvolution) {
        entropy = 0.35;
        startStep = 2;
    } else if (barInQuad == 3) {
        entropy = 0.18;
        startStep = 10;
    } else {
        return;
    }

    constexpr std::array<int8_t, 6> kDarkDegrees{{0, 1, 3, 4, 5, 0}};
    for (size_t s = startStep; s < 16; ++s) {
        if (rng.nextUniform01() < entropy) {
            const size_t idx = static_cast<size_t>(rng.nextU64() % kDarkDegrees.size());
            steps_[s].scaleDegreeOffset = kDarkDegrees[idx];
            steps_[s].velocity = std::clamp(0.62 + 0.36 * rng.nextUniform01(), 0.50, 1.0);
        }
    }
}

PhraseVariant BarAwareMarkov2::nextVariant(
    PhraseVariant prev2,
    PhraseVariant prev1,
    int barInEightBarPhrase,
    DeterministicRng& rng
) noexcept {
    const int b = ((barInEightBarPhrase % 8) + 8) % 8;

    // Compasso 8 (índice 7): obrigatoriamente Fill + Corte de Subgrave (alinha com recarga tática de 9-14s)
    if (b == 7) {
        return PhraseVariant::D1_TacticalReloadFill;
    }
    // Compasso 1 após o Fill: resolve sempre de volta ao Pocket sólido
    if (b == 0 || prev1 == PhraseVariant::D1_TacticalReloadFill) {
        return PhraseVariant::A1_Pocket;
    }
    // Compasso 4 (índice 3): pergunta/resposta sincopada
    if (b == 3) {
        return (rng.nextUniform01() < 0.72) ? PhraseVariant::B1_SyncopatedCall : PhraseVariant::C1_FilterTension;
    }
    // Compasso 7 (índice 6): pré-tensão de filtro preparando o Fill
    if (b == 6) {
        return (rng.nextUniform01() < 0.65) ? PhraseVariant::C1_FilterTension : PhraseVariant::A2_PocketGhost;
    }
    // Evita repetir 3 vezes seguidas a mesma variante secundária
    if (prev2 == PhraseVariant::A2_PocketGhost && prev1 == PhraseVariant::A2_PocketGhost) {
        return PhraseVariant::A1_Pocket;
    }
    return (rng.nextUniform01() < 0.68) ? PhraseVariant::A1_Pocket : PhraseVariant::A2_PocketGhost;
}

uint16_t modalScaleBitmask(ModalScale scale) noexcept {
    // Bit i representa semitom (0..11) relativo à tônica da escala:
    switch (scale) {
        case ModalScale::G_Dorian:
            // 0, 2, 3, 5, 7, 9, 10 (1, 2, b3, 4, 5, 6, b7)
            return static_cast<uint16_t>((1U << 0) | (1U << 2) | (1U << 3) | (1U << 5) | (1U << 7) | (1U << 9) | (1U << 10));
        case ModalScale::Fs_Phrygian:
        case ModalScale::F_Phrygian:
            // 0, 1, 3, 5, 7, 8, 10 (1, b2, b3, 4, 5, b6, b7)
            return static_cast<uint16_t>((1U << 0) | (1U << 1) | (1U << 3) | (1U << 5) | (1U << 7) | (1U << 8) | (1U << 10));
        case ModalScale::F_Locrian:
            // 0, 1, 3, 5, 6, 8, 10 (1, b2, b3, 4, b5, b6, b7)
            return static_cast<uint16_t>((1U << 0) | (1U << 1) | (1U << 3) | (1U << 5) | (1U << 6) | (1U << 8) | (1U << 10));
        case ModalScale::G_Lydian:
            // 0, 2, 4, 6, 7, 9, 11 (1, 2, 3, #4, 5, 6, 7)
            return static_cast<uint16_t>((1U << 0) | (1U << 2) | (1U << 4) | (1U << 6) | (1U << 7) | (1U << 9) | (1U << 11));
    }
    return 0U;
}

int modalRootMidiSub(ModalScale scale) noexcept {
    switch (scale) {
        case ModalScale::G_Dorian:    return 31; // G1  = 49.00 Hz
        case ModalScale::Fs_Phrygian: return 30; // F#1 = 46.25 Hz
        case ModalScale::F_Locrian:   return 29; // F1  = 43.65 Hz
        case ModalScale::G_Lydian:    return 31; // G1  = 49.00 Hz
        case ModalScale::F_Phrygian:  return 29; // F1  = 43.65 Hz
    }
    return 31;
}

Result<int> quantizeMidiToScale(int midiNote, ModalScale scale) noexcept {
    if (midiNote < 0 || midiNote > 127) {
        return Result<int>::failure(ErrorCode::InvalidParameter);
    }
    const uint16_t mask = modalScaleBitmask(scale);
    if (mask == 0U) {
        return Result<int>::failure(ErrorCode::InvalidScaleMask);
    }
    const int rootPc = modalRootMidiSub(scale) % 12;

    int bestNote = midiNote;
    int bestDist = 999;
    for (int offset = 0; offset <= 6; ++offset) {
        for (int sign : {-1, +1}) {
            const int cand = midiNote + sign * offset;
            if (cand < 0 || cand > 127) {
                continue;
            }
            const int relPc = ((cand - rootPc) % 12 + 12) % 12;
            if ((mask & (1U << relPc)) != 0U) {
                const int dist = std::abs(cand - midiNote);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestNote = cand;
                }
            }
        }
        if (bestDist == 0) {
            break;
        }
    }
    return Result<int>::success(bestNote);
}

std::array<int, 4> solveMinimalVoiceLeading(
    const std::array<int, 4>& previousVoicingMidi,
    const std::array<int, 4>& targetPitchClasses
) noexcept {
    // Gera candidatos MIDI na região média-escura [48..79] para cada classe de altura e minimiza custo L1 sem cruzamento
    std::array<std::vector<int>, 4> cands{};
    for (size_t v = 0; v < 4; ++v) {
        const int pc = ((targetPitchClasses[v] % 12) + 12) % 12;
        for (int midi = 46; midi <= 81; ++midi) {
            if ((midi % 12) == pc) {
                cands[v].push_back(midi);
            }
        }
    }

    // Permuta as 4 classes de altura para permitir qualquer inversão do acorde
    std::array<int, 4> perm{{0, 1, 2, 3}};
    std::array<int, 4> bestVoicing = previousVoicingMidi;
    int bestCost = 999999;

    do {
        const auto& c0 = cands[static_cast<size_t>(perm[0])];
        const auto& c1 = cands[static_cast<size_t>(perm[1])];
        const auto& c2 = cands[static_cast<size_t>(perm[2])];
        const auto& c3 = cands[static_cast<size_t>(perm[3])];

        for (int n0 : c0) {
            for (int n1 : c1) {
                if (n1 <= n0) continue;
                for (int n2 : c2) {
                    if (n2 <= n1) continue;
                    for (int n3 : c3) {
                        if (n3 <= n2 || (n3 - n0) > 22) continue;
                        const int cost =
                            std::abs(n0 - previousVoicingMidi[0]) +
                            std::abs(n1 - previousVoicingMidi[1]) +
                            std::abs(n2 - previousVoicingMidi[2]) +
                            std::abs(n3 - previousVoicingMidi[3]);
                        if (cost < bestCost) {
                            bestCost = cost;
                            bestVoicing = {{n0, n1, n2, n3}};
                        }
                    }
                }
            }
        }
    } while (std::next_permutation(perm.begin(), perm.end()));

    return bestVoicing;
}

Result<int64_t> computeStepSampleOffset(
    int barIndex,
    int stepInBar16,
    double bpm,
    double swingRatio,
    double pocketOffsetMs,
    double jitterStdMs,
    bool isKick,
    double sampleRate,
    DeterministicRng& rng
) noexcept {
    if (barIndex < 0 || stepInBar16 < 0 || stepInBar16 >= 16 || bpm < 40.0 || bpm > 240.0 || sampleRate < 8000.0) {
        return Result<int64_t>::failure(ErrorCode::InvalidParameter);
    }
    const double clampedSwing = std::clamp(swingRatio, 0.50, 0.66);
    const double samplesPer16th = (60.0 / (bpm * 4.0)) * sampleRate;
    const double globalStep = static_cast<double>(barIndex * 16 + stepInBar16);

    // Semicolcheias ímpares recebem o atraso de Swing (sigma in [0.55, 0.58])
    const double swingShift = ((stepInBar16 & 1) != 0) ? ((2.0 * clampedSwing - 1.0) * samplesPer16th) : 0.0;

    // Trava absoluta: Kick NUNCA sofre pocket offset nem jitter aleatório
    const double pocketSamples = isKick ? 0.0 : (pocketOffsetMs * 0.001 * sampleRate);
    const double jitterSamples = isKick ? 0.0 : (rng.nextGaussian() * std::max(0.0, jitterStdMs) * 0.001 * sampleRate);

    const double exactSample = globalStep * samplesPer16th + swingShift + pocketSamples + jitterSamples;
    return Result<int64_t>::success(std::max<int64_t>(0, static_cast<int64_t>(std::llround(exactSample))));
}

void MusicalDirector::reset(GenreZone initialZone) noexcept {
    activeZone_ = initialZone;
    smoothedTension_ = 0.15;
    barsHeld_ = 0;
}

double MusicalDirector::computeInstantTension(const TelemetrySnapshot& t) noexcept {
    if (t.enemyArchetype == 0) {
        return 0.12;
    }
    double score = 0.35;
    if (t.enemyArchetype == 1) score = 0.44; // Barco Corporativo
    if (t.enemyArchetype == 2) score = 0.58; // Monstro Bio
    if (t.enemyArchetype == 3) {             // Chefe Draga
        score = (t.bossPhase >= 3) ? 0.96 : 0.74;
    }

    const double hullDamage = 1.0 - std::clamp(static_cast<double>(t.hullIntegrityPct), 0.0, 1.0);
    score += 0.32 * hullDamage;

    if (t.hullIntegrityPct < 0.25f || t.cavitationMarginKg < 62.5f || t.oceanBoilWarning) {
        score = std::max(score, 0.92);
    }
    if (t.floodedWaterKg > 30.0f) {
        score += std::min(0.15, static_cast<double>(t.floodedWaterKg) * 0.0015);
    }
    return std::clamp(score, 0.0, 1.0);
}

GenreZone MusicalDirector::updateOnBarBoundary(
    const TelemetrySnapshot& telemetry,
    double barDurationSeconds
) noexcept {
    const double raw = computeInstantTension(telemetry);
    // Envelope assimétrico: ataque rápido (tau = 1.2s), relaxamento lento (tau = 9.0s)
    const double tau = (raw > smoothedTension_) ? 1.2 : 9.0;
    const double alpha = 1.0 - std::exp(-std::max(0.1, barDurationSeconds) / tau);
    smoothedTension_ += alpha * (raw - smoothedTension_);
    ++barsHeld_;

    // Crise imediata na virada de barra se Fase 3 da Draga ou Quase-Morte (<25% casco) com tensão > 0.82
    if ((telemetry.bossPhase >= 3 || telemetry.hullIntegrityPct < 0.25f) && smoothedTension_ >= 0.78) {
        if (activeZone_ != GenreZone::G5_HardgrooveCrisis) {
            activeZone_ = GenreZone::G5_HardgrooveCrisis;
            barsHeld_ = 0;
        }
        return activeZone_;
    }

    // Limiares superiores de entrada vs. limiares inferiores de saída com Histerese de Schmitt (-0.08)
    constexpr double kSchmittMargin = 0.08;
    auto entryThreshold = [](GenreZone z) noexcept -> double {
        switch (z) {
            case GenreZone::G5_HardgrooveCrisis: return 0.86;
            case GenreZone::G4_AcidDriving:      return 0.68;
            case GenreZone::G3_BioMysticGroove:  return 0.46;
            case GenreZone::G2_SlowIndustrial:   return 0.36;
            case GenreZone::G1_DubHydroChart:    return 0.10;
            case GenreZone::G0_AbyssalAmbient:   return 0.00;
        }
        return 0.10;
    };

    GenreZone desiredUp = activeZone_;
    if (smoothedTension_ >= entryThreshold(GenreZone::G5_HardgrooveCrisis)) {
        desiredUp = GenreZone::G5_HardgrooveCrisis;
    } else if (smoothedTension_ >= entryThreshold(GenreZone::G4_AcidDriving)) {
        desiredUp = GenreZone::G4_AcidDriving;
    } else if (telemetry.enemyArchetype == 2 && smoothedTension_ >= entryThreshold(GenreZone::G3_BioMysticGroove)) {
        desiredUp = GenreZone::G3_BioMysticGroove;
    } else if (telemetry.enemyArchetype == 1 && smoothedTension_ >= entryThreshold(GenreZone::G2_SlowIndustrial)) {
        desiredUp = GenreZone::G2_SlowIndustrial;
    }

    if (static_cast<uint8_t>(desiredUp) > static_cast<uint8_t>(activeZone_)) {
        activeZone_ = desiredUp;
        barsHeld_ = 0;
        return activeZone_;
    }

    // Descida: exige tanques de Schmitt (smoothedTension_ < entryThreshold(activeZone_) - 0.08) E trava mínima de 8 compassos!
    const double exitThreshold = entryThreshold(activeZone_) - kSchmittMargin;
    if (static_cast<uint8_t>(activeZone_) > static_cast<uint8_t>(GenreZone::G1_DubHydroChart) &&
        smoothedTension_ < exitThreshold &&
        barsHeld_ >= 8) {
        if (telemetry.enemyArchetype == 0 && smoothedTension_ < 0.28) {
            activeZone_ = GenreZone::G1_DubHydroChart;
        } else if (telemetry.enemyArchetype == 2 && smoothedTension_ >= 0.38) {
            activeZone_ = GenreZone::G3_BioMysticGroove;
        } else if (telemetry.enemyArchetype == 1 && smoothedTension_ >= 0.28) {
            activeZone_ = GenreZone::G2_SlowIndustrial;
        } else {
            activeZone_ = GenreZone::G1_DubHydroChart;
        }
        barsHeld_ = 0;
    }
    return activeZone_;
}

} // namespace biofoil::audio
