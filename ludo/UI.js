import { COORDINATES_MAP, PLAYERS, STEP_LENGTH, ALL_PLAYERS } from './constants.js';

const diceButtonElement = document.querySelector('#dice-btn');
// UPDATED: Include P3 and P4 pieces in the selector
const playerPiecesElements = {
    P1: document.querySelectorAll('[player-id="P1"].player-piece'),
    P2: document.querySelectorAll('[player-id="P2"].player-piece'),
    P3: document.querySelectorAll('[player-id="P3"].player-piece'), // NEW
    P4: document.querySelectorAll('[player-id="P4"].player-piece'), // NEW
}
const playerCountElement = document.querySelector('#player-count'); // NEW

export class UI {
    static listenDiceClick(callback) {
        diceButtonElement.addEventListener('click', callback);
    }

    static listenResetClick(callback) {
        document.querySelector('button#reset-btn').addEventListener('click', callback)
    }

    static listenPieceClick(callback) {
        document.querySelector('.player-pieces').addEventListener('click', callback)
    }

    // NEW: Listener for player count change
    static listenPlayerCountChange(callback) {
        playerCountElement.addEventListener('change', callback);
    }

    /**
     * * @param {string} player 
     * @param {Number} piece 
     * @param {Number} newPosition 
     */
    static setPiecePosition(player, piece, newPosition) {
        if(!playerPiecesElements[player] || !playerPiecesElements[player][piece]) {
            console.error(`Player element of given player: ${player} and piece: ${piece} not found`)
            return;
        }

        const [x, y] = COORDINATES_MAP[newPosition];

        const pieceElement = playerPiecesElements[player][piece];
        pieceElement.style.top = y * STEP_LENGTH + '%';
        pieceElement.style.left = x * STEP_LENGTH + '%';
    }

    static setTurn(index) {
        // Use the current dynamic PLAYERS array from the constants module
        const activePlayers = window.PLAYERS || PLAYERS; 
        
        if(index < 0 || index >= activePlayers.length) {
            console.error('index out of bound or PLAYERS array not set!');
            return;
        }
        
        const player = activePlayers[index];

        // Display player ID
        document.querySelector('.active-player span').innerText = player;

        // Unhighlight all player bases first
        document.querySelectorAll('.player-base.highlight').forEach(base => {
            base.classList.remove('highlight');
        });

        // highlight the active player base
        document.querySelector(`[player-id="${player}"].player-base`).classList.add('highlight');
    }

    static enableDice() {
        diceButtonElement.removeAttribute('disabled');
    }

    static disableDice() {
        diceButtonElement.setAttribute('disabled', '');
    }

    /**
     * * @param {string} player 
     * @param {Number[]} pieces 
     */
    static highlightPieces(player, pieces) {
        pieces.forEach(piece => {
            const pieceElement = playerPiecesElements[player][piece];
            pieceElement.classList.add('highlight');
        })
    }

    static unhighlightPieces() {
        document.querySelectorAll('.player-piece.highlight').forEach(ele => {
            ele.classList.remove('highlight');
        })
    }

    static setDiceValue(value) {
        document.querySelector('.dice-value').innerText = value;
    }
    
    // NEW: Function to hide/show pieces and bases for inactive players
    static setGameVisibility(activePlayers) {
        // Hide all pieces and bases initially
        ALL_PLAYERS.forEach(player => {
            document.querySelector(`[player-id="${player}"].player-base`).style.display = 'none';
            playerPiecesElements[player].forEach(piece => piece.style.display = 'none');
        });
        
        // Show only the active players' elements
        activePlayers.forEach(player => {
            document.querySelector(`[player-id="${player}"].player-base`).style.display = 'block';
            playerPiecesElements[player].forEach(piece => piece.style.display = 'block');
        });
    }
}