const APPROVED_MESSAGES = [
  /^Las contraseñas no coinciden\.$/,
  /^La contraseña debe tener al menos 10 caracteres\.?$/,
  /^La contraseña es demasiado larga\.?$/,
  /^Ese nombre de usuario ya está registrado\.?$/,
  /^Usuario o contraseña incorrectos\.?$/,
  /^Demasiados intentos\. Espera 15 minutos antes de volver a probar\.?$/,
  /^Cierra la sesión actual antes de crear otra cuenta\.?$/,
  /^La cuenta debe conservar al menos un método de acceso\.?$/,
  /^La edad debe estar entre 18 y 100 años\.$/,
  /^La altura debe estar entre 100 y 250 cm\.$/,
  /^El peso debe estar entre 20 y 500 kg\.$/,
  /^Completa cuello y cintura para estimar la grasa corporal\.$/,
  /^La medida del cuello debe estar entre 20 y 80 cm\.$/,
  /^La medida de la cintura debe estar entre 40 y 250 cm\.$/,
  /^La cintura debe ser mayor que el cuello\.$/,
  /^La medida de cadera es necesaria para esta estimación\.$/,
  /^La medida de la cadera debe estar entre 40 y 250 cm\.$/,
  /^Los perímetros no producen una estimación válida\. Revisa las medidas\.$/,
  /^Primero espera a que se guarden tus cambios o guarda una copia\. Después podrás activar los avisos\.$/,
  /^Este dispositivo no puede mostrar avisos cuando FORJA está cerrado\.$/,
  /^Los avisos están bloqueados\. Permítelos en la configuración y vuelve a intentarlo\.$/,
  /^Tu sesión está a salvo en este dispositivo, pero todavía no se guardó en tu cuenta\. Vuelve a intentarlo antes de calcular el siguiente paso\.$/,
] as const;

/**
 * Only messages deliberately written for the interface may cross this boundary.
 * Unknown failures always use the contextual fallback supplied by the caller.
 */
export function userFacingError(cause: unknown, fallback: string): string {
  const detail = cause instanceof Error ? cause.message.trim() : '';
  return detail && APPROVED_MESSAGES.some((pattern) => pattern.test(detail)) ? detail : fallback;
}
