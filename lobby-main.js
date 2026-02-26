// 1. Estado inicial del jugador
const defaultState = {
    coins: 100,
    energy: 100,
    level: 1,
    affinity: 0
};
let playerState = {};

// 2. Cargar datos al iniciar
function loadProgress() {
    const savedData = localStorage.getItem('archinimeUserData');
    if (savedData) {
        playerState = JSON.parse(savedData);
    } else {
        playerState = { ...defaultState };
        saveProgress();
    }
    updateHUD();
    startClock();
    
    // Mostrar saludo inicial después de 1.5 segundos para dar tiempo a que cargue el modelo
    setTimeout(() => {
        showDialogue("¡Bienvenido de nuevo! Me alegra mucho verte por aquí.");
    }, 1500);
}

// 3. Guardar progreso
function saveProgress() {
    localStorage.setItem('archinimeUserData', JSON.stringify(playerState));
}

// 4. Actualizar la interfaz (HUD)
function updateHUD() {
    document.getElementById('coins-val').innerText = playerState.coins;
    document.getElementById('energy-val').innerText = playerState.energy;
    document.getElementById('level').innerText = `Nivel: ${playerState.level}`;
    document.getElementById('affinity-val').innerText = playerState.affinity;
}

// Reloj en tiempo real
function startClock() {
    const timeDisplay = document.getElementById('current-time');
    function updateTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        timeDisplay.innerText = `${hours}:${minutes}`;
    }
    
    updateTime();
    // Llamada inicial
    setInterval(updateTime, 60000); // Actualizar cada minuto
}

// 5. Sistema de Diálogos
let dialogueTimeout;
function showDialogue(text) {
    const box = document.getElementById('dialogue-box');
    const textElement = document.getElementById('dialogue-text');
    
    textElement.innerText = text;
    box.classList.remove('hidden');
    // Ocultar el diálogo después de 5 segundos
    clearTimeout(dialogueTimeout);
    dialogueTimeout = setTimeout(() => {
        box.classList.add('hidden');
    }, 5000);
}

// 6. Interacción básica y Sistema de Afinidad
document.getElementById('waifu-placeholder').addEventListener('click', () => {
    if (playerState.energy >= 5) {
        playerState.affinity += 1;
        playerState.energy -= 5;
        
        // Comprobar hitos de afinidad
        if (playerState.affinity === 10) {
            playerState.coins += 50;
            showDialogue("¡Nuestra afinidad subió a 10! Ten este regalo por pasar tiempo conmigo. (+50 🪙)");
        } else if (playerState.affinity === 50) {
            playerState.coins += 200;
            showDialogue("¡Eres mi persona favorita! Gracias por visitarme siempre. (+200 🪙)");
        } else {
            // Diálogos regulares
            const frases = [
                "¡Oye, me haces cosquillas!",
                "¿Tienes algo bueno que ver hoy?",
                "Jeje, gracias por la visita.",
                "Deberíamos ver un episodio más... solo uno más."
            ];
        
            const fraseRandom = frases[Math.floor(Math.random() * frases.length)];
            // Recompensa aleatoria pequeña
            if (Math.random() > 0.85) {
                playerState.coins += 10;
                showDialogue("¡Mira debajo de la almohada! 10 monedas para ti.");
            } else {
                showDialogue(fraseRandom);
            }
        }
        
        saveProgress();
        updateHUD();
    } else {
        showDialogue("Estoy muy cansada... dejemos de jugar y descansemos un poco. (Energía insuficiente)");
    }
});

// 7. Sincronización de Cámaras (Efecto de Inmersión)
const roomModel = document.getElementById('room-model');
const waifuModel = document.getElementById('waifu-placeholder');

roomModel.addEventListener('camera-change', () => {
    // Obtenemos el giro de la habitación y se lo aplicamos al personaje
    // Así ambos modelos rotan de forma sincronizada al arrastrar el ratón
    const roomOrbit = roomModel.getCameraOrbit();
    waifuModel.cameraOrbit = `${roomOrbit.theta}rad auto auto`;
});

// Arrancar el sistema cuando carga la página
window.onload = loadProgress;