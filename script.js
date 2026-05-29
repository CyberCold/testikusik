// Конфигурация
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/CyberCold/Paradise/main/users.json';

// Глобальные переменные
let usersData = [];
let filteredUsers = [];
let currentView = 'table';

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    setupEventListeners();
});

// Загрузка пользователей с GitHub
async function loadUsers() {
    showLoading();
    try {
        const response = await fetch(GITHUB_RAW_URL, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        usersData = Object.values(data);
        filteredUsers = [...usersData];
        
        updateStats();
        populateCountryFilter();
        renderUsers();
        updateLastUpdateTime();
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showError('Не удалось загрузить данные пользователей. Проверьте URL и доступ к GitHub.');
    }
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
        if (user.visits && user.visits.length > 0) {
            user.visits.forEach(visit => {
                if (visit.country) uniqueCountries.add(visit.country);
            });
        } else if (user.ips && user.ips.length > 0) {
            user.ips.forEach(ip => {
                if (ip.country) uniqueCountries.add(ip.country);
            });
        }
    });
    
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('totalVisits').textContent = totalVisits;
    document.getElementById('totalCountries').textContent = uniqueCountries.size;
    document.getElementById('activeToday').textContent = activeToday;
    document.getElementById('statsText').textContent = `Всего ${totalUsers} пользователей, ${totalVisits} визитов`;
}

