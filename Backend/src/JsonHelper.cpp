#include "JsonHelper.h"

string JsonHelper::escapeString(const string& str) {
    string result;
    for (char c : str) {
        if (c == '"') result += "\\\"";
        else if (c == '\\') result += "\\\\";
        else if (c == '\n') result += "\\n";
        else if (c == '\r') result += "\\r";
        else if (c == '\t') result += "\\t";
        else result += c;
    }
    return result;
}

string JsonHelper::unescapeString(const string& str) {
    string result;
    for (size_t i = 0; i < str.length(); i++) {
        if (str[i] == '\\' && i + 1 < str.length()) {
            if (str[i+1] == '"') { result += '"'; i++; }
            else if (str[i+1] == '\\') { result += '\\'; i++; }
            else if (str[i+1] == 'n') { result += '\n'; i++; }
            else if (str[i+1] == 'r') { result += '\r'; i++; }
            else if (str[i+1] == 't') { result += '\t'; i++; }
            else result += str[i];
        } else {
            result += str[i];
        }
    }
    return result;
}

string JsonHelper::extractValue(const string& json, const string& key) {
    string searchKey = "\"" + key + "\":";
    size_t pos = json.find(searchKey);
    if (pos == string::npos) return "";
    
    pos += searchKey.length();
    while (pos < json.length() && (json[pos] == ' ' || json[pos] == '\t')) pos++;
    
    if (pos >= json.length()) return "";
    
    if (json[pos] == '"') {
        pos++;
        size_t endPos = pos;
        while (endPos < json.length() && json[endPos] != '"') {
            if (json[endPos] == '\\') endPos++;
            endPos++;
        }
        return unescapeString(json.substr(pos, endPos - pos));
    } else {
        size_t endPos = pos;
        while (endPos < json.length() && json[endPos] != ',' && json[endPos] != '}') {
            endPos++;
        }
        return json.substr(pos, endPos - pos);
    }
}

string JsonHelper::formatPrice(double price) {
    stringstream ss;
    ss << fixed << setprecision(3) << price;
    return ss.str();
}

string JsonHelper::formatPriceDisplay(double price) {
    stringstream ss;
    ss << fixed << setprecision(3) << price;
    string priceStr = ss.str();
    
    // Add thousand separator (dot) for prices >= 1000
    // Example: 1465.000 -> 1.465.000
    size_t dotPos = priceStr.find('.');
    if (dotPos != string::npos) {
        int intLength = dotPos;
        if (intLength > 3) {
            string intPart = priceStr.substr(0, dotPos);
            string decimalPart = priceStr.substr(dotPos);
            
            string formattedInt;
            int count = 0;
            for (int i = intPart.length() - 1; i >= 0; i--) {
                if (count == 3) {
                    formattedInt = "." + formattedInt;
                    count = 0;
                }
                formattedInt = intPart[i] + formattedInt;
                count++;
            }
            return formattedInt + decimalPart;
        }
    }
    return priceStr;
}