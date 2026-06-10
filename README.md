# ⏱️ FocusTime — Pomodoro Timer

> Красивый, функциональный таймер Помодоро с несколькими визуальными темами, встроенными звуками и статистикой сессий.

![Preview](https://img.shields.io/badge/status-live-brightgreen?style=flat-square)
![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JS](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)

---

## ✨ Возможности

- 🎯 **Три режима** — Фокус, Короткий отдых, Длинный отдых
- 🎨 **5 визуальных тем** — Аврора, Киберпанк, 8-бит, Органика, Синтвейв
- 🔔 **Звуковые оповещения** — классический звонок, электронный будильник, нежный гонг (Web Audio API, без файлов)
- 📊 **Статистика** — счётчик сессий, суммарное время фокуса, серия дней
- ⚡ **Быстрые пресеты** — 15 / 25 / 45 / 60 минут
- 🔔 **Браузерные уведомления** (Notification API)
- 💾 **Сохранение настроек** через localStorage
- 📱 **Адаптивный дизайн** — работает на мобильных

---

## 🎨 Темы

| Тема | Описание |
|------|----------|
| ✨ **Аврора** | Тёмный glassmorphism с цветными блобами |
| ⚡ **Киберпанк** | Неон на чёрном, сетчатый паттерн |
| 👾 **8-бит** | Пиксельный шрифт, ретро-аркадный стиль |
| 🍃 **Органика** | Светлая тема, земляные тона |
| 🌅 **Синтвейв** | Ретро-градиент, фиолетово-розовая палитра |

---

## 🚀 Запуск

### Вариант 1 — напрямую в браузере
Просто открой `index.html` в любом браузере.

### Вариант 2 — локальный сервер (рекомендуется)
```bash
# Python 3
python -m http.server 8000
```
Затем открой [http://localhost:8000](http://localhost:8000)

---

## 📁 Структура

```
pomodoro-timer/
├── index.html      # Разметка приложения
├── style.css       # Все стили + система тем
├── script.js       # Логика таймера, темы, звуки
└── server.py       # Вспомогательный Python-сервер
```

---

## 🛠️ Технологии

- **Vanilla HTML / CSS / JavaScript** — без фреймворков
- **Web Audio API** — синтез звуков без внешних файлов
- **CSS Custom Properties** — динамическая смена тем
- **localStorage** — сохранение настроек и статистики
- **Notification API** — браузерные push-уведомления
- **Google Fonts** — Outfit, Lora, Montserrat, Fira Code, Press Start 2P

---

## 📝 Лицензия

MIT — используй свободно.
