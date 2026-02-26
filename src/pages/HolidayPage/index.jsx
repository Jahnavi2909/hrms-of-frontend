import { useState, useEffect } from "react";
import { Button, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { holidayApi } from "../../services/api";
import AddHolidayModal from "../../components/holidays/AddHolidayModal";
import HolidayCardList from "../../components/holidays/HolidayCardList";

const HolidayPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const navigate = useNavigate();

  const fetchHolidays = async () => {
    try {
      const response = await holidayApi.getAllHolidays();
      setHolidays(response.data || []);
    } catch (err) {
      console.error("Failed to fetch holidays:", err);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleHolidayAdded = (newHoliday) => {
    if (!newHoliday) return;
    setHolidays((prev) => [...prev, newHoliday]);
  };



  return (
    <Container className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Holiday Management</h4>
        <Button variant="success" onClick={() => setShowModal(true)}>
          Add Holiday
        </Button>
      </div>

      <AddHolidayModal
        show={showModal}
        handleClose={() => setShowModal(false)}
        onHolidayAdded={handleHolidayAdded}
      />

      <HolidayCardList holidays={holidays} />

      <div className="mt-4 d-flex justify-content-start">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          &larr; Back
        </Button>
      </div>
    </Container>
  );
};

export default HolidayPage;
