import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import GUI from 'lil-gui'
import gsap from 'gsap'
import particlesVertexShader from './shaders/particles/vertex.glsl'
import particlesFragmentShader from './shaders/particles/fragment.glsl'

/**
 * Base
 */
// Debug
const gui = new GUI({ width: 340 })
const debugObject = {}

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Loaders
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('./draco/')
const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)

    // Materials
    if(particles)
    particles.material.uniforms.uResolution.value.set(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(sizes.pixelRatio)
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0, 0, 8 * 2)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
})

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(sizes.pixelRatio)

debugObject.clearColor = '#160920'
gui.addColor(debugObject, 'clearColor').onChange(() => { renderer.setClearColor(debugObject.clearColor) })
renderer.setClearColor(debugObject.clearColor)



// Load models
// Load models and setup particles
let particles = null;
gltfLoader.load('./models.glb', (gltf) => {
    particles = {};
    particles.index = 0
    
    // Extract all positions from the loaded models
    const positions = gltf.scene.children.map((child) => child.geometry.attributes.position);
    
    // Find the maximum vertex count across all models
    particles.maxCount = Math.max(...positions.map(position => position.count));
    
    // Prepare an array to store each model's positions with padding
    particles.position = positions.map((position) => {
        const originalArray = position.array;
        const paddedArray = new Float32Array(particles.maxCount * 3);
        
        // Copy existing vertices into the padded array
        for (let i = 0; i < particles.maxCount; i++) {
            const i3 = i * 3;
            if (i < position.count) {
                paddedArray[i3 + 0] = originalArray[i3 + 0];
                paddedArray[i3 + 1] = originalArray[i3 + 1];
                paddedArray[i3 + 2] = originalArray[i3 + 2];
            } else {
                // If beyond original length, repeat a random vertex
                const randomIndex = Math.floor(Math.random() * position.count) * 3;
                paddedArray[i3 + 0] = originalArray[randomIndex + 0];
                paddedArray[i3 + 1] = originalArray[randomIndex + 1];
                paddedArray[i3 + 2] = originalArray[randomIndex + 2];
            }
        }
        return new THREE.Float32BufferAttribute(paddedArray, 3);
    });
    
    // Setup the geometry with initial and target positions
    const sizesArray = new Float32Array(particles.maxCount)

    for(let i = 0; i < particles.maxCount; i++)
        sizesArray[i] = Math.random()

    particles.geometry = new THREE.BufferGeometry();
    particles.geometry.setAttribute('position', particles.position[particles.index]); // Initial position
    particles.geometry.setAttribute('aPositionTarget', particles.position[1]); // Target position for morphing
    particles.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizesArray, 1)); 


    // Material setup
    particles.colorA = '#ff7300'
    particles.colorB = '#0091ff'
    particles.material = new THREE.ShaderMaterial({
        vertexShader: particlesVertexShader,
        fragmentShader: particlesFragmentShader,
        uniforms: {
            uSize: new THREE.Uniform(0.4),
            uResolution: new THREE.Uniform(new THREE.Vector2(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)),
            uProgress: new THREE.Uniform(0),
            uColorA: new THREE.Uniform(new THREE.Color(particles.colorA)),
            uColorB: new THREE.Uniform(new THREE.Color(particles.colorB))
        },
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    // Points setup
    particles.points = new THREE.Points(particles.geometry, particles.material);
    particles.points.frustumCulled = false
    scene.add(particles.points);

    // methods
    particles.morph = (index)=>{

        // update attributes
        particles.geometry.attributes.position = particles.position[particles.index]
        particles.geometry.attributes.aPositionTarget = particles.position[index]

        // animate uProgress
        gsap.fromTo(particles.material.uniforms.uProgress, 
            {value: 0},
            {value: 1, duration: 3, ease: 'power4.inOut'}
        )

        // save index
        particles.index = index
    }

    gui.addColor(particles, 'colorA').onChange(()=>{
        particles.material.uniforms.uColorA.value.set(particles.colorA)
    })

    gui.addColor(particles, 'colorB').onChange(()=>{
        particles.material.uniforms.uColorB.value.set(particles.colorB)
    })

    particles.morph0 = ()=>{ particles.morph(0) }
    particles.morph1 = ()=>{ particles.morph(1) }
    particles.morph2 = ()=>{ particles.morph(2) }
    particles.morph3 = ()=>{ particles.morph(3) }

    // Debug UI for morphing
    gui.add(particles.material.uniforms.uProgress, 'value').min(0).max(1).step(0.001).name('uProgress').listen()

    gui.add(particles, 'morph0')
    gui.add(particles, 'morph1')
    gui.add(particles, 'morph2')
    gui.add(particles, 'morph3')


});


/**
 * Animate
 */
const tick = () =>
{
    // Update controls
    controls.update()

    // Render normal scene
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()