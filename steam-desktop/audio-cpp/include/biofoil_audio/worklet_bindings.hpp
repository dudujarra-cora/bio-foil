#pragma once

#include <cstddef>
#include <cstdint>

extern "C" {

void biofoil_rt_init(double sampleRate) noexcept;

void biofoil_rt_push_telemetry(
    float hullIntegrityPct,
    float floodedWaterKg,
    float cavitationMarginKg,
    uint8_t foilState,
    uint8_t enemyArchetype,
    uint8_t bossPhase,
    uint8_t oceanBoilWarning,
    uint8_t weaponSalvoTriggered
) noexcept;

void biofoil_rt_set_spool_progress(float progress01) noexcept;

void biofoil_rt_set_preferences(
    uint8_t dynamicProfile,
    uint8_t monoOut,
    uint8_t antiTinnitus
) noexcept;

void biofoil_rt_trigger_sonar(float intensity01) noexcept;

void biofoil_rt_process_interleaved(
    const float* inInterleavedLR,
    float* outInterleavedLR,
    size_t numFrames
) noexcept;

void biofoil_rt_process_scratch_block(uint32_t numFrames) noexcept;
float* biofoil_rt_get_input_ptr() noexcept;
float* biofoil_rt_get_output_ptr() noexcept;
uint32_t biofoil_rt_get_max_block_frames() noexcept;

uint8_t biofoil_rt_get_active_zone() noexcept;
double biofoil_rt_get_hydro_cutoff_hz() noexcept;
double biofoil_rt_get_bus_cutoff_hz(uint8_t busIndex) noexcept;
double biofoil_rt_get_ducking_db() noexcept;

} // extern "C"
