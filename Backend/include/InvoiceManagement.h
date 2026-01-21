#ifndef INVOICEMANAGER_H
#define INVOICEMANAGER_H

#include "Structures.h"
#include "RoomManagement.h"
#include "ReservationManagement.h"
#include <string>
#include <unordered_map>
using namespace std;

class InvoiceManager {
private:
    Invoice* invoices;
    int capacity;
    int count;
    const string INVOICE_FILE = "invoices.json";
    
    void resize();
    int calculateDays(int d1, int m1, int y1, int d2, int m2, int y2);
    void saveToFile();
    void rebuildIndex();
    bool existsForReservation(const Reservation& r);

    unordered_map<string,int> invoiceIndex;
    
public:
    InvoiceManager(int cap = 10);
    ~InvoiceManager();

    bool addInvoice(const Invoice& invoice);
    bool deleteInvoice(const string& invoiceId);
    
    bool checkOut(string roomId, RoomManager& roomMgr, ReservationManager& resMgr);
    int syncFromReservations(ReservationManager& resMgr, RoomManager& roomMgr);
    int rebuildFromReservationsStrict(ReservationManager& resMgr, RoomManager& roomMgr);
    void sortByTotal(bool ascending = false);
    Invoice* findInvoiceById(const string& invoiceId);
    double calculateRevenue(int month, int year);
    void loadFromJson(const string& json);
    void loadFromFile();
    int getInvoiceCount();
    Invoice* getInvoices();
};

#endif
