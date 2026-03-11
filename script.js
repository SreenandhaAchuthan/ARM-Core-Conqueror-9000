document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Chart.js
    const ctx = document.getElementById('energyChart').getContext('2d');
    let energyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['1.0GHz', '2.0GHz', '3.0GHz', '4.0GHz', '5.0GHz'],
            datasets: [{
                label: 'Relative Power Consumption',
                data: [1, 8, 27, 64, 125], // P ∝ f^3 simplified curve
                borderColor: '#00F0FF',
                backgroundColor: 'rgba(0, 240, 255, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: '#10B981',
                pointBorderColor: '#fff',
                pointRadius: 4,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return ' ' + context.parsed.y + ' W (est.)';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
                    ticks: { color: '#9CA3AF', font: { family: 'Roboto Mono', size: 10 } }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
                    ticks: { color: '#9CA3AF', font: { family: 'Roboto Mono', size: 10 } }
                }
            }
        }
    });

    // 1b. Initialize Scalability Chart
    const scaleCtx = document.getElementById('scalabilityChart').getContext('2d');
    let scaleChart = new Chart(scaleCtx, {
        type: 'line',
        data: {
            labels: ['10', '25', '50', '75', '100'],
            datasets: [
                {
                    label: 'Standard Scheduling',
                    data: [15, 40, 95, 160, 230], // Dummy curve 1
                    borderColor: '#EF4444', // Red
                    borderWidth: 2,
                    pointRadius: 2,
                    tension: 0.3
                },
                {
                    label: 'LPT Scheduling',
                    data: [12, 30, 65, 100, 140], // Dummy curve 2
                    borderColor: '#10B981', // Green
                    borderWidth: 2,
                    pointRadius: 2,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#9CA3AF', font: { size: 10 } }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Tasks', color: '#6B7280', font: { size: 10 } },
                    grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
                    ticks: { color: '#9CA3AF', font: { size: 10 } }
                },
                y: {
                    title: { display: true, text: 'Time', color: '#6B7280', font: { size: 10 } },
                    grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
                    ticks: { color: '#9CA3AF', font: { size: 10 } }
                }
            }
        }
    });

    // 2. Handle Simulation Action
    function runSimulation() {
        const numCores = parseInt(document.getElementById('numCores').value);
        const tasksStr = document.getElementById('taskInputs').value;
        const targetFreqMin = parseFloat(document.getElementById('freqMin').value);
        const targetFreqMax = parseFloat(document.getElementById('freqMax').value);
        const taskDependencies = document.getElementById('taskDependencies')?.checked || false;

        // Parse and validate tasks
        let parsedTasks = tasksStr.split(',')
            .map((s, idx) => ({ weight: parseFloat(s.trim()), originalIndex: idx }))
            .filter(t => !isNaN(t.weight) && t.weight > 0);

        if (parsedTasks.length === 0 || isNaN(numCores) || numCores < 1 || numCores > 128) {
            alert("Please enter valid parameters. Needs at least 1 core and valid numeric compute units.");
            return;
        }

        // Apply LPT (Longest Processing Time) Scheduling Algorithm
        // Step 1: Sort tasks in descending order
        let tasks = sortTasks(parsedTasks);

        // Step 2 & 3: Initialize Cores & Distribute Tasks properly
        let cores = assignTasks(tasks, numCores, taskDependencies, parsedTasks.length);

        // Step 4.5: Calculate Heat Index and render Visuals
        const alpha = parseFloat(document.getElementById('alpha')?.value || 1.5);
        renderVisualization(cores, alpha, targetFreqMin, targetFreqMax);

        // Step 5: Metrics Calculations
        calculateAndDisplayMetrics(cores, targetFreqMin, targetFreqMax);
        updateChartWithResults(cores, targetFreqMin, targetFreqMax, energyChart);

        // Simulating the workload scalability curve updates for effect
        updateScalabilityChart(tasks.length, scaleChart);

        // Step 6: Update Live Documentation Dashboard
        const isThrottled = parseFloat(document.getElementById('freqMax').value) > 3.8 && Math.max(...cores.map(c => c.load)) > 50; // Approximating throttled check for the doc call to match UI visually
        const effGainStr = document.getElementById('efficiencyGain')?.innerText || '--';
        const optFreqUI = document.getElementById('optimalFreq')?.innerText || document.getElementById('freqMax').value;
        const finalMaxLoad = Math.max(...cores.map(c => c.load));
        updateLiveDocumentation(parsedTasks, tasks, optFreqUI, isThrottled, numCores);
    }

    document.getElementById('runBtn').addEventListener('click', runSimulation);

    // 3. Real-time updates for sliders and inputs
    const inputsToWatch = ['freqMin', 'freqMax', 'alpha', 'beta'];
    inputsToWatch.forEach(id => {
        const el = document.getElementById(id);
        const valEl = document.getElementById(id + 'Val');
        if (el) {
            el.addEventListener('input', (e) => {
                if (valEl) valEl.innerText = parseFloat(e.target.value).toFixed(1);
                runSimulation();
            });
        }
    });

    ['numCores', 'taskInputs', 'taskDependencies'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', runSimulation);
        }
    });

    document.getElementById('reportBtn')?.addEventListener('click', () => {
        window.print();
    });

    // 4. Tab Navigation Logic
    const tabDashboard = document.getElementById('tabDashboard');
    const tabDoc = document.getElementById('tabDoc');
    const dashboardView = document.getElementById('dashboardView');
    const docView = document.getElementById('docView');

    function switchTab(view) {
        if (view === 'dashboard') {
            tabDashboard.className = 'text-neon border-b-2 border-neon pb-2 font-medium tracking-wide transition-all';
            tabDoc.className = 'text-gray-400 border-b-2 border-transparent hover:text-gray-200 pb-2 font-medium tracking-wide transition-all';
            dashboardView.classList.remove('hidden');
            docView.classList.add('hidden');
        } else {
            tabDoc.className = 'text-neon border-b-2 border-neon pb-2 font-medium tracking-wide transition-all';
            tabDashboard.className = 'text-gray-400 border-b-2 border-transparent hover:text-gray-200 pb-2 font-medium tracking-wide transition-all';
            docView.classList.remove('hidden');
            dashboardView.classList.add('hidden');
        }
    }

    tabDashboard?.addEventListener('click', () => switchTab('dashboard'));
    tabDoc?.addEventListener('click', () => switchTab('doc'));

    // 5. Documentation Inline Editing & Tooltip Syncing
    document.querySelectorAll('.edit-doc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const isEditing = btn.innerText === 'SAVE';

            // For Variable Definitions, they share a container with multiple editable elements
            const targetId = btn.getAttribute('data-target');
            let contentElements;

            if (targetId === 'doc-vars') {
                contentElements = [document.getElementById('doc-var-alpha'), document.getElementById('doc-var-beta')];
            } else {
                contentElements = [document.getElementById(targetId)];
            }

            const shouldSync = btn.getAttribute('data-sync') === 'true';

            if (!isEditing) {
                // Switch to Edit Mode
                btn.innerText = 'SAVE';
                btn.classList.replace('text-gray-300', 'text-white');
                if (btn.classList.contains('text-neon')) {
                    btn.classList.replace('text-neon', 'text-white');
                }

                contentElements.forEach((el, idx) => {
                    if (el) {
                        el.setAttribute('contenteditable', 'true');
                        el.classList.add('editable-active');
                        if (idx === 0) el.focus();
                    }
                });
            } else {
                // Switch back down to Save Model
                btn.innerText = 'EDIT';
                btn.classList.replace('text-white', 'text-gray-300');
                if (targetId === 'doc-vars') {
                    btn.classList.replace('text-gray-300', 'text-neon');
                }

                contentElements.forEach(el => {
                    if (el) {
                        el.setAttribute('contenteditable', 'false');
                        el.classList.remove('editable-active');
                    }
                });

                // Sync to tooltips if necessary
                if (shouldSync) {
                    const alphaTooltip = document.getElementById('alphaTooltip');
                    const betaTooltip = document.getElementById('betaTooltip');
                    const newAlphaText = document.getElementById('doc-var-alpha')?.innerText;
                    const newBetaText = document.getElementById('doc-var-beta')?.innerText;

                    if (alphaTooltip && newAlphaText) alphaTooltip.innerText = newAlphaText;
                    if (betaTooltip && newBetaText) betaTooltip.innerText = newBetaText;
                }
            }
        });
    });
});

