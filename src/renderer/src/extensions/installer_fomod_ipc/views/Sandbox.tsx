import React, { useContext, useEffect, useState } from "react";
import { ControlLabel, FormGroup } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";

import Toggle from "../../../controls/Toggle";
import type { IState } from "../../../types/IState";
import { MainContext } from "../../../views/MainWindow";
import { setInstallerSandbox } from "../actions/sandbox";

export interface IWorkaroundsProps {
  osSupportsInstallerSandbox: boolean;
}

function Sandbox(props: IWorkaroundsProps): React.ReactElement<any, any> {
  const { osSupportsInstallerSandbox: initialSupport } = props;
  const { t } = useTranslation();

  const sandboxEnabled = useSelector(
    (state: IState) => state.settings.mods.installerSandbox ?? true,
  );
  const dispatch = useDispatch();
  const context = useContext(MainContext);
  const [osSupportsInstallerSandbox, setOsSupportsInstallerSandbox] = useState(initialSupport);

  useEffect(() => {
    if (process.platform !== "linux") {
      return;
    }

    let cancelled = false;
    void window.api.linux
      .supportsInstallerSandbox()
      .then((supported) => {
        if (!cancelled) {
          setOsSupportsInstallerSandbox(supported);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOsSupportsInstallerSandbox(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleSandbox = React.useCallback(() => {
    if (osSupportsInstallerSandbox) {
      context.api.events.emit(
        "analytics-track-click-event",
        "Workarounds",
        sandboxEnabled ? "Disable Sandbox" : "Enable Sandbox",
      );
      dispatch(setInstallerSandbox(!sandboxEnabled));
    }
  }, [context.api.events, dispatch, osSupportsInstallerSandbox, sandboxEnabled]);

  return (
    <form>
      <FormGroup id="dotnet-appcontainer" controlId="appcontainer">
        <ControlLabel>{t("Installer Sandbox")}</ControlLabel>
        <Toggle
          checked={sandboxEnabled && osSupportsInstallerSandbox}
          onToggle={toggleSandbox}
          disabled={!osSupportsInstallerSandbox}
        >
          {t("Enable Sandbox")}
        </Toggle>
      </FormGroup>
    </form>
  );
}

export default Sandbox;
