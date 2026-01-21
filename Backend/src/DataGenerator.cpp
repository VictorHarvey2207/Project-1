#include "DataGenerator.h"
#include "ServiceManagement.h"
#include <iostream>
#include <vector>
#include <iomanip>
#include <map>

// Helper: Convert date to days since epoch for easy comparison
static long long dateToDays(int day, int month, int year) {
    // Simple conversion: year*365 + month*30 + day
    return year * 365LL + month * 30LL + day;
}

// Check if two date ranges overlap
bool DataGenerator::datesOverlap(int d1, int m1, int y1, int d2, int m2, int y2,
                                 int d3, int m3, int y3, int d4, int m4, int y4) {
    long long start1 = dateToDays(d1, m1, y1);
    long long end1 = dateToDays(d2, m2, y2);
    long long start2 = dateToDays(d3, m3, y3);
    long long end2 = dateToDays(d4, m4, y4);
    
    // Two ranges overlap if: start1 < end2 AND start2 < end1
    return start1 < end2 && start2 < end1;
}

string DataGenerator::generateRandomName() {
    static vector<string> first = {"Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Võ", "Đặng", "Bùi", "Cao"};
    static vector<string> middle = {"Minh", "Văn", "Thị", "Anh", "Tấn", "Hữu", "Thanh", "Quốc", "Khánh", "Vinh"};
    static vector<string> last = {"An", "Bình", "Cường", "Đức", "Hiền", "Hùng", "Lan", "Linh", "Mạnh", "Nam", "Phong", "Sơn", "Tùng", "Uyên", "Vân", "Việt"};
    string name = first[rand() % first.size()] + " " + middle[rand() % middle.size()] + " " + last[rand() % last.size()];
    return name;
}

string DataGenerator::generateRandomPhone() {
    string s = "0";
    for (int i = 0; i < 9; i++) s += char('0' + rand() % 10);
    return s;
}

string DataGenerator::generateRandomIdCard() {
    string s;
    for (int i = 0; i < 12; i++) s += char('0' + rand() % 10);
    return s;
}

int DataGenerator::randomInt(int min, int max) {
    if (min >= max) return min;
    return min + rand() % (max - min + 1);
}

bool DataGenerator::randomBool() {
    return rand() % 2 == 0;
}

void DataGenerator::generateRooms(RoomManager& roomMgr, int count) {
    // Three room types with ascending prices
    vector<pair<string, pair<double, double>>> types = {
        {"Standard", {100.0, 300.0}},   // min: 100, max: 300
        {"Deluxe", {400.0, 800.0}},     // min: 400, max: 800
        {"VIP", {1000.0, 2500.0}}       // min: 1000, max: 2500
    };
    vector<string> services = {"Breakfast", "Spa", "AirportPickup", "ExtraBed", "Laundry"};
    
    // Shuffle room types to mix Standard, Deluxe, VIP throughout
    vector<int> typeIndices;
    int roomsPerType = count / 3;
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < roomsPerType; j++) {
            typeIndices.push_back(i);
        }
    }
    // Add remaining rooms to balance
    for (int i = 0; i < count % 3; i++) {
        typeIndices.push_back(i);
    }
    // Shuffle the array to mix room types
    for (int i = typeIndices.size() - 1; i > 0; i--) {
        int j = rand() % (i + 1);
        swap(typeIndices[i], typeIndices[j]);
    }
    
    for (int i = 0; i < count; i++) {
        string id = "R" + (i < 9 ? string("00") + to_string(i+1) : (i < 99 ? string("0") + to_string(i+1) : to_string(i+1)));
        int typeIndex = typeIndices[i];
        string type = types[typeIndex].first;
        
        // Generate price within type range
        double minPrice = types[typeIndex].second.first;
        double maxPrice = types[typeIndex].second.second;
        double price = minPrice + (rand() % 100) / 100.0 * (maxPrice - minPrice);
        
        roomMgr.addRoom(id, type, price);

        // Initially all rooms available; will be updated after reservations
        roomMgr.updateRoomStatus(id, true);

        // Add some random services occasionally
        if (randomInt(0, 100) < 30) {
            int svcCount = randomInt(1, 2);
            for (int s = 0; s < svcCount; s++) {
                string svc = services[rand() % services.size()];
                double svcPrice = randomInt(100, 500) / 10.0; // 10.0 - 50.0
                int qty = randomInt(1, 2);
                ServiceManagement::addServiceToRoom(roomMgr, id, svc, svcPrice, qty);
            }
        }
    }
}

