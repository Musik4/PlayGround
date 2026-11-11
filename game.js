const levels = [
  {
    title: 'A little <em>right</em> turn', concept: 'SEQUENCE', difficulty: '●○○', subtitle: 'Sunny-side path',
    description: 'Give your bot a few instructions, in the right order.',
    mission: 'Move to the crystal and collect it. Then find the little flag.', tip: 'Python reads your instructions from top to bottom.', hint: 'The crystal is two tiles to the right. Collect it, then keep moving right until you reach the flag.',
    start: [0, 2], goal: [4, 2], gem: [2, 2], walls: [], requireGem: true, required: [],
    starter: 'move_right()\nmove_right()\n# What should the bot do next?', target: 'Collect the crystal, then move right twice more.'
  },
  {
    title: 'Repeat after <em>me</em>', concept: 'LOOPS', difficulty: '●●○', subtitle: 'The ferny shortcut',
    description: 'Loops let you repeat a little instruction without typing it again and again.',
    mission: 'Reach the flag with one loop. Four steps down — you got this.', tip: 'range(4) repeats the indented instructions four times.', hint: 'A for loop needs a colon, then an indented move_down() on the next line. Use range(4).',
    start: [2, 0], goal: [2, 4], gem: null, walls: [], requireGem: false, required: ['loop'],
    starter: '# Repeat a move with a for loop\nfor step in range(4):\n    move_down()', target: 'Use a for loop to move down four times.'
  },
  {
    title: 'Name that <em>number</em>', concept: 'VARIABLES', difficulty: '●●○', subtitle: 'The greenway',
    description: 'A variable is a name tag for a value you want to use again.',
    mission: 'Set steps to 4, then use your variable to reach the flag.', tip: 'Give a value a name with steps = 4, then use range(steps).', hint: 'First set steps = 4. Then your loop can say: for step in range(steps):',
    start: [0, 4], goal: [4, 4], gem: null, walls: [], requireGem: false, required: ['loop', 'variable', 'variableLoop'],
    starter: '# Give the number 4 a name\nsteps = 4\nfor step in range(steps):\n    move_right()', target: 'Use the steps variable inside a for loop.'
  },
  {
    title: 'Choose your <em>path</em>', concept: 'IF / ELSE', difficulty: '●●●', subtitle: 'The wiggly way',
    description: 'Make your bot choose what to do based on what it can see.',
    mission: 'A wall blocks the way. Use if / else to find the flag.', tip: 'if is_clear(): checks ahead. else: tells the bot what to do when blocked.', hint: 'Put an if / else inside a loop: if is_clear(): move_right() else: move_up(). Indent each action.',
    start: [0, 3], goal: [3, 2], gem: null, walls: [[3, 3]], requireGem: false, required: ['loop', 'if', 'else'],
    starter: '# Look ahead before each step\nfor step in range(4):\n    if is_clear():\n        move_right()\n    else:\n        move_up()', target: 'Use a loop with if / else to get around the wall.'
  }
];

const $ = (id) => document.getElementById(id);
const editor = $('code-editor');
let current = 0;
let unlocked = 0;
let completed = new Set();
let attempts = 0;
let xp = 0;
let running = false;
let hintShown = false;
let pos = [0, 0];
let collected = false;
let route = [];

function renderLevels() {
  const list = $('level-list');
  list.innerHTML = '';
  levels.forEach((level, i) => {
    const item = document.createElement('button');
    item.className = `level-item${current === i ? ' active' : ''}${completed.has(i) ? ' done' : ''}`;
    item.type = 'button';
    item.disabled = i > unlocked || running;
    item.setAttribute('aria-label', `Level ${i + 1}: ${level.concept}${completed.has(i) ? ', completed' : ''}`);
    item.innerHTML = `<span class="level-number">${completed.has(i) ? '✓' : String(i + 1).padStart(2, '0')}</span><span class="level-copy"><strong>${['First steps', 'Do it again', 'Name it', 'Think ahead'][i]}</strong><span>${level.concept.toLowerCase()}</span></span>`;
    item.addEventListener('click', () => selectLevel(i));
    list.appendChild(item);
  });
  $('rail-count').textContent = `${String(current + 1).padStart(2, '0')} / 04`;
}

