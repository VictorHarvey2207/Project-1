#ifndef ROOMMANAGER_H
#define ROOMMANAGER_H

#include "Structures.h"
#include <string>
#include <unordered_map>
using namespace std;

class RoomManager {
private:
    Room* rooms;
    int capacity;
    int count;
    unordered_map<string, int> roomIndex;
    void resize();
    void rebuildIndex();

public:
    RoomManager(int cap = 100);
    ~RoomManager();
    
    bool addRoom(string roomId, string roomType, double pricePerDay);
    bool deleteRoom(string roomId);
    Room* findRoom(string roomId);
    Room* getRooms();
    int getRoomCount();
    bool updateRoomPrice(string roomId, double newPrice);
    bool setAvailability(string roomId, bool available);
    void updateRoomStatus(string roomId, bool available);
    void sortRoomsByPrice(bool ascending = true);
    
    // File operations
    void saveToFile(string filename = "rooms.json");
    void loadFromFile(string filename = "rooms.json");
    void loadFromJson(const string& jsonStr);
};

#endif
