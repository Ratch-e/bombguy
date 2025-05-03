const TILE_SIZE = 30;
const FPS = 30;
const SLEEP = 1000 / FPS;
const TPS = 2;
const DELAY = FPS / TPS;

interface Input {
  handle(game: Game): void;
}

class UpInput implements Input {
  handle(game: Game): void {
    game.getPlayer().move(0, -1);
  }
}

class DownInput implements Input {
  handle(game: Game): void {
    game.getPlayer().move(0, 1);
  }
}

class LeftInput implements Input {
  handle(game: Game): void {
    game.getPlayer().move(-1, 0);
  }
}

class RightInput implements Input {
  handle(game: Game): void {
    game.getPlayer().move(1, 0);
  }
}

class PlaceBombInput implements Input {
  handle(game: Game): void {
    game.getPlayer().placeBomb();
  }
}

class InputHandler {
  private inputs: Input[] = [];

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const LEFT_KEY = "ArrowLeft";
    const UP_KEY = "ArrowUp";
    const RIGHT_KEY = "ArrowRight";
    const DOWN_KEY = "ArrowDown";
    const PLACE_KEY = " ";

    window.addEventListener("keydown", (e) => {
      if (e.key === LEFT_KEY || e.key === "a") this.addInput(new LeftInput());
      else if (e.key === UP_KEY || e.key === "w") this.addInput(new UpInput());
      else if (e.key === RIGHT_KEY || e.key === "d")
        this.addInput(new RightInput());
      else if (e.key === DOWN_KEY || e.key === "s")
        this.addInput(new DownInput());
      else if (e.key === PLACE_KEY) this.addInput(new PlaceBombInput());
    });
  }

  private addInput(input: Input): void {
    this.inputs.push(input);
  }

  hasInputs(): boolean {
    return this.inputs.length > 0;
  }

  popInput(): Input | undefined {
    return this.inputs.pop();
  }
}

class GameState {
  private delay = 0;
  private gameOver = false;
  private tickReady = false;

  constructor() {
    this.delay = DELAY;
  }

  update(): void {
    this.tickReady = false;
    if (--this.delay <= 0) {
      this.delay = DELAY;
      this.tickReady = true;
    }
  }

  isTickReady(): boolean {
    return this.tickReady;
  }

  isGameOver(): boolean {
    return this.gameOver;
  }

  setGameOver(): void {
    this.gameOver = true;
  }
}

interface Tile {
  draw(g: CanvasRenderingContext2D, x: number, y: number): void;
  update(map: GameMap, x: number, y: number): void;
  isAir(): boolean;
  onDestroy(map: GameMap, x: number, y: number): void;
  onPlayerContact(game: Game, x: number, y: number): void;
  isWalkable(): boolean;
  isExplodable(): boolean;
}

abstract class BaseTile implements Tile {
  draw(g: CanvasRenderingContext2D, x: number, y: number): void {
    const color = this.getColor();
    if (color) {
      g.fillStyle = color;
      this.renderTile(g, x, y);
    }
  }
  protected renderTile(
    g: CanvasRenderingContext2D,
    x: number,
    y: number
  ): void {
    g.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }
  abstract getColor(): string | null;
  update(map: GameMap, x: number, y: number): void {}
  isAir(): boolean {
    return false;
  }
  onDestroy(map: GameMap, x: number, y: number): void {
    map.setTile(x, y, new Fire());
  }
  onPlayerContact(game: Game, x: number, y: number): void {}
  isWalkable(): boolean {
    return false;
  }
  isExplodable(): boolean {
    return true;
  }
}

class Air extends BaseTile implements Tile {
  getColor(): null {
    return null;
  }
  isAir(): boolean {
    return true;
  }
  isWalkable(): boolean {
    return true;
  }
}

class Unbreakable extends BaseTile implements Tile {
  getColor(): string {
    return "#999999";
  }
  isExplodable(): boolean {
    return false;
  }
  onDestroy(): void {}
}

