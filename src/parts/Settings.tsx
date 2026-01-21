import { CircleAlert } from "lucide-react";
import { useCallback } from "react";

import { Icon } from "@ui/icon";
import { Input } from "@ui/input";
import { InputNumber } from "@ui/input-number";
import { Label } from "@ui/label";
import { ScrollArea } from "@ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select";
import { Slider } from "@ui/slider";
import { Switch } from "@ui/switch";

import { useSettingsStore } from "../stores/Settings";
import { ModalTemplate } from "./ModalTemplate";

import type { ModalProps } from "./ModalTemplate";

function getNetworkIpAddress(method: "ds" | "team" | "localhost" | "dns", teamNumber: number | null) {
  switch (method) {
    case "ds":
      return "Reported by DS";
    case "team":
      return teamNumber ? `10.${Math.floor(teamNumber / 100)}.${teamNumber % 100}.2` : "10.TE.AM.2";
    case "dns":
      return teamNumber ? `roboRIO-${teamNumber}-FRC.local` : `roboRIO-####-FRC.local`;
    case "localhost":
      return "127.0.0.1";
  }
}

function parseTeamNumber(value: string) {
  const teamNumber = parseInt(value, 10);
  return Number.isNaN(teamNumber) ? null : teamNumber;
}

function parseSeason(value: string) {
  if (!value || value === "current") return null;
  const season = parseInt(value, 10);
  return Number.isNaN(season) ? null : season;
}

function validateNetworkDiscovery(
  method: "ds" | "team" | "localhost" | "dns" | "custom",
  teamNumber: number | null,
  ipAddress: string | null
) {
  switch (method) {
    case "team":
    case "dns":
      return !teamNumber ? "Network discovery of the robot code requires team number to be set" : undefined;
    case "custom":
      return !ipAddress ? "Network discovery of the robot code requires IP address to be set" : undefined;
    default:
      return undefined;
  }
}

// TODO: add IP address validation and error notification
// const ipv4schema = z.string().ip({ version: "v4", message: "Valid IPv4 address required" });

