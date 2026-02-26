import { useEffect, useState } from "react";
import LocationList from "./LocationList";
import LocationForm from "./LocationForm";
import { locationApi } from "../services/api";

const LocationsPage = () => {
  const [locations, setLocations] = useState([]);

  const loadLocations = async () => {
    const res = await locationApi.getAll();
    setLocations(res.data);
  };

  const addLocation = async (data) => {
    await locationApi.create(data);
    loadLocations();
  };

  const deleteLocation = async (id) => {
    await locationApi.delete(id);
    loadLocations();
  };

  useEffect(() => {
    loadLocations();
  }, []);

  return (
    <>
      <LocationForm onSave={addLocation} />
      <LocationList locations={locations} onDelete={deleteLocation} />
    </>
  );
};

export default LocationsPage;
