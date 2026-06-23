function initLoader(onComplete) {
    const loader = document.getElementById('loader');
    const numEl = document.getElementById('lNum');
    const barEl = document.getElementById('lBar');

    let t0 = null;
    const DURATION = 1000; // ms — fast but satisfying

    function tick(ts) {
        if (!t0) t0 = ts;

        const progress = Math.min((ts - t0) / DURATION, 1);
        // Ease out — starts fast, slows near 100
        const eased = 1 - Math.pow(1 - progress, 2.5);
        const count = Math.floor(eased * 100);

        numEl.textContent = String(count).padStart(2, '0');
        barEl.style.width = (eased * 100) + '%';

        if (progress < 1) {
            requestAnimationFrame(tick);
        } else {
            numEl.textContent = '100';
            barEl.style.width = '100%';

            // Short pause — then curtain slides up
            setTimeout(() => {
                gsap.to(loader, {
                    yPercent: -100,
                    duration: 0.75,
                    ease: 'power4.inOut',
                    onComplete: () => {
                        loader.style.display = 'none';
                        if (typeof onComplete === 'function') onComplete();
                    }
                });
            }, 180);
        }
    }

    requestAnimationFrame(tick);
}