// Document Status Enum
export enum DocumentStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

// Product Tracking Types
export enum ProductTrackingType {
  SIMPLE = 'SIMPLE',
  EXPIRABLE = 'EXPIRABLE',
  SERIALIZED = 'SERIALIZED',
  LOT_TRACKED = 'LOT_TRACKED',
  VARIANT = 'VARIANT',
}

// Payment Types
export enum PaymentType {
  CASH = 'CASH',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT = 'CREDIT',
}

// Currency
export enum Currency {
  USD = 'USD',
  UZS = 'UZS',
  EUR = 'EUR',
  RUB = 'RUB',
}