class Stone extends BaseTile implements Tile {
  getColor(): string {
    return "#0000cc";
  }
  onDestroy(map: GameMap, x: number, y: number): void {
    const tile = Math.random() < 0.1 ? new ExtraBombPowerup() : new Fire();
    map.setTile(x, y, tile);
  }
}

class ExtraBombPowerup extends BaseTile implements Tile {
  getColor(): string {
    return "#00cc00";
  }
  isWalkable(): boolean {
    return true;
  }

  isExplodable(): boolean {
    return false;
  }
  onDestroy(): void {}
  onPlayerContact(game: Game, x: number, y: number): void {
    game.getPlayer().incrementBombCount();
    game.getMap().setTile(x, y, new Air());
  }
}

interface BombState extends Tile {
  nextState(): BombState | Fire;
}

class Bomb extends BaseTile implements BombState {
  getColor(): string {
    return "#770000";
  }
  isExplodable(): boolean {
    return false;
  }
  onDestroy(): void {}

  update(map: GameMap, x: number, y: number): void {
    map.setTile(x, y, this.nextState());
  }
  nextState(): BombState {
    return new BombClose();
  }
}

class BombClose extends BaseTile implements BombState {
  getColor(): string {
    return "#cc0000";
  }
  isExplodable(): boolean {
    return false;
  }
  onDestroy(): void {}

  update(map: GameMap, x: number, y: number): void {
    map.setTile(x, y, this.nextState());
  }
  nextState(): BombState {
    return new BombReallyClose();
  }
}

class BombReallyClose extends BaseTile implements BombState {
  getColor(): string {
    return "#ff0000";
  }
  isExplodable(): boolean {
    return false;
  }
  update(map: GameMap, x: number, y: number): void {
    map.explode(x, y);
  }
  nextState(): Fire {
    return new Fire();
  }
}

class Fire extends BaseTile implements Tile {
  getColor(): string {
    return "#ffcc00";
  }
  isWalkable(): boolean {
    return true;
  }
  onPlayerContact(game: Game, x: number, y: number): void {
    game.setGameOver();
  }
  onDestroy(map: GameMap, x: number, y: number): void {}
  update(map: GameMap, x: number, y: number): void {
    map.setTile(x, y, new Air());
  }
}

interface MonsterState extends Tile {
  nextDirection(): MonsterState;
  move(map: GameMap, x: number, y: number): void;
}

abstract class BaseMonster extends BaseTile implements MonsterState {
  getColor(): string {
    return "#cc00cc";
  }
  onPlayerContact(game: Game, x: number, y: number): void {
    game.setGameOver();
  }
  onDestroy(map: GameMap, x: number, y: number): void {
    map.setTile(x, y, new Fire());
  }

  update(map: GameMap, x: number, y: number): void {
    this.move(map, x, y);
  }

  abstract nextDirection(): MonsterState;
  abstract move(map: GameMap, x: number, y: number): void;

  protected tryMove(
    map: GameMap,
    x: number,
    y: number,
    dx: number,
    dy: number,
    nextStateIfMoved: MonsterState
  ): boolean {
    if (!map.getTile(x + dx, y + dy).isAir()) {
      return false;
    }
    map.setTile(x, y, new Air());
    map.setTile(x + dx, y + dy, nextStateIfMoved);
    return true;
  }
}

class TmpMonsterDown extends BaseMonster implements MonsterState {
  update(map: GameMap, x: number, y: number): void {
    map.setTile(x, y, new MonsterDown());
  }
  nextDirection(): MonsterState {
    return new MonsterLeft();
  }
  move(): void {}
}

class TmpMonsterRight extends BaseMonster implements MonsterState {
  update(map: GameMap, x: number, y: number): void {
    map.setTile(x, y, new MonsterRight());
  }
  nextDirection(): MonsterState {
    return new MonsterDown();
  }
  move(): void {}
}

