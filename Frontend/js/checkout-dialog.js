// CheckOut Dialog Module
import { formatPrice, formatDate, calculateDays, showAlert } from './utils.js';

const API_BASE = 'http://localhost:3001/api';

let currentReservation = null;
let currentRoom = null;
let currentCustomer = null;
let modal = null;

// Create modal HTML
function createModalHTML() {
    const div = document.createElement('div');
    div.id = 'checkoutModalOverlay';
    div.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(51, 65, 85, 0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 50;">
            <div style="background: white; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto; margin: 1rem; display: flex; flex-direction: column;">
                <!-- Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding: 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; background-color: #eff6ff; color: #2563eb;">
                            <span class="material-symbols-outlined" style="font-size: 20px; font-variation-settings: 'FILL' 1;">receipt_long</span>
                        </div>
                        <h3 style="font-size: 18px; font-weight: 700; color: #111827;">CHI TIẾT HÓA ĐƠN</h3>
                    </div>
                    <button id="closeModalBtn" style="width: 32px; height: 32px; border-radius: 50%; background-color: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #9ca3af;">
                        <span class="material-symbols-outlined" style="font-size: 20px;">close</span>
                    </button>
                </div>

                <!-- Body -->
                <div style="padding: 1.5rem; overflow-y: auto;">
                    <p style="font-size: 14px; color: #4b5563; margin-bottom: 1rem;">Kiểm tra thông tin trước khi xác nhận</p>

                    <!-- Customer Info -->
                    <div style="margin-bottom: 1.5rem; padding: 1rem; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
                        <h4 style="font-weight: 600; font-size: 14px; color: #1f2937; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">person</span>
                            KHÁCH HÀNG
                        </h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 13px;">
                            <div><div style="color: #6b7280; margin-bottom: 0.25rem; font-weight: 500;">Họ và tên</div><div id="customerName" style="color: #1f2937; font-weight: 600;">--</div></div>
                            <div><div style="color: #6b7280; margin-bottom: 0.25rem; font-weight: 500;">Mã khách hàng</div><div id="customerId" style="color: #1f2937; font-weight: 600;">--</div></div>
                            <div><div style="color: #6b7280; margin-bottom: 0.25rem; font-weight: 500;">Số điện thoại</div><div id="customerPhone" style="color: #1f2937; font-weight: 600;">--</div></div>
                            <div><div style="color: #6b7280; margin-bottom: 0.25rem; font-weight: 500;">CCCD/CMND</div><div id="customerIdCard" style="color: #1f2937; font-weight: 600;">--</div></div>
                        </div>
                    </div>

                    <!-- Room Info -->
                    <div style="margin-bottom: 1.5rem; padding: 1rem; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
                        <h4 style="font-weight: 600; font-size: 14px; color: #1f2937; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">meeting_room</span>
                            THÔNG TIN PHÒNG
                        </h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 13px;">
                            <div><div style="color: #6b7280; margin-bottom: 0.25rem; font-weight: 500;">Số phòng</div><div id="roomId" style="color: #1f2937; font-weight: 600;">--</div></div>
                            <div><div style="color: #6b7280; margin-bottom: 0.25rem; font-weight: 500;">Loại phòng</div><div id="roomType" style="color: #1f2937; font-weight: 600;">--</div></div>
                            <div colspan="2"><div style="color: #6b7280; margin-bottom: 0.25rem; font-weight: 500;">Đơn giá</div><div id="roomPrice" style="color: #1f2937; font-weight: 600;">--</div></div>
                        </div>
                    </div>

                    <!-- Stay Duration -->
                    <div style="margin-bottom: 1.5rem; padding: 1rem; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
                        <h4 style="font-weight: 600; font-size: 14px; color: #1f2937; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">event</span>
                            THỜI GIAN LƯU TRỮ
                        </h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 13px;">
                            <div><div style="color: #6b7280; margin-bottom: 0.25rem; font-weight: 500;">Ngày nhận</div><div id="checkInDate" style="color: #1f2937; font-weight: 600;">--</div></div>
                            <div><div style="color: #6b7280; margin-bottom: 0.25rem; font-weight: 500;">Ngày trả</div><div id="checkOutDate" style="color: #1f2937; font-weight: 600;">--</div></div>
                            <div><div style="color: #6b7280; margin-bottom: 0.25rem; font-weight: 500;">Số ngày ở</div><div id="stayDays" style="color: #1f2937; font-weight: 600;">--</div></div>
                        </div>
                    </div>

                    <!-- Room Charge -->
                    <div style="margin-bottom: 1.5rem; padding: 1rem; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
                        <h4 style="font-weight: 600; font-size: 14px; color: #1f2937; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">attach_money</span>
                            TIỀN PHÒNG
                        </h4>
                        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 1rem;">
                            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 0.5rem;">
                                <span id="roomChargeLabel">-- ngày x --</span>
                                <span id="roomChargeValue">--</span>
                            </div>
                        </div>
                    </div>

                    <!-- Services -->
                    <div id="servicesSection" style="margin-bottom: 1.5rem; padding: 1rem; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
                        <h4 style="font-weight: 600; font-size: 14px; color: #1f2937; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">room_service</span>
                            CHI TIẾT DỊCH VỤ
                            <span id="serviceCount" style="font-size: 12px; color: #6b7280; font-weight: 400; margin-left: auto;">0 dịch vụ</span>
                        </h4>
                        <table id="serviceTable" style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 0.5rem;">
                            <thead>
                                <tr style="background-color: #f3f4f6;">
                                    <th style="padding: 0.75rem; text-align: left; font-weight: 600; color: #6b7280; border-bottom: 1px solid #d1d5db;">TÊN DỊCH VỤ</th>
                                    <th style="padding: 0.75rem; text-align: left; font-weight: 600; color: #6b7280; border-bottom: 1px solid #d1d5db;">ĐƠN GIÁ</th>
                                    <th style="padding: 0.75rem; text-align: left; font-weight: 600; color: #6b7280; border-bottom: 1px solid #d1d5db;">SỐ LƯỢNG</th>
                                    <th style="padding: 0.75rem; text-align: right; font-weight: 600; color: #6b7280; border-bottom: 1px solid #d1d5db;">THÀNH TIỀN</th>
                                </tr>
                            </thead>
                            <tbody id="serviceBody"></tbody>
                        </table>
                        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 1rem; margin-top: 1rem;">
                            <div style="display: flex; justify-content: space-between; font-size: 13px;">
                                <span>Tổng tiền dịch vụ:</span>
                                <span id="serviceTotalValue">--</span>
                            </div>
                        </div>
                    </div>

                    <!-- Final Total -->
                    <div style="background-color: #f0f9ff; border: 2px solid #0284c7; border-radius: 8px; padding: 1rem; margin-top: 1rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 13px;">
                            <span>Tiền phòng:</span>
                            <span id="finalRoomCharge">--</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 13px;">
                            <span>Tiền dịch vụ:</span>
                            <span id="finalServiceCharge">--</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; border-top: 1px solid #0284c7; padding-top: 0.75rem; font-size: 16px; font-weight: 700; color: #1e40af;">
                            <span>TỔNG CỘNG</span>
                            <span id="totalAmount">--</span>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid #e5e7eb; padding: 1rem 1.5rem; background-color: #f9fafb;">
                    <button id="cancelBtn" style="height: 40px; padding: 0 24px; border-radius: 8px; border: 1px solid #d1d5db; background: white; color: #374151; font-weight: 500; font-size: 14px; cursor: pointer; transition: background-color 0.2s;">
                        Hủy
                    </button>
                    <button id="confirmCheckoutBtn" style="height: 40px; padding: 0 24px; border-radius: 8px; background: #2563eb; color: white; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#1d4ed8'" onmouseout="this.style.backgroundColor='#2563eb'">
                        <span class="material-symbols-outlined" style="font-size: 18px;">check_circle</span>
                        <span>Xác nhận trả phòng</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(div);
    return div;
}

// Initialize modal
function initModal() {
    if (!modal) {
        modal = createModalHTML();
    }
    return modal;
}

// Get modal overlay div
function getModalOverlay() {
    return document.querySelector('#checkoutModalOverlay > div');
}

// Open dialog
export async function openDialog(reservation) {
    currentReservation = reservation;
    
    // Initialize modal
    initModal();
    
    // Get DOM elements
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const confirmBtn = document.getElementById('confirmCheckoutBtn');
    
    try {
        // Load customer details
        const customerRes = await fetch(`${API_BASE}/customers/${reservation.customerId}`);
        currentCustomer = await customerRes.json();
        
        // Load room details
        const roomRes = await fetch(`${API_BASE}/rooms/${reservation.roomId}`);
        currentRoom = await roomRes.json();
        
        // Populate dialog
        populateDialog();
        
        // Show modal
        const overlay = getModalOverlay();
        if (overlay) overlay.parentElement.style.display = 'flex';
        
        // Setup event listeners
        closeBtn.addEventListener('click', closeDialog);
        cancelBtn.addEventListener('click', closeDialog);
        confirmBtn.addEventListener('click', () => handleConfirmCheckout(confirmBtn));
        
        overlay.parentElement.addEventListener('click', (e) => {
            if (e.target === overlay.parentElement) closeDialog();
        });
        
    } catch (error) {
        console.error('Error loading checkout details:', error);
        alert('Lỗi: Không thể tải thông tin chi tiết');
    }
}

// Populate dialog content
function populateDialog() {
    // Get DOM elements
    const customerName = document.getElementById('customerName');
    const customerId = document.getElementById('customerId');
    const customerPhone = document.getElementById('customerPhone');
    const customerIdCard = document.getElementById('customerIdCard');
    
    const roomId = document.getElementById('roomId');
    const roomType = document.getElementById('roomType');
    const roomPrice = document.getElementById('roomPrice');
    
    const checkInDate = document.getElementById('checkInDate');
    const checkOutDate = document.getElementById('checkOutDate');
    const stayDays = document.getElementById('stayDays');
    
    const roomChargeLabel = document.getElementById('roomChargeLabel');
    const roomChargeValue = document.getElementById('roomChargeValue');
    const finalRoomCharge = document.getElementById('finalRoomCharge');
    const finalServiceCharge = document.getElementById('finalServiceCharge');
    const totalAmount = document.getElementById('totalAmount');
    
    const servicesSection = document.getElementById('servicesSection');
    const serviceCount = document.getElementById('serviceCount');
    
    // Customer info
    customerName.textContent = currentCustomer?.fullName || '--';
    customerId.textContent = currentCustomer?.customerId || '--';
    customerPhone.textContent = currentCustomer?.phoneNumber || '--';
    customerIdCard.textContent = currentCustomer?.idCard || '--';
    
    // Room info
    roomId.textContent = currentRoom?.roomId || '--';
    roomType.textContent = currentRoom?.roomType || '--';
    roomPrice.textContent = formatPrice(currentRoom?.pricePerDay || 0);
    
    // Stay duration
    const checkin = new Date(currentReservation.checkInYear, currentReservation.checkInMonth - 1, currentReservation.checkInDay);
    const checkout = new Date(currentReservation.checkOutYear, currentReservation.checkOutMonth - 1, currentReservation.checkOutDay);
    const days = calculateDays(checkin, checkout);
    
    checkInDate.textContent = formatDate(checkin);
    checkOutDate.textContent = formatDate(checkout);
    stayDays.textContent = `${days} ngày`;
    
    // Room charge
    const roomCharge = (currentRoom?.pricePerDay || 0) * days;
    roomChargeLabel.textContent = `${days} ngày x ${formatPrice(currentRoom?.pricePerDay || 0)}`;
    roomChargeValue.textContent = formatPrice(roomCharge);
    finalRoomCharge.textContent = formatPrice(roomCharge);
    
    // Services
    if (currentRoom?.services && currentRoom.services.length > 0) {
        populateServices(currentRoom.services);
        servicesSection.style.display = 'block';
    } else {
        servicesSection.style.display = 'none';
    }
    
    // Calculate total
    const serviceCharge = calculateServiceCharge(currentRoom?.services || []);
    const total = roomCharge + serviceCharge;
    
    finalServiceCharge.textContent = formatPrice(serviceCharge);
    totalAmount.textContent = formatPrice(total);
}

// Populate services table
function populateServices(services) {
    const serviceBody = document.getElementById('serviceBody');
    const serviceCount = document.getElementById('serviceCount');
    const serviceTotalValue = document.getElementById('serviceTotalValue');
    
    serviceBody.innerHTML = '';
    let totalService = 0;
    
    services.forEach(service => {
        const amount = (service.price || 0) * (service.quantity || 1);
        totalService += amount;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="padding: 0.75rem; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${service.serviceName || '--'}</td>
            <td style="padding: 0.75rem; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${formatPrice(service.price || 0)}</td>
            <td style="padding: 0.75rem; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${service.quantity || 0}</td>
            <td style="padding: 0.75rem; border-bottom: 1px solid #e5e7eb; color: #1f2937; text-align: right;">${formatPrice(amount)}</td>
        `;
        serviceBody.appendChild(row);
    });
    
    serviceCount.textContent = `${services.length} dịch vụ`;
    serviceTotalValue.textContent = formatPrice(totalService);
}

// Calculate service charge
function calculateServiceCharge(services) {
    if (!services || services.length === 0) return 0;
    return services.reduce((sum, s) => sum + ((s.price || 0) * (s.quantity || 1)), 0);
}

// Close dialog
function closeDialog() {
    const overlay = getModalOverlay();
    if (overlay) overlay.parentElement.style.display = 'none';
    currentReservation = null;
    currentRoom = null;
    currentCustomer = null;
}

// Confirm checkout
async function handleConfirmCheckout(btnElement) {
    if (!currentReservation) return;
    
    try {
        btnElement.disabled = true;
        const originalText = btnElement.innerHTML;
        btnElement.innerHTML = '<span class="material-symbols-outlined animate-spin" style="font-size: 18px;">autorenew</span><span>Đang xử lý...</span>';
        
        // Call backend checkout endpoint - all business logic handled server-side
        const response = await fetch(`${API_BASE}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                reservationId: currentReservation.reservationId
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Checkout failed');
        }
        
        const invoice = await response.json();
        
        // Close dialog and show success
        closeDialog();
        showAlert(`Trả phòng thành công! Hóa đơn: ${invoice.invoiceId}`, 'success');
        
        // Reload the widget
        window.location.reload();
        
    } catch (error) {
        console.error('Error during checkout:', error);
        alert('Lỗi: ' + (error.message || 'Không thể hoàn thành trả phòng'));
        btnElement.disabled = false;
        btnElement.innerHTML = originalText;
    }
}
