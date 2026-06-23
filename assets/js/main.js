// ─── GSAP SETUP ───────────────────────────────────────────
gsap.registerPlugin(ScrollTrigger);

// ─── UTILITY ──────────────────────────────────────────────
function call(fn) {
    if (typeof fn === 'function') fn();
}

// ─── BOOT SEQUENCE ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    call(initClock);
    call(initCursor);

    initLoader(() => {
        call(initLenis);
        call(initHero);
        call(initMarquee);
        call(initAbout);
        call(initCards);
        call(initMagnetic);
        call(initScrollFx);
    });

});