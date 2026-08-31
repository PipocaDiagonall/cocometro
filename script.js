// ============================
// PERSISTÊNCIA (localStorage)
// ============================
const STORAGE_SETTINGS = 'cocometro_settings';
const STORAGE_SESSIONS = 'cocometro_sessions';

function loadSettings() {
  const raw = localStorage.getItem(STORAGE_SETTINGS);
  return raw ? JSON.parse(raw) : null;
}
function saveSettings(settings) {
  localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
}
function loadSessions() {
  const raw = localStorage.getItem(STORAGE_SESSIONS);
  return raw ? JSON.parse(raw) : [];
}
function saveSessions(sessions) {
  localStorage.setItem(STORAGE_SESSIONS, JSON.stringify(sessions));
}

// ============================
// CÁLCULOS
// ============================
function getRates(settings) {
  const monthlyHours = settings.workDays * settings.workHours;
  const hourlyRate = settings.salary / monthlyHours;
  const minuteRate = hourlyRate / 60;
  return { hourlyRate, minuteRate };
}
function formatMoney(v) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

// ============================
// FRASES DIVERTIDAS
// ============================
const FUNNY_MESSAGES = [
  'Continue. O salário não vai se cagar sozinho.',
  'Você está transformando café em produtividade.',
  'A empresa acredita em você.',
  'Trabalhando duro.',
  'Isso também é home office, tecnicamente.',
  'Respira fundo. O relógio não para.'
];

// ============================
// ESTADO
// ============================
let settings = loadSettings();
let sessions = loadSessions();
let timerInterval = null;
let sessionStart = null;
let lastResult = null;

// ============================
// NAVEGAÇÃO
// ============================
const views = ['onboarding', 'home', 'timer', 'result', 'history', 'stats', 'settings'];
function showView(name) {
  views.forEach(v => {
    document.getElementById('view-' + v).classList.toggle('hidden', v !== name);
  });
  if (name === 'home') renderHome();
  if (name === 'history') renderHistory();
  if (name === 'stats') renderStats();
  if (name === 'settings') renderSettingsForm();
}

document.querySelectorAll('[data-nav]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.nav;
    if (target === 'home-newpoop') {
      showView('home');
    } else {
      showView(target);
    }
  });
});

// ============================
// ONBOARDING
// ============================
document.getElementById('settingsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  settings = {
    salary: parseFloat(document.getElementById('salary').value),
    workDays: parseInt(document.getElementById('workDays').value, 10),
    workHours: parseFloat(document.getElementById('workHours').value)
  };
  saveSettings(settings);
  showView('home');
});

// ============================
// SETTINGS (edição)
// ============================
function renderSettingsForm() {
  if (!settings) return;
  document.getElementById('editSalary').value = settings.salary;
  document.getElementById('editWorkDays').value = settings.workDays;
  document.getElementById('editWorkHours').value = settings.workHours;
}
document.getElementById('editSettingsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  settings = {
    salary: parseFloat(document.getElementById('editSalary').value),
    workDays: parseInt(document.getElementById('editWorkDays').value, 10),
    workHours: parseFloat(document.getElementById('editWorkHours').value)
  };
  saveSettings(settings);
  showView('home');
});

// ============================
// HOME
// ============================
function renderHome() {
  const { hourlyRate, minuteRate } = getRates(settings);
  document.getElementById('hourlyRateDisplay').innerHTML = formatMoney(hourlyRate) + ' <span>/hora</span>';
  document.getElementById('minuteRateDisplay').textContent = formatMoney(minuteRate) + ' por minuto';
}

document.getElementById('startBtn').addEventListener('click', () => {
  sessionStart = Date.now();
  showView('timer');
  startTimer();
});

