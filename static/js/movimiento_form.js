(function () {
  const materialSelect = document.getElementById("material-select");
  const cantidadInput = document.getElementById("cantidad-input");
  const costoInput = document.getElementById("costo-input");
  const unidadHint = document.getElementById("unidad-hint");
  const costoTotal = document.getElementById("costo-total");

  if (!materialSelect) return;

  function formatUSD(value) {
    return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function onMaterialChange() {
    const opt = materialSelect.selectedOptions[0];
    if (!opt || !opt.dataset.costo) return;
    costoInput.value = opt.dataset.costo;
    unidadHint.textContent = "(" + opt.dataset.unidad + ")";
    updateTotal();
  }

  function updateTotal() {
    const cantidad = parseFloat(cantidadInput.value) || 0;
    const costo = parseFloat(costoInput.value) || 0;
    costoTotal.textContent = formatUSD(cantidad * costo);
  }

  materialSelect.addEventListener("change", onMaterialChange);
  cantidadInput.addEventListener("input", updateTotal);
  costoInput.addEventListener("input", updateTotal);
})();
