import { ProductionSectionPage } from "../section-page";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
export default async function Page(){const {authorization}=await requireSessionUser();assertPermission(authorization,PERMISSIONS.PRODUCTION_CALENDAR_VIEW);return <ProductionSectionPage title="Üretim Takvimi" description="Üretim planlarını tarih ve dönem bazında görüntüleyin."/>;}
