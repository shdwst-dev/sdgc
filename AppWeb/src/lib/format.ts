const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function formatDate(value: string | null) {
  if (!value) {
    return "Sin registro";
  }

  const normalizedValue = value.includes("T")
    ? value
    : value.includes(" ")
      ? value.replace(" ", "T")
      : `${value}T00:00:00`;

  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Fecha invalida";
  }

  return dateFormatter.format(parsedDate);
}
