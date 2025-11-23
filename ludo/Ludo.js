import { BASE_POSITIONS, HOME_ENTRANCE, HOME_POSITIONS, PLAYERS, SAFE_POSITIONS, START_POSITIONS, STATE, TURNING_POINTS, ALL_PLAYERS, setPlayers, TEAM_PLAYERS } from './constants.js';
import { UI } from './UI.js';

export class Ludo {
    currentPositions = {}; 
    isTeamMode = false; 
    winner = null;

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
    
    listenDiceClick() {
        UI.listenDiceClick(this.handleDiceClick.bind(this));
    }

    listenResetClick() {
        UI.listenResetClick(this.resetGame.bind(this));
    }

    listenPieceClick() {
        UI.listenPieceClick(this.handlePieceClick.bind(this));
    }
    
    listenPlayerCountChange() {
        UI.listenPlayerCountChange(event => {
            this.updatePlayerCount(event.target.value);
            this.resetGame();
        });
    }

    updatePlayerCount(count) {
        if (count === '4T') {
            this.isTeamMode = true;
            setPlayers(['P1', 'P2', 'P3', 'P4']);
        } else {
            this.isTeamMode = false;
            const activePlayers = ALL_PLAYERS.slice(0, parseInt(count));
            setPlayers(activePlayers); 
        }
    }

    resetGame() {
        // Reset all piece positions to base
        ALL_PLAYERS.forEach(player => {
            this.currentPositions[player] = BASE_POSITIONS[player].slice();
            [0, 1, 2, 3].forEach(piece => {
                this.setPiecePosition(player, piece, BASE_POSITIONS[player][piece]); 
            })
        })
        
        // Use the dynamically set PLAYERS array from constants module
        const initialCount = document.querySelector('#player-count')?.value || '4';
        this.updatePlayerCount(initialCount); // Re-run to ensure PLAYERS array is correctly set
        
        this.turn = 0;
        this.state = STATE.DICE_NOT_ROLLED;
        this.winner = null;
        UI.setGameVisibility(PLAYERS);
    }

    // *** CRITICAL FIX: Updates internal state AND the UI ***
    setPiecePosition(player, piece, newPosition) {
        this.currentPositions[player][piece] = newPosition;
        UI.setPiecePosition(player, piece, newPosition); 
    }
    
    rollDice() {
        return Math.floor(Math.random() * 6) + 1;
    }

    handleDiceClick() {
        if(this.state !== STATE.DICE_NOT_ROLLED) {
            console.error('Cannot roll dice now.');
            return;
        }

        this.diceValue = this.rollDice();
        this.state = STATE.DICE_ROLLED; 

        // Add a slight delay to allow the dice animation to start
        setTimeout(() => {
            this.handleDiceRoll();
        }, 500);
    }

    handleDiceRoll() {
        const player = PLAYERS[this.turn];
        const movablePieces = this.getMovablePieces(player, this.diceValue);

        if (movablePieces.length > 0) {
            this.state = STATE.PIECE_NOT_SELECTED;
            UI.highlightPieces(player, movablePieces);
        } else {
            // Cannot move, switch turn
            this.incrementTurn();
        }
    }

    getMovablePieces(player, diceValue) {
        const movablePieces = [];
        for (let i = 0; i < 4; i++) {
            const currentPosition = this.currentPositions[player][i];
            
            // Piece in Base: Can only move out with a 6
            if (BASE_POSITIONS[player].includes(currentPosition) && diceValue === 6) {
                movablePieces.push(i);
            }
            // Piece on track or in Home Entrance: Check if move is valid
            else if (!BASE_POSITIONS[player].includes(currentPosition) && currentPosition !== HOME_POSITIONS[player]) {
                if (this.canMove(player, i, diceValue)) {
                    movablePieces.push(i);
                }
            }
        }
        return movablePieces;
    }

    canMove(player, piece, diceValue) {
        const currentPosition = this.currentPositions[player][piece];
        let targetPosition = currentPosition;

        for (let i = 0; i < diceValue; i++) {
            targetPosition = this.getIncrementedPosition(player, piece, targetPosition);
        }

        // Check if the target position is the HOME position
        if (targetPosition === HOME_POSITIONS[player]) {
            return true;
        }

        // Check if the piece overshoots the HOME position
        if (targetPosition > HOME_POSITIONS[player]) {
            return false;
        }

        return true;
    }

    handlePieceClick(event) {
        if (this.state !== STATE.PIECE_NOT_SELECTED) return;

        const pieceElement = event.target.closest('.player-piece');
        if (!pieceElement) return;

        const player = pieceElement.getAttribute('player-id');
        const piece = parseInt(pieceElement.getAttribute('piece'));
        const activePlayer = PLAYERS[this.turn];

        if (player !== activePlayer) return;

        const movablePieces = this.getMovablePieces(player, this.diceValue);
        if (!movablePieces.includes(piece)) return;
        
        UI.unhighlightPieces();

        // Start piece movement
        this.movePiece(player, piece);
    }

    movePiece(player, piece) {
        this.state = STATE.PIECE_SELECTED;
        let moves = this.diceValue;

        const moveInterval = setInterval(() => {
            if (moves <= 0) {
                clearInterval(moveInterval);
                this.onMoveFinish(player, piece);
                return;
            }

            this.incrementPiecePosition(player, piece);
            moves--;
        }, 200);
    }

    onMoveFinish(player, piece) {
        const currentPosition = this.currentPositions[player][piece];

        // Check for win condition
        if (currentPosition === HOME_POSITIONS[player] && this.hasPlayerWon(player)) {
            this.winner = player;
            this.state = STATE.GAME_ENDED;
            alert(`${player} wins!`);
            return;
        }

        // Check for kill
        const isKill = this.checkForKill(player, piece);

        // If the player rolled a 6 or got a kill, they get another turn.
        if(isKill || this.diceValue === 6) {
            this.state = STATE.DICE_NOT_ROLLED;
            return;
        }

        this.incrementTurn();
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

    incrementTurn() {
        let nextTurn = (this.turn + 1) % PLAYERS.length;
        this.turn = nextTurn;
        this.state = STATE.DICE_NOT_ROLLED;
    }
}