// Заполнение фильтра стран
function populateCountryFilter() {
    const countries = new Set();
    usersData.forEach(user => {
        if (user.visits && user.visits.length > 0) {
            user.visits.forEach(visit => {
                if (visit.country) countries.add(visit.country);
            });
        } else if (user.ips && user.ips.length > 0) {
            user.ips.forEach(ip => {
                if (ip.country) countries.add(ip.country);
            });
        }
    });
    
    const countryFilter = document.getElementById('countryFilter');
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
        // Поиск
        const matchesSearch = !searchTerm || 
            user.first_name?.toLowerCase().includes(searchTerm) ||
            user.username?.toLowerCase().includes(searchTerm) ||
            user.id.toString().includes(searchTerm);
        
        // Фильтр по стране
        let matchesCountry = !country;
        if (!matchesCountry) {
            if (user.visits && user.visits.length > 0) {
                matchesCountry = user.visits.some(v => v.country === country);
            } else if (user.ips && user.ips.length > 0) {
                matchesCountry = user.ips.some(ip => ip.country === country);
            }
        }
        
        // Фильтр по устройству
        let matchesDevice = !device;
        if (!matchesDevice && user.visits && user.visits.length > 0) {
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

// Рендер таблицы
function renderTableView() {
    const tbody = document.getElementById('usersTableBody');
    if (filteredUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">Пользователи не найдены</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredUsers.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="user-avatar">${getInitials(user.first_name)}</div>
                    <strong>${user.first_name || 'N/A'}</strong>
                </div>
            </td>
            <td>${user.username || '—'}</td>
            <td>${user.visit_count || 0}</td>
            <td>${formatDate(user.last_seen)}</td>
            <td>${getUserCountry(user)}</td>
            <td>${getUserDevice(user)}</td>
            <td>
                <button class="details-btn" onclick="showUserDetails(${user.id})">
                    <i class="fas fa-info-circle"></i> Детали
                </button>
            </td>
        </tr>
    `).join('');
}

// Рендер карточек
function renderCardsView() {
    const cardsView = document.getElementById('cardsView');
    if (filteredUsers.length === 0) {
        cardsView.innerHTML = '<div class="loading-state">Пользователи не найдены</div>';
        return;
    }
    
    cardsView.innerHTML = filteredUsers.map(user => `
        <div class="user-card">
            <div class="card-header">
                <div class="user-avatar">${getInitials(user.first_name)}</div>
                <div>
                    <h3>${user.first_name || 'Без имени'}</h3>
                    <p style="color: #718096; font-size: 0.85rem;">@${user.username || 'no_username'}</p>
                </div>
                <div class="card-badge">ID: ${user.id}</div>
            </div>
            <div class="card-info">
                <div class="info-row">
                    <span>📊 Визитов:</span>
                    <strong>${user.visit_count || 0}</strong>
                </div>
                <div class="info-row">
                    <span>🕐 Последний визит:</span>
                    <span>${formatDate(user.last_seen)}</span>
                </div>
                <div class="info-row">
                    <span>🌍 Страна:</span>
                    <span>${getUserCountry(user)}</span>
                </div>
                <div class="info-row">
                    <span>💻 Устройство:</span>
                    <span>${getUserDevice(user)}</span>
                </div>
                <div class="info-row">
                    <span>📅 Регистрация:</span>
                    <span>${formatDate(user.registered)}</span>
                </div>
            </div>
            <button class="details-btn" style="width: 100%; margin-top: 15px;" onclick="showUserDetails(${user.id})">
                <i class="fas fa-info-circle"></i> Подробнее
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
            <h3>${user.first_name || 'Пользователь'}</h3>
            <p>@${user.username || 'нет username'}</p>
            <p><strong>ID:</strong> ${user.id}</p>
            <p><strong>Источник:</strong> ${user.source || 'неизвестно'}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4>📅 Даты</h4>
            <p><strong>Регистрация:</strong> ${new Date(user.registered).toLocaleString()}</p>
            <p><strong>Последний визит:</strong> ${new Date(user.last_seen).toLocaleString()}</p>
            <p><strong>Всего визитов:</strong> ${user.visit_count || 0}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4>🌍 Геолокация</h4>
            ${user.ips && user.ips.length > 0 ? user.ips.map(ip => `
                <div style="background: #f7fafc; padding: 10px; margin: 10px 0; border-radius: 8px;">
                    <p><strong>IP:</strong> ${ip.ip}</p>
                    <p><strong>Страна:</strong> ${ip.country || '—'} (${ip.city || '—'})</p>
                    <p><strong>ISP:</strong> ${ip.isp || '—'}</p>
                    <p><strong>Координаты:</strong> ${ip.lat}, ${ip.lon}</p>
                    <p><strong>Визитов с этого IP:</strong> ${ip.visits}</p>
                </div>
            `).join('') : '<p>Нет данных об IP</p>'}
        </div>
        
        ${user.visits && user.visits.length > 0 ? `
            <div>
                <h4>📱 Последний визит (детали)</h4>
                <div style="background: #f7fafc; padding: 10px; border-radius: 8px;">
                    <p><strong>Устройство:</strong> ${user.visits[0].device || '—'}</p>
                    <p><strong>Браузер:</strong> ${user.visits[0].browser || '—'} ${user.visits[0].browser_version || ''}</p>
                    <p><strong>ОС:</strong> ${user.visits[0].os || '—'} ${user.visits[0].os_version || ''}</p>
                    <p><strong>Язык:</strong> ${user.visits[0].language || '—'}</p>
                    <p><strong>Referrer:</strong> ${user.visits[0].referrer || '—'}</p>
                    <p><strong>User Agent:</strong> <span style="font-size: 0.8rem;">${user.visits[0].user_agent || '—'}</span></p>
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
    if (user.visits && user.visits.length > 0 && user.visits[0].country) {
        return user.visits[0].country;
    }
    if (user.ips && user.ips.length > 0 && user.ips[0].country) {
        return user.ips[0].country;
    }
    return '—';
}

function getUserDevice(user) {
    if (user.visits && user.visits.length > 0 && user.visits[0].device) {
        return user.visits[0].device;
    }
    return '—';
}

function updateLastUpdateTime() {
    const now = new Date();
    document.getElementById('lastUpdate').innerHTML = `
        <i class="fas fa-sync-alt"></i>
        <span>Обновлено: ${now.toLocaleTimeString()}</span>
    `;
}

function showLoading() {
    document.getElementById('usersTableBody').innerHTML = '<tr><td colspan="8" class="loading-cell">Загрузка данных с GitHub...</td></tr>';
    document.getElementById('cardsView').innerHTML = '<div class="loading-state">Загрузка данных...</div>';
}

function showError(message) {
    document.getElementById('usersTableBody').innerHTML = `<tr><td colspan="8" class="loading-cell" style="color: red;">${message}</td></tr>`;
}

function setupEventListeners() {
    // Поиск и фильтры
    document.getElementById('searchInput').addEventListener('input', filterUsers);
    document.getElementById('countryFilter').addEventListener('change', filterUsers);
    document.getElementById('deviceFilter').addEventListener('change', filterUsers);
    
    // Обновление
    document.getElementById('refreshBtn').addEventListener('click', () => loadUsers());
    
    // Переключение вида
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
    
    // Модальное окно
    const modal = document.getElementById('userModal');
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.onclick = () => modal.classList.remove('active');
    window.onclick = (e) => {
        if (e.target === modal) modal.classList.remove('active');
    };
}

// Добавляем стили для active view
const style = document.createElement('style');
style.textContent = `
    .table-view { display: none; }
    .cards-view { display: none; }
    .table-view.active { display: block; }
    .cards-view.active { display: grid; }
    .loading-cell { text-align: center; padding: 40px; color: #a0aec0; }
`;
document.head.appendChild(style);
