import { Bot, BotOff, Gamepad2, Siren, Wifi, WifiOff } from "lucide-react";
import { z } from "zod";

import { TruncateText } from "@ui/truncate-text";

import { cn } from "../lib/utils";
import { EditorContainer } from "./parts/EditorContainer";

import type { DataChannelRecord, DataType, StructuredTypeDescriptor } from "@2702rebels/wpidata/abstractions";
import type { WidgetComponentProps, WidgetDescriptor } from "./types";

function isSet(v: number | undefined, flag: number) {
  return v != null && (v & flag) != 0;
}

function formatMatchInfo(value: NonNullable<ReturnType<typeof transform>>) {
  if (value.matchNumber === 0) {
    return "No match information";
  }

  let s = `${value.matchType} ${value.matchNumber}`;
  if (value.replayNumber != null && value.replayNumber > 0) {
    s = `${s} (replay ${value.replayNumber})`;
  }

  return value.eventName ? `${value.eventName}: ${s}` : s;
}

const propsSchema = z.object({});

type PropsType = z.infer<typeof propsSchema>;

const transform = (
  dataType: DataType,
  records: ReadonlyArray<DataChannelRecord>,
  structuredType: StructuredTypeDescriptor | undefined
) => {
  if (records.length == 0) {
    return undefined;
  }

  const record = records.at(-1);
  if (
    record?.value != null &&
    typeof record.value === "object" &&
    structuredType &&
    structuredType.format === "composite" &&
    structuredType.name === "FMSInfo"
  ) {
    const v = record.value as unknown as Partial<{
      GameSpecificMessage: string;
      FMSControlData: number;
      IsRedAlliance: boolean;
      StationNumber: number;
      MatchType: number;
      EventName: string;
      MatchNumber: number;
      ReplayNumber: number;
    }>;

    const flags = {
      enabled: isSet(v.FMSControlData, 0x1),
      auto: isSet(v.FMSControlData, 0x2),
      test: isSet(v.FMSControlData, 0x4),
      estop: isSet(v.FMSControlData, 0x8),
      fmsAttached: isSet(v.FMSControlData, 0x10),
      dsAttached: isSet(v.FMSControlData, 0x20),
    } as const;

    return {
      flags,
      state: flags.enabled ? (flags.test ? "test" : flags.auto ? "auto" : "teleop") : "disabled",
      alliance: v.IsRedAlliance ? "red" : "blue",
      station: v.StationNumber,
      eventName: v.EventName,
      matchNumber: v.MatchNumber,
      replayNumber: v.ReplayNumber,
      matchType:
        v.MatchType === 1
          ? "Practice"
          : v.MatchType === 2
            ? "Qualification"
            : v.MatchType === 3
              ? "Playoff"
              : "Unknown",
    } as const;
  }

  return undefined;
};

const Component = ({ data }: WidgetComponentProps<PropsType>) => {
  const d = data as ReturnType<typeof transform>;
  return (
    <>
      {d != null && d.flags.estop && (
        <div className="absolute inset-x-0 top-0 h-1 bg-background bg-[repeating-linear-gradient(-45deg,var(--pattern-fg)_0,var(--pattern-fg)_3px,transparent_0,transparent_50%)] bg-size-[12px_12px] bg-fixed [--pattern-fg:var(--color-amber-500)]" />
      )}
      <div className="flex h-full w-full flex-col py-2 select-none">
        <div className="mb-1 flex items-center justify-between gap-2 px-3">
          <TruncateText
            variant="head"
            className="text-sm font-bold">
            FMS
          </TruncateText>
          {d != null && (
            <div className={cn("font-mono text-sm font-bold", d.alliance === "red" ? "text-red-500" : "text-blue-500")}>
              {d.alliance === "red" ? "R" : "B"}
              {d.station}
            </div>
          )}
        </div>
        {d != null && (
          <>
            <div className="mx-3 my-1 flex">
              <TruncateText variant="head">{formatMatchInfo(d)}</TruncateText>
            </div>
            <div
              className={cn(
                "mx-px my-1 flex items-center gap-2 px-3 py-1",
                d.flags.estop ? "bg-destructive font-semibold" : "bg-accent/20"
              )}>
              {d.flags.estop ? (
                <>
                  <Siren className="size-6" /> Emergency stopped
                </>
              ) : d.state === "disabled" ? (
                <>
                  <BotOff className="size-6 text-red-600" /> Robot disabled
                </>
              ) : (
                <>
                  <Bot className="size-6 text-green-600" />
                  {d.state === "test" ? "Test" : d.state === "auto" ? "Autonomous" : "Teleop"}
                </>
              )}
            </div>
            <div className="mx-3 flex flex-auto flex-col items-start justify-start gap-2 overflow-hidden">
              {d.flags.dsAttached ? (
                <div className="flex items-center gap-2">
                  <Gamepad2 className="size-6 text-green-600" /> DS connected
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Gamepad2 className="size-6 text-red-600" /> DS disconnected
                </div>
              )}
              {d.flags.fmsAttached ? (
                <div className="flex items-center gap-2">
                  <Wifi className="size-6 text-green-600" /> FMS connected
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <WifiOff className="size-6 text-red-600" /> FMS disconnected
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

const Editor = () => {
  return <EditorContainer />;
};

export const WidgetFMS: WidgetDescriptor<PropsType> = {
  type: "fms",
  name: "FMS",
  icon: "square-wifi",
  description: "FMS Information",
  width: 12,
  height: 7,
  constraints: {
    width: { min: 9 },
    height: { min: 7 },
  },
  slot: {
    transform: transform,
    accepts: {
      composite: ["FMSInfo"],
    },
    defaultChannel: "nt:/FMSInfo/*",
  },
  component: (props) => <Component {...props} />,
  props: {
    schema: propsSchema,
    defaultValue: {},
    editor: () => <Editor />,
  },
  spotlight: false,
};
