#pragma once

#include "biofoil_audio/types.hpp"
#include <string>

namespace biofoil::audio {

// Medidor oficial ITU-R BS.1770-5 (K-Weighting + Gating absoluto -70 LUFS e relativo -10 LU)
[[nodiscard]] Result<double> measureIntegratedLufsBs1770(const StereoBuffer& buffer) noexcept;

// Medidor True-Peak Inter-Sample (ISP 4x Oversampling) em dBTP
[[nodiscard]] Result<double> measureTruePeakDbtp(const StereoBuffer& buffer) noexcept;

// Correlação de Fase de Pearson abaixo de 140 Hz (verifica compatibilidade Mono do Subgrave)
[[nodiscard]] Result<double> measureSubMonoCorrelation(const StereoBuffer& buffer) noexcept;

// Auditoria acústica completa de um buffer estéreo
[[nodiscard]] Result<AudioMetrics> analyzeAudioMetrics(const StereoBuffer& buffer) noexcept;

// Limiter Brickwall Lookahead (1.5 ms) com teto True-Peak 4x ISP
[[nodiscard]] Result<StereoBuffer> applyTruePeakBrickwallLimiter(
    const StereoBuffer& input,
    double preGainDb,
    double ceilingDbtp = -1.05
);

// Masterização em Malha Fechada: converge Loudness Integrada para targetLufs (±0.05 LU) respeitando ceilingDbtp
[[nodiscard]] Result<StereoBuffer> masterTrackClosedLoopBs1770(
    const StereoBuffer& rawMix,
    double targetLufs = -16.00,
    double ceilingDbtp = -1.02
);

// Exportador RIFF WAV 24-bit PCM Linear (48 kHz estéreo, zero dependências externas)
[[nodiscard]] Result<size_t> writeWav24BitFile(
    const std::string& filePath,
    const StereoBuffer& buffer
);

} // namespace biofoil::audio
