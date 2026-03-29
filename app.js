// ── Fixed family members ───────────────────────────────────────────────────────
const FIXED_MEMBERS = ['Johnny', 'Zola', 'Zina'];

// ── Taiwan public holidays（比照行政院行事曆） ────────────────────────────────────
const TW_HOLIDAYS = {
  // ── 每年固定日期國定假日 ──
  '**-01-01': '元旦',
  '**-02-28': '和平紀念日',
  '**-04-04': '兒童節',
  '**-05-01': '勞動節',
  '**-09-28': '教師節',
  '**-10-10': '國慶日',
  '**-10-25': '台灣光復節',
  '**-12-25': '行憲紀念日',

  // ── 2025年（民國114年）──
  '2025-01-27': '小年夜',
  '2025-01-28': '除夕',
  '2025-01-29': '春節',
  '2025-01-30': '春節',
  '2025-01-31': '春節',
  '2025-04-03': '清明補假',    // 兒童節/清明 4/4 (五) → 前補 4/3 (四)
  '2025-05-30': '端午補假',    // 端午 6/1 (日) → 補 5/30 (五)
  '2025-06-01': '端午節',
  '2025-09-29': '教師節補假',  // 教師節 9/28 (日) → 補 9/29 (一)
  '2025-10-05': '中秋節',
  '2025-10-06': '中秋補假',    // 中秋 10/5 (日) → 補 10/6 (一)
  '2025-10-24': '光復節補假',  // 光復節 10/25 (六) → 補 10/24 (五)

  // ── 2026年（民國115年）──
  '2026-02-16': '除夕',
  '2026-02-17': '春節',
  '2026-02-18': '春節',
  '2026-02-19': '春節',
  '2026-02-20': '小年夜補假',  // 小年夜 2/15 (日) → 補 2/20 (五)
  '2026-02-27': '和平紀念日補假', // 和平紀念日 2/28 (六) → 補 2/27 (五)
  '2026-04-03': '兒童節補假',  // 兒童節 4/4 (六) → 補 4/3 (五)
  '2026-06-19': '端午補假',    // 端午 6/20 (六) → 補 6/19 (五)
  '2026-06-20': '端午節',
  '2026-09-25': '中秋補假',    // 中秋 9/27 (日) → 補 9/25 (五)
  '2026-09-27': '中秋節',
  '2026-10-09': '國慶日補假',  // 國慶 10/10 (六) → 補 10/9 (五)
  '2026-10-26': '光復節補假',  // 光復節 10/25 (日) → 補 10/26 (一)
};
function getHoliday(dateStr) {
  if (TW_HOLIDAYS[dateStr]) return TW_HOLIDAYS[dateStr];
  const mmdd = dateStr.slice(4); // "-MM-DD"
  return TW_HOLIDAYS[`**${mmdd}`] || null;
}

// ── 連假完整區間（含相鄰週六日）────────────────────────────────────────────────
const TW_HOLIDAY_RANGES = [
  // 2025
  ['2025-01-25', '2025-02-02'],  // 春節
  ['2025-02-28', '2025-03-02'],  // 和平紀念日
  ['2025-04-03', '2025-04-06'],  // 兒童節/清明
  ['2025-05-30', '2025-06-01'],  // 端午節
  ['2025-09-27', '2025-09-29'],  // 教師節
  ['2025-10-04', '2025-10-06'],  // 中秋節
  ['2025-10-10', '2025-10-12'],  // 國慶日
  ['2025-10-24', '2025-10-26'],  // 台灣光復節
  // 2026
  ['2026-02-14', '2026-02-22'],  // 春節
  ['2026-02-27', '2026-03-01'],  // 和平紀念日
  ['2026-04-03', '2026-04-05'],  // 兒童節/清明
  ['2026-05-01', '2026-05-03'],  // 勞動節
  ['2026-06-19', '2026-06-21'],  // 端午節
  ['2026-09-25', '2026-09-28'],  // 中秋節+教師節
  ['2026-10-09', '2026-10-11'],  // 國慶日
  ['2026-10-24', '2026-10-26'],  // 台灣光復節
  ['2026-12-25', '2026-12-27'],  // 行憲紀念日
];
function isHolidayRange(dateStr) {
  return TW_HOLIDAY_RANGES.some(([s, e]) => dateStr >= s && dateStr <= e);
}

// ── Member color palette ──────────────────────────────────────────────────────
const COLOR_PALETTE = [
  '#4f46e5', '#e11d48', '#0891b2', '#16a34a',
  '#d97706', '#7c3aed', '#db2777', '#0369a1',
];
function memberColor(nickname) {
  let hash = 0;
  for (const ch of nickname) hash += ch.charCodeAt(0);
  return COLOR_PALETTE[hash % COLOR_PALETTE.length];
}

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  nickname: '',
  knownMembers: [],
  events: [],
  currentMonth: new Date(),
  activeTab: 'upcoming',
  editingEventId: null,
};

