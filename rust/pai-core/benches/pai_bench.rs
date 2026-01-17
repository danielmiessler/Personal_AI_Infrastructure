use criterion::{black_box, criterion_group, criterion_main, Criterion};
use pai_core::algorithm::{AlgorithmEngine, EffortLevel, ISCSource};
use pai_core::prosody::ProsodyEngine;

fn bench_algorithm_engine(c: &mut Criterion) {
    let engine = AlgorithmEngine::new(EffortLevel::Standard);
    
    c.bench_function("alg_add_requirement", |b| {
        b.iter(|| {
            engine.add_requirement(black_box("Test requirement"), black_box(ISCSource::Explicit));
        })
    });

    // Populate some requirements
    for _ in 0..100 {
        engine.add_requirement("Bench req", ISCSource::Explicit);
    }

    c.bench_function("alg_generate_isc_table", |b| {
        b.iter(|| {
            engine.generate_isc_table();
        })
    });
}

fn bench_prosody_engine(c: &mut Criterion) {
    let engine = ProsodyEngine::new().unwrap();
    let message = "This is a [🚨 urgent] message with [📚 learning] intent and some [code block] logic.";

    c.bench_function("prosody_detect_clean", |b| {
        b.iter(|| {
            engine.detect_and_clean(black_box(message));
        })
    });

    let complex_message = "Start with **bold** and `code` and [link](url) and 🗣️ emoji. [✨ success]";
    c.bench_function("prosody_clean_complex", |b| {
        b.iter(|| {
            engine.detect_and_clean(black_box(complex_message));
        })
    });
}

criterion_group!(benches, bench_algorithm_engine, bench_prosody_engine);
criterion_main!(benches);
