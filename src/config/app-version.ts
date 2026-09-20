import appConfig from "../../app.config.json";

const APP_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(\d{2}|[1-9]\d{2,})$/;

if (!APP_VERSION_PATTERN.test(appConfig.version)) {
  throw new Error(
    "app.config.json version must use major.minor.iteration with an iteration of at least two digits.",
  );
}

export const APP_VERSION = appConfig.version;
