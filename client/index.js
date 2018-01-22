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
const getRandomNum = (min, max) => {
    return Math.random() * (max - min) + min;
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

// global gamestate Object
let gameState = {
    // the function to loop
    loop: undefined,
    // store pressed keys globally and react to them within objects
    keys: {}
};

let gameContainer = new PIXI.Container();

let gameBackgroundContainer = new PIXI.Container();
let bgPlanetBlack;
let bgPlanetGreen;
let bgFar;
let bgClose;

let gamePlayContainer = new PIXI.Container();
let playerObj;
let enemyShip;
let enemyArr = [];
let rocketArr = [];



window.addEventListener("keydown", (e) => {
    gameState.keys[e.code] = true;
    //console.log(e.code);
});
window.addEventListener("keyup", (e) => {
    gameState.keys[e.code] = false;
})

const containSprite = (sprite) => {
    if (sprite.x < 0) {
        sprite.x = 0;
    }
    if (sprite.x > app.renderer.width - sprite.width) {
        sprite.x = app.renderer.width - sprite.width;
    }
    if (sprite.y < 0) {
        sprite.y = 0;
    }
    if (sprite.y > app.renderer.height - sprite.height) {
        sprite.y = app.renderer.height - sprite.height;
    }
}

// timer object based on app's elapsed time
// funtion(function to fire on timer end, time in ms, true = repeat timer / false = fire once)
let GameTimer = function(callback, interval, repeat) {
    
    this.timer = interval;
    this.currTime = this.timer;
    this.callback = callback;
    this.tick = app.ticker.elapsedMS;
    this.repeat = repeat;
    this.finished = false;

    this.update = () => {
        if (!this.finished){
            if (this.currTime <= 0) {
                this.callback();
                this.repeat ? this.currTime = this.timer : this.finished = true;
            }
            else {
            this.currTime -= this.tick;
            }
        }
    }
}
let Rocket = function(startX, startY) {
    this.sprite = new PIXI.Sprite(PIXI.loader.resources.gameTextures.textures["rocket.png"]);
    this.sprite.x = startX;
    this.sprite.y = startY;

    this.vx = 8;

    this.update = function() {
        this.sprite.x += this.vx;
    }


}
// Player's ship
let Player = function(spriteId) {
    this.sprite = new PIXI.Sprite(PIXI.loader.resources.gameTextures.textures[spriteId]);

    this.sprite.x = 15;
    this.sprite.y = app.renderer.height / 2 - this.sprite.height;

    this.vx = 0;
    this.vy = 0;

    this.shootRocket = function() {
        let rocket = new Rocket(this.sprite.x + this.sprite.width / 2, this.sprite.y + this.sprite.height / 2);
        rocketArr.push(rocket);
        gamePlayContainer.addChild(rocket.sprite);
    }
    this.reloaded = true;
    this.reloadTimer = new GameTimer(() => {
        this.reloaded = true;
    }, 1000, true)

    this.update = function(state) {

        this.keys = state.keys
        
        this.keys.KeyW ? this.vy = -5 : !this.keys.KeyS ? this.vy = 0 : null;
        this.keys.KeyA ? this.vx = -5 : !this.keys.KeyD ? this.vx = 0 : null;
        this.keys.KeyS ? this.vy = 5 : !this.keys.KeyW ? this.vy = 0 : null;
        this.keys.KeyD ? this.vx = 5 : !this.keys.KeyA ? this.vx = 0 : null;

        if (this.reloaded == false) {
            this.reloadTimer.update();
        }
        else if (this.keys.Space && this.reloaded) {
            this.reloaded = false;
            this.shootRocket();
            console.log("rocket shot");
        }

        this.sprite.x += this.vx;
        this.sprite.y += this.vy;
        containSprite(this.sprite);
    }
}
// Enemy ship
let Enemy = function(spriteId) {
    this.sprite = new PIXI.Sprite(PIXI.loader.resources.gameTextures.textures[spriteId]);

    
    this.sprite.x = app.renderer.width + 20;
    this.sprite.y = getRandomIntInclusive(0, app.renderer.width - this.sprite.height);
    this.sprite.tint = 0xFF0000;

    // make sprite brighter because of dark background
    this.colorMatrix = new PIXI.filters.ColorMatrixFilter();
    this.sprite.filters = [this.colorMatrix];
    this.colorMatrix.brightness(5, true);

    
    // set initial x velocity for intro 
    this.vx = -2;
    this.vy = 0;
    this.introDone = false;

    this.movementTimer = new GameTimer(() => {
        this.vx = getRandomNum(-3, 3);
        this.vy = getRandomNum(-3, 3);
    }, 2000, true)

    this.update = function() {

        this.sprite.x += this.vx;
        this.sprite.y += this.vy;
        if (this.sprite.x <= app.renderer.width - this.sprite.width) {this.introDone = true};

        if (this.introDone) {
            this.movementTimer.update()
            containSprite(this.sprite);
        }
        
    }

}


function setup() {

    splashScreen = new PIXI.Sprite(PIXI.loader.resources.splashRocket.texture);
    splashContainer.alpha = 1;
    splashContainer.addChild(splashScreen);
    //containerFade(splashContainer, ()=>{}, false, 0.015);

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
        
        playerObj = new Player("blue_ship.png");
        //let enemyShip = new Enemy("green_enemy_ship.png");


        gamePlayContainer.addChild(playerObj.sprite,);

        gameBackgroundContainer.addChild(bgFar, bgPlanetBlack, bgPlanetGreen, bgClose);
        
    }    
    gameSetup();

    
    gameContainer.addChild(gameBackgroundContainer, gamePlayContainer);

    app.stage.addChild(gameContainer);

    
    gameState.loop = gamePlayLoop;


    app.ticker.add(delta => gameState.loop(delta));
}

function gameLoop() {
    gameState();
}


let spawnEnemy = new GameTimer(()=> {
    let enemy = new Enemy("green_enemy_ship.png");
    enemyArr.push(enemy);
    gamePlayContainer.addChild(enemy.sprite);

}, 2000, true)

function gamePlayLoop(delta) {

    playerObj.update(gameState);
    spawnEnemy.update();
    enemyArr.forEach(el => el.update())
    rocketArr.forEach(el => el.update())

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

