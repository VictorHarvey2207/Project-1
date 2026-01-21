import { HotelService } from './api.js?v=20260113_2';

// DOM elements
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const refreshBtn = document.getElementById('refreshBtn');
const sortAscBtn = document.getElementById('sortAscBtn');
const sortDescBtn = document.getElementById('sortDescBtn');
const alertBanner = document.getElementById('alertBanner');
const alertTitle = document.getElementById('alertTitle');
const alertMessage = document.getElementById('alertMessage');
const alertClose = document.getElementById('alertClose');
const invoiceTableBody = document.getElementById('invoiceTableBody');
const executionTimeEl = document.getElementById('executionTime');
const deleteInvoiceBtn = document.getElementById('delete-invoice-btn');
const deleteInvoiceModal = document.getElementById('delete-invoice-modal');

let invoices = [];
let filteredInvoices = [];
let alertTimeout = null;

// Format currency
function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')}`;
}

// Format date
function formatDate(day, month, year) {
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

// Show alert
function showAlert(type, title, message) {
  if (!alertBanner) return;
  
  if (alertTimeout) {
    clearTimeout(alertTimeout);
    alertTimeout = null;
  }
  
  alertBanner.classList.remove('hidden');
  const isError = type === 'error';
  alertBanner.className = `shrink-0 flex items-center justify-center gap-2 px-4 py-2 border rounded-lg transition-all ${isError ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800' : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800'}`;
  
  if (alertTitle) alertTitle.textContent = title || (isError ? 'Lỗi:' : 'Thành công:');
  if (alertMessage) alertMessage.textContent = message || '';
  
  alertTimeout = setTimeout(() => {
    hideAlert();
  }, 3000);
}

function hideAlert() {
  if (!alertBanner) return;
  alertBanner.classList.add('hidden');
}

// Set execution time
function setExecutionTime(ms) {
  if (executionTimeEl) executionTimeEl.textContent = `${(ms || 0).toFixed(1)}`;
}

// Render invoices table
function renderInvoices(list) {
  if (!invoiceTableBody) return;
  
  invoiceTableBody.innerHTML = '';
  
  if (!list.length) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="8" class="px-6 py-12 text-center text-slate-400">
        <span class="material-symbols-outlined text-4xl mb-2">receipt_long</span>
        <p>Không tìm thấy hóa đơn nào</p>
      </td>
    `;
    invoiceTableBody.appendChild(emptyRow);
    return;
  }
  
  list.forEach(invoice => {
    const row = document.createElement('tr');
    row.className = 'bg-white dark:bg-surface-dark hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors';
    
    const checkInDate = formatDate(invoice.checkInDay, invoice.checkInMonth, invoice.checkInYear);
    const checkOutDate = formatDate(invoice.checkOutDay, invoice.checkOutMonth, invoice.checkOutYear);
    
    row.innerHTML = `
      <td class="px-6 py-4">
        <span class="bg-slate-100 text-slate-800 text-xs font-semibold px-2.5 py-1 rounded dark:bg-slate-700 dark:text-slate-300">${invoice.invoiceId || ''}</span>
      </td>
      <td class="px-6 py-4 text-slate-500 dark:text-slate-400">${invoice.customerId || ''}</td>
      <td class="px-6 py-4 text-slate-500 dark:text-slate-400">${invoice.roomId || ''}</td>
      <td class="px-6 py-4 text-slate-500 dark:text-slate-400">${checkInDate}</td>
      <td class="px-6 py-4 text-slate-500 dark:text-slate-400">${checkOutDate}</td>
      <td class="px-6 py-4 text-right font-medium">${formatCurrency(invoice.roomCharge)}</td>
      <td class="px-6 py-4 text-right font-medium text-slate-500">${formatCurrency(invoice.serviceCharge)}</td>
      <td class="px-6 py-4 text-right font-bold text-primary text-base">${formatCurrency(invoice.totalAmount)}</td>
    `;
    
    invoiceTableBody.appendChild(row);
  });
}

// Delete invoice modal (similar to delete customer/reservation)
function resetDeleteInvoiceFormAndClose() {
  if (deleteInvoiceModal) deleteInvoiceModal.classList.add('hidden');
  const idEl = document.getElementById('delete-invoice-id');
  if (idEl) idEl.value = '';
}

if (deleteInvoiceBtn && deleteInvoiceModal) {
  deleteInvoiceBtn.addEventListener('click', () => {
    deleteInvoiceModal.classList.remove('hidden');
    const input = document.getElementById('delete-invoice-id');
    if (input) input.focus();
  });
}

const deleteInvoiceCloseBtn = document.getElementById('delete-invoice-close-btn');
if (deleteInvoiceCloseBtn) deleteInvoiceCloseBtn.addEventListener('click', resetDeleteInvoiceFormAndClose);

const deleteInvoiceCancelBtn = document.getElementById('delete-invoice-cancel-btn');
if (deleteInvoiceCancelBtn) deleteInvoiceCancelBtn.addEventListener('click', resetDeleteInvoiceFormAndClose);

const deleteInvoiceConfirmBtn = document.getElementById('delete-invoice-confirm-btn');
if (deleteInvoiceConfirmBtn) {
  deleteInvoiceConfirmBtn.addEventListener('click', async () => {
    const id = (document.getElementById('delete-invoice-id')?.value || '').trim();
    if (!id) {
      showAlert('error', 'Thiếu dữ liệu', 'Vui lòng nhập mã hóa đơn');
      return;
    }

    const ok = confirm(`Xóa hóa đơn ${id}?`);
    if (!ok) return;

    try {
      await HotelService.deleteInvoice(id);
      resetDeleteInvoiceFormAndClose();
      await loadInvoices();
      showAlert('success', 'Đã xóa hóa đơn', `Đã xóa ${id}.`);
    } catch (err) {
      showAlert('error', 'Không xóa được hóa đơn', err.message || String(err));
    }
  });
}

// Load invoices
async function loadInvoices() {
  try {
    const start = performance.now();
    const data = await HotelService.getInvoices();
    const elapsed = performance.now() - start;
    
    setExecutionTime(elapsed);
    invoices = Array.isArray(data) ? data : [];
    filteredInvoices = invoices.slice();
    renderInvoices(filteredInvoices);
  } catch (err) {
    showAlert('error', 'Không tải được dữ liệu', err.message || String(err));
  }
}

// Search invoices
function searchInvoices(keyword) {
  if (!keyword) {
    filteredInvoices = invoices.slice();
  } else {
    const k = keyword.toLowerCase();
    filteredInvoices = invoices.filter(inv =>
      (inv.invoiceId || '').toLowerCase().includes(k)
    );
  }
  renderInvoices(filteredInvoices);
  showAlert('success', 'Tìm kiếm hoàn tất', `Tìm thấy ${filteredInvoices.length} hóa đơn.`);
}

// Sort invoices
function sortInvoices(ascending = true) {
  filteredInvoices.sort((a, b) => {
    const amountA = a.totalAmount || 0;
    const amountB = b.totalAmount || 0;
    return ascending ? amountA - amountB : amountB - amountA;
  });
  renderInvoices(filteredInvoices);
  showAlert('success', 'Đã sắp xếp', `Sắp xếp ${ascending ? 'tăng dần' : 'giảm dần'} theo tổng tiền.`);
}

// Event listeners
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchInvoices(e.target.value.trim());
  });
}

if (clearSearchBtn) {
  clearSearchBtn.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    searchInvoices('');
  });
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', loadInvoices);
}

if (sortAscBtn) {
  sortAscBtn.addEventListener('click', () => sortInvoices(true));
}

if (sortDescBtn) {
  sortDescBtn.addEventListener('click', () => sortInvoices(false));
}

if (alertClose) {
  alertClose.addEventListener('click', hideAlert);
}

// Load sidebar
fetch('sidebar.html')
  .then(r => r.text())
  .then(html => {
    const container = document.getElementById('sidebar-container');
    if (!container) {
      console.error('[InvoiceMgmt] Sidebar container not found');
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
      console.log('[InvoiceMgmt] Initializing sidebar with page=invoice');
      setTimeout(() => initSidebar('invoice'), 50);
    } else {
      console.warn('[InvoiceMgmt] initSidebar function not found');
    }
  })
  .catch((err) => {
    console.error('[InvoiceMgmt] Error loading sidebar:', err);
  });

// Initial load
console.log('[InvoiceMgmt] Invoice management page loaded');
loadInvoices();
