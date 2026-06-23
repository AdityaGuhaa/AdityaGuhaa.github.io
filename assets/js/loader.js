function initLoader(onComplete) {
    const loader = document.getElementById('loader');

    const numEl = document.getElementById('lNum');
    const barEl = document.getElementById('lBar');
    const timeEl = document.getElementById('lTime');

    // Start Live Clock
    const updateTime = () => {
        if (timeEl) {
            const d = new Date();
            timeEl.textContent = d.toLocaleTimeString('en-US', { hour12: true });
        }
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 1000);

    let t0 = null;
    const DURATION = 2000;

    function tick(ts) {
        if (!t0) t0 = ts;

        const progress = Math.min((ts - t0) / DURATION, 1);
        const eased = 1 - Math.pow(1 - progress, 2.5);
        const count = Math.floor(eased * 100);

        numEl.textContent = String(count).padStart(2, '0');
        barEl.style.width = (eased * 100) + '%';

        if (progress < 1) {
            requestAnimationFrame(tick);
        } else {
            numEl.textContent = '100';
            barEl.style.width = '100%';

            setTimeout(() => {
                gsap.to(loader, {
                    yPercent: -100,
                    duration: 0.85,
                    ease: 'power4.inOut',
                    onComplete: () => {
                        clearInterval(clockInterval);
                        loader.style.display = 'none';
                        if (typeof onComplete === 'function') onComplete();
                    }
                });
            }, 250);
        }
    }

    requestAnimationFrame(tick);
}