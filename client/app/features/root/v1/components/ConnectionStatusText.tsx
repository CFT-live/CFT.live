"use client";

import { useState, useEffect } from "react";

export const ConnectionStatusText = () => {
  const [isSecure, setIsSecure] = useState(false);

  useEffect(() => {
    setIsSecure(window.location.protocol === "https:");
  }, []);

  return (
    <p className={isSecure ? "" : "text-red-500 font-bold animate-pulse"}>
      {isSecure
        ? "SECURE CONNECTION ESTABLISHED"
        : "⚠ INSECURE CONNECTION - USE HTTPS"}
    </p>
  );
};
