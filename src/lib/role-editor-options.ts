import { MODULE_CATALOG } from "@/lib/module-catalog";
import { MODULE_PERMISSION_SECTIONS } from "@/lib/permission-catalog";

export function roleEditorModules(availableModules: Set<string>, availablePermissions: Set<string>) {
  return MODULE_CATALOG.filter((module) => availableModules.has(module.key)).map((module) => ({
    key: module.key,
    name: module.name,
    description: module.description,
    sections: MODULE_PERMISSION_SECTIONS[module.key].map((section) => ({
      label: section.label,
      items: section.items.filter(([code]) => availablePermissions.has(code)).map(([code, label]) => ({ code, label })),
    })).filter((section) => section.items.length > 0),
  }));
}
