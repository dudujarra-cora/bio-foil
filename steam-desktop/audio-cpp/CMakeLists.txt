cmake_minimum_required(VERSION 3.20)
project(biofoil_audio VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_compile_options(-Wall -Wextra -Werror -O3)

if(EMSCRIPTEN)
    add_executable(biofoil_audio_worklet
        src/dsp_core.cpp
        src/procedural_brain.cpp
        src/voices_and_genres.cpp
        wasm/worklet_bindings.cpp
    )
    target_include_directories(biofoil_audio_worklet PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
    )
    set_target_properties(biofoil_audio_worklet PROPERTIES
        SUFFIX ".wasm"
        LINK_FLAGS "--no-entry -sSTANDALONE_WASM=1 -sALLOW_MEMORY_GROWTH=0 -sINITIAL_MEMORY=4194304 -sEXPORTED_FUNCTIONS='[\"_biofoil_rt_init\",\"_biofoil_rt_push_telemetry\",\"_biofoil_rt_set_spool_progress\",\"_biofoil_rt_set_preferences\",\"_biofoil_rt_trigger_sonar\",\"_biofoil_rt_process_interleaved\",\"_biofoil_rt_process_scratch_block\",\"_biofoil_rt_get_input_ptr\",\"_biofoil_rt_get_output_ptr\",\"_biofoil_rt_get_max_block_frames\",\"_biofoil_rt_get_active_zone\",\"_biofoil_rt_get_hydro_cutoff_hz\",\"_biofoil_rt_get_bus_cutoff_hz\",\"_biofoil_rt_get_ducking_db\"]'"
    )
else()
    add_library(biofoil_audio STATIC
        src/dsp_core.cpp
        src/procedural_brain.cpp
        src/voices_and_genres.cpp
        src/loudness_mastering.cpp
        wasm/worklet_bindings.cpp
    )
    target_include_directories(biofoil_audio PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
    )

    add_executable(biofoil_forge_cli tools/biofoil_forge_cli.cpp)
    target_link_libraries(biofoil_forge_cli PRIVATE biofoil_audio)

    enable_testing()
    add_executable(test_biofoil_audio tests/test_biofoil_audio.cpp)
    target_link_libraries(test_biofoil_audio PRIVATE biofoil_audio)
    add_test(NAME BiofoilAudioSuite COMMAND test_biofoil_audio)
endif()
