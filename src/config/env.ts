import "dotenv/config";

export const env = {
  PORT: Number(process.env.PORT ?? 3000),
  DATABASE_URL: process.env.DATABASE_URL ?? "./fuzebox.db",
  DEFAULT_TENANT_ID: process.env.DEFAULT_TENANT_ID ?? "ten_demo",
  DEFAULT_POLICY_ID: process.env.DEFAULT_POLICY_ID ?? "POL_DEFAULT_V1",
  FUZEBOX_KMS_SECRET:
    process.env.FUZEBOX_KMS_SECRET ?? "dev-fuzebox-kms-secret-change-me",
  RPOTENTIAL_KMS_SECRET:
    process.env.RPOTENTIAL_KMS_SECRET ?? "dev-rpotential-kms-secret-change-me",
  FUZEBOX_KMS_KEY_ID: process.env.FUZEBOX_KMS_KEY_ID ?? "fuzebox-kms-dev",
  RPOTENTIAL_KMS_KEY_ID:
    process.env.RPOTENTIAL_KMS_KEY_ID ?? "rpotential-kms-dev",
};
