import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import styles from './CadViewer.module.css'

const presets = ['ISO', 'Top', 'Front', 'Side', 'Reset View']

export default function CadViewer({ modelType = 'bracket', color = '#aab8b6', dimensions = {} }) {
  const container = useRef(null)
  const sceneRef = useRef(null)
  const [mode, setMode] = useState('Shaded + Edges')
  const [autoRotate, setAutoRotate] = useState(false)

  // Validate finite positive dimensions
  const width = Number.isFinite(Number(dimensions.width)) && Number(dimensions.width) > 0 ? Number(dimensions.width) : 100
  const height = Number.isFinite(Number(dimensions.height)) && Number(dimensions.height) > 0 ? Number(dimensions.height) : 65
  const depth = Number.isFinite(Number(dimensions.depth)) && Number(dimensions.depth) > 0 ? Number(dimensions.depth) : 60
  const maxDim = Math.max(width, height, depth)

  useEffect(() => {
    const host = container.current
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      host.textContent = 'The 3D viewer could not start. Your browser may not support WebGL.'
      return () => { host.textContent = '' }
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.shadowMap.autoUpdate = false
    renderer.shadowMap.needsUpdate = true
    renderer.outputColorSpace = THREE.SRGBColorSpace
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, Math.max(0.1, maxDim * 0.01), Math.max(2000, maxDim * 50))
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.autoRotateSpeed = 2.0
    controls.minDistance = maxDim * 0.3
    controls.maxDistance = maxDim * 15
    controls.target.set(0, height * 0.32, 0)

    const distance = maxDim * 2.8
    const setView = (view) => {
      const target = controls.target
      const direction = {
        ISO: [1, 0.85, 1],
        Top: [0, 1, 0.001],
        Front: [0, 0, 1],
        Side: [1, 0, 0],
        'Reset View': [1, 0.85, 1],
      }[view]
      if (view === 'Reset View') target.set(0, height * 0.32, 0)
      camera.position.copy(target).add(new THREE.Vector3(...direction).normalize().multiplyScalar(distance))
      camera.up.set(0, 1, 0)
      controls.update()
    }
    setView('ISO')

    scene.add(new THREE.AmbientLight(0xffffff, 1.1))
    const key = new THREE.DirectionalLight(0xffffff, 2.4)
    key.position.set(maxDim * 1.2, maxDim * 1.8, maxDim)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    Object.assign(key.shadow.camera, {
      left: -maxDim * 2.5,
      right: maxDim * 2.5,
      top: maxDim * 2.5,
      bottom: -maxDim * 2.5,
      near: 1,
      far: maxDim * 10,
    })
    scene.add(key)

    const fill = new THREE.DirectionalLight(0xb8d4d1, 1.3)
    fill.position.set(-maxDim, maxDim * 0.8, -maxDim * 1.2)
    scene.add(fill)

    const group = new THREE.Group()
    scene.add(group)

    const material = new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.46 })
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x354b49, transparent: true, opacity: 0.7 })
    const meshes = []
    const edges = []

    const addPart = (geometry, position, rotation) => {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(...position)
      if (rotation) mesh.rotation.set(...rotation)
      mesh.castShadow = true
      mesh.receiveShadow = true
      const outline = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 30), edgeMaterial)
      mesh.add(outline)
      group.add(mesh)
      meshes.push(mesh)
      edges.push(outline)
    }

    // Extruded plates with real through holes and a small machined bevel.
    const plate = (w, h, thickness, holes) => {
      const shape = new THREE.Shape()
      shape.moveTo(-w / 2 + 5, -h / 2)
      shape.lineTo(w / 2 - 5, -h / 2)
      shape.lineTo(w / 2, -h / 2 + 5)
      shape.lineTo(w / 2, h / 2 - 5)
      shape.lineTo(w / 2 - 5, h / 2)
      shape.lineTo(-w / 2 + 5, h / 2)
      shape.lineTo(-w / 2, h / 2 - 5)
      shape.lineTo(-w / 2, -h / 2 + 5)
      shape.closePath()
      holes.forEach(([x, y, radius]) => {
        const hole = new THREE.Path()
        hole.absarc(x, y, radius, 0, Math.PI * 2, true)
        shape.holes.push(hole)
      })
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: thickness - 2,
        bevelEnabled: true,
        bevelThickness: 1,
        bevelSize: 1,
        bevelSegments: 2,
        curveSegments: 32,
      })
      geometry.translate(0, 0, -(thickness - 2) / 2)
      return geometry
    }

    const holeRadius = Math.min(width, depth, height) * 0.055
    addPart(
      plate(width, depth, 7, [
        [-width * 0.32, -depth * 0.28, holeRadius],
        [width * 0.32, -depth * 0.28, holeRadius],
        [-width * 0.32, depth * 0.28, holeRadius],
        [width * 0.32, depth * 0.28, holeRadius],
      ]),
      [0, 0, 0],
      [-Math.PI / 2, 0, 0],
    )
    addPart(
      plate(width, height, 7, [
        [-width * 0.28, height * 0.22, holeRadius * 1.3],
        [width * 0.28, height * 0.22, holeRadius * 1.3],
        [0, 0, holeRadius * 1.8],
      ]),
      [0, height / 2 + 3, -depth / 2 + 5],
    )

    // Reinforcing ribs tie the upright to the base.
    const rib = new THREE.Shape()
    rib.moveTo(0, 0)
    rib.lineTo(depth * 0.62, 0)
    rib.lineTo(0, height * 0.65)
    rib.closePath()
    for (const x of [-width * 0.31, width * 0.31]) {
      const g = new THREE.ExtrudeGeometry(rib, { depth: 5, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.8, bevelSegments: 2 })
      addPart(g, [x - 2.5, 4, -depth / 2 + 8], [0, -Math.PI / 2, 0])
    }

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(maxDim * 20, maxDim * 20), new THREE.ShadowMaterial({ opacity: 0.16 }))
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -4
    ground.receiveShadow = true
    scene.add(ground)

    renderer.shadowMap.needsUpdate = true

    const resize = () => {
      const { clientWidth, clientHeight } = host
      if (!clientWidth || !clientHeight) return
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(clientWidth, clientHeight)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    const clock = new THREE.Clock()
    let frame
    const animate = () => {
      frame = requestAnimationFrame(animate)
      const delta = Math.min(clock.getDelta(), 0.1)
      controls.update(delta)
      renderer.render(scene, camera)
    }
    sceneRef.current = { controls, setView, meshes, edges, camera, renderer }
    animate()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose()
      })
      material.dispose()
      edgeMaterial.dispose()
      ground.material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      sceneRef.current = null
    }
  }, [color, width, height, depth, modelType, maxDim])

  useEffect(() => {
    if (!sceneRef.current) return
    sceneRef.current.meshes.forEach((mesh) => { mesh.material.wireframe = mode === 'Wireframe' })
    sceneRef.current.edges.forEach((edge) => { edge.visible = mode === 'Shaded + Edges' })
  }, [mode])

  useEffect(() => {
    if (sceneRef.current) sceneRef.current.controls.autoRotate = autoRotate
  }, [autoRotate])

  const handleKeyDown = (event) => {
    if (!sceneRef.current) return
    const { controls, setView, camera } = sceneRef.current
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      camera.position.sub(controls.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.1).add(controls.target)
      controls.update()
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      camera.position.sub(controls.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.1).add(controls.target)
      controls.update()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      camera.position.sub(controls.target).multiplyScalar(0.92).add(controls.target)
      controls.update()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      camera.position.sub(controls.target).multiplyScalar(1.08).add(controls.target)
      controls.update()
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      camera.position.sub(controls.target).multiplyScalar(0.9).add(controls.target)
      controls.update()
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault()
      camera.position.sub(controls.target).multiplyScalar(1.1).add(controls.target)
      controls.update()
    } else if (event.key === 'r' || event.key === 'R') {
      event.preventDefault()
      setView('Reset View')
    } else if (event.key === 'a' || event.key === 'A') {
      event.preventDefault()
      setAutoRotate((prev) => !prev)
    }
  }

  return (
    <div className={styles.viewer}>
      <div className={styles.toolbar} role="group" aria-label="Display mode">
        {['Shaded', 'Wireframe', 'Shaded + Edges'].map((item) => (
          <button key={item} type="button" aria-pressed={mode === item} onClick={() => setMode(item)}>
            {item}
          </button>
        ))}
      </div>
      <div
        ref={container}
        className={styles.viewport}
        role="region"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label="Interactive 3D CAD model viewport. Drag to rotate, scroll to zoom, right-drag to pan. When focused, use Arrow keys or +/- to navigate, R to reset, A to toggle auto-rotation."
      />
      <div className={styles.toolbar} role="group" aria-label="Camera views">
        {presets.map((item) => (
          <button key={item} type="button" onClick={() => sceneRef.current?.setView(item)}>
            {item}
          </button>
        ))}
        <button type="button" aria-pressed={autoRotate} onClick={() => setAutoRotate(!autoRotate)}>
          Auto-rotate
        </button>
      </div>
      <p className={styles.hint}>DRAG OR ARROWS TO ROTATE &middot; SCROLL OR +/- TO ZOOM &middot; RIGHT-DRAG TO PAN</p>
    </div>
  )
}
