// ─── PROJECTS: PINNED HORIZONTAL GALLERY ──────────────────
// On wide screens the project cards slide sideways while the section is
// pinned, with a progress bar under the title. Phones, tablets and
// prefers-reduced-motion keep the normal grid.
function initGallery() {
    const section = document.getElementById('projects');
    const grid = section && section.querySelector('.proj-grid');
    if (!grid) return;

    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        section.classList.add('is-horizontal');

        const bar = document.createElement('div');
        bar.className = 'proj-progress';
        bar.innerHTML = '<span class="proj-progress-fill"></span><span class="proj-progress-count">01 / ' +
            String(grid.children.length).padStart(2, '0') + '</span>';
        section.querySelector('.section-label').after(bar);
        const fill = bar.querySelector('.proj-progress-fill');
        const count = bar.querySelector('.proj-progress-count');
        const total = grid.children.length;

        // How far the row must travel so the last card ends at the right margin
        const distance = () => {
            const cs = getComputedStyle(section);
            const inner = section.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
            return Math.max(0, grid.scrollWidth - inner);
        };

        const tween = gsap.to(grid, {
            x: () => -distance(),
            ease: 'none',
            scrollTrigger: {
                trigger: section,
                start: 'top top',
                end: () => '+=' + distance(),
                pin: true,
                scrub: 0.8,
                anticipatePin: 1,
                invalidateOnRefresh: true,
                onUpdate: (self) => {
                    fill.style.transform = `scaleX(${self.progress})`;
                    const n = Math.min(total, 1 + Math.floor(self.progress * total * 0.999));
                    count.textContent = String(n).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
                },
            },
        });

        // Cards lean in slightly as they travel, for depth
        const cards = gsap.utils.toArray(grid.children);
        cards.forEach((card) => {
            gsap.fromTo(card, { rotateY: -14, z: -60, opacity: 0.35, transformPerspective: 1200 }, {
                rotateY: 0, z: 0, opacity: 1, ease: 'none',
                scrollTrigger: {
                    trigger: card,
                    containerAnimation: tween,
                    start: 'left 100%',
                    end: 'left 55%',
                    scrub: true,
                },
            });
        });

        return () => {
            section.classList.remove('is-horizontal');
            bar.remove();
            gsap.set(grid, { clearProps: 'transform' });
            cards.forEach((c) => gsap.set(c, { clearProps: 'transform,opacity' }));
        };
    });
}
