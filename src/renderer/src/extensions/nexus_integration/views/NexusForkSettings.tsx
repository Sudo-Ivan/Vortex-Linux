import React, { useCallback } from "react";
import { ControlLabel, FormControl, FormGroup, HelpBlock } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";

import Toggle from "../../../controls/Toggle";
import type { IState } from "../../../types/IState";
import { setNexusForkSettings } from "../actions/forkSettings";
import { NEXUS_API_URL, NEXUS_BASE_URL, NEXUS_DOMAIN, OAUTH_URL } from "../constants";
import { DEFAULT_NEXUS_FORK_SETTINGS, type INexusForkSettings } from "../nexusFork";

function defaultApiBaseUrl(): string {
  const apiUrl = NEXUS_API_URL.replace(/\/+$/, "");
  return apiUrl.endsWith("/v1") ? apiUrl.slice(0, -3) : apiUrl;
}

const NexusForkSettings: React.FC = () => {
  const dispatch = useDispatch();
  const fork = useSelector(
    (state: IState) => state.settings.nexus?.fork ?? DEFAULT_NEXUS_FORK_SETTINGS,
  );

  const update = useCallback(
    (patch: Partial<INexusForkSettings>) => {
      dispatch(setNexusForkSettings(patch));
    },
    [dispatch],
  );

  const resetEndpoints = useCallback(() => {
    dispatch(
      setNexusForkSettings({
        apiBaseUrl: undefined,
        websiteUrl: undefined,
        usersUrl: undefined,
        oauthUrl: undefined,
      }),
    );
  }, [dispatch]);

  return (
    <form>
      <FormGroup controlId="nexus-fork-endpoints">
        <ControlLabel>Mod source endpoints</ControlLabel>
        <HelpBlock>
          Point Vortex at your own Nexus-compatible API and website. Leave fields empty to use
          built-in defaults or environment variables.
        </HelpBlock>

        <FormGroup controlId="nexus-fork-api">
          <ControlLabel>API base URL</ControlLabel>
          <FormControl
            placeholder={defaultApiBaseUrl()}
            type="text"
            value={fork.apiBaseUrl ?? ""}
            onChange={(event: React.FormEvent<any>) =>
              update({ apiBaseUrl: event.currentTarget.value || undefined })
            }
          />
        </FormGroup>

        <FormGroup controlId="nexus-fork-website">
          <ControlLabel>Website URL</ControlLabel>
          <FormControl
            placeholder={NEXUS_BASE_URL}
            type="text"
            value={fork.websiteUrl ?? ""}
            onChange={(event: React.FormEvent<any>) =>
              update({ websiteUrl: event.currentTarget.value || undefined })
            }
          />
        </FormGroup>

        <FormGroup controlId="nexus-fork-users">
          <ControlLabel>Users / OAuth service URL</ControlLabel>
          <FormControl
            placeholder={`https://users.${NEXUS_DOMAIN}`}
            type="text"
            value={fork.usersUrl ?? ""}
            onChange={(event: React.FormEvent<any>) =>
              update({ usersUrl: event.currentTarget.value || undefined })
            }
          />
        </FormGroup>

        <FormGroup controlId="nexus-fork-oauth">
          <ControlLabel>OAuth URL</ControlLabel>
          <FormControl
            placeholder={OAUTH_URL}
            type="text"
            value={fork.oauthUrl ?? ""}
            onChange={(event: React.FormEvent<any>) =>
              update({ oauthUrl: event.currentTarget.value || undefined })
            }
          />
        </FormGroup>

        <button className="btn btn-ghost" type="button" onClick={resetEndpoints}>
          Reset to defaults
        </button>
      </FormGroup>

      <FormGroup controlId="nexus-fork-behavior">
        <ControlLabel>Fork behavior</ControlLabel>

        <Toggle
          checked={fork.disablePremiumGates !== false}
          onToggle={(checked) => update({ disablePremiumGates: checked })}
        >
          Allow in-app downloads without premium
        </Toggle>

        <Toggle
          checked={fork.autoResolveDependencies !== false}
          onToggle={(checked) => update({ autoResolveDependencies: checked })}
        >
          Automatically download and fix missing dependencies after health checks
        </Toggle>
      </FormGroup>
    </form>
  );
};

export default NexusForkSettings;
