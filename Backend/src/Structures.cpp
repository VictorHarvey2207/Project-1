#include "Structures.h"

// ==================== SERVICE ====================
Service::Service(string name, double p, int q) 
    : serviceName(name), price(p), quantity(q), next(nullptr) {}

string Service::toJson() const {
    return "{\n      \"serviceName\": \"" + JsonHelper::escapeString(serviceName) + 
           "\",\n      \"price\": " + JsonHelper::formatPrice(price) + 
           ",\n      \"quantity\": " + to_string(quantity) + "\n    }";
}

// ==================== ROOM ====================
Room::Room() : serviceList(nullptr), isAvailable(true) {}

Room::Room(string id, string type, double price) 
    : roomId(id), roomType(type), pricePerDay(price), serviceList(nullptr), isAvailable(true) {}

string Room::toJson() const {
    string json = "  {\n";
    json += "    \"roomId\": \"" + JsonHelper::escapeString(roomId) + "\",\n";
    json += "    \"roomType\": \"" + JsonHelper::escapeString(roomType) + "\",\n";
    json += "    \"pricePerDay\": " + JsonHelper::formatPrice(pricePerDay) + ",\n";
    json += "    \"isAvailable\": " + string(isAvailable ? "true" : "false") + ",\n";
    json += "    \"services\": [";
    
    Service* curr = serviceList;
    bool first = true;
    while (curr) {
        if (!first) json += ",";
        json += "\n    " + curr->toJson();
        first = false;
        curr = curr->next;
    }
    if (!first) json += "\n    ";
    json += "]\n  }";
    return json;
}

// ==================== CUSTOMER ====================
Customer::Customer() : next(nullptr) {}

Customer::Customer(string id, string name, string card, string phone)
    : customerId(id), fullName(name), idCard(card), phoneNumber(phone), next(nullptr) {}

string Customer::toJson() const {
    string json = "  {\n";
    json += "    \"customerId\": \"" + JsonHelper::escapeString(customerId) + "\",\n";
    json += "    \"fullName\": \"" + JsonHelper::escapeString(fullName) + "\",\n";
    json += "    \"idCard\": \"" + JsonHelper::escapeString(idCard) + "\",\n";
    json += "    \"phoneNumber\": \"" + JsonHelper::escapeString(phoneNumber) + "\"\n";
    json += "  }";
    return json;
}

// ==================== RESERVATION ====================
Reservation::Reservation() : status("pending") {}

string Reservation::toJson() const {
    string json = "  {\n";
    json += "    \"reservationId\": \"" + JsonHelper::escapeString(reservationId) + "\",\n";
    json += "    \"customerId\": \"" + JsonHelper::escapeString(customerId) + "\",\n";
    json += "    \"roomId\": \"" + JsonHelper::escapeString(roomId) + "\",\n";
    json += "    \"checkInDay\": " + to_string(checkInDay) + ",\n";
    json += "    \"checkInMonth\": " + to_string(checkInMonth) + ",\n";
    json += "    \"checkInYear\": " + to_string(checkInYear) + ",\n";
    json += "    \"checkOutDay\": " + to_string(checkOutDay) + ",\n";
    json += "    \"checkOutMonth\": " + to_string(checkOutMonth) + ",\n";
    json += "    \"checkOutYear\": " + to_string(checkOutYear) + ",\n";
    json += "    \"status\": \"" + JsonHelper::escapeString(status) + "\"\n";
    json += "  }";
    return json;
}

// ==================== INVOICE ====================
Invoice::Invoice() : roomCharge(0), serviceCharge(0), totalAmount(0) {}

string Invoice::toJson() const {
    string json = "  {\n";
    json += "    \"invoiceId\": \"" + JsonHelper::escapeString(invoiceId) + "\",\n";
    json += "    \"customerId\": \"" + JsonHelper::escapeString(customerId) + "\",\n";
    json += "    \"roomId\": \"" + JsonHelper::escapeString(roomId) + "\",\n";
    json += "    \"checkInDay\": " + to_string(checkInDay) + ",\n";
    json += "    \"checkInMonth\": " + to_string(checkInMonth) + ",\n";
    json += "    \"checkInYear\": " + to_string(checkInYear) + ",\n";
    json += "    \"checkOutDay\": " + to_string(checkOutDay) + ",\n";
    json += "    \"checkOutMonth\": " + to_string(checkOutMonth) + ",\n";
    json += "    \"checkOutYear\": " + to_string(checkOutYear) + ",\n";
    json += "    \"roomCharge\": " + JsonHelper::formatPrice(roomCharge) + ",\n";
    json += "    \"serviceCharge\": " + JsonHelper::formatPrice(serviceCharge) + ",\n";
    json += "    \"totalAmount\": " + JsonHelper::formatPrice(totalAmount) + "\n";
    json += "  }";
    return json;
}