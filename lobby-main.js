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

// --- REFERENCIAS A LOS MODELOS ---
const roomModel = document.getElementById('room-model');       // principal (paredes)
const cortinasModel = document.getElementById('cortinas-model');
const pisoModel = document.getElementById('piso-model');
const waifuModel = document.getElementById('waifu-placeholder');

let wiggleReq;
let isWiggling = false;

// Lista de todos los modelos de fondo para sincronizar
const backgroundModels = [roomModel, cortinasModel, pisoModel];

// 2. Interacción al hacer clic en la habitación (solo en el modelo principal)
roomModel.addEventListener('click', () => {
    const frases = [
        "¡Oye, me haces cosquillas!",
        "¿Tienes algo bueno que ver hoy?",
        "Jeje, gracias por la visita.",
        "Deberíamos ver un episodio más... solo uno más."
    ];
    const fraseRandom = frases[Math.floor(Math.random() * frases.length)];
    showDialogue(fraseRandom);
});

// --- CONFIGURACIÓN RESPONSIVA (PC vs Móvil) ---
function getDistances() {
    const isMobile = window.innerWidth <= 768;
    // Valores más cercanos para evitar ver bordes
    const roomDistance = isMobile ? '2.2m' : '2.8m';
    const waifuDistance = roomDistance; // Misma distancia para la chica
    return { roomDistance, waifuDistance, isMobile };
}

function updateCameraSettings() {
    const { roomDistance, waifuDistance, isMobile } = getDistances();

    // Aplicar a todos los modelos de fondo
    backgroundModels.forEach(model => {
        if (isMobile) {
            model.minCameraOrbit = `-35deg 70deg ${roomDistance}`;
            model.maxCameraOrbit = `35deg 70deg ${roomDistance}`;
            if (!isWiggling) model.cameraOrbit = `0deg 70deg ${roomDistance}`;
        } else {
            // En PC bloqueamos la rotación (solo 0deg)
            model.minCameraOrbit = `0deg 70deg ${roomDistance}`;
            model.maxCameraOrbit = `0deg 70deg ${roomDistance}`;
            model.cameraOrbit = `0deg 70deg ${roomDistance}`;
        }
    });

    if (!isWiggling) {
        waifuModel.cameraOrbit = `0deg 75deg ${waifuDistance}`;
    }
}

// --- ANIMACIÓN DE INDICACIÓN (10 SEGUNDOS, solo en móvil) ---
function startCustomWiggle() {
    if (window.innerWidth > 768) return;
    const { roomDistance, waifuDistance } = getDistances();
    const duration = 10000;
    const startTime = performance.now();
    const maxAngle = 28;

    isWiggling = true;
    function step(currentTime) {
        if (!isWiggling) return;

        const elapsed = currentTime - startTime;
        if (elapsed < duration) {
            const progress = elapsed / duration;
            const currentTheta = Math.sin(progress * Math.PI * 2) * maxAngle;
            // Aplicar a todos los modelos de fondo
            backgroundModels.forEach(model => {
                model.cameraOrbit = `${currentTheta}deg 70deg ${roomDistance}`;
            });
            waifuModel.cameraOrbit = `${currentTheta}deg 75deg ${waifuDistance}`;
            wiggleReq = requestAnimationFrame(step);
        } else {
            backgroundModels.forEach(model => {
                model.cameraOrbit = `0deg 70deg ${roomDistance}`;
            });
            waifuModel.cameraOrbit = `0deg 75deg ${waifuDistance}`;
            isWiggling = false;
        }
    }
    wiggleReq = requestAnimationFrame(step);
}

// Detener wiggle si el usuario interactúa
roomModel.addEventListener('pointerdown', () => {
    isWiggling = false;
    cancelAnimationFrame(wiggleReq);
});

window.addEventListener('resize', updateCameraSettings);

// 3. Sincronización de cámaras: cuando el modelo principal se mueve, los otros lo siguen al instante
roomModel.addEventListener('camera-change', () => {
    if (isWiggling) return;

    const roomOrbit = roomModel.getCameraOrbit();
    const { roomDistance, waifuDistance } = getDistances();

    // Copiar la órbita completa (theta, phi) a los modelos secundarios
    cortinasModel.cameraOrbit = `${roomOrbit.theta}rad ${roomOrbit.phi}rad ${roomDistance}`;
    pisoModel.cameraOrbit = `${roomOrbit.theta}rad ${roomOrbit.phi}rad ${roomDistance}`;
    // La waifu mantiene su propia elevación (75deg) pero sigue el giro horizontal
    waifuModel.cameraOrbit = `${roomOrbit.theta}rad 75deg ${waifuDistance}`;
});

// 4. SISTEMA CLIMÁTICO DINÁMICO (sin cambios)
function initDynamicWeather() {
    const videoElement = document.getElementById('weather-video');

    function setWeatherVideo(wmoCode) {
        let videoFile = 'soleado.mp4';
        if (wmoCode === 0) { videoFile = 'soleado.mp4'; }
        else if (wmoCode >= 1 && wmoCode <= 3) { videoFile = 'nublado.mp4'; }
        else if (wmoCode === 45 || wmoCode === 48) { videoFile = 'neblina.mp4'; }
        else if ((wmoCode >= 51 && wmoCode <= 67) || (wmoCode >= 80 && wmoCode <= 82)) { videoFile = 'lluvioso.mp4'; }
        else if ((wmoCode >= 71 && wmoCode <= 77) || wmoCode === 85 || wmoCode === 86) { videoFile = 'nevado.mp4'; }
        else if (wmoCode >= 95 && wmoCode <= 99) { videoFile = 'tormenta.mp4'; }

        if (!videoElement.src.endsWith(videoFile)) {
            videoElement.src = videoFile;
        }
    }

    setWeatherVideo(0);

    async function fetchWeatherByCoords(lat, lon) {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            const data = await response.json();
            setWeatherVideo(data.current_weather.weathercode);
        } catch (error) {
            console.error("Error API Clima", error);
        }
    }

    async function fetchWeatherByIP() {
        try {
            const ipResponse = await fetch('https://get.geojs.io/v1/ip/geo.json');
            const ipData = await ipResponse.json();
            await fetchWeatherByCoords(ipData.latitude, ipData.longitude);
        } catch (error) {
            console.error("Error IP", error);
        }
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                fetchWeatherByIP();
            }
        );
    } else {
        fetchWeatherByIP();
    }
}

// 5. Inicialización
window.onload = () => {
    updateCameraSettings();
    startCustomWiggle();
    initDynamicWeather();

    setTimeout(() => {
        showDialogue("¡Bienvenido de nuevo! Me alegra mucho verte por aquí.");
    }, 1500);
};