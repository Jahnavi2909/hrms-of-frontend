
import { Button, Container, Row, Col, Card } from 'react-bootstrap';
import { FaLock } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './style.css';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
      <Row className="justify-content-center w-100">
        <Col md={8} lg={6}>
          <Card className="shadow-sm border-0">
            <Card.Body className="text-center p-5">
              <div className="mb-4">
                <div className="icon-wrapper bg-danger bg-opacity-10 d-inline-flex align-items-center justify-content-center rounded-circle" style={{ width: '80px', height: '80px' }}>
                  <FaLock className="text-danger" size={40} />
                </div>
              </div>
              <h2 className="mb-3">Access Denied</h2>
              <p className="text-muted mb-4">
                You don't have permission to access this page. Please contact your administrator if you believe this is a mistake.
              </p>
              <div className="d-flex gap-3 justify-content-center">
                <Button 
                  variant="outline-primary" 
                  onClick={() => navigate(-1)}
                >
                  Go Back
                </Button>
                <Button 
                  variant="primary"
                  onClick={() => navigate('/dashboard')}
                >
                  Go to Dashboard
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Unauthorized;
