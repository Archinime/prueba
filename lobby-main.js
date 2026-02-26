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
let touchAnimReq;
let isTouching = false;
let targetTheta = 0;
let currentTheta = 0;
const MAX_ANGLE = 28; // grados máximo de giro

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
    const roomDistance = isMobile ? '2.2m' : '2.8m';
    // MODIFICADO: la distancia del personaje ahora es la misma en móvil que en PC (3.3m)
    const waifuDistance = isMobile ? '3.3m' : '3.3m'; // Antes era '2.7m' en móvil
    return { roomDistance, waifuDistance, isMobile };
}

function updateCameraSettings() {
    const { roomDistance, waifuDistance, isMobile } = getDistances();

    // Aplicar a todos los modelos de fondo
    backgroundModels.forEach(model => {
        if (isMobile) {
            // En móvil permitimos el rango completo pero controlaremos el movimiento manualmente
            model.minCameraOrbit = `-35deg 70deg ${roomDistance}`;
            model.maxCameraOrbit = `35deg 70deg ${roomDistance}`;
            if (!isWiggling && !isTouching) model.cameraOrbit = `0deg 70deg ${roomDistance}`;
        } else {
            // En PC bloqueamos la rotación (solo 0deg)
            model.minCameraOrbit = `0deg 70deg ${roomDistance}`;
            model.maxCameraOrbit = `0deg 70deg ${roomDistance}`;
            model.cameraOrbit = `0deg 70deg ${roomDistance}`;
        }
    });

    if (!isWiggling && !isTouching) {
        waifuModel.cameraOrbit = `0deg 75deg ${waifuDistance}`;
    }
}

// --- ANIMACIÓN DE INDICACIÓN AUTOMÁTICA (10 SEGUNDOS, solo en móvil) ---
function startCustomWiggle() {
    if (window.innerWidth > 768) return;
    const { roomDistance, waifuDistance } = getDistances();
    const duration = 10000;
    const startTime = performance.now();
    const maxAngle = MAX_ANGLE;

    isWiggling = true;
    function step(currentTime) {
        if (!isWiggling) return;

        const elapsed = currentTime - startTime;
        if (elapsed < duration) {
            const progress = elapsed / duration;
            currentTheta = Math.sin(progress * Math.PI * 2) * maxAngle;
            applyOrbitToAll(currentTheta, 70, roomDistance, waifuDistance);
            wiggleReq = requestAnimationFrame(step);
        } else {
            currentTheta = 0;
            applyOrbitToAll(0, 70, roomDistance, waifuDistance);
            isWiggling = false;
        }
    }
    wiggleReq = requestAnimationFrame(step);
}

// Función para aplicar la misma órbita a todos los modelos
function applyOrbitToAll(thetaDeg, phiDeg, roomDist, waifuDist) {
    backgroundModels.forEach(model => {
        model.cameraOrbit = `${thetaDeg}deg ${phiDeg}deg ${roomDist}`;
    });
    waifuModel.cameraOrbit = `${thetaDeg}deg 75deg ${waifuDist}`;
}

// --- SISTEMA TÁCTIL PARA MÓVILES (reemplaza el arrastre libre) ---
function initTouchControls() {
    if (window.innerWidth > 768) {
        // En PC, habilitamos camera-controls normal
        roomModel.cameraControls = true;
        return;
    }

    // En móvil, desactivamos camera-controls para evitar arrastre libre
    roomModel.cameraControls = false;

    let touchStartX = 0;
    let touchStartY = 0;
    const sensitivity = 0.5; // sensibilidad del deslizamiento

    roomModel.addEventListener('touchstart', (e) => {
        if (isWiggling) {
            // Cancelar wiggle automático si el usuario interactúa
            isWiggling = false;
            cancelAnimationFrame(wiggleReq);
        }
        if (isTouching) return;
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        isTouching = true;
        // Detener cualquier animación táctil previa
        if (touchAnimReq) cancelAnimationFrame(touchAnimReq);
    });

    roomModel.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Evita scroll
        if (!isTouching) return;
        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStartX;
        // Mapear el deslizamiento a un ángulo objetivo (máximo ±MAX_ANGLE)
        targetTheta = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, deltaX * sensitivity));
        // Animar hacia el objetivo
        startTouchAnimation();
    });

    roomModel.addEventListener('touchend', () => {
        if (!isTouching) return;
        isTouching = false;
        // Regresar suavemente a 0
        targetTheta = 0;
        startTouchAnimation();
    });

    roomModel.addEventListener('touchcancel', () => {
        isTouching = false;
        targetTheta = 0;
        startTouchAnimation();
    });
}

function startTouchAnimation() {
    if (touchAnimReq) cancelAnimationFrame(touchAnimReq);
    const { roomDistance, waifuDistance } = getDistances();
    const animStep = () => {
        // Interpolación lineal suave hacia el objetivo
        const diff = targetTheta - currentTheta;
        if (Math.abs(diff) < 0.1) {
            currentTheta = targetTheta;
        } else {
            currentTheta += diff * 0.1; // velocidad de transición
        }
        applyOrbitToAll(currentTheta, 70, roomDistance, waifuDistance);
        if (Math.abs(currentTheta - targetTheta) > 0.01) {
            touchAnimReq = requestAnimationFrame(animStep);
        } else {
            touchAnimReq = null;
        }
    };
    touchAnimReq = requestAnimationFrame(animStep);
}

// Detener wiggle si el usuario interactúa
roomModel.addEventListener('pointerdown', () => {
    if (window.innerWidth > 768) return; // solo en móvil manejamos el touch aparte
    isWiggling = false;
    cancelAnimationFrame(wiggleReq);
});

window.addEventListener('resize', () => {
    updateCameraSettings();
    // Reiniciar wiggle solo si no está tocando
    if (!isTouching && !isWiggling && window.innerWidth <= 768) {
        startCustomWiggle();
    }
});

// 3. Sincronización de cámaras (solo para PC, en móvil la manejamos manual)
roomModel.addEventListener('camera-change', () => {
    if (window.innerWidth <= 768) return; // en móvil no usamos este evento
    if (isWiggling) return;

    const roomOrbit = roomModel.getCameraOrbit();
    const { roomDistance, waifuDistance } = getDistances();

    cortinasModel.cameraOrbit = `${roomOrbit.theta}rad ${roomOrbit.phi}rad ${roomDistance}`;
    pisoModel.cameraOrbit = `${roomOrbit.theta}rad ${roomOrbit.phi}rad ${roomDistance}`;
    waifuModel.cameraOrbit = `${roomOrbit.theta}rad 75deg ${waifuDistance}`;
});

// 4. SISTEMA CLIMÁTICO DINÁMICO
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
    initTouchControls(); // Inicializar controles táctiles para móvil
    if (window.innerWidth <= 768) {
        startCustomWiggle(); // Wiggle automático solo en móvil
    }
    initDynamicWeather();

    setTimeout(() => {
        showDialogue("¡Bienvenido de nuevo! Me alegra mucho verte por aquí.");
    }, 1500);
};