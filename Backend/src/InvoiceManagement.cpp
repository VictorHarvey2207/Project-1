#include "InvoiceManagement.h"
#include <algorithm>
#include <iostream>
#include <fstream>
#include <sstream>
#include <iomanip>
#include <chrono>
#include "ServiceManagement.h"
using namespace std;

InvoiceManager::InvoiceManager(int cap) : capacity(cap), count(0) {
    invoices = new Invoice[capacity];
}

InvoiceManager::~InvoiceManager() {
    delete[] invoices;
}

void InvoiceManager::resize() {
    capacity *= 2;
    Invoice* newInv = new Invoice[capacity];
    for (int i = 0; i < count; i++) {
        newInv[i] = invoices[i];
    }
    delete[] invoices;
    invoices = newInv;
    rebuildIndex();
}

void InvoiceManager::rebuildIndex() {
    invoiceIndex.clear();
    for (int i = 0; i < count; ++i) {
        invoiceIndex[invoices[i].invoiceId] = i;
    }
}

bool InvoiceManager::existsForReservation(const Reservation& r) {
    for (int i = 0; i < count; ++i) {
        const Invoice& inv = invoices[i];
        if (inv.customerId == r.customerId &&
            inv.roomId == r.roomId &&
            inv.checkInDay == r.checkInDay &&
            inv.checkInMonth == r.checkInMonth &&
            inv.checkInYear == r.checkInYear &&
            inv.checkOutDay == r.checkOutDay &&
            inv.checkOutMonth == r.checkOutMonth &&
            inv.checkOutYear == r.checkOutYear) {
            return true;
        }
    }
    return false;
}

int InvoiceManager::calculateDays(int d1, int m1, int y1, int d2, int m2, int y2) {
    int days = (y2 - y1) * 365 + (m2 - m1) * 30 + (d2 - d1);
    return days > 0 ? days : 1;
}

void InvoiceManager::saveToFile() {
    ofstream file(INVOICE_FILE);
    if (!file.is_open()) {
        cout << "Loi: Khong the luu du lieu hoa don!\n";
        return;
    }
    
    file << "[\n";
    for (int i = 0; i < count; i++) {
        file << invoices[i].toJson();
        if (i < count - 1) file << ",\n";
        else file << "\n";
    }
    file << "]\n";
    
    file.close();
}

bool InvoiceManager::checkOut(string roomId, RoomManager& roomMgr, ReservationManager& resMgr) {
    Room* room = roomMgr.findRoom(roomId);
    if (!room) {
        cout << "Khong tim thay phong!\n";
        return false;
    }
    
    if (room->isAvailable) {
        cout << "Phong chua duoc thue!\n";
        return false;
    }
    
    Reservation* res = resMgr.findReservationByRoom(roomId);
    if (!res) {
        cout << "Khong tim thay thong tin dat phong!\n";
        return false;
    }
    
    if (count == capacity) resize();

    invoices[count].invoiceId = "INV" + to_string(count + 1);
    invoices[count].customerId = res->customerId;
    invoices[count].roomId = roomId;
    invoices[count].checkInDay = res->checkInDay;
    invoices[count].checkInMonth = res->checkInMonth;
    invoices[count].checkInYear = res->checkInYear;
    invoices[count].checkOutDay = res->checkOutDay;
    invoices[count].checkOutMonth = res->checkOutMonth;
    invoices[count].checkOutYear = res->checkOutYear;
    
    int days = calculateDays(res->checkInDay, res->checkInMonth, res->checkInYear,
                            res->checkOutDay, res->checkOutMonth, res->checkOutYear);
    
    invoices[count].roomCharge = days * room->pricePerDay;
    invoices[count].serviceCharge = ServiceManagement::calculateServiceCharge(roomMgr, roomId);
    invoices[count].totalAmount = invoices[count].roomCharge + invoices[count].serviceCharge;
    
    cout << "\n========== HOA DON ==========\n";
    cout << "Ma hoa don: " << invoices[count].invoiceId << endl;
    cout << "Ma khach: " << invoices[count].customerId << endl;
    cout << "Ma phong: " << invoices[count].roomId << endl;
    cout << "So ngay thue: " << days << endl;
    cout << "Tien phong: " << fixed << setprecision(3) << invoices[count].roomCharge << endl;
    cout << "Tien dich vu: " << fixed << setprecision(3) << invoices[count].serviceCharge << endl;
    cout << "TONG TIEN: " << fixed << setprecision(3) << invoices[count].totalAmount << endl;
    cout << string(29, '=') << endl;
    
    invoiceIndex[invoices[count].invoiceId] = count;
    count++;
    
    // Mark room available (also clears services + persists)
    roomMgr.updateRoomStatus(roomId, true);
    
    saveToFile();
    return true;
}

