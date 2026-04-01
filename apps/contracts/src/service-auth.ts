export const MERCHANT_API_SERVICE_TOKEN_ENV_VAR =
  "MERCHANT_API_SERVICE_TOKEN";

// Shared development fallback so local api -> merchant-api calls work without
// extra setup. Production must override this with a secret value.
export const MERCHANT_API_SERVICE_TOKEN_DEFAULT =
  "lw-local-dev-merchant-api-service-token";
