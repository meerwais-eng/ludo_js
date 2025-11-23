import { BASE_POSITIONS, HOME_ENTRANCE, HOME_POSITIONS, PLAYERS, SAFE_POSITIONS, START_POSITIONS, STATE, TURNING_POINTS, ALL_PLAYERS, setPlayers } from './constants.js';
import { UI } from './UI.js';

export class Ludo {
    // Current positions now dynamically sized based on active players
    currentPositions = {}; 

    _diceValue;
    get diceValue() {
        return this._diceValue;
    }
    set diceValue(value) {
        this._diceValue = value;

        UI.setDiceValue(value);
    }

    _turn;
    get turn() {
        return this._turn;
    }
    set turn(value) {
        this._turn = value;
        // The UI now dynamically figures out the player based on the active PLAYERS array
        UI.setTurn(value); 
    }

    _state;
    get state() {
        return this._state;
    }
    set state(value) {
        this._state = value;

        if(value === STATE.DICE_NOT_ROLLED) {
            UI.enableDice();
            UI.unhighlightPieces();
        } else {
            UI.disableDice();
        }
    }

    constructor() {
        console.log('Hello World! Lets play Ludo!');

        this.listenDiceClick();
        this.listenResetClick();
        this.listenPieceClick();
        this.listenPlayerCountChange(); // NEW: Listen for selector change

        this.updatePlayerCount(document.querySelector('#player-count').value);
    }
    
    // NEW: Handle player count change
    listenPlayerCountChange() {
        UI.listenPlayerCountChange((event) => {
            this.updatePlayerCount(event.target.value);
            this.resetGame();
        });
    }

    updatePlayerCount(count) {
        const playerCount = parseInt(count, 10);
        
        // Select the first 'count' players from the ALL_PLAYERS list
        const activePlayers = ALL_PLAYERS.slice(0, playerCount);
        setPlayers(activePlayers); // Update the global PLAYERS constant
        
        // Update UI visibility
        UI.setGameVisibility(activePlayers);
    }

    listenDiceClick() {
        UI.listenDiceClick(this.onDiceClick.bind(this))
    }

    onDiceClick() {
        console.log('dice clicked!');
        this.diceValue = 1 + Math.floor(Math.random() * 6);
        this.state = STATE.DICE_ROLLED;
        
        this.checkForEligiblePieces();
    }

    checkForEligiblePieces() {
        const player = PLAYERS[this.turn]; // Use dynamic PLAYERS array
        // eligible pieces of given player
        const eligiblePieces = this.getEligiblePieces(player);
        if(eligiblePieces.length) {
            // highlight the pieces
            UI.highlightPieces(player, eligiblePieces);
        } else {
            this.incrementTurn();
        }
    }

    incrementTurn() {
        // UPDATED: Use modulo operation based on active PLAYERS length
        this.turn = (this.turn + 1) % PLAYERS.length; 
        this.state = STATE.DICE_NOT_ROLLED;
    }

    getEligiblePieces(player) {
        return [0, 1, 2, 3].filter(piece => {
            const currentPosition = this.currentPositions[player][piece];

            if(currentPosition === HOME_POSITIONS[player]) {
                return false;
            }

            if(
                BASE_POSITIONS[player].includes(currentPosition)
                && this.diceValue !== 6
            ){
                return false;
            }

            // Check if move exceeds home target
            if(
                HOME_ENTRANCE[player].includes(currentPosition)
                && this.diceValue > HOME_POSITIONS[player] - currentPosition
                ) {
                return false;
            }

            return true;
        });
    }

    listenResetClick() {
        UI.listenResetClick(this.resetGame.bind(this))
    }

    resetGame() {
        console.log('reset game');
        
        // Initialize currentPositions only for active players
        this.currentPositions = {}; 
        PLAYERS.forEach(player => {
            this.currentPositions[player] = structuredClone(BASE_POSITIONS[player]);
        });

        // Place all active players' pieces to their starting base positions
        PLAYERS.forEach(player => {
            [0, 1, 2, 3].forEach(piece => {
                this.setPiecePosition(player, piece, this.currentPositions[player][piece])
            })
        });

        this.turn = 0;
        this.state = STATE.DICE_NOT_ROLLED;
    }

