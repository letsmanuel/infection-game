import { Workspace, ReplicatedStorage } from "@rbxts/services";
import Remotes from "shared/remotes";

export class HighlightRemover {


    start() {
        for (const child of Workspace.GetDescendants()) {
            if (child.GetAttribute("removehighlights") === true) {
                for (const child2 of child.GetDescendants()) {
                    if (child2.IsA("Highlight")) {
                        child2.Destroy();
                    }
                };
            }
        };

        game.Workspace.DescendantAdded.Connect((descendant) => {
            if (descendant.GetAttribute("removehighlights") === true) {
                for (const child2 of descendant.GetDescendants()) {
                    if (child2.IsA("Highlight")) {
                        child2.Destroy();
                    }
                };
            }
        });
    }
}