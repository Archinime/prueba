// 1. Sistema de Diálogos
let dialogueTimeout;

function showDialogue(text) {
    const box = document.getElementById('dialogue-box');
    const textElement = document.getElementById('dialogue-text');
    textElement.innerHTML = text; // Permite usar <br>
    box.classList.remove('hidden');

    // Ocultar el diálogo después de 5 segundos
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
    // Si es móvil, la alejamos a 4.8m. Si es PC, mantenemos los 3.5m originales.
    const distance = isMobile ? '4.8m' : '3.5m'; 

    if (isMobile) {
        // En móvil habilitamos el giro libre
        roomModel.minCameraOrbit = `-35deg 70deg ${distance}`;
        roomModel.maxCameraOrbit = `35deg 70deg ${distance}`;
        // Centrarla si no se está ejecutando la animación inicial
        if(!isWiggling) roomModel.cameraOrbit = `0deg 70deg ${distance}`;
    } else {
        // En PC bloqueamos completamente la rotación limitando el giro a 0deg
        roomModel.minCameraOrbit = `0deg 70deg ${distance}`;
        roomModel.maxCameraOrbit = `0deg 70deg ${distance}`;
        roomModel.cameraOrbit = `0deg 70deg ${distance}`;
    }
    
    // Ajustar también la waifu a la nueva distancia
    if(!isWiggling) waifuModel.cameraOrbit = `0deg 75deg ${distance}`;
}

// --- ANIMACIÓN DE INDICACIÓN (10 SEGUNDOS) ---
function startCustomWiggle() {
    if (window.innerWidth > 768) return; // Solo ejecutar la animación en móviles
    
    const duration = 10000; // 10 segundos exactos
    const startTime = performance.now();
    const maxAngle = 28; // Rota un poco más (28 grados)
    const distance = '4.8m'; // Distancia fija para móvil durante animación
    
    isWiggling = true;

    function step(currentTime) {
        if (!isWiggling) return; // Se detiene si el usuario toca la pantalla
        
        const elapsed = currentTime - startTime;
        if (elapsed < duration) {
            const progress = elapsed / duration;
            // Movimiento fluido de onda: Centro -> Izquierda -> Derecha -> Centro
            const currentTheta = Math.sin(progress * Math.PI * 2) * maxAngle;
            
            roomModel.cameraOrbit = `${currentTheta}deg 70deg ${distance}`;
            waifuModel.cameraOrbit = `${currentTheta}deg 75deg ${distance}`; // Sincroniza la waifu
            
            wiggleReq = requestAnimationFrame(step);
        } else {
            // Regresa al centro exacto al terminar los 10 segundos
            roomModel.cameraOrbit = `0deg 70deg ${distance}`;
            waifuModel.cameraOrbit = `0deg 75deg ${distance}`;
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
    const distance = isMobile ? '4.8m' : '3.5m'; // Mantenemos las distancias adaptadas
    
    // Aplicamos el giro a la waifu conservando su distancia
    waifuModel.cameraOrbit = `${roomOrbit.theta}rad auto ${distance}`;
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