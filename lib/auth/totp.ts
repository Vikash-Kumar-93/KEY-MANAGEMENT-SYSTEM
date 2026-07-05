import { authenticator } from "otplib";
import QRCode from "qrcode";


authenticator.options = {
  step: 30,
  digits: 6,
  window: 1,
};


export async function generateTOTPSecret(
  userEmail: string
): Promise<{ secret: string; qrCodeUrl: string }> {

  const secret = authenticator.generateSecret();


  const otpAuthUrl = authenticator.keyuri(
  userEmail,
  "PKMS",
  secret
);

  const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);

  return { secret, qrCodeUrl };
}


export function verifyTOTPCode(secret: string, code: string): boolean {
  try {
   return authenticator.check(code, secret);
  } catch (error) {
    console.error("TOTP verification error:", error);
    return false;
  }
}


export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    const code = Array.from({ length: 8 })
      .map(() => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        return chars.charAt(Math.floor(Math.random() * chars.length));
      })
      .join("");

    codes.push(code);
  }

  return codes;
}


export function verifyBackupCode(
  code: string,
  backupCodesArray: string[]
): { valid: boolean; updatedCodes: string[] } {
  const index = backupCodesArray.findIndex(
    (c) => c.toUpperCase() === code.toUpperCase()
  );

  if (index === -1) {
    return { valid: false, updatedCodes: backupCodesArray };
  }

  // Remove used code
  const updatedCodes = backupCodesArray.filter((_, i) => i !== index);

  return { valid: true, updatedCodes };
}

export function formatBackupCodes(codes: string[]): string[] {
  return codes.map((code) => {
    const half1 = code.substring(0, 4);
    const half2 = code.substring(4, 8);
    return `${half1}-${half2}`;
  });
}


export function backupCodesToString(codes: string[]): string {
  const formattedCodes = formatBackupCodes(codes);

  return `PKMS Backup Codes
====================
Save these codes in a safe place.
Each code can be used once for account recovery.

${formattedCodes.map((code, i) => `${i + 1}. ${code}`).join("\n")}

Generated: ${new Date().toISOString()}
`;
}


