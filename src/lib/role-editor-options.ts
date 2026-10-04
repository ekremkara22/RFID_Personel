import { MODULE_PERMISSION_SECTIONS } from "@/lib/permission-catalog";
import type { DisplayModuleDefinition } from "@/modules/module-definitions/repository";

export function roleEditorModules(catalog: readonly DisplayModuleDefinition[], availableModules: Set<string>, availablePermissions: Set<string>) {
  return catalog.filter((module) => availableModules.has(module.key)).map((module) => ({
    key: module.key,
    name: module.name,
    description: module.description,
    sections: MODULE_PERMISSION_SECTIONS[module.key].map((section) => ({
      label: section.label,
      items: section.items.filter(([code]) => availablePermissions.has(code)).map(([code, label]) => ({ code, label })),
    })).filter((section) => section.items.length > 0),
  }));
}
