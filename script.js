// FocusTime - Pomodoro Timer Script


// State variables
let timerInterval = null;
let isRunning = false;
let currentMode = 'work'; // 'work', 'shortBreak', 'longBreak'
let timeRemaining = 0; // in seconds
let totalDuration = 0; // in seconds

// User settings (with defaults)
let settings = {
    work: 25, // in minutes
    shortBreak: 5, // in minutes
    longBreak: 15, // in minutes
    sound: 'bell',
    volume: 0.8,
    notificationsEnabled: true,
    autoStart: false,
    theme: 'aurora'
};

// Statistics
let stats = {
    completedWorkSessions: 0,
    totalMinutesFocused: 0,
    streak: 0,
    lastCompletedDate: null
};

// User-created custom themes (persisted in localStorage)
let customThemes = {};

// DOM Elements
const appContainer = document.getElementById('app-container');
const timerTime = document.getElementById('timer-time');
const timerLabel = document.getElementById('timer-label');
const timerProgress = document.getElementById('timer-progress');
const btnToggle = document.getElementById('btn-toggle');
const playIcon = document.getElementById('play-icon');
const btnReset = document.getElementById('btn-reset');
const btnSkip = document.getElementById('btn-skip');

// Tabs
const modeTabs = {
    work: document.getElementById('mode-work'),
    shortBreak: document.getElementById('mode-short'),
    longBreak: document.getElementById('mode-long')
};

// Presets
const presetButtons = document.querySelectorAll('.preset-btn');

// Sound Select & Test
const soundSelect = document.getElementById('sound-select-inline');
const testSoundBtn = document.getElementById('test-sound-btn');
const themeSelect = document.getElementById('theme-select');
const bgPatternOverlay = document.getElementById('bg-pattern-overlay');

// Modal Elements
const settingsToggle = document.getElementById('settings-toggle');
const settingsModal = document.getElementById('settings-modal');
const settingsClose = document.getElementById('settings-close');
const btnSaveSettings = document.getElementById('btn-save-settings');
const btnResetStats = document.getElementById('btn-reset-stats');

// Modal Inputs & Outputs
const inputWork = document.getElementById('input-work');
const inputShort = document.getElementById('input-short');
const inputLong = document.getElementById('input-long');
const inputVolume = document.getElementById('input-volume');
const toggleNotifications = document.getElementById('toggle-notifications');
const toggleAutostart = document.getElementById('toggle-autostart');

const valWork = document.getElementById('val-work');
const valShort = document.getElementById('val-short');
const valLong = document.getElementById('val-long');
const valVolume = document.getElementById('val-volume');

// Stats Elements
const statCompleted = document.getElementById('stats-completed');
const statTotalTime = document.getElementById('stats-total-time');
const statStreak = document.getElementById('stats-streak');

// Toast Container
const toastContainer = document.getElementById('toast-container');

