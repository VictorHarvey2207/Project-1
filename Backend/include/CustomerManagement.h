#ifndef CUSTOMERMANAGER_H
#define CUSTOMERMANAGER_H

#include "Structures.h"
#include <string>
#include <unordered_map>
using namespace std;

class CustomerManager {
private:
    Customer* head;
    int count;
    const string CUSTOMER_FILE = "customers.json";
    
    void saveToFile();
    unordered_map<string, Customer*> custIndex;
    
public:
    CustomerManager();
    ~CustomerManager();
    
    bool addCustomer(string id, string name, string idCard, string phone);
    bool deleteCustomer(string id);
    Customer* findCustomer(string id);
    int getCustomerCount();
    Customer* getHead();
    void loadFromJson(const string& json);
    void loadFromFile();
};

#endif