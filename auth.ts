import { createAuth0Client, Auth0Client } from '@auth0/auth0-spa-js';

// Retrieve credentials from environment variables
const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;

// Throw an error if the environment variables are not set
if (!domain || !clientId) {
  throw new Error("Auth0 domain or client ID not set in .env file. Make sure to create a .env file with VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID.");
}

// Create a single, async-initialized instance of the Auth0 client
// This promise is resolved once, and the resolved client is reused.
const auth0ClientPromise: Promise<Auth0Client> = createAuth0Client({
  domain: domain,
  clientId: clientId,
  authorizationParams: {
    redirect_uri: window.location.origin
  }
});

/**
 * Redirects the user to the Auth0 Universal Login page.
 */
export const login = async (): Promise<void> => {
  const auth0 = await auth0ClientPromise;
  await auth0.loginWithRedirect();
};

/**
 * Logs the user out and redirects them to the application's origin.
 */
export const logout = async (): Promise<void> => {
  const auth0 = await auth0ClientPromise;
  await auth0.logout({
    logoutParams: {
      returnTo: window.location.origin
    }
  });
};

/**
 * Handles the redirect back from Auth0 after a successful login.
 */
export const handleRedirectCallback = async (): Promise<void> => {
  const auth0 = await auth0ClientPromise;
  await auth0.handleRedirectCallback();
};

/**
 * Checks if the user is currently authenticated.
 * @returns {Promise<boolean>} A promise that resolves to true if the user is authenticated, false otherwise.
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const auth0 = await auth0ClientPromise;
  return await auth0.isAuthenticated();
};

/**
 * Retrieves the current user's profile information.
 * @returns {Promise<any | undefined>} A promise that resolves to the user object if authenticated, otherwise undefined.
 */
export const getUser = async (): Promise<any | undefined> => {
  const auth0 = await auth0ClientPromise;
  return await auth0.getUser();
};