/* ---------------------------------------------------- */
/* INITIALIZATION */
/* ---------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadStats();
    initUI();
    applyTheme(settings.theme || 'aurora');
    resetTimer();
    requestNotificationPermission();
});

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('focustime_settings');
    if (savedSettings) {
        try {
            settings = { ...settings, ...JSON.parse(savedSettings) };
        } catch (e) {
            console.error('Ошибка загрузки настроек:', e);
        }
    }
}

// Load stats from localStorage
function loadStats() {
    const savedStats = localStorage.getItem('focustime_stats');
    if (savedStats) {
        try {
            stats = { ...stats, ...JSON.parse(savedStats) };
            checkStreak();
        } catch (e) {
            console.error('Ошибка загрузки статистики:', e);
        }
    }
}

// Check if streak is still active
function checkStreak() {
    if (!stats.lastCompletedDate) return;
    
    const today = new Date().toDateString();
    const lastDate = new Date(stats.lastCompletedDate).toDateString();
    
    if (today === lastDate) return;
    
    const oneDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round(Math.abs((new Date(today) - new Date(lastDate)) / oneDay));
    
    if (diffDays > 1) {
        stats.streak = 0; // Streak broken
        saveStats();
    }
}

// Save stats to localStorage
function saveStats() {
    localStorage.setItem('focustime_stats', JSON.stringify(stats));
    updateStatsDisplay();
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('focustime_settings', JSON.stringify(settings));
}

// Initialize UI elements with settings and events
function initUI() {
    // Load persisted custom themes before syncing select value
    loadCustomThemes();

    // Sync settings modal values
    inputWork.value = settings.work;
    inputShort.value = settings.shortBreak;
    inputLong.value = settings.longBreak;
    inputVolume.value = settings.volume * 100;
    toggleNotifications.checked = settings.notificationsEnabled;
    toggleAutostart.checked = settings.autoStart;
    themeSelect.value = settings.theme || 'aurora';
    
    // Sync inline sound dropdown
    soundSelect.value = settings.sound;

    updateSliderLabel(inputWork, valWork, ' мин');
    updateSliderLabel(inputShort, valShort, ' мин');
    updateSliderLabel(inputLong, valLong, ' мин');
    updateSliderLabel(inputVolume, valVolume, '%');

    // Update Stats text
    updateStatsDisplay();

    // Event Listeners for Controls
    btnToggle.addEventListener('click', toggleTimer);
    btnReset.addEventListener('click', resetTimer);
    btnSkip.addEventListener('click', skipSession);

    // Modal listeners
    settingsToggle.addEventListener('click', openSettings);
    settingsClose.addEventListener('click', closeSettings);
    btnSaveSettings.addEventListener('click', applySettings);
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeSettings();
    });
    themeSelect.addEventListener('change', () => {
        settings.theme = themeSelect.value;
        saveSettings();
        applyTheme(settings.theme);
    });
    btnResetStats.addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите сбросить всю статистику сессий? Это действие необратимо.')) {
            stats = {
                completedWorkSessions: 0,
                totalMinutesFocused: 0,
                streak: 0,
                lastCompletedDate: null
            };
            saveStats();
            showToast('Статистика сброшена', 'Все данные о ваших сессиях были очищены.');
            closeSettings();
        }
    });

    // Slider events (live update labels)
    inputWork.addEventListener('input', () => updateSliderLabel(inputWork, valWork, ' мин'));
    inputShort.addEventListener('input', () => updateSliderLabel(inputShort, valShort, ' мин'));
    inputLong.addEventListener('input', () => updateSliderLabel(inputLong, valLong, ' мин'));
    inputVolume.addEventListener('input', () => {
        updateSliderLabel(inputVolume, valVolume, '%');
    });

    // Tabs listeners
    Object.keys(modeTabs).forEach(mode => {
        modeTabs[mode].addEventListener('click', () => switchMode(mode));
    });

    // Preset buttons listeners
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const time = parseInt(btn.dataset.time, 10);
            
            // Highlight active preset
            presetButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Apply custom work time
            settings.work = time;
            inputWork.value = time;
            valWork.textContent = time + ' мин';
            saveSettings();
            
            showToast('Время фокуса изменено', `Установлено на ${time} минут.`);
            
            // Switch to work mode
            switchMode('work');
        });
    });

    // Inline Sound control events
    soundSelect.addEventListener('change', () => {
        settings.sound = soundSelect.value;
        saveSettings();
        playTestSound();
    });
    testSoundBtn.addEventListener('click', playTestSound);

    // Initial setup of progress ring dasharray
    initProgressRing();
    window.addEventListener('resize', initProgressRing);

    // Custom theme builder
    initCustomThemeBuilder();
    renderCustomThemeList();
}

// Update stats numbers on screen
function updateStatsDisplay() {
    statCompleted.textContent = stats.completedWorkSessions;
    statTotalTime.textContent = stats.totalMinutesFocused + ' мин';
    statStreak.textContent = stats.streak;
}

// Helper for slider labels
function updateSliderLabel(input, display, suffix) {
    display.textContent = input.value + suffix;
}

/* ---------------------------------------------------- */
/* TIMER CORE LOGIC */
/* ---------------------------------------------------- */

// Init or adjust SVG circle size dynamically
function initProgressRing() {
    const circumference = getCircumference();
    timerProgress.style.strokeDasharray = `${circumference} ${circumference}`;
    updateProgressRing(100);
}

// Get actual circumference based on client geometry
function getCircumference() {
    const radius = parseFloat(window.getComputedStyle(timerProgress).r) || timerProgress.r.baseVal.value || 150;
    return 2 * Math.PI * radius;
}

// Update SVG offset
function updateProgressRing(percent) {
    const circumference = getCircumference();
    const offset = circumference - (percent / 100) * circumference;
    timerProgress.style.strokeDashoffset = offset;
}

