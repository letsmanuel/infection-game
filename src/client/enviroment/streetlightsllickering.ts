import { Workspace } from "@rbxts/services";

export class StreetLightsFlickerer {

    start(){
        const streetLights = Workspace.WaitForChild("Map")
            .WaitForChild("Street")
            .WaitForChild("StreetLights").GetChildren();
        task.spawn(() => {
                    while (true){
            task.wait(math.random(0.5,2));

            const randomLight = streetLights[math.random(0, streetLights.size() - 1)];

            const mesh = randomLight.FindFirstChild("Light") as MeshPart | undefined;
            if (!mesh) continue;

            const lightSource = mesh.FindFirstChild("LightSource") as SurfaceLight | undefined;
            if (!lightSource) continue;

            const originalEnabled = lightSource.Enabled;
            lightSource.Enabled = false;
            task.wait(math.random(0.1, 0.2));
            lightSource.Enabled = originalEnabled;
        }

        })

    }

}