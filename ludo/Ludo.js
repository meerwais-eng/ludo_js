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
        } 
        // FIX 2c: Handle GAME_OVER state
        else if (value === STATE.GAME_OVER) {
            UI.disableDice();
            UI.unhighlightPieces();
        }
        else {
            UI.disableDice();
        }
    }

    constructor() {
        console.log('Hello World! Lets play Ludo!');

        this.listenDiceClick();
        this.listenResetClick();
        this.listenPieceClick();
        this.listenPlayerCountChange(); 

        const initialCount = document.querySelector('#player-count')?.value || '4-individual';
        this.updatePlayerCount(initialCount);
        this.resetGame();
    }
    
    listenPlayerCountChange() {
        UI.listenPlayerCountChange((event) => {
            this.updatePlayerCount(event.target.value);
            this.resetGame(); // Automatically reset game when player count changes
        });
    }

    // FIX 3: Update Player Count logic
    updatePlayerCount(value) {
        const [countStr, mode] = value.split('-');
        const playerCount = Number(countStr || value); // Will be 2, 3, or 4
        
        this.isTeamMode = mode === 'team';
        
        setPlayers(playerCount); 
        
        // Reset positions for all pieces
        this.currentPositions = {};
        PLAYERS.forEach(player => {
            this.currentPositions[player] = [...BASE_POSITIONS[player]];
        });

        UI.setGameVisibility(PLAYERS);
    }

    resetGame() {
        this.turn = 0;
        this.state = STATE.DICE_NOT_ROLLED;
        this.diceValue = 1; 

        PLAYERS.forEach(player => {
            [0, 1, 2, 3].forEach(piece => {
                this.setPiecePosition(player, piece, BASE_POSITIONS[player][piece]);
            })
        })
    }

    listenDiceClick() {
        UI.listenDiceClick(this.handleDiceClick.bind(this));
    }

    listenResetClick() {
        UI.listenResetClick(this.resetGame.bind(this));
    }

    listenPieceClick() {
        UI.listenPieceClick(this.handlePieceClick.bind(this));
    }

    handleDiceClick() {
        if (this.state === STATE.GAME_OVER) return; // Prevent rolling if game is over

        this.diceValue = Math.floor(Math.random() * 6) + 1;
        this.state = STATE.DICE_ROLLED;

        this.checkPossibleMoves();
    }

    handlePieceClick(event) {
        const pieceElement = event.target;
        const player = pieceElement.getAttribute('player-id');
        const piece = Number(pieceElement.getAttribute('piece'));

        // Guard clause: Only allow movement if it's the current player's piece AND the state is DICE_ROLLED
        if(player !== PLAYERS[this.turn] || this.state !== STATE.DICE_ROLLED) {
            return;
        }

        const possibleMoves = this.getPossibleMoves(player, this.diceValue);

        if(!possibleMoves.includes(piece)) {
            // Not a piece that can move
            return;
        }

        this.movePiece(player, piece, this.diceValue);
    }

    getPossibleMoves(player, roll) {
        const possibleMoves = [];

        [0, 1, 2, 3].forEach(piece => {
            const currentPosition = this.currentPositions[player][piece];
            
            // 1. Piece is in base and roll is 6
            if(BASE_POSITIONS[player].includes(currentPosition) && roll === 6) {
                possibleMoves.push(piece);
            }
            // 2. Piece is out of base and can move by 'roll' steps
            else if(!BASE_POSITIONS[player].includes(currentPosition)) {
                
                const nextPosition = this.getFuturePosition(player, piece, roll);
                
                // If nextPosition is HOME_POSITIONS[player] or a valid position on the board
                if(nextPosition !== -1) {
                    possibleMoves.push(piece);
                }
            }
        });

        return possibleMoves;
    }

    checkPossibleMoves() {
        const player = PLAYERS[this.turn];
        const possibleMoves = this.getPossibleMoves(player, this.diceValue);

        if(possibleMoves.length) {
            UI.highlightPieces(player, possibleMoves);
        } else {
            // No possible moves, so the turn ends
            this.state = STATE.DICE_NOT_ROLLED;
            this.incrementTurn();
        }
    }

    getFuturePosition(player, piece, roll) {
        let currentPosition = this.currentPositions[player][piece];

        for(let i = 0; i < roll; i++) {
            // Is the piece about to enter the home entrance?
            if(currentPosition === TURNING_POINTS[player]) {
                currentPosition = HOME_ENTRANCE[player][0];
            } 
            // Is the piece in the home entrance path?
            else if(currentPosition >= HOME_ENTRANCE[player][0] && currentPosition < HOME_POSITIONS[player]) {
                currentPosition++;
            }
            // Is the piece wrapping around?
            else if(currentPosition === 51) {
                currentPosition = 0;
            }
            // Normal track movement
            else {
                currentPosition++;
            }
        }
        
        // Check if the final position is the exact home position or passed it
        if(currentPosition > HOME_POSITIONS[player]) {
            return -1; // Invalid move (overshot home)
        }

        return currentPosition;
    }

    movePiece(player, piece, roll) {
        UI.unhighlightPieces(); // Remove highlights on click

        // If piece is in base and roll is 6, move to start position
        if(BASE_POSITIONS[player].includes(this.currentPositions[player][piece]) && roll === 6) {
            this.setPiecePosition(player, piece, START_POSITIONS[player]);
            this.state = STATE.DICE_NOT_ROLLED; // Turn ends after moving a piece out of base
            return;
        }

        let newPosition = this.currentPositions[player][piece];

        const interval = setInterval(() => {
            newPosition = this.getIncrementedPosition(player, piece);
            this.setPiecePosition(player, piece, newPosition);
            roll--;

            if(roll === 0) {
                clearInterval(interval);
                
                // Check for kill
                const isKill = this.checkForKill(player, piece);

                // Check for win
                const isWin = this.hasPlayerWon(player);
                if(isWin) {
                    // FIX 2b: Set GAME_OVER state on win
                    this.state = STATE.GAME_OVER; 
                    alert(`${this.isTeamMode ? 'Team ' + TEAM_PLAYERS.getTeam(player) : player} wins! Game Over!`);
                    return; 
                }

                // If killed or rolled a 6, get another turn
                if(isKill || this.diceValue === 6) {
                    this.state = STATE.DICE_NOT_ROLLED;
                    return;
                }

                this.incrementTurn();
            }
        }, 200);
    }

    // FIX 1: Update checkForKill to exclude teammates in Team Mode
    checkForKill(player, piece) {
        const currentPosition = this.currentPositions[player][piece];
        let kill = false;
        
        const isTeamMode = this.isTeamMode;

        // Filter: Exclude self (p !== player) AND if in team mode, exclude players in the same team
        const opponents = PLAYERS.filter(p => {
            if (p === player) return false;

            if (isTeamMode) {
                return TEAM_PLAYERS.getTeam(p) !== TEAM_PLAYERS.getTeam(player);
            }
            
            return true; // In individual mode, everyone else is an opponent
        });

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

    setPiecePosition(player, piece, newPosition) {
        this.currentPositions[player][piece] = newPosition;
        UI.setPiecePosition(player, piece, newPosition);
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