import { Card, Row, Col } from "react-bootstrap";

const HolidayCardList = ({ holidays = [] }) => {
  if (!Array.isArray(holidays)) {
    return <p className="mt-4 text-danger">Invalid holiday data</p>;
  }

  if (holidays.length === 0) {
    return <p className="mt-4">No holidays found.</p>;
  }

  return (
    <div className="mt-4">
      <h5>All Holidays</h5>
      <Row xs={1} md={3} className="g-3">
        {holidays.map((holiday, index) => (
          <Col key={holiday.id ?? index}>
            <Card className="text-center shadow-sm">
              <Card.Body>
                <Card.Title>
                  {holiday.name || `Holiday ${index + 1}`}
                </Card.Title>
                <Card.Text>{holiday.date}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default HolidayCardList;
