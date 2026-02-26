// 1. Sistema de Diálogos
let dialogueTimeout;

function showDialogue(text) {
    const box = document.getElementById('dialogue-box');
    const textElement = document.getElementById('dialogue-text');
    
    textElement.innerHTML = text; // Permite usar <br>
    box.classList.remove('hidden');
    
    clearTimeout(dialogueTimeout);
    dialogueTimeout = setTimeout(() => {
        box.classList.add('hidden');
    }, 5000);
}

// 2. Interacción al hacer clic en la pantalla
document.getElementById('room-model').addEventListener('click', () => {
    const frases = [
        "¡Oye, me haces cosquillas!",
        "¿Tienes algo bueno que ver hoy?",
        "Jeje, gracias por la visita.",
        "Deberíamos ver un episodio más... solo uno más."
    ];
    
    const fraseRandom = frases[Math.floor(Math.random() * frases.length)];
    showDialogue(fraseRandom);
});

// 3. Sistema dinámico de la cámara y dispositivo
const roomModel = document.getElementById('room-model');
const waifuModel = document.getElementById('waifu-placeholder');

let isInteracting = false;
let introAnimation;

function setupCamera() {
    const isMobile = window.innerWidth <= 768; // Detectar si es un móvil
    const maxAngle = 50; // Se aumentó el rango de rotación (antes era 30)

    if (isMobile) {
        // MÓVILES: Activar controles y definir la animación de indicación
        roomModel.setAttribute('camera-controls', 'true');
        roomModel.minCameraOrbit = `-${maxAngle}deg 70deg 3.5m`;
        roomModel.maxCameraOrbit = `${maxAngle}deg 70deg 3.5m`;

        const cycleDuration = 10000; // 10 segundos de animación
        const startTime = Date.now();

        // Función que mueve la cámara de izquierda a derecha suavemente
        function animateCamera() {
            if (isInteracting) return; // Si el jugador toca la pantalla, se cancela

            const elapsed = Date.now() - startTime;
            // Ecuación seno para hacer el movimiento de "Péndulo"
            const currentAngle = Math.sin((elapsed / cycleDuration) * Math.PI * 2) * maxAngle;
            
            roomModel.cameraOrbit = `${currentAngle}deg 70deg 3.5m`;
            introAnimation = requestAnimationFrame(animateCamera);
        }

        // Iniciar la animación
        animateCamera();

        // Detener la animación cuando el jugador toque el modelo (para devolver el control)
        roomModel.addEventListener('pointerdown', () => {
            isInteracting = true;
            cancelAnimationFrame(introAnimation);
        }, { once: true });

    } else {
        // PC: Bloquear controles (no se mueve ni a la izquierda ni a la derecha)
        roomModel.removeAttribute('camera-controls');
        roomModel.cameraOrbit = `0deg 70deg 3.5m`;
    }
}

// 4. Sincronización de Cámaras entre Habitación y Personaje
roomModel.addEventListener('camera-change', () => {
    const roomOrbit = roomModel.getCameraOrbit();
    waifuModel.cameraOrbit = `${roomOrbit.theta}rad auto 3.5m`;
});

// 5. Arranque inicial
window.onload = () => {
    setupCamera(); // Aplica las reglas dependiendo de si es PC o Móvil

    setTimeout(() => {
        showDialogue("¡Bienvenido de nuevo! Me alegra mucho verte por aquí.");
    }, 1500);
};