import { HotelService } from './api.js?v=20260113';

const roomListEl = document.getElementById('roomList');
const serviceBodyEl = document.getElementById('serviceBody');
const serviceEmptyEl = document.getElementById('serviceEmpty');
const totalAmountEl = document.getElementById('totalAmount');
const roomTitleEl = document.getElementById('roomTitle');
const dataStatusEl = document.getElementById('dataStatus');
const executionEl = document.getElementById('executionTime');
const searchInputEl = document.getElementById('searchInput');
const clearSearchEl = document.getElementById('clearSearch');
const refreshBtn = document.getElementById('refreshBtn');
const addBtn = document.getElementById('addServiceBtn');
const deleteBtn = document.getElementById('deleteServiceBtn');
const alertBanner = document.getElementById('alertBanner');
const alertTitle = document.getElementById('alertTitle');
const alertMessage = document.getElementById('alertMessage');
const alertClose = document.getElementById('alertClose');

let rooms = [];
let filteredRooms = [];
let selectedRoomId = null;
let selectedServiceIndexes = new Set();

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')} VNĐ`;
}

function setExecution(ms) {
  if (executionEl) executionEl.textContent = (ms || 0).toFixed(1);
}

let alertTimeout = null;

function showAlert(type, title, message) {
  if (!alertBanner) return;
  
  // Clear any existing timeout
  if (alertTimeout) {
    clearTimeout(alertTimeout);
    alertTimeout = null;
  }
  
  alertBanner.classList.remove('hidden');
  const isError = type === 'error';
  alertBanner.className = `relative flex items-center justify-center px-4 py-3 rounded-xl border text-sm shadow-sm shrink-0 ${isError ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`;
  if (alertTitle) alertTitle.textContent = title || (isError ? 'Lỗi:' : 'Thành công:');
  if (alertMessage) alertMessage.textContent = message || '';
  
  // Auto-hide after 3 seconds
  alertTimeout = setTimeout(() => {
    hideAlert();
  }, 3000);
}

function hideAlert() {
  if (!alertBanner) return;
  alertBanner.classList.add('hidden');
}

if (alertClose) {
  alertClose.addEventListener('click', hideAlert);
}

