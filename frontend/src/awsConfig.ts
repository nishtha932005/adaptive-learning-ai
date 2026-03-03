import { Amplify } from "aws-amplify";

const region = import.meta.env.VITE_AWS_REGION;
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const userPoolClientId = import.meta.env.VITE_COGNITO_APP_CLIENT_ID;

let isAmplifyConfigured = false;

if (!region || !userPoolId || !userPoolClientId) {
  throw new Error(
    "Missing Cognito env vars: VITE_AWS_REGION, VITE_COGNITO_USER_POOL_ID, VITE_COGNITO_APP_CLIENT_ID"
  );
}

if (!userPoolId.startsWith(`${region}_`)) {
  console.warn("Cognito region and userPoolId prefix mismatch", { region, userPoolId });
}

export function ensureAmplifyConfigured() {
  if (isAmplifyConfigured) {
    return;
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          email: true,
        },
      },
    },
  });

  isAmplifyConfigured = true;
}

ensureAmplifyConfigured();