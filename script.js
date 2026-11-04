let gameState = {
    day: 1,
    money: 1000,
    timeMinutes: 480,       // 8:00 AM in minutes
    maxTimeMinutes: 1200,   // 8:00 PM in minutes
    dayBoatsPool: [],       
    incomingQueue: [],      
    slips: [
        { id: 1, x: 150, y: 35, w: 140, h: 65, maxLoa: 50, maxBeam: 16, occupiedBy: null },
        { id: 2, x: 150, y: 115, w: 140, h: 65, maxLoa: 50, maxBeam: 16, occupiedBy: null },
        { id: 3, x: 150, y: 195, w: 140, h: 65, maxLoa: 40, maxBeam: 14, occupiedBy: null },
        { id: 4, x: 150, y: 275, w: 140, h: 65, maxLoa: 40, maxBeam: 14, occupiedBy: null },
        { id: 5, x: 150, y: 355, w: 140, h: 65, maxLoa: 55, maxBeam: 18, occupiedBy: null }
    ],
    isPaused: false
};

let canvas, ctx;

window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('marina-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    canvas.addEventListener('dragover', (e) => e.preventDefault());
    canvas.addEventListener('drop', handleCanvasDrop);

    initDay();
    requestAnimationFrame(gameLoop);
});

function initDay() {
    gameState.timeMinutes = 480;
    const totalBoats = 4 + (gameState.day * 2);
    gameState.dayBoatsPool = [];
    gameState.incomingQueue = [];
    
    for (let i = 0; i < totalBoats; i++) {
        const arrivalTime = (i < 2) ? 480 : 480 + Math.floor(Math.random() * 360);
        const isShortStay = Math.random() < 0.5;
        const stayDuration = isShortStay ? Math.floor(Math.random() * 150) + 120 : (1200 - arrivalTime);

        const boat = {
            id: `boat-${gameState.day}-${i}`,
            name: `Vessel ${i + 1}`,
            loa: Math.floor(Math.random() * 15) + 25,
            beam: Math.floor(Math.random() * 4) + 10,
            fee: 150 + (gameState.day * 25),
            arrivalTime: arrivalTime,
            isShortStay: isShortStay,
            stayDuration: stayDuration,
            dockedAt: null,
            color: isShortStay ? '#fbbf24' : '#38bdf8'
        };

        if (arrivalTime === 480) {
            gameState.incomingQueue.push(boat);
        } else {
            gameState.dayBoatsPool.push(boat);
        }
    }

    gameState.dayBoatsPool.sort((a, b) => a.arrivalTime - b.arrivalTime);
    render();
}

function gameLoop() {
    if (!gameState.isPaused) {
        gameState.timeMinutes += 0.07; 
        
        const currentTime = Math.floor(gameState.timeMinutes);

        while (gameState.dayBoatsPool.length > 0 && gameState.dayBoatsPool[0].arrivalTime <= currentTime) {
            const arrivingBoat = gameState.dayBoatsPool.shift();
            gameState.incomingQueue.push(arrivingBoat);
        }

        gameState.slips.forEach(slip => {
            if (slip.occupiedBy && slip.occupiedBy.isShortStay) {
                const timeSpent = currentTime - slip.occupiedBy.dockedAt;
                if (timeSpent >= slip.occupiedBy.stayDuration) {
                    slip.occupiedBy = null; 
                }
            }
        });

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
    drawMarinaCanvas();
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
        
        const stayBadge = boat.isShortStay ? `⏱️ Transient (~${Math.round(boat.stayDuration/60)}h)` : `🌙 Overnight`;
        
        card.innerHTML = `
            <div class="boat-header">
                <span class="boat-title">🛥️ ${boat.name}</span>
                <span style="color: #38bdf8; font-size: 0.8rem; font-weight: bold;">$${boat.fee}</span>
            </div>
            <div class="boat-specs">LOA: ${boat.loa}' | Beam: ${boat.beam}'</div>
            <div style="font-size: 0.75rem; color: ${boat.color}; margin-top: 4px;">${stayBadge}</div>
        `;
        
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', boat.id);
            card.classList.add('dragging');
        });
        
        card.addEventListener('dragend', () => card.classList.remove('dragging'));
        list.appendChild(card);
    });
}

function drawMarinaCanvas() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Water Background with ripple lines
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    for (let i = 0; i < canvas.height; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.bezierCurveTo(200, i + 10, 400, i - 10, canvas.width, i);
        ctx.stroke();
    }

    // 2. Main Wooden Pier Walkway
    ctx.fillStyle = '#78350f';
    ctx.fillRect(80, 20, 45, 480);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 3;
    ctx.strokeRect(80, 20, 45, 480);

    // 3. Slips & Rendered Boats
    gameState.slips.forEach(slip => {
        // Draw finger pier dock structure
        ctx.fillStyle = '#92400e';
        ctx.fillRect(slip.x, slip.y, slip.w, slip.h);
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2;
        ctx.strokeRect(slip.x, slip.y, slip.w, slip.h);

        // Slip text info
        ctx.fillStyle = '#fef3c7';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`Slip ${slip.id}`, slip.x + 10, slip.y + 20);
        
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#fde68a';
        ctx.fillText(`Max: ${slip.maxLoa}' / ${slip.maxBeam}'`, slip.x + 10, slip.y + 36);

        // If Occupied, draw top-down boat sprite graphic inside the slip!
        if (slip.occupiedBy) {
            const bx = slip.x + 55;
            const by = slip.y + 8;
            const bw = 75;
            const bh = 48;

            // Boat Hull Base (Yacht shape)
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath();
            ctx.roundRect(bx, by, bw, bh, [6, 16, 16, 6]);
            ctx.fill();
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Cabin / Superstructure
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(bx + 20, by + 10, 35, 28);
            ctx.strokeStyle = '#475569';
            ctx.strokeRect(bx + 20, by + 10, 35, 28);

            // Windshield / Bridge Windows
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(bx + 45, by + 12, 8, 24);

            // Boat Name & Countdown Tag
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(slip.occupiedBy.name, bx + 22, by + 58);

            let stayText = '🌙 Overnight';
            if (slip.occupiedBy.isShortStay) {
                const currentTime = Math.floor(gameState.timeMinutes);
                const timeLeft = (slip.occupiedBy.dockedAt + slip.occupiedBy.stayDuration) - currentTime;
                const hoursLeft = Math.floor(timeLeft / 60);
                const minsLeft = Math.max(0, Math.floor(timeLeft % 60));
                stayText = `⏱️ ${hoursLeft}h ${minsLeft}m`;
            }
            ctx.fillStyle = '#0284c7';
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText(stayText, bx + 22, by + 70);
        }
    });
}

function handleCanvasDrop(e) {
    e.preventDefault();
    const boatId = e.dataTransfer.getData('text/plain');
    const rect = canvas.getBoundingClientRect();
    const dropX = e.clientX - rect.left;
    const dropY = e.clientY - rect.top;

    const targetSlip = gameState.slips.find(slip => 
        dropX >= slip.x && dropX <= slip.x + slip.w && dropY >= slip.y && dropY <= slip.y + slip.h
    );

    if (targetSlip) {
        assignBoatToSlip(boatId, targetSlip.id);
    }
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
        const lastSlip = gameState.slips[gameState.slips.length - 1];
        gameState.slips.push({
            id: newId,
            x: lastSlip.x,
            y: lastSlip.y + 80,
            w: 140,
            h: 65,
            maxLoa: 55,
            maxBeam: 18,
            occupiedBy: null
        });
        render();
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