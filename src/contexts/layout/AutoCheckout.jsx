import { useEffect } from "react";
import { attendanceApi } from "../../services/api";

const useAutoCheckout = () => {
  useEffect(() => {
    // Calculate milliseconds until 23:59 today
    const now = new Date();
    const checkoutTime = new Date();
    checkoutTime.setHours(23, 59, 0, 0);
    const msUntilCheckout = checkoutTime - now;

    // If 23:59 has already passed today, skip
    if (msUntilCheckout <= 0) return;

    // Set a one-time timer to call auto-checkout
    const timer = setTimeout(async () => {
      try {
        await attendanceApi.autoCheckoutEndOfDay();
        console.log("Auto checkout executed successfully");
      } catch (err) {
        console.error("Auto checkout failed:", err);
      }
    }, msUntilCheckout);

    // ✅ Cleanup function: React expects a function here
    return () => clearTimeout(timer);
  }, []);
};

export default useAutoCheckout;
