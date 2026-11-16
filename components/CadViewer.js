import { useEffect, useId, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import styles from './CadViewer.module.css'

const presets = ['ISO', 'Top', 'Front', 'Side', 'Reset View']
const actions = ['Rotate left', 'Rotate right', 'Rotate up', 'Rotate down', 'Pan left', 'Pan right', 'Pan up', 'Pan down', 'Zoom in', 'Zoom out']
const bracketDescription = 'Sample mounting bracket with a horizontal base, an upright plate, seven through holes, and two triangular reinforcing ribs.'

function dimension(value, fallback) {
  const number = Number(value)
  // Keep the procedural sample within useful CAD scales (millimeters).
  return Number.isFinite(number) && number >= 1 && number <= 10000 ? number : fallback
}

export default function CadViewer({ name = 'Sample bracket', description = bracketDescription, modelType = 'bracket', color = '#aab8b6', dimensions = {} }) {
  const container = useRef(null)
  const sceneRef = useRef(null)
  const settings = useRef({ mode: 'Shaded + Edges', autoRotate: false })
  const descriptionId = useId()
  const instructionsId = useId()
  const [mode, setMode] = useState('Shaded + Edges')
  const [autoRotate, setAutoRotate] = useState(false)
  const [status, setStatus] = useState('loading')
  const [attempt, setAttempt] = useState(0)
  const ready = status === 'ready'

  const width = dimension(dimensions?.width, 100)
  const height = dimension(dimensions?.height, 65)
  const depth = dimension(dimensions?.depth, 60)
  const maxDim = Math.max(width, height, depth)
  const unit = Math.min(width, height, depth) / 60

  useEffect(() => {
    const host = container.current
    let disposed = false
    // Renderer initialization is imperative; report its result after this effect.
    const reportStatus = (value) => queueMicrotask(() => { if (!disposed) setStatus(value) })
    if (modelType !== 'bracket') {
      reportStatus('unsupported')
      return () => { disposed = true }
    }
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      reportStatus('unavailable')
      return () => { disposed = true }
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.shadowMap.autoUpdate = false
    renderer.shadowMap.needsUpdate = true
    renderer.outputColorSpace = THREE.SRGBColorSpace
    host.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-hidden', 'true')

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, maxDim * 0.001, maxDim * 100)
    const controls = new OrbitControls(camera, renderer.domElement)
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    controls.enableDamping = !motionPreference.matches
    controls.autoRotateSpeed = 2.0
    controls.minDistance = maxDim * 0.3
    controls.maxDistance = maxDim * 15
    const center = new THREE.Vector3(0, height * 0.32, 0)
    controls.target.copy(center)

    let distance = maxDim * 2.8
    const setView = (view) => {
      const target = controls.target
      const direction = {
        ISO: [1, 0.85, 1],
        Top: [0, 1, 0.001],
        Front: [0, 0, 1],
        Side: [1, 0, 0],
        'Reset View': [1, 0.85, 1],
      }[view]
      // Clear residual damping so presets and reset are deterministic.
      const damping = controls.enableDamping
      const rotating = controls.autoRotate
      controls.enableDamping = false
      controls.autoRotate = false
      controls.update(0)
      if (view === 'Reset View') target.copy(center)
      camera.position.copy(target).add(new THREE.Vector3(...direction).normalize().multiplyScalar(distance))
      camera.up.set(0, 1, 0)
      controls.update(0)
      controls.enableDamping = damping
      controls.autoRotate = rotating
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
      near: maxDim * 0.001,
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
      shape.moveTo(-w / 2 + 5 * unit, -h / 2)
      shape.lineTo(w / 2 - 5 * unit, -h / 2)
      shape.lineTo(w / 2, -h / 2 + 5 * unit)
      shape.lineTo(w / 2, h / 2 - 5 * unit)
      shape.lineTo(w / 2 - 5 * unit, h / 2)
      shape.lineTo(-w / 2 + 5 * unit, h / 2)
      shape.lineTo(-w / 2, h / 2 - 5 * unit)
      shape.lineTo(-w / 2, -h / 2 + 5 * unit)
      shape.closePath()
      holes.forEach(([x, y, radius]) => {
        const hole = new THREE.Path()
        hole.absarc(x, y, radius, 0, Math.PI * 2, true)
        shape.holes.push(hole)
      })
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: thickness - 2 * unit,
        bevelEnabled: true,
        bevelThickness: unit,
        bevelSize: unit,
        bevelSegments: 2,
        curveSegments: 32,
      })
      geometry.translate(0, 0, -(thickness - 2 * unit) / 2)
      return geometry
    }

    const holeRadius = Math.min(width, depth, height) * 0.055
    addPart(
      plate(width, depth, 7 * unit, [
        [-width * 0.32, -depth * 0.28, holeRadius],
        [width * 0.32, -depth * 0.28, holeRadius],
        [-width * 0.32, depth * 0.28, holeRadius],
        [width * 0.32, depth * 0.28, holeRadius],
      ]),
      [0, 0, 0],
      [-Math.PI / 2, 0, 0],
    )
    addPart(
      plate(width, height, 7 * unit, [
        [-width * 0.28, height * 0.22, holeRadius * 1.3],
        [width * 0.28, height * 0.22, holeRadius * 1.3],
        [0, 0, holeRadius * 1.8],
      ]),
      [0, height / 2 + 3 * unit, -depth / 2 + 5 * unit],
    )

    // Reinforcing ribs tie the upright to the base.
    const rib = new THREE.Shape()
    rib.moveTo(0, 0)
    rib.lineTo(depth * 0.62, 0)
    rib.lineTo(0, height * 0.65)
    rib.closePath()
    for (const x of [-width * 0.31, width * 0.31]) {
      const g = new THREE.ExtrudeGeometry(rib, { depth: 5 * unit, bevelEnabled: true, bevelThickness: 0.8 * unit, bevelSize: 0.8 * unit, bevelSegments: 2 })
      addPart(g, [x + 2.5 * unit, 4 * unit, -depth / 2 + 8 * unit], [0, -Math.PI / 2, 0])
    }

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(maxDim * 20, maxDim * 20), new THREE.ShadowMaterial({ opacity: 0.16 }))
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -4 * unit
    ground.receiveShadow = true
    scene.add(ground)

    renderer.shadowMap.needsUpdate = true

    const bounds = new THREE.Box3().setFromObject(group).getBoundingSphere(new THREE.Sphere())
    center.copy(bounds.center)
    controls.target.copy(center)
    let needsFit = true
    const resize = () => {
      const { clientWidth, clientHeight } = host
      if (!clientWidth || !clientHeight) return
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(clientWidth, clientHeight)
      const fitAngle = Math.min(camera.fov * Math.PI / 360, Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect))
      distance = bounds.radius / Math.sin(fitAngle) * 1.15
      controls.maxDistance = Math.max(maxDim * 15, distance * 3)
      camera.far = controls.maxDistance * 3
      camera.updateProjectionMatrix()
      if (needsFit) { setView('ISO'); needsFit = false }
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    const timer = new THREE.Timer()
    timer.connect(document)
    let frame
    const onContextLost = (event) => {
      event.preventDefault()
      cancelAnimationFrame(frame)
      controls.enabled = false
      sceneRef.current = null
      setStatus('unavailable')
      setAutoRotate(false)
    }
    renderer.domElement.addEventListener('webglcontextlost', onContextLost)
    const onMotionChange = () => {
      controls.enableDamping = !motionPreference.matches
      if (motionPreference.matches) {
        settings.current.autoRotate = false
        controls.autoRotate = false
        setAutoRotate(false)
      }
    }
    motionPreference.addEventListener('change', onMotionChange)
    const animate = () => {
      frame = requestAnimationFrame(animate)
      timer.update()
      const delta = Math.min(timer.getDelta(), 0.1)
      controls.update(delta)
      if (!document.hidden) renderer.render(scene, camera)
    }
    sceneRef.current = { controls, setView, meshes, edges, camera, renderer }
    material.wireframe = settings.current.mode === 'Wireframe'
    edges.forEach((edge) => { edge.visible = settings.current.mode === 'Shaded + Edges' })
    controls.autoRotate = settings.current.autoRotate
    animate()
    reportStatus('ready')

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      timer.dispose()
      motionPreference.removeEventListener('change', onMotionChange)
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose()
      })
      material.dispose()
      edgeMaterial.dispose()
      ground.material.dispose()
      key.shadow.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
      sceneRef.current = null
    }
  }, [color, width, height, depth, modelType, maxDim, unit, attempt])

  useEffect(() => {
    settings.current.mode = mode
    if (!sceneRef.current) return
    sceneRef.current.meshes.forEach((mesh) => { mesh.material.wireframe = mode === 'Wireframe' })
    sceneRef.current.edges.forEach((edge) => { edge.visible = mode === 'Shaded + Edges' })
    sceneRef.current.renderer.shadowMap.needsUpdate = true
  }, [mode])

  useEffect(() => {
    settings.current.autoRotate = autoRotate
    if (sceneRef.current) sceneRef.current.controls.autoRotate = autoRotate
  }, [autoRotate])

  const moveCamera = (action) => {
    if (!sceneRef.current) return
    const { controls } = sceneRef.current
    switch (action) {
      case 'Rotate left': controls.rotateLeft(0.15); break
      case 'Rotate right': controls.rotateLeft(-0.15); break
      case 'Rotate up': controls.rotateUp(0.15); break
      case 'Rotate down': controls.rotateUp(-0.15); break
      case 'Pan left': controls.pan(24, 0); break
      case 'Pan right': controls.pan(-24, 0); break
      case 'Pan up': controls.pan(0, 24); break
      case 'Pan down': controls.pan(0, -24); break
      case 'Zoom in': controls.dollyIn(1 / 1.15); break
      case 'Zoom out': controls.dollyOut(1 / 1.15); break
    }
  }

  const handleKeyDown = (event) => {
    if (!sceneRef.current || event.altKey || event.ctrlKey || event.metaKey) return
    const movement = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[event.key]
    if (movement) {
      event.preventDefault()
      moveCamera(`${event.shiftKey ? 'Pan' : 'Rotate'} ${movement}`)
    } else if (['+', '=', '-', '_'].includes(event.key)) {
      event.preventDefault()
      moveCamera(['+', '='].includes(event.key) ? 'Zoom in' : 'Zoom out')
    } else if (event.key.toLowerCase() === 'r') {
      event.preventDefault()
      sceneRef.current.setView('Reset View')
    } else if (event.key.toLowerCase() === 'a') {
      event.preventDefault()
      setAutoRotate((previous) => !previous)
    }
  }

  return (
    <div className={styles.viewer}>
      <p id={descriptionId} className={styles.description}>{description} Nominal dimensions: {width} × {height} × {depth} mm (width × height × depth).</p>
      <p role="status" className={styles.hint}>
        {status === 'loading' ? 'Starting 3D viewer…' : status === 'ready' ? '3D viewer ready.' : status === 'unsupported' ? 'This sample viewer supports bracket models only.' : 'The 3D viewer is unavailable. WebGL may be disabled or its graphics context was lost. The model description is available above.'}
      </p>
      {status === 'unavailable' && <button className={styles.retry} type="button" onClick={() => { setStatus('loading'); setAttempt((previous) => previous + 1) }}>Retry 3D viewer</button>}
      <div className={styles.toolbar} role="group" aria-label="Display mode">
        {['Shaded', 'Wireframe', 'Shaded + Edges'].map((item) => (
          <button key={item} type="button" disabled={!ready} aria-pressed={mode === item} onClick={() => setMode(item)}>
            {item}
          </button>
        ))}
      </div>
      <div
        ref={container}
        className={styles.viewport}
        role="region"
        hidden={!ready}
        tabIndex={ready ? 0 : -1}
        onKeyDown={handleKeyDown}
        aria-label={`3D view of ${name}`}
        aria-describedby={`${descriptionId} ${instructionsId}`}
      />
      <div className={styles.toolbar} role="group" aria-label="Camera views">
        {presets.map((item) => (
          <button key={item} type="button" disabled={!ready} onClick={() => sceneRef.current?.setView(item)}>
            {item}
          </button>
        ))}
        <button type="button" disabled={!ready} aria-pressed={autoRotate} onClick={() => setAutoRotate(!autoRotate)}>
          Auto-rotate
        </button>
      </div>
      <div className={styles.toolbar} role="group" aria-label="Rotate, pan and zoom">
        {actions.map((action) => <button key={action} type="button" disabled={!ready} onClick={() => moveCamera(action)}>{action}</button>)}
      </div>
      <p id={instructionsId} className={styles.hint}>Use the buttons to rotate, pan or zoom without dragging. In the focused view: arrow keys rotate, Shift + arrows pan, +/− zoom, R resets, and A toggles auto-rotate. You can also drag to rotate, scroll to zoom, or right-drag to pan.</p>
    </div>
  )
}
