// services/SpotifyService.js
export const getUserProfile = async (token) => {
  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.json();
};

export const getPlaylists = async (token) => {
  const response = await fetch("https://api.spotify.com/v1/me/playlists", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.json();
};
