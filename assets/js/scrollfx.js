function initScrollFx() {
    // Respect users who turn motion off: everything is simply visible.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const sections = document.querySelectorAll('.section');

    sections.forEach(sec => {
        // The pinned project gallery animates itself; a transform here would fight the pin.
        if (sec.classList.contains('is-horizontal')) return;

        // Sections rise out of the page with a little depth and focus-pull
        gsap.fromTo(sec,
            { opacity: 0, y: 70, scale: 0.965, filter: 'blur(8px)', transformOrigin: '50% 0%' },
            {
                opacity: 1,
                y: 0,
                scale: 1,
                filter: 'blur(0px)',
                duration: 1.15,
                ease: 'power3.out',
                clearProps: 'filter,transform',
                scrollTrigger: {
                    trigger: sec,
                    start: 'top 88%',
                    toggleActions: 'play none none none'
                }
            }
        );
    });
}
