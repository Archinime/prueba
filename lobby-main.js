import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Elementos DOM ---
const videoElement = document.getElementById('weather-video');
const dialogueBox = document.getElementById('dialogue-box');
const dialogueText = document.getElementById('dialogue-text');

// --- Configuración de la escena Three.js ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = null; // transparente para ver el video

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.5, 3.5); // posición inicial similar a model-viewer

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true; // para sombras si los modelos las soportan
container.appendChild(renderer.domElement);

// --- Luces ---
const ambientLight = new THREE.AmbientLight(0x404060);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(2, 5, 3);
dirLight.castShadow = true;
dirLight.receiveShadow = true;
scene.add(dirLight);

const fillLight = new THREE.PointLight(0x4466ff, 0.5);
fillLight.position.set(-2, 2, 2);
scene.add(fillLight);

// --- Controles de cámara (OrbitControls) ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false; // deshabilitamos zoom como en model-viewer
controls.enablePan = false;
controls.maxPolarAngle = Math.PI / 2; // 90 grados
controls.minPolarAngle = Math.PI / 3; // 60 grados
controls.target.set(0, 1, 0);

// Restricciones de órbita (simulando lo que tenía model-viewer)
let isMobile = window.innerWidth <= 768;
if (isMobile) {
    controls.minAzimuthAngle = -Math.PI / 5; // -35 grados
    controls.maxAzimuthAngle = Math.PI / 5;  // 35 grados
} else {
    // En PC, fijamos el ángulo horizontal a 0 (sin rotación)
    controls.minAzimuthAngle = 0;
    controls.maxAzimuthAngle = 0;
}

// --- Cargador de modelos ---
const loader = new GLTFLoader();

// Objeto para guardar los modelos cargados
const models = {
    piso: null,
    paredes: null,
    cama: null,
    lunari: null
};

// Función para cargar un modelo y devolver una promesa
function loadModel(path, position = [0,0,0], rotation = [0,0,0], scale = 1) {
    return new Promise((resolve, reject) => {
        loader.load(
            path,
            (gltf) => {
                const model = gltf.scene;
                model.position.set(position[0], position[1], position[2]);
                model.rotation.set(rotation[0], rotation[1], rotation[2]);
                model.scale.set(scale, scale, scale);
                model.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });
                scene.add(model);
                resolve(model);
            },
            undefined,
            reject
        );
    });
}

// Cargar todos los modelos
Promise.all([
    loadModel('piso.glb', [0, 0, 0]),
    loadModel('paredes.glb', [0, 0, 0]),
    loadModel('cama.glb', [0, 0, 0]),
    loadModel('lunari_saluda.glb', [0, 0.8, 0]) // ajusta posición según tu modelo
]).then(([piso, paredes, cama, lunari]) => {
    models.piso = piso;
    models.paredes = paredes;
    models.cama = cama;
    models.lunari = lunari;

    // Si el personaje tiene animaciones, reproducirlas
    if (lunari.animations && lunari.animations.length) {
        // Aquí puedes usar AnimationMixer si necesitas
        console.log('El personaje tiene animaciones');
    }

    // Iniciar animaciones después de cargar
    startCustomWiggle();
}).catch(error => {
    console.error('Error cargando modelos:', error);
});

// --- Variables para el wiggle ---
let wiggleAnimationId = null;
let isWiggling = false;

function startCustomWiggle() {
    if (window.innerWidth > 768 || isWiggling) return;
    isWiggling = true;
    const duration = 10000; // 10 segundos
    const startTime = performance.now();
    const maxAngle = 0.5; // radianes (~28 grados)

    function animateWiggle(now) {
        const elapsed = (now - startTime) / 1000; // en segundos
        if (elapsed < duration / 1000) {
            const progress = elapsed / (duration / 1000);
            const angle = Math.sin(progress * Math.PI * 2) * maxAngle;
            // Rotamos la cámara alrededor del target
            camera.position.x = Math.sin(angle) * 3.5;
            camera.position.z = Math.cos(angle) * 3.5;
            camera.position.y = 1.5; // altura fija
            controls.target.set(0, 1, 0);
            controls.update();
            wiggleAnimationId = requestAnimationFrame(animateWiggle);
        } else {
            // Volver a la posición original
            camera.position.set(0, 1.5, 3.5);
            controls.target.set(0, 1, 0);
            controls.update();
            isWiggling = false;
        }
    }
    wiggleAnimationId = requestAnimationFrame(animateWiggle);
}

