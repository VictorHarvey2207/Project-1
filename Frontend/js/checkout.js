// Checkout Widget Module
import { formatPrice, formatDate } from './utils.js';

const API_BASE = 'http://localhost:3001/api';
let allReservations = [];
let filteredReservations = [];
let selectedReservation = null;
let roomsMap = new Map();

// Helpers
function clearSelectionUI() {
    selectedReservation = null;
    if (selectedRoomSection) selectedRoomSection.classList.add('hidden');
    if (totalSection) totalSection.classList.add('hidden');
    if (divider) divider.classList.add('hidden');
    if (checkoutBtn) checkoutBtn.disabled = true;
}

// DOM Elements (bound on init to avoid null when script loads early)
let searchInput;
let clearSearch;
let refreshBtn;
let tableBody;
let selectedRoomSection;
let selectedRoomText;
let totalPrice;
let totalSection;
let checkoutBtn;
let alertMessage;
let recordCount;
let executionTime;
let timeText;
let divider;

// Initialize
async function init() {
    // Bind DOM after document is ready
    searchInput = document.getElementById('searchInput');
    clearSearch = document.getElementById('clearSearch');
    refreshBtn = document.getElementById('refreshBtn');
    tableBody = document.getElementById('tableBody');
    selectedRoomSection = document.getElementById('selectedRoomSection');
    selectedRoomText = document.getElementById('selectedRoomText');
    totalPrice = document.getElementById('totalPrice');
    totalSection = document.getElementById('totalSection');
    checkoutBtn = document.getElementById('checkoutBtn');
    alertMessage = document.getElementById('alertMessage');
    recordCount = document.getElementById('recordCount');
    executionTime = document.getElementById('executionTime');
    timeText = document.getElementById('timeText');
    divider = document.getElementById('divider');

    await preloadRooms();
    await loadReservations();
    setupEventListeners();
}

async function preloadRooms() {
    try {
        const res = await fetch(`${API_BASE}/rooms`);
        const rooms = await res.json();
        roomsMap.clear();
        rooms.forEach(r => roomsMap.set(r.roomId, r));
    } catch (e) {
        console.warn('Could not preload rooms:', e);
    }
}

// Load reservations with checkedIn status
async function loadReservations(showMessage = false) {
    const start = performance.now();
    try {
        const response = await fetch(`${API_BASE}/reservations`);
        const data = await response.json();
        
        // Filter only checkedIn reservations
        allReservations = data.filter(r => r.status === 'checkedIn');
        filteredReservations = [...allReservations];
        
        // Clear selection after new data loaded to avoid race
        clearSelectionUI();
        renderTable();
        
        if (showMessage) {
            showAlert(`Đã làm mới dữ liệu`, 'info');
        }
        updateExecutionTime(start);
    } catch (error) {
        console.error('Error loading reservations:', error);
        filteredReservations = [];
        clearSelectionUI();
        renderTable();
        showAlert('Lỗi: Không thể tải dữ liệu', 'error');
    }
}

// Render table
function renderTable() {
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    if (filteredReservations.length === 0) {
        tableBody.innerHTML = `
            <tr class="table-row">
                <td colspan="6" class="text-center py-8 text-slate-400">Không có phòng nào để trả</td>
            </tr>
        `;
        if (recordCount) recordCount.textContent = 'Hiển thị 0 phòng';
        return;
    }

    filteredReservations.forEach(res => {
        const tr = document.createElement('tr');
        tr.className = 'table-row hover:bg-blue-50 transition-colors cursor-pointer';
        if (selectedReservation?.reservationId === res.reservationId) {
            tr.classList.add('selected');
        }

        const checkinDate = new Date(res.checkInYear, res.checkInMonth - 1, res.checkInDay);
        const checkoutDate = new Date(res.checkOutYear, res.checkOutMonth - 1, res.checkOutDay);
        const roomInfo = roomsMap.get(res.roomId);
        const roomType = roomInfo?.roomType ?? '--';

        tr.innerHTML = `
            <td class="px-6 py-4 text-sm font-medium !text-[#0d141b] dark:!text-white">${res.reservationId}</td>
            <td class="text-[#4c739a]">${res.roomId}</td>
            <td class="!text-primary font-medium">${res.fullName ?? '--'}</td>
            <td class="text-[#4c739a]">${res.customerId}</td>
            <td class="text-[#4c739a]">${roomType}</td>
            <td class="text-[#4c739a]">${formatDate(checkinDate)}</td>
            <td class="text-[#4c739a]">${formatDate(checkoutDate)}</td>
        `;

        tr.addEventListener('click', () => selectReservation(res));
        tableBody.appendChild(tr);
    });

    if (recordCount) recordCount.textContent = `Hiển thị ${filteredReservations.length} phòng`;
}