function sortTasks(tasks) {
    // Correctly sort the task array in descending order before distribution
    return tasks.sort((a, b) => b.weight - a.weight);
}

function assignTasks(tasks, numCores, useDependencies, totalTaskCount) {
    // 1. Clear previous core state / initialize new core state
    let cores = Array.from({ length: numCores }, (_, i) => ({
        id: i + 1,
        load: 0,
        tasks: []
    }));

    let maxLoadFirstTwo = 0;

    // Distribute dependencies first if needed
    if (useDependencies && totalTaskCount >= 2) { // Changed from 5 to 2 to be more robust
        // Group tasks into "first two", "last three", and "others"
        let firstTwo = [];
        let lastThree = [];
        let others = [];

        tasks.forEach(t => {
            if (t.originalIndex === 0 || t.originalIndex === 1) firstTwo.push(t);
            else if (totalTaskCount >= 5 && t.originalIndex >= totalTaskCount - 3) lastThree.push(t);
            else others.push(t);
        });

        // Assign "first two" and "others" first batch
        let initialBatch = sortTasks([...firstTwo, ...others]);
        initialBatch.forEach(task => {
            let minCore = cores.reduce((min, core) => core.load < min.load ? core : min, cores[0]);
            minCore.tasks.push(task);
            minCore.load += task.weight;
        });

        // Find the boundary where the "first two" finished
        cores.forEach(core => {
            let currentLoad = 0;
            core.tasks.forEach(t => {
                currentLoad += t.weight;
                if (t.originalIndex === 0 || t.originalIndex === 1) {
                    if (currentLoad > maxLoadFirstTwo) maxLoadFirstTwo = currentLoad;
                }
            });
        });

        // Now schedule "last three" only after maxLoadFirstTwo (if they exist)
        if (lastThree.length > 0) {
            lastThree = sortTasks(lastThree);
            lastThree.forEach(task => {
                let minCore = cores.reduce((min, core) => core.load < min.load ? core : min, cores[0]);

                if (minCore.load < maxLoadFirstTwo) {
                    let gapWeight = maxLoadFirstTwo - minCore.load;
                    minCore.tasks.push({ weight: gapWeight, originalIndex: -1, isGap: true });
                    minCore.load = maxLoadFirstTwo;
                }

                minCore.tasks.push(task);
                minCore.load += task.weight;
            });
        }

    } else {
        // 2. Distribute tasks greedily to the most available core
        tasks.forEach(task => {
            let minCore = cores.reduce((min, core) => core.load < min.load ? core : min, cores[0]);
            minCore.tasks.push(task);
            minCore.load += task.weight;
        });
    }

    return cores;
}

