import { Players, Workspace } from "@rbxts/services";
import Remotes, { RemoteId } from "shared/remotes";
import { GameState } from "shared/configs/gameState";

let currentState = GameState.Lobby;

export class GameStateClient {
	start() {
		Remotes.Client.Get(RemoteId.gameStateChanged).Connect((state) => {
			currentState = state as GameState;
		});
	}
}
