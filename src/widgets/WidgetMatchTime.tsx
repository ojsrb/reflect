import { z } from "zod";

import { Input } from "@ui/input";
import { InputNumber } from "@ui/input-number";
import { TruncateText } from "@ui/truncate-text";

import { cn } from "../lib/utils";
import { EditorBlock } from "./parts/EditorBlock";
import { EditorContainer } from "./parts/EditorContainer";
import { EditorSectionHeader } from "./parts/EditorSectionHeader";
import { EditorSwitchBlock } from "./parts/EditorSwitchBlock";
import { withPreview } from "./utils";

import type { DataChannelRecord, DataType, StructuredTypeDescriptor } from "@2702rebels/wpidata/abstractions";
import type { WidgetComponentProps, WidgetDescriptor, WidgetEditorProps } from "./types";

const previewData = {
  period: "Timer",
  remainingTime: 0,
  gameSeason: undefined,
  gameData: undefined,
};

const propsSchema = z.object({
  title: z.string().optional(),
  gameDataVisible: z.boolean().default(true),
  attention: z.number().optional().default(5),
  cautionAt: z.number().optional().default(30),
  dangerAt: z.number().optional().default(10),
});

type PropsType = z.infer<typeof propsSchema>;

const transform = (
  dataType: DataType,
  records: ReadonlyArray<DataChannelRecord>,
  structuredType: StructuredTypeDescriptor | undefined
) => {
  if (records.length === 0) {
    return undefined;
  }

  const value = records.at(-1)?.value;

  if (typeof value === "number") {
    return {
      period: "Timer",
      remainingTime: value,
      gameSeason: undefined,
      gameData: undefined,
    };
  }

  if (structuredType != null && structuredType.format === "struct" && structuredType.name === "MatchTime") {
    const v = value as {
      period: number;
      remainingTime: number;
      gameSeason: number;
      gameData: number;
    };

    return {
      period: v.period === 1 ? "Autonomous" : v.period === 2 ? "Teleop" : "Inactive",
      remainingTime: v.remainingTime,
      gameSeason: v.gameSeason,
      gameData: v.gameData,
    } as const;
  }
};

function approaching(v: number, min: number, delta: number) {
  return v >= min && v <= min + delta;
}

function progress(v: number, min: number, max: number) {
  return (v - min) / (max - min);
}

/** Determines whether timer is about to transition to next period/phase/timeframe and indicate this with pulse animation. */
function indicateAttention(d: NonNullable<ReturnType<typeof transform>>, threshold = 3) {
  switch (d.period) {
    case "Timer":
    case "Autonomous":
      return d.remainingTime <= threshold;

    case "Teleop":
      if (d.remainingTime <= threshold) return true;
      if (d.gameSeason === 2026) {
        // game-specific transitions
        return (
          approaching(d.remainingTime, 130, threshold) ||
          approaching(d.remainingTime, 105, threshold) ||
          approaching(d.remainingTime, 80, threshold) ||
          approaching(d.remainingTime, 55, threshold) ||
          approaching(d.remainingTime, 30, threshold)
        );
      }
      return false;
  }

  return false;
}

const GameData2026 = ({
  time,
  data,
  period,
}: {
  data: number;
  time: number;
  period: "Timer" | "Autonomous" | "Teleop" | "Inactive";
}) => {
  if (period !== "Teleop") {
    return null;
  }

  let inactive = false;
  let timeframe = time >= 130 ? "Transition" : time < 30 ? "End game" : "Shift";
  let percent = time >= 130 && time <= 140 ? progress(time, 130, 140) : time < 30 ? progress(time, 0, 30) : undefined;

  if (time >= 30 && time < 130) {
    const shift = time >= 105 ? 1 : time >= 80 ? 2 : time >= 55 ? 3 : 4;
    percent =
      time >= 105
        ? progress(time, 105, 130)
        : time >= 80
          ? progress(time, 80, 105)
          : time >= 55
            ? progress(time, 55, 80)
            : progress(time, 30, 55);

    const inactiveFirst = (data & 1) === 1;
    inactive = inactiveFirst ? shift === 1 || shift === 3 : shift === 2 || shift === 4;
    timeframe += ` ${shift}`;
  }

  return (
    <div className="flex flex-col self-stretch overflow-hidden rounded-md border border-muted-foreground/50 bg-muted-foreground/10 text-center">
      <div className="py-2">{timeframe}</div>
      {percent != null && (
        <div
          className="h-0.5 bg-foreground"
          style={{ width: `${(1 - percent) * 100}%` }}
        />
      )}
      <div
        className={cn(
          "border-t border-muted-foreground/50 py-2 text-sm",
          inactive ? "bg-muted-foreground/20" : "bg-amber-600"
        )}>
        {inactive ? "Hub Inactive" : "Hub Active"}
      </div>
    </div>
  );
};

