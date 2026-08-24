import Constants from "expo-constants";

const expoConfig = Constants.expoConfig;

const extra =
  expoConfig && typeof expoConfig === "object" && "extra" in expoConfig
    ? expoConfig.extra
    : null;

export const API_BASE_URL =
  extra && typeof extra === "object" && "apiBaseUrl" in extra && typeof extra.apiBaseUrl === "string"
    ? extra.apiBaseUrl
    : "http://10.0.2.2:3000";
