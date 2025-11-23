// UI.js
// NOTE: Assuming UI.js, constants.js, and Ludo.js are siblings in the same folder (e.g., 'ludo/')
import { COORDINATES_MAP, PLAYERS, STEP_LENGTH, ALL_PLAYERS } from './constants.js';

// Query DOM elements at the top level. They may be null if the script runs too early.
const diceButtonElement = document.querySelector('#dice-btn');
const resetButtonElement = document.querySelector('button#reset-btn'); // Query reset button here for consistency/safety

// UPDATED: Include P3 and P4 pieces in the selector
const playerPiecesElements = {
    P1: document.querySelectorAll('[player-id="P1"].player-piece'),
    P2: document.querySelectorAll('[player-id="P2"].player-piece'),
    P3: document.querySelectorAll('[player-id="P3"].player-piece'), // NEW
    P4: document.querySelectorAll('[player-id="P4"].player-piece'), // NEW
}
const playerCountElement = document.querySelector('#player-count'); // NEW selector element

export class UI {
    static listenDiceClick(callback) {
        // ADD NULL CHECK: Only attach listener if the element exists
        if (diceButtonElement) {
            diceButtonElement.addEventListener('click', callback);
        } else {
             console.error('Dice button element not found. Check index.html and script timing.');
        }
    }

    static listenResetClick(callback) {
        // ADD NULL CHECK: Only attach listener if the element exists
        if (resetButtonElement) {
            resetButtonElement.addEventListener('click', callback)
        } else {
            console.error('Reset button element not found. Check index.html and script timing.');
        }
    }

    static listenPieceClick(callback) {
        const piecesContainer = document.querySelector('.player-pieces');
        if (piecesContainer) {
             piecesContainer.addEventListener('click', callback)
        }
    }
    
    // NEW: Listener for player count change
    static listenPlayerCountChange(callback) {
        if (playerCountElement) {
            playerCountElement.addEventListener('change', callback);
        }
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
        // Use the actual PLAYERS array which is now dynamically sized
        const activePlayers = window.PLAYERS || PLAYERS; 
        
        if(index < 0 || index >= activePlayers.length) {
            console.error('index out of bound or PLAYERS array not set!');
            return;
        }
        
        const player = activePlayers[index];

        // Display player ID
        const activePlayerSpan = document.querySelector('.active-player span');
        if(activePlayerSpan) activePlayerSpan.innerText = player;

        // Unhighlight all player bases first
        document.querySelectorAll('.player-base.highlight').forEach(base => {
            base.classList.remove('highlight');
        });

        // highlight the active player base
        const activeBase = document.querySelector(`[player-id="${player}"].player-base`);
        if(activeBase) activeBase.classList.add('highlight');
    }

    static enableDice() {
        if(diceButtonElement) diceButtonElement.removeAttribute('disabled');
    }

    static disableDice() {
        if(diceButtonElement) diceButtonElement.setAttribute('disabled', '');
    }

    /**
     * * @param {string} player 
     * @param {Number[]} pieces 
     */
    static highlightPieces(player, pieces) {
        pieces.forEach(piece => {
            const pieceElement = playerPiecesElements[player][piece];
            if(pieceElement) pieceElement.classList.add('highlight');
        })
    }

    static unhighlightPieces() {
        document.querySelectorAll('.player-piece.highlight').forEach(ele => {
            ele.classList.remove('highlight');
        })
    }

    static setDiceValue(value) {
        const diceValueElement = document.querySelector('.dice-value');
        if(diceValueElement) diceValueElement.innerText = value;
    }
    
    // NEW: Function to hide/show pieces and bases for inactive players
    static setGameVisibility(activePlayers) {
        // Hide all pieces and bases initially
        ALL_PLAYERS.forEach(player => {
            const base = document.querySelector(`[player-id="${player}"].player-base`);
            if(base) base.style.display = 'none';
            playerPiecesElements[player].forEach(piece => {
                if(piece) piece.style.display = 'none';
            });
        });
        
        // Show only the active players' elements
        activePlayers.forEach(player => {
            const base = document.querySelector(`[player-id="${player}"].player-base`);
            if(base) base.style.display = 'block';
            playerPiecesElements[player].forEach(piece => {
                if(piece) piece.style.display = 'block';
            });
        });
    }
}