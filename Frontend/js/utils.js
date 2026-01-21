// Utility functions

export function formatPrice(value) {
    if (!value && value !== 0) return '0 đ';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value).replace('₫', 'đ');
}

export function formatDate(date) {
    if (!date) return '--';
    if (typeof date === 'number') {
        return date.toString();
    }
    if (typeof date === 'string') {
        return date;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

export function parseDate(day, month, year) {
    return new Date(year, month - 1, day);
}

export function calculateDays(checkInDate, checkOutDate) {
    const diffTime = checkOutDate - checkInDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
}

export function generateInvoiceId(invoices) {
    if (!invoices || invoices.length === 0) return 'INV1';
    const lastId = Math.max(...invoices.map(inv => {
        const match = inv.invoiceId.match(/INV(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }));
    return `INV${lastId + 1}`;
}

export function getCurrentDateTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

export function showAlert(message, type = 'info') {
    const alertDiv = document.getElementById('alertMessage');
    if (!alertDiv) return;
    alertDiv.textContent = message;
    alertDiv.classList.remove('hidden');
    setTimeout(() => alertDiv.classList.add('hidden'), 3000);
}
