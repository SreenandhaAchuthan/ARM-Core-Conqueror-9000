#include <stdio.h>
#include <stdlib.h>

#define MAX_TASKS_PER_CORE 100
#define MAX_TOTAL_TASKS 1000

// Part 1: Create Task and Core structs
typedef struct {
    int id;
    double compute_units;
} Task;

typedef struct {
    int id;
    double current_load;
    Task tasks[MAX_TASKS_PER_CORE];
    int num_assigned_tasks; // To keep track of how many tasks are in the array
} Core;

// Part 2: read_tasks function
void read_tasks(const char* filename, Task* tasks, int* n) {
    FILE* file = fopen(filename, "r");
    if (file == NULL) {
        printf("Error: Could not open file %s\n", filename);
        *n = 0;
        return;
    }

    *n = 0;
    double compute_units;
    
    // Read each line for compute units until EOF or maximum capacity is reached
    while (fscanf(file, "%lf", &compute_units) == 1 && *n < MAX_TOTAL_TASKS) {
        tasks[*n].id = *n + 1; // Assigning a sequential ID starting from 1
        tasks[*n].compute_units = compute_units;
        (*n)++;
    }

    fclose(file);
}

// Comparison function for qsort (descending order based on compute_units)
int compare_tasks(const void* a, const void* b) {
    Task* taskA = (Task*)a;
    Task* taskB = (Task*)b;
    
    if (taskA->compute_units < taskB->compute_units) return 1;
    if (taskA->compute_units > taskB->compute_units) return -1;
    return 0;
}

int main() {
    /* 
     * Sample tasks.txt structure (one compute unit value per line):
     * 10.5
     * 25.0
     * 8.2
     * 15.7
     * 30.1
     */

    // Part 3: Initialize an array of M cores (M=4)
    int M = 4;
    Core cores[M];

    for (int i = 0; i < M; i++) {
        cores[i].id = i + 1; // IDs 1 to 4
        cores[i].current_load = 0.0;
        cores[i].num_assigned_tasks = 0;
    }

    printf("Successfully initialized %d ARM cores.\n", M);

    // Demonstration of reading tasks
    Task all_tasks[MAX_TOTAL_TASKS];
    int num_tasks = 0;
    
    // Read tasks from tasks.txt
    read_tasks("tasks.txt", all_tasks, &num_tasks);
    
    if (num_tasks > 0) {
        printf("Read %d tasks from 'tasks.txt'.\n", num_tasks);
        
        // 1. Sort the Task array in descending order based on compute_units using qsort
        qsort(all_tasks, num_tasks, sizeof(Task), compare_tasks);

        // 2. Iterate through the sorted tasks to distribute them (LPT scheduling)
        for (int i = 0; i < num_tasks; i++) {
            
            // 3. Find the first core with the minimum current_load (matches JS reduce behavior)
            int min_core_idx = 0;
            for (int j = 1; j < M; j++) {
                if (cores[j].current_load < cores[min_core_idx].current_load) {
                    min_core_idx = j;
                }
            }

            // 4. Assign the task to the core with minimum load
            Core* selected_core = &cores[min_core_idx];
            if (selected_core->num_assigned_tasks < MAX_TASKS_PER_CORE) {
                selected_core->tasks[selected_core->num_assigned_tasks] = all_tasks[i];
                selected_core->num_assigned_tasks++;
                selected_core->current_load += all_tasks[i].compute_units;
            } else {
                printf("Warning: Core %d exceeded maximum task capacity!\n", selected_core->id);
            }
        }
        
        // 5. Print out the final summary for each core
        printf("\n--- Scheduling Summary (Longest Processing Time) ---\n");
        double max_load = 0.0;
        int max_load_core_id = -1;
        
        for (int i = 0; i < M; i++) {
            printf("Core %d Total Load: %.2f\n  => Tasks: ", cores[i].id, cores[i].current_load);
            for (int t = 0; t < cores[i].num_assigned_tasks; t++) {
                printf("[Task %d: %.2f] ", cores[i].tasks[t].id, cores[i].tasks[t].compute_units);
            }
            printf("\n\n");
            
            // Track the maximum load (bottleneck core)
            if (cores[i].current_load > max_load) {
                max_load = cores[i].current_load;
                max_load_core_id = cores[i].id;
            }
        }
        
        // 6. Print the Maximum Load (bottleneck)
        if (max_load_core_id != -1) {
            printf("----------------------------------------------------\n");
            printf("Maximum Load (Bottleneck): %.2f on Core %d\n", max_load, max_load_core_id);
            printf("Total Execution Time: %.2f units\n", max_load);
        }

    } else {
        printf("No tasks to schedule. Please make sure 'tasks.txt' is created with task data.\n");
    }

    return 0;
}
