#ifndef RESERVATIONMANAGER_H
#define RESERVATIONMANAGER_H

#include "Structures.h"
#include "CustomerManagement.h"
#include "RoomManagement.h"
#include <string>
#include <unordered_map>
using namespace std;

class ReservationManager {
private:
    Reservation* reservations;
    int capacity;
    int count;
    const string RESERVATION_FILE = "reservations.json";
    
    void resize();
    void saveToFile();
    void rebuildIndex();

    unordered_map<string,int> reservationIndex;
    
public:
    ReservationManager(int cap = 10);
    ~ReservationManager();
    
    bool makeReservation(string resId, string custId, string roomId, 
                        int inD, int inM, int inY, int outD, int outM, int outY,
                        CustomerManager& custMgr, RoomManager& roomMgr, string status = "pending");
    bool checkIn(string roomId, RoomManager& roomMgr);
    bool cancelReservation(const string& resId);
    bool checkInByReservationId(const string& resId, RoomManager& roomMgr);
    bool cancelReservation(const string& resId, RoomManager& roomMgr);
    bool deleteReservation(const string& resId, RoomManager& roomMgr);
    bool updateStatus(const string& resId, const string& newStatus);
    Reservation* findReservationByRoom(string roomId);
    Reservation* findReservationById(const string& resId);
    void loadFromJson(const string& json);
    void loadFromFile();
    int getReservationCount();
    Reservation* getReservations();
};

#endif