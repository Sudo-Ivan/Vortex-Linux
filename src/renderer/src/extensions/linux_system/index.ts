import LazyComponent from "../../controls/LazyComponent";
import type { IExtensionContext } from "../../types/IExtensionContext";

function init(context: IExtensionContext): boolean {
  if (process.platform !== "linux") {
    return true;
  }

  context.registerSettings(
    "Vortex",
    LazyComponent(() => require("./SettingsLinux")),
    undefined,
    () => process.platform === "linux",
    85,
  );

  return true;
}

export default init;
