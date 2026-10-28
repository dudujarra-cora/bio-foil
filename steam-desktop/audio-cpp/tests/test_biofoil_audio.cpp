#include "biofoil_audio/dsp_core.hpp"
#include "biofoil_audio/loudness_mastering.hpp"
#include "biofoil_audio/procedural_brain.hpp"
#include "biofoil_audio/voices_and_genres.hpp"
#include "biofoil_audio/worklet_bindings.hpp"

#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <filesystem>
#include <numbers>
#include <string>
#include <vector>

namespace {

int g_n4Assertions = 0;

void requireTrue(bool cond, const char* expr, const char* file, int line, const char* msg) {
    ++g_n4Assertions;
    if (!cond) {
        std::fprintf(stderr, "[FALHA TESTE] (%s:%d) Assercao #%d falhou: %s — %s\n",
                     file, line, g_n4Assertions, expr, msg);
        std::exit(1);
    }
}

#define CHECK_L4(cond, msg) requireTrue((cond), #cond, __FILE__, __LINE__, (msg))

void testDspCore() {
    using namespace biofoil::audio;

    // 1. Determinismo bit-a-bit do PRNG (SplitMix64)
    DeterministicRng rngA(0x123456789ABCDEF0ULL);
    DeterministicRng rngB(0x123456789ABCDEF0ULL);
    CHECK_L4(rngA.nextU64() == rngB.nextU64(), "PRNG deterministico deve gerar U64 identico para a mesma seed");
    const double u01 = rngA.nextUniform01();
    CHECK_L4(u01 >= 0.0 && u01 < 1.0, "nextUniform01 deve respeitar intervalo [0, 1)");
    const double bip = rngA.nextBipolar();
    CHECK_L4(bip >= -1.0 && bip < 1.0, "nextBipolar deve respeitar intervalo [-1, 1)");
    const double g = rngA.nextGaussian();
    CHECK_L4(std::abs(g) < 6.0, "nextGaussian deve respeitar suporte finito Irwin-Hall");

    // 2. MIDI para Hz literal independente (A4=69 -> 440.0 Hz, G1=31 -> 48.9994 Hz)
    CHECK_L4(std::abs(midiNoteToHz(69.0) - 440.0) < 1e-9, "MIDI 69 deve ser exatamente 440.0 Hz");
    CHECK_L4(std::abs(midiNoteToHz(31.0) - 48.9994294977) < 1e-6, "MIDI 31 (G1) deve ser 49.00 Hz");

    // 3. ADAA Waveshaper sem overflow extremo e simétrico em tanh
    CHECK_L4(std::isfinite(AdaaWaveshaper::antiderivativeTanh(950.0)), "Antiderivada tanh nao pode sofrer overflow em |x|=950");
    AdaaWaveshaper shaper{};
    shaper.reset();
    const double s0 = shaper.processTanh(0.5, 2.0);
    const double s1 = shaper.processTanh(0.52, 2.0);
    CHECK_L4(std::abs(s0) <= 1.0 && std::abs(s1) <= 1.0, "ADAA tanh deve limitar amplitude em [-1, 1]");
    const double tube = shaper.processAsymTube(0.4, 1.8, 0.25);
    CHECK_L4(std::isfinite(tube) && std::abs(tube) < 1.2, "ADAA AsymTube deve produzir saida finita e controlada");

    // 4. Filtro ZDF TPT SVF: atenuação real de 5 kHz quando LPF fecha em 400 Hz (Mergulho Tático) e transparência Bell 0 dB
    TptSvf svf{};
    svf.reset();
    CHECK_L4(std::abs(svf.processBell(0.42, 950.0, 0.85, 0.0, 48000.0) - 0.42) < 1e-12, "Bell EQ com 0.0 dB deve ser bit-transparente");

    svf.reset();
    double rmsHighAt400 = 0.0;
    for (int n = 0; n < 2400; ++n) {
        const double x = std::sin(2.0 * std::numbers::pi * 5000.0 * static_cast<double>(n) / 48000.0);
        const double y = svf.process(x, 400.0, 0.707, 48000.0).lp;
        if (n >= 400) rmsHighAt400 += y * y;
    }
    rmsHighAt400 = std::sqrt(rmsHighAt400 / 2000.0);
    CHECK_L4(rmsHighAt400 < 0.015, "Filtro ZDF LPF em 400 Hz deve atenuar >34 dB um tom de 5 kHz");

    // 5. K35 Nonlinear, ZDF Ladder e Crossover Linkwitz-Riley LR4 (Sub Mono < 140 Hz)
    K35NonlinearFilter k35{};
    k35.reset();
    ZdfLadderFilter ladder{};
    ladder.reset();
    LinkwitzRiley4Stereo lr4{};
    lr4.reset();

    double subDiffEnergy = 0.0;
    for (int n = 0; n < 4800; ++n) {
        const double sub50 = std::sin(2.0 * std::numbers::pi * 50.0 * static_cast<double>(n) / 48000.0);
        const double kOut = k35.process(sub50 * 0.5, 90.0, 1200.0, 0.6, 1.8, 48000.0);
        const double lOut = ladder.process(sub50 * 0.5, 320.0, 0.5, 1.4, 48000.0);
        CHECK_L4(std::isfinite(kOut) && std::isfinite(lOut), "Filtros nao-lineares K35 e Ladder devem manter estabilidade finita");

        const StereoFrame crossed = lr4.processMonoSubCrossover(StereoFrame{sub50, 0.0}, 140.0, 48000.0);
        if (n >= 1200) {
            const double diff = crossed.left - crossed.right;
            subDiffEnergy += diff * diff;
        }
    }
    CHECK_L4(std::sqrt(subDiffEnergy / 3600.0) < 0.025, "Crossover LR4 em 140 Hz deve colapsar 50 Hz para Mono coerente");

    // 6. Oversampler 4x (rejeição de imagem / ganho unitário em banda base)
    Oversampler4x os{};
    os.reset();
    double osRms = 0.0;
    for (int n = 0; n < 2000; ++n) {
        const double x = std::sin(2.0 * std::numbers::pi * 440.0 * static_cast<double>(n) / 48000.0);
        const auto up = os.upsample(x);
        const double down = os.downsample(up);
        if (n >= 400) osRms += down * down;
    }
    osRms = std::sqrt(osRms / 1600.0);
    CHECK_L4(std::abs(osRms - (1.0 / std::numbers::sqrt2)) < 0.03, "Oversampler 4x deve preservar ganho unitario em 440 Hz");

    // 7. Alinhador de fase Kick x Subgrave e canal de erro explícito (Lei L3)
    const auto errLag = findOptimalSubPhaseLagSamples({}, {}, 16);
    CHECK_L4(!errLag.ok() && errLag.error == ErrorCode::EmptyBuffer, "findOptimalSubPhaseLagSamples deve rejeitar buffer vazio");

    std::vector<double> refWave(512, 0.0);
    for (size_t i = 0; i < 512; ++i) {
        refWave[i] = std::sin(2.0 * std::numbers::pi * static_cast<double>(i) / 64.0);
    }
    const std::vector<double> delayedSub = applyCircularSampleShift(refWave, 9);
    const auto lagFound = findOptimalSubPhaseLagSamples(refWave, delayedSub, 20);
    CHECK_L4(lagFound.ok() && lagFound.value == -9, "Alinhador de fase deve detectar exatamente deslocamento oposto -9 samples");
    const std::vector<double> corrected = applyCircularSampleShift(delayedSub, lagFound.value);
    CHECK_L4(std::abs(corrected[17] - refWave[17]) < 1e-12, "Subgrave realinhado deve casar fase exata com a referencia");

    // 8. ChowTapeDubDelay e HadamardFdn8Reverb
    ChowTapeDubDelay delay(48000);
    delay.reset();
    HadamardFdn8Reverb fdn(48000);
    fdn.reset();
    double tailEnergy = 0.0;
    for (int n = 0; n < 6000; ++n) {
        const StereoFrame imp = (n == 0) ? StereoFrame{1.0, 0.5} : StereoFrame{0.0, 0.0};
        const StereoFrame dOut = delay.process(imp, 0.050, 0.65, 0.5, 48000.0);
        const StereoFrame rOut = fdn.process(dOut, 0.80, 2600.0, 0.45, 1.0, 48000.0);
        if (n > 2000) tailEnergy += rOut.left * rOut.left + rOut.right * rOut.right;
    }
    CHECK_L4(tailEnergy > 1e-6 && std::isfinite(tailEnergy), "ChowTapeDelay + FDN-8 devem gerar cauda espacial estereo viva e estavel");

    // 9. Diode303Filter (acumulador C13 de Accent progressivo em notas acentuadas consecutivas — G4 Plastikman)
    Diode303Filter d303{};
    d303.reset();
    d303.triggerNote(true);
    const double c13First = d303.accentCharge();
    for (int n = 0; n < 400; ++n) {
        const double out303 = d303.process((n % 64 < 32) ? 0.5 : -0.5, 220.0, 900.0, 0.78, 1.8, 192000.0);
        CHECK_L4(std::isfinite(out303), "Diode303Filter deve manter estabilidade finita a 192 kHz");
    }
    d303.triggerNote(true);
    const double c13Second = d303.accentCharge();
    CHECK_L4(c13First > 0.30 && c13Second > c13First + 0.20,
             "Diode303Filter deve acumular carga progressiva em C13 em Accents consecutivos");

    // 10. BodeFrequencyShifter e HydroNoiseGenerator
    BodeFrequencyShifter bode{};
    bode.reset();
    HydroNoiseGenerator hydro{};
    hydro.reset();
    double bodeDiffEnergy = 0.0;
    double hydroRms = 0.0;
    for (int n = 0; n < 2400; ++n) {
        const double s400 = std::sin(2.0 * std::numbers::pi * 400.0 * static_cast<double>(n) / 48000.0);
        const StereoFrame shifted = bode.process(StereoFrame{s400, s400}, 18.0, 1.0, 48000.0);
        const StereoFrame hOut = hydro.renderSample(1200.0, 0.25, 48000.0, rngA);
        CHECK_L4(std::isfinite(shifted.left) && std::isfinite(shifted.right), "BodeFrequencyShifter deve ser estavel");
        CHECK_L4(std::isfinite(hOut.left) && std::isfinite(hOut.right), "HydroNoiseGenerator deve ser estavel");
        if (n >= 400) {
            bodeDiffEnergy += (shifted.left - s400) * (shifted.left - s400);
            hydroRms += 0.5 * (hOut.left * hOut.left + hOut.right * hOut.right);
        }
    }
    CHECK_L4(bodeDiffEnergy > 10.0, "BodeFrequencyShifter +18 Hz deve deslocar efetivamente a frequencia em relacao ao tom seco");
    CHECK_L4(std::sqrt(hydroRms / 2000.0) > 0.002, "HydroNoiseGenerator deve gerar textura continua mensuravel");
}

void testProceduralBrain() {
    using namespace biofoil::audio;

    const auto badBj = computeBjorklundMask(18, 16, 0);
    CHECK_L4(!badBj.ok() && badBj.error == ErrorCode::InvalidParameter, "Bjorklund deve rejeitar pulses > steps");

    const auto kick44 = computeBjorklundMask(4, 16, 0);
    CHECK_L4(kick44.ok() && kick44.value == 0x1111U, "E(4, 16, 0) deve gerar 0x1111 (passos 0, 4, 8, 12)");

    const auto tresillo = computeBjorklundMask(3, 8, 0);
    CHECK_L4(tresillo.ok() && tresillo.value == 0x0049U, "E(3, 8, 0) deve gerar Tresillo exato 0x0049 (passos 0, 3, 6)");

    const uint16_t maskedSub = applyKickAntiMasking(0xFFFFU, kick44.value);
    CHECK_L4((maskedSub & 0x1111U) == 0U && maskedSub == 0xEEEEU, "Anti-Masking deve zerar todas as cabecas ocupadas pelo Kick");
    CHECK_L4((enforceDubOffbeatGuardrail(0x1111U) & 0x1111U) == 0U, "Trava G1 Dub nunca permite acorde nas cabecas {0,4,8,12}");

    DeterministicRng rng(999ULL);
    LockedShiftRegister reg(12345ULL);
    const auto initialSteps = reg.steps();
    reg.advanceBar(0, rng);
    reg.advanceBar(1, rng);
    reg.advanceBar(2, rng);
    for (size_t i = 0; i < 16; ++i) {
        CHECK_L4(reg.steps()[i].scaleDegreeOffset == initialSteps[i].scaleDegreeOffset,
                 "LockedShiftRegister deve permanecer 100% trancado nos compassos 0..2");
    }
    reg.advanceBar(16, rng);

    const PhraseVariant fillVar = BarAwareMarkov2::nextVariant(PhraseVariant::A1_Pocket, PhraseVariant::C1_FilterTension, 7, rng);
    CHECK_L4(fillVar == PhraseVariant::D1_TacticalReloadFill, "Barra 8 da frase deve acionar obrigatoriamente Fill de recarga D1");
    const PhraseVariant resolveVar = BarAwareMarkov2::nextVariant(PhraseVariant::C1_FilterTension, fillVar, 0, rng);
    CHECK_L4(resolveVar == PhraseVariant::A1_Pocket, "Barra 1 apos Fill deve resolver sempre em A1_Pocket");

    CHECK_L4(!quantizeMidiToScale(200, ModalScale::G_Dorian).ok(), "quantizeMidiToScale deve rejeitar MIDI > 127");
    CHECK_L4(modalRootMidiSub(ModalScale::G_Dorian) == 31, "Raiz subgrave do Ato I deve ser G1 (MIDI 31)");
    CHECK_L4(modalRootMidiSub(ModalScale::Fs_Phrygian) == 30, "Raiz subgrave do Ato II deve ser F#1 (MIDI 30)");
    CHECK_L4(modalRootMidiSub(ModalScale::F_Locrian) == 29, "Raiz subgrave do Ato III deve ser F1 (MIDI 29)");
    CHECK_L4(modalRootMidiSub(ModalScale::G_Lydian) == 31, "Raiz subgrave de T1 Epilogo Vitoria deve ser G1 (MIDI 31)");
    CHECK_L4(modalRootMidiSub(ModalScale::F_Phrygian) == 29, "Raiz subgrave de T2 Elegia Permadeath deve ser F1 (MIDI 29)");

    CHECK_L4(quantizeMidiToScale(61, ModalScale::G_Lydian).value == 61, "Do# (#4 Lidio) deve ser preservado em Sol Lidio");
    CHECK_L4(quantizeMidiToScale(60, ModalScale::G_Lydian).value != 60, "Do natural (4a justa) deve quantizar fora de Sol Lidio");
    CHECK_L4(quantizeMidiToScale(54, ModalScale::F_Phrygian).value == 54, "Solb (b2 Frigio) deve ser preservado em Fa Frigio");

    CHECK_L4(quantizeMidiToScale(55, ModalScale::Fs_Phrygian).value == 55, "Sol natural (b2) deve ser preservado em F# Frigio");
    const int q56 = quantizeMidiToScale(56, ModalScale::Fs_Phrygian).value;
    CHECK_L4(q56 == 55 || q56 == 57, "Sol# fora da escala deve quantizar para vizinho modal em F# Frigio");

    const std::array<int, 4> prevChord{{55, 58, 62, 65}};
    const std::array<int, 4> nextPcs{{0, 3, 7, 10}};
    const auto ledChord = solveMinimalVoiceLeading(prevChord, nextPcs);
    const int totalMove = std::abs(ledChord[0] - prevChord[0]) + std::abs(ledChord[1] - prevChord[1]) +
                          std::abs(ledChord[2] - prevChord[2]) + std::abs(ledChord[3] - prevChord[3]);
    CHECK_L4(ledChord[0] < ledChord[1] && ledChord[1] < ledChord[2] && ledChord[2] < ledChord[3], "Voice-leading nao pode cruzar vozes");
    CHECK_L4(totalMove <= 6, "Voice-leading Gm7 -> Cm7 deve deslizar com custo minimo <= 6 semitons totais");

    const auto kickStep0 = computeStepSampleOffset(0, 0, 120.0, 0.58, 12.0, 5.0, true, 48000.0, rng);
    const auto kickStep4 = computeStepSampleOffset(0, 4, 120.0, 0.58, 12.0, 5.0, true, 48000.0, rng);
    CHECK_L4(kickStep0.ok() && kickStep0.value == 0, "Kick no passo 0 deve cair cravado na amostra 0");
    CHECK_L4(kickStep4.ok() && kickStep4.value == 24000, "Kick no tempo 2 a 120 BPM / 48 kHz deve cair cravado na amostra 24000");

    const auto swungHat1 = computeStepSampleOffset(0, 1, 120.0, 0.575, 0.0, 0.0, false, 48000.0, rng);
    CHECK_L4(swungHat1.ok() && swungHat1.value == 6900, "Swing de 57.5% a 120 BPM deve posicionar passo 1 na amostra exata 6900");

    MusicalDirector dir{};
    dir.reset(GenreZone::G1_DubHydroChart);
    const TelemetrySnapshot crisisSnap{0.18f, 45.0f, 40.0f, FoilState::NoFoil_20kHz, 3U, 3U, true, false};
    CHECK_L4(MusicalDirector::computeInstantTension(crisisSnap) >= 0.92, "Telemetria de quase-morte/Draga F3 deve gerar tensao >= 0.92");
    const GenreZone zUp = dir.updateOnBarBoundary(crisisSnap, 2.0);
    CHECK_L4(zUp == GenreZone::G5_HardgrooveCrisis, "AI Director deve subir para G5_HardgrooveCrisis na fronteira de barra em crise");

    const TelemetrySnapshot calmSnap{1.0f, 0.0f, 100.0f, FoilState::NoFoil_20kHz, 0U, 0U, false, false};
    for (int b = 0; b < 6; ++b) {
        (void)dir.updateOnBarBoundary(calmSnap, 6.0);
    }
    CHECK_L4(dir.smoothedTension() < 0.50, "Envelope ja caiu abaixo de 0.50 no 6o compasso longo");
    CHECK_L4(dir.currentZone() == GenreZone::G5_HardgrooveCrisis,
             "Trava anti-gangorra deve impedir queda de zona no compasso 6 mesmo com tensao < 0.50 (exige >= 8 compassos)");
    for (int b = 0; b < 2; ++b) {
        (void)dir.updateOnBarBoundary(calmSnap, 6.0);
    }
    CHECK_L4(dir.currentZone() == GenreZone::G1_DubHydroChart,
             "Exatamente ao completar o 8o compasso com tensao abaixo de Schmitt, AI Director deve retornar a G1");
}

void testVoicesWorkletAndMastering() {
    using namespace biofoil::audio;

    // 1. Travas de Gênero em Vozes C++20
    const GenreRecipe recG3 = getGenreRecipe(GenreZone::G3_BioMysticGroove);
    GenreRecipe bloatedG3 = recG3;
    bloatedG3.kickDecaySec = 0.400;
    AnalogKickVoice kick{};
    kick.reset();
    kick.trigger(46.25, bloatedG3, 1.0);
    CHECK_L4(kick.lastEffectiveDecaySec() <= 0.144001, "Trava G3 deve limitar Kick Decay a <= 0.30 * T_beat (0.144s)");

    const GenreRecipe recG5 = getGenreRecipe(GenreZone::G5_HardgrooveCrisis);
    BassAndRiffVoice bass{};
    bass.reset();
    bass.triggerNote(43.65, 0.20, 0.9, false, recG5);
    CHECK_L4(bass.isSubMutedByRumbleGuardrail(), "Trava G5 deve ativar HPF anti-rumble no sintetizador de baixo");

    // 2. Contrato C ABI do WASM AudioWorklet (worklet_bindings) + Split 6 Barramentos + Spool-Up + Perfis
    biofoil_rt_init(48000.0);
    CHECK_L4(biofoil_rt_get_max_block_frames() == 1024U, "Buffer linear estatico do Worklet deve suportar 1024 frames");
    CHECK_L4(biofoil_rt_get_input_ptr() != nullptr && biofoil_rt_get_output_ptr() != nullptr, "Ponteiros scratch devem ser nao-nulos");

    biofoil_rt_push_telemetry(0.85f, 0.0f, 100.0f, 3U /* TacticalDive 400Hz */, 2U, 0U, 0U, 1U /* Salvo Ducking */);
    CHECK_L4(biofoil_rt_get_bus_cutoff_hz(0U) == 20000.0, "BUS_0 Sobrevivencia nunca abafa");
    CHECK_L4(biofoil_rt_get_bus_cutoff_hz(1U) == 400.0, "BUS_1 Armas abafa em 400 Hz no Mergulho");
    CHECK_L4(biofoil_rt_get_bus_cutoff_hz(2U) == 14000.0, "BUS_2 Cabine preserva 14000 Hz no Mergulho");
    CHECK_L4(biofoil_rt_get_bus_cutoff_hz(3U) == 380.0, "BUS_3 Ambiente abafa em 380 Hz no Mergulho");
    CHECK_L4(biofoil_rt_get_bus_cutoff_hz(4U) == 20000.0, "BUS_4 UI Tatica nunca abafa");
    CHECK_L4(biofoil_rt_get_bus_cutoff_hz(5U) == 420.0, "BUS_5 Musica abafa em 420 Hz no Mergulho");

    biofoil_rt_trigger_sonar(0.8f);
    float* inPtr = biofoil_rt_get_input_ptr();
    float* outPtr = biofoil_rt_get_output_ptr();
    for (int i = 0; i < 40; ++i) {
        for (size_t f = 0; f < 128; ++f) {
            const float s = 0.25f * std::sin(2.0f * 3.14159265f * 950.0f * static_cast<float>(f) / 48000.0f);
            inPtr[2 * f] = s;
            inPtr[2 * f + 1] = -s;
        }
        biofoil_rt_process_scratch_block(128U);
    }
    CHECK_L4(biofoil_rt_get_hydro_cutoff_hz() < 5000.0, "Worklet C ABI deve fechar filtro hidrodinamico rumo a 400 Hz no Mergulho");
    CHECK_L4(biofoil_rt_get_ducking_db() < -1.5, "Worklet C ABI deve aplicar ducking cirurgico negativo ao disparar salva");
    CHECK_L4(biofoil_rt_get_active_zone() <= 5U, "Worklet C ABI deve reportar zona valida");

    // 3_SPOOL_UP exponencial (p=0.5 -> 400 * sqrt(50) = 2828.427 Hz)
    biofoil_rt_push_telemetry(0.85f, 0.0f, 100.0f, 4U /* SpoolUp_Sweep */, 2U, 0U, 0U, 0U);
    biofoil_rt_set_spool_progress(0.5f);
    CHECK_L4(std::abs(biofoil_rt_get_bus_cutoff_hz(1U) - 2828.4271247) < 0.01, "3_SPOOL_UP em p=0.5 deve cravar 2828.43 Hz");

    // Saída Mono + Anti-Tinnitus + Perfil Noturno
    biofoil_rt_set_preferences(2U /* NOTURNO */, 1U /* monoOut */, 1U /* antiTinnitus */);
    for (size_t f = 0; f < 128; ++f) {
        inPtr[2 * f] = 0.4f * std::sin(2.0f * 3.14159265f * 4200.0f * static_cast<float>(f) / 48000.0f);
        inPtr[2 * f + 1] = 0.0f;
    }
    biofoil_rt_process_scratch_block(128U);
    CHECK_L4(std::abs(outPtr[240] - outPtr[241]) < 1e-6f, "Saida Mono deve igualar canais L e R");

    // 3. Renderização procedural completa + Masterização ITU-R BS.1770-5 em malha fechada + Escrita WAV 24-bit
    const ForgeTrackConfig cfg{
        GenreZone::G3_BioMysticGroove,
        GenreZone::G3_BioMysticGroove,
        4,
        -1,
        false,
        false,
        true,
        0xCAFEBABE2026ULL
    };
    const auto renderRes = renderProceduralTrackOffline(cfg, 48000U);
    CHECK_L4(renderRes.ok() && renderRes.value.numFrames() == 368640U,
             "4 compassos a 125 BPM / 48 kHz devem ter exatamente 368.640 frames (7.68s)");

    const auto masterRes = masterTrackClosedLoopBs1770(renderRes.value, -16.00, -1.02);
    CHECK_L4(masterRes.ok(), "Masterizacao ITU-R BS.1770-5 em malha fechada deve convergir");

    const auto metrics = analyzeAudioMetrics(masterRes.value);
    CHECK_L4(metrics.ok(), "analyzeAudioMetrics deve suceder");
    CHECK_L4(std::abs(metrics.value.integratedLufs - (-16.00)) <= 0.10,
             "Loudness Integrada masterizada deve cravar -16.00 LUFS (±0.10 LU)");
    CHECK_L4(metrics.value.truePeakDbtp <= -1.00,
             "True Peak ISP 4x deve respeitar teto estrito <= -1.00 dBTP");
    CHECK_L4(metrics.value.subMonoCorrelation >= 0.985,
             "Correlacao Mono do Subgrave (<130 Hz) deve ser >= +0.985");
    CHECK_L4(metrics.value.loopSeamDelta < 0.001,
             "Costura do Seamless Loop deve ter Loop Seam Delta < 0.001");

    const std::string tmpWav = (std::filesystem::temp_directory_path() / "biofoil_unit_test_24bit.wav").string();
    const auto wavRes = writeWav24BitFile(tmpWav, masterRes.value);
    CHECK_L4(wavRes.ok() && wavRes.value == (44U + 368640U * 6U),
             "Arquivo WAV 24-bit estereo deve ter tamanho exato 44 + frames*6 bytes");
    std::error_code rmEc{};
    std::filesystem::remove(tmpWav, rmEc);

    // 4. FormantBioLeadVoice + Render G0 e G4 + Arcos Fechados T1/T2
    FormantBioLeadVoice bioVoice{};
    bioVoice.reset();
    bioVoice.triggerPhraseNote(220.0, 0.35, 0.5, 0.85);
    double bioEnergy = 0.0;
    for (int n = 0; n < 2400; ++n) {
        const StereoFrame vf = bioVoice.renderSample(48000.0);
        CHECK_L4(std::isfinite(vf.left) && std::isfinite(vf.right), "FormantBioLeadVoice deve produzir amostras finitas");
        bioEnergy += vf.left * vf.left + vf.right * vf.right;
    }
    CHECK_L4(bioEnergy > 1e-4, "FormantBioLeadVoice deve produzir energia vocal orgânica mensurável");

    const ForgeTrackConfig cfgG0{GenreZone::G0_AbyssalAmbient, GenreZone::G0_AbyssalAmbient, 2, -1, false, false, false, 0x1111ULL};
    const auto resG0 = renderProceduralTrackOffline(cfgG0, 48000U);
    CHECK_L4(resG0.ok() && resG0.value.numFrames() == 256000U, "2 compassos a 90 BPM / 48 kHz em G0 devem ter 256.000 frames");

    const ForgeTrackConfig cfgG4{GenreZone::G4_AcidDriving, GenreZone::G4_AcidDriving, 2, -1, false, false, false, 0x4444ULL};
    const auto resG4 = renderProceduralTrackOffline(cfgG4, 48000U);
    CHECK_L4(resG4.ok() && resG4.value.numFrames() == 180000U, "2 compassos a 128 BPM / 48 kHz em G4 devem ter 180.000 frames");

    const auto badArc = renderTerminalClosedArcOffline(true, 0x99ULL, 8000U);
    CHECK_L4(!badArc.ok() && badArc.error == ErrorCode::InvalidSampleRate, "renderTerminalClosedArcOffline deve rejeitar fs < 22050 Hz");

    const auto arcT1 = renderTerminalClosedArcOffline(true, 0x71ULL, 24000U);
    const auto arcT2 = renderTerminalClosedArcOffline(false, 0x72ULL, 24000U);
    CHECK_L4(arcT1.ok() && arcT1.value.left.back() == 0.0 && arcT1.value.right.back() == 0.0,
             "T1 Epilogo Vitoria deve encerrar em silencio exato 0.000000 (arco fechado)");
    CHECK_L4(arcT2.ok() && arcT2.value.left.back() == 0.0 && arcT2.value.right.back() == 0.0,
             "T2 Elegia Permadeath deve encerrar em silencio exato 0.000000 (arco fechado)");
}

} // namespace

int main() {
    testDspCore();
    testProceduralBrain();
    testVoicesWorkletAndMastering();

    std::printf("[OK] Suite C++20 BIO-FOIL concluida com sucesso — [N4=%d assercoes literais verificadas, Zero Mock]\n",
                g_n4Assertions);
    return 0;
}
