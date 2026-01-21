#include "ReservationManagement.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <chrono>
using namespace std;

ReservationManager::ReservationManager(int cap) : capacity(cap), count(0) {
    reservations = new Reservation[capacity];
}

ReservationManager::~ReservationManager() {
    delete[] reservations;
}

void ReservationManager::resize() {
    capacity *= 2;
    Reservation* newRes = new Reservation[capacity];
    for (int i = 0; i < count; i++) {
        newRes[i] = reservations[i];
    }
    delete[] reservations;
    reservations = newRes;
    rebuildIndex();
}

void ReservationManager::rebuildIndex() {
    reservationIndex.clear();
    for (int i = 0; i < count; ++i) reservationIndex[reservations[i].reservationId] = i;
}

void ReservationManager::saveToFile() {
    ofstream file(RESERVATION_FILE);
    if (!file.is_open()) {
        cout << "Loi: Khong the luu du lieu dat phong!\n";
        return;
    }
    
    file << "[\n";
    for (int i = 0; i < count; i++) {
        file << reservations[i].toJson();
        if (i < count - 1) file << ",\n";
        else file << "\n";
    }
    file << "]\n";
    
    file.close();
}

bool ReservationManager::makeReservation(string resId, string custId, string roomId, 
                    int inD, int inM, int inY, int outD, int outM, int outY,
                    CustomerManager& custMgr, RoomManager& roomMgr, string status) {
    if (!custMgr.findCustomer(custId)) {
        cout << "Loi: Khach hang khong ton tai!\n";
        return false;
    }
    
    Room* room = roomMgr.findRoom(roomId);
    if (!room) {
        cout << "Loi: Phong khong ton tai!\n";
        return false;
    }
    
    if (!room->isAvailable && status == "pending") {
        cout << "Loi: Phong da duoc thue!\n";
        return false;
    }
    
    if (count == capacity) resize();

    reservations[count].reservationId = resId;
    reservations[count].customerId = custId;
    reservations[count].roomId = roomId;
    reservations[count].checkInDay = inD;
    reservations[count].checkInMonth = inM;
    reservations[count].checkInYear = inY;
    reservations[count].checkOutDay = outD;
    reservations[count].checkOutMonth = outM;
    reservations[count].checkOutYear = outY;
    reservations[count].status = status;
    reservationIndex[reservations[count].reservationId] = count;
    count++;
    
    cout << "Dat phong thanh cong!\n";
    saveToFile();

    // Keep rooms.json consistent: if a reservation is pending/checkedIn, the room is not available.
    if (status == "pending" || status == "checkedIn") {
        roomMgr.updateRoomStatus(roomId, false);
    }
    return true;
}

bool ReservationManager::checkInByReservationId(const string& resId, RoomManager& roomMgr) {
    Reservation* reservation = findReservationById(resId);
    if (!reservation) {
        cout << "Loi: Khong tim thay dat phong!\n";
        return false;
    }

    if (reservation->status != "pending") {
        cout << "Loi: Chi co the nhan phong o trang thai cho nhan!\n";
        return false;
    }

    reservation->status = "checkedIn";
    roomMgr.updateRoomStatus(reservation->roomId, false);
    saveToFile();
    cout << "Nhan phong thanh cong!\n";
    return true;
}

bool ReservationManager::cancelReservation(const string& resId, RoomManager& roomMgr) {
    Reservation* reservation = findReservationById(resId);
    if (!reservation) {
        cout << "Loi: Khong tim thay dat phong!\n";
        return false;
    }

    if (reservation->status != "pending") {
        cout << "Loi: Chi co the huy dat phong o trang thai cho nhan!\n";
        return false;
    }

    reservation->status = "cancel";
    roomMgr.updateRoomStatus(reservation->roomId, true);
    saveToFile();
    cout << "Huy phong thanh cong!\n";
    return true;
}

bool ReservationManager::updateStatus(const string& resId, const string& newStatus) {
    Reservation* reservation = findReservationById(resId);
    if (!reservation) {
        return false;
    }
    reservation->status = newStatus;
    saveToFile();
    return true;
}

bool ReservationManager::checkIn(string roomId, RoomManager& roomMgr) {
    Room* room = roomMgr.findRoom(roomId);
    if (!room) {
        cout << "Khong tim thay phong!\n";
        return false;
    }
    
    for (int i = 0; i < count; i++) {
        if (reservations[i].roomId == roomId && reservations[i].status == "pending") {
            reservations[i].status = "checkedIn";
            roomMgr.updateRoomStatus(roomId, false);
            cout << "Nhan phong thanh cong!\n";
            saveToFile();
            return true;
        }
    }
    
    cout << "Khong tim thay dat phong!\n";
    return false;
}

