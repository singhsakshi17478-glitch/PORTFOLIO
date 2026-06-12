document.addEventListener('DOMContentLoaded', () => {

    // ── Canvas Setup ─────────────────────────────────────────────
    const canvas = document.getElementById('bg-canvas');
    const ctx    = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ── Mouse Tracker ────────────────────────────────────────────
    const mouse = {
        x: window.innerWidth  * 0.5,
        y: window.innerHeight * 0.5,
        vx: 0, vy: 0,          // mouse velocity (for speed-glow)
        px: window.innerWidth  * 0.5,
        py: window.innerHeight * 0.5,
        speed: 0
    };

    window.addEventListener('mousemove', e => {
        mouse.vx = e.clientX - mouse.x;
        mouse.vy = e.clientY - mouse.y;
        mouse.speed = Math.hypot(mouse.vx, mouse.vy);
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    }, { passive: true });

    // Touch support
    window.addEventListener('touchmove', e => {
        const t = e.touches[0];
        mouse.vx = t.clientX - mouse.x;
        mouse.vy = t.clientY - mouse.y;
        mouse.speed = Math.hypot(mouse.vx, mouse.vy);
        mouse.x = t.clientX;
        mouse.y = t.clientY;
    }, { passive: true });

    // ── Spring Ball (follows mouse with elastic lag) ──────────────
    const ball = {
        x:  window.innerWidth  * 0.5,
        y:  window.innerHeight * 0.5,
        vx: 0,
        vy: 0,
        radius: 22,
        pulse:    0,
        pulseDir: 1,
        trail: []
    };

    // Spring constants — tune the feel here
    const SPRING  = 0.09;   // how strongly it pulls toward cursor (0.04=lazy, 0.15=snappy)
    const DAMP    = 0.75;   // velocity damping (lower = more wobble)

    // ── Particles ────────────────────────────────────────────────
    const particles = Array.from({ length: 70 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2.5 + 1,
        dx: (Math.random() - 0.5) * 0.4,
        dy: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.5 + 0.3,
        color: Math.random() > 0.5 ? '100,160,255' : '180,210,255'
    }));

    // ── Background Orbs ──────────────────────────────────────────
    const orbs = [
        { x: 0.15, y: 0.20, r: 280, hue: '0,102,255',  speed: 0.0006, angle: 0,   range: 80  },
        { x: 0.80, y: 0.12, r: 220, hue: '0,160,255',  speed: 0.0008, angle: 1.5, range: 60  },
        { x: 0.70, y: 0.65, r: 320, hue: '30,80,200',  speed: 0.0005, angle: 0.8, range: 100 },
        { x: 0.25, y: 0.75, r: 200, hue: '0,80,180',   speed: 0.001,  angle: 3.0, range: 50  },
        { x: 0.90, y: 0.50, r: 180, hue: '60,120,255', speed: 0.0009, angle: 2.2, range: 70  },
    ];

    // ── Geometric Shapes ─────────────────────────────────────────
    const shapes = Array.from({ length: 18 }, (_, i) => ({
        type:     ['triangle', 'square', 'hexagon', 'ring', 'diamond'][i % 5],
        x:        Math.random() * canvas.width,
        y:        Math.random() * canvas.height,
        size:     Math.random() * 40 + 15,
        angle:    Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.012,
        dx:       (Math.random() - 0.5) * 0.3,
        dy:       (Math.random() - 0.5) * 0.3,
        alpha:    Math.random() * 0.35 + 0.15,
        filled:   Math.random() > 0.6,
        hue:      Math.random() > 0.5 ? '80,140,255' : '160,200,255'
    }));

    const GRID = 80;
    let frame = 0;

    function drawGrid() {
        ctx.save();
        ctx.strokeStyle = 'rgba(80,140,255,0.08)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= canvas.width; x += GRID) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y <= canvas.height; y += GRID) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(120,180,255,0.25)';
        for (let x = 0; x <= canvas.width; x += GRID) {
            for (let y = 0; y <= canvas.height; y += GRID) {
                ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.restore();
    }

    function drawHexPath(x, y, size) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i - Math.PI / 6;
            i === 0 ? ctx.moveTo(x + size * Math.cos(a), y + size * Math.sin(a))
                    : ctx.lineTo(x + size * Math.cos(a), y + size * Math.sin(a));
        }
        ctx.closePath();
    }

    function drawTriPath(x, y, size) {
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size * 0.866, y + size * 0.5);
        ctx.lineTo(x - size * 0.866, y + size * 0.5);
        ctx.closePath();
    }

    function drawDiamondPath(x, y, size) {
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size * 0.6, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size * 0.6, y);
        ctx.closePath();
    }

    function drawAll() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        frame++;

        // ── 1 — Dark gradient background ─────────────────────────
        const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        bgGrad.addColorStop(0,   '#050d1f');
        bgGrad.addColorStop(0.4, '#0a1628');
        bgGrad.addColorStop(1,   '#071022');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // ── 2 — Dot grid ─────────────────────────────────────────
        drawGrid();

        // ── 3 — Glowing orbs ─────────────────────────────────────
        orbs.forEach(orb => {
            orb.angle += orb.speed;
            const cx = orb.x * canvas.width  + Math.sin(orb.angle * 1.3) * orb.range;
            const cy = orb.y * canvas.height + Math.cos(orb.angle)       * orb.range;
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, orb.r);
            g.addColorStop(0,   `rgba(${orb.hue},0.28)`);
            g.addColorStop(0.4, `rgba(${orb.hue},0.12)`);
            g.addColorStop(1,   `rgba(${orb.hue},0)`);
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(cx, cy, orb.r, 0, Math.PI * 2); ctx.fill();
        });

        // ── 4 — Geometric shapes ─────────────────────────────────
        shapes.forEach(s => {
            s.angle += s.rotSpeed;
            s.x += s.dx; s.y += s.dy;
            if (s.x < -80) s.x = canvas.width  + 80;
            if (s.x > canvas.width  + 80) s.x = -80;
            if (s.y < -80) s.y = canvas.height + 80;
            if (s.y > canvas.height + 80) s.y = -80;

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.angle);
            ctx.globalAlpha = s.alpha;
            ctx.strokeStyle = `rgba(${s.hue}, 1)`;
            ctx.fillStyle   = `rgba(${s.hue}, 0.15)`;
            ctx.lineWidth   = 1.5;

            if      (s.type === 'triangle') drawTriPath(0, 0, s.size);
            else if (s.type === 'square')   { ctx.beginPath(); ctx.rect(-s.size/2, -s.size/2, s.size, s.size); }
            else if (s.type === 'hexagon')  drawHexPath(0, 0, s.size);
            else if (s.type === 'diamond')  drawDiamondPath(0, 0, s.size);
            else {
                ctx.beginPath(); ctx.arc(0, 0, s.size, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath(); ctx.arc(0, 0, s.size * 0.6, 0, Math.PI * 2);
            }
            if (s.filled) { ctx.fill(); ctx.stroke(); } else { ctx.stroke(); }
            ctx.restore();
        });

        // ── 5 — Particle network ─────────────────────────────────
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.hypot(dx, dy);
                if (dist < 160) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(100,160,255,${0.35 * (1 - dist / 160)})`;
                    ctx.lineWidth = 0.8;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
        particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
            ctx.fill();
            p.x += p.dx; p.y += p.dy;
            if (p.x < 0 || p.x > canvas.width)  p.dx *= -1;
            if (p.y < 0 || p.y > canvas.height)  p.dy *= -1;
        });

        // ── 6 — Drifting diagonal lines ──────────────────────────
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.strokeStyle = 'rgba(100,160,255,1)';
        ctx.lineWidth = 1;
        const offset = (frame * 0.15) % 120;
        for (let x = -canvas.height + offset; x < canvas.width + canvas.height; x += 120) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + canvas.height, canvas.height);
            ctx.stroke();
        }
        ctx.restore();

        // ── 7 — SPRING BALL (follows mouse) ─────────────────────

        // Spring physics — pull toward mouse
        ball.vx += (mouse.x - ball.x) * SPRING;
        ball.vy += (mouse.y - ball.y) * SPRING;

        // Damping — resistance so it doesn't overshoot forever
        ball.vx *= DAMP;
        ball.vy *= DAMP;

        // Move
        ball.x += ball.vx;
        ball.y += ball.vy;

        const r   = ball.radius;
        const spd = Math.hypot(ball.vx, ball.vy);

        // Trail — longer when moving fast
        ball.trail.push({ x: ball.x, y: ball.y });
        const trailMax = Math.min(10 + Math.floor(spd * 3), 50);
        if (ball.trail.length > trailMax) ball.trail.shift();

        // Draw trail
        for (let i = 0; i < ball.trail.length; i++) {
            const t     = i / ball.trail.length;
            const tr    = Math.max(r * t * 0.7, 1);
            const alpha = t * 0.4;
            ctx.beginPath();
            ctx.arc(ball.trail[i].x, ball.trail[i].y, tr, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(80,170,255,${alpha})`;
            ctx.fill();
        }

        // Pulse glow
        ball.pulse += ball.pulseDir * 0.04;
        if (ball.pulse >  1) ball.pulseDir = -1;
        if (ball.pulse < -1) ball.pulseDir =  1;

        // Speed-based brightness — glows brighter when moving fast
        const mouseSpeedFrac = Math.min(mouse.speed / 30, 1);
        const ballSpeedFrac  = Math.min(spd / 12, 1);
        const energy = Math.max(mouseSpeedFrac, ballSpeedFrac);

        const glowR = r * (3.0 + ball.pulse * 0.5 + energy * 1.5);

        // 3-layer glow
        [
            { r: glowR * 3.0, a: 0.04 + energy * 0.06, c: '0,140,255' },
            { r: glowR * 1.8, a: 0.10 + energy * 0.10, c: '60,160,255' },
            { r: glowR,       a: 0.22 + energy * 0.18, c: '140,210,255' },
        ].forEach(layer => {
            const g = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, layer.r);
            g.addColorStop(0, `rgba(${layer.c},${Math.min(layer.a, 0.6)})`);
            g.addColorStop(1, `rgba(${layer.c},0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, layer.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // Core ball — shiny sphere
        const coreG = ctx.createRadialGradient(
            ball.x - r * 0.30, ball.y - r * 0.30, r * 0.05,
            ball.x,            ball.y,             r
        );
        // Shifts from cool blue at rest to bright cyan when fast
        const rr = Math.floor(20  + energy * 60);
        const gg = Math.floor(120 + energy * 80);
        coreG.addColorStop(0,    `rgba(230,245,255,0.98)`);
        coreG.addColorStop(0.25, `rgba(${rr+100},${gg+60},255,0.95)`);
        coreG.addColorStop(0.7,  `rgba(${rr},${gg},255,0.90)`);
        coreG.addColorStop(1,    `rgba(0,50,200,0.85)`);
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
        ctx.fillStyle = coreG;
        ctx.fill();

        // Specular highlight
        const specG = ctx.createRadialGradient(
            ball.x - r * 0.32, ball.y - r * 0.32, 1,
            ball.x - r * 0.28, ball.y - r * 0.28, r * 0.52
        );
        specG.addColorStop(0, 'rgba(255,255,255,0.95)');
        specG.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
        ctx.fillStyle = specG;
        ctx.fill();

        // Thin connecting line from ball to cursor (like a rubber band)
        const distToCursor = Math.hypot(mouse.x - ball.x, mouse.y - ball.y);
        if (distToCursor > r * 2) {
            ctx.beginPath();
            ctx.moveTo(ball.x, ball.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(120,200,255,${Math.min(0.15, distToCursor / 800)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Web lines to nearby particles
        particles.forEach(p => {
            const d = Math.hypot(p.x - ball.x, p.y - ball.y);
            if (d < 140) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(120,200,255,${0.18 * (1 - d / 140)})`;
                ctx.lineWidth = 0.6;
                ctx.moveTo(ball.x, ball.y);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
            }
        });

        requestAnimationFrame(drawAll);
    }
    drawAll();

    // ── Navbar Scroll & Active Link ───────────────────────────────
    const navbar   = document.getElementById('navbar');
    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('section[id], header[id]');

    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 30);

        // Highlight active nav link based on scroll position
        let current = '';
        sections.forEach(sec => {
            const top = sec.offsetTop - 120;
            if (window.scrollY >= top) current = sec.id;
        });
        navLinks.forEach(a => {
            a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
        });
    }, { passive: true });

    // Smooth scroll nav links (keep default anchor, just update history)
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                const top = target.getBoundingClientRect().top + window.scrollY - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72);
                window.scrollTo({ top, behavior: 'smooth' });
            }
            // Close mobile menu
            navLinksEl.classList.remove('open');
            mobileBtn.classList.remove('open');
        });
    });

    // ── Mobile Menu ───────────────────────────────────────────────
    const mobileBtn  = document.getElementById('mobile-menu-btn');
    const navLinksEl = document.getElementById('nav-links');

    mobileBtn.addEventListener('click', () => {
        navLinksEl.classList.toggle('open');
        mobileBtn.classList.toggle('open');
    });

    // ── Scroll Reveal (IntersectionObserver) ─────────────────────
    const reveals = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    reveals.forEach(el => revealObserver.observe(el));

    // ── Accordion ─────────────────────────────────────────────────
    document.querySelectorAll('.accordion-trigger').forEach(trigger => {
        trigger.addEventListener('click', () => {
            const body      = trigger.nextElementSibling;
            const isOpen    = trigger.getAttribute('aria-expanded') === 'true';
            const parentList = trigger.closest('.accordion-list');

            // Close all siblings in the same list
            if (parentList) {
                parentList.querySelectorAll('.accordion-trigger').forEach(t => {
                    if (t !== trigger) {
                        t.setAttribute('aria-expanded', 'false');
                        t.nextElementSibling.classList.remove('open');
                    }
                });
            }

            trigger.setAttribute('aria-expanded', String(!isOpen));
            body.classList.toggle('open', !isOpen);
        });
    });

    // ── Video Modal ───────────────────────────────────────────────
    const videoModal        = document.getElementById('video-modal');
    const videoModalOverlay = document.getElementById('video-modal-overlay');
    const videoClose        = document.getElementById('video-close');
    const introVideo        = document.getElementById('intro-video');

    // "Learn More" / hero section scroll — hero doesn't open video, use View Work btn
    // If you want the hero "View Work" to open the video instead, swap the href below
    function openVideoModal() {
        videoModal.classList.add('open');
        document.body.style.overflow = 'hidden';
        introVideo.play();
    }
    function closeVideoModal() {
        videoModal.classList.remove('open');
        document.body.style.overflow = '';
        introVideo.pause();
        introVideo.currentTime = 0;
    }

    const watchIntroBtn = document.getElementById('watch-intro-btn');
    if (watchIntroBtn) watchIntroBtn.addEventListener('click', openVideoModal);

    videoClose.addEventListener('click', closeVideoModal);
    videoModalOverlay.addEventListener('click', closeVideoModal);

    // ── Resume Modal ──────────────────────────────────────────────
    const resumeModal        = document.getElementById('resume-modal');
    const resumeModalOverlay = document.getElementById('resume-modal-overlay');
    const resumeClose        = document.getElementById('resume-close');
    const resumePrintBtn     = document.getElementById('resume-print-btn');

    function openResumeModal() {
        resumeModal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function closeResumeModal() {
        resumeModal.classList.remove('open');
        document.body.style.overflow = '';
    }

    ['download-resume-btn', 'download-resume-btn-hero', 'download-resume-btn-contact'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); openResumeModal(); });
    });

    resumeClose.addEventListener('click', closeResumeModal);
    resumeModalOverlay.addEventListener('click', closeResumeModal);
    resumePrintBtn.addEventListener('click', () => window.print());

    // ── Certificate Lightbox ──────────────────────────────────────
    const certificates = [
        { title: 'Python Certificate 1',    src: 'cert1.jpg.jpeg' },
        { title: 'Python Certificate 2',    src: 'cert2.jpg.jpeg' },
        { title: 'DSA Certificate',         src: 'cert3.jpg.jpeg' },
        { title: 'Reverse Code Certificate',src: 'cert4.jpg.jpeg' },
        { title: 'Code Debugging',          src: 'cert5.jpg.jpeg' },
        { title: 'Certificate 6',           src: 'cert6.jpeg'     },
    ];

    let currentCertIndex = 0;

    const certModal     = document.getElementById('cert-modal');
    const certOverlay   = document.getElementById('cert-modal-overlay');
    const certModalImg  = document.getElementById('cert-modal-img');
    const certPlaceholder = document.getElementById('cert-modal-placeholder');
    const certCloseBtn  = document.getElementById('cert-close');
    const certPrev      = document.getElementById('cert-prev');
    const certNext      = document.getElementById('cert-next');
    const certCounter   = document.getElementById('cert-counter');

    function loadCert(index) {
        const cert = certificates[index];
        certModalImg.classList.remove('loaded');
        certPlaceholder.style.display = 'none';
        certModalImg.style.transform = cert.rotate ? `rotate(${cert.rotate}deg)` : '';
        certModalImg.onload  = () => { certModalImg.classList.add('loaded'); certPlaceholder.style.display = 'none'; };
        certModalImg.onerror = () => {
            certModalImg.classList.remove('loaded');
            certPlaceholder.style.display = 'block';
            certPlaceholder.innerHTML = `📄 <strong>${cert.title}</strong><br><small>Image not found: <strong>${cert.src}</strong></small>`;
        };
        certModalImg.src = cert.src;
        certModalImg.alt = cert.title;
        certCounter.textContent = `${index + 1} / ${certificates.length}`;
        certPrev.disabled = index === 0;
        certNext.disabled = index === certificates.length - 1;
    }

    function openCertModal(index) {
        currentCertIndex = index;
        certModal.classList.add('open');
        document.body.style.overflow = 'hidden';
        loadCert(currentCertIndex);
    }
    function closeCertModal() {
        certModal.classList.remove('open');
        document.body.style.overflow = '';
        certModalImg.src = '';
        certModalImg.classList.remove('loaded');
    }

    document.querySelectorAll('.btn-view-cert').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            openCertModal(parseInt(btn.closest('.cert-card').dataset.index));
        });
    });
    document.querySelectorAll('.cert-card').forEach(card => {
        card.addEventListener('click', () => openCertModal(parseInt(card.dataset.index)));
    });
    certCloseBtn.addEventListener('click', closeCertModal);
    certOverlay.addEventListener('click', closeCertModal);
    certPrev.addEventListener('click', () => { if (currentCertIndex > 0) loadCert(--currentCertIndex); });
    certNext.addEventListener('click', () => { if (currentCertIndex < certificates.length - 1) loadCert(++currentCertIndex); });

    // ── Global Keyboard ───────────────────────────────────────────
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (certModal.classList.contains('open'))    closeCertModal();
            if (resumeModal.classList.contains('open'))  closeResumeModal();
            if (videoModal.classList.contains('open'))   closeVideoModal();
        }
        if (certModal.classList.contains('open')) {
            if (e.key === 'ArrowLeft'  && currentCertIndex > 0)                       loadCert(--currentCertIndex);
            if (e.key === 'ArrowRight' && currentCertIndex < certificates.length - 1) loadCert(++currentCertIndex);
        }
    });

});
