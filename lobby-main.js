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
const camaModel = document.getElementById('cama-model');           // NUEVO
const alfombraModel = document.getElementById('alfombra-model');   // NUEVO
const weatherModel = document.getElementById('weather-model');     // NUEVO (clima)
const waifuModel = document.getElementById('waifu-placeholder');

let wiggleReq;
let isWiggling = false;
let touchAnimReq;
let isTouching = false;
let targetTheta = 0;
let currentTheta = 0;
const MAX_ANGLE = 28; // grados máximo de giro

// Lista de todos los modelos de fondo (incluyendo los nuevos) para sincronizar
const backgroundModels = [
    roomModel, 
    cortinasModel, 
    pisoModel, 
    camaModel, 
    alfombraModel,
    weatherModel
];

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
function getSettings() {
    const isMobile = window.innerWidth <= 768;
    return {
        isMobile,
        roomDistance: isMobile ? '2.2m' : '2.8m',
        waifuDistance: isMobile ? '6.0m' : '5.5m', // Móvil más lejos
        waifuScale: isMobile ? 0.7 : 0.8,          // Móvil más pequeño
        waifuTargetY: '0.7m',                       // Punto de mira constante
        waifuPhi: 60                                 // Ángulo vertical
    };
}

function applySettings() {
    const settings = getSettings();
    
    // Ajustar escala del personaje
    waifuModel.scale = `${settings.waifuScale} ${settings.waifuScale} ${settings.waifuScale}`;
    
    // Aplicar a todos los modelos de fondo
    backgroundModels.forEach(model => {
        if (settings.isMobile) {
            model.minCameraOrbit = `-35deg 70deg ${settings.roomDistance}`;
            model.maxCameraOrbit = `35deg 70deg ${settings.roomDistance}`;
            if (!isWiggling && !isTouching) model.cameraOrbit = `${currentTheta}deg 70deg ${settings.roomDistance}`;
        } else {
            model.minCameraOrbit = `0deg 70deg ${settings.roomDistance}`;
            model.maxCameraOrbit = `0deg 70deg ${settings.roomDistance}`;
            model.cameraOrbit = `0deg 70deg ${settings.roomDistance}`;
        }
    });

    if (!isWiggling && !isTouching) {
        waifuModel.cameraOrbit = `${currentTheta}deg ${settings.waifuPhi}deg ${settings.waifuDistance}`;
    }
}

// --- ANIMACIÓN DE INDICACIÓN AUTOMÁTICA (10 SEGUNDOS, solo en móvil) ---
function startCustomWiggle() {
    if (window.innerWidth > 768) return;
    const settings = getSettings();
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
            applyOrbitToAll(currentTheta, 70, settings.waifuPhi, settings.roomDistance, settings.waifuDistance);
            wiggleReq = requestAnimationFrame(step);
        } else {
            currentTheta = 0;
            applyOrbitToAll(0, 70, settings.waifuPhi, settings.roomDistance, settings.waifuDistance);
            isWiggling = false;
        }
    }
    wiggleReq = requestAnimationFrame(step);
}

// Función para aplicar la misma órbita a todos los modelos
function applyOrbitToAll(thetaDeg, roomPhiDeg, waifuPhiDeg, roomDist, waifuDist) {
    backgroundModels.forEach(model => {
        model.cameraOrbit = `${thetaDeg}deg ${roomPhiDeg}deg ${roomDist}`;
    });
    waifuModel.cameraOrbit = `${thetaDeg}deg ${waifuPhiDeg}deg ${waifuDist}`;
}

// --- SISTEMA TÁCTIL PARA MÓVILES (deslizamiento libre sin retorno) ---
function initTouchControls() {
    if (window.innerWidth > 768) {
        // En PC, habilitamos camera-controls normal
        roomModel.cameraControls = true;
        return;
    }

    // En móvil, desactivamos camera-controls para evitar arrastre libre
    roomModel.cameraControls = false;

    let touchStartX = 0;
    const sensitivity = 0.5; // sensibilidad del deslizamiento

    roomModel.addEventListener('touchstart', (e) => {
        if (isWiggling) {
            isWiggling = false;
            cancelAnimationFrame(wiggleReq);
        }
        if (isTouching) return;
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        isTouching = true;
        if (touchAnimReq) cancelAnimationFrame(touchAnimReq);
    });

    roomModel.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!isTouching) return;
        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStartX;
        targetTheta = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, deltaX * sensitivity));
        startTouchAnimation();
    });

    roomModel.addEventListener('touchend', () => {
        if (!isTouching) return;
        isTouching = false;
        // No regresamos a 0
    });

    roomModel.addEventListener('touchcancel', () => {
        isTouching = false;
    });
}

