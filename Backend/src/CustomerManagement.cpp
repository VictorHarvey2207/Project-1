#include "CustomerManagement.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <iomanip>
#include <vector>
#include <algorithm>
#include <chrono>
using namespace std;

CustomerManager::CustomerManager() : head(nullptr), count(0) {}

CustomerManager::~CustomerManager() {
    Customer* curr = head;
    while (curr) {
        Customer* temp = curr;
        curr = curr->next;
        delete temp;
    }
    custIndex.clear();
}

void CustomerManager::saveToFile() {
    ofstream file(CUSTOMER_FILE);
    if (!file.is_open()) {
        cout << "Loi: Khong the luu du lieu khach hang!\n";
        return;
    }
    
    file << "[\n";
    Customer* curr = head;
    bool first = true;
    while (curr) {
        if (!first) file << ",\n";
        file << curr->toJson();
        first = false;
        curr = curr->next;
    }
    file << "\n]\n";
    
    file.close();
}

bool CustomerManager::addCustomer(string id, string name, string idCard, string phone) {
    if (custIndex.find(id) != custIndex.end()) {
        cout << "Loi: Ma khach da ton tai!\n";
        return false;
    }
    
    Customer* newCustomer = new Customer(id, name, idCard, phone);
    newCustomer->next = head;
    head = newCustomer;
    count++;
    custIndex[id] = newCustomer;
    
    cout << "Them khach hang thanh cong!\n";
    saveToFile();
    return true;
}

bool CustomerManager::deleteCustomer(string id) {
    if (!head) {
        cout << "Loi: Danh sach khach hang rong!\n";
        return false;
    }
    
    if (head->customerId == id) {
        Customer* temp = head;
        head = head->next;
        delete temp;
        count--;
        custIndex.erase(id);
        cout << "Xoa khach hang thanh cong!\n";
        saveToFile();
        return true;
    }
    
    Customer* curr = head;
    while (curr->next) {
        if (curr->next->customerId == id) {
            Customer* temp = curr->next;
            curr->next = curr->next->next;
            delete temp;
            count--;
            custIndex.erase(id);
            cout << "Xoa khach hang thanh cong!\n";
            saveToFile();
            return true;
        }
        curr = curr->next;
    }
    
    cout << "Loi: Khong tim thay khach hang!\n";
    return false;
}

Customer* CustomerManager::findCustomer(string id) {
    auto it = custIndex.find(id);
    if (it == custIndex.end()) return nullptr;
    return it->second;
}
int CustomerManager::getCustomerCount() { 
    return count; 
}

Customer* CustomerManager::getHead() {
    return head;
}

void CustomerManager::loadFromJson(const string& json) {
    size_t pos = 1;
    while (pos < json.length()) {
        size_t start = json.find("{", pos);
        if (start == string::npos) break;
        
        size_t end = json.find("}", start);
        if (end == string::npos) break;
        
        string obj = json.substr(start, end - start + 1);
        
        string id = JsonHelper::extractValue(obj, "customerId");
        string name = JsonHelper::extractValue(obj, "fullName");
        string card = JsonHelper::extractValue(obj, "idCard");
        string phone = JsonHelper::extractValue(obj, "phoneNumber");
        
        Customer* newCust = new Customer(id, name, card, phone);
        newCust->next = head;
        head = newCust;
        count++;
        custIndex[id] = newCust;
        
        pos = end + 1;
    }
}

void CustomerManager::loadFromFile() {
    ifstream file(CUSTOMER_FILE);
    if (!file.is_open()) {
        return;
    }
    
    stringstream buffer;
    buffer << file.rdbuf();
    string json = buffer.str();
    file.close();
    
    loadFromJson(json);
}