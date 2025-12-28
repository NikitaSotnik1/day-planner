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
    const currentDateElement = document.getElementById('currentDate');
    
    // Статистика
    const totalTasksElement = document.getElementById('totalTasks');
    const totalTimeElement = document.getElementById('totalTime');
    const completedTasksElement = document.getElementById('completedTasks');
    
    // Данные
    let tasks = JSON.parse(localStorage.getItem('dayPlannerTasks')) || [];
    let currentFilter = 'all';
    let timerInterval = null;
    let timerSeconds = 25 * 60;
    let isTimerRunning = false;
    let currentTimerMode = 'work';
    let currentFocusTaskId = null;
    let timerSettings = JSON.parse(localStorage.getItem('pomodoroSettings')) || {
    workTime: 25,
    breakTime: 5
};
    
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
        
        modeButtons.forEach(btn => {
    btn.addEventListener('click', function() {
        const mode = this.dataset.mode;
        
        if (mode === 'custom') {
            // Показываем настройки
            document.getElementById('customTimeSettings').style.display = 'block';
            document.getElementById('workTimeInput').value = timerSettings.workTime;
            document.getElementById('breakTimeInput').value = timerSettings.breakTime;
            
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
// Инициализируем таймер с сохранёнными настройками
timerSeconds = timerSettings.workTime * 60;
updateTimerDisplay();
        resetTimer();
        // Скрываем настройки если они открыты
        document.getElementById('customTimeSettings').style.display = 'none';
    });
});

// Обработчик сохранения настроек времени
document.getElementById('saveTimeSettings').addEventListener('click', function() {
    const workTime = parseInt(document.getElementById('workTimeInput').value);
    const breakTime = parseInt(document.getElementById('breakTimeInput').value);
    
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
    document.getElementById('customTimeSettings').style.display = 'none';
    
    alert('Настройки сохранены!');
});
        
        // Экспорт
        exportBtn.addEventListener('click', exportDay);
        
        // Drag and drop для таймлайна
        initDragAndDrop();

        // Слушаем изменение размера окна для пересчёта таймлайна
window.addEventListener('resize', function() {
    generateTimeLabels();
    updateTimelinePositions();
});
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
            'учёба': 'study',
            'учеба': 'study',
            'занятие': 'study',
            'личное': 'personal',
            'отдых': 'personal',
            'прогулка': 'personal'
        };
        
        for (const [keyword, category] of Object.entries(keywords)) {
            if (text.toLowerCase().includes(keyword)) {
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
    for (let hour = 0; hour < 24; hour++) {
        const label = document.createElement('div');
        label.className = 'time-label';
        label.textContent = `${hour.toString().padStart(2, '0')}:00`;
        timeLabels.appendChild(label);
    }
    
    // Определяем высоту часа в зависимости от экрана
    const isMobile = window.innerWidth <= 768;
    const hourHeight = isMobile ? 40 : 50; // 40px на мобильных, 50px на десктопе
    
    // Обновляем CSS переменную (если нужно)
    document.documentElement.style.setProperty('--hour-height', `${hourHeight}px`);
    
    // Устанавливаем высоту таймлайна
    timeline.style.minHeight = `${20 + (24 * hourHeight)}px`;
}
    
    
    // Устанавливаем высоту таймлайна на 24 часа
    const hourHeight = 50; // 50px на час
    timeline.style.minHeight = `${20 + (24 * hourHeight)}px`; // +20px для padding-top
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
        const hourHeight = 50; // 50px на час
    
        blocks.forEach(block => {
            const taskId = block.dataset.id;
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;
        
            const [hours, minutes] = task.time.split(':').map(Number);
            const top = 20 + (hours * 60 + minutes) / 60 * hourHeight; // +20px для учёта padding-top
            const height = task.duration / 60 * hourHeight;
        
            // Проверяем, чтобы задача не выходила за границы 24 часов
            const maxTop = 20 + (24 * hourHeight) - height; // +20px для padding-top
            const adjustedTop = Math.min(top, maxTop);
        
            block.style.top = `${adjustedTop}px`;
            block.style.height = `${height}px`;
        
            // Если задача была сдвинута, обновляем её время в данных
            if (top !== adjustedTop) {
                const newHours = Math.floor(adjustedTop / hourHeight);
                const newMinutes = Math.round((adjustedTop % hourHeight) / hourHeight * 60);
                const newTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
            
                const taskIndex = tasks.findIndex(t => t.id === taskId);
                if (taskIndex !== -1) {
                    tasks[taskIndex].time = newTime;
                    saveTasks();
                }
            }
        });
    }
    
    // 10. Drag and drop для таймлайна
    function initDragAndDrop() {
        let draggedTask = null;
        
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
            const hourHeight = 50;
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
    try {
        const now = new Date();
        console.log('Текущая дата:', now); // Для отладки
        
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        
        const dateString = now.toLocaleDateString('ru-RU', options);
        console.log('Форматированная дата:', dateString); // Для отладки
        
        if (currentDateElement) {
            currentDateElement.textContent = dateString;
        } else {
            console.error('Элемент currentDateElement не найден');
        }
    } catch (error) {
        console.error('Ошибка при обновлении даты:', error);
        // Резервный вариант
        const now = new Date();
        currentDateElement.textContent = now.toLocaleDateString();
    }
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
    
    // ==================== ФОКУС-РЕЖИМ ====================
    
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
    
    // ==================== ТАЙМЕР POMODORO ====================
    
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
    
    // 1. Звуковой сигнал
    playTimerSound();
    
    // 2. Браузерное уведомление (если разрешено)
    if (Notification.permission === 'granted') {
        new Notification('Таймер завершён!', {
            body: currentTimerMode === 'work' 
                ? 'Время работать закончилось. Сделайте перерыв!' 
                : 'Перерыв окончен. Возвращайтесь к работе!',
            icon: 'https://cdn-icons-png.flaticon.com/512/3208/3208720.png'
        });
    }
    
    // 3. Окно alert
    alert(currentTimerMode === 'work' 
        ? 'Время работы закончилось! Сделайте перерыв.' 
        : 'Перерыв окончен! Возвращайтесь к работе.');
    
    // 4. Автоматическое переключение режима (только визуальное)
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
    
    // 5. Сбрасываем состояние кнопок и ПЕРЕКЛЮЧАЕМ РЕЖИМ ДЛЯ СЛЕДУЮЩЕГО ЗАПУСКА
    startTimerBtn.disabled = false;
    pauseTimerBtn.disabled = true;
    
    // ВАЖНО: currentTimerMode должен обновиться только после того,
    // как пользователь нажмёт "Старт" для следующего интервала
    // Сохраняем следующий режим в отдельной переменной
    const nextTimerMode = nextMode;
    
    // Обновляем currentTimerMode только когда пользователь снова запустит таймер
    // Для этого изменим функцию startTimer так, чтобы она использовала актуальный режим
    // из активной кнопки, а не из переменной currentTimerMode
    
    // Обновляем currentTimerMode сразу
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
    
    // ==================== ЭКСПОРТ ====================
    
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
    
    // Запрос разрешения на уведомления
    if ('Notification' in window && Notification.permission === 'default') {
        setTimeout(() => {
            Notification.requestPermission();
        }, 2000);
    }
});
