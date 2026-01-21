cmake_minimum_required(VERSION 3.14)
project(HotelServer CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Helps VS Code IntelliSense by generating compile_commands.json
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Find packages
find_package(Threads REQUIRED)

# Include directories
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)

# HTTP-only server (cpp-httplib) that can serve both API + static frontend
set(HTTP_SERVER_SOURCES
    src/server_http.cpp
    src/RoomManagement.cpp
    src/ServiceManagement.cpp
    src/CustomerManagement.cpp
    src/ReservationManagement.cpp
    src/InvoiceManagement.cpp
    src/Structures.cpp
    src/JsonHelper.cpp
    src/AdvanceFeatures.cpp
)

# Build http server as a separate executable
add_executable(server_http ${HTTP_SERVER_SOURCES})

# Alternate output name (useful on Windows when server_http.exe is locked)
add_executable(server_http2 ${HTTP_SERVER_SOURCES})

# Independent benchmark runner (in-memory; does not start the web server)
add_executable(benchmark
    src/BenchmarkRunner.cpp
    src/AdvanceFeatures.cpp
    src/Structures.cpp
    src/JsonHelper.cpp
)

# Link libraries
target_link_libraries(server_http Threads::Threads)
if(WIN32)
    target_link_libraries(server_http ws2_32)
endif()

target_link_libraries(server_http2 Threads::Threads)
if(WIN32)
    target_link_libraries(server_http2 ws2_32)
endif()

target_link_libraries(benchmark Threads::Threads)
if(WIN32)
    target_link_libraries(benchmark ws2_32)
endif()

# Enable all warnings
if(MSVC)
    target_compile_options(server_http PRIVATE /W4)
    target_compile_options(server_http2 PRIVATE /W4)
else()
    target_compile_options(server_http PRIVATE -Wall -Wextra)
    target_compile_options(server_http2 PRIVATE -Wall -Wextra)
endif()

message(STATUS "[✓] CMake configured for HotelServer")
