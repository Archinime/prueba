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
    
    // Mostrar saludo inicial después de 1 segundo
    setTimeout(() => {
        showDialogue("¡Bienvenido de nuevo! Me alegra mucho verte por aquí.");
    }, 1000);
}

// 3. Guardar progreso
function saveProgress() {
    localStorage.setItem('archinimeUserData', JSON.stringify(playerState));
}

// 4. Actualizar la interfaz
function updateHUD() {
    document.getElementById('coins-val').innerText = playerState.coins;
    document.getElementById('energy-val').innerText = playerState.energy;
    document.getElementById('level').innerText = `Nivel: ${playerState.level}`;
    document.getElementById('affinity-val').innerText = playerState.affinity;
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

// 6. Interacción básica con el personaje (Lunari)
document.getElementById('waifu-placeholder').addEventListener('click', () => {
    if (playerState.energy >= 5) {
        playerState.affinity += 1;
        playerState.energy -= 5;
        
        // Diálogos aleatorios al tocarla
        const frases = [
            "¡Oye, me haces cosquillas!",
            "¿Tienes algo bueno que ver hoy?",
            "Jeje, gracias por la visita.",
            "Deberíamos ver un episodio más... solo uno más."
        ];
        const fraseRandom = frases[Math.floor(Math.random() * frases.length)];
        
        // Simulación de pequeña recompensa aleatoria
        if (Math.random() > 0.8) {
            playerState.coins += 10;
            showDialogue("¡Mira lo que encontré! 10 monedas para ti.");
        } else {
            showDialogue(fraseRandom);
        }
        
        saveProgress();
        updateHUD();
    } else {
        showDialogue("Estoy muy cansada... dejemos de jugar y descansemos un poco. (Energía insuficiente)");
    }
});

// Arrancar el sistema cuando carga la página
window.onload = loadProgress;