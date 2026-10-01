import { describeSettings, loadSettings, SETTINGS_FILE } from "../playbook/settings";

export function settingsReport(projectDir: string): string {
  const settings = loadSettings(projectDir);
  const source = settings.file ? `Settings (${SETTINGS_FILE})` : `Settings: plugin defaults (no ${SETTINGS_FILE})`;
  return `${source}: ${describeSettings(settings)}`;
}
