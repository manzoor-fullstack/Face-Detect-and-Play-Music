// SpotifyAuth.js
const CLIENT_ID = "945dbac577854434884c74b22b67b69a"; // Replace with your Client ID
const REDIRECT_URI = "http://localhost:5173/callback"; // Your Redirect URI
const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const RESPONSE_TYPE = "code";
const SCOPES = [
  "user-read-private",
  "user-read-email",
  "playlist-read-private",
  "user-library-read",
  "user-read-playback-state",
  "user-modify-playback-state",
].join(" ");

export const loginUrl = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&response_type=${RESPONSE_TYPE}&redirect_uri=${REDIRECT_URI}&scope=${SCOPES}`;
