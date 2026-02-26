import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import { authApi } from '../../services/api';

const ForgotPassword = () => {

  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();


  const handleGenerateToken = async (e) => {
    e.preventDefault();

    if (!email) {
      setError("Please enter your email");
      return;
    }

    try {
      setError('');
      setSuccess('');
      setLoading(true);

      const res = await authApi.forgotPassword({email});

      if (res.data.success) {
        setResetToken(res.data.data);
        setStep(2);
        setSuccess("Reset token generated. Use it to set a new password.");
      } else {
        setError(res.data.message || "Failed to generate reset token");
      }

    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!resetToken || !newPassword) {
      setError("Please provide token and new password");
      return;
    }

    try {
      setError('');
      setLoading(true);

      const res = await authApi.resetPassword({
        resetToken,
        newPassword
      });

      if (res.data.success) {
        setSuccess("Password reset successful. Please login.");
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setError(res.data.message || "Password reset failed");
      }

    } catch (err) {
      setError("Invalid or expired token");
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
              <h2 className="fw-bold mb-1">Forgot Password</h2>
              <p className="text-muted">
                {step === 1
                  ? "Generate reset token"
                  : "Set a new password"}
              </p>
            </div>

            {error && (
              <Alert
                variant="danger"
                onClose={() => setError('')}
                dismissible
              >
                {error}
              </Alert>
            )}

            {success && (
              <Alert
                variant="success"
                onClose={() => setSuccess('')}
                dismissible
              >
                {success}
              </Alert>
            )}

            {step === 1 && (
              <Form onSubmit={handleGenerateToken}>
                <Form.Group className="mb-4">
                  <Form.Label>Email</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-person"></i>
                    </span>
                    <Form.Control
                      type="text"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  className="w-100 py-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Generating...
                    </>
                  ) : (
                    'Generate Reset Token'
                  )}
                </Button>
              </Form>
            )}

            {step === 2 && (
              <Form onSubmit={handleResetPassword}>
                <Form.Group className="mb-3">
                  <Form.Label>Reset Token</Form.Label>
                  <Form.Control
                    type="text"
                    value={resetToken}
                    disabled
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>New Password</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-lock"></i>
                    </span>
                    <Form.Control
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  className="w-100 py-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </Form>
            )}

            <div className="text-center mt-4">
              <Link to="/login" className="small">
                Back to login
              </Link>
            </div>
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

export default ForgotPassword;
