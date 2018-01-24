import styles from './styles/styles.css';

import * as PIXI from 'pixi.js';

//Using webpack's url-loader to import our images and convert them to dataURI which PIXI loader can use.
//This allows the game to function from a single js file and eliminates the need for PIXI's AJAX calls which require a working server.

//splashscreen img imports
import splashURI from './assets/img/rocket_space_splash.png';

//menu img imports 
import bg_menuURI from './assets/img/menu_bg.jpg';
import menuLogoURI from './assets/img/game_logo.png';
import menuAnimPlanetURI from './assets/img/menu_anim_planet.png';
import menuFlareURI from './assets/img/menu_flare_big.png';

//game container img imports
import bg_farURI from './assets/img/back_bg.jpg';
import bg_closeURI from './assets/img/front_bg.png';


//texturePack imports
import gameTexturesPNG from './assets/img/texturepack/ship_planets.png';
import gameTexturesJSON from './assets/img/texturepack/ship_planets.json';

gameTexturesJSON.meta.image = gameTexturesPNG; //set JSON's image property to the source spritesheet png's dataURI
let gameTexturesURI = `data:application/json;base64,${btoa(JSON.stringify(gameTexturesJSON))}` //convert our JSON to dataURI

let app = new PIXI.Application({
        width: 800,
        height: 600,
        antialias: true
})

document.getElementById("app").appendChild(app.view);

PIXI.loader
    .add("splashRocket", splashURI)
    .add("menuBg", bg_menuURI)
    .add("menuPlanet", menuAnimPlanetURI)
    .add("menuLogo", menuLogoURI)
    .add("menuFlare", menuFlareURI)
    .add("gameTextures", gameTexturesURI)
    .add("starsBg", bg_farURI)
    .add("moonBg", bg_closeURI)
    .load(setup);



// global gamestate Object
let gameState = {
    // the current gameloop
    loop: undefined,
    // store pressed keys globally and react to them within objects
    keys: {},
    // current game instance
    gameInstance: null,
    // current gameObjects
    gameObjects: {
        rockets: [],
        enemies: [],
        explosions: []
    }
};
// global eventlisteners for keyboard keypresses
window.addEventListener("keydown", (e) => {
    gameState.keys[e.code] = true;
});
window.addEventListener("keyup", (e) => {
    gameState.keys[e.code] = false;
})


// PIXI app stage's hierarchy
let splashContainer = new PIXI.Container();
app.stage.addChild(splashContainer);

let menuContainer = new PIXI.Container();
app.stage.addChild(menuContainer);
let menuBackgroundContainer = new PIXI.Container();
let menuUIContainer = new PIXI.Container();
menuContainer.addChild(menuBackgroundContainer, menuUIContainer,);

let gameContainer = new PIXI.Container();
app.stage.addChild(gameContainer);
let gameBackgroundContainer = new PIXI.Container();
let gamePlayContainer = new PIXI.Container();
gameContainer.addChild(gameBackgroundContainer, gamePlayContainer);


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

// contains sprite within apps viewable canvas
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

// AABB rect collision detection preferably takes PIXI.Sprites as params
const detectRectCollision = (rectA, rectB) => {
    if (rectA.x < rectB.x + rectB.width &&
        rectB.x < rectA.x + rectA.width &&
        rectA.y < rectB.y + rectB.height &&
        rectB.y < rectA.y + rectA.height
    ) {
        return true;
    }
    else {
        return false;
    }

};
// fades container in or out then fires callback on end
// function(PIXI.Container, callback on Fade end,  0 < alphaModifier < 1)
const containerFade = function(container, callback, fadeIn, alphaModifier)  {
    
    let alphaMod;
    fadeIn === true ? alphaMod = alphaModifier : alphaMod = -alphaModifier;

    let fadeAnim = function() {
        //let frameCall = requestAnimationFrame(fadeAnim) non pixi way
        if (container.alpha < 0 || container.alpha > 1) {
            callback();
            app.ticker.remove(fadeAnim);
            //cancelAnimationFrame(frameCall);
            container.alpha = Math.round(container.alpha);                           
        }
        else {
            container.alpha += alphaMod;
        }
    }
    app.ticker.add(fadeAnim);
}


// timer based on app's ticker elapsed time
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