// ── Firestore refs ────────────────────────────────────────────────────────────
const db  = window.__db;
const { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp } = window.__fs;
const eventsCol = collection(db, 'events');

// ── LocalStorage helpers ──────────────────────────────────────────────────────
function loadLocal() {
  state.nickname = localStorage.getItem('fc_nickname') || '';
  try {
    state.knownMembers = JSON.parse(localStorage.getItem('fc_known_members') || '[]');
  } catch { state.knownMembers = []; }
  if (state.knownMembers.length === 0) state.knownMembers = [...FIXED_MEMBERS];
}
function saveNickname(name) {
  state.nickname = name;
  localStorage.setItem('fc_nickname', name);
  if (!state.knownMembers.includes(name)) {
    state.knownMembers.push(name);
    localStorage.setItem('fc_known_members', JSON.stringify(state.knownMembers));
  }
}

// ── Firestore: real-time listener ────────────────────────────────────────────
function startEventsListener() {
  onSnapshot(eventsCol, (snapshot) => {
    state.events = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // Merge members from Firestore events into knownMembers
    state.events.forEach(ev => {
      (ev.members || []).forEach(m => {
        if (!state.knownMembers.includes(m)) state.knownMembers.push(m);
      });
    });
    localStorage.setItem('fc_known_members', JSON.stringify(state.knownMembers));
    renderAll();
  }, (err) => {
    console.error('Firestore listener error:', err);
  });
}

