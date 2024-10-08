import { Controller } from '@hotwired/stimulus';
import gsap from 'gsap';
import * as THREE from 'three';
import * as dat from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import HeightMap from '/assets/heightmap.png';
import Star from '/assets/star.png';
import metalTexture from '/assets/metal.jpg';

export default class extends Controller {
  static targets = ['container', 'veil'];

  scene!: THREE.Scene;
  renderer!: THREE.WebGLRenderer;
  camera!: THREE.PerspectiveCamera;
  textureLoader!: THREE.TextureLoader;
  controls!: OrbitControls;

  meshGroup: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial, THREE.Object3DEventMap>[] = [];
  lineGroup: Line2[] = [];
  meshMaterial!: THREE.MeshStandardMaterial;
  lineMaterial!: LineMaterial;

  primitives: THREE.Mesh<any>[] = [];
  activeModelIndex: number = 0;
  isAnimationFinished: boolean = true;

  gui!: dat.GUI;
  stats!: Stats;

  params = {
    speed: 1,
    meshEmissive: 0xffffff,
    lineWidth: 0.02,
    lineColor: 0x999999,
  };

  terrainWidth = 30;
  terrainHeight = 30;

  numOfMeshSets = 6;

  mouseX: null | number = null;
  mouseY: null | number = null;

  initialize() {
    if (this.hasContainerTarget && this.hasVeilTarget) {
      this.scene = new THREE.Scene();
      this.renderer = this.createRenderer({ antialias: true, logarithmicDepthBuffer: true, alpha: true });
      this.camera = this.createCamera(70, 1, 120, { x: 0, y: 0, z: 2.4 });
      this.textureLoader = new THREE.TextureLoader();
      window.addEventListener('resize', this.resize);
      this.containerTarget.addEventListener('wheel', this.wheelHandler);
      this.containerTarget.addEventListener('mousemove', this.mouseHandler);
      this.run();
    }
  }

  run() {
    this.containerTarget.appendChild(this.renderer.domElement);

    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);

      const delta = clock.getDelta();

      this.updateScene(delta);

