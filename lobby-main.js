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
const roomModel = document.getElementById('room-model');
const cortinasModel = document.getElementById('cortinas-model');
const pisoModel = document.getElementById('piso-model');
const waifuModel = document.getElementById('waifu-placeholder');

let wiggleReq;
let isWiggling = false;
let touchAnimReq;
let isTouching = false;
let targetTheta = 0;
let currentTheta = 0;
const MAX_ANGLE = 28;

const backgroundModels = [roomModel, cortinasModel, pisoModel];

// 2. Interacción al hacer clic en la habitación
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

// --- CONFIGURACIÓN RESPONSIVA ---
function getSettings() {
    const isMobile = window.innerWidth <= 768;
    return {
        isMobile,
        roomDistance: isMobile ? '2.2m' : '2.8m',
        waifuDistance: isMobile ? '6.0m' : '5.5m',
        waifuScale: isMobile ? 0.7 : 0.8,
        waifuTargetY: '0.7m',
        waifuPhi: 60
    };
}

function applySettings() {
    const settings = getSettings();
    
    waifuModel.scale = `${settings.waifuScale} ${settings.waifuScale} ${settings.waifuScale}`;
    
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

// --- ANIMACIÓN DE INDICACIÓN AUTOMÁTICA (solo móvil) ---
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

function applyOrbitToAll(thetaDeg, roomPhiDeg, waifuPhiDeg, roomDist, waifuDist) {
    backgroundModels.forEach(model => {
        model.cameraOrbit = `${thetaDeg}deg ${roomPhiDeg}deg ${roomDist}`;
    });
    waifuModel.cameraOrbit = `${thetaDeg}deg ${waifuPhiDeg}deg ${waifuDist}`;
}

// --- SISTEMA TÁCTIL PARA MÓVILES ---
function initTouchControls() {
    if (window.innerWidth > 768) {
        roomModel.cameraControls = true;
        return;
    }

    roomModel.cameraControls = false;

    let touchStartX = 0;
    const sensitivity = 0.5;

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
    if (window.innerWidth <= 768) return;
    if (isWiggling) return;

    const roomOrbit = roomModel.getCameraOrbit();
    const settings = getSettings();

    cortinasModel.cameraOrbit = `${roomOrbit.theta}rad ${roomOrbit.phi}rad ${settings.roomDistance}`;
    pisoModel.cameraOrbit = `${roomOrbit.theta}rad ${roomOrbit.phi}rad ${settings.roomDistance}`;
    waifuModel.cameraOrbit = `${roomOrbit.theta}rad ${settings.waifuPhi}deg ${settings.waifuDistance}`;
});