function startTouchAnimation() {
    if (touchAnimReq) cancelAnimationFrame(touchAnimReq);
    const settings = getSettings();
    const animStep = () => {
        const diff = targetTheta - currentTheta;
        if (Math.abs(diff) < 0.1) {
            currentTheta = targetTheta;
        } else {
            currentTheta += diff * 0.1;
        }
        applyOrbitToAll(currentTheta, 70, settings.waifuPhi, settings.roomDistance, settings.waifuDistance);
        if (Math.abs(currentTheta - targetTheta) > 0.01) {
            touchAnimReq = requestAnimationFrame(animStep);
        } else {
            touchAnimReq = null;
        }
    };
    touchAnimReq = requestAnimationFrame(animStep);
}

// Sincronización para PC
roomModel.addEventListener('camera-change', () => {
    if (window.innerWidth <= 768) return; // en móvil no usamos este evento
    if (isWiggling) return;

    const roomOrbit = roomModel.getCameraOrbit();
    const settings = getSettings();

    // Aplicar a todos los modelos de fondo (excepto roomModel, pero no importa)
    backgroundModels.forEach(model => {
        if (model !== roomModel) { // Opcional: evitar asignar a roomModel ya que él mismo originó el cambio
            model.cameraOrbit = `${roomOrbit.theta}rad ${roomOrbit.phi}rad ${settings.roomDistance}`;
        }
    });
    waifuModel.cameraOrbit = `${roomOrbit.theta}rad ${settings.waifuPhi}deg ${settings.waifuDistance}`;
});

window.addEventListener('resize', () => {
    applySettings();
    if (!isTouching && !isWiggling && window.innerWidth <= 768) {
        startCustomWiggle();
    }
});

// --- NUEVO SISTEMA CLIMÁTICO CON OBJETOS 3D ---
function getWeatherFile(wmoCode) {
    // Según documentación de Open-Meteo (https://open-meteo.com/en/docs)
    if (wmoCode === 0) return 'soleado.glb';               // Despejado
    if (wmoCode === 1) return 'principalmente_soleado.glb'; // Principalmente despejado
    if (wmoCode === 2) return 'parcialmente_nublado.glb';   // Parcialmente nublado
    if (wmoCode === 3) return 'nublado.glb';                // Nublado
    if (wmoCode === 45 || wmoCode === 48) return 'neblina.glb'; // Niebla
    if (wmoCode >= 51 && wmoCode <= 55) return 'llovizna.glb';   // Llovizna
    if (wmoCode >= 56 && wmoCode <= 57) return 'llovizna_helada.glb';
    if (wmoCode >= 61 && wmoCode <= 65) return 'lluvia.glb';      // Lluvia
    if (wmoCode >= 66 && wmoCode <= 67) return 'lluvia_helada.glb';
    if (wmoCode >= 71 && wmoCode <= 75) return 'nevada.glb';       // Nevada
    if (wmoCode === 76) return 'granizo.glb';                      // Granizo
    if (wmoCode >= 77 && wmoCode <= 79) return 'nevasca.glb';      // Nevada intensa
    if (wmoCode >= 80 && wmoCode <= 82) return 'chubascos.glb';    // Chubascos
    if (wmoCode >= 85 && wmoCode <= 86) return 'chubascos_nieve.glb';
    if (wmoCode === 95) return 'tormenta.glb';                     // Tormenta
    if (wmoCode >= 96 && wmoCode <= 99) return 'tormenta_granizo.glb'; // Tormenta con granizo
    return 'soleado.glb'; // fallback
}

function initDynamicWeather() {
    const weatherModel = document.getElementById('weather-model');

    async function fetchWeatherByCoords(lat, lon) {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            const data = await response.json();
            const code = data.current_weather.weathercode;
            const file = getWeatherFile(code);
            weatherModel.src = file;
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
    applySettings();
    initTouchControls();
    if (window.innerWidth <= 768) {
        startCustomWiggle();
    }
    initDynamicWeather(); // Ahora carga modelos GLB en lugar de videos

    setTimeout(() => {
        showDialogue("¡Bienvenido de nuevo! Me alegra mucho verte por aquí.");
    }, 1500);
};