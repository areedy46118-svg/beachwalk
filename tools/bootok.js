/* the page came up at all: the game's module evaluated and its loop ran (a syntax error in main.js is a black screen) */
for (let i = 0; i < 200 && !(b && b.state); i++) await sleep(100);
log('booted', !!(b && b.state), b && b.state ? JSON.stringify({ started: b.state().started }) : '');
