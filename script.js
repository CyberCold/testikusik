// КОНФИГУРАЦИЯ - ИЗМЕНИТЕ ЭТИ ПАРАМЕТРЫ
const GITHUB_USERNAME = 'CyberCold';
const GITHUB_REPO = 'Paradise';
const USERS_FILE = 'users.json';
const USERS_FILE_PATH = ''; // Если файл в папке, укажите: 'data/' или 'config/'

// ФОРМИРУЕМ ПРАВИЛЬНЫЙ URL
const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/main/${USERS_FILE_PATH}${USERS_FILE}`;

// Альтернативные URL (если не работает)
const GITHUB_RAW_URL_MASTER = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/master/${USERS_FILE_PATH}${USERS_FILE}`;
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${USERS_FILE_PATH}${USERS_FILE}`;

console.log('Попытка загрузки из:', GITHUB_RAW_URL);

// Глобальные переменные
let usersData = [];
let filteredUsers = [];
let currentView = 'table';
let isMobileMenuOpen = false;

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadUsersWithFallback();
    setupEventListeners();
});

// Загрузка с fallback на разные URL
async function loadUsersWithFallback() {
    showLoading('Проверка доступа к GitHub...');
    
    try {
        // Сначала пробуем main
        console.log('Пробуем загрузить из:', GITHUB_RAW_URL);
        let data = await tryLoadFromUrl(GITHUB_RAW_URL);
        
        if (!data) {
            console.log('Не удалось, пробуем master...');
            data = await tryLoadFromUrl(GITHUB_RAW_URL_MASTER);
        }
        
        if (!data) {
            console.log('Пробуем через GitHub API...');
            data = await tryLoadFromApi();
        }
        
        if (data) {
            processUsersData(data);
        } else {
            throw new Error('Не удалось загрузить данные ни с одного из URL');
        }
        
    } catch (error) {
        console.error('Все попытки загрузки не удались:', error);
        showError(`
            <strong>❌ Ошибка загрузки данных</strong><br><br>
            <strong>Проверьте следующие моменты:</strong><br>
            1. Репозиторий существует: <code>${GITHUB_USERNAME}/${GITHUB_REPO}</code><br>
            2. Файл существует: <code>${USERS_FILE}</code><br>
            3. Репозиторий публичный (или добавлен токен)<br>
            4. Правильный путь к файлу<br><br>
            <strong>Текущий URL:</strong><br>
            <code>${GITHUB_RAW_URL}</code><br><br>
            <button onclick="openTestUrl()" class="details-btn">🔗 Проверить URL в новой вкладке</button>
            <button onclick="location.reload()" class="details-btn" style="margin-left: 10px;">🔄 Попробовать снова</button>
        `);
    }
}

// Попытка загрузить из URL
async function tryLoadFromUrl(url) {
    try {
        console.log('Загрузка:', url);
        const response = await fetch(url, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (!response.ok) {
            console.log(`HTTP ${response.status}: ${response.statusText}`);
            return null;
        }
        
        const data = await response.json();
        console.log('Успешно загружено! Количество пользователей:', Object.keys(data).length);
        return data;
        
    } catch (error) {
        console.log(`Ошибка при загрузке ${url}:`, error.message);
        return null;
    }
}

// Попытка загрузить через GitHub API
async function tryLoadFromApi() {
    try {
        const response = await fetch(GITHUB_API_URL, {
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) return null;
        
        const fileInfo = await response.json();
        const content = atob(fileInfo.content); // Декодируем base64
        const data = JSON.parse(content);
        console.log('Загружено через API! Пользователей:', Object.keys(data).length);
        return data;
        
    } catch (error) {
        console.log('API загрузка не удалась:', error);
        return null;
    }
}

// Обработка данных пользователей
function processUsersData(data) {
    // Проверяем структуру данных
    if (Array.isArray(data)) {
        usersData = data;
    } else if (typeof data === 'object' && data !== null) {
        // Если объект с ключами-айдишниками
        usersData = Object.values(data);
    } else {
        throw new Error('Неверный формат данных');
    }
    
    filteredUsers = [...usersData];
    updateStats();
    populateCountryFilter();
    renderUsers();
    updateLastUpdateTime();
    showNotification(`✅ Загружено ${usersData.length} пользователей`, 'success');
}

// Обновление статистики
function updateStats() {
    const totalUsers = usersData.length;
    const totalVisits = usersData.reduce((sum, user) => sum + (user.visit_count || 0), 0);
    const uniqueCountries = new Set();
    const today = new Date().toISOString().split('T')[0];
    let activeToday = 0;
    
    usersData.forEach(user => {
        if (user.last_seen) {
            const lastSeenDate = new Date(user.last_seen).toISOString().split('T')[0];
            if (lastSeenDate === today) activeToday++;
        }
        
        // Собираем страны из визитов или IP
        if (user.visits && user.visits.length > 0) {
            user.visits.forEach(visit => {
                if (visit.country) uniqueCountries.add(visit.country);
            });
        }
        if (user.ips && user.ips.length > 0) {
            user.ips.forEach(ip => {
                if (ip.country) uniqueCountries.add(ip.country);
            });
        }
    });
    
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('totalVisits').textContent = totalVisits;
    document.getElementById('totalCountries').textContent = uniqueCountries.size;
    document.getElementById('activeToday').textContent = activeToday;
    document.getElementById('statsText').innerHTML = `📊 Всего ${totalUsers} пользователей, ${totalVisits} визитов, ${uniqueCountries.size} стран`;
}

// Заполнение фильтра стран
function populateCountryFilter() {
    const countries = new Set();
    usersData.forEach(user => {
        if (user.visits && user.visits.length > 0) {
            user.visits.forEach(visit => {
                if (visit.country) countries.add(visit.country);
            });
        }
        if (user.ips && user.ips.length > 0) {
            user.ips.forEach(ip => {
                if (ip.country) countries.add(ip.country);
            });
        }
    });
    
    const countryFilter = document.getElementById('countryFilter');
    countryFilter.innerHTML = '<option value="">Все страны</option>';
    Array.from(countries).sort().forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countryFilter.appendChild(option);
    });
}

// Фильтрация пользователей
function filterUsers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const country = document.getElementById('countryFilter').value;
    const device = document.getElementById('deviceFilter').value;
    
    filteredUsers = usersData.filter(user => {
        const matchesSearch = !searchTerm || 
            user.first_name?.toLowerCase().includes(searchTerm) ||
            user.username?.toLowerCase().includes(searchTerm) ||
            user.id?.toString().includes(searchTerm);
        
        let matchesCountry = !country;
        if (!matchesCountry && user.visits) {
            matchesCountry = user.visits.some(v => v.country === country);
        }
        if (!matchesCountry && user.ips) {
            matchesCountry = user.ips.some(ip => ip.country === country);
        }
        
        let matchesDevice = !device;
        if (!matchesDevice && user.visits) {
            matchesDevice = user.visits.some(v => v.device === device);
        }
        
        return matchesSearch && matchesCountry && matchesDevice;
    });
    
    renderUsers();
}

// Рендер пользователей
function renderUsers() {
    if (currentView === 'table') {
        renderTableView();
    } else {
        renderCardsView();
    }
}

function renderTableView() {
    const tbody = document.getElementById('usersTableBody');
    if (filteredUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">👤 Пользователи не найдены</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredUsers.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="user-avatar">${getInitials(user.first_name)}</div>
                    <strong>${escapeHtml(user.first_name || 'N/A')}</strong>
                </div>
            </td>
            <td>${escapeHtml(user.username || '—')}</td>
            <td>${user.visit_count || 0}</td>
            <td>${formatDate(user.last_seen)}</td>
            <td>${getUserCountry(user)}</td>
            <td>${getUserDevice(user)}</td>
            <td>
                <button class="details-btn" onclick="showUserDetails(${user.id})">
                    📋 Детали
                </button>
            </td>
        </tr>
    `).join('');
}

