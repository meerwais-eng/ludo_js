import { BASE_POSITIONS, HOME_ENTRANCE, HOME_POSITIONS, PLAYERS, SAFE_POSITIONS, START_POSITIONS, STATE, TURNING_POINTS, ALL_PLAYERS, setPlayers, TEAM_PLAYERS } from './constants.js';
import { UI } from './UI.js';

export class Ludo {
    currentPositions = {}; 
    isTeamMode = false; 

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
            const playerCount = parseInt(event.target.value);
            this.updatePlayerCount(playerCount);
            this.resetGame();
        });
    }

    updatePlayerCount(count) {
        setPlayers(count); // Update the global PLAYERS array
        this.isTeamMode = (count === 4);
        UI.setGameVisibility(PLAYERS); // Show/Hide bases and pieces
    }

    listenDiceClick() {
        UI.listenDiceClick(() => {
            this.diceValue = this.rollDice();
            this.state = STATE.DICE_ROLLED;

            this.movePieceByDice();
        })
    }

    listenResetClick() {
        UI.listenResetClick(() => {
            this.resetGame();
        })
    }

    listenPieceClick() {
        UI.listenPieceClick((event) => {
            const pieceElement = event.target;

            if(!pieceElement.classList.contains('player-piece') || !pieceElement.classList.contains('highlight')) {
                return;
            }

            const player = pieceElement.getAttribute('player-id');
            const piece = parseInt(pieceElement.getAttribute('piece'));

            this.movePiece(player, piece);
        })
    }

    resetGame() {
        this.currentPositions = {};

        // Initialize positions for all active players
        PLAYERS.forEach(player => {
            this.currentPositions[player] = BASE_POSITIONS[player].slice();
        });

        // Set pieces to base positions in UI
        PLAYERS.forEach(player => {
            [0, 1, 2, 3].forEach(piece => {
                UI.setPiecePosition(player, piece, BASE_POSITIONS[player][piece]);
            })
        });

        this.diceValue = 1;
        this.turn = 0;
        this.state = STATE.DICE_NOT_ROLLED;
    }

    rollDice() {
        return Math.floor(Math.random() * 6) + 1;
    }

    setPiecePosition(player, piece, position) {
        this.currentPositions[player][piece] = position;
        UI.setPiecePosition(player, piece, position);
    }
    
    getMovablePieces(player, diceValue) {
        const movablePieces = [];

        [0, 1, 2, 3].forEach(piece => {
            const currentPosition = this.currentPositions[player][piece];

            // Piece in Base (Only moves out on a 6)
            if (BASE_POSITIONS[player].includes(currentPosition)) {
                if (diceValue === 6) {
                    movablePieces.push(piece);
                }
                return; // Piece cannot move if in base and not a 6
            }
            
            // Piece is out (Calculate next position)
            const nextPosition = this.getIncrementedPosition(player, piece, diceValue);
            
            // Check if the move is valid (i.e., not overshooting the HOME_POSITIONS)
            if (nextPosition !== null) {
                movablePieces.push(piece);
            }
        });

        return movablePieces;
    }

    // FIX: Core logic to enable piece movement and correct turn flow
    movePieceByDice() {
        const player = PLAYERS[this.turn];
        
        // Find all pieces of the current player that can move with the dice value
        const movablePieces = this.getMovablePieces(player, this.diceValue);

        if (movablePieces.length > 0) {
            // FIX: Highlight the movable pieces to make them 'active'
            UI.highlightPieces(player, movablePieces);
            
            // The state remains STATE.DICE_ROLLED, waiting for piece click.
            
        } else {
            // No movable pieces.
            
            // 1. Re-enable dice for the next action.
            this.state = STATE.DICE_NOT_ROLLED;
            
            // 2. Check for turn pass: If it's not a 6, the turn passes immediately.
            if (this.diceValue !== 6) {
                this.incrementTurn();
            }
            // If it is a 6, the state is set to DICE_NOT_ROLLED, allowing a free re-roll.
        }
    }

    movePiece(player, piece) {
        const currentPosition = this.currentPositions[player][piece];

        // 1. If piece is in base and rolled a 6, move it to START_POSITIONS
        if (BASE_POSITIONS[player].includes(currentPosition) && this.diceValue === 6) {
            this.setPiecePosition(player, piece, START_POSITIONS[player]);
        } 
        // 2. If piece is already out, move it by the dice value
        else if (!BASE_POSITIONS[player].includes(currentPosition)) {
            let newPosition = currentPosition;
            for(let i = 0; i < this.diceValue; i++) {
                newPosition = this.getIncrementedPosition(player, piece, 1); // Move one step at a time
                if (newPosition === null) return; // Should not happen with getIncrementedPosition, but safety check

                this.setPiecePosition(player, piece, newPosition);
            }
        } else {
            return; // Invalid move
        }

        // 3. Check for kill/win condition and manage turn
        setTimeout(() => {
            const isWin = this.hasPlayerWon(player);
            if (isWin) {
                UI.showToast(`${player} wins!`, 'green');
                this.state = STATE.DICE_NOT_ROLLED;
                // Game over, no turn increment
                return; 
            }

            const isKill = this.checkForKill(player, piece);

            if(isKill || this.diceValue === 6) {
                this.state = STATE.DICE_NOT_ROLLED; // Re-enable dice for another roll/free turn
                return;
            }

            this.incrementTurn(); // Pass turn
        }, 200);
    }

    checkForKill(player, piece) {
        const currentPosition = this.currentPositions[player][piece];
        let kill = false;

        // Iterate over all active opponents
        const opponents = PLAYERS.filter(p => p !== player);

        opponents.forEach(opponent => {
            [0, 1, 2, 3].forEach(opponentPiece => {
                const opponentPosition = this.currentPositions[opponent][opponentPiece];

                // Check for a kill: same position and not a safe spot
                if(currentPosition === opponentPosition && !SAFE_POSITIONS.includes(currentPosition)) {
                    this.setPiecePosition(opponent, opponentPiece, BASE_POSITIONS[opponent][opponentPiece]);
                    UI.showToast(`${player} killed ${opponent}'s piece!`, 'red');
                    kill = true;
                }
            })
        });

        return kill
    }

    hasPlayerWon(player) {
        // Individual Win Condition: All 4 pieces of the current player are home.
        return [0, 1, 2, 3].every(piece => this.currentPositions[player][piece] === HOME_POSITIONS[player]);
    }

    incrementPiecePosition(player, piece) {
        this.setPiecePosition(player, piece, this.getIncrementedPosition(player, piece, 1));
    }
    
    getIncrementedPosition(player, piece, steps = 1) {
        let currentPosition = this.currentPositions[player][piece];
        let newPosition = currentPosition;

        for (let i = 0; i < steps; i++) {
            // If the piece is in base, the next position is its start position (only on a 6, but we check here for simplicity)
            if (BASE_POSITIONS[player].includes(newPosition)) {
                return START_POSITIONS[player];
            }

            // Check for turning point (transition to the home entrance path)
            if(newPosition === TURNING_POINTS[player]) {
                newPosition = HOME_ENTRANCE[player][0];
            }
            // Check if piece is in the home entrance path (100-105, 200-205, etc.)
            else if(newPosition >= HOME_ENTRANCE[player][0] && newPosition < HOME_POSITIONS[player]) {
                newPosition++;
            }
            // Check if piece overshoots the home position
            else if (newPosition === HOME_POSITIONS[player]) {
                // Already home, no further movement is possible
                return null; 
            }
            // Check for wrap around (51 wraps to 0)
            else if(newPosition === 51) {
                newPosition = 0;
            }
            // Normal movement
            else {
                newPosition++;
            }
            
            // Check for overshoot in the loop
            if (newPosition > HOME_POSITIONS[player]) {
                return null;
            }
        }
        
        return newPosition;
    }

    incrementTurn() {
        // Find the index of the next active player in the PLAYERS array
        let nextTurnIndex = (this.turn + 1) % PLAYERS.length;
        this.turn = nextTurnIndex;
    }
}