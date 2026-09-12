const fs = require('fs');

const raw = fs.readFileSync('input.txt', 'utf8').trimEnd();

function solve(raw) {
    const grid = raw.split('\n').map(line => line.split(''));
    const rows = grid.length;
    const cols = grid[0].length;

    let r,c;

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (grid[i][j] === '^') {
                r = i;
                c = j;
            }
        }
    }

    const directions = [
        [-1, 0], // up
        [0, 1],  // right
        [1, 0],  // down
        [0, -1], // left
    ];

    let d = 0; // start facing up

    const visited = new Set();

    visited.add(`${r},${c}`);

    while (true) {
        const [dr, dc] = directions[d];
        const nr = r + dr;
        const nc = c + dc;

        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) break; // out of bounds

        if (grid[nr][nc] === '#') {
            // turn right
            d = (d + 1) % 4;
        } else {
            // move forward
            r = nr;
            c = nc;
            visited.add(`${r},${c}`);
        }
    }

    return visited.size;
}

console.log(solve(raw));