// Display formatted time on page
function updateTimeDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    timerTime.textContent = formatted;
    
    // Tab title update
    const modeName = currentMode === 'work' ? 'Фокус' : 'Отдых';
    document.title = `${formatted} | ${modeName} — FocusTime`;
}

// Reset timer to full duration of current mode
function resetTimer() {
    stopTimer();
    
    // Select base duration
    let minutes = settings.work;
    if (currentMode === 'shortBreak') minutes = settings.shortBreak;
    if (currentMode === 'longBreak') minutes = settings.longBreak;
    
    totalDuration = minutes * 60;
    timeRemaining = totalDuration;
    
    // Update visuals
    updateTimeDisplay();
    updateProgressRing(100);
    
    // Label
    updateLabel();
}

// Update text label below timer
function updateLabel() {
    if (isRunning) {
        if (currentMode === 'work') {
            timerLabel.textContent = 'Время работать!';
        } else {
            timerLabel.textContent = 'Приятного отдыха';
        }
    } else {
        if (currentMode === 'work') {
            timerLabel.textContent = 'Готовы сфокусироваться?';
        } else {
            timerLabel.textContent = 'Время передохнуть';
        }
    }
}

// Start / Pause toggle
function toggleTimer() {
    if (isRunning) {
        stopTimer();
    } else {
        startTimer();
    }
}

// Start interval loop
function startTimer() {
    if (isRunning) return;
    
    // Request permission if not yet decided
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    isRunning = true;
    appContainer.classList.add('timer-active');
    btnToggle.innerHTML = '<i class="fas fa-pause" id="play-icon"></i>';
    btnToggle.setAttribute('aria-label', 'Пауза');
    
    updateLabel();
    
    timerInterval = setInterval(() => {
        if (timeRemaining > 0) {
            timeRemaining--;
            updateTimeDisplay();
            
            // Progress percentage
            const percent = (timeRemaining / totalDuration) * 100;
            updateProgressRing(percent);
        } else {
            timerFinished();
        }
    }, 1000);
}

// Stop interval loop
function stopTimer() {
    isRunning = false;
    appContainer.classList.remove('timer-active');
    btnToggle.innerHTML = '<i class="fas fa-play" id="play-icon"></i>';
    btnToggle.setAttribute('aria-label', 'Старт');
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    updateLabel();
}

// Handle session completion
function timerFinished() {
    stopTimer();
    
    // Play alert sound
    playAlertSound();
    
    // Dispatch system notification
    sendDesktopNotification();
    
    // UI Notification toast
    let title = '';
    let message = '';
    
    if (currentMode === 'work') {
        title = 'Период фокуса завершен!';
        message = 'Отличная работа! Время немного отдохнуть.';
        
        // Record stats
        stats.completedWorkSessions++;
        stats.totalMinutesFocused += settings.work;
        
        // Handle streak
        updateStreak();
        saveStats();
        
        // Switch to appropriate break mode
        if (stats.completedWorkSessions % 4 === 0) {
            showToast(title, message + ' Время длинного перерыва.');
            switchMode('longBreak');
        } else {
            showToast(title, message + ' Время короткого перерыва.');
            switchMode('shortBreak');
        }
    } else {
        title = 'Перерыв окончен!';
        message = 'Возвращаемся к работе? Пора сфокусироваться.';
        showToast(title, message);
        switchMode('work');
    }
    
    // AutoStart next session if enabled
    if (settings.autoStart) {
        // Tiny timeout so alerts play nicely before restart
        setTimeout(() => {
            startTimer();
        }, 1200);
    }
}

// Calculate streak stats
function updateStreak() {
    const today = new Date().toDateString();
    
    if (!stats.lastCompletedDate) {
        stats.streak = 1;
    } else {
        const lastDate = new Date(stats.lastCompletedDate).toDateString();
        if (today !== lastDate) {
            const oneDay = 24 * 60 * 60 * 1000;
            const diffDays = Math.round((new Date(today) - new Date(lastDate)) / oneDay);
            
            if (diffDays === 1) {
                stats.streak++;
            } else if (diffDays > 1) {
                stats.streak = 1;
            }
        }
    }
    
    stats.lastCompletedDate = new Date().getTime();
}

