import { HotelService } from './api.js?v=20260113';

document.addEventListener('DOMContentLoaded', () => {
  let allRooms = [];
  let filteredRooms = [];

  // Format price
  function formatPrice(price) {
    let num = Number(price || 0);
    // Nếu giá nhỏ hơn 10000, nhân với 1000 (dữ liệu có thể tính bằng nghìn đ)
    if (num > 0 && num < 10000) {
      num = num * 1000;
    }
    return num.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' đ';
  }

  // Render table
  function renderTable(rooms) {
    const tbody = document.getElementById('table-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    (rooms || []).forEach(r => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-blue-50 dark:hover:bg-[#253240] transition-colors';

      const services = Array.isArray(r.services)
        ? r.services.map(s => s.serviceName || s.name || '').filter(Boolean).join(', ')
        : '';

      const status = r.isAvailable
        ? '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Trống</span>'
        : '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>Đang thuê</span>';

      tr.innerHTML = `
        <td class="px-6 py-4 text-sm font-medium text-[#0d141b] dark:text-white">${r.roomId || ''}</td>
        <td class="px-6 py-4 text-sm text-[#4c739a] dark:text-gray-300">${r.roomType || ''}</td>
        <td class="px-6 py-4 text-sm font-semibold text-[#0d141b] dark:text-white">${formatPrice(r.pricePerDay || 0)}</td>
        <td class="px-6 py-4">${status}</td>
        <td class="px-6 py-4 text-sm text-[#4c739a] dark:text-gray-300">${services || 'Không'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Load rooms
  async function loadRooms() {
    try {
      const start = performance.now();
      const rooms = await HotelService.getRooms();
      allRooms = Array.isArray(rooms) ? rooms : (rooms && rooms.data) || [];
      filteredRooms = [];
      renderTable(allRooms);
      const t = document.getElementById('execution-time');
      if (t) t.textContent = (performance.now() - start).toFixed(1);
    } catch (err) {
      console.error('Lỗi:', err);
    }
  }

  // Show notification
  function showNotification(text) {
    const banner = document.getElementById('notification-banner');
    if (!banner) return;
    banner.textContent = text;
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 2000);
  }

  // Search
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const start = performance.now();
      const query = (e.target.value || '').toLowerCase();
      if (!query) {
        filteredRooms = [];
        renderTable(allRooms);
      } else {
        filteredRooms = allRooms.filter(r =>
          (r.roomId || '').toLowerCase().includes(query) ||
          (r.roomType || '').toLowerCase().includes(query)
        );
        renderTable(filteredRooms);
        showNotification(`Tìm kiếm: "${e.target.value}" (${filteredRooms.length} kết quả)`);
      }
      const t = document.getElementById('execution-time');
      if (t) t.textContent = (performance.now() - start).toFixed(1);
    });
  }

  // Clear search
  const clearSearchBtn = document.getElementById('clear-search-btn');
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      filteredRooms = [];
      renderTable(allRooms);
    });
  }

  // Clear filter
  const clearFilterBtn = document.getElementById('clear-filter-btn');
  if (clearFilterBtn) {
    clearFilterBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      filteredRooms = [];
      renderTable(allRooms);
    });
  }

  // Refresh
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      const start = performance.now();
      await loadRooms();
      showNotification('Đã làm mới dữ liệu');
      const t = document.getElementById('execution-time');
      if (t) t.textContent = (performance.now() - start).toFixed(1);
    });
  }

  // Sort ascending
  const sortAscBtn = document.getElementById('sort-asc-btn');
  if (sortAscBtn) {
    sortAscBtn.addEventListener('click', () => {
      const start = performance.now();
      const base = filteredRooms.length ? filteredRooms : allRooms;
      const sorted = [...base].sort((a, b) => (a.pricePerDay || 0) - (b.pricePerDay || 0));
      filteredRooms = sorted;
      renderTable(sorted);
      showNotification('Sắp xếp giá tăng dần');
      const t = document.getElementById('execution-time');
      if (t) t.textContent = (performance.now() - start).toFixed(1);
    });
  }

  // Sort descending
  const sortDescBtn = document.getElementById('sort-desc-btn');
  if (sortDescBtn) {
    sortDescBtn.addEventListener('click', () => {
      const start = performance.now();
      const base = filteredRooms.length ? filteredRooms : allRooms;
      const sorted = [...base].sort((a, b) => (b.pricePerDay || 0) - (a.pricePerDay || 0));
      filteredRooms = sorted;
      renderTable(sorted);
      showNotification('Sắp xếp giá giảm dần');
      const t = document.getElementById('execution-time');
      if (t) t.textContent = (performance.now() - start).toFixed(1);
    });
  }

  // Add room modal
  const addRoomBtn = document.getElementById('add-room-btn');
  const addModal = document.getElementById('add-modal');
  const addCancelBtn = document.getElementById('add-cancel-btn');
  const addSaveBtn = document.getElementById('add-save-btn');
  if (addRoomBtn && addModal) {
    addRoomBtn.addEventListener('click', () => {
      addModal.classList.remove('hidden');
    });
  }
  if (addCancelBtn && addModal) {
    addCancelBtn.addEventListener('click', () => {
      addModal.classList.add('hidden');
      const idEl = document.getElementById('add-room-id');
      const typeEl = document.getElementById('add-room-type');
      const priceEl = document.getElementById('add-room-price');
      if (idEl) idEl.value = '';
      if (typeEl) typeEl.value = '';
      if (priceEl) priceEl.value = '';
    });
  }
  if (addSaveBtn && addModal) {
    addSaveBtn.addEventListener('click', async () => {
      const id = (document.getElementById('add-room-id')?.value || '').trim();
      const type = document.getElementById('add-room-type')?.value || '';
      const price = Number(document.getElementById('add-room-price')?.value || 0);

      if (!id || !type) {
        alert('Vui lòng điền đầy đủ thông tin');
        return;
      }

      try {
        await HotelService.createRoom({ roomId: id, roomType: type, pricePerDay: price, isAvailable: true });
        addModal.classList.add('hidden');
        const idEl = document.getElementById('add-room-id');
        const typeEl = document.getElementById('add-room-type');
        const priceEl = document.getElementById('add-room-price');
        if (idEl) idEl.value = '';
        if (typeEl) typeEl.value = '';
        if (priceEl) priceEl.value = '';
        await loadRooms();
        showNotification(`Đã thêm phòng ${id}`);
      } catch (err) {
        alert('Lỗi: ' + (err.message || err));
      }
    });
  }

  // Delete room modal
  const deleteRoomBtn = document.getElementById('delete-room-btn');
  const deleteModal = document.getElementById('delete-modal');
  const deleteCancelBtn = document.getElementById('delete-cancel-btn');
  const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
  if (deleteRoomBtn && deleteModal) {
    deleteRoomBtn.addEventListener('click', () => {
      deleteModal.classList.remove('hidden');
    });
  }
  if (deleteCancelBtn && deleteModal) {
    deleteCancelBtn.addEventListener('click', () => {
      deleteModal.classList.add('hidden');
      const idEl = document.getElementById('delete-room-id');
      if (idEl) idEl.value = '';
    });
  }
  if (deleteConfirmBtn && deleteModal) {
    deleteConfirmBtn.addEventListener('click', async () => {
      const id = (document.getElementById('delete-room-id')?.value || '').trim();
      if (!id) {
        alert('Vui lòng nhập mã phòng');
        return;
      }

      try {
        await HotelService.deleteRoom(id);
        deleteModal.classList.add('hidden');
        const idEl = document.getElementById('delete-room-id');
        if (idEl) idEl.value = '';
        await loadRooms();
        showNotification(`Đã xóa phòng ${id}`);
      } catch (err) {
        alert('Lỗi: ' + (err.message || err));
      }
    });
  }

  // Initial load
  loadRooms();

  // Load sidebar
  fetch('sidebar.html')
    .then(r => r.text())
    .then(html => {
      const sidebarContainer = document.getElementById('sidebar-container');
      if (!sidebarContainer) return;
      sidebarContainer.innerHTML = html;
      const scripts = document.querySelectorAll('#sidebar-container script');
      scripts.forEach(script => {
        const newScript = document.createElement('script');
        newScript.textContent = script.textContent;
        document.body.appendChild(newScript);
      });
      setTimeout(() => initSidebar('room'), 100);
    });
});
