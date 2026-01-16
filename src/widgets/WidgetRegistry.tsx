import { WidgetCameraDescriptor } from "./WidgetCamera";
import { WidgetChartLineDescriptor } from "./WidgetChartLine";
import { WidgetChooserDescriptor } from "./WidgetChooser";
import { WidgetColorDescriptor } from "./WidgetColor";
import { WidgetField2dDescriptor } from "./WidgetField2d";
import { WidgetGyroDescriptor } from "./WidgetGyro";
import { WidgetPowerPdhDescriptor, WidgetPowerPdpDescriptor } from "./WidgetPowerDistribution";
import { WidgetReefAlgaeDescriptor } from "./WidgetReefAlgae";
import { WidgetReefCoralDescriptor } from "./WidgetReefCoral";
import { WidgetSliderDescriptor } from "./WidgetSlider";
import { WidgetToggleDescriptor } from "./WidgetToggle";
import { WidgetValueDescriptor } from "./WidgetValue";

import type { WidgetType } from "../specs";
import type { WidgetDescriptor } from "./types";

export const WidgetRegistry: Record<WidgetType, WidgetDescriptor> = [
  WidgetValueDescriptor,
  WidgetColorDescriptor,
  WidgetToggleDescriptor,
  WidgetChooserDescriptor,
  WidgetSliderDescriptor,
  WidgetField2dDescriptor,
  WidgetChartLineDescriptor,
  WidgetPowerPdhDescriptor,
  WidgetPowerPdpDescriptor,
  WidgetGyroDescriptor,
  WidgetCameraDescriptor,
  // WidgetRobot3dDescriptor,
  WidgetReefCoralDescriptor,
  WidgetReefAlgaeDescriptor,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
].reduce<Record<WidgetType, WidgetDescriptor>>((acc, _) => ({ ...acc, [_.type]: _ }), {} as any);
