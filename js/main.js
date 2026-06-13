import { Game } from './game.js';
import * as UI from './ui.js';
import { initAudio } from './audio.js';

initAudio();
const canvas = document.getElementById('game');
const game = new Game(canvas);
window.__g = game; // debug/inspection hook
game.start();
UI.titleScreen();
