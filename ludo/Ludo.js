import { BASE_POSITIONS, HOME_ENTRANCE, HOME_POSITIONS, PLAYERS, SAFE_POSITIONS, START_POSITIONS, STATE, TURNING_POINTS, ALL_PLAYERS, setPlayers, TEAM_PLAYERS } from './constants.js';
// *** FIX APPLIED HERE ***
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
            const count = parseInt(event.target.value);
            this.updatePlayerCount(count);
            this.resetGame(); // Reset game when player count changes
        });
    }

   updatePlayerCount(countString) {
    const playerCount = parseInt(countString);
    // Logic to set the team mode flag based on the select value
    this.isTeamMode = (countString === '4-team'); 
    
    // If it's 4-player team or 4-player individual, set 4 active players.
    const playersToSet = (this.isTeamMode || playerCount === 4) ? 4 : playerCount;
    
    // setPlayers() is from constants.js and handles the PLAYERS array
    setPlayers(playersToSet); 
    
    // UI update and game reset
    UI.setGameVisibility(PLAYERS);
    this.resetGame();
}
    resetGame() {
        PLAYERS.forEach(player => {
            this.currentPositions[player] = BASE_POSITIONS[player].slice();
            this.currentPositions[player].forEach((pos, index) => {
                this.setPiecePosition(player, index, pos);
            });
        });
        this.turn = 0;
        this.diceValue = 1; // Default dice value
        this.state = STATE.DICE_NOT_ROLLED;
        console.log('Game has been reset.');
    }

    listenResetClick() {
        UI.listenResetClick(this.resetGame.bind(this));
    }

    listenDiceClick() {
        UI.listenDiceClick(this.handleDiceClick.bind(this));
    }

    handleDiceClick() {
        if(this.state !== STATE.DICE_NOT_ROLLED) {
            return;
        }

        const diceValue = Math.floor(Math.random() * 6) + 1;
        this.diceValue = diceValue;
        
        const player = PLAYERS[this.turn];
        const movablePieces = this.getMovablePieces(player, diceValue);

        if(movablePieces.length) {
            this.state = STATE.DICE_ROLLED;
            UI.highlightPieces(player, movablePieces);
        } else {
            // Cannot move, go to next turn after a small delay
            this.state = STATE.PIECE_MOVE_IN_PROGRESS; 
            setTimeout(() => {
                this.incrementTurn();
            }, 500);
        }
    }

    /**
 * Helper to determine which pieces can move with the current dice roll.
 */
getMovablePieces(player, diceValue) {
    const movablePieces = [];
    
    [0, 1, 2, 3].forEach(piece => {
        const currentPos = this.currentPositions[player][piece];
        
        // Rule 1: Piece is in base, must roll 6 to move out.
        if (BASE_POSITIONS[player].includes(currentPos)) {
            if (diceValue === 6) {
                // In a proper Ludo game, you'd also check if the START_POSITIONS[player] is safe/available.
                movablePieces.push(piece);
            }
        } 
        // Rule 2: Piece is out of base.
        else {
            // Check if the final position is valid (i.e., not overshooting the HOME_POSITIONS)
            // NOTE: This relies on a robust getIncrementedPosition/canReachDestination function 
            // in your full Ludo logic to check for overshooting the Home slot.
            // We assume a value <= HOME_POSITIONS[player] means it's a valid end point.
            // For simplicity, we assume any move that is not from the base is valid if it doesn't overshoot.
            
            // To ensure the piece doesn't overshoot, you must check the destination
            // (The exact implementation of this check depends on your full movement code)
            
            // Assuming an imaginary helper function exists to check if the destination is reachable:
            if (this.canReachDestination(player, piece, diceValue)) { 
                movablePieces.push(piece);
            }
        }
    });
    return movablePieces;
}


