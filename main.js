import * as THREE from 'three'
import * as THREE from 'https://cdn.skypack.dev/three';

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000010)
scene.fog = new THREE.Fog(0x05010F, 50, 200) // fog adjusted for visibility

const width = window.innerWidth
const height = window.innerHeight

const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
camera.position.set(10, 6, 10)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(width, height)
renderer.setPixelRatio(window.devicePixelRatio)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = false
controls.target.set(0, 0, 0)
controls.update()

// -----------------------
// Background nebula sphere
// -----------------------
const loader = new THREE.TextureLoader()
const bgTexture = loader.load('https://threejs.org/examples/textures/galaxy_starfield.png')
const bgGeometry = new THREE.SphereGeometry(100, 64, 64)
const bgMaterial = new THREE.MeshBasicMaterial({ map: bgTexture, side: THREE.BackSide })
const bgSphere = new THREE.Mesh(bgGeometry, bgMaterial)
scene.add(bgSphere)

// -----------------------
// Moving faint nebula cloud layer
// -----------------------
const nebulaTexture = loader.load('https://threejs.org/examples/textures/sprites/cloud.png')
const nebulaGeometry = new THREE.PlaneGeometry(150, 150)
const nebulaMaterial = new THREE.MeshBasicMaterial({
    map: nebulaTexture,
    transparent: true,
    opacity: 0.08,
    depthWrite: false
})
const nebulaPlane = new THREE.Mesh(nebulaGeometry, nebulaMaterial)
nebulaPlane.position.set(0, 0, -50)
nebulaPlane.rotation.x = -Math.PI / 2
scene.add(nebulaPlane)

// -----------------------
// Starfield
// -----------------------
const starGeometry = new THREE.BufferGeometry()
const starCount = 5000
const starPositions = new Float32Array(starCount * 3)
for (let i = 0; i < starCount; i++) {
    starPositions[i * 3] = (Math.random() - 0.5) * 200
    starPositions[i * 3 + 1] = (Math.random() - 0.5) * 200
    starPositions[i * 3 + 2] = (Math.random() - 0.5) * 200
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.05,
    transparent: true,
    opacity: 0.6
})
const starField = new THREE.Points(starGeometry, starMaterial)
scene.add(starField)

// -----------------------
// Main Galaxy
// -----------------------
const galaxyParams = {
    count: 40000,
    radius: 8,
    branches: 5,
    spin: 3,
    randomness: 0.5,
    randomnessPower: 2.5,
    colors: [
        new THREE.Color('#924EBF'),
        new THREE.Color('#0C0826'),
        new THREE.Color('#353273'),
        new THREE.Color('#022859'),
        new THREE.Color('#023059')
    ]
}

const geometry = new THREE.BufferGeometry()
const positions = new Float32Array(galaxyParams.count * 3)
const colors = new Float32Array(galaxyParams.count * 3)
const sizes = new Float32Array(galaxyParams.count)
const originalPositions = new Float32Array(galaxyParams.count * 3) // for explosion return

for (let i = 0; i < galaxyParams.count; i++) {
    let radius
    const gapStart = 2
    const gapEnd = 3
    if (Math.random() < 0.1) {
        radius = Math.pow(Math.random(), 0.5) * gapStart
    } else {
        radius = gapEnd + Math.pow(Math.random(), 0.6) * (galaxyParams.radius - gapEnd)
    }
    const spinAngle = radius * galaxyParams.spin
    const branchAngle = ((i % galaxyParams.branches) / galaxyParams.branches) * Math.PI * 2

    const randomX = (Math.random() - 0.5) * 0.2 * radius
    const randomY = (Math.random() - 0.5) * 0.2
    const randomZ = (Math.random() - 0.5) * 0.2 * radius

    const x = Math.cos(branchAngle + spinAngle) * radius + randomX
    const y = randomY
    const z = Math.sin(branchAngle + spinAngle) * radius + randomZ

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
    originalPositions[i * 3] = x
    originalPositions[i * 3 + 1] = y
    originalPositions[i * 3 + 2] = z

    const t = radius / galaxyParams.radius
    const colorIndex = Math.min(Math.floor(t * (galaxyParams.colors.length - 1)), galaxyParams.colors.length - 2)
    const color1 = galaxyParams.colors[colorIndex]
    const color2 = galaxyParams.colors[colorIndex + 1]
    const blended = color1.clone().lerp(color2, t * (galaxyParams.colors.length - 1) - colorIndex)

    let intensity = 0.6 + Math.pow(1 - t, 4) * 6.0
    colors[i * 3] = blended.r * intensity
    colors[i * 3 + 1] = blended.g * intensity
    colors[i * 3 + 2] = blended.b * intensity

    let size = 0.04 + Math.pow(1 - t, 3) * 0.2
    if (radius < 0.5) {
        size *= 3
        colors[i * 3] = 1
        colors[i * 3 + 1] = 1
        colors[i * 3 + 2] = 1
    }
    sizes[i] = size
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

const sprite = loader.load('https://threejs.org/examples/textures/sprites/disc.png')
const material = new THREE.PointsMaterial({
    size: 0.05,
    map: sprite,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    opacity: 1.0
})

const galaxy = new THREE.Points(geometry, material)
scene.add(galaxy)
galaxy.rotation.x = Math.PI / 4

// -----------------------
// Raycaster for click explosion
// -----------------------
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1

    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObject(galaxy)
    if (intersects.length > 0) triggerExplosion(intersects[0].point)
})

function triggerExplosion(center) {
    const positionsAttr = geometry.attributes.position.array
    for (let i = 0; i < galaxyParams.count; i++) {
        const dx = positionsAttr[i * 3] - center.x
        const dy = positionsAttr[i * 3 + 1] - center.y
        const dz = positionsAttr[i * 3 + 2] - center.z
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz)
        if (distance < 1.5) {
            positionsAttr[i * 3] += dx * 0.5
            positionsAttr[i * 3 + 1] += dy * 0.5
            positionsAttr[i * 3 + 2] += dz * 0.5
        }
    }
    geometry.attributes.position.needsUpdate = true
}

// -----------------------
// Ambient light
// -----------------------
const ambient = new THREE.AmbientLight(0xffffff, 1.2)
scene.add(ambient)

// -----------------------
// Animation loop
// -----------------------
function animate() {
    requestAnimationFrame(animate)

    const positionsAttr = geometry.attributes.position.array
    const colorsAttr = geometry.attributes.color.array

    for (let i = 0; i < galaxyParams.count; i++) {
        // subtle vertical drift
        positionsAttr[i * 3 + 1] += Math.sin(Date.now() * 0.0001 + i) * 0.0001

        // smoothly return to original
        positionsAttr[i*3] += (originalPositions[i*3] - positionsAttr[i*3]) * 0.02
        positionsAttr[i*3+1] += (originalPositions[i*3+1] - positionsAttr[i*3+1]) * 0.02
        positionsAttr[i*3+2] += (originalPositions[i*3+2] - positionsAttr[i*3+2]) * 0.02

        // color animation
        const color = new THREE.Color(colorsAttr[i * 3], colorsAttr[i * 3 + 1], colorsAttr[i * 3 + 2])
        color.offsetHSL(0.0001, 0, 0)
        colorsAttr[i * 3] = color.r
        colorsAttr[i * 3 + 1] = color.g
        colorsAttr[i * 3 + 2] = color.b
    }

    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true

    galaxy.rotation.y += 0.0005
    starField.rotation.y += 0.0001
    bgSphere.rotation.y += 0.00005
    nebulaPlane.rotation.z += 0.00003

    controls.update()
    renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
})