// ============================
// TIMER
// ============================
function startTimer() {
  const { minuteRate } = getRates(settings);
  updateFunnyMessage();
  const msgInterval = setInterval(updateFunnyMessage, 15000);

  timerInterval = setInterval(() => {
    const elapsedSeconds = (Date.now() - sessionStart) / 1000;
    document.getElementById('timerDisplay').textContent = formatDuration(elapsedSeconds);
    const value = (elapsedSeconds / 60) * minuteRate;
    document.getElementById('liveValue').textContent = formatMoney(value);
  }, 250);

  document.getElementById('finishBtn').onclick = () => {
    clearInterval(timerInterval);
    clearInterval(msgInterval);
    finishSession();
  };
}

function updateFunnyMessage() {
  const msg = FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)];
  document.getElementById('funnyMsg').textContent = msg;
}

function finishSession() {
  const end = Date.now();
  const durationSeconds = (end - sessionStart) / 1000;
  const durationMinutes = durationSeconds / 60;
  const { minuteRate } = getRates(settings);
  const value = durationMinutes * minuteRate;

  const session = {
    id: Date.now(),
    start: sessionStart,
    end: end,
    durationMinutes: durationMinutes,
    value: value
  };
  sessions.push(session);
  saveSessions(sessions);

  lastResult = session;
  document.getElementById('resultDuration').textContent = formatDuration(durationSeconds);
  document.getElementById('resultValue').textContent = formatMoney(value);
  showView('result');
}

// ============================
// HISTÓRICO
// ============================
function renderHistory() {
  const container = document.getElementById('historyList');
  if (sessions.length === 0) {
    container.innerHTML = '<p class="empty-state">Nenhuma cagada registrada ainda. 💩</p>';
    return;
  }

  const sorted = [...sessions].sort((a, b) => b.start - a.start);
  const groups = {};
  sorted.forEach(s => {
    const d = new Date(s.start);
    const key = d.toLocaleDateString('pt-BR');
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });

  let html = '';
  Object.keys(groups).forEach(dateKey => {
    const today = new Date().toLocaleDateString('pt-BR');
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('pt-BR');
    const label = dateKey === today ? 'Hoje' : (dateKey === yesterday ? 'Ontem' : dateKey);
    html += `<p class="history-day-label">${label}</p>`;
    groups[dateKey].forEach(s => {
      const startT = new Date(s.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const endT = new Date(s.end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      html += `
        <div class="history-item">
          <span class="h-time">💩 ${startT} — ${endT} (${Math.round(s.durationMinutes)} min)</span>
          <span class="h-value">${formatMoney(s.value)}</span>
        </div>`;
    });
  });
  container.innerHTML = html;
}

// ============================
// ESTATÍSTICAS
// ============================
function renderStats() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfToday - (now.getDay() * 86400000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const todaySessions = sessions.filter(s => s.start >= startOfToday);
  const weekSessions = sessions.filter(s => s.start >= startOfWeek);
  const monthSessions = sessions.filter(s => s.start >= startOfMonth);

  fillStat('Today', todaySessions);
  fillStat('Week', weekSessions);
  fillStat('Month', monthSessions);

  const monthValue = monthSessions.reduce((sum, s) => sum + s.value, 0);
  const percent = settings.salary > 0 ? (monthValue / settings.salary) * 100 : 0;
  document.getElementById('statPercent').textContent = percent.toFixed(2) + '%';
}

function fillStat(prefix, list) {
  const count = list.length;
  const totalMin = list.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalValue = list.reduce((sum, s) => sum + s.value, 0);
  document.getElementById('stat' + prefix + 'Count').textContent = count;
  document.getElementById('stat' + prefix + 'Time').textContent =
    totalMin >= 60 ? `${Math.floor(totalMin / 60)}h ${Math.round(totalMin % 60)}min` : `${Math.round(totalMin)}min`;
  document.getElementById('stat' + prefix + 'Value').textContent = formatMoney(totalValue);
}

// ============================
// INICIALIZAÇÃO
// ============================
if (settings) {
  showView('home');
} else {
  showView('onboarding');
}
