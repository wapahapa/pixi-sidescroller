import styles from './styles/styles.css';



import * as PIXI from 'pixi.js';

//Using webpack's url-loader to import our images and convert them to dataURI which PIXI loader can use.
//This allows the game to function from a single js file and eliminates the need for PIXI's AJAX calls which require a working server.

//splashscreen img imports
import splashURI from './assets/img/rocket_space_splash.png';

//game container img imports
import bg_farURI from './assets/img/back_bg.jpg';
import bg_closeURI from './assets/img/front_bg.png';


//texturePack imports
import gameTexturesPNG from './assets/img/texturepack/ship_planets.png';
import gameTexturesJSON from './assets/img/texturepack/ship_planets.json';

gameTexturesJSON.meta.image = gameTexturesPNG; //set JSON's image property to the source spritesheet png's dataURI
let gameTexturesURI = `data:application/json;base64,${btoa(JSON.stringify(gameTexturesJSON))}` //convert our JSON to dataURI



//*** HELPER FUNCTIONS ***
//random INT generator helper
const getRandomIntInclusive = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
// keyboard function takes ASCII keycode
function keyboard(keyCode) {
    let key = {};
    key.code = keyCode;
    key.isDown = false;
    key.isUp = true;
    key.press = undefined;
    key.release = undefined;

    key.downHandler = event => {
      if (event.keyCode === key.code) {
        if (key.isUp && key.press) key.press();
        key.isDown = true;
        key.isUp = false;
      }
      event.preventDefault();
    };
  
    key.upHandler = event => {
      if (event.keyCode === key.code) {
        if (key.isDown && key.release) key.release();
        key.isDown = false;
        key.isUp = true;
      }
      event.preventDefault();
    };
  
    window.addEventListener(
      "keydown", key.downHandler.bind(key), false
    );
    window.addEventListener(
      "keyup", key.upHandler.bind(key), false
    );
    return key;
  }

// fades container in or out then fires callback on end
// function(PIXI.Container, callback on Fade end, true=fadeIn false=fadeOut, 0 < alphaModifier < 1)
const containerFade = function(container, callback, fadeIn, alphaModifier)  {
    let alphaMod;
    fadeIn === true ? alphaMod = alphaModifier : alphaMod = -alphaModifier;

    let fadeAnim = function() {
        //let frameCall = requestAnimationFrame(fadeAnim) non pixi way
        if (container.alpha < 0 || container.alpha > 1) {
            callback();
            app.ticker.remove(fadeAnim);
            //cancelAnimationFrame(frameCall);                               
        }
        else {
            container.alpha += alphaMod;
        }
    }
    app.ticker.add(fadeAnim);
}


let app = new PIXI.Application({
        width: 800,
        height: 600,
        antialias: true
})

document.getElementById("app").appendChild(app.view);

PIXI.loader
    .add("splashRocket", splashURI)
    .add("gameTextures", gameTexturesURI)
    .add("starsBg", bg_farURI)
    .add("moonBg", bg_closeURI)
    .load(setup);

let splashContainer = new PIXI.Container();
let splashScreen;


let gameContainer = new PIXI.Container();

let gameBackgroundContainer = new PIXI.Container();
let bgPlanetBlack;
let bgPlanetGreen;
let bgFar;
let bgClose;

let gamePlayContainer = new PIXI.Container();
let playerObj;
let playerClone;
let playerShip;
let enemyShip;

let keyUp = keyboard(87);
let keyLeft = keyboard(65);
let keyDown = keyboard(83);
let keyRight = keyboard(68);

