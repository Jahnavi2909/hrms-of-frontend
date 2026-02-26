import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'
import { Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import './style.css';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();


    const handleSubmit = async evt => {
        evt.preventDefault();

        if (!email || !password) {
            setError("Please enter both email and password");
            return;
        }

        try {
            setError('');
            setLoading(true);

            const result = await login(email, password);

            if (result.success) {
                navigate('/', { replace: true });
            } else {
                setError(result.message || "Failed to log in. Please check your credentials.");
            }

        } catch (err) {
            console.log("Login error:", err);
            setError("An unexpected error occurred. Please try again later.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-page">
            <div className="login-container">
                <Card className="login-card">
                    <Card.Body className="p-4">
                        <div className="text-center mb-4">
                            <img src="/Raynxsystemslogo.png" alt="Raynx Systems" className="logo" />
                            <h2 className="fw-bold mb-1 welcomeback-text">Welcome Back</h2>
                            <p className="text-muted">Sign in to your HRMS account</p>
                        </div>

                        {error && (
                            <Alert
                                variant="danger"
                                className="d-flex align-items-center"
                                onClose={() => setError('')}
                                dismissible
                            >
                                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                <div>{error}</div>
                            </Alert>
                        )}

                        <Form onSubmit={handleSubmit} className="mt-3">
                            <Form.Group className="mb-3">
                                <Form.Label htmlFor="email">Email</Form.Label>
                                <div className="input-group">
                                    <span className="input-group-text">
                                        <i className="bi bi-person"></i>
                                    </span>
                                    <Form.Control
                                        type="text"
                                        placeholder="Enter your email"
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                        autoFocus
                                        required
                                    />
                                </div>
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <div className="d-flex justify-content-between">
                                    <Form.Label htmlFor="password">Password</Form.Label>
                                </div>
                                <div className="input-group">
                                    <span className="input-group-text">
                                        <i className="bi bi-lock"></i>
                                    </span>
                                    <Form.Control
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                        required
                                    />
                                    <span
                                        className="input-group-text password-eye-toggle"
                                        onClick={() => setShowPassword(prev => !prev)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {showPassword ? <i className="bi bi-eye-slash"></i> : <i className="bi bi-eye"></i>}
                                    </span>
                                </div>
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
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>
                        </Form>
                    </Card.Body>
                </Card>

                <div className="text-center mt-4">
                    <p className="small copy">
                        © {new Date().getFullYear()} Raynx Systems. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Login;
