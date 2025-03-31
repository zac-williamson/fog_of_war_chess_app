import React, { useState, useEffect } from "react";
import { initGameState } from "./prover";

import { move, consumeMove } from "./prover.js";

const initialWhiteBoard = [
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ["wP", "wP", "wP", "wP", "wP", "wP", "wP", "wP"],
  ["wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"],
];

const initialBlackBoard = [
  ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR"],
  ["bP", "bP", "bP", "bP", "bP", "bP", "bP", "bP"],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
];

// Reusable Chessboard component
function Chessboard({ renderSquare }) {
  const renderBoard = () => {
    const squares = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        squares.push(renderSquare(row, col));
      }
    }
    return squares;
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(8, 60px)",
        gridTemplateRows: "repeat(8, 60px)",
        border: "2px solid black",
      }}
    >
      {renderBoard()}
    </div>
  );
}

const isBlackPiece = (symbol) => {
  return (
    symbol == "bR" ||
    symbol == "bN" ||
    symbol == "bB" ||
    symbol == "bK" ||
    symbol == "bQ" ||
    symbol == "bP"
  );
};

const isWhitePiece = (symbol) => {
  return (
    symbol == "wR" ||
    symbol == "wN" ||
    symbol == "wB" ||
    symbol == "wK" ||
    symbol == "wQ" ||
    symbol == "wP"
  );
};
// Map piece codes to Unicode chess symbols.
const pieceSymbols = {
  bK: "♔",
  bQ: "♕",
  bR: "♖",
  bB: "♗",
  bN: "♘",
  bP: "♙",
  wK: "♚",
  wQ: "♛",
  wR: "♜",
  wB: "♝",
  wN: "♞",
  wP: "♟",
};

/**
 * Validate a move based on basic chess movement rules.
 *
 * @param {Array} board - The current board state.
 * @param {number} fromRow - Starting row index.
 * @param {number} fromCol - Starting column index.
 * @param {number} toRow - Destination row index.
 * @param {number} toCol - Destination column index.
 * @returns {boolean} - True if the move is valid.
 */
