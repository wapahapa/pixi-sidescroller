import styles from './styles/styles.css';

import * as PIXI from 'pixi.js';

import splashURI from './assets/img/rocket_space_splash.png';


let renderType = "WebGL";
if (!PIXI.utils.isWebGLSupported()) {
    renderType = "canvas";
}
PIXI.utils.sayHello(renderType);


let app = new PIXI.Application({width: 800, height: 600})

document.getElementById("app").appendChild(app.view);

PIXI.loader
    .add("splashRocket", splashURI)
    .load(setup);

function setup() {
    let splashScreen = new PIXI.Sprite(PIXI.loader.resources.splashRocket.texture);

    app.stage.addChild(splashScreen);
}

