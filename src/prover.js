import { UltraHonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";

import initNoirC from "@noir-lang/noirc_abi";
import initACVM from "@noir-lang/acvm_js";
import acvm from "@noir-lang/acvm_js/web/acvm_js_bg.wasm?url";
import noirc from "@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url";
await Promise.all([initACVM(fetch(acvm)), initNoirC(fetch(noirc))]);

const chessCircuit = await import("../circuit/target/circuit.json");
const backend = new UltraHonkBackend(chessCircuit.bytecode, {
  threads: navigator.hardwareConcurrency,
});
// @ts-ignore
const noir = new Noir(chessCircuit);

// codegen/index.ts file taken from fog_of_war_chess library
import {
  empty_game_state,
  empty_white_state,
  empty_black_state,
  commit_to_user_secrets,
  consume_opponent_move_and_update_game_state,
  update_user_state_from_move,
} from "../codegen/index.ts";

export async function move(row1, col1, row2, col2, gameState, playerId) {
  const start = performance.now();
  // .js chessboard coordinates are different to the noir ones
  // In noir, x = column, y = 7 - row.
  let x1 = col1;
  let y1 = 7 - row1;
  let x2 = col2;
  let y2 = 7 - row2;
  const circuitInputs = {
    input_state: gameState.gameState,
    user_state: gameState.oldUserState,
    move_data: {
      x1: x1.toString(),
      y1: toString(),
      x2: x2.toString(),
      y2: toString(),
    },
    player_id: playerId,
  };

  const initializationTime = performance.now() - start;

  const { witness, returnValue } = await noir.execute(circuitInputs);

  const witnessTime = performance.now() - initializationTime;
  let { proof } = await backend.generateProof(witness, {
    keccak: true,
  });
  proof = proof.slice(4);
  const provingTime = performance.now() - witnessTime;
  console.log(`Proving time: ${provingTime}ms`);
  console.log("success");

  const totalTime = performance.now() - start;
  console.log(`Total time: ${totalTime}ms`);
  let new_user_state = await update_user_state_from_move(
    gameState.move_count > 1,
    gameState.userState,
    {
      x1: x1.toString(),
      y1: (7 - y1).toString(),
      x2: x2.toString(),
      y2: (7 - y2).toString(),
    },
    playerId
  );
  // NOTE: the returnValue can be extracted from `proof` but I am unsure how to do so (public inputs is a large array, how to convert to Noir types easily?)
  return { proof, userState: new_user_state, publicInputs: returnValue };
}

export async function consumeMove(proof, publicInputs, userState, playerId) {
  // TODO verify proof
  // TODO in the public inputs we have a hash of the game state and user state used in the proof
  //      We should check that these matches across repeated moves (i.e. output game state hash of move `i` = input game state hash of move `i+1`)
  return await consume_opponent_move_and_update_game_state(
    publicInputs[0],
    userState,
    playerId
  );
}

export async function initGameState() {
  try {
    let gameState = await empty_game_state();
    let whiteState = await empty_white_state();
    let blackState = await empty_black_state();

    // NOTE: in a real game these secrets should be random and not shared.
    whiteState.encrypt_secret = "1";
    whiteState.mask_secret = "2";
    blackState.encrypt_secret = "3";
    blackState.mask_secret = "4";
    let whiteEncryptSecret = "1";
    let whiteMaskSecret = "2";
    let blackEncryptSecret = "3";
    let blackMaskSecret = "4";
    gameState = await commit_to_user_secrets(
      gameState,
      whiteEncryptSecret,
      whiteMaskSecret,
      "0" // 0 = white
    );
    gameState = await commit_to_user_secrets(
      gameState,
      blackEncryptSecret,
      blackMaskSecret,
      "1" // 1 = black
    );

    return { gameState, whiteState, blackState };
  } catch (e) {
    console.log("error? ", e);
  }
}