function renderCardsView() {
    const cardsView = document.getElementById('cardsView');
    if (filteredUsers.length === 0) {
        cardsView.innerHTML = '<div class="loading-state">👤 Пользователи не найдены</div>';
        return;
    }
    
    cardsView.innerHTML = filteredUsers.map(user => `
        <div class="user-card">
            <div class="card-header">
                <div class="user-avatar">${getInitials(user.first_name)}</div>
                <div style="flex: 1;">
                    <h3>${escapeHtml(user.first_name || 'Без имени')}</h3>
                    <p style="color: #718096; font-size: 0.85rem;">@${escapeHtml(user.username || 'no_username')}</p>
                </div>
                <div class="card-badge">ID: ${user.id}</div>
            </div>
            <div class="card-info">
                <div class="info-row"><span>📊 Визитов:</span><strong>${user.visit_count || 0}</strong></div>
                <div class="info-row"><span>🕐 Последний визит:</span><span>${formatDate(user.last_seen)}</span></div>
                <div class="info-row"><span>🌍 Страна:</span><span>${getUserCountry(user)}</span></div>
                <div class="info-row"><span>💻 Устройство:</span><span>${getUserDevice(user)}</span></div>
                <div class="info-row"><span>📅 Регистрация:</span><span>${formatDate(user.registered)}</span></div>
            </div>
            <button class="details-btn" style="width: 100%; margin-top: 15px;" onclick="showUserDetails(${user.id})">
                🔍 Подробнее
            </button>
        </div>
    `).join('');
}

