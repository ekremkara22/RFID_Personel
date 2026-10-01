import { ProductionSectionPage } from "../section-page";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
export default async function Page(){const {authorization}=await requireSessionUser();assertPermission(authorization,PERMISSIONS.WORK_CENTER_VIEW);return <ProductionSectionPage title="İş Merkezleri" description="Üretim kaynaklarını ve iş merkezi tanımlarını yönetin."/>;}
