await build(); await initP2();
await Promise.all([document.fonts.load('900 100px Serif'), document.fonts.load('800 40px Sans'), document.fonts.load('30px InsI')]);
window.__ready = true;