function selectLevel(index) {
  if (index > unlocked || running) return;
  current = index;
  attempts = 0;
  hintShown = false;
  const level = levels[current];
  $('lesson-tag').textContent = `LEVEL ${String(current + 1).padStart(2, '0')}`;
  $('lesson-title').innerHTML = level.title;
  $('lesson-description').textContent = level.description;
  $('lesson-concept').textContent = level.concept;
  $('difficulty').textContent = level.difficulty;
  $('board-title').textContent = level.subtitle;
  $('mission-text').textContent = level.mission;
  $('editor-tip').textContent = level.tip;
  $('hint-button').innerHTML = 'Need a hint? <span>↗</span>';
  editor.value = level.starter;
  $('unsaved-dot').classList.remove('show');
  resetBoard();
  setFeedback('✦', 'Ready when you are!', 'Add a command, then press Run code to bring your bot to life.', '', '');
  $('win-modal').classList.remove('open');
  $('win-modal').setAttribute('aria-hidden', 'true');
  renderLevels();
  updateLineNumbers();
}

function centerPercent(point) {
  return [(point[0] + .5) * 100 / 5, (point[1] + .5) * 100 / 5];
}
function positionMarker(element, point) {
  const [x, y] = centerPercent(point);
  element.style.left = `${x}%`;
  element.style.top = `${y}%`;
}
function resetBoard() {
  const level = levels[current];
  pos = [...level.start];
  collected = false;
  route = [[...pos]];
  const grid = $('board-grid');
  grid.style.gridTemplateColumns = 'repeat(5, 1fr)';
  grid.style.gridTemplateRows = 'repeat(5, 1fr)';
  grid.innerHTML = Array.from({ length: 25 }, () => '<span class="grid-cell"></span>').join('');
  $('board').querySelectorAll('.wall-marker').forEach((el) => el.remove());
  level.walls.forEach((wall) => {
    const block = document.createElement('div');
    block.className = 'wall-marker';
    block.textContent = '▧';
    block.setAttribute('aria-label', 'wall');
    positionMarker(block, wall);
    $('board').appendChild(block);
  });
  positionMarker($('bot-marker'), pos);
  positionMarker($('goal-marker'), level.goal);
  if (level.gem) {
    $('gem-marker').style.display = 'grid';
    positionMarker($('gem-marker'), level.gem);
  } else $('gem-marker').style.display = 'none';
  $('gem-marker').classList.remove('collected');
  $('trail-line').setAttribute('points', '');
  $('move-count').textContent = '0 moves';
  $('mission-badge').textContent = level.requireGem ? '0 / 2' : '0 / 1';
  $('mission-icon').textContent = level.requireGem ? '✦' : '⚑';
  $('world-status').textContent = 'READY TO RUN';
  showToast('');
}
function updateLineNumbers() {
  const count = editor.value.split('\n').length;
  $('line-numbers').textContent = Array.from({ length: count }, (_, i) => i + 1).join('\n');
}
function setFeedback(icon, title, message, kind = '', right = '') {
  const box = $('feedback');
  box.classList.remove('success', 'error');
  if (kind) box.classList.add(kind);
  $('feedback-icon').textContent = icon;
  $('feedback-title').textContent = title;
  $('feedback-message').textContent = message;
  $('feedback-right').textContent = right;
}
function showToast(message) {
  const toast = $('board-toast');
  toast.textContent = message;
  toast.classList.toggle('show', Boolean(message));
}