// Select reservation
function selectReservation(res) {
    const start = performance.now();
    selectedReservation = res;
    renderTable();
    
    // Update selected room info
    if (selectedRoomSection) selectedRoomSection.classList.remove('hidden');
    if (totalSection) totalSection.classList.remove('hidden');
    if (divider) divider.classList.remove('hidden');
    if (checkoutBtn) checkoutBtn.disabled = false;
    
    if (selectedRoomText) selectedRoomText.textContent = `${res.roomId} - ${res.fullName ?? '--'}`;
    
    // Calculate total price for preview (actual calculation done by backend)
    calculateTotal(res);
    
    showAlert(`Đã chọn phòng ${res.roomId}`, 'success');
    updateExecutionTime(start);
}

// Calculate total for preview only (backend will recalculate on checkout)
async function calculateTotal(res) {
    try {
        const roomRes = await fetch(`${API_BASE}/rooms/${res.roomId}`);
        const room = await roomRes.json();
        
        const checkinDate = new Date(res.checkInYear, res.checkInMonth - 1, res.checkInDay);
        const checkoutDate = new Date(res.checkOutYear, res.checkOutMonth - 1, res.checkOutDay);
        const days = Math.max(1, Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24)));
        
        const roomCharge = room.pricePerDay * days;
        let serviceCharge = 0;
        if (room.services && room.services.length > 0) {
            serviceCharge = room.services.reduce((sum, s) => sum + (s.price * s.quantity), 0);
        }
        
        const total = roomCharge + serviceCharge;
        
        // Display preview only - do NOT store in selectedReservation
        // Backend will calculate the actual amounts when processing checkout
        if (totalPrice) totalPrice.textContent = formatPrice(total);
    } catch (error) {
        console.error('Error calculating total:', error);
        if (totalPrice) totalPrice.textContent = '--';
    }
}

// Search functionality
function filterReservations(query, showMessage = true) {
    if (!query.trim()) {
        filteredReservations = [...allReservations];
    } else {
        const q = query.toLowerCase();
        filteredReservations = allReservations.filter(res => {
            const name = String(res.fullName || '').toLowerCase();
            const rid = String(res.reservationId || '').toLowerCase();
            const room = String(res.roomId || '').toLowerCase();
            const cid = String(res.customerId || '').toLowerCase();
            return (
                rid.includes(q) ||
                room.includes(q) ||
                cid.includes(q) ||
                name.includes(q)
            );
        });
    }
    renderTable();
    if (showMessage) {
        showAlert(`Tìm thấy ${filteredReservations.length} phòng khớp với kết quả`, 'info');
    }
}

// Show alert
function showAlert(message, type = 'info') {
    if (!alertMessage) return;
    alertMessage.textContent = message;
    alertMessage.classList.remove('hidden');
    setTimeout(() => alertMessage.classList.add('hidden'), 3000);
}

// Update execution time
function updateExecutionTime(startTime) {
    if (executionTime && startTime !== undefined) {
        const elapsed = (performance.now() - startTime).toFixed(1);
        executionTime.textContent = elapsed;
    }
    if (timeText) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        timeText.textContent = `${hours}:${minutes}:${seconds}`;
    }
}

// Checkout
async function handleCheckout() {
    if (!selectedReservation) return;
    
    try {
        // Load and show dialog
        const checkoutDialog = await import('./checkout-dialog.js?v=20260110');
        checkoutDialog.openDialog(selectedReservation);
    } catch (error) {
        console.error('Error:', error);
        showAlert('Lỗi: Không thể mở dialog trả phòng', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterReservations(e.target.value));
    }
    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            filterReservations('', false);
        });
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await loadReservations(true);
        });
    }
    
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', handleCheckout);
    }
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