const isValidMove = (board, fromRow, fromCol, toRow, toCol) => {
  const piece = board[fromRow][fromCol];
  if (!piece) return false;

  // Prevent capturing your own piece.
  const targetPiece = board[toRow][toCol];
  if (targetPiece && targetPiece[0] === piece[0]) return false;

  const pieceType = piece[1];
  // White moves "up" (decreasing row) and black moves "down" (increasing row).
  const direction = piece[0] === "w" ? -1 : 1;
  const rowDiff = toRow - fromRow;
  const colDiff = toCol - fromCol;
  const absRowDiff = Math.abs(rowDiff);
  const absColDiff = Math.abs(colDiff);

  switch (pieceType) {
    case "P": {
      // Pawn moves:
      // 1. Advance forward: one square (or two squares from starting row) if not capturing.
      // 2. Capture diagonally.
      if (colDiff === 0) {
        // Destination must be empty.
        if (targetPiece !== null) return false;
        // Move one square forward.
        if (rowDiff === direction) return true;
        // Move two squares from starting row.
        if (
          ((piece[0] === "w" && fromRow === 6) ||
            (piece[0] === "b" && fromRow === 1)) &&
          rowDiff === 2 * direction &&
          board[fromRow + direction][fromCol] === null
        ) {
          return true;
        }
        return false;
      } else if (Math.abs(colDiff) === 1 && rowDiff === direction) {
        // Diagonal capture: must capture an opponent's piece.
        return targetPiece !== null && targetPiece[0] !== piece[0];
      }
      return false;
    }
    case "N": {
      // Knight moves in an "L" shape.
      if (
        (absRowDiff === 2 && absColDiff === 1) ||
        (absRowDiff === 1 && absColDiff === 2)
      )
        return true;
      return false;
    }
    case "B": {
      // Bishop moves diagonally.
      if (absRowDiff === absColDiff) {
        // Check that the path is clear.
        let stepRow = rowDiff > 0 ? 1 : -1;
        let stepCol = colDiff > 0 ? 1 : -1;
        let r = fromRow + stepRow,
          c = fromCol + stepCol;
        while (r !== toRow && c !== toCol) {
          if (board[r][c] !== null) return false;
          r += stepRow;
          c += stepCol;
        }
        return true;
      }
      return false;
    }
    case "R": {
      // Rook moves horizontally or vertically.
      if (fromRow === toRow || fromCol === toCol) {
        if (fromRow === toRow) {
          // Horizontal move.
          let step = colDiff > 0 ? 1 : -1;
          for (let c = fromCol + step; c !== toCol; c += step) {
            if (board[fromRow][c] !== null) return false;
          }
        } else {
          // Vertical move.
          let step = rowDiff > 0 ? 1 : -1;
          for (let r = fromRow + step; r !== toRow; r += step) {
            if (board[r][fromCol] !== null) return false;
          }
        }
        return true;
      }
      return false;
    }
    case "Q": {
      // Queen: combination of rook and bishop.
      if (absRowDiff === absColDiff) {
        // Diagonal move.
        let stepRow = rowDiff > 0 ? 1 : -1;
        let stepCol = colDiff > 0 ? 1 : -1;
        let r = fromRow + stepRow,
          c = fromCol + stepCol;
        while (r !== toRow && c !== toCol) {
          if (board[r][c] !== null) return false;
          r += stepRow;
          c += stepCol;
        }
        return true;
      } else if (fromRow === toRow || fromCol === toCol) {
        // Horizontal or vertical move.
        if (fromRow === toRow) {
          let step = colDiff > 0 ? 1 : -1;
          for (let c = fromCol + step; c !== toCol; c += step) {
            if (board[fromRow][c] !== null) return false;
          }
        } else {
          let step = rowDiff > 0 ? 1 : -1;
          for (let r = fromRow + step; r !== toRow; r += step) {
            if (board[r][fromCol] !== null) return false;
          }
        }
        return true;
      }
      return false;
    }
    case "K": {
      // King moves one square in any direction.
      if (absRowDiff <= 1 && absColDiff <= 1) return true;
      return false;
    }
    default:
      return false;
  }
};

