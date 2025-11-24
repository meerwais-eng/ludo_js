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
            this.updatePlayerCount(event.target.value);
            this.resetGame();
        })
    }

    updatePlayerCount(count) {
        count = parseInt(count);
        setPlayers(count); // Update the PLAYERS array in constants.js
        this.currentPositions = {};
        PLAYERS.forEach(player => {
            this.currentPositions[player] = [];
        })

        // Update UI visibility
        UI.setGameVisibility(PLAYERS);
    }

    listenDiceClick() {
        UI.listenDiceClick(() => {
            this.rollDice();
        });
    }

    listenResetClick() {
        UI.listenResetClick(() => {
            this.resetGame();
        })
    }

    listenPieceClick() {
        UI.listenPieceClick(event => {
            const pieceElement = event.target.closest('.player-piece.highlight');
            
            if(pieceElement) {
                const player = pieceElement.getAttribute('player-id');
                const piece = parseInt(pieceElement.getAttribute('piece'));
                
                if(player === this.currentPlayer) {
                    this.movePiece(player, piece, this.diceValue);
                }
            }
        })
    }

    resetGame() {
        this.currentPositions = {};
        PLAYERS.forEach(player => {
            this.currentPositions[player] = [];
            [0, 1, 2, 3].forEach(piece => {
                this.setPiecePosition(player, piece, BASE_POSITIONS[player][piece]);
            })
        })

        this.turn = 0;
        this.diceValue = 1; // Initial dummy value
        this.state = STATE.DICE_NOT_ROLLED;
    }

    get currentPlayer() {
        return PLAYERS[this.turn % PLAYERS.length];
    }

    rollDice() {
        const player = this.currentPlayer;
        this.state = STATE.DICE_ROLLED;

        this.diceValue = Math.floor(Math.random() * 6) + 1;
        
        // Simulating the dice roll animation time
        setTimeout(() => {
            const possibleMoves = this.getPossibleMoves(player);

            if(possibleMoves.length) {
                
                // FIX: Auto-move if only one piece can move.
                if (possibleMoves.length === 1) {
                    this.movePiece(player, possibleMoves[0], this.diceValue);
                    return; // Exit as the move is handled automatically
                }
                
                UI.highlightPieces(player, possibleMoves);
            } else {
                // No possible moves, turn passes to next player
                this.incrementTurn();
                this.state = STATE.DICE_NOT_ROLLED;
            }
        }, 800)
    }

    getPossibleMoves(player) {
        const movablePieces = [];

        [0, 1, 2, 3].forEach(piece => {
            const currentPosition = this.currentPositions[player][piece];
            const diceValue = this.diceValue;

            if(currentPosition in BASE_POSITIONS[player]) {
                // Piece is in base
                if(diceValue === 6) {
                    movablePieces.push(piece);
                }
            } else {
                // Piece is on the board or in home entrance
                const newPosition = this.getNewPosition(player, piece, diceValue);
                if(newPosition <= HOME_POSITIONS[player]) { // Check if new position is not beyond home
                    movablePieces.push(piece);
                }
            }
        });

        return movablePieces;
    }

    getNewPosition(player, piece, diceValue) {
        const currentPosition = this.currentPositions[player][piece];
        let newPosition = currentPosition + diceValue;

        // Check for turning point to home path
        const turningPoint = TURNING_POINTS[player];

        if(currentPosition <= turningPoint && newPosition > turningPoint) {
            const overshoot = newPosition - turningPoint;
            newPosition = HOME_ENTRANCE[player][0] + (overshoot - 1);
        }

        return newPosition;
    }

    setPiecePosition(player, piece, newPosition) {
        this.currentPositions[player][piece] = newPosition;
        UI.setPiecePosition(player, piece, newPosition);
    }

    movePiece(player, piece, diceValue) {
        this.state = STATE.MOVING;
        UI.unhighlightPieces();

        let moves = diceValue;
        const interval = setInterval(() => {
            this.incrementPiecePosition(player, piece);
            moves--;

            if(moves === 0) {
                clearInterval(interval);

                if(this.hasPlayerWon(player)) {
                    console.log(`Player ${player} has won!`);
                    // Winner gets another turn (dice roll)
                    this.state = STATE.DICE_NOT_ROLLED;
                }
                else { // not a win
                    const isKill = this.checkForKill(player, piece);

                    if(isKill || this.diceValue === 6) {
                        this.state = STATE.DICE_NOT_ROLLED;
                        return;
                    }

                    this.incrementTurn();
                    // FIX: Deactivate piece and activate dice for the next player
                    this.state = STATE.DICE_NOT_ROLLED; 
                }
            }
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

                if(currentPosition === opponentPosition && !SAFE_POSITIONS.includes(currentPosition)) {
                    this.setPiecePosition(opponent, opponentPiece, BASE_POSITIONS[opponent][opponentPiece]);
                    kill = true;
                }
            })
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
        const currentPosition = this.currentPositions[player][piece];

        if(currentPosition in BASE_POSITIONS[player]) {
            this.setPiecePosition(player, piece, START_POSITIONS[player]);
        } else {
            this.setPiecePosition(player, piece, this.getIncrementedPosition(player, piece));
        }
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
    }
}