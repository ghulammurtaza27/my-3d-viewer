// components/ModelViewer.jsx
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import React, { useRef, useEffect } from 'react';

const ModelViewer = ({ width = 800, height = 600, modelData, highlighted = false }) => {
  const containerRef = useRef();
  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef(new THREE.PerspectiveCamera(45, width / height, 0.1, 1000));
  const rendererRef = useRef();
  const controlsRef = useRef();

  // Initialize scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize renderer
    rendererRef.current = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    rendererRef.current.setSize(width, height);
    rendererRef.current.setPixelRatio(window.devicePixelRatio);
    rendererRef.current.setClearColor(0xf0f0f0);
    rendererRef.current.shadowMap.enabled = true;

    // Clear container and add renderer
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(rendererRef.current.domElement);

    // Set up camera
    cameraRef.current.position.set(10, 10, 10);
    cameraRef.current.lookAt(0, 0, 0);

    // Add orbit controls
    controlsRef.current = new OrbitControls(cameraRef.current, rendererRef.current.domElement);
    controlsRef.current.enableDamping = true;
    controlsRef.current.dampingFactor = 0.05;

    // Set up lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.5);
    frontLight.position.set(10, 10, 10);
    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(-10, -10, -10);

    sceneRef.current.add(ambientLight);
    sceneRef.current.add(frontLight);
    sceneRef.current.add(backLight);

    // Add grid and axes
    const grid = new THREE.GridHelper(20, 20, 0x808080, 0xcccccc);
    const axes = new THREE.AxesHelper(5);
    sceneRef.current.add(grid);
    sceneRef.current.add(axes);

    return () => {
      controlsRef.current?.dispose();
      rendererRef.current?.dispose();
    };
  }, [width, height]);

  // Handle model updates
  useEffect(() => {
    if (!modelData) return;

    // Clear existing model
    sceneRef.current.children = sceneRef.current.children.filter(
      child => !(child.isMesh || child.isGroup)
    );

    const model = modelData.clone();
    
    // Apply materials and adjust model
    model.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshPhongMaterial({
          color: highlighted ? 0x00ff00 : 0x156289,
          shininess: 30,
          transparent: highlighted,
          opacity: highlighted ? 0.8 : 1.0,
          side: THREE.DoubleSide,
        });
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Add model to scene
    sceneRef.current.add(model);

    // Center and scale model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 5 / maxDim;
    model.scale.multiplyScalar(scale);
    model.position.sub(center.multiplyScalar(scale));
    model.position.y = 0;

    // Adjust camera
    const distance = maxDim * 2;
    cameraRef.current.position.set(distance, distance, distance);
    cameraRef.current.lookAt(0, 0, 0);
    controlsRef.current?.update();
  }, [modelData, highlighted]);

  // Animation loop
  useEffect(() => {
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        controlsRef.current?.update();
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        backgroundColor: '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: '4px'
      }}
    />
  );
};

export { ModelViewer };