// A deliberately small, safe Python-like parser: only the commands taught in this game can run.
function parseProgram(source) {
  const lines = source.split('\n').map((raw, index) => {
    if (/\t/.test(raw)) throw new Error(`Line ${index + 1}: use spaces to indent your code.`);
    const content = raw.trim();
    return { raw, content, indent: raw.length - raw.trimStart().length, line: index + 1 };
  }).filter((line) => line.content && !line.content.startsWith('#'));
  let cursor = 0;
  function block(indent) {
    const nodes = [];
    while (cursor < lines.length) {
      const line = lines[cursor];
      if (line.indent < indent) break;
      if (line.indent > indent) throw new Error(`Line ${line.line}: unexpected indentation.`);
      if (line.content === 'else:') break;
      let match;
      if ((match = line.content.match(/^([A-Za-z_]\w*)\s*=\s*(\d+)$/))) {
        cursor++;
        nodes.push({ type: 'assign', name: match[1], value: Number(match[2]), line: line.line });
      } else if ((match = line.content.match(/^for\s+([A-Za-z_]\w*)\s+in\s+range\(([^()]*)\):$/))) {
        cursor++;
        if (cursor >= lines.length || lines[cursor].indent <= indent) throw new Error(`Line ${line.line}: add an indented instruction inside your loop.`);
        const body = block(lines[cursor].indent);
        nodes.push({ type: 'for', name: match[1], range: match[2].trim(), body, line: line.line });
      } else if ((match = line.content.match(/^if\s+is_clear\(\):$/))) {
        cursor++;
        if (cursor >= lines.length || lines[cursor].indent <= indent) throw new Error(`Line ${line.line}: add an indented instruction after if.`);
        const childIndent = lines[cursor].indent;
        const yes = block(childIndent);
        let no = [];
        if (cursor < lines.length && lines[cursor].indent === indent && lines[cursor].content === 'else:') {
          cursor++;
          if (cursor >= lines.length || lines[cursor].indent <= indent) throw new Error(`Line ${line.line}: add an indented instruction after else.`);
          no = block(lines[cursor].indent);
        }
        nodes.push({ type: 'if', yes, no, hasElse: no.length > 0, line: line.line });
      } else if (/^(move_(up|down|left|right)|collect)\(\)$/.test(line.content)) {
        cursor++;
        nodes.push({ type: 'command', name: line.content.slice(0, line.content.indexOf('(')), line: line.line });
      } else if (line.content === 'else:') {
        break;
      } else if (/^(for|if)\b/.test(line.content)) {
        throw new Error(`Line ${line.line}: check your Python syntax — loops and if statements end with a colon.`);
      } else {
        throw new Error(`Line ${line.line}: I don't know that instruction yet. Try a command from the list.`);
      }
    }
    return nodes;
  }
  const tree = block(0);
  if (cursor < lines.length) throw new Error(`Line ${lines[cursor].line}: check the indentation or else statement.`);
  return tree;
}
function inspect(tree) {
  const found = { loop: false, variable: false, variableLoop: false, if: false, else: false };
  function walk(nodes) {
    for (const node of nodes) {
      if (node.type === 'assign') found.variable = true;
      if (node.type === 'for') {
        found.loop = true;
        if (/^[A-Za-z_]\w*$/.test(node.range)) found.variableLoop = true;
        walk(node.body);
      }
      if (node.type === 'if') {
        found.if = true;
        found.else ||= node.hasElse;
        walk(node.yes); walk(node.no);
      }
    }
  }
  walk(tree);
  return found;
}
function runProgram(tree, level) {
  const state = { pos: [...level.start], variables: {}, collected: false, route: [[...level.start]], moves: 0, steps: 0, error: '' };
  function execute(nodes) {
    for (const node of nodes) {
      if (state.error) return;
      if (node.type === 'assign') { state.variables[node.name] = node.value; continue; }
      if (node.type === 'for') {
        const count = /^\d+$/.test(node.range) ? Number(node.range) : state.variables[node.range];
        if (count === undefined) { state.error = `Line ${node.line}: '${node.range}' needs a value first.`; return; }
        if (count > 10) { state.error = `Line ${node.line}: keep this loop to 10 or fewer steps.`; return; }
        if (count < 0) continue;
        for (let i = 0; i < count && !state.error; i++) { state.variables[node.name] = i; execute(node.body); }
        continue;
      }
      if (node.type === 'if') {
        const [dx, dy] = [1, 0];
        const next = [state.pos[0] + dx, state.pos[1] + dy];
        const clear = next[0] >= 0 && next[0] < 5 && next[1] >= 0 && next[1] < 5 && !level.walls.some((w) => w[0] === next[0] && w[1] === next[1]);
        execute(clear ? node.yes : node.no);
        continue;
      }
      if (node.name === 'collect') {
        if (level.gem && state.pos[0] === level.gem[0] && state.pos[1] === level.gem[1]) state.collected = true;
        continue;
      }
      const directions = { move_up: [0, -1], move_down: [0, 1], move_left: [-1, 0], move_right: [1, 0] };
      const [dx, dy] = directions[node.name];
      const next = [state.pos[0] + dx, state.pos[1] + dy];
      if (next[0] < 0 || next[0] > 4 || next[1] < 0 || next[1] > 4 || level.walls.some((w) => w[0] === next[0] && w[1] === next[1])) {
        state.error = `Bump! Your bot hit a wall. Try a different direction.`;
        return;
      }
      state.pos = next;
      state.route.push([...next]);
      state.moves++;
      state.steps++;
      if (state.steps > 80) { state.error = 'That is a lot of steps! Try a shorter loop.'; return; }
    }
  }
  execute(tree);
  return state;
}
function showPath(points) {
  const coords = points.map((point) => {
    const [x, y] = centerPercent(point);
    return `${x},${y}`;
  }).join(' ');
  $('trail-line').setAttribute('points', coords);
}
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function animateRun(state) {
  resetBoard();
  $('world-status').textContent = 'BOT IN MOTION';
  for (let i = 1; i < state.route.length; i++) {
    await delay(240);
    pos = state.route[i];
    positionMarker($('bot-marker'), pos);
    $('bot-marker').classList.remove('bounce');
    void $('bot-marker').offsetWidth;
    $('bot-marker').classList.add('bounce');
    showPath(state.route.slice(0, i + 1));
    $('move-count').textContent = `${i} ${i === 1 ? 'move' : 'moves'}`;
    const level = levels[current];
    if (level.gem && !collected && pos[0] === level.gem[0] && pos[1] === level.gem[1] && state.collected) {
      // Collection itself is confirmed by the program; reveal it when the bot reaches the crystal.
      collected = true;
      $('gem-marker').classList.add('collected');
      showToast('Crystal collected!');
      setTimeout(() => showToast(''), 900);
    }
  }
  await delay(130);
  collected = state.collected;
  $('mission-badge').textContent = `${(state.pos[0] === levels[current].goal[0] && state.pos[1] === levels[current].goal[1] ? 1 : 0) + (state.collected ? 1 : 0)} / ${levels[current].requireGem ? 2 : 1}`;
  if (state.collected) $('gem-marker').classList.add('collected');
  $('world-status').textContent = state.error ? 'NEEDS A TWEAK' : 'RUN COMPLETE';
  running = false;
  $('run-button').disabled = false;
  renderLevels();
  if (state.error) {
    setFeedback('!', 'Almost there!', state.error, 'error');
    return;
  }
  const level = levels[current];
  const atGoal = state.pos[0] === level.goal[0] && state.pos[1] === level.goal[1];
  const checks = inspect(parseProgram(editor.value));
  const missing = level.required.find((feature) => !checks[feature]);
  if (missing) {
    const labels = { loop: 'a for loop', variable: 'a variable assignment', variableLoop: 'your variable in range()', if: 'an if statement', else: 'an else branch' };
    setFeedback('↗', 'Your bot made a move!', `Nice start. This mission needs ${labels[missing]} too.`, '');
  } else if (!atGoal || (level.requireGem && !state.collected)) {
    setFeedback('↗', 'Good try — keep going!', level.requireGem && !state.collected ? 'Your bot needs to call collect() while it is on the crystal.' : 'Your bot is not at the flag yet. Check the direction and number of steps.');
  } else {
    winLevel(state);
  }
}
async function runCode() {
  if (running) return;
  attempts++;
  let tree, state;
  try {
    tree = parseProgram(editor.value);
    state = runProgram(tree, levels[current]);
  } catch (error) {
    setFeedback('!', 'Tiny syntax snag', error.message, 'error');
    showToast('Check your code');
    setTimeout(() => showToast(''), 1200);
    return;
  }
  running = true;
  $('run-button').disabled = true;
  renderLevels();
  await animateRun(state);
}
function winLevel(state) {
  const firstTry = attempts === 1;
  const score = firstTry ? 3 : attempts <= 3 ? 2 : 1;
  const alreadyCompleted = completed.has(current);
  if (!alreadyCompleted) {
    completed.add(current);
    xp += 25;
    $('xp-count').textContent = xp;
  }
  unlocked = Math.max(unlocked, Math.min(current + 1, levels.length - 1));
  $('streak-count').textContent = completed.size;
  $('world-status').textContent = 'MISSION COMPLETE';
  setFeedback('✓', 'That is Python in action!', 'You gave clear instructions, and your bot followed every one.', 'success', alreadyCompleted ? 'Already earned' : '+25 XP');
  $('win-emoji').textContent = ['🌟', '🪴', '🧠', '🏆'][current];
  $('win-title').textContent = ['Path found!', 'Loop-de-loop!', 'A name to remember!', 'Clever thinking!'][current];
  $('win-copy').textContent = ['Your bot collected the crystal and made it home.', 'Four moves, one tidy loop. That is the power of repetition.', 'You gave your number a name and put it to work.', 'Your bot saw the wall and chose a new way around.'][current];
  $('win-xp').textContent = alreadyCompleted ? '0' : '25';
  $('reward-stars').textContent = '★'.repeat(score) + '☆'.repeat(3 - score);
  $('next-button').innerHTML = current < levels.length - 1 ? 'Next adventure <span>→</span>' : 'Play again <span>↻</span>';
  $('next-button').onclick = () => {
    if (current < levels.length - 1) selectLevel(current + 1);
    else selectLevel(0);
  };
  renderLevels();
  $('win-modal').classList.add('open');
  $('win-modal').setAttribute('aria-hidden', 'false');
}

