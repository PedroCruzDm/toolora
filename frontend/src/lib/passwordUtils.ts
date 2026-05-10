const commonPasswords = new Set([
  '123456', 'password', '12345678', 'qwerty', '123456789', '12345', '1234', '111111', '1234567', 'dragon',
  'baseball', 'abc123', 'football', 'monkey', 'letmein', 'shadow', 'master', '666666', 'qwertyuiop', '123321'
]);

export function isCommonPassword(pw: string) {
  return commonPasswords.has(pw);
}

export function passwordCriteria(pw: string) {
  return {
    length: pw.length >= 8,
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
}

export function passwordStrength(pw: string) {
  const crit = passwordCriteria(pw);
  let score = 0;
  if (crit.length) score += 1;
  if (crit.lower) score += 1;
  if (crit.upper) score += 1;
  if (crit.number) score += 1;
  if (crit.symbol) score += 1;
  // penalize very short
  if (pw.length < 6) score = Math.min(score, 1);
  return { score, max: 5, criteria: crit };
}

export function isStrongEnough(pw: string) {
  const { criteria } = passwordStrength(pw);
  return criteria.length && criteria.lower && criteria.upper && criteria.number;
}

export default { isCommonPassword, passwordCriteria, passwordStrength, isStrongEnough };