const SettingsPanel = ({ disabled }: ModalProps) => {
  const season = useSettingsStore.use.season();
  const teamNumber = useSettingsStore.use.teamNumber();
  const networkDiscoveryMethod = useSettingsStore.use.networkDiscoveryMethod();
  const networkIpAddress = useSettingsStore.use.networkIpAddress();

  const onNetworkDiscoveryMethodChange = useCallback((v: string) => {
    switch (v) {
      case "ds":
      case "team":
      case "localhost":
      case "dns":
      case "custom":
        useSettingsStore.set.networkDiscoveryMethod(v);
        break;
      default:
        useSettingsStore.set.networkDiscoveryMethod("ds");
        break;
    }
  }, []);

  const networkIpAddressDisabled = networkDiscoveryMethod !== "custom";
  const networkDiscoveryAlert = validateNetworkDiscovery(networkDiscoveryMethod, teamNumber, networkIpAddress);

  return (
    <>
      <div className="flex items-center gap-2 border-b border-b-border/40 bg-secondary/40 p-4">
        <Icon
          name="i:settings"
          size="sm"
          className="text-secondary-foreground/80"
        />
        <h1 className="text-lg font-semibold text-secondary-foreground/80 select-none">Settings</h1>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 pb-4">
          <div className="flex flex-col gap-1 border-b bg-secondary/20 px-4 py-4 select-none">
            <h2 className="text-lg font-medium">Connectivity</h2>
            <p className="flex gap-2 text-sm text-muted-foreground">
              {networkDiscoveryAlert ? (
                <>
                  <CircleAlert
                    className="flex-none fill-destructive text-foreground"
                    size="20"
                  />
                  {networkDiscoveryAlert}
                </>
              ) : (
                "Configure network discovery of the robot code"
              )}
            </p>
          </div>
          <div className="flex flex-col gap-2 px-4">
            <Label className="ml-1">Team number</Label>
            <Input
              value={teamNumber ?? ""}
              onChange={(ev) => useSettingsStore.set.teamNumber(parseTeamNumber(ev.currentTarget.value))}
              placeholder="Team number to use for network discovery"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 px-4">
            <div className="flex flex-col gap-2">
              <Label className="ml-1">Discovery method</Label>
              <Select
                value={networkDiscoveryMethod}
                onValueChange={onNetworkDiscoveryMethodChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select robot discovery method" />
                </SelectTrigger>
                <SelectContent>
                  {/* <SelectItem value="ds">Driver station</SelectItem> */}
                  <SelectItem value="team">Team IP (10.TE.AM.2)</SelectItem>
                  <SelectItem value="dns">RoboRIO mDNS</SelectItem>
                  <SelectItem value="localhost">Localhost</SelectItem>
                  <SelectItem value="custom">Custom IP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="ml-1">IP address</Label>
              <Input
                placeholder={networkIpAddressDisabled ? undefined : "IPv4 address of the robot"}
                value={
                  networkIpAddressDisabled
                    ? getNetworkIpAddress(networkDiscoveryMethod, teamNumber)
                    : (networkIpAddress ?? "")
                }
                onChange={
                  networkIpAddressDisabled
                    ? undefined
                    : (ev) => useSettingsStore.set.networkIpAddress(ev.currentTarget.value)
                }
                disabled={networkIpAddressDisabled}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 px-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={useSettingsStore.use.pingTimeoutOverride()}
                onCheckedChange={useSettingsStore.set.pingTimeoutOverride}
                disabled={disabled}
              />
              <Label>Override ping timeout (milliseconds)</Label>
            </div>
            <InputNumber
              aria-label="Ping timeout (milliseconds)"
              value={useSettingsStore.use.pingTimeoutMilliseconds()}
              onChange={useSettingsStore.set.pingTimeoutMilliseconds}
              minValue={1000}
              maxValue={10000}
              step={500}
              isDisabled={!useSettingsStore.use.pingTimeoutOverride()}
            />
          </div>
          <div className="flex flex-col gap-1 border-y bg-secondary/20 px-4 py-4 select-none">
            <h2 className="text-lg font-medium">User Interface</h2>
            <p className="text-sm text-muted-foreground">Configure common UI preferences</p>
          </div>
          <div className="mx-4 flex flex-col gap-2">
            <Label className="ml-1">Season</Label>
            <Select
              value={season ? season.toFixed() : "current"}
              onValueChange={(v) => useSettingsStore.set.season(parseSeason(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Current season" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current ({__SEASON__})</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mx-4 flex items-center gap-2">
            <Switch
              checked={useSettingsStore.use.panSnapToGrid()}
              onCheckedChange={useSettingsStore.set.panSnapToGrid}
              disabled={disabled}
            />
            <Label>Dashboard pan-and-zoom should snap to grid</Label>
          </div>
          <div className="flex flex-col gap-2 px-4">
            <Label>Dashboard grain (grid) size</Label>
            <div className="flex gap-4">
              <Slider
                aria-label="Animation FPS"
                value={[useSettingsStore.use.grain()]}
                onValueChange={(v) => useSettingsStore.set.grain(v[0] ?? 24)}
                min={12}
                max={48}
                step={1}
              />
              <InputNumber
                aria-label="Dashboard grain size"
                value={useSettingsStore.use.grain()}
                onChange={useSettingsStore.set.grain}
                minValue={12}
                maxValue={48}
                step={1}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 px-4">
            <Label>Animation refresh (frames-per-second)</Label>
            <div className="flex gap-4">
              <Slider
                aria-label="Animation FPS"
                value={[useSettingsStore.use.animationFps()]}
                onValueChange={(v) => useSettingsStore.set.animationFps(v[0] ?? 10)}
                min={1}
                max={10}
                step={1}
              />
              <InputNumber
                aria-label="Animation FPS"
                value={useSettingsStore.use.animationFps()}
                onChange={(v) => useSettingsStore.set.animationFps(v ?? 10)}
                minValue={1}
                maxValue={10}
                step={1}
              />
            </div>
          </div>
          <div className="mx-4 flex flex-col gap-2 rounded-lg border p-4">
            <Label className="text-sm text-muted-foreground">
              Control visibility of common sections in the topics browser
            </Label>
            <div className="flex flex-row items-center justify-between">
              <Label>LiveWindow topics visible</Label>
              <Switch
                checked={useSettingsStore.use.topicsVisibleLW()}
                onCheckedChange={useSettingsStore.set.topicsVisibleLW}
                disabled={disabled}
              />
            </div>
            <div className="flex flex-row items-center justify-between">
              <Label>ShuffleBoard topics visible</Label>
              <Switch
                checked={useSettingsStore.use.topicsVisibleSB()}
                onCheckedChange={useSettingsStore.set.topicsVisibleSB}
                disabled={disabled}
              />
            </div>
            <div className="flex flex-row items-center justify-between">
              <Label>Metadata (.xyz) topics visible</Label>
              <Switch
                checked={useSettingsStore.use.topicsVisibleMetadata()}
                onCheckedChange={useSettingsStore.set.topicsVisibleMetadata}
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </>
  );
};

export const SettingsModal = () => (
  <ModalTemplate
    id="settings"
    closeButtonVisible
    render={(props) => <SettingsPanel {...props} />}
  />
);
