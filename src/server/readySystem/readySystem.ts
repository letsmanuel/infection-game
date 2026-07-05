import { Players } from "@rbxts/services";
import Remotes from "shared/remotes";

const ReadyUpRemote = Remotes.Server.Get("readyUp");
const StartGameRemote = Remotes.Server.Get("startGame");


const readyPlayers = new Set<Player>();

export class ReadySystem {

    private started = false;

    start() {
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
                this.assignRoles();
                StartGameRemote.SendToAllPlayers("");
                this.started = true;
            }
        });
    }

    private assignRoles() {
        const players = Players.GetPlayers();

        const shuffled = [...players];
        for (let i = shuffled.size() - 1; i > 0; i--) {
            const j = math.random(0, i);
            const temp = shuffled[i];
            shuffled[i] = shuffled[j];
            shuffled[j] = temp;
        }

        const runnerCount = math.max(1, math.floor(shuffled.size() / 4));

        shuffled.forEach((player, index) => {
            const role = index < runnerCount ? "Runner" : "Attacker";
            player.SetAttribute("Role", role);
            print(`${player.Name} assigned role: ${role}`);
        });
    }
}