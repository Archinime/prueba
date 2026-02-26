// 1. Sistema de Diálogos
let dialogueTimeout;

function showDialogue(text) {
    const box = document.getElementById('dialogue-box');
    const textElement = document.getElementById('dialogue-text');
    textElement.innerHTML = text; 
    box.classList.remove('hidden');

    clearTimeout(dialogueTimeout);
    dialogueTimeout = setTimeout(() => {
        box.classList.add('hidden');
    }, 5000);
}

// 2. Interacción al hacer clic en la pantalla (Habitación)
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

// --- VARIABLES Y REFERENCIAS ---
const roomModel = document.getElementById('room-model');
const waifuModel = document.getElementById('waifu-placeholder');
let wiggleReq;
let isWiggling = false;

// --- CONFIGURACIÓN RESPONSIVA (PC vs Móvil) ---
function updateCameraSettings() {
    const isMobile = window.innerWidth <= 768;
    
    // IMPORTANTE: La habitación se mantiene siempre en 3.5m para NO ver los límites/bordes
    const roomDistance = '3.5m'; 
    // Alejamos SOLO a la chica en móviles (a 4.6m) para que retroceda en la pantalla
    const waifuDistance = isMobile ? '4.6m' : '3.5m'; 

    if (isMobile) {
        roomModel.minCameraOrbit = `-35deg 70deg ${roomDistance}`;
        roomModel.maxCameraOrbit = `35deg 70deg ${roomDistance}`;
        if(!isWiggling) roomModel.cameraOrbit = `0deg 70deg ${roomDistance}`;
    } else {
        // En PC bloqueamos completamente la rotación limitando el giro a 0deg
        roomModel.minCameraOrbit = `0deg 70deg ${roomDistance}`;
        roomModel.maxCameraOrbit = `0deg 70deg ${roomDistance}`;
        roomModel.cameraOrbit = `0deg 70deg ${roomDistance}`;
    }
    
    // Ajustar a la waifu empujándola hacia atrás
    if(!isWiggling) waifuModel.cameraOrbit = `0deg 75deg ${waifuDistance}`;
}

// --- ANIMACIÓN DE INDICACIÓN (10 SEGUNDOS) ---
function startCustomWiggle() {
    if (window.innerWidth > 768) return; // Solo ejecutar la animación en móviles
    
    const duration = 10000; // 10 segundos exactos
    const startTime = performance.now();
    const maxAngle = 28; 
    
    const roomDistance = '3.5m'; 
    const waifuDistance = '4.6m'; 
    
    isWiggling = true;

    function step(currentTime) {
        if (!isWiggling) return; // Se detiene si el usuario toca la pantalla
        
        const elapsed = currentTime - startTime;
        if (elapsed < duration) {
            const progress = elapsed / duration;
            // Movimiento fluido de onda
            const currentTheta = Math.sin(progress * Math.PI * 2) * maxAngle;
            
            roomModel.cameraOrbit = `${currentTheta}deg 70deg ${roomDistance}`;
            waifuModel.cameraOrbit = `${currentTheta}deg 75deg ${waifuDistance}`; 
            
            wiggleReq = requestAnimationFrame(step);
        } else {
            // Regresa al centro exacto al terminar
            roomModel.cameraOrbit = `0deg 70deg ${roomDistance}`;
            waifuModel.cameraOrbit = `0deg 75deg ${waifuDistance}`;
            isWiggling = false;
        }
    }
    
    wiggleReq = requestAnimationFrame(step);
}

// Detener la animación si el usuario decide mover la pantalla por sí mismo
roomModel.addEventListener('pointerdown', () => {
    isWiggling = false;
    cancelAnimationFrame(wiggleReq);
});

// Reajustar todo si se gira el celular o se cambia el tamaño de la ventana
window.addEventListener('resize', updateCameraSettings);

// 3. Sincronización de Cámaras (Efecto de Inmersión manual del usuario)
roomModel.addEventListener('camera-change', () => {
    if (isWiggling) return; // No interferir mientras la animación de 10s está activa
    
    const roomOrbit = roomModel.getCameraOrbit();
    const isMobile = window.innerWidth <= 768;
    const waifuDistance = isMobile ? '4.6m' : '3.5m'; 
    
    // Aplicamos el giro a la waifu conservando su propia distancia para no acercarla de golpe
    waifuModel.cameraOrbit = `${roomOrbit.theta}rad auto ${waifuDistance}`;
});

// 4. Inicialización y saludo al cargar la página
window.onload = () => {
    updateCameraSettings(); // Aplicar el bloqueo en PC y distancias
    startCustomWiggle();    // Iniciar la animación suave en móviles
    
    // Mostrar saludo inicial después de 1.5 segundos
    setTimeout(() => {
        showDialogue("¡Bienvenido de nuevo! Me alegra mucho verte por aquí.");
    }, 1500);
};