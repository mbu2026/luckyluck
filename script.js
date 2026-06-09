// Function to load lotto data from local JSON file
function loadLottoData() {
    lottoData = lottoDB;
    updateFrequencyWithLottoData();
    updateAnalytics();
}

// Function to update frequency tracking with loaded lotto data
function updateFrequencyWithLottoData() {
    // Reset frequency tracking
    const min = parseInt(minInput.value) || 1;
    const max = parseInt(maxInput.value) || 49;
    
    initAnalyticsFrequencyTracking();
    
    // Get history limit from input or default to all data
    const historyLimit = parseInt(document.getElementById('historyLimit').value) || lottoData.length;
    
    // Process lotto draws within history limit
    const dataToProcess = lottoData.slice(0, historyLimit);
    dataToProcess.forEach(draw => {
        if (draw.resultsJson) {
            draw.resultsJson.forEach(number => {
                if (analyticsNumberFrequency.hasOwnProperty(number)) {
                    analyticsNumberFrequency[number]++;
                }
            });
        }
    });
    
    // Update analytics and histograms
    updateAnalytics();
    updateAnalyticsHistogram();
}

// Show page function
function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Remove active class from all menu buttons
    document.querySelectorAll('.menu button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show the requested page
    document.getElementById(`${pageName}Page`).classList.add('active');
    
    // Set active button
    document.getElementById(`${pageName}MenuBtn`).classList.add('active');
}

// Function to simulate drawing without repeating numbers
function drawNumbers() {
    if (isSpinning) return;
    
    // Get range values
    const min = parseInt(minInput.value) || 1;
    const max = parseInt(maxInput.value) || 10;
    const size = parseInt(sizeInput.value) || 3;
    const omittedInput = omitInput.value;
    const fixedInputValue = fixedInput.value;
    
    // Validate range
    if (min >= max) {
        resultElement.textContent = "Min must be less than Max!";
        resultElement.className = "result";
        return;
    }
    
    // Validate size
    if (size < 1 || size > 10) {
        resultElement.textContent = "Number of draws must be between 1 and 10!";
        resultElement.className = "result";
        return;
    }
    
    // Parse fixed numbers
    const fixedNumbers = parseOmittedNumbers(fixedInputValue);
    
    // Check if we have enough numbers
    const omittedNumbers = parseOmittedNumbers(omittedInput);
    const totalAvailable = max - min + 1 - omittedNumbers.length;
    
    // Validate fixed numbers
    if (fixedNumbers.length > size) {
        resultElement.textContent = "Number of fixed numbers cannot exceed number of draws!";
        resultElement.className = "result";
        return;
    }
    
    // Check if fixed numbers are within range
    for (const num of fixedNumbers) {
        if (num < min || num > max) {
            resultElement.textContent = `Fixed number ${num} is outside the specified range!`;
            resultElement.className = "result";
            return;
        }
    }
    
    // Check if fixed numbers conflict with omitted numbers
    for (const num of fixedNumbers) {
        if (omittedNumbers.includes(num)) {
            resultElement.textContent = `Fixed number ${num} is in the omitted list!`;
            resultElement.className = "result";
            return;
        }
    }
    
    // Calculate available numbers for random draws
    const availableForRandom = totalAvailable - fixedNumbers.length;
    if (availableForRandom < (size - fixedNumbers.length)) {
        resultElement.textContent = `Not enough numbers available! ${size - fixedNumbers.length} random draws required, but only ${availableForRandom} available.`;
        resultElement.className = "result";
        return;
    }
    
    // Get distance sum range from inputs
    const minDistanceSum = parseInt(document.getElementById('minDistanceSum').value) || 0;
    const maxDistanceSum = parseInt(document.getElementById('maxDistanceSum').value) || 1000;
    
    // Validate distance sum range
    if (minDistanceSum > maxDistanceSum) {
        resultElement.textContent = "Min distance sum cannot be greater than max distance sum!";
        resultElement.className = "result";
        return;
    }
    
    // Disable button during draw
    isSpinning = true;
    startButton.disabled = true;
    resultElement.textContent = "Drawing...";
    resultElement.className = "result";
    
    // Get all display elements
    const displays = [];
    for (let i = 0; i < size; i++) {
        const display = document.getElementById(`display${i + 1}`);
        if (display) {
            displays.push(display);
        }
    }
    
    // Place fixed numbers in first displays
    const drawnNumbers = [...fixedNumbers];
    displays.forEach((display, index) => {
        if (index < fixedNumbers.length) {
            display.textContent = fixedNumbers[index];
        } else {
            display.textContent = '?';
        }
    });
    
    // Draw duration parameters
    const drawDuration = 100; // 0.1 second
    const drawInterval = 10; // Update every 10ms
    const drawCount = drawDuration / drawInterval;
    
    // Start drawing with random numbers
    let drawCounter = 0;
    const randomDisplays = displays.filter((_, index) => index >= fixedNumbers.length);
    const drawIntervalId = setInterval(() => {
        randomDisplays.forEach(display => {
            if (display) {
                display.textContent = getRandomNumberWithoutRepetition(min, max, [...omittedNumbers, ...fixedNumbers], drawnNumbers);
            }
        });
        
        drawCounter++;
        if (drawCounter >= drawCount) {
            clearInterval(drawIntervalId);
            
            // Final numbers
            const finalNumbers = [...fixedNumbers];
            randomDisplays.forEach(display => {
                if (display) {
                    const finalNumber = getRandomNumberWithoutRepetition(min, max, [...omittedNumbers, ...fixedNumbers], drawnNumbers);
                    display.textContent = finalNumber;
                    finalNumbers.push(finalNumber);
                    drawnNumbers.push(finalNumber);
                }
            });
            
            // Check if the draw meets distance sum criteria
            const distanceSum = calculateDistanceSum(finalNumbers);
            if (distanceSum < minDistanceSum || distanceSum > maxDistanceSum) {
                // Draw doesn't meet criteria - discard and redraw
                resultElement.textContent = `Discarded draw - distance sum ${distanceSum} is outside range [${minDistanceSum}, ${maxDistanceSum}]`;
                resultElement.className = "result";
                
                // Re-enable button but don't store result
                isSpinning = false;
                startButton.disabled = false;
                return;
            }
            
            // Update frequency tracking
            finalNumbers.forEach(num => {
                if (numberFrequency.hasOwnProperty(num)) {
                    numberFrequency[num]++;
                }
            });
            
            // Update analytics
            totalDraws++;
            updateAnalytics();
            
            // Update histogram
            updateHistogram();
            
            // Display results
            // Keep numbers in draw order (don't sort them)
            resultElement.textContent = `Drawn numbers: ${finalNumbers.join(', ')}`;
            resultElement.className = "result";
            
            // Store result for display
            drawResults.push({
                numbers: finalNumbers,
                timestamp: new Date()
            });
            
            // Update results list
            updateResultsList();
            
            // Re-enable button
            isSpinning = false;
            startButton.disabled = false;
        }
    }, drawInterval);
}

// Function to execute multiple draws
function executeMultipleDraws() {
    if (isSpinning || isExecutingMultiple) return;
    
    // Get settings
    const min = parseInt(minInput.value) || 1;
    const max = parseInt(maxInput.value) || 49;
    const size = parseInt(sizeInput.value) || 6;
    const omittedInput = omitInput.value;
    const fixedInputValue = fixedInput.value;
    const count = parseInt(multipleCountInput.value) || 5;
    
    // Validate settings
    if (count < 1 || count > 100) {
        resultElement.textContent = "Number of draws must be between 1 and 100!";
        resultElement.className = "result";
        return;
    }
    
    // Validate range
    if (min >= max) {
        resultElement.textContent = "Min must be less than Max!";
        resultElement.className = "result";
        return;
    }
    
    // Validate size
    if (size < 1 || size > 10) {
        resultElement.textContent = "Number of draws must be between 1 and 10!";
        resultElement.className = "result";
        return;
    }
    
    // Parse fixed numbers
    const fixedNumbers = parseOmittedNumbers(fixedInputValue);
    
    // Validate fixed numbers
    if (fixedNumbers.length > size) {
        resultElement.textContent = "Number of fixed numbers cannot exceed number of draws!";
        resultElement.className = "result";
        return;
    }
    
    // Check if fixed numbers are within range
    for (const num of fixedNumbers) {
        if (num < min || num > max) {
            resultElement.textContent = `Fixed number ${num} is outside the specified range!`;
            resultElement.className = "result";
            return;
        }
    }
    
    // Check if we have enough numbers
    const omittedNumbers = parseOmittedNumbers(omittedInput);
    const totalAvailable = max - min + 1 - omittedNumbers.length;
    
    // Check if fixed numbers conflict with omitted numbers
    for (const num of fixedNumbers) {
        if (omittedNumbers.includes(num)) {
            resultElement.textContent = `Fixed number ${num} is in the omitted list!`;
            resultElement.className = "result";
            return;
        }
    }
    
    // Calculate available numbers for random draws
    const availableForRandom = totalAvailable - fixedNumbers.length;
    if (availableForRandom < (size - fixedNumbers.length)) {
        resultElement.textContent = `Not enough numbers available! ${size - fixedNumbers.length} random draws required, but only ${availableForRandom} available.`;
        resultElement.className = "result";
        return;
    }
    
    // Disable UI elements
    isExecutingMultiple = true;
    startMultipleButton.disabled = true;
    multipleCountInput.disabled = true;
    executeMultipleButton.disabled = true;
    cancelMultipleButton.disabled = true;
    resultElement.textContent = `Executing ${count} draws...`;
    resultElement.className = "result";
    
    // Keep track of completed draws
    let completedDraws = 0;
    
    // Start drawing multiple times
    const drawInterval = setInterval(() => {
        // Perform a single draw
        drawNumbers();
        
        // Update the display with current results
        completedDraws++;
        if (completedDraws >= count) {
            clearInterval(drawInterval);
            
            // Show final results
            resultElement.textContent = `Executed ${count} draws successfully!`;
            resultElement.className = "result";
            
            // Update results list
            updateResultsList();
            
            // Re-enable UI elements
            isExecutingMultiple = false;
            startMultipleButton.disabled = false;
            multipleCountInput.disabled = false;
            executeMultipleButton.disabled = false;
            cancelMultipleButton.disabled = false;
            multipleControls.style.display = 'none';
        }
    }, 1200); // Add delay between draws to make them visible
}

// Helper function to get random number without repetition
function getRandomNumberWithoutRepetition(min, max, omittedNumbers, drawnNumbers) {
    let num;
    do {
        // Use a more robust approach with better bounds checking
        const baseNum = Math.floor(Math.random() * (max - min + 1)) + min;
        
        // Apply random coefficients with better bounds
        const randomFactor1 = Math.random() * 0.3 + 0.85; // 0.85 to 1.15
        const randomFactor2 = Math.sin(Date.now() * 0.001) * 0.1 + 0.95; // 0.95 to 1.05
        const randomFactor3 = Math.cos(Date.now() * 0.0005) * 0.1 + 0.95; // 0.95 to 1.05
        
        // Apply coefficients with bounded adjustment
        let adjustedNum = Math.floor(baseNum * randomFactor1 * randomFactor2 * randomFactor3);
        
        // Ensure the number stays within valid bounds
        adjustedNum = Math.max(min, Math.min(max, adjustedNum));
        
        // Add some additional variation with timestamp
        const timeVariation = Math.floor((Date.now() % 100) / 10) - 5; // -5 to +5
        num = Math.max(min, Math.min(max, adjustedNum + timeVariation));
    } while (omittedNumbers.includes(num) || drawnNumbers.includes(num));
    return num;
}

// Helper function to parse omitted numbers
function parseOmittedNumbers(input) {
    if (!input) return [];
    return input.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
}

// Initialize frequency tracking
function initFrequencyTracking() {
    const min = parseInt(minInput.value) || 1;
    const max = parseInt(maxInput.value) || 49;
    
    numberFrequency = {};
    for (let i = min; i <= max; i++) {
        numberFrequency[i] = 0;
    }
}

// Initialize analytics frequency tracking
function initAnalyticsFrequencyTracking() {
    const min = parseInt(minInput.value) || 1;
    const max = parseInt(maxInput.value) || 49;
    
    analyticsNumberFrequency = {};
    for (let i = min; i <= max; i++) {
        analyticsNumberFrequency[i] = 0;
    }
}

// Create display elements
function createDisplays() {
    // Check if sizeInput exists (in case called before DOM is ready)
    let size = 3;
    if (sizeInput) {
        size = parseInt(sizeInput.value) || 3;
    }
    const displayContainer = document.getElementById('display');
    
    // Clear existing displays
    displayContainer.innerHTML = '';
    
    // Create new displays
    for (let i = 1; i <= size; i++) {
        const display = document.createElement('div');
        display.id = `display${i}`;
        display.className = 'number-display';
        display.textContent = '?';
        displayContainer.appendChild(display);
    }
}

// Update histogram
function updateHistogram() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get min and max values for frequency tracking
    const min = parseInt(minInput.value) || 1;
    const max = parseInt(maxInput.value) || 49;
    
    // Calculate max frequency for scaling
    let maxFreq = 0;
    for (let i = min; i <= max; i++) {
        if (numberFrequency[i] > maxFreq) {
            maxFreq = numberFrequency[i];
        }
    }
    
    // Draw histogram as stacked rectangles
    // Calculate bar width and spacing to fit within canvas
    const totalBars = max - min + 1;
    const totalSpacing = (totalBars - 1) * 2; // 2px spacing between bars
    const availableWidth = canvas.width - totalSpacing;
    const barWidth = Math.max(1, availableWidth / totalBars); // Ensure minimum width
    
    const rectHeight = 5; // Small rectangles
    const maxRectangles = 20; // Limit to prevent performance issues
    
    // Debug: Log what we're drawing
    console.log(`Drawing histogram from ${min} to ${max}, barWidth: ${barWidth}, canvas.width: ${canvas.width}`);
    
    for (let i = min; i <= max; i++) {
        const freq = numberFrequency[i];
        const barHeight = maxFreq > 0 ? (freq / maxFreq) * (canvas.height - 20) : 0;
        const x = (i - min) * (barWidth + 2); // 2px spacing
        
        // Draw stacked rectangles with limit
        ctx.fillStyle = '#4CAF50';
        ctx.strokeStyle = '#000000';
        const displayCount = Math.min(freq, maxRectangles);
        for (let j = 0; j < displayCount; j++) {
            const y = canvas.height - 10 - (j * rectHeight) - rectHeight;
            if (y > 0) {
                ctx.fillRect(x, y, barWidth, rectHeight);
                ctx.strokeRect(x, y, barWidth, rectHeight);
            }
        }
        
        // Draw number label
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        
        // Adjust position to prevent clipping at edges
        let labelX = x + barWidth / 2;
        if (labelX < 5) {
            labelX = 5;
        } else if (labelX > canvas.width - 5) {
            labelX = canvas.width - 5;
        }
        
        ctx.fillText(i.toString(), labelX, canvas.height - 5);
    }
}

// Update analytics histogram
function updateAnalyticsHistogram() {
    // Clear canvas
    analyticsHistogramCtx.clearRect(0, 0, analyticsHistogramCanvas.width, analyticsHistogramCanvas.height);
    
    // Get min and max values for frequency tracking
    const min = parseInt(minInput.value) || 1;
    const max = parseInt(maxInput.value) || 49;
    
    // Get history limit from input
    const historyLimit = parseInt(document.getElementById('historyLimit').value) || lottoData.length;
    
    // Calculate max frequency for scaling
    let maxFreq = 0;
    for (let i = min; i <= max; i++) {
        if (analyticsNumberFrequency[i] > maxFreq) {
            maxFreq = analyticsNumberFrequency[i];
        }
    }
    
    // Draw histogram as stacked rectangles
    // Calculate bar width and spacing to fit within canvas
    const totalBars = max - min + 1;
    const totalSpacing = (totalBars - 1) * 2; // 2px spacing between bars
    const availableWidth = analyticsHistogramCanvas.width - totalSpacing;
    const barWidth = Math.max(1, availableWidth / totalBars); // Ensure minimum width
    
    const rectHeight = 5; // Small rectangles
    
    for (let i = min; i <= max; i++) {
        const freq = analyticsNumberFrequency[i];
        const x = (i - min) * (barWidth + 2); // 2px spacing
        
        // Draw stacked rectangles
        analyticsHistogramCtx.fillStyle = '#2196F3';
        analyticsHistogramCtx.strokeStyle = '#000000';
        for (let j = 0; j < freq; j++) {
            const y = analyticsHistogramCanvas.height - 10 - (j * rectHeight) - rectHeight;
            if (y > 0) {
                analyticsHistogramCtx.fillRect(x, y, barWidth, rectHeight);
                analyticsHistogramCtx.strokeRect(x, y, barWidth, rectHeight);
            }
        }
        
        // Draw number label
        analyticsHistogramCtx.fillStyle = '#FFFFFF';
        analyticsHistogramCtx.font = '10px Arial';
        analyticsHistogramCtx.textAlign = 'center';
        
        // Adjust position to prevent clipping at edges
        let labelX = x + barWidth / 2;
        if (labelX < 5) {
            labelX = 5;
        } else if (labelX > analyticsHistogramCanvas.width - 5) {
            labelX = analyticsHistogramCanvas.width - 5;
        }
        
        analyticsHistogramCtx.fillText(i.toString(), labelX, analyticsHistogramCanvas.height - 5);
    }
}

// Update draw matrix showing numbers per draw
function updateDrawMatrix() {
    const canvas = document.getElementById('drawMatrixCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const min = parseInt(minInput.value) || 1;
    const max = parseInt(maxInput.value) || 49;
    const historyLimit = parseInt(document.getElementById('historyLimit').value) || lottoData.length;

    const dataToProcess = lottoData.slice(0, historyLimit);
    const drawCount = dataToProcess.length;
    if (drawCount === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    const numRange = max - min + 1;
    const labelWidth = 55;
    const topMargin = 18;
    const bottomMargin = 5;
    const cellSize = Math.max(4, (canvas.width - labelWidth - 10) / numRange);

    const chartWidth = numRange * cellSize;
    const chartHeight = drawCount * cellSize;

    canvas.height = (chartHeight + topMargin + bottomMargin) * 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw cells
    dataToProcess.forEach((draw, index) => {
        const y = topMargin + index * cellSize;
        const drawnNumbers = draw.resultsJson.filter(num => num >= min && num <= max);
        for (let i = min; i <= max; i++) {
            const x = labelWidth + (i - min) * cellSize;
            if (drawnNumbers.includes(i)) {
                ctx.fillStyle = '#4CAF50';
                ctx.fillRect(x, y, cellSize, cellSize);
                ctx.strokeStyle = '#CCFF00';
                ctx.strokeRect(x, y, cellSize, cellSize);
            } else {
                ctx.strokeStyle = '#555';
                ctx.strokeRect(x, y, cellSize, cellSize);
            }
        }
    });

    // X-axis labels at top
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '9px Arial';
    ctx.textAlign = 'center';
    for (let i = min; i <= max; i++) {
        const x = labelWidth + (i - min) * cellSize + cellSize / 2;
        ctx.fillText(i, x, 12);
    }

    // Y-axis labels (draw IDs)
    ctx.textAlign = 'right';
    ctx.font = '9px Arial';
    const yLabelStep = Math.max(1, Math.floor(drawCount / 50));
    dataToProcess.forEach((draw, index) => {
        if (index % yLabelStep === 0 || index === drawCount - 1) {
            const y = topMargin + index * cellSize + cellSize / 2 + 3;
            ctx.fillText(draw.drawSystemId.toString(), labelWidth - 4, y);
        }
    });
}

// Update analytics stats
function updateAnalytics() {
    const min = parseInt(minInput.value) || 1;
    const max = parseInt(maxInput.value) || 49;
    
    // Get history limit from input or default to all data
    const historyLimit = parseInt(document.getElementById('historyLimit').value) || lottoData.length;
    
    // Find most and least frequent numbers
    let maxFreq = 0;
    let minFreq = Infinity;
    let mostFrequent = [];
    let leastFrequent = [];
    var totalDraws = Math.min(historyLimit, lottoData.length);
    
    for (let i = min; i <= max; i++) {
        const freq = analyticsNumberFrequency[i];
        if (freq > maxFreq) {
            maxFreq = freq;
            mostFrequent = [i];
        } else if (freq === maxFreq && freq > 0) {
            mostFrequent.push(i);
        }
        
        if (freq < minFreq && freq > 0) {
            minFreq = freq;
            leastFrequent = [i];
        } else if (freq === minFreq && freq > 0) {
            leastFrequent.push(i);
        }
    }
    
    // Get top 3 most frequent numbers
    let top3MostFrequent = [];
    let top3LeastFrequent = [];
    
    // Create array of number-frequency pairs and sort
    const freqPairs = [];
    for (let i = min; i <= max; i++) {
        if (analyticsNumberFrequency[i] > 0) {
            freqPairs.push({number: i, frequency: analyticsNumberFrequency[i]});
        }
    }
    
    // Sort by frequency (descending for most frequent, ascending for least frequent)
    freqPairs.sort((a, b) => b.frequency - a.frequency);
    top3MostFrequent = freqPairs.slice(0, 3).map(pair => pair.number);
    
    freqPairs.sort((a, b) => a.frequency - b.frequency);
    top3LeastFrequent = freqPairs.slice(0, 3).map(pair => pair.number);
    
    // Find numbers that were not drawn at all
    let notDrawnNumbers = [];
    for (let i = min; i <= max; i++) {
        if (analyticsNumberFrequency[i] === 0) {
            notDrawnNumbers.push(i);
        }
    }
    
    // Update analytics stats display
    analyticsStats.innerHTML = `
        <div class="analytics-stat">
            <div class="stat-label">Total Draws:</div>
            <div class="stat-value">${totalDraws}</div>
        </div>
        <div class="analytics-stat">
            <div class="stat-label">Most Frequent:</div>
            <div class="stat-value">${mostFrequent.join(', ') || 'None'}</div>
        </div>
        <div class="analytics-stat">
            <div class="stat-label">Least Frequent:</div>
            <div class="stat-value">${leastFrequent.join(', ') || 'None'}</div>
        </div>
        <div class="analytics-stat">
            <div class="stat-label">Top 3 Most Frequent:</div>
            <div class="stat-value">${top3MostFrequent.join(', ') || 'None'}</div>
        </div>
        <div class="analytics-stat">
            <div class="stat-label">Top 3 Least Frequent:</div>
            <div class="stat-value">${top3LeastFrequent.join(', ') || 'None'}</div>
        </div>
        <div class="analytics-stat">
            <div class="stat-label">Not Drawn Numbers:</div>
            <div class="stat-value">${notDrawnNumbers.join(', ') || 'None'}</div>
        </div>
    `;
    
    // Update analytics histogram
    updateAnalyticsHistogram();
    updateDrawMatrix();
}

// Global DOM elements
let minInput, maxInput, sizeInput, omitInput, fixedInput, startButton, displayContainer, resultElement, canvas, ctx, analyticsStats;
let startMultipleButton, multipleCountInput, executeMultipleButton, cancelMultipleButton, multipleControls;

// DOMContentLoaded event handler
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements for draw page
    minInput = document.getElementById('min');
    maxInput = document.getElementById('max');
    sizeInput = document.getElementById('size');
    omitInput = document.getElementById('omit');
    fixedInput = document.getElementById('fixed');
    startButton = document.getElementById('startButton');
    startMultipleButton = document.getElementById('startMultipleButton');
    multipleCountInput = document.getElementById('multipleCount');
    executeMultipleButton = document.getElementById('executeMultipleButton');
    cancelMultipleButton = document.getElementById('cancelMultipleButton');
    multipleControls = document.getElementById('multipleControls');
    displayContainer = document.getElementById('display');
    resultElement = document.getElementById('result');
    canvas = document.getElementById('histogramCanvas');
    ctx = canvas.getContext('2d');
    resetButton = document.getElementById('resetButton');
    resultsList = document.getElementById('resultsList');
    
    // DOM elements for analytics page
    analyticsStats = document.getElementById('analyticsStats');
    analyticsHistogramCanvas = document.getElementById('analyticsHistogramCanvas');
    analyticsHistogramCtx = analyticsHistogramCanvas.getContext('2d');
    recordList = document.getElementById('recordList');
    
    // Set up initial state
    createDisplays();
    initFrequencyTracking();
    initAnalyticsFrequencyTracking();
    
    // Initialize analytics
    updateAnalytics();
    
    // Update displays when size changes
    sizeInput.addEventListener('change', function() {
        createDisplays();
        initFrequencyTracking();
    });
    
    // Update histogram when range changes
    minInput.addEventListener('change', initFrequencyTracking);
    maxInput.addEventListener('change', initFrequencyTracking);
    
    // Event listener for the draw button
    startButton.addEventListener('click', drawNumbers);
    
    // Event listener for multiple draws button
    startMultipleButton.addEventListener('click', function() {
        multipleControls.style.display = 'block';
        multipleCountInput.focus();
    });
    
    // Event listener for execute multiple button
    executeMultipleButton.addEventListener('click', executeMultipleDraws);
    
    // Event listener for cancel multiple button
    cancelMultipleButton.addEventListener('click', function() {
        multipleControls.style.display = 'none';
    });
    
    // Event listener for reset button
    resetButton.addEventListener('click', resetResults);
    
    // Initialize results list
    updateResultsList();
    
    // Also allow Enter key to trigger draw
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            // If multiple controls are visible, execute multiple draws
            if (multipleControls.style.display !== 'none') {
                executeMultipleDraws();
            } else {
                drawNumbers();
            }
        }
    });
    
    // Update analytics when switching to analytics page
    document.getElementById('analyticsMenuBtn').addEventListener('click', function() {
        updateAnalytics();
        // Load lotto data if not already loaded
        if (lottoData.length === 0) {
            loadLottoData();
        }
    });
    
    // Update analytics when history limit changes
    document.getElementById('historyLimit').addEventListener('change', function() {
        // Re-calculate frequency tracking with new history limit
        updateFrequencyWithLottoData();
    });
    
    // Allow Enter key to update analytics when history limit is focused
    document.getElementById('historyLimit').addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            updateAnalytics();
        }
    });
    
    // Show records when button is clicked
    document.getElementById('showRecordsBtn').addEventListener('click', showRecords);
    
    // Handle window resize to resize canvases
    window.addEventListener('resize', function() {
        // Resize histogram canvas to fit container width
        const histogramContainer = document.querySelector('.histogram-container');
        if (histogramContainer) {
            const containerWidth = histogramContainer.clientWidth;
            if (containerWidth > 0) {
                canvas.width = containerWidth;
                updateHistogram();
            }
        }
        
        // Resize analytics histogram canvas to fit container width
        const analyticsHistogramContainer = document.querySelector('.analytics-container');
        if (analyticsHistogramContainer) {
            const containerWidth = analyticsHistogramContainer.clientWidth;
            if (containerWidth > 0) {
                analyticsHistogramCanvas.width = containerWidth;
                updateAnalyticsHistogram();
            }
        }
        
        // Resize co-occurrence histogram canvas
        const coCanvas = document.getElementById('coHistogramCanvas');
        if (coCanvas) {
            const coContainer = coCanvas.parentElement;
            if (coContainer) {
                const containerWidth = coContainer.clientWidth;
                if (containerWidth > 0) {
                    coCanvas.width = containerWidth;
                }
            }
        }
    });
    
    // Handle resize for draw matrix
    const drawMatrixCanvas = document.getElementById('drawMatrixCanvas');
    if (drawMatrixCanvas) {
        const matrixContainer = document.querySelector('.matrix-container');
        if (matrixContainer) {
            const containerWidth = matrixContainer.clientWidth;
            if (containerWidth > 0) {
                drawMatrixCanvas.width = containerWidth;
            }
        }
    }
    
    // Co-occurrence histogram wiring
    const coNumbersInput = document.getElementById('coNumbers');
    const coDrawCountInput = document.getElementById('coDrawCount');
    const coAnalyzeBtn = document.getElementById('coAnalyzeBtn');
    
    if (coAnalyzeBtn) {
        coAnalyzeBtn.addEventListener('click', updateCoHistogram);
    }
    
    if (coNumbersInput) {
        coNumbersInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                updateCoHistogram();
            }
        });
    }
    
    if (coDrawCountInput) {
        coDrawCountInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                updateCoHistogram();
            }
        });
    }
    
    // Initial resize on load
    window.dispatchEvent(new Event('resize'));
});

