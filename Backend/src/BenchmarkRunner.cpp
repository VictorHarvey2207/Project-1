#include "AdvanceFeatures.h"
#include "Structures.h"

#include <algorithm>
#include <chrono>
#include <cstdint>
#include <iomanip>
#include <iostream>
#include <random>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

using Clock = std::chrono::steady_clock;

namespace {

template <class F>
double time_ms(F&& fn, int iterations = 1) {
    volatile std::uint64_t sink = 0;
    const auto start = Clock::now();
    for (int i = 0; i < iterations; ++i) {
        sink ^= static_cast<std::uint64_t>(fn());
    }
    const auto end = Clock::now();
    (void)sink;
    std::chrono::duration<double, std::milli> elapsed = end - start;
    return elapsed.count() / std::max(1, iterations);
}

std::string make_id(const char prefix, int width, int value) {
    std::string s;
    s.reserve(static_cast<size_t>(1 + width));
    s.push_back(prefix);
    std::string num = std::to_string(value);
    if (static_cast<int>(num.size()) < width) {
        s.append(static_cast<size_t>(width - static_cast<int>(num.size())), '0');
    }
    s += num;
    return s;
}

std::string random_name(std::mt19937_64& rng) {
    static const std::vector<std::string> first = {"Nguyen", "Tran", "Le", "Pham", "Hoang", "Vu", "Vo", "Dang", "Bui", "Cao"};
    static const std::vector<std::string> middle = {"Minh", "Van", "Thi", "Anh", "Tan", "Huu", "Thanh", "Quoc", "Khanh", "Vinh"};
    static const std::vector<std::string> last = {"An", "Binh", "Cuong", "Duc", "Hien", "Hung", "Lan", "Linh", "Manh", "Nam", "Phong", "Son", "Tung", "Uyen", "Van", "Viet"};

    std::uniform_int_distribution<size_t> d1(0, first.size() - 1);
    std::uniform_int_distribution<size_t> d2(0, middle.size() - 1);
    std::uniform_int_distribution<size_t> d3(0, last.size() - 1);

    return first[d1(rng)] + " " + middle[d2(rng)] + " " + last[d3(rng)];
}

void print_row(const std::string& name, double ms) {
    std::cout << std::left << std::setw(40) << name << std::right << std::setw(12) << std::fixed
              << std::setprecision(3) << ms << " ms\n";
}

struct ResultRow {
    std::string name;
    double ms;
};

} // namespace

