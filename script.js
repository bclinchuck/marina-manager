let gameState = {
    day: 1,
    money: 1000,
    timeMinutes: 480,       // 8:00 AM
    maxTimeMinutes: 1200,   // 8:00 PM
    dayBoatsPool: [],       
    incomingQueue: [],      
    slips: [
        { id: 1, x: 80, y: 80, w: 90, h: 50, maxLoa: 50, maxBeam: 16, occupiedBy: null },
        { id: 2, x: 80, y: 150, w: 90, h: 50, maxLoa: 50, maxBeam: 16, occupiedBy: null },
        { id: 3, x: 80, y: 220, w: 90, h: 50, maxLoa: 40, maxBeam: 14, occupiedBy: null },
        { id: 4, x: 80, y: 290, w: 90, h: 50, maxLoa: 40, maxBeam: 14, occupiedBy: null },
        { id: 5, x: 80, y: 360, w: 90, h: 50, maxLoa: 55, maxBeam: 18, occupiedBy: null }
    ],
    isPaused: false
};

let canvas, ctx;

window.onload = () => {
    canvas = document.getElementById('marina-canvas');
    ctx = canvas.getContext('2d');

    canvas.addEventListener('dragover', (e) => e.preventDefault());
    canvas.addEventListener('drop', handleCanvasDrop);

    initDay();
    requestAnimationFrame(gameLoop);
};

function initDay() {
    gameState.timeMinutes = 480;
    const totalBoats = 4 + gameState.day * 2;
    const maxOvernight = gameState.slips.length;
    let overnightCount = Math.min(Math.floor(Math.random() * 2) + 2 + Math.floor(gameState.day / 2), maxOvernight);
    let shortStayCount = totalBoats - overnightCount;

    gameState.dayBoatsPool = [];
    gameState.incomingQueue = [];
    
    // Generate Overnight
    for (let i = 0; i < overnightCount; i++) {
        const arrivalTime = (i === 0) ? 480 : 480 + Math.floor(Math.random() * 360);
        const boat = {
            id: `boat-overnight-${gameState.day}-${i}`,
            name: `Vessel ${i + 1}`,
            loa: Math.floor(Math.random() * 15) + 30,
            beam: Math.floor(Math.random() * 4) + 11,
            fee: 200 + gameState.day * 25,
            arrivalTime: arrivalTime,
            isShortStay: false,
            stayDuration: 1200 - arrivalTime,
            dockedAt: null,
            color: '#38bdf8'
        };
        if (arrivalTime === 480) gameState.incomingQueue.push(boat);
        else gameState.dayBoatsPool.push(boat);
    }

    // Generate Short Stay
    for (let j = 0; j < shortStayCount; j++) {
        const arrivalTime = (overnightCount === 0 && j === 0) ? 480 : 480 + Math.floor(Math.random() * 420);
        const stayDuration = Math.floor(Math.random() * 150) + 120;
        
        const boat = {
            id: `boat-short-${gameState.day}-${j}`,
            name: `Vessel ${overnightCount + j + 1}`,
            loa: Math.floor(Math.random() * 15) + 25,
            beam: Math.floor(Math.random() * 4) + 10,
            fee: 150 + gameState.day * 25,
            arrivalTime: arrivalTime,
            isShortStay: true,
            stayDuration: stayDuration,
            dockedAt: null,
            color: '#fbbf24'
        };
        if (arrivalTime === 480) gameState.incomingQueue.push(boat);
        else gameState.dayBoatsPool.push(boat);
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Water Background
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    for (let i = 0; i < canvas.height; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.bezierCurveTo(200, i + 10, 400, i - 10, canvas.width, i);
        ctx.stroke();
    }

    // 2. Main Wooden Pier
    ctx.fillStyle = '#78350f';
    ctx.fillRect(30, 40, 30, 460);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 3;
    ctx.strokeRect(30, 40, 30, 460);

    // 3. Slips
    gameState.slips.forEach(slip => {
        ctx.fillStyle = slip.occupiedBy ? '#064e3b' : '#92400e';
        ctx.fillRect(slip.x, slip.y, slip.w, slip.h);
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2;
        ctx.strokeRect(slip.x, slip.y, slip.w, slip.h);

        ctx.fillStyle = '#fef3c7';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`Slip ${slip.id}`, slip.x + 8, slip.y + 16);
        
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#fde68a';
        ctx.fillText(`Max: ${slip.maxLoa}' / ${slip.maxBeam}'`, slip.x + 8, slip.y + 32);

        if (slip.occupiedBy) {
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(slip.x + slip.w - 35, slip.y + 10, 28, 30);
            
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText(slip.occupiedBy.name, slip.x + slip.w - 33, slip.y + 22);

            let stayText = '🌙 Night';
            if (slip.occupiedBy.isShortStay) {
                const currentTime = Math.floor(gameState.timeMinutes);
                const timeLeft = (slip.occupiedBy.dockedAt + slip.occupiedBy.stayDuration) - currentTime;
                const hoursLeft = Math.floor(timeLeft / 60);
                const minsLeft = Math.max(0, Math.floor(timeLeft % 60));
                stayText = `${hoursLeft}h ${minsLeft}m`;
            }
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(stayText, slip.x + slip.w - 33, slip.y + 34);
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
        dropX >= slip.x && dropX <= slip.x + slip.w &&
        dropY >= slip.y && dropY <= slip.y + slip.h
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
            y: lastSlip.y + 70,
            w: 90,
            h: 50,
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