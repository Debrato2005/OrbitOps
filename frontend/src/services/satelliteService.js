import { BACKEND_URL } from "../constants";
import { networkErrorHandler } from "../components/NetworkErrorHandler";
import { notificationManager } from "../components/NotificationSystem";

export const getSatellites = async () => {
  const response = await networkErrorHandler.fetchWithRetry(
    `${BACKEND_URL}/companies/satellites`
  );

  if (!response.ok) {
    const errorData = await response.json();
    notificationManager.error(errorData.error || "Failed to fetch satellites.", {
      title: "Fetch Failed",
    });
    throw new Error(errorData.error || "Failed to fetch satellites.");
  }

  return response.json();
};

export const lookupNoradId = async (noradId) => {
  if (!/^\d+$/.test(noradId)) {
    throw new Error("NORAD ID must be a number.");
  }

  const response = await networkErrorHandler.fetchWithRetry(
    `${BACKEND_URL}/satellites/lookup/${noradId}`
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to find satellite.");
  }

  return response.json();
};

export const addSatellite = async (satelliteData) => {
  const response = await networkErrorHandler.fetchWithRetry(
    `${BACKEND_URL}/companies/satellites`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(satelliteData),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    notificationManager.error(errorData.error || "Failed to import satellite.", {
      title: "Import Failed",
    });
    throw new Error(errorData.error || "Failed to import satellite.");
  }

  notificationManager.success("Satellite imported successfully!", {
    title: "Import Successful",
  });

  return response.json();
};

const satelliteService = {
  getSatellites,
  lookupNoradId,
  addSatellite,
};

export default satelliteService;