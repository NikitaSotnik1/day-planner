document.addEventListener('DOMContentLoaded', function() {
    // Элементы DOM
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const tasksList = document.getElementById('tasksList');
    const timeline = document.getElementById('timeline');
    const timeLabels = document.querySelector('.time-labels');
    const parsedPreview = document.getElementById('parsedPreview');
    const previewName = document.querySelector('.preview-name');
    const previewTime = document.querySelector('.preview-time');
    const previewCategory = document.querySelector('.preview-category');
    const timeInput = document.getElementById('timeInput');
    const durationInput = document.getElementById('durationInput');
    const categorySelect = document.getElementById('categorySelect');
    const clearDayBtn = document.getElementById('clearDayBtn');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const focusModal = document.getElementById('focusModal');
    const closeModalBtn = document.querySelector('.close-modal');
    const focusTaskTitle = document.getElementById('focusTaskTitle');
    const focusTaskTime = document.getElementById('focusTaskTime');
    const timerDisplay = document.getElementById('timerDisplay');
    const startTimerBtn = document.getElementById('startTimerBtn');
    const pauseTimerBtn = document.getElementById('pauseTimerBtn');
    const resetTimerBtn = document.getElementById('resetTimerBtn');
    const modeButtons = document.querySelectorAll('.mode-btn');
    const exportBtn = document.getElementById('exportBtn');
    const exportAllBtn = document.getElementById('exportAllBtn');
    const importFile = document.getElementById('importFile');
    const showQRBtn = document.getElementById('showQRBtn');
    const currentDateElement = document.getElementById('currentDate');
    const workTimeInput = document.getElementById('workTimeInput');
    const breakTimeInput = document.getElementById('breakTimeInput');
    const saveTimeSettings = document.getElementById('saveTimeSettings');
    const customTimeSettings = document.getElementById('customTimeSettings');
    
    // Статистика
    const totalTasksElement = document.getElementById('totalTasks');
    const totalTimeElement = document.getElementById('totalTime');
    const completedTasksElement = document.getElementById('completedTasks');
    
    // Данные
    let tasks = JSON.parse(localStorage.getItem('dayPlannerTasks')) || [];
    let timerSettings = JSON.parse(localStorage.getItem('pomodoroSettings')) || {
        workTime: 25,
        breakTime: 5
    };
    let currentFilter = 'all';
    let timerInterval = null;
    let timerSeconds = timerSettings.workTime * 60;
    let isTimerRunning = false;
    let currentTimerMode = 'work';
    let currentFocusTaskId = null;
    
    // Инициализация
    init();
    
    // ==================== ИНИЦИАЛИЗАЦИЯ ====================
    function init() {
        updateCurrentDate();
        generateTimeLabels();
        renderTasks();
        updateStats();
        
        // Предпросмотр при вводе
        taskInput.addEventListener('input', updateParsedPreview);
        
        // Добавление задачи
        addTaskBtn.addEventListener('click', addTaskFromInput);
        taskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') addTaskFromInput();
        });
        
        // Очистка дня
        clearDayBtn.addEventListener('click', clearAllTasks);
        
        // Фильтры
        filterButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                filterButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentFilter = this.dataset.filter;
                renderTasks();
            });
        });
        
        // Модальное окно
        closeModalBtn.addEventListener('click', closeFocusModal);
        focusModal.addEventListener('click', function(e) {
            if (e.target === this) closeFocusModal();
        });
        
        // Таймер
        startTimerBtn.addEventListener('click', startTimer);
        pauseTimerBtn.addEventListener('click', pauseTimer);
        resetTimerBtn.addEventListener('click', resetTimer);
        
        // Режимы таймера и настройки времени
        modeButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const mode = this.dataset.mode;
                
                if (mode === 'custom') {
                    // Показываем настройки
                    customTimeSettings.style.display = 'block';
                    workTimeInput.value = timerSettings.workTime;
                    breakTimeInput.value = timerSettings.breakTime;
                    
                    // Делаем активной кнопку "Настроить"
                    modeButtons.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    return;
                }
                
                // Для обычных режимов
                modeButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentTimerMode = mode;
                
                // Устанавливаем время из настроек
                timerSeconds = (mode === 'work' ? timerSettings.workTime : timerSettings.breakTime) * 60;
                
                updateTimerDisplay();
                resetTimer();
                // Скрываем настройки если они открыты
                customTimeSettings.style.display = 'none';
            });
        });
        
        // Сохранение настроек времени
        saveTimeSettings.addEventListener('click', saveTimeSettingsHandler);
        
        // Экспорт
        exportBtn.addEventListener('click', exportDay);
        
        // Полный экспорт/импорт
        if (exportAllBtn) exportAllBtn.addEventListener('click', exportAllData);
        if (importFile) importFile.addEventListener('change', importAllData);
        
        // QR-код
        if (showQRBtn) showQRBtn.addEventListener('click', generateQRCode);
        
        // Drag and drop для таймлайна
        initDragAndDrop();
        
        // Слушаем изменение размера окна
        window.addEventListener('resize', handleResize);
        
        // Запрос разрешения на уведомления
        if ('Notification' in window && Notification.permission === 'default') {
            setTimeout(() => {
                Notification.requestPermission();
            }, 2000);
        }
    }
    
    // ==================== ОСНОВНЫЕ ФУНКЦИИ ====================
    
    // 1. Интеллектуальный парсинг задачи
    function parseTaskText(text) {
        const parsed = {
            name: text.trim(),
            time: timeInput.value,
            duration: parseInt(durationInput.value),
            category: categorySelect.value
        };
        
        // Поиск времени в тексте (форматы: "в 14:30", "15:00", "9 утра")
        const timeRegex = /(\d{1,2}):(\d{2})|(\d{1,2})\s*(утра|вечера|дня|ночи)/gi;
        const timeMatch = text.match(timeRegex);
        
        if (timeMatch) {
            let timeStr = timeMatch[0];
            // Преобразуем "9 утра" в "09:00"
            if (timeStr.includes('утра') || timeStr.includes('дня')) {
                const hour = parseInt(timeStr);
                parsed.time = `${hour.toString().padStart(2, '0')}:00`;
            } else if (timeStr.includes('вечера') || timeStr.includes('ночи')) {
                const hour = parseInt(timeStr) + 12;
                parsed.time = `${hour.toString().padStart(2, '0')}:00`;
            } else {
                parsed.time = timeStr;
            }
            
            // Удаляем время из названия
            parsed.name = parsed.name.replace(timeMatch[0], '').trim();
        }
        
        // Определение категории по ключевым словам
        const keywords = {
            'работа': 'work',
            'рабочий': 'work',
            'совещание': 'meeting',
            'встреча': 'meeting',
            'здоровье': 'health',
            'спорт': 'health',
            'тренировка': 'health',
            'урок': 'study',
            'учёба': 'study',
            'учеба': 'study',
            'занятие': 'study',
            'личное': 'personal',
            'отдых': 'personal',
            'прогулка': 'personal',
            'сон': 'health',
            'еда': 'health',
            'ужин': 'health',
            'обед': 'health',
            'завтрак': 'health'
        };
        
        const lowerText = text.toLowerCase();
        for (const [keyword, category] of Object.entries(keywords)) {
            if (lowerText.includes(keyword)) {
                parsed.category = category;
                break;
            }
        }
        
        return parsed;
    }
    
    // 2. Обновление предпросмотра
    function updateParsedPreview() {
        if (!taskInput.value.trim()) {
            parsedPreview.style.display = 'none';
            return;
        }
        
        const parsed = parseTaskText(taskInput.value);
        
        previewName.textContent = parsed.name || 'Название';
        previewTime.textContent = `Время: ${parsed.time}`;
        
        const categoryNames = {
            'work': 'Работа',
            'study': 'Учёба',
            'personal': 'Личное',
            'meeting': 'Встречи',
            'health': 'Здоровье',
            'other': 'Общее'
        };
        
        previewCategory.textContent = `Категория: ${categoryNames[parsed.category]}`;
        
        // Обновляем поля ввода
        timeInput.value = parsed.time;
        categorySelect.value = parsed.category;
        
        parsedPreview.style.display = 'block';
    }
    
    // 3. Добавление задачи
    function addTaskFromInput() {
        const text = taskInput.value.trim();
        if (!text) {
            alert('Введите задачу!');
            return;
        }
        
        const parsed = parseTaskText(text);
        
        const task = {
            id: Date.now().toString(),
            name: parsed.name || text,
            time: parsed.time,
            duration: parsed.duration,
            category: parsed.category,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        tasks.push(task);
        saveTasks();
        renderTasks();
        updateStats();
        
        // Сброс формы
        taskInput.value = '';
        parsedPreview.style.display = 'none';
        timeInput.value = '09:00';
        durationInput.value = '60';
        categorySelect.value = 'personal';
        
        // Фокус обратно на ввод
        taskInput.focus();
    }
    
    // 4. Сохранение в LocalStorage
    function saveTasks() {
        localStorage.setItem('dayPlannerTasks', JSON.stringify(tasks));
    }
    
    // 5. Генерация временных меток
    function generateTimeLabels() {
        timeLabels.innerHTML = '';
        
        // Определяем высоту часа в зависимости от экрана
        const isMobile = window.innerWidth <= 768;
        const hourHeight = isMobile ? 40 : 50;
        
        for (let hour = 0; hour < 24; hour++) {
            const label = document.createElement('div');
            label.className = 'time-label';
            label.textContent = `${hour.toString().padStart(2, '0')}:00`;
            label.style.height = `${hourHeight}px`;
            timeLabels.appendChild(label);
        }
        
        // Устанавливаем высоту таймлайна
        const totalHeight = 20 + (24 * hourHeight); // +20px для padding-top
        timeline.style.minHeight = `${totalHeight}px`;
    }
    
    // 6. Отрисовка задач
    function renderTasks() {
        // Фильтрация
        let filteredTasks = tasks;
        if (currentFilter === 'pending') {
            filteredTasks = tasks.filter(t => !t.completed);
        } else if (currentFilter === 'completed') {
            filteredTasks = tasks.filter(t => t.completed);
        }
        
        // Сортировка по времени
        filteredTasks.sort((a, b) => {
            const timeA = a.time.split(':').map(Number);
            const timeB = b.time.split(':').map(Number);
            return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
        });
        
        // Очистка списка
        tasksList.innerHTML = '';
        timeline.innerHTML = '';
        
        // Отрисовка каждой задачи
        filteredTasks.forEach(task => {
            // В список
            const taskElement = createTaskElement(task);
            tasksList.appendChild(taskElement);
            
            // На таймлайн
            const timelineBlock = createTimelineBlock(task);
            timeline.appendChild(timelineBlock);
        });
        
        // Обновление позиций на таймлайне
        updateTimelinePositions();
    }
    
    // 7. Создание элемента задачи для списка
    function createTaskElement(task) {
        const div = document.createElement('div');
        div.className = `task-item ${task.completed ? 'completed' : ''} category-${task.category}`;
        div.dataset.id = task.id;
        
        const categoryNames = {
            'work': 'Работа',
            'study': 'Учёба',
            'personal': 'Личное',
            'meeting': 'Встречи',
            'health': 'Здоровье',
            'other': 'Общее'
        };
        
        div.innerHTML = `
            <div class="task-info">
                <div class="task-name">${task.name}</div>
                <div class="task-meta">
                    <span class="task-time"><i class="far fa-clock"></i> ${task.time}</span>
                    <span class="task-duration"><i class="fas fa-hourglass-half"></i> ${task.duration} мин</span>
                    <span class="task-category"><i class="fas fa-tag"></i> ${categoryNames[task.category]}</span>
                </div>
            </div>
            <div class="task-actions">
                <button class="task-btn complete-btn" title="${task.completed ? 'Возобновить' : 'Выполнить'}">
                    <i class="fas fa-${task.completed ? 'undo' : 'check'}"></i>
                </button>
                <button class="task-btn focus-btn" title="Фокус-режим">
                    <i class="fas fa-bullseye"></i>
                </button>
                <button class="task-btn delete-btn" title="Удалить">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        
        // Обработчики кнопок
        const completeBtn = div.querySelector('.complete-btn');
        const focusBtn = div.querySelector('.focus-btn');
        const deleteBtn = div.querySelector('.delete-btn');
        
        completeBtn.addEventListener('click', () => toggleTaskComplete(task.id));
        focusBtn.addEventListener('click', () => openFocusModal(task.id));
        deleteBtn.addEventListener('click', () => deleteTask(task.id));
        
        return div;
    }
    
    // 8. Создание блока на таймлайне
    function createTimelineBlock(task) {
        const block = document.createElement('div');
        block.className = `task-block ${task.completed ? 'completed' : ''} category-${task.category}`;
        block.dataset.id = task.id;
        block.draggable = true;
        
        const categoryNames = {
            'work': 'Работа',
            'study': 'Учёба',
            'personal': 'Личное',
            'meeting': 'Встречи',
            'health': 'Здоровье',
            'other': 'Общее'
        };
        
        block.innerHTML = `
            <div class="task-block-title">${task.name}</div>
            <div class="task-block-time">${task.time} (${task.duration} мин)</div>
            <div class="task-block-actions">
                <button class="task-block-btn complete-timeline-btn">
                    <i class="fas fa-${task.completed ? 'undo' : 'check'}"></i>
                </button>
                <button class="task-block-btn focus-timeline-btn">
                    <i class="fas fa-bullseye"></i>
                </button>
            </div>
        `;
        
        // Обработчики
        const completeBtn = block.querySelector('.complete-timeline-btn');
        const focusBtn = block.querySelector('.focus-timeline-btn');
        
        completeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleTaskComplete(task.id);
        });
        
        focusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openFocusModal(task.id);
        });
        
        return block;
    }
    
    // 9. Обновление позиций на таймлайне
    function updateTimelinePositions() {
        const blocks = document.querySelectorAll('.task-block');
        const isMobile = window.innerWidth <= 768;
        const hourHeight = isMobile ? 40 : 50;
        
        blocks.forEach(block => {
            const taskId = block.dataset.id;
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;
            
            const [hours, minutes] = task.time.split(':').map(Number);
            const top = 20 + (hours * 60 + minutes) / 60 * hourHeight; // +20px для padding-top
            const height = task.duration / 60 * hourHeight;
            
            // Проверяем, чтобы задача не выходила за границы 24 часов
            const maxTop = 20 + (24 * hourHeight) - height;
            const adjustedTop = Math.min(top, maxTop);
            
            block.style.top = `${adjustedTop}px`;
            block.style.height = `${height}px`;
        });
    }
    
    // 10. Drag and drop для таймлайна
    function initDragAndDrop() {
        let draggedTask = null;
        const isMobile = window.innerWidth <= 768;
        const hourHeight = isMobile ? 40 : 50;
        
        timeline.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('task-block')) {
                draggedTask = e.target;
                e.target.style.opacity = '0.5';
            }
        });
        
        timeline.addEventListener('dragend', (e) => {
            if (draggedTask) {
                draggedTask.style.opacity = '1';
                draggedTask = null;
            }
        });
        
        timeline.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        timeline.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!draggedTask) return;
            
            const rect = timeline.getBoundingClientRect();
            const y = e.clientY - rect.top;
            // Вычитаем 20px padding-top при расчёте
            const totalMinutes = ((y - 20) / hourHeight) * 60;
            
            let hours = Math.floor(totalMinutes / 60);
            let minutes = Math.floor(totalMinutes % 60);
            
            // Округление до ближайших 15 минут
            minutes = Math.round(minutes / 15) * 15;
            if (minutes === 60) {
                hours += 1;
                minutes = 0;
            }
            
            if (hours >= 24) hours = 23;
            if (hours < 0) hours = 0;
            if (minutes < 0) minutes = 0;
            
            const newTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            
            // Обновление задачи
            const taskId = draggedTask.dataset.id;
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                tasks[taskIndex].time = newTime;
                saveTasks();
                renderTasks();
            }
        });
    }
    
    // 11. Обновление статистики
    function updateStats() {
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        const totalMinutes = tasks.reduce((sum, task) => sum + task.duration, 0);
        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;
        
        totalTasksElement.textContent = total;
        completedTasksElement.textContent = completed;
        totalTimeElement.textContent = `${totalHours}ч ${remainingMinutes}м`;
    }
    
    // 12. Обновление даты
    function updateCurrentDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        try {
            currentDateElement.textContent = now.toLocaleDateString('ru-RU', options);
        } catch (error) {
            // Резервный вариант
            const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
            const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 
                           'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
            
            const dayOfWeek = days[now.getDay()];
            const day = now.getDate();
            const month = months[now.getMonth()];
            const year = now.getFullYear();
            
            currentDateElement.textContent = `${dayOfWeek}, ${day} ${month} ${year} года`;
        }
    }
    
    // 13. Обработка изменения размера окна
    function handleResize() {
        generateTimeLabels();
        updateTimelinePositions();
    }
    
    // ==================== ОПЕРАЦИИ С ЗАДАЧАМИ ====================
    
    function toggleTaskComplete(taskId) {
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex].completed = !tasks[taskIndex].completed;
            saveTasks();
            renderTasks();
            updateStats();
        }
    }
    
    function deleteTask(taskId) {
        if (confirm('Удалить эту задачу?')) {
            tasks = tasks.filter(t => t.id !== taskId);
            saveTasks();
            renderTasks();
            updateStats();
        }
    }
    
    function clearAllTasks() {
        if (tasks.length === 0) return;
        if (confirm('Очистить весь план на день? Это действие нельзя отменить.')) {
            tasks = [];
            saveTasks();
            renderTasks();
            updateStats();
        }
    }
    
    // ==================== ФОКУС-РЕЖИМ И ТАЙМЕР ====================
    
    function openFocusModal(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        currentFocusTaskId = taskId;
        focusTaskTitle.textContent = task.name;
        focusTaskTime.textContent = `Запланировано на ${task.time}, длительность: ${task.duration} мин`;
        
        // Сброс таймера
        resetTimer();
        
        // Показать модальное окно
        focusModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    
    function closeFocusModal() {
        focusModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        pauseTimer();
        currentFocusTaskId = null;
    }
    
    function startTimer() {
        // ВАЖНОЕ ИСПРАВЛЕНИЕ: Получаем текущий режим из АКТИВНОЙ кнопки
        const activeModeBtn = document.querySelector('.mode-btn.active');
        if (activeModeBtn) {
            const mode = activeModeBtn.dataset.mode;
            if (mode === 'work' || mode === 'break') {
                currentTimerMode = mode;
                // Устанавливаем правильное время для выбранного режима
                timerSeconds = (mode === 'work' ? timerSettings.workTime : timerSettings.breakTime) * 60;
            }
        }
        
        if (isTimerRunning) return;
        
        isTimerRunning = true;
        startTimerBtn.disabled = true;
        pauseTimerBtn.disabled = false;
        
        timerInterval = setInterval(() => {
            timerSeconds--;
            updateTimerDisplay();
            
            if (timerSeconds <= 0) {
                clearInterval(timerInterval);
                isTimerRunning = false;
                
                // Звуковое уведомление
                playTimerSound();
                
                // Браузерное уведомление (если разрешено)
                if (Notification.permission === 'granted') {
                    new Notification('Таймер завершён!', {
                        body: currentTimerMode === 'work' 
                            ? 'Время работать закончилось. Сделайте перерыв!' 
                            : 'Перерыв окончен. Возвращайтесь к работе!',
                        icon: 'https://cdn-icons-png.flaticon.com/512/3208/3208720.png'
                    });
                }
                
                alert(currentTimerMode === 'work' 
                    ? 'Время работы закончилось! Сделайте перерыв.' 
                    : 'Перерыв окончен! Возвращайтесь к работе.');
                
                // Автоматическое переключение режима
                const nextMode = currentTimerMode === 'work' ? 'break' : 'work';
                const nextMinutes = nextMode === 'work' ? timerSettings.workTime : timerSettings.breakTime;
                
                // Переключаем кнопку режима
                modeButtons.forEach(b => b.classList.remove('active'));
                const nextModeBtn = document.querySelector(`.mode-btn[data-mode="${nextMode}"]`);
                if (nextModeBtn) {
                    nextModeBtn.classList.add('active');
                }
                
                // Устанавливаем время для СЛЕДУЮЩЕГО интервала
                timerSeconds = nextMinutes * 60;
                updateTimerDisplay();
                
                // Сбрасываем состояние кнопок и обновляем текущий режим
                startTimerBtn.disabled = false;
                pauseTimerBtn.disabled = true;
                currentTimerMode = nextMode;
            }
        }, 1000);
    }
    
    function pauseTimer() {
        if (!isTimerRunning) return;
        
        clearInterval(timerInterval);
        isTimerRunning = false;
        startTimerBtn.disabled = false;
        pauseTimerBtn.disabled = true;
    }
    
    function resetTimer() {
        pauseTimer();
        
        // Получаем режим из активной кнопки
        const activeModeBtn = document.querySelector('.mode-btn.active');
        if (activeModeBtn) {
            const mode = activeModeBtn.dataset.mode;
            if (mode === 'work' || mode === 'break') {
                timerSeconds = (mode === 'work' ? timerSettings.workTime : timerSettings.breakTime) * 60;
                currentTimerMode = mode; // Обновляем текущий режим
            }
        }
        
        updateTimerDisplay();
    }
    
    function updateTimerDisplay() {
        const minutes = Math.floor(timerSeconds / 60);
        const seconds = timerSeconds % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Обновляем текст на кнопках режимов
        const workBtn = document.querySelector('.mode-btn[data-mode="work"]');
        const breakBtn = document.querySelector('.mode-btn[data-mode="break"]');
        if (workBtn) workBtn.textContent = `Работа (${timerSettings.workTime}м)`;
        if (breakBtn) breakBtn.textContent = `Перерыв (${timerSettings.breakTime}м)`;
    }
    
    function playTimerSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 1);
        } catch (e) {
            console.log('Аудио не поддерживается');
        }
    }
    
    // ==================== НАСТРОЙКИ ВРЕМЕНИ ====================
    
    function saveTimeSettingsHandler() {
        const workTime = parseInt(workTimeInput.value);
        const breakTime = parseInt(breakTimeInput.value);
        
        if (workTime < 1 || workTime > 120 || breakTime < 1 || breakTime > 60) {
            alert('Введите корректное время (работа: 1-120 мин, перерыв: 1-60 мин)');
            return;
        }
        
        // Сохраняем настройки
        timerSettings.workTime = workTime;
        timerSettings.breakTime = breakTime;
        localStorage.setItem('pomodoroSettings', JSON.stringify(timerSettings));
        
        // Обновляем отображение
        updateTimerDisplay();
        
        // Если текущий режим активен, обновляем таймер
        if (currentTimerMode === 'work') {
            timerSeconds = timerSettings.workTime * 60;
        } else if (currentTimerMode === 'break') {
            timerSeconds = timerSettings.breakTime * 60;
        }
        
        updateTimerDisplay();
        resetTimer();
        
        // Переключаем на режим работы
        const workBtn = document.querySelector('.mode-btn[data-mode="work"]');
        modeButtons.forEach(b => b.classList.remove('active'));
        workBtn.classList.add('active');
        currentTimerMode = 'work';
        timerSeconds = timerSettings.workTime * 60;
        updateTimerDisplay();
        
        // Скрываем настройки
        customTimeSettings.style.display = 'none';
        
        alert('Настройки сохранены!');
    }
    
    // ==================== ЭКСПОРТ/ИМПОРТ ====================
    
    function exportDay() {
        if (tasks.length === 0) {
            alert('Нет задач для экспорта');
            return;
        }
        
        let exportText = `План на день (${new Date().toLocaleDateString('ru-RU')})\n`;
        exportText += '='.repeat(50) + '\n\n';
        
        // Группировка по времени
        const sortedTasks = [...tasks].sort((a, b) => {
            const timeA = a.time.split(':').map(Number);
            const timeB = b.time.split(':').map(Number);
            return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
        });
        
        const categoryNames = {
            'work': 'Работа',
            'study': 'Учёба',
            'personal': 'Личное',
            'meeting': 'Встречи',
            'health': 'Здоровье',
            'other': 'Общее'
        };
        
        sortedTasks.forEach((task, index) => {
            const status = task.completed ? '✅' : '⏳';
            exportText += `${index + 1}. ${status} ${task.time} - ${task.name}\n`;
            exportText += `   Длительность: ${task.duration} мин | Категория: ${categoryNames[task.category]}\n\n`;
        });
        
        // Статистика
        const completedCount = tasks.filter(t => t.completed).length;
        const totalMinutes = tasks.reduce((sum, t) => sum + t.duration, 0);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        exportText += '\n' + '='.repeat(50) + '\n';
        exportText += `СТАТИСТИКА:\n`;
        exportText += `Всего задач: ${tasks.length}\n`;
        exportText += `Выполнено: ${completedCount}\n`;
        exportText += `Общее время: ${hours}ч ${minutes}м\n`;
        
        // Создание и скачивание файла
        const blob = new Blob([exportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `план_на_день_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('План успешно экспортирован в файл!');
    }
    
    function exportAllData() {
        const data = {
            tasks: tasks,
            timerSettings: timerSettings,
            exportDate: new Date().toISOString()
        };
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `day-planner-backup-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Все данные экспортированы в JSON файл!');
    }
    
    function importAllData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if (data.tasks && Array.isArray(data.tasks)) {
                    tasks = data.tasks;
                    if (data.timerSettings) {
                        timerSettings = data.timerSettings;
                        localStorage.setItem('pomodoroSettings', JSON.stringify(timerSettings));
                        timerSeconds = timerSettings.workTime * 60;
                        updateTimerDisplay();
                    }
                    saveTasks();
                    renderTasks();
                    updateStats();
                    alert('Данные успешно импортированы!');
                } else {
                    alert('Файл повреждён или имеет неверный формат');
                }
            } catch (error) {
                alert('Ошибка при импорте файла: ' + error.message);
            }
        };
        reader.readAsText(file);
    }
    
    // ==================== QR-КОД ====================
    
    function generateQRCode() {
        const currentUrl = window.location.href;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}`;
        
        const modal = document.createElement('div');
        modal.className = 'qr-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        `;
        
        modal.innerHTML = `
            <div class="qr-modal-content" style="
                background: white;
                padding: 30px;
                border-radius: 15px;
                text-align: center;
                max-width: 300px;
                width: 90%;
            ">
                <h3 style="margin-bottom: 20px; color: #2d3436;">Отсканируйте QR-код</h3>
                <img src="${qrCodeUrl}" alt="QR Code" style="width: 200px; height: 200px; margin-bottom: 20px;">
                <p style="color: #636e72; margin-bottom: 20px;">Откройте камеру на телефоне и наведите на код</p>
                <button class="close-qr" style="
                    background: #4b6cb7;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                ">Закрыть</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.close-qr').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }
});
