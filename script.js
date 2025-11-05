const chatEl = document.getElementById('chat');
const formEl = document.getElementById('composer');
const inputEl = document.getElementById('message');
const intervalEl = document.getElementById('interval');
const goalEl = document.getElementById('goal');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

const STORAGE_KEY = 'aqua-buddy-v1';
let state = loadState();
let reminderTimer = null;

function loadState(){
  try{
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const today = new Date().toISOString().slice(0,10);
    if(saved.today !== today){
      return { totalMl: 0, intervalMin: saved.intervalMin || 30, goalMl: saved.goalMl || 2000, active: false, today };
    }
    return { totalMl: 0, intervalMin: 30, goalMl: 2000, active: false, today, ...saved };
  }catch{ return { totalMl: 0, intervalMin: 30, goalMl: 2000, active: false, today: new Date().toISOString().slice(0,10) }; }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function fmtTime(d=new Date()){ return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }
function addMsg({ text, from='bot' }){
  const row = document.createElement('div');
  row.className = `msg msg--${from}`;
  const avatar = document.createElement('div');
  avatar.className = 'msg__avatar';
  avatar.textContent = from==='bot' ? '??' : '??';
  const bubble = document.createElement('div');
  bubble.className = 'msg__bubble';
  bubble.textContent = text;
  const time = document.createElement('div');
  time.className = 'msg__time';
  time.textContent = fmtTime();
  row.appendChild(avatar); row.appendChild(bubble); row.appendChild(time);
  chatEl.appendChild(row);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function greet(){
  addMsg({ text: "Hi! I'm Aqua Buddy. Type 'start' to begin reminders. Try 'help' for commands." });
}

function setIntervalMinutes(min){
  const m = Math.max(5, Math.min(240, Math.floor(Number(min)||30)));
  state.intervalMin = m; intervalEl.value = String(m); saveState();
  addMsg({ from:'bot', text: `Okay! I'll remind you every ${m} minutes.` });
  if(state.active){ restartTimer(); }
}

function setGoalMl(ml){
  const g = Math.max(500, Math.min(10000, Math.floor(Number(ml)||2000)));
  state.goalMl = g; goalEl.value = String(g); saveState();
  addMsg({ from:'bot', text: `Daily goal set to ${g} ml.` });
}

function recordDrink(ml){
  const add = Math.max(10, Math.min(2000, Math.floor(Number(ml)||250)));
  state.totalMl += add; saveState();
  const pct = Math.min(100, Math.round((state.totalMl/state.goalMl)*100));
  addMsg({ from:'bot', text: `Nice! Logged ${add} ml. Total today: ${state.totalMl} ml (${pct}%).` });
}

async function ensurePermission(){
  if(!('Notification' in window)) return false;
  if(Notification.permission === 'granted') return true;
  if(Notification.permission === 'denied') return false;
  const res = await Notification.requestPermission();
  return res === 'granted';
}

function showReminder(){
  const text = 'Time to drink water ??';
  addMsg({ from:'bot', text });
  if('serviceWorker' in navigator && Notification.permission==='granted'){
    navigator.serviceWorker.getRegistration().then(reg=>{
      reg?.showNotification('Aqua Buddy', { body: text, icon: '/icons/water.svg', tag: 'aqua-reminder', renotify: true });
    });
  }
}

function restartTimer(){
  if(reminderTimer) clearInterval(reminderTimer);
  reminderTimer = setInterval(showReminder, state.intervalMin*60*1000);
}

async function start(){
  const ok = await ensurePermission();
  state.active = true; saveState(); restartTimer();
  startBtn.disabled = true; stopBtn.disabled = false;
  addMsg({ from:'bot', text: ok ? 'Reminders ON. Notifications allowed.' : 'Reminders ON. Notifications not granted.' });
}
function stop(){
  state.active = false; saveState();
  if(reminderTimer) clearInterval(reminderTimer);
  startBtn.disabled = false; stopBtn.disabled = true;
  addMsg({ from:'bot', text: 'Reminders OFF.' });
}

function handleCommand(raw){
  const msg = raw.trim();
  if(!msg) return;
  addMsg({ from:'me', text: msg });
  const lower = msg.toLowerCase();
  if(lower === 'help'){
    addMsg({ from:'bot', text: "Commands: 'start', 'stop', 'set 20' (minutes), 'drink 250', 'status', 'reset'" });
  } else if(lower === 'start'){
    start();
  } else if(lower === 'stop'){
    stop();
  } else if(lower.startsWith('set ')){
    const n = lower.replace('set','').trim(); setIntervalMinutes(n);
  } else if(lower.startsWith('drink ')){
    const n = lower.replace('drink','').trim(); recordDrink(n);
  } else if(lower === 'status'){
    const pct = Math.min(100, Math.round((state.totalMl/state.goalMl)*100));
    addMsg({ from:'bot', text: `Interval: ${state.intervalMin}m ? Today: ${state.totalMl}/${state.goalMl} ml (${pct}%)` });
  } else if(lower === 'reset'){
    state.totalMl = 0; saveState(); addMsg({ from:'bot', text: 'Daily total reset.' });
  } else {
    addMsg({ from:'bot', text: "I didn't get that. Try 'help'." });
  }
}

formEl.addEventListener('submit', (e)=>{ e.preventDefault(); handleCommand(inputEl.value); inputEl.value=''; inputEl.focus(); });
startBtn.addEventListener('click', start);
stopBtn.addEventListener('click', stop);
intervalEl.addEventListener('change', (e)=> setIntervalMinutes(e.target.value));
goalEl.addEventListener('change', (e)=> setGoalMl(e.target.value));

// Initial UI
intervalEl.value = String(state.intervalMin);
goalEl.value = String(state.goalMl);
startBtn.disabled = state.active;
stopBtn.disabled = !state.active;

// Greeting and restore
if(!localStorage.getItem(STORAGE_KEY+'_welcomed')){
  greet();
  localStorage.setItem(STORAGE_KEY+'_welcomed','1');
} else {
  addMsg({ text: 'Welcome back! Type \u2018status\u2019 anytime.' });
}

if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('/service-worker.js');
  });
}

if(state.active){ restartTimer(); }
