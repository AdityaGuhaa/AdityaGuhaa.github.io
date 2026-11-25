// ─── INTERACTIVE ROBOT DOG ────────────────────────────────
// A procedurally built quadruped (no model files) rendered with three.js
// into a small transparent canvas that is moved around the page.
//
//  • Desktop: drops onto the top of "ADITYA", patrols the letters, follows
//    the cursor and looks at it. Scroll down and it leaps into the
//    bottom-right corner as a companion that steps in place while you scroll.
//  • Phones: stands next to the photo.
//  • Hover → wave + happy eyes. Click / tap → hop and spin.
//  • prefers-reduced-motion: stands still, only the head follows the cursor.
//  • No WebGL or a load failure → nothing is added; the page is unchanged.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;

// ── Proportions (world units) ──
const STAND = 0.5;            // body centre height when standing
const L1 = 0.27, L2 = 0.27;   // thigh / shin
const FOOT_R = 0.038;
const ROBOT_H = 0.68;         // ground → top of head
const HIP = { x: 0.34, y: -0.07, z: 0.245 };
const ASPECT = 1.5;           // canvas width / height
const BLUE = 0x2997ff;

// Facing angles (yaw about +y; 0 = facing screen-right in profile)
const FACE_RIGHT = -0.32;
const FACE_LEFT = -Math.PI + 0.32;
const QUARTER_RIGHT = -0.78;
const QUARTER_LEFT = -Math.PI + 0.78;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
const wrapAngle = (a) => ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
const angleDamp = (a, b, rate, dt) => a + wrapAngle(b - a) * (1 - Math.exp(-rate * dt));
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const rand = (a, b) => a + Math.random() * (b - a);

