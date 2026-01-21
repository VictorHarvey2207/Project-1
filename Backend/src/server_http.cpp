#include "httplib.h"
#include "RoomManagement.h"
#include "CustomerManagement.h"
#include "ReservationManagement.h"
#include "InvoiceManagement.h"
#include "JsonHelper.h"
#include "AdvanceFeatures.h"
#include "ServiceManagement.h"
#include <nlohmann/json.hpp>
#include <string>
#include <vector>
#include <algorithm>
#include <unordered_map>
#include <chrono>
#include <filesystem>

using json = nlohmann::json;

static json roomToJson(const Room &room) {
    json j;
    j["roomId"] = std::string(room.roomId);
    j["roomType"] = std::string(room.roomType);
    j["pricePerDay"] = room.pricePerDay;
    j["isAvailable"] = room.isAvailable;
    json services = json::array();
    for (Service* svc = room.serviceList; svc != nullptr; svc = svc->next) {
        services.push_back({
            {"serviceName", std::string(svc->serviceName)},
            {"price", svc->price},
            {"quantity", svc->quantity}
        });
    }
    j["services"] = services;
    return j;
}

static json customerToJson(const Customer &c) {
    json j;
    j["customerId"] = std::string(c.customerId);
    j["fullName"] = std::string(c.fullName);
    j["idCard"] = std::string(c.idCard);
    j["phoneNumber"] = std::string(c.phoneNumber);
    return j;
}

static json reservationToJson(const Reservation &r) {
    json j;
    j["reservationId"] = std::string(r.reservationId);
    j["customerId"] = std::string(r.customerId);
    j["roomId"] = std::string(r.roomId);
    j["checkInDay"] = r.checkInDay;
    j["checkInMonth"] = r.checkInMonth;
    j["checkInYear"] = r.checkInYear;
    j["checkOutDay"] = r.checkOutDay;
    j["checkOutMonth"] = r.checkOutMonth;
    j["checkOutYear"] = r.checkOutYear;
    j["status"] = std::string(r.status);
    return j;
}

static json invoiceToJson(const Invoice &inv) {
    json j;
    j["invoiceId"] = std::string(inv.invoiceId);
    j["customerId"] = std::string(inv.customerId);
    j["roomId"] = std::string(inv.roomId);
    j["checkInDay"] = inv.checkInDay;
    j["checkInMonth"] = inv.checkInMonth;
    j["checkInYear"] = inv.checkInYear;
    j["checkOutDay"] = inv.checkOutDay;
    j["checkOutMonth"] = inv.checkOutMonth;
    j["checkOutYear"] = inv.checkOutYear;
    j["roomCharge"] = inv.roomCharge;
    j["serviceCharge"] = inv.serviceCharge;
    j["totalAmount"] = inv.totalAmount;
    return j;
}

static json serviceListToJson(const Room &room) {
    json arr = json::array();
    int idx = 0;
    double total = 0;
    for (Service* svc = room.serviceList; svc != nullptr; svc = svc->next) {
        double line = svc->price * svc->quantity;
        total += line;
        arr.push_back({
            {"index", idx},
            {"serviceName", std::string(svc->serviceName)},
            {"price", svc->price},
            {"quantity", svc->quantity},
            {"total", line}
        });
        ++idx;
    }
    json result;
    result["items"] = arr;
    result["total"] = total;
    result["count"] = idx;
    return result;
}

static void reconcile_room_availability(RoomManager& roomMgr, ReservationManager& resMgr) {
    Room* rooms = roomMgr.getRooms();
    int roomCount = roomMgr.getRoomCount();
    Reservation* reservations = resMgr.getReservations();
    int resCount = resMgr.getReservationCount();

    // Default all rooms to available, then mark unavailable if any pending/checkedIn reservation exists.
    for (int i = 0; i < roomCount; ++i) {
        rooms[i].isAvailable = true;
    }
    for (int i = 0; i < resCount; ++i) {
        const Reservation& r = reservations[i];
        if (r.status == "pending" || r.status == "checkedIn") {
            if (Room* room = roomMgr.findRoom(r.roomId)) {
                room->isAvailable = false;
            }
        }
    }

    // Business rule: only occupied (isAvailable=false) rooms can have services.
    // If a room is available, wipe any leftover services from legacy/invalid data.
    for (int i = 0; i < roomCount; ++i) {
        if (rooms[i].isAvailable && rooms[i].serviceList != nullptr) {
            // Persist cleanup so stale services don't leak into the next occupancy.
            ServiceManagement::clearServices(roomMgr, std::string(rooms[i].roomId), true);
        }
    }

    // Persist once.
    roomMgr.saveToFile();
}

