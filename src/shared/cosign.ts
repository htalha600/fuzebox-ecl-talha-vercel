import { env } from "../config/env.js";
import { computeHash } from "./chain.js";

export interface KmsKeys {
  fuzeboxSecret: string;
  rpotentialSecret: string;
  fuzeboxKeyId: string;
  rpotentialKeyId: string;
}

export function loadKms(): KmsKeys {
  return {
    fuzeboxSecret: env.FUZEBOX_KMS_SECRET,
    rpotentialSecret: env.RPOTENTIAL_KMS_SECRET,
    fuzeboxKeyId: env.FUZEBOX_KMS_KEY_ID,
    rpotentialKeyId: env.RPOTENTIAL_KMS_KEY_ID,
  };
}

export function dualSign(
  kms: KmsKeys,
  predictedSignature: string,
  closingPayload: string,
): {
  fuzeboxSig: string;
  rpotentialSig: string;
  cosignStatus: "pending" | "partial" | "complete";
} {
  const fuzeboxSig = computeHash(
    kms.fuzeboxSecret,
    predictedSignature,
    closingPayload,
  );
  const rpotentialSig = computeHash(
    kms.rpotentialSecret,
    predictedSignature,
    closingPayload,
  );

  const cosignStatus =
    fuzeboxSig && rpotentialSig
      ? "complete"
      : fuzeboxSig || rpotentialSig
        ? "partial"
        : "pending";

  return { fuzeboxSig, rpotentialSig, cosignStatus };
}
