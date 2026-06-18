"use client";

import { useMemo } from "react";

import { Select } from "@/components/ui";
import { VN_PROVINCES } from "@/data/vn-divisions";

export interface VnDivisionsValue {
  provinceCode: string;
  province: string;
  districtCode: string;
  district: string;
  wardCode: string;
  ward: string;
}

interface VnDivisionsSelectProps {
  value: VnDivisionsValue;
  onChange: (next: VnDivisionsValue) => void;
  errors?: Partial<Record<"province" | "district" | "ward", string>>;
  idPrefix?: string;
}

const EMPTY: VnDivisionsValue = {
  provinceCode: "",
  province: "",
  districtCode: "",
  district: "",
  wardCode: "",
  ward: "",
};

export function VnDivisionsSelect({
  value,
  onChange,
  errors,
  idPrefix = "vn-div",
}: VnDivisionsSelectProps) {
  const provinces = VN_PROVINCES;

  const districts = useMemo(
    () =>
      provinces.find((p) => p.code === value.provinceCode)?.districts ?? [],
    [provinces, value.provinceCode],
  );

  const wards = useMemo(
    () =>
      districts.find((d) => d.code === value.districtCode)?.wards ?? [],
    [districts, value.districtCode],
  );

  function handleProvince(code: string) {
    const province = provinces.find((p) => p.code === code);
    onChange({
      ...EMPTY,
      provinceCode: province?.code ?? "",
      province: province?.name ?? "",
    });
  }

  function handleDistrict(code: string) {
    const district = districts.find((d) => d.code === code);
    onChange({
      provinceCode: value.provinceCode,
      province: value.province,
      districtCode: district?.code ?? "",
      district: district?.name ?? "",
      wardCode: "",
      ward: "",
    });
  }

  function handleWard(code: string) {
    const ward = wards.find((wa) => wa.code === code);
    onChange({
      provinceCode: value.provinceCode,
      province: value.province,
      districtCode: value.districtCode,
      district: value.district,
      wardCode: ward?.code ?? "",
      ward: ward?.name ?? "",
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div>
        <Select
          id={`${idPrefix}-province`}
          aria-label="Tỉnh/Thành phố"
          value={value.provinceCode}
          onChange={(e) => handleProvince(e.target.value)}
          error={Boolean(errors?.province)}
        >
          <option value="">Tỉnh/Thành phố</option>
          {provinces.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </Select>
        {errors?.province ? (
          <p className="mt-1 text-xs text-danger">{errors.province}</p>
        ) : null}
      </div>

      <div>
        <Select
          id={`${idPrefix}-district`}
          aria-label="Quận/Huyện"
          value={value.districtCode}
          onChange={(e) => handleDistrict(e.target.value)}
          disabled={!value.provinceCode}
          error={Boolean(errors?.district)}
        >
          <option value="">Quận/Huyện</option>
          {districts.map((d) => (
            <option key={d.code} value={d.code}>
              {d.name}
            </option>
          ))}
        </Select>
        {errors?.district ? (
          <p className="mt-1 text-xs text-danger">{errors.district}</p>
        ) : null}
      </div>

      <div>
        <Select
          id={`${idPrefix}-ward`}
          aria-label="Phường/Xã"
          value={value.wardCode}
          onChange={(e) => handleWard(e.target.value)}
          disabled={!value.districtCode}
          error={Boolean(errors?.ward)}
        >
          <option value="">Phường/Xã</option>
          {wards.map((wa) => (
            <option key={wa.code} value={wa.code}>
              {wa.name}
            </option>
          ))}
        </Select>
        {errors?.ward ? (
          <p className="mt-1 text-xs text-danger">{errors.ward}</p>
        ) : null}
      </div>
    </div>
  );
}