// Показать детали пользователя
window.showUserDetails = function(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;
    
    const modal = document.getElementById('userModal');
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h3>${escapeHtml(user.first_name || 'Пользователь')}</h3>
            <p>@${escapeHtml(user.username || 'нет username')}</p>
            <p><strong>🆔 ID:</strong> ${user.id}</p>
            <p><strong>📌 Источник:</strong> ${user.source || 'неизвестно'}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4>📅 Даты</h4>
            <p><strong>Регистрация:</strong> ${new Date(user.registered).toLocaleString()}</p>
            <p><strong>Последний визит:</strong> ${new Date(user.last_seen).toLocaleString()}</p>
            <p><strong>Всего визитов:</strong> ${user.visit_count || 0}</p>
        </div>
        
        ${user.ips && user.ips.length > 0 ? `
            <div style="margin-bottom: 20px;">
                <h4>🌍 IP адреса и геолокация</h4>
                ${user.ips.map(ip => `
                    <div style="background: #f7fafc; padding: 12px; margin: 10px 0; border-radius: 8px;">
                        <p><strong>📡 IP:</strong> ${ip.ip}</p>
                        <p><strong>📍 Страна:</strong> ${ip.country || '—'} ${ip.city ? `(${ip.city})` : ''}</p>
                        <p><strong>🏢 ISP:</strong> ${ip.isp || '—'}</p>
                        <p><strong>🗺️ Координаты:</strong> ${ip.lat || '—'}, ${ip.lon || '—'}</p>
                        <p><strong>📊 Визитов с этого IP:</strong> ${ip.visits}</p>
                    </div>
                `).join('')}
            </div>
        ` : '<p>❌ Нет данных об IP</p>'}
        
        ${user.visits && user.visits.length > 0 ? `
            <div>
                <h4>📱 Детали последнего визита</h4>
                <div style="background: #f7fafc; padding: 12px; border-radius: 8px;">
                    <p><strong>💻 Устройство:</strong> ${user.visits[0].device || '—'}</p>
                    <p><strong>🌐 Браузер:</strong> ${user.visits[0].browser || '—'} ${user.visits[0].browser_version || ''}</p>
                    <p><strong>⚙️ ОС:</strong> ${user.visits[0].os || '—'} ${user.visits[0].os_version || ''}</p>
                    <p><strong>🔤 Язык:</strong> ${user.visits[0].language || '—'}</p>
                    <p><strong>🔗 Referrer:</strong> ${user.visits[0].referrer || '—'}</p>
                    <p><strong>📝 User Agent:</strong> <span style="font-size: 0.75rem; word-break: break-all;">${escapeHtml(user.visits[0].user_agent || '—')}</span></p>
                </div>
            </div>
        ` : ''}
    `;
    
    modal.classList.add('active');
};

// Вспомогательные функции
function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Сегодня';
    if (days === 1) return 'Вчера';
    if (days < 7) return `${days} дн. назад`;
    return date.toLocaleDateString('ru-RU');
}

function getUserCountry(user) {
    if (user.visits?.[0]?.country) return user.visits[0].country;
    if (user.ips?.[0]?.country) return user.ips[0].country;
    return '—';
}

function getUserDevice(user) {
    return user.visits?.[0]?.device || '—';
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function updateLastUpdateTime() {
    const now = new Date();
    document.getElementById('lastUpdate').innerHTML = `
        <i class="fas fa-sync-alt"></i>
        <span>Обновлено: ${now.toLocaleTimeString()}</span>
    `;
}

function showLoading(message = 'Загрузка данных с GitHub...') {
    document.getElementById('usersTableBody').innerHTML = `<tr><td colspan="8" class="loading-cell">⏳ ${message}</td></tr>`;
    document.getElementById('cardsView').innerHTML = `<div class="loading-state">⏳ ${message}</div>`;
}

function showError(message) {
    document.getElementById('usersTableBody').innerHTML = `<tr><td colspan="8" class="loading-cell" style="color: #e53e3e;">${message}</td></tr>`;
    document.getElementById('cardsView').innerHTML = `<div class="loading-state" style="color: #e53e3e;">${message}</div>`;
}

function showNotification(message, type = 'info') {
    // Простое уведомление в консоль и временное сообщение в заголовке
    console.log(`[${type.toUpperCase()}] ${message}`);
    const statsText = document.getElementById('statsText');
    const originalText = statsText.innerHTML;
    statsText.innerHTML = `🔔 ${message}`;
    setTimeout(() => {
        if (statsText.innerHTML.includes(message)) {
            statsText.innerHTML = originalText;
        }
    }, 3000);
}

window.openTestUrl = function() {
    window.open(GITHUB_RAW_URL, '_blank');
};

function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', filterUsers);
    document.getElementById('countryFilter').addEventListener('change', filterUsers);
    document.getElementById('deviceFilter').addEventListener('change', filterUsers);
    document.getElementById('refreshBtn').addEventListener('click', () => loadUsersWithFallback());
    
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            document.getElementById('tableView').classList.toggle('active', currentView === 'table');
            document.getElementById('cardsView').classList.toggle('active', currentView === 'cards');
            renderUsers();
        });
    });
    
    const modal = document.getElementById('userModal');
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.onclick = () => modal.classList.remove('active');
    window.onclick = (e) => {
        if (e.target === modal) modal.classList.remove('active');
    };
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const mobileOverlay = document.getElementById('mobileOverlay');
    
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
            mobileOverlay.style.display = 'block';
            isMobileMenuOpen = true;
        });
    }
    
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            mobileOverlay.style.display = 'none';
            isMobileMenuOpen = false;
        });
    }
    
    // Закрывать меню при клике на навигацию (на мобильных)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('mobile-open');
                mobileOverlay.style.display = 'none';
                isMobileMenuOpen = false;
            }
        });
    });
    
    // Темная тема
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeButton(savedTheme);
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeButton(newTheme);
    });
    
    // Обработка свайпов для меню
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });
    
    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchEndX - touchStartX > 50 && touchStartX < 50) {
            // Свайп вправо - открыть меню
            if (!sidebar.classList.contains('mobile-open')) {
                sidebar.classList.add('mobile-open');
                mobileOverlay.style.display = 'block';
            }
        }
        if (touchStartX - touchEndX > 50 && sidebar.classList.contains('mobile-open')) {
            // Свайп влево - закрыть меню
            sidebar.classList.remove('mobile-open');
            mobileOverlay.style.display = 'none';
        }
    });
}

function updateThemeButton(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (theme === 'dark') {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i><span>Светлая тема</span>';
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i><span>Темная тема</span>';
    }
}
// Стили для активных вью
const style = document.createElement('style');
style.textContent = `
    .table-view { display: none; }
    .cards-view { display: none; }
    .table-view.active { display: block; }
    .cards-view.active { display: grid; }
    .loading-cell { text-align: center; padding: 40px; color: #a0aec0; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
`;
document.head.appendChild(style);
