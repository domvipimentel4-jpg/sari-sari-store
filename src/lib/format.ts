export function peso(amount: number) {
  return "₱" + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
