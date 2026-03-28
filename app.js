
'use strict';

/* ── Constants  */
const DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

/* ── App State  */
const state = {
  tasks:     { daily: [], weekly: [], monthly: [] },
  activeTab: 'daily',
  search:    '',
  calDate:   new Date(),
};
state.calDate.setDate(1);   // always start on the 1st

/* MODULE: Storage */
const Storage = {
  KEY: 'taskr_v3',

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) {
        Object.assign(state.tasks, JSON.parse(raw));
      } else {
        this._seed();
      }
    } catch {
      this._seed();
    }
  },

  save() {
    localStorage.setItem(this.KEY, JSON.stringify(state.tasks));
  },

  _seed() {
    const t = Clock.shortTime(new Date());
    state.tasks = {
      daily: [
        { id: 1, text: 'Review project requirements',     priority: 'high',   done: false, created: t },
        { id: 2, text: 'Team standup & sync notes',       priority: 'medium', done: true,  created: t },
        { id: 3, text: 'Update component documentation',  priority: 'low',    done: false, created: t },
      ],
      weekly: [
        { id: 4, text: 'Sprint planning session',         priority: 'high',   done: false, day: 0, created: t },
        { id: 5, text: 'Code review & merge pull requests',priority: 'medium', done: false, day: 2, created: t },
        { id: 6, text: 'Weekly retrospective',            priority: 'medium', done: false, day: 4, created: t },
        { id: 7, text: 'Personal project deep work',      priority: 'low',    done: false, day: 5, created: t },
      ],
      monthly: [
        { id: 8,  text: 'Complete portfolio website',     priority: 'high',   done: false, created: t },
        { id: 9,  text: 'Master a new framework',         priority: 'medium', done: false, created: t },
        { id: 10, text: 'Read two technical books',       priority: 'low',    done: false, created: t },
      ],
    };
    this.save();
  },
};

