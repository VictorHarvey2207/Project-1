import { State } from './state.js';

export function createSpinner() {
  const d = document.createElement('div');
  d.className = 'flex items-center justify-center py-6';
  d.innerHTML = `
    <svg class="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
    </svg>`;
  return d;
}

export function showLoading(container) {
  if (!container) return;
  container.innerHTML = '';
  container.appendChild(createSpinner());
}

export function showError(container, message) {
  if (!container) return;
  container.innerHTML = '';
  const d = document.createElement('div');
  d.className = 'p-4 text-sm text-red-600';
  d.textContent = message || 'Lỗi khi kết nối đến máy chủ';
  container.appendChild(d);
}

export function renderTable(container, columns, data) {
  container.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'w-full text-left border-collapse';
  const thead = document.createElement('thead');
  const thr = document.createElement('tr');
  columns.forEach(col => {
    const th = document.createElement('th');
    th.className = 'px-4 py-2 text-xs font-semibold text-[#637588] uppercase';
    th.textContent = col;
    thr.appendChild(th);
  });
  thead.appendChild(thr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  (data || []).forEach(item => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50 dark:hover:bg-[#253340]';
    columns.forEach(col => {
      const td = document.createElement('td');
      td.className = 'px-4 py-3 text-sm';
      const key = col in item ? col : col.toLowerCase();
      td.textContent = item[key] ?? '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

export default { createSpinner, showLoading, showError, renderTable };