int main(int argc, char** argv) {
    int n = 100000;
    int backtrackRooms = 200;
    int repeats = 5;
    std::uint64_t seed = 42;

    for (int i = 1; i < argc; ++i) {
        std::string a = argv[i];
        auto next = [&]() -> const char* {
            if (i + 1 >= argc) return nullptr;
            return argv[++i];
        };

        if (a == "--n") {
            if (const char* v = next()) n = std::max(1, std::stoi(v));
        } else if (a == "--backtrack-rooms") {
            if (const char* v = next()) backtrackRooms = std::max(1, std::stoi(v));
        } else if (a == "--repeats") {
            if (const char* v = next()) repeats = std::max(1, std::stoi(v));
        } else if (a == "--seed") {
            if (const char* v = next()) seed = static_cast<std::uint64_t>(std::stoull(v));
        } else if (a == "--help" || a == "-h") {
            std::cout << "BenchmarkRunner options:\n"
                      << "  --n <int>                 dataset size (default 100000)\n"
                      << "  --backtrack-rooms <int>   rooms used for backtracking (default 200)\n"
                      << "  --repeats <int>           timing repeats (default 5)\n"
                      << "  --seed <u64>              RNG seed (default 42)\n";
            return 0;
        }
    }

    std::vector<ResultRow> results;
    results.reserve(32);

    std::mt19937_64 rng(seed);
    std::vector<Room> rooms;
    std::unordered_map<std::string, int> roomIndex;
    static const std::vector<std::string> roomTypes = {"Standard", "Deluxe", "Suite"};
    std::uniform_int_distribution<int> typeDist(0, static_cast<int>(roomTypes.size() - 1));
    std::uniform_real_distribution<double> priceDist(200.0, 2000.0);
    std::uniform_int_distribution<int> idDist(0, std::max(1, n) - 1);

    rooms.reserve(static_cast<size_t>(n));
    for (int i = 0; i < n; ++i) {
        Room r;
        r.roomId = make_id('R', 6, i);
        r.roomType = roomTypes[static_cast<size_t>(typeDist(rng))];
        r.pricePerDay = priceDist(rng);
        r.isAvailable = true;
        r.serviceList = nullptr;
        rooms.push_back(std::move(r));
    }

    roomIndex.reserve(static_cast<size_t>(n) * 2);
    const double buildRoomIndexMs = time_ms([&]() -> std::uint64_t {
        roomIndex.clear();
        for (int i = 0; i < n; ++i) roomIndex[rooms[i].roomId] = i;
        return static_cast<std::uint64_t>(roomIndex.size());
    });
    results.push_back({"rooms: build unordered_map index", buildRoomIndexMs});

    const double sortRoomsByPriceMs = time_ms([&]() -> std::uint64_t {
        std::vector<Room> tmp = rooms;
        std::sort(tmp.begin(), tmp.end(), [](const Room& a, const Room& b) {
            if (a.pricePerDay != b.pricePerDay) return a.pricePerDay < b.pricePerDay;
            return a.roomId < b.roomId;
        });
        return static_cast<std::uint64_t>(tmp[0].roomId.size());
    }, repeats);
    results.push_back({"rooms: sort by price (std::sort/introsort)", sortRoomsByPriceMs});

    std::vector<std::string> roomQueries;
    roomQueries.reserve(1000);
    for (int i = 0; i < 1000; ++i) roomQueries.push_back(rooms[idDist(rng)].roomId);

    const double hashLookupRoomsMs = time_ms([&]() -> std::uint64_t {
        std::uint64_t hits = 0;
        for (const auto& id : roomQueries) {
            hits += static_cast<std::uint64_t>(roomIndex.find(id) != roomIndex.end());
        }
        return hits;
    }, repeats);
    results.push_back({"rooms: hash lookup 1000 ids", hashLookupRoomsMs});

    // -------------------- Customers: sort + search --------------------
    std::vector<Customer> customers;
    std::unordered_map<std::string, int> customerIndex;

    customers.reserve(static_cast<size_t>(n));
    for (int i = 0; i < n; ++i) {
        Customer c;
        c.customerId = make_id('C', 6, i);
        c.fullName = random_name(rng);
        c.idCard = make_id('I', 8, i);
        c.phoneNumber = "09" + make_id('0', 8, i).substr(1);
        c.next = nullptr;
        customers.push_back(std::move(c));
    }

    const double sortCustomersByNameMs = time_ms([&]() -> std::uint64_t {
        std::vector<Customer> tmp = customers;
        std::sort(tmp.begin(), tmp.end(), [](const Customer& a, const Customer& b) {
            if (a.fullName != b.fullName) return a.fullName < b.fullName;
            return a.customerId < b.customerId;
        });
        return static_cast<std::uint64_t>(tmp[0].fullName.size());
    }, repeats);
    results.push_back({"customers: sort by name (std::sort/introsort)", sortCustomersByNameMs});

    customerIndex.reserve(static_cast<size_t>(n) * 2);
    const double buildCustomerIndexMs = time_ms([&]() -> std::uint64_t {
        customerIndex.clear();
        for (int i = 0; i < n; ++i) customerIndex[customers[i].customerId] = i;
        return static_cast<std::uint64_t>(customerIndex.size());
    });
    results.push_back({"customers: build unordered_map index", buildCustomerIndexMs});

    std::vector<std::string> customerQueries;
    customerQueries.reserve(1000);
    for (int i = 0; i < 1000; ++i) customerQueries.push_back(customers[idDist(rng)].customerId);

    const double hashLookupCustomersMs = time_ms([&]() -> std::uint64_t {
        std::uint64_t hits = 0;
        for (const auto& id : customerQueries) {
            hits += static_cast<std::uint64_t>(customerIndex.find(id) != customerIndex.end());
        }
        return hits;
    }, repeats);
    results.push_back({"customers: hash lookup 1000 ids", hashLookupCustomersMs});

    // -------------------- Reservations: index + active map (server join) --------------------

    std::vector<Reservation> reservations;
    reservations.reserve(static_cast<size_t>(n));

    static const std::vector<std::string> statuses = {"pending", "checkedIn", "checkedOut", "cancel"};
    std::uniform_int_distribution<int> statusDist(0, static_cast<int>(statuses.size() - 1));

    for (int i = 0; i < n; ++i) {
        Reservation r;
        r.reservationId = make_id('S', 7, i);
        r.customerId = customers[static_cast<size_t>(i)].customerId;
        r.roomId = rooms[static_cast<size_t>(i)].roomId;
        r.checkInDay = 1;
        r.checkInMonth = 1;
        r.checkInYear = 2026;
        r.checkOutDay = 2;
        r.checkOutMonth = 1;
        r.checkOutYear = 2026;
        r.status = statuses[static_cast<size_t>(statusDist(rng))];
        reservations.push_back(std::move(r));
    }

    std::unordered_map<std::string, int> reservationIndex;
    reservationIndex.reserve(static_cast<size_t>(n) * 2);
    const double buildReservationIndexMs = time_ms([&]() -> std::uint64_t {
        reservationIndex.clear();
        for (int i = 0; i < n; ++i) reservationIndex[reservations[i].reservationId] = i;
        return static_cast<std::uint64_t>(reservationIndex.size());
    });
    results.push_back({"reservations: build unordered_map index", buildReservationIndexMs});

    std::vector<std::string> reservationQueries;
    reservationQueries.reserve(1000);
    for (int i = 0; i < 1000; ++i) reservationQueries.push_back(reservations[idDist(rng)].reservationId);

    const double hashLookupReservationsMs = time_ms([&]() -> std::uint64_t {
        std::uint64_t hits = 0;
        for (const auto& id : reservationQueries) {
            hits += static_cast<std::uint64_t>(reservationIndex.find(id) != reservationIndex.end());
        }
        return hits;
    }, repeats);
    results.push_back({"reservations: hash lookup 1000 ids", hashLookupReservationsMs});

    // Mirrors /api/service/rooms join pattern: roomId -> active reservation (pending/checkedIn)
    std::unordered_map<std::string, int> activeByRoomId;
    activeByRoomId.reserve(static_cast<size_t>(n));
    const double buildActiveMapMs = time_ms([&]() -> std::uint64_t {
        activeByRoomId.clear();
        for (int i = 0; i < n; ++i) {
            const auto& r = reservations[i];
            if (r.status == "pending" || r.status == "checkedIn") {
                activeByRoomId[r.roomId] = i;
            }
        }
        return static_cast<std::uint64_t>(activeByRoomId.size());
    }, repeats);
    results.push_back({"reservations: build activeMap(roomId->reservation)", buildActiveMapMs});

    // -------------------- Invoices: sort by totalAmount --------------------

    std::vector<Invoice> invoices;
    invoices.reserve(static_cast<size_t>(n));
    std::uniform_real_distribution<double> amountDist(0.0, 500000.0);

    for (int i = 0; i < n; ++i) {
        Invoice inv;
        inv.invoiceId = make_id('V', 7, i);
        inv.totalAmount = amountDist(rng);
        invoices.push_back(std::move(inv));
    }

    const double sortInvoicesDescMs = time_ms([&]() -> std::uint64_t {
        std::vector<Invoice> tmp = invoices;
        std::sort(tmp.begin(), tmp.end(), [](const Invoice& a, const Invoice& b) {
            if (a.totalAmount != b.totalAmount) return a.totalAmount > b.totalAmount;
            return a.invoiceId < b.invoiceId;
        });
        return static_cast<std::uint64_t>(tmp[0].invoiceId.size());
    }, repeats);
    results.push_back({"invoices: sort by totalAmount desc", sortInvoicesDescMs});

    // -------------------- Backtracking: RoomCombinationSolver --------------------

    std::vector<Room> smallRooms;
    smallRooms.reserve(static_cast<size_t>(backtrackRooms));
    for (int i = 0; i < backtrackRooms; ++i) {
        Room r;
        r.roomId = make_id('B', 4, i);
        r.roomType = roomTypes[static_cast<size_t>(i % static_cast<int>(roomTypes.size()))];
        r.pricePerDay = 500.0;
        r.isAvailable = true;
        r.serviceList = nullptr;
        smallRooms.push_back(std::move(r));
    }

    std::vector<std::pair<std::string, int>> reqs = {
        {"Standard", 5},
        {"Deluxe", 5},
        {"Suite", 5},
    };

    RoomCombinationSolver solver;
    const double backtrackMs = time_ms([&]() -> std::uint64_t {
        const bool ok = solver.findRoomCombination(reqs, smallRooms.data(), static_cast<int>(smallRooms.size()));
        auto sol = solver.getSolution();
        return static_cast<std::uint64_t>(ok ? sol.size() : 0);
    }, repeats);
    results.push_back({"backtrack: RoomCombinationSolver (200 rooms)", backtrackMs});

    // -------------------- Results --------------------
    std::cout << "--- Results ---\n";
    for (const auto& r : results) {
        print_row(r.name, r.ms);
    }

    std::cout << "\nTip: run with --repeats 20 for steadier numbers.\n";
    return 0;
}