/* MODULE: Clock  — live, exact to the second */
const Clock = {
  _timer: null,

  init() {
    this._tick();                          // fire immediately
    this._scheduleNext();                  // then align to the next wall-second
  },

  /* Align timer to the exact start of each real second */
  _scheduleNext() {
    const msUntilNextSecond = 1000 - (Date.now() % 1000);
    setTimeout(() => {
      this._tick();
      this._timer = setInterval(() => this._tick(), 1000);
    }, msUntilNextSecond);
  },

  _tick() {
    const now = new Date();
    const hms = this.fullTime(now);
    const dstr = this.longDate(now);

    // Sidebar clock
    setText('clock',        hms);
    setText('date-display', dstr);

    // Mobile header clock
    setText('mob-clock', hms);
  },

  /** Returns "HH:MM:SS" (24-hour, always 2 digits) */
  fullTime(d) {
    return [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map(n => String(n).padStart(2, '0'))
      .join(':');
  },

  /** Returns e.g. "Thu, Mar 26, 2026" */
  longDate(d) {
    return d.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  },

  /** Returns e.g. "09:45 AM" — stored when a task is created */
  shortTime(d) {
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  },
};

/* MODULE: Tasks  — CRUD & helpers */
const Tasks = {
  _nextId() {
    const all = [...state.tasks.daily, ...state.tasks.weekly, ...state.tasks.monthly];
    return all.length ? Math.max(...all.map(t => t.id)) + 1 : 1;
  },

  add(type, fields) {
    state.tasks[type].push({
      id:      this._nextId(),
      done:    false,
      created: Clock.shortTime(new Date()),
      ...fields,
    });
    Storage.save();
    Render.all();
  },

  toggle(type, id) {
    const task = state.tasks[type].find(t => t.id === id);
    if (!task) return;
    task.done = !task.done;
    Storage.save();
    Render.all();
  },

  remove(type, id) {
    const el = document.querySelector(`.task-item[data-id="${id}"]`);
    const doRemove = () => {
      state.tasks[type] = state.tasks[type].filter(t => t.id !== id);
      Storage.save();
      Render.all();
    };
    if (el) {
      el.classList.add('removing');
      setTimeout(doRemove, 200);
    } else {
      doRemove();
    }
  },

  updateText(type, id, newText) {
    const task = state.tasks[type].find(t => t.id === id);
    if (task && newText.trim()) {
      task.text = newText.trim();
      Storage.save();
    }
  },

  /** Filter list by current search query */
  filtered(list) {
    if (!state.search) return list;
    const q = state.search.toLowerCase();
    return list.filter(t => t.text.toLowerCase().includes(q));
  },

  /** Compute stats for any task list */
  stats(list) {
    const total   = list.length;
    const done    = list.filter(t => t.done).length;
    const pct     = total ? Math.round((done / total) * 100) : 0;
    const high    = list.filter(t => t.priority === 'high' && !t.done).length;
    const pending = total - done;
    return { total, done, pct, high, pending };
  },
};

/* DOM helpers */
const $  = id => document.getElementById(id);
const setText  = (id, v)    => { const el=$(id); if(el) el.textContent=v; };
const setHtml  = (id, v)    => { const el=$(id); if(el) el.innerHTML=v; };
const setWidth = (id, pct)  => { const el=$(id); if(el) el.style.width=pct+'%'; };
const setOffset= (id, val)  => { const el=$(id); if(el) el.style.strokeDashoffset=val; };

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function checkSvg() {
  return `<svg class="check-svg" width="10" height="8" viewBox="0 0 10 8" fill="none">
    <path d="M1 4 3.5 6.5 9 1" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function emptyHtml(msg) {
  return `<div class="empty">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2
               M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5a2 2 0 002 2h2a2 2 0 002-2"/>
    </svg>
    ${escHtml(msg)}
  </div>`;
}

function taskHtml(type, t) {
  const dayTag = (type === 'weekly' && t.day !== undefined)
    ? `<span class="day-tag">${DAYS[t.day]}</span>`
    : '';

  return `
    <div class="task-item ${t.done ? 'done' : ''}" data-id="${t.id}"
         onclick="Tasks.toggle('${type}', ${t.id})">
      <div class="checkbox">${t.done ? checkSvg() : ''}</div>
      <span class="task-text"
            onclick="event.stopPropagation()"
            ondblclick="UI.editInline(event,'${type}',${t.id})">${escHtml(t.text)}</span>
      ${dayTag}
      <span class="pri pri-${t.priority}">${t.priority}</span>
      <span class="task-time">${t.created}</span>
      <button class="del-btn"
              title="Delete"
              onclick="event.stopPropagation(); Tasks.remove('${type}', ${t.id})">✕</button>
    </div>`;
}

/* MODULE: Render */
const Render = {
  all() {
    this.daily();
    this.weekly();
    this.monthly();
    this.badges();
  },

  /* ── Daily ── */
  daily() {
    const tasks = Tasks.filtered(state.tasks.daily);
    const s     = Tasks.stats(tasks);

    // Score ring — circumference of r=30 is ~188.5
    const C      = 2 * Math.PI * 30;
    const offset = C - (s.pct / 100) * C;
    setOffset('ring-fill', offset.toFixed(2));
    setText('score-pct', s.pct + '%');

    // Metrics
    setText('m-total',   s.total);
    setText('m-done',    s.done);
    setText('m-high',    s.high);
    setText('m-pending', s.pending);

    // Progress
    setWidth('d-progress', s.pct);
    setText('d-pct', s.pct + '%');

    // Groups
    for (const p of ['high', 'medium', 'low']) {
      const list = tasks.filter(t => t.priority === p);
      setHtml('daily-' + p,
        list.length ? list.map(t => taskHtml('daily', t)).join('') : emptyHtml(`No ${p} priority tasks`));
    }
  },

  /* ── Weekly ── */
  weekly() {
    const tasks = Tasks.filtered(state.tasks.weekly);
    const s     = Tasks.stats(tasks);

    setText('w-done',  s.done);
    setText('w-total', s.total);
    setWidth('w-progress', s.pct);
    setText('w-pct', s.pct + '%');

    // Week strip
    const now     = new Date();
    const rawDow  = now.getDay();                   // 0 = Sunday
    const todayI  = rawDow === 0 ? 6 : rawDow - 1; // Monday-based

    const strip = $('week-strip');
    if (strip) {
      strip.innerHTML = DAYS.map((d, i) => {
        const date     = new Date(now);
        date.setDate(now.getDate() - todayI + i);
        const dayTasks = tasks.filter(t => t.day === i);
        const bars     = dayTasks.map(t =>
          `<div class="dc-bar ${t.priority} ${t.done ? 'faded' : ''}"></div>`
        ).join('');
        return `
          <div class="day-card ${i === todayI ? 'today' : ''}">
            <div class="dc-name">${d}</div>
            <div class="dc-num">${date.getDate()}</div>
            ${bars}
          </div>`;
      }).join('');
    }

    setHtml('weekly-list',
      tasks.length ? tasks.map(t => taskHtml('weekly', t)).join('') : emptyHtml('No weekly tasks yet'));
  },

  /* ── Monthly ── */
  monthly() {
    const tasks = Tasks.filtered(state.tasks.monthly);
    const s     = Tasks.stats(tasks);

    setText('mo-done',  s.done);
    setText('mo-total', s.total);
    setWidth('mo-progress', s.pct);
    setText('mo-pct', s.pct + '%');

    // Calendar heading
    const cd = state.calDate;
    setText('cal-month', `${MONTHS[cd.getMonth()]} ${cd.getFullYear()}`);

    // Calendar grid
    const calEl = $('calendar-grid');
    if (calEl) {
      // Day-of-week headers
      let html = DAYS.map(d => `<div class="cal-head">${d[0]}</div>`).join('');

      const firstDow  = new Date(cd.getFullYear(), cd.getMonth(), 1).getDay();
      const padStart  = firstDow === 0 ? 6 : firstDow - 1;
      const prevTotal = new Date(cd.getFullYear(), cd.getMonth(), 0).getDate();
      const monthLen  = new Date(cd.getFullYear(), cd.getMonth() + 1, 0).getDate();
      const today     = new Date();
      const isCurrent = cd.getMonth() === today.getMonth() && cd.getFullYear() === today.getFullYear();

      // Filler before month starts
      for (let i = padStart - 1; i >= 0; i--) {
        html += `<div class="cal-cell ghost"><div class="cal-num">${prevTotal - i}</div></div>`;
      }

      // Actual days
      for (let d = 1; d <= monthLen; d++) {
        const isToday = isCurrent && d === today.getDate();
        const dots    = isToday
          ? tasks.slice(0, 6).map(t =>
              `<div class="cal-dot ${t.done ? 'faded' : ''}"></div>`
            ).join('')
          : '';
        html += `
          <div class="cal-cell ${isToday ? 'today-c' : ''}">
            <div class="cal-num">${d}</div>
            ${isToday ? `<div class="cal-dots">${dots}</div>` : ''}
          </div>`;
      }

      // Trailing filler
      const filled   = padStart + monthLen;
      const trailing = filled % 7 === 0 ? 0 : 7 - (filled % 7);
      for (let d = 1; d <= trailing; d++) {
        html += `<div class="cal-cell ghost"><div class="cal-num">${d}</div></div>`;
      }

      calEl.innerHTML = html;
    }

    setHtml('monthly-list',
      tasks.length ? tasks.map(t => taskHtml('monthly', t)).join('') : emptyHtml('No monthly goals yet'));
  },

  /* ── Badges (pending count on nav items) ── */
  badges() {
    for (const type of ['daily', 'weekly', 'monthly']) {
      const pending = state.tasks[type].filter(t => !t.done).length;
      setText('badge-' + type, pending);
    }
  },
};

/* MODULE: UI  — interactions & navigation */
const UI = {
  switchTab(tab) {
    state.activeTab = tab;

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

    const view = $('view-' + tab);
    const btn  = document.querySelector(`.nav-item[data-tab="${tab}"]`);
    if (view) view.classList.add('active');
    if (btn)  btn.classList.add('active');

    // Close mobile sidebar on tab switch
    this.closeSidebar();
  },

  addTask(type) {
    const key   = type[0];
    const input = $(`${key}-input`);
    const text  = input?.value.trim();
    if (!text) { input?.focus(); return; }

    const fields = {
      text,
      priority: $(`${key}-priority`)?.value ?? 'medium',
    };
    if (type === 'weekly') {
      fields.day = parseInt($('w-day')?.value ?? '0', 10);
    }

    Tasks.add(type, fields);
    input.value = '';
    input.focus();
  },

  /** Double-click a task text span to edit it inline */
  editInline(event, type, id) {
    event.stopPropagation();
    const el = event.target;
    el.contentEditable = 'true';
    el.focus();

    // Select all text
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);

    const commit = () => {
      el.contentEditable = 'false';
      Tasks.updateText(type, id, el.textContent);
      off();
    };
    const cancel = () => {
      el.contentEditable = 'false';
      Render.all();
      off();
    };
    const onKeyDown = e => {
      if (e.key === 'Enter')  { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { cancel(); }
    };
    const off = () => {
      el.removeEventListener('blur',    commit);
      el.removeEventListener('keydown', onKeyDown);
    };

    el.addEventListener('blur',    commit,    { once: true });
    el.addEventListener('keydown', onKeyDown);
  },

  /* Mobile sidebar */
  openSidebar() {
    $('sidebar').classList.add('open');
    $('backdrop').classList.add('visible');
  },

  closeSidebar() {
    $('sidebar').classList.remove('open');
    $('backdrop').classList.remove('visible');
  },

  toggleSidebar() {
    $('sidebar').classList.contains('open')
      ? this.closeSidebar()
      : this.openSidebar();
  },
};

/* Events */
function initEvents() {
  // Nav tab buttons
  document.querySelectorAll('.nav-item').forEach(btn =>
    btn.addEventListener('click', () => UI.switchTab(btn.dataset.tab))
  );

  // Add buttons
  [['d-add','daily'], ['w-add','weekly'], ['m-add','monthly']].forEach(([id, type]) =>
    $(id)?.addEventListener('click', () => UI.addTask(type))
  );

  // Enter in inputs
  [['d-input','daily'], ['w-input','weekly'], ['m-input','monthly']].forEach(([id, type]) =>
    $(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') UI.addTask(type); })
  );

  // Calendar navigation
  $('cal-prev')?.addEventListener('click', () => {
    state.calDate.setMonth(state.calDate.getMonth() - 1);
    Render.monthly();
  });
  $('cal-next')?.addEventListener('click', () => {
    state.calDate.setMonth(state.calDate.getMonth() + 1);
    Render.monthly();
  });

  // Live search
  $('search-input')?.addEventListener('input', e => {
    state.search = e.target.value.trim();
    Render.all();
  });

  // Mobile burger & backdrop
  $('menu-btn')?.addEventListener('click',  () => UI.toggleSidebar());
  $('backdrop')?.addEventListener('click',  () => UI.closeSidebar());

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    const active    = document.activeElement;
    const isEditing =
      active.tagName === 'INPUT' ||
      active.tagName === 'TEXTAREA' ||
      active.tagName === 'SELECT' ||
      active.contentEditable === 'true';

    if (e.key === 'Escape') {
      // Clear search + blur inputs
      const si = $('search-input');
      if (si) si.value = '';
      state.search = '';
      Render.all();
      active.blur?.();
      UI.closeSidebar();
      return;
    }

    if (isEditing) return;

    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      $(`${state.activeTab[0]}-input`)?.focus();
    }

    if (e.key === '/') {
      e.preventDefault();
      $('search-input')?.focus();
    }
  });
}

/* Bootstrap */
document.addEventListener('DOMContentLoaded', () => {
  Storage.load();
  Clock.init();
  initEvents();
  Render.all();
});