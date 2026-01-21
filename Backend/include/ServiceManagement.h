#ifndef SERVICEMANAGEMENT_H
#define SERVICEMANAGEMENT_H

#include <string>

class RoomManager;

class ServiceManagement {
public:
    static bool addServiceToRoom(RoomManager& roomMgr,
                                const std::string& roomId,
                                const std::string& serviceName,
                                double price,
                                int quantity);

    static bool removeServiceByIndex(RoomManager& roomMgr,
                                    const std::string& roomId,
                                    int index);

    static int getServiceCount(RoomManager& roomMgr,
                              const std::string& roomId);

    static double calculateServiceCharge(RoomManager& roomMgr,
                                        const std::string& roomId);

    static void clearServices(RoomManager& roomMgr,
                             const std::string& roomId,
                             bool persist = true);

    // Merge duplicate services within each room (sums quantities, removes duplicate nodes).
    // Returns number of duplicates removed.
    static int mergeDuplicateServices(RoomManager& roomMgr,
                                     bool persist = true);
};

#endif
