// Game state
let gameData = null;
let multiplier = 1.0;
let altitude = 1000;
let isClimbing = false;
let sessionId = null;
let crashPoint = null;
let graphPoints = [[0, 600]];
let lastUpdate = Date.now();
let lastMilestone = 1000;
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nims = document.getElementById('nimsCharacter');
const altitudeDisplay = document.getElementById('altitude');
const multiplierDisplay = document.getElementById('multiplier');
const earnedTickets = document.getElementById('earnedTickets');
const purchasedTickets = document.getElementById('purchasedTickets');
const leaderboardList = document.getElementById('leaderboardList');
const stakeInput = document.getElementById('stakeInput');
const tokenSelect = document.getElementById('tokenSelect');
const stakeButton = document.getElementById('stakeButton');
const restButton = document.getElementById('restButton');
const cashoutButton = document.getElementById('cashoutButton');
const graphSvg = document.getElementById('graphSvg');
const altitudeLine = document.getElementById('altitudeLine');
const avalancheOverlay = document.getElementById('avalancheOverlay');
const climbSound = document.getElementById('climbSound');
const avalancheSound = document.getElementById('avalancheSound');
const milestoneSound = document.getElementById('milestoneSound');

// Particle system for avalanche and wind
let particles = [];

// Initialize game
function initGame() {
    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get('data');
    if (data) {
        try {
            gameData = JSON.parse(decodeURIComponent(data));
            console.log('Game Data:', gameData);
            updateUI();
        } catch (e) {
            console.error('Error parsing gameData:', e);
        }
    }
}

// Update UI
function updateUI() {
    if (!gameData) return;
    earnedTickets.textContent = gameData.raffle_tickets || 0;
    purchasedTickets.textContent = gameData.purchased_tickets || 0;
    leaderboardList.innerHTML = gameData.leaderboard && gameData.leaderboard.length > 0
        ? gameData.leaderboard.map(entry => `<li>User ${entry.user_id}: ${entry.highest_cashout.toFixed(4)} NIMS</li>`).join('')
        : '<li>No leaderboard data yet.</li>';

    if (gameData.game_started) {
        sessionId = gameData.game_started.session_id;
        crashPoint = parseFloat(gameData.game_started.crash_point);
        multiplier = 1.0;
        altitude = 1000;
        isClimbing = true;
        stakeButton.disabled = true;
        restButton.disabled = false;
        cashoutButton.disabled = false;
        graphPoints = [[0, 600]];
        lastMilestone = 1000;
        nims.classList.add('climbing');
        climbSound.play();
        startClimbing();
    } else {
        nims.classList.remove('climbing');
        climbSound.pause();
    }
}

// Start climbing
function startClimbing() {
    lastUpdate = Date.now();
    requestAnimationFrame(updateGame);
}

// Update game
function updateGame() {
    if (!isClimbing) return;

    const now = Date.now();
    const delta = (now - lastUpdate) / 1000;
    lastUpdate = now;

    // Update multiplier
    multiplier += delta * (0.6 + multiplier * 0.15); // Slightly faster
    if (crashPoint && multiplier >= crashPoint) {
        triggerAvalanche();
        return;
    }

    // Update altitude
    altitude = Math.round(1000 * multiplier);
    altitudeDisplay.textContent = altitude;
    multiplierDisplay.textContent = multiplier.toFixed(2);

    // Milestone reactions
    if (altitude >= lastMilestone + 1000) {
        lastMilestone += 1000;
        nims.classList.remove('climbing');
        nims.classList.add('waving');
        milestoneSound.play();
        setTimeout(() => {
            if (isClimbing) {
                nims.classList.remove('waving');
                nims.classList.add('climbing');
            }
        }, 1000);
    }

    // Move Nims
    const canvasHeight = canvas.height;
    const nimsY = canvasHeight - (multiplier - 1) * 100;
    nims.style.bottom = `${Math.max(50, Math.min(canvasHeight - 70, nimsY))}px`;

    // Update graph
    const graphX = graphPoints[graphPoints.length - 1][0] + delta * 60;
    const graphY = 600 - (multiplier - 1) * 100;
    graphPoints.push([graphX, graphY]);
    if (graphX > 100) {
        graphPoints.shift();
        graphPoints = graphPoints.map(([x, y]) => [x - delta * 60, y]);
    }
    altitudeLine.setAttribute('points', graphPoints.map(p => p.join(',')).join(' '));

    // Draw particles
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawWind();
    drawParticles();

    requestAnimationFrame(updateGame);
}

