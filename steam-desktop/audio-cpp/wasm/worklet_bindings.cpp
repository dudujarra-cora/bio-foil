#include "biofoil_audio/worklet_bindings.hpp"
#include "biofoil_audio/voices_and_genres.hpp"
#include <algorithm>

namespace {
constexpr uint32_t kMaxWorkletFrames = 1024U;

// Instância estática e buffers lineares pré-alocados para o AudioWorkletProcessor / WASM (zero malloc em runtime)
biofoil::audio::RealtimeWorkletBus g_workletBus{};
alignas(16) float g_inputScratch[kMaxWorkletFrames * 2U]{};
alignas(16) float g_outputScratch[kMaxWorkletFrames * 2U]{};
} // namespace

extern "C" {

void biofoil_rt_init(double sampleRate) noexcept {
    g_workletBus.init(sampleRate);
    std::fill(std::begin(g_inputScratch), std::end(g_inputScratch), 0.0f);
    std::fill(std::begin(g_outputScratch), std::end(g_outputScratch), 0.0f);
}

void biofoil_rt_push_telemetry(
    float hullIntegrityPct,
    float floodedWaterKg,
    float cavitationMarginKg,
    uint8_t foilState,
    uint8_t enemyArchetype,
    uint8_t bossPhase,
    uint8_t oceanBoilWarning,
    uint8_t weaponSalvoTriggered
) noexcept {
    biofoil::audio::TelemetrySnapshot snap{};
    snap.hullIntegrityPct = std::clamp(hullIntegrityPct, 0.0f, 1.0f);
    snap.floodedWaterKg = std::max(0.0f, floodedWaterKg);
    snap.cavitationMarginKg = std::max(0.0f, cavitationMarginKg);
    if (foilState == 5U) {
        snap.foilState = biofoil::audio::FoilState::TacticalPause_900Hz;
    } else if (foilState == 4U) {
        snap.foilState = biofoil::audio::FoilState::SpoolUp_Sweep;
    } else if (foilState == 3U) {
        snap.foilState = biofoil::audio::FoilState::TacticalDive_400Hz;
    } else if (foilState == 2U) {
        snap.foilState = biofoil::audio::FoilState::Touchdown_7200Hz;
    } else {
        snap.foilState = biofoil::audio::FoilState::NoFoil_20kHz;
    }
    snap.enemyArchetype = enemyArchetype;
    snap.bossPhase = bossPhase;
    snap.oceanBoilWarning = (oceanBoilWarning != 0U);
    snap.weaponSalvoTriggered = (weaponSalvoTriggered != 0U);
    g_workletBus.pushTelemetry(snap);
}

void biofoil_rt_set_spool_progress(float progress01) noexcept {
    g_workletBus.setSpoolProgress(static_cast<double>(progress01));
}

void biofoil_rt_set_preferences(
    uint8_t dynamicProfile,
    uint8_t monoOut,
    uint8_t antiTinnitus
) noexcept {
    biofoil::audio::DynamicProfile prof = biofoil::audio::DynamicProfile::Estudio_Minus23Lufs;
    if (dynamicProfile == 1U) {
        prof = biofoil::audio::DynamicProfile::SteamDeck_Minus18Lufs;
    } else if (dynamicProfile == 2U) {
        prof = biofoil::audio::DynamicProfile::Noturno_Minus24Lufs;
    }
    g_workletBus.setAcousticPreferences(prof, monoOut != 0U, antiTinnitus != 0U);
}

void biofoil_rt_trigger_sonar(float intensity01) noexcept {
    g_workletBus.triggerSonarPing(static_cast<double>(intensity01));
}

void biofoil_rt_process_interleaved(
    const float* inInterleavedLR,
    float* outInterleavedLR,
    size_t numFrames
) noexcept {
    g_workletBus.processInterleavedBlock(inInterleavedLR, outInterleavedLR, numFrames);
}

void biofoil_rt_process_scratch_block(uint32_t numFrames) noexcept {
    const size_t clamped = std::min<size_t>(static_cast<size_t>(numFrames), kMaxWorkletFrames);
    g_workletBus.processInterleavedBlock(g_inputScratch, g_outputScratch, clamped);
}

float* biofoil_rt_get_input_ptr() noexcept {
    return g_inputScratch;
}

float* biofoil_rt_get_output_ptr() noexcept {
    return g_outputScratch;
}

uint32_t biofoil_rt_get_max_block_frames() noexcept {
    return kMaxWorkletFrames;
}

uint8_t biofoil_rt_get_active_zone() noexcept {
    return static_cast<uint8_t>(g_workletBus.activeZone());
}

double biofoil_rt_get_hydro_cutoff_hz() noexcept {
    return g_workletBus.currentHydroCutoffHz();
}

double biofoil_rt_get_bus_cutoff_hz(uint8_t busIndex) noexcept {
    return g_workletBus.currentBusCutoffHz(busIndex);
}

double biofoil_rt_get_ducking_db() noexcept {
    return g_workletBus.currentDuckingDb();
}

} // extern "C"
