import { useDraggable } from "@dnd-kit/core";
import React, { Fragment, useMemo } from "react";

import { getOrAdd } from "@2702rebels/shared/iterable";
import { ScrollArea } from "@ui/scroll-area";
import { Separator } from "@ui/separator";

import { useSettingsStore } from "../stores/Settings";
import { WidgetRegistry } from "../widgets/WidgetRegistry";
import { WidgetGalleryItem } from "./WidgetGalleryItem";

import type { RuntimeWidget } from "../stores/Workspace";
import type { WidgetGalleryItemProps } from "./WidgetGalleryItem";

const DraggableWidgetGalleryItem = (props: WidgetGalleryItemProps) => {
  const { descriptor } = props;
  const widget = useMemo(
    () =>
      ({
        id: "",
        type: descriptor.type,
        constraints: descriptor.constraints,
        layout: {
          left: 0,
          top: 0,
          width: descriptor.width,
          height: descriptor.height,
        },
        props: descriptor.props?.defaultValue,
        descriptor,
      }) satisfies RuntimeWidget,
    [descriptor]
  );

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `template:${descriptor.type}`,
    data: {
      type: "template",
      widget: widget,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-dragging={isDragging ? true : undefined}
      tabIndex={attributes.tabIndex}
      className="flex flex-auto cursor-grab touch-none rounded-md outline-none hover:ring-1 hover:ring-ring focus-visible:ring-1 focus-visible:ring-ring data-dragging:opacity-20">
      <WidgetGalleryItem {...props} />
    </div>
  );
};

export const WidgetGallery = () => {
  const season = useSettingsStore.use.season() ?? __SEASON__;
  const items = useMemo(() => {
    // separate evergreen from season-specific widgets
    const evergreen: Array<React.ReactNode> = [];
    const seasoned = new Map<number, Array<React.ReactNode>>();

    Object.values(WidgetRegistry).forEach((_) => {
      const item = (
        <DraggableWidgetGalleryItem
          key={_.type}
          descriptor={_}
        />
      );

      if (_.season != null) {
        if (_.season === season) {
          getOrAdd(seasoned, _.season, () => []).push(item);
        }
      } else {
        evergreen.push(item);
      }
    });

    return {
      evergreen,
      seasoned: Array.from(seasoned.entries()).sort((a, b) => b[0] - a[0]),
    };
  }, [season]);

  return (
    <ScrollArea>
      <div className="flex w-full flex-col gap-3 p-3">
        {items.evergreen}
        {items.seasoned.map(([season, items]) => (
          <Fragment key={season}>
            <div className="flex items-center gap-1 text-sm select-none">
              {season}
              <Separator orientation="horizontal" />
            </div>
            {items}
          </Fragment>
        ))}
      </div>
    </ScrollArea>
  );
};
