let gameState = {
    day: 1,
    money: 1000,
    timeMinutes: 480,       // 8:00 AM in minutes
    maxTimeMinutes: 1200,   // 8:00 PM in minutes
    dayBoatsPool: [],       // All boats scheduled to arrive today
    incomingQueue: [],      // Boats currently waiting for a slip
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
    const boatCount = 4 + gameState.day * 2;
    gameState.dayBoatsPool = [];
    gameState.incomingQueue = [];
    
    for (let i = 0; i < boatCount; i++) {
        // Ensure the first 2 boats arrive immediately at 8:00 AM (480 mins), 
        // and the rest arrive staggered up to 3:00 PM (900 mins)
        const arrivalTime = (i < 2) ? 480 : 480 + Math.floor(Math.random() * 420);
        
        const isShortStay = Math.random() < 0.5;
        const stayDuration = isShortStay ? Math.floor(Math.random() * 120) + 120 : (1200 - arrivalTime);

        const boat = {
            id: `boat-${gameState.day}-${i}`,
            name: `Vessel ${i + 1}`,
            loa: Math.floor(Math.random() * 25) + 25, // 25ft to 50ft
            beam: Math.floor(Math.random() * 6) + 10,  // 10ft to 15ft
            fee: 150 + gameState.day * 25,
            arrivalTime: arrivalTime,
            stayDuration: stayDuration,
            isShortStay: isShortStay,
            dockedAt: null
        };

        // If they arrive at 8:00 AM, put them straight into the visible queue!
        if (arrivalTime === 480) {
            gameState.incomingQueue.push(boat);
        } else {
            gameState.dayBoatsPool.push(boat);
        }
    }

    // Sort pool by arrival time
    gameState.dayBoatsPool.sort((a, b) => a.arrivalTime - b.arrivalTime);
    render();
}

function gameLoop() {
    if (!gameState.isPaused) {
        // Advance time (0.15 minutes per frame for a smooth pace)
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
                    // Boat departs, freeing up the slip!
                    slip.occupiedBy = null;
                }
            }
        });

        // 3. Check win/loss conditions at end of day (8:00 PM)
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
        
        const stayBadge = boat.isShortStay ? `⏱️ Short Stay (~${Math.round(boat.stayDuration/60)}h)` : `🌙 Overnight`;
        
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
            const stayText = slip.occupiedBy.isShortStay ? '⏱️ Short Stay' : '🌙 Overnight';
            div.innerHTML = `
                <div class="slip-title">Slip ${slip.id}</div>
                <div class="docked-vessel">
                    <strong>🛥️ ${slip.occupiedBy.name}</strong><br>
                    <small>${slip.occupiedBy.loa}' LOA / ${slip.occupiedBy.beam}' Beam</small><br>
                    <span style="font-size: 0.7rem; color: #fde047;">${stayText}</span>
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
    // If all boats for the day have arrived AND been successfully docked (and none left in queue)
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
        summary.innerHTML = `⚠️ <strong>Sunset Reached!</strong> ${unparked} vessels were left unparked or missed. Efficiency penalty applied.`;
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