bool ReservationManager::cancelReservation(const string& resId) {
    Reservation* reservation = findReservationById(resId);
    if (!reservation) {
        cout << "Loi: Khong tim thay dat phong!\n";
        return false;
    }
    
    if (reservation->status != "pending") {
        cout << "Loi: Chi co the huy dat phong o trang thai cho nhan!\n";
        return false;
    }
    
    reservation->status = "cancel";
    saveToFile();
    cout << "Huy phong thanh cong!\n";
    return true;
}

Reservation* ReservationManager::findReservationByRoom(string roomId) {
    for (int i = 0; i < count; i++) {
        if (reservations[i].roomId == roomId && reservations[i].status == "checkedIn") {
            return &reservations[i];
        }
    }
    return nullptr;
}

Reservation* ReservationManager::findReservationById(const string& resId) {
    auto it = reservationIndex.find(resId);
    if (it == reservationIndex.end()) return nullptr;
    int idx = it->second;
    if (idx < 0 || idx >= count) return nullptr;
    return &reservations[idx];
}

void ReservationManager::loadFromJson(const string& json) {
    size_t pos = 1;
    while (pos < json.length()) {
        size_t start = json.find("{", pos);
        if (start == string::npos) break;
        
        size_t end = json.find("}", start);
        if (end == string::npos) break;
        
        string obj = json.substr(start, end - start + 1);
        
        if (count == capacity) resize();
        
        reservations[count].reservationId = JsonHelper::extractValue(obj, "reservationId");
        reservations[count].customerId = JsonHelper::extractValue(obj, "customerId");
        reservations[count].roomId = JsonHelper::extractValue(obj, "roomId");
        reservations[count].checkInDay = stoi(JsonHelper::extractValue(obj, "checkInDay"));
        reservations[count].checkInMonth = stoi(JsonHelper::extractValue(obj, "checkInMonth"));
        reservations[count].checkInYear = stoi(JsonHelper::extractValue(obj, "checkInYear"));
        reservations[count].checkOutDay = stoi(JsonHelper::extractValue(obj, "checkOutDay"));
        reservations[count].checkOutMonth = stoi(JsonHelper::extractValue(obj, "checkOutMonth"));
        reservations[count].checkOutYear = stoi(JsonHelper::extractValue(obj, "checkOutYear"));
        
        // Try to load status (new format), fallback to isCheckedIn (old format)
        string statusStr = JsonHelper::extractValue(obj, "status");
        if (!statusStr.empty()) {
            reservations[count].status = statusStr;
        } else {
            string checkedIn = JsonHelper::extractValue(obj, "isCheckedIn");
            reservations[count].status = (checkedIn == "true") ? "checkedIn" : "pending";
        }
        
        reservationIndex[reservations[count].reservationId] = count;
        count++;
        pos = end + 1;
    }
}

void ReservationManager::loadFromFile() {
    ifstream file(RESERVATION_FILE);
    if (!file.is_open()) {
        return;
    }
    
    stringstream buffer;
    buffer << file.rdbuf();
    string json = buffer.str();
    file.close();
    
    loadFromJson(json);
}

int ReservationManager::getReservationCount() {
    return count;
}

Reservation* ReservationManager::getReservations() {
    return reservations;
}

bool ReservationManager::deleteReservation(const string& resId, RoomManager& roomMgr) {
    auto it = reservationIndex.find(resId);
    if (it == reservationIndex.end()) {
        return false;
    }

    int idx = it->second;
    if (idx < 0 || idx >= count) {
        return false;
    }

    const std::string roomId = reservations[idx].roomId;
    const std::string status = reservations[idx].status;
    const bool wasActive = (status == "pending" || status == "checkedIn");

    // Remove by shifting.
    for (int i = idx; i < count - 1; ++i) {
        reservations[i] = reservations[i + 1];
    }
    --count;
    rebuildIndex();
    saveToFile();

    // If we deleted an active reservation, release the room only if no other active
    // reservation exists for that room.
    if (wasActive) {
        bool stillActive = false;
        for (int i = 0; i < count; ++i) {
            if (reservations[i].roomId == roomId &&
                (reservations[i].status == "pending" || reservations[i].status == "checkedIn")) {
                stillActive = true;
                break;
            }
        }
        if (!stillActive) {
            // Release room (also clears services + persists)
            roomMgr.updateRoomStatus(roomId, true);
        }
    }

    return true;
}