function webglAvailable() {
    try {
        const c = document.createElement('canvas');
        return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch { return false; }
}

// ─── MODEL ────────────────────────────────────────────────
function buildRobot() {
    const M = {
        shell: new THREE.MeshPhysicalMaterial({ color: 0xf3f3f5, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 }),
        dark: new THREE.MeshStandardMaterial({ color: 0x2b2b30, roughness: 0.42, metalness: 0.6 }),
        visor: new THREE.MeshPhysicalMaterial({ color: 0x08080a, roughness: 0.06, metalness: 0.3, clearcoat: 1 }),
        rubber: new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.85 }),
        glow: new THREE.MeshBasicMaterial({ color: BLUE, toneMapped: false }),
        ring: new THREE.MeshBasicMaterial({ color: BLUE, toneMapped: false, transparent: true }),
    };
    const box = (w, h, d, r, mat, seg = 4) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, r), mat);
    const cyl = (rt, rb, h, mat, seg = 24) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);

    const root = new THREE.Group();   // ground + yaw
    const body = new THREE.Group();   // torso, moves up/down
    root.add(body);

    // Soft contact shadow
    const sc = document.createElement('canvas');
    sc.width = sc.height = 128;
    const g = sc.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(0,0,0,0.5)');
    grd.addColorStop(0.55, 'rgba(0,0,0,0.16)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const shadowMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false, opacity: 0.55 });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.78), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.001;
    root.add(shadow);

    // Torso
    body.add(box(0.95, 0.24, 0.42, 0.08, M.shell));
    const belly = box(0.78, 0.07, 0.36, 0.03, M.dark);
    belly.position.y = -0.11;
    body.add(belly);
    const plate = box(0.52, 0.03, 0.27, 0.012, M.dark, 3);
    plate.position.set(-0.04, 0.122, 0);
    body.add(plate);
    for (const s of [-1, 1]) {
        const led = box(0.4, 0.014, 0.006, 0.003, M.glow, 2);
        led.position.set(-0.02, 0.035, s * 0.212);
        body.add(led);
    }
    const puck = cyl(0.062, 0.066, 0.05, M.dark);
    puck.position.set(-0.26, 0.155, 0);
    body.add(puck);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.0055, 8, 40), M.ring);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(-0.26, 0.17, 0);
    body.add(ring);

    // Head on a neck pivot
    const neck = new THREE.Group();
    neck.position.set(0.42, 0.05, 0);
    neck.rotation.order = 'YZX';
    body.add(neck);
    const head = box(0.25, 0.19, 0.32, 0.07, M.shell);
    head.position.set(0.1, 0.03, 0);
    neck.add(head);
    const visor = box(0.035, 0.13, 0.26, 0.014, M.visor, 3);
    visor.position.set(0.215, 0.03, 0);
    neck.add(visor);
    const eyes = [];
    for (const s of [-1, 1]) {
        const e = box(0.012, 0.05, 0.05, 0.012, M.glow, 2);
        e.position.set(0.234, 0.04, s * 0.062);
        neck.add(e);
        eyes.push(e);
    }
    const chin = box(0.06, 0.04, 0.14, 0.015, M.dark, 2);
    chin.position.set(0.17, -0.07, 0);
    neck.add(chin);

    // Legs: hip motor → thigh → knee → shin → foot
    const legs = [];
    for (const [fx, fz, name] of [[1, 1, 'FR'], [1, -1, 'FL'], [-1, 1, 'RR'], [-1, -1, 'RL']]) {
        const hip = new THREE.Group();
        hip.position.set(fx * HIP.x, HIP.y, fz * HIP.z);
        body.add(hip);
        const motor = cyl(0.058, 0.058, 0.075, M.dark);
        motor.rotation.x = Math.PI / 2;
        hip.add(motor);
        const cap = cyl(0.038, 0.038, 0.079, M.shell);
        cap.rotation.x = Math.PI / 2;
        hip.add(cap);

        const thighP = new THREE.Group();
        hip.add(thighP);
        const thigh = box(0.085, L1 + 0.06, 0.07, 0.034, M.shell);
        thigh.position.y = -L1 / 2;
        thighP.add(thigh);

        const kneeP = new THREE.Group();
        kneeP.position.y = -L1;
        thighP.add(kneeP);
        const knee = cyl(0.036, 0.036, 0.072, M.dark);
        knee.rotation.x = Math.PI / 2;
        kneeP.add(knee);
        const shin = cyl(0.03, 0.022, L2, M.dark, 16);
        shin.position.y = -L2 / 2;
        kneeP.add(shin);
        const foot = new THREE.Mesh(new THREE.SphereGeometry(FOOT_R, 20, 14), M.rubber);
        foot.position.y = -L2;
        kneeP.add(foot);

        // Trot: diagonal pairs (FR+RL) and (FL+RR) move together
        legs.push({ name, fx, fz, thighP, kneeP, phase: name === 'FR' || name === 'RL' ? 0 : 0.5 });
    }

    return { root, body, neck, eyes, legs, shadowMat, M };
}

// Two-link planar IK in the body's sagittal plane. Knees bend backwards.
function solveLeg(leg, dx, dy) {
    const d = clamp(Math.hypot(dx, dy), 0.08, L1 + L2 - 1e-3);
    const a = Math.atan2(dx, -dy);
    const b = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const k = Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
    leg.thighP.rotation.z = a - b;
    leg.kneeP.rotation.z = Math.PI - k;
}

