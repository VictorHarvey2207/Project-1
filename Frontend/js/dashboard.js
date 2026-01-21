import { HotelService } from './api.js?v=20260113';

const TARGET_MONTH = 1; // Tháng 12 theo yêu cầu dashboard

function normalizeList(data) {
  return Array.isArray(data) ? data : (data && data.data) || [];
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function pad2(n) {
  return String(n ?? '').padStart(2, '0');
}

function fixNavLinks() {
  const map = {
    'tổng quan': 'Dashboard.html',
    'phòng': 'RoomManagementWidget.html',
    'quản lý phòng': 'RoomManagementWidget.html',
    'khách hàng': 'CustomerManagementWidget.html',
    'quản lý khách hàng': 'CustomerManagementWidget.html',
    'đặt phòng': 'ReservationManagementWidget.html',
    'đặt/nhận phòng': 'ReservationManagementWidget.html',
    'đặt/n nhận phòng': 'ReservationManagementWidget.html',
    'trả phòng': 'Checkout.html',
    'dịch vụ': 'ServiceManagementWidget.html',
    'quản lý dịch vụ': 'ServiceManagementWidget.html',
    'hóa đơn': 'InvoiceManagementWidget.html',
    'hóa đơn & dịch vụ': 'InvoiceManagementWidget.html',
    'báo cáo': 'Analyst.html',
    'thống kê': 'Analyst.html',
    'nâng cao': 'AdvanceFeatures.html',
  };

  document.querySelectorAll('a').forEach(a => {
    const txt = (a.textContent || '').trim().toLowerCase();
    if (map[txt]) a.setAttribute('href', map[txt]);
  });
}

function renderRoomMap(rooms) {
  const container = document.getElementById('room-map');
  if (!container) return;
  container.innerHTML = '';

  const first10 = (rooms || []).slice(0, 10);
  first10.forEach(r => {
    const id = r.roomId || '';
    const type = r.roomType || '';
    const isVip = String(type).toLowerCase().includes('vip');
    const occupied = r.isAvailable === false;

    const box = document.createElement('div');
    if (isVip) {
      box.className = 'flex flex-col items-center justify-center w-24 h-24 bg-purple-50 dark:bg-purple-900/10 border-2 border-purple-500 rounded-xl cursor-pointer hover:shadow-lg transition-all relative group';
      box.innerHTML = `
        <span class="text-lg font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px] text-yellow-500 filled">star</span>${id}
        </span>
        <span class="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 mt-1">VIP</span>
        <div class="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-purple-500"></div>
      `;
    } else if (occupied) {
      box.className = 'flex flex-col items-center justify-center w-24 h-24 bg-red-50 dark:bg-red-900/10 border-2 border-red-500 rounded-xl cursor-pointer hover:shadow-lg transition-all relative group';
      box.innerHTML = `
        <span class="text-lg font-bold text-red-700 dark:text-red-400">${id}</span>
        <span class="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 mt-1">Có khách</span>
        <div class="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500"></div>
      `;
    } else {
      box.className = 'flex flex-col items-center justify-center w-24 h-24 bg-white dark:bg-[#202e3b] border border-slate-200 dark:border-slate-600 rounded-xl cursor-pointer hover:border-primary hover:shadow-lg transition-all group';
      box.innerHTML = `
        <span class="text-lg font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary">${id}</span>
        <span class="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 mt-1">Trống</span>
      `;
    }
    container.appendChild(box);
  });
}

function renderActivities(events, customerMap) {
  const container = document.getElementById('recent-activities');
  if (!container) return;
  container.innerHTML = '';

  if (!events.length) {
    const empty = document.createElement('div');
    empty.className = 'p-4 text-sm text-slate-500';
    empty.textContent = 'Chưa có hoạt động';
    container.appendChild(empty);
    return;
  }

  const iconByType = {
    booking: { icon: 'event_available', bg: 'bg-emerald-100 text-emerald-600', border: 'border-slate-50 dark:border-slate-700/50', label: 'đặt phòng' },
    checkin: { icon: 'login', bg: 'bg-purple-100 text-purple-600', border: 'border-slate-50 dark:border-slate-700/50', label: 'nhận phòng' },
    checkout: { icon: 'meeting_room', bg: 'bg-blue-100 text-blue-600', border: 'border-slate-50 dark:border-slate-700/50', label: 'trả phòng' },
  };

  events.forEach(ev => {
    const info = iconByType[ev.type] || iconByType.booking;
    const row = document.createElement('div');
    row.className = `flex items-start gap-3 p-4 border-b ${info.border} hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors`;
    const customerName = customerMap.get(ev.customerId) || `Khách ${ev.customerId || ''}`;
    row.innerHTML = `
      <div class="w-8 h-8 rounded-full ${info.bg} flex items-center justify-center shrink-0 mt-0.5">
        <span class="material-symbols-outlined text-[16px]">${info.icon}</span>
      </div>
      <div>
        <p class="text-sm font-medium text-slate-800 dark:text-white">${customerName} ${info.label}</p>
        <p class="text-xs text-slate-500">Phòng ${ev.roomId || ''} • ${pad2(ev.day)}/${pad2(ev.month)}/${ev.year || ''}</p>
      </div>
    `;
    container.appendChild(row);
  });
}

function renderTypeBreakdown(rooms) {
  const container = document.getElementById('room-type-summary');
  if (!container) return;
  container.innerHTML = '';

  const byType = new Map();
  (rooms || []).forEach(r => {
    const type = r.roomType || 'Khác';
    const entry = byType.get(type) || { total: 0, occupied: 0 };
    entry.total += 1;
    if (r.isAvailable === false) entry.occupied += 1;
    byType.set(type, entry);
  });

  const types = Array.from(byType.entries());
  if (!types.length) {
    container.innerHTML = '<div class="p-4 text-sm text-slate-500">Chưa có dữ liệu phòng</div>';
    return;
  }

  const typeColor = (type) => {
    const t = String(type || '').toLowerCase();
    if (t.includes('vip')) return { bar: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700', label: 'VIP' };
    if (t.includes('deluxe')) return { bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700', label: 'Deluxe' };
    if (t.includes('standard')) return { bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', label: 'Standard' };
    return { bar: 'bg-slate-500', badge: 'bg-slate-100 text-slate-700', label: type };
  };

  types.forEach(([type, stat]) => {
    const total = stat.total || 0;
    const occupied = stat.occupied || 0;
    const available = Math.max(0, total - occupied);
    const percent = total ? ((occupied / total) * 100).toFixed(0) : '0';
    const { bar: barColor, badge, label } = typeColor(type);

    const wrapper = document.createElement('div');
    wrapper.className = 'group';
    wrapper.innerHTML = `
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badge}">
            ${label}${label === 'VIP' ? ' <span class="material-symbols-outlined text-[14px] text-amber-500 filled">star</span>' : ''}
          </span>
          <span class="text-xs text-slate-400">${label}</span>
        </div>
        <div class="text-right">
          <span class="text-sm font-bold text-slate-800 dark:text-white">${occupied}</span>
          <span class="text-xs text-slate-400">/ ${total} đang thuê</span>
        </div>
      </div>
      <div class="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div class="h-full ${barColor} rounded-full group-hover:brightness-110 transition-colors" style="width: ${percent}%"></div>
      </div>
      <div class="flex justify-between mt-1 text-[11px] text-slate-400">
        <span>Còn trống: ${available}</span>
        <span>${percent}%</span>
      </div>
    `;
    container.appendChild(wrapper);
  });
}

export async function renderDashboard() {
  const path = (window.location.pathname || '').toLowerCase();
  const hasStats = !!document.getElementById('stat-occupied');
  if (!(hasStats || path.endsWith('dashboard.html') || path === '/')) return;

  try {
    const [roomsRaw, reservationsRaw, invoicesRaw, customersRaw] = await Promise.all([
      HotelService.getRooms(),
      HotelService.getReservations(),
      HotelService.getInvoices(),
      HotelService.getCustomers(),
    ]);

    const rooms = normalizeList(roomsRaw);
    const reservations = normalizeList(reservationsRaw);
    const invoices = normalizeList(invoicesRaw);
    const customers = normalizeList(customersRaw);
    const customerMap = new Map(customers.map(c => [c.customerId || c.id, c.fullName || c.name || c.customerName || `Khách ${c.customerId || c.id || ''}`]));

    // Phòng đang thuê
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter(r => r.isAvailable === false).length;
    const occupiedPercent = totalRooms ? (occupiedRooms / totalRooms) * 100 : 0;
    const occupiedEl = document.getElementById('stat-occupied');
    const totalEl = document.getElementById('stat-total');
    const barEl = document.getElementById('stat-occupied-bar');
    const percentEl = document.getElementById('stat-occupied-percent');
    if (occupiedEl) occupiedEl.textContent = formatNumber(occupiedRooms);
    if (totalEl) totalEl.textContent = formatNumber(totalRooms);
    if (barEl) barEl.style.width = `${occupiedPercent.toFixed(1)}%`;
    if (percentEl) percentEl.textContent = `${occupiedPercent.toFixed(1)}%`;

    // Doanh thu tháng 12 (năm hiện tại)
    const currentYear = new Date().getFullYear();
    const decRevenue = invoices
      .filter(inv => Number(inv.checkOutMonth) === TARGET_MONTH && Number(inv.checkOutYear) === currentYear)
      .reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
    const revenueEl = document.getElementById('stat-revenue');
    const revenueNoteEl = document.getElementById('stat-revenue-note');
    if (revenueEl) revenueEl.textContent = formatCurrency(decRevenue);
    if (revenueNoteEl) revenueNoteEl.textContent = `Tổng doanh thu tháng 1/${currentYear}`;

    // Tổng khách hàng check-in tháng 12 (unique customerId)
    const decCheckins = reservations.filter(r => Number(r.checkInMonth) === TARGET_MONTH && Number(r.checkInYear) === currentYear);
    const uniqueCustomerCount = new Set(decCheckins.map(r => r.customerId)).size;
    const customersEl = document.getElementById('stat-customers');
    const customersNoteEl = document.getElementById('stat-customers-note');
    if (customersEl) customersEl.textContent = formatNumber(uniqueCustomerCount);
    if (customersNoteEl) customersNoteEl.textContent = `Check-in tháng 1/${currentYear}`;

    // Hoạt động gần đây (đặt phòng + nhận phòng + trả phòng)
    const events = [];
    reservations.forEach(r => {
      // Đặt phòng (pending)
      if (r.status === 'pending') {
        events.push({
          type: 'booking',
          day: r.checkInDay,
          month: r.checkInMonth,
          year: (r.checkInYear ?? currentYear) - 1,
          customerId: r.customerId,
          roomId: r.roomId,
        });
      }

      // Nhận phòng (checkedIn)
      if (r.status === 'checkedIn') {
        events.push({
          type: 'checkin',
          day: r.checkInDay,
          month: r.checkInMonth,
          year: (r.checkInYear ?? currentYear) - 1,
          customerId: r.customerId,
          roomId: r.roomId,
        });
      }
    });

    invoices.forEach(inv => {
      events.push({
        type: 'checkout',
        day: inv.checkOutDay,
        month: inv.checkOutMonth,
        year: (inv.checkOutYear ?? currentYear) - 1,
        customerId: inv.customerId,
        roomId: inv.roomId,
      });
    });

    const sortKey = (e) => {
      const y = Number(e.year || currentYear);
      const m = Number(e.month || 1);
      const d = Number(e.day || 1);
      return y * 10000 + m * 100 + d;
    };

    events.sort((a, b) => sortKey(b) - sortKey(a));
    const top = events.slice(0, 5);
    renderActivities(top, customerMap);

    // Render room map and breakdown
    renderRoomMap(rooms);
    renderTypeBreakdown(rooms);
  } catch (err) {
    console.error(err);
    const map = document.getElementById('room-map');
    if (map) map.innerHTML = `<div class="p-4 text-sm text-red-600">${err.message || err}</div>`;
    const act = document.getElementById('recent-activities');
    if (act) act.innerHTML = `<div class="p-4 text-sm text-red-600">${err.message || err}</div>`;
  }
}

export function wireDashboardButtons() {
  // Map button title/text to pages
  const btnMap = {
    'thêm phòng mới': 'RoomManagementWidget.html',
    'thêm khách hàng': 'CustomerManagementWidget.html',
    'đặt phòng mới': 'ReservationManagementWidget.html',
    'đăng xuất': null,
    'làm mới dữ liệu': null,
  };

  // Buttons with a title attribute
  document.querySelectorAll('button[title]').forEach(btn => {
    const t = (btn.getAttribute('title') || '').trim().toLowerCase();
    if (btnMap[t]) {
      btn.addEventListener('click', () => { window.location.href = btnMap[t]; });
    }
  });

  // Also map primary action buttons by visible text (in Dashboard header/toolbars)
  document.querySelectorAll('button').forEach(btn => {
    const txt = (btn.textContent || '').trim().toLowerCase();
    if (btnMap[txt]) {
      btn.addEventListener('click', () => { window.location.href = btnMap[txt]; });
    }
  });
}

export function initDashboard() {
  fixNavLinks();
  wireDashboardButtons();
  renderDashboard().catch(err => console.error('renderDashboard failed:', err));

  return {
    getCustomers: () => HotelService.getCustomers(),
    getRooms: () => HotelService.getRooms(),
    getReservations: () => HotelService.getReservations(),
  };
}

function maybeAutoInitDashboard() {
  // Only auto-bootstrap on pages that actually contain dashboard widgets.
  const hasDashboardRoot =
    document.getElementById('room-map') ||
    document.getElementById('recent-activities') ||
    document.getElementById('kpi-cards');

  if (!hasDashboardRoot) return;
  if (window.__DashboardBootstrapped) return;
  window.__DashboardBootstrapped = true;

  window.__HotelAPI = initDashboard();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeAutoInitDashboard);
  } else {
    maybeAutoInitDashboard();
  }
}
