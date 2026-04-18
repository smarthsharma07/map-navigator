#include <iostream>
#include <string>
#include <queue>
#include <vector>
#include <algorithm>

using namespace std;

// keeps count of our campus spots
const int NUM_LOCATIONS = 12;

// Array of location names
const string locations[NUM_LOCATIONS] = {
    "Main Gate",             // 0
    "Administrative Block",  // 1
    "Library",               // 2
    "Computer Science Dept", // 3
    "Mechanical Dept",       // 4
    "Electronics Dept",      // 5
    "Auditorium",            // 6
    "Cafeteria",             // 7
    "Sports Complex",        // 8
    "Boys Hostel",           // 9
    "Girls Hostel",          // 10
    "Parking"                // 11
};

// Map names to lowercase for robust searching 
int getLocationId(const string& name) {
    for (int i = 0; i < NUM_LOCATIONS; ++i) {
        if (locations[i] == name) return i;
    }
    return -1;
}

//node for adjacency list (linked list representation
struct EdgeNode {
    int destId;
    EdgeNode* next;
    
    EdgeNode(int dest) : destId(dest), next(nullptr) {}
};

class Graph {
private:
    int numVertices;
    EdgeNode** adjList; // head pointers for the adjacency list

public:
    Graph(int vertices) : numVertices(vertices) {
        adjList = new EdgeNode*[numVertices];
        for (int i = 0; i < numVertices; ++i) {
            adjList[i] = nullptr;
        }
    }

    ~Graph() {
        for (int i = 0; i < numVertices; ++i) {
            EdgeNode* curr = adjList[i];
            while (curr != nullptr) {
                EdgeNode* temp = curr;
                curr = curr->next;
                delete temp;
            }
        }
        delete[] adjList;
    }

    // helper to insert paths in sorted order to ensure consistent tie-breakers during BFS
    void insertSorted(int src, int dest) {
        EdgeNode* newNode = new EdgeNode(dest);
        // If list is empty or the new node should be the first element
        if (adjList[src] == nullptr || adjList[src]->destId > dest) {
            newNode->next = adjList[src];
            adjList[src] = newNode;
        } else {
            // Find the spot to insert to keep numerical/alphabetical consistency
            EdgeNode* curr = adjList[src];
            while (curr->next != nullptr && curr->next->destId < dest) {
                curr = curr->next;
            }
            newNode->next = curr->next;
            curr->next = newNode;
        }
    }

    // draws a two-way street between places consistently
    void addEdge(int src, int dest) {
        insertSorted(src, dest);
        insertSorted(dest, src);
    }

    // BFS traversal (level-order) to find shortest path in unweighted graph
    vector<int> shortestPathBFS(int start, int target) {
        //  Edge Case: Start is the destination
        if (start == target) return {start};

        // State Tracking: visited avoids cycles and parent reconstruces path
        bool* visited = new bool[numVertices]();
        int* parent = new int[numVertices];
        for (int i = 0; i < numVertices; ++i) parent[i] = -1;

        // FIFO Queue: Essential for BFS to process nodes strictly layer-by-layer
        queue<int> q; 
        
        visited[start] = true;
        q.push(start);
        
        bool found = false;

        while (!q.empty() && !found) {
            int curr = q.front();
            q.pop();

            EdgeNode* temp = adjList[curr];
            while (temp != nullptr) {
                int neighbor = temp->destId;
                if (!visited[neighbor]) {
                    visited[neighbor] = true;
                    parent[neighbor] = curr;
                    if (neighbor == target) {
                        found = true;
                        break;
                    }
                    
                    q.push(neighbor);
                }
                temp = temp->next;
            }
        }

        // Walk backwards using the 'parent'
        vector<int> path;
        if (found) {
            int curr = target;
            while (curr != -1) {
                path.push_back(curr);
                curr = parent[curr];
            }
            // Reverse to restore source-to-destination order
            reverse(path.begin(), path.end());
        }
        delete[] visited;
        delete[] parent;

        return path;
    }
};

void printJSONPath(const vector<int>& path) {
    cout << "{\"path\": [";
    for (size_t i = 0; i < path.size(); ++i) {
        cout << "\"" << locations[path[i]] << "\"";
        if (i < path.size() - 1) {
            cout << ", ";
        }
    }
    cout << "]}" << endl;
}

void printJSONLocations() {
    cout << "{\"locations\": [";
    for (int i = 0; i < NUM_LOCATIONS; ++i) {
        cout << "\"" << locations[i] << "\"";
        if (i < NUM_LOCATIONS - 1) cout << ", ";
    }
    cout << "]}" << endl;
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        cerr << "Usage: map_navigator <command> [args]" << endl;
        cerr << "Commands:" << endl;
        cerr << "  locations          - Get all location names" << endl;
        cerr << "  path <src> <dest>  - Get shortest path between src and dest" << endl;
        return 1;
    }

    string command = argv[1];

    if (command == "locations") {
        printJSONLocations();
        return 0;
    }

    if (command == "path") {
        if (argc < 4) {
            cerr << "Error: 'path' command requires <src> and <dest> IDs." << endl;
            return 1;
        }

        int src = stoi(argv[2]);
        int dest = stoi(argv[3]);

        if (src < 0 || src >= NUM_LOCATIONS || dest < 0 || dest >= NUM_LOCATIONS) {
            cerr << "Error: Invalid location IDs." << endl;
            return 1;
        }

        Graph g(NUM_LOCATIONS);
        // Building the campus map
        
        g.addEdge(0, 1);  // Main Gate <-> Admin
        g.addEdge(1, 2);  // Admin <-> Library
        g.addEdge(1, 3);  // Admin <-> CS Dept

        // 2. Vertical Cross-Paths (Prevents visual backtracking)
        g.addEdge(0, 11); // Main Gate <-> Parking
        g.addEdge(2, 3);  // Library <-> CS Dept
        g.addEdge(4, 5);  // Mech <-> Elec

        // 3. Right Wing connections
        g.addEdge(11, 2); // Parking <-> Library
        g.addEdge(2, 6);  // Library <-> Auditorium
        g.addEdge(3, 4);  // CS Dept <-> Mech Dept
        g.addEdge(3, 5);  // CS Dept <-> Elec Dept
        
        // 4. Converging towards Cafeteria & Sports
        g.addEdge(4, 7);  // Mech Dept <-> Cafeteria
        g.addEdge(6, 7);  // Auditorium <-> Cafeteria
        g.addEdge(7, 8);  // Cafeteria <-> Sports Complex

        // 5. Hostels
        g.addEdge(8, 9);  // Sports Complex <-> Boys Hostel
        g.addEdge(8, 10); // Sports Complex <-> Girls Hostel

        vector<int> path = g.shortestPathBFS(src, dest);
        printJSONPath(path);
        
        return 0;
    }

    cerr << "Unknown command." << endl;
    return 1;
}
