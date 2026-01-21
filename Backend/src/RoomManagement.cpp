

#include "RoomManagement.h"
#include "ServiceManagement.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <iomanip>
#include <algorithm>
#include <chrono>
#include <cctype>
#include "nlohmann/json.hpp"
using namespace std;
using json = nlohmann::json;

RoomManager::RoomManager(int cap) : capacity(cap), count(0) {
    rooms = new Room[capacity];
}

RoomManager::~RoomManager() {
    for (int i = 0; i < count; i++) {
        Service* curr = rooms[i].serviceList;
        while (curr) {
            Service* temp = curr;
            curr = curr->next;
            delete temp;
        }
    }
    delete[] rooms;
}

void RoomManager::resize() {
    capacity *= 2;
    Room* newRooms = new Room[capacity];
    for (int i = 0; i < count; i++) {
        newRooms[i] = rooms[i];
    }
    delete[] rooms;
    rooms = newRooms;
    rebuildIndex();
}

void RoomManager::saveToFile(string filename) {
    ofstream file(filename);
    if (!file.is_open()) {
        cout << "Loi: Khong the luu du lieu phong!\n";
        return;
    }
    
    file << "[\n";
    for (int i = 0; i < count; i++) {
        file << rooms[i].toJson();
        if (i < count - 1) file << ",\n";
        else file << "\n";
    }
    file << "]\n";
    
    file.close();
}

bool RoomManager::addRoom(string id, string type, double price) {
    if (roomIndex.find(id) != roomIndex.end()) return false;
    if (count == capacity) resize();
    rooms[count] = Room(id, type, price);
    rooms[count].serviceList = nullptr;
    rooms[count].isAvailable = true;
    roomIndex[id] = count;
    count++;
    saveToFile();
    return true;
}

bool RoomManager::deleteRoom(string id) {
    auto it = roomIndex.find(id);
    if (it == roomIndex.end()) return false;
    int idx = it->second;
    Service* curr = rooms[idx].serviceList;
    while (curr) {
        Service* tmp = curr;
        curr = curr->next;
        delete tmp;
    }
    for (int i = idx; i < count - 1; i++) {
        rooms[i] = rooms[i+1];
    }
    count--;
    rebuildIndex();
    saveToFile();
    return true;
}

Room* RoomManager::findRoom(string id) {
    auto it = roomIndex.find(id);
    if (it == roomIndex.end()) return nullptr;
    int idx = it->second;
    if (idx < 0 || idx >= count) return nullptr;
    return &rooms[idx];
}

void RoomManager::updateRoomStatus(string roomId, bool available) {
    Room* room = findRoom(roomId);
    if (room) {
        if (available) {
            // Business rule: only occupied rooms can have services.
            ServiceManagement::clearServices(*this, roomId, false);
        }
        room->isAvailable = available;
        saveToFile();
    }
}

int RoomManager::getRoomCount() { 
    return count; 
}

Room* RoomManager::getRooms() { 
    return rooms; 
}

void RoomManager::loadFromJson(const string& jsonStr) {
    // Clear existing data to avoid duplicates and leaks
    for (int i = 0; i < count; i++) {
        Service* curr = rooms[i].serviceList;
        while (curr) {
            Service* tmp = curr;
            curr = curr->next;
            delete tmp;
        }
    }
    count = 0;
    roomIndex.clear();

    try {
        auto arr = json::parse(jsonStr);
        if (!arr.is_array()) return;

        for (const auto& item : arr) {
            if (!item.is_object()) continue;
            string id = item.value("roomId", "");
            string type = item.value("roomType", "");
            double price = item.value("pricePerDay", 0.0);
            bool available = item.value("isAvailable", true);
            if (id.empty()) continue;

            if (count == capacity) resize();
            rooms[count] = Room(id, type, price);
            rooms[count].isAvailable = available;
            rooms[count].serviceList = nullptr;

            Service* tail = nullptr;
            if (item.contains("services") && item["services"].is_array()) {
                for (const auto& svc : item["services"]) {
                    if (!svc.is_object()) continue;
                    string name = svc.value("serviceName", svc.value("name", ""));
                    double p = svc.value("price", 0.0);
                    int q = svc.value("quantity", 1);
                    Service* node = new Service(name, p, q);
                    if (!rooms[count].serviceList) {
                        rooms[count].serviceList = node;
                        tail = node;
                    } else {
                        tail->next = node;
                        tail = node;
                    }
                }
            }

            roomIndex[id] = count;
            count++;
        }
    } catch (const std::exception& e) {
        cerr << "Failed to parse rooms JSON: " << e.what() << "\n";
    }
}

void RoomManager::loadFromFile(string filename) {
    ifstream file(filename);
    if (!file.is_open()) {
        return;
    }
    
    stringstream buffer;
    buffer << file.rdbuf();
    string json = buffer.str();
    file.close();
    
    loadFromJson(json);
}

void RoomManager::sortRoomsByPrice(bool ascending) {
    if (count <= 1) return;
    auto start = chrono::high_resolution_clock::now();
    if (ascending) {
        std::sort(rooms, rooms + count, [](const Room& a, const Room& b) {
            if (a.pricePerDay != b.pricePerDay) return a.pricePerDay < b.pricePerDay;
            return a.roomId < b.roomId;
        });
    } else {
        std::sort(rooms, rooms + count, [](const Room& a, const Room& b) {
            if (a.pricePerDay != b.pricePerDay) return a.pricePerDay > b.pricePerDay;
            return a.roomId < b.roomId;
        });
    }
    rebuildIndex();
    auto end = chrono::high_resolution_clock::now();
    chrono::duration<double, milli> elapsed = end - start;
    double elapsedMs = elapsed.count();

    cout << "\n========== DANH SACH PHONG (DA SAP XEP THEO GIA) ==========" << endl;
    cout << "Thoi gian sap xep: " << elapsedMs << " ms\n";
    cout << left << setw(10) << "Ma phong" 
         << setw(12) << "Loai phong" 
         << setw(15) << "Gia/ngay" 
         << setw(15) << "Trang thai" << endl;
    cout << string(52, '-') << endl;
    for (int i = 0; i < count; i++) {
        cout << left << setw(10) << rooms[i].roomId
             << setw(12) << rooms[i].roomType
             << setw(15) << fixed << setprecision(3) << rooms[i].pricePerDay
             << setw(15) << (rooms[i].isAvailable ? "Trong" : "Dang thue") << endl;
    }
    cout << string(52, '=') << endl;
}

void RoomManager::rebuildIndex() {
    roomIndex.clear();
    for (int i = 0; i < count; ++i) {
        roomIndex[rooms[i].roomId] = i;
    }
}