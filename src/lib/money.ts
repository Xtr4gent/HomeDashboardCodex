export function centsFromFormValue(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const normalized = value.replace(/[$,]/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  return Math.round(Number(normalized) * 100);
}

export function dollarsFromCents(cents?: number | null): string {
  if (cents === null || cents === undefined) {
    return "";
  }

  return (cents / 100).toFixed(2);
}

export function formatMoney(cents?: number | null): string {
  if (cents === null || cents === undefined) {
    return "Unknown";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(cents / 100);
}
