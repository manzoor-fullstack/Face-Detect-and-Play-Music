import React, { useEffect } from "react";
import axios from "axios";

const Callback = () => {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    console.log("Authorization Code:", code);

    if (code) {
      getToken(code);
    }
  }, []);

  const getToken = async (code) => {
    try {
      const response = await axios.post(
        "https://accounts.spotify.com/api/token",
        new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: "http://localhost:5173/callback",
          client_id: "945dbac577854434884c74b22b67b69a",
          client_secret: "b49e79d9aad5461f80defa296cd156dc",
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      localStorage.setItem("spotifyToken", response.data.access_token);
      console.log("Access Token:", response.data.access_token);
    } catch (error) {
      console.error("Failed to get access token", error);
    }
  };

  return <h2>Authorization Successful!</h2>;
};
export default Callback;
