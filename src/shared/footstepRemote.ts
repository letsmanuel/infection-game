import { ReplicatedStorage } from "@rbxts/services";

function getOrCreateRemoteEvent(name: string): RemoteEvent {
    const existing = ReplicatedStorage.FindFirstChild(name);
    if (existing && existing.IsA("RemoteEvent")) {
        return existing;
    }
    const remote = new Instance("RemoteEvent");
    remote.Name = name;
    remote.Parent = ReplicatedStorage;
    return remote;
}

export const UpdateWalkSpeedRemote = getOrCreateRemoteEvent("UpdateWalkspeed");