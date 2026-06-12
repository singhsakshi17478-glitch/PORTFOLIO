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

    // ── Scroll Tracker ───────────────────────────────────────────
    let scrollY     = window.scrollY;
    let scrollVY    = 0;
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        scrollY = window.scrollY;
    }, { passive: true });

    // ── Bouncy Ball Physics ───────────────────────────────────────
    const ball = {
        x:       window.innerWidth  * 0.55,
        y:       window.innerHeight * 0.3,
        vx:      4.5,
        vy:      2.0,
        radius:  26,
        // squash & stretch (scaleX, scaleY)
        sx:      1,
        sy:      1,
        // glow
        pulse:   0,
        pulseDir: 1,
        // trail
        trail:   [],
        // bounce impact flash
        flash:   0,
        lastBounceWall: ''   // 'floor','ceil','left','right'
    };

    // physics constants
    const GRAVITY   = 0.45;   // pulls ball down each frame
    const BOUNCE    = 0.78;   // energy kept on bounce (1 = perfect elastic)
    const FRICTION  = 0.992;  // horizontal air resistance
    const MAX_SPD_Y = 22;
    const MAX_SPD_X = 16;

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

        // ── Scroll velocity ───────────────────────────────────────
        scrollVY    = scrollY - lastScrollY;
        lastScrollY = scrollY;

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

        // ── 7 — BOUNCY BALL ──────────────────────────────────────

        // Scroll impulse — scrolling down gives the ball an upward kick
        scrollVY    = scrollY - lastScrollY;
        lastScrollY = scrollY;
        const kick = Math.max(Math.min(scrollVY, 35), -35);
        if (Math.abs(kick) > 1.5) {
            ball.vy -= kick * 1.1;   // kick up when scrolling down
            ball.vx += kick * 0.25;  // slight horizontal push
        }

        // Gravity — always pulls down
        ball.vy += GRAVITY;

        // Horizontal friction
        ball.vx *= FRICTION;

        // Speed caps
        if (ball.vy >  MAX_SPD_Y) ball.vy =  MAX_SPD_Y;
        if (ball.vy < -MAX_SPD_Y) ball.vy = -MAX_SPD_Y;
        if (ball.vx >  MAX_SPD_X) ball.vx =  MAX_SPD_X;
        if (ball.vx < -MAX_SPD_X) ball.vx = -MAX_SPD_X;

        // Move
        ball.x += ball.vx;
        ball.y += ball.vy;

        const r   = ball.radius;
        const spd = Math.hypot(ball.vx, ball.vy);

        // ── Wall bounces with squash & stretch ───────────────────
        ball.lastBounceWall = '';

        // Floor bounce
        if (ball.y + r >= canvas.height) {
            ball.y  = canvas.height - r;
            ball.vy = -Math.abs(ball.vy) * BOUNCE;
            ball.vx *= 0.93;
            // squash on floor hit — wider, shorter
            ball.sx = 1 + Math.min(Math.abs(ball.vy) * 0.045, 0.55);
            ball.sy = 1 - Math.min(Math.abs(ball.vy) * 0.045, 0.40);
            ball.flash = 1;
            ball.lastBounceWall = 'floor';
        }
        // Ceiling bounce
        if (ball.y - r <= 0) {
            ball.y  = r;
            ball.vy =  Math.abs(ball.vy) * BOUNCE;
            ball.sx = 1 + Math.min(Math.abs(ball.vy) * 0.04, 0.4);
            ball.sy = 1 - Math.min(Math.abs(ball.vy) * 0.04, 0.3);
            ball.flash = 1;
            ball.lastBounceWall = 'ceil';
        }
        // Left wall
        if (ball.x - r <= 0) {
            ball.x  = r;
            ball.vx =  Math.abs(ball.vx) * BOUNCE;
            // squash on side hit — taller, narrower
            ball.sx = 1 - Math.min(Math.abs(ball.vx) * 0.045, 0.35);
            ball.sy = 1 + Math.min(Math.abs(ball.vx) * 0.045, 0.45);
            ball.flash = 1;
            ball.lastBounceWall = 'left';
        }
        // Right wall
        if (ball.x + r >= canvas.width) {
            ball.x  = canvas.width - r;
            ball.vx = -Math.abs(ball.vx) * BOUNCE;
            ball.sx = 1 - Math.min(Math.abs(ball.vx) * 0.045, 0.35);
            ball.sy = 1 + Math.min(Math.abs(ball.vx) * 0.045, 0.45);
            ball.flash = 1;
            ball.lastBounceWall = 'right';
        }

        // Return squash/stretch to 1 smoothly (spring back)
        ball.sx += (1 - ball.sx) * 0.18;
        ball.sy += (1 - ball.sy) * 0.18;

        // Flash decay
        ball.flash *= 0.75;

        // ── Trail ────────────────────────────────────────────────
        ball.trail.push({ x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy });
        const trailMax = Math.min(8 + Math.floor(spd * 1.8), 45);
        if (ball.trail.length > trailMax) ball.trail.shift();

        for (let i = 0; i < ball.trail.length; i++) {
            const t     = i / ball.trail.length;
            const tr    = Math.max(r * t * 0.55, 1);
            const alpha = t * 0.38;
            ctx.beginPath();
            ctx.arc(ball.trail[i].x, ball.trail[i].y, tr, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(80,170,255,${alpha})`;
            ctx.fill();
        }

        // ── Glow layers ───────────────────────────────────────────
        ball.pulse += ball.pulseDir * 0.04;
        if (ball.pulse >  1) ball.pulseDir = -1;
        if (ball.pulse < -1) ball.pulseDir =  1;
        const glowR     = r * (2.8 + ball.pulse * 0.4);
        const speedFrac = Math.min(spd / 18, 1);
        const flashBoost = ball.flash * 0.15;

        [
            { r: glowR * 2.6, a: 0.05 + speedFrac * 0.04 + flashBoost, c: '0,150,255' },
            { r: glowR * 1.6, a: 0.12 + speedFrac * 0.08 + flashBoost, c: '50,130,255' },
            { r: glowR,       a: 0.26 + speedFrac * 0.12 + flashBoost, c: '130,200,255' },
        ].forEach(layer => {
            const g = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, layer.r);
            g.addColorStop(0, `rgba(${layer.c},${Math.min(layer.a, 0.55)})`);
            g.addColorStop(1, `rgba(${layer.c},0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, layer.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // ── Draw ball with squash/stretch ────────────────────────
        ctx.save();
        ctx.translate(ball.x, ball.y);
        ctx.scale(ball.sx, ball.sy);

        // Core gradient (shiny sphere look)
        const coreG = ctx.createRadialGradient(
            -r * 0.30, -r * 0.30, r * 0.05,
             0,         0,          r
        );
        coreG.addColorStop(0,   'rgba(230,245,255,0.98)');
        coreG.addColorStop(0.25,'rgba(120,195,255,0.95)');
        coreG.addColorStop(0.65,'rgba(30,110,255,0.90)');
        coreG.addColorStop(1,   'rgba(0,50,200,0.88)');
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = coreG;
        ctx.fill();

        // Specular highlight
        const specG = ctx.createRadialGradient(
            -r * 0.32, -r * 0.32, 1,
            -r * 0.28, -r * 0.28, r * 0.5
        );
        specG.addColorStop(0, 'rgba(255,255,255,0.92)');
        specG.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = specG;
        ctx.fill();

        // Bottom shadow (gives depth when near floor)
        if (ball.lastBounceWall === 'floor' || ball.y > canvas.height * 0.7) {
            const shadowAlpha = Math.min((canvas.height - ball.y) / (canvas.height * 0.3), 0.5) * 0.5;
            ctx.beginPath();
            ctx.arc(0, r * 0.6, r * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0,20,80,${shadowAlpha})`;
            ctx.fill();
        }

        ctx.restore();

        // ── Impact ring flash on bounce ───────────────────────────
        if (ball.flash > 0.05) {
            const ringR = r * (1.4 + (1 - ball.flash) * 1.2);
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ringR, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(150,220,255,${ball.flash * 0.6})`;
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }

        // ── Web lines to nearby particles ────────────────────────
        particles.forEach(p => {
            const d = Math.hypot(p.x - ball.x, p.y - ball.y);
            if (d < 130) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(120,200,255,${0.15 * (1 - d / 130)})`;
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
