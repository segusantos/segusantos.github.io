const CELL = 8;
const SCROLL_PER_GENERATION = 28;
const PULSAR_STEP_MS = 420;
const RAIL_DENSITY = 0.1;
const PAGE_SEED = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
const PULSAR = [
  [2, 0], [3, 0], [4, 0], [8, 0], [9, 0], [10, 0],
  [0, 2], [5, 2], [7, 2], [12, 2],
  [0, 3], [5, 3], [7, 3], [12, 3],
  [0, 4], [5, 4], [7, 4], [12, 4],
  [2, 5], [3, 5], [4, 5], [8, 5], [9, 5], [10, 5],
  [2, 7], [3, 7], [4, 7], [8, 7], [9, 7], [10, 7],
  [0, 8], [5, 8], [7, 8], [12, 8],
  [0, 9], [5, 9], [7, 9], [12, 9],
  [0, 10], [5, 10], [7, 10], [12, 10],
  [2, 12], [3, 12], [4, 12], [8, 12], [9, 12], [10, 12]
];

const rails = [
  makeRail(document.querySelector("#life-left"), PAGE_SEED ^ 17, true),
  makeRail(document.querySelector("#life-right"), PAGE_SEED ^ 43, false)
];
const pulsar = makePulsar(document.querySelector("#pulsar-end"));
let scrollGeneration = -1;

resize();
syncToScroll(true);
pulsar.resize();
setInterval(() => pulsar.step(), PULSAR_STEP_MS);

window.addEventListener("resize", () => {
  resize();
  syncToScroll(true);
  pulsar.resize();
});
window.addEventListener("scroll", () => syncToScroll(), { passive: true });

function makeRail(canvas, seed, alignRight) {
  const context = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let offsetX = 0;
  let grid = new Uint8Array(0);
  let next = new Uint8Array(0);
  let generation = 0;

  return { resize, setGeneration };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    width = Math.max(0, Math.ceil(rect.width / CELL));
    height = Math.max(0, Math.ceil(rect.height / CELL));
    offsetX = alignRight ? rect.width - width * CELL : 0;
    grid = new Uint8Array(width * height);
    next = new Uint8Array(width * height);
    seedGrid();
  }

  function setGeneration(target) {
    if (!width || !height) return;
    if (target < generation) seedGrid();

    while (generation < target) {
      [grid, next] = stepLife(grid, next, width, height);
      generation += 1;
    }

    draw();
  }

  function seedGrid() {
    const random = randomFrom(seed + width * 7 + height * 13);

    for (let i = 0; i < grid.length; i += 1) {
      grid[i] = random() < RAIL_DENSITY ? 1 : 0;
    }

    generation = 0;
    draw();
  }

  function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = getCss("--life-cell-color");

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (grid[y * width + x]) {
          context.fillRect(offsetX + x * CELL, y * CELL, CELL - 1, CELL - 1);
        }
      }
    }
  }
}

function makePulsar(canvas) {
  const context = canvas.getContext("2d");
  const size = 15;
  let grid = new Uint8Array(size * size);
  let next = new Uint8Array(size * size);
  let pixelSize = 1;
  let cellSize = 1;

  seed();

  return { resize, step };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    cellSize = Math.max(1, Math.floor(Math.min(rect.width, rect.height) / size));
    pixelSize = cellSize * size;
    canvas.width = Math.floor(pixelSize * ratio);
    canvas.height = Math.floor(pixelSize * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }

  function seed() {
    grid.fill(0);
    next.fill(0);

    for (const [x, y] of PULSAR) {
      grid[(y + 1) * size + x + 1] = 1;
    }
  }

  function step() {
    [grid, next] = stepLife(grid, next, size, size);
    draw();
  }

  function draw() {
    context.clearRect(0, 0, pixelSize, pixelSize);
    context.fillStyle = getCss("--foreground");

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (grid[y * size + x]) {
          context.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
  }
}

function resize() {
  rails.forEach((rail) => rail.resize());
}

function syncToScroll(force = false) {
  const target = Math.floor(window.scrollY / SCROLL_PER_GENERATION);
  if (!force && target === scrollGeneration) return;

  scrollGeneration = target;
  rails.forEach((rail) => rail.setGeneration(target));
}

function stepLife(grid, next, width, height) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const neighbors = countNeighbors(grid, width, height, x, y);
      next[index] = neighbors === 3 || (grid[index] && neighbors === 2) ? 1 : 0;
    }
  }

  return [next, grid];
}

function countNeighbors(grid, width, height, x, y) {
  let count = 0;

  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (!dx && !dy) continue;

      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        count += grid[ny * width + nx];
      }
    }
  }

  return count;
}

function getCss(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function randomFrom(seed) {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let nextValue = value;
    nextValue = Math.imul(nextValue ^ (nextValue >>> 15), nextValue | 1);
    nextValue ^= nextValue + Math.imul(nextValue ^ (nextValue >>> 7), nextValue | 61);
    return ((nextValue ^ (nextValue >>> 14)) >>> 0) / 4294967296;
  };
}