void DataGenerator::generateCustomers(CustomerManager& custMgr, int count) {
    for (int i = 0; i < count; i++) {
        string id = "C" + (i < 9 ? string("00") + to_string(i+1) : (i < 99 ? string("0") + to_string(i+1) : to_string(i+1)));
        string name = generateRandomName();
        string idCard = generateRandomIdCard();
        string phone = generateRandomPhone();
        custMgr.addCustomer(id, name, idCard, phone);
    }
}

void DataGenerator::generateReservations(ReservationManager& resMgr, 
                                        RoomManager& roomMgr, 
                                        CustomerManager& custMgr, 
                                        int count) {
    int roomCount = roomMgr.getRoomCount();
    int custCount = custMgr.getCustomerCount();
    if (roomCount == 0 || custCount == 0) return;

    Room* rooms = roomMgr.getRooms();
    vector<string> statuses = {"pending", "checkedIn", "checkedOut"};
    
    // Track existing reservations for overlap checking
    // Key: roomId, Value: vector of (checkInDay, checkInMonth, checkInYear, checkOutDay, checkOutMonth, checkOutYear)
    map<string, vector<tuple<int, int, int, int, int, int>>> roomReservations;

    int created = 0;
    int attempts = 0;
    int maxAttempts = count * 10; // Prevent infinite loop

    while (created < count && attempts < maxAttempts) {
        attempts++;
        
        string resId = "RES" + to_string(created + 1);
        
        // Choose customer cyclically
        int custIndex = created % custCount;
        string custId = "C" + (custIndex < 9 ? string("00") + to_string(custIndex+1) : 
                               (custIndex < 99 ? string("0") + to_string(custIndex+1) : 
                                to_string(custIndex+1)));

        // Choose room with rotation (spread across rooms)
        int roomIndex = (created * 7) % roomCount;
        string roomId = rooms[roomIndex].roomId;

        // Generate dates (2025-2026 only per spec)
        int inY = randomInt(2025, 2026);
        int inM = randomInt(1, 12);
        int inD = randomInt(1, 28);
        int stay = randomInt(1, 7);
        int outD = inD + stay;
        int outM = inM;
        int outY = inY;
        if (outD > 28) { 
            outD -= 28; 
            outM++; 
            if (outM > 12) { 
                outM = 1; 
                outY++; 
            } 
        }

        // Check for overlap with existing reservations for this room
        bool hasOverlap = false;
        if (roomReservations.find(roomId) != roomReservations.end()) {
            for (const auto& existing : roomReservations[roomId]) {
                int exD1, exM1, exY1, exD2, exM2, exY2;
                tie(exD1, exM1, exY1, exD2, exM2, exY2) = existing;
                
                if (datesOverlap(inD, inM, inY, outD, outM, outY,
                                exD1, exM1, exY1, exD2, exM2, exY2)) {
                    hasOverlap = true;
                    break;
                }
            }
        }

        // If no overlap, create the reservation
        if (!hasOverlap) {
            // Assign status based on date relative to today (2025-12-25)
            const int TY = 2025, TM = 12, TD = 25;
            auto before_today = [&](int y2, int m2, int d2) {
                if (y2 != TY) return y2 < TY;
                if (m2 != TM) return m2 < TM;
                return d2 < TD;
            };
            auto after_today = [&](int y1, int m1, int d1) {
                if (y1 != TY) return y1 > TY;
                if (m1 != TM) return m1 > TM;
                return d1 > TD;
            };
            auto includes_today = [&](int y1, int m1, int d1, int y2, int m2, int d2) {
                auto leq = [](int a, int b, int c, int x, int y, int z) {
                    if (a != x) return a < x; if (b != y) return b < y; return c <= z;
                };
                auto geq = [](int a, int b, int c, int x, int y, int z) {
                    if (a != x) return a > x; if (b != y) return b > y; return c >= z;
                };
                return leq(y1, m1, d1, TY, TM, TD) && geq(y2, m2, d2, TY, TM, TD);
            };

            string status;
            int rand_val = rand() % 100;
            if (before_today(outY, outM, outD)) {
                // Past -> checkedOut or cancel
                status = (rand_val < 20) ? "cancel" : "checkedOut";
            } else if (after_today(inY, inM, inD)) {
                // Future -> pending
                status = "pending";
            } else if (includes_today(inY, inM, inD, outY, outM, outD)) {
                // Spans today -> checkedIn, pending, or cancel
                if (rand_val < 50) {
                    status = "checkedIn";
                } else if (rand_val < 85) {
                    status = "pending";
                } else {
                    status = "cancel";
                }
            } else {
                status = "pending";
            }

            resMgr.makeReservation(resId, custId, roomId, inD, inM, inY, outD, outM, outY, 
                                  custMgr, roomMgr, status);
            roomReservations[roomId].push_back(make_tuple(inD, inM, inY, outD, outM, outY));
            created++;
        }
    }

    if (created < count) {
        cout << "\n[Warning] Only created " << created << " out of " << count 
             << " reservations due to overlap conflicts.\n";
    }
}

