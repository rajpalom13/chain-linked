/**
 * Data validation utilities for LinkedIn extension
 * Ensures data integrity before storage
 */

// ============================================
// VALIDATION RESULT TYPE
// ============================================

export interface ValidationResult<T> {
  valid: boolean;
  data: T | null;
  errors: string[];
  warnings: string[];
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return isNumber(value) && value >= 0;
}

function isValidUrn(value: unknown): boolean {
  if (!isString(value)) return false;
  return /^urn:li:\w+:\d+$/.test(value);
}

function isValidUrl(value: unknown): boolean {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function parseNumber(value: unknown): number | null {
  if (isNumber(value)) return value;
  if (isString(value)) {
    const cleaned = value.replace(/,/g, '');
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

// ============================================
// CREATOR ANALYTICS VALIDATION
// ============================================

export interface CreatorAnalyticsData {
  impressions?: number | null;
  membersReached?: number | null;
  engagements?: number | null;
  newFollowers?: number | null;
  profileViews?: number | null;
  searchAppearances?: number | null;
  engagementRate?: string | number | null;
  pageType?: string;
  capturedAt?: string;
  [key: string]: unknown;
}

export function validateCreatorAnalytics(data: unknown): ValidationResult<CreatorAnalyticsData> {
  const result: ValidationResult<CreatorAnalyticsData> = {
    valid: false,
    data: null,
    errors: [],
    warnings: [],
  };

  if (!data || typeof data !== 'object') {
    result.errors.push('Data must be an object');
    return result;
  }

  const input = data as Record<string, unknown>;
  const validated: CreatorAnalyticsData = {};

  // Check for at least one meaningful metric
  const metricFields = ['impressions', 'membersReached', 'engagements', 'newFollowers', 'profileViews', 'searchAppearances'];
  let hasMetric = false;

  for (const field of metricFields) {
    const value = input[field];
    if (value !== undefined && value !== null) {
      const parsed = parseNumber(value);
      if (parsed !== null && parsed >= 0) {
        validated[field as keyof CreatorAnalyticsData] = parsed;
        hasMetric = true;
      } else if (parsed !== null) {
        result.warnings.push(`${field} has negative value: ${parsed}`);
      }
    }
  }

  if (!hasMetric) {
    result.errors.push('No valid metrics found (need at least one of: impressions, membersReached, engagements, newFollowers, profileViews, searchAppearances)');
    return result;
  }

  // Validate engagement rate
  if (input.engagementRate !== undefined) {
    const rate = input.engagementRate;
    if (isString(rate) || isNumber(rate)) {
      validated.engagementRate = rate;
    }
  }

  // Copy metadata fields
  if (isString(input.pageType)) {
    validated.pageType = input.pageType;
  }
  if (isString(input.capturedAt)) {
    validated.capturedAt = input.capturedAt;
  }

  // Validate impressions sanity
  if (validated.impressions !== undefined && validated.impressions !== null && validated.impressions > 100000000) {
    result.warnings.push(`Impressions value unusually high: ${validated.impressions}`);
  }

  result.valid = true;
  result.data = validated;
  return result;
}

// ============================================
// POST ANALYTICS VALIDATION
// ============================================

export interface PostAnalyticsData {
  activityUrn: string;
  impressions?: number | null;
  membersReached?: number | null;
  reactions?: number | null;
  comments?: number | null;
  reposts?: number | null;
  engagementRate?: string | number | null;
  profileViewers?: number | null;
  followersGained?: number | null;
  pageType?: string;
  capturedAt?: string;
  [key: string]: unknown;
}

export function validatePostAnalytics(data: unknown): ValidationResult<PostAnalyticsData> {
  const result: ValidationResult<PostAnalyticsData> = {
    valid: false,
    data: null,
    errors: [],
    warnings: [],
  };

  if (!data || typeof data !== 'object') {
    result.errors.push('Data must be an object');
    return result;
  }

  const input = data as Record<string, unknown>;
  const validated: Partial<PostAnalyticsData> = {};

  // Activity URN is required
  if (!input.activityUrn) {
    result.errors.push('Missing required field: activityUrn');
    return result;
  }

  if (!isValidUrn(input.activityUrn)) {
    // Try to construct from URL or ID
    if (isString(input.activityUrn) && /^\d+$/.test(input.activityUrn)) {
      validated.activityUrn = `urn:li:activity:${input.activityUrn}`;
      result.warnings.push('Constructed activityUrn from numeric ID');
    } else if (isString(input.activityUrn) && input.activityUrn.includes('activity:')) {
      // Already has some URN format, try to use it
      validated.activityUrn = input.activityUrn;
      result.warnings.push('Using provided activityUrn with non-standard format');
    } else {
      result.errors.push(`Invalid activityUrn format: ${input.activityUrn}`);
      return result;
    }
  } else {
    validated.activityUrn = input.activityUrn as string;
  }

  // Validate numeric fields
  const numericFields = ['impressions', 'membersReached', 'reactions', 'comments', 'reposts', 'profileViewers', 'followersGained'];
  for (const field of numericFields) {
    const value = input[field];
    if (value !== undefined && value !== null) {
      const parsed = parseNumber(value);
      if (parsed !== null && parsed >= 0) {
        validated[field as keyof PostAnalyticsData] = parsed;
      }
    }
  }

  // Check discovery/socialEngagement nested objects
  if (input.discovery && typeof input.discovery === 'object') {
    const discovery = input.discovery as Record<string, unknown>;
    if (discovery.impressions !== undefined) {
      const parsed = parseNumber(discovery.impressions);
      if (parsed !== null) validated.impressions = parsed;
    }
  }

  if (input.socialEngagement && typeof input.socialEngagement === 'object') {
    const social = input.socialEngagement as Record<string, unknown>;
    if (social.reactions !== undefined) {
      const parsed = parseNumber(social.reactions);
      if (parsed !== null) validated.reactions = parsed;
    }
    if (social.comments !== undefined) {
      const parsed = parseNumber(social.comments);
      if (parsed !== null) validated.comments = parsed;
    }
    if (social.reposts !== undefined) {
      const parsed = parseNumber(social.reposts);
      if (parsed !== null) validated.reposts = parsed;
    }
  }

  // Copy metadata
  if (isString(input.pageType)) {
    validated.pageType = input.pageType;
  }
  if (isString(input.capturedAt)) {
    validated.capturedAt = input.capturedAt;
  }

  result.valid = true;
  result.data = validated as PostAnalyticsData;
  return result;
}

// ============================================
// PROFILE DATA VALIDATION
// ============================================

export interface ProfileData {
  name?: string | null;
  headline?: string | null;
  location?: string | null;
  profilePhoto?: string | null;
  connectionCount?: number | null;
  followerCount?: number | null;
  connections_count?: number | null;
  followers_count?: number | null;
  aboutSection?: string | null;
  pageType?: string;
  capturedAt?: string;
  [key: string]: unknown;
}

export function validateProfileData(data: unknown): ValidationResult<ProfileData> {
  const result: ValidationResult<ProfileData> = {
    valid: false,
    data: null,
    errors: [],
    warnings: [],
  };

  if (!data || typeof data !== 'object') {
    result.errors.push('Data must be an object');
    return result;
  }

  const input = data as Record<string, unknown>;
  const validated: ProfileData = {};

  // Check for at least name or follower/connection count
  const hasName = isNonEmptyString(input.name);
  const hasFollowers = parseNumber(input.followerCount || input.followers_count) !== null;
  const hasConnections = parseNumber(input.connectionCount || input.connections_count) !== null;

  if (!hasName && !hasFollowers && !hasConnections) {
    result.errors.push('Profile must have at least name or follower/connection count');
    return result;
  }

  // Validate string fields
  if (isNonEmptyString(input.name)) {
    validated.name = input.name.trim();
  }
  if (isNonEmptyString(input.headline)) {
    validated.headline = input.headline.trim();
  }
  if (isNonEmptyString(input.location)) {
    validated.location = input.location.trim();
  }
  if (isString(input.profilePhoto) && (isValidUrl(input.profilePhoto) || input.profilePhoto.startsWith('data:'))) {
    validated.profilePhoto = input.profilePhoto;
  }
  if (isNonEmptyString(input.aboutSection)) {
    validated.aboutSection = input.aboutSection.trim();
  }

  // Validate numeric fields (support both naming conventions)
  const followerValue = input.followerCount ?? input.followers_count;
  const connectionValue = input.connectionCount ?? input.connections_count;

  if (followerValue !== undefined) {
    const parsed = parseNumber(followerValue);
    if (parsed !== null && parsed >= 0) {
      validated.followerCount = parsed;
      validated.followers_count = parsed;
    }
  }

  if (connectionValue !== undefined) {
    const parsed = parseNumber(connectionValue);
    if (parsed !== null && parsed >= 0) {
      validated.connectionCount = parsed;
      validated.connections_count = parsed;
    }
  }

  // Copy metadata
  if (isString(input.pageType)) {
    validated.pageType = input.pageType;
  }
  if (isString(input.capturedAt)) {
    validated.capturedAt = input.capturedAt;
  }

  result.valid = true;
  result.data = validated;
  return result;
}

// ============================================
// AUDIENCE DATA VALIDATION
// ============================================

export interface AudienceData {
  totalFollowers?: number | null;
  followerGrowth?: number | string | null;
  demographics?: {
    industries?: Array<{ name: string; percentage: number }>;
    locations?: Array<{ name: string; percentage: number }>;
    seniority?: Array<{ name: string; percentage: number }>;
    companies?: Array<{ name: string; count: number }>;
    jobTitles?: Array<{ name: string; count: number }>;
  };
  pageType?: string;
  capturedAt?: string;
  [key: string]: unknown;
}

export function validateAudienceData(data: unknown): ValidationResult<AudienceData> {
  const result: ValidationResult<AudienceData> = {
    valid: false,
    data: null,
    errors: [],
    warnings: [],
  };

  if (!data || typeof data !== 'object') {
    result.errors.push('Data must be an object');
    return result;
  }

  const input = data as Record<string, unknown>;
  const validated: AudienceData = {};

  // Validate follower count
  if (input.totalFollowers !== undefined) {
    const parsed = parseNumber(input.totalFollowers);
    if (parsed !== null && parsed >= 0) {
      validated.totalFollowers = parsed;
    }
  }

  // Validate growth (can be number or string like "+5%")
  if (input.followerGrowth !== undefined) {
    validated.followerGrowth = input.followerGrowth as number | string;
  }

  // Validate demographics
  if (input.demographics && typeof input.demographics === 'object') {
    validated.demographics = input.demographics as AudienceData['demographics'];
  }

  // Need at least followers or demographics
  if (validated.totalFollowers === undefined && !validated.demographics) {
    result.errors.push('Audience data must have totalFollowers or demographics');
    return result;
  }

  // Copy metadata
  if (isString(input.pageType)) {
    validated.pageType = input.pageType;
  }
  if (isString(input.capturedAt)) {
    validated.capturedAt = input.capturedAt;
  }

  result.valid = true;
  result.data = validated;
  return result;
}

// ============================================
// GENERIC VALIDATION HELPERS
// ============================================

/**
 * Check if extracted data has meaningful content
 */
export function hasUsefulData(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;

  const input = data as Record<string, unknown>;
  const metadataKeys = ['extractedAt', 'source', 'pageType', 'capturedAt', 'pageInfo', 'captureMethod', 'url'];

  return Object.keys(input).some((key) => {
    if (metadataKeys.includes(key)) return false;
    const value = input[key];
    if (value === null || value === undefined) return false;
    if (typeof value === 'number' && value === 0) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'object' && Object.keys(value).length === 0) return false;
    return true;
  });
}

/**
 * Sanitize data by removing null/undefined fields
 */
export function sanitizeData<T extends Record<string, unknown>>(data: T): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        result[key] = sanitizeData(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
  }

  return result as T;
}

/**
 * Log validation result
 */
export function logValidation(context: string, result: ValidationResult<unknown>): void {
  if (!result.valid) {
    console.error(`[Validation] ${context} - INVALID:`, result.errors);
  }
  if (result.warnings.length > 0) {
    console.warn(`[Validation] ${context} - Warnings:`, result.warnings);
  }
  if (result.valid) {
    console.log(`[Validation] ${context} - Valid`);
  }
}