window.addEventListener('resize', () => {
    applySettings();
    if (!isTouching && !isWiggling && window.innerWidth <= 768) {
        startCustomWiggle();
    }
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

// 5. EDITOR DE MODELOS MEJORADO
function initEditPanel() {
    const toggleBtn = document.getElementById('edit-toggle');
    const panel = document.getElementById('edit-panel');
    const closeBtn = document.getElementById('close-panel');
    const modelSelect = document.getElementById('model-select');
    const disableCameraCheck = document.getElementById('disable-camera');

    // Elementos de entrada
    const posX = document.getElementById('pos-x');
    const posY = document.getElementById('pos-y');
    const posZ = document.getElementById('pos-z');
    const rotX = document.getElementById('rot-x');
    const rotY = document.getElementById('rot-y');
    const rotZ = document.getElementById('rot-z');
    const scaleX = document.getElementById('scale-x');
    const scaleY = document.getElementById('scale-y');
    const scaleZ = document.getElementById('scale-z');

    // Elementos de visualización de valores
    const posXVal = document.getElementById('pos-x-val');
    const posYVal = document.getElementById('pos-y-val');
    const posZVal = document.getElementById('pos-z-val');
    const rotXVal = document.getElementById('rot-x-val');
    const rotYVal = document.getElementById('rot-y-val');
    const rotZVal = document.getElementById('rot-z-val');
    const scaleXVal = document.getElementById('scale-x-val');
    const scaleYVal = document.getElementById('scale-y-val');
    const scaleZVal = document.getElementById('scale-z-val');

    const resetBtn = document.getElementById('reset-transform');

    // Modelos disponibles
    const models = {
        'room-model': roomModel,
        'cortinas-model': cortinasModel,
        'piso-model': pisoModel,
        'waifu-placeholder': waifuModel
    };

    // Estado de camera-controls original
    let originalCameraControls = {};

    // Abrir/cerrar panel
    toggleBtn.addEventListener('click', () => {
        panel.classList.toggle('hidden');
        if (!panel.classList.contains('hidden')) {
            loadCurrentValues();
            // Guardar estado original de camera-controls y desactivar si está marcado
            Object.keys(models).forEach(id => {
                const model = models[id];
                originalCameraControls[id] = model.cameraControls;
                if (disableCameraCheck.checked) {
                    model.cameraControls = false;
                }
            });
        } else {
            // Restaurar camera-controls al cerrar
            Object.keys(models).forEach(id => {
                if (originalCameraControls[id] !== undefined) {
                    models[id].cameraControls = originalCameraControls[id];
                }
            });
        }
    });

    closeBtn.addEventListener('click', () => {
        panel.classList.add('hidden');
        // Restaurar camera-controls
        Object.keys(models).forEach(id => {
            if (originalCameraControls[id] !== undefined) {
                models[id].cameraControls = originalCameraControls[id];
            }
        });
    });

    // Cuando se marca/desmarca la casilla, aplicar o revertir
    disableCameraCheck.addEventListener('change', () => {
        if (!panel.classList.contains('hidden')) {
            Object.keys(models).forEach(id => {
                const model = models[id];
                if (disableCameraCheck.checked) {
                    originalCameraControls[id] = model.cameraControls;
                    model.cameraControls = false;
                } else {
                    model.cameraControls = originalCameraControls[id] || false;
                }
            });
        }
    });

    // Cargar valores actuales del modelo seleccionado
    function loadCurrentValues() {
        const selectedId = modelSelect.value;
        const model = models[selectedId];
        if (!model) return;

        // Leer atributos (o propiedades) actuales
        const pos = model.getAttribute('position') || '0m 0m 0m';
        const rot = model.getAttribute('rotation') || '0deg 0deg 0deg';
        const scale = model.getAttribute('scale') || '1 1 1';

        const posParts = pos.split(' ').map(p => parseFloat(p.replace('m', '')));
        const rotParts = rot.split(' ').map(r => parseFloat(r.replace('deg', '')));
        const scaleParts = scale.split(' ').map(s => parseFloat(s));

        posX.value = posParts[0] || 0;
        posY.value = posParts[1] || 0;
        posZ.value = posParts[2] || 0;

        rotX.value = rotParts[0] || 0;
        rotY.value = rotParts[1] || 0;
        rotZ.value = rotParts[2] || 0;

        scaleX.value = scaleParts[0] || 1;
        scaleY.value = scaleParts[1] || 1;
        scaleZ.value = scaleParts[2] || 1;

        updateValueDisplays();
    }

    // Actualizar los textos que muestran los valores
    function updateValueDisplays() {
        posXVal.textContent = parseFloat(posX.value).toFixed(2);
        posYVal.textContent = parseFloat(posY.value).toFixed(2);
        posZVal.textContent = parseFloat(posZ.value).toFixed(2);
        rotXVal.textContent = parseFloat(rotX.value).toFixed(1);
        rotYVal.textContent = parseFloat(rotY.value).toFixed(1);
        rotZVal.textContent = parseFloat(rotZ.value).toFixed(1);
        scaleXVal.textContent = parseFloat(scaleX.value).toFixed(2);
        scaleYVal.textContent = parseFloat(scaleY.value).toFixed(2);
        scaleZVal.textContent = parseFloat(scaleZ.value).toFixed(2);
    }

    // Aplicar transformación al modelo actual
    function applyTransform() {
        const selectedId = modelSelect.value;
        const model = models[selectedId];
        if (!model) return;

        const posStr = `${posX.value}m ${posY.value}m ${posZ.value}m`;
        const rotStr = `${rotX.value}deg ${rotY.value}deg ${rotZ.value}deg`;
        const scaleStr = `${scaleX.value} ${scaleY.value} ${scaleZ.value}`;

        model.setAttribute('position', posStr);
        model.setAttribute('rotation', rotStr);
        model.setAttribute('scale', scaleStr);

        updateValueDisplays();
    }

    // Event listeners para sliders
    [posX, posY, posZ, rotX, rotY, rotZ, scaleX, scaleY, scaleZ].forEach(input => {
        input.addEventListener('input', applyTransform);
    });

    // Botones de paso (incremento/decremento)
    document.querySelectorAll('.step-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const axis = btn.dataset.axis; // 'pos', 'rot', 'scale'
            const coord = btn.dataset.coord; // 'x', 'y', 'z'
            const dir = parseFloat(btn.dataset.dir); // paso negativo o positivo

            let input;
            if (axis === 'pos') {
                input = document.getElementById(`pos-${coord}`);
            } else if (axis === 'rot') {
                input = document.getElementById(`rot-${coord}`);
            } else if (axis === 'scale') {
                input = document.getElementById(`scale-${coord}`);
            }
            if (input) {
                input.value = parseFloat(input.value) + dir;
                applyTransform();
            }
        });
    });

    // Cambio de modelo
    modelSelect.addEventListener('change', loadCurrentValues);

    // Botón reset
    resetBtn.addEventListener('click', () => {
        posX.value = 0;
        posY.value = 0;
        posZ.value = 0;
        rotX.value = 0;
        rotY.value = 0;
        rotZ.value = 0;
        scaleX.value = 1;
        scaleY.value = 1;
        scaleZ.value = 1;
        applyTransform();
    });

    // Cargar valores iniciales
    loadCurrentValues();
}

// 6. Inicialización
window.onload = () => {
    applySettings();
    initTouchControls();
    if (window.innerWidth <= 768) {
        startCustomWiggle();
    }
    initDynamicWeather();
    initEditPanel();

    setTimeout(() => {
        showDialogue("¡Bienvenido de nuevo! Me alegra mucho verte por aquí.");
    }, 1500);
};