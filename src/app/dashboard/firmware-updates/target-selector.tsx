"use client";

import { useMemo, useState } from "react";
import styles from "../page.module.css";

type Company = { id: number; name: string };
type Branch = { id: number; name: string; companyId: number; companyName: string };
type Device = { id: number; name: string; companyName: string; branchLocation: string | null };

export function FirmwareTargetSelector(props: {
  companies: Company[];
  branches: Branch[];
  devices: Device[];
}) {
  const [targetType, setTargetType] = useState("devices");
  const [companyId, setCompanyId] = useState("");
  const visibleBranches = useMemo(
    () => props.branches.filter((branch) => !companyId || branch.companyId === Number(companyId)),
    [companyId, props.branches],
  );

  return (
    <>
      <label className={styles.field}>
        <span>Hedef tipi</span>
        <select name="targetType" value={targetType} onChange={(event) => setTargetType(event.target.value)}>
          <option value="devices">Seçili cihazlar</option>
          <option value="company">Firmadaki tüm cihazlar</option>
          <option value="branch">Şubedeki tüm cihazlar</option>
        </select>
      </label>

      {targetType === "company" ? (
        <label className={styles.field}>
          <span>Firma</span>
          <select name="companyId" required defaultValue="">
            <option value="" disabled>Firma seç</option>
            {props.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
          </select>
        </label>
      ) : null}

      {targetType === "branch" ? (
        <>
          <label className={styles.field}>
            <span>Firma filtresi</span>
            <select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
              <option value="">Tüm firmalar</option>
              {props.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Şube</span>
            <select name="branchId" required defaultValue="">
              <option value="" disabled>Şube seç</option>
              {visibleBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.companyName} / {branch.name}</option>
              ))}
            </select>
          </label>
        </>
      ) : null}

      {targetType === "devices" ? (
        <fieldset className={styles.fullWidth}>
          <legend>Cihazlar</legend>
          <div className={styles.checkboxGrid}>
            {props.devices.map((device) => (
              <label key={device.id} className={styles.checkboxField}>
                <input type="checkbox" name="deviceIds" value={device.id} />
                <span>{device.name} — {device.companyName}{device.branchLocation ? ` / ${device.branchLocation}` : ""}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
    </>
  );
}
