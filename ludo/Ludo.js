// Ludo.js
import { BASE_POSITIONS, HOME_ENTRANCE, HOME_POSITIONS, PLAYERS, SAFE_POSITIONS, START_POSITIONS, STATE, TURNING_POINTS, ALL_PLAYERS, setPlayers } from './constants.js';
import { UI } from './UI.js';

export class Ludo {
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
        this.listenPlayerCountChange(); 

        const initialCount = document.querySelector('#player-count')?.value || '4';
        this.updatePlayerCount(initialCount);
        this.resetGame();
    }
    
    listenPlayerCountChange() {
        UI.listenPlayerCountChange((event) => {
            this.updatePlayerCount(event.target.value);
            this.resetGame();
        });
    }

    updatePlayerCount(count) {
        const playerCount = parseInt(count, 10);
        let activePlayers;
        
        if (playerCount === 2) {
            // Correct for 2 players: P1 (Bottom-Left) and P2 (Top-Right) are opposite.
            activePlayers = ['P1', 'P2']; 
        } else if (playerCount === 3) {
            // Uses P1, P4, P2 to maintain circular geographical turns for three players.
            activePlayers = ['P1', 'P4', 'P2']; 
        } else { 
            // 4 players: P1, P4, P2, P3 (Clockwise order around the board)
            activePlayers = ALL_PLAYERS; 
        }
        
        setPlayers(activePlayers);
        
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
        const player = PLAYERS[this.turn]; 
        const eligiblePieces = this.getEligiblePieces(player);
        
        if(eligiblePieces.length === 1) {
            // NEW: Auto-move if only one piece is eligible
            const piece = eligiblePieces[0];
            console.log(`Auto-moving piece ${piece} for player ${player}`);
            this.handlePieceClick(player, piece);
        } else if(eligiblePieces.length > 1) {
            // Highlight the pieces if multiple moves are possible
            UI.highlightPieces(player, eligiblePieces);
        } else {
            // No eligible moves, pass turn
            this.incrementTurn();
        }
    }

    incrementTurn() {
        this.turn = (this.turn + 1) % PLAYERS.length; 
        this.state = STATE.DICE_NOT_ROLLED;
    }

    getEligiblePieces(player) {
        return [0, 1, 2, 3].filter(piece => {
            const currentPosition = this.currentPositions[player][piece];

            if(currentPosition === HOME_POSITIONS[player]) {
                return false;
            }

            // Piece is in base and dice is not 6
            if(
                BASE_POSITIONS[player].includes(currentPosition)
                && this.diceValue !== 6
            ){
                return false;
            }

            // Piece is near home but dice value is too high
            // We check the new position, not the current position, to avoid issues.
            const newPosition = currentPosition + this.diceValue;

            if (
                HOME_ENTRANCE[player].includes(currentPosition) || 
                (newPosition > HOME_ENTRANCE[player][0] && newPosition < HOME_POSITIONS[player])
            ) {
                 if (newPosition > HOME_POSITIONS[player]) {
                    return false;
                 }
            }


            return true;
        });
    }

    listenResetClick() {
        UI.listenResetClick(this.resetGame.bind(this))
    }

    resetGame() {
        console.log('reset game');
        
        this.currentPositions = {}; 
        PLAYERS.forEach(player => {
            // Ensure deep clone of base positions
            this.currentPositions[player] = structuredClone(BASE_POSITIONS[player]);
        });

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

        const player = target.getAttribute('player-id');
        const piece = target.getAttribute('piece');
        
        if(player !== PLAYERS[this.turn]) {
            console.error('Not the active player\'s piece!');
            return;
        }
        
        // Piece click manually executes handlePieceClick
        this.handlePieceClick(player, piece);
    }

    handlePieceClick(player, piece) {
        // Ensure piece is parsed to int for array access
        piece = parseInt(piece, 10);
        
        const currentPosition = this.currentPositions[player][piece];
        
        // Case: Piece is in base and dice is 6 (always an eligible move handled first)
        if(BASE_POSITIONS[player].includes(currentPosition) && this.diceValue === 6) {
            this.setPiecePosition(player, piece, START_POSITIONS[player]);
            this.state = STATE.DICE_NOT_ROLLED;
            return;
        }

        // If it was an auto-move, unhighlighting is necessary here
        UI.unhighlightPieces(); 
        this.movePiece(player, piece, this.diceValue);
    }

    setPiecePosition(player, piece, newPosition) {
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

        if(currentPosition === TURNING_POINTS[player]) {
            return HOME_ENTRANCE[player][0];
        }

        if(currentPosition >= HOME_ENTRANCE[player][0] && currentPosition < HOME_POSITIONS[player]) {
            return currentPosition + 1;
        }
        
        if(currentPosition === 51) {
            return 0;
        }

        return currentPosition + 1;
    }
}