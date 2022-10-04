import './style.css';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import Stats from 'stats-js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import {
  rgbToHex,
} from './helpers';

const {
  Scene,
  Object3D,
  Color,
  WebGLRenderer,
  MathUtils,
  BoxGeometry,
  PCFSoftShadowMap,
  PerspectiveCamera,
  AxesHelper,
  AmbientLight,
  DirectionalLight,
  GridHelper,
  PlaneGeometry,
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
    this.addFloor();
    this.addFloorGrid();
    this.addFloorHelper();
    this.addBox();
    this.addSphere();
    this.addPropeller();
    this.addInnerBoudaries();
    this.addAxisHelper();
    this.addStatsMonitor();
    this.addWindowListeners();
    this.animate();
  }

  addPhysicsWorld() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -10, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;
    this.world.defaultContactMaterial.contactEquationStiffness = 1e6;
    // this.world.defaultContactMaterial.contactEquationRelaxation = 3;
    this.world.allowSleep = true;

    this.cannonDebugRenderer = new CannonDebugger(this.scene, this.world);
  }

  clearBody() {
    while (document.body.childNodes.length) {
      document.body.removeChild(document.body.lastChild);
    }
  }

  setup() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.debug = true;

    this.colors = {
      background: rgbToHex(window.getComputedStyle(document.body).backgroundColor),
      floor: '#ff00ff',
      ball: '#5661ff',
      ambientLight: '#ffffff',
      directionalLight: '#ffffff',
    };

    this.meshes = {
      container: new Object3D(),
      spheres: [],
      propeller: null,
      sphereMaterial: new MeshStandardMaterial({
        color: this.colors.ball,
        metalness: .11,
        emissive: 0x0,
        roughness: .1,
      }),
    };
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
    this.camera.position.set(0, 10, 50);

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
    this.directionalLight.position.set(0, 13, 0);
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
    const size = 20;
    const divisions = 20;
    this.grid = new GridHelper(size, divisions, this.colors.grid, this.colors.grid);

    this.grid.position.set(0, 0, 0);
    this.grid.material.opacity = 0;
    this.grid.material.transparent = false;

    this.scene.add(this.grid);
  }

  addFloor() {
    const geometry = new PlaneGeometry(20, 20);
    const material = new MeshStandardMaterial({ color: this.colors.floor, side: DoubleSide });

    this.floor = new Mesh(geometry, material);
    this.floor.position.y = 0;
    this.floor.position.z = 0;
    this.floor.rotateX(Math.PI / 2);
    this.floor.receiveShadow = true;

    // physics floor
    this.floor.body = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(0, 0, 5),
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
    const size = 5;
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

    shape.holes.push(holePath);
  }

  addInnerBoudaries() {
    const width = .3, height = 1, depth = .05;
    const geometry = new BoxGeometry(width, height, depth);
    const count = 60;

    for (let index = 0; index < count; index++) {
      const mesh = new Mesh(geometry, this.meshes.sphereMaterial);
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

      // physics obstacle
      mesh.body = new CANNON.Body({
        mass: 0,
        material: new CANNON.Material(),
        shape: new CANNON.Box(new CANNON.Vec3(width * .5, height * .5, depth * .5)),
        position: new CANNON.Vec3(sin, height * .5, cos),
      });

      mesh.body.quaternion.copy(mesh.quaternion);

      const mat = new CANNON.ContactMaterial(
        this.meshes.spheres[0].body.material,
        mesh.body.material,
        { friction: 0, restitution: .9 }
      );
      this.world.addContactMaterial(mat);

      this.world.addBody(mesh.body);
      this.scene.add(mesh);
    }
  }

  addBox() {
    const material = new MeshStandardMaterial({ color: 0x00ffff });
    const floorShape = this.createShape();

    this.createHole(floorShape, 0, 0);

    const geometry = new ExtrudeGeometry(floorShape, {
      steps: 1,
      depth: 1,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0,
      bevelOffset: 0,
      bevelSegments: 1
    });

    const mesh = new Mesh(geometry, material);
    mesh.needsUpdate = true;

    mesh.rotation.set(Math.PI * 0.5, 0, 0);
    mesh.position.set(0, 1, 0);

    this.scene.add(mesh);
  }

  addPropeller() {
    const width = 5.8, height = 1, depth = .1;
    const geometry = new BoxGeometry(width, height, depth);

    const mesh = new Mesh(geometry, this.meshes.sphereMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(0, height * .5, 0);

    // physics obstacle
    mesh.body = new CANNON.Body({
      mass: 0,
      material: new CANNON.Material(),
      shape: new CANNON.Box(new CANNON.Vec3(width * .5, height * .5, depth * .5)),
      position: new CANNON.Vec3(0, height * .5, 0),
    });

    mesh.body.quaternion.setFromAxisAngle(
      new CANNON.Vec3(0, 0, -1),
      MathUtils.degToRad(0)
    );
    this.world.addBody(mesh.body);

    const mat = new CANNON.ContactMaterial(
      this.meshes.spheres[0].body.material,
      mesh.body.material,
      { friction: 0, restitution: 0.9 }
    );
    this.world.addContactMaterial(mat);

    this.meshes.propeller = mesh;

    this.scene.add(mesh);
  }

  addSphere(x = 0, y = 1, z = 1) {
    const radius = .2, width = 32, height = 32;
    const geometry = new SphereGeometry(radius, width, height);

    const mesh = new Mesh(geometry, this.meshes.sphereMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this.meshes.spheres.push(mesh);

    mesh.position.set(x, y, z);

    // physics sphere
    mesh.body = new CANNON.Body({
      mass: 1,
      material: new CANNON.Material(),
      shape: new CANNON.Sphere(radius),
      position: new CANNON.Vec3(x, y, z)
    });


    mesh.body.linearDamping = .1;
    // mesh.body.fixedRotation = true;

    this.world.addBody(mesh.body);

    const contactMaterial = new CANNON.ContactMaterial(
      this.floor.body.material,
      mesh.body.material,
      { friction: 0, restitution: 0.9 }
    );

    this.world.addContactMaterial(contactMaterial);

    this.scene.add(mesh);
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
    this.stats.begin();
    this.orbitControl.update();

    this.meshes.propeller.rotation.y += .03;

    this.debug && this.cannonDebugRenderer.update();
    this.world.fixedStep()
    this.meshes.spheres.forEach((s) => {
      s.position.copy(s.body.position);
      s.quaternion.copy(s.body.quaternion);
    });

    this.meshes.propeller.body.position.copy(this.meshes.propeller.position);
    this.meshes.propeller.body.quaternion.copy(this.meshes.propeller.quaternion);

    this.renderer.render(this.scene, this.camera);

    this.stats.end();

    requestAnimationFrame(this.animate.bind(this));
  }
}

export default App;
