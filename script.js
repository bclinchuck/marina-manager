let gameState = {
    day: 1,
    money: 1000,
    timeMinutes: 480,       // 8:00 AM in minutes
    maxTimeMinutes: 1200,   // 8:00 PM in minutes
    dayBoatsPool: [],       
    incomingQueue: [],      
    slips: [
        { id: 1, maxLoa: 50, maxBeam: 16, occupiedBy: null },
        { id: 2, maxLoa: 50, maxBeam: 16, occupiedBy: null },
        { id: 3, maxLoa: 40, maxBeam: 14, occupiedBy: null },
    ],
    isPaused: false
};

window.onload = () => {
    initDay();
    requestAnimationFrame(gameLoop);
};

function initDay() {
    gameState.timeMinutes = 480;
    
    // Total boats for the day increases with day count
    const totalBoats = 4 + gameState.day * 2;
    
    // Constraint: Never generate more overnight boats than we currently have slips,
    // ensuring the puzzle is always physically solvable. The rest will be short-stay!
    const maxOvernight = gameState.slips.length;
    let overnightCount = Math.min(Math.floor(Math.random() * 2) + 2 + Math.floor(gameState.day / 2), maxOvernight);
    let shortStayCount = totalBoats - overnightCount;

    gameState.dayBoatsPool = [];
    gameState.incomingQueue = [];
    
    // Generate Overnight Boats
    for (let i = 0; i < overnightCount; i++) {
        const arrivalTime = (i === 0) ? 480 : 480 + Math.floor(Math.random() * 360);
        const boat = {
            id: `boat-overnight-${gameState.day}-${i}`,
            name: `Vessel ${i + 1} (Night)`,
            loa: Math.floor(Math.random() * 20) + 25,
            beam: Math.floor(Math.random() * 5) + 10,
            fee: 200 + gameState.day * 25,
            arrivalTime: arrivalTime,
            isShortStay: false,
            stayDuration: 1200 - arrivalTime,
            dockedAt: null
        };
        if (arrivalTime === 480) gameState.incomingQueue.push(boat);
        else gameState.dayBoatsPool.push(boat);
    }

    // Generate Short Stay Boats
    for (let j = 0; j < shortStayCount; j++) {
        const arrivalTime = (overnightCount === 0 && j === 0) ? 480 : 480 + Math.floor(Math.random() * 420);
        // Short stay lasts between 2 to 4.5 hours (120 to 270 minutes)
        const stayDuration = Math.floor(Math.random() * 150) + 120;
        
        const boat = {
            id: `boat-short-${gameState.day}-${j}`,
            name: `Vessel ${overnightCount + j + 1} (Transient)`,
            loa: Math.floor(Math.random() * 20) + 25,
            beam: Math.floor(Math.random() * 5) + 10,
            fee: 150 + gameState.day * 25,
            arrivalTime: arrivalTime,
            isShortStay: true,
            stayDuration: stayDuration,
            dockedAt: null
        };
        if (arrivalTime === 480) gameState.incomingQueue.push(boat);
        else gameState.dayBoatsPool.push(boat);
    }

    // Sort pool by arrival time
    gameState.dayBoatsPool.sort((a, b) => a.arrivalTime - b.arrivalTime);
    render();
}

function gameLoop() {
    if (!gameState.isPaused) {
        gameState.timeMinutes += 0.15; 
        
        const currentTime = Math.floor(gameState.timeMinutes);

        // 1. Check for newly arriving boats
        while (gameState.dayBoatsPool.length > 0 && gameState.dayBoatsPool[0].arrivalTime <= currentTime) {
            const arrivingBoat = gameState.dayBoatsPool.shift();
            gameState.incomingQueue.push(arrivingBoat);
        }

        // 2. Check for short-stay boats ready to depart
        gameState.slips.forEach(slip => {
            if (slip.occupiedBy && slip.occupiedBy.isShortStay) {
                const timeSpent = currentTime - slip.occupiedBy.dockedAt;
                if (timeSpent >= slip.occupiedBy.stayDuration) {
                    slip.occupiedBy = null; // Vessel departs, freeing slip
                }
            }
        });

        // 3. Check end of day (8:00 PM)
        if (gameState.timeMinutes >= gameState.maxTimeMinutes) {
            checkEndOfDay();
        }

        render();
    }
    requestAnimationFrame(gameLoop);
}