// Function to reset results
function resetResults() {
    drawResults = [];
    totalDraws = 0;
    initFrequencyTracking();
    updateHistogram();
    updateResultsList();
}

// Function to show records
function showRecords() {
    const recordLimit = parseInt(document.getElementById('recordLimit').value) || 10;
    const limit = Math.min(recordLimit, lottoData.length);
    
    if (recordList) {
        recordList.innerHTML = '';
        
        if (lottoData.length === 0) {
            recordList.innerHTML = '<p>No data available.</p>';
            return;
        }
        
        // Create container for records with same styling as history list
        const recordsContainer = document.createElement('div');
        recordsContainer.className = 'results-container';
        
        // Display records
        for (let i = 0; i < limit; i++) {
            const record = lottoData[i];
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            
            // Format the numbers with leading zeros - maintain draw order
            // The original resultsJson array already contains numbers in draw order
            const numbers = record.resultsJson.map(num => num < 10 ? `0${num}` : num.toString());
            
            // Calculate distances between consecutive numbers
            let distances = '';
            let sum = '';
            if (record.resultsJson.length >= 2) {
                const distancesArray = [];
                let total = 0;
                for (let j = 0; j < record.resultsJson.length - 1; j++) {
                    const distance = Math.abs(record.resultsJson[j] - record.resultsJson[j + 1]);
                    distancesArray.push(distance.toString().padStart(2, '0')); // Pad to 2 digits
                    total += distance;
                }
                distances = distancesArray.join('\t');
                sum = total.toString().padStart(3, '0'); // Pad to 3 digits
            }
            
            // Combine numbers, distances and sum with same styling as draw page
            if (distances) {
                resultItem.innerHTML = `
                    <span>${numbers.join('\t')}</span>
                    <span style="color: #add8e6; font-weight: bold;">|</span>
                    <span style="color: #add8e6; font-weight: bold;">${distances}</span>
                    <span style="color: #add8e6; font-weight: bold;">|</span>
                    <span style="color: #ffff00; font-weight: bold;">${sum}</span>
                `;
            } else {
                resultItem.textContent = numbers.join('\t');
            }
            
            recordsContainer.appendChild(resultItem);
        }
        
        recordList.appendChild(recordsContainer);
    }
}

// Function to update results list display
function updateResultsList() {
    const resultsList = document.getElementById('resultsList');
    if (!resultsList) return;
    
    // Clear existing content
    resultsList.innerHTML = '';
    
    // Show a message if no results
    if (drawResults.length === 0) {
        resultsList.innerHTML = '<p>No results yet.</p>';
        return;
    }
    
    // Create container for results
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'results-container';
    
    // Display results in reverse order (most recent first) with numbers, distances and sum
    drawResults.slice().reverse().forEach((result, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        // Format numbers with leading zero for single digits
        const formattedNumbers = result.numbers.map(num => num < 10 ? `0${num}` : num.toString());
        
        // Calculate distances between consecutive numbers
        let distances = '';
        let sum = '';
        if (result.numbers.length >= 2) {
            const distancesArray = [];
            let total = 0;
            for (let j = 0; j < result.numbers.length - 1; j++) {
                const distance = Math.abs(result.numbers[j] - result.numbers[j + 1]);
                distancesArray.push(distance.toString().padStart(2, '0')); // Pad to 2 digits
                total += distance;
            }
            distances = distancesArray.join('\t');
            sum = total.toString().padStart(3, '0'); // Pad to 3 digits
        }
        
        // Combine numbers, distances and sum with same styling as analytics
        if (distances) {
            resultItem.innerHTML = `
                <span>${formattedNumbers.join('\t')}</span>
                <span style="color: #add8e6; font-weight: bold;">|</span>
                <span style="color: #add8e6; font-weight: bold;">${distances}</span>
                <span style="color: #add8e6; font-weight: bold;">|</span>
                <span style="color: #ffff00; font-weight: bold;">${sum}</span>
            `;
        } else {
            resultItem.textContent = formattedNumbers.join('\t');
        }
        
        resultsContainer.appendChild(resultItem);
    });
    
    resultsList.appendChild(resultsContainer);
}

// Function to calculate distance sum for a set of numbers
function calculateDistanceSum(numbers) {
    if (numbers.length < 2) return 0;
    
    let sum = 0;
    for (let i = 0; i < numbers.length - 1; i++) {
        sum += Math.abs(numbers[i] - numbers[i + 1]);
    }
    return sum;
}