function renderRooms(list) {
  if (!roomListEl) return;
  roomListEl.innerHTML = '';
  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'p-4 text-sm text-gray-400 text-center bg-white rounded-lg border border-dashed border-gray-200';
    empty.textContent = 'Không có phòng có dịch vụ';
    roomListEl.appendChild(empty);
    return;
  }

  list.forEach(room => {
    const btn = document.createElement('button');
    const active = room.roomId === selectedRoomId;
    const reservationStatus = room.reservationStatus || '';
    const statusLabel = reservationStatus === 'pending'
      ? 'Đang chờ nhận phòng'
      : reservationStatus === 'checkedIn'
        ? 'Đang thuê'
        : 'Chưa có đặt phòng';
    const serviceCount = Number(room.serviceCount);
    const serviceCountLabel = Number.isFinite(serviceCount) ? `${serviceCount} dịch vụ` : '';
    btn.className = `w-full text-left px-4 py-3 rounded-xl border transition-all shadow-sm bg-white hover:shadow ${active ? 'border-primary ring-1 ring-primary/30' : 'border-gray-200 hover:border-primary/60'}`;
    btn.dataset.roomId = room.roomId;
    btn.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-primary font-bold">${room.roomId || ''}</div>
          <div>
            <div class="text-sm font-bold text-gray-800">Phòng ${room.roomId || ''}</div>
            <div class="text-xs text-gray-500">${room.roomType || ''}${serviceCountLabel ? ` • ${serviceCountLabel}` : ''}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs font-semibold text-emerald-600">${statusLabel}</div>
          <div class="text-[11px] text-gray-400">${room.customerName || room.customerId || ''}</div>
        </div>
      </div>
    `;
    btn.addEventListener('click', () => selectRoom(room.roomId));
    roomListEl.appendChild(btn);
  });
}

function renderServices(data) {
  if (!serviceBodyEl) return;
  selectedServiceIndexes.clear();
  serviceBodyEl.innerHTML = '';
  const items = (data && data.items) || [];
  if (!items.length) {
    if (serviceEmptyEl) serviceEmptyEl.classList.remove('hidden');
    totalAmountEl.textContent = formatCurrency(0);
    if (dataStatusEl) dataStatusEl.textContent = '';
    return;
  }
  if (serviceEmptyEl) serviceEmptyEl.classList.add('hidden');

  items.forEach(item => {
    const idx = item.index;
    const row = document.createElement('div');
    row.className = 'grid grid-cols-12 border-b border-gray-50 hover:bg-blue-50/30 transition-colors items-center py-3 text-sm';
    row.dataset.index = idx;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer';
    checkbox.addEventListener('change', () => toggleService(idx, checkbox.checked, row));

    row.innerHTML = `
      <div class="col-span-5 px-6 flex items-center gap-3 font-medium text-gray-900">
        <span class="placeholder"></span>
        <span>${item.serviceName || ''}</span>
      </div>
      <div class="col-span-3 px-6 text-right tabular-nums text-gray-600">${formatCurrency(item.price)}</div>
      <div class="col-span-2 px-6 text-center tabular-nums text-gray-600">
        <span class="bg-gray-100 px-2 py-0.5 rounded text-xs font-semibold text-gray-600">${item.quantity}</span>
      </div>
      <div class="col-span-2 px-6 text-right font-bold tabular-nums text-gray-900">${formatCurrency(item.total)}</div>
    `;
    // Insert checkbox into placeholder span
    const placeholder = row.querySelector('.placeholder');
    placeholder.replaceWith(checkbox);

    row.addEventListener('click', (e) => {
      if (e.target === checkbox) return;
      checkbox.checked = !checkbox.checked;
      toggleService(idx, checkbox.checked, row);
    });

    serviceBodyEl.appendChild(row);
  });

  totalAmountEl.textContent = formatCurrency(data.total || 0);
  if (dataStatusEl) dataStatusEl.textContent = `${items.length} dịch vụ`;
}

function toggleService(idx, checked, row) {
  if (checked) selectedServiceIndexes.add(Number(idx));
  else selectedServiceIndexes.delete(Number(idx));
  if (row) {
    row.classList.toggle('bg-blue-100', checked);
  }
}

async function loadServices(roomId) {
  if (!roomId) return;
  try {
    const data = await HotelService.getRoomServices(roomId);
    renderServices(data);
    roomTitleEl.textContent = `Dịch vụ phòng ${roomId}`;
  } catch (err) {
    showAlert('error', 'Lỗi tải dịch vụ', err.message || String(err));
  }
}

function filterRooms(keyword) {
  if (!keyword) {
    filteredRooms = rooms.slice();
  } else {
    const k = keyword.toLowerCase();
    filteredRooms = rooms.filter(r =>
      (r.roomId || '').toLowerCase().includes(k) ||
      (r.roomType || '').toLowerCase().includes(k) ||
      (r.customerName || '').toLowerCase().includes(k)
    );
  }
  renderRooms(filteredRooms);
}

async function loadRooms(showSuccessAlert = false) {
  try {
    const start = performance.now();
    const data = await HotelService.getServiceRooms();
    const elapsed = performance.now() - start;
    setExecution(elapsed);
    const rawRooms = Array.isArray(data) ? data : [];

    // Ensure UI only shows rooms that actually have services.
    // Prefer backend field `serviceCount` when present.
    rooms = rawRooms.filter((r) => {
      const count = Number(r && r.serviceCount);
      if (Number.isFinite(count)) return count > 0;
      if (r && Array.isArray(r.services)) return r.services.length > 0;
      // If backend doesn't provide any service hint, don't hide the room.
      return true;
    });
    filterRooms(searchInputEl ? searchInputEl.value.trim() : '');
    if (selectedRoomId && rooms.find(r => r.roomId === selectedRoomId)) {
      selectRoom(selectedRoomId);
    } else {
      selectedRoomId = null;
      renderServices({ items: [], total: 0 });
      roomTitleEl.textContent = 'Chưa chọn phòng';
    }
    if (showSuccessAlert) {
      showAlert('success', 'Đã làm mới dữ liệu', `Tải ${rooms.length} phòng có dịch vụ.`);
    }
  } catch (err) {
    showAlert('error', 'Không tải được dữ liệu', err.message || String(err));
  }
}

async function selectRoom(roomId) {
  if (selectedRoomId === roomId) {
    // Deselect if clicking the same room
    selectedRoomId = null;
    renderRooms(filteredRooms.length ? filteredRooms : rooms);
    renderServices({ items: [], total: 0 });
    roomTitleEl.textContent = 'Chưa chọn phòng';
  } else {
    // Select the new room
    selectedRoomId = roomId;
    // re-render to highlight selection
    renderRooms(filteredRooms.length ? filteredRooms : rooms);
    await loadServices(roomId);
  }
}

async function handleAddService() {
  // Load and display AddServiceDialog
  try {
    const dialogHtml = await fetch('AddServiceDialogContent.html').then(r => r.text());
    const dialogOverlay = document.createElement('div');
    dialogOverlay.id = 'service-dialog-overlay';
    dialogOverlay.innerHTML = dialogHtml;
    document.body.appendChild(dialogOverlay);
    
    // Get elements
    const roomInput = dialogOverlay.querySelector('#room_code');
    const serviceInput = dialogOverlay.querySelector('#service_name');
    const priceInput = dialogOverlay.querySelector('#price');
    const qtyInput = dialogOverlay.querySelector('#quantity');
    
    // Pre-fill room code if one is selected
    if (roomInput && selectedRoomId) {
      roomInput.value = selectedRoomId;
      roomInput.readOnly = true;
    }
    
    // Auto-fill price based on service selection
    const servicePrices = {
      'AirportPickup': 27000,
      'Breakfast': 30800,
      'ExtraBed': 32400,
      'Laundry': 29500,
      'Spa': 31400
    };
    
    if (serviceInput) {
      serviceInput.addEventListener('input', () => {
        const selectedService = serviceInput.value.trim();
        if (servicePrices[selectedService]) {
          priceInput.value = servicePrices[selectedService];
        }
      });
    }
    
    // Setup button handlers using data-action
    const closeBtn = dialogOverlay.querySelector('[data-action="close"]');
    const cancelBtn = dialogOverlay.querySelector('[data-action="cancel"]');
    const submitBtn = dialogOverlay.querySelector('[data-action="submit"]');
    const decrementBtn = dialogOverlay.querySelector('[data-action="decrement"]');
    const incrementBtn = dialogOverlay.querySelector('[data-action="increment"]');
    
    function closeDialog() {
      dialogOverlay.remove();
    }
    
    if (closeBtn) closeBtn.addEventListener('click', closeDialog);
    if (cancelBtn) cancelBtn.addEventListener('click', closeDialog);
    
    if (decrementBtn) {
      decrementBtn.addEventListener('click', () => {
        const val = Number(qtyInput.value || 1);
        if (val > 1) qtyInput.value = val - 1;
      });
    }
    
    if (incrementBtn) {
      incrementBtn.addEventListener('click', () => {
        const val = Number(qtyInput.value || 1);
        qtyInput.value = val + 1;
      });
    }
    
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        const roomId = (roomInput.value || '').trim();
        const name = (serviceInput.value || '').trim();
        const price = Number(priceInput.value || 0);
        const quantity = Number(qtyInput.value || 1);
        
        if (!roomId) {
          alert('Nhập mã phòng');
          return;
        }
        if (!name) {
          alert('Nhập tên dịch vụ');
          return;
        }
        if (!Number.isFinite(price) || price <= 0) {
          alert('Nhập giá lớn hơn 0');
          return;
        }
        if (!Number.isInteger(quantity) || quantity <= 0) {
          alert('Nhập số lượng hợp lệ');
          return;
        }
        
        try {
          await HotelService.addRoomService(roomId, { serviceName: name, price, quantity });
          
          // Reload rooms to reflect changes (filter will apply)
          await loadRooms();
          
          // If the added room is the currently selected one, load its services
          if (roomId === selectedRoomId) {
            await loadServices(selectedRoomId);
          }
          
          showAlert('success', 'Đã thêm dịch vụ', `Phòng ${roomId}: ${name} x${quantity}`);
          closeDialog();
        } catch (err) {
          showAlert('error', 'Không thêm được dịch vụ', err.message || String(err));
        }
      });
    }
    
    // Close on background click
    const bgOverlay = dialogOverlay.querySelector('[aria-hidden="true"]');
    if (bgOverlay) {
      bgOverlay.addEventListener('click', closeDialog);
    }
  } catch (err) {
    showAlert('error', 'Không tải dialog', err.message || String(err));
  }
}

async function handleDeleteService() {
  if (!selectedRoomId) {
    showAlert('error', 'Chưa chọn phòng', 'Vui lòng chọn phòng đang thuê để xóa dịch vụ.');
    return;
  }
  if (selectedServiceIndexes.size === 0) {
    showAlert('error', 'Chưa chọn dịch vụ', 'Hãy chọn ít nhất một dịch vụ để xóa.');
    return;
  }
  try {
    const indices = Array.from(selectedServiceIndexes).sort((a, b) => b - a);
    for (const idx of indices) {
      await HotelService.deleteRoomService(selectedRoomId, idx);
    }
    selectedServiceIndexes.clear();
    await loadServices(selectedRoomId);
    
    // Reload rooms to reflect changes (room may disappear if no services left)
    await loadRooms();
    
    // If room was removed from list (no services), clear selection
    if (!rooms.find(r => r.roomId === selectedRoomId)) {
      selectedRoomId = null;
      renderServices({ items: [], total: 0 });
      roomTitleEl.textContent = 'Chưa chọn phòng';
    }
    
    showAlert('success', 'Đã xóa dịch vụ', `Đã xóa ${indices.length} mục.`);
  } catch (err) {
    showAlert('error', 'Không xóa được dịch vụ', err.message || String(err));
  }
}

if (searchInputEl) {
  searchInputEl.addEventListener('input', (e) => filterRooms(e.target.value || ''));
}
if (clearSearchEl) {
  clearSearchEl.addEventListener('click', () => {
    if (searchInputEl) searchInputEl.value = '';
    filterRooms('');
  });
}
if (refreshBtn) refreshBtn.addEventListener('click', () => loadRooms(true));
if (addBtn) addBtn.addEventListener('click', handleAddService);
if (deleteBtn) deleteBtn.addEventListener('click', handleDeleteService);

// Load sidebar similar to other pages
fetch('sidebar.html')
  .then(r => r.text())
  .then(html => {
    const container = document.getElementById('sidebar-container');
    if (!container) {
      console.error('[ServiceMgmt] Sidebar container not found');
      return;
    }
    container.innerHTML = html;
    const scripts = container.querySelectorAll('script');
    scripts.forEach(script => {
      const s = document.createElement('script');
      s.textContent = script.textContent;
      document.body.appendChild(s);
    });
    if (typeof initSidebar === 'function') {
      console.log('[ServiceMgmt] Initializing sidebar with page=service');
      setTimeout(() => initSidebar('service'), 50);
    } else {
      console.warn('[ServiceMgmt] initSidebar function not found');
    }
  })
  .catch((err) => {
    console.error('[ServiceMgmt] Error loading sidebar:', err);
  });

// Initial load
console.log('[ServiceMgmt] Service management page loaded');
loadRooms();
