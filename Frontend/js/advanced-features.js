import { HotelService } from './api.js?v=20260105';

const findCombinationBtn = document.getElementById('findCombinationBtn');
const resultBody = document.getElementById('resultBody');
const resultTable = document.getElementById('resultTable');
const emptyState = document.getElementById('emptyState');
const totalPriceEl = document.getElementById('totalPrice');
const executionTimeEl = document.getElementById('executionTime');
const clearBtn = document.getElementById('clearBtn');
const printBtn = document.getElementById('printBtn');
const copyBtn = document.getElementById('copyBtn');
const alertBanner = document.getElementById('alertBanner');
const alertTitle = document.getElementById('alertTitle');
const alertMessage = document.getElementById('alertMessage');
let alertTimeout = null;

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')} VNĐ`;
}

function showAlert(type, title, message) {
  if (!alertBanner) return;
  if (alertTimeout) {
    clearTimeout(alertTimeout);
    alertTimeout = null;
  }
  const isError = type === 'error';
  alertBanner.classList.remove('hidden');
  alertBanner.className = `w-full bg-emerald-100 dark:bg-emerald-900/30 border rounded-lg flex justify-center items-center h-[40px] px-4 shadow-sm flex-shrink-0 ${isError ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'}`;
  if (alertTitle) alertTitle.textContent = title || (isError ? 'Lỗi' : 'Thành công');
  if (alertMessage) alertMessage.textContent = message || '';
  alertTimeout = setTimeout(() => alertBanner.classList.add('hidden'), 3000);
}

function setExecutionTime(ms) {
  if (executionTimeEl) executionTimeEl.textContent = `${(ms || 0).toFixed(1)} ms`;
}

function clearResults() {
  if (resultBody) resultBody.innerHTML = '';
  if (resultTable) resultTable.classList.add('hidden');
  if (emptyState) emptyState.classList.remove('hidden');
  if (totalPriceEl) totalPriceEl.textContent = '--';
  setExecutionTime(0);
}

function renderResults(rooms, total) {
  if (!resultBody || !resultTable || !emptyState) return;
  resultBody.innerHTML = '';
  if (!rooms || rooms.length === 0) {
    resultTable.classList.add('hidden');
    emptyState.classList.remove('hidden');
    if (totalPriceEl) totalPriceEl.textContent = '--';
    return;
  }
  emptyState.classList.add('hidden');
  resultTable.classList.remove('hidden');
  rooms.forEach((room) => {
    const row = document.createElement('tr');
    row.className = 'hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors';
    row.innerHTML = `
      <td class="p-4 text-slate-900 dark:text-white font-semibold">${room.roomId || '--'}</td>
      <td class="p-4">
        <span class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${room.roomType === 'VIP' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : room.roomType === 'Deluxe' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'}">${room.roomType || 'N/A'}</span>
      </td>
      <td class="p-4 text-right font-mono">${formatCurrency(room.pricePerDay || 0)}</td>
    `;
    resultBody.appendChild(row);
  });
  if (totalPriceEl) totalPriceEl.textContent = formatCurrency(total || rooms.reduce((s, r) => s + (r.pricePerDay || 0), 0));
}

function createOverlay(html) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4';
  overlay.innerHTML = html;
  return overlay;
}