let Player = function(spriteId) {
    this.sprite = new PIXI.Sprite(PIXI.loader.resources.gameTextures.textures[spriteId]);

    this.sprite.x = 15;
    this.vx = 0;

    this.sprite.y = app.renderer.height / 2 - this.sprite.height;
    this.vy = 0;

    this.fireRate = 250; //ms

    keyUp.press = () => {
        this.vy = -5;
    }
    keyUp.release = () => {
        if (!keyDown.isDown) {
            this.vy = 0;
        }
    }

    keyLeft.press = () => {
        this.vx = -5;
    }
    keyLeft.release = () => {
        if(!keyRight.isDown) {
            this.vx = 0;
        }
    }

    keyDown.press = () => {
        this.vy = 5;
    }
    keyDown.release = () => {
        if (!keyUp.isDown) {
            this.vy = 0;
        }
    }

    keyRight.press = () => {
        this.vx = 5;
    }
    keyRight.release = () => {
        if (!keyLeft.isDown) {
            this.vx = 0;
        }
    }

    this.update = function() {

        this.sprite.x += this.vx;
        this.sprite.y += this.vy;
    }
}

let state = null;

function setup() {

    splashScreen = new PIXI.Sprite(PIXI.loader.resources.splashRocket.texture);
    splashContainer.alpha = 1;
    splashContainer.addChild(splashScreen);
    //containerFade(splashContainer, ()=>{console.log("hello")}, false, 0.015);

    //alias for easier gametexture loader resource access
    let gameTextureId = PIXI.loader.resources.gameTextures.textures;    
    
    
    let gameSetup = () => {
        //background     
        bgPlanetBlack = new PIXI.Sprite(gameTextureId["planet_black.png"]);
        bgPlanetBlack.x = app.renderer.width;

        bgPlanetGreen = new PIXI.Sprite(gameTextureId["planet_green.png"]);
        bgPlanetGreen.x = app.renderer.width + 200;
        bgPlanetGreen.y = getRandomIntInclusive(app.renderer.height / 2 - 100, app.renderer.height - bgPlanetGreen.height);
        bgPlanetGreen.tint = Math.random() * 0xFFFF;
        
        let starsBgTexture = PIXI.loader.resources.starsBg.texture;
        bgFar = new PIXI.extras.TilingSprite(starsBgTexture, starsBgTexture.baseTexture.width, starsBgTexture.baseTexture.height);
        
        let moonBgTexture = PIXI.loader.resources.moonBg.texture;
        bgClose = new PIXI.extras.TilingSprite(moonBgTexture, moonBgTexture.baseTexture.width, moonBgTexture.baseTexture.height);
        bgClose.y = app.renderer.height - bgClose.height;

        //ships
        playerShip = new PIXI.Sprite(gameTextureId["blue_ship.png"]);
        enemyShip = new PIXI.Sprite(gameTextureId["green_enemy_ship.png"]);
        
        playerClone = new Player("blue_ship.png");
        playerObj = new Player("blue_ship.png");
        
        playerClone.sprite.y = 100;
        gamePlayContainer.addChild(playerObj.sprite, playerClone.sprite);

        gameBackgroundContainer.addChild(bgFar, bgPlanetBlack, bgPlanetGreen, bgClose);

        
    }    
    gameSetup();

    
    gameContainer.addChild(gameBackgroundContainer, gamePlayContainer);

    app.stage.addChild(gameContainer);

    
    state = gamePlayLoop;


    app.ticker.add(state);
}

function gameLoop() {
    state();
}

function gamePlayLoop() {
    
    playerObj.update();
    playerClone.update();

    let travelSpeed = 10;
    let backgroundScroll = function() {           

        if (bgPlanetBlack.x + bgPlanetBlack.width <= 0) {
            bgPlanetBlack.x = app.renderer.width + 20;
            bgPlanetBlack.y = getRandomIntInclusive(0, app.renderer.height / 2 - 200);
            bgPlanetBlack.tint = Math.random() * 0xFFFF;
        }
        if (bgPlanetGreen.x + bgPlanetGreen.width <= 0) {
            bgPlanetGreen.x = app.renderer.width + 20;
            bgPlanetGreen.y = getRandomIntInclusive(app.renderer.height / 2 + 50, app.renderer.height - bgPlanetGreen.height - 50);
            bgPlanetGreen.tint = Math.random() * 0xFFFF;
        }
        bgPlanetBlack.x += -(travelSpeed / 25);
        bgPlanetGreen.x += -(travelSpeed / 15)

        bgFar.tilePosition.x += -(travelSpeed / 100);
        bgClose.tilePosition.x += -(travelSpeed / 10);
    }()



}



