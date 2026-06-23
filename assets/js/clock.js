function initClock() {
    const el = document.getElementById('clock');
    if (!el) return;

    function tick() {
        el.textContent = new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: 'Asia/Kolkata'
        }) + ' IST';
    }

    tick();
    setInterval(tick, 1000);
}
