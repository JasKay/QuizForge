const paths = {
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  book: '<path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4Z"/>',
  users: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3ZM16 4a3 3 0 0 1 0 6m1 4a5 5 0 0 1 4 5v2h-4"/>',
  review: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  zap: '<path d="m13 2-9 12h7l-1 8 10-12h-8Z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  shield: '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/>',
  swap: '<path d="M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4"/>',
  timer: '<circle cx="12" cy="14" r="8"/><path d="M9 2h6m-3 0v4m0 4v5m6-10 2 2"/>',
  link: '<path d="m10 14 4-4m-7 6-1 1a4 4 0 0 1-5-5l5-5a4 4 0 0 1 6 0m0 10a4 4 0 0 0 6 0l5-5a4 4 0 0 0-5-5l-1 1"/>',
  museum: '<path d="m12 2 10 5H2Zm-8 8v9m5-9v9m6-9v9m5-9v9M2 22h20M2 19h20"/>',
  history: '<path d="M8 21v-5l-3-2 2-3V7a6 6 0 0 1 12 0v4l-2 4v6M6 21h13"/><path d="M7 7h11m-6-4v4"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;
const arrow = icon('arrow');
const logo = '<span class="logo" aria-label="Buzzer!">Buzzer<b>!</b></span>';
const pages = ['learn', 'play', 'teams'];
let selected = pages.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'learn';
const modes = { play: 'practice', teams: 'practice' };
let teamName = 'The Quick Thinkers';
let toastTimer;

const columnArt = `<div class="museum-art" aria-hidden="true"><svg viewBox="0 0 130 220"><path d="M9 13h112v15H9zm9 18h95v14H18zm7 19h80v10H25zm7 13v126m15-126v126m18-126v126m18-126v126m16-126v126M19 192h94v12H19zm-8 15h110v12H11"/><path d="M12 13C-5 1 1-7 15 0m104 13c18-12 12-20-2-13"/></svg></div>`;
function nav(page) {
  return `<nav class="bottom-nav" aria-label="Main navigation">${pages.map((p) => `<button class="nav-button" type="button" data-nav="${p}" ${page === p ? 'aria-current="page"' : ''}>${icon(p === 'learn' ? 'book' : p === 'play' ? 'play' : 'users')}<span>${p[0].toUpperCase() + p.slice(1)}</span></button>`).join('')}</nav>`;
}
function row(title, description, symbol, action, extraClass = '') {
  return `<button class="action-row ${extraClass}" data-action="${action}" type="button"><span class="row-symbol">${icon(symbol)}</span><span class="row-copy"><strong>${title}</strong><small>${description}</small></span>${arrow}</button>`;
}
function modeSwitch(page) {
  return `<div class="mode-switch" role="tablist" aria-label="${page === 'play' ? 'Play' : 'Team'} mode">${['practice', 'competition'].map((m) => `<button type="button" role="tab" aria-selected="${modes[page] === m}" data-mode="${m}" data-page="${page}" id="${page}-${m}-tab" aria-controls="${page}-panel">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div>`;
}
function learn() {
  return `<p class="eyebrow">GOOD AFTERNOON, ALEX</p><h2 class="page-heading">Make room for<br>something new.</h2>
    <section class="feature dark learn-feature"><span class="feature-kicker">YOUR NEXT SESSION</span><h3>A world of<br>museums</h3><p>Learn 3 connections.<br>Revisit 2.</p><button class="primary" data-action="lesson">Start learning ${arrow}</button>${columnArt}</section>
    <button class="review" data-action="review">${icon('review')}<span class="row-copy"><strong>A little review</strong><small>3 ideas worth another look.</small></span>${arrow}</button>
    <h3 class="section-head">Your topics <span>Follow your curiosity</span></h3>
    <button class="action-row" data-action="lesson"><span class="thumbnail">${icon('museum')}</span><span class="row-copy"><strong>Arts & culture</strong><small>Continue exploring</small></span>${arrow}</button>
    <button class="action-row" data-action="history"><span class="thumbnail history">${icon('history')}</span><span class="row-copy"><strong>History & people</strong><small>Start a new lesson</small></span>${arrow}</button>
    <p class="quiet-note">${icon('review')} Small sessions. Lasting knowledge.</p>`;
}
function play() {
  const practice = modes.play === 'practice';
  return `<p class="eyebrow">PUT IT INTO PRACTICE</p><h2 class="page-heading">Know it.<br>Now show it.</h2>${modeSwitch('play')}
  <div role="tabpanel" id="play-panel" aria-labelledby="play-${modes.play}-tab">
    ${practice ? `<section class="feature play-feature"><h3>Ultimate<br>Challenge</h3><p class="rules">10 questions · 60 seconds</p><p>50 points per correct answer.</p><button class="primary" data-action="themes">Pick a theme ${arrow}</button><img class="buzzer-art" src="assets/buzzer.png" alt="" width="206" height="206"></section>
    <div class="play-list"><h3 class="section-head">Find your rhythm</h3>${row('Quick play', 'Five questions. No pressure.', 'zap', 'quick')}${row('Choose a category', 'Practice what interests you.', 'grid', 'categories')}</div>` : `<section class="feature competition-feature"><span class="feature-kicker">BRING YOUR BEST</span><h3>A little friendly<br>competition.</h3><p>Get your team together.<br>See what you know under pressure.</p><button class="primary" data-action="match">Arrange a match ${arrow}</button></section><p class="competition-note">Play another team in a friendly match, or explore verified school competitions.</p>${row('School competitions', 'Represent your school.', 'shield', 'school')}`}
    <button class="room-link" data-action="rooms">${icon('users')}<span class="row-copy"><strong>Play with others</strong><small>Open a room or join your friends.</small></span>${arrow}</button>
  </div>`;
}
function teams() {
  const practice = modes.teams === 'practice';
  return `<p class="eyebrow">YOUR PEOPLE</p><h2 class="page-heading">${teamName === 'The Quick Thinkers' ? 'The Quick<br>Thinkers' : escapeText(teamName)}</h2><p class="team-meta">4 members · Student team</p>
    <div class="team-roster" aria-label="Team members"><span class="member you" title="Alex — you">AJ</span><span class="member" title="Maya">MK</span><span class="member" title="Taylor">TS</span><span class="member" title="Riley">RN</span><button class="invite-button" data-action="invite">Invite +</button></div>${modeSwitch('teams')}
    <div role="tabpanel" id="teams-panel" aria-labelledby="teams-${modes.teams}-tab"><section class="feature dark team-feature"><h3>${practice ? 'Better together.' : 'Your team. Their team.'}</h3><p>${practice ? 'Work through questions.<br>Talk it out.' : 'A friendly match.<br>A little rivalry.'}</p><button class="primary" data-action="${practice ? 'team-practice' : 'match'}">${practice ? 'Start team practice' : 'Arrange a match'} ${arrow}</button><div class="overlap-art" aria-hidden="true"></div></section>
    ${row(practice ? 'Arrange a friendly match' : 'Warm up together', practice ? 'Invite another team to play.' : 'A little practice before the game.', practice ? 'swap' : 'users', practice ? 'match' : 'team-practice', 'friendly')}
    <section class="school-card">${icon('shield')}<div class="row-copy"><strong>Represent your school</strong><small>Add an affiliation when you’re ready.</small><button class="text-link" data-action="school">Explore school competitions ${arrow}</button></div></section></div>`;
}
function render() {
  document.querySelector('.screens').innerHTML = pages.map((p, i) => `<section class="screen-wrap ${selected === p ? 'selected' : ''}" data-screen="${p}" aria-label="${p[0].toUpperCase() + p.slice(1)} page"><div class="phone"><header class="phone-header">${logo}<button class="avatar" data-action="profile" aria-label="Alex’s profile">AJ</button></header><div class="page-content">${({ learn, play, teams })[p]()}</div>${nav(p)}</div><div class="screen-caption"><strong>0${i + 1} / ${p[0].toUpperCase() + p.slice(1)}</strong><span>${({ learn: 'A little wiser.', play: 'A little quicker.', teams: 'Better together.' })[p]}</span></div></section>`).join('');
}
function escapeText(text) { return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
function notify(message) {
  clearTimeout(toastTimer);
  const el = document.querySelector('.toast'); el.textContent = message; el.classList.add('visible');
  toastTimer = setTimeout(() => el.classList.remove('visible'), 3200);
}
function showSheet(title, body, content = '') {
  document.querySelector('#sheet-content').innerHTML = `<h2 class="sheet-heading" id="sheet-title">${title}</h2>${body ? `<p class="sheet-body">${body}</p>` : ''}${content}`;
  const dialog = document.querySelector('#sheet'); if (!dialog.open) dialog.showModal();
}
const closeSheet = () => document.querySelector('#sheet').close();
const sampleQuestions = [
  { question: 'In which city is the Louvre?', choices: ['Paris', 'Madrid', 'Rome', 'Athens'], answer: 'Paris', explanation: 'The Louvre is in Paris. Connect it with the Mona Lisa, one of the best-known works in its collection.' },
  { question: 'In which city is the Prado?', choices: ['London', 'Paris', 'Madrid', 'Florence'], answer: 'Madrid', explanation: 'The Prado is in Madrid. Keep this pair together: Louvre → Paris; Prado → Madrid.' },
  { question: 'In which city is the Uffizi Gallery?', choices: ['Berlin', 'Florence', 'Madrid', 'Paris'], answer: 'Florence', explanation: 'The Uffizi Gallery is in Florence, Italy. Think of Florence and its Renaissance art.' },
];
let lesson = { index: 0, correct: 0, answered: false, kind: 'learn' };
function startLesson(kind = 'learn') {
  lesson = { index: 0, correct: 0, answered: false, kind };
  if (kind === 'learn') showSheet('A world of museums', 'Three places. Three connections. Let’s build a little knowledge before we test it.', '<div class="feedback"><strong>Louvre → Paris</strong><br>Prado → Madrid<br>Uffizi → Florence</div><button class="primary sheet-primary" data-action="begin-lesson">Let’s try one '+arrow+'</button>');
  else showQuestion();
}
function showQuestion() {
  const q = sampleQuestions[lesson.index];
  if (!q) {
    showSheet('A little wiser.', `You recalled ${lesson.correct} of 3 connections. A few minutes well spent.`, '<div class="feedback">Next time, we’ll revisit these ideas in a different order. Progress in this design preview is not saved.</div><button class="primary sheet-primary" data-action="close">Back to exploring '+arrow+'</button>'); return;
  }
  lesson.answered = false;
  showSheet(q.question, `${lesson.kind === 'review' ? 'A LITTLE REVIEW' : 'MUSEUM CITIES'} · ${lesson.index + 1} OF 3`, `<div class="progress-track"><span style="width:${lesson.index / 3 * 100}%"></span></div><div class="options">${q.choices.map((c) => `<button class="option" data-answer="${c}">${c}</button>`).join('')}</div><div id="answer-feedback" aria-live="polite"></div>`);
}
function answer(value, button) {
  if (lesson.answered) return;
  lesson.answered = true; const q = sampleQuestions[lesson.index]; const correct = value === q.answer;
  if (correct) lesson.correct++;
  button.classList.add(correct ? 'correct' : 'wrong');
  document.querySelectorAll('[data-answer]').forEach((b) => { b.disabled = true; if (b.dataset.answer === q.answer) b.classList.add('correct'); });
  document.querySelector('#answer-feedback').innerHTML = `<div class="feedback"><strong>${correct ? 'That’s it.' : 'A useful connection to keep.'}</strong><br>${q.explanation}</div><button class="primary sheet-primary" data-action="next-question">${lesson.index === 2 ? 'Finish session' : 'Next question'} ${arrow}</button>`;
  document.querySelector('[data-action="next-question"]').focus();
}
const actions = {
  lesson: () => startLesson(), review: () => startLesson('review'), quick: () => startLesson('practice'),
  'begin-lesson': showQuestion, 'next-question': () => { lesson.index++; showQuestion(); }, close: closeSheet,
  history: () => showSheet('History & people', 'Follow the connections between people, places, and the moments that changed things.', '<div class="feedback"><strong>A first lesson</strong><br>Presidential before & afters · 5 minutes<br><br>This topic is a preview of the lesson-selection design.</div><button class="primary sheet-primary" data-action="themes">Explore themes '+arrow+'</button>'),
  themes: () => showSheet('One theme.<br>Sixty seconds.', '10 questions. 50 points each. Choose a theme to see the round setup.', ['I’m on a Stamp', 'Presidential Before & Afters', 'Spelling Number', 'Major Museums'].map((t) => `<button class="topic-choice" data-theme="${t}">${t} ${arrow}</button>`).join('')),
  categories: () => showSheet('Follow your curiosity.', 'Choose a subject for your next practice session.', ['Arts & culture', 'History & people', 'Science & nature', 'Geography'].map((t) => `<button class="topic-choice" data-category="${t}">${t} ${arrow}</button>`).join('')),
  rooms: () => showSheet('Make room for everyone.', 'Play with friends on your own devices.', '<button class="primary sheet-primary" data-action="room-preview">Create a practice room '+arrow+'</button><form id="join-room-form"><label class="field-label" for="room-code">Have a room code?</label><input class="text-field" id="room-code" name="room-code" placeholder="Enter a room code" maxlength="12" required autocomplete="off"><button class="primary sheet-primary" type="submit">Join room '+arrow+'</button></form>'),
  'room-preview': () => showSheet('Room ready.', 'This is a sample lobby. In the finished app, friends will use this code to join.', '<div class="invite-code">BUZZ24</div><div class="feedback"><strong>Alex · Host</strong><br>Waiting for your teammates…</div><button class="primary sheet-primary" data-action="close">Back to the design '+arrow+'</button>'),
  invite: () => showSheet('Good company.<br>Better questions.', 'Invite friends to The Quick Thinkers. This sample code shows how joining a team will feel.', '<div class="invite-code">THINK4</div><button class="primary sheet-primary" data-action="copy-invite">Copy invite code '+icon('link')+'</button>'),
  'copy-invite': async () => { try { await navigator.clipboard.writeText('THINK4'); notify('Sample invite code copied: THINK4'); } catch { notify('Sample invite code: THINK4'); } },
  'team-practice': () => showSheet('A little team warm-up.', 'Choose a topic, take turns answering, and talk through what you learn.', '<div class="feedback"><strong>The Quick Thinkers</strong><br>Alex · Maya · Taylor · Riley<br><br>Suggested topic: Museum cities</div><button class="primary sheet-primary" data-action="quick">Try the sample questions '+arrow+'</button>'),
  match: () => showSheet('A little friendly rivalry.', 'Invite another team to a friendly match. You’ll agree on a time and play format together.', '<form id="match-form"><label class="field-label" for="opponent">Other team’s name</label><input class="text-field" id="opponent" name="opponent" placeholder="Who are we playing?" required maxlength="60"><label class="field-label" for="match-time">Preferred date & time</label><input class="text-field" type="datetime-local" id="match-time" name="match-time" required><button class="primary sheet-primary" type="submit">Preview invitation '+arrow+'</button></form>'),
  school: () => showSheet('Your team.<br>Your school.', 'Personal accounts come first. School affiliation is optional; official events would require verified representation.', '<div class="feedback"><strong>A future competition experience</strong><br>School verification, approved rosters, and scheduled matches.<br><br>This concept explores where those features will live.</div><button class="primary sheet-primary" data-action="close">Got it '+arrow+'</button>'),
  profile: () => showSheet('Hey, Alex.', 'Your own account. Your own learning journey.', '<div class="feedback"><strong>Alex Jordan</strong><br>Student · The Quick Thinkers<br><br>Profile and progress are sample content in this prototype.</div><button class="primary sheet-primary" data-action="close">Keep exploring '+arrow+'</button>'),
};
document.addEventListener('click', (event) => {
  const navButton = event.target.closest('[data-nav]');
  if (navButton) {
    selected = navButton.dataset.nav; location.hash = selected;
    if (innerWidth > 800) document.body.classList.add('single');
    document.querySelector('#view-toggle').textContent = document.body.classList.contains('single') ? 'Show all three screens ↗' : 'Single screen ↗';
    render(); return;
  }
  const mode = event.target.closest('[data-mode]');
  if (mode) { const { page, mode: nextMode } = mode.dataset; modes[page] = nextMode; render(); document.querySelector(`#${page}-${nextMode}-tab`).focus(); return; }
  const answerButton = event.target.closest('[data-answer]'); if (answerButton) return answer(answerButton.dataset.answer, answerButton);
  const theme = event.target.closest('[data-theme]'); if (theme) return showSheet(escapeText(theme.dataset.theme), '10 themed questions · 60 seconds · 50 points each', '<div class="feedback">In the full game, you’ll say your answers aloud. Passes and misses return while time remains.<br><br>This mockup previews the setup; it does not start a timed game.</div><button class="primary sheet-primary" data-action="close">Back to Play '+arrow+'</button>');
  const category = event.target.closest('[data-category]'); if (category) return category.dataset.category === 'Arts & culture' ? startLesson('practice') : showSheet(escapeText(category.dataset.category), 'Your next practice session would draw questions from this subject.', '<button class="primary sheet-primary" data-action="close">Keep exploring '+arrow+'</button>');
  const action = event.target.closest('[data-action]'); if (action && actions[action.dataset.action]) actions[action.dataset.action]();
});
document.querySelector('#view-toggle').addEventListener('click', () => { const single = document.body.classList.toggle('single'); document.querySelector('#view-toggle').textContent = single ? 'Show all three screens ↗' : 'Single screen ↗'; });
document.querySelector('.close-sheet').addEventListener('click', closeSheet);
document.querySelector('#sheet').addEventListener('click', (event) => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeSheet(); } });
document.addEventListener('keydown', (event) => {
  const tab = event.target.closest('[role="tab"]');
  if (!tab || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault(); const buttons = [...tab.parentElement.querySelectorAll('[role="tab"]')]; const index = buttons.indexOf(tab);
  buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length].click();
});
document.addEventListener('submit', (event) => {
  event.preventDefault(); const form = event.target;
  if (form.id === 'join-room-form') { const code = new FormData(form).get('room-code'); showSheet('You’re at the door.', `Room ${escapeText(String(code).toUpperCase())} is selected. This design preview does not join a live room.`, '<button class="primary sheet-primary" data-action="close">Back to exploring '+arrow+'</button>'); }
  if (form.id === 'match-form') { const data = new FormData(form); showSheet('An invitation, ready.', `${escapeText(teamName)} vs ${escapeText(String(data.get('opponent')))}.`, `<div class="feedback">Preferred time: ${escapeText(String(data.get('match-time')).replace('T', ' at '))}<br><br>Preview only. No invitation has been sent.</div><button class="primary sheet-primary" data-action="close">Looks good ${arrow}</button>`); }
});
window.addEventListener('hashchange', () => { const page = location.hash.slice(1); if (pages.includes(page) && page !== selected) { selected = page; render(); } });
render();
