import { Workspace, ReplicatedStorage, ServerStorage } from "@rbxts/services";

const possibleCodeLocations = Workspace.WaitForChild("PossibleCodeLocations") as Folder;
const runtimeFolder = ServerStorage.WaitForChild("Runtime") as Folder;
const codeValue = runtimeFolder.WaitForChild("code") as NumberValue;

const CODE_LENGTH = 4;

function generateCode(length: number): string {
    let code = "";
    for (let i = 0; i < length; i++) {
        code += tostring(math.random(0, 9));
    }
    return code;
}

export class SpecialCode {
    private activeLocation?: Instance;
    private code = "";

    start() {
        const locations = possibleCodeLocations.GetChildren();

        if (locations.size() === 0) {
            warn("SpecialCode: no children found in PossibleCodeLocations");
            return;
        }

        const chosenIndex = math.random(0, locations.size() - 1);
        const chosenLocation = locations[chosenIndex];

        for (let i = 0; i < locations.size(); i++) {
            if (i !== chosenIndex) {
                locations[i].Destroy();
            }
        }

        this.activeLocation = chosenLocation;
        this.code = generateCode(CODE_LENGTH);

        chosenLocation.SetAttribute("code", this.code);
        
        const gui = chosenLocation.FindFirstChildWhichIsA("SurfaceGui");
        if (gui) {
            const textLabel = gui.FindFirstChildWhichIsA("TextLabel");
            if (textLabel) {
                textLabel.Text = this.code;
            }
        }

        codeValue.Value = tonumber(this.code) ?? 0;

        print(`SpecialCode: chosen location "${chosenLocation.Name}" with code ${this.code}`);
    }

    getCode(): string {
        return this.code;
    }

    getLocation(): Instance | undefined {
        return this.activeLocation;
    }
}