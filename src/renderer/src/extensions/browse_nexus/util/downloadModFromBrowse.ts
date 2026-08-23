import type { IExtensionApi } from "@/types/IExtensionContext";
import type { IModListItem } from "@/extensions/news_dashlet/types";

function extraValue(mod: IModListItem, id: string): string | number | undefined {
  const entry = mod.extra.find((item) => item.id === id);
  if (entry?.value === undefined || entry?.value === null) {
    return undefined;
  }
  return entry.value as string | number;
}

export async function downloadModFromBrowse(
  api: IExtensionApi,
  gameId: string,
  mod: IModListItem,
): Promise<void> {
  const modId = Number(extraValue(mod, "modId"));
  const domain = String(extraValue(mod, "domain") ?? "");
  if (!Number.isInteger(modId) || modId <= 0 || domain.length === 0) {
    throw new Error("This mod entry is missing download metadata.");
  }

  const files = await api.ext.nexusGetModFiles?.(gameId, modId);
  if (!files?.length) {
    throw new Error("No downloadable files were found for this mod.");
  }

  const mainFiles = files.filter((file) => file.category_id === 1);
  const candidates = (mainFiles.length > 0 ? mainFiles : files).sort(
    (lhs, rhs) => rhs.uploaded_timestamp - lhs.uploaded_timestamp,
  );
  const target = candidates[0];

  await api.ext.nexusDownload?.(gameId, modId, target.file_id, target.name, true);
}