// Skip current timer
function skipSession() {
    stopTimer();
    
    showToast('Сессия пропущена', 'Вы перешли к следующему интервалу.');
    
    if (currentMode === 'work') {
        if (stats.completedWorkSessions % 4 === 0 && stats.completedWorkSessions > 0) {
            switchMode('longBreak');
        } else {
            switchMode('shortBreak');
        }
    } else {
        switchMode('work');
    }
}

// Switch between modes: work, shortBreak, longBreak
function switchMode(mode) {
    currentMode = mode;
    
    // Update Tab styling and active states
    Object.keys(modeTabs).forEach(m => {
        if (m === mode) {
            modeTabs[m].classList.add('active');
        } else {
            modeTabs[m].classList.remove('active');
        }
    });
    
    // Apply dynamic active colors according to theme config
    applyActiveColors();
    
    // Presets highlights
    if (mode === 'work') {
        // highlight matching preset if exists
        presetButtons.forEach(btn => {
            if (parseInt(btn.dataset.time, 10) === settings.work) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    } else {
        presetButtons.forEach(btn => btn.classList.remove('active'));
    }
    
    // Reset core timer values
    resetTimer();
}

/* ---------------------------------------------------- */
/* ALERTS & SOUNDS */
/* ---------------------------------------------------- */

// Request Notification Permission
function requestNotificationPermission() {
    if ('Notification' in window) {
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
}

// Web Audio API Sound Synthesizer (100% offline, zero CORS/network dependency)
function playSynthesizedSound(type, volume) {
    if (type === 'none') return;
    
    // Check if AudioContext is supported
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    try {
        const ctx = new AudioContext();
        const mainGain = ctx.createGain();
        mainGain.gain.setValueAtTime(volume, ctx.currentTime);
        mainGain.connect(ctx.destination);

        if (type === 'digital') {
            // Digital double beep
            playBeep(ctx, mainGain, 880, 0.1, 0);
            playBeep(ctx, mainGain, 880, 0.1, 0.18);
            playBeep(ctx, mainGain, 880, 0.1, 0.36);
        } else if (type === 'bell') {
            // Mechanical bell (combination of frequencies, exponential decay)
            const now = ctx.currentTime;
            const freqs = [440, 554.37, 659.25, 880, 1200];
            const gains = [0.4, 0.25, 0.2, 0.15, 0.08];
            
            freqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const oscGain = ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now);
                
                oscGain.gain.setValueAtTime(gains[idx], now);
                oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0); // 2-second decay
                
                osc.connect(oscGain);
                oscGain.connect(mainGain);
                osc.start(now);
                osc.stop(now + 2.0);
            });
        } else if (type === 'gentle') {
            // Resonant gong (deep frequency, slow attack, long decay)
            const now = ctx.currentTime;
            const freqs = [180, 270, 360, 540];
            const gains = [0.5, 0.25, 0.15, 0.08];
            
            freqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const oscGain = ctx.createGain();
                
                osc.type = idx === 0 ? 'sine' : 'triangle';
                osc.frequency.setValueAtTime(freq, now);
                
                oscGain.gain.setValueAtTime(0.0001, now);
                oscGain.gain.linearRampToValueAtTime(gains[idx], now + 0.08); // 80ms attack
                oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0); // 3-second decay
                
                osc.connect(oscGain);
                oscGain.connect(mainGain);
                osc.start(now);
                osc.stop(now + 3.1);
            });
        }
    } catch (err) {
        console.error('Ошибка Web Audio API:', err);
    }
}

function playBeep(ctx, destination, freq, duration, delay) {
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.01);
    gainNode.gain.setValueAtTime(0.4, now + duration - 0.01);
    gainNode.gain.linearRampToValueAtTime(0.0001, now + duration);
    
    osc.connect(gainNode);
    gainNode.connect(destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
}

// Play finished sound
function playAlertSound() {
    playSynthesizedSound(settings.sound, settings.volume);
}

// Test sound button handler
function playTestSound() {
    const soundType = soundSelect.value;
    const vol = inputVolume.value / 100;
    playSynthesizedSound(soundType, vol);
}

// Send Desktop notification using HTML5 API
function sendDesktopNotification() {
    if (!settings.notificationsEnabled) return;
    
    if ('Notification' in window && Notification.permission === 'granted') {
        let title = '';
        let options = {
            icon: 'https://cdn-icons-png.flaticon.com/512/3233/3233989.png', // Fallback standard clock icon
            silent: true // Since we play our own custom sound
        };
        
        if (currentMode === 'work') {
            title = 'FocusTime: Фокус завершен!';
            options.body = 'Отличная работа! Перерыв начался.';
        } else {
            title = 'FocusTime: Перерыв завершен!';
            options.body = 'Пора возвращаться к работе.';
        }
        
        try {
            new Notification(title, options);
        } catch (e) {
            console.error('Ошибка отправки уведомления:', e);
        }
    }
}

