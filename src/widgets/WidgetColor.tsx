import { z } from "zod";

import { Button } from "@ui/button";
import { Input } from "@ui/input";
import { TruncateText } from "@ui/truncate-text";

import { EditorBlock } from "./parts/EditorBlock";
import { EditorContainer } from "./parts/EditorContainer";
import { Slot } from "./slot";

import type { DataChannelRecord, DataType } from "@2702rebels/wpidata/abstractions";
import type { WidgetComponentProps, WidgetDescriptor, WidgetEditorProps } from "./types";

const TRUE_COLOR = "#00c951";
const FALSE_COLOR = "#fb2c36";

const propsSchema = z.object({
  title: z.string().optional(),
  boolean: z.object({
    true: z.string().default(TRUE_COLOR),
    false: z.string().default(FALSE_COLOR),
  }),
});

type PropsType = z.infer<typeof propsSchema>;

const transform = (dataType: DataType, records: ReadonlyArray<DataChannelRecord>) => {
  if (records.length == 0) {
    return undefined;
  }

  const value = records.at(-1)?.value;

  if (typeof value === "boolean") {
    return value;
  }

  // validate value
  if (typeof value === "string") {
    return CSS.supports("color", value) ? value : undefined;
  }

  // treat numeric value as RGB
  if (typeof value === "number") {
    const r = (value >> 16) & 0xff;
    const g = (value >> 8) & 0xff;
    const b = value & 0xff;
    return `rgb(${r},${g},${b})`;
  }

  return undefined;
};

const Component = ({ mode, slot, data, props }: WidgetComponentProps<PropsType>) => {
  const d = mode === "template" ? "#000000" : (data as ReturnType<typeof transform>);
  return (
    <div className="flex h-full w-full flex-col py-2 select-none">
      <div className="mb-1 flex items-center justify-between gap-2 px-3">
        <TruncateText
          variant="head"
          className="text-sm font-bold">
          {mode === "template" ? "Preview" : props.title || Slot.formatAsTitle(slot)}
        </TruncateText>
      </div>
      {d != null && (
        <div
          className="mx-3 my-1 flex-auto rounded-md"
          style={{ backgroundColor: typeof d === "boolean" ? (d ? props.boolean.true : props.boolean.false) : d }}
        />
      )}
    </div>
  );
};

const Editor = ({ props, onPropsChange }: WidgetEditorProps<PropsType>) => {
  return (
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
      <div className="flex items-center justify-between gap-1 border-y bg-secondary/20 px-4 py-4 select-none">
        <p className="text-sm text-muted-foreground">Boolean value options (valid CSS color values)</p>
        <Button
          onClick={() =>
            onPropsChange({
              ...props,
              boolean: {
                true: TRUE_COLOR,
                false: FALSE_COLOR,
              },
            })
          }
          className="-my-3"
          variant="link"
          size="sm">
          Reset default colors
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 px-4">
        <EditorBlock
          label={
            <div className="flex items-center gap-2">
              True color
              <div
                className="size-3 rounded-xs"
                style={{ backgroundColor: props.boolean.true }}></div>
            </div>
          }
          className="px-0">
          <Input
            aria-label="True color"
            value={props.boolean.true}
            onChange={(ev) =>
              onPropsChange({
                ...props,
                boolean: {
                  ...props.boolean,
                  true: ev.currentTarget.value,
                },
              })
            }
          />
        </EditorBlock>
        <EditorBlock
          label={
            <div className="flex items-center gap-2">
              False color
              <div
                className="size-3 rounded-xs"
                style={{ backgroundColor: props.boolean.false }}></div>
            </div>
          }
          className="px-0">
          <Input
            aria-label="False color"
            value={props.boolean.false}
            onChange={(ev) =>
              onPropsChange({
                ...props,
                boolean: {
                  ...props.boolean,
                  false: ev.currentTarget.value,
                },
              })
            }
          />
        </EditorBlock>
      </div>
    </EditorContainer>
  );
};

export const WidgetColorDescriptor: WidgetDescriptor<PropsType> = {
  type: "color",
  name: "Color",
  icon: "square-colors",
  description: "Single color",
  width: 6,
  height: 6,
  constraints: {
    width: { min: 4 },
    height: { min: 4 },
  },
  slot: {
    transform: transform,
    accepts: {
      primitive: ["number", "string", "boolean"],
    },
  },
  component: (props) => <Component {...props} />,
  props: {
    schema: propsSchema,
    defaultValue: {
      boolean: {
        true: TRUE_COLOR,
        false: FALSE_COLOR,
      },
    },
    editor: (props) => <Editor {...props} />,
  },
  spotlight: false,
};
