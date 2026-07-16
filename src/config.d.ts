declare type DesktopConfig = {
  firstLaunch: boolean;
  serverSelectionShown: boolean;
  serverSelectionVersion: number;
  serverUrl: string;
  customFrame: boolean;
  minimiseToTray: boolean;
  spellchecker: boolean;
  hardwareAcceleration: boolean;
  discordRpc: boolean;
  windowState: {
    x: number;
    y: number;
    width: number;
    height: number;
    isMaximised: boolean;
  };
};