/* ---------------------------------------------------- */
/* SETTINGS MODAL OPERATIONS */
/* ---------------------------------------------------- */

function openSettings() {
    // Sync slider values
    inputWork.value = settings.work;
    inputShort.value = settings.shortBreak;
    inputLong.value = settings.longBreak;
    inputVolume.value = settings.volume * 100;
    toggleNotifications.checked = settings.notificationsEnabled;
    toggleAutostart.checked = settings.autoStart;
    themeSelect.value = settings.theme || 'aurora';

    // Update labels
    updateSliderLabel(inputWork, valWork, ' мин');
    updateSliderLabel(inputShort, valShort, ' мин');
    updateSliderLabel(inputLong, valLong, ' мин');
    updateSliderLabel(inputVolume, valVolume, '%');

    // Refresh custom themes list
    renderCustomThemeList();

    settingsModal.classList.add('open');
}

function closeSettings() {
    settingsModal.classList.remove('open');
}

function applySettings() {
    // Save state variables
    settings.work = parseInt(inputWork.value, 10);
    settings.shortBreak = parseInt(inputShort.value, 10);
    settings.longBreak = parseInt(inputLong.value, 10);
    settings.volume = parseInt(inputVolume.value, 10) / 100;
    settings.notificationsEnabled = toggleNotifications.checked;
    settings.autoStart = toggleAutostart.checked;
    
    // Check if permission is requested when enabling notifications
    if (settings.notificationsEnabled && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    saveSettings();
    closeSettings();
    
    showToast('Настройки сохранены', 'Новые интервалы применены.');
    
    // Reset timer to reflect new settings
    resetTimer();
}

/* ---------------------------------------------------- */
/* TOAST NOTIFICATIONS */
/* ---------------------------------------------------- */

function showToast(title, message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    // Determine icon based on mode/status
    let iconClass = 'fa-bell';
    if (title.includes('Фокус') || title.includes('работать')) iconClass = 'fa-brain';
    else if (title.includes('Перерыв') || title.includes('отдых')) iconClass = 'fa-coffee';
    else if (title.includes('Настройки')) iconClass = 'fa-sliders-h';
    
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${iconClass}"></i></div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">&times;</button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Trigger entrance animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Setup auto-close
    const closeTimeout = setTimeout(() => {
        closeToast(toast);
    }, 5000);
    
    // Close button click
    toast.querySelector('.toast-close').addEventListener('click', () => {
        clearTimeout(closeTimeout);
        closeToast(toast);
    });
}

function closeToast(toast) {
    toast.classList.remove('show');
    // Wait for slide-out animation to complete
    toast.addEventListener('transitionend', () => {
        toast.remove();
    });
}

/* ---------------------------------------------------- */
/* THEMES SYSTEM CONFIGURATION */
/* ---------------------------------------------------- */

const THEMES = {
    aurora: {
        bgPrimary: 'radial-gradient(circle at 10% 20%, #0f0e13 0%, #151324 90%)',
        bgGlass: 'rgba(22, 21, 30, 0.65)',
        borderApp: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadiusApp: '28px',
        borderRadiusElements: '12px',
        boxShadowApp: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        bgBlobsDisplay: 'block',
        textMain: '#f8f9fa',
        textMuted: '#a6a7ab',
        textOnPrimary: '#1a0a0a',   // dark text on coral-red btn
        fontSans: "'Outfit', sans-serif",
        patternClass: '',
        colorWork: '#ff6b6b',
        colorWorkGlow: 'rgba(255, 107, 107, 0.4)',
        colorShort: '#4dabf7',
        colorShortGlow: 'rgba(77, 171, 247, 0.4)',
        colorLong: '#51cf66',
        colorLongGlow: 'rgba(81, 207, 102, 0.4)'
    },
    cyberpunk: {
        bgPrimary: '#08050e',
        bgGlass: 'rgba(15, 6, 26, 0.9)',
        borderApp: '2px solid #00ffff',
        borderRadiusApp: '0px',
        borderRadiusElements: '0px',
        boxShadowApp: '0 0 20px rgba(0, 255, 255, 0.3), 0 0 40px rgba(255, 0, 85, 0.1)',
        bgBlobsDisplay: 'none',
        textMain: '#00ffff',
        textMuted: '#ff85aa',       // softer pink — still vivid but readable on dark bg
        textOnPrimary: '#000000',   // black text on neon btn
        fontSans: "'Fira Code', monospace",
        patternClass: 'pattern-grid',
        colorWork: '#ff0055',
        colorWorkGlow: 'rgba(255, 0, 85, 0.6)',
        colorShort: '#00ffff',
        colorShortGlow: 'rgba(0, 255, 255, 0.6)',
        colorLong: '#ffff00',
        colorLongGlow: 'rgba(255, 255, 0, 0.6)'
    },
    arcade: {
        bgPrimary: '#070710',
        bgGlass: '#151522',
        borderApp: '4px double #ffffff',
        borderRadiusApp: '4px',
        borderRadiusElements: '4px',
        boxShadowApp: '8px 8px 0px rgba(0, 0, 0, 1)',
        bgBlobsDisplay: 'none',
        textMain: '#ffffff',
        textMuted: '#b07ef8',       // lighter purple for better contrast on dark bg
        textOnPrimary: '#000000',   // black on orange btn
        fontSans: "'Press Start 2P', cursive",
        patternClass: 'pattern-scanlines',
        colorWork: '#ff9900',
        colorWorkGlow: 'rgba(255, 153, 0, 0.4)',
        colorShort: '#00e676',
        colorShortGlow: 'rgba(0, 230, 118, 0.4)',
        colorLong: '#ff5252',
        colorLongGlow: 'rgba(255, 82, 82, 0.4)'
    },
    zen: {
        bgPrimary: '#f4f1ea',
        bgGlass: 'rgba(255, 255, 255, 0.92)',
        borderApp: '1.5px solid #283618',
        borderRadiusApp: '36px',
        borderRadiusElements: '18px',
        boxShadowApp: '0 10px 30px rgba(40, 54, 24, 0.08)',
        bgBlobsDisplay: 'none',
        textMain: '#283618',
        textMuted: '#606c38',
        textOnPrimary: '#f4f1ea',   // cream text on dark-green btn
        fontSans: "'Lora', serif",
        patternClass: 'pattern-dots',
        colorWork: '#4a7c59',       // mid-green — readable on cream, not too dark on btn
        colorWorkGlow: 'rgba(74, 124, 89, 0.2)',
        colorShort: '#bc6c25',
        colorShortGlow: 'rgba(188, 108, 37, 0.2)',
        colorLong: '#8b5cf6',
        colorLongGlow: 'rgba(139, 92, 246, 0.2)'
    },
    synthwave: {
        bgPrimary: 'linear-gradient(180deg, #1b0933 0%, #3e0c47 50%, #611849 100%)',
        bgGlass: 'rgba(30, 10, 50, 0.75)',
        borderApp: '1px solid #d45087',
        borderRadiusApp: '16px',
        borderRadiusElements: '8px',
        boxShadowApp: '0 0 25px rgba(212, 80, 135, 0.35)',
        bgBlobsDisplay: 'none',
        textMain: '#ffffff',
        textMuted: '#ffb347',       // warm amber — vivid but not red-on-purple
        textOnPrimary: '#ffffff',   // white on deep-pink btn
        fontSans: "'Montserrat', sans-serif",
        patternClass: 'pattern-stripes',
        colorWork: '#f25c54',
        colorWorkGlow: 'rgba(242, 92, 84, 0.5)',
        colorShort: '#c084fc',
        colorShortGlow: 'rgba(192, 132, 252, 0.5)',
        colorLong: '#ffa600',
        colorLongGlow: 'rgba(255, 166, 0, 0.5)'
    }
};

// Apply selected theme variables dynamically
function applyTheme(themeName) {
    const theme = THEMES[themeName] || THEMES.aurora;
    
    // Load font dynamically from Google Fonts if needed
    loadThemeFont(theme.fontSans);

    // Apply configuration values to root variables
    const root = document.documentElement;
    root.style.setProperty('--bg-primary', theme.bgPrimary);
    root.style.setProperty('--bg-glass', theme.bgGlass);
    root.style.setProperty('--border-app', theme.borderApp);
    root.style.setProperty('--border-radius-app', theme.borderRadiusApp);
    root.style.setProperty('--border-radius-elements', theme.borderRadiusElements);
    root.style.setProperty('--box-shadow-app', theme.boxShadowApp);
    root.style.setProperty('--bg-blobs-display', theme.bgBlobsDisplay);
    root.style.setProperty('--text-main', theme.textMain);
    root.style.setProperty('--text-muted', theme.textMuted);
    root.style.setProperty('--font-sans', theme.fontSans);
    // Button-icon contrast colour (varies with primary colour per theme)
    root.style.setProperty('--text-on-primary', theme.textOnPrimary || '#ffffff');

    // Swap body theme class so CSS theme-selectors work (e.g. .theme-arcade)
    document.body.className = document.body.className
        .replace(/\btheme-\S+/g, '')
        .trim();
    document.body.classList.add(`theme-${themeName}`);

    // Apply background patterns
    bgPatternOverlay.className = 'pattern-overlay';
    if (theme.patternClass) {
        bgPatternOverlay.classList.add(theme.patternClass);
    }

    // Refresh colors for current Work/Break mode
    applyActiveColors();
    
    // Snugly adjust progress ring dash offset on font/geometry load
    setTimeout(() => {
        initProgressRing();
    }, 100);
}

// Apply colors for the current mode based on theme settings
function applyActiveColors() {
    const theme = THEMES[settings.theme || 'aurora'] || THEMES.aurora;
    let color = theme.colorWork;
    let glow = theme.colorWorkGlow;
    
    if (currentMode === 'shortBreak') {
        color = theme.colorShort;
        glow = theme.colorShortGlow;
    } else if (currentMode === 'longBreak') {
        color = theme.colorLong;
        glow = theme.colorLongGlow;
    }
    
    document.documentElement.style.setProperty('--primary', color);
    document.documentElement.style.setProperty('--primary-glow', glow);
}

// Dynamically request and append font stylesheet from Google Fonts
function loadThemeFont(fontFamily) {
    if (!fontFamily.includes("'")) return;
    
    const match = fontFamily.match(/'([^']+)'/);
    if (!match) return;
    const fontName = match[1];
    
    const linkId = `font-link-${fontName.toLowerCase().replace(/\s+/g, '-')}`;
    if (document.getElementById(linkId)) return;
    
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    const formattedName = fontName.replace(/\s+/g, '+');
    link.href = `https://fonts.googleapis.com/css2?family=${formattedName}:wght@300;400;500;700;800;900&display=swap`;
    
    document.head.appendChild(link);
}

