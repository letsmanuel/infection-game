import { Players } from "@rbxts/services";
import Remotes, { RemoteId } from "shared/remotes";

const FALL_DAMAGE_THRESHOLD = 15;
const FALL_DAMAGE_AMOUNT = 30;
const WATER_FALL_DAMAGE_MULTIPLIER = 0.5;

const fallDamageEffect = Remotes.Server.Get(RemoteId.fallDamageEffect);

const fallStartY = new Map<Player, number>();
const stateChangedConns = new Map<Player, RBXScriptConnection>();

function setupCharacter(player: Player, character: Model) {
	const humanoid = character.FindFirstChildOfClass("Humanoid") as Humanoid | undefined;
	if (!humanoid) return;

	const existingConn = stateChangedConns.get(player);
	if (existingConn) existingConn.Disconnect();

	const conn = humanoid.StateChanged.Connect((_, newState) => {
		const root = character.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
		if (!root) return;

		if (newState === Enum.HumanoidStateType.Freefall) {
			fallStartY.set(player, root.Position.Y);
		} else if (
			fallStartY.has(player)
			&& (newState === Enum.HumanoidStateType.Landed
				|| newState === Enum.HumanoidStateType.Running
				|| newState === Enum.HumanoidStateType.Jumping)
		) {
			const startY = fallStartY.get(player)!;
			fallStartY.delete(player);
			const fallDistance = startY - root.Position.Y;

			if (fallDistance < FALL_DAMAGE_THRESHOLD) return;

			const landedInWater = humanoid.FloorMaterial === Enum.Material.Water;
			const damage = landedInWater ? FALL_DAMAGE_AMOUNT * WATER_FALL_DAMAGE_MULTIPLIER : FALL_DAMAGE_AMOUNT;

			humanoid.Health = math.max(0, humanoid.Health - damage);
			fallDamageEffect.SendToPlayer(player, fallDistance, landedInWater);
		}
	});

	stateChangedConns.set(player, conn);
}

Players.PlayerAdded.Connect((player) => {
	player.CharacterAdded.Connect((character) => {
		setupCharacter(player, character);
	});

	if (player.Character) {
		setupCharacter(player, player.Character);
	}
});

Players.PlayerRemoving.Connect((player) => {
	fallStartY.delete(player);
	const conn = stateChangedConns.get(player);
	if (conn) conn.Disconnect();
	stateChangedConns.delete(player);
});
