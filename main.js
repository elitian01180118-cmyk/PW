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