/* ---------------------------------------------------- */
/* CUSTOM THEME SYSTEM                                  */
/* ---------------------------------------------------- */

// Convert #rrggbb to rgba(r,g,b,a)
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Load saved custom themes from localStorage into THEMES + dropdown
function loadCustomThemes() {
    try {
        const saved = localStorage.getItem('focustime_custom_themes');
        if (saved) {
            customThemes = JSON.parse(saved);
            Object.keys(customThemes).forEach(key => {
                THEMES[key] = customThemes[key];
            });
            refreshThemeSelect();
            // Restore selected custom theme if saved
            if (settings.theme && settings.theme.startsWith('custom_') && THEMES[settings.theme]) {
                themeSelect.value = settings.theme;
            }
        }
    } catch (e) {
        console.error('Ошибка загрузки пользовательских тем:', e);
    }
}

function saveCustomThemesToStorage() {
    localStorage.setItem('focustime_custom_themes', JSON.stringify(customThemes));
}

// Sync <select> options with current custom themes
function refreshThemeSelect() {
    // Remove stale custom options
    Array.from(themeSelect.options).forEach(opt => {
        if (opt.value.startsWith('custom_')) opt.remove();
    });
    // Re-add all current custom themes
    Object.keys(customThemes).forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = `🎨 ${customThemes[key].displayName}`;
        themeSelect.appendChild(opt);
    });
}

