#ifndef STRUCTURES_H
#define STRUCTURES_H

#include <string>
#include "JsonHelper.h"
using namespace std;

struct Service {
    string serviceName;
    double price;
    int quantity;
    Service* next;
    
    Service(string name, double p, int q);
    string toJson() const;
};

struct Room {
    string roomId;
    string roomType;
    double pricePerDay;
    Service* serviceList;
    bool isAvailable;
    
    Room();
    Room(string id, string type, double price);
    string toJson() const;
};

struct Customer {
    string customerId;
    string fullName;
    string idCard;
    string phoneNumber;
    Customer* next;
    
    Customer();
    Customer(string id, string name, string card, string phone);
    string toJson() const;
};

struct Reservation {
    string reservationId;
    string customerId;
    string roomId;
    int checkInDay, checkInMonth, checkInYear;
    int checkOutDay, checkOutMonth, checkOutYear;
    string status; // "pending", "checkedIn", "checkedOut"
    
    Reservation();
    string toJson() const;
};

struct Invoice {
    string invoiceId;
    string customerId;
    string roomId;
    int checkInDay, checkInMonth, checkInYear;
    int checkOutDay, checkOutMonth, checkOutYear;
    double roomCharge;
    double serviceCharge;
    double totalAmount;
    
    Invoice();
    string toJson() const;
};

#endif