// draw a customizable Button with the help of PIXI
let GameMenuButton = function(x, y, width, height, text, onPointerUp) {
    this.btn = new PIXI.Container();

    this.btn.x = x;
    this.btn.y = y;

    this.btn.interactive = true;

    this.btn.buttonMode = true;
    
    this.btn.on("pointerup", onPointerUp);


    this.btnWidth = width;
    this.btnHeight = height;

    this.buttonRect = new PIXI.Graphics();
    this.buttonRect.lineStyle(3, 0xb27c18, 0.8);
    this.buttonRect.beginFill(0x04558c);
    this.buttonRect.drawRoundedRect(0, 0, this.btnWidth, this.btnHeight, this.btnHeight / 2.5);
    this.buttonRect.endFill();
    this.buttonRect.x = x;
    this.buttonRect.y = y;

    // some feedback for the user when hovering/pressing the buttons
    this.btn.on("pointerover", () => {
        this.buttonRect.beginFill(0x0886db);
        this.buttonRect.drawRoundedRect(0, 0, this.btnWidth, this.btnHeight, this.btnHeight / 2.5);
        this.buttonRect.endFill();
    });
    this.btn.on("pointerout", () => {
        this.buttonRect.beginFill(0x04558c);
        this.buttonRect.drawRoundedRect(0, 0, this.btnWidth, this.btnHeight, this.btnHeight / 2.5);
        this.buttonRect.endFill();
    })
    this.btn.on("pointerdown", () => {
        this.buttonRect.beginFill(0x043251);
        this.buttonRect.drawRoundedRect(0, 0, this.btnWidth, this.btnHeight, this.btnHeight / 2.5);
        this.buttonRect.endFill();
    })

    

    this.buttonText = new PIXI.Text(text, {fontFamily: "Arial", fill: "white", fontSize: this.btnHeight / 2, fontWeight: "bold", stroke: "black", strokeThickness: 2})
    this.btn.addChild(this.buttonRect, this.buttonText);

    this.buttonText.anchor.set(0.5, 0.5);
    this.buttonText.x = x + this.buttonRect.width / 2;
    this.buttonText.y = y + this.buttonRect.height / 2;    
    
    

}
// game's Menu scene 
let GameMenu = function() {
    this.menuBg = new PIXI.Sprite(PIXI.loader.resources.menuBg.texture);
    this.menuFlare = new PIXI.Sprite(PIXI.loader.resources.menuFlare.texture);
    this.menuFlare.anchor.set(0.5, 0.5);
    this.menuFlare.x = 400;
    this.menuFlare.y = 350;


    this.menuPlanet = new PIXI.Sprite(PIXI.loader.resources.menuPlanet.texture);
    this.menuPlanet.anchor.set(0.5, 0.5);


    this.planetScale = 0.4;
    this.planetSizeModifier = 0.0005;    
    
    menuBackgroundContainer.addChild(this.menuBg, this.menuFlare, this.menuPlanet);

    this.menuBtnOffset = 25;
    this.menuLogo = new PIXI.Sprite(PIXI.loader.resources.menuLogo.texture);
    this.menuLogo.x = this.menuBtnOffset;
    this.menuLogo.width = 150;
    this.menuLogo.height = 100;

    // switches scene to maingame
    this.switchToGame = () => {
        menuContainer.visible = false;
        gameState.gameInstance = new NewGame();
        gameContainer.visible = true;
        gameContainer.alpha = 0;

        containerFade(gameContainer, () => {
            gameState.loop = gamePlayLoop;
        }, true, 0.015)
    }

    // switches to game Scene
    this.game1 = new GameMenuButton(10, this.menuBtnOffset * 2, 150, 40, "GAME1", this.switchToGame);
    this.game2 = new GameMenuButton(10, this.menuBtnOffset * 3, 150, 40, "GAME2", this.switchToGame);
    this.game3 = new GameMenuButton(10, this.menuBtnOffset * 4, 150, 40, "GAME3", this.switchToGame);

    //navigates browser to specified url
    this.exit = new GameMenuButton(10, this.menuBtnOffset * 5, 150, 40, "EXIT", () => {window.location.replace("http://www.google.hu")});

    menuUIContainer.addChild(this.menuLogo, this.game1.btn, this.game2.btn, this.game3.btn, this.exit.btn);
    menuUIContainer.x = 50;
    menuUIContainer.y = 120;


    // very basic planet pulsing and flare rotation animation to fulfil menu bacground animation specification
    this.planetAnimTimer = new GameTimer(() => {
        this.planetSizeModifier = -this.planetSizeModifier;
    }, 5000, true)
    this.update = function() {
        this.planetScale += this.planetSizeModifier;
        this.menuPlanet.setTransform(550, 300, this.planetScale, this.planetScale);
        this.planetAnimTimer.update();

        this.menuFlare.rotation += 0.001;
    }

}
// explosion object for when ships are destroyed, emits small circle PIXIgraphics in random directions
let ParticleExplosion = function(x, y, minParticles, maxParticles) {
    this.explosion = new PIXI.Container();
    this.explosion.x = x;
    this.explosion.y = y;

    this.particleArr = [];

    this.Particle = function() {
        this.particle = new PIXI.Graphics();
        this.particle.beginFill(0xFFFFFF)
        this.particle.drawCircle(0 , 0, 2)
        this.particle.endFill();
        this.dead = false;

        this.lifeTime = getRandomIntInclusive(500, 1500);
        this.lifeTimer = new GameTimer(() => {
            this.dead = true;
        }, this.lifeTime, false);

        this.direction = (getRandomIntInclusive(0, 360) * Math.PI) * 180;
        this.angle = 0;

        this.particleVelocity = getRandomNum(0, 2);
        this.particle.x = 0;
        this.particle.y = 0;

        this.update = function() {
            let radians = (this.direction * Math.PI) * 180;
            this.particle.x += this.particleVelocity * Math.cos(radians);
            this.particle.y += this.particleVelocity * Math.sin(radians);
            this.lifeTimer.update();
        }
    }
    this.particleNum = getRandomIntInclusive(minParticles, maxParticles);
    for (let i = 0; i < this.particleNum; i++) {
        let currParticle = new this.Particle;
        this.particleArr.push(currParticle);
        this.explosion.addChild(currParticle.particle);
    }
    gamePlayContainer.addChild(this.explosion);
    this.update = () => {
        this.particleArr.forEach((particle, i) => particle.dead ? this.explosion.removeChild(this.explosion.children[i]) : particle.update());
        
    }
}
// player's rockets
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
        gameState.gameObjects.rockets.push(rocket);
        gamePlayContainer.addChild(rocket.sprite);
    }
    this.reloaded = true;
    this.reloadTimer = new GameTimer(() => {
        this.reloaded = true;
    }, 1000, true)

    this.update = function() {

        this.keys = gameState.keys
        
        //handle directional controls WASD
        this.keys.KeyW ? this.vy = -5 : !this.keys.KeyS ? this.vy = 0 : null;
        this.keys.KeyA ? this.vx = -5 : !this.keys.KeyD ? this.vx = 0 : null;
        this.keys.KeyS ? this.vy = 5 : !this.keys.KeyW ? this.vy = 0 : null;
        this.keys.KeyD ? this.vx = 5 : !this.keys.KeyA ? this.vx = 0 : null;

        // handle SPACE for shooting rocket
        if (this.reloaded == false) {
            this.reloadTimer.update();
        }
        else if (this.keys.Space && this.reloaded) {
            this.reloaded = false;
            this.shootRocket();
        }

        this.sprite.x += this.vx;
        this.sprite.y += this.vy;
        containSprite(this.sprite);
    }
}
// Enemy ship
let Enemy = function(spriteId) {
    this.sprite = new PIXI.Sprite(PIXI.loader.resources.gameTextures.textures[spriteId]);

    // spawn on right end of screen with random y value
    this.sprite.x = app.renderer.width;
    this.sprite.y = getRandomIntInclusive(0, app.renderer.width - this.sprite.height);
    this.sprite.tint = 0xFF0000;

    // make sprite brighter because of dark background
    this.colorMatrix = new PIXI.filters.ColorMatrixFilter();
    this.sprite.filters = [this.colorMatrix];
    this.colorMatrix.brightness(5, true);

    // set initial x velocity for intro 
    this.vx = -1;
    this.vy = 0;
    this.introDone = false;

    this.movementTimer = new GameTimer(() => {
        this.vx = getRandomNum(-2, 2);
        this.vy = getRandomNum(-2, 2);
    }, 2000, true)

    this.update = function() {

        this.sprite.x += this.vx;
        this.sprite.y += this.vy;
        if (this.sprite.x <= app.renderer.width - this.sprite.width) {this.introDone = true};

        if (this.introDone) {
            this.movementTimer.update();
            containSprite(this.sprite);
        }
        
    }

}
// 4 layer parallax scroll background
// The task specified a 2 layer only scrolling background, but I felt adding some planets looked better
let GameBackground = function(bgEndId, bgFarId, bgCloseId, bgFront, scrollSpeed) {

    // simple sprites
    this.bgFarSprite = new PIXI.Sprite(PIXI.loader.resources.gameTextures.textures[bgFarId]);
    this.bgFarSprite.x = app.renderer.width + 20;
    this.bgFarSprite.y = getRandomIntInclusive(0, app.renderer.height / 2 - 200);
    this.bgFarSprite.tint = Math.random() * 0xFFFF;

    this.bgCloseSprite = new PIXI.Sprite(PIXI.loader.resources.gameTextures.textures[bgCloseId]);
    this.bgCloseSprite.x = app.renderer.width + 200;
    this.bgCloseSprite.y = getRandomIntInclusive(app.renderer.height / 2 - 100, app.renderer.height - this.bgCloseSprite.height);
    this.bgCloseSprite.tint = Math.random() * 0xFFFF;

    // tilingsprites 
    // theese alone fulfill the specification of 2 layer parallax background
    let bgEndTexture = PIXI.loader.resources.starsBg.texture;
    this.bgEndTileSprite = new PIXI.extras.TilingSprite(bgEndTexture, bgEndTexture.baseTexture.width, bgEndTexture.baseTexture.height);
    let bgFrontTexture = PIXI.loader.resources.moonBg.texture;
    this.bgFrontTileSprite = new PIXI.extras.TilingSprite(bgFrontTexture, bgFrontTexture.baseTexture.width, bgFrontTexture.baseTexture.height);
    this.bgFrontTileSprite.y = app.renderer.height - this.bgFrontTileSprite.height;
    
    this.scrollSpeed = scrollSpeed;

    this.update = function() {
        if (this.bgFarSprite.x + this.bgFarSprite.width <= 0) {
            this.bgFarSprite.x = app.renderer.width + 20;
            this.bgFarSprite.y = getRandomIntInclusive(0, app.renderer.height / 2 - 200);
            this.bgFarSprite.tint = Math.random() * 0xFFFF;
        }
        if (this.bgCloseSprite.x + this.bgCloseSprite.width <= 0) {
            this.bgCloseSprite.x = app.renderer.width + 20;
            this.bgCloseSprite.y = getRandomIntInclusive(app.renderer.height / 2 + 50, app.renderer.height - this.bgCloseSprite.height - 50);
            this.bgCloseSprite.tint = Math.random() * 0xFFFF;
        }
        this.bgFarSprite.x += -(this.scrollSpeed / 25);
        this.bgCloseSprite.x += -(this.scrollSpeed / 15)

        this.bgEndTileSprite.tilePosition.x += -(this.scrollSpeed / 100);
        this.bgFrontTileSprite.tilePosition.x += -(this.scrollSpeed / 10);
    }


}
let NewGame = function() {
    this.background = new GameBackground("starsBg", "planet_black.png", "planet_green.png", "moonBg", 10);
    
    this.player = new Player("blue_ship.png");

    gameBackgroundContainer.addChild(this.background.bgEndTileSprite, this.background.bgFarSprite, this.background.bgCloseSprite, this.background.bgFrontTileSprite);
    gamePlayContainer.addChild(this.player.sprite);

    this.spawnEnemy = new GameTimer(()=> {
        let enemy = new Enemy("green_enemy_ship.png");
        gameState.gameObjects.enemies.push(enemy);
        gamePlayContainer.addChild(enemy.sprite);    
    }, 2000, true)

    this.spawnExplosion = (x, y, minParticles, maxParticles) => {
        let explosion = new ParticleExplosion(x, y, minParticles, maxParticles);

        gameState.gameObjects.explosions.push(explosion);
    }


    this.gameOver = false;
    // game over handler, waits for a set amount of time then cleans up the gamestate and game's containers
    // switches scene back to the menu
    this.gameOverTimer = new GameTimer(()=> {
        containerFade(gameContainer, () => {
            gameState.gameObjects.rockets = [];
            gameState.gameObjects.enemies = [];
            gameState.gameObjects.explosions = [];

            gameContainer.visible = false;
            menuContainer.visible = true;

            gameState.gameInstance = null;
            gameState.loop = menuLoop;
            // cleanup any rendered sprite
            for (let i = gamePlayContainer.children.length; i >= 0; i--) {
                gamePlayContainer.removeChild(gamePlayContainer.children[i])
            }
            // cleanup background sprites
            for (let j = gameBackgroundContainer.children.length; j >= 0; j--) {
                gameBackgroundContainer.removeChild(gameBackgroundContainer.children[j])
            }
            },false, 0.015)
    }, 2000, false)
    this.gameOverOverlay = function() {
        this.gameOverText = new PIXI.Text("GAME OVER", {
            fill: ["#ad0f0f", "#d64040"],
            fontSize: 60,
            fontWeight: "bolder",
            fontFamily: "Impact",
            stroke: "black",
            strokeThickness: 3,
            dropShadow: true,
            dropShadowAlpha: 0.8,
            dropShadowBlur: 5,
        })
        this.gameOverText.anchor.set(0.5, 0.5);
        this.gameOverText.x = app.renderer.width / 2;
        this.gameOverText.y = app.renderer.height / 2;
        gamePlayContainer.addChild(this.gameOverText);
    }
    this.update = function() {

        // update scrolling background and every gameobject
        this.background.update();
        this.spawnEnemy.update();

        gameState.gameObjects.explosions.forEach(explosion => explosion.update());
        gameState.gameObjects.enemies.forEach(sprite => sprite.update());
        gameState.gameObjects.rockets.forEach(sprite => sprite.update());

        // only update Player object is game isnt over yet
        if (!this.gameOver) {this.player.update()} 

        // playerCollision
        gameState.gameObjects.enemies.forEach((enemy, i) => {
            if (detectRectCollision(this.player.sprite, enemy.sprite)) {
                this.gameOver = true;
                this.spawnExplosion(this.player.sprite.x + this.player.sprite.width / 2, this.player.sprite.y + this.player.sprite.height / 2, 100, 150)
                this.spawnExplosion(enemy.sprite.x + enemy.sprite.width / 2, enemy.sprite.y + enemy.sprite.height / 2, 10, 35);
                this.gameOverOverlay();
                gamePlayContainer.removeChild(this.player.sprite);
                gameState.gameObjects.enemies.splice(i, 1);
                gamePlayContainer.removeChild(enemy.sprite);                
            }
        })
        // rocketCollision or remove rocket if out of screen
        gameState.gameObjects.enemies.forEach((enemy, i) => {
            gameState.gameObjects.rockets.forEach((rocket, j) => {
                if (detectRectCollision(enemy.sprite, rocket.sprite)){

                    gameState.gameObjects.enemies.splice(i, 1);
                    gameState.gameObjects.rockets.splice(j, 1);

                    this.spawnExplosion(enemy.sprite.x + enemy.sprite.width / 2, enemy.sprite.y + enemy.sprite.height / 2, 10, 35);
                    gamePlayContainer.removeChild(enemy.sprite);
                    gamePlayContainer.removeChild(rocket.sprite);

                }
                if (rocket.sprite.x > app.renderer.width) {
                    gameState.gameObjects.rockets.splice(j, 1);

                    gamePlayContainer.removeChild(rocket.sprite);
                }
            })
        })
        // tick gameending timer
        if (this.gameOver) {
            this.gameOverTimer.update();
        }
    }
}

function setup() {    
    let splashScreen = new PIXI.Sprite(PIXI.loader.resources.splashRocket.texture);
    splashContainer.addChild(splashScreen);

    // intro splashcreen shown for 2 sec then swith to menu scene
    setTimeout(() => {
        containerFade(splashContainer, () => {
            splashContainer.visible = false;
            gameState.menu = new GameMenu();
            gameState.loop = menuLoop;

            app.ticker.add(gameLoop);
        }, false, 0.5)
    }, 1)
}

// main gameloop
function gameLoop() {
    gameState.loop()
}

//current scene's loop function
function gamePlayLoop() {
    gameState.gameInstance.update();
}
function menuLoop() {
    gameState.menu.update();
}

