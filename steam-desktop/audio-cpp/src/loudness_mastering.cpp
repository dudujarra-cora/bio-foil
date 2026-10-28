#include "biofoil_audio/loudness_mastering.hpp"
#include "biofoil_audio/dsp_core.hpp"
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <fstream>
#include <vector>

namespace biofoil::audio {

namespace {
struct BiquadState {
    double b0 = 1.0, b1 = 0.0, b2 = 0.0;
    double a1 = 0.0, a2 = 0.0;
    double z1 = 0.0, z2 = 0.0;

    double process(double x) noexcept {
        const double y = b0 * x + z1;
        z1 = b1 * x - a1 * y + z2;
        z2 = b2 * x - a2 * y;
        return y;
    }
};

// Coeficientes analíticos para K-Weighting ITU-R BS.1770-5 (exatos da Tabela 1/2 a 48 kHz + adaptação bilinear para outra fs)
void makeKWeightingFilters(uint32_t sampleRate, BiquadState& stage1Shelf, BiquadState& stage2Rlb) noexcept {
    if (sampleRate == 48000U) {
        stage1Shelf = BiquadState{
             1.53512485958697, -2.69169618940638,  1.19839281085285,
            -1.69065929318241,  0.73248077421585,  0.0, 0.0
        };
        stage2Rlb = BiquadState{
             1.0, -2.0, 1.0,
            -1.99004745483398,  0.99007225036621,  0.0, 0.0
        };
        return;
    }

    // Parametrização bilinear geral de Brecht De Man (mansr / ITU-R BS.1770) para qualquer fs
    const double fs = static_cast<double>(sampleRate);
    constexpr double f0Shelf = 1681.974450955533;
    constexpr double gShelfDb = 3.999843853973347;
    constexpr double qShelf = 0.7071752369554196;
    const double k1 = std::tan(3.14159265358979323846 * f0Shelf / fs);
    const double vh = std::pow(10.0, gShelfDb / 20.0);
    const double vb = std::pow(vh, 0.4996667741545416);
    const double a0s = 1.0 + k1 / qShelf + k1 * k1;
    stage1Shelf = BiquadState{
        (vh + vb * k1 / qShelf + k1 * k1) / a0s,
        2.0 * (k1 * k1 - vh) / a0s,
        (vh - vb * k1 / qShelf + k1 * k1) / a0s,
        2.0 * (k1 * k1 - 1.0) / a0s,
        (1.0 - k1 / qShelf + k1 * k1) / a0s,
        0.0, 0.0
    };

    constexpr double f0Rlb = 38.13547087602444;
    constexpr double qRlb = 0.5003270373238773;
    const double k2 = std::tan(3.14159265358979323846 * f0Rlb / fs);
    const double a0r = 1.0 + k2 / qRlb + k2 * k2;
    stage2Rlb = BiquadState{
        1.0 / a0r, -2.0 / a0r, 1.0 / a0r,
        2.0 * (k2 * k2 - 1.0) / a0r,
        (1.0 - k2 / qRlb + k2 * k2) / a0r,
        0.0, 0.0
    };
}
} // namespace

Result<double> measureIntegratedLufsBs1770(const StereoBuffer& buffer) noexcept {
    if (buffer.sampleRate < 8000U) {
        return Result<double>::failure(ErrorCode::InvalidSampleRate);
    }
    const size_t n = buffer.numFrames();
    if (n == 0 || buffer.right.size() != n) {
        return Result<double>::failure(ErrorCode::EmptyBuffer);
    }

    BiquadState shelfL{}, rlbL{}, shelfR{}, rlbR{};
    makeKWeightingFilters(buffer.sampleRate, shelfL, rlbL);
    makeKWeightingFilters(buffer.sampleRate, shelfR, rlbR);

    std::vector<double> sqSum(n, 0.0);
    for (size_t i = 0; i < n; ++i) {
        const double yL = rlbL.process(shelfL.process(buffer.left[i]));
        const double yR = rlbR.process(shelfR.process(buffer.right[i]));
        sqSum[i] = yL * yL + yR * yR;
    }

    const size_t blockLen = std::max<size_t>(1U, static_cast<size_t>(std::llround(0.400 * buffer.sampleRate)));
    const size_t stepLen = std::max<size_t>(1U, static_cast<size_t>(std::llround(0.100 * buffer.sampleRate)));

    if (n < blockLen) {
        double meanSq = 0.0;
        for (double v : sqSum) meanSq += v;
        meanSq /= static_cast<double>(n);
        if (meanSq <= 1e-14) return Result<double>::success(-70.0);
        return Result<double>::success(-0.691 + 10.0 * std::log10(meanSq));
    }

    std::vector<double> blockEnergies;
    blockEnergies.reserve((n - blockLen) / stepLen + 1U);

    // Soma prefixada para janelas exatas de 400 ms em O(N)
    std::vector<double> prefix(n + 1U, 0.0);
    for (size_t i = 0; i < n; ++i) {
        prefix[i + 1U] = prefix[i] + sqSum[i];
    }

    for (size_t start = 0; start + blockLen <= n; start += stepLen) {
        const double z = (prefix[start + blockLen] - prefix[start]) / static_cast<double>(blockLen);
        blockEnergies.push_back(z);
    }

    // 1. Gate Absoluto (-70.0 LUFS)
    const double absThreshZ = std::pow(10.0, (-70.0 + 0.691) / 10.0);
    double sumAbs = 0.0;
    size_t countAbs = 0;
    for (double z : blockEnergies) {
        if (z > absThreshZ) {
            sumAbs += z;
            ++countAbs;
        }
    }
    if (countAbs == 0) {
        return Result<double>::success(-70.0);
    }

    // 2. Gate Relativo (-10.0 LU abaixo da média pós-gate absoluto)
    const double relGammaLufs = -0.691 + 10.0 * std::log10(sumAbs / static_cast<double>(countAbs)) - 10.0;
    const double relThreshZ = std::pow(10.0, (relGammaLufs + 0.691) / 10.0);

    double sumRel = 0.0;
    size_t countRel = 0;
    for (double z : blockEnergies) {
        if (z > absThreshZ && z > relThreshZ) {
            sumRel += z;
            ++countRel;
        }
    }
    if (countRel == 0) {
        return Result<double>::success(-70.0);
    }

    const double integratedLufs = -0.691 + 10.0 * std::log10(sumRel / static_cast<double>(countRel));
    return Result<double>::success(integratedLufs);
}

Result<double> measureTruePeakDbtp(const StereoBuffer& buffer) noexcept {
    if (buffer.sampleRate < 8000U) {
        return Result<double>::failure(ErrorCode::InvalidSampleRate);
    }
    const size_t n = buffer.numFrames();
    if (n == 0 || buffer.right.size() != n) {
        return Result<double>::failure(ErrorCode::EmptyBuffer);
    }

    Oversampler4x osL{}, osR{};
    double maxPeak = 1e-12;
    for (size_t i = 0; i < n; ++i) {
        maxPeak = std::max(maxPeak, std::abs(buffer.left[i]));
        maxPeak = std::max(maxPeak, std::abs(buffer.right[i]));
        const auto upL = osL.upsample(buffer.left[i]);
        const auto upR = osR.upsample(buffer.right[i]);
        for (size_t p = 0; p < 4; ++p) {
            maxPeak = std::max(maxPeak, std::abs(upL[p]));
            maxPeak = std::max(maxPeak, std::abs(upR[p]));
        }
    }
    return Result<double>::success(20.0 * std::log10(maxPeak));
}

Result<double> measureSubMonoCorrelation(const StereoBuffer& buffer) noexcept {
    const size_t n = buffer.numFrames();
    if (n == 0 || buffer.right.size() != n) {
        return Result<double>::failure(ErrorCode::EmptyBuffer);
    }
    TptSvf lpL1{}, lpL2{}, lpR1{}, lpR2{};
    double sumLL = 0.0, sumRR = 0.0, sumLR = 0.0;
    for (size_t i = 0; i < n; ++i) {
        const double l = lpL2.process(lpL1.process(buffer.left[i], 130.0, 0.707, buffer.sampleRate).lp, 130.0, 0.707, buffer.sampleRate).lp;
        const double r = lpR2.process(lpR1.process(buffer.right[i], 130.0, 0.707, buffer.sampleRate).lp, 130.0, 0.707, buffer.sampleRate).lp;
        sumLL += l * l;
        sumRR += r * r;
        sumLR += l * r;
    }
    const double denom = std::sqrt(sumLL * sumRR);
    if (denom < 1e-15) {
        return Result<double>::success(1.0);
    }
    return Result<double>::success(std::clamp(sumLR / denom, -1.0, 1.0));
}

Result<AudioMetrics> analyzeAudioMetrics(const StereoBuffer& buffer) noexcept {
    const auto lufsRes = measureIntegratedLufsBs1770(buffer);
    if (!lufsRes.ok()) return Result<AudioMetrics>::failure(lufsRes.error);

    const auto tpRes = measureTruePeakDbtp(buffer);
    if (!tpRes.ok()) return Result<AudioMetrics>::failure(tpRes.error);

    const auto corrRes = measureSubMonoCorrelation(buffer);
    if (!corrRes.ok()) return Result<AudioMetrics>::failure(corrRes.error);

    double sq = 0.0;
    for (size_t i = 0; i < buffer.numFrames(); ++i) {
        sq += 0.5 * (buffer.left[i] * buffer.left[i] + buffer.right[i] * buffer.right[i]);
    }
    const double rms = std::sqrt(std::max(1e-20, sq / static_cast<double>(buffer.numFrames())));
    const double rmsDb = 20.0 * std::log10(rms);

    const double seamL = std::abs(buffer.left.back() - buffer.left.front());
    const double seamR = std::abs(buffer.right.back() - buffer.right.front());

    AudioMetrics m{};
    m.integratedLufs = lufsRes.value;
    m.truePeakDbtp = tpRes.value;
    m.subMonoCorrelation = corrRes.value;
    m.crestFactorDb = tpRes.value - rmsDb;
    m.loopSeamDelta = std::max(seamL, seamR);
    return Result<AudioMetrics>::success(m);
}

Result<StereoBuffer> applyTruePeakBrickwallLimiter(
    const StereoBuffer& input,
    double preGainDb,
    double ceilingDbtp
) {
    if (input.numFrames() == 0 || input.right.size() != input.numFrames()) {
        return Result<StereoBuffer>::failure(ErrorCode::EmptyBuffer);
    }
    const size_t n = input.numFrames();
    const double linGain = std::pow(10.0, preGainDb / 20.0);
    // Margem interna de 0.14 dB para absorver ondulação de reconstrução FIR (ISP)
    const double ceilingLin = std::pow(10.0, (ceilingDbtp - 0.14) / 20.0);

    const size_t lookahead = std::max<size_t>(16U, static_cast<size_t>(0.0018 * input.sampleRate));
    StereoBuffer scaled{};
    scaled.resize(n, input.sampleRate);

    Oversampler4x detL{}, detR{};
    std::vector<double> reqGain(n, 1.0);

    for (size_t i = 0; i < n; ++i) {
        const double sL = input.left[i] * linGain;
        const double sR = input.right[i] * linGain;
        scaled.left[i] = sL;
        scaled.right[i] = sR;

        double pk = std::max(std::abs(sL), std::abs(sR));
        const auto upL = detL.upsample(sL);
        const auto upR = detR.upsample(sR);
        for (size_t p = 0; p < 4; ++p) {
            pk = std::max(pk, std::max(std::abs(upL[p]), std::abs(upR[p])));
        }
        if (pk > ceilingLin) {
            reqGain[i] = ceilingLin / pk;
        }
    }

    // Mínimo em janela de lookahead circular + pré-aquecimento periódico do envelope para zero salto de ganho na virada do loop!
    std::vector<double> envGain(n, 1.0);
    double currentG = 1.0;
    const double relCoeff = std::exp(-1.0 / (0.065 * input.sampleRate));
    const double atkCoeff = std::exp(-1.0 / (0.0006 * input.sampleRate));

    const size_t preWarm = std::min<size_t>(n, static_cast<size_t>(0.5 * input.sampleRate));
    for (size_t w = 0; w < preWarm + n; ++w) {
        const size_t i = (w < preWarm) ? (n - preWarm + w) : (w - preWarm);
        double minAhead = 1.0;
        for (size_t k = 0; k < lookahead; ++k) {
            minAhead = std::min(minAhead, reqGain[(i + k) % n]);
        }
        if (minAhead < currentG) {
            currentG = atkCoeff * currentG + (1.0 - atkCoeff) * minAhead;
        } else {
            currentG = relCoeff * currentG + (1.0 - relCoeff) * minAhead;
        }
        if (w >= preWarm) {
            envGain[i] = currentG;
        }
    }

    StereoBuffer out{};
    out.resize(n, input.sampleRate);
    const double hardClamp = std::pow(10.0, ceilingDbtp / 20.0);
    for (size_t i = 0; i < n; ++i) {
        out.left[i] = std::clamp(scaled.left[i] * envGain[i], -hardClamp, hardClamp);
        out.right[i] = std::clamp(scaled.right[i] * envGain[i], -hardClamp, hardClamp);
    }

    // Verificação pós-limiter de ISP True-Peak: se o filtro de reconstrução passar 0.05 dB, ajusta escalar fino
    const auto tpCheck = measureTruePeakDbtp(out);
    if (tpCheck.ok() && tpCheck.value > ceilingDbtp) {
        const double trim = std::pow(10.0, (ceilingDbtp - tpCheck.value - 0.02) / 20.0);
        for (size_t i = 0; i < n; ++i) {
            out.left[i] *= trim;
            out.right[i] *= trim;
        }
    }

    return Result<StereoBuffer>::success(std::move(out));
}

Result<StereoBuffer> masterTrackClosedLoopBs1770(
    const StereoBuffer& rawMix,
    double targetLufs,
    double ceilingDbtp
) {
    const auto initLufs = measureIntegratedLufsBs1770(rawMix);
    if (!initLufs.ok()) {
        return Result<StereoBuffer>::failure(initLufs.error);
    }
    if (initLufs.value <= -69.5) {
        return Result<StereoBuffer>::failure(ErrorCode::ConvergenceFailure);
    }

    double preGainDb = targetLufs - initLufs.value;
    StereoBuffer bestCandidate{};

    for (int iter = 0; iter < 10; ++iter) {
        auto limRes = applyTruePeakBrickwallLimiter(rawMix, preGainDb, ceilingDbtp);
        if (!limRes.ok()) {
            return limRes;
        }
        bestCandidate = std::move(limRes.value);
        const auto meas = measureIntegratedLufsBs1770(bestCandidate);
        if (!meas.ok()) {
            return Result<StereoBuffer>::failure(meas.error);
        }
        const double errLu = targetLufs - meas.value;
        if (std::abs(errLu) <= 0.04) {
            return Result<StereoBuffer>::success(std::move(bestCandidate));
        }
        // Passo amortecido de Newton para convergir mesmo sob compressão do limiter
        preGainDb += errLu * 1.05;
    }

    const auto finalMeas = measureIntegratedLufsBs1770(bestCandidate);
    if (finalMeas.ok() && std::abs(finalMeas.value - targetLufs) <= 0.15) {
        return Result<StereoBuffer>::success(std::move(bestCandidate));
    }
    return Result<StereoBuffer>::failure(ErrorCode::ConvergenceFailure);
}

Result<size_t> writeWav24BitFile(
    const std::string& filePath,
    const StereoBuffer& buffer
) {
    if (buffer.numFrames() == 0 || buffer.right.size() != buffer.numFrames()) {
        return Result<size_t>::failure(ErrorCode::EmptyBuffer);
    }

    std::ofstream out(filePath, std::ios::binary | std::ios::trunc);
    if (!out.is_open()) {
        return Result<size_t>::failure(ErrorCode::IoWriteFailure);
    }

    const uint32_t numChannels = 2U;
    const uint32_t bitsPerSample = 24U;
    const uint32_t bytesPerSample = bitsPerSample / 8U;
    const uint32_t blockAlign = numChannels * bytesPerSample;
    const uint32_t byteRate = buffer.sampleRate * blockAlign;
    const uint32_t dataSize = static_cast<uint32_t>(buffer.numFrames()) * blockAlign;
    const uint32_t riffChunkSize = 36U + dataSize;

    auto writeU32 = [&](uint32_t v) {
        const char b[4] = {
            static_cast<char>(v & 0xFFU),
            static_cast<char>((v >> 8U) & 0xFFU),
            static_cast<char>((v >> 16U) & 0xFFU),
            static_cast<char>((v >> 24U) & 0xFFU)
        };
        out.write(b, 4);
    };
    auto writeU16 = [&](uint16_t v) {
        const char b[2] = {
            static_cast<char>(v & 0xFFU),
            static_cast<char>((v >> 8U) & 0xFFU)
        };
        out.write(b, 2);
    };

    out.write("RIFF", 4);
    writeU32(riffChunkSize);
    out.write("WAVE", 4);
    out.write("fmt ", 4);
    writeU32(16U);
    writeU16(1U); // PCM
    writeU16(static_cast<uint16_t>(numChannels));
    writeU32(buffer.sampleRate);
    writeU32(byteRate);
    writeU16(static_cast<uint16_t>(blockAlign));
    writeU16(static_cast<uint16_t>(bitsPerSample));
    out.write("data", 4);
    writeU32(dataSize);

    constexpr double kMax24 = 8388607.0;
    std::vector<char> pcm(dataSize);
    size_t ptr = 0;
    for (size_t i = 0; i < buffer.numFrames(); ++i) {
        const double cL = std::clamp(buffer.left[i], -1.0, 1.0);
        const double cR = std::clamp(buffer.right[i], -1.0, 1.0);
        const int32_t iL = static_cast<int32_t>(std::llround(cL * kMax24));
        const int32_t iR = static_cast<int32_t>(std::llround(cR * kMax24));

        pcm[ptr++] = static_cast<char>(iL & 0xFF);
        pcm[ptr++] = static_cast<char>((iL >> 8) & 0xFF);
        pcm[ptr++] = static_cast<char>((iL >> 16) & 0xFF);

        pcm[ptr++] = static_cast<char>(iR & 0xFF);
        pcm[ptr++] = static_cast<char>((iR >> 8) & 0xFF);
        pcm[ptr++] = static_cast<char>((iR >> 16) & 0xFF);
    }
    out.write(pcm.data(), static_cast<std::streamsize>(pcm.size()));
    if (!out.good()) {
        return Result<size_t>::failure(ErrorCode::IoWriteFailure);
    }
    return Result<size_t>::success(44U + static_cast<size_t>(dataSize));
}

} // namespace biofoil::audio