function formatTime(minutes) {
    let hours = Math.floor(minutes / 60);
    let mins = Math.floor(minutes % 60);
    let ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${mins < 10 ? '0' : ''}${mins} ${ampm}`;
}

function render() {
    renderHUD();
    renderIncoming();
    renderSlips();
}

function renderHUD() {
    document.getElementById('day-counter').innerText = gameState.day;
    document.getElementById('clock').innerText = formatTime(gameState.timeMinutes);
    document.getElementById('money').innerText = gameState.money;
    document.getElementById('queue-count').innerText = gameState.incomingQueue.length + gameState.dayBoatsPool.length;
}

function renderIncoming() {
    const list = document.getElementById('incoming-list');
    list.innerHTML = '';
    gameState.incomingQueue.forEach(boat => {
        const card = document.createElement('div');
        card.className = 'boat-card';
        card.draggable = true;
        
        const stayBadge = boat.isShortStay ? `⏱️ Transient (~${Math.round(boat.stayDuration/60)}h stay)` : `🌙 Overnight Stay`;
        
        card.innerHTML = `
            <div class="boat-header">
                <span class="boat-title">🛥️ ${boat.name}</span>
                <span style="color: #38bdf8; font-size: 0.8rem; font-weight: bold;">$${boat.fee}</span>
            </div>
            <div class="boat-specs">LOA: ${boat.loa}' | Beam: ${boat.beam}'</div>
            <div style="font-size: 0.75rem; color: #fbbf24; margin-top: 4px;">${stayBadge}</div>
        `;
        
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', boat.id);
            card.classList.add('dragging');
        });
        
        card.addEventListener('dragend', () => card.classList.remove('dragging'));
        list.appendChild(card);
    });
}

function renderSlips() {
    const grid = document.getElementById('slips-grid');
    grid.innerHTML = '';
    gameState.slips.forEach(slip => {
        const div = document.createElement('div');
        div.className = `slip ${slip.occupiedBy ? 'occupied' : ''}`;
        
        if (slip.occupiedBy) {
            let stayDetails = '🌙 Overnight';
            if (slip.occupiedBy.isShortStay) {
                const currentTime = Math.floor(gameState.timeMinutes);
                const timeLeft = (slip.occupiedBy.dockedAt + slip.occupiedBy.stayDuration) - currentTime;
                const hoursLeft = Math.floor(timeLeft / 60);
                const minsLeft = Math.max(0, Math.floor(timeLeft % 60));
                stayDetails = `⏱️ Departs in ${hoursLeft}h ${minsLeft}m`;
            }

            div.innerHTML = `
                <div class="slip-title">Slip ${slip.id}</div>
                <div class="docked-vessel">
                    <strong>🛥️ ${slip.occupiedBy.name}</strong><br>
                    <small>${slip.occupiedBy.loa}' LOA / ${slip.occupiedBy.beam}' Beam</small><br>
                    <span style="font-size: 0.7rem; color: #fde047; font-weight: bold;">${stayDetails}</span>
                </div>
            `;
        } else {
            div.innerHTML = `
                <div class="slip-title">Slip ${slip.id}</div>
                <div class="slip-info">Max LOA: ${slip.maxLoa}ft<br>Max Beam: ${slip.maxBeam}ft</div>
            `;
        }

        div.addEventListener('dragover', (e) => e.preventDefault());
        div.addEventListener('drop', (e) => {
            e.preventDefault();
            const boatId = e.dataTransfer.getData('text/plain');
            assignBoatToSlip(boatId, slip.id);
        });

        grid.appendChild(div);
    });
}

function assignBoatToSlip(boatId, slipId) {
    const boatIndex = gameState.incomingQueue.findIndex(b => b.id === boatId);
    if (boatIndex === -1) return;
    const boat = gameState.incomingQueue[boatIndex];
    const slip = gameState.slips.find(s => s.id === slipId);

    if (slip && !slip.occupiedBy) {
        if (boat.loa <= slip.maxLoa && boat.beam <= slip.maxBeam) {
            boat.dockedAt = Math.floor(gameState.timeMinutes);
            slip.occupiedBy = boat;
            gameState.incomingQueue.splice(boatIndex, 1);
            gameState.money += boat.fee;
            render();
            checkWinCondition();
        } else {
            alert(`⚠️ Vessel too large for Slip ${slip.id}!\nNeeds max ${boat.loa}ft LOA / ${boat.beam}ft Beam.`);
        }
    }
}

function checkWinCondition() {
    if (gameState.dayBoatsPool.length === 0 && gameState.incomingQueue.length === 0) {
        endDay(true);
    }
}

function checkEndOfDay() {
    gameState.isPaused = true;
    const modal = document.getElementById('shop-modal');
    const summary = document.getElementById('summary-text');
    
    const unparked = gameState.incomingQueue.length + gameState.dayBoatsPool.length;
    if (unparked === 0) {
        summary.innerHTML = `🎉 <strong>Flawless Dockmaster Operations!</strong> All vessels successfully handled before sunset. Daily revenue collected!`;
    } else {
        summary.innerHTML = `⚠️ <strong>Sunset Reached!</strong> ${unparked} vessels were left unparked in the queue.`;
    }
    
    modal.classList.remove('hidden');
}

function endDay(success = false) {
    gameState.isPaused = true;
    const modal = document.getElementById('shop-modal');
    const summary = document.getElementById('summary-text');
    
    if (success) {
        summary.innerHTML = `🎉 <strong>Great job, Dockmaster!</strong> All vessels safely berthed. Daily revenue collected!`;
    } else {
        summary.innerHTML = `⚠️ <strong>Day Ended with queue remaining.</strong>`;
    }
    
    modal.classList.remove('hidden');
}

function buySlip() {
    if (gameState.money >= 500) {
        gameState.money -= 500;
        const newId = gameState.slips.length + 1;
        gameState.slips.push({
            id: newId,
            maxLoa: 55,
            maxBeam: 18,
            occupiedBy: null
        });
        renderHUD();
        alert(`Successfully constructed Slip #${newId}!`);
    } else {
        alert("Not enough funds! Earn more by docking boats.");
    }
}

function startNextDay() {
    gameState.day++;
    gameState.slips.forEach(s => s.occupiedBy = null);
    gameState.isPaused = false;
    document.getElementById('shop-modal').classList.add('hidden');
    initDay();
}