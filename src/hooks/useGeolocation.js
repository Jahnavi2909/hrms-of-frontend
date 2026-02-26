import { useState } from "react";

const useGeolocation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject("Geolocation not supported");
        return;
      }

      setLoading(true);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLoading(false);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (err) => {
          setLoading(false);
          setError(err.message);
          reject(err.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });

  return { getLocation, loading, error };
};

export default useGeolocation;
