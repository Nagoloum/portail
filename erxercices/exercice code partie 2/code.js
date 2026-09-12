const fs = require('fs');

const raw = fs.readFileSync('input.txt', 'utf8').trimEnd();

const grid = raw.split('\n').map(line => line.split(''));
const rows = grid.length;
const cols = grid[0].length;

let startRow, startCol;

for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
        if (grid[i][j] === '^') {
            startRow = i;
            startCol = j;
        }
    }
}

const directions = [
    [-1, 0], // up
    [0, 1],  // right
    [1, 0],  // down
    [0, -1], // left
];

function walf(startD) {
    const seenstates = new Uint8Array(rows * cols * 4);
    const visited = new Set();
    let r = startRow;
    let c = startCol;
    let d = startD;

    const mark = () => {
        seenstates[(r * cols * 4 + c) * 4 + d] = 1;
        visited.add(`${r},${c}`);
    };
    mark();

    while (true) {
        const [dr, dc] = directions[d];
        const nr = r + dr, nc = c + dc;

        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
            return { loop: false, visited };
        }

        if (grid[nr][nc] === '#') {
            d = (d + 1) % 4; // turn right
        } else {
            r = nr;
            c = nc;
            const stateIndex = (r * cols + c) * 4 + d;

            if (seenstates[stateIndex]) {
                return { loop: true, visited };
            }

            seenstates[stateIndex] = 1;
            visited.add(`${r},${c}`);
        }
    }
}


// en code ant j'ai réalisé que on peux avoir l'exercice 1 dans l'ercice 2 donc j'ai juste fait un console.log pour afficher le nombre de cases visitées

const { visited } = walf(0);

console.log('partie 1:', visited.size);

// partie 2
let loopCount = 0;

for(const key of visited) {
    const [r, c] = key.split(',').map(Number);

    if (r === startRow && c === startCol) continue; // skip the starting position

    grid[r][c] = '#'; // mark the cell as a wall
    if (walf(0).loop) {
        loopCount++;
    }
    grid[r][c] = '.'; // reset the cell back to empty
}

console.log('partie 2:', loopCount);