// Determine RGB color from heat ratio for Heatmap (Blue -> Yellow -> Red)
function getHeatColor(heatRatio) {
    // clamp ratio between 0 and 1
    const r = Math.max(0, Math.min(1, heatRatio));
    if (r < 0.5) {
        // Blue (0, 240, 255) to Yellow (245, 158, 11)
        const factor = r * 2;
        const red = Math.round(0 + factor * (245 - 0));
        const green = Math.round(240 - factor * (240 - 158));
        const blue = Math.round(255 - factor * (255 - 11));
        return `rgb(${red}, ${green}, ${blue})`;
    } else {
        // Yellow (245, 158, 11) to Red (239, 68, 68)
        const factor = (r - 0.5) * 2;
        const red = Math.round(245 - factor * (245 - 239));
        const green = Math.round(158 - factor * (158 - 68));
        const blue = Math.round(11 + factor * (68 - 11));
        return `rgb(${red}, ${green}, ${blue})`;
    }
}

// Visually render the cores and task allocations
function renderVisualization(cores, alpha, freqMin, freqMax) {
    const container = document.getElementById('coreContainer');
    container.innerHTML = '';

    // Determine the absolute max load for scaling 100% width
    const absoluteMaxLoad = Math.max(...cores.map(c => c.load));

    // Max theoretical heat (Assuming max task load on a fast freq)
    const maxTheoreticalHeat = absoluteMaxLoad * Math.exp(alpha * freqMax);

    cores.forEach((core, i) => {
        const row = document.createElement('div');
        row.className = 'w-full flex-shrink-0 animate-fade-in-up';
        row.style.animationDelay = `${i * 50}ms`;

        // ... (label rendering unchanged code) ...
        const labelRow = document.createElement('div');
        labelRow.className = 'flex justify-between items-end mb-1';

        const coreLabel = document.createElement('span');
        coreLabel.className = 'text-xs text-slate-400 font-mono tracking-wide';
        coreLabel.innerText = `CORE [${String(core.id).padStart(2, '0')}]`;

        const loadLabel = document.createElement('span');
        loadLabel.className = 'text-xs font-mono font-bold text-slate-300';
        loadLabel.innerText = core.load.toFixed(2) + ' cyc';

        labelRow.appendChild(coreLabel);
        labelRow.appendChild(loadLabel);
        row.appendChild(labelRow);

        // Track container
        const trackBase = document.createElement('div');
        trackBase.className = 'w-full h-8 bg-slate-800/80 rounded border border-slate-700 overflow-hidden flex shadow-inner';

        // Add task blocks
        core.tasks.forEach((taskObj, idx) => {
            const block = document.createElement('div');

            if (taskObj.isGap) {
                block.className = `h-full border-r border-slate-900/40 transition-all duration-1000 ease-out`;
                block.style.backgroundColor = 'transparent';
                const percentage = absoluteMaxLoad === 0 ? 0 : (taskObj.weight / absoluteMaxLoad) * 100;
                block.style.width = '0%';
                setTimeout(() => {
                    block.style.width = `${percentage}%`;
                }, 100 + (idx * 150));
                trackBase.appendChild(block);
                return;
            }

            let task = taskObj.weight;

            // Heat Calculation -> Thermal Map Visualization
            // Heat = load * e^(alpha * freqTarget) - using an estimated active freq for the color scaling
            let estimatedFreq = ((task / absoluteMaxLoad) * (freqMax - freqMin)) + freqMin;
            let heat = task * Math.exp(alpha * estimatedFreq);
            let heatRatio = maxTheoreticalHeat > 0 ? heat / (maxTheoreticalHeat * 0.4) : 0; // *0.4 to normalize visual range slightly

            const thermalColor = getHeatColor(heatRatio);

            block.className = `h-full flex items-center justify-center border-r border-slate-900/40 text-[10px] sm:text-xs font-bold font-mono text-white/90 task-block transition-all duration-1000 ease-out shadow-[inset_0_1px_rgba(255,255,255,0.2)] hover:opacity-90 cursor-default`;

            block.style.backgroundColor = thermalColor;
            const percentage = absoluteMaxLoad === 0 ? 0 : (task / absoluteMaxLoad) * 100;
            block.style.width = '0%'; // Start at 0 for animation

            // Tooltip via title
            block.title = `Task Weight: ${task.toFixed(2)}`;

            // Only show text if block is wide enough
            if (percentage > 5) {
                block.innerText = task.toFixed(1);
            }

            // Animate width expansion
            setTimeout(() => {
                block.style.width = `${percentage}%`;
            }, 100 + (idx * 150)); // Sequential pop-in

            trackBase.appendChild(block);
        });

        row.appendChild(trackBase);
        container.appendChild(row);
    });
}

