import React, { type ReactNode } from "react";

import { joinClasses } from "@/ui/utils/joinClasses";

import { useTabContext } from "./Tabs.context";

interface ITabBarProps {
  children: ReactNode;
  className?: string;
  /** A rule under the tabs, where nothing around them divides them off. Primary tabs only. */
  hasBorder?: boolean;
}

/**
 * Tab Bar component acts as a styling wrapper (and tablist role) for tabs
 */
export const TabBar = ({ children, className, hasBorder }: ITabBarProps) => {
  const { tabType } = useTabContext();

  return (
    <div
      className={joinClasses(
        [
          "nxm-tab-bar",
          tabType === "primary" ? "nxm-tab-bar-primary" : "nxm-tab-bar-secondary",
          className,
        ],
        { "nxm-tab-bar-border": !!hasBorder && tabType === "primary" },
      )}
    >
      <div className="nxm-tab-bar-scroller" role="tablist">
        {children}
      </div>
    </div>
  );
};
