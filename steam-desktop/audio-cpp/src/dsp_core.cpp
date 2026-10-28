#include "biofoil_audio/dsp_core.hpp"
#include <algorithm>
#include <cmath>
#include <numbers>

namespace biofoil::audio {

namespace {
constexpr double kPi = std::numbers::pi;
constexpr double kLn2 = std::numbers::ln2;

double besselI0(double x) noexcept {
    double sum = 1.0;
    double term = 1.0;
    const double halfX = 0.5 * x;
    for (int k = 1; k <= 20; ++k) {
        term *= (halfX * halfX) / static_cast<double>(k * k);
        sum += term;
        if (term < 1e-14 * sum) {
            break;
        }
    }
    return sum;
}
} // namespace

uint64_t DeterministicRng::nextU64() noexcept {
    uint64_t z = (state_ += 0x9E3779B97F4A7C15ULL);
    z = (z ^ (z >> 30U)) * 0xBF58476D1CE4E5B9ULL;
    z = (z ^ (z >> 27U)) * 0x94D049BB133111EBULL;
    return z ^ (z >> 31U);
}

double DeterministicRng::nextUniform01() noexcept {
    return static_cast<double>(nextU64() >> 11U) * (1.0 / 9007199254740992.0);
}

double DeterministicRng::nextBipolar() noexcept {
    return 2.0 * nextUniform01() - 1.0;
}

double DeterministicRng::nextGaussian() noexcept {
    // Soma centrada de 6 uniformes (Irwin-Hall escalado para variância unitária exata: sigma = sqrt(6/12) = 1/sqrt(2))
    double sum = 0.0;
    for (int i = 0; i < 6; ++i) {
        sum += nextUniform01();
    }
    return (sum - 3.0) * std::numbers::sqrt2;
}

void AdaaWaveshaper::reset() noexcept {
    xPrevTanh_ = 0.0;
    fPrevTanh_ = 0.0;
    initializedTanh_ = false;
}

double AdaaWaveshaper::antiderivativeTanh(double x) noexcept {
    const double ax = std::abs(x);
    return ax + std::log1p(std::exp(-2.0 * ax)) - kLn2;
}

double AdaaWaveshaper::processTanh(double x, double drive) noexcept {
    const double u = x * std::max(0.05, drive);
    const double fNow = antiderivativeTanh(u);
    if (!initializedTanh_) {
        initializedTanh_ = true;
        xPrevTanh_ = u;
        fPrevTanh_ = fNow;
        return std::tanh(u);
    }
    const double diff = u - xPrevTanh_;
    double out = 0.0;
    if (std::abs(diff) < 1e-5) {
        out = std::tanh(0.5 * (u + xPrevTanh_));
    } else {
        out = (fNow - fPrevTanh_) / diff;
    }
    xPrevTanh_ = u;
    fPrevTanh_ = fNow;
    return out;
}

double AdaaWaveshaper::processAsymTube(double x, double drive, double asym) noexcept {
    const double biased = x * drive + asym * (x * x) * 0.35;
    const double shaped = processTanh(biased, 1.0);
    const double dcOffset = std::tanh(asym * 0.08);
    return shaped - dcOffset * 0.25;
}

void TptSvf::reset() noexcept {
    ic1eq_ = 0.0;
    ic2eq_ = 0.0;
}

SvfOutputs TptSvf::process(double input, double cutoffHz, double q, double sampleRate) noexcept {
    const double safeSr = std::max(8000.0, sampleRate);
    const double fc = std::clamp(cutoffHz, 12.0, 0.475 * safeSr);
    const double safeQ = std::clamp(q, 0.5, 24.0);
    const double g = std::tan(kPi * fc / safeSr);
    const double k = 1.0 / safeQ;

    const double a1 = 1.0 / (1.0 + g * (g + k));
    const double a2 = g * a1;
    const double a3 = g * a2;

    const double v3 = input - ic2eq_;
    const double v1 = a1 * ic1eq_ + a2 * v3;
    const double v2 = ic2eq_ + a2 * ic1eq_ + a3 * v3;

    ic1eq_ = 2.0 * v1 - ic1eq_;
    ic2eq_ = 2.0 * v2 - ic2eq_;

    const double hp = input - k * v1 - v2;
    const double notch = input - k * v1;
    return SvfOutputs{v2, v1, hp, notch};
}

double TptSvf::processBell(double input, double centerHz, double q, double gainDb, double sampleRate) noexcept {
    if (std::abs(gainDb) < 1e-6) {
        const auto unused = process(input, centerHz, q, sampleRate);
        (void)unused;
        return input;
    }
    const double safeSr = std::max(8000.0, sampleRate);
    const double fc = std::clamp(centerHz, 20.0, 0.475 * safeSr);
    const double safeQ = std::clamp(q, 0.25, 18.0);
    const double amp = std::pow(10.0, gainDb / 40.0);
    const double g = std::tan(kPi * fc / safeSr);
    const double k = 1.0 / (safeQ * amp);

    const double a1 = 1.0 / (1.0 + g * (g + k));
    const double a2 = g * a1;
    const double a3 = g * a2;
    const double m1 = k * (amp * amp - 1.0);

    const double v3 = input - ic2eq_;
    const double v1 = a1 * ic1eq_ + a2 * v3;
    const double v2 = ic2eq_ + a2 * ic1eq_ + a3 * v3;

    ic1eq_ = 2.0 * v1 - ic1eq_;
    ic2eq_ = 2.0 * v2 - ic2eq_;

    return input + m1 * v1;
}

void K35NonlinearFilter::reset() noexcept {
    hpfStage_.reset();
    lpfStage_.reset();
    feedbackClipper_.reset();
    lastFeedback_ = 0.0;
}

double K35NonlinearFilter::process(double input, double hpfHz, double lpfHz, double resonance, double drive, double sampleRate) noexcept {
    const double qHpf = 0.707 + 2.8 * std::clamp(resonance, 0.0, 0.95);
    const double qLpf = 0.707 + 5.5 * std::clamp(resonance, 0.0, 0.95);
    const double excited = input * std::max(0.5, drive) + 0.28 * resonance * lastFeedback_;
    const double hpOut = hpfStage_.process(excited, hpfHz, qHpf, sampleRate).hp;
    const SvfOutputs lpOut = lpfStage_.process(hpOut, lpfHz, qLpf, sampleRate);
    lastFeedback_ = feedbackClipper_.processAsymTube(lpOut.bp, 1.35, 0.28);
    return feedbackClipper_.processTanh(lpOut.lp, 1.15);
}

void ZdfLadderFilter::reset() noexcept {
    s_.fill(0.0);
    inputDrive_.reset();
}

double ZdfLadderFilter::process(double input, double cutoffHz, double resonance01, double drive, double sampleRate) noexcept {
    const double safeSr = std::max(8000.0, sampleRate);
    const double fc = std::clamp(cutoffHz, 18.0, 0.44 * safeSr);
    const double g = std::tan(kPi * fc / safeSr);
    const double k = 3.85 * std::clamp(resonance01, 0.0, 0.96);

    const double G = g / (1.0 + g);
    const double G2 = G * G;
    const double G3 = G2 * G;
    const double G4 = G2 * G2;

    const double S = (G3 * s_[0] + G2 * s_[1] + G * s_[2] + s_[3]) / (1.0 + g);
    const double saturatedIn = inputDrive_.processTanh(input, std::max(0.5, drive));
    const double u = (saturatedIn - k * S) / (1.0 + k * G4);

    double x = u;
    for (size_t i = 0; i < 4; ++i) {
        const double v = (x - s_[i]) * G;
        const double y = v + s_[i];
        s_[i] = y + v;
        x = y;
    }
    return x;
}

void LinkwitzRiley4Stereo::reset() noexcept {
    lpL1_.reset(); lpL2_.reset(); hpL1_.reset(); hpL2_.reset();
    lpR1_.reset(); lpR2_.reset(); hpR1_.reset(); hpR2_.reset();
}

StereoFrame LinkwitzRiley4Stereo::processMonoSubCrossover(StereoFrame in, double crossoverHz, double sampleRate) noexcept {
    constexpr double kButterworthQ = 0.7071067811865475;
    const double lowL = lpL2_.process(lpL1_.process(in.left, crossoverHz, kButterworthQ, sampleRate).lp, crossoverHz, kButterworthQ, sampleRate).lp;
    const double lowR = lpR2_.process(lpR1_.process(in.right, crossoverHz, kButterworthQ, sampleRate).lp, crossoverHz, kButterworthQ, sampleRate).lp;

    const double highL = hpL2_.process(hpL1_.process(in.left, crossoverHz, kButterworthQ, sampleRate).hp, crossoverHz, kButterworthQ, sampleRate).hp;
    const double highR = hpR2_.process(hpR1_.process(in.right, crossoverHz, kButterworthQ, sampleRate).hp, crossoverHz, kButterworthQ, sampleRate).hp;

    // Abaixo de 140 Hz: soma 100% Mono coerente em fase; acima de 140 Hz: imagem estéreo preservada
    const double monoSub = 0.5 * (lowL + lowR);
    return StereoFrame{monoSub + highL, monoSub + highR};
}

Oversampler4x::Oversampler4x() noexcept {
    // Filtro FIR passa-baixas Kaiser (beta = 7.2, fc = 0.22 * fs_over / 2 = cutoff normalizado 0.11 ciclos/sample)
    constexpr double kCutoff = 0.115;
    constexpr double kBeta = 7.2;
    const double denomI0 = besselI0(kBeta);
    const int center = static_cast<int>(kFirTaps / 2);

    double sum = 0.0;
    for (size_t i = 0; i < kFirTaps; ++i) {
        const int n = static_cast<int>(i) - center;
        double sinc = 2.0 * kCutoff;
        if (n != 0) {
            const double arg = 2.0 * kPi * kCutoff * static_cast<double>(n);
            sinc = std::sin(arg) / (kPi * static_cast<double>(n));
        }
        const double ratio = static_cast<double>(n) / static_cast<double>(center);
        const double win = besselI0(kBeta * std::sqrt(std::max(0.0, 1.0 - ratio * ratio))) / denomI0;
        coeffs_[i] = sinc * win;
        sum += coeffs_[i];
    }
    for (double& c : coeffs_) {
        c /= sum;
    }
    reset();
}

void Oversampler4x::reset() noexcept {
    upHist_.fill(0.0);
    downHist_.fill(0.0);
    upPos_ = 0;
    downPos_ = 0;
}

std::array<double, 4> Oversampler4x::upsample(double x) noexcept {
    std::array<double, 4> out{};
    for (size_t phase = 0; phase < 4; ++phase) {
        const double sampleIn = (phase == 0) ? (4.0 * x) : 0.0;
        upHist_[upPos_] = sampleIn;
        double acc = 0.0;
        size_t idx = upPos_;
        for (size_t t = 0; t < kFirTaps; ++t) {
            acc += coeffs_[t] * upHist_[idx];
            idx = (idx == 0) ? (kFirTaps - 1) : (idx - 1);
        }
        upPos_ = (upPos_ + 1) % kFirTaps;
        out[phase] = acc;
    }
    return out;
}

double Oversampler4x::downsample(const std::array<double, 4>& overSamples) noexcept {
    double decimated = 0.0;
    for (size_t phase = 0; phase < 4; ++phase) {
        downHist_[downPos_] = overSamples[phase];
        if (phase == 3) {
            double acc = 0.0;
            size_t idx = downPos_;
            for (size_t t = 0; t < kFirTaps; ++t) {
                acc += coeffs_[t] * downHist_[idx];
                idx = (idx == 0) ? (kFirTaps - 1) : (idx - 1);
            }
            decimated = acc;
        }
        downPos_ = (downPos_ + 1) % kFirTaps;
    }
    return decimated;
}

Result<int> findOptimalSubPhaseLagSamples(
    const std::vector<double>& kickMono,
    const std::vector<double>& subMono,
    int maxLagSamples
) {
    if (kickMono.empty() || subMono.empty() || kickMono.size() != subMono.size()) {
        return Result<int>::failure(ErrorCode::EmptyBuffer);
    }
    if (maxLagSamples < 0 || maxLagSamples > 256) {
        return Result<int>::failure(ErrorCode::InvalidParameter);
    }

    const size_t n = kickMono.size();
    int bestLag = 0;
    double bestCorr = -1e300;

    for (int lag = -maxLagSamples; lag <= maxLagSamples; ++lag) {
        double corr = 0.0;
        for (size_t i = 0; i < n; ++i) {
            const ptrdiff_t shifted = (static_cast<ptrdiff_t>(i) - lag + static_cast<ptrdiff_t>(n)) % static_cast<ptrdiff_t>(n);
            corr += kickMono[i] * subMono[static_cast<size_t>(shifted)];
        }
        if (corr > bestCorr) {
            bestCorr = corr;
            bestLag = lag;
        }
    }
    return Result<int>::success(bestLag);
}

std::vector<double> applyCircularSampleShift(const std::vector<double>& buffer, int shiftSamples) {
    if (buffer.empty()) {
        return {};
    }
    const size_t n = buffer.size();
    std::vector<double> out(n, 0.0);
    for (size_t i = 0; i < n; ++i) {
        const ptrdiff_t src = (static_cast<ptrdiff_t>(i) - shiftSamples + static_cast<ptrdiff_t>(n) * 4) % static_cast<ptrdiff_t>(n);
        out[i] = buffer[static_cast<size_t>(src)];
    }
    return out;
}

ChowTapeDubDelay::ChowTapeDubDelay(uint32_t maxSampleRate) {
    const size_t cap = static_cast<size_t>(maxSampleRate) * 3U;
    bufL_.assign(cap, 0.0);
    bufR_.assign(cap, 0.0);
}

void ChowTapeDubDelay::reset() noexcept {
    std::fill(bufL_.begin(), bufL_.end(), 0.0);
    std::fill(bufR_.begin(), bufR_.end(), 0.0);
    writePos_ = 0;
    wowPhase_ = 0.0;
    flutterPhase_ = 0.0;
    fbHpL_.reset(); fbLpL_.reset(); fbHpR_.reset(); fbLpR_.reset();
    tapeL_.reset(); tapeR_.reset();
}

StereoFrame ChowTapeDubDelay::process(StereoFrame dryInput, double delaySeconds, double feedback, double wetMix, double sampleRate) noexcept {
    const size_t cap = bufL_.size();
    const double fb = std::clamp(feedback, 0.0, 0.88);
    const double wet = std::clamp(wetMix, 0.0, 1.0);

    // Wow (0.38 Hz) + Flutter (3.1 Hz) sutis da fita magnética
    wowPhase_ += 2.0 * kPi * 0.38 / sampleRate;
    flutterPhase_ += 2.0 * kPi * 3.10 / sampleRate;
    if (wowPhase_ > 2.0 * kPi) wowPhase_ -= 2.0 * kPi;
    if (flutterPhase_ > 2.0 * kPi) flutterPhase_ -= 2.0 * kPi;

    const double modSamples = (0.00085 * std::sin(wowPhase_) + 0.00018 * std::sin(flutterPhase_)) * sampleRate;
    const double baseDelay = std::clamp(delaySeconds * sampleRate + modSamples, 8.0, static_cast<double>(cap - 4));

    auto readInterp = [&](const std::vector<double>& buf, double delaySmp) -> double {
        const double readIdx = static_cast<double>(writePos_) - delaySmp + static_cast<double>(cap);
        const size_t i0 = static_cast<size_t>(readIdx) % cap;
        const size_t i1 = (i0 + 1) % cap;
        const double frac = readIdx - std::floor(readIdx);
        return buf[i0] * (1.0 - frac) + buf[i1] * frac;
    };

    const double dL = readInterp(bufL_, baseDelay);
    const double dR = readInterp(bufR_, baseDelay * 1.012); // micro-assimetria estéreo

    // Ping-pong cruzado com filtragem analógica (240 Hz - 2450 Hz) + saturação de fita ADAA
    const double filtL = fbLpL_.process(fbHpL_.process(dryInput.left + dR * fb, 240.0, 0.72, sampleRate).hp, 2450.0, 0.80, sampleRate).lp;
    const double filtR = fbLpR_.process(fbHpR_.process(dryInput.right * 0.85 + dL * fb, 240.0, 0.72, sampleRate).hp, 2450.0, 0.80, sampleRate).lp;

    bufL_[writePos_] = tapeL_.processAsymTube(filtL, 1.22, 0.18);
    bufR_[writePos_] = tapeR_.processAsymTube(filtR, 1.22, 0.18);
    writePos_ = (writePos_ + 1) % cap;

    return StereoFrame{
        dryInput.left + wet * dL,
        dryInput.right + wet * dR
    };
}

HadamardFdn8Reverb::HadamardFdn8Reverb(uint32_t sampleRate) {
    // 8 linhas de atraso mutuamente primas escaladas para a taxa de amostragem (~27ms a ~89ms)
    constexpr std::array<double, 8> kTimesSec{{0.0271, 0.0337, 0.0409, 0.0487, 0.0571, 0.0661, 0.0769, 0.0887}};
    for (size_t i = 0; i < 8; ++i) {
        const size_t len = std::max<size_t>(64, static_cast<size_t>(kTimesSec[i] * sampleRate) + 32);
        lines_[i].assign(len, 0.0);
        pos_[i] = 0;
    }
}

void HadamardFdn8Reverb::reset() noexcept {
    for (size_t i = 0; i < 8; ++i) {
        std::fill(lines_[i].begin(), lines_[i].end(), 0.0);
        pos_[i] = 0;
        dampFilters_[i].reset();
    }
    preHpL_.reset();
    preHpR_.reset();
    modPhase_ = 0.0;
}

StereoFrame HadamardFdn8Reverb::process(StereoFrame input, double decay, double dampCutoffHz, double wetMix, double gateGain, double sampleRate) noexcept {
    const double g = std::clamp(decay, 0.0, 0.94);
    const double wet = std::clamp(wetMix, 0.0, 1.0) * std::clamp(gateGain, 0.0, 1.0);

    // Limpa lama grave antes da caverna abissal (HPF 165 Hz)
    const double inL = preHpL_.process(input.left, 165.0, 0.707, sampleRate).hp;
    const double inR = preHpR_.process(input.right, 165.0, 0.707, sampleRate).hp;

    modPhase_ += 2.0 * kPi * 0.23 / sampleRate;
    if (modPhase_ > 2.0 * kPi) modPhase_ -= 2.0 * kPi;

    std::array<double, 8> delayed{};
    for (size_t i = 0; i < 8; ++i) {
        const size_t cap = lines_[i].size();
        const double mod = 3.5 * std::sin(modPhase_ + static_cast<double>(i) * (kPi * 0.25));
        const double delaySmp = static_cast<double>(cap - 12) + mod;
        const double rIdx = static_cast<double>(pos_[i]) - delaySmp + static_cast<double>(cap * 2);
        const size_t i0 = static_cast<size_t>(rIdx) % cap;
        const size_t i1 = (i0 + 1) % cap;
        const double frac = rIdx - std::floor(rIdx);
        const double raw = lines_[i][i0] * (1.0 - frac) + lines_[i][i1] * frac;
        delayed[i] = dampFilters_[i].process(raw, dampCutoffHz, 0.707, sampleRate).lp;
    }

    // Transformada Ortogonal rápida de Walsh-Hadamard 8x8 normalizada por 1/sqrt(8)
    std::array<double, 8> h = delayed;
    for (size_t len = 1; len < 8; len <<= 1U) {
        for (size_t i = 0; i < 8; i += (len << 1U)) {
            for (size_t j = 0; j < len; ++j) {
                const double u = h[i + j];
                const double v = h[i + j + len];
                h[i + j] = u + v;
                h[i + j + len] = u - v;
            }
        }
    }
    constexpr double kNorm = 0.35355339059327379; // 1 / sqrt(8)
    for (size_t i = 0; i < 8; ++i) {
        const double inject = ((i & 1U) == 0U) ? inL : inR;
        lines_[i][pos_[i]] = inject * 0.35 + h[i] * kNorm * g;
        pos_[i] = (pos_[i] + 1) % lines_[i].size();
    }

    const double wetL = 0.35 * (delayed[0] - delayed[2] + delayed[4] - delayed[6]);
    const double wetR = 0.35 * (delayed[1] - delayed[3] + delayed[5] - delayed[7]);
    return StereoFrame{input.left + wet * wetL, input.right + wet * wetR};
}

void Diode303Filter::reset() noexcept {
    s_.fill(0.0);
    c13Charge_ = 0.0;
    currentAccent_ = false;
    diodeClipper_.reset();
}

void Diode303Filter::triggerNote(bool accent) noexcept {
    currentAccent_ = accent;
    if (accent) {
        // Memória real do capacitor C13 da TB-303: notas acentuadas consecutivas acumulam carga
        c13Charge_ = std::min(1.85, c13Charge_ * 0.68 + 0.62);
    } else {
        c13Charge_ *= 0.42;
    }
}

double Diode303Filter::process(double input, double baseCutoffHz, double envMod, double resonance01, double drive, double sampleRate) noexcept {
    const double safeSr = std::max(8000.0, sampleRate);
    // Descarga lenta do acumulador C13 ao longo da nota
    c13Charge_ *= std::exp(-1.0 / (0.195 * safeSr));

    const double accentSweepHz = currentAccent_ ? (780.0 * c13Charge_ * resonance01) : 0.0;
    const double fc = std::clamp(baseCutoffHz + envMod + accentSweepHz, 32.0, 0.43 * safeSr);
    const double g = std::tan(kPi * fc / safeSr);

    // Escada de diodos acoplada (1º polo deslocado ~2x -> inclinação líquida 18 dB/oct característica da 303)
    const double g0 = std::min(0.92, (2.0 * g) / (1.0 + 2.0 * g));
    const double gStage = g / (1.0 + g);
    const double k = 6.2 * std::clamp(resonance01 + (currentAccent_ ? 0.14 : 0.0), 0.0, 0.94);

    const double fbEstimate = (gStage * gStage * gStage * s_[0] + gStage * gStage * s_[1] + gStage * s_[2] + s_[3]) / (1.0 + g);
    const double driven = diodeClipper_.processAsymTube(input, std::max(0.6, drive), 0.26);
    const double u = (driven - k * std::tanh(fbEstimate * 1.15)) / (1.0 + k * g0 * gStage * gStage * gStage * 0.32);

    const double v0 = (u - s_[0]) * g0;
    const double y0 = v0 + s_[0];
    s_[0] = y0 + v0;

    // Acoplamento inter-estágio entre diodos (leve realimentação local y_{i+1} -> y_i)
    double x = y0 + 0.14 * s_[1];
    for (size_t i = 1; i < 4; ++i) {
        const double v = (x - s_[i]) * gStage;
        const double y = v + s_[i];
        s_[i] = y + v;
        x = std::tanh(y * 1.08);
    }
    return x * (1.0 + 0.28 * resonance01);
}

void BodeFrequencyShifter::reset() noexcept {
    for (auto& ap : branchI_) ap.reset();
    for (auto& ap : branchQ_) ap.reset();
    oscPhase_ = 0.0;
}

StereoFrame BodeFrequencyShifter::process(StereoFrame input, double shiftHz, double wetMix, double sampleRate) noexcept {
    const double safeSr = std::max(8000.0, sampleRate);
    const double wet = std::clamp(wetMix, 0.0, 1.0);
    // Rede dome de 4ª ordem de Olli Niemitalo (diferença de fase de 90° ±0.7° em 20 Hz..20 kHz)
    constexpr std::array<double, 4> kCoeffsI{{0.6923878, 0.9360654322959, 0.9882295226860, 0.9987488452737}};
    constexpr std::array<double, 4> kCoeffsQ{{0.4021921162426, 0.8561710882420, 0.9722909545651, 0.9952884791278}};

    const double mono = 0.5 * (input.left + input.right);
    double sigI = mono;
    double sigQ = mono;
    for (size_t i = 0; i < 4; ++i) {
        sigI = branchI_[i].process(sigI, kCoeffsI[i]);
        sigQ = branchQ_[i].process(sigQ, kCoeffsQ[i]);
    }

    oscPhase_ += (2.0 * kPi * shiftHz) / safeSr;
    if (oscPhase_ > 2.0 * kPi) oscPhase_ -= 2.0 * kPi;
    if (oscPhase_ < -2.0 * kPi) oscPhase_ += 2.0 * kPi;

    const double c = std::cos(oscPhase_);
    const double s = std::sin(oscPhase_);
    // Banda lateral superior (USB: +shiftHz) na esquerda, mistura metálica estéreo na direita
    const double usb = sigI * c - sigQ * s;
    const double lsb = sigI * c + sigQ * s;

    return StereoFrame{
        input.left * (1.0 - wet) + wet * usb,
        input.right * (1.0 - wet) + wet * (0.72 * usb + 0.28 * lsb)
    };
}

void HydroNoiseGenerator::reset() noexcept {
    b0_ = 0.0; b1_ = 0.0; b2_ = 0.0;
    lfoPhase_ = 0.0;
    lpL_.reset(); lpR_.reset(); hpL_.reset(); hpR_.reset();
}

StereoFrame HydroNoiseGenerator::renderSample(double brightnessHz, double level, double sampleRate, DeterministicRng& rng) noexcept {
    const double safeSr = std::max(8000.0, sampleRate);
    const double whiteL = rng.nextBipolar();
    const double whiteR = rng.nextBipolar();

    // Aproximação rápida de ruído rosa marítimo (1/f)
    b0_ = 0.99765 * b0_ + whiteL * 0.0990460;
    b1_ = 0.96300 * b1_ + whiteL * 0.2965164;
    b2_ = 0.57000 * b2_ + whiteL * 1.0526913;
    const double pinkL = (b0_ + b1_ + b2_ + whiteL * 0.1848) * 0.12;
    const double pinkR = (b0_ * 0.85 + b1_ * 0.95 + whiteR * 0.42) * 0.12;

    lfoPhase_ += (2.0 * kPi * 0.11) / safeSr;
    if (lfoPhase_ > 2.0 * kPi) lfoPhase_ -= 2.0 * kPi;

    const double swellL = brightnessHz * (0.78 + 0.28 * std::sin(lfoPhase_));
    const double swellR = brightnessHz * (0.78 + 0.28 * std::cos(lfoPhase_));

    const double outL = hpL_.process(lpL_.process(pinkL, swellL, 0.85, safeSr).lp, 165.0, 0.707, safeSr).hp * level;
    const double outR = hpR_.process(lpR_.process(pinkR, swellR, 0.85, safeSr).lp, 165.0, 0.707, safeSr).hp * level;
    return StereoFrame{outL, outR};
}

double midiNoteToHz(double midiNote) noexcept {
    return 440.0 * std::pow(2.0, (midiNote - 69.0) / 12.0);
}

} // namespace biofoil::audio