int InvoiceManager::syncFromReservations(ReservationManager& resMgr, RoomManager& roomMgr) {
    int created = 0;
    Reservation* rs = resMgr.getReservations();
    int rn = resMgr.getReservationCount();
    for (int i = 0; i < rn; ++i) {
        Reservation& r = rs[i];
        std::string status = r.status;
        if (status != "checkedOut") continue;
        if (existsForReservation(r)) continue;

        Room* room = roomMgr.findRoom(r.roomId);
        if (!room) {
            // If room not found, skip creating invoice for this reservation
            continue;
        }
        if (count == capacity) resize();

        invoices[count].invoiceId = "INV" + to_string(count + 1);
        invoices[count].customerId = r.customerId;
        invoices[count].roomId = r.roomId;
        invoices[count].checkInDay = r.checkInDay;
        invoices[count].checkInMonth = r.checkInMonth;
        invoices[count].checkInYear = r.checkInYear;
        invoices[count].checkOutDay = r.checkOutDay;
        invoices[count].checkOutMonth = r.checkOutMonth;
        invoices[count].checkOutYear = r.checkOutYear;

        int days = calculateDays(r.checkInDay, r.checkInMonth, r.checkInYear,
                                 r.checkOutDay, r.checkOutMonth, r.checkOutYear);
        invoices[count].roomCharge = days * room->pricePerDay;
        // Services may have been cleared; calculate current services if any
        invoices[count].serviceCharge = ServiceManagement::calculateServiceCharge(roomMgr, r.roomId);
        invoices[count].totalAmount = invoices[count].roomCharge + invoices[count].serviceCharge;

        invoiceIndex[invoices[count].invoiceId] = count;
        count++;
        created++;
    }
    if (created > 0) saveToFile();
    return created;
}

void InvoiceManager::sortByTotal(bool ascending) {
    if (count <= 1) return;
    if (ascending) {
        std::sort(invoices, invoices + count, [](const Invoice& a, const Invoice& b) {
            if (a.totalAmount != b.totalAmount) return a.totalAmount < b.totalAmount;
            return a.invoiceId < b.invoiceId;
        });
    } else {
        std::sort(invoices, invoices + count, [](const Invoice& a, const Invoice& b) {
            if (a.totalAmount != b.totalAmount) return a.totalAmount > b.totalAmount;
            return a.invoiceId < b.invoiceId;
        });
    }
    rebuildIndex();
}

double InvoiceManager::calculateRevenue(int month, int year) {
    double total = 0;
    for (int i = 0; i < count; i++) {
        if (invoices[i].checkOutMonth == month && invoices[i].checkOutYear == year) {
            total += invoices[i].totalAmount;
        }
    }
    return total;
}


void InvoiceManager::loadFromJson(const string& json) {
    size_t pos = 1;
    while (pos < json.length()) {
        size_t start = json.find("{", pos);
        if (start == string::npos) break;
        
        size_t end = json.find("}", start);
        if (end == string::npos) break;
        
        string obj = json.substr(start, end - start + 1);
        
        if (count == capacity) resize();
        
        invoices[count].invoiceId = JsonHelper::extractValue(obj, "invoiceId");
        invoices[count].customerId = JsonHelper::extractValue(obj, "customerId");
        invoices[count].roomId = JsonHelper::extractValue(obj, "roomId");
        invoices[count].checkInDay = stoi(JsonHelper::extractValue(obj, "checkInDay"));
        invoices[count].checkInMonth = stoi(JsonHelper::extractValue(obj, "checkInMonth"));
        invoices[count].checkInYear = stoi(JsonHelper::extractValue(obj, "checkInYear"));
        invoices[count].checkOutDay = stoi(JsonHelper::extractValue(obj, "checkOutDay"));
        invoices[count].checkOutMonth = stoi(JsonHelper::extractValue(obj, "checkOutMonth"));
        invoices[count].checkOutYear = stoi(JsonHelper::extractValue(obj, "checkOutYear"));
        invoices[count].roomCharge = stod(JsonHelper::extractValue(obj, "roomCharge"));
        invoices[count].serviceCharge = stod(JsonHelper::extractValue(obj, "serviceCharge"));
        invoices[count].totalAmount = stod(JsonHelper::extractValue(obj, "totalAmount"));
        
        invoiceIndex[invoices[count].invoiceId] = count;
        count++;
        pos = end + 1;
    }
}