      this.renderer.render(this.scene, this.camera);
    };

    this.initScene()
      .then(() => {
        this.veilTarget.style.opacity = '0';
        return true;
      })
      .then(animate)
      .then(() => {
        this.renderer.info.reset();
        console.log('Renderer info', this.renderer.info);
      })
      .catch((error) => {
        console.log(error);
      });
  }

  async initScene() {
    const planeGeometries = [];
    const lineGeometries = [];
    const geometryPositionsArray = [];

    for (let i = 0; i < 2; i++) {
      const hm_image = await this.loadImage(HeightMap);

      const canvas = document.createElement('canvas');
      canvas.width = hm_image.width;
      canvas.height = hm_image.height;
      const context = canvas.getContext('2d');

      if (!context) return;

      context.drawImage(hm_image, 0, 0);
      const hm_imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      const planeGeometry = new THREE.PlaneGeometry(
        this.terrainWidth,
        this.terrainHeight,
        this.terrainWidth,
        this.terrainHeight,
      );

      const geometryPositions = planeGeometry.getAttribute('position').array;
      const geometryUVs = planeGeometry.getAttribute('uv').array;

      for (let index = 0; index < geometryUVs.length / 2; index++) {
        const vertexU = geometryUVs[index * 2];
        const vertexV = geometryUVs[index * 2 + 1];
        const terrainHeight = this.getZFromImageDataPoint(
          hm_imageData,
          i == 0 ? vertexU : 1 - vertexU,
          vertexV,
          canvas.width,
          canvas.height,
        );
        geometryPositions[index * 3 + 2] = terrainHeight;
      }

      const shearMtx = new THREE.Matrix4();
      shearMtx.makeShear(-0.5, 0, 0, 0, 0, 0);
      planeGeometry.applyMatrix4(shearMtx);

      planeGeometries.push(planeGeometry);
      geometryPositionsArray.push(geometryPositions);
    }

    for (let index = 0; index <= this.terrainWidth; index++) {
      let bottomOffset = (this.terrainWidth + 1) * this.terrainHeight;
      geometryPositionsArray[1][(bottomOffset + index) * 3 + 2] = geometryPositionsArray[0][index * 3 + 2];
      geometryPositionsArray[0][(bottomOffset + index) * 3 + 2] = geometryPositionsArray[1][index * 3 + 2];
    }

    this.meshMaterial = new THREE.MeshStandardMaterial({
      emissive: new THREE.Color(this.params.meshEmissive),
      flatShading: true,
    });

    for (let i = 0; i < 2; i++) {
      let lineGeometry = new LineGeometry();
      let linePositions = [];
      for (let row = 0; row < this.terrainHeight; row++) {
        let isEvenRow = row % 2 == 0;
        for (
          let col = isEvenRow ? 0 : this.terrainWidth - 1;
          isEvenRow ? col < this.terrainWidth : col >= 0;
          isEvenRow ? col++ : col--
        ) {
          for (let point = isEvenRow ? 0 : 3; isEvenRow ? point < 4 : point >= 0; isEvenRow ? point++ : point--) {
            let mappedIndex;
            let rowOffset = row * (this.terrainWidth + 1);
            if (point < 2) {
              mappedIndex = rowOffset + col + point;
            } else {
              mappedIndex = rowOffset + col + point + this.terrainWidth - 1;
            }

            linePositions.push(geometryPositionsArray[i][mappedIndex * 3]);
            linePositions.push(geometryPositionsArray[i][mappedIndex * 3 + 1]);
            linePositions.push(geometryPositionsArray[i][mappedIndex * 3 + 2]);
          }
        }
      }

      lineGeometry.setPositions(linePositions);

      lineGeometries.push(lineGeometry);
    }

    this.lineMaterial = new LineMaterial({
      color: this.params.lineColor,
      linewidth: this.params.lineWidth,
      alphaToCoverage: false,
      worldUnits: true,
    });

    for (let i = 0; i < this.numOfMeshSets; i++) {
      let mesh = new THREE.Mesh(planeGeometries[i % 2], this.meshMaterial);
      let line = new Line2(lineGeometries[i % 2], this.lineMaterial);
      line.computeLineDistances();
      mesh.position.set(0, -1.5, -this.terrainHeight * i);
      mesh.rotation.x -= Math.PI / 2;
      line.position.set(0, -1.5, -this.terrainHeight * i);
      line.rotation.x -= Math.PI / 2;
      this.scene.add(mesh);
      this.scene.add(line);
      this.meshGroup.push(mesh);
      this.lineGroup.push(line);
    }

    this.createPrimitives();
    this.addBackground();
    this.createGuiControls();
    this.createStats();
  }

  createRenderer(
    rendererProps: THREE.WebGLRendererParameters = {},
    configureRenderer?: (renderer: THREE.WebGLRenderer) => {},
  ) {
    const renderer = new THREE.WebGLRenderer(rendererProps);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.classList.add('pointer-events-none');

    if (configureRenderer) configureRenderer(renderer);

    return renderer;
  }

  createCamera(
    fov = 45,
    near = 0.1,
    far = 100,
    camPos = { x: 0, y: 0, z: 5 },
    camLookAt = { x: 0, y: 0, z: 0 },
    aspect = window.innerWidth / window.innerHeight,
  ) {
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(camPos.x, camPos.y, camPos.z);
    camera.lookAt(camLookAt.x, camLookAt.y, camLookAt.z);
    camera.updateProjectionMatrix();
    return camera;
  }

  createOrbitControls() {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);

    controls.enableDamping = true;
    controls.enablePan = false;

    controls.minDistance = 5;
    controls.maxDistance = 5;

    controls.maxPolarAngle = Math.PI / 2;

    controls.maxAzimuthAngle = Math.PI / 6;
    controls.minAzimuthAngle = -Math.PI / 6;

    return controls;
  }

  addBackground() {
    const textureLoader = new THREE.TextureLoader();
    const backgroundTexture = textureLoader.load(Star);

    const backgroundGeometry = new THREE.PlaneGeometry(60, 60); // Adjust size as needed
    const backgroundMaterial = new THREE.MeshBasicMaterial({
      map: backgroundTexture,
      transparent: true,
    });

    const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);

    backgroundMesh.position.set(0, 10, -80);

    this.camera.add(backgroundMesh);

    this.scene.add(this.camera);
  }

  createGuiControls() {
    this.gui = new dat.GUI();
    this.gui.add(this.params, 'speed', 1, 10, 0.5).name('speed');
    this.gui.domElement.parentElement!.classList.add('!z-10');

    this.gui.close();

    const planeFolder = this.gui.addFolder('Плоскость');
    planeFolder.open();

    planeFolder
      .addColor(this.params, 'meshEmissive')
      .name('emissive')
      .onChange((val) => {
        this.meshMaterial.emissive.set(val);
      });

    planeFolder
      .addColor(this.params, 'lineColor')
      .name('line color')
      .onChange((val) => {
        this.lineMaterial.color.set(val);
      });

    planeFolder
      .add(this.params, 'lineWidth', 0, 0.1, 0.01)
      .name('line width')
      .onChange((val) => {
        this.lineMaterial.linewidth = val;
      });
  }

  createPrimitives() {
    const texture = this.textureLoader.load(metalTexture);
    const material = new THREE.MeshBasicMaterial({ map: texture });

    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), material);
    sphere.position.set(0, 0, -1.7);
    this.scene.add(sphere);

    const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    cube.position.set(0, 0, -150);
    this.scene.add(cube);

    const pyramid = new THREE.Mesh(new THREE.TetrahedronGeometry(0.8), material);
    pyramid.position.set(0, 0, -150);
    this.scene.add(pyramid);

    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.5, 32), material);
    cone.position.set(0, 0, -150);
    this.scene.add(cone);

    this.primitives = [sphere, cube, pyramid, cone];

    this.primitives.slice(2).forEach((model) => {
      this.toggleModelVisibility(model, false);
    });
  }

  animateModels() {
    if (!this.isAnimationFinished) return;

    this.isAnimationFinished = false;

    const timeline = gsap.timeline();

    this.activeModelIndex = (this.activeModelIndex + 1) % this.primitives.length;
    const previousModelIndex = (this.activeModelIndex - 1 + this.primitives.length) % this.primitives.length;

    const currentModelIndex = this.activeModelIndex;
    const nextModelIndex = (this.activeModelIndex + 1 + this.primitives.length) % this.primitives.length;

    const currentModel = this.primitives[currentModelIndex];
    const previousModel = this.primitives[previousModelIndex];
    const nextModel = this.primitives[nextModelIndex];

    timeline
      .to(this.params, {
        speed: 29,
        duration: 0.5,
        ease: 'power2.out',
      })
      .to(
        previousModel.position,
        {
          z: 6,
          y: -3,
          delay: 0.1,
          duration: 1,
          onComplete: () => {
            this.toggleModelVisibility(previousModel, false);
          },
        },
        '<',
      )
      .to(
        currentModel.position,
        {
          z: -1.7,
          y: 0,
          duration: 1,
          onStart: () => {
            this.toggleModelVisibility(nextModel, true);
          },
          onComplete: () => {
            previousModel.position.z = -150;
            this.toggleModelVisibility(previousModel, false);
            this.isAnimationFinished = true;
          },
        },
        '<',
      )
      .to(
        nextModel.position,
        {
          duration: 1,
          z: -150,
          y: 0,
        },
        '<',
      )
      .to(this.params, { speed: 1, delay: 0.5, duration: 0.5, ease: 'power2.in' }, '<');
  }

  toggleModelVisibility(model: THREE.Mesh, show: boolean) {
    model.visible = show;
  }

  createStats() {
    this.stats = new Stats();
    this.stats.showPanel(0);
    document.body.appendChild(this.stats.dom);
  }

  rotateCamera() {
    if (this.mouseX === null || this.mouseY === null) return;

    const factorX = this.mouseX / this.containerTarget.clientWidth - 0.5;
    const factorY = this.mouseY / this.containerTarget.clientHeight - 0.5;

    const maxRotationAngle = Math.PI / 10;

    gsap.to(this.camera.rotation, {
      x: factorY * maxRotationAngle,
      y: factorX * maxRotationAngle,
      ease: 'bounce.inOut',
      duration: 1,
    });
  }

  updateScene(interval: number) {
    this.stats.update();
    this.rotateCamera();

    for (let i = 0; i < this.numOfMeshSets; i++) {
      this.meshGroup[i].position.z += interval * this.params.speed;
      this.lineGroup[i].position.z += interval * this.params.speed;
      if (this.meshGroup[i].position.z >= this.terrainHeight) {
        this.meshGroup[i].position.z -= this.numOfMeshSets * this.terrainHeight;
        this.lineGroup[i].position.z -= this.numOfMeshSets * this.terrainHeight;
      }
    }
  }

  loadImage(path: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'Anonymous';
      image.src = path;
      image.onload = () => {
        resolve(image);
      };
      image.onerror = (e) => {
        reject(e);
      };
    });
  }

  getZFromImageDataPoint(imageData: ImageData, u: number, v: number, cvWidth: number, cvHeight: number) {
    const mapWidth = cvWidth;
    const mapHeight = cvHeight;
    const displacementScale = 5;
    const x = Math.round(u * (mapWidth - 1));
    const y = Math.round((1 - v) * (mapHeight - 1));
    const index = (y * imageData.width + x) * 4;
    const red = imageData.data[index];
    return (red / 255) * displacementScale;
  }

  resize = () => {
    this.camera.aspect = this.containerTarget.clientWidth / this.containerTarget.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.containerTarget.clientWidth, this.containerTarget.clientHeight);
  };

  wheelHandler = (event: WheelEvent) => {
    const threshold = 20;

    if (event.deltaY > threshold) {
      this.animateModels();
    }
  };

  mouseHandler = (event: MouseEvent) => {
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
  };

  declare readonly hasContainerTarget: boolean;
  declare readonly containerTarget: HTMLDivElement;
  declare readonly hasVeilTarget: boolean;
  declare readonly veilTarget: HTMLDivElement;
}
