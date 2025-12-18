import React from "react";
import { motion } from "framer-motion";

interface FloatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function FloatCard({ className = "", children, ...rest }: FloatCardProps) {
  return (
    <div className={`card ${className}`} {...rest}>
      {children}
    </div>
  );
}