const Timer = ({ time, className }: { time: number; className?: string }) => {
  // only minutes and seconds are considered
  const mm = Math.floor(time / 60);
  const ss = Math.floor(time % 60);

  return (
    <div className={cn("font-mono text-6xl font-bold", className)}>
      {time < 0 ? "--:--" : `${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`}
    </div>
  );
};

const Component = ({ mode, data, props }: WidgetComponentProps<PropsType>) => {
  const [d, preview] = withPreview(mode, data as ReturnType<typeof transform>, previewData);
  return (
    <div className="flex h-full w-full flex-col py-2 select-none">
      <div className="mb-1 flex items-center justify-between gap-2 px-3">
        <TruncateText
          variant="head"
          className="text-sm font-bold">
          {props.title || (d?.period ?? "Timer")}
        </TruncateText>
      </div>
      {d != null && (
        <div
          className={cn(
            "mx-3 my-1 flex flex-auto flex-col items-center justify-center gap-4 overflow-hidden",
            preview && "opacity-25"
          )}>
          <Timer
            time={d.remainingTime}
            className={cn(
              d.remainingTime > 0 &&
                props.attention != null &&
                props.attention > 0 &&
                indicateAttention(d, props.attention) &&
                "animate-pulse",
              d.remainingTime > 0 && d.period !== "Autonomous"
                ? props.dangerAt != null && props.dangerAt > 0 && d.remainingTime <= props.dangerAt
                  ? "text-red-600"
                  : props.cautionAt != null && props.cautionAt > 0 && d.remainingTime <= props.cautionAt
                    ? "text-amber-600"
                    : undefined
                : undefined
            )}
          />
          {d.remainingTime >= 0 && props.gameDataVisible && d.gameSeason === 2026 && (
            <GameData2026
              data={d.gameData}
              time={d.remainingTime}
              period={d.period}
            />
          )}
        </div>
      )}
    </div>
  );
};

const Editor = ({ props, onPropsChange }: WidgetEditorProps<PropsType>) => (
  <EditorContainer>
    <EditorBlock label="Title">
      <Input
        value={props.title ?? ""}
        onChange={(ev) =>
          onPropsChange({
            ...props,
            title: ev.currentTarget.value,
          })
        }
        placeholder="Optional widget title"
      />
    </EditorBlock>
    <EditorSwitchBlock
      label="Show game-specific data"
      checked={props.gameDataVisible}
      onCheckedChange={(v) =>
        onPropsChange({
          ...props,
          gameDataVisible: v,
        })
      }
    />
    <EditorSectionHeader>Timer formatting options</EditorSectionHeader>
    <EditorBlock label="Attention time threshold (pulse animation)">
      <InputNumber
        aria-label="Attention time threshold"
        value={props.attention}
        onChange={(v) =>
          onPropsChange({
            ...props,
            attention: Number.isFinite(v) ? v : 0,
          })
        }
        minValue={0}
        maxValue={10}
        step={1}
      />
    </EditorBlock>
    <EditorBlock label="Caution time threshold">
      <InputNumber
        aria-label="Caution time threshold"
        value={props.cautionAt}
        onChange={(v) =>
          onPropsChange({
            ...props,
            cautionAt: Number.isFinite(v) ? v : 0,
          })
        }
        minValue={0}
        maxValue={200}
        step={1}
      />
    </EditorBlock>
    <EditorBlock label="Danger time threshold">
      <InputNumber
        aria-label="Danger time threshold"
        value={props.dangerAt}
        onChange={(v) =>
          onPropsChange({
            ...props,
            dangerAt: Number.isFinite(v) ? v : 0,
          })
        }
        minValue={0}
        maxValue={200}
        step={1}
      />
    </EditorBlock>
  </EditorContainer>
);

export const WidgetMatchTimeDescriptor: WidgetDescriptor<PropsType> = {
  type: "match.time",
  name: "Match time",
  icon: "square-time",
  description: "Active period, time and game-specific data",
  width: 10,
  height: 11,
  constraints: {
    width: { min: 9 },
    height: { min: 6 },
  },
  slot: {
    transform: transform,
    accepts: {
      primitive: ["number"],
      json: ["MatchTime"],
    },
  },
  component: (props) => <Component {...props} />,
  props: {
    schema: propsSchema,
    defaultValue: {
      gameDataVisible: propsSchema.shape.gameDataVisible.def.defaultValue,
      attention: propsSchema.shape.attention.def.defaultValue,
      cautionAt: propsSchema.shape.cautionAt.def.defaultValue,
      dangerAt: propsSchema.shape.dangerAt.def.defaultValue,
    },
    editor: (props) => <Editor {...props} />,
  },
};