void DataGenerator::generateInvoices(InvoiceManager& invMgr,
                                    RoomManager& roomMgr,
                                    ReservationManager& resMgr,
                                    CustomerManager& custMgr,
                                    int count) {
    // Strictly rebuild invoices from reservations that have status=checkedOut
    // Ignores 'count' and ensures invoices.json matches reservation data
    int created = invMgr.rebuildFromReservationsStrict(resMgr, roomMgr);
    cout << "Generated invoices (strict from reservations): " << created << "\n";
}

void DataGenerator::generateAllData(RoomManager& roomMgr,
                                   CustomerManager& custMgr,
                                   ReservationManager& resMgr,
                                   InvoiceManager& invMgr,
                                   int roomCount,
                                   int customerCount) {
    // Seed random
    srand((unsigned)time(nullptr));

    cout << "\n[Generating data...]\n";
    cout << "Generating " << roomCount << " rooms...\n";
    generateRooms(roomMgr, roomCount);
    
    cout << "Generating " << customerCount << " customers...\n";
    generateCustomers(custMgr, customerCount);
    
    // Auto-calculate reservation count based on rooms and customers
    // Formula: Each room can be booked multiple times in different date ranges
    // Each customer can make multiple bookings
    // Safe estimate: (rooms * 2) + (customers * 2) - avoids overlap issues
    int autoReservationCount = roomCount * 2 + customerCount * 2;
    int autoInvoiceCount = autoReservationCount * 6 / 10; // 60% checkout rate
    
    cout << "\n[Auto-calculated counts]\n";
    cout << "Rooms: " << roomCount << endl;
    cout << "Customers: " << customerCount << endl;
    cout << "Target Reservations: " << autoReservationCount << " (may be less due to overlap avoidance)\n";
    cout << "Target Invoices: " << autoInvoiceCount << endl;

    generateReservations(resMgr, roomMgr, custMgr, autoReservationCount);
    
    // Update room availability based on reservations (only unavailable if checkedIn spans today)
    cout << "Updating room availability based on reservations...\n";
    const int TY = 2025, TM = 12, TD = 25;
    auto includes_today = [](int y1, int m1, int d1, int y2, int m2, int d2) {
        const int TY = 2025, TM = 12, TD = 25;
        auto leq = [](int a, int b, int c, int x, int y, int z) {
            if (a != x) return a < x; if (b != y) return b < y; return c <= z;
        };
        auto geq = [](int a, int b, int c, int x, int y, int z) {
            if (a != x) return a > x; if (b != y) return b > y; return c >= z;
        };
        return leq(y1, m1, d1, TY, TM, TD) && geq(y2, m2, d2, TY, TM, TD);
    };
    
    // First set all rooms to available
    Room* rooms = roomMgr.getRooms();
    int totalRooms = roomMgr.getRoomCount();
    for (int i = 0; i < totalRooms; i++) {
        roomMgr.updateRoomStatus(rooms[i].roomId, true);
    }
    
    // Then mark unavailable if has checkedIn reservation spanning today
    Reservation* reservations = resMgr.getReservations();
    int resCount = resMgr.getReservationCount();
    for (int i = 0; i < resCount; i++) {
        if (string(reservations[i].status) == "checkedIn" &&
            includes_today(reservations[i].checkInYear, reservations[i].checkInMonth, reservations[i].checkInDay,
                          reservations[i].checkOutYear, reservations[i].checkOutMonth, reservations[i].checkOutDay)) {
            roomMgr.updateRoomStatus(reservations[i].roomId, false);
        }
    }
    
    generateInvoices(invMgr, roomMgr, resMgr, custMgr, autoInvoiceCount);
}

void DataGenerator::showMenu(RoomManager& roomMgr,
                            CustomerManager& custMgr,
                            ReservationManager& resMgr,
                            InvoiceManager& invMgr) {
    cout << "--- Data Generator ---\n";
    cout << "Nhap so luong phong: "; int r; cin >> r;
    cout << "Nhap so luong khach hang: "; int c; cin >> c;
    generateAllData(roomMgr, custMgr, resMgr, invMgr, r, c);
    cout << "\nDu lieu da duoc tao va luu vao file JSON (neu cac manager ho tro).\n";
}
