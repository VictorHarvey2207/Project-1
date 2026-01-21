import { HotelService } from './api.js?v=20260113';

document.addEventListener('DOMContentLoaded', () => {
  let allCustomers = [];
  let filteredCustomers = [];

  // Render table
  function renderTable(customers) {
    const tbody = document.getElementById('table-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    (customers || []).forEach(c => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-blue-50 dark:hover:bg-[#253240] transition-colors';
      tr.innerHTML = `
        <td class="px-6 py-4 text-sm font-medium text-[#0d141b] dark:text-white">${c.customerId || ''}</td>
        <td class="px-6 py-4 text-sm text-primary dark:text-primary font-medium">${c.fullName || c.customerName || ''}</td>
        <td class="px-6 py-4 text-sm text-[#4c739a] dark:text-gray-300">${c.idCard || c.cccd || ''}</td>
        <td class="px-6 py-4 text-sm text-[#4c739a] dark:text-gray-300">${c.phoneNumber || ''}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Load customers
  async function loadCustomers() {
    try {
      const start = performance.now();
      const customers = await HotelService.getCustomers();
      allCustomers = Array.isArray(customers) ? customers : (customers && customers.data) || [];

      // Ensure stable, user-friendly order (ascending by customerId like C001 -> C500)
      allCustomers.sort((a, b) => {
        const aId = String(a.customerId ?? '').toUpperCase();
        const bId = String(b.customerId ?? '').toUpperCase();

        const aNum = Number((aId.match(/\d+/) || [])[0] || NaN);
        const bNum = Number((bId.match(/\d+/) || [])[0] || NaN);

        if (Number.isFinite(aNum) && Number.isFinite(bNum) && aNum !== bNum) {
          return aNum - bNum;
        }
        return aId.localeCompare(bId, 'vi');
      });

      filteredCustomers = [];
      renderTable(allCustomers);
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

  const searchInput = document.getElementById('search-input');

  // Search
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const start = performance.now();
      const query = (e.target.value || '').toLowerCase();
      if (!query) {
        filteredCustomers = [];
        renderTable(allCustomers);
      } else {
        filteredCustomers = allCustomers.filter(c =>
          (c.customerId || '').toLowerCase().includes(query) ||
          (c.fullName || c.customerName || '').toLowerCase().includes(query) ||
          (c.idCard || c.cccd || '').toLowerCase().includes(query) ||
          (c.phoneNumber || '').toLowerCase().includes(query)
        );
        renderTable(filteredCustomers);
        showNotification(`Tìm kiếm: "${e.target.value}" (${filteredCustomers.length} kết quả)`);
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
      filteredCustomers = [];
      renderTable(allCustomers);
    });
  }

  // Refresh
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      const start = performance.now();
      await loadCustomers();
      filteredCustomers = [];
      showNotification('Đã làm mới dữ liệu');
      const t = document.getElementById('execution-time');
      if (t) t.textContent = (performance.now() - start).toFixed(1);
    });
  }

  // Sort A-Z
  const sortAscBtn = document.getElementById('sort-asc-btn');
  if (sortAscBtn) {
    sortAscBtn.addEventListener('click', () => {
      const start = performance.now();
      const base = filteredCustomers.length ? filteredCustomers : allCustomers;
      const sorted = [...base].sort((a, b) => {
        const nameA = (a.fullName || a.customerName || '').trim().split(' ').pop() || '';
        const nameB = (b.fullName || b.customerName || '').trim().split(' ').pop() || '';
        return nameA.localeCompare(nameB, 'vi');
      });
      filteredCustomers = sorted;
      renderTable(sorted);
      showNotification('Sắp xếp A → Z (theo tên)');
      const t = document.getElementById('execution-time');
      if (t) t.textContent = (performance.now() - start).toFixed(1);
    });
  }

  // Sort Z-A
  const sortDescBtn = document.getElementById('sort-desc-btn');
  if (sortDescBtn) {
    sortDescBtn.addEventListener('click', () => {
      const start = performance.now();
      const base = filteredCustomers.length ? filteredCustomers : allCustomers;
      const sorted = [...base].sort((a, b) => {
        const nameA = (a.fullName || a.customerName || '').trim().split(' ').pop() || '';
        const nameB = (b.fullName || b.customerName || '').trim().split(' ').pop() || '';
        return nameB.localeCompare(nameA, 'vi');
      });
      filteredCustomers = sorted;
      renderTable(sorted);
      showNotification('Sắp xếp Z → A (theo tên)');
      const t = document.getElementById('execution-time');
      if (t) t.textContent = (performance.now() - start).toFixed(1);
    });
  }

  // Add customer modal
  const addCustomerBtn = document.getElementById('add-customer-btn');
  const addModal = document.getElementById('add-modal');
  if (addCustomerBtn && addModal) {
    addCustomerBtn.addEventListener('click', () => {
      addModal.classList.remove('hidden');
    });
  }

  function resetAddFormAndClose() {
    if (addModal) addModal.classList.add('hidden');
    const idEl = document.getElementById('add-id');
    const nameEl = document.getElementById('add-name');
    const cccdEl = document.getElementById('add-cccd');
    const phoneEl = document.getElementById('add-phone');
    if (idEl) idEl.value = '';
    if (nameEl) nameEl.value = '';
    if (cccdEl) cccdEl.value = '';
    if (phoneEl) phoneEl.value = '';
  }

  const addCloseBtn = document.getElementById('add-close-btn');
  if (addCloseBtn) addCloseBtn.addEventListener('click', resetAddFormAndClose);

  const addCancelBtn = document.getElementById('add-cancel-btn');
  if (addCancelBtn) addCancelBtn.addEventListener('click', resetAddFormAndClose);

  const addSaveBtn = document.getElementById('add-save-btn');
  if (addSaveBtn) {
    addSaveBtn.addEventListener('click', async () => {
      const id = (document.getElementById('add-id')?.value || '').trim();
      const name = (document.getElementById('add-name')?.value || '').trim();
      const cccd = (document.getElementById('add-cccd')?.value || '').trim();
      const phone = (document.getElementById('add-phone')?.value || '').trim();

      if (!id || !name || !cccd || !phone) {
        alert('Vui lòng điền đầy đủ thông tin');
        return;
      }

      try {
        await HotelService.createCustomer({ customerId: id, fullName: name, idCard: cccd, phoneNumber: phone });
        resetAddFormAndClose();
        await loadCustomers();

        // Ensure the newly added customer shows at the end of the list.
        // (Some backends return newest-first; we want newest-last for display.)
        const searchQuery = (document.getElementById('search-input')?.value || '').trim();
        if (!searchQuery) {
          const idx = allCustomers.findIndex(c => String(c.customerId ?? '') === id);
          if (idx >= 0) {
            const [created] = allCustomers.splice(idx, 1);
            allCustomers.push(created);
            filteredCustomers = [];
            renderTable(allCustomers);
          }
        }

        showNotification(`Đã thêm khách hàng ${name}`);
      } catch (err) {
        alert('Lỗi: ' + (err.message || err));
      }
    });
  }

  // Delete customer modal
  const deleteCustomerBtn = document.getElementById('delete-customer-btn');
  const deleteModal = document.getElementById('delete-modal');
  if (deleteCustomerBtn && deleteModal) {
    deleteCustomerBtn.addEventListener('click', () => {
      deleteModal.classList.remove('hidden');
    });
  }

  function resetDeleteFormAndClose() {
    if (deleteModal) deleteModal.classList.add('hidden');
    const idEl = document.getElementById('delete-id');
    if (idEl) idEl.value = '';
  }

  const deleteCloseBtn = document.getElementById('delete-close-btn');
  if (deleteCloseBtn) deleteCloseBtn.addEventListener('click', resetDeleteFormAndClose);

  const deleteCancelBtn = document.getElementById('delete-cancel-btn');
  if (deleteCancelBtn) deleteCancelBtn.addEventListener('click', resetDeleteFormAndClose);

  const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
  if (deleteConfirmBtn) {
    deleteConfirmBtn.addEventListener('click', async () => {
      const id = (document.getElementById('delete-id')?.value || '').trim();
      if (!id) {
        alert('Vui lòng nhập mã khách hàng');
        return;
      }

      try {
        await HotelService.deleteCustomer(id);
        resetDeleteFormAndClose();
        await loadCustomers();
        showNotification(`Đã xóa khách hàng ${id}`);
      } catch (err) {
        alert('Lỗi: ' + (err.message || err));
      }
    });
  }

  // Initial load
  loadCustomers();

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
      setTimeout(() => initSidebar('customer'), 100);
    });
});
