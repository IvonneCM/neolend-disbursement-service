/**
 * helpers/amortization.js
 * Genera la tabla de amortización francesa (cuotas iguales) para un préstamo.
 */

/**
 * Calcula las cuotas de un préstamo con amortización francesa.
 * @param {number} principal   – Monto del préstamo
 * @param {number} annualRate  – Tasa de interés anual (ej: 18 = 18%)
 * @param {number} termMonths  – Plazo en meses
 * @param {Date}   startDate   – Fecha de inicio (primer pago en +1 mes)
 * @returns {Array} Lista de cuotas con número, fecha, capital, interés y total
 */
const generateAmortizationSchedule = (principal, annualRate, termMonths, startDate = new Date()) => {
  const monthlyRate = annualRate / 100 / 12;
  let monthlyPayment;

  if (monthlyRate === 0) {
    monthlyPayment = principal / termMonths;
  } else {
    monthlyPayment =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);
  }

  const schedule = [];
  let balance = principal;

  for (let i = 1; i <= termMonths; i++) {
    const interest = balance * monthlyRate;
    const principalPayment = monthlyPayment - interest;
    balance -= principalPayment;

    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    schedule.push({
      installment_number: i,
      due_date: dueDate.toISOString().split('T')[0],
      amount: parseFloat(monthlyPayment.toFixed(2)),
      principal_amount: parseFloat(principalPayment.toFixed(2)),
      interest_amount: parseFloat(interest.toFixed(2)),
      status: 'PENDING',
    });
  }

  return schedule;
};

module.exports = { generateAmortizationSchedule };
