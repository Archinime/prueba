// lobby-main.js (module)
import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.154.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.154.0/examples/jsm/loaders/GLTFLoader.js';

// -----------------------------
// 1. Sistema de Diálogos (igual que antes)
// -----------------------------
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

// -----------------------------
// 2. Preparar references DOM
// -----------------------------
const roomModelEl = document.getElementById('room-model'); // antes era <model-viewer>, ahora contenedor three.js
const waifuModel = document.getElementById('waifu-placeholder');

// Para compatibilidad, dejaremos una "interfaz" roomModel con algunos métodos similares
const roomModel = {
    el: roomModelEl,
    // getCameraOrbit será definido más abajo (depende del controls)
    getCameraOrbit: () => ({ theta: 0, phi: 0, radius: 1 }),
    // placeholders que antes se leían/ajustaban directamente (minCameraOrbit, cameraOrbit...).
    // En nuestro código usaremos funciones específicas para actualizar la cámara.
};

// click handler sobre la "habitación" (renderer.domElement se configura luego)
function onRoomClick() {
    const frases = [
        "¡Oye, me haces cosquillas!",
        "¿Tienes algo bueno que ver hoy?",
        "Jeje, gracias por la visita.",
        "Deberíamos ver un episodio más... solo uno más."
    ];
    const fraseRandom = frases[Math.floor(Math.random() * frases.length)];
    showDialogue(fraseRandom);
}

// -----------------------------
// 3. three.js: escena, renderer, cámara, controles
// -----------------------------
let renderer, scene, camera, controls, group;
let canvasContainer = roomModelEl;

let loadedCount = 0;
const files = ['cama.glb', 'paredes.glb', 'piso.glb'];

let isWiggling = false;
let wiggleReq = null;

initThree();
loadRoomParts(); // carga las piezas por separado
animate(); // loop de render

function initThree() {
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    // inserta el canvas dentro del div #room-model
    canvasContainer.appendChild(renderer.domElement);

    // Scene
    scene = new THREE.Scene();

    // Cámara (la usamos en metros: 1 unidad = 1 metro)
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 200);
    camera.position.set(0, 1.6, 3.5); // posición inicial (similar a 3.5m distancia)

    // Controls (OrbitControls)
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false; // se replicaba disable-pan
    controls.enableZoom = false; // replicate disable-zoom
    controls.maxPolarAngle = Math.PI / 2; // limitar para evitar cámara debajo del suelo por defecto

    // Grupo padre: mover esto mueve toda la habitación
    group = new THREE.Group();
    scene.add(group);

    // Luz suave para simular el mismo look
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    hemi.position.set(0, 50, 0);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(5, 10, 7.5);
    dir.castShadow = true;
    scene.add(dir);

    // Exponer getCameraOrbit y emitir eventos 'camera-change' como antes
    roomModel.getCameraOrbit = () => {
        return {
            theta: controls.getAzimuthalAngle(),  // radianes
            phi: controls.getPolarAngle(),        // radianes
            radius: camera.position.distanceTo(group.position)
        };
    };

    // Cuando cambie la cámara, despachamos un evento 'camera-change' en el elemento DOM
    controls.addEventListener('change', () => {
        const evt = new Event('camera-change');
        roomModelEl.dispatchEvent(evt);
    });

    // Click: delegar al handler de diálogo
    renderer.domElement.addEventListener('click', onRoomClick);

    // pointerdown cancela el wiggle (como antes)
    renderer.domElement.addEventListener('pointerdown', () => {
        isWiggling = false;
        if (wiggleReq) cancelAnimationFrame(wiggleReq);
    });

    // Resize
    window.addEventListener('resize', onWindowResize);
    onWindowResize(); // set initial sizes
}

// -----------------------------
// 4. Cargar los GLB por separado y añadir al grupo (group)
// -----------------------------
function loadRoomParts() {
    const loader = new GLTFLoader();
    files.forEach(url => {
        loader.load(url, (gltf) => {
            const model = gltf.scene;
            // Si tus piezas tienen transforms locales, deberías dejarlas tal cual.
            // Si necesitas ajustar origen/escala, puedes hacerlo aquí (por ejemplo:)
            // model.position.set(0,0,0);
            // model.scale.set(1,1,1);

            // Asegurarnos de que el shadow map esté activado si procede
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            group.add(model);
            loadedCount++;
            if (loadedCount === files.length) {
                // todo cargado -> puedes hacer ajustes finales (centrado/scale)
                // por ejemplo, si necesitas centrar el group: group.position.set(0,0,0);
                // si quieres que la cámara enfoque automáticamente, podrías calcular bounding box.
                fitCameraToObject();
            }
        }, undefined, (err) => {
            console.error("Error cargando", url, err);
        });
    });
}