function calculateEDP(energy, time) {
    // Formula: EDP = Total Energy * Total Time
    return energy * time;
}

function calculateOptimalFrequency(finalMaxLoad, freqMin, freqMax, alpha, beta, numCores) {
    let minEdp = Infinity;
    let optFreq = freqMax;

    // Search loop with 0.05 step
    for (let f = freqMin; f <= freqMax; f += 0.05) {
        let timeAtFreq = finalMaxLoad / (beta * f);
        let powerAtFreq = numCores * Math.exp(alpha * f);
        let energyAtFreq = powerAtFreq * timeAtFreq;
        let currentEdp = calculateEDP(energyAtFreq, timeAtFreq);

        if (currentEdp < minEdp) {
            minEdp = currentEdp;
            optFreq = f;
        }
    }

    return Math.round(optFreq * 100) / 100;
}

function calculateAndDisplayMetrics(cores, freqMin, freqMax) {
    const totalTimeEl = document.getElementById('totalTime');
    const optimalFreqEl = document.getElementById('optimalFreq');
    const energyValEl = document.getElementById('energyVal');
    const edpValEl = document.getElementById('edpVal');

    const alpha = parseFloat(document.getElementById('alpha')?.value || 1.5);
    let beta = parseFloat(document.getElementById('beta')?.value || 0.8);
    const numCores = cores.length;

    const finalMaxLoad = Math.max(...cores.map(c => c.load));
    const optFreq = calculateOptimalFrequency(finalMaxLoad, freqMin, freqMax, alpha, beta, numCores);

    // Thermal Throttling Logic
    const isThrottled = optFreq > 3.8 && finalMaxLoad > 50;
    const statusTextEl = document.getElementById('systemStatusText');

    if (isThrottled) {
        beta = beta * 0.8;
        if (statusTextEl) {
            statusTextEl.innerText = 'THERMAL WARNING';
            statusTextEl.className = 'text-red-500 font-bold animate-pulse';
        }
        document.querySelectorAll('.task-block').forEach(el => el.classList.add('throttled-block'));
    } else {
        if (statusTextEl) {
            statusTextEl.innerText = 'ONLINE';
            statusTextEl.className = 'text-neon font-bold animate-pulse';
        }
        document.querySelectorAll('.task-block').forEach(el => el.classList.remove('throttled-block'));
    }

    // New Formulas
    const timeScaled = finalMaxLoad / (beta * optFreq);
    const power = numCores * Math.exp(alpha * optFreq);
    const energy = power * timeScaled;
    const edp = calculateEDP(energy, timeScaled);

    // Calculate Baseline (Max Performance at freqMax)
    const baseTime = finalMaxLoad / (beta * freqMax);
    const basePower = numCores * Math.exp(alpha * freqMax);
    const baseEnergy = basePower * baseTime;
    const baseEdp = calculateEDP(baseEnergy, baseTime);

    // Update Baseline UI immediately
    document.getElementById('baseEnergy').innerText = baseEnergy.toFixed(1);
    document.getElementById('baseEdp').innerText = baseEdp.toFixed(1);

    // Update Optimized UI
    document.getElementById('optEnergy').innerText = energy.toFixed(1);
    document.getElementById('optEdp').innerText = edp.toFixed(1);

    // Efficiency Gain
    const effGain = ((baseEnergy - energy) / baseEnergy) * 100;
    const effEl = document.getElementById('efficiencyGain');
    if (effGain > 0) {
        effEl.innerText = `Total Energy Efficiency Gain: ${effGain.toFixed(1)}%`;
        effEl.className = "text-sm font-bold text-neon";
    } else {
        effEl.innerText = `Efficiency Loss: ${Math.abs(effGain).toFixed(1)}%`;
        effEl.className = "text-sm font-bold text-red-500";
    }

    // Animation function for current status metrics
    animateValue(totalTimeEl, 0, timeScaled, 800, 'cyc', 2);
    animateValue(optimalFreqEl, 0, optFreq, 800, 'GHz', 2);
    animateValue(energyValEl, 0, energy, 800, 'J', 1);
    if (edpValEl) animateValue(edpValEl, 0, edp, 800, '', 1);
}

