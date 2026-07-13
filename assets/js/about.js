function initAbout() {
    const el = document.getElementById('aboutP');
    if (!el) return;

    const text = "I'm a final-year AI & ML engineer who spent a summer at DRDO teaching a four-legged robot to walk from scratch — using reinforcement learning, MuJoCo, and JAX. Now I build agentic AI pipelines, run LLMs on local hardware, fine-tune models with QLoRA, and ship computer vision systems that work in the real world. When I'm not writing code, I'm breaking it all down for the internet.";

    // Wrap each word in a span for scroll-driven reveal
    el.innerHTML = text
        .split(' ')
        .map(w => `<span class="word">${w}</span>`)
        .join(' ');

    // ScrollTrigger lights up words as you scroll through
    gsap.to('#about .word', {
        opacity: 1,
        stagger: 0.025,
        ease: 'none',
        scrollTrigger: {
            trigger: '#about',
            start: 'top 70%',
            end: 'bottom 80%',
            scrub: 1.2
        }
    });
}