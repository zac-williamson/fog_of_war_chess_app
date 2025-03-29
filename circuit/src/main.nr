use fog_of_war_chess::{empty_game_state, GameState, move, MoveData, UserState};

fn main(
    input_state: GameState,
    user_state: UserState,
    move_data: MoveData,
    player_id: Field,
) -> pub (GameState, Field, Field) {
    move(input_state, user_state, move_data, player_id)
}
use std::hash::poseidon2::Poseidon2::hash as poseidon2;

#[test]
fn test_main() {
    let mut game_state: GameState = empty_game_state();
    let mut alice_state: UserState = UserState::default();
    let mut bob_state: UserState = UserState::default();

    alice_state.encrypt_secret = poseidon2([1], 1);
    alice_state.mask_secret = poseidon2([2], 1);
    bob_state.encrypt_secret = poseidon2([3], 1);
    bob_state.mask_secret = poseidon2([4], 1);

    game_state =
        game_state.commit_to_user_secrets(alice_state.encrypt_secret, alice_state.mask_secret, 0);
    game_state =
        game_state.commit_to_user_secrets(bob_state.encrypt_secret, bob_state.mask_secret, 1);

    // alice moves pawn

    let alice_move: MoveData = MoveData { x1: 4, y1: 1, x2: 4, y2: 3 };
    let _ = move(game_state, alice_state, alice_move, 0);
}
