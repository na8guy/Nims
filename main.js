let gameData = null;
let multiplier = 1.0;
let altitude = 1000;
let isClimbing = false;
let sessionId = null;
let crashPoint = null;
let graphPoints = [[0, '100%']];
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
const errorPopup = document.getElementById('errorPopup');
let particles = [];

function resizeCanvas() {
    canvas.width = Math.min(window.innerWidth * 0.9, 500);
    canvas.height = Math.min(window.innerHeight * 0.7, 700);
    graphSvg.setAttribute('width', Math.min(window.innerWidth * 0.15, 100));
    graphSvg.setAttribute('height', canvas.height);
}

function showError(message) {
    errorPopup.textContent = message;
    errorPopup.classList.add('active');
    setTimeout(() => errorPopup.classList.remove('active'), 3000);
}

function initGame() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get('data');
    if (data) {
        try {
            gameData = JSON.parse(decodeURIComponent(data));
            console.log('Game Data:', gameData);
            updateUI();
        } catch (e) {
            console.error('Error parsing gameData:', e);
            showError('Failed to load game data.');
        }
    }
}

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
        graphPoints = [[0, '100%']];
        lastMilestone = 1000;
        nims.classList.add('climbing');
        startClimbing();
    } else {
        nims.classList.remove('climbing', 'waving');
    }
}

function startClimbing() {
    lastUpdate = Date.now();
    requestAnimationFrame(updateGame);
}

function updateGame() {
    if (!isClimbing) return;

    const now = Date.now();
    const delta = (now - lastUpdate) / 1000;
    lastUpdate = now;

    multiplier += delta * (0.7 + multiplier * 0.2);
    if (crashPoint && multiplier >= crashPoint) {
        triggerAvalanche();
        return;
    }

    altitude = Math.round(1000 * multiplier);
    altitudeDisplay.textContent = altitude;
    multiplierDisplay.textContent = multiplier.toFixed(2);

    if (altitude >= lastMilestone + 1000) {
        lastMilestone += 1000;
        nims.classList.remove('climbing');
        nims.classList.add('waving');
        setTimeout(() => {
            if (isClimbing) {
                nims.classList.remove('waving');
                nims.classList.add('climbing');
            }
        }, 800);
    }

    const canvasHeight = canvas.height;
    const nimsY = canvasHeight - (multiplier - 1) * 80;
    nims.style.bottom = `${Math.max(50, Math.min(canvasHeight - 85, nimsY))}px`;

    const graphX = graphPoints[graphPoints.length - 1][0] + delta * 70;
    const graphY = `${100 - (multiplier - 1) * 20}%`;
    graphPoints.push([graphX, graphY]);
    if (graphX > graphSvg.getAttribute('width')) {
        graphPoints.shift();
        graphPoints = graphPoints.map(([x, y]) => [x - delta * 70, y]);
    }
    altitudeLine.setAttribute('points', graphPoints.map(([x, y]) => `${x},${(parseFloat(y) / 100) * canvasHeight}`).join(' '));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawWind();
    drawParticles();

    requestAnimationFrame(updateGame);
}

function drawWind() {
    if (Math.random() < 0.2) {
        particles.push({
            x: canvas.width,
            y: Math.random() * canvas.height,
            size: 3 + Math.random() * 5,
            speed: 80 + Math.random() * 80,
            type: 'wind'
        });
    }
    particles = particles.filter(p => p.x > -p.size || p.type !== 'wind');
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    particles.forEach(p => {
        if (p.type === 'wind') {
            p.x -= p.speed * (1 / 60);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function drawParticles() {
    particles.forEach(p => {
        if (p.type === 'snow') {
            p.x += p.vx * (1 / 60);
            p.y += p.vy * (1 / 60);
            p.vy += 0.6;
            ctx.drawImage(p.image, p.x, p.y, p.size, p.size);
        }
    });
    particles = particles.filter(p => p.y < canvas.height + p.size);
}

function triggerAvalanche() {
    isClimbing = false;
    nims.classList.remove('climbing', 'waving');
    avalancheOverlay.classList.add('active');
    document.body.style.animation = 'shake 1s';

    const snowImage = new Image();
    snowImage.src = '/assets/snow.png';
    for (let i = 0; i < 100; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: -20,
            size: 6 + Math.random() * 12,
            vx: (Math.random() - 0.5) * 60,
            vy: 60 + Math.random() * 120,
            type: 'snow',
            image: snowImage
        });
    }

    setTimeout(() => {
        document.body.style.animation = '';
        avalancheOverlay.classList.remove('active');
        if (!gameData || !gameData.game_started || !sessionId) {
            console.error('Cannot send lost action: Missing game data', {
                gameData: gameData,
                sessionId: sessionId
            });
            showError('Game error: Please restart.');
            resetGame();
            return;
        }
        const lostData = {
            action: 'lost',
            session_id: sessionId,
            multiplier: parseFloat(multiplier.toFixed(2)),
            token: gameData.game_started.token || 'BNB'
        };
        console.log('Sending lost data:', lostData);
        Telegram.WebApp.sendData(JSON.stringify(lostData));
        resetGame();
    }, 3000);
}

function resetGame() {
    multiplier = 1.0;
    altitude = 1000;
    sessionId = null;
    crashPoint = null;
    graphPoints = [[0, '100%']];
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
}

stakeButton.addEventListener('click', () => {
    const stake = parseFloat(stakeInput.value);
    const token = tokenSelect.value;
    if (isNaN(stake) || stake < 0.01) {
        showError('Stake must be at least 0.01.');
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
    Telegram.WebApp.sendData(JSON.stringify({
        action: 'rest',
        session_id: sessionId,
        multiplier: multiplier.toFixed(2),
        token: gameData.game_started.token || 'BNB'
    }));
    resetGame();
});

cashoutButton.addEventListener('click', () => {
    isClimbing = false;
    Telegram.WebApp.sendData(JSON.stringify({
        action: 'cashout',
        session_id: sessionId,
        multiplier: multiplier.toFixed(2),
        token: gameData.game_started.token || 'BNB'
    }));
    resetGame();
});

initGame();