// ── Firestore: CRUD ───────────────────────────────────────────────────────────
async function firestoreSaveEvent(payload, editingId) {
  if (editingId) {
    await updateDoc(doc(db, 'events', editingId), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  } else {
    await addDoc(eventsCol, {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

async function firestoreDeleteEvent(id) {
  await deleteDoc(doc(db, 'events', id));
}

// ── Render dispatcher ─────────────────────────────────────────────────────────
function renderAll() {
  renderCalendar();
  renderUpcoming();
}

// ── Calendar ──────────────────────────────────────────────────────────────────
function renderCalendar() {
  const year  = state.currentMonth.getFullYear();
  const month = state.currentMonth.getMonth();

  document.getElementById('cal-title').textContent =
    `${year} 年 ${month + 1} 月`;

  const firstDay    = (new Date(year, month, 1).getDay() + 6) % 7; // 週一=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();
  const todayStr    = toDateStr(new Date());

  const cells = document.getElementById('cal-cells');
  cells.innerHTML = '';

  const eventMap = {};
  state.events.forEach(ev => {
    if (!eventMap[ev.date]) eventMap[ev.date] = [];
    eventMap[ev.date].push(ev);
  });

  for (let i = firstDay - 1; i >= 0; i--) {
    const d       = daysInPrev - i;
    const dateStr = toDateStr(new Date(year, month - 1, d));
    cells.appendChild(makeCell(dateStr, d, true, eventMap[dateStr] || [], todayStr));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toDateStr(new Date(year, month, d));
    cells.appendChild(makeCell(dateStr, d, false, eventMap[dateStr] || [], todayStr));
  }
  const total    = firstDay + daysInMonth;
  const trailing = total % 7 === 0 ? 0 : 7 - (total % 7);

  for (let d = 1; d <= trailing; d++) {
    const dateStr = toDateStr(new Date(year, month + 1, d));
    cells.appendChild(makeCell(dateStr, d, true, eventMap[dateStr] || [], todayStr));
  }
}

function makeCell(dateStr, dayNum, otherMonth, events, todayStr) {
  const holiday = getHoliday(dateStr);
  const cell = document.createElement('div');
  cell.className = 'cal-cell' +
    (otherMonth ? ' other-month' : '') +
    (dateStr === todayStr ? ' today' : '');

  const numEl = document.createElement('div');
  const isRed = holiday !== null || isHolidayRange(dateStr);
  numEl.className = 'day-num' + (isRed ? ' holiday' : '');
  numEl.textContent = dayNum;
  if (holiday) {
    const label = document.createElement('span');
    label.className = 'holiday-label';
    label.textContent = holiday;
    numEl.appendChild(label);
  }
  cell.appendChild(numEl);

  cell.addEventListener('click', () => openModal(null, dateStr));

  const dots = document.createElement('div');
  dots.className = 'event-dots';

  events.slice(0, 3).forEach(ev => {
    const dot = document.createElement('span');
    dot.className     = 'event-dot';
    dot.style.background = memberColor(ev.members?.[0] || ev.createdBy || '?');
    dot.textContent   = ev.title;
    dot.title         = ev.title;
    dot.addEventListener('click', e => { e.stopPropagation(); openModal(ev.id); });
    dots.appendChild(dot);
  });
  if (events.length > 3) {
    const more = document.createElement('span');
    more.className   = 'more-label';
    more.textContent = `+${events.length - 3} 更多`;
    dots.appendChild(more);
  }

  cell.appendChild(dots);
  return cell;
}

// ── Upcoming view ─────────────────────────────────────────────────────────────
function renderUpcoming() {
  const container = document.getElementById('upcoming-list');
  const now       = new Date();

  const upcoming = state.events
    .filter(ev => new Date(`${ev.date}T${ev.time || '23:59'}`) >= now)
    .sort((a, b) =>
      new Date(`${a.date}T${a.time || '00:00'}`) -
      new Date(`${b.date}T${b.time || '00:00'}`)
    )
    .slice(0, 60);

  container.innerHTML = '';

  if (!upcoming.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📅</div>近期沒有事項</div>';
    return;
  }

  let lastDate = '';
  upcoming.forEach(ev => {
    if (ev.date !== lastDate) {
      lastDate = ev.date;
      const header = document.createElement('div');
      header.className   = 'date-group-header';
      header.textContent = formatDateHeader(ev.date);
      container.appendChild(header);
    }
    container.appendChild(makeEventCard(ev));
  });
}

function makeEventCard(ev) {
  const color = memberColor(ev.members?.[0] || ev.createdBy || '?');
  const card  = document.createElement('div');
  card.className = 'event-card';

  card.innerHTML = `
    <div class="event-card-accent" style="background:${color}"></div>
    <div class="event-card-body">
      <div class="event-card-title">${escHtml(ev.title)}</div>
      ${ev.time
        ? `<div class="event-card-time">🕐 ${ev.time}</div>`
        : '<div class="event-card-time">全天</div>'}
      <div class="event-card-members">
        ${(ev.members || []).map(m =>
          `<span class="member-chip" style="background:${memberColor(m)}">${escHtml(m)}</span>`
        ).join('')}
      </div>
      ${ev.notes ? `<div class="event-card-notes">${escHtml(ev.notes)}</div>` : ''}
    </div>
    <div class="event-card-actions">
      <button class="action-btn edit-btn">編輯</button>
      <button class="action-btn del del-btn">刪除</button>
    </div>
  `;

  card.querySelector('.edit-btn').addEventListener('click', () => openModal(ev.id));
  card.querySelector('.del-btn').addEventListener('click', () => deleteEvent(ev.id));
  return card;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(eventId, prefillDate) {
  state.editingEventId = eventId || null;
  const ev = eventId ? state.events.find(e => e.id === eventId) : null;

  document.getElementById('modal-title').textContent = ev ? '編輯事項' : '新增事項';
  document.getElementById('ev-title').value  = ev ? ev.title : '';
  document.getElementById('ev-date').value   = ev ? ev.date  : (prefillDate || toDateStr(new Date()));
  document.getElementById('ev-time').value   = ev ? ev.time  : '';
  document.getElementById('ev-notes').value  = ev ? ev.notes : '';

  const delBtn = document.getElementById('ev-delete');
  if (ev) delBtn.classList.remove('hidden');
  else    delBtn.classList.add('hidden');

  renderMemberPicker(ev ? ev.members : [state.nickname].filter(Boolean));
  document.getElementById('event-modal').classList.remove('hidden');
  document.getElementById('ev-title').focus();
}

function closeModal() {
  document.getElementById('event-modal').classList.add('hidden');
  state.editingEventId = null;
}

function renderMemberPicker(selected) {
  const container = document.getElementById('ev-members');
  container.innerHTML = '';

  [...new Set(state.knownMembers)].forEach(m => {
    const chip = document.createElement('span');
    chip.className   = 'chip' + (selected.includes(m) ? ' selected' : ' unselected');
    chip.style.background = memberColor(m);
    chip.textContent = m;
    chip.addEventListener('click', () => {
      chip.classList.toggle('selected');
      chip.classList.toggle('unselected');
    });
    container.appendChild(chip);
  });

  const addBtn = document.createElement('span');
  addBtn.className   = 'chip-add';
  addBtn.textContent = '+ 新增成員';
  addBtn.addEventListener('click', () => {
    const name = prompt('輸入新成員暱稱：', '')?.trim();
    if (!name) return;
    if (!state.knownMembers.includes(name)) {
      state.knownMembers.push(name);
      localStorage.setItem('fc_known_members', JSON.stringify(state.knownMembers));
    }
    renderMemberPicker([...getSelectedMembers(), name]);
  });
  container.appendChild(addBtn);
}

function getSelectedMembers() {
  return [...document.querySelectorAll('#ev-members .chip.selected')].map(c => c.textContent);
}

async function saveEvent() {
  const title = document.getElementById('ev-title').value.trim();
  const date  = document.getElementById('ev-date').value;
  if (!title || !date) { alert('請填寫標題和日期'); return; }

  const payload = {
    title,
    date,
    time:      document.getElementById('ev-time').value,
    members:   getSelectedMembers(),
    notes:     document.getElementById('ev-notes').value.trim(),
    createdBy: state.nickname,
  };

  try {
    await firestoreSaveEvent(payload, state.editingEventId);
    closeModal();
  } catch (err) {
    alert('儲存失敗：' + err.message);
  }
}

async function deleteEvent(id) {
  const target = id || state.editingEventId;
  if (!target) return;
  if (!confirm('確定要刪除這個事項嗎？')) return;
  try {
    await firestoreDeleteEvent(target);
    closeModal();
  } catch (err) {
    alert('刪除失敗：' + err.message);
  }
}

// ── Nickname overlay ──────────────────────────────────────────────────────────
function showNicknameOverlay() {
  const overlay = document.getElementById('nickname-overlay');
  overlay.classList.remove('hidden');

  const listEl = document.getElementById('known-members-list');
  listEl.innerHTML = '';
  FIXED_MEMBERS.forEach(m => {
    const chip = document.createElement('span');
    chip.className   = 'chip selected';
    chip.style.background = memberColor(m);
    chip.textContent = m;
    chip.addEventListener('click', () => {
      saveNickname(m);
      overlay.classList.add('hidden');
      document.getElementById('user-chip-name').textContent = m;
      renderUserDropdown();
      startEventsListener();
    });
    listEl.appendChild(chip);
  });
}

// ── User dropdown ─────────────────────────────────────────────────────────────
function renderUserDropdown() {
  const dd = document.getElementById('user-dropdown');
  dd.innerHTML = '';

  state.knownMembers.forEach(m => {
    const item = document.createElement('div');
    item.className = 'dropdown-item' + (m === state.nickname ? ' active' : '');
    item.innerHTML = `<span class="dot-indicator" style="background:${memberColor(m)}"></span>${escHtml(m)}`;
    item.addEventListener('click', () => {
      saveNickname(m);
      document.getElementById('user-chip-name').textContent = m;
      dd.classList.add('hidden');
      renderUserDropdown();
    });
    dd.appendChild(item);
  });

}

// ── Utility ───────────────────────────────────────────────────────────────────
function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDateHeader(dateStr) {
  const d     = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const diff  = Math.round((d - today) / 86400000);
  const days  = ['日','一','二','三','四','五','六'];
  const weekLabel = `週${days[d.getDay()]}`;
  if (diff === 0) return `今天 (${weekLabel})`;
  if (diff === 1) return `明天 (${weekLabel})`;
  if (diff === 2) return `後天 (${weekLabel})`;
  if (diff > 0 && diff < 7) return `星期${days[d.getDay()]}`;
  return `${d.getMonth()+1} 月 ${d.getDate()} 日 (${weekLabel})`;
}

// ── Event listeners ───────────────────────────────────────────────────────────
document.getElementById('cal-prev').addEventListener('click', () => {
  state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
  renderCalendar();
});
document.getElementById('cal-next').addEventListener('click', () => {
  state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
  renderCalendar();
});
document.getElementById('cal-today').addEventListener('click', () => {
  state.currentMonth = new Date();
  renderCalendar();
});

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.activeTab = tab.dataset.tab;
    document.getElementById('view-calendar').classList.toggle('hidden', state.activeTab !== 'calendar');
    document.getElementById('view-upcoming').classList.toggle('hidden', state.activeTab !== 'upcoming');
  });
});

document.getElementById('fab').addEventListener('click', () => openModal(null));
document.getElementById('ev-save').addEventListener('click', saveEvent);
document.getElementById('ev-cancel').addEventListener('click', closeModal);
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('ev-delete').addEventListener('click', () => deleteEvent(null));
document.querySelector('.modal-backdrop').addEventListener('click', closeModal);

document.getElementById('user-chip').addEventListener('click', e => {
  e.stopPropagation();
  renderUserDropdown();
  document.getElementById('user-dropdown').classList.toggle('hidden');
});
document.addEventListener('click', () => {
  document.getElementById('user-dropdown').classList.add('hidden');
});


// ── Init ──────────────────────────────────────────────────────────────────────
(function init() {
  loadLocal();
  if (!state.nickname) {
    showNicknameOverlay();
  } else {
    document.getElementById('user-chip-name').textContent = state.nickname;
    startEventsListener();
  }
})();