function updateLiveDocumentation(originalTasks, sortedTasks, optFreqStr, isThrottled, numCores) {
    // 1. Calculate Naive FIFO makespan vs LPT makespan for Efficiency Gain
    let naiveCores = new Array(numCores).fill(0);
    originalTasks.forEach((t, idx) => {
        naiveCores[idx % numCores] += t.weight;
    });
    let naiveMax = Math.max(...naiveCores);

    let lptCores = new Array(numCores).fill(0);
    sortedTasks.forEach(t => {
        let leastLoaded = lptCores.indexOf(Math.min(...lptCores));
        lptCores[leastLoaded] += t.weight;
    });
    let lptMax = Math.max(...lptCores);

    let effGain = 0;
    if (naiveMax > 0) {
        effGain = ((naiveMax - lptMax) / naiveMax) * 100;
    }

    const lptDisplayEl = document.getElementById('docLptEfficiency');
    if (lptDisplayEl) {
        lptDisplayEl.innerText = `${effGain.toFixed(1)}% Gain`;
        lptDisplayEl.className = effGain >= 0 ? 'text-2xl font-bold text-neon mb-3 font-mono' : 'text-2xl font-bold text-red-500 mb-3 font-mono';
    }

    // 2. Thermal Safety Value (Simulated Temperature)
    const thermalValueEl = document.getElementById('docThermalValue');
    if (thermalValueEl) {
        const alpha = parseFloat(document.getElementById('alpha')?.value || 1.5);
        const freq = parseFloat(optFreqStr);
        // T = T_ambient + (k * heat) -> simplification for visual effect
        const baseTemp = 40;
        const heatFactor = Math.exp(alpha * (freq - 2.5)) * 15;
        const currentTemp = baseTemp + heatFactor;

        if (isThrottled) {
            thermalValueEl.innerText = `${currentTemp.toFixed(1)} °C (WARNING)`;
            thermalValueEl.className = 'text-2xl font-bold text-red-500 mb-3 font-mono animate-pulse';
        } else {
            thermalValueEl.innerText = `${currentTemp.toFixed(1)} °C (Safe)`;
            thermalValueEl.className = 'text-2xl font-bold text-emerald-400 mb-3 font-mono';
        }
    }

    // 3. Power Law Compliance Value (Current Watts)
    const powerValueEl = document.getElementById('docPowerValue');
    if (powerValueEl) {
        const energyStr = document.getElementById('energyVal')?.innerText || "0";
        const totalTimeStr = document.getElementById('totalTime')?.innerText || "1";
        const energy = parseFloat(energyStr);
        const time = parseFloat(totalTimeStr);
        const power = time > 0 ? (energy / (time * 0.1)) : 0; // Back-calculate power or use formula
        powerValueEl.innerText = `${power.toFixed(1)} Watts`;
    }

    // 4. Gantt Logic Value
    const ganttLogicEl = document.getElementById('docGanttLogic');
    if (ganttLogicEl) {
        ganttLogicEl.innerText = "Greedy LPT Active";
    }
}

