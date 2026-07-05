import crypto from "crypto";

interface DeviceInfo {
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
  ipAddress: string;
}


export function extractDeviceFingerprint(
  headers: Record<string, string | string[] | undefined>,
  ipAddress: string
): DeviceInfo {
  const getHeader = (name: string): string => {
    const value = headers[name.toLowerCase()];
    return typeof value === "string" ? value : (value?.[0] ?? "");
  };

  return {
    userAgent: getHeader("user-agent"),
    acceptLanguage: getHeader("accept-language"),
    acceptEncoding: getHeader("accept-encoding"),
    ipAddress,
  };
}

export function hashDeviceFingerprint(deviceInfo: DeviceInfo): string {
  const fingerprint = JSON.stringify(deviceInfo, Object.keys(deviceInfo).sort());

  return crypto.createHash("sha256").update(fingerprint).digest("hex");
}


export function getDeviceFingerprintHash(
  headers: Record<string, string | string[] | undefined>,
  ipAddress: string
): string {
  const deviceInfo = extractDeviceFingerprint(headers, ipAddress);
  return hashDeviceFingerprint(deviceInfo);
}


export function isDeviceTrustedToday(
  lastOTPVerifiedAt: string | Date | null,
  verifyWindowHours: number = 24
): boolean {
  if (!lastOTPVerifiedAt) {
    return false;
  }

  const lastVerifiedDate =
    typeof lastOTPVerifiedAt === "string"
      ? new Date(lastOTPVerifiedAt)
      : lastOTPVerifiedAt;

  if (isNaN(lastVerifiedDate.getTime())) {
    return false;
  }

  const verifyWindowMs = verifyWindowHours * 60 * 60 * 1000;
  const timeSinceVerification = Date.now() - lastVerifiedDate.getTime();

  return timeSinceVerification < verifyWindowMs;
}


export function formatDeviceName(userAgent: string): string {
  
  if (!userAgent) {
    return "Unknown Device";
  }

  let name = "Device";

  if (userAgent.includes("Chrome")) {
    name = "Chrome";
  } else if (userAgent.includes("Safari")) {
    name = "Safari";
  } else if (userAgent.includes("Firefox")) {
    name = "Firefox";
  } else if (userAgent.includes("Edge")) {
    name = "Edge";
  }


  if (userAgent.includes("Windows")) {
    name += " on Windows";
  } else if (userAgent.includes("Mac")) {
    name += " on Mac";
  } else if (userAgent.includes("Linux")) {
    name += " on Linux";
  } else if (userAgent.includes("Android")) {
    name += " on Android";
  } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
    name += " on iOS";
  }

  return name;
}


export interface Device {
  id: string;
  name: string;
  fingerprintHash: string;
  isTrusted: boolean;
  lastOTPVerifiedAt: Date | null;
  createdAt: Date;
}


export function formatDeviceDisplay(device: Device): string {
  const date = new Date(device.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const trustStatus = device.isTrusted ? "✓ Trusted" : "Needs OTP";

  return `${device.name} — ${date} (${trustStatus})`;
}


export function getClientIPAddress(
  headers: Record<string, string | string[] | undefined>,
  defaultIp: string = "0.0.0.0"
): string {
  const proxyHeaders = [
    "cf-connecting-ip",
    "x-forwarded-for",
    "x-real-ip",
    "x-client-ip",
  ];

  for (const headerName of proxyHeaders) {
    const value = headers[headerName.toLowerCase()];
    if (value) {
      const ip = typeof value === "string" ? value : value[0];
      return ip.split(",")[0].trim();
    }
  }

  return defaultIp;
}