// Co-occurrence histogram function
function updateCoHistogram() {
    const canvas = document.getElementById('coHistogramCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const coNumbersInput = document.getElementById('coNumbers');
    const coDrawCountInput = document.getElementById('coDrawCount');
    const coStats = document.getElementById('coStats');

    const min = parseInt(minInput.value) || 1;
    const max = parseInt(maxInput.value) || 49;
    const drawCount = parseInt(coDrawCountInput.value) || 10;
    const numbersStr = coNumbersInput.value.trim();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!numbersStr || lottoData.length === 0) {
        coStats.textContent = 'Please enter at least one number and ensure data is loaded.';
        return;
    }

    const targetNumbers = numbersStr.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    if (targetNumbers.length === 0) {
        coStats.textContent = 'No valid numbers specified.';
        return;
    }

    const validTargets = targetNumbers.filter(n => n >= min && n <= max);
    if (validTargets.length === 0) {
        coStats.textContent = `Specified numbers are outside the range [${min}, ${max}].`;
        return;
    }

    const limit = Math.min(drawCount, lottoData.length);
    const dataToProcess = lottoData.slice(0, limit);

    // Count co-occurrences
    const coFrequency = {};
    for (let i = min; i <= max; i++) {
        coFrequency[i] = 0;
    }

    let qualifyingDraws = 0;

    dataToProcess.forEach(draw => {
        const results = draw.resultsJson;
        const hasTarget = validTargets.every(target => results.includes(target));
        if (!hasTarget) return;

        qualifyingDraws++;
        results.forEach(n => {
            if (n >= min && n <= max && !validTargets.includes(n)) {
                coFrequency[n]++;
            }
        });
    });

    // Calculate max frequency for scaling
    let maxFreq = 0;
    for (let i = min; i <= max; i++) {
        if (coFrequency[i] > maxFreq) {
            maxFreq = coFrequency[i];
        }
    }

    // Draw histogram
    const totalBars = max - min + 1;
    const totalSpacing = (totalBars - 1) * 2;
    const availableWidth = canvas.width - totalSpacing;
    const barWidth = Math.max(1, availableWidth / totalBars);
    const rectHeight = 5;

    for (let i = min; i <= max; i++) {
        const freq = coFrequency[i];
        const x = (i - min) * (barWidth + 2);

        const isTarget = validTargets.includes(i);
        ctx.fillStyle = isTarget ? '#FF5722' : '#FF9800';
        ctx.strokeStyle = '#000000';
        for (let j = 0; j < freq; j++) {
            const y = canvas.height - 10 - (j * rectHeight) - rectHeight;
            if (y > 0) {
                ctx.fillRect(x, y, barWidth, rectHeight);
                ctx.strokeRect(x, y, barWidth, rectHeight);
            }
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        let labelX = x + barWidth / 2;
        if (labelX < 5) labelX = 5;
        else if (labelX > canvas.width - 5) labelX = canvas.width - 5;
        ctx.fillText(i.toString(), labelX, canvas.height - 5);
    }

    // Find top co-occurring numbers
    const freqPairs = [];
    for (let i = min; i <= max; i++) {
        if (coFrequency[i] > 0) {
            freqPairs.push({number: i, frequency: coFrequency[i]});
        }
    }
    freqPairs.sort((a, b) => b.frequency - a.frequency);
    const top5 = freqPairs.slice(0, 5).map(p => `${p.number} (${p.frequency}x)`).join(', ');

    coStats.innerHTML = `
        <div>Analyzing numbers: <strong>${validTargets.join(', ')}</strong></div>
        <div>Draws analyzed: <strong>${limit}</strong> | Draws containing target: <strong>${qualifyingDraws}</strong></div>
        <div>Top co-occurring numbers: <strong>${top5 || 'None'}</strong></div>
        <div style="margin-top: 5px; font-size: 12px; color: #FF9800;">Orange bars = co-occurrence count | <span style="color: #FF5722;">Red/orange bars</span> = specified number (shown if drawn alongside itself)</div>
    `;
}

// Global variables
let lottoData = [];
let numberFrequency = {};
let analyticsNumberFrequency = {};
let totalDraws = 0;
let isSpinning = false;
let isExecutingMultiple = false;
let multipleDrawsInterval = null;
let drawResults = []; // Store draw results for display

let lottoDB = [
  {
    "drawSystemId": 7362,
    "drawDate": "2026-06-06T22:00:00Z",
    "resultsJson": [32, 8, 17, 36, 7, 47]
  },
  {
    "drawSystemId": 7361,
    "drawDate": "2026-06-04T22:00:00Z",
    "resultsJson": [46, 43, 41, 20, 13, 17]
  },
  {
    "drawSystemId": 7360,
    "drawDate": "2026-06-02T22:00:00Z",
    "resultsJson": [28, 20, 36, 8, 39, 31]
  },
  {
    "drawSystemId": 7359,
    "drawDate": "2026-05-30T22:00:00Z",
    "resultsJson": [1, 42, 35, 32, 6, 10]
  },
  {
    "drawSystemId": 7358,
    "drawDate": "2026-05-28T22:00:00Z",
    "resultsJson": [7, 22, 15, 42, 43, 6]
  },
  {
    "drawSystemId": 7357,
    "drawDate": "2026-05-26T22:00:00Z",
    "resultsJson": [4, 23, 16, 5, 3, 46]
  },
  {
    "drawSystemId": 7356,
    "drawDate": "2026-05-23T22:00:00Z",
    "resultsJson": [17, 9, 2, 30, 14, 46]
  },
  {
    "drawSystemId": 7355,
    "drawDate": "2026-05-21T22:00:00Z",
    "resultsJson": [24, 44, 42, 11, 28, 21]
  },
  {
    "drawSystemId": 7354,
    "drawDate": "2026-05-19T22:00:00Z",
    "resultsJson": [17, 18, 49, 38, 42, 20]
  },
  {
    "drawSystemId": 7353,
    "drawDate": "2026-05-16T22:00:00Z",
    "resultsJson": [12, 20, 23, 49, 3, 11]
  },
  {
    "drawSystemId": 7352,
    "drawDate": "2026-05-14T22:00:00Z",
    "resultsJson": [17, 15, 42, 44, 24, 9]
  },
  {
    "drawSystemId": 7351,
    "drawDate": "2026-05-12T22:00:00Z",
    "resultsJson": [16, 7, 43, 8, 34, 42]
  },
  {
    "drawSystemId": 7350,
    "drawDate": "2026-05-09T22:00:00Z",
    "resultsJson": [8, 47, 35, 2, 1, 28]
  },
  {
    "drawSystemId": 7349,
    "drawDate": "2026-05-07T22:00:00Z",
    "resultsJson": [36, 45, 25, 24, 40, 33]
  },
  {
    "drawSystemId": 7348,
    "drawDate": "2026-05-05T22:00:00Z",
    "resultsJson": [16, 33, 8, 26, 38, 15]
  },
  {
    "drawSystemId": 7347,
    "drawDate": "2026-05-02T22:00:00Z",
    "resultsJson": [24, 28, 7, 32, 15, 34]
  },
  {
    "drawSystemId": 7346,
    "drawDate": "2026-04-30T22:00:00Z",
    "resultsJson": [41, 16, 6, 38, 3, 30]
  },
  {
    "drawSystemId": 7345,
    "drawDate": "2026-04-28T22:00:00Z",
    "resultsJson": [5, 43, 40, 44, 1, 21]
  },
  {
    "drawSystemId": 7344,
    "drawDate": "2026-04-25T22:00:00Z",
    "resultsJson": [41, 13, 23, 20, 19, 34]
  },
  {
    "drawSystemId": 7343,
    "drawDate": "2026-04-23T22:00:00Z",
    "resultsJson": [21, 11, 5, 31, 27, 9]
  },
  {
    "drawSystemId": 7342,
    "drawDate": "2026-04-21T22:00:00Z",
    "resultsJson": [49, 43, 16, 47, 38, 4]
  },
  {
    "drawSystemId": 7341,
    "drawDate": "2026-04-18T22:00:00Z",
    "resultsJson": [43, 1, 19, 37, 32, 6]
  },
  {
    "drawSystemId": 7340,
    "drawDate": "2026-04-16T22:00:00Z",
    "resultsJson": [21, 25, 37, 27, 29, 22]
  },
  {
    "drawSystemId": 7339,
    "drawDate": "2026-04-14T22:00:00Z",
    "resultsJson": [49, 14, 3, 12, 17, 47]
  },
  {
    "drawSystemId": 7338,
    "drawDate": "2026-04-11T22:00:00Z",
    "resultsJson": [36, 31, 16, 22, 25, 32]
  },
  {
    "drawSystemId": 7337,
    "drawDate": "2026-04-09T22:00:00Z",
    "resultsJson": [23, 10, 44, 3, 8, 46]
  },
  {
    "drawSystemId": 7336,
    "drawDate": "2026-04-07T22:00:00Z",
    "resultsJson": [3, 6, 28, 31, 33, 46]
  },
  {
    "drawSystemId": 7335,
    "drawDate": "2026-04-04T22:00:00Z",
    "resultsJson": [12, 3, 27, 6, 49, 26]
  },
  {
    "drawSystemId": 7334,
    "drawDate": "2026-04-02T22:00:00Z",
    "resultsJson": [10, 5, 47, 33, 34, 14]
  },
  {
    "drawSystemId": 7333,
    "drawDate": "2026-03-31T22:00:00Z",
    "resultsJson": [26, 45, 20, 3, 47, 37]
  },
  {
    "drawSystemId": 7332,
    "drawDate": "2026-03-28T22:00:00Z",
    "resultsJson": [14, 29, 30, 27, 8, 6]
  },
  {
    "drawSystemId": 7331,
    "drawDate": "2026-03-26T22:00:00Z",
    "resultsJson": [27, 10, 36, 16, 40, 12]
  },
  {
    "drawSystemId": 7330,
    "drawDate": "2026-03-24T22:00:00Z",
    "resultsJson": [16, 17, 13, 38, 45, 9]
  },
  {
    "drawSystemId": 7329,
    "drawDate": "2026-03-21T22:00:00Z",
    "resultsJson": [25, 40, 47, 21, 22, 49]
  },
  {
    "drawSystemId": 7328,
    "drawDate": "2026-03-19T22:00:00Z",
    "resultsJson": [36, 43, 2, 1, 25, 19]
  },
  {
    "drawSystemId": 7327,
    "drawDate": "2026-03-17T22:00:00Z",
    "resultsJson": [16, 37, 18, 6, 7, 41]
  },
  {
    "drawSystemId": 7326,
    "drawDate": "2026-03-14T22:00:00Z",
    "resultsJson": [30, 46, 22, 41, 47, 23]
  },
  {
    "drawSystemId": 7325,
    "drawDate": "2026-03-12T22:00:00Z",
    "resultsJson": [6, 15, 42, 5, 36, 10]
  },
  {
    "drawSystemId": 7324,
    "drawDate": "2026-03-10T22:00:00Z",
    "resultsJson": [36, 37, 38, 12, 3, 26]
  },
  {
    "drawSystemId": 7323,
    "drawDate": "2026-03-07T22:00:00Z",
    "resultsJson": [10, 7, 2, 18, 27, 29]
  },
  {
    "drawSystemId": 7322,
    "drawDate": "2026-03-05T22:00:00Z",
    "resultsJson": [20, 5, 45, 42, 41, 33]
  },
  {
    "drawSystemId": 7321,
    "drawDate": "2026-03-03T22:00:00Z",
    "resultsJson": [12, 13, 5, 42, 9, 10]
  },
  {
    "drawSystemId": 7320,
    "drawDate": "2026-02-28T22:00:00Z",
    "resultsJson": [4, 48, 28, 9, 40, 10]
  },
  {
    "drawSystemId": 7319,
    "drawDate": "2026-02-26T22:00:00Z",
    "resultsJson": [38, 13, 8, 15, 9, 48]
  },
  {
    "drawSystemId": 7318,
    "drawDate": "2026-02-24T22:00:00Z",
    "resultsJson": [25, 13, 31, 9, 17, 41]
  },
  {
    "drawSystemId": 7317,
    "drawDate": "2026-02-21T22:00:00Z",
    "resultsJson": [39, 14, 21, 49, 12, 2]
  },
  {
    "drawSystemId": 7316,
    "drawDate": "2026-02-19T22:00:00Z",
    "resultsJson": [13, 2, 15, 5, 14, 39]
  },
  {
    "drawSystemId": 7315,
    "drawDate": "2026-02-17T22:00:00Z",
    "resultsJson": [26, 9, 39, 23, 22, 49]
  },
  {
    "drawSystemId": 7314,
    "drawDate": "2026-02-14T22:00:00Z",
    "resultsJson": [26, 1, 32, 41, 19, 38]
  },
  {
    "drawSystemId": 7313,
    "drawDate": "2026-02-12T22:00:00Z",
    "resultsJson": [44, 33, 39, 11, 42, 16]
  },
  {
    "drawSystemId": 7312,
    "drawDate": "2026-02-10T22:00:00Z",
    "resultsJson": [23, 16, 13, 24, 5, 12]
  },
  {
    "drawSystemId": 7311,
    "drawDate": "2026-02-07T22:00:00Z",
    "resultsJson": [19, 25, 30, 2, 36, 10]
  },
  {
    "drawSystemId": 7310,
    "drawDate": "2026-02-05T22:00:00Z",
    "resultsJson": [24, 9, 42, 3, 7, 8]
  },
  {
    "drawSystemId": 7309,
    "drawDate": "2026-02-03T22:00:00Z",
    "resultsJson": [25, 32, 1, 27, 47, 21]
  },
  {
    "drawSystemId": 7308,
    "drawDate": "2026-01-31T22:00:00Z",
    "resultsJson": [8, 34, 6, 14, 22, 40]
  },
  {
    "drawSystemId": 7307,
    "drawDate": "2026-01-29T22:00:00Z",
    "resultsJson": [31, 24, 12, 6, 36, 2]
  },
  {
    "drawSystemId": 7306,
    "drawDate": "2026-01-27T22:00:00Z",
    "resultsJson": [48, 5, 31, 8, 42, 11]
  },
  {
    "drawSystemId": 7305,
    "drawDate": "2026-01-24T22:00:00Z",
    "resultsJson": [21, 11, 13, 43, 25, 6]
  },
  {
    "drawSystemId": 7304,
    "drawDate": "2026-01-22T22:00:00Z",
    "resultsJson": [44, 49, 15, 5, 25, 1]
  },
  {
    "drawSystemId": 7303,
    "drawDate": "2026-01-20T22:00:00Z",
    "resultsJson": [30, 12, 5, 48, 10, 37]
  },
  {
    "drawSystemId": 7302,
    "drawDate": "2026-01-17T22:00:00Z",
    "resultsJson": [3, 6, 14, 12, 1, 13]
  },
  {
    "drawSystemId": 7301,
    "drawDate": "2026-01-15T22:00:00Z",
    "resultsJson": [15, 45, 43, 47, 8, 23]
  },
  {
    "drawSystemId": 7300,
    "drawDate": "2026-01-13T22:00:00Z",
    "resultsJson": [31, 7, 21, 13, 36, 29]
  },
  {
    "drawSystemId": 7299,
    "drawDate": "2026-01-10T22:00:00Z",
    "resultsJson": [4, 8, 14, 26, 7, 3]
  },
  {
    "drawSystemId": 7298,
    "drawDate": "2026-01-08T22:00:00Z",
    "resultsJson": [48, 44, 21, 12, 25, 9]
  },
  {
    "drawSystemId": 7297,
    "drawDate": "2026-01-06T22:00:00Z",
    "resultsJson": [28, 26, 14, 10, 9, 47]
  },
  {
    "drawSystemId": 7296,
    "drawDate": "2026-01-03T22:00:00Z",
    "resultsJson": [45, 42, 22, 10, 7, 21]
  },
  {
    "drawSystemId": 7295,
    "drawDate": "2026-01-01T22:00:00Z",
    "resultsJson": [38, 26, 32, 46, 39, 25]
  },
  {
    "drawSystemId": 7294,
    "drawDate": "2025-12-30T22:00:00Z",
    "resultsJson": [15, 30, 29, 1, 6, 26]
  },
  {
    "drawSystemId": 7293,
    "drawDate": "2025-12-27T22:00:00Z",
    "resultsJson": [40, 48, 26, 45, 9, 31]
  },
  {
    "drawSystemId": 7292,
    "drawDate": "2025-12-25T22:00:00Z",
    "resultsJson": [20, 49, 48, 19, 45, 14]
  },
  {
    "drawSystemId": 7291,
    "drawDate": "2025-12-23T22:00:00Z",
    "resultsJson": [39, 3, 47, 43, 9, 36]
  },
  {
    "drawSystemId": 7290,
    "drawDate": "2025-12-20T22:00:00Z",
    "resultsJson": [4, 24, 6, 16, 11, 41]
  },
  {
    "drawSystemId": 7289,
    "drawDate": "2025-12-18T22:00:00Z",
    "resultsJson": [26, 20, 38, 33, 10, 37]
  },
  {
    "drawSystemId": 7288,
    "drawDate": "2025-12-16T22:00:00Z",
    "resultsJson": [25, 32, 37, 17, 27, 26]
  },
  {
    "drawSystemId": 7287,
    "drawDate": "2025-12-13T22:00:00Z",
    "resultsJson": [45, 3, 49, 10, 47, 14]
  },
  {
    "drawSystemId": 7286,
    "drawDate": "2025-12-11T22:00:00Z",
    "resultsJson": [11, 1, 5, 42, 38, 46]
  },
  {
    "drawSystemId": 7285,
    "drawDate": "2025-12-09T22:00:00Z",
    "resultsJson": [2, 10, 40, 31, 26, 22]
  },
  {
    "drawSystemId": 7284,
    "drawDate": "2025-12-06T22:00:00Z",
    "resultsJson": [27, 14, 4, 25, 43, 44]
  },
  {
    "drawSystemId": 7283,
    "drawDate": "2025-12-04T22:00:00Z",
    "resultsJson": [32, 47, 23, 45, 46, 21]
  },
  {
    "drawSystemId": 7282,
    "drawDate": "2025-12-02T22:00:00Z",
    "resultsJson": [3, 47, 29, 32, 30, 9]
  },
  {
    "drawSystemId": 7281,
    "drawDate": "2025-11-29T22:00:00Z",
    "resultsJson": [28, 46, 23, 3, 42, 31]
  },
  {
    "drawSystemId": 7280,
    "drawDate": "2025-11-27T22:00:00Z",
    "resultsJson": [38, 43, 33, 47, 27, 45]
  },
  {
    "drawSystemId": 7279,
    "drawDate": "2025-11-25T22:00:00Z",
    "resultsJson": [26, 9, 31, 42, 44, 3]
  },
  {
    "drawSystemId": 7278,
    "drawDate": "2025-11-22T22:00:00Z",
    "resultsJson": [45, 8, 49, 22, 31, 43]
  },
  {
    "drawSystemId": 7277,
    "drawDate": "2025-11-20T22:00:00Z",
    "resultsJson": [27, 44, 22, 20, 9, 19]
  },
  {
    "drawSystemId": 7276,
    "drawDate": "2025-11-18T22:00:00Z",
    "resultsJson": [39, 22, 13, 30, 7, 38]
  },
  {
    "drawSystemId": 7275,
    "drawDate": "2025-11-15T22:00:00Z",
    "resultsJson": [32, 2, 39, 12, 44, 19]
  },
  {
    "drawSystemId": 7274,
    "drawDate": "2025-11-13T22:00:00Z",
    "resultsJson": [31, 37, 18, 1, 43, 42]
  },
  {
    "drawSystemId": 7273,
    "drawDate": "2025-11-11T22:00:00Z",
    "resultsJson": [1, 14, 47, 26, 5, 46]
  },
  {
    "drawSystemId": 7272,
    "drawDate": "2025-11-08T22:00:00Z",
    "resultsJson": [20, 7, 35, 10, 39, 30]
  },
  {
    "drawSystemId": 7271,
    "drawDate": "2025-11-06T22:00:00Z",
    "resultsJson": [42, 20, 39, 29, 34, 33]
  },
  {
    "drawSystemId": 7270,
    "drawDate": "2025-11-04T22:00:00Z",
    "resultsJson": [37, 46, 4, 45, 34, 23]
  },
  {
    "drawSystemId": 7269,
    "drawDate": "2025-11-01T22:00:00Z",
    "resultsJson": [15, 8, 40, 28, 14, 46]
  },
  {
    "drawSystemId": 7268,
    "drawDate": "2025-10-30T22:00:00Z",
    "resultsJson": [30, 10, 15, 3, 31, 49]
  },
  {
    "drawSystemId": 7267,
    "drawDate": "2025-10-28T22:00:00Z",
    "resultsJson": [27, 34, 22, 18, 47, 31]
  },
  {
    "drawSystemId": 7266,
    "drawDate": "2025-10-25T22:00:00Z",
    "resultsJson": [27, 39, 46, 20, 21, 11]
  },
  {
    "drawSystemId": 7265,
    "drawDate": "2025-10-23T22:00:00Z",
    "resultsJson": [26, 11, 8, 45, 18, 49]
  },
  {
    "drawSystemId": 7264,
    "drawDate": "2025-10-21T22:00:00Z",
    "resultsJson": [28, 11, 15, 19, 45, 27]
  },
  {
    "drawSystemId": 7263,
    "drawDate": "2025-10-18T22:00:00Z",
    "resultsJson": [13, 47, 4, 14, 38, 16]
  },
  {
    "drawSystemId": 7262,
    "drawDate": "2025-10-16T22:00:00Z",
    "resultsJson": [6, 7, 17, 30, 49, 39]
  },
  {
    "drawSystemId": 7261,
    "drawDate": "2025-10-14T22:00:00Z",
    "resultsJson": [20, 17, 48, 36, 15, 7]
  },
  {
    "drawSystemId": 7260,
    "drawDate": "2025-10-11T22:00:00Z",
    "resultsJson": [45, 10, 43, 36, 34, 32]
  },
  {
    "drawSystemId": 7259,
    "drawDate": "2025-10-09T22:00:00Z",
    "resultsJson": [18, 36, 31, 42, 43, 17]
  },
  {
    "drawSystemId": 7258,
    "drawDate": "2025-10-07T22:00:00Z",
    "resultsJson": [32, 45, 21, 3, 7, 27]
  },
  {
    "drawSystemId": 7257,
    "drawDate": "2025-10-04T22:00:00Z",
    "resultsJson": [39, 29, 37, 12, 10, 45]
  },
  {
    "drawSystemId": 7256,
    "drawDate": "2025-10-02T22:00:00Z",
    "resultsJson": [40, 5, 36, 44, 2, 14]
  },
  {
    "drawSystemId": 7255,
    "drawDate": "2025-09-30T22:00:00Z",
    "resultsJson": [35, 40, 36, 12, 39, 37]
  },
  {
    "drawSystemId": 7254,
    "drawDate": "2025-09-27T22:00:00Z",
    "resultsJson": [20, 32, 6, 46, 17, 12]
  },
  {
    "drawSystemId": 7253,
    "drawDate": "2025-09-25T22:00:00Z",
    "resultsJson": [2, 27, 5, 45, 25, 26]
  },
  {
    "drawSystemId": 7252,
    "drawDate": "2025-09-23T22:00:00Z",
    "resultsJson": [32, 6, 33, 24, 11, 20]
  },
  {
    "drawSystemId": 7251,
    "drawDate": "2025-09-20T22:00:00Z",
    "resultsJson": [36, 9, 35, 11, 14, 5]
  },
  {
    "drawSystemId": 7250,
    "drawDate": "2025-09-18T22:00:00Z",
    "resultsJson": [6, 15, 20, 34, 24, 43]
  },
  {
    "drawSystemId": 7249,
    "drawDate": "2025-09-16T22:00:00Z",
    "resultsJson": [40, 5, 7, 37, 49, 6]
  },
  {
    "drawSystemId": 7248,
    "drawDate": "2025-09-13T22:00:00Z",
    "resultsJson": [25, 27, 3, 14, 18, 13]
  },
  {
    "drawSystemId": 7247,
    "drawDate": "2025-09-11T22:00:00Z",
    "resultsJson": [24, 34, 7, 31, 6, 42]
  },
  {
    "drawSystemId": 7246,
    "drawDate": "2025-09-09T22:00:00Z",
    "resultsJson": [31, 44, 19, 34, 23, 1]
  },
  {
    "drawSystemId": 7245,
    "drawDate": "2025-09-06T22:00:00Z",
    "resultsJson": [15, 44, 38, 34, 33, 26]
  },
  {
    "drawSystemId": 7244,
    "drawDate": "2025-09-04T22:00:00Z",
    "resultsJson": [30, 15, 47, 27, 37, 2]
  },
  {
    "drawSystemId": 7243,
    "drawDate": "2025-09-02T22:00:00Z",
    "resultsJson": [33, 23, 13, 12, 36, 14]
  },
  {
    "drawSystemId": 7242,
    "drawDate": "2025-08-30T22:00:00Z",
    "resultsJson": [40, 32, 14, 36, 46, 30]
  },
  {
    "drawSystemId": 7241,
    "drawDate": "2025-08-28T22:00:00Z",
    "resultsJson": [14, 41, 30, 18, 11, 20]
  },
  {
    "drawSystemId": 7240,
    "drawDate": "2025-08-26T22:00:00Z",
    "resultsJson": [10, 36, 22, 45, 32, 18]
  },
  {
    "drawSystemId": 7239,
    "drawDate": "2025-08-23T22:00:00Z",
    "resultsJson": [30, 8, 28, 19, 27, 6]
  },
  {
    "drawSystemId": 7238,
    "drawDate": "2025-08-21T22:00:00Z",
    "resultsJson": [12, 46, 7, 24, 30, 32]
  },
  {
    "drawSystemId": 7237,
    "drawDate": "2025-08-19T22:00:00Z",
    "resultsJson": [38, 34, 40, 13, 3, 43]
  },
  {
    "drawSystemId": 7236,
    "drawDate": "2025-08-16T22:00:00Z",
    "resultsJson": [45, 21, 22, 46, 44, 17]
  },
  {
    "drawSystemId": 7235,
    "drawDate": "2025-08-14T22:00:00Z",
    "resultsJson": [3, 6, 43, 13, 46, 29]
  },
  {
    "drawSystemId": 7234,
    "drawDate": "2025-08-12T22:00:00Z",
    "resultsJson": [12, 3, 10, 25, 17, 23]
  },
  {
    "drawSystemId": 7233,
    "drawDate": "2025-08-09T22:00:00Z",
    "resultsJson": [3, 17, 9, 36, 14, 13]
  },
  {
    "drawSystemId": 7232,
    "drawDate": "2025-08-07T22:00:00Z",
    "resultsJson": [30, 31, 9, 43, 5, 49]
  },
  {
    "drawSystemId": 7231,
    "drawDate": "2025-08-05T22:00:00Z",
    "resultsJson": [5, 30, 36, 12, 14, 37]
  },
  {
    "drawSystemId": 7230,
    "drawDate": "2025-08-02T22:00:00Z",
    "resultsJson": [2, 39, 20, 30, 47, 18]
  },
  {
    "drawSystemId": 7229,
    "drawDate": "2025-07-31T22:00:00Z",
    "resultsJson": [25, 37, 24, 12, 32, 28]
  },
  {
    "drawSystemId": 7228,
    "drawDate": "2025-07-29T22:00:00Z",
    "resultsJson": [36, 34, 37, 10, 32, 39]
  },
  {
    "drawSystemId": 7227,
    "drawDate": "2025-07-26T22:00:00Z",
    "resultsJson": [32, 19, 21, 20, 42, 43]
  },
  {
    "drawSystemId": 7226,
    "drawDate": "2025-07-24T22:00:00Z",
    "resultsJson": [38, 24, 35, 25, 33, 43]
  },
  {
    "drawSystemId": 7225,
    "drawDate": "2025-07-22T22:00:00Z",
    "resultsJson": [28, 35, 41, 10, 39, 46]
  },
  {
    "drawSystemId": 7224,
    "drawDate": "2025-07-19T22:00:00Z",
    "resultsJson": [7, 15, 28, 11, 32, 33]
  },
  {
    "drawSystemId": 7223,
    "drawDate": "2025-07-17T22:00:00Z",
    "resultsJson": [35, 29, 21, 2, 22, 13]
  },
  {
    "drawSystemId": 7222,
    "drawDate": "2025-07-15T22:00:00Z",
    "resultsJson": [17, 23, 28, 49, 25, 20]
  },
  {
    "drawSystemId": 7221,
    "drawDate": "2025-07-12T22:00:00Z",
    "resultsJson": [2, 43, 17, 12, 34, 22]
  },
  {
    "drawSystemId": 7220,
    "drawDate": "2025-07-10T22:00:00Z",
    "resultsJson": [28, 14, 6, 46, 48, 11]
  },
  {
    "drawSystemId": 7219,
    "drawDate": "2025-07-08T22:00:00Z",
    "resultsJson": [13, 5, 38, 24, 12, 3]
  },
  {
    "drawSystemId": 7218,
    "drawDate": "2025-07-05T22:00:00Z",
    "resultsJson": [13, 28, 34, 37, 41, 15]
  },
  {
    "drawSystemId": 7217,
    "drawDate": "2025-07-03T22:00:00Z",
    "resultsJson": [8, 44, 49, 24, 1, 46]
  },
  {
    "drawSystemId": 7216,
    "drawDate": "2025-07-01T22:00:00Z",
    "resultsJson": [37, 49, 23, 44, 11, 21]
  },
  {
    "drawSystemId": 7215,
    "drawDate": "2025-06-28T22:00:00Z",
    "resultsJson": [23, 22, 47, 32, 12, 24]
  },
  {
    "drawSystemId": 7214,
    "drawDate": "2025-06-26T22:00:00Z",
    "resultsJson": [39, 36, 5, 19, 21, 41]
  },
  {
    "drawSystemId": 7213,
    "drawDate": "2025-06-24T22:00:00Z",
    "resultsJson": [3, 31, 41, 11, 47, 4]
  },
  {
    "drawSystemId": 7212,
    "drawDate": "2025-06-21T22:00:00Z",
    "resultsJson": [12, 46, 24, 30, 33, 43]
  },
  {
    "drawSystemId": 7211,
    "drawDate": "2025-06-19T22:00:00Z",
    "resultsJson": [42, 49, 16, 44, 19, 30]
  },
  {
    "drawSystemId": 7210,
    "drawDate": "2025-06-17T22:00:00Z",
    "resultsJson": [45, 30, 24, 43, 35, 28]
  },
  {
    "drawSystemId": 7209,
    "drawDate": "2025-06-14T22:00:00Z",
    "resultsJson": [7, 39, 30, 8, 47, 21]
  },
  {
    "drawSystemId": 7208,
    "drawDate": "2025-06-12T22:00:00Z",
    "resultsJson": [13, 17, 26, 6, 34, 42]
  },
  {
    "drawSystemId": 7207,
    "drawDate": "2025-06-10T22:00:00Z",
    "resultsJson": [28, 19, 39, 16, 34, 42]
  },
  {
    "drawSystemId": 7206,
    "drawDate": "2025-06-07T22:00:00Z",
    "resultsJson": [23, 35, 44, 34, 42, 49]
  },
  {
    "drawSystemId": 7205,
    "drawDate": "2025-06-05T22:00:00Z",
    "resultsJson": [21, 17, 26, 31, 22, 1]
  },
  {
    "drawSystemId": 7204,
    "drawDate": "2025-06-03T22:00:00Z",
    "resultsJson": [22, 10, 12, 11, 25, 36]
  },
  {
    "drawSystemId": 7203,
    "drawDate": "2025-05-31T22:00:00Z",
    "resultsJson": [45, 41, 22, 18, 21, 42]
  },
  {
    "drawSystemId": 7202,
    "drawDate": "2025-05-29T22:00:00Z",
    "resultsJson": [38, 33, 5, 44, 11, 46]
  },
  {
    "drawSystemId": 7201,
    "drawDate": "2025-05-27T22:00:00Z",
    "resultsJson": [10, 24, 7, 33, 17, 35]
  },
  {
    "drawSystemId": 7200,
    "drawDate": "2025-05-24T22:00:00Z",
    "resultsJson": [43, 4, 11, 5, 30, 19]
  },
  {
    "drawSystemId": 7199,
    "drawDate": "2025-05-22T22:00:00Z",
    "resultsJson": [18, 42, 39, 44, 45, 32]
  },
  {
    "drawSystemId": 7198,
    "drawDate": "2025-05-20T22:00:00Z",
    "resultsJson": [20, 28, 49, 25, 45, 15]
  },
  {
    "drawSystemId": 7197,
    "drawDate": "2025-05-17T22:00:00Z",
    "resultsJson": [30, 32, 49, 2, 5, 25]
  },
  {
    "drawSystemId": 7196,
    "drawDate": "2025-05-15T22:00:00Z",
    "resultsJson": [35, 7, 17, 8, 36, 46]
  },
  {
    "drawSystemId": 7195,
    "drawDate": "2025-05-13T22:00:00Z",
    "resultsJson": [16, 29, 8, 40, 33, 18]
  },
  {
    "drawSystemId": 7194,
    "drawDate": "2025-05-10T22:00:00Z",
    "resultsJson": [37, 22, 6, 9, 5, 36]
  },
  {
    "drawSystemId": 7193,
    "drawDate": "2025-05-08T22:00:00Z",
    "resultsJson": [5, 8, 35, 25, 38, 9]
  },
  {
    "drawSystemId": 7192,
    "drawDate": "2025-05-06T22:00:00Z",
    "resultsJson": [20, 31, 9, 38, 48, 42]
  },
  {
    "drawSystemId": 7191,
    "drawDate": "2025-05-03T22:00:00Z",
    "resultsJson": [10, 37, 28, 1, 2, 6]
  },
  {
    "drawSystemId": 7190,
    "drawDate": "2025-05-01T22:00:00Z",
    "resultsJson": [22, 8, 27, 46, 39, 49]
  },
  {
    "drawSystemId": 7189,
    "drawDate": "2025-04-29T22:00:00Z",
    "resultsJson": [48, 31, 4, 20, 24, 32]
  },
  {
    "drawSystemId": 7188,
    "drawDate": "2025-04-26T22:00:00Z",
    "resultsJson": [13, 10, 11, 20, 27, 49]
  },
  {
    "drawSystemId": 7187,
    "drawDate": "2025-04-24T22:00:00Z",
    "resultsJson": [2, 37, 14, 43, 5, 42]
  },
  {
    "drawSystemId": 7186,
    "drawDate": "2025-04-22T22:00:00Z",
    "resultsJson": [38, 31, 28, 1, 33, 19]
  },
  {
    "drawSystemId": 7185,
    "drawDate": "2025-04-19T22:00:00Z",
    "resultsJson": [38, 4, 36, 37, 7, 3]
  },
  {
    "drawSystemId": 7184,
    "drawDate": "2025-04-17T22:00:00Z",
    "resultsJson": [2, 28, 15, 10, 49, 33]
  },
  {
    "drawSystemId": 7183,
    "drawDate": "2025-04-15T22:00:00Z",
    "resultsJson": [25, 19, 21, 5, 26, 15]
  },
  {
    "drawSystemId": 7182,
    "drawDate": "2025-04-12T22:00:00Z",
    "resultsJson": [11, 31, 6, 19, 27, 49]
  },
  {
    "drawSystemId": 7181,
    "drawDate": "2025-04-10T22:00:00Z",
    "resultsJson": [24, 1, 23, 44, 22, 42]
  },
  {
    "drawSystemId": 7180,
    "drawDate": "2025-04-08T22:00:00Z",
    "resultsJson": [16, 27, 44, 23, 38, 35]
  },
  {
    "drawSystemId": 7179,
    "drawDate": "2025-04-05T22:00:00Z",
    "resultsJson": [25, 29, 37, 21, 7, 39]
  },
  {
    "drawSystemId": 7178,
    "drawDate": "2025-04-03T22:00:00Z",
    "resultsJson": [10, 5, 23, 4, 8, 44]
  },
  {
    "drawSystemId": 7177,
    "drawDate": "2025-04-01T22:00:00Z",
    "resultsJson": [15, 40, 6, 21, 20, 27]
  },
  {
    "drawSystemId": 7176,
    "drawDate": "2025-03-29T22:00:00Z",
    "resultsJson": [15, 41, 25, 37, 39, 29]
  },
  {
    "drawSystemId": 7175,
    "drawDate": "2025-03-27T22:00:00Z",
    "resultsJson": [16, 20, 45, 17, 35, 31]
  },
  {
    "drawSystemId": 7174,
    "drawDate": "2025-03-25T22:00:00Z",
    "resultsJson": [3, 5, 26, 15, 36, 20]
  },
  {
    "drawSystemId": 7173,
    "drawDate": "2025-03-22T22:00:00Z",
    "resultsJson": [17, 48, 35, 19, 39, 46]
  },
  {
    "drawSystemId": 7172,
    "drawDate": "2025-03-20T22:00:00Z",
    "resultsJson": [36, 39, 23, 22, 32, 18]
  },
  {
    "drawSystemId": 7171,
    "drawDate": "2025-03-18T22:00:00Z",
    "resultsJson": [25, 46, 24, 30, 44, 39]
  },
  {
    "drawSystemId": 7170,
    "drawDate": "2025-03-15T22:00:00Z",
    "resultsJson": [20, 18, 28, 11, 6, 34]
  },
  {
    "drawSystemId": 7169,
    "drawDate": "2025-03-13T22:00:00Z",
    "resultsJson": [20, 43, 40, 1, 14, 41]
  },
  {
    "drawSystemId": 7168,
    "drawDate": "2025-03-11T22:00:00Z",
    "resultsJson": [2, 49, 27, 10, 9, 16]
  },
  {
    "drawSystemId": 7167,
    "drawDate": "2025-03-08T22:00:00Z",
    "resultsJson": [20, 23, 26, 14, 49, 21]
  },
  {
    "drawSystemId": 7166,
    "drawDate": "2025-03-06T22:00:00Z",
    "resultsJson": [13, 3, 33, 11, 18, 10]
  },
  {
    "drawSystemId": 7165,
    "drawDate": "2025-03-04T22:00:00Z",
    "resultsJson": [31, 30, 24, 48, 18, 9]
  },
  {
    "drawSystemId": 7164,
    "drawDate": "2025-03-01T22:00:00Z",
    "resultsJson": [7, 10, 3, 40, 29, 46]
  },
  {
    "drawSystemId": 7163,
    "drawDate": "2025-02-27T22:00:00Z",
    "resultsJson": [6, 37, 29, 1, 7, 38]
  },
  {
    "drawSystemId": 7162,
    "drawDate": "2025-02-25T22:00:00Z",
    "resultsJson": [3, 1, 17, 10, 15, 44]
  },
  {
    "drawSystemId": 7161,
    "drawDate": "2025-02-22T22:00:00Z",
    "resultsJson": [5, 39, 2, 18, 6, 36]
  },
  {
    "drawSystemId": 7160,
    "drawDate": "2025-02-20T22:00:00Z",
    "resultsJson": [4, 20, 38, 7, 46, 19]
  },
  {
    "drawSystemId": 7159,
    "drawDate": "2025-02-18T22:00:00Z",
    "resultsJson": [5, 15, 42, 3, 8, 6]
  },
  {
    "drawSystemId": 7158,
    "drawDate": "2025-02-15T22:00:00Z",
    "resultsJson": [22, 20, 45, 32, 44, 26]
  },
  {
    "drawSystemId": 7157,
    "drawDate": "2025-02-13T22:00:00Z",
    "resultsJson": [37, 21, 35, 36, 38, 30]
  },
  {
    "drawSystemId": 7156,
    "drawDate": "2025-02-11T22:00:00Z",
    "resultsJson": [18, 3, 30, 20, 29, 17]
  },
  {
    "drawSystemId": 7155,
    "drawDate": "2025-02-08T22:00:00Z",
    "resultsJson": [23, 49, 7, 10, 24, 48]
  },
  {
    "drawSystemId": 7154,
    "drawDate": "2025-02-06T22:00:00Z",
    "resultsJson": [46, 8, 11, 36, 17, 10]
  },
  {
    "drawSystemId": 7153,
    "drawDate": "2025-02-04T22:00:00Z",
    "resultsJson": [22, 38, 17, 31, 19, 25]
  },
  {
    "drawSystemId": 7152,
    "drawDate": "2025-02-01T22:00:00Z",
    "resultsJson": [17, 6, 30, 3, 2, 20]
  },
  {
    "drawSystemId": 7151,
    "drawDate": "2025-01-30T22:00:00Z",
    "resultsJson": [43, 49, 21, 16, 30, 4]
  },
  {
    "drawSystemId": 7150,
    "drawDate": "2025-01-28T22:00:00Z",
    "resultsJson": [7, 43, 29, 31, 8, 23]
  },
  {
    "drawSystemId": 7149,
    "drawDate": "2025-01-25T22:00:00Z",
    "resultsJson": [28, 36, 30, 32, 40, 48]
  },
  {
    "drawSystemId": 7148,
    "drawDate": "2025-01-23T22:00:00Z",
    "resultsJson": [12, 9, 42, 28, 45, 40]
  },
  {
    "drawSystemId": 7147,
    "drawDate": "2025-01-21T22:00:00Z",
    "resultsJson": [39, 5, 32, 34, 12, 36]
  },
  {
    "drawSystemId": 7146,
    "drawDate": "2025-01-18T22:00:00Z",
    "resultsJson": [43, 34, 32, 48, 30, 20]
  },
  {
    "drawSystemId": 7145,
    "drawDate": "2025-01-16T22:00:00Z",
    "resultsJson": [49, 28, 30, 44, 26, 40]
  },
  {
    "drawSystemId": 7144,
    "drawDate": "2025-01-14T22:00:00Z",
    "resultsJson": [6, 43, 10, 26, 40, 34]
  },
  {
    "drawSystemId": 7143,
    "drawDate": "2025-01-11T22:00:00Z",
    "resultsJson": [17, 18, 30, 7, 11, 36]
  },
  {
    "drawSystemId": 7142,
    "drawDate": "2025-01-09T22:00:00Z",
    "resultsJson": [1, 42, 19, 44, 11, 26]
  },
  {
    "drawSystemId": 7141,
    "drawDate": "2025-01-07T22:00:00Z",
    "resultsJson": [41, 11, 18, 10, 46, 25]
  },
  {
    "drawSystemId": 7140,
    "drawDate": "2025-01-04T22:00:00Z",
    "resultsJson": [11, 31, 24, 19, 34, 45]
  },
  {
    "drawSystemId": 7139,
    "drawDate": "2025-01-02T22:00:00Z",
    "resultsJson": [17, 2, 42, 24, 43, 12]
  },
  {
    "drawSystemId": 7138,
    "drawDate": "2024-12-31T22:00:00Z",
    "resultsJson": [12, 4, 48, 46, 30, 38]
  },
  {
    "drawSystemId": 7137,
    "drawDate": "2024-12-28T22:00:00Z",
    "resultsJson": [8, 48, 31, 15, 39, 10]
  },
  {
    "drawSystemId": 7136,
    "drawDate": "2024-12-26T22:00:00Z",
    "resultsJson": [43, 9, 22, 33, 3, 42]
  },
  {
    "drawSystemId": 7135,
    "drawDate": "2024-12-24T22:00:00Z",
    "resultsJson": [8, 2, 27, 31, 4, 48]
  },
  {
    "drawSystemId": 7134,
    "drawDate": "2024-12-21T22:00:00Z",
    "resultsJson": [13, 15, 41, 17, 22, 7]
  },
  {
    "drawSystemId": 7133,
    "drawDate": "2024-12-19T22:00:00Z",
    "resultsJson": [30, 28, 20, 13, 21, 35]
  },
  {
    "drawSystemId": 7132,
    "drawDate": "2024-12-17T22:00:00Z",
    "resultsJson": [35, 40, 38, 28, 26, 49]
  },
  {
    "drawSystemId": 7131,
    "drawDate": "2024-12-14T22:00:00Z",
    "resultsJson": [47, 19, 12, 36, 49, 15]
  },
  {
    "drawSystemId": 7130,
    "drawDate": "2024-12-12T22:00:00Z",
    "resultsJson": [42, 3, 20, 46, 43, 17]
  },
  {
    "drawSystemId": 7129,
    "drawDate": "2024-12-10T22:00:00Z",
    "resultsJson": [2, 39, 31, 34, 36, 23]
  },
  {
    "drawSystemId": 7128,
    "drawDate": "2024-12-07T22:00:00Z",
    "resultsJson": [6, 41, 40, 8, 17, 22]
  },
  {
    "drawSystemId": 7127,
    "drawDate": "2024-12-05T22:00:00Z",
    "resultsJson": [34, 29, 15, 2, 19, 25]
  },
  {
    "drawSystemId": 7126,
    "drawDate": "2024-12-03T22:00:00Z",
    "resultsJson": [11, 28, 9, 36, 14, 48]
  },
  {
    "drawSystemId": 7125,
    "drawDate": "2024-11-30T22:00:00Z",
    "resultsJson": [38, 41, 9, 49, 20, 13]
  },
  {
    "drawSystemId": 7124,
    "drawDate": "2024-11-28T22:00:00Z",
    "resultsJson": [3, 11, 40, 13, 10, 24]
  },
  {
    "drawSystemId": 7123,
    "drawDate": "2024-11-26T22:00:00Z",
    "resultsJson": [4, 24, 6, 26, 44, 10]
  },
  {
    "drawSystemId": 7122,
    "drawDate": "2024-11-23T22:00:00Z",
    "resultsJson": [49, 10, 16, 32, 27, 45]
  },
  {
    "drawSystemId": 7121,
    "drawDate": "2024-11-21T22:00:00Z",
    "resultsJson": [20, 8, 26, 24, 40, 14]
  },
  {
    "drawSystemId": 7120,
    "drawDate": "2024-11-19T22:00:00Z",
    "resultsJson": [24, 12, 19, 38, 35, 2]
  },
  {
    "drawSystemId": 7119,
    "drawDate": "2024-11-16T22:00:00Z",
    "resultsJson": [36, 7, 40, 37, 26, 1]
  },
  {
    "drawSystemId": 7118,
    "drawDate": "2024-11-14T22:00:00Z",
    "resultsJson": [20, 44, 36, 1, 35, 47]
  },
  {
    "drawSystemId": 7117,
    "drawDate": "2024-11-12T22:00:00Z",
    "resultsJson": [6, 20, 38, 12, 14, 21]
  },
  {
    "drawSystemId": 7116,
    "drawDate": "2024-11-09T22:00:00Z",
    "resultsJson": [12, 35, 2, 15, 40, 16]
  },
  {
    "drawSystemId": 7115,
    "drawDate": "2024-11-07T22:00:00Z",
    "resultsJson": [1, 11, 41, 31, 22, 21]
  },
  {
    "drawSystemId": 7114,
    "drawDate": "2024-11-05T22:00:00Z",
    "resultsJson": [41, 6, 48, 16, 5, 15]
  },
  {
    "drawSystemId": 7113,
    "drawDate": "2024-11-02T22:00:00Z",
    "resultsJson": [37, 16, 5, 40, 13, 43]
  },
  {
    "drawSystemId": 7112,
    "drawDate": "2024-10-31T22:00:00Z",
    "resultsJson": [8, 48, 25, 18, 41, 10]
  },
  {
    "drawSystemId": 7111,
    "drawDate": "2024-10-29T22:00:00Z",
    "resultsJson": [19, 30, 35, 39, 14, 5]
  },
  {
    "drawSystemId": 7110,
    "drawDate": "2024-10-26T22:00:00Z",
    "resultsJson": [13, 18, 36, 34, 39, 32]
  },
  {
    "drawSystemId": 7109,
    "drawDate": "2024-10-24T22:00:00Z",
    "resultsJson": [44, 42, 17, 20, 24, 5]
  },
  {
    "drawSystemId": 7108,
    "drawDate": "2024-10-22T22:00:00Z",
    "resultsJson": [22, 20, 12, 17, 44, 24]
  },
  {
    "drawSystemId": 7107,
    "drawDate": "2024-10-19T22:00:00Z",
    "resultsJson": [9, 42, 44, 39, 10, 45]
  },
  {
    "drawSystemId": 7106,
    "drawDate": "2024-10-17T22:00:00Z",
    "resultsJson": [48, 22, 7, 40, 38, 45]
  },
  {
    "drawSystemId": 7105,
    "drawDate": "2024-10-15T22:00:00Z",
    "resultsJson": [9, 46, 12, 45, 6, 26]
  },
  {
    "drawSystemId": 7104,
    "drawDate": "2024-10-12T22:00:00Z",
    "resultsJson": [20, 5, 28, 10, 21, 13]
  },
  {
    "drawSystemId": 7103,
    "drawDate": "2024-10-10T22:00:00Z",
    "resultsJson": [38, 6, 17, 41, 36, 2]
  },
  {
    "drawSystemId": 7102,
    "drawDate": "2024-10-08T22:00:00Z",
    "resultsJson": [14, 1, 24, 45, 35, 18]
  },
  {
    "drawSystemId": 7101,
    "drawDate": "2024-10-05T22:00:00Z",
    "resultsJson": [22, 17, 48, 29, 15, 3]
  },
  {
    "drawSystemId": 7100,
    "drawDate": "2024-10-03T22:00:00Z",
    "resultsJson": [43, 23, 14, 13, 36, 48]
  },
  {
    "drawSystemId": 7099,
    "drawDate": "2024-10-01T22:00:00Z",
    "resultsJson": [3, 20, 44, 39, 45, 6]
  },
  {
    "drawSystemId": 7098,
    "drawDate": "2024-09-28T22:00:00Z",
    "resultsJson": [23, 47, 8, 26, 25, 12]
  },
  {
    "drawSystemId": 7097,
    "drawDate": "2024-09-26T22:00:00Z",
    "resultsJson": [1, 29, 41, 2, 19, 33]
  },
  {
    "drawSystemId": 7096,
    "drawDate": "2024-09-24T22:00:00Z",
    "resultsJson": [14, 49, 2, 30, 1, 26]
  },
  {
    "drawSystemId": 7095,
    "drawDate": "2024-09-21T22:00:00Z",
    "resultsJson": [4, 24, 12, 5, 36, 39]
  },
  {
    "drawSystemId": 7094,
    "drawDate": "2024-09-19T22:00:00Z",
    "resultsJson": [10, 6, 21, 2, 18, 22]
  },
  {
    "drawSystemId": 7093,
    "drawDate": "2024-09-17T22:00:00Z",
    "resultsJson": [4, 5, 12, 6, 45, 16]
  },
  {
    "drawSystemId": 7092,
    "drawDate": "2024-09-14T22:00:00Z",
    "resultsJson": [29, 35, 44, 5, 20, 11]
  },
  {
    "drawSystemId": 7091,
    "drawDate": "2024-09-12T22:00:00Z",
    "resultsJson": [32, 27, 37, 23, 33, 16]
  },
  {
    "drawSystemId": 7090,
    "drawDate": "2024-09-10T22:00:00Z",
    "resultsJson": [37, 2, 32, 26, 17, 10]
  },
  {
    "drawSystemId": 7089,
    "drawDate": "2024-09-07T22:00:00Z",
    "resultsJson": [31, 21, 8, 23, 30, 43]
  },
  {
    "drawSystemId": 7088,
    "drawDate": "2024-09-05T22:00:00Z",
    "resultsJson": [40, 32, 4, 2, 49, 21]
  },
  {
    "drawSystemId": 7087,
    "drawDate": "2024-09-03T22:00:00Z",
    "resultsJson": [11, 27, 21, 3, 19, 44]
  },
  {
    "drawSystemId": 7086,
    "drawDate": "2024-08-31T22:00:00Z",
    "resultsJson": [18, 34, 30, 12, 14, 38]
  },
  {
    "drawSystemId": 7085,
    "drawDate": "2024-08-29T22:00:00Z",
    "resultsJson": [41, 2, 13, 17, 23, 32]
  },
  {
    "drawSystemId": 7084,
    "drawDate": "2024-08-27T22:00:00Z",
    "resultsJson": [15, 27, 34, 45, 46, 3]
  },
  {
    "drawSystemId": 7083,
    "drawDate": "2024-08-24T22:00:00Z",
    "resultsJson": [37, 36, 12, 1, 6, 49]
  },
  {
    "drawSystemId": 7082,
    "drawDate": "2024-08-22T22:00:00Z",
    "resultsJson": [17, 2, 12, 8, 21, 3]
  },
  {
    "drawSystemId": 7081,
    "drawDate": "2024-08-20T22:00:00Z",
    "resultsJson": [40, 32, 17, 26, 2, 27]
  },
  {
    "drawSystemId": 7080,
    "drawDate": "2024-08-17T22:00:00Z",
    "resultsJson": [13, 16, 44, 30, 22, 38]
  },
  {
    "drawSystemId": 7079,
    "drawDate": "2024-08-15T22:00:00Z",
    "resultsJson": [37, 33, 21, 17, 9, 35]
  },
  {
    "drawSystemId": 7078,
    "drawDate": "2024-08-13T22:00:00Z",
    "resultsJson": [41, 47, 35, 13, 1, 36]
  },
  {
    "drawSystemId": 7077,
    "drawDate": "2024-08-10T22:00:00Z",
    "resultsJson": [43, 32, 17, 39, 42, 1]
  },
  {
    "drawSystemId": 7076,
    "drawDate": "2024-08-08T22:00:00Z",
    "resultsJson": [21, 49, 45, 26, 36, 39]
  },
  {
    "drawSystemId": 7075,
    "drawDate": "2024-08-06T22:00:00Z",
    "resultsJson": [29, 25, 18, 41, 6, 3]
  },
  {
    "drawSystemId": 7074,
    "drawDate": "2024-08-03T22:00:00Z",
    "resultsJson": [5, 25, 13, 48, 29, 7]
  },
  {
    "drawSystemId": 7073,
    "drawDate": "2024-08-01T22:00:00Z",
    "resultsJson": [2, 47, 18, 20, 6, 13]
  },
  {
    "drawSystemId": 7072,
    "drawDate": "2024-07-30T22:00:00Z",
    "resultsJson": [32, 16, 31, 45, 21, 36]
  },
  {
    "drawSystemId": 7071,
    "drawDate": "2024-07-27T22:00:00Z",
    "resultsJson": [9, 28, 18, 2, 1, 13]
  },
  {
    "drawSystemId": 7070,
    "drawDate": "2024-07-25T22:00:00Z",
    "resultsJson": [35, 8, 11, 19, 28, 21]
  },
  {
    "drawSystemId": 7069,
    "drawDate": "2024-07-23T22:00:00Z",
    "resultsJson": [18, 11, 30, 19, 27, 39]
  },
  {
    "drawSystemId": 7068,
    "drawDate": "2024-07-20T22:00:00Z",
    "resultsJson": [7, 5, 42, 28, 23, 20]
  },
  {
    "drawSystemId": 7067,
    "drawDate": "2024-07-18T22:00:00Z",
    "resultsJson": [14, 23, 16, 34, 40, 18]
  },
  {
    "drawSystemId": 7066,
    "drawDate": "2024-07-16T22:00:00Z",
    "resultsJson": [43, 20, 13, 7, 17, 35]
  },
  {
    "drawSystemId": 7065,
    "drawDate": "2024-07-13T22:00:00Z",
    "resultsJson": [5, 46, 40, 4, 26, 1]
  },
  {
    "drawSystemId": 7064,
    "drawDate": "2024-07-11T22:00:00Z",
    "resultsJson": [16, 4, 17, 33, 19, 41]
  },
  {
    "drawSystemId": 7063,
    "drawDate": "2024-07-09T22:00:00Z",
    "resultsJson": [23, 10, 36, 27, 32, 11]
  },
  {
    "drawSystemId": 7062,
    "drawDate": "2024-07-06T22:00:00Z",
    "resultsJson": [41, 31, 2, 43, 12, 39]
  },
  {
    "drawSystemId": 7061,
    "drawDate": "2024-07-04T22:00:00Z",
    "resultsJson": [12, 49, 16, 14, 21, 8]
  },
  {
    "drawSystemId": 7060,
    "drawDate": "2024-07-02T22:00:00Z",
    "resultsJson": [24, 12, 4, 20, 49, 23]
  },
  {
    "drawSystemId": 7059,
    "drawDate": "2024-06-29T22:00:00Z",
    "resultsJson": [13, 40, 22, 34, 8, 47]
  },
  {
    "drawSystemId": 7058,
    "drawDate": "2024-06-27T22:00:00Z",
    "resultsJson": [20, 3, 22, 26, 27, 1]
  },
  {
    "drawSystemId": 7057,
    "drawDate": "2024-06-25T22:00:00Z",
    "resultsJson": [23, 34, 7, 21, 38, 9]
  },
  {
    "drawSystemId": 7056,
    "drawDate": "2024-06-22T22:00:00Z",
    "resultsJson": [42, 33, 13, 47, 30, 48]
  },
  {
    "drawSystemId": 7055,
    "drawDate": "2024-06-20T22:00:00Z",
    "resultsJson": [13, 22, 12, 32, 4, 14]
  },
  {
    "drawSystemId": 7054,
    "drawDate": "2024-06-18T22:00:00Z",
    "resultsJson": [6, 8, 17, 12, 7, 21]
  },
  {
    "drawSystemId": 7053,
    "drawDate": "2024-06-15T22:00:00Z",
    "resultsJson": [49, 2, 47, 18, 21, 20]
  },
  {
    "drawSystemId": 7052,
    "drawDate": "2024-06-13T22:00:00Z",
    "resultsJson": [14, 48, 3, 11, 17, 30]
  },
  {
    "drawSystemId": 7051,
    "drawDate": "2024-06-11T22:00:00Z",
    "resultsJson": [10, 46, 49, 1, 48, 40]
  },
  {
    "drawSystemId": 7050,
    "drawDate": "2024-06-08T22:00:00Z",
    "resultsJson": [28, 21, 43, 32, 17, 41]
  },
  {
    "drawSystemId": 7049,
    "drawDate": "2024-06-06T22:00:00Z",
    "resultsJson": [7, 43, 42, 18, 2, 34]
  },
  {
    "drawSystemId": 7048,
    "drawDate": "2024-06-04T22:00:00Z",
    "resultsJson": [31, 21, 24, 40, 34, 1]
  },
  {
    "drawSystemId": 7047,
    "drawDate": "2024-06-01T22:00:00Z",
    "resultsJson": [38, 37, 6, 20, 2, 48]
  },
  {
    "drawSystemId": 7046,
    "drawDate": "2024-05-30T22:00:00Z",
    "resultsJson": [13, 27, 23, 38, 8, 44]
  },
  {
    "drawSystemId": 7045,
    "drawDate": "2024-05-28T22:00:00Z",
    "resultsJson": [45, 11, 38, 34, 29, 35]
  },
  {
    "drawSystemId": 7044,
    "drawDate": "2024-05-25T22:00:00Z",
    "resultsJson": [39, 28, 33, 47, 49, 42]
  },
  {
    "drawSystemId": 7043,
    "drawDate": "2024-05-23T22:00:00Z",
    "resultsJson": [17, 28, 8, 23, 24, 13]
  },
  {
    "drawSystemId": 7042,
    "drawDate": "2024-05-21T22:00:00Z",
    "resultsJson": [5, 43, 30, 31, 20, 35]
  },
  {
    "drawSystemId": 7041,
    "drawDate": "2024-05-18T22:00:00Z",
    "resultsJson": [32, 44, 39, 18, 7, 33]
  },
  {
    "drawSystemId": 7040,
    "drawDate": "2024-05-16T22:00:00Z",
    "resultsJson": [47, 11, 17, 32, 10, 25]
  },
  {
    "drawSystemId": 7039,
    "drawDate": "2024-05-14T22:00:00Z",
    "resultsJson": [33, 46, 7, 4, 32, 9]
  },
  {
    "drawSystemId": 7038,
    "drawDate": "2024-05-11T22:00:00Z",
    "resultsJson": [11, 16, 33, 43, 9, 38]
  },
  {
    "drawSystemId": 7037,
    "drawDate": "2024-05-09T22:00:00Z",
    "resultsJson": [42, 25, 7, 31, 30, 46]
  },
  {
    "drawSystemId": 7036,
    "drawDate": "2024-05-07T22:00:00Z",
    "resultsJson": [11, 46, 2, 37, 33, 18]
  },
  {
    "drawSystemId": 7035,
    "drawDate": "2024-05-04T22:00:00Z",
    "resultsJson": [42, 18, 49, 43, 45, 40]
  },
  {
    "drawSystemId": 7034,
    "drawDate": "2024-05-02T22:00:00Z",
    "resultsJson": [1, 12, 38, 15, 2, 44]
  },
  {
    "drawSystemId": 7033,
    "drawDate": "2024-04-30T22:00:00Z",
    "resultsJson": [27, 48, 40, 6, 29, 21]
  },
  {
    "drawSystemId": 7032,
    "drawDate": "2024-04-27T22:00:00Z",
    "resultsJson": [18, 28, 33, 12, 22, 23]
  },
  {
    "drawSystemId": 7031,
    "drawDate": "2024-04-25T22:00:00Z",
    "resultsJson": [48, 27, 47, 42, 35, 30]
  },
  {
    "drawSystemId": 7030,
    "drawDate": "2024-04-23T22:00:00Z",
    "resultsJson": [34, 49, 15, 24, 39, 37]
  },
  {
    "drawSystemId": 7029,
    "drawDate": "2024-04-20T22:00:00Z",
    "resultsJson": [4, 27, 43, 47, 29, 2]
  },
  {
    "drawSystemId": 7028,
    "drawDate": "2024-04-18T22:00:00Z",
    "resultsJson": [2, 10, 42, 36, 38, 3]
  },
  {
    "drawSystemId": 7027,
    "drawDate": "2024-04-16T22:00:00Z",
    "resultsJson": [25, 26, 30, 42, 6, 2]
  },
  {
    "drawSystemId": 7026,
    "drawDate": "2024-04-13T22:00:00Z",
    "resultsJson": [25, 16, 49, 7, 11, 13]
  },
  {
    "drawSystemId": 7025,
    "drawDate": "2024-04-11T22:00:00Z",
    "resultsJson": [2, 5, 7, 18, 32, 23]
  },
  {
    "drawSystemId": 7024,
    "drawDate": "2024-04-09T22:00:00Z",
    "resultsJson": [29, 6, 2, 31, 44, 25]
  },
  {
    "drawSystemId": 7023,
    "drawDate": "2024-04-06T22:00:00Z",
    "resultsJson": [49, 29, 45, 39, 19, 47]
  },
  {
    "drawSystemId": 7022,
    "drawDate": "2024-04-04T22:00:00Z",
    "resultsJson": [13, 6, 44, 35, 27, 2]
  },
  {
    "drawSystemId": 7021,
    "drawDate": "2024-04-02T22:00:00Z",
    "resultsJson": [49, 11, 12, 15, 34, 10]
  },
  {
    "drawSystemId": 7020,
    "drawDate": "2024-03-30T22:00:00Z",
    "resultsJson": [49, 43, 38, 15, 6, 2]
  },
  {
    "drawSystemId": 7019,
    "drawDate": "2024-03-28T22:00:00Z",
    "resultsJson": [27, 30, 5, 43, 38, 3]
  },
  {
    "drawSystemId": 7018,
    "drawDate": "2024-03-26T22:00:00Z",
    "resultsJson": [19, 17, 32, 26, 24, 23]
  },
  {
    "drawSystemId": 7017,
    "drawDate": "2024-03-23T22:00:00Z",
    "resultsJson": [17, 26, 9, 30, 12, 2]
  },
  {
    "drawSystemId": 7016,
    "drawDate": "2024-03-21T22:00:00Z",
    "resultsJson": [29, 13, 26, 24, 14, 49]
  },
  {
    "drawSystemId": 7015,
    "drawDate": "2024-03-19T22:00:00Z",
    "resultsJson": [41, 39, 48, 31, 4, 12]
  },
  {
    "drawSystemId": 7014,
    "drawDate": "2024-03-16T22:00:00Z",
    "resultsJson": [10, 21, 24, 28, 23, 49]
  },
  {
    "drawSystemId": 7013,
    "drawDate": "2024-03-14T22:00:00Z",
    "resultsJson": [2, 45, 42, 16, 43, 5]
  },
  {
    "drawSystemId": 7012,
    "drawDate": "2024-03-12T22:00:00Z",
    "resultsJson": [17, 42, 12, 28, 25, 47]
  },
  {
    "drawSystemId": 7011,
    "drawDate": "2024-03-09T22:00:00Z",
    "resultsJson": [46, 29, 48, 28, 4, 7]
  },
  {
    "drawSystemId": 7010,
    "drawDate": "2024-03-07T22:00:00Z",
    "resultsJson": [49, 30, 46, 13, 16, 26]
  },
  {
    "drawSystemId": 7009,
    "drawDate": "2024-03-05T22:00:00Z",
    "resultsJson": [22, 4, 49, 7, 9, 36]
  },
  {
    "drawSystemId": 7008,
    "drawDate": "2024-03-02T22:00:00Z",
    "resultsJson": [37, 22, 16, 2, 36, 13]
  },
  {
    "drawSystemId": 7007,
    "drawDate": "2024-02-29T22:00:00Z",
    "resultsJson": [34, 12, 46, 15, 17, 39]
  },
  {
    "drawSystemId": 7006,
    "drawDate": "2024-02-27T22:00:00Z",
    "resultsJson": [12, 41, 4, 11, 34, 37]
  },
  {
    "drawSystemId": 7005,
    "drawDate": "2024-02-24T22:00:00Z",
    "resultsJson": [10, 13, 22, 21, 49, 4]
  },
  {
    "drawSystemId": 7004,
    "drawDate": "2024-02-22T22:00:00Z",
    "resultsJson": [46, 16, 21, 1, 47, 18]
  },
  {
    "drawSystemId": 7003,
    "drawDate": "2024-02-20T22:00:00Z",
    "resultsJson": [7, 41, 10, 14, 27, 45]
  },
  {
    "drawSystemId": 7002,
    "drawDate": "2024-02-17T22:00:00Z",
    "resultsJson": [20, 7, 6, 19, 11, 47]
  },
  {
    "drawSystemId": 7001,
    "drawDate": "2024-02-15T22:00:00Z",
    "resultsJson": [1, 49, 7, 19, 9, 17]
  },
  {
    "drawSystemId": 7000,
    "drawDate": "2024-02-13T22:00:00Z",
    "resultsJson": [42, 48, 37, 1, 8, 36]
  },
  {
    "drawSystemId": 6999,
    "drawDate": "2024-02-10T22:00:00Z",
    "resultsJson": [11, 37, 26, 18, 20, 47]
  },
  {
    "drawSystemId": 6998,
    "drawDate": "2024-02-08T22:00:00Z",
    "resultsJson": [14, 11, 20, 46, 15, 39]
  },
  {
    "drawSystemId": 6997,
    "drawDate": "2024-02-06T22:00:00Z",
    "resultsJson": [40, 4, 18, 45, 34, 44]
  },
  {
    "drawSystemId": 6996,
    "drawDate": "2024-02-03T22:00:00Z",
    "resultsJson": [38, 18, 2, 40, 6, 12]
  },
  {
    "drawSystemId": 6995,
    "drawDate": "2024-02-01T22:00:00Z",
    "resultsJson": [41, 36, 48, 43, 22, 32]
  },
  {
    "drawSystemId": 6994,
    "drawDate": "2024-01-30T22:00:00Z",
    "resultsJson": [6, 49, 7, 40, 32, 43]
  },
  {
    "drawSystemId": 6993,
    "drawDate": "2024-01-27T22:00:00Z",
    "resultsJson": [17, 5, 41, 10, 44, 48]
  },
  {
    "drawSystemId": 6992,
    "drawDate": "2024-01-25T22:00:00Z",
    "resultsJson": [1, 37, 13, 2, 30, 47]
  },
  {
    "drawSystemId": 6991,
    "drawDate": "2024-01-23T22:00:00Z",
    "resultsJson": [41, 26, 12, 21, 23, 15]
  },
  {
    "drawSystemId": 6990,
    "drawDate": "2024-01-20T22:00:00Z",
    "resultsJson": [44, 38, 43, 9, 29, 22]
  },
  {
    "drawSystemId": 6989,
    "drawDate": "2024-01-18T22:00:00Z",
    "resultsJson": [27, 28, 3, 19, 18, 20]
  },
  {
    "drawSystemId": 6988,
    "drawDate": "2024-01-16T22:00:00Z",
    "resultsJson": [5, 29, 2, 23, 22, 14]
  },
  {
    "drawSystemId": 6987,
    "drawDate": "2024-01-13T22:00:00Z",
    "resultsJson": [7, 29, 24, 36, 46, 44]
  },
  {
    "drawSystemId": 6986,
    "drawDate": "2024-01-11T22:00:00Z",
    "resultsJson": [17, 38, 34, 13, 2, 26]
  },
  {
    "drawSystemId": 6985,
    "drawDate": "2024-01-09T22:00:00Z",
    "resultsJson": [48, 4, 20, 28, 19, 23]
  },
  {
    "drawSystemId": 6984,
    "drawDate": "2024-01-06T22:00:00Z",
    "resultsJson": [2, 8, 5, 42, 30, 9]
  },
  {
    "drawSystemId": 6983,
    "drawDate": "2024-01-04T22:00:00Z",
    "resultsJson": [10, 28, 46, 44, 25, 26]
  },
  {
    "drawSystemId": 6982,
    "drawDate": "2024-01-02T22:00:00Z",
    "resultsJson": [15, 30, 18, 49, 37, 28]
  },
  {
    "drawSystemId": 6981,
    "drawDate": "2023-12-30T22:00:00Z",
    "resultsJson": [24, 37, 21, 32, 8, 44]
  },
  {
    "drawSystemId": 6980,
    "drawDate": "2023-12-28T22:00:00Z",
    "resultsJson": [5, 27, 40, 44, 29, 33]
  },
  {
    "drawSystemId": 6979,
    "drawDate": "2023-12-26T22:00:00Z",
    "resultsJson": [17, 2, 49, 13, 45, 36]
  },
  {
    "drawSystemId": 6978,
    "drawDate": "2023-12-23T22:00:00Z",
    "resultsJson": [4, 21, 36, 11, 41, 15]
  },
  {
    "drawSystemId": 6977,
    "drawDate": "2023-12-21T22:00:00Z",
    "resultsJson": [29, 30, 5, 19, 14, 10]
  },
  {
    "drawSystemId": 6976,
    "drawDate": "2023-12-19T22:00:00Z",
    "resultsJson": [47, 16, 35, 31, 28, 12]
  },
  {
    "drawSystemId": 6975,
    "drawDate": "2023-12-16T22:00:00Z",
    "resultsJson": [28, 7, 22, 46, 29, 6]
  },
  {
    "drawSystemId": 6974,
    "drawDate": "2023-12-14T22:00:00Z",
    "resultsJson": [37, 15, 21, 48, 24, 4]
  },
  {
    "drawSystemId": 6973,
    "drawDate": "2023-12-12T22:00:00Z",
    "resultsJson": [45, 24, 21, 15, 38, 13]
  },
  {
    "drawSystemId": 6972,
    "drawDate": "2023-12-09T22:00:00Z",
    "resultsJson": [35, 49, 37, 45, 14, 21]
  },
  {
    "drawSystemId": 6971,
    "drawDate": "2023-12-07T22:00:00Z",
    "resultsJson": [4, 15, 23, 14, 28, 44]
  },
  {
    "drawSystemId": 6970,
    "drawDate": "2023-12-05T22:00:00Z",
    "resultsJson": [37, 44, 25, 28, 14, 4]
  },
  {
    "drawSystemId": 6969,
    "drawDate": "2023-12-02T22:00:00Z",
    "resultsJson": [1, 23, 19, 3, 4, 40]
  },
  {
    "drawSystemId": 6968,
    "drawDate": "2023-11-30T22:00:00Z",
    "resultsJson": [16, 20, 15, 37, 21, 24]
  },
  {
    "drawSystemId": 6967,
    "drawDate": "2023-11-28T22:00:00Z",
    "resultsJson": [47, 26, 12, 21, 44, 40]
  },
  {
    "drawSystemId": 6966,
    "drawDate": "2023-11-25T22:00:00Z",
    "resultsJson": [44, 38, 9, 28, 15, 25]
  },
  {
    "drawSystemId": 6965,
    "drawDate": "2023-11-23T22:00:00Z",
    "resultsJson": [28, 14, 42, 31, 3, 4]
  },
  {
    "drawSystemId": 6964,
    "drawDate": "2023-11-21T22:00:00Z",
    "resultsJson": [47, 49, 39, 2, 32, 17]
  },
  {
    "drawSystemId": 6963,
    "drawDate": "2023-11-18T22:00:00Z",
    "resultsJson": [26, 20, 38, 14, 34, 46]
  },
  {
    "drawSystemId": 6962,
    "drawDate": "2023-11-16T22:00:00Z",
    "resultsJson": [30, 16, 29, 24, 32, 4]
  },
  {
    "drawSystemId": 6961,
    "drawDate": "2023-11-14T22:00:00Z",
    "resultsJson": [47, 10, 4, 43, 36, 13]
  },
  {
    "drawSystemId": 6960,
    "drawDate": "2023-11-11T22:00:00Z",
    "resultsJson": [10, 30, 32, 22, 14, 27]
  },
  {
    "drawSystemId": 6959,
    "drawDate": "2023-11-09T22:00:00Z",
    "resultsJson": [24, 36, 7, 35, 4, 47]
  },
  {
    "drawSystemId": 6958,
    "drawDate": "2023-11-07T22:00:00Z",
    "resultsJson": [8, 23, 22, 37, 5, 44]
  },
  {
    "drawSystemId": 6957,
    "drawDate": "2023-11-04T22:00:00Z",
    "resultsJson": [36, 2, 48, 17, 29, 9]
  },
  {
    "drawSystemId": 6956,
    "drawDate": "2023-11-02T22:00:00Z",
    "resultsJson": [5, 17, 15, 31, 7, 49]
  },
  {
    "drawSystemId": 6955,
    "drawDate": "2023-10-31T22:00:00Z",
    "resultsJson": [33, 43, 28, 26, 41, 47]
  },
  {
    "drawSystemId": 6954,
    "drawDate": "2023-10-28T22:00:00Z",
    "resultsJson": [30, 7, 8, 24, 38, 47]
  },
  {
    "drawSystemId": 6953,
    "drawDate": "2023-10-26T22:00:00Z",
    "resultsJson": [4, 25, 5, 31, 38, 18]
  },
  {
    "drawSystemId": 6952,
    "drawDate": "2023-10-24T22:00:00Z",
    "resultsJson": [27, 3, 19, 43, 36, 28]
  },
  {
    "drawSystemId": 6951,
    "drawDate": "2023-10-21T22:00:00Z",
    "resultsJson": [17, 5, 47, 13, 39, 36]
  },
  {
    "drawSystemId": 6950,
    "drawDate": "2023-10-19T22:00:00Z",
    "resultsJson": [46, 30, 6, 48, 38, 49]
  },
  {
    "drawSystemId": 6949,
    "drawDate": "2023-10-17T22:00:00Z",
    "resultsJson": [40, 15, 42, 39, 5, 33]
  },
  {
    "drawSystemId": 6948,
    "drawDate": "2023-10-14T22:00:00Z",
    "resultsJson": [37, 46, 47, 19, 9, 41]
  },
  {
    "drawSystemId": 6947,
    "drawDate": "2023-10-12T22:00:00Z",
    "resultsJson": [9, 17, 41, 16, 27, 18]
  },
  {
    "drawSystemId": 6946,
    "drawDate": "2023-10-10T22:00:00Z",
    "resultsJson": [10, 17, 28, 22, 2, 42]
  },
  {
    "drawSystemId": 6945,
    "drawDate": "2023-10-07T22:00:00Z",
    "resultsJson": [17, 44, 13, 37, 31, 49]
  },
  {
    "drawSystemId": 6944,
    "drawDate": "2023-10-05T22:00:00Z",
    "resultsJson": [43, 17, 18, 36, 31, 49]
  },
  {
    "drawSystemId": 6943,
    "drawDate": "2023-10-03T22:00:00Z",
    "resultsJson": [9, 37, 1, 12, 49, 8]
  },
  {
    "drawSystemId": 6942,
    "drawDate": "2023-09-30T22:00:00Z",
    "resultsJson": [33, 27, 28, 25, 32, 48]
  },
  {
    "drawSystemId": 6941,
    "drawDate": "2023-09-28T22:00:00Z",
    "resultsJson": [34, 5, 1, 44, 23, 9]
  },
  {
    "drawSystemId": 6940,
    "drawDate": "2023-09-26T22:00:00Z",
    "resultsJson": [29, 5, 20, 7, 33, 46]
  },
  {
    "drawSystemId": 6939,
    "drawDate": "2023-09-23T22:00:00Z",
    "resultsJson": [9, 46, 32, 21, 39, 7]
  },
  {
    "drawSystemId": 6938,
    "drawDate": "2023-09-21T22:00:00Z",
    "resultsJson": [36, 14, 13, 37, 49, 33]
  },
  {
    "drawSystemId": 6937,
    "drawDate": "2023-09-19T22:00:00Z",
    "resultsJson": [12, 33, 2, 36, 6, 47]
  },
  {
    "drawSystemId": 6936,
    "drawDate": "2023-09-16T22:00:00Z",
    "resultsJson": [31, 42, 33, 34, 14, 41]
  },
  {
    "drawSystemId": 6935,
    "drawDate": "2023-09-14T22:00:00Z",
    "resultsJson": [46, 11, 25, 20, 30, 7]
  },
  {
    "drawSystemId": 6934,
    "drawDate": "2023-09-12T22:00:00Z",
    "resultsJson": [46, 25, 48, 41, 8, 43]
  },
  {
    "drawSystemId": 6933,
    "drawDate": "2023-09-09T22:00:00Z",
    "resultsJson": [38, 20, 35, 36, 17, 4]
  },
  {
    "drawSystemId": 6932,
    "drawDate": "2023-09-07T22:00:00Z",
    "resultsJson": [30, 31, 36, 32, 17, 39]
  },
  {
    "drawSystemId": 6931,
    "drawDate": "2023-09-05T22:00:00Z",
    "resultsJson": [7, 9, 30, 24, 27, 2]
  },
  {
    "drawSystemId": 6930,
    "drawDate": "2023-09-02T22:00:00Z",
    "resultsJson": [36, 1, 44, 26, 11, 5]
  },
  {
    "drawSystemId": 6929,
    "drawDate": "2023-08-31T22:00:00Z",
    "resultsJson": [27, 7, 2, 6, 23, 47]
  },
  {
    "drawSystemId": 6928,
    "drawDate": "2023-08-29T22:00:00Z",
    "resultsJson": [16, 22, 5, 21, 19, 32]
  },
  {
    "drawSystemId": 6927,
    "drawDate": "2023-08-26T22:00:00Z",
    "resultsJson": [30, 22, 47, 26, 20, 25]
  },
  {
    "drawSystemId": 6926,
    "drawDate": "2023-08-24T22:00:00Z",
    "resultsJson": [2, 49, 16, 39, 44, 36]
  },
  {
    "drawSystemId": 6925,
    "drawDate": "2023-08-22T22:00:00Z",
    "resultsJson": [38, 16, 31, 42, 23, 8]
  },
  {
    "drawSystemId": 6924,
    "drawDate": "2023-08-19T22:00:00Z",
    "resultsJson": [4, 11, 40, 16, 5, 9]
  },
  {
    "drawSystemId": 6923,
    "drawDate": "2023-08-17T22:00:00Z",
    "resultsJson": [49, 4, 11, 15, 25, 36]
  },
  {
    "drawSystemId": 6922,
    "drawDate": "2023-08-15T22:00:00Z",
    "resultsJson": [12, 32, 22, 47, 36, 19]
  },
  {
    "drawSystemId": 6921,
    "drawDate": "2023-08-12T22:00:00Z",
    "resultsJson": [39, 33, 10, 28, 5, 19]
  },
  {
    "drawSystemId": 6920,
    "drawDate": "2023-08-10T22:00:00Z",
    "resultsJson": [23, 9, 44, 17, 5, 12]
  },
  {
    "drawSystemId": 6919,
    "drawDate": "2023-08-08T22:00:00Z",
    "resultsJson": [32, 26, 35, 46, 43, 33]
  },
  {
    "drawSystemId": 6918,
    "drawDate": "2023-08-05T22:00:00Z",
    "resultsJson": [16, 9, 27, 13, 17, 26]
  },
  {
    "drawSystemId": 6917,
    "drawDate": "2023-08-03T22:00:00Z",
    "resultsJson": [8, 48, 5, 39, 42, 6]
  },
  {
    "drawSystemId": 6916,
    "drawDate": "2023-08-01T22:00:00Z",
    "resultsJson": [41, 4, 23, 42, 48, 40]
  },
  {
    "drawSystemId": 6915,
    "drawDate": "2023-07-29T22:00:00Z",
    "resultsJson": [12, 20, 1, 45, 40, 11]
  },
  {
    "drawSystemId": 6914,
    "drawDate": "2023-07-27T22:00:00Z",
    "resultsJson": [1, 22, 5, 21, 37, 7]
  },
  {
    "drawSystemId": 6913,
    "drawDate": "2023-07-25T22:00:00Z",
    "resultsJson": [49, 32, 14, 48, 39, 28]
  },
  {
    "drawSystemId": 6912,
    "drawDate": "2023-07-22T22:00:00Z",
    "resultsJson": [9, 5, 21, 25, 22, 17]
  },
  {
    "drawSystemId": 6911,
    "drawDate": "2023-07-20T22:00:00Z",
    "resultsJson": [39, 12, 34, 49, 18, 1]
  },
  {
    "drawSystemId": 6910,
    "drawDate": "2023-07-18T22:00:00Z",
    "resultsJson": [38, 18, 17, 41, 23, 19]
  },
  {
    "drawSystemId": 6909,
    "drawDate": "2023-07-15T22:00:00Z",
    "resultsJson": [48, 12, 38, 9, 5, 36]
  },
  {
    "drawSystemId": 6908,
    "drawDate": "2023-07-13T22:00:00Z",
    "resultsJson": [38, 32, 33, 34, 22, 44]
  },
  {
    "drawSystemId": 6907,
    "drawDate": "2023-07-11T22:00:00Z",
    "resultsJson": [45, 42, 44, 34, 9, 17]
  },
  {
    "drawSystemId": 6906,
    "drawDate": "2023-07-08T22:00:00Z",
    "resultsJson": [20, 47, 24, 5, 15, 8]
  },
  {
    "drawSystemId": 6905,
    "drawDate": "2023-07-06T22:00:00Z",
    "resultsJson": [43, 41, 23, 40, 45, 17]
  },
  {
    "drawSystemId": 6904,
    "drawDate": "2023-07-04T22:00:00Z",
    "resultsJson": [40, 28, 43, 19, 27, 8]
  },
  {
    "drawSystemId": 6903,
    "drawDate": "2023-07-01T22:00:00Z",
    "resultsJson": [5, 43, 40, 39, 8, 18]
  },
  {
    "drawSystemId": 6902,
    "drawDate": "2023-06-29T22:00:00Z",
    "resultsJson": [31, 26, 2, 35, 21, 13]
  },
  {
    "drawSystemId": 6901,
    "drawDate": "2023-06-27T22:00:00Z",
    "resultsJson": [1, 48, 38, 17, 19, 16]
  },
  {
    "drawSystemId": 6900,
    "drawDate": "2023-06-24T22:00:00Z",
    "resultsJson": [11, 12, 25, 37, 7, 48]
  },
  {
    "drawSystemId": 6899,
    "drawDate": "2023-06-22T22:00:00Z",
    "resultsJson": [17, 47, 45, 35, 9, 41]
  },
  {
    "drawSystemId": 6898,
    "drawDate": "2023-06-20T22:00:00Z",
    "resultsJson": [12, 11, 39, 37, 31, 16]
  },
  {
    "drawSystemId": 6897,
    "drawDate": "2023-06-17T22:00:00Z",
    "resultsJson": [49, 27, 19, 20, 5, 2]
  },
  {
    "drawSystemId": 6896,
    "drawDate": "2023-06-15T22:00:00Z",
    "resultsJson": [7, 16, 23, 47, 24, 38]
  },
  {
    "drawSystemId": 6895,
    "drawDate": "2023-06-13T22:00:00Z",
    "resultsJson": [47, 21, 9, 40, 37, 38]
  },
  {
    "drawSystemId": 6894,
    "drawDate": "2023-06-10T22:00:00Z",
    "resultsJson": [48, 43, 40, 29, 6, 31]
  },
  {
    "drawSystemId": 6893,
    "drawDate": "2023-06-08T22:00:00Z",
    "resultsJson": [36, 13, 45, 47, 6, 21]
  },
  {
    "drawSystemId": 6892,
    "drawDate": "2023-06-06T22:00:00Z",
    "resultsJson": [6, 48, 18, 4, 30, 47]
  },
  {
    "drawSystemId": 6891,
    "drawDate": "2023-06-03T22:00:00Z",
    "resultsJson": [34, 35, 15, 31, 2, 17]
  },
  {
    "drawSystemId": 6890,
    "drawDate": "2023-06-01T22:00:00Z",
    "resultsJson": [49, 17, 6, 29, 23, 5]
  },
  {
    "drawSystemId": 6889,
    "drawDate": "2023-05-30T22:00:00Z",
    "resultsJson": [8, 32, 44, 47, 19, 37]
  },
  {
    "drawSystemId": 6888,
    "drawDate": "2023-05-27T22:00:00Z",
    "resultsJson": [33, 44, 24, 34, 49, 31]
  },
  {
    "drawSystemId": 6887,
    "drawDate": "2023-05-25T22:00:00Z",
    "resultsJson": [46, 15, 2, 7, 41, 11]
  },
  {
    "drawSystemId": 6886,
    "drawDate": "2023-05-23T22:00:00Z",
    "resultsJson": [28, 35, 12, 1, 11, 6]
  },
  {
    "drawSystemId": 6885,
    "drawDate": "2023-05-20T22:00:00Z",
    "resultsJson": [8, 48, 40, 7, 12, 16]
  },
  {
    "drawSystemId": 6884,
    "drawDate": "2023-05-18T22:00:00Z",
    "resultsJson": [20, 29, 48, 5, 7, 45]
  },
  {
    "drawSystemId": 6883,
    "drawDate": "2023-05-16T22:00:00Z",
    "resultsJson": [18, 4, 33, 46, 34, 16]
  },
  {
    "drawSystemId": 6882,
    "drawDate": "2023-05-13T22:00:00Z",
    "resultsJson": [32, 2, 8, 7, 41, 45]
  },
  {
    "drawSystemId": 6881,
    "drawDate": "2023-05-11T22:00:00Z",
    "resultsJson": [27, 38, 3, 2, 46, 9]
  },
  {
    "drawSystemId": 6880,
    "drawDate": "2023-05-09T22:00:00Z",
    "resultsJson": [27, 28, 8, 16, 49, 38]
  },
  {
    "drawSystemId": 6879,
    "drawDate": "2023-05-06T22:00:00Z",
    "resultsJson": [16, 31, 38, 42, 1, 27]
  },
  {
    "drawSystemId": 6878,
    "drawDate": "2023-05-04T22:00:00Z",
    "resultsJson": [49, 15, 33, 11, 14, 9]
  },
  {
    "drawSystemId": 6877,
    "drawDate": "2023-05-02T22:00:00Z",
    "resultsJson": [36, 45, 4, 2, 27, 26]
  },
  {
    "drawSystemId": 6876,
    "drawDate": "2023-04-29T22:00:00Z",
    "resultsJson": [30, 17, 39, 13, 7, 29]
  },
  {
    "drawSystemId": 6875,
    "drawDate": "2023-04-27T22:00:00Z",
    "resultsJson": [47, 5, 32, 33, 49, 37]
  },
  {
    "drawSystemId": 6874,
    "drawDate": "2023-04-25T22:00:00Z",
    "resultsJson": [44, 39, 5, 2, 6, 11]
  },
  {
    "drawSystemId": 6873,
    "drawDate": "2023-04-22T22:00:00Z",
    "resultsJson": [41, 44, 10, 25, 7, 5]
  },
  {
    "drawSystemId": 6872,
    "drawDate": "2023-04-20T22:00:00Z",
    "resultsJson": [17, 28, 10, 26, 47, 31]
  },
  {
    "drawSystemId": 6871,
    "drawDate": "2023-04-18T22:00:00Z",
    "resultsJson": [34, 27, 35, 23, 12, 20]
  },
  {
    "drawSystemId": 6870,
    "drawDate": "2023-04-15T22:00:00Z",
    "resultsJson": [40, 6, 5, 48, 36, 14]
  },
  {
    "drawSystemId": 6869,
    "drawDate": "2023-04-13T22:00:00Z",
    "resultsJson": [10, 9, 40, 45, 7, 41]
  },
  {
    "drawSystemId": 6868,
    "drawDate": "2023-04-11T22:00:00Z",
    "resultsJson": [7, 30, 33, 46, 1, 11]
  },
  {
    "drawSystemId": 6867,
    "drawDate": "2023-04-08T22:00:00Z",
    "resultsJson": [47, 3, 45, 38, 14, 30]
  },
  {
    "drawSystemId": 6866,
    "drawDate": "2023-04-06T22:00:00Z",
    "resultsJson": [44, 34, 11, 1, 29, 4]
  },
  {
    "drawSystemId": 6865,
    "drawDate": "2023-04-04T22:00:00Z",
    "resultsJson": [15, 35, 46, 31, 17, 26]
  },
  {
    "drawSystemId": 6864,
    "drawDate": "2023-04-01T22:00:00Z",
    "resultsJson": [4, 43, 21, 46, 9, 29]
  },
  {
    "drawSystemId": 6863,
    "drawDate": "2023-03-30T22:00:00Z",
    "resultsJson": [19, 43, 45, 44, 49, 10]
  },
  {
    "drawSystemId": 6862,
    "drawDate": "2023-03-28T22:00:00Z",
    "resultsJson": [34, 23, 3, 13, 15, 10]
  },
  {
    "drawSystemId": 6861,
    "drawDate": "2023-03-25T22:00:00Z",
    "resultsJson": [40, 12, 3, 31, 19, 43]
  },
  {
    "drawSystemId": 6860,
    "drawDate": "2023-03-23T22:00:00Z",
    "resultsJson": [44, 45, 28, 43, 13, 34]
  },
  {
    "drawSystemId": 6859,
    "drawDate": "2023-03-21T22:00:00Z",
    "resultsJson": [25, 19, 1, 36, 7, 21]
  },
  {
    "drawSystemId": 6858,
    "drawDate": "2023-03-18T22:00:00Z",
    "resultsJson": [42, 3, 9, 49, 36, 20]
  },
  {
    "drawSystemId": 6857,
    "drawDate": "2023-03-16T22:00:00Z",
    "resultsJson": [39, 40, 41, 3, 43, 8]
  },
  {
    "drawSystemId": 6856,
    "drawDate": "2023-03-14T22:00:00Z",
    "resultsJson": [36, 42, 21, 12, 8, 15]
  },
  {
    "drawSystemId": 6855,
    "drawDate": "2023-03-11T22:00:00Z",
    "resultsJson": [21, 44, 1, 16, 40, 20]
  },
  {
    "drawSystemId": 6854,
    "drawDate": "2023-03-09T22:00:00Z",
    "resultsJson": [30, 35, 33, 27, 39, 5]
  },
  {
    "drawSystemId": 6853,
    "drawDate": "2023-03-07T22:00:00Z",
    "resultsJson": [46, 36, 44, 37, 20, 18]
  },
  {
    "drawSystemId": 6852,
    "drawDate": "2023-03-04T22:00:00Z",
    "resultsJson": [32, 48, 21, 10, 34, 11]
  },
  {
    "drawSystemId": 6851,
    "drawDate": "2023-03-02T22:00:00Z",
    "resultsJson": [10, 30, 49, 1, 4, 28]
  },
  {
    "drawSystemId": 6850,
    "drawDate": "2023-02-28T22:00:00Z",
    "resultsJson": [46, 41, 2, 36, 42, 45]
  },
  {
    "drawSystemId": 6849,
    "drawDate": "2023-02-25T22:00:00Z",
    "resultsJson": [38, 7, 35, 41, 45, 10]
  },
  {
    "drawSystemId": 6848,
    "drawDate": "2023-02-23T22:00:00Z",
    "resultsJson": [10, 48, 26, 43, 22, 13]
  },
  {
    "drawSystemId": 6847,
    "drawDate": "2023-02-21T22:00:00Z",
    "resultsJson": [38, 25, 23, 1, 12, 17]
  },
  {
    "drawSystemId": 6846,
    "drawDate": "2023-02-18T22:00:00Z",
    "resultsJson": [1, 27, 48, 42, 30, 32]
  },
  {
    "drawSystemId": 6845,
    "drawDate": "2023-02-16T22:00:00Z",
    "resultsJson": [13, 20, 15, 36, 26, 28]
  },
  {
    "drawSystemId": 6844,
    "drawDate": "2023-02-14T22:00:00Z",
    "resultsJson": [26, 24, 48, 33, 14, 34]
  },
  {
    "drawSystemId": 6843,
    "drawDate": "2023-02-11T22:00:00Z",
    "resultsJson": [16, 6, 24, 14, 44, 28]
  },
  {
    "drawSystemId": 6842,
    "drawDate": "2023-02-09T22:00:00Z",
    "resultsJson": [45, 40, 1, 13, 49, 26]
  },
  {
    "drawSystemId": 6841,
    "drawDate": "2023-02-07T22:00:00Z",
    "resultsJson": [14, 40, 10, 13, 23, 44]
  },
  {
    "drawSystemId": 6840,
    "drawDate": "2023-02-04T22:00:00Z",
    "resultsJson": [22, 26, 48, 14, 47, 20]
  },
  {
    "drawSystemId": 6839,
    "drawDate": "2023-02-02T22:00:00Z",
    "resultsJson": [31, 40, 46, 35, 29, 18]
  },
  {
    "drawSystemId": 6838,
    "drawDate": "2023-01-31T22:00:00Z",
    "resultsJson": [46, 41, 8, 19, 5, 28]
  },
  {
    "drawSystemId": 6837,
    "drawDate": "2023-01-28T22:00:00Z",
    "resultsJson": [4, 24, 39, 44, 40, 34]
  },
  {
    "drawSystemId": 6836,
    "drawDate": "2023-01-26T22:00:00Z",
    "resultsJson": [35, 7, 15, 26, 33, 28]
  },
  {
    "drawSystemId": 6835,
    "drawDate": "2023-01-24T22:00:00Z",
    "resultsJson": [13, 3, 33, 8, 10, 6]
  },
  {
    "drawSystemId": 6834,
    "drawDate": "2023-01-21T22:00:00Z",
    "resultsJson": [26, 37, 43, 14, 41, 47]
  },
  {
    "drawSystemId": 6833,
    "drawDate": "2023-01-19T22:00:00Z",
    "resultsJson": [41, 18, 2, 1, 48, 22]
  },
  {
    "drawSystemId": 6832,
    "drawDate": "2023-01-17T22:00:00Z",
    "resultsJson": [18, 49, 8, 22, 11, 38]
  },
  {
    "drawSystemId": 6831,
    "drawDate": "2023-01-14T22:00:00Z",
    "resultsJson": [14, 34, 45, 44, 23, 39]
  },
  {
    "drawSystemId": 6830,
    "drawDate": "2023-01-12T22:00:00Z",
    "resultsJson": [44, 45, 32, 33, 25, 31]
  },
  {
    "drawSystemId": 6829,
    "drawDate": "2023-01-10T22:00:00Z",
    "resultsJson": [40, 3, 48, 10, 30, 11]
  },
  {
    "drawSystemId": 6828,
    "drawDate": "2023-01-07T22:00:00Z",
    "resultsJson": [9, 12, 43, 29, 21, 3]
  },
  {
    "drawSystemId": 6827,
    "drawDate": "2023-01-05T22:00:00Z",
    "resultsJson": [31, 43, 49, 45, 7, 21]
  },
  {
    "drawSystemId": 6826,
    "drawDate": "2023-01-03T22:00:00Z",
    "resultsJson": [38, 14, 37, 8, 11, 48]
  },
  {
    "drawSystemId": 6825,
    "drawDate": "2022-12-31T22:00:00Z",
    "resultsJson": [36, 46, 47, 16, 29, 19]
  },
  {
    "drawSystemId": 6824,
    "drawDate": "2022-12-29T22:00:00Z",
    "resultsJson": [30, 27, 23, 4, 15, 41]
  },
  {
    "drawSystemId": 6823,
    "drawDate": "2022-12-27T22:00:00Z",
    "resultsJson": [9, 11, 28, 2, 41, 17]
  },
  {
    "drawSystemId": 6822,
    "drawDate": "2022-12-24T22:00:00Z",
    "resultsJson": [8, 41, 16, 27, 24, 44]
  },
  {
    "drawSystemId": 6821,
    "drawDate": "2022-12-22T22:00:00Z",
    "resultsJson": [5, 3, 38, 35, 2, 46]
  },
  {
    "drawSystemId": 6820,
    "drawDate": "2022-12-20T22:00:00Z",
    "resultsJson": [6, 10, 19, 1, 5, 2]
  },
  {
    "drawSystemId": 6819,
    "drawDate": "2022-12-17T22:00:00Z",
    "resultsJson": [12, 15, 32, 11, 43, 25]
  },
  {
    "drawSystemId": 6818,
    "drawDate": "2022-12-15T22:00:00Z",
    "resultsJson": [34, 4, 47, 13, 1, 18]
  },
  {
    "drawSystemId": 6817,
    "drawDate": "2022-12-13T22:00:00Z",
    "resultsJson": [14, 39, 36, 30, 37, 47]
  },
  {
    "drawSystemId": 6816,
    "drawDate": "2022-12-10T22:00:00Z",
    "resultsJson": [39, 11, 38, 20, 13, 23]
  },
  {
    "drawSystemId": 6815,
    "drawDate": "2022-12-08T22:00:00Z",
    "resultsJson": [19, 45, 16, 43, 38, 25]
  },
  {
    "drawSystemId": 6814,
    "drawDate": "2022-12-06T22:00:00Z",
    "resultsJson": [20, 48, 1, 16, 13, 36]
  },
  {
    "drawSystemId": 6813,
    "drawDate": "2022-12-03T22:00:00Z",
    "resultsJson": [4, 20, 49, 40, 25, 26]
  },
  {
    "drawSystemId": 6812,
    "drawDate": "2022-12-01T22:00:00Z",
    "resultsJson": [35, 15, 9, 4, 44, 42]
  },
  {
    "drawSystemId": 6811,
    "drawDate": "2022-11-29T22:00:00Z",
    "resultsJson": [15, 32, 45, 2, 44, 19]
  },
  {
    "drawSystemId": 6810,
    "drawDate": "2022-11-26T22:00:00Z",
    "resultsJson": [25, 39, 36, 21, 37, 2]
  },
  {
    "drawSystemId": 6809,
    "drawDate": "2022-11-24T22:00:00Z",
    "resultsJson": [39, 29, 3, 15, 25, 4]
  },
  {
    "drawSystemId": 6808,
    "drawDate": "2022-11-22T22:00:00Z",
    "resultsJson": [18, 32, 38, 36, 16, 30]
  },
  {
    "drawSystemId": 6807,
    "drawDate": "2022-11-19T22:00:00Z",
    "resultsJson": [21, 26, 40, 31, 10, 3]
  },
  {
    "drawSystemId": 6806,
    "drawDate": "2022-11-17T22:00:00Z",
    "resultsJson": [4, 27, 32, 29, 25, 30]
  },
  {
    "drawSystemId": 6805,
    "drawDate": "2022-11-15T22:00:00Z",
    "resultsJson": [3, 1, 48, 46, 6, 26]
  },
  {
    "drawSystemId": 6804,
    "drawDate": "2022-11-12T22:00:00Z",
    "resultsJson": [39, 47, 5, 22, 9, 45]
  },
  {
    "drawSystemId": 6803,
    "drawDate": "2022-11-10T22:00:00Z",
    "resultsJson": [45, 16, 11, 33, 31, 6]
  },
  {
    "drawSystemId": 6802,
    "drawDate": "2022-11-08T22:00:00Z",
    "resultsJson": [28, 18, 21, 6, 36, 48]
  },
  {
    "drawSystemId": 6801,
    "drawDate": "2022-11-05T22:00:00Z",
    "resultsJson": [3, 16, 49, 24, 13, 12]
  },
  {
    "drawSystemId": 6800,
    "drawDate": "2022-11-03T22:00:00Z",
    "resultsJson": [9, 15, 40, 34, 4, 32]
  },
  {
    "drawSystemId": 6799,
    "drawDate": "2022-11-01T22:00:00Z",
    "resultsJson": [5, 29, 20, 7, 9, 32]
  },
  {
    "drawSystemId": 6798,
    "drawDate": "2022-10-29T22:00:00Z",
    "resultsJson": [30, 24, 28, 17, 35, 20]
  },
  {
    "drawSystemId": 6797,
    "drawDate": "2022-10-27T22:00:00Z",
    "resultsJson": [5, 2, 29, 39, 46, 18]
  },
  {
    "drawSystemId": 6796,
    "drawDate": "2022-10-25T22:00:00Z",
    "resultsJson": [19, 34, 42, 48, 9, 38]
  },
  {
    "drawSystemId": 6795,
    "drawDate": "2022-10-22T22:00:00Z",
    "resultsJson": [38, 31, 25, 40, 14, 10]
  },
  {
    "drawSystemId": 6794,
    "drawDate": "2022-10-20T22:00:00Z",
    "resultsJson": [2, 19, 47, 42, 33, 23]
  },
  {
    "drawSystemId": 6793,
    "drawDate": "2022-10-18T22:00:00Z",
    "resultsJson": [8, 45, 27, 2, 40, 18]
  },
  {
    "drawSystemId": 6792,
    "drawDate": "2022-10-15T22:00:00Z",
    "resultsJson": [5, 6, 2, 39, 32, 13]
  },
  {
    "drawSystemId": 6791,
    "drawDate": "2022-10-13T22:00:00Z",
    "resultsJson": [40, 42, 34, 19, 47, 30]
  },
  {
    "drawSystemId": 6790,
    "drawDate": "2022-10-11T22:00:00Z",
    "resultsJson": [17, 48, 1, 16, 2, 36]
  },
  {
    "drawSystemId": 6789,
    "drawDate": "2022-10-08T22:00:00Z",
    "resultsJson": [43, 20, 29, 25, 23, 7]
  },
  {
    "drawSystemId": 6788,
    "drawDate": "2022-10-06T22:00:00Z",
    "resultsJson": [26, 5, 21, 24, 44, 42]
  },
  {
    "drawSystemId": 6787,
    "drawDate": "2022-10-04T22:00:00Z",
    "resultsJson": [38, 2, 24, 6, 7, 37]
  },
  {
    "drawSystemId": 6786,
    "drawDate": "2022-10-01T22:00:00Z",
    "resultsJson": [17, 12, 30, 22, 47, 25]
  },
  {
    "drawSystemId": 6785,
    "drawDate": "2022-09-29T22:00:00Z",
    "resultsJson": [22, 28, 43, 19, 47, 5]
  },
  {
    "drawSystemId": 6784,
    "drawDate": "2022-09-27T22:00:00Z",
    "resultsJson": [27, 37, 24, 21, 5, 7]
  },
  {
    "drawSystemId": 6783,
    "drawDate": "2022-09-24T22:00:00Z",
    "resultsJson": [46, 39, 26, 4, 30, 33]
  },
  {
    "drawSystemId": 6782,
    "drawDate": "2022-09-22T22:00:00Z",
    "resultsJson": [6, 11, 34, 15, 45, 26]
  },
  {
    "drawSystemId": 6781,
    "drawDate": "2022-09-20T22:00:00Z",
    "resultsJson": [18, 42, 16, 27, 11, 23]
  },
  {
    "drawSystemId": 6780,
    "drawDate": "2022-09-17T22:00:00Z",
    "resultsJson": [38, 24, 11, 46, 41, 20]
  },
  {
    "drawSystemId": 6779,
    "drawDate": "2022-09-15T22:00:00Z",
    "resultsJson": [14, 30, 12, 46, 48, 2]
  },
  {
    "drawSystemId": 6778,
    "drawDate": "2022-09-13T22:00:00Z",
    "resultsJson": [37, 13, 19, 48, 33, 2]
  },
  {
    "drawSystemId": 6777,
    "drawDate": "2022-09-10T22:00:00Z",
    "resultsJson": [7, 17, 13, 6, 27, 21]
  },
  {
    "drawSystemId": 6776,
    "drawDate": "2022-09-08T22:00:00Z",
    "resultsJson": [8, 26, 47, 36, 22, 40]
  },
  {
    "drawSystemId": 6775,
    "drawDate": "2022-09-06T22:00:00Z",
    "resultsJson": [38, 4, 22, 5, 17, 26]
  },
  {
    "drawSystemId": 6774,
    "drawDate": "2022-09-03T22:00:00Z",
    "resultsJson": [48, 28, 2, 46, 35, 47]
  },
  {
    "drawSystemId": 6773,
    "drawDate": "2022-09-01T22:00:00Z",
    "resultsJson": [33, 12, 7, 43, 17, 10]
  },
  {
    "drawSystemId": 6772,
    "drawDate": "2022-08-30T22:00:00Z",
    "resultsJson": [28, 21, 49, 12, 17, 26]
  },
  {
    "drawSystemId": 6771,
    "drawDate": "2022-08-27T22:00:00Z",
    "resultsJson": [7, 3, 9, 2, 29, 24]
  },
  {
    "drawSystemId": 6770,
    "drawDate": "2022-08-25T22:00:00Z",
    "resultsJson": [37, 6, 36, 15, 12, 2]
  },
  {
    "drawSystemId": 6769,
    "drawDate": "2022-08-23T22:00:00Z",
    "resultsJson": [49, 28, 12, 5, 48, 20]
  },
  {
    "drawSystemId": 6768,
    "drawDate": "2022-08-20T22:00:00Z",
    "resultsJson": [7, 48, 47, 5, 10, 16]
  },
  {
    "drawSystemId": 6767,
    "drawDate": "2022-08-18T22:00:00Z",
    "resultsJson": [32, 8, 10, 14, 41, 25]
  },
  {
    "drawSystemId": 6766,
    "drawDate": "2022-08-16T22:00:00Z",
    "resultsJson": [42, 24, 21, 10, 7, 13]
  },
  {
    "drawSystemId": 6765,
    "drawDate": "2022-08-13T22:00:00Z",
    "resultsJson": [6, 23, 28, 27, 7, 9]
  },
  {
    "drawSystemId": 6764,
    "drawDate": "2022-08-11T22:00:00Z",
    "resultsJson": [8, 19, 13, 14, 11, 25]
  },
  {
    "drawSystemId": 6763,
    "drawDate": "2022-08-09T22:00:00Z",
    "resultsJson": [44, 10, 19, 7, 9, 47]
  },
  {
    "drawSystemId": 6762,
    "drawDate": "2022-08-06T22:00:00Z",
    "resultsJson": [33, 42, 19, 7, 49, 47]
  },
  {
    "drawSystemId": 6761,
    "drawDate": "2022-08-04T22:00:00Z",
    "resultsJson": [40, 34, 14, 36, 10, 15]
  },
  {
    "drawSystemId": 6760,
    "drawDate": "2022-08-02T22:00:00Z",
    "resultsJson": [9, 17, 22, 49, 14, 37]
  },
  {
    "drawSystemId": 6759,
    "drawDate": "2022-07-30T21:50:00Z",
    "resultsJson": [42, 48, 13, 1, 33, 12]
  },
  {
    "drawSystemId": 6758,
    "drawDate": "2022-07-28T21:50:00Z",
    "resultsJson": [39, 38, 49, 2, 16, 9]
  },
  {
    "drawSystemId": 6757,
    "drawDate": "2022-07-26T21:50:00Z",
    "resultsJson": [20, 30, 46, 34, 24, 10]
  },
  {
    "drawSystemId": 6756,
    "drawDate": "2022-07-23T21:50:00Z",
    "resultsJson": [17, 43, 39, 1, 4, 22]
  },
  {
    "drawSystemId": 6755,
    "drawDate": "2022-07-21T21:50:00Z",
    "resultsJson": [21, 1, 24, 34, 37, 39]
  },
  {
    "drawSystemId": 6754,
    "drawDate": "2022-07-19T21:50:00Z",
    "resultsJson": [14, 16, 24, 26, 39, 11]
  },
  {
    "drawSystemId": 6753,
    "drawDate": "2022-07-16T21:50:00Z",
    "resultsJson": [19, 26, 21, 16, 32, 5]
  },
  {
    "drawSystemId": 6752,
    "drawDate": "2022-07-14T21:50:00Z",
    "resultsJson": [31, 18, 34, 49, 22, 15]
  },
  {
    "drawSystemId": 6751,
    "drawDate": "2022-07-12T21:50:00Z",
    "resultsJson": [38, 3, 28, 19, 32, 9]
  },
  {
    "drawSystemId": 6750,
    "drawDate": "2022-07-09T21:50:00Z",
    "resultsJson": [39, 8, 15, 13, 41, 36]
  },
  {
    "drawSystemId": 6749,
    "drawDate": "2022-07-07T21:50:00Z",
    "resultsJson": [14, 44, 7, 21, 32, 28]
  },
  {
    "drawSystemId": 6748,
    "drawDate": "2022-07-05T21:50:00Z",
    "resultsJson": [2, 38, 34, 20, 40, 14]
  },
  {
    "drawSystemId": 6747,
    "drawDate": "2022-07-02T21:50:00Z",
    "resultsJson": [30, 33, 10, 35, 46, 4]
  },
  {
    "drawSystemId": 6746,
    "drawDate": "2022-06-30T21:50:00Z",
    "resultsJson": [25, 38, 39, 29, 35, 30]
  },
  {
    "drawSystemId": 6745,
    "drawDate": "2022-06-28T21:50:00Z",
    "resultsJson": [34, 45, 24, 29, 3, 36]
  },
  {
    "drawSystemId": 6744,
    "drawDate": "2022-06-25T21:50:00Z",
    "resultsJson": [49, 27, 38, 41, 20, 28]
  },
  {
    "drawSystemId": 6743,
    "drawDate": "2022-06-23T21:50:00Z",
    "resultsJson": [34, 46, 27, 3, 4, 30]
  },
  {
    "drawSystemId": 6742,
    "drawDate": "2022-06-21T21:50:00Z",
    "resultsJson": [12, 15, 34, 27, 49, 24]
  },
  {
    "drawSystemId": 6741,
    "drawDate": "2022-06-18T21:50:00Z",
    "resultsJson": [41, 30, 26, 18, 10, 16]
  },
  {
    "drawSystemId": 6740,
    "drawDate": "2022-06-16T21:50:00Z",
    "resultsJson": [18, 45, 39, 38, 21, 13]
  },
  {
    "drawSystemId": 6739,
    "drawDate": "2022-06-14T21:50:00Z",
    "resultsJson": [21, 18, 14, 45, 13, 29]
  },
  {
    "drawSystemId": 6738,
    "drawDate": "2022-06-11T21:50:00Z",
    "resultsJson": [47, 30, 5, 23, 49, 48]
  },
  {
    "drawSystemId": 6737,
    "drawDate": "2022-06-09T21:50:00Z",
    "resultsJson": [19, 29, 18, 44, 17, 7]
  },
  {
    "drawSystemId": 6736,
    "drawDate": "2022-06-07T21:50:00Z",
    "resultsJson": [27, 39, 31, 12, 4, 28]
  },
  {
    "drawSystemId": 6735,
    "drawDate": "2022-06-04T21:50:00Z",
    "resultsJson": [29, 48, 24, 2, 13, 22]
  },
  {
    "drawSystemId": 6734,
    "drawDate": "2022-06-02T21:50:00Z",
    "resultsJson": [10, 26, 46, 39, 35, 20]
  },
  {
    "drawSystemId": 6733,
    "drawDate": "2022-05-31T21:50:00Z",
    "resultsJson": [8, 35, 11, 18, 43, 13]
  },
  {
    "drawSystemId": 6732,
    "drawDate": "2022-05-28T21:50:00Z",
    "resultsJson": [4, 9, 31, 10, 15, 44]
  },
  {
    "drawSystemId": 6731,
    "drawDate": "2022-05-26T21:50:00Z",
    "resultsJson": [49, 33, 4, 7, 20, 13]
  },
  {
    "drawSystemId": 6730,
    "drawDate": "2022-05-24T21:50:00Z",
    "resultsJson": [48, 34, 11, 27, 17, 25]
  },
  {
    "drawSystemId": 6729,
    "drawDate": "2022-05-21T21:50:00Z",
    "resultsJson": [14, 37, 15, 35, 47, 12]
  },
  {
    "drawSystemId": 6728,
    "drawDate": "2022-05-19T21:50:00Z",
    "resultsJson": [29, 17, 28, 39, 43, 21]
  },
  {
    "drawSystemId": 6727,
    "drawDate": "2022-05-17T21:50:00Z",
    "resultsJson": [5, 18, 39, 1, 14, 4]
  },
  {
    "drawSystemId": 6726,
    "drawDate": "2022-05-14T21:50:00Z",
    "resultsJson": [14, 47, 19, 42, 24, 27]
  },
  {
    "drawSystemId": 6725,
    "drawDate": "2022-05-12T21:50:00Z",
    "resultsJson": [12, 49, 21, 14, 45, 25]
  },
  {
    "drawSystemId": 6724,
    "drawDate": "2022-05-10T21:50:00Z",
    "resultsJson": [40, 4, 42, 12, 38, 21]
  },
  {
    "drawSystemId": 6723,
    "drawDate": "2022-05-07T21:50:00Z",
    "resultsJson": [15, 22, 7, 35, 49, 21]
  },
  {
    "drawSystemId": 6722,
    "drawDate": "2022-05-05T21:50:00Z",
    "resultsJson": [24, 4, 16, 29, 12, 21]
  },
  {
    "drawSystemId": 6721,
    "drawDate": "2022-05-03T21:50:00Z",
    "resultsJson": [31, 9, 13, 33, 18, 14]
  },
  {
    "drawSystemId": 6720,
    "drawDate": "2022-04-30T21:50:00Z",
    "resultsJson": [29, 38, 12, 1, 23, 10]
  },
  {
    "drawSystemId": 6719,
    "drawDate": "2022-04-28T21:50:00Z",
    "resultsJson": [12, 44, 28, 9, 8, 20]
  },
  {
    "drawSystemId": 6718,
    "drawDate": "2022-04-26T21:50:00Z",
    "resultsJson": [20, 18, 4, 5, 14, 3]
  },
  {
    "drawSystemId": 6717,
    "drawDate": "2022-04-23T21:50:00Z",
    "resultsJson": [17, 4, 29, 32, 5, 42]
  },
  {
    "drawSystemId": 6716,
    "drawDate": "2022-04-21T21:50:00Z",
    "resultsJson": [31, 46, 26, 16, 32, 3]
  },
  {
    "drawSystemId": 6715,
    "drawDate": "2022-04-19T21:50:00Z",
    "resultsJson": [45, 22, 35, 28, 24, 11]
  },
  {
    "drawSystemId": 6714,
    "drawDate": "2022-04-16T21:50:00Z",
    "resultsJson": [36, 2, 39, 45, 24, 19]
  },
  {
    "drawSystemId": 6713,
    "drawDate": "2022-04-14T21:50:00Z",
    "resultsJson": [4, 42, 33, 2, 38, 35]
  },
  {
    "drawSystemId": 6712,
    "drawDate": "2022-04-12T21:50:00Z",
    "resultsJson": [32, 13, 1, 12, 24, 34]
  },
  {
    "drawSystemId": 6711,
    "drawDate": "2022-04-09T21:50:00Z",
    "resultsJson": [47, 10, 26, 16, 1, 34]
  },
  {
    "drawSystemId": 6710,
    "drawDate": "2022-04-07T21:50:00Z",
    "resultsJson": [2, 25, 23, 20, 33, 43]
  },
  {
    "drawSystemId": 6709,
    "drawDate": "2022-04-05T21:50:00Z",
    "resultsJson": [6, 24, 9, 48, 28, 43]
  },
  {
    "drawSystemId": 6708,
    "drawDate": "2022-04-02T21:50:00Z",
    "resultsJson": [19, 41, 4, 20, 1, 25]
  },
  {
    "drawSystemId": 6707,
    "drawDate": "2022-03-31T21:50:00Z",
    "resultsJson": [17, 14, 5, 47, 26, 1]
  },
  {
    "drawSystemId": 6706,
    "drawDate": "2022-03-29T21:50:00Z",
    "resultsJson": [7, 3, 48, 26, 38, 24]
  },
  {
    "drawSystemId": 6705,
    "drawDate": "2022-03-26T21:50:00Z",
    "resultsJson": [48, 12, 40, 32, 2, 30]
  },
  {
    "drawSystemId": 6704,
    "drawDate": "2022-03-24T21:50:00Z",
    "resultsJson": [21, 16, 36, 29, 38, 41]
  },
  {
    "drawSystemId": 6703,
    "drawDate": "2022-03-22T21:50:00Z",
    "resultsJson": [3, 33, 18, 22, 34, 2]
  },
  {
    "drawSystemId": 6702,
    "drawDate": "2022-03-19T21:50:00Z",
    "resultsJson": [26, 41, 29, 27, 2, 46]
  },
  {
    "drawSystemId": 6701,
    "drawDate": "2022-03-17T21:50:00Z",
    "resultsJson": [34, 27, 47, 45, 35, 2]
  },
  {
    "drawSystemId": 6700,
    "drawDate": "2022-03-15T21:50:00Z",
    "resultsJson": [11, 22, 15, 3, 12, 32]
  },
  {
    "drawSystemId": 6699,
    "drawDate": "2022-03-12T21:50:00Z",
    "resultsJson": [39, 2, 48, 45, 35, 25]
  },
  {
    "drawSystemId": 6698,
    "drawDate": "2022-03-10T21:50:00Z",
    "resultsJson": [31, 16, 26, 24, 11, 29]
  },
  {
    "drawSystemId": 6697,
    "drawDate": "2022-03-08T21:50:00Z",
    "resultsJson": [5, 24, 35, 40, 2, 29]
  },
  {
    "drawSystemId": 6696,
    "drawDate": "2022-03-05T21:50:00Z",
    "resultsJson": [20, 38, 9, 18, 17, 16]
  },
  {
    "drawSystemId": 6695,
    "drawDate": "2022-03-03T21:50:00Z",
    "resultsJson": [12, 17, 39, 2, 47, 3]
  },
  {
    "drawSystemId": 6694,
    "drawDate": "2022-03-01T21:50:00Z",
    "resultsJson": [17, 35, 3, 33, 27, 32]
  },
  {
    "drawSystemId": 6693,
    "drawDate": "2022-02-26T21:50:00Z",
    "resultsJson": [21, 48, 39, 9, 20, 44]
  },
  {
    "drawSystemId": 6692,
    "drawDate": "2022-02-24T21:50:00Z",
    "resultsJson": [45, 10, 2, 24, 11, 30]
  },
  {
    "drawSystemId": 6691,
    "drawDate": "2022-02-22T21:50:00Z",
    "resultsJson": [8, 46, 16, 35, 7, 27]
  },
  {
    "drawSystemId": 6690,
    "drawDate": "2022-02-19T21:50:00Z",
    "resultsJson": [30, 4, 25, 41, 7, 44]
  },
  {
    "drawSystemId": 6689,
    "drawDate": "2022-02-17T21:50:00Z",
    "resultsJson": [49, 28, 8, 11, 7, 41]
  },
  {
    "drawSystemId": 6688,
    "drawDate": "2022-02-15T21:50:00Z",
    "resultsJson": [6, 15, 32, 49, 42, 34]
  },
  {
    "drawSystemId": 6687,
    "drawDate": "2022-02-12T21:50:00Z",
    "resultsJson": [30, 23, 8, 14, 42, 44]
  },
  {
    "drawSystemId": 6686,
    "drawDate": "2022-02-10T21:50:00Z",
    "resultsJson": [21, 36, 6, 41, 46, 20]
  },
  {
    "drawSystemId": 6685,
    "drawDate": "2022-02-08T21:50:00Z",
    "resultsJson": [15, 21, 29, 42, 27, 28]
  },
  {
    "drawSystemId": 6684,
    "drawDate": "2022-02-05T21:50:00Z",
    "resultsJson": [46, 41, 44, 1, 5, 43]
  },
  {
    "drawSystemId": 6683,
    "drawDate": "2022-02-03T21:50:00Z",
    "resultsJson": [7, 48, 20, 12, 25, 38]
  },
  {
    "drawSystemId": 6682,
    "drawDate": "2022-02-01T21:50:00Z",
    "resultsJson": [15, 21, 12, 1, 6, 42]
  },
  {
    "drawSystemId": 6681,
    "drawDate": "2022-01-29T21:50:00Z",
    "resultsJson": [28, 20, 45, 39, 26, 13]
  },
  {
    "drawSystemId": 6680,
    "drawDate": "2022-01-27T21:50:00Z",
    "resultsJson": [24, 38, 30, 12, 3, 27]
  },
  {
    "drawSystemId": 6679,
    "drawDate": "2022-01-25T21:50:00Z",
    "resultsJson": [35, 8, 1, 6, 38, 49]
  },
  {
    "drawSystemId": 6678,
    "drawDate": "2022-01-22T21:50:00Z",
    "resultsJson": [3, 1, 19, 37, 21, 23]
  },
  {
    "drawSystemId": 6677,
    "drawDate": "2022-01-20T21:50:00Z",
    "resultsJson": [17, 25, 9, 14, 40, 13]
  },
  {
    "drawSystemId": 6676,
    "drawDate": "2022-01-18T21:50:00Z",
    "resultsJson": [29, 42, 21, 31, 8, 15]
  },
  {
    "drawSystemId": 6675,
    "drawDate": "2022-01-15T21:50:00Z",
    "resultsJson": [6, 20, 48, 34, 37, 41]
  },
  {
    "drawSystemId": 6674,
    "drawDate": "2022-01-13T21:50:00Z",
    "resultsJson": [14, 47, 41, 24, 6, 40]
  },
  {
    "drawSystemId": 6673,
    "drawDate": "2022-01-11T21:50:00Z",
    "resultsJson": [47, 35, 15, 7, 42, 12]
  },
  {
    "drawSystemId": 6672,
    "drawDate": "2022-01-08T21:50:00Z",
    "resultsJson": [34, 10, 33, 18, 29, 45]
  },
  {
    "drawSystemId": 6671,
    "drawDate": "2022-01-06T21:50:00Z",
    "resultsJson": [8, 36, 37, 38, 5, 1]
  },
  {
    "drawSystemId": 6670,
    "drawDate": "2022-01-04T21:50:00Z",
    "resultsJson": [49, 23, 8, 36, 39, 25]
  },
  {
    "drawSystemId": 6669,
    "drawDate": "2022-01-01T21:50:00Z",
    "resultsJson": [19, 11, 17, 3, 24, 4]
  },
  {
    "drawSystemId": 6668,
    "drawDate": "2021-12-30T21:50:00Z",
    "resultsJson": [16, 2, 45, 28, 9, 39]
  },
  {
    "drawSystemId": 6667,
    "drawDate": "2021-12-28T21:50:00Z",
    "resultsJson": [45, 22, 27, 8, 1, 12]
  },
  {
    "drawSystemId": 6666,
    "drawDate": "2021-12-25T21:50:00Z",
    "resultsJson": [28, 47, 30, 31, 37, 49]
  },
  {
    "drawSystemId": 6665,
    "drawDate": "2021-12-23T21:50:00Z",
    "resultsJson": [39, 12, 30, 21, 29, 15]
  },
  {
    "drawSystemId": 6664,
    "drawDate": "2021-12-21T21:50:00Z",
    "resultsJson": [24, 41, 8, 48, 15, 46]
  },
  {
    "drawSystemId": 6663,
    "drawDate": "2021-12-18T21:50:00Z",
    "resultsJson": [17, 42, 25, 43, 22, 3]
  },
  {
    "drawSystemId": 6662,
    "drawDate": "2021-12-16T21:50:00Z",
    "resultsJson": [29, 34, 21, 18, 4, 25]
  },
  {
    "drawSystemId": 6661,
    "drawDate": "2021-12-14T21:50:00Z",
    "resultsJson": [25, 26, 27, 32, 44, 48]
  },
  {
    "drawSystemId": 6660,
    "drawDate": "2021-12-11T21:50:00Z",
    "resultsJson": [19, 22, 23, 26, 29, 45]
  },
  {
    "drawSystemId": 6659,
    "drawDate": "2021-12-09T21:50:00Z",
    "resultsJson": [3, 7, 32, 41, 43, 46]
  },
  {
    "drawSystemId": 6658,
    "drawDate": "2021-12-07T21:50:00Z",
    "resultsJson": [10, 12, 24, 26, 37, 44]
  },
  {
    "drawSystemId": 6657,
    "drawDate": "2021-12-04T21:50:00Z",
    "resultsJson": [39, 38, 16, 15, 37, 42]
  },
  {
    "drawSystemId": 6656,
    "drawDate": "2021-12-02T21:50:00Z",
    "resultsJson": [49, 37, 42, 6, 36, 10]
  },
  {
    "drawSystemId": 6655,
    "drawDate": "2021-11-30T21:50:00Z",
    "resultsJson": [7, 9, 35, 19, 28, 18]
  },
  {
    "drawSystemId": 6654,
    "drawDate": "2021-11-27T21:50:00Z",
    "resultsJson": [17, 23, 7, 39, 24, 42]
  },
  {
    "drawSystemId": 6653,
    "drawDate": "2021-11-25T21:50:00Z",
    "resultsJson": [11, 48, 4, 37, 27, 22]
  },
  {
    "drawSystemId": 6652,
    "drawDate": "2021-11-23T21:50:00Z",
    "resultsJson": [47, 24, 19, 46, 48, 31]
  },
  {
    "drawSystemId": 6651,
    "drawDate": "2021-11-20T21:50:00Z",
    "resultsJson": [27, 9, 23, 39, 33, 7]
  },
  {
    "drawSystemId": 6650,
    "drawDate": "2021-11-18T21:50:00Z",
    "resultsJson": [5, 2, 44, 39, 19, 28]
  },
  {
    "drawSystemId": 6649,
    "drawDate": "2021-11-16T21:50:00Z",
    "resultsJson": [11, 39, 29, 22, 21, 42]
  },
  {
    "drawSystemId": 6648,
    "drawDate": "2021-11-13T21:50:00Z",
    "resultsJson": [22, 28, 31, 12, 18, 29]
  },
  {
    "drawSystemId": 6647,
    "drawDate": "2021-11-11T21:50:00Z",
    "resultsJson": [17, 14, 38, 27, 41, 15]
  },
  {
    "drawSystemId": 6646,
    "drawDate": "2021-11-09T21:50:00Z",
    "resultsJson": [12, 40, 6, 24, 30, 9]
  },
  {
    "drawSystemId": 6645,
    "drawDate": "2021-11-06T21:50:00Z",
    "resultsJson": [13, 41, 22, 19, 1, 24]
  },
  {
    "drawSystemId": 6644,
    "drawDate": "2021-11-04T21:50:00Z",
    "resultsJson": [40, 5, 13, 1, 11, 7]
  },
  {
    "drawSystemId": 6643,
    "drawDate": "2021-11-02T21:50:00Z",
    "resultsJson": [10, 46, 40, 6, 41, 8]
  },
  {
    "drawSystemId": 6642,
    "drawDate": "2021-10-30T21:50:00Z",
    "resultsJson": [10, 13, 1, 18, 45, 11]
  },
  {
    "drawSystemId": 6641,
    "drawDate": "2021-10-28T21:50:00Z",
    "resultsJson": [11, 18, 21, 37, 41, 6]
  },
  {
    "drawSystemId": 6640,
    "drawDate": "2021-10-26T21:50:00Z",
    "resultsJson": [35, 4, 22, 48, 29, 5]
  },
  {
    "drawSystemId": 6639,
    "drawDate": "2021-10-23T21:50:00Z",
    "resultsJson": [13, 38, 1, 49, 43, 31]
  },
  {
    "drawSystemId": 6638,
    "drawDate": "2021-10-21T21:50:00Z",
    "resultsJson": [48, 26, 28, 17, 23, 41]
  },
  {
    "drawSystemId": 6637,
    "drawDate": "2021-10-19T21:50:00Z",
    "resultsJson": [15, 18, 40, 26, 32, 10]
  },
  {
    "drawSystemId": 6636,
    "drawDate": "2021-10-16T21:50:00Z",
    "resultsJson": [45, 18, 8, 40, 4, 5]
  },
  {
    "drawSystemId": 6635,
    "drawDate": "2021-10-14T21:50:00Z",
    "resultsJson": [6, 1, 11, 22, 13, 46]
  },
  {
    "drawSystemId": 6634,
    "drawDate": "2021-10-12T21:50:00Z",
    "resultsJson": [18, 25, 21, 38, 48, 33]
  },
  {
    "drawSystemId": 6633,
    "drawDate": "2021-10-09T21:50:00Z",
    "resultsJson": [12, 7, 8, 43, 18, 37]
  },
  {
    "drawSystemId": 6632,
    "drawDate": "2021-10-07T21:50:00Z",
    "resultsJson": [1, 46, 44, 24, 16, 37]
  },
  {
    "drawSystemId": 6631,
    "drawDate": "2021-10-05T21:50:00Z",
    "resultsJson": [33, 7, 21, 25, 32, 13]
  },
  {
    "drawSystemId": 6630,
    "drawDate": "2021-10-02T21:50:00Z",
    "resultsJson": [42, 7, 21, 1, 32, 23]
  },
  {
    "drawSystemId": 6629,
    "drawDate": "2021-09-30T21:50:00Z",
    "resultsJson": [43, 34, 45, 3, 28, 1]
  },
  {
    "drawSystemId": 6628,
    "drawDate": "2021-09-28T21:50:00Z",
    "resultsJson": [18, 42, 17, 31, 22, 46]
  },
  {
    "drawSystemId": 6627,
    "drawDate": "2021-09-25T21:50:00Z",
    "resultsJson": [19, 41, 48, 24, 4, 15]
  },
  {
    "drawSystemId": 6626,
    "drawDate": "2021-09-23T21:50:00Z",
    "resultsJson": [47, 1, 24, 14, 42, 31]
  },
  {
    "drawSystemId": 6625,
    "drawDate": "2021-09-21T21:50:00Z",
    "resultsJson": [35, 18, 10, 19, 39, 7]
  },
  {
    "drawSystemId": 6624,
    "drawDate": "2021-09-18T21:50:00Z",
    "resultsJson": [45, 43, 13, 14, 38, 33]
  },
  {
    "drawSystemId": 6623,
    "drawDate": "2021-09-16T21:50:00Z",
    "resultsJson": [7, 43, 44, 3, 2, 6]
  },
  {
    "drawSystemId": 6622,
    "drawDate": "2021-09-14T21:50:00Z",
    "resultsJson": [35, 16, 46, 23, 6, 15]
  },
  {
    "drawSystemId": 6621,
    "drawDate": "2021-09-11T21:50:00Z",
    "resultsJson": [46, 33, 45, 2, 30, 41]
  },
  {
    "drawSystemId": 6620,
    "drawDate": "2021-09-09T21:50:00Z",
    "resultsJson": [28, 3, 15, 23, 46, 21]
  },
  {
    "drawSystemId": 6619,
    "drawDate": "2021-09-07T21:50:00Z",
    "resultsJson": [1, 4, 42, 10, 20, 19]
  },
  {
    "drawSystemId": 6618,
    "drawDate": "2021-09-04T21:50:00Z",
    "resultsJson": [29, 38, 34, 30, 35, 28]
  },
  {
    "drawSystemId": 6617,
    "drawDate": "2021-09-02T21:50:00Z",
    "resultsJson": [4, 22, 36, 9, 17, 30]
  },
  {
    "drawSystemId": 6616,
    "drawDate": "2021-08-31T21:50:00Z",
    "resultsJson": [26, 12, 31, 41, 43, 17]
  },
  {
    "drawSystemId": 6615,
    "drawDate": "2021-08-28T21:50:00Z",
    "resultsJson": [6, 3, 10, 29, 23, 15]
  },
  {
    "drawSystemId": 6614,
    "drawDate": "2021-08-26T21:50:00Z",
    "resultsJson": [6, 8, 13, 10, 16, 5]
  },
  {
    "drawSystemId": 6613,
    "drawDate": "2021-08-24T21:50:00Z",
    "resultsJson": [39, 9, 30, 47, 4, 25]
  },
  {
    "drawSystemId": 6612,
    "drawDate": "2021-08-21T21:50:00Z",
    "resultsJson": [33, 15, 20, 22, 4, 12]
  },
  {
    "drawSystemId": 6611,
    "drawDate": "2021-08-19T21:50:00Z",
    "resultsJson": [36, 22, 12, 6, 8, 32]
  },
  {
    "drawSystemId": 6610,
    "drawDate": "2021-08-17T21:50:00Z",
    "resultsJson": [23, 27, 36, 5, 32, 4]
  },
  {
    "drawSystemId": 6609,
    "drawDate": "2021-08-14T21:50:00Z",
    "resultsJson": [33, 37, 10, 19, 28, 34]
  },
  {
    "drawSystemId": 6608,
    "drawDate": "2021-08-12T21:50:00Z",
    "resultsJson": [18, 20, 35, 8, 39, 19]
  },
  {
    "drawSystemId": 6607,
    "drawDate": "2021-08-10T21:50:00Z",
    "resultsJson": [14, 31, 7, 26, 32, 43]
  },
  {
    "drawSystemId": 6606,
    "drawDate": "2021-08-07T21:50:00Z",
    "resultsJson": [23, 39, 21, 20, 12, 33]
  },
  {
    "drawSystemId": 6605,
    "drawDate": "2021-08-05T21:50:00Z",
    "resultsJson": [34, 21, 28, 35, 29, 13]
  },
  {
    "drawSystemId": 6604,
    "drawDate": "2021-08-03T21:50:00Z",
    "resultsJson": [23, 22, 8, 10, 1, 28]
  },
  {
    "drawSystemId": 6603,
    "drawDate": "2021-07-31T21:50:00Z",
    "resultsJson": [22, 12, 13, 31, 44, 34]
  },
  {
    "drawSystemId": 6602,
    "drawDate": "2021-07-29T21:50:00Z",
    "resultsJson": [46, 12, 42, 39, 35, 7]
  },
  {
    "drawSystemId": 6601,
    "drawDate": "2021-07-27T21:50:00Z",
    "resultsJson": [6, 38, 36, 26, 46, 16]
  },
  {
    "drawSystemId": 6600,
    "drawDate": "2021-07-24T21:50:00Z",
    "resultsJson": [23, 32, 26, 39, 29, 10]
  },
  {
    "drawSystemId": 6599,
    "drawDate": "2021-07-22T21:50:00Z",
    "resultsJson": [19, 14, 28, 44, 17, 23]
  },
  {
    "drawSystemId": 6598,
    "drawDate": "2021-07-20T21:50:00Z",
    "resultsJson": [34, 47, 7, 3, 11, 16]
  },
  {
    "drawSystemId": 6597,
    "drawDate": "2021-07-17T21:50:00Z",
    "resultsJson": [13, 22, 30, 8, 21, 2]
  },
  {
    "drawSystemId": 6596,
    "drawDate": "2021-07-15T21:50:00Z",
    "resultsJson": [5, 19, 33, 12, 24, 45]
  },
  {
    "drawSystemId": 6595,
    "drawDate": "2021-07-13T21:50:00Z",
    "resultsJson": [37, 8, 1, 11, 26, 47]
  },
  {
    "drawSystemId": 6594,
    "drawDate": "2021-07-10T21:50:00Z",
    "resultsJson": [16, 45, 31, 1, 4, 36]
  },
  {
    "drawSystemId": 6593,
    "drawDate": "2021-07-08T21:50:00Z",
    "resultsJson": [24, 18, 8, 29, 4, 47]
  },
  {
    "drawSystemId": 6592,
    "drawDate": "2021-07-06T21:50:00Z",
    "resultsJson": [3, 44, 42, 32, 2, 33]
  },
  {
    "drawSystemId": 6591,
    "drawDate": "2021-07-03T21:50:00Z",
    "resultsJson": [49, 40, 43, 17, 29, 33]
  },
  {
    "drawSystemId": 6590,
    "drawDate": "2021-07-01T21:50:00Z",
    "resultsJson": [33, 38, 19, 10, 44, 3]
  },
  {
    "drawSystemId": 6589,
    "drawDate": "2021-06-29T21:50:00Z",
    "resultsJson": [39, 1, 25, 16, 34, 36]
  },
  {
    "drawSystemId": 6588,
    "drawDate": "2021-06-26T21:50:00Z",
    "resultsJson": [49, 44, 30, 2, 14, 34]
  },
  {
    "drawSystemId": 6587,
    "drawDate": "2021-06-24T21:50:00Z",
    "resultsJson": [39, 19, 35, 29, 47, 14]
  },
  {
    "drawSystemId": 6586,
    "drawDate": "2021-06-22T21:50:00Z",
    "resultsJson": [25, 23, 44, 9, 14, 10]
  },
  {
    "drawSystemId": 6585,
    "drawDate": "2021-06-19T21:50:00Z",
    "resultsJson": [31, 13, 47, 34, 3, 43]
  },
  {
    "drawSystemId": 6584,
    "drawDate": "2021-06-17T21:50:00Z",
    "resultsJson": [48, 24, 19, 20, 46, 17]
  },
  {
    "drawSystemId": 6583,
    "drawDate": "2021-06-15T21:50:00Z",
    "resultsJson": [46, 30, 1, 24, 2, 49]
  },
  {
    "drawSystemId": 6582,
    "drawDate": "2021-06-12T21:50:00Z",
    "resultsJson": [19, 21, 37, 22, 16, 1]
  },
  {
    "drawSystemId": 6581,
    "drawDate": "2021-06-10T21:50:00Z",
    "resultsJson": [3, 46, 41, 4, 31, 14]
  },
  {
    "drawSystemId": 6580,
    "drawDate": "2021-06-08T21:50:00Z",
    "resultsJson": [27, 3, 29, 19, 20, 40]
  },
  {
    "drawSystemId": 6579,
    "drawDate": "2021-06-05T21:50:00Z",
    "resultsJson": [2, 22, 1, 3, 24, 43]
  },
  {
    "drawSystemId": 6578,
    "drawDate": "2021-06-03T21:50:00Z",
    "resultsJson": [15, 41, 2, 1, 36, 49]
  },
  {
    "drawSystemId": 6577,
    "drawDate": "2021-06-01T21:50:00Z",
    "resultsJson": [44, 28, 45, 16, 38, 39]
  },
  {
    "drawSystemId": 6576,
    "drawDate": "2021-05-29T21:50:00Z",
    "resultsJson": [22, 3, 15, 14, 46, 41]
  },
  {
    "drawSystemId": 6575,
    "drawDate": "2021-05-27T21:50:00Z",
    "resultsJson": [47, 41, 5, 17, 42, 31]
  },
  {
    "drawSystemId": 6574,
    "drawDate": "2021-05-25T21:50:00Z",
    "resultsJson": [19, 11, 49, 24, 39, 29]
  },
  {
    "drawSystemId": 6573,
    "drawDate": "2021-05-22T21:50:00Z",
    "resultsJson": [21, 23, 38, 35, 3, 8]
  },
  {
    "drawSystemId": 6572,
    "drawDate": "2021-05-20T21:50:00Z",
    "resultsJson": [43, 48, 35, 45, 46, 30]
  },
  {
    "drawSystemId": 6571,
    "drawDate": "2021-05-18T21:50:00Z",
    "resultsJson": [41, 23, 49, 3, 34, 45]
  },
  {
    "drawSystemId": 6570,
    "drawDate": "2021-05-15T21:50:00Z",
    "resultsJson": [26, 42, 37, 15, 13, 5]
  },
  {
    "drawSystemId": 6569,
    "drawDate": "2021-05-13T21:50:00Z",
    "resultsJson": [15, 6, 2, 17, 3, 13]
  },
  {
    "drawSystemId": 6568,
    "drawDate": "2021-05-11T21:50:00Z",
    "resultsJson": [34, 29, 22, 31, 19, 42]
  },
  {
    "drawSystemId": 6567,
    "drawDate": "2021-05-08T21:50:00Z",
    "resultsJson": [47, 36, 13, 10, 8, 44]
  },
  {
    "drawSystemId": 6566,
    "drawDate": "2021-05-06T21:50:00Z",
    "resultsJson": [3, 24, 16, 46, 49, 42]
  },
  {
    "drawSystemId": 6565,
    "drawDate": "2021-05-04T21:50:00Z",
    "resultsJson": [31, 27, 11, 10, 37, 24]
  },
  {
    "drawSystemId": 6564,
    "drawDate": "2021-05-01T21:50:00Z",
    "resultsJson": [11, 3, 44, 22, 15, 43]
  },
  {
    "drawSystemId": 6563,
    "drawDate": "2021-04-29T21:50:00Z",
    "resultsJson": [49, 31, 42, 43, 44, 5]
  },
  {
    "drawSystemId": 6562,
    "drawDate": "2021-04-27T21:50:00Z",
    "resultsJson": [48, 36, 43, 2, 5, 27]
  },
  {
    "drawSystemId": 6561,
    "drawDate": "2021-04-24T21:50:00Z",
    "resultsJson": [47, 39, 21, 38, 41, 23]
  },
  {
    "drawSystemId": 6560,
    "drawDate": "2021-04-22T21:50:00Z",
    "resultsJson": [30, 11, 26, 44, 10, 1]
  },
  {
    "drawSystemId": 6559,
    "drawDate": "2021-04-20T21:50:00Z",
    "resultsJson": [5, 33, 10, 12, 45, 1]
  },
  {
    "drawSystemId": 6558,
    "drawDate": "2021-04-17T21:50:00Z",
    "resultsJson": [4, 36, 41, 14, 29, 16]
  },
  {
    "drawSystemId": 6557,
    "drawDate": "2021-04-15T21:50:00Z",
    "resultsJson": [42, 22, 45, 5, 49, 14]
  },
  {
    "drawSystemId": 6556,
    "drawDate": "2021-04-13T21:50:00Z",
    "resultsJson": [30, 38, 12, 5, 25, 29]
  },
  {
    "drawSystemId": 6555,
    "drawDate": "2021-04-10T21:50:00Z",
    "resultsJson": [38, 41, 44, 32, 29, 34]
  },
  {
    "drawSystemId": 6554,
    "drawDate": "2021-04-08T21:50:00Z",
    "resultsJson": [45, 42, 31, 33, 36, 41]
  },
  {
    "drawSystemId": 6553,
    "drawDate": "2021-04-06T21:50:00Z",
    "resultsJson": [29, 26, 17, 28, 24, 8]
  },
  {
    "drawSystemId": 6552,
    "drawDate": "2021-04-03T21:50:00Z",
    "resultsJson": [31, 8, 45, 47, 9, 30]
  },
  {
    "drawSystemId": 6551,
    "drawDate": "2021-04-01T21:50:00Z",
    "resultsJson": [44, 32, 27, 7, 36, 30]
  },
  {
    "drawSystemId": 6550,
    "drawDate": "2021-03-30T21:50:00Z",
    "resultsJson": [6, 36, 9, 10, 11, 38]
  },
  {
    "drawSystemId": 6549,
    "drawDate": "2021-03-27T21:50:00Z",
    "resultsJson": [2, 31, 46, 25, 38, 34]
  },
  {
    "drawSystemId": 6548,
    "drawDate": "2021-03-25T21:50:00Z",
    "resultsJson": [44, 46, 19, 43, 34, 5]
  },
  {
    "drawSystemId": 6547,
    "drawDate": "2021-03-23T21:50:00Z",
    "resultsJson": [19, 11, 16, 7, 48, 12]
  },
  {
    "drawSystemId": 6546,
    "drawDate": "2021-03-20T21:50:00Z",
    "resultsJson": [2, 3, 5, 48, 9, 31]
  },
  {
    "drawSystemId": 6545,
    "drawDate": "2021-03-18T21:50:00Z",
    "resultsJson": [47, 43, 5, 18, 24, 1]
  },
  {
    "drawSystemId": 6544,
    "drawDate": "2021-03-16T21:50:00Z",
    "resultsJson": [48, 3, 28, 4, 24, 27]
  },
  {
    "drawSystemId": 6543,
    "drawDate": "2021-03-13T21:50:00Z",
    "resultsJson": [8, 43, 17, 14, 42, 47]
  },
  {
    "drawSystemId": 6542,
    "drawDate": "2021-03-11T21:50:00Z",
    "resultsJson": [5, 40, 18, 33, 2, 17]
  },
  {
    "drawSystemId": 6541,
    "drawDate": "2021-03-09T21:50:00Z",
    "resultsJson": [32, 15, 48, 43, 37, 20]
  },
  {
    "drawSystemId": 6540,
    "drawDate": "2021-03-06T21:50:00Z",
    "resultsJson": [10, 6, 17, 15, 27, 16]
  },
  {
    "drawSystemId": 6539,
    "drawDate": "2021-03-04T21:50:00Z",
    "resultsJson": [30, 25, 37, 22, 34, 43]
  },
  {
    "drawSystemId": 6538,
    "drawDate": "2021-03-02T21:50:00Z",
    "resultsJson": [45, 46, 37, 18, 17, 43]
  },
  {
    "drawSystemId": 6537,
    "drawDate": "2021-02-27T21:50:00Z",
    "resultsJson": [37, 42, 22, 48, 40, 1]
  },
  {
    "drawSystemId": 6536,
    "drawDate": "2021-02-25T21:50:00Z",
    "resultsJson": [3, 14, 46, 7, 40, 18]
  },
  {
    "drawSystemId": 6535,
    "drawDate": "2021-02-23T21:50:00Z",
    "resultsJson": [20, 22, 11, 15, 27, 4]
  },
  {
    "drawSystemId": 6534,
    "drawDate": "2021-02-20T21:50:00Z",
    "resultsJson": [25, 46, 33, 27, 3, 20]
  },
  {
    "drawSystemId": 6533,
    "drawDate": "2021-02-18T21:50:00Z",
    "resultsJson": [19, 18, 2, 35, 22, 25]
  },
  {
    "drawSystemId": 6532,
    "drawDate": "2021-02-16T21:50:00Z",
    "resultsJson": [41, 3, 18, 16, 34, 13]
  },
  {
    "drawSystemId": 6531,
    "drawDate": "2021-02-13T21:50:00Z",
    "resultsJson": [16, 46, 36, 8, 2, 30]
  },
  {
    "drawSystemId": 6530,
    "drawDate": "2021-02-11T21:50:00Z",
    "resultsJson": [44, 6, 8, 18, 14, 31]
  },
  {
    "drawSystemId": 6529,
    "drawDate": "2021-02-09T21:50:00Z",
    "resultsJson": [23, 49, 46, 26, 17, 42]
  },
  {
    "drawSystemId": 6528,
    "drawDate": "2021-02-06T21:50:00Z",
    "resultsJson": [41, 29, 11, 7, 33, 31]
  },
  {
    "drawSystemId": 6527,
    "drawDate": "2021-02-04T21:50:00Z",
    "resultsJson": [37, 41, 29, 23, 49, 31]
  },
  {
    "drawSystemId": 6526,
    "drawDate": "2021-02-02T21:50:00Z",
    "resultsJson": [42, 20, 38, 9, 45, 39]
  },
  {
    "drawSystemId": 6525,
    "drawDate": "2021-01-30T21:50:00Z",
    "resultsJson": [47, 39, 18, 36, 1, 48]
  },
  {
    "drawSystemId": 6524,
    "drawDate": "2021-01-28T21:50:00Z",
    "resultsJson": [14, 41, 48, 22, 23, 49]
  },
  {
    "drawSystemId": 6523,
    "drawDate": "2021-01-26T21:50:00Z",
    "resultsJson": [47, 13, 17, 41, 20, 25]
  },
  {
    "drawSystemId": 6522,
    "drawDate": "2021-01-23T21:50:00Z",
    "resultsJson": [17, 13, 48, 35, 39, 43]
  },
  {
    "drawSystemId": 6521,
    "drawDate": "2021-01-21T21:50:00Z",
    "resultsJson": [27, 25, 48, 12, 18, 28]
  },
  {
    "drawSystemId": 6520,
    "drawDate": "2021-01-19T21:50:00Z",
    "resultsJson": [2, 43, 41, 22, 38, 6]
  },
  {
    "drawSystemId": 6519,
    "drawDate": "2021-01-16T21:50:00Z",
    "resultsJson": [37, 25, 46, 11, 32, 48]
  },
  {
    "drawSystemId": 6518,
    "drawDate": "2021-01-14T21:50:00Z",
    "resultsJson": [27, 2, 9, 10, 4, 31]
  },
  {
    "drawSystemId": 6517,
    "drawDate": "2021-01-12T21:50:00Z",
    "resultsJson": [5, 32, 38, 10, 37, 35]
  },
  {
    "drawSystemId": 6516,
    "drawDate": "2021-01-09T21:50:00Z",
    "resultsJson": [9, 36, 25, 24, 41, 14]
  },
  {
    "drawSystemId": 6515,
    "drawDate": "2021-01-07T21:50:00Z",
    "resultsJson": [12, 38, 32, 41, 9, 28]
  },
  {
    "drawSystemId": 6514,
    "drawDate": "2021-01-05T21:50:00Z",
    "resultsJson": [35, 9, 33, 15, 47, 48]
  },
  {
    "drawSystemId": 6513,
    "drawDate": "2021-01-02T21:50:00Z",
    "resultsJson": [21, 16, 17, 8, 26, 27]
  },
  {
    "drawSystemId": 6512,
    "drawDate": "2020-12-31T21:50:00Z",
    "resultsJson": [1, 25, 21, 27, 42, 39]
  },
  {
    "drawSystemId": 6511,
    "drawDate": "2020-12-29T21:50:00Z",
    "resultsJson": [37, 17, 1, 23, 45, 48]
  },
  {
    "drawSystemId": 6510,
    "drawDate": "2020-12-26T21:50:00Z",
    "resultsJson": [24, 47, 16, 19, 25, 31]
  },
  {
    "drawSystemId": 6509,
    "drawDate": "2020-12-24T21:50:00Z",
    "resultsJson": [27, 22, 24, 19, 26, 40]
  },
  {
    "drawSystemId": 6508,
    "drawDate": "2020-12-22T21:50:00Z",
    "resultsJson": [24, 4, 26, 14, 25, 41]
  },
  {
    "drawSystemId": 6507,
    "drawDate": "2020-12-19T21:50:00Z",
    "resultsJson": [20, 33, 29, 46, 40, 13]
  },
  {
    "drawSystemId": 6506,
    "drawDate": "2020-12-17T21:50:00Z",
    "resultsJson": [45, 37, 47, 6, 33, 7]
  },
  {
    "drawSystemId": 6505,
    "drawDate": "2020-12-15T21:50:00Z",
    "resultsJson": [49, 25, 40, 19, 12, 13]
  },
  {
    "drawSystemId": 6504,
    "drawDate": "2020-12-12T21:50:00Z",
    "resultsJson": [5, 43, 8, 33, 20, 31]
  },
  {
    "drawSystemId": 6503,
    "drawDate": "2020-12-10T21:50:00Z",
    "resultsJson": [22, 20, 3, 6, 15, 38]
  },
  {
    "drawSystemId": 6502,
    "drawDate": "2020-12-08T21:50:00Z",
    "resultsJson": [5, 31, 20, 29, 24, 39]
  },
  {
    "drawSystemId": 6501,
    "drawDate": "2020-12-05T21:50:00Z",
    "resultsJson": [16, 23, 2, 24, 33, 19]
  },
  {
    "drawSystemId": 6500,
    "drawDate": "2020-12-03T21:50:00Z",
    "resultsJson": [43, 44, 18, 19, 28, 46]
  },
  {
    "drawSystemId": 6499,
    "drawDate": "2020-12-01T21:50:00Z",
    "resultsJson": [38, 39, 24, 30, 46, 6]
  },
  {
    "drawSystemId": 6498,
    "drawDate": "2020-11-28T21:50:00Z",
    "resultsJson": [5, 2, 40, 42, 18, 27]
  },
  {
    "drawSystemId": 6497,
    "drawDate": "2020-11-26T21:50:00Z",
    "resultsJson": [28, 43, 3, 32, 38, 13]
  },
  {
    "drawSystemId": 6496,
    "drawDate": "2020-11-24T21:50:00Z",
    "resultsJson": [12, 7, 2, 8, 39, 32]
  },
  {
    "drawSystemId": 6495,
    "drawDate": "2020-11-21T21:50:00Z",
    "resultsJson": [2, 10, 40, 28, 15, 39]
  },
  {
    "drawSystemId": 6494,
    "drawDate": "2020-11-19T21:50:00Z",
    "resultsJson": [32, 17, 37, 5, 16, 8]
  },
  {
    "drawSystemId": 6493,
    "drawDate": "2020-11-17T21:50:00Z",
    "resultsJson": [33, 1, 46, 8, 2, 47]
  },
  {
    "drawSystemId": 6492,
    "drawDate": "2020-11-14T21:50:00Z",
    "resultsJson": [12, 27, 48, 20, 44, 1]
  },
  {
    "drawSystemId": 6491,
    "drawDate": "2020-11-12T21:50:00Z",
    "resultsJson": [22, 28, 8, 15, 3, 5]
  },
  {
    "drawSystemId": 6490,
    "drawDate": "2020-11-10T21:50:00Z",
    "resultsJson": [46, 19, 10, 23, 25, 33]
  },
  {
    "drawSystemId": 6489,
    "drawDate": "2020-11-07T21:50:00Z",
    "resultsJson": [9, 25, 19, 28, 27, 10]
  },
  {
    "drawSystemId": 6488,
    "drawDate": "2020-11-05T21:50:00Z",
    "resultsJson": [26, 7, 47, 49, 21, 14]
  },
  {
    "drawSystemId": 6487,
    "drawDate": "2020-11-03T21:50:00Z",
    "resultsJson": [3, 25, 45, 10, 33, 6]
  },
  {
    "drawSystemId": 6486,
    "drawDate": "2020-10-31T21:50:00Z",
    "resultsJson": [44, 10, 17, 38, 14, 27]
  },
  {
    "drawSystemId": 6485,
    "drawDate": "2020-10-29T21:50:00Z",
    "resultsJson": [23, 30, 14, 4, 28, 22]
  },
  {
    "drawSystemId": 6484,
    "drawDate": "2020-10-27T21:50:00Z",
    "resultsJson": [14, 9, 31, 3, 5, 30]
  },
  {
    "drawSystemId": 6483,
    "drawDate": "2020-10-24T21:50:00Z",
    "resultsJson": [35, 37, 36, 27, 39, 43]
  },
  {
    "drawSystemId": 6482,
    "drawDate": "2020-10-22T21:50:00Z",
    "resultsJson": [36, 31, 33, 20, 26, 4]
  },
  {
    "drawSystemId": 6481,
    "drawDate": "2020-10-20T21:50:00Z",
    "resultsJson": [29, 41, 27, 4, 49, 35]
  },
  {
    "drawSystemId": 6480,
    "drawDate": "2020-10-17T21:50:00Z",
    "resultsJson": [25, 46, 37, 26, 19, 28]
  },
  {
    "drawSystemId": 6479,
    "drawDate": "2020-10-15T21:50:00Z",
    "resultsJson": [2, 1, 13, 25, 36, 19]
  },
  {
    "drawSystemId": 6478,
    "drawDate": "2020-10-13T21:50:00Z",
    "resultsJson": [8, 26, 32, 3, 16, 33]
  },
  {
    "drawSystemId": 6477,
    "drawDate": "2020-10-10T21:50:00Z",
    "resultsJson": [16, 18, 26, 42, 31, 4]
  },
  {
    "drawSystemId": 6476,
    "drawDate": "2020-10-08T21:50:00Z",
    "resultsJson": [18, 16, 21, 1, 27, 42]
  },
  {
    "drawSystemId": 6475,
    "drawDate": "2020-10-06T21:50:00Z",
    "resultsJson": [20, 27, 5, 25, 15, 47]
  },
  {
    "drawSystemId": 6474,
    "drawDate": "2020-10-03T21:50:00Z",
    "resultsJson": [15, 41, 47, 44, 35, 28]
  },
  {
    "drawSystemId": 6473,
    "drawDate": "2020-10-01T21:50:00Z",
    "resultsJson": [24, 25, 18, 35, 49, 16]
  },
  {
    "drawSystemId": 6472,
    "drawDate": "2020-09-29T21:50:00Z",
    "resultsJson": [21, 16, 30, 20, 39, 40]
  },
  {
    "drawSystemId": 6471,
    "drawDate": "2020-09-26T21:50:00Z",
    "resultsJson": [2, 14, 41, 16, 32, 10]
  },
  {
    "drawSystemId": 6470,
    "drawDate": "2020-09-24T21:50:00Z",
    "resultsJson": [23, 12, 14, 40, 28, 21]
  },
  {
    "drawSystemId": 6469,
    "drawDate": "2020-09-22T21:50:00Z",
    "resultsJson": [47, 38, 16, 27, 30, 20]
  },
  {
    "drawSystemId": 6468,
    "drawDate": "2020-09-19T21:50:00Z",
    "resultsJson": [13, 47, 26, 23, 43, 21]
  },
  {
    "drawSystemId": 6467,
    "drawDate": "2020-09-17T21:50:00Z",
    "resultsJson": [19, 18, 14, 31, 30, 33]
  },
  {
    "drawSystemId": 6466,
    "drawDate": "2020-09-15T21:50:00Z",
    "resultsJson": [40, 8, 23, 48, 12, 21]
  },
  {
    "drawSystemId": 6465,
    "drawDate": "2020-09-12T21:50:00Z",
    "resultsJson": [32, 41, 25, 33, 24, 17]
  },
  {
    "drawSystemId": 6464,
    "drawDate": "2020-09-10T21:50:00Z",
    "resultsJson": [46, 16, 23, 11, 14, 40]
  },
  {
    "drawSystemId": 6463,
    "drawDate": "2020-09-08T21:50:00Z",
    "resultsJson": [28, 42, 31, 29, 33, 23]
  },
  {
    "drawSystemId": 6462,
    "drawDate": "2020-09-05T21:50:00Z",
    "resultsJson": [14, 21, 39, 27, 5, 31]
  },
  {
    "drawSystemId": 6461,
    "drawDate": "2020-09-03T21:50:00Z",
    "resultsJson": [27, 21, 11, 31, 39, 28]
  },
  {
    "drawSystemId": 6460,
    "drawDate": "2020-09-01T21:50:00Z",
    "resultsJson": [19, 49, 9, 18, 39, 47]
  },
  {
    "drawSystemId": 6459,
    "drawDate": "2020-08-29T21:50:00Z",
    "resultsJson": [32, 12, 20, 23, 26, 25]
  },
  {
    "drawSystemId": 6458,
    "drawDate": "2020-08-27T21:50:00Z",
    "resultsJson": [35, 3, 6, 36, 25, 23]
  },
  {
    "drawSystemId": 6457,
    "drawDate": "2020-08-25T21:50:00Z",
    "resultsJson": [11, 43, 14, 39, 41, 21]
  },
  {
    "drawSystemId": 6456,
    "drawDate": "2020-08-22T21:50:00Z",
    "resultsJson": [26, 43, 18, 31, 22, 30]
  },
  {
    "drawSystemId": 6455,
    "drawDate": "2020-08-20T21:50:00Z",
    "resultsJson": [38, 16, 37, 2, 8, 5]
  },
  {
    "drawSystemId": 6454,
    "drawDate": "2020-08-18T21:50:00Z",
    "resultsJson": [38, 10, 3, 33, 16, 48]
  },
  {
    "drawSystemId": 6453,
    "drawDate": "2020-08-15T21:50:00Z",
    "resultsJson": [21, 9, 17, 27, 34, 24]
  },
  {
    "drawSystemId": 6452,
    "drawDate": "2020-08-13T21:50:00Z",
    "resultsJson": [38, 11, 14, 26, 12, 48]
  },
  {
    "drawSystemId": 6451,
    "drawDate": "2020-08-11T21:50:00Z",
    "resultsJson": [17, 41, 12, 19, 25, 3]
  },
  {
    "drawSystemId": 6450,
    "drawDate": "2020-08-08T21:50:00Z",
    "resultsJson": [35, 31, 22, 2, 4, 26]
  },
  {
    "drawSystemId": 6449,
    "drawDate": "2020-08-06T21:50:00Z",
    "resultsJson": [32, 5, 28, 1, 25, 7]
  },
  {
    "drawSystemId": 6448,
    "drawDate": "2020-08-04T21:50:00Z",
    "resultsJson": [38, 11, 22, 17, 1, 7]
  },
  {
    "drawSystemId": 6447,
    "drawDate": "2020-08-01T21:50:00Z",
    "resultsJson": [48, 44, 39, 29, 30, 8]
  },
  {
    "drawSystemId": 6446,
    "drawDate": "2020-07-30T21:50:00Z",
    "resultsJson": [46, 8, 43, 40, 3, 4]
  },
  {
    "drawSystemId": 6445,
    "drawDate": "2020-07-28T21:50:00Z",
    "resultsJson": [11, 1, 25, 28, 43, 16]
  },
  {
    "drawSystemId": 6444,
    "drawDate": "2020-07-25T21:50:00Z",
    "resultsJson": [9, 12, 48, 45, 17, 24]
  },
  {
    "drawSystemId": 6443,
    "drawDate": "2020-07-23T21:50:00Z",
    "resultsJson": [5, 6, 46, 7, 36, 10]
  },
  {
    "drawSystemId": 6442,
    "drawDate": "2020-07-21T21:50:00Z",
    "resultsJson": [49, 23, 8, 24, 10, 25]
  },
  {
    "drawSystemId": 6441,
    "drawDate": "2020-07-18T21:50:00Z",
    "resultsJson": [44, 32, 21, 3, 15, 6]
  },
  {
    "drawSystemId": 6440,
    "drawDate": "2020-07-16T21:50:00Z",
    "resultsJson": [5, 9, 39, 44, 33, 27]
  },
  {
    "drawSystemId": 6439,
    "drawDate": "2020-07-14T21:50:00Z",
    "resultsJson": [46, 1, 26, 7, 28, 17]
  },
  {
    "drawSystemId": 6438,
    "drawDate": "2020-07-11T21:50:00Z",
    "resultsJson": [34, 13, 31, 40, 6, 36]
  },
  {
    "drawSystemId": 6437,
    "drawDate": "2020-07-09T21:50:00Z",
    "resultsJson": [9, 20, 1, 12, 45, 32]
  },
  {
    "drawSystemId": 6436,
    "drawDate": "2020-07-07T21:50:00Z",
    "resultsJson": [12, 18, 27, 4, 28, 22]
  },
  {
    "drawSystemId": 6435,
    "drawDate": "2020-07-04T21:50:00Z",
    "resultsJson": [37, 10, 3, 40, 17, 22]
  },
  {
    "drawSystemId": 6434,
    "drawDate": "2020-07-02T21:50:00Z",
    "resultsJson": [1, 19, 12, 3, 40, 4]
  },
  {
    "drawSystemId": 6433,
    "drawDate": "2020-06-30T21:50:00Z",
    "resultsJson": [3, 19, 13, 40, 35, 43]
  },
  {
    "drawSystemId": 6432,
    "drawDate": "2020-06-27T21:50:00Z",
    "resultsJson": [8, 37, 41, 30, 43, 32]
  },
  {
    "drawSystemId": 6431,
    "drawDate": "2020-06-25T21:50:00Z",
    "resultsJson": [42, 35, 41, 43, 48, 49]
  },
  {
    "drawSystemId": 6430,
    "drawDate": "2020-06-23T21:50:00Z",
    "resultsJson": [9, 25, 1, 48, 41, 42]
  },
  {
    "drawSystemId": 6429,
    "drawDate": "2020-06-20T21:50:00Z",
    "resultsJson": [3, 14, 49, 41, 45, 37]
  },
  {
    "drawSystemId": 6428,
    "drawDate": "2020-06-18T21:50:00Z",
    "resultsJson": [7, 10, 9, 46, 30, 15]
  },
  {
    "drawSystemId": 6427,
    "drawDate": "2020-06-16T21:40:00Z",
    "resultsJson": [36, 4, 17, 11, 30, 23]
  },
  {
    "drawSystemId": 6426,
    "drawDate": "2020-06-13T21:40:00Z",
    "resultsJson": [16, 27, 31, 4, 25, 46]
  },
  {
    "drawSystemId": 6425,
    "drawDate": "2020-06-11T21:40:00Z",
    "resultsJson": [6, 49, 8, 9, 44, 23]
  },
  {
    "drawSystemId": 6424,
    "drawDate": "2020-06-09T21:40:00Z",
    "resultsJson": [38, 47, 49, 23, 7, 15]
  },
  {
    "drawSystemId": 6423,
    "drawDate": "2020-06-06T21:40:00Z",
    "resultsJson": [17, 4, 30, 47, 43, 25]
  },
  {
    "drawSystemId": 6422,
    "drawDate": "2020-06-04T21:40:00Z",
    "resultsJson": [37, 17, 19, 31, 2, 4]
  },
  {
    "drawSystemId": 6421,
    "drawDate": "2020-06-02T21:40:00Z",
    "resultsJson": [49, 39, 11, 19, 47, 48]
  },
  {
    "drawSystemId": 6420,
    "drawDate": "2020-05-30T21:40:00Z",
    "resultsJson": [43, 12, 39, 15, 16, 38]
  },
  {
    "drawSystemId": 6419,
    "drawDate": "2020-05-28T21:40:00Z",
    "resultsJson": [35, 4, 16, 12, 34, 26]
  },
  {
    "drawSystemId": 6418,
    "drawDate": "2020-05-26T21:40:00Z",
    "resultsJson": [14, 21, 24, 9, 27, 20]
  },
  {
    "drawSystemId": 6417,
    "drawDate": "2020-05-23T21:40:00Z",
    "resultsJson": [16, 27, 19, 15, 10, 38]
  },
  {
    "drawSystemId": 6416,
    "drawDate": "2020-05-21T21:40:00Z",
    "resultsJson": [43, 28, 4, 37, 38, 3]
  },
  {
    "drawSystemId": 6415,
    "drawDate": "2020-05-19T21:40:00Z",
    "resultsJson": [15, 30, 45, 12, 19, 47]
  },
  {
    "drawSystemId": 6414,
    "drawDate": "2020-05-16T21:40:00Z",
    "resultsJson": [1, 38, 30, 17, 31, 9]
  },
  {
    "drawSystemId": 6413,
    "drawDate": "2020-05-14T21:40:00Z",
    "resultsJson": [43, 37, 46, 23, 6, 41]
  },
  {
    "drawSystemId": 6412,
    "drawDate": "2020-05-12T21:40:00Z",
    "resultsJson": [1, 46, 18, 34, 38, 27]
  },
  {
    "drawSystemId": 6411,
    "drawDate": "2020-05-09T21:40:00Z",
    "resultsJson": [36, 28, 8, 40, 37, 32]
  },
  {
    "drawSystemId": 6410,
    "drawDate": "2020-05-07T21:40:00Z",
    "resultsJson": [7, 29, 1, 3, 35, 17]
  },
  {
    "drawSystemId": 6409,
    "drawDate": "2020-05-05T21:40:00Z",
    "resultsJson": [29, 49, 28, 21, 39, 45]
  },
  {
    "drawSystemId": 6408,
    "drawDate": "2020-05-02T21:40:00Z",
    "resultsJson": [42, 44, 11, 25, 38, 16]
  },
  {
    "drawSystemId": 6407,
    "drawDate": "2020-04-30T21:40:00Z",
    "resultsJson": [17, 23, 26, 32, 30, 10]
  },
  {
    "drawSystemId": 6406,
    "drawDate": "2020-04-28T21:40:00Z",
    "resultsJson": [38, 44, 13, 23, 24, 9]
  },
  {
    "drawSystemId": 6405,
    "drawDate": "2020-04-25T21:40:00Z",
    "resultsJson": [3, 19, 13, 40, 42, 25]
  },
  {
    "drawSystemId": 6404,
    "drawDate": "2020-04-23T21:40:00Z",
    "resultsJson": [1, 20, 49, 3, 39, 47]
  },
  {
    "drawSystemId": 6403,
    "drawDate": "2020-04-21T21:40:00Z",
    "resultsJson": [16, 20, 11, 1, 10, 21]
  },
  {
    "drawSystemId": 6402,
    "drawDate": "2020-04-18T21:40:00Z",
    "resultsJson": [38, 32, 33, 1, 44, 22]
  },
  {
    "drawSystemId": 6401,
    "drawDate": "2020-04-16T21:40:00Z",
    "resultsJson": [6, 36, 23, 2, 7, 49]
  },
  {
    "drawSystemId": 6400,
    "drawDate": "2020-04-14T21:40:00Z",
    "resultsJson": [21, 43, 8, 33, 15, 9]
  },
  {
    "drawSystemId": 6399,
    "drawDate": "2020-04-11T21:40:00Z",
    "resultsJson": [45, 27, 37, 41, 14, 19]
  },
  {
    "drawSystemId": 6398,
    "drawDate": "2020-04-09T21:40:00Z",
    "resultsJson": [26, 37, 3, 14, 13, 38]
  },
  {
    "drawSystemId": 6397,
    "drawDate": "2020-04-07T21:40:00Z",
    "resultsJson": [26, 38, 21, 15, 43, 33]
  },
  {
    "drawSystemId": 6396,
    "drawDate": "2020-04-04T21:40:00Z",
    "resultsJson": [10, 30, 6, 33, 48, 8]
  },
  {
    "drawSystemId": 6395,
    "drawDate": "2020-04-02T21:40:00Z",
    "resultsJson": [30, 1, 27, 11, 22, 16]
  },
  {
    "drawSystemId": 6394,
    "drawDate": "2020-03-31T21:40:00Z",
    "resultsJson": [11, 6, 42, 17, 49, 22]
  },
  {
    "drawSystemId": 6393,
    "drawDate": "2020-03-28T21:40:00Z",
    "resultsJson": [38, 7, 21, 33, 23, 29]
  },
  {
    "drawSystemId": 6392,
    "drawDate": "2020-03-26T21:40:00Z",
    "resultsJson": [5, 45, 18, 23, 2, 19]
  },
  {
    "drawSystemId": 6391,
    "drawDate": "2020-03-24T21:40:00Z",
    "resultsJson": [13, 26, 40, 8, 20, 14]
  },
  {
    "drawSystemId": 6390,
    "drawDate": "2020-03-21T21:40:00Z",
    "resultsJson": [28, 6, 49, 24, 13, 15]
  },
  {
    "drawSystemId": 6389,
    "drawDate": "2020-03-19T21:40:00Z",
    "resultsJson": [25, 41, 20, 19, 1, 24]
  },
  {
    "drawSystemId": 6388,
    "drawDate": "2020-03-17T21:40:00Z",
    "resultsJson": [10, 17, 5, 47, 37, 19]
  },
  {
    "drawSystemId": 6387,
    "drawDate": "2020-03-14T21:40:00Z",
    "resultsJson": [26, 1, 36, 34, 11, 19]
  },
  {
    "drawSystemId": 6386,
    "drawDate": "2020-03-12T21:40:00Z",
    "resultsJson": [22, 13, 42, 46, 1, 32]
  },
  {
    "drawSystemId": 6385,
    "drawDate": "2020-03-10T21:40:00Z",
    "resultsJson": [25, 44, 6, 32, 41, 35]
  },
  {
    "drawSystemId": 6384,
    "drawDate": "2020-03-07T21:40:00Z",
    "resultsJson": [49, 7, 43, 46, 47, 27]
  },
  {
    "drawSystemId": 6383,
    "drawDate": "2020-03-05T21:40:00Z",
    "resultsJson": [49, 21, 7, 34, 4, 47]
  },
  {
    "drawSystemId": 6382,
    "drawDate": "2020-03-03T21:40:00Z",
    "resultsJson": [17, 16, 13, 38, 46, 45]
  },
  {
    "drawSystemId": 6381,
    "drawDate": "2020-02-29T21:40:00Z",
    "resultsJson": [12, 39, 6, 38, 40, 15]
  },
  {
    "drawSystemId": 6380,
    "drawDate": "2020-02-27T21:40:00Z",
    "resultsJson": [20, 1, 18, 47, 24, 46]
  },
  {
    "drawSystemId": 6379,
    "drawDate": "2020-02-25T21:40:00Z",
    "resultsJson": [6, 49, 16, 19, 27, 5]
  },
  {
    "drawSystemId": 6378,
    "drawDate": "2020-02-22T21:40:00Z",
    "resultsJson": [44, 4, 35, 6, 15, 43]
  },
  {
    "drawSystemId": 6377,
    "drawDate": "2020-02-20T21:40:00Z",
    "resultsJson": [2, 46, 8, 21, 30, 39]
  },
  {
    "drawSystemId": 6376,
    "drawDate": "2020-02-18T21:40:00Z",
    "resultsJson": [10, 38, 22, 31, 2, 19]
  },
  {
    "drawSystemId": 6375,
    "drawDate": "2020-02-15T21:40:00Z",
    "resultsJson": [25, 27, 40, 7, 10, 35]
  },
  {
    "drawSystemId": 6374,
    "drawDate": "2020-02-13T21:40:00Z",
    "resultsJson": [2, 26, 40, 14, 22, 16]
  },
  {
    "drawSystemId": 6373,
    "drawDate": "2020-02-11T21:40:00Z",
    "resultsJson": [5, 17, 49, 23, 36, 47]
  },
  {
    "drawSystemId": 6372,
    "drawDate": "2020-02-08T21:40:00Z",
    "resultsJson": [7, 46, 16, 48, 25, 29]
  },
  {
    "drawSystemId": 6371,
    "drawDate": "2020-02-06T21:40:00Z",
    "resultsJson": [6, 27, 41, 12, 42, 15]
  },
  {
    "drawSystemId": 6370,
    "drawDate": "2020-02-04T21:40:00Z",
    "resultsJson": [41, 25, 6, 43, 19, 20]
  },
  {
    "drawSystemId": 6369,
    "drawDate": "2020-02-01T21:40:00Z",
    "resultsJson": [25, 24, 11, 15, 16, 10]
  },
  {
    "drawSystemId": 6368,
    "drawDate": "2020-01-30T21:40:00Z",
    "resultsJson": [49, 45, 4, 40, 28, 14]
  },
  {
    "drawSystemId": 6367,
    "drawDate": "2020-01-28T21:40:00Z",
    "resultsJson": [20, 10, 32, 35, 12, 37]
  },
  {
    "drawSystemId": 6366,
    "drawDate": "2020-01-25T21:40:00Z",
    "resultsJson": [30, 46, 9, 19, 16, 11]
  },
  {
    "drawSystemId": 6365,
    "drawDate": "2020-01-23T21:40:00Z",
    "resultsJson": [22, 46, 41, 40, 23, 33]
  },
  {
    "drawSystemId": 6364,
    "drawDate": "2020-01-21T21:40:00Z",
    "resultsJson": [39, 11, 19, 23, 22, 16]
  },
  {
    "drawSystemId": 6363,
    "drawDate": "2020-01-18T21:40:00Z",
    "resultsJson": [42, 9, 30, 15, 38, 32]
  },
  {
    "drawSystemId": 6362,
    "drawDate": "2020-01-16T21:40:00Z",
    "resultsJson": [29, 45, 1, 20, 44, 43]
  }
];


