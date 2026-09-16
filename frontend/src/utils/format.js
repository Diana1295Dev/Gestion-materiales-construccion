// Formato de moneda en pesos colombianos (COP). En Colombia no se usan
// centavos en el uso cotidiano, por eso maximumFractionDigits: 0.
export const money = (n) =>
  Number(n || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

export const numero = (n, opciones) => Number(n || 0).toLocaleString("es-CO", opciones);
