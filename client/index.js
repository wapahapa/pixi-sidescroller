import styles from './styles/styles.css';

import * as PIXI from 'pixi.js';

let renderType = "WebGL";
if (!PIXI.utils.isWebGLSupported()) {
    renderType = "canvas";
}

PIXI.utils.sayHello(renderType);