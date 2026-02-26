import { Alert } from "react-bootstrap";
import { useError } from "../contexts/ErrorContext";

const GlobalErrorBanner = () => {
  const { error, clearError } = useError();

  if (!error) return null;

  return (
    <div className="global-error-right">
      <Alert
        variant="danger"
        dismissible
        onClose={clearError}
        className="shadow"
      >
        {error}
      </Alert>
    </div>
  );
};

export default GlobalErrorBanner;
