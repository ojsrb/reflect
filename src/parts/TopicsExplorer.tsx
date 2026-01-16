import { useDraggable } from "@dnd-kit/core";
import { Search, SquareDashed } from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";

import { Badge } from "@ui/badge";
import { Input } from "@ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select";
import { Tree } from "@ui/tree";

import { cn } from "../lib/utils";
import { useSuppliers } from "../stores/Data";
import { useSettingsStore } from "../stores/Settings";
import { Slot } from "../widgets/slot";
import { TopicEntry } from "./TopicEntry";

import type { StyledComponentProps } from "../lib/types";
import type { DataNode } from "../stores/Data";
import type { TopicEntryProps } from "./TopicEntry";

type TreeNode = {
  proto: DataNode;
  children: Array<TreeNode>;
};

type TreeOptions = {
  visibleLW: boolean;
  visibleSB: boolean;
  visibleMetadata: boolean;
};

const createTree = (
  node: DataNode,
  predicate: (node: DataNode) => boolean,
  options: TreeOptions,
  depth = 0
): TreeNode | undefined => {
  if (node.nodes.length > 0) {
    const children: Array<TreeNode> = [];
    for (const child of node.nodes) {
      if (depth === 0) {
        if (!options.visibleLW && child.name === "LiveWindow") {
          continue;
        }

        if (!options.visibleSB && child.name === "Shuffleboard") {
          continue;
        }
      }

      // exclude `.metadata`-like folders
      if (!options.visibleMetadata && child.name[0] === ".") {
        continue;
      }

      const c = createTree(child, predicate, options, depth + 1);
      if (c) {
        children.push(c);
      }
    }

    if (children.length > 0) {
      return {
        proto: node,
        children,
      };
    }

    // if interim (folder) node is empty hide it unless it also
    // references a data channel and matches predicate
    if (node.channel != null && predicate(node)) {
      return {
        proto: node,
        children: [],
      };
    }
  }
  // terminal nodes must match the predicate
  else if (predicate(node)) {
    return {
      proto: node,
      children: [],
    };
  }

  return undefined;
};

const getMetadata = (node: TreeNode) =>
  ({
    id: node.proto.id,
    content: node.proto.name,
    children: node.children,
  }) as const;

const truthy = () => true;
const createPredicate = (
  search: string | null | undefined,
  metadataVisible = false,
  other?: (node: DataNode) => boolean
) => {
  const conditions: Array<(n: DataNode) => boolean> = [];

  if (search) {
    const s = search.toLocaleUpperCase();
    conditions.push((n) => n.name.toLocaleUpperCase().includes(s));
  }

  if (!metadataVisible) {
    conditions.push((n) => n.name[0] !== ".");
  }

  if (other) {
    conditions.push(other);
  }

  if (conditions.length === 0) {
    return truthy;
  }

  if (conditions.length === 1) {
    return conditions[0]!;
  }

  // `AND` all conditions
  return (n: DataNode) => conditions.reduce((acc, condition) => acc && condition(n), true);
};

const TopicsSupplier = ({ source }: { source: string }) => (
  <Badge variant="secondary">{Slot.formatSource(source)}</Badge>
);

const DraggableTopicEntry = (props: TopicEntryProps) => {
  const disabled = props.channel == null;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    disabled,
    id: props.id,
    data: {
      type: "topic",
      props: props,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...(disabled ? undefined : attributes)}
      {...(disabled ? undefined : listeners)}
      data-dragging={isDragging ? true : undefined}
      tabIndex={disabled ? -1 : attributes.tabIndex}
      className={cn(
        "flex grow touch-none overflow-hidden outline-none data-dragging:opacity-20",
        !disabled && "cursor-grab"
      )}>
      <TopicEntry {...props} />
    </div>
  );
};

const renderTopicEntry = (behavior: "draggable" | "default", props: TopicEntryProps) =>
  behavior === "draggable" ? (
    <DraggableTopicEntry {...props} />
  ) : (
    <TopicEntry
      inert
      {...props}
    />
  );

export type TopicsExplorerProps = StyledComponentProps & {
  behavior?: "draggable" | "default";
  value?: string;
  onChange?: (value: string | undefined) => void;
  filter?: (node: DataNode) => boolean;
};

