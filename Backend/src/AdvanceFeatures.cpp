#include "AdvanceFeatures.h"
#include <algorithm>
using namespace std;

// ==================== ROOM COMBINATION SOLVER ====================

bool RoomCombinationSolver::backtrack(size_t requestIndex) {
    if (requestIndex == requests.size()) {
        solutions.push_back(currentSolution);
        return true;
    }
    
    RoomRequest& req = requests[requestIndex];
    int found = 0;
    
    for (Room* room : availableRooms) {
        if (room->isAvailable && room->roomType == req.roomType) {
            bool alreadyUsed = false;
            for (Room* used : currentSolution) {
                if (used->roomId == room->roomId) {
                    alreadyUsed = true;
                    break;
                }
            }
            
            if (!alreadyUsed) {
                currentSolution.push_back(room);
                found++;
                
                if (found == req.quantity) {
                    if (backtrack(requestIndex + 1)) {
                        return true;
                    }
                    for (int i = 0; i < req.quantity; i++) {
                        currentSolution.pop_back();
                    }
                    return false;
                }
            }
        }
    }
    
    for (int i = 0; i < found; i++) {
        currentSolution.pop_back();
    }
    return false;
}

bool RoomCombinationSolver::findRoomCombination(const vector<pair<string, int>>& reqs, Room* rooms, int roomCount) {
    requests.clear();
    availableRooms.clear();
    solutions.clear();
    currentSolution.clear();
    
    for (const auto& r : reqs) {
        requests.push_back({r.first, r.second});
    }
    
    for (int i = 0; i < roomCount; i++) {
        if (rooms[i].isAvailable) {
            availableRooms.push_back(&rooms[i]);
        }
    }
    
    return backtrack(0);
}

vector<Room*> RoomCombinationSolver::getSolution() {
    return solutions.empty() ? vector<Room*>() : solutions[0];
}

// ==================== PRICE OPTIMIZER ====================

double PriceOptimizer::findMinCost(vector<RoomOption>& rooms, int totalDays, vector<string>& selectedRooms) {
    int n = rooms.size();
    if (n == 0 || totalDays <= 0) return 0;
    
    vector<vector<double>> dp(n + 1, vector<double>(totalDays + 1, 1e9));
    vector<vector<int>> choice(n + 1, vector<int>(totalDays + 1, -1));
    
    for (int i = 0; i <= n; i++) {
        dp[i][0] = 0;
    }
    
    for (int i = 1; i <= n; i++) {
        for (int j = 0; j <= totalDays; j++) {
            dp[i][j] = dp[i-1][j];
            choice[i][j] = 0;
            
            int maxDays = min(j, rooms[i-1].daysAvailable);
            for (int k = 1; k <= maxDays; k++) {
                double cost = dp[i-1][j-k] + rooms[i-1].price * k;
                if (cost < dp[i][j]) {
                    dp[i][j] = cost;
                    choice[i][j] = k;
                }
            }
        }
    }
    
    selectedRooms.clear();
    int days = totalDays;
    for (int i = n; i > 0 && days > 0; i--) {
        if (choice[i][days] > 0) {
            selectedRooms.push_back(rooms[i-1].roomId + " (" + to_string(choice[i][days]) + " ngay)");
            days -= choice[i][days];
        }
    }
    
    return dp[n][totalDays];
}