// Draw wind particles
function drawWind() {
    if (Math.random() < 0.15) {
        particles.push({
            x: canvas.width,
            y: Math.random() * canvas.height,
            size: 3 + Math.random() * 4,
            speed: 60 + Math.random() * 60,
            type: 'wind'
        });
    }
    particles = particles.filter(p => p.x > -p.size || p.type !== 'wind');
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    particles.forEach(p => {
        if (p.type === 'wind') {
            p.x -= p.speed * (1 / 60);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

// Draw avalanche particles
function drawParticles() {
    particles.forEach(p => {
        if (p.type === 'snow') {
            p.x += p.vx * (1 / 60);
            p.y += p.vy * (1 / 60);
            p.vy += 0.5; // Gravity
            ctx.drawImage(p.image, p.x, p.y, p.size, p.size);
        }
    });
    particles = particles.filter(p => p.y < canvas.height + p.size);
}

// Trigger avalanche
function triggerAvalanche() {
    isClimbing = false;
    nims.classList.remove('climbing', 'waving');
    climbSound.pause();
    avalancheSound.play();
    avalancheOverlay.classList.add('active');
    document.body.style.animation = 'shake 0.8s';

    // Add snow particles
    const snowImage = new Image();
    snowImage.src = '/assets/snow.png';
    for (let i = 0; i < 100; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: -10,
            size: 5 + Math.random() * 10,
            vx: (Math.random() - 0.5) * 50,
            vy: 50 + Math.random() * 100,
            type: 'snow',
            image: snowImage
        });
    }

    setTimeout(() => {
        document.body.style.animation = '';
        avalancheOverlay.classList.remove('active');
        Telegram.WebApp.sendData(JSON.stringify({
            action: 'lost',
            session_id: sessionId,
            multiplier: multiplier.toFixed(2),
            token: gameData.game_started.token
        }));
        resetGame();
    }, 2500);
}

// Reset game
function resetGame() {
    multiplier = 1.0;
    altitude = 1000;
    sessionId = null;
    crashPoint = null;
    graphPoints = [[0, 600]];
    lastMilestone = 1000;
    stakeButton.disabled = false;
    restButton.disabled = true;
    cashoutButton.disabled = true;
    nims.style.bottom = '50px';
    nims.classList.remove('climbing', 'waving');
    altitudeDisplay.textContent = altitude;
    multiplierDisplay.textContent = '1.0';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter(p => p.type !== 'snow');
    climbSound.pause();
}

// Event listeners
stakeButton.addEventListener('click', () => {
    const stake = parseFloat(stakeInput.value);
    const token = tokenSelect.value;
    if (isNaN(stake) || stake <= 0) {
        alert('Please enter a valid stake.');
        return;
    }
    Telegram.WebApp.sendData(JSON.stringify({
        action: 'start_game',
        stake: stake.toFixed(8),
        token
    }));
});

restButton.addEventListener('click', () => {
    isClimbing = false;
    climbSound.pause();
    Telegram.WebApp.sendData(JSON.stringify({
        action: 'rest',
        session_id: sessionId,
        multiplier: multiplier.toFixed(2),
        token: gameData.game_started.token
    }));
    resetGame();
});

cashoutButton.addEventListener('click', () => {
    isClimbing = false;
    climbSound.pause();
    Telegram.WebApp.sendData(JSON.stringify({
        action: 'cashout',
        session_id: sessionId,
        multiplier: multiplier.toFixed(2),
        token: gameData.game_started.token
    }));
    resetGame();
});

// Initialize
initGame();
