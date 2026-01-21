#ifndef ADVANCEFEATURES_H
#define ADVANCEFEATURES_H

#include "Structures.h"
#include <vector>
#include <string>
#include <functional>
using namespace std;

class RoomCombinationSolver {
private:
    struct RoomRequest {
        string roomType;
        int quantity;
    };
    
    vector<RoomRequest> requests;
    vector<Room*> availableRooms;
    vector<vector<Room*>> solutions;
    vector<Room*> currentSolution;
    
    bool backtrack(size_t requestIndex);
    
public:
    bool findRoomCombination(const vector<pair<string, int>>& reqs, Room* rooms, int roomCount);
    vector<Room*> getSolution();
};

class PriceOptimizer {
public:
    struct RoomOption {
        string roomId;
        string roomType;
        double price;
        int daysAvailable;
    };
    
    static double findMinCost(vector<RoomOption>& rooms, int totalDays, vector<string>& selectedRooms);
};

#endif