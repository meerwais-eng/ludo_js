// UI.js
import { COORDINATES_MAP, PLAYERS, STEP_LENGTH, ALL_PLAYERS } from './constants.js';

const diceButtonElement = document.querySelector('#dice-btn');
const playerPiecesElements = {
    P1: document.querySelectorAll('[player-id="P1"].player-piece'),
    P2: document.querySelectorAll('[player-id="P2"].player-piece'),
    P3: document.querySelectorAll('[player-id="P3"].player-piece'), 
    P4: document.querySelectorAll('[player-id="P4"].player-piece'), 
}
const playerCountElement = document.querySelector('#player-count'); 

export class UI {
    static listenDiceClick(callback) {
        // FIX: Add null check to prevent script crash
        if (diceButtonElement) {
            diceButtonElement.addEventListener('click', callback);
        } else {
            console.error('Dice button not found. Listener not attached.');
        }
    }

    static listenResetClick(callback) {
        const resetBtn = document.querySelector('button#reset-btn');
        // FIX: Query the reset button inside the method and add null check
        if (resetBtn) {
            resetBtn.addEventListener('click', callback);
        } else {
            console.error('Reset button not found. Listener not attached.');
        }
    }

    static listenPieceClick(callback) {
        const piecesContainer = document.querySelector('.player-pieces');
        if (piecesContainer) {
             piecesContainer.addEventListener('click', callback)
        }
    }
    
    static listenPlayerCountChange(callback) {
        if (playerCountElement) {
            playerCountElement.addEventListener('change', callback);
        }
    }

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
        const activePlayers = window.PLAYERS || PLAYERS; 
        
        if(index < 0 || index >= activePlayers.length) {
            console.error('index out of bound or PLAYERS array not set!');
            return;
        }
        
        const player = activePlayers[index];

        const activePlayerSpan = document.querySelector('.active-player span');
        if (activePlayerSpan) activePlayerSpan.innerText = player;

        // Unhighlight all player bases first
        document.querySelectorAll('.player-base.highlight').forEach(base => {
            base.classList.remove('highlight');
        });

        // highlight the active player base
        const activeBase = document.querySelector(`[player-id="${player}"].player-base`);
        if (activeBase) activeBase.classList.add('highlight');
    }

    static enableDice() {
        // FIX: Add null check
        if (diceButtonElement) diceButtonElement.removeAttribute('disabled');
    }

    static disableDice() {
        // FIX: Add null check
        if (diceButtonElement) diceButtonElement.setAttribute('disabled', '');
    }

    static highlightPieces(player, pieces) {
        pieces.forEach(piece => {
            const pieceElement = playerPiecesElements[player][piece];
            if (pieceElement) pieceElement.classList.add('highlight');
        })
    }

    static unhighlightPieces() {
        document.querySelectorAll('.player-piece.highlight').forEach(ele => {
            ele.classList.remove('highlight');
        })
    }

    static setDiceValue(value) {
        const diceValueElement = document.querySelector('.dice-value');
        if (diceValueElement) diceValueElement.innerText = value;
    }
    
    static setGameVisibility(activePlayers) {
        // Hide all pieces and bases initially
        ALL_PLAYERS.forEach(player => {
            const base = document.querySelector(`[player-id="${player}"].player-base`);
            if (base) base.style.display = 'none'; // Null check added
            playerPiecesElements[player].forEach(piece => {
                if (piece) piece.style.display = 'none';
            });
        });
        
        // Show only the active players' elements
        activePlayers.forEach(player => {
            const base = document.querySelector(`[player-id="${player}"].player-base`);
            if (base) base.style.display = 'block'; // Null check added
            playerPiecesElements[player].forEach(piece => {
                if (piece) piece.style.display = 'block';
            });
        });
    }
}