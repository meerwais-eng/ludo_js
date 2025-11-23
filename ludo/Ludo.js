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

    updatePlayerCount(count) {
        setPlayers(count);
        this.isTeamMode = count === 4;
        UI.setGameVisibility(PLAYERS);
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

    getMovablePieces(player, diceValue) {
        return [0, 1, 2, 3].filter(piece => {
            const currentPosition = this.currentPositions[player][piece];
            const isAtBase = BASE_POSITIONS[player].includes(currentPosition);

            // Rule 1: Must roll a 6 to move piece from base
            if (isAtBase) {
                return diceValue === 6;
            }

            // Rule 2: Cannot move past the home position
            const newPosition = this.getNewPosition(player, piece, diceValue);
            return newPosition !== HOME_POSITIONS[player] + 1;
        });
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