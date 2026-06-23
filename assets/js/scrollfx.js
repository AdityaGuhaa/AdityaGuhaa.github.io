function initScrollFx() {
    const sections = document.querySelectorAll('.section');
    
    sections.forEach(sec => {
        gsap.fromTo(sec, 
            { opacity: 0, y: 50 }, 
            { 
                opacity: 1, 
                y: 0, 
                duration: 1, 
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: sec,
                    start: 'top 85%',
                    toggleActions: 'play none none none'
                }
            }
        );
    });
}
