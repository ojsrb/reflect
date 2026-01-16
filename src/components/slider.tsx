import * as SliderPrimitive from "@radix-ui/react-slider";
import { memo } from "react";

import { cn } from "../lib/utils";

export const Slider = memo(({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) => (
  <SliderPrimitive.Root
    className={cn("relative flex w-full touch-none items-center select-none", className)}
    {...props}>
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-slate-700">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));

Slider.displayName = "Slider";
