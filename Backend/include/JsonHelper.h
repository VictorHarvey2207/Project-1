#ifndef JSONHELPER_H
#define JSONHELPER_H

#include <string>
#include <sstream>
#include <iomanip>
using namespace std;

class JsonHelper {
public:
    static string escapeString(const string& str);
    static string unescapeString(const string& str);
    static string extractValue(const string& json, const string& key);
    static string formatPrice(double price);
    static string formatPriceDisplay(double price); // For display with thousand separator
};

#endif