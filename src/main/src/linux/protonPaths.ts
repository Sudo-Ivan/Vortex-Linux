import * as path from "path";

import { Base, OS } from "@nexusmods/adaptor-api";
import type { QualifiedPath } from "@nexusmods/adaptor-api/fs";

export interface IProtonSnapshotContext {
  usesProton: boolean;
  winePrefixPath: string;
}

export function linuxPathToWineZPath(linuxPath: string): string {
  const normalized = path.posix.resolve(linuxPath.replace(/\\/g, "/"));
  if (normalized === "/") {
    return "Z:\\";
  }

  const withoutLeading = normalized.startsWith("/") ? normalized.slice(1) : normalized;
  return `Z:\\${withoutLeading.replace(/\//g, "\\")}`;
}

export function resolveProtonWindowsBases(
  nativeToQualifiedPath: (nativePath: string, os: OS) => QualifiedPath,
): Map<Base, QualifiedPath> {
  const toWin = (winPath: string): QualifiedPath => nativeToQualifiedPath(winPath, OS.Windows);
  const out = new Map<Base, QualifiedPath>();
  out.set(Base.Home, toWin("C:\\users\\steamuser"));
  out.set(Base.Temp, toWin("C:\\users\\steamuser\\AppData\\Local\\Temp"));
  out.set(Base.AppData, toWin("C:\\users\\steamuser\\AppData\\Roaming"));
  out.set(Base.Documents, toWin("C:\\users\\steamuser\\Documents"));
  out.set(Base.MyGames, toWin("C:\\users\\steamuser\\Documents\\My Games"));
  return out;
}

export function getWineDocumentsPath(winePrefixPath: string): string {
  return path.join(winePrefixPath, "drive_c", "users", "steamuser", "Documents");
}

export function isValidProtonContext(
  context: IProtonSnapshotContext | undefined,
): context is IProtonSnapshotContext {
  return (
    context?.usesProton === true &&
    typeof context.winePrefixPath === "string" &&
    context.winePrefixPath.length > 0
  );
}
