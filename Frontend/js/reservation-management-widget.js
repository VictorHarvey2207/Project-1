import { HotelService } from './api.js?v=20260113';

document.addEventListener('DOMContentLoaded', () => {
  let allReservations = [];
  let filteredReservations = [];
  let allCustomers = [];
  let allRooms = [];
  let currentStatusFilter = null;

  function applyFiltersAndRender() {
    const query = (document.getElementById('search-input')?.value || '').trim().toLowerCase();

    let base = allReservations;
    if (query) {
      base = allReservations.filter(r =>
        (r.reservationId || '').toLowerCase().includes(query) ||
        (r.customerId || '').toLowerCase().includes(query) ||
        (r.roomId || '').toLowerCase().includes(query) ||
        (r.fullName || '').toLowerCase().includes(query)
      );
      filteredReservations = base;
    } else {
      filteredReservations = [];
    }

    let list = base;
    if (currentStatusFilter) {
      list = base.filter(r => r.status === currentStatusFilter);
    }

    renderTable(list);
  }

  // Render table
  function renderTable(reservations) {
    const tbody = document.getElementById('table-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    (reservations || []).forEach(r => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-blue-50 dark:hover:bg-[#253240] transition-colors';

      const checkInDate = `${r.checkInDay}/${r.checkInMonth}/${r.checkInYear}`;
      const checkOutDate = `${r.checkOutDay}/${r.checkOutMonth}/${r.checkOutYear}`;

      let statusBadge = '';
      if (r.status === 'pending') {
        statusBadge = '<span class="px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 text-xs font-bold">Chưa nhận</span>';
      } else if (r.status === 'checkedIn') {
        statusBadge = '<span class="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-bold">Đã nhận</span>';
      } else if (r.status === 'checkedOut') {
        statusBadge = '<span class="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold">Đã trả</span>';
      } else if (r.status === 'cancel') {
        statusBadge = '<span class="px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-xs font-bold">Hủy</span>';
      }

      tr.innerHTML = `
        <td class="px-6 py-4 text-sm font-medium text-[#0d141b] dark:text-white">${r.reservationId || ''}</td>
        <td class="px-6 py-4 text-sm text-[#4c739a] dark:text-gray-300">${r.customerId || ''}</td>
        <td class="px-6 py-4 text-sm text-primary dark:text-primary font-medium">${r.fullName || ''}</td>
        <td class="px-6 py-4 text-sm text-[#4c739a] dark:text-gray-300">${r.roomId || ''}</td>
        <td class="px-6 py-4 text-sm text-[#4c739a] dark:text-gray-300">${checkInDate}</td>
        <td class="px-6 py-4 text-sm text-[#4c739a] dark:text-gray-300">${checkOutDate}</td>
        <td class="px-6 py-4 text-sm">${statusBadge}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Delete reservation modal (similar to delete customer)
  const deleteReservationBtn = document.getElementById('delete-reservation-btn');
  const deleteResModal = document.getElementById('delete-res-modal');

  if (deleteReservationBtn && deleteResModal) {
    deleteReservationBtn.addEventListener('click', () => {
      deleteResModal.classList.remove('hidden');
      const input = document.getElementById('delete-res-id');
      if (input) input.focus();
    });
  }

  function resetDeleteReservationFormAndClose() {
    if (deleteResModal) deleteResModal.classList.add('hidden');
    const idEl = document.getElementById('delete-res-id');
    if (idEl) idEl.value = '';
  }

  const deleteResCloseBtn = document.getElementById('delete-res-close-btn');
  if (deleteResCloseBtn) deleteResCloseBtn.addEventListener('click', resetDeleteReservationFormAndClose);

  const deleteResCancelBtn = document.getElementById('delete-res-cancel-btn');
  if (deleteResCancelBtn) deleteResCancelBtn.addEventListener('click', resetDeleteReservationFormAndClose);

  const deleteResConfirmBtn = document.getElementById('delete-res-confirm-btn');
  if (deleteResConfirmBtn) {
    deleteResConfirmBtn.addEventListener('click', async () => {
      const id = (document.getElementById('delete-res-id')?.value || '').trim();
      if (!id) {
        alert('Vui lòng nhập mã đơn đặt phòng');
        return;
      }

      const ok = confirm(`Xóa đơn đặt phòng ${id}?`);
      if (!ok) return;

      const start = performance.now();
      try {
        await HotelService.deleteReservation(id);
        resetDeleteReservationFormAndClose();
        await loadAllData();
        showNotification(`Đã xóa đơn đặt phòng ${id}`);
      } catch (err) {
        alert('Lỗi: ' + (err.message || err));
      } finally {
        const t = document.getElementById('execution-time');
        if (t) t.textContent = (performance.now() - start).toFixed(1);
      }
    });
  }

  // Load data
  async function loadAllData() {
    try {
      const start = performance.now();
      const [res, cust, rooms] = await Promise.all([
        HotelService.getReservations(),
        HotelService.getCustomers(),
        HotelService.getRooms()
      ]);

      allReservations = Array.isArray(res) ? res : res.data || [];
      allCustomers = Array.isArray(cust) ? cust : cust.data || [];
      allRooms = Array.isArray(rooms) ? rooms : rooms.data || [];

      applyFiltersAndRender();
      const t = document.getElementById('execution-time');
      if (t) t.textContent = (performance.now() - start).toFixed(1);
    } catch (err) {
      console.error('Lỗi tải dữ liệu:', err);
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
        filteredReservations = [];
        currentStatusFilter = null;
        renderTable(allReservations);
      } else {
        filteredReservations = allReservations.filter(r =>
          (r.reservationId || '').toLowerCase().includes(query) ||
          (r.customerId || '').toLowerCase().includes(query) ||
          (r.roomId || '').toLowerCase().includes(query) ||
          (r.fullName || '').toLowerCase().includes(query)
        );
        renderTable(filteredReservations);
        showNotification(`Tìm kiếm: "${e.target.value}" (${filteredReservations.length} kết quả)`);
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
      filteredReservations = [];
      currentStatusFilter = null;
      renderTable(allReservations);
    });
  }

  // Status filter
  const statusFilterBtn = document.getElementById('status-filter-btn');
  if (statusFilterBtn) {
    statusFilterBtn.addEventListener('click', () => {
      const statuses = ['all', 'pending', 'checkedIn', 'checkedOut', 'cancel'];
      const labels = {
        'all': 'Tất cả',
        'pending': 'Chưa nhận',
        'checkedIn': 'Đã nhận',
        'checkedOut': 'Đã trả',
        'cancel': 'Hủy'
      };

      const menuHtml = statuses.map(status => `
        <button class="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm ${currentStatusFilter === status ? 'text-primary font-bold' : 'text-slate-700 dark:text-slate-300'}" data-status="${status}">
          ${labels[status]}
        </button>
      `).join('');

      const menu = document.createElement('div');
      menu.className = 'absolute top-full right-0 mt-1 w-48 bg-white dark:bg-[#253240] border border-[#cfdbe7] dark:border-gray-600 rounded-lg shadow-lg z-20';
      menu.innerHTML = menuHtml;

      document.body.appendChild(menu);

      menu.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          const start = performance.now();
          const status = btn.dataset.status;
          currentStatusFilter = status === 'all' ? null : status;

          if (currentStatusFilter === null) {
            renderTable(filteredReservations.length ? filteredReservations : allReservations);
          } else {
            const filtered = (filteredReservations.length ? filteredReservations : allReservations).filter(r => r.status === currentStatusFilter);
            renderTable(filtered);
            showNotification(`Lọc trạng thái: ${labels[status]} (${filtered.length} kết quả)`);
          }

          const t = document.getElementById('execution-time');
          if (t) t.textContent = (performance.now() - start).toFixed(1);
          menu.remove();
        });
      });
    });
  }

  // Refresh
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      const start = performance.now();
      await loadAllData();
      filteredReservations = [];
      currentStatusFilter = null;
      showNotification('Đã làm mới dữ liệu');
      const t = document.getElementById('execution-time');
      if (t) t.textContent = (performance.now() - start).toFixed(1);
    });
  }

  // Add reservation modal - customer search
  const addCustomerInput = document.getElementById('add-customer-input');
  if (addCustomerInput) {
    addCustomerInput.addEventListener('input', (e) => {
      const query = (e.target.value || '').toLowerCase();
      const dropdown = document.getElementById('add-customer-dropdown');
      if (!dropdown) return;

      if (!query) {
        dropdown.classList.add('hidden');
        return;
      }

      const filtered = allCustomers.filter(c =>
        (c.customerId || '').toLowerCase().includes(query) ||
        (c.fullName || '').toLowerCase().includes(query)
      );

      dropdown.innerHTML = filtered.map(c => `
        <div class="px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-sm" data-id="${c.customerId}" data-name="${c.fullName}">
          <div class="font-medium text-[#0d141b] dark:text-white">${c.customerId} - ${c.fullName}</div>
        </div>
      `).join('');

      dropdown.classList.remove('hidden');

      dropdown.querySelectorAll('div').forEach(item => {
        item.addEventListener('click', () => {
          const input = document.getElementById('add-customer-input');
          const hidden = document.getElementById('add-customer-id');
          if (input) input.value = `${item.dataset.id} - ${item.dataset.name}`;
          if (hidden) hidden.value = item.dataset.id;
          dropdown.classList.add('hidden');
        });
      });
    });
  }

  // Add reservation modal - reservation ID suggestions (show cancel/checkedOut)
  const addResId = document.getElementById('add-res-id');
  if (addResId) {
    addResId.addEventListener('input', (e) => {
      const query = (e.target.value || '').toLowerCase();
      const dropdown = document.getElementById('add-resid-dropdown');
      if (!dropdown) return;

      if (!query) {
        dropdown.classList.add('hidden');
        return;
      }
      const filtered = allReservations.filter(r =>
        (r.status === 'cancel' || r.status === 'checkedOut') &&
        (((r.reservationId || '').toLowerCase().includes(query)) ||
          ((r.customerId || '').toLowerCase().includes(query)))
      );
      dropdown.innerHTML = filtered.map(r => `
        <div class="px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-sm" data-id="${r.reservationId}">
          <div class="font-medium text-[#0d141b] dark:text-white">${r.reservationId} - ${r.fullName || ''}</div>
          <div class="text-xs text-[#4c739a]">Trạng thái: ${r.status}</div>
        </div>
      `).join('');
      dropdown.classList.remove('hidden');
      dropdown.querySelectorAll('div').forEach(item => {
        item.addEventListener('click', () => {
          const el = document.getElementById('add-res-id');
          if (el) el.value = item.dataset.id;
          dropdown.classList.add('hidden');
        });
      });
    });
  }

  // Add reservation modal - room search
  const addRoomInput = document.getElementById('add-room-input');
  if (addRoomInput) {
    addRoomInput.addEventListener('input', (e) => {
      const query = (e.target.value || '').toLowerCase();
      const dropdown = document.getElementById('add-room-dropdown');
      if (!dropdown) return;

      if (!query) {
        dropdown.classList.add('hidden');
        return;
      }

      // Filter available rooms (backend already sets isAvailable correctly)
      const filtered = allRooms.filter(r =>
        (r.isAvailable === true || r.isAvailable === 'true') &&
        (((r.roomId || '').toLowerCase().includes(query)) ||
          ((r.roomType || '').toLowerCase().includes(query)))
      );

      dropdown.innerHTML = filtered.map(r => `
        <div class="px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-sm" data-id="${r.roomId}" data-type="${r.roomType}">
          <div class="font-medium text-[#0d141b] dark:text-white">${r.roomId} - ${r.roomType}</div>
        </div>
      `).join('');

      dropdown.classList.remove('hidden');

      dropdown.querySelectorAll('div').forEach(item => {
        item.addEventListener('click', () => {
          const input = document.getElementById('add-room-input');
          const hidden = document.getElementById('add-room-id');
          if (input) input.value = `${item.dataset.id} - ${item.dataset.type}`;
          if (hidden) hidden.value = item.dataset.id;
          dropdown.classList.add('hidden');
        });
      });
    });
  }

  // Calculate nights
  function updateNights() {
    const checkInStr = document.getElementById('add-checkin-date')?.value;
    const checkOutStr = document.getElementById('add-checkout-date')?.value;

    if (!checkInStr || !checkOutStr) return;

    const [inY, inM, inD] = checkInStr.split('-').map(Number);
    const [outY, outM, outD] = checkOutStr.split('-').map(Number);

    const checkIn = new Date(inY, inM - 1, inD);
    const checkOut = new Date(outY, outM - 1, outD);
    const nights = Math.max(0, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)));

    const info = document.getElementById('nights-info');
    if (info) info.textContent = `Đặt phòng cho ${nights} đêm.`;
  }

  const addCheckinDate = document.getElementById('add-checkin-date');
  const addCheckoutDate = document.getElementById('add-checkout-date');
  if (addCheckinDate) addCheckinDate.addEventListener('change', updateNights);
  if (addCheckoutDate) addCheckoutDate.addEventListener('change', updateNights);

  // Add reservation modal open/close
  const addReservationBtn = document.getElementById('add-reservation-btn');
  const addModal = document.getElementById('add-modal');
  if (addReservationBtn && addModal) {
    addReservationBtn.addEventListener('click', () => {
      addModal.classList.remove('hidden');
    });
  }

  function resetAddReservationFormAndClose() {
    if (addModal) addModal.classList.add('hidden');
    const resetIds = [
      'add-res-id',
      'add-customer-input',
      'add-customer-id',
      'add-checkin-date',
      'add-checkout-date',
      'add-room-input',
      'add-room-id',
    ];
    resetIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }

  const addCloseBtn = document.getElementById('add-close-btn');
  if (addCloseBtn) addCloseBtn.addEventListener('click', resetAddReservationFormAndClose);

  const addCancelBtn = document.getElementById('add-cancel-btn');
  if (addCancelBtn) addCancelBtn.addEventListener('click', resetAddReservationFormAndClose);

  // Add reservation save
  const addSaveBtn = document.getElementById('add-save-btn');
  if (addSaveBtn) {
    addSaveBtn.addEventListener('click', async () => {
      const start = performance.now();
      const resId = (document.getElementById('add-res-id')?.value || '').trim();
      const custId = (document.getElementById('add-customer-id')?.value || '').trim();
      const checkInStr = document.getElementById('add-checkin-date')?.value;
      const checkOutStr = document.getElementById('add-checkout-date')?.value;
      const roomId = (document.getElementById('add-room-id')?.value || '').trim();

      if (!resId || !custId || !checkInStr || !checkOutStr || !roomId) {
        alert('Vui lòng điền đầy đủ thông tin');
        return;
      }

      const [inY, inM, inD] = checkInStr.split('-').map(Number);
      const [outY, outM, outD] = checkOutStr.split('-').map(Number);

      try {
        await HotelService.createReservation({
          reservationId: resId,
          customerId: custId,
          roomId: roomId,
          checkInDay: inD,
          checkInMonth: inM,
          checkInYear: inY,
          checkOutDay: outD,
          checkOutMonth: outM,
          checkOutYear: outY,
          status: 'pending'
        });

        resetAddReservationFormAndClose();

        await loadAllData();
        showNotification(`Đã đặt phòng ${resId}`);
        const t = document.getElementById('execution-time');
        if (t) t.textContent = (performance.now() - start).toFixed(1);
      } catch (err) {
        alert('Lỗi: ' + (err.message || err));
      }
    });
  }

  // Check-in modal - reservation search
  const checkinResInput = document.getElementById('checkin-res-input');
  if (checkinResInput) {
    checkinResInput.addEventListener('input', (e) => {
      const query = (e.target.value || '').toLowerCase();
      const dropdown = document.getElementById('checkin-res-dropdown');

      if (!dropdown) return;
      if (!query) {
        dropdown.classList.add('hidden');
        return;
      }

      const filtered = allReservations.filter(r =>
        r.status === 'pending' &&
        (((r.reservationId || '').toLowerCase().includes(query)) ||
          ((r.customerId || '').toLowerCase().includes(query)))
      );

      dropdown.innerHTML = filtered.map(r => `
        <div class="px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-sm" data-id="${r.reservationId}">
          <div class="font-medium text-[#0d141b] dark:text-white">${r.reservationId} - ${r.fullName}</div>
          <div class="text-xs text-[#4c739a]">Phòng: ${r.roomId}</div>
        </div>
      `).join('');

      dropdown.classList.remove('hidden');

      dropdown.querySelectorAll('div').forEach(item => {
        item.addEventListener('click', () => {
          const input = document.getElementById('checkin-res-input');
          const hidden = document.getElementById('checkin-res-id');
          if (input) input.value = item.dataset.id;
          if (hidden) hidden.value = item.dataset.id;
          dropdown.classList.add('hidden');
        });
      });
    });
  }

  // Check-in modal open/close
  const checkinBtn = document.getElementById('checkin-btn');
  const checkinModal = document.getElementById('checkin-modal');
  if (checkinBtn && checkinModal) {
    checkinBtn.addEventListener('click', () => {
      checkinModal.classList.remove('hidden');
    });
  }

  function resetCheckinFormAndClose() {
    if (checkinModal) checkinModal.classList.add('hidden');
    const input = document.getElementById('checkin-res-input');
    const hidden = document.getElementById('checkin-res-id');
    if (input) input.value = '';
    if (hidden) hidden.value = '';
  }

  const checkinCloseBtn = document.getElementById('checkin-close-btn');
  if (checkinCloseBtn) checkinCloseBtn.addEventListener('click', resetCheckinFormAndClose);

  const checkinCancelBtn = document.getElementById('checkin-cancel-btn');
  if (checkinCancelBtn) checkinCancelBtn.addEventListener('click', resetCheckinFormAndClose);

  // Check-in confirm
  const checkinConfirmBtn = document.getElementById('checkin-confirm-btn');
  if (checkinConfirmBtn) {
    checkinConfirmBtn.addEventListener('click', async () => {
      const start = performance.now();
      const resId = (document.getElementById('checkin-res-id')?.value || '').trim();

      if (!resId) {
        alert('Vui lòng chọn đặt phòng');
        return;
      }

      try {
        const result = await fetch('/api/reservations/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservationId: resId })
        }).then(r => r.json());

        if (result && result.error) {
          throw new Error(result.error);
        }

        resetCheckinFormAndClose();

        await loadAllData();
        showNotification(`Đã nhận phòng ${resId}`);
        const t = document.getElementById('execution-time');
        if (t) t.textContent = (performance.now() - start).toFixed(1);
      } catch (err) {
        alert('Lỗi: ' + (err.message || err));
      }
    });
  }

  // Cancel modal - reservation search
  const cancelResInput = document.getElementById('cancel-res-input');
  if (cancelResInput) {
    cancelResInput.addEventListener('input', (e) => {
      const query = (e.target.value || '').toLowerCase();
      const dropdown = document.getElementById('cancel-res-dropdown');
      if (!dropdown) return;

      if (!query) {
        dropdown.classList.add('hidden');
        return;
      }

      const filtered = allReservations.filter(r =>
        r.status === 'pending' &&
        (((r.reservationId || '').toLowerCase().includes(query)) ||
          ((r.customerId || '').toLowerCase().includes(query)))
      );

      dropdown.innerHTML = filtered.map(r => `
        <div class="px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-sm" data-id="${r.reservationId}">
          <div class="font-medium text-[#0d141b] dark:text-white">${r.reservationId} - ${r.fullName}</div>
          <div class="text-xs text-[#4c739a]">Phòng: ${r.roomId}</div>
        </div>
      `).join('');

      dropdown.classList.remove('hidden');

      dropdown.querySelectorAll('div').forEach(item => {
        item.addEventListener('click', () => {
          const input = document.getElementById('cancel-res-input');
          const hidden = document.getElementById('cancel-res-id');
          if (input) input.value = item.dataset.id;
          if (hidden) hidden.value = item.dataset.id;
          dropdown.classList.add('hidden');
        });
      });
    });
  }

  // Cancel modal open/close
  const cancelBtn = document.getElementById('cancel-btn');
  const cancelModal = document.getElementById('cancel-modal');
  if (cancelBtn && cancelModal) {
    cancelBtn.addEventListener('click', () => {
      cancelModal.classList.remove('hidden');
    });
  }

  function resetCancelFormAndClose() {
    if (cancelModal) cancelModal.classList.add('hidden');
    const input = document.getElementById('cancel-res-input');
    const hidden = document.getElementById('cancel-res-id');
    if (input) input.value = '';
    if (hidden) hidden.value = '';
  }

  const cancelCloseBtn = document.getElementById('cancel-close-btn');
  if (cancelCloseBtn) cancelCloseBtn.addEventListener('click', resetCancelFormAndClose);

  const cancelCloseDialogBtn = document.getElementById('cancel-close-dialog-btn');
  if (cancelCloseDialogBtn) cancelCloseDialogBtn.addEventListener('click', resetCancelFormAndClose);

  // Cancel confirm
  const cancelConfirmBtn = document.getElementById('cancel-confirm-btn');
  if (cancelConfirmBtn) {
    cancelConfirmBtn.addEventListener('click', async () => {
      const start = performance.now();
      const resId = (document.getElementById('cancel-res-id')?.value || '').trim();

      if (!resId) {
        alert('Vui lòng chọn đặt phòng');
        return;
      }

      try {
        const result = await fetch('/api/reservations/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservationId: resId })
        }).then(r => r.json());

        if (result && result.error) {
          throw new Error(result.error);
        }

        resetCancelFormAndClose();

        await loadAllData();
        showNotification(`Đã hủy phòng ${resId}`);
        const t = document.getElementById('execution-time');
        if (t) t.textContent = (performance.now() - start).toFixed(1);
      } catch (err) {
        alert('Lỗi: ' + (err.message || err));
      }
    });
  }

  // Initial load
  loadAllData();

  // Auto-sync (polling) so the UI updates when JSON changes.
  let autoSyncTimer = null;
  let autoSyncInFlight = false;

  async function autoSyncOnce() {
    if (autoSyncInFlight || document.hidden) return;
    autoSyncInFlight = true;
    try {
      await loadAllData();
    } finally {
      autoSyncInFlight = false;
    }
  }

  function startAutoSync() {
    if (autoSyncTimer) return;
    autoSyncTimer = setInterval(autoSyncOnce, 5000);
    window.addEventListener('focus', autoSyncOnce);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) autoSyncOnce();
    });
  }

  startAutoSync();

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
      setTimeout(() => initSidebar('reservation'), 100);
    });
});
