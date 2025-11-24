// NOTE: Assuming UI.js, constants.js, and Ludo.js are siblings in the same folder (e.g., 'ludo/')

export const COORDINATES_MAP = {
    0: [6, 13], 1: [6, 12], 2: [6, 11], 3: [6, 10], 4: [6, 9], 5: [5, 8], 6: [4, 8], 7: [3, 8], 8: [2, 8], 9: [1, 8], 10: [0, 8],
    11: [0, 7], // P3 (Yellow/Top-Left) Turning Point
    12: [0, 6], 13: [1, 6], // P3 (Yellow) Start Position
    14: [2, 6], 15: [3, 6], 16: [4, 6], 17: [5, 6], 18: [6, 5], 19: [6, 4], 20: [6, 3], 21: [6, 2], 22: [6, 1], 23: [6, 0],
    24: [7, 0], // P2 (Green/Top-Right) Turning Point
    25: [8, 0], 26: [8, 1], // P2 (Green) Start Position
    27: [8, 2], 28: [8, 3], 29: [8, 4], 30: [8, 5], 31: [9, 6], 32: [10, 6], 33: [11, 6], 34: [12, 6], 35: [13, 6], 36: [14, 6],
    37: [14, 7], // P4 (Blue/Bottom-Right) Turning Point
    38: [14, 8], 39: [13, 8], // P4 (Blue) Start Position
    40: [12, 8], 41: [11, 8], 42: [10, 8], 43: [9, 8], 44: [8, 9], 45: [8, 10], 46: [8, 11], 47: [8, 12], 48: [8, 13], 49: [8, 14],
    50: [7, 14], // P1 (Red/Bottom-Left) Turning Point
    51: [6, 14], // The last position before P1's start is 51, leading to 0.

    // HOME ENTRANCE (6 steps)
    // P1 (Red)
    100: [7, 13], 101: [7, 12], 102: [7, 11], 103: [7, 10], 104: [7, 9], 105: [7, 8], 
    // P2 (Green)
    200: [1, 7], 201: [2, 7], 202: [3, 7], 203: [4, 7], 204: [5, 7], 205: [6, 7],
    // P3 (Yellow)
    300: [7, 1], 301: [7, 2], 302: [7, 3], 303: [7, 4], 304: [7, 5], 305: [7, 6],
    // P4 (Blue)
    400: [13, 7], 401: [12, 7], 402: [11, 7], 403: [10, 7], 404: [9, 7], 405: [8, 7],
    
    // BASE POSITIONS
    // P1 (Bottom Left)
    500: [1.5, 10.58], 501: [3.57, 10.58], 502: [1.5, 12.43], 503: [3.57, 12.43], 
    // P2 (Top Right)
    600: [10.5, 1.58], 601: [12.54, 1.58], 602: [10.5, 3.45], 603: [12.54, 3.45],
    // P3 (Top Left)
    700: [1.5, 1.58], 701: [3.57, 1.58], 702: [1.5, 3.45], 703: [3.57, 3.45],
    // P4 (Bottom Right)
    800: [10.5, 10.58], 801: [12.54, 10.58], 802: [10.5, 12.43], 803: [12.54, 12.43],
};

export const STEP_LENGTH = 6.66; // Percentage size of a single step cell

export const ALL_PLAYERS = ['P1', 'P2', 'P3', 'P4']; 
// PLAYERS is declared with `let` so it can be updated by the Ludo class
export let PLAYERS = ['P1', 'P2', 'P3', 'P4']; 

export const setPlayers = (count) => {
    PLAYERS = ALL_PLAYERS.slice(0, count);
}

// State constants for game flow
export const STATE = {
    DICE_NOT_ROLLED: 0,
    DICE_ROLLED: 1,
}

// Team Structure
export const TEAM_PLAYERS = {
    // Note: Assuming P1-Red and P4-Blue are one team, P2-Green and P3-Yellow are another.
    A: ['P1', 'P4'], // Team A: Bottom-Left and Bottom-Right (Red and Blue)
    B: ['P2', 'P3'], // Team B: Top-Right and Top-Left (Green and Yellow)
    
    getTeam: (player) => {
        if (TEAM_PLAYERS.A.includes(player)) return 'A';
        if (TEAM_PLAYERS.B.includes(player)) return 'B';
        return null;
    },
    getTeammate: (player) => {
        const team = TEAM_PLAYERS.getTeam(player);
        if (!team) return null;
        return TEAM_PLAYERS[team].find(p => p !== player); 
    }
};

export const BASE_POSITIONS = {
    P1: [500, 501, 502, 503], P2: [600, 601, 602, 603],
    P3: [700, 701, 702, 703], P4: [800, 801, 802, 803], 
}

export const START_POSITIONS = {
    P1: 0, P2: 26, P3: 13, P4: 39, 
}

export const TURNING_POINTS = {
    P1: 50, P2: 24, P3: 11, P4: 37, 
}

export const HOME_ENTRANCE = {
    P1: [100, 101, 102, 103, 104, 105], 
    P2: [200, 201, 202, 203, 204, 205],
    P3: [300, 301, 302, 303, 304, 305],
    P4: [400, 401, 402, 403, 404, 405],
}

export const HOME_POSITIONS = {
    P1: 106, P2: 206, P3: 306, P4: 406, 
}

export const SAFE_POSITIONS = [0, 8, 13, 21, 26, 34, 39, 47];