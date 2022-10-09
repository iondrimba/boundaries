import './style.css';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import Stats from 'stats-js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import Tweakpane from 'tweakpane';
import {
  rgbToHex,
  hexToRgb,
} from './helpers';

const {
  Scene,
  Object3D,
  Color,
  WebGLRenderer,
  Raycaster,
  MathUtils,
  BoxGeometry,
  MeshMatcapMaterial,
  InstancedMesh,
  PCFSoftShadowMap,
  DynamicDrawUsage,
  PerspectiveCamera,
  AxesHelper,
  AmbientLight,
  DirectionalLight,
  GridHelper,
  PlaneGeometry,
  TextureLoader,
  MeshStandardMaterial,
  Mesh,
  DoubleSide,
  Path,
  ExtrudeGeometry,
  Vector2,
  Shape,
  SphereGeometry,
} = THREE;

class App {
  init() {
    this.setup();
    this.createScene();
    this.createCamera();
    this.addCameraControls();
    this.addAmbientLight();
    this.addDirectionalLight();
    this.addPhysicsWorld();
    this.addPointerDebugger();
    this.loadMatCaps();
    this.addFloor();
    this.addFloorGrid();
    // this.addFloorHelper();
    this.addBox();
    this.addPropeller();
    this.addInnerBoudaries();
    this.addAxisHelper();
    this.addStatsMonitor();
    this.addWindowListeners();
    this.addGuiControls();
    this.animate();
  }

  addGuiControls() {
    this.pane = new Tweakpane();
    this.guiColors = this.pane.addFolder({
      title: "Colors",
      expanded: true
    });

    this.guiColors.addInput(this.colors, "background").on("change", (evt) => {
      this.floor.material.color = hexToRgb(evt.value);
      document.body.style.backgroundColor = evt.value;
      this.scene.background = new Color(evt.value);
    });

    this.guiColors.addInput(this.colors, "ring").on("change", (evt) => {
      this.ringMesh.material.color = hexToRgb(evt.value);
    });

    this.guiColors.addInput(this.colors, "propeller").on("change", (evt) => {
      this.meshes.propeller.material.color = hexToRgb(evt.value);
    });

    this.guiColors.addInput(this.colors, "leftSideSphere").on("change", (evt) => {
      this.meshes.sphereLeftSideMaterial.color = hexToRgb(evt.value);
    });

    this.guiColors.addInput(this.colors, "rightSideSphere").on("change", (evt) => {
      this.meshes.sphereRightSideMaterial.color = hexToRgb(evt.value);
    });
  }

  addPointerDebugger() {
    const material = new MeshStandardMaterial({ color: 0xff0000 });
    const geometry = new SphereGeometry(.2, 16, 16);

    this.pointerDebugger = new Mesh(geometry, material);

    this.scene.add(this.pointerDebugger);
  }

  addPhysicsWorld() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -40, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;
    this.world.defaultContactMaterial.contactEquationStiffness = 1e6;
    this.world.defaultContactMaterial.contactEquationRelaxation = 6;
    this.world.allowSleep = true;

