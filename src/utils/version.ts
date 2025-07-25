/**
 * Version compatibility utilities for Jarvis Client
 */

export interface ServerInfo {
  version: string;
  name?: string;
  status?: string;
  endpoints?: string[];
}

export interface CompatibilityResult {
  compatible: boolean;
  issues: string[];
  serverVersion?: string;
  clientVersion: string;
}

/**
 * Parse a semantic version string into comparable parts
 */
export function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Compare two semantic versions
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const versionA = parseVersion(a);
  const versionB = parseVersion(b);
  
  if (versionA.major !== versionB.major) {
    return versionA.major < versionB.major ? -1 : 1;
  }
  
  if (versionA.minor !== versionB.minor) {
    return versionA.minor < versionB.minor ? -1 : 1;
  }
  
  if (versionA.patch !== versionB.patch) {
    return versionA.patch < versionB.patch ? -1 : 1;
  }
  
  return 0;
}

/**
 * Check if a version is within a specified range
 */
export function isVersionInRange(version: string, minVersion: string, maxVersion: string): boolean {
  return compareVersions(version, minVersion) >= 0 && compareVersions(version, maxVersion) <= 0;
}

/**
 * Check compatibility between client and server versions
 */
export function checkCompatibility(
  serverInfo: ServerInfo,
  clientVersion: string,
  minServerVersion: string,
  maxServerVersion: string,
  requiredEndpoints: string[] = []
): CompatibilityResult {
  const issues: string[] = [];
  
  if (!serverInfo.version) {
    issues.push('Server version information not available');
    return {
      compatible: false,
      issues,
      clientVersion,
    };
  }
  
  // Check version compatibility
  try {
    if (!isVersionInRange(serverInfo.version, minServerVersion, maxServerVersion)) {
      issues.push(
        `Server version ${serverInfo.version} is not compatible. ` +
        `Required: ${minServerVersion} - ${maxServerVersion}`
      );
    }
  } catch (error) {
    issues.push(`Invalid server version format: ${serverInfo.version}`);
  }
  
  // Check required endpoints
  if (requiredEndpoints.length > 0 && serverInfo.endpoints) {
    const missingEndpoints = requiredEndpoints.filter(
      endpoint => !serverInfo.endpoints!.includes(endpoint)
    );
    
    if (missingEndpoints.length > 0) {
      issues.push(`Missing required endpoints: ${missingEndpoints.join(', ')}`);
    }
  }
  
  return {
    compatible: issues.length === 0,
    issues,
    serverVersion: serverInfo.version,
    clientVersion,
  };
}

/**
 * Generate user-friendly compatibility message
 */
export function getCompatibilityMessage(result: CompatibilityResult): string {
  if (result.compatible) {
    return `✅ Client v${result.clientVersion} is compatible with server v${result.serverVersion}`;
  }
  
  let message = `❌ Compatibility issues detected:\n`;
  result.issues.forEach(issue => {
    message += `  • ${issue}\n`;
  });
  
  message += `\nClient: v${result.clientVersion}`;
  if (result.serverVersion) {
    message += ` | Server: v${result.serverVersion}`;
  }
  
  return message.trim();
}