void InvoiceManager::loadFromFile() {
    ifstream file(INVOICE_FILE);
    if (!file.is_open()) {
        return;
    }
    
    stringstream buffer;
    buffer << file.rdbuf();
    string json = buffer.str();
    file.close();
    
    loadFromJson(json);
}

int InvoiceManager::getInvoiceCount() {
    return count;
}

Invoice* InvoiceManager::getInvoices() {
    return invoices;
}

Invoice* InvoiceManager::findInvoiceById(const string& invoiceId) {
    auto it = invoiceIndex.find(invoiceId);
    if (it == invoiceIndex.end()) return nullptr;
    int idx = it->second;
    if (idx < 0 || idx >= count) return nullptr;
    return &invoices[idx];
}

int InvoiceManager::rebuildFromReservationsStrict(ReservationManager& resMgr, RoomManager& roomMgr) {
    // Reset current invoices
    count = 0;
    invoiceIndex.clear();

    Reservation* rs = resMgr.getReservations();
    int rn = resMgr.getReservationCount();
    int created = 0;
    for (int i = 0; i < rn; ++i) {
        Reservation& r = rs[i];
        std::string status = r.status;
        if (status != "checkedOut") continue;

        Room* room = roomMgr.findRoom(r.roomId);
        if (!room) continue;
        if (count == capacity) resize();

        invoices[count].invoiceId = "INV" + to_string(count + 1);
        invoices[count].customerId = r.customerId;
        invoices[count].roomId = r.roomId;
        invoices[count].checkInDay = r.checkInDay;
        invoices[count].checkInMonth = r.checkInMonth;
        invoices[count].checkInYear = r.checkInYear;
        invoices[count].checkOutDay = r.checkOutDay;
        invoices[count].checkOutMonth = r.checkOutMonth;
        invoices[count].checkOutYear = r.checkOutYear;

        int days = calculateDays(r.checkInDay, r.checkInMonth, r.checkInYear,
                                 r.checkOutDay, r.checkOutMonth, r.checkOutYear);
        invoices[count].roomCharge = days * room->pricePerDay;
        invoices[count].serviceCharge = ServiceManagement::calculateServiceCharge(roomMgr, r.roomId);
        invoices[count].totalAmount = invoices[count].roomCharge + invoices[count].serviceCharge;

        invoiceIndex[invoices[count].invoiceId] = count;
        count++;
        created++;
    }
    saveToFile();
    return created;
}

bool InvoiceManager::addInvoice(const Invoice& invoice) {
    if (count == capacity) resize();

    Invoice inv = invoice;
    if (inv.invoiceId.empty()) {
        inv.invoiceId = "INV" + to_string(count + 1);
    }

    // Avoid overwriting an existing invoiceId
    if (invoiceIndex.find(inv.invoiceId) != invoiceIndex.end()) {
        return false;
    }

    invoices[count] = inv;
    invoiceIndex[invoices[count].invoiceId] = count;
    count++;

    saveToFile();
    return true;
}

bool InvoiceManager::deleteInvoice(const string& invoiceId) {
    auto it = invoiceIndex.find(invoiceId);
    if (it == invoiceIndex.end()) {
        return false;
    }
    int idx = it->second;
    if (idx < 0 || idx >= count) {
        return false;
    }

    for (int i = idx; i < count - 1; ++i) {
        invoices[i] = invoices[i + 1];
    }
    --count;
    rebuildIndex();
    saveToFile();
    return true;
}