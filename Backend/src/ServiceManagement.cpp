#include "ServiceManagement.h"

#include "RoomManagement.h"

#include <algorithm>
#include <cctype>
#include <iostream>
#include <unordered_map>

bool ServiceManagement::addServiceToRoom(RoomManager& roomMgr,
                                        const std::string& roomId,
                                        const std::string& serviceName,
                                        double price,
                                        int quantity) {
    Room* room = roomMgr.findRoom(roomId);
    if (!room) {
        std::cout << "Khong tim thay phong!\n";
        return false;
    }

    if (room->isAvailable) {
        std::cout << "Phong chua duoc thue!\n";
        return false;
    }

    auto normalize = [](const std::string& s) {
        std::string out = s;
        std::transform(out.begin(), out.end(), out.begin(), [](unsigned char c) {
            return static_cast<char>(std::tolower(c));
        });
        return out;
    };

    const std::string key = normalize(serviceName);

    for (Service* curr = room->serviceList; curr; curr = curr->next) {
        if (normalize(curr->serviceName) == key) {
            curr->price = price;
            curr->quantity += quantity;
            std::cout << "Cap nhat dich vu thanh cong!\n";
            roomMgr.saveToFile();
            return true;
        }
    }

    Service* newService = new Service(serviceName, price, quantity);
    newService->next = room->serviceList;
    room->serviceList = newService;

    std::cout << "Them dich vu thanh cong!\n";
    roomMgr.saveToFile();
    return true;
}

bool ServiceManagement::removeServiceByIndex(RoomManager& roomMgr,
                                            const std::string& roomId,
                                            int index) {
    Room* room = roomMgr.findRoom(roomId);
    if (!room || index < 0) return false;

    Service* prev = nullptr;
    Service* curr = room->serviceList;
    int i = 0;
    while (curr && i < index) {
        prev = curr;
        curr = curr->next;
        ++i;
    }
    if (!curr) return false;

    if (prev) prev->next = curr->next;
    else room->serviceList = curr->next;

    delete curr;
    roomMgr.saveToFile();
    return true;
}

int ServiceManagement::getServiceCount(RoomManager& roomMgr,
                                      const std::string& roomId) {
    Room* room = roomMgr.findRoom(roomId);
    if (!room) return 0;

    int countSvc = 0;
    Service* curr = room->serviceList;
    while (curr) {
        ++countSvc;
        curr = curr->next;
    }
    return countSvc;
}

double ServiceManagement::calculateServiceCharge(RoomManager& roomMgr,
                                                const std::string& roomId) {
    Room* room = roomMgr.findRoom(roomId);
    if (!room) return 0;

    double total = 0;
    Service* curr = room->serviceList;
    while (curr) {
        total += curr->price * curr->quantity;
        curr = curr->next;
    }
    return total;
}

void ServiceManagement::clearServices(RoomManager& roomMgr,
                                     const std::string& roomId,
                                     bool persist) {
    Room* room = roomMgr.findRoom(roomId);
    if (!room) return;

    Service* curr = room->serviceList;
    while (curr) {
        Service* temp = curr;
        curr = curr->next;
        delete temp;
    }
    room->serviceList = nullptr;

    if (persist) {
        roomMgr.saveToFile();
    }
}

int ServiceManagement::mergeDuplicateServices(RoomManager& roomMgr, bool persist) {
    Room* rooms = roomMgr.getRooms();
    const int roomCount = roomMgr.getRoomCount();
    if (!rooms || roomCount <= 0) return 0;

    auto normalize = [](const std::string& s) {
        std::string out = s;
        std::transform(out.begin(), out.end(), out.begin(), [](unsigned char c) {
            return static_cast<char>(std::tolower(c));
        });
        return out;
    };

    int duplicatesRemoved = 0;
    bool anyChanged = false;

    for (int r = 0; r < roomCount; ++r) {
        Room& room = rooms[r];
        if (!room.serviceList) continue;

        std::unordered_map<std::string, Service*> seen;

        Service* prev = nullptr;
        Service* curr = room.serviceList;
        while (curr) {
            const std::string key = normalize(curr->serviceName);
            auto it = seen.find(key);
            if (it == seen.end()) {
                seen.emplace(key, curr);
                prev = curr;
                curr = curr->next;
                continue;
            }

            // Merge into first occurrence.
            it->second->quantity += curr->quantity;
            // Keep the first price to match legacy script behavior.

            Service* toDelete = curr;
            if (prev) {
                prev->next = curr->next;
                curr = prev->next;
            } else {
                room.serviceList = curr->next;
                curr = room.serviceList;
            }
            delete toDelete;
            ++duplicatesRemoved;
            anyChanged = true;
        }
    }

    if (persist && anyChanged) {
        roomMgr.saveToFile();
    }
    return duplicatesRemoved;
}
