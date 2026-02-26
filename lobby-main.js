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
    // En PC a 3.5m, en móviles Hacemos ZOOM IN a la habitación (2.2m) para cortar los bordes delanteros
    const roomDistance = isMobile ? '2.2m' : '3.5m';
    
    // Mantenemos a la chica en buena proporción respecto al zoom
    const waifuDistance = isMobile ? '3.5m' : '3.5m'; 

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
    
    if(!isWiggling) waifuModel.cameraOrbit = `0deg 75deg ${waifuDistance}`;
}

// --- ANIMACIÓN DE INDICACIÓN (10 SEGUNDOS) ---
function startCustomWiggle() {
    if (window.innerWidth > 768) return;
    const duration = 10000; 
    const startTime = performance.now();
    const maxAngle = 28; 
    
    const roomDistance = '2.2m'; // Distancia con zoom móvil
    const waifuDistance = '3.5m'; 
    
    isWiggling = true;
    function step(currentTime) {
        if (!isWiggling) return; 
        
        const elapsed = currentTime - startTime;
        if (elapsed < duration) {
            const progress = elapsed / duration;
            const currentTheta = Math.sin(progress * Math.PI * 2) * maxAngle;
            roomModel.cameraOrbit = `${currentTheta}deg 70deg ${roomDistance}`;
            waifuModel.cameraOrbit = `${currentTheta}deg 75deg ${waifuDistance}`;
            wiggleReq = requestAnimationFrame(step);
        } else {
            roomModel.cameraOrbit = `0deg 70deg ${roomDistance}`;
            waifuModel.cameraOrbit = `0deg 75deg ${waifuDistance}`;
            isWiggling = false;
        }
    }
    
    wiggleReq = requestAnimationFrame(step);
}

roomModel.addEventListener('pointerdown', () => {
    isWiggling = false;
    cancelAnimationFrame(wiggleReq);
});

window.addEventListener('resize', updateCameraSettings);

// 3. Sincronización de Cámaras (Efecto de Inmersión manual del usuario)
roomModel.addEventListener('camera-change', () => {
    if (isWiggling) return; 
    
    const roomOrbit = roomModel.getCameraOrbit();
    const isMobile = window.innerWidth <= 768;
    const waifuDistance = isMobile ? '3.5m' : '3.5m'; 
    
    waifuModel.cameraOrbit = `${roomOrbit.theta}rad auto ${waifuDistance}`;
});

// 5. SISTEMA CLIMÁTICO DINÁMICO (Mejorado con respaldo IP)
// Ahora el elemento video está dentro de #window-video-mask y se actualiza aquí.
function initDynamicWeather() {
    const videoElement = document.getElementById('weather-video');

    // Asigna el video dependiendo de TODOS los códigos WMO de Open-Meteo
    function setWeatherVideo(wmoCode) {
        let videoFile = 'soleado.mp4'; // Por defecto
        
        if (wmoCode === 0) { videoFile = 'soleado.mp4'; } // Despejado
        else if (wmoCode >= 1 && wmoCode <= 3) { videoFile = 'nublado.mp4'; } // Mayormente despejado a nublado
        else if (wmoCode === 45 || wmoCode === 48) { videoFile = 'neblina.mp4'; } // Niebla y niebla escarchada
        else if ((wmoCode >= 51 && wmoCode <= 67) || (wmoCode >= 80 && wmoCode <= 82)) { videoFile = 'lluvioso.mp4'; } // Llovizna y Lluvia
        else if ((wmoCode >= 71 && wmoCode <= 77) || wmoCode === 85 || wmoCode === 86) { videoFile = 'nevado.mp4'; } // Nieve y granizo
        else if (wmoCode >= 95 && wmoCode <= 99) { videoFile = 'tormenta.mp4'; } // Tormentas
        
        // Evitar que el video se reinicie si ya tiene el source correcto asignado
        // Usamos currentSrc o src y comparamos el nombre de archivo al final.
        const currentName = (videoElement.currentSrc || videoElement.src || '').split('/').pop();
        if (currentName !== videoFile) {
            videoElement.src = videoFile;
            // intentar cargar y reproducir sin bloquear (capturar promesa)
            videoElement.load();
            videoElement.play().catch(() => {/* auto-play puede fallar en algunos navegadores */});
        }
    }

    // APLICAMOS CLIMA POR DEFECTO INMEDIATAMENTE
    setWeatherVideo(0);

    // Función genérica para consultar Open-Meteo con coordenadas
    async function fetchWeatherByCoords(lat, lon) {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            const data = await response.json();
            if (data && data.current_weather && typeof data.current_weather.weathercode !== 'undefined') {
                setWeatherVideo(data.current_weather.weathercode);
            }
        } catch (error) {
            console.error("Error API Clima, manteniendo el clima por defecto.", error);
        }
    }

    // Función de respaldo: Obtiene coordenadas por la IP pública del usuario
    async function fetchWeatherByIP() {
        try {
            console.log("Intentando obtener ubicación por IP...");
            // Usamos geojs.io que es gratuita y no requiere API Key
            const ipResponse = await fetch('https://get.geojs.io/v1/ip/geo.json');
            const ipData = await ipResponse.json();
            if (ipData && ipData.latitude && ipData.longitude) {
                await fetchWeatherByCoords(ipData.latitude, ipData.longitude);
            }
        } catch (error) {
            console.error("Error al obtener ubicación por IP, se mantendrá el clima predeterminado.", error);
        }
    }

    // Lógica de permisos de ubicación
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Si el usuario acepta, usamos su GPS (más preciso)
                fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                // Si el usuario rechaza o hay error, usamos la IP (Plan B)
                console.warn("Geolocalización bloqueada/error. Usando respaldo por IP.", error);
                fetchWeatherByIP();
            }
        );
    } else {
        // Si el navegador de plano no soporta geolocalización
        fetchWeatherByIP();
    }
}

// 4. Inicialización al cargar la página
window.onload = () => {
    updateCameraSettings(); 
    startCustomWiggle(); 
    initDynamicWeather(); // Llama a la API de clima y su respaldo
    
    setTimeout(() => {
        showDialogue("¡Bienvenido de nuevo! Me alegra mucho verte por aquí.");
    }, 1500);
};