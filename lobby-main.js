import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- CONFIGURACIÓN ESCENA ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('three-container').appendChild(renderer.domElement);

// --- LUCES ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// --- CARGA DE MODELOS (OPCIÓN B) ---
const loader = new GLTFLoader();
const models = {};

function loadModel(path, name) {
    loader.load(path, (gltf) => {
        models[name] = gltf.scene;
        scene.add(gltf.scene);
        
        // Si es el personaje, activar animaciones si las tiene
        if(name === 'lunari' && gltf.animations.length) {
            const mixer = new THREE.AnimationMixer(gltf.scene);
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
            models.mixer = mixer;
        }
    });
}

// Carga de tus archivos separados
loadModel('piso.glb', 'piso');
loadModel('paredes.glb', 'paredes');
loadModel('cama.glb', 'cama');
loadModel('lunari_saluda.glb', 'lunari');

// --- CÁMARA E INTERACCIÓN ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableZoom = false;
controls.enablePan = false;

[cite_start]// Configuración inicial de cámara [cite: 14, 15]
camera.position.set(0, 1.5, 3.5); 
controls.target.set(0, 1, 0);

function updateCameraSettings() {
    const isMobile = window.innerWidth <= 768;
    const distance = isMobile ? 4.5 : 3.5;
    camera.position.z = distance;
    
    [cite_start]// Bloqueo de rotación en PC [cite: 17, 18]
    if (!isMobile) {
        controls.minAzimuthAngle = 0;
        controls.maxAzimuthAngle = 0;
    } else {
        controls.minAzimuthAngle = -Math.PI / 6;
        controls.maxAzimuthAngle = Math.PI / 6;
    }
}

[cite_start]// --- SISTEMA DE DIÁLOGOS --- [cite: 8, 9, 10]
let dialogueTimeout;
function showDialogue(text) {
    const box = document.getElementById('dialogue-box');
    const textElement = document.getElementById('dialogue-text');
    textElement.innerHTML = text;
    box.classList.remove('hidden');
    clearTimeout(dialogueTimeout);
    dialogueTimeout = setTimeout(() => box.classList.add('hidden'), 5000);
}

[cite_start]// Raycaster para clics en 3D [cite: 10]
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
        const frases = [
            "¡Oye, me haces cosquillas!",
            "¿Tienes algo bueno que ver hoy?",
            "Jeje, gracias por la visita.",
            "Deberíamos ver un episodio más... solo uno más."
        ];
        showDialogue(frases[Math.floor(Math.random() * frases.length)]);
    }
});

[cite_start]// --- SISTEMA CLIMÁTICO (Copiado íntegramente de tu código) --- [cite: 30-50]
function initDynamicWeather() {
    const videoElement = document.getElementById('weather-video');
    function setWeatherVideo(wmoCode) {
        let videoFile = 'soleado.mp4';
        if (wmoCode >= 1 && wmoCode <= 3) videoFile = 'nublado.mp4';
        else if (wmoCode === 45 || wmoCode === 48) videoFile = 'neblina.mp4';
        else if ((wmoCode >= 51 && wmoCode <= 67) || (wmoCode >= 80 && wmoCode <= 82)) videoFile = 'lluvioso.mp4';
        else if ((wmoCode >= 71 && wmoCode <= 77) || wmoCode === 85 || wmoCode === 86) videoFile = 'nevado.mp4';
        else if (wmoCode >= 95 && wmoCode <= 99) videoFile = 'tormenta.mp4';
        
        if (!videoElement.src.endsWith(videoFile)) videoElement.src = videoFile;
    }

    async function fetchWeatherByCoords(lat, lon) {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            const data = await response.json();
            setWeatherVideo(data.current_weather.weathercode);
        } catch (e) { console.error("Error clima", e); }
    }

    async function fetchWeatherByIP() {
        try {
            const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
            const data = await res.json();
            await fetchWeatherByCoords(data.latitude, data.longitude);
        } catch (e) { console.error("Error IP", e); }
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            p => fetchWeatherByCoords(p.coords.latitude, p.coords.longitude),
            () => fetchWeatherByIP()
        );
    } else { fetchWeatherByIP(); }
}

// --- BUCLE DE ANIMACIÓN ---
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    
    if (models.mixer) models.mixer.update(delta);
    
    controls.update();
    renderer.render(scene, camera);
}

// --- INICIALIZACIÓN ---
window.onload = () => {
    updateCameraSettings();
    initDynamicWeather();
    animate();
    [cite_start]setTimeout(() => showDialogue("¡Bienvenido de nuevo! Me alegra mucho verte por aquí."), 1500); [cite: 50, 51]
};

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateCameraSettings();
});