// Cancelar wiggle al interactuar
renderer.domElement.addEventListener('pointerdown', () => {
    if (isWiggling) {
        cancelAnimationFrame(wiggleAnimationId);
        isWiggling = false;
        camera.position.set(0, 1.5, 3.5);
        controls.target.set(0, 1, 0);
        controls.update();
    }
});

// --- Sistema de diálogos ---
let dialogueTimeout;

function showDialogue(text) {
    dialogueText.innerHTML = text;
    dialogueBox.classList.remove('hidden');
    clearTimeout(dialogueTimeout);
    dialogueTimeout = setTimeout(() => {
        dialogueBox.classList.add('hidden');
    }, 5000);
}

// Detectar clics en el canvas (sobre la habitación)
renderer.domElement.addEventListener('click', (event) => {
    // Evitar clics en la UI
    if (event.target === renderer.domElement) {
        const frases = [
            "¡Oye, me haces cosquillas!",
            "¿Tienes algo bueno que ver hoy?",
            "Jeje, gracias por la visita.",
            "Deberíamos ver un episodio más... solo uno más."
        ];
        const fraseRandom = frases[Math.floor(Math.random() * frases.length)];
        showDialogue(fraseRandom);
    }
});

// --- Clima dinámico (igual que antes) ---
function initDynamicWeather() {
    function setWeatherVideo(wmoCode) {
        let videoFile = 'soleado.mp4';
        if (wmoCode === 0) videoFile = 'soleado.mp4';
        else if (wmoCode >= 1 && wmoCode <= 3) videoFile = 'nublado.mp4';
        else if (wmoCode === 45 || wmoCode === 48) videoFile = 'neblina.mp4';
        else if ((wmoCode >= 51 && wmoCode <= 67) || (wmoCode >= 80 && wmoCode <= 82)) videoFile = 'lluvioso.mp4';
        else if ((wmoCode >= 71 && wmoCode <= 77) || wmoCode === 85 || wmoCode === 86) videoFile = 'nevado.mp4';
        else if (wmoCode >= 95 && wmoCode <= 99) videoFile = 'tormenta.mp4';

        if (!videoElement.src.endsWith(videoFile)) {
            videoElement.src = videoFile;
        }
    }

    setWeatherVideo(0); // default

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
            (position) => fetchWeatherByCoords(position.coords.latitude, position.coords.longitude),
            fetchWeatherByIP
        );
    } else {
        fetchWeatherByIP();
    }
}

// --- Responsive: ajustar controles al cambiar tamaño ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    isMobile = window.innerWidth <= 768;
    if (isMobile) {
        controls.minAzimuthAngle = -Math.PI / 5;
        controls.maxAzimuthAngle = Math.PI / 5;
    } else {
        controls.minAzimuthAngle = 0;
        controls.maxAzimuthAngle = 0;
        // Forzar cámara al centro
        camera.position.set(0, 1.5, 3.5);
        controls.target.set(0, 1, 0);
        controls.update();
    }
});

// --- Bucle de animación ---
function animate() {
    requestAnimationFrame(animate);
    controls.update(); // solo necesario si enableDamping = true, pero lo dejamos por si acaso
    renderer.render(scene, camera);
}
animate();

// --- Inicialización ---
window.onload = () => {
    initDynamicWeather();
    setTimeout(() => {
        showDialogue("¡Bienvenido de nuevo! Me alegra mucho verte por aquí.");
    }, 1500);
};