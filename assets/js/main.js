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
        if (typeof initGallery === 'function') initGallery();  // before scrollfx: it pins #projects
        call(initScrollFx);

        // Signal module scripts (robot.js) that the page is laid out
        window.__siteReady = true;
        window.dispatchEvent(new Event('site:ready'));
    });

});
