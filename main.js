// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Active section highlight in the sidebar
const links = [...document.querySelectorAll('.sidebar nav a')];
const sections = links.map(a => document.querySelector(a.getAttribute('href')));
const spy = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
  });
}, { rootMargin: '-35% 0px -55% 0px' });
sections.forEach(s => s && spy.observe(s));

// Four-stroke crank-slider engine
(() => {
  const $ = id => document.getElementById(id);
  const piston = $('piston'), rings = $('rings'), rod = $('rod'), wrist = $('wristpin');
  const fly = $('flywheel'), burn = $('burn');
  const strokeLabel = $('stroke-label'), angleLabel = $('angle-label');
  if (!piston) return;

  const CX = 320, CY = 250, R = 40, L = 120;
  const STROKES = ['INTAKE', 'COMPRESSION', 'POWER', 'EXHAUST'];

  function draw(phi) {                       // phi: 0..720 degrees (full 4-stroke cycle)
    const theta = (phi % 360) * Math.PI / 180;
    const px = CX + R * Math.sin(theta);
    const py = CY - R * Math.cos(theta);
    const wy = py - Math.sqrt(L * L - (px - CX) ** 2);   // wrist pin height
    piston.setAttribute('y', wy - 20);
    rings.setAttribute('transform', `translate(0 ${wy - 100})`);
    wrist.setAttribute('cy', wy);
    rod.setAttribute('x1', CX); rod.setAttribute('y1', wy);
    rod.setAttribute('x2', px); rod.setAttribute('y2', py);
    fly.setAttribute('transform', `rotate(${phi % 360} ${CX} ${CY})`);
    // combustion flash right after TDC of the power stroke
    const p = phi - 360;
    burn.setAttribute('opacity', p >= 0 && p < 70 ? (0.55 * (1 - p / 70)).toFixed(2) : 0);
    strokeLabel.textContent = STROKES[Math.floor(phi / 180) % 4];
    angleLabel.textContent = String(Math.round(phi % 360)).padStart(3, '0') + '°';
  }

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still) { draw(400); return; }

  let phi = 0, last = performance.now();
  const DEG_PER_MS = 0.22;                   // slow enough to read the strokes
  function frame(now) {
    phi = (phi + (now - last) * DEG_PER_MS) % 720;
    last = now;
    draw(phi);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