int main() {
    // Ensure we can find JSON + Frontend folder regardless of working directory.
    namespace fs = std::filesystem;
    auto hasAnyDataFile = [](const fs::path& p) {
        return fs::exists(p / "rooms.json") || fs::exists(p / "customers.json") || fs::exists(p / "reservations.json") ||
               fs::exists(p / "invoices.json");
    };
    try
    {
        const fs::path cwd = fs::current_path();
        if (!hasAnyDataFile(cwd) && hasAnyDataFile(cwd.parent_path()))
        {
            fs::current_path(cwd.parent_path());
        }
    }
    catch (...)
    {
    }

    // Load data from JSON files
    RoomManager roomMgr;
    CustomerManager custMgr;
    ReservationManager resMgr;
    InvoiceManager invMgr;

    roomMgr.loadFromFile();
    custMgr.loadFromFile();
    resMgr.loadFromFile();
    invMgr.loadFromFile();

    // Keep rooms.json and reservations.json consistent on startup.
    reconcile_room_availability(roomMgr, resMgr);

    // Merge duplicate services from legacy data (C++ equivalent of merge_duplicate_services.py).
    // No-op if there are no duplicates.
    ServiceManagement::mergeDuplicateServices(roomMgr, true);

    httplib::Server app;

    // Serve static frontend files (Frontend folder is one level up from Backend)
    if (!app.set_mount_point("/", "../Frontend")) {
        try {
            fprintf(stderr, "[Server] Warning: failed to mount ../Frontend (cwd=%s)\n", std::filesystem::current_path().string().c_str());
        } catch (...) {
            fprintf(stderr, "[Server] Warning: failed to mount ../Frontend\n");
        }
    }
    app.set_file_extension_and_mimetype_mapping(".js", "application/javascript");
    app.set_file_extension_and_mimetype_mapping(".css", "text/css");
    app.set_file_extension_and_mimetype_mapping(".html", "text/html");

    // Default entry: load dashboard (has sidebar to other pages)
    app.Get("/", [](const httplib::Request &, httplib::Response &res) {
        res.set_redirect("/Dashboard.html");
    });

    // Avoid noisy console error for missing favicon
    app.Get("/favicon.ico", [](const httplib::Request &, httplib::Response &res) {
        res.status = 204;
    });

    // Rooms
    app.Get("/api/rooms", [&roomMgr](const httplib::Request &, httplib::Response &res) {
        auto rooms = roomMgr.getRooms();
        int n = roomMgr.getRoomCount();
        json arr = json::array();
        for (int i = 0; i < n; ++i) {
            arr.push_back(roomToJson(rooms[i]));
        }
        res.set_content(arr.dump(), "application/json");
    });

    app.Get(R"(/api/rooms/(.+))", [&roomMgr](const httplib::Request &req, httplib::Response &res) {
        std::string roomId = req.matches[1];
        Room* room = roomMgr.findRoom(roomId);
        if (!room) {
            res.status = 404;
            res.set_content("{\"error\":\"Room not found\"}", "application/json");
            return;
        }
        res.set_content(roomToJson(*room).dump(), "application/json");
    });

    app.Post("/api/rooms", [&roomMgr](const httplib::Request &req, httplib::Response &res) {
        try {
            auto d = json::parse(req.body);
            roomMgr.addRoom(d.at("roomId"), d.at("roomType"), d.at("pricePerDay"));
            res.status = 201;
            res.set_content("{\"message\":\"Room added\"}", "application/json");
        } catch (const std::exception &e) {
            res.status = 400;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    });

    app.Delete(R"(/api/rooms/(.+))", [&roomMgr](const httplib::Request &req, httplib::Response &res) {
        try {
            roomMgr.deleteRoom(req.matches[1]);
            res.set_content("{\"message\":\"Room deleted\"}", "application/json");
        } catch (const std::exception &e) {
            res.status = 400;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    });

    app.Get(R"(/api/rooms/sort/(asc|desc))", [&roomMgr](const httplib::Request &req, httplib::Response &res) {
        bool asc = req.matches[1] == "asc";
        roomMgr.sortRoomsByPrice(asc);
        auto rooms = roomMgr.getRooms();
        int n = roomMgr.getRoomCount();
        json arr = json::array();
        for (int i = 0; i < n; ++i) arr.push_back(roomToJson(rooms[i]));
        res.set_content(arr.dump(), "application/json");
    });

    // Customers
    app.Get("/api/customers", [&custMgr](const httplib::Request &, httplib::Response &res) {
        json arr = json::array();
        for (Customer* c = custMgr.getHead(); c != nullptr; c = c->next) {
            arr.push_back(customerToJson(*c));
        }
        res.set_content(arr.dump(), "application/json");
    });

    app.Get(R"(/api/customers/(.+))", [&custMgr](const httplib::Request &req, httplib::Response &res) {
        std::string customerId = req.matches[1];
        Customer* customer = custMgr.findCustomer(customerId);
        if (!customer) {
            res.status = 404;
            res.set_content("{\"error\":\"Customer not found\"}", "application/json");
            return;
        }
        res.set_content(customerToJson(*customer).dump(), "application/json");
    });

    app.Post("/api/customers", [&custMgr](const httplib::Request &req, httplib::Response &res) {
        try {
            auto d = json::parse(req.body);
            custMgr.addCustomer(d.at("customerId"), d.at("fullName"), d.at("idCard"), d.at("phoneNumber"));
            res.status = 201;
            res.set_content("{\"message\":\"Customer added\"}", "application/json");
        } catch (const std::exception &e) {
            res.status = 400;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    });

    app.Delete(R"(/api/customers/(.+))", [&custMgr](const httplib::Request &req, httplib::Response &res) {
        try {
            custMgr.deleteCustomer(req.matches[1]);
            res.set_content("{\"message\":\"Customer deleted\"}", "application/json");
        } catch (const std::exception &e) {
            res.status = 400;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    });

    app.Get(R"(/api/customers/sort/(asc|desc))", [&custMgr](const httplib::Request &req, httplib::Response &res) {
        bool asc = req.matches[1] == "asc";
        std::vector<Customer*> nodes;
        for (Customer* c = custMgr.getHead(); c != nullptr; c = c->next) nodes.push_back(c);
        std::sort(nodes.begin(), nodes.end(), [asc](Customer* a, Customer* b) {
            if (asc) return a->fullName < b->fullName;
            return a->fullName > b->fullName;
        });
        json arr = json::array();
        for (Customer* c : nodes) arr.push_back(customerToJson(*c));
        res.set_content(arr.dump(), "application/json");
    });

    // Reservations
    app.Get("/api/reservations", [&resMgr, &custMgr](const httplib::Request &, httplib::Response &res) {
        auto rs = resMgr.getReservations();
        int n = resMgr.getReservationCount();
        json arr = json::array();

        for (int i = 0; i < n; ++i) {
            const Reservation &r = rs[i];
            json j = reservationToJson(r);
            if (Customer* c = custMgr.findCustomer(std::string(r.customerId))) {
                j["fullName"] = std::string(c->fullName);
            }
            arr.push_back(j);
        }
        res.set_content(arr.dump(), "application/json");
    });

    app.Post("/api/reservations", [&resMgr, &custMgr, &roomMgr](const httplib::Request &req, httplib::Response &res) {
        try {
            auto d = json::parse(req.body);
            bool ok = resMgr.makeReservation(
                d.at("reservationId"), d.at("customerId"), d.at("roomId"),
                d.at("checkInDay"), d.at("checkInMonth"), d.at("checkInYear"),
                d.at("checkOutDay"), d.at("checkOutMonth"), d.at("checkOutYear"),
                custMgr, roomMgr
            );
            if (!ok) {
                res.status = 400;
                res.set_content("{\"error\":\"Reservation failed\"}", "application/json");
                return;
            }
            res.status = 201;
            res.set_content("{\"message\":\"Reservation made\"}", "application/json");
        } catch (const std::exception &e) {
            res.status = 400;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    });

    // Check-in endpoint
    app.Post("/api/reservations/checkin", [&resMgr, &roomMgr](const httplib::Request &req, httplib::Response &res) {
        try {
            auto d = json::parse(req.body);
            std::string reservationId = d.at("reservationId");
            bool ok = resMgr.checkInByReservationId(reservationId, roomMgr);
            if (!ok) {
                res.status = 400;
                res.set_content("{\"error\":\"Check-in failed\"}", "application/json");
                return;
            }
            res.status = 200;
            res.set_content("{\"message\":\"Checked in successfully\"}", "application/json");
        } catch (const std::exception &e) {
            res.status = 400;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    });

    // Cancel reservation endpoint
    app.Post("/api/reservations/cancel", [&resMgr, &roomMgr](const httplib::Request &req, httplib::Response &res) {
        try {
            auto d = json::parse(req.body);
            std::string reservationId = d.at("reservationId");
            bool ok = resMgr.cancelReservation(reservationId, roomMgr);
            if (!ok) {
                res.status = 400;
                res.set_content("{\"error\":\"Only pending reservations can be cancelled\"}", "application/json");
                return;
            }
            res.status = 200;
            res.set_content("{\"message\":\"Reservation cancelled successfully\"}", "application/json");
        } catch (const std::exception &e) {
            res.status = 400;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    });

    // Update reservation (mainly for status updates)
    app.Put(R"(/api/reservations/(.+))", [&resMgr](const httplib::Request &req, httplib::Response &res) {
        try {
            std::string reservationId = req.matches[1];
            auto d = json::parse(req.body);
            
            if (!resMgr.findReservationById(reservationId)) {
                res.status = 404;
                res.set_content("{\"error\":\"Reservation not found\"}", "application/json");
                return;
            }
            
            // Update status if provided
            if (d.contains("status")) {
                std::string newStatus = d.at("status");
                if (!resMgr.updateStatus(reservationId, newStatus)) {
                    res.status = 400;
                    res.set_content("{\"error\":\"Failed to update status\"}", "application/json");
                    return;
                }
            }
            
            res.status = 200;
            res.set_content("{\"message\":\"Reservation updated successfully\"}", "application/json");
        } catch (const std::exception &e) {
            res.status = 400;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    });

    // Delete reservation by id
    app.Delete(R"(/api/reservations/(.+))", [&resMgr, &roomMgr](const httplib::Request &req, httplib::Response &res) {
        try {
            std::string reservationId = req.matches[1];
            bool ok = resMgr.deleteReservation(reservationId, roomMgr);
            if (!ok) {
                res.status = 404;
                res.set_content("{\"error\":\"Reservation not found\"}", "application/json");
                return;
            }
            res.status = 200;
            res.set_content("{\"message\":\"Reservation deleted\"}", "application/json");
        } catch (const std::exception &e) {
            res.status = 400;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    });

    // Service management: list all rooms that currently have services
    app.Get("/api/service/rooms", [&roomMgr, &resMgr, &custMgr](const httplib::Request &, httplib::Response &res) {
        auto rooms = roomMgr.getRooms();
        int roomCount = roomMgr.getRoomCount();
        auto reservations = resMgr.getReservations();
        int resCount = resMgr.getReservationCount();

        // Map roomId -> active reservation (prefer checkedIn over pending)
        std::unordered_map<std::string, const Reservation*> activeMap;
        for (int i = 0; i < resCount; ++i) {
            const Reservation& r = reservations[i];
            std::string status = std::string(r.status);
            if (status != "checkedIn" && status != "pending") continue;
            std::string roomId = std::string(r.roomId);
            auto it = activeMap.find(roomId);
            if (it == activeMap.end()) {
                activeMap[roomId] = &r;
            } else {
                // Upgrade pending -> checkedIn if both exist
                if (std::string(it->second->status) == "pending" && status == "checkedIn") {
                    it->second = &r;
                }
            }
        }

        json arr = json::array();
        for (int i = 0; i < roomCount; ++i) {
            const Room& room = rooms[i];
            if (room.serviceList == nullptr) continue; // only rooms with services

            std::string roomId = std::string(room.roomId);
            const Reservation* r = nullptr;
            auto it = activeMap.find(roomId);
            if (it != activeMap.end()) r = it->second;

            std::string customerId;
            std::string reservationId;
            std::string reservationStatus;
            if (r) {
                customerId = std::string(r->customerId);
                reservationId = std::string(r->reservationId);
                reservationStatus = std::string(r->status);
            }

            std::string customerName;
            if (!customerId.empty()) {
                if (Customer* c = custMgr.findCustomer(customerId)) {
                    customerName = std::string(c->fullName);
                }
            }

            int serviceCount = 0;
            for (Service* svc = room.serviceList; svc != nullptr; svc = svc->next) {
                ++serviceCount;
            }

            double serviceCharge = ServiceManagement::calculateServiceCharge(roomMgr, roomId);

            json j = {
                {"roomId", roomId},
                {"roomType", std::string(room.roomType)},
                {"pricePerDay", room.pricePerDay},
                {"isAvailable", room.isAvailable},
                {"reservationId", reservationId},
                {"reservationStatus", reservationStatus},
                {"customerId", customerId},
                {"customerName", customerName},
                {"serviceCount", serviceCount},
                {"serviceCharge", serviceCharge}
            };
            arr.push_back(j);
        }
        res.set_content(arr.dump(), "application/json");
    });

    // Service management: list services of a room
    app.Get(R"(/api/service/rooms/(.+)/services)", [&roomMgr](const httplib::Request &req, httplib::Response &res) {
        std::string roomId = req.matches[1];
        Room* room = roomMgr.findRoom(roomId);
        if (!room) {
            res.status = 404;
            res.set_content("{\"error\":\"Room not found\"}", "application/json");
            return;
        }
        json payload = serviceListToJson(*room);
        payload["roomId"] = roomId;
        res.set_content(payload.dump(), "application/json");
    });

    // Service management: add service to room
    app.Post(R"(/api/service/rooms/(.+)/services)", [&roomMgr](const httplib::Request &req, httplib::Response &res) {
        auto start = std::chrono::high_resolution_clock::now();
        try {
            std::string roomId = req.matches[1];
            auto d = json::parse(req.body);
            std::string name = d.at("serviceName");
            double price = d.at("price");
            int quantity = d.value("quantity", 1);
            if (quantity <= 0) quantity = 1;

            bool ok = ServiceManagement::addServiceToRoom(roomMgr, roomId, name, price, quantity);
            if (!ok) {
                res.status = 400;
                res.set_content("{\"error\":\"Cannot add service for this room\"}", "application/json");
                return;
            }
            Room* room = roomMgr.findRoom(roomId);
            if (!room) {
                res.status = 404;
                res.set_content("{\"error\":\"Room not found after update\"}", "application/json");
                return;
            }
            auto end = std::chrono::high_resolution_clock::now();
            std::chrono::duration<double, std::milli> elapsed = end - start;
            json payload = serviceListToJson(*room);
            payload["roomId"] = roomId;
            payload["executionMs"] = elapsed.count();
            res.status = 201;
            res.set_content(payload.dump(), "application/json");
        } catch (const std::exception &e) {
            res.status = 400;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    });

    // Service management: delete service by index
    app.Delete(R"(/api/service/rooms/(.+)/services/(\d+))", [&roomMgr](const httplib::Request &req, httplib::Response &res) {
        std::string roomId = req.matches[1];
        int index = std::stoi(req.matches[2]);
        Room* room = roomMgr.findRoom(roomId);
        if (!room) {
            res.status = 404;
            res.set_content("{\"error\":\"Room not found\"}", "application/json");
            return;
        }
        bool ok = ServiceManagement::removeServiceByIndex(roomMgr, roomId, index);
        if (!ok) {
            res.status = 400;
            res.set_content("{\"error\":\"Service index invalid\"}", "application/json");
            return;
        }
        json payload = serviceListToJson(*room);
        payload["roomId"] = roomId;
        res.set_content(payload.dump(), "application/json");
    });

    // Checkout endpoint - processes checkout and creates invoice
    app.Post("/api/checkout", [&resMgr, &roomMgr, &invMgr](const httplib::Request &req, httplib::Response &res) {
        try {
            auto d = json::parse(req.body);
            std::string reservationId = d.at("reservationId");
            
            // Find reservation
            Reservation* reservation = resMgr.findReservationById(reservationId);
            if (!reservation) {
                res.status = 404;
                res.set_content("{\"error\":\"Reservation not found\"}", "application/json");
                return;
            }
            
            // Validate reservation status
            if (reservation->status != "checkedIn") {
                res.status = 400;
                res.set_content("{\"error\":\"Only checked-in reservations can be checked out\"}", "application/json");
                return;
            }
            
            // Find room to get pricing
            Room* room = roomMgr.findRoom(reservation->roomId);
            if (!room) {
                res.status = 404;
                res.set_content("{\"error\":\"Room not found\"}", "application/json");
                return;
            }
            
            // Calculate stay duration
            auto daysBetween = [](int y1, int m1, int d1, int y2, int m2, int d2) -> int {
                // Simple calculation (not accounting for leap years perfectly, but good enough)
                int days1 = y1 * 365 + m1 * 30 + d1;
                int days2 = y2 * 365 + m2 * 30 + d2;
                return days2 - days1;
            };
            int days = daysBetween(
                reservation->checkInYear, reservation->checkInMonth, reservation->checkInDay,
                reservation->checkOutYear, reservation->checkOutMonth, reservation->checkOutDay
            );
            if (days <= 0) days = 1;
            
            // Calculate room charge
            double roomCharge = room->pricePerDay * days;
            
            // Calculate service charge
            double serviceCharge = 0.0;
            for (Service* svc = room->serviceList; svc != nullptr; svc = svc->next) {
                serviceCharge += svc->price * svc->quantity;
            }
            
            double totalAmount = roomCharge + serviceCharge;

            // Create & persist invoice first (uses current services, before clearing them)
            Invoice newInvoice;
            newInvoice.invoiceId = "INV" + std::to_string(invMgr.getInvoiceCount() + 1);
            newInvoice.customerId = reservation->customerId;
            newInvoice.roomId = reservation->roomId;
            newInvoice.checkInDay = reservation->checkInDay;
            newInvoice.checkInMonth = reservation->checkInMonth;
            newInvoice.checkInYear = reservation->checkInYear;
            newInvoice.checkOutDay = reservation->checkOutDay;
            newInvoice.checkOutMonth = reservation->checkOutMonth;
            newInvoice.checkOutYear = reservation->checkOutYear;
            newInvoice.roomCharge = roomCharge;
            newInvoice.serviceCharge = serviceCharge;
            newInvoice.totalAmount = totalAmount;

            if (!invMgr.addInvoice(newInvoice)) {
                res.status = 500;
                res.set_content("{\"error\":\"Failed to create invoice\"}", "application/json");
                return;
            }

            // Update reservation status and persist
            if (!resMgr.updateStatus(reservationId, "checkedOut")) {
                res.status = 500;
                res.set_content("{\"error\":\"Failed to update reservation status\"}", "application/json");
                return;
            }

            // Mark room available (also clears services + persists)
            roomMgr.updateRoomStatus(reservation->roomId, true);

            json result = invoiceToJson(newInvoice);
            res.status = 200;
            res.set_content(result.dump(), "application/json");
            
        } catch (const std::exception &e) {
            res.status = 400;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    });

    // Aggregate all services across rooms (flattened list)
    app.Get("/api/services", [&roomMgr](const httplib::Request &, httplib::Response &res) {
        auto rooms = roomMgr.getRooms();
        int n = roomMgr.getRoomCount();
        json arr = json::array();
        for (int i = 0; i < n; ++i) {
            const Room &room = rooms[i];
            int idx = 0;
            for (Service* svc = room.serviceList; svc != nullptr; svc = svc->next) {
                arr.push_back({
                    {"roomId", std::string(room.roomId)},
                    {"serviceName", std::string(svc->serviceName)},
                    {"price", svc->price},
                    {"quantity", svc->quantity},
                    {"total", svc->price * svc->quantity},
                    {"index", idx}
                });
                ++idx;
            }
        }
        res.set_content(arr.dump(), "application/json");
    });

    // Find room combination using backtracking
    app.Post("/api/rooms/combination", [&roomMgr](const httplib::Request &req, httplib::Response &res) {
        try {
            auto body = json::parse(req.body);
            if (!body.contains("requests") || !body["requests"].is_array()) {
                res.status = 400;
                res.set_content(json{{"error", "Missing requests array"}}.dump(), "application/json");
                return;
            }

            std::vector<std::pair<std::string, int>> requests;
            for (const auto &item : body["requests"]) {
                if (!item.contains("type") || !item.contains("count")) continue;
                std::string type = item["type"].get<std::string>();
                int count = item["count"].get<int>();
                if (type.empty() || count <= 0) continue;
                requests.push_back({type, count});
            }

            if (requests.empty()) {
                res.status = 400;
                res.set_content(json{{"error", "No valid requests"}}.dump(), "application/json");
                return;
            }

            RoomCombinationSolver solver;
            auto start = std::chrono::high_resolution_clock::now();
            bool ok = solver.findRoomCombination(requests, roomMgr.getRooms(), roomMgr.getRoomCount());
            auto end = std::chrono::high_resolution_clock::now();
            std::chrono::duration<double, std::milli> elapsed = end - start;

            if (!ok) {
                res.status = 404;
                res.set_content(json{{"message", "Không tìm được tổ hợp phù hợp"}, {"executionTimeMs", elapsed.count()}}.dump(), "application/json");
                return;
            }

            std::vector<Room*> solution = solver.getSolution();
            json arr = json::array();
            double total = 0;
            for (auto *room : solution) {
                if (!room) continue;
                arr.push_back({
                    {"roomId", std::string(room->roomId)},
                    {"roomType", std::string(room->roomType)},
                    {"pricePerDay", room->pricePerDay}
                });
                total += room->pricePerDay;
            }

            json result = {
                {"rooms", arr},
                {"totalAmount", total},
                {"executionTimeMs", elapsed.count()}
            };
            res.status = 200;
            res.set_content(result.dump(), "application/json");
        } catch (const std::exception &e) {
            res.status = 400;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    });

    // Invoices
    app.Get("/api/invoices", [&invMgr](const httplib::Request &, httplib::Response &res) {
        auto ivs = invMgr.getInvoices();
        int n = invMgr.getInvoiceCount();
        json arr = json::array();
        for (int i = 0; i < n; ++i) arr.push_back(invoiceToJson(ivs[i]));
        res.set_content(arr.dump(), "application/json");
    });

    // Delete invoice by id
    app.Delete(R"(/api/invoices/(.+))", [&invMgr](const httplib::Request &req, httplib::Response &res) {
        try {
            std::string invoiceId = req.matches[1];
            bool ok = invMgr.deleteInvoice(invoiceId);
            if (!ok) {
                res.status = 404;
                res.set_content("{\"error\":\"Invoice not found\"}", "application/json");
                return;
            }
            res.status = 200;
            res.set_content("{\"message\":\"Invoice deleted\"}", "application/json");
        } catch (const std::exception &e) {
            res.status = 400;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    });

    // Sync invoices from reservations (create missing invoices for checked-out reservations)
    app.Post("/api/invoices/sync", [&invMgr, &resMgr, &roomMgr](const httplib::Request &, httplib::Response &res) {
        int created = invMgr.syncFromReservations(resMgr, roomMgr);
        json result = {
            {"message", "Invoices synchronized"},
            {"created", created},
            {"total", invMgr.getInvoiceCount()}
        };
        res.status = 200;
        res.set_content(result.dump(), "application/json");
    });

    // Strict rebuild: overwrite invoices.json only with checkedOut reservations
    app.Post("/api/invoices/rebuild", [&invMgr, &resMgr, &roomMgr](const httplib::Request &, httplib::Response &res) {
        int created = invMgr.rebuildFromReservationsStrict(resMgr, roomMgr);
        json result = {
            {"message", "Invoices rebuilt strictly from reservations"},
            {"created", created},
            {"total", invMgr.getInvoiceCount()}
        };
        res.status = 200;
        res.set_content(result.dump(), "application/json");
    });

    const int port = 3001;

    // On Windows, binding to 0.0.0.0 can fail depending on network/firewall policy.
    // We primarily serve a local frontend, so 127.0.0.1 is sufficient.
    const char* host = "127.0.0.1";
    printf("[Server] C++ API listening on http://%s:%d\n", host, port);
    if (!app.listen(host, port)) {
        fprintf(stderr, "[Server] ERROR: failed to listen on %s:%d\n", host, port);
        fprintf(stderr, "[Server] Hint: check if port %d is blocked or in use.\n", port);
        return 1;
    }
    return 0;
}