    listenPieceClick() {
        UI.listenPieceClick(this.onPieceClick.bind(this));
    }

    onPieceClick(event) {
        const target = event.target;

        if(!target.classList.contains('player-piece') || !target.classList.contains('highlight')) {
            return;
        }
        console.log('piece clicked')

        const player = target.getAttribute('player-id');
        const piece = target.getAttribute('piece');
        
        // NEW: Ensure the clicked piece belongs to the active player
        if(player !== PLAYERS[this.turn]) {
            console.error('Not the active player\'s piece!');
            return;
        }
        
        this.handlePieceClick(player, piece);
    }

    handlePieceClick(player, piece) {
        console.log(player, piece);
        const currentPosition = this.currentPositions[player][piece];
        
        if(BASE_POSITIONS[player].includes(currentPosition) && this.diceValue === 6) {
            this.setPiecePosition(player, piece, START_POSITIONS[player]);
            this.state = STATE.DICE_NOT_ROLLED;
            return;
        }

        UI.unhighlightPieces();
        this.movePiece(player, piece, this.diceValue);
    }

    setPiecePosition(player, piece, newPosition) {
        // Ensure piece is treated as a number
        piece = parseInt(piece, 10);
        this.currentPositions[player][piece] = newPosition;
        UI.setPiecePosition(player, piece, newPosition)
    }

    movePiece(player, piece, moveBy) {
        const interval = setInterval(() => {
            this.incrementPiecePosition(player, piece);
            moveBy--;

            if(moveBy === 0) {
                clearInterval(interval);

                // Check if player won
                if(this.hasPlayerWon(player)) {
                    alert(`Player: ${player} has won!`);
                    this.resetGame();
                    return;
                }

                const isKill = this.checkForKill(player, piece);

                if(isKill || this.diceValue === 6) {
                    this.state = STATE.DICE_NOT_ROLLED;
                    return;
                }

                this.incrementTurn();
            }
        }, 200);
    }

    checkForKill(player, piece) {
        const currentPosition = this.currentPositions[player][piece];
        let kill = false;

        // UPDATED: Iterate over all active opponents, not just 'P1'/'P2'
        const opponents = PLAYERS.filter(p => p !== player);

        opponents.forEach(opponent => {
            [0, 1, 2, 3].forEach(opponentPiece => {
                const opponentPosition = this.currentPositions[opponent][opponentPiece];

                if(currentPosition === opponentPosition && !SAFE_POSITIONS.includes(currentPosition)) {
                    this.setPiecePosition(opponent, opponentPiece, BASE_POSITIONS[opponent][opponentPiece]);
                    kill = true;
                }
            })
        });

        return kill
    }

    hasPlayerWon(player) {
        return [0, 1, 2, 3].every(piece => this.currentPositions[player][piece] === HOME_POSITIONS[player])
    }

    incrementPiecePosition(player, piece) {
        this.setPiecePosition(player, piece, this.getIncrementedPosition(player, piece));
    }
    
    getIncrementedPosition(player, piece) {
        const currentPosition = this.currentPositions[player][piece];

        // Check if piece is in the common path or its own home entrance path
        if(currentPosition >= HOME_ENTRANCE[player][0] && currentPosition < HOME_POSITIONS[player]) {
            return currentPosition + 1; // Already in the home entrance path
        }
        
        // Common path turning point logic
        if(currentPosition === TURNING_POINTS[player]) {
            return HOME_ENTRANCE[player][0];
        }
        
        // Wrapping around the board (from 51 to 0)
        // This only happens for P1 as P1 has start point 0 and 51 is the end of the loop
        if(currentPosition === 51 && player === 'P1') {
            return 0;
        } 
        
        // This logic handles all other pieces moving forward on the common path (0-51)
        return currentPosition + 1;
    }
}