function bindDialog(overlay) {
  const closeBtn = overlay.querySelector('#dialogClose');
  const cancelBtn = overlay.querySelector('#dialogCancel');
  const submitBtn = overlay.querySelector('#dialogSubmit');
  const typeInput = overlay.querySelector('#typeCount');
  const decBtn = overlay.querySelector('#typeCountDec');
  const incBtn = overlay.querySelector('#typeCountInc');
  const rows = [1, 2, 3].map((i) => overlay.querySelector(`[data-row="${i}"]`));
  const qtyButtons = overlay.querySelectorAll('[data-qty]');

  const clampType = () => {
    const val = Math.min(3, Math.max(1, Number(typeInput.value) || 1));
    typeInput.value = val;
    rows.forEach((row, idx) => {
      if (!row) return;
      if (idx < val) row.classList.remove('hidden'); else row.classList.add('hidden');
    });
  };

  const adjustQty = (id, delta) => {
    const input = overlay.querySelector(`#${id}`);
    if (!input) return;
    const next = Math.max(1, Number(input.value) + delta);
    input.value = next;
  };

  clampType();
  decBtn?.addEventListener('click', () => { typeInput.value = Number(typeInput.value || 1) - 1; clampType(); });
  incBtn?.addEventListener('click', () => { typeInput.value = Number(typeInput.value || 1) + 1; clampType(); });
  typeInput?.addEventListener('input', clampType);
  qtyButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const { qty, action } = btn.dataset;
      adjustQty(qty, action === 'inc' ? 1 : -1);
    });
  });

  const getRequests = () => {
    const count = Number(typeInput.value) || 1;
    const requests = [];
    for (let i = 1; i <= count; i++) {
      const typeSel = overlay.querySelector(`#roomType${i}`);
      const qtyInput = overlay.querySelector(`#roomQty${i}`);
      const roomType = typeSel?.value || '';
      const qty = Number(qtyInput?.value) || 0;
      if (!roomType || qty <= 0) {
        return null;
      }
      requests.push({ type: roomType, count: qty });
    }
    return requests;
  };

  const close = () => overlay.remove();
  closeBtn?.addEventListener('click', close);
  cancelBtn?.addEventListener('click', close);

  submitBtn?.addEventListener('click', async () => {
    const requests = getRequests();
    if (!requests) {
      showAlert('error', 'Thiếu dữ liệu', 'Vui lòng chọn loại phòng và số lượng hợp lệ.');
      return;
    }
    try {
      const start = performance.now();
      const res = await HotelService.findRoomCombination({ requests });
      const elapsed = performance.now() - start;
      setExecutionTime(elapsed);
      renderResults(res.rooms || [], res.totalAmount || 0);
      showAlert('success', 'Đã tìm thấy tổ hợp', `Tìm thấy ${res.rooms ? res.rooms.length : 0} phòng phù hợp.`);
      close();
    } catch (err) {
      showAlert('error', 'Không tìm được tổ hợp', err.message || String(err));
    }
  });
}

async function openDialog() {
  try {
    const html = await fetch('FindCombinationDialog.html').then((r) => r.text());
    const overlay = createOverlay(html);
    document.body.appendChild(overlay);
    bindDialog(overlay);
  } catch (err) {
    showAlert('error', 'Không mở được hộp thoại', err.message || String(err));
  }
}

if (findCombinationBtn) findCombinationBtn.addEventListener('click', openDialog);
if (clearBtn) clearBtn.addEventListener('click', () => {
  clearResults();
  showAlert('success', 'Đã xóa kết quả', 'Bạn có thể tìm tổ hợp mới.');
});
if (printBtn) printBtn.addEventListener('click', () => showAlert('error', 'Chưa hỗ trợ', 'Chức năng in đang phát triển.'));
if (copyBtn) copyBtn.addEventListener('click', () => showAlert('error', 'Chưa hỗ trợ', 'Chức năng sao chép đang phát triển.'));

// Load sidebar
fetch('sidebar.html')
  .then((r) => r.text())
  .then((html) => {
    const container = document.getElementById('sidebar-container');
    if (!container) return;
    container.innerHTML = html;
    const scripts = container.querySelectorAll('script');
    scripts.forEach((script) => {
      const s = document.createElement('script');
      s.textContent = script.textContent;
      document.body.appendChild(s);
    });
    if (typeof initSidebar === 'function') {
      setTimeout(() => initSidebar('advanced'), 50);
    }
  })
  .catch((err) => console.error('[Advanced] Sidebar load error', err));

// Initial state
clearResults();
console.log('[Advanced] Advanced features page ready');
