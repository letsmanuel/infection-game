import Remotes, { RemoteId } from "shared/remotes";
import { GameState } from "shared/configs/gameState";

let currentState = GameState.Lobby;

export function getGameState(): GameState {
	return currentState;
}

export function setGameState(state: GameState) {
	if (currentState === state) return;
	currentState = state;
	Remotes.Server.Get(RemoteId.gameStateChanged).SendToAllPlayers(state);
}

let powerOutageActive = false;

export function isPowerOutageActive(): boolean {
	return powerOutageActive;
}

export function setPowerOutageActive(active: boolean) {
	powerOutageActive = active;
}