function updateScalabilityChart(taskCount, chart) {
    // Generate real trend lines reflecting the efficiency of LPT vs FIFO
    const numCores = parseInt(document.getElementById('numCores').value) || 4;
    const tasksStr = document.getElementById('taskInputs').value;
    let parsedTasks = tasksStr.split(',')
        .map((s, idx) => ({ weight: parseFloat(s.trim()), originalIndex: idx }))
        .filter(t => !isNaN(t.weight) && t.weight > 0);

    let newLabels = [];
    let standardData = [];
    let lptData = [];

    const steps = 5;
    for (let i = 1; i <= steps; i++) {
        let nFac = (i / steps);
        let currentTaskCount = Math.max(1, Math.floor(parsedTasks.length * nFac * 2)); // Scale tasks up

        // Create a synthetic task list for this step
        let syntheticTasks = [];
        for (let j = 0; j < currentTaskCount; j++) {
            syntheticTasks.push({ weight: parsedTasks[j % parsedTasks.length].weight, originalIndex: j });
        }

        newLabels.push(currentTaskCount.toString());

        // 1. Calculate Standard (FIFO) makespan
        let fifoCores = new Array(numCores).fill(0);
        syntheticTasks.forEach((t, idx) => {
            fifoCores[idx % numCores] += t.weight;
        });
        standardData.push(Math.max(...fifoCores));

        // 2. Calculate LPT makespan
        let sorted = [...syntheticTasks].sort((a, b) => b.weight - a.weight);
        let lptCores = new Array(numCores).fill(0);
        sorted.forEach(t => {
            let minIdx = lptCores.indexOf(Math.min(...lptCores));
            lptCores[minIdx] += t.weight;
        });
        lptData.push(Math.max(...lptCores));
    }

    chart.data.labels = newLabels;
    chart.data.datasets[0].data = standardData;
    chart.data.datasets[1].data = lptData;
    chart.update();
}

