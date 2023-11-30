# Valorant GM Alpha

A single-player esport simulation game about the game valorant. Make trades, set rosters, draft
rookies, and try to build the next dynasty, all from within your web browser.
The game is implemented entirely in client-side JavaScript, backed by
IndexedDB. This game is a fork of LOL GM by Jeremy Scheff.

## Installing and Running

### Prerequisites:

- Node
  - [https://nodejs.org/en/](https://nodejs.org/en/)
- Make
  - [https://www.gnu.org/software/make/](https://www.gnu.org/software/make/)
- Global install of Node-minify
  - [https://www.npmjs.com/package/node-minify](https://www.npmjs.com/package/node-minify)

### 1. Building

```bash
git clone https://github.com/qwertydelle/valgm.git
cd valgm
npm install
make
```

### 2. Running

```bash
cd valgm
node server.js
```

## Debugging and Problem Solving

For debugging information, go to http://play.basketball-gm.com/ and click on
Help > Debugging.

To run the test suite, go to http://localhost:8080/test
