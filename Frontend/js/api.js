import { State } from './state.js';

// Always use same-origin '/api'.
// If served by Node on port 3000, server.js proxies '/api' to 3001.
// If served by C++ on port 3001, '/api' hits backend directly.
// When serving frontend on port 3000 via python -m http.server, backend is on 3001
// Use full origin to avoid hitting 3000/api (which would 404)
const BASE = 'http://localhost:3001/api';

async function request(path, options = {}) {
  State.setLoading(true);
  try {
    const method = String(options.method || 'GET').toUpperCase();
    const finalPath = (method === 'GET')
      ? `${path}${path.includes('?') ? '&' : '?'}_ts=${Date.now()}`
      : path;
    const res = await fetch(BASE + finalPath, options);
    const text = await res.text();
    let data = text;
    try { data = text ? JSON.parse(text) : null; } catch (e) { /* not JSON */ }
    if (!res.ok) {
      const message = (data && data.message) || data || res.statusText || 'Unknown error';
      const err = new Error(message);
      err.status = res.status;
      throw err;
    }
    return data;
  } catch (err) {
    State.setError(err.message || String(err));
    throw err;
  } finally {
    State.setLoading(false);
  }
}

export const HotelService = {
  getCustomers() { return request('/customers'); },
  createCustomer(payload) { return request('/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); },
  updateCustomer(id, payload) { return request(`/customers/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); },
  deleteCustomer(id) { return request(`/customers/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
  getRooms() { return request('/rooms'); },
  getReservations() { return request('/reservations'); },
  createReservation(payload) { return request('/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); },
  deleteReservation(id) { return request(`/reservations/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
  getInvoices() { return request('/invoices'); },
  createInvoice(payload) { return request('/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); },
  deleteInvoice(id) { return request(`/invoices/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
  // Services
  getServices() { return request('/services'); },
  createService(payload) { return request('/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); },
  updateService(id, payload) { return request(`/services/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); },
  deleteService(id) { return request(`/services/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
  // Service management per room
  getServiceRooms() { return request('/service/rooms'); },
  getRoomServices(roomId) { return request(`/service/rooms/${encodeURIComponent(roomId)}/services`); },
  addRoomService(roomId, payload) { return request(`/service/rooms/${encodeURIComponent(roomId)}/services`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); },
  deleteRoomService(roomId, index) { return request(`/service/rooms/${encodeURIComponent(roomId)}/services/${index}`, { method: 'DELETE' }); },
  findRoomCombination(payload) { return request('/rooms/combination', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); },
  // Extend with additional backend endpoints as needed
  createRoom(payload) { return request('/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); },
  updateRoom(id, payload) { return request(`/rooms/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); },
  deleteRoom(id) { return request(`/rooms/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
};

export default HotelService;