function App() {
  const [gameState, setGameState] = useState(null);
  const [whiteBoard, setWhiteBoard] = useState(initialWhiteBoard);
  const [blackBoard, setBlackBoard] = useState(initialBlackBoard);
  const [whiteSelected, setWhiteSelected] = useState(null);
  const [blackSelected, setBlackSelected] = useState(null);

  // Message to display invalid move feedback.
  const [message, setMessage] = useState("");
  const [isProving, setIsProving] = useState(false);
  // Board state is an 8x8 array.
  useEffect(() => {
    async function initializeGameState() {
      const state = await initGameState();
      setGameState({
        player1State: {
          gameState: state.gameState,
          userState: state.whiteState,
          oldUserState: state.whiteState,
          userStateHashes: [],
        },
        player2State: {
          gameState: state.gameState,
          userState: state.blackState,
          oldUserState: state.blackState,
          userStateHashes: [],
        },
        gameStateHashes: [],
      });
    }
    initializeGameState();
  }, []);

  if (!gameState) {
    return <div>Loading game state...</div>;
  }

  const handleWhiteSquareClick = async (row, col) => {
    if (isProving) {
      return;
    }
    if (whiteSelected) {
      let selected = whiteSelected;
      let board = whiteBoard;
      try {
        if (
          isValidMove(whiteBoard, selected.row, selected.col, row, col) &&
          isWhitePiece(whiteBoard[selected.row][selected.col])
        ) {
          setIsProving(true);
          const newBoard = board.map((r) => r.slice());
          newBoard[row][col] = board[selected.row][selected.col];
          newBoard[selected.row][selected.col] = null;
          setWhiteBoard(newBoard);
          setMessage("");
          const playerId = 0;
          let r = await move(
            selected.row,
            selected.col,
            row,
            col,
            gameState.player1State,
            playerId
          );
          let newState = gameState;
          newState.player1State.gameState = r.publicInputs[0];
          // TODO: might need to update user_state from a separate fn as this should not be a public input
          newState.player1State.userState = r.userState;
          newState.player1State.oldUserState = r.userState;
          newState.player2State.gameState = r.publicInputs[0];
          if (newState.gameStateHashes.length > 0) {
            if (
              newState.gameStateHashes[newState.gameStateHashes.length - 1] !=
              r.publicInputs[1].input_game_state
            ) {
              console.log("error. game state hashes do not match");
            }
          }
          newState.gameStateHashes.push(r.publicInputs[1].output_game_state);

          if (newState.player1State.userStateHashes.length > 0) {
            if (
              newState.player1State.userStateHashes[
                newState.player1State.userStateHashes.length - 1
              ] != r.publicInputs[1].input_user_state
            ) {
              console.log("error. user state hashes do not match");
            }
          }
          newState.player1State.userStateHashes.push(
            r.publicInputs[1].output_user_state
          );
          //   pub input_game_state: Field,
          //   pub input_user_state: Field,
          //   pub output_game_state: Field,
          //   pub output_user_state: Field,

          const updatedBobState = await consumeMove(
            r.proof,
            r.publicInputs,
            newState.player2State.userState,
            "1"
          );
          newState.player2State.userState = updatedBobState;
          let pieces = updatedBobState.game_state;
          const pieceMap = [
            [null, "wP", null, "wN", "wB", "wR", "wQ", "wK"],
            [null, null, "bP", "bN", "bB", "bR", "bQ", "bK"],
          ];
          let newBlackBoard = blackBoard;
          for (let i = 0; i < pieces.length; ++i) {
            let colup = i % 8;
            let rowup = 7 - Math.floor(i / 8);
            newBlackBoard[rowup][colup] =
              pieceMap[parseInt(pieces[i].player_id.slice(2))][
                parseInt(pieces[i].id.slice(2))
              ];
          }
          setGameState(newState);
          setBlackBoard(newBlackBoard);
          setIsProving(false);
        } else {
          setMessage("Invalid move!");
        }
        setWhiteSelected(null);
      } catch (e) {
        console.log("hmm error? , ", e);
        setMessage("Invalid move!");
        setIsProving(false);
        setWhiteSelected(null);
      }
    } else if (whiteBoard[row][col]) {
      // Select a piece if one exists on the clicked square.
      setWhiteSelected({ row, col });
      setMessage("");
    }
  };

  const handleBlackSquareClick = async (row, col) => {
    if (isProving) {
      return;
    }
    if (blackSelected) {
      let selected = blackSelected;
      let board = blackBoard;
      try {
        if (
          isValidMove(blackBoard, selected.row, selected.col, row, col) &&
          isBlackPiece(blackBoard[selected.row][selected.col])
        ) {
          setIsProving(true);
          const newBoard = board.map((r) => r.slice());
          newBoard[row][col] = board[selected.row][selected.col];
          newBoard[selected.row][selected.col] = null;
          setBlackBoard(newBoard);
          setMessage("");
          const playerId = 1;
          let r = await move(
            selected.row,
            selected.col,
            row,
            col,
            gameState.player2State,
            playerId
          );
          let newState = gameState;
          newState.player2State.gameState = r.publicInputs[0];
          newState.player1State.gameState = r.publicInputs[0];
          newState.player2State.userState = r.userState;
          newState.player2State.oldUserState = r.userState;
          if (newState.gameStateHashes.length > 0) {
            if (
              newState.gameStateHashes[newState.gameStateHashes.length - 1] !=
              r.publicInputs[1].input_game_state
            ) {
              console.log("error. game state hashes do not match");
            }
          }
          newState.gameStateHashes.push(r.publicInputs[1].output_game_state);

          if (newState.player2State.userStateHashes.length > 0) {
            if (
              newState.player2State.userStateHashes[
                newState.player2State.userStateHashes.length - 1
              ] != r.publicInputs[1].input_user_state
            ) {
              console.log("error. user state hashes do not match");
            }
          }
          newState.player2State.userStateHashes.push(
            r.publicInputs[1].output_user_state
          );
          setGameState(newState);
          const updatedAliceState = await consumeMove(
            r.proof,
            r.publicInputs,
            gameState.player1State.userState,
            "0"
          );
          let newStateAlice = gameState;
          newState.player1State.userState = updatedAliceState;

          let pieces = updatedAliceState.game_state;
          const pieceMap = [
            [null, "wP", null, "wN", "wB", "wR", "wQ", "wK"],
            [null, null, "bP", "bN", "bB", "bR", "bQ", "bK"],
          ];
          let newWhiteBoard = whiteBoard;
          for (let i = 0; i < pieces.length; ++i) {
            let colup = i % 8;
            let rowup = 7 - Math.floor(i / 8);
            newWhiteBoard[rowup][colup] =
              pieceMap[parseInt(pieces[i].player_id.slice(2))][
                parseInt(pieces[i].id.slice(2))
              ];
          }
          setWhiteBoard(newWhiteBoard);
          setGameState(newStateAlice);
          setIsProving(false);
        } else {
          setMessage("Invalid move!");
        }
        setBlackSelected(null);
      } catch (e) {
        console.log("hmm? , ", e);
      }
    } else if (blackBoard[row][col]) {
      // Select a piece if one exists on the clicked square.
      setBlackSelected({ row, col });
      setMessage("");
    }
  };

  const renderWhiteSquare = (row, col) => {
    return renderSquare(
      row,
      col,
      whiteBoard,
      whiteSelected,
      handleWhiteSquareClick
    );
  };
  const renderBlackSquare = (row, col) => {
    return renderSquare(
      row,
      col,
      blackBoard,
      blackSelected,
      handleBlackSquareClick
    );
  };
  const renderSquare = (row, col, board, selectedSquare, handleSquareClick) => {
    const piece = board[row][col];
    const isDark = (row + col) % 2 === 1;
    // Check if this square is selected.
    const isSelected =
      selectedSquare &&
      selectedSquare.row === row &&
      selectedSquare.col === col;

    // Highlight the square if selected.
    const backgroundColor = isSelected
      ? "yellow"
      : isDark
      ? "#769656"
      : "#eeeed2";
    const textStyle = {
      textShadow: !isDark ? "1px 1px 2px rgba(0,0,0,0.8)" : "none",
    };

    return (
      <div
        key={`${row}-${col}`}
        onClick={() => {
          handleSquareClick(row, col);
        }}
        style={{
          width: "60px",
          height: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor,
          fontSize: "40px",
          cursor: "pointer",
        }}
      >
        {piece ? <span style={textStyle}>{pieceSymbols[piece]}</span> : ""}
      </div>
    );
  };

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <h1>ZK Fog of War Chess with Noir</h1>
      <p>
        Tech demo of the `fog_of_war` library. Both players can only see squares
        their pieces can move into.
      </p>
      <p>
        Players obtain this information from each other via zero-knowledge
        proofs, without revealing to each other which squares their pieces have
        vision over.
      </p>
      <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
        <div>
          <p>What white sees</p>
          <Chessboard renderSquare={renderWhiteSquare} />
        </div>
        <div>
          <p>What black sees</p>
          <Chessboard renderSquare={renderBlackSquare} />
        </div>
      </div>
      {message && <p style={{ color: "red" }}>{message}</p>}
      <p>
        Click a square to generate a zk proof. While proving is in progress,
        further moves are disabled.
      </p>

      {isProving && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            color: "white",
            fontSize: "2rem",
          }}
        >
          Proving...
        </div>
      )}
    </div>
  );
}

export default App;