// **MODIFY** the existing rollDice() method
rollDice() {
    const diceValue = Math.floor(Math.random() * 6) + 1;
    const player = PLAYERS[this.turn];

    this.diceValue = diceValue;

    const movablePieces = this.getMovablePieces(player, diceValue);

    if (movablePieces.length === 1) {
        // **NEW: AUTOMATIC MOVE** - Only one piece can move.
        this.state = STATE.DICE_ROLLED; 
        // Move the single piece. Your existing movePiece should handle the full distance and turn transition.
        this.movePiece(player, movablePieces[0]); 

    } else if (movablePieces.length > 1) {
        // Multiple options, highlight pieces and wait for user click
        UI.highlightPieces(player, movablePieces);
        this.state = STATE.DICE_ROLLED;
    } else {
        // No possible moves
        this.state = STATE.DICE_ROLLED; 

        if (diceValue !== 6) {
            this.incrementTurn();
        } else {
            // Rolled a 6 but can't move, still keep the turn.
            this.state = STATE.DICE_NOT_ROLLED;
        }
    }
}

    getNewPosition(player, piece, diceValue) {
        const currentPosition = this.currentPositions[player][piece];
        let newPosition = currentPosition + diceValue;

        // Check for turning point 
        if(currentPosition < TURNING_POINTS[player] && newPosition >= TURNING_POINTS[player]) {
            newPosition = newPosition + HOME_ENTRANCE[player][0] - TURNING_POINTS[player];
        }

        // Check for wrap around
        if (newPosition > 51 && currentPosition <= 51) {
            newPosition = newPosition - 52;
        }

        // Check for overshooting Home
        if(newPosition > HOME_POSITIONS[player]) {
            return HOME_POSITIONS[player] + 1;
        }

        return newPosition;
    }

    listenPieceClick() {
        UI.listenPieceClick(this.handlePieceClick.bind(this));
    }

    handlePieceClick(event) {
        const pieceElement = event.target.closest('.player-piece.highlight');
        if(!pieceElement) return;

        if(this.state !== STATE.DICE_ROLLED) return;

        const player = pieceElement.getAttribute('player-id');
        const piece = parseInt(pieceElement.getAttribute('piece'));
        
        if(player !== PLAYERS[this.turn]) return;

        this.movePiece(player, piece);
    }

    setPiecePosition(player, piece, newPosition) {
        this.currentPositions[player][piece] = newPosition;
        UI.setPiecePosition(player, piece, newPosition);
    }

    movePiece(player, piece) {
        const currentPosition = this.currentPositions[player][piece];
        
        // Start piece at START_POSITION if it was at BASE_POSITION and dice is 6
        if(BASE_POSITIONS[player].includes(currentPosition) && this.diceValue === 6) {
            this.setPiecePosition(player, piece, START_POSITIONS[player]);
            this.checkAndCompleteMove(player, piece);
        } 
        // Move piece normally
        else if (!BASE_POSITIONS[player].includes(currentPosition)) {
            this.state = STATE.PIECE_MOVE_IN_PROGRESS;
            this.animateMove(player, piece, 0);
        }
    }

    animateMove(player, piece, step) {
        if (step < this.diceValue) {
            setTimeout(() => {
                this.incrementPiecePosition(player, piece);
                this.animateMove(player, piece, step + 1);
            }, 200);
        } else {
            this.checkAndCompleteMove(player, piece);
        }
    }

    checkAndCompleteMove(player, piece) {
        this.state = STATE.PIECE_MOVE_IN_PROGRESS; 
        
        setTimeout(() => {
            // Check for win condition
            if(this.hasPlayerWon(player)) {
                alert(`${player} won!`);
                this.state = STATE.GAME_OVER;
                UI.disableDice();
                return;
            }

            // Check for kill
            const isKill = this.checkForKill(player, piece);

            // Turn logic
            if(isKill || this.diceValue === 6) {
                this.state = STATE.DICE_NOT_ROLLED;
                return; // Player gets another turn
            }

            this.incrementTurn();
        }, 200);
    }

    checkForKill(player, piece) {
        const currentPosition = this.currentPositions[player][piece];
        let kill = false;

        // Iterate over all active opponents
        const opponents = PLAYERS.filter(p => p !== player);

        opponents.forEach(opponent => {
            // Kill only happens if piece is on a shared tile and not a safe spot
            if (this.currentPositions[opponent]) { // Check if opponent is an active player
                [0, 1, 2, 3].forEach(opponentPiece => {
                    const opponentPosition = this.currentPositions[opponent][opponentPiece];

                    // Check for a kill
                    if(currentPosition === opponentPosition && !SAFE_POSITIONS.includes(currentPosition)) {
                        this.setPiecePosition(opponent, opponentPiece, BASE_POSITIONS[opponent][opponentPiece]);
                        kill = true;
                    }
                })
            }
        });

        return kill
    }

    hasPlayerWon(player) {
        if (this.isTeamMode) {
            // Team Win Condition: All 8 pieces (player + teammate) are home.
            const teammate = TEAM_PLAYERS.getTeammate(player);
            if (!teammate) return false; 
            
            const playerPiecesHome = [0, 1, 2, 3].every(piece => this.currentPositions[player][piece] === HOME_POSITIONS[player]);
            const teammatePiecesHome = [0, 1, 2, 3].every(piece => this.currentPositions[teammate][piece] === HOME_POSITIONS[teammate]);

            return playerPiecesHome && teammatePiecesHome;
            
        } else {
            // Individual Win Condition: All 4 pieces of the current player are home.
            return [0, 1, 2, 3].every(piece => this.currentPositions[player][piece] === HOME_POSITIONS[player]);
        }
    }

    incrementPiecePosition(player, piece) {
        this.setPiecePosition(player, piece, this.getIncrementedPosition(player, piece));
    }
    
    getIncrementedPosition(player, piece) {
        const currentPosition = this.currentPositions[player][piece];

        // Check for turning point 
        if(currentPosition === TURNING_POINTS[player]) {
            return HOME_ENTRANCE[player][0];
        }

        // Check if piece is in the home entrance path
        if(currentPosition >= HOME_ENTRANCE[player][0] && currentPosition < HOME_POSITIONS[player]) {
            return currentPosition + 1;
        }
        
        // Check for wrap around
        if(currentPosition === 51) {
            return 0;
        }

        // Normal movement
        return currentPosition + 1;
    }

    incrementTurn() {
        this.turn = (this.turn + 1) % PLAYERS.length;
        this.state = STATE.DICE_NOT_ROLLED;
    }
}