// ─── APP ──────────────────────────────────────────────────
function start() {
    const hl1 = document.getElementById('hl1');
    if (!hl1 || !webglAvailable()) return;

    // DOM
    const canvas = document.createElement('canvas');
    canvas.className = 'robot-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const hit = document.createElement('div');
    hit.className = 'robot-hit';
    hit.setAttribute('aria-hidden', 'true');
    document.body.append(canvas, hit);

    // Renderer / scene
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d8de, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(1.5, 3, 2.5);
    scene.add(key);

    const camera = new THREE.PerspectiveCamera(23, ASPECT, 0.1, 20);
    const tilt = THREE.MathUtils.degToRad(9);
    camera.position.set(0, 0.34 + 2.6 * Math.sin(tilt), 2.6 * Math.cos(tilt));
    camera.lookAt(0, 0.34, 0);
    camera.updateMatrixWorld();

    const R = buildRobot();
    scene.add(R.root);

    // Where the feet (world origin) and the head top land inside the canvas
    const project = (x, y, z) => new THREE.Vector3(x, y, z).project(camera);
    const pFeet = project(0, 0, 0);
    const pTop = project(0, ROBOT_H, 0);
    const FEET_FX = (pFeet.x + 1) / 2;
    const FEET_FY = (1 - pFeet.y) / 2;
    const H_FRAC = (pTop.y - pFeet.y) / 2; // robot height as a fraction of canvas height

    // ── Layout ──
    const L = {};
    function measure() {
        L.vw = innerWidth;
        L.vh = innerHeight;
        const nav = document.getElementById('nav');
        L.navH = nav ? nav.getBoundingClientRect().height : 60;
        const sy = scrollY;

        // Cap-height line of "ADITYA" (independent of the char animation)
        const cs = getComputedStyle(hl1);
        const fs = parseFloat(cs.fontSize);
        const lh = parseFloat(cs.lineHeight) || fs * 0.84;
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
        const m = ctx.measureText('DIT');
        const asc = m.fontBoundingBoxAscent ?? fs * 0.95;
        const desc = m.fontBoundingBoxDescent ?? fs * 0.25;
        const capAsc = m.actualBoundingBoxAscent ?? fs * 0.72;
        const line = hl1.getBoundingClientRect();
        const baseline = line.top + sy + (lh - (asc + desc)) / 2 + asc;
        const capTop = baseline - capAsc;

        const chars = hl1.querySelectorAll('.hero-char');
        const first = chars[0]?.getBoundingClientRect();
        const last = chars[chars.length - 1]?.getBoundingClientRect();
        const photo = document.getElementById('heroPhoto')?.getBoundingClientRect();
        const content = document.querySelector('.hero-content')?.getBoundingClientRect();

        const room = capTop - L.navH;
        if (first && room >= 115 && L.vw >= 700) {
            L.kind = 'letters';
            L.heroPx = clamp(room - 34, 90, Math.min(160, L.vw * 0.11));
            const half = 0.62 * L.heroPx / ROBOT_H * 0.75;
            L.xMin = first.left + half;
            L.xMax = last.right - half;
            L.groundY = capTop - 0.05 * L.heroPx;      // page coords; lifted so near feet sit on the letters
            if (chars[1] && chars[2]) {
                L.startX = (chars[1].getBoundingClientRect().right + chars[2].getBoundingClientRect().left) / 2;
            } else {
                L.startX = (L.xMin + L.xMax) / 2;
            }
        } else if (photo && content && content.right - photo.right >= 140) {
            L.kind = 'side';
            L.heroPx = clamp((content.right - photo.right) * 0.48, 70, 110);
            L.xMin = L.xMax = L.startX = (photo.right + content.right) / 2 + 6;
            L.groundY = photo.bottom + sy;
        } else {
            L.kind = 'none';
            L.heroPx = 90;
        }
        L.companionOK = !REDUCED && L.vw >= 900;
        // Leap to the corner once the robot starts sliding under the nav bar
        L.leapAt = L.kind === 'letters' ? Math.max(60, L.groundY - L.navH - 0.45 * L.heroPx) : L.vh * 0.22;
        L.compPx = clamp(L.vw * 0.06, 72, 96);
        L.basePx = Math.max(L.heroPx, L.compPx);

        // Canvas pixel size (at scale 1 == basePx tall robot)
        L.ch = Math.round(L.basePx / H_FRAC);
        L.cw = Math.round(L.ch * ASPECT);
        renderer.setSize(L.cw, L.ch, false);
        canvas.style.width = L.cw + 'px';
        canvas.style.height = L.ch + 'px';
    }

    // ── State ──
    const S = {
        mode: L.kind === 'none' ? 'off' : 'hero',
        x: 0, y: 0, s: 1,                 // feet position on screen (px) + scale
        px: 0, pv: 0,                     // patrol x (page px) + velocity
        target: 0, idleUntil: 0,
        yaw: QUARTER_RIGHT,
        headYaw: 0, headPitch: 0,
        gait: { phase: 0, amp: 0, stride: 0, lift: 0.06, rate: 0 },
        tuck: 0, wave: 0, happy: 0,
        sq: 0, sqV: 0,                    // landing squash spring
        blinkAt: 0, blink: 0,
        gazeX: 0, gazeY: 0, gazeAt: 0,
        leap: null, hop: null, spawn: null,
        hovered: false,
        lastScroll: scrollY, scrollV: 0,
        opacity: 0,
    };
    const pointer = { x: -1, y: -1, t: -1e9 };

    measure();
    if (L.kind === 'none') S.mode = 'off';
    S.px = L.startX;
    S.target = L.startX;
    S.yaw = L.kind === 'side' ? QUARTER_LEFT : QUARTER_RIGHT;

    // Pick the starting mode from the current scroll position
    if (L.companionOK && scrollY > L.leapAt) S.mode = 'companion';
    if (S.mode !== 'off') S.spawn = { t: 0, dur: REDUCED ? 0.01 : 0.75 };

    // ── Targets per mode ──
    function heroTarget() {
        return { x: S.px, y: L.groundY - scrollY, s: L.heroPx / L.basePx };
    }
    function companionTarget() {
        const footer = document.getElementById('footer');
        const fTop = footer ? footer.getBoundingClientRect().top : Infinity;
        const s = L.compPx / L.basePx;
        return {
            x: L.vw - 40 - 0.62 * L.compPx / ROBOT_H,
            y: Math.min(L.vh - 38, fTop - 24),
            s,
        };
    }
    const targetFor = (mode) => (mode === 'companion' ? companionTarget() : heroTarget());

    function startLeap(to) {
        S.leap = { t: 0, dur: 0.95, from: { x: S.x, y: S.y, s: S.s }, to, dir: to === 'companion' ? 1 : -1 };
        S.mode = to;
        if (to === 'hero') {
            // land somewhere sensible on the letters
            S.px = clamp(S.px, L.xMin, L.xMax);
            S.pv = 0;
        }
    }

    // ── Input ──
    addEventListener('pointermove', (e) => {
        if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
            pointer.x = e.clientX; pointer.y = e.clientY; pointer.t = performance.now();
        }
    }, { passive: true });
    addEventListener('pointerdown', (e) => {
        // touch: glance at where the finger went down
        if (e.pointerType === 'touch') { S.gazeX = e.clientX; S.gazeY = e.clientY; S.gazeAt = performance.now() + 1800; }
    }, { passive: true });

    hit.addEventListener('mouseenter', () => { S.hovered = true; document.body.classList.add('is-hovering'); });
    hit.addEventListener('mouseleave', () => { S.hovered = false; document.body.classList.remove('is-hovering'); });
    hit.addEventListener('click', () => {
        S.happy = 1;
        if (REDUCED || S.hop || S.leap || S.spawn) return;
        S.hop = { t: 0, dur: 0.62 };
    });

    let resizeT;
    addEventListener('resize', () => {
        clearTimeout(resizeT);
        resizeT = setTimeout(() => {
            const prevKind = L.kind;
            measure();
            S.px = clamp(S.px, L.xMin, L.xMax);
            if (L.kind === 'none') S.mode = 'off';
            else if (S.mode === 'off' || prevKind !== L.kind) { S.mode = 'hero'; S.px = L.startX; }
            if (!L.companionOK && S.mode === 'companion') S.mode = 'hero';
        }, 150);
    });

    // ── Loop ──
    let last = performance.now();
    let running = true;
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    });

    function frame(now) {
        if (document.hidden) { running = false; return; }
        requestAnimationFrame(frame);
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const time = now / 1000;

        // Scroll speed (Lenis updates window.scrollY)
        const sy = scrollY;
        const sv = (sy - S.lastScroll) / Math.max(dt, 1e-3);
        S.lastScroll = sy;
        S.scrollV = damp(S.scrollV, sv, 10, dt);

        if (S.mode === 'off') { canvas.style.opacity = '0'; hit.style.display = 'none'; return; }

        // Mode switches (hysteresis so it doesn't flicker)
        if (L.companionOK && !S.leap && !S.spawn) {
            if (S.mode === 'hero' && sy > L.leapAt) startLeap('companion');
            else if (S.mode === 'companion' && sy < L.leapAt * 0.5) startLeap('hero');
        }

        const ppuBase = L.basePx / ROBOT_H; // px per world unit at scale 1
        const pointerFresh = FINE && now - pointer.t < 2500 && pointer.x >= 0;
        let walking = false, marching = false, surfaceV = 0;

        // ── Patrol on the letters ──
        if (S.mode === 'hero' && L.kind === 'letters' && !REDUCED && !S.leap && !S.spawn) {
            const heroBottom = L.groundY + L.vh; // page y: anything above this counts as "in the hero"
            const pointerInHero = pointerFresh && pointer.y + sy < heroBottom;
            if (S.hovered || S.hop) {
                S.target = S.px;
            } else if (pointerInHero && Math.abs(pointer.x - S.px) > L.heroPx * 0.9) {
                S.target = clamp(pointer.x, L.xMin, L.xMax);
                S.idleUntil = now + rand(1500, 3000);
            } else if (now > S.idleUntil && Math.abs(S.target - S.px) < 4 && !pointerInHero) {
                let t = rand(L.xMin, L.xMax);
                if (Math.abs(t - S.px) < L.heroPx) t = S.px < (L.xMin + L.xMax) / 2 ? L.xMax : L.xMin;
                S.target = t;
                S.idleUntil = now + rand(2600, 5200);
            }
            const vmax = L.heroPx * 1.55;
            const want = clamp((S.target - S.px) * 2.4, -vmax, vmax);
            S.pv = damp(S.pv, Math.abs(S.target - S.px) < 3 ? 0 : want, 5, dt);
            S.px = clamp(S.px + S.pv * dt, L.xMin, L.xMax);
            surfaceV = S.pv;
            walking = Math.abs(S.pv) > 12;
        }

        // ── Screen placement ──
        let tgt = targetFor(S.mode);
        let air = 0, spin = 0;
        if (S.spawn) {
            S.spawn.t += dt / S.spawn.dur;
            const k = Math.min(1, S.spawn.t);
            const drop = Math.max(260, tgt.y + 120);
            S.x = tgt.x; S.s = tgt.s;
            S.y = tgt.y - drop * (1 - k * k);
            air = 1 - k;
            S.tuck = -0.4 * (1 - k); // legs reach down while falling
            if (k >= 1) { S.spawn = null; if (!REDUCED) S.sqV = 4.2; }
        } else if (S.leap) {
            const Lp = S.leap;
            Lp.t += dt / Lp.dur;
            const k = Math.min(1, Lp.t);
            const e = easeInOut(k);
            S.x = lerp(Lp.from.x, tgt.x, e);
            S.s = lerp(Lp.from.s, tgt.s, e);
            const dist = Math.hypot(tgt.x - Lp.from.x, tgt.y - Lp.from.y);
            // arc up, but keep the robot's head on screen at the peak
            const headroom = Math.min(Lp.from.y, tgt.y) - L.basePx * Math.max(Lp.from.s, tgt.s) - 12;
            const arc = clamp(Math.min(240, 80 + dist * 0.3), 30, Math.max(30, headroom));
            S.y = lerp(Lp.from.y, tgt.y, e) - arc * 4 * k * (1 - k);
            air = Math.sin(Math.PI * k);
            spin = Lp.dir * 2 * Math.PI * e;
            S.tuck = air;
            if (k >= 1) { S.leap = null; S.sqV = 4.5; S.tuck = 0; }
        } else {
            const follow = S.mode === 'companion' ? 9 : 30;
            S.x = damp(S.x, tgt.x, follow, dt);
            S.y = S.mode === 'companion' ? damp(S.y, tgt.y, follow, dt) : tgt.y;
            S.s = damp(S.s, tgt.s, 8, dt);
            S.tuck = damp(S.tuck, 0, 10, dt);
        }
        if (S.hop) {
            S.hop.t += dt / S.hop.dur;
            const k = Math.min(1, S.hop.t);
            const peak = clamp(S.y - L.basePx * S.s - 10, 24, 0.7 * L.basePx * S.s);
            const h = peak * 4 * k * (1 - k);
            S.y -= h;
            air = Math.max(air, Math.sin(Math.PI * k));
            spin += 2 * Math.PI * easeInOut(k);
            S.tuck = Math.max(S.tuck, Math.sin(Math.PI * k) * 0.9);
            if (k >= 1) { S.hop = null; S.sqV = 3.6; }
        }

        const ppu = ppuBase * S.s;

        // Companion: step in place while the page scrolls
        if (S.mode === 'companion' && !S.leap && Math.abs(S.scrollV) > 60) marching = true;
        // Phones: little steps while the hero scrolls by
        if (S.mode === 'hero' && L.kind === 'side' && !REDUCED && Math.abs(S.scrollV) > 80) marching = true;

        // ── Facing ──
        let yawT;
        if (walking) yawT = surfaceV > 0 ? FACE_RIGHT : FACE_LEFT;
        else if (S.mode === 'companion') yawT = QUARTER_LEFT;
        else if (L.kind === 'side') yawT = QUARTER_LEFT;
        else if (pointerFresh) yawT = pointer.x < S.x ? QUARTER_LEFT : QUARTER_RIGHT;
        else yawT = Math.abs(wrapAngle(S.yaw - QUARTER_LEFT)) < Math.abs(wrapAngle(S.yaw - QUARTER_RIGHT)) ? QUARTER_LEFT : QUARTER_RIGHT;
        const yawErr = Math.abs(wrapAngle(yawT - S.yaw));
        S.yaw = REDUCED ? yawT : angleDamp(S.yaw, yawT, 5, dt);
        const turning = !REDUCED && yawErr > 0.35 && !S.leap && !S.hop && !S.spawn;

        // ── Gait ──
        const G = S.gait;
        const moving = walking || marching || turning;
        G.amp = damp(G.amp, moving && !REDUCED ? 1 : 0, 6, dt);
        G.stride = damp(G.stride, walking ? 0.2 : 0, 6, dt);
        G.lift = walking ? 0.075 : 0.055;
        if (walking) G.rate = (Math.abs(surfaceV) / ppu) / (2 * 0.2);
        else if (moving) G.rate = 2.3;
        if (G.amp > 0.01) G.phase = (G.phase + G.rate * dt) % 1;

        // ── Landing squash (spring) ──
        S.sqV += (-60 * S.sq - 9 * S.sqV) * dt;
        S.sq += S.sqV * dt;

        // ── Body ──
        const breathe = REDUCED ? 0 : 0.006 * Math.sin(time * 1.7);
        const bob = 0.012 * G.amp * Math.cos(4 * Math.PI * G.phase);
        const bodyY = STAND + breathe + bob - 0.1 * clamp(S.sq, -0.5, 1) - 0.04 * Math.max(0, S.tuck);
        R.body.position.y = bodyY;
        S.wave = damp(S.wave, S.hovered && !walking && !S.hop && !S.leap && !REDUCED ? 1 : 0, 6, dt);
        R.body.rotation.z = 0.09 * S.wave;
        R.body.rotation.x = 0.03 * G.amp * Math.sin(2 * Math.PI * G.phase);
        R.root.rotation.y = S.yaw + spin;

        // Which front leg faces the camera (for the wave): local +z is the robot's right side
        const frontNear = Math.cos(S.yaw) > 0 ? 'FR' : 'FL';

        // ── Legs ──
        for (const leg of R.legs) {
            const t = (G.phase + leg.phase) % 1;
            let gx, gy;
            if (t < 0.5) { gx = G.stride * (0.5 - t / 0.5); gy = 0; }
            else { const s = (t - 0.5) / 0.5; gx = G.stride * (easeInOut(s) - 0.5); gy = G.lift * Math.sin(Math.PI * s); }
            let dx = gx * G.amp;
            let dy = FOOT_R + gy * G.amp - (bodyY + HIP.y);
            const tuck = S.tuck;
            if (tuck > 0) { dx = lerp(dx, leg.fx * 0.03, tuck); dy = lerp(dy, -0.21, tuck); }
            else if (tuck < 0) { dy = lerp(dy, -(L1 + L2) * 0.97, -tuck); }
            if (leg.name === frontNear && S.wave > 0.01) {
                const w = Math.sin(time * 11);
                dx = lerp(dx, 0.2 + 0.05 * w, S.wave);
                dy = lerp(dy, -0.1 + 0.06 * w, S.wave);
            }
            solveLeg(leg, dx, dy);
        }

        // ── Head: look at the cursor (or around, on touch) ──
        let gx, gyy;
        const headX = S.x + 0.55 * Math.cos(S.yaw) * ppu;
        const headY = S.y - 0.6 * ppu;
        if (pointerFresh) { gx = pointer.x - headX; gyy = pointer.y - headY; }
        else if (now < S.gazeAt) { gx = S.gazeX - headX; gyy = S.gazeY - headY; }
        else {
            if (now > S.gazeAt + 2500 && !REDUCED) { S.gazeX = headX + rand(-320, 320); S.gazeY = headY + rand(-160, 90); S.gazeAt = now + rand(900, 1800); }
            gx = 0; gyy = 0;
        }
        const D = 650;
        const gazeYaw = Math.atan2(-D, gx);               // yaw that points the head at the gaze target
        let relYaw = clamp(wrapAngle(gazeYaw - (S.yaw + spin)), -1.1, 1.1);
        let pitch = clamp(Math.atan2(-gyy, Math.hypot(gx, D)), -0.45, 0.5);
        if (walking) { relYaw *= 0.4; pitch *= 0.4; }
        S.headYaw = damp(S.headYaw, relYaw, 7, dt);
        S.headPitch = damp(S.headPitch, pitch, 7, dt);
        R.neck.rotation.y = S.headYaw;
        R.neck.rotation.z = S.headPitch + 0.06 * S.wave;

        // ── Eyes: blink + happy squint ──
        if (!REDUCED && now > S.blinkAt) { S.blink = 1; S.blinkAt = now + rand(2400, 5600); }
        S.blink = Math.max(0, S.blink - dt * 7);
        S.happy = damp(S.happy, S.hovered ? 1 : 0, 6, dt);
        const blinkK = S.blink > 0 ? 1 - Math.sin(S.blink * Math.PI) : 1;
        for (const e of R.eyes) {
            e.scale.y = Math.max(0.12, blinkK * lerp(1, 0.32, S.happy));
            e.position.y = 0.04 + 0.012 * S.happy;
        }
        R.M.ring.opacity = REDUCED ? 0.9 : 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(time * 2.4));
        R.shadowMat.opacity = 0.55 * (1 - 0.75 * clamp(air, 0, 1));

        // ── Place the canvas + hit area ──
        const cw = L.cw * S.s, ch = L.ch * S.s;
        const left = S.x - FEET_FX * cw;
        const top = S.y - FEET_FY * ch;
        canvas.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0) scale(${S.s.toFixed(4)})`;

        const robotPx = L.basePx * S.s;
        const onScreen = top < L.vh && top + ch > 0 && left < L.vw && left + cw > 0;
        S.opacity = damp(S.opacity, onScreen ? 1 : 0, 8, dt);
        canvas.style.opacity = S.opacity.toFixed(3);

        if (onScreen && !S.leap && !S.spawn) {
            const hw = robotPx * 1.35, hh = robotPx * 0.95;
            hit.style.display = 'block';
            hit.style.transform = `translate3d(${(S.x - hw / 2).toFixed(1)}px, ${(S.y - hh).toFixed(1)}px, 0)`;
            hit.style.width = hw.toFixed(0) + 'px';
            hit.style.height = hh.toFixed(0) + 'px';
        } else {
            hit.style.display = 'none';
        }

        if (onScreen) renderer.render(scene, camera);
    }

    S.x = heroTarget().x; S.y = heroTarget().y; S.s = heroTarget().s;
    if (S.mode === 'companion') { const c = companionTarget(); S.x = c.x; S.y = c.y; S.s = c.s; }
    requestAnimationFrame(frame);

    // expose a tiny handle for debugging in the console
    window.__robot = { S, L };
}

function whenSiteReady(fn) {
    if (window.__siteReady) fn();
    else window.addEventListener('site:ready', fn, { once: true });
}

whenSiteReady(() => {
    // let the hero letters land first
    setTimeout(() => {
        try { start(); } catch (err) { console.warn('[robot] disabled:', err); }
    }, REDUCED ? 100 : 1300);
});
