let gameState = {
    day: 1,
    money: 1000,
    timeMinutes: 480, // 8:00 AM in minutes (8 * 60)
    maxTimeMinutes: 1200, // 8:00 PM (20 * 60)
    incomingQueue: [],
    slips: [
        { id: 1, maxLoa: 50, maxBeam: 16, occupiedBy: null },
        { id: 2, maxLoa: 50, maxBeam: 16, occupiedBy: null },
        { id: 3, maxLoa: 40, maxBeam: 14, occupiedBy: null },
    ],
    isPaused: false
};

// Start Game Loop
window.onload = () => {
    initDay();
    requestAnimationFrame(gameLoop);
};

function initDay() {
    gameState.timeMinutes = 480;
    // Generate boats for the day based on day number
    const boatCount = 3 + gameState.day * 2;
    gameState.incomingQueue = [];
    
    for (let i = 0; i < boatCount; i++) {
        gameState.incomingQueue.push({
            id: `boat-${gameState.day}-${i}`,
            name: `Vessel ${i + 1}`,
            loa: Math.floor(Math.random() * 25) + 25, // 25ft to 50ft
            beam: Math.floor(Math.random() * 6) + 10,  // 10ft to 15ft
            fee: 150 + gameState.day * 25
        });
    }
    render();
}

function gameLoop() {
    if (!gameState.isPaused) {
        // Advance time (1 real second = 10 game minutes)
        gameState.timeMinutes += 0.5; 
        
        if (gameState.timeMinutes >= gameState.maxTimeMinutes) {
            endDay();
        }
        renderHUD();
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
    document.getElementById('queue-count').innerText = gameState.incomingQueue.length;
}

function renderIncoming() {
    const list = document.getElementById('incoming-list');
    list.innerHTML = '';
    gameState.incomingQueue.forEach(boat => {
        const card = document.createElement('div');
        card.className = 'boat-card';
        card.draggable = true;
        card.innerHTML = `<strong>${boat.name}</strong><br>LOA: ${boat.loa}ft | Beam: ${boat.beam}ft`;
        
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
            div.innerHTML = `<strong>Slip ${slip.id}</strong><br>${slip.occupiedBy.name}<br><small>${slip.occupiedBy.loa}ft / ${slip.occupiedBy.beam}ft</small>`;
        } else {
            div.innerHTML = `<strong>Slip ${slip.id}</strong><br><small>Max: ${slip.maxLoa}ft x ${slip.maxBeam}ft</small>`;
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
            slip.occupiedBy = boat;
            gameState.incomingQueue.splice(boatIndex, 1);
            gameState.money += boat.fee;
            render();
            checkWinCondition();
        } else {
            alert(`Vessel too large for Slip ${slip.id}! (Needs max ${boat.loa}ft LOA / ${boat.beam}ft Beam)`);
        }
    }
}

function checkWinCondition() {
    if (gameState.incomingQueue.length === 0) {
        // Clear boats from slips for the next day, or let them stay docked. 
        // For simplicity, let's trigger end of day summary early if all boats are docked!
        endDay(true);
    }
}

function endDay(success = false) {
    gameState.isPaused = true;
    const modal = document.getElementById('shop-modal');
    const summary = document.getElementById('summary-text');
    
    const unparked = gameState.incomingQueue.length;
    if (success || unparked === 0) {
        summary.innerHTML = `🎉 <strong>Great job, Dockmaster!</strong> All vessels safely berthed. Earned daily revenue!`;
    } else {
        summary.innerHTML = `⚠️ <strong>Day Ended!</strong> ${unparked} vessels were left unparked on the queue. Efficiency penalty applied.`;
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
        alert(`Successfully purchased Slip #${newId}!`);
    } else {
        alert("Not enough funds! Earn more by docking boats.");
    }
}

function startNextDay() {
    gameState.day++;
    // Clear slips for the new day
    gameState.slips.forEach(s => s.occupiedBy = null);
    gameState.isPaused = false;
    document.getElementById('shop-modal').classList.add('hidden');
    initDay();
}