editor.addEventListener('input', () => {
  updateLineNumbers();
  $('unsaved-dot').classList.add('show');
});
editor.addEventListener('keydown', (event) => {
  if (event.key === 'Tab') {
    event.preventDefault();
    const start = editor.selectionStart, end = editor.selectionEnd;
    editor.setRangeText('    ', start, end, 'end');
    updateLineNumbers();
    $('unsaved-dot').classList.add('show');
  }
  if (event.key === 'Enter' && editor.selectionStart === editor.selectionEnd) {
    const lineStart = editor.value.lastIndexOf('\n', editor.selectionStart - 1) + 1;
    const indent = (editor.value.slice(lineStart, editor.selectionStart).match(/^\s*/) || [''])[0];
    if (editor.value.slice(lineStart, editor.selectionStart).trimEnd().endsWith(':')) {
      event.preventDefault();
      editor.setRangeText(`\n${indent}    `, editor.selectionStart, editor.selectionEnd, 'end');
      updateLineNumbers();
      $('unsaved-dot').classList.add('show');
    }
  }
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); runCode(); }
});
$('run-button').addEventListener('click', runCode);
$('reset-button').addEventListener('click', () => selectLevel(current));
$('hint-button').addEventListener('click', () => {
  const level = levels[current];
  $('editor-tip').textContent = level.hint;
  $('hint-button').innerHTML = 'Got it <span>✓</span>';
  hintShown = true;
});
document.querySelectorAll('.command-chip').forEach((button) => {
  button.addEventListener('click', () => {
    const text = button.dataset.insert.replace(/\\n/g, '\n');
    const start = editor.selectionStart, end = editor.selectionEnd;
    const before = editor.value.slice(0, start);
    const prefix = before && !before.endsWith('\n') ? '\n' : '';
    editor.setRangeText(prefix + text, start, end, 'end');
    updateLineNumbers();
    $('unsaved-dot').classList.add('show');
    editor.focus();
  });
});
$('win-modal').addEventListener('click', (event) => {
  if (event.target === $('win-modal')) {
    $('win-modal').classList.remove('open');
    $('win-modal').setAttribute('aria-hidden', 'true');
  }
});
selectLevel(0);