// Ajuste simple para que la cámara vea la escena (si las piezas no están centradas)
function fitCameraToObject() {
    // Calcula bounding box del grupo
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Si el objeto es muy pequeño/grande, ajustamos la distancia inicial
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.2;

    // Si cameraZ es menor a 1, dejarlo 3.5 (valor original)
    cameraZ = Math.max(cameraZ, 3.5);

    // Posicionar cámara (manteniendo altura similar a 1.6m)
    camera.position.set(center.x, center.y + 1.6, center.z + cameraZ);
    camera.lookAt(center);
    controls.target.copy(center);

    // actualizamos variables
    controls.update();
}

// -----------------------------
// 5. Loop de render
// -----------------------------
function animate(t) {
    wiggleReq = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// -----------------------------
// 6. Funciones de cámara / utilidades para mantener compatibilidad con tu lógica
// -----------------------------
function degToRad(d) { return d * Math.PI / 180; }
function radToDeg(r) { return r * 180 / Math.PI; }

// Fija la cámara siguiendo la notación usada en tu código original: "thetaDeg 70deg radius"
function setCameraOrbitFromDeg(thetaDeg, phiDeg, radius) {
    // convertimos a radianes; phiDeg en tu código era 70deg (elevación desde horizontal)
    // En three.js, polar angle = angle measured from +Y axis downwards.
    // Si elevation = 70deg desde horizontal, entonces polarAngle = 90deg - elevation.
    const theta = degToRad(thetaDeg); // azimuth
    const polar = degToRad(90 - phiDeg); // polar angle (three.js)

    // Spherical -> cartesian, centrado en controls.target
    const target = controls.target.clone();
    const sinP = Math.sin(polar);
    const x = target.x + radius * sinP * Math.sin(theta);
    const y = target.y + radius * Math.cos(polar); // note: cos(polar) para altura
    const z = target.z + radius * sinP * Math.cos(theta);

    camera.position.set(x, y, z);
    camera.lookAt(target);
    controls.update();
}

// shorthand para set camera orbit usando strings tipo '3.5m'
function parseDistanceStr(s) {
    // '3.5m' -> 3.5
    if (typeof s === 'string' && s.endsWith('m')) {
        return parseFloat(s.slice(0, -1)) || 3.5;
    }
    return Number(s) || 3.5;
}

// -----------------------------
// 7. Lógica responsiva y wiggle (adaptada de tu código original)
// -----------------------------
function updateCameraSettings() {
    const isMobile = window.innerWidth <= 768;
    const roomDistanceStr = isMobile ? '2.2m' : '3.5m';
    const roomDistance = parseDistanceStr(roomDistanceStr);

    // Limitar control de azimuth (theta) y polar (phi) para imitar min/maxCameraOrbit
    if (isMobile) {
        // permitir rotación lateral
        controls.minAzimuthAngle = degToRad(-35);
        controls.maxAzimuthAngle = degToRad(35);
        // mantener elevación centrada en ~70deg (phiDeg)
        controls.minPolarAngle = degToRad(90 - 70); // polar = 90 - elevación
        controls.maxPolarAngle = degToRad(90 - 70);
    } else {
        // bloquear giro lateral (0deg)
        controls.minAzimuthAngle = degToRad(0);
        controls.maxAzimuthAngle = degToRad(0);
        controls.minPolarAngle = degToRad(90 - 70);
        controls.maxPolarAngle = degToRad(90 - 70);
    }

    // Ajustar distancia manteniendo la orientación actual (recalcular posición spherical con misma theta)
    // tomamos la theta actual y colocamos la cámara a la distancia objetivo
    const currentTheta = controls.getAzimuthalAngle(); // rad
    const thetaDeg = radToDeg(currentTheta);
    setCameraOrbitFromDeg(thetaDeg, 70, roomDistance);

    // Mantener la waifu en proporción
    const waifuDistance = isMobile ? '3.5m' : '3.5m';
    if (!isWiggling) {
        // convertimos theta a rad y asignamos al model-viewer de la waifu
        const thetaRad = currentTheta;
        waifuModel.cameraOrbit = `${thetaRad}rad auto ${waifuDistance}`;
    }
}

function startCustomWiggle() {
    if (window.innerWidth > 768) return;
    const duration = 10000;
    const startTime = performance.now();
    const maxAngle = 28; // grados (amplitud)
    const roomDistance = 2.2;
    const waifuDistance = 3.5;

    isWiggling = true;

    function step(currentTime) {
        if (!isWiggling) return;
        const elapsed = currentTime - startTime;
        if (elapsed < duration) {
            const progress = elapsed / duration;
            const currentTheta = Math.sin(progress * Math.PI * 2) * maxAngle; // grados
            // actualizar cámara y waifu
            setCameraOrbitFromDeg(currentTheta, 70, roomDistance);
            waifuModel.cameraOrbit = `${degToRad(currentTheta)}rad auto ${waifuDistance}`;
            wiggleReq = requestAnimationFrame(step);
        } else {
            // restaurar
            setCameraOrbitFromDeg(0, 70, roomDistance);
            waifuModel.cameraOrbit = `0rad auto ${waifuDistance}`;
            isWiggling = false;
        }
    }

    wiggleReq = requestAnimationFrame(step);
}

// pointerdown ya configurado arriba con renderer.domElement.addEventListener('pointerdown', ...)

window.addEventListener('resize', updateCameraSettings);

// -----------------------------
// 8. Sincronización de cámaras (cuando el usuario arrastra la habitación)
// -----------------------------
/*
 Antes:
 roomModel.addEventListener('camera-change', () => {
   const roomOrbit = roomModel.getCameraOrbit();
   waifuModel.cameraOrbit = `${roomOrbit.theta}rad auto ${waifuDistance}`;
 });
*/

// Ahora escuchamos el evento 'camera-change' que despachamos cuando controls cambian
roomModelEl.addEventListener('camera-change', () => {
    if (isWiggling) return;
    const roomOrbit = roomModel.getCameraOrbit();
    const isMobile = window.innerWidth <= 768;
    const waifuDistance = isMobile ? '3.5m' : '3.5m';
    waifuModel.cameraOrbit = `${roomOrbit.theta}rad auto ${waifuDistance}`;
});

// -----------------------------
// 9. Sistema climático dinámico (mantengo tu implementación casi intacta)
// -----------------------------
function initDynamicWeather() {
    const videoElement = document.getElementById('weather-video');

    function setWeatherVideo(wmoCode) {
        let videoFile = 'soleado.mp4'; // Por defecto

        if (wmoCode === 0) { videoFile = 'soleado.mp4'; } // Despejado
        else if (wmoCode >= 1 && wmoCode <= 3) { videoFile = 'nublado.mp4'; } // Mayormente despejado a nublado
        else if (wmoCode === 45 || wmoCode === 48) { videoFile = 'neblina.mp4'; } // Niebla y niebla escarchada
        else if ((wmoCode >= 51 && wmoCode <= 67) || (wmoCode >= 80 && wmoCode <= 82)) { videoFile = 'lluvioso.mp4'; } // Llovizna y Lluvia
        else if ((wmoCode >= 71 && wmoCode <= 77) || wmoCode === 85 || wmoCode === 86) { videoFile = 'nevado.mp4'; } // Nieve y granizo
        else if (wmoCode >= 95 && wmoCode <= 99) { videoFile = 'tormenta.mp4'; } // Tormentas

        // Evitar que el video se reinicie si ya tiene el source correcto asignado
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
            console.error("Error API Clima, manteniendo el clima por defecto.", error);
        }
    }

    async function fetchWeatherByIP() {
        try {
            console.log("Intentando obtener ubicación por IP...");
            const ipResponse = await fetch('https://get.geojs.io/v1/ip/geo.json');
            const ipData = await ipResponse.json();
            await fetchWeatherByCoords(ipData.latitude, ipData.longitude);
        } catch (error) {
            console.error("Error al obtener ubicación por IP, se mantendrá el clima predeterminado.", error);
        }
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                console.warn("Geolocalización bloqueada/error. Usando respaldo por IP.", error);
                fetchWeatherByIP();
            }
        );
    } else {
        fetchWeatherByIP();
    }
}

// -----------------------------
// 10. Inicialización al cargar la página (mantengo tu flujo)
// -----------------------------
window.onload = () => {
    updateCameraSettings();
    startCustomWiggle();
    initDynamicWeather();

    setTimeout(() => {
        showDialogue("¡Bienvenido de nuevo! Me alegra mucho verte por aquí.");
    }, 1500);
};

// -----------------------------
// util: resize handler
// -----------------------------
function onWindowResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    updateCameraSettings();
}