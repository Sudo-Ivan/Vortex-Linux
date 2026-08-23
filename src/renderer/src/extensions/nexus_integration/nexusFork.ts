import type { IState } from "../../types/IState";
import { getSafe } from "../../util/storeHelper";

import {
  NEXUS_API_URL,
  NEXUS_BASE_URL,
  NEXUS_DOMAIN,
  OAUTH_URL,
  USERINFO_ENDPOINT,
} from "./constants";

export interface INexusForkSettings {
  apiBaseUrl?: string;
  websiteUrl?: string;
  usersUrl?: string;
  oauthUrl?: string;
  disablePremiumGates?: boolean;
  autoResolveDependencies?: boolean;
}

export const DEFAULT_NEXUS_FORK_SETTINGS: INexusForkSettings = {
  disablePremiumGates: true,
  autoResolveDependencies: true,
};

export interface INexusResolvedEndpoints {
  apiBaseUrl: string;
  websiteUrl: string;
  usersUrl: string;
  oauthUrl: string;
  userInfoUrl: string;
}

let resolvedEndpoints: INexusResolvedEndpoints = resolveEndpointsFromSettings({});

function stripTrailingSlash(input: string): string {
  return input.replace(/\/+$/, "");
}

function defaultApiBaseUrl(): string {
  const apiUrl = stripTrailingSlash(NEXUS_API_URL);
  return apiUrl.endsWith("/v1") ? apiUrl.slice(0, -3) : apiUrl;
}

export function resolveEndpointsFromSettings(
  settings: INexusForkSettings | undefined,
): INexusResolvedEndpoints {
  const merged = { ...DEFAULT_NEXUS_FORK_SETTINGS, ...settings };
  const websiteUrl = stripTrailingSlash(merged.websiteUrl || NEXUS_BASE_URL);
  const usersUrl = stripTrailingSlash(
    merged.usersUrl || `https://users.${NEXUS_DOMAIN}`,
  );
  const apiBaseUrl = stripTrailingSlash(merged.apiBaseUrl || defaultApiBaseUrl());
  const oauthUrl = stripTrailingSlash(merged.oauthUrl || OAUTH_URL);
  const userInfoUrl = stripTrailingSlash(merged.oauthUrl ? `${oauthUrl}/userinfo` : USERINFO_ENDPOINT);

  return {
    apiBaseUrl,
    websiteUrl,
    usersUrl,
    oauthUrl,
    userInfoUrl,
  };
}

export function forkSettingsFromState(state: IState): INexusForkSettings {
  return getSafe(state, ["settings", "nexus", "fork"], DEFAULT_NEXUS_FORK_SETTINGS);
}

export function premiumGatesDisabled(state: IState): boolean {
  return forkSettingsFromState(state).disablePremiumGates !== false;
}

export function autoResolveDependenciesEnabled(state: IState): boolean {
  return forkSettingsFromState(state).autoResolveDependencies !== false;
}

export function syncNexusForkFromState(state: IState): INexusResolvedEndpoints {
  resolvedEndpoints = resolveEndpointsFromSettings(forkSettingsFromState(state));
  applyNexusApiEndpointOverrides(resolvedEndpoints);
  return resolvedEndpoints;
}

export function getNexusWebsiteUrl(): string {
  return resolvedEndpoints.websiteUrl;
}

export function getNexusUsersUrl(): string {
  return resolvedEndpoints.usersUrl;
}

export function getNexusOAuthUrl(): string {
  return resolvedEndpoints.oauthUrl;
}

export function getNexusApiBaseUrl(): string {
  return resolvedEndpoints.apiBaseUrl;
}

export function applyNexusApiEndpointOverrides(endpoints: INexusResolvedEndpoints): void {
  try {
    // nexus-api reads these module exports for REST and GraphQL calls
    const params = require("@nexusmods/nexus-api/lib/parameters");
    const baseUrl = stripTrailingSlash(endpoints.apiBaseUrl);
    params.BASE_URL = baseUrl;
    params.API_URL = `${baseUrl}/v1`;
    params.GRAPHQL_URL = `${baseUrl}/v2/graphql`;
    params.USER_SERVICE_API_URL = stripTrailingSlash(endpoints.usersUrl);
  } catch (err) {
    // tests and partial bundles may not ship nexus-api parameters
  }
}
