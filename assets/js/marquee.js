function initMarquee() {
    const track = document.getElementById('mqTrack');
    if (!track) return;

    const items = [
        'LOCAL LLMs', 'AGENTIC AI', 'REINFORCEMENT LEARNING', 'ROBOTICS',
        'MUJOCO', 'CUDA', 'LLAMA.CPP', 'COMPUTER VISION', 'FINE-TUNING',
        'RAG PIPELINES', 'FASTAPI', 'HARDWARE BUILDS', 'YOUTUBE SHORTS',
        'INSTAGRAM REELS', 'OPEN SOURCE', 'PYTHON', 'C++', 'EDGE INFERENCE',
        'QLORA', 'SPEAKER DIARIZATION', 'OLLAMA', 'STABLE DIFFUSION', 'DRDO'
    ];

    // Build one set of items
    const html = items.map(item =>
        `<span class="mq-item">${item}</span><span class="mq-dot">·</span>`
    ).join('');

    // Duplicate for seamless infinite loop
    track.innerHTML = html + html;
}