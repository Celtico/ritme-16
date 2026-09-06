/**
 * L'escena 3D. Sense React a dins: rep un canvas i un estat, i prou.
 *
 * three s'importa dinàmicament, com Tone: el mòdul no s'avalua fins que algú
 * obre la pestanya, i mai durant el renderitzat de servidor.
 */

type ThreeModule = typeof import("three");

export interface VisualTrack {
  id: string;
  /** Nom d'un color de la paleta; es llegeix de les variables CSS. */
  color: string;
  steps: number[];
}

export interface VisualState {
  length: number;
  tracks: VisualTrack[];
  /** Posició del transport en passos, amb decimals, per girar sense salts. */
  stepFloat: number;
  /** Nivell de cada pista, 0..1, tal com el donen els Tone.Meter. */
  levels: Record<string, number>;
  playing: boolean;
}

export const MAX_INSTANCES = 32 * 16;

/** Llegeix un color de la paleta perquè el 3D no dupliqui cap hex. */
function paletteColor(name: string, fallback = "#888888"): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(`--color-${name}`)
    .trim();
  return v || fallback;
}

export class Scene {
  private canvas: HTMLCanvasElement;
  private THREE: ThreeModule | null = null;
  private renderer: import("three").WebGLRenderer | null = null;
  private scene: import("three").Scene | null = null;
  private camera: import("three").PerspectiveCamera | null = null;
  private grup: import("three").Group | null = null;
  private llums: import("three").Object3D[] = [];

  /** Òrbita de la càmera, en radians. */
  private estat: VisualState | null = null;
  private orbit = { theta: 0, phi: 0.42 };
  private readonly orbitInicial = { theta: 0, phi: 0.42 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async init(): Promise<void> {
    if (this.THREE) return;
    const THREE = await import("three");
    this.THREE = THREE;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    // per damunt d'1,5 no es distingeix i costa el doble
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

    const ambient = new THREE.AmbientLight(
      new THREE.Color(paletteColor("panel-hi", "#efe9db")),
      1.1,
    );
    const direccional = new THREE.DirectionalLight(
      new THREE.Color(paletteColor("ochre", "#c98a2b")),
      1.6,
    );
    direccional.position.set(3, 6, 4);
    this.scene.add(ambient, direccional);
    this.llums = [ambient, direccional];

    this.grup = new THREE.Group();
    this.scene.add(this.grup);
  }

  resize(width: number, height: number): void {
    if (!this.renderer || !this.camera) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  /** Òrbita amb el ratolí. La càmera no s'acosta ni s'allunya. */
  orbita(dx: number, dy: number): void {
    this.orbit.theta -= dx * 0.006;
    this.orbit.phi = Math.max(-0.2, Math.min(1.1, this.orbit.phi - dy * 0.005));
  }

  restauraCamera(): void {
    this.orbit = { ...this.orbitInicial };
  }

  update(state: VisualState | null): void {
    // la geometria arriba al commit següent; de moment només es guarda
    // l'últim estat vist perquè el bucle de dibuix ja el pugui enviar
    this.estat = state;
  }

  render(): void {
    if (!this.renderer || !this.scene || !this.camera) return;
    const r = 9;
    const { theta, phi } = this.orbit;
    this.camera.position.set(
      Math.sin(theta) * Math.cos(phi) * r,
      Math.sin(phi) * r + 1.5,
      Math.cos(theta) * Math.cos(phi) * r,
    );
    this.camera.lookAt(0, 0.6, 0);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.grup?.clear();
    for (const l of this.llums) l.removeFromParent();
    this.llums = [];
    this.scene?.clear();
    this.renderer?.dispose();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.grup = null;
    this.THREE = null;
    this.estat = null;
  }
}

export { paletteColor };
