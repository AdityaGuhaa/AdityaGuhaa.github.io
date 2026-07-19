function initHero() {
    const hl1 = document.getElementById('hl1');
    if (!hl1) {
        // Just fade nav in if hero is missing
        gsap.to('#nav', { opacity: 1, duration: 0.7, delay: 0.1, ease: 'power2.out' });
        return;
    }

    // Split "ADITYA" and "GUHA" into individual character spans
    function splitToChars(text, containerEl) {
        containerEl.innerHTML = '';
        [...text].forEach(ch => {
            const span = document.createElement('span');
            span.className = 'hero-char';
            span.textContent = ch === ' ' ? '\u00A0' : ch;
            containerEl.appendChild(span);
        });
    }

    splitToChars('ADITYA', document.getElementById('hl1'));
    splitToChars('GUHA', document.getElementById('hl2'));

    // Chars shoot up from below — staggered
    gsap.fromTo('.hero-char',
        { y: 100, opacity: 0 },
        {
            y: 0,
            opacity: 1,
            duration: 0.9,
            stagger: 0.042,
            ease: 'power3.out',
            delay: 0.1
        }
    );

    // Photo fades in
    gsap.to('#heroPhoto', {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: 0.6,
        ease: 'power3.out'
    });

    // Bottom bar fades in after name lands
    gsap.to('.hero-bottom', {
        opacity: 1,
        y: 0,
        duration: 0.7,
        delay: 0.85,
        ease: 'power2.out'
    });

    // Nav fades in
    gsap.to('#nav', {
        opacity: 1,
        duration: 0.7,
        delay: 0.6,
        ease: 'power2.out'
    });

    // Glow blobs drift in subtly
    gsap.to('.blob-1', { opacity: 1, duration: 3, delay: 0.8, ease: 'power2.out' });
    gsap.to('.blob-2', { opacity: 1, duration: 3, delay: 1.1, ease: 'power2.out' });
}