function updateChartWithResults(cores, freqMin, freqMax, chart) {
    const finalMaxLoad = Math.max(...cores.map(c => c.load));
    const alpha = parseFloat(document.getElementById('alpha')?.value || 1.5);
    const beta = parseFloat(document.getElementById('beta')?.value || 0.8);
    const numCores = cores.length;

    const optFreq = calculateOptimalFrequency(finalMaxLoad, freqMin, freqMax, alpha, beta, numCores);

    const newLabels = [];
    const newData = [];

    const numPoints = 20;
    const step = (freqMax - freqMin) / numPoints;

    let optIndex = 0;
    let minDiff = Infinity;

    for (let i = 0; i <= numPoints; i++) {
        let f = freqMin + (step * i);
        newLabels.push(f.toFixed(2) + 'GHz');

        let timeAtFreq = finalMaxLoad / (beta * f);
        let powerAtFreq = numCores * Math.exp(alpha * f);
        let energyAtFreq = powerAtFreq * timeAtFreq;
        let edp = calculateEDP(energyAtFreq, timeAtFreq);
        newData.push(edp);

        let diff = Math.abs(f - optFreq);
        if (diff < minDiff) {
            minDiff = diff;
            optIndex = i;
        }
    }

    const pointColors = new Array(numPoints + 1).fill('#3B82F6');
    pointColors[optIndex] = '#10B981';

    const pointRadii = new Array(numPoints + 1).fill(2);
    pointRadii[optIndex] = 6;

    chart.data.labels = newLabels;
    chart.data.datasets[0].label = 'EDP Curve (Optimization)';
    chart.data.datasets[0].data = newData;
    chart.data.datasets[0].pointBackgroundColor = pointColors;
    chart.data.datasets[0].pointRadius = pointRadii;
    chart.update();
}

function animateValue(obj, start, end, duration, suffix = "", decimals = 0) {
    // Ensure we clear previous animations to avoid glitching when Run is clicked repeatedly
    if (obj._animId) {
        window.cancelAnimationFrame(obj._animId);
    }

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        // Easing out cubic
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentVal = (progress * (end - start) + start);

        let displayHtml = `${currentVal.toFixed(decimals)} <span class="text-xs opacity-60 font-sans">${suffix}</span>`;
        if (progress === 1) {
            displayHtml = `${end.toFixed(decimals)} <span class="text-xs opacity-60 font-sans">${suffix}</span>`;
        }

        obj.innerHTML = displayHtml;
        if (progress < 1) {
            obj._animId = window.requestAnimationFrame(step);
        }
    };
    obj._animId = window.requestAnimationFrame(step);
}
