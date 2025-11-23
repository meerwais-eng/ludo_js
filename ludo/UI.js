import { COORDINATES_MAP, PLAYERS, STEP_LENGTH, ALL_PLAYERS, TEAM_PLAYERS } from './constants.js';

// UPDATED SELECTOR for the new dice container
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
        if (diceButtonElement) {
            diceButtonElement.addEventListener('click', callback);
        } else {
            console.error('Dice button not found. Listener not attached.');
        }
    }

    static listenResetClick(callback) {
        const resetBtn = document.querySelector('button#reset-btn');
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
        // Use window.PLAYERS as Ludo.js dynamically sets it via constants.setPlayers
        const activePlayers = window.PLAYERS || PLAYERS; 
        
        if(index < 0 || index >= activePlayers.length) {
            console.error('index out of bound or PLAYERS array not set!');
            return;
        }
        
        const player = activePlayers[index];
        
        // Determine if we are in Team Mode (4 active players & a recognized team)
        const isTeamMode = activePlayers.length === 4 && TEAM_PLAYERS.getTeam(player) !== null;

        const activePlayerSpan = document.querySelector('.active-player span');
        if (activePlayerSpan) {
            if (isTeamMode) {
                 const team = TEAM_PLAYERS.getTeam(player);
                 // Display Player ID and Team
                 activePlayerSpan.innerHTML = `${player} (Team ${team})`;
            } else {
                 activePlayerSpan.innerText = player;
            }
        }

        document.querySelectorAll('.player-base.highlight').forEach(base => {
            base.classList.remove('highlight');
        });

        const activeBase = document.querySelector(`[player-id="${player}"].player-base`);
        if (activeBase) activeBase.classList.add('highlight');
    }

    // UPDATED to use .dice-container class
    static enableDice() {
        if (diceButtonElement) diceButtonElement.classList.remove('disabled');
    }

    // UPDATED to use .dice-container class
    static disableDice() {
        if (diceButtonElement) diceButtonElement.classList.add('disabled');
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

    // UPDATED to rotate the 3D dice model
    static setDiceValue(value) {
        const diceElement = document.querySelector('#dice');
        if (diceElement) {
            // Remove previous face classes (face-1 to face-6)
            diceElement.className = 'dice'; 
            // Apply the new face class for 3D rotation
            diceElement.classList.add(`face-${value}`); 
        }
        
        // Hide the dice value text display (optional, based on your index.html)
        const diceValueElement = document.querySelector('.dice-value');
        if (diceValueElement) diceValueElement.innerText = value;
    }
    
    static setGameVisibility(activePlayers) {
        // Hide all pieces and bases initially
        ALL_PLAYERS.forEach(player => {
            const base = document.querySelector(`[player-id="${player}"].player-base`);
            if (base) base.style.display = 'none';
            playerPiecesElements[player].forEach(piece => {
                if (piece) piece.style.display = 'none';
            });
        });
        
        // Show only the active players' elements
        activePlayers.forEach(player => {
            const base = document.querySelector(`[player-id="${player}"].player-base`);
            if (base) base.style.display = 'block';
            playerPiecesElements[player].forEach(piece => {
                if (piece) piece.style.display = 'block';
            });
        });
    }
}