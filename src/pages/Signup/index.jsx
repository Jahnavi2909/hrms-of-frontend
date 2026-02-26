import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import './style.css';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('HR'); 
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (evt) => {
    evt.preventDefault();

    if (!username || !email || !password) {
      setError('Please fill all required fields.');
      return;
    }

    try {
      setError('');
      setLoading(true);

      const result = await signup({ username, email, password, role });

      if (result.success) {
        navigate('/login'); 
      } else {
        setError(result.message || 'Failed to sign up. Please check your input.');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <Card className="login-card">
          <Card.Body className="p-4">
            <div className="text-center mb-4">
              <h2 className="fw-bold mb-1">Create Account</h2>
              <p className="text-muted">Sign up as Admin, HR, or Manager</p>
            </div>

            {error && (
              <Alert
                variant="danger"
                className="d-flex align-items-center"
                onClose={() => setError('')}
                dismissible
              >
                <div>{error}</div>
              </Alert>
            )}

            <Form onSubmit={handleSubmit} className="mt-3">
              <Form.Group className="mb-3">
                <Form.Label>Username</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  required
                  autoFocus
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label>Role</Form.Label>
                <Form.Select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={loading}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="HR">HR</option>
                  <option value="MANAGER">Manager</option>
                </Form.Select>
              </Form.Group>

              <Button
                variant="primary"
                type="submit"
                className="w-100 py-2 mb-3"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Signing up...
                  </>
                ) : (
                  'Sign Up'
                )}
              </Button>

              <div className="divider my-4">
                <span className="px-2 bg-white text-muted">OR</span>
              </div>

              <div className="text-center mt-3">
                <p className="mb-0">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary fw-medium">
                    Sign In
                  </Link>
                </p>
              </div>
            </Form>
          </Card.Body>
        </Card>

        <div className="text-center mt-4">
          <p className="text-muted small">
            © {new Date().getFullYear()} Raynx Systems. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