export const TopicsExplorer = ({ className, behavior = "default", value, onChange, filter }: TopicsExplorerProps) => {
  const topicsVisibleLW = useSettingsStore.use.topicsVisibleLW();
  const topicsVisibleSB = useSettingsStore.use.topicsVisibleSB();
  const topicsVisibleMetadata = useSettingsStore.use.topicsVisibleMetadata();

  // e.g. nt:/SmartDashboard/...
  const [source] = value ? value.split(":", 2) : [];

  const suppliers = useSuppliers();

  const [supplierId, setSupplierId] = useState(source);
  const [search, setSearch] = useState("");

  const deferredSearch = useDeferredValue(search);
  const predicate = useMemo(
    () => createPredicate(deferredSearch, topicsVisibleMetadata, filter),
    [deferredSearch, topicsVisibleMetadata, filter]
  );

  // resync supplier selection
  useEffect(() => {
    if (suppliers && suppliers.length > 0) {
      // sync with the supplier provided by the value
      // otherwise, select the first available supplier
      if (source != null && source !== supplierId) {
        setSupplierId(source);
      } else if (!supplierId || !suppliers.some((_) => _.id === supplierId)) {
        setSupplierId(suppliers[0]?.id ?? "");
      }
    } else {
      setSupplierId("");
    }
  }, [suppliers, supplierId, source]);

  const supplier = suppliers.find((_) => _.id === supplierId);
  const root = useMemo(
    () =>
      supplier
        ? createTree(supplier.root, predicate, {
            visibleLW: topicsVisibleLW,
            visibleSB: topicsVisibleSB,
            visibleMetadata: topicsVisibleMetadata,
          })
        : undefined,
    // include revision in the dependency list to force re-evaluation when the supplier data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [supplier, supplier?.revision, predicate, topicsVisibleLW, topicsVisibleSB, topicsVisibleMetadata]
  );

  const handleSelectionChange = useCallback(
    (node: TreeNode | undefined) => {
      if (onChange) {
        if (node == null) {
          onChange(undefined);
        } else if (node.proto.channel != null) {
          onChange(Slot.fromChannel(node.proto.channel));
        }
      }
    },
    [onChange]
  );

  return (
    <div className={cn("flex flex-1 flex-col overflow-x-hidden", className)}>
      <div className="flex flex-none items-center overflow-hidden border-b">
        <div className="flex flex-1 items-center focus-within:ring-1 focus-within:ring-ring focus-within:ring-inset">
          <Search className="ml-2 size-4 shrink-0 text-accent-foreground/50" />
          <Input
            aria-label="Search"
            embedded
            placeholder="Search&hellip;"
            className="w-full flex-1 pl-2 focus-visible:ring-0"
            value={search}
            onChange={(ev) => setSearch(ev.currentTarget.value)}
          />
        </div>
        {suppliers.length > 0 && (
          <Select
            value={supplierId ?? ""}
            onValueChange={setSupplierId}
            disabled={supplierId != null && suppliers.length === 1}>
            <SelectTrigger
              icon="up-down"
              embedded>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((_) => (
                <SelectItem
                  key={_.id}
                  value={_.id}>
                  <TopicsSupplier source={_.id} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {supplier && supplier.root.nodes.length > 0 ? (
        root && root.children.length > 0 ? (
          <Tree
            data={root.children}
            metadata={getMetadata}
            className="w-full overflow-x-hidden"
            selectedId={value}
            onSelectionChange={handleSelectionChange}
            renderNode={(node, metadata) =>
              renderTopicEntry(behavior, {
                id: node.proto.id,
                name: node.proto.name,
                channel: node.proto.channel,
                leaf: !metadata.children || metadata.children.length === 0,
              })
            }
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground select-none">
            <div className="flex flex-col gap-2 p-8 text-center">
              <Search className="mx-auto size-8 flex-none" />
              No entries matching criteria
            </div>
          </div>
        )
      ) : (
        <div className="grid h-full w-full place-items-center text-muted-foreground select-none">
          <div className="flex flex-col gap-2 p-8 text-center">
            <SquareDashed className="mx-auto size-8 flex-none" />
            No sources or channels detected
          </div>
        </div>
      )}
    </div>
  );
};
