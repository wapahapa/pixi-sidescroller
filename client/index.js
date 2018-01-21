import styles from './styles/styles.css';

import * as PIXI from 'pixi.js';

//splashscreen img imports
import splashURI from './assets/img/rocket_space_splash.png';

//game container img imports
import bg_farURI from './assets/img/back_bg.jpg';
import bg_closeURI from './assets/img/front_bg.png';
import blue_shipURI from './assets/img/blue_ship.png';
import green_enemyURI from './assets/img/green_enemy_ship.png';


let renderType = "WebGL";
if (!PIXI.utils.isWebGLSupported()) {
    renderType = "canvas";
}
PIXI.utils.sayHello(renderType);

let resources = PIXI.loader.resources;
let TextureCache = PIXI.utils.TextureCache;

let app = new PIXI.Application({
        width: 800,
        height: 600,
        antialias: true
})

document.getElementById("app").appendChild(app.view);

PIXI.loader
    .add("splashRocket", splashURI)
    .add("bgFar", bg_farURI)
    .add("bgClose", bg_closeURI)
    .add("blueShip", blue_shipURI)
    .add("greenEnemy", green_enemyURI)
    .load(setup);

const sceneSwitch = (currScene, nextScene) => {
        currScene.visible = false;
        nextScene.visible = true;
}


// fades container in or out then fires callback on end
// function(PIXI.Container, callback on Fade end, true=fadeIn false=fadeOut, 0 < alphaModifier < 1)
const containerFade = function(container, callback, fadeIn, alphaModifier)  {
    let alphaMod;
    fadeIn === true ? alphaMod = alphaModifier : alphaMod = -alphaModifier;

    let fadeAnim = function() {
        let frameCall = requestAnimationFrame(fadeAnim)
        if (container.alpha < 0 || container.alpha > 1) {
            callback();
            cancelAnimationFrame(frameCall);                               
        }
        else {
            container.alpha += alphaMod;
        }
    }
    fadeAnim();
}
function setup() {

    let splashContainer = new PIXI.Container();
    let splashScreen = new PIXI.Sprite(PIXI.loader.resources.splashRocket.texture);
    splashContainer.alpha = 1;
    splashContainer.addChild(splashScreen);
    containerFade(splashContainer, ()=>{console.log("hello")}, false, 0.015);


    let gameContainer = new PIXI.Container();
    let mainGame = () => {

        const bgScroll = (bgSprite, speed) => {
            bgSprite
        }
        let bgFar = new PIXI.Sprite(PIXI.loader.resources.bgFar.texture);

        let bgClose = new PIXI.Sprite(PIXI.loader.resources.bgClose.texture);
        let bgClose2 = new PIXI.Sprite(PIXI.loader.resources.bgClose.texture);
        bgClose.y = app.renderer.height - bgClose.height;

        let blueShip = new PIXI.Sprite(PIXI.loader.resources.blueShip.texture);
        let enemyShip = new PIXI.Sprite(PIXI.loader.resources.greenEnemy.texture);

        gameContainer.addChild(bgFar, bgClose, blueShip, enemyShip);
    }
    mainGame();
    

    app.stage.addChild(gameContainer);
}



