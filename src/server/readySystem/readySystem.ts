import { Players, Workspace } from "@rbxts/services";
import Remotes, { RemoteId } from "shared/remotes";
import { spawnAllPlayers } from "server/spawnSystem";
import { setGameState } from "server/gameState";
import { GameState } from "shared/configs/gameState";

const ReadyUpRemote = Remotes.Server.Get(RemoteId.readyUp);
const StartGameRemote = Remotes.Server.Get(RemoteId.startGame);


const readyPlayers = new Set<Player>();

export class ReadySystem {

    private started = false;
    private assignedRoles = new Map<Player, string>();

    start() {
        Players.PlayerAdded.Connect((player) => {
            player.LoadCharacter();
            this.assignRoleToPlayer(player);
        });

        Players.PlayerRemoving.Connect((player) => {
            this.assignedRoles.delete(player);
        });

        ReadyUpRemote.Connect((player, tool) => {
            if (this.started) {
                print(`Game already started. Ignoring ready up from ${player.Name}.`);
                return;
            }

            if (readyPlayers.has(player)) {
                readyPlayers.delete(player);
                print(`${player.Name} is no longer ready.`);
            } else {
                readyPlayers.add(player);
                print(`${player.Name} is now ready.`);
            }

            const allPlayersReady = Players.GetPlayers().every((p) => readyPlayers.has(p));
            if (allPlayersReady) {
                print("All players are ready. Starting the game...");
                StartGameRemote.SendToAllPlayers("");
                spawnAllPlayers();
                this.started = true;
                setGameState(GameState.Villa);
            }
        });
    }

    private assignRoleToPlayer(player: Player) {
        const runnerCount = this.countRunners();
        const attackerCount = this.countAttackers();
        const role = runnerCount <= attackerCount ? "Runner" : "Attacker";
        player.SetAttribute("role", role);
        this.assignedRoles.set(player, role);
        print(`${player.Name} assigned role: ${role} (runners: ${runnerCount + (role === "Runner" ? 1 : 0)}, attackers: ${attackerCount + (role === "Attacker" ? 1 : 0)})`);
    }

    private countRunners(): number {
        let count = 0;
        for (const [, role] of this.assignedRoles) {
            if (role === "Runner") count++;
        }
        return count;
    }

    private countAttackers(): number {
        let count = 0;
        for (const [, role] of this.assignedRoles) {
            if (role === "Attacker") count++;
        }
        return count;
    }
}