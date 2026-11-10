export interface ParsedUA {
  browser: string;
  os: string;
  deviceType: "desktop" | "mobile" | "tablet";
  icon: "windows" | "apple" | "linux" | "android" | "laptop";
}

export function parseUserAgent(uaString: string): ParsedUA {
  const ua = uaString.toLowerCase();

  // OS detection
  let os = "Неизвестная ОС";
  let icon: ParsedUA["icon"] = "laptop";
  let deviceType: ParsedUA["deviceType"] = "desktop";

  if (ua.includes("windows")) {
    os = "Windows";
    icon = "windows";
  } else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
    os = "iOS";
    icon = "apple";
    deviceType = ua.includes("ipad") ? "tablet" : "mobile";
  } else if (ua.includes("macintosh") || ua.includes("mac os")) {
    os = "macOS";
    icon = "apple";
  } else if (ua.includes("android")) {
    os = "Android";
    icon = "android";
    deviceType = "mobile";
  } else if (ua.includes("linux")) {
    os = "Linux";
    icon = "linux";
  }

  // Browser detection
  let browser = "Браузер";
  if (ua.includes("edg/")) {
    browser = "Microsoft Edge";
  } else if (ua.includes("opr/") || ua.includes("opera/")) {
    browser = "Opera";
  } else if (ua.includes("yabrowser/")) {
    browser = "Yandex Browser";
  } else if (ua.includes("chrome/") && !ua.includes("edg/")) {
    browser = "Google Chrome";
  } else if (ua.includes("safari/") && !ua.includes("chrome/")) {
    browser = "Safari";
  } else if (ua.includes("firefox/")) {
    browser = "Mozilla Firefox";
  }

  return { browser, os, deviceType, icon };
}
