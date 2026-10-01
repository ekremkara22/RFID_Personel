import type { Prisma } from "@/generated/prisma/client";
import { CompanyMembershipStatus, DataScopeMode } from "@/generated/prisma/client";
import { permissionModule, type PermissionCode } from "@/lib/permission-catalog";
import { MODULES, type ModuleKey } from "@/lib/module-catalog";
import { PERMISSIONS } from "@/lib/permission-catalog";
export type AuthorizationContext = { isPlatformAdmin:boolean; userId:number; companyId:number|null; membershipId:number|null; membershipStatus:CompanyMembershipStatus|null; sessionVersion:number; roleKey:string|null; roleName:string|null; permissions:Set<string>; modules:Set<string>; scopeMode:DataScopeMode|null; employeeId:number|null; branchIds:number[]; departmentIds:number[]; employeeIds:number[]; deviceIds:number[]; teamEmployeeIds:number[] };
export function canAccessModule(context:AuthorizationContext,moduleKey:ModuleKey){return context.isPlatformAdmin||(context.membershipStatus===CompanyMembershipStatus.ACTIVE&&context.modules.has(moduleKey));}
export function assertModule(context:AuthorizationContext,moduleKey:ModuleKey){if(!canAccessModule(context,moduleKey))throw new Error("Bu modüle erişim yetkiniz bulunmuyor.");}
const MODULE_NEUTRAL_PERMISSIONS = new Set<string>([
  PERMISSIONS.ACCESS_VIEW,
  PERMISSIONS.ACCESS_MANAGE,
  PERMISSIONS.OWNERSHIP_TRANSFER,
  PERMISSIONS.COMPANY_VIEW,
  PERMISSIONS.COMPANY_UPDATE,
  PERMISSIONS.SETTINGS_MANAGE,
]);
export function can(context:AuthorizationContext,permission:PermissionCode){const moduleKey=permissionModule(permission);return context.isPlatformAdmin||(context.membershipStatus===CompanyMembershipStatus.ACTIVE&&context.permissions.has(permission)&&(MODULE_NEUTRAL_PERMISSIONS.has(permission)||(moduleKey?canAccessModule(context,moduleKey):canAccessModule(context,MODULES.HR))));}
export function assertPermission(context:AuthorizationContext,permission:PermissionCode){if(!can(context,permission))throw new Error("Bu işlem için yetkiniz bulunmuyor.");}
export function employeeScopeWhere(context:AuthorizationContext):Prisma.EmployeeWhereInput{if(!context.companyId)return{id:-1};const base:Prisma.EmployeeWhereInput={companyId:context.companyId};if(context.isPlatformAdmin||context.scopeMode===DataScopeMode.COMPANY)return base;if(context.scopeMode===DataScopeMode.OWN)return context.employeeId?{...base,id:context.employeeId}:{id:-1};if(context.scopeMode!==DataScopeMode.RESTRICTED)return{id:-1};const dimensions:Prisma.EmployeeWhereInput[]=[];if(context.branchIds.length)dimensions.push({branchId:{in:context.branchIds}});if(context.departmentIds.length)dimensions.push({departmentId:{in:context.departmentIds}});if(context.employeeIds.length)dimensions.push({id:{in:context.employeeIds}});if(context.teamEmployeeIds.length)dimensions.push({id:{in:context.teamEmployeeIds}});return dimensions.length?{...base,AND:dimensions}:{id:-1};}
export function deviceScopeWhere(context:AuthorizationContext):Prisma.DeviceWhereInput{if(!context.companyId)return{id:-1};if(context.isPlatformAdmin||context.scopeMode===DataScopeMode.COMPANY)return{companyId:context.companyId};return context.deviceIds.length?{companyId:context.companyId,id:{in:context.deviceIds}}:{id:-1};}
export function scopeSummary(context:AuthorizationContext){if(context.scopeMode===DataScopeMode.COMPANY)return"Firmanın tamamı";if(context.scopeMode===DataScopeMode.OWN)return"Yalnızca kendi personel kaydı";if(context.scopeMode===DataScopeMode.NONE)return"Erişim yok";const parts=[];if(context.branchIds.length)parts.push(`${context.branchIds.length} şube`);if(context.departmentIds.length)parts.push(`${context.departmentIds.length} departman`);if(context.teamEmployeeIds.length)parts.push("tanımlı ekip");if(context.employeeIds.length)parts.push(`${context.employeeIds.length} personel`);if(context.deviceIds.length)parts.push(`${context.deviceIds.length} cihaz`);return parts.length?`${parts.join(" + ")} (farklı kapsam türleri kesişir)`:"Erişim yok (boş kapsam)";}
