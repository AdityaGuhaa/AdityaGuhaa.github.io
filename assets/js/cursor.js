function initCursor() {
    const dot = document.getElementById('cDot');
    const ring = document.getElementById('cRing');

    // Only run on devices with a real pointer
    if (window.matchMedia('(pointer: coarse)').matches) return;

    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;

    // Dot follows instantly
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        gsap.set(dot, { x: mouseX, y: mouseY });
    });

    // Ring follows with lerp lag — gives it the floaty feel
    (function loopRing() {
        ringX += (mouseX - ringX) * 0.10;
        ringY += (mouseY - ringY) * 0.10;
        gsap.set(ring, { x: ringX, y: ringY });
        requestAnimationFrame(loopRing);
    })();

    // Expand ring on interactive elements
    const targets = 'a, button, .magnetic, [data-card]';
    document.querySelectorAll(targets).forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('is-hovering'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('is-hovering'));
    });
}
