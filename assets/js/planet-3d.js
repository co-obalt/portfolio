import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

function initPlanet3D() {
  const container = document.getElementById('hero-planet-canvas');
  if (!container) {
    console.warn('hero-planet-canvas container not found');
    return;
  }

  // Prevent double initialization
  if (container.dataset.initialized === 'true') return;
  container.dataset.initialized = 'true';

  const scene = new THREE.Scene();

  const isMobile = () => window.innerWidth <= 853;

  // Exact camera settings matching Vite's Hero.jsx:
  // camera={{ position: [0, 0, -10], fov: 17.5, near: 1, far: 20 }}
  const camera = new THREE.PerspectiveCamera(
    17.5,
    container.clientWidth / (container.clientHeight || 1),
    0.1,
    100
  );
  camera.position.set(0, 0, -10);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: window.devicePixelRatio <= 1,
    powerPreference: 'high-performance',
    precision: 'mediump'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  container.appendChild(renderer.domElement);

  // Setup IBL Studio Environment Map (Essential for metallic gold reflections)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const roomEnv = new RoomEnvironment();
  const envMap = pmremGenerator.fromScene(roomEnv, 0.04).texture;
  scene.environment = envMap;

  // Soft Ambient & Studio Lights matching Vite's Lightformers
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  // Front Key Light (from camera side facing model)
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
  keyLight.position.set(0, 5, -9);
  keyLight.castShadow = true;
  scene.add(keyLight);

  // Warm Golden Accent Light to bring out rich metallic gold lustre
  const warmGoldLight = new THREE.DirectionalLight(0xfff1d6, 2.2);
  warmGoldLight.position.set(4, 2, -7);
  scene.add(warmGoldLight);

  // Cool Top/Back Rim Light
  const rimLight = new THREE.DirectionalLight(0xecfeff, 1.8);
  rimLight.position.set(-4, -1, 2);
  scene.add(rimLight);

  // Side Fill Light
  const sideLight = new THREE.DirectionalLight(0xffffff, 1.8);
  sideLight.position.set(8, 1, 0);
  scene.add(sideLight);

  // Containers matching Vite's Planet.jsx
  const shapeContainer = new THREE.Group();
  const spheresContainer = new THREE.Group();
  let ringMesh = null;

  scene.add(shapeContainer);
  shapeContainer.add(spheresContainer);

  const getTargetScale = () => (isMobile() ? 0.7 : 1.0);
  const currentScale = getTargetScale();
  shapeContainer.scale.set(currentScale, currentScale, currentScale);

  // Configure GLTF & DRACO Loaders
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('assets/js/three/addons/libs/draco/');
  loader.setDRACOLoader(dracoLoader);

  loader.load(
    'assets/models/Planet.glb',
    (gltf) => {
      console.log('Planet.glb loaded with materials:', gltf);

      let sphereMesh = null;
      let sphere2Mesh = null;

      // Extract nodes and preserve authored Poliigon Gold & Quartzite materials
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          if (child.material) {
            // Enhance environment reflections so metallic gold shines brilliantly
            child.material.envMapIntensity = 1.6;
            child.material.needsUpdate = true;
          }

          if (child.name === 'Sphere') {
            sphereMesh = child;
          } else if (child.name === 'Sphere2') {
            sphere2Mesh = child;
          } else if (child.name === 'Ring') {
            ringMesh = child;
          }
        }
      });

      // Assemble hierarchy matching Vite's Planet.jsx
      if (sphereMesh) spheresContainer.add(sphereMesh);
      if (sphere2Mesh) spheresContainer.add(sphere2Mesh);
      if (ringMesh) shapeContainer.add(ringMesh);

      if (!sphereMesh && !ringMesh) {
        shapeContainer.add(gltf.scene);
      }

      // GSAP Entrance Timeline (matching Vite's Planet.jsx)
      const gsapInstance = window.gsap;
      if (gsapInstance) {
        const tl = gsapInstance.timeline();
        tl.from(shapeContainer.position, {
          y: 5,
          duration: 3,
          ease: 'circ.out',
        });
        tl.from(
          spheresContainer.rotation,
          {
            x: 0,
            y: Math.PI,
            z: -Math.PI,
            duration: 10,
            ease: 'power1.inOut',
          },
          '-=25%'
        );
        if (ringMesh) {
          tl.from(
            ringMesh.rotation,
            {
              x: 0.8,
              y: 0,
              z: 0,
              duration: 10,
              ease: 'power1.inOut',
            },
            '<'
          );
        }
      } else {
        shapeContainer.position.y = 5;
        const dropInterval = setInterval(() => {
          shapeContainer.position.y += (0 - shapeContainer.position.y) * 0.05;
          if (Math.abs(shapeContainer.position.y) < 0.01) {
            shapeContainer.position.y = 0;
            clearInterval(dropInterval);
          }
        }, 16);
      }
    },
    undefined,
    (error) => {
      console.error('Error loading Planet.glb:', error);
      const fallbackDraco = new DRACOLoader();
      fallbackDraco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
      loader.setDRACOLoader(fallbackDraco);
      loader.load('assets/models/Planet.glb', (gltf2) => {
        shapeContainer.add(gltf2.scene);
      });
    }
  );

  // Mouse Parallax (only track when visible)
  let mouseX = 0;
  let mouseY = 0;
  window.addEventListener('mousemove', (e) => {
    if (!isVisible) return;
    const halfX = window.innerWidth / 2;
    const halfY = window.innerHeight / 2;
    mouseX = (e.clientX - halfX) / halfX;
    mouseY = (e.clientY - halfY) / halfY;
  }, { passive: true });

  // Window Resize
  function onWindowResize() {
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);

    const s = getTargetScale();
    shapeContainer.scale.set(s, s, s);
  }
  window.addEventListener('resize', onWindowResize, { passive: true });

  // IntersectionObserver: completely pause WebGL rendering when hero is out of view!
  let isVisible = true;
  let animId = null;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const wasVisible = isVisible;
      isVisible = entry.isIntersecting;
      if (isVisible && !wasVisible && !animId) {
        clock.start();
        animate();
      }
    });
  }, { threshold: 0.05 });

  observer.observe(container);

  // Animation Loop matching Float speed={0.5}
  const clock = new THREE.Clock();

  function animate() {
    if (!isVisible) {
      animId = null;
      return;
    }
    animId = requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    // Continuous floating bobbing (Float component behavior)
    const floatSpeed = 0.5;
    const floatY = Math.sin(elapsedTime * floatSpeed) * 0.12;
    const floatX = Math.cos(elapsedTime * floatSpeed * 0.8) * 0.06;

    if (shapeContainer.position.y <= 0.5) {
      shapeContainer.position.y = floatY;
      shapeContainer.position.x = floatX;
    }

    // Continuous gentle rotation
    spheresContainer.rotation.y += 0.0025;
    if (ringMesh) {
      ringMesh.rotation.z += 0.0015;
    }

    // Smooth mouse parallax tilt
    const targetRotX = mouseY * 0.18;
    const targetRotY = -mouseX * 0.22;

    shapeContainer.rotation.x += (targetRotX - shapeContainer.rotation.x) * 0.05;
    shapeContainer.rotation.y += (targetRotY - shapeContainer.rotation.y) * 0.05;

    renderer.render(scene, camera);
  }

  animate();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPlanet3D);
} else {
  initPlanet3D();
}
