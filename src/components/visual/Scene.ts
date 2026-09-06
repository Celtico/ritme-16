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

export const MAX_PASSOS = 32;
export const MAX_FILES = 16;
export const MAX_INSTANCES = MAX_PASSOS * MAX_FILES;

/** Mides del cilindre, en unitats de l'escena. */
const RADI = 3.4;
const SEPARACIO = 0.46;
const ALT = 0.34;
/** Els passos buits també es veuen, plans: si no, l'anell no es llegeix. */
const PLANXA = 0.06;
const GRUIX = 0.5;

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
  private llums: import("three").Light[] = [];
  private malla: import("three").InstancedMesh | null = null;
  private geo: import("three").BoxGeometry | null = null;
  private mat: import("three").MeshStandardMaterial | null = null;
  /** Firma del que hi ha pintat: mentre no canviï, no es refan els colors. */
  private firma = "";
  /** Cop per pista: puja amb el vúmetre i baixa en 120 ms. */
  private cops = new Map<string, number>();
  private darrer = 0;
  /** Objectes de treball: compondre matrius no ha d'assignar memòria. */
  private tmp: {
    pos: import("three").Vector3;
    esc: import("three").Vector3;
    quat: import("three").Quaternion;
    eix: import("three").Vector3;
    m: import("three").Matrix4;
    color: import("three").Color;
    apagat: import("three").Color;
    fons: import("three").Color;
  } | null = null;

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

    // La llum general surt del to clar de la paleta, que és clar als dos
    // temes; si fos --panel-hi, de nit no il·luminaria res.
    const ambient = new THREE.AmbientLight(
      new THREE.Color(paletteColor("on-accent", "#efe9db")),
      3,
    );
    const direccional = new THREE.DirectionalLight(
      new THREE.Color(paletteColor("ochre", "#c98a2b")),
      3,
    );
    direccional.position.set(3, 6, 4);
    this.scene.add(ambient, direccional);
    this.llums = [ambient, direccional];

    this.grup = new THREE.Group();
    this.scene.add(this.grup);

    // Una sola geometria per a tots els blocs. Les instàncies es reserven
    // totes d'entrada: canviar de ranura, de llargada o de pista només mou
    // matrius, no refà mai res.
    this.geo = new THREE.BoxGeometry(1, 1, 1);
    this.mat = new THREE.MeshStandardMaterial({
      roughness: 0.55,
      metalness: 0.12,
    });
    this.malla = new THREE.InstancedMesh(this.geo, this.mat, MAX_INSTANCES);
    this.malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.malla.frustumCulled = false;
    this.tmp = {
      pos: new THREE.Vector3(),
      esc: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
      eix: new THREE.Vector3(0, 1, 0),
      m: new THREE.Matrix4(),
      color: new THREE.Color(),
      apagat: new THREE.Color(),
      fons: new THREE.Color(),
    };
    this.grup.add(this.malla);
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
    this.estat = state;
    const THREE = this.THREE;
    const malla = this.malla;
    const tmp = this.tmp;
    if (!THREE || !malla || !this.grup || !tmp) return;

    const ara = performance.now();
    const dt = this.darrer ? Math.min(0.2, (ara - this.darrer) / 1000) : 0;
    this.darrer = ara;

    if (!state || state.tracks.length === 0 || state.length <= 0) {
      malla.count = 0;
      return;
    }

    const pistes = state.tracks.slice(0, MAX_FILES);
    const passos = Math.min(state.length, MAX_PASSOS);
    const pasActual = ((Math.floor(state.stepFloat) % passos) + passos) % passos;

    // El gir és continu: el pas amb decimals es converteix directament en
    // angle, així que entre pas i pas el cilindre no s'atura.
    this.grup.rotation.y = (-state.stepFloat / passos) * Math.PI * 2;

    // Els colors només es reescriuen quan canvia alguna cosa del patró; les
    // matrius, en canvi, cada fotograma, que és el que fa girar el cilindre.
    // El color del panell entra a la firma: si canvia, és que s'ha canviat
    // de tema i s'han de tornar a llegir tots els colors i les llums.
    const fons = paletteColor("panel", "#ddd4c0");
    const firma = `${fons}|${passos}|${pistes
      .map((t) => `${t.id}:${t.color}:${t.steps.slice(0, passos).join("")}`)
      .join(",")}`;
    const refesColors = firma !== this.firma;
    if (refesColors) {
      this.firma = firma;
      tmp.fons.set(fons);
      this.llums[0]?.color.set(paletteColor("on-accent", "#efe9db"));
      this.llums[1]?.color.set(paletteColor("ochre", "#c98a2b"));
    }

    const ampladaBloc = ((Math.PI * 2 * RADI) / passos) * 0.62;
    const base = -((pistes.length - 1) * SEPARACIO) / 2;

    let n = 0;
    for (let f = 0; f < pistes.length; f++) {
      const pista = pistes[f];
      // El vúmetre puja de cop i baixa sol: el retorn dura 120 ms.
      const nivell = Math.max(0, Math.min(1, state.levels[pista.id] ?? 0));
      const cop = Math.max(nivell, (this.cops.get(pista.id) ?? 0) - dt / 0.12);
      this.cops.set(pista.id, cop);

      const y = base + f * SEPARACIO;
      if (refesColors) {
        tmp.color.set(paletteColor(pista.color, "#888888"));
        // El pas buit s'acosta al fons del panell, no s'enfosqueix: de dia
        // ha de quedar més clar que el bloc, i de nit més fosc.
        tmp.apagat.copy(tmp.color).lerp(tmp.fons, 0.72);
      }

      for (let i = 0; i < passos; i++) {
        const cella = pista.steps[i] ?? 0;
        const angle = (i / passos) * Math.PI * 2;
        const accent = cella === 2;
        const alt = cella === 0 ? PLANXA : accent ? ALT * 1.75 : ALT;
        // Només creix el bloc que sona ara, i només si hi ha res al pas.
        const creix =
          cella !== 0 && i === pasActual && state.playing ? 1 + 0.3 * cop : 1;

        tmp.pos.set(
          Math.sin(angle) * RADI,
          y + (alt * creix) / 2 - PLANXA / 2,
          Math.cos(angle) * RADI,
        );
        tmp.quat.setFromAxisAngle(tmp.eix, angle);
        tmp.esc.set(ampladaBloc, alt * creix, GRUIX);
        tmp.m.compose(tmp.pos, tmp.quat, tmp.esc);
        malla.setMatrixAt(n, tmp.m);
        if (refesColors) {
          malla.setColorAt(n, cella === 0 ? tmp.apagat : tmp.color);
        }
        n++;
      }
    }

    malla.count = n;
    malla.instanceMatrix.needsUpdate = true;
    if (refesColors && malla.instanceColor) {
      malla.instanceColor.needsUpdate = true;
    }
  }

  render(): void {
    if (!this.renderer || !this.scene || !this.camera) return;
    const { theta, phi } = this.orbit;
    const r = this.distancia();
    this.camera.position.set(
      Math.sin(theta) * Math.cos(phi) * r,
      Math.sin(phi) * r,
      Math.cos(theta) * Math.cos(phi) * r,
    );
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * La càmera no té zoom: s'enretira just el que cal perquè hi càpiga el
   * cilindre sencer, que creix cap amunt amb cada pista i s'ha de veure
   * igual en un panell ample i baix que en un d'estret.
   */
  private distancia(): number {
    const cam = this.camera;
    if (!cam) return 9;
    const files = Math.min(this.estat?.tracks.length ?? 8, MAX_FILES);
    const alt = files * SEPARACIO + 1.2;
    const ample = RADI * 2 + GRUIX + 0.6;
    const fovY = (cam.fov * Math.PI) / 180;
    const fovX = 2 * Math.atan(Math.tan(fovY / 2) * Math.max(0.2, cam.aspect));
    // La cara del davant del cilindre és RADI més a prop que el centre: si
    // no se suma, els blocs de davant surten del quadre.
    return (
      Math.max(
        alt / 2 / Math.tan(fovY / 2),
        ample / 2 / Math.tan(fovX / 2),
      ) *
        1.2 +
      RADI
    );
  }

  dispose(): void {
    this.malla?.dispose();
    this.geo?.dispose();
    this.mat?.dispose();
    this.malla = null;
    this.geo = null;
    this.mat = null;
    this.tmp = null;
    this.cops.clear();
    this.firma = "";
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
