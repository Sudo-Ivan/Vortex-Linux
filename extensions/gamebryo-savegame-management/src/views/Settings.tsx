import { ComponentEx, selectors, Toggle } from "@nexusmods/vortex-api";
import * as React from "react";
import { ControlLabel, FormControl, FormGroup, HelpBlock } from "react-bootstrap";
import { withTranslation } from "react-i18next";
import { connect } from "react-redux";
import * as Redux from "redux";
import { ThunkDispatch } from "redux-thunk";

import { enableMonitor, setAutoSnapshot, setMaxSnapshots } from "../actions/settings";
import { gameSupported } from "../util/gameSupport";

export interface IBaseProps {
  onToggled: () => void;
}

interface IConnectedProps {
  gameMode: string;
  monitorEnabled: boolean;
  autoSnapshotOnProfileSwitch: boolean;
  maxSnapshots: number;
}

interface IActionProps {
  enableMonitor: (enabled: boolean) => void;
  setAutoSnapshot: (enabled: boolean) => void;
  setMaxSnapshots: (count: number) => void;
}

type IProps = IBaseProps & IConnectedProps & IActionProps;

class Settings extends ComponentEx<IProps, {}> {
  public render(): JSX.Element {
    const { t, gameMode, monitorEnabled, autoSnapshotOnProfileSwitch, maxSnapshots } = this.props;

    if (!gameSupported(gameMode)) {
      return null;
    }

    return (
      <form>
        <FormGroup controlId="redirection">
          <ControlLabel>{t("Savegame folder monitoring")}</ControlLabel>
          <Toggle checked={monitorEnabled} onToggle={this.toggleMonitor}>
            {t("Monitor Savegame directory for changes")}
          </Toggle>
          <HelpBlock>
            {t("If your games take very long to save when Vortex is running, try disabling this.")}
          </HelpBlock>
        </FormGroup>
        <FormGroup controlId="save-snapshots">
          <ControlLabel>{t("Save backups")}</ControlLabel>
          <Toggle checked={autoSnapshotOnProfileSwitch} onToggle={this.toggleAutoSnapshot}>
            {t("Back up saves automatically when switching profiles")}
          </Toggle>
          <HelpBlock>
            {t(
              "Snapshots are stored under your Vortex user data folder and can be restored from the Save games page.",
            )}
          </HelpBlock>
          <ControlLabel>{t("Maximum backups per profile")}</ControlLabel>
          <FormControl
            type="number"
            min={1}
            max={100}
            value={maxSnapshots}
            onChange={this.changeMaxSnapshots}
          />
        </FormGroup>
      </form>
    );
  }

  private toggleMonitor = () => {
    this.props.enableMonitor(!this.props.monitorEnabled);
    this.props.onToggled();
  };

  private toggleAutoSnapshot = () => {
    this.props.setAutoSnapshot(!this.props.autoSnapshotOnProfileSwitch);
    this.props.onToggled();
  };

  private changeMaxSnapshots = (event: React.FormEvent<FormControl>) => {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
    if (Number.isFinite(value) && value > 0) {
      this.props.setMaxSnapshots(value);
      this.props.onToggled();
    }
  };
}

function mapStateToProps(state: any): IConnectedProps {
  return {
    gameMode: selectors.activeGameId(state),
    monitorEnabled: state.settings.saves.monitorEnabled,
    autoSnapshotOnProfileSwitch: state.settings.saves.autoSnapshotOnProfileSwitch,
    maxSnapshots: state.settings.saves.maxSnapshots,
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<any, null, Redux.Action>): IActionProps {
  return {
    enableMonitor: (enabled: boolean) => dispatch(enableMonitor(enabled)),
    setAutoSnapshot: (enabled: boolean) => dispatch(setAutoSnapshot(enabled)),
    setMaxSnapshots: (count: number) => dispatch(setMaxSnapshots(count)),
  };
}

export default withTranslation(["default", "gamebryo-savegames"])(
  connect(mapStateToProps, mapDispatchToProps)(Settings) as any,
);