// Render the list of saved custom themes inside the builder section
function renderCustomThemeList() {
    const list = document.getElementById('ct-saved-list');
    if (!list) return;
    list.innerHTML = '';

    const keys = Object.keys(customThemes);
    if (keys.length === 0) return;

    keys.forEach(key => {
        const theme = customThemes[key];
        const isActive = settings.theme === key;

        const item = document.createElement('div');
        item.className = 'ct-saved-item';
        item.innerHTML = `
            <div class="ct-saved-item-info">
                <div class="ct-swatches">
                    <div class="ct-swatch" style="background:${theme.colorWork}" title="Фокус"></div>
                    <div class="ct-swatch" style="background:${theme.colorShort}" title="Перерыв"></div>
                    <div class="ct-swatch" style="background:${theme.colorLong}" title="Длинный отдых"></div>
                </div>
                <span class="ct-saved-item-name">${theme.displayName}${isActive ? ' ✓' : ''}</span>
            </div>
            <div class="ct-item-actions">
                <button class="ct-apply-btn" data-key="${key}">Применить</button>
                <button class="ct-delete-btn" data-key="${key}" title="Удалить тему">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;

        item.querySelector('.ct-apply-btn').addEventListener('click', () => {
            settings.theme = key;
            saveSettings();
            themeSelect.value = key;
            applyTheme(key);
            renderCustomThemeList();
            showToast('Тема применена', `Тема «${theme.displayName}» активна.`);
        });

        item.querySelector('.ct-delete-btn').addEventListener('click', () => {
            deleteCustomTheme(key);
        });

        list.appendChild(item);
    });
}

function deleteCustomTheme(key) {
    const name = customThemes[key]?.displayName || key;
    // If the active theme is being deleted, fall back to aurora
    if (settings.theme === key) {
        settings.theme = 'aurora';
        saveSettings();
        applyTheme('aurora');
        themeSelect.value = 'aurora';
    }
    delete customThemes[key];
    delete THEMES[key];
    saveCustomThemesToStorage();
    refreshThemeSelect();
    renderCustomThemeList();
    showToast('Тема удалена', `«${name}» была удалена.`);
}

// Wire up the custom theme builder form
function initCustomThemeBuilder() {
    const addBtn = document.getElementById('ct-add-btn');
    if (!addBtn) return;

    addBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('ct-name');
        const name = nameInput.value.trim();

        if (!name) {
            showToast('Введите название', 'Задайте название для новой темы.');
            nameInput.focus();
            return;
        }

        // Read color values
        const bg       = document.getElementById('ct-bg').value;
        const glass    = document.getElementById('ct-glass').value;
        const textMain = document.getElementById('ct-text').value;
        const textMuted= document.getElementById('ct-muted').value;
        const work     = document.getElementById('ct-work').value;
        const shortC   = document.getElementById('ct-short').value;
        const longC    = document.getElementById('ct-long').value;
        const btnText  = document.getElementById('ct-btn-text').value;
        const radius   = (document.querySelector('input[name="ct-radius"]:checked') || {}).value || 'rounded';

        const radiiMap = {
            sharp:   { app: '4px',  el: '4px' },
            rounded: { app: '24px', el: '12px' },
            pill:    { app: '40px', el: '20px' }
        };
        const radii = radiiMap[radius] || radiiMap.rounded;

        // Unique key (sanitized name + timestamp)
        const key = `custom_${name.toLowerCase().replace(/[^a-z0-9а-яё]/gi, '-')}_${Date.now()}`;

        const themeObj = {
            displayName: name,
            isCustom: true,
            bgPrimary: bg,
            bgGlass: hexToRgba(glass, 0.78),
            borderApp: `1px solid ${hexToRgba(textMain, 0.1)}`,
            borderRadiusApp: radii.app,
            borderRadiusElements: radii.el,
            boxShadowApp: '0 20px 25px -5px rgba(0,0,0,0.3), 0 10px 10px -5px rgba(0,0,0,0.04)',
            bgBlobsDisplay: 'none',
            textMain,
            textMuted,
            textOnPrimary: btnText,
            fontSans: "'Outfit', sans-serif",
            patternClass: '',
            colorWork: work,
            colorWorkGlow: hexToRgba(work, 0.4),
            colorShort: shortC,
            colorShortGlow: hexToRgba(shortC, 0.4),
            colorLong: longC,
            colorLongGlow: hexToRgba(longC, 0.4)
        };

        // Save and apply
        customThemes[key] = themeObj;
        THEMES[key] = themeObj;
        saveCustomThemesToStorage();
        refreshThemeSelect();

        settings.theme = key;
        saveSettings();
        themeSelect.value = key;
        applyTheme(key);

        renderCustomThemeList();
        nameInput.value = '';
        showToast('Тема добавлена!', `«${name}» применена.`);
    });
}
