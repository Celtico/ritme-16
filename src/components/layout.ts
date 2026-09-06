/**
 * Les mesures que han de compartir la graella de passos i la llista de
 * pistes. Viuen aquí i no repetides a cada component perquè si no es
 * desalineen: la fila 8 d'una banda ha de caure al mateix píxel que la fila 8
 * de l'altra.
 */
export const ROW_HEIGHT = 36;
export const ROW_GAP = 6;
export const RULER_HEIGHT = 18;

/** Amplada per defecte i mínima de la llista de pistes, en píxels. */
export const LIST_WIDTH = 280;
export const LIST_MIN = 200;
export const LIST_MAX = 420;

/** Alçada per defecte i mínima del panell inferior. */
export const PANEL_HEIGHT = 320;
export const PANEL_MIN = 160;
