import { ProductionSectionPage } from "../section-page";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
export default async function Page(){const {authorization}=await requireSessionUser();assertPermission(authorization,PERMISSIONS.CAPACITY_VIEW);return <ProductionSectionPage title="Kapasite Planlama" description="Kullanılabilir kapasiteyi, planlanan yükü ve darboğazları izleyin."/>;}
