#ifndef DATAGENERATOR_H
#define DATAGENERATOR_H

#include "RoomManagement.h"
#include "CustomerManagement.h"
#include "ReservationManagement.h"
#include "InvoiceManagement.h"
#include <string>
#include <cstdlib>
#include <ctime>
using namespace std;

class DataGenerator {
private:
    static string generateRandomName();
    static string generateRandomPhone();
    static string generateRandomIdCard();
    static int randomInt(int min, int max);
    static bool randomBool();
    
    // Helper: Check if two date ranges overlap
    static bool datesOverlap(int d1, int m1, int y1, int d2, int m2, int y2,
                            int d3, int m3, int y3, int d4, int m4, int y4);
    
public:
    static void generateRooms(RoomManager& roomMgr, int count);
    static void generateCustomers(CustomerManager& custMgr, int count);
    static void generateReservations(ReservationManager& resMgr, 
                                    RoomManager& roomMgr, 
                                    CustomerManager& custMgr, 
                                    int count);
    static void generateInvoices(InvoiceManager& invMgr,
                                RoomManager& roomMgr,
                                ReservationManager& resMgr,
                                CustomerManager& custMgr,
                                int count);
    
    // Tạo tất cả dữ liệu cùng lúc (auto-calculate reservation/invoice counts)
    static void generateAllData(RoomManager& roomMgr,
                               CustomerManager& custMgr,
                               ReservationManager& resMgr,
                               InvoiceManager& invMgr,
                               int roomCount,
                               int customerCount);
    
    // Menu để chọn
    static void showMenu(RoomManager& roomMgr,
                        CustomerManager& custMgr,
                        ReservationManager& resMgr,
                        InvoiceManager& invMgr);
};

#endif