    this.cannonDebugRenderer = new CannonDebugger(this.scene, this.world);
  }

  clearBody() {
    while (document.body.childNodes.length) {
      document.body.removeChild(document.body.lastChild);
    }
  }

  setup() {
    this.velocity = 0.05;
    this.raycaster = new Raycaster();
    this.mouse3D = new Vector2();
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.debug = true;

    this.colors = {
      background: rgbToHex(window.getComputedStyle(document.body).backgroundColor),
      floor: rgbToHex(window.getComputedStyle(document.body).backgroundColor),
      box: '#ffffff',
      leftSideSphere: '#5661ff',
      rightSideSphere: '#0dff00',
      ambientLight: '#ffffff',
      directionalLight: '#ffffff',
      ring: '#ff0029',
      propeller: '#ffffff',
      grid: '#ffffff',
    };

    this.meshes = {
      container: new Object3D(),
      spheres: [],
      propeller: null,
      material: new MeshStandardMaterial({
        color: this.colors.ball,
        metalness: .11,
        emissive: 0x0,
        roughness: .1,
      }),
      sphereBaseMaterial: new THREE.MeshStandardMaterial({ color: "#ff00ff" }),
      sphereLeftSideMaterial: new THREE.MeshStandardMaterial({
        color: this.colors.leftSideSphere,
        metalness: .1,
        emissive: 0x0,
        roughness: .1,
      }),
      sphereRightSideMaterial: new THREE.MeshStandardMaterial({
        color: this.colors.rightSideSphere,
        metalness: .1,
        emissive: 0x0,
        roughness: .2,
      }),
    };

    window.addEventListener('mousemove', this.onMouseMove.bind(this), { passive: true });
    window.addEventListener('keydown', this.onMouseDown.bind(this), { passive: true });
    window.addEventListener('keyup', this.onKeyup.bind(this), { passive: true });
  }

  loadMatCaps() {
    this.textureBox = new TextureLoader().load('./assets/matcap.png');
  }

  createScene() {
    this.scene = new Scene();
    this.scene.background = new Color(this.colors.background);
    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.width, this.height);

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;

    document.body.appendChild(this.renderer.domElement);
  }

  addAxisHelper() {
    const axesHelper = new AxesHelper(5);

    this.debug && this.scene.add(axesHelper);
  }

  createCamera() {
    this.camera = new PerspectiveCamera(20, this.width / this.height, 1, 1000);
    this.camera.position.set(0, 25, 20);

    this.scene.add(this.camera);
  }

  addCameraControls() {
    this.orbitControl = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControl.maxPolarAngle = MathUtils.degToRad(90);
    this.orbitControl.maxAzimuthAngle = MathUtils.degToRad(40);
    this.orbitControl.enableDamping = true;
    this.orbitControl.dampingFactor = 0.02;

    document.body.style.cursor = '-moz-grabg';
    document.body.style.cursor = '-webkit-grab';

    this.orbitControl.addEventListener('start', () => {
      requestAnimationFrame(() => {
        document.body.style.cursor = '-moz-grabbing';
        document.body.style.cursor = '-webkit-grabbing';
      });
    });

    this.orbitControl.addEventListener('end', () => {
      requestAnimationFrame(() => {
        document.body.style.cursor = '-moz-grab';
        document.body.style.cursor = '-webkit-grab';
      });
    });
  }

  addAmbientLight() {
    const light = new AmbientLight({ color: this.colors.ambientLight }, .5);

    this.scene.add(light);
  }

  addDirectionalLight() {
    const target = new Object3D();
    target.position.set(0, 0, -40);

    this.directionalLight = new DirectionalLight(this.colors.directionalLight, 1);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.camera.needsUpdate = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.position.set(0, 13, 10);
    this.directionalLight.target = target;

    this.directionalLight.shadow.camera.far = 1000;
    this.directionalLight.shadow.camera.near = -100;

    this.directionalLight.shadow.camera.left = -20;
    this.directionalLight.shadow.camera.right = 20;
    this.directionalLight.shadow.camera.top = 15;
    this.directionalLight.shadow.camera.bottom = -15;
    this.directionalLight.shadow.camera.zoom = 1;

    this.scene.add(this.directionalLight);
  }

  addFloorGrid() {
    const size = 100;
    const divisions = 100;
    this.grid = new GridHelper(size, divisions, this.colors.grid, this.colors.grid);

    this.grid.position.set(0, 0, 0);

    this.scene.add(this.grid);
  }

  addFloor() {
    const geometry = new PlaneGeometry(400, 400);
    const material = new MeshStandardMaterial({ color: this.colors.floor, side: DoubleSide });

    this.floor = new Mesh(geometry, material);
    this.floor.position.y = 0;
    this.floor.position.z = 0;
    this.floor.rotateX(Math.PI / 2);
    this.floor.receiveShadow = true;

    // physics floor
    this.floor.body = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(0, 0, 0),
      material: new CANNON.Material(),
      shape: new CANNON.Plane(2, 2, 2),
    });

    this.floor.body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), MathUtils.degToRad(-90));
    this.world.addBody(this.floor.body);

    this.scene.add(this.floor);
  }

  addFloorHelper() {
    this.controls = new TransformControls(this.camera, this.renderer.domElement);
    this.controls.enabled = false;
    this.controls.attach(this.floor);
    this.scene.add(this.controls);
  }

  createShape() {
    const size = 100;
    const vectors = [
      new Vector2(-size, size),
      new Vector2(-size, -size),
      new Vector2(size, -size),
      new Vector2(size, size)
    ];

    const shape = new Shape(vectors);

    return shape;
  }

  createHole(shape, x, z) {
    const radius = 3;
    const holePath = new Path();

    holePath.moveTo(x, z);
    holePath.ellipse(x, z, radius, radius, 0, Math.PI * 2);

    holePath.autoClose = true;

    shape.holes.push(holePath);
  }

  addInnerBoudaries() {
    const width = .2, height = 1, depth = .2;
    const geometry = new BoxGeometry(width, height, depth);
    const count = 100;

    this.ringMesh = new InstancedMesh(geometry, new MeshStandardMaterial({ color: this.colors.ring, side: DoubleSide }), count);
    this.ringMesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.ringMesh.castShadow = true;

    for (let index = 0; index < count; index++) {
      const mesh = new Mesh(geometry, this.ringMesh.material);
      mesh.needsUpdate = false;
      mesh.castShadow = false;
      mesh.receiveShadow = false;

      const l = 360 / count;
      const pos = MathUtils.degToRad(l * index);
      const distance = (1.48 * 2);
      const sin = Math.sin(pos) * distance;
      const cos = Math.cos(pos) * distance;

      mesh.position.set(sin, height * .5, cos);
      mesh.lookAt(0, height * .5, 0);
      mesh.updateMatrix();

      this.ringMesh.setMatrixAt(index, mesh.matrix);

      // physics obstacle
      mesh.body = new CANNON.Body({
        mass: 0,
        material: new CANNON.Material({ friction: .3, restitution: .1 }),
        shape: new CANNON.Box(new CANNON.Vec3(width * .5, height * .5, depth * .5)),
        position: new CANNON.Vec3(sin, height * .5, cos),
      });

      mesh.body.linearDamping = 1;
      mesh.body.material.name = "boudaries";
      mesh.body.force = new CANNON.Vec3(1, 1, 1);
      mesh.body.fixedRotation = true;
      mesh.body.collisionResponse = true;
      mesh.body.updateMassProperties();
      mesh.body.sleepSpeedLimit = 0;
      mesh.body.sleepTimeLimit = 0;
      mesh.body.quaternion.copy(mesh.quaternion);

      this.meshes.spheres.forEach(element => {
        const mat = new CANNON.ContactMaterial(
          element.body.material,
          mesh.body.material,
          { friction: .3, restitution: .9 }
        );
        this.world.addContactMaterial(mat);
      });

      this.world.addBody(mesh.body);
    }

    const geometryfloor = new THREE.CircleGeometry(3, 32);
    const circle = new THREE.Mesh(geometryfloor, this.ringMesh.material);
    circle.receiveShadow = true;
    circle.rotateX(-Math.PI / 2);
    circle.position.set(0, 0.01, 0);
    this.scene.add(circle);

    this.ringMesh.instanceMatrix.needsUpdate = false;
    this.scene.add(this.ringMesh);
  }

  addBox() {
    const material = new MeshStandardMaterial({ color: 0x00ffff });
    const floorShape = this.createShape();

    this.createHole(floorShape, 0, 0);

    const geometry = new ExtrudeGeometry(floorShape, {
      depth: 0,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 0,
      bevelSize: 0,
      bevelThickness: .5,
      curveSegments: 32,
    });

    const m = new MeshStandardMaterial({
      color: '#ffffff',
      metalness: .5,
      emissive: 0x0,
      roughness: 1,
    });

    const mesh = new Mesh(geometry, m);
    mesh.needsUpdate = true;
    mesh.receiveShadow = true;
    mesh.rotation.set(Math.PI * 0.5, 0, 0);
    mesh.position.set(0, .5, 0);

    // this.scene.add(mesh);
  }

  onMouseMove({ clientX, clientY }) {
    this.mouse3D.x = (clientX / this.width) * 2 - 1;
    this.mouse3D.y = -(clientY / this.height) * 2 + 1;
  }

  onMouseDown({ code }) {

    if (code.toLowerCase() === "space") {
      this.interval = setTimeout(() => {
        this.addSpheres(this.pointerDebugger.position);
      }, 10);
    }
  }

  onKeyup() {
    clearTimeout(this.interval);
  }

  addPropeller() {
    const width = 4.8, height = 1, depth = .1;
    const geometry = new BoxGeometry(width, height, depth);

    const mesh = new Mesh(geometry, this.meshes.material);
    this.meshes.propeller = mesh;

    mesh.container = new Object3D();
    mesh.dummies = [];

    const w = .1;

    for (let index = 0; index < 50; index++) {
      const dummie = new Mesh(new BoxGeometry(.2, height, depth), this.meshes.material);
      dummie.position.set((w * index) - (width * .48), height * .5, 0);
      mesh.dummies.push(dummie);
      mesh.container.add(dummie);
      dummie.castShadow = true;
      dummie.receiveShadow = true;

      dummie.body = new CANNON.Body({
        mass: 0,
        force: new CANNON.Vec3(10, 10, 1),
        material: new CANNON.Material({ friction: .3, restitution: .1 }),
        shape: new CANNON.Box(new CANNON.Vec3(.1, height * .5, depth * .5)),
        position: new CANNON.Vec3((w * index) - (width * .48), height * .5, 0),
        collisionResponse: true,
        volume: 1,
      });

      this.world.addBody(dummie.body);
    }

    // physics obstacle
    // mesh.body = new CANNON.Body({
    //   mass: 0,
    //   force: new CANNON.Vec3(10, 10, 1),
    //   material: new CANNON.Material({ friction: .3, restitution: .1 }),
    //   shape: new CANNON.Box(new CANNON.Vec3(width * .5, height * .5, .3)),
    //   position: new CANNON.Vec3(0, height * .5, 0),
    //   collisionResponse: true,
    // });

    // mesh.body.volume = 10;

    // this.world.addBody(mesh.body);

    this.scene.add(mesh.container);
  }

  addSpheres(pointer) {
    const radius = .2, width = 32, height = 32;
    const geometry = new SphereGeometry(radius, width, height);
    const halfsphere = new THREE.SphereGeometry(radius, 16, 16, 0, 3.15);

    for (let index = 0; index < 1; index++) {
      const mesh = new THREE.Mesh(
        geometry,
        this.meshes.sphereBaseMaterial,
      );

      this.meshes.spheres.push(mesh);

      mesh.material.name = "sphere";
      mesh.material.needsUpdate = false;
      mesh.material.opacity = 0;
      mesh.material.alphaTest = 1;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const leftSide = new THREE.Mesh(
        halfsphere,
        this.meshes.sphereLeftSideMaterial,
      );

      leftSide.rotation.y = MathUtils.degToRad(-90);

      mesh.add(leftSide);

      const rightSide = new THREE.Mesh(
        halfsphere,
        this.meshes.sphereRightSideMaterial,
      );
      rightSide.rotation.y = MathUtils.degToRad(90);

      mesh.add(rightSide);

      mesh.position.set(pointer.x, 0, pointer.z);

      // physics mesh
      mesh.body = new CANNON.Body({
        mass: 1,
        material: new CANNON.Material(),
        shape: new CANNON.Sphere(radius),
        position: new CANNON.Vec3(pointer.x, mesh.position.y, pointer.z),
        dampingFactor: 1,
        sleepSpeedLimit: 1,
        sleepTimeLimit: 1,
      });

      mesh.body.material.name = "sphere";
      mesh.body.fixedRotation = true;
      // mesh.body.collisionResponse = true;

      this.world.addBody(mesh.body);

      const contactMaterial = new CANNON.ContactMaterial(
        this.floor.body.material,
        mesh.body.material,
        { friction: 1, restitution: .6 }
      );

      this.world.addContactMaterial(contactMaterial);

      this.meshes.propeller.dummies.forEach(element => {
        const matp = new CANNON.ContactMaterial(
          element.body.material,
          mesh.body.material,
          { friction: .1, restitution: .1 }
        );

        this.world.addContactMaterial(matp);
      });

      this.scene.add(mesh);
    }
  }

  addWindowListeners() {
    window.addEventListener('resize', this.onResize.bind(this), { passive: true });

    window.addEventListener('visibilitychange', (evt) => {
      if (evt.target.hidden) {
        console.log('pause');
      } else {
        console.log('play');
      }
    }, false);
  }

  addStatsMonitor() {
    this.stats = new Stats();
    this.stats.showPanel(0);

    document.body.appendChild(this.stats.dom);
  }

  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  animate() {
    this.raycaster.setFromCamera(this.mouse3D, this.camera);
    const intersects = this.raycaster.intersectObjects([this.floor]);

    if (intersects.length) {
      const { x, y, z } = intersects[0].point;

      this.pointerDebugger.position.set(x, y, z);
    }


    this.stats.begin();
    this.orbitControl.update();

    this.meshes.propeller.container.rotation.y -= this.velocity;

    this.debug && this.cannonDebugRenderer.update();
    this.meshes.spheres.forEach((s, index) => {
      s.position.copy(s.body.position);
      s.quaternion.copy(s.body.quaternion);

      if (s.body.position.distanceTo(this.meshes.propeller.container.position) > 20) {
        this.world.removeBody(s.body);
        this.scene.remove(s);

        this.meshes.spheres.splice(index, 1);
      }
    });


    // this.meshes.propeller.dummies.forEach((dummie, index) => {
    //   const position = dummie.getWorldPosition(new THREE.Vector3());
    //   const quaternion = dummie.getWorldQuaternion(new THREE.Quaternion());

    //   dummie.body.position.copy(position);
    //   dummie.body.quaternion.copy(quaternion);

    // });

    this.world.fixedStep();

    this.renderer.render(this.scene, this.camera);

    this.stats.end();

    requestAnimationFrame(this.animate.bind(this));
  }
}

export default App;
