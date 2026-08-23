import React from "react";

import { Button } from "@/ui/components/button/Button";
import { Typography } from "@/ui/components/typography/Typography";

interface IGogScanRootsSectionProps {
  roots: string[];
  onAddScanRoot: () => void;
  onRemoveScanRoot: (root: string) => void;
}

export function GogScanRootsSection({
  roots,
  onAddScanRoot,
  onRemoveScanRoot,
}: IGogScanRootsSectionProps): JSX.Element {
  return (
    <div className="flex flex-col gap-y-3" data-testid="linux-gog-scan-roots">
      <Typography as="h3" brand="neutral">
        GOG scan roots
      </Typography>
      <Typography as="p" brand="neutral-translucent">
        Add extra directories for Linux GOG and Heroic game discovery.
      </Typography>

      {roots.length === 0 ? (
        <Typography as="p" brand="neutral-translucent">
          No custom scan roots configured.
        </Typography>
      ) : (
        <ul className="flex flex-col gap-y-2">
          {roots.map((root) => (
            <li
              className="flex items-center justify-between gap-x-3 rounded-lg border border-stroke-weak p-3"
              data-testid={`linux-gog-scan-root-${root}`}
              key={root}
            >
              <Typography as="span" brand="neutral">
                {root}
              </Typography>
              <Button
                brand="neutral"
                data-testid={`linux-gog-scan-remove-${root}`}
                onClick={() => onRemoveScanRoot(root)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div>
        <Button brand="info" data-testid="linux-gog-scan-add" onClick={onAddScanRoot}>
          Add scan root
        </Button>
      </div>
    </div>
  );
}