class MonsterRight extends BaseMonster implements MonsterState {
  nextDirection(): MonsterState {
    return new MonsterDown();
  }
  move(map: GameMap, x: number, y: number): void {
    if (!this.tryMove(map, x, y, 1, 0, new TmpMonsterRight())) {
      map.setTile(x, y, this.nextDirection());
    }
  }
}
class MonsterDown extends BaseMonster implements MonsterState {
  nextDirection(): MonsterState {
    return new MonsterLeft();
  }
  move(map: GameMap, x: number, y: number): void {
    if (!this.tryMove(map, x, y, 0, 1, new TmpMonsterDown())) {
      map.setTile(x, y, this.nextDirection());
    }
  }
}
class MonsterLeft extends BaseMonster implements MonsterState {
  nextDirection(): MonsterState {
    return new MonsterUp();
  }
  move(map: GameMap, x: number, y: number): void {
    if (!this.tryMove(map, x, y, -1, 0, new MonsterLeft())) {
      map.setTile(x, y, this.nextDirection());
    }
  }
}
class MonsterUp extends BaseMonster implements MonsterState {
  nextDirection(): MonsterState {
    return new MonsterRight();
  }
  move(map: GameMap, x: number, y: number): void {
    if (!this.tryMove(map, x, y, 0, -1, new MonsterUp())) {
      map.setTile(x, y, this.nextDirection());
    }
  }
}

class Player {
  private x: number;
  private y: number;
  private bombCount: number;
  private map: GameMap;

  constructor(
    startX: number,
    startY: number,
    initialBombs: number,
    map: GameMap
  ) {
    this.x = startX;
    this.y = startY;
    this.bombCount = initialBombs;
    this.map = map;
  }

  draw(g: CanvasRenderingContext2D): void {
    g.fillStyle = "#00ff00";
    g.fillRect(this.x * TILE_SIZE, this.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }

  move(dx: number, dy: number): void {
    const nextTile = this.map.getTile(this.x + dx, this.y + dy);
    if (nextTile.isWalkable()) {
      this.x += dx;
      this.y += dy;
    }
  }

  placeBomb(): void {
    if (this.bombCount > 0 && this.map.getTile(this.x, this.y).isAir()) {
      this.map.setTile(this.x, this.y, new Bomb());
    }
  }

  checkCollision(game: Game): void {
    const currentTile = this.map.getTile(this.x, this.y);
    currentTile.onPlayerContact(game, this.x, this.y);
  }

  incrementBombCount(): void {
    this.bombCount++;
  }
  getBombCount(): number {
    return this.bombCount;
  }
}

class GameMap {
  private tiles: Tile[][];

  constructor(rawMapData: number[][]) {
    this.initializeMap(rawMapData);
  }

  private initializeMap(rawMapData: number[][]): void {
    this.tiles = new Array(rawMapData.length);
    const tileFactory = new TileFactory();
    for (let y = 0; y < rawMapData.length; y++) {
      this.tiles[y] = new Array(rawMapData[y].length);
      for (let x = 0; x < rawMapData[y].length; x++) {
        this.tiles[y][x] = tileFactory.createTile(rawMapData[y][x]);
      }
    }
  }

  updateTiles(): void {
    const currentState = this.tiles.map((row) => row.slice());
    for (let y = 0; y < this.tiles.length; y++) {
      for (let x = 0; x < this.tiles[y].length; x++) {
        currentState[y][x].update(this, x, y);
      }
    }
  }

  drawTiles(g: CanvasRenderingContext2D): void {
    for (let y = 0; y < this.tiles.length; y++) {
      for (let x = 0; x < this.tiles[y].length; x++) {
        this.tiles[y][x].draw(g, x, y);
      }
    }
  }

  getTile(x: number, y: number): Tile {
    if (this.isValid(x, y)) {
      return this.tiles[y][x];
    }
    return new Unbreakable();
  }

  setTile(x: number, y: number, tile: Tile): void {
    if (this.isValid(x, y)) {
      this.tiles[y][x] = tile;
    }
  }

  explode(x: number, y: number): void {
    this.getTile(x, y).onDestroy(this, x, y);

    this.tryExplodeTile(x + 0, y - 1);
    this.tryExplodeTile(x + 0, y + 1);
    this.tryExplodeTile(x - 1, y + 0);
    this.tryExplodeTile(x + 1, y + 0);
  }

