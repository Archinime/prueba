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
// Como la waifu ya no intercepta los clics, usamos el fondo para interactuar
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

// 3. Sincronización de Cámaras (Efecto de Inmersión)
const roomModel = document.getElementById('room-model');
const waifuModel = document.getElementById('waifu-placeholder');

roomModel.addEventListener('camera-change', () => {
    // Obtenemos el giro de la habitación y se lo aplicamos al personaje
    const roomOrbit = roomModel.getCameraOrbit();
    // Forzamos la distancia a 3.5m para que el personaje se mantenga atrás en todo momento
    waifuModel.cameraOrbit = `${roomOrbit.theta}rad auto 3.5m`;
});

// 4. Saludo inicial al cargar la página
window.onload = () => {
    // Mostrar saludo inicial después de 1.5 segundos para dar tiempo a que carguen los modelos
    setTimeout(() => {
        showDialogue("¡Bienvenido de nuevo! Me alegra mucho verte por aquí.");
    }, 1500);
};