import { BASE_POSITIONS, HOME_ENTRANCE, HOME_POSITIONS, PLAYERS, SAFE_POSITIONS, START_POSITIONS, STATE, TURNING_POINTS, ALL_PLAYERS, setPlayers, TEAM_PLAYERS } from './constants.js';
import { UI } from './ludo/UI.js';

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
        });
    }

    updatePlayerCount(count) {
        const playerCount = parseInt(count, 10);
        let activePlayers;
        
        // Check for the 4-Player Team Mode identifier '4T'
        this.isTeamMode = count === '4T';

        if (this.isTeamMode) {
            // Team Mode: P1(A) -> P4(B) -> P2(A) -> P3(B) (Clockwise order for fair turns)
            activePlayers = ALL_PLAYERS; 
        } else if (playerCount === 2) {
            // 2 players: P1 and P2 (opposite corners)
            activePlayers = ['P1', 'P2']; 
        } else if (playerCount === 3) {
            // 3 players: P1, P4, P2 
            activePlayers = ['P1', 'P4', 'P2']; 
        } else { 
            // 4 players (Individual)
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
        
        // Automatic Move Logic (If only one piece can move)
        if(eligiblePieces.length === 1) {
            const piece = eligiblePieces[0];
            console.log(`Auto-moving piece ${piece} for player ${player}`);
            this.handlePieceClick(player, piece);
        } else if(eligiblePieces.length > 1) {
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

            // Check if piece would overshoot the Home Position
            const newPosition = currentPosition + this.diceValue;
            const homeEntranceStart = HOME_ENTRANCE[player][0];
            const homePosition = HOME_POSITIONS[player];

            if (
                (currentPosition >= homeEntranceStart && currentPosition < homePosition) || 
                (newPosition > homeEntranceStart && newPosition < homePosition)
            ) {
                 if (newPosition > homePosition) {
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
        
        this.handlePieceClick(player, piece);
    }

    handlePieceClick(player, piece) {
        piece = parseInt(piece, 10);
        
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
                    const winMessage = this.isTeamMode 
                        ? `Team ${TEAM_PLAYERS.getTeam(player)} has won!` 
                        : `Player: ${player} has won!`;
                    alert(winMessage);
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

        const activePlayers = PLAYERS;
        
        // Determine opponents based on game mode
        const opponents = activePlayers.filter(p => {
            if (this.isTeamMode) {
                // In Team Mode, only kill players not on the same team
                return TEAM_PLAYERS.getTeam(p) !== TEAM_PLAYERS.getTeam(player);
            } else {
                // In Individual Mode, kill anyone who is not the current player
                return p !== player;
            }
        });

        opponents.forEach(opponent => {
            [0, 1, 2, 3].forEach(opponentPiece => {
                const opponentPosition = this.currentPositions[opponent][opponentPiece];

                // Kill only at non-safe positions
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
}