  private tryExplodeTile(x: number, y: number): void {
    const tile = this.getTile(x, y);
    if (tile.isExplodable()) {
      tile.onDestroy(this, x, y);
    }
  }

  isValid(x: number, y: number): boolean {
    return (
      y >= 0 && y < this.tiles.length && x >= 0 && x < this.tiles[y].length
    );
  }
}

class TileFactory {
  private tileMapping: Array<() => Tile> = [
    () => new Air(),
    () => new Unbreakable(),
    () => new Stone(),
    () => new Bomb(),
    () => new BombClose(),
    () => new BombReallyClose(),
    () => new Fire(),
    () => new ExtraBombPowerup(),
    () => new MonsterUp(),
    () => new MonsterRight(),
    () => new TmpMonsterRight(),
    () => new MonsterDown(),
    () => new TmpMonsterDown(),
    () => new MonsterLeft(),
  ];

  createTile(tileType: number): Tile {
    const creator = this.tileMapping[tileType];
    if (creator) {
      return creator();
    }
    console.warn(`Unknown tile type: ${tileType}`);
    return new Air();
  }
}

class Graphics {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.getElementById("GameCanvas") as HTMLCanvasElement;
    this.context = this.canvas.getContext("2d")!;
  }

  clear(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  getContext(): CanvasRenderingContext2D {
    return this.context;
  }
}

class Game {
  private map: GameMap;
  private player: Player;
  private gameState: GameState;
  private inputHandler: InputHandler;
  private graphics: Graphics;

  constructor(
    rawMapData: number[][],
    startX: number,
    startY: number,
    initialBombs: number
  ) {
    this.map = new GameMap(rawMapData);
    this.player = new Player(startX, startY, initialBombs, this.map);
    this.gameState = new GameState();
    this.inputHandler = new InputHandler();
    this.graphics = new Graphics();
  }

  getPlayer(): Player {
    return this.player;
  }
  getMap(): GameMap {
    return this.map;
  }
  setGameOver(): void {
    this.gameState.setGameOver();
  }

  run(): void {
    this.gameLoop();
  }

  private gameLoop(): void {
    const before = Date.now();
    if (!this.gameState.isGameOver()) {
      this.update();
    }
    this.draw();
    const after = Date.now();
    const frameTime = after - before;
    const sleep = SLEEP - frameTime;
    setTimeout(() => this.gameLoop(), Math.max(0, sleep));
  }

  private update(): void {
    this.handleInputs();
    this.gameState.update();

    if (this.gameState.isTickReady()) {
      this.map.updateTiles();
    }
    this.player.checkCollision(this);
  }

  private handleInputs(): void {
    while (!this.gameState.isGameOver() && this.inputHandler.hasInputs()) {
      const currentInput = this.inputHandler.popInput();
      currentInput?.handle(this);
    }
  }

  private draw(): void {
    this.graphics.clear();
    const g = this.graphics.getContext();
    this.map.drawTiles(g);
    if (!this.gameState.isGameOver()) {
      this.player.draw(g);
    } else {
      g.fillStyle = "red";
      g.font = "48px sans-serif";
      g.textAlign = "center";
      g.fillText(
        "GAME OVER",
        this.graphics.getContext().canvas.width / 2,
        this.graphics.getContext().canvas.height / 2
      );
    }
    g.fillStyle = "white";
    g.font = "18px sans-serif";
    g.textAlign = "left";
    g.fillText(`Bombs: ${this.player.getBombCount()}`, 10, 25);
  }
}

const initialMapData: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 2, 2, 2, 2, 2, 1],
  [1, 0, 1, 2, 1, 2, 1, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 1, 2, 1, 2, 1, 2, 1],
  [1, 2, 2, 2, 2, 0, 0, 0, 1],
  [1, 2, 1, 2, 1, 0, 1, 0, 1],
  [1, 2, 2, 2, 2, 0, 0, 11, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
];

window.onload = () => {
  const game = new Game(initialMapData, 1, 1, 1);
  game.run();
};
